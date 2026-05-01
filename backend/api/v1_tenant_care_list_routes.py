"""Route registrations for tenant-side care-list + monthly reminder endpoints."""

from fastapi import APIRouter

from api import v1_tenant_care_list_handlers as handlers


router = APIRouter(prefix="/api/v1", tags=["v1-tenant-care-list"])

router.add_api_route(
    "/tenants/me/care-list",
    handlers.tenant_care_list_get,
    methods=["GET"],
)
router.add_api_route(
    "/tenants/me/care-list",
    handlers.tenant_care_list_add,
    methods=["POST"],
)
router.add_api_route(
    "/tenants/me/care-list/{contact_id}",
    handlers.tenant_care_list_remove,
    methods=["DELETE"],
)
router.add_api_route(
    "/tenants/me/monthly-reminder/config",
    handlers.tenant_monthly_reminder_config_get,
    methods=["GET"],
)
router.add_api_route(
    "/tenants/me/monthly-reminder/config",
    handlers.tenant_monthly_reminder_config_put,
    methods=["PUT"],
)
router.add_api_route(
    "/tenants/me/monthly-reminder/dispatch",
    handlers.tenant_monthly_reminder_dispatch,
    methods=["POST"],
)
