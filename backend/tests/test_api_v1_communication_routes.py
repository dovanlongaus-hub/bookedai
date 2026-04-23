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


class Apiv1CommunicationRoutes(TestCase):
    def test_send_lifecycle_email_returns_success_envelope_when_smtp_unconfigured(self):
        app = create_test_app()
        app.state.email_service = SimpleNamespace(
            smtp_configured=lambda: False,
            send_email=_async_noop,
        )

        with patch("api.v1_communication_handlers._resolve_tenant_id", _resolve_tenant_id_stub), patch(
            "api.v1_communication_handlers.get_session",
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

        with patch("api.v1_communication_handlers._resolve_tenant_id", _resolve_tenant_id_stub), patch(
            "api.v1_communication_handlers.get_session",
            _fake_get_session,
        ), patch(
            "api.v1_communication_handlers.orchestrate_communication_touch",
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

        with patch("api.v1_communication_handlers._resolve_tenant_id", _resolve_tenant_id_stub), patch(
            "api.v1_communication_handlers.get_session",
            _fake_get_session,
        ), patch(
            "api.v1_communication_handlers.orchestrate_communication_touch",
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
