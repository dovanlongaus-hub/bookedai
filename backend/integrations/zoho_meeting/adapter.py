"""Zoho Meeting adapter — schedule + cancel meetings via the Zoho Meeting API.

Reuses the same refresh-token + client credentials as ``ZohoCrmAdapter``
(``backend/integrations/zoho_crm/adapter.py``) so operators don't have to
configure a second OAuth app — they just need to include
``ZohoMeeting.session.ALL`` in the consent screen alongside the CRM scopes.

Optional overrides via env vars (resolved by the Settings class but read
defensively here so the adapter still works when the Settings model has
not been extended yet):
  - ``ZOHO_MEETING_REFRESH_TOKEN``  (falls back to ``ZOHO_CRM_REFRESH_TOKEN``)
  - ``ZOHO_MEETING_CLIENT_ID``     (falls back to ``ZOHO_CRM_CLIENT_ID``)
  - ``ZOHO_MEETING_CLIENT_SECRET`` (falls back to ``ZOHO_CRM_CLIENT_SECRET``)
  - ``ZOHO_MEETING_USER_ID``       (Zoho user id under whom meetings are
                                    scheduled — required)
  - ``ZOHO_MEETING_API_BASE_URL``  (default ``https://meeting.zoho.com/api/v2``)

Example (Australian data centre):
  ZOHO_MEETING_API_BASE_URL=https://meeting.zoho.com.au/api/v2
"""

from __future__ import annotations

import os
from datetime import datetime, timedelta, timezone
from typing import Any

import httpx

from config import Settings


_DEFAULT_MEETING_BASE_URL = "https://meeting.zoho.com/api/v2"


def _setting(settings: Settings, name: str, fallback: str = "") -> str:
    """Read a settings attribute defensively.

    The Settings pydantic model may not yet expose Zoho Meeting fields
    (env vars work without schema changes via getattr+os.getenv). This helper
    resolves in priority order:
      1. ``settings.<name>`` if defined
      2. ``os.getenv(name.upper())``
      3. ``fallback``
    """
    value = (str(getattr(settings, name, "") or "")).strip()
    if value:
        return value
    env_value = (os.getenv(name.upper()) or "").strip()
    if env_value:
        return env_value
    return fallback


class ZohoMeetingAdapter:
    """Schedule, fetch, and cancel Zoho Meeting sessions for AI Mentor bookings."""

    def __init__(self) -> None:
        self.provider_name = "zoho_meeting"

    # -------- configuration ------------------------------------------------

    def configured(self, settings: Settings) -> bool:
        """True iff we can mint an access token + know which user to schedule under."""
        refresh = _setting(settings, "zoho_meeting_refresh_token") or _setting(
            settings, "zoho_crm_refresh_token"
        )
        client_id = _setting(settings, "zoho_meeting_client_id") or _setting(
            settings, "zoho_crm_client_id"
        )
        client_secret = _setting(settings, "zoho_meeting_client_secret") or _setting(
            settings, "zoho_crm_client_secret"
        )
        user_id = _setting(settings, "zoho_meeting_user_id")
        return bool(refresh and client_id and client_secret and user_id)

    def _resolve_credentials(self, settings: Settings) -> tuple[str, str, str, str]:
        refresh = _setting(settings, "zoho_meeting_refresh_token") or _setting(
            settings, "zoho_crm_refresh_token"
        )
        client_id = _setting(settings, "zoho_meeting_client_id") or _setting(
            settings, "zoho_crm_client_id"
        )
        client_secret = _setting(settings, "zoho_meeting_client_secret") or _setting(
            settings, "zoho_crm_client_secret"
        )
        accounts_url = (
            _setting(settings, "zoho_accounts_base_url") or "https://accounts.zoho.com"
        )
        if not (refresh and client_id and client_secret):
            raise ValueError("Zoho Meeting OAuth credentials are incomplete.")
        return refresh, client_id, client_secret, accounts_url

    def _resolve_api_base_url(self, settings: Settings) -> str:
        return (
            _setting(settings, "zoho_meeting_api_base_url") or _DEFAULT_MEETING_BASE_URL
        ).rstrip("/")

    def _resolve_user_id(self, settings: Settings) -> str:
        user_id = _setting(settings, "zoho_meeting_user_id")
        if not user_id:
            raise ValueError(
                "ZOHO_MEETING_USER_ID is required to schedule Zoho Meeting sessions."
            )
        return user_id

    # -------- OAuth --------------------------------------------------------

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
                "Zoho Meeting OAuth response did not include an access token."
            )
        return access_token

    # -------- public API ---------------------------------------------------

    async def create_meeting(
        self,
        settings: Settings,
        *,
        topic: str,
        agenda: str,
        start_time: datetime,
        duration_minutes: int,
        attendee_emails: list[str] | None = None,
        timezone_label: str = "Australia/Sydney",
    ) -> dict[str, Any]:
        """Schedule a Zoho Meeting session and return joinLink + meta.

        ``start_time`` must be timezone-aware. ``duration_minutes`` should be
        > 0. ``attendee_emails`` are added to the session as registrants so
        Zoho emails them the join link automatically (in addition to our
        own welcome email).

        Returns a dict shaped like:
            {
              "meeting_id": "...",
              "join_url": "https://meeting.zoho.com/...",
              "topic": "...",
              "start_time_iso": "...",
              "duration_minutes": 60,
              "attendee_emails": [...],
            }
        """
        if start_time.tzinfo is None:
            raise ValueError(
                "create_meeting requires a timezone-aware start_time."
            )
        if duration_minutes <= 0:
            raise ValueError("duration_minutes must be positive.")

        access_token = await self.get_access_token(settings)
        api_base = self._resolve_api_base_url(settings)
        user_id = self._resolve_user_id(settings)
        # Zoho expects ISO-8601 with offset; UTC-normalise then keep offset.
        start_iso = start_time.astimezone(timezone.utc).isoformat().replace(
            "+00:00", "Z"
        )

        body: dict[str, Any] = {
            "topic": topic.strip()[:200] or "AI Mentor 1-on-1 session",
            "agenda": (agenda or "").strip()[:1000],
            "startTime": start_iso,
            "duration": int(duration_minutes),
            "timezone": timezone_label,
            "presenter": user_id,
        }
        if attendee_emails:
            body["registrants"] = [
                {"email": email.strip().lower()}
                for email in attendee_emails
                if email and email.strip()
            ]

        response_data = await self._request(
            access_token=access_token,
            method="POST",
            url=f"{api_base}/{user_id}/sessions",
            json_body=body,
        )

        # Zoho returns a session record under "session" or "data" depending
        # on API version — handle both.
        session = (
            response_data.get("session")
            or response_data.get("data")
            or response_data
        )
        if isinstance(session, list) and session:
            session = session[0]
        if not isinstance(session, dict):
            raise ValueError("Zoho Meeting response did not include a session record.")

        meeting_id = str(
            session.get("sessionKey")
            or session.get("session_key")
            or session.get("meetingKey")
            or session.get("id")
            or ""
        ).strip()
        join_url = str(
            session.get("joinLink")
            or session.get("join_url")
            or session.get("meeting_url")
            or ""
        ).strip()

        if not meeting_id or not join_url:
            raise ValueError(
                "Zoho Meeting response missing meeting_id or join_url; raw="
                f"{response_data!r}"
            )

        return {
            "provider": self.provider_name,
            "meeting_id": meeting_id,
            "join_url": join_url,
            "topic": body["topic"],
            "start_time_iso": start_iso,
            "duration_minutes": int(duration_minutes),
            "attendee_emails": attendee_emails or [],
        }

    async def cancel_meeting(
        self,
        settings: Settings,
        *,
        meeting_id: str,
    ) -> dict[str, Any]:
        access_token = await self.get_access_token(settings)
        api_base = self._resolve_api_base_url(settings)
        user_id = self._resolve_user_id(settings)
        response_data = await self._request(
            access_token=access_token,
            method="DELETE",
            url=f"{api_base}/{user_id}/sessions/{meeting_id}",
        )
        return {
            "provider": self.provider_name,
            "meeting_id": meeting_id,
            "status": str(response_data.get("status") or "deleted"),
        }

    async def update_meeting_time(
        self,
        settings: Settings,
        *,
        meeting_id: str,
        new_start_at: datetime,
        duration_minutes: int,
        timezone_label: str = "Australia/Sydney",
    ) -> dict[str, Any]:
        """Update an existing Zoho Meeting session's start time + duration.

        Mirrors ``create_meeting``'s body shape (``startTime``/``duration``/
        ``timezone``) but targets an existing session via PUT on
        ``/{user_id}/sessions/{meeting_id}``. Used when a booking is
        rescheduled.
        """
        if new_start_at.tzinfo is None:
            raise ValueError(
                "update_meeting_time requires a timezone-aware new_start_at."
            )
        if duration_minutes <= 0:
            raise ValueError("duration_minutes must be positive.")

        access_token = await self.get_access_token(settings)
        api_base = self._resolve_api_base_url(settings)
        user_id = self._resolve_user_id(settings)
        # Same UTC-normalised ISO-8601 with Z suffix as create_meeting.
        start_iso = new_start_at.astimezone(timezone.utc).isoformat().replace(
            "+00:00", "Z"
        )

        body: dict[str, Any] = {
            "startTime": start_iso,
            "duration": int(duration_minutes),
            "timezone": timezone_label,
        }

        response_data = await self._request(
            access_token=access_token,
            method="PUT",
            url=f"{api_base}/{user_id}/sessions/{meeting_id}",
            json_body=body,
        )

        return {
            "provider": self.provider_name,
            "meeting_id": meeting_id,
            "start_time_iso": start_iso,
            "duration_minutes": int(duration_minutes),
            "status": str(response_data.get("status") or "updated"),
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
