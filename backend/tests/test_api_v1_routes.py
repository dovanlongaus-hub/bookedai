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
from repositories.tenant_repository import TenantRepository


def create_test_app() -> FastAPI:
    app = FastAPI()
    app.include_router(v1_router)
    app.state.session_factory = object()
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

    def test_send_sms_returns_success_envelope_when_provider_unconfigured(self):
        app = create_test_app()
        app.state.communication_service = SimpleNamespace(
            render_template=lambda **kwargs: kwargs.get("fallback_body") or "Rendered BookedAI template",
            send_sms=lambda **_: _async_value(
                SimpleNamespace(
                    provider="sms_twilio",
                    delivery_status="queued",
                    provider_message_id=None,
                    warnings=["SMS provider is not fully configured; message was recorded for manual review."],
                )
            ),
        )

        with patch("api.v1_routes._resolve_tenant_id", _resolve_tenant_id_stub), patch(
            "api.v1_routes.get_session",
            _fake_get_session,
        ), patch(
            "api.v1_routes.orchestrate_communication_touch",
            _async_value_factory(
                SimpleNamespace(
                    message_id="msg-sms-1",
                    delivery_status="queued",
                    provider="sms_twilio",
                    warning_codes=["provider_unconfigured"],
                )
            ),
        ):
            client = TestClient(app)
            response = client.post(
                "/api/v1/sms/messages/send",
                json={
                    "to": "+61400000000",
                    "body": "Hello from BookedAI",
                    "actor_context": {
                        "channel": "admin",
                        "tenant_id": "tenant-test",
                    },
                },
            )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["status"], "ok")
        self.assertEqual(payload["data"]["message_id"], "msg-sms-1")
        self.assertEqual(payload["data"]["delivery_status"], "queued")
        self.assertEqual(payload["data"]["provider"], "sms_twilio")

    def test_send_whatsapp_returns_success_envelope_when_provider_unconfigured(self):
        app = create_test_app()
        app.state.communication_service = SimpleNamespace(
            render_template=lambda **kwargs: kwargs.get("fallback_body") or "Rendered BookedAI template",
            send_whatsapp=lambda **_: _async_value(
                SimpleNamespace(
                    provider="whatsapp_twilio",
                    delivery_status="queued",
                    provider_message_id=None,
                    warnings=["WhatsApp provider is not fully configured; message was recorded for manual review."],
                )
            ),
        )

        with patch("api.v1_routes._resolve_tenant_id", _resolve_tenant_id_stub), patch(
            "api.v1_routes.get_session",
            _fake_get_session,
        ), patch(
            "api.v1_routes.orchestrate_communication_touch",
            _async_value_factory(
                SimpleNamespace(
                    message_id="msg-wa-1",
                    delivery_status="queued",
                    provider="whatsapp_twilio",
                    warning_codes=["provider_unconfigured"],
                )
            ),
        ):
            client = TestClient(app)
            response = client.post(
                "/api/v1/whatsapp/messages/send",
                json={
                    "to": "+61400000000",
                    "body": "Hello from BookedAI on WhatsApp",
                    "actor_context": {
                        "channel": "admin",
                        "tenant_id": "tenant-test",
                    },
                },
            )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["status"], "ok")
        self.assertEqual(payload["data"]["message_id"], "msg-wa-1")
        self.assertEqual(payload["data"]["delivery_status"], "queued")
        self.assertEqual(payload["data"]["provider"], "whatsapp_twilio")

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
        ), patch(
            "api.v1_routes._record_phase2_write_activity",
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

    def test_create_booking_intent_records_phase2_audit_and_outbox_activity(self):
        captured_phase2_calls: list[dict[str, object]] = []

        async def _upsert_contact(*_args, **_kwargs):
            return "contact-123"

        async def _upsert_lead(*_args, **_kwargs):
            return "lead-123"

        async def _upsert_booking_intent(*_args, **_kwargs):
            return "booking-intent-123"

        async def _record_phase2_write_activity(_session, **kwargs):
            captured_phase2_calls.append(kwargs)

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
            "api.v1_routes.BookingIntentRepository.upsert_booking_intent",
            _upsert_booking_intent,
        ), patch(
            "api.v1_routes._record_phase2_write_activity",
            _record_phase2_write_activity,
        ):
            client = TestClient(create_test_app())
            response = client.post(
                "/api/v1/bookings/intents",
                json={
                    "contact": {
                        "full_name": "BookedAI User",
                        "email": "hello@example.com",
                        "phone": None,
                    },
                    "channel": "public_web",
                    "notes": "Please call after 5pm",
                    "actor_context": {
                        "channel": "public_web",
                        "tenant_id": "tenant-test",
                    },
                },
            )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["status"], "ok")
        self.assertEqual(payload["data"]["booking_intent_id"], "booking-intent-123")
        self.assertEqual(len(captured_phase2_calls), 1)
        self.assertEqual(captured_phase2_calls[0]["audit_event_type"], "booking_intent.captured")
        self.assertEqual(
            captured_phase2_calls[0]["outbox_event_type"],
            "booking_intent.capture.recorded",
        )

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

    def test_integration_runtime_activity_returns_success_envelope(self):
        async def _build_recent_runtime_activity(*_args, **_kwargs):
            return {
                "status": "healthy",
                "checked_at": "2026-04-17T00:00:00Z",
                "items": [
                    {
                        "source": "job_runs",
                        "item_id": "21",
                        "title": "dispatch_outbox",
                        "status": "completed",
                        "summary": "dispatch complete",
                        "occurred_at": "2026-04-17T00:00:00Z",
                        "attempt_count": 1,
                    }
                ],
            }

        with patch("api.v1_routes._resolve_tenant_id", _resolve_tenant_id_stub), patch(
            "api.v1_routes.get_session",
            _fake_get_session,
        ), patch(
            "api.v1_routes.build_recent_runtime_activity",
            _build_recent_runtime_activity,
        ):
            client = TestClient(create_test_app())
            response = client.get("/api/v1/integrations/runtime-activity")

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["status"], "ok")
        self.assertEqual(payload["data"]["status"], "healthy")
        self.assertEqual(payload["data"]["items"][0]["source"], "job_runs")
        self.assertEqual(payload["data"]["items"][0]["title"], "dispatch_outbox")
        self.assertEqual(payload["meta"]["tenant_id"], "tenant-test")

    def test_outbox_dispatch_returns_success_envelope(self):
        async def _run_tracked_outbox_dispatch(*_args, **_kwargs):
            return SimpleNamespace(
                job_run_id=31,
                result=SimpleNamespace(
                    status="completed",
                    detail="Processed 2 of 2 pending outbox event(s); 0 failed.",
                    retryable=False,
                    metadata={
                        "total_events": 2,
                        "processed_events": 2,
                        "failed_events": 0,
                    },
                ),
            )

        with patch("api.v1_routes._resolve_tenant_id", _resolve_tenant_id_stub), patch(
            "api.v1_routes.get_session",
            _fake_get_session,
        ), patch(
            "api.v1_routes.run_tracked_outbox_dispatch",
            _run_tracked_outbox_dispatch,
        ):
            client = TestClient(create_test_app())
            response = client.post(
                "/api/v1/integrations/outbox/dispatch",
                json={
                    "limit": 5,
                    "actor_context": {
                        "channel": "admin",
                        "tenant_id": "tenant-test",
                    },
                },
            )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["status"], "ok")
        self.assertEqual(payload["data"]["job_run_id"], 31)
        self.assertEqual(payload["data"]["dispatch_status"], "completed")
        self.assertEqual(payload["data"]["metadata"]["processed_events"], 2)
        self.assertEqual(payload["meta"]["tenant_id"], "tenant-test")

    def test_outbox_replay_returns_success_envelope(self):
        async def _requeue_event(*_args, **_kwargs):
            return {
                "id": 45,
                "event_type": "lead.capture.recorded",
                "aggregate_type": "lead",
                "aggregate_id": "lead-123",
                "status": "retrying",
                "available_at": "2026-04-17T01:00:00Z",
                "idempotency_key": "lead-captured:lead-123",
            }

        async def _append_entry(*_args, **_kwargs):
            return 88

        with patch("api.v1_routes._resolve_tenant_id", _resolve_tenant_id_stub), patch(
            "api.v1_routes.get_session",
            _fake_get_session,
        ), patch(
            "api.v1_routes.OutboxRepository.requeue_event",
            _requeue_event,
        ), patch(
            "api.v1_routes.AuditLogRepository.append_entry",
            _append_entry,
        ):
            client = TestClient(create_test_app())
            response = client.post(
                "/api/v1/integrations/outbox/replay",
                json={
                    "outbox_event_id": 45,
                    "actor_context": {
                        "channel": "admin",
                        "tenant_id": "tenant-test",
                    },
                },
            )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["status"], "ok")
        self.assertEqual(payload["data"]["outbox_event_id"], 45)
        self.assertEqual(payload["data"]["status"], "retrying")
        self.assertEqual(payload["meta"]["tenant_id"], "tenant-test")

    def test_outbox_dispatched_audit_returns_success_envelope(self):
        async def _list_recent_entries(*_args, **_kwargs):
            return [
                {
                    "id": 91,
                    "tenant_id": "tenant-test",
                    "actor_type": "worker",
                    "actor_id": "phase2_outbox_dispatcher",
                    "event_type": "outbox.event.dispatched",
                    "entity_type": "lead",
                    "entity_id": "lead-123",
                    "payload": {
                        "outbox_event_type": "lead.capture.recorded",
                        "aggregate_type": "lead",
                        "aggregate_id": "lead-123",
                        "idempotency_key": "lead-captured:lead-123",
                    },
                    "created_at": "2026-04-17T00:00:00Z",
                }
            ]

        with patch("api.v1_routes._resolve_tenant_id", _resolve_tenant_id_stub), patch(
            "api.v1_routes.get_session",
            _fake_get_session,
        ), patch(
            "api.v1_routes.AuditLogRepository.list_recent_entries",
            _list_recent_entries,
        ):
            client = TestClient(create_test_app())
            response = client.get("/api/v1/integrations/outbox/dispatched-audit")

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["status"], "ok")
        self.assertEqual(payload["data"]["items"][0]["event_type"], "outbox.event.dispatched")
        self.assertEqual(payload["data"]["items"][0]["payload"]["aggregate_id"], "lead-123")
        self.assertEqual(payload["meta"]["tenant_id"], "tenant-test")

    def test_outbox_backlog_returns_success_envelope(self):
        async def _build_outbox_backlog(*_args, **_kwargs):
            return {
                "status": "attention_required",
                "checked_at": "2026-04-17T00:00:00Z",
                "summary": {
                    "failed_events": 1,
                    "retrying_events": 1,
                    "pending_events": 0,
                },
                "items": [
                    {
                        "outbox_event_id": 45,
                        "event_type": "payment_intent.created",
                        "aggregate_type": "payment_intent",
                        "aggregate_id": "payment-123",
                        "status": "failed",
                        "attempt_count": 2,
                        "last_error": "provider timeout",
                        "last_error_at": "2026-04-17T00:00:00Z",
                        "processed_at": None,
                        "available_at": "2026-04-17T00:01:00Z",
                        "idempotency_key": "payment-intent:payment-123",
                        "created_at": "2026-04-17T00:00:00Z",
                        "recommended_action": "Review the last error, replay this event, then rerun dispatch.",
                    }
                ],
            }

        with patch("api.v1_routes._resolve_tenant_id", _resolve_tenant_id_stub), patch(
            "api.v1_routes.get_session",
            _fake_get_session,
        ), patch(
            "api.v1_routes.build_outbox_backlog",
            _build_outbox_backlog,
        ):
            client = TestClient(create_test_app())
            response = client.get("/api/v1/integrations/outbox/backlog")

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["status"], "ok")
        self.assertEqual(payload["data"]["summary"]["failed_events"], 1)
        self.assertEqual(payload["data"]["items"][0]["attempt_count"], 2)
        self.assertEqual(payload["data"]["items"][0]["last_error"], "provider timeout")
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

    def test_integration_crm_retry_backlog_returns_success_envelope(self):
        async def _build_crm_retry_backlog(*_args, **_kwargs):
            return {
                "status": "attention_required",
                "checked_at": None,
                "summary": {
                    "retrying_records": 1,
                    "manual_review_records": 1,
                    "failed_records": 1,
                    "hold_recommended": True,
                    "operator_note": "Hold broader rollout while failed CRM records or manual-review backlog stay mixed with queued retries.",
                },
                "items": [
                    {
                        "record_id": 42,
                        "provider": "zoho_crm",
                        "entity_type": "lead",
                        "local_entity_id": "lead-123",
                        "external_entity_id": None,
                        "sync_status": "retrying",
                        "retry_count": 2,
                        "latest_error_code": "retry_queued",
                        "latest_error_message": "CRM sync was queued for retry and reconciliation review.",
                        "latest_error_retryable": True,
                        "latest_error_at": None,
                        "last_synced_at": None,
                        "created_at": None,
                        "recommended_action": "Escalate if retries keep repeating without a successful sync.",
                    }
                ],
            }

        with patch("api.v1_routes._resolve_tenant_id", _resolve_tenant_id_stub), patch(
            "api.v1_routes.get_session",
            _fake_get_session,
        ), patch(
            "api.v1_routes.build_crm_retry_backlog",
            _build_crm_retry_backlog,
        ):
            client = TestClient(create_test_app())
            response = client.get("/api/v1/integrations/crm-sync/backlog")

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["status"], "ok")
        self.assertEqual(payload["data"]["summary"]["retrying_records"], 1)
        self.assertEqual(payload["data"]["items"][0]["record_id"], 42)
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

    def test_tenant_overview_returns_success_envelope(self):
        async def _resolve_tenant_id(_self, _tenant_ref):
            return "tenant-test"

        async def _build_tenant_overview(*_args, **_kwargs):
            return {
                "tenant": {
                    "id": "tenant-test",
                    "slug": "default-production-tenant",
                    "name": "BookedAI Default Production Tenant",
                    "status": "active",
                    "timezone": "Australia/Sydney",
                    "locale": "en-AU",
                    "industry": None,
                },
                "shell": {
                    "current_role": "tenant_admin",
                    "read_only": True,
                    "tenant_mode_enabled": True,
                    "deployment_mode": "standalone_app",
                },
                "summary": {
                    "total_leads": 4,
                    "active_leads": 2,
                    "booking_requests": 3,
                    "open_booking_requests": 2,
                    "payment_attention_count": 1,
                    "lifecycle_attention_count": 1,
                },
                "integration_snapshot": {
                    "connected_count": 1,
                    "attention_count": 1,
                    "providers": [],
                },
                "recent_bookings": [
                    {
                        "booking_reference": "BR-1001",
                        "service_name": "Consultation",
                        "requested_date": "2026-04-16",
                        "requested_time": "14:00",
                        "timezone": "Australia/Sydney",
                        "confidence_level": "high",
                        "status": "pending_confirmation",
                        "payment_dependency_state": "manual_follow_up",
                        "created_at": None,
                    }
                ],
                "priorities": [
                    {
                        "title": "Payment follow-up needs attention",
                        "body": "1 booking payment states still need review or follow-up.",
                        "tone": "attention",
                    }
                ],
            }

        with patch("api.v1_routes.get_session", _fake_get_session), patch(
            "api.v1_routes.build_tenant_overview",
            _build_tenant_overview,
        ), patch.object(
            TenantRepository,
            "resolve_tenant_id",
            _resolve_tenant_id,
        ):
            client = TestClient(create_test_app())
            response = client.get("/api/v1/tenant/overview?tenant_ref=default-production-tenant")

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["status"], "ok")
        self.assertEqual(payload["data"]["tenant"]["slug"], "default-production-tenant")
        self.assertEqual(payload["data"]["summary"]["total_leads"], 4)
        self.assertEqual(payload["data"]["recent_bookings"][0]["booking_reference"], "BR-1001")
        self.assertEqual(payload["meta"]["tenant_id"], "tenant-test")

    def test_tenant_bookings_returns_success_envelope(self):
        async def _resolve_tenant_id(*_args, **_kwargs):
            return "tenant-test"

        async def _build_tenant_bookings_snapshot(*_args, **_kwargs):
            return {
                "tenant": {
                    "id": "tenant-test",
                    "slug": "default-production-tenant",
                    "name": "BookedAI Demo Tenant",
                },
                "status_summary": {
                    "pending_confirmation": 1,
                    "active": 2,
                    "completed": 3,
                    "cancelled": 0,
                    "other": 0,
                },
                "items": [
                    {
                        "booking_reference": "BR-1002",
                        "service_name": "Live Support",
                        "requested_date": "2026-04-17",
                        "requested_time": "09:30",
                        "timezone": "Australia/Sydney",
                        "confidence_level": "medium",
                        "status": "captured",
                        "payment_dependency_state": "pending",
                        "created_at": None,
                    }
                ],
            }

        with patch("api.v1_routes.get_session", _fake_get_session), patch(
            "api.v1_routes.build_tenant_bookings_snapshot",
            _build_tenant_bookings_snapshot,
        ), patch.object(
            TenantRepository,
            "resolve_tenant_id",
            _resolve_tenant_id,
        ):
            client = TestClient(create_test_app())
            response = client.get("/api/v1/tenant/bookings?tenant_ref=default-production-tenant")

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["status"], "ok")
        self.assertEqual(payload["data"]["status_summary"]["active"], 2)
        self.assertEqual(payload["data"]["items"][0]["booking_reference"], "BR-1002")
        self.assertEqual(payload["meta"]["tenant_id"], "tenant-test")

    def test_tenant_integrations_returns_success_envelope(self):
        async def _resolve_tenant_id(*_args, **_kwargs):
            return "tenant-test"

        async def _build_tenant_integrations_snapshot(*_args, **_kwargs):
            return {
                "tenant": {
                    "id": "tenant-test",
                    "slug": "default-production-tenant",
                    "name": "BookedAI Demo Tenant",
                },
                "providers": [
                    {
                        "provider": "hubspot",
                        "status": "connected",
                        "sync_mode": "read_write",
                        "safe_config": {
                            "provider": "hubspot",
                            "enabled": True,
                            "configured_fields": ["api_key"],
                        },
                    }
                ],
                "attention": [
                    {
                        "source": "crm_sync",
                        "issue_type": "retrying",
                        "severity": "medium",
                        "item_count": 2,
                        "latest_at": None,
                        "recommended_action": "Monitor queued CRM retry work before manual escalation.",
                    }
                ],
                "reconciliation": {
                    "status": "monitoring",
                    "checked_at": None,
                    "summary": {
                        "attention_required_sections": 0,
                        "monitoring_sections": 1,
                        "healthy_sections": 2,
                    },
                    "sections": [
                        {
                            "area": "crm_sync",
                            "status": "monitoring",
                            "total_count": 2,
                            "pending_count": 1,
                            "manual_review_count": 0,
                            "failed_count": 0,
                            "latest_at": None,
                            "recommended_action": "Reconcile CRM sync issues before enabling broader sync automation.",
                        }
                    ],
                },
                "crm_retry_backlog": {
                    "status": "monitoring",
                    "checked_at": None,
                    "summary": {
                        "retrying_records": 2,
                        "manual_review_records": 0,
                        "failed_records": 0,
                        "hold_recommended": False,
                        "operator_note": "Retry backlog remains additive-only.",
                    },
                    "items": [],
                },
            }

        with patch("api.v1_routes.get_session", _fake_get_session), patch(
            "api.v1_routes.build_tenant_integrations_snapshot",
            _build_tenant_integrations_snapshot,
        ), patch.object(
            TenantRepository,
            "resolve_tenant_id",
            _resolve_tenant_id,
        ):
            client = TestClient(create_test_app())
            response = client.get("/api/v1/tenant/integrations?tenant_ref=default-production-tenant")

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["status"], "ok")
        self.assertEqual(payload["data"]["providers"][0]["provider"], "hubspot")
        self.assertEqual(payload["data"]["crm_retry_backlog"]["summary"]["retrying_records"], 2)
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
        self.assertEqual(payload["data"]["candidates"][0]["booking_url"], "https://book.example.com")
        self.assertEqual(payload["data"]["candidates"][0]["category"], None)
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
        self.assertEqual(payload["data"]["recommendations"][0]["path_type"], "request_callback")
        self.assertIn("operator", payload["data"]["recommendations"][0]["next_step"].lower())
        self.assertTrue(payload["data"]["recommendations"][0]["warnings"])

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

        with patch("api.v1_routes._resolve_tenant_id", _resolve_tenant_id_stub), patch(
            "api.v1_routes.get_session",
            _fake_search_session,
        ), patch(
            "api.v1_routes.rank_catalog_matches",
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

        captured_statement: dict[str, str] = {}

        @asynccontextmanager
        async def _fake_search_session(_session_factory):
            async def _execute(statement, *_args, **_kwargs):
                sql = str(statement)
                if "service_merchant_profiles" in sql and "feature_flags" not in sql:
                    captured_statement["sql"] = sql
                return _FakeExecuteResult()

            yield SimpleNamespace(execute=_execute, commit=_async_noop)

        with patch("api.v1_routes._resolve_tenant_id", _resolve_tenant_id_stub), patch(
            "api.v1_routes.get_session",
            _fake_search_session,
        ), patch(
            "api.v1_routes.rank_catalog_matches",
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
