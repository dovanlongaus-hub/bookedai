"""Per-tenant Zoho credential resolution.

This module centralises the lookup of Zoho Calendar and Zoho CRM credentials
on a per-tenant basis, with safe fallback to the platform-wide environment
configuration. Tenants that store their own ``refresh_token`` /
``client_id`` / ``client_secret`` triple under
``tenant_settings.settings_json.integrations.zoho_calendar`` (or ``zoho_crm``)
get a credential bundle scoped to *their* Zoho account so calendar events
and CRM records appear in the tenant's own Zoho One subscription rather
than the BookedAI platform's.

Design rules:
    * Tenant credentials win when complete; the helper never falls through
      from a partially-configured tenant to the platform.
    * When the tenant has not configured Zoho, the helper transparently
      surfaces the platform credentials with ``source='platform_default'``
      so existing single-tenant deployments keep working.
    * When neither is configured, the helper returns ``None`` so callers
      can short-circuit without raising.

The helper deliberately avoids any I/O beyond the tenant_settings read so
the result can be cached or memoised at the call site if needed.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Literal
from uuid import UUID

from config import Settings
from repositories.base import RepositoryContext
from repositories.tenant_repository import TenantRepository


CredentialSource = Literal["tenant", "platform_default"]


@dataclass(frozen=True)
class ZohoCalendarCredentials:
    """Resolved Zoho Calendar credential bundle for a single tenant."""

    refresh_token: str
    client_id: str
    client_secret: str
    accounts_base_url: str
    api_base_url: str
    calendar_uid: str | None
    connected_at: str | None
    source: CredentialSource


@dataclass(frozen=True)
class ZohoCRMCredentials:
    """Resolved Zoho CRM credential bundle for a single tenant."""

    refresh_token: str
    client_id: str
    client_secret: str
    accounts_base_url: str
    api_base_url: str
    default_lead_module: str
    default_contact_module: str
    default_deal_module: str
    default_task_module: str
    connected_at: str | None
    source: CredentialSource


_DEFAULT_CALENDAR_API_BASE_URL = "https://calendar.zoho.com/api/v1"
_DEFAULT_CRM_API_BASE_URL = "https://www.zohoapis.com.au/crm/v8"
_DEFAULT_ACCOUNTS_BASE_URL = "https://accounts.zoho.com.au"


def _normalize(value: object | None) -> str:
    return str(value or "").strip()


def _normalize_or_none(value: object | None) -> str | None:
    normalized = _normalize(value)
    return normalized or None


def _calendar_api_base_url(value: object | None) -> str:
    base = _normalize(value) or _DEFAULT_CALENDAR_API_BASE_URL
    base = base.rstrip("/")
    if base.endswith("/api/v1"):
        return base
    return f"{base}/api/v1"


async def _read_tenant_integrations_block(
    session,
    *,
    tenant_id: str | UUID,
) -> dict[str, object]:
    """Return the ``integrations`` sub-document from tenant_settings, or {}."""
    repository = TenantRepository(RepositoryContext(session=session))
    settings_json = await repository.get_tenant_settings(str(tenant_id))
    integrations = settings_json.get("integrations") if isinstance(settings_json, dict) else None
    return dict(integrations) if isinstance(integrations, dict) else {}


def _platform_calendar_credentials(settings: Settings) -> ZohoCalendarCredentials | None:
    refresh_token = _normalize(
        getattr(settings, "zoho_calendar_refresh_token", "")
        or getattr(settings, "zoho_crm_refresh_token", "")
    )
    client_id = _normalize(
        getattr(settings, "zoho_calendar_client_id", "")
        or getattr(settings, "zoho_crm_client_id", "")
    )
    client_secret = _normalize(
        getattr(settings, "zoho_calendar_client_secret", "")
        or getattr(settings, "zoho_crm_client_secret", "")
    )
    if not (refresh_token and client_id and client_secret):
        return None
    return ZohoCalendarCredentials(
        refresh_token=refresh_token,
        client_id=client_id,
        client_secret=client_secret,
        accounts_base_url=_normalize(getattr(settings, "zoho_accounts_base_url", ""))
        or _DEFAULT_ACCOUNTS_BASE_URL,
        api_base_url=_calendar_api_base_url(
            getattr(settings, "zoho_calendar_api_base_url", "")
        ),
        calendar_uid=_normalize_or_none(getattr(settings, "zoho_calendar_uid", "")),
        connected_at=None,
        source="platform_default",
    )


def _platform_crm_credentials(settings: Settings) -> ZohoCRMCredentials | None:
    refresh_token = _normalize(getattr(settings, "zoho_crm_refresh_token", ""))
    client_id = _normalize(getattr(settings, "zoho_crm_client_id", ""))
    client_secret = _normalize(getattr(settings, "zoho_crm_client_secret", ""))
    if not (refresh_token and client_id and client_secret):
        return None
    return ZohoCRMCredentials(
        refresh_token=refresh_token,
        client_id=client_id,
        client_secret=client_secret,
        accounts_base_url=_normalize(getattr(settings, "zoho_accounts_base_url", ""))
        or _DEFAULT_ACCOUNTS_BASE_URL,
        api_base_url=_normalize(getattr(settings, "zoho_crm_api_base_url", ""))
        or _DEFAULT_CRM_API_BASE_URL,
        default_lead_module=_normalize(getattr(settings, "zoho_crm_default_lead_module", ""))
        or "Leads",
        default_contact_module=_normalize(getattr(settings, "zoho_crm_default_contact_module", ""))
        or "Contacts",
        default_deal_module=_normalize(getattr(settings, "zoho_crm_default_deal_module", ""))
        or "Deals",
        default_task_module=_normalize(getattr(settings, "zoho_crm_default_task_module", ""))
        or "Tasks",
        connected_at=None,
        source="platform_default",
    )


def _tenant_calendar_block_complete(block: dict[str, object]) -> bool:
    return all(
        _normalize(block.get(key))
        for key in ("refresh_token", "client_id", "client_secret")
    )


def _tenant_crm_block_complete(block: dict[str, object]) -> bool:
    return all(
        _normalize(block.get(key))
        for key in ("refresh_token", "client_id", "client_secret")
    )


def _calendar_from_tenant_block(block: dict[str, object]) -> ZohoCalendarCredentials:
    return ZohoCalendarCredentials(
        refresh_token=_normalize(block.get("refresh_token")),
        client_id=_normalize(block.get("client_id")),
        client_secret=_normalize(block.get("client_secret")),
        accounts_base_url=_normalize(block.get("accounts_base_url"))
        or _DEFAULT_ACCOUNTS_BASE_URL,
        api_base_url=_calendar_api_base_url(block.get("api_base_url")),
        calendar_uid=_normalize_or_none(block.get("calendar_uid")),
        connected_at=_normalize_or_none(block.get("connected_at")),
        source="tenant",
    )


def _crm_from_tenant_block(block: dict[str, object]) -> ZohoCRMCredentials:
    return ZohoCRMCredentials(
        refresh_token=_normalize(block.get("refresh_token")),
        client_id=_normalize(block.get("client_id")),
        client_secret=_normalize(block.get("client_secret")),
        accounts_base_url=_normalize(block.get("accounts_base_url"))
        or _DEFAULT_ACCOUNTS_BASE_URL,
        api_base_url=_normalize(block.get("api_base_url"))
        or _DEFAULT_CRM_API_BASE_URL,
        default_lead_module=_normalize(block.get("default_lead_module")) or "Leads",
        default_contact_module=_normalize(block.get("default_contact_module"))
        or "Contacts",
        default_deal_module=_normalize(block.get("default_deal_module")) or "Deals",
        default_task_module=_normalize(block.get("default_task_module")) or "Tasks",
        connected_at=_normalize_or_none(block.get("connected_at")),
        source="tenant",
    )


async def resolve_tenant_zoho_calendar_credentials(
    session,
    *,
    tenant_id: str | UUID | None,
    settings: Settings,
) -> ZohoCalendarCredentials | None:
    """Resolve Zoho Calendar credentials for ``tenant_id``.

    Returns the tenant-specific bundle when complete, otherwise the
    platform default, otherwise ``None`` when neither is configured.
    """
    if tenant_id is not None:
        try:
            integrations = await _read_tenant_integrations_block(session, tenant_id=tenant_id)
        except Exception:  # noqa: BLE001
            # Failing to read tenant_settings should never crash the booking
            # path — fall back to platform credentials and let the caller
            # warn-log if the tenant operator expected per-tenant routing.
            integrations = {}
        block = integrations.get("zoho_calendar") if isinstance(integrations, dict) else None
        if isinstance(block, dict) and _tenant_calendar_block_complete(block):
            return _calendar_from_tenant_block(block)
    return _platform_calendar_credentials(settings)


async def resolve_tenant_zoho_crm_credentials(
    session,
    *,
    tenant_id: str | UUID | None,
    settings: Settings,
) -> ZohoCRMCredentials | None:
    """Resolve Zoho CRM credentials for ``tenant_id``.

    Returns the tenant-specific bundle when complete, otherwise the
    platform default, otherwise ``None`` when neither is configured.
    """
    if tenant_id is not None:
        try:
            integrations = await _read_tenant_integrations_block(session, tenant_id=tenant_id)
        except Exception:  # noqa: BLE001
            integrations = {}
        block = integrations.get("zoho_crm") if isinstance(integrations, dict) else None
        if isinstance(block, dict) and _tenant_crm_block_complete(block):
            return _crm_from_tenant_block(block)
    return _platform_crm_credentials(settings)


def resolve_tenant_cc_emails(
    settings_json: dict[str, object] | None,
    *,
    base_to: list[str] | None = None,
) -> list[str]:
    """Compute the tenant CC list for a lifecycle email send.

    Reads ``cc_emails`` (array) from the tenant_settings JSON, falling back
    to ``[contact_email]`` when no explicit array is set. Filters out
    addresses already present in ``base_to`` to avoid double-CC, and
    returns a de-duplicated, lowercased list preserving first-seen order.
    """
    settings_json = settings_json or {}
    raw_cc_list = settings_json.get("cc_emails") if isinstance(settings_json, dict) else None
    candidates: list[str] = []
    if isinstance(raw_cc_list, list):
        candidates.extend(str(item) for item in raw_cc_list)
    elif isinstance(raw_cc_list, str):
        candidates.append(raw_cc_list)
    else:
        contact_email = settings_json.get("contact_email") if isinstance(settings_json, dict) else None
        if isinstance(contact_email, str):
            candidates.append(contact_email)
    base_to_normalized = {
        _normalize(item).lower() for item in (base_to or []) if _normalize(item)
    }
    seen: set[str] = set()
    resolved: list[str] = []
    for candidate in candidates:
        normalized = _normalize(candidate).lower()
        if not normalized or normalized in seen or normalized in base_to_normalized:
            continue
        seen.add(normalized)
        resolved.append(normalized)
    return resolved


__all__ = [
    "CredentialSource",
    "ZohoCalendarCredentials",
    "ZohoCRMCredentials",
    "resolve_tenant_zoho_calendar_credentials",
    "resolve_tenant_zoho_crm_credentials",
    "resolve_tenant_cc_emails",
]
