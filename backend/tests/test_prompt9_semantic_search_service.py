from __future__ import annotations

from pathlib import Path
import sys
from types import SimpleNamespace
from unittest import IsolatedAsyncioTestCase

BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from integrations.ai_models import (
    SemanticSearchAssessment,
    SemanticSearchCandidateAssessment,
)
from service_layer.prompt9_matching_service import RankedServiceMatch
from service_layer.prompt9_semantic_search_service import Prompt9SemanticSearchService


class Prompt9SemanticSearchServiceTestCase(IsolatedAsyncioTestCase):
    async def test_assist_catalog_ranking_merges_semantic_scores_and_strategy(self):
        ranked_matches = [
            RankedServiceMatch(
                service=SimpleNamespace(
                    service_id="svc_a",
                    business_name="Glow House",
                    name="Facial Ritual",
                    booking_url=None,
                    featured=0,
                ),
                score=0.62,
                explanation="Query overlaps with the service summary.",
                trust_signal="review_recommended",
                is_preferred=False,
                evidence=("summary_overlap",),
            ),
            RankedServiceMatch(
                service=SimpleNamespace(
                    service_id="svc_b",
                    business_name="Lavender Studio",
                    name="Signature Facial",
                    booking_url="https://book.example.com",
                    featured=1,
                ),
                score=0.58,
                explanation="Query matches the service name.",
                trust_signal="partner_routed",
                is_preferred=False,
                evidence=("name_overlap",),
            ),
        ]

        class _FakeAdapter:
            def __init__(self):
                self.settings = SimpleNamespace(semantic_search_max_candidates=8)

            def is_configured(self):
                return True

            async def assess_catalog_candidates(self, **_kwargs):
                return SemanticSearchAssessment(
                    normalized_query="signature facial",
                    inferred_location="Sydney",
                    inferred_category="spa",
                    budget_summary=None,
                    evidence=("location_specific_intent",),
                    ranked_candidates=(
                        SemanticSearchCandidateAssessment(
                            candidate_id="svc_b",
                            semantic_score=0.97,
                            reason="Best fit for the requested facial treatment.",
                            trust_signal="partner_verified",
                            is_preferred=True,
                            evidence=("semantic_service_fit",),
                        ),
                        SemanticSearchCandidateAssessment(
                            candidate_id="svc_a",
                            semantic_score=0.41,
                            reason="Less specific than the signature facial option.",
                            trust_signal="review_recommended",
                            is_preferred=False,
                            evidence=("semantic_lower_specificity",),
                        ),
                    ),
                    provider_label="gemini",
                )

        service = Prompt9SemanticSearchService(_FakeAdapter())
        outcome = await service.assist_catalog_ranking(
            query="best facial",
            location_hint="Sydney",
            budget=None,
            preferences=None,
            ranked_matches=ranked_matches,
        )

        self.assertTrue(outcome.applied)
        self.assertEqual(
            outcome.strategy,
            "catalog_term_retrieval_with_prompt9_rerank_plus_semantic_model_assist",
        )
        self.assertEqual(outcome.provider, "gemini")
        self.assertEqual(outcome.ranked_matches[0].service.service_id, "svc_b")
        self.assertEqual(outcome.ranked_matches[0].trust_signal, "partner_verified")
        self.assertEqual(outcome.ranked_matches[0].semantic_score, 0.97)
        self.assertIn("semantic_model_rerank", outcome.ranked_matches[0].evidence)

    async def test_assist_catalog_ranking_fails_open_when_adapter_unconfigured(self):
        ranked_matches = [
            RankedServiceMatch(
                service=SimpleNamespace(service_id="svc_a", booking_url=None, featured=0),
                score=0.44,
                explanation="Baseline match.",
                trust_signal="low_confidence_catalog",
                is_preferred=False,
                evidence=("baseline",),
            ),
            RankedServiceMatch(
                service=SimpleNamespace(service_id="svc_b", booking_url=None, featured=0),
                score=0.41,
                explanation="Baseline match.",
                trust_signal="low_confidence_catalog",
                is_preferred=False,
                evidence=("baseline",),
            ),
        ]

        class _DisabledAdapter:
            def __init__(self):
                self.settings = SimpleNamespace(semantic_search_max_candidates=8)

            def is_configured(self):
                return False

        service = Prompt9SemanticSearchService(_DisabledAdapter())
        outcome = await service.assist_catalog_ranking(
            query="massage",
            location_hint=None,
            budget=None,
            preferences=None,
            ranked_matches=ranked_matches,
        )

        self.assertFalse(outcome.applied)
        self.assertEqual(outcome.ranked_matches, ranked_matches)
        self.assertEqual(outcome.strategy, "catalog_term_retrieval_with_prompt9_rerank")
