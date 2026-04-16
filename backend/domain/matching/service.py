from __future__ import annotations

from core.contracts.matching import MatchConfidenceContract, MatchRequestContract, MatchResultContract


class MatchingService:
    """Foundation seam for request normalization, candidate retrieval, and ranking."""

    def build_empty_result(self, request: MatchRequestContract) -> MatchResultContract:
        return MatchResultContract(
            request=request,
            candidates=[],
            confidence=MatchConfidenceContract(score=0.0, reason="no_candidates"),
        )

