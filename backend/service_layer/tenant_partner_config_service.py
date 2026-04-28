"""Service layer for the multi-tenant Partner Config API.

This module owns:
  * The Pydantic payload models that define the partner-config wire shape
    (also used by the admin upsert endpoint for validation).
  * The SAFE FALLBACK builder that turns a `tenants.name` row into a fully
    renderable partner-config payload when no custom config has been stored.
  * The merge helper that overlays a stored config on top of the fallback,
    so a tenant who only customizes brand can still rely on default channels
    and endpoint metadata.

The route/handler layer stays transport-thin and imports from here.
"""

from __future__ import annotations

import re
from typing import Any
from urllib.parse import urlparse as _urlparse

from pydantic import BaseModel, Field, field_validator, model_validator

from core.errors import ValidationAppError


PARTNER_CONFIG_CACHE_SECONDS = 60

DEFAULT_BOOKEDAI_TELEGRAM_BOT_USERNAME = "BookedAI_Manager_Bot"
DEFAULT_BOOKEDAI_ACCENT_COLOR = "#0071e3"
DEFAULT_BOOKEDAI_LOGO_URL: str | None = None
DEFAULT_BOOKEDAI_FAVICON_URL: str | None = None
DEFAULT_BOOKEDAI_FOOTER_HTML: str | None = None

ALLOWED_PARTNER_CAPABILITIES: frozenset[str] = frozenset(
    {
        "stripe",
        "telegram",
        "whatsapp",
        "sms",
        "email",
        "calendar",
        "monthly_reminder",
        "feedback",
        "crm_zoho",
        "portal",
        "widget",
    }
)

ALLOWED_CTA_INTENTS: frozenset[str] = frozenset(
    {
        "open_search",
        "open_booking",
        "open_portal",
        "open_widget",
        "external",
    }
)

DEFAULT_PARTNER_CAPABILITIES: tuple[str, ...] = (
    "stripe",
    "telegram",
    "whatsapp",
    "calendar",
)

DEFAULT_TRUST_SIGNALS: tuple[dict[str, str], ...] = (
    {"label": "Verified BookedAI tenant", "icon": "shield-check"},
    {"label": "Real Stripe payments", "icon": "credit-card"},
    {"label": "Auditable action ledger", "icon": "list-checks"},
)

PARTNER_COPY_MAX_LENGTH = 2000
PARTNER_HREF_MAX_LENGTH = 2000
PARTNER_LIST_MAX_ITEMS = 24

# Wave 8-A follow-up — per-tenant embed origin allow-list. Empty/None means
# "open by default" (backward compat with Wave 8-A which allowed any origin).
# Each entry must be a fully-qualified ``https://`` URL or an ``http://localhost``
# (or ``http://127.0.0.1``) variant for local dev. Wildcards, bare hostnames,
# ``null``, and non-HTTP schemes (``javascript:``, ``data:``) are rejected.
EMBED_ORIGIN_MAX_LENGTH = 256
EMBED_ORIGIN_LIST_MAX_ITEMS = 32
_LOCAL_DEV_ORIGIN_HOSTS: frozenset[str] = frozenset({"localhost", "127.0.0.1", "::1"})

_HEX_COLOR_PATTERN = re.compile(r"^#[0-9A-Fa-f]{6}$|^#[0-9A-Fa-f]{3}$")


def _normalize_embed_origin(raw: object) -> str:
    """Validate one embed-origin entry and return its canonical form.

    Accepted:
      * ``https://<host>[:port]`` — the production case.
      * ``http://localhost[:port]`` / ``http://127.0.0.1[:port]`` /
        ``http://[::1][:port]`` — explicit dev allowance, never accepted in
        prod traffic because real browsers would not send that ``Origin``.

    Rejected (raises ``ValueError``):
      * ``*``, empty string, ``null``, anything not a string.
      * Schemes other than ``http``/``https``.
      * ``http://`` with a non-loopback host (would defeat TLS).
      * Origins with a path, query, fragment, or userinfo component.
    """
    if not isinstance(raw, str):
        raise ValueError("embed_origins entries must be strings.")
    candidate = raw.strip()
    if not candidate:
        raise ValueError("embed_origins entries must be non-empty strings.")
    if candidate == "*" or candidate.lower() == "null":
        raise ValueError(
            "embed_origins entries must be explicit https:// origins; '*' "
            "and 'null' are not permitted."
        )
    if len(candidate) > EMBED_ORIGIN_MAX_LENGTH:
        raise ValueError(
            f"embed_origins entries must be at most {EMBED_ORIGIN_MAX_LENGTH} characters."
        )
    # Avoid accepting dangerous schemes via urlparse alone; bail before parse
    # if the value clearly does not look like a URL.
    if "://" not in candidate:
        raise ValueError(
            "embed_origins entries must be fully-qualified URLs starting "
            "with https:// (or http://localhost for dev)."
        )
    try:
        parsed = _urlparse(candidate)
    except ValueError as exc:
        raise ValueError(f"embed_origins entry is not a valid URL: {candidate}") from exc
    scheme = (parsed.scheme or "").lower()
    if scheme not in {"http", "https"}:
        raise ValueError(
            f"embed_origins entry must use http or https scheme, got: {scheme or '(none)'}."
        )
    host = (parsed.hostname or "").lower()
    if not host:
        raise ValueError(f"embed_origins entry is missing a host: {candidate}")
    if scheme == "http" and host not in _LOCAL_DEV_ORIGIN_HOSTS:
        raise ValueError(
            "embed_origins entry must use https:// (http:// is only permitted "
            "for localhost / 127.0.0.1 / ::1 in development)."
        )
    if parsed.username or parsed.password:
        raise ValueError("embed_origins entry must not contain userinfo.")
    if parsed.path and parsed.path not in ("", "/"):
        raise ValueError("embed_origins entry must not contain a path component.")
    if parsed.query or parsed.fragment:
        raise ValueError("embed_origins entry must not contain query or fragment.")
    # Canonical form: scheme + host(+port) — drop any trailing slash so
    # comparison against the inbound ``Origin`` header is exact.
    netloc = host
    if parsed.port is not None:
        netloc = f"{host}:{parsed.port}"
    return f"{scheme}://{netloc}"


def _clean_optional_text(value: object | None, *, max_length: int = PARTNER_COPY_MAX_LENGTH) -> str | None:
    if value is None:
        return None
    normalized = str(value).strip()
    if not normalized:
        return None
    if len(normalized) > max_length:
        raise ValueError(f"Field exceeds maximum length of {max_length} characters.")
    return normalized


def _clean_required_text(value: object | None, *, field: str, max_length: int = PARTNER_COPY_MAX_LENGTH) -> str:
    cleaned = _clean_optional_text(value, max_length=max_length)
    if not cleaned:
        raise ValueError(f"`{field}` is required.")
    return cleaned


class PartnerCtaPayload(BaseModel):
    label: str
    intent: str
    href: str | None = None

    @field_validator("label")
    @classmethod
    def _validate_label(cls, value: str) -> str:
        return _clean_required_text(value, field="label", max_length=200)

    @field_validator("intent")
    @classmethod
    def _validate_intent(cls, value: str) -> str:
        normalized = (value or "").strip().lower()
        if normalized not in ALLOWED_CTA_INTENTS:
            allowed = ", ".join(sorted(ALLOWED_CTA_INTENTS))
            raise ValueError(f"intent must be one of: {allowed}.")
        return normalized

    @field_validator("href")
    @classmethod
    def _validate_href(cls, value: str | None) -> str | None:
        return _clean_optional_text(value, max_length=PARTNER_HREF_MAX_LENGTH)

    @model_validator(mode="after")
    def _check_external_href(self) -> "PartnerCtaPayload":
        if self.intent == "external" and not self.href:
            raise ValueError("href is required when intent is 'external'.")
        return self


class PartnerBrandPayload(BaseModel):
    name: str
    tagline: str | None = None
    logo_url: str | None = None
    favicon_url: str | None = None
    accent_color: str = DEFAULT_BOOKEDAI_ACCENT_COLOR

    @field_validator("name")
    @classmethod
    def _validate_name(cls, value: str) -> str:
        return _clean_required_text(value, field="brand.name", max_length=200)

    @field_validator("tagline")
    @classmethod
    def _validate_tagline(cls, value: str | None) -> str | None:
        return _clean_optional_text(value, max_length=400)

    @field_validator("logo_url", "favicon_url")
    @classmethod
    def _validate_optional_url(cls, value: str | None) -> str | None:
        return _clean_optional_text(value, max_length=PARTNER_HREF_MAX_LENGTH)

    @field_validator("accent_color")
    @classmethod
    def _validate_accent_color(cls, value: str) -> str:
        normalized = (value or "").strip()
        if not normalized:
            return DEFAULT_BOOKEDAI_ACCENT_COLOR
        if not _HEX_COLOR_PATTERN.match(normalized):
            raise ValueError("accent_color must be a 3- or 6-digit hex color (e.g. #0071e3).")
        return normalized


class PartnerHeroPayload(BaseModel):
    kicker: str | None = None
    h1: str
    sub: str | None = None
    primary_cta: PartnerCtaPayload | None = None
    secondary_cta: PartnerCtaPayload | None = None

    @field_validator("kicker", "sub")
    @classmethod
    def _validate_optional_copy(cls, value: str | None) -> str | None:
        return _clean_optional_text(value)

    @field_validator("h1")
    @classmethod
    def _validate_h1(cls, value: str) -> str:
        return _clean_required_text(value, field="hero.h1")


class PartnerTelegramChannelPayload(BaseModel):
    bot_username: str | None = None
    enabled: bool = False

    @field_validator("bot_username")
    @classmethod
    def _validate_username(cls, value: str | None) -> str | None:
        return _clean_optional_text(value, max_length=200)


class PartnerWhatsappChannelPayload(BaseModel):
    phone_number: str | None = None
    enabled: bool = False

    @field_validator("phone_number")
    @classmethod
    def _validate_phone(cls, value: str | None) -> str | None:
        return _clean_optional_text(value, max_length=64)


class PartnerChannelsPayload(BaseModel):
    telegram: PartnerTelegramChannelPayload | None = None
    whatsapp: PartnerWhatsappChannelPayload | None = None
    email_support: str | None = None

    @field_validator("email_support")
    @classmethod
    def _validate_email(cls, value: str | None) -> str | None:
        return _clean_optional_text(value, max_length=320)


class PartnerFeaturesPayload(BaseModel):
    monthly_reminder_default: bool = True
    post_booking_feedback: bool = True
    show_audit_ledger: bool = False
    layout_override: str | None = None

    @field_validator("layout_override")
    @classmethod
    def _validate_layout(cls, value: str | None) -> str | None:
        return _clean_optional_text(value, max_length=200)


class PartnerTrustSignalPayload(BaseModel):
    label: str
    icon: str | None = None

    @field_validator("label")
    @classmethod
    def _validate_label(cls, value: str) -> str:
        return _clean_required_text(value, field="trust_signals.label", max_length=200)

    @field_validator("icon")
    @classmethod
    def _validate_icon(cls, value: str | None) -> str | None:
        return _clean_optional_text(value, max_length=200)


class PartnerConfigPayload(BaseModel):
    """Full partner-config payload accepted by the admin upsert endpoint.

    The `slug` and `active` fields are echoed by the public endpoint but are
    derived from the tenants table — admins do not need to provide them.
    """

    brand: PartnerBrandPayload
    hero: PartnerHeroPayload
    capabilities: list[str] = Field(default_factory=list)
    channels: PartnerChannelsPayload | None = None
    features: PartnerFeaturesPayload | None = None
    services_endpoint: str | None = None
    booking_endpoint: str | None = None
    portal_endpoint_prefix: str | None = None
    trust_signals: list[PartnerTrustSignalPayload] = Field(default_factory=list)
    footer_html: str | None = None
    # Wave 8-A follow-up: per-tenant origin allow-list. Empty/None = open
    # (any origin) for backward compat with the original Wave 8-A bypass.
    embed_origins: list[str] | None = None

    @field_validator("capabilities")
    @classmethod
    def _validate_capabilities(cls, value: list[str]) -> list[str]:
        if value is None:
            return []
        if not isinstance(value, list):
            raise ValueError("capabilities must be a list.")
        if len(value) > PARTNER_LIST_MAX_ITEMS:
            raise ValueError(f"capabilities must have at most {PARTNER_LIST_MAX_ITEMS} entries.")
        cleaned: list[str] = []
        seen: set[str] = set()
        for raw in value:
            normalized = (str(raw) if raw is not None else "").strip().lower()
            if not normalized:
                continue
            if normalized not in ALLOWED_PARTNER_CAPABILITIES:
                allowed = ", ".join(sorted(ALLOWED_PARTNER_CAPABILITIES))
                raise ValueError(f"capability '{normalized}' is not allowed. Allowed: {allowed}.")
            if normalized in seen:
                continue
            seen.add(normalized)
            cleaned.append(normalized)
        return cleaned

    @field_validator("services_endpoint", "booking_endpoint", "portal_endpoint_prefix")
    @classmethod
    def _validate_endpoint(cls, value: str | None) -> str | None:
        return _clean_optional_text(value, max_length=PARTNER_HREF_MAX_LENGTH)

    @field_validator("footer_html")
    @classmethod
    def _validate_footer(cls, value: str | None) -> str | None:
        return _clean_optional_text(value, max_length=PARTNER_COPY_MAX_LENGTH * 2)

    @field_validator("trust_signals")
    @classmethod
    def _validate_trust_signal_count(
        cls,
        value: list[PartnerTrustSignalPayload],
    ) -> list[PartnerTrustSignalPayload]:
        if value is None:
            return []
        if len(value) > PARTNER_LIST_MAX_ITEMS:
            raise ValueError(
                f"trust_signals must have at most {PARTNER_LIST_MAX_ITEMS} entries."
            )
        return list(value)

    @field_validator("embed_origins")
    @classmethod
    def _validate_embed_origins(cls, value: list[str] | None) -> list[str] | None:
        # ``None`` and ``[]`` both mean "open by default" — preserve the input
        # form so a caller who explicitly cleared the list does not get it
        # silently coerced to None (or vice-versa).
        if value is None:
            return None
        if not isinstance(value, list):
            raise ValueError("embed_origins must be a list of origin strings.")
        if len(value) > EMBED_ORIGIN_LIST_MAX_ITEMS:
            raise ValueError(
                f"embed_origins must have at most {EMBED_ORIGIN_LIST_MAX_ITEMS} entries."
            )
        cleaned: list[str] = []
        seen: set[str] = set()
        for raw in value:
            normalized = _normalize_embed_origin(raw)
            if normalized in seen:
                continue
            seen.add(normalized)
            cleaned.append(normalized)
        return cleaned


def _default_services_endpoint(slug: str) -> str:
    return f"/api/v1/search/candidates?tenant_ref={slug}"


def _default_booking_endpoint() -> str:
    return "/api/v1/leads"


def _default_portal_endpoint_prefix() -> str:
    return "/api/v1/portal/bookings"


def _default_brand(*, tenant_name: str) -> dict[str, Any]:
    return {
        "name": tenant_name,
        "tagline": "Live BookedAI partner",
        "logo_url": DEFAULT_BOOKEDAI_LOGO_URL,
        "favicon_url": DEFAULT_BOOKEDAI_FAVICON_URL,
        "accent_color": DEFAULT_BOOKEDAI_ACCENT_COLOR,
    }


def _default_hero(*, tenant_name: str) -> dict[str, Any]:
    return {
        "kicker": f"{tenant_name} · Live BookedAI partner",
        "h1": f"Book with {tenant_name} — powered by BookedAI.",
        "sub": (
            "Search live programs, complete payment securely, and we will keep you "
            "on track from booking to follow-up."
        ),
        "primary_cta": {
            "label": "Save my spot",
            "intent": "open_search",
            "href": None,
        },
        "secondary_cta": None,
    }


def _default_channels(
    *,
    default_support_email: str,
    default_support_phone: str,
) -> dict[str, Any]:
    return {
        "telegram": {
            "bot_username": DEFAULT_BOOKEDAI_TELEGRAM_BOT_USERNAME,
            "enabled": True,
        },
        "whatsapp": {
            "phone_number": default_support_phone,
            "enabled": True,
        },
        "email_support": default_support_email,
    }


def _default_features() -> dict[str, Any]:
    return {
        "monthly_reminder_default": True,
        "post_booking_feedback": True,
        "show_audit_ledger": False,
        "layout_override": None,
    }


def _default_trust_signals() -> list[dict[str, Any]]:
    return [dict(item) for item in DEFAULT_TRUST_SIGNALS]


def build_default_partner_config(
    *,
    slug: str,
    tenant_name: str,
    tenant_status: str = "active",
    default_support_email: str,
    default_support_phone: str,
) -> dict[str, Any]:
    """Construct the SAFE FALLBACK partner config for a tenant.

    Used when `tenants.partner_config_jsonb` is NULL, so a brand-new tenant
    automatically gets a working partner page on first DNS resolution.
    """
    normalized_slug = (slug or "").strip().lower()
    safe_name = (tenant_name or normalized_slug).strip() or normalized_slug
    return {
        "slug": normalized_slug,
        "active": (tenant_status or "active").strip().lower() == "active",
        "brand": _default_brand(tenant_name=safe_name),
        "hero": _default_hero(tenant_name=safe_name),
        "capabilities": list(DEFAULT_PARTNER_CAPABILITIES),
        "channels": _default_channels(
            default_support_email=default_support_email,
            default_support_phone=default_support_phone,
        ),
        "features": _default_features(),
        "services_endpoint": _default_services_endpoint(normalized_slug),
        "booking_endpoint": _default_booking_endpoint(),
        "portal_endpoint_prefix": _default_portal_endpoint_prefix(),
        "trust_signals": _default_trust_signals(),
        "footer_html": DEFAULT_BOOKEDAI_FOOTER_HTML,
        # Empty allow-list = open by default. Ops sets this per-tenant
        # via the admin upsert endpoint to restrict embed origins.
        "embed_origins": [],
    }


def _merge_dict_section(base: dict[str, Any], override: Any) -> dict[str, Any]:
    if not isinstance(override, dict):
        return dict(base)
    merged = dict(base)
    for key, value in override.items():
        if value is None:
            continue
        if isinstance(value, dict) and isinstance(merged.get(key), dict):
            merged[key] = _merge_dict_section(merged[key], value)
        else:
            merged[key] = value
    return merged


def _coerce_iterable(value: Any) -> list[Any]:
    if value is None:
        return []
    if isinstance(value, (list, tuple)):
        return list(value)
    return []


def merge_partner_config_with_defaults(
    *,
    slug: str,
    tenant_name: str,
    tenant_status: str,
    stored_config: dict[str, Any] | None,
    default_support_email: str,
    default_support_phone: str,
) -> dict[str, Any]:
    """Layer a stored partner config on top of the default fallback.

    Always returns a payload with every contract field populated, so the
    public endpoint never returns a partial response. Endpoints
    (`services_endpoint`, `booking_endpoint`, `portal_endpoint_prefix`) are
    always populated from the stored config OR from BookedAI defaults.
    """
    fallback = build_default_partner_config(
        slug=slug,
        tenant_name=tenant_name,
        tenant_status=tenant_status,
        default_support_email=default_support_email,
        default_support_phone=default_support_phone,
    )

    if not isinstance(stored_config, dict) or not stored_config:
        return fallback

    merged = dict(fallback)
    merged["slug"] = fallback["slug"]
    merged["active"] = fallback["active"]
    merged["brand"] = _merge_dict_section(fallback["brand"], stored_config.get("brand"))
    merged["hero"] = _merge_dict_section(fallback["hero"], stored_config.get("hero"))

    capabilities_override = stored_config.get("capabilities")
    if isinstance(capabilities_override, list) and capabilities_override:
        cleaned: list[str] = []
        seen: set[str] = set()
        for raw in capabilities_override:
            normalized = (str(raw) if raw is not None else "").strip().lower()
            if not normalized or normalized in seen:
                continue
            if normalized in ALLOWED_PARTNER_CAPABILITIES:
                seen.add(normalized)
                cleaned.append(normalized)
        merged["capabilities"] = cleaned or list(fallback["capabilities"])

    merged["channels"] = _merge_dict_section(
        fallback["channels"], stored_config.get("channels")
    )
    merged["features"] = _merge_dict_section(
        fallback["features"], stored_config.get("features")
    )

    for endpoint_key in ("services_endpoint", "booking_endpoint", "portal_endpoint_prefix"):
        override_value = stored_config.get(endpoint_key)
        if isinstance(override_value, str) and override_value.strip():
            merged[endpoint_key] = override_value.strip()

    trust_override = stored_config.get("trust_signals")
    if isinstance(trust_override, list) and trust_override:
        cleaned_trust: list[dict[str, Any]] = []
        for entry in trust_override:
            if isinstance(entry, dict):
                label = str(entry.get("label") or "").strip()
                if not label:
                    continue
                icon = entry.get("icon")
                cleaned_trust.append(
                    {
                        "label": label,
                        "icon": str(icon).strip() if isinstance(icon, str) and icon.strip() else None,
                    }
                )
        if cleaned_trust:
            merged["trust_signals"] = cleaned_trust

    if "footer_html" in stored_config:
        footer_override = stored_config.get("footer_html")
        if isinstance(footer_override, str) and footer_override.strip():
            merged["footer_html"] = footer_override
        elif footer_override is None:
            merged["footer_html"] = None

    embed_origins_override = stored_config.get("embed_origins")
    if isinstance(embed_origins_override, list):
        cleaned_origins: list[str] = []
        seen_origins: set[str] = set()
        for raw in embed_origins_override:
            try:
                normalized_origin = _normalize_embed_origin(raw)
            except ValueError:
                # Stored data may have been written by an older code path; skip
                # malformed entries rather than 500 the public response.
                continue
            if normalized_origin in seen_origins:
                continue
            seen_origins.add(normalized_origin)
            cleaned_origins.append(normalized_origin)
        merged["embed_origins"] = cleaned_origins

    return merged


def build_partner_config_response(
    *,
    slug: str,
    tenant_name: str,
    tenant_status: str,
    stored_config: dict[str, Any] | None,
    default_support_email: str,
    default_support_phone: str,
) -> dict[str, Any]:
    """Public wrapper: returns the merged partner-config payload as the
    `data` body for `GET /api/v1/public/tenants/{slug}/partner-config`.

    The ``embed_origins`` field is intentionally STRIPPED from the public
    response — it is enforced server-side by ``EmbedOriginAllowlistMiddleware``
    and surfacing the list publicly would tell an attacker exactly which
    origins they need to spoof. Admins inspect the configured allow-list
    via the admin upsert endpoint's response or the dashboard list.
    """
    merged = merge_partner_config_with_defaults(
        slug=slug,
        tenant_name=tenant_name,
        tenant_status=tenant_status,
        stored_config=stored_config,
        default_support_email=default_support_email,
        default_support_phone=default_support_phone,
    )
    merged.pop("embed_origins", None)
    return merged


def serialize_admin_partner_config_payload(payload: PartnerConfigPayload) -> dict[str, Any]:
    """Render a validated PartnerConfigPayload as the JSONB-ready dict that
    is persisted into `tenants.partner_config_jsonb`."""
    return payload.model_dump(mode="json", exclude_none=False)


__all__ = [
    "ALLOWED_CTA_INTENTS",
    "ALLOWED_PARTNER_CAPABILITIES",
    "DEFAULT_PARTNER_CAPABILITIES",
    "EMBED_ORIGIN_LIST_MAX_ITEMS",
    "EMBED_ORIGIN_MAX_LENGTH",
    "PARTNER_CONFIG_CACHE_SECONDS",
    "PartnerBrandPayload",
    "PartnerChannelsPayload",
    "PartnerConfigPayload",
    "PartnerCtaPayload",
    "PartnerFeaturesPayload",
    "PartnerHeroPayload",
    "PartnerTelegramChannelPayload",
    "PartnerTrustSignalPayload",
    "PartnerWhatsappChannelPayload",
    "build_default_partner_config",
    "build_partner_config_response",
    "merge_partner_config_with_defaults",
    "serialize_admin_partner_config_payload",
]
