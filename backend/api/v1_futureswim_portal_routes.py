"""Route registrations for the futureswim.bookedai.au parent portal."""

from fastapi import APIRouter

from api import v1_futureswim_portal_handlers as handlers


router = APIRouter(prefix="/api/v1", tags=["v1-futureswim-portal"])

router.add_api_route(
    "/futureswim/portal/preview",
    handlers.futureswim_portal_preview,
    methods=["GET"],
)

router.add_api_route(
    "/futureswim/portal/login/request",
    handlers.futureswim_portal_login_request,
    methods=["POST"],
)

router.add_api_route(
    "/futureswim/portal/login/verify",
    handlers.futureswim_portal_login_verify,
    methods=["POST"],
)

router.add_api_route(
    "/futureswim/portal/me",
    handlers.futureswim_portal_me,
    methods=["GET"],
)
