from fastapi import APIRouter

from api import route_handlers as handlers
from schemas import (
    BookingAssistantCatalogResponse,
    BookingAssistantChatResponse,
    BookingAssistantChatRequest,
    BookingAssistantSessionResponse,
    DemoBookingResponse,
    DemoBookingSyncResponse,
    DemoBriefResponse,
    PartnerProfileListResponse,
    PricingConsultationResponse,
    PublicDemoImportResponse,
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
    "/booking-assistant/chat/stream",
    handlers.booking_assistant_chat_stream,
    methods=["POST"],
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
router.add_api_route(
    "/demo/request",
    handlers.demo_request,
    methods=["POST"],
    response_model=DemoBookingResponse,
)
router.add_api_route(
    "/demo/brief",
    handlers.demo_brief,
    methods=["POST"],
    response_model=DemoBriefResponse,
)
router.add_api_route(
    "/demo/brief/{brief_reference}/sync",
    handlers.sync_demo_booking_from_brief,
    methods=["GET"],
    response_model=DemoBookingSyncResponse,
)
router.add_api_route(
    "/demo/scan-website",
    handlers.public_demo_scan_website,
    methods=["POST"],
    response_model=PublicDemoImportResponse,
)
