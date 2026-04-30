"""Route-level integration tests for the customer-facing booking lifecycle
endpoints (``POST /api/v1/booking/{ref}/cancel``,
``PATCH /api/v1/booking/{ref}/reschedule``, ``GET /api/v1/booking/{ref}/status``).

These exercise the FastAPI router wiring + auth resolution + status-code
mapping. The orchestrator and DB lookups are mocked at the handler import
site so the tests stay sub-second.
"""

from __future__ import annotations

from contextlib import asynccontextmanager
from datetime import date as _date, datetime, time as _time, timedelta, timezone
from pathlib import Path
import sys
from types import SimpleNamespace
from unittest import TestCase
from unittest.mock import AsyncMock, patch

from fastapi import FastAPI
from fastapi.testclient import TestClient


BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from api.v1_ai_mentor_student_handlers import (  # noqa: E402
    _resolve_student_auth_secret,
    _sign_student_session_token,
)
from api.v1_router import router as v1_router  # noqa: E402


# ---------------------------------------------------------------------------
# Fixtures (kept LOCAL per task constraints — no edits to conftest.py)
# ---------------------------------------------------------------------------


def _make_app() -> FastAPI:
    """Spin up a minimal FastAPI app with the v1 router mounted.

    The session_factory is a sentinel ``object()`` because every code path
    we exercise patches ``get_session`` to bypass the real DB.
    """
    app = FastAPI()
    app.include_router(v1_router)
    app.state.session_factory = object()
    app.state.settings = SimpleNamespace(
        admin_api_token="test-admin-token",
        admin_password="test-admin-password",
        admin_session_ttl_hours=8,
        google_oauth_client_id="google-client-id",
        session_signing_secret="test-session-signing-secret",
        tenant_session_signing_secret="test-tenant-session-signing-secret",
        stripe_secret_key="",
        stripe_currency="aud",
    )
    return app


class _RequestStub:
    """Match the shape ``_resolve_student_auth_secret`` reads from."""

    def __init__(self, app):
        self.app = app


def _issue_student_token(app, *, student_id: str = "stu-1", email: str = "stu@example.com") -> str:
    secret = _resolve_student_auth_secret(_RequestStub(app))
    return _sign_student_session_token(
        secret=secret, student_id=student_id, email=email
    )


class _NoopSession:
    """Bare async session — every read short-circuits to ``None``."""

    async def execute(self, *_args, **_kwargs):
        class _Empty:
            def scalar_one_or_none(self):
                return None

            def mappings(self):
                return SimpleNamespace(first=lambda: None, all=lambda: [])

        return _Empty()

    async def commit(self):
        return None

    async def rollback(self):
        return None


@asynccontextmanager
async def _fake_get_session(_factory):
    yield _NoopSession()


def _booking_row(
    *,
    booking_reference: str = "AIM-RT-001",
    tenant_id: str = "tenant-rt",
    status: str = "paid",
    requested_date: object | None = None,
    requested_time: object | None = None,
    timezone_label: str = "Australia/Sydney",
    metadata_json: dict | None = None,
) -> dict:
    return {
        "booking_intent_id": "bi-rt-001",
        "tenant_id": tenant_id,
        "booking_reference": booking_reference,
        "status": status,
        "requested_date": requested_date,
        "requested_time": requested_time,
        "timezone": timezone_label,
        "metadata_json": metadata_json or {},
    }


# ---------------------------------------------------------------------------
# Cancel
# ---------------------------------------------------------------------------


class CancelBookingRouteTestCase(TestCase):
    BOOKING_REF = "AIM-RT-001"

    def _post_cancel(
        self,
        *,
        orchestrator_mock,
        load_booking_row=None,
        token: str | None = "auto",
    ):
        app = _make_app()
        if token == "auto":
            token = _issue_student_token(app)

        load_row = load_booking_row or AsyncMock(
            return_value=_booking_row()
        )

        # The tenant-admin auth fallback opens a real DB session via
        # ``v1_routes._resolve_tenant_request_context``. Patch it to a stub
        # that returns "no session", so the 401-path test doesn't blow up
        # on the dummy session_factory.
        async def _no_tenant(*_args, **_kwargs):
            return (None, None, None, None)

        patches = [
            patch(
                "api.v1_booking_lifecycle_handlers.get_session", _fake_get_session
            ),
            patch(
                "api.v1_booking_lifecycle_handlers._load_portal_booking_row",
                load_row,
            ),
            patch(
                "api.v1_booking_lifecycle_handlers.orchestrate_booking_cancelled",
                orchestrator_mock,
            ),
            patch(
                "api.v1_booking_lifecycle_handlers._resolve_tenant_request_context",
                _no_tenant,
            ),
        ]

        for p in patches:
            p.start()
        try:
            client = TestClient(app)
            headers = {}
            if token:
                headers["Authorization"] = f"Bearer {token}"
            return client.post(
                f"/api/v1/booking/{self.BOOKING_REF}/cancel",
                json={"reason": "Schedule conflict"},
                headers=headers,
            )
        finally:
            for p in patches:
                p.stop()

    def test_cancel_happy_path(self):
        orchestrator = AsyncMock(
            return_value={
                "status": "cancelled",
                "booking_reference": self.BOOKING_REF,
                "outbox_event_id": 9001,
                "warnings": [],
            }
        )
        response = self._post_cancel(orchestrator_mock=orchestrator)
        self.assertEqual(response.status_code, 200, response.text)
        body = response.json()
        self.assertTrue(body["success"])
        self.assertEqual(body["status"], "cancelled")
        self.assertEqual(body["booking_reference"], self.BOOKING_REF)
        orchestrator.assert_awaited_once()

    def test_cancel_idempotent(self):
        orchestrator = AsyncMock(
            return_value={
                "status": "already_cancelled",
                "booking_reference": self.BOOKING_REF,
                "warnings": [],
            }
        )
        response = self._post_cancel(orchestrator_mock=orchestrator)
        self.assertEqual(response.status_code, 200, response.text)
        body = response.json()
        self.assertTrue(body["success"])
        self.assertTrue(body["idempotent"])
        self.assertEqual(body["status"], "already_cancelled")

    def test_cancel_not_found(self):
        orchestrator = AsyncMock(
            return_value={
                "status": "not_found",
                "booking_reference": self.BOOKING_REF,
                "warnings": ["booking_not_found"],
            }
        )
        response = self._post_cancel(orchestrator_mock=orchestrator)
        self.assertEqual(response.status_code, 404, response.text)
        body = response.json()
        # FastAPI HTTPException with dict detail flattens into ``detail``.
        self.assertEqual(body["detail"]["code"], "booking_not_found")

    def test_cancel_unauthenticated(self):
        # No Authorization header → 401. Orchestrator MUST NOT be called.
        orchestrator = AsyncMock(return_value={"status": "cancelled"})
        response = self._post_cancel(orchestrator_mock=orchestrator, token=None)
        self.assertEqual(response.status_code, 401, response.text)
        orchestrator.assert_not_awaited()

    def test_cancel_orchestrator_error_502(self):
        orchestrator = AsyncMock(side_effect=RuntimeError("zoho exploded"))
        response = self._post_cancel(orchestrator_mock=orchestrator)
        self.assertEqual(response.status_code, 502, response.text)
        body = response.json()
        self.assertEqual(body["detail"]["code"], "booking_cancel_failed")


# ---------------------------------------------------------------------------
# Reschedule
# ---------------------------------------------------------------------------


class RescheduleBookingRouteTestCase(TestCase):
    BOOKING_REF = "AIM-RT-002"

    def _patch_reschedule(
        self,
        *,
        orchestrator_mock,
        load_booking_row=None,
    ):
        app = _make_app()
        token = _issue_student_token(app)

        load_row = load_booking_row or AsyncMock(
            return_value=_booking_row(booking_reference=self.BOOKING_REF)
        )

        async def _no_tenant(*_args, **_kwargs):
            return (None, None, None, None)

        patches = [
            patch(
                "api.v1_booking_lifecycle_handlers.get_session", _fake_get_session
            ),
            patch(
                "api.v1_booking_lifecycle_handlers._load_portal_booking_row",
                load_row,
            ),
            patch(
                "api.v1_booking_lifecycle_handlers.orchestrate_booking_rescheduled",
                orchestrator_mock,
            ),
            patch(
                "api.v1_booking_lifecycle_handlers._resolve_tenant_request_context",
                _no_tenant,
            ),
        ]
        return app, token, patches

    def _send(self, *, orchestrator_mock, new_start_iso: str, load_booking_row=None):
        app, token, patches = self._patch_reschedule(
            orchestrator_mock=orchestrator_mock,
            load_booking_row=load_booking_row,
        )
        for p in patches:
            p.start()
        try:
            client = TestClient(app)
            return client.patch(
                f"/api/v1/booking/{self.BOOKING_REF}/reschedule",
                json={"new_start_at": new_start_iso},
                headers={"Authorization": f"Bearer {token}"},
            )
        finally:
            for p in patches:
                p.stop()

    def test_reschedule_too_soon_returns_422(self):
        # 30 minutes from now — well under the 2h gate.
        too_soon = (datetime.now(tz=timezone.utc) + timedelta(minutes=30)).isoformat()
        orchestrator = AsyncMock()
        response = self._send(
            orchestrator_mock=orchestrator, new_start_iso=too_soon
        )
        self.assertEqual(response.status_code, 422, response.text)
        body = response.json()
        self.assertEqual(body["detail"]["code"], "reschedule_window_too_soon")
        # Crucial: the orchestrator must NOT be invoked when validation fails.
        orchestrator.assert_not_awaited()

    def test_reschedule_happy_path(self):
        new_start = (datetime.now(tz=timezone.utc) + timedelta(days=5)).isoformat()
        orchestrator = AsyncMock(
            return_value={
                "status": "rescheduled",
                "booking_reference": self.BOOKING_REF,
                "new_start_at": new_start,
                "warnings": [],
            }
        )
        response = self._send(
            orchestrator_mock=orchestrator, new_start_iso=new_start
        )
        self.assertEqual(response.status_code, 200, response.text)
        body = response.json()
        self.assertTrue(body["success"])
        self.assertEqual(body["status"], "rescheduled")
        orchestrator.assert_awaited_once()

    def test_reschedule_not_reschedulable_409(self):
        new_start = (datetime.now(tz=timezone.utc) + timedelta(days=5)).isoformat()
        orchestrator = AsyncMock(
            return_value={
                "status": "not_reschedulable",
                "booking_reference": self.BOOKING_REF,
                "current_status": "completed",
                "warnings": ["status_not_reschedulable"],
            }
        )
        response = self._send(
            orchestrator_mock=orchestrator, new_start_iso=new_start
        )
        self.assertEqual(response.status_code, 409, response.text)
        body = response.json()
        self.assertEqual(body["detail"]["code"], "booking_not_reschedulable")


# ---------------------------------------------------------------------------
# Status
# ---------------------------------------------------------------------------


class GetBookingStatusRouteTestCase(TestCase):
    BOOKING_REF = "AIM-RT-003"

    def test_status_returns_eligibility_flags(self):
        app = _make_app()
        token = _issue_student_token(app)

        # Booking starts 5 days in the future → both eligibility flags True.
        future_start = datetime.now(tz=timezone.utc) + timedelta(days=5)
        # ``_start_at_utc_from_booking`` localises (date,time) to the row
        # tz then converts to UTC. Drive that path with values in
        # Australia/Sydney that produce the same UTC instant.
        try:
            from zoneinfo import ZoneInfo

            future_local = future_start.astimezone(ZoneInfo("Australia/Sydney"))
        except Exception:  # noqa: BLE001
            future_local = future_start
        booking = _booking_row(
            booking_reference=self.BOOKING_REF,
            status="paid",
            requested_date=_date(
                future_local.year, future_local.month, future_local.day
            ),
            requested_time=_time(future_local.hour, future_local.minute),
            timezone_label="Australia/Sydney",
        )

        load_row = AsyncMock(return_value=booking)
        payment_status = AsyncMock(
            return_value={"payment_status": "paid"}
        )

        class _StubBookingIntentRepository:
            def __init__(self, *_args, **_kwargs):
                pass

            async def fetch_meeting_metadata(self, *, booking_reference):  # noqa: ARG002
                return None

        with patch(
            "api.v1_booking_lifecycle_handlers.get_session", _fake_get_session
        ), patch(
            "api.v1_booking_lifecycle_handlers._load_portal_booking_row",
            load_row,
        ), patch(
            "api.v1_booking_lifecycle_handlers.get_booking_payment_status",
            payment_status,
        ), patch(
            "api.v1_booking_lifecycle_handlers.BookingIntentRepository",
            _StubBookingIntentRepository,
        ):
            client = TestClient(app)
            response = client.get(
                f"/api/v1/booking/{self.BOOKING_REF}/status",
                headers={"Authorization": f"Bearer {token}"},
            )

        self.assertEqual(response.status_code, 200, response.text)
        body = response.json()
        self.assertEqual(body["booking_reference"], self.BOOKING_REF)
        self.assertEqual(body["status"], "paid")
        self.assertEqual(body["payment_state"], "paid")
        self.assertTrue(body["cancel_eligibility"])
        self.assertTrue(body["reschedule_eligibility"])
