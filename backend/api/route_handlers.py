from __future__ import annotations

import base64
import hashlib
import hmac
import json
import mimetypes
import re
import secrets
import unicodedata
from contextlib import asynccontextmanager
from datetime import UTC, datetime, timedelta
from json import JSONDecodeError
from pathlib import Path

import httpx
from fastapi import APIRouter, FastAPI, File, Header, HTTPException, Request, UploadFile, status
from sqlalchemy import desc, func, select

from config import Settings, get_settings
from db import (
    ConversationEvent,
    PartnerProfile,
    ServiceMerchantProfile,
    create_engine,
    create_session_factory,
    get_session,
    init_database,
)
from rate_limit import InMemoryRateLimiter, TooManyRequestsError
from schemas import BookingWorkflowPayload, TawkMessage, TawkWebhookResponse
from schemas import (
    AdminConfigResponse,
    AdminBookingDetailResponse,
    AdminBookingConfirmationRequest,
    AdminBookingsResponse,
    AdminApiInventoryResponse,
    AdminLoginRequest,
    AdminOverviewResponse,
    AdminServiceImportRequest,
    AdminServiceMerchantListResponse,
    AdminSessionResponse,
    BookingAssistantCatalogResponse,
    BookingAssistantChatRequest,
    BookingAssistantChatResponse,
    BookingAssistantSessionRequest,
    BookingAssistantSessionResponse,
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

settings = get_settings()

ALLOWED_DOCUMENT_EXTENSIONS = {
    ".pdf": "application/pdf",
    ".doc": "application/msword",
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ".xls": "application/vnd.ms-excel",
    ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ".ppt": "application/vnd.ms-powerpoint",
    ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    ".txt": "text/plain",
    ".csv": "text/csv",
}

ALLOWED_IMAGE_CONTENT_TYPES = {
    ".jpg": "image/jpeg",
    ".png": "image/png",
    ".gif": "image/gif",
    ".webp": "image/webp",
}


def detect_image_extension(content: bytes) -> str | None:
    if content.startswith(b"\xff\xd8\xff"):
        return ".jpg"
    if content.startswith(b"\x89PNG\r\n\x1a\n"):
        return ".png"
    if content.startswith((b"GIF87a", b"GIF89a")):
        return ".gif"
    if len(content) >= 12 and content[:4] == b"RIFF" and content[8:12] == b"WEBP":
        return ".webp"
    return None


def guess_document_extension(file: UploadFile) -> str | None:
    original_name = (file.filename or "").strip()
    suffix = Path(original_name).suffix.lower()
    if suffix in ALLOWED_DOCUMENT_EXTENSIONS:
        return suffix

    guessed_from_type = mimetypes.guess_extension(file.content_type or "")
    if guessed_from_type:
        normalized = guessed_from_type.lower()
        if normalized == ".jpeg":
            normalized = ".jpg"
        if normalized in ALLOWED_DOCUMENT_EXTENSIONS:
            return normalized

    return None


def prepare_upload_target(
    cfg: Settings,
    *,
    category: str,
    filename: str,
) -> tuple[Path, str]:
    relative_dir = Path(category) / secrets.token_hex(2)
    target_dir = Path(cfg.upload_base_dir) / relative_dir
    target_dir.mkdir(parents=True, exist_ok=True)
    relative_url = f"/{relative_dir.as_posix()}/{filename}"
    return target_dir / filename, relative_url


async def save_uploaded_file(
    request: Request,
    *,
    file: UploadFile,
    allowed_kind: str,
) -> dict[str, str | int]:
    await enforce_rate_limit(
        request,
        scope=f"{allowed_kind}-upload",
        limit=20,
        window_seconds=60,
    )

    cfg: Settings = request.app.state.settings
    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Uploaded file is empty")
    if len(content) > cfg.upload_max_file_size_bytes:
        raise HTTPException(
            status_code=413,
            detail=f"File exceeds the {cfg.upload_max_file_size_bytes} byte limit",
        )

    image_extension = detect_image_extension(content)
    if allowed_kind == "images":
        if image_extension is None:
            raise HTTPException(
                status_code=400,
                detail="Only JPEG, PNG, GIF, and WebP images are allowed",
            )
        extension = image_extension
        category = "images"
        content_type = ALLOWED_IMAGE_CONTENT_TYPES[extension]
    else:
        extension = image_extension or guess_document_extension(file)
        if extension is None:
            raise HTTPException(
                status_code=400,
                detail=(
                    "Allowed files: JPEG, PNG, GIF, WebP, PDF, DOC, DOCX, XLS, XLSX, "
                    "PPT, PPTX, TXT, CSV"
                ),
            )
        category = "images" if extension in ALLOWED_IMAGE_CONTENT_TYPES else "documents"
        content_type = (
            ALLOWED_IMAGE_CONTENT_TYPES.get(extension)
            or ALLOWED_DOCUMENT_EXTENSIONS.get(extension)
            or file.content_type
            or "application/octet-stream"
        )

    filename = f"{secrets.token_urlsafe(16).rstrip('=')}{extension}"
    target_path, relative_url = prepare_upload_target(cfg, category=category, filename=filename)
    target_path.write_bytes(content)

    return {
        "filename": filename,
        "content_type": content_type,
        "size": len(content),
        "url": f"{cfg.upload_public_base_url.rstrip('/')}{relative_url}",
        "path": relative_url,
    }


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
    await seed_default_service_catalog(session_factory, booking_assistant_service)

    app.state.settings = settings
    app.state.db_engine = engine
    app.state.session_factory = session_factory
    app.state.openai_service = OpenAIService(settings)
    app.state.n8n_service = N8NService(settings)
    app.state.email_service = EmailService(settings)
    app.state.booking_assistant_service = booking_assistant_service
    app.state.pricing_service = pricing_service
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


def build_booking_record(event: ConversationEvent) -> dict[str, object | None]:
    metadata = event.metadata_json or {}
    service = metadata.get("service") if isinstance(metadata.get("service"), dict) else {}
    contact = metadata.get("contact") if isinstance(metadata.get("contact"), dict) else {}
    booking = metadata.get("booking") if isinstance(metadata.get("booking"), dict) else {}
    service_name = service.get("name") or (
        metadata.get("service") if isinstance(metadata.get("service"), str) else None
    )

    return {
        "booking_reference": metadata.get("booking_reference")
        or event.conversation_id
        or f"event-{event.id}",
        "created_at": event.created_at.astimezone(UTC).isoformat(),
        "industry": metadata.get("industry") or service.get("category"),
        "customer_name": contact.get("name") or event.sender_name,
        "customer_email": contact.get("email") or event.sender_email,
        "business_email": metadata.get("business_email"),
        "customer_phone": contact.get("phone"),
        "service_name": service_name or booking.get("requested_service"),
        "service_id": service.get("id"),
        "requested_date": booking.get("requested_date"),
        "requested_time": booking.get("requested_time"),
        "timezone": booking.get("timezone"),
        "amount_aud": metadata.get("amount_aud"),
        "payment_status": metadata.get("payment_status") or event.workflow_status,
        "payment_url": metadata.get("payment_url"),
        "email_status": metadata.get("email_status"),
        "workflow_status": metadata.get("workflow_status") or event.workflow_status,
        "notes": booking.get("notes") or event.message_text,
    }


def merge_booking_records(events: list[ConversationEvent]) -> list[dict[str, object | None]]:
    by_reference: dict[str, dict[str, object | None]] = {}
    for event in sorted(events, key=lambda item: item.created_at):
        record = build_booking_record(event)
        reference = str(record["booking_reference"])
        current = by_reference.get(reference)
        if current is None:
            by_reference[reference] = record
            continue

        merged = dict(current)
        for key, value in record.items():
            if value not in (None, "", []):
                if (
                    event.source == "n8n"
                    and key in {"customer_name", "customer_email", "customer_phone", "notes"}
                    and current.get(key) not in (None, "", [])
                ):
                    continue
                merged[key] = value
        merged["created_at"] = current["created_at"]
        by_reference[reference] = merged

    return sorted(
        by_reference.values(),
        key=lambda item: str(item["created_at"]),
        reverse=True,
    )


def filter_booking_records(
    records: list[dict[str, object | None]],
    *,
    query: str | None = None,
    industry: str | None = None,
    payment_status: str | None = None,
    email_status: str | None = None,
    workflow_status: str | None = None,
    date_from: str | None = None,
    date_to: str | None = None,
) -> list[dict[str, object | None]]:
    filtered = records

    if query and query.strip():
        needle = query.strip().lower()
        filtered = [
            item
            for item in filtered
            if needle in " ".join(
                [
                    str(item.get("booking_reference") or ""),
                    str(item.get("customer_name") or ""),
                    str(item.get("customer_email") or ""),
                    str(item.get("service_name") or ""),
                    str(item.get("industry") or ""),
                    str(item.get("notes") or ""),
                ]
            ).lower()
        ]

    def matches_status(value: object | None, expected: str | None) -> bool:
        return not expected or str(value or "") == expected

    filtered = [
        item
        for item in filtered
        if matches_status(item.get("industry"), industry)
        and matches_status(item.get("payment_status"), payment_status)
        and matches_status(item.get("email_status"), email_status)
        and matches_status(item.get("workflow_status"), workflow_status)
    ]

    if date_from:
        filtered = [
            item for item in filtered if str(item.get("requested_date") or "") >= date_from
        ]
    if date_to:
        filtered = [
            item for item in filtered if str(item.get("requested_date") or "") <= date_to
        ]

    return filtered


def build_timeline_event(event: ConversationEvent) -> dict[str, object | None]:
    return {
        "id": event.id,
        "source": event.source,
        "event_type": event.event_type,
        "created_at": event.created_at.astimezone(UTC).isoformat(),
        "ai_intent": event.ai_intent,
        "workflow_status": event.workflow_status,
        "message_text": event.message_text,
        "ai_reply": event.ai_reply,
        "sender_name": event.sender_name,
        "sender_email": event.sender_email,
        "metadata": event.metadata_json or {},
    }


def build_partner_item(partner: PartnerProfile) -> dict[str, object]:
    return {
        "id": partner.id,
        "name": partner.name,
        "category": partner.category,
        "website_url": partner.website_url,
        "description": partner.description,
        "logo_url": partner.logo_url,
        "image_url": partner.image_url,
        "featured": bool(partner.featured),
        "sort_order": partner.sort_order,
        "is_active": bool(partner.is_active),
    }


def build_service_merchant_item(service: ServiceMerchantProfile) -> dict[str, object | None]:
    return {
        "id": service.id,
        "service_id": service.service_id,
        "business_name": service.business_name,
        "business_email": service.business_email,
        "name": service.name,
        "category": service.category,
        "summary": service.summary,
        "amount_aud": service.amount_aud,
        "duration_minutes": service.duration_minutes,
        "venue_name": service.venue_name,
        "location": service.location,
        "map_url": service.map_url,
        "booking_url": service.booking_url,
        "image_url": service.image_url,
        "source_url": service.source_url,
        "tags": service.tags_json or [],
        "featured": bool(service.featured),
        "is_active": bool(service.is_active),
        "updated_at": service.updated_at.astimezone(UTC).isoformat(),
    }


def build_service_catalog_item(service: ServiceMerchantProfile) -> ServiceCatalogItem:
    resolved_image_url = resolve_service_image_url(
        service_id=service.service_id,
        category=service.category or "General Service",
        tags=list(service.tags_json or []),
        image_url=service.image_url,
    )
    return ServiceCatalogItem(
        id=service.service_id,
        name=service.name,
        category=service.category or "General Service",
        business_email=service.business_email,
        summary=service.summary or "Service imported from merchant website.",
        duration_minutes=service.duration_minutes or 30,
        amount_aud=service.amount_aud or 0.01,
        image_url=resolved_image_url,
        map_snapshot_url=None,
        venue_name=service.venue_name,
        location=service.location,
        map_url=service.map_url,
        booking_url=service.booking_url,
        latitude=None,
        longitude=None,
        tags=list(service.tags_json or []),
        featured=bool(service.featured),
    )


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
    return {"message": "Welcome to BookedAI API"}


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
    return await save_uploaded_file(request, file=file, allowed_kind="images")


@api.post("/uploads/files", status_code=status.HTTP_201_CREATED)
async def upload_file(
    request: Request,
    file: UploadFile = File(...),
) -> dict[str, str | int]:
    return await save_uploaded_file(request, file=file, allowed_kind="files")


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
                    text=payload.notes or "BookedAI demo request",
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
        return result
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except httpx.HTTPError as exc:
        raise HTTPException(
            status_code=502,
            detail="Unable to reach Zoho Calendar right now",
        ) from exc


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
    authorization: str | None = Header(default=None),
    x_admin_token: str | None = Header(default=None),
) -> AdminOverviewResponse:
    require_admin_access(request, authorization=authorization, x_admin_token=x_admin_token)

    async with get_session(request.app.state.session_factory) as session:
        booking_events = (
            await session.execute(
                select(ConversationEvent)
                .where(
                    ConversationEvent.event_type.in_(
                        ["booking_session_created", "booking_callback"]
                    )
                )
                .order_by(desc(ConversationEvent.created_at))
            )
        ).scalars().all()
        recent_events = (
            await session.execute(
                select(ConversationEvent)
                .order_by(desc(ConversationEvent.created_at))
                .limit(8)
            )
        ).scalars().all()
        total_callbacks = await session.scalar(
            select(func.count())
            .select_from(ConversationEvent)
            .where(ConversationEvent.event_type == "booking_callback")
        )

    all_bookings = merge_booking_records(booking_events)
    total_bookings = len(all_bookings)
    pending_email = sum(
        1
        for item in all_bookings
        if item.get("email_status") == "pending_manual_followup"
    )
    ready_for_checkout = sum(
        1
        for item in all_bookings
        if item.get("payment_status") == "stripe_checkout_ready"
    )

    metrics = [
        {"label": "Bookings captured", "value": str(total_bookings or 0), "tone": "info"},
        {"label": "Stripe-ready checkouts", "value": str(ready_for_checkout or 0), "tone": "success"},
        {"label": "Pending email follow-up", "value": str(pending_email or 0), "tone": "warning"},
        {"label": "n8n callbacks logged", "value": str(total_callbacks or 0), "tone": "neutral"},
    ]

    return AdminOverviewResponse(
        status="ok",
        metrics=metrics,
        recent_bookings=all_bookings[:8],
        recent_events=[build_timeline_event(item) for item in recent_events],
    )


@api.get("/admin/bookings", response_model=AdminBookingsResponse)
async def admin_bookings(
    request: Request,
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
        events = (
            await session.execute(
                select(ConversationEvent)
                .where(
                    ConversationEvent.event_type.in_(
                        ["booking_session_created", "booking_callback"]
                    )
                )
                .order_by(desc(ConversationEvent.created_at))
            )
        ).scalars().all()

    records = filter_booking_records(
        merge_booking_records(events),
        query=q,
        industry=industry,
        payment_status=payment_status,
        email_status=email_status,
        workflow_status=workflow_status,
        date_from=date_from,
        date_to=date_to,
    )
    total = len(records)
    items = records[offset : offset + limit]

    return AdminBookingsResponse(
        status="ok",
        total=total or 0,
        items=items,
    )


@api.get("/admin/bookings/{booking_reference}", response_model=AdminBookingDetailResponse)
async def admin_booking_detail(
    booking_reference: str,
    request: Request,
    authorization: str | None = Header(default=None),
    x_admin_token: str | None = Header(default=None),
) -> AdminBookingDetailResponse:
    require_admin_access(request, authorization=authorization, x_admin_token=x_admin_token)

    async with get_session(request.app.state.session_factory) as session:
        events = (
            await session.execute(
                select(ConversationEvent)
                .where(ConversationEvent.conversation_id == booking_reference)
                .order_by(desc(ConversationEvent.created_at))
            )
        ).scalars().all()

    if not events:
        raise HTTPException(status_code=404, detail="Booking was not found")

    primary = next(
        (item for item in events if item.event_type == "booking_session_created"),
        events[0],
    )
    return AdminBookingDetailResponse(
        status="ok",
        booking=build_booking_record(primary),
        events=[build_timeline_event(item) for item in events],
    )


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
        events = (
            await session.execute(
                select(ConversationEvent)
                .where(ConversationEvent.conversation_id == booking_reference)
                .order_by(desc(ConversationEvent.created_at))
            )
        ).scalars().all()

    if not events:
        raise HTTPException(status_code=404, detail="Booking was not found")

    booking = merge_booking_records(events)[0]
    recipient = str(booking.get("customer_email") or "").strip()
    if not recipient:
        raise HTTPException(status_code=400, detail="Booking does not include a customer email")

    lines = [
        f"Hello {booking.get('customer_name') or 'there'},",
        "",
        "This is your manual booking confirmation from BookedAI.",
        f"Booking reference: {booking_reference}",
        f"Service: {booking.get('service_name') or 'Not specified'}",
        f"Requested date: {booking.get('requested_date') or 'Not specified'}",
        f"Requested time: {booking.get('requested_time') or 'Not specified'}",
        f"Timezone: {booking.get('timezone') or 'Australia/Sydney'}",
    ]
    if booking.get("payment_url"):
        lines.extend(["", f"Checkout link: {booking.get('payment_url')}"])
    if payload.note:
        lines.extend(["", "Additional note:", payload.note.strip()])
    business_recipient = (
        str(booking.get("business_email") or "").strip().lower()
        or request.app.state.settings.booking_business_email
    )
    cc_recipients = [
        email
        for email in [business_recipient, request.app.state.settings.booking_business_email]
        if email and email.lower() != recipient.lower()
    ]
    lines.extend(["", f"Reply to {business_recipient} if you need help."])

    email_service: EmailService = request.app.state.email_service
    try:
        await email_service.send_email(
            to=[recipient],
            cc=cc_recipients,
            subject=f"BookedAI booking confirmation {booking_reference}",
            text="\n".join(lines),
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"SMTP send failed: {exc}") from exc

    return EmailSendResponse(status="sent", message="Confirmation email accepted by SMTP server")


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
