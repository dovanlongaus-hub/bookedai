from __future__ import annotations

from pathlib import Path
import sys
from unittest import TestCase

BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from core.contracts.matching import MatchRequestContract
from domain.matching.service import MatchingService


class MatchingDomainServiceTestCase(TestCase):
    def test_build_result_adds_booking_fit_and_stage_counts(self):
        service = MatchingService()

        result = service.build_result(
            request=MatchRequestContract(
                query="Book private dining for 8 tonight",
                location_hint="Sydney",
                budget_hint="120",
                tenant_id="tenant-test",
            ),
            request_id="match_123",
            candidates=[
                {
                    "candidate_id": "svc_dining",
                    "provider_name": "Harbour Table",
                    "service_name": "Private Dining Room",
                    "source_type": "service_catalog",
                    "category": "Restaurant",
                    "summary": "Private dining room for team dinners.",
                    "location": "Sydney",
                    "price_posture": "Within stated budget",
                    "booking_path_type": "request_callback",
                    "availability_state": "needs_manual_confirmation",
                    "booking_confidence": "medium",
                    "why_this_matches": "Location hint aligns with the venue or suburb.",
                }
            ],
            recommendations=[
                {
                    "candidate_id": "svc_dining",
                    "reason": "Strong dining match.",
                    "path_type": "request_callback",
                    "next_step": "Route to callback.",
                    "warnings": ["Manual confirmation required."],
                }
            ],
            confidence={
                "score": 0.81,
                "reason": "Strong catalog match",
                "evidence": ["core_intent_full_match"],
                "gating_state": "high",
            },
            warnings=[],
            search_strategy="catalog_term_retrieval_with_prompt9_rerank",
            query_context={
                "near_me_requested": False,
                "location_permission_needed": False,
                "is_chat_style": True,
                "has_user_location": False,
            },
            booking_context={
                "party_size": 8,
                "requested_date": None,
                "requested_time": None,
                "schedule_hint": "tonight",
                "intent_label": "ready_to_book",
                "summary": "for 8, tonight, booking-ready",
            },
            query_understanding={
                "normalized_query": "book private dining for 8 tonight",
                "inferred_location": "Sydney",
                "location_terms": ["metro:sydney", "sydney"],
                "core_intent_terms": ["private", "dining"],
                "expanded_intent_terms": ["dining", "group", "private", "restaurant", "table"],
                "constraint_terms": ["party_size:8", "schedule:tonight", "intent:ready_to_book"],
                "requested_category": "Restaurant",
                "budget_limit": 120.0,
                "near_me_requested": False,
                "is_chat_style": True,
                "requested_date": None,
                "requested_time": None,
                "schedule_hint": "tonight",
                "party_size": 8,
                "intent_label": "ready_to_book",
                "summary": "for 8, tonight, booking-ready",
            },
            semantic_assist={
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
            search_diagnostics={
                "effective_location_hint": "Sydney",
                "relevance_location_hint": "Sydney",
                "semantic_rollout_enabled": False,
                "semantic_applied": False,
                "retrieval_candidate_count": 4,
                "heuristic_candidate_ids": ["svc_dining", "svc_other"],
                "semantic_candidate_ids": ["svc_dining", "svc_other"],
                "post_relevance_candidate_ids": ["svc_dining"],
                "post_domain_candidate_ids": ["svc_dining"],
                "final_candidate_ids": ["svc_dining"],
                "dropped_candidates": [
                    {
                        "candidate_id": "svc_other",
                        "stage": "relevance_gate",
                        "reason": "low_relevance_or_topic_mismatch",
                    }
                ],
            },
        )

        self.assertEqual(result.request_id, "match_123")
        self.assertEqual(result.selected_candidate_id, "svc_dining")
        self.assertEqual(result.candidates[0].booking_fit.party_size_fit, "supported")
        self.assertEqual(result.candidates[0].booking_fit.schedule_fit, "manual_confirmation")
        self.assertEqual(result.candidates[0].booking_fit.booking_readiness, "manual_review")
        self.assertEqual(result.recommendations[0].booking_fit.budget_fit, "within_budget")
        self.assertEqual(
            [item.stage for item in result.search_diagnostics.stage_counts],
            ["retrieval", "heuristic_rank", "semantic_rank", "relevance_gate", "domain_gate", "final_shortlist"],
        )
