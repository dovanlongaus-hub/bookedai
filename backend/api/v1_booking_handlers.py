from __future__ import annotations

import html as _html_escape
from datetime import UTC, datetime, timedelta
from urllib.parse import quote, urlencode, urlparse

import httpx
from fastapi import Header, HTTPException, Query, Request
from pydantic import BaseModel, Field

from core.logging import get_logger
from core.portal_tokens import (
    PortalAccessTokenIssue,
    PortalTokenError,
    generate_portal_access_token,
)
from integrations.stripe.constants import STRIPE_API_VERSION
from repositories.booking_feedback_repository import BookingFeedbackRepository

_logger = get_logger("bookedai.api.v1_booking_handlers")

from api.v1_routes import (
    AppError,
    BookingIntentRepository,
    ContactRepository,
    CreateBookingIntentRequestPayload,
    CreateLeadRequestPayload,
    CreatePaymentIntentRequestPayload,
    LeadRepository,
    PaymentAppError,
    PaymentIntentRepository,
    RepositoryContext,
    ResolveBookingPathRequestPayload,
    ServiceMerchantProfile,
    StartChatSessionRequestPayload,
    TENANT_BILLING_WRITE_ROLES,
    TenantRepository,
    ValidationAppError,
    _build_capabilities,
    _error_response,
    _load_tenant_membership,
    _normalize_booking_path,
    _record_phase2_write_activity,
    _require_tenant_membership_role,
    _resolve_tenant_session,
    _resolve_tenant_id,
    _success_response,
    build_booking_trust_payload,
    get_session,
    json,
    orchestrate_booking_followup_sync,
    orchestrate_contact_sync,
    orchestrate_lead_capture,
    resolve_booking_path_policy,
    select,
    text,
    uuid4,
)
from repositories.chess_schedule_slot_repository import (
    ChessScheduleSlotRepository,
)
from service_layer.calls_scheduling import (
    create_zoho_meeting_for_booking,
    zoho_calendar_configured,
)
from service_layer.zoho_tenant_credentials import (
    resolve_tenant_zoho_calendar_credentials,
)
from service_layer.payment_lifecycle_service import (
    get_booking_payment_status,
    mark_booking_paid,
)


# Tenants opted into automatic monthly customer check-ins on booking creation.
# AI Mentor 1-1 Pro is the canonical pilot for the partner-style aimentor.bookedai.au
# subdomain — we wire the cadence in here so we don't need a tenant-settings round-trip.
MONTHLY_REMINDER_DEFAULT_TENANT_SLUGS = {"ai-mentor-doer"}
MONTHLY_REMINDER_INTERVAL_DAYS = 30

# Tenants that get the AI Mentor EN/VI welcome email on booking confirmation.
# Same slug as the monthly cadence — kept as a separate constant so we can
# fan out to additional partners without coupling the two flows.
AIMENTOR_WELCOME_EMAIL_TENANT_SLUGS = {"ai-mentor-doer"}
AIMENTOR_TELEGRAM_URL = (
    "https://t.me/BookedAI_Manager_Bot?start=svc.ai-mentor"
)
AIMENTOR_WHATSAPP_URL = "https://wa.me/61455301335"
# Tenant CC inbox — every learner-facing booking email is CC'd here so the
# mentor can follow up + nothing slips through. Kept as a constant so it's
# trivial to swap when the tenant rotates support email.
AIMENTOR_TENANT_CC_EMAIL = "aimentor@bookedai.au"


PUBLIC_BOOKING_DEFAULT_TENANT_SLUG = "bookedai-au"
PUBLIC_BOOKING_FALLBACK_CHANNELS = {"public_web", "embedded_widget"}


def _is_public_booking_actor(actor_context) -> bool:
    channel = str(getattr(actor_context, "channel", "") or "").strip().lower()
    return channel in PUBLIC_BOOKING_FALLBACK_CHANNELS


async def _resolve_aimentor_welcome_locale(
    *,
    session_factory,
    customer_email: str,
) -> str:
    """Look up the AI Mentor learner's saved locale for the welcome email.

    Falls back to ``"en"`` when the learner has not signed in to the student
    portal yet — keeps the welcome email behaviour graceful for first-time
    customers.
    """
    normalized = (customer_email or "").strip().lower()
    if not normalized:
        return "en"
    try:
        async with get_session(session_factory) as session:
            result = await session.execute(
                text(
                    """
                    select preferred_locale
                    from ai_mentor_student_users
                    where lower(email) = :email
                    limit 1
                    """
                ),
                {"email": normalized},
            )
            row = result.scalar_one_or_none()
            if row == "vi":
                return "vi"
    except Exception as exc:  # noqa: BLE001
        # Best-effort lookup — fall back to EN on any DB issue. Log so that
        # debuggers don't lose signal when the lookup itself is broken
        # (vs. legitimate "no row" cases which return None silently).
        _logger.warning(
            "aimentor_welcome_locale_lookup_failed",
            extra={
                "event_type": "aimentor_welcome_locale_lookup_failed",
                "tenant_id": "",
                "status": 0,
                "route": "/api/v1/booking/intent",
                "request_id": "",
                "integration_name": "db",
                "conversation_id": "",
                "booking_reference": "",
                "job_name": "",
                "job_id": "",
            },
            exc_info=exc,
        )
        return "en"
    return "en"


def _render_aimentor_welcome_email(
    *,
    locale: str,
    customer_name: str | None,
    booking_reference: str,
    service_name: str | None,
    portal_url: str,
    slot_start_at: "datetime | None" = None,
    slot_end_at: "datetime | None" = None,
    slot_timezone: str = "Australia/Sydney",
    zoho_meeting_url: str | None = None,
) -> tuple[str, str, str]:
    """Render (subject, text_body, html_body) for the AI Mentor welcome email.

    Strings come from ``service_layer.aimentor_email_strings`` so EN/VI copy
    stays in a single source of truth. The HTML mirrors the visual reference
    at ``backend/integrations/email_templates/aimentor_welcome.{en,vi}.html``.
    """
    from service_layer.aimentor_email_strings import (
        normalise_locale,
        select_strings,
    )

    locale_norm = normalise_locale(locale)
    strings = select_strings(locale_norm).welcome
    name = (customer_name or "there").strip() or "there"
    service_label = (service_name or "").strip() or "AI Mentor 1-on-1"

    # User-controlled fields are HTML-escaped before formatting into the HTML
    # template — service_name + customer_name + booking_reference can contain
    # angle brackets / quotes from CRM imports or tenant ops, which would
    # otherwise break out of the markup.
    name_html = _html_escape.escape(name)
    service_label_html = _html_escape.escape(service_label)
    booking_reference_html = _html_escape.escape(booking_reference)

    subject = strings.subject_template.format(service_name=service_label)
    greeting = strings.greeting_template.format(name=name)
    intro = strings.intro_template.format(
        service_name=service_label,
        booking_reference=booking_reference,
    )
    greeting_html = strings.greeting_template.format(name=name_html)
    intro_html = strings.intro_template.format(
        service_name=service_label_html,
        booking_reference=booking_reference_html,
    )

    next_steps_text = "\n".join(
        f"- {step}" for step in strings.next_steps
    )
    next_steps_html = "".join(
        f"<li>{step}</li>" for step in strings.next_steps
    )

    # Slot context block — only rendered when the booking is tied to a real
    # ``service_time_slots`` row (reserve endpoint path). For chat-driven
    # bookings (legacy create_booking_intent path), slot info is absent and
    # we fall back to the generic Zoho Meeting + Google Calendar block.
    slot_text_block = ""
    slot_html_block = ""
    if slot_start_at is not None and slot_end_at is not None:
        # Build a readable Sydney-time line: "Sat, 09 May 2026 · 19:00–20:00 AEST"
        try:
            from zoneinfo import ZoneInfo as _ZoneInfo

            tz = _ZoneInfo(slot_timezone)
            local_start = slot_start_at.astimezone(tz)
            local_end = slot_end_at.astimezone(tz)
            duration_minutes = max(
                1, int((slot_end_at - slot_start_at).total_seconds() // 60)
            )
            tz_label = "AEST" if slot_timezone.endswith("Sydney") else slot_timezone
            slot_line = (
                f"{local_start.strftime('%a, %d %b %Y')} · "
                f"{local_start.strftime('%H:%M')}–{local_end.strftime('%H:%M')} "
                f"{tz_label} ({duration_minutes} min)"
            )
        except Exception:  # noqa: BLE001
            slot_line = (
                f"{slot_start_at.isoformat()} → {slot_end_at.isoformat()}"
            )

        meeting_link_text = (
            zoho_meeting_url
            if zoho_meeting_url
            else "Mentor will share the Zoho Meeting link in the next message."
        )
        slot_text_block = (
            f"\nYour confirmed slot:\n  - {slot_line}\n"
            f"  - Zoho Meeting: {meeting_link_text}\n"
        )
        slot_line_html = _html_escape.escape(slot_line)
        if zoho_meeting_url:
            meeting_link_html = (
                f"<a href=\"{_html_escape.escape(zoho_meeting_url)}\" "
                "style=\"color:#0f5c54;text-decoration:none;font-weight:600;\">"
                f"{_html_escape.escape(zoho_meeting_url)}</a>"
            )
        else:
            meeting_link_html = (
                "<em style=\"color:#5b6b66;\">"
                "Mentor will share the Zoho Meeting link in the next message."
                "</em>"
            )
        slot_html_block = (
            "<div style=\"margin:18px 0;padding:16px;background:linear-gradient(135deg,"
            "rgba(20,160,146,0.08) 0%,rgba(255,107,61,0.06) 100%);"
            "border:1px solid rgba(20,160,146,0.22);border-radius:14px;\">"
            "<p style=\"margin:0 0 8px 0;font-size:13px;font-weight:600;color:#0f5c54;"
            "text-transform:uppercase;letter-spacing:0.1em;\">Your confirmed slot</p>"
            f"<p style=\"margin:0 0 8px 0;font-size:15px;font-weight:600;color:#0a1f1c;\">"
            f"{slot_line_html}</p>"
            f"<p style=\"margin:0;font-size:13.5px;color:#1f2a26;\">"
            f"<strong>Zoho Meeting:</strong> {meeting_link_html}</p>"
            "</div>"
        )

    text_body = (
        f"{greeting}\n\n"
        f"{intro}\n\n"
        f"{strings.next_steps_lead}\n"
        f"{next_steps_text}\n"
        f"{slot_text_block}"
        f"\n{strings.meeting_block_lead}:\n"
        f"  - {strings.meeting_video_label}\n"
        f"  - {strings.meeting_calendar_label}\n\n"
        f"{strings.portal_cta}: {portal_url}\n\n"
        f"{strings.channel_lead}\n"
        f"  - {strings.telegram_label}: {AIMENTOR_TELEGRAM_URL}\n"
        f"  - {strings.whatsapp_label}: {AIMENTOR_WHATSAPP_URL}\n\n"
        f"{strings.signature}"
    )

    html_body = (
        "<!doctype html>"
        f"<html lang=\"{locale_norm}\"><body style=\"margin:0;background:#fdfaf3;"
        "font-family:-apple-system,Inter,Arial,sans-serif;color:#1f2a26;\">"
        "<div style=\"max-width:560px;margin:24px auto;padding:28px;background:#ffffff;"
        "border-radius:18px;border:1px solid rgba(15,92,84,0.12);\">"
        f"<p style=\"margin:0 0 12px 0;font-size:16px;\">{greeting_html}</p>"
        f"<p style=\"margin:0 0 16px 0;font-size:15px;line-height:1.65;\">{intro_html}</p>"
        f"<p style=\"margin:0 0 8px 0;font-size:15px;font-weight:600;\">{strings.next_steps_lead}</p>"
        "<ol style=\"margin:0 0 18px 18px;padding:0;font-size:14.5px;line-height:1.6;color:#1f2a26;\">"
        f"{next_steps_html}"
        "</ol>"
        f"{slot_html_block}"
        # Online-delivery info block — every AI Mentor session is 100% online
        # so we surface the meeting + calendar provider explicitly here.
        "<div style=\"margin:18px 0;padding:14px 16px;background:#fdfaf3;border:1px solid "
        "rgba(15,92,84,0.12);border-radius:12px;\">"
        "<p style=\"margin:0 0 8px 0;font-size:13px;font-weight:600;color:#0f5c54;"
        "text-transform:uppercase;letter-spacing:0.08em;\">"
        f"{strings.meeting_block_lead}</p>"
        "<p style=\"margin:0 0 6px 0;font-size:14px;color:#1f2a26;line-height:1.55;\">"
        f"\U0001F3A5 {strings.meeting_video_label}</p>"
        "<p style=\"margin:0;font-size:14px;color:#1f2a26;line-height:1.55;\">"
        f"\U0001F4C5 {strings.meeting_calendar_label}</p>"
        "</div>"
        f"<p style=\"margin:24px 0;\"><a href=\"{portal_url}\" "
        "style=\"display:inline-block;padding:12px 22px;background:#ff6b3d;color:#fdfaf3;"
        "text-decoration:none;border-radius:12px;font-weight:600;\">"
        f"{strings.portal_cta}</a></p>"
        f"<p style=\"margin:0 0 8px 0;font-size:14px;color:#5b6b66;\">{strings.channel_lead}</p>"
        "<p style=\"margin:0 0 18px 0;font-size:14px;\">"
        f"<a href=\"{AIMENTOR_TELEGRAM_URL}\" "
        "style=\"color:#0f5c54;text-decoration:none;margin-right:12px;\">"
        f"{strings.telegram_label}</a>"
        f"<a href=\"{AIMENTOR_WHATSAPP_URL}\" "
        "style=\"color:#0f5c54;text-decoration:none;\">"
        f"{strings.whatsapp_label}</a></p>"
        f"<p style=\"margin:18px 0 0 0;font-size:13px;color:#5b6b66;\">{strings.signature}</p>"
        "</div></body></html>"
    )
    return subject, text_body, html_body


def _format_slot_line(
    slot_start_at: "datetime | None",
    slot_end_at: "datetime | None",
    slot_timezone: str,
) -> str:
    """Render a Sydney-formatted "Sat, 09 May 2026 · 19:00–20:00 AEST" line."""
    if slot_start_at is None or slot_end_at is None:
        return "(time TBD)"
    try:
        from zoneinfo import ZoneInfo as _ZoneInfo

        tz = _ZoneInfo(slot_timezone)
        local_start = slot_start_at.astimezone(tz)
        local_end = slot_end_at.astimezone(tz)
        tz_label = "AEST" if slot_timezone.endswith("Sydney") else slot_timezone
        return (
            f"{local_start.strftime('%a, %d %b %Y')} · "
            f"{local_start.strftime('%H:%M')}–{local_end.strftime('%H:%M')} "
            f"{tz_label}"
        )
    except Exception:  # noqa: BLE001
        return f"{slot_start_at.isoformat()} → {slot_end_at.isoformat()}"


async def _send_aimentor_cancellation_email(
    *,
    email_service,
    customer_email: str,
    customer_name: str | None,
    booking_reference: str,
    service_name: str | None,
    slot_start_at: "datetime | None" = None,
    slot_end_at: "datetime | None" = None,
    slot_timezone: str = "Australia/Sydney",
    locale: str = "en",
    cc_emails: list[str] | None = None,
) -> bool:
    """Best-effort cancellation email when the mentor cancels a reservation."""
    if email_service is None or not getattr(
        email_service, "smtp_configured", lambda: False
    )():
        return False

    from service_layer.aimentor_email_strings import (
        normalise_locale,
        select_strings,
    )

    locale_norm = normalise_locale(locale)
    strings = select_strings(locale_norm).cancellation
    name = (customer_name or "there").strip() or "there"
    service_label = (service_name or "").strip() or "AI Mentor 1-on-1"
    slot_line = _format_slot_line(slot_start_at, slot_end_at, slot_timezone)

    subject = strings.subject_template.format(service_name=service_label)
    greeting = strings.greeting_template.format(name=name)
    body = strings.body_template.format(
        service_name=service_label,
        booking_reference=booking_reference,
        slot_line=slot_line,
    )
    name_html = _html_escape.escape(name)
    service_label_html = _html_escape.escape(service_label)
    booking_reference_html = _html_escape.escape(booking_reference)
    slot_line_html = _html_escape.escape(slot_line)
    body_html = strings.body_template.format(
        service_name=service_label_html,
        booking_reference=booking_reference_html,
        slot_line=slot_line_html,
    )
    greeting_html = strings.greeting_template.format(name=name_html)

    text_body = (
        f"{greeting}\n\n"
        f"{body}\n\n"
        f"{strings.rebook_lead}\n"
        f"  → {strings.rebook_cta}: {strings.rebook_url}\n\n"
        f"{strings.refund_note}\n\n"
        f"{strings.channel_lead}\n"
        f"  - {strings.telegram_label}: {AIMENTOR_TELEGRAM_URL}\n"
        f"  - {strings.whatsapp_label}: {AIMENTOR_WHATSAPP_URL}\n\n"
        f"{strings.signature}"
    )
    html_body = (
        "<!doctype html>"
        f"<html lang=\"{locale_norm}\"><body style=\"margin:0;background:#fdfaf3;"
        "font-family:-apple-system,Inter,Arial,sans-serif;color:#1f2a26;\">"
        "<div style=\"max-width:560px;margin:24px auto;padding:28px;background:#ffffff;"
        "border-radius:18px;border:1px solid rgba(15,92,84,0.12);\">"
        f"<p style=\"margin:0 0 12px 0;font-size:16px;\">{greeting_html}</p>"
        f"<p style=\"margin:0 0 16px 0;font-size:15px;line-height:1.65;\">{body_html}</p>"
        f"<p style=\"margin:0 0 16px 0;font-size:15px;line-height:1.65;\">{_html_escape.escape(strings.rebook_lead)}</p>"
        f"<p style=\"margin:24px 0;\"><a href=\"{strings.rebook_url}\" "
        "style=\"display:inline-block;padding:12px 22px;background:#ff6b3d;color:#fdfaf3;"
        "text-decoration:none;border-radius:12px;font-weight:600;\">"
        f"{_html_escape.escape(strings.rebook_cta)}</a></p>"
        f"<p style=\"margin:0 0 16px 0;font-size:13.5px;line-height:1.6;color:#5b6b66;\">"
        f"{_html_escape.escape(strings.refund_note)}</p>"
        f"<p style=\"margin:0 0 8px 0;font-size:14px;color:#5b6b66;\">{_html_escape.escape(strings.channel_lead)}</p>"
        "<p style=\"margin:0 0 18px 0;font-size:14px;\">"
        f"<a href=\"{AIMENTOR_TELEGRAM_URL}\" "
        "style=\"color:#0f5c54;text-decoration:none;margin-right:12px;\">"
        f"{_html_escape.escape(strings.telegram_label)}</a>"
        f"<a href=\"{AIMENTOR_WHATSAPP_URL}\" "
        "style=\"color:#0f5c54;text-decoration:none;\">"
        f"{_html_escape.escape(strings.whatsapp_label)}</a></p>"
        f"<p style=\"margin:18px 0 0 0;font-size:13px;color:#5b6b66;\">{_html_escape.escape(strings.signature)}</p>"
        "</div></body></html>"
    )

    effective_cc = list(cc_emails or [])
    if AIMENTOR_TENANT_CC_EMAIL not in effective_cc:
        effective_cc.append(AIMENTOR_TENANT_CC_EMAIL)
    try:
        await email_service.send_email(
            to=[customer_email],
            cc=effective_cc,
            subject=subject,
            text=text_body,
            html=html_body,
        )
        return True
    except Exception as exc:  # noqa: BLE001
        _logger.warning(
            "aimentor_cancellation_email_send_failed",
            extra={
                "event_type": "aimentor_cancellation_email_send_failed",
                "tenant_id": "",
                "status": 0,
                "route": "/api/v1/tenants/me/aimentor-reservations/{slot_id}/action",
                "request_id": "",
                "integration_name": "email",
                "conversation_id": "",
                "booking_reference": booking_reference,
                "job_name": "",
                "job_id": "",
            },
            exc_info=exc,
        )
        return False


async def _send_aimentor_completion_email(
    *,
    email_service,
    customer_email: str,
    customer_name: str | None,
    booking_reference: str,
    service_name: str | None,
    locale: str = "en",
    cc_emails: list[str] | None = None,
) -> bool:
    """Best-effort completion email — sent when mentor marks 'Complete'."""
    if email_service is None or not getattr(
        email_service, "smtp_configured", lambda: False
    )():
        return False

    from service_layer.aimentor_email_strings import (
        normalise_locale,
        select_strings,
    )

    locale_norm = normalise_locale(locale)
    strings = select_strings(locale_norm).completion
    name = (customer_name or "there").strip() or "there"
    service_label = (service_name or "").strip() or "AI Mentor 1-on-1"

    subject = strings.subject_template.format(service_name=service_label)
    greeting = strings.greeting_template.format(name=name)
    body = strings.body_template.format(
        service_name=service_label,
        booking_reference=booking_reference,
    )
    name_html = _html_escape.escape(name)
    service_label_html = _html_escape.escape(service_label)
    booking_reference_html = _html_escape.escape(booking_reference)
    body_html = strings.body_template.format(
        service_name=service_label_html,
        booking_reference=booking_reference_html,
    )
    greeting_html = strings.greeting_template.format(name=name_html)

    feedback_url = (
        f"https://aimentor.bookedai.au/aimentor/feedback?"
        f"booking_reference={quote(booking_reference, safe='')}"
    )

    text_body = (
        f"{greeting}\n\n"
        f"{body}\n\n"
        f"{strings.feedback_lead}\n"
        f"  → {strings.feedback_cta}: {feedback_url}\n\n"
        f"{strings.next_program_lead}\n"
        f"  → {strings.next_program_cta}: {strings.next_program_url}\n\n"
        f"{strings.signature}"
    )
    html_body = (
        "<!doctype html>"
        f"<html lang=\"{locale_norm}\"><body style=\"margin:0;background:#fdfaf3;"
        "font-family:-apple-system,Inter,Arial,sans-serif;color:#1f2a26;\">"
        "<div style=\"max-width:560px;margin:24px auto;padding:28px;background:#ffffff;"
        "border-radius:18px;border:1px solid rgba(15,92,84,0.12);\">"
        f"<p style=\"margin:0 0 12px 0;font-size:16px;\">{greeting_html}</p>"
        f"<p style=\"margin:0 0 16px 0;font-size:15px;line-height:1.65;\">{body_html}</p>"
        f"<p style=\"margin:0 0 16px 0;font-size:15px;line-height:1.65;\">{_html_escape.escape(strings.feedback_lead)}</p>"
        f"<p style=\"margin:18px 0;\"><a href=\"{feedback_url}\" "
        "style=\"display:inline-block;padding:12px 22px;background:#ff6b3d;color:#fdfaf3;"
        "text-decoration:none;border-radius:12px;font-weight:600;\">"
        f"{_html_escape.escape(strings.feedback_cta)}</a></p>"
        f"<p style=\"margin:18px 0 8px 0;font-size:14px;line-height:1.6;color:#5b6b66;\">"
        f"{_html_escape.escape(strings.next_program_lead)}</p>"
        f"<p style=\"margin:0 0 18px 0;font-size:14px;\">"
        f"<a href=\"{strings.next_program_url}\" "
        "style=\"color:#0f5c54;text-decoration:none;font-weight:600;\">"
        f"{_html_escape.escape(strings.next_program_cta)} →</a></p>"
        f"<p style=\"margin:18px 0 0 0;font-size:13px;color:#5b6b66;\">{_html_escape.escape(strings.signature)}</p>"
        "</div></body></html>"
    )

    effective_cc = list(cc_emails or [])
    if AIMENTOR_TENANT_CC_EMAIL not in effective_cc:
        effective_cc.append(AIMENTOR_TENANT_CC_EMAIL)
    try:
        await email_service.send_email(
            to=[customer_email],
            cc=effective_cc,
            subject=subject,
            text=text_body,
            html=html_body,
        )
        return True
    except Exception as exc:  # noqa: BLE001
        _logger.warning(
            "aimentor_completion_email_send_failed",
            extra={
                "event_type": "aimentor_completion_email_send_failed",
                "tenant_id": "",
                "status": 0,
                "route": "/api/v1/tenants/me/aimentor-reservations/{slot_id}/action",
                "request_id": "",
                "integration_name": "email",
                "conversation_id": "",
                "booking_reference": booking_reference,
                "job_name": "",
                "job_id": "",
            },
            exc_info=exc,
        )
        return False


async def _send_aimentor_welcome_email(
    *,
    email_service,
    session_factory,
    customer_email: str,
    customer_name: str | None,
    booking_reference: str,
    service_name: str | None,
    portal_url: str,
    slot_start_at: "datetime | None" = None,
    slot_end_at: "datetime | None" = None,
    slot_timezone: str = "Australia/Sydney",
    zoho_meeting_url: str | None = None,
    cc_emails: list[str] | None = None,
) -> bool:
    """Best-effort welcome email for AI Mentor learners post-confirmation.

    Returns ``True`` when the email was dispatched. Logs and swallows
    exceptions so a welcome-email failure never breaks the booking response.
    """
    if email_service is None:
        return False
    if not getattr(email_service, "smtp_configured", lambda: False)():
        return False
    locale = await _resolve_aimentor_welcome_locale(
        session_factory=session_factory,
        customer_email=customer_email,
    )
    subject, text_body, html_body = _render_aimentor_welcome_email(
        locale=locale,
        customer_name=customer_name,
        booking_reference=booking_reference,
        service_name=service_name,
        portal_url=portal_url,
        slot_start_at=slot_start_at,
        slot_end_at=slot_end_at,
        slot_timezone=slot_timezone,
        zoho_meeting_url=zoho_meeting_url,
    )
    # Always CC the AI Mentor tenant inbox so the mentor sees the same
    # email as the learner — used for follow-up + ops handoff. Caller can
    # supplement with extra CCs (e.g. mentor's personal address).
    effective_cc = list(cc_emails or [])
    if AIMENTOR_TENANT_CC_EMAIL not in effective_cc:
        effective_cc.append(AIMENTOR_TENANT_CC_EMAIL)
    try:
        await email_service.send_email(
            to=[customer_email],
            cc=effective_cc,
            subject=subject,
            text=text_body,
            html=html_body,
        )
        return True
    except Exception as exc:  # noqa: BLE001
        _logger.warning(
            "aimentor_welcome_email_send_failed",
            extra={
                "event_type": "aimentor_welcome_email_send_failed",
                "tenant_id": "",
                "status": 0,
                "route": "/api/v1/booking/intent",
                "request_id": "",
                "integration_name": "email",
                "conversation_id": "",
                "booking_reference": booking_reference,
                "job_name": "",
                "job_id": "",
            },
            exc_info=exc,
        )
        return False


async def _resolve_public_booking_fallback_tenant_id(request: Request) -> str | None:
    async with get_session(request.app.state.session_factory) as session:
        return await TenantRepository(RepositoryContext(session=session)).resolve_tenant_id(
            PUBLIC_BOOKING_DEFAULT_TENANT_SLUG
        )


async def _resolve_booking_flow_tenant_id(request: Request, actor_context) -> str | None:
    try:
        return await _resolve_tenant_id(request, actor_context)
    except HTTPException as error:
        if error.status_code != 401 or not _is_public_booking_actor(actor_context):
            raise

        fallback_tenant_id = await _resolve_public_booking_fallback_tenant_id(request)
        if fallback_tenant_id:
            return fallback_tenant_id
        raise


PORTAL_BASE_URL = "https://portal.bookedai.au"


def _build_portal_link(booking_reference: str, access_token: str | None) -> str:
    base = f"{PORTAL_BASE_URL}/?ref={quote(booking_reference, safe='')}"
    if access_token:
        base += f"&token={quote(access_token, safe='')}"
    return base


def _build_booking_confirmation_whatsapp_text(
    *,
    customer_name: str | None,
    service_name: str | None,
    requested_date: str | None,
    requested_time: str | None,
    timezone: str | None,
    booking_reference: str,
    portal_url: str | None = None,
) -> str:
    name_line = f"Hi {customer_name}," if customer_name else "Hi,"
    slot = " ".join(p for p in [requested_date or "", requested_time or ""] if p)
    parts = [
        "*BookedAI.au booking confirmed*",
        f"{name_line} your booking request has been received and saved.",
        "",
        f"*Reference:* {booking_reference}",
    ]
    if service_name:
        parts.append(f"*Service:* {service_name}")
    if slot:
        parts.append(f"*Requested time:* {slot}")
    if timezone:
        parts.append(f"*Timezone:* {timezone}")
    if portal_url:
        parts.extend(["", f"Manage booking: {portal_url}"])
    parts.extend(
        [
            "",
            "*Next:* reply here for booking status, payment help, reschedule, or cancellation review.",
            "BookedAI Manager Bot keeps the same order context across WhatsApp, Telegram, email, and portal.",
        ]
    )
    return "\n".join(parts)


def _normalize_text(value: object | None) -> str | None:
    normalized = str(value or "").strip()
    return normalized or None


def _resolve_reminder_anchor(*, requested_date: str | None) -> datetime:
    """Pick the anchor used for the first reminder.

    Prefers the customer's requested booking date when present so reminders
    fall ~30 days after the actual session. Falls back to "now" so the
    cadence still kicks in for fast-track or async bookings.
    """
    raw = (requested_date or "").strip()
    if raw:
        for fmt in ("%Y-%m-%d", "%Y/%m/%d", "%d-%m-%Y", "%d/%m/%Y"):
            try:
                parsed = datetime.strptime(raw, fmt)
                return parsed.replace(tzinfo=UTC)
            except ValueError:
                continue
    return datetime.now(tz=UTC)


def _is_allowed_payment_return_origin(origin: str | None) -> bool:
    parsed = urlparse(str(origin or "").strip())
    hostname = (parsed.hostname or "").lower()
    scheme = (parsed.scheme or "").lower()
    if scheme == "https" and (hostname == "bookedai.au" or hostname.endswith(".bookedai.au")):
        return True
    return scheme == "http" and hostname in {"localhost", "127.0.0.1"}


def _build_payment_return_url(
    request: Request,
    booking_reference: str,
    status: str,
    *,
    include_checkout_session_id: bool = False,
) -> str:
    origin = _normalize_text(request.headers.get("origin"))
    if origin and _is_allowed_payment_return_origin(origin):
        url = f"{origin.rstrip('/')}/?booking={quote(status)}&ref={quote(booking_reference)}"
        if include_checkout_session_id:
            url += "&session_id={CHECKOUT_SESSION_ID}"
        return url

    url = (
        "https://portal.bookedai.au/"
        f"?booking_reference={quote(booking_reference)}&payment={quote(status)}"
    )
    if include_checkout_session_id:
        url += "&session_id={CHECKOUT_SESSION_ID}"
    return url


async def _create_public_stripe_checkout_session(
    *,
    stripe_secret_key: str,
    stripe_currency: str,
    booking_reference: str,
    service_name: str,
    amount_aud: float,
    customer_email: str | None,
    success_url: str,
    cancel_url: str,
) -> dict[str, object]:
    amount_cents = int(round(float(amount_aud) * 100))
    form_data: list[tuple[str, str]] = [
        ("mode", "payment"),
        ("success_url", success_url),
        ("cancel_url", cancel_url),
        ("line_items[0][quantity]", "1"),
        ("line_items[0][price_data][currency]", stripe_currency.lower()),
        ("line_items[0][price_data][unit_amount]", str(amount_cents)),
        ("line_items[0][price_data][product_data][name]", service_name),
        ("client_reference_id", booking_reference),
        ("metadata[booking_reference]", booking_reference),
        ("metadata[service_name]", service_name),
    ]
    normalized_email = _normalize_text(customer_email)
    if normalized_email:
        form_data.append(("customer_email", normalized_email.lower()))

    async with httpx.AsyncClient(timeout=20) as client:
        response = await client.post(
            "https://api.stripe.com/v1/checkout/sessions",
            headers={
                "Authorization": f"Bearer {stripe_secret_key}",
                "Content-Type": "application/x-www-form-urlencoded",
                "Stripe-Version": STRIPE_API_VERSION,
            },
            content=urlencode(form_data).encode(),
        )
        response.raise_for_status()
        payload = response.json()

    checkout_url = _normalize_text(payload.get("url"))
    if not checkout_url:
        raise PaymentAppError("Stripe checkout did not return a checkout URL.")

    return {
        "checkout_url": checkout_url,
        "external_session_id": _normalize_text(payload.get("id")),
    }


async def _resolve_service_tenant_id(session, service_id: str | None) -> str | None:
    normalized_service_id = str(service_id or "").strip()
    if not normalized_service_id:
        return None

    statement = select(ServiceMerchantProfile.tenant_id).where(
        ServiceMerchantProfile.service_id == normalized_service_id
    )
    service_tenant_id = (await session.execute(statement)).scalar_one_or_none()
    return str(service_tenant_id or "").strip() or None


async def create_lead(request: Request, payload: CreateLeadRequestPayload):
    tenant_id = await _resolve_booking_flow_tenant_id(request, payload.actor_context)
    try:
        normalized_email = (payload.contact.email or "").strip().lower() or None
        normalized_phone = (payload.contact.phone or "").strip() or None
        if not normalized_email and not normalized_phone:
            raise ValidationAppError(
                "Lead intake requires at least one contact method.",
                details={"contact": ["email or phone is required"]},
            )

        async with get_session(request.app.state.session_factory) as session:
            service_tenant_id = await _resolve_service_tenant_id(
                session,
                payload.intent_context.requested_service_id,
            )
            effective_tenant_id = service_tenant_id or tenant_id
            contact_repository = ContactRepository(RepositoryContext(session=session, tenant_id=effective_tenant_id))
            lead_repository = LeadRepository(RepositoryContext(session=session, tenant_id=effective_tenant_id))
            contact_id = await contact_repository.upsert_contact(
                tenant_id=effective_tenant_id,
                full_name=payload.contact.full_name,
                email=normalized_email,
                phone=normalized_phone,
                primary_channel=payload.contact.preferred_contact_method
                or ("email" if normalized_email else "phone"),
            )
            lead_id = await lead_repository.upsert_lead(
                tenant_id=effective_tenant_id,
                contact_id=contact_id,
                source=payload.attribution.source,
                status="captured",
            )
            crm_sync_result = await orchestrate_lead_capture(
                session,
                tenant_id=effective_tenant_id,
                lead_id=lead_id,
                source=payload.attribution.source,
                contact_email=normalized_email,
                contact_full_name=payload.contact.full_name,
                contact_phone=normalized_phone,
                company_name=payload.business_context.business_name,
            )
            await _record_phase2_write_activity(
                session,
                tenant_id=effective_tenant_id,
                actor_context=payload.actor_context,
                audit_event_type="lead.captured",
                entity_type="lead",
                entity_id=lead_id,
                audit_payload={
                    "lead_type": payload.lead_type,
                    "contact_id": contact_id,
                    "crm_sync_status": crm_sync_result.sync_status,
                    "source": payload.attribution.source,
                    "preferred_contact_method": payload.contact.preferred_contact_method,
                },
                outbox_event_type="lead.capture.recorded",
                outbox_payload={
                    "lead_id": lead_id,
                    "contact_id": contact_id,
                    "crm_sync_record_id": crm_sync_result.record_id,
                    "crm_sync_status": crm_sync_result.sync_status,
                    "source": payload.attribution.source,
                },
                idempotency_key=f"lead-captured:{lead_id}" if lead_id else None,
            )
            await session.commit()

        return _success_response(
            {
                "lead_id": lead_id,
                "contact_id": contact_id,
                "status": "captured",
                "crm_sync_status": crm_sync_result.sync_status,
                "conversation_id": None,
            },
            tenant_id=effective_tenant_id,
            actor_context=payload.actor_context,
        )
    except AppError as error:
        return _error_response(error, tenant_id=tenant_id, actor_context=payload.actor_context)


async def start_chat_session(request: Request, payload: StartChatSessionRequestPayload):
    tenant_id = await _resolve_booking_flow_tenant_id(request, payload.actor_context)
    conversation_id = payload.anonymous_session_id or f"conv_{uuid4().hex[:16]}"
    channel_session_id = f"{payload.channel}_{uuid4().hex[:12]}"
    return _success_response(
        {
            "conversation_id": conversation_id,
            "channel_session_id": channel_session_id,
            "capabilities": _build_capabilities(
                payload.channel,
                payload.actor_context.deployment_mode,
            ),
        },
        tenant_id=tenant_id,
        actor_context=payload.actor_context,
    )


async def resolve_booking_path(request: Request, payload: ResolveBookingPathRequestPayload):
    tenant_id = await _resolve_booking_flow_tenant_id(request, payload.actor_context)
    availability_state = payload.availability_state or "availability_unknown"
    booking_confidence = payload.booking_confidence or "unverified"
    path_type, next_step, warnings, payment_allowed = resolve_booking_path_policy(
        availability_state=availability_state,
        booking_confidence=booking_confidence,
        payment_option=payload.payment_option,
        context=payload.context,
    )

    return _success_response(
        {
            "path_type": path_type,
            "trust_confidence": booking_confidence,
            "warnings": warnings
            if warnings
            else ([] if payment_allowed else ["Payment should wait until booking confidence improves."]),
            "next_step": next_step,
            "payment_allowed_before_confirmation": payment_allowed,
        },
        tenant_id=tenant_id,
        actor_context=payload.actor_context,
    )


async def create_booking_intent(request: Request, payload: CreateBookingIntentRequestPayload):
    tenant_id = await _resolve_booking_flow_tenant_id(request, payload.actor_context)
    try:
        normalized_email = (payload.contact.email or "").strip().lower() or None
        normalized_phone = (payload.contact.phone or "").strip() or None
        if not normalized_email and not normalized_phone:
            raise ValidationAppError(
                "Booking intent requires at least one contact method.",
                details={"contact": ["email or phone is required"]},
            )

        async with get_session(request.app.state.session_factory) as session:
            service = None
            service_id = payload.service_id or payload.candidate_id
            service_tenant_id = await _resolve_service_tenant_id(session, service_id)
            effective_tenant_id = service_tenant_id or tenant_id
            if service_id:
                statement = select(ServiceMerchantProfile).where(
                    ServiceMerchantProfile.service_id == service_id
                )
                if effective_tenant_id:
                    statement = statement.where(ServiceMerchantProfile.tenant_id == effective_tenant_id)
                service = (await session.execute(statement)).scalar_one_or_none()

            # Optional: when the booking carries a chess schedule_slot_id, look
            # the slot up + reserve a seat. Slot selection drives the
            # requested_date / requested_time / timezone so the Zoho event lands
            # on the chosen cohort instance. Group cohorts (capacity > 1) reuse
            # the slot's existing zoho_meeting_url so every enrolled student
            # joins the same meeting room.
            normalized_slot_id = (payload.schedule_slot_id or "").strip()
            slot_row: dict | None = None
            slot_repo: ChessScheduleSlotRepository | None = None
            if normalized_slot_id and effective_tenant_id:
                slot_repo = ChessScheduleSlotRepository(
                    RepositoryContext(session=session, tenant_id=effective_tenant_id)
                )
                slot_lookup = await slot_repo.get_slot_for_booking(
                    tenant_id=effective_tenant_id,
                    slot_id=normalized_slot_id,
                )
                if not slot_lookup:
                    raise ValidationAppError(
                        "Selected schedule slot was not found for this tenant.",
                        details={"schedule_slot_id": normalized_slot_id},
                    )
                if str(slot_lookup.get("status") or "").lower() != "open":
                    raise ValidationAppError(
                        "Selected schedule slot is no longer open for booking.",
                        details={
                            "schedule_slot_id": normalized_slot_id,
                            "status": slot_lookup.get("status"),
                        },
                    )
                if int(slot_lookup.get("enrolled_count") or 0) >= int(
                    slot_lookup.get("capacity") or 0
                ):
                    raise ValidationAppError(
                        "Selected schedule slot has no remaining capacity.",
                        details={"schedule_slot_id": normalized_slot_id},
                    )
                if service_id and slot_lookup.get("service_id") and str(
                    slot_lookup.get("service_id")
                ) != str(service_id):
                    raise ValidationAppError(
                        "Selected schedule slot does not belong to the chosen service.",
                        details={
                            "schedule_slot_id": normalized_slot_id,
                            "service_id": service_id,
                        },
                    )
                reserved = await slot_repo.reserve_capacity(
                    tenant_id=effective_tenant_id,
                    slot_id=normalized_slot_id,
                )
                if not reserved:
                    raise ValidationAppError(
                        "Selected schedule slot was just filled. Pick another time.",
                        details={"schedule_slot_id": normalized_slot_id},
                    )
                slot_row = reserved
                # Override desired_slot date/time/timezone with the canonical
                # slot timestamp so downstream surfaces (CRM, calendar, email)
                # all share the same anchor.
                from api.v1_routes import DesiredSlotPayload as _DesiredSlotPayload

                starts_at = slot_row.get("starts_at")
                slot_tz = str(slot_row.get("timezone") or "Asia/Ho_Chi_Minh")
                if hasattr(starts_at, "astimezone"):
                    try:
                        from zoneinfo import ZoneInfo as _ZoneInfo

                        local_dt = starts_at.astimezone(_ZoneInfo(slot_tz))
                    except Exception:  # noqa: BLE001
                        local_dt = starts_at
                    payload.desired_slot = _DesiredSlotPayload(
                        date=local_dt.strftime("%Y-%m-%d"),
                        time=local_dt.strftime("%H:%M"),
                        timezone=slot_tz,
                    )

            contact_repository = ContactRepository(RepositoryContext(session=session, tenant_id=effective_tenant_id))
            lead_repository = LeadRepository(RepositoryContext(session=session, tenant_id=effective_tenant_id))
            booking_repository = BookingIntentRepository(RepositoryContext(session=session, tenant_id=effective_tenant_id))

            contact_id = await contact_repository.upsert_contact(
                tenant_id=effective_tenant_id,
                full_name=payload.contact.full_name,
                email=normalized_email,
                phone=normalized_phone,
                primary_channel="email" if normalized_email else "phone",
            )
            lead_id = await lead_repository.upsert_lead(
                tenant_id=effective_tenant_id,
                contact_id=contact_id,
                source=(payload.attribution.source if payload.attribution else payload.channel),
                status="captured",
            )

            booking_reference = f"v1-{uuid4().hex[:10]}"
            settings = getattr(request.app.state, "settings", None)
            portal_token_max_age_days = int(
                getattr(settings, "portal_token_max_age_days", 365) or 365
            )
            portal_access_token: PortalAccessTokenIssue | None = None
            try:
                portal_access_token = generate_portal_access_token(
                    booking_reference,
                    max_age_days=portal_token_max_age_days,
                )
            except PortalTokenError as exc:
                _logger.warning(
                    "portal_access_token_issue_failed",
                    extra={
                        "event_type": "portal_access_token_issue_failed",
                        "tenant_id": str(effective_tenant_id or ""),
                        "status": 0,
                        "route": "/api/v1/booking/intent",
                        "request_id": "",
                        "integration_name": "portal_tokens",
                        "conversation_id": "",
                        "booking_reference": booking_reference,
                        "job_name": "",
                        "job_id": "",
                    },
                    exc_info=exc,
                )

            booking_intent_id = await booking_repository.upsert_booking_intent(
                tenant_id=effective_tenant_id,
                contact_id=contact_id,
                booking_reference=booking_reference,
                conversation_id=f"conv_{uuid4().hex[:12]}",
                source=payload.channel,
                service_name=service.name if service else None,
                service_id=service_id,
                requested_date=payload.desired_slot.date if payload.desired_slot else None,
                requested_time=payload.desired_slot.time if payload.desired_slot else None,
                timezone=payload.desired_slot.timezone if payload.desired_slot else None,
                booking_path=_normalize_booking_path(service),
                confidence_level="medium" if service else "low",
                status="captured",
                payment_dependency_state="pending",
                metadata_json=json.dumps(
                    {
                        "notes": payload.notes,
                        "channel": payload.channel,
                        "attribution": payload.attribution.model_dump() if payload.attribution else None,
                        "schedule_slot_id": (
                            str(slot_row.get("id")) if slot_row else None
                        ),
                        "schedule_slot": (
                            {
                                "id": str(slot_row.get("id")),
                                "service_id": slot_row.get("service_id"),
                                "starts_at": (
                                    slot_row["starts_at"].isoformat()
                                    if hasattr(slot_row.get("starts_at"), "isoformat")
                                    else slot_row.get("starts_at")
                                ),
                                "duration_minutes": slot_row.get("duration_minutes"),
                                "timezone": slot_row.get("timezone"),
                                "cohort_label": slot_row.get("cohort_label"),
                                "capacity": slot_row.get("capacity"),
                            }
                            if slot_row
                            else None
                        ),
                    }
                ),
            )
            if portal_access_token is not None:
                try:
                    await booking_repository.store_portal_access_token(
                        booking_reference=booking_reference,
                        token_hash=portal_access_token.token_hash,
                        expires_at=portal_access_token.expires_at,
                    )
                except Exception as exc:
                    _logger.warning(
                        "portal_access_token_persist_failed",
                        extra={
                            "event_type": "portal_access_token_persist_failed",
                            "tenant_id": str(effective_tenant_id or ""),
                            "status": 0,
                            "route": "/api/v1/booking/intent",
                            "request_id": "",
                            "integration_name": "portal_tokens",
                            "conversation_id": "",
                            "booking_reference": booking_reference,
                            "job_name": "",
                            "job_id": "",
                        },
                        exc_info=exc,
                    )
                    portal_access_token = None

            # AI Mentor partner-style flow: auto-enable monthly check-in reminders
            # so the customer always gets a touchpoint 30 days after their session,
            # without the booking surface having to opt in on every request.
            tenant_slug: str | None = None
            try:
                tenant_profile = await TenantRepository(
                    RepositoryContext(session=session)
                ).get_tenant_profile(effective_tenant_id)
                tenant_slug = (tenant_profile or {}).get("slug") if tenant_profile else None
                if tenant_slug in MONTHLY_REMINDER_DEFAULT_TENANT_SLUGS:
                    reminder_anchor = _resolve_reminder_anchor(
                        requested_date=payload.desired_slot.date if payload.desired_slot else None,
                    )
                    next_at = reminder_anchor + timedelta(
                        days=MONTHLY_REMINDER_INTERVAL_DAYS
                    )
                    await booking_repository.configure_reminder_cadence(
                        booking_reference=booking_reference,
                        cadence="monthly",
                        next_at=next_at,
                    )
            except Exception as exc:
                _logger.warning(
                    "monthly_reminder_default_enable_failed",
                    extra={
                        "event_type": "monthly_reminder_default_enable_failed",
                        "tenant_id": str(effective_tenant_id or ""),
                        "status": 0,
                        "route": "/api/v1/booking/intent",
                        "request_id": "",
                        "integration_name": "lifecycle_reminder",
                        "conversation_id": "",
                        "booking_reference": booking_reference,
                        "job_name": "",
                        "job_id": "",
                    },
                    exc_info=exc,
                )

            # Zoho Meeting / Calendar provisioning. We try to attach a Zoho
            # Meeting to the booking_intent so the confirmation email + portal
            # surfaces have a join URL ready. This is opt-in via Zoho config —
            # when credentials are missing, we skip silently. Failures inside
            # the Zoho API call must NOT break the booking flow, so the whole
            # block is wrapped in a broad try/except that logs a warning.
            zoho_meeting_url: str | None = None
            zoho_calendar_event_url: str | None = None

            # Group cohorts: reuse the slot's existing meeting URL so every
            # enrolled student joins the same Zoho Meeting. We still persist
            # the URLs onto the booking_intent metadata for parity with the
            # per-booking flow.
            if slot_row and (slot_row.get("zoho_meeting_url") or slot_row.get("zoho_calendar_event_url")):
                zoho_meeting_url = slot_row.get("zoho_meeting_url") or None
                zoho_calendar_event_url = slot_row.get("zoho_calendar_event_url") or None
                if zoho_meeting_url or zoho_calendar_event_url:
                    await booking_repository.update_zoho_meeting_metadata(
                        booking_reference=booking_reference,
                        meeting_url=zoho_meeting_url,
                        calendar_event_url=zoho_calendar_event_url,
                        scheduled_at=datetime.now(tz=UTC),
                        extra={"reused_from_schedule_slot": True},
                    )

            # Resolve per-tenant Zoho Calendar credentials (with platform
            # fallback). This lets the chess academy + AI Mentor tenants own
            # their Zoho subscription end-to-end while existing single-tenant
            # deployments keep using the platform-wide env credentials.
            #
            # Defensive ``getattr`` for ``request.app.state.settings`` —
            # legacy contract tests stand up a minimal ``app.state`` with no
            # ``settings`` attribute and expect the booking flow to skip the
            # Zoho block silently rather than 500.
            booking_settings = getattr(request.app.state, "settings", None)
            tenant_calendar_credentials = None
            if booking_settings is not None:
                try:
                    tenant_calendar_credentials = await resolve_tenant_zoho_calendar_credentials(
                        session,
                        tenant_id=effective_tenant_id,
                        settings=booking_settings,
                    )
                except Exception:  # noqa: BLE001
                    tenant_calendar_credentials = None
            if (
                zoho_meeting_url is None
                and normalized_email
                and zoho_calendar_configured(
                    booking_settings,
                    tenant_credentials=tenant_calendar_credentials,
                )
                and payload.desired_slot
                and payload.desired_slot.date
                and payload.desired_slot.time
                and payload.desired_slot.timezone
            ):
                try:
                    parsed_date = datetime.strptime(
                        str(payload.desired_slot.date)[:10], "%Y-%m-%d"
                    ).date()
                    parsed_time = datetime.strptime(
                        str(payload.desired_slot.time)[:5], "%H:%M"
                    ).time()
                    duration_minutes = int(
                        (slot_row.get("duration_minutes") if slot_row else None)
                        or getattr(service, "duration_minutes", None)
                        or 45
                    )
                    zoho_meeting_url, zoho_calendar_event_url = await create_zoho_meeting_for_booking(
                        settings=booking_settings,
                        booking_reference=booking_reference,
                        service_name=(service.name if service else None) or "BookedAI session",
                        customer_name=payload.contact.full_name,
                        customer_email=normalized_email,
                        requested_date=parsed_date,
                        requested_time=parsed_time,
                        timezone_name=payload.desired_slot.timezone,
                        duration_minutes=duration_minutes,
                        notes=payload.notes,
                        tenant_credentials=tenant_calendar_credentials,
                    )
                    if zoho_meeting_url or zoho_calendar_event_url:
                        await booking_repository.update_zoho_meeting_metadata(
                            booking_reference=booking_reference,
                            meeting_url=zoho_meeting_url,
                            calendar_event_url=zoho_calendar_event_url,
                            scheduled_at=datetime.now(tz=UTC),
                        )
                        # When the booking is anchored to a chess slot, persist
                        # the new meeting URL onto the slot row so subsequent
                        # students booking the same group cohort inherit it.
                        if slot_row and slot_repo is not None:
                            try:
                                await slot_repo.attach_meeting_metadata(
                                    tenant_id=effective_tenant_id,
                                    slot_id=str(slot_row.get("id")),
                                    meeting_url=zoho_meeting_url,
                                    calendar_event_url=zoho_calendar_event_url,
                                )
                            except Exception as exc:  # noqa: BLE001
                                _logger.warning(
                                    "chess_slot_meeting_attach_failed",
                                    extra={
                                        "event_type": "chess_slot_meeting_attach_failed",
                                        "tenant_id": str(effective_tenant_id or ""),
                                        "status": 0,
                                        "route": "/api/v1/booking/intent",
                                        "request_id": "",
                                        "integration_name": "chess_schedule_slots",
                                        "conversation_id": "",
                                        "booking_reference": booking_reference,
                                        "job_name": "",
                                        "job_id": "",
                                    },
                                    exc_info=exc,
                                )
                except Exception as exc:  # noqa: BLE001
                    _logger.warning(
                        "zoho_meeting_provision_failed",
                        extra={
                            "event_type": "zoho_meeting_provision_failed",
                            "tenant_id": str(effective_tenant_id or ""),
                            "status": 0,
                            "route": "/api/v1/booking/intent",
                            "request_id": "",
                            "integration_name": "zoho_calendar",
                            "conversation_id": "",
                            "booking_reference": booking_reference,
                            "job_name": "",
                            "job_id": "",
                        },
                        exc_info=exc,
                    )

            lead_sync_result = await orchestrate_lead_capture(
                session,
                tenant_id=effective_tenant_id,
                lead_id=lead_id,
                source=(payload.attribution.source if payload.attribution else payload.channel),
                contact_email=normalized_email,
                contact_full_name=payload.contact.full_name,
                contact_phone=normalized_phone,
                company_name=service.name if service else None,
            )
            contact_sync_result = await orchestrate_contact_sync(
                session,
                tenant_id=effective_tenant_id,
                contact_id=contact_id,
                full_name=payload.contact.full_name,
                email=normalized_email,
                phone=normalized_phone,
            )
            booking_crm_sync = await orchestrate_booking_followup_sync(
                session,
                tenant_id=effective_tenant_id,
                booking_intent_id=booking_intent_id,
                booking_reference=booking_reference,
                full_name=payload.contact.full_name,
                email=normalized_email,
                phone=normalized_phone,
                source=(payload.attribution.source if payload.attribution else payload.channel),
                service_name=service.name if service else None,
                requested_date=payload.desired_slot.date if payload.desired_slot else None,
                requested_time=payload.desired_slot.time if payload.desired_slot else None,
                timezone=payload.desired_slot.timezone if payload.desired_slot else None,
                booking_path=_normalize_booking_path(service),
                notes=payload.notes,
                external_lead_id=lead_sync_result.external_entity_id,
                external_contact_id=contact_sync_result.external_entity_id,
            )
            await _record_phase2_write_activity(
                session,
                tenant_id=effective_tenant_id,
                actor_context=payload.actor_context,
                audit_event_type="booking_intent.captured",
                entity_type="booking_intent",
                entity_id=booking_intent_id,
                audit_payload={
                    "booking_reference": booking_reference,
                    "contact_id": contact_id,
                    "lead_id": lead_id,
                    "service_id": service_id,
                    "channel": payload.channel,
                    "requested_date": payload.desired_slot.date if payload.desired_slot else None,
                    "requested_time": payload.desired_slot.time if payload.desired_slot else None,
                    "crm_sync": {
                        "lead": lead_sync_result.sync_status,
                        "contact": contact_sync_result.sync_status,
                        "deal": booking_crm_sync.deal_sync_status,
                        "task": booking_crm_sync.task_sync_status,
                    },
                },
                outbox_event_type="booking_intent.capture.recorded",
                outbox_payload={
                    "booking_intent_id": booking_intent_id,
                    "booking_reference": booking_reference,
                    "contact_id": contact_id,
                    "lead_id": lead_id,
                    "service_id": service_id,
                    "channel": payload.channel,
                    "crm_sync": {
                        "lead_record_id": lead_sync_result.record_id,
                        "contact_record_id": contact_sync_result.record_id,
                        "deal_record_id": booking_crm_sync.deal_record_id,
                        "task_record_id": booking_crm_sync.task_record_id,
                    },
                },
                idempotency_key=f"booking-intent:{booking_intent_id}" if booking_intent_id else None,
            )
            await session.commit()

        if normalized_phone and hasattr(request.app.state, "communication_service"):
            try:
                from schemas import TawkMessage
                from services import store_event
                portal_link = _build_portal_link(
                    booking_reference,
                    portal_access_token.plaintext if portal_access_token else None,
                )
                confirmation_text = _build_booking_confirmation_whatsapp_text(
                    customer_name=payload.contact.full_name,
                    service_name=service.name if service else None,
                    requested_date=payload.desired_slot.date if payload.desired_slot else None,
                    requested_time=payload.desired_slot.time if payload.desired_slot else None,
                    timezone=payload.desired_slot.timezone if payload.desired_slot else None,
                    booking_reference=booking_reference,
                    portal_url=portal_link,
                )
                await request.app.state.communication_service.send_whatsapp(
                    to=normalized_phone,
                    body=confirmation_text,
                )
                confirmation_message = TawkMessage(
                    conversation_id=normalized_phone,
                    text=confirmation_text,
                    sender_name="BookedAI",
                    sender_phone=normalized_phone,
                    metadata={"channel": "whatsapp", "direction": "outbound", "event_type": "booking_confirmation"},
                )
                async with get_session(request.app.state.session_factory) as confirm_session:
                    await store_event(
                        confirm_session,
                        source="whatsapp",
                        event_type="whatsapp_booking_confirmation",
                        message=confirmation_message,
                        ai_intent="booking_confirmation",
                        ai_reply=None,
                        workflow_status="sent",
                        metadata={
                            "channel": "whatsapp",
                            "direction": "outbound",
                            "booking_reference": booking_reference,
                            "tenant_id": str(effective_tenant_id or ""),
                            "service_name": service.name if service else None,
                        },
                    )
            except Exception as exc:
                _logger.warning(
                    "whatsapp_booking_confirmation_failed",
                    extra={
                        "event_type": "whatsapp_booking_confirmation_failed",
                        "tenant_id": str(effective_tenant_id or ""),
                        "status": 0,
                        "route": "/api/v1/booking/intent",
                        "request_id": "",
                        "integration_name": "whatsapp",
                        "conversation_id": normalized_phone,
                        "booking_reference": booking_reference,
                        "job_name": "",
                        "job_id": "",
                    },
                    exc_info=exc,
                )

        # AI Mentor: send EN/VI welcome email post-confirmation. Best-effort —
        # failures are logged inside the helper and never break the booking
        # response. Locale is read from ai_mentor_student_users when the
        # learner has signed in to the student portal at least once.
        if (
            normalized_email
            and tenant_slug in AIMENTOR_WELCOME_EMAIL_TENANT_SLUGS
            and hasattr(request.app.state, "email_service")
        ):
            welcome_portal_url = _build_portal_link(
                booking_reference,
                portal_access_token.plaintext if portal_access_token else None,
            )
            await _send_aimentor_welcome_email(
                email_service=request.app.state.email_service,
                session_factory=request.app.state.session_factory,
                customer_email=normalized_email,
                customer_name=payload.contact.full_name,
                booking_reference=booking_reference,
                service_name=service.name if service else None,
                portal_url=welcome_portal_url,
            )

        availability_state, verified, recommended_path, warnings, payment_allowed_now, booking_confidence = (
            build_booking_trust_payload(
                service,
                desired_date=payload.desired_slot.date if payload.desired_slot else None,
                desired_time=payload.desired_slot.time if payload.desired_slot else None,
            )
        )
        booking_path_options = [recommended_path]
        if recommended_path != "request_callback":
            booking_path_options.append("request_callback")
        portal_response_link = _build_portal_link(
            booking_reference,
            portal_access_token.plaintext if portal_access_token else None,
        )
        return _success_response(
            {
                "booking_intent_id": booking_intent_id,
                "booking_reference": booking_reference,
                "portal": {
                    "url": portal_response_link,
                    "access_token": (
                        portal_access_token.plaintext if portal_access_token else None
                    ),
                    "expires_at": (
                        portal_access_token.expires_at.isoformat()
                        if portal_access_token
                        else None
                    ),
                },
                "meeting": {
                    "meeting_url": zoho_meeting_url,
                    "calendar_event_url": zoho_calendar_event_url,
                },
                "trust": {
                    "availability_state": availability_state,
                    "verified": verified,
                    "booking_confidence": booking_confidence,
                    "booking_path_options": booking_path_options,
                    "recommended_booking_path": recommended_path,
                    "payment_allowed_now": payment_allowed_now,
                    "warnings": warnings,
                },
                "warnings": warnings,
                "crm_sync": {
                    "lead": {
                        "record_id": lead_sync_result.record_id,
                        "sync_status": lead_sync_result.sync_status,
                        "external_entity_id": lead_sync_result.external_entity_id,
                        "warning_codes": lead_sync_result.warning_codes,
                    },
                    "contact": {
                        "record_id": contact_sync_result.record_id,
                        "sync_status": contact_sync_result.sync_status,
                        "external_entity_id": contact_sync_result.external_entity_id,
                        "warning_codes": contact_sync_result.warning_codes,
                    },
                    "deal": {
                        "record_id": booking_crm_sync.deal_record_id,
                        "sync_status": booking_crm_sync.deal_sync_status,
                        "external_entity_id": booking_crm_sync.deal_external_entity_id,
                    },
                    "task": {
                        "record_id": booking_crm_sync.task_record_id,
                        "sync_status": booking_crm_sync.task_sync_status,
                        "external_entity_id": booking_crm_sync.task_external_entity_id,
                    },
                    "warning_codes": booking_crm_sync.warning_codes,
                },
            },
            tenant_id=effective_tenant_id,
            actor_context=payload.actor_context,
        )
    except AppError as error:
        return _error_response(error, tenant_id=tenant_id, actor_context=payload.actor_context)


async def create_payment_intent(request: Request, payload: CreatePaymentIntentRequestPayload):
    tenant_id = await _resolve_booking_flow_tenant_id(request, payload.actor_context)
    try:
        async with get_session(request.app.state.session_factory) as session:
            normalized_booking_intent_id = _normalize_text(payload.booking_intent_id)
            booking_lookup = await session.execute(
                text(
                    """
                    select
                      bi.id::text as booking_intent_id,
                      bi.tenant_id::text as booking_tenant_id,
                      bi.booking_reference,
                      bi.service_name,
                      bi.service_id,
                      c.email as customer_email,
                      sm.amount_aud,
                      sm.booking_url
                    from booking_intents bi
                    left join contacts c
                      on c.id = bi.contact_id
                    left join service_merchant_profiles sm
                      on sm.service_id::text = bi.service_id::text
                     and sm.tenant_id::text = bi.tenant_id::text
                    where bi.id::text = cast(:booking_intent_id as text)
                       or bi.booking_reference = cast(:booking_intent_id as text)
                    limit 1
                    """
                ),
                {
                    "tenant_id": tenant_id,
                    "booking_intent_id": normalized_booking_intent_id,
                },
            )
            booking_row = booking_lookup.mappings().first()
            if not booking_row:
                raise PaymentAppError(
                    "Booking intent not found for payment creation.",
                    details={"booking_intent_id": normalized_booking_intent_id},
                )

            effective_tenant_id = _normalize_text(booking_row.get("booking_tenant_id")) or tenant_id
            if tenant_id and effective_tenant_id and effective_tenant_id != tenant_id:
                raise AppError(
                    code="payment_booking_tenant_mismatch",
                    message="Booking intent does not belong to the resolved tenant.",
                    status_code=403,
                    details={
                        "booking_intent_id": normalized_booking_intent_id,
                        "tenant_id": tenant_id,
                    },
                )
            resolved_booking_intent_id = (
                _normalize_text(booking_row.get("booking_intent_id"))
                or normalized_booking_intent_id
                or payload.booking_intent_id
            )
            payment_option = _normalize_text(payload.selected_payment_option) or "invoice_after_confirmation"
            checkout_url: str | None = None
            external_session_id: str | None = None
            amount_aud = booking_row.get("amount_aud")
            payment_status = "pending"
            warnings: list[str] = []
            booking_reference = _normalize_text(booking_row.get("booking_reference")) or payload.booking_intent_id
            service_name = (
                _normalize_text(booking_row.get("service_name"))
                or "BookedAI service"
            )

            if payment_option == "stripe_card":
                stripe_secret_key = _normalize_text(getattr(request.app.state.settings, "stripe_secret_key", ""))
                stripe_currency = _normalize_text(getattr(request.app.state.settings, "stripe_currency", "aud")) or "aud"
                if not stripe_secret_key:
                    warnings.append("Stripe is not configured for this environment yet.")
                elif amount_aud is None or float(amount_aud) <= 0:
                    warnings.append("This booking does not have a payable amount yet, so checkout is waiting for confirmation.")
                else:
                    stripe_session = await _create_public_stripe_checkout_session(
                        stripe_secret_key=stripe_secret_key,
                        stripe_currency=stripe_currency,
                        booking_reference=booking_reference,
                        service_name=service_name,
                        amount_aud=float(amount_aud),
                        customer_email=_normalize_text(booking_row.get("customer_email")),
                        success_url=_build_payment_return_url(
                            request,
                            booking_reference,
                            "success",
                            include_checkout_session_id=True,
                        ),
                        cancel_url=_build_payment_return_url(request, booking_reference, "cancelled"),
                    )
                    checkout_url = _normalize_text(stripe_session.get("checkout_url"))
                    external_session_id = _normalize_text(stripe_session.get("external_session_id"))
                    payment_status = "requires_action"
            elif payment_option == "partner_checkout":
                checkout_url = _normalize_text(booking_row.get("booking_url"))
                if checkout_url:
                    payment_status = "requires_action"
                else:
                    warnings.append("Partner checkout is not available for this service yet.")
            elif payment_option == "invoice_after_confirmation":
                warnings.append("Provider confirmation is required before payment is collected.")
            else:
                warnings.append("Payment intent was created. The next checkout step depends on provider follow-up.")

            payment_repository = PaymentIntentRepository(RepositoryContext(session=session, tenant_id=effective_tenant_id))
            payment_intent_id = await payment_repository.upsert_payment_intent(
                tenant_id=effective_tenant_id,
                booking_intent_id=resolved_booking_intent_id,
                payment_option=payment_option,
                status=payment_status,
                amount_aud=float(amount_aud) if amount_aud is not None else None,
                currency="aud",
                external_session_id=external_session_id,
                payment_url=checkout_url,
                metadata_json=json.dumps(
                    {
                        "created_by": payload.actor_context.channel,
                        "booking_reference": booking_reference,
                        "requested_booking_intent_id": normalized_booking_intent_id,
                        "service_name": service_name,
                    }
                ),
            )
            booking_repository = BookingIntentRepository(RepositoryContext(session=session, tenant_id=effective_tenant_id))
            await booking_repository.sync_callback_status(
                tenant_id=effective_tenant_id,
                booking_reference=booking_reference,
                payment_dependency_state="stripe_checkout_ready" if checkout_url else "payment_follow_up_required",
                metadata_updates={
                    "payment_option": payment_option,
                    "payment_url": checkout_url,
                    "payment_external_session_id": external_session_id,
                },
            )
            await _record_phase2_write_activity(
                session,
                tenant_id=effective_tenant_id,
                actor_context=payload.actor_context,
                audit_event_type="payment_intent.created",
                entity_type="payment_intent",
                entity_id=payment_intent_id,
                audit_payload={
                    "booking_intent_id": payload.booking_intent_id,
                    "resolved_booking_intent_id": resolved_booking_intent_id,
                    "selected_payment_option": payload.selected_payment_option,
                },
                outbox_event_type="payment_intent.created",
                outbox_payload={
                    "payment_intent_id": payment_intent_id,
                    "booking_intent_id": resolved_booking_intent_id,
                    "selected_payment_option": payment_option,
                    "payment_status": payment_status,
                    "checkout_url": checkout_url,
                },
                idempotency_key=f"payment-intent:{payment_intent_id}" if payment_intent_id else None,
            )
            await session.commit()

        return _success_response(
            {
                "payment_intent_id": payment_intent_id,
                "payment_status": payment_status,
                "checkout_url": checkout_url,
                "bank_transfer_instruction_id": None,
                "invoice_id": None,
                "warnings": warnings,
            },
            tenant_id=effective_tenant_id,
            actor_context=payload.actor_context,
        )
    except AppError as error:
        return _error_response(error, tenant_id=tenant_id, actor_context=payload.actor_context)


async def confirm_manual_payment(
    request: Request,
    payload: ManualPaymentConfirmPayload,
    authorization: str | None = Header(default=None, alias="Authorization"),
):
    tenant_session = await _resolve_tenant_session(request, authorization=authorization)
    if not tenant_session:
        return _error_response(
            AppError(
                code="tenant_auth_required",
                message="Sign in with a tenant admin or finance account before confirming a payment.",
                status_code=401,
            ),
            tenant_id=None,
            actor_context=None,
        )

    async with get_session(request.app.state.session_factory) as session:
        tenant_repository = TenantRepository(RepositoryContext(session=session))
        tenant_id = await tenant_repository.resolve_tenant_id(
            str(tenant_session.get("tenant_ref") or "")
        )
        if not tenant_id:
            return _error_response(
                AppError(
                    code="tenant_context_not_found",
                    message="The authenticated tenant session could not be resolved.",
                    status_code=401,
                ),
                tenant_id=None,
                actor_context=None,
            )

        membership = await _load_tenant_membership(
            session,
            tenant_id=tenant_id,
            email=str(tenant_session.get("email") or ""),
        )
        if not membership:
            return _error_response(
                AppError(
                    code="tenant_auth_required",
                    message="The authenticated user is not an active member of this tenant.",
                    status_code=403,
                ),
                tenant_id=tenant_id,
                actor_context=None,
            )
        role_error = _require_tenant_membership_role(
            membership,
            allowed_roles=TENANT_BILLING_WRITE_ROLES,
            message="Only tenant admins and finance managers can confirm received payments.",
        )
        if role_error:
            return _error_response(role_error, tenant_id=tenant_id, actor_context=None)

        result = await mark_booking_paid(
            session,
            tenant_id=tenant_id,
            booking_reference=payload.booking_reference,
            payment_source=payload.payment_source,
            external_event_id=payload.external_event_id,
            external_session_id=payload.external_session_id,
            transfer_reference=payload.transfer_reference,
            amount_aud=payload.amount_aud,
            currency=payload.currency,
            paid_at=payload.paid_at,
            raw_provider_payload={"notes": payload.notes} if payload.notes else None,
            actor_type="tenant_payment_operator",
            actor_id=str(tenant_session.get("email") or ""),
        )
        await session.commit()

    if result.status == "ignored":
        return _error_response(
            AppError(
                code="payment_confirmation_target_not_found",
                message="The booking reference could not be found for this tenant.",
                status_code=404,
                details={"booking_reference": payload.booking_reference, "reason": result.reason},
            ),
            tenant_id=result.tenant_id or tenant_id,
            actor_context=None,
        )

    return _success_response(
        result.as_dict(),
        tenant_id=result.tenant_id or tenant_id,
        actor_context=None,
        message="Payment confirmation recorded.",
    )


async def payment_status(
    request: Request,
    booking_reference: str = Query(...),
    session_id: str | None = Query(default=None),
    authorization: str | None = Header(default=None, alias="Authorization"),
):
    tenant_id: str | None = None
    tenant_session = await _resolve_tenant_session(request, authorization=authorization)
    async with get_session(request.app.state.session_factory) as session:
        if tenant_session:
            tenant_id = await TenantRepository(RepositoryContext(session=session)).resolve_tenant_id(
                str(tenant_session.get("tenant_ref") or "")
            )
        status_payload = await get_booking_payment_status(
            session,
            tenant_id=tenant_id,
            booking_reference=booking_reference,
            session_id=session_id,
        )

    if status_payload.get("status") == "not_found":
        return _error_response(
            AppError(
                code="payment_status_not_found",
                message="The requested booking payment status could not be found.",
                status_code=404,
                details={"booking_reference": booking_reference},
            ),
            tenant_id=tenant_id,
            actor_context=None,
        )

    return _success_response(status_payload, tenant_id=tenant_id, actor_context=None)


# ----- Reminder + feedback (AI Mentor partner-style flow) ----------------------
#
# These endpoints sit on the booking router (alongside intent + payment) because
# they are scoped per booking_reference and reuse the same portal access-token
# guard the customer portal already uses (see api/v1_tenant_handlers._verify_portal_access).


class ConfigureBookingReminderPayload(BaseModel):
    cadence: str = Field("monthly")
    enabled: bool = True


class ManualPaymentConfirmPayload(BaseModel):
    booking_reference: str
    payment_source: str = Field("bank_transfer")
    transfer_reference: str | None = None
    external_event_id: str | None = None
    external_session_id: str | None = None
    amount_aud: float | None = None
    currency: str = Field("AUD")
    paid_at: datetime | None = None
    notes: str | None = None


class SubmitBookingFeedbackPayload(BaseModel):
    rating: int
    comment: str | None = None
    would_recommend: bool | None = None
    channel: str | None = None


async def _portal_guard_for_booking(
    request: Request, booking_reference: str
) -> AppError | None:
    # Imported lazily to avoid a circular import between booking and tenant handlers.
    from api.v1_tenant_handlers import _portal_guard

    return await _portal_guard(request, booking_reference)


async def configure_booking_reminder(
    booking_reference: str,
    request: Request,
    payload: ConfigureBookingReminderPayload,
):
    guard_error = await _portal_guard_for_booking(request, booking_reference)
    if guard_error is not None:
        return _error_response(guard_error, tenant_id=None, actor_context=None)

    cadence = (payload.cadence or "").strip().lower()
    if cadence and cadence != "monthly":
        return _error_response(
            ValidationAppError(
                "Only a monthly reminder cadence is supported today.",
                details={"cadence": ["unsupported_cadence"]},
            ),
            tenant_id=None,
            actor_context=None,
        )

    async with get_session(request.app.state.session_factory) as session:
        booking_repository = BookingIntentRepository(RepositoryContext(session=session))
        if not payload.enabled:
            updated = await booking_repository.configure_reminder_cadence(
                booking_reference=booking_reference,
                cadence=None,
                next_at=None,
            )
        else:
            next_at = datetime.now(tz=UTC) + timedelta(
                days=MONTHLY_REMINDER_INTERVAL_DAYS
            )
            updated = await booking_repository.configure_reminder_cadence(
                booking_reference=booking_reference,
                cadence="monthly",
                next_at=next_at,
            )
        if updated is None:
            return _error_response(
                AppError(
                    code="booking_reminder_target_not_found",
                    message="The requested booking reference could not be found for reminder configuration.",
                    status_code=404,
                    details={"booking_reference": booking_reference},
                ),
                tenant_id=None,
                actor_context=None,
            )
        await session.commit()

    return _success_response(
        {
            "booking_reference": booking_reference,
            "reminder_cadence": updated.get("reminder_cadence"),
            "reminder_next_at": (
                updated.get("reminder_next_at").isoformat()
                if isinstance(updated.get("reminder_next_at"), datetime)
                else updated.get("reminder_next_at")
            ),
            "reminder_last_sent_at": (
                updated.get("reminder_last_sent_at").isoformat()
                if isinstance(updated.get("reminder_last_sent_at"), datetime)
                else updated.get("reminder_last_sent_at")
            ),
            "enabled": payload.enabled,
        },
        tenant_id=str(updated.get("tenant_id") or "") or None,
        actor_context=None,
    )


async def disable_booking_reminder(
    booking_reference: str,
    request: Request,
):
    """Portal opt-out shortcut so the unsubscribe link can call a stable URL."""
    return await configure_booking_reminder(
        booking_reference,
        request,
        ConfigureBookingReminderPayload(cadence="monthly", enabled=False),
    )


async def submit_booking_feedback(
    booking_reference: str,
    request: Request,
    payload: SubmitBookingFeedbackPayload,
):
    guard_error = await _portal_guard_for_booking(request, booking_reference)
    if guard_error is not None:
        return _error_response(guard_error, tenant_id=None, actor_context=None)

    rating = int(payload.rating or 0)
    if rating < 1 or rating > 5:
        return _error_response(
            ValidationAppError(
                "Rating must be a whole number between 1 and 5.",
                details={"rating": ["out_of_range"]},
            ),
            tenant_id=None,
            actor_context=None,
        )

    normalized_comment = (payload.comment or "").strip() or None
    normalized_channel = (payload.channel or "portal_app").strip() or "portal_app"

    async with get_session(request.app.state.session_factory) as session:
        booking_repository = BookingIntentRepository(RepositoryContext(session=session))
        booking_state = await booking_repository.load_reminder_state(
            booking_reference=booking_reference
        )
        if booking_state is None:
            return _error_response(
                AppError(
                    code="booking_feedback_target_not_found",
                    message="The requested booking reference could not be found for feedback intake.",
                    status_code=404,
                    details={"booking_reference": booking_reference},
                ),
                tenant_id=None,
                actor_context=None,
            )

        tenant_id = str(booking_state.get("tenant_id") or "") or None
        if not tenant_id:
            return _error_response(
                AppError(
                    code="booking_feedback_tenant_unresolved",
                    message="The booking is missing a tenant anchor required for feedback intake.",
                    status_code=409,
                    details={"booking_reference": booking_reference},
                ),
                tenant_id=None,
                actor_context=None,
            )

        feedback_repository = BookingFeedbackRepository(
            RepositoryContext(session=session, tenant_id=tenant_id)
        )

        deduped = await feedback_repository.find_recent_feedback(
            booking_reference=booking_reference,
            rating=rating,
            within_minutes=5,
        )
        if deduped is not None:
            return _success_response(
                {
                    "feedback_id": deduped.get("feedback_id"),
                    "thanks": "Thanks for your feedback.",
                    "dedupe": True,
                },
                tenant_id=tenant_id,
                actor_context=None,
            )

        feedback_id = await feedback_repository.insert_feedback(
            booking_reference=booking_reference,
            tenant_id=tenant_id,
            rating=rating,
            comment=normalized_comment,
            would_recommend=payload.would_recommend,
            channel=normalized_channel,
        )

        # Outbox-only audit + downstream notify trigger. The outbox consumer is
        # responsible for routing this event to ops + Zoho CRM as a contact note.
        # Comment text is stored verbatim in booking_feedback for ops review,
        # but excluded from the audit/outbox payload to avoid PII leakage.
        await _record_phase2_write_activity(
            session,
            tenant_id=tenant_id,
            actor_context=None,
            audit_event_type="booking_feedback.submitted",
            entity_type="booking_feedback",
            entity_id=feedback_id,
            audit_payload={
                "booking_reference": booking_reference,
                "rating": rating,
                "would_recommend": payload.would_recommend,
                "channel": normalized_channel,
                "comment_present": bool(normalized_comment),
            },
            outbox_event_type="booking_feedback.recorded",
            outbox_payload={
                "feedback_id": feedback_id,
                "booking_reference": booking_reference,
                "tenant_id": tenant_id,
                "rating": rating,
                "would_recommend": payload.would_recommend,
                "channel": normalized_channel,
            },
            idempotency_key=(
                f"booking-feedback:{feedback_id}" if feedback_id else None
            ),
        )
        await session.commit()

    return _success_response(
        {
            "feedback_id": feedback_id,
            "thanks": "Thanks for your feedback.",
        },
        tenant_id=tenant_id,
        actor_context=None,
    )
