"""Internal worker entrypoints for n8n-driven cron schedules.

Operational plumbing strategy: **n8n** is the canonical scheduler in this
repository (see ``n8n/workflows/``). These FastAPI endpoints are the seam
between n8n's Schedule trigger nodes and the Python worker functions in
``backend/workers/``. They do NOT contain any business logic — they just
authenticate the bearer token, run the worker, and return a small JSON
summary that n8n can write into its own audit trail.

Auth: shared bearer token via ``N8N_WEBHOOK_BEARER_TOKEN`` (re-used from
``/api/automation/booking-callback``). The endpoint refuses to run when the
token is unset on the server, so a misconfigured production environment
fails closed rather than open.

Endpoints:
    * ``POST /api/internal/workers/dispatch-monthly-reminders``
    * ``POST /api/internal/workers/dispatch-feedback-requests``
"""

from __future__ import annotations

from fastapi import Header, HTTPException, Request

from db import get_session
from services import verify_bearer_token
from workers.feedback_request_worker import dispatch_due_feedback_requests
from workers.monthly_reminder_worker import dispatch_due_monthly_reminders


def _verify_internal_bearer(request: Request, authorization: str | None) -> None:
    token = authorization.removeprefix("Bearer ").strip() if authorization else None
    try:
        verify_bearer_token(
            token,
            request.app.state.settings.n8n_webhook_bearer_token,
            label="internal worker",
        )
    except ValueError as exc:
        raise HTTPException(status_code=401, detail=str(exc)) from exc


async def dispatch_monthly_reminders_endpoint(
    request: Request,
    authorization: str | None = Header(default=None),
) -> dict[str, int | str | None]:
    """Run the monthly reminder dispatch loop. Idempotent: bookings with no
    due reminder are skipped, and ``mark_reminder_sent`` advances the cursor
    so a re-trigger inside the cadence window is a no-op."""
    _verify_internal_bearer(request, authorization)

    email_service = request.app.state.email_service
    async with get_session(request.app.state.session_factory) as session:
        result = await dispatch_due_monthly_reminders(
            session,
            email_service=email_service,
        )
        await session.commit()

    return {
        "job_name": "monthly_reminder_worker",
        "scanned": result.scanned,
        "sent": result.sent,
        "skipped": result.skipped,
        "job_run_id": result.job_run_id,
    }


async def dispatch_feedback_requests_endpoint(
    request: Request,
    authorization: str | None = Header(default=None),
) -> dict[str, int | str | None]:
    """Run the 24h post-session feedback request dispatch loop. The worker
    flips ``feedback_request_sent_at`` so re-triggering the cron is a no-op
    against bookings that have already been notified."""
    _verify_internal_bearer(request, authorization)

    email_service = request.app.state.email_service
    async with get_session(request.app.state.session_factory) as session:
        result = await dispatch_due_feedback_requests(
            session,
            email_service=email_service,
        )
        await session.commit()

    return {
        "job_name": "feedback_request_worker",
        "scanned": result.scanned,
        "sent": result.sent,
        "skipped": result.skipped,
        "job_run_id": result.job_run_id,
    }


__all__ = [
    "dispatch_feedback_requests_endpoint",
    "dispatch_monthly_reminders_endpoint",
]
