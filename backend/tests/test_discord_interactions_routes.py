from __future__ import annotations

from pathlib import Path
import sys
from types import SimpleNamespace
from unittest import TestCase
from unittest.mock import AsyncMock

from fastapi import FastAPI
from fastapi.testclient import TestClient


BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from api.discord_routes import router as discord_router


def create_test_app(discord_bot_service) -> FastAPI:
    app = FastAPI()
    app.include_router(discord_router)
    app.state.discord_bot_service = discord_bot_service
    app.state.booking_assistant_service = SimpleNamespace()
    app.state.openai_service = SimpleNamespace()
    return app


class DiscordInteractionsRoutesTestCase(TestCase):
    def test_discord_interactions_reject_invalid_signature(self):
        discord_bot_service = SimpleNamespace(
            verify_interaction=lambda **_: (_ for _ in ()).throw(
                ValueError("Invalid Discord interaction signature.")
            ),
            handle_interaction=AsyncMock(),
        )
        client = TestClient(create_test_app(discord_bot_service))

        response = client.post(
            "/api/discord/interactions",
            data='{"type":1}',
            headers={"Content-Type": "application/json"},
        )

        self.assertEqual(response.status_code, 401)
        self.assertEqual(response.json()["detail"], "Invalid Discord interaction signature.")

    def test_discord_interactions_dispatch_ping_payload(self):
        discord_bot_service = SimpleNamespace(
            verify_interaction=lambda **_: None,
            handle_interaction=AsyncMock(return_value={"type": 1}),
        )
        client = TestClient(create_test_app(discord_bot_service))

        response = client.post(
            "/api/discord/interactions",
            data='{"type":1}',
            headers={
                "Content-Type": "application/json",
                "X-Signature-Ed25519": "signature",
                "X-Signature-Timestamp": "timestamp",
            },
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"type": 1})
        discord_bot_service.handle_interaction.assert_awaited_once()
