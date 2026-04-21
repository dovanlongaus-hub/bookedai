from fastapi import APIRouter

from api import v1_booking_handlers as handlers


router = APIRouter(prefix="/api/v1", tags=["v1-booking"])

router.add_api_route("/leads", handlers.create_lead, methods=["POST"])
router.add_api_route("/conversations/sessions", handlers.start_chat_session, methods=["POST"])
router.add_api_route("/bookings/path/resolve", handlers.resolve_booking_path, methods=["POST"])
router.add_api_route("/bookings/intents", handlers.create_booking_intent, methods=["POST"])
router.add_api_route("/payments/intents", handlers.create_payment_intent, methods=["POST"])
