"""Tenant-only handlers for ad-hoc Zoho Meeting URL regeneration.

GM Mai Hung's tenant workspace occasionally needs to re-issue the join link
for a confirmed booking — for example when the original Zoho-generated URL
has expired, or when the parent reports the link no longer works. This
handler re-triggers Zoho Calendar event creation, persists the new
``zoho_meeting`` metadata via :class:`BookingIntentRepository`, and returns
the refreshed ``meeting_url`` + ``calendar_event_url`` so the operator can
share it immediately.

Auth: tenant admin via the existing tenant session middleware
(:func:`_resolve_tenant_request_context`). The booking_intent must belong to
the calling tenant.

Fallback: when Zoho is not configured (no UID + no OAuth credentials), the
endpoint returns ``503`` with a stable error code so the frontend can display
a "configure Zoho first" hint instead of pretending it succeeded. We do NOT
fall back to ``tenant_settings.default_meeting_url`` here because the
purpose of this endpoint is to re-issue a Zoho Meeting; the static fallback
is for read-only surfaces (email, portal).
"""

from __future__ import annotations

from datetime import UTC, datetime

from fastapi import Header, Request
from pydantic import BaseModel, Field

from api.v1_routes import (
    ActorContextPayload,
    _error_response,
    _resolve_tenant_request_context,
    _success_response,
)
from core.errors import AppError, ValidationAppError
from core.logging import get_logger
from db import get_session
from repositories.base import RepositoryContext
from repositories.booking_intent_repository import BookingIntentRepository
from service_layer.calls_scheduling import (
    create_zoho_meeting_for_booking,
    zoho_calendar_configured,
)


_logger = get_logger("bookedai.api.v1_chess_meeting_handlers")


class RegenerateMeetingPayload(BaseModel):
    duration_minutes: int | None = Field(
        default=None,
        ge=15,
        le=240,
        description=(
            "Optional override for the meeting duration in minutes. Defaults "
            "to 45 when neither the payload nor the booking provides a value."
        ),
    )


def _zoho_unconfigured_response(*, tenant_id: str | None) -> object:
    return _error_response(
        AppError(
            code="zoho_calendar_unconfigured",
            message=(
                "Zoho Calendar is not configured for this environment, so a new "
                "meeting URL cannot be generated."
            ),
            status_code=503,
        ),
        tenant_id=tenant_id,
        actor_context=None,
    )


async def regenerate_chess_booking_meeting(
    booking_intent_id: str,
    request: Request,
    payload: RegenerateMeetingPayload,
    authorization: str | None = Header(default=None),
):
    """Re-trigger Zoho Calendar event creation for a chess booking_intent.

    Path parameter is named ``booking_intent_id`` for the URL but accepts
    either the booking_intent UUID or the booking_reference — the lookup
    falls back to ``booking_reference`` when the UUID cast fails. Returns
    ``404`` when the booking does not belong to the calling tenant, ``503``
    when Zoho is not configured, and ``200`` with the refreshed URLs on
    success.
    """
    tenant_ref, tenant_id, tenant_session, _membership = await _resolve_tenant_request_context(
        request,
        authorization=authorization,
    )
    if not tenant_session:
        return _error_response(
            AppError(
                code="tenant_auth_required",
                message="Sign in with an active tenant account before regenerating meeting links.",
                status_code=401,
                details={"tenant_ref": tenant_ref, "tenant_id": tenant_id},
            ),
            tenant_id=tenant_id,
            actor_context=None,
        )
    if not tenant_id:
        return _error_response(
            AppError(
                code="tenant_not_found",
                message="The requested tenant could not be resolved.",
                status_code=404,
                details={"tenant_ref": tenant_ref},
            ),
            tenant_id=None,
            actor_context=None,
        )

    normalized_lookup = (booking_intent_id or "").strip()
    if not normalized_lookup:
        return _error_response(
            ValidationAppError(
                "booking_intent_id is required to regenerate a meeting URL.",
                details={"booking_intent_id": ["required"]},
            ),
            tenant_id=tenant_id,
            actor_context=None,
        )

    settings = getattr(request.app.state, "settings", None)
    if not zoho_calendar_configured(settings):
        return _zoho_unconfigured_response(tenant_id=tenant_id)

    async with get_session(request.app.state.session_factory) as session:
        booking_repository = BookingIntentRepository(
            RepositoryContext(session=session, tenant_id=tenant_id)
        )
        # Try by booking_reference first (the typical chess case where
        # the frontend has the BAI- / v1- reference); the helper returns
        # ``None`` when the reference does not match any row.
        booking = await booking_repository.fetch_meeting_metadata(
            booking_reference=normalized_lookup,
        )
        if not booking:
            # Fallback: also accept the raw booking_intent UUID by querying
            # via the SQL text helper. We re-use a small inline query here
            # rather than adding a new repository method since this is the
            # only call site that needs it today.
            from sqlalchemy import text

            uuid_lookup = await session.execute(
                text(
                    """
                    select booking_reference
                    from booking_intents
                    where id::text = :booking_intent_id
                    limit 1
                    """
                ),
                {"booking_intent_id": normalized_lookup},
            )
            mapped_reference = uuid_lookup.scalar_one_or_none()
            if mapped_reference:
                booking = await booking_repository.fetch_meeting_metadata(
                    booking_reference=str(mapped_reference),
                )

        if not booking:
            return _error_response(
                AppError(
                    code="booking_intent_not_found",
                    message="The requested booking_intent could not be found.",
                    status_code=404,
                    details={"booking_intent_id": normalized_lookup},
                ),
                tenant_id=tenant_id,
                actor_context=None,
            )

        booking_tenant_id = str(booking.get("tenant_id") or "").strip()
        if booking_tenant_id and booking_tenant_id != tenant_id:
            return _error_response(
                AppError(
                    code="booking_intent_tenant_mismatch",
                    message="The booking_intent does not belong to the calling tenant.",
                    status_code=404,
                    details={"booking_intent_id": normalized_lookup},
                ),
                tenant_id=tenant_id,
                actor_context=None,
            )

        customer_email = str(booking.get("customer_email") or "").strip().lower()
        requested_date = booking.get("requested_date")
        requested_time = booking.get("requested_time")
        timezone_name = str(booking.get("timezone") or "").strip()
        if not customer_email:
            return _error_response(
                AppError(
                    code="booking_intent_missing_email",
                    message="The booking_intent has no customer email — cannot invite an attendee.",
                    status_code=409,
                    details={"booking_intent_id": normalized_lookup},
                ),
                tenant_id=tenant_id,
                actor_context=None,
            )
        if not (requested_date and requested_time and timezone_name):
            return _error_response(
                AppError(
                    code="booking_intent_missing_schedule",
                    message=(
                        "The booking_intent has no requested date/time/timezone — "
                        "schedule the booking before regenerating a meeting link."
                    ),
                    status_code=409,
                    details={"booking_intent_id": normalized_lookup},
                ),
                tenant_id=tenant_id,
                actor_context=None,
            )

        try:
            parsed_date = (
                requested_date
                if hasattr(requested_date, "year")
                else datetime.strptime(str(requested_date)[:10], "%Y-%m-%d").date()
            )
            parsed_time = (
                requested_time
                if hasattr(requested_time, "hour")
                else datetime.strptime(str(requested_time)[:5], "%H:%M").time()
            )
        except ValueError as exc:
            return _error_response(
                AppError(
                    code="booking_intent_schedule_invalid",
                    message=f"Booking schedule could not be parsed: {exc}",
                    status_code=409,
                    details={"booking_intent_id": normalized_lookup},
                ),
                tenant_id=tenant_id,
                actor_context=None,
            )

        duration_minutes = int(payload.duration_minutes or 45)
        booking_reference = str(booking.get("booking_reference") or "").strip()
        try:
            meeting_url, calendar_event_url = await create_zoho_meeting_for_booking(
                settings=settings,
                booking_reference=booking_reference,
                service_name=str(booking.get("service_name") or "BookedAI session"),
                customer_name=str(booking.get("customer_name") or ""),
                customer_email=customer_email,
                requested_date=parsed_date,
                requested_time=parsed_time,
                timezone_name=timezone_name,
                duration_minutes=duration_minutes,
                notes=None,
            )
        except Exception as exc:  # noqa: BLE001
            _logger.warning(
                "zoho_meeting_regenerate_failed",
                extra={
                    "event_type": "zoho_meeting_regenerate_failed",
                    "tenant_id": tenant_id,
                    "booking_reference": booking_reference,
                    "booking_intent_id": normalized_lookup,
                },
                exc_info=exc,
            )
            return _error_response(
                AppError(
                    code="zoho_meeting_regenerate_failed",
                    message="Zoho Calendar refused the regenerate request. Try again shortly.",
                    status_code=502,
                    details={"booking_intent_id": normalized_lookup},
                ),
                tenant_id=tenant_id,
                actor_context=None,
            )

        if not meeting_url and not calendar_event_url:
            # Zoho accepted the call but returned an empty event, e.g. when
            # the calendar UID is missing the conferencing capability.
            return _error_response(
                AppError(
                    code="zoho_meeting_regenerate_empty",
                    message=(
                        "Zoho Calendar returned an event without a meeting URL. "
                        "Confirm the calendar UID has Zoho Meeting conferencing enabled."
                    ),
                    status_code=502,
                    details={"booking_intent_id": normalized_lookup},
                ),
                tenant_id=tenant_id,
                actor_context=None,
            )

        await booking_repository.update_zoho_meeting_metadata(
            booking_reference=booking_reference,
            meeting_url=meeting_url,
            calendar_event_url=calendar_event_url,
            scheduled_at=datetime.now(tz=UTC),
            extra={"regenerated_by_email": str(tenant_session.get("email") or "") or None},
        )
        await session.commit()

    return _success_response(
        {
            "booking_intent_id": normalized_lookup,
            "booking_reference": booking_reference,
            "meeting_url": meeting_url,
            "calendar_event_url": calendar_event_url,
        },
        tenant_id=tenant_id,
        actor_context=ActorContextPayload(
            channel="tenant_app",
            tenant_id=tenant_id,
            role="tenant_admin",
            deployment_mode="standalone_app",
        ),
    )


__all__ = [
    "RegenerateMeetingPayload",
    "regenerate_chess_booking_meeting",
]
