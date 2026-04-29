"""End-to-end tests for the per-tenant Zoho integrations API.

The tests stub :func:`api.v1_routes._resolve_tenant_request_context` to
return a deterministic tenant_admin session, and intercept the calls into
:class:`TenantRepository.get_tenant_settings` / ``upsert_tenant_settings``
with an in-memory dict so we can assert the OAuth state nonce is round-
tripped correctly.
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


_TENANT_ID = "11111111-1111-1111-1111-111111111111"


def _platform_settings():
    return SimpleNamespace(
        public_app_url="https://bookedai.au",
        zoho_accounts_base_url="https://accounts.zoho.com.au",
        zoho_calendar_api_base_url="https://calendar.zoho.com/api/v1",
        zoho_calendar_uid="platform-uid",
        zoho_calendar_access_token="",
        zoho_calendar_refresh_token="",
        zoho_calendar_client_id="platform-cal-client",
        zoho_calendar_client_secret="platform-cal-secret",
        zoho_crm_api_base_url="https://www.zohoapis.com.au/crm/v8",
        zoho_crm_access_token="",
        zoho_crm_refresh_token="",
        zoho_crm_client_id="platform-crm-client",
        zoho_crm_client_secret="platform-crm-secret",
        zoho_crm_default_lead_module="Leads",
        zoho_crm_default_contact_module="Contacts",
        zoho_crm_default_deal_module="Deals",
        zoho_crm_default_task_module="Tasks",
    )


class _StubTenantRepository:
    """In-memory stand-in for ``TenantRepository`` used across handlers."""

    store: dict[str, dict] = {}

    def __init__(self, _ctx=None):
        self._ctx = _ctx

    async def resolve_tenant_id(self, _ref):  # pragma: no cover - not exercised
        return _TENANT_ID

    async def get_tenant_profile(self, _ref):
        return {"id": _TENANT_ID, "slug": "co-mai-hung-chess-class"}

    async def get_tenant_settings(self, _tenant_ref):
        return dict(self.store.get(_TENANT_ID, {}))

    async def upsert_tenant_settings(self, *, tenant_id, settings_json):
        existing = dict(self.store.get(tenant_id, {}))
        merged = _deep_merge(existing, settings_json)
        self.store[tenant_id] = merged
        return {"settings_json": merged, "version": 1, "updated_at": None}


def _deep_merge(target: dict, source: dict) -> dict:
    """Postgres-like jsonb || merge, recursive at the top two levels."""
    merged = dict(target)
    for key, value in (source or {}).items():
        if (
            isinstance(value, dict)
            and isinstance(merged.get(key), dict)
        ):
            merged[key] = _deep_merge(merged[key], value)
        else:
            merged[key] = value
    return merged


@asynccontextmanager
async def _stub_get_session(_factory):
    yield SimpleNamespace(commit=_async_noop)


async def _async_noop(*_args, **_kwargs):
    return None


async def _resolve_tenant_admin_context(*_args, **_kwargs):
    return (
        "co-mai-hung-chess-class",
        _TENANT_ID,
        {"email": "chess@bookedai.au", "tenant_ref": "co-mai-hung-chess-class"},
        {"email": "chess@bookedai.au", "role": "tenant_admin", "status": "active"},
    )


def _create_test_app() -> FastAPI:
    app = FastAPI()
    app.include_router(v1_router)
    app.state.session_factory = object()
    app.state.settings = _platform_settings()
    app.state.email_service = SimpleNamespace(smtp_configured=lambda: False)
    return app


class TenantZohoIntegrationRoutesTest(TestCase):
    def setUp(self) -> None:
        _StubTenantRepository.store = {
            _TENANT_ID: {
                "cc_emails": ["chess@bookedai.au"],
                "operator_email": "chess@bookedai.au",
            }
        }

    def _patches(self):
        return [
            patch(
                "api.v1_tenant_zoho_integration_handlers._resolve_tenant_request_context",
                _resolve_tenant_admin_context,
            ),
            patch(
                "api.v1_tenant_zoho_integration_handlers.get_session",
                _stub_get_session,
            ),
            patch(
                "api.v1_tenant_zoho_integration_handlers.TenantRepository",
                _StubTenantRepository,
            ),
        ]

    def test_list_integrations_returns_zoho_blocks(self):
        for p in self._patches():
            p.start()
        try:
            with TestClient(_create_test_app()) as client:
                response = client.get(
                    "/api/v1/tenants/me/integrations",
                    headers={"Authorization": "Bearer fake"},
                )
            self.assertEqual(response.status_code, 200, response.text)
            body = response.json()
            self.assertEqual(body["data"]["tenant_id"], _TENANT_ID)
            self.assertEqual(body["data"]["cc_emails"], ["chess@bookedai.au"])
            self.assertIn("zoho_calendar", body["data"]["integrations"])
            self.assertIn("zoho_crm", body["data"]["integrations"])
            self.assertFalse(body["data"]["integrations"]["zoho_calendar"]["connected"])
            self.assertEqual(
                body["data"]["redirect_uri"],
                "https://bookedai.au/api/v1/integrations/zoho/oauth/callback",
            )
        finally:
            for p in self._patches():
                p.stop()

    def test_authorize_url_includes_state_and_persists_nonce(self):
        for p in self._patches():
            p.start()
        try:
            with TestClient(_create_test_app()) as client:
                response = client.get(
                    "/api/v1/tenants/me/integrations/zoho/calendar/authorize-url",
                    headers={"Authorization": "Bearer fake"},
                )
            self.assertEqual(response.status_code, 200, response.text)
            data = response.json()["data"]
            self.assertIn("authorize_url", data)
            self.assertIn("state=", data["authorize_url"])
            self.assertEqual(data["client_mode"], "platform_app")
            self.assertEqual(
                data["redirect_uri"],
                "https://bookedai.au/api/v1/integrations/zoho/oauth/callback",
            )
            stored = _StubTenantRepository.store[_TENANT_ID]
            zoho_block = stored["integrations"]["zoho_calendar"]
            self.assertIn("pending_state", zoho_block)
            self.assertTrue(zoho_block["pending_state"]["nonce"])
            self.assertEqual(
                zoho_block["pending_state"]["initiated_by"], "chess@bookedai.au"
            )
        finally:
            for p in self._patches():
                p.stop()

    def test_authorize_url_rejects_unsupported_service(self):
        for p in self._patches():
            p.start()
        try:
            with TestClient(_create_test_app()) as client:
                response = client.get(
                    "/api/v1/tenants/me/integrations/zoho/sheet/authorize-url",
                    headers={"Authorization": "Bearer fake"},
                )
            self.assertEqual(response.status_code, 422)
        finally:
            for p in self._patches():
                p.stop()

    def test_disconnect_clears_refresh_token_but_preserves_client_id(self):
        _StubTenantRepository.store[_TENANT_ID] = {
            "integrations": {
                "zoho_crm": {
                    "connected": True,
                    "refresh_token": "tenant-refresh",
                    "client_id": "tenant-client",
                    "client_secret": "tenant-secret",
                    "accounts_base_url": "https://accounts.zoho.com.au",
                    "api_base_url": "https://www.zohoapis.com.au/crm/v8",
                }
            }
        }
        for p in self._patches():
            p.start()
        try:
            with TestClient(_create_test_app()) as client:
                response = client.delete(
                    "/api/v1/tenants/me/integrations/zoho/crm",
                    headers={"Authorization": "Bearer fake"},
                )
            self.assertEqual(response.status_code, 200, response.text)
            block = _StubTenantRepository.store[_TENANT_ID]["integrations"]["zoho_crm"]
            self.assertFalse(block["connected"])
            self.assertEqual(block["refresh_token"], "")
            self.assertEqual(block["client_id"], "tenant-client")
        finally:
            for p in self._patches():
                p.stop()

    def test_register_client_uploads_mode_b_credentials(self):
        for p in self._patches():
            p.start()
        try:
            with TestClient(_create_test_app()) as client:
                response = client.patch(
                    "/api/v1/tenants/me/integrations/zoho/calendar/client",
                    headers={"Authorization": "Bearer fake"},
                    json={
                        "client_id": "1000.MYAPPCLIENT",
                        "client_secret": "1234abcd",
                    },
                )
            self.assertEqual(response.status_code, 200, response.text)
            block = (
                _StubTenantRepository.store[_TENANT_ID]
                .get("integrations", {})
                .get("zoho_calendar", {})
            )
            self.assertEqual(block["client_id"], "1000.MYAPPCLIENT")
            self.assertEqual(block["client_secret"], "1234abcd")
        finally:
            for p in self._patches():
                p.stop()

    def test_update_cc_emails_persists_normalized_list(self):
        for p in self._patches():
            p.start()
        try:
            with TestClient(_create_test_app()) as client:
                response = client.patch(
                    "/api/v1/tenants/me/cc-emails",
                    headers={"Authorization": "Bearer fake"},
                    json={
                        "cc_emails": ["Chess@bookedai.au", "second@example.com", "not-an-email"],
                        "operator_email": "Ops@example.com",
                    },
                )
            self.assertEqual(response.status_code, 200, response.text)
            stored = _StubTenantRepository.store[_TENANT_ID]
            self.assertEqual(
                stored["cc_emails"],
                ["chess@bookedai.au", "second@example.com"],
            )
            self.assertEqual(stored["operator_email"], "ops@example.com")
        finally:
            for p in self._patches():
                p.stop()
