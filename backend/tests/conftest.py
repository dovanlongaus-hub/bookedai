from __future__ import annotations

import os
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


def _current_app_module():
    """Return the LIVE ``app`` module from ``sys.modules``.

    ``test_cors_security`` uses ``importlib.reload`` to swap the ``app``,
    ``config``, and ``api.route_handlers`` modules in-place. After that
    test, the ``app_module`` Python local captured at conftest import time
    becomes a STALE reference — its ``.app`` attribute is the old FastAPI
    instance, while ``sys.modules["app"]`` is the freshly reloaded one.
    Tests using the ``client`` fixture (``test_api_v1_contract``) end up
    talking to the stale app while monkeypatches target the live module.

    Re-fetching here means every fixture / test sees whichever module is
    currently registered in ``sys.modules``.
    """

    return sys.modules.get("app", app_module)


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

        live_app = _current_app_module().app
        existing = getattr(live_app.state, "rate_limiter", None)
        if existing is not None and hasattr(existing, "reset"):
            existing.reset()
        else:
            live_app.state.rate_limiter = InMemoryRateLimiter()
    except Exception:
        pass
    yield


# Environment variables that test cases mutate via raw ``os.environ`` writes
# (or via ``importlib.reload`` paths that bake env into module-level config
# snapshots). These leak between test files because no monkeypatch frame
# restores them — the assignment lives directly on ``os.environ``.
#
# The list intentionally enumerates the keys we have OBSERVED tests touching;
# adding to it is cheap and only restores values that existed at session
# start, so it cannot mask a test that legitimately wants the env var set.
_ENV_VARS_TO_RESTORE = (
    "BOOKEDAI_ENVIRONMENT",
    "ENVIRONMENT",
    "CORS_ALLOW_ORIGINS",
    "WHATSAPP_META_APP_SECRET",
    "WHATSAPP_META_SIGNATURE_STRICT",
    "WHATSAPP_EVOLUTION_WEBHOOK_SECRET",
    "ADMIN_PASSWORD_HASH",
    "ADMIN_PASSWORD",
    "BOOKEDAI_PORTAL_TOKEN_STRICT",
    "BOOKEDAI_AI_DAILY_CALL_BUDGET",
    "BOOKEDAI_AI_DAILY_TOKEN_BUDGET",
    "BOOKEDAI_AI_RATE_PER_MINUTE",
    "BOOKEDAI_ENABLE_HOST_SHELL",
    "BOOKEDAI_CUSTOMER_TELEGRAM_BOT_TOKEN",
    "BOOKEDAI_CUSTOMER_TELEGRAM_WEBHOOK_SECRET_TOKEN",
    "BOOKEDAI_TELEGRAM_TRUSTED_USER_IDS",
    "BOOKEDAI_MESSAGING_PER_CHAT_LIMIT",
    "BOOKEDAI_MESSAGING_PER_CHAT_WINDOW_SECONDS",
)


@pytest.fixture(autouse=True)
def _restore_known_env_vars():
    """Snapshot/restore env vars that some tests mutate without monkeypatch.

    A few test files (notably the security wave around P1-S1/S2/S3) call
    ``importlib.reload`` after writing env directly. When the reload path
    raises before tearing the env back down, subsequent tests inherit a
    polluted ``os.environ``. This fixture pins the baseline values seen
    BEFORE the test, then restores them on teardown.
    """

    saved = {key: os.environ.get(key) for key in _ENV_VARS_TO_RESTORE}
    try:
        yield
    finally:
        for key, original in saved.items():
            if original is None:
                os.environ.pop(key, None)
            else:
                os.environ[key] = original


# Snapshot of keys present on the canonical ``app_module.app.state`` at
# conftest import time. ``starlette.datastructures.State`` stores its
# attributes inside a private ``_state`` dict (NOT on ``__dict__``), so we
# read directly from it. Tests that bolt new keys onto the SHARED app
# (notably the ``test_app`` / ``client`` fixtures, which set
# ``session_factory`` and ``email_service``) would otherwise leak those
# attributes into later test files. We restore the snapshot on teardown so
# every test starts from the same baseline.
def _state_dict(state) -> dict | None:
    inner = getattr(state, "_state", None)
    if isinstance(inner, dict):
        return inner
    return None


_baseline_inner = _state_dict(app_module.app.state)
_BASELINE_APP_STATE_KEYS: frozenset[str] = frozenset(
    _baseline_inner.keys() if _baseline_inner is not None else ()
)


@pytest.fixture(autouse=True)
def _reset_shared_app_state():
    """Strip ad-hoc ``app.state`` attributes injected by previous tests.

    The ``client`` / ``test_app`` fixtures bind ``session_factory``,
    ``email_service``, and (via ``_reset_app_state_rate_limiter``) a
    ``rate_limiter`` onto ``app_module.app.state``. Without this guard,
    those attributes survive across test files — so a later test that
    expects ``app.state.session_factory`` to be unset (e.g. relying on
    its absence to short-circuit a code path) sees a stale ``object()``
    instead.

    We don't try to "deep-restore" — we just remove keys that weren't on
    the original baseline. Re-binds inside the same test happen via the
    standard ``app.state.X = ...`` assignment and are unaffected.
    """

    yield
    try:
        live_app = _current_app_module().app
        inner = _state_dict(live_app.state)
        if inner is None:
            return
        # Drop everything injected by this test that wasn't part of the
        # original baseline. Iterate over a copy so we can mutate safely.
        for key in list(inner.keys()):
            if key not in _BASELINE_APP_STATE_KEYS:
                inner.pop(key, None)
    except Exception:
        pass


@pytest.fixture()
def test_app():
    app = _current_app_module().app
    app.router.lifespan_context = _noop_lifespan
    app.state.session_factory = object()
    app.state.email_service = FakeEmailService()
    return app


@pytest.fixture()
def client(test_app):
    with TestClient(test_app) as test_client:
        yield test_client
