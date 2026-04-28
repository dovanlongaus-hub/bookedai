"""Public partner-config endpoint handler.

This module powers `GET /api/v1/public/tenants/{slug}/partner-config` — the
unauthenticated tenant-resolution surface used by the BookedAI generic partner
template (Wave 5-E-2). It is the SOURCE OF TRUTH for how the frontend resolves
a tenant from a subdomain slug and renders the partner page (brand, hero,
channels, capabilities, endpoints, trust signals).

Behaviour:
- Resolves the tenant by slug and 404s when unknown or `status != 'active'`.
- When the tenant has no stored `partner_config_jsonb`, builds a SAFE FALLBACK
  config from `tenants.name` + BookedAI default channels + default capabilities
  so a brand-new tenant gets a working partner page with zero admin setup.
- Rate-limited per IP via the existing in-memory rate limiter (30/min/IP).
- Sets `Cache-Control: public, max-age=60` so frontend/CDN can short-cache.
"""

from __future__ import annotations

from typing import Any

from fastapi import HTTPException, Request
from fastapi.responses import JSONResponse
from sqlalchemy import text

from api.route_handlers import enforce_rate_limit
from api.v1 import build_error_envelope, build_success_envelope
from core.customer_booking_contact import (
    DEFAULT_CUSTOMER_BOOKING_SUPPORT_EMAIL,
    DEFAULT_CUSTOMER_BOOKING_SUPPORT_PHONE,
)
from core.errors import AppError
from db import get_session
from repositories.base import RepositoryContext
from repositories.tenant_repository import TenantRepository
from service_layer.tenant_partner_config_service import (
    PARTNER_CONFIG_CACHE_SECONDS,
    build_partner_config_response,
)


PUBLIC_PARTNER_CONFIG_RATE_LIMIT_SCOPE_PREFIX = "tenant_partner_config"
PUBLIC_PARTNER_CONFIG_RATE_LIMIT_PER_MINUTE = 30
PUBLIC_PARTNER_CONFIG_RATE_LIMIT_WINDOW_SECONDS = 60


async def _load_tenant_anchor(request: Request, slug: str) -> dict[str, Any] | None:
    """Return the tenant row needed to assemble a partner-config response.

    Loads the slug-keyed tenant record together with its stored partner-config
    payload (if any) in a single query. Returns None when the slug is unknown.
    Inactive tenants are intentionally returned here so the caller can decide
    whether to surface a tenant-not-found 404 (which is the API contract for
    `status != 'active'`).
    """
    normalized_slug = (slug or "").strip().lower()
    if not normalized_slug:
        return None
    async with get_session(request.app.state.session_factory) as session:
        result = await session.execute(
            text(
                """
                select
                  id::text as id,
                  slug,
                  name,
                  status,
                  industry,
                  timezone,
                  locale,
                  partner_config_jsonb,
                  partner_config_updated_at::text as partner_config_updated_at
                from tenants
                where slug = :slug
                limit 1
                """
            ),
            {"slug": normalized_slug},
        )
        row = result.mappings().first()
    if not row:
        return None
    config = row.get("partner_config_jsonb")
    return {
        "id": row.get("id"),
        "slug": row.get("slug"),
        "name": row.get("name"),
        "status": row.get("status"),
        "industry": row.get("industry"),
        "timezone": row.get("timezone"),
        "locale": row.get("locale"),
        "partner_config_jsonb": dict(config) if isinstance(config, dict) else None,
        "partner_config_updated_at": row.get("partner_config_updated_at"),
    }


def _tenant_not_found_response(slug: str) -> JSONResponse:
    error = AppError(
        code="tenant_not_found",
        message=(
            "No active BookedAI tenant matches this slug. Confirm the subdomain "
            "DNS record and that the tenant has been provisioned."
        ),
        status_code=404,
        details={"slug": slug},
    )
    return JSONResponse(
        status_code=error.status_code,
        content=build_error_envelope(error).model_dump(mode="json"),
    )


async def get_tenant_partner_config(
    request: Request,
    slug: str,
) -> JSONResponse:
    """Public partner-config resolver used by the generic frontend template."""
    normalized_slug = (slug or "").strip().lower()
    if not normalized_slug:
        return _tenant_not_found_response(slug)

    try:
        await enforce_rate_limit(
            request,
            scope=f"{PUBLIC_PARTNER_CONFIG_RATE_LIMIT_SCOPE_PREFIX}:{normalized_slug}",
            limit=PUBLIC_PARTNER_CONFIG_RATE_LIMIT_PER_MINUTE,
            window_seconds=PUBLIC_PARTNER_CONFIG_RATE_LIMIT_WINDOW_SECONDS,
        )
    except HTTPException as exc:
        if exc.status_code == 429:
            error = AppError(
                code="tenant_partner_config_rate_limited",
                message=str(exc.detail or "Rate limit exceeded."),
                status_code=429,
                details={"slug": normalized_slug},
            )
            response = JSONResponse(
                status_code=error.status_code,
                content=build_error_envelope(error).model_dump(mode="json"),
            )
            retry_after = exc.headers.get("Retry-After") if exc.headers else None
            if retry_after:
                response.headers["Retry-After"] = retry_after
            return response
        raise

    tenant_row = await _load_tenant_anchor(request, normalized_slug)
    if tenant_row is None:
        return _tenant_not_found_response(normalized_slug)

    status_value = str(tenant_row.get("status") or "").strip().lower()
    if status_value and status_value != "active":
        return _tenant_not_found_response(normalized_slug)

    support_email = (
        getattr(request.app.state.settings, "customer_booking_support_email", None)
        or DEFAULT_CUSTOMER_BOOKING_SUPPORT_EMAIL
    )
    support_phone = (
        getattr(request.app.state.settings, "customer_booking_support_phone", None)
        or DEFAULT_CUSTOMER_BOOKING_SUPPORT_PHONE
    )

    data = build_partner_config_response(
        slug=normalized_slug,
        tenant_name=tenant_row.get("name") or normalized_slug,
        tenant_status=status_value or "active",
        stored_config=tenant_row.get("partner_config_jsonb"),
        default_support_email=support_email,
        default_support_phone=support_phone,
    )

    payload = build_success_envelope(data=data)
    payload_json = payload.model_dump(mode="json")
    payload_json.setdefault("meta", {})
    if isinstance(payload_json.get("meta"), dict):
        payload_json["meta"].setdefault("version", "v1")
        payload_json["meta"]["cache_seconds"] = PARTNER_CONFIG_CACHE_SECONDS

    response = JSONResponse(status_code=200, content=payload_json)
    response.headers["Cache-Control"] = f"public, max-age={PARTNER_CONFIG_CACHE_SECONDS}"
    return response


__all__ = [
    "get_tenant_partner_config",
    "PUBLIC_PARTNER_CONFIG_RATE_LIMIT_PER_MINUTE",
    "PUBLIC_PARTNER_CONFIG_RATE_LIMIT_WINDOW_SECONDS",
]
