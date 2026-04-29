"""Route registrations for chess.bookedai.au meeting URL regeneration."""

from fastapi import APIRouter

from api import v1_chess_meeting_handlers as handlers


router = APIRouter(prefix="/api/v1", tags=["v1-chess-meeting"])

router.add_api_route(
    "/chess/bookings/{booking_intent_id}/meeting/regenerate",
    handlers.regenerate_chess_booking_meeting,
    methods=["POST"],
)
