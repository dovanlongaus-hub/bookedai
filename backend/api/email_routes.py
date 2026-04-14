from fastapi import APIRouter

from api import route_handlers as handlers
from schemas import EmailInboxResponse, EmailSendResponse, EmailStatusResponse


router = APIRouter(prefix="/api")

router.add_api_route(
    "/email/status",
    handlers.email_status,
    methods=["GET"],
    response_model=EmailStatusResponse,
)
router.add_api_route(
    "/email/send",
    handlers.email_send,
    methods=["POST"],
    response_model=EmailSendResponse,
)
router.add_api_route(
    "/email/inbox",
    handlers.email_inbox,
    methods=["GET"],
    response_model=EmailInboxResponse,
)
