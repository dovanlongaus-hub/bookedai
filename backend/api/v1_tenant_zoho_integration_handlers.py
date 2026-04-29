"""Tenant-facing Zoho integration management endpoints.

These handlers let a tenant admin (e.g. ``chess@bookedai.au``) connect a
Zoho Calendar / Zoho CRM account from inside their workspace WITHOUT having
to share their refresh-token through Slack or the platform admin console.

Flow:
    1. Frontend calls ``GET /api/v1/tenants/me/integrations`` to render the
       posture panel.
    2. To connect: ``GET /api/v1/tenants/me/integrations/zoho/{service}/authorize-url``
       returns a one-shot Zoho OAuth authorize URL (with a CSRF nonce + the
       caller's tenant_id encoded in ``state``).
    3. The tenant operator clicks through, logs into Zoho with their own
       account, approves scopes; Zoho redirects to the platform's
       ``/api/v1/integrations/zoho/oauth/callback`` endpoint.
    4. The callback exchanges ``code`` for ``refresh_token``, persists it
       under ``tenant_settings.settings_json.integrations.{service}``, and
       redirects the tenant back to ``tenant.bookedai.au/#integrations``.
    5. ``DELETE`` and ``POST .../test`` let operators disconnect or run a
       quick diagnostic against the persisted credentials.

Two registration modes are supported on the authorize URL:
    * Mode A — Use the platform's Zoho dev app (default). Tenant only needs
      a Zoho login; no developer console access required.
    * Mode B — Bring your own Zoho dev app: tenant supplies their own
      ``client_id`` + ``client_secret`` upfront via ``PATCH .../client``,
      and the authorize URL is built with those credentials so Zoho's
      OAuth screen branding matches the tenant's company.

This module deliberately keeps secrets only in tenant_settings — we never
mirror them into the legacy ``integration_connections`` table because that
table was designed for platform-managed shared providers, not tenant-owned
secrets.
"""

from __future__ import annotations

import json
import secrets
from datetime import UTC, datetime
from typing import Any
from urllib.parse import urlencode

import httpx
from fastapi import Header, Request
from fastapi.responses import RedirectResponse
from pydantic import BaseModel, Field

from api.v1_routes import (
    ActorContextPayload,
    AppError,
    RepositoryContext,
    Settings,
    TENANT_INTEGRATION_WRITE_ROLES,
    TenantRepository,
    ValidationAppError,
    _error_response,
    _membership_role,
    _require_tenant_membership_role,
    _resolve_tenant_request_context,
    _success_response,
    get_session,
)


_ZOHO_CALENDAR_SCOPES = "ZohoCalendar.calendar.ALL,ZohoCalendar.event.ALL"
_ZOHO_CRM_SCOPES = "ZohoCRM.modules.ALL,ZohoCRM.settings.ALL"
_ALLOWED_SERVICES = {"calendar", "crm"}
_DEFAULT_ACCOUNTS_BASE_URL = "https://accounts.zoho.com.au"
_DEFAULT_CALENDAR_API_BASE_URL = "https://calendar.zoho.com/api/v1"
_DEFAULT_CRM_API_BASE_URL = "https://www.zohoapis.com.au/crm/v8"


def _service_settings_key(service: str) -> str:
    if service == "calendar":
        return "zoho_calendar"
    if service == "crm":
        return "zoho_crm"
    raise ValueError(f"Unsupported Zoho service: {service}")


def _service_scopes(service: str) -> str:
    if service == "calendar":
        return _ZOHO_CALENDAR_SCOPES
    if service == "crm":
        return _ZOHO_CRM_SCOPES
    raise ValueError(f"Unsupported Zoho service: {service}")


def _service_default_api_base_url(service: str) -> str:
    if service == "calendar":
        return _DEFAULT_CALENDAR_API_BASE_URL
    if service == "crm":
        return _DEFAULT_CRM_API_BASE_URL
    raise ValueError(f"Unsupported Zoho service: {service}")


def _resolve_redirect_uri(settings: Settings | None) -> str:
    """Return the OAuth redirect URI that Zoho should redirect back to."""
    public_app_url = (
        str(getattr(settings, "public_app_url", "") or "").strip().rstrip("/")
        or "https://bookedai.au"
    )
    return f"{public_app_url}/api/v1/integrations/zoho/oauth/callback"


def _resolve_accounts_base_url(
    *,
    settings: Settings | None,
    integrations_block: dict[str, Any] | None,
    service: str,
) -> str:
    """Pick the Zoho accounts base URL for the OAuth flow.

    Region awareness: tenants in Australia use ``accounts.zoho.com.au``,
    tenants in the US use ``accounts.zoho.com``. The order of preference is:
        1. The per-service block's stored ``accounts_base_url`` (set during
           Mode B registration when the tenant brings their own Zoho app).
        2. ``Settings.zoho_accounts_base_url`` (platform default).
        3. ``https://accounts.zoho.com.au`` as the BookedAI-region fallback.
    """
    block: dict[str, Any] = {}
    if isinstance(integrations_block, dict):
        candidate = integrations_block.get(_service_settings_key(service))
        if isinstance(candidate, dict):
            block = candidate
    return (
        str(block.get("accounts_base_url") or "").strip()
        or str(getattr(settings, "zoho_accounts_base_url", "") or "").strip()
        or _DEFAULT_ACCOUNTS_BASE_URL
    )


def _resolve_authorize_client_id(
    *,
    settings: Settings | None,
    integrations_block: dict[str, Any] | None,
    service: str,
) -> tuple[str, str]:
    """Pick the OAuth client_id to use for the authorize URL + label its mode.

    Returns ``(client_id, mode)`` where ``mode`` is either ``"tenant_app"`` or
    ``"platform_app"``. Mode B (tenant-supplied app) wins when the tenant
    has uploaded their own client_id via ``PATCH .../client``; otherwise we
    fall back to the platform's Zoho dev app.
    """
    block: dict[str, Any] = {}
    if isinstance(integrations_block, dict):
        candidate = integrations_block.get(_service_settings_key(service))
        if isinstance(candidate, dict):
            block = candidate
    tenant_client_id = str(block.get("client_id") or "").strip()
    if tenant_client_id:
        return tenant_client_id, "tenant_app"
    if service == "crm":
        platform_client_id = str(getattr(settings, "zoho_crm_client_id", "") or "").strip()
    else:
        platform_client_id = (
            str(getattr(settings, "zoho_calendar_client_id", "") or "").strip()
            or str(getattr(settings, "zoho_crm_client_id", "") or "").strip()
        )
    return platform_client_id, "platform_app"


def _encode_state(*, tenant_id: str, service: str, nonce: str) -> str:
    """Encode the OAuth ``state`` parameter as a URL-safe JSON blob.

    Format is intentionally simple: ``base64(json({tenant_id, service, nonce}))``.
    The OAuth callback decodes it with the inverse helper, validates the
    nonce against the per-tenant pending_state slot, then drops the nonce.
    """
    import base64

    raw = json.dumps(
        {"tenant_id": tenant_id, "service": service, "nonce": nonce},
        separators=(",", ":"),
    ).encode("utf-8")
    return base64.urlsafe_b64encode(raw).decode("ascii").rstrip("=")


def _decode_state(state: str) -> dict[str, str]:
    import base64

    padded = state + "=" * (-len(state) % 4)
    raw = base64.urlsafe_b64decode(padded.encode("ascii"))
    payload = json.loads(raw.decode("utf-8"))
    if not isinstance(payload, dict):
        raise ValueError("Decoded OAuth state is not a JSON object")
    return {
        "tenant_id": str(payload.get("tenant_id") or ""),
        "service": str(payload.get("service") or ""),
        "nonce": str(payload.get("nonce") or ""),
    }


class TenantZohoClientRegistrationPayload(BaseModel):
    """Mode B: tenant uploads their own Zoho dev app client credentials."""

    client_id: str = Field(..., min_length=4)
    client_secret: str = Field(..., min_length=4)
    accounts_base_url: str | None = None
    api_base_url: str | None = None


class TenantCcEmailsUpdatePayload(BaseModel):
    cc_emails: list[str] = Field(default_factory=list)
    operator_email: str | None = None


def _serialize_integration_block(
    block: dict[str, Any] | None,
    *,
    service: str,
) -> dict[str, Any]:
    """Build a redacted summary of a tenant's per-service integration block.

    Refresh tokens + client secrets are NEVER included — the response
    surfaces only metadata + presence flags. The frontend uses these flags
    to render the "Connected ✓" badge without ever needing the secret.
    """
    data: dict[str, Any] = {
        "service": service,
        "connected": False,
        "has_refresh_token": False,
        "has_client_credentials": False,
        "client_id_last4": None,
        "accounts_base_url": _DEFAULT_ACCOUNTS_BASE_URL,
        "api_base_url": _service_default_api_base_url(service),
        "calendar_uid": None,
        "connected_at": None,
        "connected_by_user_email": None,
        "client_mode": "platform_app",
    }
    if not isinstance(block, dict):
        return data
    data["connected"] = bool(block.get("connected"))
    refresh_token = str(block.get("refresh_token") or "").strip()
    client_id = str(block.get("client_id") or "").strip()
    client_secret = str(block.get("client_secret") or "").strip()
    data["has_refresh_token"] = bool(refresh_token)
    data["has_client_credentials"] = bool(client_id and client_secret)
    if client_id:
        data["client_id_last4"] = client_id[-4:]
        data["client_mode"] = "tenant_app"
    data["accounts_base_url"] = (
        str(block.get("accounts_base_url") or "").strip() or data["accounts_base_url"]
    )
    data["api_base_url"] = (
        str(block.get("api_base_url") or "").strip() or data["api_base_url"]
    )
    data["calendar_uid"] = str(block.get("calendar_uid") or "").strip() or None
    data["connected_at"] = str(block.get("connected_at") or "").strip() or None
    data["connected_by_user_email"] = (
        str(block.get("connected_by_user_email") or "").strip() or None
    )
    return data


async def list_tenant_zoho_integrations(
    request: Request,
    authorization: str | None = Header(default=None),
):
    """``GET /api/v1/tenants/me/integrations`` — list configured providers."""
    tenant_ref, tenant_id, tenant_session, membership = await _resolve_tenant_request_context(
        request,
        authorization=authorization,
    )
    if not tenant_session or not tenant_id:
        return _error_response(
            AppError(
                code="tenant_auth_required",
                message="Sign in with an active tenant account before viewing integrations.",
                status_code=401 if not tenant_session else 404,
                details={"tenant_ref": tenant_ref, "tenant_id": tenant_id},
            ),
            tenant_id=tenant_id,
            actor_context=None,
        )

    async with get_session(request.app.state.session_factory) as session:
        tenant_repository = TenantRepository(RepositoryContext(session=session))
        settings_json = await tenant_repository.get_tenant_settings(tenant_id)

    integrations = (
        settings_json.get("integrations") if isinstance(settings_json, dict) else {}
    ) or {}
    cc_emails_raw = (
        settings_json.get("cc_emails") if isinstance(settings_json, dict) else []
    ) or []
    cc_emails = [str(item).strip() for item in cc_emails_raw if str(item).strip()]
    operator_email = str(
        (settings_json or {}).get("operator_email") or ""
    ).strip() or None

    return _success_response(
        {
            "tenant_id": tenant_id,
            "tenant_ref": tenant_ref,
            "operator_email": operator_email,
            "cc_emails": cc_emails,
            "integrations": {
                "zoho_calendar": _serialize_integration_block(
                    integrations.get("zoho_calendar")
                    if isinstance(integrations, dict)
                    else None,
                    service="calendar",
                ),
                "zoho_crm": _serialize_integration_block(
                    integrations.get("zoho_crm")
                    if isinstance(integrations, dict)
                    else None,
                    service="crm",
                ),
            },
            "redirect_uri": _resolve_redirect_uri(
                getattr(request.app.state, "settings", None)
            ),
        },
        tenant_id=tenant_id,
        actor_context=ActorContextPayload(
            channel="tenant_app",
            tenant_id=tenant_id,
            role=_membership_role(membership) if tenant_session else "tenant_preview",
            deployment_mode="standalone_app",
        ),
    )


async def get_tenant_zoho_authorize_url(
    service: str,
    request: Request,
    authorization: str | None = Header(default=None),
):
    """``GET /api/v1/tenants/me/integrations/zoho/{service}/authorize-url``."""
    normalized_service = (service or "").strip().lower()
    if normalized_service not in _ALLOWED_SERVICES:
        return _error_response(
            ValidationAppError(
                "Zoho service must be one of: calendar, crm.",
                details={"service": ["unsupported value"]},
            ),
            tenant_id=None,
            actor_context=None,
        )

    tenant_ref, tenant_id, tenant_session, membership = await _resolve_tenant_request_context(
        request,
        authorization=authorization,
    )
    if not tenant_session or not tenant_id:
        return _error_response(
            AppError(
                code="tenant_auth_required",
                message="Sign in with a tenant admin account before connecting Zoho.",
                status_code=401 if not tenant_session else 404,
                details={"tenant_ref": tenant_ref, "tenant_id": tenant_id},
            ),
            tenant_id=tenant_id,
            actor_context=None,
        )
    role_error = _require_tenant_membership_role(
        membership,
        allowed_roles=TENANT_INTEGRATION_WRITE_ROLES,
        message="Only tenant admins or operators can connect a Zoho account.",
    )
    if role_error:
        return _error_response(role_error, tenant_id=tenant_id, actor_context=None)

    settings = getattr(request.app.state, "settings", None)
    nonce = secrets.token_urlsafe(24)
    state = _encode_state(
        tenant_id=tenant_id, service=normalized_service, nonce=nonce
    )

    async with get_session(request.app.state.session_factory) as session:
        tenant_repository = TenantRepository(RepositoryContext(session=session))
        existing_settings = await tenant_repository.get_tenant_settings(tenant_id)
        existing_integrations = (
            existing_settings.get("integrations")
            if isinstance(existing_settings, dict)
            else {}
        ) or {}
        client_id, client_mode = _resolve_authorize_client_id(
            settings=settings,
            integrations_block=existing_integrations,
            service=normalized_service,
        )
        accounts_base_url = _resolve_accounts_base_url(
            settings=settings,
            integrations_block=existing_integrations,
            service=normalized_service,
        )
        if not client_id:
            return _error_response(
                AppError(
                    code="zoho_client_unconfigured",
                    message=(
                        "No Zoho OAuth client_id is configured. Set the platform "
                        "ZOHO_*_CLIENT_ID env var, or PATCH "
                        "/api/v1/tenants/me/integrations/zoho/{service}/client "
                        "with your own dev app credentials first."
                    ),
                    status_code=409,
                ),
                tenant_id=tenant_id,
                actor_context=None,
            )

        # Persist the nonce + the user_email of the operator who initiated
        # the flow so the callback can record `connected_by_user_email`
        # without re-deriving the session. We merge into the existing
        # block so we never wipe a prior `client_id`/`client_secret` from
        # a Mode B registration.
        existing_block = existing_integrations.get(
            _service_settings_key(normalized_service)
        )
        merged_block = (
            dict(existing_block) if isinstance(existing_block, dict) else {}
        )
        merged_block["pending_state"] = {
            "nonce": nonce,
            "initiated_at": datetime.now(tz=UTC).isoformat(),
            "initiated_by": str(tenant_session.get("email") or ""),
        }
        merged_integrations = dict(existing_integrations)
        merged_integrations[_service_settings_key(normalized_service)] = merged_block
        await tenant_repository.upsert_tenant_settings(
            tenant_id=tenant_id,
            settings_json={"integrations": merged_integrations},
        )
        await session.commit()

    redirect_uri = _resolve_redirect_uri(settings)
    authorize_url = (
        f"{accounts_base_url.rstrip('/')}/oauth/v2/auth?"
        + urlencode(
            {
                "scope": _service_scopes(normalized_service),
                "client_id": client_id,
                "response_type": "code",
                "access_type": "offline",
                "redirect_uri": redirect_uri,
                "state": state,
                "prompt": "consent",
            }
        )
    )

    return _success_response(
        {
            "service": normalized_service,
            "authorize_url": authorize_url,
            "redirect_uri": redirect_uri,
            "state": state,
            "client_mode": client_mode,
            "scope_note": _service_scopes(normalized_service),
            "accounts_base_url": accounts_base_url,
        },
        tenant_id=tenant_id,
        actor_context=ActorContextPayload(
            channel="tenant_app",
            tenant_id=tenant_id,
            role=_membership_role(membership),
            deployment_mode="standalone_app",
        ),
    )


async def disconnect_tenant_zoho(
    service: str,
    request: Request,
    authorization: str | None = Header(default=None),
):
    """``DELETE /api/v1/tenants/me/integrations/zoho/{service}``."""
    normalized_service = (service or "").strip().lower()
    if normalized_service not in _ALLOWED_SERVICES:
        return _error_response(
            ValidationAppError(
                "Zoho service must be one of: calendar, crm.",
                details={"service": ["unsupported value"]},
            ),
            tenant_id=None,
            actor_context=None,
        )

    tenant_ref, tenant_id, tenant_session, membership = await _resolve_tenant_request_context(
        request,
        authorization=authorization,
    )
    if not tenant_session or not tenant_id:
        return _error_response(
            AppError(
                code="tenant_auth_required",
                message="Sign in with a tenant admin account before disconnecting Zoho.",
                status_code=401 if not tenant_session else 404,
                details={"tenant_ref": tenant_ref, "tenant_id": tenant_id},
            ),
            tenant_id=tenant_id,
            actor_context=None,
        )
    role_error = _require_tenant_membership_role(
        membership,
        allowed_roles=TENANT_INTEGRATION_WRITE_ROLES,
        message="Only tenant admins or operators can disconnect a Zoho account.",
    )
    if role_error:
        return _error_response(role_error, tenant_id=tenant_id, actor_context=None)

    async with get_session(request.app.state.session_factory) as session:
        tenant_repository = TenantRepository(RepositoryContext(session=session))
        existing_settings = await tenant_repository.get_tenant_settings(tenant_id)
        existing_integrations = (
            existing_settings.get("integrations")
            if isinstance(existing_settings, dict)
            else {}
        ) or {}
        # Reset the per-service block to a "disconnected" placeholder while
        # preserving any tenant-supplied client_id/client_secret (Mode B) so
        # the next reconnect re-uses them without re-uploading.
        existing_block = existing_integrations.get(
            _service_settings_key(normalized_service)
        )
        if isinstance(existing_block, dict):
            preserved_client_id = str(existing_block.get("client_id") or "").strip()
            preserved_client_secret = str(existing_block.get("client_secret") or "").strip()
            preserved_accounts = str(existing_block.get("accounts_base_url") or "").strip()
            preserved_api_base = str(existing_block.get("api_base_url") or "").strip()
        else:
            preserved_client_id = ""
            preserved_client_secret = ""
            preserved_accounts = ""
            preserved_api_base = ""
        new_block: dict[str, Any] = {
            "connected": False,
            "refresh_token": "",
            "calendar_uid": None,
            "disconnected_at": datetime.now(tz=UTC).isoformat(),
            "disconnected_by_user_email": str(tenant_session.get("email") or ""),
        }
        if preserved_client_id:
            new_block["client_id"] = preserved_client_id
        if preserved_client_secret:
            new_block["client_secret"] = preserved_client_secret
        if preserved_accounts:
            new_block["accounts_base_url"] = preserved_accounts
        if preserved_api_base:
            new_block["api_base_url"] = preserved_api_base

        merged_integrations = dict(existing_integrations)
        merged_integrations[_service_settings_key(normalized_service)] = new_block
        await tenant_repository.upsert_tenant_settings(
            tenant_id=tenant_id,
            settings_json={"integrations": merged_integrations},
        )
        await session.commit()

    return _success_response(
        {
            "service": normalized_service,
            "status": "disconnected",
        },
        tenant_id=tenant_id,
        actor_context=ActorContextPayload(
            channel="tenant_app",
            tenant_id=tenant_id,
            role=_membership_role(membership),
            deployment_mode="standalone_app",
        ),
    )


async def test_tenant_zoho_connection(
    service: str,
    request: Request,
    authorization: str | None = Header(default=None),
):
    """``POST /api/v1/tenants/me/integrations/zoho/{service}/test``."""
    normalized_service = (service or "").strip().lower()
    if normalized_service not in _ALLOWED_SERVICES:
        return _error_response(
            ValidationAppError(
                "Zoho service must be one of: calendar, crm.",
                details={"service": ["unsupported value"]},
            ),
            tenant_id=None,
            actor_context=None,
        )

    tenant_ref, tenant_id, tenant_session, membership = await _resolve_tenant_request_context(
        request,
        authorization=authorization,
    )
    if not tenant_session or not tenant_id:
        return _error_response(
            AppError(
                code="tenant_auth_required",
                message="Sign in with a tenant admin account before testing Zoho.",
                status_code=401 if not tenant_session else 404,
                details={"tenant_ref": tenant_ref, "tenant_id": tenant_id},
            ),
            tenant_id=tenant_id,
            actor_context=None,
        )

    settings = getattr(request.app.state, "settings", None)
    from service_layer.zoho_tenant_credentials import (
        resolve_tenant_zoho_calendar_credentials,
        resolve_tenant_zoho_crm_credentials,
    )

    async with get_session(request.app.state.session_factory) as session:
        if normalized_service == "calendar":
            credentials = await resolve_tenant_zoho_calendar_credentials(
                session, tenant_id=tenant_id, settings=settings
            )
        else:
            credentials = await resolve_tenant_zoho_crm_credentials(
                session, tenant_id=tenant_id, settings=settings
            )

    if credentials is None:
        return _error_response(
            AppError(
                code="zoho_not_configured",
                message=(
                    "Zoho is not configured for this tenant. Connect via the "
                    "authorize URL first."
                ),
                status_code=409,
            ),
            tenant_id=tenant_id,
            actor_context=None,
        )

    diagnostic: dict[str, Any] = {
        "service": normalized_service,
        "credential_source": getattr(credentials, "source", "unknown"),
        "accounts_base_url": getattr(credentials, "accounts_base_url", ""),
        "api_base_url": getattr(credentials, "api_base_url", ""),
    }

    # Run a token exchange as the lightest-weight liveness probe. We
    # deliberately do NOT call any module/calendar endpoint here — a fresh
    # access_token is enough to prove the refresh_token is still valid; an
    # actual API call (list calendars, list modules) would require region-
    # specific endpoints that may differ between Mode A and Mode B tenants.
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            response = await client.post(
                f"{credentials.accounts_base_url.rstrip('/')}/oauth/v2/token",
                data={
                    "refresh_token": credentials.refresh_token,
                    "client_id": credentials.client_id,
                    "client_secret": credentials.client_secret,
                    "grant_type": "refresh_token",
                },
            )
        diagnostic["token_status_code"] = response.status_code
        if response.status_code == 200:
            payload = response.json() or {}
            access_token = str(payload.get("access_token") or "").strip()
            diagnostic["status"] = "ok" if access_token else "no_access_token"
            diagnostic["api_domain"] = (
                str(payload.get("api_domain") or "").strip() or None
            )
            diagnostic["scope"] = str(payload.get("scope") or "").strip() or None
        else:
            diagnostic["status"] = "token_exchange_failed"
            diagnostic["error_excerpt"] = response.text[:240]
    except httpx.HTTPError as error:
        diagnostic["status"] = "transport_error"
        diagnostic["error_message"] = str(error)

    return _success_response(
        diagnostic,
        tenant_id=tenant_id,
        actor_context=ActorContextPayload(
            channel="tenant_app",
            tenant_id=tenant_id,
            role=_membership_role(membership),
            deployment_mode="standalone_app",
        ),
    )


async def register_tenant_zoho_client(
    service: str,
    request: Request,
    payload: TenantZohoClientRegistrationPayload,
    authorization: str | None = Header(default=None),
):
    """``PATCH /api/v1/tenants/me/integrations/zoho/{service}/client`` — Mode B."""
    normalized_service = (service or "").strip().lower()
    if normalized_service not in _ALLOWED_SERVICES:
        return _error_response(
            ValidationAppError(
                "Zoho service must be one of: calendar, crm.",
                details={"service": ["unsupported value"]},
            ),
            tenant_id=None,
            actor_context=None,
        )
    tenant_ref, tenant_id, tenant_session, membership = await _resolve_tenant_request_context(
        request,
        authorization=authorization,
    )
    if not tenant_session or not tenant_id:
        return _error_response(
            AppError(
                code="tenant_auth_required",
                message="Sign in with a tenant admin account before registering a Zoho app.",
                status_code=401 if not tenant_session else 404,
                details={"tenant_ref": tenant_ref, "tenant_id": tenant_id},
            ),
            tenant_id=tenant_id,
            actor_context=None,
        )
    role_error = _require_tenant_membership_role(
        membership,
        allowed_roles=TENANT_INTEGRATION_WRITE_ROLES,
        message="Only tenant admins or operators can register a Zoho dev app.",
    )
    if role_error:
        return _error_response(role_error, tenant_id=tenant_id, actor_context=None)

    async with get_session(request.app.state.session_factory) as session:
        tenant_repository = TenantRepository(RepositoryContext(session=session))
        existing_settings = await tenant_repository.get_tenant_settings(tenant_id)
        existing_integrations = (
            existing_settings.get("integrations")
            if isinstance(existing_settings, dict)
            else {}
        ) or {}
        existing_block = existing_integrations.get(
            _service_settings_key(normalized_service)
        )
        merged_block = dict(existing_block) if isinstance(existing_block, dict) else {}
        merged_block["client_id"] = payload.client_id.strip()
        merged_block["client_secret"] = payload.client_secret.strip()
        if payload.accounts_base_url:
            merged_block["accounts_base_url"] = payload.accounts_base_url.strip()
        if payload.api_base_url:
            merged_block["api_base_url"] = payload.api_base_url.strip()
        merged_integrations = dict(existing_integrations)
        merged_integrations[_service_settings_key(normalized_service)] = merged_block
        await tenant_repository.upsert_tenant_settings(
            tenant_id=tenant_id,
            settings_json={"integrations": merged_integrations},
        )
        await session.commit()

    return _success_response(
        {
            "service": normalized_service,
            "client_mode": "tenant_app",
            "client_id_last4": payload.client_id.strip()[-4:],
            "next_step": "GET /api/v1/tenants/me/integrations/zoho/{service}/authorize-url",
        },
        tenant_id=tenant_id,
        actor_context=ActorContextPayload(
            channel="tenant_app",
            tenant_id=tenant_id,
            role=_membership_role(membership),
            deployment_mode="standalone_app",
        ),
    )


async def update_tenant_cc_emails(
    request: Request,
    payload: TenantCcEmailsUpdatePayload,
    authorization: str | None = Header(default=None),
):
    """``PATCH /api/v1/tenants/me/cc-emails`` — set the auto-CC list."""
    tenant_ref, tenant_id, tenant_session, membership = await _resolve_tenant_request_context(
        request,
        authorization=authorization,
    )
    if not tenant_session or not tenant_id:
        return _error_response(
            AppError(
                code="tenant_auth_required",
                message="Sign in with a tenant admin account before updating CC emails.",
                status_code=401 if not tenant_session else 404,
                details={"tenant_ref": tenant_ref, "tenant_id": tenant_id},
            ),
            tenant_id=tenant_id,
            actor_context=None,
        )
    role_error = _require_tenant_membership_role(
        membership,
        allowed_roles=TENANT_INTEGRATION_WRITE_ROLES,
        message="Only tenant admins or operators can update the CC list.",
    )
    if role_error:
        return _error_response(role_error, tenant_id=tenant_id, actor_context=None)

    normalized_cc = []
    seen: set[str] = set()
    for raw in payload.cc_emails or []:
        normalized = str(raw or "").strip().lower()
        if not normalized or "@" not in normalized:
            continue
        if normalized in seen:
            continue
        seen.add(normalized)
        normalized_cc.append(normalized)

    settings_json: dict[str, Any] = {"cc_emails": normalized_cc}
    if payload.operator_email is not None:
        normalized_operator = payload.operator_email.strip().lower()
        if normalized_operator and "@" in normalized_operator:
            settings_json["operator_email"] = normalized_operator

    async with get_session(request.app.state.session_factory) as session:
        tenant_repository = TenantRepository(RepositoryContext(session=session))
        await tenant_repository.upsert_tenant_settings(
            tenant_id=tenant_id,
            settings_json=settings_json,
        )
        await session.commit()

    return _success_response(
        {
            "tenant_id": tenant_id,
            "cc_emails": normalized_cc,
            "operator_email": settings_json.get("operator_email"),
        },
        tenant_id=tenant_id,
        actor_context=ActorContextPayload(
            channel="tenant_app",
            tenant_id=tenant_id,
            role=_membership_role(membership),
            deployment_mode="standalone_app",
        ),
    )


# ---------------------------------------------------------------------------
# OAuth callback (public — no tenant session, validated via state nonce).
# ---------------------------------------------------------------------------


async def zoho_oauth_callback(
    request: Request,
    code: str | None = None,
    state: str | None = None,
    error: str | None = None,
):
    """``GET /api/v1/integrations/zoho/oauth/callback`` — Zoho redirects here.

    Public endpoint: the security model is "the ``state`` parameter encodes
    the tenant_id + nonce we issued from the authorize-url endpoint, and the
    nonce must match the value persisted under
    ``tenant_settings.integrations.{service}.pending_state.nonce`` for that
    tenant". Mismatch → 400 + nothing persisted.
    """
    settings = getattr(request.app.state, "settings", None)
    public_app_url = (
        str(getattr(settings, "public_app_url", "") or "").strip().rstrip("/")
        or "https://bookedai.au"
    )
    failure_redirect = (
        f"{public_app_url}/tenant/integrations?status=error&reason="
    )

    if error:
        return RedirectResponse(
            url=f"{failure_redirect}{error}",
            status_code=302,
        )
    if not code or not state:
        return RedirectResponse(
            url=f"{failure_redirect}missing_code_or_state",
            status_code=302,
        )

    try:
        decoded = _decode_state(state)
    except Exception:  # noqa: BLE001
        return RedirectResponse(
            url=f"{failure_redirect}invalid_state",
            status_code=302,
        )

    tenant_id = decoded.get("tenant_id") or ""
    service = decoded.get("service") or ""
    nonce = decoded.get("nonce") or ""
    if not tenant_id or service not in _ALLOWED_SERVICES or not nonce:
        return RedirectResponse(
            url=f"{failure_redirect}invalid_state_payload",
            status_code=302,
        )

    async with get_session(request.app.state.session_factory) as session:
        tenant_repository = TenantRepository(RepositoryContext(session=session))
        existing_settings = await tenant_repository.get_tenant_settings(tenant_id)
        existing_integrations = (
            existing_settings.get("integrations")
            if isinstance(existing_settings, dict)
            else {}
        ) or {}
        existing_block = existing_integrations.get(_service_settings_key(service))
        if not isinstance(existing_block, dict):
            return RedirectResponse(
                url=f"{failure_redirect}no_pending_state",
                status_code=302,
            )
        pending_state = existing_block.get("pending_state")
        stored_nonce = (
            str(pending_state.get("nonce")) if isinstance(pending_state, dict) else ""
        )
        if not stored_nonce or stored_nonce != nonce:
            return RedirectResponse(
                url=f"{failure_redirect}nonce_mismatch",
                status_code=302,
            )

        # Decide which client_id/client_secret we send to /oauth/v2/token.
        # If the tenant brought their own dev app (Mode B), the block
        # already carries client_id+client_secret and we use those. Else
        # use the platform creds (Mode A). The accounts_base_url falls
        # back to platform default, then to .com.au.
        if existing_block.get("client_id") and existing_block.get("client_secret"):
            client_id = str(existing_block.get("client_id"))
            client_secret = str(existing_block.get("client_secret"))
            client_mode = "tenant_app"
        else:
            if service == "crm":
                client_id = str(getattr(settings, "zoho_crm_client_id", "") or "")
                client_secret = str(getattr(settings, "zoho_crm_client_secret", "") or "")
            else:
                client_id = (
                    str(getattr(settings, "zoho_calendar_client_id", "") or "")
                    or str(getattr(settings, "zoho_crm_client_id", "") or "")
                )
                client_secret = (
                    str(getattr(settings, "zoho_calendar_client_secret", "") or "")
                    or str(getattr(settings, "zoho_crm_client_secret", "") or "")
                )
            client_mode = "platform_app"
        accounts_base_url = (
            str(existing_block.get("accounts_base_url") or "").strip()
            or str(getattr(settings, "zoho_accounts_base_url", "") or "").strip()
            or _DEFAULT_ACCOUNTS_BASE_URL
        )
        redirect_uri = _resolve_redirect_uri(settings)

        try:
            async with httpx.AsyncClient(timeout=20) as client:
                token_response = await client.post(
                    f"{accounts_base_url.rstrip('/')}/oauth/v2/token",
                    data={
                        "grant_type": "authorization_code",
                        "client_id": client_id,
                        "client_secret": client_secret,
                        "redirect_uri": redirect_uri,
                        "code": code,
                    },
                )
            if token_response.status_code != 200:
                return RedirectResponse(
                    url=f"{failure_redirect}token_exchange_failed",
                    status_code=302,
                )
            token_payload = token_response.json() or {}
        except httpx.HTTPError:
            return RedirectResponse(
                url=f"{failure_redirect}transport_error",
                status_code=302,
            )

        refresh_token = str(token_payload.get("refresh_token") or "").strip()
        if not refresh_token:
            return RedirectResponse(
                url=f"{failure_redirect}no_refresh_token",
                status_code=302,
            )
        api_domain = str(token_payload.get("api_domain") or "").strip()
        api_base_url = str(existing_block.get("api_base_url") or "").strip()
        if not api_base_url and api_domain:
            api_base_url = (
                f"{api_domain.rstrip('/')}/crm/v8"
                if service == "crm"
                else f"{api_domain.rstrip('/')}/api/v1"
            )
        if not api_base_url:
            api_base_url = _service_default_api_base_url(service)

        connected_block: dict[str, Any] = {
            "connected": True,
            "refresh_token": refresh_token,
            "client_id": client_id,
            "client_secret": client_secret,
            "accounts_base_url": accounts_base_url,
            "api_base_url": api_base_url,
            "connected_at": datetime.now(tz=UTC).isoformat(),
            "connected_by_user_email": (
                str(pending_state.get("initiated_by") or "")
                if isinstance(pending_state, dict)
                else ""
            ),
            "client_mode": client_mode,
        }
        # Preserve any pre-existing calendar_uid (so a Mode B tenant who
        # registered a tenant_settings.integrations.zoho_calendar.calendar_uid
        # alongside their client credentials does not lose it on reconnect).
        existing_calendar_uid = str(existing_block.get("calendar_uid") or "").strip()
        if existing_calendar_uid:
            connected_block["calendar_uid"] = existing_calendar_uid

        merged_integrations = dict(existing_integrations)
        merged_integrations[_service_settings_key(service)] = connected_block
        await tenant_repository.upsert_tenant_settings(
            tenant_id=tenant_id,
            settings_json={"integrations": merged_integrations},
        )
        await session.commit()

    return RedirectResponse(
        url=f"{public_app_url}/tenant/integrations?status=connected&service={service}",
        status_code=302,
    )
