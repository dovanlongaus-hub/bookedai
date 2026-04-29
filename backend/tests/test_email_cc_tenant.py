"""Tests for the auto-CC tenant operator behaviour on lifecycle emails.

For ``bookedai_booking_confirmation`` / ``bookedai_booking_reschedule`` /
``bookedai_booking_cancellation`` / ``chess_progress_update`` the
``send_lifecycle_email`` handler should automatically CC the tenant's
``cc_emails`` list (or ``operator_email`` fallback). Other templates must
NOT trigger the auto-CC behaviour, so the resolver behaves as a feature
flag rather than a global rewrite of every email.
"""

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

from api.v1_router import router as v1_router  # noqa: E402


_TENANT_ID = "33333333-3333-3333-3333-333333333333"


async def _async_noop(*_args, **_kwargs):
    return None


async def _resolve_tenant_id_stub(_request, _actor_context) -> str:
    return _TENANT_ID


@asynccontextmanager
async def _fake_get_session(_factory):
    yield SimpleNamespace(execute=_async_noop, commit=_async_noop)


class _StubTenantRepository:
    """Returns the cc_emails configuration for the chess tenant."""

    settings_json: dict = {
        "cc_emails": ["chess@bookedai.au"],
        "operator_email": "chess@bookedai.au",
    }
    profile: dict = {"id": _TENANT_ID, "slug": "co-mai-hung-chess-class"}

    def __init__(self, _ctx=None):
        pass

    async def resolve_tenant_id(self, _ref):
        return _TENANT_ID

    async def get_tenant_settings(self, _ref):
        return dict(self.settings_json)

    async def get_tenant_profile(self, _ref):
        return dict(self.profile)


class _StubBookingIntentRepository:
    """Returns a booking row that points back at the chess tenant."""

    def __init__(self, _ctx=None):
        pass

    async def fetch_meeting_metadata(self, *, booking_reference):
        return {
            "booking_reference": booking_reference,
            "tenant_id": _TENANT_ID,
            "metadata_json": {"zoho_meeting": {}},
            "customer_email": "parent@example.com",
        }


class _RecordingEmailService:
    """Captures the kwargs send_email is called with so tests can assert."""

    def __init__(self):
        self.calls = []

    def smtp_configured(self):
        return True

    async def send_email(self, **kwargs):
        self.calls.append(kwargs)


def _create_app(email_service):
    app = FastAPI()
    app.include_router(v1_router)
    app.state.session_factory = object()
    app.state.settings = SimpleNamespace(
        public_app_url="https://bookedai.au",
        admin_api_token="test-admin-token",
        admin_password="test-admin-password",
        admin_session_ttl_hours=8,
    )
    app.state.email_service = email_service
    return app


def _orchestrator_patches():
    """Patch orchestration helpers so the test focuses on cc resolution."""

    return [
        patch(
            "api.v1_communication_handlers.orchestrate_lifecycle_email",
            lambda *_a, **_k: _async_value(
                SimpleNamespace(
                    message_id="msg-1",
                    delivery_status="sent",
                    provider="smtp",
                    warning_codes=[],
                )
            ),
        ),
        patch(
            "api.v1_communication_handlers.orchestrate_email_sent_sync",
            lambda *_a, **_k: _async_value(
                SimpleNamespace(
                    task_record_id=None,
                    task_sync_status="skipped",
                    task_external_entity_id=None,
                    warning_codes=[],
                )
            ),
        ),
        patch(
            "api.v1_communication_handlers._record_phase2_write_activity",
            lambda *_a, **_k: _async_value(None),
        ),
        patch(
            "api.v1_communication_handlers._resolve_tenant_id",
            _resolve_tenant_id_stub,
        ),
        patch(
            "api.v1_communication_handlers.get_session",
            _fake_get_session,
        ),
        patch(
            "repositories.tenant_repository.TenantRepository",
            _StubTenantRepository,
        ),
        patch(
            "repositories.booking_intent_repository.BookingIntentRepository",
            _StubBookingIntentRepository,
        ),
    ]


async def _async_value(value):
    return value


class EmailAutoCcTenantTest(TestCase):
    def test_booking_confirmation_auto_ccs_tenant_operator(self):
        email_service = _RecordingEmailService()
        app = _create_app(email_service)
        patches = _orchestrator_patches()
        for p in patches:
            p.start()
        try:
            client = TestClient(app)
            response = client.post(
                "/api/v1/email/messages/send",
                json={
                    "template_key": "bookedai_booking_confirmation",
                    "to": ["parent@example.com"],
                    "cc": [],
                    "variables": {"booking_reference": "BR-1234"},
                    "actor_context": {
                        "channel": "admin",
                        "tenant_id": _TENANT_ID,
                    },
                },
            )
        finally:
            for p in patches:
                p.stop()

        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(len(email_service.calls), 1)
        cc = email_service.calls[0]["cc"]
        self.assertIn("chess@bookedai.au", cc)

    def test_reschedule_template_also_auto_ccs(self):
        email_service = _RecordingEmailService()
        app = _create_app(email_service)
        patches = _orchestrator_patches()
        for p in patches:
            p.start()
        try:
            client = TestClient(app)
            response = client.post(
                "/api/v1/email/messages/send",
                json={
                    "template_key": "bookedai_booking_reschedule",
                    "to": ["parent@example.com"],
                    "cc": [],
                    "variables": {"booking_reference": "BR-1234"},
                    "actor_context": {
                        "channel": "admin",
                        "tenant_id": _TENANT_ID,
                    },
                },
            )
        finally:
            for p in patches:
                p.stop()

        self.assertEqual(response.status_code, 200, response.text)
        cc = email_service.calls[0]["cc"]
        self.assertIn("chess@bookedai.au", cc)

    def test_cancellation_template_also_auto_ccs(self):
        email_service = _RecordingEmailService()
        app = _create_app(email_service)
        patches = _orchestrator_patches()
        for p in patches:
            p.start()
        try:
            client = TestClient(app)
            response = client.post(
                "/api/v1/email/messages/send",
                json={
                    "template_key": "bookedai_booking_cancellation",
                    "to": ["parent@example.com"],
                    "cc": ["accountant@example.com"],
                    "variables": {"booking_reference": "BR-1234"},
                    "actor_context": {
                        "channel": "admin",
                        "tenant_id": _TENANT_ID,
                    },
                },
            )
        finally:
            for p in patches:
                p.stop()

        self.assertEqual(response.status_code, 200, response.text)
        cc = email_service.calls[0]["cc"]
        self.assertIn("chess@bookedai.au", cc)
        self.assertIn("accountant@example.com", cc)

    def test_non_lifecycle_template_does_not_auto_cc(self):
        # Make sure other transactional emails (e.g. weekly digest) don't
        # implicitly start CC'ing the operator — that would leak customer
        # data outside the lifecycle the operator opted into.
        email_service = _RecordingEmailService()
        app = _create_app(email_service)
        patches = _orchestrator_patches()
        for p in patches:
            p.start()
        try:
            client = TestClient(app)
            response = client.post(
                "/api/v1/email/messages/send",
                json={
                    "template_key": "tenant_weekly_digest",
                    "to": ["parent@example.com"],
                    "cc": [],
                    "variables": {"booking_reference": "BR-1234"},
                    "actor_context": {
                        "channel": "admin",
                        "tenant_id": _TENANT_ID,
                    },
                },
            )
        finally:
            for p in patches:
                p.stop()

        self.assertEqual(response.status_code, 200, response.text)
        cc = email_service.calls[0]["cc"]
        self.assertEqual(cc, [])

    def test_explicit_cc_is_preserved(self):
        email_service = _RecordingEmailService()
        app = _create_app(email_service)
        patches = _orchestrator_patches()
        for p in patches:
            p.start()
        try:
            client = TestClient(app)
            response = client.post(
                "/api/v1/email/messages/send",
                json={
                    "template_key": "bookedai_booking_confirmation",
                    "to": ["parent@example.com"],
                    "cc": ["caller-supplied@example.com"],
                    "variables": {"booking_reference": "BR-1234"},
                    "actor_context": {
                        "channel": "admin",
                        "tenant_id": _TENANT_ID,
                    },
                },
            )
        finally:
            for p in patches:
                p.stop()

        self.assertEqual(response.status_code, 200, response.text)
        cc = email_service.calls[0]["cc"]
        self.assertIn("caller-supplied@example.com", cc)
        self.assertIn("chess@bookedai.au", cc)
