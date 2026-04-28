"""Tests for the multi-tenant partner-config API surface.

Covers both the public resolver
(`GET /api/v1/public/tenants/{slug}/partner-config`) and the admin upsert
(`POST /api/v1/admin/tenants/{slug}/partner-config`) plus the dashboard list
(`GET /api/v1/admin/tenants/with-partner-config`).
"""

from __future__ import annotations

import sys
from contextlib import asynccontextmanager
from pathlib import Path
from types import SimpleNamespace
from unittest import TestCase
from unittest.mock import patch

from fastapi import FastAPI
from fastapi.testclient import TestClient

BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from api import v1_admin_tenant_config_handlers as admin_handlers  # noqa: E402
from api import v1_public_tenant_config_handlers as public_handlers  # noqa: E402
from api.v1_router import router as v1_router  # noqa: E402
from rate_limit import InMemoryRateLimiter  # noqa: E402


def _create_test_app() -> FastAPI:
    app = FastAPI()
    app.include_router(v1_router)
    app.state.session_factory = object()
    app.state.settings = SimpleNamespace(
        admin_api_token="test-admin-token",
        admin_password="test-admin-password",
        admin_session_ttl_hours=8,
        admin_username="admin",
        admin_session_signing_secret="x" * 32,
        admin_session_signing_secret_required=False,
        session_signing_secret="y" * 32,
        google_oauth_client_id="google-client-id",
        customer_booking_support_email="info@bookedai.au",
        customer_booking_support_phone="+61455301335",
    )
    app.state.rate_limiter = InMemoryRateLimiter()
    return app


def _async_value(value):
    async def _inner(*_args, **_kwargs):
        return value

    return _inner


async def _noop_async(*_args, **_kwargs):
    return None


@asynccontextmanager
async def _fake_session_ctx(_factory):
    yield SimpleNamespace(commit=_noop_async, rollback=_noop_async, flush=_noop_async)


class _StubTenantRepository:
    def __init__(
        self,
        *,
        profile: dict | None = None,
        upsert_result: dict | None = None,
        list_rows: list[dict] | None = None,
    ) -> None:
        self.profile = profile
        self.upsert_result = upsert_result
        self.list_rows = list_rows or []
        self.upsert_calls: list[dict] = []

    async def get_tenant_profile(self, slug):
        if self.profile and slug == self.profile.get("slug"):
            return self.profile
        return None

    async def upsert_partner_config(self, *, slug, config):
        self.upsert_calls.append({"slug": slug, "config": config})
        return self.upsert_result

    async def list_tenants_with_config_status(self):
        return list(self.list_rows)


class _NoopAuditRepository:
    def __init__(self, *_args, **_kwargs) -> None:
        pass

    async def append_entry(self, **_kwargs) -> int | None:
        return 1


def _public_tenant_row(
    *,
    slug: str = "ai-mentor-doer",
    name: str = "AI Mentor 1-1 Pro",
    status: str = "active",
    partner_config_jsonb: dict | None = None,
) -> dict:
    return {
        "id": "11111111-1111-1111-1111-111111111111",
        "slug": slug,
        "name": name,
        "status": status,
        "industry": "education",
        "timezone": "Australia/Sydney",
        "locale": "en-AU",
        "partner_config_jsonb": partner_config_jsonb,
        "partner_config_updated_at": None,
    }


class PublicPartnerConfigRouteTestCase(TestCase):
    # ── Stored config ──────────────────────────────────────────────────────
    def test_tenant_with_stored_config_returns_merged_payload(self):
        stored = {
            "brand": {
                "name": "AI Mentor 1-1 Pro",
                "tagline": "Live BookedAI partner",
                "logo_url": "https://cdn.bookedai.au/tenants/ai-mentor-doer/logo.svg",
                "accent_color": "#0071e3",
            },
            "hero": {
                "kicker": "AI Mentor 1-1 · Live BookedAI partner",
                "h1": "Book your AI mentorship — search live programs, pay, and we'll keep you on track.",
                "sub": "Real BookedAI plugin running on AI Mentor 1-1 Pro.",
                "primary_cta": {"label": "Save my spot", "intent": "open_search", "href": None},
                "secondary_cta": {
                    "label": "Run the live demo",
                    "intent": "external",
                    "href": "https://product.bookedai.au/",
                },
            },
            "capabilities": ["stripe", "telegram", "whatsapp", "calendar", "monthly_reminder", "feedback"],
            "channels": {
                "telegram": {"bot_username": "BookedAI_Manager_Bot", "enabled": True},
                "whatsapp": {"phone_number": "+61455301335", "enabled": True},
                "email_support": "info@bookedai.au",
            },
            "features": {
                "monthly_reminder_default": True,
                "post_booking_feedback": True,
                "show_audit_ledger": False,
                "layout_override": None,
            },
            "services_endpoint": "/api/v1/search/candidates?tenant_ref=ai-mentor-doer",
            "booking_endpoint": "/api/v1/leads",
            "portal_endpoint_prefix": "/api/v1/portal/bookings",
            "trust_signals": [
                {"label": "Verified BookedAI tenant", "icon": "shield-check"},
            ],
            "footer_html": None,
        }
        row = _public_tenant_row(partner_config_jsonb=stored)
        with patch.object(public_handlers, "_load_tenant_anchor", _async_value(row)):
            client = TestClient(_create_test_app())
            response = client.get("/api/v1/public/tenants/ai-mentor-doer/partner-config")

        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual(body["status"], "ok")
        self.assertEqual(body["data"]["slug"], "ai-mentor-doer")
        self.assertTrue(body["data"]["active"])
        self.assertEqual(body["data"]["brand"]["accent_color"], "#0071e3")
        self.assertIn("monthly_reminder", body["data"]["capabilities"])
        self.assertEqual(body["data"]["services_endpoint"], "/api/v1/search/candidates?tenant_ref=ai-mentor-doer")
        # Cache header
        self.assertEqual(response.headers.get("Cache-Control"), "public, max-age=60")
        # Envelope cache_seconds metadata
        self.assertEqual(body["meta"]["cache_seconds"], 60)

    # ── Safe fallback ──────────────────────────────────────────────────────
    def test_tenant_without_stored_config_returns_safe_fallback(self):
        row = _public_tenant_row(
            slug="future-swim",
            name="Future Swim",
            partner_config_jsonb=None,
        )
        with patch.object(public_handlers, "_load_tenant_anchor", _async_value(row)):
            client = TestClient(_create_test_app())
            response = client.get("/api/v1/public/tenants/future-swim/partner-config")

        self.assertEqual(response.status_code, 200)
        data = response.json()["data"]
        # Brand name comes straight from tenants.name
        self.assertEqual(data["brand"]["name"], "Future Swim")
        self.assertEqual(data["brand"]["accent_color"], "#0071e3")
        self.assertIn("Future Swim", data["hero"]["kicker"])
        self.assertIn("Future Swim", data["hero"]["h1"])
        # Default capabilities are guaranteed
        self.assertEqual(
            sorted(data["capabilities"]),
            sorted(["stripe", "telegram", "whatsapp", "calendar"]),
        )
        # Endpoints are always populated even with no stored config
        self.assertEqual(data["services_endpoint"], "/api/v1/search/candidates?tenant_ref=future-swim")
        self.assertEqual(data["booking_endpoint"], "/api/v1/leads")
        self.assertEqual(data["portal_endpoint_prefix"], "/api/v1/portal/bookings")
        self.assertEqual(data["channels"]["whatsapp"]["phone_number"], "+61455301335")
        self.assertEqual(data["channels"]["email_support"], "info@bookedai.au")

    # ── Unknown slug ───────────────────────────────────────────────────────
    def test_unknown_slug_returns_404_envelope(self):
        with patch.object(public_handlers, "_load_tenant_anchor", _async_value(None)):
            client = TestClient(_create_test_app())
            response = client.get("/api/v1/public/tenants/does-not-exist/partner-config")

        self.assertEqual(response.status_code, 404)
        body = response.json()
        self.assertEqual(body["status"], "error")
        self.assertEqual(body["error"]["code"], "tenant_not_found")

    # ── Inactive tenant ────────────────────────────────────────────────────
    def test_inactive_tenant_returns_404(self):
        row = _public_tenant_row(status="paused")
        with patch.object(public_handlers, "_load_tenant_anchor", _async_value(row)):
            client = TestClient(_create_test_app())
            response = client.get("/api/v1/public/tenants/ai-mentor-doer/partner-config")

        self.assertEqual(response.status_code, 404)
        body = response.json()
        self.assertEqual(body["error"]["code"], "tenant_not_found")

    # ── Rate limit ─────────────────────────────────────────────────────────
    def test_rate_limit_kicks_in_on_31st_request(self):
        row = _public_tenant_row()
        with patch.object(public_handlers, "_load_tenant_anchor", _async_value(row)):
            app = _create_test_app()
            client = TestClient(app)
            last_response = None
            for index in range(31):
                last_response = client.get(
                    "/api/v1/public/tenants/ai-mentor-doer/partner-config"
                )
                if last_response.status_code == 429:
                    break

        self.assertIsNotNone(last_response)
        self.assertEqual(last_response.status_code, 429)
        body = last_response.json()
        self.assertEqual(body["status"], "error")
        self.assertEqual(body["error"]["code"], "tenant_partner_config_rate_limited")


class AdminPartnerConfigRouteTestCase(TestCase):
    # ── Auth ───────────────────────────────────────────────────────────────
    def test_no_auth_returns_401_envelope(self):
        client = TestClient(_create_test_app())
        response = client.post(
            "/api/v1/admin/tenants/ai-mentor-doer/partner-config",
            json={
                "brand": {"name": "AI Mentor 1-1 Pro", "accent_color": "#0071e3"},
                "hero": {"h1": "Book your AI mentorship today."},
            },
        )

        self.assertEqual(response.status_code, 401)
        body = response.json()
        self.assertEqual(body["status"], "error")
        self.assertEqual(body["error"]["code"], "admin_auth_required")

    # ── Happy path ─────────────────────────────────────────────────────────
    def test_valid_auth_and_body_persists_partner_config(self):
        repo = _StubTenantRepository(
            profile={
                "id": "11111111-1111-1111-1111-111111111111",
                "slug": "ai-mentor-doer",
                "name": "AI Mentor 1-1 Pro",
                "status": "active",
            },
            upsert_result={
                "slug": "ai-mentor-doer",
                "partner_config_jsonb": {"brand": {"name": "AI Mentor 1-1 Pro"}},
                "partner_config_updated_at": "2026-04-28T00:00:00+00:00",
            },
        )
        with patch.object(admin_handlers, "TenantRepository", lambda _ctx: repo), patch.object(
            admin_handlers, "AuditLogRepository", _NoopAuditRepository
        ), patch.object(admin_handlers, "get_session", _fake_session_ctx):
            client = TestClient(_create_test_app())
            response = client.post(
                "/api/v1/admin/tenants/ai-mentor-doer/partner-config",
                headers={"X-Admin-Token": "test-admin-token"},
                json={
                    "brand": {
                        "name": "AI Mentor 1-1 Pro",
                        "tagline": "Live BookedAI partner",
                        "accent_color": "#0071e3",
                    },
                    "hero": {
                        "h1": "Book your AI mentorship today.",
                        "kicker": "AI Mentor 1-1 · Live BookedAI partner",
                        "primary_cta": {"label": "Save my spot", "intent": "open_search"},
                    },
                    "capabilities": ["stripe", "telegram", "whatsapp", "calendar"],
                },
            )

        self.assertEqual(response.status_code, 200, response.text)
        body = response.json()
        self.assertEqual(body["status"], "ok")
        self.assertEqual(body["data"]["slug"], "ai-mentor-doer")
        self.assertEqual(body["data"]["brand"]["name"], "AI Mentor 1-1 Pro")
        self.assertEqual(len(repo.upsert_calls), 1)
        upsert = repo.upsert_calls[0]
        self.assertEqual(upsert["slug"], "ai-mentor-doer")
        self.assertEqual(upsert["config"]["brand"]["name"], "AI Mentor 1-1 Pro")
        self.assertIn("stripe", upsert["config"]["capabilities"])

    # ── Validation: bad hex color ─────────────────────────────────────────
    def test_invalid_hex_color_returns_validation_error(self):
        repo = _StubTenantRepository(
            profile={
                "id": "11111111-1111-1111-1111-111111111111",
                "slug": "ai-mentor-doer",
                "name": "AI Mentor 1-1 Pro",
                "status": "active",
            },
        )
        with patch.object(admin_handlers, "TenantRepository", lambda _ctx: repo), patch.object(
            admin_handlers, "AuditLogRepository", _NoopAuditRepository
        ), patch.object(admin_handlers, "get_session", _fake_session_ctx):
            client = TestClient(_create_test_app())
            response = client.post(
                "/api/v1/admin/tenants/ai-mentor-doer/partner-config",
                headers={"X-Admin-Token": "test-admin-token"},
                json={
                    "brand": {"name": "AI Mentor 1-1 Pro", "accent_color": "not-a-hex"},
                    "hero": {"h1": "Book your AI mentorship today."},
                },
            )

        self.assertEqual(response.status_code, 422)
        body = response.json()
        self.assertEqual(body["status"], "error")
        self.assertEqual(body["error"]["code"], "validation_error")

    # ── Validation: capability not in allowed list ─────────────────────────
    def test_capability_not_in_allowed_list_returns_validation_error(self):
        repo = _StubTenantRepository(
            profile={
                "id": "11111111-1111-1111-1111-111111111111",
                "slug": "ai-mentor-doer",
                "name": "AI Mentor 1-1 Pro",
                "status": "active",
            },
        )
        with patch.object(admin_handlers, "TenantRepository", lambda _ctx: repo), patch.object(
            admin_handlers, "AuditLogRepository", _NoopAuditRepository
        ), patch.object(admin_handlers, "get_session", _fake_session_ctx):
            client = TestClient(_create_test_app())
            response = client.post(
                "/api/v1/admin/tenants/ai-mentor-doer/partner-config",
                headers={"X-Admin-Token": "test-admin-token"},
                json={
                    "brand": {"name": "AI Mentor 1-1 Pro", "accent_color": "#0071e3"},
                    "hero": {"h1": "Book your AI mentorship today."},
                    "capabilities": ["stripe", "magic_capability"],
                },
            )

        self.assertEqual(response.status_code, 422)
        body = response.json()
        self.assertEqual(body["error"]["code"], "validation_error")

    # ── Unknown slug ───────────────────────────────────────────────────────
    def test_unknown_slug_returns_404(self):
        repo = _StubTenantRepository(profile=None)
        with patch.object(admin_handlers, "TenantRepository", lambda _ctx: repo), patch.object(
            admin_handlers, "AuditLogRepository", _NoopAuditRepository
        ), patch.object(admin_handlers, "get_session", _fake_session_ctx):
            client = TestClient(_create_test_app())
            response = client.post(
                "/api/v1/admin/tenants/unknown-tenant/partner-config",
                headers={"X-Admin-Token": "test-admin-token"},
                json={
                    "brand": {"name": "Unknown Tenant", "accent_color": "#0071e3"},
                    "hero": {"h1": "Hello"},
                },
            )

        self.assertEqual(response.status_code, 404)
        body = response.json()
        self.assertEqual(body["error"]["code"], "tenant_not_found")

    # ── Admin list endpoint ────────────────────────────────────────────────
    def test_admin_list_returns_has_partner_config_flag(self):
        repo = _StubTenantRepository(
            list_rows=[
                {
                    "id": "11111111-1111-1111-1111-111111111111",
                    "slug": "ai-mentor-doer",
                    "name": "AI Mentor 1-1 Pro",
                    "status": "active",
                    "industry": "education",
                    "timezone": "Australia/Sydney",
                    "locale": "en-AU",
                    "has_partner_config": True,
                    "partner_config_updated_at": None,
                },
                {
                    "id": "22222222-2222-2222-2222-222222222222",
                    "slug": "future-swim",
                    "name": "Future Swim",
                    "status": "active",
                    "industry": "fitness",
                    "timezone": "Australia/Sydney",
                    "locale": "en-AU",
                    "has_partner_config": False,
                    "partner_config_updated_at": None,
                },
            ],
        )
        with patch.object(admin_handlers, "TenantRepository", lambda _ctx: repo), patch.object(
            admin_handlers, "get_session", _fake_session_ctx
        ):
            client = TestClient(_create_test_app())
            response = client.get(
                "/api/v1/admin/tenants/with-partner-config",
                headers={"X-Admin-Token": "test-admin-token"},
            )

        self.assertEqual(response.status_code, 200, response.text)
        data = response.json()["data"]
        self.assertEqual(data["total"], 2)
        slugs = {item["slug"]: item["has_partner_config"] for item in data["items"]}
        self.assertEqual(slugs["ai-mentor-doer"], True)
        self.assertEqual(slugs["future-swim"], False)

    def test_admin_list_requires_auth(self):
        client = TestClient(_create_test_app())
        response = client.get("/api/v1/admin/tenants/with-partner-config")

        self.assertEqual(response.status_code, 401)
        body = response.json()
        self.assertEqual(body["error"]["code"], "admin_auth_required")
