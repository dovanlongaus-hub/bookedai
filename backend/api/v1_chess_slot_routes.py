"""Route registrations for chess course schedule slots + catalog search."""

from fastapi import APIRouter

from api import v1_chess_slot_handlers as handlers


router = APIRouter(prefix="/api/v1", tags=["v1-chess-slots"])

# Public — list available cohort slots for a chess course.
router.add_api_route(
    "/chess/courses/{service_id}/slots",
    handlers.list_chess_course_slots,
    methods=["GET"],
)

# Tenant-admin CRUD for slot management.
router.add_api_route(
    "/tenants/me/chess/courses/{service_id}/slots",
    handlers.list_tenant_chess_course_slots,
    methods=["GET"],
)
router.add_api_route(
    "/tenants/me/chess/courses/{service_id}/slots",
    handlers.create_tenant_chess_course_slots,
    methods=["POST"],
)
router.add_api_route(
    "/tenants/me/chess/courses/{service_id}/slots/{slot_id}",
    handlers.update_tenant_chess_course_slot,
    methods=["PATCH"],
)
router.add_api_route(
    "/tenants/me/chess/courses/{service_id}/slots/{slot_id}",
    handlers.delete_tenant_chess_course_slot,
    methods=["DELETE"],
)

# Public — tenant-scoped catalog search replaces marketplace search for the
# chess subdomain.
router.add_api_route(
    "/chess/catalog/search",
    handlers.chess_catalog_search,
    methods=["POST"],
)
