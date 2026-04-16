from __future__ import annotations

from core.contracts.ai_router import (
    FallbackResultContract,
    GroundingResultContract,
    ProviderSelectionResultContract,
    SynthesisResultContract,
)


class AIRouterService:
    """Foundation seam for multi-provider routing, grounding, and fallback decisions."""

    def select_provider(self, *, provider: str, model: str, reason: str | None = None) -> ProviderSelectionResultContract:
        return ProviderSelectionResultContract(provider=provider, model=model, reason=reason)

    def build_grounding_result(self, *, source_type: str, source_count: int = 0) -> GroundingResultContract:
        return GroundingResultContract(source_type=source_type, source_count=source_count)

    def build_synthesis_result(self, *, summary: str, confidence: float) -> SynthesisResultContract:
        return SynthesisResultContract(summary=summary, confidence=confidence)

    def deterministic_fallback(self, *notes: str) -> FallbackResultContract:
        return FallbackResultContract(activated=True, strategy="deterministic", notes=list(notes))

