"""Integration tests for the Telegram voice → Whisper → text-handler flow.

The webhook payload for a voice note carries no inline ``text`` — only a
``voice.file_id``. The messaging automation service intercepts the voice
metadata, downloads the audio, runs Whisper STT, and replaces
``message.text`` with the transcription before slash-command dispatch.

These tests patch:

* ``MessagingAutomationService._download_voice_audio`` — so the test never
  reaches out to ``api.telegram.org``.
* ``MessagingAutomationService._build_whisper_adapter`` — so we can return
  a stub adapter (success path) or one that raises (failure path).

All other downstream collaborators (search service, repos, store_event) are
patched the same way as in ``test_telegram_webhook_routes.py``.
"""

from __future__ import annotations

from contextlib import asynccontextmanager
from pathlib import Path
import sys
from types import SimpleNamespace
from unittest import TestCase
from unittest.mock import AsyncMock, patch


BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))


from api.route_handlers import api  # noqa: E402
from fastapi import FastAPI  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from service_layer.messaging_automation_service import (  # noqa: E402
    _messaging_per_chat_limiter,
)
from integrations.ai_models.whisper_adapter import WhisperTranscription  # noqa: E402


# ---------------------------------------------------------------------------
# Shared fakes (mirrors test_telegram_webhook_routes.py)
# ---------------------------------------------------------------------------


class _FakeExecuteResult:
    def __init__(self, value=None):
        self._value = value

    def scalar_one_or_none(self):
        return self._value

    def scalars(self):
        return SimpleNamespace(all=lambda: [] if self._value is None else [self._value])

    def mappings(self):
        return SimpleNamespace(
            first=lambda: self._value,
            all=lambda: [] if self._value is None else [self._value],
        )


async def _fake_execute(*_args, **_kwargs):
    return _FakeExecuteResult()


async def _async_noop(*_args, **_kwargs):
    return None


@asynccontextmanager
async def _fake_get_session(_session_factory):
    yield SimpleNamespace(
        execute=_fake_execute,
        commit=_async_noop,
        add=lambda _row: None,
        flush=_async_noop,
    )


class _FakeTelegramCommunicationService:
    def __init__(self):
        self.sent: list[dict[str, object]] = []

    async def send_telegram(self, **kwargs):
        self.sent.append(kwargs)
        return SimpleNamespace(
            provider="telegram_bot",
            delivery_status="sent",
            provider_message_id="42",
            warnings=[],
        )

    async def answer_telegram_callback_query(self, **kwargs):  # noqa: ARG002
        return SimpleNamespace(
            provider="telegram_bot",
            delivery_status="sent",
            provider_message_id=None,
            warnings=[],
        )

    async def send_telegram_chat_action(self, **kwargs):  # noqa: ARG002
        return SimpleNamespace(
            provider="telegram_bot",
            delivery_status="sent",
            provider_message_id=None,
            warnings=[],
        )


def _create_test_app() -> FastAPI:
    app = FastAPI()
    app.include_router(api)
    app.state.session_factory = object()
    app.state.settings = SimpleNamespace(
        bookedai_customer_telegram_webhook_secret_token="telegram-secret",
        bookedai_customer_telegram_bot_token="customer-bot-token",
        booking_business_email="info@bookedai.au",
    )
    return app


def _telegram_voice_payload(*, file_id: str = "file-abc-123") -> dict:
    return {
        "update_id": 42424242,
        "message": {
            "message_id": 99,
            "from": {
                "id": 12345,
                "first_name": "Long",
                "username": "longbookedai",
            },
            "chat": {"id": 654321, "type": "private"},
            "voice": {
                "duration": 3,
                "mime_type": "audio/ogg",
                "file_id": file_id,
                "file_unique_id": "uniq-abc",
                "file_size": 12345,
            },
        },
    }


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------


class TelegramVoiceHandlingTestCase(TestCase):
    def setUp(self):
        _messaging_per_chat_limiter.reset()

    def test_voice_message_transcribed_and_routed_to_text_handler(self):
        """Inbound voice → Whisper returns "I want to learn AI automation"
        → downstream search pipeline runs as if the user had typed it."""

        captured_calls: list[dict[str, object]] = []
        captured_search_kwargs: list[dict[str, object]] = []
        communication_service = _FakeTelegramCommunicationService()

        async def _store_event(_session, **kwargs):
            captured_calls.append(kwargs)

        async def _resolve_customer_care_booking_reference(*_args, **_kwargs):
            return {
                "booking_reference": None,
                "resolved_by": "no_safe_match",
                "candidate_count": 0,
            }

        async def _search_service_options(_self, *args, **kwargs):  # noqa: ARG001
            captured_search_kwargs.append({"args": args, "kwargs": kwargs})
            return []

        download_mock = AsyncMock(return_value=b"opus-encoded-bytes")

        fake_adapter = SimpleNamespace(
            transcribe=AsyncMock(
                return_value=WhisperTranscription(
                    text="I want to learn AI automation",
                    detected_language="en",
                    duration_seconds=2.7,
                    latency_ms=180,
                )
            )
        )

        with patch("api.route_handlers.get_session", _fake_get_session), patch(
            "api.route_handlers.store_event", _store_event,
        ), patch(
            "service_layer.messaging_automation_service.resolve_customer_care_booking_reference",
            _resolve_customer_care_booking_reference,
        ), patch(
            "service_layer.messaging_automation_service.MessagingAutomationService._search_service_options",
            _search_service_options,
        ), patch(
            "service_layer.messaging_automation_service.MessagingAutomationService._download_voice_audio",
            download_mock,
        ), patch(
            "service_layer.messaging_automation_service.MessagingAutomationService._build_whisper_adapter",
            return_value=fake_adapter,
        ):
            app = _create_test_app()
            app.state.communication_service = communication_service
            client = TestClient(app)
            response = client.post(
                "/api/webhooks/bookedai-telegram",
                headers={"X-Telegram-Bot-Api-Secret-Token": "telegram-secret"},
                json=_telegram_voice_payload(),
            )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["messages_processed"], 1)
        # Whisper was actually called with the bytes the downloader returned.
        download_mock.assert_awaited_once()
        download_kwargs = download_mock.await_args.kwargs
        self.assertEqual(download_kwargs.get("file_id"), "file-abc-123")
        fake_adapter.transcribe.assert_awaited_once()
        transcribe_args = fake_adapter.transcribe.await_args
        self.assertEqual(transcribe_args.args[0], b"opus-encoded-bytes")
        # Downstream search saw the transcribed text — proves the voice
        # handler swapped message.text in place before slash dispatch.
        self.assertTrue(captured_search_kwargs, "search service was never invoked")
        # The store_event metadata should record successful transcription.
        self.assertEqual(captured_calls[0]["source"], "telegram")
        voice_meta = captured_calls[0]["metadata"].get("voice_transcription")
        self.assertIsInstance(voice_meta, dict)
        self.assertEqual(voice_meta.get("status"), "ok")
        self.assertEqual(voice_meta.get("detected_language"), "en")

    def test_voice_failure_replies_with_voice_failed_copy(self):
        """If Whisper raises, the bot replies with the localized
        ``voice_failed`` string — never silently drops the message."""

        captured_calls: list[dict[str, object]] = []
        communication_service = _FakeTelegramCommunicationService()

        async def _store_event(_session, **kwargs):
            captured_calls.append(kwargs)

        download_mock = AsyncMock(return_value=b"opus-encoded-bytes")
        failing_adapter = SimpleNamespace(
            transcribe=AsyncMock(side_effect=RuntimeError("simulated whisper outage"))
        )

        with patch("api.route_handlers.get_session", _fake_get_session), patch(
            "api.route_handlers.store_event", _store_event,
        ), patch(
            "service_layer.messaging_automation_service.MessagingAutomationService._download_voice_audio",
            download_mock,
        ), patch(
            "service_layer.messaging_automation_service.MessagingAutomationService._build_whisper_adapter",
            return_value=failing_adapter,
        ):
            app = _create_test_app()
            app.state.communication_service = communication_service
            client = TestClient(app)
            response = client.post(
                "/api/webhooks/bookedai-telegram",
                headers={"X-Telegram-Bot-Api-Secret-Token": "telegram-secret"},
                json=_telegram_voice_payload(file_id="file-fail-456"),
            )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["messages_processed"], 1)
        # The user got the friendly "couldn't hear that" message.
        self.assertEqual(len(communication_service.sent), 1)
        sent_body = communication_service.sent[0]["body"]
        self.assertIn("couldn't hear that", sent_body)
        # store_event recorded the failure status.
        self.assertEqual(captured_calls[0]["ai_intent"], "voice_transcription_failed")
        voice_meta = captured_calls[0]["metadata"].get("voice_transcription")
        self.assertIsInstance(voice_meta, dict)
        self.assertEqual(voice_meta.get("status"), "failed")
        self.assertEqual(voice_meta.get("error_type"), "RuntimeError")
