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
    async def _default_close():
        return None

    def _default_session_factory():
        return SimpleNamespace(execute=_fake_execute, commit=_async_noop, close=_default_close)

    app = FastAPI()
    app.include_router(v1_router)
    app.state.session_factory = _default_session_factory
    app.state.settings = SimpleNamespace(
        admin_api_token="test-admin-token",
        admin_password="test-admin-password",
        admin_session_ttl_hours=8,
        google_oauth_client_id="google-client-id",
        zoho_crm_api_base_url="https://www.zohoapis.com.au/crm/v8",
        zoho_accounts_base_url="https://accounts.zoho.com.au",
        zoho_crm_access_token="",
        zoho_crm_refresh_token="",
        zoho_crm_client_id="",
        zoho_crm_client_secret="",
        zoho_crm_default_lead_module="Leads",
        zoho_crm_default_contact_module="Contacts",
        zoho_crm_default_deal_module="Deals",
        zoho_crm_default_task_module="Tasks",
        zoho_crm_notification_token="",
        zoho_crm_notification_channel_id="",
        public_api_url="https://api.bookedai.au",
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
    def test_crm_sync_status_returns_record_envelope(self):
        async def _get_latest_sync_record_for_entity(*_args, **_kwargs):
            return {
                "id": 88,
                "entity_type": "contact",
                "provider": "zoho_crm",
                "sync_status": "failed",
                "local_entity_id": "customer-123",
                "external_entity_id": None,
                "last_synced_at": None,
                "created_at": "2026-04-22T05:55:00+00:00",
                "latest_error_code": "provider_http_error",
                "latest_error_message": "Zoho CRM timed out.",
                "latest_error_retryable": True,
                "latest_error_at": "2026-04-22T05:56:00+00:00",
                "retry_count": 1,
            }

        with patch("api.v1_integration_handlers._resolve_tenant_id", _resolve_tenant_id_stub), patch(
            "api.v1_integration_handlers.get_session",
            _fake_get_session,
        ), patch(
            "api.v1_integration_handlers.CrmSyncRepository.get_latest_sync_record_for_entity",
            _get_latest_sync_record_for_entity,
        ):
            client = TestClient(create_test_app())
            response = client.get(
                "/api/v1/integrations/crm-sync/status?entity_type=contact&local_entity_id=customer-123"
            )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["status"], "ok")
        self.assertEqual(payload["data"]["entity_type"], "contact")
        self.assertEqual(payload["data"]["local_entity_id"], "customer-123")
        self.assertEqual(payload["data"]["record"]["id"], 88)
        self.assertEqual(payload["data"]["record"]["sync_status"], "failed")

    def test_crm_sync_status_requires_entity_query(self):
        with patch("api.v1_integration_handlers._resolve_tenant_id", _resolve_tenant_id_stub):
            client = TestClient(create_test_app())
            response = client.get("/api/v1/integrations/crm-sync/status")

        self.assertEqual(response.status_code, 400)
        payload = response.json()
        self.assertEqual(payload["status"], "error")
        self.assertEqual(payload["error"]["code"], "crm_sync_status_query_invalid")

    def test_sync_crm_contact_returns_success_envelope(self):
        async def _orchestrate_contact_sync(*_args, **_kwargs):
            return SimpleNamespace(
                record_id=61,
                sync_status="synced",
                external_entity_id="zoho-contact-61",
                warning_codes=[],
            )

        with patch("api.v1_integration_handlers._resolve_tenant_id", _resolve_tenant_id_stub), patch(
            "api.v1_integration_handlers.get_session",
            _fake_get_session,
        ), patch(
            "api.v1_integration_handlers.orchestrate_contact_sync",
            _orchestrate_contact_sync,
        ):
            client = TestClient(create_test_app())
            response = client.post(
                "/api/v1/integrations/crm-sync/contact",
                json={
                    "contact_id": "customer-123",
                    "full_name": "BookedAI Customer",
                    "email": "customer@example.com",
                    "phone": "0400111222",
                    "actor_context": {
                        "channel": "admin",
                        "tenant_id": "tenant-test",
                    },
                },
            )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["status"], "ok")
        self.assertEqual(payload["data"]["contact_id"], "customer-123")
        self.assertEqual(payload["data"]["sync_status"], "synced")
        self.assertEqual(payload["data"]["external_entity_id"], "zoho-contact-61")

    def test_crm_deal_outcome_feedback_returns_success_envelope(self):
        async def _create_sync_record(*_args, **_kwargs):
            return 91

        async def _update_sync_record_status(*_args, **_kwargs):
            return None

        with patch("api.v1_integration_handlers._resolve_tenant_id", _resolve_tenant_id_stub), patch(
            "api.v1_integration_handlers.get_session",
            _fake_get_session,
        ), patch(
            "api.v1_integration_handlers.CrmSyncRepository.create_sync_record",
            _create_sync_record,
        ), patch(
            "api.v1_integration_handlers.CrmSyncRepository.update_sync_record_status",
            _update_sync_record_status,
        ):
            client = TestClient(create_test_app())
            response = client.post(
                "/api/v1/integrations/crm-feedback/deal-outcome",
                json={
                    "external_deal_id": "zoho-deal-91",
                    "outcome": "won",
                    "stage": "Closed Won",
                    "amount_aud": 120,
                    "actor_context": {
                        "channel": "zoho_crm",
                        "tenant_id": "tenant-test",
                    },
                },
            )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["status"], "ok")
        self.assertEqual(payload["data"]["crm_sync_record_id"], 91)
        self.assertEqual(payload["data"]["outcome"], "won")

    def test_crm_deal_outcome_summary_returns_success_envelope(self):
        async def _get_deal_feedback_summary(*_args, **_kwargs):
            return {
                "summary": {
                    "won_count": 3,
                    "lost_count": 1,
                    "won_revenue_cents": 45000,
                    "feedback_count": 4,
                    "win_rate": 0.75,
                    "stage_signal_count": 4,
                    "completed_task_count": 2,
                },
                "owner_performance": [
                    {
                        "owner_name": "Jamie",
                        "total_count": 3,
                        "won_count": 2,
                        "lost_count": 1,
                        "won_revenue_cents": 45000,
                    }
                ],
                "lost_reasons": [
                    {
                        "lost_reason": "No callback response",
                        "lost_count": 1,
                    }
                ],
                "stage_breakdown": [
                    {
                        "stage": "Closed Won",
                        "stage_count": 3,
                    }
                ],
                "items": [
                    {
                        "id": 9,
                        "local_entity_id": "deal-feedback-9",
                        "external_entity_id": "zoho-deal-9",
                        "sync_status": "synced",
                        "outcome": "won",
                        "stage": "Closed Won",
                        "owner_name": "Jamie",
                        "source_label": "bookedai_widget",
                        "closed_at": "2026-04-22T08:00:00Z",
                        "lost_reason": None,
                        "task_completed": True,
                        "task_completed_at": "2026-04-22T07:45:00Z",
                        "stage_changed_at": "2026-04-22T07:30:00Z",
                        "amount_cents": 45000,
                        "occurred_at": "2026-04-22T08:00:00Z",
                    }
                ],
            }

        with patch("api.v1_integration_handlers._resolve_tenant_id", _resolve_tenant_id_stub), patch(
            "api.v1_integration_handlers.get_session",
            _fake_get_session,
        ), patch(
            "api.v1_integration_handlers.CrmSyncRepository.get_deal_feedback_summary",
            _get_deal_feedback_summary,
        ):
            client = TestClient(create_test_app())
            response = client.get("/api/v1/integrations/crm-feedback/deal-outcome-summary")

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["status"], "ok")
        self.assertEqual(payload["data"]["summary"]["won_count"], 3)
        self.assertEqual(payload["data"]["summary"]["win_rate"], 0.75)
        self.assertEqual(payload["data"]["owner_performance"][0]["owner_name"], "Jamie")
        self.assertEqual(payload["data"]["lost_reasons"][0]["lost_reason"], "No callback response")
        self.assertEqual(payload["data"]["stage_breakdown"][0]["stage"], "Closed Won")
        self.assertEqual(payload["data"]["items"][0]["outcome"], "won")
        self.assertTrue(payload["data"]["items"][0]["task_completed"])

    def test_poll_zoho_deal_feedback_returns_success_envelope(self):
        async def _fetch_deal_by_id(_self, _settings, *, external_deal_id):
            return {
                "deal": {
                    "id": external_deal_id,
                    "Deal_Name": "BookedAI Demo Deal",
                    "Stage": "Closed Won",
                    "Owner": {"name": "Jamie Revenue"},
                    "Amount": 180,
                    "Closing_Date": "2026-05-07",
                    "Modified_Time": "2026-05-07T02:00:00Z",
                    "Lead_Source": "bookedai_widget",
                }
            }

        async def _create_sync_record(*_args, **_kwargs):
            return 501

        async def _update_sync_record_status(*_args, **_kwargs):
            return None

        app = create_test_app()
        app.state.settings.zoho_crm_refresh_token = "refresh-token"
        app.state.settings.zoho_crm_client_id = "client-id"
        app.state.settings.zoho_crm_client_secret = "client-secret"

        with patch("api.v1_integration_handlers._resolve_tenant_id", _resolve_tenant_id_stub), patch(
            "api.v1_integration_handlers.get_session",
            _fake_get_session,
        ), patch(
            "api.v1_integration_handlers.ZohoCrmAdapter.fetch_deal_by_id",
            _fetch_deal_by_id,
        ), patch(
            "api.v1_integration_handlers.CrmSyncRepository.create_sync_record",
            _create_sync_record,
        ), patch(
            "api.v1_integration_handlers.CrmSyncRepository.update_sync_record_status",
            _update_sync_record_status,
        ):
            client = TestClient(app)
            response = client.post(
                "/api/v1/integrations/crm-feedback/zoho-deals/poll",
                json={
                    "external_deal_ids": ["zoho-deal-501"],
                    "actor_context": {
                        "channel": "admin",
                        "tenant_id": "tenant-test",
                    },
                },
            )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["status"], "ok")
        self.assertEqual(payload["data"]["polled_count"], 1)
        self.assertEqual(payload["data"]["ingested_count"], 1)
        self.assertEqual(payload["data"]["items"][0]["outcome"], "won")

    def test_poll_zoho_deal_feedback_skips_non_terminal_deals(self):
        async def _fetch_deal_by_id(_self, _settings, *, external_deal_id):
            return {
                "deal": {
                    "id": external_deal_id,
                    "Deal_Name": "BookedAI Demo Deal",
                    "Stage": "Qualification",
                    "Owner": {"name": "Jamie Revenue"},
                }
            }

        app = create_test_app()
        app.state.settings.zoho_crm_refresh_token = "refresh-token"
        app.state.settings.zoho_crm_client_id = "client-id"
        app.state.settings.zoho_crm_client_secret = "client-secret"

        with patch("api.v1_integration_handlers._resolve_tenant_id", _resolve_tenant_id_stub), patch(
            "api.v1_integration_handlers.get_session",
            _fake_get_session,
        ), patch(
            "api.v1_integration_handlers.ZohoCrmAdapter.fetch_deal_by_id",
            _fetch_deal_by_id,
        ):
            client = TestClient(app)
            response = client.post(
                "/api/v1/integrations/crm-feedback/zoho-deals/poll",
                json={
                    "external_deal_ids": ["zoho-deal-502"],
                    "actor_context": {
                        "channel": "admin",
                        "tenant_id": "tenant-test",
                    },
                },
            )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["status"], "ok")
        self.assertEqual(payload["data"]["ingested_count"], 0)
        self.assertEqual(payload["data"]["skipped"][0]["status"], "skipped_non_terminal")

    def test_zoho_deal_feedback_webhook_returns_success_envelope(self):
        async def _record_event(*_args, **_kwargs):
            return 801

        async def _mark_processed(*_args, **_kwargs):
            return None

        async def _fetch_deal_by_id(_self, _settings, *, external_deal_id):
            return {
                "deal": {
                    "id": external_deal_id,
                    "Deal_Name": "BookedAI Demo Deal",
                    "Stage": "Closed Lost",
                    "Owner": {"name": "Casey Follow-up"},
                    "Amount": 95,
                    "Closing_Date": "2026-05-09",
                    "Modified_Time": "2026-05-09T05:10:00Z",
                    "Lead_Source": "bookedai_widget",
                    "Reason_For_Loss": "No callback response",
                }
            }

        async def _create_sync_record(*_args, **_kwargs):
            return 802

        async def _update_sync_record_status(*_args, **_kwargs):
            return None

        app = create_test_app()
        app.state.settings.zoho_crm_refresh_token = "refresh-token"
        app.state.settings.zoho_crm_client_id = "client-id"
        app.state.settings.zoho_crm_client_secret = "client-secret"
        app.state.settings.zoho_crm_notification_token = "deals.all.notif"
        app.state.settings.zoho_crm_notification_channel_id = "1000000068001"

        with patch("api.v1_integration_handlers._resolve_tenant_id", _resolve_tenant_id_stub), patch(
            "api.v1_integration_handlers.get_session",
            _fake_get_session,
        ), patch(
            "api.v1_integration_handlers.WebhookEventRepository.record_event",
            _record_event,
        ), patch(
            "api.v1_integration_handlers.WebhookEventRepository.mark_processed",
            _mark_processed,
        ), patch(
            "api.v1_integration_handlers.ZohoCrmAdapter.fetch_deal_by_id",
            _fetch_deal_by_id,
        ), patch(
            "api.v1_integration_handlers.CrmSyncRepository.create_sync_record",
            _create_sync_record,
        ), patch(
            "api.v1_integration_handlers.CrmSyncRepository.update_sync_record_status",
            _update_sync_record_status,
        ):
            client = TestClient(app)
            response = client.post(
                "/api/v1/integrations/crm-feedback/zoho-webhook",
                json={
                    "module": "Deals",
                    "ids": ["zoho-deal-801"],
                    "operation": "update",
                    "channel_id": "1000000068001",
                    "token": "deals.all.notif",
                },
            )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["status"], "ok")
        self.assertEqual(payload["data"]["webhook_event_id"], 801)
        self.assertEqual(payload["data"]["ingested_count"], 1)
        self.assertEqual(payload["data"]["items"][0]["outcome"], "lost")

    def test_zoho_deal_feedback_webhook_rejects_invalid_token(self):
        app = create_test_app()
        app.state.settings.zoho_crm_notification_token = "expected-token"
        app.state.settings.zoho_crm_notification_channel_id = "1000000068001"

        with patch("api.v1_integration_handlers._resolve_tenant_id", _resolve_tenant_id_stub):
            client = TestClient(app)
            response = client.post(
                "/api/v1/integrations/crm-feedback/zoho-webhook",
                json={
                    "module": "Deals",
                    "ids": ["zoho-deal-900"],
                    "operation": "update",
                    "channel_id": "1000000068001",
                    "token": "wrong-token",
                },
            )

        self.assertEqual(response.status_code, 403)
        payload = response.json()
        self.assertEqual(payload["status"], "error")
        self.assertEqual(payload["error"]["code"], "zoho_crm_webhook_token_invalid")

    def test_register_zoho_deal_feedback_webhook_returns_success_envelope(self):
        async def _enable_notifications(
            _self,
            _settings,
            *,
            channel_id,
            token,
            notify_url,
            events,
            return_affected_field_values,
        ):
            return {
                "provider": "zoho_crm",
                "status": "success",
                "code": "SUCCESS",
                "message": "Successfully subscribed for actions-watch of the given module",
                "channel_id": channel_id,
                "token": token,
                "notify_url": notify_url,
                "events": events,
                "details": {
                    "resource_uri": "https://www.zohoapis.com.au/crm/v8/Deals",
                    "resource_name": "Deals",
                },
            }

        app = create_test_app()
        app.state.settings.zoho_crm_refresh_token = "refresh-token"
        app.state.settings.zoho_crm_client_id = "client-id"
        app.state.settings.zoho_crm_client_secret = "client-secret"
        app.state.settings.public_api_url = "https://api.bookedai.au"

        with patch("api.v1_integration_handlers._resolve_tenant_id", _resolve_tenant_id_stub), patch(
            "api.v1_integration_handlers.ZohoCrmAdapter.enable_notifications",
            _enable_notifications,
        ):
            client = TestClient(app)
            response = client.post(
                "/api/v1/integrations/crm-feedback/zoho-webhook/register",
                json={
                    "module_api_name": "Deals",
                    "channel_id": "1000000068001",
                    "token": "deals.all.notif",
                },
            )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["status"], "ok")
        self.assertEqual(payload["data"]["channel_id"], "1000000068001")
        self.assertEqual(payload["data"]["token"], "deals.all.notif")
        self.assertEqual(
            payload["data"]["notify_url"],
            "https://api.bookedai.au/api/v1/integrations/crm-feedback/zoho-webhook",
        )

    def test_list_zoho_deal_feedback_webhook_returns_success_envelope(self):
        async def _get_notification_details(_self, _settings, *, channel_id, module_api_name, page=1, per_page=200):
            return {
                "provider": "zoho_crm",
                "channel_id": channel_id,
                "items": [
                    {
                        "channel_id": channel_id,
                        "resource_name": module_api_name,
                        "notify_url": "https://api.bookedai.au/api/v1/integrations/crm-feedback/zoho-webhook",
                        "token": "deals.all.notif",
                        "events": ["Deals.all"],
                    }
                ],
            }

        app = create_test_app()
        app.state.settings.zoho_crm_refresh_token = "refresh-token"
        app.state.settings.zoho_crm_client_id = "client-id"
        app.state.settings.zoho_crm_client_secret = "client-secret"
        app.state.settings.zoho_crm_notification_channel_id = "1000000068001"

        with patch("api.v1_integration_handlers._resolve_tenant_id", _resolve_tenant_id_stub), patch(
            "api.v1_integration_handlers.ZohoCrmAdapter.get_notification_details",
            _get_notification_details,
        ):
            client = TestClient(app)
            response = client.get("/api/v1/integrations/crm-feedback/zoho-webhook?channel_id=1000000068001")

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["status"], "ok")
        self.assertEqual(payload["data"]["channel_id"], "1000000068001")
        self.assertEqual(payload["data"]["items"][0]["resource_name"], "Deals")

    def test_update_zoho_deal_feedback_webhook_returns_success_envelope(self):
        async def _update_notification_details(
            _self,
            _settings,
            *,
            channel_id,
            token,
            notify_url,
            events,
            channel_expiry,
            return_affected_field_values,
        ):
            return {
                "provider": "zoho_crm",
                "channel_id": channel_id,
                "token": token,
                "notify_url": notify_url,
                "events": events,
                "channel_expiry": channel_expiry,
                "status": "success",
            }

        app = create_test_app()
        app.state.settings.zoho_crm_refresh_token = "refresh-token"
        app.state.settings.zoho_crm_client_id = "client-id"
        app.state.settings.zoho_crm_client_secret = "client-secret"

        with patch("api.v1_integration_handlers._resolve_tenant_id", _resolve_tenant_id_stub), patch(
            "api.v1_integration_handlers.ZohoCrmAdapter.update_notification_details",
            _update_notification_details,
        ):
            client = TestClient(app)
            response = client.post(
                "/api/v1/integrations/crm-feedback/zoho-webhook/renew",
                json={
                    "channel_id": "1000000068001",
                    "token": "deals.all.notif",
                    "channel_expiry": "2026-04-29T10:30:00+00:00",
                    "events": ["Deals.all"],
                },
            )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["status"], "ok")
        self.assertEqual(payload["data"]["channel_id"], "1000000068001")
        self.assertEqual(payload["data"]["channel_expiry"], "2026-04-29T10:30:00+00:00")

    def test_disable_zoho_deal_feedback_webhook_returns_success_envelope(self):
        async def _disable_notifications(_self, _settings, *, channel_ids):
            return {
                "provider": "zoho_crm",
                "channel_ids": channel_ids,
                "items": [
                    {
                        "status": "success",
                        "details": {
                            "channel_id": channel_ids[0],
                        },
                    }
                ],
            }

        app = create_test_app()
        app.state.settings.zoho_crm_refresh_token = "refresh-token"
        app.state.settings.zoho_crm_client_id = "client-id"
        app.state.settings.zoho_crm_client_secret = "client-secret"

        with patch("api.v1_integration_handlers._resolve_tenant_id", _resolve_tenant_id_stub), patch(
            "api.v1_integration_handlers.ZohoCrmAdapter.disable_notifications",
            _disable_notifications,
        ):
            client = TestClient(app)
            response = client.post(
                "/api/v1/integrations/crm-feedback/zoho-webhook/disable",
                json={
                    "channel_ids": ["1000000068001"],
                },
            )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["status"], "ok")
        self.assertEqual(payload["data"]["channel_ids"][0], "1000000068001")

    def test_auto_renew_zoho_deal_feedback_webhook_returns_success_envelope(self):
        async def _get_notification_details(_self, _settings, *, channel_id, module_api_name, page=1, per_page=200):
            return {
                "channel_id": channel_id,
                "items": [
                    {
                        "channel_id": channel_id,
                        "resource_name": module_api_name,
                        "channel_expiry": "2026-04-22T10:00:00+00:00",
                    }
                ],
            }

        async def _update_notification_details(
            _self,
            _settings,
            *,
            channel_id,
            token,
            notify_url,
            events,
            channel_expiry,
            return_affected_field_values,
        ):
            return {
                "channel_id": channel_id,
                "status": "success",
                "channel_expiry": channel_expiry,
            }

        async def _fake_run_tracked_job(_session, *, context, handler, detail=None):
            result = await handler(context)
            return SimpleNamespace(job_run_id=901, result=result)

        app = create_test_app()
        app.state.settings.zoho_crm_refresh_token = "refresh-token"
        app.state.settings.zoho_crm_client_id = "client-id"
        app.state.settings.zoho_crm_client_secret = "client-secret"
        app.state.settings.zoho_crm_notification_channel_id = "1000000068001"
        app.state.settings.zoho_crm_notification_token = "deals.all.notif"
        app.state.settings.public_api_url = "https://api.bookedai.au"

        with patch("api.v1_integration_handlers._resolve_tenant_id", _resolve_tenant_id_stub), patch(
            "api.v1_integration_handlers.get_session",
            _fake_get_session,
        ), patch(
            "api.v1_integration_handlers.ZohoCrmAdapter.get_notification_details",
            _get_notification_details,
        ), patch(
            "api.v1_integration_handlers.ZohoCrmAdapter.update_notification_details",
            _update_notification_details,
        ), patch(
            "api.v1_integration_handlers.run_tracked_job",
            _fake_run_tracked_job,
        ):
            client = TestClient(app)
            response = client.post(
                "/api/v1/integrations/crm-feedback/zoho-webhook/auto-renew",
                json={"threshold_hours": 24},
            )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["status"], "ok")
        self.assertEqual(payload["data"]["job_run_id"], 901)
        self.assertTrue(payload["data"]["metadata"]["renewed"])

    def test_zoho_crm_connection_test_returns_success_envelope(self):
        async def _test_connection(*_args, **_kwargs):
            return {
                "provider": "zoho_crm",
                "status": "connected",
                "token_source": "refresh_token",
                "api_base_url": "https://www.zohoapis.com.au/crm/v8",
                "requested_module": "Leads",
                "requested_module_found": True,
                "module_count": 4,
                "field_count": 12,
                "modules": [{"api_name": "Leads", "module_name": "Leads"}],
                "fields": [{"api_name": "Email", "display_label": "Email"}],
                "safe_config": {
                    "provider": "zoho_crm",
                    "enabled": True,
                    "configured_fields": ["client_id", "refresh_token"],
                    "label": "Zoho CRM connection",
                    "notes": [],
                },
            }

        app = create_test_app()
        app.state.settings.zoho_crm_refresh_token = "refresh-token"
        app.state.settings.zoho_crm_client_id = "client-id"
        app.state.settings.zoho_crm_client_secret = "client-secret"

        with patch("api.v1_integration_handlers._resolve_tenant_id", _resolve_tenant_id_stub), patch(
            "api.v1_integration_handlers.ZohoCrmAdapter.test_connection",
            _test_connection,
        ):
            client = TestClient(app)
            response = client.get("/api/v1/integrations/providers/zoho-crm/connection-test?module=Leads")

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["status"], "ok")
        self.assertEqual(payload["data"]["provider"], "zoho_crm")
        self.assertEqual(payload["data"]["requested_module"], "Leads")
        self.assertEqual(payload["data"]["module_count"], 4)
        self.assertEqual(payload["meta"]["tenant_id"], "tenant-test")

    def test_zoho_crm_connection_test_rejects_unconfigured_runtime(self):
        with patch("api.v1_integration_handlers._resolve_tenant_id", _resolve_tenant_id_stub):
            client = TestClient(create_test_app())
            response = client.get("/api/v1/integrations/providers/zoho-crm/connection-test")

        self.assertEqual(response.status_code, 409)
        payload = response.json()
        self.assertEqual(payload["status"], "error")
        self.assertEqual(payload["error"]["code"], "zoho_crm_not_configured")
        self.assertEqual(payload["error"]["details"]["provider"], "zoho_crm")

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

        with patch("api.v1_integration_handlers._resolve_tenant_id", _resolve_tenant_id_stub), patch(
            "api.v1_integration_handlers.get_session",
            _fake_get_session,
        ), patch(
            "api.v1_integration_handlers.build_integration_attention_items",
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

        with patch("api.v1_integration_handlers._resolve_tenant_id", _resolve_tenant_id_stub), patch(
            "api.v1_integration_handlers.get_session",
            _fake_get_session,
        ), patch(
            "api.v1_integration_handlers.build_recent_runtime_activity",
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

        with patch("api.v1_integration_handlers._resolve_tenant_id", _resolve_tenant_id_stub), patch(
            "api.v1_integration_handlers.get_session",
            _fake_get_session,
        ), patch(
            "api.v1_integration_handlers.run_tracked_outbox_dispatch",
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

        with patch("api.v1_integration_handlers._resolve_tenant_id", _resolve_tenant_id_stub), patch(
            "api.v1_integration_handlers.get_session",
            _fake_get_session,
        ), patch(
            "api.v1_integration_handlers.OutboxRepository.requeue_event",
            _requeue_event,
        ), patch(
            "api.v1_integration_handlers.AuditLogRepository.append_entry",
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

        with patch("api.v1_integration_handlers._resolve_tenant_id", _resolve_tenant_id_stub), patch(
            "api.v1_integration_handlers.get_session",
            _fake_get_session,
        ), patch(
            "api.v1_integration_handlers.AuditLogRepository.list_recent_entries",
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

        with patch("api.v1_integration_handlers._resolve_tenant_id", _resolve_tenant_id_stub), patch(
            "api.v1_integration_handlers.get_session",
            _fake_get_session,
        ), patch(
            "api.v1_integration_handlers.build_outbox_backlog",
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

        with patch("api.v1_integration_handlers._resolve_tenant_id", _resolve_tenant_id_stub), patch(
            "api.v1_integration_handlers.get_session",
            _fake_get_session,
        ), patch(
            "api.v1_integration_handlers.build_attention_triage_snapshot",
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

        with patch("api.v1_integration_handlers._resolve_tenant_id", _resolve_tenant_id_stub), patch(
            "api.v1_integration_handlers.get_session",
            _fake_get_session,
        ), patch(
            "api.v1_integration_handlers.build_crm_retry_backlog",
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

        with patch("api.v1_integration_handlers._resolve_tenant_id", _resolve_tenant_id_stub), patch(
            "api.v1_integration_handlers.get_session",
            _fake_get_session,
        ), patch(
            "api.v1_integration_handlers.build_reconciliation_details",
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
        async def _execute_crm_sync_retry(*_args, **_kwargs):
            return SimpleNamespace(
                record_id=42,
                sync_status="synced",
                external_entity_id="zoho-lead-42",
                warning_codes=["retry_from_manual_review_required"],
            )

        with patch("api.v1_integration_handlers._resolve_tenant_id", _resolve_tenant_id_stub), patch(
            "api.v1_integration_handlers.get_session",
            _fake_get_session,
        ), patch(
            "api.v1_integration_handlers.execute_crm_sync_retry",
            _execute_crm_sync_retry,
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
        self.assertEqual(payload["data"]["sync_status"], "synced")
        self.assertEqual(payload["data"]["external_entity_id"], "zoho-lead-42")
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

        with patch("api.v1_integration_handlers._resolve_tenant_id", _resolve_tenant_id_stub), patch(
            "api.v1_integration_handlers.get_session",
            _fake_get_session,
        ), patch(
            "api.v1_integration_handlers.build_integration_provider_statuses",
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

        with patch("api.v1_integration_handlers._resolve_tenant_id", _resolve_tenant_id_stub), patch(
            "api.v1_integration_handlers.get_session",
            _fake_get_session,
        ), patch(
            "api.v1_integration_handlers.build_reconciliation_summary",
            _build_reconciliation_summary,
        ):
            client = TestClient(create_test_app())
            response = client.get("/api/v1/integrations/reconciliation/summary")

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["status"], "ok")
        self.assertEqual(payload["data"]["status"], "healthy")
        self.assertEqual(payload["data"]["metadata"]["total_jobs"], 1)
