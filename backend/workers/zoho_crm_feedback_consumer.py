"""Outbox consumer that pushes booking feedback into Zoho CRM as a Note.

Wave 5-D enqueues a ``booking_feedback.recorded`` outbox event whenever a
customer submits feedback via ``POST /api/v1/booking/{ref}/feedback``. This
module is the consumer that turns that event into a Zoho contact Note so
sales/ops can see the rating + comment alongside the rest of the contact
timeline.

Retry semantics: the function raises on transient failures (HTTP 5xx,
network errors, missing credentials). The shared outbox dispatcher in
``workers/outbox.py`` then increments ``attempt_count`` and flips the row
to ``failed`` so the next dispatcher tick re-runs it with exponential
back-off (the back-off curve lives in the outbox repository — this consumer
just signals retryability via raised exception vs. clean return).

Skips (mark as processed without raising):
    * Tenant has no Zoho credentials configured.
    * Booking can't be located for the supplied reference.
    * Contact email/phone missing entirely.
    * Zoho contact lookup returns no match (we don't create orphan notes).

Failures (raise so outbox marks failed + retries):
    * Zoho returns HTTP 5xx during contact lookup or note creation.
    * Network/transport error.
"""

from __future__ import annotations

from typing import Any

import httpx

from config import get_settings
from core.logging import get_logger
from integrations.zoho_crm.adapter import ZohoCrmAdapter
from repositories.base import RepositoryContext
from repositories.booking_intent_repository import BookingIntentRepository
from workers.outbox import OutboxEvent

_logger = get_logger("bookedai.workers.zoho_crm_feedback_consumer")

FEEDBACK_EVENT_TYPE = "booking_feedback.recorded"


def _format_note_subject(*, rating: int, booking_reference: str) -> str:
    return f"BookedAI feedback (rating {rating}/5) for booking {booking_reference}"


def _format_note_body(payload: dict[str, Any]) -> str:
    rating = payload.get("rating")
    would_recommend = payload.get("would_recommend")
    comment = (str(payload.get("comment") or "")).strip() or "(none)"
    channel = (str(payload.get("channel") or "")).strip() or "(unspecified)"
    submitted_at = (str(payload.get("submitted_at") or "")).strip() or "(timestamp unavailable)"
    if isinstance(would_recommend, bool):
        recommend_label = "yes" if would_recommend else "no"
    elif would_recommend is None:
        recommend_label = "(not provided)"
    else:
        recommend_label = str(would_recommend)
    return (
        f"Rating: {rating}/5\n"
        f"Would recommend: {recommend_label}\n"
        f"Comment: {comment}\n"
        f"Channel: {channel}\n"
        f"Submitted: {submitted_at}"
    )


async def handle_booking_feedback_recorded(
    session,
    event: OutboxEvent,
    *,
    adapter: ZohoCrmAdapter | None = None,
) -> str:
    """Dispatch a ``booking_feedback.recorded`` outbox event to Zoho CRM.

    Returns one of ``"pushed"``, ``"skipped:provider_unconfigured"``,
    ``"skipped:booking_not_found"``, ``"skipped:no_contact_method"``, or
    ``"skipped:zoho_contact_not_found"``. Raises on transient errors so
    the outbox dispatcher can retry with back-off.
    """
    settings = get_settings()
    crm = adapter or ZohoCrmAdapter()
    if not crm.configured(settings):
        _logger.info(
            "zoho_feedback_skipped_provider_unconfigured",
            extra={
                "event_type": "zoho_feedback_skipped_provider_unconfigured",
                "tenant_id": event.tenant_id or "",
                "status": 0,
                "route": "worker:zoho_crm_feedback_consumer",
                "request_id": "",
                "integration_name": "zoho_crm",
                "conversation_id": "",
                "booking_reference": str(event.payload.get("booking_reference") or ""),
                "job_name": "zoho_crm_feedback_consumer",
                "job_id": "",
            },
        )
        return "skipped:provider_unconfigured"

    payload = event.payload or {}
    booking_reference = str(payload.get("booking_reference") or "").strip()
    rating = int(payload.get("rating") or 0)
    if not booking_reference or rating <= 0:
        # Defensive — a malformed payload is permanently broken; let the
        # outbox mark it processed so we don't pile up retries forever.
        _logger.warning(
            "zoho_feedback_payload_invalid",
            extra={
                "event_type": "zoho_feedback_payload_invalid",
                "tenant_id": event.tenant_id or "",
                "status": 0,
                "route": "worker:zoho_crm_feedback_consumer",
                "request_id": "",
                "integration_name": "zoho_crm",
                "conversation_id": "",
                "booking_reference": booking_reference,
                "job_name": "zoho_crm_feedback_consumer",
                "job_id": "",
            },
        )
        return "skipped:invalid_payload"

    booking_repository = BookingIntentRepository(
        RepositoryContext(session=session, tenant_id=event.tenant_id)
    )
    booking_row = await booking_repository.fetch_booking_with_contact(
        booking_reference=booking_reference,
    )
    if not booking_row:
        _logger.warning(
            "zoho_feedback_booking_not_found",
            extra={
                "event_type": "zoho_feedback_booking_not_found",
                "tenant_id": event.tenant_id or "",
                "status": 0,
                "route": "worker:zoho_crm_feedback_consumer",
                "request_id": "",
                "integration_name": "zoho_crm",
                "conversation_id": "",
                "booking_reference": booking_reference,
                "job_name": "zoho_crm_feedback_consumer",
                "job_id": "",
            },
        )
        return "skipped:booking_not_found"

    contact_email = str(booking_row.get("customer_email") or "").strip().lower()
    contact_phone = str(booking_row.get("customer_phone") or "").strip()
    if not contact_email and not contact_phone:
        return "skipped:no_contact_method"

    if contact_email:
        contact_record = await crm.find_contact_by_email(settings, email=contact_email)
    else:
        contact_record = None
    if not contact_record:
        return "skipped:zoho_contact_not_found"

    contact_id = str(contact_record.get("id") or "").strip()
    if not contact_id:
        return "skipped:zoho_contact_not_found"

    note_payload = {
        **payload,
        "comment": payload.get("comment"),
        "submitted_at": payload.get("submitted_at"),
    }
    title = _format_note_subject(rating=rating, booking_reference=booking_reference)
    body = _format_note_body(note_payload)

    try:
        result = await crm.create_note(
            settings,
            parent_id=contact_id,
            parent_module=settings.zoho_crm_default_contact_module.strip() or "Contacts",
            title=title,
            content=body,
        )
    except httpx.HTTPStatusError as error:
        # Re-raise so the outbox dispatcher records it as a failed event
        # and retries with exponential back-off. Log first so ops have an
        # auditable trail of which booking ref triggered the failure.
        status_code = error.response.status_code if error.response is not None else 0
        _logger.warning(
            "zoho_feedback_create_note_failed",
            extra={
                "event_type": "zoho_feedback_create_note_failed",
                "tenant_id": event.tenant_id or "",
                "status": status_code,
                "route": "worker:zoho_crm_feedback_consumer",
                "request_id": "",
                "integration_name": "zoho_crm",
                "conversation_id": "",
                "booking_reference": booking_reference,
                "job_name": "zoho_crm_feedback_consumer",
                "job_id": "",
            },
            exc_info=error,
        )
        raise

    _logger.info(
        "zoho_feedback_pushed",
        extra={
            "event_type": "zoho_feedback_pushed",
            "tenant_id": event.tenant_id or "",
            "status": 0,
            "route": "worker:zoho_crm_feedback_consumer",
            "request_id": "",
            "integration_name": "zoho_crm",
            "conversation_id": "",
            "booking_reference": booking_reference,
            "job_name": "zoho_crm_feedback_consumer",
            "job_id": str(result.get("external_id") or ""),
        },
    )
    return "pushed"


__all__ = [
    "FEEDBACK_EVENT_TYPE",
    "handle_booking_feedback_recorded",
]
