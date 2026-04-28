"""Tests for the Zoho CRM booking_feedback.recorded outbox consumer.

Coverage targets:

* Outbox event with feedback payload → ``ZohoCrmAdapter.create_note`` is
  invoked with the right subject/body and the consumer returns ``"pushed"``.
* Missing tenant Zoho credentials → consumer returns
  ``"skipped:provider_unconfigured"`` and never calls the adapter.
* Adapter raises ``HTTPStatusError`` → exception propagates so the outbox
  dispatcher records a failure and exponential back-off kicks in.
* Booking can't be located in the local DB → consumer returns
  ``"skipped:booking_not_found"``.
* Zoho contact lookup returns nothing → consumer returns
  ``"skipped:zoho_contact_not_found"`` (we deliberately do not create
  orphan notes).
"""

from __future__ import annotations

from pathlib import Path
import sys
from types import SimpleNamespace
from unittest import IsolatedAsyncioTestCase
from unittest.mock import AsyncMock, MagicMock, patch

import httpx


BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from workers.outbox import OutboxEvent
from workers.zoho_crm_feedback_consumer import (
    handle_booking_feedback_recorded,
    _format_note_body,
    _format_note_subject,
)


class _FakeBookingIntentRepository:
    instances: list["_FakeBookingIntentRepository"] = []
    return_value: dict | None = None

    def __init__(self, _context):
        self.__class__.instances.append(self)
        self.lookups: list[str] = []

    async def fetch_booking_with_contact(self, *, booking_reference: str):
        self.lookups.append(booking_reference)
        return self.__class__.return_value


def _make_event(**overrides) -> OutboxEvent:
    payload = {
        "feedback_id": "fb-1",
        "booking_reference": "BK-1001",
        "tenant_id": "tenant-aimentor",
        "rating": 5,
        "would_recommend": True,
        "comment": "Great session",
        "channel": "email_link",
        "submitted_at": "2026-04-28T12:34:56Z",
    }
    payload.update(overrides.pop("payload_overrides", {}))
    return OutboxEvent(
        event_type="booking_feedback.recorded",
        aggregate_type="booking_feedback",
        aggregate_id=overrides.get("aggregate_id", "fb-1"),
        tenant_id=overrides.get("tenant_id", "tenant-aimentor"),
        payload=payload,
        idempotency_key="booking-feedback:fb-1",
    )


def _make_settings(*, configured: bool = True) -> SimpleNamespace:
    return SimpleNamespace(
        zoho_crm_default_contact_module="Contacts",
    )


def _make_adapter(*, configured: bool = True) -> MagicMock:
    adapter = MagicMock()
    adapter.configured = MagicMock(return_value=configured)
    adapter.find_contact_by_email = AsyncMock()
    adapter.create_note = AsyncMock()
    return adapter


class ZohoFeedbackConsumerTestCase(IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        _FakeBookingIntentRepository.instances.clear()
        _FakeBookingIntentRepository.return_value = None

    def test_format_helpers_render_expected_text(self):
        subject = _format_note_subject(rating=4, booking_reference="BK-9999")
        self.assertEqual(
            subject, "BookedAI feedback (rating 4/5) for booking BK-9999"
        )
        body = _format_note_body(
            {
                "rating": 4,
                "would_recommend": False,
                "comment": "  Could be sharper. ",
                "channel": "portal",
                "submitted_at": "2026-04-28T01:02:03Z",
            }
        )
        self.assertIn("Rating: 4/5", body)
        self.assertIn("Would recommend: no", body)
        self.assertIn("Could be sharper.", body)
        self.assertIn("Channel: portal", body)
        self.assertIn("Submitted: 2026-04-28T01:02:03Z", body)

    async def test_pushes_note_when_contact_resolves(self):
        _FakeBookingIntentRepository.return_value = {
            "booking_intent_id": "bi-1",
            "tenant_id": "tenant-aimentor",
            "booking_reference": "BK-1001",
            "service_name": "AI Mentor 1:1",
            "customer_name": "Riley",
            "customer_email": "riley@example.com",
            "customer_phone": "",
        }
        adapter = _make_adapter(configured=True)
        adapter.find_contact_by_email.return_value = {
            "id": "zoho-contact-42",
            "Email": "riley@example.com",
        }
        adapter.create_note.return_value = {
            "external_id": "zoho-note-77",
            "status": "success",
        }

        with patch(
            "workers.zoho_crm_feedback_consumer.BookingIntentRepository",
            _FakeBookingIntentRepository,
        ), patch(
            "workers.zoho_crm_feedback_consumer.get_settings",
            return_value=_make_settings(),
        ):
            outcome = await handle_booking_feedback_recorded(
                object(), _make_event(), adapter=adapter
            )

        self.assertEqual(outcome, "pushed")
        adapter.find_contact_by_email.assert_awaited_once()
        adapter.create_note.assert_awaited_once()
        call_kwargs = adapter.create_note.await_args.kwargs
        self.assertEqual(call_kwargs["parent_id"], "zoho-contact-42")
        self.assertEqual(call_kwargs["parent_module"], "Contacts")
        self.assertIn("BK-1001", call_kwargs["title"])
        self.assertIn("rating 5/5", call_kwargs["title"])
        self.assertIn("Rating: 5/5", call_kwargs["content"])
        self.assertIn("Would recommend: yes", call_kwargs["content"])
        self.assertIn("Great session", call_kwargs["content"])

    async def test_provider_unconfigured_skips_without_lookup(self):
        adapter = _make_adapter(configured=False)

        with patch(
            "workers.zoho_crm_feedback_consumer.BookingIntentRepository",
            _FakeBookingIntentRepository,
        ), patch(
            "workers.zoho_crm_feedback_consumer.get_settings",
            return_value=_make_settings(),
        ):
            outcome = await handle_booking_feedback_recorded(
                object(), _make_event(), adapter=adapter
            )

        self.assertEqual(outcome, "skipped:provider_unconfigured")
        adapter.find_contact_by_email.assert_not_called()
        adapter.create_note.assert_not_called()
        self.assertEqual(_FakeBookingIntentRepository.instances, [])

    async def test_http_error_propagates_for_outbox_retry(self):
        _FakeBookingIntentRepository.return_value = {
            "booking_intent_id": "bi-1",
            "tenant_id": "tenant-aimentor",
            "booking_reference": "BK-1001",
            "customer_email": "riley@example.com",
            "customer_phone": "",
        }
        adapter = _make_adapter(configured=True)
        adapter.find_contact_by_email.return_value = {"id": "zoho-contact-42"}

        # Simulate Zoho returning 502 — outbox dispatcher will mark this as
        # failed and exponential back-off kicks in via update_event_status.
        request = httpx.Request("POST", "https://example.com/Notes")
        response = httpx.Response(status_code=502, request=request, text="bad gateway")
        adapter.create_note.side_effect = httpx.HTTPStatusError(
            "Bad gateway", request=request, response=response
        )

        with patch(
            "workers.zoho_crm_feedback_consumer.BookingIntentRepository",
            _FakeBookingIntentRepository,
        ), patch(
            "workers.zoho_crm_feedback_consumer.get_settings",
            return_value=_make_settings(),
        ):
            with self.assertRaises(httpx.HTTPStatusError):
                await handle_booking_feedback_recorded(
                    object(), _make_event(), adapter=adapter
                )

        adapter.create_note.assert_awaited_once()

    async def test_booking_not_found_is_skipped(self):
        _FakeBookingIntentRepository.return_value = None
        adapter = _make_adapter(configured=True)

        with patch(
            "workers.zoho_crm_feedback_consumer.BookingIntentRepository",
            _FakeBookingIntentRepository,
        ), patch(
            "workers.zoho_crm_feedback_consumer.get_settings",
            return_value=_make_settings(),
        ):
            outcome = await handle_booking_feedback_recorded(
                object(), _make_event(), adapter=adapter
            )

        self.assertEqual(outcome, "skipped:booking_not_found")
        adapter.find_contact_by_email.assert_not_called()
        adapter.create_note.assert_not_called()

    async def test_zoho_contact_missing_does_not_create_orphan_note(self):
        _FakeBookingIntentRepository.return_value = {
            "booking_intent_id": "bi-1",
            "tenant_id": "tenant-aimentor",
            "booking_reference": "BK-1001",
            "customer_email": "riley@example.com",
            "customer_phone": "",
        }
        adapter = _make_adapter(configured=True)
        adapter.find_contact_by_email.return_value = None

        with patch(
            "workers.zoho_crm_feedback_consumer.BookingIntentRepository",
            _FakeBookingIntentRepository,
        ), patch(
            "workers.zoho_crm_feedback_consumer.get_settings",
            return_value=_make_settings(),
        ):
            outcome = await handle_booking_feedback_recorded(
                object(), _make_event(), adapter=adapter
            )

        self.assertEqual(outcome, "skipped:zoho_contact_not_found")
        adapter.create_note.assert_not_called()

    async def test_invalid_payload_marks_event_processed(self):
        adapter = _make_adapter(configured=True)
        bad_event = _make_event(payload_overrides={"booking_reference": "", "rating": 0})

        with patch(
            "workers.zoho_crm_feedback_consumer.BookingIntentRepository",
            _FakeBookingIntentRepository,
        ), patch(
            "workers.zoho_crm_feedback_consumer.get_settings",
            return_value=_make_settings(),
        ):
            outcome = await handle_booking_feedback_recorded(
                object(), bad_event, adapter=adapter
            )

        self.assertEqual(outcome, "skipped:invalid_payload")
        adapter.create_note.assert_not_called()
