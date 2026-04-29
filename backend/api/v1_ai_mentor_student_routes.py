"""Route registrations for aimentor.bookedai.au student account endpoints."""

from fastapi import APIRouter

from api import v1_ai_mentor_student_handlers as handlers


router = APIRouter(prefix="/api/v1", tags=["v1-ai-mentor-student"])

router.add_api_route(
    "/aimentor/students/google_auth",
    handlers.student_google_auth,
    methods=["POST"],
)
router.add_api_route(
    "/aimentor/students/me",
    handlers.student_me,
    methods=["GET"],
)
router.add_api_route(
    "/aimentor/students/me/logout",
    handlers.student_logout,
    methods=["POST"],
)
router.add_api_route(
    "/aimentor/students/me/locale",
    handlers.student_locale_update,
    methods=["PATCH"],
)
router.add_api_route(
    "/aimentor/services/{service_id}/slots",
    handlers.list_service_time_slots,
    methods=["GET"],
)
router.add_api_route(
    "/aimentor/slots/{slot_id}/reserve",
    handlers.reserve_service_time_slot,
    methods=["POST"],
)
router.add_api_route(
    "/aimentor/integrations/zoho/exchange-code",
    handlers.exchange_zoho_oauth_code,
    methods=["POST"],
)
router.add_api_route(
    "/aimentor/payment-info",
    handlers.get_aimentor_payment_info,
    methods=["GET"],
)
