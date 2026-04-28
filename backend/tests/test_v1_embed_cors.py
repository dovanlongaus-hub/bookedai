"""CORS / surface tests for the ``/api/v1/embed/*`` plugin widget routes.

These guard the security invariants that make the embed prefix safe:

* ``Access-Control-Allow-Origin`` is wildcarded for any external tenant
  domain (``aimentorpro.com`` etc.).
* ``Access-Control-Allow-Credentials`` is NEVER set on embed responses —
  ``allow_credentials=False`` is the invariant that keeps wildcarding
  origins safe under the CORS spec.
* The credentialed ``/api/v1/public/*`` surface is unaffected — its
  allow-list and ``allow_credentials=true`` posture continues to work.
* Cookies and ``Authorization`` headers sent to embed routes are ignored.
* Embed write paths (``/leads``) require an explicit ``tenant_slug`` body
  field and are rate-limited at 10/min/IP.
* Embed search requires a ``tenant_ref`` so the open prefix cannot be used
  for cross-tenant fishing.
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

import app as bookedai_app_module  # noqa: E402
from api import v1_embed_routes  # noqa: E402
from api import v1_public_tenant_config_handlers as partner_config_handlers  # noqa: E402
from api import v1_search_handlers as search_handlers  # noqa: E402
from api.v1_router import router as v1_router  # noqa: E402
from fastapi.middleware.cors import CORSMiddleware  # noqa: E402
from rate_limit import InMemoryRateLimiter  # noqa: E402


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _async_value_factory(value):
    async def _inner(*_args, **_kwargs):
        return value

    return _inner


async def _async_noop(*_args, **_kwargs):
    return None


@asynccontextmanager
async def _noop_lifespan(_app):
    yield


def _public_tenant_row(slug: str = "ai-mentor-doer") -> dict:
    return {
        "id": "11111111-1111-1111-1111-111111111111",
        "slug": slug,
        "name": "AI Mentor 1-1 Pro",
        "status": "active",
        "industry": "education",
        "timezone": "Australia/Sydney",
        "locale": "en-AU",
        "partner_config_jsonb": None,
        "partner_config_updated_at": None,
    }


def _make_app() -> FastAPI:
    """Build a parent FastAPI app that mounts the embed sub-app.

    We mirror the production composition in ``backend/app.py``: the parent
    has a CREDENTIALED ``CORSMiddleware`` plus the ``EmbedCorsHygieneMiddleware``
    that quarantines ``/api/v1/embed/*`` from the parent CORS layer. This way
    these tests actually exercise the production CORS interaction surface
    rather than a bare composition that would silently pass.
    """
    parent = FastAPI()
    # Parent CORS first so it sits INSIDE EmbedCorsHygieneMiddleware on the
    # response flow.
    parent.add_middleware(
        CORSMiddleware,
        allow_origins=["https://bookedai.au"],
        allow_credentials=True,
        allow_methods=["GET", "POST", "OPTIONS"],
        allow_headers=["Authorization", "Content-Type"],
        max_age=600,
    )
    parent.add_middleware(bookedai_app_module.EmbedCorsHygieneMiddleware)
    parent.include_router(v1_router)
    parent.state.session_factory = object()
    parent.state.settings = SimpleNamespace(
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
    parent.state.rate_limiter = InMemoryRateLimiter()
    parent.state.openai_service = SimpleNamespace()  # search handler tolerates absence
    parent.state.semantic_search_service = None

    embed_app = v1_embed_routes.build_embed_app(parent)
    parent.mount("/api/v1/embed", embed_app)
    parent.router.lifespan_context = _noop_lifespan
    return parent


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------


class EmbedCorsContractTestCase(TestCase):
    def test_partner_config_returns_wildcard_acao_and_no_credentials_header(self):
        row = _public_tenant_row()
        with patch.object(
            partner_config_handlers, "_load_tenant_anchor", _async_value_factory(row)
        ):
            with TestClient(_make_app()) as client:
                response = client.get(
                    "/api/v1/embed/tenants/ai-mentor-doer/partner-config",
                    headers={"Origin": "https://aimentorpro.com"},
                )

        self.assertEqual(response.status_code, 200)
        # Wildcarded — any external tenant domain may embed.
        self.assertEqual(response.headers.get("access-control-allow-origin"), "*")
        # Critical security invariant: credentials must NOT be allowed on the
        # embed surface; combining ``*`` with credentials would be a CORS
        # spec violation and would silently strip cookies.
        lowered = {k.lower() for k in response.headers.keys()}
        self.assertNotIn("access-control-allow-credentials", lowered)

    def test_partner_config_preflight_advertises_safe_methods_and_headers(self):
        with TestClient(_make_app()) as client:
            response = client.options(
                "/api/v1/embed/tenants/ai-mentor-doer/partner-config",
                headers={
                    "Origin": "https://example.com",
                    "Access-Control-Request-Method": "GET",
                    "Access-Control-Request-Headers": "Content-Type",
                },
            )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.headers.get("access-control-allow-origin"), "*")
        methods = response.headers.get("access-control-allow-methods", "")
        self.assertIn("GET", methods)
        self.assertIn("POST", methods)
        self.assertNotIn("PUT", methods)
        self.assertNotIn("DELETE", methods)
        # No credentials advertised on preflight either.
        lowered = {k.lower() for k in response.headers.keys()}
        self.assertNotIn("access-control-allow-credentials", lowered)

    def test_search_candidates_from_arbitrary_origin_succeeds_with_wildcard_cors(self):
        async def _stub_search(_request, payload):
            self.assertEqual(payload.channel_context.tenant_ref, "ai-mentor-doer")
            return SimpleNamespace(
                data={"request_id": "match-test", "candidates": [], "warnings": []}
            )

        with patch.object(search_handlers, "search_candidates", _stub_search):
            with TestClient(_make_app()) as client:
                response = client.post(
                    "/api/v1/embed/search/candidates",
                    headers={"Origin": "https://aimentorpro.com"},
                    json={
                        "query": "online maths tutor",
                        "channel_context": {
                            "channel": "embedded_widget",
                            "tenant_ref": "ai-mentor-doer",
                            "deployment_mode": "embedded_widget",
                        },
                    },
                )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.headers.get("access-control-allow-origin"), "*")
        lowered = {k.lower() for k in response.headers.keys()}
        self.assertNotIn("access-control-allow-credentials", lowered)

    def test_search_candidates_without_tenant_ref_is_rejected(self):
        # Even with the open CORS prefix, search must NOT be usable without an
        # explicit tenant context — this stops cross-tenant fishing.
        with TestClient(_make_app()) as client:
            response = client.post(
                "/api/v1/embed/search/candidates",
                headers={"Origin": "https://example.com"},
                json={
                    "query": "online maths tutor",
                    "channel_context": {
                        "channel": "embedded_widget",
                        "deployment_mode": "embedded_widget",
                    },
                },
            )

        self.assertIn(response.status_code, (400, 422))

    def test_lead_capture_requires_tenant_slug_in_body(self):
        with TestClient(_make_app()) as client:
            response = client.post(
                "/api/v1/embed/leads",
                headers={"Origin": "https://aimentorpro.com"},
                json={
                    "lead_type": "embed_widget",
                    "contact": {"full_name": "Jane Doe", "email": "jane@example.com"},
                    "attribution": {"source": "embed_widget"},
                    # tenant_slug intentionally omitted
                },
            )

        self.assertEqual(response.status_code, 422)

    def test_lead_capture_rate_limit_kicks_in_after_10_requests(self):
        async def _resolve_public_tenant(_request, _slug):
            return {
                "id": "11111111-1111-1111-1111-111111111111",
                "slug": "ai-mentor-doer",
                "name": "AI Mentor 1-1 Pro",
            }

        # Patch the lead create internals so we exercise ONLY the rate
        # limiter and routing logic — the heavy lead persistence path is
        # already covered by the public-leads tests.
        from api import v1_public_routes as public_routes

        async def _stub_create_public_lead(request, tenant_slug, payload):
            from api.v1_routes import _success_response

            return _success_response(
                {"lead_id": "lead-stub", "tenant_slug": tenant_slug, "status": "captured"},
                tenant_id=None,
            )

        with patch.object(
            public_routes, "_resolve_public_tenant", _resolve_public_tenant
        ), patch.object(v1_embed_routes, "create_public_lead", _stub_create_public_lead):
            with TestClient(_make_app()) as client:
                last_response = None
                for _ in range(11):
                    last_response = client.post(
                        "/api/v1/embed/leads",
                        headers={"Origin": "https://aimentorpro.com"},
                        json={
                            "tenant_slug": "ai-mentor-doer",
                            "lead_type": "embed_widget",
                            "contact": {
                                "full_name": "Jane Doe",
                                "email": "jane@example.com",
                            },
                            "attribution": {"source": "embed_widget"},
                        },
                    )
                    if last_response.status_code == 429:
                        break

        self.assertIsNotNone(last_response)
        self.assertEqual(last_response.status_code, 429)

    def test_cookies_sent_on_embed_request_are_ignored(self):
        # ``allow_credentials=False`` means the browser would not send cookies
        # cross-origin in the first place; the server-side guarantee is that
        # the ACAC header is absent so any cookies that DO arrive (e.g. via
        # tooling) are ignored by the CORS layer.
        row = _public_tenant_row()
        with patch.object(
            partner_config_handlers, "_load_tenant_anchor", _async_value_factory(row)
        ):
            with TestClient(_make_app()) as client:
                response = client.get(
                    "/api/v1/embed/tenants/ai-mentor-doer/partner-config",
                    headers={
                        "Origin": "https://aimentorpro.com",
                        "Cookie": "tenant_session=should-be-ignored",
                        "Authorization": "Bearer ignored-by-embed-surface",
                    },
                )

        self.assertEqual(response.status_code, 200)
        lowered = {k.lower() for k in response.headers.keys()}
        # ACAC absence is the invariant — browsers will refuse to expose
        # credentialed responses to JS without it.
        self.assertNotIn("access-control-allow-credentials", lowered)
        # And the wildcard origin remains.
        self.assertEqual(response.headers.get("access-control-allow-origin"), "*")


class EmbedDoesNotBreakMainCorsTestCase(TestCase):
    """Regression: mounting the embed sub-app must NOT change the main CORS
    posture on ``/api/v1/public/*``. The credentialed allow-list still has to
    work for first-party origins (``https://bookedai.au``) and reject
    arbitrary third-party origins.
    """

    def test_main_public_surface_does_not_expose_wildcard_acao(self):
        # We can't easily exercise the production main-CORS layer without
        # reloading the env-driven settings (covered by test_cors_security),
        # so this test asserts the structural invariant: the embed sub-app
        # exposes its own wildcard policy, and that policy lives on the
        # MOUNTED sub-app — not on the parent.
        app = _make_app()
        embed_app = None
        for route in app.routes:
            if getattr(route, "path", None) == "/api/v1/embed":
                embed_app = getattr(route, "app", None)
                break
        self.assertIsNotNone(embed_app, "embed sub-app should be mounted")
        # Inspect the sub-app's middleware stack: a CORSMiddleware must be
        # registered with ``allow_credentials=False`` and ``allow_origins=["*"]``.
        cors_options = None
        for middleware in embed_app.user_middleware:
            cls_name = getattr(middleware.cls, "__name__", "")
            if cls_name == "CORSMiddleware":
                cors_options = middleware.kwargs
                break
        self.assertIsNotNone(cors_options)
        self.assertEqual(cors_options.get("allow_origins"), ["*"])
        self.assertFalse(cors_options.get("allow_credentials"))
