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
