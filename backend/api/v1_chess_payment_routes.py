"""Route registrations for the chess.bookedai.au payment-options endpoint."""

from fastapi import APIRouter

from api import v1_chess_payment_handlers as handlers


router = APIRouter(prefix="/api/v1", tags=["v1-chess-payment"])

router.add_api_route(
    "/chess/payments/options",
    handlers.chess_payment_options,
    methods=["POST"],
)
