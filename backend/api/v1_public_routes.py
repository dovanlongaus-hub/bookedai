"""Public, slug-scoped v1 endpoints that do NOT require a tenant session.

These endpoints exist to give widgets / marketing landing pages a safe surface
for capturing leads without exposing the tenant-authenticated `/api/v1/leads`
endpoint to unauthenticated callers. Each public endpoint:

  * Resolves the tenant explicitly from a URL slug (no default-tenant fallback).
  * Returns 404 when the slug is unknown or the tenant is inactive.
  * Is rate-limited per client IP via :func:`enforce_rate_limit`.

The handlers here intentionally mirror the upsert behaviour of the tenant
authenticated `/api/v1/leads` handler so the public-widget capture path
produces identical downstream effects (lead row, contact row, CRM sync,
audit + outbox events).
"""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field
from sqlalchemy import text

from api.route_handlers import enforce_rate_limit
from api.v1_routes import (
    AppError,
    AttributionContextPayload,
    ContactRepository,
    LeadBusinessContextPayload,
    LeadContactInputPayload,
    LeadRepository,
    RepositoryContext,
    _error_response,
    _record_phase2_write_activity,
    _success_response,
    get_session,
    orchestrate_lead_capture,
)
from core.errors import ValidationAppError


router = APIRouter(prefix="/api/v1", tags=["v1-public"])


PUBLIC_LEAD_RATE_LIMIT_SCOPE = "public-lead-capture"
PUBLIC_LEAD_RATE_LIMIT_PER_MINUTE = 10
PUBLIC_LEAD_RATE_LIMIT_WINDOW_SECONDS = 60


class PublicCreateLeadRequestPayload(BaseModel):
    """Payload accepted by the unauthenticated, slug-scoped lead capture API.

    Notably this model does NOT include an ``actor_context`` field — the tenant
    is derived exclusively from the URL slug so unauthenticated callers cannot
    inject a tenant id of their choosing.
    """

    lead_type: str = "public_widget"
    contact: LeadContactInputPayload
    business_context: LeadBusinessContextPayload = Field(
        default_factory=LeadBusinessContextPayload
    )
    attribution: AttributionContextPayload
    intent_notes: str | None = None


async def _resolve_public_tenant(request: Request, tenant_slug: str) -> dict[str, str | None]:
    normalized_slug = (tenant_slug or "").strip().lower()
    if not normalized_slug:
        raise HTTPException(status_code=404, detail="Unknown tenant slug.")

    async with get_session(request.app.state.session_factory) as session:
        result = await session.execute(
            text(
                """
                select id::text as id, slug, name, status
                from tenants
                where slug = :slug
                limit 1
                """
            ),
            {"slug": normalized_slug},
        )
        row = result.mappings().first()

    if not row:
        raise HTTPException(status_code=404, detail="Unknown tenant slug.")

    status_value = str(row.get("status") or "").strip().lower()
    if status_value and status_value != "active":
        raise HTTPException(status_code=404, detail="Tenant is not accepting public leads.")

    return {
        "id": str(row.get("id") or "").strip() or None,
        "slug": row.get("slug"),
        "name": row.get("name"),
    }


async def create_public_lead(
    request: Request,
    tenant_slug: str,
    payload: PublicCreateLeadRequestPayload,
):
    await enforce_rate_limit(
        request,
        scope=PUBLIC_LEAD_RATE_LIMIT_SCOPE,
        limit=PUBLIC_LEAD_RATE_LIMIT_PER_MINUTE,
        window_seconds=PUBLIC_LEAD_RATE_LIMIT_WINDOW_SECONDS,
    )

    tenant_record = await _resolve_public_tenant(request, tenant_slug)
    tenant_id = tenant_record["id"]
    if not tenant_id:
        raise HTTPException(status_code=404, detail="Unknown tenant slug.")

    try:
        normalized_email = (payload.contact.email or "").strip().lower() or None
        normalized_phone = (payload.contact.phone or "").strip() or None
        if not normalized_email and not normalized_phone:
            raise ValidationAppError(
                "Lead intake requires at least one contact method.",
                details={"contact": ["email or phone is required"]},
            )

        async with get_session(request.app.state.session_factory) as session:
            contact_repository = ContactRepository(
                RepositoryContext(session=session, tenant_id=tenant_id)
            )
            lead_repository = LeadRepository(
                RepositoryContext(session=session, tenant_id=tenant_id)
            )
            contact_id = await contact_repository.upsert_contact(
                tenant_id=tenant_id,
                full_name=payload.contact.full_name,
                email=normalized_email,
                phone=normalized_phone,
                primary_channel=payload.contact.preferred_contact_method
                or ("email" if normalized_email else "phone"),
            )
            lead_id = await lead_repository.upsert_lead(
                tenant_id=tenant_id,
                contact_id=contact_id,
                source=payload.attribution.source,
                status="captured",
            )
            crm_sync_result = await orchestrate_lead_capture(
                session,
                tenant_id=tenant_id,
                lead_id=lead_id,
                source=payload.attribution.source,
                contact_email=normalized_email,
                contact_full_name=payload.contact.full_name,
                contact_phone=normalized_phone,
                company_name=payload.business_context.business_name,
            )
            await _record_phase2_write_activity(
                session,
                tenant_id=tenant_id,
                actor_context=None,
                audit_event_type="lead.captured",
                entity_type="lead",
                entity_id=lead_id,
                audit_payload={
                    "lead_type": payload.lead_type,
                    "contact_id": contact_id,
                    "crm_sync_status": crm_sync_result.sync_status,
                    "source": payload.attribution.source,
                    "preferred_contact_method": payload.contact.preferred_contact_method,
                    "tenant_slug": tenant_record["slug"],
                    "capture_surface": "public_widget",
                },
                outbox_event_type="lead.capture.recorded",
                outbox_payload={
                    "lead_id": lead_id,
                    "contact_id": contact_id,
                    "crm_sync_record_id": crm_sync_result.record_id,
                    "crm_sync_status": crm_sync_result.sync_status,
                    "source": payload.attribution.source,
                    "tenant_slug": tenant_record["slug"],
                    "capture_surface": "public_widget",
                },
                idempotency_key=f"public-lead-captured:{lead_id}" if lead_id else None,
            )
            await session.commit()

        return _success_response(
            {
                "lead_id": lead_id,
                "contact_id": contact_id,
                "tenant_slug": tenant_record["slug"],
                "status": "captured",
                "crm_sync_status": crm_sync_result.sync_status,
            },
            tenant_id=tenant_id,
        )
    except AppError as error:
        return _error_response(error, tenant_id=tenant_id)


router.add_api_route(
    "/public/leads/{tenant_slug}",
    create_public_lead,
    methods=["POST"],
)
