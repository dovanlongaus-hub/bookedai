from __future__ import annotations

from pathlib import Path
import sys
from types import SimpleNamespace
from unittest import IsolatedAsyncioTestCase
from unittest.mock import AsyncMock

from fastapi import FastAPI
from fastapi.testclient import TestClient


BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from api.admin_routes import router as admin_router
from service_layer.discord_service import DiscordPostResult


def create_test_app(discord_service) -> FastAPI:
    app = FastAPI()
    app.include_router(admin_router)
    app.state.session_factory = object()
    app.state.settings = SimpleNamespace(
        admin_api_token="test-admin-token",
        admin_username="admin",
    )
    app.state.discord_service = discord_service
    return app


class AdminDiscordHandoffRoutesTestCase(IsolatedAsyncioTestCase):
    async def test_admin_discord_handoff_posts_summary(self):
        discord_service = SimpleNamespace(
            send_handoff_summary=AsyncMock(
                return_value=DiscordPostResult(
                    status="sent",
                    message="Discord handoff was posted successfully.",
                )
            )
        )

        client = TestClient(create_test_app(discord_service))
        response = client.post(
            "/api/admin/reliability/handoff/discord",
            headers={"X-Admin-Token": "test-admin-token"},
            json={
                "title": "Reliability team update",
                "summary": "Summary: rollout checks complete.",
                "lane_label": "Config risk",
                "handoff_format": "discord",
            },
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.json(),
            {
                "status": "sent",
                "message": "Discord handoff was posted successfully.",
            },
        )
        discord_service.send_handoff_summary.assert_awaited_once_with(
            title="Reliability team update",
            body="Summary: rollout checks complete.",
            lane_label="Config risk",
            handoff_format="discord",
        )

    async def test_admin_discord_handoff_returns_bad_request_when_unconfigured(self):
        discord_service = SimpleNamespace(
            send_handoff_summary=AsyncMock(
                return_value=DiscordPostResult(
                    status="not_configured",
                    message="Discord webhook is not configured.",
                )
            )
        )

        client = TestClient(create_test_app(discord_service))
        response = client.post(
            "/api/admin/reliability/handoff/discord",
            headers={"X-Admin-Token": "test-admin-token"},
            json={
                "title": "Reliability team update",
                "summary": "Summary: rollout checks complete.",
            },
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json()["detail"], "Discord webhook is not configured.")
