"""Phase 2 — AIMentor in-Telegram booking flow tests.

Covers the slash + callback pipeline added to
``service_layer/messaging_automation_service.py``: ``/programs`` →
``aim:program:<sid>`` → ``aim:slot:<sid>:<iso>`` → name → email → phone
→ confirm → booking_intent.

Each test stubs the SQL fetch helpers and the booking-intent repository
so the state machine can be exercised in isolation. The dispatcher's
heavy environment dependencies (rate limiter, conversation history,
etc.) are exercised end-to-end in ``test_telegram_webhook_routes.py``.
"""

from __future__ import annotations

import asyncio
from datetime import datetime, timedelta, timezone
from pathlib import Path
import sys
from types import SimpleNamespace
from unittest import TestCase
from unittest.mock import AsyncMock, patch


BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from schemas import TawkMessage
from service_layer.messaging_automation_service import (
    MessagingAutomationResult,
    MessagingAutomationService,
)


def _run(coro):
    return asyncio.run(coro)


def _service() -> MessagingAutomationService:
    return MessagingAutomationService(public_search_service=None)


def _fake_session() -> SimpleNamespace:
    """Return an opaque object the helpers will pass through to mocked
    fetchers. The real session is never inspected because we patch the
    fetch + persist methods on the service class itself.
    """

    return SimpleNamespace()


class TelegramProgramsCommandTestCase(TestCase):
    """`/programs` (and the free-text equivalents) build an inline keyboard
    populated with the AIMentor catalog and store ``picking_program``
    state on the channel session."""

    def test_programs_command_sends_inline_keyboard_with_top_programs(self):
        service = _service()
        sample_programs = [
            {"service_id": "starter-bundle", "name": "Starter Bundle", "featured": 1},
            {"service_id": "pro-track", "name": "Pro Track", "featured": 0},
        ]
        upsert_calls: list[dict[str, object]] = []

        async def _fake_fetch(self, _session, *, limit=6):
            return sample_programs

        async def _fake_upsert(
            self,
            _session,
            *,
            channel,
            conversation_id,
            tenant_id,
            customer_identity,
            existing_state,
            updates,
        ):
            upsert_calls.append({"updates": updates, "channel": channel})

        with patch.object(
            MessagingAutomationService, "_fetch_aimentor_programs", _fake_fetch
        ), patch.object(
            MessagingAutomationService, "_set_book_intent_metadata", _fake_upsert
        ):
            result = _run(
                service._handle_programs_list(
                    _fake_session(),
                    channel="telegram",
                    conversation_id="telegram:42",
                    tenant_id=None,
                    identity_metadata={"channel": "telegram"},
                    locale="en",
                    existing_state={"session_metadata": {}},
                )
            )

        self.assertIsInstance(result, MessagingAutomationResult)
        self.assertEqual(result.ai_intent, "programs_pick")
        self.assertEqual(result.ai_reply, "Pick a program to book:")
        keyboard = result.metadata["reply_controls"]["telegram_reply_markup"][
            "inline_keyboard"
        ]
        self.assertEqual(len(keyboard), 2)
        self.assertEqual(keyboard[0][0]["text"], "Starter Bundle")
        self.assertEqual(keyboard[0][0]["callback_data"], "aim:program:starter-bundle")
        self.assertEqual(keyboard[1][0]["callback_data"], "aim:program:pro-track")
        # Each callback_data must fit Telegram's 64-byte cap.
        for row in keyboard:
            for button in row:
                self.assertLessEqual(len(button["callback_data"].encode("utf-8")), 64)
        self.assertEqual(upsert_calls[-1]["updates"]["book_intent_state"], "picking_program")

    def test_programs_command_returns_empty_message_when_catalog_blank(self):
        service = _service()

        async def _fake_fetch(self, _session, *, limit=6):
            return []

        with patch.object(
            MessagingAutomationService, "_fetch_aimentor_programs", _fake_fetch
        ):
            result = _run(
                service._handle_programs_list(
                    _fake_session(),
                    channel="telegram",
                    conversation_id="telegram:42",
                    tenant_id=None,
                    identity_metadata={},
                    locale="en",
                    existing_state={"session_metadata": {}},
                )
            )
        self.assertEqual(result.ai_intent, "programs_empty")

    def test_programs_command_on_whatsapp_falls_back_to_web_link(self):
        service = _service()
        result = _run(
            service._handle_programs_list(
                _fake_session(),
                channel="whatsapp",
                conversation_id="whatsapp:+61123",
                tenant_id=None,
                identity_metadata={},
                locale="en",
                existing_state={"session_metadata": {}},
            )
        )
        self.assertEqual(result.ai_intent, "programs_open_web")
        self.assertIn("aimentor.bookedai.au", result.ai_reply)


class TelegramProgramCallbackTestCase(TestCase):
    """``aim:program:<sid>`` → up to 5 next available slots as inline
    keyboard buttons + state transitions to ``picking_slot``."""

    def test_program_callback_sends_slot_keyboard(self):
        service = _service()
        future_start = datetime.now(timezone.utc) + timedelta(days=2, hours=3)
        sample_slots = [
            {
                "id": "slot-1",
                "service_id": "pro-track",
                "slot_start_at": future_start,
                "slot_end_at": future_start + timedelta(hours=1),
                "timezone": "Australia/Sydney",
                "capacity": 1,
                "booked_count": 0,
            },
            {
                "id": "slot-2",
                "service_id": "pro-track",
                "slot_start_at": future_start + timedelta(days=1),
                "slot_end_at": future_start + timedelta(days=1, hours=1),
                "timezone": "Australia/Sydney",
                "capacity": 5,
                "booked_count": 1,
            },
        ]
        upsert_calls: list[dict[str, object]] = []

        async def _fake_slots(self, _session, *, service_id, limit=5):
            self_check = service_id  # silence linter
            return sample_slots

        async def _fake_programs(self, _session, *, limit=6):
            return [{"service_id": "pro-track", "name": "Pro Track"}]

        async def _fake_upsert(
            self,
            _session,
            *,
            channel,
            conversation_id,
            tenant_id,
            customer_identity,
            existing_state,
            updates,
        ):
            upsert_calls.append(updates)

        with patch.object(
            MessagingAutomationService, "_fetch_aimentor_slots", _fake_slots
        ), patch.object(
            MessagingAutomationService, "_fetch_aimentor_programs", _fake_programs
        ), patch.object(
            MessagingAutomationService, "_set_book_intent_metadata", _fake_upsert
        ):
            result = _run(
                service._handle_program_pick(
                    _fake_session(),
                    channel="telegram",
                    conversation_id="telegram:42",
                    tenant_id=None,
                    identity_metadata={},
                    locale="en",
                    service_id="pro-track",
                    existing_state={"session_metadata": {"book_intent_state": "picking_program"}},
                )
            )

        self.assertEqual(result.ai_intent, "programs_pick_slot")
        self.assertEqual(result.ai_reply, "Pick a time:")
        keyboard = result.metadata["reply_controls"]["telegram_reply_markup"][
            "inline_keyboard"
        ]
        self.assertEqual(len(keyboard), 2)
        for row in keyboard:
            self.assertEqual(len(row), 1)
            data = row[0]["callback_data"]
            self.assertTrue(data.startswith("aim:slot:pro-track:"))
            self.assertLessEqual(len(data.encode("utf-8")), 64)
        # State must move forward to picking_slot with program_id captured.
        latest_update = upsert_calls[-1]
        self.assertEqual(latest_update["book_intent_state"], "picking_slot")
        self.assertEqual(latest_update["book_intent_program_id"], "pro-track")
        self.assertEqual(latest_update["book_intent_program_name"], "Pro Track")


class TelegramSlotCallbackTestCase(TestCase):
    """``aim:slot:<sid>:<iso>`` parks the chosen slot on metadata and
    asks the customer for their full name."""

    def test_slot_callback_starts_name_collection(self):
        service = _service()
        upsert_calls: list[dict[str, object]] = []

        async def _fake_upsert(
            self,
            _session,
            *,
            channel,
            conversation_id,
            tenant_id,
            customer_identity,
            existing_state,
            updates,
        ):
            upsert_calls.append(updates)

        starts_at = "2026-05-12T14:00:00+00:00"
        with patch.object(
            MessagingAutomationService, "_set_book_intent_metadata", _fake_upsert
        ):
            result = _run(
                service._handle_slot_pick(
                    _fake_session(),
                    channel="telegram",
                    conversation_id="telegram:42",
                    tenant_id="tenant-1",
                    identity_metadata={},
                    locale="en",
                    service_id="pro-track",
                    starts_at_iso=starts_at,
                    existing_state={
                        "session_metadata": {
                            "book_intent_state": "picking_slot",
                            "book_intent_program_id": "pro-track",
                            "book_intent_program_name": "Pro Track",
                        }
                    },
                )
            )

        self.assertEqual(result.ai_intent, "book_collect_name")
        self.assertEqual(result.ai_reply, "Great. What's your full name?")
        latest = upsert_calls[-1]
        self.assertEqual(latest["book_intent_state"], "collecting_name")
        self.assertEqual(latest["book_intent_program_id"], "pro-track")
        self.assertEqual(latest["book_intent_slot_starts_at"], starts_at)


class TelegramCollectionStateMachineTestCase(TestCase):
    """Walk a customer through name → email → phone → confirming."""

    def _drive(self, service, *, state, text, existing_metadata):
        upsert_calls: list[dict[str, object]] = []

        async def _fake_upsert(
            self,
            _session,
            *,
            channel,
            conversation_id,
            tenant_id,
            customer_identity,
            existing_state,
            updates,
        ):
            upsert_calls.append(updates)

        with patch.object(
            MessagingAutomationService, "_set_book_intent_metadata", _fake_upsert
        ):
            result = _run(
                service._handle_book_state_machine(
                    _fake_session(),
                    channel="telegram",
                    conversation_id="telegram:42",
                    tenant_id="tenant-1",
                    identity_metadata={},
                    locale="en",
                    message=TawkMessage(
                        conversation_id="telegram:42",
                        message_id="m",
                        text=text,
                        sender_name="Customer",
                    ),
                    metadata={},
                    existing_state={"session_metadata": existing_metadata},
                    state=state,
                )
            )
        return result, upsert_calls

    def test_collecting_name_then_email_then_phone_to_confirming_state(self):
        service = _service()

        # Step 1: name → email
        result, upserts = self._drive(
            service,
            state="collecting_name",
            text="Long Do",
            existing_metadata={
                "book_intent_state": "collecting_name",
                "book_intent_program_id": "pro-track",
                "book_intent_program_name": "Pro Track",
                "book_intent_slot_starts_at": "2026-05-12T14:00:00+00:00",
                "book_intent_slot_label": "Tue 12 May, 14:00",
            },
        )
        self.assertEqual(result.ai_intent, "book_collect_email")
        self.assertEqual(upserts[-1]["book_intent_state"], "collecting_email")
        self.assertEqual(upserts[-1]["book_intent_collected_name"], "Long Do")

        # Step 2: invalid email → re-prompt, no state change
        bad_result, _ = self._drive(
            service,
            state="collecting_email",
            text="not-an-email",
            existing_metadata={
                "book_intent_state": "collecting_email",
                "book_intent_collected_name": "Long Do",
            },
        )
        self.assertEqual(bad_result.ai_intent, "book_invalid_email")

        # Step 2b: valid email → phone
        result, upserts = self._drive(
            service,
            state="collecting_email",
            text="long@example.com",
            existing_metadata={
                "book_intent_state": "collecting_email",
                "book_intent_collected_name": "Long Do",
            },
        )
        self.assertEqual(result.ai_intent, "book_collect_phone")
        self.assertEqual(upserts[-1]["book_intent_collected_email"], "long@example.com")

        # Step 3: invalid phone → re-prompt
        bad_phone, _ = self._drive(
            service,
            state="collecting_phone",
            text="abc",
            existing_metadata={
                "book_intent_state": "collecting_phone",
                "book_intent_collected_name": "Long Do",
                "book_intent_collected_email": "long@example.com",
            },
        )
        self.assertEqual(bad_phone.ai_intent, "book_invalid_phone")

        # Step 3b: valid phone → confirming
        result, upserts = self._drive(
            service,
            state="collecting_phone",
            text="+61400000000",
            existing_metadata={
                "book_intent_state": "collecting_phone",
                "book_intent_collected_name": "Long Do",
                "book_intent_collected_email": "long@example.com",
                "book_intent_program_name": "Pro Track",
                "book_intent_slot_label": "Tue 12 May, 14:00",
            },
        )
        self.assertEqual(result.ai_intent, "book_summary")
        self.assertIn("Pro Track", result.ai_reply)
        self.assertIn("Tue 12 May, 14:00", result.ai_reply)
        self.assertEqual(upserts[-1]["book_intent_state"], "confirming")
        # The summary surfaces YES/NO inline-keyboard buttons.
        markup = result.metadata["reply_controls"]["telegram_reply_markup"]
        labels = [btn["text"] for row in markup["inline_keyboard"] for btn in row]
        self.assertIn("YES", labels)
        self.assertIn("NO", labels)


class TelegramConfirmCreatesBookingTestCase(TestCase):
    """``confirming`` + YES creates a booking_intent via the existing
    repository and clears the metadata flags."""

    def test_confirming_yes_creates_booking_intent(self):
        service = _service()
        booking_calls: list[dict[str, object]] = []
        cleared_calls: list[dict[str, object]] = []

        async def _fake_resolve(self, _session):
            return "tenant-aimentor"

        async def _fake_upsert_booking(self, **kwargs):
            booking_calls.append(kwargs)
            return "booking-intent-uuid"

        async def _fake_upsert_contact(self, **kwargs):
            return "contact-uuid"

        async def _fake_upsert_lead(self, **kwargs):
            return "lead-uuid"

        async def _fake_clear(
            self,
            _session,
            *,
            channel,
            conversation_id,
            tenant_id,
            customer_identity,
            existing_state,
        ):
            cleared_calls.append({"conversation_id": conversation_id})

        async def _fake_set(
            self,
            _session,
            *,
            channel,
            conversation_id,
            tenant_id,
            customer_identity,
            existing_state,
            updates,
        ):
            return None

        from repositories.booking_intent_repository import BookingIntentRepository
        from repositories.contact_repository import ContactRepository
        from repositories.lead_repository import LeadRepository

        async def _commit():
            return None

        existing_metadata = {
            "book_intent_state": "confirming",
            "book_intent_program_id": "pro-track",
            "book_intent_program_name": "Pro Track",
            "book_intent_slot_starts_at": "2026-05-12T14:00:00+00:00",
            "book_intent_slot_label": "Tue 12 May, 14:00",
            "book_intent_collected_name": "Long Do",
            "book_intent_collected_email": "long@example.com",
            "book_intent_collected_phone": "+61400000000",
        }

        session_obj = SimpleNamespace(commit=_commit)

        with patch.object(
            MessagingAutomationService, "_resolve_aimentor_tenant_id", _fake_resolve
        ), patch.object(
            MessagingAutomationService, "_set_book_intent_metadata", _fake_set
        ), patch.object(
            MessagingAutomationService, "_clear_book_intent_metadata", _fake_clear
        ), patch.object(
            BookingIntentRepository, "upsert_booking_intent", _fake_upsert_booking
        ), patch.object(
            ContactRepository, "upsert_contact", _fake_upsert_contact
        ), patch.object(
            LeadRepository, "upsert_lead", _fake_upsert_lead
        ):
            result = _run(
                service._handle_book_state_machine(
                    session_obj,
                    channel="telegram",
                    conversation_id="telegram:42",
                    tenant_id="tenant-aimentor",
                    identity_metadata={"telegram_chat_id": "42"},
                    locale="en",
                    message=TawkMessage(
                        conversation_id="telegram:42",
                        message_id="m",
                        text="YES",
                        sender_name="Long",
                    ),
                    metadata={},
                    existing_state={"session_metadata": existing_metadata},
                    state="confirming",
                )
            )

        self.assertEqual(result.ai_intent, "book_success")
        self.assertIn(result.metadata["booking_reference"], result.ai_reply)
        self.assertEqual(len(booking_calls), 1)
        booking = booking_calls[0]
        self.assertEqual(booking["service_id"], "pro-track")
        self.assertEqual(booking["service_name"], "Pro Track")
        self.assertEqual(booking["status"], "captured")
        self.assertEqual(booking["booking_path"], "aimentor_telegram_bot")
        self.assertEqual(booking["requested_date"], "2026-05-12")
        self.assertEqual(booking["requested_time"], "14:00")
        self.assertEqual(len(cleared_calls), 1)

    def test_confirming_no_clears_state_without_booking(self):
        service = _service()
        cleared_calls: list[dict[str, object]] = []
        booking_repo_called = False

        async def _fake_clear(
            self,
            _session,
            *,
            channel,
            conversation_id,
            tenant_id,
            customer_identity,
            existing_state,
        ):
            cleared_calls.append({"conversation_id": conversation_id})

        async def _explode(self, **kwargs):
            nonlocal booking_repo_called
            booking_repo_called = True
            return None

        from repositories.booking_intent_repository import BookingIntentRepository

        with patch.object(
            MessagingAutomationService, "_clear_book_intent_metadata", _fake_clear
        ), patch.object(
            BookingIntentRepository, "upsert_booking_intent", _explode
        ):
            result = _run(
                service._handle_book_state_machine(
                    _fake_session(),
                    channel="telegram",
                    conversation_id="telegram:42",
                    tenant_id="tenant-1",
                    identity_metadata={},
                    locale="en",
                    message=TawkMessage(
                        conversation_id="telegram:42",
                        message_id="m",
                        text="NO",
                        sender_name="Long",
                    ),
                    metadata={},
                    existing_state={
                        "session_metadata": {"book_intent_state": "confirming"}
                    },
                    state="confirming",
                )
            )

        self.assertEqual(result.ai_intent, "book_cancelled")
        self.assertEqual(result.ai_reply, "Booking cancelled.")
        self.assertEqual(len(cleared_calls), 1)
        self.assertFalse(booking_repo_called)
