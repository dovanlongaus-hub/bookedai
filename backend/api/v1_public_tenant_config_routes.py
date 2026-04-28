"""Thin transport layer for the public tenant partner-config endpoint.

The handler logic lives in :mod:`api.v1_public_tenant_config_handlers`. This
module only mounts the route on a v1 APIRouter so the composition layer in
:mod:`api.v1_router` can include it alongside the other bounded-context
routers.
"""

from __future__ import annotations

from fastapi import APIRouter

from api import v1_public_tenant_config_handlers as handlers


router = APIRouter(prefix="/api/v1", tags=["v1-public-tenant-config"])

router.add_api_route(
    "/public/tenants/{slug}/partner-config",
    handlers.get_tenant_partner_config,
    methods=["GET"],
)
