"""Tests for the P0-2 tenant cross-write hardening.

These tests cover:
  * The tenant-authenticated /api/v1/leads endpoint must reject calls that omit
    actor_context (used to silently fall back to the platform default tenant).
  * The same endpoint must reject calls whose actor_context.tenant_id does NOT
    match the bearer-token tenant session.
  * The new public, slug-scoped /api/v1/public/leads/{tenant_slug} endpoint
    must succeed without a session, return 404 for unknown slugs, and enforce
    a 10/min/IP rate limit.
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
from core.session_tokens import create_tenant_session_token  # noqa: E402
from rate_limit import InMemoryRateLimiter  # noqa: E402
from repositories.tenant_repository import TenantRepository  # noqa: E402


async def _async_noop(*_args, **_kwargs):
    return None


async def _resolve_public_tenant_stub(_request, _tenant_slug):
    return {
        "id": "tenant-public-id",
        "slug": "demo-tenant",
        "name": "Demo Tenant",
    }


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


def _build_test_app(*, tenant_lookup_row: dict | None = None) -> FastAPI:
    """Build a minimal FastAPI app that mounts the v1 router under test."""

    async def _execute(*_args, **_kwargs):
        return _FakeExecuteResult(tenant_lookup_row)

    def _session_factory():
        return SimpleNamespace(execute=_execute, commit=_async_noop, close=_async_noop)

    app = FastAPI()
    app.include_router(v1_router)
    app.state.session_factory = _session_factory
    app.state.settings = SimpleNamespace(
        admin_api_token="test-admin-token",
        admin_password="test-admin-password",
        admin_session_ttl_hours=8,
        google_oauth_client_id="google-client-id",
        session_signing_secret="test-session-secret",
        tenant_session_signing_secret="test-tenant-session-secret",
        stripe_secret_key="sk_test_bookedai",
        stripe_currency="aud",
        public_app_url="https://demo.bookedai.au",
    )
    app.state.rate_limiter = InMemoryRateLimiter()
    return app


@asynccontextmanager
async def _fake_get_session(_session_factory):
    yield SimpleNamespace(execute=_async_noop, commit=_async_noop)


def _public_lead_payload() -> dict:
    return {
        "lead_type": "public_widget",
        "contact": {
            "full_name": "Avery Public",
            "email": "avery@example.com",
            "phone": None,
        },
        "attribution": {"source": "public_widget"},
    }


def _tenant_lead_payload(*, actor_context: dict | None) -> dict:
    base = {
        "lead_type": "tenant_capture",
        "contact": {
            "full_name": "Tenant Lead",
            "email": "tenant.lead@example.com",
            "phone": None,
        },
        "attribution": {"source": "tenant_widget"},
    }
    if actor_context is not None:
        base["actor_context"] = actor_context
    return base


class TenantIsolationLeadsTestCase(TestCase):
    """P0-2 — vulnerable callers can no longer reach the default tenant."""

    def test_authenticated_leads_rejects_missing_actor_context(self):
        app = _build_test_app()
        client = TestClient(app)
        # Pydantic will reject the missing required actor_context with 422.
        response = client.post(
            "/api/v1/leads",
            json=_tenant_lead_payload(actor_context=None),
        )
        self.assertEqual(response.status_code, 422)

    def test_authenticated_leads_rejects_empty_actor_context(self):
        app = _build_test_app()
        client = TestClient(app)
        # An actor_context with no tenant_id and no tenant_ref previously
        # silently fell through to the platform default tenant; it must now
        # be rejected with a 401.
        response = client.post(
            "/api/v1/leads",
            json=_tenant_lead_payload(
                actor_context={"channel": "public_web"},
            ),
        )
        self.assertEqual(response.status_code, 401)
        body = response.json()
        self.assertIn("Tenant session required", body.get("detail", ""))

    def test_authenticated_leads_rejects_mismatched_tenant_session(self):
        app = _build_test_app()
        session_token, _expires = create_tenant_session_token(
            app.state.settings,
            email="owner@example.com",
            tenant_ref="tenant-alpha",
            name="Tenant Alpha",
            picture_url=None,
            google_sub=None,
        )

        async def _resolve_tenant_id(_self, tenant_ref):
            if tenant_ref == "tenant-alpha":
                return "tenant-alpha-id"
            return None

        with patch.object(TenantRepository, "resolve_tenant_id", _resolve_tenant_id):
            client = TestClient(app)
            response = client.post(
                "/api/v1/leads",
                headers={"Authorization": f"Bearer {session_token}"},
                json=_tenant_lead_payload(
                    actor_context={
                        "channel": "public_web",
                        # Caller is asking to write into the wrong tenant.
                        "tenant_id": "tenant-beta-id",
                    },
                ),
            )

        self.assertEqual(response.status_code, 403)


class PublicLeadsEndpointTestCase(TestCase):
    """P0-2 — new public-tenant endpoint replaces the unsafe default fallback."""

    _TENANT_ROW = {
        "id": "tenant-public-id",
        "slug": "demo-tenant",
        "name": "Demo Tenant",
        "status": "active",
    }

    def test_public_leads_succeeds_for_active_slug(self):
        app = _build_test_app(tenant_lookup_row=self._TENANT_ROW)

        async def _upsert_contact(*_args, **_kwargs):
            return "contact-public-1"

        async def _upsert_lead(*_args, **_kwargs):
            return "lead-public-1"

        async def _crm(*_args, **_kwargs):
            return SimpleNamespace(sync_status="queued", record_id=None, external_entity_id=None)

        with patch("api.v1_public_routes.get_session", _fake_get_session), patch(
            "api.v1_public_routes.ContactRepository.upsert_contact",
            _upsert_contact,
        ), patch(
            "api.v1_public_routes.LeadRepository.upsert_lead",
            _upsert_lead,
        ), patch(
            "api.v1_public_routes.orchestrate_lead_capture",
            _crm,
        ), patch(
            "api.v1_public_routes._record_phase2_write_activity",
            _async_noop,
        ), patch(
            "api.v1_public_routes._resolve_public_tenant",
            _resolve_public_tenant_stub,
        ):
            client = TestClient(app)
            response = client.post(
                "/api/v1/public/leads/demo-tenant",
                json=_public_lead_payload(),
            )

        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual(body["status"], "ok")
        self.assertEqual(body["data"]["tenant_slug"], "demo-tenant")
        self.assertEqual(body["data"]["lead_id"], "lead-public-1")

    def test_public_leads_returns_404_for_unknown_slug(self):
        # tenant_lookup_row=None makes the slug query return nothing.
        app = _build_test_app(tenant_lookup_row=None)
        client = TestClient(app)
        response = client.post(
            "/api/v1/public/leads/this-slug-does-not-exist",
            json=_public_lead_payload(),
        )
        self.assertEqual(response.status_code, 404)

    def test_public_leads_enforces_per_ip_rate_limit(self):
        app = _build_test_app(tenant_lookup_row=self._TENANT_ROW)

        async def _upsert_contact(*_args, **_kwargs):
            return "contact-public-rl"

        async def _upsert_lead(*_args, **_kwargs):
            return "lead-public-rl"

        async def _crm(*_args, **_kwargs):
            return SimpleNamespace(sync_status="queued", record_id=None, external_entity_id=None)

        with patch("api.v1_public_routes.get_session", _fake_get_session), patch(
            "api.v1_public_routes.ContactRepository.upsert_contact",
            _upsert_contact,
        ), patch(
            "api.v1_public_routes.LeadRepository.upsert_lead",
            _upsert_lead,
        ), patch(
            "api.v1_public_routes.orchestrate_lead_capture",
            _crm,
        ), patch(
            "api.v1_public_routes._record_phase2_write_activity",
            _async_noop,
        ), patch(
            "api.v1_public_routes._resolve_public_tenant",
            _resolve_public_tenant_stub,
        ):
            client = TestClient(app)
            statuses = [
                client.post(
                    "/api/v1/public/leads/demo-tenant",
                    json=_public_lead_payload(),
                ).status_code
                for _ in range(11)
            ]

        # First 10 within the window must succeed; the 11th must be limited.
        self.assertEqual(statuses[:10], [200] * 10)
        self.assertEqual(statuses[10], 429)
