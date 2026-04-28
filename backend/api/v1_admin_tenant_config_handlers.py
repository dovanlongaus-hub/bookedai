"""Admin-authenticated tenant partner-config handlers.

Powers:
  * `POST /api/v1/admin/tenants/{slug}/partner-config` — upsert the stored
    partner-config JSONB for an existing tenant.
  * `GET /api/v1/admin/tenants/with-partner-config` — admin dashboard list
    of every tenant + a `has_partner_config` flag.

The tenant row must already exist in the `tenants` table — admins create the
tenant via the existing `/api/admin/tenants` workflow first, then call this
endpoint to attach branding/hero/channel copy. Validation of payload shape
(hex color, capability allowlist, copy length caps) is delegated to the
PartnerConfigPayload Pydantic model in `tenant_partner_config_service`.
"""

from __future__ import annotations

import json
from typing import Any

from fastapi import Header, HTTPException, Request
from fastapi.responses import JSONResponse
from pydantic import ValidationError

from api.route_handlers import require_admin_access
from api.v1 import build_error_envelope, build_success_envelope
from core.errors import AppError, ValidationAppError
from db import get_session
from repositories.audit_repository import AuditLogRepository
from repositories.base import RepositoryContext
from repositories.tenant_repository import TenantRepository
from service_layer.tenant_partner_config_service import (
    PartnerConfigPayload,
    serialize_admin_partner_config_payload,
)


def _envelope_error_response(error: AppError) -> JSONResponse:
    return JSONResponse(
        status_code=error.status_code,
        content=build_error_envelope(error).model_dump(mode="json"),
    )


def _envelope_success_response(data: Any, *, status_code: int = 200) -> JSONResponse:
    payload = build_success_envelope(data=data).model_dump(mode="json")
    return JSONResponse(status_code=status_code, content=payload)


async def upsert_tenant_partner_config(
    request: Request,
    slug: str,
    authorization: str | None = Header(default=None),
    x_admin_token: str | None = Header(default=None, alias="X-Admin-Token"),
) -> JSONResponse:
    """Validate + persist the partner-config payload for an existing tenant."""
    try:
        admin_actor = require_admin_access(
            request,
            authorization=authorization,
            x_admin_token=x_admin_token,
        )
    except HTTPException as exc:
        error = AppError(
            code="admin_auth_required",
            message=str(exc.detail or "Admin authentication required"),
            status_code=exc.status_code or 401,
            details={"slug": slug},
        )
        return _envelope_error_response(error)

    normalized_slug = (slug or "").strip().lower()
    if not normalized_slug:
        return _envelope_error_response(
            AppError(
                code="tenant_not_found",
                message="A tenant slug is required.",
                status_code=404,
                details={"slug": slug},
            )
        )

    try:
        body = await request.json()
    except Exception as exc:  # pragma: no cover - FastAPI normally guards this
        return _envelope_error_response(
            ValidationAppError(
                "Request body must be valid JSON.",
                details={"error": str(exc)},
            )
        )

    if not isinstance(body, dict):
        return _envelope_error_response(
            ValidationAppError(
                "Request body must be a JSON object matching the partner-config shape.",
                details={"received_type": type(body).__name__},
            )
        )

    try:
        validated = PartnerConfigPayload.model_validate(body)
    except ValidationError as exc:
        return _envelope_error_response(
            ValidationAppError(
                "Partner config payload is invalid.",
                details={"errors": json.loads(exc.json())},
            )
        )

    serialized = serialize_admin_partner_config_payload(validated)

    async with get_session(request.app.state.session_factory) as session:
        tenant_repository = TenantRepository(RepositoryContext(session=session))
        tenant_profile = await tenant_repository.get_tenant_profile(normalized_slug)
        if not tenant_profile:
            return _envelope_error_response(
                AppError(
                    code="tenant_not_found",
                    message=(
                        "No tenant matches this slug. Create the tenant via "
                        "/api/admin/tenants before assigning a partner-config payload."
                    ),
                    status_code=404,
                    details={"slug": normalized_slug},
                )
            )

        result = await tenant_repository.upsert_partner_config(
            slug=normalized_slug,
            config=serialized,
        )
        if not result:
            return _envelope_error_response(
                AppError(
                    code="tenant_not_found",
                    message="Tenant disappeared during the partner-config upsert.",
                    status_code=404,
                    details={"slug": normalized_slug},
                )
            )

        tenant_id = str(tenant_profile.get("id") or "")
        audit_repository = AuditLogRepository(
            RepositoryContext(session=session, tenant_id=tenant_id)
        )
        await audit_repository.append_entry(
            tenant_id=tenant_id,
            event_type="admin.tenant.partner_config_upserted",
            entity_type="tenant_partner_config",
            entity_id=tenant_id,
            actor_type="admin_operator",
            actor_id=admin_actor,
            payload={
                "summary": "Tenant partner-config upserted via admin API.",
                "slug": normalized_slug,
                "capabilities": serialized.get("capabilities", []),
            },
        )
        await session.commit()

    response_data = {
        "slug": normalized_slug,
        "active": str(tenant_profile.get("status") or "active").strip().lower() == "active",
        **serialized,
        "partner_config_updated_at": (
            result.get("partner_config_updated_at").isoformat()
            if hasattr(result.get("partner_config_updated_at"), "isoformat")
            else result.get("partner_config_updated_at")
        ),
    }
    return _envelope_success_response(response_data)


async def list_tenants_with_partner_config(
    request: Request,
    authorization: str | None = Header(default=None),
    x_admin_token: str | None = Header(default=None, alias="X-Admin-Token"),
) -> JSONResponse:
    """Admin dashboard: list every tenant with `has_partner_config` flag."""
    try:
        require_admin_access(
            request,
            authorization=authorization,
            x_admin_token=x_admin_token,
        )
    except HTTPException as exc:
        error = AppError(
            code="admin_auth_required",
            message=str(exc.detail or "Admin authentication required"),
            status_code=exc.status_code or 401,
        )
        return _envelope_error_response(error)

    async with get_session(request.app.state.session_factory) as session:
        tenant_repository = TenantRepository(RepositoryContext(session=session))
        rows = await tenant_repository.list_tenants_with_config_status()

    items: list[dict[str, Any]] = []
    for row in rows:
        updated_at = row.get("partner_config_updated_at")
        items.append(
            {
                "id": row.get("id"),
                "slug": row.get("slug"),
                "name": row.get("name"),
                "status": row.get("status"),
                "industry": row.get("industry"),
                "timezone": row.get("timezone"),
                "locale": row.get("locale"),
                "has_partner_config": bool(row.get("has_partner_config")),
                "partner_config_updated_at": (
                    updated_at.isoformat() if hasattr(updated_at, "isoformat") else updated_at
                ),
            }
        )

    return _envelope_success_response({"items": items, "total": len(items)})


__all__ = [
    "upsert_tenant_partner_config",
    "list_tenants_with_partner_config",
]
