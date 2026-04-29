"""Route registrations for tenant-side AI Mentor student-progress endpoints."""

from fastapi import APIRouter

from api import v1_tenant_ai_mentor_progress_handlers as handlers


router = APIRouter(prefix="/api/v1", tags=["v1-tenant-ai-mentor-progress"])

router.add_api_route(
    "/tenants/me/aimentor-students",
    handlers.tenant_aimentor_students_list,
    methods=["GET"],
)
router.add_api_route(
    "/tenants/me/aimentor-students/{contact_id}/progress",
    handlers.tenant_aimentor_student_progress_update,
    methods=["PATCH"],
)
router.add_api_route(
    "/tenants/me/aimentor-reservations",
    handlers.tenant_aimentor_reservations_list,
    methods=["GET"],
)
router.add_api_route(
    "/tenants/me/aimentor-reservations/{slot_id}/action",
    handlers.tenant_aimentor_reservation_action,
    methods=["PATCH"],
)
router.add_api_route(
    "/tenants/me/aimentor-zoho-credentials",
    handlers.tenant_aimentor_zoho_credentials_get,
    methods=["GET"],
)
router.add_api_route(
    "/tenants/me/aimentor-zoho-credentials",
    handlers.tenant_aimentor_zoho_credentials_save,
    methods=["PATCH"],
)
