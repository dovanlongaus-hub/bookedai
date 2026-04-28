"""Routes for the `/api/v1/sandbox/*` magic-moment onboarding flow.

See ``api/v1_sandbox_handlers.py`` for the handler bodies. This module just
binds them to FastAPI paths so it can be wired into ``v1_router``.
"""

from __future__ import annotations

from fastapi import APIRouter

from api import v1_sandbox_handlers as handlers


router = APIRouter(prefix="/api/v1", tags=["v1-sandbox"])

router.add_api_route(
    "/sandbox/sessions",
    handlers.sandbox_create_session,
    methods=["POST"],
)
router.add_api_route(
    "/sandbox/sessions/{session_id}",
    handlers.sandbox_get_session,
    methods=["GET"],
)
router.add_api_route(
    "/sandbox/sessions/{session_id}/bookings",
    handlers.sandbox_add_booking,
    methods=["POST"],
)
router.add_api_route(
    "/sandbox/sessions/{session_id}/save/request-code",
    handlers.sandbox_request_save_code,
    methods=["POST"],
)
router.add_api_route(
    "/sandbox/sessions/{session_id}/save",
    handlers.sandbox_save_session,
    methods=["POST"],
)


__all__ = ["router"]
