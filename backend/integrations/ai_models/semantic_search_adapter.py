from __future__ import annotations

import asyncio
from dataclasses import dataclass
import json
from typing import Any

import httpx

from config import Settings
from integrations.ai_models.adapter import AIModelAdapter


@dataclass(frozen=True)
class SemanticSearchCandidateInput:
    candidate_id: str
    provider_name: str
    service_name: str
    category: str | None
    summary: str | None
    location: str | None
    venue_name: str | None
    tags: tuple[str, ...]
    amount_aud: float | None
    featured: bool
    has_booking_url: bool
    heuristic_score: float
    heuristic_reason: str


@dataclass(frozen=True)
class SemanticSearchCandidateAssessment:
    candidate_id: str
    semantic_score: float
    reason: str
    trust_signal: str | None = None
    is_preferred: bool = False
    evidence: tuple[str, ...] = ()


@dataclass(frozen=True)
class SemanticSearchAssessment:
    normalized_query: str | None
    inferred_location: str | None
    inferred_category: str | None
    budget_summary: str | None
    evidence: tuple[str, ...]
    ranked_candidates: tuple[SemanticSearchCandidateAssessment, ...]
    provider_label: str


@dataclass(frozen=True)
class SemanticProviderConfig:
    provider_name: str
    api_key: str
    base_url: str
    model: str


class SemanticSearchAdapter(AIModelAdapter):
    def __init__(self, settings: Settings) -> None:
        provider_name = (settings.semantic_search_provider or "semantic-search").strip() or "semantic-search"
        super().__init__(provider_name=provider_name)
        self.settings = settings

    def is_configured(self) -> bool:
        return bool(self.settings.semantic_search_enabled and self._provider_configs())

    async def assess_catalog_candidates(
        self,
        *,
        query: str,
        location_hint: str | None,
        budget: dict[str, Any] | None,
        preferences: dict[str, Any] | None,
        candidates: list[SemanticSearchCandidateInput],
    ) -> SemanticSearchAssessment | None:
        if not self.is_configured() or not candidates:
            return None

        schema = {
            "type": "object",
            "additionalProperties": False,
            "properties": {
                "normalized_query": {"type": ["string", "null"]},
                "inferred_location": {"type": ["string", "null"]},
                "inferred_category": {"type": ["string", "null"]},
                "budget_summary": {"type": ["string", "null"]},
                "evidence": {
                    "type": "array",
                    "items": {"type": "string"},
                    "maxItems": 8,
                },
                "ranked_candidates": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "additionalProperties": False,
                        "properties": {
                            "candidate_id": {"type": "string"},
                            "semantic_score": {"type": "number", "minimum": 0, "maximum": 1},
                            "reason": {"type": "string"},
                            "trust_signal": {"type": ["string", "null"]},
                            "is_preferred": {"type": "boolean"},
                            "evidence": {
                                "type": "array",
                                "items": {"type": "string"},
                                "maxItems": 6,
                            },
                        },
                        "required": [
                            "candidate_id",
                            "semantic_score",
                            "reason",
                            "trust_signal",
                            "is_preferred",
                            "evidence",
                        ],
                    },
                    "maxItems": max(len(candidates), 1),
                },
            },
            "required": [
                "normalized_query",
                "inferred_location",
                "inferred_category",
                "budget_summary",
                "evidence",
                "ranked_candidates",
            ],
        }
        prompt = (
            "You are BookedAI semantic search assist for service discovery. "
            "Rerank only the supplied catalog candidates for the user's request. "
            "Do not invent new candidates or new facts. "
            "Treat availability as unknown unless the candidate explicitly has a direct booking path flag. "
            "Prefer the candidate that best matches the user's service intent, location, category, budget, and specificity. "
            "Use the heuristic score as a hint, not the sole answer. "
            "Keep reasons concrete and operational. "
            "If two candidates are close, preserve safer trust-first ordering. "
            "Return only valid JSON matching the schema."
        )
        payload = {
            "query": query,
            "location_hint": location_hint,
            "budget": budget or {},
            "preferences": preferences or {},
            "candidates": [candidate.__dict__ for candidate in candidates],
        }

        response_text, provider_label = await self._generate_structured_json(
            prompt=prompt,
            payload=payload,
            schema=schema,
            location_hint=location_hint,
        )
        if not response_text:
            return None

        parsed = json.loads(response_text)
        ranked_candidates = []
        for item in parsed.get("ranked_candidates", []):
            ranked_candidates.append(
                SemanticSearchCandidateAssessment(
                    candidate_id=str(item.get("candidate_id") or "").strip(),
                    semantic_score=max(0.0, min(float(item.get("semantic_score") or 0.0), 1.0)),
                    reason=str(item.get("reason") or "").strip() or "Semantic relevance supports this candidate.",
                    trust_signal=str(item.get("trust_signal") or "").strip() or None,
                    is_preferred=bool(item.get("is_preferred")),
                    evidence=tuple(
                        str(value).strip()
                        for value in item.get("evidence", [])
                        if str(value).strip()
                    ),
                )
            )

        return SemanticSearchAssessment(
            normalized_query=str(parsed.get("normalized_query") or "").strip() or None,
            inferred_location=str(parsed.get("inferred_location") or "").strip() or None,
            inferred_category=str(parsed.get("inferred_category") or "").strip() or None,
            budget_summary=str(parsed.get("budget_summary") or "").strip() or None,
            evidence=tuple(
                str(value).strip() for value in parsed.get("evidence", []) if str(value).strip()
            ),
            ranked_candidates=tuple(
                item for item in ranked_candidates if item.candidate_id
            ),
            provider_label=provider_label,
        )

    async def _generate_structured_json(
        self,
        *,
        prompt: str,
        payload: dict[str, Any],
        schema: dict[str, Any],
        location_hint: str | None,
    ) -> tuple[str, str]:
        last_error: Exception | None = None
        for provider in self._provider_configs():
            try:
                provider_name = provider.provider_name.lower()
                if provider_name == "gemini" or "generativelanguage.googleapis.com" in provider.base_url:
                    return (
                        await self._generate_gemini_json(
                            provider=provider,
                            prompt=prompt,
                            payload=payload,
                            schema=schema,
                            location_hint=location_hint,
                        ),
                        provider.provider_name,
                    )
                return (
                    await self._generate_openai_compatible_json(
                        provider=provider,
                        prompt=prompt,
                        payload=payload,
                        schema=schema,
                    ),
                    provider.provider_name,
                )
            except Exception as exc:
                last_error = exc
                continue

        if last_error is not None:
            raise last_error
        raise RuntimeError("Semantic search provider is not configured.")

    def _provider_configs(self) -> list[SemanticProviderConfig]:
        providers: list[SemanticProviderConfig] = []
        primary = self._build_provider_config(
            provider_name=self.settings.semantic_search_provider,
            api_key=self.settings.semantic_search_api_key,
            base_url=self.settings.semantic_search_base_url,
            model=self.settings.semantic_search_model,
        )
        if primary is not None:
            providers.append(primary)

        primary_name = (self.settings.semantic_search_provider or "").strip().lower()
        openai_key = self.settings.openai_api_key.strip()
        if openai_key and primary_name != "openai":
            providers.append(
                SemanticProviderConfig(
                    provider_name="openai",
                    api_key=openai_key,
                    base_url=self.settings.openai_base_url.strip() or "https://api.openai.com/v1",
                    model=self.settings.openai_model.strip() or "gpt-5-mini",
                )
            )

        return providers

    @staticmethod
    def _build_provider_config(
        *,
        provider_name: str,
        api_key: str,
        base_url: str,
        model: str,
    ) -> SemanticProviderConfig | None:
        normalized_key = api_key.strip()
        if not normalized_key:
            return None
        return SemanticProviderConfig(
            provider_name=provider_name.strip() or "semantic-search",
            api_key=normalized_key,
            base_url=base_url.strip() or "https://api.openai.com/v1",
            model=model.strip() or "gpt-5-mini",
        )

    async def _generate_openai_compatible_json(
        self,
        *,
        provider: SemanticProviderConfig,
        prompt: str,
        payload: dict[str, Any],
        schema: dict[str, Any],
    ) -> str:
        request_payload = {
            "model": provider.model,
            "input": [
                {
                    "role": "system",
                    "content": [{"type": "input_text", "text": prompt}],
                },
                {
                    "role": "user",
                    "content": [{"type": "input_text", "text": json.dumps(payload)}],
                },
            ],
            "text": {
                "format": {
                    "type": "json_schema",
                    "name": "semantic_search_rerank",
                    "schema": schema,
                    "strict": True,
                }
            },
            "reasoning": {"effort": "minimal"},
        }
        headers = {
            "Authorization": f"Bearer {provider.api_key}",
            "Content-Type": "application/json",
        }
        endpoint = f"{provider.base_url.rstrip('/')}/responses"
        async with httpx.AsyncClient(timeout=self.settings.semantic_search_timeout_seconds) as client:
            response = await self._post_with_retry(
                client,
                endpoint,
                headers=headers,
                json=request_payload,
            )
            return self._extract_openai_output_text(response.json())

    async def _generate_gemini_json(
        self,
        *,
        provider: SemanticProviderConfig,
        prompt: str,
        payload: dict[str, Any],
        schema: dict[str, Any],
        location_hint: str | None,
    ) -> str:
        endpoint_base = provider.base_url.rstrip("/") or "https://generativelanguage.googleapis.com/v1beta"
        endpoint = f"{endpoint_base}/models/{provider.model}:generateContent"
        request_payload: dict[str, Any] = {
            "contents": [
                {
                    "parts": [
                        {
                            "text": (
                                f"{prompt}\n\nInput JSON:\n{json.dumps(payload, ensure_ascii=True)}"
                            )
                        }
                    ]
                }
            ],
            "generationConfig": {
                "responseMimeType": "application/json",
                "responseJsonSchema": schema,
                "temperature": 0.1,
            },
        }
        if (
            self.settings.semantic_search_gemini_maps_grounding_enabled
            and location_hint
            and location_hint.strip()
        ):
            request_payload["tools"] = [{"googleMaps": {}}]
        headers = {
            "Content-Type": "application/json",
            "x-goog-api-key": provider.api_key,
        }
        async with httpx.AsyncClient(timeout=self.settings.semantic_search_timeout_seconds) as client:
            response = await self._post_with_retry(
                client,
                endpoint,
                headers=headers,
                json=request_payload,
            )
            return self._extract_gemini_output_text(response.json())

    async def _post_with_retry(
        self,
        client: httpx.AsyncClient,
        url: str,
        *,
        headers: dict[str, str],
        json: dict[str, Any],
    ) -> httpx.Response:
        last_error: Exception | None = None
        for attempt in range(3):
            try:
                response = await client.post(url, headers=headers, json=json)
                response.raise_for_status()
                return response
            except httpx.HTTPStatusError as exc:
                last_error = exc
                if exc.response.status_code not in {429, 500, 502, 503, 504} or attempt == 2:
                    raise
            except httpx.ReadTimeout as exc:
                last_error = exc
                if attempt == 2:
                    raise
            await asyncio.sleep(0.6 * (attempt + 1))

        if last_error is not None:
            raise last_error
        raise RuntimeError("Semantic search provider request failed without a response.")

    @staticmethod
    def _extract_openai_output_text(data: dict[str, Any]) -> str:
        output_text = data.get("output_text")
        if output_text:
            return str(output_text).strip()
        for item in data.get("output", []):
            for content in item.get("content", []):
                if content.get("type") in {"output_text", "text"} and content.get("text"):
                    return str(content["text"]).strip()
        return ""

    @staticmethod
    def _extract_gemini_output_text(data: dict[str, Any]) -> str:
        for candidate in data.get("candidates", []):
            content = candidate.get("content") or {}
            for part in content.get("parts", []):
                text = part.get("text")
                if text:
                    return str(text).strip()
        return ""
