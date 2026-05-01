"""Route registrations for tenant-side broadcast endpoints."""

from fastapi import APIRouter

from api import v1_tenant_broadcast_handlers as handlers


router = APIRouter(prefix="/api/v1", tags=["v1-tenant-broadcast"])

router.add_api_route(
    "/tenants/me/broadcast",
    handlers.tenant_broadcast_dispatch,
    methods=["POST"],
)
router.add_api_route(
    "/tenants/me/broadcast/audience-preview",
    handlers.tenant_broadcast_audience_preview,
    methods=["GET"],
)
