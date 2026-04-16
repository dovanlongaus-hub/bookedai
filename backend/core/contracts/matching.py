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
    distance_km: float | None = None
    match_score: float | None = Field(default=None, ge=0, le=1)
    trust_signal: str | None = None
    is_preferred: bool = False
    explanation: str | None = None


class MatchConfidenceContract(BaseModel):
    score: float = Field(ge=0, le=1)
    reason: str | None = None
    evidence: list[str] = Field(default_factory=list)
    gating_state: Literal["high", "medium", "low", "unknown"] = "unknown"


class MatchResultContract(BaseModel):
    request: MatchRequestContract
    candidates: list[MatchCandidateContract] = Field(default_factory=list)
    confidence: MatchConfidenceContract
    selected_candidate_id: str | None = None
    next_action: str | None = None
    search_strategy: str | None = None
