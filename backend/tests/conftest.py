from __future__ import annotations

import sys
from contextlib import asynccontextmanager
from pathlib import Path

import pytest
from fastapi.testclient import TestClient


ROOT_DIR = Path(__file__).resolve().parents[2]
BACKEND_DIR = ROOT_DIR / "backend"

if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

import app as app_module  # noqa: E402


class FakeEmailService:
    def smtp_configured(self) -> bool:
        return False

    async def send_email(self, **_: object) -> None:
        raise AssertionError("send_email should not be called when SMTP is disabled")


@asynccontextmanager
async def _noop_lifespan(_: object):
    yield


@pytest.fixture(autouse=True)
def _reset_messaging_per_chat_limiter():
    """Per-test reset of the in-memory messaging rate limiter.

    The shared (channel, chat_id) bucket persists for the life of the
    interpreter, so back-to-back tests that reuse the same chat_id (e.g.
    Telegram chat 123456 across 61 webhook tests) would otherwise trip the
    30/hr guardrail and silently drop the inbound message.
    """

    try:
        from service_layer.messaging_automation_service import (
            _messaging_per_chat_limiter,
        )

        _messaging_per_chat_limiter.reset()
    except Exception:
        pass
    yield


@pytest.fixture(autouse=True)
def _reset_ai_cost_breaker():
    """Per-test reset of the in-process AI cost circuit breaker."""

    try:
        from core.ai_cost_breaker import get_breaker

        get_breaker().reset()
    except Exception:
        pass
    yield


@pytest.fixture(autouse=True)
def _reset_embed_origin_cache():
    """Per-test reset of the Wave 9-A embed-origin allow-list cache.

    The cache is a process-local dict with a 60s TTL. Across a long pytest
    run, entries seeded by `test_v1_embed_*` tests bleed into later tests,
    making subsequent slug lookups short-circuit on stale data instead of
    hitting the per-test fake session_factory.
    """

    try:
        from app import _embed_origin_cache_clear

        _embed_origin_cache_clear()
    except Exception:
        pass
    yield


@pytest.fixture(autouse=True)
def _reset_sandbox_session_store():
    """Per-test reset of the Wave 9-B in-memory sandbox session store.

    Sessions persist for 24h by default; without a per-test reset the
    `test_v1_sandbox_routes` ids accumulate and the per-process MAX cap
    can be approached during full-suite runs.
    """

    try:
        from core.sandbox_store import sandbox_session_store

        sandbox_session_store.reset_for_tests()
    except Exception:
        pass
    yield


@pytest.fixture(autouse=True)
def _reset_public_stats_cache():
    """Per-test reset of the public stats 30s TTL cache.

    Without this, the first test that hits `/api/v1/public/stats/bookings`
    populates `_cache_state["payload"]`, and subsequent tests that expect
    a fresh DB query (or a different fake session_factory) see the stale
    payload instead.
    """

    try:
        from api.v1_public_stats_handlers import reset_public_stats_cache

        reset_public_stats_cache()
    except Exception:
        pass
    yield


@pytest.fixture(autouse=True)
def _reset_app_state_rate_limiter():
    """Per-test reset of the shared `app.state.rate_limiter` buckets.

    Each test file binds a fresh `InMemoryRateLimiter()` to `app_module.app`,
    but tests that don't re-bind inherit a previous file's limiter with
    consumed buckets — causing late-suite tests to silently 429. Reset to a
    fresh limiter (or `.reset()` if already present) before every test.
    """

    try:
        from rate_limit import InMemoryRateLimiter

        existing = getattr(app_module.app.state, "rate_limiter", None)
        if existing is not None and hasattr(existing, "reset"):
            existing.reset()
        else:
            app_module.app.state.rate_limiter = InMemoryRateLimiter()
    except Exception:
        pass
    yield


@pytest.fixture()
def test_app():
    app = app_module.app
    app.router.lifespan_context = _noop_lifespan
    app.state.session_factory = object()
    app.state.email_service = FakeEmailService()
    return app


@pytest.fixture()
def client(test_app):
    with TestClient(test_app) as test_client:
        yield test_client
