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
    yield SimpleNamespace(execute=_fake_execute, commit=_async_noop)


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
            "service_layer.messaging_automation_service.MessagingAutomationService._try_create_chat_booking_intent",
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
            "service_layer.messaging_automation_service.MessagingAutomationService.handle_customer_message",
            _handle_customer_message,
        ), patch(
            "api.route_handlers._finalize_messaging_booking_intent_side_effects",
            _finalize_booking_intent,
        ), patch(
            "api.route_handlers._finalize_whatsapp_booking_request_side_effects",
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
                        "from": {"id": 999, "first_name": "Long", "language_code": "vi"},
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
            captured_calls[0]["metadata"]["telegram_language_code"], "vi"
        )
        self.assertEqual(
            captured_calls[0]["metadata"]["start_command_kind"], "welcome"
        )

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
