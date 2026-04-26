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

    def scalars(self):
        return SimpleNamespace(
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


async def _async_noop(*_args, **_kwargs):
    return None


@asynccontextmanager
async def _fake_get_session(_session_factory):
    yield SimpleNamespace(execute=_fake_execute, commit=_async_noop)


class _FakeWhatsAppCommunicationService:
    def __init__(self):
        self.sent: list[dict[str, object]] = []

    async def send_whatsapp(self, **kwargs):
        self.sent.append(kwargs)
        return SimpleNamespace(
            provider="whatsapp_twilio",
            delivery_status="sent",
            provider_message_id="SM-REPLY",
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

    def test_whatsapp_webhook_replies_with_booking_context_and_queues_cancel_request(self):
        captured_calls: list[dict[str, object]] = []
        communication_service = _FakeWhatsAppCommunicationService()

        async def _store_event(_session, **kwargs):
            captured_calls.append(kwargs)

        async def _resolve_customer_care_booking_reference(*_args, **_kwargs):
            return {
                "booking_reference": "v1-bookedai-123",
                "resolved_by": "message_booking_reference",
                "candidate_count": 1,
            }

        async def _build_portal_customer_care_turn(*_args, **_kwargs):
            return {
                "booking_reference": "v1-bookedai-123",
                "phase": "support_request_help",
                "reply": "Booking v1-bookedai-123 for Chess Trial is active and can be cancelled by managed request.",
                "next_actions": [
                    {"id": "request_cancel", "label": "Request cancellation", "enabled": True}
                ],
            }

        async def _queue_portal_booking_request(*_args, **_kwargs):
            return {
                "request_status": "queued",
                "request_type": "cancel_request",
                "booking_reference": "v1-bookedai-123",
                "message": "Your cancellation request has been recorded for manual review.",
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
        ), patch(
            "service_layer.messaging_automation_service.queue_portal_booking_request",
            _queue_portal_booking_request,
        ):
            app = create_test_app()
            app.state.communication_service = communication_service
            client = TestClient(app)
            response = client.post(
                "/api/webhooks/whatsapp",
                data={
                    "Body": "Please cancel booking v1-bookedai-123",
                    "From": "whatsapp:+61455301335",
                    "To": "whatsapp:+14155238886",
                    "ProfileName": "Long",
                    "MessageSid": "SM124",
                    "WaId": "61455301335",
                },
            )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["messages_processed"], 1)
        self.assertEqual(len(communication_service.sent), 1)
        self.assertEqual(communication_service.sent[0]["to"], "+61455301335")
        self.assertIn("v1-bookedai-123", communication_service.sent[0]["body"])
        self.assertIn("cancellation request", communication_service.sent[0]["body"])
        self.assertEqual(captured_calls[0]["ai_intent"], "answered")
        self.assertEqual(captured_calls[0]["workflow_status"], "answered")
        self.assertEqual(
            captured_calls[0]["metadata"]["queued_request"]["request_type"],
            "cancel_request",
        )

    def test_whatsapp_new_booking_message_returns_booking_intake_reply(self):
        captured_calls: list[dict[str, object]] = []
        communication_service = _FakeWhatsAppCommunicationService()

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
                "/api/webhooks/whatsapp",
                data={
                    "Body": "I want to book swimming lessons next week",
                    "From": "whatsapp:+61455301335",
                    "To": "whatsapp:+14155238886",
                    "ProfileName": "Long",
                    "MessageSid": "SM126",
                    "WaId": "61455301335",
                },
            )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["messages_processed"], 1)
        self.assertEqual(len(communication_service.sent), 1)
        self.assertEqual(communication_service.sent[0]["to"], "+61455301335")
        self.assertIn("start a new booking", communication_service.sent[0]["body"])
        self.assertEqual(captured_calls[0]["ai_intent"], "booking_intake")
        self.assertEqual(captured_calls[0]["metadata"]["booking_intake"]["source"], "whatsapp")

    def test_whatsapp_cancel_request_records_email_and_crm_side_effects(self):
        captured_calls: list[dict[str, object]] = []
        communication_service = _FakeWhatsAppCommunicationService()
        email_service = _FakeEmailService(configured=True)

        async def _store_event(_session, **kwargs):
            captured_calls.append(kwargs)

        async def _resolve_customer_care_booking_reference(*_args, **_kwargs):
            return {
                "booking_reference": "v1-bookedai-456",
                "resolved_by": "message_booking_reference",
                "candidate_count": 1,
            }

        async def _build_portal_customer_care_turn(*_args, **_kwargs):
            return {
                "booking_reference": "v1-bookedai-456",
                "phase": "support_request_help",
                "reply": "Booking v1-bookedai-456 for Strategy Call supports cancellation review.",
                "next_actions": [
                    {"id": "request_cancel", "label": "Request cancellation", "enabled": True}
                ],
            }

        async def _queue_portal_booking_request(*_args, **_kwargs):
            return {
                "request_status": "queued",
                "request_type": "cancel_request",
                "booking_reference": "v1-bookedai-456",
                "tenant_id": "tenant-test",
                "booking_intent_id": "booking-intent-test",
                "customer_name": "Long",
                "customer_email": "long@example.com",
                "customer_phone": "+61455301335",
                "service_name": "Strategy Call",
                "business_name": "BookedAI",
                "message": "Your cancellation request has been recorded for manual review.",
                "support_email": "info@bookedai.au",
                "outbox_event_id": 44,
            }

        async def _orchestrate_lifecycle_email(*_args, **_kwargs):
            return SimpleNamespace(
                message_id="email-1",
                delivery_status="sent",
                provider="smtp",
                warning_codes=[],
            )

        async def _orchestrate_email_sent_sync(*_args, **_kwargs):
            return SimpleNamespace(
                task_record_id=55,
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
            "service_layer.messaging_automation_service.build_portal_customer_care_turn",
            _build_portal_customer_care_turn,
        ), patch(
            "service_layer.messaging_automation_service.queue_portal_booking_request",
            _queue_portal_booking_request,
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
            app.state.settings.booking_business_email = "info@bookedai.au"
            client = TestClient(app)
            response = client.post(
                "/api/webhooks/whatsapp",
                data={
                    "Body": "Cancel booking v1-bookedai-456 please",
                    "From": "whatsapp:+61455301335",
                    "To": "whatsapp:+14155238886",
                    "ProfileName": "Long",
                    "MessageSid": "SM125",
                    "WaId": "61455301335",
                },
            )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["messages_processed"], 1)
        self.assertEqual(email_service.sent[0]["to"], ["long@example.com"])
        self.assertIn("v1-bookedai-456", email_service.sent[0]["subject"])
        lifecycle = captured_calls[0]["metadata"]["lifecycle_updates"]
        self.assertEqual(lifecycle["email_confirmation"]["delivery_status"], "sent")
        self.assertEqual(lifecycle["crm_sync"]["task"]["record_id"], 55)
