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
    router as v1_router,
)
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


class Apiv1IntegrationRoutes(TestCase):
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

