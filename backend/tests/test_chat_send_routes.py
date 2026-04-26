from __future__ import annotations

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

from api.route_handlers import api
from schemas import BookingAssistantChatResponse


async def _async_noop(*_args, **_kwargs):
    return None


class _FakeBookingAssistantService:
    async def chat(self, **kwargs):
        return BookingAssistantChatResponse(
            status="ok",
            reply=f"AI Engine reply for {kwargs.get('message')}",
            matched_services=[],
            matched_events=[],
            suggested_service_id=None,
            should_request_location=False,
        )


def create_test_app() -> FastAPI:
    app = FastAPI()
    app.include_router(api)
    app.state.session_factory = object()
    app.state.settings = SimpleNamespace(
        booking_chat_rate_limit_requests=10,
        booking_chat_rate_limit_window_seconds=60,
    )
    app.state.booking_assistant_service = _FakeBookingAssistantService()
    app.state.openai_service = SimpleNamespace()
    return app


class ChatSendRoutesTestCase(TestCase):
    def test_chat_send_routes_website_ui_to_bookedai_ai_engine(self):
        async def _load_active_service_catalog(_request):
            return []

        with patch("api.route_handlers.enforce_rate_limit", _async_noop), patch(
            "api.route_handlers.load_active_service_catalog",
            _load_active_service_catalog,
        ):
            client = TestClient(create_test_app())
            response = client.post(
                "/api/chat/send",
                json={
                    "message": "Find a swimming class near me",
                    "conversation": [{"role": "user", "content": "Find a swimming class near me"}],
                },
            )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["status"], "ok")
        self.assertEqual(payload["reply"], "AI Engine reply for Find a swimming class near me")
        self.assertEqual(payload["matched_services"], [])
