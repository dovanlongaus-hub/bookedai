"""Tests for the 24h post-session feedback request worker.

Coverage targets:

* 24h has elapsed + feedback not sent → ``feedback_request_sent_at`` set +
  email send recorded.
* 24h has not elapsed → no-op (the SQL filter handles this; we exercise it
  via an empty ``due_rows`` list to confirm the worker simply skips).
* Already sent → no-op (idempotent — not selected by the SQL).
* Tenant has the ``post_booking_feedback`` feature disabled → skipped.

The worker is exercised end-to-end with a fake repository so the SQL itself
is not under test here (it's exercised against the live schema in the SQL
migration smoke tests).
"""

from __future__ import annotations

from pathlib import Path
import sys
from unittest import IsolatedAsyncioTestCase
from unittest.mock import AsyncMock, patch


BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from workers.feedback_request_worker import (
    FeedbackRequestDispatchResult,
    dispatch_due_feedback_requests,
)


class _FakeBookingIntentRepository:
    instances: list["_FakeBookingIntentRepository"] = []
    due_rows: list[dict] = []
    mark_returns_true: bool = True

    def __init__(self, _context):
        self.marked_references: list[str] = []
        self.__class__.instances.append(self)

    async def list_feedback_requests_due(self, *, elapsed_hours: int = 24, limit: int = 50):
        return list(self.__class__.due_rows[:limit])

    async def mark_feedback_request_sent(self, *, booking_reference: str) -> bool:
        self.marked_references.append(booking_reference)
        return self.__class__.mark_returns_true


class _FakeJobRunRepository:
    instances: list["_FakeJobRunRepository"] = []

    def __init__(self, _context):
        self.created: dict | None = None
        self.running_called_with: tuple[int, str | None] | None = None
        self.finished_called_with: tuple[int, str, str | None] | None = None
        self.__class__.instances.append(self)

    async def create_job_run(self, **kwargs):
        self.created = kwargs
        return 999

    async def mark_running(self, job_run_id: int, *, detail: str | None = None) -> None:
        self.running_called_with = (job_run_id, detail)

    async def mark_finished(self, job_run_id: int, *, status: str, detail: str | None = None) -> None:
        self.finished_called_with = (job_run_id, status, detail)


class _FakeEmailService:
    def __init__(self, *, configured: bool = True, raise_on_send: bool = False):
        self._configured = configured
        self._raise_on_send = raise_on_send
        self.sent: list[dict] = []

    def smtp_configured(self) -> bool:
        return self._configured

    async def send_email(self, *, to, subject, text, html=None, cc=None) -> None:
        if self._raise_on_send:
            raise RuntimeError("smtp blew up")
        self.sent.append(
            {"to": list(to), "subject": subject, "text": text, "html": html}
        )


class FeedbackRequestWorkerTestCase(IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        _FakeBookingIntentRepository.instances.clear()
        _FakeBookingIntentRepository.due_rows = []
        _FakeBookingIntentRepository.mark_returns_true = True
        _FakeJobRunRepository.instances.clear()

    async def test_due_booking_with_feature_enabled_sends_email_and_marks(self):
        _FakeBookingIntentRepository.due_rows = [
            {
                "booking_intent_id": "bi-1",
                "tenant_id": "tenant-aimentor",
                "booking_reference": "BK-1001",
                "service_name": "AI Mentor 1:1",
                "customer_name": "Riley Quinn",
                "customer_email": "riley@example.com",
                "customer_phone": "+61400000001",
                "tenant_slug": "ai-mentor-feature-flag",
                "tenant_partner_config": {
                    "features": {"post_booking_feedback": "true"},
                },
            }
        ]
        email_service = _FakeEmailService()

        with patch(
            "workers.feedback_request_worker.BookingIntentRepository",
            _FakeBookingIntentRepository,
        ), patch(
            "workers.feedback_request_worker.JobRunRepository",
            _FakeJobRunRepository,
        ):
            result = await dispatch_due_feedback_requests(
                object(),
                email_service=email_service,
            )

        self.assertIsInstance(result, FeedbackRequestDispatchResult)
        self.assertEqual(result.scanned, 1)
        self.assertEqual(result.sent, 1)
        self.assertEqual(result.skipped, 0)
        self.assertEqual(result.job_run_id, 999)

        repo = _FakeBookingIntentRepository.instances[-1]
        self.assertEqual(repo.marked_references, ["BK-1001"])
        self.assertEqual(len(email_service.sent), 1)
        sent = email_service.sent[0]
        self.assertEqual(sent["to"], ["riley@example.com"])
        self.assertIn("BK-1001", sent["html"])
        self.assertIn("Riley Quinn", sent["html"])

        job_repo = _FakeJobRunRepository.instances[-1]
        self.assertIsNotNone(job_repo.finished_called_with)
        assert job_repo.finished_called_with is not None
        self.assertEqual(job_repo.finished_called_with[1], "completed")

    async def test_no_due_rows_results_in_noop(self):
        _FakeBookingIntentRepository.due_rows = []
        email_service = _FakeEmailService()

        with patch(
            "workers.feedback_request_worker.BookingIntentRepository",
            _FakeBookingIntentRepository,
        ), patch(
            "workers.feedback_request_worker.JobRunRepository",
            _FakeJobRunRepository,
        ):
            result = await dispatch_due_feedback_requests(
                object(),
                email_service=email_service,
            )

        self.assertEqual(result.scanned, 0)
        self.assertEqual(result.sent, 0)
        self.assertEqual(result.skipped, 0)
        self.assertEqual(email_service.sent, [])

    async def test_already_sent_booking_treated_as_idempotent(self):
        # Simulates the race where another worker marked the booking between
        # SELECT and UPDATE. The SQL update returns no row → mark returns
        # False → worker treats this as a benign skip rather than a send.
        _FakeBookingIntentRepository.due_rows = [
            {
                "booking_intent_id": "bi-2",
                "tenant_id": "tenant-aimentor",
                "booking_reference": "BK-1002",
                "customer_name": "Sam",
                "customer_email": "sam@example.com",
                "customer_phone": "",
                "tenant_slug": "ai-mentor-doer",
                "tenant_partner_config": None,
            }
        ]
        _FakeBookingIntentRepository.mark_returns_true = False
        email_service = _FakeEmailService()

        with patch(
            "workers.feedback_request_worker.BookingIntentRepository",
            _FakeBookingIntentRepository,
        ), patch(
            "workers.feedback_request_worker.JobRunRepository",
            _FakeJobRunRepository,
        ):
            result = await dispatch_due_feedback_requests(
                object(),
                email_service=email_service,
            )

        self.assertEqual(result.scanned, 1)
        # Email did fire (the race window is between SELECT and UPDATE), but
        # we count this booking as skipped because we did not flip the
        # cursor — the other worker already did.
        self.assertEqual(result.sent, 0)
        self.assertEqual(result.skipped, 1)

    async def test_tenant_feature_disabled_is_skipped(self):
        _FakeBookingIntentRepository.due_rows = [
            {
                "booking_intent_id": "bi-3",
                "tenant_id": "tenant-other",
                "booking_reference": "BK-1003",
                "customer_name": "Alex",
                "customer_email": "alex@example.com",
                "customer_phone": "",
                # Feature explicitly disabled, slug is NOT the launch partner
                "tenant_slug": "future-swim",
                "tenant_partner_config": {
                    "features": {"post_booking_feedback": "false"},
                },
            }
        ]
        email_service = _FakeEmailService()

        with patch(
            "workers.feedback_request_worker.BookingIntentRepository",
            _FakeBookingIntentRepository,
        ), patch(
            "workers.feedback_request_worker.JobRunRepository",
            _FakeJobRunRepository,
        ):
            result = await dispatch_due_feedback_requests(
                object(),
                email_service=email_service,
            )

        self.assertEqual(result.scanned, 1)
        self.assertEqual(result.sent, 0)
        self.assertEqual(result.skipped, 1)
        self.assertEqual(email_service.sent, [])
        repo = _FakeBookingIntentRepository.instances[-1]
        # Defence-in-depth: we must NOT mark the booking as notified when
        # the gate flips this row off — leave it for the next tick once
        # the feature toggles back on.
        self.assertEqual(repo.marked_references, [])

    async def test_smtp_failure_skips_without_marking(self):
        _FakeBookingIntentRepository.due_rows = [
            {
                "booking_intent_id": "bi-4",
                "tenant_id": "tenant-aimentor",
                "booking_reference": "BK-1004",
                "customer_name": "Pat",
                "customer_email": "pat@example.com",
                "customer_phone": "",
                "tenant_slug": "ai-mentor-doer",
                "tenant_partner_config": None,
            }
        ]
        email_service = _FakeEmailService(raise_on_send=True)

        with patch(
            "workers.feedback_request_worker.BookingIntentRepository",
            _FakeBookingIntentRepository,
        ), patch(
            "workers.feedback_request_worker.JobRunRepository",
            _FakeJobRunRepository,
        ):
            result = await dispatch_due_feedback_requests(
                object(),
                email_service=email_service,
            )

        self.assertEqual(result.scanned, 1)
        self.assertEqual(result.sent, 0)
        self.assertEqual(result.skipped, 1)
        repo = _FakeBookingIntentRepository.instances[-1]
        # Crucially: don't flip feedback_request_sent_at when SMTP failed,
        # otherwise the customer never gets the prompt.
        self.assertEqual(repo.marked_references, [])
