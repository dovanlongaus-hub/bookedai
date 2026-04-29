from __future__ import annotations

from datetime import datetime, timedelta
import json
from typing import Any
from urllib.parse import quote, urlencode
from zoneinfo import ZoneInfo

import httpx

from config import Settings
from schemas import BookingAssistantSessionRequest, DemoBookingRequest, PricingConsultationRequest, ServiceCatalogItem


def build_customer_portal_url(
    base_url: str,
    booking_reference: str,
    access_token: str | None = None,
) -> str:
    base = f"{base_url.rstrip('/')}/?booking_reference={quote(booking_reference, safe='')}"
    if access_token:
        base += f"&token={quote(access_token, safe='')}"
    return base


def build_qr_code_url(target_url: str) -> str:
    return (
        "https://api.qrserver.com/v1/create-qr-code/?size=240x240&data="
        f"{quote(target_url, safe='')}"
    )


def format_amount(amount_aud: float) -> str:
    return f"A${amount_aud:,.2f}"


def build_google_calendar_url(
    *,
    booking_reference: str,
    service: ServiceCatalogItem,
    customer_name: str,
    requested_date,
    requested_time,
    timezone: str,
    notes: str | None,
) -> str:
    zone = ZoneInfo(timezone)
    start_at = datetime.combine(requested_date, requested_time, tzinfo=zone)
    end_at = start_at + timedelta(minutes=service.duration_minutes)
    details = [
        f"BookedAI booking reference: {booking_reference}",
        f"Service: {service.name}",
        f"Customer: {customer_name}",
    ]
    if notes:
        details.append(f"Notes: {notes.strip()}")
    params = urlencode(
        {
            "action": "TEMPLATE",
            "text": f"{service.name} - {customer_name}",
            "dates": (
                f"{start_at.astimezone(ZoneInfo('UTC')).strftime('%Y%m%dT%H%M%SZ')}/"
                f"{end_at.astimezone(ZoneInfo('UTC')).strftime('%Y%m%dT%H%M%SZ')}"
            ),
            "details": "\n".join(details),
            "location": " • ".join(
                item for item in [service.venue_name, service.location] if item
            )
            or "Service booking via BookedAI",
            "ctz": timezone,
        }
    )
    return f"https://calendar.google.com/calendar/render?{params}"


def zoho_calendar_configured(
    settings: Settings | None,
    *,
    tenant_credentials: object | None = None,
) -> bool:
    """Return True when Zoho Calendar credentials are present.

    Defensive against ``None`` / partial mock settings so test fixtures
    (which use ``SimpleNamespace`` with a minimal attribute set) don't have
    to declare every Zoho env var. Production settings always carry these
    attributes via :class:`config.Settings`, so this only widens the helper
    for test ergonomics — behaviour is unchanged when all fields are set.

    When ``tenant_credentials`` is supplied (a
    :class:`ZohoCalendarCredentials` bundle from
    ``service_layer.zoho_tenant_credentials``), the helper considers the
    tenant configured as long as the bundle carries a refresh-token triple
    and any usable calendar UID (tenant or platform). Falls back to the
    legacy platform-only path when ``tenant_credentials`` is ``None``.
    """
    if tenant_credentials is not None:
        refresh_token = str(getattr(tenant_credentials, "refresh_token", "") or "").strip()
        client_id = str(getattr(tenant_credentials, "client_id", "") or "").strip()
        client_secret = str(getattr(tenant_credentials, "client_secret", "") or "").strip()
        calendar_uid = str(getattr(tenant_credentials, "calendar_uid", "") or "").strip()
        if not calendar_uid and settings is not None:
            calendar_uid = str(getattr(settings, "zoho_calendar_uid", "") or "").strip()
        return bool(refresh_token and client_id and client_secret and calendar_uid)
    if settings is None:
        return False
    uid = getattr(settings, "zoho_calendar_uid", "") or ""
    access_token = getattr(settings, "zoho_calendar_access_token", "") or ""
    refresh_token = (
        getattr(settings, "zoho_calendar_refresh_token", "")
        or getattr(settings, "zoho_crm_refresh_token", "")
        or ""
    )
    client_id = (
        getattr(settings, "zoho_calendar_client_id", "")
        or getattr(settings, "zoho_crm_client_id", "")
        or ""
    )
    client_secret = (
        getattr(settings, "zoho_calendar_client_secret", "")
        or getattr(settings, "zoho_crm_client_secret", "")
        or ""
    )
    return bool(uid and (access_token or (refresh_token and client_id and client_secret)))


def _zoho_calendar_api_base_url(
    settings: Settings,
    *,
    tenant_credentials: object | None = None,
) -> str:
    if tenant_credentials is not None:
        candidate = str(getattr(tenant_credentials, "api_base_url", "") or "").strip()
        if candidate:
            base_url = candidate.rstrip("/")
            if base_url.endswith("/api/v1"):
                return base_url
            return f"{base_url}/api/v1"
    configured = (
        getattr(settings, "zoho_calendar_api_base_url", "")
        or getattr(settings, "zoho_calendar_base_url", "")
        or "https://calendar.zoho.com/api/v1"
    )
    base_url = str(configured).rstrip("/")
    if base_url.endswith("/api/v1"):
        return base_url
    return f"{base_url}/api/v1"


def _zoho_calendar_uid(
    settings: Settings,
    *,
    tenant_credentials: object | None = None,
) -> str:
    if tenant_credentials is not None:
        uid = str(getattr(tenant_credentials, "calendar_uid", "") or "").strip()
        if uid:
            return uid
    return str(getattr(settings, "zoho_calendar_uid", "") or "").strip()


def _zoho_calendar_timestamp(value: datetime) -> str:
    return value.astimezone(ZoneInfo("UTC")).strftime("%Y%m%dT%H%M%SZ")


async def get_zoho_access_token(
    settings: Settings,
    *,
    tenant_credentials: object | None = None,
) -> str:
    if tenant_credentials is not None:
        refresh_token = str(getattr(tenant_credentials, "refresh_token", "") or "").strip()
        client_id = str(getattr(tenant_credentials, "client_id", "") or "").strip()
        client_secret = str(getattr(tenant_credentials, "client_secret", "") or "").strip()
        accounts_base = (
            str(getattr(tenant_credentials, "accounts_base_url", "") or "").strip()
            or str(getattr(settings, "zoho_accounts_base_url", "") or "").strip()
            or "https://accounts.zoho.com.au"
        )
        if not (refresh_token and client_id and client_secret):
            raise ValueError("Zoho Calendar OAuth credentials are incomplete (tenant)")
        token_url = f"{accounts_base.rstrip('/')}/oauth/v2/token"
        async with httpx.AsyncClient(timeout=20) as client:
            response = await client.post(
                token_url,
                data={
                    "refresh_token": refresh_token,
                    "client_id": client_id,
                    "client_secret": client_secret,
                    "grant_type": "refresh_token",
                },
            )
            response.raise_for_status()
            payload = response.json()
        access_token = str(payload.get("access_token") or "").strip()
        if not access_token:
            raise ValueError("Zoho access token response was empty (tenant)")
        return access_token

    refresh_token = settings.zoho_calendar_refresh_token or settings.zoho_crm_refresh_token
    client_id = settings.zoho_calendar_client_id or settings.zoho_crm_client_id
    client_secret = settings.zoho_calendar_client_secret or settings.zoho_crm_client_secret

    if refresh_token and client_id and client_secret:
        token_url = f"{settings.zoho_accounts_base_url.rstrip('/')}/oauth/v2/token"
        async with httpx.AsyncClient(timeout=20) as client:
            response = await client.post(
                token_url,
                data={
                    "refresh_token": refresh_token,
                    "client_id": client_id,
                    "client_secret": client_secret,
                    "grant_type": "refresh_token",
                },
            )
            response.raise_for_status()
            payload = response.json()

        access_token = str(payload.get("access_token") or "").strip()
        if not access_token:
            raise ValueError("Zoho access token response was empty")
        return access_token

    direct_token = settings.zoho_calendar_access_token.strip()
    if direct_token:
        return direct_token

    if not (refresh_token and client_id and client_secret):
        raise ValueError("Zoho Calendar OAuth credentials are incomplete")


async def create_zoho_meeting_for_booking(
    *,
    settings: Settings,
    booking_reference: str,
    service_name: str,
    customer_name: str | None,
    customer_email: str,
    requested_date,
    requested_time,
    timezone_name: str,
    duration_minutes: int = 45,
    notes: str | None = None,
    tenant_credentials: object | None = None,
) -> tuple[str | None, str | None]:
    """Provision a Zoho Calendar event with a Zoho Meeting attached.

    Returns ``(meeting_url, calendar_event_url)``. Either side can be ``None``
    if Zoho returns the event without a meeting link (e.g. when conferencing
    is misconfigured on the calendar UID). This helper is a generic alternative
    to :func:`create_zoho_calendar_event` so the chess + AI Mentor booking
    flows can call it without constructing a legacy ``BookingAssistantSessionRequest``.

    When ``tenant_credentials`` is supplied, the OAuth refresh + API base URL
    + calendar UID are sourced from the tenant credential bundle so the
    resulting calendar event lands in the tenant's own Zoho subscription.
    """
    access_token = await get_zoho_access_token(settings, tenant_credentials=tenant_credentials)
    zone = ZoneInfo(timezone_name)
    start_at = datetime.combine(requested_date, requested_time, tzinfo=zone)
    end_at = start_at + timedelta(minutes=max(int(duration_minutes or 45), 15))
    title_customer = (customer_name or "").strip() or "Customer"
    description_lines = [
        f"BookedAI reference: {booking_reference}",
        f"Service: {service_name}",
        f"Customer: {title_customer}",
    ]
    if isinstance(notes, str) and notes.strip():
        description_lines.append(f"Notes: {notes.strip()}")

    body = {
        "title": f"{service_name} - {title_customer}",
        "dateandtime": {
            "timezone": timezone_name,
            "start": _zoho_calendar_timestamp(start_at),
            "end": _zoho_calendar_timestamp(end_at),
        },
        "attendees": [{"email": customer_email, "status": "NEEDS-ACTION"}],
        "conference": "zmeeting",
        "reminders": [{"minutes": -30, "action": "popup"}],
        "description": "\n".join(description_lines),
    }

    api_base = _zoho_calendar_api_base_url(settings, tenant_credentials=tenant_credentials)
    calendar_uid = _zoho_calendar_uid(settings, tenant_credentials=tenant_credentials)
    async with httpx.AsyncClient(timeout=20) as client:
        response = await client.post(
            f"{api_base}/calendars/{calendar_uid}/events",
            headers={
                "Authorization": f"Zoho-oauthtoken {access_token}",
            },
            data={"eventdata": json.dumps(body)},
        )
        response.raise_for_status()
        payload_data: Any = response.json()

    event = ((payload_data.get("events") or [None])[0] or {}) if isinstance(payload_data, dict) else {}
    app_data = event.get("app_data") if isinstance(event.get("app_data"), dict) else {}
    meeting_data = app_data.get("meetingdata") if isinstance(app_data.get("meetingdata"), dict) else {}
    meeting_link = str(meeting_data.get("meetinglink") or "").strip() or None
    event_url = str(event.get("viewEventURL") or "").strip() or None
    return meeting_link, event_url


async def create_zoho_calendar_event(
    *,
    settings: Settings,
    booking_reference: str,
    service: ServiceCatalogItem,
    payload: BookingAssistantSessionRequest | DemoBookingRequest | PricingConsultationRequest,
    customer_email: str,
    tenant_credentials: object | None = None,
) -> tuple[str | None, str | None]:
    access_token = await get_zoho_access_token(settings, tenant_credentials=tenant_credentials)
    zone = ZoneInfo(payload.timezone)
    date_value = getattr(payload, "requested_date", None) or getattr(payload, "preferred_date")
    time_value = getattr(payload, "requested_time", None) or getattr(payload, "preferred_time")
    start_at = datetime.combine(date_value, time_value, tzinfo=zone)
    duration_minutes = getattr(service, "duration_minutes", None) or 45
    end_at = start_at + timedelta(minutes=duration_minutes)

    title_customer = getattr(payload, "customer_name", None) or getattr(payload, "business_name", "Customer")
    notes = getattr(payload, "notes", None)
    body = {
        "title": f"{service.name} - {title_customer}",
        "dateandtime": {
            "timezone": payload.timezone,
            "start": _zoho_calendar_timestamp(start_at),
            "end": _zoho_calendar_timestamp(end_at),
        },
        "attendees": [{"email": customer_email, "status": "NEEDS-ACTION"}],
        "conference": "zmeeting",
        "reminders": [{"minutes": -30, "action": "popup"}],
        "description": "\n".join(
            part
            for part in [
                f"BookedAI reference: {booking_reference}",
                f"Service: {service.name}",
                f"Customer: {title_customer}",
                f"Notes: {notes.strip()}" if isinstance(notes, str) and notes.strip() else "",
            ]
            if part
        ),
    }

    api_base = _zoho_calendar_api_base_url(settings, tenant_credentials=tenant_credentials)
    calendar_uid = _zoho_calendar_uid(settings, tenant_credentials=tenant_credentials)
    async with httpx.AsyncClient(timeout=20) as client:
        response = await client.post(
            f"{api_base}/calendars/{calendar_uid}/events",
            headers={
                "Authorization": f"Zoho-oauthtoken {access_token}",
            },
            data={"eventdata": json.dumps(body)},
        )
        response.raise_for_status()
        payload_data: Any = response.json()

    event = ((payload_data.get("events") or [None])[0] or {}) if isinstance(payload_data, dict) else {}
    app_data = event.get("app_data") if isinstance(event.get("app_data"), dict) else {}
    meeting_data = app_data.get("meetingdata") if isinstance(app_data.get("meetingdata"), dict) else {}
    meeting_link = str(meeting_data.get("meetinglink") or "").strip() or None
    event_url = str(event.get("viewEventURL") or "").strip() or None
    return meeting_link, event_url
