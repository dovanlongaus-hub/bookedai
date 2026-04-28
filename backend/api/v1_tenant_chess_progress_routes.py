"""Route registrations for tenant-side chess student-progress endpoints."""

from fastapi import APIRouter

from api import v1_tenant_chess_progress_handlers as handlers


router = APIRouter(prefix="/api/v1", tags=["v1-tenant-chess-progress"])

router.add_api_route(
    "/tenants/me/students",
    handlers.tenant_chess_students_list,
    methods=["GET"],
)
router.add_api_route(
    "/tenants/me/students/{contact_id}/progress",
    handlers.tenant_chess_student_progress_update,
    methods=["PATCH"],
)
