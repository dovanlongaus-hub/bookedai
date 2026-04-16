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
    async def test_provider_configs_include_openai_fallback_when_primary_is_not_openai(self):
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
        self.assertEqual(providers[0].provider_name, "gemini")
        self.assertEqual(providers[1].provider_name, "openai")

    async def test_generate_structured_json_falls_back_to_openai_when_gemini_fails(self):
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

        async def _fake_gemini(self, *, provider, prompt, payload, schema, location_hint):
            raise RuntimeError("gemini unavailable")

        async def _fake_openai(self, *, provider, prompt, payload, schema):
            return '{"status":"ok"}'

        adapter._generate_gemini_json = MethodType(_fake_gemini, adapter)
        adapter._generate_openai_compatible_json = MethodType(_fake_openai, adapter)

        response_text, provider_label = await adapter._generate_structured_json(
            prompt="rerank",
            payload={"query": "facial"},
            schema={"type": "object"},
            location_hint="Sydney",
        )

        self.assertEqual(response_text, '{"status":"ok"}')
        self.assertEqual(provider_label, "openai")
