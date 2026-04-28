from __future__ import annotations

from datetime import UTC, datetime, timedelta
from urllib.parse import quote, urlencode, urlparse

import httpx
from fastapi import HTTPException, Request
from pydantic import BaseModel, Field

from core.logging import get_logger
from core.portal_tokens import (
    PortalAccessTokenIssue,
    PortalTokenError,
    generate_portal_access_token,
)
from repositories.booking_feedback_repository import BookingFeedbackRepository

_logger = get_logger("bookedai.api.v1_booking_handlers")

from api.v1_routes import (
    AppError,
    BookingIntentRepository,
    ContactRepository,
    CreateBookingIntentRequestPayload,
    CreateLeadRequestPayload,
    CreatePaymentIntentRequestPayload,
    LeadRepository,
    PaymentAppError,
    PaymentIntentRepository,
    RepositoryContext,
    ResolveBookingPathRequestPayload,
    ServiceMerchantProfile,
    StartChatSessionRequestPayload,
    TenantRepository,
    ValidationAppError,
    _build_capabilities,
    _error_response,
    _normalize_booking_path,
    _record_phase2_write_activity,
    _resolve_tenant_id,
    _success_response,
    build_booking_trust_payload,
    get_session,
    json,
    orchestrate_booking_followup_sync,
    orchestrate_contact_sync,
    orchestrate_lead_capture,
    resolve_booking_path_policy,
    select,
    text,
    uuid4,
)


# Tenants opted into automatic monthly customer check-ins on booking creation.
# AI Mentor 1-1 Pro is the canonical pilot for the partner-style aimentor.bookedai.au
# subdomain — we wire the cadence in here so we don't need a tenant-settings round-trip.
MONTHLY_REMINDER_DEFAULT_TENANT_SLUGS = {"ai-mentor-doer"}
MONTHLY_REMINDER_INTERVAL_DAYS = 30


PUBLIC_BOOKING_DEFAULT_TENANT_SLUG = "bookedai-au"
PUBLIC_BOOKING_FALLBACK_CHANNELS = {"public_web", "embedded_widget"}


def _is_public_booking_actor(actor_context) -> bool:
    channel = str(getattr(actor_context, "channel", "") or "").strip().lower()
    return channel in PUBLIC_BOOKING_FALLBACK_CHANNELS


async def _resolve_public_booking_fallback_tenant_id(request: Request) -> str | None:
    async with get_session(request.app.state.session_factory) as session:
        return await TenantRepository(RepositoryContext(session=session)).resolve_tenant_id(
            PUBLIC_BOOKING_DEFAULT_TENANT_SLUG
        )


async def _resolve_booking_flow_tenant_id(request: Request, actor_context) -> str | None:
    try:
        return await _resolve_tenant_id(request, actor_context)
    except HTTPException as error:
        if error.status_code != 401 or not _is_public_booking_actor(actor_context):
            raise

        fallback_tenant_id = await _resolve_public_booking_fallback_tenant_id(request)
        if fallback_tenant_id:
            return fallback_tenant_id
        raise


PORTAL_BASE_URL = "https://portal.bookedai.au"


def _build_portal_link(booking_reference: str, access_token: str | None) -> str:
    base = f"{PORTAL_BASE_URL}/?ref={quote(booking_reference, safe='')}"
    if access_token:
        base += f"&token={quote(access_token, safe='')}"
    return base


def _build_booking_confirmation_whatsapp_text(
    *,
    customer_name: str | None,
    service_name: str | None,
    requested_date: str | None,
    requested_time: str | None,
    timezone: str | None,
    booking_reference: str,
    portal_url: str | None = None,
) -> str:
    name_line = f"Hi {customer_name}," if customer_name else "Hi,"
    parts = [
        f"✅ Booking confirmed!\n",
        f"{name_line} your booking request has been received.",
        f"\n\U0001f4cb Reference: {booking_reference}",
    ]
    if service_name:
        parts.append(f"\U0001f3f7️ Service: {service_name}")
    slot = " ".join(p for p in [requested_date or "", requested_time or ""] if p)
    if slot:
        parts.append(f"\U0001f4c5 Date: {slot}")
    if timezone:
        parts.append(f"\U0001f30f Timezone: {timezone}")
    if portal_url:
        parts.append(f"\U0001f517 Manage booking: {portal_url}")
    parts.append(
        "\n\nReply here anytime for help with your booking — status, changes, payment, or anything else. We're here!"
    )
    return "\n".join(parts)


def _normalize_text(value: object | None) -> str | None:
    normalized = str(value or "").strip()
    return normalized or None


def _resolve_reminder_anchor(*, requested_date: str | None) -> datetime:
    """Pick the anchor used for the first reminder.

    Prefers the customer's requested booking date when present so reminders
    fall ~30 days after the actual session. Falls back to "now" so the
    cadence still kicks in for fast-track or async bookings.
    """
    raw = (requested_date or "").strip()
    if raw:
        for fmt in ("%Y-%m-%d", "%Y/%m/%d", "%d-%m-%Y", "%d/%m/%Y"):
            try:
                parsed = datetime.strptime(raw, fmt)
                return parsed.replace(tzinfo=UTC)
            except ValueError:
                continue
    return datetime.now(tz=UTC)


def _is_allowed_payment_return_origin(origin: str | None) -> bool:
    parsed = urlparse(str(origin or "").strip())
    hostname = (parsed.hostname or "").lower()
    scheme = (parsed.scheme or "").lower()
    if scheme == "https" and (hostname == "bookedai.au" or hostname.endswith(".bookedai.au")):
        return True
    return scheme == "http" and hostname in {"localhost", "127.0.0.1"}


def _build_payment_return_url(
    request: Request,
    booking_reference: str,
    status: str,
    *,
    include_checkout_session_id: bool = False,
) -> str:
    origin = _normalize_text(request.headers.get("origin"))
    if origin and _is_allowed_payment_return_origin(origin):
        url = f"{origin.rstrip('/')}/?booking={quote(status)}&ref={quote(booking_reference)}"
        if include_checkout_session_id:
            url += "&session_id={CHECKOUT_SESSION_ID}"
        return url

    url = (
        "https://portal.bookedai.au/"
        f"?booking_reference={quote(booking_reference)}&payment={quote(status)}"
    )
    if include_checkout_session_id:
        url += "&session_id={CHECKOUT_SESSION_ID}"
    return url


async def _create_public_stripe_checkout_session(
    *,
    stripe_secret_key: str,
    stripe_currency: str,
    booking_reference: str,
    service_name: str,
    amount_aud: float,
    customer_email: str | None,
    success_url: str,
    cancel_url: str,
) -> dict[str, object]:
    amount_cents = int(round(float(amount_aud) * 100))
    form_data: list[tuple[str, str]] = [
        ("mode", "payment"),
        ("success_url", success_url),
        ("cancel_url", cancel_url),
        ("payment_method_types[]", "card"),
        ("line_items[0][quantity]", "1"),
        ("line_items[0][price_data][currency]", stripe_currency.lower()),
        ("line_items[0][price_data][unit_amount]", str(amount_cents)),
        ("line_items[0][price_data][product_data][name]", service_name),
        ("client_reference_id", booking_reference),
        ("metadata[booking_reference]", booking_reference),
        ("metadata[service_name]", service_name),
    ]
    normalized_email = _normalize_text(customer_email)
    if normalized_email:
        form_data.append(("customer_email", normalized_email.lower()))

    async with httpx.AsyncClient(timeout=20) as client:
        response = await client.post(
            "https://api.stripe.com/v1/checkout/sessions",
            headers={
                "Authorization": f"Bearer {stripe_secret_key}",
                "Content-Type": "application/x-www-form-urlencoded",
            },
            content=urlencode(form_data).encode(),
        )
        response.raise_for_status()
        payload = response.json()

    checkout_url = _normalize_text(payload.get("url"))
    if not checkout_url:
        raise PaymentAppError("Stripe checkout did not return a checkout URL.")

    return {
        "checkout_url": checkout_url,
        "external_session_id": _normalize_text(payload.get("id")),
    }


async def _resolve_service_tenant_id(session, service_id: str | None) -> str | None:
    normalized_service_id = str(service_id or "").strip()
    if not normalized_service_id:
        return None

    statement = select(ServiceMerchantProfile.tenant_id).where(
        ServiceMerchantProfile.service_id == normalized_service_id
    )
    service_tenant_id = (await session.execute(statement)).scalar_one_or_none()
    return str(service_tenant_id or "").strip() or None


async def create_lead(request: Request, payload: CreateLeadRequestPayload):
    tenant_id = await _resolve_booking_flow_tenant_id(request, payload.actor_context)
    try:
        normalized_email = (payload.contact.email or "").strip().lower() or None
        normalized_phone = (payload.contact.phone or "").strip() or None
        if not normalized_email and not normalized_phone:
            raise ValidationAppError(
                "Lead intake requires at least one contact method.",
                details={"contact": ["email or phone is required"]},
            )

        async with get_session(request.app.state.session_factory) as session:
            service_tenant_id = await _resolve_service_tenant_id(
                session,
                payload.intent_context.requested_service_id,
            )
            effective_tenant_id = service_tenant_id or tenant_id
            contact_repository = ContactRepository(RepositoryContext(session=session, tenant_id=effective_tenant_id))
            lead_repository = LeadRepository(RepositoryContext(session=session, tenant_id=effective_tenant_id))
            contact_id = await contact_repository.upsert_contact(
                tenant_id=effective_tenant_id,
                full_name=payload.contact.full_name,
                email=normalized_email,
                phone=normalized_phone,
                primary_channel=payload.contact.preferred_contact_method
                or ("email" if normalized_email else "phone"),
            )
            lead_id = await lead_repository.upsert_lead(
                tenant_id=effective_tenant_id,
                contact_id=contact_id,
                source=payload.attribution.source,
                status="captured",
            )
            crm_sync_result = await orchestrate_lead_capture(
                session,
                tenant_id=effective_tenant_id,
                lead_id=lead_id,
                source=payload.attribution.source,
                contact_email=normalized_email,
                contact_full_name=payload.contact.full_name,
                contact_phone=normalized_phone,
                company_name=payload.business_context.business_name,
            )
            await _record_phase2_write_activity(
                session,
                tenant_id=effective_tenant_id,
                actor_context=payload.actor_context,
                audit_event_type="lead.captured",
                entity_type="lead",
                entity_id=lead_id,
                audit_payload={
                    "lead_type": payload.lead_type,
                    "contact_id": contact_id,
                    "crm_sync_status": crm_sync_result.sync_status,
                    "source": payload.attribution.source,
                    "preferred_contact_method": payload.contact.preferred_contact_method,
                },
                outbox_event_type="lead.capture.recorded",
                outbox_payload={
                    "lead_id": lead_id,
                    "contact_id": contact_id,
                    "crm_sync_record_id": crm_sync_result.record_id,
                    "crm_sync_status": crm_sync_result.sync_status,
                    "source": payload.attribution.source,
                },
                idempotency_key=f"lead-captured:{lead_id}" if lead_id else None,
            )
            await session.commit()

        return _success_response(
            {
                "lead_id": lead_id,
                "contact_id": contact_id,
                "status": "captured",
                "crm_sync_status": crm_sync_result.sync_status,
                "conversation_id": None,
            },
            tenant_id=effective_tenant_id,
            actor_context=payload.actor_context,
        )
    except AppError as error:
        return _error_response(error, tenant_id=tenant_id, actor_context=payload.actor_context)


async def start_chat_session(request: Request, payload: StartChatSessionRequestPayload):
    tenant_id = await _resolve_booking_flow_tenant_id(request, payload.actor_context)
    conversation_id = payload.anonymous_session_id or f"conv_{uuid4().hex[:16]}"
    channel_session_id = f"{payload.channel}_{uuid4().hex[:12]}"
    return _success_response(
        {
            "conversation_id": conversation_id,
            "channel_session_id": channel_session_id,
            "capabilities": _build_capabilities(
                payload.channel,
                payload.actor_context.deployment_mode,
            ),
        },
        tenant_id=tenant_id,
        actor_context=payload.actor_context,
    )


async def resolve_booking_path(request: Request, payload: ResolveBookingPathRequestPayload):
    tenant_id = await _resolve_booking_flow_tenant_id(request, payload.actor_context)
    availability_state = payload.availability_state or "availability_unknown"
    booking_confidence = payload.booking_confidence or "unverified"
    path_type, next_step, warnings, payment_allowed = resolve_booking_path_policy(
        availability_state=availability_state,
        booking_confidence=booking_confidence,
        payment_option=payload.payment_option,
        context=payload.context,
    )

    return _success_response(
        {
            "path_type": path_type,
            "trust_confidence": booking_confidence,
            "warnings": warnings
            if warnings
            else ([] if payment_allowed else ["Payment should wait until booking confidence improves."]),
            "next_step": next_step,
            "payment_allowed_before_confirmation": payment_allowed,
        },
        tenant_id=tenant_id,
        actor_context=payload.actor_context,
    )


async def create_booking_intent(request: Request, payload: CreateBookingIntentRequestPayload):
    tenant_id = await _resolve_booking_flow_tenant_id(request, payload.actor_context)
    try:
        normalized_email = (payload.contact.email or "").strip().lower() or None
        normalized_phone = (payload.contact.phone or "").strip() or None
        if not normalized_email and not normalized_phone:
            raise ValidationAppError(
                "Booking intent requires at least one contact method.",
                details={"contact": ["email or phone is required"]},
            )

        async with get_session(request.app.state.session_factory) as session:
            service = None
            service_id = payload.service_id or payload.candidate_id
            service_tenant_id = await _resolve_service_tenant_id(session, service_id)
            effective_tenant_id = service_tenant_id or tenant_id
            if service_id:
                statement = select(ServiceMerchantProfile).where(
                    ServiceMerchantProfile.service_id == service_id
                )
                if effective_tenant_id:
                    statement = statement.where(ServiceMerchantProfile.tenant_id == effective_tenant_id)
                service = (await session.execute(statement)).scalar_one_or_none()

            contact_repository = ContactRepository(RepositoryContext(session=session, tenant_id=effective_tenant_id))
            lead_repository = LeadRepository(RepositoryContext(session=session, tenant_id=effective_tenant_id))
            booking_repository = BookingIntentRepository(RepositoryContext(session=session, tenant_id=effective_tenant_id))

            contact_id = await contact_repository.upsert_contact(
                tenant_id=effective_tenant_id,
                full_name=payload.contact.full_name,
                email=normalized_email,
                phone=normalized_phone,
                primary_channel="email" if normalized_email else "phone",
            )
            lead_id = await lead_repository.upsert_lead(
                tenant_id=effective_tenant_id,
                contact_id=contact_id,
                source=(payload.attribution.source if payload.attribution else payload.channel),
                status="captured",
            )

            booking_reference = f"v1-{uuid4().hex[:10]}"
            settings = getattr(request.app.state, "settings", None)
            portal_token_max_age_days = int(
                getattr(settings, "portal_token_max_age_days", 365) or 365
            )
            portal_access_token: PortalAccessTokenIssue | None = None
            try:
                portal_access_token = generate_portal_access_token(
                    booking_reference,
                    max_age_days=portal_token_max_age_days,
                )
            except PortalTokenError as exc:
                _logger.warning(
                    "portal_access_token_issue_failed",
                    extra={
                        "event_type": "portal_access_token_issue_failed",
                        "tenant_id": str(effective_tenant_id or ""),
                        "status": 0,
                        "route": "/api/v1/booking/intent",
                        "request_id": "",
                        "integration_name": "portal_tokens",
                        "conversation_id": "",
                        "booking_reference": booking_reference,
                        "job_name": "",
                        "job_id": "",
                    },
                    exc_info=exc,
                )

            booking_intent_id = await booking_repository.upsert_booking_intent(
                tenant_id=effective_tenant_id,
                contact_id=contact_id,
                booking_reference=booking_reference,
                conversation_id=f"conv_{uuid4().hex[:12]}",
                source=payload.channel,
                service_name=service.name if service else None,
                service_id=service_id,
                requested_date=payload.desired_slot.date if payload.desired_slot else None,
                requested_time=payload.desired_slot.time if payload.desired_slot else None,
                timezone=payload.desired_slot.timezone if payload.desired_slot else None,
                booking_path=_normalize_booking_path(service),
                confidence_level="medium" if service else "low",
                status="captured",
                payment_dependency_state="pending",
                metadata_json=json.dumps(
                    {
                        "notes": payload.notes,
                        "channel": payload.channel,
                        "attribution": payload.attribution.model_dump() if payload.attribution else None,
                    }
                ),
            )
            if portal_access_token is not None:
                try:
                    await booking_repository.store_portal_access_token(
                        booking_reference=booking_reference,
                        token_hash=portal_access_token.token_hash,
                        expires_at=portal_access_token.expires_at,
                    )
                except Exception as exc:
                    _logger.warning(
                        "portal_access_token_persist_failed",
                        extra={
                            "event_type": "portal_access_token_persist_failed",
                            "tenant_id": str(effective_tenant_id or ""),
                            "status": 0,
                            "route": "/api/v1/booking/intent",
                            "request_id": "",
                            "integration_name": "portal_tokens",
                            "conversation_id": "",
                            "booking_reference": booking_reference,
                            "job_name": "",
                            "job_id": "",
                        },
                        exc_info=exc,
                    )
                    portal_access_token = None

            # AI Mentor partner-style flow: auto-enable monthly check-in reminders
            # so the customer always gets a touchpoint 30 days after their session,
            # without the booking surface having to opt in on every request.
            try:
                tenant_profile = await TenantRepository(
                    RepositoryContext(session=session)
                ).get_tenant_profile(effective_tenant_id)
                tenant_slug = (tenant_profile or {}).get("slug") if tenant_profile else None
                if tenant_slug in MONTHLY_REMINDER_DEFAULT_TENANT_SLUGS:
                    reminder_anchor = _resolve_reminder_anchor(
                        requested_date=payload.desired_slot.date if payload.desired_slot else None,
                    )
                    next_at = reminder_anchor + timedelta(
                        days=MONTHLY_REMINDER_INTERVAL_DAYS
                    )
                    await booking_repository.configure_reminder_cadence(
                        booking_reference=booking_reference,
                        cadence="monthly",
                        next_at=next_at,
                    )
            except Exception as exc:
                _logger.warning(
                    "monthly_reminder_default_enable_failed",
                    extra={
                        "event_type": "monthly_reminder_default_enable_failed",
                        "tenant_id": str(effective_tenant_id or ""),
                        "status": 0,
                        "route": "/api/v1/booking/intent",
                        "request_id": "",
                        "integration_name": "lifecycle_reminder",
                        "conversation_id": "",
                        "booking_reference": booking_reference,
                        "job_name": "",
                        "job_id": "",
                    },
                    exc_info=exc,
                )

            lead_sync_result = await orchestrate_lead_capture(
                session,
                tenant_id=effective_tenant_id,
                lead_id=lead_id,
                source=(payload.attribution.source if payload.attribution else payload.channel),
                contact_email=normalized_email,
                contact_full_name=payload.contact.full_name,
                contact_phone=normalized_phone,
                company_name=service.name if service else None,
            )
            contact_sync_result = await orchestrate_contact_sync(
                session,
                tenant_id=effective_tenant_id,
                contact_id=contact_id,
                full_name=payload.contact.full_name,
                email=normalized_email,
                phone=normalized_phone,
            )
            booking_crm_sync = await orchestrate_booking_followup_sync(
                session,
                tenant_id=effective_tenant_id,
                booking_intent_id=booking_intent_id,
                booking_reference=booking_reference,
                full_name=payload.contact.full_name,
                email=normalized_email,
                phone=normalized_phone,
                source=(payload.attribution.source if payload.attribution else payload.channel),
                service_name=service.name if service else None,
                requested_date=payload.desired_slot.date if payload.desired_slot else None,
                requested_time=payload.desired_slot.time if payload.desired_slot else None,
                timezone=payload.desired_slot.timezone if payload.desired_slot else None,
                booking_path=_normalize_booking_path(service),
                notes=payload.notes,
                external_lead_id=lead_sync_result.external_entity_id,
                external_contact_id=contact_sync_result.external_entity_id,
            )
            await _record_phase2_write_activity(
                session,
                tenant_id=effective_tenant_id,
                actor_context=payload.actor_context,
                audit_event_type="booking_intent.captured",
                entity_type="booking_intent",
                entity_id=booking_intent_id,
                audit_payload={
                    "booking_reference": booking_reference,
                    "contact_id": contact_id,
                    "lead_id": lead_id,
                    "service_id": service_id,
                    "channel": payload.channel,
                    "requested_date": payload.desired_slot.date if payload.desired_slot else None,
                    "requested_time": payload.desired_slot.time if payload.desired_slot else None,
                    "crm_sync": {
                        "lead": lead_sync_result.sync_status,
                        "contact": contact_sync_result.sync_status,
                        "deal": booking_crm_sync.deal_sync_status,
                        "task": booking_crm_sync.task_sync_status,
                    },
                },
                outbox_event_type="booking_intent.capture.recorded",
                outbox_payload={
                    "booking_intent_id": booking_intent_id,
                    "booking_reference": booking_reference,
                    "contact_id": contact_id,
                    "lead_id": lead_id,
                    "service_id": service_id,
                    "channel": payload.channel,
                    "crm_sync": {
                        "lead_record_id": lead_sync_result.record_id,
                        "contact_record_id": contact_sync_result.record_id,
                        "deal_record_id": booking_crm_sync.deal_record_id,
                        "task_record_id": booking_crm_sync.task_record_id,
                    },
                },
                idempotency_key=f"booking-intent:{booking_intent_id}" if booking_intent_id else None,
            )
            await session.commit()

        if normalized_phone and hasattr(request.app.state, "communication_service"):
            try:
                from schemas import TawkMessage
                from services import store_event
                portal_link = _build_portal_link(
                    booking_reference,
                    portal_access_token.plaintext if portal_access_token else None,
                )
                confirmation_text = _build_booking_confirmation_whatsapp_text(
                    customer_name=payload.contact.full_name,
                    service_name=service.name if service else None,
                    requested_date=payload.desired_slot.date if payload.desired_slot else None,
                    requested_time=payload.desired_slot.time if payload.desired_slot else None,
                    timezone=payload.desired_slot.timezone if payload.desired_slot else None,
                    booking_reference=booking_reference,
                    portal_url=portal_link,
                )
                await request.app.state.communication_service.send_whatsapp(
                    to=normalized_phone,
                    body=confirmation_text,
                )
                confirmation_message = TawkMessage(
                    conversation_id=normalized_phone,
                    text=confirmation_text,
                    sender_name="BookedAI",
                    sender_phone=normalized_phone,
                    metadata={"channel": "whatsapp", "direction": "outbound", "event_type": "booking_confirmation"},
                )
                async with get_session(request.app.state.session_factory) as confirm_session:
                    await store_event(
                        confirm_session,
                        source="whatsapp",
                        event_type="whatsapp_booking_confirmation",
                        message=confirmation_message,
                        ai_intent="booking_confirmation",
                        ai_reply=None,
                        workflow_status="sent",
                        metadata={
                            "channel": "whatsapp",
                            "direction": "outbound",
                            "booking_reference": booking_reference,
                            "tenant_id": str(effective_tenant_id or ""),
                            "service_name": service.name if service else None,
                        },
                    )
            except Exception as exc:
                _logger.warning(
                    "whatsapp_booking_confirmation_failed",
                    extra={
                        "event_type": "whatsapp_booking_confirmation_failed",
                        "tenant_id": str(effective_tenant_id or ""),
                        "status": 0,
                        "route": "/api/v1/booking/intent",
                        "request_id": "",
                        "integration_name": "whatsapp",
                        "conversation_id": normalized_phone,
                        "booking_reference": booking_reference,
                        "job_name": "",
                        "job_id": "",
                    },
                    exc_info=exc,
                )

        availability_state, verified, recommended_path, warnings, payment_allowed_now, booking_confidence = (
            build_booking_trust_payload(
                service,
                desired_date=payload.desired_slot.date if payload.desired_slot else None,
                desired_time=payload.desired_slot.time if payload.desired_slot else None,
            )
        )
        booking_path_options = [recommended_path]
        if recommended_path != "request_callback":
            booking_path_options.append("request_callback")
        portal_response_link = _build_portal_link(
            booking_reference,
            portal_access_token.plaintext if portal_access_token else None,
        )
        return _success_response(
            {
                "booking_intent_id": booking_intent_id,
                "booking_reference": booking_reference,
                "portal": {
                    "url": portal_response_link,
                    "access_token": (
                        portal_access_token.plaintext if portal_access_token else None
                    ),
                    "expires_at": (
                        portal_access_token.expires_at.isoformat()
                        if portal_access_token
                        else None
                    ),
                },
                "trust": {
                    "availability_state": availability_state,
                    "verified": verified,
                    "booking_confidence": booking_confidence,
                    "booking_path_options": booking_path_options,
                    "recommended_booking_path": recommended_path,
                    "payment_allowed_now": payment_allowed_now,
                    "warnings": warnings,
                },
                "warnings": warnings,
                "crm_sync": {
                    "lead": {
                        "record_id": lead_sync_result.record_id,
                        "sync_status": lead_sync_result.sync_status,
                        "external_entity_id": lead_sync_result.external_entity_id,
                        "warning_codes": lead_sync_result.warning_codes,
                    },
                    "contact": {
                        "record_id": contact_sync_result.record_id,
                        "sync_status": contact_sync_result.sync_status,
                        "external_entity_id": contact_sync_result.external_entity_id,
                        "warning_codes": contact_sync_result.warning_codes,
                    },
                    "deal": {
                        "record_id": booking_crm_sync.deal_record_id,
                        "sync_status": booking_crm_sync.deal_sync_status,
                        "external_entity_id": booking_crm_sync.deal_external_entity_id,
                    },
                    "task": {
                        "record_id": booking_crm_sync.task_record_id,
                        "sync_status": booking_crm_sync.task_sync_status,
                        "external_entity_id": booking_crm_sync.task_external_entity_id,
                    },
                    "warning_codes": booking_crm_sync.warning_codes,
                },
            },
            tenant_id=effective_tenant_id,
            actor_context=payload.actor_context,
        )
    except AppError as error:
        return _error_response(error, tenant_id=tenant_id, actor_context=payload.actor_context)


async def create_payment_intent(request: Request, payload: CreatePaymentIntentRequestPayload):
    tenant_id = await _resolve_booking_flow_tenant_id(request, payload.actor_context)
    try:
        async with get_session(request.app.state.session_factory) as session:
            normalized_booking_intent_id = _normalize_text(payload.booking_intent_id)
            booking_lookup = await session.execute(
                text(
                    """
                    select
                      bi.id::text as booking_intent_id,
                      bi.tenant_id::text as booking_tenant_id,
                      bi.booking_reference,
                      bi.service_name,
                      bi.service_id,
                      c.email as customer_email,
                      sm.amount_aud,
                      sm.booking_url
                    from booking_intents bi
                    left join contacts c
                      on c.id = bi.contact_id
                    left join service_merchant_profiles sm
                      on sm.service_id::text = bi.service_id::text
                     and sm.tenant_id::text = bi.tenant_id::text
                    where bi.id::text = cast(:booking_intent_id as text)
                       or bi.booking_reference = cast(:booking_intent_id as text)
                    limit 1
                    """
                ),
                {
                    "tenant_id": tenant_id,
                    "booking_intent_id": normalized_booking_intent_id,
                },
            )
            booking_row = booking_lookup.mappings().first()
            if not booking_row:
                raise PaymentAppError(
                    "Booking intent not found for payment creation.",
                    details={"booking_intent_id": normalized_booking_intent_id},
                )

            effective_tenant_id = _normalize_text(booking_row.get("booking_tenant_id")) or tenant_id
            if tenant_id and effective_tenant_id and effective_tenant_id != tenant_id:
                raise AppError(
                    code="payment_booking_tenant_mismatch",
                    message="Booking intent does not belong to the resolved tenant.",
                    status_code=403,
                    details={
                        "booking_intent_id": normalized_booking_intent_id,
                        "tenant_id": tenant_id,
                    },
                )
            resolved_booking_intent_id = (
                _normalize_text(booking_row.get("booking_intent_id"))
                or normalized_booking_intent_id
                or payload.booking_intent_id
            )
            payment_option = _normalize_text(payload.selected_payment_option) or "invoice_after_confirmation"
            checkout_url: str | None = None
            external_session_id: str | None = None
            amount_aud = booking_row.get("amount_aud")
            payment_status = "pending"
            warnings: list[str] = []
            booking_reference = _normalize_text(booking_row.get("booking_reference")) or payload.booking_intent_id
            service_name = (
                _normalize_text(booking_row.get("service_name"))
                or "BookedAI service"
            )

            if payment_option == "stripe_card":
                stripe_secret_key = _normalize_text(getattr(request.app.state.settings, "stripe_secret_key", ""))
                stripe_currency = _normalize_text(getattr(request.app.state.settings, "stripe_currency", "aud")) or "aud"
                if not stripe_secret_key:
                    warnings.append("Stripe is not configured for this environment yet.")
                elif amount_aud is None or float(amount_aud) <= 0:
                    warnings.append("This booking does not have a payable amount yet, so checkout is waiting for confirmation.")
                else:
                    stripe_session = await _create_public_stripe_checkout_session(
                        stripe_secret_key=stripe_secret_key,
                        stripe_currency=stripe_currency,
                        booking_reference=booking_reference,
                        service_name=service_name,
                        amount_aud=float(amount_aud),
                        customer_email=_normalize_text(booking_row.get("customer_email")),
                        success_url=_build_payment_return_url(
                            request,
                            booking_reference,
                            "success",
                            include_checkout_session_id=True,
                        ),
                        cancel_url=_build_payment_return_url(request, booking_reference, "cancelled"),
                    )
                    checkout_url = _normalize_text(stripe_session.get("checkout_url"))
                    external_session_id = _normalize_text(stripe_session.get("external_session_id"))
                    payment_status = "requires_action"
            elif payment_option == "partner_checkout":
                checkout_url = _normalize_text(booking_row.get("booking_url"))
                if checkout_url:
                    payment_status = "requires_action"
                else:
                    warnings.append("Partner checkout is not available for this service yet.")
            elif payment_option == "invoice_after_confirmation":
                warnings.append("Provider confirmation is required before payment is collected.")
            else:
                warnings.append("Payment intent was created. The next checkout step depends on provider follow-up.")

            payment_repository = PaymentIntentRepository(RepositoryContext(session=session, tenant_id=effective_tenant_id))
            payment_intent_id = await payment_repository.upsert_payment_intent(
                tenant_id=effective_tenant_id,
                booking_intent_id=resolved_booking_intent_id,
                payment_option=payment_option,
                status=payment_status,
                amount_aud=float(amount_aud) if amount_aud is not None else None,
                currency="aud",
                external_session_id=external_session_id,
                payment_url=checkout_url,
                metadata_json=json.dumps(
                    {
                        "created_by": payload.actor_context.channel,
                        "booking_reference": booking_reference,
                        "requested_booking_intent_id": normalized_booking_intent_id,
                        "service_name": service_name,
                    }
                ),
            )
            booking_repository = BookingIntentRepository(RepositoryContext(session=session, tenant_id=effective_tenant_id))
            await booking_repository.sync_callback_status(
                tenant_id=effective_tenant_id,
                booking_reference=booking_reference,
                payment_dependency_state="stripe_checkout_ready" if checkout_url else "payment_follow_up_required",
                metadata_updates={
                    "payment_option": payment_option,
                    "payment_url": checkout_url,
                    "payment_external_session_id": external_session_id,
                },
            )
            await _record_phase2_write_activity(
                session,
                tenant_id=effective_tenant_id,
                actor_context=payload.actor_context,
                audit_event_type="payment_intent.created",
                entity_type="payment_intent",
                entity_id=payment_intent_id,
                audit_payload={
                    "booking_intent_id": payload.booking_intent_id,
                    "resolved_booking_intent_id": resolved_booking_intent_id,
                    "selected_payment_option": payload.selected_payment_option,
                },
                outbox_event_type="payment_intent.created",
                outbox_payload={
                    "payment_intent_id": payment_intent_id,
                    "booking_intent_id": resolved_booking_intent_id,
                    "selected_payment_option": payment_option,
                    "payment_status": payment_status,
                    "checkout_url": checkout_url,
                },
                idempotency_key=f"payment-intent:{payment_intent_id}" if payment_intent_id else None,
            )
            await session.commit()

        return _success_response(
            {
                "payment_intent_id": payment_intent_id,
                "payment_status": payment_status,
                "checkout_url": checkout_url,
                "bank_transfer_instruction_id": None,
                "invoice_id": None,
                "warnings": warnings,
            },
            tenant_id=effective_tenant_id,
            actor_context=payload.actor_context,
        )
    except AppError as error:
        return _error_response(error, tenant_id=tenant_id, actor_context=payload.actor_context)


# ----- Reminder + feedback (AI Mentor partner-style flow) ----------------------
#
# These endpoints sit on the booking router (alongside intent + payment) because
# they are scoped per booking_reference and reuse the same portal access-token
# guard the customer portal already uses (see api/v1_tenant_handlers._verify_portal_access).


class ConfigureBookingReminderPayload(BaseModel):
    cadence: str = Field("monthly")
    enabled: bool = True


class SubmitBookingFeedbackPayload(BaseModel):
    rating: int
    comment: str | None = None
    would_recommend: bool | None = None
    channel: str | None = None


async def _portal_guard_for_booking(
    request: Request, booking_reference: str
) -> AppError | None:
    # Imported lazily to avoid a circular import between booking and tenant handlers.
    from api.v1_tenant_handlers import _portal_guard

    return await _portal_guard(request, booking_reference)


async def configure_booking_reminder(
    booking_reference: str,
    request: Request,
    payload: ConfigureBookingReminderPayload,
):
    guard_error = await _portal_guard_for_booking(request, booking_reference)
    if guard_error is not None:
        return _error_response(guard_error, tenant_id=None, actor_context=None)

    cadence = (payload.cadence or "").strip().lower()
    if cadence and cadence != "monthly":
        return _error_response(
            ValidationAppError(
                "Only a monthly reminder cadence is supported today.",
                details={"cadence": ["unsupported_cadence"]},
            ),
            tenant_id=None,
            actor_context=None,
        )

    async with get_session(request.app.state.session_factory) as session:
        booking_repository = BookingIntentRepository(RepositoryContext(session=session))
        if not payload.enabled:
            updated = await booking_repository.configure_reminder_cadence(
                booking_reference=booking_reference,
                cadence=None,
                next_at=None,
            )
        else:
            next_at = datetime.now(tz=UTC) + timedelta(
                days=MONTHLY_REMINDER_INTERVAL_DAYS
            )
            updated = await booking_repository.configure_reminder_cadence(
                booking_reference=booking_reference,
                cadence="monthly",
                next_at=next_at,
            )
        if updated is None:
            return _error_response(
                AppError(
                    code="booking_reminder_target_not_found",
                    message="The requested booking reference could not be found for reminder configuration.",
                    status_code=404,
                    details={"booking_reference": booking_reference},
                ),
                tenant_id=None,
                actor_context=None,
            )
        await session.commit()

    return _success_response(
        {
            "booking_reference": booking_reference,
            "reminder_cadence": updated.get("reminder_cadence"),
            "reminder_next_at": (
                updated.get("reminder_next_at").isoformat()
                if isinstance(updated.get("reminder_next_at"), datetime)
                else updated.get("reminder_next_at")
            ),
            "reminder_last_sent_at": (
                updated.get("reminder_last_sent_at").isoformat()
                if isinstance(updated.get("reminder_last_sent_at"), datetime)
                else updated.get("reminder_last_sent_at")
            ),
            "enabled": payload.enabled,
        },
        tenant_id=str(updated.get("tenant_id") or "") or None,
        actor_context=None,
    )


async def disable_booking_reminder(
    booking_reference: str,
    request: Request,
):
    """Portal opt-out shortcut so the unsubscribe link can call a stable URL."""
    return await configure_booking_reminder(
        booking_reference,
        request,
        ConfigureBookingReminderPayload(cadence="monthly", enabled=False),
    )


async def submit_booking_feedback(
    booking_reference: str,
    request: Request,
    payload: SubmitBookingFeedbackPayload,
):
    guard_error = await _portal_guard_for_booking(request, booking_reference)
    if guard_error is not None:
        return _error_response(guard_error, tenant_id=None, actor_context=None)

    rating = int(payload.rating or 0)
    if rating < 1 or rating > 5:
        return _error_response(
            ValidationAppError(
                "Rating must be a whole number between 1 and 5.",
                details={"rating": ["out_of_range"]},
            ),
            tenant_id=None,
            actor_context=None,
        )

    normalized_comment = (payload.comment or "").strip() or None
    normalized_channel = (payload.channel or "portal_app").strip() or "portal_app"

    async with get_session(request.app.state.session_factory) as session:
        booking_repository = BookingIntentRepository(RepositoryContext(session=session))
        booking_state = await booking_repository.load_reminder_state(
            booking_reference=booking_reference
        )
        if booking_state is None:
            return _error_response(
                AppError(
                    code="booking_feedback_target_not_found",
                    message="The requested booking reference could not be found for feedback intake.",
                    status_code=404,
                    details={"booking_reference": booking_reference},
                ),
                tenant_id=None,
                actor_context=None,
            )

        tenant_id = str(booking_state.get("tenant_id") or "") or None
        if not tenant_id:
            return _error_response(
                AppError(
                    code="booking_feedback_tenant_unresolved",
                    message="The booking is missing a tenant anchor required for feedback intake.",
                    status_code=409,
                    details={"booking_reference": booking_reference},
                ),
                tenant_id=None,
                actor_context=None,
            )

        feedback_repository = BookingFeedbackRepository(
            RepositoryContext(session=session, tenant_id=tenant_id)
        )

        deduped = await feedback_repository.find_recent_feedback(
            booking_reference=booking_reference,
            rating=rating,
            within_minutes=5,
        )
        if deduped is not None:
            return _success_response(
                {
                    "feedback_id": deduped.get("feedback_id"),
                    "thanks": "Thanks for your feedback.",
                    "dedupe": True,
                },
                tenant_id=tenant_id,
                actor_context=None,
            )

        feedback_id = await feedback_repository.insert_feedback(
            booking_reference=booking_reference,
            tenant_id=tenant_id,
            rating=rating,
            comment=normalized_comment,
            would_recommend=payload.would_recommend,
            channel=normalized_channel,
        )

        # Outbox-only audit + downstream notify trigger. The outbox consumer is
        # responsible for routing this event to ops + Zoho CRM as a contact note.
        # Comment text is stored verbatim in booking_feedback for ops review,
        # but excluded from the audit/outbox payload to avoid PII leakage.
        await _record_phase2_write_activity(
            session,
            tenant_id=tenant_id,
            actor_context=None,
            audit_event_type="booking_feedback.submitted",
            entity_type="booking_feedback",
            entity_id=feedback_id,
            audit_payload={
                "booking_reference": booking_reference,
                "rating": rating,
                "would_recommend": payload.would_recommend,
                "channel": normalized_channel,
                "comment_present": bool(normalized_comment),
            },
            outbox_event_type="booking_feedback.recorded",
            outbox_payload={
                "feedback_id": feedback_id,
                "booking_reference": booking_reference,
                "tenant_id": tenant_id,
                "rating": rating,
                "would_recommend": payload.would_recommend,
                "channel": normalized_channel,
            },
            idempotency_key=(
                f"booking-feedback:{feedback_id}" if feedback_id else None
            ),
        )
        await session.commit()

    return _success_response(
        {
            "feedback_id": feedback_id,
            "thanks": "Thanks for your feedback.",
        },
        tenant_id=tenant_id,
        actor_context=None,
    )
