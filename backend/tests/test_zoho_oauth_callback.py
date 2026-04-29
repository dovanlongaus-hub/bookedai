"""Tests for the Zoho OAuth callback endpoint.

The callback is a public route — security comes from the ``state`` nonce
that we issued earlier and persisted under the tenant's
``integrations.{service}.pending_state.nonce`` slot. These tests verify:

* Successful code-for-refresh-token exchange persists the refresh token.
* A nonce mismatch redirects to the failure URL without persisting.
* Missing ``code`` / ``state`` is handled gracefully.
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
from api.v1_tenant_zoho_integration_handlers import _encode_state  # noqa: E402


_TENANT_ID = "22222222-2222-2222-2222-222222222222"


def _platform_settings():
    return SimpleNamespace(
        public_app_url="https://bookedai.au",
        zoho_accounts_base_url="https://accounts.zoho.com.au",
        zoho_calendar_uid="platform-uid",
        zoho_calendar_client_id="platform-cal-client",
        zoho_calendar_client_secret="platform-cal-secret",
        zoho_calendar_api_base_url="https://calendar.zoho.com/api/v1",
        zoho_calendar_refresh_token="",
        zoho_calendar_access_token="",
        zoho_crm_client_id="platform-crm-client",
        zoho_crm_client_secret="platform-crm-secret",
        zoho_crm_api_base_url="https://www.zohoapis.com.au/crm/v8",
        zoho_crm_refresh_token="",
        zoho_crm_access_token="",
    )


class _StubTenantRepository:
    store: dict[str, dict] = {}

    def __init__(self, _ctx=None):
        self._ctx = _ctx

    async def get_tenant_settings(self, _tenant_ref):
        return dict(self.store.get(_TENANT_ID, {}))

    async def upsert_tenant_settings(self, *, tenant_id, settings_json):
        existing = dict(self.store.get(tenant_id, {}))
        merged = _deep_merge(existing, settings_json)
        self.store[tenant_id] = merged
        return {"settings_json": merged, "version": 1, "updated_at": None}


def _deep_merge(target, source):
    merged = dict(target)
    for key, value in (source or {}).items():
        if isinstance(value, dict) and isinstance(merged.get(key), dict):
            merged[key] = _deep_merge(merged[key], value)
        else:
            merged[key] = value
    return merged


@asynccontextmanager
async def _stub_get_session(_factory):
    yield SimpleNamespace(commit=_async_noop)


async def _async_noop(*_args, **_kwargs):
    return None


class _StubAsyncClient:
    """httpx.AsyncClient stand-in: returns a canned token response."""

    posts: list[dict] = []
    response_status: int = 200
    response_payload: dict = {
        "access_token": "ACCESS",
        "refresh_token": "FRESH-REFRESH",
        "api_domain": "https://www.zohoapis.com.au",
        "token_type": "Bearer",
        "expires_in": 3600,
    }

    def __init__(self, *_args, **_kwargs):
        pass

    async def __aenter__(self):
        return self

    async def __aexit__(self, *_args, **_kwargs):
        return None

    async def post(self, url, *, data=None, json=None):
        type(self).posts.append({"url": url, "data": data})
        return SimpleNamespace(
            status_code=type(self).response_status,
            text="",
            json=lambda: type(self).response_payload,
        )


def _create_test_app() -> FastAPI:
    app = FastAPI()
    app.include_router(v1_router)
    app.state.session_factory = object()
    app.state.settings = _platform_settings()
    app.state.email_service = SimpleNamespace(smtp_configured=lambda: False)
    return app


class ZohoOAuthCallbackTest(TestCase):
    def setUp(self) -> None:
        _StubAsyncClient.posts = []
        _StubAsyncClient.response_status = 200
        _StubTenantRepository.store = {
            _TENANT_ID: {
                "integrations": {
                    "zoho_calendar": {
                        "connected": False,
                        "pending_state": {"nonce": "abc123nonce", "initiated_by": "chess@bookedai.au"},
                    }
                }
            }
        }

    def _patches(self):
        return [
            patch(
                "api.v1_tenant_zoho_integration_handlers.get_session",
                _stub_get_session,
            ),
            patch(
                "api.v1_tenant_zoho_integration_handlers.TenantRepository",
                _StubTenantRepository,
            ),
            patch(
                "api.v1_tenant_zoho_integration_handlers.httpx.AsyncClient",
                _StubAsyncClient,
            ),
        ]

    def test_callback_persists_refresh_token_on_valid_state(self):
        for p in self._patches():
            p.start()
        try:
            state = _encode_state(
                tenant_id=_TENANT_ID, service="calendar", nonce="abc123nonce"
            )
            with TestClient(_create_test_app()) as client:
                response = client.get(
                    "/api/v1/integrations/zoho/oauth/callback",
                    params={"code": "auth-code-12345", "state": state},
                    follow_redirects=False,
                )
            self.assertEqual(response.status_code, 302)
            self.assertIn("status=connected", response.headers["location"])
            self.assertIn("service=calendar", response.headers["location"])
            block = _StubTenantRepository.store[_TENANT_ID]["integrations"]["zoho_calendar"]
            self.assertTrue(block["connected"])
            self.assertEqual(block["refresh_token"], "FRESH-REFRESH")
            self.assertEqual(block["client_id"], "platform-cal-client")
            self.assertEqual(block["connected_by_user_email"], "chess@bookedai.au")
            self.assertTrue(_StubAsyncClient.posts)
            self.assertIn("/oauth/v2/token", _StubAsyncClient.posts[0]["url"])
        finally:
            for p in self._patches():
                p.stop()

    def test_callback_rejects_nonce_mismatch(self):
        for p in self._patches():
            p.start()
        try:
            wrong_state = _encode_state(
                tenant_id=_TENANT_ID, service="calendar", nonce="WRONG"
            )
            with TestClient(_create_test_app()) as client:
                response = client.get(
                    "/api/v1/integrations/zoho/oauth/callback",
                    params={"code": "auth-code-12345", "state": wrong_state},
                    follow_redirects=False,
                )
            self.assertEqual(response.status_code, 302)
            self.assertIn("nonce_mismatch", response.headers["location"])
            block = _StubTenantRepository.store[_TENANT_ID]["integrations"]["zoho_calendar"]
            # The original pending_state should be intact and connected==False.
            self.assertFalse(block["connected"])
            self.assertNotIn("refresh_token", block)
        finally:
            for p in self._patches():
                p.stop()

    def test_callback_handles_missing_code(self):
        for p in self._patches():
            p.start()
        try:
            with TestClient(_create_test_app()) as client:
                response = client.get(
                    "/api/v1/integrations/zoho/oauth/callback",
                    params={"state": "anything"},
                    follow_redirects=False,
                )
            self.assertEqual(response.status_code, 302)
            self.assertIn("missing_code_or_state", response.headers["location"])
        finally:
            for p in self._patches():
                p.stop()

    def test_callback_handles_token_exchange_failure(self):
        _StubAsyncClient.response_status = 400
        for p in self._patches():
            p.start()
        try:
            state = _encode_state(
                tenant_id=_TENANT_ID, service="calendar", nonce="abc123nonce"
            )
            with TestClient(_create_test_app()) as client:
                response = client.get(
                    "/api/v1/integrations/zoho/oauth/callback",
                    params={"code": "bad-code", "state": state},
                    follow_redirects=False,
                )
            self.assertEqual(response.status_code, 302)
            self.assertIn("token_exchange_failed", response.headers["location"])
            block = _StubTenantRepository.store[_TENANT_ID]["integrations"]["zoho_calendar"]
            self.assertFalse(block["connected"])
        finally:
            for p in self._patches():
                p.stop()
