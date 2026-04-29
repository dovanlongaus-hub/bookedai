"""Tests for GET /api/v1/orders/{order_reference}.

The handler builds a structured envelope from booking_intents + linked
contacts + service_merchant_profiles + tenant_settings + (optionally)
chess_course_schedule_slots. We stub the underlying SQL helpers so the
test does not require a live Postgres instance.
"""

from __future__ import annotations

import sys
from contextlib import asynccontextmanager
from datetime import date as _date, datetime, time as _time, timezone as _tz
from pathlib import Path
from types import SimpleNamespace
from unittest import TestCase
from unittest.mock import patch

from fastapi import FastAPI
from fastapi.testclient import TestClient


BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from api.v1_router import router as v1_router  # noqa: E402


def _make_app() -> FastAPI:
    app = FastAPI()
    app.include_router(v1_router)
    app.state.session_factory = object()
    app.state.settings = SimpleNamespace(
        admin_api_token="t",
        admin_password="p",
        admin_session_ttl_hours=8,
        google_oauth_client_id="g",
        session_signing_secret="s",
        tenant_session_signing_secret="ts",
    )
    return app


class _NoopSession:
    async def execute(self, *_a, **_kw):
        class _Empty:
            def scalar_one_or_none(self):
                return None

        return _Empty()

    async def commit(self):
        return None


@asynccontextmanager
async def _fake_get_session(_factory):
    yield _NoopSession()


def _sample_booking_row() -> dict:
    return {
        "booking_intent_id": "bi-001",
        "tenant_id": "tenant-chess-id",
        "booking_reference": "BAI-CHESS-001",
        "service_id": "co-mai-hung-chess-online-private-60",
        "service_name": "Chess Private 1-on-1 Coaching",
        "requested_date": _date(2026, 5, 4),
        "requested_time": _time(19, 0),
        "timezone": "Asia/Ho_Chi_Minh",
        "status": "confirmed",
        "payment_dependency_state": "paid",
        "created_at": datetime(2026, 4, 20, 9, 30, tzinfo=_tz.utc),
        "metadata_json": {
            "schedule_slot_id": "slot-001",
            "payment_status": "paid",
            "stripe_session_id": "cs_test_001",
            "zoho_meeting": {
                "meeting_url": "https://meet.zoho.com/abc",
                "calendar_event_url": "https://calendar.zoho.com/event/abc",
            },
        },
        "customer_name": "Demo Parent",
        "customer_email": "parent@example.com",
        "customer_phone": "+84-900-000-000",
        "program_name": "Chess Private 1-on-1 Coaching",
        "program_summary": "Direct 1-on-1 with WGM Mai Hưng.",
        "program_amount_aud": 65,
        "program_display_price_vnd": "1,040,000 VND",
        "program_currency_code": "AUD",
        "program_duration_minutes": 60,
        "program_metadata": {"tier": "2"},
        "tenant_settings_json": {
            "support_email": "chess@bookedai.au",
            "support_phone": None,
            "coach_profile": {
                "display_name_en": "WGM Mai Hưng",
                "title_short": "WGM",
                "bio_en": (
                    "Vietnamese Woman Grandmaster, peak Elo 2357, 5x Olympiad team."
                ),
            },
        },
    }


def _sample_slot_row() -> dict:
    return {
        "id": "slot-001",
        "service_id": "co-mai-hung-chess-online-private-60",
        "starts_at": datetime(2026, 5, 4, 19, 0, tzinfo=_tz.utc),
        "duration_minutes": 60,
        "timezone": "Asia/Ho_Chi_Minh",
        "cohort_label": "Tue 19:00 cohort",
        "status": "open",
        "zoho_meeting_url": None,
        "zoho_calendar_event_url": None,
    }


class OrderDetailRouteTestCase(TestCase):
    def test_returns_full_envelope_for_known_reference(self):
        booking = _sample_booking_row()
        slot = _sample_slot_row()

        async def _fake_fetch_order_row(_session, *, order_reference):
            self.assertEqual(order_reference, "BAI-CHESS-001")
            return booking

        async def _fake_fetch_slot(_session, *, schedule_slot_id, tenant_id):
            self.assertEqual(schedule_slot_id, "slot-001")
            self.assertEqual(tenant_id, "tenant-chess-id")
            return slot

        with patch(
            "api.v1_orders_handlers.get_session", _fake_get_session
        ), patch(
            "api.v1_orders_handlers._fetch_order_row", _fake_fetch_order_row
        ), patch(
            "api.v1_orders_handlers._fetch_schedule_slot", _fake_fetch_slot
        ):
            client = TestClient(_make_app())
            response = client.get("/api/v1/orders/BAI-CHESS-001")

        self.assertEqual(response.status_code, 200, response.text)
        body = response.json()
        self.assertEqual(body["status"], "ok")
        data = body["data"]
        self.assertEqual(data["order_reference"], "BAI-CHESS-001")
        self.assertEqual(data["status"], "confirmed")

        self.assertEqual(data["customer"]["name"], "Demo Parent")
        self.assertEqual(data["customer"]["email"], "parent@example.com")
        self.assertEqual(data["customer"]["phone"], "+84-900-000-000")

        self.assertEqual(len(data["sessions"]), 1)
        session = data["sessions"][0]
        self.assertEqual(session["program_name"], "Chess Private 1-on-1 Coaching")
        self.assertEqual(session["cohort_label"], "Tue 19:00 cohort")
        self.assertEqual(session["meeting_url"], "https://meet.zoho.com/abc")
        self.assertEqual(
            session["calendar_event_url"], "https://calendar.zoho.com/event/abc"
        )
        self.assertEqual(session["duration_minutes"], 60)
        self.assertEqual(session["timezone"], "Asia/Ho_Chi_Minh")
        self.assertEqual(session["tier"], "2")
        self.assertIn(session["session_status"], {"upcoming", "completed"})

        self.assertEqual(data["payment"]["status"], "paid")
        self.assertEqual(data["payment"]["method"], "stripe")
        self.assertEqual(data["payment"]["amount"], 65.0)
        self.assertEqual(data["payment"]["currency"], "AUD")

        self.assertEqual(data["coach"]["display_name"], "WGM Mai Hưng")
        self.assertEqual(data["coach"]["title_short"], "WGM")
        self.assertIn("Vietnamese", data["coach"]["bio_short"] or "")

        self.assertFalse(data["promo"]["applied"])

        self.assertEqual(data["support"]["email"], "chess@bookedai.au")
        self.assertIsNone(data["support"]["phone"])

    def test_returns_404_for_unknown_reference(self):
        async def _fake_fetch_order_row(_session, *, order_reference):
            return None

        with patch(
            "api.v1_orders_handlers.get_session", _fake_get_session
        ), patch(
            "api.v1_orders_handlers._fetch_order_row", _fake_fetch_order_row
        ):
            client = TestClient(_make_app())
            response = client.get("/api/v1/orders/NOPE-NONE")

        self.assertEqual(response.status_code, 404, response.text)
        body = response.json()
        self.assertEqual(body["status"], "error")
        self.assertEqual(body["error"]["code"], "order_not_found")

    def test_pending_payment_status_when_unpaid(self):
        booking = _sample_booking_row()
        booking["status"] = "captured"
        booking["payment_dependency_state"] = "pending"
        booking["metadata_json"]["payment_status"] = "pending"

        async def _fake_fetch_order_row(_session, *, order_reference):
            return booking

        async def _fake_fetch_slot(_session, *, schedule_slot_id, tenant_id):
            return None

        with patch(
            "api.v1_orders_handlers.get_session", _fake_get_session
        ), patch(
            "api.v1_orders_handlers._fetch_order_row", _fake_fetch_order_row
        ), patch(
            "api.v1_orders_handlers._fetch_schedule_slot", _fake_fetch_slot
        ):
            client = TestClient(_make_app())
            response = client.get("/api/v1/orders/BAI-CHESS-001")

        self.assertEqual(response.status_code, 200, response.text)
        data = response.json()["data"]
        self.assertEqual(data["status"], "pending_payment")
        self.assertEqual(data["payment"]["status"], "pending")
