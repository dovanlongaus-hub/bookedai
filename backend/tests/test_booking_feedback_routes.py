"""Tests for /api/v1/booking/{booking_reference}/feedback.

Covers the happy path, portal-token guard rejection, rating range validation,
and the 5-minute idempotency window.
"""

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

from api.v1_router import router as v1_router
from api.v1_routes import AppError


def _create_app() -> FastAPI:
    app = FastAPI()
    app.include_router(v1_router)
    app.state.session_factory = object()
    app.state.settings = SimpleNamespace(
        admin_api_token="test-admin-token",
        admin_password="test-admin-password",
        admin_session_ttl_hours=8,
        google_oauth_client_id="google-client-id",
        portal_token_strict=False,
    )
    app.state.email_service = SimpleNamespace(
        smtp_configured=lambda: False,
        send_email=lambda **_: None,
    )
    return app


class _FakeBookingIntentRepository:
    state = {
        "booking_intent_id": "bi-1",
        "tenant_id": "tenant-aimentor",
        "reminder_cadence": None,
        "reminder_next_at": None,
        "reminder_last_sent_at": None,
    }

    def __init__(self, _ctx) -> None:
        pass

    async def load_reminder_state(self, *, booking_reference):
        if booking_reference == "BAI-MISSING":
            return None
        return dict(self.state)


class _FakeBookingFeedbackRepository:
    inserted = []
    dedupe_lookup = None

    def __init__(self, _ctx) -> None:
        pass

    async def find_recent_feedback(self, *, booking_reference, rating, within_minutes):
        return _FakeBookingFeedbackRepository.dedupe_lookup

    async def insert_feedback(
        self,
        *,
        booking_reference,
        tenant_id,
        rating,
        comment,
        would_recommend,
        channel,
    ):
        feedback_id = f"feedback-{len(_FakeBookingFeedbackRepository.inserted) + 1}"
        _FakeBookingFeedbackRepository.inserted.append(
            {
                "feedback_id": feedback_id,
                "booking_reference": booking_reference,
                "tenant_id": tenant_id,
                "rating": rating,
                "comment": comment,
                "would_recommend": would_recommend,
                "channel": channel,
            }
        )
        return feedback_id


@asynccontextmanager
async def _fake_get_session(_session_factory):
    yield SimpleNamespace(execute=None, commit=_async_noop)


async def _async_noop(*_args, **_kwargs):
    return None


async def _allow_portal(*_args, **_kwargs):
    return None


async def _block_portal(*_args, **_kwargs):
    return AppError(
        code="portal_access_token_required",
        message="A portal access token is required for this booking.",
        status_code=401,
        details={"booking_reference": "BAI-1"},
    )


async def _record_phase2_noop(*_args, **_kwargs):
    return None


class BookingFeedbackRoutesTestCase(TestCase):
    def setUp(self) -> None:
        _FakeBookingFeedbackRepository.inserted = []
        _FakeBookingFeedbackRepository.dedupe_lookup = None

    def _patches(self):
        return [
            patch("api.v1_booking_handlers.get_session", _fake_get_session),
            patch(
                "api.v1_booking_handlers.BookingIntentRepository",
                _FakeBookingIntentRepository,
            ),
            patch(
                "api.v1_booking_handlers.BookingFeedbackRepository",
                _FakeBookingFeedbackRepository,
            ),
            patch(
                "api.v1_booking_handlers._record_phase2_write_activity",
                _record_phase2_noop,
            ),
        ]

    def test_happy_path_records_feedback(self):
        with patch(
            "api.v1_booking_handlers._portal_guard_for_booking", _allow_portal
        ):
            for ctx in self._patches():
                ctx.start()
            try:
                client = TestClient(_create_app())
                response = client.post(
                    "/api/v1/booking/BAI-1/feedback",
                    json={"rating": 5, "comment": "Great session", "would_recommend": True},
                )
            finally:
                for ctx in self._patches():
                    ctx.stop()

        self.assertEqual(response.status_code, 200, response.text)
        payload = response.json()
        self.assertEqual(payload["status"], "ok")
        self.assertIn("feedback_id", payload["data"])
        self.assertEqual(payload["data"]["thanks"], "Thanks for your feedback.")
        # PII (the comment) is NOT echoed back in the response payload.
        self.assertNotIn("comment", payload["data"])
        self.assertEqual(len(_FakeBookingFeedbackRepository.inserted), 1)
        self.assertEqual(
            _FakeBookingFeedbackRepository.inserted[0]["comment"], "Great session"
        )

    def test_invalid_token_returns_403_envelope(self):
        with patch(
            "api.v1_booking_handlers._portal_guard_for_booking", _block_portal
        ):
            client = TestClient(_create_app())
            response = client.post(
                "/api/v1/booking/BAI-1/feedback",
                json={"rating": 5},
            )

        self.assertIn(response.status_code, (401, 403))
        payload = response.json()
        self.assertEqual(payload["status"], "error")
        self.assertEqual(payload["error"]["code"], "portal_access_token_required")

    def test_rating_out_of_range_is_rejected(self):
        with patch(
            "api.v1_booking_handlers._portal_guard_for_booking", _allow_portal
        ):
            for ctx in self._patches():
                ctx.start()
            try:
                client = TestClient(_create_app())
                response = client.post(
                    "/api/v1/booking/BAI-1/feedback",
                    json={"rating": 9},
                )
            finally:
                for ctx in self._patches():
                    ctx.stop()

        self.assertEqual(response.status_code, 422)
        payload = response.json()
        self.assertEqual(payload["status"], "error")

    def test_idempotent_repeat_within_window_returns_dedupe(self):
        _FakeBookingFeedbackRepository.dedupe_lookup = {
            "feedback_id": "feedback-existing",
            "rating": 5,
        }
        with patch(
            "api.v1_booking_handlers._portal_guard_for_booking", _allow_portal
        ):
            for ctx in self._patches():
                ctx.start()
            try:
                client = TestClient(_create_app())
                response = client.post(
                    "/api/v1/booking/BAI-1/feedback",
                    json={"rating": 5},
                )
            finally:
                for ctx in self._patches():
                    ctx.stop()

        self.assertEqual(response.status_code, 200, response.text)
        payload = response.json()
        self.assertEqual(payload["status"], "ok")
        self.assertTrue(payload["data"]["dedupe"])
        self.assertEqual(payload["data"]["feedback_id"], "feedback-existing")
        # No new row was inserted because the dedupe lookup hit.
        self.assertEqual(len(_FakeBookingFeedbackRepository.inserted), 0)
