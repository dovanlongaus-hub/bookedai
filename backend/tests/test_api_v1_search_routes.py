from __future__ import annotations

from contextlib import asynccontextmanager
from pathlib import Path
import sys
from types import SimpleNamespace
from unittest import TestCase
from unittest.mock import patch

from fastapi import FastAPI
from fastapi.testclient import TestClient

BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from api.v1_routes import (
    _query_intent_constraint_groups,
    _raw_query_intent_terms,
    _search_terms,
)
from api.v1_router import router as v1_router
from repositories.integration_repository import IntegrationRepository
from service_layer.prompt9_matching_service import RankedServiceMatch
from repositories.tenant_repository import TenantRepository


def create_test_app() -> FastAPI:
    app = FastAPI()
    app.include_router(v1_router)
    app.state.session_factory = object()
    app.state.settings = SimpleNamespace(
        admin_api_token="test-admin-token",
        admin_password="test-admin-password",
        admin_session_ttl_hours=8,
        google_oauth_client_id="google-client-id",
    )
    app.state.email_service = SimpleNamespace(
        smtp_configured=lambda: False,
        send_email=lambda **_: None,
    )
    app.state.communication_service = SimpleNamespace(
        sms_adapter=SimpleNamespace(provider_name="sms_twilio"),
        whatsapp_adapter=SimpleNamespace(provider_name="whatsapp_twilio"),
        sms_configured=lambda: False,
        whatsapp_configured=lambda: False,
        sms_safe_summary=lambda: {"provider": "sms_twilio", "enabled": False, "configured_fields": []},
        whatsapp_safe_summary=lambda: {"provider": "whatsapp_twilio", "enabled": False, "configured_fields": []},
        render_template=lambda **kwargs: kwargs.get("fallback_body") or "Rendered BookedAI template",
        send_sms=_async_noop,
        send_whatsapp=_async_noop,
    )
    return app


async def _resolve_tenant_id_stub(_request, _actor_context) -> str:
    return "tenant-test"


async def _async_noop(*_args, **_kwargs):
    return None


async def _async_true(*_args, **_kwargs):
    return True


async def _async_value(value):
    return value


def _async_value_factory(value):
    async def _inner(*_args, **_kwargs):
        return value

    return _inner


class _FakeExecuteResult:
    def __init__(self, value=None):
        self._value = value

    def scalar_one_or_none(self):
        return self._value

    def mappings(self):
        return SimpleNamespace(
            first=lambda: self._value,
            all=lambda: [] if self._value is None else [self._value],
        )

    def scalars(self):
        return SimpleNamespace(
            all=lambda: [] if self._value is None else [self._value],
            one_or_none=lambda: self._value,
        )


async def _fake_execute(*_args, **_kwargs):
    return _FakeExecuteResult()


@asynccontextmanager
async def _fake_get_session(_session_factory):
    yield SimpleNamespace(execute=_fake_execute, commit=_async_noop)


class _WritableFakeSession:
    def __init__(self, execute_result=None):
        self._execute_result = execute_result
        self.added = []

    async def execute(self, *_args, **_kwargs):
        return _FakeExecuteResult(self._execute_result)

    def add(self, value):
        self.added.append(value)

    async def flush(self):
        return None

    async def commit(self):
        return None


class ApiV1SearchRoutesTestCase(TestCase):
    def test_search_term_helpers_keep_vietnamese_intent_tokens(self):
        self.assertEqual(
            _search_terms(
                "Tôi cần dịch vụ support worker NDIS tại nhà ở Western Sydney",
                "Western Sydney",
                None,
            )[:4],
            ["support", "worker", "ndis", "western"],
        )
        self.assertEqual(
            _raw_query_intent_terms(
                "Tôi cần dịch vụ support worker NDIS tại nhà ở Western Sydney",
                location_hint="Western Sydney",
            )[:3],
            ["support", "worker", "ndis"],
        )

    def test_search_term_helpers_avoid_home_broadening_for_support_worker_queries(self):
        self.assertEqual(
            _raw_query_intent_terms(
                "NDIS support worker at home in Western Sydney tomorrow",
                location_hint="Western Sydney",
            )[:3],
            ["ndis", "support", "worker"],
        )

    def test_query_intent_constraint_groups_add_compound_retrieval_guards(self):
        self.assertEqual(
            _query_intent_constraint_groups("NDIS support worker at home in Western Sydney tomorrow"),
            [["support", "worker"], ["ndis", "disability", "community"]],
        )
        self.assertEqual(
            _query_intent_constraint_groups("restaurant table for 6 in Sydney tonight"),
            [
                ["restaurant", "dining", "table"],
                ["table", "booking", "reservation", "private", "group", "dinner", "lunch"],
            ],
        )

    def test_start_chat_session_returns_standard_success_envelope(self):
        with patch("api.v1_search_handlers._resolve_tenant_id", _resolve_tenant_id_stub):
            client = TestClient(create_test_app())
            response = client.post(
                "/api/v1/conversations/sessions",
                json={
                    "channel": "public_web",
                    "anonymous_session_id": "anon-123",
                    "actor_context": {
                        "channel": "public_web",
                        "tenant_id": "tenant-test",
                        "deployment_mode": "standalone_app",
                    },
                },
            )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["status"], "ok")
        self.assertEqual(payload["data"]["conversation_id"], "anon-123")
        self.assertIn("capabilities", payload["data"])
        self.assertEqual(payload["meta"]["version"], "v1")
        self.assertEqual(payload["meta"]["tenant_id"], "tenant-test")

    def test_customer_agent_turn_returns_reply_search_and_handoff(self):
        async def _search_candidates(_request, _payload):
            return SimpleNamespace(
                data={
                    "request_id": "match-test",
                    "candidates": [
                        {
                            "candidate_id": "svc-chess-1",
                            "provider_name": "Grandmaster Chess Academy",
                            "service_name": "Kids beginner chess class",
                            "source_type": "service_catalog",
                            "summary": "Beginner-friendly class.",
                            "match_score": 0.92,
                        }
                    ],
                    "recommendations": [
                        {
                            "candidate_id": "svc-chess-1",
                            "reason": "Best fit for a beginner child.",
                        }
                    ],
                    "confidence": {
                        "score": 0.92,
                        "reason": "Strong tenant catalog match.",
                        "gating_state": "high",
                        "evidence": ["service_catalog"],
                    },
                    "warnings": [],
                    "query_context": {"location_permission_needed": False},
                    "query_understanding": {
                        "normalized_query": "kids chess class in sydney this weekend",
                        "inferred_location": "Sydney",
                        "location_terms": ["sydney"],
                        "core_intent_terms": ["chess"],
                        "expanded_intent_terms": ["chess", "class"],
                        "constraint_terms": ["kids", "weekend"],
                        "near_me_requested": False,
                        "is_chat_style": True,
                        "requested_date": None,
                        "requested_time": None,
                        "schedule_hint": "this weekend",
                        "party_size": None,
                        "intent_label": "class_booking",
                        "summary": "Kids chess class in Sydney this weekend.",
                    },
                    "semantic_assist": {
                        "applied": False,
                        "evidence": [],
                    },
                    "booking_context": {
                        "summary": "Kids chess class in Sydney this weekend.",
                    },
                }
            )

        with patch("api.v1_search_handlers._resolve_tenant_id", _resolve_tenant_id_stub), patch(
            "api.v1_search_handlers.search_candidates",
            _search_candidates,
        ):
            client = TestClient(create_test_app())
            response = client.post(
                "/api/v1/agents/customer-turn",
                json={
                    "message": "kids chess class in Sydney this weekend",
                    "conversation_id": "conv-test",
                    "messages": [{"role": "user", "content": "kids chess"}],
                    "channel_context": {
                        "channel": "public_web",
                        "tenant_id": "tenant-test",
                        "deployment_mode": "standalone_app",
                    },
                },
            )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["status"], "ok")
        self.assertEqual(payload["data"]["conversation_id"], "conv-test")
        self.assertEqual(payload["data"]["phase"], "match")
        self.assertTrue(payload["data"]["handoff"]["revenue_ops_ready"])
        self.assertEqual(payload["data"]["search"]["request_id"], "match-test")

    def test_create_lead_returns_validation_error_envelope(self):
        with patch("api.v1_search_handlers._resolve_tenant_id", _resolve_tenant_id_stub):
            client = TestClient(create_test_app())
            response = client.post(
                "/api/v1/leads",
                json={
                    "lead_type": "booking_interest",
                    "contact": {
                        "full_name": "BookedAI User",
                        "email": None,
                        "phone": None,
                    },
                    "business_context": {},
                    "attribution": {
                        "source": "landing",
                    },
                    "intent_context": {},
                    "actor_context": {
                        "channel": "public_web",
                        "tenant_id": "tenant-test",
                    },
                },
            )

        self.assertEqual(response.status_code, 422)
        payload = response.json()
        self.assertEqual(payload["status"], "error")
        self.assertEqual(payload["error"]["code"], "validation_error")
        self.assertIn("contact", payload["error"]["details"])
        self.assertEqual(payload["meta"]["version"], "v1")

    def test_create_lead_returns_manual_review_status_when_crm_sync_requires_it(self):
        captured_phase2_calls: list[dict[str, object]] = []

        async def _upsert_contact(*_args, **_kwargs):
            return "contact-123"

        async def _upsert_lead(*_args, **_kwargs):
            return "lead-123"

        async def _orchestrate_lead_capture(*_args, **_kwargs):
            return SimpleNamespace(sync_status="manual_review_required", record_id=42)

        async def _record_phase2_write_activity(_session, **kwargs):
            captured_phase2_calls.append(kwargs)

        with patch("api.v1_search_handlers._resolve_tenant_id", _resolve_tenant_id_stub), patch(
            "api.v1_booking_handlers.get_session",
            _fake_get_session,
        ), patch(
            "api.v1_booking_handlers.ContactRepository.upsert_contact",
            _upsert_contact,
        ), patch(
            "api.v1_booking_handlers.LeadRepository.upsert_lead",
            _upsert_lead,
        ), patch(
            "api.v1_booking_handlers.orchestrate_lead_capture",
            _orchestrate_lead_capture,
        ), patch(
            "api.v1_booking_handlers._record_phase2_write_activity",
            _record_phase2_write_activity,
        ):
            client = TestClient(create_test_app())
            response = client.post(
                "/api/v1/leads",
                json={
                    "lead_type": "booking_interest",
                    "contact": {
                        "full_name": "BookedAI User",
                        "email": None,
                        "phone": "+61 400 000 000",
                    },
                    "business_context": {},
                    "attribution": {
                        "source": "landing",
                    },
                    "intent_context": {},
                    "actor_context": {
                        "channel": "public_web",
                        "tenant_id": "tenant-test",
                    },
                },
            )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["status"], "ok")
        self.assertEqual(payload["data"]["crm_sync_status"], "manual_review_required")
        self.assertEqual(payload["data"]["lead_id"], "lead-123")
        self.assertEqual(len(captured_phase2_calls), 1)
        self.assertEqual(captured_phase2_calls[0]["audit_event_type"], "lead.captured")
        self.assertEqual(captured_phase2_calls[0]["outbox_event_type"], "lead.capture.recorded")

    def test_search_candidates_returns_success_envelope(self):
        class _FakeExecuteResult:
            def scalars(self):
                return self

            def all(self):
                return []

        @asynccontextmanager
        async def _fake_search_session(_session_factory):
            async def _execute(*_args, **_kwargs):
                return _FakeExecuteResult()

            yield SimpleNamespace(execute=_execute, commit=_async_noop)

        with patch("api.v1_search_handlers._resolve_tenant_id", _resolve_tenant_id_stub), patch(
            "api.v1_search_handlers.get_session",
            _fake_search_session,
        ):
            client = TestClient(create_test_app())
            with patch(
                "api.v1_search_handlers.rank_catalog_matches",
                lambda **_kwargs: [],
            ):
                response = client.post(
                    "/api/v1/matching/search",
                    json={
                        "query": "haircut",
                        "location": "Sydney",
                        "preferences": {},
                        "channel_context": {
                            "channel": "public_web",
                            "tenant_id": "tenant-test",
                            "deployment_mode": "standalone_app",
                        },
                        "attribution": {
                            "source": "landing",
                        },
                    },
                )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["status"], "ok")
        self.assertEqual(payload["data"]["candidates"], [])
        self.assertEqual(payload["data"]["confidence"]["gating_state"], "low")
        self.assertEqual(payload["data"]["semantic_assist"]["applied"], False)

    def test_search_candidates_returns_scored_candidate_metadata(self):
        class _FakeExecuteResult:
            def scalars(self):
                return self

            def all(self):
                return []

        @asynccontextmanager
        async def _fake_search_session(_session_factory):
            async def _execute(*_args, **_kwargs):
                return _FakeExecuteResult()

            yield SimpleNamespace(execute=_execute, commit=_async_noop)

        ranked_match = RankedServiceMatch(
            service=SimpleNamespace(
                service_id="svc_featured",
                business_name="Harbour Studio",
                name="Kids Haircut Sydney",
                booking_url="https://book.example.com",
            ),
            score=0.87,
            explanation="Exact query phrase appears in the service name.",
            trust_signal="partner_verified",
            is_preferred=True,
            evidence=("exact_name_phrase", "within_budget"),
        )

        with patch("api.v1_search_handlers._resolve_tenant_id", _resolve_tenant_id_stub), patch(
            "api.v1_search_handlers.get_session",
            _fake_search_session,
        ), patch(
            "api.v1_search_handlers.rank_catalog_matches",
            lambda **_kwargs: [ranked_match],
        ):
            client = TestClient(create_test_app())
            response = client.post(
                "/api/v1/matching/search",
                json={
                    "query": "kids haircut",
                    "location": "Sydney",
                    "budget": {"max_aud": 80},
                    "preferences": {"requested_service_id": "svc_featured"},
                    "channel_context": {
                        "channel": "public_web",
                        "tenant_id": "tenant-test",
                        "deployment_mode": "standalone_app",
                    },
                },
            )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["status"], "ok")
        self.assertEqual(payload["data"]["candidates"][0]["match_score"], 0.87)
        self.assertEqual(payload["data"]["candidates"][0]["trust_signal"], "partner_verified")
        self.assertTrue(payload["data"]["candidates"][0]["is_preferred"])
        self.assertEqual(payload["data"]["candidates"][0]["booking_url"], "https://book.example.com")
        self.assertEqual(payload["data"]["candidates"][0]["category"], None)
        self.assertEqual(payload["data"]["candidates"][0]["source_label"], "Verified tenant partner")
        self.assertEqual(
            payload["data"]["candidates"][0]["price_posture"],
            "Price to confirm during booking",
        )
        self.assertEqual(payload["data"]["candidates"][0]["why_this_matches"], "Exact query phrase appears in the service name.")
        self.assertEqual(payload["data"]["confidence"]["evidence"], ["exact_name_phrase", "within_budget"])
        self.assertEqual(payload["data"]["search_strategy"], "catalog_term_retrieval_with_prompt9_rerank_with_relevance_gate")
        self.assertEqual(payload["data"]["booking_context"]["party_size"], None)
        self.assertEqual(payload["data"]["semantic_assist"]["applied"], False)

    def test_search_candidates_returns_booking_context_and_intelligent_next_step(self):
        class _FakeExecuteResult:
            def scalars(self):
                return self

            def all(self):
                return []

        @asynccontextmanager
        async def _fake_search_session(_session_factory):
            async def _execute(*_args, **_kwargs):
                return _FakeExecuteResult()

            yield SimpleNamespace(execute=_execute, commit=_async_noop)

        ranked_match = RankedServiceMatch(
            service=SimpleNamespace(
                service_id="svc_team_dinner",
                business_name="Harbour Dining",
                name="Private Dining Room",
                booking_url=None,
                featured=1,
            ),
            score=0.82,
            explanation="Large private dining match for tonight.",
            trust_signal="strong_catalog_match",
            is_preferred=False,
            evidence=("exact_name_phrase",),
        )

        with patch("api.v1_search_handlers._resolve_tenant_id", _resolve_tenant_id_stub), patch(
            "api.v1_search_handlers.get_session",
            _fake_search_session,
        ), patch(
            "api.v1_search_handlers.rank_catalog_matches",
            lambda **_kwargs: [ranked_match],
        ):
            client = TestClient(create_test_app())
            response = client.post(
                "/api/v1/matching/search",
                json={
                    "query": "Book a team dinner for 8 people tonight",
                    "location": "Sydney",
                    "preferences": {"service_category": "Restaurant"},
                    "channel_context": {
                        "channel": "public_web",
                        "tenant_id": "tenant-test",
                        "deployment_mode": "standalone_app",
                    },
                },
            )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["data"]["booking_context"]["party_size"], 8)
        self.assertEqual(payload["data"]["booking_context"]["schedule_hint"], "tonight")
        self.assertEqual(payload["data"]["booking_context"]["intent_label"], "ready_to_book")
        self.assertEqual(
            payload["data"]["query_understanding"]["normalized_query"],
            "book a team dinner for 8 people tonight",
        )
        self.assertEqual(payload["data"]["query_understanding"]["inferred_location"], "Sydney")
        self.assertIn("team", payload["data"]["query_understanding"]["core_intent_terms"])
        self.assertIn("party_size:8", payload["data"]["query_understanding"]["constraint_terms"])
        self.assertEqual(payload["data"]["query_understanding"]["requested_category"], "Restaurant")
        self.assertEqual(len(payload["data"]["candidates"]), 1)
        self.assertEqual(payload["data"]["candidates"][0]["candidate_id"], "svc_team_dinner")
        self.assertEqual(payload["data"]["candidates"][0]["booking_path_type"], "request_callback")
        self.assertEqual(
            payload["data"]["candidates"][0]["next_step"],
            "Submit your group details and the provider will confirm availability and pricing for your party size.",
        )
        self.assertEqual(payload["data"]["warnings"], [])
        self.assertEqual(
            payload["data"]["search_strategy"],
            "catalog_term_retrieval_with_prompt9_rerank_with_relevance_gate",
        )

    def test_search_candidates_returns_top_recommendations_in_deterministic_backend_order(self):
        class _FakeExecuteResult:
            def scalars(self):
                return self

            def all(self):
                return []

        @asynccontextmanager
        async def _fake_search_session(_session_factory):
            async def _execute(*_args, **_kwargs):
                return _FakeExecuteResult()

            yield SimpleNamespace(execute=_execute, commit=_async_noop)

        swim_noise = RankedServiceMatch(
            service=SimpleNamespace(
                service_id="svc_swim",
                business_name="Future Swim",
                name="Kids Swim Program",
                summary="Featured swim lessons in Sydney.",
                location="Sydney NSW",
                venue_name="Future Swim Centre",
                amount_aud=28,
                display_price="$28",
                featured=1,
                booking_url="https://book.example.com/swim",
            ),
            score=0.79,
            explanation="Featured kids activity in Sydney.",
            trust_signal="partner_verified",
            is_preferred=False,
            evidence=("location_overlap",),
        )
        chess_match = RankedServiceMatch(
            service=SimpleNamespace(
                service_id="svc_chess",
                business_name="Co Mai Hung Chess Class",
                name="Kids Chess Class - Sydney Pilot",
                summary="Structured chess lessons for kids in Sydney.",
                location="Sydney NSW",
                venue_name="Sydney Chess Studio",
                amount_aud=35,
                display_price="$35",
                featured=0,
                booking_url=None,
            ),
            score=0.73,
            explanation="Direct chess class match in Sydney.",
            trust_signal="strong_catalog_match",
            is_preferred=False,
            evidence=("core_intent_full_match", "name_overlap", "location_overlap"),
        )
        tutoring_match = RankedServiceMatch(
            service=SimpleNamespace(
                service_id="svc_tutor",
                business_name="Sydney Tutoring Co",
                name="Kids Strategy Tutor",
                summary="General tutoring support in Sydney.",
                location="Sydney NSW",
                venue_name="Tutor Rooms",
                amount_aud=42,
                display_price="$42",
                featured=0,
                booking_url=None,
            ),
            score=0.71,
            explanation="Related learning support in Sydney.",
            trust_signal="review_recommended",
            is_preferred=False,
            evidence=("summary_overlap", "location_overlap"),
        )

        with patch("api.v1_search_handlers._resolve_tenant_id", _resolve_tenant_id_stub), patch(
            "api.v1_search_handlers.get_session",
            _fake_search_session,
        ), patch(
            "api.v1_search_handlers.rank_catalog_matches",
            lambda **_kwargs: [swim_noise, chess_match, tutoring_match],
        ):
            client = TestClient(create_test_app())
            response = client.post(
                "/api/v1/matching/search",
                json={
                    "query": "chess classes in Sydney",
                    "location": "Sydney",
                    "channel_context": {
                        "channel": "public_web",
                        "tenant_id": "tenant-test",
                        "deployment_mode": "standalone_app",
                    },
                },
            )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(
            [item["candidate_id"] for item in payload["data"]["recommendations"]],
            ["svc_chess", "svc_tutor", "svc_swim"],
        )
        self.assertEqual(payload["data"]["candidates"][0]["candidate_id"], "svc_chess")
        self.assertEqual(payload["data"]["candidates"][0]["booking_path_type"], "request_callback")
        self.assertEqual(payload["data"]["candidates"][0]["booking_confidence"], "low")
        self.assertEqual(payload["data"]["candidates"][0]["source_label"], "Tenant catalog match")

    def test_search_candidates_returns_semantic_assist_metadata_when_rollout_enabled(self):
        class _FakeExecuteResult:
            def scalars(self):
                return self

            def all(self):
                return []

        @asynccontextmanager
        async def _fake_search_session(_session_factory):
            async def _execute(*_args, **_kwargs):
                return _FakeExecuteResult()

            yield SimpleNamespace(execute=_execute, commit=_async_noop)

        ranked_match = RankedServiceMatch(
            service=SimpleNamespace(
                service_id="svc_featured",
                business_name="Harbour Studio",
                name="Kids Haircut Sydney",
                booking_url="https://book.example.com",
            ),
            score=0.91,
            explanation="Semantic fit: Best match for a kids haircut in Sydney.",
            trust_signal="partner_verified",
            is_preferred=True,
            evidence=("exact_name_phrase", "semantic_model_rerank"),
            semantic_score=0.95,
            semantic_reason="Best match for a kids haircut in Sydney.",
        )

        class _FakeSemanticService:
            async def assist_catalog_ranking(self, **_kwargs):
                return SimpleNamespace(
                    ranked_matches=[ranked_match],
                    applied=True,
                    strategy="catalog_term_retrieval_with_prompt9_rerank_plus_semantic_model_assist",
                    evidence=("semantic_model_rerank", "location_specific_intent"),
                    provider="gemini",
                    provider_chain=("gemini",),
                    fallback_applied=False,
                    normalized_query="kids haircut sydney",
                    inferred_location="Sydney",
                    inferred_category="Salon",
                    budget_summary="within stated budget",
                )

        app = create_test_app()
        app.state.semantic_search_service = _FakeSemanticService()

        with patch("api.v1_search_handlers._resolve_tenant_id", _resolve_tenant_id_stub), patch(
            "api.v1_search_handlers.get_session",
            _fake_search_session,
        ), patch(
            "api.v1_search_handlers.rank_catalog_matches",
            lambda **_kwargs: [ranked_match],
        ), patch(
            "api.v1_search_handlers.is_flag_enabled",
            _async_true,
        ):
            client = TestClient(app)
            response = client.post(
                "/api/v1/matching/search",
                json={
                    "query": "kids haircut",
                    "location": "Sydney",
                    "preferences": {"requested_service_id": "svc_featured"},
                    "channel_context": {
                        "channel": "public_web",
                        "tenant_id": "tenant-test",
                        "deployment_mode": "standalone_app",
                    },
                },
            )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["status"], "ok")
        self.assertEqual(
            payload["data"]["search_strategy"],
            "catalog_term_retrieval_with_prompt9_rerank_plus_semantic_model_assist_with_relevance_gate",
        )
        self.assertTrue(payload["data"]["semantic_assist"]["applied"])
        self.assertEqual(payload["data"]["semantic_assist"]["provider"], "gemini")
        self.assertEqual(payload["data"]["semantic_assist"]["provider_chain"], ["gemini"])
        self.assertFalse(payload["data"]["semantic_assist"]["fallback_applied"])
        self.assertEqual(payload["data"]["semantic_assist"]["normalized_query"], "kids haircut sydney")
        self.assertEqual(payload["data"]["semantic_assist"]["inferred_location"], "Sydney")
        self.assertEqual(payload["data"]["semantic_assist"]["inferred_category"], "Salon")
        self.assertEqual(payload["data"]["candidates"][0]["semantic_score"], 0.95)
        self.assertEqual(
            payload["data"]["candidates"][0]["display_summary"],
            "Best match for a kids haircut in Sydney.",
        )
        self.assertEqual(payload["data"]["search_diagnostics"]["retrieval_candidate_count"], 0)
        self.assertEqual(payload["data"]["search_diagnostics"]["heuristic_candidate_ids"], ["svc_featured"])
        self.assertEqual(payload["data"]["search_diagnostics"]["semantic_candidate_ids"], ["svc_featured"])
        self.assertEqual(payload["data"]["search_diagnostics"]["final_candidate_ids"], ["svc_featured"])
        self.assertEqual(payload["data"]["search_diagnostics"]["dropped_candidates"], [])

    def test_search_candidates_drops_semantic_wrong_domain_results_even_when_semantic_rollout_is_on(self):
        class _FakeExecuteResult:
            def scalars(self):
                return self

            def all(self):
                return []

        @asynccontextmanager
        async def _fake_search_session(_session_factory):
            async def _execute(*_args, **_kwargs):
                return _FakeExecuteResult()

            yield SimpleNamespace(execute=_execute, commit=_async_noop)

        ranked_match = RankedServiceMatch(
            service=SimpleNamespace(
                service_id="svc_medical",
                business_name="Legacy Clinic",
                name="General Practice Consultation",
                category="Medical",
                summary="Clinic consultation.",
                venue_name="Legacy Clinic",
                location="Melbourne",
                booking_url=None,
                map_url=None,
                source_url=None,
                image_url=None,
                amount_aud=None,
                duration_minutes=None,
                tags_json=["medical", "clinic"],
                featured=0,
            ),
            score=0.81,
            explanation="Semantic model still left a clinic candidate in the list.",
            trust_signal="review_recommended",
            is_preferred=False,
            evidence=("semantic_model_rerank",),
            semantic_score=0.74,
            semantic_reason="Leftover clinic candidate.",
        )

        class _FakeSemanticService:
            async def assist_catalog_ranking(self, **_kwargs):
                return SimpleNamespace(
                    ranked_matches=[ranked_match],
                    applied=True,
                    strategy="catalog_term_retrieval_with_prompt9_rerank_plus_semantic_model_assist",
                    evidence=("semantic_model_rerank",),
                    provider="openai",
                    provider_chain=("openai",),
                    fallback_applied=False,
                    normalized_query="private dining melbourne",
                    inferred_location="Melbourne",
                    inferred_category="Restaurant",
                    budget_summary=None,
                    location_permission_needed=False,
                )

        app = create_test_app()
        app.state.semantic_search_service = _FakeSemanticService()

        with patch("api.v1_search_handlers._resolve_tenant_id", _resolve_tenant_id_stub), patch(
            "api.v1_search_handlers.get_session",
            _fake_search_session,
        ), patch(
            "api.v1_search_handlers.rank_catalog_matches",
            lambda **_kwargs: [ranked_match],
        ), patch(
            "api.v1_search_handlers.is_flag_enabled",
            _async_true,
        ):
            client = TestClient(app)
            response = client.post(
                "/api/v1/matching/search",
                json={
                    "query": "private dining Melbourne",
                    "channel_context": {
                        "channel": "public_web",
                        "tenant_id": "tenant-test",
                        "deployment_mode": "standalone_app",
                    },
                },
            )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["data"]["candidates"], [])
        self.assertEqual(payload["data"]["recommendations"], [])
        self.assertEqual(
            payload["data"]["warnings"],
            ["No strong relevant catalog candidates were found."],
        )
        self.assertTrue(payload["data"]["semantic_assist"]["applied"])
        self.assertEqual(payload["data"]["semantic_assist"]["inferred_category"], "Restaurant")
        self.assertEqual(payload["data"]["search_diagnostics"]["heuristic_candidate_ids"], ["svc_medical"])
        self.assertEqual(payload["data"]["search_diagnostics"]["post_domain_candidate_ids"], [])
        self.assertEqual(payload["data"]["search_diagnostics"]["final_candidate_ids"], [])
        self.assertEqual(payload["data"]["search_diagnostics"]["dropped_candidates"][0]["stage"], "semantic_domain_gate")

    def test_search_candidates_hides_weak_english_match_before_display(self):
        class _FakeExecuteResult:
            def scalars(self):
                return self

            def all(self):
                return []

        @asynccontextmanager
        async def _fake_search_session(_session_factory):
            async def _execute(*_args, **_kwargs):
                return _FakeExecuteResult()

            yield SimpleNamespace(execute=_execute, commit=_async_noop)

        ranked_match = RankedServiceMatch(
            service=SimpleNamespace(
                service_id="svc_generic_salon",
                business_name="City Beauty Group",
                name="Beauty Consultation",
                category="Salon",
                summary="General beauty category consultation.",
                venue_name="City Beauty Group",
                location="Sydney",
                booking_url=None,
                map_url=None,
                source_url=None,
                image_url=None,
                amount_aud=None,
                duration_minutes=None,
                tags_json=["beauty", "salon"],
                featured=1,
            ),
            score=0.49,
            explanation="Query aligns with the catalog category.",
            trust_signal="review_recommended",
            is_preferred=False,
            evidence=("category_overlap", "featured"),
        )

        with patch("api.v1_search_handlers._resolve_tenant_id", _resolve_tenant_id_stub), patch(
            "api.v1_search_handlers.get_session",
            _fake_search_session,
        ), patch(
            "api.v1_search_handlers.rank_catalog_matches",
            lambda **_kwargs: [ranked_match],
        ):
            client = TestClient(create_test_app())
            response = client.post(
                "/api/v1/matching/search",
                json={
                    "query": "I need a haircut in Sydney",
                    "preferences": {"service_category": "Salon"},
                    "channel_context": {
                        "channel": "public_web",
                        "tenant_id": "tenant-test",
                        "deployment_mode": "standalone_app",
                    },
                },
            )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["data"]["candidates"], [])
        self.assertEqual(payload["data"]["recommendations"], [])
        self.assertEqual(payload["data"]["confidence"]["gating_state"], "low")
        self.assertEqual(
            payload["data"]["search_diagnostics"]["dropped_candidates"],
            [
                {
                    "candidate_id": "svc_generic_salon",
                    "stage": "display_quality_gate",
                    "reason": "weak_top_match_or_low_display_confidence",
                }
            ],
        )

    def test_search_candidates_falls_back_to_public_web_when_tenant_catalog_has_no_relevant_match(self):
        class _FakeExecuteResult:
            def scalars(self):
                return self

            def all(self):
                return []

        @asynccontextmanager
        async def _fake_search_session(_session_factory):
            async def _execute(*_args, **_kwargs):
                return _FakeExecuteResult()

            yield SimpleNamespace(execute=_execute, commit=_async_noop)

        captured_web_kwargs: dict[str, Any] = {}

        class _FakeOpenAIService:
            async def search_public_service_candidates(self, **_kwargs):
                captured_web_kwargs.update(_kwargs)
                return [
                    {
                        "candidate_id": "web_haircut_1",
                        "provider_name": "Precision Barber Sydney",
                        "service_name": "Men's Haircut",
                        "summary": "Public web result for a nearby men's haircut in Sydney.",
                        "location": "Sydney NSW",
                        "source_url": "https://precision.example.com/haircut",
                        "booking_url": "https://precision.example.com/book",
                        "match_score": 0.68,
                        "why_this_matches": "Matched men's haircut intent in Sydney with a direct booking page.",
                    },
                    {
                        "candidate_id": "web_haircut_2",
                        "provider_name": "CBD Fade Studio",
                        "service_name": "Skin Fade",
                        "summary": "Sydney CBD skin fade with live booking.",
                        "location": "Sydney CBD NSW",
                        "source_url": "https://fade.example.com/skin-fade",
                        "booking_url": "https://fade.example.com/book",
                        "match_score": 0.75,
                        "why_this_matches": "Matched haircut intent, CBD location, and direct booking path.",
                    },
                    {
                        "candidate_id": "web_haircut_3",
                        "provider_name": "Harbour Barber",
                        "service_name": "Barber Cut",
                        "summary": "Harbour-area barber appointment.",
                        "location": "Sydney NSW",
                        "source_url": "https://harbour.example.com/cut",
                        "booking_url": "https://harbour.example.com/book",
                        "match_score": 0.71,
                        "why_this_matches": "Matched the haircut request with a provider-owned booking page.",
                    },
                    {
                        "candidate_id": "web_haircut_4",
                        "provider_name": "Extra Barber",
                        "service_name": "Extra Cut",
                        "summary": "Should be trimmed because only top three should display.",
                        "location": "Sydney NSW",
                        "source_url": "https://extra.example.com/cut",
                        "booking_url": "https://extra.example.com/book",
                        "match_score": 0.69,
                        "why_this_matches": "Extra result to ensure route keeps only top three.",
                    }
                ]

        app = create_test_app()
        app.state.openai_service = _FakeOpenAIService()

        with patch("api.v1_search_handlers._resolve_tenant_id", _resolve_tenant_id_stub), patch(
            "api.v1_search_handlers.get_session",
            _fake_search_session,
        ), patch(
            "api.v1_search_handlers.rank_catalog_matches",
            lambda **_kwargs: [],
        ):
            client = TestClient(app)
            response = client.post(
                "/api/v1/matching/search",
                json={
                    "query": "men's haircut in Sydney",
                    "preferences": {"service_category": "Salon"},
                    "budget": {"max_aud": 80},
                    "time_window": {"date": "2026-04-19", "time": "18:00", "label": "tomorrow evening"},
                    "channel_context": {
                        "channel": "public_web",
                        "tenant_id": "tenant-test",
                        "deployment_mode": "standalone_app",
                    },
                },
            )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(len(payload["data"]["candidates"]), 3)
        self.assertEqual(payload["data"]["candidates"][0]["candidate_id"], "web_haircut_1")
        self.assertEqual(payload["data"]["candidates"][0]["source_type"], "public_web_search")
        self.assertEqual(payload["data"]["candidates"][0]["source_url"], "https://precision.example.com/haircut")
        self.assertEqual(payload["data"]["candidates"][0]["booking_url"], "https://precision.example.com/book")
        self.assertEqual(
            payload["data"]["candidates"][0]["explanation"],
            "Matched men's haircut intent in Sydney with a direct booking page.",
        )
        self.assertEqual(payload["data"]["candidates"][0]["source_label"], "Sourced from the public web")
        self.assertEqual(
            payload["data"]["candidates"][0]["why_this_matches"],
            "Matched men's haircut intent in Sydney with a direct booking page.",
        )
        self.assertEqual(payload["data"]["candidates"][0]["booking_path_type"], "book_on_partner_site")
        self.assertEqual(payload["data"]["candidates"][0]["booking_confidence"], "medium")
        self.assertEqual(payload["data"]["recommendations"], [])
        self.assertEqual(payload["data"]["confidence"]["gating_state"], "medium")
        self.assertEqual(
            payload["data"]["warnings"],
            ["No strong tenant catalog candidates were found, so BookedAI is showing sourced public web options."],
        )
        self.assertEqual(
            payload["data"]["search_strategy"],
            "catalog_term_retrieval_with_prompt9_rerank_plus_public_web_search",
        )
        self.assertEqual(
            payload["data"]["search_diagnostics"]["final_candidate_ids"],
            ["web_haircut_1", "web_haircut_2", "web_haircut_3"],
        )
        self.assertEqual(captured_web_kwargs["location_hint"], "Sydney")
        self.assertEqual(captured_web_kwargs["budget"], {"max_aud": 80})
        self.assertEqual(captured_web_kwargs["preferences"], {"service_category": "Salon"})
        self.assertEqual(captured_web_kwargs["booking_context"]["requested_date"], "2026-04-19")
        self.assertEqual(captured_web_kwargs["booking_context"]["requested_time"], "18:00")
        self.assertEqual(captured_web_kwargs["booking_context"]["schedule_hint"], "tomorrow evening")

    def test_search_candidates_prefers_published_tenant_chess_match_over_public_web(self):
        class _FakeExecuteResult:
            def scalars(self):
                return self

            def all(self):
                return []

        @asynccontextmanager
        async def _fake_search_session(_session_factory):
            async def _execute(*_args, **_kwargs):
                return _FakeExecuteResult()

            yield SimpleNamespace(execute=_execute, commit=_async_noop)

        web_calls = 0

        class _FakeOpenAIService:
            async def search_public_service_candidates(self, **_kwargs):
                nonlocal web_calls
                web_calls += 1
                return [
                    {
                        "candidate_id": "web_chess_1",
                        "provider_name": "Sydney Academy of Chess",
                        "service_name": "Junior Chess Club",
                        "summary": "Public web chess fallback that should not win when tenant truth exists.",
                        "location": "Sydney NSW",
                        "source_url": "https://example.com/chess",
                        "booking_url": "https://example.com/book",
                        "match_score": 0.94,
                        "why_this_matches": "Public web fallback should stay unused in this test.",
                    }
                ]

        ranked_match = RankedServiceMatch(
            service=SimpleNamespace(
                service_id="co-mai-hung-chess-online-group-60",
                business_name="Co Mai Hung Chess Class",
                name="Online Group Chess Class",
                category="Kids Services",
                summary="Tournament-oriented online group chess coaching for children.",
                venue_name="Co Mai Hung Chess Class",
                location="Sydney NSW",
                booking_url="https://bookedai.example.com/chess",
                map_url=None,
                source_url=None,
                image_url=None,
                amount_aud=20,
                duration_minutes=60,
                tags_json=["kids", "children", "chess", "class", "online"],
                featured=1,
            ),
            score=0.97,
            explanation="Published tenant chess service matches the request directly.",
            trust_signal="strong_catalog_match",
            is_preferred=True,
            evidence=("exact_service_terms", "location_match", "featured"),
        )

        app = create_test_app()
        app.state.openai_service = _FakeOpenAIService()

        with patch("api.v1_search_handlers._resolve_tenant_id", _resolve_tenant_id_stub), patch(
            "api.v1_search_handlers.get_session",
            _fake_search_session,
        ), patch(
            "api.v1_search_handlers.rank_catalog_matches",
            lambda **_kwargs: [ranked_match],
        ):
            client = TestClient(app)
            response = client.post(
                "/api/v1/matching/search",
                json={
                    "query": "chess classes in Sydney",
                    "location": "Sydney",
                    "preferences": {"service_category": "Kids Services"},
                    "channel_context": {
                        "channel": "public_web",
                        "tenant_id": "tenant-test",
                        "deployment_mode": "standalone_app",
                    },
                },
            )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(web_calls, 0)
        self.assertEqual(payload["data"]["candidates"][0]["candidate_id"], "co-mai-hung-chess-online-group-60")
        self.assertEqual(payload["data"]["candidates"][0]["source_type"], "service_catalog")
        self.assertEqual(payload["data"]["candidates"][0]["provider_name"], "Co Mai Hung Chess Class")
        self.assertEqual(payload["data"]["warnings"], [])
        self.assertNotIn("public_web_search", payload["data"]["search_strategy"])

    def test_search_candidates_falls_back_to_public_web_for_chess_when_no_publish_ready_tenant_match_exists(self):
        class _FakeExecuteResult:
            def scalars(self):
                return self

            def all(self):
                return []

        @asynccontextmanager
        async def _fake_search_session(_session_factory):
            async def _execute(*_args, **_kwargs):
                return _FakeExecuteResult()

            yield SimpleNamespace(execute=_execute, commit=_async_noop)

        web_calls = 0

        class _FakeOpenAIService:
            async def search_public_service_candidates(self, **_kwargs):
                nonlocal web_calls
                web_calls += 1
                return [
                    {
                        "candidate_id": "web_chess_1",
                        "provider_name": "Sydney Academy of Chess",
                        "service_name": "Junior Chess Clubs & Group Lessons",
                        "summary": "Public web chess result for Sydney families.",
                        "location": "Sydney NSW",
                        "source_url": "https://sydneyacademy.example.com/chess",
                        "booking_url": "https://sydneyacademy.example.com/book",
                        "match_score": 0.91,
                        "why_this_matches": "Matched Sydney chess class intent with a direct provider page.",
                    },
                    {
                        "candidate_id": "web_chess_2",
                        "provider_name": "Smart Kids Chess",
                        "service_name": "In-person and Online Chess Classes",
                        "summary": "Sydney-area chess classes for kids.",
                        "location": "Sydney NSW",
                        "source_url": "https://smartkids.example.com/chess",
                        "booking_url": "https://smartkids.example.com/book",
                        "match_score": 0.86,
                        "why_this_matches": "Matched kids chess classes in Sydney with direct booking details.",
                    },
                ]

        app = create_test_app()
        app.state.openai_service = _FakeOpenAIService()

        with patch("api.v1_search_handlers._resolve_tenant_id", _resolve_tenant_id_stub), patch(
            "api.v1_search_handlers.get_session",
            _fake_search_session,
        ), patch(
            "api.v1_search_handlers.rank_catalog_matches",
            lambda **_kwargs: [],
        ):
            client = TestClient(app)
            response = client.post(
                "/api/v1/matching/search",
                json={
                    "query": "chess classes in Sydney",
                    "location": "Sydney",
                    "preferences": {"service_category": "Kids Services"},
                    "channel_context": {
                        "channel": "public_web",
                        "tenant_id": "tenant-test",
                        "deployment_mode": "standalone_app",
                    },
                },
            )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(web_calls, 1)
        self.assertEqual(payload["data"]["candidates"][0]["candidate_id"], "web_chess_1")
        self.assertEqual(payload["data"]["candidates"][0]["source_type"], "public_web_search")
        self.assertEqual(payload["data"]["candidates"][0]["source_label"], "Sourced from the public web")
        self.assertEqual(payload["data"]["candidates"][0]["price_posture"], "Check provider site for final pricing")
        self.assertEqual(
            payload["data"]["warnings"],
            ["No strong tenant catalog candidates were found, so BookedAI is showing sourced public web options."],
        )
        self.assertEqual(
            payload["data"]["search_strategy"],
            "catalog_term_retrieval_with_prompt9_rerank_plus_public_web_search",
        )

    def test_search_candidates_for_restaurant_uses_live_web_only_and_exposes_call_path(self):
        class _FakeExecuteResult:
            def scalars(self):
                return self

            def all(self):
                return []

        @asynccontextmanager
        async def _fake_search_session(_session_factory):
            async def _execute(*_args, **_kwargs):
                return _FakeExecuteResult()

            yield SimpleNamespace(execute=_execute, commit=_async_noop)

        web_calls = 0

        class _FakeOpenAIService:
            async def search_public_service_candidates(self, **_kwargs):
                nonlocal web_calls
                web_calls += 1
                return [
                    {
                        "candidate_id": "web_restaurant_1",
                        "provider_name": "Harbour Table",
                        "service_name": "Dinner reservation",
                        "summary": "Venue-level dinner booking near Circular Quay.",
                        "location": "Sydney NSW",
                        "source_url": "https://harbour.example.com/reservations",
                        "booking_url": None,
                        "contact_phone": "(02) 9123 4567",
                        "match_score": 0.88,
                        "why_this_matches": "Official venue result with a direct reservation phone path.",
                    }
                ]

        app = create_test_app()
        app.state.openai_service = _FakeOpenAIService()

        rank_calls = 0

        def _capture_rank_catalog_matches(**_kwargs):
            nonlocal rank_calls
            rank_calls += 1
            return []

        with patch("api.v1_search_handlers._resolve_tenant_id", _resolve_tenant_id_stub), patch(
            "api.v1_search_handlers.get_session",
            _fake_search_session,
        ), patch(
            "api.v1_search_handlers.rank_catalog_matches",
            _capture_rank_catalog_matches,
        ):
            client = TestClient(app)
            response = client.post(
                "/api/v1/matching/search",
                json={
                    "query": "restaurant near me tonight",
                    "preferences": {"service_category": "Food and Beverage"},
                    "user_location": {"latitude": -33.8688, "longitude": 151.2093},
                    "channel_context": {
                        "channel": "public_web",
                        "tenant_id": "tenant-test",
                        "deployment_mode": "standalone_app",
                    },
                },
            )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(web_calls, 1)
        self.assertEqual(rank_calls, 1)
        self.assertEqual(payload["data"]["candidates"][0]["source_type"], "public_web_search")
        self.assertEqual(payload["data"]["candidates"][0]["contact_phone"], "(02) 9123 4567")
        self.assertEqual(payload["data"]["candidates"][0]["booking_path_type"], "call_provider")
        self.assertEqual(payload["data"]["candidates"][0]["next_step"], "Call the venue directly to confirm the table booking.")
        self.assertEqual(
            payload["data"]["warnings"],
            ["No strong tenant catalog candidates were found, so BookedAI is showing sourced public web options."],
        )
        self.assertEqual(
            payload["data"]["search_strategy"],
            "catalog_term_retrieval_with_prompt9_rerank_plus_public_web_search",
        )
        self.assertEqual(
            payload["data"]["confidence"]["reason"],
            "No strong tenant catalog candidate was found, so BookedAI switched to sourced public web results.",
        )

    def test_search_candidates_infers_location_hint_from_query_when_payload_location_missing(self):
        class _FakeExecuteResult:
            def scalars(self):
                return self

            def all(self):
                return []

        @asynccontextmanager
        async def _fake_search_session(_session_factory):
            async def _execute(*_args, **_kwargs):
                return _FakeExecuteResult()

            yield SimpleNamespace(execute=_execute, commit=_async_noop)

        captured_kwargs: dict[str, Any] = {}

        def _capture_rank_catalog_matches(**kwargs):
            captured_kwargs.update(kwargs)
            return []

        with patch("api.v1_search_handlers._resolve_tenant_id", _resolve_tenant_id_stub), patch(
            "api.v1_search_handlers.get_session",
            _fake_search_session,
        ), patch(
            "api.v1_search_handlers.rank_catalog_matches",
            _capture_rank_catalog_matches,
        ):
            client = TestClient(create_test_app())
            response = client.post(
                "/api/v1/matching/search",
                json={
                    "query": "skin care Sydney under 150",
                    "preferences": {},
                    "channel_context": {
                        "channel": "public_web",
                        "tenant_id": "tenant-test",
                        "deployment_mode": "standalone_app",
                    },
                    "attribution": {
                        "source": "landing",
                    },
                },
            )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(captured_kwargs["location_hint"], "Sydney")

    def test_search_candidates_requires_topic_and_location_filters_when_available(self):
        class _FakeExecuteResult:
            def scalars(self):
                return self

            def all(self):
                return []

        captured_statement: dict[str, Any] = {}

        @asynccontextmanager
        async def _fake_search_session(_session_factory):
            async def _execute(statement, *_args, **_kwargs):
                sql = str(statement)
                if "service_merchant_profiles" in sql and "feature_flags" not in sql:
                    captured_statement["sql"] = sql
                    captured_statement["params"] = {
                        key: str(value)
                        for key, value in statement.compile().params.items()
                    }
                return _FakeExecuteResult()

            yield SimpleNamespace(execute=_execute, commit=_async_noop)

        with patch("api.v1_search_handlers._resolve_tenant_id", _resolve_tenant_id_stub), patch(
            "api.v1_search_handlers.get_session",
            _fake_search_session,
        ), patch(
            "api.v1_search_handlers.rank_catalog_matches",
            lambda **_kwargs: [],
        ):
            client = TestClient(create_test_app())
            response = client.post(
                "/api/v1/matching/search",
                json={
                    "query": "skin care Sydney under 150",
                    "preferences": {"service_category": "Spa"},
                    "channel_context": {
                        "channel": "public_web",
                        "tenant_id": "tenant-test",
                        "deployment_mode": "standalone_app",
                    },
                },
            )

        self.assertEqual(response.status_code, 200)
        self.assertIn(" AND ", captured_statement["sql"])
        self.assertIn("service_merchant_profiles.location", captured_statement["sql"])
        self.assertIn("service_merchant_profiles.name", captured_statement["sql"])

    def test_search_candidates_requires_raw_query_intent_terms_not_just_category_overlap(self):
        class _FakeExecuteResult:
            def scalars(self):
                return self

            def all(self):
                return []

        captured_statement: dict[str, str] = {}

        @asynccontextmanager
        async def _fake_search_session(_session_factory):
            async def _execute(statement, *_args, **_kwargs):
                sql = str(statement)
                if "service_merchant_profiles" in sql and "feature_flags" not in sql:
                    captured_statement["sql"] = sql
                    captured_statement["params"] = {
                        key: str(value)
                        for key, value in statement.compile().params.items()
                    }
                return _FakeExecuteResult()

            yield SimpleNamespace(execute=_execute, commit=_async_noop)

        with patch("api.v1_search_handlers._resolve_tenant_id", _resolve_tenant_id_stub), patch(
            "api.v1_search_handlers.get_session",
            _fake_search_session,
        ), patch(
            "api.v1_search_handlers.rank_catalog_matches",
            lambda **_kwargs: [],
        ):
            client = TestClient(create_test_app())
            response = client.post(
                "/api/v1/matching/search",
                json={
                    "query": "kids haircut Sydney",
                    "preferences": {"service_category": "Salon"},
                    "channel_context": {
                        "channel": "public_web",
                        "tenant_id": "tenant-test",
                        "deployment_mode": "standalone_app",
                    },
                },
            )

        self.assertEqual(response.status_code, 200)
        self.assertIn("service_merchant_profiles.category", captured_statement["sql"])
        self.assertIn("service_merchant_profiles.location", captured_statement["sql"])
        self.assertIn("%kids%", captured_statement["params"].values())
        self.assertIn("%haircut%", captured_statement["params"].values())
