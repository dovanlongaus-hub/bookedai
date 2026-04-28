"""Tests for the per-tenant embed origin allow-list (Wave 8-A follow-up).

The allow-list extends Wave 8-A's open ``Access-Control-Allow-Origin: *``
posture so ops can lock individual tenants down to specific external
origins. The behaviour matrix:

* Empty / missing ``embed_origins`` (legacy tenants) → any origin allowed
  (backward compat with Wave 8-A).
* Non-empty ``embed_origins`` + matching ``Origin`` header → request passes.
* Non-empty ``embed_origins`` + missing or non-matching ``Origin`` →
  middleware short-circuits with a structured 403 envelope.

The allow-list is enforced on ``GET /api/v1/embed/tenants/{slug}/partner-config``
only — POST routes (search, leads) inherit by client cooperation; see
``app.EmbedOriginAllowlistMiddleware`` docstring and the multi-tenant plugin
widget doc for the body-peek deferral rationale.
"""

from __future__ import annotations

import sys
from contextlib import asynccontextmanager
from pathlib import Path
from types import SimpleNamespace
from unittest import TestCase
from unittest.mock import patch

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.testclient import TestClient


BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

import app as bookedai_app_module  # noqa: E402
from api import v1_embed_routes  # noqa: E402
from api import v1_public_tenant_config_handlers as partner_config_handlers  # noqa: E402
from api.v1_router import router as v1_router  # noqa: E402
from rate_limit import InMemoryRateLimiter  # noqa: E402
from service_layer.tenant_partner_config_service import (  # noqa: E402
    PartnerConfigPayload,
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _async_value_factory(value):
    async def _inner(*_args, **_kwargs):
        return value

    return _inner


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
    """Build a parent FastAPI app that mirrors the production composition."""
    parent = FastAPI()
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
    parent.state.openai_service = SimpleNamespace()
    parent.state.semantic_search_service = None

    embed_app = v1_embed_routes.build_embed_app(parent)
    embed_app.add_middleware(
        bookedai_app_module.EmbedOriginAllowlistMiddleware, parent_app=parent
    )
    parent.mount("/api/v1/embed", embed_app)
    parent.router.lifespan_context = _noop_lifespan
    return parent


def _stub_db_loader(origins_by_slug: dict[str, list[str]], counter: dict[str, int]):
    async def _loader(_session_factory, slug: str) -> list[str]:
        counter[slug] = counter.get(slug, 0) + 1
        return list(origins_by_slug.get(slug, []))

    return _loader


# ---------------------------------------------------------------------------
# Allow-list enforcement tests
# ---------------------------------------------------------------------------


class EmbedOriginAllowlistTestCase(TestCase):
    def setUp(self) -> None:
        bookedai_app_module._embed_origin_cache_clear()

    def tearDown(self) -> None:
        bookedai_app_module._embed_origin_cache_clear()

    # ── Backward compat ──────────────────────────────────────────────────────
    def test_empty_allowlist_allows_any_origin(self):
        row = _public_tenant_row()
        counter: dict[str, int] = {}
        origins_by_slug: dict[str, list[str]] = {"ai-mentor-doer": []}
        with patch.object(
            partner_config_handlers, "_load_tenant_anchor", _async_value_factory(row)
        ), patch.object(
            bookedai_app_module,
            "_load_tenant_embed_origins_from_db",
            _stub_db_loader(origins_by_slug, counter),
        ):
            with TestClient(_make_app()) as client:
                response = client.get(
                    "/api/v1/embed/tenants/ai-mentor-doer/partner-config",
                    headers={"Origin": "https://random-stranger.example.com"},
                )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.headers.get("access-control-allow-origin"), "*"
        )

    # ── Single-origin happy path ────────────────────────────────────────────
    def test_single_origin_allowlist_with_matching_origin_passes(self):
        row = _public_tenant_row()
        counter: dict[str, int] = {}
        origins_by_slug = {"ai-mentor-doer": ["https://aimentorpro.com"]}
        with patch.object(
            partner_config_handlers, "_load_tenant_anchor", _async_value_factory(row)
        ), patch.object(
            bookedai_app_module,
            "_load_tenant_embed_origins_from_db",
            _stub_db_loader(origins_by_slug, counter),
        ):
            with TestClient(_make_app()) as client:
                response = client.get(
                    "/api/v1/embed/tenants/ai-mentor-doer/partner-config",
                    headers={"Origin": "https://aimentorpro.com"},
                )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["status"], "ok")

    # ── Single-origin reject ────────────────────────────────────────────────
    def test_single_origin_allowlist_with_mismatched_origin_rejects_403(self):
        row = _public_tenant_row()
        counter: dict[str, int] = {}
        origins_by_slug = {"ai-mentor-doer": ["https://aimentorpro.com"]}
        with patch.object(
            partner_config_handlers, "_load_tenant_anchor", _async_value_factory(row)
        ), patch.object(
            bookedai_app_module,
            "_load_tenant_embed_origins_from_db",
            _stub_db_loader(origins_by_slug, counter),
        ):
            with TestClient(_make_app()) as client:
                response = client.get(
                    "/api/v1/embed/tenants/ai-mentor-doer/partner-config",
                    headers={"Origin": "https://attacker.example.com"},
                )

        self.assertEqual(response.status_code, 403)
        body = response.json()
        self.assertEqual(body["status"], "error")
        self.assertEqual(body["error"]["code"], "embed_origin_not_allowed")
        self.assertEqual(body["meta"]["version"], "v1")
        # Verify the ops-facing message stays user-friendly.
        self.assertIn("not permitted", body["error"]["message"].lower())

    def test_missing_origin_header_with_non_empty_allowlist_rejects_403(self):
        row = _public_tenant_row()
        counter: dict[str, int] = {}
        origins_by_slug = {"ai-mentor-doer": ["https://aimentorpro.com"]}
        with patch.object(
            partner_config_handlers, "_load_tenant_anchor", _async_value_factory(row)
        ), patch.object(
            bookedai_app_module,
            "_load_tenant_embed_origins_from_db",
            _stub_db_loader(origins_by_slug, counter),
        ):
            with TestClient(_make_app()) as client:
                response = client.get(
                    "/api/v1/embed/tenants/ai-mentor-doer/partner-config",
                )

        self.assertEqual(response.status_code, 403)
        self.assertEqual(
            response.json()["error"]["code"], "embed_origin_not_allowed"
        )

    # ── Multi-origin happy paths ────────────────────────────────────────────
    def test_multi_origin_allowlist_each_entry_passes(self):
        row = _public_tenant_row()
        counter: dict[str, int] = {}
        origins_by_slug = {
            "ai-mentor-doer": [
                "https://aimentorpro.com",
                "https://aimentor.au",
                "https://app.aimentor.au",
            ]
        }
        with patch.object(
            partner_config_handlers, "_load_tenant_anchor", _async_value_factory(row)
        ), patch.object(
            bookedai_app_module,
            "_load_tenant_embed_origins_from_db",
            _stub_db_loader(origins_by_slug, counter),
        ):
            with TestClient(_make_app()) as client:
                for origin in origins_by_slug["ai-mentor-doer"]:
                    response = client.get(
                        "/api/v1/embed/tenants/ai-mentor-doer/partner-config",
                        headers={"Origin": origin},
                    )
                    self.assertEqual(
                        response.status_code,
                        200,
                        f"Origin {origin} should be allowed: {response.text}",
                    )

    # ── Origin attribution fallback header ──────────────────────────────────
    def test_origin_falls_back_to_attribution_header(self):
        row = _public_tenant_row()
        counter: dict[str, int] = {}
        origins_by_slug = {"ai-mentor-doer": ["https://aimentorpro.com"]}
        with patch.object(
            partner_config_handlers, "_load_tenant_anchor", _async_value_factory(row)
        ), patch.object(
            bookedai_app_module,
            "_load_tenant_embed_origins_from_db",
            _stub_db_loader(origins_by_slug, counter),
        ):
            with TestClient(_make_app()) as client:
                response = client.get(
                    "/api/v1/embed/tenants/ai-mentor-doer/partner-config",
                    headers={
                        # No real Origin (e.g. server-to-server preview). The
                        # explicit attribution header is honoured as a fallback.
                        "X-BookedAI-Embed-Origin": "https://aimentorpro.com",
                    },
                )

        self.assertEqual(response.status_code, 200)

    # ── Cache TTL: only one DB lookup per slug per window ───────────────────
    def test_cache_short_circuits_repeat_lookups(self):
        row = _public_tenant_row()
        counter: dict[str, int] = {}
        origins_by_slug = {"ai-mentor-doer": ["https://aimentorpro.com"]}
        with patch.object(
            partner_config_handlers, "_load_tenant_anchor", _async_value_factory(row)
        ), patch.object(
            bookedai_app_module,
            "_load_tenant_embed_origins_from_db",
            _stub_db_loader(origins_by_slug, counter),
        ):
            with TestClient(_make_app()) as client:
                for _ in range(5):
                    response = client.get(
                        "/api/v1/embed/tenants/ai-mentor-doer/partner-config",
                        headers={"Origin": "https://aimentorpro.com"},
                    )
                    self.assertEqual(response.status_code, 200)

        self.assertEqual(
            counter.get("ai-mentor-doer"),
            1,
            "Allow-list lookup should hit the database at most once per TTL window.",
        )


# ---------------------------------------------------------------------------
# Pydantic validation tests
# ---------------------------------------------------------------------------


class EmbedOriginsPydanticValidationTestCase(TestCase):
    _BASE_BODY: dict = {
        "brand": {"name": "AI Mentor 1-1 Pro", "accent_color": "#0071e3"},
        "hero": {"h1": "Book your AI mentorship today."},
    }

    def _payload(self, **overrides) -> dict:
        body = dict(self._BASE_BODY)
        body.update(overrides)
        return body

    def test_wildcard_origin_is_rejected(self):
        with self.assertRaises(Exception) as ctx:
            PartnerConfigPayload.model_validate(
                self._payload(embed_origins=["*"])
            )
        self.assertIn("embed_origins", str(ctx.exception))

    def test_javascript_scheme_is_rejected(self):
        with self.assertRaises(Exception):
            PartnerConfigPayload.model_validate(
                self._payload(embed_origins=["javascript:alert(1)"])
            )

    def test_data_scheme_is_rejected(self):
        with self.assertRaises(Exception):
            PartnerConfigPayload.model_validate(
                self._payload(embed_origins=["data:text/html,<script>"])
            )

    def test_null_string_is_rejected(self):
        with self.assertRaises(Exception):
            PartnerConfigPayload.model_validate(
                self._payload(embed_origins=["null"])
            )

    def test_bare_hostname_is_rejected(self):
        with self.assertRaises(Exception):
            PartnerConfigPayload.model_validate(
                self._payload(embed_origins=["aimentorpro.com"])
            )

    def test_http_non_loopback_is_rejected(self):
        with self.assertRaises(Exception):
            PartnerConfigPayload.model_validate(
                self._payload(embed_origins=["http://aimentorpro.com"])
            )

    def test_https_origin_is_accepted(self):
        validated = PartnerConfigPayload.model_validate(
            self._payload(embed_origins=["https://aimentorpro.com"])
        )
        self.assertEqual(validated.embed_origins, ["https://aimentorpro.com"])

    def test_http_localhost_is_accepted_for_dev(self):
        validated = PartnerConfigPayload.model_validate(
            self._payload(embed_origins=["http://localhost:5173"])
        )
        self.assertEqual(validated.embed_origins, ["http://localhost:5173"])

    def test_origin_path_is_rejected(self):
        with self.assertRaises(Exception):
            PartnerConfigPayload.model_validate(
                self._payload(embed_origins=["https://aimentorpro.com/widget"])
            )

    def test_duplicate_entries_are_collapsed(self):
        validated = PartnerConfigPayload.model_validate(
            self._payload(
                embed_origins=[
                    "https://aimentorpro.com",
                    "https://aimentorpro.com",
                    "https://aimentor.au",
                ]
            )
        )
        self.assertEqual(
            validated.embed_origins,
            ["https://aimentorpro.com", "https://aimentor.au"],
        )

    def test_empty_list_is_preserved_as_empty(self):
        validated = PartnerConfigPayload.model_validate(
            self._payload(embed_origins=[])
        )
        self.assertEqual(validated.embed_origins, [])

    def test_none_embed_origins_is_preserved(self):
        validated = PartnerConfigPayload.model_validate(self._payload())
        self.assertIsNone(validated.embed_origins)
