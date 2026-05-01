"""Route registrations for the futureswim.bookedai.au coach ops API."""

from fastapi import APIRouter

from api import v1_futureswim_coach_handlers as handlers


router = APIRouter(prefix="/api/v1", tags=["v1-futureswim-coach"])

# Phase 3.3 — magic email-code login + coach summary
router.add_api_route(
    "/futureswim/coach/login/request",
    handlers.futureswim_coach_login_request,
    methods=["POST"],
)

router.add_api_route(
    "/futureswim/coach/login/verify",
    handlers.futureswim_coach_login_verify,
    methods=["POST"],
)

router.add_api_route(
    "/futureswim/coach/me",
    handlers.futureswim_coach_me,
    methods=["GET"],
)

# Phase 3.2B — students roster + write endpoints
router.add_api_route(
    "/futureswim/coach/students",
    handlers.futureswim_coach_students_list,
    methods=["GET"],
)

router.add_api_route(
    "/futureswim/coach/students/{student_id}/progress",
    handlers.futureswim_coach_write_progress,
    methods=["POST"],
)

router.add_api_route(
    "/futureswim/coach/students/{student_id}/evaluation",
    handlers.futureswim_coach_write_evaluation,
    methods=["POST"],
)
