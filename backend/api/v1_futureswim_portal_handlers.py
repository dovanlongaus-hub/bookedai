"""Future Swim parent portal handlers (Phase 3.1 + 3.2).

The futureswim.bookedai.au sub-project surfaces a parent dashboard at
``/portal`` that lists each child's current level, recent lesson progress,
and the latest teacher evaluation + recommended next step.

Phase 3.1 (shipped): demo-mode preview endpoint keyed by a one-shot
``login_token`` stored on ``futureswim_parent_users`` so marketing /
preview links work without auth.

Phase 3.2 (this revision): magic email-code login. Parents POST their
email, receive a 6-digit code via ``tenant_email_login_codes`` (migration
015), exchange the code for a Bearer session token (HMAC-signed,
mirroring ``v1_chess_student_handlers``). The session token is verified
on every ``GET /futureswim/portal/me`` so the preview ``key=`` query
parameter is no longer required for real parents.
"""

from __future__ import annotations

import base64
import hashlib
import hmac
import json
import os
import time
from datetime import date as date_type, datetime as datetime_type
from typing import Any

from fastapi import Header, Request
from pydantic import BaseModel, Field
from sqlalchemy import text

from core.errors import AppError
from core.logging import get_logger
from db import get_session

from api.v1_routes import (
    _clear_active_tenant_email_login_codes,
    _deliver_tenant_email_login_code,
    _error_response,
    _load_valid_tenant_email_login_code,
    _store_tenant_email_login_code,
    _success_response,
)


_logger = get_logger("bookedai.api.v1_futureswim_portal_handlers")
_AUTH_INTENT = "futureswim_portal_login"
_SESSION_TTL_SECONDS = 30 * 24 * 60 * 60  # 30 days
_TOKEN_KIND = "futureswim_parent"


def _resolve_session_secret(request: Request) -> str:
    settings = getattr(request.app.state, "settings", None)
    candidate = (os.getenv("FUTURESWIM_PORTAL_AUTH_SECRET") or "").strip()
    if candidate:
        return candidate
    candidate = str(getattr(settings, "session_signing_secret", "") or "").strip()
    if candidate:
        return candidate
    return "futureswim-portal-dev"


def _b64url_encode(value: bytes) -> str:
    return base64.urlsafe_b64encode(value).rstrip(b"=").decode("ascii")


def _b64url_decode(value: str) -> bytes:
    padding = "=" * (-len(value) % 4)
    return base64.urlsafe_b64decode((value + padding).encode("ascii"))


def _sign_parent_session_token(*, secret: str, parent_id: str, email: str) -> str:
    issued_at = int(time.time())
    payload = {
        "sub": parent_id,
        "email": email,
        "iat": issued_at,
        "exp": issued_at + _SESSION_TTL_SECONDS,
        "kind": _TOKEN_KIND,
    }
    header = {"alg": "HS256", "typ": "BAS"}
    header_segment = _b64url_encode(json.dumps(header, separators=(",", ":")).encode())
    payload_segment = _b64url_encode(json.dumps(payload, separators=(",", ":")).encode())
    signing_input = f"{header_segment}.{payload_segment}".encode()
    signature = hmac.new(secret.encode(), signing_input, hashlib.sha256).digest()
    return f"{header_segment}.{payload_segment}.{_b64url_encode(signature)}"


class _ParentSessionVerifyError(Exception):
    pass


def _verify_parent_session_token(*, secret: str, token: str) -> dict[str, object]:
    raw = (token or "").strip()
    if not raw:
        raise _ParentSessionVerifyError("missing")
    parts = raw.split(".")
    if len(parts) != 3:
        raise _ParentSessionVerifyError("malformed")
    header_segment, payload_segment, signature_segment = parts
    signing_input = f"{header_segment}.{payload_segment}".encode()
    expected = hmac.new(secret.encode(), signing_input, hashlib.sha256).digest()
    try:
        provided = _b64url_decode(signature_segment)
    except Exception as exc:  # noqa: BLE001
        raise _ParentSessionVerifyError("signature_invalid") from exc
    if not hmac.compare_digest(expected, provided):
        raise _ParentSessionVerifyError("signature_mismatch")
    try:
        payload = json.loads(_b64url_decode(payload_segment).decode("utf-8"))
    except Exception as exc:  # noqa: BLE001
        raise _ParentSessionVerifyError("payload_invalid") from exc
    if not isinstance(payload, dict) or payload.get("kind") != _TOKEN_KIND:
        raise _ParentSessionVerifyError("kind_mismatch")
    expires_at = int(payload.get("exp") or 0)
    if expires_at and expires_at < int(time.time()):
        raise _ParentSessionVerifyError("expired")
    return payload


def _extract_bearer_token(authorization: str | None) -> str | None:
    if not authorization:
        return None
    raw = authorization.strip()
    if raw.lower().startswith("bearer "):
        return raw[7:].strip() or None
    return raw or None


def _isoformat_date(value: Any) -> str | None:
    if value is None:
        return None
    if isinstance(value, date_type):
        return value.isoformat()
    return str(value)


def _isoformat_datetime(value: Any) -> str | None:
    if value is None:
        return None
    if isinstance(value, datetime_type):
        return value.isoformat()
    return str(value)


async def _load_parent_bookings(session, *, parent_email: str) -> list[dict[str, Any]]:
    """Load the parent's last 20 booking_intents joined to service merchant
    profile metadata. Match is by lower(contacts.email) within the
    futureswim tenant scope so a parent who books from any channel
    (chat, WhatsApp, marketing form) has their bookings surface here.
    """
    rows = (
        await session.execute(
            text(
                """
                select bi.id::text as booking_intent_id,
                       bi.booking_reference,
                       bi.requested_date,
                       bi.requested_time,
                       bi.timezone,
                       bi.service_id,
                       bi.service_name,
                       bi.status,
                       bi.created_at,
                       smp.name as smp_service_name,
                       smp.venue_name,
                       smp.display_price
                  from booking_intents bi
                  left join contacts c on c.id = bi.contact_id
                  left join service_merchant_profiles smp on smp.service_id = bi.service_id
                 where c.tenant_id = (select id from tenants where slug = 'future-swim')
                   and lower(c.email) = lower(:parent_email)
                 order by bi.created_at desc
                 limit 20
                """
            ),
            {"parent_email": parent_email},
        )
    ).mappings().all()

    bookings: list[dict[str, Any]] = []
    for row in rows:
        bookings.append(
            {
                "booking_intent_id": row["booking_intent_id"],
                "booking_reference": row["booking_reference"],
                "requested_date": row["requested_date"],
                "requested_time": row["requested_time"],
                "timezone": row["timezone"],
                "service_id": row["service_id"],
                "service_name": row["smp_service_name"] or row["service_name"],
                "venue_name": row["venue_name"],
                "display_price": row["display_price"],
                "status": row["status"],
                "created_at": _isoformat_datetime(row["created_at"]),
            }
        )
    return bookings


async def _load_parent_by_id(session, parent_id: str) -> dict[str, Any] | None:
    return (
        await session.execute(
            text(
                """
                select id, email, full_name, phone, centre_code, preferred_locale
                  from futureswim_parent_users
                 where id = :id
                 limit 1
                """
            ),
            {"id": parent_id},
        )
    ).mappings().first()


async def _load_parent_by_email(session, email: str) -> dict[str, Any] | None:
    return (
        await session.execute(
            text(
                """
                select id, email, full_name, phone, centre_code, preferred_locale
                  from futureswim_parent_users
                 where lower(email) = lower(:email)
                 limit 1
                """
            ),
            {"email": email.strip()},
        )
    ).mappings().first()


async def _build_portal_payload(session, parent_row: dict[str, Any]) -> dict[str, Any]:
    parent_id = str(parent_row["id"])

    students = (
        await session.execute(
            text(
                """
                select id, full_name, date_of_birth, centre_code,
                       current_level_code, enrolled_since, notes_for_coach
                  from futureswim_student_profiles
                 where parent_id = :parent_id
                   and is_active = 1
                 order by enrolled_since asc nulls last, full_name asc
                """
            ),
            {"parent_id": parent_id},
        )
    ).mappings().all()

    students_payload: list[dict[str, Any]] = []
    for student in students:
        student_id = str(student["id"])

        progress_rows = (
            await session.execute(
                text(
                    """
                    select session_date, centre_code, level_code,
                           attendance, focus_skill, notes_md, coach_initials
                      from futureswim_student_progress
                     where student_id = :student_id
                     order by session_date desc
                     limit 12
                    """
                ),
                {"student_id": student_id},
            )
        ).mappings().all()

        evaluation_row = (
            await session.execute(
                text(
                    """
                    select evaluated_at, level_code, level_outcome,
                           strengths_md, areas_to_work_on_md,
                           next_step_level_code, next_step_summary, coach_initials
                      from futureswim_teacher_evaluations
                     where student_id = :student_id
                     order by evaluated_at desc
                     limit 1
                    """
                ),
                {"student_id": student_id},
            )
        ).mappings().first()

        students_payload.append(
            {
                "id": student_id,
                "full_name": student["full_name"],
                "date_of_birth": _isoformat_date(student["date_of_birth"]),
                "centre_code": student["centre_code"],
                "current_level_code": student["current_level_code"],
                "enrolled_since": _isoformat_date(student["enrolled_since"]),
                "notes_for_coach": student["notes_for_coach"],
                "recent_progress": [
                    {
                        "session_date": _isoformat_date(row["session_date"]),
                        "centre_code": row["centre_code"],
                        "level_code": row["level_code"],
                        "attendance": row["attendance"],
                        "focus_skill": row["focus_skill"],
                        "notes_md": row["notes_md"],
                        "coach_initials": row["coach_initials"],
                    }
                    for row in progress_rows
                ],
                "latest_evaluation": (
                    {
                        "evaluated_at": _isoformat_date(evaluation_row["evaluated_at"]),
                        "level_code": evaluation_row["level_code"],
                        "level_outcome": evaluation_row["level_outcome"],
                        "strengths_md": evaluation_row["strengths_md"],
                        "areas_to_work_on_md": evaluation_row["areas_to_work_on_md"],
                        "next_step_level_code": evaluation_row["next_step_level_code"],
                        "next_step_summary": evaluation_row["next_step_summary"],
                        "coach_initials": evaluation_row["coach_initials"],
                    }
                    if evaluation_row is not None
                    else None
                ),
            }
        )

    bookings_payload = await _load_parent_bookings(
        session, parent_email=str(parent_row["email"] or "")
    )

    return {
        "parent": {
            "email": parent_row["email"],
            "full_name": parent_row["full_name"],
            "phone": parent_row["phone"],
            "centre_code": parent_row["centre_code"],
            "preferred_locale": parent_row["preferred_locale"],
        },
        "students": students_payload,
        "bookings": bookings_payload,
    }


class FutureSwimPortalLoginRequestPayload(BaseModel):
    email: str = Field(..., min_length=3, max_length=255)


class FutureSwimPortalLoginVerifyPayload(BaseModel):
    email: str = Field(..., min_length=3, max_length=255)
    code: str = Field(..., min_length=4, max_length=12)


async def futureswim_portal_login_request(
    request: Request,
    payload: FutureSwimPortalLoginRequestPayload,
):
    email = (payload.email or "").strip().lower()
    if "@" not in email:
        return _error_response(
            AppError(
                code="invalid_email",
                message="Enter the email address Future Swim has on file for you.",
                status_code=400,
                details={},
            ),
            tenant_id=None,
            actor_context=None,
        )

    async with get_session(request.app.state.session_factory) as session:
        parent_row = await _load_parent_by_email(session, email)

        # Always return success to avoid leaking which emails have a portal
        # account. We only generate + send a code when the email matches.
        if parent_row is not None:
            await _clear_active_tenant_email_login_codes(
                session,
                email=email,
                auth_intent=_AUTH_INTENT,
            )
            _, raw_code = await _store_tenant_email_login_code(
                session,
                email=email,
                auth_intent=_AUTH_INTENT,
                tenant_slug="future-swim",
                metadata={"futureswim_parent_id": str(parent_row["id"])},
            )
            await session.commit()
            try:
                await _deliver_tenant_email_login_code(
                    request,
                    email=email,
                    code=raw_code,
                    auth_intent=_AUTH_INTENT,
                    tenant_name="Future Swim",
                    tenant_slug="future-swim",
                )
            except Exception as exc:  # noqa: BLE001
                _logger.warning("futureswim_portal_login_email_send_failed: %s", exc)
        else:
            await session.rollback()

    return _success_response(
        {"status": "code_sent", "expires_in_minutes": 15},
        tenant_id=None,
        actor_context=None,
    )


async def futureswim_portal_login_verify(
    request: Request,
    payload: FutureSwimPortalLoginVerifyPayload,
):
    email = (payload.email or "").strip().lower()
    code = (payload.code or "").strip()

    async with get_session(request.app.state.session_factory) as session:
        code_row = await _load_valid_tenant_email_login_code(
            session,
            email=email,
            auth_intent=_AUTH_INTENT,
            code=code,
        )
        if code_row is None:
            return _error_response(
                AppError(
                    code="invalid_or_expired_code",
                    message="That code is invalid or has expired. Request a new code from the portal.",
                    status_code=401,
                    details={},
                ),
                tenant_id=None,
                actor_context=None,
            )

        parent_row = await _load_parent_by_email(session, email)
        if parent_row is None:
            return _error_response(
                AppError(
                    code="parent_not_found",
                    message="That email is not linked to a Future Swim portal account.",
                    status_code=404,
                    details={},
                ),
                tenant_id=None,
                actor_context=None,
            )

        from datetime import UTC, datetime as _dt

        code_row.consumed_at = _dt.now(UTC)
        await session.execute(
            text("update futureswim_parent_users set last_login_at = now(), updated_at = now() where id = :id"),
            {"id": str(parent_row["id"])},
        )
        await session.commit()

    secret = _resolve_session_secret(request)
    token = _sign_parent_session_token(
        secret=secret,
        parent_id=str(parent_row["id"]),
        email=str(parent_row["email"]),
    )
    return _success_response(
        {
            "session_token": token,
            "expires_in_seconds": _SESSION_TTL_SECONDS,
            "parent": {
                "id": str(parent_row["id"]),
                "email": parent_row["email"],
                "full_name": parent_row["full_name"],
            },
        },
        tenant_id=None,
        actor_context=None,
    )


async def futureswim_portal_me(
    request: Request,
    authorization: str | None = Header(default=None),
):
    token = _extract_bearer_token(authorization)
    if not token:
        return _error_response(
            AppError(
                code="auth_required",
                message="Sign in to your Future Swim portal to view this dashboard.",
                status_code=401,
                details={},
            ),
            tenant_id=None,
            actor_context=None,
        )
    secret = _resolve_session_secret(request)
    try:
        token_payload = _verify_parent_session_token(secret=secret, token=token)
    except _ParentSessionVerifyError as exc:
        return _error_response(
            AppError(
                code="invalid_session",
                message="Your portal session has expired. Sign in again with your email.",
                status_code=401,
                details={"reason": str(exc)},
            ),
            tenant_id=None,
            actor_context=None,
        )

    parent_id = str(token_payload.get("sub") or "")
    if not parent_id:
        return _error_response(
            AppError(
                code="invalid_session",
                message="Your portal session is malformed. Sign in again.",
                status_code=401,
                details={},
            ),
            tenant_id=None,
            actor_context=None,
        )

    async with get_session(request.app.state.session_factory) as session:
        parent_row = await _load_parent_by_id(session, parent_id)
        if parent_row is None:
            return _error_response(
                AppError(
                    code="parent_not_found",
                    message="Your Future Swim portal account is no longer active.",
                    status_code=404,
                    details={},
                ),
                tenant_id=None,
                actor_context=None,
            )
        portal_payload = await _build_portal_payload(session, parent_row)

    return _success_response(portal_payload, tenant_id=None, actor_context=None)


async def futureswim_portal_preview(request: Request):
    """Return the portal payload for the parent identified by ``key``.

    Query params:
      key (required) — the ``futureswim_parent_users.login_token`` value.

    Phase 3.1 deliberately accepts the bare token in the URL because the
    welcome email is the only place the link is surfaced; the token is
    rotated whenever the parent record is reseeded. Phase 3.2 will deprecate
    this in favour of a proper session cookie.
    """
    key = (request.query_params.get("key") or "").strip()
    if not key:
        return _error_response(
            AppError(
                code="missing_key",
                message="Provide ?key=<login_token> from your Future Swim welcome email.",
                status_code=400,
                details={},
            ),
            tenant_id=None,
            actor_context=None,
        )

    async with get_session(request.app.state.session_factory) as session:
        parent_row = (
            await session.execute(
                text(
                    """
                    select id, email, full_name, phone, centre_code, preferred_locale,
                           login_token_expires_at
                      from futureswim_parent_users
                     where login_token = :key
                       and (login_token_expires_at is null
                            or login_token_expires_at > now())
                     limit 1
                    """
                ),
                {"key": key},
            )
        ).mappings().first()

        if parent_row is None:
            return _error_response(
                AppError(
                    code="invalid_or_expired_key",
                    message="That portal link has expired or is not recognised. Reply to your Future Swim welcome email to get a fresh link.",
                    status_code=404,
                    details={},
                ),
                tenant_id=None,
                actor_context=None,
            )

        # Phase 3.2C: share the same payload builder as /me so the preview
        # endpoint also returns the parent's bookings array. Demo / preview
        # parents who have a contacts row + booking_intents matched by email
        # will see their bookings; otherwise the array is empty.
        payload = await _build_portal_payload(session, parent_row)

    return _success_response(payload, tenant_id=None, actor_context=None)
