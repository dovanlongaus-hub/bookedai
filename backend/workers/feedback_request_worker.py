"""Post-session feedback request worker.

Selects confirmed bookings whose session ended at least ``elapsed_hours``
ago and whose feedback prompt has not yet been dispatched, sends the
`feedback_request.html` email, and stamps `feedback_request_sent_at` so the
worker is idempotent across cron ticks.

Cron wiring strategy: **n8n** (Strategy B per the operational-plumbing plan).
The internal HTTP endpoint
``POST /api/internal/workers/dispatch-feedback-requests`` (auth via
``N8N_WEBHOOK_BEARER_TOKEN``) is the canonical entrypoint and runs hourly via
``n8n/workflows/bookedai-operational-cron.json``. The same scheduler also
fires the monthly reminder worker via
``POST /api/internal/workers/dispatch-monthly-reminders``.

Tenant gating: a tenant only receives this email when it has
``partner_config_jsonb.features.post_booking_feedback = "true"`` OR — until
the partner-config rollout completes — its slug matches the launch partner
``ai-mentor-doer``.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any
from urllib.parse import quote

from core.logging import get_logger
from repositories.base import RepositoryContext
from repositories.booking_intent_repository import BookingIntentRepository
from repositories.job_run_repository import JobRunRepository

_logger = get_logger("bookedai.workers.feedback_request_worker")

DEFAULT_FEEDBACK_PORTAL_BASE = "https://aimentor.bookedai.au"
LAUNCH_PARTNER_SLUG_FALLBACK = "ai-mentor-doer"


@dataclass(frozen=True)
class FeedbackRequestDispatchResult:
    scanned: int
    sent: int
    skipped: int
    job_run_id: int | None


def _tenant_feedback_enabled(row: dict[str, Any]) -> bool:
    """Returns True when the tenant should receive feedback prompts.

    The booking row carries the tenant slug + partner_config_jsonb so we
    avoid an extra round-trip per booking. Both the explicit feature flag
    and the launch-partner slug fallback satisfy the gate.
    """
    config = row.get("tenant_partner_config")
    if isinstance(config, dict):
        features = config.get("features")
        if isinstance(features, dict):
            value = features.get("post_booking_feedback")
            if isinstance(value, bool) and value is True:
                return True
            if isinstance(value, str) and value.strip().lower() == "true":
                return True
    slug = str(row.get("tenant_slug") or "").strip().lower()
    return slug == LAUNCH_PARTNER_SLUG_FALLBACK


def _feedback_link(booking_reference: str) -> str:
    return (
        f"{DEFAULT_FEEDBACK_PORTAL_BASE}/feedback?"
        f"booking_reference={quote(booking_reference, safe='')}"
    )


def _render_feedback_request_email(
    *,
    customer_name: str | None,
    booking_reference: str,
) -> tuple[str, str, str]:
    """Returns (subject, text_body, html_body) for the feedback prompt email."""
    subject = "Quick feedback on your AI Mentor session"
    name = (customer_name or "there").strip() or "there"
    feedback_url = _feedback_link(booking_reference)

    text_body = (
        f"Hi {name},\n\n"
        f"How was your AI Mentor session ({booking_reference})?\n"
        "A quick rating helps your mentor stay sharp.\n\n"
        f"Rate 1: {feedback_url}&rating=1\n"
        f"Rate 2: {feedback_url}&rating=2\n"
        f"Rate 3: {feedback_url}&rating=3\n"
        f"Rate 4: {feedback_url}&rating=4\n"
        f"Rate 5: {feedback_url}&rating=5\n\n"
        f"Or open the form: {feedback_url}\n\n"
        "Thanks for being part of AI Mentor on BookedAI."
    )
    html_body = _render_feedback_request_html(
        customer_name=name,
        booking_reference=booking_reference,
        feedback_url=feedback_url,
    )
    return subject, text_body, html_body


def _render_feedback_request_html(
    *,
    customer_name: str,
    booking_reference: str,
    feedback_url: str,
) -> str:
    """Inlined template that mirrors ``feedback_request.html`` so the worker
    is self-contained (no Jinja import needed). The static template stays the
    canonical visual reference for ops.
    """
    rating_links = "&nbsp;&nbsp;".join(
        (
            f'<a href="{feedback_url}&rating={n}" '
            f'style="text-decoration:none;color:#0071e3;">{n}</a>'
        )
        for n in range(1, 6)
    )
    return (
        "<!doctype html>"
        "<html><body style=\"margin:0;background:#f5f5f7;font-family:-apple-system,Inter,Arial,sans-serif;color:#1d1d1f;\">"
        "<div style=\"max-width:560px;margin:24px auto;padding:24px;background:#ffffff;border-radius:18px;\">"
        f"<p style=\"margin:0 0 12px 0;font-size:16px;\">Hi {customer_name},</p>"
        "<p style=\"margin:0 0 16px 0;font-size:15px;line-height:1.6;\">"
        f"How was your AI Mentor session (<strong>{booking_reference}</strong>)? "
        "A quick rating helps your mentor stay sharp."
        "</p>"
        f"<p style=\"margin:16px 0;font-size:18px;\">{rating_links}</p>"
        f"<p style=\"margin:24px 0;\"><a href=\"{feedback_url}\" "
        "style=\"display:inline-block;padding:12px 22px;background:#0071e3;color:#ffffff;text-decoration:none;border-radius:980px;font-weight:600;\">"
        "Send your feedback</a></p>"
        "<p style=\"margin:24px 0 0 0;font-size:13px;color:#6e6e73;\">"
        "Thanks for being part of AI Mentor on BookedAI."
        "</p>"
        "</div></body></html>"
    )


async def _send_feedback_email(
    *,
    email_service: Any,
    customer_email: str,
    customer_name: str | None,
    booking_reference: str,
) -> bool:
    if email_service is None:
        return False
    if not getattr(email_service, "smtp_configured", lambda: False)():
        return False
    subject, text_body, html_body = _render_feedback_request_email(
        customer_name=customer_name,
        booking_reference=booking_reference,
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
            "feedback_request_send_failed",
            extra={
                "event_type": "feedback_request_send_failed",
                "tenant_id": "",
                "status": 0,
                "route": "worker:feedback_request",
                "request_id": "",
                "integration_name": "email",
                "conversation_id": "",
                "booking_reference": booking_reference,
                "job_name": "feedback_request",
                "job_id": "",
            },
            exc_info=exc,
        )
        return False


async def dispatch_due_feedback_requests(
    session,
    *,
    email_service: Any,
    elapsed_hours: int = 24,
    limit: int = 50,
) -> FeedbackRequestDispatchResult:
    """Scan for bookings due for the post-session feedback nudge."""
    booking_repository = BookingIntentRepository(RepositoryContext(session=session))
    job_repository = JobRunRepository(RepositoryContext(session=session))

    job_run_id = await job_repository.create_job_run(
        tenant_id=None,
        job_name="feedback_request_worker",
        status="pending",
        detail="Scanning for due feedback prompts.",
    )
    if job_run_id is not None:
        await job_repository.mark_running(
            job_run_id, detail="Selecting due feedback prompts."
        )

    due_rows = await booking_repository.list_feedback_requests_due(
        elapsed_hours=elapsed_hours,
        limit=limit,
    )
    sent = 0
    skipped = 0

    for row in due_rows:
        booking_reference = str(row.get("booking_reference") or "").strip()
        customer_email = str(row.get("customer_email") or "").strip().lower()
        if not booking_reference or not customer_email:
            skipped += 1
            continue
        if not _tenant_feedback_enabled(row):
            # Defence-in-depth: the SQL already filters for the gate, but a
            # tenant could be re-toggled mid-cron. Skip cleanly without
            # marking the booking — it'll re-evaluate on the next tick.
            skipped += 1
            continue

        ok = await _send_feedback_email(
            email_service=email_service,
            customer_email=customer_email,
            customer_name=str(row.get("customer_name") or "").strip() or None,
            booking_reference=booking_reference,
        )
        if not ok:
            skipped += 1
            continue

        marked = await booking_repository.mark_feedback_request_sent(
            booking_reference=booking_reference,
        )
        if marked:
            sent += 1
        else:
            # Another worker already sent the feedback prompt between our
            # SELECT and UPDATE — treat as benign skip.
            skipped += 1

    detail = f"scanned={len(due_rows)} sent={sent} skipped={skipped}"
    if job_run_id is not None:
        await job_repository.mark_finished(
            job_run_id,
            status="completed",
            detail=detail,
        )

    return FeedbackRequestDispatchResult(
        scanned=len(due_rows),
        sent=sent,
        skipped=skipped,
        job_run_id=job_run_id,
    )


__all__ = [
    "FeedbackRequestDispatchResult",
    "dispatch_due_feedback_requests",
]
