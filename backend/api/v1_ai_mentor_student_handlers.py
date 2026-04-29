"""Student account portal handlers for aimentor.bookedai.au.

The AI Mentor subdomain treats the learner as a separate identity from the
tenant admin (aimentor@bookedai.au) and the platform admin. Students sign in
with Google so they can view their bookings, payment status, and the mentor
progress journal without managing a password.

Tokens are HMAC-signed JWT-style strings (header.payload.signature), built
with stdlib (``hmac`` + ``base64`` + ``json``) so this module does not pull in
PyJWT. The signing secret is read from ``STUDENT_AUTH_SECRET`` and falls back
to the existing ``SESSION_SIGNING_SECRET`` (a.k.a. SECRET_KEY) so a fresh
deploy still gets a working secret if the operator has not added the new env
var yet.

Mirrors ``v1_chess_student_handlers`` deliberately — kept as a parallel
implementation per AI Mentor / Chess tenant identity isolation. Generalising
to a multi-tenant ``tenant_student_users`` is a deferred follow-up.
"""

from __future__ import annotations

import base64
import hashlib
import hmac
import json
import os
import time
from typing import Literal

from fastapi import Header, Request
from pydantic import BaseModel, Field
from sqlalchemy import text

from core.errors import AppError, ValidationAppError
from core.logging import get_logger
from db import get_session

from api.v1_routes import (
    _error_response,
    _success_response,
    _verify_google_identity_token,
)


_logger = get_logger("bookedai.api.v1_ai_mentor_student_handlers")


_STUDENT_TOKEN_TTL_SECONDS = 30 * 24 * 60 * 60  # 30 days
_STUDENT_TOKEN_KIND = "ai_mentor_student"


def _resolve_student_auth_secret(request: Request) -> str:
    """Pick the HMAC secret used to sign AI Mentor student session tokens.

    Order of preference:
    1. ``STUDENT_AUTH_SECRET`` env var (preferred, shared with chess pattern)
    2. ``SESSION_SIGNING_SECRET`` (existing platform-wide secret)
    3. The literal string ``bookedai-student-dev`` as a last resort so local
       dev still works without configuration.
    """
    settings = getattr(request.app.state, "settings", None)
    candidate = (os.getenv("STUDENT_AUTH_SECRET") or "").strip()
    if candidate:
        return candidate
    candidate = str(getattr(settings, "session_signing_secret", "") or "").strip()
    if candidate:
        return candidate
    return "bookedai-student-dev"


def _b64url_encode(value: bytes) -> str:
    return base64.urlsafe_b64encode(value).rstrip(b"=").decode("ascii")


def _b64url_decode(value: str) -> bytes:
    padding = "=" * (-len(value) % 4)
    return base64.urlsafe_b64decode((value + padding).encode("ascii"))


def _sign_student_session_token(*, secret: str, student_id: str, email: str) -> str:
    """Build a compact HMAC-SHA256 JWT-style session token for a student."""
    issued_at = int(time.time())
    expires_at = issued_at + _STUDENT_TOKEN_TTL_SECONDS
    header = {"alg": "HS256", "typ": "BAS"}
    payload = {
        "sub": student_id,
        "email": email,
        "iat": issued_at,
        "exp": expires_at,
        "kind": _STUDENT_TOKEN_KIND,
    }
    header_segment = _b64url_encode(json.dumps(header, separators=(",", ":")).encode())
    payload_segment = _b64url_encode(json.dumps(payload, separators=(",", ":")).encode())
    signing_input = f"{header_segment}.{payload_segment}".encode()
    signature = hmac.new(secret.encode(), signing_input, hashlib.sha256).digest()
    signature_segment = _b64url_encode(signature)
    return f"{header_segment}.{payload_segment}.{signature_segment}"


class StudentSessionVerifyError(Exception):
    """Raised when a student session token is missing/expired/tampered."""


def _verify_student_session_token(*, secret: str, token: str) -> dict[str, object]:
    raw = (token or "").strip()
    if not raw:
        raise StudentSessionVerifyError("student_session_token_missing")
    parts = raw.split(".")
    if len(parts) != 3:
        raise StudentSessionVerifyError("student_session_token_malformed")
    header_segment, payload_segment, signature_segment = parts
    signing_input = f"{header_segment}.{payload_segment}".encode()
    expected = hmac.new(secret.encode(), signing_input, hashlib.sha256).digest()
    try:
        provided = _b64url_decode(signature_segment)
    except Exception as exc:  # noqa: BLE001
        raise StudentSessionVerifyError("student_session_token_signature_invalid") from exc
    if not hmac.compare_digest(expected, provided):
        raise StudentSessionVerifyError("student_session_token_signature_mismatch")
    try:
        payload = json.loads(_b64url_decode(payload_segment).decode("utf-8"))
    except Exception as exc:  # noqa: BLE001
        raise StudentSessionVerifyError("student_session_token_payload_invalid") from exc
    if not isinstance(payload, dict):
        raise StudentSessionVerifyError("student_session_token_payload_invalid")
    if payload.get("kind") != _STUDENT_TOKEN_KIND:
        raise StudentSessionVerifyError("student_session_token_kind_mismatch")
    expires_at = int(payload.get("exp") or 0)
    if expires_at and expires_at < int(time.time()):
        raise StudentSessionVerifyError("student_session_token_expired")
    return payload


def _extract_bearer_token(authorization: str | None) -> str | None:
    if not authorization:
        return None
    raw = authorization.strip()
    if raw.lower().startswith("bearer "):
        return raw[7:].strip() or None
    return raw or None


async def _require_student_session(
    request: Request,
    *,
    authorization: str | None,
) -> dict[str, object]:
    token = _extract_bearer_token(authorization)
    if not token:
        raise AppError(
            code="student_auth_required",
            message="Sign in with Google before accessing AI Mentor student data.",
            status_code=401,
        )
    secret = _resolve_student_auth_secret(request)
    try:
        return _verify_student_session_token(secret=secret, token=token)
    except StudentSessionVerifyError as exc:
        raise AppError(
            code="student_auth_invalid_session",
            message="Student session expired or could not be verified. Sign in again.",
            status_code=401,
            details={"reason": str(exc)},
        ) from exc


# --- payloads --------------------------------------------------------------


class StudentGoogleAuthPayload(BaseModel):
    id_token: str = Field(..., description="Google identity token from GIS popup.")
    intent: Literal["sign_in"] = Field(default="sign_in")
    preferred_locale: Literal["en", "vi"] | None = Field(
        default=None, description="Locale captured from the AI Mentor UI."
    )


class StudentLogoutPayload(BaseModel):
    pass


class StudentLocaleUpdatePayload(BaseModel):
    preferred_locale: Literal["en", "vi"] = Field(..., description="EN or VI.")


# --- repository helpers ----------------------------------------------------


async def _upsert_ai_mentor_student_user(
    session,
    *,
    google_sub: str,
    email: str,
    full_name: str | None,
    avatar_url: str | None,
    preferred_locale: str | None,
) -> dict[str, object]:
    """Look up a row by google_sub or create one. Idempotent on repeated logins."""
    locale_norm = (preferred_locale or "").strip().lower()
    locale_value = "vi" if locale_norm == "vi" else "en"
    result = await session.execute(
        text(
            """
            insert into ai_mentor_student_users (
              google_sub, email, full_name, avatar_url, preferred_locale, last_login_at
            )
            values (
              :google_sub, :email, :full_name, :avatar_url, :preferred_locale, now()
            )
            on conflict (google_sub) do update set
              email = excluded.email,
              full_name = coalesce(excluded.full_name, ai_mentor_student_users.full_name),
              avatar_url = coalesce(excluded.avatar_url, ai_mentor_student_users.avatar_url),
              preferred_locale = case
                when :preferred_locale_provided then excluded.preferred_locale
                else ai_mentor_student_users.preferred_locale
              end,
              updated_at = now(),
              last_login_at = now()
            returning
              id::text as id,
              google_sub,
              email,
              full_name,
              avatar_url,
              preferred_locale,
              created_at,
              updated_at,
              last_login_at
            """
        ),
        {
            "google_sub": google_sub,
            "email": email,
            "full_name": full_name,
            "avatar_url": avatar_url,
            "preferred_locale": locale_value,
            "preferred_locale_provided": preferred_locale is not None,
        },
    )
    row = result.mappings().first()
    if not row:
        return {}
    return dict(row)


async def _load_ai_mentor_student_by_id(session, *, student_id: str) -> dict[str, object] | None:
    normalized_id = (student_id or "").strip()
    if not normalized_id:
        return None
    result = await session.execute(
        text(
            """
            select id::text as id, google_sub, email, full_name, avatar_url, preferred_locale
            from ai_mentor_student_users
            where id = cast(:student_id as uuid)
            limit 1
            """
        ),
        {"student_id": normalized_id},
    )
    row = result.mappings().first()
    return dict(row) if row else None


async def _list_student_bookings(session, *, email: str) -> list[dict[str, object]]:
    normalized_email = (email or "").strip().lower()
    if not normalized_email:
        return []
    result = await session.execute(
        text(
            """
            select
              bi.id::text as booking_intent_id,
              bi.booking_reference,
              bi.service_name,
              bi.requested_date,
              bi.requested_time,
              bi.timezone,
              bi.status,
              bi.payment_dependency_state,
              bi.metadata_json
            from booking_intents bi
            left join contacts c on c.id = bi.contact_id
            where lower(coalesce(c.email, '')) = :email
            order by bi.created_at desc
            limit 50
            """
        ),
        {"email": normalized_email},
    )
    bookings: list[dict[str, object]] = []
    for row in result.mappings().all():
        record = dict(row)
        metadata = record.pop("metadata_json", None) or {}
        payment_status = (
            metadata.get("payment_status") if isinstance(metadata, dict) else None
        )
        bookings.append(
            {
                "booking_intent_id": record.get("booking_intent_id"),
                "booking_reference": record.get("booking_reference"),
                "service_name": record.get("service_name"),
                "requested_date": (
                    record["requested_date"].isoformat()
                    if hasattr(record.get("requested_date"), "isoformat")
                    else record.get("requested_date")
                ),
                "requested_time": record.get("requested_time"),
                "timezone": record.get("timezone"),
                "status": record.get("status"),
                "payment_status": payment_status
                or record.get("payment_dependency_state"),
            }
        )
    return bookings


async def _list_student_progress(session, *, email: str) -> list[dict[str, object]]:
    normalized_email = (email or "").strip().lower()
    if not normalized_email:
        return []
    result = await session.execute(
        text(
            """
            select
              amp.session_date,
              amp.program_track,
              amp.skill_level,
              amp.attendance,
              amp.notes,
              amp.next_focus,
              amp.artifact_url
            from ai_mentor_student_progress amp
            join contacts c on c.id = amp.contact_id
            where lower(coalesce(c.email, '')) = :email
            order by amp.session_date desc
            limit 100
            """
        ),
        {"email": normalized_email},
    )
    rows: list[dict[str, object]] = []
    for row in result.mappings().all():
        record = dict(row)
        rows.append(
            {
                "session_date": (
                    record["session_date"].isoformat()
                    if hasattr(record.get("session_date"), "isoformat")
                    else record.get("session_date")
                ),
                "program_track": record.get("program_track"),
                "skill_level": record.get("skill_level"),
                "attendance": record.get("attendance"),
                "notes": record.get("notes"),
                "next_focus": record.get("next_focus"),
                "artifact_url": record.get("artifact_url"),
            }
        )
    return rows


async def _update_student_locale(
    session,
    *,
    student_id: str,
    preferred_locale: str,
) -> dict[str, object] | None:
    locale_value = "vi" if preferred_locale == "vi" else "en"
    result = await session.execute(
        text(
            """
            update ai_mentor_student_users
            set preferred_locale = :preferred_locale,
                updated_at = now()
            where id = cast(:student_id as uuid)
            returning id::text as id, preferred_locale
            """
        ),
        {"student_id": student_id, "preferred_locale": locale_value},
    )
    row = result.mappings().first()
    return dict(row) if row else None


# --- handlers --------------------------------------------------------------


async def student_google_auth(request: Request, payload: StudentGoogleAuthPayload):
    """Verify a Google id_token and open an AI Mentor student session."""
    try:
        cfg = request.app.state.settings
        identity = await _verify_google_identity_token(cfg, id_token=payload.id_token)
        google_sub = (identity.get("google_sub") or "").strip()
        email = (identity.get("email") or "").strip().lower()
        if not google_sub or not email:
            raise ValidationAppError(
                "Google sign-in did not return a usable subject + email pair.",
                details={"google_sub": google_sub, "email": email},
            )

        async with get_session(request.app.state.session_factory) as session:
            student = await _upsert_ai_mentor_student_user(
                session,
                google_sub=google_sub,
                email=email,
                full_name=identity.get("name") or None,
                avatar_url=identity.get("picture_url") or None,
                preferred_locale=payload.preferred_locale,
            )
            await session.commit()

        if not student or not student.get("id"):
            raise AppError(
                code="student_auth_persistence_failed",
                message="Student profile could not be saved.",
                status_code=500,
            )

        secret = _resolve_student_auth_secret(request)
        token = _sign_student_session_token(
            secret=secret,
            student_id=str(student["id"]),
            email=email,
        )
        return _success_response(
            {
                "session_token": token,
                "student": {
                    "id": str(student["id"]),
                    "email": student.get("email") or email,
                    "full_name": student.get("full_name"),
                    "avatar_url": student.get("avatar_url"),
                    "preferred_locale": student.get("preferred_locale") or "en",
                },
            },
            tenant_id=None,
            actor_context=None,
        )
    except AppError as error:
        return _error_response(error, tenant_id=None, actor_context=None)


async def student_me(
    request: Request,
    authorization: str | None = Header(default=None),
):
    """Return the signed-in student profile, bookings, and progress."""
    try:
        session_payload = await _require_student_session(request, authorization=authorization)
        student_id = str(session_payload.get("sub") or "")
        async with get_session(request.app.state.session_factory) as session:
            student = await _load_ai_mentor_student_by_id(session, student_id=student_id)
            if not student:
                raise AppError(
                    code="student_not_found",
                    message="The signed-in AI Mentor student account could not be located.",
                    status_code=404,
                )
            email = str(student.get("email") or session_payload.get("email") or "")
            bookings = await _list_student_bookings(session, email=email)
            progress = await _list_student_progress(session, email=email)
        return _success_response(
            {
                "student": {
                    "id": student.get("id"),
                    "email": student.get("email"),
                    "full_name": student.get("full_name"),
                    "avatar_url": student.get("avatar_url"),
                    "preferred_locale": student.get("preferred_locale") or "en",
                },
                "bookings": bookings,
                "progress": progress,
            },
            tenant_id=None,
            actor_context=None,
        )
    except AppError as error:
        return _error_response(error, tenant_id=None, actor_context=None)


async def student_logout(
    request: Request,
    authorization: str | None = Header(default=None),
):
    """Token invalidation is client-side; we just confirm the token is valid."""
    try:
        await _require_student_session(request, authorization=authorization)
        return _success_response(
            {"status": "logged_out"},
            tenant_id=None,
            actor_context=None,
        )
    except AppError as error:
        return _error_response(error, tenant_id=None, actor_context=None)


async def student_locale_update(
    request: Request,
    payload: StudentLocaleUpdatePayload,
    authorization: str | None = Header(default=None),
):
    """Persist the AI Mentor student's preferred locale (EN/VI)."""
    try:
        session_payload = await _require_student_session(
            request, authorization=authorization
        )
        student_id = str(session_payload.get("sub") or "")
        async with get_session(request.app.state.session_factory) as session:
            updated = await _update_student_locale(
                session,
                student_id=student_id,
                preferred_locale=payload.preferred_locale,
            )
            await session.commit()
        if not updated:
            raise AppError(
                code="student_locale_update_failed",
                message="Could not save your locale preference.",
                status_code=500,
            )
        return _success_response(
            {"preferred_locale": updated.get("preferred_locale")},
            tenant_id=None,
            actor_context=None,
        )
    except AppError as error:
        return _error_response(error, tenant_id=None, actor_context=None)


class SlotReservePayload(BaseModel):
    full_name: str = Field(..., min_length=1, max_length=200)
    email: str = Field(..., min_length=3, max_length=200)
    phone: str | None = Field(default=None, max_length=40)
    locale: Literal["en", "vi"] | None = Field(default=None)
    notes: str | None = Field(default=None, max_length=2000)


async def reserve_service_time_slot(
    slot_id: str,
    request: Request,
    payload: SlotReservePayload,
):
    """Atomically reserve a slot + provision Zoho artifacts + create booking.

    Flow:
      1. Atomic UPDATE on service_time_slots — increment booked_count only
         if seats are available (single SQL statement, race-safe).
      2. If reservation succeeded, provision Zoho Meeting + Calendar event
         (best-effort; falls back to template URL on failure).
      3. Persist meeting_url + calendar_event_id back onto the slot row.
      4. Create a lightweight booking_intent row keyed by a generated
         booking_reference (status='reserved') so the rest of the platform
         (welcome email, monthly check-in, portal access token) can latch
         on.
      5. Return booking_reference + slot timing + meeting URL to the
         client so the UI can confirm to the learner immediately.

    No auth required — same scope as the public catalogue. Tenant is
    hard-pinned to ``ai-mentor-doer``.
    """
    from datetime import datetime as _dt
    from uuid import uuid4 as _uuid4

    try:
        normalized_slot_id = (slot_id or "").strip()
        if not normalized_slot_id:
            raise ValidationAppError(
                "slot_id is required.",
                details={"slot_id": ["required"]},
            )
        normalized_email = (payload.email or "").strip().lower()
        if "@" not in normalized_email:
            raise ValidationAppError(
                "A valid email is required to reserve a slot.",
                details={"email": ["invalid"]},
            )

        booking_reference = f"AIM-{_uuid4().hex[:10].upper()}"

        async with get_session(request.app.state.session_factory) as session:
            # 1. Atomic seat hold — only succeeds if seats are available + slot
            #    is still active + not in the past. Returns the slot row.
            result = await session.execute(
                text(
                    """
                    update service_time_slots
                    set booked_count = booked_count + 1,
                        updated_at = now()
                    where id = cast(:slot_id as uuid)
                      and tenant_id = (select id from tenants where slug = 'ai-mentor-doer')
                      and is_active = true
                      and booked_count < capacity
                      and slot_start_at > now()
                    returning
                      id::text as id,
                      service_id,
                      slot_start_at,
                      slot_end_at,
                      timezone,
                      capacity,
                      booked_count,
                      label,
                      zoho_meeting_url,
                      zoho_calendar_event_id
                    """
                ),
                {"slot_id": normalized_slot_id},
            )
            slot_row = result.mappings().first()
            if not slot_row:
                raise AppError(
                    code="aimentor_slot_unavailable",
                    message="That slot is full or no longer available. Please pick another.",
                    status_code=409,
                    details={"slot_id": normalized_slot_id},
                )

            slot = dict(slot_row)
            tenant_lookup = await session.execute(
                text(
                    """
                    select id::text as tenant_id, name as tenant_name
                    from tenants
                    where slug = 'ai-mentor-doer'
                    limit 1
                    """
                ),
            )
            tenant_row = tenant_lookup.mappings().first()
            tenant_id = (tenant_row or {}).get("tenant_id")

            # 2. Service info for the Zoho Meeting topic + welcome email.
            service_lookup = await session.execute(
                text(
                    """
                    select name as service_name, duration_minutes
                    from service_merchant_profiles
                    where service_id = :service_id
                      and tenant_id = cast(:tenant_id as uuid)
                    limit 1
                    """
                ),
                {
                    "service_id": slot.get("service_id"),
                    "tenant_id": tenant_id,
                },
            )
            service_row = service_lookup.mappings().first()
            service_name = (
                (service_row or {}).get("service_name")
                or "AI Mentor 1-on-1 session"
            )

            await session.commit()

        # 3. Best-effort Zoho provisioning. We do this OUTSIDE the DB
        #    transaction so a Zoho hiccup never rolls back the seat hold.
        from service_layer.zoho_aimentor_orchestrator import (
            provision_slot_artifacts,
        )

        slot_start_at = slot.get("slot_start_at")
        slot_end_at = slot.get("slot_end_at")
        timezone_label = str(slot.get("timezone") or "Australia/Sydney")
        if not isinstance(slot_start_at, _dt) or not isinstance(slot_end_at, _dt):
            raise AppError(
                code="aimentor_slot_corrupt",
                message="Slot timing data is malformed.",
                status_code=500,
            )

        provisioning = await provision_slot_artifacts(
            request.app.state.settings,
            service_name=service_name,
            booking_reference=booking_reference,
            slot_start_at=slot_start_at,
            slot_end_at=slot_end_at,
            timezone_label=timezone_label,
            learner_name=payload.full_name.strip(),
            learner_email=normalized_email,
            mentor_email=str(
                getattr(request.app.state.settings, "aimentor_mentor_email", "")
                or ""
            ).strip()
            or "aimentor@bookedai.au",
            session_factory=request.app.state.session_factory,
        )

        # 4. Persist learner identity + Zoho artefact references on the
        #    slot row. The reservations admin panel reads these columns
        #    directly (migration 037).
        async with get_session(request.app.state.session_factory) as session:
            await session.execute(
                text(
                    """
                    update service_time_slots
                    set zoho_meeting_url = coalesce(:meeting_url, zoho_meeting_url),
                        zoho_calendar_event_id = coalesce(:event_id, zoho_calendar_event_id),
                        reserved_by_email = :reserved_email,
                        reserved_by_name = :reserved_name,
                        reserved_by_phone = :reserved_phone,
                        reserved_by_locale = :reserved_locale,
                        booking_reference = :booking_reference,
                        reserved_at = coalesce(reserved_at, now()),
                        updated_at = now()
                    where id = cast(:slot_id as uuid)
                    """
                ),
                {
                    "meeting_url": provisioning.meeting_url,
                    "event_id": provisioning.calendar_event_id,
                    "reserved_email": normalized_email,
                    "reserved_name": payload.full_name.strip(),
                    "reserved_phone": (payload.phone or "").strip() or None,
                    "reserved_locale": payload.locale,
                    "booking_reference": booking_reference,
                    "slot_id": normalized_slot_id,
                },
            )
            await session.commit()

        # 5. Best-effort welcome email — same composer the existing booking
        #    flow uses, but with the real slot timing + Zoho Meeting URL
        #    embedded and the tenant inbox CC'd for follow-up. Failures are
        #    logged inside the helper, never break the reserve response.
        if hasattr(request.app.state, "email_service"):
            try:
                from api.v1_booking_handlers import (
                    _send_aimentor_welcome_email,
                )

                portal_link_for_email = (
                    f"https://aimentor.bookedai.au/account?ref="
                    + booking_reference
                )
                await _send_aimentor_welcome_email(
                    email_service=request.app.state.email_service,
                    session_factory=request.app.state.session_factory,
                    customer_email=normalized_email,
                    customer_name=payload.full_name.strip(),
                    booking_reference=booking_reference,
                    service_name=service_name,
                    portal_url=portal_link_for_email,
                    slot_start_at=slot_start_at,
                    slot_end_at=slot_end_at,
                    slot_timezone=timezone_label,
                    zoho_meeting_url=provisioning.meeting_url,
                )
            except Exception:  # noqa: BLE001
                # Email is best-effort — the reservation is the source of
                # truth, the welcome email is a follow-up.
                pass

        return _success_response(
            {
                "booking_reference": booking_reference,
                "slot": {
                    "id": slot.get("id"),
                    "service_id": slot.get("service_id"),
                    "service_name": service_name,
                    "slot_start_at": slot_start_at.isoformat(),
                    "slot_end_at": slot_end_at.isoformat(),
                    "timezone": timezone_label,
                    "label": slot.get("label"),
                },
                "meeting": {
                    "join_url": provisioning.meeting_url,
                    "calendar_event_id": provisioning.calendar_event_id,
                    "provisioned": bool(
                        provisioning.meeting_url or provisioning.calendar_event_id
                    ),
                    "fallback": (
                        "template_url"
                        if not provisioning.meeting_url
                        else None
                    ),
                },
                "next_steps": {
                    "expect_email": True,
                    "expect_calendar_invite": bool(provisioning.calendar_event_id),
                    "mentor_followup_within_hours": 24,
                },
            },
            tenant_id=None,
            actor_context=None,
        )
    except AppError as error:
        return _error_response(error, tenant_id=None, actor_context=None)


class ExchangeZohoOAuthCodePayload(BaseModel):
    """Wizard-supplied payload to swap a Zoho authorization_code for a
    refresh_token. The operator pastes their client_id + client_secret
    into the wizard form; the code came from Zoho's redirect.
    """

    code: str = Field(..., min_length=10, max_length=400)
    client_id: str = Field(..., min_length=10, max_length=200)
    client_secret: str = Field(..., min_length=10, max_length=400)
    redirect_uri: str = Field(..., min_length=10, max_length=400)
    accounts_base_url: str | None = Field(default=None, max_length=200)


async def exchange_zoho_oauth_code(
    request: Request,
    payload: ExchangeZohoOAuthCodePayload,
):
    """Server-side proxy for Zoho's authorization_code → refresh_token flow.

    The wizard page (``aimentor.bookedai.au/aimentor/zoho-oauth-callback``)
    captures the auth code from Zoho's redirect, the operator pastes their
    client_id + client_secret, and we POST to Zoho's
    ``/oauth/v2/token`` here. The auth code is single-use + 60-second TTL,
    so this endpoint is effectively idempotent: a replay of the same code
    fails on Zoho's side.

    Why server-side instead of letting the browser call Zoho directly?
    Because Zoho's token endpoint doesn't set CORS headers — a fetch from
    aimentor.bookedai.au browser context to accounts.zoho.com.au would be
    blocked by the same-origin policy. We proxy to bypass that.

    Security:
      - The client_secret travels HTTPS browser → backend → Zoho. Logged
        request bodies are scrubbed (no full secret in any log line — we
        only log the masked head).
      - We never persist the code, secret, or tokens — they're returned
        directly to the caller.
      - No auth is required because possession of a valid client_id +
        client_secret + auth_code is itself the authorisation. (We don't
        cross-check against any tenant — operator is expected to wire the
        result into their tenant via the admin form.)
    """
    import httpx as _httpx

    accounts_base = (
        payload.accounts_base_url or "https://accounts.zoho.com.au"
    ).rstrip("/")
    token_url = f"{accounts_base}/oauth/v2/token"

    try:
        async with _httpx.AsyncClient(timeout=20) as client:
            response = await client.post(
                token_url,
                data={
                    "grant_type": "authorization_code",
                    "client_id": payload.client_id,
                    "client_secret": payload.client_secret,
                    "redirect_uri": payload.redirect_uri,
                    "code": payload.code,
                },
            )
        try:
            zoho_payload = response.json()
        except Exception:  # noqa: BLE001
            zoho_payload = {}
    except _httpx.HTTPError as exc:
        _logger.warning(
            "aimentor_zoho_exchange_http_error",
            extra={
                "event_type": "aimentor_zoho_exchange_http_error",
                "tenant_id": "",
                "status": 0,
                "route": "/api/v1/aimentor/integrations/zoho/exchange-code",
                "request_id": "",
                "integration_name": "zoho",
                "conversation_id": "",
                "booking_reference": "",
                "job_name": "",
                "job_id": "",
            },
            exc_info=exc,
        )
        return _error_response(
            AppError(
                code="aimentor_zoho_exchange_network_error",
                message="Could not reach Zoho. Check accounts_base_url + retry.",
                status_code=502,
            ),
            tenant_id=None,
            actor_context=None,
        )

    if not isinstance(zoho_payload, dict):
        zoho_payload = {}

    refresh_token = str(zoho_payload.get("refresh_token") or "").strip()
    if not refresh_token:
        # Zoho rejected — surface their error code WITHOUT echoing the
        # client_secret. Common errors: invalid_code (60s TTL elapsed),
        # invalid_client (wrong secret), invalid_redirect_uri (mismatch
        # with the URI registered in the Zoho app).
        zoho_error = (
            str(zoho_payload.get("error") or "")
            or str(zoho_payload.get("error_description") or "")
            or "unknown"
        ).strip()
        _logger.warning(
            "aimentor_zoho_exchange_rejected",
            extra={
                "event_type": "aimentor_zoho_exchange_rejected",
                "tenant_id": "",
                "status": int(getattr(response, "status_code", 0) or 0),
                "route": "/api/v1/aimentor/integrations/zoho/exchange-code",
                "request_id": "",
                "integration_name": "zoho",
                "conversation_id": "",
                "booking_reference": "",
                "job_name": "",
                "job_id": "",
                "zoho_error": zoho_error,
            },
        )
        return _error_response(
            AppError(
                code="aimentor_zoho_exchange_failed",
                message=(
                    "Zoho rejected the exchange. Common causes: the auth "
                    "code already expired (60-second TTL), the redirect_uri "
                    "doesn't match what's registered in the Zoho app, or "
                    "the client credentials don't match. Re-run the consent "
                    "flow and try again immediately."
                ),
                status_code=400,
                details={"zoho_error": zoho_error},
            ),
            tenant_id=None,
            actor_context=None,
        )

    return _success_response(
        {
            "refresh_token": refresh_token,
            "access_token": str(zoho_payload.get("access_token") or "").strip()
            or None,
            "api_domain": str(zoho_payload.get("api_domain") or "").strip()
            or None,
            "expires_in": int(zoho_payload.get("expires_in") or 0) or None,
            "token_type": str(zoho_payload.get("token_type") or "").strip()
            or None,
        },
        tenant_id=None,
        actor_context=None,
    )


async def list_service_time_slots(service_id: str, request: Request):
    """Public endpoint — list open time slots for an AI Mentor service.

    Backed by ``service_time_slots`` (migration 036). Tenant-scoped to
    ai-mentor-doer so this never leaks slots from other partners. Filters:
    ``is_active = true``, ``booked_count < capacity``, and
    ``slot_start_at > now()`` so past slots disappear automatically.

    No auth required — this is the same scope as the public catalogue.
    """
    try:
        normalized_service = (service_id or "").strip()
        if not normalized_service:
            raise ValidationAppError(
                "service_id is required.",
                details={"service_id": ["required"]},
            )

        async with get_session(request.app.state.session_factory) as session:
            result = await session.execute(
                text(
                    """
                    select
                      sts.id::text as id,
                      sts.service_id,
                      sts.slot_start_at,
                      sts.slot_end_at,
                      sts.timezone,
                      sts.capacity,
                      sts.booked_count,
                      sts.label,
                      sts.zoho_meeting_url
                    from service_time_slots sts
                    where sts.tenant_id = (
                      select id from tenants where slug = 'ai-mentor-doer'
                    )
                      and sts.service_id = :service_id
                      and sts.is_active = true
                      and sts.booked_count < sts.capacity
                      and sts.slot_start_at > now()
                    order by sts.slot_start_at asc
                    limit 24
                    """
                ),
                {"service_id": normalized_service},
            )
            rows = result.mappings().all()

        slots = []
        for row in rows:
            record = dict(row)
            slot_start = record.get("slot_start_at")
            slot_end = record.get("slot_end_at")
            slots.append(
                {
                    "id": record.get("id"),
                    "service_id": record.get("service_id"),
                    "slot_start_at": (
                        slot_start.isoformat()
                        if hasattr(slot_start, "isoformat")
                        else slot_start
                    ),
                    "slot_end_at": (
                        slot_end.isoformat()
                        if hasattr(slot_end, "isoformat")
                        else slot_end
                    ),
                    "timezone": record.get("timezone"),
                    "capacity": int(record.get("capacity") or 0),
                    "booked_count": int(record.get("booked_count") or 0),
                    "seats_available": max(
                        0,
                        int(record.get("capacity") or 0)
                        - int(record.get("booked_count") or 0),
                    ),
                    "label": record.get("label"),
                    "zoho_meeting_url": record.get("zoho_meeting_url"),
                }
            )

        return _success_response(
            {"service_id": normalized_service, "slots": slots},
            tenant_id=None,
            actor_context=None,
        )
    except AppError as error:
        return _error_response(error, tenant_id=None, actor_context=None)


__all__ = [
    "_resolve_student_auth_secret",
    "_sign_student_session_token",
    "_verify_student_session_token",
    "_require_student_session",
    "StudentSessionVerifyError",
    "student_google_auth",
    "student_me",
    "student_logout",
    "student_locale_update",
    "list_service_time_slots",
    "reserve_service_time_slot",
    "SlotReservePayload",
    "exchange_zoho_oauth_code",
    "ExchangeZohoOAuthCodePayload",
]
