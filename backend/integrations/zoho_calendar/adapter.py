"""Zoho Calendar adapter — create + cancel events with attendees.

Reuses the same OAuth flow as ``ZohoCrmAdapter``; operator must include
``ZohoCalendar.event.ALL`` in the consent scopes.

Environment variables (read defensively via getattr+os.getenv so the adapter
works without modifying the Settings pydantic model):
  - ``ZOHO_CALENDAR_REFRESH_TOKEN``  (falls back to ``ZOHO_CRM_REFRESH_TOKEN``)
  - ``ZOHO_CALENDAR_CLIENT_ID``      (falls back to ``ZOHO_CRM_CLIENT_ID``)
  - ``ZOHO_CALENDAR_CLIENT_SECRET``  (falls back to ``ZOHO_CRM_CLIENT_SECRET``)
  - ``ZOHO_CALENDAR_API_BASE_URL``   (default ``https://calendar.zoho.com/api/v1``)
  - ``ZOHO_CALENDAR_UID``            (the calendar UID where AI Mentor events go)

Australia data centre example:
  ZOHO_CALENDAR_API_BASE_URL=https://calendar.zoho.com.au/api/v1
"""

from __future__ import annotations

import os
from datetime import datetime, timezone
from typing import Any

import httpx

from config import Settings


_DEFAULT_CALENDAR_BASE_URL = "https://calendar.zoho.com/api/v1"


def _setting(settings: Settings, name: str, fallback: str = "") -> str:
    value = (str(getattr(settings, name, "") or "")).strip()
    if value:
        return value
    env_value = (os.getenv(name.upper()) or "").strip()
    if env_value:
        return env_value
    return fallback


class ZohoCalendarAdapter:
    """Create + cancel events in a Zoho Calendar with attendee invitations."""

    def __init__(self) -> None:
        self.provider_name = "zoho_calendar"

    def configured(self, settings: Settings) -> bool:
        refresh = _setting(settings, "zoho_calendar_refresh_token") or _setting(
            settings, "zoho_crm_refresh_token"
        )
        client_id = _setting(settings, "zoho_calendar_client_id") or _setting(
            settings, "zoho_crm_client_id"
        )
        client_secret = _setting(
            settings, "zoho_calendar_client_secret"
        ) or _setting(settings, "zoho_crm_client_secret")
        calendar_uid = _setting(settings, "zoho_calendar_uid")
        return bool(refresh and client_id and client_secret and calendar_uid)

    def _resolve_credentials(self, settings: Settings) -> tuple[str, str, str, str]:
        refresh = _setting(settings, "zoho_calendar_refresh_token") or _setting(
            settings, "zoho_crm_refresh_token"
        )
        client_id = _setting(settings, "zoho_calendar_client_id") or _setting(
            settings, "zoho_crm_client_id"
        )
        client_secret = _setting(
            settings, "zoho_calendar_client_secret"
        ) or _setting(settings, "zoho_crm_client_secret")
        accounts_url = (
            _setting(settings, "zoho_accounts_base_url") or "https://accounts.zoho.com"
        )
        if not (refresh and client_id and client_secret):
            raise ValueError("Zoho Calendar OAuth credentials are incomplete.")
        return refresh, client_id, client_secret, accounts_url

    def _resolve_api_base_url(self, settings: Settings) -> str:
        return (
            _setting(settings, "zoho_calendar_api_base_url")
            or _DEFAULT_CALENDAR_BASE_URL
        ).rstrip("/")

    def _resolve_calendar_uid(self, settings: Settings) -> str:
        uid = _setting(settings, "zoho_calendar_uid")
        if not uid:
            raise ValueError(
                "ZOHO_CALENDAR_UID is required to create AI Mentor events."
            )
        return uid

    async def get_access_token(self, settings: Settings) -> str:
        refresh, client_id, client_secret, accounts_url = self._resolve_credentials(
            settings
        )
        token_url = f"{accounts_url.rstrip('/')}/oauth/v2/token"
        async with httpx.AsyncClient(timeout=20) as client:
            response = await client.post(
                token_url,
                data={
                    "refresh_token": refresh,
                    "client_id": client_id,
                    "client_secret": client_secret,
                    "grant_type": "refresh_token",
                },
            )
            response.raise_for_status()
            payload = response.json()
        access_token = str(payload.get("access_token") or "").strip()
        if not access_token:
            raise ValueError(
                "Zoho Calendar OAuth response did not include an access token."
            )
        return access_token

    async def create_event(
        self,
        settings: Settings,
        *,
        title: str,
        description: str,
        start_time: datetime,
        end_time: datetime,
        timezone_label: str = "Australia/Sydney",
        attendee_emails: list[str] | None = None,
        meeting_url: str | None = None,
    ) -> dict[str, Any]:
        """Create a calendar event, attendees auto-invited by Zoho.

        Returns ``{event_id, calendar_uid, link}`` on success.
        """
        if start_time.tzinfo is None or end_time.tzinfo is None:
            raise ValueError("create_event requires timezone-aware datetimes.")
        if end_time <= start_time:
            raise ValueError("end_time must be after start_time.")

        access_token = await self.get_access_token(settings)
        api_base = self._resolve_api_base_url(settings)
        calendar_uid = self._resolve_calendar_uid(settings)

        # Zoho Calendar accepts dateandtime in YYYYMMDDTHHmmssZ format
        # (UTC) or with offset. We feed UTC-normalised since
        # ``timezone`` field carries the display tz.
        def _zoho_dt(value: datetime) -> str:
            return value.astimezone(timezone.utc).strftime("%Y%m%dT%H%M%SZ")

        body: dict[str, Any] = {
            "eventdata": [
                {
                    "title": title.strip()[:200] or "AI Mentor 1-on-1 session",
                    "description": (description or "").strip(),
                    "dateandtime": {
                        "timezone": timezone_label,
                        "start": _zoho_dt(start_time),
                        "end": _zoho_dt(end_time),
                    },
                    "isallday": False,
                }
            ]
        }
        if meeting_url:
            body["eventdata"][0]["url"] = meeting_url
        if attendee_emails:
            body["eventdata"][0]["attendees"] = [
                {"email": email.strip().lower(), "permission": 1}
                for email in attendee_emails
                if email and email.strip()
            ]

        response_data = await self._request(
            access_token=access_token,
            method="POST",
            url=f"{api_base}/calendars/{calendar_uid}/events",
            json_body=body,
        )

        # Zoho returns events as a list under "events" or "data".
        events = response_data.get("events") or response_data.get("data") or []
        if not isinstance(events, list) or not events:
            raise ValueError(
                "Zoho Calendar response did not include an event record."
            )
        event = events[0]
        event_id = str(
            event.get("uid") or event.get("eventid") or event.get("id") or ""
        ).strip()
        if not event_id:
            raise ValueError(
                "Zoho Calendar response missing event_id; raw="
                f"{response_data!r}"
            )

        return {
            "provider": self.provider_name,
            "calendar_uid": calendar_uid,
            "event_id": event_id,
            "title": body["eventdata"][0]["title"],
            "start_iso": start_time.astimezone(timezone.utc).isoformat().replace(
                "+00:00", "Z"
            ),
            "end_iso": end_time.astimezone(timezone.utc).isoformat().replace(
                "+00:00", "Z"
            ),
            "attendee_emails": attendee_emails or [],
        }

    async def cancel_event(
        self,
        settings: Settings,
        *,
        event_id: str,
    ) -> dict[str, Any]:
        access_token = await self.get_access_token(settings)
        api_base = self._resolve_api_base_url(settings)
        calendar_uid = self._resolve_calendar_uid(settings)
        response_data = await self._request(
            access_token=access_token,
            method="DELETE",
            url=f"{api_base}/calendars/{calendar_uid}/events/{event_id}",
        )
        return {
            "provider": self.provider_name,
            "calendar_uid": calendar_uid,
            "event_id": event_id,
            "status": str(response_data.get("status") or "deleted"),
        }

    async def _request(
        self,
        *,
        access_token: str,
        method: str,
        url: str,
        params: dict[str, Any] | None = None,
        json_body: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        async with httpx.AsyncClient(timeout=20) as client:
            response = await client.request(
                method=method,
                url=url,
                params=params,
                json=json_body,
                headers={"Authorization": f"Zoho-oauthtoken {access_token}"},
            )
            response.raise_for_status()
            try:
                payload = response.json()
            except Exception:  # noqa: BLE001
                return {}
        return payload if isinstance(payload, dict) else {}
