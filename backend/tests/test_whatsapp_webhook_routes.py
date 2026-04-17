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

from api.route_handlers import api


class _FakeExecuteResult:
    def __init__(self, value=None):
        self._value = value

    def scalar_one_or_none(self):
        return self._value

    def mappings(self):
        return SimpleNamespace(
            first=lambda: self._value,
            all=lambda: [] if self._value is None else [self._value],
        )


async def _fake_execute(*_args, **_kwargs):
    return _FakeExecuteResult()


def create_test_app() -> FastAPI:
    app = FastAPI()
    app.include_router(api)
    app.state.session_factory = object()
    app.state.settings = SimpleNamespace(
        whatsapp_verify_token="verify-whatsapp-token",
    )
    return app


@asynccontextmanager
async def _fake_get_session(_session_factory):
    yield SimpleNamespace(execute=_fake_execute)


class WhatsAppWebhookRoutesTestCase(TestCase):
    def test_meta_whatsapp_verify_returns_challenge(self):
        client = TestClient(create_test_app())

        response = client.get(
            "/api/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=verify-whatsapp-token&hub.challenge=12345"
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.text, "12345")

    def test_twilio_whatsapp_webhook_logs_inbound_message(self):
        captured_calls: list[dict[str, object]] = []

        async def _store_event(_session, **kwargs):
            captured_calls.append(kwargs)

        with patch("api.route_handlers.get_session", _fake_get_session), patch(
            "api.route_handlers.store_event",
            _store_event,
        ):
            client = TestClient(create_test_app())
            response = client.post(
                "/api/webhooks/whatsapp",
                data={
                    "Body": "Need to move my booking to tomorrow",
                    "From": "whatsapp:+61455301335",
                    "To": "whatsapp:+14155238886",
                    "ProfileName": "Long",
                    "MessageSid": "SM123",
                    "WaId": "61455301335",
                },
            )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["messages_processed"], 1)
        self.assertEqual(len(captured_calls), 1)
        payload = captured_calls[0]
        self.assertEqual(payload["source"], "whatsapp")
        self.assertEqual(payload["event_type"], "whatsapp_inbound")
        self.assertEqual(payload["workflow_status"], "received")
        self.assertEqual(payload["metadata"]["provider"], "twilio")
        self.assertEqual(payload["metadata"]["sender_phone"], "+61455301335")
        self.assertEqual(payload["message"].sender_name, "Long")
        self.assertEqual(payload["message"].message_id, "SM123")
        self.assertEqual(payload["message"].text, "Need to move my booking to tomorrow")

    def test_meta_whatsapp_webhook_logs_inbound_message(self):
        captured_calls: list[dict[str, object]] = []

        async def _store_event(_session, **kwargs):
            captured_calls.append(kwargs)

        with patch("api.route_handlers.get_session", _fake_get_session), patch(
            "api.route_handlers.store_event",
            _store_event,
        ):
            client = TestClient(create_test_app())
            response = client.post(
                "/api/webhooks/whatsapp",
                json={
                    "entry": [
                        {
                            "changes": [
                                {
                                    "value": {
                                        "metadata": {
                                            "display_phone_number": "+14155238886",
                                            "phone_number_id": "987654321",
                                        },
                                        "contacts": [
                                            {
                                                "wa_id": "61455301335",
                                                "profile": {"name": "Long"},
                                            }
                                        ],
                                        "messages": [
                                            {
                                                "id": "wamid.HBgL",
                                                "from": "61455301335",
                                                "type": "text",
                                                "text": {
                                                    "body": "Can I confirm setup this week?"
                                                },
                                            }
                                        ],
                                    }
                                }
                            ]
                        }
                    ]
                },
            )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["messages_processed"], 1)
        self.assertEqual(len(captured_calls), 1)
        payload = captured_calls[0]
        self.assertEqual(payload["source"], "whatsapp")
        self.assertEqual(payload["event_type"], "whatsapp_inbound")
        self.assertEqual(payload["metadata"]["provider"], "meta")
        self.assertEqual(payload["metadata"]["sender_phone"], "+61455301335")
        self.assertEqual(payload["metadata"]["phone_number_id"], "987654321")
        self.assertEqual(payload["message"].sender_name, "Long")
        self.assertEqual(payload["message"].message_id, "wamid.HBgL")
        self.assertEqual(payload["message"].text, "Can I confirm setup this week?")

    def test_duplicate_whatsapp_event_is_ignored_by_phase2_idempotency_gate(self):
        captured_calls: list[dict[str, object]] = []

        async def _store_event(_session, **kwargs):
            captured_calls.append(kwargs)

        async def _register_whatsapp_webhook_event(*_args, **_kwargs):
            return False, None, "tenant-test"

        async def _complete_whatsapp_webhook_event(*_args, **_kwargs):
            return None

        with patch("api.route_handlers.get_session", _fake_get_session), patch(
            "api.route_handlers.store_event",
            _store_event,
        ), patch(
            "api.route_handlers._register_whatsapp_webhook_event",
            _register_whatsapp_webhook_event,
        ), patch(
            "api.route_handlers._complete_whatsapp_webhook_event",
            _complete_whatsapp_webhook_event,
        ):
            client = TestClient(create_test_app())
            response = client.post(
                "/api/webhooks/whatsapp",
                data={
                    "Body": "Need to move my booking to tomorrow",
                    "From": "whatsapp:+61455301335",
                    "To": "whatsapp:+14155238886",
                    "ProfileName": "Long",
                    "MessageSid": "SM123",
                    "WaId": "61455301335",
                },
            )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["messages_processed"], 0)
        self.assertEqual(captured_calls, [])
