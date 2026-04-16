from __future__ import annotations

import json
import re
from typing import Any
from uuid import uuid4

from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from sqlalchemy import String, cast, desc, or_, select, text

from api.v1 import build_error_envelope, build_success_envelope
from core.feature_flags import is_flag_enabled
from core.errors import AppError, PaymentAppError, ValidationAppError
from db import ServiceMerchantProfile, get_session
from repositories.base import RepositoryContext
from repositories.booking_intent_repository import BookingIntentRepository
from repositories.contact_repository import ContactRepository
from repositories.lead_repository import LeadRepository
from repositories.payment_intent_repository import PaymentIntentRepository
from repositories.tenant_repository import TenantRepository
from service_layer.email_service import EmailService
from service_layer.lifecycle_ops_service import (
    orchestrate_lead_capture,
    orchestrate_lifecycle_email,
    queue_crm_sync_retry,
)
from service_layer.prompt9_matching_service import (
    build_booking_trust_payload,
    expand_topic_terms,
    filter_ranked_matches_for_relevance,
    rank_catalog_matches,
    resolve_booking_path_policy,
)
from service_layer.prompt11_integration_service import (
    build_attention_triage_snapshot,
    build_crm_retry_backlog,
    build_integration_attention_items,
    build_integration_provider_statuses,
    build_reconciliation_details,
    build_reconciliation_summary,
)


router = APIRouter(prefix="/api/v1")


class ActorContextPayload(BaseModel):
    channel: str
    tenant_id: str | None = None
    actor_id: str | None = None
    role: str | None = None
    deployment_mode: str | None = None


class LeadContactInputPayload(BaseModel):
    full_name: str
    email: str | None = None
    phone: str | None = None
    preferred_contact_method: str | None = None


class LeadBusinessContextPayload(BaseModel):
    business_name: str | None = None
    website_url: str | None = None
    industry: str | None = None
    location: str | None = None
    service_category: str | None = None


class AttributionContextPayload(BaseModel):
    source: str
    medium: str | None = None
    campaign: str | None = None
    keyword: str | None = None
    landing_path: str | None = None
    referrer: str | None = None
    utm: dict[str, str] = Field(default_factory=dict)


class IntentContextPayload(BaseModel):
    source_page: str | None = None
    intent_type: str | None = None
    notes: str | None = None
    requested_service_id: str | None = None


class CreateLeadRequestPayload(BaseModel):
    lead_type: str
    contact: LeadContactInputPayload
    business_context: LeadBusinessContextPayload = Field(default_factory=LeadBusinessContextPayload)
    attribution: AttributionContextPayload
    intent_context: IntentContextPayload = Field(default_factory=IntentContextPayload)
    actor_context: ActorContextPayload


class StartChatSessionRequestPayload(BaseModel):
    channel: str
    anonymous_session_id: str | None = None
    attribution: AttributionContextPayload | None = None
    context: dict[str, Any] | None = None
    actor_context: ActorContextPayload


class BookingChannelContextPayload(BaseModel):
    channel: str
    tenant_id: str | None = None
    deployment_mode: str | None = None
    widget_id: str | None = None


class DesiredSlotPayload(BaseModel):
    date: str
    time: str
    timezone: str


class SearchCandidatesRequestPayload(BaseModel):
    query: str
    location: str | None = None
    preferences: dict[str, Any] | None = None
    budget: dict[str, Any] | None = None
    time_window: dict[str, Any] | None = None
    channel_context: BookingChannelContextPayload
    attribution: AttributionContextPayload | None = None


class CheckAvailabilityRequestPayload(BaseModel):
    candidate_id: str
    desired_slot: DesiredSlotPayload | None = None
    party_size: int | None = None
    channel: str
    actor_context: ActorContextPayload


class ResolveBookingPathRequestPayload(BaseModel):
    candidate_id: str | None = None
    availability_state: str | None = None
    booking_confidence: str | None = None
    payment_option: str | None = None
    channel: str
    actor_context: ActorContextPayload
    context: dict[str, Any] | None = None


class CreateBookingIntentRequestPayload(BaseModel):
    candidate_id: str | None = None
    service_id: str | None = None
    desired_slot: DesiredSlotPayload | None = None
    contact: LeadContactInputPayload
    attribution: AttributionContextPayload | None = None
    channel: str
    actor_context: ActorContextPayload
    notes: str | None = None


class CreatePaymentIntentRequestPayload(BaseModel):
    booking_intent_id: str
    selected_payment_option: str
    actor_context: ActorContextPayload


class SendLifecycleEmailRequestPayload(BaseModel):
    template_key: str
    to: list[str]
    cc: list[str] = Field(default_factory=list)
    subject: str | None = None
    variables: dict[str, str] = Field(default_factory=dict)
    context: dict[str, Any] | None = None
    actor_context: ActorContextPayload


class RetryCrmSyncRequestPayload(BaseModel):
    crm_sync_record_id: int
    actor_context: ActorContextPayload | None = None


class IntegrationStatusQueryPayload(BaseModel):
    tenant_id: str | None = None


async def _resolve_tenant_id(request: Request, actor_context: ActorContextPayload | None) -> str | None:
    if actor_context and actor_context.tenant_id:
        return actor_context.tenant_id

    async with get_session(request.app.state.session_factory) as session:
        return await TenantRepository(RepositoryContext(session=session)).get_default_tenant_id()


def _success_response(
    data: Any,
    *,
    tenant_id: str | None = None,
    actor_context: ActorContextPayload | None = None,
    message: str | None = None,
) -> Any:
    return build_success_envelope(
        data=data,
        message=message,
        tenant_id=tenant_id,
        actor_type=actor_context.channel if actor_context else None,
        actor_id=actor_context.actor_id if actor_context else None,
    )


def _error_response(
    error: AppError,
    *,
    tenant_id: str | None = None,
    actor_context: ActorContextPayload | None = None,
) -> JSONResponse:
    return JSONResponse(
        status_code=error.status_code,
        content=build_error_envelope(
            error,
            tenant_id=tenant_id,
            actor_type=actor_context.channel if actor_context else None,
            actor_id=actor_context.actor_id if actor_context else None,
        ).model_dump(mode="json"),
    )


def _build_capabilities(channel: str, deployment_mode: str | None) -> list[str]:
    capabilities = ["matching_search", "booking_path_resolution", "booking_intent_capture"]
    if channel in {"public_web", "embedded_widget"}:
        capabilities.append("assistant_guidance")
    if deployment_mode in {"standalone_app", "embedded_widget"}:
        capabilities.append("payment_collection")
    return capabilities


def _normalize_booking_path(service: ServiceMerchantProfile | None) -> str:
    if service and service.booking_url:
        return "book_on_partner_site"
    return "request_callback"


def _search_terms(
    query: str | None,
    location_hint: str | None = None,
    requested_category: str | None = None,
) -> list[str]:
    stopwords = {
        "a",
        "an",
        "and",
        "the",
        "in",
        "at",
        "on",
        "for",
        "to",
        "of",
        "with",
        "near",
        "under",
        "over",
        "best",
        "good",
        "service",
        "services",
        "booking",
        "book",
        "request",
        "price",
        "pricing",
        "aud",
    }
    terms: list[str] = []

    def _append_terms(value: str | None, *, expand_topics: bool) -> None:
        normalized = re.sub(r"[^a-z0-9]+", " ", (value or "").lower())
        raw_terms = {
            term
            for term in normalized.split()
            if len(term) >= 2 and not term.isdigit() and term not in stopwords
        }
        candidate_terms = expand_topic_terms(raw_terms) if expand_topics else raw_terms
        for term in candidate_terms:
            if term not in terms:
                terms.append(term)

    _append_terms(query, expand_topics=True)
    _append_terms(requested_category, expand_topics=True)
    _append_terms(location_hint, expand_topics=False)
    return terms[:10]


def _build_search_clauses(terms: list[str]) -> list[Any]:
    fields = (
        ServiceMerchantProfile.name,
        ServiceMerchantProfile.business_name,
        ServiceMerchantProfile.category,
        ServiceMerchantProfile.summary,
        ServiceMerchantProfile.location,
        ServiceMerchantProfile.venue_name,
        cast(ServiceMerchantProfile.tags_json, String),
    )
    clauses: list[Any] = []
    for term in terms:
        query_text = f"%{term}%"
        clauses.extend(field.ilike(query_text) for field in fields)
    return clauses


def _build_match_confidence_payload(ranked_matches: list[Any]) -> dict[str, Any]:
    if not ranked_matches:
        return {
            "score": 0.18,
            "reason": "No strong catalog candidate was found for this query.",
            "gating_state": "low",
            "evidence": [],
        }

    top_match = ranked_matches[0]
    if top_match.score >= 0.8:
        gating_state = "high"
    elif top_match.score >= 0.45:
        gating_state = "medium"
    else:
        gating_state = "low"

    return {
        "score": top_match.score,
        "reason": top_match.explanation,
        "gating_state": gating_state,
        "evidence": list(dict.fromkeys([*top_match.evidence, *(["semantic_model_rerank"] if top_match.semantic_score is not None else [])])),
    }


@router.post("/leads")
async def create_lead(request: Request, payload: CreateLeadRequestPayload):
    tenant_id = await _resolve_tenant_id(request, payload.actor_context)
    try:
        normalized_email = (payload.contact.email or "").strip().lower() or None
        normalized_phone = (payload.contact.phone or "").strip() or None
        if not normalized_email and not normalized_phone:
            raise ValidationAppError(
                "Lead intake requires at least one contact method.",
                details={"contact": ["email or phone is required"]},
            )

        async with get_session(request.app.state.session_factory) as session:
            contact_repository = ContactRepository(RepositoryContext(session=session, tenant_id=tenant_id))
            lead_repository = LeadRepository(RepositoryContext(session=session, tenant_id=tenant_id))
            contact_id = await contact_repository.upsert_contact(
                tenant_id=tenant_id,
                full_name=payload.contact.full_name,
                email=normalized_email,
                phone=normalized_phone,
                primary_channel=payload.contact.preferred_contact_method
                or ("email" if normalized_email else "phone"),
            )
            lead_id = await lead_repository.upsert_lead(
                tenant_id=tenant_id,
                contact_id=contact_id,
                source=payload.attribution.source,
                status="captured",
            )
            crm_sync_result = await orchestrate_lead_capture(
                session,
                tenant_id=tenant_id,
                lead_id=lead_id,
                source=payload.attribution.source,
                contact_email=normalized_email,
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
            tenant_id=tenant_id,
            actor_context=payload.actor_context,
        )
    except AppError as error:
        return _error_response(error, tenant_id=tenant_id, actor_context=payload.actor_context)


@router.post("/conversations/sessions")
async def start_chat_session(request: Request, payload: StartChatSessionRequestPayload):
    tenant_id = await _resolve_tenant_id(request, payload.actor_context)
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


@router.post("/matching/search")
async def search_candidates(request: Request, payload: SearchCandidatesRequestPayload):
    actor_context = ActorContextPayload(
        channel=payload.channel_context.channel,
        tenant_id=payload.channel_context.tenant_id,
        deployment_mode=payload.channel_context.deployment_mode,
    )
    tenant_id = await _resolve_tenant_id(request, actor_context)
    semantic_rollout_enabled = False

    async with get_session(request.app.state.session_factory) as session:
        search_terms = _search_terms(
            payload.query,
            payload.location,
            str((payload.preferences or {}).get("service_category") or ""),
        )
        search_clauses = _build_search_clauses(search_terms)
        statement = (
            select(ServiceMerchantProfile)
            .where(ServiceMerchantProfile.is_active == 1)
            .order_by(desc(ServiceMerchantProfile.featured), ServiceMerchantProfile.name)
            .limit(24)
        )
        if search_clauses:
            statement = statement.where(or_(*search_clauses))
        services = (await session.execute(statement)).scalars().all()
        semantic_rollout_enabled = await is_flag_enabled(
            "semantic_matching_model_assist_v1",
            session=session,
            tenant_id=tenant_id,
        )

    ranked_matches = rank_catalog_matches(
        query=payload.query,
        services=services,
        location_hint=payload.location,
        requested_service_id=str((payload.preferences or {}).get("requested_service_id") or ""),
        requested_category=str((payload.preferences or {}).get("service_category") or ""),
        budget=payload.budget,
    )
    search_strategy = "catalog_term_retrieval_with_prompt9_rerank"
    semantic_assist: dict[str, Any] | None = None
    semantic_service = getattr(request.app.state, "semantic_search_service", None)
    if semantic_rollout_enabled and semantic_service is not None:
        try:
            semantic_outcome = await semantic_service.assist_catalog_ranking(
                query=payload.query,
                location_hint=payload.location,
                budget=payload.budget,
                preferences=payload.preferences,
                ranked_matches=ranked_matches,
            )
        except Exception:
            semantic_outcome = None

        if semantic_outcome is not None:
            ranked_matches = semantic_outcome.ranked_matches
            search_strategy = semantic_outcome.strategy
            semantic_assist = {
                "applied": semantic_outcome.applied,
                "provider": semantic_outcome.provider,
                "evidence": list(semantic_outcome.evidence),
            }
    semantic_applied = bool(semantic_assist and semantic_assist.get("applied"))
    location_required = bool(re.sub(r"[^a-z0-9]+", " ", (payload.location or "").lower()).split())
    ranked_matches = filter_ranked_matches_for_relevance(
        ranked_matches,
        semantic_applied=semantic_applied,
        require_location_match=location_required,
    )
    if semantic_applied:
        search_strategy = f"{search_strategy}_with_relevance_gate"
    elif ranked_matches:
        search_strategy = f"{search_strategy}_with_relevance_gate"

    candidates = [
        {
            "candidate_id": getattr(match.service, "service_id", ""),
            "provider_name": getattr(match.service, "business_name", ""),
            "service_name": getattr(match.service, "name", ""),
            "source_type": "service_catalog",
            "distance_km": None,
            "match_score": match.score,
            "semantic_score": match.semantic_score,
            "trust_signal": match.trust_signal,
            "is_preferred": match.is_preferred,
            "explanation": match.explanation,
        }
        for match in ranked_matches[:8]
    ]
    recommendations = []
    if candidates:
        top_match = ranked_matches[0]
        top_path = "book_on_partner_site" if getattr(top_match.service, "booking_url", None) else "request_callback"
        recommendations.append(
            {
                "candidate_id": candidates[0]["candidate_id"],
                "reason": top_match.explanation,
                "path_type": top_path,
            }
        )

    return _success_response(
        {
            "request_id": f"match_{uuid4().hex[:12]}",
            "candidates": candidates,
            "recommendations": recommendations,
            "confidence": _build_match_confidence_payload(ranked_matches),
            "warnings": [] if candidates else ["No strong relevant catalog candidates were found."],
            "search_strategy": search_strategy,
            "semantic_assist": semantic_assist
            or {
                "applied": False,
                "provider": None,
                "evidence": [],
            },
        },
        tenant_id=tenant_id,
        actor_context=actor_context,
    )


@router.post("/booking-trust/checks")
async def check_availability(request: Request, payload: CheckAvailabilityRequestPayload):
    tenant_id = await _resolve_tenant_id(request, payload.actor_context)
    async with get_session(request.app.state.session_factory) as session:
        service = (
            await session.execute(
                select(ServiceMerchantProfile).where(
                    ServiceMerchantProfile.service_id == payload.candidate_id
                )
            )
        ).scalar_one_or_none()

    availability_state, verified, recommended_path, warnings, payment_allowed_now, booking_confidence = (
        build_booking_trust_payload(
            service,
            party_size=payload.party_size,
            desired_date=payload.desired_slot.date if payload.desired_slot else None,
            desired_time=payload.desired_slot.time if payload.desired_slot else None,
        )
    )
    booking_path_options = [recommended_path]
    if recommended_path != "request_callback":
        booking_path_options.append("request_callback")

    return _success_response(
        {
            "availability_state": availability_state,
            "verified": verified,
            "booking_confidence": booking_confidence,
            "booking_path_options": booking_path_options,
            "warnings": warnings,
            "payment_allowed_now": payment_allowed_now,
            "recommended_booking_path": recommended_path,
        },
        tenant_id=tenant_id,
        actor_context=payload.actor_context,
    )


@router.post("/bookings/path/resolve")
async def resolve_booking_path(request: Request, payload: ResolveBookingPathRequestPayload):
    tenant_id = await _resolve_tenant_id(request, payload.actor_context)
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


@router.post("/bookings/intents")
async def create_booking_intent(request: Request, payload: CreateBookingIntentRequestPayload):
    tenant_id = await _resolve_tenant_id(request, payload.actor_context)
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
            if service_id:
                service = (
                    await session.execute(
                        select(ServiceMerchantProfile).where(ServiceMerchantProfile.service_id == service_id)
                    )
                ).scalar_one_or_none()

            contact_repository = ContactRepository(RepositoryContext(session=session, tenant_id=tenant_id))
            lead_repository = LeadRepository(RepositoryContext(session=session, tenant_id=tenant_id))
            booking_repository = BookingIntentRepository(RepositoryContext(session=session, tenant_id=tenant_id))

            contact_id = await contact_repository.upsert_contact(
                tenant_id=tenant_id,
                full_name=payload.contact.full_name,
                email=normalized_email,
                phone=normalized_phone,
                primary_channel="email" if normalized_email else "phone",
            )
            await lead_repository.upsert_lead(
                tenant_id=tenant_id,
                contact_id=contact_id,
                source=(payload.attribution.source if payload.attribution else payload.channel),
                status="captured",
            )

            booking_reference = f"v1-{uuid4().hex[:10]}"
            booking_intent_id = await booking_repository.upsert_booking_intent(
                tenant_id=tenant_id,
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
            await session.commit()

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
        return _success_response(
            {
                "booking_intent_id": booking_intent_id,
                "booking_reference": booking_reference,
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
            },
            tenant_id=tenant_id,
            actor_context=payload.actor_context,
        )
    except AppError as error:
        return _error_response(error, tenant_id=tenant_id, actor_context=payload.actor_context)


@router.post("/payments/intents")
async def create_payment_intent(request: Request, payload: CreatePaymentIntentRequestPayload):
    tenant_id = await _resolve_tenant_id(request, payload.actor_context)
    try:
        async with get_session(request.app.state.session_factory) as session:
            booking_lookup = await session.execute(
                text(
                    """
                    select id::text as booking_intent_id
                    from booking_intents
                    where tenant_id = :tenant_id
                      and id = cast(:booking_intent_id as uuid)
                    limit 1
                    """
                ),
                {
                    "tenant_id": tenant_id,
                    "booking_intent_id": payload.booking_intent_id,
                },
            )
            booking_row = booking_lookup.mappings().first()
            if not booking_row:
                raise PaymentAppError(
                    "Booking intent not found for payment creation.",
                    details={"booking_intent_id": payload.booking_intent_id},
                )

            payment_repository = PaymentIntentRepository(RepositoryContext(session=session, tenant_id=tenant_id))
            payment_intent_id = await payment_repository.upsert_payment_intent(
                tenant_id=tenant_id,
                booking_intent_id=payload.booking_intent_id,
                payment_option=payload.selected_payment_option,
                status="pending",
                amount_aud=None,
                currency="aud",
                external_session_id=None,
                payment_url=None,
                metadata_json=json.dumps({"created_by": payload.actor_context.channel}),
            )
            await session.commit()

        return _success_response(
            {
                "payment_intent_id": payment_intent_id,
                "payment_status": "pending",
                "checkout_url": None,
                "bank_transfer_instruction_id": None,
                "invoice_id": None,
                "warnings": [
                    "Payment intent contract is ready, but provider-specific checkout orchestration is still additive."
                ],
            },
            tenant_id=tenant_id,
            actor_context=payload.actor_context,
        )
    except AppError as error:
        return _error_response(error, tenant_id=tenant_id, actor_context=payload.actor_context)


@router.post("/email/messages/send")
async def send_lifecycle_email(request: Request, payload: SendLifecycleEmailRequestPayload):
    tenant_id = await _resolve_tenant_id(request, payload.actor_context)
    try:
        if not payload.to:
            raise ValidationAppError(
                "Lifecycle email requires at least one recipient.",
                details={"to": ["at least one recipient is required"]},
            )

        email_service: EmailService = request.app.state.email_service
        subject = payload.subject or f"BookedAI lifecycle: {payload.template_key}"
        body_lines = [f"{key}: {value}" for key, value in sorted(payload.variables.items())]
        body = "\n".join(body_lines) if body_lines else f"Template {payload.template_key} triggered."
        delivery_status = "queued"
        warnings: list[str] = []

        smtp_configured = email_service.smtp_configured()
        if smtp_configured:
            await email_service.send_email(
                to=payload.to,
                cc=payload.cc,
                subject=subject,
                text=body,
            )
            delivery_status = "sent"
        else:
            warnings.append("SMTP is not fully configured; lifecycle email was recorded but not delivered.")

        async with get_session(request.app.state.session_factory) as session:
            email_result = await orchestrate_lifecycle_email(
                session,
                tenant_id=tenant_id,
                template_key=payload.template_key,
                subject=subject,
                provider="smtp" if smtp_configured else "unconfigured",
                delivery_status=delivery_status,
                event_payload={
                    "template_key": payload.template_key,
                    "recipient_count": len(payload.to),
                    "cc_count": len(payload.cc),
                },
            )
            await session.commit()

        return _success_response(
            {
                "message_id": email_result.message_id,
                "delivery_status": email_result.delivery_status,
                "provider_message_id": None,
                "warnings": warnings,
            },
            tenant_id=tenant_id,
            actor_context=payload.actor_context,
        )
    except AppError as error:
        return _error_response(error, tenant_id=tenant_id, actor_context=payload.actor_context)


@router.get("/integrations/providers/status")
async def integration_provider_statuses(request: Request):
    actor_context = ActorContextPayload(channel="admin", role="integration_preview", deployment_mode="headless_api")
    tenant_id = await _resolve_tenant_id(request, actor_context)
    async with get_session(request.app.state.session_factory) as session:
        items = await build_integration_provider_statuses(session, tenant_id=tenant_id or "")
    return _success_response(
        {
            "items": items,
        },
        tenant_id=tenant_id,
        actor_context=actor_context,
    )


@router.get("/integrations/reconciliation/summary")
async def integration_reconciliation_summary(request: Request):
    actor_context = ActorContextPayload(channel="admin", role="integration_preview", deployment_mode="headless_api")
    tenant_id = await _resolve_tenant_id(request, actor_context)
    async with get_session(request.app.state.session_factory) as session:
        summary = await build_reconciliation_summary(session, tenant_id=tenant_id or "")
    return _success_response(
        summary,
        tenant_id=tenant_id,
        actor_context=actor_context,
    )


@router.get("/integrations/attention")
async def integration_attention(request: Request):
    actor_context = ActorContextPayload(channel="admin", role="integration_preview", deployment_mode="headless_api")
    tenant_id = await _resolve_tenant_id(request, actor_context)
    async with get_session(request.app.state.session_factory) as session:
        items = await build_integration_attention_items(session, tenant_id=tenant_id or "")
    return _success_response(
        {
            "items": items,
        },
        tenant_id=tenant_id,
        actor_context=actor_context,
    )


@router.get("/integrations/attention/triage")
async def integration_attention_triage(request: Request):
    actor_context = ActorContextPayload(channel="admin", role="integration_preview", deployment_mode="headless_api")
    tenant_id = await _resolve_tenant_id(request, actor_context)
    async with get_session(request.app.state.session_factory) as session:
        snapshot = await build_attention_triage_snapshot(session, tenant_id=tenant_id or "")
    return _success_response(
        snapshot,
        tenant_id=tenant_id,
        actor_context=actor_context,
    )


@router.get("/integrations/crm-sync/backlog")
async def integration_crm_sync_backlog(request: Request):
    actor_context = ActorContextPayload(channel="admin", role="integration_preview", deployment_mode="headless_api")
    tenant_id = await _resolve_tenant_id(request, actor_context)
    async with get_session(request.app.state.session_factory) as session:
        backlog = await build_crm_retry_backlog(session, tenant_id=tenant_id or "")
    return _success_response(
        backlog,
        tenant_id=tenant_id,
        actor_context=actor_context,
    )


@router.get("/integrations/reconciliation/details")
async def integration_reconciliation_details(request: Request):
    actor_context = ActorContextPayload(channel="admin", role="integration_preview", deployment_mode="headless_api")
    tenant_id = await _resolve_tenant_id(request, actor_context)
    async with get_session(request.app.state.session_factory) as session:
        details = await build_reconciliation_details(session, tenant_id=tenant_id or "")
    return _success_response(
        details,
        tenant_id=tenant_id,
        actor_context=actor_context,
    )


@router.post("/integrations/crm-sync/retry")
async def retry_crm_sync(request: Request, payload: RetryCrmSyncRequestPayload):
    actor_context = payload.actor_context or ActorContextPayload(
        channel="admin",
        role="integration_retry",
        deployment_mode="headless_api",
    )
    tenant_id = await _resolve_tenant_id(request, actor_context)
    async with get_session(request.app.state.session_factory) as session:
        retry_result = await queue_crm_sync_retry(
            session,
            tenant_id=tenant_id or "",
            crm_sync_record_id=payload.crm_sync_record_id,
            reason="api_v1_retry_request",
        )
        await session.commit()
    return _success_response(
        {
            "crm_sync_record_id": retry_result.record_id,
            "sync_status": retry_result.sync_status,
            "warnings": retry_result.warning_codes,
        },
        tenant_id=tenant_id,
        actor_context=actor_context,
    )
