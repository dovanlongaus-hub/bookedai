import json as _json
import re as _re
import time
from typing import Any
from urllib.parse import urlparse

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.trustedhost import TrustedHostMiddleware
from starlette.types import ASGIApp, Message, Receive, Scope, Send

from api.admin_routes import router as admin_router
from api.communication_routes import router as communication_router
from api.internal_worker_routes import router as internal_worker_router
from api.public_catalog_routes import router as public_catalog_router
from api.route_handlers import lifespan, settings
from api.upload_routes import router as upload_router
from api.v1_embed_routes import build_embed_app
from api.v1_router import router as v1_router
from api.webhook_routes import router as webhook_router
from core.logging import configure_logging, get_logger
from core.observability import CorrelationIdMiddleware, register_exception_handlers
from db import get_session
from repositories.base import RepositoryContext
from repositories.tenant_repository import TenantRepository
from services import parse_cors_origins


# Explicit CORS allow-list — kept narrow on purpose. Wildcards (`*`) are
# deliberately avoided because `allow_credentials=True` is required for the
# tenant/admin session auth flow, and CORS spec forbids combining the two.
ALLOWED_CORS_METHODS: list[str] = [
    "GET",
    "HEAD",
    "POST",
    "PUT",
    "PATCH",
    "DELETE",
    "OPTIONS",
]

# Headers the frontend (and ops tooling) actually sends to the API.
# Add new ones here ONLY when a client genuinely needs them — keeping this
# list short shrinks the cross-origin attack surface.
ALLOWED_CORS_HEADERS: list[str] = [
    "Authorization",
    "Content-Type",
    "X-Requested-With",
    "X-Portal-Token",
    "X-Tenant-Session",
    "X-Admin-Session",
    "X-Bookedai-Trace",
    "X-Request-Id",
    "Idempotency-Key",
]

# Headers the frontend reads from API responses. Browsers will not expose
# anything else cross-origin even if the server sets it.
EXPOSED_CORS_HEADERS: list[str] = [
    "X-Bookedai-Trace",
    "X-Request-Id",
    "Retry-After",
    "X-RateLimit-Remaining",
    "X-RateLimit-Limit",
    "X-RateLimit-Reset",
    # Admin observability headers consumed by /features/admin/api.ts
    "X-BookedAI-Admin-Bookings-View",
    "X-BookedAI-Admin-Bookings-Shadow",
    "X-BookedAI-Admin-Bookings-Shadow-Matched",
    "X-BookedAI-Admin-Bookings-Shadow-Mismatch",
    "X-BookedAI-Admin-Bookings-Shadow-Missing",
    "X-BookedAI-Admin-Bookings-Shadow-Payment-Status-Mismatch",
    "X-BookedAI-Admin-Bookings-Shadow-Amount-Mismatch",
    "X-BookedAI-Admin-Bookings-Shadow-Meeting-Status-Mismatch",
    "X-BookedAI-Admin-Bookings-Shadow-Workflow-Status-Mismatch",
    "X-BookedAI-Admin-Bookings-Shadow-Email-Status-Mismatch",
    "X-BookedAI-Admin-Bookings-Shadow-Field-Parity-Mismatch",
    "X-BookedAI-Admin-Bookings-Shadow-Top-Drift-References",
    "X-BookedAI-Admin-Bookings-Shadow-Recent-Drift-Examples",
]

CORS_PREFLIGHT_MAX_AGE_SECONDS: int = 600

# Wave 5-E-3 — the embed sub-app at ``/api/v1/embed/*`` ships its OWN
# CORSMiddleware (allow_origins=["*"], allow_credentials=False). The parent
# ``CORSMiddleware`` would otherwise inject ``Access-Control-Allow-Credentials:
# true`` (its ``simple_headers``) onto every cross-origin embed response,
# violating the security invariant that wildcarded origins MUST NOT carry
# credentials. ``EmbedCorsHygieneMiddleware`` runs OUTSIDE the parent CORS
# layer and strips that polluted header on the way back out, plus blocks the
# parent from rejecting embed preflight requests originating from external
# tenant domains.
EMBED_PATH_PREFIX = "/api/v1/embed"


class EmbedCorsHygieneMiddleware:
    """Quarantine ``/api/v1/embed/*`` from the parent CORSMiddleware.

    Two responsibilities:

    1. On the way IN, strip the ``origin`` header for embed preflight
       requests so the parent CORS layer (with its strict allow-list) does
       NOT 400 the preflight from external tenant domains. The embed
       sub-app's own CORS layer handles preflight.
    2. On the way OUT, remove ``Access-Control-Allow-Credentials`` from
       embed responses — the parent CORS layer would otherwise inject it
       unconditionally (Starlette behaviour), which combined with
       ``Access-Control-Allow-Origin: *`` from the sub-app would be a CORS
       spec violation and silently break the widget in browsers.
    """

    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope.get("type") != "http":
            await self.app(scope, receive, send)
            return
        path = scope.get("path") or ""
        if not path.startswith(EMBED_PATH_PREFIX):
            await self.app(scope, receive, send)
            return

        # 1) Hide Origin from parent CORS so it does not preflight-reject
        #    arbitrary external tenant domains. The embed sub-app's own
        #    CORSMiddleware will see the original headers from the scope it
        #    receives — but we mutate the parent-visible headers list here.
        original_headers = list(scope.get("headers") or [])
        scrubbed_headers = [
            (name, value)
            for name, value in original_headers
            if name not in (b"origin", b"access-control-request-method")
        ]
        # Re-inject the original headers under a private key so the embed
        # sub-app's middleware can restore them. We use ASGI scope mutation
        # because Starlette doesn't expose an inbound-header rewrite hook.
        embed_scope = dict(scope)
        embed_scope["headers"] = scrubbed_headers
        embed_scope["__bookedai_embed_original_headers__"] = original_headers

        async def scrubbed_send(message: Message) -> None:
            if message.get("type") == "http.response.start":
                headers = message.get("headers") or []
                cleaned = [
                    (name, value)
                    for name, value in headers
                    if name.lower() != b"access-control-allow-credentials"
                ]
                message = {**message, "headers": cleaned}
            await send(message)

        await self.app(embed_scope, receive, scrubbed_send)


logger = get_logger("bookedai.cors")
embed_origin_logger = get_logger("bookedai.embed.origin_allowlist")


# ---------------------------------------------------------------------------
# Per-tenant embed origin allow-list (Wave 8-A follow-up)
# ---------------------------------------------------------------------------
#
# Wave 8-A shipped the embed sub-app with ``Access-Control-Allow-Origin: *`` —
# any origin could embed any tenant. For production rollout, ops needs the
# ability to restrict each tenant's widget to specific external origins (e.g.
# only ``https://aimentorpro.com`` is permitted to embed for tenant
# ``ai-mentor-doer``). The allow-list lives in
# ``tenants.partner_config_jsonb.embed_origins``; an empty / missing list
# means "open by default" (the Wave 8-A behaviour, preserved for backward
# compat).
#
# Enforcement happens in :class:`EmbedOriginAllowlistMiddleware`, mounted on
# the embed sub-app. The middleware reads the inbound ``Origin`` header (or
# the explicit ``X-BookedAI-Embed-Origin`` self-attribution fallback), maps
# the request to a tenant slug (URL for ``GET /tenants/{slug}/partner-config``,
# body for the two POST routes via :func:`_peek_request_body`), and rejects
# with a structured 403 envelope when the origin is not on the tenant's
# allow-list.
#
# Body-peek (Wave 10-A): the embed POST routes (``/search/candidates`` and
# ``/leads``) carry the tenant slug INSIDE the request body. The middleware
# reads the body via the ASGI ``receive`` callable, parses it once, then
# replays the buffered chunks to the downstream handler so the request
# reaches the FastAPI handler unchanged. A 256KB cap bounds the buffer
# size; oversize bodies fail open to the handler (which has its own
# validation). Malformed JSON or a missing slug field also fails open —
# the handler emits its standard 422 envelope, which is more useful than
# a generic middleware rejection.

# Module-level cache of per-tenant embed-origin allow-lists. Process-local on
# purpose: single-region deployment + 60s TTL means worst-case staleness when
# ops flips an allow-list is one minute. A multi-region rollout would back
# this with Redis and pub/sub invalidation; defer to that wave.
_EMBED_ORIGIN_CACHE_TTL_SECONDS: float = 60.0
_embed_origin_cache: dict[str, tuple[float, list[str]]] = {}

# Cheap counter so tests can prove the cache short-circuits the DB call.
# Production code never reads it.
_embed_origin_cache_lookup_counter: dict[str, int] = {}

_EMBED_PARTNER_CONFIG_PATH_PATTERN = _re.compile(
    r"^(?:/api/v1/embed)?/tenants/(?P<slug>[a-z0-9][a-z0-9\-]{0,127})/partner-config/?$",
    flags=_re.IGNORECASE,
)

_EMBED_SEARCH_CANDIDATES_PATH_PATTERN = _re.compile(
    r"^(?:/api/v1/embed)?/search/candidates/?$",
    flags=_re.IGNORECASE,
)

_EMBED_LEADS_PATH_PATTERN = _re.compile(
    r"^(?:/api/v1/embed)?/leads/?$",
    flags=_re.IGNORECASE,
)

# 256KB peek cap. Search and lead-capture bodies in production are well under
# this — the search shape is `{query, channel_context}` (a few hundred bytes),
# the lead body is contact + attribution metadata (a few KB at most). The cap
# exists so a malicious actor cannot force the middleware to buffer
# arbitrarily large bodies in memory while it scans for a tenant slug.
# Anything larger fails open to the handler, which has its own request size
# limits and Pydantic validation.
_EMBED_BODY_PEEK_MAX_BYTES: int = 256_000


def _embed_origin_cache_clear() -> None:
    """Test-only helper. Production code should never need this."""
    _embed_origin_cache.clear()
    _embed_origin_cache_lookup_counter.clear()


def _normalize_origin_for_match(raw: str | None) -> str | None:
    """Canonicalize an inbound ``Origin`` header for exact-match comparison."""
    if not raw:
        return None
    candidate = raw.strip()
    if not candidate or candidate.lower() == "null":
        return None
    try:
        parsed = urlparse(candidate)
    except ValueError:
        return None
    scheme = (parsed.scheme or "").lower()
    if scheme not in {"http", "https"}:
        return None
    host = (parsed.hostname or "").lower()
    if not host:
        return None
    netloc = host if parsed.port is None else f"{host}:{parsed.port}"
    return f"{scheme}://{netloc}"


def _embed_origin_cache_increment(slug: str) -> None:
    _embed_origin_cache_lookup_counter[slug] = (
        _embed_origin_cache_lookup_counter.get(slug, 0) + 1
    )


async def _load_tenant_embed_origins_from_db(
    session_factory: Any, slug: str
) -> list[str]:
    """Read the persisted allow-list for a tenant slug from the database.

    Returns ``[]`` when the tenant has no stored config or the list is
    empty / missing — the caller treats that as "open by default".
    """
    if session_factory is None:
        return []
    try:
        async with get_session(session_factory) as session:
            repo = TenantRepository(RepositoryContext(session=session))
            stored = await repo.get_partner_config(slug)
    except Exception:  # pragma: no cover - defensive
        embed_origin_logger.warning(
            "embed.origin_allowlist.lookup_failed",
            extra={"slug": slug},
            exc_info=True,
        )
        return []
    if not isinstance(stored, dict):
        return []
    raw_list = stored.get("embed_origins")
    if not isinstance(raw_list, list):
        return []
    cleaned: list[str] = []
    for entry in raw_list:
        if not isinstance(entry, str):
            continue
        normalized = _normalize_origin_for_match(entry)
        if normalized:
            cleaned.append(normalized)
    return cleaned


async def get_tenant_embed_origins(
    session_factory: Any, slug: str
) -> list[str]:
    """Return the cached embed-origin allow-list for a tenant slug.

    * 60s TTL (process-local).
    * Missing / empty allow-list returns ``[]`` (open by default).
    * Database failures fail OPEN (return ``[]``) rather than 500ing the
      embed surface — degraded availability is preferable to a hard outage.
    """
    normalized_slug = (slug or "").strip().lower()
    if not normalized_slug:
        return []
    now = time.monotonic()
    cached = _embed_origin_cache.get(normalized_slug)
    if cached is not None:
        expires_at, origins = cached
        if expires_at > now:
            return origins
    origins = await _load_tenant_embed_origins_from_db(
        session_factory, normalized_slug
    )
    _embed_origin_cache[normalized_slug] = (
        now + _EMBED_ORIGIN_CACHE_TTL_SECONDS,
        origins,
    )
    _embed_origin_cache_increment(normalized_slug)
    return origins


async def _peek_request_body(
    receive: Receive,
    *,
    max_size: int = _EMBED_BODY_PEEK_MAX_BYTES,
) -> tuple[bytes, Receive]:
    """Read the full request body and return ``(body_bytes, replay_receive)``.

    The returned ``replay_receive`` callable plays the buffered ASGI messages
    back to the downstream app in order, so the handler reads the body as if
    no peek had happened. After the buffer is drained, ``replay_receive``
    delegates to the original ``receive`` so any disconnect / additional
    chunks still propagate cleanly.

    A ``max_size`` cap (default 256KB) bounds how much memory the middleware
    will buffer. If the body exceeds the cap we stop reading early — the
    chunks captured up to that point are replayed first, and subsequent
    chunks fall through to the original ``receive``.
    """
    chunks: list[Message] = []
    total = 0
    capped = False
    while True:
        message = await receive()
        msg_type = message.get("type")
        if msg_type != "http.request":
            # Disconnect / other message — preserve and stop scanning. The
            # downstream app will see it via the replayed buffer.
            chunks.append(message)
            break
        chunks.append(message)
        body = message.get("body", b"") or b""
        total += len(body)
        if total > max_size:
            capped = True
            break
        if not message.get("more_body", False):
            break
    body_bytes = b"".join(
        m.get("body", b"") or b""
        for m in chunks
        if m.get("type") == "http.request"
    )
    if capped:
        # Don't bother carrying around a truncated body — the caller treats
        # this as "could not extract" and passes through.
        body_bytes = b""

    buffered: list[Message] = list(chunks)

    async def replay() -> Message:
        if buffered:
            return buffered.pop(0)
        return await receive()

    return body_bytes, replay


def _safe_lower_str(value: Any) -> str | None:
    if not isinstance(value, str):
        return None
    candidate = value.strip()
    if not candidate:
        return None
    return candidate.lower()


def _extract_search_tenant_ref(body: bytes) -> str | None:
    """Pull ``channel_context.tenant_ref`` from a buffered POST body.

    Returns ``None`` on any decode/parse failure, missing field, or wrong
    type. The caller treats ``None`` as "skip enforcement" and lets the
    handler emit its own 422 — we do not want to short-circuit on malformed
    input because the standard validation pipeline produces a much better
    error envelope than the middleware ever could.
    """
    if not body:
        return None
    try:
        decoded = _json.loads(body.decode("utf-8"))
    except (UnicodeDecodeError, ValueError):
        return None
    if not isinstance(decoded, dict):
        return None
    channel_context = decoded.get("channel_context")
    if not isinstance(channel_context, dict):
        return None
    return _safe_lower_str(channel_context.get("tenant_ref"))


def _extract_lead_tenant_slug(body: bytes) -> str | None:
    """Pull ``tenant_slug`` from a buffered POST body.

    Same fail-open semantics as :func:`_extract_search_tenant_ref`.
    """
    if not body:
        return None
    try:
        decoded = _json.loads(body.decode("utf-8"))
    except (UnicodeDecodeError, ValueError):
        return None
    if not isinstance(decoded, dict):
        return None
    return _safe_lower_str(decoded.get("tenant_slug"))


def _extract_partner_config_slug(path: str) -> str | None:
    """Return the slug from ``/tenants/{slug}/partner-config`` or ``None``.

    The embed sub-app receives requests with the ``/api/v1/embed`` prefix
    already stripped, so we match against the sub-app-relative path.
    """
    if not path:
        return None
    match = _EMBED_PARTNER_CONFIG_PATH_PATTERN.match(path)
    if match is None:
        return None
    return match.group("slug").lower()


def _embed_origin_forbidden_response_payload() -> bytes:
    payload = {
        "status": "error",
        "error": {
            "code": "embed_origin_not_allowed",
            "message": (
                "This widget is not permitted to embed BookedAI from this origin."
            ),
        },
        "meta": {"version": "v1"},
    }
    return _json.dumps(payload).encode("utf-8")


class EmbedOriginAllowlistMiddleware:
    """Enforce the per-tenant embed-origin allow-list on the embed sub-app.

    Decision tree for every inbound HTTP request:

    1. Non-HTTP scope (websockets/lifespan) → pass through.
    2. CORS preflight (``OPTIONS`` with ``access-control-request-method``)
       → pass through. The embed sub-app's ``CORSMiddleware`` already
       advertises the wildcard policy; gating preflight here would break
       browsers that have not yet learned the allow-list (chicken-and-egg).
       The follow-up GET (or POST) is what we actually gate.
    3. Path is the partner-config gate (``GET /tenants/{slug}/partner-config``)
       → look up the tenant's stored allow-list (cached 60s):
         * empty / missing  → ALLOW (open by default; Wave 8-A behaviour).
         * non-empty + Origin matches an entry → ALLOW.
         * non-empty + Origin is missing or does not match → REJECT 403.
    4. Path is ``POST /search/candidates`` → body-peek the request,
       extract ``channel_context.tenant_ref``, run the same allow-list
       lookup. Body is replayed to the downstream handler unchanged.
       Body-peek failures (parse error, missing field, oversize) fail OPEN
       so the handler can emit its standard 422.
    5. Path is ``POST /leads`` → same body-peek pattern but the slug is
       carried as the top-level ``tenant_slug`` field.
    6. Any other path → pass through.

    Wave 10-A hardening: previously only the partner-config GET was gated
    and POST routes inherited via client cooperation. POST enforcement now
    closes the gap so a misbehaving (or malicious) widget that skipped the
    partner-config fetch cannot cross-tenant fish via the open prefix.
    """

    def __init__(self, app: ASGIApp, *, parent_app: FastAPI | None = None) -> None:
        self.app = app
        self._parent_app = parent_app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope.get("type") != "http":
            await self.app(scope, receive, send)
            return

        method = (scope.get("method") or "").upper()
        path = scope.get("path") or ""

        # Preflight: defer to the embed sub-app's CORS layer. Rejecting the
        # OPTIONS request would force browsers to fail open with no useful
        # error. The follow-up real request is what we gate.
        if method == "OPTIONS":
            await self.app(scope, receive, send)
            return

        # Classify the route. We have three gated families:
        #   * GET partner-config — slug from URL.
        #   * POST search/candidates — slug from body.channel_context.tenant_ref.
        #   * POST leads — slug from body.tenant_slug.
        slug: str | None = None
        downstream_receive: Receive = receive

        if method == "GET":
            slug = _extract_partner_config_slug(path)
            if slug is None:
                await self.app(scope, receive, send)
                return
        elif method == "POST" and _EMBED_SEARCH_CANDIDATES_PATH_PATTERN.match(path):
            body_bytes, downstream_receive = await _peek_request_body(receive)
            slug = _extract_search_tenant_ref(body_bytes)
            if slug is None:
                # Body parse failed / missing field / oversize — fail open
                # so the handler returns its standard 422.
                await self.app(scope, downstream_receive, send)
                return
        elif method == "POST" and _EMBED_LEADS_PATH_PATTERN.match(path):
            body_bytes, downstream_receive = await _peek_request_body(receive)
            slug = _extract_lead_tenant_slug(body_bytes)
            if slug is None:
                await self.app(scope, downstream_receive, send)
                return
        else:
            await self.app(scope, receive, send)
            return

        # Prefer the explicit parent_app reference so we work even on the
        # first request before ``ParentStateMiddleware`` has bridged state.
        # Fall back to the embed sub-app's state for tests that wire the
        # state directly.
        session_factory = None
        if self._parent_app is not None:
            state = getattr(self._parent_app, "state", None)
            if state is not None:
                session_factory = getattr(state, "session_factory", None)
        if session_factory is None:
            embed_app = scope.get("app")
            if embed_app is not None:
                state = getattr(embed_app, "state", None)
                if state is not None:
                    session_factory = getattr(state, "session_factory", None)

        try:
            allow_list = await get_tenant_embed_origins(session_factory, slug)
        except Exception:  # pragma: no cover - defensive
            embed_origin_logger.warning(
                "embed.origin_allowlist.cache_failure",
                extra={"slug": slug},
                exc_info=True,
            )
            allow_list = []

        if not allow_list:
            # Empty allow-list = legacy / open tenant. Backward compat.
            await self.app(scope, downstream_receive, send)
            return

        # The parent app's ``EmbedCorsHygieneMiddleware`` strips ``Origin``
        # from the scope visible to the embed sub-app and stashes the
        # original list under a private scope key. ``ParentStateMiddleware``
        # restores those headers when it runs INSIDE us. To stay agnostic to
        # ordering, we look at BOTH places — whichever has the ``Origin``
        # entry wins.
        raw_headers: list[tuple[bytes, bytes]] = list(scope.get("headers") or [])
        stash = scope.get("__bookedai_embed_original_headers__")
        if isinstance(stash, list):
            raw_headers = list(stash) + raw_headers
        origin_header: str | None = None
        explicit_hint: str | None = None
        for name, value in raw_headers:
            if name == b"origin" and origin_header is None:
                try:
                    origin_header = value.decode("latin-1")
                except Exception:
                    origin_header = None
            elif name == b"x-bookedai-embed-origin" and explicit_hint is None:
                try:
                    explicit_hint = value.decode("latin-1")
                except Exception:
                    explicit_hint = None
        candidate_origin = (
            _normalize_origin_for_match(origin_header)
            or _normalize_origin_for_match(explicit_hint)
        )

        if candidate_origin and candidate_origin in allow_list:
            await self.app(scope, downstream_receive, send)
            return

        # Reject. Emit one structured event so ops can see denied embeds in
        # the same stream as ``embed.request``.
        try:
            embed_origin_logger.info(
                "embed.origin_allowlist.rejected",
                extra={
                    "event_type": "embed.origin_allowlist.rejected",
                    "slug": slug,
                    "origin": origin_header or "",
                    "origin_hint": explicit_hint or "",
                    "allow_list_size": len(allow_list),
                    "method": method,
                    "path": path,
                },
            )
        except Exception:
            pass

        body = _embed_origin_forbidden_response_payload()
        # Mirror the embed sub-app's wildcard CORS posture on the rejection so
        # the widget on the offending origin can actually surface a useful
        # error to the user instead of an opaque CORS failure in DevTools.
        # ``allow_credentials`` stays implicitly false (no ACAC header).
        response_headers: list[tuple[bytes, bytes]] = [
            (b"content-type", b"application/json"),
            (b"content-length", str(len(body)).encode("ascii")),
            (b"access-control-allow-origin", b"*"),
            (b"vary", b"Origin"),
        ]
        await send(
            {
                "type": "http.response.start",
                "status": 403,
                "headers": response_headers,
            }
        )
        await send({"type": "http.response.body", "body": body, "more_body": False})


def _normalize_environment(value: str) -> str:
    return (value or "").strip().lower()


def _is_production_environment(environment: str) -> bool:
    return _normalize_environment(environment) in {"production", "prod", "live"}


def _is_loopback_origin(origin: str) -> bool:
    """Return True if an origin points at localhost / 127.0.0.1 / ::1."""
    try:
        parsed = urlparse(origin)
    except ValueError:
        return False
    host = (parsed.hostname or "").lower()
    return host in {"localhost", "127.0.0.1", "::1", "0.0.0.0"}


def _validate_cors_configuration(origins: list[str], environment: str) -> None:
    """Defensive checks before mounting CORSMiddleware.

    * `*` + `allow_credentials=True` is a hard config error — Starlette would
      strip credentials silently otherwise, so we surface it loudly at boot.
    * Loopback origins in production are almost always config drift (someone
      copy-pasted a dev `CORS_ALLOW_ORIGINS` into prod). We warn rather than
      hard-fail to keep emergency hot-fixes shipped without code changes.
    """
    has_wildcard = any(origin.strip() == "*" for origin in origins)
    if has_wildcard:
        # allow_credentials is True below; combining with `*` silently breaks
        # cross-origin cookies AND defeats the purpose of the allow-list.
        raise RuntimeError(
            "CORS misconfiguration: allow_origins contains '*' while "
            "allow_credentials=True. Set CORS_ALLOW_ORIGINS to an explicit "
            "list of trusted origins."
        )
    if _is_production_environment(environment):
        leaked = [origin for origin in origins if _is_loopback_origin(origin)]
        if leaked:
            logger.warning(
                "cors.production_loopback_origin_detected",
                extra={
                    "environment": environment,
                    "loopback_origins": leaked,
                },
            )


def _trusted_hosts_from_origins(origins: list[str]) -> list[str]:
    """Map CORS origin URLs to host names for TrustedHostMiddleware.

    TrustedHostMiddleware compares against the inbound `Host` header, so we
    drop the scheme/port and de-duplicate. Test/CI clients that hit the API
    via an arbitrary `testserver` host are tolerated outside production.
    """
    hosts: list[str] = []
    seen: set[str] = set()
    for origin in origins:
        try:
            parsed = urlparse(origin)
        except ValueError:
            continue
        host = (parsed.hostname or "").strip()
        if not host or host in seen:
            continue
        seen.add(host)
        hosts.append(host)
    return hosts


def create_app() -> FastAPI:
    configure_logging()
    app = FastAPI(
        title="BookedAI API",
        version="1.0.1-stable",
        docs_url="/api/docs" if settings.expose_api_docs else None,
        redoc_url="/api/redoc" if settings.expose_api_docs else None,
        openapi_url="/api/openapi.json" if settings.expose_api_docs else None,
        lifespan=lifespan,
    )

    cors_origins = parse_cors_origins(settings.cors_allow_origins)
    environment = getattr(settings, "environment", "") or ""
    _validate_cors_configuration(cors_origins, environment)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=cors_origins,
        allow_credentials=True,
        allow_methods=ALLOWED_CORS_METHODS,
        allow_headers=ALLOWED_CORS_HEADERS,
        expose_headers=EXPOSED_CORS_HEADERS,
        max_age=CORS_PREFLIGHT_MAX_AGE_SECONDS,
    )

    trusted_hosts = _trusted_hosts_from_origins(cors_origins)
    if not _is_production_environment(environment):
        # Allow Starlette/pytest TestClient (`testserver`) and bare loopback
        # hits in dev/CI where the inbound Host header doesn't match a public
        # subdomain. Production stays strict.
        for fallback in ("testserver", "localhost", "127.0.0.1"):
            if fallback not in trusted_hosts:
                trusted_hosts.append(fallback)
    if trusted_hosts:
        app.add_middleware(TrustedHostMiddleware, allowed_hosts=trusted_hosts)

    app.add_middleware(CorrelationIdMiddleware)
    # Outermost in the request flow: see EmbedCorsHygieneMiddleware doc.
    app.add_middleware(EmbedCorsHygieneMiddleware)
    register_exception_handlers(app)
    app.include_router(public_catalog_router)
    app.include_router(upload_router)
    app.include_router(webhook_router)
    app.include_router(admin_router)
    app.include_router(communication_router)
    app.include_router(v1_router)
    app.include_router(internal_worker_router)

    # Wave 5-E-3 embed sub-app: separate CORS surface (allow_origins=["*"],
    # allow_credentials=False) for the public ``<bookedai-search>`` widget
    # embedded on external tenant domains. See
    # ``backend/api/v1_embed_routes.py`` and
    # ``docs/development/multi-tenant-plugin-widget.md``.
    embed_app = build_embed_app(app)
    # Wave 8-A follow-up: per-tenant origin allow-list. Registered AFTER
    # ``EmbedOriginTelemetryMiddleware`` so it sits OUTSIDE telemetry on the
    # inbound flow (Starlette ``add_middleware`` inserts at the front of the
    # stack — last added, outermost). Telemetry still observes the rejected
    # request via the dedicated ``embed.origin_allowlist.rejected`` event.
    embed_app.add_middleware(EmbedOriginAllowlistMiddleware, parent_app=app)
    app.mount("/api/v1/embed", embed_app)
    return app


app = create_app()
