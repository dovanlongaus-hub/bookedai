from fastapi import APIRouter

from api import route_handlers as handlers
from api.discord_routes import router as discord_router
from schemas import EmailInboxResponse, EmailSendResponse, EmailStatusResponse


router = APIRouter()

api_router = APIRouter(prefix="/api")
api_router.add_api_route(
    "/email/status",
    handlers.email_status,
    methods=["GET"],
    response_model=EmailStatusResponse,
)
api_router.add_api_route(
    "/email/send",
    handlers.email_send,
    methods=["POST"],
    response_model=EmailSendResponse,
)
api_router.add_api_route(
    "/email/inbox",
    handlers.email_inbox,
    methods=["GET"],
    response_model=EmailInboxResponse,
)

router.include_router(api_router)
router.include_router(discord_router)
