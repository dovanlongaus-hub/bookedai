"""Route registrations for the futureswim.bookedai.au parent portal."""

from fastapi import APIRouter

from api import v1_futureswim_portal_handlers as handlers


router = APIRouter(prefix="/api/v1", tags=["v1-futureswim-portal"])

router.add_api_route(
    "/futureswim/portal/preview",
    handlers.futureswim_portal_preview,
    methods=["GET"],
)
