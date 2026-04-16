from __future__ import annotations

from pydantic import BaseModel, Field


class ProviderSelectionResultContract(BaseModel):
    provider: str
    model: str
    reason: str | None = None


class GroundingResultContract(BaseModel):
    source_type: str
    source_count: int = 0
    confidence: float = 0.0
    freshness_note: str | None = None


class SynthesisResultContract(BaseModel):
    summary: str
    confidence: float = 0.0
    requires_confirmation: bool = False


class FallbackResultContract(BaseModel):
    activated: bool = False
    strategy: str | None = None
    notes: list[str] = Field(default_factory=list)

