from __future__ import annotations

from pathlib import Path
import sys
from types import MethodType, SimpleNamespace
from unittest import IsolatedAsyncioTestCase

BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from integrations.ai_models.semantic_search_adapter import SemanticSearchAdapter


class SemanticSearchAdapterTestCase(IsolatedAsyncioTestCase):
    async def test_provider_configs_prioritize_openai_before_gemini_when_both_are_configured(self):
        settings = SimpleNamespace(
            semantic_search_enabled=True,
            semantic_search_provider="gemini",
            semantic_search_api_key="gemini-key",
            semantic_search_base_url="https://generativelanguage.googleapis.com/v1beta",
            semantic_search_model="gemini-2.5-flash",
            semantic_search_timeout_seconds=30,
            semantic_search_gemini_maps_grounding_enabled=False,
            openai_api_key="openai-key",
            openai_base_url="https://api.openai.com/v1",
            openai_model="gpt-5-mini",
        )

        adapter = SemanticSearchAdapter(settings)
        providers = adapter._provider_configs()

        self.assertEqual(len(providers), 2)
        self.assertEqual(providers[0].provider_name, "openai")
        self.assertEqual(providers[1].provider_name, "gemini")

    async def test_generate_structured_json_falls_back_to_gemini_when_openai_fails(self):
        settings = SimpleNamespace(
            semantic_search_enabled=True,
            semantic_search_provider="gemini",
            semantic_search_api_key="gemini-key",
            semantic_search_base_url="https://generativelanguage.googleapis.com/v1beta",
            semantic_search_model="gemini-2.5-flash",
            semantic_search_timeout_seconds=30,
            semantic_search_gemini_maps_grounding_enabled=False,
            openai_api_key="openai-key",
            openai_base_url="https://api.openai.com/v1",
            openai_model="gpt-5-mini",
        )

        adapter = SemanticSearchAdapter(settings)

        async def _fake_openai(self, *, provider, prompt, payload, schema):
            raise RuntimeError("openai unavailable")

        async def _fake_gemini(self, *, provider, prompt, payload, schema, location_hint, **_kwargs):
            return '{"status":"ok"}'

        adapter._generate_openai_compatible_json = MethodType(_fake_openai, adapter)
        adapter._generate_gemini_json = MethodType(_fake_gemini, adapter)

        response_text, provider_label, provider_chain = await adapter._generate_structured_json(
            prompt="rerank",
            payload={"query": "facial"},
            schema={"type": "object"},
            location_hint="Sydney",
        )

        self.assertEqual(response_text, '{"status":"ok"}')
        self.assertEqual(provider_label, "gemini")
        self.assertEqual(provider_chain, ("openai", "gemini"))

    async def test_assess_catalog_candidates_includes_fallback_and_normalized_evidence(self):
        settings = SimpleNamespace(
            semantic_search_enabled=True,
            semantic_search_provider="gemini",
            semantic_search_api_key="gemini-key",
            semantic_search_base_url="https://generativelanguage.googleapis.com/v1beta",
            semantic_search_model="gemini-2.5-flash",
            semantic_search_timeout_seconds=30,
            semantic_search_gemini_maps_grounding_enabled=False,
            openai_api_key="openai-key",
            openai_base_url="https://api.openai.com/v1",
            openai_model="gpt-5-mini",
        )
        adapter = SemanticSearchAdapter(settings)

        async def _fake_generate_structured_json(self, **_kwargs):
            return (
                '{"normalized_query":"gp clinic sydney","inferred_location":"Sydney","inferred_category":"Healthcare Service","budget_summary":null,"evidence":["Location Specific Intent","semantic-provider-openai"],"ranked_candidates":[{"candidate_id":"svc_gp","semantic_score":0.88,"reason":" Best fit for a GP clinic in Sydney. ","trust_signal":"partner_verified","is_preferred":true,"evidence":["Provider Preferred","Location Specific Intent"]}]}',
                "gemini",
                ("openai", "gemini"),
            )

        adapter._generate_structured_json = MethodType(_fake_generate_structured_json, adapter)

        assessment = await adapter.assess_catalog_candidates(
            query="gp clinic Sydney",
            location_hint="Sydney",
            budget=None,
            preferences=None,
            candidates=[
                SimpleNamespace(
                    candidate_id="svc_gp",
                    provider_name="Harbour Medical",
                    service_name="General Practice Consultation",
                    category="Healthcare Service",
                    summary="Doctor consultation.",
                    location="Sydney NSW 2000",
                    venue_name="Harbour Medical",
                    tags=("gp", "doctor"),
                    amount_aud=89,
                    featured=True,
                    has_booking_url=True,
                    heuristic_score=0.8,
                    heuristic_reason="Strong healthcare match.",
                )
            ],
        )

        assert assessment is not None
        self.assertEqual(assessment.provider_label, "gemini")
        self.assertEqual(assessment.provider_chain, ("openai", "gemini"))
        self.assertTrue(assessment.fallback_applied)
        self.assertIn("semantic_provider_gemini", assessment.evidence)
        self.assertIn("semantic_fallback_from_openai", assessment.evidence)
        self.assertEqual(assessment.ranked_candidates[0].reason, "Best fit for a GP clinic in Sydney.")
        self.assertEqual(
            assessment.ranked_candidates[0].evidence,
            ("provider_preferred", "location_specific_intent"),
        )
