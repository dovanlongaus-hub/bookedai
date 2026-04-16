from __future__ import annotations

from pathlib import Path
import sys
from types import SimpleNamespace
from unittest import TestCase

BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from service_layer.prompt9_matching_service import filter_ranked_matches_for_relevance, rank_catalog_matches
from service_layer.prompt9_matching_service import RankedServiceMatch


class Prompt9MatchingServiceTestCase(TestCase):
    def test_rank_catalog_matches_prefers_exact_location_and_budget_fit(self):
        services = [
            SimpleNamespace(
                service_id="svc_haircut_sydney",
                business_name="Harbour Studio",
                name="Kids Haircut Sydney",
                summary="Gentle haircut sessions for children in central Sydney.",
                category="hair salon",
                venue_name="Harbour Rooms",
                location="Sydney NSW",
                amount_aud=45,
                tags_json=["kids", "haircut"],
                featured=1,
                booking_url="https://book.example.com/kids-haircut",
            ),
            SimpleNamespace(
                service_id="svc_hair_colour_melbourne",
                business_name="Laneway Colour Lab",
                name="Premium Hair Colour",
                summary="Colour correction and styling packages.",
                category="hair salon",
                venue_name="Laneway Loft",
                location="Melbourne VIC",
                amount_aud=220,
                tags_json=["colour", "styling"],
                featured=0,
                booking_url=None,
            ),
        ]

        ranked = rank_catalog_matches(
            query="kids haircut",
            services=services,
            location_hint="Sydney",
            requested_category="hair salon",
            budget={"max_aud": 80},
        )

        self.assertEqual(ranked[0].service.service_id, "svc_haircut_sydney")
        self.assertGreater(ranked[0].score, ranked[1].score)
        self.assertIn(ranked[0].trust_signal, {"partner_verified", "partner_routed"})
        self.assertIn("within_budget", ranked[0].evidence)
        self.assertIn("location_overlap", ranked[0].evidence)

    def test_rank_catalog_matches_prefers_requested_service_even_with_similar_catalog_results(self):
        services = [
            SimpleNamespace(
                service_id="svc_requested",
                business_name="Lavender Studio",
                name="Signature Facial",
                summary="Premium facial treatments and skin consultation.",
                category="spa",
                venue_name="Lavender Rooms",
                location="Sydney",
                amount_aud=140,
                tags_json=["facial", "skin"],
                featured=0,
                booking_url=None,
            ),
            SimpleNamespace(
                service_id="svc_other",
                business_name="Glow House",
                name="Facial Ritual",
                summary="Facial treatment with LED and hydration.",
                category="spa",
                venue_name="Glow House",
                location="Sydney",
                amount_aud=135,
                tags_json=["facial"],
                featured=0,
                booking_url=None,
            ),
        ]

        ranked = rank_catalog_matches(
            query="facial treatment",
            services=services,
            requested_service_id="svc_requested",
        )

        self.assertEqual(ranked[0].service.service_id, "svc_requested")
        self.assertTrue(ranked[0].is_preferred)
        self.assertIn("requested_service_match", ranked[0].evidence)

    def test_filter_ranked_matches_for_relevance_drops_location_only_wrong_domain_results(self):
        services = [
            SimpleNamespace(
                service_id="svc_property",
                business_name="Codex Property",
                name="Property Project Consultation",
                summary="Property and apartment investment planning.",
                category="Housing and Property",
                venue_name="Codex Property",
                location="Sydney NSW 2000",
                amount_aud=49,
                tags_json=["property", "project", "consultation", "real estate"],
                featured=1,
                booking_url="https://book.example.com/property",
            ),
            SimpleNamespace(
                service_id="svc_facial",
                business_name="Lavender Studio",
                name="Signature Facial",
                summary="Premium facial treatment with skin consultation.",
                category="Spa",
                venue_name="Lavender Rooms",
                location="Melbourne VIC 3000",
                amount_aud=140,
                tags_json=["facial", "skin", "spa"],
                featured=0,
                booking_url=None,
            ),
        ]

        ranked = rank_catalog_matches(
            query="facial Sydney under 150",
            services=services,
            location_hint="Sydney",
            requested_category="spa",
            budget={"max_aud": 150},
        )
        filtered = filter_ranked_matches_for_relevance(
            ranked,
            semantic_applied=False,
            require_location_match=True,
        )

        self.assertEqual(filtered, [])

    def test_filter_ranked_matches_for_relevance_keeps_only_topic_aligned_results(self):
        services = [
            SimpleNamespace(
                service_id="svc_facial",
                business_name="Lavender Studio",
                name="Signature Facial",
                summary="Premium facial treatment with skin consultation.",
                category="Spa",
                venue_name="Lavender Rooms",
                location="Sydney NSW 2000",
                amount_aud=140,
                tags_json=["facial", "skin", "spa"],
                featured=0,
                booking_url=None,
            ),
            SimpleNamespace(
                service_id="svc_massage",
                business_name="Harbour Wellness",
                name="Deep Tissue Massage",
                summary="Recovery massage and muscle relief treatment.",
                category="Massage",
                venue_name="Harbour Wellness",
                location="Sydney NSW 2000",
                amount_aud=120,
                tags_json=["massage", "wellness", "recovery"],
                featured=1,
                booking_url=None,
            ),
        ]

        ranked = rank_catalog_matches(
            query="facial",
            services=services,
            location_hint="Sydney",
            requested_category="spa",
            budget={"max_aud": 150},
        )

        filtered = filter_ranked_matches_for_relevance(ranked, semantic_applied=False)

        self.assertEqual([item.service.service_id for item in filtered], ["svc_facial"])
        self.assertIn("topic_mismatch", ranked[1].evidence)

    def test_filter_ranked_matches_for_relevance_drops_wrong_location_even_if_topic_matches(self):
        services = [
            SimpleNamespace(
                service_id="svc_sydney_facial",
                business_name="Harbour Glow Spa",
                name="Sydney Signature Facial",
                summary="Hydrating facial in Sydney.",
                category="Spa",
                venue_name="Harbour Glow Spa",
                location="Sydney NSW 2000",
                amount_aud=139,
                tags_json=["facial", "spa", "skin"],
                featured=1,
                booking_url=None,
            ),
            SimpleNamespace(
                service_id="svc_melbourne_facial",
                business_name="Laneway Glow",
                name="Melbourne Signature Facial",
                summary="Hydrating facial in Melbourne.",
                category="Spa",
                venue_name="Laneway Glow",
                location="Melbourne VIC 3000",
                amount_aud=129,
                tags_json=["facial", "spa", "skin"],
                featured=0,
                booking_url=None,
            ),
        ]

        ranked = rank_catalog_matches(
            query="facial Sydney",
            services=services,
            location_hint="Sydney",
            requested_category="spa",
        )
        filtered = filter_ranked_matches_for_relevance(
            ranked,
            semantic_applied=False,
            require_location_match=True,
        )

        self.assertEqual([item.service.service_id for item in filtered], ["svc_sydney_facial"])
        self.assertIn("location_mismatch", ranked[1].evidence)

    def test_rank_catalog_matches_expands_topic_synonyms_for_skincare_queries(self):
        services = [
            SimpleNamespace(
                service_id="svc_facial",
                business_name="Harbour Glow Spa",
                name="Signature Facial",
                summary="Hydrating facial and LED skincare treatment.",
                category="Spa",
                venue_name="Harbour Glow Spa",
                location="Sydney NSW 2000",
                amount_aud=139,
                tags_json=["facial", "skincare", "spa"],
                featured=1,
                booking_url=None,
            ),
            SimpleNamespace(
                service_id="svc_massage",
                business_name="Harbour Wellness",
                name="Deep Tissue Massage",
                summary="Recovery massage and mobility support.",
                category="Massage",
                venue_name="Harbour Wellness",
                location="Sydney NSW 2000",
                amount_aud=120,
                tags_json=["massage", "wellness"],
                featured=0,
                booking_url=None,
            ),
        ]

        ranked = rank_catalog_matches(
            query="skin care Sydney",
            services=services,
            location_hint="Sydney",
            requested_category="spa",
        )

        self.assertEqual(ranked[0].service.service_id, "svc_facial")
        self.assertTrue(
            {"name_overlap", "category_preference_match"} & set(ranked[0].evidence)
        )
        self.assertIn("topic_mismatch", ranked[1].evidence)

    def test_rank_catalog_matches_expands_topic_synonyms_for_membership_renewal_queries(self):
        services = [
            SimpleNamespace(
                service_id="svc_membership",
                business_name="RSL Club",
                name="Membership Renewal",
                summary="Renew your RSL membership and update member details.",
                category="Membership and Community",
                venue_name="RSL Club",
                location="Sydney NSW 2000",
                amount_aud=25,
                tags_json=["membership", "renewal", "member"],
                featured=1,
                booking_url=None,
            ),
            SimpleNamespace(
                service_id="svc_restaurant",
                business_name="Harbour Dining",
                name="Restaurant Table",
                summary="Book a table for lunch or dinner.",
                category="Food and Beverage",
                venue_name="Harbour Dining",
                location="Sydney NSW 2000",
                amount_aud=0,
                tags_json=["restaurant", "dining", "table"],
                featured=0,
                booking_url=None,
            ),
        ]

        ranked = rank_catalog_matches(
            query="renew member",
            services=services,
            location_hint="Sydney",
        )

        self.assertEqual(ranked[0].service.service_id, "svc_membership")
        self.assertIn("name_overlap", ranked[0].evidence)

    def test_filter_ranked_matches_for_relevance_drops_low_semantic_tail_even_with_weak_overlap(self):
        relevant = RankedServiceMatch(
            service=SimpleNamespace(service_id="svc_facial"),
            score=0.9,
            explanation="Strong facial match.",
            trust_signal="strong_catalog_match",
            is_preferred=False,
            evidence=("name_overlap",),
            semantic_score=0.92,
        )
        unrelated_tail = RankedServiceMatch(
            service=SimpleNamespace(service_id="svc_gp"),
            score=0.28,
            explanation="Weak medical overlap only.",
            trust_signal="review_recommended",
            is_preferred=False,
            evidence=("summary_overlap",),
            semantic_score=0.0,
        )

        filtered = filter_ranked_matches_for_relevance(
            [relevant, unrelated_tail],
            semantic_applied=True,
            require_location_match=False,
        )

        self.assertEqual([item.service.service_id for item in filtered], ["svc_facial"])
