"""Handlers for the `/api/v1/sandbox/*` magic-moment onboarding endpoints.

The flow:
  1. POST /api/v1/sandbox/sessions      → spin up a temporary, in-memory tenant
  2. POST /api/v1/sandbox/sessions/{id}/bookings → record an in-memory booking
  3. POST /api/v1/sandbox/sessions/{id}/save     → promote to a real DB tenant
  4. GET  /api/v1/sandbox/sessions/{id}          → read current sandbox state

No DB writes happen for steps 1, 2, 4. No Stripe / Telegram / WhatsApp side
effects either — the sandbox is intentionally inert until the visitor opts to
"Save my workspace" via email-code login (step 3).
"""

from __future__ import annotations

import json
import re
import secrets
from typing import Any

import httpx
from fastapi import HTTPException, Request
from pydantic import BaseModel, Field

from api.route_handlers import enforce_rate_limit
from api.v1_routes import (
    RepositoryContext,
    TenantRepository,
    _error_response,
    _success_response,
    _upsert_tenant_membership,
    _normalize_tenant_slug_candidate,
    _store_tenant_email_login_code,
    _load_valid_tenant_email_login_code,
    _deliver_tenant_email_login_code,
    _build_tenant_auth_response,
    _create_or_update_tenant_credential,
    get_session,
)
from core.errors import AppError
from core.logging import get_logger
from core.sandbox_store import (
    SandboxBooking,
    SandboxService,
    SandboxSession,
    sandbox_session_store,
)
from datetime import UTC, datetime

_logger = get_logger("bookedai.api.v1_sandbox_handlers")

SANDBOX_RATE_LIMIT_SCOPE = "sandbox-create"
SANDBOX_RATE_LIMIT_PER_WINDOW = 5
SANDBOX_RATE_LIMIT_WINDOW_SECONDS = 300

SANDBOX_BOOK_RATE_LIMIT_SCOPE = "sandbox-book"
SANDBOX_BOOK_RATE_LIMIT_PER_WINDOW = 30
SANDBOX_BOOK_RATE_LIMIT_WINDOW_SECONDS = 300

# ── Vertical templates ────────────────────────────────────────────────────
# Used when no OPENAI_API_KEY is configured, OR as the safety-net fallback if
# the LLM call fails / times out. Six verticals + a generic catch-all.

_VERTICAL_TEMPLATES: dict[str, dict[str, Any]] = {
    "yoga": {
        "business_name": "Lighthouse Yoga Studio",
        "services": [
            {
                "name": "Vinyasa Flow — 60 min",
                "summary": "All-levels morning class to start the day moving.",
                "duration_minutes": 60,
                "price_aud": 32.0,
                "capabilities": ["Drop-in", "Studio mats provided"],
                "thumbnail_gradient": "sage",
            },
            {
                "name": "Private 1-on-1 Yoga",
                "summary": "Tailored session with a senior teacher.",
                "duration_minutes": 60,
                "price_aud": 95.0,
                "capabilities": ["Beginner-friendly", "1-on-1"],
                "thumbnail_gradient": "ocean",
            },
            {
                "name": "Sound Bath + Restorative",
                "summary": "Wind-down session with crystal bowls.",
                "duration_minutes": 75,
                "price_aud": 45.0,
                "capabilities": ["Group", "Evening"],
                "thumbnail_gradient": "twilight",
            },
        ],
    },
    "salon": {
        "business_name": "Marble Lane Salon",
        "services": [
            {
                "name": "Cut + Style",
                "summary": "Senior stylist cut with a wash and finish.",
                "duration_minutes": 60,
                "price_aud": 110.0,
                "capabilities": ["Senior stylist", "Wash included"],
                "thumbnail_gradient": "rose",
            },
            {
                "name": "Balayage Highlights",
                "summary": "Hand-painted highlights with toner.",
                "duration_minutes": 180,
                "price_aud": 280.0,
                "capabilities": ["Long hair upcharge", "Toner included"],
                "thumbnail_gradient": "blush",
            },
            {
                "name": "Express Blow-Dry",
                "summary": "30-minute polished finish before your event.",
                "duration_minutes": 30,
                "price_aud": 55.0,
                "capabilities": ["Walk-in friendly"],
                "thumbnail_gradient": "honey",
            },
        ],
    },
    "clinic": {
        "business_name": "Bayside Health Clinic",
        "services": [
            {
                "name": "GP Consultation",
                "summary": "Standard consult with a registered GP.",
                "duration_minutes": 20,
                "price_aud": 95.0,
                "capabilities": ["Bulk-billing eligible"],
                "thumbnail_gradient": "ocean",
            },
            {
                "name": "Skin Check",
                "summary": "Full-body dermoscopy skin examination.",
                "duration_minutes": 30,
                "price_aud": 145.0,
                "capabilities": ["No referral required"],
                "thumbnail_gradient": "sage",
            },
            {
                "name": "Annual Health Review",
                "summary": "Long consult with screening and care plan.",
                "duration_minutes": 45,
                "price_aud": 195.0,
                "capabilities": ["Care plan included"],
                "thumbnail_gradient": "twilight",
            },
        ],
    },
    "tutoring": {
        "business_name": "Bridge Academic Tutoring",
        "services": [
            {
                "name": "Year 12 Maths — 1-on-1",
                "summary": "Exam-prep coaching with a specialist tutor.",
                "duration_minutes": 60,
                "price_aud": 80.0,
                "capabilities": ["1-on-1", "Online or in-person"],
                "thumbnail_gradient": "ocean",
            },
            {
                "name": "Primary English Booster",
                "summary": "Reading and writing fundamentals for ages 7-12.",
                "duration_minutes": 45,
                "price_aud": 55.0,
                "capabilities": ["Group of 3", "Weekly"],
                "thumbnail_gradient": "honey",
            },
            {
                "name": "Year 11 Chemistry Workshop",
                "summary": "Small-group lab and theory session.",
                "duration_minutes": 90,
                "price_aud": 65.0,
                "capabilities": ["Small group"],
                "thumbnail_gradient": "sage",
            },
        ],
    },
    "swim": {
        "business_name": "Future Swim Academy",
        "services": [
            {
                "name": "Learn-to-Swim — Beginner",
                "summary": "Foundational lesson for ages 4+.",
                "duration_minutes": 30,
                "price_aud": 35.0,
                "capabilities": ["Beginner", "Group of 4"],
                "thumbnail_gradient": "ocean",
            },
            {
                "name": "Stroke Correction — 1-on-1",
                "summary": "Private coaching to refine technique.",
                "duration_minutes": 45,
                "price_aud": 90.0,
                "capabilities": ["1-on-1", "Video review"],
                "thumbnail_gradient": "twilight",
            },
            {
                "name": "Squad Training",
                "summary": "Coached squad session for competitive swimmers.",
                "duration_minutes": 75,
                "price_aud": 45.0,
                "capabilities": ["Squad", "Coach-led"],
                "thumbnail_gradient": "sage",
            },
        ],
    },
    "chess": {
        "business_name": "Grandmaster Chess Club",
        "services": [
            {
                "name": "Beginner 1-on-1 Lesson",
                "summary": "Foundational chess for new players.",
                "duration_minutes": 60,
                "price_aud": 70.0,
                "capabilities": ["1-on-1", "Online"],
                "thumbnail_gradient": "twilight",
            },
            {
                "name": "Advanced Tactics Drill",
                "summary": "Tactics and pattern recognition for rated players.",
                "duration_minutes": 60,
                "price_aud": 95.0,
                "capabilities": ["Rated 1400+"],
                "thumbnail_gradient": "ocean",
            },
            {
                "name": "Tournament Prep Package",
                "summary": "Three-session prep before your next event.",
                "duration_minutes": 60,
                "price_aud": 260.0,
                "capabilities": ["Package of 3"],
                "thumbnail_gradient": "sage",
            },
        ],
    },
    "generic": {
        "business_name": "Your BookedAI Workspace",
        "services": [
            {
                "name": "Discovery Consultation",
                "summary": "Understand the customer goal in 30 minutes.",
                "duration_minutes": 30,
                "price_aud": 60.0,
                "capabilities": ["Online", "1-on-1"],
                "thumbnail_gradient": "ocean",
            },
            {
                "name": "Standard Service",
                "summary": "Your most-booked offer at a flat price.",
                "duration_minutes": 60,
                "price_aud": 120.0,
                "capabilities": ["Most popular"],
                "thumbnail_gradient": "honey",
            },
            {
                "name": "Premium Package",
                "summary": "Bundled experience for repeat customers.",
                "duration_minutes": 90,
                "price_aud": 220.0,
                "capabilities": ["Premium"],
                "thumbnail_gradient": "twilight",
            },
        ],
    },
}

# Lightweight keyword routing so a free-form `vertical_hint` (e.g. "yoga
# studio in Melbourne") still picks a sensible canned template.
_VERTICAL_KEYWORDS: list[tuple[str, tuple[str, ...]]] = [
    ("yoga", ("yoga", "pilates", "barre", "meditation", "wellness")),
    ("salon", ("salon", "hair", "barber", "beauty", "spa", "nails", "lash")),
    ("clinic", ("clinic", "doctor", "gp", "dental", "physio", "chiro", "health")),
    ("tutoring", ("tutor", "tutoring", "academic", "study", "exam", "school", "lesson")),
    ("swim", ("swim", "pool", "swimming", "aquatic")),
    ("chess", ("chess", "grandmaster")),
]


def _resolve_vertical(hint: str | None, business_name: str | None) -> str:
    haystack = " ".join(filter(None, [hint or "", business_name or ""])).lower()
    if not haystack.strip():
        return "generic"
    for vertical, keywords in _VERTICAL_KEYWORDS:
        for keyword in keywords:
            if keyword in haystack:
                return vertical
    return "generic"


def _slug_from_name(name: str) -> str:
    base = re.sub(r"[^a-z0-9]+", "-", (name or "").strip().lower()).strip("-")
    return base or "sandbox-workspace"


def _make_service_id(index: int) -> str:
    return f"svc_{secrets.token_hex(4)}_{index}"


def _build_canned_session(
    *,
    vertical_hint: str | None,
    business_name: str | None,
) -> tuple[str, str, list[SandboxService]]:
    vertical = _resolve_vertical(vertical_hint, business_name)
    template = _VERTICAL_TEMPLATES.get(vertical, _VERTICAL_TEMPLATES["generic"])
    resolved_business_name = (business_name or "").strip() or template["business_name"]
    services = [
        SandboxService(
            service_id=_make_service_id(index),
            name=str(item["name"]),
            summary=str(item["summary"]),
            duration_minutes=int(item["duration_minutes"]),
            price_aud=float(item["price_aud"]),
            capabilities=list(item.get("capabilities") or []),
            thumbnail_gradient=str(item.get("thumbnail_gradient") or "ocean"),
        )
        for index, item in enumerate(template["services"], start=1)
    ]
    return resolved_business_name, vertical, services


_LLM_SCHEMA: dict[str, Any] = {
    "type": "object",
    "additionalProperties": False,
    "properties": {
        "business_name": {"type": "string"},
        "vertical": {"type": "string"},
        "services": {
            "type": "array",
            "minItems": 3,
            "maxItems": 3,
            "items": {
                "type": "object",
                "additionalProperties": False,
                "properties": {
                    "name": {"type": "string"},
                    "summary": {"type": "string"},
                    "duration_minutes": {"type": "integer", "minimum": 10, "maximum": 360},
                    "price_aud": {"type": "number", "minimum": 0, "maximum": 10000},
                    "capabilities": {
                        "type": "array",
                        "maxItems": 4,
                        "items": {"type": "string"},
                    },
                },
                "required": [
                    "name",
                    "summary",
                    "duration_minutes",
                    "price_aud",
                    "capabilities",
                ],
            },
        },
    },
    "required": ["business_name", "vertical", "services"],
}


async def _try_llm_generate(
    *,
    api_key: str,
    base_url: str,
    model: str,
    vertical_hint: str,
    business_name: str | None,
) -> tuple[str, str, list[SandboxService]] | None:
    """Best-effort LLM generation. Returns None on any failure so caller
    falls back to the canned template silently."""

    if not api_key.strip():
        return None
    try:
        prompt = (
            "You are seeding a realistic but fake BookedAI sandbox tenant. "
            "Given a one-line business description, return a friendly business "
            "name and exactly 3 realistic services with summary, duration, "
            "price (AUD), and 1-3 short capability tags. Keep prices realistic "
            "for the Australian market. Do not include any PII, addresses, or "
            "real-looking phone numbers."
        )
        request_payload = {
            "model": model.strip() or "gpt-4o-mini",
            "input": [
                {"role": "system", "content": [{"type": "input_text", "text": prompt}]},
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "input_text",
                            "text": json.dumps(
                                {
                                    "vertical_hint": vertical_hint or "",
                                    "business_name": business_name or "",
                                }
                            ),
                        }
                    ],
                },
            ],
            "text": {
                "format": {
                    "type": "json_schema",
                    "name": "sandbox_seed",
                    "schema": _LLM_SCHEMA,
                    "strict": True,
                }
            },
        }
        endpoint = f"{base_url.rstrip('/')}/responses"
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        }
        async with httpx.AsyncClient(timeout=8.0) as client:
            response = await client.post(endpoint, json=request_payload, headers=headers)
        if response.status_code >= 400:
            return None
        body = response.json()
        # Extract text from `output[].content[].text`
        text_blob = ""
        for output_item in body.get("output", []):
            for chunk in output_item.get("content", []):
                if chunk.get("type") in {"output_text", "text"}:
                    text_blob += chunk.get("text", "")
        if not text_blob.strip():
            return None
        parsed = json.loads(text_blob)
        services = []
        for index, item in enumerate(parsed.get("services", []), start=1):
            services.append(
                SandboxService(
                    service_id=_make_service_id(index),
                    name=str(item.get("name") or "").strip()
                    or f"Service {index}",
                    summary=str(item.get("summary") or "").strip()
                    or "BookedAI sandbox service",
                    duration_minutes=int(item.get("duration_minutes") or 60),
                    price_aud=float(item.get("price_aud") or 0.0),
                    capabilities=[
                        str(tag).strip()
                        for tag in (item.get("capabilities") or [])
                        if str(tag).strip()
                    ][:4],
                    thumbnail_gradient=("ocean", "sage", "twilight", "rose")[index % 4],
                )
            )
        if len(services) != 3:
            return None
        resolved_business_name = (
            str(parsed.get("business_name") or "").strip()
            or business_name
            or "Your BookedAI Workspace"
        )
        resolved_vertical = (
            str(parsed.get("vertical") or "").strip().lower()
            or _resolve_vertical(vertical_hint, business_name)
        )
        return resolved_business_name, resolved_vertical, services
    except Exception as exc:  # noqa: BLE001 — safety-net fallback to canned templates
        _logger.info("sandbox.llm_generate_failed", extra={"error": str(exc)})
        return None


# ── Pydantic payloads ─────────────────────────────────────────────────────


class SandboxCreateSessionPayload(BaseModel):
    vertical_hint: str | None = Field(default=None, max_length=240)
    business_name: str | None = Field(default=None, max_length=120)


class SandboxCustomerPayload(BaseModel):
    name: str = Field(..., min_length=1, max_length=120)
    email: str | None = Field(default=None, max_length=240)
    phone: str | None = Field(default=None, max_length=64)
    preferred_time: str | None = Field(default=None, max_length=120)


class SandboxAddBookingPayload(BaseModel):
    service_id: str = Field(..., min_length=1, max_length=80)
    customer: SandboxCustomerPayload


class SandboxSaveSessionPayload(BaseModel):
    email: str = Field(..., min_length=3, max_length=240)
    code: str = Field(..., min_length=4, max_length=12)
    full_name: str | None = Field(default=None, max_length=120)
    business_name: str | None = Field(default=None, max_length=120)
    tenant_slug: str | None = Field(default=None, max_length=80)


# ── Handlers ──────────────────────────────────────────────────────────────


async def sandbox_create_session(
    request: Request,
    payload: SandboxCreateSessionPayload,
):
    await enforce_rate_limit(
        request,
        scope=SANDBOX_RATE_LIMIT_SCOPE,
        limit=SANDBOX_RATE_LIMIT_PER_WINDOW,
        window_seconds=SANDBOX_RATE_LIMIT_WINDOW_SECONDS,
    )

    vertical_hint = (payload.vertical_hint or "").strip()
    business_name_input = (payload.business_name or "").strip() or None

    settings = getattr(request.app.state, "settings", None)
    api_key = ""
    base_url = "https://api.openai.com/v1"
    model = "gpt-4o-mini"
    if settings is not None:
        api_key = str(getattr(settings, "openai_api_key", "") or "").strip()
        base_url = (
            str(getattr(settings, "openai_base_url", "") or "").strip()
            or "https://api.openai.com/v1"
        )
        model = (
            str(getattr(settings, "openai_model", "") or "").strip() or "gpt-4o-mini"
        )

    llm_result = None
    if api_key and "api.openai.com" in base_url:
        llm_result = await _try_llm_generate(
            api_key=api_key,
            base_url=base_url,
            model=model,
            vertical_hint=vertical_hint,
            business_name=business_name_input,
        )

    if llm_result is None:
        business_name, vertical, services = _build_canned_session(
            vertical_hint=vertical_hint,
            business_name=business_name_input,
        )
        seed_mode = "canned"
    else:
        business_name, vertical, services = llm_result
        seed_mode = "llm"

    session = sandbox_session_store.create_session(
        business_name=business_name,
        vertical=vertical,
        services=services,
    )
    return _success_response(
        {
            **session.to_dict(),
            "seed_mode": seed_mode,
        }
    )


async def sandbox_get_session(request: Request, session_id: str):
    session = sandbox_session_store.get_session(session_id)
    if session is None:
        return _error_response(
            AppError(
                code="sandbox_session_expired",
                message="That sandbox session has expired or never existed. Spin up a new one.",
                status_code=410,
                details={"session_id": session_id},
            ),
            tenant_id=None,
        )
    return _success_response(session.to_dict())


async def sandbox_add_booking(
    request: Request,
    session_id: str,
    payload: SandboxAddBookingPayload,
):
    await enforce_rate_limit(
        request,
        scope=SANDBOX_BOOK_RATE_LIMIT_SCOPE,
        limit=SANDBOX_BOOK_RATE_LIMIT_PER_WINDOW,
        window_seconds=SANDBOX_BOOK_RATE_LIMIT_WINDOW_SECONDS,
    )

    session = sandbox_session_store.get_session(session_id)
    if session is None:
        return _error_response(
            AppError(
                code="sandbox_session_expired",
                message="That sandbox session has expired or never existed. Spin up a new one.",
                status_code=410,
                details={"session_id": session_id},
            ),
            tenant_id=None,
        )

    service = next(
        (svc for svc in session.services if svc.service_id == payload.service_id),
        None,
    )
    if service is None:
        return _error_response(
            AppError(
                code="sandbox_service_unknown",
                message="That service is not in the sandbox catalog.",
                status_code=400,
                details={"service_id": payload.service_id},
            ),
            tenant_id=None,
        )

    booking_reference = f"SANDBOX-{secrets.token_hex(4).upper()}"
    booking = SandboxBooking(
        booking_reference=booking_reference,
        service_id=service.service_id,
        service_name=service.name,
        customer_name=(payload.customer.name or "").strip() or "Sandbox Customer",
        customer_email=(payload.customer.email or "").strip() or None,
        customer_phone=(payload.customer.phone or "").strip() or None,
        preferred_time=(payload.customer.preferred_time or "").strip() or None,
        revenue_captured_aud=service.price_aud,
        captured_at=datetime.now(UTC),
    )
    sandbox_session_store.add_booking(session_id, booking)
    return _success_response(booking.to_dict())


async def sandbox_save_session(
    request: Request,
    session_id: str,
    payload: SandboxSaveSessionPayload,
):
    """Promote a sandbox session to a real DB tenant via email-code login.

    Flow:
      * Verify the email-code login (auth_intent="create") that the visitor
        kicked off via `POST /api/v1/tenant/auth/email-code/request` with
        intent=create.
      * Insert a tenants row + tenant_user_memberships + credential.
      * Mirror the sandbox catalog into the real `service_merchant_profiles`
        table is OUT OF SCOPE for this MVP — the visitor lands on the real
        tenant workspace and can use the existing catalog tools to publish.
    """

    session = sandbox_session_store.get_session(session_id)
    if session is None:
        return _error_response(
            AppError(
                code="sandbox_session_expired",
                message="That sandbox session has expired before it could be saved.",
                status_code=410,
                details={"session_id": session_id},
            ),
            tenant_id=None,
        )

    cfg = request.app.state.settings
    normalized_email = payload.email.strip().lower()
    normalized_code = "".join(ch for ch in str(payload.code or "") if ch.isdigit())
    if not normalized_email or len(normalized_code) < 4:
        return _error_response(
            AppError(
                code="sandbox_save_invalid",
                message="Email and verification code are required to save the sandbox.",
                status_code=400,
            ),
            tenant_id=None,
        )

    business_name = (payload.business_name or session.business_name).strip()
    slug_seed = (payload.tenant_slug or "").strip() or business_name
    normalized_slug = _normalize_tenant_slug_candidate(slug_seed) or _slug_from_name(
        business_name
    )

    async with get_session(request.app.state.session_factory) as db_session:
        # Validate the email-code login against the existing tenant credentials
        # store so the visitor proves email ownership before we create a tenant.
        login_code = await _load_valid_tenant_email_login_code(
            db_session,
            email=normalized_email,
            auth_intent="create",
            code=normalized_code,
            tenant_id=None,
        )
        if not login_code:
            return _error_response(
                AppError(
                    code="sandbox_save_code_invalid",
                    message="That code is invalid or expired. Request a new one.",
                    status_code=401,
                ),
                tenant_id=None,
            )
        login_code.consumed_at = datetime.now(UTC)

        tenant_repository = TenantRepository(RepositoryContext(session=db_session))
        existing = await tenant_repository.get_tenant_profile(normalized_slug)
        if existing:
            # Append a short suffix so we never collide with an existing tenant.
            normalized_slug = f"{normalized_slug}-{secrets.token_hex(2)}"

        tenant_profile = await tenant_repository.create_tenant(
            slug=normalized_slug,
            name=business_name,
            timezone="Australia/Sydney",
            locale="en-AU",
            industry=session.vertical or None,
        )
        membership = await _upsert_tenant_membership(
            db_session,
            tenant_profile=tenant_profile,
            email=normalized_email,
            full_name=payload.full_name or business_name,
            google_sub=None,
            auth_provider="sandbox",
        )
        # Use the verification code itself as the temporary password — the
        # visitor can rotate this from the tenant dashboard later. This mirrors
        # the existing email-code-create flow in `tenant_email_code_verify`.
        await _create_or_update_tenant_credential(
            db_session,
            tenant_profile=tenant_profile,
            email=normalized_email,
            username=normalized_email,
            password=normalized_code,
        )
        await db_session.commit()

    sandbox_session_store.mark_saved(session_id, tenant_slug=normalized_slug)

    response, actor_context = await _build_tenant_auth_response(
        cfg,
        tenant_id=str(tenant_profile.get("id") or ""),
        tenant_profile=tenant_profile,
        email=normalized_email,
        name=payload.full_name or business_name,
        picture_url=None,
        provider="sandbox",
        role=str(membership.get("role") or "tenant_admin"),
        membership=membership,
    )
    payload_data = {
        **response,
        "sandbox_session_id": session_id,
        "tenant_slug": normalized_slug,
    }
    return _success_response(
        payload_data,
        tenant_id=str(tenant_profile.get("id") or ""),
        actor_context=actor_context,
    )


async def sandbox_request_save_code(
    request: Request,
    session_id: str,
    payload: SandboxSaveSessionPayload,
):
    """Convenience wrapper: send a `create`-intent email code for the sandbox.

    The frontend calls this when the visitor types their email and clicks
    "Send my code". We reuse the existing tenant email-code-request store so
    no new email infra is needed.
    """

    session = sandbox_session_store.get_session(session_id)
    if session is None:
        return _error_response(
            AppError(
                code="sandbox_session_expired",
                message="Session expired before requesting a save code.",
                status_code=410,
                details={"session_id": session_id},
            ),
            tenant_id=None,
        )

    normalized_email = payload.email.strip().lower()
    if not normalized_email:
        return _error_response(
            AppError(
                code="sandbox_save_invalid",
                message="Enter the email you want to save the sandbox under.",
                status_code=400,
            ),
            tenant_id=None,
        )

    business_name = (payload.business_name or session.business_name).strip()
    metadata: dict[str, str | None] = {
        "business_name": business_name,
        "full_name": (payload.full_name or "").strip() or None,
        "industry": session.vertical or None,
        "tenant_slug": (payload.tenant_slug or "").strip() or None,
        "sandbox_session_id": session_id,
    }
    async with get_session(request.app.state.session_factory) as db_session:
        _row, code = await _store_tenant_email_login_code(
            db_session,
            email=normalized_email,
            auth_intent="create",
            tenant_id=None,
            tenant_slug=None,
            metadata=metadata,
        )
        delivery = await _deliver_tenant_email_login_code(
            request,
            email=normalized_email,
            code=code,
            auth_intent="create",
            tenant_name=business_name,
            tenant_slug=None,
        )
        await db_session.commit()

    return _success_response(
        {
            "email": normalized_email,
            "auth_intent": "create",
            "delivery": delivery,
        }
    )


__all__ = [
    "SandboxAddBookingPayload",
    "SandboxCreateSessionPayload",
    "SandboxSaveSessionPayload",
    "sandbox_add_booking",
    "sandbox_create_session",
    "sandbox_get_session",
    "sandbox_request_save_code",
    "sandbox_save_session",
]
