"""Future Swim coach ops handlers (Phase 3.2B + 3.3).

The futureswim.bookedai.au coaches use these endpoints from a small
ops surface to record per-lesson progress notes and per-period evaluations
for the children whose centres they teach at.

Phase 3.2B (shipped): bare ``Bearer`` token stored on
``futureswim_coach_users.login_token`` — kept for service accounts and the
demo coach.

Phase 3.3 (this revision): magic email-code login analogous to the parent
portal (Phase 3.2A). Coaches POST their email, receive a 6-digit code via
``tenant_email_login_codes`` (migration 015), exchange the code for a
session JWT (HMAC-signed, kind=``futureswim_coach``, 30-day TTL), and pass
it as ``Authorization: Bearer <session_token>``. ``_require_coach`` accepts
both the new JWT and the legacy long-lived ``login_token`` so the demo
coach + service accounts continue to work.

Endpoints (all under ``/api/v1/futureswim/coach``):

  - ``POST /login/request``                  send 6-digit code
  - ``POST /login/verify``                   exchange code for session JWT
  - ``GET  /me``                             coach summary + students list
  - ``GET  /students``                       list students at the coach's
                                             assigned centres
  - ``POST /students/{id}/progress``         insert one row into
                                             ``futureswim_student_progress``
  - ``POST /students/{id}/evaluation``       insert one row into
                                             ``futureswim_teacher_evaluations``

A coach may write only for students whose ``centre_code`` is in their
``assigned_centre_codes`` JSONB list, with the special value ``"*"``
granting write access at every centre (used for area-managers).
"""

from __future__ import annotations

import base64
import hashlib
import hmac
import json
import os
import time
from datetime import date as date_type
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


_logger = get_logger("bookedai.api.v1_futureswim_coach_handlers")
_AUTH_INTENT = "futureswim_coach_login"
_SESSION_TTL_SECONDS = 30 * 24 * 60 * 60  # 30 days
_TOKEN_KIND = "futureswim_coach"


# ---------------------------------------------------------------------------
# helpers
# ---------------------------------------------------------------------------


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
    if hasattr(value, "isoformat"):
        return value.isoformat()
    return str(value)


def _normalise_assigned_centres(raw: Any) -> list[str]:
    if raw is None:
        return []
    if isinstance(raw, list):
        items = raw
    elif isinstance(raw, str):
        try:
            parsed = json.loads(raw)
        except (TypeError, ValueError):
            return []
        if not isinstance(parsed, list):
            return []
        items = parsed
    else:
        return []
    return [str(item) for item in items if item is not None]


def _coach_can_write_centre(coach_row: dict[str, Any], centre_code: str | None) -> bool:
    centres = _normalise_assigned_centres(coach_row.get("assigned_centre_codes"))
    if "*" in centres:
        return True
    if not centre_code:
        return False
    return centre_code in centres


def _coach_payload(coach_row: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": str(coach_row["id"]),
        "email": coach_row["email"],
        "full_name": coach_row.get("full_name"),
        "coach_initials": coach_row.get("coach_initials"),
        "assigned_centre_codes": _normalise_assigned_centres(
            coach_row.get("assigned_centre_codes")
        ),
    }


# ---------------------------------------------------------------------------
# Session JWT helpers (mirrors v1_futureswim_portal_handlers.py)
# ---------------------------------------------------------------------------


def _resolve_coach_auth_secret(request: Request) -> str:
    settings = getattr(request.app.state, "settings", None)
    candidate = (os.getenv("FUTURESWIM_COACH_AUTH_SECRET") or "").strip()
    if candidate:
        return candidate
    candidate = str(getattr(settings, "session_signing_secret", "") or "").strip()
    if candidate:
        return candidate
    return "futureswim-coach-dev"


def _b64url_encode(value: bytes) -> str:
    return base64.urlsafe_b64encode(value).rstrip(b"=").decode("ascii")


def _b64url_decode(value: str) -> bytes:
    padding = "=" * (-len(value) % 4)
    return base64.urlsafe_b64decode((value + padding).encode("ascii"))


def _sign_coach_session_token(*, secret: str, coach_id: str, email: str) -> str:
    issued_at = int(time.time())
    payload = {
        "sub": coach_id,
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


class _CoachSessionVerifyError(Exception):
    pass


def _verify_coach_session_token(*, secret: str, token: str) -> dict[str, object]:
    raw = (token or "").strip()
    if not raw:
        raise _CoachSessionVerifyError("missing")
    parts = raw.split(".")
    if len(parts) != 3:
        raise _CoachSessionVerifyError("malformed")
    header_segment, payload_segment, signature_segment = parts
    signing_input = f"{header_segment}.{payload_segment}".encode()
    expected = hmac.new(secret.encode(), signing_input, hashlib.sha256).digest()
    try:
        provided = _b64url_decode(signature_segment)
    except Exception as exc:  # noqa: BLE001
        raise _CoachSessionVerifyError("signature_invalid") from exc
    if not hmac.compare_digest(expected, provided):
        raise _CoachSessionVerifyError("signature_mismatch")
    try:
        payload = json.loads(_b64url_decode(payload_segment).decode("utf-8"))
    except Exception as exc:  # noqa: BLE001
        raise _CoachSessionVerifyError("payload_invalid") from exc
    if not isinstance(payload, dict) or payload.get("kind") != _TOKEN_KIND:
        raise _CoachSessionVerifyError("kind_mismatch")
    expires_at = int(payload.get("exp") or 0)
    if expires_at and expires_at < int(time.time()):
        raise _CoachSessionVerifyError("expired")
    return payload


# ---------------------------------------------------------------------------
# Coach lookup helpers
# ---------------------------------------------------------------------------


async def _load_coach_by_email(session, email: str) -> dict[str, Any] | None:
    row = (
        await session.execute(
            text(
                """
                select id, email, full_name, coach_initials, phone,
                       assigned_centre_codes, is_active,
                       login_token_expires_at
                  from futureswim_coach_users
                 where lower(email) = lower(:email)
                   and is_active = 1
                 limit 1
                """
            ),
            {"email": email.strip()},
        )
    ).mappings().first()
    return dict(row) if row is not None else None


async def _load_coach_by_id(session, coach_id: str) -> dict[str, Any] | None:
    row = (
        await session.execute(
            text(
                """
                select id, email, full_name, coach_initials, phone,
                       assigned_centre_codes, is_active,
                       login_token_expires_at
                  from futureswim_coach_users
                 where id = :id
                   and is_active = 1
                 limit 1
                """
            ),
            {"id": coach_id},
        )
    ).mappings().first()
    return dict(row) if row is not None else None


async def _load_coach_by_login_token(session, token: str) -> dict[str, Any] | None:
    row = (
        await session.execute(
            text(
                """
                select id, email, full_name, coach_initials, phone,
                       assigned_centre_codes, is_active,
                       login_token_expires_at
                  from futureswim_coach_users
                 where login_token = :token
                   and is_active = 1
                   and (login_token_expires_at is null
                        or login_token_expires_at > now())
                 limit 1
                """
            ),
            {"token": token},
        )
    ).mappings().first()
    return dict(row) if row is not None else None


async def _require_coach(
    request: Request, authorization: str | None
) -> dict[str, Any] | Any:
    """Resolve the coach for ``Authorization: Bearer <token>``.

    Accepts EITHER:
      1. A signed session JWT with ``kind='futureswim_coach'`` (Phase 3.3),
         issued by ``/futureswim/coach/login/verify``.
      2. A long-lived ``futureswim_coach_users.login_token`` value
         (Phase 3.2B back-compat — still used by service accounts and the
         demo coach).

    Returns the coach row mapping on success, or a JSONResponse error on
    failure that the caller MUST return verbatim.
    """

    token = _extract_bearer_token(authorization)
    if not token:
        return _error_response(
            AppError(
                code="coach_auth_required",
                message="Sign in with your Future Swim coach account to use this endpoint.",
                status_code=401,
                details={},
            ),
            tenant_id=None,
            actor_context=None,
        )

    secret = _resolve_coach_auth_secret(request)
    coach_id_from_jwt: str | None = None
    try:
        token_payload = _verify_coach_session_token(secret=secret, token=token)
        coach_id_from_jwt = str(token_payload.get("sub") or "") or None
    except _CoachSessionVerifyError:
        coach_id_from_jwt = None

    async with get_session(request.app.state.session_factory) as session:
        coach_row: dict[str, Any] | None = None
        if coach_id_from_jwt:
            coach_row = await _load_coach_by_id(session, coach_id_from_jwt)
        if coach_row is None:
            # Fall back to long-lived login_token lookup. We do this even when
            # JWT verify succeeded but the coach was deactivated/removed —
            # in that case we still want to return invalid_or_expired.
            coach_row = await _load_coach_by_login_token(session, token)

        if coach_row is None:
            return _error_response(
                AppError(
                    code="invalid_or_expired_coach_token",
                    message="Your Future Swim coach session is invalid or has expired. Sign in again.",
                    status_code=401,
                    details={},
                ),
                tenant_id=None,
                actor_context=None,
            )

        await session.execute(
            text(
                "update futureswim_coach_users set last_login_at = now(), updated_at = now() where id = :id"
            ),
            {"id": str(coach_row["id"])},
        )
        await session.commit()

    return coach_row


async def _load_student(session, student_id: str) -> dict[str, Any] | None:
    return (
        await session.execute(
            text(
                """
                select sp.id, sp.parent_id, sp.full_name, sp.centre_code,
                       sp.current_level_code, sp.is_active,
                       pu.email as parent_email
                  from futureswim_student_profiles sp
             left join futureswim_parent_users pu
                    on pu.id = sp.parent_id
                 where sp.id = :id
                 limit 1
                """
            ),
            {"id": student_id},
        )
    ).mappings().first()


async def _last_session_date(session, student_id: str) -> Any:
    row = (
        await session.execute(
            text(
                """
                select max(session_date) as last_session_date
                  from futureswim_student_progress
                 where student_id = :student_id
                """
            ),
            {"student_id": student_id},
        )
    ).mappings().first()
    return row["last_session_date"] if row else None


async def _load_students_for_coach(
    session, coach_row: dict[str, Any]
) -> list[dict[str, Any]]:
    """Shared helper used by both ``/coach/students`` and ``/coach/me``."""

    centres = _normalise_assigned_centres(coach_row.get("assigned_centre_codes"))
    wildcard = "*" in centres

    if wildcard:
        student_rows = (
            await session.execute(
                text(
                    """
                    select sp.id, sp.parent_id, sp.full_name,
                           sp.date_of_birth, sp.centre_code,
                           sp.current_level_code, sp.enrolled_since,
                           sp.notes_for_coach,
                           pu.email as parent_email,
                           pu.full_name as parent_full_name
                      from futureswim_student_profiles sp
                 left join futureswim_parent_users pu
                        on pu.id = sp.parent_id
                     where sp.is_active = 1
                     order by sp.centre_code asc nulls last,
                              sp.full_name asc
                    """
                )
            )
        ).mappings().all()
    else:
        if not centres:
            return []
        student_rows = (
            await session.execute(
                text(
                    """
                    select sp.id, sp.parent_id, sp.full_name,
                           sp.date_of_birth, sp.centre_code,
                           sp.current_level_code, sp.enrolled_since,
                           sp.notes_for_coach,
                           pu.email as parent_email,
                           pu.full_name as parent_full_name
                      from futureswim_student_profiles sp
                 left join futureswim_parent_users pu
                        on pu.id = sp.parent_id
                     where sp.is_active = 1
                       and sp.centre_code = any(:centres)
                     order by sp.centre_code asc nulls last,
                              sp.full_name asc
                    """
                ),
                {"centres": centres},
            )
        ).mappings().all()

    students_payload: list[dict[str, Any]] = []
    for student in student_rows:
        student_id = str(student["id"])
        last_session_date = await _last_session_date(session, student_id)
        students_payload.append(
            {
                "id": student_id,
                "parent_id": str(student["parent_id"]) if student["parent_id"] else None,
                "parent_email": student.get("parent_email"),
                "parent_full_name": student.get("parent_full_name"),
                "full_name": student["full_name"],
                "date_of_birth": _isoformat_date(student["date_of_birth"]),
                "centre_code": student["centre_code"],
                "current_level_code": student["current_level_code"],
                "enrolled_since": _isoformat_date(student["enrolled_since"]),
                "notes_for_coach": student["notes_for_coach"],
                "last_session_date": _isoformat_date(last_session_date),
            }
        )
    return students_payload


# ---------------------------------------------------------------------------
# Pydantic payloads
# ---------------------------------------------------------------------------


class FutureSwimCoachLoginRequestPayload(BaseModel):
    email: str = Field(..., min_length=3, max_length=255)


class FutureSwimCoachLoginVerifyPayload(BaseModel):
    email: str = Field(..., min_length=3, max_length=255)
    code: str = Field(..., min_length=4, max_length=12)


class CoachProgressEntryPayload(BaseModel):
    session_date: date_type
    level_code: str | None = None
    centre_code: str | None = None
    attendance: int | None = Field(default=None, ge=0, le=2)
    focus_skill: str | None = None
    notes_md: str | None = None


class CoachEvaluationPayload(BaseModel):
    evaluated_at: date_type
    level_code: str | None = None
    level_outcome: str | None = None
    strengths_md: str | None = None
    areas_to_work_on_md: str | None = None
    next_step_level_code: str | None = None
    next_step_summary: str | None = None


# ---------------------------------------------------------------------------
# endpoint: magic email-code login (Phase 3.3)
# ---------------------------------------------------------------------------


async def futureswim_coach_login_request(
    request: Request,
    payload: FutureSwimCoachLoginRequestPayload,
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
        coach_row = await _load_coach_by_email(session, email)

        # Always return success to avoid leaking which emails have a coach
        # account. We only generate + send a code when the email matches.
        if coach_row is not None:
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
                metadata={"futureswim_coach_id": str(coach_row["id"])},
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
                _logger.warning("futureswim_coach_login_email_send_failed: %s", exc)
        else:
            await session.rollback()

    return _success_response(
        {"status": "code_sent", "expires_in_minutes": 15},
        tenant_id=None,
        actor_context=None,
    )


async def futureswim_coach_login_verify(
    request: Request,
    payload: FutureSwimCoachLoginVerifyPayload,
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
                    message="That code is invalid or has expired. Request a new code from the coach sign-in page.",
                    status_code=401,
                    details={},
                ),
                tenant_id=None,
                actor_context=None,
            )

        coach_row = await _load_coach_by_email(session, email)
        if coach_row is None:
            return _error_response(
                AppError(
                    code="coach_not_found",
                    message="That email is not linked to a Future Swim coach account.",
                    status_code=404,
                    details={},
                ),
                tenant_id=None,
                actor_context=None,
            )

        from datetime import UTC, datetime as _dt

        code_row.consumed_at = _dt.now(UTC)
        await session.execute(
            text(
                "update futureswim_coach_users set last_login_at = now(), updated_at = now() where id = :id"
            ),
            {"id": str(coach_row["id"])},
        )
        await session.commit()

    secret = _resolve_coach_auth_secret(request)
    token = _sign_coach_session_token(
        secret=secret,
        coach_id=str(coach_row["id"]),
        email=str(coach_row["email"]),
    )
    return _success_response(
        {
            "session_token": token,
            "expires_in_seconds": _SESSION_TTL_SECONDS,
            "coach": _coach_payload(coach_row),
        },
        tenant_id=None,
        actor_context=None,
    )


# ---------------------------------------------------------------------------
# endpoint: coach summary + students (Phase 3.3)
# ---------------------------------------------------------------------------


async def futureswim_coach_me(
    request: Request,
    authorization: str | None = Header(default=None),
):
    coach_or_error = await _require_coach(request, authorization)
    if not isinstance(coach_or_error, dict):
        return coach_or_error
    coach_row = coach_or_error

    async with get_session(request.app.state.session_factory) as session:
        students_payload = await _load_students_for_coach(session, coach_row)

    return _success_response(
        {
            "coach": _coach_payload(coach_row),
            "students": students_payload,
        },
        tenant_id=None,
        actor_context=None,
    )


# ---------------------------------------------------------------------------
# endpoint: list students at coach's centres
# ---------------------------------------------------------------------------


async def futureswim_coach_students_list(
    request: Request,
    authorization: str | None = Header(default=None),
):
    coach_or_error = await _require_coach(request, authorization)
    if not isinstance(coach_or_error, dict):
        return coach_or_error
    coach_row = coach_or_error

    async with get_session(request.app.state.session_factory) as session:
        students_payload = await _load_students_for_coach(session, coach_row)

    return _success_response(
        {
            "coach": _coach_payload(coach_row),
            "students": students_payload,
        },
        tenant_id=None,
        actor_context=None,
    )


# ---------------------------------------------------------------------------
# endpoint: write a per-lesson progress entry
# ---------------------------------------------------------------------------


async def futureswim_coach_write_progress(
    request: Request,
    student_id: str,
    payload: CoachProgressEntryPayload,
    authorization: str | None = Header(default=None),
):
    coach_or_error = await _require_coach(request, authorization)
    if not isinstance(coach_or_error, dict):
        return coach_or_error
    coach_row = coach_or_error

    async with get_session(request.app.state.session_factory) as session:
        student = await _load_student(session, student_id)
        if student is None or student.get("is_active") != 1:
            return _error_response(
                AppError(
                    code="student_not_found",
                    message="That student is not on the Future Swim active roster.",
                    status_code=404,
                    details={"student_id": student_id},
                ),
                tenant_id=None,
                actor_context=None,
            )

        effective_centre = (payload.centre_code or student.get("centre_code") or "").strip() or None
        if not _coach_can_write_centre(coach_row, effective_centre):
            return _error_response(
                AppError(
                    code="centre_not_assigned",
                    message="Your coach account is not assigned to this student's centre.",
                    status_code=403,
                    details={
                        "student_centre_code": effective_centre,
                        "assigned_centre_codes": _normalise_assigned_centres(
                            coach_row.get("assigned_centre_codes")
                        ),
                    },
                ),
                tenant_id=None,
                actor_context=None,
            )

        effective_level = (
            payload.level_code or student.get("current_level_code") or None
        )

        inserted = (
            await session.execute(
                text(
                    """
                    insert into futureswim_student_progress (
                      student_id, session_date, centre_code, level_code,
                      attendance, focus_skill, notes_md, coach_initials
                    )
                    values (
                      :student_id, :session_date, :centre_code, :level_code,
                      :attendance, :focus_skill, :notes_md, :coach_initials
                    )
                    returning id, student_id, session_date, centre_code,
                              level_code, attendance, focus_skill, notes_md,
                              coach_initials, created_at
                    """
                ),
                {
                    "student_id": str(student["id"]),
                    "session_date": payload.session_date,
                    "centre_code": effective_centre,
                    "level_code": effective_level,
                    "attendance": payload.attendance,
                    "focus_skill": payload.focus_skill,
                    "notes_md": payload.notes_md,
                    "coach_initials": coach_row.get("coach_initials"),
                },
            )
        ).mappings().first()
        await session.commit()

    return _success_response(
        {
            "progress_entry": {
                "id": str(inserted["id"]),
                "student_id": str(inserted["student_id"]),
                "session_date": _isoformat_date(inserted["session_date"]),
                "centre_code": inserted["centre_code"],
                "level_code": inserted["level_code"],
                "attendance": inserted["attendance"],
                "focus_skill": inserted["focus_skill"],
                "notes_md": inserted["notes_md"],
                "coach_initials": inserted["coach_initials"],
                "created_at": _isoformat_datetime(inserted["created_at"]),
            }
        },
        tenant_id=None,
        actor_context=None,
    )


# ---------------------------------------------------------------------------
# endpoint: write a per-period evaluation
# ---------------------------------------------------------------------------


async def futureswim_coach_write_evaluation(
    request: Request,
    student_id: str,
    payload: CoachEvaluationPayload,
    authorization: str | None = Header(default=None),
):
    coach_or_error = await _require_coach(request, authorization)
    if not isinstance(coach_or_error, dict):
        return coach_or_error
    coach_row = coach_or_error

    async with get_session(request.app.state.session_factory) as session:
        student = await _load_student(session, student_id)
        if student is None or student.get("is_active") != 1:
            return _error_response(
                AppError(
                    code="student_not_found",
                    message="That student is not on the Future Swim active roster.",
                    status_code=404,
                    details={"student_id": student_id},
                ),
                tenant_id=None,
                actor_context=None,
            )

        student_centre = (student.get("centre_code") or "").strip() or None
        if not _coach_can_write_centre(coach_row, student_centre):
            return _error_response(
                AppError(
                    code="centre_not_assigned",
                    message="Your coach account is not assigned to this student's centre.",
                    status_code=403,
                    details={
                        "student_centre_code": student_centre,
                        "assigned_centre_codes": _normalise_assigned_centres(
                            coach_row.get("assigned_centre_codes")
                        ),
                    },
                ),
                tenant_id=None,
                actor_context=None,
            )

        effective_level = (
            payload.level_code or student.get("current_level_code") or None
        )

        inserted = (
            await session.execute(
                text(
                    """
                    insert into futureswim_teacher_evaluations (
                      student_id, evaluated_at, level_code, level_outcome,
                      strengths_md, areas_to_work_on_md,
                      next_step_level_code, next_step_summary, coach_initials
                    )
                    values (
                      :student_id, :evaluated_at, :level_code, :level_outcome,
                      :strengths_md, :areas_to_work_on_md,
                      :next_step_level_code, :next_step_summary, :coach_initials
                    )
                    returning id, student_id, evaluated_at, level_code,
                              level_outcome, strengths_md, areas_to_work_on_md,
                              next_step_level_code, next_step_summary,
                              coach_initials, created_at
                    """
                ),
                {
                    "student_id": str(student["id"]),
                    "evaluated_at": payload.evaluated_at,
                    "level_code": effective_level,
                    "level_outcome": payload.level_outcome,
                    "strengths_md": payload.strengths_md,
                    "areas_to_work_on_md": payload.areas_to_work_on_md,
                    "next_step_level_code": payload.next_step_level_code,
                    "next_step_summary": payload.next_step_summary,
                    "coach_initials": coach_row.get("coach_initials"),
                },
            )
        ).mappings().first()
        await session.commit()

    return _success_response(
        {
            "evaluation": {
                "id": str(inserted["id"]),
                "student_id": str(inserted["student_id"]),
                "evaluated_at": _isoformat_date(inserted["evaluated_at"]),
                "level_code": inserted["level_code"],
                "level_outcome": inserted["level_outcome"],
                "strengths_md": inserted["strengths_md"],
                "areas_to_work_on_md": inserted["areas_to_work_on_md"],
                "next_step_level_code": inserted["next_step_level_code"],
                "next_step_summary": inserted["next_step_summary"],
                "coach_initials": inserted["coach_initials"],
                "created_at": _isoformat_datetime(inserted["created_at"]),
            }
        },
        tenant_id=None,
        actor_context=None,
    )
