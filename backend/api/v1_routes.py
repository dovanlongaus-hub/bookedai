from __future__ import annotations

import base64
import binascii
import hashlib
from html import escape
import hmac
import json
import re
from datetime import UTC, datetime, timedelta
from typing import Any
from urllib.parse import quote, urlencode
from uuid import uuid4

import httpx
from fastapi import APIRouter, Header, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from sqlalchemy import String, and_, cast, desc, or_, select, text

from api.v1 import build_error_envelope, build_success_envelope
from config import Settings
from core.feature_flags import is_flag_enabled
from core.errors import AppError, IntegrationAppError, PaymentAppError, ValidationAppError
from core.logging import get_logger
from core.session_tokens import (
    SessionTokenError,
    create_tenant_session_token as _create_tenant_session_token,
    verify_tenant_session_token as _verify_tenant_session_token,
)
from db import (
    ServiceMerchantProfile,
    TenantEmailLoginCode,
    TenantUserCredential,
    TenantUserMembership,
    get_session,
)
from repositories.audit_repository import AuditLogRepository
from repositories.base import RepositoryContext
from repositories.booking_intent_repository import BookingIntentRepository
from repositories.contact_repository import ContactRepository
from repositories.integration_repository import IntegrationRepository
from repositories.lead_repository import LeadRepository
from repositories.outbox_repository import OutboxRepository
from repositories.payment_intent_repository import PaymentIntentRepository
from repositories.tenant_repository import TenantRepository
from service_layer.admin_presenters import build_service_merchant_item
from service_layer.catalog_quality_service import apply_catalog_quality_gate
from service_layer.email_service import EmailService
from service_layer.lifecycle_ops_service import (
    orchestrate_booking_followup_sync,
    orchestrate_communication_touch,
    orchestrate_contact_sync,
    orchestrate_email_sent_sync,
    orchestrate_lead_capture,
    orchestrate_lifecycle_email,
    queue_crm_sync_retry,
)
from service_layer.communication_service import CommunicationService, render_bookedai_confirmation_email
from service_layer.prompt9_matching_service import (
    GENERIC_QUERY_STOPWORDS,
    RankedServiceMatch,
    apply_deterministic_ranking_policy,
    build_canonical_query_understanding,
    build_booking_trust_payload,
    extract_core_intent_terms,
    extract_booking_request_context,
    expand_location_terms,
    extract_query_location_hint,
    expand_topic_terms,
    filter_ranked_matches_for_display_quality,
    filter_ranked_matches_for_relevance,
    is_near_me_requested,
    is_chat_style_query,
    rank_catalog_matches,
    resolve_booking_path_policy,
    service_is_online_friendly,
    _normalized_text,
)
from service_layer.prompt11_integration_service import (
    build_attention_triage_snapshot,
    build_crm_retry_backlog,
    build_integration_attention_items,
    build_integration_provider_statuses,
    build_outbox_backlog,
    build_recent_runtime_activity,
    build_reconciliation_details,
    build_reconciliation_summary,
)
from service_layer.tenant_app_service import (
    build_tenant_invoice_receipt,
    build_portal_booking_snapshot,
    build_portal_customer_care_turn,
    queue_portal_booking_request,
    build_tenant_billing_snapshot,
    build_tenant_catalog_snapshot,
    build_tenant_bookings_snapshot,
    build_tenant_leads_snapshot,
    build_tenant_integrations_snapshot,
    build_tenant_onboarding_snapshot,
    build_tenant_plugin_interface_snapshot,
    build_tenant_team_snapshot,
    build_tenant_overview,
)
from services import _build_google_maps_url
from workers.outbox import dispatch_phase2_outbox_event, run_tracked_outbox_dispatch


router = APIRouter(prefix="/api/v1")
logger = get_logger("bookedai.api.v1")

SEMANTIC_DOMAIN_STOP_WORDS = {
    "around",
    "compare",
    "find",
    "help",
    "i",
    "me",
    "my",
    "show",
    "something",
} | GENERIC_QUERY_STOPWORDS

RESTAURANT_LIVE_SEARCH_TERMS = {
    "restaurant",
    "dining",
    "dinner",
    "lunch",
    "brunch",
    "table",
    "reservation",
    "private dining",
    "group dining",
    "book a table",
    "eat",
    "food",
}

GOOGLE_TENANT_AUTH_CONFIG_MESSAGE = (
    "Add `VITE_GOOGLE_CLIENT_ID` in the frontend environment and "
    "`GOOGLE_OAUTH_CLIENT_ID` in the backend to enable tenant Google login."
)
TENANT_EMAIL_CODE_TTL_MINUTES = 15


class ActorContextPayload(BaseModel):
    channel: str
    tenant_id: str | None = None
    tenant_ref: str | None = None
    actor_id: str | None = None
    role: str | None = None
    deployment_mode: str | None = None


class LeadContactInputPayload(BaseModel):
    full_name: str
    email: str | None = None
    phone: str | None = None
    preferred_contact_method: str | None = None


class LeadBusinessContextPayload(BaseModel):
    business_name: str | None = None
    website_url: str | None = None
    industry: str | None = None
    location: str | None = None
    service_category: str | None = None


class AttributionContextPayload(BaseModel):
    source: str
    medium: str | None = None
    campaign: str | None = None
    keyword: str | None = None
    landing_path: str | None = None
    referrer: str | None = None
    utm: dict[str, str] = Field(default_factory=dict)


class IntentContextPayload(BaseModel):
    source_page: str | None = None
    intent_type: str | None = None
    notes: str | None = None
    requested_service_id: str | None = None


class CreateLeadRequestPayload(BaseModel):
    lead_type: str
    contact: LeadContactInputPayload
    business_context: LeadBusinessContextPayload = Field(default_factory=LeadBusinessContextPayload)
    attribution: AttributionContextPayload
    intent_context: IntentContextPayload = Field(default_factory=IntentContextPayload)
    actor_context: ActorContextPayload


class StartChatSessionRequestPayload(BaseModel):
    channel: str
    anonymous_session_id: str | None = None
    attribution: AttributionContextPayload | None = None
    context: dict[str, Any] | None = None
    actor_context: ActorContextPayload


class BookingChannelContextPayload(BaseModel):
    channel: str
    tenant_id: str | None = None
    tenant_ref: str | None = None
    deployment_mode: str | None = None
    widget_id: str | None = None


class DesiredSlotPayload(BaseModel):
    date: str
    time: str
    timezone: str


class SearchCandidatesRequestPayload(BaseModel):
    query: str
    location: str | None = None
    preferences: dict[str, Any] | None = None
    budget: dict[str, Any] | None = None
    time_window: dict[str, Any] | None = None
    channel_context: BookingChannelContextPayload
    attribution: AttributionContextPayload | None = None
    user_location: dict[str, Any] | None = None
    chat_context: list[dict[str, Any]] | None = None


class CheckAvailabilityRequestPayload(BaseModel):
    candidate_id: str
    desired_slot: DesiredSlotPayload | None = None
    party_size: int | None = None
    channel: str
    actor_context: ActorContextPayload


class ResolveBookingPathRequestPayload(BaseModel):
    candidate_id: str | None = None
    availability_state: str | None = None
    booking_confidence: str | None = None
    payment_option: str | None = None
    channel: str
    actor_context: ActorContextPayload
    context: dict[str, Any] | None = None


class CreateBookingIntentRequestPayload(BaseModel):
    candidate_id: str | None = None
    service_id: str | None = None
    desired_slot: DesiredSlotPayload | None = None
    contact: LeadContactInputPayload
    attribution: AttributionContextPayload | None = None
    channel: str
    actor_context: ActorContextPayload
    notes: str | None = None


class CreatePaymentIntentRequestPayload(BaseModel):
    booking_intent_id: str
    selected_payment_option: str
    actor_context: ActorContextPayload


class SendLifecycleEmailRequestPayload(BaseModel):
    template_key: str
    to: list[str]
    cc: list[str] = Field(default_factory=list)
    subject: str | None = None
    variables: dict[str, str] = Field(default_factory=dict)
    context: dict[str, Any] | None = None
    actor_context: ActorContextPayload


class SendCommunicationMessageRequestPayload(BaseModel):
    to: str
    body: str | None = None
    template_key: str | None = None
    variables: dict[str, str] = Field(default_factory=dict)
    context: dict[str, Any] | None = None
    actor_context: ActorContextPayload


class RetryCrmSyncRequestPayload(BaseModel):
    crm_sync_record_id: int
    actor_context: ActorContextPayload | None = None


class DispatchOutboxRequestPayload(BaseModel):
    limit: int = 10
    actor_context: ActorContextPayload | None = None


class ReplayOutboxEventRequestPayload(BaseModel):
    outbox_event_id: int
    actor_context: ActorContextPayload | None = None


class IntegrationStatusQueryPayload(BaseModel):
    tenant_id: str | None = None


class TenantGoogleAuthRequestPayload(BaseModel):
    id_token: str
    tenant_ref: str | None = None
    auth_intent: str | None = None
    business_name: str | None = None
    industry: str | None = None
    tenant_slug: str | None = None


class TenantPasswordAuthRequestPayload(BaseModel):
    username: str
    password: str
    tenant_ref: str | None = None


class TenantEmailCodeRequestPayload(BaseModel):
    email: str
    tenant_ref: str | None = None
    auth_intent: str | None = None
    business_name: str | None = None
    full_name: str | None = None
    industry: str | None = None
    tenant_slug: str | None = None


class TenantEmailCodeVerifyRequestPayload(BaseModel):
    email: str
    code: str
    tenant_ref: str | None = None
    auth_intent: str | None = None
    business_name: str | None = None
    full_name: str | None = None
    industry: str | None = None
    tenant_slug: str | None = None


class TenantCreateAccountRequestPayload(BaseModel):
    business_name: str
    email: str
    username: str
    password: str
    full_name: str | None = None
    industry: str | None = None
    timezone: str | None = None
    locale: str | None = None
    tenant_slug: str | None = None


class TenantClaimAccountRequestPayload(BaseModel):
    tenant_ref: str
    email: str
    username: str
    password: str
    full_name: str | None = None


class TenantProfileUpdateRequestPayload(BaseModel):
    business_name: str | None = None
    industry: str | None = None
    timezone: str | None = None
    locale: str | None = None
    operator_full_name: str | None = None
    logo_url: str | None = None
    hero_image_url: str | None = None
    introduction_html: str | None = None
    guide_overview: str | None = None
    guide_experience: str | None = None
    guide_catalog: str | None = None
    guide_plugin: str | None = None
    guide_bookings: str | None = None
    guide_integrations: str | None = None
    guide_billing: str | None = None
    guide_team: str | None = None


class TenantPluginInterfaceUpdateRequestPayload(BaseModel):
    partner_name: str | None = None
    partner_website_url: str | None = None
    bookedai_host: str | None = None
    embed_path: str | None = None
    widget_script_path: str | None = None
    tenant_ref: str | None = None
    widget_id: str | None = None
    accent_color: str | None = None
    button_label: str | None = None
    modal_title: str | None = None
    headline: str | None = None
    prompt: str | None = None
    inline_target_selector: str | None = None
    support_email: str | None = None
    support_whatsapp: str | None = None
    logo_url: str | None = None


class TenantBillingAccountUpdateRequestPayload(BaseModel):
    billing_email: str | None = None
    merchant_mode: str | None = None


class TenantSubscriptionUpdateRequestPayload(BaseModel):
    package_code: str | None = None
    plan_code: str | None = None
    mode: str | None = Field(default="trial")


class TenantInviteMemberRequestPayload(BaseModel):
    email: str
    full_name: str | None = None
    role: str = "operator"


class TenantMemberAccessUpdateRequestPayload(BaseModel):
    role: str | None = None
    status: str | None = None


class TenantIntegrationProviderUpdateRequestPayload(BaseModel):
    status: str | None = None
    sync_mode: str | None = None


class TenantCatalogImportRequestPayload(BaseModel):
    website_url: str
    business_name: str | None = None
    business_email: str | None = None
    category: str | None = None
    search_focus: str | None = None
    location_hint: str | None = None


class TenantCatalogCreateRequestPayload(BaseModel):
    business_name: str | None = None
    name: str | None = None
    category: str | None = None


class TenantCatalogUpdateRequestPayload(BaseModel):
    business_name: str | None = None
    business_email: str | None = None
    name: str | None = None
    category: str | None = None
    summary: str | None = None
    amount_aud: float | None = None
    currency_code: str | None = None
    display_price: str | None = None
    duration_minutes: int | None = None
    venue_name: str | None = None
    location: str | None = None
    map_url: str | None = None
    booking_url: str | None = None
    image_url: str | None = None
    tags: list[str] | None = None
    featured: bool | None = None


class PortalBookingActionRequestPayload(BaseModel):
    customer_note: str | None = None
    preferred_date: str | None = None
    preferred_time: str | None = None
    timezone: str | None = None


def _slugify_value(value: str) -> str:
    normalized = re.sub(r"[^a-z0-9]+", "-", value.strip().lower())
    return normalized.strip("-") or "service"


TENANT_SUBSCRIPTION_PLAN_CODES = {"starter", "growth", "scale"}
TENANT_TEAM_ROLE_CODES = {"tenant_admin", "finance_manager", "operator"}
TENANT_BILLING_WRITE_ROLES = {"tenant_admin", "finance_manager"}
TENANT_TEAM_MANAGE_ROLES = {"tenant_admin"}
TENANT_CATALOG_WRITE_ROLES = {"tenant_admin", "operator"}
TENANT_INTEGRATION_WRITE_ROLES = {"tenant_admin", "operator"}


def _membership_role(membership: dict[str, str | None] | None) -> str:
    return str((membership or {}).get("role") or "tenant_admin").strip().lower()


def _require_tenant_membership_role(
    membership: dict[str, str | None] | None,
    *,
    allowed_roles: set[str],
    message: str,
) -> AppError | None:
    role = _membership_role(membership)
    if role in allowed_roles:
        return None
    return AppError(
        code="tenant_role_forbidden",
        message=message,
        status_code=403,
        details={"required_roles": sorted(allowed_roles), "current_role": role},
    )


def _extract_bearer_token(authorization: str | None) -> str | None:
    if not authorization:
        return None
    value = authorization.strip()
    if value.lower().startswith("bearer "):
        return value[7:].strip() or None
    return value or None


async def _resolve_tenant_session(
    request: Request,
    authorization: str | None = None,
) -> dict[str, str | None] | None:
    token = _extract_bearer_token(authorization)
    if not token:
        return None

    cfg: Settings = request.app.state.settings
    try:
        return _verify_tenant_session_token(cfg, token)
    except SessionTokenError:
        return None


def _hash_tenant_password(*, password: str, salt: str) -> str:
    derived = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode(),
        salt.encode(),
        200_000,
    )
    return binascii.hexlify(derived).decode()


def _verify_tenant_password(*, password: str, salt: str, expected_hash: str) -> bool:
    candidate_hash = _hash_tenant_password(password=password, salt=salt)
    return hmac.compare_digest(candidate_hash, expected_hash)


async def _verify_google_identity_token(
    cfg: Settings,
    *,
    id_token: str,
) -> dict[str, str | None]:
    normalized_token = id_token.strip()
    if not normalized_token:
        raise AppError(
            code="google_identity_token_missing",
            message="Google verification did not return a usable credential. Use the Google button to try again.",
            status_code=422,
        )

    if not cfg.google_oauth_client_id:
        raise AppError(
            code="google_oauth_not_configured",
            message=GOOGLE_TENANT_AUTH_CONFIG_MESSAGE,
            status_code=503,
        )

    try:
        async with httpx.AsyncClient(timeout=10) as client:
            response = await client.get(
                "https://oauth2.googleapis.com/tokeninfo",
                params={"id_token": normalized_token},
            )
            response.raise_for_status()
            payload = response.json()
    except httpx.HTTPStatusError as error:
        provider_status = error.response.status_code
        provider_error: str | None = None
        try:
            provider_payload = error.response.json()
            provider_error = str(
                provider_payload.get("error_description")
                or provider_payload.get("error")
                or ""
            ).strip() or None
        except ValueError:
            provider_error = None

        if provider_status in {400, 401}:
            raise AppError(
                code="google_identity_token_invalid",
                message="Google verification expired or was rejected. Use another Google account to verify again.",
                status_code=401,
                details={
                    "provider": "google",
                    "provider_status": provider_status,
                    "provider_error": provider_error,
                },
            ) from error

        raise IntegrationAppError(
            "Google verification is temporarily unavailable. Please try again shortly.",
            provider="google",
            details={"provider_status": provider_status},
        ) from error
    except httpx.HTTPError as error:
        raise IntegrationAppError(
            "Google verification is temporarily unavailable. Please try again shortly.",
            provider="google",
        ) from error
    except ValueError as error:
        raise IntegrationAppError(
            "Google verification returned an unreadable response. Please try again shortly.",
            provider="google",
        ) from error

    audience = str(payload.get("aud") or "").strip()
    if cfg.google_oauth_client_id and audience != cfg.google_oauth_client_id:
        raise AppError(
            code="google_audience_mismatch",
            message="Google sign-in was accepted by a different client application.",
            status_code=401,
            details={"aud": audience},
        )

    if str(payload.get("email_verified") or "").lower() not in {"true", "1"}:
        raise AppError(
            code="google_email_not_verified",
            message="Google account email must be verified before tenant access is granted.",
            status_code=403,
        )

    email = str(payload.get("email") or "").strip().lower()
    if not email:
        raise AppError(
            code="google_email_missing",
            message="Google sign-in did not provide a usable account email.",
            status_code=422,
        )

    return {
        "email": email,
        "name": str(payload.get("name") or "").strip() or None,
        "picture_url": str(payload.get("picture") or "").strip() or None,
        "google_sub": str(payload.get("sub") or "").strip() or None,
    }


async def _upsert_tenant_membership(
    session,
    *,
    tenant_profile: dict[str, str | None],
    email: str,
    full_name: str | None,
    google_sub: str | None,
    auth_provider: str = "google",
) -> dict[str, str | None]:
    normalized_email = email.strip().lower()
    tenant_id = str(tenant_profile.get("id") or "").strip()
    tenant_slug = str(tenant_profile.get("slug") or "").strip()
    existing = (
        await session.execute(
            select(TenantUserMembership).where(
                TenantUserMembership.tenant_id == tenant_id,
                TenantUserMembership.email == normalized_email,
            )
        )
    ).scalar_one_or_none()

    if existing:
        existing.full_name = full_name or existing.full_name
        existing.provider_subject = google_sub or existing.provider_subject
        existing.auth_provider = auth_provider or existing.auth_provider
        existing.status = "active"
        existing.role = existing.role or "tenant_admin"
        membership = existing
    else:
        membership = TenantUserMembership(
            tenant_id=tenant_id,
            tenant_slug=tenant_slug,
            email=normalized_email,
            full_name=full_name,
            auth_provider=auth_provider,
            provider_subject=google_sub,
            role="tenant_admin",
            status="active",
        )
        session.add(membership)

    await session.flush()
    return {
        "tenant_id": tenant_id,
        "tenant_slug": tenant_slug,
        "email": membership.email,
        "role": membership.role,
        "status": membership.status,
    }


async def _load_tenant_membership(
    session,
    *,
    tenant_id: str,
    email: str,
    statuses: tuple[str, ...] = ("active",),
) -> dict[str, str | None] | None:
    membership = (
        await session.execute(
            select(TenantUserMembership).where(
                TenantUserMembership.tenant_id == tenant_id,
                TenantUserMembership.email == email.strip().lower(),
                TenantUserMembership.status.in_(statuses),
            )
        )
    ).scalar_one_or_none()
    if not membership:
        return None

    return {
        "tenant_id": membership.tenant_id,
        "tenant_slug": membership.tenant_slug,
        "email": membership.email,
        "role": membership.role,
        "status": membership.status,
    }


async def _load_tenant_memberships_for_google_identity(
    session,
    *,
    email: str,
    google_sub: str | None,
) -> list[dict[str, str | None]]:
    normalized_email = email.strip().lower()
    matches: list[TenantUserMembership] = []

    if google_sub:
        matches = list(
            (
                await session.execute(
                    select(TenantUserMembership).where(
                        TenantUserMembership.provider_subject == google_sub,
                        TenantUserMembership.status == "active",
                    )
                )
            ).scalars()
        )

    if not matches and normalized_email:
        matches = list(
            (
                await session.execute(
                    select(TenantUserMembership).where(
                        TenantUserMembership.email == normalized_email,
                        TenantUserMembership.status == "active",
                    )
                )
            ).scalars()
        )

    deduped: dict[str, dict[str, str | None]] = {}
    for membership in matches:
        tenant_id = str(membership.tenant_id or "").strip()
        if not tenant_id or tenant_id in deduped:
            continue
        deduped[tenant_id] = {
            "tenant_id": tenant_id,
            "tenant_slug": membership.tenant_slug,
            "email": membership.email,
            "role": membership.role,
            "status": membership.status,
        }

    return list(deduped.values())


async def _load_tenant_credential(
    session,
    *,
    username: str,
) -> TenantUserCredential | None:
    return (
        await session.execute(
            select(TenantUserCredential).where(
                TenantUserCredential.username == username.strip().lower(),
                TenantUserCredential.status == "active",
            )
        )
    ).scalar_one_or_none()


async def _load_tenant_credential_by_email(
    session,
    *,
    tenant_id: str,
    email: str,
) -> TenantUserCredential | None:
    return (
        await session.execute(
            select(TenantUserCredential).where(
                TenantUserCredential.tenant_id == tenant_id,
                TenantUserCredential.email == email.strip().lower(),
                TenantUserCredential.status == "active",
            )
        )
    ).scalar_one_or_none()


def _normalize_tenant_email_auth_intent(value: str | None, *, default: str = "sign-in") -> str:
    normalized = str(value or default).strip().lower()
    if normalized not in {"sign-in", "create", "claim"}:
        raise ValidationAppError(
            "tenant_email_code_invalid_intent",
            "Tenant email-code auth intent must be sign-in, create, or claim.",
        )
    return normalized


def _generate_tenant_email_login_code() -> str:
    return str(uuid4().int)[-6:]


def _hash_tenant_email_login_code(*, email: str, code: str) -> str:
    normalized_email = email.strip().lower()
    normalized_code = re.sub(r"\D+", "", str(code or "").strip())
    return hashlib.sha256(f"{normalized_email}:{normalized_code}".encode("utf-8")).hexdigest()


async def _clear_active_tenant_email_login_codes(
    session,
    *,
    email: str,
    auth_intent: str,
    tenant_id: str | None = None,
) -> None:
    normalized_email = email.strip().lower()
    rows = list(
        (
            await session.execute(
                select(TenantEmailLoginCode).where(
                    TenantEmailLoginCode.email == normalized_email,
                    TenantEmailLoginCode.auth_intent == auth_intent,
                    TenantEmailLoginCode.consumed_at.is_(None),
                )
            )
        ).scalars()
    )
    for row in rows:
        if tenant_id and str(row.tenant_id or "").strip() not in {"", tenant_id}:
            continue
        row.consumed_at = datetime.now(UTC)


async def _store_tenant_email_login_code(
    session,
    *,
    email: str,
    auth_intent: str,
    tenant_id: str | None = None,
    tenant_slug: str | None = None,
    metadata: dict[str, Any] | None = None,
) -> tuple[TenantEmailLoginCode, str]:
    code = _generate_tenant_email_login_code()
    expires_at = datetime.now(UTC) + timedelta(minutes=TENANT_EMAIL_CODE_TTL_MINUTES)
    await _clear_active_tenant_email_login_codes(
        session,
        email=email,
        auth_intent=auth_intent,
        tenant_id=tenant_id,
    )
    row = TenantEmailLoginCode(
        tenant_id=tenant_id,
        tenant_slug=tenant_slug,
        email=email.strip().lower(),
        auth_intent=auth_intent,
        code_hash=_hash_tenant_email_login_code(email=email, code=code),
        code_last4=code[-4:],
        metadata_json=metadata or {},
        expires_at=expires_at,
    )
    session.add(row)
    await session.flush()
    return row, code


async def _load_valid_tenant_email_login_code(
    session,
    *,
    email: str,
    auth_intent: str,
    code: str,
    tenant_id: str | None = None,
) -> TenantEmailLoginCode | None:
    normalized_email = email.strip().lower()
    code_hash = _hash_tenant_email_login_code(email=normalized_email, code=code)
    rows = list(
        (
            await session.execute(
                select(TenantEmailLoginCode).where(
                    TenantEmailLoginCode.email == normalized_email,
                    TenantEmailLoginCode.auth_intent == auth_intent,
                    TenantEmailLoginCode.code_hash == code_hash,
                    TenantEmailLoginCode.consumed_at.is_(None),
                )
            )
        ).scalars()
    )
    current_time = datetime.now(UTC)
    for row in rows:
        if tenant_id and str(row.tenant_id or "").strip() not in {"", tenant_id}:
            continue
        expires_at = row.expires_at
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=UTC)
        if expires_at < current_time:
            row.consumed_at = current_time
            continue
        return row
    return None


def _build_tenant_email_code_payload(
    request: Request,
    *,
    email: str,
    code: str,
    auth_intent: str,
    tenant_name: str | None,
    tenant_slug: str | None,
) -> dict[str, str]:
    workspace_url = (
        _tenant_portal_workspace_url(request, tenant_slug=tenant_slug)
        if tenant_slug
        else "https://tenant.bookedai.au/"
    )
    subject = "Your BookedAI tenant sign-in code"
    intent_label = {
        "sign-in": "sign in to your tenant workspace",
        "create": "finish creating your tenant workspace",
        "claim": "accept your tenant invite",
    }.get(auth_intent, "continue to your tenant workspace")
    tenant_label = tenant_name or tenant_slug or "BookedAI"
    text = (
        f"Hello,\n\nUse this BookedAI verification code to {intent_label}:\n\n"
        f"{code}\n\n"
        f"This code expires in {TENANT_EMAIL_CODE_TTL_MINUTES} minutes.\n"
        f"Workspace: {tenant_label}\n"
        f"Open tenant portal: {workspace_url}\n"
    )
    html = (
        "<div style=\"font-family:Arial,sans-serif;color:#0f172a;line-height:1.6\">"
        "<p>Hello,</p>"
        f"<p>Use this BookedAI verification code to {escape(intent_label)}.</p>"
        f"<p style=\"font-size:32px;font-weight:700;letter-spacing:0.18em;margin:20px 0\">{escape(code)}</p>"
        f"<p>This code expires in {TENANT_EMAIL_CODE_TTL_MINUTES} minutes.</p>"
        f"<p style=\"font-size:13px;color:#475569\">Workspace: {escape(tenant_label)}<br>"
        f"Open tenant portal: <a href=\"{escape(workspace_url)}\">{escape(workspace_url)}</a></p>"
        "</div>"
    )
    return {
        "subject": subject,
        "text": text,
        "html": html,
        "workspace_url": workspace_url,
    }


async def _deliver_tenant_email_login_code(
    request: Request,
    *,
    email: str,
    code: str,
    auth_intent: str,
    tenant_name: str | None,
    tenant_slug: str | None,
) -> dict[str, str | bool]:
    payload = _build_tenant_email_code_payload(
        request,
        email=email,
        code=code,
        auth_intent=auth_intent,
        tenant_name=tenant_name,
        tenant_slug=tenant_slug,
    )
    email_service: EmailService = request.app.state.email_service
    smtp_configured = email_service.smtp_configured()
    delivery_status = "queued"
    operator_note = "SMTP is not fully configured; share the tenant login code manually."
    if smtp_configured:
        await email_service.send_email(
            to=[email],
            subject=payload["subject"],
            text=payload["text"],
            html=payload["html"],
        )
        delivery_status = "sent"
        operator_note = "Tenant login code sent by email."
    return {
        "status": delivery_status,
        "operator_note": operator_note,
        "smtp_configured": smtp_configured,
        "workspace_url": payload["workspace_url"],
        "email_hint": email.strip().lower(),
        "code_last4": code[-4:],
        "expires_in_minutes": TENANT_EMAIL_CODE_TTL_MINUTES,
    }


def _normalize_tenant_slug_candidate(value: str) -> str:
    return _slugify_value(value)[:80]


def _tenant_auth_capabilities() -> list[str]:
    return [
        "tenant_overview",
        "tenant_catalog_import",
        "tenant_catalog_review",
        "tenant_catalog_publish",
        "tenant_billing_read",
        "tenant_onboarding_read",
    ]


async def _create_or_update_tenant_credential(
    session,
    *,
    tenant_profile: dict[str, str | None],
    email: str,
    username: str,
    password: str,
    role: str = "tenant_admin",
) -> TenantUserCredential:
    normalized_email = email.strip().lower()
    normalized_username = username.strip().lower()
    existing = await _load_tenant_credential(session, username=normalized_username)
    if existing and str(existing.tenant_id or "").strip() != str(tenant_profile.get("id") or "").strip():
        raise ValidationAppError(
            "tenant_auth_username_taken",
            "That username is already assigned to another tenant account.",
        )

    credential = existing or await _load_tenant_credential_by_email(
        session,
        tenant_id=str(tenant_profile.get("id") or ""),
        email=normalized_email,
    )
    salt = f"{normalized_username}-static-salt"
    password_hash = _hash_tenant_password(password=password, salt=salt)

    if credential:
        credential.tenant_slug = str(tenant_profile.get("slug") or credential.tenant_slug or "")
        credential.email = normalized_email
        credential.username = normalized_username
        credential.password_salt = salt
        credential.password_hash = password_hash
        credential.role = role or credential.role or "tenant_admin"
        credential.status = "active"
    else:
        credential = TenantUserCredential(
            tenant_id=str(tenant_profile.get("id") or ""),
            tenant_slug=str(tenant_profile.get("slug") or ""),
            email=normalized_email,
            username=normalized_username,
            password_salt=salt,
            password_hash=password_hash,
            role=role,
            status="active",
        )
        session.add(credential)

    await session.flush()
    return credential


async def _count_claimable_services(
    session,
    *,
    tenant_profile: dict[str, str | None],
    email: str,
) -> int:
    normalized_email = email.strip().lower()
    tenant_id = str(tenant_profile.get("id") or "").strip()
    tenant_slug = str(tenant_profile.get("slug") or "").strip().lower()
    tenant_name = str(tenant_profile.get("name") or "").strip().lower()
    claim_filters = [
        ServiceMerchantProfile.tenant_id == tenant_id,
        ServiceMerchantProfile.owner_email == normalized_email,
        ServiceMerchantProfile.business_email == normalized_email,
    ]
    if tenant_name:
        claim_filters.append(ServiceMerchantProfile.business_name.ilike(f"%{tenant_name}%"))
    if tenant_slug:
        claim_filters.append(ServiceMerchantProfile.source_url.ilike(f"%{tenant_slug}%"))
    result = await session.execute(
        select(ServiceMerchantProfile).where(or_(*claim_filters))
    )
    return len(result.scalars().all())


async def _build_tenant_auth_response(
    cfg: Settings,
    *,
    tenant_id: str,
    tenant_profile: dict[str, str | None],
    email: str,
    name: str | None,
    picture_url: str | None,
    provider: str,
    role: str,
    membership: dict[str, str | None] | None,
    google_sub: str | None = None,
) -> tuple[dict[str, Any], ActorContextPayload]:
    session_token, expires_at = _create_tenant_session_token(
        cfg,
        email=email,
        tenant_ref=str(tenant_profile.get("slug") or tenant_id),
        name=name,
        picture_url=picture_url,
        google_sub=google_sub,
    )
    actor_context = ActorContextPayload(
        channel="tenant_app",
        tenant_id=tenant_id,
        role=role or "tenant_admin",
        deployment_mode="standalone_app",
    )
    response = {
        "session_token": session_token,
        "expires_at": expires_at.isoformat(),
        "provider": provider,
        "user": {
            "email": email,
            "full_name": name,
            "picture_url": picture_url,
        },
        "tenant": tenant_profile,
        "capabilities": _tenant_auth_capabilities(),
        "membership": membership,
    }
    return response, actor_context


def _can_claim_tenant_service(
    service: ServiceMerchantProfile,
    *,
    tenant_profile: dict[str, str | None],
    tenant_user_email: str | None,
) -> bool:
    tenant_id = str(tenant_profile.get("id") or "").strip()
    service_tenant_id = str(getattr(service, "tenant_id", "") or "").strip()
    if tenant_id and service_tenant_id and tenant_id == service_tenant_id:
        return True

    normalized_email = str(tenant_user_email or "").strip().lower()
    owner_email = str(getattr(service, "owner_email", "") or "").strip().lower()
    if normalized_email and owner_email and normalized_email == owner_email:
        return True

    business_email = str(getattr(service, "business_email", "") or "").strip().lower()
    if normalized_email and business_email and normalized_email == business_email:
        return True

    tenant_name = str(tenant_profile.get("name") or "").strip().lower()
    business_name = str(getattr(service, "business_name", "") or "").strip().lower()
    if tenant_name and business_name and (tenant_name == business_name or tenant_name in business_name):
        return True

    tenant_slug = str(tenant_profile.get("slug") or "").strip().lower()
    source_url = str(getattr(service, "source_url", "") or "").strip().lower()
    return bool(tenant_slug and source_url and tenant_slug in source_url)


def _claim_tenant_service(
    service: ServiceMerchantProfile,
    *,
    tenant_id: str,
    tenant_user_email: str,
) -> None:
    service.tenant_id = tenant_id
    service.owner_email = tenant_user_email.strip().lower()


async def _resolve_tenant_catalog_service(
    session,
    *,
    tenant_profile: dict[str, str | None],
    service_id: str,
    tenant_user_email: str,
) -> ServiceMerchantProfile:
    service = (
        await session.execute(
            select(ServiceMerchantProfile).where(ServiceMerchantProfile.service_id == service_id)
        )
    ).scalar_one_or_none()
    if not service:
        raise AppError(
            code="tenant_catalog_service_not_found",
            message="The requested tenant catalog service could not be found.",
            status_code=404,
            details={"service_id": service_id},
        )

    if not _can_claim_tenant_service(
        service,
        tenant_profile=tenant_profile,
        tenant_user_email=tenant_user_email,
    ):
        raise AppError(
            code="tenant_catalog_service_forbidden",
            message="This catalog service does not belong to the authenticated tenant.",
            status_code=403,
            details={"service_id": service_id},
        )

    _claim_tenant_service(
        service,
        tenant_id=str(tenant_profile.get("id") or ""),
        tenant_user_email=tenant_user_email,
    )
    return service


async def _resolve_tenant_id(request: Request, actor_context: ActorContextPayload | None) -> str | None:
    if actor_context and actor_context.tenant_id:
        return actor_context.tenant_id

    tenant_ref = str(actor_context.tenant_ref or "").strip() if actor_context else ""
    if tenant_ref:
        async with get_session(request.app.state.session_factory) as session:
            tenant_id = await TenantRepository(RepositoryContext(session=session)).resolve_tenant_id(tenant_ref)
            if tenant_id:
                return tenant_id

    async with get_session(request.app.state.session_factory) as session:
        return await TenantRepository(RepositoryContext(session=session)).get_default_tenant_id()


async def _record_phase2_write_activity(
    session,
    *,
    tenant_id: str | None,
    actor_context: ActorContextPayload | None,
    audit_event_type: str,
    entity_type: str,
    entity_id: str | None,
    audit_payload: dict[str, Any] | None = None,
    outbox_event_type: str | None = None,
    outbox_payload: dict[str, Any] | None = None,
    idempotency_key: str | None = None,
) -> None:
    try:
        audit_repository = AuditLogRepository(RepositoryContext(session=session, tenant_id=tenant_id))
        await audit_repository.append_entry(
            tenant_id=tenant_id,
            event_type=audit_event_type,
            entity_type=entity_type,
            entity_id=entity_id,
            actor_type=actor_context.channel if actor_context else None,
            actor_id=actor_context.actor_id if actor_context else None,
            payload=audit_payload or {},
        )

        if outbox_event_type:
            outbox_repository = OutboxRepository(RepositoryContext(session=session, tenant_id=tenant_id))
            await outbox_repository.enqueue_event(
                tenant_id=tenant_id,
                event_type=outbox_event_type,
                aggregate_type=entity_type,
                aggregate_id=entity_id,
                payload=outbox_payload or audit_payload or {},
                idempotency_key=idempotency_key,
            )
    except Exception as exc:
        logger.warning(
            "phase2_write_foundation_record_failed",
            extra={
                "event_type": audit_event_type,
                "tenant_id": tenant_id,
                "status": 0,
                "route": "",
                "request_id": "",
                "integration_name": "phase2_repository_foundations",
                "conversation_id": "",
                "booking_reference": (audit_payload or {}).get("booking_reference", ""),
                "job_name": "",
                "job_id": "",
            },
            exc_info=exc,
        )


def _success_response(
    data: Any,
    *,
    tenant_id: str | None = None,
    actor_context: ActorContextPayload | None = None,
    message: str | None = None,
) -> Any:
    return build_success_envelope(
        data=data,
        message=message,
        tenant_id=tenant_id,
        actor_type=actor_context.channel if actor_context else None,
        actor_id=actor_context.actor_id if actor_context else None,
    )


def _error_response(
    error: AppError,
    *,
    tenant_id: str | None = None,
    actor_context: ActorContextPayload | None = None,
) -> JSONResponse:
    return JSONResponse(
        status_code=error.status_code,
        content=build_error_envelope(
            error,
            tenant_id=tenant_id,
            actor_type=actor_context.channel if actor_context else None,
            actor_id=actor_context.actor_id if actor_context else None,
        ).model_dump(mode="json"),
    )


def _build_capabilities(channel: str, deployment_mode: str | None) -> list[str]:
    capabilities = ["matching_search", "booking_path_resolution", "booking_intent_capture"]
    if channel in {"public_web", "embedded_widget"}:
        capabilities.append("assistant_guidance")
    if deployment_mode in {"standalone_app", "embedded_widget"}:
        capabilities.append("payment_collection")
    return capabilities


def _tenant_portal_workspace_url(
    request: Request,
    *,
    tenant_slug: str,
    auth_mode: str | None = None,
    invite_email: str | None = None,
    invite_role: str | None = None,
    invite_name: str | None = None,
) -> str:
    settings = getattr(request.app.state, "settings", None)
    public_app_url = str(getattr(settings, "public_app_url", "") or "").strip().rstrip("/")
    use_local_path = "localhost" in public_app_url or "127.0.0.1" in public_app_url
    if use_local_path:
        base = f"{public_app_url}/tenant/{quote(tenant_slug.strip())}"
    else:
        base = f"https://tenant.bookedai.au/{quote(tenant_slug.strip())}"

    params: dict[str, str] = {}
    if auth_mode:
        params["auth"] = auth_mode.strip().lower()
    if invite_email:
        params["invite_email"] = invite_email.strip().lower()
    if invite_role:
        params["invite_role"] = invite_role.strip().lower()
    if invite_name:
        normalized_name = invite_name.strip()
        if normalized_name:
            params["invite_name"] = normalized_name

    if not params:
        return base
    return f"{base}?{urlencode(params)}"


def _build_tenant_invite_email_payload(
    request: Request,
    *,
    tenant_name: str,
    tenant_slug: str,
    invitee_email: str,
    invitee_full_name: str | None,
    role: str,
    invited_by_name: str | None,
    invited_by_email: str,
) -> dict[str, str]:
    invite_url = _tenant_portal_workspace_url(
        request,
        tenant_slug=tenant_slug,
        auth_mode="claim",
        invite_email=invitee_email,
        invite_role=role,
        invite_name=invitee_full_name,
    )
    role_label = role.replace("_", " ").title()
    inviter_label = invited_by_name.strip() if invited_by_name and invited_by_name.strip() else invited_by_email
    invitee_label = invitee_full_name.strip() if invitee_full_name and invitee_full_name.strip() else invitee_email
    subject = f"You have been invited to {tenant_name} on BookedAI"
    text = (
        f"Hello {invitee_label},\n\n"
        f"{inviter_label} invited you to join {tenant_name} on BookedAI as {role_label}.\n\n"
        "Use the tenant portal link below to accept the invite, set your tenant password, and open your workspace:\n"
        f"{invite_url}\n\n"
        "This tenant portal is the single place for sign-in, data input, reporting, and billing operations.\n"
    )
    html = (
        "<div style=\"font-family:Arial,sans-serif;color:#0f172a;line-height:1.6\">"
        f"<p>Hello {escape(invitee_label)},</p>"
        f"<p><strong>{escape(inviter_label)}</strong> invited you to join "
        f"<strong>{escape(tenant_name)}</strong> on BookedAI as <strong>{escape(role_label)}</strong>.</p>"
        "<p>Use the tenant portal link below to accept the invite, set your tenant password, "
        "and open your workspace.</p>"
        f"<p><a href=\"{escape(invite_url)}\" "
        "style=\"display:inline-block;padding:10px 18px;border-radius:999px;background:#0f172a;color:#ffffff;text-decoration:none;font-weight:600\">"
        "Open tenant portal</a></p>"
        f"<p style=\"font-size:13px;color:#475569\">If the button does not open, use this link:<br>{escape(invite_url)}</p>"
        "</div>"
    )
    return {
        "subject": subject,
        "text": text,
        "html": html,
        "invite_url": invite_url,
    }


def _tenant_period_id_from_invoice_id(invoice_id: str) -> str | None:
    normalized = str(invoice_id or "").strip()
    if not normalized.startswith("inv-"):
        return None
    period_id = normalized.removeprefix("inv-").strip()
    return period_id or None


async def _deliver_tenant_invite_email(
    request: Request,
    *,
    tenant_name: str,
    tenant_slug: str,
    invitee_email: str,
    invitee_full_name: str | None,
    role: str,
    invited_by_name: str | None,
    invited_by_email: str,
) -> dict[str, str | bool]:
    invite_email_payload = _build_tenant_invite_email_payload(
        request,
        tenant_name=tenant_name,
        tenant_slug=tenant_slug,
        invitee_email=invitee_email,
        invitee_full_name=invitee_full_name,
        role=role,
        invited_by_name=invited_by_name,
        invited_by_email=invited_by_email,
    )
    email_service: EmailService = request.app.state.email_service
    smtp_configured = email_service.smtp_configured()
    invite_delivery_status = "queued"
    invite_delivery_note = "SMTP is not fully configured; share the tenant portal invite link manually."
    if smtp_configured:
        await email_service.send_email(
            to=[invitee_email],
            subject=invite_email_payload["subject"],
            text=invite_email_payload["text"],
            html=invite_email_payload["html"],
        )
        invite_delivery_status = "sent"
        invite_delivery_note = "Invite email sent from the tenant portal."
    return {
        "status": invite_delivery_status,
        "operator_note": invite_delivery_note,
        "smtp_configured": smtp_configured,
        "invite_url": invite_email_payload["invite_url"],
    }


def _normalize_booking_path(service: ServiceMerchantProfile | None) -> str:
    if service and service.booking_url:
        return "book_on_partner_site"
    return "request_callback"


def _search_terms(
    query: str | None,
    location_hint: str | None = None,
    requested_category: str | None = None,
) -> list[str]:
    stopwords = GENERIC_QUERY_STOPWORDS | {
        "aud",
        "best",
        "good",
        "over",
        "price",
        "pricing",
        "request",
        "service",
        "services",
    }
    terms: list[str] = []

    def _append_terms(value: str | None, *, expand_topics: bool) -> None:
        normalized = _normalized_text(value)
        ordered_raw_terms: list[str] = []
        for term in normalized.split():
            if len(term) < 2 or term.isdigit() or term in stopwords or term in ordered_raw_terms:
                continue
            ordered_raw_terms.append(term)

        if expand_topics:
            candidate_terms = expand_topic_terms(set(ordered_raw_terms), query=value)
        else:
            candidate_terms = expand_location_terms(set(ordered_raw_terms), text=value)

        ordered_candidate_terms = ordered_raw_terms + sorted(candidate_terms - set(ordered_raw_terms))
        for term in ordered_candidate_terms:
            if term not in terms:
                terms.append(term)

    _append_terms(query, expand_topics=True)
    _append_terms(requested_category, expand_topics=True)
    _append_terms(location_hint, expand_topics=False)
    return terms[:10]


def _build_search_clauses(terms: list[str], *, fields: tuple[Any, ...]) -> list[Any]:
    clauses: list[Any] = []
    for term in terms:
        query_text = f"%{term}%"
        clauses.extend(field.ilike(query_text) for field in fields)
    return clauses


TOPIC_SEARCH_FIELDS = (
    ServiceMerchantProfile.name,
    ServiceMerchantProfile.business_name,
    ServiceMerchantProfile.category,
    ServiceMerchantProfile.summary,
    cast(ServiceMerchantProfile.tags_json, String),
)

LOCATION_SEARCH_FIELDS = (
    ServiceMerchantProfile.location,
    ServiceMerchantProfile.venue_name,
    cast(ServiceMerchantProfile.tags_json, String),
)

FALLBACK_SEARCH_FIELDS = (
    *TOPIC_SEARCH_FIELDS,
    ServiceMerchantProfile.location,
    ServiceMerchantProfile.venue_name,
)


def _topic_search_terms(
    query: str | None,
    requested_category: str | None = None,
    *,
    location_hint: str | None = None,
) -> list[str]:
    terms = _search_terms(query, None, requested_category)
    location_terms = set(_search_terms(None, location_hint, None))
    return [term for term in terms if term not in location_terms]


def _raw_query_intent_terms(
    query: str | None,
    *,
    location_hint: str | None = None,
) -> list[str]:
    terms = list(
        build_canonical_query_understanding(
            query,
            location_hint=location_hint,
        ).core_intent_terms
    )
    if {"support", "worker"} <= set(terms):
        terms = [term for term in terms if term not in {"home", "community"}]
    return terms


def _query_intent_constraint_groups(query: str | None) -> list[list[str]]:
    normalized_query = _normalized_text(query)
    if not normalized_query:
        return []

    groups: list[list[str]] = []
    if any(
        phrase in normalized_query
        for phrase in ("support worker", "ndis support", "in home support", "at home support")
    ):
        groups.extend(
            [
                ["support", "worker"],
                ["ndis", "disability", "community"],
            ]
        )
    if "private dining" in normalized_query:
        groups.extend(
            [
                ["private", "group"],
                ["dining", "restaurant", "table"],
            ]
        )
    elif any(
        phrase in normalized_query
        for phrase in ("restaurant table", "table booking", "team dinner", "group dinner")
    ):
        groups.extend(
            [
                ["restaurant", "dining", "table"],
                ["table", "booking", "reservation", "private", "group", "dinner", "lunch"],
            ]
        )
    return groups


def _location_search_terms(location_hint: str | None) -> list[str]:
    return _search_terms(None, location_hint, None)


def _normalized_domain_terms(value: str | None) -> set[str]:
    return {
        term
        for term in _normalized_text(value).split()
        if term and term not in SEMANTIC_DOMAIN_STOP_WORDS and not term.isdigit()
    }


def _build_semantic_domain_terms(
    query: str | None,
    inferred_category: str | None,
    location_hint: str | None,
) -> set[str]:
    query_terms = _normalized_domain_terms(query)
    core_terms = set(extract_core_intent_terms(query, location_hint=location_hint, limit=6))
    category_terms = _normalized_domain_terms(inferred_category)
    location_terms = set(_search_terms(None, location_hint, None))
    domain_terms = expand_topic_terms(query_terms | core_terms | category_terms, query=query)
    return {term for term in domain_terms if term not in location_terms}


def _build_service_domain_terms(service: ServiceMerchantProfile) -> set[str]:
    fields = [
        getattr(service, "name", None),
        getattr(service, "business_name", None),
        getattr(service, "summary", None),
        getattr(service, "category", None),
        getattr(service, "venue_name", None),
    ]
    terms: set[str] = set()
    for value in fields:
        terms |= _normalized_domain_terms(str(value) if value is not None else None)
    for tag in getattr(service, "tags_json", None) or []:
        terms |= _normalized_domain_terms(str(tag))
    return expand_topic_terms(terms)


def _filter_ranked_matches_for_semantic_domain(
    ranked_matches: list[Any],
    *,
    query: str,
    inferred_category: str | None,
    location_hint: str | None,
) -> list[Any]:
    domain_terms = _build_semantic_domain_terms(query, inferred_category, location_hint)
    if not domain_terms:
        return ranked_matches

    query_terms = _normalized_domain_terms(query)
    filtered: list[Any] = []
    for match in ranked_matches:
        evidence = set(getattr(match, "evidence", ()) or ())
        if "topic_mismatch" in evidence:
            continue

        service_terms = _build_service_domain_terms(match.service)
        if domain_terms & service_terms:
            filtered.append(match)
            continue

        # Keep strong direct-name matches even when catalog metadata is sparse.
        if evidence & {"exact_name_phrase", "all_terms_in_name"}:
            filtered.append(match)
            continue

        service_name_terms = _normalized_domain_terms(getattr(match.service, "name", None))
        if query_terms and query_terms <= service_name_terms:
            filtered.append(match)
            continue

        semantic_score = getattr(match, "semantic_score", None)
        if semantic_score is not None and semantic_score >= 0.82 and "intent_mismatch" not in evidence:
            filtered.append(match)

    return filtered


def _candidate_ids_from_matches(ranked_matches: list[Any], *, limit: int = 8) -> list[str]:
    candidate_ids: list[str] = []
    for match in ranked_matches[:limit]:
        candidate_id = str(getattr(getattr(match, "service", None), "service_id", "") or "").strip()
        if candidate_id:
            candidate_ids.append(candidate_id)
    return candidate_ids


def _candidate_drop_entries(
    before_matches: list[Any],
    after_matches: list[Any],
    *,
    stage: str,
    reason: str,
    limit: int = 8,
) -> list[dict[str, str]]:
    after_ids = set(_candidate_ids_from_matches(after_matches, limit=limit))
    entries: list[dict[str, str]] = []
    for candidate_id in _candidate_ids_from_matches(before_matches, limit=limit):
        if candidate_id not in after_ids:
            entries.append(
                {
                    "candidate_id": candidate_id,
                    "stage": stage,
                    "reason": reason,
                }
            )
    return entries


def _build_search_filters(
    query: str | None,
    location_hint: str | None = None,
    requested_category: str | None = None,
) -> list[Any]:
    filters: list[Any] = []
    topic_terms = _topic_search_terms(
        query,
        requested_category,
        location_hint=location_hint,
    )
    raw_query_terms = _raw_query_intent_terms(
        query,
        location_hint=location_hint,
    )
    intent_constraint_groups = _query_intent_constraint_groups(query)
    location_terms = _location_search_terms(location_hint)
    fallback_terms = _search_terms(query, location_hint, requested_category)

    if topic_terms:
        topic_clauses = _build_search_clauses(topic_terms, fields=TOPIC_SEARCH_FIELDS)
        if topic_clauses:
            filters.append(or_(*topic_clauses))
        raw_query_clauses = _build_search_clauses(raw_query_terms, fields=TOPIC_SEARCH_FIELDS)
        if raw_query_clauses:
            filters.append(or_(*raw_query_clauses))
    elif fallback_terms:
        fallback_clauses = _build_search_clauses(fallback_terms, fields=FALLBACK_SEARCH_FIELDS)
        if fallback_clauses:
            filters.append(or_(*fallback_clauses))

    for group in intent_constraint_groups:
        group_clauses = _build_search_clauses(group, fields=TOPIC_SEARCH_FIELDS)
        if group_clauses:
            filters.append(or_(*group_clauses))

    if location_terms:
        location_clauses = _build_search_clauses(location_terms, fields=LOCATION_SEARCH_FIELDS)
        if location_clauses:
            online_ready_clauses = _build_search_clauses(
                ["online", "virtual", "remote", "telehealth"],
                fields=(cast(ServiceMerchantProfile.tags_json, String),),
            )
            filters.append(or_(*location_clauses, *online_ready_clauses))

    return filters


def _build_match_confidence_payload(ranked_matches: list[Any]) -> dict[str, Any]:
    if not ranked_matches:
        return {
            "score": 0.18,
            "reason": "No strong catalog candidate was found for this query.",
            "gating_state": "low",
            "evidence": [],
        }

    top_match = ranked_matches[0]
    if top_match.score >= 0.8:
        gating_state = "high"
    elif top_match.score >= 0.45:
        gating_state = "medium"
    else:
        gating_state = "low"

    return {
        "score": top_match.score,
        "reason": top_match.explanation,
        "gating_state": gating_state,
        "evidence": list(dict.fromkeys([*top_match.evidence, *(["semantic_model_rerank"] if top_match.semantic_score is not None else [])])),
    }


def _should_force_restaurant_live_search_only(
    *,
    query: str,
    preferences: dict[str, Any] | None,
    query_understanding: Any,
    booking_request_context: Any,
    strict_catalog_only: bool,
) -> bool:
    if strict_catalog_only:
        return False

    normalized_query = " ".join(str(query or "").strip().lower().split())
    requested_category = str((preferences or {}).get("service_category") or "").strip().lower()
    understanding_category = str(
        getattr(query_understanding, "requested_category", None) or ""
    ).strip().lower()
    intent_label = str(getattr(booking_request_context, "intent_label", None) or "").strip().lower()

    if requested_category in {"restaurant", "food and beverage", "hospitality and events"}:
        return True
    if understanding_category in {"restaurant", "food and beverage", "hospitality and events"}:
        return True
    if intent_label in {"restaurant_booking", "table_booking"}:
        return True

    if any(term in normalized_query for term in RESTAURANT_LIVE_SEARCH_TERMS):
        return True

    topical_terms = {
        str(term or "").strip().lower()
        for term in (
            list(getattr(query_understanding, "core_intent_terms", ()) or ())
            + list(getattr(query_understanding, "expanded_intent_terms", ()) or ())
        )
        if str(term or "").strip()
    }
    return bool(topical_terms & {"restaurant", "dining", "table", "reservation", "food", "brunch", "dinner", "lunch"})


def _build_candidate_source_label(*, source_type: str, trust_signal: str | None = None) -> str:
    if source_type == "public_web_search":
        return "Sourced from the public web"
    if trust_signal == "partner_verified":
        return "Verified tenant partner"
    if trust_signal == "partner_routed":
        return "Tenant partner booking path"
    if trust_signal == "featured_catalog":
        return "Featured tenant catalog"
    return "Tenant catalog match"


def _build_price_posture(
    *,
    display_price: str | None,
    amount_aud: float | None,
) -> str | None:
    normalized_display_price = str(display_price or "").strip() or None
    if normalized_display_price:
        return normalized_display_price
    if amount_aud is not None:
        return f"From AUD {int(amount_aud) if float(amount_aud).is_integer() else amount_aud}"
    return "Price to confirm during booking"


def _build_catalog_recommendations(
    ranked_matches: list[RankedServiceMatch],
    *,
    limit: int,
    booking_request_context: Any,
) -> tuple[list[dict[str, Any]], dict[str, dict[str, Any]]]:
    recommendations: list[dict[str, Any]] = []
    detail_by_candidate_id: dict[str, dict[str, Any]] = {}
    for match in ranked_matches[:limit]:
        availability_state, _verified, recommended_path, trust_warnings, _payment_allowed_now, booking_confidence = (
            build_booking_trust_payload(
                match.service,
                party_size=booking_request_context.party_size,
                desired_date=booking_request_context.requested_date,
                desired_time=booking_request_context.requested_time or booking_request_context.schedule_hint,
            )
        )
        top_path, next_step, path_warnings, _payment_allowed = resolve_booking_path_policy(
            availability_state=availability_state,
            booking_confidence=booking_confidence,
            payment_option=None,
            context={
                "party_size": booking_request_context.party_size,
            },
        )
        recommendations.append(
            {
                "candidate_id": str(getattr(match.service, "service_id", "") or ""),
                "reason": match.explanation,
                "path_type": recommended_path or top_path,
                "next_step": next_step,
                "warnings": list(dict.fromkeys([*trust_warnings, *path_warnings])),
            }
        )
        candidate_id = str(getattr(match.service, "service_id", "") or "")
        detail_by_candidate_id[candidate_id] = {
            "availability_state": availability_state,
            "booking_confidence": booking_confidence,
            "booking_path_type": recommended_path or top_path,
            "next_step": next_step,
            "why_this_matches": match.explanation,
        }
    return recommendations, detail_by_candidate_id


def _candidate_ids_from_payload(candidates: list[dict[str, Any]], *, limit: int = 8) -> list[str]:
    candidate_ids: list[str] = []
    for candidate in candidates[:limit]:
        candidate_id = str(candidate.get("candidate_id") or candidate.get("candidateId") or "").strip()
        if candidate_id:
            candidate_ids.append(candidate_id)
    return candidate_ids


def _build_public_web_fallback_candidates(web_results: list[dict[str, Any]]) -> list[dict[str, Any]]:
    normalized_candidates: list[dict[str, Any]] = []
    seen_keys: set[str] = set()
    for item in web_results:
        candidate_id = str(item.get("candidate_id") or "").strip()
        provider_name = str(item.get("provider_name") or "").strip()
        service_name = str(item.get("service_name") or "").strip()
        source_url = str(item.get("source_url") or "").strip()
        booking_url = str(item.get("booking_url") or "").strip() or None
        contact_phone = str(item.get("contact_phone") or "").strip() or None
        if not candidate_id or not provider_name or not service_name or not source_url:
            continue

        dedupe_key = f"{candidate_id}|{source_url}"
        if dedupe_key in seen_keys:
            continue
        seen_keys.add(dedupe_key)

        explanation = (
            str(item.get("why_this_matches") or "").strip()
            or "Public web search fallback matched the request when tenant catalog did not have a strong result."
        )
        normalized_candidates.append(
            {
                "candidate_id": candidate_id,
                "provider_name": provider_name,
                "service_name": service_name,
                "source_type": "public_web_search",
                "category": None,
                "summary": item.get("summary"),
                "venue_name": provider_name,
                "location": item.get("location"),
                "booking_url": booking_url,
                "contact_phone": contact_phone,
                "map_url": None,
                "source_url": source_url,
                "image_url": None,
                "amount_aud": None,
                "currency_code": None,
                "display_price": None,
                "duration_minutes": None,
                "tags": ["public_web_search"],
                "featured": False,
                "distance_km": None,
                "match_score": item.get("match_score"),
                "semantic_score": None,
                "trust_signal": "public_web_search",
                "is_preferred": False,
                "display_summary": item.get("summary"),
                "explanation": explanation,
                "why_this_matches": explanation,
                "source_label": _build_candidate_source_label(source_type="public_web_search"),
                "price_posture": "Check provider site for final pricing",
                "booking_path_type": (
                    "book_on_partner_site"
                    if booking_url
                    else "call_provider" if contact_phone else "request_callback"
                ),
                "next_step": (
                    "Open the provider booking page to confirm details."
                    if booking_url
                    else "Call the venue directly to confirm the table booking."
                    if contact_phone
                    else "Open the provider website and review the service details."
                ),
                "availability_state": "availability_unknown",
                "booking_confidence": "medium",
            }
        )
        if len(normalized_candidates) >= 3:
            break
    return normalized_candidates


@router.post("/leads")
async def create_lead(request: Request, payload: CreateLeadRequestPayload):
    tenant_id = await _resolve_tenant_id(request, payload.actor_context)
    try:
        normalized_email = (payload.contact.email or "").strip().lower() or None
        normalized_phone = (payload.contact.phone or "").strip() or None
        if not normalized_email and not normalized_phone:
            raise ValidationAppError(
                "Lead intake requires at least one contact method.",
                details={"contact": ["email or phone is required"]},
            )

        async with get_session(request.app.state.session_factory) as session:
            contact_repository = ContactRepository(RepositoryContext(session=session, tenant_id=tenant_id))
            lead_repository = LeadRepository(RepositoryContext(session=session, tenant_id=tenant_id))
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
                actor_context=payload.actor_context,
                audit_event_type="lead.captured",
                entity_type="lead",
                entity_id=lead_id,
                audit_payload={
                    "lead_type": payload.lead_type,
                    "contact_id": contact_id,
                    "crm_sync_status": crm_sync_result.sync_status,
                    "source": payload.attribution.source,
                    "preferred_contact_method": payload.contact.preferred_contact_method,
                },
                outbox_event_type="lead.capture.recorded",
                outbox_payload={
                    "lead_id": lead_id,
                    "contact_id": contact_id,
                    "crm_sync_record_id": crm_sync_result.record_id,
                    "crm_sync_status": crm_sync_result.sync_status,
                    "source": payload.attribution.source,
                },
                idempotency_key=f"lead-captured:{lead_id}" if lead_id else None,
            )
            await session.commit()

        return _success_response(
            {
                "lead_id": lead_id,
                "contact_id": contact_id,
                "status": "captured",
                "crm_sync_status": crm_sync_result.sync_status,
                "conversation_id": None,
            },
            tenant_id=tenant_id,
            actor_context=payload.actor_context,
        )
    except AppError as error:
        return _error_response(error, tenant_id=tenant_id, actor_context=payload.actor_context)


@router.post("/conversations/sessions")
async def start_chat_session(request: Request, payload: StartChatSessionRequestPayload):
    tenant_id = await _resolve_tenant_id(request, payload.actor_context)
    conversation_id = payload.anonymous_session_id or f"conv_{uuid4().hex[:16]}"
    channel_session_id = f"{payload.channel}_{uuid4().hex[:12]}"
    return _success_response(
        {
            "conversation_id": conversation_id,
            "channel_session_id": channel_session_id,
            "capabilities": _build_capabilities(
                payload.channel,
                payload.actor_context.deployment_mode,
            ),
        },
        tenant_id=tenant_id,
        actor_context=payload.actor_context,
    )


@router.post("/matching/search")
async def search_candidates(request: Request, payload: SearchCandidatesRequestPayload):
    actor_context = ActorContextPayload(
        channel=payload.channel_context.channel,
        tenant_id=payload.channel_context.tenant_id,
        tenant_ref=payload.channel_context.tenant_ref,
        deployment_mode=payload.channel_context.deployment_mode,
    )
    tenant_id = await _resolve_tenant_id(request, actor_context)
    strict_catalog_only = bool(actor_context.tenant_id or actor_context.tenant_ref) and (
        actor_context.channel not in {"public_web", "embedded_widget"}
        or actor_context.deployment_mode in {"embedded_widget", "plugin_integrated"}
    )
    semantic_rollout_enabled = False
    query_understanding = build_canonical_query_understanding(
        payload.query,
        location_hint=payload.location,
        requested_category=str((payload.preferences or {}).get("service_category") or ""),
        budget=payload.budget,
        time_window=payload.time_window,
    )
    effective_location_hint = query_understanding.inferred_location
    booking_request_context = extract_booking_request_context(payload.query, payload.time_window)
    near_me = booking_request_context.near_me_requested or is_near_me_requested(payload.query)
    chat_style = booking_request_context.is_chat_style or is_chat_style_query(payload.query)
    user_location = payload.user_location or None
    restaurant_live_search_only = _should_force_restaurant_live_search_only(
        query=payload.query,
        preferences=payload.preferences,
        query_understanding=query_understanding,
        booking_request_context=booking_request_context,
        strict_catalog_only=strict_catalog_only,
    )

    if restaurant_live_search_only:
        services = []
        async with get_session(request.app.state.session_factory) as session:
            semantic_rollout_enabled = await is_flag_enabled(
                "semantic_matching_model_assist_v1",
                session=session,
                tenant_id=tenant_id,
            )
    else:
        async with get_session(request.app.state.session_factory) as session:
            search_filters = _build_search_filters(
                payload.query,
                effective_location_hint,
                str((payload.preferences or {}).get("service_category") or ""),
            )
            statement = (
                select(ServiceMerchantProfile)
                .where(ServiceMerchantProfile.is_active == 1)
                .order_by(desc(ServiceMerchantProfile.featured), ServiceMerchantProfile.name)
                .limit(24)
            )
            if tenant_id:
                statement = statement.where(ServiceMerchantProfile.tenant_id == tenant_id)
            if search_filters:
                statement = statement.where(and_(*search_filters))
            services = (await session.execute(statement)).scalars().all()
            semantic_rollout_enabled = await is_flag_enabled(
                "semantic_matching_model_assist_v1",
                session=session,
                tenant_id=tenant_id,
            )

    ranked_matches = (
        []
        if restaurant_live_search_only
        else rank_catalog_matches(
            query=payload.query,
            services=services,
            location_hint=effective_location_hint,
            requested_service_id=str((payload.preferences or {}).get("requested_service_id") or ""),
            requested_category=str((payload.preferences or {}).get("service_category") or ""),
            budget=payload.budget,
        )
    )
    heuristic_ranked_matches = list(ranked_matches)
    search_strategy = (
        "public_web_live_search_restaurant_only"
        if restaurant_live_search_only
        else "catalog_term_retrieval_with_prompt9_rerank"
    )
    semantic_assist: dict[str, Any] | None = None
    semantic_service = getattr(request.app.state, "semantic_search_service", None)
    location_permission_needed = False
    if restaurant_live_search_only:
        if near_me and not user_location:
            location_permission_needed = True
    elif semantic_rollout_enabled and semantic_service is not None:
        try:
            semantic_outcome = await semantic_service.assist_catalog_ranking(
                query=payload.query,
                location_hint=effective_location_hint,
                budget=payload.budget,
                preferences=payload.preferences,
                ranked_matches=ranked_matches,
                user_location=user_location,
                near_me_requested=near_me,
                chat_context=payload.chat_context,
                is_chat_style=chat_style,
            )
        except Exception:
            semantic_outcome = None

        if semantic_outcome is not None:
            ranked_matches = semantic_outcome.ranked_matches
            search_strategy = semantic_outcome.strategy
            location_permission_needed = bool(
                getattr(semantic_outcome, "location_permission_needed", False)
            )
            semantic_assist = {
                "applied": bool(getattr(semantic_outcome, "applied", False)),
                "provider": getattr(semantic_outcome, "provider", None),
                "provider_chain": list(getattr(semantic_outcome, "provider_chain", ()) or ()),
                "fallback_applied": bool(getattr(semantic_outcome, "fallback_applied", False)),
                "normalized_query": getattr(semantic_outcome, "normalized_query", None),
                "inferred_location": getattr(semantic_outcome, "inferred_location", None),
                "inferred_category": getattr(semantic_outcome, "inferred_category", None),
                "budget_summary": getattr(semantic_outcome, "budget_summary", None),
                "evidence": list(getattr(semantic_outcome, "evidence", ()) or ()),
            }
    elif near_me and not user_location:
        location_permission_needed = True
    semantic_ranked_matches = list(ranked_matches)
    semantic_applied = bool(semantic_assist and semantic_assist.get("applied"))
    relevance_location_hint = effective_location_hint
    if (
        near_me
        and user_location
        and not relevance_location_hint
        and semantic_assist
        and semantic_assist.get("inferred_location")
    ):
        relevance_location_hint = str(semantic_assist.get("inferred_location") or "").strip() or None

    location_required = bool(near_me and relevance_location_hint)
    display_location_hint = effective_location_hint
    if near_me and user_location and not display_location_hint:
        if semantic_assist and semantic_assist.get("inferred_location"):
            display_location_hint = str(semantic_assist.get("inferred_location") or "").strip() or None
        else:
            display_location_hint = "Current location"
    display_normalized_query = query_understanding.normalized_query
    if (
        near_me
        and user_location
        and display_location_hint
        and display_normalized_query
        and _normalized_text(display_location_hint) not in _normalized_text(display_normalized_query)
    ):
        display_normalized_query = f"{display_normalized_query} near {display_location_hint.lower()}"
    if semantic_assist is not None and near_me and user_location:
        semantic_assist["inferred_location"] = display_location_hint
        if display_normalized_query:
            semantic_assist["normalized_query"] = display_normalized_query
    pre_relevance_matches = list(ranked_matches)
    ranked_matches = filter_ranked_matches_for_relevance(
        ranked_matches,
        semantic_applied=semantic_applied,
        require_location_match=location_required,
        location_hint=relevance_location_hint,
    )
    relevance_ranked_matches = list(ranked_matches)
    if semantic_applied:
        pre_domain_matches = list(ranked_matches)
        ranked_matches = _filter_ranked_matches_for_semantic_domain(
            ranked_matches,
            query=payload.query,
            inferred_category=(
                str(semantic_assist.get("inferred_category") or "").strip()
                if semantic_assist
                else None
            ),
            location_hint=relevance_location_hint,
        )
    else:
        pre_domain_matches = list(ranked_matches)
    domain_ranked_matches = list(ranked_matches)
    pre_display_matches = list(ranked_matches)
    ranked_matches = filter_ranked_matches_for_display_quality(
        ranked_matches,
        semantic_applied=semantic_applied,
    )
    display_ranked_matches = list(ranked_matches)
    ranked_matches = apply_deterministic_ranking_policy(
        ranked_matches,
        query_understanding=query_understanding,
    )
    if near_me and not user_location and location_permission_needed and not effective_location_hint:
        ranked_matches = []
    final_ranked_matches = list(ranked_matches)
    if semantic_applied:
        search_strategy = f"{search_strategy}_with_relevance_gate"
    elif ranked_matches:
        search_strategy = f"{search_strategy}_with_relevance_gate"

    candidates = [
        {
            "candidate_id": getattr(match.service, "service_id", ""),
            "provider_name": getattr(match.service, "business_name", ""),
            "service_name": getattr(match.service, "name", ""),
            "source_type": "service_catalog",
            "category": getattr(match.service, "category", None),
            "summary": getattr(match.service, "summary", None),
            "venue_name": getattr(match.service, "venue_name", None),
            "location": getattr(match.service, "location", None),
            "booking_url": getattr(match.service, "booking_url", None),
            "map_url": getattr(match.service, "map_url", None),
            "source_url": getattr(match.service, "source_url", None),
            "image_url": getattr(match.service, "image_url", None),
            "amount_aud": getattr(match.service, "amount_aud", None),
            "currency_code": getattr(match.service, "currency_code", None),
            "display_price": getattr(match.service, "display_price", None),
            "duration_minutes": getattr(match.service, "duration_minutes", None),
            "tags": list(getattr(match.service, "tags_json", None) or []),
            "featured": bool(getattr(match.service, "featured", 0)),
            "distance_km": None,
            "match_score": match.score,
            "semantic_score": match.semantic_score,
            "trust_signal": match.trust_signal,
            "is_preferred": match.is_preferred,
            "display_summary": (
                (getattr(match, "semantic_reason", None) or "").strip()
                or (getattr(match.service, "summary", None) or "").strip()
                or match.explanation
            ),
            "explanation": match.explanation,
            "why_this_matches": match.explanation,
            "source_label": _build_candidate_source_label(
                source_type="service_catalog",
                trust_signal=match.trust_signal,
            ),
            "price_posture": _build_price_posture(
                display_price=getattr(match.service, "display_price", None),
                amount_aud=getattr(match.service, "amount_aud", None),
            ),
            "booking_path_type": None,
            "next_step": None,
            "availability_state": None,
            "booking_confidence": None,
        }
        for match in ranked_matches[:8]
    ]
    openai_service = getattr(request.app.state, "openai_service", None)
    public_web_fallback_candidates: list[dict[str, Any]] = []
    if (
        not candidates
        and not strict_catalog_only
        and openai_service is not None
        and not (near_me and not user_location and location_permission_needed and not effective_location_hint)
        and hasattr(openai_service, "search_public_service_candidates")
    ):
        try:
            web_results = await openai_service.search_public_service_candidates(
                query=payload.query,
                location_hint=relevance_location_hint,
                user_location=user_location,
                booking_context={
                    "party_size": booking_request_context.party_size,
                    "requested_date": booking_request_context.requested_date,
                    "requested_time": booking_request_context.requested_time,
                    "schedule_hint": booking_request_context.schedule_hint,
                    "intent_label": booking_request_context.intent_label,
                    "summary": booking_request_context.summary,
                },
                budget=payload.budget,
                preferences=payload.preferences,
            )
        except Exception:
            web_results = []

        public_web_fallback_candidates = _build_public_web_fallback_candidates(web_results)

        if public_web_fallback_candidates:
            candidates = public_web_fallback_candidates
    recommendations = []
    if candidates:
        if ranked_matches:
            recommendations, recommendation_detail_by_candidate_id = _build_catalog_recommendations(
                ranked_matches,
                limit=3,
                booking_request_context=booking_request_context,
            )
            candidates = [
                {
                    **candidate,
                    **recommendation_detail_by_candidate_id.get(str(candidate.get("candidate_id") or ""), {}),
                }
                for candidate in candidates
            ]

    warnings: list[str] = []
    if not candidates and restaurant_live_search_only and not location_permission_needed:
        warnings.append("No live restaurant result with a direct booking or call path was found for this area yet.")
    elif not candidates:
        warnings.append("No strong relevant catalog candidates were found.")
    elif public_web_fallback_candidates and not restaurant_live_search_only:
        warnings.append("No strong tenant catalog candidates were found, so BookedAI is showing sourced public web options.")
    if location_permission_needed:
        warnings.append(
            "Location access is needed to find restaurants near you."
            if restaurant_live_search_only
            else "Location access is needed to find services near you."
        )

    confidence_payload = _build_match_confidence_payload(ranked_matches)
    if public_web_fallback_candidates and not ranked_matches and restaurant_live_search_only:
        confidence_payload = {
            "score": max(
                0.42,
                min(
                    max(float(item.get("match_score") or 0.0) for item in public_web_fallback_candidates),
                    0.78,
                ),
            ),
            "reason": "BookedAI used live restaurant web search and only kept venue results with a real booking page or call path.",
            "gating_state": "medium",
            "evidence": ["restaurant_live_web_search"],
        }
    elif public_web_fallback_candidates and not ranked_matches:
        confidence_payload = {
            "score": max(
                0.38,
                min(
                    max(float(item.get("match_score") or 0.0) for item in public_web_fallback_candidates),
                    0.72,
                ),
            ),
            "reason": "No strong tenant catalog candidate was found, so BookedAI switched to sourced public web results.",
            "gating_state": "medium",
            "evidence": ["public_web_search_fallback"],
        }

    search_diagnostics = {
        "effective_location_hint": effective_location_hint,
        "relevance_location_hint": relevance_location_hint,
        "semantic_rollout_enabled": semantic_rollout_enabled,
        "semantic_applied": semantic_applied,
        "retrieval_candidate_count": len(services),
        "heuristic_candidate_ids": _candidate_ids_from_matches(heuristic_ranked_matches),
        "semantic_candidate_ids": _candidate_ids_from_matches(semantic_ranked_matches),
        "post_relevance_candidate_ids": _candidate_ids_from_matches(relevance_ranked_matches),
        "post_domain_candidate_ids": _candidate_ids_from_matches(domain_ranked_matches),
        "final_candidate_ids": (
            _candidate_ids_from_payload(public_web_fallback_candidates)
            if public_web_fallback_candidates
            else _candidate_ids_from_matches(final_ranked_matches)
        ),
        "dropped_candidates": [
            *_candidate_drop_entries(
                pre_relevance_matches,
                relevance_ranked_matches,
                stage="relevance_gate",
                reason=(
                    "location_required"
                    if location_required
                    else "low_relevance_or_topic_mismatch"
                ),
            ),
            *_candidate_drop_entries(
                pre_domain_matches,
                domain_ranked_matches,
                stage="semantic_domain_gate",
                reason="semantic_domain_mismatch",
            ),
            *_candidate_drop_entries(
                pre_display_matches,
                display_ranked_matches,
                stage="display_quality_gate",
                reason="weak_top_match_or_low_display_confidence",
            ),
            *_candidate_drop_entries(
                display_ranked_matches,
                final_ranked_matches,
                stage="location_permission_gate",
                reason="location_permission_required",
            ),
        ],
    }
    logger.info(
        "matching_search_diagnostics",
        extra={
            "request_id": "",
            "tenant_id": tenant_id or "",
            "route": "/api/v1/matching/search",
            "status": 200,
            "search_strategy": search_strategy,
            "semantic_provider": (
                str(semantic_assist.get("provider") or "")
                if semantic_assist
                else ""
            ),
            "search_diagnostics": search_diagnostics,
        },
    )

    return _success_response(
        {
            "request_id": f"match_{uuid4().hex[:12]}",
            "candidates": candidates,
            "recommendations": recommendations,
            "confidence": confidence_payload,
            "warnings": warnings,
            "search_strategy": (
                f"{search_strategy}_plus_public_web_search"
                if public_web_fallback_candidates and not restaurant_live_search_only
                else search_strategy
            ),
            "query_context": {
                "near_me_requested": near_me,
                "location_permission_needed": location_permission_needed,
                "is_chat_style": chat_style,
                "has_user_location": bool(user_location),
            },
            "booking_context": {
                "party_size": booking_request_context.party_size,
                "requested_date": booking_request_context.requested_date,
                "requested_time": booking_request_context.requested_time,
                "schedule_hint": booking_request_context.schedule_hint,
                "intent_label": booking_request_context.intent_label,
                "summary": booking_request_context.summary,
            },
            "query_understanding": {
                "normalized_query": display_normalized_query,
                "inferred_location": display_location_hint,
                "location_terms": (
                    list(query_understanding.location_terms)
                    if query_understanding.location_terms
                    else (["current_location"] if near_me and user_location else [])
                ),
                "core_intent_terms": list(query_understanding.core_intent_terms),
                "expanded_intent_terms": list(query_understanding.expanded_intent_terms),
                "constraint_terms": list(query_understanding.constraint_terms),
                "requested_category": query_understanding.requested_category,
                "budget_limit": query_understanding.budget_limit,
                "near_me_requested": query_understanding.near_me_requested,
                "is_chat_style": query_understanding.is_chat_style,
                "requested_date": query_understanding.requested_date,
                "requested_time": query_understanding.requested_time,
                "schedule_hint": query_understanding.schedule_hint,
                "party_size": query_understanding.party_size,
                "intent_label": query_understanding.intent_label,
                "summary": query_understanding.summary,
            },
            "semantic_assist": semantic_assist
            or {
                "applied": False,
                "provider": None,
                "provider_chain": [],
                "fallback_applied": False,
                "normalized_query": display_normalized_query,
                "inferred_location": display_location_hint,
                "inferred_category": None,
                "budget_summary": None,
                "evidence": [],
            },
            "search_diagnostics": search_diagnostics,
        },
        tenant_id=tenant_id,
        actor_context=actor_context,
    )


@router.post("/booking-trust/checks")
async def check_availability(request: Request, payload: CheckAvailabilityRequestPayload):
    tenant_id = await _resolve_tenant_id(request, payload.actor_context)
    async with get_session(request.app.state.session_factory) as session:
        statement = select(ServiceMerchantProfile).where(
            ServiceMerchantProfile.service_id == payload.candidate_id
        )
        if tenant_id:
            statement = statement.where(ServiceMerchantProfile.tenant_id == tenant_id)
        service = (await session.execute(statement)).scalar_one_or_none()

    availability_state, verified, recommended_path, warnings, payment_allowed_now, booking_confidence = (
        build_booking_trust_payload(
            service,
            party_size=payload.party_size,
            desired_date=payload.desired_slot.date if payload.desired_slot else None,
            desired_time=payload.desired_slot.time if payload.desired_slot else None,
        )
    )
    booking_path_options = [recommended_path]
    if recommended_path != "request_callback":
        booking_path_options.append("request_callback")

    return _success_response(
        {
            "availability_state": availability_state,
            "verified": verified,
            "booking_confidence": booking_confidence,
            "booking_path_options": booking_path_options,
            "warnings": warnings,
            "payment_allowed_now": payment_allowed_now,
            "recommended_booking_path": recommended_path,
        },
        tenant_id=tenant_id,
        actor_context=payload.actor_context,
    )


@router.post("/bookings/path/resolve")
async def resolve_booking_path(request: Request, payload: ResolveBookingPathRequestPayload):
    tenant_id = await _resolve_tenant_id(request, payload.actor_context)
    availability_state = payload.availability_state or "availability_unknown"
    booking_confidence = payload.booking_confidence or "unverified"
    path_type, next_step, warnings, payment_allowed = resolve_booking_path_policy(
        availability_state=availability_state,
        booking_confidence=booking_confidence,
        payment_option=payload.payment_option,
        context=payload.context,
    )

    return _success_response(
        {
            "path_type": path_type,
            "trust_confidence": booking_confidence,
            "warnings": warnings
            if warnings
            else ([] if payment_allowed else ["Payment should wait until booking confidence improves."]),
            "next_step": next_step,
            "payment_allowed_before_confirmation": payment_allowed,
        },
        tenant_id=tenant_id,
        actor_context=payload.actor_context,
    )


@router.post("/bookings/intents")
async def create_booking_intent(request: Request, payload: CreateBookingIntentRequestPayload):
    tenant_id = await _resolve_tenant_id(request, payload.actor_context)
    try:
        normalized_email = (payload.contact.email or "").strip().lower() or None
        normalized_phone = (payload.contact.phone or "").strip() or None
        if not normalized_email and not normalized_phone:
            raise ValidationAppError(
                "Booking intent requires at least one contact method.",
                details={"contact": ["email or phone is required"]},
            )

        async with get_session(request.app.state.session_factory) as session:
            service = None
            service_id = payload.service_id or payload.candidate_id
            if service_id:
                statement = select(ServiceMerchantProfile).where(
                    ServiceMerchantProfile.service_id == service_id
                )
                if tenant_id:
                    statement = statement.where(ServiceMerchantProfile.tenant_id == tenant_id)
                service = (await session.execute(statement)).scalar_one_or_none()

            contact_repository = ContactRepository(RepositoryContext(session=session, tenant_id=tenant_id))
            lead_repository = LeadRepository(RepositoryContext(session=session, tenant_id=tenant_id))
            booking_repository = BookingIntentRepository(RepositoryContext(session=session, tenant_id=tenant_id))

            contact_id = await contact_repository.upsert_contact(
                tenant_id=tenant_id,
                full_name=payload.contact.full_name,
                email=normalized_email,
                phone=normalized_phone,
                primary_channel="email" if normalized_email else "phone",
            )
            lead_id = await lead_repository.upsert_lead(
                tenant_id=tenant_id,
                contact_id=contact_id,
                source=(payload.attribution.source if payload.attribution else payload.channel),
                status="captured",
            )

            booking_reference = f"v1-{uuid4().hex[:10]}"
            booking_intent_id = await booking_repository.upsert_booking_intent(
                tenant_id=tenant_id,
                contact_id=contact_id,
                booking_reference=booking_reference,
                conversation_id=f"conv_{uuid4().hex[:12]}",
                source=payload.channel,
                service_name=service.name if service else None,
                service_id=service_id,
                requested_date=payload.desired_slot.date if payload.desired_slot else None,
                requested_time=payload.desired_slot.time if payload.desired_slot else None,
                timezone=payload.desired_slot.timezone if payload.desired_slot else None,
                booking_path=_normalize_booking_path(service),
                confidence_level="medium" if service else "low",
                status="captured",
                payment_dependency_state="pending",
                metadata_json=json.dumps(
                    {
                        "notes": payload.notes,
                        "channel": payload.channel,
                        "attribution": payload.attribution.model_dump() if payload.attribution else None,
                    }
                ),
            )
            lead_sync_result = await orchestrate_lead_capture(
                session,
                tenant_id=tenant_id,
                lead_id=lead_id,
                source=(payload.attribution.source if payload.attribution else payload.channel),
                contact_email=normalized_email,
                contact_full_name=payload.contact.full_name,
                contact_phone=normalized_phone,
                company_name=service.name if service else None,
            )
            contact_sync_result = await orchestrate_contact_sync(
                session,
                tenant_id=tenant_id,
                contact_id=contact_id,
                full_name=payload.contact.full_name,
                email=normalized_email,
                phone=normalized_phone,
            )
            booking_crm_sync = await orchestrate_booking_followup_sync(
                session,
                tenant_id=tenant_id,
                booking_intent_id=booking_intent_id,
                booking_reference=booking_reference,
                full_name=payload.contact.full_name,
                email=normalized_email,
                phone=normalized_phone,
                source=(payload.attribution.source if payload.attribution else payload.channel),
                service_name=service.name if service else None,
                requested_date=payload.desired_slot.date if payload.desired_slot else None,
                requested_time=payload.desired_slot.time if payload.desired_slot else None,
                timezone=payload.desired_slot.timezone if payload.desired_slot else None,
                booking_path=_normalize_booking_path(service),
                notes=payload.notes,
                external_lead_id=lead_sync_result.external_entity_id,
                external_contact_id=contact_sync_result.external_entity_id,
            )
            await _record_phase2_write_activity(
                session,
                tenant_id=tenant_id,
                actor_context=payload.actor_context,
                audit_event_type="booking_intent.captured",
                entity_type="booking_intent",
                entity_id=booking_intent_id,
                audit_payload={
                    "booking_reference": booking_reference,
                    "contact_id": contact_id,
                    "lead_id": lead_id,
                    "service_id": service_id,
                    "channel": payload.channel,
                    "requested_date": payload.desired_slot.date if payload.desired_slot else None,
                    "requested_time": payload.desired_slot.time if payload.desired_slot else None,
                    "crm_sync": {
                        "lead": lead_sync_result.sync_status,
                        "contact": contact_sync_result.sync_status,
                        "deal": booking_crm_sync.deal_sync_status,
                        "task": booking_crm_sync.task_sync_status,
                    },
                },
                outbox_event_type="booking_intent.capture.recorded",
                outbox_payload={
                    "booking_intent_id": booking_intent_id,
                    "booking_reference": booking_reference,
                    "contact_id": contact_id,
                    "lead_id": lead_id,
                    "service_id": service_id,
                    "channel": payload.channel,
                    "crm_sync": {
                        "lead_record_id": lead_sync_result.record_id,
                        "contact_record_id": contact_sync_result.record_id,
                        "deal_record_id": booking_crm_sync.deal_record_id,
                        "task_record_id": booking_crm_sync.task_record_id,
                    },
                },
                idempotency_key=f"booking-intent:{booking_intent_id}" if booking_intent_id else None,
            )
            await session.commit()

        availability_state, verified, recommended_path, warnings, payment_allowed_now, booking_confidence = (
            build_booking_trust_payload(
                service,
                desired_date=payload.desired_slot.date if payload.desired_slot else None,
                desired_time=payload.desired_slot.time if payload.desired_slot else None,
            )
        )
        booking_path_options = [recommended_path]
        if recommended_path != "request_callback":
            booking_path_options.append("request_callback")
        return _success_response(
            {
                "booking_intent_id": booking_intent_id,
                "booking_reference": booking_reference,
                "trust": {
                    "availability_state": availability_state,
                    "verified": verified,
                    "booking_confidence": booking_confidence,
                    "booking_path_options": booking_path_options,
                    "recommended_booking_path": recommended_path,
                    "payment_allowed_now": payment_allowed_now,
                    "warnings": warnings,
                },
                "warnings": warnings,
                "crm_sync": {
                    "lead": {
                        "record_id": lead_sync_result.record_id,
                        "sync_status": lead_sync_result.sync_status,
                        "external_entity_id": lead_sync_result.external_entity_id,
                        "warning_codes": lead_sync_result.warning_codes,
                    },
                    "contact": {
                        "record_id": contact_sync_result.record_id,
                        "sync_status": contact_sync_result.sync_status,
                        "external_entity_id": contact_sync_result.external_entity_id,
                        "warning_codes": contact_sync_result.warning_codes,
                    },
                    "deal": {
                        "record_id": booking_crm_sync.deal_record_id,
                        "sync_status": booking_crm_sync.deal_sync_status,
                        "external_entity_id": booking_crm_sync.deal_external_entity_id,
                    },
                    "task": {
                        "record_id": booking_crm_sync.task_record_id,
                        "sync_status": booking_crm_sync.task_sync_status,
                        "external_entity_id": booking_crm_sync.task_external_entity_id,
                    },
                    "warning_codes": booking_crm_sync.warning_codes,
                },
            },
            tenant_id=tenant_id,
            actor_context=payload.actor_context,
        )
    except AppError as error:
        return _error_response(error, tenant_id=tenant_id, actor_context=payload.actor_context)


@router.post("/payments/intents")
async def create_payment_intent(request: Request, payload: CreatePaymentIntentRequestPayload):
    tenant_id = await _resolve_tenant_id(request, payload.actor_context)
    try:
        async with get_session(request.app.state.session_factory) as session:
            booking_lookup = await session.execute(
                text(
                    """
                    select id::text as booking_intent_id
                    from booking_intents
                    where tenant_id = :tenant_id
                      and id = cast(:booking_intent_id as uuid)
                    limit 1
                    """
                ),
                {
                    "tenant_id": tenant_id,
                    "booking_intent_id": payload.booking_intent_id,
                },
            )
            booking_row = booking_lookup.mappings().first()
            if not booking_row:
                raise PaymentAppError(
                    "Booking intent not found for payment creation.",
                    details={"booking_intent_id": payload.booking_intent_id},
                )

            payment_repository = PaymentIntentRepository(RepositoryContext(session=session, tenant_id=tenant_id))
            payment_intent_id = await payment_repository.upsert_payment_intent(
                tenant_id=tenant_id,
                booking_intent_id=payload.booking_intent_id,
                payment_option=payload.selected_payment_option,
                status="pending",
                amount_aud=None,
                currency="aud",
                external_session_id=None,
                payment_url=None,
                metadata_json=json.dumps({"created_by": payload.actor_context.channel}),
            )
            await _record_phase2_write_activity(
                session,
                tenant_id=tenant_id,
                actor_context=payload.actor_context,
                audit_event_type="payment_intent.created",
                entity_type="payment_intent",
                entity_id=payment_intent_id,
                audit_payload={
                    "booking_intent_id": payload.booking_intent_id,
                    "selected_payment_option": payload.selected_payment_option,
                },
                outbox_event_type="payment_intent.created",
                outbox_payload={
                    "payment_intent_id": payment_intent_id,
                    "booking_intent_id": payload.booking_intent_id,
                    "selected_payment_option": payload.selected_payment_option,
                },
                idempotency_key=f"payment-intent:{payment_intent_id}" if payment_intent_id else None,
            )
            await session.commit()

        return _success_response(
            {
                "payment_intent_id": payment_intent_id,
                "payment_status": "pending",
                "checkout_url": None,
                "bank_transfer_instruction_id": None,
                "invoice_id": None,
                "warnings": [
                    "Payment intent contract is ready, but provider-specific checkout orchestration is still additive."
                ],
            },
            tenant_id=tenant_id,
            actor_context=payload.actor_context,
        )
    except AppError as error:
        return _error_response(error, tenant_id=tenant_id, actor_context=payload.actor_context)


@router.post("/email/messages/send")
async def send_lifecycle_email(request: Request, payload: SendLifecycleEmailRequestPayload):
    tenant_id = await _resolve_tenant_id(request, payload.actor_context)
    try:
        if not payload.to:
            raise ValidationAppError(
                "Lifecycle email requires at least one recipient.",
                details={"to": ["at least one recipient is required"]},
            )

        email_service: EmailService = request.app.state.email_service
        rendered_email = None
        if payload.template_key == "bookedai_booking_confirmation":
            rendered_email = render_bookedai_confirmation_email(
                variables=payload.variables,
                public_app_url=request.app.state.settings.public_app_url,
            )
        subject = payload.subject or (
            rendered_email.subject if rendered_email else f"Bookedai.au lifecycle: {payload.template_key}"
        )
        if rendered_email:
            body = rendered_email.text
            html = rendered_email.html
        else:
            body_lines = [f"{key}: {value}" for key, value in sorted(payload.variables.items())]
            body = "\n".join(body_lines) if body_lines else f"Template {payload.template_key} triggered."
            html = None
        delivery_status = "queued"
        warnings: list[str] = []

        smtp_configured = email_service.smtp_configured()
        if smtp_configured:
            await email_service.send_email(
                to=payload.to,
                cc=payload.cc,
                subject=subject,
                text=body,
                html=html,
            )
            delivery_status = "sent"
        else:
            warnings.append("SMTP is not fully configured; lifecycle email was recorded but not delivered.")

        async with get_session(request.app.state.session_factory) as session:
            email_result = await orchestrate_lifecycle_email(
                session,
                tenant_id=tenant_id,
                template_key=payload.template_key,
                subject=subject,
                provider="smtp" if smtp_configured else "unconfigured",
                delivery_status=delivery_status,
                event_payload={
                    "template_key": payload.template_key,
                    "recipient_count": len(payload.to),
                    "cc_count": len(payload.cc),
                },
            )
            email_crm_sync_result = await orchestrate_email_sent_sync(
                session,
                tenant_id=tenant_id,
                message_id=email_result.message_id,
                template_key=payload.template_key,
                subject=subject,
                recipient_email=payload.to[0] if payload.to else None,
                provider="smtp" if smtp_configured else "unconfigured",
                delivery_status=delivery_status,
            )
            await _record_phase2_write_activity(
                session,
                tenant_id=tenant_id,
                actor_context=payload.actor_context,
                audit_event_type="email.lifecycle_recorded",
                entity_type="email_message",
                entity_id=email_result.message_id,
                audit_payload={
                    "template_key": payload.template_key,
                    "delivery_status": email_result.delivery_status,
                    "provider": email_result.provider,
                    "recipient_count": len(payload.to),
                    "crm_task_sync_status": email_crm_sync_result.task_sync_status,
                },
                outbox_event_type="email.lifecycle.dispatch_recorded",
                outbox_payload={
                    "message_id": email_result.message_id,
                    "template_key": payload.template_key,
                    "delivery_status": email_result.delivery_status,
                    "provider": email_result.provider,
                    "crm_task_record_id": email_crm_sync_result.task_record_id,
                },
                idempotency_key=f"email-message:{email_result.message_id}",
            )
            await session.commit()

        return _success_response(
            {
                "message_id": email_result.message_id,
                "delivery_status": email_result.delivery_status,
                "provider_message_id": None,
                "warnings": warnings + email_crm_sync_result.warning_codes,
                "crm_sync": {
                    "task": {
                        "record_id": email_crm_sync_result.task_record_id,
                        "sync_status": email_crm_sync_result.task_sync_status,
                        "external_entity_id": email_crm_sync_result.task_external_entity_id,
                    }
                },
            },
            tenant_id=tenant_id,
            actor_context=payload.actor_context,
        )
    except AppError as error:
        return _error_response(error, tenant_id=tenant_id, actor_context=payload.actor_context)


@router.post("/sms/messages/send")
async def send_sms_message(request: Request, payload: SendCommunicationMessageRequestPayload):
    tenant_id = await _resolve_tenant_id(request, payload.actor_context)
    try:
        communication_service: CommunicationService = request.app.state.communication_service
        result = await communication_service.send_sms(
            to=payload.to,
            body=payload.body,
            template_key=payload.template_key,
            variables=payload.variables,
        )

        async with get_session(request.app.state.session_factory) as session:
            message_result = await orchestrate_communication_touch(
                session,
                tenant_id=tenant_id or "",
                channel="sms",
                to=payload.to,
                body=communication_service.render_template(
                    template_key=payload.template_key,
                    variables=payload.variables,
                    fallback_body=payload.body,
                ),
                provider=result.provider,
                delivery_status=result.delivery_status,
                actor_channel=payload.actor_context.channel,
                template_key=payload.template_key,
                metadata=payload.context,
            )
            await _record_phase2_write_activity(
                session,
                tenant_id=tenant_id,
                actor_context=payload.actor_context,
                audit_event_type="sms.message_recorded",
                entity_type="communication_message",
                entity_id=message_result.message_id,
                audit_payload={
                    "channel": "sms",
                    "to": payload.to,
                    "template_key": payload.template_key,
                    "delivery_status": message_result.delivery_status,
                    "provider": message_result.provider,
                },
                outbox_event_type="sms.message.dispatch_recorded",
                outbox_payload={
                    "message_id": message_result.message_id,
                    "channel": "sms",
                    "provider": message_result.provider,
                    "delivery_status": message_result.delivery_status,
                },
                idempotency_key=f"sms-message:{message_result.message_id}",
            )
            await session.commit()

        return _success_response(
            {
                "message_id": message_result.message_id,
                "delivery_status": message_result.delivery_status,
                "provider": message_result.provider,
                "provider_message_id": result.provider_message_id,
                "warnings": result.warnings or message_result.warning_codes,
            },
            tenant_id=tenant_id,
            actor_context=payload.actor_context,
        )
    except ValueError as error:
        return _error_response(
            ValidationAppError(str(error), details={"to": ["invalid or missing phone number"]}),
            tenant_id=tenant_id,
            actor_context=payload.actor_context,
        )
    except httpx.HTTPError as error:
        return _error_response(
            IntegrationAppError(
                "SMS provider request failed.",
                provider="sms",
                details={"provider_error": str(error)},
            ),
            tenant_id=tenant_id,
            actor_context=payload.actor_context,
        )


@router.post("/whatsapp/messages/send")
async def send_whatsapp_message(request: Request, payload: SendCommunicationMessageRequestPayload):
    tenant_id = await _resolve_tenant_id(request, payload.actor_context)
    try:
        communication_service: CommunicationService = request.app.state.communication_service
        result = await communication_service.send_whatsapp(
            to=payload.to,
            body=payload.body,
            template_key=payload.template_key,
            variables=payload.variables,
        )

        async with get_session(request.app.state.session_factory) as session:
            message_result = await orchestrate_communication_touch(
                session,
                tenant_id=tenant_id or "",
                channel="whatsapp",
                to=payload.to,
                body=communication_service.render_template(
                    template_key=payload.template_key,
                    variables=payload.variables,
                    fallback_body=payload.body,
                ),
                provider=result.provider,
                delivery_status=result.delivery_status,
                actor_channel=payload.actor_context.channel,
                template_key=payload.template_key,
                metadata=payload.context,
            )
            await _record_phase2_write_activity(
                session,
                tenant_id=tenant_id,
                actor_context=payload.actor_context,
                audit_event_type="whatsapp.message_recorded",
                entity_type="communication_message",
                entity_id=message_result.message_id,
                audit_payload={
                    "channel": "whatsapp",
                    "to": payload.to,
                    "template_key": payload.template_key,
                    "delivery_status": message_result.delivery_status,
                    "provider": message_result.provider,
                },
                outbox_event_type="whatsapp.message.dispatch_recorded",
                outbox_payload={
                    "message_id": message_result.message_id,
                    "channel": "whatsapp",
                    "provider": message_result.provider,
                    "delivery_status": message_result.delivery_status,
                },
                idempotency_key=f"whatsapp-message:{message_result.message_id}",
            )
            await session.commit()

        return _success_response(
            {
                "message_id": message_result.message_id,
                "delivery_status": message_result.delivery_status,
                "provider": message_result.provider,
                "provider_message_id": result.provider_message_id,
                "warnings": result.warnings or message_result.warning_codes,
            },
            tenant_id=tenant_id,
            actor_context=payload.actor_context,
        )
    except ValueError as error:
        return _error_response(
            ValidationAppError(str(error), details={"to": ["invalid or missing phone number"]}),
            tenant_id=tenant_id,
            actor_context=payload.actor_context,
        )
    except httpx.HTTPError as error:
        return _error_response(
            IntegrationAppError(
                "WhatsApp provider request failed.",
                provider="whatsapp",
                details={"provider_error": str(error)},
            ),
            tenant_id=tenant_id,
            actor_context=payload.actor_context,
        )


@router.get("/integrations/providers/status")
async def integration_provider_statuses(request: Request):
    actor_context = ActorContextPayload(channel="admin", role="integration_preview", deployment_mode="headless_api")
    tenant_id = await _resolve_tenant_id(request, actor_context)
    async with get_session(request.app.state.session_factory) as session:
        items = await build_integration_provider_statuses(session, tenant_id=tenant_id or "")
    communication_service: CommunicationService = request.app.state.communication_service
    items.extend(
        [
            {
                "provider": communication_service.sms_adapter.provider_name,
                "status": "connected" if communication_service.sms_configured() else "unconfigured",
                "sync_mode": "write_back",
                "safe_config": communication_service.sms_safe_summary(),
                "updated_at": None,
            },
            {
                "provider": communication_service.whatsapp_adapter.provider_name,
                "status": "connected" if communication_service.whatsapp_configured() else "unconfigured",
                "sync_mode": "bidirectional",
                "safe_config": communication_service.whatsapp_safe_summary(),
                "updated_at": None,
            },
        ]
    )
    return _success_response(
        {
            "items": items,
        },
        tenant_id=tenant_id,
        actor_context=actor_context,
    )


@router.get("/integrations/reconciliation/summary")
async def integration_reconciliation_summary(request: Request):
    actor_context = ActorContextPayload(channel="admin", role="integration_preview", deployment_mode="headless_api")
    tenant_id = await _resolve_tenant_id(request, actor_context)
    async with get_session(request.app.state.session_factory) as session:
        summary = await build_reconciliation_summary(session, tenant_id=tenant_id or "")
    return _success_response(
        summary,
        tenant_id=tenant_id,
        actor_context=actor_context,
    )


@router.get("/integrations/attention")
async def integration_attention(request: Request):
    actor_context = ActorContextPayload(channel="admin", role="integration_preview", deployment_mode="headless_api")
    tenant_id = await _resolve_tenant_id(request, actor_context)
    async with get_session(request.app.state.session_factory) as session:
        items = await build_integration_attention_items(session, tenant_id=tenant_id or "")
    return _success_response(
        {
            "items": items,
        },
        tenant_id=tenant_id,
        actor_context=actor_context,
    )


@router.get("/integrations/attention/triage")
async def integration_attention_triage(request: Request):
    actor_context = ActorContextPayload(channel="admin", role="integration_preview", deployment_mode="headless_api")
    tenant_id = await _resolve_tenant_id(request, actor_context)
    async with get_session(request.app.state.session_factory) as session:
        snapshot = await build_attention_triage_snapshot(session, tenant_id=tenant_id or "")
    return _success_response(
        snapshot,
        tenant_id=tenant_id,
        actor_context=actor_context,
    )


@router.get("/integrations/crm-sync/backlog")
async def integration_crm_sync_backlog(request: Request):
    actor_context = ActorContextPayload(channel="admin", role="integration_preview", deployment_mode="headless_api")
    tenant_id = await _resolve_tenant_id(request, actor_context)
    async with get_session(request.app.state.session_factory) as session:
        backlog = await build_crm_retry_backlog(session, tenant_id=tenant_id or "")
    return _success_response(
        backlog,
        tenant_id=tenant_id,
        actor_context=actor_context,
    )


@router.get("/integrations/reconciliation/details")
async def integration_reconciliation_details(request: Request):
    actor_context = ActorContextPayload(channel="admin", role="integration_preview", deployment_mode="headless_api")
    tenant_id = await _resolve_tenant_id(request, actor_context)
    async with get_session(request.app.state.session_factory) as session:
        details = await build_reconciliation_details(session, tenant_id=tenant_id or "")
    return _success_response(
        details,
        tenant_id=tenant_id,
        actor_context=actor_context,
    )


@router.get("/integrations/runtime-activity")
async def integration_runtime_activity(request: Request):
    actor_context = ActorContextPayload(channel="admin", role="integration_preview", deployment_mode="headless_api")
    tenant_id = await _resolve_tenant_id(request, actor_context)
    async with get_session(request.app.state.session_factory) as session:
        activity = await build_recent_runtime_activity(session, tenant_id=tenant_id or "")
    return _success_response(
        activity,
        tenant_id=tenant_id,
        actor_context=actor_context,
    )


@router.get("/integrations/outbox/dispatched-audit")
async def integration_outbox_dispatched_audit(request: Request):
    actor_context = ActorContextPayload(channel="admin", role="integration_preview", deployment_mode="headless_api")
    tenant_id = await _resolve_tenant_id(request, actor_context)
    async with get_session(request.app.state.session_factory) as session:
        repository = AuditLogRepository(RepositoryContext(session=session, tenant_id=tenant_id))
        items = await repository.list_recent_entries(
            tenant_id=tenant_id,
            limit=12,
            event_type="outbox.event.dispatched",
        )
    return _success_response(
        {
            "items": items,
        },
        tenant_id=tenant_id,
        actor_context=actor_context,
    )


@router.get("/integrations/outbox/backlog")
async def integration_outbox_backlog(request: Request):
    actor_context = ActorContextPayload(channel="admin", role="integration_preview", deployment_mode="headless_api")
    tenant_id = await _resolve_tenant_id(request, actor_context)
    async with get_session(request.app.state.session_factory) as session:
        backlog = await build_outbox_backlog(session, tenant_id=tenant_id or "")
    return _success_response(
        backlog,
        tenant_id=tenant_id,
        actor_context=actor_context,
    )


@router.post("/tenant/auth/google")
async def tenant_google_auth(request: Request, payload: TenantGoogleAuthRequestPayload):
    cfg: Settings = request.app.state.settings
    google_identity = await _verify_google_identity_token(cfg, id_token=payload.id_token)
    auth_intent = str(payload.auth_intent or "create").strip().lower()
    if auth_intent not in {"sign-in", "create"}:
        return _error_response(
            ValidationAppError(
                "tenant_google_auth_invalid_intent",
                "Google tenant auth intent must be either sign-in or create.",
            ),
            tenant_id=None,
            actor_context=None,
        )

    async with get_session(request.app.state.session_factory) as session:
        tenant_repository = TenantRepository(RepositoryContext(session=session))
        tenant_id: str | None = None
        tenant_profile: dict[str, str | None] | None = None
        membership: dict[str, str | None] | None = None
        role = "tenant_admin"

        if payload.tenant_ref:
            tenant_id = await tenant_repository.resolve_tenant_id(payload.tenant_ref)
            if not tenant_id:
                return _error_response(
                    AppError(
                        code="tenant_not_found",
                        message="The requested tenant could not be resolved for Google sign-in.",
                        status_code=404,
                        details={"tenant_ref": payload.tenant_ref},
                    ),
                    tenant_id=None,
                    actor_context=None,
                )

            tenant_profile = await tenant_repository.get_tenant_profile(payload.tenant_ref or tenant_id)
            if not tenant_profile:
                return _error_response(
                    AppError(
                        code="tenant_not_found",
                        message="The tenant profile could not be loaded.",
                        status_code=404,
                    ),
                    tenant_id=None,
                    actor_context=None,
                )

            membership = await _upsert_tenant_membership(
                session,
                tenant_profile=tenant_profile,
                email=google_identity["email"] or "",
                full_name=google_identity["name"],
                google_sub=google_identity["google_sub"],
                auth_provider="google",
            )
        else:
            memberships = await _load_tenant_memberships_for_google_identity(
                session,
                email=google_identity["email"] or "",
                google_sub=google_identity["google_sub"],
            )

            if len(memberships) > 1:
                return _error_response(
                    AppError(
                        code="tenant_google_auth_multiple_memberships",
                        message="This Google account is linked to multiple tenant workspaces. Open the exact workspace URL or sign in with the tenant username instead.",
                        status_code=409,
                        details={"tenant_slugs": [item["tenant_slug"] for item in memberships if item.get("tenant_slug")]},
                    ),
                    tenant_id=None,
                    actor_context=None,
                )

            if len(memberships) == 1:
                membership = memberships[0]
                tenant_id = str(membership.get("tenant_id") or "").strip()
                role = str(membership.get("role") or "tenant_admin")
                tenant_profile = await tenant_repository.get_tenant_profile(tenant_id)
                if tenant_profile:
                    membership = await _upsert_tenant_membership(
                        session,
                        tenant_profile=tenant_profile,
                        email=google_identity["email"] or "",
                        full_name=google_identity["name"],
                        google_sub=google_identity["google_sub"],
                        auth_provider="google",
                    )
            else:
                normalized_business_name = (
                    str(payload.business_name or "").strip()
                    or str(google_identity["name"] or "").strip()
                    or " ".join(
                        part
                        for part in str(google_identity["email"] or "").split("@", 1)[0]
                        .replace(".", " ")
                        .replace("_", " ")
                        .replace("-", " ")
                        .split()
                        if part
                    ).title()
                    or "BookedAI Tenant"
                )

                base_slug = _normalize_tenant_slug_candidate(
                    str(payload.tenant_slug or "").strip()
                    or normalized_business_name
                    or str(google_identity["email"] or "").split("@", 1)[0]
                )
                normalized_slug = base_slug
                suffix = 2
                while await tenant_repository.get_tenant_profile(normalized_slug):
                    normalized_slug = _normalize_tenant_slug_candidate(f"{base_slug}-{suffix}")
                    suffix += 1

                tenant_profile = await tenant_repository.create_tenant(
                    slug=normalized_slug,
                    name=normalized_business_name,
                    timezone="Australia/Sydney",
                    locale="en-AU",
                    industry=str(payload.industry or "").strip() or None,
                )
                tenant_id = str(tenant_profile.get("id") or "").strip()
                membership = await _upsert_tenant_membership(
                    session,
                    tenant_profile=tenant_profile,
                    email=google_identity["email"] or "",
                    full_name=google_identity["name"] or normalized_business_name,
                    google_sub=google_identity["google_sub"],
                    auth_provider="google",
                )

        await session.commit()

    if not tenant_profile or not tenant_id:
        return _error_response(
            AppError(
                code="tenant_google_auth_failed",
                message="Tenant Google authentication could not be completed.",
                status_code=500,
            ),
            tenant_id=None,
            actor_context=None,
        )

    response, actor_context = await _build_tenant_auth_response(
        cfg,
        tenant_id=tenant_id,
        tenant_profile=tenant_profile,
        email=google_identity["email"] or "",
        name=google_identity["name"],
        picture_url=google_identity["picture_url"],
        provider="google",
        role=role,
        membership=membership,
        google_sub=google_identity["google_sub"],
    )
    return _success_response(
        response,
        tenant_id=tenant_id,
        actor_context=actor_context,
    )


@router.post("/tenant/auth/password")
async def tenant_password_auth(request: Request, payload: TenantPasswordAuthRequestPayload):
    cfg: Settings = request.app.state.settings
    normalized_username = payload.username.strip().lower()
    normalized_password = payload.password.strip()
    if not normalized_username or not normalized_password:
        return _error_response(
            ValidationAppError(
                "tenant_auth_invalid_credentials",
                "Username and password are required for tenant sign-in.",
            ),
            tenant_id=None,
            actor_context=None,
        )

    async with get_session(request.app.state.session_factory) as session:
        credential = await _load_tenant_credential(session, username=normalized_username)
        if not credential or not _verify_tenant_password(
            password=normalized_password,
            salt=credential.password_salt,
            expected_hash=credential.password_hash,
        ):
            return _error_response(
                AppError(
                    code="tenant_auth_invalid_credentials",
                    message="The tenant username or password is incorrect.",
                    status_code=401,
                ),
                tenant_id=None,
                actor_context=None,
            )

        tenant_repository = TenantRepository(RepositoryContext(session=session))
        tenant_id = str(credential.tenant_id or "").strip()
        tenant_profile = await tenant_repository.get_tenant_profile(payload.tenant_ref or tenant_id)
        if not tenant_profile:
            return _error_response(
                AppError(
                    code="tenant_not_found",
                    message="The tenant profile could not be loaded for username-based sign-in.",
                    status_code=404,
                    details={"tenant_ref": payload.tenant_ref, "username": normalized_username},
                ),
                tenant_id=None,
                actor_context=None,
            )

        if payload.tenant_ref:
            requested_tenant_id = await tenant_repository.resolve_tenant_id(payload.tenant_ref)
            if requested_tenant_id and requested_tenant_id != tenant_id:
                return _error_response(
                    AppError(
                        code="tenant_auth_tenant_mismatch",
                        message="This tenant account does not belong to the requested tenant.",
                        status_code=403,
                    ),
                    tenant_id=requested_tenant_id,
                    actor_context=None,
                )

        membership = await _load_tenant_membership(
            session,
            tenant_id=tenant_id,
            email=str(credential.email or "").strip().lower(),
        )
        if not membership:
            tenant_profile = {
                **tenant_profile,
                "id": tenant_id,
                "slug": str(credential.tenant_slug or tenant_profile.get("slug") or ""),
            }
            membership = await _upsert_tenant_membership(
                session,
                tenant_profile=tenant_profile,
                email=str(credential.email or "").strip().lower(),
                full_name=normalized_username,
                google_sub=None,
                auth_provider="password",
            )
            await session.commit()

    session_token, expires_at = _create_tenant_session_token(
        cfg,
        email=str(credential.email or "").strip().lower(),
        tenant_ref=str(credential.tenant_slug or tenant_profile["slug"] or tenant_id),
        name=normalized_username,
        picture_url=None,
        google_sub=None,
    )
    actor_context = ActorContextPayload(
        channel="tenant_app",
        tenant_id=tenant_id,
        role=str(credential.role or "tenant_admin"),
        deployment_mode="standalone_app",
    )
    return _success_response(
        {
            "session_token": session_token,
            "expires_at": expires_at.isoformat(),
            "provider": "password",
            "user": {
                "email": str(credential.email or "").strip().lower(),
                "full_name": normalized_username,
                "picture_url": None,
            },
            "tenant": tenant_profile,
            "capabilities": [
                "tenant_overview",
                "tenant_catalog_import",
                "tenant_catalog_review",
                "tenant_catalog_publish",
            ],
            "membership": membership,
        },
        tenant_id=tenant_id,
        actor_context=actor_context,
    )


@router.post("/tenant/account/create")
async def tenant_create_account(request: Request, payload: TenantCreateAccountRequestPayload):
    cfg: Settings = request.app.state.settings
    normalized_email = payload.email.strip().lower()
    normalized_username = payload.username.strip().lower()
    normalized_password = payload.password.strip()
    normalized_business_name = payload.business_name.strip()
    normalized_slug = _normalize_tenant_slug_candidate(payload.tenant_slug or normalized_business_name)
    if (
        not normalized_email
        or not normalized_username
        or not normalized_password
        or not normalized_business_name
    ):
        return _error_response(
            ValidationAppError(
                "tenant_account_create_invalid",
                "Business name, email, username, and password are required to create a tenant account.",
            ),
            tenant_id=None,
            actor_context=None,
        )

    async with get_session(request.app.state.session_factory) as session:
        tenant_repository = TenantRepository(RepositoryContext(session=session))
        existing_tenant = await tenant_repository.get_tenant_profile(normalized_slug)
        if existing_tenant:
            return _error_response(
                AppError(
                    code="tenant_account_slug_taken",
                    message="That tenant workspace slug already exists. Use claim workspace instead.",
                    status_code=409,
                    details={"tenant_slug": normalized_slug},
                ),
                tenant_id=str(existing_tenant.get("id") or ""),
                actor_context=None,
            )

        existing_credential = await _load_tenant_credential(session, username=normalized_username)
        if existing_credential:
            return _error_response(
                AppError(
                    code="tenant_auth_username_taken",
                    message="That username is already in use.",
                    status_code=409,
                ),
                tenant_id=None,
                actor_context=None,
            )

        tenant_profile = await tenant_repository.create_tenant(
            slug=normalized_slug,
            name=normalized_business_name,
            timezone=payload.timezone or "Australia/Sydney",
            locale=payload.locale or "en-AU",
            industry=payload.industry.strip() if payload.industry else None,
        )
        membership = await _upsert_tenant_membership(
            session,
            tenant_profile=tenant_profile,
            email=normalized_email,
            full_name=payload.full_name or normalized_business_name,
            google_sub=None,
            auth_provider="password",
        )
        await _create_or_update_tenant_credential(
            session,
            tenant_profile=tenant_profile,
            email=normalized_email,
            username=normalized_username,
            password=normalized_password,
        )
        await session.commit()

    response, actor_context = await _build_tenant_auth_response(
        cfg,
        tenant_id=str(tenant_profile.get("id") or ""),
        tenant_profile=tenant_profile,
        email=normalized_email,
        name=payload.full_name or normalized_business_name,
        picture_url=None,
        provider="password",
        role=str(membership.get("role") or "tenant_admin"),
        membership=membership,
    )
    return _success_response(
        response,
        tenant_id=str(tenant_profile.get("id") or ""),
        actor_context=actor_context,
    )


@router.post("/tenant/account/claim")
async def tenant_claim_account(request: Request, payload: TenantClaimAccountRequestPayload):
    cfg: Settings = request.app.state.settings
    normalized_email = payload.email.strip().lower()
    normalized_username = payload.username.strip().lower()
    normalized_password = payload.password.strip()
    if not payload.tenant_ref.strip() or not normalized_email or not normalized_username or not normalized_password:
        return _error_response(
            ValidationAppError(
                "tenant_claim_invalid",
                "Tenant reference, email, username, and password are required to claim a tenant workspace.",
            ),
            tenant_id=None,
            actor_context=None,
        )

    async with get_session(request.app.state.session_factory) as session:
        tenant_repository = TenantRepository(RepositoryContext(session=session))
        tenant_id = await tenant_repository.resolve_tenant_id(payload.tenant_ref)
        if not tenant_id:
            return _error_response(
                AppError(
                    code="tenant_not_found",
                    message="The requested tenant could not be resolved for account claim.",
                    status_code=404,
                    details={"tenant_ref": payload.tenant_ref},
                ),
                tenant_id=None,
                actor_context=None,
            )

        tenant_profile = await tenant_repository.get_tenant_profile(payload.tenant_ref or tenant_id)
        if not tenant_profile:
            return _error_response(
                AppError(
                    code="tenant_not_found",
                    message="The tenant profile could not be loaded for account claim.",
                    status_code=404,
                ),
                tenant_id=None,
                actor_context=None,
            )

        membership_record = (
            await session.execute(
                select(TenantUserMembership).where(
                    TenantUserMembership.tenant_id == tenant_id,
                    TenantUserMembership.email == normalized_email,
                    TenantUserMembership.status.in_(("active", "invited")),
                )
            )
        ).scalar_one_or_none()
        membership = None
        accepted_existing_invite = False
        if membership_record:
            accepted_existing_invite = str(membership_record.status or "").strip().lower() == "invited"
            membership_record.status = "active"
            membership = {
                "tenant_id": membership_record.tenant_id,
                "tenant_slug": membership_record.tenant_slug,
                "email": membership_record.email,
                "role": membership_record.role,
                "status": membership_record.status,
            }

        if not membership:
            membership_count = await tenant_repository.count_active_memberships(tenant_id)
            claimable_service_count = await _count_claimable_services(
                session,
                tenant_profile=tenant_profile,
                email=normalized_email,
            )
            if membership_count > 0 and claimable_service_count == 0:
                return _error_response(
                    AppError(
                        code="tenant_claim_not_allowed",
                        message="This tenant workspace cannot be claimed or accepted with the supplied email yet.",
                        status_code=403,
                    ),
                    tenant_id=tenant_id,
                    actor_context=None,
                )

            membership = await _upsert_tenant_membership(
                session,
                tenant_profile=tenant_profile,
                email=normalized_email,
                full_name=payload.full_name or normalized_username,
                google_sub=None,
                auth_provider="password",
            )

        await _create_or_update_tenant_credential(
            session,
            tenant_profile=tenant_profile,
            email=normalized_email,
            username=normalized_username,
            password=normalized_password,
            role=str(membership.get("role") or "tenant_admin"),
        )
        if accepted_existing_invite:
            audit_repository = AuditLogRepository(RepositoryContext(session=session, tenant_id=tenant_id))
            await audit_repository.append_entry(
                tenant_id=tenant_id,
                event_type="tenant.team.member_invite_accepted",
                entity_type="tenant_member",
                entity_id=normalized_email,
                actor_type="tenant_app",
                actor_id=normalized_email,
                payload={
                    "summary": "Tenant invite accepted from the tenant portal.",
                    "email": normalized_email,
                    "role": membership.get("role"),
                    "tenant_slug": membership.get("tenant_slug"),
                },
            )
        await session.commit()

    response, actor_context = await _build_tenant_auth_response(
        cfg,
        tenant_id=tenant_id,
        tenant_profile=tenant_profile,
        email=normalized_email,
        name=payload.full_name or normalized_username,
        picture_url=None,
        provider="password",
        role=str(membership.get("role") or "tenant_admin"),
        membership=membership,
    )
    return _success_response(
        response,
        tenant_id=tenant_id,
        actor_context=actor_context,
    )


async def _resolve_tenant_request_context(
    request: Request,
    *,
    authorization: str | None = None,
) -> tuple[str | None, str | None, dict[str, str | None] | None, dict[str, str | None] | None]:
    tenant_session = await _resolve_tenant_session(request, authorization=authorization)
    tenant_ref = tenant_session["tenant_ref"] if tenant_session else request.query_params.get("tenant_ref")
    membership: dict[str, str | None] | None = None

    async with get_session(request.app.state.session_factory) as session:
        tenant_repository = TenantRepository(RepositoryContext(session=session))
        tenant_id = await tenant_repository.resolve_tenant_id(tenant_ref)
        if tenant_session and tenant_id:
            membership = await _load_tenant_membership(
                session,
                tenant_id=tenant_id,
                email=tenant_session["email"] or "",
            )

    return tenant_ref, tenant_id, tenant_session, membership


def _apply_tenant_catalog_update(
    service: ServiceMerchantProfile,
    payload: TenantCatalogUpdateRequestPayload,
) -> None:
    if payload.business_name is not None:
        service.business_name = payload.business_name.strip() or service.business_name
    if payload.business_email is not None:
        service.business_email = payload.business_email.strip().lower() or None
    if payload.name is not None:
        service.name = payload.name.strip() or service.name
    if payload.category is not None:
        service.category = payload.category.strip() or None
    if payload.summary is not None:
        service.summary = payload.summary.strip() or None
    if payload.amount_aud is not None:
        service.amount_aud = payload.amount_aud
    if payload.currency_code is not None:
        service.currency_code = payload.currency_code.strip().upper() or "AUD"
    if payload.display_price is not None:
        service.display_price = payload.display_price.strip() or None
    if payload.duration_minutes is not None:
        service.duration_minutes = payload.duration_minutes
    if payload.venue_name is not None:
        service.venue_name = payload.venue_name.strip() or None
    if payload.location is not None:
        service.location = payload.location.strip() or None
    if payload.map_url is not None:
        service.map_url = payload.map_url.strip() or None
    if payload.booking_url is not None:
        service.booking_url = payload.booking_url.strip() or None
    if payload.image_url is not None:
        service.image_url = payload.image_url.strip() or None
    if payload.tags is not None:
        service.tags_json = [str(tag).strip() for tag in payload.tags if str(tag).strip()]
    if payload.featured is not None:
        service.featured = 1 if payload.featured else 0


def _apply_catalog_quality_to_service(service: ServiceMerchantProfile) -> list[str]:
    normalized_payload, quality_warnings = apply_catalog_quality_gate(
        {
            "name": service.name,
            "category": service.category,
            "summary": service.summary,
            "amount_aud": service.amount_aud,
            "currency_code": getattr(service, "currency_code", "AUD"),
            "display_price": getattr(service, "display_price", None),
            "duration_minutes": service.duration_minutes,
            "venue_name": service.venue_name,
            "location": service.location,
            "map_url": service.map_url,
            "booking_url": service.booking_url,
            "image_url": service.image_url,
            "tags_json": list(service.tags_json or []),
            "is_active": service.is_active,
        }
    )
    service.category = normalized_payload.get("category")
    service.tags_json = list(normalized_payload.get("tags_json") or [])
    if not service.map_url and (service.venue_name or service.location):
        service.map_url = _build_google_maps_url(service.venue_name, service.location)
    return quality_warnings


@router.post("/integrations/outbox/dispatch")
async def dispatch_outbox_events(request: Request, payload: DispatchOutboxRequestPayload):
    actor_context = payload.actor_context or ActorContextPayload(
        channel="admin",
        role="integration_preview",
        deployment_mode="headless_api",
    )
    tenant_id = await _resolve_tenant_id(request, actor_context)
    dispatch_limit = max(1, min(payload.limit, 25))

    async with get_session(request.app.state.session_factory) as session:
        tracked_result = await run_tracked_outbox_dispatch(
            session,
            dispatcher=lambda event: dispatch_phase2_outbox_event(session, event),
            tenant_id=tenant_id,
            limit=dispatch_limit,
        )
        await session.commit()

    return _success_response(
        {
            "job_run_id": tracked_result.job_run_id,
            "dispatch_status": tracked_result.result.status,
            "detail": tracked_result.result.detail,
            "retryable": tracked_result.result.retryable,
            "metadata": tracked_result.result.metadata,
        },
        tenant_id=tenant_id,
        actor_context=actor_context,
    )


@router.post("/integrations/outbox/replay")
async def replay_outbox_event(request: Request, payload: ReplayOutboxEventRequestPayload):
    actor_context = payload.actor_context or ActorContextPayload(
        channel="admin",
        role="integration_recovery",
        deployment_mode="headless_api",
    )
    tenant_id = await _resolve_tenant_id(request, actor_context)

    async with get_session(request.app.state.session_factory) as session:
        outbox_repository = OutboxRepository(RepositoryContext(session=session, tenant_id=tenant_id))
        replayed_event = await outbox_repository.requeue_event(
            payload.outbox_event_id,
            tenant_id=tenant_id,
        )
        if not replayed_event:
            return _error_response(
                AppError(
                    code="outbox_event_not_found",
                    message="The requested outbox event could not be replayed.",
                    status_code=404,
                    details={"outbox_event_id": payload.outbox_event_id},
                ),
                tenant_id=tenant_id,
                actor_context=actor_context,
            )

        audit_repository = AuditLogRepository(RepositoryContext(session=session, tenant_id=tenant_id))
        await audit_repository.append_entry(
            tenant_id=tenant_id,
            event_type="outbox.event.requeued",
            entity_type=replayed_event.get("aggregate_type") or "outbox_event",
            entity_id=replayed_event.get("aggregate_id"),
            actor_type=actor_context.channel,
            actor_id=actor_context.actor_id,
            payload={
                "outbox_event_id": replayed_event.get("id"),
                "outbox_event_type": replayed_event.get("event_type"),
                "aggregate_type": replayed_event.get("aggregate_type"),
                "aggregate_id": replayed_event.get("aggregate_id"),
                "idempotency_key": replayed_event.get("idempotency_key"),
            },
        )
        await session.commit()

    return _success_response(
        {
            "outbox_event_id": replayed_event.get("id"),
            "status": replayed_event.get("status"),
            "available_at": replayed_event.get("available_at"),
            "warnings": [
                "Replay only re-queues the event. Run outbox dispatch again to attempt delivery."
            ],
        },
        tenant_id=tenant_id,
        actor_context=actor_context,
    )


@router.get("/tenant/overview")
async def tenant_overview(request: Request, authorization: str | None = Header(default=None)):
    tenant_ref, tenant_id, tenant_session, _membership = await _resolve_tenant_request_context(
        request,
        authorization=authorization,
    )
    async with get_session(request.app.state.session_factory) as session:
        if not tenant_id:
            return _error_response(
                AppError(
                    code="tenant_not_found",
                    message="The requested tenant could not be resolved.",
                    status_code=404,
                    details={"tenant_ref": tenant_ref},
                ),
                tenant_id=None,
                actor_context=None,
            )

        overview = await build_tenant_overview(session, tenant_ref=tenant_ref or tenant_id)
    return _success_response(
        overview,
        tenant_id=tenant_id,
        actor_context=ActorContextPayload(
            channel="tenant_app",
            tenant_id=tenant_id,
            role="tenant_admin" if tenant_session else "tenant_preview",
            deployment_mode="standalone_app",
        ),
    )


@router.get("/tenant/bookings")
async def tenant_bookings(request: Request, authorization: str | None = Header(default=None)):
    tenant_ref, tenant_id, tenant_session, _membership = await _resolve_tenant_request_context(
        request,
        authorization=authorization,
    )
    async with get_session(request.app.state.session_factory) as session:
        if not tenant_id:
            return _error_response(
                AppError(
                    code="tenant_not_found",
                    message="The requested tenant could not be resolved.",
                    status_code=404,
                    details={"tenant_ref": tenant_ref},
                ),
                tenant_id=None,
                actor_context=None,
            )

        snapshot = await build_tenant_bookings_snapshot(session, tenant_ref=tenant_ref or tenant_id)
    return _success_response(
        snapshot,
        tenant_id=tenant_id,
        actor_context=ActorContextPayload(
            channel="tenant_app",
            tenant_id=tenant_id,
            role="tenant_admin" if tenant_session else "tenant_preview",
            deployment_mode="standalone_app",
        ),
    )


@router.get("/tenant/leads")
async def tenant_leads(
    request: Request,
    authorization: str | None = Header(default=None),
    status: str | None = None,
):
    tenant_ref, tenant_id, tenant_session, _membership = await _resolve_tenant_request_context(
        request,
        authorization=authorization,
    )
    async with get_session(request.app.state.session_factory) as session:
        if not tenant_id:
            return _error_response(
                AppError(
                    code="tenant_not_found",
                    message="The requested tenant could not be resolved.",
                    status_code=404,
                    details={"tenant_ref": tenant_ref},
                ),
                tenant_id=None,
                actor_context=None,
            )
        snapshot = await build_tenant_leads_snapshot(
            session, tenant_ref=tenant_ref or tenant_id, status_filter=status
        )
    return _success_response(
        snapshot,
        tenant_id=tenant_id,
        actor_context=ActorContextPayload(
            channel="tenant_app",
            tenant_id=tenant_id,
            role="tenant_admin" if tenant_session else "tenant_preview",
            deployment_mode="standalone_app",
        ),
    )


@router.get("/tenant/integrations")
async def tenant_integrations(request: Request, authorization: str | None = Header(default=None)):
    tenant_ref, tenant_id, tenant_session, membership = await _resolve_tenant_request_context(
        request,
        authorization=authorization,
    )
    async with get_session(request.app.state.session_factory) as session:
        if not tenant_id:
            return _error_response(
                AppError(
                    code="tenant_not_found",
                    message="The requested tenant could not be resolved.",
                    status_code=404,
                    details={"tenant_ref": tenant_ref},
                ),
                tenant_id=None,
                actor_context=None,
            )

        snapshot = await build_tenant_integrations_snapshot(session, tenant_ref=tenant_ref or tenant_id)
        snapshot["access"] = {
            "current_role": _membership_role(membership) if tenant_session else "tenant_preview",
            "can_manage_integrations": bool(
                tenant_session and _membership_role(membership) in TENANT_INTEGRATION_WRITE_ROLES
            ),
            "write_mode": (
                "provider_controls"
                if tenant_session and _membership_role(membership) in TENANT_INTEGRATION_WRITE_ROLES
                else "read_only"
            ),
            "operator_note": (
                "Provider posture controls are available here for tenant admins and operators, while credential-level integration configuration changes remain admin-managed release controls."
            ),
        }
    return _success_response(
        snapshot,
        tenant_id=tenant_id,
        actor_context=ActorContextPayload(
            channel="tenant_app",
            tenant_id=tenant_id,
            role=_membership_role(membership) if tenant_session else "tenant_preview",
            deployment_mode="standalone_app",
        ),
    )


@router.patch("/tenant/integrations/providers/{provider}")
async def tenant_integration_provider_update(
    request: Request,
    provider: str,
    payload: TenantIntegrationProviderUpdateRequestPayload,
    authorization: str | None = Header(default=None),
):
    tenant_ref, tenant_id, tenant_session, membership = await _resolve_tenant_request_context(
        request,
        authorization=authorization,
    )
    if not tenant_session or not membership or not tenant_id:
        return _error_response(
            AppError(
                code="tenant_auth_required",
                message="Sign in with an active tenant account before updating integration provider posture.",
                status_code=401 if not tenant_session else 403,
            ),
            tenant_id=tenant_id,
            actor_context=None,
        )
    role_error = _require_tenant_membership_role(
        membership,
        allowed_roles=TENANT_INTEGRATION_WRITE_ROLES,
        message="Only tenant admins and operators can update integration provider posture in the tenant portal.",
    )
    if role_error:
        return _error_response(role_error, tenant_id=tenant_id, actor_context=None)

    normalized_provider = provider.strip().lower()
    if not normalized_provider:
        return _error_response(
            AppError(
                code="invalid_provider",
                message="Select a valid provider before updating integration posture.",
                status_code=422,
            ),
            tenant_id=tenant_id,
            actor_context=None,
        )

    requested_status = payload.status.strip().lower() if payload.status else None
    requested_sync_mode = payload.sync_mode.strip().lower() if payload.sync_mode else None
    allowed_statuses = {"connected", "paused"}
    allowed_sync_modes = {"read_only", "write_back", "bidirectional"}
    if requested_status and requested_status not in allowed_statuses:
        return _error_response(
            AppError(
                code="invalid_integration_status",
                message="Select a valid integration provider status before saving.",
                status_code=422,
                details={"allowed_statuses": sorted(allowed_statuses)},
            ),
            tenant_id=tenant_id,
            actor_context=None,
        )
    if requested_sync_mode and requested_sync_mode not in allowed_sync_modes:
        return _error_response(
            AppError(
                code="invalid_integration_sync_mode",
                message="Select a valid integration sync mode before saving.",
                status_code=422,
                details={"allowed_sync_modes": sorted(allowed_sync_modes)},
            ),
            tenant_id=tenant_id,
            actor_context=None,
        )

    async with get_session(request.app.state.session_factory) as session:
        integration_repository = IntegrationRepository(RepositoryContext(session=session, tenant_id=tenant_id))
        updated_connection = await integration_repository.upsert_connection(
            tenant_id=tenant_id,
            provider=normalized_provider,
            status=requested_status or "paused",
            sync_mode=requested_sync_mode or "read_only",
        )
        audit_repository = AuditLogRepository(RepositoryContext(session=session, tenant_id=tenant_id))
        await audit_repository.append_entry(
            tenant_id=tenant_id,
            event_type="tenant.integrations.provider_updated",
            entity_type="integration_connection",
            entity_id=normalized_provider,
            actor_type="tenant_app",
            actor_id=str(tenant_session.get("email") or ""),
            payload={
                "summary": "Integration provider posture updated from the tenant portal.",
                "provider": normalized_provider,
                "status": updated_connection.get("status"),
                "sync_mode": updated_connection.get("sync_mode"),
            },
        )
        await session.commit()
        snapshot = await build_tenant_integrations_snapshot(session, tenant_ref=tenant_ref or tenant_id)
        snapshot["access"] = {
            "current_role": _membership_role(membership),
            "can_manage_integrations": True,
            "write_mode": "provider_controls",
            "operator_note": "Provider posture controls are active for this tenant session.",
        }

    return _success_response(
        snapshot,
        tenant_id=tenant_id,
        actor_context=ActorContextPayload(
            channel="tenant_app",
            tenant_id=tenant_id,
            role=_membership_role(membership),
            deployment_mode="standalone_app",
        ),
    )


@router.get("/tenant/billing")
async def tenant_billing(request: Request, authorization: str | None = Header(default=None)):
    tenant_ref, tenant_id, tenant_session, membership = await _resolve_tenant_request_context(
        request,
        authorization=authorization,
    )
    async with get_session(request.app.state.session_factory) as session:
        if not tenant_id:
            return _error_response(
                AppError(
                    code="tenant_not_found",
                    message="The requested tenant could not be resolved.",
                    status_code=404,
                    details={"tenant_ref": tenant_ref},
                ),
                tenant_id=None,
                actor_context=None,
            )

        snapshot = await build_tenant_billing_snapshot(session, tenant_ref=tenant_ref or tenant_id)
        self_serve = snapshot.setdefault("self_serve", {})
        self_serve["can_manage_billing"] = bool(
            tenant_session and _membership_role(membership) in TENANT_BILLING_WRITE_ROLES
        )
    return _success_response(
        snapshot,
        tenant_id=tenant_id,
        actor_context=ActorContextPayload(
            channel="tenant_app",
            tenant_id=tenant_id,
            role=_membership_role(membership) if tenant_session else "tenant_preview",
            deployment_mode="standalone_app",
        ),
    )


@router.patch("/tenant/billing/account")
async def tenant_billing_account_update(
    request: Request,
    payload: TenantBillingAccountUpdateRequestPayload,
    authorization: str | None = Header(default=None),
):
    tenant_ref, tenant_id, tenant_session, membership = await _resolve_tenant_request_context(
        request,
        authorization=authorization,
    )
    if not tenant_session or not membership or not tenant_id:
        return _error_response(
            AppError(
                code="tenant_auth_required",
                message="Sign in with an active tenant account before updating billing setup.",
                status_code=401 if not tenant_session else 403,
            ),
            tenant_id=tenant_id,
            actor_context=None,
        )
    role_error = _require_tenant_membership_role(
        membership,
        allowed_roles=TENANT_BILLING_WRITE_ROLES,
        message="Only tenant admins and finance managers can change billing setup or plans.",
    )
    if role_error:
        return _error_response(role_error, tenant_id=tenant_id, actor_context=None)

    async with get_session(request.app.state.session_factory) as session:
        tenant_repository = TenantRepository(RepositoryContext(session=session))
        billing_account = await tenant_repository.upsert_billing_account(
            tenant_id=tenant_id,
            billing_email=payload.billing_email.strip() if payload.billing_email else None,
            merchant_mode=payload.merchant_mode.strip().lower() if payload.merchant_mode else "test",
        )
        audit_repository = AuditLogRepository(RepositoryContext(session=session, tenant_id=tenant_id))
        await audit_repository.append_entry(
            tenant_id=tenant_id,
            event_type="tenant.billing.account_updated",
            entity_type="billing_account",
            entity_id=str(billing_account.get("id") or ""),
            actor_type="tenant_app",
            actor_id=str(tenant_session.get("email") or ""),
            payload={
                "summary": "Tenant billing account settings updated from the tenant portal.",
                "billing_email": billing_account.get("billing_email"),
                "merchant_mode": billing_account.get("merchant_mode"),
            },
        )
        await session.commit()
        billing = await build_tenant_billing_snapshot(session, tenant_ref=tenant_ref or tenant_id)
        onboarding = await build_tenant_onboarding_snapshot(session, tenant_ref=tenant_ref or tenant_id)

    actor_context = ActorContextPayload(
        channel="tenant_app",
        tenant_id=tenant_id,
        role=str(membership.get("role") or "tenant_admin"),
        deployment_mode="standalone_app",
    )
    return _success_response(
        {
            "billing": billing,
            "onboarding": onboarding,
        },
        tenant_id=tenant_id,
        actor_context=actor_context,
    )


@router.post("/tenant/billing/subscription")
async def tenant_billing_subscription_update(
    request: Request,
    payload: TenantSubscriptionUpdateRequestPayload,
    authorization: str | None = Header(default=None),
):
    tenant_ref, tenant_id, tenant_session, membership = await _resolve_tenant_request_context(
        request,
        authorization=authorization,
    )
    if not tenant_session or not membership or not tenant_id:
        return _error_response(
            AppError(
                code="tenant_auth_required",
                message="Sign in with an active tenant account before changing tenant billing packages.",
                status_code=401 if not tenant_session else 403,
            ),
            tenant_id=tenant_id,
            actor_context=None,
        )
    role_error = _require_tenant_membership_role(
        membership,
        allowed_roles=TENANT_BILLING_WRITE_ROLES,
        message="Only tenant admins and finance managers can change billing setup or packages.",
    )
    if role_error:
        return _error_response(role_error, tenant_id=tenant_id, actor_context=None)

    plan_code = str(payload.package_code or payload.plan_code or "").strip().lower()
    if plan_code not in TENANT_SUBSCRIPTION_PLAN_CODES:
        return _error_response(
            AppError(
                code="invalid_plan_code",
                message="Select a valid tenant subscription package before continuing.",
                status_code=422,
                details={"allowed_plan_codes": sorted(TENANT_SUBSCRIPTION_PLAN_CODES)},
            ),
            tenant_id=tenant_id,
            actor_context=None,
        )

    mode = str(payload.mode or "trial").strip().lower()
    subscription_status = "trialing" if mode == "trial" else "active"
    now = datetime.now(UTC)
    period_days = 14 if subscription_status == "trialing" else 30

    async with get_session(request.app.state.session_factory) as session:
        tenant_repository = TenantRepository(RepositoryContext(session=session))
        billing_account = await tenant_repository.upsert_billing_account(
            tenant_id=tenant_id,
            billing_email=str(tenant_session.get("email") or "").strip().lower() or None,
            merchant_mode="test",
        )
        subscription = await tenant_repository.upsert_subscription(
            tenant_id=tenant_id,
            billing_account_id=billing_account.get("id"),
            plan_code=plan_code,
            status=subscription_status,
            started_at=now,
            ended_at=None if subscription_status == "active" else now + timedelta(days=period_days),
        )
        await tenant_repository.replace_subscription_period(
            subscription_id=str(subscription.get("id")),
            period_days=period_days,
            status="trial_open" if subscription_status == "trialing" else "open",
        )
        audit_repository = AuditLogRepository(RepositoryContext(session=session, tenant_id=tenant_id))
        await audit_repository.append_entry(
            tenant_id=tenant_id,
            event_type="tenant.billing.subscription_updated",
            entity_type="subscription",
            entity_id=str(subscription.get("id") or ""),
            actor_type="tenant_app",
            actor_id=str(tenant_session.get("email") or ""),
            payload={
                "summary": "Tenant subscription package changed from the tenant portal.",
                "package_code": plan_code,
                "plan_code": plan_code,
                "status": subscription_status,
                "mode": mode,
            },
        )
        await session.commit()
        billing = await build_tenant_billing_snapshot(session, tenant_ref=tenant_ref or tenant_id)
        onboarding = await build_tenant_onboarding_snapshot(session, tenant_ref=tenant_ref or tenant_id)

    actor_context = ActorContextPayload(
        channel="tenant_app",
        tenant_id=tenant_id,
        role=str(membership.get("role") or "tenant_admin"),
        deployment_mode="standalone_app",
    )
    return _success_response(
        {
            "billing": billing,
            "onboarding": onboarding,
        },
        tenant_id=tenant_id,
        actor_context=actor_context,
    )


@router.post("/tenant/billing/invoices/{invoice_id}/mark-paid")
async def tenant_billing_invoice_mark_paid(
    request: Request,
    invoice_id: str,
    authorization: str | None = Header(default=None),
):
    tenant_ref, tenant_id, tenant_session, membership = await _resolve_tenant_request_context(
        request,
        authorization=authorization,
    )
    if not tenant_session or not membership or not tenant_id:
        return _error_response(
            AppError(
                code="tenant_auth_required",
                message="Sign in with an active tenant account before updating invoice state.",
                status_code=401 if not tenant_session else 403,
            ),
            tenant_id=tenant_id,
            actor_context=None,
        )
    role_error = _require_tenant_membership_role(
        membership,
        allowed_roles=TENANT_BILLING_WRITE_ROLES,
        message="Only tenant admins and finance managers can update invoice state.",
    )
    if role_error:
        return _error_response(role_error, tenant_id=tenant_id, actor_context=None)

    period_id = _tenant_period_id_from_invoice_id(invoice_id)
    if not period_id:
        return _error_response(
            AppError(
                code="invalid_invoice_id",
                message="The supplied invoice id is not valid for tenant billing actions.",
                status_code=422,
            ),
            tenant_id=tenant_id,
            actor_context=None,
        )

    async with get_session(request.app.state.session_factory) as session:
        tenant_repository = TenantRepository(RepositoryContext(session=session))
        period = await tenant_repository.get_subscription_period(period_id=period_id)
        if not period or str(period.get("tenant_id") or "") != tenant_id:
            return _error_response(
                AppError(
                    code="invoice_not_found",
                    message="The requested tenant invoice could not be found.",
                    status_code=404,
                ),
                tenant_id=tenant_id,
                actor_context=None,
            )

        updated_period = await tenant_repository.update_subscription_period_status(
            period_id=period_id,
            status="paid",
        )
        audit_repository = AuditLogRepository(RepositoryContext(session=session, tenant_id=tenant_id))
        await audit_repository.append_entry(
            tenant_id=tenant_id,
            event_type="tenant.billing.invoice_marked_paid",
            entity_type="invoice",
            entity_id=invoice_id,
            actor_type="tenant_app",
            actor_id=str(tenant_session.get("email") or ""),
            payload={
                "summary": "Tenant invoice was marked paid from the tenant portal.",
                "invoice_id": invoice_id,
                "period_id": period_id,
                "status": updated_period.get("status") if updated_period else "paid",
            },
        )
        await session.commit()
        billing = await build_tenant_billing_snapshot(session, tenant_ref=tenant_ref or tenant_id)
        onboarding = await build_tenant_onboarding_snapshot(session, tenant_ref=tenant_ref or tenant_id)

    return _success_response(
        {
            "billing": billing,
            "onboarding": onboarding,
        },
        tenant_id=tenant_id,
        actor_context=ActorContextPayload(
            channel="tenant_app",
            tenant_id=tenant_id,
            role=str(membership.get("role") or "tenant_admin"),
            deployment_mode="standalone_app",
        ),
    )


@router.get("/tenant/billing/invoices/{invoice_id}/receipt")
async def tenant_billing_invoice_receipt(
    request: Request,
    invoice_id: str,
    authorization: str | None = Header(default=None),
):
    tenant_ref, tenant_id, tenant_session, membership = await _resolve_tenant_request_context(
        request,
        authorization=authorization,
    )
    if not tenant_session or not membership or not tenant_id:
        return _error_response(
            AppError(
                code="tenant_auth_required",
                message="Sign in with an active tenant account before downloading receipt seams.",
                status_code=401 if not tenant_session else 403,
            ),
            tenant_id=tenant_id,
            actor_context=None,
        )

    async with get_session(request.app.state.session_factory) as session:
        billing = await build_tenant_billing_snapshot(session, tenant_ref=tenant_ref or tenant_id)
        invoice = next((item for item in billing.get("invoices", []) if str(item.get("id")) == invoice_id), None)
        if not invoice:
            return _error_response(
                AppError(
                    code="invoice_not_found",
                    message="The requested tenant invoice could not be found.",
                    status_code=404,
                ),
                tenant_id=tenant_id,
                actor_context=None,
            )
        receipt = build_tenant_invoice_receipt(invoice, tenant=billing.get("tenant", {}), billing=billing)

    return _success_response(
        receipt,
        tenant_id=tenant_id,
        actor_context=ActorContextPayload(
            channel="tenant_app",
            tenant_id=tenant_id,
            role=_membership_role(membership),
            deployment_mode="standalone_app",
        ),
    )


@router.get("/tenant/onboarding")
async def tenant_onboarding(request: Request, authorization: str | None = Header(default=None)):
    tenant_ref, tenant_id, tenant_session, _membership = await _resolve_tenant_request_context(
        request,
        authorization=authorization,
    )
    async with get_session(request.app.state.session_factory) as session:
        if not tenant_id:
            return _error_response(
                AppError(
                    code="tenant_not_found",
                    message="The requested tenant could not be resolved.",
                    status_code=404,
                    details={"tenant_ref": tenant_ref},
                ),
                tenant_id=None,
                actor_context=None,
            )

        snapshot = await build_tenant_onboarding_snapshot(session, tenant_ref=tenant_ref or tenant_id)
    return _success_response(
        snapshot,
        tenant_id=tenant_id,
        actor_context=ActorContextPayload(
            channel="tenant_app",
            tenant_id=tenant_id,
            role="tenant_admin" if tenant_session else "tenant_preview",
            deployment_mode="standalone_app",
        ),
    )


@router.get("/tenant/team")
async def tenant_team(request: Request, authorization: str | None = Header(default=None)):
    tenant_ref, tenant_id, tenant_session, membership = await _resolve_tenant_request_context(
        request,
        authorization=authorization,
    )
    async with get_session(request.app.state.session_factory) as session:
        if not tenant_id:
            return _error_response(
                AppError(
                    code="tenant_not_found",
                    message="The requested tenant could not be resolved.",
                    status_code=404,
                    details={"tenant_ref": tenant_ref},
                ),
                tenant_id=None,
                actor_context=None,
            )

        snapshot = await build_tenant_team_snapshot(session, tenant_ref=tenant_ref or tenant_id)
        snapshot["access"] = {
            "current_role": _membership_role(membership) if tenant_session else "tenant_preview",
            "can_manage_team": bool(tenant_session and _membership_role(membership) in TENANT_TEAM_MANAGE_ROLES),
            "can_manage_billing": bool(tenant_session and _membership_role(membership) in TENANT_BILLING_WRITE_ROLES),
        }
    return _success_response(
        snapshot,
        tenant_id=tenant_id,
        actor_context=ActorContextPayload(
            channel="tenant_app",
            tenant_id=tenant_id,
            role=_membership_role(membership) if tenant_session else "tenant_preview",
            deployment_mode="standalone_app",
        ),
    )


@router.patch("/tenant/profile")
async def tenant_profile_update(
    request: Request,
    payload: TenantProfileUpdateRequestPayload,
    authorization: str | None = Header(default=None),
):
    tenant_ref, tenant_id, tenant_session, membership = await _resolve_tenant_request_context(
        request,
        authorization=authorization,
    )
    if not tenant_session or not membership or not tenant_id:
        return _error_response(
            AppError(
                code="tenant_auth_required",
                message="Sign in with an active tenant account before updating tenant profile details.",
                status_code=401 if not tenant_session else 403,
            ),
            tenant_id=tenant_id,
            actor_context=None,
        )

    async with get_session(request.app.state.session_factory) as session:
        tenant_repository = TenantRepository(RepositoryContext(session=session))
        tenant_profile = await tenant_repository.update_tenant_profile(
            tenant_id=tenant_id,
            name=payload.business_name.strip() if payload.business_name else None,
            industry=payload.industry.strip() if payload.industry is not None else None,
            timezone=payload.timezone.strip() if payload.timezone else None,
            locale=payload.locale.strip() if payload.locale else None,
        )
        if not tenant_profile:
            return _error_response(
                AppError(
                    code="tenant_not_found",
                    message="The tenant profile could not be updated because the tenant was not found.",
                    status_code=404,
                ),
                tenant_id=tenant_id,
                actor_context=None,
            )

        membership_record = (
            await session.execute(
                select(TenantUserMembership).where(
                    TenantUserMembership.tenant_id == tenant_id,
                    TenantUserMembership.email == str(tenant_session.get("email") or "").strip().lower(),
                    TenantUserMembership.status == "active",
                )
            )
        ).scalar_one_or_none()
        if membership_record and payload.operator_full_name is not None:
            membership_record.full_name = payload.operator_full_name.strip() or membership_record.full_name

        workspace_guides = {
            "overview": payload.guide_overview,
            "experience": payload.guide_experience,
            "catalog": payload.guide_catalog,
            "plugin": payload.guide_plugin,
            "bookings": payload.guide_bookings,
            "integrations": payload.guide_integrations,
            "billing": payload.guide_billing,
            "team": payload.guide_team,
        }
        sanitized_guides = {
            key: str(value).strip()
            for key, value in workspace_guides.items()
            if value is not None and str(value).strip()
        }
        workspace_settings: dict[str, object] = {}
        if payload.logo_url is not None and str(payload.logo_url).strip():
            workspace_settings["logo_url"] = str(payload.logo_url).strip()
        if payload.hero_image_url is not None and str(payload.hero_image_url).strip():
            workspace_settings["hero_image_url"] = str(payload.hero_image_url).strip()
        sanitized_intro_html = str(payload.introduction_html or "").strip()
        if sanitized_intro_html:
            workspace_settings["introduction_html"] = sanitized_intro_html.replace("<script", "&lt;script").replace("</script>", "&lt;/script&gt;")
        if sanitized_guides:
            workspace_settings["guides"] = sanitized_guides
        if workspace_settings:
            await tenant_repository.upsert_tenant_settings(
                tenant_id=tenant_id,
                settings_json={"tenant_workspace": workspace_settings},
            )

        audit_repository = AuditLogRepository(RepositoryContext(session=session, tenant_id=tenant_id))
        await audit_repository.append_entry(
            tenant_id=tenant_id,
            event_type="tenant.profile.updated",
            entity_type="tenant_profile",
            entity_id=tenant_id,
            actor_type="tenant_app",
            actor_id=str(tenant_session.get("email") or ""),
            payload={
                "summary": "Tenant business profile updated from the tenant portal.",
                "business_name": tenant_profile.get("name"),
                "industry": tenant_profile.get("industry"),
                "timezone": tenant_profile.get("timezone"),
                "locale": tenant_profile.get("locale"),
                "workspace_fields": sorted(workspace_settings.keys()),
            },
        )

        await session.commit()
        onboarding = await build_tenant_onboarding_snapshot(session, tenant_ref=tenant_ref or tenant_id)

    actor_context = ActorContextPayload(
        channel="tenant_app",
        tenant_id=tenant_id,
        role=str(membership.get("role") or "tenant_admin"),
        deployment_mode="standalone_app",
    )
    return _success_response(
        {
            "tenant": tenant_profile,
            "onboarding": onboarding,
        },
        tenant_id=tenant_id,
        actor_context=actor_context,
    )


@router.post("/tenant/team/invite")
async def tenant_team_invite(
    request: Request,
    payload: TenantInviteMemberRequestPayload,
    authorization: str | None = Header(default=None),
):
    tenant_ref, tenant_id, tenant_session, membership = await _resolve_tenant_request_context(
        request,
        authorization=authorization,
    )
    if not tenant_session or not membership or not tenant_id:
        return _error_response(
            AppError(
                code="tenant_auth_required",
                message="Sign in with an active tenant account before inviting team members.",
                status_code=401 if not tenant_session else 403,
            ),
            tenant_id=tenant_id,
            actor_context=None,
        )
    role_error = _require_tenant_membership_role(
        membership,
        allowed_roles=TENANT_TEAM_MANAGE_ROLES,
        message="Only tenant admins can invite team members or change tenant access roles.",
    )
    if role_error:
        return _error_response(role_error, tenant_id=tenant_id, actor_context=None)

    requested_role = payload.role.strip().lower()
    if requested_role not in TENANT_TEAM_ROLE_CODES:
        return _error_response(
            AppError(
                code="invalid_tenant_role",
                message="Select a valid tenant role before inviting a team member.",
                status_code=422,
                details={"allowed_roles": sorted(TENANT_TEAM_ROLE_CODES)},
            ),
            tenant_id=tenant_id,
            actor_context=None,
        )

    async with get_session(request.app.state.session_factory) as session:
        tenant_repository = TenantRepository(RepositoryContext(session=session, tenant_id=tenant_id))
        tenant_profile = await tenant_repository.get_tenant_profile(tenant_ref or tenant_id)
        member = await tenant_repository.upsert_tenant_member(
            tenant_id=tenant_id,
            tenant_slug=str((tenant_profile or {}).get("slug") or tenant_ref or ""),
            email=payload.email,
            full_name=payload.full_name,
            role=requested_role,
            status="invited",
        )
        tenant_slug = str((tenant_profile or {}).get("slug") or tenant_ref or "").strip()
        tenant_name = str((tenant_profile or {}).get("name") or tenant_slug or "BookedAI tenant").strip()
        invited_by_name = str(tenant_session.get("full_name") or "").strip() or str(
            tenant_session.get("email") or ""
        ).strip()
        invitee_email = str(member.get("email") or payload.email).strip().lower()
        invite_delivery = await _deliver_tenant_invite_email(
            request,
            tenant_name=tenant_name,
            tenant_slug=tenant_slug,
            invitee_email=invitee_email,
            invitee_full_name=str(member.get("full_name") or payload.full_name or "").strip() or None,
            role=requested_role,
            invited_by_name=invited_by_name,
            invited_by_email=str(tenant_session.get("email") or "").strip().lower(),
        )
        audit_repository = AuditLogRepository(RepositoryContext(session=session, tenant_id=tenant_id))
        await audit_repository.append_entry(
            tenant_id=tenant_id,
            event_type="tenant.team.member_invited",
            entity_type="tenant_member",
            entity_id=str(member.get("email") or ""),
            actor_type="tenant_app",
            actor_id=str(tenant_session.get("email") or ""),
            payload={
                "summary": "Tenant team member invited from the tenant portal.",
                "email": member.get("email"),
                "role": member.get("role"),
                "invite_delivery_status": invite_delivery["status"],
                "invite_url": invite_delivery["invite_url"],
            },
        )
        await session.commit()
        snapshot = await build_tenant_team_snapshot(session, tenant_ref=tenant_ref or tenant_id)
        snapshot["access"] = {
            "current_role": _membership_role(membership),
            "can_manage_team": True,
            "can_manage_billing": _membership_role(membership) in TENANT_BILLING_WRITE_ROLES,
        }
        snapshot["invite_delivery"] = {
            "status": invite_delivery["status"],
            "smtp_configured": bool(invite_delivery["smtp_configured"]),
            "recipient_email": invitee_email,
            "role": requested_role,
            "invite_url": str(invite_delivery["invite_url"]),
            "operator_note": str(invite_delivery["operator_note"]),
        }

    return _success_response(
        snapshot,
        tenant_id=tenant_id,
        actor_context=ActorContextPayload(
            channel="tenant_app",
            tenant_id=tenant_id,
            role=_membership_role(membership),
            deployment_mode="standalone_app",
        ),
    )


@router.patch("/tenant/team/members/{member_email}")
async def tenant_team_member_update(
    request: Request,
    member_email: str,
    payload: TenantMemberAccessUpdateRequestPayload,
    authorization: str | None = Header(default=None),
):
    tenant_ref, tenant_id, tenant_session, membership = await _resolve_tenant_request_context(
        request,
        authorization=authorization,
    )
    if not tenant_session or not membership or not tenant_id:
        return _error_response(
            AppError(
                code="tenant_auth_required",
                message="Sign in with an active tenant account before updating team member access.",
                status_code=401 if not tenant_session else 403,
            ),
            tenant_id=tenant_id,
            actor_context=None,
        )
    role_error = _require_tenant_membership_role(
        membership,
        allowed_roles=TENANT_TEAM_MANAGE_ROLES,
        message="Only tenant admins can invite team members or change tenant access roles.",
    )
    if role_error:
        return _error_response(role_error, tenant_id=tenant_id, actor_context=None)

    requested_role = payload.role.strip().lower() if payload.role else None
    if requested_role and requested_role not in TENANT_TEAM_ROLE_CODES:
        return _error_response(
            AppError(
                code="invalid_tenant_role",
                message="Select a valid tenant role before updating member access.",
                status_code=422,
                details={"allowed_roles": sorted(TENANT_TEAM_ROLE_CODES)},
            ),
            tenant_id=tenant_id,
            actor_context=None,
        )

    async with get_session(request.app.state.session_factory) as session:
        tenant_repository = TenantRepository(RepositoryContext(session=session, tenant_id=tenant_id))
        updated_member = await tenant_repository.update_tenant_member_access(
            tenant_id=tenant_id,
            email=member_email,
            role=requested_role,
            status=payload.status.strip().lower() if payload.status else None,
        )
        if not updated_member:
            return _error_response(
                AppError(
                    code="tenant_member_not_found",
                    message="The requested tenant member could not be found.",
                    status_code=404,
                    details={"email": member_email},
                ),
                tenant_id=tenant_id,
                actor_context=None,
            )
        audit_repository = AuditLogRepository(RepositoryContext(session=session, tenant_id=tenant_id))
        await audit_repository.append_entry(
            tenant_id=tenant_id,
            event_type="tenant.team.member_access_updated",
            entity_type="tenant_member",
            entity_id=str(updated_member.get("email") or ""),
            actor_type="tenant_app",
            actor_id=str(tenant_session.get("email") or ""),
            payload={
                "summary": "Tenant team member access updated from the tenant portal.",
                "email": updated_member.get("email"),
                "role": updated_member.get("role"),
                "status": updated_member.get("status"),
            },
        )
        await session.commit()
        snapshot = await build_tenant_team_snapshot(session, tenant_ref=tenant_ref or tenant_id)
        snapshot["access"] = {
            "current_role": _membership_role(membership),
            "can_manage_team": True,
            "can_manage_billing": _membership_role(membership) in TENANT_BILLING_WRITE_ROLES,
        }

    return _success_response(
        snapshot,
        tenant_id=tenant_id,
        actor_context=ActorContextPayload(
            channel="tenant_app",
            tenant_id=tenant_id,
            role=_membership_role(membership),
            deployment_mode="standalone_app",
        ),
    )


@router.post("/tenant/team/members/{member_email}/resend-invite")
async def tenant_team_member_resend_invite(
    request: Request,
    member_email: str,
    authorization: str | None = Header(default=None),
):
    tenant_ref, tenant_id, tenant_session, membership = await _resolve_tenant_request_context(
        request,
        authorization=authorization,
    )
    if not tenant_session or not membership or not tenant_id:
        return _error_response(
            AppError(
                code="tenant_auth_required",
                message="Sign in with an active tenant account before resending tenant invites.",
                status_code=401 if not tenant_session else 403,
            ),
            tenant_id=tenant_id,
            actor_context=None,
        )
    role_error = _require_tenant_membership_role(
        membership,
        allowed_roles=TENANT_TEAM_MANAGE_ROLES,
        message="Only tenant admins can resend tenant invites.",
    )
    if role_error:
        return _error_response(role_error, tenant_id=tenant_id, actor_context=None)

    normalized_email = member_email.strip().lower()
    async with get_session(request.app.state.session_factory) as session:
        tenant_repository = TenantRepository(RepositoryContext(session=session, tenant_id=tenant_id))
        tenant_profile = await tenant_repository.get_tenant_profile(tenant_ref or tenant_id)
        team_snapshot = await build_tenant_team_snapshot(session, tenant_ref=tenant_ref or tenant_id)
        member = next(
            (item for item in team_snapshot.get("members", []) if str(item.get("email") or "").strip().lower() == normalized_email),
            None,
        )
        if not member:
            return _error_response(
                AppError(
                    code="tenant_member_not_found",
                    message="The requested tenant member could not be found.",
                    status_code=404,
                    details={"email": normalized_email},
                ),
                tenant_id=tenant_id,
                actor_context=None,
            )
        if str(member.get("status") or "").strip().lower() != "invited":
            return _error_response(
                AppError(
                    code="tenant_member_not_invited",
                    message="Only members still in invited status can receive a resent invite.",
                    status_code=409,
                    details={"email": normalized_email},
                ),
                tenant_id=tenant_id,
                actor_context=None,
            )

        tenant_slug = str((tenant_profile or {}).get("slug") or tenant_ref or "").strip()
        tenant_name = str((tenant_profile or {}).get("name") or tenant_slug or "BookedAI tenant").strip()
        invited_by_name = str(tenant_session.get("full_name") or "").strip() or str(
            tenant_session.get("email") or ""
        ).strip()
        invite_delivery = await _deliver_tenant_invite_email(
            request,
            tenant_name=tenant_name,
            tenant_slug=tenant_slug,
            invitee_email=normalized_email,
            invitee_full_name=str(member.get("full_name") or "").strip() or None,
            role=str(member.get("role") or "operator"),
            invited_by_name=invited_by_name,
            invited_by_email=str(tenant_session.get("email") or "").strip().lower(),
        )
        audit_repository = AuditLogRepository(RepositoryContext(session=session, tenant_id=tenant_id))
        await audit_repository.append_entry(
            tenant_id=tenant_id,
            event_type="tenant.team.member_invite_resent",
            entity_type="tenant_member",
            entity_id=normalized_email,
            actor_type="tenant_app",
            actor_id=str(tenant_session.get("email") or ""),
            payload={
                "summary": "Tenant invite resent from the tenant portal.",
                "email": normalized_email,
                "role": member.get("role"),
                "invite_delivery_status": invite_delivery["status"],
                "invite_url": invite_delivery["invite_url"],
            },
        )
        await session.commit()
        snapshot = await build_tenant_team_snapshot(session, tenant_ref=tenant_ref or tenant_id)
        snapshot["access"] = {
            "current_role": _membership_role(membership),
            "can_manage_team": True,
            "can_manage_billing": _membership_role(membership) in TENANT_BILLING_WRITE_ROLES,
        }
        snapshot["invite_delivery"] = {
            "status": invite_delivery["status"],
            "smtp_configured": bool(invite_delivery["smtp_configured"]),
            "recipient_email": normalized_email,
            "role": str(member.get("role") or "operator"),
            "invite_url": str(invite_delivery["invite_url"]),
            "operator_note": str(invite_delivery["operator_note"]),
        }

    return _success_response(
        snapshot,
        tenant_id=tenant_id,
        actor_context=ActorContextPayload(
            channel="tenant_app",
            tenant_id=tenant_id,
            role=_membership_role(membership),
            deployment_mode="standalone_app",
        ),
    )


@router.get("/tenant/catalog")
async def tenant_catalog(request: Request, authorization: str | None = Header(default=None)):
    tenant_ref, tenant_id, tenant_session, _membership = await _resolve_tenant_request_context(
        request,
        authorization=authorization,
    )
    async with get_session(request.app.state.session_factory) as session:
        if not tenant_id:
            return _error_response(
                AppError(
                    code="tenant_not_found",
                    message="The requested tenant could not be resolved.",
                    status_code=404,
                    details={"tenant_ref": tenant_ref},
                ),
                tenant_id=None,
                actor_context=None,
            )

        snapshot = await build_tenant_catalog_snapshot(
            session,
            tenant_ref=tenant_ref or tenant_id,
            tenant_user_email=tenant_session["email"] if tenant_session else None,
        )
    return _success_response(
        snapshot,
        tenant_id=tenant_id,
        actor_context=ActorContextPayload(
            channel="tenant_app",
            tenant_id=tenant_id,
            role="tenant_admin" if tenant_session else "tenant_preview",
            deployment_mode="standalone_app",
        ),
    )


@router.get("/portal/bookings/{booking_reference}")
async def portal_booking_detail(booking_reference: str, request: Request):
    async with get_session(request.app.state.session_factory) as session:
        snapshot = await build_portal_booking_snapshot(
            session,
            booking_reference=booking_reference,
        )

    if not snapshot:
        return _error_response(
            AppError(
                code="portal_booking_not_found",
                message="The requested booking reference could not be found for the customer portal.",
                status_code=404,
                details={"booking_reference": booking_reference},
            ),
            tenant_id=None,
            actor_context=None,
        )

    return _success_response(snapshot, tenant_id=None, actor_context=None)


@router.post("/portal/bookings/{booking_reference}/reschedule-request")
async def portal_booking_reschedule_request(
    booking_reference: str,
    request: Request,
    payload: PortalBookingActionRequestPayload,
):
    if not (payload.customer_note or payload.preferred_date or payload.preferred_time):
        return _error_response(
            ValidationAppError(
                "Please provide a note or a preferred new schedule before submitting a reschedule request.",
                details={"customer_note": ["note or preferred schedule is required"]},
            ),
            tenant_id=None,
            actor_context=None,
        )

    async with get_session(request.app.state.session_factory) as session:
        result = await queue_portal_booking_request(
            session,
            booking_reference=booking_reference,
            request_type="reschedule_request",
            customer_note=payload.customer_note,
            preferred_date=payload.preferred_date,
            preferred_time=payload.preferred_time,
            timezone=payload.timezone,
        )
        if not result:
            return _error_response(
                AppError(
                    code="portal_booking_not_found",
                    message="The requested booking reference could not be found for the customer portal.",
                    status_code=404,
                    details={"booking_reference": booking_reference},
                ),
                tenant_id=None,
                actor_context=None,
            )
        await session.commit()

    return _success_response(result, tenant_id=None, actor_context=None)


@router.post("/portal/bookings/{booking_reference}/cancel-request")
async def portal_booking_cancel_request(
    booking_reference: str,
    request: Request,
    payload: PortalBookingActionRequestPayload,
):
    if not payload.customer_note:
        return _error_response(
            ValidationAppError(
                "Please provide a brief note before submitting a cancellation request.",
                details={"customer_note": ["cancellation note is required"]},
            ),
            tenant_id=None,
            actor_context=None,
        )

    async with get_session(request.app.state.session_factory) as session:
        result = await queue_portal_booking_request(
            session,
            booking_reference=booking_reference,
            request_type="cancel_request",
            customer_note=payload.customer_note,
            preferred_date=None,
            preferred_time=None,
            timezone=payload.timezone,
        )
        if not result:
            return _error_response(
                AppError(
                    code="portal_booking_not_found",
                    message="The requested booking reference could not be found for the customer portal.",
                    status_code=404,
                    details={"booking_reference": booking_reference},
                ),
                tenant_id=None,
                actor_context=None,
            )
        await session.commit()

    return _success_response(result, tenant_id=None, actor_context=None)


@router.post("/tenant/catalog/import-website")
async def tenant_catalog_import_website(
    request: Request,
    payload: TenantCatalogImportRequestPayload,
    authorization: str | None = Header(default=None),
):
    tenant_ref, tenant_id, tenant_session, membership = await _resolve_tenant_request_context(
        request,
        authorization=authorization,
    )
    if not tenant_session or not membership:
        return _error_response(
            AppError(
                code="tenant_auth_required",
                message="Sign in with the tenant Google account and an active tenant membership before importing catalog data.",
                status_code=401 if not tenant_session else 403,
            ),
            tenant_id=tenant_id,
            actor_context=None,
        )
    role_error = _require_tenant_membership_role(
        membership,
        allowed_roles=TENANT_CATALOG_WRITE_ROLES,
        message="Only tenant admins and operators can import or edit tenant catalog records.",
    )
    if role_error:
        return _error_response(role_error, tenant_id=tenant_id, actor_context=None)

    if not tenant_id:
        return _error_response(
            AppError(
                code="tenant_not_found",
                message="The requested tenant could not be resolved.",
                status_code=404,
                details={"tenant_ref": tenant_ref},
            ),
            tenant_id=None,
            actor_context=None,
        )

    openai_service = request.app.state.openai_service
    website_input = payload.website_url.strip()
    website_url = await openai_service.resolve_business_website(
        website_or_query=website_input,
        business_name=payload.business_name,
    )
    if not website_url:
        return _error_response(
            ValidationAppError(
                "tenant_import_website_not_found",
                "Could not find the business website from that URL or business name.",
            ),
            tenant_id=tenant_id,
            actor_context=None,
        )

    combined_focus = " | ".join(
        value for value in [payload.search_focus, payload.location_hint] if value and value.strip()
    ) or None
    extracted = await openai_service.extract_services_from_website(
        website_url=website_url,
        business_name=payload.business_name,
        category_hint=payload.category,
        search_focus=combined_focus,
        required_fields=[
            "service_name",
            "duration_minutes",
            "location",
            "amount_aud",
            "currency_code",
            "display_price",
            "summary",
            "image_url",
            "booking_url",
        ],
    )
    if not extracted:
        return _error_response(
            ValidationAppError(
                "tenant_import_no_services",
                "Could not extract booking-relevant services from that website. Try a clearer service or pricing page.",
            ),
            tenant_id=tenant_id,
            actor_context=None,
        )

    business_name = (payload.business_name or "").strip() or website_url.replace("https://", "").replace("http://", "").split("/")[0]
    business_email = (payload.business_email or tenant_session["email"] or "").strip().lower() or None

    async with get_session(request.app.state.session_factory) as session:
        for item in extracted:
            service_name = str(item.get("name") or "").strip()
            if not service_name:
                continue

            service_id = _slugify_value(f"{business_name}-{service_name}")
            existing = (
                await session.execute(
                    select(ServiceMerchantProfile).where(ServiceMerchantProfile.service_id == service_id)
                )
            ).scalar_one_or_none()

            mapped_values = {
                "service_id": service_id,
                "tenant_id": tenant_id,
                "business_name": business_name,
                "business_email": business_email,
                "owner_email": tenant_session["email"],
                "name": service_name,
                "category": str(item.get("category") or payload.category or "").strip() or None,
                "summary": str(item.get("summary") or "").strip() or None,
                "amount_aud": float(item["amount_aud"]) if item.get("amount_aud") is not None else None,
                "currency_code": str(item.get("currency_code") or "AUD").strip().upper() or "AUD",
                "display_price": str(item.get("display_price") or "").strip() or None,
                "duration_minutes": int(item["duration_minutes"]) if item.get("duration_minutes") is not None else None,
                "venue_name": str(item.get("venue_name") or business_name).strip() or None,
                "location": str(item.get("location") or payload.location_hint or "").strip() or None,
                "map_url": str(item.get("map_url") or "").strip() or None,
                "booking_url": str(item.get("booking_url") or website_url).strip() or None,
                "image_url": str(item.get("image_url") or "").strip() or None,
                "source_url": website_url,
                "tags_json": [str(tag).strip() for tag in item.get("tags", []) if str(tag).strip()],
                "featured": 1 if item.get("featured") else 0,
                "is_active": 0,
                "publish_state": "review",
            }
            mapped_values, _quality_warnings = apply_catalog_quality_gate(mapped_values)
            mapped_values["is_active"] = 0
            mapped_values["publish_state"] = "review"

            if mapped_values["map_url"] is None and (mapped_values["venue_name"] or mapped_values["location"]):
                mapped_values["map_url"] = _build_google_maps_url(
                    mapped_values["venue_name"],
                    mapped_values["location"],
                )

            if existing:
                for key, value in mapped_values.items():
                    setattr(existing, key, value)
            else:
                session.add(ServiceMerchantProfile(**mapped_values))

        await session.commit()
        snapshot = await build_tenant_catalog_snapshot(
            session,
            tenant_ref=tenant_ref or tenant_id,
            tenant_user_email=tenant_session["email"],
        )

    return _success_response(
        snapshot,
        tenant_id=tenant_id,
        actor_context=ActorContextPayload(
            channel="tenant_app",
            tenant_id=tenant_id,
            role="tenant_admin",
            deployment_mode="standalone_app",
        ),
    )


@router.patch("/tenant/catalog/{service_id}")
async def tenant_catalog_update_service(
    service_id: str,
    request: Request,
    payload: TenantCatalogUpdateRequestPayload,
    authorization: str | None = Header(default=None),
):
    tenant_ref, tenant_id, tenant_session, membership = await _resolve_tenant_request_context(
        request,
        authorization=authorization,
    )
    if not tenant_session or not membership or not tenant_id:
        return _error_response(
            AppError(
                code="tenant_auth_required",
                message="An authenticated tenant membership is required before editing catalog services.",
                status_code=401 if not tenant_session else 403,
            ),
            tenant_id=tenant_id,
            actor_context=None,
        )
    role_error = _require_tenant_membership_role(
        membership,
        allowed_roles=TENANT_CATALOG_WRITE_ROLES,
        message="Only tenant admins and operators can import or edit tenant catalog records.",
    )
    if role_error:
        return _error_response(role_error, tenant_id=tenant_id, actor_context=None)

    async with get_session(request.app.state.session_factory) as session:
        tenant_repository = TenantRepository(RepositoryContext(session=session))
        tenant_profile = await tenant_repository.get_tenant_profile(tenant_ref or tenant_id)
        if not tenant_profile:
            return _error_response(
                AppError(
                    code="tenant_not_found",
                    message="The requested tenant could not be resolved.",
                    status_code=404,
                    details={"tenant_ref": tenant_ref},
                ),
                tenant_id=tenant_id,
                actor_context=None,
            )

        try:
            service = await _resolve_tenant_catalog_service(
                session,
                tenant_profile=tenant_profile,
                service_id=service_id,
                tenant_user_email=tenant_session["email"] or "",
            )
        except AppError as error:
            return _error_response(error, tenant_id=tenant_id, actor_context=None)

        _apply_tenant_catalog_update(service, payload)
        quality_warnings = _apply_catalog_quality_to_service(service)
        service.publish_state = "review" if quality_warnings else "draft"
        service.is_active = 0
        await session.commit()
        snapshot = await build_tenant_catalog_snapshot(
            session,
            tenant_ref=tenant_ref or tenant_id,
            tenant_user_email=tenant_session["email"],
        )

    return _success_response(
        snapshot,
        tenant_id=tenant_id,
        actor_context=ActorContextPayload(
            channel="tenant_app",
            tenant_id=tenant_id,
            role="tenant_admin",
            deployment_mode="standalone_app",
        ),
    )


@router.post("/tenant/catalog/{service_id}/publish")
async def tenant_catalog_publish_service(
    service_id: str,
    request: Request,
    authorization: str | None = Header(default=None),
):
    tenant_ref, tenant_id, tenant_session, membership = await _resolve_tenant_request_context(
        request,
        authorization=authorization,
    )
    if not tenant_session or not membership or not tenant_id:
        return _error_response(
            AppError(
                code="tenant_auth_required",
                message="An authenticated tenant membership is required before publishing catalog services.",
                status_code=401 if not tenant_session else 403,
            ),
            tenant_id=tenant_id,
            actor_context=None,
        )
    role_error = _require_tenant_membership_role(
        membership,
        allowed_roles=TENANT_CATALOG_WRITE_ROLES,
        message="Only tenant admins and operators can import or edit tenant catalog records.",
    )
    if role_error:
        return _error_response(role_error, tenant_id=tenant_id, actor_context=None)

    async with get_session(request.app.state.session_factory) as session:
        tenant_repository = TenantRepository(RepositoryContext(session=session))
        tenant_profile = await tenant_repository.get_tenant_profile(tenant_ref or tenant_id)
        if not tenant_profile:
            return _error_response(
                AppError(
                    code="tenant_not_found",
                    message="The requested tenant could not be resolved.",
                    status_code=404,
                    details={"tenant_ref": tenant_ref},
                ),
                tenant_id=tenant_id,
                actor_context=None,
            )

        try:
            service = await _resolve_tenant_catalog_service(
                session,
                tenant_profile=tenant_profile,
                service_id=service_id,
                tenant_user_email=tenant_session["email"] or "",
            )
        except AppError as error:
            return _error_response(error, tenant_id=tenant_id, actor_context=None)

        quality_warnings = _apply_catalog_quality_to_service(service)
        if quality_warnings:
            return _error_response(
                ValidationAppError(
                    "This service cannot be published until booking-critical fields are complete.",
                    details={"quality_warnings": quality_warnings, "service_id": service_id},
                ),
                tenant_id=tenant_id,
                actor_context=None,
            )

        service.publish_state = "published"
        service.is_active = 1
        await session.commit()
        snapshot = await build_tenant_catalog_snapshot(
            session,
            tenant_ref=tenant_ref or tenant_id,
            tenant_user_email=tenant_session["email"],
        )

    return _success_response(
        snapshot,
        tenant_id=tenant_id,
        actor_context=ActorContextPayload(
            channel="tenant_app",
            tenant_id=tenant_id,
            role="tenant_admin",
            deployment_mode="standalone_app",
        ),
    )


@router.post("/tenant/catalog/{service_id}/archive")
async def tenant_catalog_archive_service(
    service_id: str,
    request: Request,
    authorization: str | None = Header(default=None),
):
    tenant_ref, tenant_id, tenant_session, membership = await _resolve_tenant_request_context(
        request,
        authorization=authorization,
    )
    if not tenant_session or not membership or not tenant_id:
        return _error_response(
            AppError(
                code="tenant_auth_required",
                message="An authenticated tenant membership is required before archiving catalog services.",
                status_code=401 if not tenant_session else 403,
            ),
            tenant_id=tenant_id,
            actor_context=None,
        )
    role_error = _require_tenant_membership_role(
        membership,
        allowed_roles=TENANT_CATALOG_WRITE_ROLES,
        message="Only tenant admins and operators can import or edit tenant catalog records.",
    )
    if role_error:
        return _error_response(role_error, tenant_id=tenant_id, actor_context=None)

    async with get_session(request.app.state.session_factory) as session:
        tenant_repository = TenantRepository(RepositoryContext(session=session))
        tenant_profile = await tenant_repository.get_tenant_profile(tenant_ref or tenant_id)
        if not tenant_profile:
            return _error_response(
                AppError(
                    code="tenant_not_found",
                    message="The requested tenant could not be resolved.",
                    status_code=404,
                    details={"tenant_ref": tenant_ref},
                ),
                tenant_id=tenant_id,
                actor_context=None,
            )

        try:
            service = await _resolve_tenant_catalog_service(
                session,
                tenant_profile=tenant_profile,
                service_id=service_id,
                tenant_user_email=tenant_session["email"] or "",
            )
        except AppError as error:
            return _error_response(error, tenant_id=tenant_id, actor_context=None)

        service.publish_state = "archived"
        service.is_active = 0
        await session.commit()
        snapshot = await build_tenant_catalog_snapshot(
            session,
            tenant_ref=tenant_ref or tenant_id,
            tenant_user_email=tenant_session["email"],
        )

    return _success_response(
        snapshot,
        tenant_id=tenant_id,
        actor_context=ActorContextPayload(
            channel="tenant_app",
            tenant_id=tenant_id,
            role="tenant_admin",
            deployment_mode="standalone_app",
        ),
    )


@router.post("/integrations/crm-sync/retry")
async def retry_crm_sync(request: Request, payload: RetryCrmSyncRequestPayload):
    actor_context = payload.actor_context or ActorContextPayload(
        channel="admin",
        role="integration_retry",
        deployment_mode="headless_api",
    )
    tenant_id = await _resolve_tenant_id(request, actor_context)
    async with get_session(request.app.state.session_factory) as session:
        retry_result = await queue_crm_sync_retry(
            session,
            tenant_id=tenant_id or "",
            crm_sync_record_id=payload.crm_sync_record_id,
            reason="api_v1_retry_request",
        )
        await session.commit()
    return _success_response(
        {
            "crm_sync_record_id": retry_result.record_id,
            "sync_status": retry_result.sync_status,
            "warnings": retry_result.warning_codes,
        },
        tenant_id=tenant_id,
        actor_context=actor_context,
    )
