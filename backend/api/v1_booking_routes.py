from fastapi import APIRouter

from api import v1_booking_handlers as handlers


router = APIRouter(prefix="/api/v1", tags=["v1-booking"])

router.add_api_route("/leads", handlers.create_lead, methods=["POST"])
router.add_api_route("/conversations/sessions", handlers.start_chat_session, methods=["POST"])
router.add_api_route("/bookings/path/resolve", handlers.resolve_booking_path, methods=["POST"])
router.add_api_route("/bookings/intents", handlers.create_booking_intent, methods=["POST"])
router.add_api_route("/payments/intents", handlers.create_payment_intent, methods=["POST"])
router.add_api_route("/payments/manual-confirm", handlers.confirm_manual_payment, methods=["POST"])
router.add_api_route("/payments/status", handlers.payment_status, methods=["GET"])
router.add_api_route(
    "/booking/{booking_reference}/reminders/configure",
    handlers.configure_booking_reminder,
    methods=["POST"],
)
router.add_api_route(
    "/portal/bookings/{booking_reference}/reminders/disable",
    handlers.disable_booking_reminder,
    methods=["POST"],
)
router.add_api_route(
    "/booking/{booking_reference}/feedback",
    handlers.submit_booking_feedback,
    methods=["POST"],
)
