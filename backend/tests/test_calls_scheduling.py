from __future__ import annotations

import asyncio
from datetime import datetime, timezone
from types import SimpleNamespace
from unittest import TestCase
from unittest.mock import AsyncMock, patch

from service_layer.calls_scheduling import (
    cancel_zoho_meeting_for_booking,
    get_zoho_access_token,
    update_zoho_meeting_time_for_booking,
)


class _TokenResponse:
    def raise_for_status(self):
        return None

    def json(self):
        return {"access_token": "fresh-calendar-token"}


class _AsyncClient:
    post_calls: list[dict] = []

    def __init__(self, *args, **kwargs):
        self.args = args
        self.kwargs = kwargs

    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc, tb):
        return None

    async def post(self, url, *, data):
        self.post_calls.append({"url": url, "data": data})
        return _TokenResponse()


class ZohoCalendarTokenTestCase(TestCase):
    def test_refresh_token_is_preferred_over_static_access_token(self):
        _AsyncClient.post_calls = []
        settings = SimpleNamespace(
            zoho_accounts_base_url="https://accounts.zoho.com.au",
            zoho_calendar_access_token="expired-static-token",
            zoho_calendar_refresh_token="refresh-token",
            zoho_calendar_client_id="client-id",
            zoho_calendar_client_secret="client-secret",
            zoho_crm_refresh_token="",
            zoho_crm_client_id="",
            zoho_crm_client_secret="",
        )

        with patch("service_layer.calls_scheduling.httpx.AsyncClient", _AsyncClient):
            token = asyncio.run(get_zoho_access_token(settings))

        self.assertEqual(token, "fresh-calendar-token")
        self.assertEqual(len(_AsyncClient.post_calls), 1)
        self.assertEqual(
            _AsyncClient.post_calls[0]["url"],
            "https://accounts.zoho.com.au/oauth/v2/token",
        )
        self.assertEqual(_AsyncClient.post_calls[0]["data"]["grant_type"], "refresh_token")


class CancelZohoMeetingForBookingTestCase(TestCase):
    def test_returns_cancelled_status_on_success(self):
        settings = SimpleNamespace()
        adapter = SimpleNamespace(
            cancel_meeting=AsyncMock(
                return_value={
                    "provider": "zoho_meeting",
                    "meeting_id": "abc-123",
                    "status": "deleted",
                }
            )
        )
        with patch(
            "integrations.zoho_meeting.ZohoMeetingAdapter",
            return_value=adapter,
        ):
            result = asyncio.run(
                cancel_zoho_meeting_for_booking(settings, meeting_id="abc-123")
            )

        self.assertEqual(result["status"], "cancelled")
        self.assertEqual(result["meeting_id"], "abc-123")
        adapter.cancel_meeting.assert_awaited_once_with(settings, meeting_id="abc-123")

    def test_returns_failed_status_on_value_error(self):
        settings = SimpleNamespace()
        adapter = SimpleNamespace(
            cancel_meeting=AsyncMock(side_effect=ValueError("creds incomplete"))
        )
        with patch(
            "integrations.zoho_meeting.ZohoMeetingAdapter",
            return_value=adapter,
        ):
            result = asyncio.run(
                cancel_zoho_meeting_for_booking(settings, meeting_id="abc-123")
            )

        self.assertEqual(result["status"], "failed")
        self.assertEqual(result["meeting_id"], "abc-123")
        self.assertIn("creds incomplete", result["error"])


class UpdateZohoMeetingTimeForBookingTestCase(TestCase):
    def test_returns_updated_status_on_success(self):
        settings = SimpleNamespace()
        adapter = SimpleNamespace(
            update_meeting_time=AsyncMock(
                return_value={
                    "provider": "zoho_meeting",
                    "meeting_id": "abc-123",
                    "start_time_iso": "2026-05-01T03:00:00Z",
                    "duration_minutes": 45,
                    "status": "updated",
                }
            )
        )
        new_start = datetime(2026, 5, 1, 3, 0, tzinfo=timezone.utc)
        with patch(
            "integrations.zoho_meeting.ZohoMeetingAdapter",
            return_value=adapter,
        ):
            result = asyncio.run(
                update_zoho_meeting_time_for_booking(
                    settings,
                    meeting_id="abc-123",
                    new_start_at=new_start,
                    duration_minutes=45,
                )
            )

        self.assertEqual(result["status"], "updated")
        self.assertEqual(result["meeting_id"], "abc-123")
        self.assertEqual(result["duration_minutes"], 45)
        adapter.update_meeting_time.assert_awaited_once()

    def test_returns_failed_status_on_value_error(self):
        settings = SimpleNamespace()
        adapter = SimpleNamespace(
            update_meeting_time=AsyncMock(side_effect=ValueError("bad duration"))
        )
        new_start = datetime(2026, 5, 1, 3, 0, tzinfo=timezone.utc)
        with patch(
            "integrations.zoho_meeting.ZohoMeetingAdapter",
            return_value=adapter,
        ):
            result = asyncio.run(
                update_zoho_meeting_time_for_booking(
                    settings,
                    meeting_id="abc-123",
                    new_start_at=new_start,
                    duration_minutes=45,
                )
            )

        self.assertEqual(result["status"], "failed")
        self.assertEqual(result["meeting_id"], "abc-123")
        self.assertIn("bad duration", result["error"])
