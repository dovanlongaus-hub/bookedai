"""FastAPI route bindings for the per-tenant Zoho integrations module.

Routes split into two namespaces:
    * ``/api/v1/tenants/me/...`` — tenant-admin authenticated CRUD over the
      per-tenant Zoho credentials + CC list.
    * ``/api/v1/integrations/zoho/oauth/callback`` — public callback that
      Zoho redirects to after the operator approves scopes. The state nonce
      provides CSRF protection without requiring the user's session cookie
      to follow the redirect (Zoho strips it on the round-trip).
"""

from __future__ import annotations

from fastapi import APIRouter

from api import v1_tenant_zoho_integration_handlers as handlers


router = APIRouter(prefix="/api/v1", tags=["v1-tenant-zoho-integrations"])

router.add_api_route(
    "/tenants/me/integrations",
    handlers.list_tenant_zoho_integrations,
    methods=["GET"],
)
router.add_api_route(
    "/tenants/me/integrations/zoho/{service}/authorize-url",
    handlers.get_tenant_zoho_authorize_url,
    methods=["GET"],
)
router.add_api_route(
    "/tenants/me/integrations/zoho/{service}",
    handlers.disconnect_tenant_zoho,
    methods=["DELETE"],
)
router.add_api_route(
    "/tenants/me/integrations/zoho/{service}/test",
    handlers.test_tenant_zoho_connection,
    methods=["POST"],
)
router.add_api_route(
    "/tenants/me/integrations/zoho/{service}/client",
    handlers.register_tenant_zoho_client,
    methods=["PATCH"],
)
router.add_api_route(
    "/tenants/me/cc-emails",
    handlers.update_tenant_cc_emails,
    methods=["PATCH"],
)
router.add_api_route(
    "/integrations/zoho/oauth/callback",
    handlers.zoho_oauth_callback,
    methods=["GET"],
)
