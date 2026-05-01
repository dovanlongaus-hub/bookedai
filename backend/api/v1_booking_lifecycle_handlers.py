"""Customer-facing booking lifecycle handlers (cancel / reschedule / status).

These endpoints sit in front of the lifecycle orchestrators built in
:mod:`service_layer.lifecycle_ops_service` and are deliberately thin: they
resolve the actor (student session > portal token > tenant admin), open a
DB session, call the orchestrator, and map the orchestrator's status string
to an HTTP status code.

Auth resolution order (first one that succeeds wins):

1. **Student session** — Bearer token signed by
   :func:`api.v1_ai_mentor_student_handlers._sign_student_session_token`.
   Used by aimentor.bookedai.au signed-in learners.
2. **Portal token** — opaque plaintext token presented as ``?token=`` query
   param or ``X-Portal-Token`` header (matching
   :func:`api.v1_tenant_handlers._extract_portal_token`). Verified via
   :class:`BookingIntentRepository.load_portal_access_token_record`.
3. **Tenant admin** — tenant session bearer token verified by
   :func:`api.v1_routes._resolve_tenant_request_context`.

If none of the three succeed we raise ``HTTPException(401)``.
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any

from fastapi import Header, HTTPException, Request
from pydantic import BaseModel, Field

from api.v1_ai_mentor_student_handlers import (
    StudentSessionVerifyError,
    _resolve_student_auth_secret,
    _verify_student_session_token,
)
from api.v1_routes import _resolve_tenant_request_context
from core.errors import AppError
from core.logging import get_logger
from core.portal_tokens import PortalTokenError, verify_portal_access_token
from db import get_session
from repositories.base import RepositoryContext
from repositories.booking_intent_repository import BookingIntentRepository
from service_layer.lifecycle_ops_service import (
    orchestrate_booking_cancelled,
    orchestrate_booking_rescheduled,
)
from service_layer.payment_lifecycle_service import get_booking_payment_status
from service_layer.tenant_app_service import _load_portal_booking_row


_logger = get_logger("bookedai.api.v1_booking_lifecycle_handlers")


# ---------------------------------------------------------------------------
# Pydantic payloads
# ---------------------------------------------------------------------------


class CancelPayload(BaseModel):
    """POST body for ``/booking/{booking_reference}/cancel``."""

    reason: str | None = Field(
        default=None,
        max_length=2000,
        description="Optional human-readable cancellation reason.",
    )
    token: str | None = Field(
        default=None,
        description=(
            "Optional portal access token. If the customer has the token "
            "in the body rather than the query string, accept it here."
        ),
    )


class ReschedulePayload(BaseModel):
    """PATCH body for ``/booking/{booking_reference}/reschedule``.

    ``new_start_at`` is REQUIRED and SHOULD include a timezone offset
    (``2026-05-12T14:00:00+10:00``). Naive datetimes are interpreted as
    UTC — we don't reject them outright because some browser clients send
    ISO strings without offsets, but timezone-aware is strongly preferred.
    """

    new_slot_id: str | None = Field(
        default=None,
        description="Chess academy only — id of the new service_time_slots row.",
    )
    new_start_at: datetime = Field(
        ..., description="ISO 8601 timestamp; timezone-aware preferred."
    )
    new_duration_minutes: int = Field(default=60, ge=15, le=240)
    new_timezone: str = Field(default="Australia/Sydney", max_length=64)
    customer_note: str | None = Field(default=None, max_length=2000)
    token: str | None = Field(default=None)


# ---------------------------------------------------------------------------
# Auth resolution
# ---------------------------------------------------------------------------


def _extract_bearer(authorization: str | None) -> str | None:
    if not authorization:
        return None
    raw = authorization.strip()
    if raw.lower().startswith("bearer "):
        return raw[7:].strip() or None
    return raw or None


def _try_student_session(
    request: Request, *, authorization: str | None
) -> tuple[str, str] | None:
    """Return (actor_id, email) when a student session token is valid."""
    token = _extract_bearer(authorization)
    if not token:
        return None
    secret = _resolve_student_auth_secret(request)
    try:
        payload = _verify_student_session_token(secret=secret, token=token)
    except StudentSessionVerifyError:
        return None
    student_id = str(payload.get("sub") or "").strip()
    email = str(payload.get("email") or "").strip()
    if not student_id:
        return None
    return student_id, email


def _extract_portal_token_value(
    request: Request, *, payload_token: str | None
) -> str | None:
    candidate = (
        payload_token
        or request.query_params.get("token")
        or request.headers.get("x-portal-token")
    )
    if not candidate:
        return None
    normalized = str(candidate).strip()
    return normalized or None


async def _try_portal_token(
    request: Request,
    *,
    booking_reference: str,
    payload_token: str | None,
) -> tuple[str, str] | None:
    """Return (actor_id, tenant_id) when a portal token validates against
    the booking_reference. ``actor_id`` is the booking_reference itself
    because portal tokens are scoped to a single booking and there is no
    separate "subject" identifier.
    """
    presented = _extract_portal_token_value(request, payload_token=payload_token)
    if not presented:
        return None

    normalized_reference = str(booking_reference or "").strip()
    if not normalized_reference:
        return None

    async with get_session(request.app.state.session_factory) as session:
        repository = BookingIntentRepository(RepositoryContext(session=session))
        record = await repository.load_portal_access_token_record(
            booking_reference=normalized_reference,
        )
        booking_row = await _load_portal_booking_row(
            session, booking_reference=normalized_reference
        )

    if record is None:
        return None
    stored_hash = str(record.get("portal_access_token_hash") or "").strip() or None
    if not stored_hash:
        return None

    expires_at = record.get("portal_access_token_expires_at")
    revoked_at = record.get("portal_access_token_revoked_at")

    try:
        valid = verify_portal_access_token(
            plaintext=presented,
            stored_hash=stored_hash,
            expires_at=expires_at,
            revoked_at=revoked_at,
        )
    except PortalTokenError:
        return None
    if not valid:
        return None

    tenant_id = str((booking_row or {}).get("tenant_id") or "").strip()
    return normalized_reference, tenant_id


async def _try_tenant_admin(
    request: Request, *, authorization: str | None
) -> tuple[str, str] | None:
    """Return (admin_email, tenant_id) when a tenant session is valid."""
    _tenant_ref, tenant_id, tenant_session, _membership = (
        await _resolve_tenant_request_context(request, authorization=authorization)
    )
    if not tenant_session or not tenant_id:
        return None
    admin_email = str(tenant_session.get("email") or "").strip()
    if not admin_email:
        return None
    return admin_email, tenant_id


async def _resolve_actor(
    request: Request,
    *,
    booking_reference: str,
    authorization: str | None,
    payload_token: str | None = None,
) -> dict[str, Any]:
    """Resolve the calling actor.

    Returns a dict with keys ``actor_type``, ``actor_id``, and optionally
    ``tenant_id`` (when known up-front from the auth — portal token + admin
    paths). Raises ``HTTPException(401)`` when no authentication mechanism
    succeeds.
    """
    student = _try_student_session(request, authorization=authorization)
    if student is not None:
        student_id, _email = student
        return {
            "actor_type": "student_session",
            "actor_id": student_id,
            "tenant_id": None,
        }

    portal = await _try_portal_token(
        request,
        booking_reference=booking_reference,
        payload_token=payload_token,
    )
    if portal is not None:
        token_subject, tenant_id = portal
        return {
            "actor_type": "portal_token",
            "actor_id": token_subject,
            "tenant_id": tenant_id or None,
        }

    admin = await _try_tenant_admin(request, authorization=authorization)
    if admin is not None:
        admin_email, tenant_id = admin
        return {
            "actor_type": "tenant_admin",
            "actor_id": admin_email,
            "tenant_id": tenant_id,
        }

    raise HTTPException(
        status_code=401,
        detail=(
            "Authentication required. Sign in as a student, present a portal "
            "access token, or authenticate as a tenant admin."
        ),
    )


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


async def _resolve_tenant_id_for_booking(
    request: Request,
    *,
    booking_reference: str,
    actor_tenant_id: str | None,
) -> str | None:
    """When the actor (student session) does not give us a tenant_id, look
    it up from the booking_intent row so the orchestrator has the right
    scope. Returns ``None`` when the booking does not exist (the caller
    will translate that into 404).
    """
    if actor_tenant_id:
        return actor_tenant_id
    async with get_session(request.app.state.session_factory) as session:
        booking_row = await _load_portal_booking_row(
            session, booking_reference=booking_reference
        )
    if not booking_row:
        return None
    return str(booking_row.get("tenant_id") or "").strip() or None


def _is_timezone_aware(value: datetime) -> bool:
    return value.tzinfo is not None and value.tzinfo.utcoffset(value) is not None


def _coerce_to_utc(value: datetime) -> datetime:
    if _is_timezone_aware(value):
        return value.astimezone(timezone.utc)
    return value.replace(tzinfo=timezone.utc)


def _start_at_utc_from_booking(booking_row: dict[str, Any]) -> datetime | None:
    """Parse requested_date + requested_time from the portal booking row
    into a tz-aware UTC datetime. Returns ``None`` if either field is
    missing or unparseable.
    """
    requested_date = booking_row.get("requested_date")
    requested_time = booking_row.get("requested_time")
    timezone_label = str(booking_row.get("timezone") or "Australia/Sydney").strip()
    if not requested_date or not requested_time:
        return None

    try:
        from zoneinfo import ZoneInfo

        if hasattr(requested_date, "year"):
            date_part = requested_date
        else:
            date_part = datetime.strptime(str(requested_date)[:10], "%Y-%m-%d").date()
        if hasattr(requested_time, "hour"):
            time_part = requested_time
        else:
            time_part = datetime.strptime(str(requested_time)[:5], "%H:%M").time()
        try:
            tz = ZoneInfo(timezone_label or "Australia/Sydney")
        except Exception:  # noqa: BLE001
            tz = ZoneInfo("Australia/Sydney")
        local = datetime.combine(date_part, time_part, tzinfo=tz)
        return local.astimezone(timezone.utc)
    except Exception:  # noqa: BLE001
        return None


# ---------------------------------------------------------------------------
# Handlers
# ---------------------------------------------------------------------------


async def cancel_booking(
    booking_reference: str,
    request: Request,
    payload: CancelPayload,
    authorization: str | None = Header(default=None),
):
    """Cancel a booking via the lifecycle orchestrator.

    Status mapping (orchestrator → HTTP):
      - ``cancelled``         → 200 ``{success: True, ...}``
      - ``already_cancelled`` → 200 ``{success: True, idempotent: True, ...}``
      - ``not_found``         → 404
      - other / unknown       → 502 (with the raw orchestrator dict for
                                debugging — these are server-side failures)
    """
    actor = await _resolve_actor(
        request,
        booking_reference=booking_reference,
        authorization=authorization,
        payload_token=payload.token,
    )

    tenant_id = await _resolve_tenant_id_for_booking(
        request,
        booking_reference=booking_reference,
        actor_tenant_id=actor.get("tenant_id"),
    )
    if not tenant_id:
        raise HTTPException(
            status_code=404,
            detail={
                "code": "booking_not_found",
                "booking_reference": booking_reference,
            },
        )

    async with get_session(request.app.state.session_factory) as session:
        try:
            result = await orchestrate_booking_cancelled(
                session,
                tenant_id=tenant_id,
                booking_reference=booking_reference,
                actor_type=str(actor["actor_type"]),
                actor_id=actor.get("actor_id"),
                channel="web",
                reason=payload.reason,
            )
            await session.commit()
        except AppError:
            raise
        except Exception as exc:  # noqa: BLE001
            _logger.warning(
                "booking_cancel_orchestrator_failed",
                extra={
                    "event_type": "booking_cancel_orchestrator_failed",
                    "tenant_id": tenant_id,
                    "booking_reference": booking_reference,
                    "actor_type": str(actor.get("actor_type")),
                },
                exc_info=exc,
            )
            raise HTTPException(
                status_code=502,
                detail={
                    "code": "booking_cancel_failed",
                    "booking_reference": booking_reference,
                },
            ) from exc

    status = str(result.get("status") or "").strip().lower()
    if status == "cancelled":
        return {"success": True, **result}
    if status == "already_cancelled":
        return {"success": True, "idempotent": True, **result}
    if status == "not_found":
        raise HTTPException(
            status_code=404,
            detail={
                "code": "booking_not_found",
                "booking_reference": booking_reference,
                "result": result,
            },
        )
    raise HTTPException(
        status_code=502,
        detail={
            "code": "booking_cancel_unexpected_status",
            "status": status,
            "result": result,
        },
    )


async def reschedule_booking(
    booking_reference: str,
    request: Request,
    payload: ReschedulePayload,
    authorization: str | None = Header(default=None),
):
    """Reschedule a booking via the lifecycle orchestrator.

    Validation:
      - ``new_start_at`` is coerced to UTC: timezone-aware values are
        normalised, naive values are interpreted as UTC.
      - ``new_start_at`` must be at least 2 hours in the future. Earlier
        than that → 422 (the operator-only path can override via the
        tenant admin app).

    Status mapping (orchestrator → HTTP):
      - ``rescheduled``       → 200
      - ``not_reschedulable`` → 409
      - ``not_found``         → 404
      - other / unknown       → 502
    """
    actor = await _resolve_actor(
        request,
        booking_reference=booking_reference,
        authorization=authorization,
        payload_token=payload.token,
    )

    tenant_id = await _resolve_tenant_id_for_booking(
        request,
        booking_reference=booking_reference,
        actor_tenant_id=actor.get("tenant_id"),
    )
    if not tenant_id:
        raise HTTPException(
            status_code=404,
            detail={
                "code": "booking_not_found",
                "booking_reference": booking_reference,
            },
        )

    new_start_utc = _coerce_to_utc(payload.new_start_at)
    now_utc = datetime.now(tz=timezone.utc)
    if new_start_utc <= now_utc + timedelta(hours=2):
        raise HTTPException(
            status_code=422,
            detail={
                "code": "reschedule_window_too_soon",
                "message": (
                    "New start time must be at least 2 hours in the future."
                ),
                "new_start_at_utc": new_start_utc.isoformat(),
            },
        )

    async with get_session(request.app.state.session_factory) as session:
        try:
            result = await orchestrate_booking_rescheduled(
                session,
                tenant_id=tenant_id,
                booking_reference=booking_reference,
                new_start_at=new_start_utc,
                actor_type=str(actor["actor_type"]),
                actor_id=actor.get("actor_id"),
                channel="web",
                new_slot_id=payload.new_slot_id,
                new_duration_minutes=payload.new_duration_minutes,
                new_timezone=payload.new_timezone,
            )
            await session.commit()
        except AppError:
            raise
        except Exception as exc:  # noqa: BLE001
            _logger.warning(
                "booking_reschedule_orchestrator_failed",
                extra={
                    "event_type": "booking_reschedule_orchestrator_failed",
                    "tenant_id": tenant_id,
                    "booking_reference": booking_reference,
                    "actor_type": str(actor.get("actor_type")),
                },
                exc_info=exc,
            )
            raise HTTPException(
                status_code=502,
                detail={
                    "code": "booking_reschedule_failed",
                    "booking_reference": booking_reference,
                },
            ) from exc

    status = str(result.get("status") or "").strip().lower()
    if status == "rescheduled":
        return {"success": True, **result}
    if status == "not_reschedulable":
        raise HTTPException(
            status_code=409,
            detail={
                "code": "booking_not_reschedulable",
                "booking_reference": booking_reference,
                "result": result,
            },
        )
    if status == "not_found":
        raise HTTPException(
            status_code=404,
            detail={
                "code": "booking_not_found",
                "booking_reference": booking_reference,
                "result": result,
            },
        )
    raise HTTPException(
        status_code=502,
        detail={
            "code": "booking_reschedule_unexpected_status",
            "status": status,
            "result": result,
        },
    )


async def get_booking_status(
    booking_reference: str,
    request: Request,
    authorization: str | None = Header(default=None),
):
    """Read-only booking lifecycle status + cancel/reschedule eligibility.

    Eligibility rules:
      - cancel:      status not in ('cancelled','completed') AND
                     start_at_utc > now_utc + 2 hours
      - reschedule:  status in ('paid','confirmed','pending') AND
                     start_at_utc > now_utc + 24 hours
    """
    actor = await _resolve_actor(
        request,
        booking_reference=booking_reference,
        authorization=authorization,
        payload_token=None,
    )

    async with get_session(request.app.state.session_factory) as session:
        booking_row = await _load_portal_booking_row(
            session, booking_reference=booking_reference
        )
        if not booking_row:
            raise HTTPException(
                status_code=404,
                detail={
                    "code": "booking_not_found",
                    "booking_reference": booking_reference,
                },
            )
        booking_dict: dict[str, Any] = dict(booking_row)
        tenant_id = str(booking_dict.get("tenant_id") or "").strip() or None

        # Best-effort cross-checks. If the actor knows their tenant (admin
        # / portal-token paths) and it doesn't match the booking row,
        # surface 404 rather than leak booking data across tenants.
        actor_tenant = actor.get("tenant_id")
        if actor_tenant and tenant_id and str(actor_tenant) != tenant_id:
            raise HTTPException(
                status_code=404,
                detail={
                    "code": "booking_not_found",
                    "booking_reference": booking_reference,
                },
            )

        payment_status_payload = await get_booking_payment_status(
            session,
            tenant_id=tenant_id,
            booking_reference=booking_reference,
        )

        repository = BookingIntentRepository(
            RepositoryContext(session=session, tenant_id=tenant_id or "")
        )
        meeting_metadata = await repository.fetch_meeting_metadata(
            booking_reference=booking_reference,
        )

    status = str(booking_dict.get("status") or "").strip().lower() or "unknown"
    payment_state = str(payment_status_payload.get("payment_status") or "unknown")

    metadata_json = booking_dict.get("metadata_json") or {}
    if not isinstance(metadata_json, dict):
        metadata_json = {}
    zoho_meeting = metadata_json.get("zoho_meeting") or {}
    if not isinstance(zoho_meeting, dict):
        zoho_meeting = {}
    if (meeting_metadata or {}).get("metadata_json"):
        zm = (meeting_metadata or {}).get("metadata_json", {}) or {}
        if isinstance(zm, dict) and zm.get("zoho_meeting"):
            zoho_meeting = zm.get("zoho_meeting") or zoho_meeting

    has_meeting = bool(
        zoho_meeting.get("meeting_url")
        or zoho_meeting.get("calendar_event_id")
        or zoho_meeting.get("meeting_id")
    )
    if status == "cancelled":
        meeting_state = "cancelled"
    elif has_meeting:
        meeting_state = "provisioned"
    else:
        meeting_state = "unprovisioned"

    start_at_utc = _start_at_utc_from_booking(booking_dict)
    now_utc = datetime.now(tz=timezone.utc)

    cancel_eligibility = bool(
        status not in {"cancelled", "completed"}
        and start_at_utc is not None
        and start_at_utc > now_utc + timedelta(hours=2)
    )
    reschedule_eligibility = bool(
        status in {"paid", "confirmed", "pending"}
        and start_at_utc is not None
        and start_at_utc > now_utc + timedelta(hours=24)
    )

    return {
        "booking_reference": booking_reference,
        "status": status,
        "payment_state": payment_state,
        "meeting_state": meeting_state,
        "start_at_utc": start_at_utc.isoformat() if start_at_utc else None,
        "cancel_eligibility": cancel_eligibility,
        "reschedule_eligibility": reschedule_eligibility,
    }


__all__ = [
    "CancelPayload",
    "ReschedulePayload",
    "cancel_booking",
    "reschedule_booking",
    "get_booking_status",
]
