"""Route registration for the AI Mentor chat-turn endpoint.

Mounts ``POST /api/v1/aimentor/chat/turn`` from
:mod:`api.v1_aimentor_chat_handlers`.
"""

from fastapi import APIRouter

from api import v1_aimentor_chat_handlers as handlers


router = APIRouter(prefix="/api/v1", tags=["v1-aimentor-chat"])

router.add_api_route(
    "/aimentor/chat/turn",
    handlers.aimentor_chat_turn,
    methods=["POST"],
    response_model=handlers.ChatTurnResponse,
)
