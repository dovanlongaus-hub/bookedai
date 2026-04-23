from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field


class MatchRequestContract(BaseModel):
    query: str
    location_hint: str | None = None
    budget_hint: str | None = None
    tenant_id: str | None = None
    provider_hint: str | None = None
    service_types: list[str] = Field(default_factory=list)
    metadata: dict[str, Any] = Field(default_factory=dict)


class MatchCandidateContract(BaseModel):
    candidate_id: str
    provider_name: str
    service_name: str
    source_type: str
    category: str | None = None
    summary: str | None = None
    venue_name: str | None = None
    location: str | None = None
    booking_url: str | None = None
    contact_phone: str | None = None
    map_url: str | None = None
    source_url: str | None = None
    image_url: str | None = None
    amount_aud: float | None = None
    currency_code: str | None = None
    display_price: str | None = None
    duration_minutes: int | None = None
    tags: list[str] = Field(default_factory=list)
    featured: bool = False
    distance_km: float | None = None
    match_score: float | None = Field(default=None, ge=0, le=1)
    semantic_score: float | None = Field(default=None, ge=0, le=1)
    trust_signal: str | None = None
    is_preferred: bool = False
    display_summary: str | None = None
    explanation: str | None = None
    why_this_matches: str | None = None
    source_label: str | None = None
    price_posture: str | None = None
    booking_path_type: str | None = None
    next_step: str | None = None
    availability_state: str | None = None
    booking_confidence: str | None = None
    booking_fit: "MatchBookingFitContract | None" = None


class MatchBookingFitContract(BaseModel):
    budget_fit: Literal["within_budget", "over_budget", "unknown"] = "unknown"
    party_size_fit: Literal["supported", "manual_review", "unknown"] = "unknown"
    schedule_fit: Literal["booking_ready", "manual_confirmation", "unknown"] = "unknown"
    location_fit: Literal["aligned", "online_flexible", "unknown", "mismatch"] = "unknown"
    booking_readiness: Literal["instant_book", "partner_redirect", "manual_review", "advisory"] = "advisory"
    summary: str | None = None


class MatchConfidenceContract(BaseModel):
    score: float = Field(ge=0, le=1)
    reason: str | None = None
    evidence: list[str] = Field(default_factory=list)
    gating_state: Literal["high", "medium", "low", "unknown"] = "unknown"


class MatchResultContract(BaseModel):
    request: MatchRequestContract
    request_id: str | None = None
    candidates: list[MatchCandidateContract] = Field(default_factory=list)
    recommendations: list["MatchRecommendationContract"] = Field(default_factory=list)
    confidence: MatchConfidenceContract
    selected_candidate_id: str | None = None
    next_action: str | None = None
    search_strategy: str | None = None
    warnings: list[str] = Field(default_factory=list)
    query_context: "MatchQueryContextContract | None" = None
    booking_context: "MatchBookingContextContract | None" = None
    query_understanding: "MatchQueryUnderstandingContract | None" = None
    semantic_assist: "MatchSemanticAssistContract | None" = None
    search_diagnostics: "MatchSearchDiagnosticsContract | None" = None


class MatchRecommendationContract(BaseModel):
    candidate_id: str
    reason: str | None = None
    path_type: str | None = None
    next_step: str | None = None
    warnings: list[str] = Field(default_factory=list)
    booking_fit: MatchBookingFitContract | None = None


class MatchQueryContextContract(BaseModel):
    near_me_requested: bool = False
    location_permission_needed: bool = False
    is_chat_style: bool = False
    has_user_location: bool = False


class MatchBookingContextContract(BaseModel):
    party_size: int | None = None
    requested_date: str | None = None
    requested_time: str | None = None
    schedule_hint: str | None = None
    intent_label: str | None = None
    summary: str | None = None


class MatchQueryUnderstandingContract(BaseModel):
    normalized_query: str | None = None
    inferred_location: str | None = None
    location_terms: list[str] = Field(default_factory=list)
    core_intent_terms: list[str] = Field(default_factory=list)
    expanded_intent_terms: list[str] = Field(default_factory=list)
    constraint_terms: list[str] = Field(default_factory=list)
    requested_category: str | None = None
    budget_limit: float | None = None
    near_me_requested: bool = False
    is_chat_style: bool = False
    requested_date: str | None = None
    requested_time: str | None = None
    schedule_hint: str | None = None
    party_size: int | None = None
    intent_label: str | None = None
    summary: str | None = None


class MatchSemanticAssistContract(BaseModel):
    applied: bool = False
    provider: str | None = None
    provider_chain: list[str] = Field(default_factory=list)
    fallback_applied: bool = False
    normalized_query: str | None = None
    inferred_location: str | None = None
    inferred_category: str | None = None
    budget_summary: str | None = None
    evidence: list[str] = Field(default_factory=list)


class MatchSearchDiagnosticsDropContract(BaseModel):
    candidate_id: str
    stage: str
    reason: str


class MatchSearchDiagnosticsStageContract(BaseModel):
    stage: str
    candidate_count: int = 0


class MatchSearchDiagnosticsContract(BaseModel):
    effective_location_hint: str | None = None
    relevance_location_hint: str | None = None
    semantic_rollout_enabled: bool = False
    semantic_applied: bool = False
    retrieval_candidate_count: int = 0
    heuristic_candidate_ids: list[str] = Field(default_factory=list)
    semantic_candidate_ids: list[str] = Field(default_factory=list)
    post_relevance_candidate_ids: list[str] = Field(default_factory=list)
    post_domain_candidate_ids: list[str] = Field(default_factory=list)
    final_candidate_ids: list[str] = Field(default_factory=list)
    dropped_candidates: list[MatchSearchDiagnosticsDropContract] = Field(default_factory=list)
    stage_counts: list[MatchSearchDiagnosticsStageContract] = Field(default_factory=list)


MatchCandidateContract.model_rebuild()
MatchRecommendationContract.model_rebuild()
MatchResultContract.model_rebuild()
