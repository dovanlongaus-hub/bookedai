from __future__ import annotations

import asyncio
from dataclasses import dataclass
import json
import re
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
    provider_chain: tuple[str, ...] = ()
    fallback_applied: bool = False
    location_permission_needed: bool = False


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
        user_location: dict[str, Any] | None = None,
        near_me_requested: bool = False,
        chat_context: list[dict[str, Any]] | None = None,
        is_chat_style: bool = False,
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
                "location_permission_needed": {"type": "boolean"},
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
                "location_permission_needed",
                "evidence",
                "ranked_candidates",
            ],
        }
        prompt = self._build_search_prompt(
            near_me_requested=near_me_requested,
            has_user_location=bool(user_location),
            is_chat_style=is_chat_style,
        )
        payload: dict[str, Any] = {
            "query": query,
            "location_hint": location_hint,
            "budget": budget or {},
            "preferences": preferences or {},
            "candidates": [candidate.__dict__ for candidate in candidates],
            "near_me_requested": near_me_requested,
        }
        if user_location:
            payload["user_location"] = user_location
        if chat_context:
            payload["recent_context"] = chat_context[-3:]

        response_text, provider_label, provider_chain = await self._generate_structured_json(
            prompt=prompt,
            payload=payload,
            schema=schema,
            location_hint=location_hint,
            near_me_requested=near_me_requested,
            has_user_location=bool(user_location),
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
                    reason=self._normalize_reason(
                        str(item.get("reason") or "").strip()
                        or "Semantic relevance supports this candidate."
                    ),
                    trust_signal=str(item.get("trust_signal") or "").strip() or None,
                    is_preferred=bool(item.get("is_preferred")),
                    evidence=self._normalize_evidence(
                        tuple(
                            str(value).strip()
                            for value in item.get("evidence", [])
                            if str(value).strip()
                        )
                    ),
                )
            )

        fallback_applied = bool(provider_chain) and provider_chain[0] != provider_label
        location_permission_needed = bool(parsed.get("location_permission_needed"))
        # Override: if user already granted GPS, permission is not needed
        if user_location:
            location_permission_needed = False
        assessment_evidence = self._normalize_evidence(
            tuple(
                str(value).strip() for value in parsed.get("evidence", []) if str(value).strip()
            )
            + (f"semantic_provider_{provider_label}",)
            + ((f"semantic_fallback_from_{provider_chain[0]}",) if fallback_applied else ())
            + (("near_me_intent",) if near_me_requested else ())
            + (("location_permission_needed",) if location_permission_needed else ())
        )

        return SemanticSearchAssessment(
            normalized_query=str(parsed.get("normalized_query") or "").strip() or None,
            inferred_location=str(parsed.get("inferred_location") or "").strip() or None,
            inferred_category=str(parsed.get("inferred_category") or "").strip() or None,
            budget_summary=str(parsed.get("budget_summary") or "").strip() or None,
            location_permission_needed=location_permission_needed,
            evidence=assessment_evidence,
            ranked_candidates=tuple(
                item for item in ranked_candidates if item.candidate_id
            ),
            provider_label=provider_label,
            provider_chain=provider_chain,
            fallback_applied=fallback_applied,
        )

    async def _generate_structured_json(
        self,
        *,
        prompt: str,
        payload: dict[str, Any],
        schema: dict[str, Any],
        location_hint: str | None,
        near_me_requested: bool = False,
        has_user_location: bool = False,
    ) -> tuple[str, str, tuple[str, ...]]:
        last_error: Exception | None = None
        attempted_providers: list[str] = []
        for provider in self._provider_configs():
            attempted_providers.append(provider.provider_name)
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
                            near_me_requested=near_me_requested,
                            has_user_location=has_user_location,
                        ),
                        provider.provider_name,
                        tuple(attempted_providers),
                    )
                return (
                    await self._generate_openai_compatible_json(
                        provider=provider,
                        prompt=prompt,
                        payload=payload,
                        schema=schema,
                    ),
                    provider.provider_name,
                    tuple(attempted_providers),
                )
            except Exception as exc:
                last_error = exc
                continue

        if last_error is not None:
            raise last_error
        raise RuntimeError("Semantic search provider is not configured.")

    @staticmethod
    def _build_search_prompt(
        *,
        near_me_requested: bool,
        has_user_location: bool,
        is_chat_style: bool,
    ) -> str:
        base = (
            "You are BookedAI intelligent search assistant for Australian service discovery. "
            "Your role is to understand the user's real intent from their natural language query and rerank catalog candidates accordingly. "
            "Rerank ONLY the supplied catalog candidates — do not invent new candidates or facts. "
            "Stay grounded in the current user request. Do not treat previously selected services, stored catalog defaults, or unrelated prior chat context as relevant unless the current query explicitly refers to them. "
            "Treat service availability as unknown unless the candidate explicitly has a direct booking path flag. "
            "The platform serves users across Australia so recognise Australian slang, suburb names, and service terminology. "
        )
        if is_chat_style:
            base += (
                "The query is conversational — interpret natural language intent carefully. "
                "Phrases like 'I need', 'looking for', 'something for', 'any good' signal service discovery intent. "
                "Extract the core service type even when the query is vague or indirect. "
            )
        if near_me_requested and has_user_location:
            base += (
                "The user has shared their GPS location and wants nearby services. "
                "Strongly prefer candidates whose location metadata matches or is close to the user's position. "
                "Set location_permission_needed to false. "
            )
        elif near_me_requested and not has_user_location:
            base += (
                "The user asked for services 'near me' or 'nearby' but no GPS location was provided. "
                "Set location_permission_needed to true to prompt the frontend to request location access. "
                "Still rank the best topical matches you can find from the catalog. "
            )
        base += (
            "Scoring guidance: prefer candidates that best match service intent, location, category, budget, and specificity. "
            "Use the heuristic_score as a directional hint only — semantic understanding should drive reranking. "
            "If the supplied candidates are weak or off-topic, score them low instead of trying to force a match. "
            "Do not reward a candidate just because it matches the city, suburb, provider popularity, or a broad parent category. "
            "The active query's core service terms must stay anchored. If the user asks for one service type, do not broaden into adjacent service types. "
            "Examples: support worker is not generic housing, private dining is not generic healthcare, haircut is not generic beauty, and restaurant is not hotel accommodation. "
            "If the current query implies one service domain and the supplied candidates belong to another domain, return an empty or near-empty ranked_candidates list rather than forcing a wrong-category recommendation. "
            "Do not keep medical, dining, salon, housing, membership, events, or print candidates in the shortlist unless they truly match the active query intent. "
            "For multilingual or conversational queries, normalize the request but preserve the exact requested service intent instead of broadening it. "
            "Keep reasons concrete and under 200 characters. "
            "If two candidates are very close, prefer the one with partner_verified trust or a direct booking path. "
            "Return only valid JSON matching the schema."
        )
        return base

    @staticmethod
    def _normalize_reason(reason: str) -> str:
        cleaned = " ".join(reason.split()).strip()
        if not cleaned:
            return "Semantic relevance supports this candidate."
        return cleaned[:220]

    @staticmethod
    def _normalize_evidence(values: tuple[str, ...]) -> tuple[str, ...]:
        normalized: list[str] = []
        for value in values:
            cleaned = re.sub(r"[^a-z0-9_]+", "_", value.strip().lower()).strip("_")
            if cleaned and cleaned not in normalized:
                normalized.append(cleaned)
            if len(normalized) >= 8:
                break
        return tuple(normalized)

    def _provider_configs(self) -> list[SemanticProviderConfig]:
        providers: list[SemanticProviderConfig] = []
        primary = self._build_provider_config(
            provider_name=self.settings.semantic_search_provider,
            api_key=self.settings.semantic_search_api_key,
            base_url=self.settings.semantic_search_base_url,
            model=self.settings.semantic_search_model,
        )
        primary_name = (self.settings.semantic_search_provider or "").strip().lower()
        openai_key = self.settings.openai_api_key.strip()
        if openai_key:
            providers.append(
                SemanticProviderConfig(
                    provider_name="openai",
                    api_key=openai_key,
                    base_url=self.settings.openai_base_url.strip() or "https://api.openai.com/v1",
                    model=self.settings.openai_model.strip() or "gpt-5-mini",
                )
            )

        if primary is not None and primary_name != "openai":
            providers.append(primary)

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
        near_me_requested: bool = False,
        has_user_location: bool = False,
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
        use_maps_grounding = self.settings.semantic_search_gemini_maps_grounding_enabled and (
            (location_hint and location_hint.strip())
            or near_me_requested
            or has_user_location
        )
        if use_maps_grounding:
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
