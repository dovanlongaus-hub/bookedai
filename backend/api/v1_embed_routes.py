"""Embed sub-app routes for the BookedAI plugin widget (Wave 5-E-3).

These endpoints are mirrors of selected ``/api/v1/public/*`` routes, intended
exclusively for the public ``<bookedai-search>`` Web Component embedded on
EXTERNAL tenant domains (e.g. ``aimentorpro.com``). They live under a separate
prefix (``/api/v1/embed/*``) so that a permissive CORS posture
(``Access-Control-Allow-Origin: *`` + ``allow_credentials=False``) can be
mounted WITHOUT loosening the credentialed allow-list that protects
``/api/v1/*`` (Wave 5-F-3 / P1-S3).

Security invariants enforced here:

* The embed prefix is read-only for tenant data (partner-config) plus two
  write paths that are already public on the credentialed surface
  (``/api/v1/matching/search`` and ``/api/v1/public/leads/{slug}``).
* No authenticated, tenant-session, admin, or portal endpoints are mounted.
* No PII-bearing endpoints are mounted (public stats deferred to Wave 9).
* All endpoints are rate-limited per client IP.
* Cookies and ``Authorization`` headers are intentionally ignored — the
  parent ``CORSMiddleware`` is configured with ``allow_credentials=False``.

The handlers themselves delegate to the existing v1 handlers. We expose the
embed prefix as a separate FastAPI sub-app (``embed_app``) which has its own
``CORSMiddleware`` instance; see :func:`build_embed_app`. The sub-app does NOT
have its own lifespan — it borrows the parent ``app.state`` at request time
via :class:`ParentStateMiddleware`.
"""

from __future__ import annotations

from fastapi import APIRouter, FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp, Receive, Scope, Send

from api import v1_public_tenant_config_handlers as partner_config_handlers
from api import v1_search_handlers as search_handlers
from api.route_handlers import enforce_rate_limit
from api.v1_public_routes import (
    PublicCreateLeadRequestPayload,
    create_public_lead,
)
from api.v1_routes import SearchCandidatesRequestPayload
from core.errors import AppError
from core.logging import get_logger


logger = get_logger("bookedai.embed")


# Per-IP rate limits for the embed surface. These are intentionally more
# generous than the credentialed equivalents because external embeds can fan
# out across many tenant domains, and the limit key is the client IP rather
# than the tenant id.
EMBED_SEARCH_RATE_LIMIT_SCOPE = "embed-search-candidates"
EMBED_SEARCH_RATE_LIMIT_PER_MINUTE = 60
EMBED_SEARCH_RATE_LIMIT_WINDOW_SECONDS = 60

EMBED_LEAD_RATE_LIMIT_SCOPE = "embed-lead-capture"
EMBED_LEAD_RATE_LIMIT_PER_MINUTE = 10
EMBED_LEAD_RATE_LIMIT_WINDOW_SECONDS = 60


# CORS surface for the embed sub-app. The widget always sends
# ``Content-Type: application/json``; ``X-BookedAI-Embed-Origin`` is reserved
# for ops attribution telemetry. We intentionally do NOT permit
# ``Authorization`` here — embed routes never accept session credentials.
EMBED_ALLOWED_METHODS: list[str] = ["GET", "POST", "OPTIONS"]
EMBED_ALLOWED_HEADERS: list[str] = ["Content-Type", "X-BookedAI-Embed-Origin"]
EMBED_PREFLIGHT_MAX_AGE_SECONDS = 600


router = APIRouter(tags=["v1-embed"])


class ParentStateMiddleware:
    """Pure-ASGI middleware that bridges the parent app's ``state`` onto the
    embed sub-app and restores the inbound headers that the parent's
    ``EmbedCorsHygieneMiddleware`` stripped (``origin`` and
    ``access-control-request-method``).

    Why pure ASGI instead of ``BaseHTTPMiddleware``: we need to mutate the
    incoming ASGI ``scope`` (specifically, restore the request headers list
    BEFORE the embed sub-app's own ``CORSMiddleware`` sees them). Starlette's
    ``BaseHTTPMiddleware`` does not expose a raw inbound scope rewrite hook.

    Responsibilities:

    * Re-attach the parent app's ``state`` to the embed sub-app so handlers
      see ``settings``, ``session_factory``, ``rate_limiter``,
      ``openai_service``, etc. without a duplicate lifespan.
    * Restore the original headers stashed by
      ``EmbedCorsHygieneMiddleware`` so the embed ``CORSMiddleware`` can do
      its preflight + origin-mirroring work.
    """

    def __init__(self, app: ASGIApp, *, parent_app: FastAPI) -> None:
        self.app = app
        self._parent_app = parent_app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope.get("type") == "http":
            # 1) Bridge state. ``scope["app"]`` is the embed sub-app.
            embed_app = scope.get("app")
            if embed_app is not None:
                embed_app.state = self._parent_app.state
            # 2) Restore headers that the parent's hygiene middleware stripped
            #    BEFORE the embed CORS layer evaluates them. The original list
            #    was stashed under a private scope key so we can put it back
            #    without re-deriving from the request body.
            original_headers = scope.get("__bookedai_embed_original_headers__")
            if original_headers is not None:
                scope = dict(scope)
                scope["headers"] = original_headers
        await self.app(scope, receive, send)


class EmbedOriginTelemetryMiddleware(BaseHTTPMiddleware):
    """Log the ``Origin`` (or ``Referer``) header of every embed request.

    Wave 5-E-3 enables ops to see which external domains have started
    embedding the widget. We deliberately do NOT enforce origin validation
    here — that is a Wave 9 abuse-prevention concern. The log emits a single
    structured event per request so it is straightforward to aggregate
    (``logger=bookedai.embed``, ``event=embed.request``).
    """

    async def dispatch(self, request, call_next):  # type: ignore[override]
        origin = request.headers.get("origin") or ""
        referer = request.headers.get("referer") or ""
        explicit = request.headers.get("x-bookedai-embed-origin") or ""
        # We do not block; we only observe.
        try:
            response = await call_next(request)
        finally:
            try:
                logger.info(
                    "embed.request",
                    extra={
                        "event_type": "embed.request",
                        "embed_origin": origin,
                        "embed_referer": referer,
                        "embed_origin_hint": explicit,
                        "embed_path": request.url.path,
                        "embed_method": request.method,
                    },
                )
            except Exception:
                # Never let telemetry break the embed surface.
                pass
        return response


# ---------------------------------------------------------------------------
# Embed handlers — thin wrappers around the existing v1 handlers
# ---------------------------------------------------------------------------


async def embed_get_partner_config(request: Request, slug: str):
    """Mirror of ``/api/v1/public/tenants/{slug}/partner-config``."""
    return await partner_config_handlers.get_tenant_partner_config(request, slug)


async def embed_search_candidates(
    request: Request,
    payload: SearchCandidatesRequestPayload,
):
    """Mirror of ``/api/v1/matching/search`` for the embed surface.

    Differences from the credentialed handler:

    * Per-IP rate limiting (60/min). The credentialed surface is per-tenant.
    * Rejects requests that lack a ``tenant_ref`` in ``channel_context``.
      This stops anonymous cross-tenant fishing attempts via the open CORS
      prefix; embedded widgets always know which tenant they belong to.
    """
    tenant_ref = (payload.channel_context.tenant_ref or "").strip()
    if not tenant_ref:
        raise HTTPException(
            status_code=422,
            detail="channel_context.tenant_ref is required for embed search.",
        )

    await enforce_rate_limit(
        request,
        scope=EMBED_SEARCH_RATE_LIMIT_SCOPE,
        limit=EMBED_SEARCH_RATE_LIMIT_PER_MINUTE,
        window_seconds=EMBED_SEARCH_RATE_LIMIT_WINDOW_SECONDS,
    )
    return await search_handlers.search_candidates(request, payload)


class EmbedCreateLeadRequestPayload(PublicCreateLeadRequestPayload):
    """Embed lead capture body: same as the public widget body but the tenant
    slug travels INSIDE the body (rather than the URL) so the embed surface
    can route without leaking a slug into log paths or tenant-scoped CDN
    caches.
    """

    tenant_slug: str


async def embed_create_lead(
    request: Request,
    payload: EmbedCreateLeadRequestPayload,
):
    """Mirror of ``/api/v1/public/leads/{tenant_slug}`` keyed off the body."""
    await enforce_rate_limit(
        request,
        scope=EMBED_LEAD_RATE_LIMIT_SCOPE,
        limit=EMBED_LEAD_RATE_LIMIT_PER_MINUTE,
        window_seconds=EMBED_LEAD_RATE_LIMIT_WINDOW_SECONDS,
    )
    public_payload = PublicCreateLeadRequestPayload(
        lead_type=payload.lead_type,
        contact=payload.contact,
        business_context=payload.business_context,
        attribution=payload.attribution,
        intent_notes=payload.intent_notes,
    )
    return await create_public_lead(
        request,
        tenant_slug=payload.tenant_slug,
        payload=public_payload,
    )


router.add_api_route(
    "/tenants/{slug}/partner-config",
    embed_get_partner_config,
    methods=["GET"],
)
router.add_api_route(
    "/search/candidates",
    embed_search_candidates,
    methods=["POST"],
)
router.add_api_route(
    "/leads",
    embed_create_lead,
    methods=["POST"],
)


def build_embed_app(parent_app: FastAPI) -> FastAPI:
    """Construct the ``/api/v1/embed`` sub-app with permissive CORS.

    The CORS posture is the security inversion of the parent app:

    * ``allow_origins=["*"]`` — any external tenant domain may embed.
    * ``allow_credentials=False`` — cookies and ``Authorization`` headers
      are stripped by the browser (CORS spec) AND ignored here. This is
      the invariant that makes opening up ``allow_origins`` safe.
    * ``allow_methods`` and ``allow_headers`` stay as a minimal explicit
      list. New embed headers must be added here AND in the widget.
    """
    embed_app = FastAPI(
        title="BookedAI Embed API",
        docs_url=None,
        redoc_url=None,
        openapi_url=None,
    )
    embed_app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=False,
        allow_methods=EMBED_ALLOWED_METHODS,
        allow_headers=EMBED_ALLOWED_HEADERS,
        max_age=EMBED_PREFLIGHT_MAX_AGE_SECONDS,
    )
    embed_app.add_middleware(EmbedOriginTelemetryMiddleware)
    embed_app.add_middleware(ParentStateMiddleware, parent_app=parent_app)
    embed_app.include_router(router)

    @embed_app.exception_handler(AppError)
    async def _app_error_handler(_request: Request, exc: AppError):  # pragma: no cover - defensive
        from fastapi.responses import JSONResponse

        from api.v1 import build_error_envelope

        return JSONResponse(
            status_code=exc.status_code,
            content=build_error_envelope(exc).model_dump(mode="json"),
        )

    return embed_app


__all__ = [
    "build_embed_app",
    "router",
    "EmbedCreateLeadRequestPayload",
    "EMBED_SEARCH_RATE_LIMIT_PER_MINUTE",
    "EMBED_SEARCH_RATE_LIMIT_WINDOW_SECONDS",
    "EMBED_LEAD_RATE_LIMIT_PER_MINUTE",
    "EMBED_LEAD_RATE_LIMIT_WINDOW_SECONDS",
    "EMBED_ALLOWED_METHODS",
    "EMBED_ALLOWED_HEADERS",
]
