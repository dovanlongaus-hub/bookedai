"""Admin AI cost-status endpoint smoke tests."""

from __future__ import annotations

from pathlib import Path
import sys
from types import SimpleNamespace
from unittest import TestCase

from fastapi import FastAPI
from fastapi.testclient import TestClient


BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from api.admin_routes import router as admin_router
from core.ai_cost_breaker import get_breaker, reset_breaker_for_tests


def create_test_app() -> FastAPI:
    app = FastAPI()
    app.include_router(admin_router)
    app.state.session_factory = object()
    app.state.settings = SimpleNamespace(
        admin_api_token="test-admin-token",
        admin_username="admin",
    )
    return app


class AdminAICostStatusRouteTestCase(TestCase):
    def setUp(self) -> None:
        reset_breaker_for_tests()

    def test_returns_counters_with_admin_token(self):
        # Touch the breaker so we have a non-zero snapshot.
        get_breaker().record_call(tokens_in=42, tokens_out=58)

        client = TestClient(create_test_app())
        response = client.get(
            "/api/admin/ai/cost-status",
            headers={"X-Admin-Token": "test-admin-token"},
        )
        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual(body["status"], "ok")
        cost = body["ai_cost"]
        self.assertIn("today_calls", cost)
        self.assertIn("today_tokens", cost)
        self.assertIn("last_minute_calls", cost)
        self.assertIn("daily_call_budget", cost)
        self.assertIn("daily_token_budget", cost)
        self.assertIn("breaker_open", cost)
        self.assertGreaterEqual(cost["today_calls"], 1)
        self.assertGreaterEqual(cost["today_tokens"], 100)

    def test_unauthorized_without_admin_token(self):
        client = TestClient(create_test_app())
        response = client.get("/api/admin/ai/cost-status")
        self.assertEqual(response.status_code, 401)

    def test_rejects_wrong_token(self):
        client = TestClient(create_test_app())
        response = client.get(
            "/api/admin/ai/cost-status",
            headers={"X-Admin-Token": "wrong-token"},
        )
        self.assertEqual(response.status_code, 401)
