from __future__ import annotations

import base64
import csv
import hashlib
import hmac
import html
import json
import re
import secrets
import unicodedata
from contextlib import asynccontextmanager
from datetime import UTC, datetime, timedelta
from html.parser import HTMLParser
from io import StringIO
from json import JSONDecodeError
from pathlib import Path
from uuid import uuid4

import httpx
from fastapi import APIRouter, FastAPI, File, Header, HTTPException, Request, Response, UploadFile, status
from fastapi.responses import StreamingResponse
from sqlalchemy import desc, func, select, text

from config import Settings, get_settings
from core.customer_booking_contact import DEFAULT_CUSTOMER_BOOKING_SUPPORT_EMAIL
from core.feature_flags import is_flag_enabled
from core.logging import get_logger
from core.session_tokens import (
    SessionTokenError,
    create_admin_session_token,
    verify_admin_session_token,
)
from db import (
    ConversationEvent,
    MessagingChannelSession,
    PartnerProfile,
    ServiceMerchantProfile,
    TenantUserMembership,
    create_engine,
    create_session_factory,
    get_session,
    init_database,
)
from integrations.ai_models import SemanticSearchAdapter
from rate_limit import InMemoryRateLimiter, TooManyRequestsError
from repositories.base import RepositoryContext
from repositories.idempotency_repository import IdempotencyRepository
from repositories.audit_repository import AuditLogRepository
from repositories.tenant_repository import TenantRepository
from repositories.webhook_repository import WebhookEventRepository
from schemas import BookingWorkflowPayload, TawkMessage, TawkWebhookResponse
from schemas import (
    AdminConfigResponse,
    AdminMessagingActionRequest,
    AdminMessagingActionResponse,
    AdminMessagingDetailResponse,
    AdminMessagingListResponse,
    AdminPortalSupportActionRequest,
    AdminPortalSupportActionResponse,
    AdminBookingDetailResponse,
    AdminBookingConfirmationRequest,
    AdminDiscordHandoffRequest,
    AdminDiscordHandoffResponse,
    AdminBookingsResponse,
    AdminApiInventoryResponse,
    AdminLoginRequest,
    AdminOverviewResponse,
    AdminServiceCatalogQualityResponse,
    AdminServiceImportRequest,
    AdminServiceMerchantListResponse,
    AdminTenantCatalogResponse,
    AdminTenantCatalogUpsertRequest,
    AdminTenantDetailResponse,
    AdminTenantListResponse,
    AdminTenantMemberAccessUpdateRequest,
    AdminTenantProfileUpdateRequest,
    AdminSessionResponse,
    BookingAssistantCatalogResponse,
    BookingAssistantChatRequest,
    BookingAssistantChatResponse,
    BookingAssistantSessionRequest,
    BookingAssistantSessionResponse,
    DemoBriefRequest,
    DemoBriefResponse,
    DemoBookingSyncResponse,
    EmailInboxResponse,
    EmailSendRequest,
    EmailSendResponse,
    EmailStatusResponse,
    PartnerProfileListResponse,
    PartnerProfileUpsertRequest,
    DemoBookingRequest,
    DemoBookingResponse,
    PricingConsultationRequest,
    PricingConsultationResponse,
    PublicDemoImportRequest,
    PublicDemoImportResponse,
    PublicDemoImportItem,
    ServiceCatalogItem,
)
from service_layer.admin_presenters import (
    build_booking_record,
    build_partner_item,
    build_service_catalog_item,
    build_service_catalog_quality_counts,
    build_service_merchant_item,
    build_timeline_event,
    filter_booking_records,
    merge_booking_records,
)
from service_layer.catalog_quality_service import apply_catalog_quality_gate
from service_layer.admin_dashboard_service import (
    apply_admin_portal_support_action,
    build_admin_booking_detail_payload,
    build_admin_bookings_payload,
    build_admin_bookings_shadow_summary,
    build_admin_overview_payload,
    send_admin_booking_confirmation_email,
)
from service_layer.admin_messaging_service import (
    apply_admin_message_action,
    build_admin_message_detail_payload,
    build_admin_messaging_payload,
)
from service_layer.communication_service import CommunicationService
from service_layer.discord_bot_service import DiscordBotService
from service_layer.discord_service import DiscordService
from service_layer.booking_mirror_service import dual_write_booking_assistant_session
from service_layer.booking_mirror_service import (
    dual_write_demo_request,
    dual_write_pricing_consultation,
    sync_callback_status_to_mirrors,
)
from service_layer.demo_workflow_service import (
    submit_demo_brief,
    sync_demo_booking_from_brief as sync_demo_booking_from_brief_service,
)
from service_layer.lifecycle_ops_service import (
    orchestrate_booking_followup_sync,
    orchestrate_email_sent_sync,
    orchestrate_lifecycle_email,
)
from service_layer.communication_service import render_bookedai_confirmation_email
from service_layer.messaging_automation_service import MessagingAutomationService
from service_layer.prompt9_semantic_search_service import Prompt9SemanticSearchService
from service_layer.tenant_app_service import (
    build_portal_customer_care_turn,
    infer_portal_request_type_from_message,
    queue_portal_booking_request,
    resolve_customer_care_booking_reference,
)
from services import (
    BookingAssistantService,
    EmailService,
    N8NService,
    OpenAIService,
    PricingService,
    _curate_service_matches,
    _rank_services,
    extract_tawk_message,
    parse_cors_origins,
    purge_expired_whatsapp_conversations,
    resolve_service_image_url,
    store_event,
    verify_bearer_token,
    verify_tawk_signature,
)
from service_layer.upload_service import save_uploaded_file

settings = get_settings()
logger = get_logger("bookedai.api.route_handlers")


def _model_dump_compat(value):
    if hasattr(value, "model_dump"):
        return value.model_dump()
    if hasattr(value, "dict"):
        return value.dict()
    return value


def _json_safe_value(value):
    try:
        return json.loads(json.dumps(value, default=str))
    except (TypeError, ValueError):
        return str(value)


DEFAULT_PARTNER_PROFILES = [
    {
        "name": "Western Sydney Tech Innovators",
        "category": "AI Ecosystem Partner",
        "website_url": "https://www.meetup.com/western-sydney-tech-innovators/",
        "description": "WSTI is a Western Sydney grassroots AI community running practical meetups, project hubs, and startup-friendly events at Western Sydney Startup Hub.",
        "logo_url": "/wsti-logo.webp",
        "image_url": "/wsti-logo.webp",
        "featured": 1,
        "sort_order": 0,
    },
    {
        "name": "Carelogix",
        "category": "Health AI Partner",
        "website_url": None,
        "description": "Carelogix is presented as a healthcare-oriented AI partner on the Bookedai.au ecosystem wall.",
        "logo_url": "https://upload.bookedai.au/images/e26b/bxVyyqW-QH4J9AplLIpe0Q.png",
        "image_url": "https://upload.bookedai.au/images/e26b/bxVyyqW-QH4J9AplLIpe0Q.png",
        "featured": 1,
        "sort_order": 1,
    },
    {
        "name": "ClearPath",
        "category": "AI Partner",
        "website_url": None,
        "description": "ClearPath appears on the Bookedai.au partner wall as part of the current AI and startup partner lineup.",
        "logo_url": "https://upload.bookedai.au/images/8429/c31vEhemWqkAEE5_LWukOg.png",
        "image_url": "https://upload.bookedai.au/images/8429/c31vEhemWqkAEE5_LWukOg.png",
        "featured": 1,
        "sort_order": 2,
    },
    {
        "name": "METALMIND AI",
        "category": "AI Partner",
        "website_url": None,
        "description": "MetalMind AI is featured on the Bookedai.au partner wall as an AI-focused collaborator with cross-border trade positioning.",
        "logo_url": "https://upload.bookedai.au/images/2766/0cbr3ibd6HU7ziF5_J-tEQ.jpg",
        "image_url": "https://upload.bookedai.au/images/2766/0cbr3ibd6HU7ziF5_J-tEQ.jpg",
        "featured": 1,
        "sort_order": 3,
    },
    {
        "name": "NOVO PRINT",
        "category": "Customer Partner",
        "website_url": "https://novoprints.com.au/",
        "description": "NOVO PRINT is a print and signage business serving Australian operators with custom print, branding, and promotional production.",
        "logo_url": "https://upload.bookedai.au/images/a7ec/V0HPc7AinO_gYx7TtFj-qw.jpg",
        "image_url": "https://upload.bookedai.au/images/a7ec/V0HPc7AinO_gYx7TtFj-qw.jpg",
        "featured": 1,
        "sort_order": 4,
    },
    {
        "name": "Future Swim Caringbah",
        "category": "Client Example",
        "website_url": "https://futureswim.com.au/locations/caringbah/",
        "description": "Official swim-school tenant example used to demonstrate nearby kids lesson discovery and enquiry-to-booking flow for parents.",
        "logo_url": "https://images.pexels.com/photos/1263348/pexels-photo-1263348.jpeg?auto=compress&cs=tinysrgb&w=1200",
        "image_url": "https://images.pexels.com/photos/1263348/pexels-photo-1263348.jpeg?auto=compress&cs=tinysrgb&w=1200",
        "featured": 1,
        "sort_order": 5,
    },
    {
        "name": "Zoho for Startups",
        "category": "CRM and Email Partner",
        "website_url": "https://www.zoho.com/startups/",
        "description": "Zoho supports CRM and email operations that help Bookedai.au manage follow-up, customer records, and lifecycle communication.",
        "logo_url": "/partners/zoho-startups.svg",
        "image_url": "/partners/zoho-startups.svg",
        "featured": 1,
        "sort_order": 6,
    },
    {
        "name": "Google for Startups",
        "category": "Cloud and AI Partner",
        "website_url": "https://startup.google.com/",
        "description": "Google for Startups supports the project with cloud infrastructure pathways and Gemini AI experimentation across product and delivery workflows.",
        "logo_url": "/partners/google-startups.svg",
        "image_url": "/partners/google-startups.svg",
        "featured": 1,
        "sort_order": 7,
    },
    {
        "name": "OpenAI for Startups",
        "category": "AI Model Partner",
        "website_url": "https://openai.com/",
        "description": "OpenAI supports Bookedai.au with ChatGPT and API model capabilities that power conversational booking intelligence and assistant orchestration.",
        "logo_url": "/partners/openai-startups.svg",
        "image_url": "/partners/openai-startups.svg",
        "featured": 1,
        "sort_order": 8,
    },
    {
        "name": "Stripe",
        "category": "Payments Partner",
        "website_url": "https://stripe.com/au",
        "description": "Stripe powers checkout, payment state, and commercial handoff so customer conversations can move into paid booking outcomes.",
        "logo_url": "/partners/stripe.svg",
        "image_url": "/partners/stripe.svg",
        "featured": 1,
        "sort_order": 9,
    },
    {
        "name": "n8n",
        "category": "Workflow Partner",
        "website_url": "https://n8n.io/",
        "description": "n8n runs automation across reminders, CRM updates, booking follow-up, and downstream operational workflows.",
        "logo_url": "/partners/n8n.svg",
        "image_url": "/partners/n8n.svg",
        "featured": 1,
        "sort_order": 10,
    },
    {
        "name": "Supabase",
        "category": "Backend Platform Partner",
        "website_url": "https://supabase.com/",
        "description": "Supabase supports authentication, data, storage, and backend service foundations used across the Bookedai.au platform.",
        "logo_url": "/partners/supabase.svg",
        "image_url": "/partners/supabase.svg",
        "featured": 1,
        "sort_order": 11,
    },
    {
        "name": "Codex Property",
        "category": "Housing Partner",
        "website_url": "https://codexproperty.com.au",
        "description": "Codex Property helps Bookedai.au extend the partner network into housing discovery and project consultation journeys.",
        "logo_url": "/partners/codex-property.svg",
        "image_url": "/partners/codex-property.svg",
        "featured": 1,
        "sort_order": 12,
    },
    {
        "name": "Auzland",
        "category": "Housing Partner",
        "website_url": "https://auzland.au/",
        "description": "Auzland supports housing consultations where customers want to discuss suitable projects, locations, and purchase timing.",
        "logo_url": "/partners/auzland.svg",
        "image_url": "/partners/auzland.svg",
        "featured": 1,
        "sort_order": 13,
    },
]

@asynccontextmanager
async def lifespan(app: FastAPI):
    upload_root = Path(settings.upload_base_dir)
    (upload_root / "images").mkdir(parents=True, exist_ok=True)
    (upload_root / "documents").mkdir(parents=True, exist_ok=True)
    (upload_root / "videos").mkdir(parents=True, exist_ok=True)
    engine = create_engine(settings.database_url)
    session_factory = create_session_factory(engine)
    await init_database(engine)
    booking_assistant_service = BookingAssistantService(settings)
    pricing_service = PricingService(settings)
    semantic_search_service = Prompt9SemanticSearchService(SemanticSearchAdapter(settings))
    await seed_default_service_catalog(session_factory, booking_assistant_service)
    await seed_default_partner_profiles(session_factory)
    try:
        async with get_session(session_factory) as _purge_session:
            purged = await purge_expired_whatsapp_conversations(_purge_session)
            if purged:
                logger.info("whatsapp_conversation_purge_complete", extra={"event_type": "whatsapp_conversation_purge", "purged_rows": purged, "tenant_id": None, "status": 0, "route": "startup", "request_id": "", "integration_name": "whatsapp", "conversation_id": "", "booking_reference": "", "job_name": "purge_expired_whatsapp_conversations", "job_id": ""})
    except Exception:
        pass

    app.state.settings = settings
    app.state.db_engine = engine
    app.state.session_factory = session_factory
    app.state.openai_service = OpenAIService(settings)
    app.state.n8n_service = N8NService(settings)
    app.state.email_service = EmailService(settings)
    app.state.communication_service = CommunicationService(settings)
    app.state.discord_bot_service = DiscordBotService(settings)
    app.state.discord_service = DiscordService(settings)
    app.state.booking_assistant_service = booking_assistant_service
    app.state.pricing_service = pricing_service
    app.state.semantic_search_service = semantic_search_service
    app.state.rate_limiter = InMemoryRateLimiter()
    try:
        yield
    finally:
        await engine.dispose()


api = APIRouter(prefix="/api")


def get_client_ip(request: Request) -> str:
    forwarded_for = request.headers.get("cf-connecting-ip") or request.headers.get(
        "x-forwarded-for"
    )
    if forwarded_for:
        return forwarded_for.split(",")[0].strip()
    if request.client and request.client.host:
        return request.client.host
    return "unknown"


def require_admin_token(request: Request, x_admin_token: str | None) -> None:
    require_admin_access(request, x_admin_token=x_admin_token)


def mask_secret(value: str) -> str:
    if not value:
        return ""
    if len(value) <= 8:
        return "***"
    return f"{value[:4]}***{value[-4:]}"


def slugify_value(value: str) -> str:
    normalized = unicodedata.normalize("NFKD", value.lower())
    ascii_value = normalized.encode("ascii", "ignore").decode("ascii")
    return re.sub(r"[^a-z0-9]+", "-", ascii_value).strip("-") or "item"


_WORKSPACE_ALLOWED_TAGS = {
    "a",
    "blockquote",
    "br",
    "em",
    "h1",
    "h2",
    "h3",
    "h4",
    "li",
    "ol",
    "p",
    "strong",
    "ul",
}
_WORKSPACE_ALLOWED_ATTRIBUTES = {
    "a": {"href", "title", "target"},
}
_WORKSPACE_BLOCKED_CONTENT_TAGS = {"embed", "iframe", "math", "noscript", "object", "script", "style", "svg"}
_WORKSPACE_VOID_TAGS = {"br"}


def _is_safe_workspace_href(value: str) -> bool:
    normalized = str(value or "").strip().lower()
    if not normalized:
        return False
    return normalized.startswith(("http://", "https://", "mailto:", "tel:", "/", "#"))


class _WorkspaceHTMLSanitizer(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self._parts: list[str] = []
        self._blocked_depth = 0

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        normalized_tag = tag.lower()
        if normalized_tag in _WORKSPACE_BLOCKED_CONTENT_TAGS:
            self._blocked_depth += 1
            return
        if self._blocked_depth:
            return
        if normalized_tag not in _WORKSPACE_ALLOWED_TAGS:
            return

        allowed_attributes = _WORKSPACE_ALLOWED_ATTRIBUTES.get(normalized_tag, set())
        rendered_attributes: list[str] = []
        target_blank = False
        for name, value in attrs:
            normalized_name = name.lower()
            if normalized_name not in allowed_attributes or value is None:
                continue
            normalized_value = str(value).strip()
            if not normalized_value:
                continue
            if normalized_name == "href" and not _is_safe_workspace_href(normalized_value):
                continue
            if normalized_name == "target":
                if normalized_value not in {"_blank", "_self"}:
                    continue
                target_blank = normalized_value == "_blank"
            rendered_attributes.append(
                f' {normalized_name}="{html.escape(normalized_value, quote=True)}"'
            )

        if normalized_tag == "a":
            if target_blank and ' target="_blank"' not in rendered_attributes:
                rendered_attributes.append(' target="_blank"')
            rendered_attributes.append(' rel="noopener noreferrer"')

        self._parts.append(f"<{normalized_tag}{''.join(rendered_attributes)}>")

    def handle_endtag(self, tag: str) -> None:
        normalized_tag = tag.lower()
        if normalized_tag in _WORKSPACE_BLOCKED_CONTENT_TAGS:
            if self._blocked_depth:
                self._blocked_depth -= 1
            return
        if self._blocked_depth:
            return
        if normalized_tag in _WORKSPACE_ALLOWED_TAGS and normalized_tag not in _WORKSPACE_VOID_TAGS:
            self._parts.append(f"</{normalized_tag}>")

    def handle_data(self, data: str) -> None:
        if self._blocked_depth:
            return
        self._parts.append(html.escape(data))

    def get_html(self) -> str:
        return "".join(self._parts)


def _sanitize_workspace_html(value: str | None) -> str | None:
    normalized = str(value or "").strip()
    if not normalized:
        return None
    sanitizer = _WorkspaceHTMLSanitizer()
    sanitizer.feed(normalized)
    sanitizer.close()
    sanitized = sanitizer.get_html().strip()
    return sanitized or None


def _clean_optional_text(value: object | None) -> str | None:
    normalized = str(value or "").strip()
    return normalized or None


def _admin_build_tenant_list_item(row: dict[str, object | None]) -> dict[str, object | None]:
    return {
        "id": str(row.get("id") or ""),
        "slug": str(row.get("slug") or ""),
        "name": str(row.get("name") or ""),
        "status": str(row.get("status") or "active"),
        "timezone": _clean_optional_text(row.get("timezone")),
        "locale": _clean_optional_text(row.get("locale")),
        "industry": _clean_optional_text(row.get("industry")),
        "active_memberships": int(row.get("active_memberships") or 0),
        "total_services": int(row.get("total_services") or 0),
        "published_services": int(row.get("published_services") or 0),
        "updated_at": _clean_optional_text(row.get("updated_at")),
    }


async def _admin_list_tenants(session) -> list[dict[str, object | None]]:
    result = await session.execute(
        text(
            """
            select
              t.id::text as id,
              t.slug,
              t.name,
              t.status,
              t.timezone,
              t.locale,
              t.industry,
              t.updated_at::text as updated_at,
              coalesce(m.active_memberships, 0) as active_memberships,
              coalesce(s.total_services, 0) as total_services,
              coalesce(s.published_services, 0) as published_services
            from tenants t
            left join lateral (
              select count(*)::int as active_memberships
              from tenant_user_memberships tum
              where tum.tenant_id = t.id::text
                and tum.status = 'active'
            ) m on true
            left join lateral (
              select
                count(*)::int as total_services,
                count(*) filter (
                  where coalesce(smp.publish_state, 'draft') = 'published'
                )::int as published_services
              from service_merchant_profiles smp
              where smp.tenant_id = t.id::text
            ) s on true
            order by t.name asc, t.slug asc
            """
        )
    )
    return [_admin_build_tenant_list_item(dict(row)) for row in result.mappings().all()]


async def _admin_get_tenant_detail_payload(session, tenant_ref: str) -> dict[str, object]:
    tenant_repository = TenantRepository(RepositoryContext(session=session))
    tenant_profile = await tenant_repository.get_tenant_profile(tenant_ref)
    if not tenant_profile:
        raise HTTPException(status_code=404, detail="Tenant was not found")

    tenant_id = str(tenant_profile.get("id") or "")
    tenant_list_items = await _admin_list_tenants(session)
    tenant_item = next((item for item in tenant_list_items if item["id"] == tenant_id), None)
    if tenant_item is None:
        tenant_item = {
            **tenant_profile,
            "active_memberships": 0,
            "total_services": 0,
            "published_services": 0,
            "updated_at": None,
        }

    settings = await tenant_repository.get_tenant_settings(tenant_id)
    workspace = settings.get("tenant_workspace") if isinstance(settings.get("tenant_workspace"), dict) else {}
    guides = workspace.get("guides") if isinstance(workspace.get("guides"), dict) else {}
    members = await tenant_repository.list_tenant_members(tenant_id)
    services = (
        await session.execute(
            select(ServiceMerchantProfile)
            .where(ServiceMerchantProfile.tenant_id == tenant_id)
            .order_by(
                desc(ServiceMerchantProfile.featured),
                ServiceMerchantProfile.name.asc(),
            )
        )
    ).scalars().all()

    return {
        "status": "ok",
        "tenant": tenant_item,
        "workspace": {
            "logo_url": _clean_optional_text(workspace.get("logo_url")),
            "hero_image_url": _clean_optional_text(workspace.get("hero_image_url")),
            "introduction_html": _sanitize_workspace_html(
                _clean_optional_text(workspace.get("introduction_html"))
            ),
            "guides": {
                "overview": _clean_optional_text(guides.get("overview")),
                "experience": _clean_optional_text(guides.get("experience")),
                "catalog": _clean_optional_text(guides.get("catalog")),
                "plugin": _clean_optional_text(guides.get("plugin")),
                "bookings": _clean_optional_text(guides.get("bookings")),
                "integrations": _clean_optional_text(guides.get("integrations")),
                "billing": _clean_optional_text(guides.get("billing")),
                "team": _clean_optional_text(guides.get("team")),
            },
        },
        "members": [
            {
                "email": str(item.get("email") or ""),
                "full_name": _clean_optional_text(item.get("full_name")),
                "role": str(item.get("role") or "operator"),
                "status": str(item.get("status") or "active"),
                "auth_provider": _clean_optional_text(item.get("auth_provider")),
                "created_at": _clean_optional_text(item.get("created_at")),
                "updated_at": _clean_optional_text(item.get("updated_at")),
            }
            for item in members
        ],
        "services": [build_service_merchant_item(item) for item in services],
    }


def _normalize_whatsapp_phone(value: str | None) -> str | None:
    raw_value = str(value or "").strip()
    if not raw_value:
        return None
    if raw_value.startswith("whatsapp:"):
        raw_value = raw_value.removeprefix("whatsapp:")
    digits = re.sub(r"[^\d+]", "", raw_value)
    if not digits:
        return None
    if digits.startswith("+"):
        return digits
    return f"+{digits}"


def _build_whatsapp_event_text(body: str | None, *, message_type: str | None = None) -> str:
    normalized_body = str(body or "").strip()
    if normalized_body:
        return normalized_body
    normalized_type = str(message_type or "").strip().lower()
    if normalized_type:
        return f"[WhatsApp {normalized_type} message]"
    return "[WhatsApp message]"


def _extract_twilio_whatsapp_payload(payload: dict[str, object]) -> tuple[TawkMessage, dict[str, object]]:
    sender_phone = _normalize_whatsapp_phone(
        str(payload.get("WaId") or payload.get("From") or "").strip()
    )
    to_phone = _normalize_whatsapp_phone(str(payload.get("To") or "").strip())
    profile_name = str(payload.get("ProfileName") or payload.get("From") or "").strip() or None
    provider_message_id = str(payload.get("MessageSid") or "").strip() or None
    conversation_id = (
        str(payload.get("ConversationSid") or "").strip()
        or sender_phone
        or provider_message_id
        or f"whatsapp-{uuid4().hex[:12]}"
    )
    body = _build_whatsapp_event_text(str(payload.get("Body") or "").strip(), message_type="text")
    message = TawkMessage(
        conversation_id=conversation_id,
        message_id=provider_message_id,
        text=body,
        sender_name=profile_name,
        sender_phone=sender_phone,
        metadata={
            "channel": "whatsapp",
            "provider": "twilio",
        },
    )
    metadata = {
        "channel": "whatsapp",
        "provider": "twilio",
        "direction": "inbound",
        "provider_message_id": provider_message_id,
        "sender_phone": sender_phone,
        "to": to_phone,
        "wa_id": str(payload.get("WaId") or "").strip() or None,
        "profile_name": profile_name,
        "raw_payload": payload,
    }
    return message, metadata


def _extract_telegram_payload(payload: dict[str, object]) -> tuple[TawkMessage, dict[str, object]] | None:
    callback_query = payload.get("callback_query")
    raw_message = payload.get("message") or payload.get("edited_message")
    callback_data = ""
    if isinstance(callback_query, dict):
        raw_callback_message = callback_query.get("message")
        if isinstance(raw_callback_message, dict):
            raw_message = raw_callback_message
        callback_data = str(callback_query.get("data") or "").strip()
    if not isinstance(raw_message, dict):
        return None
    chat = raw_message.get("chat")
    sender = callback_query.get("from") if isinstance(callback_query, dict) else raw_message.get("from")
    if not isinstance(chat, dict):
        return None
    if not isinstance(sender, dict):
        sender = {}

    chat_id = str(chat.get("id") or "").strip()
    if not chat_id:
        return None
    text_value = str(raw_message.get("text") or raw_message.get("caption") or "").strip()
    start_command_kind: str | None = None
    start_command_payload: str | None = None
    if text_value.startswith("/start"):
        start_payload = text_value.split(maxsplit=1)[1].strip() if " " in text_value else ""
        start_command_payload = start_payload or None
        if start_payload.startswith("bk."):
            booking_reference = start_payload[3:].strip()
            if booking_reference:
                start_command_kind = "booking_reference"
                text_value = (
                    f"My booking reference is {booking_reference}. "
                    "I need help with this booking."
                )
        elif start_payload.startswith("svc."):
            service_context = start_payload[4:].strip().replace("-", " ")
            if service_context:
                start_command_kind = "service_search"
                text_value = f"Find {service_context}"
            else:
                start_command_kind = "welcome"
                text_value = ""
        elif start_payload:
            start_command_kind = "generic"
            text_value = "I need help with my booking."
        else:
            start_command_kind = "welcome"
            text_value = ""
    if callback_data:
        text_value = callback_data
    user_location: dict[str, object] | None = None
    location_payload = raw_message.get("location")
    if isinstance(location_payload, dict):
        latitude = location_payload.get("latitude")
        longitude = location_payload.get("longitude")
        if isinstance(latitude, (int, float)) and isinstance(longitude, (int, float)):
            user_location = {"latitude": float(latitude), "longitude": float(longitude)}
            if not text_value:
                text_value = "Find more on Internet near me"
    if not text_value:
        text_value = "[Telegram message]"
    first_name = str(sender.get("first_name") or "").strip()
    last_name = str(sender.get("last_name") or "").strip()
    username = str(sender.get("username") or "").strip()
    sender_name = " ".join(part for part in (first_name, last_name) if part).strip() or username or None
    language_code = str(sender.get("language_code") or "").strip().lower() or None
    provider_message_id = str(raw_message.get("message_id") or "").strip() or None
    conversation_id = f"telegram:{chat_id}"
    message = TawkMessage(
        conversation_id=conversation_id,
        message_id=provider_message_id,
        text=text_value,
        sender_name=sender_name,
        metadata={
            "channel": "telegram",
            "provider": "telegram_bot",
        },
    )
    metadata: dict[str, object] = {
        "channel": "telegram",
        "provider": "telegram_bot",
        "direction": "inbound",
        "provider_message_id": provider_message_id,
        "conversation_id": conversation_id,
        "telegram_chat_id": chat_id,
        "telegram_user_id": str(sender.get("id") or "").strip() or None,
        "telegram_username": username or None,
        "telegram_language_code": language_code,
        "chat_type": str(chat.get("type") or "").strip() or None,
        "telegram_callback_query_id": (
            str(callback_query.get("id") or "").strip()
            if isinstance(callback_query, dict) and str(callback_query.get("id") or "").strip()
            else None
        ),
        "callback_data": callback_data or None,
        "start_command_kind": start_command_kind,
        "start_command_payload": start_command_payload,
        "user_location": user_location,
        "raw_payload": raw_message,
    }
    return message, metadata


def _customer_telegram_webhook_secret(settings_obj: object) -> str:
    return (
        str(getattr(settings_obj, "bookedai_customer_telegram_webhook_secret_token", "") or "").strip()
        or str(getattr(settings_obj, "telegram_webhook_secret_token", "") or "").strip()
    )


def _normalize_sha256_signature_header(value: str) -> str:
    normalized = str(value or "").strip()
    if normalized.lower().startswith("sha256="):
        normalized = normalized.split("=", 1)[1].strip()
    return normalized.lower()


def _verify_hmac_sha256_signature(*, body: bytes, secret: str, received_signature: str) -> bool:
    normalized_secret = str(secret or "").strip()
    normalized_received = _normalize_sha256_signature_header(received_signature)
    if not normalized_secret or not normalized_received:
        return False
    expected = hmac.new(normalized_secret.encode("utf-8"), body, hashlib.sha256).hexdigest()
    return hmac.compare_digest(normalized_received, expected)


async def _verify_evolution_webhook_signature(request: Request) -> None:
    expected_secret = str(
        getattr(request.app.state.settings, "whatsapp_evolution_webhook_secret", "") or ""
    ).strip()
    if not expected_secret:
        return
    received_signature = (
        request.headers.get("x-bookedai-signature")
        or request.headers.get("x-hub-signature-256")
        or ""
    )
    if not _verify_hmac_sha256_signature(
        body=await request.body(),
        secret=expected_secret,
        received_signature=received_signature,
    ):
        raise HTTPException(status_code=403, detail="Evolution webhook signature mismatch")


def _iter_meta_whatsapp_payload(
    payload: dict[str, object],
) -> list[tuple[TawkMessage, dict[str, object]]]:
    normalized_messages: list[tuple[TawkMessage, dict[str, object]]] = []
    entries = payload.get("entry")
    if not isinstance(entries, list):
        return normalized_messages

    for entry in entries:
        if not isinstance(entry, dict):
            continue
        changes = entry.get("changes")
        if not isinstance(changes, list):
            continue
        for change in changes:
            if not isinstance(change, dict):
                continue
            value = change.get("value")
            if not isinstance(value, dict):
                continue
            contacts = value.get("contacts")
            contact = contacts[0] if isinstance(contacts, list) and contacts else {}
            profile = contact.get("profile") if isinstance(contact, dict) else {}
            metadata = value.get("metadata") if isinstance(value.get("metadata"), dict) else {}
            inbound_messages = value.get("messages")
            if not isinstance(inbound_messages, list):
                continue

            for inbound_message in inbound_messages:
                if not isinstance(inbound_message, dict):
                    continue
                message_type = str(inbound_message.get("type") or "").strip().lower() or None
                sender_phone = _normalize_whatsapp_phone(
                    str(inbound_message.get("from") or contact.get("wa_id") or "").strip()
                )
                profile_name = (
                    str(profile.get("name") or contact.get("wa_id") or "").strip() or None
                )
                provider_message_id = str(inbound_message.get("id") or "").strip() or None
                text_payload = inbound_message.get("text")
                body = None
                if isinstance(text_payload, dict):
                    body = text_payload.get("body")
                conversation_id = (
                    sender_phone
                    or provider_message_id
                    or f"whatsapp-{uuid4().hex[:12]}"
                )
                normalized_messages.append(
                    (
                        TawkMessage(
                            conversation_id=conversation_id,
                            message_id=provider_message_id,
                            text=_build_whatsapp_event_text(body, message_type=message_type),
                            sender_name=profile_name,
                            sender_phone=sender_phone,
                            metadata={
                                "channel": "whatsapp",
                                "provider": "meta",
                            },
                        ),
                        {
                            "channel": "whatsapp",
                            "provider": "meta",
                            "direction": "inbound",
                            "provider_message_id": provider_message_id,
                            "sender_phone": sender_phone,
                            "profile_name": profile_name,
                            "phone_number_id": metadata.get("phone_number_id"),
                            "display_phone_number": metadata.get("display_phone_number"),
                            "message_type": message_type,
                            "raw_payload": inbound_message,
                        },
                    )
                )
    return normalized_messages


async def _register_whatsapp_webhook_event(
    session,
    *,
    provider: str,
    external_event_id: str | None,
    payload: dict[str, object],
) -> tuple[bool, int | None, str | None]:
    return await _register_inbound_webhook_event(
        session,
        channel="whatsapp",
        provider=provider,
        external_event_id=external_event_id,
        payload=payload,
        route="/api/webhooks/whatsapp",
    )


async def _register_inbound_webhook_event(
    session,
    *,
    channel: str,
    provider: str,
    external_event_id: str | None,
    payload: dict[str, object],
    route: str,
) -> tuple[bool, int | None, str | None]:
    normalized_channel = channel.strip() or "webhook"
    normalized_provider = provider.strip() or "unknown"
    try:
        tenant_repository = TenantRepository(RepositoryContext(session=session))
        tenant_id = await tenant_repository.get_default_tenant_id()
        idempotency_repository = IdempotencyRepository(
            RepositoryContext(session=session, tenant_id=tenant_id)
        )
        webhook_repository = WebhookEventRepository(
            RepositoryContext(session=session, tenant_id=tenant_id)
        )

        if external_event_id:
            reservation = await idempotency_repository.reserve_key(
                tenant_id=tenant_id,
                scope=f"{normalized_channel}_inbound:{normalized_provider}",
                idempotency_key=external_event_id,
                response_json={"status": "received"},
            )
            if not reservation.get("created"):
                return False, None, tenant_id

        event_id = await webhook_repository.record_event(
            tenant_id=tenant_id,
            provider=f"{normalized_channel}_{normalized_provider}",
            external_event_id=external_event_id,
            payload=payload,
        )
        return True, event_id, tenant_id
    except Exception as exc:
        logger.warning(
            "inbound_webhook_foundation_record_failed",
            extra={
                "event_type": "inbound_webhook_foundation_record_failed",
                "tenant_id": None,
                "status": 0,
                "route": route,
                "request_id": "",
                "integration_name": normalized_channel,
                "conversation_id": "",
                "booking_reference": "",
                "job_name": "",
                "job_id": "",
            },
            exc_info=exc,
        )
        return True, None, None


async def _complete_whatsapp_webhook_event(
    session,
    *,
    event_id: int | None,
    tenant_id: str | None,
    provider: str,
    external_event_id: str | None,
    response_payload: dict[str, object],
) -> None:
    await _complete_inbound_webhook_event(
        session,
        event_id=event_id,
        tenant_id=tenant_id,
        channel="whatsapp",
        provider=provider,
        external_event_id=external_event_id,
        response_payload=response_payload,
        route="/api/webhooks/whatsapp",
    )


async def _complete_inbound_webhook_event(
    session,
    *,
    event_id: int | None,
    tenant_id: str | None,
    channel: str,
    provider: str,
    external_event_id: str | None,
    response_payload: dict[str, object],
    route: str,
) -> None:
    normalized_channel = channel.strip() or "webhook"
    normalized_provider = provider.strip() or "unknown"
    try:
        if event_id is not None:
            webhook_repository = WebhookEventRepository(
                RepositoryContext(session=session, tenant_id=tenant_id)
            )
            await webhook_repository.mark_processed(event_id, status="processed")

        if external_event_id:
            idempotency_repository = IdempotencyRepository(
                RepositoryContext(session=session, tenant_id=tenant_id)
            )
            await idempotency_repository.record_response(
                scope=f"{normalized_channel}_inbound:{normalized_provider}",
                idempotency_key=external_event_id,
                response_json=response_payload,
            )
    except Exception as exc:
        logger.warning(
            "inbound_webhook_foundation_complete_failed",
            extra={
                "event_type": "inbound_webhook_foundation_complete_failed",
                "tenant_id": tenant_id,
                "status": 0,
                "route": route,
                "request_id": "",
                "integration_name": normalized_channel,
                "conversation_id": "",
                "booking_reference": "",
                "job_name": "",
                "job_id": "",
            },
            exc_info=exc,
        )


async def _load_whatsapp_conversation_history(
    session,
    *,
    phone: str,
    limit: int = 10,
) -> list[dict[str, object]]:
    from datetime import UTC, datetime, timedelta
    cutoff = datetime.now(UTC) - timedelta(days=60)
    result = await session.execute(
        select(ConversationEvent)
        .where(ConversationEvent.source == "whatsapp")
        .where(ConversationEvent.conversation_id == phone)
        .where(ConversationEvent.created_at >= cutoff)
        .order_by(desc(ConversationEvent.created_at))
        .limit(limit)
    )
    events = list(reversed(result.scalars().all()))
    turns: list[dict[str, object]] = []
    for ev in events:
        meta = ev.metadata_json if isinstance(ev.metadata_json, dict) else {}
        booking_ref = str(meta.get("booking_reference") or "").strip() or None
        if ev.message_text:
            turns.append({"role": "customer", "text": ev.message_text, "booking_reference": booking_ref})
        if ev.ai_reply:
            turns.append({"role": "assistant", "text": ev.ai_reply, "booking_reference": booking_ref})
    return turns


def _format_conversation_history_for_context(history: list[dict[str, object]]) -> str:
    if not history:
        return ""
    lines = ["[Prior conversation:"]
    for turn in history[-6:]:
        role = str(turn.get("role") or "").capitalize()
        text = str(turn.get("text") or "").strip()
        if text:
            lines.append(f"  {role}: {text}")
    lines.append("]")
    return "\n".join(lines)


def _is_whatsapp_booking_intake_intent(message: str) -> bool:
    normalized = unicodedata.normalize("NFKD", str(message or "").strip().lower())
    ascii_text = "".join(ch for ch in normalized if not unicodedata.combining(ch))
    booking_terms = {
        "book",
        "booking",
        "appointment",
        "reserve",
        "reservation",
        "schedule",
        "dat lich",
        "dat cho",
        "giu cho",
        "hen lich",
        "muon dat",
        "can dat",
    }
    return any(term in ascii_text for term in booking_terms)


def _build_whatsapp_booking_intake_reply(message: TawkMessage) -> str:
    sender_name = str(message.sender_name or "").strip()
    greeting = f"Hi {sender_name}," if sender_name else "Hi,"
    return (
        f"{greeting} I can help you start a new booking with BookedAI. "
        "Please reply with the service you want, preferred day/time, suburb or online preference, "
        "and your name/email if you want a confirmation sent. "
        "If you already booked, send the booking reference and I can check status, payment, "
        "reschedule, or cancellation options. You can also continue at https://bookedai.au."
    )


async def _build_whatsapp_customer_care_response(
    session,
    *,
    message: TawkMessage,
    metadata: dict[str, object],
) -> tuple[str | None, dict[str, object]]:
    sender_phone = str(metadata.get("sender_phone") or message.sender_phone or "").strip() or None

    history: list[dict[str, object]] = []
    if sender_phone:
        try:
            history = await _load_whatsapp_conversation_history(session, phone=sender_phone)
        except Exception:
            history = []

    prior_booking_reference: str | None = None
    for turn in reversed(history):
        ref = str(turn.get("booking_reference") or "").strip()
        if ref:
            prior_booking_reference = ref
            break

    resolution = await resolve_customer_care_booking_reference(
        session,
        message=message.text,
        customer_phone=sender_phone,
        customer_email=message.sender_email,
    )
    booking_reference = str(resolution.get("booking_reference") or prior_booking_reference or "").strip()
    if not booking_reference:
        if _is_whatsapp_booking_intake_intent(message.text):
            return (
                _build_whatsapp_booking_intake_reply(message),
                {
                    "customer_care_status": "booking_intake",
                    "booking_resolution": resolution,
                    "booking_intake": {
                        "source": "whatsapp",
                        "requested_service_text": message.text,
                        "sender_phone": sender_phone,
                    },
                },
            )
        if resolution.get("resolved_by") == "ambiguous_customer_identity":
            return (
                "I found more than one recent booking for this WhatsApp number. "
                "Please reply with the booking reference so I can answer against the correct booking.",
                {
                    "customer_care_status": "needs_booking_reference",
                    "booking_resolution": resolution,
                },
            )
        return (
            "I can help with booking status, payment, rescheduling, or cancellation. "
            "Please reply with your booking reference so I can look up the exact booking.",
            {
                "customer_care_status": "needs_booking_reference",
                "booking_resolution": resolution,
            },
        )

    history_context = _format_conversation_history_for_context(history)
    enriched_message = f"{history_context}\n{message.text}".strip() if history_context else message.text

    care_turn = await build_portal_customer_care_turn(
        session,
        booking_reference=booking_reference,
        message=enriched_message,
        customer_email=message.sender_email,
        customer_phone=sender_phone,
    )
    if not care_turn:
        return (
            f"I could not open booking {booking_reference}. Please check the reference or contact {DEFAULT_CUSTOMER_BOOKING_SUPPORT_EMAIL}.",
            {
                "customer_care_status": "booking_not_found",
                "booking_reference": booking_reference,
                "booking_resolution": resolution,
            },
        )

    reply = str(care_turn.get("reply") or "").strip()
    request_type = infer_portal_request_type_from_message(message.text)
    queued_request: dict[str, object] | None = None
    if request_type in {"cancel_request", "reschedule_request"}:
        enabled_action_id = "request_cancel" if request_type == "cancel_request" else "request_reschedule"
        action_enabled = any(
            isinstance(action, dict)
            and str(action.get("id") or "") == enabled_action_id
            and bool(action.get("enabled"))
            for action in care_turn.get("next_actions", [])
        )
        if action_enabled:
            queued_request = await queue_portal_booking_request(
                session,
                booking_reference=booking_reference,
                request_type=request_type,
                customer_note=message.text,
                preferred_date=None,
                preferred_time=None,
                timezone=None,
            )
            if queued_request:
                reply += f" {queued_request.get('message')}"

    return (
        reply,
        {
            "customer_care_status": "answered",
            "booking_reference": booking_reference,
            "booking_resolution": resolution,
            "care_turn": care_turn,
            "queued_request": queued_request,
        },
    )


async def _send_whatsapp_customer_care_reply(
    request: Request,
    *,
    to: str | None,
    body: str | None,
) -> dict[str, object] | None:
    if not to or not body or not hasattr(request.app.state, "communication_service"):
        return None
    communication_service: CommunicationService = request.app.state.communication_service
    try:
        result = await communication_service.send_whatsapp(to=to, body=body)
        return {
            "provider": result.provider,
            "delivery_status": result.delivery_status,
            "provider_message_id": result.provider_message_id,
            "warnings": result.warnings or [],
        }
    except Exception as exc:
        logger.warning(
            "whatsapp_customer_care_reply_failed",
            extra={
                "event_type": "whatsapp_customer_care_reply_failed",
                "tenant_id": None,
                "status": 0,
                "route": "/api/webhooks/whatsapp",
                "request_id": "",
                "integration_name": "whatsapp",
                "conversation_id": "",
                "booking_reference": "",
                "job_name": "",
                "job_id": "",
            },
            exc_info=exc,
        )
        return {
            "provider": "whatsapp",
            "delivery_status": "failed",
            "warnings": [str(exc)],
        }


async def _send_messaging_customer_care_reply(
    request: Request,
    *,
    channel: str,
    to: str | None,
    body: str | None,
    reply_markup: dict[str, object] | None = None,
    parse_mode: str | None = None,
) -> dict[str, object] | None:
    if not to or not body or not hasattr(request.app.state, "communication_service"):
        return None
    communication_service: CommunicationService = request.app.state.communication_service
    automation_service = MessagingAutomationService()
    try:
        return await automation_service.send_reply(
            communication_service,
            channel=channel,
            recipient=to,
            body=body,
            reply_markup=reply_markup,
            parse_mode=parse_mode,
        )
    except Exception as exc:
        logger.warning(
            "messaging_customer_care_reply_failed",
            extra={
                "event_type": "messaging_customer_care_reply_failed",
                "tenant_id": None,
                "status": 0,
                "route": f"/api/webhooks/{channel}",
                "request_id": "",
                "integration_name": channel,
                "conversation_id": "",
                "booking_reference": "",
                "job_name": "",
                "job_id": "",
            },
            exc_info=exc,
        )
        return {
            "provider": channel,
            "delivery_status": "failed",
            "warnings": [str(exc)],
        }


def _bookedai_support_telegram_chat_ids(settings_obj: object) -> list[str]:
    raw = str(getattr(settings_obj, "bookedai_support_telegram_chat_ids", "") or "").strip()
    if not raw:
        return []
    return [item.strip() for item in raw.split(",") if item.strip()]


async def _notify_bookedai_support_handoff(
    request: Request,
    *,
    message: TawkMessage,
    metadata: dict[str, object],
) -> dict[str, object] | None:
    chat_ids = _bookedai_support_telegram_chat_ids(request.app.state.settings)
    if not chat_ids or not hasattr(request.app.state, "communication_service"):
        return None
    communication_service: CommunicationService = request.app.state.communication_service
    customer_chat_id = str(metadata.get("telegram_chat_id") or "").strip() or "unknown"
    customer_username = str(metadata.get("telegram_username") or "").strip()
    customer_handle = f"@{customer_username}" if customer_username else customer_chat_id
    sender_name = str(message.sender_name or "").strip() or "Telegram customer"
    message_text = str(message.text or "").strip()[:400]
    body = (
        "BookedAI support handoff requested\n"
        f"Customer: {sender_name} ({customer_handle})\n"
        f"Chat id: {customer_chat_id}\n\n"
        f"Last message:\n{message_text or '[no text]'}\n\n"
        f"Reply via the BookedAI Manager Bot conversation: tg://user?id={customer_chat_id}"
    )
    deliveries: list[dict[str, object]] = []
    for chat_id in chat_ids:
        try:
            result = await communication_service.send_telegram(
                chat_id=chat_id,
                body=body,
            )
            deliveries.append(
                {
                    "chat_id": chat_id,
                    "delivery_status": result.delivery_status,
                    "provider_message_id": result.provider_message_id,
                    "warnings": result.warnings or [],
                }
            )
        except Exception as exc:
            deliveries.append(
                {
                    "chat_id": chat_id,
                    "delivery_status": "failed",
                    "warnings": [str(exc)],
                }
            )
    return {
        "channel": "telegram",
        "targets": len(chat_ids),
        "deliveries": deliveries,
    }


async def _send_telegram_chat_action(
    request: Request,
    *,
    chat_id: str | None,
    action: str = "typing",
) -> dict[str, object] | None:
    if not chat_id or not hasattr(request.app.state, "communication_service"):
        return None
    communication_service: CommunicationService = request.app.state.communication_service
    if not hasattr(communication_service, "send_telegram_chat_action"):
        return None
    try:
        result = await communication_service.send_telegram_chat_action(
            chat_id=chat_id,
            action=action,
        )
        return {
            "provider": result.provider,
            "delivery_status": result.delivery_status,
            "warnings": result.warnings or [],
        }
    except Exception as exc:
        logger.warning(
            "telegram_chat_action_failed",
            extra={
                "event_type": "telegram_chat_action_failed",
                "tenant_id": None,
                "status": 0,
                "route": "/api/webhooks/bookedai-telegram",
                "request_id": "",
                "integration_name": "telegram",
                "conversation_id": "",
                "booking_reference": "",
                "job_name": "",
                "job_id": "",
            },
            exc_info=exc,
        )
        return None


async def _answer_telegram_callback_query(
    request: Request,
    *,
    callback_query_id: str | None,
    text: str | None = None,
) -> dict[str, object] | None:
    if not callback_query_id or not hasattr(request.app.state, "communication_service"):
        return None
    communication_service: CommunicationService = request.app.state.communication_service
    if not hasattr(communication_service, "answer_telegram_callback_query"):
        return None
    try:
        result = await communication_service.answer_telegram_callback_query(
            callback_query_id=callback_query_id,
            text=text,
        )
        return {
            "provider": result.provider,
            "delivery_status": result.delivery_status,
            "provider_message_id": result.provider_message_id,
            "warnings": result.warnings or [],
        }
    except Exception as exc:
        logger.warning(
            "telegram_callback_ack_failed",
            extra={
                "event_type": "telegram_callback_ack_failed",
                "tenant_id": None,
                "status": 0,
                "route": "/api/webhooks/bookedai-telegram",
                "request_id": "",
                "integration_name": "telegram",
                "conversation_id": "",
                "booking_reference": "",
                "job_name": "",
                "job_id": "",
            },
            exc_info=exc,
        )
        return {
            "provider": "telegram_bot",
            "delivery_status": "failed",
            "warnings": [str(exc)],
        }


async def _update_messaging_channel_session_delivery(
    session,
    *,
    channel: str,
    conversation_id: str | None,
    ai_intent: str | None,
    workflow_status: str | None,
    reply_delivery: dict[str, object] | None,
    callback_ack: dict[str, object] | None,
) -> None:
    if not conversation_id:
        return
    try:
        result = await session.execute(
            select(MessagingChannelSession)
            .where(MessagingChannelSession.channel == channel)
            .where(MessagingChannelSession.conversation_id == conversation_id)
        )
        rows = result.scalars().all()
        row = rows[0] if rows else None
        if not row:
            row = MessagingChannelSession(channel=channel, conversation_id=conversation_id)
            session.add(row)
        if ai_intent:
            row.last_ai_intent = ai_intent
        if workflow_status:
            row.last_workflow_status = workflow_status
        if reply_delivery:
            row.last_reply_delivery_json = reply_delivery
        if callback_ack:
            row.last_callback_ack_json = callback_ack
        row.updated_at = func.now()
    except Exception as exc:
        logger.warning(
            "messaging_channel_session_delivery_update_failed",
            extra={
                "event_type": "messaging_channel_session_delivery_update_failed",
                "tenant_id": None,
                "status": 0,
                "route": "/api/webhooks/bookedai-telegram",
                "request_id": "",
                "integration_name": channel,
                "conversation_id": conversation_id or "",
                "booking_reference": "",
                "job_name": "",
                "job_id": "",
            },
            exc_info=exc,
        )


def _build_whatsapp_booking_request_email(
    *,
    queued_request: dict[str, object],
    customer_message: str,
    support_email: str,
) -> tuple[str, str]:
    booking_reference = str(queued_request.get("booking_reference") or "pending").strip()
    request_type = str(queued_request.get("request_type") or "support_request").replace("_", " ")
    customer_name = str(queued_request.get("customer_name") or "there").strip()
    service_name = str(queued_request.get("service_name") or "your booking").strip()
    business_name = str(queued_request.get("business_name") or "BookedAI").strip()
    portal_url = f"https://portal.bookedai.au/?booking_reference={booking_reference}"
    subject = f"BookedAI received your {request_type} for {booking_reference}"
    body = "\n".join(
        [
            f"Hi {customer_name},",
            "",
            f"We received your {request_type} through WhatsApp for {service_name}.",
            f"Booking reference: {booking_reference}",
            f"Handled by: {business_name}",
            "",
            "Your request has been recorded for review. The booking is not treated as changed until the provider or BookedAI confirms the outcome.",
            "",
            f"Customer message: {customer_message.strip()}",
            f"Portal: {portal_url}",
            "",
            f"Need help? Reply to this email or contact {support_email}.",
            "BookedAI",
        ]
    )
    return subject, body


async def _finalize_messaging_queued_request_side_effects(
    request: Request,
    session,
    *,
    queued_request: dict[str, object] | None,
    customer_message: str,
) -> dict[str, object] | None:
    if not queued_request:
        return None

    tenant_id = str(queued_request.get("tenant_id") or "").strip() or None
    customer_email = str(queued_request.get("customer_email") or "").strip().lower()
    booking_business_email = str(
        getattr(request.app.state.settings, "customer_booking_support_email", "")
        or getattr(request.app.state.settings, "booking_business_email", DEFAULT_CUSTOMER_BOOKING_SUPPORT_EMAIL)
        or DEFAULT_CUSTOMER_BOOKING_SUPPORT_EMAIL
    ).strip().lower()
    support_email = (
        str(queued_request.get("support_email") or "").strip().lower()
        or booking_business_email
        or DEFAULT_CUSTOMER_BOOKING_SUPPORT_EMAIL
    )
    cc = [
        value
        for value in {
            support_email,
            booking_business_email or DEFAULT_CUSTOMER_BOOKING_SUPPORT_EMAIL,
        }
        if value and value != customer_email
    ]
    if not tenant_id:
        return {
            "email_confirmation": {
                "delivery_status": "skipped",
                "warnings": ["tenant_id_missing"],
            },
            "crm_sync": {
                "task": {
                    "sync_status": "skipped",
                    "warnings": ["tenant_id_missing"],
                }
            },
        }

    subject, body = _build_whatsapp_booking_request_email(
        queued_request=queued_request,
        customer_message=customer_message,
        support_email=support_email,
    )
    template_key = "bookedai_whatsapp_booking_request"
    delivery_status = "queued"
    warnings: list[str] = []

    if customer_email and hasattr(request.app.state, "email_service"):
        email_service: EmailService = request.app.state.email_service
        if email_service.smtp_configured():
            try:
                await email_service.send_email(
                    to=[customer_email],
                    cc=cc,
                    subject=subject,
                    text=body,
                    html=None,
                )
                delivery_status = "sent"
            except Exception as exc:
                delivery_status = "queued"
                warnings.append(f"email_send_failed:{exc}")
        else:
            warnings.append("smtp_unconfigured")
    else:
        warnings.append("customer_email_missing")

    email_result = await orchestrate_lifecycle_email(
        session,
        tenant_id=tenant_id,
        template_key=template_key,
        subject=subject,
        provider="smtp" if delivery_status == "sent" else "unconfigured",
        delivery_status=delivery_status,
        event_payload={
            "channel": "whatsapp",
            "request_type": queued_request.get("request_type"),
            "booking_reference": queued_request.get("booking_reference"),
            "customer_email_present": bool(customer_email),
            "support_email": support_email,
        },
    )
    crm_sync = await orchestrate_email_sent_sync(
        session,
        tenant_id=tenant_id,
        message_id=email_result.message_id,
        template_key=template_key,
        subject=subject,
        recipient_email=customer_email or support_email,
        provider="smtp" if delivery_status == "sent" else "unconfigured",
        delivery_status=delivery_status,
    )
    return {
        "email_confirmation": {
            "message_id": email_result.message_id,
            "delivery_status": email_result.delivery_status,
            "provider": email_result.provider,
            "warnings": warnings + email_result.warning_codes,
        },
        "crm_sync": {
            "task": {
                "record_id": crm_sync.task_record_id,
                "sync_status": crm_sync.task_sync_status,
                "external_entity_id": crm_sync.task_external_entity_id,
                "warnings": crm_sync.warning_codes,
            }
        },
    }


async def _finalize_messaging_booking_intent_side_effects(
    request: Request,
    session,
    *,
    channel: str,
    booking_intent: dict[str, object] | None,
) -> dict[str, object]:
    booking = booking_intent if isinstance(booking_intent, dict) else {}
    tenant_id = str(booking.get("tenant_id") or "").strip()
    booking_reference = str(booking.get("booking_reference") or "").strip()
    booking_intent_id = str(booking.get("booking_intent_id") or "").strip() or None
    contact_id = str(booking.get("contact_id") or "").strip() or None
    service_name = str(booking.get("service_name") or "BookedAI service").strip() or "BookedAI service"
    customer_name = str(booking.get("customer_name") or "").strip() or None
    customer_email = str(booking.get("customer_email") or "").strip().lower() or None
    customer_phone = str(booking.get("customer_phone") or "").strip() or None
    requested_date = str(booking.get("requested_date") or "").strip() or None
    requested_time = str(booking.get("requested_time") or "").strip() or None
    timezone = str(booking.get("timezone") or "Australia/Sydney").strip() or "Australia/Sydney"
    booking_path = str(booking.get("booking_path") or "request_callback").strip() or "request_callback"

    if not tenant_id or not booking_reference:
        return {}

    crm_sync = await orchestrate_booking_followup_sync(
        session,
        tenant_id=tenant_id,
        booking_intent_id=booking_intent_id,
        booking_reference=booking_reference,
        full_name=customer_name,
        email=customer_email,
        phone=customer_phone,
        source=channel,
        service_name=service_name,
        requested_date=requested_date,
        requested_time=requested_time,
        timezone=timezone,
        booking_path=booking_path,
        notes=f"Captured via {channel} messaging agent",
    )

    result: dict[str, object] = {
        "crm_sync": {
            "deal": {
                "record_id": crm_sync.deal_record_id,
                "sync_status": crm_sync.deal_sync_status,
                "external_entity_id": crm_sync.deal_external_entity_id,
            },
            "task": {
                "record_id": crm_sync.task_record_id,
                "sync_status": crm_sync.task_sync_status,
                "external_entity_id": crm_sync.task_external_entity_id,
            },
            "warning_codes": crm_sync.warning_codes,
        }
    }

    if not customer_email or not hasattr(request.app.state, "email_service"):
        return result

    email_service: EmailService = request.app.state.email_service
    rendered_email = render_bookedai_confirmation_email(
        variables={
            "customer_name": customer_name or "there",
            "service_name": service_name,
            "slot_label": " ".join(bit for bit in [requested_date, requested_time] if bit).strip() or "To be confirmed",
            "booking_reference": booking_reference,
            "business_name": "BookedAI.au",
            "venue_name": "BookedAI.au",
            "support_email": getattr(request.app.state.settings, "booking_business_email", None) or "info@bookedai.au",
            "support_phone": (
                getattr(request.app.state.settings, "booking_business_phone", None)
                or getattr(request.app.state.settings, "support_phone", None)
                or "+61455301335"
            ),
            "manage_link": f"https://portal.bookedai.au/?booking_reference={booking_reference}",
            "timezone": timezone,
            "additional_note": "We captured your request from chat. We will confirm the booking and next step shortly.",
        },
        public_app_url=getattr(request.app.state.settings, "public_app_url", None),
    )

    delivery_status = "queued"
    email_warnings: list[str] = []
    if email_service.smtp_configured():
        try:
            await email_service.send_email(
                to=[customer_email],
                cc=[],
                subject=rendered_email.subject,
                text=rendered_email.text,
                html=rendered_email.html,
            )
            delivery_status = "sent"
        except Exception as exc:
            email_warnings.append(f"email_send_failed:{exc}")
    else:
        email_warnings.append("smtp_unconfigured")

    email_result = await orchestrate_lifecycle_email(
        session,
        tenant_id=tenant_id,
        template_key="bookedai_booking_confirmation",
        subject=rendered_email.subject,
        provider="smtp" if delivery_status == "sent" else "unconfigured",
        delivery_status=delivery_status,
        contact_id=contact_id,
        event_payload={
            "channel": channel,
            "booking_reference": booking_reference,
            "customer_email": customer_email,
            "service_name": service_name,
        },
    )
    email_crm_sync = await orchestrate_email_sent_sync(
        session,
        tenant_id=tenant_id,
        message_id=email_result.message_id,
        template_key="bookedai_booking_confirmation",
        subject=rendered_email.subject,
        recipient_email=customer_email,
        provider="smtp" if delivery_status == "sent" else "unconfigured",
        delivery_status=delivery_status,
    )
    result["email_confirmation"] = {
        "message_id": email_result.message_id,
        "delivery_status": email_result.delivery_status,
        "provider": email_result.provider,
        "warnings": email_warnings + email_result.warning_codes,
        "crm_sync": {
            "task": {
                "record_id": email_crm_sync.task_record_id,
                "sync_status": email_crm_sync.task_sync_status,
                "external_entity_id": email_crm_sync.task_external_entity_id,
                "warnings": email_crm_sync.warning_codes,
            }
        },
    }
    return result


def require_admin_access(
    request: Request,
    *,
    x_admin_token: str | None = None,
    authorization: str | None = None,
) -> str:
    cfg: Settings = request.app.state.settings

    if authorization:
        scheme, _, token = authorization.partition(" ")
        if scheme.lower() == "bearer" and token.strip():
            try:
                return verify_admin_session_token(cfg, token.strip())
            except SessionTokenError:
                pass

    if x_admin_token:
        try:
            verify_bearer_token(
                x_admin_token,
                cfg.admin_api_token,
                label="admin API",
            )
            return cfg.admin_username
        except ValueError as exc:
            raise HTTPException(status_code=401, detail=str(exc)) from exc

    raise HTTPException(status_code=401, detail="Admin authentication required")


async def seed_default_service_catalog(
    session_factory,
    booking_service: BookingAssistantService,
) -> None:
    seed_source = "seed://default-service-catalog"
    seed_items = booking_service.get_catalog().services
    async with get_session(session_factory) as session:
        for item in seed_items:
            existing = (
                await session.execute(
                    select(ServiceMerchantProfile).where(
                        ServiceMerchantProfile.service_id == item.id
                    )
                )
            ).scalar_one_or_none()

            mapped_values = {
                "service_id": item.id,
                "business_name": item.venue_name or item.name,
                "business_email": item.business_email,
                "name": item.name,
                "category": item.category,
                "summary": item.summary,
                "amount_aud": item.amount_aud,
                "duration_minutes": item.duration_minutes,
                "venue_name": item.venue_name,
                "location": item.location,
                "map_url": item.map_url,
                "booking_url": item.booking_url,
                "image_url": item.image_url,
                "source_url": seed_source,
                "tags_json": list(item.tags),
                "featured": 1 if item.featured else 0,
                "is_active": 1,
            }
            mapped_values, _quality_warnings = apply_catalog_quality_gate(mapped_values)

            if existing:
                for key, value in mapped_values.items():
                    setattr(existing, key, value)
            else:
                session.add(ServiceMerchantProfile(**mapped_values))

        await session.commit()


async def load_active_service_catalog(request: Request) -> list[ServiceCatalogItem]:
    booking_service: BookingAssistantService = request.app.state.booking_assistant_service
    demo_catalog = booking_service.get_catalog().services
    tenant_ref = (request.query_params.get("tenant_ref") or "").strip()

    async with get_session(request.app.state.session_factory) as session:
        query = select(ServiceMerchantProfile).where(ServiceMerchantProfile.is_active == 1)

        if tenant_ref:
            tenant_repository = TenantRepository(RepositoryContext(session=session))
            tenant_id = await tenant_repository.resolve_tenant_id(tenant_ref)
            if not tenant_id:
                return []
            query = query.where(
                ServiceMerchantProfile.tenant_id == tenant_id,
                ServiceMerchantProfile.publish_state == "published",
            )

        imported = (
            await session.execute(
                query.order_by(desc(ServiceMerchantProfile.featured), ServiceMerchantProfile.updated_at.desc())
            )
        ).scalars().all()

    imported_catalog = [build_service_catalog_item(item) for item in imported]
    if tenant_ref:
        return imported_catalog

    if not imported_catalog:
        return demo_catalog

    seen_ids = {item.id for item in imported_catalog}
    merged = imported_catalog + [item for item in demo_catalog if item.id not in seen_ids]
    return merged


async def seed_default_partner_profiles(session_factory) -> None:
    async with get_session(session_factory) as session:
        for item in DEFAULT_PARTNER_PROFILES:
            existing_matches = (
                await session.execute(
                    select(PartnerProfile)
                    .where(func.lower(PartnerProfile.name) == item["name"].strip().lower())
                    .order_by(PartnerProfile.id)
                )
            ).scalars().all()
            existing = existing_matches[0] if existing_matches else None

            # Keep the oldest matching row authoritative and drop accidental duplicates
            # so startup seeding does not fail if prior deploys inserted the same partner twice.
            for duplicate in existing_matches[1:]:
                await session.delete(duplicate)

            mapped_values = {
                "name": item["name"],
                "category": item["category"],
                "website_url": item["website_url"],
                "description": item["description"],
                "logo_url": item["logo_url"],
                "image_url": item["image_url"],
                "featured": item["featured"],
                "sort_order": item["sort_order"],
                "is_active": 1,
            }

            if existing:
                for key, value in mapped_values.items():
                    setattr(existing, key, value)
            else:
                session.add(PartnerProfile(**mapped_values))

        await session.commit()


async def enforce_rate_limit(
    request: Request,
    *,
    scope: str,
    limit: int,
    window_seconds: int,
) -> None:
    limiter: InMemoryRateLimiter = request.app.state.rate_limiter
    try:
        await limiter.enforce(
            scope,
            get_client_ip(request),
            limit=limit,
            window_seconds=window_seconds,
        )
    except TooManyRequestsError as exc:
        raise HTTPException(
            status_code=429,
            detail=f"Rate limit exceeded. Retry in {exc.retry_after_seconds} seconds.",
            headers={"Retry-After": str(exc.retry_after_seconds)},
        ) from exc


@api.get("/")
async def api_root() -> dict[str, str]:
    return {"message": "Welcome to Bookedai.au API"}


@api.get("/health")
async def healthcheck() -> dict[str, str]:
    return {"status": "ok", "service": "backend"}


@api.get("/customer-agent/health")
async def customer_agent_health(
    request: Request,
    x_admin_token: str | None = Header(default=None, alias="X-Admin-Token"),
    authorization: str | None = Header(default=None, alias="Authorization"),
) -> dict[str, object]:
    require_admin_access(request, x_admin_token=x_admin_token, authorization=authorization)
    cutoff = datetime.now(UTC) - timedelta(hours=24)
    async with get_session(request.app.state.session_factory) as session:
        events = (
            await session.execute(
                select(ConversationEvent)
                .where(ConversationEvent.source.in_(["telegram", "whatsapp", "sms", "email"]))
                .where(ConversationEvent.created_at >= cutoff)
                .order_by(desc(ConversationEvent.created_at))
                .limit(250)
            )
        ).scalars().all()
        sessions = (
            await session.execute(
                select(MessagingChannelSession)
                .order_by(desc(MessagingChannelSession.updated_at))
                .limit(50)
            )
        ).scalars().all()

    by_channel: dict[str, int] = {}
    failed_identity: dict[str, int] = {}
    last_reply_status: dict[str, object] = {}
    last_callback_ack_status: dict[str, object] = {}
    pending_webhook_count = 0
    for event in events:
        channel = str(event.source or "unknown")
        by_channel[channel] = by_channel.get(channel, 0) + 1
        meta = event.metadata_json if isinstance(event.metadata_json, dict) else {}
        if str(event.workflow_status or "") in {"received", "queued"}:
            pending_webhook_count += 1
        reply_delivery = meta.get("reply_delivery")
        if isinstance(reply_delivery, dict) and channel not in last_reply_status:
            last_reply_status[channel] = {
                "delivery_status": reply_delivery.get("delivery_status"),
                "provider": reply_delivery.get("provider"),
                "warnings": reply_delivery.get("warnings") or [],
                "conversation_id": event.conversation_id,
                "created_at": event.created_at.isoformat(),
            }
        callback_ack = meta.get("callback_ack")
        if isinstance(callback_ack, dict) and channel not in last_callback_ack_status:
            last_callback_ack_status[channel] = {
                "delivery_status": callback_ack.get("delivery_status"),
                "provider": callback_ack.get("provider"),
                "warnings": callback_ack.get("warnings") or [],
                "conversation_id": event.conversation_id,
                "created_at": event.created_at.isoformat(),
            }
        booking_resolution = meta.get("booking_resolution")
        if isinstance(booking_resolution, dict):
            reason = str(booking_resolution.get("resolved_by") or "").strip()
            if reason and reason not in {"booking_reference", "safe_single_customer_identity_match"}:
                failed_identity[reason] = failed_identity.get(reason, 0) + 1

    session_snapshots = []
    for row in sessions[:10]:
        session_snapshots.append(
            {
                "channel": row.channel,
                "conversation_id": row.conversation_id,
                "tenant_id": row.tenant_id,
                "service_search_query": row.service_search_query,
                "service_options_count": len(row.service_options_json or []),
                "last_ai_intent": row.last_ai_intent,
                "last_workflow_status": row.last_workflow_status,
                "last_reply_delivery": row.last_reply_delivery_json or {},
                "last_callback_ack": row.last_callback_ack_json or {},
                "updated_at": row.updated_at.isoformat() if row.updated_at else None,
            }
        )

    return {
        "status": "ok",
        "agent": "BookedAI Manager Bot",
        "window_hours": 24,
        "webhook_pending_count": pending_webhook_count,
        "recent_events": {
            "total": len(events),
            "by_channel": by_channel,
        },
        "last_reply_status": last_reply_status,
        "last_callback_ack_status": last_callback_ack_status,
        "top_failed_identity_resolution_reasons": [
            {"reason": reason, "count": count}
            for reason, count in sorted(failed_identity.items(), key=lambda item: item[1], reverse=True)[:5]
        ],
        "recent_channel_sessions": session_snapshots,
    }


@api.get("/config")
async def public_config(request: Request) -> dict[str, str]:
    cfg: Settings = request.app.state.settings
    return {
        "app_name": cfg.app_name,
        "public_app_url": cfg.public_app_url,
        "public_api_url": cfg.public_api_url,
        "upload_public_base_url": cfg.upload_public_base_url,
        "supabase_url": cfg.supabase_url,
    }


@api.get("/partners", response_model=PartnerProfileListResponse)
async def public_partners(request: Request) -> PartnerProfileListResponse:
    async with get_session(request.app.state.session_factory) as session:
        items = (
            await session.execute(
                select(PartnerProfile)
                .where(PartnerProfile.is_active == 1)
                .order_by(desc(PartnerProfile.featured), PartnerProfile.sort_order, PartnerProfile.id)
            )
        ).scalars().all()

    return PartnerProfileListResponse(
        status="ok",
        items=[build_partner_item(item) for item in items],
    )


@api.post("/uploads/images", status_code=status.HTTP_201_CREATED)
async def upload_image(
    request: Request,
    file: UploadFile = File(...),
) -> dict[str, str | int]:
    return await save_uploaded_file(
        request,
        file=file,
        allowed_kind="images",
        enforce_rate_limit_fn=enforce_rate_limit,
    )


@api.post("/uploads/files", status_code=status.HTTP_201_CREATED)
async def upload_file(
    request: Request,
    file: UploadFile = File(...),
) -> dict[str, str | int]:
    return await save_uploaded_file(
        request,
        file=file,
        allowed_kind="files",
        enforce_rate_limit_fn=enforce_rate_limit,
    )


@api.get("/booking-assistant/catalog", response_model=BookingAssistantCatalogResponse)
async def booking_assistant_catalog(request: Request) -> BookingAssistantCatalogResponse:
    booking_service: BookingAssistantService = request.app.state.booking_assistant_service
    catalog = await load_active_service_catalog(request)
    return booking_service.get_catalog(catalog)


@api.post("/chat/send", response_model=BookingAssistantChatResponse)
@api.post("/booking-assistant/chat", response_model=BookingAssistantChatResponse)
async def booking_assistant_chat(
    request: Request,
    payload: BookingAssistantChatRequest,
) -> BookingAssistantChatResponse:
    await enforce_rate_limit(
        request,
        scope="booking-assistant-chat",
        limit=request.app.state.settings.booking_chat_rate_limit_requests,
        window_seconds=request.app.state.settings.booking_chat_rate_limit_window_seconds,
    )
    booking_service: BookingAssistantService = request.app.state.booking_assistant_service
    openai_service: OpenAIService = request.app.state.openai_service
    catalog = await load_active_service_catalog(request)
    try:
        return await booking_service.chat(
            message=payload.message,
            conversation=payload.conversation,
            openai_service=openai_service,
            user_latitude=payload.user_latitude,
            user_longitude=payload.user_longitude,
            user_locality=payload.user_locality,
            services=catalog,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@api.post("/chat/send/stream")
@api.post("/booking-assistant/chat/stream")
async def booking_assistant_chat_stream(
    request: Request,
    payload: BookingAssistantChatRequest,
) -> StreamingResponse:
    """SSE streaming endpoint for chat. Yields tokens then a final 'done' event
    with matched_services so the frontend can show typing animation."""
    await enforce_rate_limit(
        request,
        scope="booking-assistant-chat",
        limit=request.app.state.settings.booking_chat_rate_limit_requests,
        window_seconds=request.app.state.settings.booking_chat_rate_limit_window_seconds,
    )
    booking_service: BookingAssistantService = request.app.state.booking_assistant_service
    openai_service: OpenAIService = request.app.state.openai_service
    catalog = await load_active_service_catalog(request)

    fallback_text = "I can help you find and book the right service. What are you looking for today?"
    fallback_headers = {
        "Cache-Control": "no-cache",
        "X-Accel-Buffering": "no",
    }

    try:
        ranked = _rank_services(
            payload.message,
            services=catalog,
            user_latitude=payload.user_latitude,
            user_longitude=payload.user_longitude,
            user_locality=payload.user_locality,
            precomputed_signals=None,
        )
        shortlist = _curate_service_matches(
            [item.service for item in ranked[:12]],
            limit=6,
        )
    except Exception as exc:
        logger.warning("booking_assistant_chat_stream_rank_failed: %s", exc)

        async def fallback_stream():
            yield f"data: {json.dumps({'type': 'token', 'text': fallback_text})}\n\n"
            yield (
                f"data: {json.dumps({'type': 'done', 'matched_services': [], 'suggested_service_id': None, 'should_request_location': False})}\n\n"
            )

        return StreamingResponse(
            fallback_stream(),
            media_type="text/event-stream",
            headers=fallback_headers,
        )

    async def event_stream():
        matched_services_payload = [_model_dump_compat(s) for s in shortlist]
        suggested_id = shortlist[0].id if shortlist else None
        try:
            async for chunk in openai_service.booking_assistant_streaming_reply(
                message=payload.message,
                conversation=payload.conversation,
                services=shortlist,
            ):
                if chunk.startswith("data: ") and '"type":"done"' in chunk:
                    done_payload = json.dumps({
                        "type": "done",
                        "matched_services": matched_services_payload,
                        "suggested_service_id": suggested_id,
                        "should_request_location": False,
                    })
                    yield f"data: {done_payload}\n\n"
                else:
                    yield chunk
        except Exception as exc:
            logger.warning("booking_assistant_chat_stream_failed: %s", exc)
            yield f"data: {json.dumps({'type': 'token', 'text': fallback_text})}\n\n"
            yield (
                f"data: {json.dumps({'type': 'done', 'matched_services': matched_services_payload, 'suggested_service_id': suggested_id, 'should_request_location': False})}\n\n"
            )

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers=fallback_headers,
    )


@api.post(
    "/booking-assistant/session",
    response_model=BookingAssistantSessionResponse,
)
async def booking_assistant_session(
    request: Request,
    payload: BookingAssistantSessionRequest,
) -> BookingAssistantSessionResponse:
    await enforce_rate_limit(
        request,
        scope="booking-assistant-session",
        limit=request.app.state.settings.booking_session_rate_limit_requests,
        window_seconds=request.app.state.settings.booking_session_rate_limit_window_seconds,
    )
    booking_service: BookingAssistantService = request.app.state.booking_assistant_service
    email_service: EmailService = request.app.state.email_service
    n8n_service: N8NService = request.app.state.n8n_service
    catalog = await load_active_service_catalog(request)
    try:
        result = await booking_service.create_session(
            payload,
            email_service=email_service,
            n8n_service=n8n_service,
            services=catalog,
        )
        normalized_email = (payload.customer_email or "").strip().lower()
        async with get_session(request.app.state.session_factory) as session:
            tenant_notification_result: dict[str, object] | None = None
            tenant_id = str(result.service.tenant_id or "").strip() or None
            if tenant_id and hasattr(request.app.state, "communication_service"):
                automation_service = MessagingAutomationService()
                try:
                    tenant_notification_result = await automation_service.send_tenant_booking_notification(
                        session,
                        request.app.state.communication_service,
                        tenant_id=tenant_id,
                        booking_reference=result.booking_reference,
                        service_name=result.service.name,
                        customer_name=payload.customer_name,
                        requested_date=result.requested_date,
                        requested_time=result.requested_time,
                        timezone=result.timezone,
                        portal_url=result.portal_url,
                        tenant_email=result.service.business_email,
                    )
                except Exception as exc:
                    tenant_notification_result = {
                        "provider": "tenant_messaging",
                        "delivery_status": "queued",
                        "warnings": [f"tenant_notification_failed: {exc}"],
                    }
            await store_event(
                session,
                source="booking_assistant",
                event_type="booking_session_created",
                message=TawkMessage(
                    conversation_id=result.booking_reference,
                    message_id=result.booking_reference,
                    text=payload.notes or f"Booking request for {result.service.name}",
                    sender_name=payload.customer_name,
                    sender_email=normalized_email or None,
                    sender_phone=payload.customer_phone,
                ),
                ai_intent="booking",
                ai_reply=result.confirmation_message,
                workflow_status=result.workflow_status,
                metadata={
                    "booking_reference": result.booking_reference,
                    "service": result.service.model_dump(),
                    "tenant_notification": tenant_notification_result,
                    "contact": {
                        "name": payload.customer_name,
                        "email": normalized_email or None,
                        "phone": payload.customer_phone,
                    },
                    "portal_url": result.portal_url,
                    "booking": {
                        "requested_service": result.service.name,
                        "requested_date": result.requested_date,
                        "requested_time": result.requested_time,
                        "timezone": result.timezone,
                        "notes": payload.notes,
                    },
                    "amount_aud": result.amount_aud,
                    "amount_label": result.amount_label,
                    "meeting_status": result.meeting_status,
                    "meeting_join_url": result.meeting_join_url,
                    "meeting_event_url": result.meeting_event_url,
                    "calendar_add_url": result.calendar_add_url,
                    "payment_status": result.payment_status,
                    "payment_url": result.payment_url,
                    "qr_code_url": result.qr_code_url,
                    "email_status": result.email_status,
                    "workflow_status": result.workflow_status,
                },
            )
            if await is_flag_enabled("new_booking_domain_dual_write", session=session):
                try:
                    await dual_write_booking_assistant_session(
                        session,
                        payload=payload,
                        result=result,
                    )
                    await session.commit()
                except Exception:
                    await session.rollback()
        return result
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@api.post("/demo/scan-website", response_model=PublicDemoImportResponse)
async def public_demo_scan_website(
    request: Request,
    payload: PublicDemoImportRequest,
) -> PublicDemoImportResponse:
    """Public endpoint: given a business website URL, AI extracts services and returns
    them as a preview catalog — no auth required, rate-limited, read-only (no DB writes)."""
    await enforce_rate_limit(request, scope="demo-scan-website", limit=5, window_seconds=60)

    openai_service: OpenAIService = request.app.state.openai_service
    website_input = payload.website_url.strip()
    website_url = await openai_service.resolve_business_website(
        website_or_query=website_input,
        business_name=payload.business_name,
    )
    if not website_url:
        raise HTTPException(
            status_code=422,
            detail="Could not resolve a valid website from that URL or business name.",
        )

    extracted = await openai_service.extract_services_from_website(
        website_url=website_url,
        business_name=payload.business_name,
        category_hint=payload.category,
    )

    business_name = (
        (payload.business_name or "").strip()
        or website_url.replace("https://", "").replace("http://", "").split("/")[0]
    )

    services = [
        PublicDemoImportItem(
            name=str(item.get("name") or "").strip(),
            category=str(item.get("category") or payload.category or "").strip() or None,
            summary=str(item.get("summary") or "").strip() or None,
            amount_aud=float(item["amount_aud"]) if item.get("amount_aud") is not None else None,
            duration_minutes=int(item["duration_minutes"]) if item.get("duration_minutes") is not None else None,
            venue_name=str(item.get("venue_name") or "").strip() or None,
            location=str(item.get("location") or "").strip() or None,
            booking_url=str(item.get("booking_url") or website_url).strip() or None,
            image_url=str(item.get("image_url") or "").strip() or None,
            tags=[str(t) for t in (item.get("tags") or []) if t],
        )
        for item in extracted
        if str(item.get("name") or "").strip()
    ]

    return PublicDemoImportResponse(
        status="ok",
        business_name=business_name,
        website_url=website_url,
        services=services,
        service_count=len(services),
    )


@api.post(
    "/pricing/consultation",
    response_model=PricingConsultationResponse,
)
async def pricing_consultation(
    request: Request,
    payload: PricingConsultationRequest,
) -> PricingConsultationResponse:
    await enforce_rate_limit(
        request,
        scope="pricing-consultation",
        limit=10,
        window_seconds=300,
    )
    pricing_service: PricingService = request.app.state.pricing_service
    email_service: EmailService = request.app.state.email_service
    try:
        result = await pricing_service.create_consultation(
            payload,
            email_service=email_service,
        )
        try:
            async with get_session(request.app.state.session_factory) as session:
                await store_event(
                    session,
                    source="pricing",
                    event_type="pricing_consultation_created",
                    message=TawkMessage(
                        conversation_id=result.consultation_reference,
                        message_id=result.consultation_reference,
                        text=payload.notes or f"{result.plan_name} package consultation",
                        sender_name=payload.customer_name,
                        sender_email=payload.customer_email.strip().lower(),
                        sender_phone=payload.customer_phone,
                    ),
                    ai_intent="pricing_consultation",
                    ai_reply=(
                        "Package booking created with onboarding scheduling, trial offer, and Stripe checkout."
                    ),
                    workflow_status=result.payment_status,
                    metadata={
                        "consultation_reference": result.consultation_reference,
                        "plan_id": result.plan_id,
                        "plan_name": result.plan_name,
                        "package_name": result.plan_name,
                        "business_name": payload.business_name,
                        "business_type": payload.business_type,
                        "onboarding_mode": result.onboarding_mode,
                        "trial_days": result.trial_days,
                        "trial_summary": result.trial_summary,
                        "startup_offer_applied": result.startup_offer_applied,
                        "startup_offer_summary": result.startup_offer_summary,
                        "onsite_travel_fee_note": result.onsite_travel_fee_note,
                        "referral_partner": payload.referral_partner,
                        "referral_location": payload.referral_location,
                        "preferred_date": result.preferred_date,
                        "preferred_time": result.preferred_time,
                        "timezone": result.timezone,
                        "source_page": payload.source_page,
                        "source_section": payload.source_section,
                        "source_cta": payload.source_cta,
                        "source_detail": payload.source_detail,
                        "source_plan_id": payload.source_plan_id,
                        "source_flow_mode": payload.source_flow_mode,
                        "source_path": payload.source_path,
                        "source_referrer": payload.source_referrer,
                        "meeting_status": result.meeting_status,
                        "meeting_join_url": result.meeting_join_url,
                        "meeting_event_url": result.meeting_event_url,
                        "payment_status": result.payment_status,
                        "payment_url": result.payment_url,
                        "email_status": result.email_status,
                    },
                )
                if await is_flag_enabled("new_booking_domain_dual_write", session=session):
                    try:
                        await dual_write_pricing_consultation(
                            session,
                            payload=payload,
                            result=result,
                        )
                        await session.commit()
                    except Exception:
                        await session.rollback()
                        logger.exception("pricing_consultation_dual_write_failed")
        except Exception:
            logger.exception("pricing_consultation_event_store_failed")
        return result
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except httpx.HTTPError as exc:
        raise HTTPException(
            status_code=502,
            detail="Unable to reach Zoho Calendar or Stripe right now",
        ) from exc


@api.post(
    "/demo/request",
    response_model=DemoBookingResponse,
)
async def demo_request(
    request: Request,
    payload: DemoBookingRequest,
) -> DemoBookingResponse:
    await enforce_rate_limit(
        request,
        scope="demo-request",
        limit=10,
        window_seconds=300,
    )
    pricing_service: PricingService = request.app.state.pricing_service
    email_service: EmailService = request.app.state.email_service
    try:
        result = await pricing_service.create_demo_request(
            payload,
            email_service=email_service,
        )
        async with get_session(request.app.state.session_factory) as session:
            await store_event(
                session,
                source="demo",
                event_type="demo_request_created",
                message=TawkMessage(
                    conversation_id=result.demo_reference,
                    message_id=result.demo_reference,
                    text=payload.notes or "Bookedai.au demo request",
                    sender_name=payload.customer_name,
                    sender_email=payload.customer_email.strip().lower(),
                    sender_phone=payload.customer_phone,
                ),
                ai_intent="demo_request",
                ai_reply=result.confirmation_message,
                workflow_status=result.meeting_status,
                metadata={
                    "demo_reference": result.demo_reference,
                    "business_name": payload.business_name,
                    "business_type": payload.business_type,
                    "preferred_date": result.preferred_date,
                    "preferred_time": result.preferred_time,
                    "timezone": result.timezone,
                    "source_page": payload.source_page,
                    "source_section": payload.source_section,
                    "source_cta": payload.source_cta,
                    "source_detail": payload.source_detail,
                    "source_path": payload.source_path,
                    "source_referrer": payload.source_referrer,
                    "meeting_status": result.meeting_status,
                    "meeting_join_url": result.meeting_join_url,
                    "meeting_event_url": result.meeting_event_url,
                    "email_status": result.email_status,
                },
            )
            if await is_flag_enabled("new_booking_domain_dual_write", session=session):
                try:
                    await dual_write_demo_request(
                        session,
                        payload=payload,
                        result=result,
                    )
                    await session.commit()
                except Exception:
                    await session.rollback()
        return result
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except httpx.HTTPError as exc:
        raise HTTPException(
            status_code=502,
            detail="Unable to reach Zoho Calendar right now",
        ) from exc


@api.post(
    "/demo/brief",
    response_model=DemoBriefResponse,
)
async def demo_brief(
    request: Request,
    payload: DemoBriefRequest,
) -> DemoBriefResponse:
    await enforce_rate_limit(
        request,
        scope="demo-brief",
        limit=10,
        window_seconds=300,
    )

    return await submit_demo_brief(
        session_factory=request.app.state.session_factory,
        email_service=request.app.state.email_service,
        settings=request.app.state.settings,
        payload=payload,
    )


@api.get(
    "/demo/brief/{brief_reference}/sync",
    response_model=DemoBookingSyncResponse,
)
async def sync_demo_booking_from_brief(
    brief_reference: str,
    request: Request,
) -> DemoBookingSyncResponse:
    return await sync_demo_booking_from_brief_service(
        session_factory=request.app.state.session_factory,
        pricing_service=request.app.state.pricing_service,
        email_service=request.app.state.email_service,
        settings=request.app.state.settings,
        brief_reference=brief_reference,
    )


@api.post("/webhooks/tawk", response_model=TawkWebhookResponse)
async def tawk_webhook(request: Request) -> TawkWebhookResponse:
    cfg: Settings = request.app.state.settings
    raw_body = await request.body()
    try:
        payload = await request.json()
    except JSONDecodeError as exc:
        raise HTTPException(status_code=400, detail="Webhook payload must be valid JSON") from exc

    try:
        verify_tawk_signature(
            raw_body,
            {key.lower(): value for key, value in request.headers.items()},
            cfg.tawk_webhook_secret,
            cfg.tawk_verify_signature,
        )
    except ValueError as exc:
        raise HTTPException(status_code=401, detail=str(exc)) from exc

    message = extract_tawk_message(payload)
    if not message.text.strip():
        raise HTTPException(status_code=400, detail="Webhook payload did not include a message")

    ai_service: OpenAIService = request.app.state.openai_service
    n8n_service: N8NService = request.app.state.n8n_service
    triage = await ai_service.triage_message(message)

    workflow_status: str | None = None
    workflow_triggered = False

    if triage.should_trigger_booking_workflow:
        workflow_payload = BookingWorkflowPayload(
            conversation_id=message.conversation_id,
            message_id=message.message_id,
            customer_message=message.text,
            ai_summary=triage.summary,
            ai_intent=triage.intent,
            customer_reply=triage.customer_reply,
            contact=triage.contact,
            booking=triage.booking,
            metadata=message.metadata,
        )
        workflow_status = await n8n_service.trigger_booking(workflow_payload)
        workflow_triggered = workflow_status == "triggered"
    else:
        workflow_status = "not_required"

    async with get_session(request.app.state.session_factory) as session:
        await store_event(
            session,
            source="tawk",
            event_type="incoming_message",
            message=message,
            ai_intent=triage.intent,
            ai_reply=triage.customer_reply,
            workflow_status=workflow_status,
            metadata={
                "raw_payload": payload,
                "ai_summary": triage.summary,
                "booking": triage.booking.model_dump(),
                "contact": triage.contact.model_dump(),
                "needs_human_handoff": triage.needs_human_handoff,
                "confidence": triage.confidence,
            },
        )

    return TawkWebhookResponse(
        status="processed",
        conversation_id=message.conversation_id,
        reply=triage.customer_reply,
        intent=triage.intent,
        workflow_triggered=workflow_triggered,
        workflow_status=workflow_status,
    )


@api.get("/webhooks/whatsapp")
async def whatsapp_webhook_verify(request: Request) -> Response:
    mode = request.query_params.get("hub.mode")
    verify_token = request.query_params.get("hub.verify_token")
    challenge = request.query_params.get("hub.challenge")
    expected_verify_token = request.app.state.settings.whatsapp_verify_token.strip()

    if not mode and not verify_token and not challenge:
        raise HTTPException(status_code=400, detail="Verification query parameters are required")

    if mode != "subscribe":
        raise HTTPException(status_code=400, detail="Unsupported WhatsApp verification mode")

    if not expected_verify_token or verify_token != expected_verify_token:
        raise HTTPException(status_code=403, detail="WhatsApp verification token mismatch")

    return Response(content=str(challenge or ""), media_type="text/plain")


@api.post("/webhooks/whatsapp")
async def whatsapp_webhook(request: Request) -> dict[str, object]:
    content_type = request.headers.get("content-type", "").lower()
    normalized_messages: list[tuple[TawkMessage, dict[str, object]]] = []

    if "application/json" in content_type:
        try:
            payload = await request.json()
        except JSONDecodeError as exc:
            raise HTTPException(status_code=400, detail="Webhook payload must be valid JSON") from exc
        if not isinstance(payload, dict):
            raise HTTPException(status_code=400, detail="WhatsApp payload must be a JSON object")
        normalized_messages = _iter_meta_whatsapp_payload(payload)
    else:
        form = await request.form()
        payload = {key: value for key, value in form.multi_items()}
        normalized_messages = [_extract_twilio_whatsapp_payload(payload)]

    if not normalized_messages:
        return {"status": "ignored", "messages_processed": 0}

    messages_processed = 0
    async with get_session(request.app.state.session_factory) as session:
        for message, metadata in normalized_messages:
            external_event_id = str(
                metadata.get("provider_message_id") or message.message_id or ""
            ).strip() or None
            should_process, webhook_event_id, tenant_id = await _register_whatsapp_webhook_event(
                session,
                provider=str(metadata.get("provider") or "unknown"),
                external_event_id=external_event_id,
                payload=metadata,
            )
            if not should_process:
                continue
            ai_reply: str | None = None
            care_metadata: dict[str, object] = {}
            delivery_metadata: dict[str, object] | None = None
            try:
                if hasattr(request.app.state, "communication_service"):
                    automation_result = await MessagingAutomationService(
                        public_search_service=getattr(request.app.state, "openai_service", None)
                    ).handle_customer_message(
                        session,
                        channel="whatsapp",
                        message=message,
                        metadata=metadata,
                    )
                    ai_reply = automation_result.ai_reply
                    care_metadata = automation_result.metadata
                    lifecycle_metadata = await _finalize_messaging_queued_request_side_effects(
                        request,
                        session,
                        queued_request=care_metadata.get("queued_request")
                        if isinstance(care_metadata.get("queued_request"), dict)
                        else None,
                        customer_message=message.text,
                    )
                    if lifecycle_metadata:
                        care_metadata["lifecycle_updates"] = lifecycle_metadata
                    delivery_metadata = await _send_messaging_customer_care_reply(
                        request,
                        channel="whatsapp",
                        to=str(metadata.get("sender_phone") or message.sender_phone or "").strip() or None,
                        body=ai_reply,
                        reply_markup=(
                            care_metadata.get("reply_controls", {}).get("telegram_reply_markup")
                            if isinstance(care_metadata.get("reply_controls"), dict)
                            else None
                        ),
                        parse_mode=(
                            str(care_metadata.get("reply_controls", {}).get("telegram_parse_mode") or "").strip() or None
                            if isinstance(care_metadata.get("reply_controls"), dict)
                            else None
                        ),
                    )
                await store_event(
                    session,
                    source="whatsapp",
                    event_type="whatsapp_inbound",
                    message=message,
                    ai_intent=str(care_metadata.get("customer_care_status") or "inbound_message"),
                    ai_reply=ai_reply,
                    workflow_status="answered" if ai_reply else "received",
                    metadata=_json_safe_value(
                        {
                            **metadata,
                            **care_metadata,
                            "reply_delivery": delivery_metadata,
                        }
                    ),
                )
                await _complete_whatsapp_webhook_event(
                    session,
                    event_id=webhook_event_id,
                    tenant_id=tenant_id,
                    provider=str(metadata.get("provider") or "unknown"),
                    external_event_id=external_event_id,
                    response_payload=_json_safe_value({
                        "status": "processed",
                        "message_id": message.message_id,
                        "customer_care_status": care_metadata.get("customer_care_status"),
                        "reply_delivery": delivery_metadata,
                        "lifecycle_updates": care_metadata.get("lifecycle_updates"),
                    }),
                )
            except Exception as exc:
                logger.warning(
                    "whatsapp_webhook_processing_failed",
                    extra={
                        "event_type": "whatsapp_webhook_processing_failed",
                        "tenant_id": tenant_id,
                        "status": 0,
                        "route": "/api/webhooks/whatsapp",
                        "request_id": "",
                        "integration_name": "whatsapp",
                        "conversation_id": message.conversation_id or "",
                        "booking_reference": "",
                        "job_name": "",
                        "job_id": "",
                    },
                    exc_info=exc,
                )
            messages_processed += 1

    return {"status": "processed", "messages_processed": messages_processed}


@api.post("/webhooks/telegram")
@api.post("/webhooks/bookedai-telegram")
async def telegram_webhook(request: Request) -> dict[str, object]:
    expected_secret = _customer_telegram_webhook_secret(request.app.state.settings)
    if expected_secret:
        received_secret = str(request.headers.get("x-telegram-bot-api-secret-token") or "").strip()
        if received_secret != expected_secret:
            raise HTTPException(status_code=403, detail="Telegram webhook token mismatch")

    try:
        payload = await request.json()
    except JSONDecodeError as exc:
        raise HTTPException(status_code=400, detail="Webhook payload must be valid JSON") from exc
    if not isinstance(payload, dict):
        raise HTTPException(status_code=400, detail="Telegram payload must be a JSON object")

    normalized = _extract_telegram_payload(payload)
    if normalized is None:
        return {"status": "ignored", "messages_processed": 0}

    message, metadata = normalized
    external_event_id = str(
        payload.get("update_id")
        or metadata.get("telegram_callback_query_id")
        or (
            f"{metadata.get('telegram_chat_id')}:{metadata.get('provider_message_id')}"
            if metadata.get("telegram_chat_id") and metadata.get("provider_message_id")
            else ""
        )
    ).strip() or None
    ai_reply: str | None = None
    care_metadata: dict[str, object] = {}
    delivery_metadata: dict[str, object] | None = None
    callback_ack_metadata: dict[str, object] | None = None

    async with get_session(request.app.state.session_factory) as session:
        should_process, webhook_event_id, tenant_id = await _register_inbound_webhook_event(
            session,
            channel="telegram",
            provider=str(metadata.get("provider") or "telegram_bot"),
            external_event_id=external_event_id,
            payload=_json_safe_value({**metadata, "telegram_update_id": payload.get("update_id")}),
            route="/api/webhooks/bookedai-telegram",
        )
        if not should_process:
            return {"status": "processed", "messages_processed": 0}

        try:
            callback_ack_metadata = await _answer_telegram_callback_query(
                request,
                callback_query_id=str(metadata.get("telegram_callback_query_id") or "").strip() or None,
                text="BookedAI is working on it...",
            )
            await _send_telegram_chat_action(
                request,
                chat_id=str(metadata.get("telegram_chat_id") or "").strip() or None,
                action="typing",
            )
            if hasattr(request.app.state, "communication_service"):
                automation_result = await MessagingAutomationService(
                    public_search_service=getattr(request.app.state, "openai_service", None)
                ).handle_customer_message(
                    session,
                    channel="telegram",
                    message=message,
                    metadata=metadata,
                )
                ai_reply = automation_result.ai_reply
                care_metadata = automation_result.metadata
                booking_intent_updates = await _finalize_messaging_booking_intent_side_effects(
                    request,
                    session,
                    channel="telegram",
                    booking_intent=care_metadata.get("booking_intent")
                    if isinstance(care_metadata.get("booking_intent"), dict)
                    else None,
                )
                if booking_intent_updates:
                    existing_updates = (
                        care_metadata.get("lifecycle_updates")
                        if isinstance(care_metadata.get("lifecycle_updates"), dict)
                        else {}
                    )
                    care_metadata["lifecycle_updates"] = {
                        **existing_updates,
                        **booking_intent_updates,
                    }
                lifecycle_metadata = await _finalize_messaging_queued_request_side_effects(
                    request,
                    session,
                    queued_request=care_metadata.get("queued_request")
                    if isinstance(care_metadata.get("queued_request"), dict)
                    else None,
                    customer_message=message.text,
                )
                if lifecycle_metadata:
                    existing_updates = (
                        care_metadata.get("lifecycle_updates")
                        if isinstance(care_metadata.get("lifecycle_updates"), dict)
                        else {}
                    )
                    care_metadata["lifecycle_updates"] = {
                        **existing_updates,
                        **lifecycle_metadata,
                    }
                if bool(care_metadata.get("human_handoff_requested")):
                    handoff_metadata = await _notify_bookedai_support_handoff(
                        request,
                        message=message,
                        metadata=metadata,
                    )
                    if handoff_metadata:
                        existing_updates = (
                            care_metadata.get("lifecycle_updates")
                            if isinstance(care_metadata.get("lifecycle_updates"), dict)
                            else {}
                        )
                        care_metadata["lifecycle_updates"] = {
                            **existing_updates,
                            "support_handoff": handoff_metadata,
                        }
                delivery_metadata = await _send_messaging_customer_care_reply(
                    request,
                    channel="telegram",
                    to=str(metadata.get("telegram_chat_id") or "").strip() or None,
                    body=ai_reply,
                    reply_markup=(
                        care_metadata.get("reply_controls", {}).get("telegram_reply_markup")
                        if isinstance(care_metadata.get("reply_controls"), dict)
                        else None
                    ),
                    parse_mode=(
                        str(care_metadata.get("reply_controls", {}).get("telegram_parse_mode") or "").strip() or None
                        if isinstance(care_metadata.get("reply_controls"), dict)
                        else None
                    ),
                )
            await _update_messaging_channel_session_delivery(
                session,
                channel="telegram",
                conversation_id=message.conversation_id,
                ai_intent=str(care_metadata.get("customer_care_status") or "inbound_message"),
                workflow_status="answered" if ai_reply else "received",
                reply_delivery=delivery_metadata,
                callback_ack=callback_ack_metadata,
            )
            await store_event(
                session,
                source="telegram",
                event_type="telegram_inbound",
                message=message,
                ai_intent=str(care_metadata.get("customer_care_status") or "inbound_message"),
                ai_reply=ai_reply,
                workflow_status="answered" if ai_reply else "received",
                metadata=_json_safe_value(
                    {
                        **metadata,
                        **care_metadata,
                        "reply_delivery": delivery_metadata,
                        "callback_ack": callback_ack_metadata,
                    }
                ),
            )
            await _complete_inbound_webhook_event(
                session,
                event_id=webhook_event_id,
                tenant_id=tenant_id,
                channel="telegram",
                provider=str(metadata.get("provider") or "telegram_bot"),
                external_event_id=external_event_id,
                response_payload=_json_safe_value({
                    "status": "processed",
                    "message_id": message.message_id,
                    "customer_care_status": care_metadata.get("customer_care_status"),
                    "reply_delivery": delivery_metadata,
                    "callback_ack": callback_ack_metadata,
                }),
                route="/api/webhooks/bookedai-telegram",
            )
        except Exception as exc:
            fallback_delivery: dict[str, object] | None = None
            try:
                fallback_delivery = await _send_messaging_customer_care_reply(
                    request,
                    channel="telegram",
                    to=str(metadata.get("telegram_chat_id") or "").strip() or None,
                    body="Sorry, I hit a temporary issue just now. Please try again in a moment.",
                )
            except Exception:
                fallback_delivery = None
            logger.warning(
                "telegram_webhook_processing_failed",
                extra={
                    "event_type": "telegram_webhook_processing_failed",
                    "tenant_id": tenant_id,
                    "status": 0,
                    "route": "/api/webhooks/bookedai-telegram",
                    "request_id": "",
                    "integration_name": "telegram",
                    "conversation_id": message.conversation_id or "",
                    "booking_reference": "",
                    "job_name": "",
                    "job_id": "",
                    "fallback_delivery": fallback_delivery,
                },
                exc_info=exc,
            )

    return {"status": "processed", "messages_processed": 1}


@api.post("/webhooks/evolution")
async def evolution_webhook(request: Request) -> dict[str, object]:
    await _verify_evolution_webhook_signature(request)

    try:
        payload = await request.json()
    except Exception:
        return {"status": "ignored", "reason": "invalid_json"}

    if not isinstance(payload, dict):
        return {"status": "ignored", "reason": "not_object"}

    event = str(payload.get("event") or "").strip()
    if event != "messages.upsert":
        return {"status": "ignored", "event": event}

    data = payload.get("data")
    if not isinstance(data, dict):
        return {"status": "ignored", "reason": "no_data"}

    key = data.get("key") or {}
    if not isinstance(key, dict):
        return {"status": "ignored", "reason": "no_key"}

    if bool(key.get("fromMe")):
        return {"status": "ignored", "reason": "outbound"}

    remote_jid = str(key.get("remoteJid") or "").strip()
    sender_phone = remote_jid.split("@")[0] if "@" in remote_jid else remote_jid
    if not sender_phone:
        return {"status": "ignored", "reason": "no_sender"}

    provider_message_id = str(key.get("id") or "").strip() or None
    push_name = str(data.get("pushName") or "").strip() or None
    message_content = data.get("message") or {}
    body: str | None = None
    if isinstance(message_content, dict):
        body = (
            str(message_content.get("conversation") or "").strip()
            or str((message_content.get("extendedTextMessage") or {}).get("text") or "").strip()
            or None
        )

    message = TawkMessage(
        conversation_id=sender_phone,
        message_id=provider_message_id,
        text=body or "[WhatsApp message]",
        sender_name=push_name,
        sender_phone=f"+{sender_phone}" if not sender_phone.startswith("+") else sender_phone,
        metadata={"channel": "whatsapp", "provider": "evolution"},
    )
    metadata: dict[str, object] = {
        "channel": "whatsapp",
        "provider": "evolution",
        "direction": "inbound",
        "provider_message_id": provider_message_id,
        "sender_phone": message.sender_phone,
        "profile_name": push_name,
        "remote_jid": remote_jid,
        "message_type": str(data.get("messageType") or "").strip() or None,
        "raw_payload": data,
    }

    ai_reply: str | None = None
    care_metadata: dict[str, object] = {}
    delivery_metadata: dict[str, object] | None = None

    async with get_session(request.app.state.session_factory) as session:
        should_process, webhook_event_id, tenant_id = await _register_whatsapp_webhook_event(
            session,
            provider="evolution",
            external_event_id=provider_message_id,
            payload=metadata,
        )
        if not should_process:
            return {"status": "processed", "messages_processed": 0}

        try:
            if hasattr(request.app.state, "communication_service"):
                automation_result = await MessagingAutomationService(
                    public_search_service=getattr(request.app.state, "openai_service", None)
                ).handle_customer_message(
                    session,
                    channel="whatsapp",
                    message=message,
                    metadata=metadata,
                )
                ai_reply = automation_result.ai_reply
                care_metadata = automation_result.metadata
                delivery_metadata = await _send_messaging_customer_care_reply(
                    request,
                    channel="whatsapp",
                    to=message.sender_phone,
                    body=ai_reply,
                )
            await store_event(
                session,
                source="whatsapp",
                event_type="whatsapp_inbound",
                message=message,
                ai_intent=str(care_metadata.get("customer_care_status") or "inbound_message"),
                ai_reply=ai_reply,
                workflow_status="answered" if ai_reply else "received",
                metadata=_json_safe_value({**metadata, **care_metadata, "reply_delivery": delivery_metadata}),
            )
            await _complete_whatsapp_webhook_event(
                session,
                event_id=webhook_event_id,
                tenant_id=tenant_id,
                provider="evolution",
                external_event_id=provider_message_id,
                response_payload=_json_safe_value({
                    "status": "processed",
                    "message_id": message.message_id,
                    "customer_care_status": care_metadata.get("customer_care_status"),
                    "reply_delivery": delivery_metadata,
                }),
            )
        except Exception as exc:
            logger.warning(
                "evolution_webhook_processing_failed",
                extra={
                    "event_type": "evolution_webhook_processing_failed",
                    "tenant_id": tenant_id,
                    "status": 0,
                    "route": "/api/webhooks/evolution",
                    "request_id": "",
                    "integration_name": "whatsapp_evolution",
                    "conversation_id": sender_phone,
                    "booking_reference": "",
                    "job_name": "",
                    "job_id": "",
                },
                exc_info=exc,
            )

    return {"status": "processed", "messages_processed": 1}


@api.post("/automation/booking-callback")
async def booking_callback(
    request: Request,
    authorization: str | None = Header(default=None),
) -> dict[str, str]:
    token = authorization.removeprefix("Bearer ").strip() if authorization else None
    try:
        verify_bearer_token(
            token,
            request.app.state.settings.n8n_webhook_bearer_token,
            label="automation callback",
        )
    except ValueError as exc:
        raise HTTPException(status_code=401, detail=str(exc)) from exc

    payload = await request.json()
    message = extract_tawk_message(
        {
            "conversationId": payload.get("conversation_id"),
            "message": {"text": payload.get("summary") or "n8n callback"},
            "sender": {"name": "n8n"},
        }
    )

    async with get_session(request.app.state.session_factory) as session:
        await store_event(
            session,
            source="n8n",
            event_type="booking_callback",
            message=message,
            ai_intent=payload.get("status"),
            ai_reply=payload.get("reply"),
            workflow_status=payload.get("status"),
            metadata=payload,
        )
        if await is_flag_enabled("new_booking_domain_dual_write", session=session):
            try:
                await sync_callback_status_to_mirrors(
                    session,
                    payload=payload,
                )
                await session.commit()
            except Exception:
                await session.rollback()

    return {"status": "logged"}


@api.post("/admin/login", response_model=AdminSessionResponse)
async def admin_login(payload: AdminLoginRequest, request: Request) -> AdminSessionResponse:
    cfg: Settings = request.app.state.settings
    username = payload.username.strip()
    if username.lower() != cfg.admin_username.strip().lower() or payload.password != cfg.admin_password:
        raise HTTPException(status_code=401, detail="Invalid admin credentials")
    session_token, expires_at = create_admin_session_token(cfg, username)
    return AdminSessionResponse(
        status="ok",
        username=username,
        session_token=session_token,
        expires_at=expires_at.isoformat(),
    )


@api.get("/admin/overview", response_model=AdminOverviewResponse)
async def admin_overview(
    request: Request,
    response: Response,
    authorization: str | None = Header(default=None),
    x_admin_token: str | None = Header(default=None),
) -> AdminOverviewResponse:
    require_admin_access(request, authorization=authorization, x_admin_token=x_admin_token)

    async with get_session(request.app.state.session_factory) as session:
        payload, bookings_view_enabled = await build_admin_overview_payload(session)

    response.headers["X-BookedAI-Admin-Bookings-View"] = (
        "enhanced" if bookings_view_enabled else "legacy"
    )
    return AdminOverviewResponse(**payload)


@api.get("/admin/bookings", response_model=AdminBookingsResponse)
async def admin_bookings(
    request: Request,
    response: Response,
    authorization: str | None = Header(default=None),
    x_admin_token: str | None = Header(default=None),
    limit: int = 50,
    offset: int = 0,
    q: str | None = None,
    industry: str | None = None,
    payment_status: str | None = None,
    email_status: str | None = None,
    workflow_status: str | None = None,
    date_from: str | None = None,
    date_to: str | None = None,
) -> AdminBookingsResponse:
    require_admin_access(request, authorization=authorization, x_admin_token=x_admin_token)

    limit = min(max(limit, 1), 100)
    offset = max(offset, 0)

    async with get_session(request.app.state.session_factory) as session:
        payload, bookings_view_enabled = await build_admin_bookings_payload(
            session,
            limit=limit,
            offset=offset,
            query=q,
            industry=industry,
            payment_status=payment_status,
            email_status=email_status,
            workflow_status=workflow_status,
            date_from=date_from,
            date_to=date_to,
        )
        shadow_summary = await build_admin_bookings_shadow_summary(
            session,
            legacy_records=payload["items"],  # type: ignore[arg-type]
            limit=limit,
        )

    response.headers["X-BookedAI-Admin-Bookings-View"] = (
        "enhanced" if bookings_view_enabled else "legacy"
    )
    response.headers["X-BookedAI-Admin-Bookings-Shadow"] = str(shadow_summary.get("status", "disabled"))
    response.headers["X-BookedAI-Admin-Bookings-Shadow-Matched"] = str(shadow_summary.get("matched_count", 0))
    response.headers["X-BookedAI-Admin-Bookings-Shadow-Mismatch"] = str(shadow_summary.get("mismatch_count", 0))
    response.headers["X-BookedAI-Admin-Bookings-Shadow-Missing"] = str(shadow_summary.get("missing_count", 0))
    response.headers["X-BookedAI-Admin-Bookings-Shadow-Payment-Status-Mismatch"] = str(
        shadow_summary.get("payment_status_mismatch_count", 0)
    )
    response.headers["X-BookedAI-Admin-Bookings-Shadow-Amount-Mismatch"] = str(
        shadow_summary.get("amount_mismatch_count", 0)
    )
    response.headers["X-BookedAI-Admin-Bookings-Shadow-Meeting-Status-Mismatch"] = str(
        shadow_summary.get("meeting_status_mismatch_count", 0)
    )
    response.headers["X-BookedAI-Admin-Bookings-Shadow-Workflow-Status-Mismatch"] = str(
        shadow_summary.get("workflow_status_mismatch_count", 0)
    )
    response.headers["X-BookedAI-Admin-Bookings-Shadow-Email-Status-Mismatch"] = str(
        shadow_summary.get("email_status_mismatch_count", 0)
    )
    response.headers["X-BookedAI-Admin-Bookings-Shadow-Field-Parity-Mismatch"] = str(
        shadow_summary.get("field_parity_mismatch_count", 0)
    )
    response.headers["X-BookedAI-Admin-Bookings-Shadow-Top-Drift-References"] = str(
        shadow_summary.get("top_drift_references", [])
    )
    response.headers["X-BookedAI-Admin-Bookings-Shadow-Recent-Drift-Examples"] = str(
        shadow_summary.get("recent_drift_examples", [])
    )
    return AdminBookingsResponse(**payload)


@api.get("/admin/bookings/{booking_reference}", response_model=AdminBookingDetailResponse)
async def admin_booking_detail(
    booking_reference: str,
    request: Request,
    authorization: str | None = Header(default=None),
    x_admin_token: str | None = Header(default=None),
) -> AdminBookingDetailResponse:
    require_admin_access(request, authorization=authorization, x_admin_token=x_admin_token)

    async with get_session(request.app.state.session_factory) as session:
        try:
            payload = await build_admin_booking_detail_payload(
                session,
                booking_reference=booking_reference,
            )
        except LookupError as exc:
            raise HTTPException(status_code=404, detail=str(exc)) from exc
    return AdminBookingDetailResponse(**payload)


@api.post("/admin/bookings/{booking_reference}/confirm-email", response_model=EmailSendResponse)
async def admin_booking_confirm_email(
    booking_reference: str,
    request: Request,
    payload: AdminBookingConfirmationRequest,
    authorization: str | None = Header(default=None),
    x_admin_token: str | None = Header(default=None),
) -> EmailSendResponse:
    require_admin_access(request, authorization=authorization, x_admin_token=x_admin_token)

    async with get_session(request.app.state.session_factory) as session:
        try:
            payload_data = await send_admin_booking_confirmation_email(
                session,
                booking_reference=booking_reference,
                note=payload.note,
                email_service=request.app.state.email_service,
                booking_business_email=request.app.state.settings.booking_business_email,
            )
        except LookupError as exc:
            raise HTTPException(status_code=404, detail=str(exc)) from exc
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc

    return EmailSendResponse(**payload_data)


@api.post(
    "/admin/portal-support/{request_id}/{action}",
    response_model=AdminPortalSupportActionResponse,
)
async def admin_portal_support_action(
    request_id: int,
    action: str,
    request: Request,
    payload: AdminPortalSupportActionRequest,
    authorization: str | None = Header(default=None),
    x_admin_token: str | None = Header(default=None),
) -> AdminPortalSupportActionResponse:
    admin_actor = require_admin_access(request, authorization=authorization, x_admin_token=x_admin_token)

    async with get_session(request.app.state.session_factory) as session:
        try:
            payload_data = await apply_admin_portal_support_action(
                session,
                request_id=request_id,
                action=action,
                actor_id=admin_actor,
                note=payload.note,
            )
            await session.commit()
        except LookupError as exc:
            raise HTTPException(status_code=404, detail=str(exc)) from exc
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc

    return AdminPortalSupportActionResponse(**payload_data)


@api.post("/admin/reliability/handoff/discord", response_model=AdminDiscordHandoffResponse)
async def admin_reliability_handoff_discord(
    request: Request,
    payload: AdminDiscordHandoffRequest,
    authorization: str | None = Header(default=None),
    x_admin_token: str | None = Header(default=None),
) -> AdminDiscordHandoffResponse:
    require_admin_access(request, authorization=authorization, x_admin_token=x_admin_token)

    discord_service: DiscordService = request.app.state.discord_service
    result = await discord_service.send_handoff_summary(
        title=payload.title,
        body=payload.summary,
        lane_label=payload.lane_label,
        handoff_format=payload.handoff_format,
    )
    if result.status == "not_configured":
        raise HTTPException(status_code=400, detail=result.message)
    if result.status != "sent":
        raise HTTPException(status_code=502, detail=result.message)

    return AdminDiscordHandoffResponse(status=result.status, message=result.message)


@api.get("/admin/apis", response_model=AdminApiInventoryResponse)
async def admin_api_inventory(
    request: Request,
    authorization: str | None = Header(default=None),
    x_admin_token: str | None = Header(default=None),
) -> AdminApiInventoryResponse:
    require_admin_access(request, authorization=authorization, x_admin_token=x_admin_token)

    items: list[dict[str, object]] = []
    for route in request.app.routes:
        path = getattr(route, "path", "")
        methods = sorted(method for method in (getattr(route, "methods", set()) or set()) if method != "HEAD")
        if not path.startswith("/api/") or not methods:
            continue
        items.append(
            {
                "path": path,
                "methods": methods,
                "protected": path.startswith("/api/admin")
                or path.startswith("/api/email")
                or path.startswith("/api/automation"),
            }
        )

    items.sort(key=lambda item: str(item["path"]))
    return AdminApiInventoryResponse(status="ok", items=items)


@api.get("/admin/messaging", response_model=AdminMessagingListResponse)
async def admin_messaging(
    request: Request,
    authorization: str | None = Header(default=None),
    x_admin_token: str | None = Header(default=None),
    limit: int = 60,
) -> AdminMessagingListResponse:
    require_admin_access(request, authorization=authorization, x_admin_token=x_admin_token)

    async with get_session(request.app.state.session_factory) as session:
        payload = await build_admin_messaging_payload(session, limit=limit)

    return AdminMessagingListResponse(**payload)


@api.get("/admin/messaging/{source_kind}/{item_id}", response_model=AdminMessagingDetailResponse)
async def admin_message_detail(
    source_kind: str,
    item_id: str,
    request: Request,
    authorization: str | None = Header(default=None),
    x_admin_token: str | None = Header(default=None),
) -> AdminMessagingDetailResponse:
    require_admin_access(request, authorization=authorization, x_admin_token=x_admin_token)

    async with get_session(request.app.state.session_factory) as session:
        try:
            payload = await build_admin_message_detail_payload(
                session,
                source_kind=source_kind,
                item_id=item_id,
            )
        except LookupError as exc:
            raise HTTPException(status_code=404, detail=str(exc)) from exc

    return AdminMessagingDetailResponse(**payload)


@api.post(
    "/admin/messaging/{source_kind}/{item_id}/{action}",
    response_model=AdminMessagingActionResponse,
)
async def admin_message_action(
    source_kind: str,
    item_id: str,
    action: str,
    request: Request,
    payload: AdminMessagingActionRequest,
    authorization: str | None = Header(default=None),
    x_admin_token: str | None = Header(default=None),
) -> AdminMessagingActionResponse:
    admin_actor = require_admin_access(request, authorization=authorization, x_admin_token=x_admin_token)

    async with get_session(request.app.state.session_factory) as session:
        try:
            result = await apply_admin_message_action(
                session,
                source_kind=source_kind,
                item_id=item_id,
                action=action,
                actor_id=admin_actor,
                note=payload.note,
            )
            await session.commit()
        except LookupError as exc:
            raise HTTPException(status_code=404, detail=str(exc)) from exc
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc

    return AdminMessagingActionResponse(**result)


@api.get("/admin/services", response_model=AdminServiceMerchantListResponse)
async def admin_services(
    request: Request,
    authorization: str | None = Header(default=None),
    x_admin_token: str | None = Header(default=None),
) -> AdminServiceMerchantListResponse:
    require_admin_access(request, authorization=authorization, x_admin_token=x_admin_token)

    async with get_session(request.app.state.session_factory) as session:
        items = (
            await session.execute(
                select(ServiceMerchantProfile).order_by(
                    desc(ServiceMerchantProfile.featured),
                    ServiceMerchantProfile.business_name,
                    ServiceMerchantProfile.name,
                )
            )
        ).scalars().all()

    return AdminServiceMerchantListResponse(
        status="ok",
        items=[build_service_merchant_item(item) for item in items],
    )


@api.get("/admin/services/quality", response_model=AdminServiceCatalogQualityResponse)
async def admin_service_catalog_quality(
    request: Request,
    authorization: str | None = Header(default=None),
    x_admin_token: str | None = Header(default=None),
    search_ready: bool | None = None,
    quality_warning: str | None = None,
) -> AdminServiceCatalogQualityResponse:
    require_admin_access(request, authorization=authorization, x_admin_token=x_admin_token)

    async with get_session(request.app.state.session_factory) as session:
        services = (
            await session.execute(
                select(ServiceMerchantProfile).order_by(
                    desc(ServiceMerchantProfile.featured),
                    ServiceMerchantProfile.business_name,
                    ServiceMerchantProfile.name,
                )
            )
        ).scalars().all()

    items = [build_service_merchant_item(item) for item in services]
    if search_ready is not None:
        items = [item for item in items if bool(item.get("is_search_ready")) is search_ready]
    if quality_warning:
        normalized_warning = quality_warning.strip()
        items = [
            item
            for item in items
            if normalized_warning in list(item.get("quality_warnings") or [])
        ]

    return AdminServiceCatalogQualityResponse(
        status="ok",
        counts=build_service_catalog_quality_counts(items),
        items=items,
    )


@api.get("/admin/services/quality/export.csv")
async def admin_service_catalog_quality_export(
    request: Request,
    authorization: str | None = Header(default=None),
    x_admin_token: str | None = Header(default=None),
    search_ready: bool | None = None,
    quality_warning: str | None = None,
) -> Response:
    require_admin_access(request, authorization=authorization, x_admin_token=x_admin_token)

    async with get_session(request.app.state.session_factory) as session:
        services = (
            await session.execute(
                select(ServiceMerchantProfile).order_by(
                    desc(ServiceMerchantProfile.featured),
                    ServiceMerchantProfile.business_name,
                    ServiceMerchantProfile.name,
                )
            )
        ).scalars().all()

    items = [build_service_merchant_item(item) for item in services]
    if search_ready is not None:
        items = [item for item in items if bool(item.get("is_search_ready")) is search_ready]
    if quality_warning:
        normalized_warning = quality_warning.strip()
        items = [
            item
            for item in items
            if normalized_warning in list(item.get("quality_warnings") or [])
        ]

    buffer = StringIO()
    writer = csv.writer(buffer)
    writer.writerow(
        [
            "service_id",
            "business_name",
            "name",
            "category",
            "location",
            "is_active",
            "is_search_ready",
            "quality_warnings",
            "tags",
            "updated_at",
        ]
    )
    for item in items:
        writer.writerow(
            [
                item.get("service_id"),
                item.get("business_name"),
                item.get("name"),
                item.get("category"),
                item.get("location"),
                item.get("is_active"),
                item.get("is_search_ready"),
                "|".join(str(value) for value in list(item.get("quality_warnings") or [])),
                "|".join(str(value) for value in list(item.get("tags") or [])),
                item.get("updated_at"),
            ]
        )

    response = Response(content=buffer.getvalue(), media_type="text/csv")
    response.headers["Content-Disposition"] = 'attachment; filename="service-catalog-quality.csv"'
    return response


@api.post("/admin/services/import-website", response_model=AdminServiceMerchantListResponse)
async def admin_import_services_from_website(
    request: Request,
    payload: AdminServiceImportRequest,
    authorization: str | None = Header(default=None),
    x_admin_token: str | None = Header(default=None),
) -> AdminServiceMerchantListResponse:
    require_admin_access(request, authorization=authorization, x_admin_token=x_admin_token)

    openai_service: OpenAIService = request.app.state.openai_service
    website_input = payload.website_url.strip()
    website_url = await openai_service.resolve_business_website(
        website_or_query=website_input,
        business_name=payload.business_name,
    )
    if not website_url:
        raise HTTPException(
            status_code=422,
            detail="Could not find the partner website from that URL or business name.",
        )
    extracted = await openai_service.extract_services_from_website(
        website_url=website_url,
        business_name=payload.business_name,
        category_hint=payload.category,
    )
    if not extracted:
        raise HTTPException(
            status_code=422,
            detail="Could not extract services from the website. Try a more specific services or pricing page.",
        )

    business_name = (payload.business_name or "").strip() or website_url.replace("https://", "").replace("http://", "").split("/")[0]

    async with get_session(request.app.state.session_factory) as session:
        for item in extracted:
            service_name = str(item.get("name") or "").strip()
            if not service_name:
                continue

            service_id = slugify_value(f"{business_name}-{service_name}")
            existing = (
                await session.execute(
                    select(ServiceMerchantProfile).where(ServiceMerchantProfile.service_id == service_id)
                )
            ).scalar_one_or_none()

            mapped_values = {
                "service_id": service_id,
                "business_name": business_name,
                "business_email": str(payload.business_email or "").strip().lower() or None,
                "name": service_name,
                "category": str(item.get("category") or payload.category or "").strip() or None,
                "summary": str(item.get("summary") or "").strip() or None,
                "amount_aud": float(item["amount_aud"]) if item.get("amount_aud") is not None else None,
                "duration_minutes": int(item["duration_minutes"]) if item.get("duration_minutes") is not None else None,
                "venue_name": str(item.get("venue_name") or "").strip() or None,
                "location": str(item.get("location") or "").strip() or None,
                "map_url": str(item.get("map_url") or "").strip() or None,
                "booking_url": str(item.get("booking_url") or website_url).strip() or None,
                "image_url": str(item.get("image_url") or "").strip() or None,
                "source_url": website_url,
                "tags_json": [str(tag).strip() for tag in item.get("tags", []) if str(tag).strip()],
                "featured": 1 if item.get("featured") else 0,
                "is_active": 1,
            }
            mapped_values, _quality_warnings = apply_catalog_quality_gate(mapped_values)

            if mapped_values["map_url"] is None and (mapped_values["venue_name"] or mapped_values["location"]):
                from services import _build_google_maps_url

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
        items = (
            await session.execute(
                select(ServiceMerchantProfile).order_by(
                    desc(ServiceMerchantProfile.featured),
                    ServiceMerchantProfile.business_name,
                    ServiceMerchantProfile.name,
                )
            )
        ).scalars().all()

    return AdminServiceMerchantListResponse(
        status="ok",
        items=[build_service_merchant_item(item) for item in items],
    )


@api.delete("/admin/services/{service_row_id}", response_model=AdminServiceMerchantListResponse)
async def admin_delete_service(
    service_row_id: int,
    request: Request,
    authorization: str | None = Header(default=None),
    x_admin_token: str | None = Header(default=None),
) -> AdminServiceMerchantListResponse:
    require_admin_access(request, authorization=authorization, x_admin_token=x_admin_token)

    async with get_session(request.app.state.session_factory) as session:
        item = await session.get(ServiceMerchantProfile, service_row_id)
        if not item:
            raise HTTPException(status_code=404, detail="Imported service was not found")
        await session.delete(item)
        await session.commit()
        items = (
            await session.execute(
                select(ServiceMerchantProfile).order_by(
                    desc(ServiceMerchantProfile.featured),
                    ServiceMerchantProfile.business_name,
                    ServiceMerchantProfile.name,
                )
            )
        ).scalars().all()

    return AdminServiceMerchantListResponse(
        status="ok",
        items=[build_service_merchant_item(item) for item in items],
    )


@api.get("/admin/partners", response_model=PartnerProfileListResponse)
async def admin_partners(
    request: Request,
    authorization: str | None = Header(default=None),
    x_admin_token: str | None = Header(default=None),
) -> PartnerProfileListResponse:
    require_admin_access(request, authorization=authorization, x_admin_token=x_admin_token)

    async with get_session(request.app.state.session_factory) as session:
        items = (
            await session.execute(
                select(PartnerProfile).order_by(
                    desc(PartnerProfile.featured),
                    PartnerProfile.sort_order,
                    PartnerProfile.id,
                )
            )
        ).scalars().all()

    return PartnerProfileListResponse(status="ok", items=[build_partner_item(item) for item in items])


@api.post("/admin/partners", response_model=PartnerProfileListResponse)
async def admin_partner_create(
    request: Request,
    payload: PartnerProfileUpsertRequest,
    authorization: str | None = Header(default=None),
    x_admin_token: str | None = Header(default=None),
) -> PartnerProfileListResponse:
    require_admin_access(request, authorization=authorization, x_admin_token=x_admin_token)

    async with get_session(request.app.state.session_factory) as session:
        session.add(
            PartnerProfile(
                name=payload.name.strip(),
                category=payload.category.strip() if payload.category else None,
                website_url=payload.website_url.strip() if payload.website_url else None,
                description=payload.description.strip() if payload.description else None,
                logo_url=payload.logo_url.strip() if payload.logo_url else None,
                image_url=payload.image_url.strip() if payload.image_url else None,
                featured=1 if payload.featured else 0,
                sort_order=payload.sort_order,
                is_active=1 if payload.is_active else 0,
            )
        )
        await session.commit()
        items = (
            await session.execute(
                select(PartnerProfile).order_by(
                    desc(PartnerProfile.featured),
                    PartnerProfile.sort_order,
                    PartnerProfile.id,
                )
            )
        ).scalars().all()

    return PartnerProfileListResponse(status="ok", items=[build_partner_item(item) for item in items])


@api.put("/admin/partners/{partner_id}", response_model=PartnerProfileListResponse)
async def admin_partner_update(
    partner_id: int,
    request: Request,
    payload: PartnerProfileUpsertRequest,
    authorization: str | None = Header(default=None),
    x_admin_token: str | None = Header(default=None),
) -> PartnerProfileListResponse:
    require_admin_access(request, authorization=authorization, x_admin_token=x_admin_token)

    async with get_session(request.app.state.session_factory) as session:
        partner = await session.get(PartnerProfile, partner_id)
        if not partner:
            raise HTTPException(status_code=404, detail="Partner was not found")
        partner.name = payload.name.strip()
        partner.category = payload.category.strip() if payload.category else None
        partner.website_url = payload.website_url.strip() if payload.website_url else None
        partner.description = payload.description.strip() if payload.description else None
        partner.logo_url = payload.logo_url.strip() if payload.logo_url else None
        partner.image_url = payload.image_url.strip() if payload.image_url else None
        partner.featured = 1 if payload.featured else 0
        partner.sort_order = payload.sort_order
        partner.is_active = 1 if payload.is_active else 0
        await session.commit()
        items = (
            await session.execute(
                select(PartnerProfile).order_by(
                    desc(PartnerProfile.featured),
                    PartnerProfile.sort_order,
                    PartnerProfile.id,
                )
            )
        ).scalars().all()

    return PartnerProfileListResponse(status="ok", items=[build_partner_item(item) for item in items])


@api.delete("/admin/partners/{partner_id}", response_model=PartnerProfileListResponse)
async def admin_partner_delete(
    partner_id: int,
    request: Request,
    authorization: str | None = Header(default=None),
    x_admin_token: str | None = Header(default=None),
) -> PartnerProfileListResponse:
    require_admin_access(request, authorization=authorization, x_admin_token=x_admin_token)

    async with get_session(request.app.state.session_factory) as session:
        partner = await session.get(PartnerProfile, partner_id)
        if not partner:
            raise HTTPException(status_code=404, detail="Partner was not found")
        await session.delete(partner)
        await session.commit()
        items = (
            await session.execute(
                select(PartnerProfile).order_by(
                    desc(PartnerProfile.featured),
                    PartnerProfile.sort_order,
                    PartnerProfile.id,
                )
            )
        ).scalars().all()

    return PartnerProfileListResponse(status="ok", items=[build_partner_item(item) for item in items])


@api.get("/admin/config", response_model=AdminConfigResponse)
async def admin_config(
    request: Request,
    authorization: str | None = Header(default=None),
    x_admin_token: str | None = Header(default=None),
) -> AdminConfigResponse:
    require_admin_access(request, authorization=authorization, x_admin_token=x_admin_token)

    cfg: Settings = request.app.state.settings
    raw_items: list[tuple[str, str, str, bool]] = [
        ("AI_PROVIDER", cfg.ai_provider, "AI Provider", False),
        ("AI_API_KEY", cfg.ai_api_key, "AI Provider", True),
        ("AI_BASE_URL", cfg.ai_base_url, "AI Provider", False),
        ("AI_MODEL", cfg.ai_model, "AI Provider", False),
        ("AI_FALLBACK_PROVIDER", cfg.ai_fallback_provider, "AI Provider", False),
        ("AI_FALLBACK_API_KEY", cfg.ai_fallback_api_key, "AI Provider", True),
        ("AI_FALLBACK_BASE_URL", cfg.ai_fallback_base_url, "AI Provider", False),
        ("AI_FALLBACK_MODEL", cfg.ai_fallback_model, "AI Provider", False),
        ("N8N_BOOKING_WEBHOOK_URL", cfg.n8n_booking_webhook_url, "n8n", False),
        ("N8N_API_KEY", cfg.n8n_api_key, "n8n", True),
        ("N8N_WEBHOOK_BEARER_TOKEN", cfg.n8n_webhook_bearer_token, "n8n", True),
        ("DISCORD_WEBHOOK_URL", cfg.discord_webhook_url, "Discord", True),
        ("DISCORD_WEBHOOK_USERNAME", cfg.discord_webhook_username, "Discord", False),
        ("DISCORD_WEBHOOK_AVATAR_URL", cfg.discord_webhook_avatar_url, "Discord", False),
        ("DISCORD_APPLICATION_ID", cfg.discord_application_id, "Discord", False),
        ("DISCORD_BOT_TOKEN", cfg.discord_bot_token, "Discord", True),
        ("DISCORD_PUBLIC_KEY", cfg.discord_public_key, "Discord", True),
        ("DISCORD_GUILD_ID", cfg.discord_guild_id, "Discord", False),
        ("STRIPE_SECRET_KEY", cfg.stripe_secret_key, "Stripe", True),
        ("STRIPE_PUBLISHABLE_KEY", cfg.stripe_publishable_key, "Stripe", True),
        ("STRIPE_CURRENCY", cfg.stripe_currency, "Stripe", False),
        ("ZOHO_CALENDAR_API_BASE_URL", cfg.zoho_calendar_api_base_url, "Zoho", False),
        ("ZOHO_ACCOUNTS_BASE_URL", cfg.zoho_accounts_base_url, "Zoho", False),
        ("ZOHO_CALENDAR_UID", cfg.zoho_calendar_uid, "Zoho", False),
        ("ZOHO_CALENDAR_ACCESS_TOKEN", cfg.zoho_calendar_access_token, "Zoho", True),
        ("ZOHO_CALENDAR_REFRESH_TOKEN", cfg.zoho_calendar_refresh_token, "Zoho", True),
        ("ZOHO_CALENDAR_CLIENT_ID", cfg.zoho_calendar_client_id, "Zoho", True),
        ("ZOHO_CALENDAR_CLIENT_SECRET", cfg.zoho_calendar_client_secret, "Zoho", True),
        ("BOOKING_BUSINESS_EMAIL", cfg.booking_business_email, "Email", False),
        ("ADMIN_USERNAME", cfg.admin_username, "Admin", False),
        ("ADMIN_PASSWORD", cfg.admin_password, "Admin", True),
        ("EMAIL_SMTP_HOST", cfg.email_smtp_host, "Email", False),
        ("EMAIL_SMTP_PORT", str(cfg.email_smtp_port), "Email", False),
        ("EMAIL_SMTP_USERNAME", cfg.email_smtp_username, "Email", False),
        ("EMAIL_SMTP_PASSWORD", cfg.email_smtp_password, "Email", True),
        ("EMAIL_SMTP_FROM", cfg.email_smtp_from, "Email", False),
        ("EMAIL_SMTP_USE_TLS", str(cfg.email_smtp_use_tls).lower(), "Email", False),
        (
            "EMAIL_SMTP_USE_STARTTLS",
            str(cfg.email_smtp_use_starttls).lower(),
            "Email",
            False,
        ),
        ("EMAIL_IMAP_HOST", cfg.email_imap_host, "Email", False),
        ("EMAIL_IMAP_PORT", str(cfg.email_imap_port), "Email", False),
        ("EMAIL_IMAP_USERNAME", cfg.email_imap_username, "Email", False),
        ("EMAIL_IMAP_PASSWORD", cfg.email_imap_password, "Email", True),
        ("EMAIL_IMAP_MAILBOX", cfg.email_imap_mailbox, "Email", False),
        ("EMAIL_IMAP_USE_SSL", str(cfg.email_imap_use_ssl).lower(), "Email", False),
        ("SUPABASE_URL", cfg.supabase_url, "Supabase", False),
        ("SUPABASE_ANON_KEY", cfg.supabase_anon_key, "Supabase", True),
        ("SUPABASE_SERVICE_ROLE_KEY", cfg.supabase_service_role_key, "Supabase", True),
        ("PUBLIC_APP_URL", cfg.public_app_url, "App", False),
        ("PUBLIC_API_URL", cfg.public_api_url, "App", False),
        ("ADMIN_API_TOKEN", cfg.admin_api_token, "Admin", True),
    ]

    return AdminConfigResponse(
        status="ok",
        items=[
            {
                "key": key,
                "value": mask_secret(value) if is_secret else value,
                "category": category,
                "masked": is_secret,
            }
            for key, value, category, is_secret in raw_items
        ],
    )


@api.get("/admin/tenants", response_model=AdminTenantListResponse)
async def admin_tenants(
    request: Request,
    authorization: str | None = Header(default=None),
    x_admin_token: str | None = Header(default=None),
) -> AdminTenantListResponse:
    require_admin_access(request, authorization=authorization, x_admin_token=x_admin_token)

    async with get_session(request.app.state.session_factory) as session:
        items = await _admin_list_tenants(session)

    return AdminTenantListResponse(status="ok", items=items)


@api.get("/admin/tenants/{tenant_ref}", response_model=AdminTenantDetailResponse)
async def admin_tenant_detail(
    tenant_ref: str,
    request: Request,
    authorization: str | None = Header(default=None),
    x_admin_token: str | None = Header(default=None),
) -> AdminTenantDetailResponse:
    require_admin_access(request, authorization=authorization, x_admin_token=x_admin_token)

    async with get_session(request.app.state.session_factory) as session:
        payload = await _admin_get_tenant_detail_payload(session, tenant_ref)

    return AdminTenantDetailResponse(**payload)


@api.patch("/admin/tenants/{tenant_ref}", response_model=AdminTenantDetailResponse)
async def admin_tenant_update(
    tenant_ref: str,
    payload: AdminTenantProfileUpdateRequest,
    request: Request,
    authorization: str | None = Header(default=None),
    x_admin_token: str | None = Header(default=None),
) -> AdminTenantDetailResponse:
    admin_actor = require_admin_access(request, authorization=authorization, x_admin_token=x_admin_token)

    async with get_session(request.app.state.session_factory) as session:
        tenant_repository = TenantRepository(RepositoryContext(session=session))
        tenant_profile = await tenant_repository.get_tenant_profile(tenant_ref)
        if not tenant_profile:
            raise HTTPException(status_code=404, detail="Tenant was not found")

        tenant_id = str(tenant_profile.get("id") or "")
        updated_profile = await tenant_repository.update_tenant_profile(
            tenant_id=tenant_id,
            name=_clean_optional_text(payload.business_name),
            industry=_clean_optional_text(payload.industry),
            timezone=_clean_optional_text(payload.timezone),
            locale=_clean_optional_text(payload.locale),
        )
        if not updated_profile:
            raise HTTPException(status_code=404, detail="Tenant was not found")

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
        if _clean_optional_text(payload.logo_url):
            workspace_settings["logo_url"] = str(payload.logo_url).strip()
        if _clean_optional_text(payload.hero_image_url):
            workspace_settings["hero_image_url"] = str(payload.hero_image_url).strip()
        sanitized_intro_html = _sanitize_workspace_html(payload.introduction_html)
        if sanitized_intro_html:
            workspace_settings["introduction_html"] = sanitized_intro_html
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
            event_type="admin.tenant.profile_updated",
            entity_type="tenant_profile",
            entity_id=tenant_id,
            actor_type="admin_operator",
            actor_id=admin_actor,
            payload={
                "summary": "Tenant profile updated from the admin workspace.",
                "business_name": updated_profile.get("name"),
                "industry": updated_profile.get("industry"),
                "timezone": updated_profile.get("timezone"),
                "locale": updated_profile.get("locale"),
            },
        )
        await session.commit()
        detail_payload = await _admin_get_tenant_detail_payload(session, tenant_ref)

    return AdminTenantDetailResponse(**detail_payload)


@api.patch("/admin/tenants/{tenant_ref}/members/{member_email}", response_model=AdminTenantDetailResponse)
async def admin_tenant_member_update(
    tenant_ref: str,
    member_email: str,
    payload: AdminTenantMemberAccessUpdateRequest,
    request: Request,
    authorization: str | None = Header(default=None),
    x_admin_token: str | None = Header(default=None),
) -> AdminTenantDetailResponse:
    admin_actor = require_admin_access(request, authorization=authorization, x_admin_token=x_admin_token)

    async with get_session(request.app.state.session_factory) as session:
        tenant_repository = TenantRepository(RepositoryContext(session=session))
        tenant_profile = await tenant_repository.get_tenant_profile(tenant_ref)
        if not tenant_profile:
            raise HTTPException(status_code=404, detail="Tenant was not found")

        tenant_id = str(tenant_profile.get("id") or "")
        normalized_email = member_email.strip().lower()
        membership = (
            await session.execute(
                select(TenantUserMembership).where(
                    TenantUserMembership.tenant_id == tenant_id,
                    TenantUserMembership.email == normalized_email,
                )
            )
        ).scalar_one_or_none()
        if not membership:
            raise HTTPException(status_code=404, detail="Tenant member was not found")

        if payload.full_name is not None:
            membership.full_name = payload.full_name.strip() or None

        updated_member = await tenant_repository.update_tenant_member_access(
            tenant_id=tenant_id,
            email=normalized_email,
            role=_clean_optional_text(payload.role),
            status=_clean_optional_text(payload.status),
        )
        if not updated_member:
            raise HTTPException(status_code=404, detail="Tenant member was not found")

        audit_repository = AuditLogRepository(RepositoryContext(session=session, tenant_id=tenant_id))
        await audit_repository.append_entry(
            tenant_id=tenant_id,
            event_type="admin.tenant.member_updated",
            entity_type="tenant_member",
            entity_id=normalized_email,
            actor_type="admin_operator",
            actor_id=admin_actor,
            payload={
                "summary": "Tenant member access updated from the admin workspace.",
                "email": updated_member.get("email"),
                "role": updated_member.get("role"),
                "status": updated_member.get("status"),
            },
        )
        await session.commit()
        detail_payload = await _admin_get_tenant_detail_payload(session, tenant_ref)

    return AdminTenantDetailResponse(**detail_payload)


@api.post("/admin/tenants/{tenant_ref}/services", response_model=AdminTenantCatalogResponse)
async def admin_tenant_service_create(
    tenant_ref: str,
    payload: AdminTenantCatalogUpsertRequest,
    request: Request,
    authorization: str | None = Header(default=None),
    x_admin_token: str | None = Header(default=None),
) -> AdminTenantCatalogResponse:
    admin_actor = require_admin_access(request, authorization=authorization, x_admin_token=x_admin_token)

    async with get_session(request.app.state.session_factory) as session:
        tenant_repository = TenantRepository(RepositoryContext(session=session))
        tenant_profile = await tenant_repository.get_tenant_profile(tenant_ref)
        if not tenant_profile:
            raise HTTPException(status_code=404, detail="Tenant was not found")

        tenant_id = str(tenant_profile.get("id") or "")
        tenant_slug = str(tenant_profile.get("slug") or "")
        requested_service_id = _clean_optional_text(payload.service_id)
        service_id = requested_service_id or slugify_value(f"{tenant_slug}-{payload.name}")
        existing = (
            await session.execute(
                select(ServiceMerchantProfile).where(ServiceMerchantProfile.service_id == service_id)
            )
        ).scalar_one_or_none()
        if existing:
            service_id = slugify_value(f"{tenant_slug}-{payload.name}-{secrets.token_hex(2)}")

        mapped_values = {
            "service_id": service_id,
            "tenant_id": tenant_id,
            "business_name": _clean_optional_text(payload.business_name)
            or str(tenant_profile.get("name") or tenant_slug),
            "business_email": _clean_optional_text(payload.business_email),
            "name": payload.name.strip(),
            "category": _clean_optional_text(payload.category),
            "summary": _clean_optional_text(payload.summary),
            "amount_aud": payload.amount_aud,
            "currency_code": (_clean_optional_text(payload.currency_code) or "AUD").upper(),
            "display_price": _clean_optional_text(payload.display_price),
            "duration_minutes": payload.duration_minutes,
            "venue_name": _clean_optional_text(payload.venue_name),
            "location": _clean_optional_text(payload.location),
            "map_url": _clean_optional_text(payload.map_url),
            "booking_url": _clean_optional_text(payload.booking_url),
            "image_url": _clean_optional_text(payload.image_url),
            "source_url": _clean_optional_text(payload.source_url),
            "tags_json": [str(tag).strip() for tag in (payload.tags or []) if str(tag).strip()],
            "featured": 1 if payload.featured else 0,
            "is_active": 0,
        }
        mapped_values, quality_warnings = apply_catalog_quality_gate(mapped_values)
        requested_publish_state = (_clean_optional_text(payload.publish_state) or "draft").lower()
        if requested_publish_state == "published" and quality_warnings:
            raise HTTPException(
                status_code=422,
                detail="This service cannot be published until booking-critical fields are complete.",
            )
        if requested_publish_state == "archived":
            mapped_values["publish_state"] = "archived"
            mapped_values["is_active"] = 0
        elif requested_publish_state == "published":
            mapped_values["publish_state"] = "published"
            mapped_values["is_active"] = 1
        else:
            mapped_values["publish_state"] = "review" if quality_warnings else "draft"
            mapped_values["is_active"] = 0

        service = ServiceMerchantProfile(**mapped_values)
        session.add(service)
        await session.flush()

        audit_repository = AuditLogRepository(RepositoryContext(session=session, tenant_id=tenant_id))
        await audit_repository.append_entry(
            tenant_id=tenant_id,
            event_type="admin.tenant.service_created",
            entity_type="service_catalog",
            entity_id=service.service_id,
            actor_type="admin_operator",
            actor_id=admin_actor,
            payload={
                "summary": "Tenant service created from the admin workspace.",
                "service_name": service.name,
                "publish_state": service.publish_state,
            },
        )
        await session.commit()
        detail_payload = await _admin_get_tenant_detail_payload(session, tenant_ref)

    return AdminTenantCatalogResponse(
        status="ok",
        tenant=detail_payload["tenant"],
        items=detail_payload["services"],
    )


@api.put("/admin/tenants/{tenant_ref}/services/{service_row_id}", response_model=AdminTenantCatalogResponse)
async def admin_tenant_service_update(
    tenant_ref: str,
    service_row_id: int,
    payload: AdminTenantCatalogUpsertRequest,
    request: Request,
    authorization: str | None = Header(default=None),
    x_admin_token: str | None = Header(default=None),
) -> AdminTenantCatalogResponse:
    admin_actor = require_admin_access(request, authorization=authorization, x_admin_token=x_admin_token)

    async with get_session(request.app.state.session_factory) as session:
        tenant_repository = TenantRepository(RepositoryContext(session=session))
        tenant_profile = await tenant_repository.get_tenant_profile(tenant_ref)
        if not tenant_profile:
            raise HTTPException(status_code=404, detail="Tenant was not found")

        tenant_id = str(tenant_profile.get("id") or "")
        service = await session.get(ServiceMerchantProfile, service_row_id)
        if not service or str(service.tenant_id or "") != tenant_id:
            raise HTTPException(status_code=404, detail="Tenant service was not found")

        service.business_name = _clean_optional_text(payload.business_name) or service.business_name
        service.business_email = _clean_optional_text(payload.business_email)
        service.name = payload.name.strip()
        service.category = _clean_optional_text(payload.category)
        service.summary = _clean_optional_text(payload.summary)
        service.amount_aud = payload.amount_aud
        service.currency_code = (_clean_optional_text(payload.currency_code) or service.currency_code or "AUD").upper()
        service.display_price = _clean_optional_text(payload.display_price)
        service.duration_minutes = payload.duration_minutes
        service.venue_name = _clean_optional_text(payload.venue_name)
        service.location = _clean_optional_text(payload.location)
        service.map_url = _clean_optional_text(payload.map_url)
        service.booking_url = _clean_optional_text(payload.booking_url)
        service.image_url = _clean_optional_text(payload.image_url)
        service.source_url = _clean_optional_text(payload.source_url)
        service.tags_json = [str(tag).strip() for tag in (payload.tags or []) if str(tag).strip()]
        service.featured = 1 if payload.featured else 0

        mapped_values, quality_warnings = apply_catalog_quality_gate(
            {
                "name": service.name,
                "category": service.category,
                "summary": service.summary,
                "amount_aud": service.amount_aud,
                "currency_code": service.currency_code,
                "display_price": service.display_price,
                "duration_minutes": service.duration_minutes,
                "venue_name": service.venue_name,
                "location": service.location,
                "map_url": service.map_url,
                "booking_url": service.booking_url,
                "image_url": service.image_url,
                "source_url": service.source_url,
                "tags_json": list(service.tags_json or []),
                "featured": service.featured,
                "business_name": service.business_name,
                "business_email": service.business_email,
                "tenant_id": service.tenant_id,
                "service_id": service.service_id,
            }
        )
        service.business_name = str(mapped_values.get("business_name") or service.business_name)
        service.business_email = mapped_values.get("business_email")
        service.category = mapped_values.get("category")
        service.summary = mapped_values.get("summary")
        service.amount_aud = mapped_values.get("amount_aud")
        service.display_price = mapped_values.get("display_price")
        service.duration_minutes = mapped_values.get("duration_minutes")
        service.venue_name = mapped_values.get("venue_name")
        service.location = mapped_values.get("location")
        service.map_url = mapped_values.get("map_url")
        service.booking_url = mapped_values.get("booking_url")
        service.image_url = mapped_values.get("image_url")
        service.source_url = mapped_values.get("source_url")
        service.tags_json = list(mapped_values.get("tags_json") or [])

        requested_publish_state = (_clean_optional_text(payload.publish_state) or service.publish_state or "draft").lower()
        if requested_publish_state == "published" and quality_warnings:
            raise HTTPException(
                status_code=422,
                detail="This service cannot be published until booking-critical fields are complete.",
            )
        if requested_publish_state == "archived":
            service.publish_state = "archived"
            service.is_active = 0
        elif requested_publish_state == "published":
            service.publish_state = "published"
            service.is_active = 1
        else:
            service.publish_state = "review" if quality_warnings else "draft"
            service.is_active = 0

        audit_repository = AuditLogRepository(RepositoryContext(session=session, tenant_id=tenant_id))
        await audit_repository.append_entry(
            tenant_id=tenant_id,
            event_type="admin.tenant.service_updated",
            entity_type="service_catalog",
            entity_id=service.service_id,
            actor_type="admin_operator",
            actor_id=admin_actor,
            payload={
                "summary": "Tenant service updated from the admin workspace.",
                "service_name": service.name,
                "publish_state": service.publish_state,
            },
        )
        await session.commit()
        detail_payload = await _admin_get_tenant_detail_payload(session, tenant_ref)

    return AdminTenantCatalogResponse(
        status="ok",
        tenant=detail_payload["tenant"],
        items=detail_payload["services"],
    )


@api.delete("/admin/tenants/{tenant_ref}/services/{service_row_id}", response_model=AdminTenantCatalogResponse)
async def admin_tenant_service_delete(
    tenant_ref: str,
    service_row_id: int,
    request: Request,
    authorization: str | None = Header(default=None),
    x_admin_token: str | None = Header(default=None),
) -> AdminTenantCatalogResponse:
    admin_actor = require_admin_access(request, authorization=authorization, x_admin_token=x_admin_token)

    async with get_session(request.app.state.session_factory) as session:
        tenant_repository = TenantRepository(RepositoryContext(session=session))
        tenant_profile = await tenant_repository.get_tenant_profile(tenant_ref)
        if not tenant_profile:
            raise HTTPException(status_code=404, detail="Tenant was not found")

        tenant_id = str(tenant_profile.get("id") or "")
        service = await session.get(ServiceMerchantProfile, service_row_id)
        if not service or str(service.tenant_id or "") != tenant_id:
            raise HTTPException(status_code=404, detail="Tenant service was not found")
        if str(service.publish_state or "draft") == "published":
            raise HTTPException(
                status_code=422,
                detail="Archive the service before deleting it from the admin workspace.",
            )

        deleted_service_id = service.service_id
        deleted_service_name = service.name
        await session.delete(service)
        audit_repository = AuditLogRepository(RepositoryContext(session=session, tenant_id=tenant_id))
        await audit_repository.append_entry(
            tenant_id=tenant_id,
            event_type="admin.tenant.service_deleted",
            entity_type="service_catalog",
            entity_id=deleted_service_id,
            actor_type="admin_operator",
            actor_id=admin_actor,
            payload={
                "summary": "Tenant service deleted from the admin workspace.",
                "service_name": deleted_service_name,
            },
        )
        await session.commit()
        detail_payload = await _admin_get_tenant_detail_payload(session, tenant_ref)

    return AdminTenantCatalogResponse(
        status="ok",
        tenant=detail_payload["tenant"],
        items=detail_payload["services"],
    )


@api.get("/email/status", response_model=EmailStatusResponse)
async def email_status(
    request: Request,
    authorization: str | None = Header(default=None),
    x_admin_token: str | None = Header(default=None),
) -> EmailStatusResponse:
    require_admin_access(request, authorization=authorization, x_admin_token=x_admin_token)

    email_service: EmailService = request.app.state.email_service
    return EmailStatusResponse(
        smtp_configured=email_service.smtp_configured(),
        imap_configured=email_service.imap_configured(),
    )


@api.post("/email/send", response_model=EmailSendResponse)
async def email_send(
    request: Request,
    payload: EmailSendRequest,
    authorization: str | None = Header(default=None),
    x_admin_token: str | None = Header(default=None),
) -> EmailSendResponse:
    require_admin_access(request, authorization=authorization, x_admin_token=x_admin_token)

    email_service: EmailService = request.app.state.email_service
    try:
        await email_service.send_email(
            to=payload.to,
            subject=payload.subject,
            text=payload.text,
            html=payload.html,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"SMTP send failed: {exc}") from exc

    return EmailSendResponse(status="sent", message="Email accepted by SMTP server")


@api.get("/email/inbox", response_model=EmailInboxResponse)
async def email_inbox(
    request: Request,
    limit: int = 20,
    authorization: str | None = Header(default=None),
    x_admin_token: str | None = Header(default=None),
) -> EmailInboxResponse:
    require_admin_access(request, authorization=authorization, x_admin_token=x_admin_token)

    email_service: EmailService = request.app.state.email_service
    try:
        messages = await email_service.fetch_inbox(limit=min(max(limit, 1), 100))
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"IMAP fetch failed: {exc}") from exc

    return EmailInboxResponse(
        status="ok",
        mailbox=request.app.state.settings.email_imap_mailbox,
        count=len(messages),
        messages=messages,
    )
