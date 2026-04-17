from __future__ import annotations

import json
import re
from typing import Any
from uuid import uuid4

import httpx
from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from sqlalchemy import String, and_, cast, desc, or_, select, text

from api.v1 import build_error_envelope, build_success_envelope
from core.feature_flags import is_flag_enabled
from core.errors import AppError, IntegrationAppError, PaymentAppError, ValidationAppError
from core.logging import get_logger
from db import ServiceMerchantProfile, get_session
from repositories.audit_repository import AuditLogRepository
from repositories.base import RepositoryContext
from repositories.booking_intent_repository import BookingIntentRepository
from repositories.contact_repository import ContactRepository
from repositories.lead_repository import LeadRepository
from repositories.outbox_repository import OutboxRepository
from repositories.payment_intent_repository import PaymentIntentRepository
from repositories.tenant_repository import TenantRepository
from service_layer.email_service import EmailService
from service_layer.lifecycle_ops_service import (
    orchestrate_communication_touch,
    orchestrate_lead_capture,
    orchestrate_lifecycle_email,
    queue_crm_sync_retry,
)
from service_layer.communication_service import CommunicationService, render_bookedai_confirmation_email
from service_layer.prompt9_matching_service import (
    build_booking_trust_payload,
    extract_booking_request_context,
    expand_location_terms,
    extract_query_location_hint,
    expand_topic_terms,
    filter_ranked_matches_for_relevance,
    is_near_me_requested,
    is_chat_style_query,
    rank_catalog_matches,
    resolve_booking_path_policy,
)
from service_layer.prompt11_integration_service import (
    build_attention_triage_snapshot,
    build_crm_retry_backlog,
    build_integration_attention_items,
    build_integration_provider_statuses,
    build_outbox_backlog,
    build_recent_runtime_activity,
    build_reconciliation_details,
    build_reconciliation_summary,
)
from service_layer.tenant_app_service import (
    build_tenant_bookings_snapshot,
    build_tenant_integrations_snapshot,
    build_tenant_overview,
)
from workers.outbox import dispatch_phase2_outbox_event, run_tracked_outbox_dispatch


router = APIRouter(prefix="/api/v1")
logger = get_logger("bookedai.api.v1")


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
    user_location: dict[str, Any] | None = None
    chat_context: list[dict[str, Any]] | None = None


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


class SendCommunicationMessageRequestPayload(BaseModel):
    to: str
    body: str | None = None
    template_key: str | None = None
    variables: dict[str, str] = Field(default_factory=dict)
    context: dict[str, Any] | None = None
    actor_context: ActorContextPayload


class RetryCrmSyncRequestPayload(BaseModel):
    crm_sync_record_id: int
    actor_context: ActorContextPayload | None = None


class DispatchOutboxRequestPayload(BaseModel):
    limit: int = 10
    actor_context: ActorContextPayload | None = None


class ReplayOutboxEventRequestPayload(BaseModel):
    outbox_event_id: int
    actor_context: ActorContextPayload | None = None


class IntegrationStatusQueryPayload(BaseModel):
    tenant_id: str | None = None


async def _resolve_tenant_id(request: Request, actor_context: ActorContextPayload | None) -> str | None:
    if actor_context and actor_context.tenant_id:
        return actor_context.tenant_id

    async with get_session(request.app.state.session_factory) as session:
        return await TenantRepository(RepositoryContext(session=session)).get_default_tenant_id()


async def _record_phase2_write_activity(
    session,
    *,
    tenant_id: str | None,
    actor_context: ActorContextPayload | None,
    audit_event_type: str,
    entity_type: str,
    entity_id: str | None,
    audit_payload: dict[str, Any] | None = None,
    outbox_event_type: str | None = None,
    outbox_payload: dict[str, Any] | None = None,
    idempotency_key: str | None = None,
) -> None:
    try:
        audit_repository = AuditLogRepository(RepositoryContext(session=session, tenant_id=tenant_id))
        await audit_repository.append_entry(
            tenant_id=tenant_id,
            event_type=audit_event_type,
            entity_type=entity_type,
            entity_id=entity_id,
            actor_type=actor_context.channel if actor_context else None,
            actor_id=actor_context.actor_id if actor_context else None,
            payload=audit_payload or {},
        )

        if outbox_event_type:
            outbox_repository = OutboxRepository(RepositoryContext(session=session, tenant_id=tenant_id))
            await outbox_repository.enqueue_event(
                tenant_id=tenant_id,
                event_type=outbox_event_type,
                aggregate_type=entity_type,
                aggregate_id=entity_id,
                payload=outbox_payload or audit_payload or {},
                idempotency_key=idempotency_key,
            )
    except Exception as exc:
        logger.warning(
            "phase2_write_foundation_record_failed",
            extra={
                "event_type": audit_event_type,
                "tenant_id": tenant_id,
                "status": 0,
                "route": "",
                "request_id": "",
                "integration_name": "phase2_repository_foundations",
                "conversation_id": "",
                "booking_reference": (audit_payload or {}).get("booking_reference", ""),
                "job_name": "",
                "job_id": "",
            },
            exc_info=exc,
        )


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
        if expand_topics:
            candidate_terms = expand_topic_terms(raw_terms, query=value)
        else:
            candidate_terms = expand_location_terms(raw_terms, text=value)
        for term in candidate_terms:
            if term not in terms:
                terms.append(term)

    _append_terms(query, expand_topics=True)
    _append_terms(requested_category, expand_topics=True)
    _append_terms(location_hint, expand_topics=False)
    return terms[:10]


def _build_search_clauses(terms: list[str], *, fields: tuple[Any, ...]) -> list[Any]:
    clauses: list[Any] = []
    for term in terms:
        query_text = f"%{term}%"
        clauses.extend(field.ilike(query_text) for field in fields)
    return clauses


TOPIC_SEARCH_FIELDS = (
    ServiceMerchantProfile.name,
    ServiceMerchantProfile.business_name,
    ServiceMerchantProfile.category,
    ServiceMerchantProfile.summary,
    cast(ServiceMerchantProfile.tags_json, String),
)

LOCATION_SEARCH_FIELDS = (
    ServiceMerchantProfile.location,
    ServiceMerchantProfile.venue_name,
    cast(ServiceMerchantProfile.tags_json, String),
)

FALLBACK_SEARCH_FIELDS = (
    *TOPIC_SEARCH_FIELDS,
    ServiceMerchantProfile.location,
    ServiceMerchantProfile.venue_name,
)


def _topic_search_terms(
    query: str | None,
    requested_category: str | None = None,
    *,
    location_hint: str | None = None,
) -> list[str]:
    terms = _search_terms(query, None, requested_category)
    location_terms = set(_search_terms(None, location_hint, None))
    return [term for term in terms if term not in location_terms]


def _location_search_terms(location_hint: str | None) -> list[str]:
    return _search_terms(None, location_hint, None)


def _build_search_filters(
    query: str | None,
    location_hint: str | None = None,
    requested_category: str | None = None,
) -> list[Any]:
    filters: list[Any] = []
    topic_terms = _topic_search_terms(
        query,
        requested_category,
        location_hint=location_hint,
    )
    location_terms = _location_search_terms(location_hint)
    fallback_terms = _search_terms(query, location_hint, requested_category)

    if topic_terms:
        topic_clauses = _build_search_clauses(topic_terms, fields=TOPIC_SEARCH_FIELDS)
        if topic_clauses:
            filters.append(or_(*topic_clauses))
    elif fallback_terms:
        fallback_clauses = _build_search_clauses(fallback_terms, fields=FALLBACK_SEARCH_FIELDS)
        if fallback_clauses:
            filters.append(or_(*fallback_clauses))

    if location_terms:
        location_clauses = _build_search_clauses(location_terms, fields=LOCATION_SEARCH_FIELDS)
        if location_clauses:
            filters.append(or_(*location_clauses))

    return filters


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
            await _record_phase2_write_activity(
                session,
                tenant_id=tenant_id,
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
    effective_location_hint = extract_query_location_hint(payload.query, payload.location)
    booking_request_context = extract_booking_request_context(payload.query, payload.time_window)
    near_me = booking_request_context.near_me_requested or is_near_me_requested(payload.query)
    chat_style = booking_request_context.is_chat_style or is_chat_style_query(payload.query)
    user_location = payload.user_location or None

    async with get_session(request.app.state.session_factory) as session:
        search_filters = _build_search_filters(
            payload.query,
            effective_location_hint,
            str((payload.preferences or {}).get("service_category") or ""),
        )
        statement = (
            select(ServiceMerchantProfile)
            .where(ServiceMerchantProfile.is_active == 1)
            .order_by(desc(ServiceMerchantProfile.featured), ServiceMerchantProfile.name)
            .limit(24)
        )
        if search_filters:
            statement = statement.where(and_(*search_filters))
        services = (await session.execute(statement)).scalars().all()
        semantic_rollout_enabled = await is_flag_enabled(
            "semantic_matching_model_assist_v1",
            session=session,
            tenant_id=tenant_id,
        )

    ranked_matches = rank_catalog_matches(
        query=payload.query,
        services=services,
        location_hint=effective_location_hint,
        requested_service_id=str((payload.preferences or {}).get("requested_service_id") or ""),
        requested_category=str((payload.preferences or {}).get("service_category") or ""),
        budget=payload.budget,
    )
    search_strategy = "catalog_term_retrieval_with_prompt9_rerank"
    semantic_assist: dict[str, Any] | None = None
    semantic_service = getattr(request.app.state, "semantic_search_service", None)
    location_permission_needed = False
    if semantic_rollout_enabled and semantic_service is not None:
        try:
            semantic_outcome = await semantic_service.assist_catalog_ranking(
                query=payload.query,
                location_hint=effective_location_hint,
                budget=payload.budget,
                preferences=payload.preferences,
                ranked_matches=ranked_matches,
                user_location=user_location,
                near_me_requested=near_me,
                chat_context=payload.chat_context,
                is_chat_style=chat_style,
            )
        except Exception:
            semantic_outcome = None

        if semantic_outcome is not None:
            ranked_matches = semantic_outcome.ranked_matches
            search_strategy = semantic_outcome.strategy
            location_permission_needed = bool(
                getattr(semantic_outcome, "location_permission_needed", False)
            )
            semantic_assist = {
                "applied": bool(getattr(semantic_outcome, "applied", False)),
                "provider": getattr(semantic_outcome, "provider", None),
                "provider_chain": list(getattr(semantic_outcome, "provider_chain", ()) or ()),
                "fallback_applied": bool(getattr(semantic_outcome, "fallback_applied", False)),
                "normalized_query": getattr(semantic_outcome, "normalized_query", None),
                "inferred_location": getattr(semantic_outcome, "inferred_location", None),
                "inferred_category": getattr(semantic_outcome, "inferred_category", None),
                "budget_summary": getattr(semantic_outcome, "budget_summary", None),
                "evidence": list(getattr(semantic_outcome, "evidence", ()) or ()),
            }
    elif near_me and not user_location:
        location_permission_needed = True
    semantic_applied = bool(semantic_assist and semantic_assist.get("applied"))
    location_required = bool(re.sub(r"[^a-z0-9]+", " ", (effective_location_hint or "").lower()).split())
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
            "category": getattr(match.service, "category", None),
            "summary": getattr(match.service, "summary", None),
            "venue_name": getattr(match.service, "venue_name", None),
            "location": getattr(match.service, "location", None),
            "booking_url": getattr(match.service, "booking_url", None),
            "map_url": getattr(match.service, "map_url", None),
            "source_url": getattr(match.service, "source_url", None),
            "image_url": getattr(match.service, "image_url", None),
            "amount_aud": getattr(match.service, "amount_aud", None),
            "duration_minutes": getattr(match.service, "duration_minutes", None),
            "tags": list(getattr(match.service, "tags_json", None) or []),
            "featured": bool(getattr(match.service, "featured", 0)),
            "distance_km": None,
            "match_score": match.score,
            "semantic_score": match.semantic_score,
            "trust_signal": match.trust_signal,
            "is_preferred": match.is_preferred,
            "display_summary": (
                (getattr(match, "semantic_reason", None) or "").strip()
                or (getattr(match.service, "summary", None) or "").strip()
                or match.explanation
            ),
            "explanation": match.explanation,
        }
        for match in ranked_matches[:8]
    ]
    recommendations = []
    if candidates:
        top_match = ranked_matches[0]
        availability_state, _verified, recommended_path, trust_warnings, _payment_allowed_now, booking_confidence = (
            build_booking_trust_payload(
                top_match.service,
                party_size=booking_request_context.party_size,
                desired_date=booking_request_context.requested_date,
                desired_time=booking_request_context.requested_time or booking_request_context.schedule_hint,
            )
        )
        top_path, next_step, path_warnings, _payment_allowed = resolve_booking_path_policy(
            availability_state=availability_state,
            booking_confidence=booking_confidence,
            payment_option=None,
            context={
                "party_size": booking_request_context.party_size,
            },
        )
        recommendations.append(
            {
                "candidate_id": candidates[0]["candidate_id"],
                "reason": top_match.explanation,
                "path_type": recommended_path or top_path,
                "next_step": next_step,
                "warnings": list(dict.fromkeys([*trust_warnings, *path_warnings])),
            }
        )

    warnings: list[str] = []
    if not candidates:
        warnings.append("No strong relevant catalog candidates were found.")
    if location_permission_needed:
        warnings.append("Location access is needed to find services near you.")

    return _success_response(
        {
            "request_id": f"match_{uuid4().hex[:12]}",
            "candidates": candidates,
            "recommendations": recommendations,
            "confidence": _build_match_confidence_payload(ranked_matches),
            "warnings": warnings,
            "search_strategy": search_strategy,
            "query_context": {
                "near_me_requested": near_me,
                "location_permission_needed": location_permission_needed,
                "is_chat_style": chat_style,
                "has_user_location": bool(user_location),
            },
            "booking_context": {
                "party_size": booking_request_context.party_size,
                "requested_date": booking_request_context.requested_date,
                "requested_time": booking_request_context.requested_time,
                "schedule_hint": booking_request_context.schedule_hint,
                "intent_label": booking_request_context.intent_label,
                "summary": booking_request_context.summary,
            },
            "semantic_assist": semantic_assist
            or {
                "applied": False,
                "provider": None,
                "provider_chain": [],
                "fallback_applied": False,
                "normalized_query": None,
                "inferred_location": None,
                "inferred_category": None,
                "budget_summary": None,
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
            await _record_phase2_write_activity(
                session,
                tenant_id=tenant_id,
                actor_context=payload.actor_context,
                audit_event_type="booking_intent.captured",
                entity_type="booking_intent",
                entity_id=booking_intent_id,
                audit_payload={
                    "booking_reference": booking_reference,
                    "contact_id": contact_id,
                    "service_id": service_id,
                    "channel": payload.channel,
                    "requested_date": payload.desired_slot.date if payload.desired_slot else None,
                    "requested_time": payload.desired_slot.time if payload.desired_slot else None,
                },
                outbox_event_type="booking_intent.capture.recorded",
                outbox_payload={
                    "booking_intent_id": booking_intent_id,
                    "booking_reference": booking_reference,
                    "contact_id": contact_id,
                    "service_id": service_id,
                    "channel": payload.channel,
                },
                idempotency_key=f"booking-intent:{booking_intent_id}" if booking_intent_id else None,
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
            await _record_phase2_write_activity(
                session,
                tenant_id=tenant_id,
                actor_context=payload.actor_context,
                audit_event_type="payment_intent.created",
                entity_type="payment_intent",
                entity_id=payment_intent_id,
                audit_payload={
                    "booking_intent_id": payload.booking_intent_id,
                    "selected_payment_option": payload.selected_payment_option,
                },
                outbox_event_type="payment_intent.created",
                outbox_payload={
                    "payment_intent_id": payment_intent_id,
                    "booking_intent_id": payload.booking_intent_id,
                    "selected_payment_option": payload.selected_payment_option,
                },
                idempotency_key=f"payment-intent:{payment_intent_id}" if payment_intent_id else None,
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
        rendered_email = None
        if payload.template_key == "bookedai_booking_confirmation":
            rendered_email = render_bookedai_confirmation_email(
                variables=payload.variables,
                public_app_url=request.app.state.settings.public_app_url,
            )
        subject = payload.subject or (
            rendered_email.subject if rendered_email else f"Bookedai.au lifecycle: {payload.template_key}"
        )
        if rendered_email:
            body = rendered_email.text
            html = rendered_email.html
        else:
            body_lines = [f"{key}: {value}" for key, value in sorted(payload.variables.items())]
            body = "\n".join(body_lines) if body_lines else f"Template {payload.template_key} triggered."
            html = None
        delivery_status = "queued"
        warnings: list[str] = []

        smtp_configured = email_service.smtp_configured()
        if smtp_configured:
            await email_service.send_email(
                to=payload.to,
                cc=payload.cc,
                subject=subject,
                text=body,
                html=html,
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
            await _record_phase2_write_activity(
                session,
                tenant_id=tenant_id,
                actor_context=payload.actor_context,
                audit_event_type="email.lifecycle_recorded",
                entity_type="email_message",
                entity_id=email_result.message_id,
                audit_payload={
                    "template_key": payload.template_key,
                    "delivery_status": email_result.delivery_status,
                    "provider": email_result.provider,
                    "recipient_count": len(payload.to),
                },
                outbox_event_type="email.lifecycle.dispatch_recorded",
                outbox_payload={
                    "message_id": email_result.message_id,
                    "template_key": payload.template_key,
                    "delivery_status": email_result.delivery_status,
                    "provider": email_result.provider,
                },
                idempotency_key=f"email-message:{email_result.message_id}",
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


@router.post("/sms/messages/send")
async def send_sms_message(request: Request, payload: SendCommunicationMessageRequestPayload):
    tenant_id = await _resolve_tenant_id(request, payload.actor_context)
    try:
        communication_service: CommunicationService = request.app.state.communication_service
        result = await communication_service.send_sms(
            to=payload.to,
            body=payload.body,
            template_key=payload.template_key,
            variables=payload.variables,
        )

        async with get_session(request.app.state.session_factory) as session:
            message_result = await orchestrate_communication_touch(
                session,
                tenant_id=tenant_id or "",
                channel="sms",
                to=payload.to,
                body=communication_service.render_template(
                    template_key=payload.template_key,
                    variables=payload.variables,
                    fallback_body=payload.body,
                ),
                provider=result.provider,
                delivery_status=result.delivery_status,
                actor_channel=payload.actor_context.channel,
                template_key=payload.template_key,
                metadata=payload.context,
            )
            await _record_phase2_write_activity(
                session,
                tenant_id=tenant_id,
                actor_context=payload.actor_context,
                audit_event_type="sms.message_recorded",
                entity_type="communication_message",
                entity_id=message_result.message_id,
                audit_payload={
                    "channel": "sms",
                    "to": payload.to,
                    "template_key": payload.template_key,
                    "delivery_status": message_result.delivery_status,
                    "provider": message_result.provider,
                },
                outbox_event_type="sms.message.dispatch_recorded",
                outbox_payload={
                    "message_id": message_result.message_id,
                    "channel": "sms",
                    "provider": message_result.provider,
                    "delivery_status": message_result.delivery_status,
                },
                idempotency_key=f"sms-message:{message_result.message_id}",
            )
            await session.commit()

        return _success_response(
            {
                "message_id": message_result.message_id,
                "delivery_status": message_result.delivery_status,
                "provider": message_result.provider,
                "provider_message_id": result.provider_message_id,
                "warnings": result.warnings or message_result.warning_codes,
            },
            tenant_id=tenant_id,
            actor_context=payload.actor_context,
        )
    except ValueError as error:
        return _error_response(
            ValidationAppError(str(error), details={"to": ["invalid or missing phone number"]}),
            tenant_id=tenant_id,
            actor_context=payload.actor_context,
        )
    except httpx.HTTPError as error:
        return _error_response(
            IntegrationAppError(
                "SMS provider request failed.",
                provider="sms",
                details={"provider_error": str(error)},
            ),
            tenant_id=tenant_id,
            actor_context=payload.actor_context,
        )


@router.post("/whatsapp/messages/send")
async def send_whatsapp_message(request: Request, payload: SendCommunicationMessageRequestPayload):
    tenant_id = await _resolve_tenant_id(request, payload.actor_context)
    try:
        communication_service: CommunicationService = request.app.state.communication_service
        result = await communication_service.send_whatsapp(
            to=payload.to,
            body=payload.body,
            template_key=payload.template_key,
            variables=payload.variables,
        )

        async with get_session(request.app.state.session_factory) as session:
            message_result = await orchestrate_communication_touch(
                session,
                tenant_id=tenant_id or "",
                channel="whatsapp",
                to=payload.to,
                body=communication_service.render_template(
                    template_key=payload.template_key,
                    variables=payload.variables,
                    fallback_body=payload.body,
                ),
                provider=result.provider,
                delivery_status=result.delivery_status,
                actor_channel=payload.actor_context.channel,
                template_key=payload.template_key,
                metadata=payload.context,
            )
            await _record_phase2_write_activity(
                session,
                tenant_id=tenant_id,
                actor_context=payload.actor_context,
                audit_event_type="whatsapp.message_recorded",
                entity_type="communication_message",
                entity_id=message_result.message_id,
                audit_payload={
                    "channel": "whatsapp",
                    "to": payload.to,
                    "template_key": payload.template_key,
                    "delivery_status": message_result.delivery_status,
                    "provider": message_result.provider,
                },
                outbox_event_type="whatsapp.message.dispatch_recorded",
                outbox_payload={
                    "message_id": message_result.message_id,
                    "channel": "whatsapp",
                    "provider": message_result.provider,
                    "delivery_status": message_result.delivery_status,
                },
                idempotency_key=f"whatsapp-message:{message_result.message_id}",
            )
            await session.commit()

        return _success_response(
            {
                "message_id": message_result.message_id,
                "delivery_status": message_result.delivery_status,
                "provider": message_result.provider,
                "provider_message_id": result.provider_message_id,
                "warnings": result.warnings or message_result.warning_codes,
            },
            tenant_id=tenant_id,
            actor_context=payload.actor_context,
        )
    except ValueError as error:
        return _error_response(
            ValidationAppError(str(error), details={"to": ["invalid or missing phone number"]}),
            tenant_id=tenant_id,
            actor_context=payload.actor_context,
        )
    except httpx.HTTPError as error:
        return _error_response(
            IntegrationAppError(
                "WhatsApp provider request failed.",
                provider="whatsapp",
                details={"provider_error": str(error)},
            ),
            tenant_id=tenant_id,
            actor_context=payload.actor_context,
        )


@router.get("/integrations/providers/status")
async def integration_provider_statuses(request: Request):
    actor_context = ActorContextPayload(channel="admin", role="integration_preview", deployment_mode="headless_api")
    tenant_id = await _resolve_tenant_id(request, actor_context)
    async with get_session(request.app.state.session_factory) as session:
        items = await build_integration_provider_statuses(session, tenant_id=tenant_id or "")
    communication_service: CommunicationService = request.app.state.communication_service
    items.extend(
        [
            {
                "provider": communication_service.sms_adapter.provider_name,
                "status": "connected" if communication_service.sms_configured() else "unconfigured",
                "sync_mode": "write_back",
                "safe_config": communication_service.sms_safe_summary(),
                "updated_at": None,
            },
            {
                "provider": communication_service.whatsapp_adapter.provider_name,
                "status": "connected" if communication_service.whatsapp_configured() else "unconfigured",
                "sync_mode": "bidirectional",
                "safe_config": communication_service.whatsapp_safe_summary(),
                "updated_at": None,
            },
        ]
    )
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


@router.get("/integrations/runtime-activity")
async def integration_runtime_activity(request: Request):
    actor_context = ActorContextPayload(channel="admin", role="integration_preview", deployment_mode="headless_api")
    tenant_id = await _resolve_tenant_id(request, actor_context)
    async with get_session(request.app.state.session_factory) as session:
        activity = await build_recent_runtime_activity(session, tenant_id=tenant_id or "")
    return _success_response(
        activity,
        tenant_id=tenant_id,
        actor_context=actor_context,
    )


@router.get("/integrations/outbox/dispatched-audit")
async def integration_outbox_dispatched_audit(request: Request):
    actor_context = ActorContextPayload(channel="admin", role="integration_preview", deployment_mode="headless_api")
    tenant_id = await _resolve_tenant_id(request, actor_context)
    async with get_session(request.app.state.session_factory) as session:
        repository = AuditLogRepository(RepositoryContext(session=session, tenant_id=tenant_id))
        items = await repository.list_recent_entries(
            tenant_id=tenant_id,
            limit=12,
            event_type="outbox.event.dispatched",
        )
    return _success_response(
        {
            "items": items,
        },
        tenant_id=tenant_id,
        actor_context=actor_context,
    )


@router.get("/integrations/outbox/backlog")
async def integration_outbox_backlog(request: Request):
    actor_context = ActorContextPayload(channel="admin", role="integration_preview", deployment_mode="headless_api")
    tenant_id = await _resolve_tenant_id(request, actor_context)
    async with get_session(request.app.state.session_factory) as session:
        backlog = await build_outbox_backlog(session, tenant_id=tenant_id or "")
    return _success_response(
        backlog,
        tenant_id=tenant_id,
        actor_context=actor_context,
    )


@router.post("/integrations/outbox/dispatch")
async def dispatch_outbox_events(request: Request, payload: DispatchOutboxRequestPayload):
    actor_context = payload.actor_context or ActorContextPayload(
        channel="admin",
        role="integration_preview",
        deployment_mode="headless_api",
    )
    tenant_id = await _resolve_tenant_id(request, actor_context)
    dispatch_limit = max(1, min(payload.limit, 25))

    async with get_session(request.app.state.session_factory) as session:
        tracked_result = await run_tracked_outbox_dispatch(
            session,
            dispatcher=lambda event: dispatch_phase2_outbox_event(session, event),
            tenant_id=tenant_id,
            limit=dispatch_limit,
        )
        await session.commit()

    return _success_response(
        {
            "job_run_id": tracked_result.job_run_id,
            "dispatch_status": tracked_result.result.status,
            "detail": tracked_result.result.detail,
            "retryable": tracked_result.result.retryable,
            "metadata": tracked_result.result.metadata,
        },
        tenant_id=tenant_id,
        actor_context=actor_context,
    )


@router.post("/integrations/outbox/replay")
async def replay_outbox_event(request: Request, payload: ReplayOutboxEventRequestPayload):
    actor_context = payload.actor_context or ActorContextPayload(
        channel="admin",
        role="integration_recovery",
        deployment_mode="headless_api",
    )
    tenant_id = await _resolve_tenant_id(request, actor_context)

    async with get_session(request.app.state.session_factory) as session:
        outbox_repository = OutboxRepository(RepositoryContext(session=session, tenant_id=tenant_id))
        replayed_event = await outbox_repository.requeue_event(
            payload.outbox_event_id,
            tenant_id=tenant_id,
        )
        if not replayed_event:
            return _error_response(
                AppError(
                    code="outbox_event_not_found",
                    message="The requested outbox event could not be replayed.",
                    status_code=404,
                    details={"outbox_event_id": payload.outbox_event_id},
                ),
                tenant_id=tenant_id,
                actor_context=actor_context,
            )

        audit_repository = AuditLogRepository(RepositoryContext(session=session, tenant_id=tenant_id))
        await audit_repository.append_entry(
            tenant_id=tenant_id,
            event_type="outbox.event.requeued",
            entity_type=replayed_event.get("aggregate_type") or "outbox_event",
            entity_id=replayed_event.get("aggregate_id"),
            actor_type=actor_context.channel,
            actor_id=actor_context.actor_id,
            payload={
                "outbox_event_id": replayed_event.get("id"),
                "outbox_event_type": replayed_event.get("event_type"),
                "aggregate_type": replayed_event.get("aggregate_type"),
                "aggregate_id": replayed_event.get("aggregate_id"),
                "idempotency_key": replayed_event.get("idempotency_key"),
            },
        )
        await session.commit()

    return _success_response(
        {
            "outbox_event_id": replayed_event.get("id"),
            "status": replayed_event.get("status"),
            "available_at": replayed_event.get("available_at"),
            "warnings": [
                "Replay only re-queues the event. Run outbox dispatch again to attempt delivery."
            ],
        },
        tenant_id=tenant_id,
        actor_context=actor_context,
    )


@router.get("/tenant/overview")
async def tenant_overview(request: Request):
    tenant_ref = request.query_params.get("tenant_ref")
    async with get_session(request.app.state.session_factory) as session:
        tenant_repository = TenantRepository(RepositoryContext(session=session))
        tenant_id = await tenant_repository.resolve_tenant_id(tenant_ref)
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

        overview = await build_tenant_overview(session, tenant_ref=tenant_ref or tenant_id)
    return _success_response(
        overview,
        tenant_id=tenant_id,
        actor_context=ActorContextPayload(
            channel="tenant_app",
            tenant_id=tenant_id,
            role="tenant_admin",
            deployment_mode="standalone_app",
        ),
    )


@router.get("/tenant/bookings")
async def tenant_bookings(request: Request):
    tenant_ref = request.query_params.get("tenant_ref")
    async with get_session(request.app.state.session_factory) as session:
        tenant_repository = TenantRepository(RepositoryContext(session=session))
        tenant_id = await tenant_repository.resolve_tenant_id(tenant_ref)
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

        snapshot = await build_tenant_bookings_snapshot(session, tenant_ref=tenant_ref or tenant_id)
    return _success_response(
        snapshot,
        tenant_id=tenant_id,
        actor_context=ActorContextPayload(
            channel="tenant_app",
            tenant_id=tenant_id,
            role="tenant_admin",
            deployment_mode="standalone_app",
        ),
    )


@router.get("/tenant/integrations")
async def tenant_integrations(request: Request):
    tenant_ref = request.query_params.get("tenant_ref")
    async with get_session(request.app.state.session_factory) as session:
        tenant_repository = TenantRepository(RepositoryContext(session=session))
        tenant_id = await tenant_repository.resolve_tenant_id(tenant_ref)
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

        snapshot = await build_tenant_integrations_snapshot(session, tenant_ref=tenant_ref or tenant_id)
    return _success_response(
        snapshot,
        tenant_id=tenant_id,
        actor_context=ActorContextPayload(
            channel="tenant_app",
            tenant_id=tenant_id,
            role="tenant_admin",
            deployment_mode="standalone_app",
        ),
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
