"""Thin transport layer for admin tenant partner-config endpoints.

Routes here are mounted under the /api/v1/admin/* surface so the multi-tenant
onboarding API stays self-contained inside v1. Handler logic lives in
:mod:`api.v1_admin_tenant_config_handlers`.
"""

from __future__ import annotations

from fastapi import APIRouter

from api import v1_admin_tenant_config_handlers as handlers


router = APIRouter(prefix="/api/v1", tags=["v1-admin-tenant-config"])

router.add_api_route(
    "/admin/tenants/with-partner-config",
    handlers.list_tenants_with_partner_config,
    methods=["GET"],
)
router.add_api_route(
    "/admin/tenants/{slug}/partner-config",
    handlers.upsert_tenant_partner_config,
    methods=["POST"],
)
