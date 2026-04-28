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
