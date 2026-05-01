"""Tenant-side handlers for the Phase 4 §1 monthly reminder care list.

Endpoints
---------

* ``GET /api/v1/tenants/me/care-list`` — list opted-in contacts.
* ``POST /api/v1/tenants/me/care-list`` — opt a contact in.
* ``DELETE /api/v1/tenants/me/care-list/{contact_id}`` — opt a contact out.
* ``GET /api/v1/tenants/me/monthly-reminder/config`` — read tenant config.
* ``PUT /api/v1/tenants/me/monthly-reminder/config`` — update tenant config.
* ``POST /api/v1/tenants/me/monthly-reminder/dispatch`` — operator-triggered
  send (live or dry-run).

Care-list membership is stored on
``contacts.metadata_json->>'care_list_member' = 'true'`` (reusing the
existing column from migration 052). The dispatch enabled flag lives on
``tenant_settings.settings_json.monthly_reminder.enabled``.

All endpoints require a tenant-admin session. They scope every query to
the caller's resolved ``tenant_id`` so cross-tenant contact_id lookups
return 404 instead of leaking data.
"""

from __future__ import annotations

import json
from datetime import UTC, datetime
from typing import Any, Literal

from fastapi import Header, Request
from pydantic import BaseModel, Field
from sqlalchemy import text

from core.errors import AppError, ValidationAppError
from core.logging import get_logger
from db import get_session
from repositories import OutboxRepository
from repositories.base import RepositoryContext
from service_layer.email_service import EmailService
from service_layer.monthly_reminder_service import (
    MonthlyReminderSummary,
    run_monthly_reminder_dispatch,
)

from api.v1_routes import (
    ActorContextPayload,
    _error_response,
    _resolve_tenant_request_context,
    _success_response,
)


_logger = get_logger("bookedai.api.v1_tenant_care_list_handlers")


_NESTED_KEY = "monthly_reminder"
_NESTED_LAST_RUN_KEY = "last_run_at"
_NESTED_ENABLED_KEY = "enabled"
_LEGACY_LAST_RUN_KEY = "monthly_reminder_last_run_at"


# ---------------------------------------------------------------------------
# Pydantic payloads
# ---------------------------------------------------------------------------


class CareListAddPayload(BaseModel):
    contact_id: str = Field(..., description="Tenant-owned contact UUID.")


class MonthlyReminderConfigPayload(BaseModel):
    enabled: bool = Field(..., description="Master switch for monthly reminders.")


class MonthlyReminderDispatchPayload(BaseModel):
    month: str | None = Field(default=None, description="YYYY-MM override.")
    dry_run: bool = Field(default=False)
    force: bool = Field(default=False, description="Bypass enabled + idempotency.")
    care_list_only: bool = Field(
        default=True,
        description="Filter audience to opted-in contacts (default: True).",
    )


# ---------------------------------------------------------------------------
# Auth + error helpers (mirrors v1_tenant_broadcast_handlers)
# ---------------------------------------------------------------------------


def _tenant_session_required_error(*, tenant_id: str | None, tenant_ref: str | None) -> AppError:
    return AppError(
        code="tenant_auth_required",
        message="Sign in with an active tenant account to manage the monthly reminder care list.",
        status_code=401,
        details={"tenant_ref": tenant_ref, "tenant_id": tenant_id},
    )


def _tenant_not_found_error(*, tenant_ref: str | None) -> AppError:
    return AppError(
        code="tenant_not_found",
        message="The requested tenant could not be resolved.",
        status_code=404,
        details={"tenant_ref": tenant_ref},
    )


def _actor_context(tenant_id: str) -> ActorContextPayload:
    return ActorContextPayload(
        channel="tenant_app",
        tenant_id=tenant_id,
        role="tenant_admin",
        deployment_mode="standalone_app",
    )


# ---------------------------------------------------------------------------
# Care-list DB helpers
# ---------------------------------------------------------------------------


async def _list_care_list_members(session, *, tenant_id: str) -> list[dict[str, Any]]:
    result = await session.execute(
        text(
            """
            select
              c.id::text as contact_id,
              c.full_name,
              c.email,
              c.phone,
              coalesce(c.metadata_json ->> 'region', '') as region,
              coalesce(c.metadata_json ->> 'care_list_added_at', '') as added_at
            from contacts c
            where c.tenant_id = cast(:tenant_id as uuid)
              and (c.metadata_json ->> 'care_list_member') = 'true'
            order by lower(coalesce(c.full_name, c.email, '')) asc, c.id asc
            """
        ),
        {"tenant_id": tenant_id},
    )
    rows: list[dict[str, Any]] = []
    for row in result.mappings().all():
        rows.append(
            {
                "contact_id": str(row.get("contact_id") or ""),
                "full_name": (row.get("full_name") or "") or None,
                "email": (row.get("email") or "") or None,
                "phone": (row.get("phone") or "") or None,
                "region": (row.get("region") or "") or None,
                "added_at": (row.get("added_at") or "") or None,
            }
        )
    return rows


async def _fetch_contact_membership(
    session,
    *,
    tenant_id: str,
    contact_id: str,
) -> dict[str, Any] | None:
    result = await session.execute(
        text(
            """
            select
              c.id::text as contact_id,
              c.full_name,
              c.email,
              c.phone,
              coalesce(c.metadata_json ->> 'region', '') as region,
              coalesce(c.metadata_json ->> 'care_list_member', '') as care_list_member,
              coalesce(c.metadata_json ->> 'care_list_added_at', '') as added_at
            from contacts c
            where c.tenant_id = cast(:tenant_id as uuid)
              and c.id = cast(:contact_id as uuid)
            limit 1
            """
        ),
        {"tenant_id": tenant_id, "contact_id": contact_id},
    )
    row = result.mappings().first()
    return dict(row) if row else None


async def _upsert_care_list_member(
    session,
    *,
    tenant_id: str,
    contact_id: str,
    added_at_iso: str,
) -> None:
    await session.execute(
        text(
            """
            update contacts
            set metadata_json = coalesce(metadata_json, '{}'::jsonb)
                                || jsonb_build_object(
                                    'care_list_member', 'true',
                                    'care_list_added_at', :added_at
                                ),
                updated_at = now()
            where id = cast(:contact_id as uuid)
              and tenant_id = cast(:tenant_id as uuid)
            """
        ),
        {
            "tenant_id": tenant_id,
            "contact_id": contact_id,
            "added_at": added_at_iso,
        },
    )


async def _remove_care_list_member(
    session,
    *,
    tenant_id: str,
    contact_id: str,
) -> None:
    await session.execute(
        text(
            """
            update contacts
            set metadata_json = coalesce(metadata_json, '{}'::jsonb)
                                  - 'care_list_member'
                                  - 'care_list_added_at',
                updated_at = now()
            where id = cast(:contact_id as uuid)
              and tenant_id = cast(:tenant_id as uuid)
            """
        ),
        {"tenant_id": tenant_id, "contact_id": contact_id},
    )


# ---------------------------------------------------------------------------
# Tenant config DB helpers
# ---------------------------------------------------------------------------


async def _load_tenant_settings_json(session, *, tenant_id: str) -> dict[str, Any]:
    result = await session.execute(
        text(
            """
            select settings_json
            from tenant_settings
            where tenant_id = cast(:tenant_id as uuid)
            limit 1
            """
        ),
        {"tenant_id": tenant_id},
    )
    row = result.mappings().first()
    if not row:
        return {}
    settings = row.get("settings_json")
    return dict(settings) if isinstance(settings, dict) else {}


async def _count_care_list(session, *, tenant_id: str) -> int:
    result = await session.execute(
        text(
            """
            select count(*) as care_list_size
            from contacts c
            where c.tenant_id = cast(:tenant_id as uuid)
              and (c.metadata_json ->> 'care_list_member') = 'true'
            """
        ),
        {"tenant_id": tenant_id},
    )
    row = result.mappings().first()
    if not row:
        return 0
    try:
        return int(row.get("care_list_size") or 0)
    except (TypeError, ValueError):
        return 0


def _read_last_run_iso(settings_json: dict[str, Any]) -> str | None:
    nested = settings_json.get(_NESTED_KEY) if isinstance(settings_json, dict) else None
    if isinstance(nested, dict):
        raw = nested.get(_NESTED_LAST_RUN_KEY)
        if raw:
            return str(raw)
    legacy = settings_json.get(_LEGACY_LAST_RUN_KEY) if isinstance(settings_json, dict) else None
    return str(legacy) if legacy else None


def _read_enabled_flag(settings_json: dict[str, Any]) -> bool:
    nested = settings_json.get(_NESTED_KEY) if isinstance(settings_json, dict) else None
    if isinstance(nested, dict):
        return nested.get(_NESTED_ENABLED_KEY) is True
    return False


async def _persist_enabled_flag(
    session,
    *,
    tenant_id: str,
    enabled: bool,
) -> None:
    """Deep-merge the new ``enabled`` flag into the nested key.

    We use ``insert ... on conflict`` so the tenant_settings row is
    created if missing (some chess test fixtures have no row at all).
    """

    payload = {_NESTED_KEY: {_NESTED_ENABLED_KEY: enabled}}
    await session.execute(
        text(
            """
            insert into tenant_settings (tenant_id, settings_json)
            values (cast(:tenant_id as uuid), cast(:initial as jsonb))
            on conflict (tenant_id) do update
            set settings_json = coalesce(tenant_settings.settings_json, '{}'::jsonb)
                                || jsonb_build_object(
                                    :nested_key,
                                    coalesce(
                                        tenant_settings.settings_json -> :nested_key,
                                        '{}'::jsonb
                                    ) || cast(:nested_payload as jsonb)
                                ),
                version = tenant_settings.version + 1,
                updated_at = now()
            """
        ),
        {
            "tenant_id": tenant_id,
            "initial": json.dumps(payload),
            "nested_key": _NESTED_KEY,
            "nested_payload": json.dumps({_NESTED_ENABLED_KEY: enabled}),
        },
    )


# ---------------------------------------------------------------------------
# Endpoint: list / add / remove care-list members
# ---------------------------------------------------------------------------


async def tenant_care_list_get(
    request: Request,
    authorization: str | None = Header(default=None),
):
    tenant_ref, tenant_id, tenant_session, _membership = await _resolve_tenant_request_context(
        request,
        authorization=authorization,
    )
    if not tenant_session:
        return _error_response(
            _tenant_session_required_error(tenant_id=tenant_id, tenant_ref=tenant_ref),
            tenant_id=tenant_id,
            actor_context=None,
        )
    if not tenant_id:
        return _error_response(
            _tenant_not_found_error(tenant_ref=tenant_ref),
            tenant_id=None,
            actor_context=None,
        )

    try:
        async with get_session(request.app.state.session_factory) as session:
            members = await _list_care_list_members(session, tenant_id=tenant_id)
        return _success_response(
            {"members": members, "total": len(members)},
            tenant_id=tenant_id,
            actor_context=_actor_context(tenant_id),
        )
    except AppError as error:
        return _error_response(error, tenant_id=tenant_id, actor_context=None)


async def tenant_care_list_add(
    request: Request,
    payload: CareListAddPayload,
    authorization: str | None = Header(default=None),
):
    tenant_ref, tenant_id, tenant_session, _membership = await _resolve_tenant_request_context(
        request,
        authorization=authorization,
    )
    if not tenant_session:
        return _error_response(
            _tenant_session_required_error(tenant_id=tenant_id, tenant_ref=tenant_ref),
            tenant_id=tenant_id,
            actor_context=None,
        )
    if not tenant_id:
        return _error_response(
            _tenant_not_found_error(tenant_ref=tenant_ref),
            tenant_id=None,
            actor_context=None,
        )

    contact_id = (payload.contact_id or "").strip()
    if not contact_id:
        return _error_response(
            ValidationAppError(
                "contact_id is required.",
                details={"contact_id": ["required"]},
            ),
            tenant_id=tenant_id,
            actor_context=None,
        )

    try:
        async with get_session(request.app.state.session_factory) as session:
            existing = await _fetch_contact_membership(
                session,
                tenant_id=tenant_id,
                contact_id=contact_id,
            )
            if not existing:
                raise AppError(
                    code="contact_not_found",
                    message="No contact found in this tenant for the supplied contact_id.",
                    status_code=404,
                    details={"contact_id": contact_id},
                )
            if str(existing.get("care_list_member") or "").strip().lower() == "true":
                raise AppError(
                    code="care_list_member_exists",
                    message="That contact is already in the care list.",
                    status_code=409,
                    details={"contact_id": contact_id},
                )
            now_iso = datetime.now(UTC).strftime("%Y-%m-%dT%H:%M:%SZ")
            await _upsert_care_list_member(
                session,
                tenant_id=tenant_id,
                contact_id=contact_id,
                added_at_iso=now_iso,
            )
            outbox_repo = OutboxRepository(
                RepositoryContext(session=session, tenant_id=tenant_id)
            )
            await outbox_repo.enqueue_event(
                event_type="tenant.care_list.member_added",
                aggregate_type="care_list",
                aggregate_id=contact_id,
                payload={
                    "contact_id": contact_id,
                    "added_at": now_iso,
                    "actor_email": str(tenant_session.get("email") or "").strip() or None,
                },
                status="processed",
                tenant_id=tenant_id,
            )
            await session.commit()
        member = {
            "contact_id": contact_id,
            "full_name": (existing.get("full_name") or None),
            "email": (existing.get("email") or None),
            "phone": (existing.get("phone") or None),
            "region": (existing.get("region") or None),
            "added_at": now_iso,
        }
        return _success_response(
            {"member": member},
            tenant_id=tenant_id,
            actor_context=_actor_context(tenant_id),
        )
    except AppError as error:
        return _error_response(error, tenant_id=tenant_id, actor_context=None)


async def tenant_care_list_remove(
    request: Request,
    contact_id: str,
    authorization: str | None = Header(default=None),
):
    tenant_ref, tenant_id, tenant_session, _membership = await _resolve_tenant_request_context(
        request,
        authorization=authorization,
    )
    if not tenant_session:
        return _error_response(
            _tenant_session_required_error(tenant_id=tenant_id, tenant_ref=tenant_ref),
            tenant_id=tenant_id,
            actor_context=None,
        )
    if not tenant_id:
        return _error_response(
            _tenant_not_found_error(tenant_ref=tenant_ref),
            tenant_id=None,
            actor_context=None,
        )

    contact_id_clean = (contact_id or "").strip()
    if not contact_id_clean:
        return _error_response(
            ValidationAppError(
                "contact_id is required.",
                details={"contact_id": ["required"]},
            ),
            tenant_id=tenant_id,
            actor_context=None,
        )

    try:
        async with get_session(request.app.state.session_factory) as session:
            existing = await _fetch_contact_membership(
                session,
                tenant_id=tenant_id,
                contact_id=contact_id_clean,
            )
            if not existing or str(existing.get("care_list_member") or "").strip().lower() != "true":
                raise AppError(
                    code="care_list_member_not_found",
                    message="That contact is not currently in the care list.",
                    status_code=404,
                    details={"contact_id": contact_id_clean},
                )
            await _remove_care_list_member(
                session,
                tenant_id=tenant_id,
                contact_id=contact_id_clean,
            )
            outbox_repo = OutboxRepository(
                RepositoryContext(session=session, tenant_id=tenant_id)
            )
            await outbox_repo.enqueue_event(
                event_type="tenant.care_list.member_removed",
                aggregate_type="care_list",
                aggregate_id=contact_id_clean,
                payload={
                    "contact_id": contact_id_clean,
                    "actor_email": str(tenant_session.get("email") or "").strip() or None,
                },
                status="processed",
                tenant_id=tenant_id,
            )
            await session.commit()
        return _success_response(
            {"contact_id": contact_id_clean, "removed": True},
            tenant_id=tenant_id,
            actor_context=_actor_context(tenant_id),
        )
    except AppError as error:
        return _error_response(error, tenant_id=tenant_id, actor_context=None)


# ---------------------------------------------------------------------------
# Endpoint: monthly reminder config
# ---------------------------------------------------------------------------


async def tenant_monthly_reminder_config_get(
    request: Request,
    authorization: str | None = Header(default=None),
):
    tenant_ref, tenant_id, tenant_session, _membership = await _resolve_tenant_request_context(
        request,
        authorization=authorization,
    )
    if not tenant_session:
        return _error_response(
            _tenant_session_required_error(tenant_id=tenant_id, tenant_ref=tenant_ref),
            tenant_id=tenant_id,
            actor_context=None,
        )
    if not tenant_id:
        return _error_response(
            _tenant_not_found_error(tenant_ref=tenant_ref),
            tenant_id=None,
            actor_context=None,
        )

    try:
        async with get_session(request.app.state.session_factory) as session:
            settings_json = await _load_tenant_settings_json(session, tenant_id=tenant_id)
            care_list_size = await _count_care_list(session, tenant_id=tenant_id)

        return _success_response(
            {
                "enabled": _read_enabled_flag(settings_json),
                "last_run_at": _read_last_run_iso(settings_json),
                "care_list_size": care_list_size,
            },
            tenant_id=tenant_id,
            actor_context=_actor_context(tenant_id),
        )
    except AppError as error:
        return _error_response(error, tenant_id=tenant_id, actor_context=None)


async def tenant_monthly_reminder_config_put(
    request: Request,
    payload: MonthlyReminderConfigPayload,
    authorization: str | None = Header(default=None),
):
    tenant_ref, tenant_id, tenant_session, _membership = await _resolve_tenant_request_context(
        request,
        authorization=authorization,
    )
    if not tenant_session:
        return _error_response(
            _tenant_session_required_error(tenant_id=tenant_id, tenant_ref=tenant_ref),
            tenant_id=tenant_id,
            actor_context=None,
        )
    if not tenant_id:
        return _error_response(
            _tenant_not_found_error(tenant_ref=tenant_ref),
            tenant_id=None,
            actor_context=None,
        )

    try:
        async with get_session(request.app.state.session_factory) as session:
            await _persist_enabled_flag(
                session,
                tenant_id=tenant_id,
                enabled=bool(payload.enabled),
            )
            outbox_repo = OutboxRepository(
                RepositoryContext(session=session, tenant_id=tenant_id)
            )
            await outbox_repo.enqueue_event(
                event_type="tenant.monthly_reminder.config_updated",
                aggregate_type="monthly_reminder_config",
                aggregate_id=tenant_id,
                payload={
                    "enabled": bool(payload.enabled),
                    "actor_email": str(tenant_session.get("email") or "").strip() or None,
                },
                status="processed",
                tenant_id=tenant_id,
            )
            await session.commit()

            # Re-read so the response reflects what's actually persisted.
            settings_json = await _load_tenant_settings_json(session, tenant_id=tenant_id)
            care_list_size = await _count_care_list(session, tenant_id=tenant_id)

        return _success_response(
            {
                "enabled": _read_enabled_flag(settings_json),
                "last_run_at": _read_last_run_iso(settings_json),
                "care_list_size": care_list_size,
            },
            tenant_id=tenant_id,
            actor_context=_actor_context(tenant_id),
        )
    except AppError as error:
        return _error_response(error, tenant_id=tenant_id, actor_context=None)


# ---------------------------------------------------------------------------
# Endpoint: monthly reminder dispatch
# ---------------------------------------------------------------------------


def _resolve_chess_tenant_slug_from_id(tenant_session: dict[str, Any]) -> str:
    """Best-effort: pull the slug from the resolved session payload."""

    return str(tenant_session.get("tenant_ref") or "").strip()


async def _resolve_tenant_slug(session, *, tenant_id: str) -> str | None:
    result = await session.execute(
        text(
            """
            select slug from tenants
            where id = cast(:tenant_id as uuid)
            limit 1
            """
        ),
        {"tenant_id": tenant_id},
    )
    row = result.mappings().first()
    if not row:
        return None
    return str(row.get("slug") or "").strip() or None


async def tenant_monthly_reminder_dispatch(
    request: Request,
    payload: MonthlyReminderDispatchPayload,
    authorization: str | None = Header(default=None),
):
    tenant_ref, tenant_id, tenant_session, _membership = await _resolve_tenant_request_context(
        request,
        authorization=authorization,
    )
    if not tenant_session:
        return _error_response(
            _tenant_session_required_error(tenant_id=tenant_id, tenant_ref=tenant_ref),
            tenant_id=tenant_id,
            actor_context=None,
        )
    if not tenant_id:
        return _error_response(
            _tenant_not_found_error(tenant_ref=tenant_ref),
            tenant_id=None,
            actor_context=None,
        )

    try:
        async with get_session(request.app.state.session_factory) as session:
            tenant_slug = (
                _resolve_chess_tenant_slug_from_id(tenant_session)
                or await _resolve_tenant_slug(session, tenant_id=tenant_id)
            )
            if not tenant_slug:
                raise AppError(
                    code="tenant_slug_unresolvable",
                    message="Could not resolve tenant slug for monthly reminder dispatch.",
                    status_code=400,
                    details={"tenant_id": tenant_id},
                )

            email_service: EmailService = request.app.state.email_service
            summary: MonthlyReminderSummary = await run_monthly_reminder_dispatch(
                session,
                tenant_slug=tenant_slug,
                email_service=email_service,
                month=payload.month,
                dry_run=bool(payload.dry_run),
                care_list_only=bool(payload.care_list_only),
                force=bool(payload.force),
            )

            outbox_repo = OutboxRepository(
                RepositoryContext(session=session, tenant_id=tenant_id)
            )
            await outbox_repo.enqueue_event(
                event_type="tenant.monthly_reminder.dispatched",
                aggregate_type="monthly_reminder_dispatch",
                aggregate_id=tenant_id,
                payload={
                    "tenant_slug": tenant_slug,
                    "month": payload.month,
                    "dry_run": bool(payload.dry_run),
                    "force": bool(payload.force),
                    "care_list_only": bool(payload.care_list_only),
                    "summary": summary.to_dict(),
                    "actor_email": str(tenant_session.get("email") or "").strip() or None,
                },
                status="processed",
                tenant_id=tenant_id,
            )

            await session.commit()

        return _success_response(
            {"summary": summary.to_dict()},
            tenant_id=tenant_id,
            actor_context=_actor_context(tenant_id),
        )
    except AppError as error:
        return _error_response(error, tenant_id=tenant_id, actor_context=None)


__all__ = [
    "CareListAddPayload",
    "MonthlyReminderConfigPayload",
    "MonthlyReminderDispatchPayload",
    "tenant_care_list_get",
    "tenant_care_list_add",
    "tenant_care_list_remove",
    "tenant_monthly_reminder_config_get",
    "tenant_monthly_reminder_config_put",
    "tenant_monthly_reminder_dispatch",
]
