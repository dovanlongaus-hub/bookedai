from __future__ import annotations

from datetime import UTC, datetime, timedelta
from typing import Any
from uuid import uuid4

import httpx
from fastapi import HTTPException

from config import Settings
from db import get_session
from repositories.base import RepositoryContext
from repositories.conversation_repository import ConversationRepository
from schemas import DemoBookingSyncResponse, DemoBriefRequest, DemoBriefResponse, TawkMessage
from service_layer.email_service import EmailService
from service_layer.event_store import store_event
from services import PricingService


def _normalize_text(value: Any) -> str:
    return str(value or "").strip()


def _build_demo_brief_email_lines(
    *,
    brief_reference: str,
    payload: DemoBriefRequest,
    settings: Settings,
    notes: str,
) -> tuple[list[str], list[str]]:
    internal_lines = [
        "A new Bookedai.au demo brief was submitted from the website.",
        "",
        f"Reference: {brief_reference}",
        f"Name: {payload.customer_name}",
        f"Email: {payload.customer_email}",
        f"Phone: {payload.customer_phone or 'Not provided'}",
        f"Business: {payload.business_name}",
        f"Business type: {payload.business_type}",
        f"Source section: {payload.source_section or 'Not provided'}",
        f"Source CTA: {payload.source_cta or 'Not provided'}",
        "",
        "Notes:",
        notes or "No additional notes provided.",
        "",
        "Booking page:",
        f"{settings.public_app_url.rstrip('/')}/#demo",
    ]
    customer_lines = [
        f"Hello {payload.customer_name},",
        "",
        "Thanks for sharing your demo brief with Bookedai.au.",
        "You can now choose the most suitable consultation time in the live booking calendar on our website.",
        "",
        f"Reference: {brief_reference}",
        f"Business: {payload.business_name}",
        f"Business type: {payload.business_type}",
        "",
        "Notes we received:",
        notes or "No additional notes provided.",
        "",
        "Bookedai.au team",
    ]
    return internal_lines, customer_lines


def _extract_preferred_start(iso_start_time: str) -> tuple[str | None, str | None]:
    if not iso_start_time:
        return None, None
    try:
        parsed_start = datetime.fromisoformat(iso_start_time)
        return parsed_start.date().isoformat(), parsed_start.strftime("%H:%M")
    except ValueError:
        return None, None


def _build_pending_sync_response(
    *,
    normalized_reference: str,
    sender_name: str,
    sender_email: str,
    business_name: str | None,
    business_type: str | None,
    confirmation_message: str,
) -> DemoBookingSyncResponse:
    return DemoBookingSyncResponse(
        status="pending",
        brief_reference=normalized_reference,
        sync_status="pending",
        customer_name=sender_name or None,
        customer_email=sender_email or None,
        business_name=business_name,
        business_type=business_type,
        confirmation_message=confirmation_message,
    )


async def submit_demo_brief(
    *,
    session_factory,
    email_service: EmailService,
    settings: Settings,
    payload: DemoBriefRequest,
) -> DemoBriefResponse:
    brief_reference = f"DEMO-BRIEF-{uuid4().hex[:8].upper()}"
    email_status = "pending_manual_followup"
    notes = payload.notes.strip() if payload.notes else ""
    internal_lines, customer_lines = _build_demo_brief_email_lines(
        brief_reference=brief_reference,
        payload=payload,
        settings=settings,
        notes=notes,
    )

    if email_service.smtp_configured():
        await email_service.send_email(
            to=[settings.booking_business_email],
            subject=f"New Bookedai.au demo brief ({brief_reference})",
            text="\n".join(internal_lines),
        )
        await email_service.send_email(
            to=[payload.customer_email.strip().lower()],
            cc=[settings.booking_business_email],
            subject=f"Bookedai.au demo brief received ({brief_reference})",
            text="\n".join(customer_lines),
        )
        email_status = "sent"

    async with get_session(session_factory) as session:
        await store_event(
            session,
            source="demo",
            event_type="demo_brief_submitted",
            message=TawkMessage(
                conversation_id=brief_reference,
                message_id=brief_reference,
                text=notes or "Bookedai.au demo brief submitted",
                sender_name=payload.customer_name,
                sender_email=payload.customer_email.strip().lower(),
                sender_phone=payload.customer_phone,
            ),
            ai_intent="demo_brief",
            ai_reply="Demo brief captured for follow-up and scheduling.",
            workflow_status=email_status,
            metadata={
                "brief_reference": brief_reference,
                "business_name": payload.business_name,
                "business_type": payload.business_type,
                "source_page": payload.source_page,
                "source_section": payload.source_section,
                "source_cta": payload.source_cta,
                "source_detail": payload.source_detail,
                "source_path": payload.source_path,
                "source_referrer": payload.source_referrer,
                "email_status": email_status,
            },
        )

    return DemoBriefResponse(
        status="ok",
        brief_reference=brief_reference,
        email_status=email_status,  # type: ignore[arg-type]
        confirmation_message=(
            "Thanks, your demo brief is saved. You can now choose a suitable time in the calendar."
        ),
    )


async def sync_demo_booking_from_brief(
    *,
    session_factory,
    pricing_service: PricingService,
    email_service: EmailService,
    settings: Settings,
    brief_reference: str,
) -> DemoBookingSyncResponse:
    normalized_reference = brief_reference.strip()

    async with get_session(session_factory) as session:
        conversation_repository = ConversationRepository(RepositoryContext(session=session))
        brief_event = await conversation_repository.get_latest_demo_brief_event(
            normalized_reference
        )

    if brief_event is None:
        raise HTTPException(status_code=404, detail="Demo brief was not found")

    sender_email = _normalize_text(brief_event.sender_email).lower()
    sender_name = _normalize_text(brief_event.sender_name)
    metadata = brief_event.metadata_json or {}
    business_name = _normalize_text(metadata.get("business_name")) or None
    business_type = _normalize_text(metadata.get("business_type")) or None
    created_at = brief_event.created_at
    created_from = (created_at - timedelta(minutes=5)).astimezone(UTC).replace(tzinfo=None)

    try:
        booking = await pricing_service.fetch_recent_demo_booking(
            customer_email=sender_email,
            customer_name=sender_name or None,
            appointment_created_from=created_from,
        )
    except httpx.HTTPError as exc:
        raise HTTPException(
            status_code=502,
            detail="Unable to reach Zoho Bookings right now",
        ) from exc

    if booking is None:
        return _build_pending_sync_response(
            normalized_reference=normalized_reference,
            sender_name=sender_name,
            sender_email=sender_email,
            business_name=business_name,
            business_type=business_type,
            confirmation_message=(
                "Your demo brief is saved. Once the Zoho booking is completed, we will sync it into Bookedai.au automatically."
            ),
        )

    booking_id = _normalize_text(booking.get("booking_id")) or None
    if not booking_id:
        return _build_pending_sync_response(
            normalized_reference=normalized_reference,
            sender_name=sender_name,
            sender_email=sender_email,
            business_name=business_name,
            business_type=business_type,
            confirmation_message=(
                "We found a recent Zoho booking candidate, but it did not include a booking reference yet."
            ),
        )

    customer_name = _normalize_text(booking.get("customer_name") or sender_name) or None
    customer_email = _normalize_text(booking.get("customer_email") or sender_email).lower() or None
    timezone = (
        _normalize_text(booking.get("time_zone") or booking.get("customer_booking_time_zone"))
        or "Australia/Sydney"
    )
    summary_url = _normalize_text(booking.get("summary_url")) or None
    preferred_date, preferred_time = _extract_preferred_start(
        _normalize_text(booking.get("iso_start_time"))
    )

    async with get_session(session_factory) as session:
        conversation_repository = ConversationRepository(RepositoryContext(session=session))
        existing_sync = await conversation_repository.get_latest_synced_demo_booking_event(
            booking_id
        )

        if existing_sync is not None:
            existing_metadata = existing_sync.metadata_json or {}
            return DemoBookingSyncResponse(
                status="synced",
                brief_reference=normalized_reference,
                sync_status="already_synced",
                booking_reference=booking_id,
                customer_name=customer_name,
                customer_email=customer_email,
                business_name=business_name,
                business_type=business_type,
                preferred_date=str(existing_metadata.get("preferred_date") or preferred_date or ""),
                preferred_time=str(existing_metadata.get("preferred_time") or preferred_time or ""),
                timezone=str(existing_metadata.get("timezone") or timezone or ""),
                meeting_event_url=str(existing_metadata.get("meeting_event_url") or summary_url or ""),
                email_status=str(existing_metadata.get("email_status") or "pending_manual_followup"),  # type: ignore[arg-type]
                confirmation_message="Your Zoho booking is already linked and recorded in Bookedai.au.",
            )

        email_status = "pending_manual_followup"
        start_label = (
            f"{preferred_date or 'Unknown date'} {preferred_time or 'Unknown time'} {timezone}".strip()
        )
        internal_lines = [
            "A Zoho Bookings demo appointment has been linked to a saved Bookedai.au demo brief.",
            "",
            f"Brief reference: {normalized_reference}",
            f"Zoho booking ID: {booking_id}",
            f"Customer: {customer_name or sender_name or 'Unknown'}",
            f"Email: {customer_email or sender_email or 'Unknown'}",
            f"Business: {business_name or 'Not provided'}",
            f"Business type: {business_type or 'Not provided'}",
            f"Service: {_normalize_text(booking.get('service_name')) or 'Demo consultation'}",
            f"Booked time: {start_label}",
        ]
        if summary_url:
            internal_lines.extend(["", f"Zoho summary: {summary_url}"])
        if brief_event.message_text:
            internal_lines.extend(["", "Demo brief notes:", brief_event.message_text])

        customer_lines = [
            f"Hello {customer_name or sender_name or 'there'},",
            "",
            "Your Zoho Bookings demo appointment has now been linked with your Bookedai.au demo brief.",
            f"Reference: {normalized_reference}",
            f"Zoho booking ID: {booking_id}",
            f"Scheduled time: {start_label}",
        ]
        if summary_url:
            customer_lines.append(f"Booking summary: {summary_url}")
        customer_lines.extend(["", "Bookedai.au team"])

        if email_service.smtp_configured() and customer_email:
            await email_service.send_email(
                to=[customer_email],
                cc=[settings.booking_business_email],
                subject=f"Bookedai.au demo booking linked ({normalized_reference})",
                text="\n".join(customer_lines),
            )
            await email_service.send_email(
                to=[settings.booking_business_email],
                subject=f"Zoho demo booking synced ({normalized_reference})",
                text="\n".join(internal_lines),
            )
            email_status = "sent"

        await store_event(
            session,
            source="demo",
            event_type="demo_booking_synced",
            message=TawkMessage(
                conversation_id=booking_id,
                message_id=booking_id,
                text=brief_event.message_text or "Zoho demo booking synced",
                sender_name=customer_name,
                sender_email=customer_email,
                sender_phone=_normalize_text(booking.get("customer_contact_no")) or None,
            ),
            ai_intent="demo_booking_sync",
            ai_reply="Zoho Bookings appointment linked to saved demo brief.",
            workflow_status="synced",
            metadata={
                "brief_reference": normalized_reference,
                "booking_id": booking_id,
                "business_name": business_name,
                "business_type": business_type,
                "service_name": _normalize_text(booking.get("service_name")) or None,
                "preferred_date": preferred_date,
                "preferred_time": preferred_time,
                "timezone": timezone,
                "meeting_event_url": summary_url,
                "email_status": email_status,
                "customer_more_info": booking.get("customer_more_info") or {},
                "raw_booking": booking,
            },
        )

    return DemoBookingSyncResponse(
        status="synced",
        brief_reference=normalized_reference,
        sync_status="synced",
        booking_reference=booking_id,
        customer_name=customer_name,
        customer_email=customer_email,
        business_name=business_name,
        business_type=business_type,
        preferred_date=preferred_date,
        preferred_time=preferred_time,
        timezone=timezone,
        meeting_event_url=summary_url,
        email_status=email_status,  # type: ignore[arg-type]
        confirmation_message=(
            "Your Zoho Bookings appointment has been linked to your demo brief and recorded in Bookedai.au."
        ),
    )
