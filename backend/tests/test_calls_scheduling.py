from __future__ import annotations

import asyncio
from types import SimpleNamespace
from unittest import TestCase
from unittest.mock import patch

from service_layer.calls_scheduling import get_zoho_access_token


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
