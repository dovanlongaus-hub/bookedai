from fastapi import APIRouter, status

from api import route_handlers as handlers
from schemas import (
    BookingAssistantCatalogResponse,
    BookingAssistantChatResponse,
    BookingAssistantSessionResponse,
    PartnerProfileListResponse,
    PricingConsultationResponse,
)


router = APIRouter(prefix="/api")

router.add_api_route("/", handlers.api_root, methods=["GET"])
router.add_api_route("/health", handlers.healthcheck, methods=["GET"])
router.add_api_route("/config", handlers.public_config, methods=["GET"])
router.add_api_route(
    "/partners",
    handlers.public_partners,
    methods=["GET"],
    response_model=PartnerProfileListResponse,
)
router.add_api_route(
    "/uploads/images",
    handlers.upload_image,
    methods=["POST"],
    status_code=status.HTTP_201_CREATED,
)
router.add_api_route(
    "/uploads/files",
    handlers.upload_file,
    methods=["POST"],
    status_code=status.HTTP_201_CREATED,
)
router.add_api_route(
    "/booking-assistant/catalog",
    handlers.booking_assistant_catalog,
    methods=["GET"],
    response_model=BookingAssistantCatalogResponse,
)
router.add_api_route(
    "/booking-assistant/chat",
    handlers.booking_assistant_chat,
    methods=["POST"],
    response_model=BookingAssistantChatResponse,
)
router.add_api_route(
    "/booking-assistant/session",
    handlers.booking_assistant_session,
    methods=["POST"],
    response_model=BookingAssistantSessionResponse,
)
router.add_api_route(
    "/pricing/consultation",
    handlers.pricing_consultation,
    methods=["POST"],
    response_model=PricingConsultationResponse,
)
