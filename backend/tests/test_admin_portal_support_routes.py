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

from api.admin_routes import router as admin_router


def create_test_app() -> FastAPI:
    app = FastAPI()
    app.include_router(admin_router)
    app.state.session_factory = object()
    app.state.settings = SimpleNamespace(
        admin_api_token="test-admin-token",
        admin_username="info@bookedai.au",
        admin_password="secret",
        admin_session_ttl_hours=8,
    )
    return app


@asynccontextmanager
async def _fake_get_session(_session_factory):
    class _FakeSession:
        async def commit(self):
            return None

    yield _FakeSession()


class AdminPortalSupportRouteTests(TestCase):
    def test_admin_portal_support_action_returns_success_envelope(self):
        async def _apply_admin_portal_support_action(*_args, **_kwargs):
            return {
                "status": "ok",
                "request_id": 14,
                "action": "reviewed",
                "message": "Portal support request marked as reviewed.",
            }

        with patch("api.route_handlers.get_session", _fake_get_session), patch(
            "api.route_handlers.apply_admin_portal_support_action",
            _apply_admin_portal_support_action,
        ):
            client = TestClient(create_test_app())
            response = client.post(
                "/api/admin/portal-support/14/reviewed",
                json={"note": "Checked"},
                headers={"X-Admin-Token": "test-admin-token"},
            )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["status"], "ok")
        self.assertEqual(payload["request_id"], 14)
        self.assertEqual(payload["action"], "reviewed")

    def test_admin_portal_support_action_returns_not_found(self):
        async def _apply_admin_portal_support_action(*_args, **_kwargs):
            raise LookupError("Portal support request was not found")

        with patch("api.route_handlers.get_session", _fake_get_session), patch(
            "api.route_handlers.apply_admin_portal_support_action",
            _apply_admin_portal_support_action,
        ):
            client = TestClient(create_test_app())
            response = client.post(
                "/api/admin/portal-support/88/escalated",
                json={"note": "Need billing review"},
                headers={"X-Admin-Token": "test-admin-token"},
            )

        self.assertEqual(response.status_code, 404)
        self.assertEqual(response.json()["detail"], "Portal support request was not found")
