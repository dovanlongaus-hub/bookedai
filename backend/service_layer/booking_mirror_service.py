from __future__ import annotations

import json

from repositories.base import RepositoryContext
from repositories.booking_intent_repository import BookingIntentRepository
from repositories.contact_repository import ContactRepository
from repositories.lead_repository import LeadRepository
from repositories.payment_intent_repository import PaymentIntentRepository
from repositories.tenant_repository import TenantRepository
from schemas import (
    BookingAssistantSessionRequest,
    BookingAssistantSessionResponse,
    DemoBookingRequest,
    DemoBookingResponse,
    PricingConsultationRequest,
    PricingConsultationResponse,
)


async def _upsert_contact_and_lead(
    session,
    *,
    tenant_id: str,
    full_name: str | None,
    email: str | None,
    phone: str | None,
    source: str,
) -> tuple[str | None, str | None]:
    contact_repository = ContactRepository(RepositoryContext(session=session, tenant_id=tenant_id))
    lead_repository = LeadRepository(RepositoryContext(session=session, tenant_id=tenant_id))

    primary_channel = "email" if (email or "").strip() else "phone" if (phone or "").strip() else None
    contact_id = await contact_repository.upsert_contact(
        tenant_id=tenant_id,
        full_name=full_name,
        email=email,
        phone=phone,
        primary_channel=primary_channel,
    )
    lead_id = await lead_repository.upsert_lead(
        tenant_id=tenant_id,
        contact_id=contact_id,
        source=source,
        status="captured",
    )
    return contact_id, lead_id


async def dual_write_booking_assistant_session(
    session,
    *,
    payload: BookingAssistantSessionRequest,
    result: BookingAssistantSessionResponse,
) -> bool:
    tenant_id = await TenantRepository(RepositoryContext(session=session)).get_default_tenant_id()
    if not tenant_id:
        return False

    booking_repository = BookingIntentRepository(
        RepositoryContext(session=session, tenant_id=tenant_id)
    )
    payment_repository = PaymentIntentRepository(
        RepositoryContext(session=session, tenant_id=tenant_id)
    )
    contact_id, lead_id = await _upsert_contact_and_lead(
        session,
        tenant_id=tenant_id,
        full_name=payload.customer_name,
        email=(payload.customer_email or "").strip().lower() or None,
        phone=payload.customer_phone,
        source="booking_assistant",
    )

    booking_intent_id = await booking_repository.upsert_booking_intent(
        tenant_id=tenant_id,
        contact_id=contact_id,
        booking_reference=result.booking_reference,
        conversation_id=result.booking_reference,
        source="booking_assistant",
        service_name=result.service.name,
        service_id=result.service.id,
        requested_date=result.requested_date,
        requested_time=result.requested_time,
        timezone=result.timezone,
        booking_path="booking_assistant",
        confidence_level="captured",
        status="captured",
        payment_dependency_state=result.payment_status,
        metadata_json=json.dumps(
            {
                "contact": {
                    "name": payload.customer_name,
                    "email": (payload.customer_email or "").strip().lower() or None,
                    "phone": payload.customer_phone,
                },
                "lead_id": lead_id,
                "notes": payload.notes,
                "meeting_status": result.meeting_status,
                "meeting_join_url": result.meeting_join_url,
                "meeting_event_url": result.meeting_event_url,
                "calendar_add_url": result.calendar_add_url,
                "email_status": result.email_status,
                "workflow_status": result.workflow_status,
            }
        ),
    )

    if not booking_intent_id:
        return False

    await payment_repository.upsert_payment_intent(
        tenant_id=tenant_id,
        booking_intent_id=booking_intent_id,
        payment_option="stripe_checkout",
        status=result.payment_status,
        amount_aud=result.amount_aud,
        currency="aud",
        payment_url=result.payment_url,
        metadata_json=json.dumps(
            {
                "qr_code_url": result.qr_code_url,
                "amount_label": result.amount_label,
                "contact_email": result.contact_email,
            }
        ),
    )

    return True


async def dual_write_pricing_consultation(
    session,
    *,
    payload: PricingConsultationRequest,
    result: PricingConsultationResponse,
) -> bool:
    tenant_id = await TenantRepository(RepositoryContext(session=session)).get_default_tenant_id()
    if not tenant_id:
        return False

    booking_repository = BookingIntentRepository(
        RepositoryContext(session=session, tenant_id=tenant_id)
    )
    payment_repository = PaymentIntentRepository(
        RepositoryContext(session=session, tenant_id=tenant_id)
    )
    contact_id, lead_id = await _upsert_contact_and_lead(
        session,
        tenant_id=tenant_id,
        full_name=payload.customer_name,
        email=payload.customer_email.strip().lower(),
        phone=payload.customer_phone,
        source="pricing",
    )

    booking_intent_id = await booking_repository.upsert_booking_intent(
        tenant_id=tenant_id,
        contact_id=contact_id,
        booking_reference=result.consultation_reference,
        conversation_id=result.consultation_reference,
        source="pricing",
        service_name=result.plan_name,
        service_id=result.plan_id,
        requested_date=result.preferred_date,
        requested_time=result.preferred_time,
        timezone=result.timezone,
        booking_path="pricing_consultation",
        confidence_level="captured",
        status="captured",
        payment_dependency_state=result.payment_status,
        metadata_json=json.dumps(
            {
                "contact": {
                    "name": payload.customer_name,
                    "email": payload.customer_email.strip().lower(),
                    "phone": payload.customer_phone,
                },
                "lead_id": lead_id,
                "business_name": payload.business_name,
                "business_type": payload.business_type,
                "onboarding_mode": result.onboarding_mode,
                "trial_days": result.trial_days,
                "trial_summary": result.trial_summary,
                "startup_offer_applied": result.startup_offer_applied,
                "startup_offer_summary": result.startup_offer_summary,
                "onsite_travel_fee_note": result.onsite_travel_fee_note,
                "referral_partner": payload.referral_partner,
                "referral_location": payload.referral_location,
                "source_page": payload.source_page,
                "source_section": payload.source_section,
                "source_cta": payload.source_cta,
                "source_detail": payload.source_detail,
                "source_plan_id": payload.source_plan_id,
                "source_flow_mode": payload.source_flow_mode,
                "source_path": payload.source_path,
                "source_referrer": payload.source_referrer,
                "meeting_status": result.meeting_status,
                "meeting_join_url": result.meeting_join_url,
                "meeting_event_url": result.meeting_event_url,
                "email_status": result.email_status,
            }
        ),
    )

    if not booking_intent_id:
        return False

    await payment_repository.upsert_payment_intent(
        tenant_id=tenant_id,
        booking_intent_id=booking_intent_id,
        payment_option="stripe_checkout",
        status=result.payment_status,
        amount_aud=result.amount_aud,
        currency="aud",
        payment_url=result.payment_url,
        metadata_json=json.dumps(
            {
                "plan_id": result.plan_id,
                "plan_name": result.plan_name,
                "amount_label": result.amount_label,
                "source_section": payload.source_section,
                "source_cta": payload.source_cta,
                "source_plan_id": payload.source_plan_id,
            }
        ),
    )

    return True


async def dual_write_demo_request(
    session,
    *,
    payload: DemoBookingRequest,
    result: DemoBookingResponse,
) -> bool:
    tenant_id = await TenantRepository(RepositoryContext(session=session)).get_default_tenant_id()
    if not tenant_id:
        return False

    booking_repository = BookingIntentRepository(
        RepositoryContext(session=session, tenant_id=tenant_id)
    )
    contact_id, lead_id = await _upsert_contact_and_lead(
        session,
        tenant_id=tenant_id,
        full_name=payload.customer_name,
        email=payload.customer_email.strip().lower(),
        phone=payload.customer_phone,
        source="demo",
    )

    booking_intent_id = await booking_repository.upsert_booking_intent(
        tenant_id=tenant_id,
        contact_id=contact_id,
        booking_reference=result.demo_reference,
        conversation_id=result.demo_reference,
        source="demo",
        service_name="Bookedai.au demo request",
        service_id="bookedai-demo",
        requested_date=result.preferred_date,
        requested_time=result.preferred_time,
        timezone=result.timezone,
        booking_path="demo_request",
        confidence_level="captured",
        status="captured",
        payment_dependency_state=None,
        metadata_json=json.dumps(
            {
                "contact": {
                    "name": payload.customer_name,
                    "email": payload.customer_email.strip().lower(),
                    "phone": payload.customer_phone,
                },
                "lead_id": lead_id,
                "business_name": payload.business_name,
                "business_type": payload.business_type,
                "notes": payload.notes,
                "source_page": payload.source_page,
                "source_section": payload.source_section,
                "source_cta": payload.source_cta,
                "source_detail": payload.source_detail,
                "source_path": payload.source_path,
                "source_referrer": payload.source_referrer,
                "meeting_status": result.meeting_status,
                "meeting_join_url": result.meeting_join_url,
                "meeting_event_url": result.meeting_event_url,
                "email_status": result.email_status,
            }
        ),
    )

    return bool(booking_intent_id)


def _normalized_text(value: object | None) -> str:
    return str(value or "").strip()


def _normalized_float(value: object | None) -> float | None:
    if value is None:
        return None
    try:
        return float(str(value).strip())
    except (TypeError, ValueError):
        return None


def _normalized_currency(value: object | None) -> str | None:
    normalized = _normalized_text(value).lower()
    return normalized or None


def _canonical_payment_status(value: object | None) -> str | None:
    normalized = _normalized_text(value).lower()
    if not normalized:
        return None

    aliases = {
        "ready": "stripe_checkout_ready",
        "checkout_ready": "stripe_checkout_ready",
        "stripe_ready": "stripe_checkout_ready",
        "stripe_checkout_ready": "stripe_checkout_ready",
        "pending": "payment_follow_up_required",
        "manual_follow_up": "payment_follow_up_required",
        "follow_up_required": "payment_follow_up_required",
        "payment_follow_up_required": "payment_follow_up_required",
        "paid": "paid",
        "succeeded": "paid",
        "payment_succeeded": "paid",
        "completed": "paid",
        "failed": "failed",
        "payment_failed": "failed",
        "cancelled": "cancelled",
        "canceled": "cancelled",
        "expired": "expired",
        "refunded": "refunded",
    }
    return aliases.get(normalized, normalized)


def _canonical_workflow_status(value: object | None) -> str | None:
    normalized = _normalized_text(value).lower()
    if not normalized:
        return None

    aliases = {
        "ok": "processed_by_n8n",
        "processed": "processed_by_n8n",
        "processed_by_n8n": "processed_by_n8n",
        "triggered": "triggered",
        "completed": "completed",
        "synced": "synced",
        "unauthorized": "unauthorized",
        "failed": "failed",
    }
    return aliases.get(normalized, normalized)


def _canonical_lead_status(
    *,
    workflow_status: str | None = None,
    payment_status: str | None = None,
    meeting_status: str | None = None,
    email_status: str | None = None,
) -> str | None:
    if payment_status in {"paid", "refunded"}:
        return payment_status
    if payment_status in {"failed", "cancelled", "expired"}:
        return "payment_issue"
    if payment_status == "stripe_checkout_ready":
        return "payment_pending"
    if meeting_status == "scheduled":
        return "scheduled"
    if workflow_status in {"processed_by_n8n", "triggered", "synced", "completed"}:
        return workflow_status
    if email_status == "sent":
        return "engaged"
    if workflow_status or payment_status or meeting_status or email_status:
        return "active"
    return None


def _extract_callback_booking_reference(payload: dict[str, object]) -> str | None:
    for key in ("booking_reference", "consultation_reference", "demo_reference", "conversation_id"):
        value = _normalized_text(payload.get(key))
        if value:
            return value
    return None


def _first_payload_value(payload: dict[str, object], *keys: str) -> str | None:
    for key in keys:
        value = _normalized_text(payload.get(key))
        if value:
            return value
    return None


async def sync_callback_status_to_mirrors(
    session,
    *,
    payload: dict[str, object],
) -> bool:
    booking_reference = _extract_callback_booking_reference(payload)
    if not booking_reference:
        return False

    tenant_id = await TenantRepository(RepositoryContext(session=session)).get_default_tenant_id()
    if not tenant_id:
        return False

    booking_repository = BookingIntentRepository(
        RepositoryContext(session=session, tenant_id=tenant_id)
    )
    payment_repository = PaymentIntentRepository(
        RepositoryContext(session=session, tenant_id=tenant_id)
    )
    lead_repository = LeadRepository(RepositoryContext(session=session, tenant_id=tenant_id))

    workflow_status = _canonical_workflow_status(
        _first_payload_value(payload, "status", "workflow_status")
    )
    payment_status = _canonical_payment_status(
        _first_payload_value(
            payload,
            "payment_status",
            "payment_state",
            "checkout_status",
        )
    )
    meeting_status = _normalized_text(payload.get("meeting_status"))
    email_status = _normalized_text(payload.get("email_status"))
    payment_url = _first_payload_value(
        payload,
        "payment_url",
        "checkout_url",
        "stripe_checkout_url",
    )
    external_session_id = _first_payload_value(
        payload,
        "external_session_id",
        "stripe_session_id",
        "checkout_session_id",
        "payment_intent_id",
    )
    amount_aud = _normalized_float(payload.get("amount_aud"))
    if amount_aud is None:
        amount_aud = _normalized_float(payload.get("amount"))
    currency = _normalized_currency(_first_payload_value(payload, "currency", "payment_currency"))

    source = _normalized_text(payload.get("source")) or None
    metadata_updates = {
        "callback_status": workflow_status or None,
        "workflow_status": workflow_status or None,
        "payment_status": payment_status or None,
        "meeting_status": meeting_status or None,
        "email_status": email_status or None,
        "amount_aud": amount_aud,
        "currency": currency,
        "payment_url": payment_url,
        "external_session_id": external_session_id,
        "callback_reply": _normalized_text(payload.get("reply")) or None,
        "callback_summary": _normalized_text(payload.get("summary")) or None,
    }

    booking_sync = await booking_repository.sync_callback_status(
        tenant_id=tenant_id,
        booking_reference=booking_reference,
        status=workflow_status or payment_status or meeting_status or None,
        payment_dependency_state=payment_status or None,
        metadata_updates=metadata_updates,
    )
    if not booking_sync:
        return False

    if payment_status or payment_url or external_session_id or amount_aud is not None or currency:
        await payment_repository.sync_callback_status(
            tenant_id=tenant_id,
            booking_reference=booking_reference,
            status=payment_status or workflow_status or None,
            amount_aud=amount_aud,
            currency=currency,
            payment_url=payment_url,
            external_session_id=external_session_id,
            metadata_updates={
                "callback_status": workflow_status or None,
                "summary": _normalized_text(payload.get("summary")) or None,
                "amount_aud": amount_aud,
                "currency": currency,
            },
        )

    contact_id = _normalized_text(booking_sync.get("contact_id"))
    if contact_id and (workflow_status or payment_status or meeting_status or email_status):
        lead_status = _canonical_lead_status(
            workflow_status=workflow_status,
            payment_status=payment_status,
            meeting_status=meeting_status,
            email_status=email_status,
        )
        if lead_status:
            await lead_repository.update_lead_status(
                tenant_id=tenant_id,
                contact_id=contact_id,
                source=source,
                status=lead_status,
            )

    return True
