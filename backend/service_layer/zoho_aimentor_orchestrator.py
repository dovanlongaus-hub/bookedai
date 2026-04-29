"""AI Mentor — Zoho Meeting + Calendar provisioning orchestrator.

Single entry point ``provision_slot_artifacts`` ties together the new
``ZohoMeetingAdapter`` + ``ZohoCalendarAdapter`` for the AI Mentor
``service_time_slots`` flow:

1. Schedule a Zoho Meeting at the slot's start time
2. Create a Zoho Calendar event linking to that meeting URL with
   the learner + mentor as attendees (Zoho auto-emails them the invite)
3. Return ``(meeting_url, meeting_id, calendar_event_id)`` so the caller
   can persist them on ``service_time_slots`` and embed them in the
   welcome email

Best-effort: any failure in one step is logged and the partial success
is returned. The caller decides whether to proceed (typical: yes — the
template Zoho URL still works, and the human operator can reconcile
later via the runbook).
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import Any

from config import Settings
from core.logging import get_logger
from integrations.zoho_calendar import ZohoCalendarAdapter
from integrations.zoho_meeting import ZohoMeetingAdapter

_logger = get_logger("bookedai.service_layer.zoho_aimentor_orchestrator")


@dataclass(frozen=True)
class ZohoSlotProvisioningResult:
    meeting_url: str | None
    meeting_id: str | None
    calendar_event_id: str | None
    meeting_error: str | None
    calendar_error: str | None


async def provision_slot_artifacts(
    settings: Settings,
    *,
    service_name: str,
    booking_reference: str,
    slot_start_at: datetime,
    slot_end_at: datetime,
    timezone_label: str,
    learner_name: str,
    learner_email: str,
    mentor_email: str | None = None,
    session_factory=None,
) -> ZohoSlotProvisioningResult:
    """Schedule a Zoho Meeting + Calendar event for an AI Mentor booking.

    Returns a ``ZohoSlotProvisioningResult`` with whatever succeeded. Both
    adapters short-circuit cleanly when their credentials are not
    configured, so this function is safe to call in environments without
    Zoho keys (you'll just get back ``meeting_url=None`` and the welcome
    email falls back to the template URL).
    """
    # Pull tenant-saved Zoho credentials and overlay on env Settings via
    # ZohoSettingsView. Env vars are still the fallback when nothing has
    # been saved — fully backwards-compatible with prior deploys.
    if session_factory is not None:
        try:
            from service_layer.aimentor_zoho_config import (
                ZohoSettingsView,
                load_zoho_aimentor_overrides,
            )

            overrides = await load_zoho_aimentor_overrides(session_factory)
            if overrides:
                settings = ZohoSettingsView(settings, overrides)
        except Exception as exc:  # noqa: BLE001
            _logger.warning(
                "zoho_aimentor_overrides_load_failed",
                exc_info=exc,
            )

    meeting = ZohoMeetingAdapter()
    calendar = ZohoCalendarAdapter()

    duration_minutes = max(
        1, int((slot_end_at - slot_start_at).total_seconds() // 60)
    )
    topic = f"AI Mentor 1-on-1 — {service_name} ({booking_reference})"
    agenda = (
        f"Booking reference: {booking_reference}\n"
        f"Learner: {learner_name} <{learner_email}>\n"
        f"Program: {service_name}\n"
        "Outcome: ship a working AI artefact in this session."
    )

    attendee_emails = [learner_email]
    if mentor_email:
        attendee_emails.append(mentor_email)

    meeting_url: str | None = None
    meeting_id: str | None = None
    meeting_error: str | None = None
    if meeting.configured(settings):
        try:
            result = await meeting.create_meeting(
                settings,
                topic=topic,
                agenda=agenda,
                start_time=slot_start_at,
                duration_minutes=duration_minutes,
                attendee_emails=attendee_emails,
                timezone_label=timezone_label,
            )
            meeting_url = result.get("join_url")
            meeting_id = result.get("meeting_id")
        except Exception as exc:  # noqa: BLE001 — failures are logged + reported
            meeting_error = str(exc)
            _logger.warning(
                "zoho_meeting_provision_failed",
                extra={
                    "event_type": "zoho_meeting_provision_failed",
                    "tenant_id": "",
                    "status": 0,
                    "route": "/api/v1/aimentor/slots/{slot_id}/reserve",
                    "request_id": "",
                    "integration_name": "zoho_meeting",
                    "conversation_id": "",
                    "booking_reference": booking_reference,
                    "job_name": "",
                    "job_id": "",
                },
                exc_info=exc,
            )
    else:
        meeting_error = "zoho_meeting_not_configured"

    calendar_event_id: str | None = None
    calendar_error: str | None = None
    if calendar.configured(settings):
        try:
            description_lines = [
                f"AI Mentor 1-on-1 session — {service_name}",
                f"Booking reference: {booking_reference}",
                f"Duration: {duration_minutes} minutes",
            ]
            if meeting_url:
                description_lines.append(f"Zoho Meeting: {meeting_url}")
            description_lines.append(
                "Reschedule any time via your booking email or by replying to the mentor."
            )
            calendar_result = await calendar.create_event(
                settings,
                title=topic,
                description="\n".join(description_lines),
                start_time=slot_start_at,
                end_time=slot_end_at,
                timezone_label=timezone_label,
                attendee_emails=attendee_emails,
                meeting_url=meeting_url,
            )
            calendar_event_id = calendar_result.get("event_id")
        except Exception as exc:  # noqa: BLE001
            calendar_error = str(exc)
            _logger.warning(
                "zoho_calendar_provision_failed",
                extra={
                    "event_type": "zoho_calendar_provision_failed",
                    "tenant_id": "",
                    "status": 0,
                    "route": "/api/v1/aimentor/slots/{slot_id}/reserve",
                    "request_id": "",
                    "integration_name": "zoho_calendar",
                    "conversation_id": "",
                    "booking_reference": booking_reference,
                    "job_name": "",
                    "job_id": "",
                },
                exc_info=exc,
            )
    else:
        calendar_error = "zoho_calendar_not_configured"

    return ZohoSlotProvisioningResult(
        meeting_url=meeting_url,
        meeting_id=meeting_id,
        calendar_event_id=calendar_event_id,
        meeting_error=meeting_error,
        calendar_error=calendar_error,
    )


@dataclass(frozen=True)
class ZohoSlotCancelResult:
    meeting_cancelled: bool
    calendar_event_cancelled: bool
    meeting_error: str | None
    calendar_error: str | None


async def cancel_slot_artifacts(
    settings: Settings,
    *,
    meeting_id: str | None,
    calendar_event_id: str | None,
    booking_reference: str | None = None,
    session_factory=None,
) -> ZohoSlotCancelResult:
    """Cancel a slot's Zoho Meeting + Calendar event.

    Mirror of ``provision_slot_artifacts`` for the inverse direction.
    Best-effort: each adapter call is wrapped in its own try/except so a
    failure cancelling the meeting doesn't block cancelling the calendar
    event (and vice versa). Returns a structured result so the caller
    can surface partial failure to the operator.

    ``session_factory`` (optional) — when provided, DB-stored Zoho
    credentials override env vars, identical to ``provision_slot_artifacts``.
    """
    if session_factory is not None:
        try:
            from service_layer.aimentor_zoho_config import (
                ZohoSettingsView,
                load_zoho_aimentor_overrides,
            )

            overrides = await load_zoho_aimentor_overrides(session_factory)
            if overrides:
                settings = ZohoSettingsView(settings, overrides)
        except Exception as exc:  # noqa: BLE001
            _logger.warning(
                "zoho_aimentor_overrides_load_failed",
                exc_info=exc,
            )

    meeting = ZohoMeetingAdapter()
    calendar = ZohoCalendarAdapter()

    meeting_cancelled = False
    meeting_error: str | None = None
    if meeting_id and meeting.configured(settings):
        try:
            await meeting.cancel_meeting(settings, meeting_id=meeting_id)
            meeting_cancelled = True
        except Exception as exc:  # noqa: BLE001
            meeting_error = str(exc)
            _logger.warning(
                "zoho_meeting_cancel_failed",
                extra={
                    "event_type": "zoho_meeting_cancel_failed",
                    "tenant_id": "",
                    "status": 0,
                    "route": "/api/v1/tenants/me/aimentor-reservations/{slot_id}/action",
                    "request_id": "",
                    "integration_name": "zoho_meeting",
                    "conversation_id": "",
                    "booking_reference": booking_reference or "",
                    "job_name": "",
                    "job_id": "",
                },
                exc_info=exc,
            )
    elif not meeting_id:
        meeting_error = "no_meeting_id_stored"
    else:
        meeting_error = "zoho_meeting_not_configured"

    calendar_cancelled = False
    calendar_error: str | None = None
    if calendar_event_id and calendar.configured(settings):
        try:
            await calendar.cancel_event(settings, event_id=calendar_event_id)
            calendar_cancelled = True
        except Exception as exc:  # noqa: BLE001
            calendar_error = str(exc)
            _logger.warning(
                "zoho_calendar_cancel_failed",
                extra={
                    "event_type": "zoho_calendar_cancel_failed",
                    "tenant_id": "",
                    "status": 0,
                    "route": "/api/v1/tenants/me/aimentor-reservations/{slot_id}/action",
                    "request_id": "",
                    "integration_name": "zoho_calendar",
                    "conversation_id": "",
                    "booking_reference": booking_reference or "",
                    "job_name": "",
                    "job_id": "",
                },
                exc_info=exc,
            )
    elif not calendar_event_id:
        calendar_error = "no_calendar_event_id_stored"
    else:
        calendar_error = "zoho_calendar_not_configured"

    return ZohoSlotCancelResult(
        meeting_cancelled=meeting_cancelled,
        calendar_event_cancelled=calendar_cancelled,
        meeting_error=meeting_error,
        calendar_error=calendar_error,
    )


def safe_summary(settings: Settings) -> dict[str, Any]:
    """For the admin/integrations health UI — flag whether each Zoho
    capability is configured.
    """
    meeting = ZohoMeetingAdapter()
    calendar = ZohoCalendarAdapter()
    return {
        "zoho_meeting_configured": meeting.configured(settings),
        "zoho_calendar_configured": calendar.configured(settings),
    }


__all__ = [
    "ZohoSlotProvisioningResult",
    "ZohoSlotCancelResult",
    "provision_slot_artifacts",
    "cancel_slot_artifacts",
    "safe_summary",
]
