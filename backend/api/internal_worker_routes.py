"""Routing layer for internal worker endpoints (n8n cron seam).

Mounts the operational-plumbing worker entrypoints under ``/api/internal/``.
These endpoints are intentionally outside the public ``/api/v1/`` surface
because they are server-to-server only (n8n → backend) and authenticate via
``N8N_WEBHOOK_BEARER_TOKEN`` rather than tenant or admin sessions.
"""

from __future__ import annotations

from fastapi import APIRouter

from api.internal_worker_handlers import (
    dispatch_feedback_requests_endpoint,
    dispatch_monthly_reminders_endpoint,
)


router = APIRouter(prefix="/api/internal/workers", tags=["internal-workers"])

router.add_api_route(
    "/dispatch-monthly-reminders",
    dispatch_monthly_reminders_endpoint,
    methods=["POST"],
)
router.add_api_route(
    "/dispatch-feedback-requests",
    dispatch_feedback_requests_endpoint,
    methods=["POST"],
)
