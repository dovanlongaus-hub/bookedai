"""Monthly check-in reminder worker.

Selects bookings whose ``reminder_next_at`` is due, composes a templated
"how is your progress" email, and rolls the cadence forward by 30 days.
The worker writes a ``job_runs`` ledger entry per dispatch attempt so we
have an auditable trail for ops.

Designed to be wired from the existing scheduler seam in
``backend/workers/scheduler.py``. Until n8n / cron is hooked in (deferred
follow-up — see PR description), this entrypoint can be invoked from a
synchronous tenant-ops endpoint or a manual ad-hoc job for QA.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from typing import Any
from urllib.parse import quote

from core.logging import get_logger
from repositories.base import RepositoryContext
from repositories.booking_intent_repository import BookingIntentRepository
from repositories.job_run_repository import JobRunRepository

_logger = get_logger("bookedai.workers.monthly_reminder_worker")

PORTAL_BASE_URL = "https://portal.bookedai.au"
MONTHLY_INTERVAL_DAYS = 30


@dataclass(frozen=True)
class MonthlyReminderDispatchResult:
    scanned: int
    sent: int
    skipped: int
    job_run_id: int | None


def _portal_link(booking_reference: str) -> str:
    return f"{PORTAL_BASE_URL}/?ref={quote(booking_reference, safe='')}"


def _feedback_link(booking_reference: str) -> str:
    return (
        "https://aimentor.bookedai.au/feedback?"
        f"booking_reference={quote(booking_reference, safe='')}"
    )


def _render_monthly_check_in_email(
    *,
    customer_name: str | None,
    booking_reference: str,
    service_name: str | None,
) -> tuple[str, str, str]:
    """Return (subject, text_body, html_body) for the monthly check-in email."""
    subject = "Your AI Mentor monthly check-in"
    name = (customer_name or "there").strip() or "there"
    service_line = (
        f"It's been a month since your AI Mentor booking ({service_name}, "
        f"reference {booking_reference})."
        if service_name
        else f"It's been a month since your AI Mentor booking ({booking_reference})."
    )
    portal_url = _portal_link(booking_reference)
    feedback_url = _feedback_link(booking_reference)

    text_body = (
        f"Hi {name},\n\n"
        f"{service_line}\n\n"
        "How's your progress? Tap below to log a quick check-in or jump back into a session.\n\n"
        f"Open my AI Mentor portal: {portal_url}\n"
        f"Send your feedback: {feedback_url}\n\n"
        "If you'd rather skip these monthly check-ins, reply to this email and we'll turn them off.\n\n"
        "— The AI Mentor team"
    )
    html_body = _render_monthly_check_in_html(
        customer_name=name,
        booking_reference=booking_reference,
        service_name=service_name,
        portal_url=portal_url,
        feedback_url=feedback_url,
    )
    return subject, text_body, html_body


def _render_monthly_check_in_html(
    *,
    customer_name: str,
    booking_reference: str,
    service_name: str | None,
    portal_url: str,
    feedback_url: str,
) -> str:
    """Build the HTML version of the monthly check-in email.

    Plain string template (no Jinja dependency in workers/) keeps the worker
    self-contained. The static HTML in
    ``backend/integrations/email_templates/monthly_check_in.html`` is the
    canonical visual reference.
    """
    service_line = (
        f"It's been a month since your AI Mentor booking ({service_name}, "
        f"reference <strong>{booking_reference}</strong>)."
        if service_name
        else (
            "It's been a month since your AI Mentor booking "
            f"(<strong>{booking_reference}</strong>)."
        )
    )
    return (
        "<!doctype html>"
        "<html><body style=\"margin:0;background:#f5f5f7;font-family:-apple-system,Inter,Arial,sans-serif;color:#1d1d1f;\">"
        "<div style=\"max-width:560px;margin:24px auto;padding:24px;background:#ffffff;border-radius:18px;\">"
        f"<p style=\"margin:0 0 12px 0;font-size:16px;\">Hi {customer_name},</p>"
        f"<p style=\"margin:0 0 16px 0;font-size:15px;line-height:1.6;\">{service_line}</p>"
        "<p style=\"margin:0 0 16px 0;font-size:15px;line-height:1.6;\">"
        "How's your progress? Tap below to log a quick check-in or jump back into a session."
        "</p>"
        f"<p style=\"margin:24px 0;\"><a href=\"{portal_url}\" "
        "style=\"display:inline-block;padding:12px 22px;background:#0071e3;color:#ffffff;text-decoration:none;border-radius:980px;font-weight:600;\">"
        "Open my AI Mentor portal</a></p>"
        f"<p style=\"margin:0 0 16px 0;font-size:14px;\"><a href=\"{feedback_url}\" "
        "style=\"color:#0071e3;text-decoration:none;\">Send your feedback</a></p>"
        "<p style=\"margin:24px 0 0 0;font-size:13px;color:#6e6e73;\">"
        "If you'd rather skip these monthly check-ins, reply to this email and we'll turn them off."
        "</p>"
        "</div></body></html>"
    )


async def _send_reminder_email(
    *,
    email_service: Any,
    customer_email: str,
    customer_name: str | None,
    booking_reference: str,
    service_name: str | None,
) -> bool:
    if email_service is None:
        return False
    if not getattr(email_service, "smtp_configured", lambda: False)():
        return False
    subject, text_body, html_body = _render_monthly_check_in_email(
        customer_name=customer_name,
        booking_reference=booking_reference,
        service_name=service_name,
    )
    try:
        await email_service.send_email(
            to=[customer_email],
            subject=subject,
            text=text_body,
            html=html_body,
        )
        return True
    except Exception as exc:  # noqa: BLE001 — failures are logged + counted
        _logger.warning(
            "monthly_reminder_send_failed",
            extra={
                "event_type": "monthly_reminder_send_failed",
                "tenant_id": "",
                "status": 0,
                "route": "worker:monthly_reminder",
                "request_id": "",
                "integration_name": "email",
                "conversation_id": "",
                "booking_reference": booking_reference,
                "job_name": "monthly_reminder",
                "job_id": "",
            },
            exc_info=exc,
        )
        return False


async def dispatch_due_monthly_reminders(
    session,
    *,
    email_service: Any,
    limit: int = 50,
    now: datetime | None = None,
) -> MonthlyReminderDispatchResult:
    """Scan for due reminders, send emails, advance the next_at cursor."""
    booking_repository = BookingIntentRepository(RepositoryContext(session=session))
    job_repository = JobRunRepository(RepositoryContext(session=session))

    job_run_id = await job_repository.create_job_run(
        tenant_id=None,
        job_name="monthly_reminder_worker",
        status="pending",
        detail="Scanning for due monthly reminders.",
    )
    if job_run_id is not None:
        await job_repository.mark_running(
            job_run_id, detail="Selecting due reminders."
        )

    due_rows = await booking_repository.list_reminders_due(
        cadence="monthly", limit=limit
    )
    sent = 0
    skipped = 0
    next_anchor = (now or datetime.now(tz=UTC))

    for row in due_rows:
        booking_reference = str(row.get("booking_reference") or "").strip()
        customer_email = str(row.get("customer_email") or "").strip().lower()
        if not booking_reference or not customer_email:
            skipped += 1
            continue

        ok = await _send_reminder_email(
            email_service=email_service,
            customer_email=customer_email,
            customer_name=str(row.get("customer_name") or "").strip() or None,
            booking_reference=booking_reference,
            service_name=str(row.get("service_name") or "").strip() or None,
        )
        if not ok:
            skipped += 1
            continue

        await booking_repository.mark_reminder_sent(
            booking_reference=booking_reference,
            next_at=next_anchor + timedelta(days=MONTHLY_INTERVAL_DAYS),
        )
        sent += 1

    detail = (
        f"scanned={len(due_rows)} sent={sent} skipped={skipped}"
    )
    if job_run_id is not None:
        await job_repository.mark_finished(
            job_run_id,
            status="completed" if not skipped or sent else "completed",
            detail=detail,
        )

    return MonthlyReminderDispatchResult(
        scanned=len(due_rows),
        sent=sent,
        skipped=skipped,
        job_run_id=job_run_id,
    )


__all__ = [
    "MonthlyReminderDispatchResult",
    "dispatch_due_monthly_reminders",
]
