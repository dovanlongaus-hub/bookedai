"""Unit tests for the ``POST /api/v1/chess/bookings/.../meeting/regenerate``
endpoint.

These tests cover the two surfaces the BookedAI ops team cares about most:

* When Zoho Calendar is not configured, the endpoint returns a stable
  ``503`` with ``zoho_calendar_unconfigured`` so the operator UI can guide
  the tenant to configure Zoho first.
* When Zoho is configured and the booking exists, the new meeting URL +
  calendar event URL flow back to the operator and are persisted onto
  ``booking_intents.metadata_json -> 'zoho_meeting'`` via
  :func:`BookingIntentRepository.update_zoho_meeting_metadata`.
"""

from __future__ import annotations

from contextlib import asynccontextmanager
from datetime import date as _date, time as _time
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


def _make_app(*, zoho_configured: bool = True) -> FastAPI:
    app = FastAPI()
    app.include_router(v1_router)
    app.state.session_factory = object()
    zoho_uid = "calendar-uid-123" if zoho_configured else ""
    app.state.settings = SimpleNamespace(
        admin_api_token="test-admin-token",
        admin_password="test-admin-password",
        admin_session_ttl_hours=8,
        google_oauth_client_id="google-client-id",
        session_signing_secret="test-session-signing-secret",
        tenant_session_signing_secret="test-tenant-session-signing-secret",
        stripe_secret_key="",
        stripe_currency="aud",
        zoho_calendar_uid=zoho_uid,
        zoho_calendar_access_token="zoho-access-token" if zoho_configured else "",
        zoho_calendar_refresh_token="",
        zoho_calendar_client_id="",
        zoho_calendar_client_secret="",
        zoho_calendar_base_url="https://calendar.zoho.com",
        zoho_accounts_base_url="https://accounts.zoho.com",
    )
    return app


async def _resolve_signed_tenant_context(*_args, **_kwargs):
    return (
        "co-mai-hung-chess-class",
        "tenant-chess-id",
        {"email": "mai@example.com", "tenant_ref": "co-mai-hung-chess-class"},
        {"email": "mai@example.com", "role": "tenant_admin", "status": "active"},
    )


class _RegenerateScriptedRepository:
    """Drop-in replacement for :class:`BookingIntentRepository`.

    The handler reaches into ``fetch_meeting_metadata`` + ``update_zoho_meeting_metadata``,
    so we stub both with predictable async responses and assert on the
    captured arguments after the call.
    """

    def __init__(self, *, booking: dict | None):
        self._booking = booking
        self.update_calls: list[dict] = []

    async def fetch_meeting_metadata(self, *, booking_reference: str):
        if not self._booking:
            return None
        return dict(self._booking)

    async def update_zoho_meeting_metadata(
        self,
        *,
        booking_reference: str,
        meeting_url: str | None,
        calendar_event_url: str | None = None,
        event_id: str | None = None,
        scheduled_at=None,
        extra=None,
    ):
        self.update_calls.append(
            {
                "booking_reference": booking_reference,
                "meeting_url": meeting_url,
                "calendar_event_url": calendar_event_url,
                "extra": extra,
            }
        )
        return {"zoho_meeting": {"meeting_url": meeting_url}}


class _NoopSession:
    async def execute(self, *_args, **_kwargs):
        class _Empty:
            def scalar_one_or_none(self):
                return None

        return _Empty()

    async def commit(self):
        return None

    async def rollback(self):
        return None


@asynccontextmanager
async def _fake_get_session(_factory):
    yield _NoopSession()


class RegenerateMeetingZohoUnconfiguredTestCase(TestCase):
    def test_returns_503_when_zoho_not_configured(self):
        """Without ``ZOHO_CALENDAR_UID`` (and no OAuth credentials), the
        endpoint must surface ``503 zoho_calendar_unconfigured`` so the
        tenant operator UI can prompt for Zoho configuration."""
        app = _make_app(zoho_configured=False)
        with patch(
            "api.v1_chess_meeting_handlers._resolve_tenant_request_context",
            _resolve_signed_tenant_context,
        ):
            client = TestClient(app)
            response = client.post(
                "/api/v1/chess/bookings/v1-zzzz9999/meeting/regenerate",
                json={},
            )

        self.assertEqual(response.status_code, 503, response.text)
        body = response.json()
        self.assertEqual(body["status"], "error")
        self.assertEqual(body["error"]["code"], "zoho_calendar_unconfigured")


class RegenerateMeetingHappyPathTestCase(TestCase):
    def test_calls_zoho_and_persists_metadata(self):
        """A configured tenant + valid booking should flow through to a fresh
        meeting URL + calendar URL, saved via :class:`BookingIntentRepository`."""
        app = _make_app(zoho_configured=True)
        booking = {
            "booking_intent_id": "bi-xyz",
            "tenant_id": "tenant-chess-id",
            "booking_reference": "v1-zzzz9999",
            "service_name": "Chess Beginner Program",
            "service_id": "chess-beginner",
            "requested_date": _date(2026, 5, 1),
            "requested_time": _time(10, 0),
            "timezone": "Asia/Ho_Chi_Minh",
            "metadata_json": {},
            "customer_email": "parent@example.com",
            "customer_name": "Parent Demo",
        }
        scripted_repo = _RegenerateScriptedRepository(booking=booking)

        async def _fake_create_meeting(**kwargs):
            return ("https://meet.zoho.com/regen-AAAA", "https://calendar.zoho.com/event/regen")

        with patch(
            "api.v1_chess_meeting_handlers._resolve_tenant_request_context",
            _resolve_signed_tenant_context,
        ), patch(
            "api.v1_chess_meeting_handlers.get_session", _fake_get_session
        ), patch(
            "api.v1_chess_meeting_handlers.BookingIntentRepository",
            lambda *_args, **_kwargs: scripted_repo,
        ), patch(
            "api.v1_chess_meeting_handlers.create_zoho_meeting_for_booking",
            _fake_create_meeting,
        ):
            client = TestClient(app)
            response = client.post(
                "/api/v1/chess/bookings/v1-zzzz9999/meeting/regenerate",
                json={"duration_minutes": 60},
            )

        self.assertEqual(response.status_code, 200, response.text)
        body = response.json()
        self.assertEqual(body["status"], "ok")
        self.assertEqual(
            body["data"]["meeting_url"], "https://meet.zoho.com/regen-AAAA"
        )
        self.assertEqual(
            body["data"]["calendar_event_url"],
            "https://calendar.zoho.com/event/regen",
        )
        # Verify persistence was triggered with the new URLs
        self.assertEqual(len(scripted_repo.update_calls), 1)
        call = scripted_repo.update_calls[0]
        self.assertEqual(call["booking_reference"], "v1-zzzz9999")
        self.assertEqual(call["meeting_url"], "https://meet.zoho.com/regen-AAAA")
        self.assertIn("regenerated_by_email", call["extra"])
