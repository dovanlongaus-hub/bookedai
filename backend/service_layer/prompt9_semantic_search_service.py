from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from integrations.ai_models import (
    SemanticSearchAdapter,
    SemanticSearchAssessment,
    SemanticSearchCandidateInput,
)
from service_layer.prompt9_matching_service import RankedServiceMatch


@dataclass(frozen=True)
class SemanticSearchOutcome:
    ranked_matches: list[RankedServiceMatch]
    applied: bool
    strategy: str
    evidence: tuple[str, ...]
    provider: str | None = None


class Prompt9SemanticSearchService:
    def __init__(self, adapter: SemanticSearchAdapter) -> None:
        self.adapter = adapter

    def is_configured(self) -> bool:
        return self.adapter.is_configured()

    async def assist_catalog_ranking(
        self,
        *,
        query: str,
        location_hint: str | None,
        budget: dict[str, Any] | None,
        preferences: dict[str, Any] | None,
        ranked_matches: list[RankedServiceMatch],
    ) -> SemanticSearchOutcome:
        if not self.is_configured() or len(ranked_matches) < 2:
            return SemanticSearchOutcome(
                ranked_matches=ranked_matches,
                applied=False,
                strategy="catalog_term_retrieval_with_prompt9_rerank",
                evidence=(),
            )

        candidate_limit = max(1, self.adapter.settings.semantic_search_max_candidates)
        shortlisted_matches = ranked_matches[:candidate_limit]
        assessment = await self.adapter.assess_catalog_candidates(
            query=query,
            location_hint=location_hint,
            budget=budget,
            preferences=preferences,
            candidates=[self._to_candidate_input(match) for match in shortlisted_matches],
        )
        if not assessment or not assessment.ranked_candidates:
            return SemanticSearchOutcome(
                ranked_matches=ranked_matches,
                applied=False,
                strategy="catalog_term_retrieval_with_prompt9_rerank",
                evidence=(),
            )

        reassessed_matches = self._apply_assessment(ranked_matches, assessment)
        evidence = tuple(dict.fromkeys([*assessment.evidence, "semantic_model_rerank"]))
        return SemanticSearchOutcome(
            ranked_matches=reassessed_matches,
            applied=True,
            strategy="catalog_term_retrieval_with_prompt9_rerank_plus_semantic_model_assist",
            evidence=evidence,
            provider=assessment.provider_label,
        )

    @staticmethod
    def _to_candidate_input(match: RankedServiceMatch) -> SemanticSearchCandidateInput:
        return SemanticSearchCandidateInput(
            candidate_id=str(getattr(match.service, "service_id", "") or ""),
            provider_name=str(getattr(match.service, "business_name", "") or ""),
            service_name=str(getattr(match.service, "name", "") or ""),
            category=str(getattr(match.service, "category", "") or "").strip() or None,
            summary=str(getattr(match.service, "summary", "") or "").strip() or None,
            location=str(getattr(match.service, "location", "") or "").strip() or None,
            venue_name=str(getattr(match.service, "venue_name", "") or "").strip() or None,
            tags=tuple(
                str(tag).strip()
                for tag in (getattr(match.service, "tags_json", None) or [])
                if str(tag).strip()
            ),
            amount_aud=getattr(match.service, "amount_aud", None),
            featured=bool(getattr(match.service, "featured", 0)),
            has_booking_url=bool(getattr(match.service, "booking_url", None)),
            heuristic_score=match.score,
            heuristic_reason=match.explanation,
        )

    @staticmethod
    def _apply_assessment(
        ranked_matches: list[RankedServiceMatch],
        assessment: SemanticSearchAssessment,
    ) -> list[RankedServiceMatch]:
        semantic_map = {item.candidate_id: item for item in assessment.ranked_candidates}
        updated_matches: list[RankedServiceMatch] = []

        for match in ranked_matches:
            service_id = str(getattr(match.service, "service_id", "") or "")
            semantic = semantic_map.get(service_id)
            if semantic is None:
                updated_matches.append(match)
                continue

            weighted_score = max(0.0, min((match.score * 0.7) + (semantic.semantic_score * 0.3), 0.99))
            explanation_parts = [match.explanation]
            if semantic.reason and semantic.reason not in match.explanation:
                explanation_parts.append(f"Semantic fit: {semantic.reason}")
            updated_matches.append(
                RankedServiceMatch(
                    service=match.service,
                    score=weighted_score,
                    explanation=" ".join(part for part in explanation_parts if part).strip(),
                    trust_signal=semantic.trust_signal or match.trust_signal,
                    is_preferred=match.is_preferred or semantic.is_preferred,
                    evidence=tuple(
                        dict.fromkeys([*match.evidence, *semantic.evidence, "semantic_model_rerank"])
                    ),
                    semantic_score=semantic.semantic_score,
                    semantic_reason=semantic.reason,
                )
            )

        updated_matches.sort(
            key=lambda item: (
                item.score,
                item.semantic_score if item.semantic_score is not None else -1.0,
                1 if getattr(item.service, "booking_url", None) else 0,
                getattr(item.service, "featured", 0),
            ),
            reverse=True,
        )
        return updated_matches
