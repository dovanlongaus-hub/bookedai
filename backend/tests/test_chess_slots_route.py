"""Public list-slots endpoint tests for ``/api/v1/chess/courses/{service_id}/slots``."""

from __future__ import annotations

from contextlib import asynccontextmanager
from datetime import datetime, timedelta, timezone
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

from api.v1_router import router as v1_router  # noqa: E402


def _make_app() -> FastAPI:
    app = FastAPI()
    app.include_router(v1_router)
    app.state.session_factory = object()
    app.state.settings = SimpleNamespace(
        admin_api_token="t", admin_password="p", admin_session_ttl_hours=8,
        google_oauth_client_id="g", session_signing_secret="s",
        tenant_session_signing_secret="ts",
    )
    return app


class _NoopSession:
    async def execute(self, *_args, **_kwargs):
        class _Empty:
            def scalar_one_or_none(self):
                return None
        return _Empty()

    async def commit(self):
        return None


@asynccontextmanager
async def _fake_get_session(_factory):
    yield _NoopSession()


class _SlotRepoStub:
    def __init__(self, rows):
        self.rows = rows
        self.public_calls = []

    async def list_public_slots(self, **kwargs):
        self.public_calls.append(kwargs)
        return list(self.rows)


async def _resolve_chess_tenant_id(_session):
    return "tenant-chess-id"


class ListChessCourseSlotsTestCase(TestCase):
    def test_returns_open_slots_with_available_count(self):
        now = datetime.now(tz=timezone.utc)
        rows = [
            {
                "id": "slot-1",
                "service_id": "co-mai-hung-chess-online-group-60",
                "starts_at": now + timedelta(days=1),
                "duration_minutes": 60,
                "timezone": "Asia/Ho_Chi_Minh",
                "capacity": 8,
                "enrolled_count": 2,
                "available": 6,
                "cohort_label": "Mon/Wed/Fri evening cohort",
                "cohort_recurrence_rule": "FREQ=WEEKLY;BYDAY=MO,WE,FR",
                "status": "open",
                "zoho_meeting_url": None,
                "zoho_calendar_event_url": None,
                "metadata": {},
            },
            {
                "id": "slot-2",
                "service_id": "co-mai-hung-chess-online-group-60",
                "starts_at": now + timedelta(days=3),
                "duration_minutes": 60,
                "timezone": "Asia/Ho_Chi_Minh",
                "capacity": 8,
                "enrolled_count": 8,  # full — repository should NOT include
                "available": 0,
                "cohort_label": "Mon/Wed/Fri evening cohort",
                "cohort_recurrence_rule": "FREQ=WEEKLY;BYDAY=MO,WE,FR",
                "status": "open",
                "zoho_meeting_url": None,
                "zoho_calendar_event_url": None,
                "metadata": {},
            },
        ]
        # Filter out the full slot here to mimic repo behaviour (full
        # slots are excluded by SQL ``enrolled_count < capacity``).
        repo = _SlotRepoStub([rows[0]])

        with patch(
            "api.v1_chess_slot_handlers.get_session", _fake_get_session
        ), patch(
            "api.v1_chess_slot_handlers._resolve_chess_tenant_id",
            _resolve_chess_tenant_id,
        ), patch(
            "api.v1_chess_slot_handlers.ChessScheduleSlotRepository",
            lambda *_a, **_kw: repo,
        ):
            client = TestClient(_make_app())
            response = client.get(
                "/api/v1/chess/courses/co-mai-hung-chess-online-group-60/slots"
            )

        self.assertEqual(response.status_code, 200, response.text)
        body = response.json()
        self.assertEqual(body["status"], "ok")
        slots = body["data"]["slots"]
        self.assertEqual(len(slots), 1)
        self.assertEqual(slots[0]["id"], "slot-1")
        self.assertEqual(slots[0]["available"], 6)
        self.assertEqual(slots[0]["capacity"], 8)
        self.assertEqual(slots[0]["enrolled_count"], 2)
        self.assertEqual(slots[0]["cohort_label"], "Mon/Wed/Fri evening cohort")
        # The handler must have asked for default 28-day window.
        call = repo.public_calls[0]
        self.assertEqual(call["service_id"], "co-mai-hung-chess-online-group-60")
        self.assertEqual(call["limit"], 12)

    def test_respects_from_to_query_params(self):
        repo = _SlotRepoStub([])
        with patch(
            "api.v1_chess_slot_handlers.get_session", _fake_get_session
        ), patch(
            "api.v1_chess_slot_handlers._resolve_chess_tenant_id",
            _resolve_chess_tenant_id,
        ), patch(
            "api.v1_chess_slot_handlers.ChessScheduleSlotRepository",
            lambda *_a, **_kw: repo,
        ):
            client = TestClient(_make_app())
            resp = client.get(
                "/api/v1/chess/courses/co-mai-hung-chess-online-group-60/slots"
                "?from=2026-05-04&to=2026-05-11&limit=5"
            )

        self.assertEqual(resp.status_code, 200, resp.text)
        call = repo.public_calls[0]
        self.assertEqual(call["limit"], 5)
        self.assertEqual(call["starts_from"].date().isoformat(), "2026-05-04")
        self.assertEqual(call["starts_to"].date().isoformat(), "2026-05-11")

    def test_returns_empty_when_chess_tenant_missing(self):
        async def _no_tenant(_session):
            return None

        with patch(
            "api.v1_chess_slot_handlers.get_session", _fake_get_session
        ), patch(
            "api.v1_chess_slot_handlers._resolve_chess_tenant_id", _no_tenant
        ):
            client = TestClient(_make_app())
            resp = client.get("/api/v1/chess/courses/anything/slots")

        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json()["data"]["slots"], [])

    def test_invalid_date_format_returns_validation_error(self):
        with patch(
            "api.v1_chess_slot_handlers.get_session", _fake_get_session
        ), patch(
            "api.v1_chess_slot_handlers._resolve_chess_tenant_id",
            _resolve_chess_tenant_id,
        ):
            client = TestClient(_make_app())
            resp = client.get(
                "/api/v1/chess/courses/x/slots?from=2026/05/04"
            )

        self.assertEqual(resp.status_code, 400)
        body = resp.json()
        self.assertEqual(body["status"], "error")
