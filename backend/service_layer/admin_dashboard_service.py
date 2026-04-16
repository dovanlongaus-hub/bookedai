from __future__ import annotations

from fastapi import HTTPException

from core.feature_flags import is_flag_enabled
from repositories.base import RepositoryContext
from repositories.tenant_repository import TenantRepository
from repositories.base import RepositoryContext
from repositories.conversation_repository import ConversationRepository
from service_layer.admin_booking_shadow_service import build_admin_booking_shadow_summary
from service_layer.admin_presenters import (
    build_booking_record,
    build_timeline_event,
    filter_booking_records,
    merge_booking_records,
)


async def get_admin_bookings_view_state(session) -> bool:
    tenant_id = await TenantRepository(RepositoryContext(session=session)).get_default_tenant_id()
    return await is_flag_enabled(
        "new_admin_bookings_view",
        session=session,
        tenant_id=tenant_id,
    )


async def build_admin_overview_payload(session) -> tuple[dict[str, object], bool]:
    conversation_repository = ConversationRepository(RepositoryContext(session=session))
    bookings_view_enabled = await get_admin_bookings_view_state(session)
    booking_events = await conversation_repository.list_booking_feed_events()
    recent_events = await conversation_repository.list_recent_events(limit=8)
    total_callbacks = await conversation_repository.count_events_by_type("booking_callback")

    all_bookings = merge_booking_records(booking_events)
    total_bookings = len(all_bookings)
    pending_email = sum(
        1 for item in all_bookings if item.get("email_status") == "pending_manual_followup"
    )
    ready_for_checkout = sum(
        1 for item in all_bookings if item.get("payment_status") == "stripe_checkout_ready"
    )

    return (
        {
            "status": "ok",
            "metrics": [
                {"label": "Bookings captured", "value": str(total_bookings or 0), "tone": "info"},
                {
                    "label": "Stripe-ready checkouts",
                    "value": str(ready_for_checkout or 0),
                    "tone": "success",
                },
                {
                    "label": "Pending email follow-up",
                    "value": str(pending_email or 0),
                    "tone": "warning",
                },
                {
                    "label": "n8n callbacks logged",
                    "value": str(total_callbacks or 0),
                    "tone": "neutral",
                },
            ],
            "recent_bookings": all_bookings[:8],
            "recent_events": [build_timeline_event(item) for item in recent_events],
        },
        bookings_view_enabled,
    )


async def build_admin_bookings_payload(
    session,
    *,
    limit: int,
    offset: int,
    query: str | None = None,
    industry: str | None = None,
    payment_status: str | None = None,
    email_status: str | None = None,
    workflow_status: str | None = None,
    date_from: str | None = None,
    date_to: str | None = None,
) -> tuple[dict[str, object], bool]:
    conversation_repository = ConversationRepository(RepositoryContext(session=session))
    bookings_view_enabled = await get_admin_bookings_view_state(session)
    events = await conversation_repository.list_booking_feed_events()

    records = filter_booking_records(
        merge_booking_records(events),
        query=query,
        industry=industry,
        payment_status=payment_status,
        email_status=email_status,
        workflow_status=workflow_status,
        date_from=date_from,
        date_to=date_to,
    )
    total = len(records)
    items = records[offset : offset + limit]

    return (
        {
            "status": "ok",
            "total": total or 0,
            "items": items,
        },
        bookings_view_enabled,
    )


async def build_admin_bookings_shadow_summary(
    session,
    *,
    legacy_records: list[dict[str, object | None]],
    limit: int = 100,
) -> dict[str, int | str]:
    tenant_id = await TenantRepository(RepositoryContext(session=session)).get_default_tenant_id()
    shadow_enabled = await is_flag_enabled(
        "admin_booking_read_shadow_compare",
        session=session,
        tenant_id=tenant_id,
    )
    if not shadow_enabled:
        return {
            "status": "disabled",
            "matched_count": 0,
            "mismatch_count": 0,
            "missing_count": 0,
        }

    return await build_admin_booking_shadow_summary(
        session,
        tenant_id=tenant_id,
        legacy_records=legacy_records,
        limit=limit,
    )


async def build_admin_booking_detail_payload(
    session,
    *,
    booking_reference: str,
) -> dict[str, object]:
    conversation_repository = ConversationRepository(RepositoryContext(session=session))
    events = await conversation_repository.list_events_by_conversation_id(booking_reference)
    if not events:
        raise LookupError("Booking was not found")

    primary = next((item for item in events if item.event_type == "booking_session_created"), events[0])
    return {
        "status": "ok",
        "booking": build_booking_record(primary),
        "events": [build_timeline_event(item) for item in events],
    }


async def send_admin_booking_confirmation_email(
    session,
    *,
    booking_reference: str,
    note: str | None,
    email_service,
    booking_business_email: str,
) -> dict[str, str]:
    conversation_repository = ConversationRepository(RepositoryContext(session=session))
    events = await conversation_repository.list_events_by_conversation_id(booking_reference)
    if not events:
        raise LookupError("Booking was not found")

    booking = merge_booking_records(events)[0]
    recipient = str(booking.get("customer_email") or "").strip()
    if not recipient:
        raise ValueError("Booking does not include a customer email")

    lines = [
        f"Hello {booking.get('customer_name') or 'there'},",
        "",
        "This is your manual booking confirmation from BookedAI.",
        f"Booking reference: {booking_reference}",
        f"Service: {booking.get('service_name') or 'Not specified'}",
        f"Requested date: {booking.get('requested_date') or 'Not specified'}",
        f"Requested time: {booking.get('requested_time') or 'Not specified'}",
        f"Timezone: {booking.get('timezone') or 'Australia/Sydney'}",
    ]
    if booking.get("payment_url"):
        lines.extend(["", f"Checkout link: {booking.get('payment_url')}"])
    if note:
        lines.extend(["", "Additional note:", note.strip()])

    business_recipient = (
        str(booking.get("business_email") or "").strip().lower() or booking_business_email
    )
    cc_recipients = [
        email
        for email in [business_recipient, booking_business_email]
        if email and email.lower() != recipient.lower()
    ]
    lines.extend(["", f"Reply to {business_recipient} if you need help."])

    try:
        await email_service.send_email(
            to=[recipient],
            cc=cc_recipients,
            subject=f"BookedAI booking confirmation {booking_reference}",
            text="\n".join(lines),
        )
    except ValueError as exc:
        raise ValueError(str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"SMTP send failed: {exc}") from exc

    return {"status": "sent", "message": "Confirmation email accepted by SMTP server"}
