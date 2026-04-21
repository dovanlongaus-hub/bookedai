from __future__ import annotations

from datetime import datetime, timedelta
from typing import Any
from urllib.parse import quote, urlencode
from zoneinfo import ZoneInfo

import httpx

from config import Settings
from schemas import BookingAssistantSessionRequest, DemoBookingRequest, PricingConsultationRequest, ServiceCatalogItem


def build_customer_portal_url(base_url: str, booking_reference: str) -> str:
    return f"{base_url.rstrip('/')}/?booking_reference={quote(booking_reference, safe='')}"


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


def zoho_calendar_configured(settings: Settings) -> bool:
    return bool(
        settings.zoho_calendar_uid
        and (
            settings.zoho_calendar_access_token
            or (
                settings.zoho_calendar_refresh_token
                and settings.zoho_calendar_client_id
                and settings.zoho_calendar_client_secret
            )
        )
    )


async def get_zoho_access_token(settings: Settings) -> str:
    direct_token = settings.zoho_calendar_access_token.strip()
    if direct_token:
        return direct_token

    if not (
        settings.zoho_calendar_refresh_token
        and settings.zoho_calendar_client_id
        and settings.zoho_calendar_client_secret
    ):
        raise ValueError("Zoho Calendar OAuth credentials are incomplete")

    token_url = f"{settings.zoho_accounts_base_url.rstrip('/')}/oauth/v2/token"
    async with httpx.AsyncClient(timeout=20) as client:
        response = await client.post(
            token_url,
            data={
                "refresh_token": settings.zoho_calendar_refresh_token,
                "client_id": settings.zoho_calendar_client_id,
                "client_secret": settings.zoho_calendar_client_secret,
                "grant_type": "refresh_token",
            },
        )
        response.raise_for_status()
        payload = response.json()

    access_token = str(payload.get("access_token") or "").strip()
    if not access_token:
        raise ValueError("Zoho access token response was empty")
    return access_token


async def create_zoho_calendar_event(
    *,
    settings: Settings,
    booking_reference: str,
    service: ServiceCatalogItem,
    payload: BookingAssistantSessionRequest | DemoBookingRequest | PricingConsultationRequest,
    customer_email: str,
) -> tuple[str | None, str | None]:
    access_token = await get_zoho_access_token(settings)
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
            "start": start_at.strftime("%Y-%m-%dT%H:%M:%S"),
            "end": end_at.strftime("%Y-%m-%dT%H:%M:%S"),
        },
        "attendees": [{"email": customer_email}],
        "conference": "zmeeting",
        "reminders": [{"minutes": 30, "type": "popup"}],
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

    async with httpx.AsyncClient(timeout=20) as client:
        response = await client.post(
            f"{settings.zoho_calendar_base_url.rstrip('/')}/api/v1/calendars/{settings.zoho_calendar_uid}/events",
            headers={
                "Authorization": f"Zoho-oauthtoken {access_token}",
                "Content-Type": "application/json",
            },
            json=body,
        )
        response.raise_for_status()
        payload_data: Any = response.json()

    event = ((payload_data.get("events") or [None])[0] or {}) if isinstance(payload_data, dict) else {}
    app_data = event.get("app_data") if isinstance(event.get("app_data"), dict) else {}
    meeting_data = app_data.get("meetingdata") if isinstance(app_data.get("meetingdata"), dict) else {}
    meeting_link = str(meeting_data.get("meetinglink") or "").strip() or None
    event_url = str(event.get("viewEventURL") or "").strip() or None
    return meeting_link, event_url
