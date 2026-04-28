"""Student account portal handlers for chess.bookedai.au.

The chess subdomain treats the parent / student as a separate identity from
the tenant admin (GM Mai Hung) and the platform admin. We let parents sign in
with Google so they can view their bookings and see lesson-progress notes
without needing to remember a password.

Tokens are HMAC-signed JWT-style strings (header.payload.signature), built
with stdlib (``hmac`` + ``base64`` + ``json``) so this module does not pull in
PyJWT. The signing secret is read from ``STUDENT_AUTH_SECRET`` and falls back
to the existing ``SESSION_SIGNING_SECRET`` (a.k.a. SECRET_KEY) so a fresh
deploy still gets a working secret if the operator has not added the new env
var yet.
"""

from __future__ import annotations

import base64
import hashlib
import hmac
import json
import os
import time
import uuid
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


_logger = get_logger("bookedai.api.v1_chess_student_handlers")


_STUDENT_TOKEN_TTL_SECONDS = 30 * 24 * 60 * 60  # 30 days


def _resolve_student_auth_secret(request: Request) -> str:
    """Pick the HMAC secret used to sign student session tokens.

    Order of preference:
    1. ``STUDENT_AUTH_SECRET`` env var (preferred)
    2. ``SESSION_SIGNING_SECRET`` (existing platform-wide secret, exposed as
       ``settings.session_signing_secret``)
    3. The literal string ``bookedai-student-dev`` as a last resort so local
       dev still works without configuration. This is intentionally weak so
       any production deploy without proper env vars will be obvious in
       smoke tests.
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
        "kind": "chess_student",
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
    if payload.get("kind") != "chess_student":
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
            message="Sign in with Google before accessing student account data.",
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


class StudentLogoutPayload(BaseModel):
    pass


# --- repository helpers ----------------------------------------------------


async def _upsert_chess_student_user(
    session,
    *,
    google_sub: str,
    email: str,
    full_name: str | None,
    avatar_url: str | None,
) -> dict[str, object]:
    """Look up a chess_student_users row by google_sub or create one."""
    result = await session.execute(
        text(
            """
            insert into chess_student_users (
              google_sub, email, full_name, avatar_url, last_login_at
            )
            values (
              :google_sub, :email, :full_name, :avatar_url, now()
            )
            on conflict (google_sub) do update set
              email = excluded.email,
              full_name = coalesce(excluded.full_name, chess_student_users.full_name),
              avatar_url = coalesce(excluded.avatar_url, chess_student_users.avatar_url),
              updated_at = now(),
              last_login_at = now()
            returning
              id::text as id,
              google_sub,
              email,
              full_name,
              avatar_url,
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
        },
    )
    row = result.mappings().first()
    if not row:
        return {}
    return dict(row)


async def _load_chess_student_by_id(session, *, student_id: str) -> dict[str, object] | None:
    normalized_id = (student_id or "").strip()
    if not normalized_id:
        return None
    result = await session.execute(
        text(
            """
            select id::text as id, google_sub, email, full_name, avatar_url
            from chess_student_users
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
            metadata.get("payment_status")
            if isinstance(metadata, dict)
            else None
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
              csp.session_date,
              csp.level,
              csp.attendance,
              csp.notes,
              csp.next_focus
            from chess_student_progress csp
            join contacts c on c.id = csp.contact_id
            where lower(coalesce(c.email, '')) = :email
            order by csp.session_date desc
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
                "level": record.get("level"),
                "attendance": record.get("attendance"),
                "notes": record.get("notes"),
                "next_focus": record.get("next_focus"),
            }
        )
    return rows


# --- handlers --------------------------------------------------------------


async def student_google_auth(request: Request, payload: StudentGoogleAuthPayload):
    """Verify a Google id_token and open a chess student session."""
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
            student = await _upsert_chess_student_user(
                session,
                google_sub=google_sub,
                email=email,
                full_name=identity.get("name") or None,
                avatar_url=identity.get("picture_url") or None,
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
            student = await _load_chess_student_by_id(session, student_id=student_id)
            if not student:
                raise AppError(
                    code="student_not_found",
                    message="The signed-in student account could not be located.",
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


__all__ = [
    "_resolve_student_auth_secret",
    "_sign_student_session_token",
    "_verify_student_session_token",
    "_require_student_session",
    "StudentSessionVerifyError",
    "student_google_auth",
    "student_me",
    "student_logout",
]
