from fastapi import APIRouter

from api import v1_handoff_handlers as handlers
from schemas import (
    CreateCustomerHandoffSessionResponse,
    HandoffSessionSummaryResponse,
)


router = APIRouter(prefix="/api/v1", tags=["v1-handoff"])

router.add_api_route(
    "/customer/handoff-sessions",
    handlers.create_customer_handoff_session,
    methods=["POST"],
    response_model=CreateCustomerHandoffSessionResponse,
)

router.add_api_route(
    "/admin/handoff-sessions/summary",
    handlers.admin_handoff_session_summary,
    methods=["GET"],
    response_model=HandoffSessionSummaryResponse,
)
