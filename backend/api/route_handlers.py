from __future__ import annotations

import base64
import csv
import hashlib
import hmac
import json
import re
import secrets
import unicodedata
from contextlib import asynccontextmanager
from datetime import UTC, datetime, timedelta
from io import StringIO
from json import JSONDecodeError
from pathlib import Path
from uuid import uuid4

import httpx
from fastapi import APIRouter, FastAPI, File, Header, HTTPException, Request, Response, UploadFile, status
from sqlalchemy import desc, func, select

from config import Settings, get_settings
from core.feature_flags import is_flag_enabled
from core.logging import get_logger
from db import (
    ConversationEvent,
    PartnerProfile,
    ServiceMerchantProfile,
    create_engine,
    create_session_factory,
    get_session,
    init_database,
)
from integrations.ai_models import SemanticSearchAdapter
from rate_limit import InMemoryRateLimiter, TooManyRequestsError
from repositories.base import RepositoryContext
from repositories.idempotency_repository import IdempotencyRepository
from repositories.tenant_repository import TenantRepository
from repositories.webhook_repository import WebhookEventRepository
from schemas import BookingWorkflowPayload, TawkMessage, TawkWebhookResponse
from schemas import (
    AdminConfigResponse,
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
    build_admin_booking_detail_payload,
    build_admin_bookings_payload,
    build_admin_bookings_shadow_summary,
    build_admin_overview_payload,
    send_admin_booking_confirmation_email,
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
from service_layer.prompt9_semantic_search_service import Prompt9SemanticSearchService
from services import (
    BookingAssistantService,
    EmailService,
    N8NService,
    OpenAIService,
    PricingService,
    extract_tawk_message,
    parse_cors_origins,
    resolve_service_image_url,
    store_event,
    verify_bearer_token,
    verify_tawk_signature,
)
from service_layer.upload_service import save_uploaded_file

settings = get_settings()
logger = get_logger("bookedai.api.route_handlers")

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
        "website_url": "https://bookedai.au",
        "description": "Swim school example used on the landing page to demonstrate a real enquiry-to-booking flow for parents searching nearby lessons.",
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
    engine = create_engine(settings.database_url)
    session_factory = create_session_factory(engine)
    await init_database(engine)
    booking_assistant_service = BookingAssistantService(settings)
    pricing_service = PricingService(settings)
    semantic_search_service = Prompt9SemanticSearchService(SemanticSearchAdapter(settings))
    await seed_default_service_catalog(session_factory, booking_assistant_service)
    await seed_default_partner_profiles(session_factory)

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


def get_admin_session_secret(cfg: Settings) -> str:
    return cfg.admin_api_token or cfg.admin_password


def create_admin_session_token(cfg: Settings, username: str) -> tuple[str, datetime]:
    expires_at = datetime.now(UTC) + timedelta(hours=max(cfg.admin_session_ttl_hours, 1))
    payload = {"sub": username, "exp": int(expires_at.timestamp())}
    encoded = base64.urlsafe_b64encode(
        json.dumps(payload, separators=(",", ":")).encode()
    ).decode()
    signature = hmac.new(
        get_admin_session_secret(cfg).encode(),
        encoded.encode(),
        hashlib.sha256,
    ).hexdigest()
    return f"{encoded}.{signature}", expires_at


def verify_admin_session_token(cfg: Settings, token: str) -> str:
    if not token or "." not in token:
        raise ValueError("Invalid admin session")

    encoded, provided_signature = token.rsplit(".", 1)
    expected_signature = hmac.new(
        get_admin_session_secret(cfg).encode(),
        encoded.encode(),
        hashlib.sha256,
    ).hexdigest()
    if not hmac.compare_digest(provided_signature, expected_signature):
        raise ValueError("Invalid admin session")

    padded = encoded + "=" * (-len(encoded) % 4)
    payload = json.loads(base64.urlsafe_b64decode(padded.encode()).decode())
    expires_at = int(payload.get("exp", 0))
    username = str(payload.get("sub", "")).strip()
    if not username or expires_at <= int(datetime.now(UTC).timestamp()):
        raise ValueError("Admin session expired")
    return username


async def _register_whatsapp_webhook_event(
    session,
    *,
    provider: str,
    external_event_id: str | None,
    payload: dict[str, object],
) -> tuple[bool, int | None, str | None]:
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
                scope=f"whatsapp_inbound:{provider}",
                idempotency_key=external_event_id,
                response_json={"status": "received"},
            )
            if not reservation.get("created"):
                return False, None, tenant_id

        event_id = await webhook_repository.record_event(
            tenant_id=tenant_id,
            provider=f"whatsapp_{provider}",
            external_event_id=external_event_id,
            payload=payload,
        )
        return True, event_id, tenant_id
    except Exception as exc:
        logger.warning(
            "whatsapp_webhook_foundation_record_failed",
            extra={
                "event_type": "whatsapp_webhook_foundation_record_failed",
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
                scope=f"whatsapp_inbound:{provider}",
                idempotency_key=external_event_id,
                response_json=response_payload,
            )
    except Exception as exc:
        logger.warning(
            "whatsapp_webhook_foundation_complete_failed",
            extra={
                "event_type": "whatsapp_webhook_foundation_complete_failed",
                "tenant_id": tenant_id,
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
            except ValueError:
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
    async with get_session(request.app.state.session_factory) as session:
        imported = (
            await session.execute(
                select(ServiceMerchantProfile)
                .where(ServiceMerchantProfile.is_active == 1)
                .order_by(desc(ServiceMerchantProfile.featured), ServiceMerchantProfile.updated_at.desc())
            )
        ).scalars().all()

    imported_catalog = [build_service_catalog_item(item) for item in imported]
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
                    "contact": {
                        "name": payload.customer_name,
                        "email": normalized_email or None,
                        "phone": payload.customer_phone,
                    },
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
        async with get_session(request.app.state.session_factory) as session:
            await store_event(
                session,
                source="pricing",
                event_type="pricing_consultation_created",
                message=TawkMessage(
                    conversation_id=result.consultation_reference,
                    message_id=result.consultation_reference,
                    text=payload.notes or f"{result.plan_name} pricing consultation",
                    sender_name=payload.customer_name,
                    sender_email=payload.customer_email.strip().lower(),
                    sender_phone=payload.customer_phone,
                ),
                ai_intent="pricing_consultation",
                ai_reply=(
                    "Plan booking created with onboarding scheduling, trial offer, and Stripe checkout."
                ),
                workflow_status=result.payment_status,
                metadata={
                    "consultation_reference": result.consultation_reference,
                    "plan_id": result.plan_id,
                    "plan_name": result.plan_name,
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
            await store_event(
                session,
                source="whatsapp",
                event_type="whatsapp_inbound",
                message=message,
                ai_intent="inbound_message",
                ai_reply=None,
                workflow_status="received",
                metadata=metadata,
            )
            await _complete_whatsapp_webhook_event(
                session,
                event_id=webhook_event_id,
                tenant_id=tenant_id,
                provider=str(metadata.get("provider") or "unknown"),
                external_event_id=external_event_id,
                response_payload={"status": "processed", "message_id": message.message_id},
            )
            messages_processed += 1

    return {"status": "processed", "messages_processed": messages_processed}


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
