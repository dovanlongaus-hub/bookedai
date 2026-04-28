"""Route registrations for chess.bookedai.au student account endpoints."""

from fastapi import APIRouter

from api import v1_chess_student_handlers as handlers


router = APIRouter(prefix="/api/v1", tags=["v1-chess-student"])

router.add_api_route(
    "/students/google_auth",
    handlers.student_google_auth,
    methods=["POST"],
)
router.add_api_route(
    "/students/me",
    handlers.student_me,
    methods=["GET"],
)
router.add_api_route(
    "/students/me/logout",
    handlers.student_logout,
    methods=["POST"],
)
