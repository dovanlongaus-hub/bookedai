from __future__ import annotations

from dataclasses import replace
from pathlib import Path
import types
import sys
from unittest import IsolatedAsyncioTestCase
from unittest.mock import AsyncMock, patch

import httpx

BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

email_service_module = types.ModuleType("service_layer.email_service")
event_store_module = types.ModuleType("service_layer.event_store")
n8n_service_module = types.ModuleType("service_layer.n8n_service")


class _DummyEmailService:
    pass


class _DummyN8NService:
    pass


def _dummy_store_event(*_args, **_kwargs):
    return None


email_service_module.EmailService = _DummyEmailService
event_store_module.store_event = _dummy_store_event
n8n_service_module.N8NService = _DummyN8NService

sys.modules["service_layer.email_service"] = email_service_module
sys.modules["service_layer.event_store"] = event_store_module
sys.modules["service_layer.n8n_service"] = n8n_service_module

from config import get_settings
from schemas import BookingAssistantChatMessage
from services import BookingAssistantService, OpenAIService


class _FakeOpenAIService:
    async def booking_assistant_reply(self, *, message: str, conversation, services):
        return "", None


class BookingAssistantServiceTestCase(IsolatedAsyncioTestCase):
    def setUp(self) -> None:
        self.service = BookingAssistantService(get_settings())

    def test_should_search_ai_events_requires_explicit_event_intent(self):
        self.assertFalse(
            self.service._should_search_ai_events(
                "I want a housing consultation about apartment or townhouse projects in Sydney and would like to book a call."
            )
        )

    def test_should_search_ai_events_keeps_explicit_ai_event_queries(self):
        self.assertTrue(
            self.service._should_search_ai_events(
                "What AI events are coming up at WSTI and Western Sydney Startup Hub?"
            )
        )

    async def test_chat_does_not_mix_ai_events_into_housing_consultation_flow(self):
        with patch("services.AIEventSearchService.search", new_callable=AsyncMock) as event_search:
            response = await self.service.chat(
                message=(
                    "I want a housing consultation about apartment or townhouse projects in Sydney "
                    "and would like to book a call."
                ),
                conversation=[
                    BookingAssistantChatMessage(
                        role="user",
                        content=(
                            "I want a housing consultation about apartment or townhouse projects in Sydney "
                            "and would like to book a call."
                        ),
                    )
                ],
                openai_service=_FakeOpenAIService(),
            )

        event_search.assert_not_awaited()
        self.assertFalse(response.matched_events)
        self.assertTrue(response.matched_services)
        self.assertIn("Codex Property Project Consultation", response.reply)
        self.assertNotIn("AI Summit Hackathon", response.reply)
        self.assertNotIn("I found both event and service matches", response.reply)
        self.assertTrue(
            all(service.category == "Housing and Property" for service in response.matched_services)
        )

    async def test_chat_degrades_gracefully_when_ai_event_search_fails(self):
        with patch(
            "services.AIEventSearchService.search",
            new=AsyncMock(side_effect=RuntimeError("meetup scrape failed")),
        ):
            response = await self.service.chat(
                message="Book an AI Mentor 1-1 session for startup growth this week.",
                conversation=[
                    BookingAssistantChatMessage(
                        role="user",
                        content="Book an AI Mentor 1-1 session for startup growth this week.",
                    )
                ],
                openai_service=_FakeOpenAIService(),
            )

        self.assertEqual(response.status, "ok")
        self.assertFalse(response.matched_events)
        self.assertTrue(response.matched_services)
        self.assertIsNotNone(response.suggested_service_id)

    async def test_chat_suppresses_wrong_domain_matches_when_core_intent_is_missing(self):
        response = await self.service.chat(
            message="cleaner in sydney this weekend",
            conversation=[
                BookingAssistantChatMessage(
                    role="user",
                    content="cleaner in sydney this weekend",
                )
            ],
            openai_service=_FakeOpenAIService(),
        )

        self.assertEqual(response.status, "ok")
        self.assertFalse(response.matched_services)
        self.assertIsNone(response.suggested_service_id)

    async def test_chat_keeps_domain_matches_when_core_intent_aligns(self):
        response = await self.service.chat(
            message="kids swimming lessons in caringbah this weekend",
            conversation=[
                BookingAssistantChatMessage(
                    role="user",
                    content="kids swimming lessons in caringbah this weekend",
                )
            ],
            openai_service=_FakeOpenAIService(),
        )

        self.assertEqual(response.status, "ok")
        self.assertTrue(response.matched_services)
        self.assertTrue(any("swim" in (service.name or "").lower() for service in response.matched_services))

    async def test_search_public_service_candidates_uses_low_reasoning_for_web_search(self):
        captured_request: dict[str, object] = {}

        class _FakeResponse:
            def __init__(self):
                self.status_code = 200
                self.headers = {"x-request-id": "req_test_public_web"}

            def raise_for_status(self):
                return None

            def json(self):
                return {
                    "output_text": __import__("json").dumps(
                        {
                            "results": [
                                {
                                    "candidate_id": "web_1",
                                    "provider_name": "Sydney Barber",
                                    "service_name": "Men's Haircut",
                                    "summary": "Nearby barber booking.",
                                    "location": "Sydney NSW",
                                    "source_url": "https://example.com",
                                    "booking_url": "https://example.com/book",
                                    "match_score": 0.91,
                                    "service_relevance": 0.95,
                                    "location_relevance": 0.8,
                                    "time_relevance": 0.7,
                                    "constraint_relevance": 0.72,
                                    "official_source": True,
                                    "why_this_matches": "Exact haircut intent with direct booking.",
                                }
                            ]
                        }
                    )
                }

        class _FakeAsyncClient:
            def __init__(self, *args, **kwargs):
                self.timeout = kwargs.get("timeout")

            async def __aenter__(self):
                return self

            async def __aexit__(self, exc_type, exc, tb):
                return False

            async def post(self, endpoint, *, headers, json):
                captured_request["endpoint"] = endpoint
                captured_request["headers"] = headers
                captured_request["json"] = json
                return _FakeResponse()

        settings = replace(
            get_settings(),
            openai_api_key="test-openai-key",
            openai_base_url="https://api.openai.com/v1",
            openai_model="gpt-5-mini",
        )
        service = OpenAIService(settings)

        with patch("services.httpx.AsyncClient", _FakeAsyncClient):
            results = await service.search_public_service_candidates(
                query="men's haircut in Sydney",
                location_hint="Sydney",
                booking_context={"schedule_hint": "tonight"},
                preferences={"service_category": "Salon"},
            )

        self.assertEqual(captured_request["json"]["reasoning"]["effort"], "low")
        self.assertEqual(captured_request["json"]["tools"][0]["search_context_size"], "low")
        self.assertTrue(
            captured_request["headers"]["X-Client-Request-Id"].startswith("bookedai-public-web-")
        )
        self.assertEqual(results[0]["candidate_id"], "web_1")

    async def test_search_public_service_candidates_uses_hospitality_prompt_and_medium_context(self):
        captured_request: dict[str, object] = {}

        class _FakeResponse:
            def __init__(self):
                self.status_code = 200
                self.headers = {"x-request-id": "req_test_hospitality"}

            def raise_for_status(self):
                return None

            def json(self):
                return {"output_text": '{"results":[]}'}

        class _FakeAsyncClient:
            def __init__(self, *args, **kwargs):
                self.timeout = kwargs.get("timeout")

            async def __aenter__(self):
                return self

            async def __aexit__(self, exc_type, exc, tb):
                return False

            async def post(self, endpoint, *, headers, json):
                captured_request["endpoint"] = endpoint
                captured_request["headers"] = headers
                captured_request["json"] = json
                return _FakeResponse()

        settings = replace(
            get_settings(),
            openai_api_key="test-openai-key",
            openai_base_url="https://api.openai.com/v1",
            openai_model="gpt-5-mini",
        )
        service = OpenAIService(settings)

        with patch("services.httpx.AsyncClient", _FakeAsyncClient):
            await service.search_public_service_candidates(
                query="restaurant table for 6 in Sydney tonight",
                location_hint="Sydney",
                booking_context={"party_size": 6, "schedule_hint": "tonight"},
                preferences={"service_category": "Food and Beverage"},
            )

        system_prompt = captured_request["json"]["input"][0]["content"][0]["text"]
        self.assertIn("named venues that have a real reservation flow", system_prompt)
        self.assertIn("OpenTable", system_prompt)
        self.assertEqual(captured_request["json"]["tools"][0]["search_context_size"], "medium")

    async def test_search_public_service_candidates_retries_hospitality_queries_with_rescue_pass(self):
        captured_requests: list[dict[str, object]] = []

        class _FakeResponse:
            def __init__(self, output_text: str):
                self.status_code = 200
                self.headers = {"x-request-id": "req_test_hospitality_retry"}
                self._output_text = output_text

            def raise_for_status(self):
                return None

            def json(self):
                return {"output_text": self._output_text}

        class _FakeAsyncClient:
            def __init__(self, *args, **kwargs):
                self.timeout = kwargs.get("timeout")
                self._calls = 0

            async def __aenter__(self):
                return self

            async def __aexit__(self, exc_type, exc, tb):
                return False

            async def post(self, endpoint, *, headers, json):
                captured_requests.append({"endpoint": endpoint, "headers": headers, "json": json})
                self._calls += 1
                if self._calls == 1:
                    return _FakeResponse('{"results":[]}')
                return _FakeResponse(
                    __import__("json").dumps(
                        {
                            "results": [
                                {
                                    "candidate_id": "venue_1",
                                    "provider_name": "Sydney Venue",
                                    "service_name": "Dinner reservation for 6",
                                    "summary": "Named venue with book now flow.",
                                    "location": "Sydney NSW",
                                    "source_url": "https://venue.example.com/book",
                                    "booking_url": "https://venue.example.com/book",
                                    "match_score": 0.84,
                                    "service_relevance": 0.9,
                                    "location_relevance": 0.86,
                                    "time_relevance": 0.7,
                                    "constraint_relevance": 0.78,
                                    "official_source": True,
                                    "why_this_matches": "Venue booking page matches table for 6 tonight.",
                                }
                            ]
                        }
                    )
                )

        settings = replace(
            get_settings(),
            openai_api_key="test-openai-key",
            openai_base_url="https://api.openai.com/v1",
            openai_model="gpt-5-mini",
        )
        service = OpenAIService(settings)

        with patch("services.httpx.AsyncClient", _FakeAsyncClient):
            results = await service.search_public_service_candidates(
                query="restaurant table for 6 in Sydney tonight",
                location_hint="Sydney",
                booking_context={"party_size": 6, "schedule_hint": "tonight"},
                preferences={"service_category": "Food and Beverage"},
            )

        self.assertEqual(len(captured_requests), 2)
        rescue_prompt = captured_requests[1]["json"]["input"][0]["content"][0]["text"]
        rescue_payload = __import__("json").loads(captured_requests[1]["json"]["input"][1]["content"][0]["text"])
        self.assertIn("hospitality rescue pass", rescue_prompt)
        self.assertEqual(rescue_payload["search_focus"]["mode"], "hospitality_rescue_pass")
        self.assertEqual(results[0]["candidate_id"], "venue_1")

    async def test_search_public_service_candidates_keeps_contact_phone_for_restaurant_results(self):
        class _FakeResponse:
            def __init__(self):
                self.status_code = 200
                self.headers = {"x-request-id": "req_test_restaurant_phone"}

            def raise_for_status(self):
                return None

            def json(self):
                return {
                    "output_text": __import__("json").dumps(
                        {
                            "results": [
                                {
                                    "candidate_id": "venue_phone_1",
                                    "provider_name": "Harbour Table",
                                    "service_name": "Dinner reservation",
                                    "summary": "Waterfront dinner booking.",
                                    "location": "Sydney NSW",
                                    "source_url": "https://harbour.example.com/reservations",
                                    "booking_url": None,
                                    "contact_phone": "(02) 9123 4567",
                                    "match_score": 0.86,
                                    "service_relevance": 0.91,
                                    "location_relevance": 0.84,
                                    "time_relevance": 0.72,
                                    "constraint_relevance": 0.75,
                                    "official_source": True,
                                    "why_this_matches": "Named venue with an official contact path for reservations.",
                                }
                            ]
                        }
                    )
                }

        class _FakeAsyncClient:
            def __init__(self, *args, **kwargs):
                self.timeout = kwargs.get("timeout")

            async def __aenter__(self):
                return self

            async def __aexit__(self, exc_type, exc, tb):
                return False

            async def post(self, endpoint, *, headers, json):
                return _FakeResponse()

        settings = replace(
            get_settings(),
            openai_api_key="test-openai-key",
            openai_base_url="https://api.openai.com/v1",
            openai_model="gpt-5-mini",
        )
        service = OpenAIService(settings)

        with patch("services.httpx.AsyncClient", _FakeAsyncClient):
            results = await service.search_public_service_candidates(
                query="restaurant table in Sydney tonight",
                location_hint="Sydney",
                booking_context={"schedule_hint": "tonight"},
                preferences={"service_category": "Food and Beverage"},
            )

        self.assertEqual(results[0]["contact_phone"], "(02) 9123 4567")

    async def test_search_public_service_candidates_returns_empty_on_http_status_error(self):
        request = httpx.Request("POST", "https://api.openai.com/v1/responses")
        response = httpx.Response(
            400,
            request=request,
            headers={"x-request-id": "req_test_bad_request"},
            json={
                "error": {
                    "message": "The following tools cannot be used with reasoning.effort 'minimal': web_search."
                }
            },
        )

        class _FakeAsyncClient:
            def __init__(self, *args, **kwargs):
                self.timeout = kwargs.get("timeout")

            async def __aenter__(self):
                return self

            async def __aexit__(self, exc_type, exc, tb):
                return False

            async def post(self, endpoint, *, headers, json):
                raise httpx.HTTPStatusError("bad request", request=request, response=response)

        settings = replace(
            get_settings(),
            openai_api_key="test-openai-key",
            openai_base_url="https://api.openai.com/v1",
            openai_model="gpt-5-mini",
        )
        service = OpenAIService(settings)

        with patch("services.httpx.AsyncClient", _FakeAsyncClient):
            results = await service.search_public_service_candidates(
                query="restaurant table for 6 in Sydney tonight",
                location_hint="Sydney",
            )

        self.assertEqual(results, [])
