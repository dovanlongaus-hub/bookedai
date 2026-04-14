from fastapi import APIRouter

from api import route_handlers as handlers
from schemas import TawkWebhookResponse


router = APIRouter(prefix="/api")

router.add_api_route(
    "/webhooks/tawk",
    handlers.tawk_webhook,
    methods=["POST"],
    response_model=TawkWebhookResponse,
)
router.add_api_route(
    "/automation/booking-callback",
    handlers.booking_callback,
    methods=["POST"],
)
