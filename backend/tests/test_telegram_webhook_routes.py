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
from service_layer.messaging_automation_service import (
    CUSTOMER_AGENT_CANONICAL_NAME,
    CUSTOMER_AGENT_PLATFORM_NAMES,
    MessagingAutomationService,
    MessagingAutomationResult,
)


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
        self.answered_callbacks: list[dict[str, object]] = []
        self.chat_actions: list[dict[str, object]] = []

    async def send_telegram(self, **kwargs):
        self.sent.append(kwargs)
        return SimpleNamespace(
            provider="telegram_bot",
            delivery_status="sent",
            provider_message_id="42",
            warnings=[],
        )

    async def answer_telegram_callback_query(self, **kwargs):
        self.answered_callbacks.append(kwargs)
        return SimpleNamespace(
            provider="telegram_bot",
            delivery_status="sent",
            provider_message_id=None,
            warnings=[],
        )

    async def send_telegram_chat_action(self, **kwargs):
        self.chat_actions.append(kwargs)
        return SimpleNamespace(
            provider="telegram_bot",
            delivery_status="sent",
            provider_message_id=None,
            warnings=[],
        )


class _FakeEmailService:
    def __init__(self, *, configured: bool = True):
        self.configured = configured
        self.sent: list[dict[str, object]] = []

    def smtp_configured(self):
        return self.configured

    async def send_email(self, **kwargs):
        self.sent.append(kwargs)


def create_test_app() -> FastAPI:
    app = FastAPI()
    app.include_router(api)
    app.state.session_factory = object()
    app.state.settings = SimpleNamespace(
        bookedai_customer_telegram_webhook_secret_token="telegram-secret",
        bookedai_customer_telegram_bot_token="customer-bot-token",
        booking_business_email="info@bookedai.au",
    )
    return app


class TelegramWebhookRoutesTestCase(TestCase):
    def test_customer_telegram_agent_name_is_bookedai_manager_bot(self):
        self.assertEqual(CUSTOMER_AGENT_CANONICAL_NAME, "BookedAI Manager Bot")
        self.assertEqual(
            CUSTOMER_AGENT_PLATFORM_NAMES["telegram"]["preferred_username"],
            "BookedAI_Manager_Bot",
        )

    def test_telegram_pending_booking_menu_exposes_professional_next_actions(self):
        controls = MessagingAutomationService._booking_care_reply_controls(
            "v1-pending123",
            new_booking_query="Chess pilot class",
        )

        self.assertEqual(controls["telegram_parse_mode"], "HTML")
        keyboard = controls["telegram_reply_markup"]["inline_keyboard"]
        self.assertEqual(keyboard[0][0]["text"], "Keep this booking")
        self.assertEqual(keyboard[1][0]["text"], "View booking")
        self.assertIn("v1-pending123", keyboard[1][0]["url"])
        self.assertEqual(keyboard[3][0]["text"], "Change time")
        self.assertEqual(keyboard[3][1]["text"], "Cancel booking")
        self.assertEqual(keyboard[4][0]["text"], "New booking search")
        self.assertEqual(keyboard[4][1]["text"], "Open BookedAI")
        action_ids = {action["id"] for action in controls["actions"]}
        self.assertTrue(
            {
                "keep_booking",
                "open_booking_portal",
                "request_reschedule",
                "request_cancel",
                "new_booking_search",
                "open_bookedai",
            }.issubset(action_ids)
        )

    def test_telegram_webhook_requires_secret_when_configured(self):
        client = TestClient(create_test_app())

        response = client.post(
            "/api/webhooks/telegram",
            json={"message": {"message_id": 1, "chat": {"id": 123}, "text": "Hello"}},
        )

        self.assertEqual(response.status_code, 403)

    def test_customer_telegram_webhook_requires_secret_when_configured(self):
        client = TestClient(create_test_app())

        response = client.post(
            "/api/webhooks/bookedai-telegram",
            json={"message": {"message_id": 1, "chat": {"id": 123}, "text": "Hello"}},
        )

        self.assertEqual(response.status_code, 403)

    def test_telegram_new_booking_message_uses_shared_agent_and_replies(self):
        captured_calls: list[dict[str, object]] = []
        communication_service = _FakeTelegramCommunicationService()

        async def _store_event(_session, **kwargs):
            captured_calls.append(kwargs)

        async def _resolve_customer_care_booking_reference(*_args, **_kwargs):
            return {
                "booking_reference": None,
                "resolved_by": "no_safe_match",
                "candidate_count": 0,
            }

        with patch("api.route_handlers.get_session", _fake_get_session), patch(
            "api.route_handlers.store_event",
            _store_event,
        ), patch(
            "service_layer.messaging_automation_service.resolve_customer_care_booking_reference",
            _resolve_customer_care_booking_reference,
        ):
            app = create_test_app()
            app.state.communication_service = communication_service
            client = TestClient(app)
            response = client.post(
                "/api/webhooks/bookedai-telegram",
                headers={"X-Telegram-Bot-Api-Secret-Token": "telegram-secret"},
                json={
                    "update_id": 1000,
                    "message": {
                        "message_id": 7,
                        "from": {
                            "id": 999,
                            "first_name": "Long",
                            "username": "longbookedai",
                        },
                        "chat": {"id": 123456, "type": "private"},
                        "text": "I want to book chess class this week",
                    },
                },
            )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["messages_processed"], 1)
        self.assertEqual(len(communication_service.sent), 1)
        self.assertEqual(communication_service.sent[0]["chat_id"], "123456")
        self.assertIn("start a new booking", communication_service.sent[0]["body"])
        self.assertEqual(captured_calls[0]["source"], "telegram")
        self.assertEqual(captured_calls[0]["event_type"], "telegram_inbound")
        self.assertEqual(captured_calls[0]["ai_intent"], "booking_intake")
        self.assertEqual(captured_calls[0]["metadata"]["messaging_layer"]["channel"], "telegram")

    def test_duplicate_telegram_event_is_ignored_by_idempotency_gate(self):
        captured_calls: list[dict[str, object]] = []
        communication_service = _FakeTelegramCommunicationService()

        async def _store_event(_session, **kwargs):
            captured_calls.append(kwargs)

        async def _register_inbound_webhook_event(*_args, **_kwargs):
            return False, None, "tenant-test"

        with patch("api.route_handlers.get_session", _fake_get_session), patch(
            "api.route_handlers.store_event",
            _store_event,
        ), patch(
            "api.route_handlers._register_inbound_webhook_event",
            _register_inbound_webhook_event,
        ):
            app = create_test_app()
            app.state.communication_service = communication_service
            client = TestClient(app)
            response = client.post(
                "/api/webhooks/bookedai-telegram",
                headers={"X-Telegram-Bot-Api-Secret-Token": "telegram-secret"},
                json={
                    "update_id": 1000,
                    "message": {
                        "message_id": 7,
                        "from": {"id": 999, "first_name": "Long"},
                        "chat": {"id": 123456, "type": "private"},
                        "text": "I want to book chess class this week",
                    },
                },
            )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["messages_processed"], 0)
        self.assertEqual(communication_service.sent, [])
        self.assertEqual(captured_calls, [])

    def test_telegram_service_search_reply_returns_options_and_web_booking_link(self):
        captured_calls: list[dict[str, object]] = []
        communication_service = _FakeTelegramCommunicationService()

        async def _store_event(_session, **kwargs):
            captured_calls.append(kwargs)

        async def _resolve_customer_care_booking_reference(*_args, **_kwargs):
            return {
                "booking_reference": None,
                "resolved_by": "no_safe_match",
                "candidate_count": 0,
            }

        async def _search_service_options(*_args, **_kwargs):
            return [
                {
                    "index": 1,
                    "service_id": "svc-chess",
                    "candidate_id": "svc-chess",
                    "provider_name": "Co Mai Hung Chess",
                    "service_name": "Chess pilot class",
                    "location": "Sydney",
                    "price": "AUD 30",
                    "tenant_id": "tenant-chess",
                }
            ]

        with patch("api.route_handlers.get_session", _fake_get_session), patch(
            "api.route_handlers.store_event",
            _store_event,
        ), patch(
            "service_layer.messaging_automation_service.resolve_customer_care_booking_reference",
            _resolve_customer_care_booking_reference,
        ), patch(
            "service_layer.messaging_automation_service.MessagingAutomationService._search_service_options",
            _search_service_options,
        ):
            app = create_test_app()
            app.state.communication_service = communication_service
            client = TestClient(app)
            response = client.post(
                "/api/webhooks/telegram",
                headers={"X-Telegram-Bot-Api-Secret-Token": "telegram-secret"},
                json={
                    "message": {
                        "message_id": 8,
                        "from": {"id": 999, "first_name": "Long"},
                        "chat": {"id": 123456, "type": "private"},
                        "text": "Find chess class in Sydney",
                    },
                },
            )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(communication_service.sent), 1)
        self.assertIn("<b>BookedAI.au found matching services.</b>", communication_service.sent[0]["body"])
        self.assertIn("Chess pilot class", communication_service.sent[0]["body"])
        self.assertIn("Book 1", communication_service.sent[0]["body"])
        self.assertIn("open the full BookedAI form", communication_service.sent[0]["body"])
        self.assertEqual(communication_service.sent[0]["parse_mode"], "HTML")
        self.assertEqual(
            communication_service.sent[0]["reply_markup"]["inline_keyboard"][0][0]["text"],
            "Open full results",
        )
        self.assertIn(
            "https://bookedai.au/",
            communication_service.sent[0]["reply_markup"]["inline_keyboard"][0][0]["url"],
        )
        self.assertEqual(
            communication_service.sent[0]["reply_markup"]["inline_keyboard"][1][0]["text"],
            "View option 1",
        )
        self.assertEqual(
            communication_service.sent[0]["reply_markup"]["inline_keyboard"][1][1]["text"],
            "Book option 1",
        )
        self.assertEqual(
            communication_service.sent[0]["reply_markup"]["inline_keyboard"][2][0]["text"],
            "Find more on Internet",
        )
        self.assertEqual(captured_calls[0]["ai_intent"], "service_search")
        self.assertEqual(captured_calls[0]["metadata"]["service_options"][0]["service_id"], "svc-chess")
        self.assertEqual(captured_calls[0]["metadata"]["bookedai_chat_response"]["status"], "ok")
        self.assertEqual(
            captured_calls[0]["metadata"]["bookedai_chat_response"]["matched_services"][0]["service_id"],
            "svc-chess",
        )
        self.assertEqual(captured_calls[0]["metadata"]["customer_identity"]["identity_type"], "missing")
        self.assertEqual(
            captured_calls[0]["metadata"]["customer_identity"]["booking_data_policy"],
            "load_by_booking_reference_or_safe_single_phone_email_match_only",
        )

    def test_telegram_can_expand_service_search_to_public_web_through_bookedai_agent(self):
        captured_calls: list[dict[str, object]] = []
        communication_service = _FakeTelegramCommunicationService()
        captured_resolutions: list[dict[str, object]] = []

        class _FakePublicSearchService:
            async def search_public_service_candidates(self, **kwargs):
                self.kwargs = kwargs
                return [
                    {
                        "candidate_id": "web-swim-1",
                        "provider_name": "Sydney Swim Studio",
                        "service_name": "Kids swim class",
                        "summary": "Public web result with a booking page.",
                        "location": "Sydney",
                        "source_url": "https://example.com/swim",
                        "booking_url": "https://example.com/swim/book",
                        "contact_phone": "+61255550000",
                        "match_score": 0.71,
                        "why_this_matches": "Matches kids swim classes in Sydney.",
                    }
                ]

        async def _store_event(_session, **kwargs):
            captured_calls.append(kwargs)

        async def _resolve_customer_care_booking_reference(*_args, **kwargs):
            captured_resolutions.append(kwargs)
            return {
                "booking_reference": None,
                "resolved_by": "no_safe_match",
                "candidate_count": 0,
            }

        async def _search_service_options(*_args, **_kwargs):
            return []

        with patch("api.route_handlers.get_session", _fake_get_session), patch(
            "api.route_handlers.store_event",
            _store_event,
        ), patch(
            "service_layer.messaging_automation_service.resolve_customer_care_booking_reference",
            _resolve_customer_care_booking_reference,
        ), patch(
            "service_layer.messaging_automation_service.MessagingAutomationService._search_service_options",
            _search_service_options,
        ):
            app = create_test_app()
            app.state.communication_service = communication_service
            app.state.openai_service = _FakePublicSearchService()
            client = TestClient(app)
            response = client.post(
                "/api/webhooks/bookedai-telegram",
                headers={"X-Telegram-Bot-Api-Secret-Token": "telegram-secret"},
                json={
                    "message": {
                        "message_id": 10,
                        "from": {"id": 999, "first_name": "Long"},
                        "chat": {"id": 123456, "type": "private"},
                        "text": "Find kids swim class in Sydney on Internet near me, email parent@example.com",
                    },
                },
            )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(communication_service.sent), 1)
        self.assertIn("<b>BookedAI found options, including Internet results.</b>", communication_service.sent[0]["body"])
        self.assertIn("Kids swim class", communication_service.sent[0]["body"])
        self.assertEqual(communication_service.sent[0]["parse_mode"], "HTML")
        self.assertEqual(
            communication_service.sent[0]["reply_markup"]["inline_keyboard"][0][0]["text"],
            "Open full results",
        )
        self.assertEqual(
            communication_service.sent[0]["reply_markup"]["inline_keyboard"][1][0]["text"],
            "View option 1",
        )
        self.assertEqual(
            communication_service.sent[0]["reply_markup"]["inline_keyboard"][1][0]["url"],
            "https://example.com/swim/book",
        )
        self.assertEqual(
            communication_service.sent[0]["reply_markup"]["inline_keyboard"][1][1]["text"],
            "Book option 1",
        )
        self.assertFalse(
            any(
                button.get("text") == "Find more on Internet near me"
                for row in communication_service.sent[0]["reply_markup"]["inline_keyboard"]
                for button in row
            )
        )
        self.assertEqual(captured_calls[0]["ai_intent"], "service_search")
        self.assertEqual(captured_calls[0]["metadata"]["service_options"][0]["source_type"], "public_web_search")
        self.assertEqual(
            captured_calls[0]["metadata"]["bookedai_chat_response"]["matched_services"][0]["tags"],
            ["public_web_search"],
        )
        self.assertEqual(captured_resolutions[0]["customer_email"], "parent@example.com")
        self.assertEqual(captured_calls[0]["metadata"]["customer_identity"]["identity_type"], "email")

    def test_telegram_booking_status_without_reference_or_identity_does_not_use_chat_id_as_customer_identity(self):
        captured_calls: list[dict[str, object]] = []
        communication_service = _FakeTelegramCommunicationService()
        captured_resolutions: list[dict[str, object]] = []

        async def _store_event(_session, **kwargs):
            captured_calls.append(kwargs)

        async def _resolve_customer_care_booking_reference(*_args, **kwargs):
            captured_resolutions.append(kwargs)
            return {
                "booking_reference": None,
                "resolved_by": "no_safe_match",
                "candidate_count": 0,
            }

        with patch("api.route_handlers.get_session", _fake_get_session), patch(
            "api.route_handlers.store_event",
            _store_event,
        ), patch(
            "service_layer.messaging_automation_service.resolve_customer_care_booking_reference",
            _resolve_customer_care_booking_reference,
        ):
            app = create_test_app()
            app.state.communication_service = communication_service
            client = TestClient(app)
            response = client.post(
                "/api/webhooks/telegram",
                headers={"X-Telegram-Bot-Api-Secret-Token": "telegram-secret"},
                json={
                    "message": {
                        "message_id": 11,
                        "from": {"id": 999, "first_name": "Long"},
                        "chat": {"id": 123456, "type": "private"},
                        "text": "Can you check my booking status?",
                    },
                },
            )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(captured_resolutions[0]["customer_phone"], None)
        self.assertEqual(captured_resolutions[0]["customer_email"], None)
        self.assertIn("booking reference", communication_service.sent[0]["body"])
        self.assertIn("email/phone", communication_service.sent[0]["body"])
        self.assertEqual(captured_calls[0]["metadata"]["customer_identity"]["identity_type"], "missing")

    def test_telegram_existing_booking_payment_turn_uses_latest_message_for_support_queue(self):
        captured_calls: list[dict[str, object]] = []
        captured_care_messages: list[str] = []
        communication_service = _FakeTelegramCommunicationService()

        async def _store_event(_session, **kwargs):
            captured_calls.append(kwargs)

        async def _resolve_customer_care_booking_reference(*_args, **_kwargs):
            return {
                "booking_reference": "v1-6dfc0946e4",
                "resolved_by": "booking_reference",
                "candidate_count": 1,
            }

        async def _load_conversation_history(*_args, **_kwargs):
            return [
                {
                    "role": "assistant",
                    "text": "Support contact: info@bookedai.au or +61455301335 on Telegram.",
                    "booking_reference": "v1-6dfc0946e4",
                }
            ]

        async def _build_portal_customer_care_turn(*_args, **kwargs):
            captured_care_messages.append(kwargs["message"])
            return {
                "phase": "payment_help",
                "reply": "Booking v1-6dfc0946e4 payment is currently `pending`.",
                "identity": {"verified": True},
                "next_actions": [
                    {
                        "id": "contact_support",
                        "label": "Contact support",
                        "enabled": True,
                        "href": "mailto:info@bookedai.au",
                    }
                ],
                "operations": {"summary": {"total": 0}},
                "created_request": None,
            }

        with patch("api.route_handlers.get_session", _fake_get_session), patch(
            "api.route_handlers.store_event",
            _store_event,
        ), patch(
            "service_layer.messaging_automation_service.resolve_customer_care_booking_reference",
            _resolve_customer_care_booking_reference,
        ), patch(
            "service_layer.messaging_automation_service.MessagingAutomationService._load_conversation_history",
            _load_conversation_history,
        ), patch(
            "service_layer.messaging_automation_service.build_portal_customer_care_turn",
            _build_portal_customer_care_turn,
        ):
            app = create_test_app()
            app.state.communication_service = communication_service
            client = TestClient(app)
            response = client.post(
                "/api/webhooks/bookedai-telegram",
                headers={"X-Telegram-Bot-Api-Secret-Token": "telegram-secret"},
                json={
                    "message": {
                        "message_id": 12,
                        "from": {"id": 999, "first_name": "Long"},
                        "chat": {"id": 123456, "type": "private"},
                        "text": "Payment status for v1-6dfc0946e4?",
                    },
                },
            )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(captured_care_messages, ["Payment status for v1-6dfc0946e4?"])
        self.assertNotIn("[Prior conversation:", captured_care_messages[0])
        self.assertNotIn("queued this as a support request", communication_service.sent[0]["body"])
        keyboard = communication_service.sent[0]["reply_markup"]["inline_keyboard"]
        self.assertEqual(keyboard[0][0]["text"], "Keep this booking")
        self.assertEqual(keyboard[1][0]["text"], "View booking")
        self.assertIn("v1-6dfc0946e4", keyboard[1][0]["url"])
        self.assertEqual(keyboard[3][0]["text"], "Change time")
        self.assertEqual(keyboard[3][1]["text"], "Cancel booking")
        self.assertEqual(keyboard[4][0]["text"], "New booking search")
        self.assertEqual(communication_service.sent[0]["parse_mode"], "HTML")
        self.assertEqual(captured_calls[0]["metadata"]["care_turn"]["created_request"], None)

    def test_telegram_book_option_can_capture_booking_intent_result(self):
        captured_calls: list[dict[str, object]] = []
        communication_service = _FakeTelegramCommunicationService()
        email_service = _FakeEmailService(configured=True)

        async def _store_event(_session, **kwargs):
            captured_calls.append(kwargs)

        async def _resolve_customer_care_booking_reference(*_args, **_kwargs):
            return {
                "booking_reference": None,
                "resolved_by": "no_safe_match",
                "candidate_count": 0,
            }

        async def _load_conversation_history(*_args, **_kwargs):
            return [
                {
                    "role": "assistant",
                    "text": "I found options",
                    "service_options": [
                        {
                            "index": 1,
                            "service_id": "svc-chess",
                            "candidate_id": "svc-chess",
                            "provider_name": "Co Mai Hung Chess",
                            "service_name": "Chess pilot class",
                            "tenant_id": "tenant-chess",
                        }
                    ],
                }
            ]

        async def _try_create_chat_booking_intent(*_args, **_kwargs):
            return MessagingAutomationResult(
                ai_reply="Done. Reference: v1-telegram123. Portal: https://portal.bookedai.au/?booking_reference=v1-telegram123",
                ai_intent="booking_intent_captured",
                workflow_status="answered",
                metadata={
                    "messaging_layer": {"channel": "telegram"},
                    "customer_care_status": "booking_intent_captured",
                    "booking_reference": "v1-telegram123",
                    "booking_intent": {
                        "booking_reference": "v1-telegram123",
                        "tenant_id": "tenant-chess",
                        "booking_intent_id": "bi-telegram-123",
                        "contact_id": "contact-123",
                        "service_name": "Chess pilot class",
                        "customer_name": "Long",
                        "customer_email": "long@example.com",
                        "customer_phone": "+61455301335",
                        "requested_date": "2026-04-28",
                        "requested_time": "16:00",
                        "timezone": "Australia/Sydney",
                        "booking_path": "book_now_capture",
                    },
                },
            )

        async def _orchestrate_booking_followup_sync(*_args, **_kwargs):
            return SimpleNamespace(
                deal_record_id=71,
                deal_sync_status="pending",
                deal_external_entity_id=None,
                task_record_id=72,
                task_sync_status="pending",
                task_external_entity_id=None,
                warning_codes=[],
            )

        async def _orchestrate_lifecycle_email(*_args, **_kwargs):
            return SimpleNamespace(
                message_id="email-telegram-1",
                delivery_status="sent",
                provider="smtp",
                warning_codes=[],
            )

        async def _orchestrate_email_sent_sync(*_args, **_kwargs):
            return SimpleNamespace(
                task_record_id=73,
                task_sync_status="pending",
                task_external_entity_id=None,
                warning_codes=[],
            )

        with patch("api.route_handlers.get_session", _fake_get_session), patch(
            "api.route_handlers.store_event",
            _store_event,
        ), patch(
            "service_layer.messaging_automation_service.resolve_customer_care_booking_reference",
            _resolve_customer_care_booking_reference,
        ), patch(
            "service_layer.messaging_automation_service.MessagingAutomationService._load_conversation_history",
            _load_conversation_history,
        ), patch(
            "api.route_handlers.MessagingAutomationService.handle_customer_message",
            _try_create_chat_booking_intent,
        ), patch(
            "api.route_handlers.orchestrate_booking_followup_sync",
            _orchestrate_booking_followup_sync,
        ), patch(
            "api.route_handlers.orchestrate_lifecycle_email",
            _orchestrate_lifecycle_email,
        ), patch(
            "api.route_handlers.orchestrate_email_sent_sync",
            _orchestrate_email_sent_sync,
        ):
            app = create_test_app()
            app.state.communication_service = communication_service
            app.state.email_service = email_service
            client = TestClient(app)
            response = client.post(
                "/api/webhooks/telegram",
                headers={"X-Telegram-Bot-Api-Secret-Token": "telegram-secret"},
                json={
                    "message": {
                        "message_id": 9,
                        "from": {"id": 999, "first_name": "Long"},
                        "chat": {"id": 123456, "type": "private"},
                        "text": "Book 1 for Long long@example.com tomorrow 4pm",
                    },
                },
            )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(communication_service.sent), 1)
        self.assertEqual(email_service.sent[0]["to"], ["long@example.com"])
        self.assertIn("v1-telegram123", communication_service.sent[0]["body"])
        self.assertEqual(captured_calls[0]["ai_intent"], "booking_intent_captured")
        self.assertEqual(captured_calls[0]["metadata"]["booking_reference"], "v1-telegram123")
        lifecycle = captured_calls[0]["metadata"]["lifecycle_updates"]
        self.assertEqual(lifecycle["crm_sync"]["deal"]["record_id"], 71)
        self.assertEqual(lifecycle["crm_sync"]["task"]["record_id"], 72)
        self.assertEqual(lifecycle["email_confirmation"]["message_id"], "email-telegram-1")
        self.assertEqual(
            lifecycle["email_confirmation"]["crm_sync"]["task"]["record_id"],
            73,
        )

    def test_telegram_preserves_booking_intent_lifecycle_updates_when_queued_request_also_exists(self):
        captured_calls: list[dict[str, object]] = []
        communication_service = _FakeTelegramCommunicationService()

        async def _store_event(_session, **kwargs):
            captured_calls.append(kwargs)

        async def _handle_customer_message(*_args, **_kwargs):
            return MessagingAutomationResult(
                ai_reply="Done. Reference: v1-telegram123",
                ai_intent="booking_intent_captured",
                workflow_status="answered",
                metadata={
                    "messaging_layer": {"channel": "telegram"},
                    "booking_reference": "v1-telegram123",
                    "booking_intent": {
                        "booking_reference": "v1-telegram123",
                        "tenant_id": "tenant-chess",
                        "booking_intent_id": "bi-telegram-123",
                        "customer_email": "long@example.com",
                    },
                    "queued_request": {
                        "request_type": "reschedule_request",
                        "booking_reference": "v1-telegram123",
                        "tenant_id": "tenant-chess",
                        "customer_email": "long@example.com",
                    },
                },
            )

        async def _finalize_booking_intent(*_args, **_kwargs):
            return {
                "crm_sync": {
                    "deal": {"record_id": 71, "sync_status": "pending"},
                    "task": {"record_id": 72, "sync_status": "pending"},
                },
                "email_confirmation": {
                    "message_id": "email-telegram-1",
                    "delivery_status": "sent",
                },
            }

        async def _finalize_queued_request(*_args, **_kwargs):
            return {
                "queued_request": {
                    "request_type": "reschedule_request",
                    "booking_reference": "v1-telegram123",
                }
            }

        with patch("api.route_handlers.get_session", _fake_get_session), patch(
            "api.route_handlers.store_event",
            _store_event,
        ), patch(
            "api.route_handlers.MessagingAutomationService.handle_customer_message",
            _handle_customer_message,
        ), patch(
            "api.route_handlers._finalize_messaging_booking_intent_side_effects",
            _finalize_booking_intent,
        ), patch(
            "api.route_handlers._finalize_messaging_queued_request_side_effects",
            _finalize_queued_request,
        ):
            app = create_test_app()
            app.state.communication_service = communication_service
            client = TestClient(app)
            response = client.post(
                "/api/webhooks/telegram",
                headers={"X-Telegram-Bot-Api-Secret-Token": "telegram-secret"},
                json={
                    "message": {
                        "message_id": 10,
                        "from": {"id": 999, "first_name": "Long"},
                        "chat": {"id": 123456, "type": "private"},
                        "text": "Book 1 and also reschedule my current class",
                    },
                },
            )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(communication_service.sent), 1)
        lifecycle = captured_calls[0]["metadata"]["lifecycle_updates"]
        self.assertEqual(lifecycle["crm_sync"]["deal"]["record_id"], 71)
        self.assertEqual(lifecycle["crm_sync"]["task"]["record_id"], 72)
        self.assertEqual(lifecycle["email_confirmation"]["message_id"], "email-telegram-1")
        self.assertEqual(
            lifecycle["queued_request"]["request_type"],
            "reschedule_request",
        )
        self.assertEqual(
            lifecycle["queued_request"]["booking_reference"],
            "v1-telegram123",
        )

    def test_telegram_existing_order_search_asks_what_to_do_with_current_booking(self):
        captured_calls: list[dict[str, object]] = []
        communication_service = _FakeTelegramCommunicationService()

        async def _store_event(_session, **kwargs):
            captured_calls.append(kwargs)

        async def _resolve_customer_care_booking_reference(*_args, **_kwargs):
            return {
                "booking_reference": "v1-existing123",
                "resolved_by": "single_email_match",
                "candidate_count": 1,
            }

        with patch("api.route_handlers.get_session", _fake_get_session), patch(
            "api.route_handlers.store_event",
            _store_event,
        ), patch(
            "service_layer.messaging_automation_service.resolve_customer_care_booking_reference",
            _resolve_customer_care_booking_reference,
        ):
            app = create_test_app()
            app.state.communication_service = communication_service
            client = TestClient(app)
            response = client.post(
                "/api/webhooks/bookedai-telegram",
                headers={"X-Telegram-Bot-Api-Secret-Token": "telegram-secret"},
                json={
                    "message": {
                        "message_id": 13,
                        "from": {"id": 999, "first_name": "Long"},
                        "chat": {"id": 123456, "type": "private"},
                        "text": "Find another chess option for long@example.com",
                    },
                },
            )

        self.assertEqual(response.status_code, 200)
        body = communication_service.sent[0]["body"]
        self.assertIn("BookedAI.au", body)
        self.assertIn("v1-existing123", body)
        self.assertIn("https://portal.bookedai.au/", body)
        self.assertIn("<b>QR</b>:", body)
        self.assertIn("what should happen with the current booking", body)
        self.assertEqual(communication_service.sent[0]["parse_mode"], "HTML")
        keyboard = communication_service.sent[0]["reply_markup"]["inline_keyboard"]
        self.assertEqual(keyboard[0][0]["text"], "Open current order portal")
        self.assertEqual(keyboard[1][0]["text"], "Open order QR")
        self.assertEqual(keyboard[2][0]["text"], "Keep current booking, search BookedAI.au")
        self.assertEqual(keyboard[3][0]["text"], "Find Internet options, keep current booking")
        self.assertEqual(keyboard[4][0]["text"], "Change current booking")
        self.assertEqual(captured_calls[0]["ai_intent"], "existing_booking_search_confirmation")
        self.assertEqual(captured_calls[0]["metadata"]["booking_reference"], "v1-existing123")

    def test_telegram_existing_order_search_override_allows_new_search_and_return_menu(self):
        captured_calls: list[dict[str, object]] = []
        communication_service = _FakeTelegramCommunicationService()

        async def _store_event(_session, **kwargs):
            captured_calls.append(kwargs)

        async def _resolve_customer_care_booking_reference(*_args, **_kwargs):
            return {
                "booking_reference": "v1-existing123",
                "resolved_by": "single_email_match",
                "candidate_count": 1,
            }

        async def _load_channel_session_state(*_args, **_kwargs):
            return {
                "service_search_query": "Find another chess option for long@example.com",
                "service_options": [],
                "reply_controls": {},
                "customer_identity": {"identity_type": "email"},
            }

        async def _search_service_options(*_args, **_kwargs):
            return [
                {
                    "index": 1,
                    "service_id": "svc-chess-2",
                    "candidate_id": "svc-chess-2",
                    "provider_name": "BookedAI.au Partner",
                    "service_name": "Advanced chess option",
                    "location": "Sydney",
                    "price": "AUD 40",
                    "tenant_id": "tenant-chess",
                }
            ]

        with patch("api.route_handlers.get_session", _fake_get_session), patch(
            "api.route_handlers.store_event",
            _store_event,
        ), patch(
            "service_layer.messaging_automation_service.resolve_customer_care_booking_reference",
            _resolve_customer_care_booking_reference,
        ), patch(
            "service_layer.messaging_automation_service.MessagingAutomationService._load_channel_session_state",
            _load_channel_session_state,
        ), patch(
            "service_layer.messaging_automation_service.MessagingAutomationService._search_service_options",
            _search_service_options,
        ):
            app = create_test_app()
            app.state.communication_service = communication_service
            client = TestClient(app)
            response = client.post(
                "/api/webhooks/bookedai-telegram",
                headers={"X-Telegram-Bot-Api-Secret-Token": "telegram-secret"},
                json={
                    "callback_query": {
                        "id": "callback-keep-search",
                        "from": {"id": 999, "first_name": "Long"},
                        "data": "Keep current booking and search BookedAI.au",
                        "message": {
                            "message_id": 14,
                            "chat": {"id": 123456, "type": "private"},
                            "text": "BookedAI.au found you still have an active booking context.",
                        },
                    }
                },
            )

        self.assertEqual(response.status_code, 200)
        body = communication_service.sent[0]["body"]
        self.assertIn("Advanced chess option", body)
        self.assertIn("Current order stays available", body)
        keyboard = communication_service.sent[0]["reply_markup"]["inline_keyboard"]
        self.assertEqual(keyboard[-1][0]["text"], "Return to current order")
        self.assertIn("https://portal.bookedai.au/", keyboard[-1][0]["url"])
        self.assertEqual(captured_calls[0]["ai_intent"], "service_search")
        self.assertEqual(captured_calls[0]["metadata"]["active_booking_reference"], "v1-existing123")

    def test_telegram_callback_query_is_acknowledged_before_reply(self):
        captured_calls: list[dict[str, object]] = []
        communication_service = _FakeTelegramCommunicationService()

        async def _store_event(_session, **kwargs):
            captured_calls.append(kwargs)

        async def _resolve_customer_care_booking_reference(*_args, **_kwargs):
            return {
                "booking_reference": None,
                "resolved_by": "no_safe_match",
                "candidate_count": 0,
            }

        async def _load_conversation_history(*_args, **_kwargs):
            return [
                {
                    "role": "assistant",
                    "text": "I found options",
                    "service_options": [
                        {
                            "index": 1,
                            "service_id": "svc-chess",
                            "candidate_id": "svc-chess",
                            "provider_name": "Co Mai Hung Chess",
                            "service_name": "Chess pilot class",
                            "tenant_id": "tenant-chess",
                        }
                    ],
                }
            ]

        with patch("api.route_handlers.get_session", _fake_get_session), patch(
            "api.route_handlers.store_event",
            _store_event,
        ), patch(
            "service_layer.messaging_automation_service.resolve_customer_care_booking_reference",
            _resolve_customer_care_booking_reference,
        ), patch(
            "service_layer.messaging_automation_service.MessagingAutomationService._load_conversation_history",
            _load_conversation_history,
        ):
            app = create_test_app()
            app.state.communication_service = communication_service
            client = TestClient(app)
            response = client.post(
                "/api/webhooks/bookedai-telegram",
                headers={"X-Telegram-Bot-Api-Secret-Token": "telegram-secret"},
                json={
                    "callback_query": {
                        "id": "callback-123",
                        "from": {"id": 999, "first_name": "Long"},
                        "data": "Book 1",
                        "message": {
                            "message_id": 12,
                            "chat": {"id": 123456, "type": "private"},
                            "text": "BookedAI found these matching services",
                        },
                    }
                },
            )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(communication_service.answered_callbacks[0]["callback_query_id"], "callback-123")
        self.assertEqual(captured_calls[0]["metadata"]["telegram_callback_query_id"], "callback-123")
        self.assertEqual(captured_calls[0]["metadata"]["callback_ack"]["delivery_status"], "sent")
        self.assertIn("I can book option 1", communication_service.sent[0]["body"])

    def test_telegram_start_command_returns_welcome_with_persistent_keyboard(self):
        captured_calls: list[dict[str, object]] = []
        communication_service = _FakeTelegramCommunicationService()

        async def _store_event(_session, **kwargs):
            captured_calls.append(kwargs)

        with patch("api.route_handlers.get_session", _fake_get_session), patch(
            "api.route_handlers.store_event",
            _store_event,
        ):
            app = create_test_app()
            app.state.communication_service = communication_service
            client = TestClient(app)
            response = client.post(
                "/api/webhooks/bookedai-telegram",
                headers={"X-Telegram-Bot-Api-Secret-Token": "telegram-secret"},
                json={
                    "update_id": 5001,
                    "message": {
                        "message_id": 21,
                        "from": {"id": 999, "first_name": "Long", "language_code": "en-AU"},
                        "chat": {"id": 123456, "type": "private"},
                        "text": "/start",
                    },
                },
            )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(communication_service.sent), 1)
        body = communication_service.sent[0]["body"]
        self.assertIn("BookedAI Manager Bot", body)
        self.assertIn("Find a service", body)
        keyboard = communication_service.sent[0]["reply_markup"]["keyboard"]
        self.assertEqual(keyboard[0][0]["text"], "Find a service")
        self.assertEqual(keyboard[0][1]["text"], "My bookings")
        self.assertEqual(keyboard[1][0]["text"], "Talk to support")
        self.assertTrue(communication_service.sent[0]["reply_markup"]["is_persistent"])
        self.assertEqual(communication_service.sent[0]["parse_mode"], "HTML")
        self.assertEqual(captured_calls[0]["ai_intent"], "welcome")
        self.assertEqual(
            captured_calls[0]["metadata"]["telegram_language_code"], "en-au"
        )
        self.assertEqual(captured_calls[0]["metadata"]["locale"], "en")
        self.assertEqual(
            captured_calls[0]["metadata"]["start_command_kind"], "welcome"
        )

    def test_telegram_start_in_vietnamese_locale_renders_vietnamese_welcome(self):
        captured_calls: list[dict[str, object]] = []
        communication_service = _FakeTelegramCommunicationService()

        async def _store_event(_session, **kwargs):
            captured_calls.append(kwargs)

        with patch("api.route_handlers.get_session", _fake_get_session), patch(
            "api.route_handlers.store_event",
            _store_event,
        ):
            app = create_test_app()
            app.state.communication_service = communication_service
            client = TestClient(app)
            response = client.post(
                "/api/webhooks/bookedai-telegram",
                headers={"X-Telegram-Bot-Api-Secret-Token": "telegram-secret"},
                json={
                    "update_id": 7001,
                    "message": {
                        "message_id": 41,
                        "from": {"id": 999, "first_name": "Long", "language_code": "vi"},
                        "chat": {"id": 123456, "type": "private"},
                        "text": "/start",
                    },
                },
            )

        self.assertEqual(response.status_code, 200)
        body = communication_service.sent[0]["body"]
        self.assertIn("Chào Long", body)
        self.assertIn("Tìm dịch vụ", body)
        keyboard = communication_service.sent[0]["reply_markup"]["keyboard"]
        self.assertEqual(keyboard[0][0]["text"], "Tìm dịch vụ")
        self.assertEqual(keyboard[0][1]["text"], "Booking của tôi")
        self.assertEqual(keyboard[1][0]["text"], "Gặp hỗ trợ")
        self.assertEqual(captured_calls[0]["metadata"]["locale"], "vi")

    def test_telegram_unsupported_locale_falls_back_to_english_welcome(self):
        captured_calls: list[dict[str, object]] = []
        communication_service = _FakeTelegramCommunicationService()

        async def _store_event(_session, **kwargs):
            captured_calls.append(kwargs)

        with patch("api.route_handlers.get_session", _fake_get_session), patch(
            "api.route_handlers.store_event",
            _store_event,
        ):
            app = create_test_app()
            app.state.communication_service = communication_service
            client = TestClient(app)
            response = client.post(
                "/api/webhooks/bookedai-telegram",
                headers={"X-Telegram-Bot-Api-Secret-Token": "telegram-secret"},
                json={
                    "update_id": 7002,
                    "message": {
                        "message_id": 42,
                        "from": {"id": 999, "first_name": "Long", "language_code": "fr"},
                        "chat": {"id": 123456, "type": "private"},
                        "text": "/start",
                    },
                },
            )

        self.assertEqual(response.status_code, 200)
        body = communication_service.sent[0]["body"]
        self.assertIn("Find a service", body)
        self.assertEqual(captured_calls[0]["metadata"]["locale"], "en")

    def test_telegram_vietnamese_keyboard_label_routes_to_search_prompt(self):
        captured_calls: list[dict[str, object]] = []
        communication_service = _FakeTelegramCommunicationService()

        async def _store_event(_session, **kwargs):
            captured_calls.append(kwargs)

        with patch("api.route_handlers.get_session", _fake_get_session), patch(
            "api.route_handlers.store_event",
            _store_event,
        ):
            app = create_test_app()
            app.state.communication_service = communication_service
            client = TestClient(app)
            response = client.post(
                "/api/webhooks/bookedai-telegram",
                headers={"X-Telegram-Bot-Api-Secret-Token": "telegram-secret"},
                json={
                    "update_id": 7003,
                    "message": {
                        "message_id": 43,
                        "from": {"id": 999, "first_name": "Long", "language_code": "vi"},
                        "chat": {"id": 123456, "type": "private"},
                        "text": "Tìm dịch vụ",
                    },
                },
            )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(captured_calls[0]["ai_intent"], "search_prompt")
        body = communication_service.sent[0]["body"]
        self.assertIn("Bạn muốn tìm gì", body)

    def test_telegram_typing_indicator_is_sent_before_reply(self):
        captured_calls: list[dict[str, object]] = []
        communication_service = _FakeTelegramCommunicationService()

        async def _store_event(_session, **kwargs):
            captured_calls.append(kwargs)

        with patch("api.route_handlers.get_session", _fake_get_session), patch(
            "api.route_handlers.store_event",
            _store_event,
        ):
            app = create_test_app()
            app.state.communication_service = communication_service
            client = TestClient(app)
            client.post(
                "/api/webhooks/bookedai-telegram",
                headers={"X-Telegram-Bot-Api-Secret-Token": "telegram-secret"},
                json={
                    "update_id": 5002,
                    "message": {
                        "message_id": 22,
                        "from": {"id": 999, "first_name": "Long"},
                        "chat": {"id": 123456, "type": "private"},
                        "text": "/start",
                    },
                },
            )

        self.assertEqual(len(communication_service.chat_actions), 1)
        self.assertEqual(communication_service.chat_actions[0]["chat_id"], "123456")
        self.assertEqual(communication_service.chat_actions[0]["action"], "typing")

    def test_telegram_start_svc_slug_runs_service_search(self):
        captured_calls: list[dict[str, object]] = []
        communication_service = _FakeTelegramCommunicationService()
        captured_search_queries: list[str] = []

        async def _store_event(_session, **kwargs):
            captured_calls.append(kwargs)

        async def _resolve_customer_care_booking_reference(*_args, **_kwargs):
            return {
                "booking_reference": None,
                "resolved_by": "no_safe_match",
                "candidate_count": 0,
            }

        async def _search_service_options(_self, _session, *, query, tenant_ref=None):
            captured_search_queries.append(query)
            return [
                {
                    "index": 1,
                    "service_id": "svc-chess",
                    "candidate_id": "svc-chess",
                    "provider_name": "Co Mai Hung Chess",
                    "service_name": "Chess pilot class",
                    "location": "Sydney",
                    "price": "AUD 30",
                    "tenant_id": "tenant-chess",
                }
            ]

        with patch("api.route_handlers.get_session", _fake_get_session), patch(
            "api.route_handlers.store_event",
            _store_event,
        ), patch(
            "service_layer.messaging_automation_service.resolve_customer_care_booking_reference",
            _resolve_customer_care_booking_reference,
        ), patch(
            "service_layer.messaging_automation_service.MessagingAutomationService._search_service_options",
            _search_service_options,
        ):
            app = create_test_app()
            app.state.communication_service = communication_service
            client = TestClient(app)
            response = client.post(
                "/api/webhooks/bookedai-telegram",
                headers={"X-Telegram-Bot-Api-Secret-Token": "telegram-secret"},
                json={
                    "update_id": 5003,
                    "message": {
                        "message_id": 23,
                        "from": {"id": 999, "first_name": "Long"},
                        "chat": {"id": 123456, "type": "private"},
                        "text": "/start svc.co-mai-hung-chess-class",
                    },
                },
            )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(captured_calls[0]["ai_intent"], "service_search")
        self.assertIn("co mai hung chess class", captured_search_queries[0].lower())
        self.assertEqual(
            captured_calls[0]["metadata"]["start_command_kind"], "service_search"
        )

    def test_telegram_help_slash_command_returns_welcome(self):
        captured_calls: list[dict[str, object]] = []
        communication_service = _FakeTelegramCommunicationService()

        async def _store_event(_session, **kwargs):
            captured_calls.append(kwargs)

        with patch("api.route_handlers.get_session", _fake_get_session), patch(
            "api.route_handlers.store_event",
            _store_event,
        ):
            app = create_test_app()
            app.state.communication_service = communication_service
            client = TestClient(app)
            response = client.post(
                "/api/webhooks/bookedai-telegram",
                headers={"X-Telegram-Bot-Api-Secret-Token": "telegram-secret"},
                json={
                    "update_id": 5004,
                    "message": {
                        "message_id": 24,
                        "from": {"id": 999, "first_name": "Long"},
                        "chat": {"id": 123456, "type": "private"},
                        "text": "/help",
                    },
                },
            )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(captured_calls[0]["ai_intent"], "welcome")
        self.assertIn("BookedAI Manager Bot", communication_service.sent[0]["body"])

    def test_telegram_booking_intent_reply_uses_code_block_for_reference(self):
        captured_calls: list[dict[str, object]] = []
        communication_service = _FakeTelegramCommunicationService()
        email_service = _FakeEmailService(configured=False)

        async def _store_event(_session, **kwargs):
            captured_calls.append(kwargs)

        async def _resolve_customer_care_booking_reference(*_args, **_kwargs):
            return {
                "booking_reference": None,
                "resolved_by": "no_safe_match",
                "candidate_count": 0,
            }

        async def _load_conversation_history(*_args, **_kwargs):
            return [
                {
                    "role": "assistant",
                    "text": "I found options",
                    "service_options": [
                        {
                            "index": 1,
                            "service_id": "svc-chess",
                            "candidate_id": "svc-chess",
                            "provider_name": "Co Mai Hung Chess",
                            "service_name": "Chess pilot class",
                            "tenant_id": "tenant-chess",
                        }
                    ],
                }
            ]

        async def _orchestrate_booking_followup_sync(*_args, **_kwargs):
            return SimpleNamespace(
                deal_record_id=71,
                deal_sync_status="pending",
                deal_external_entity_id=None,
                task_record_id=72,
                task_sync_status="pending",
                task_external_entity_id=None,
                warning_codes=[],
            )

        with patch("api.route_handlers.get_session", _fake_get_session), patch(
            "api.route_handlers.store_event",
            _store_event,
        ), patch(
            "service_layer.messaging_automation_service.resolve_customer_care_booking_reference",
            _resolve_customer_care_booking_reference,
        ), patch(
            "service_layer.messaging_automation_service.MessagingAutomationService._load_conversation_history",
            _load_conversation_history,
        ), patch(
            "api.route_handlers.orchestrate_booking_followup_sync",
            _orchestrate_booking_followup_sync,
        ):
            app = create_test_app()
            app.state.communication_service = communication_service
            app.state.email_service = email_service
            client = TestClient(app)
            response = client.post(
                "/api/webhooks/bookedai-telegram",
                headers={"X-Telegram-Bot-Api-Secret-Token": "telegram-secret"},
                json={
                    "update_id": 5005,
                    "message": {
                        "message_id": 25,
                        "from": {"id": 999, "first_name": "Long"},
                        "chat": {"id": 123456, "type": "private"},
                        "text": "Book 1 for Long long@example.com tomorrow 4pm",
                    },
                },
            )

        self.assertEqual(response.status_code, 200)
        body = communication_service.sent[0]["body"]
        self.assertIn("<code>", body)
        self.assertIn("</code>", body)
        self.assertIn("(tap to copy)", body)

    def test_telegram_search_slash_returns_search_prompt(self):
        captured_calls: list[dict[str, object]] = []
        communication_service = _FakeTelegramCommunicationService()

        async def _store_event(_session, **kwargs):
            captured_calls.append(kwargs)

        with patch("api.route_handlers.get_session", _fake_get_session), patch(
            "api.route_handlers.store_event",
            _store_event,
        ):
            app = create_test_app()
            app.state.communication_service = communication_service
            client = TestClient(app)
            response = client.post(
                "/api/webhooks/bookedai-telegram",
                headers={"X-Telegram-Bot-Api-Secret-Token": "telegram-secret"},
                json={
                    "update_id": 6001,
                    "message": {
                        "message_id": 31,
                        "from": {"id": 999, "first_name": "Long"},
                        "chat": {"id": 123456, "type": "private"},
                        "text": "/search",
                    },
                },
            )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(captured_calls[0]["ai_intent"], "search_prompt")
        self.assertIn("What would you like to find", communication_service.sent[0]["body"])

    def test_telegram_mybookings_slash_returns_lookup_prompt(self):
        captured_calls: list[dict[str, object]] = []
        communication_service = _FakeTelegramCommunicationService()

        async def _store_event(_session, **kwargs):
            captured_calls.append(kwargs)

        with patch("api.route_handlers.get_session", _fake_get_session), patch(
            "api.route_handlers.store_event",
            _store_event,
        ):
            app = create_test_app()
            app.state.communication_service = communication_service
            client = TestClient(app)
            response = client.post(
                "/api/webhooks/bookedai-telegram",
                headers={"X-Telegram-Bot-Api-Secret-Token": "telegram-secret"},
                json={
                    "update_id": 6002,
                    "message": {
                        "message_id": 32,
                        "from": {"id": 999, "first_name": "Long"},
                        "chat": {"id": 123456, "type": "private"},
                        "text": "/mybookings",
                    },
                },
            )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(captured_calls[0]["ai_intent"], "needs_booking_reference")
        self.assertIn("booking reference", communication_service.sent[0]["body"])

    def test_telegram_cancel_slash_marks_cancel_intent_pending(self):
        captured_calls: list[dict[str, object]] = []
        communication_service = _FakeTelegramCommunicationService()

        async def _store_event(_session, **kwargs):
            captured_calls.append(kwargs)

        with patch("api.route_handlers.get_session", _fake_get_session), patch(
            "api.route_handlers.store_event",
            _store_event,
        ):
            app = create_test_app()
            app.state.communication_service = communication_service
            client = TestClient(app)
            response = client.post(
                "/api/webhooks/bookedai-telegram",
                headers={"X-Telegram-Bot-Api-Secret-Token": "telegram-secret"},
                json={
                    "update_id": 6003,
                    "message": {
                        "message_id": 33,
                        "from": {"id": 999, "first_name": "Long"},
                        "chat": {"id": 123456, "type": "private"},
                        "text": "/cancel",
                    },
                },
            )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(captured_calls[0]["ai_intent"], "needs_booking_reference")
        self.assertTrue(captured_calls[0]["metadata"].get("cancel_intent_pending"))
        self.assertIn("cancellation", communication_service.sent[0]["body"])

    def test_telegram_keyboard_button_find_a_service_routes_to_search_prompt(self):
        captured_calls: list[dict[str, object]] = []
        communication_service = _FakeTelegramCommunicationService()

        async def _store_event(_session, **kwargs):
            captured_calls.append(kwargs)

        with patch("api.route_handlers.get_session", _fake_get_session), patch(
            "api.route_handlers.store_event",
            _store_event,
        ):
            app = create_test_app()
            app.state.communication_service = communication_service
            client = TestClient(app)
            response = client.post(
                "/api/webhooks/bookedai-telegram",
                headers={"X-Telegram-Bot-Api-Secret-Token": "telegram-secret"},
                json={
                    "update_id": 6004,
                    "message": {
                        "message_id": 34,
                        "from": {"id": 999, "first_name": "Long"},
                        "chat": {"id": 123456, "type": "private"},
                        "text": "Find a service",
                    },
                },
            )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(captured_calls[0]["ai_intent"], "search_prompt")

    def test_telegram_support_slash_notifies_configured_support_chat(self):
        captured_calls: list[dict[str, object]] = []
        communication_service = _FakeTelegramCommunicationService()

        async def _store_event(_session, **kwargs):
            captured_calls.append(kwargs)

        with patch("api.route_handlers.get_session", _fake_get_session), patch(
            "api.route_handlers.store_event",
            _store_event,
        ):
            app = create_test_app()
            app.state.settings = SimpleNamespace(
                bookedai_customer_telegram_webhook_secret_token="telegram-secret",
                bookedai_customer_telegram_bot_token="customer-bot-token",
                booking_business_email="info@bookedai.au",
                bookedai_support_telegram_chat_ids="999111,888222",
            )
            app.state.communication_service = communication_service
            client = TestClient(app)
            response = client.post(
                "/api/webhooks/bookedai-telegram",
                headers={"X-Telegram-Bot-Api-Secret-Token": "telegram-secret"},
                json={
                    "update_id": 6005,
                    "message": {
                        "message_id": 35,
                        "from": {
                            "id": 999,
                            "first_name": "Long",
                            "username": "longbookedai",
                        },
                        "chat": {"id": 123456, "type": "private"},
                        "text": "/support I need a refund",
                    },
                },
            )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(captured_calls[0]["ai_intent"], "support_handoff")
        self.assertTrue(captured_calls[0]["metadata"].get("human_handoff_requested"))
        # 1 customer-facing reply + 2 support notifications (one per chat id)
        sent_chat_ids = [item["chat_id"] for item in communication_service.sent]
        self.assertIn("123456", sent_chat_ids)
        self.assertIn("999111", sent_chat_ids)
        self.assertIn("888222", sent_chat_ids)
        notify_body = next(
            item["body"] for item in communication_service.sent if item["chat_id"] == "999111"
        )
        self.assertIn("BookedAI support handoff requested", notify_body)
        self.assertIn("@longbookedai", notify_body)
        handoff_meta = captured_calls[0]["metadata"]["lifecycle_updates"]["support_handoff"]
        self.assertEqual(handoff_meta["targets"], 2)

    def test_telegram_support_slash_without_configured_chat_still_replies(self):
        captured_calls: list[dict[str, object]] = []
        communication_service = _FakeTelegramCommunicationService()

        async def _store_event(_session, **kwargs):
            captured_calls.append(kwargs)

        with patch("api.route_handlers.get_session", _fake_get_session), patch(
            "api.route_handlers.store_event",
            _store_event,
        ):
            app = create_test_app()
            app.state.communication_service = communication_service
            client = TestClient(app)
            response = client.post(
                "/api/webhooks/bookedai-telegram",
                headers={"X-Telegram-Bot-Api-Secret-Token": "telegram-secret"},
                json={
                    "update_id": 6006,
                    "message": {
                        "message_id": 36,
                        "from": {"id": 999, "first_name": "Long"},
                        "chat": {"id": 123456, "type": "private"},
                        "text": "Talk to support",
                    },
                },
            )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(captured_calls[0]["ai_intent"], "support_handoff")
        self.assertEqual(len(communication_service.sent), 1)
        self.assertIn("flagged this conversation", communication_service.sent[0]["body"])

    def test_slash_parser_strips_at_botname_suffix(self):
        intent, args = MessagingAutomationService._parse_slash_command(
            "/cancel@BookedAI_Manager_Bot v1-abc123"
        )
        self.assertEqual(intent, "cancel")
        self.assertEqual(args, "v1-abc123")

    def test_slash_parser_returns_args_for_search_command(self):
        intent, args = MessagingAutomationService._parse_slash_command(
            "/search Sydney chess class"
        )
        self.assertEqual(intent, "search")
        self.assertEqual(args, "Sydney chess class")

    def test_slash_parser_returns_empty_args_for_bare_command(self):
        intent, args = MessagingAutomationService._parse_slash_command("/cancel")
        self.assertEqual(intent, "cancel")
        self.assertEqual(args, "")

    def test_welcome_html_escapes_sender_name(self):
        from schemas import TawkMessage

        result = MessagingAutomationService(
            public_search_service=None
        )._build_welcome_result(
            channel="telegram",
            message=TawkMessage(
                conversation_id="telegram:1",
                message_id="1",
                text="/start",
                sender_name="<script>alert(1)</script>",
            ),
            identity_metadata={},
            locale="en",
        )

        self.assertIn("&lt;script&gt;", result.ai_reply)
        self.assertNotIn("<script>", result.ai_reply)

    def test_needs_booking_reference_reply_controls_include_support_button(self):
        controls = MessagingAutomationService._needs_booking_reference_reply_controls(
            locale="en"
        )
        markup = controls["telegram_reply_markup"]
        inline = markup["inline_keyboard"]
        self.assertEqual(inline[0][0]["callback_data"], "/support")
        # Persistent reply keyboard with home options is also present.
        labels = [btn["text"] for row in markup["keyboard"] for btn in row]
        self.assertIn("Find a service", labels)
        self.assertIn("Talk to support", labels)

    def test_telegram_cancel_slash_with_inline_ref_returns_confirm_keyboard(self):
        captured_calls: list[dict[str, object]] = []
        communication_service = _FakeTelegramCommunicationService()

        async def _store_event(_session, **kwargs):
            captured_calls.append(kwargs)

        async def _resolve_customer_care_booking_reference(*_args, **kwargs):
            return {
                "booking_reference": "v1-abc123",
                "resolved_by": "explicit_reference",
                "candidate_count": 1,
            }

        async def _build_portal_customer_care_turn(*_args, **_kwargs):
            return {
                "reply": "Booking found.",
                "next_actions": [
                    {"id": "request_cancel", "enabled": True},
                ],
            }

        with patch("api.route_handlers.get_session", _fake_get_session), patch(
            "api.route_handlers.store_event",
            _store_event,
        ), patch(
            "service_layer.messaging_automation_service.resolve_customer_care_booking_reference",
            _resolve_customer_care_booking_reference,
        ), patch(
            "service_layer.messaging_automation_service.build_portal_customer_care_turn",
            _build_portal_customer_care_turn,
        ):
            app = create_test_app()
            app.state.communication_service = communication_service
            client = TestClient(app)
            response = client.post(
                "/api/webhooks/bookedai-telegram",
                headers={"X-Telegram-Bot-Api-Secret-Token": "telegram-secret"},
                json={
                    "update_id": 6010,
                    "message": {
                        "message_id": 40,
                        "from": {"id": 999, "first_name": "Long"},
                        "chat": {"id": 123456, "type": "private"},
                        "text": "/cancel v1-abc123",
                    },
                },
            )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(captured_calls[0]["ai_intent"], "cancel_confirmation")
        sent_markup = communication_service.sent[0].get("reply_markup") or {}
        rows = sent_markup.get("inline_keyboard") or []
        self.assertEqual(len(rows), 1)
        labels = [btn["text"] for btn in rows[0]]
        self.assertTrue(any("Confirm cancel" in label for label in labels))
        self.assertTrue(any("Keep booking" in label for label in labels))
        callback_values = [btn.get("callback_data") for btn in rows[0]]
        self.assertIn("Cancel current booking v1-abc123", callback_values)
        self.assertIn("Keep current booking v1-abc123", callback_values)

    def test_support_handoff_fanout_runs_concurrently(self):
        import asyncio
        import time

        captured_calls: list[dict[str, object]] = []
        slow_delay = 0.15

        class _SlowTelegramCommunicationService(_FakeTelegramCommunicationService):
            async def send_telegram(self, **kwargs):
                await asyncio.sleep(slow_delay)
                return await super().send_telegram(**kwargs)

        communication_service = _SlowTelegramCommunicationService()

        async def _store_event(_session, **kwargs):
            captured_calls.append(kwargs)

        with patch("api.route_handlers.get_session", _fake_get_session), patch(
            "api.route_handlers.store_event",
            _store_event,
        ):
            app = create_test_app()
            app.state.settings = SimpleNamespace(
                bookedai_customer_telegram_webhook_secret_token="telegram-secret",
                bookedai_customer_telegram_bot_token="customer-bot-token",
                booking_business_email="info@bookedai.au",
                bookedai_support_telegram_chat_ids="111,222,333",
            )
            app.state.communication_service = communication_service
            client = TestClient(app)
            started = time.perf_counter()
            response = client.post(
                "/api/webhooks/bookedai-telegram",
                headers={"X-Telegram-Bot-Api-Secret-Token": "telegram-secret"},
                json={
                    "update_id": 6011,
                    "message": {
                        "message_id": 41,
                        "from": {"id": 999, "first_name": "Long"},
                        "chat": {"id": 123456, "type": "private"},
                        "text": "/support",
                    },
                },
            )
            elapsed = time.perf_counter() - started

        self.assertEqual(response.status_code, 200)
        # 1 customer-facing reply + 3 staff notifications.
        self.assertEqual(len(communication_service.sent), 4)
        # If sequential: ~4 × 0.15 = 0.6s. With gather: ~0.15s + overhead. Allow 0.45s ceiling.
        self.assertLess(elapsed, 0.45, msg=f"fan-out took {elapsed:.3f}s — expected concurrent")

    def test_support_handoff_failure_overrides_reply_with_email_fallback_copy(self):
        captured_calls: list[dict[str, object]] = []
        staff_chat_ids = {"111", "222"}

        class _FailingTelegramCommunicationService(_FakeTelegramCommunicationService):
            async def send_telegram(self, **kwargs):
                self.sent.append(kwargs)
                if str(kwargs.get("chat_id") or "") in staff_chat_ids:
                    raise RuntimeError("staff chat unreachable")
                return SimpleNamespace(
                    provider="telegram_bot",
                    delivery_status="sent",
                    provider_message_id="42",
                    warnings=[],
                )

        communication_service = _FailingTelegramCommunicationService()

        async def _store_event(_session, **kwargs):
            captured_calls.append(kwargs)

        with patch("api.route_handlers.get_session", _fake_get_session), patch(
            "api.route_handlers.store_event",
            _store_event,
        ):
            app = create_test_app()
            app.state.settings = SimpleNamespace(
                bookedai_customer_telegram_webhook_secret_token="telegram-secret",
                bookedai_customer_telegram_bot_token="customer-bot-token",
                booking_business_email="info@bookedai.au",
                bookedai_support_telegram_chat_ids="111,222",
            )
            app.state.communication_service = communication_service
            client = TestClient(app)
            response = client.post(
                "/api/webhooks/bookedai-telegram",
                headers={"X-Telegram-Bot-Api-Secret-Token": "telegram-secret"},
                json={
                    "update_id": 7000,
                    "message": {
                        "message_id": 70,
                        "from": {"id": 999, "first_name": "Long"},
                        "chat": {"id": 123456, "type": "private"},
                        "text": "/support",
                    },
                },
            )

        self.assertEqual(response.status_code, 200)
        # Customer reply is the message routed to the conversation chat_id (123456).
        customer_reply = next(
            item for item in communication_service.sent if str(item["chat_id"]) == "123456"
        )
        self.assertIn("couldn't reach", customer_reply["body"])
        # Lifecycle metadata records the fan-out failure.
        handoff = captured_calls[0]["metadata"]["lifecycle_updates"]["support_handoff"]
        self.assertEqual(handoff["targets"], 2)
        self.assertEqual(handoff["delivered_count"], 0)
        self.assertTrue(handoff["all_failed"])
        # The metadata also flags the failure so admin tools can surface it.
        self.assertTrue(captured_calls[0]["metadata"].get("support_handoff_failed"))
        self.assertEqual(
            captured_calls[0]["metadata"]["customer_care_status"], "support_handoff_failed"
        )

    def test_support_handoff_is_debounced_within_5_minutes(self):
        from service_layer.messaging_automation_service import MessagingAutomationService
        from datetime import datetime, timedelta, UTC

        # Simulate a stored session with a recent handoff timestamp.
        recent_iso = datetime.now(UTC).isoformat()
        stale_iso = (datetime.now(UTC) - timedelta(seconds=400)).isoformat()

        self.assertTrue(
            MessagingAutomationService._is_support_handoff_recent(
                {"support_handoff_recorded_at": recent_iso}
            )
        )
        self.assertFalse(
            MessagingAutomationService._is_support_handoff_recent(
                {"support_handoff_recorded_at": stale_iso}
            )
        )
        self.assertFalse(MessagingAutomationService._is_support_handoff_recent({}))
        self.assertFalse(MessagingAutomationService._is_support_handoff_recent(None))

    def test_support_handoff_recent_result_skips_fanout_and_uses_debounce_copy(self):
        from service_layer.messaging_automation_service import MessagingAutomationService

        result = MessagingAutomationService(
            public_search_service=None
        )._build_support_handoff_recent_result(
            channel="telegram",
            identity_metadata={},
            locale="en",
        )

        self.assertEqual(result.ai_intent, "support_handoff_recent")
        self.assertFalse(result.metadata.get("human_handoff_requested"))
        self.assertTrue(result.metadata.get("support_handoff_debounced"))
        self.assertIn("already pinged", result.ai_reply)

    def test_recent_booking_reference_helper_respects_ttl(self):
        from service_layer.messaging_automation_service import MessagingAutomationService
        from datetime import datetime, timedelta, UTC

        recent_iso = datetime.now(UTC).isoformat()
        stale_iso = (
            datetime.now(UTC)
            - timedelta(seconds=MessagingAutomationService.RECENT_BOOKING_REFERENCE_TTL_SECONDS + 60)
        ).isoformat()

        self.assertEqual(
            MessagingAutomationService._recent_booking_reference(
                {
                    "recent_booking_reference": "v1-abc123",
                    "recent_booking_recorded_at": recent_iso,
                }
            ),
            "v1-abc123",
        )
        self.assertIsNone(
            MessagingAutomationService._recent_booking_reference(
                {
                    "recent_booking_reference": "v1-abc123",
                    "recent_booking_recorded_at": stale_iso,
                }
            )
        )
        # missing timestamp → assume recent (graceful)
        self.assertEqual(
            MessagingAutomationService._recent_booking_reference(
                {"recent_booking_reference": "v1-abc123"}
            ),
            "v1-abc123",
        )
        self.assertIsNone(MessagingAutomationService._recent_booking_reference({}))
        self.assertIsNone(MessagingAutomationService._recent_booking_reference(None))

    def test_telegram_mybookings_slash_auto_pulls_recent_booking_when_known(self):
        captured_calls: list[dict[str, object]] = []
        communication_service = _FakeTelegramCommunicationService()

        async def _store_event(_session, **kwargs):
            captured_calls.append(kwargs)

        async def _fake_load_channel_session_state(*_args, **_kwargs):
            from datetime import datetime, UTC

            return {
                "service_search_query": None,
                "service_options": [],
                "reply_controls": {},
                "customer_identity": {},
                "session_metadata": {
                    "recent_booking_reference": "v1-abc123",
                    "recent_booking_recorded_at": datetime.now(UTC).isoformat(),
                },
                "tenant_id": None,
            }

        async def _resolve_customer_care_booking_reference(*_args, **_kwargs):
            return {
                "booking_reference": "v1-abc123",
                "resolved_by": "explicit_reference",
                "candidate_count": 1,
            }

        async def _build_portal_customer_care_turn(*_args, **_kwargs):
            return {
                "reply": "Booking v1-abc123 — Sydney chess class on Sat 14:00.",
                "next_actions": [
                    {"id": "request_cancel", "enabled": True},
                    {"id": "request_reschedule", "enabled": True},
                ],
            }

        with patch("api.route_handlers.get_session", _fake_get_session), patch(
            "api.route_handlers.store_event",
            _store_event,
        ), patch(
            "service_layer.messaging_automation_service.MessagingAutomationService._load_channel_session_state",
            _fake_load_channel_session_state,
        ), patch(
            "service_layer.messaging_automation_service.resolve_customer_care_booking_reference",
            _resolve_customer_care_booking_reference,
        ), patch(
            "service_layer.messaging_automation_service.build_portal_customer_care_turn",
            _build_portal_customer_care_turn,
        ):
            app = create_test_app()
            app.state.communication_service = communication_service
            client = TestClient(app)
            response = client.post(
                "/api/webhooks/bookedai-telegram",
                headers={"X-Telegram-Bot-Api-Secret-Token": "telegram-secret"},
                json={
                    "update_id": 8000,
                    "message": {
                        "message_id": 80,
                        "from": {"id": 999, "first_name": "Long"},
                        "chat": {"id": 123456, "type": "private"},
                        "text": "/mybookings",
                    },
                },
            )

        self.assertEqual(response.status_code, 200)
        # Auto-pull → care turn fires → ai_intent="answered" with booking-care reply.
        self.assertEqual(captured_calls[0]["ai_intent"], "answered")
        self.assertEqual(
            captured_calls[0]["metadata"]["booking_reference"], "v1-abc123"
        )
        self.assertIn("v1-abc123", communication_service.sent[0]["body"])

    def test_telegram_mybookings_slash_falls_back_to_prompt_when_no_recent_booking(self):
        captured_calls: list[dict[str, object]] = []
        communication_service = _FakeTelegramCommunicationService()

        async def _store_event(_session, **kwargs):
            captured_calls.append(kwargs)

        # Default _fake_load returns empty session_metadata, so should fall back to prompt.

        with patch("api.route_handlers.get_session", _fake_get_session), patch(
            "api.route_handlers.store_event",
            _store_event,
        ):
            app = create_test_app()
            app.state.communication_service = communication_service
            client = TestClient(app)
            response = client.post(
                "/api/webhooks/bookedai-telegram",
                headers={"X-Telegram-Bot-Api-Secret-Token": "telegram-secret"},
                json={
                    "update_id": 8001,
                    "message": {
                        "message_id": 81,
                        "from": {"id": 999, "first_name": "Long"},
                        "chat": {"id": 123456, "type": "private"},
                        "text": "/mybookings",
                    },
                },
            )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(captured_calls[0]["ai_intent"], "needs_booking_reference")

    def test_telegram_change_time_callback_shows_reschedule_date_picker(self):
        captured_calls: list[dict[str, object]] = []
        communication_service = _FakeTelegramCommunicationService()

        async def _store_event(_session, **kwargs):
            captured_calls.append(kwargs)

        with patch("api.route_handlers.get_session", _fake_get_session), patch(
            "api.route_handlers.store_event",
            _store_event,
        ):
            app = create_test_app()
            app.state.communication_service = communication_service
            client = TestClient(app)
            response = client.post(
                "/api/webhooks/bookedai-telegram",
                headers={"X-Telegram-Bot-Api-Secret-Token": "telegram-secret"},
                json={
                    "callback_query": {
                        "id": "cb-rsch-1",
                        "from": {"id": 999, "first_name": "Long"},
                        "data": "reschedule:date:v1-rsch001",
                        "message": {
                            "message_id": 81,
                            "chat": {"id": 123456, "type": "private"},
                            "text": "Pending booking menu",
                        },
                    }
                },
            )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(captured_calls[0]["ai_intent"], "reschedule_date_picker")
        body = communication_service.sent[0]["body"]
        self.assertIn("v1-rsch001", body)
        self.assertIn("Pick a new date", body)
        keyboard = communication_service.sent[0]["reply_markup"]["inline_keyboard"]
        self.assertGreaterEqual(len(keyboard), 4)
        first_button = keyboard[0][0]
        self.assertTrue(
            first_button["callback_data"].startswith("reschedule:time:v1-rsch001:")
        )
        back_button = keyboard[-1][0]
        self.assertEqual(back_button["callback_data"], "Keep current booking v1-rsch001")

    def test_telegram_reschedule_date_pick_shows_time_picker(self):
        captured_calls: list[dict[str, object]] = []
        communication_service = _FakeTelegramCommunicationService()

        async def _store_event(_session, **kwargs):
            captured_calls.append(kwargs)

        with patch("api.route_handlers.get_session", _fake_get_session), patch(
            "api.route_handlers.store_event",
            _store_event,
        ):
            app = create_test_app()
            app.state.communication_service = communication_service
            client = TestClient(app)
            response = client.post(
                "/api/webhooks/bookedai-telegram",
                headers={"X-Telegram-Bot-Api-Secret-Token": "telegram-secret"},
                json={
                    "callback_query": {
                        "id": "cb-rsch-2",
                        "from": {"id": 999, "first_name": "Long"},
                        "data": "reschedule:time:v1-rsch001:2026-04-29",
                        "message": {
                            "message_id": 82,
                            "chat": {"id": 123456, "type": "private"},
                            "text": "Pick a date",
                        },
                    }
                },
            )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(captured_calls[0]["ai_intent"], "reschedule_time_picker")
        body = communication_service.sent[0]["body"]
        self.assertIn("2026-04-29", body)
        self.assertIn("v1-rsch001", body)
        keyboard = communication_service.sent[0]["reply_markup"]["inline_keyboard"]
        time_buttons = [
            button for row in keyboard for button in row
            if button["callback_data"].startswith("reschedule:confirm:")
        ]
        self.assertEqual(len(time_buttons), 4)
        for button in time_buttons:
            self.assertIn("v1-rsch001:2026-04-29:", button["callback_data"])

    def test_telegram_reschedule_confirm_queues_portal_request(self):
        captured_calls: list[dict[str, object]] = []
        communication_service = _FakeTelegramCommunicationService()
        captured_queue_calls: list[dict[str, object]] = []

        async def _store_event(_session, **kwargs):
            captured_calls.append(kwargs)

        async def _queue_portal_booking_request(*_args, **kwargs):
            captured_queue_calls.append(kwargs)
            return {
                "request_type": "reschedule_request",
                "booking_reference": kwargs.get("booking_reference"),
                "preferred_date": kwargs.get("preferred_date"),
                "preferred_time": kwargs.get("preferred_time"),
                "message": "Reschedule request queued.",
            }

        with patch("api.route_handlers.get_session", _fake_get_session), patch(
            "api.route_handlers.store_event",
            _store_event,
        ), patch(
            "service_layer.messaging_automation_service.queue_portal_booking_request",
            _queue_portal_booking_request,
        ):
            app = create_test_app()
            app.state.communication_service = communication_service
            client = TestClient(app)
            response = client.post(
                "/api/webhooks/bookedai-telegram",
                headers={"X-Telegram-Bot-Api-Secret-Token": "telegram-secret"},
                json={
                    "callback_query": {
                        "id": "cb-rsch-3",
                        "from": {"id": 999, "first_name": "Long"},
                        "data": "reschedule:confirm:v1-rsch001:2026-04-29:18:00",
                        "message": {
                            "message_id": 83,
                            "chat": {"id": 123456, "type": "private"},
                            "text": "Pick a time",
                        },
                    }
                },
            )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(captured_calls[0]["ai_intent"], "reschedule_confirmed")
        self.assertEqual(len(captured_queue_calls), 1)
        self.assertEqual(captured_queue_calls[0]["booking_reference"], "v1-rsch001")
        self.assertEqual(captured_queue_calls[0]["preferred_date"], "2026-04-29")
        self.assertEqual(captured_queue_calls[0]["preferred_time"], "18:00")
        self.assertEqual(captured_queue_calls[0]["request_type"], "reschedule_request")
        body = communication_service.sent[0]["body"]
        self.assertIn("v1-rsch001", body)
        self.assertIn("2026-04-29 18:00", body)

    def test_telegram_reschedule_picker_localized_for_vietnamese(self):
        captured_calls: list[dict[str, object]] = []
        communication_service = _FakeTelegramCommunicationService()

        async def _store_event(_session, **kwargs):
            captured_calls.append(kwargs)

        with patch("api.route_handlers.get_session", _fake_get_session), patch(
            "api.route_handlers.store_event",
            _store_event,
        ):
            app = create_test_app()
            app.state.communication_service = communication_service
            client = TestClient(app)
            response = client.post(
                "/api/webhooks/bookedai-telegram",
                headers={"X-Telegram-Bot-Api-Secret-Token": "telegram-secret"},
                json={
                    "callback_query": {
                        "id": "cb-rsch-vi",
                        "from": {"id": 999, "first_name": "Long", "language_code": "vi"},
                        "data": "reschedule:date:v1-rsch002",
                        "message": {
                            "message_id": 84,
                            "chat": {"id": 123456, "type": "private"},
                            "text": "Pending menu",
                        },
                    }
                },
            )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(captured_calls[0]["metadata"]["locale"], "vi")
        body = communication_service.sent[0]["body"]
        self.assertIn("Chọn ngày mới", body)

    def test_telegram_pending_booking_change_time_uses_reschedule_callback(self):
        controls = MessagingAutomationService._booking_care_reply_controls(
            "v1-pending999",
            new_booking_query="Chess class",
        )
        keyboard = controls["telegram_reply_markup"]["inline_keyboard"]
        change_time_button = keyboard[3][0]
        self.assertEqual(change_time_button["text"], "Change time")
        self.assertEqual(
            change_time_button["callback_data"], "reschedule:date:v1-pending999"
        )

    def test_telegram_reschedule_callback_parser_handles_time_with_colon(self):
        parsed = MessagingAutomationService._parse_reschedule_picker_callback(
            "reschedule:confirm:v1-abc:2026-04-29:18:00"
        )
        self.assertEqual(parsed, ("confirm", "v1-abc", "2026-04-29", "18:00"))

    def test_telegram_booking_with_stripe_configured_adds_pay_now_button(self):
        captured_calls: list[dict[str, object]] = []
        communication_service = _FakeTelegramCommunicationService()
        email_service = _FakeEmailService(configured=False)

        async def _store_event(_session, **kwargs):
            captured_calls.append(kwargs)

        async def _resolve_customer_care_booking_reference(*_args, **_kwargs):
            return {"booking_reference": None, "resolved_by": "no_safe_match", "candidate_count": 0}

        async def _try_create_chat_booking_intent(*_args, **_kwargs):
            return MessagingAutomationResult(
                ai_reply=(
                    "<b>BookedAI.au: booking request started</b>\n"
                    "<b>Reference</b>: <code>v1-pay001</code>"
                ),
                ai_intent="booking_intent_captured",
                workflow_status="answered",
                metadata={
                    "messaging_layer": {"channel": "telegram"},
                    "customer_care_status": "booking_intent_captured",
                    "booking_reference": "v1-pay001",
                    "locale": "en",
                    "booking_intent": {
                        "booking_reference": "v1-pay001",
                        "tenant_id": "tenant-chess",
                        "booking_intent_id": "bi-pay-001",
                        "service_name": "Chess pilot class",
                        "customer_email": "long@example.com",
                        "amount_aud": 30.0,
                        "currency_code": "AUD",
                    },
                    "reply_controls": {
                        "telegram_reply_markup": {
                            "inline_keyboard": [
                                [{"text": "View booking", "url": "https://portal.bookedai.au/?booking_reference=v1-pay001"}]
                            ]
                        },
                        "telegram_parse_mode": "HTML",
                    },
                },
            )

        async def _orchestrate_booking_followup_sync(*_args, **_kwargs):
            return SimpleNamespace(
                deal_record_id=71, deal_sync_status="pending", deal_external_entity_id=None,
                task_record_id=72, task_sync_status="pending", task_external_entity_id=None,
                warning_codes=[],
            )

        stripe_call_log: list[dict[str, object]] = []

        class _FakeStripeResponse:
            status_code = 200
            content = b"x"
            def raise_for_status(self): return None
            def json(self):
                return {"id": "cs_test_abc", "url": "https://checkout.stripe.com/c/pay/cs_test_abc"}

        class _FakeAsyncClient:
            def __init__(self, *args, **kwargs): pass
            async def __aenter__(self): return self
            async def __aexit__(self, *args): return False
            async def post(self, url, headers=None, content=None, **kwargs):
                stripe_call_log.append({"url": url, "headers": headers, "content": content})
                return _FakeStripeResponse()

        with patch("api.route_handlers.get_session", _fake_get_session), patch(
            "api.route_handlers.store_event", _store_event,
        ), patch(
            "service_layer.messaging_automation_service.resolve_customer_care_booking_reference",
            _resolve_customer_care_booking_reference,
        ), patch(
            "api.route_handlers.MessagingAutomationService.handle_customer_message",
            _try_create_chat_booking_intent,
        ), patch(
            "api.route_handlers.orchestrate_booking_followup_sync",
            _orchestrate_booking_followup_sync,
        ), patch(
            "api.route_handlers.httpx.AsyncClient",
            _FakeAsyncClient,
        ):
            app = create_test_app()
            app.state.settings = SimpleNamespace(
                bookedai_customer_telegram_webhook_secret_token="telegram-secret",
                bookedai_customer_telegram_bot_token="customer-bot-token",
                booking_business_email="info@bookedai.au",
                stripe_secret_key="sk_test_abc",
                stripe_currency="AUD",
            )
            app.state.communication_service = communication_service
            app.state.email_service = email_service
            client = TestClient(app)
            response = client.post(
                "/api/webhooks/bookedai-telegram",
                headers={"X-Telegram-Bot-Api-Secret-Token": "telegram-secret"},
                json={
                    "update_id": 9001,
                    "message": {
                        "message_id": 91,
                        "from": {"id": 999, "first_name": "Long"},
                        "chat": {"id": 123456, "type": "private"},
                        "text": "Book 1 for Long long@example.com tomorrow 4pm",
                    },
                },
            )

        self.assertEqual(response.status_code, 200)
        keyboard = communication_service.sent[0]["reply_markup"]["inline_keyboard"]
        pay_button = keyboard[0][0]
        self.assertIn("Pay AUD", pay_button["text"])
        self.assertEqual(pay_button["url"], "https://checkout.stripe.com/c/pay/cs_test_abc")
        self.assertEqual(len(stripe_call_log), 1)
        body_bytes = stripe_call_log[0]["content"]
        body = body_bytes.decode() if isinstance(body_bytes, (bytes, bytearray)) else str(body_bytes)
        from urllib.parse import parse_qs
        parsed_form = parse_qs(body)
        self.assertEqual(parsed_form.get("mode"), ["payment"])
        self.assertEqual(parsed_form.get("line_items[0][price_data][unit_amount]"), ["3000"])
        self.assertEqual(parsed_form.get("client_reference_id"), ["v1-pay001"])
        self.assertEqual(parsed_form.get("metadata[source]"), ["telegram_manager_bot"])
        self.assertIn("https://checkout.stripe.com/c/pay/cs_test_abc", communication_service.sent[0]["body"])
        lifecycle = captured_calls[0]["metadata"]["lifecycle_updates"]
        self.assertEqual(
            lifecycle["stripe_checkout"]["checkout_url"],
            "https://checkout.stripe.com/c/pay/cs_test_abc",
        )
        self.assertEqual(lifecycle["stripe_checkout"]["external_session_id"], "cs_test_abc")

    def test_telegram_booking_without_stripe_secret_falls_back_to_no_pay_button(self):
        captured_calls: list[dict[str, object]] = []
        communication_service = _FakeTelegramCommunicationService()
        email_service = _FakeEmailService(configured=False)

        async def _store_event(_session, **kwargs):
            captured_calls.append(kwargs)

        async def _resolve_customer_care_booking_reference(*_args, **_kwargs):
            return {"booking_reference": None, "resolved_by": "no_safe_match", "candidate_count": 0}

        async def _try_create_chat_booking_intent(*_args, **_kwargs):
            return MessagingAutomationResult(
                ai_reply="Booking captured",
                ai_intent="booking_intent_captured",
                workflow_status="answered",
                metadata={
                    "messaging_layer": {"channel": "telegram"},
                    "customer_care_status": "booking_intent_captured",
                    "booking_reference": "v1-pay002",
                    "locale": "en",
                    "booking_intent": {
                        "booking_reference": "v1-pay002",
                        "tenant_id": "tenant-chess",
                        "service_name": "Chess pilot class",
                        "customer_email": "long@example.com",
                        "amount_aud": 30.0,
                    },
                    "reply_controls": {
                        "telegram_reply_markup": {
                            "inline_keyboard": [
                                [{"text": "View booking", "url": "https://portal.bookedai.au/?booking_reference=v1-pay002"}]
                            ]
                        },
                        "telegram_parse_mode": "HTML",
                    },
                },
            )

        async def _orchestrate_booking_followup_sync(*_args, **_kwargs):
            return SimpleNamespace(
                deal_record_id=71, deal_sync_status="pending", deal_external_entity_id=None,
                task_record_id=72, task_sync_status="pending", task_external_entity_id=None,
                warning_codes=[],
            )

        with patch("api.route_handlers.get_session", _fake_get_session), patch(
            "api.route_handlers.store_event", _store_event,
        ), patch(
            "service_layer.messaging_automation_service.resolve_customer_care_booking_reference",
            _resolve_customer_care_booking_reference,
        ), patch(
            "api.route_handlers.MessagingAutomationService.handle_customer_message",
            _try_create_chat_booking_intent,
        ), patch(
            "api.route_handlers.orchestrate_booking_followup_sync",
            _orchestrate_booking_followup_sync,
        ):
            app = create_test_app()
            # No stripe_secret_key configured
            app.state.communication_service = communication_service
            app.state.email_service = email_service
            client = TestClient(app)
            response = client.post(
                "/api/webhooks/bookedai-telegram",
                headers={"X-Telegram-Bot-Api-Secret-Token": "telegram-secret"},
                json={
                    "update_id": 9002,
                    "message": {
                        "message_id": 92,
                        "from": {"id": 999, "first_name": "Long"},
                        "chat": {"id": 123456, "type": "private"},
                        "text": "Book 1 for Long long@example.com tomorrow 4pm",
                    },
                },
            )

        self.assertEqual(response.status_code, 200)
        keyboard = communication_service.sent[0]["reply_markup"]["inline_keyboard"]
        self.assertEqual(keyboard[0][0]["text"], "View booking")
        self.assertNotIn("checkout.stripe.com", communication_service.sent[0]["body"])
        lifecycle = captured_calls[0]["metadata"]["lifecycle_updates"]
        self.assertNotIn("stripe_checkout", lifecycle)

    def test_telegram_booking_pay_button_localized_for_vietnamese(self):
        captured_calls: list[dict[str, object]] = []
        communication_service = _FakeTelegramCommunicationService()
        email_service = _FakeEmailService(configured=False)

        async def _store_event(_session, **kwargs):
            captured_calls.append(kwargs)

        async def _resolve_customer_care_booking_reference(*_args, **_kwargs):
            return {"booking_reference": None, "resolved_by": "no_safe_match", "candidate_count": 0}

        async def _try_create_chat_booking_intent(*_args, **_kwargs):
            return MessagingAutomationResult(
                ai_reply="Booking captured",
                ai_intent="booking_intent_captured",
                workflow_status="answered",
                metadata={
                    "messaging_layer": {"channel": "telegram"},
                    "customer_care_status": "booking_intent_captured",
                    "booking_reference": "v1-pay003",
                    "locale": "vi",
                    "booking_intent": {
                        "booking_reference": "v1-pay003",
                        "tenant_id": "tenant-chess",
                        "service_name": "Lớp cờ vua",
                        "customer_email": "long@example.com",
                        "amount_aud": 30.0,
                    },
                    "reply_controls": {
                        "telegram_reply_markup": {"inline_keyboard": []},
                        "telegram_parse_mode": "HTML",
                    },
                },
            )

        async def _orchestrate_booking_followup_sync(*_args, **_kwargs):
            return SimpleNamespace(
                deal_record_id=71, deal_sync_status="pending", deal_external_entity_id=None,
                task_record_id=72, task_sync_status="pending", task_external_entity_id=None,
                warning_codes=[],
            )

        class _FakeStripeResponse:
            status_code = 200
            content = b"x"
            def raise_for_status(self): return None
            def json(self):
                return {"id": "cs_test_vi", "url": "https://checkout.stripe.com/c/pay/cs_test_vi"}

        class _FakeAsyncClient:
            def __init__(self, *args, **kwargs): pass
            async def __aenter__(self): return self
            async def __aexit__(self, *args): return False
            async def post(self, *args, **kwargs): return _FakeStripeResponse()

        with patch("api.route_handlers.get_session", _fake_get_session), patch(
            "api.route_handlers.store_event", _store_event,
        ), patch(
            "service_layer.messaging_automation_service.resolve_customer_care_booking_reference",
            _resolve_customer_care_booking_reference,
        ), patch(
            "api.route_handlers.MessagingAutomationService.handle_customer_message",
            _try_create_chat_booking_intent,
        ), patch(
            "api.route_handlers.orchestrate_booking_followup_sync",
            _orchestrate_booking_followup_sync,
        ), patch(
            "api.route_handlers.httpx.AsyncClient",
            _FakeAsyncClient,
        ):
            app = create_test_app()
            app.state.settings = SimpleNamespace(
                bookedai_customer_telegram_webhook_secret_token="telegram-secret",
                bookedai_customer_telegram_bot_token="customer-bot-token",
                booking_business_email="info@bookedai.au",
                stripe_secret_key="sk_test_abc",
                stripe_currency="AUD",
            )
            app.state.communication_service = communication_service
            app.state.email_service = email_service
            client = TestClient(app)
            response = client.post(
                "/api/webhooks/bookedai-telegram",
                headers={"X-Telegram-Bot-Api-Secret-Token": "telegram-secret"},
                json={
                    "update_id": 9003,
                    "message": {
                        "message_id": 93,
                        "from": {"id": 999, "first_name": "Long", "language_code": "vi"},
                        "chat": {"id": 123456, "type": "private"},
                        "text": "Book 1 for Long long@example.com",
                    },
                },
            )

        self.assertEqual(response.status_code, 200)
        keyboard = communication_service.sent[0]["reply_markup"]["inline_keyboard"]
        pay_button = keyboard[0][0]
        self.assertIn("Thanh toán", pay_button["text"])
        self.assertIn("Thanh toán ngay", communication_service.sent[0]["body"])

    def test_telegram_booking_stripe_api_failure_falls_back_gracefully(self):
        captured_calls: list[dict[str, object]] = []
        communication_service = _FakeTelegramCommunicationService()
        email_service = _FakeEmailService(configured=False)

        async def _store_event(_session, **kwargs):
            captured_calls.append(kwargs)

        async def _resolve_customer_care_booking_reference(*_args, **_kwargs):
            return {"booking_reference": None, "resolved_by": "no_safe_match", "candidate_count": 0}

        async def _try_create_chat_booking_intent(*_args, **_kwargs):
            return MessagingAutomationResult(
                ai_reply="Booking captured",
                ai_intent="booking_intent_captured",
                workflow_status="answered",
                metadata={
                    "messaging_layer": {"channel": "telegram"},
                    "customer_care_status": "booking_intent_captured",
                    "booking_reference": "v1-pay004",
                    "locale": "en",
                    "booking_intent": {
                        "booking_reference": "v1-pay004",
                        "tenant_id": "tenant-chess",
                        "service_name": "Chess",
                        "customer_email": "long@example.com",
                        "amount_aud": 30.0,
                    },
                    "reply_controls": {
                        "telegram_reply_markup": {
                            "inline_keyboard": [[{"text": "View booking", "url": "https://portal.bookedai.au/?booking_reference=v1-pay004"}]]
                        },
                        "telegram_parse_mode": "HTML",
                    },
                },
            )

        async def _orchestrate_booking_followup_sync(*_args, **_kwargs):
            return SimpleNamespace(
                deal_record_id=71, deal_sync_status="pending", deal_external_entity_id=None,
                task_record_id=72, task_sync_status="pending", task_external_entity_id=None,
                warning_codes=[],
            )

        class _FakeAsyncClient:
            def __init__(self, *args, **kwargs): pass
            async def __aenter__(self): return self
            async def __aexit__(self, *args): return False
            async def post(self, *args, **kwargs):
                raise RuntimeError("Stripe is down")

        with patch("api.route_handlers.get_session", _fake_get_session), patch(
            "api.route_handlers.store_event", _store_event,
        ), patch(
            "service_layer.messaging_automation_service.resolve_customer_care_booking_reference",
            _resolve_customer_care_booking_reference,
        ), patch(
            "api.route_handlers.MessagingAutomationService.handle_customer_message",
            _try_create_chat_booking_intent,
        ), patch(
            "api.route_handlers.orchestrate_booking_followup_sync",
            _orchestrate_booking_followup_sync,
        ), patch(
            "api.route_handlers.httpx.AsyncClient",
            _FakeAsyncClient,
        ):
            app = create_test_app()
            app.state.settings = SimpleNamespace(
                bookedai_customer_telegram_webhook_secret_token="telegram-secret",
                bookedai_customer_telegram_bot_token="customer-bot-token",
                booking_business_email="info@bookedai.au",
                stripe_secret_key="sk_test_abc",
                stripe_currency="AUD",
            )
            app.state.communication_service = communication_service
            app.state.email_service = email_service
            client = TestClient(app)
            response = client.post(
                "/api/webhooks/bookedai-telegram",
                headers={"X-Telegram-Bot-Api-Secret-Token": "telegram-secret"},
                json={
                    "update_id": 9004,
                    "message": {
                        "message_id": 94,
                        "from": {"id": 999, "first_name": "Long"},
                        "chat": {"id": 123456, "type": "private"},
                        "text": "Book 1 for Long long@example.com",
                    },
                },
            )

        self.assertEqual(response.status_code, 200)
        keyboard = communication_service.sent[0]["reply_markup"]["inline_keyboard"]
        self.assertEqual(keyboard[0][0]["text"], "View booking")
        lifecycle = captured_calls[0]["metadata"]["lifecycle_updates"]
        self.assertNotIn("stripe_checkout", lifecycle)

    def test_handoff_claimed_active_suppresses_normal_bot_branches(self):
        from datetime import UTC, datetime

        captured_calls: list[dict[str, object]] = []
        communication_service = _FakeTelegramCommunicationService()

        async def _store_event(_session, **kwargs):
            captured_calls.append(kwargs)

        async def _fake_load_channel_session_state(*_args, **_kwargs):
            return {
                "service_search_query": None,
                "service_options": [],
                "reply_controls": {},
                "customer_identity": {},
                "session_metadata": {
                    "handoff_claimed_at": datetime.now(UTC).isoformat(),
                    "handoff_claimed_by": "admin",
                },
                "tenant_id": None,
            }

        with patch("api.route_handlers.get_session", _fake_get_session), patch(
            "api.route_handlers.store_event",
            _store_event,
        ), patch(
            "service_layer.messaging_automation_service.MessagingAutomationService._load_channel_session_state",
            _fake_load_channel_session_state,
        ):
            app = create_test_app()
            app.state.communication_service = communication_service
            client = TestClient(app)
            response = client.post(
                "/api/webhooks/bookedai-telegram",
                headers={"X-Telegram-Bot-Api-Secret-Token": "telegram-secret"},
                json={
                    "update_id": 12001,
                    "message": {
                        "message_id": 101,
                        "from": {"id": 999, "first_name": "Long"},
                        "chat": {"id": 123456, "type": "private"},
                        "text": "/cancel v1-abc123",
                    },
                },
            )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(captured_calls[0]["ai_intent"], "handoff_claimed_active")
        self.assertTrue(captured_calls[0]["metadata"].get("human_handoff_active"))
        self.assertEqual(captured_calls[0]["metadata"].get("human_handoff_claimed_by"), "admin")
        self.assertIsNone(communication_service.sent[0].get("reply_markup"))

    def test_handoff_claimed_stale_does_not_suppress_after_ttl(self):
        from datetime import UTC, datetime, timedelta

        from service_layer.messaging_automation_service import MessagingAutomationService

        stale = (
            datetime.now(UTC)
            - timedelta(seconds=MessagingAutomationService.HANDOFF_CLAIMED_TTL_SECONDS + 60)
        ).isoformat()

        self.assertFalse(MessagingAutomationService._is_handoff_claimed({"handoff_claimed_at": stale}))
        self.assertTrue(
            MessagingAutomationService._is_handoff_claimed(
                {"handoff_claimed_at": datetime.now(UTC).isoformat()}
            )
        )
        self.assertFalse(MessagingAutomationService._is_handoff_claimed({}))
        self.assertFalse(MessagingAutomationService._is_handoff_claimed(None))

    def test_telegram_group_chat_without_mention_is_ignored(self):
        communication_service = _FakeTelegramCommunicationService()

        app = create_test_app()
        app.state.communication_service = communication_service
        client = TestClient(app)
        response = client.post(
            "/api/webhooks/bookedai-telegram",
            headers={"X-Telegram-Bot-Api-Secret-Token": "telegram-secret"},
            json={
                "update_id": 12002,
                "message": {
                    "message_id": 102,
                    "from": {"id": 999, "first_name": "Long"},
                    "chat": {"id": -1001234567890, "type": "supergroup"},
                    "text": "Hey everyone, what's for lunch?",
                },
            },
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["status"], "ignored")
        self.assertEqual(response.json()["messages_processed"], 0)
        self.assertEqual(response.json()["reason"], "group_no_mention")
        self.assertEqual(communication_service.sent, [])

    def test_telegram_group_chat_with_mention_entity_is_handled(self):
        captured_calls: list[dict[str, object]] = []
        communication_service = _FakeTelegramCommunicationService()

        async def _store_event(_session, **kwargs):
            captured_calls.append(kwargs)

        async def _resolve_customer_care_booking_reference(*_args, **_kwargs):
            return {"booking_reference": None, "resolved_by": "no_safe_match", "candidate_count": 0}

        with patch("api.route_handlers.get_session", _fake_get_session), patch(
            "api.route_handlers.store_event",
            _store_event,
        ), patch(
            "service_layer.messaging_automation_service.resolve_customer_care_booking_reference",
            _resolve_customer_care_booking_reference,
        ):
            app = create_test_app()
            app.state.communication_service = communication_service
            client = TestClient(app)
            response = client.post(
                "/api/webhooks/bookedai-telegram",
                headers={"X-Telegram-Bot-Api-Secret-Token": "telegram-secret"},
                json={
                    "update_id": 12003,
                    "message": {
                        "message_id": 103,
                        "from": {"id": 999, "first_name": "Long"},
                        "chat": {"id": -1001234567890, "type": "supergroup"},
                        "text": "@BookedAI_Manager_Bot find a chess class in Sydney",
                        "entities": [{"type": "mention", "offset": 0, "length": 21}],
                    },
                },
            )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["messages_processed"], 1)
        self.assertTrue(captured_calls[0]["metadata"]["is_group_chat"])
        self.assertEqual(captured_calls[0]["metadata"]["addressed_via"], "mention_entity")

    def test_telegram_group_chat_strips_persistent_keyboard_from_reply(self):
        communication_service = _FakeTelegramCommunicationService()

        with patch("api.route_handlers.get_session", _fake_get_session):
            app = create_test_app()
            app.state.communication_service = communication_service
            client = TestClient(app)
            response = client.post(
                "/api/webhooks/bookedai-telegram",
                headers={"X-Telegram-Bot-Api-Secret-Token": "telegram-secret"},
                json={
                    "update_id": 12004,
                    "message": {
                        "message_id": 104,
                        "from": {"id": 999, "first_name": "Long", "language_code": "en-AU"},
                        "chat": {"id": -1001234567890, "type": "supergroup"},
                        "text": "/start@BookedAI_Manager_Bot",
                        "entities": [{"type": "bot_command", "offset": 0, "length": 28}],
                    },
                },
            )

        self.assertEqual(response.status_code, 200)
        markup = communication_service.sent[0].get("reply_markup")
        if markup is not None:
            self.assertNotIn("keyboard", markup)
            self.assertNotIn("is_persistent", markup)

    def test_telegram_channel_chat_is_ignored(self):
        communication_service = _FakeTelegramCommunicationService()

        app = create_test_app()
        app.state.communication_service = communication_service
        client = TestClient(app)
        response = client.post(
            "/api/webhooks/bookedai-telegram",
            headers={"X-Telegram-Bot-Api-Secret-Token": "telegram-secret"},
            json={
                "update_id": 12005,
                "message": {
                    "message_id": 105,
                    "chat": {"id": -1009999999999, "type": "channel"},
                    "text": "Channel broadcast message",
                },
            },
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["status"], "ignored")
        self.assertEqual(response.json()["messages_processed"], 0)
        self.assertEqual(response.json()["reason"], "channel_broadcast_no_reply")
        self.assertEqual(communication_service.sent, [])
