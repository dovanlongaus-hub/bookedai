"""Tests for the per-tenant embed origin allow-list on POST endpoints
(Wave 10-A — body-peek primitive).

Wave 9-A enforced the allow-list at the partner-config GET gate only.
Production hardening extends enforcement to the two embed POST routes:

* ``POST /api/v1/embed/search/candidates`` — slug travels in
  ``body.channel_context.tenant_ref``.
* ``POST /api/v1/embed/leads`` — slug travels in ``body.tenant_slug``.

The middleware reads the request body (256KB cap) via the ASGI ``receive``
callable, parses it once, then replays the buffered chunks to the
downstream handler. The handler still reads the body normally. Body-peek
failures (parse error, missing field, oversize body) fail OPEN — the
handler emits its standard 422 envelope, which is more useful than a
generic middleware rejection.

Behaviour matrix:

* Empty / missing ``embed_origins`` → any origin allowed (legacy tenants).
* Non-empty + matching ``Origin`` → request passes, body reaches handler.
* Non-empty + mismatched ``Origin`` → 403 with ``embed_origin_not_allowed``.
* Body missing slug field → middleware passes through, handler 422s.
* Malformed JSON body → middleware passes through, handler 422s.
* Body > 256KB → middleware passes through (cap protects memory).
"""

from __future__ import annotations

import json
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
from api import v1_search_handlers as search_handlers  # noqa: E402
from api import v1_public_routes as public_routes  # noqa: E402
from api.v1_router import router as v1_router  # noqa: E402
from rate_limit import InMemoryRateLimiter  # noqa: E402


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


@asynccontextmanager
async def _noop_lifespan(_app):
    yield


def _make_app() -> FastAPI:
    """Mirror the production app composition: parent CORS + hygiene
    middleware + embed sub-app + allow-list middleware.
    """
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


def _stub_search_handler():
    """Returns a stand-in for ``search_handlers.search_candidates`` that
    records the parsed payload so the test can prove the body survived
    body-peek and reached the handler.
    """
    captured: dict[str, object] = {}

    async def _stub(request, payload):
        captured["payload"] = payload
        captured["query"] = payload.query
        captured["tenant_ref"] = payload.channel_context.tenant_ref
        return SimpleNamespace(
            data={"request_id": "match-stub", "candidates": [], "warnings": []}
        )

    return _stub, captured


def _stub_public_lead_create():
    """Stand-in for ``v1_embed_routes.create_public_lead``."""
    captured: dict[str, object] = {}

    async def _stub(request, tenant_slug, payload):
        from api.v1_routes import _success_response

        captured["tenant_slug"] = tenant_slug
        captured["lead_type"] = payload.lead_type
        return _success_response(
            {
                "lead_id": "lead-stub",
                "tenant_slug": tenant_slug,
                "status": "captured",
            },
            tenant_id=None,
        )

    return _stub, captured


# ---------------------------------------------------------------------------
# search/candidates POST enforcement
# ---------------------------------------------------------------------------


class EmbedSearchCandidatesAllowlistTestCase(TestCase):
    def setUp(self) -> None:
        bookedai_app_module._embed_origin_cache_clear()

    def tearDown(self) -> None:
        bookedai_app_module._embed_origin_cache_clear()

    def test_matching_origin_passes_and_handler_sees_body(self):
        origins_by_slug = {"ai-mentor-doer": ["https://aimentorpro.com"]}
        counter: dict[str, int] = {}
        stub_search, captured = _stub_search_handler()
        with patch.object(
            bookedai_app_module,
            "_load_tenant_embed_origins_from_db",
            _stub_db_loader(origins_by_slug, counter),
        ), patch.object(search_handlers, "search_candidates", stub_search):
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

        self.assertEqual(response.status_code, 200, response.text)
        # Proves body-peek replayed the chunks correctly — the handler saw
        # the same body the client sent.
        self.assertEqual(captured.get("query"), "online maths tutor")
        self.assertEqual(captured.get("tenant_ref"), "ai-mentor-doer")

    def test_mismatched_origin_rejects_403(self):
        origins_by_slug = {"ai-mentor-doer": ["https://aimentorpro.com"]}
        counter: dict[str, int] = {}
        stub_search, captured = _stub_search_handler()
        with patch.object(
            bookedai_app_module,
            "_load_tenant_embed_origins_from_db",
            _stub_db_loader(origins_by_slug, counter),
        ), patch.object(search_handlers, "search_candidates", stub_search):
            with TestClient(_make_app()) as client:
                response = client.post(
                    "/api/v1/embed/search/candidates",
                    headers={"Origin": "https://attacker.example.com"},
                    json={
                        "query": "online maths tutor",
                        "channel_context": {
                            "channel": "embedded_widget",
                            "tenant_ref": "ai-mentor-doer",
                            "deployment_mode": "embedded_widget",
                        },
                    },
                )

        self.assertEqual(response.status_code, 403)
        body = response.json()
        self.assertEqual(body["error"]["code"], "embed_origin_not_allowed")
        # Handler must not run on rejection.
        self.assertNotIn("query", captured)

    def test_empty_allowlist_allows_any_origin(self):
        origins_by_slug = {"ai-mentor-doer": []}
        counter: dict[str, int] = {}
        stub_search, captured = _stub_search_handler()
        with patch.object(
            bookedai_app_module,
            "_load_tenant_embed_origins_from_db",
            _stub_db_loader(origins_by_slug, counter),
        ), patch.object(search_handlers, "search_candidates", stub_search):
            with TestClient(_make_app()) as client:
                response = client.post(
                    "/api/v1/embed/search/candidates",
                    headers={"Origin": "https://random-stranger.example.com"},
                    json={
                        "query": "tax accountant",
                        "channel_context": {
                            "channel": "embedded_widget",
                            "tenant_ref": "ai-mentor-doer",
                            "deployment_mode": "embedded_widget",
                        },
                    },
                )

        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(captured.get("query"), "tax accountant")

    def test_missing_tenant_ref_passes_through_to_handler_422(self):
        # Body parse succeeds but ``tenant_ref`` is absent → middleware
        # CANNOT decide allow-list, so it falls through. The handler then
        # emits its own 422 (its built-in tenant_ref guard).
        origins_by_slug = {"ai-mentor-doer": ["https://aimentorpro.com"]}
        counter: dict[str, int] = {}
        with patch.object(
            bookedai_app_module,
            "_load_tenant_embed_origins_from_db",
            _stub_db_loader(origins_by_slug, counter),
        ):
            with TestClient(_make_app()) as client:
                response = client.post(
                    "/api/v1/embed/search/candidates",
                    headers={"Origin": "https://attacker.example.com"},
                    json={
                        "query": "missing tenant ref",
                        "channel_context": {
                            "channel": "embedded_widget",
                            "deployment_mode": "embedded_widget",
                        },
                    },
                )

        # Without a tenant_ref the embed handler refuses with 422 — origin
        # enforcement was correctly skipped because we could not identify
        # the tenant slug to look up.
        self.assertIn(response.status_code, (400, 422))

    def test_malformed_json_body_passes_through_to_handler(self):
        # Middleware MUST NOT crash on broken JSON — let FastAPI surface
        # its standard validation error.
        origins_by_slug = {"ai-mentor-doer": ["https://aimentorpro.com"]}
        counter: dict[str, int] = {}
        with patch.object(
            bookedai_app_module,
            "_load_tenant_embed_origins_from_db",
            _stub_db_loader(origins_by_slug, counter),
        ):
            with TestClient(_make_app()) as client:
                response = client.post(
                    "/api/v1/embed/search/candidates",
                    headers={
                        "Origin": "https://attacker.example.com",
                        "Content-Type": "application/json",
                    },
                    data=b"this-is-not-json",
                )

        # FastAPI rejects the broken body — but with 400/422, NOT a 403.
        # That proves the middleware passed through cleanly without crashing.
        self.assertIn(response.status_code, (400, 422))

    def test_oversize_body_passes_through_to_handler(self):
        # Build a body larger than the 256KB peek cap. The middleware's
        # ``_peek_request_body`` aborts buffering past the cap and returns
        # an empty body, which the slug extractor reads as "could not
        # decide" → fail open. The downstream handler still receives the
        # full streamed body via the replay + delegated receive.
        origins_by_slug = {"ai-mentor-doer": ["https://aimentorpro.com"]}
        counter: dict[str, int] = {}
        stub_search, captured = _stub_search_handler()
        # Add a large filler field on top of a valid envelope so JSON parse
        # would still succeed if the cap weren't applied. With the cap it
        # short-circuits and falls through.
        big_query = "x" * (300_000)
        payload = {
            "query": big_query,
            "channel_context": {
                "channel": "embedded_widget",
                "tenant_ref": "ai-mentor-doer",
                "deployment_mode": "embedded_widget",
            },
        }
        body_str = json.dumps(payload)
        self.assertGreater(len(body_str), 256_000)
        with patch.object(
            bookedai_app_module,
            "_load_tenant_embed_origins_from_db",
            _stub_db_loader(origins_by_slug, counter),
        ), patch.object(search_handlers, "search_candidates", stub_search):
            with TestClient(_make_app()) as client:
                response = client.post(
                    "/api/v1/embed/search/candidates",
                    headers={
                        # Mismatched origin: if the cap had NOT triggered
                        # fail-open we would expect a 403 here. Instead the
                        # handler runs (proving fail-open path worked).
                        "Origin": "https://attacker.example.com",
                        "Content-Type": "application/json",
                    },
                    data=body_str,
                )

        # Handler ran (200) — not a 403. Proves the cap-induced fail-open
        # delegated the full body to the handler.
        self.assertEqual(response.status_code, 200, response.text[:200])
        self.assertEqual(captured.get("tenant_ref"), "ai-mentor-doer")
        self.assertEqual(len(captured.get("query") or ""), len(big_query))


# ---------------------------------------------------------------------------
# leads POST enforcement
# ---------------------------------------------------------------------------


class EmbedLeadsAllowlistTestCase(TestCase):
    def setUp(self) -> None:
        bookedai_app_module._embed_origin_cache_clear()

    def tearDown(self) -> None:
        bookedai_app_module._embed_origin_cache_clear()

    def test_matching_origin_passes_and_handler_sees_body(self):
        origins_by_slug = {"ai-mentor-doer": ["https://aimentorpro.com"]}
        counter: dict[str, int] = {}
        stub_lead, captured = _stub_public_lead_create()
        with patch.object(
            bookedai_app_module,
            "_load_tenant_embed_origins_from_db",
            _stub_db_loader(origins_by_slug, counter),
        ), patch.object(v1_embed_routes, "create_public_lead", stub_lead):
            with TestClient(_make_app()) as client:
                response = client.post(
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

        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(captured.get("tenant_slug"), "ai-mentor-doer")
        self.assertEqual(captured.get("lead_type"), "embed_widget")

    def test_mismatched_origin_rejects_403(self):
        origins_by_slug = {"ai-mentor-doer": ["https://aimentorpro.com"]}
        counter: dict[str, int] = {}
        stub_lead, captured = _stub_public_lead_create()
        with patch.object(
            bookedai_app_module,
            "_load_tenant_embed_origins_from_db",
            _stub_db_loader(origins_by_slug, counter),
        ), patch.object(v1_embed_routes, "create_public_lead", stub_lead):
            with TestClient(_make_app()) as client:
                response = client.post(
                    "/api/v1/embed/leads",
                    headers={"Origin": "https://attacker.example.com"},
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

        self.assertEqual(response.status_code, 403)
        body = response.json()
        self.assertEqual(body["error"]["code"], "embed_origin_not_allowed")
        self.assertEqual(body["meta"]["version"], "v1")
        # Handler must not run on rejection.
        self.assertNotIn("tenant_slug", captured)

    def test_empty_body_passes_through_to_handler_422(self):
        # FastAPI's request validation triggers a 422 before the handler
        # body runs. Middleware MUST pass through rather than 403 — we have
        # no slug to look up.
        origins_by_slug = {"ai-mentor-doer": ["https://aimentorpro.com"]}
        counter: dict[str, int] = {}
        with patch.object(
            bookedai_app_module,
            "_load_tenant_embed_origins_from_db",
            _stub_db_loader(origins_by_slug, counter),
        ):
            with TestClient(_make_app()) as client:
                response = client.post(
                    "/api/v1/embed/leads",
                    headers={
                        "Origin": "https://attacker.example.com",
                        "Content-Type": "application/json",
                    },
                    data=b"",
                )

        self.assertIn(response.status_code, (400, 422))

    def test_missing_tenant_slug_passes_through_to_handler_422(self):
        origins_by_slug = {"ai-mentor-doer": ["https://aimentorpro.com"]}
        counter: dict[str, int] = {}
        with patch.object(
            bookedai_app_module,
            "_load_tenant_embed_origins_from_db",
            _stub_db_loader(origins_by_slug, counter),
        ):
            with TestClient(_make_app()) as client:
                response = client.post(
                    "/api/v1/embed/leads",
                    headers={"Origin": "https://attacker.example.com"},
                    json={
                        "lead_type": "embed_widget",
                        "contact": {
                            "full_name": "Jane Doe",
                            "email": "jane@example.com",
                        },
                        "attribution": {"source": "embed_widget"},
                        # tenant_slug intentionally absent
                    },
                )

        self.assertEqual(response.status_code, 422)

    def test_attribution_header_fallback_passes(self):
        # When the real ``Origin`` is missing (e.g. a server-to-server
        # preview), the explicit ``X-BookedAI-Embed-Origin`` self-attribution
        # header is honoured the same way the GET gate honours it.
        origins_by_slug = {"ai-mentor-doer": ["https://aimentorpro.com"]}
        counter: dict[str, int] = {}
        stub_lead, captured = _stub_public_lead_create()
        with patch.object(
            bookedai_app_module,
            "_load_tenant_embed_origins_from_db",
            _stub_db_loader(origins_by_slug, counter),
        ), patch.object(v1_embed_routes, "create_public_lead", stub_lead):
            with TestClient(_make_app()) as client:
                response = client.post(
                    "/api/v1/embed/leads",
                    headers={
                        "X-BookedAI-Embed-Origin": "https://aimentorpro.com",
                    },
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

        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(captured.get("tenant_slug"), "ai-mentor-doer")


# ---------------------------------------------------------------------------
# Body-peek primitive — direct unit tests
# ---------------------------------------------------------------------------


class PeekRequestBodyTestCase(TestCase):
    def test_peek_returns_full_body_and_replays_in_order(self):
        # Simulate a multi-chunk ASGI receive stream.
        async def _runner():
            messages = [
                {"type": "http.request", "body": b"hello", "more_body": True},
                {"type": "http.request", "body": b"-world", "more_body": False},
            ]
            queue: list = list(messages)

            async def _receive():
                return queue.pop(0)

            body, replay = await bookedai_app_module._peek_request_body(_receive)
            return body, [await replay(), await replay()]

        import asyncio

        body, replayed = asyncio.run(_runner())
        self.assertEqual(body, b"hello-world")
        # Replayed chunks match the original sequence so downstream reads
        # the same body byte-for-byte.
        self.assertEqual(replayed[0]["body"], b"hello")
        self.assertEqual(replayed[1]["body"], b"-world")

    def test_peek_caps_oversize_body(self):
        async def _runner():
            chunk = b"x" * 100_000
            queue = [
                {"type": "http.request", "body": chunk, "more_body": True},
                {"type": "http.request", "body": chunk, "more_body": True},
                {"type": "http.request", "body": chunk, "more_body": False},
            ]

            async def _receive():
                return queue.pop(0)

            body, _replay = await bookedai_app_module._peek_request_body(
                _receive, max_size=128_000
            )
            return body

        import asyncio

        body = asyncio.run(_runner())
        # Cap exceeded → fail-open path returns empty body so the slug
        # extractor cannot decide and the middleware passes through.
        self.assertEqual(body, b"")


# ---------------------------------------------------------------------------
# Slug extraction unit tests
# ---------------------------------------------------------------------------


class SlugExtractionTestCase(TestCase):
    def test_search_extracts_lowercase_tenant_ref(self):
        body = json.dumps(
            {
                "query": "x",
                "channel_context": {"tenant_ref": "AI-Mentor-Doer"},
            }
        ).encode("utf-8")
        self.assertEqual(
            bookedai_app_module._extract_search_tenant_ref(body),
            "ai-mentor-doer",
        )

    def test_search_returns_none_for_missing_field(self):
        body = json.dumps({"query": "x", "channel_context": {}}).encode("utf-8")
        self.assertIsNone(bookedai_app_module._extract_search_tenant_ref(body))

    def test_search_returns_none_for_malformed_json(self):
        self.assertIsNone(
            bookedai_app_module._extract_search_tenant_ref(b"not-json{}")
        )

    def test_search_returns_none_for_non_dict_root(self):
        body = json.dumps([1, 2, 3]).encode("utf-8")
        self.assertIsNone(bookedai_app_module._extract_search_tenant_ref(body))

    def test_lead_extracts_lowercase_tenant_slug(self):
        body = json.dumps({"tenant_slug": "AI-Mentor-Doer"}).encode("utf-8")
        self.assertEqual(
            bookedai_app_module._extract_lead_tenant_slug(body),
            "ai-mentor-doer",
        )

    def test_lead_returns_none_for_missing_field(self):
        body = json.dumps({"contact": {}}).encode("utf-8")
        self.assertIsNone(bookedai_app_module._extract_lead_tenant_slug(body))

    def test_lead_returns_none_for_empty_body(self):
        self.assertIsNone(bookedai_app_module._extract_lead_tenant_slug(b""))


# Touch unused import so static checkers don't whine about it.
_ = public_routes
