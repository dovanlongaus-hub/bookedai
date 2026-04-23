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


class Apiv1BookingRoutes(TestCase):
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

        with patch("api.v1_booking_handlers._resolve_tenant_id", _resolve_tenant_id_stub), patch(
            "api.v1_booking_handlers.get_session",
            _fake_get_session,
        ), patch(
            "api.v1_booking_handlers.ContactRepository.upsert_contact",
            _upsert_contact,
        ), patch(
            "api.v1_booking_handlers.LeadRepository.upsert_lead",
            _upsert_lead,
        ), patch(
            "api.v1_booking_handlers.BookingIntentRepository.upsert_booking_intent",
            _upsert_booking_intent,
        ), patch(
            "api.v1_booking_handlers._record_phase2_write_activity",
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

    def test_booking_trust_returns_success_envelope(self):
        async def _execute(*_args, **_kwargs):
            return SimpleNamespace(scalar_one_or_none=lambda: None)

        @asynccontextmanager
        async def _fake_trust_session(_session_factory):
            yield SimpleNamespace(execute=_execute, commit=_async_noop)

        with patch("api.v1_search_handlers._resolve_tenant_id", _resolve_tenant_id_stub), patch(
            "api.v1_search_handlers.get_session",
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
        with patch("api.v1_booking_handlers._resolve_tenant_id", _resolve_tenant_id_stub):
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
