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

from api.v1_routes import router as v1_router
from service_layer.prompt9_matching_service import RankedServiceMatch


def create_test_app() -> FastAPI:
    app = FastAPI()
    app.include_router(v1_router)
    app.state.session_factory = object()
    app.state.email_service = SimpleNamespace(
        smtp_configured=lambda: False,
        send_email=lambda **_: None,
    )
    return app


async def _resolve_tenant_id_stub(_request, _actor_context) -> str:
    return "tenant-test"


async def _async_noop(*_args, **_kwargs):
    return None


async def _async_true(*_args, **_kwargs):
    return True


@asynccontextmanager
async def _fake_get_session(_session_factory):
    yield SimpleNamespace(execute=_async_noop, commit=_async_noop)


class ApiV1RoutesTestCase(TestCase):
    def test_start_chat_session_returns_standard_success_envelope(self):
        with patch("api.v1_routes._resolve_tenant_id", _resolve_tenant_id_stub):
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

    def test_create_lead_returns_validation_error_envelope(self):
        with patch("api.v1_routes._resolve_tenant_id", _resolve_tenant_id_stub):
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

    def test_send_lifecycle_email_returns_success_envelope_when_smtp_unconfigured(self):
        app = create_test_app()
        app.state.email_service = SimpleNamespace(
            smtp_configured=lambda: False,
            send_email=_async_noop,
        )

        with patch("api.v1_routes._resolve_tenant_id", _resolve_tenant_id_stub), patch(
            "api.v1_routes.get_session",
            _fake_get_session,
        ):
            client = TestClient(app)
            response = client.post(
                "/api/v1/email/messages/send",
                json={
                    "template_key": "booking_confirmation",
                    "to": ["hello@example.com"],
                    "variables": {"booking_reference": "BR-123"},
                    "actor_context": {
                        "channel": "admin",
                        "tenant_id": "tenant-test",
                    },
                },
            )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["status"], "ok")
        self.assertEqual(payload["data"]["delivery_status"], "queued")
        self.assertTrue(payload["data"]["warnings"])
        self.assertEqual(payload["meta"]["tenant_id"], "tenant-test")

    def test_create_lead_returns_manual_review_status_when_crm_sync_requires_it(self):
        async def _upsert_contact(*_args, **_kwargs):
            return "contact-123"

        async def _upsert_lead(*_args, **_kwargs):
            return "lead-123"

        async def _orchestrate_lead_capture(*_args, **_kwargs):
            return SimpleNamespace(sync_status="manual_review_required", record_id=42)

        with patch("api.v1_routes._resolve_tenant_id", _resolve_tenant_id_stub), patch(
            "api.v1_routes.get_session",
            _fake_get_session,
        ), patch(
            "api.v1_routes.ContactRepository.upsert_contact",
            _upsert_contact,
        ), patch(
            "api.v1_routes.LeadRepository.upsert_lead",
            _upsert_lead,
        ), patch(
            "api.v1_routes.orchestrate_lead_capture",
            _orchestrate_lead_capture,
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

    def test_integration_attention_returns_success_envelope(self):
        async def _build_integration_attention_items(*_args, **_kwargs):
            return [
                {
                    "source": "crm_sync",
                    "issue_type": "manual_review_required",
                    "severity": "medium",
                    "item_count": 2,
                    "latest_at": None,
                    "recommended_action": "Review CRM sync ledger and reconcile local lead state.",
                }
            ]

        with patch("api.v1_routes._resolve_tenant_id", _resolve_tenant_id_stub), patch(
            "api.v1_routes.get_session",
            _fake_get_session,
        ), patch(
            "api.v1_routes.build_integration_attention_items",
            _build_integration_attention_items,
        ):
            client = TestClient(create_test_app())
            response = client.get("/api/v1/integrations/attention")

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["status"], "ok")
        self.assertEqual(payload["data"]["items"][0]["source"], "crm_sync")
        self.assertEqual(payload["data"]["items"][0]["item_count"], 2)
        self.assertEqual(payload["meta"]["tenant_id"], "tenant-test")

    def test_integration_attention_triage_returns_success_envelope(self):
        async def _build_attention_triage_snapshot(*_args, **_kwargs):
            return {
                "status": "operator_action_required",
                "triage_lanes": {
                    "immediate_action": [
                        {
                            "source": "crm_sync",
                            "issue_type": "manual_review_required",
                            "severity": "high",
                            "item_count": 2,
                            "latest_at": None,
                            "recommended_action": "Review CRM sync ledger and reconcile local lead state.",
                        }
                    ],
                    "monitor": [],
                    "stable": [],
                },
                "source_slices": [
                    {
                        "source": "crm_sync",
                        "open_items": 3,
                        "highest_severity": "high",
                        "manual_review_count": 2,
                        "failed_count": 0,
                        "pending_count": 1,
                        "latest_at": None,
                        "operator_note": "Reconcile CRM sync issues before enabling broader sync automation.",
                    }
                ],
                "retry_posture": {
                    "queued_retries": 1,
                    "manual_review_backlog": 2,
                    "failed_records": 0,
                    "latest_retry_at": None,
                    "hold_recommended": True,
                    "operator_note": "Hold broader rollout if queued retries are not burning down or failed CRM records continue to grow.",
                },
            }

        with patch("api.v1_routes._resolve_tenant_id", _resolve_tenant_id_stub), patch(
            "api.v1_routes.get_session",
            _fake_get_session,
        ), patch(
            "api.v1_routes.build_attention_triage_snapshot",
            _build_attention_triage_snapshot,
        ):
            client = TestClient(create_test_app())
            response = client.get("/api/v1/integrations/attention/triage")

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["status"], "ok")
        self.assertEqual(payload["data"]["status"], "operator_action_required")
        self.assertEqual(payload["data"]["triage_lanes"]["immediate_action"][0]["source"], "crm_sync")
        self.assertEqual(payload["data"]["retry_posture"]["queued_retries"], 1)
        self.assertEqual(payload["meta"]["tenant_id"], "tenant-test")

    def test_integration_reconciliation_details_returns_success_envelope(self):
        async def _build_reconciliation_details(*_args, **_kwargs):
            return {
                "status": "attention_required",
                "checked_at": None,
                "summary": {
                    "attention_required_sections": 1,
                    "monitoring_sections": 1,
                    "healthy_sections": 2,
                },
                "sections": [
                    {
                        "area": "crm_sync",
                        "status": "attention_required",
                        "total_count": 4,
                        "pending_count": 1,
                        "manual_review_count": 1,
                        "failed_count": 1,
                        "latest_at": None,
                        "recommended_action": "Reconcile CRM sync issues before enabling broader sync automation.",
                    }
                ],
            }

        with patch("api.v1_routes._resolve_tenant_id", _resolve_tenant_id_stub), patch(
            "api.v1_routes.get_session",
            _fake_get_session,
        ), patch(
            "api.v1_routes.build_reconciliation_details",
            _build_reconciliation_details,
        ):
            client = TestClient(create_test_app())
            response = client.get("/api/v1/integrations/reconciliation/details")

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["status"], "ok")
        self.assertEqual(payload["data"]["status"], "attention_required")
        self.assertEqual(payload["data"]["sections"][0]["area"], "crm_sync")
        self.assertEqual(payload["meta"]["tenant_id"], "tenant-test")

    def test_retry_crm_sync_returns_success_envelope(self):
        async def _queue_crm_sync_retry(*_args, **_kwargs):
            return SimpleNamespace(
                record_id=42,
                sync_status="retrying",
                warning_codes=["retry_from_manual_review_required"],
            )

        with patch("api.v1_routes._resolve_tenant_id", _resolve_tenant_id_stub), patch(
            "api.v1_routes.get_session",
            _fake_get_session,
        ), patch(
            "api.v1_routes.queue_crm_sync_retry",
            _queue_crm_sync_retry,
        ):
            client = TestClient(create_test_app())
            response = client.post(
                "/api/v1/integrations/crm-sync/retry",
                json={
                    "crm_sync_record_id": 42,
                    "actor_context": {
                        "channel": "admin",
                        "tenant_id": "tenant-test",
                    },
                },
            )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["status"], "ok")
        self.assertEqual(payload["data"]["crm_sync_record_id"], 42)
        self.assertEqual(payload["data"]["sync_status"], "retrying")
        self.assertEqual(payload["data"]["warnings"], ["retry_from_manual_review_required"])

    def test_integration_provider_statuses_returns_success_envelope(self):
        async def _build_integration_provider_statuses(*_args, **_kwargs):
            return [
                {
                    "provider": "zoho_crm",
                    "status": "connected",
                    "sync_mode": "read_only",
                    "safe_config": {
                        "provider": "zoho_crm",
                        "enabled": True,
                        "configured_fields": ["client_id"],
                        "label": "Integration connection",
                        "notes": [],
                    },
                    "updated_at": None,
                }
            ]

        with patch("api.v1_routes._resolve_tenant_id", _resolve_tenant_id_stub), patch(
            "api.v1_routes.get_session",
            _fake_get_session,
        ), patch(
            "api.v1_routes.build_integration_provider_statuses",
            _build_integration_provider_statuses,
        ):
            client = TestClient(create_test_app())
            response = client.get("/api/v1/integrations/providers/status")

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["status"], "ok")
        self.assertEqual(payload["data"]["items"][0]["provider"], "zoho_crm")
        self.assertEqual(payload["data"]["items"][0]["status"], "connected")

    def test_integration_reconciliation_summary_returns_success_envelope(self):
        async def _build_reconciliation_summary(*_args, **_kwargs):
            return {
                "status": "healthy",
                "checked_at": None,
                "conflicts": [],
                "metadata": {"total_jobs": 1},
            }

        with patch("api.v1_routes._resolve_tenant_id", _resolve_tenant_id_stub), patch(
            "api.v1_routes.get_session",
            _fake_get_session,
        ), patch(
            "api.v1_routes.build_reconciliation_summary",
            _build_reconciliation_summary,
        ):
            client = TestClient(create_test_app())
            response = client.get("/api/v1/integrations/reconciliation/summary")

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["status"], "ok")
        self.assertEqual(payload["data"]["status"], "healthy")
        self.assertEqual(payload["data"]["metadata"]["total_jobs"], 1)

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

        with patch("api.v1_routes._resolve_tenant_id", _resolve_tenant_id_stub), patch(
            "api.v1_routes.get_session",
            _fake_search_session,
        ):
            client = TestClient(create_test_app())
            with patch(
                "api.v1_routes.rank_catalog_matches",
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

        with patch("api.v1_routes._resolve_tenant_id", _resolve_tenant_id_stub), patch(
            "api.v1_routes.get_session",
            _fake_search_session,
        ), patch(
            "api.v1_routes.rank_catalog_matches",
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
        self.assertEqual(payload["data"]["confidence"]["evidence"], ["exact_name_phrase", "within_budget"])
        self.assertEqual(payload["data"]["search_strategy"], "catalog_term_retrieval_with_prompt9_rerank_with_relevance_gate")
        self.assertEqual(payload["data"]["semantic_assist"]["applied"], False)

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
                )

        app = create_test_app()
        app.state.semantic_search_service = _FakeSemanticService()

        with patch("api.v1_routes._resolve_tenant_id", _resolve_tenant_id_stub), patch(
            "api.v1_routes.get_session",
            _fake_search_session,
        ), patch(
            "api.v1_routes.rank_catalog_matches",
            lambda **_kwargs: [ranked_match],
        ), patch(
            "api.v1_routes.is_flag_enabled",
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
        self.assertEqual(payload["data"]["candidates"][0]["semantic_score"], 0.95)

    def test_booking_trust_returns_success_envelope(self):
        async def _execute(*_args, **_kwargs):
            return SimpleNamespace(scalar_one_or_none=lambda: None)

        @asynccontextmanager
        async def _fake_trust_session(_session_factory):
            yield SimpleNamespace(execute=_execute, commit=_async_noop)

        with patch("api.v1_routes._resolve_tenant_id", _resolve_tenant_id_stub), patch(
            "api.v1_routes.get_session",
            _fake_trust_session,
        ):
            client = TestClient(create_test_app())
            response = client.post(
                "/api/v1/booking-trust/checks",
                json={
                    "candidate_id": "svc_123",
                    "desired_slot": None,
                    "party_size": 2,
                    "channel": "public_web",
                    "actor_context": {
                        "channel": "public_web",
                        "tenant_id": "tenant-test",
                    },
                },
            )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["status"], "ok")
        self.assertIn("availability_state", payload["data"])
        self.assertIn("recommended_booking_path", payload["data"])

    def test_booking_path_resolve_returns_success_envelope(self):
        with patch("api.v1_routes._resolve_tenant_id", _resolve_tenant_id_stub):
            client = TestClient(create_test_app())
            response = client.post(
                "/api/v1/bookings/path/resolve",
                json={
                    "candidate_id": "svc_123",
                    "availability_state": "available",
                    "booking_confidence": "high",
                    "payment_option": "invoice_after_confirmation",
                    "channel": "public_web",
                    "actor_context": {
                        "channel": "public_web",
                        "tenant_id": "tenant-test",
                    },
                    "context": {
                        "source_page": "/",
                    },
                },
            )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["status"], "ok")
        self.assertIn("path_type", payload["data"])
        self.assertIn("payment_allowed_before_confirmation", payload["data"])
