from __future__ import annotations

from typing import Any

from fastapi import Request
from pydantic import BaseModel, Field

from api.v1_routes import (
    ActorContextPayload,
    AttributionContextPayload,
    BookingChannelContextPayload,
    CheckAvailabilityRequestPayload,
    SearchCandidatesRequestPayload,
    ServiceMerchantProfile,
    _build_catalog_recommendations,
    _build_match_confidence_payload,
    _build_price_posture,
    _build_public_web_fallback_candidates,
    _build_search_filters,
    _build_candidate_source_label,
    _candidate_drop_entries,
    _candidate_ids_from_matches,
    _candidate_ids_from_payload,
    _error_response,
    _filter_ranked_matches_for_semantic_domain,
    _resolve_tenant_id,
    _success_response,
    and_,
    apply_deterministic_ranking_policy,
    build_booking_trust_payload,
    build_canonical_query_understanding,
    desc,
    extract_booking_request_context,
    filter_ranked_matches_for_display_quality,
    filter_ranked_matches_for_relevance,
    get_session,
    is_chat_style_query,
    is_flag_enabled,
    is_near_me_requested,
    logger,
    rank_catalog_matches,
    resolve_booking_path_policy,
    select,
    uuid4,
)
from core.contracts.matching import MatchRequestContract
from domain.matching.service import MatchingService


class CustomerAgentMessagePayload(BaseModel):
    role: str
    content: str


class CustomerAgentTurnRequestPayload(BaseModel):
    message: str
    conversation_id: str | None = None
    messages: list[CustomerAgentMessagePayload] = Field(default_factory=list, max_length=12)
    location: str | None = None
    preferences: dict[str, Any] | None = None
    budget: dict[str, Any] | None = None
    time_window: dict[str, Any] | None = None
    channel_context: BookingChannelContextPayload
    attribution: AttributionContextPayload | None = None
    user_location: dict[str, Any] | None = None
    context: dict[str, Any] = Field(default_factory=dict)


def _agent_clean_text(value: object) -> str:
    return str(value or "").strip()


def _agent_missing_context(query: str, search_data: dict[str, Any]) -> list[str]:
    normalized = query.lower()
    query_context = search_data.get("query_context") if isinstance(search_data.get("query_context"), dict) else {}
    query_understanding = (
        search_data.get("query_understanding")
        if isinstance(search_data.get("query_understanding"), dict)
        else {}
    )
    missing: list[str] = []
    has_location = bool(
        _agent_clean_text(query_understanding.get("inferred_location"))
        or _agent_clean_text(query_understanding.get("location_terms"))
        or any(token in normalized for token in (" near ", " in ", " around ", " sydney", "melbourne", "brisbane"))
    )
    has_timing = bool(
        _agent_clean_text(query_understanding.get("requested_date"))
        or _agent_clean_text(query_understanding.get("requested_time"))
        or any(token in normalized for token in ("today", "tomorrow", "weekend", "morning", "afternoon", "tonight"))
    )
    has_brief = len([part for part in normalized.split() if part]) >= 6
    if not has_location or query_context.get("location_permission_needed"):
        missing.append("location")
    if not has_timing:
        missing.append("timing")
    if not has_brief:
        missing.append("brief")
    return missing


def _agent_suggestions(query: str, missing_context: list[str]) -> list[dict[str, str]]:
    normalized = query.strip()
    service_hint = normalized or "service"
    suggestions: list[dict[str, str]] = []
    if "location" in missing_context:
        suggestions.append(
            {
                "label": "Add area",
                "query": f"{service_hint} near Sydney CBD".strip(),
            }
        )
    if "timing" in missing_context:
        suggestions.append(
            {
                "label": "Add timing",
                "query": f"{service_hint} this weekend".strip(),
            }
        )
    if "brief" in missing_context:
        suggestions.append(
            {
                "label": "Add brief",
                "query": f"{service_hint} for a first booking with clear pricing".strip(),
            }
        )
    if not suggestions:
        suggestions.extend(
            [
                {"label": "Closest option", "query": f"{service_hint} closest available".strip()},
                {"label": "Premium option", "query": f"{service_hint} premium provider".strip()},
                {"label": "Fastest booking", "query": f"{service_hint} earliest available".strip()},
            ]
        )
    return suggestions[:4]


def _build_customer_agent_reply(
    *,
    query: str,
    search_data: dict[str, Any],
    missing_context: list[str],
) -> str:
    candidates = search_data.get("candidates") if isinstance(search_data.get("candidates"), list) else []
    warnings = search_data.get("warnings") if isinstance(search_data.get("warnings"), list) else []
    query_understanding = (
        search_data.get("query_understanding")
        if isinstance(search_data.get("query_understanding"), dict)
        else {}
    )
    normalized_query = _agent_clean_text(query_understanding.get("normalized_query")) or query.strip()
    location = _agent_clean_text(query_understanding.get("inferred_location"))
    if candidates:
        lead = candidates[0] if isinstance(candidates[0], dict) else {}
        provider = _agent_clean_text(lead.get("provider_name"))
        service = _agent_clean_text(lead.get("service_name"))
        location_line = f" around {location}" if location else ""
        warning_line = f" I also found {len(warnings)} trust note{'s' if len(warnings) != 1 else ''} to keep visible." if warnings else ""
        return (
            f"I found {len(candidates)} ranked option{'s' if len(candidates) != 1 else ''}{location_line} for "
            f"\"{normalized_query}\". The strongest first match is {service or 'this service'}"
            f"{f' from {provider}' if provider else ''}. Review the shortlist, then choose one and I will carry the context into booking."
            f"{warning_line}"
        )
    if missing_context:
        if "location" in missing_context and "timing" in missing_context:
            return "I can help, but I need the area and preferred timing before ranking the shortlist safely."
        if "location" in missing_context:
            return "I can help, but I need the area before ranking nearby or online-ready options."
        if "timing" in missing_context:
            return "I can help, but I need the preferred day or time window before ranking booking-ready options."
        return "I can help. Add one more detail about who this is for or what matters most, then I can rank stronger matches."
    return "I could not find a strong display-safe match yet. Try a nearby service phrase, area, or timing and I will search again."


async def customer_agent_turn(request: Request, payload: CustomerAgentTurnRequestPayload):
    trimmed_message = payload.message.strip()
    actor_context = ActorContextPayload(
        channel=payload.channel_context.channel,
        tenant_id=payload.channel_context.tenant_id,
        tenant_ref=payload.channel_context.tenant_ref,
        deployment_mode=payload.channel_context.deployment_mode,
    )
    tenant_id = await _resolve_tenant_id(request, actor_context)
    if not trimmed_message:
        return _success_response(
            {
                "agent_turn_id": f"agent_turn_{uuid4().hex[:12]}",
                "conversation_id": payload.conversation_id or f"conv_{uuid4().hex[:12]}",
                "reply": "Send me what you want to book and I will search, clarify, then hand the right context into booking.",
                "phase": "clarify",
                "missing_context": ["brief"],
                "suggestions": [{"label": "Start", "query": "kids activity near me this weekend"}],
                "search": None,
                "handoff": {
                    "next_agent": "search_and_conversation",
                    "revenue_ops_ready": False,
                    "reason": "No customer intent has been supplied yet.",
                },
            },
            tenant_id=tenant_id,
            actor_context=actor_context,
        )

    search_payload = SearchCandidatesRequestPayload(
        query=trimmed_message,
        location=payload.location,
        preferences=payload.preferences,
        budget=payload.budget,
        time_window=payload.time_window,
        channel_context=payload.channel_context,
        attribution=payload.attribution,
        user_location=payload.user_location,
        chat_context=[message.model_dump(mode="json") for message in payload.messages],
    )
    search_envelope = await search_candidates(request, search_payload)
    search_data = dict(getattr(search_envelope, "data", {}) or {})
    missing_context = _agent_missing_context(trimmed_message, search_data)
    candidates = search_data.get("candidates") if isinstance(search_data.get("candidates"), list) else []
    phase = "match" if candidates else ("clarify" if missing_context else "no_match")
    reply = _build_customer_agent_reply(
        query=trimmed_message,
        search_data=search_data,
        missing_context=missing_context,
    )

    return _success_response(
        {
            "agent_turn_id": f"agent_turn_{uuid4().hex[:12]}",
            "conversation_id": payload.conversation_id or f"conv_{uuid4().hex[:12]}",
            "reply": reply,
            "phase": phase,
            "missing_context": missing_context,
            "suggestions": _agent_suggestions(trimmed_message, missing_context),
            "search": search_data,
            "handoff": {
                "next_agent": "revenue_operations" if candidates else "search_and_conversation",
                "revenue_ops_ready": bool(candidates),
                "reason": (
                    "A shortlist is ready; revenue operations can be queued after booking confirmation."
                    if candidates
                    else "The customer-facing agent still needs enough context before booking or revenue handoff."
                ),
            },
        },
        tenant_id=tenant_id,
        actor_context=actor_context,
    )


async def search_candidates(request: Request, payload: SearchCandidatesRequestPayload):
    matching_service = MatchingService()
    actor_context = ActorContextPayload(
        channel=payload.channel_context.channel,
        tenant_id=payload.channel_context.tenant_id,
        tenant_ref=payload.channel_context.tenant_ref,
        deployment_mode=payload.channel_context.deployment_mode,
    )
    tenant_id = await _resolve_tenant_id(request, actor_context)
    strict_catalog_only = bool(actor_context.tenant_id or actor_context.tenant_ref) and (
        actor_context.channel not in {"public_web", "embedded_widget"}
        or actor_context.deployment_mode in {"embedded_widget", "plugin_integrated"}
    )
    semantic_rollout_enabled = False
    query_understanding = build_canonical_query_understanding(
        payload.query,
        location_hint=payload.location,
        requested_category=str((payload.preferences or {}).get("service_category") or ""),
        budget=payload.budget,
        time_window=payload.time_window,
    )
    effective_location_hint = query_understanding.inferred_location
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
        if tenant_id:
            statement = statement.where(ServiceMerchantProfile.tenant_id == tenant_id)
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
    heuristic_ranked_matches = list(ranked_matches)
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
    semantic_ranked_matches = list(ranked_matches)
    semantic_applied = bool(semantic_assist and semantic_assist.get("applied"))
    relevance_location_hint = effective_location_hint
    if (
        near_me
        and user_location
        and not relevance_location_hint
        and semantic_assist
        and semantic_assist.get("inferred_location")
    ):
        relevance_location_hint = str(semantic_assist.get("inferred_location") or "").strip() or None

    location_required = bool(near_me and relevance_location_hint)
    pre_relevance_matches = list(ranked_matches)
    ranked_matches = filter_ranked_matches_for_relevance(
        ranked_matches,
        semantic_applied=semantic_applied,
        require_location_match=location_required,
        location_hint=relevance_location_hint,
    )
    relevance_ranked_matches = list(ranked_matches)
    if semantic_applied:
        pre_domain_matches = list(ranked_matches)
        ranked_matches = _filter_ranked_matches_for_semantic_domain(
            ranked_matches,
            query=payload.query,
            inferred_category=(
                str(semantic_assist.get("inferred_category") or "").strip()
                if semantic_assist
                else None
            ),
            location_hint=relevance_location_hint,
        )
    else:
        pre_domain_matches = list(ranked_matches)
    domain_ranked_matches = list(ranked_matches)
    pre_display_matches = list(ranked_matches)
    ranked_matches = filter_ranked_matches_for_display_quality(
        ranked_matches,
        semantic_applied=semantic_applied,
    )
    display_ranked_matches = list(ranked_matches)
    ranked_matches = apply_deterministic_ranking_policy(
        ranked_matches,
        query_understanding=query_understanding,
    )
    if near_me and not user_location and location_permission_needed and not effective_location_hint:
        ranked_matches = []
    final_ranked_matches = list(ranked_matches)
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
            "currency_code": getattr(match.service, "currency_code", None),
            "display_price": getattr(match.service, "display_price", None),
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
            "why_this_matches": match.explanation,
            "source_label": _build_candidate_source_label(
                source_type="service_catalog",
                trust_signal=match.trust_signal,
            ),
            "price_posture": _build_price_posture(
                display_price=getattr(match.service, "display_price", None),
                amount_aud=getattr(match.service, "amount_aud", None),
            ),
            "booking_path_type": None,
            "next_step": None,
            "availability_state": None,
            "booking_confidence": None,
        }
        for match in ranked_matches[:8]
    ]
    openai_service = getattr(request.app.state, "openai_service", None)
    public_web_fallback_candidates: list[dict[str, Any]] = []
    if (
        not candidates
        and not strict_catalog_only
        and openai_service is not None
        and not (near_me and not user_location and location_permission_needed and not effective_location_hint)
        and hasattr(openai_service, "search_public_service_candidates")
    ):
        try:
            web_results = await openai_service.search_public_service_candidates(
                query=payload.query,
                location_hint=relevance_location_hint,
                user_location=user_location,
                booking_context={
                    "party_size": booking_request_context.party_size,
                    "requested_date": booking_request_context.requested_date,
                    "requested_time": booking_request_context.requested_time,
                    "schedule_hint": booking_request_context.schedule_hint,
                    "intent_label": booking_request_context.intent_label,
                    "summary": booking_request_context.summary,
                },
                budget=payload.budget,
                preferences=payload.preferences,
            )
        except Exception:
            web_results = []

        public_web_fallback_candidates = _build_public_web_fallback_candidates(web_results)

        if public_web_fallback_candidates:
            candidates = public_web_fallback_candidates
    recommendations = []
    if candidates:
        if ranked_matches:
            recommendations, recommendation_detail_by_candidate_id = _build_catalog_recommendations(
                ranked_matches,
                limit=3,
                booking_request_context=booking_request_context,
            )
            candidates = [
                {
                    **candidate,
                    **recommendation_detail_by_candidate_id.get(str(candidate.get("candidate_id") or ""), {}),
                }
                for candidate in candidates
            ]

    warnings: list[str] = []
    if not candidates:
        warnings.append("No strong relevant catalog candidates were found.")
    elif public_web_fallback_candidates:
        warnings.append("No strong tenant catalog candidates were found, so BookedAI is showing sourced public web options.")
    if location_permission_needed:
        warnings.append("Location access is needed to find services near you.")

    confidence_payload = _build_match_confidence_payload(ranked_matches)
    if public_web_fallback_candidates and not ranked_matches:
        confidence_payload = {
            "score": max(
                0.38,
                min(
                    max(float(item.get("match_score") or 0.0) for item in public_web_fallback_candidates),
                    0.72,
                ),
            ),
            "reason": "No strong tenant catalog candidate was found, so BookedAI switched to sourced public web results.",
            "gating_state": "medium",
            "evidence": ["public_web_search_fallback"],
        }

    search_diagnostics = {
        "effective_location_hint": effective_location_hint,
        "relevance_location_hint": relevance_location_hint,
        "semantic_rollout_enabled": semantic_rollout_enabled,
        "semantic_applied": semantic_applied,
        "retrieval_candidate_count": len(services),
        "heuristic_candidate_ids": _candidate_ids_from_matches(heuristic_ranked_matches),
        "semantic_candidate_ids": _candidate_ids_from_matches(semantic_ranked_matches),
        "post_relevance_candidate_ids": _candidate_ids_from_matches(relevance_ranked_matches),
        "post_domain_candidate_ids": _candidate_ids_from_matches(domain_ranked_matches),
        "final_candidate_ids": (
            _candidate_ids_from_payload(public_web_fallback_candidates)
            if public_web_fallback_candidates
            else _candidate_ids_from_matches(final_ranked_matches)
        ),
        "dropped_candidates": [
            *_candidate_drop_entries(
                pre_relevance_matches,
                relevance_ranked_matches,
                stage="relevance_gate",
                reason=(
                    "location_required"
                    if location_required
                    else "low_relevance_or_topic_mismatch"
                ),
            ),
            *_candidate_drop_entries(
                pre_domain_matches,
                domain_ranked_matches,
                stage="semantic_domain_gate",
                reason="semantic_domain_mismatch",
            ),
            *_candidate_drop_entries(
                pre_display_matches,
                display_ranked_matches,
                stage="display_quality_gate",
                reason="weak_top_match_or_low_display_confidence",
            ),
            *_candidate_drop_entries(
                display_ranked_matches,
                final_ranked_matches,
                stage="location_permission_gate",
                reason="location_permission_required",
            ),
        ],
    }
    logger.info(
        "matching_search_diagnostics",
        extra={
            "request_id": "",
            "tenant_id": tenant_id or "",
            "route": "/api/v1/matching/search",
            "status": 200,
            "search_strategy": search_strategy,
            "semantic_provider": (
                str(semantic_assist.get("provider") or "")
                if semantic_assist
                else ""
            ),
            "search_diagnostics": search_diagnostics,
        },
    )

    request_id = f"match_{uuid4().hex[:12]}"
    result = matching_service.build_result(
        request=MatchRequestContract(
            query=payload.query,
            location_hint=payload.location,
            budget_hint=str((payload.budget or {}).get("max_aud") or ""),
            tenant_id=tenant_id,
            service_types=[
                value
                for value in [
                    str((payload.preferences or {}).get("service_category") or "").strip() or None,
                    str((payload.preferences or {}).get("requested_service_id") or "").strip() or None,
                ]
                if value
            ],
            metadata={
                "channel": payload.channel_context.channel,
                "deployment_mode": payload.channel_context.deployment_mode,
            },
        ),
        request_id=request_id,
        candidates=candidates,
        recommendations=recommendations,
        confidence=confidence_payload,
        warnings=warnings,
        search_strategy=(
            f"{search_strategy}_plus_public_web_search"
            if public_web_fallback_candidates
            else search_strategy
        ),
        query_context={
            "near_me_requested": near_me,
            "location_permission_needed": location_permission_needed,
            "is_chat_style": chat_style,
            "has_user_location": bool(user_location),
        },
        booking_context={
            "party_size": booking_request_context.party_size,
            "requested_date": booking_request_context.requested_date,
            "requested_time": booking_request_context.requested_time,
            "schedule_hint": booking_request_context.schedule_hint,
            "intent_label": booking_request_context.intent_label,
            "summary": booking_request_context.summary,
        },
        query_understanding={
            "normalized_query": query_understanding.normalized_query,
            "inferred_location": query_understanding.inferred_location,
            "location_terms": list(query_understanding.location_terms),
            "core_intent_terms": list(query_understanding.core_intent_terms),
            "expanded_intent_terms": list(query_understanding.expanded_intent_terms),
            "constraint_terms": list(query_understanding.constraint_terms),
            "requested_category": query_understanding.requested_category,
            "budget_limit": query_understanding.budget_limit,
            "near_me_requested": query_understanding.near_me_requested,
            "is_chat_style": query_understanding.is_chat_style,
            "requested_date": query_understanding.requested_date,
            "requested_time": query_understanding.requested_time,
            "schedule_hint": query_understanding.schedule_hint,
            "party_size": query_understanding.party_size,
            "intent_label": query_understanding.intent_label,
            "summary": query_understanding.summary,
        },
        semantic_assist=semantic_assist
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
        search_diagnostics=search_diagnostics,
    )

    return _success_response(
        result.model_dump(mode="json"),
        tenant_id=tenant_id,
        actor_context=actor_context,
    )


async def check_availability(request: Request, payload: CheckAvailabilityRequestPayload):
    tenant_id = await _resolve_tenant_id(request, payload.actor_context)
    async with get_session(request.app.state.session_factory) as session:
        statement = select(ServiceMerchantProfile).where(
            ServiceMerchantProfile.service_id == payload.candidate_id
        )
        if tenant_id:
            statement = statement.where(ServiceMerchantProfile.tenant_id == tenant_id)
        service = (await session.execute(statement)).scalar_one_or_none()

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
