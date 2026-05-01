"""Tenant-side handlers for the Phase 4 §2 mass-notification broadcast.

Tenant operator surfaces this from the new "Broadcast" workspace panel
(``frontend/src/features/tenant-broadcast/TenantBroadcastWorkspace.tsx``).

Endpoints
---------

* ``POST /api/v1/tenants/me/broadcast``
  Resolves an audience (all enrolled parents, parents in a single region, or
  a single contact), then dispatches the same message body across the chosen
  channels (email, WhatsApp, Telegram). Per-channel skip logic kicks in when
  a contact lacks the channel address (e.g. no phone -> skip WhatsApp +
  Telegram). Each broadcast is rate-limited to 1/hour/tenant and audited via
  ``outbox_events.event_type = 'tenant.broadcast.dispatched'``.

* ``GET /api/v1/tenants/me/broadcast/audience-preview``
  Lightweight audience-size + redacted-sample preview the workspace UI
  hits before opening the send confirmation modal.

Reuses
------
* ``_resolve_tenant_request_context`` for tenant-admin auth.
* ``request.app.state.email_service.send_email`` for SMTP delivery.
* ``request.app.state.communication_service.send_whatsapp`` /
  ``.send_telegram`` for the messaging fallbacks.
* ``orchestrate_lifecycle_email`` to record the email lifecycle row so
  the tenant Email Activity panel sees the broadcast like any other send.
* ``OutboxRepository.enqueue_event`` for the broadcast audit row.
"""

from __future__ import annotations

import re
import uuid
from datetime import UTC, datetime, timedelta
from typing import Any

from fastapi import Header, Request
from pydantic import BaseModel, Field
from sqlalchemy import text

from core.errors import AppError, ValidationAppError
from core.logging import get_logger
from db import get_session
from repositories import OutboxRepository
from repositories.base import RepositoryContext
from service_layer.communication_service import CommunicationService
from service_layer.email_service import EmailService
from service_layer.lifecycle_ops_service import orchestrate_lifecycle_email

from api.v1_routes import (
    ActorContextPayload,
    _error_response,
    _resolve_tenant_request_context,
    _success_response,
)


_logger = get_logger("bookedai.api.v1_tenant_broadcast_handlers")

_MAX_AUDIENCE_PER_BROADCAST = 5_000
_BROADCAST_RATE_LIMIT_WINDOW_SECONDS = 60 * 60  # 1 hour
_DEFAULT_REGION_LABEL = "Unknown"
_AUDIT_BODY_PREVIEW_CHARS = 200
_VALID_AUDIENCE_TYPES = {"all", "region", "student"}
_VALID_CHANNELS = {"email", "whatsapp", "telegram"}
_VALID_LOCALES = {"en", "vi"}

_BOLD_PATTERN = re.compile(r"\*\*(.+?)\*\*")
_ITALIC_PATTERN = re.compile(r"_(.+?)_")
_LINK_PATTERN = re.compile(r"\[([^\]]+)\]\((https?://[^\s)]+)\)")


def _audience_payload_from_dict(value: dict[str, Any] | None) -> dict[str, Any]:
    if not isinstance(value, dict):
        raise ValidationAppError(
            "Broadcast audience block is required.",
            details={"audience": ["object required"]},
        )
    audience_type = str(value.get("type") or "").strip().lower()
    if audience_type not in _VALID_AUDIENCE_TYPES:
        raise ValidationAppError(
            "Broadcast audience.type must be one of all|region|student.",
            details={"audience.type": ["invalid"]},
        )
    region = (value.get("region") or "").strip() or None
    student_contact_id = (value.get("student_contact_id") or "").strip() or None
    if audience_type == "region" and not region:
        raise ValidationAppError(
            "Broadcast audience.region is required when type=region.",
            details={"audience.region": ["required"]},
        )
    if audience_type == "student" and not student_contact_id:
        raise ValidationAppError(
            "Broadcast audience.student_contact_id is required when type=student.",
            details={"audience.student_contact_id": ["required"]},
        )
    return {
        "type": audience_type,
        "region": region,
        "student_contact_id": student_contact_id,
    }


class BroadcastAudiencePayload(BaseModel):
    type: str = Field(..., description="all | region | student")
    region: str | None = None
    student_contact_id: str | None = None


class BroadcastSendRequestPayload(BaseModel):
    audience: BroadcastAudiencePayload
    channels: list[str] = Field(default_factory=lambda: ["email"])
    subject: str | None = None
    body: str
    locale: str = "en"


def _tenant_session_required_error(*, tenant_id: str | None, tenant_ref: str | None) -> AppError:
    return AppError(
        code="tenant_auth_required",
        message="Sign in with an active tenant account before broadcasting messages.",
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


def _markdown_to_html(body: str) -> str:
    """Render the operator's markdown body to a safe HTML string."""

    if not body:
        return ""

    escaped_lines: list[str] = []
    for raw_line in body.splitlines():
        # Escape the raw line first so any accidental angle brackets or
        # ampersands are neutralised.
        escaped = (
            raw_line.replace("&", "&amp;")
            .replace("<", "&lt;")
            .replace(">", "&gt;")
        )
        # Restore minimal markdown: **bold**, _italic_, [text](url).
        escaped = _LINK_PATTERN.sub(
            lambda match: (
                f'<a href="{match.group(2)}" target="_blank" rel="noopener noreferrer">'
                f"{match.group(1)}</a>"
            ),
            escaped,
        )
        escaped = _BOLD_PATTERN.sub(r"<strong>\1</strong>", escaped)
        escaped = _ITALIC_PATTERN.sub(r"<em>\1</em>", escaped)
        escaped_lines.append(escaped)

    return "<br />\n".join(escaped_lines)


def _redact_email(email: str | None) -> bool:
    return bool((email or "").strip())


def _redact_phone(phone: str | None) -> bool:
    return bool((phone or "").strip())


async def _resolve_audience_contacts(
    session,
    *,
    tenant_id: str,
    audience: dict[str, Any],
) -> list[dict[str, Any]]:
    """Resolve the audience contact list for a broadcast.

    The base set is every contact under the tenant that has at least one
    booking_intent (so we don't blast cold leads).

    * ``type=all`` -> the full base set.
    * ``type=region`` -> base set filtered by
      ``coalesce(metadata_json->>'region', 'Unknown') = audience.region``.
    * ``type=student`` -> single contact lookup; tenant-scoped so cross-tenant
      contact ids return zero rows.
    """

    audience_type = audience["type"]
    region = audience.get("region")
    student_contact_id = audience.get("student_contact_id")

    if audience_type == "student":
        result = await session.execute(
            text(
                """
                select
                  c.id::text as contact_id,
                  c.full_name,
                  c.email,
                  c.phone,
                  coalesce(c.metadata_json ->> 'region', :default_region) as region
                from contacts c
                where c.tenant_id = cast(:tenant_id as uuid)
                  and c.id = cast(:contact_id as uuid)
                limit 1
                """
            ),
            {
                "tenant_id": tenant_id,
                "contact_id": student_contact_id,
                "default_region": _DEFAULT_REGION_LABEL,
            },
        )
        return [dict(row) for row in result.mappings().all()]

    base_sql = """
        with enrolled as (
          select distinct
            c.id::text as contact_id,
            c.full_name,
            c.email,
            c.phone,
            coalesce(c.metadata_json ->> 'region', :default_region) as region
          from contacts c
          join booking_intents bi
            on bi.contact_id = c.id
            and bi.tenant_id = cast(:tenant_id as uuid)
          where c.tenant_id = cast(:tenant_id as uuid)
        )
        select contact_id, full_name, email, phone, region
        from enrolled
    """
    params: dict[str, Any] = {
        "tenant_id": tenant_id,
        "default_region": _DEFAULT_REGION_LABEL,
    }
    if audience_type == "region":
        base_sql += " where region = :region"
        params["region"] = region
    base_sql += " order by full_name asc nulls last, contact_id asc limit :max_rows"
    params["max_rows"] = _MAX_AUDIENCE_PER_BROADCAST

    result = await session.execute(text(base_sql), params)
    return [dict(row) for row in result.mappings().all()]


async def _list_tenant_regions(session, *, tenant_id: str) -> list[str]:
    """Return distinct region labels present in the tenant's enrolled contacts."""

    result = await session.execute(
        text(
            """
            select distinct coalesce(c.metadata_json ->> 'region', :default_region) as region
            from contacts c
            join booking_intents bi
              on bi.contact_id = c.id
              and bi.tenant_id = cast(:tenant_id as uuid)
            where c.tenant_id = cast(:tenant_id as uuid)
            order by region asc
            """
        ),
        {
            "tenant_id": tenant_id,
            "default_region": _DEFAULT_REGION_LABEL,
        },
    )
    return [
        str(row["region"]).strip() or _DEFAULT_REGION_LABEL
        for row in result.mappings().all()
        if row.get("region") is not None
    ]


async def _load_last_broadcast_at(
    session,
    *,
    tenant_id: str,
) -> datetime | None:
    """Read ``last_broadcast_at`` from ``tenant_settings.settings_json``."""

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
        return None
    settings_json = row.get("settings_json")
    if not isinstance(settings_json, dict):
        return None
    raw_value = settings_json.get("last_broadcast_at")
    if not raw_value:
        return None
    try:
        return datetime.fromisoformat(str(raw_value).replace("Z", "+00:00"))
    except (TypeError, ValueError):
        return None


async def _stamp_last_broadcast_at(
    session,
    *,
    tenant_id: str,
    timestamp: datetime,
) -> None:
    """Persist ``last_broadcast_at`` into ``tenant_settings.settings_json``."""

    await session.execute(
        text(
            """
            update tenant_settings
            set
              settings_json = coalesce(settings_json, '{}'::jsonb)
                || jsonb_build_object('last_broadcast_at', :timestamp)
            where tenant_id = cast(:tenant_id as uuid)
            """
        ),
        {
            "tenant_id": tenant_id,
            "timestamp": timestamp.isoformat(),
        },
    )


def _channels_from_request(channels: list[str] | None) -> list[str]:
    normalized = [
        str(channel).strip().lower()
        for channel in (channels or [])
        if str(channel).strip()
    ]
    invalid = [channel for channel in normalized if channel not in _VALID_CHANNELS]
    if invalid:
        raise ValidationAppError(
            "Broadcast channel must be one of email|whatsapp|telegram.",
            details={"channels": [f"invalid: {','.join(sorted(set(invalid)))}"]},
        )
    if not normalized:
        return ["email"]
    seen: set[str] = set()
    deduped: list[str] = []
    for channel in normalized:
        if channel in seen:
            continue
        seen.add(channel)
        deduped.append(channel)
    return deduped


async def _resolve_tenant_brand_name(session, *, tenant_id: str) -> str:
    """Best-effort lookup of the tenant display name for the email subject."""

    try:
        result = await session.execute(
            text(
                """
                select coalesce(name, slug, '') as brand_name
                from tenants
                where id = cast(:tenant_id as uuid)
                limit 1
                """
            ),
            {"tenant_id": tenant_id},
        )
        row = result.mappings().first()
        if row:
            return str(row.get("brand_name") or "").strip() or "BookedAI"
    except Exception:  # noqa: BLE001
        return "BookedAI"
    return "BookedAI"


async def _resolve_broadcast_cc_emails(session, *, tenant_id: str) -> list[str]:
    """Return tenant CC inbox + the chess auto-CC when applicable."""

    cc_emails: list[str] = []
    try:
        result = await session.execute(
            text(
                """
                select settings_json, t.slug as tenant_slug
                from tenant_settings ts
                left join tenants t on t.id = ts.tenant_id
                where ts.tenant_id = cast(:tenant_id as uuid)
                limit 1
                """
            ),
            {"tenant_id": tenant_id},
        )
        row = result.mappings().first()
        settings_json: dict[str, Any] = {}
        tenant_slug = ""
        if row:
            settings_json = (
                dict(row.get("settings_json") or {})
                if isinstance(row.get("settings_json"), dict)
                else {}
            )
            tenant_slug = str(row.get("tenant_slug") or "").strip().lower()
        explicit_cc = settings_json.get("notification_cc_emails")
        if isinstance(explicit_cc, list):
            for value in explicit_cc:
                normalized = str(value or "").strip().lower()
                if normalized and normalized not in cc_emails:
                    cc_emails.append(normalized)
        if "chess" in tenant_slug:
            chess_cc = "chess@bookedai.au"
            if chess_cc not in cc_emails:
                cc_emails.append(chess_cc)
    except Exception:  # noqa: BLE001
        return cc_emails
    return cc_emails


async def _dispatch_broadcast(
    request: Request,
    *,
    session,
    tenant_id: str,
    audience_contacts: list[dict[str, Any]],
    channels: list[str],
    subject: str,
    body: str,
    locale: str,
) -> dict[str, dict[str, int]]:
    """Loop the audience and dispatch on each requested channel.

    Returns a per-channel ``{sent, skipped, failed}`` summary.
    """

    summary: dict[str, dict[str, int]] = {
        channel: {"sent": 0, "skipped": 0, "failed": 0}
        for channel in _VALID_CHANNELS
    }

    if not audience_contacts:
        return summary

    body_html = _markdown_to_html(body)
    chat_message = f"{subject}\n\n{body}".strip() if subject else body
    tenant_brand_name = await _resolve_tenant_brand_name(session, tenant_id=tenant_id)
    cc_emails = await _resolve_broadcast_cc_emails(session, tenant_id=tenant_id)

    email_service: EmailService = request.app.state.email_service
    communication_service: CommunicationService = request.app.state.communication_service
    smtp_configured = email_service.smtp_configured()

    for contact in audience_contacts:
        contact_id = str(contact.get("contact_id") or "").strip() or None

        if "email" in channels:
            recipient = (contact.get("email") or "").strip().lower()
            if not recipient:
                summary["email"]["skipped"] += 1
            else:
                rendered_subject = subject or f"{tenant_brand_name} broadcast"
                try:
                    if smtp_configured:
                        await email_service.send_email(
                            to=[recipient],
                            cc=list(cc_emails) if cc_emails else None,
                            subject=rendered_subject,
                            text=body,
                            html=body_html,
                        )
                        delivery_status = "sent"
                    else:
                        delivery_status = "queued"
                    await orchestrate_lifecycle_email(
                        session,
                        tenant_id=tenant_id,
                        template_key="bookedai_tenant_broadcast",
                        subject=rendered_subject,
                        provider="smtp" if smtp_configured else "unconfigured",
                        delivery_status=delivery_status,
                        contact_id=contact_id,
                        event_payload={
                            "broadcast_locale": locale,
                            "tenant_brand_name": tenant_brand_name,
                            "channel": "email",
                            "cc_count": len(cc_emails),
                        },
                    )
                    if delivery_status == "sent":
                        summary["email"]["sent"] += 1
                    else:
                        summary["email"]["skipped"] += 1
                except Exception as error:  # noqa: BLE001
                    _logger.warning(
                        "broadcast_email_failed contact=%s error=%s",
                        contact_id,
                        error,
                    )
                    summary["email"]["failed"] += 1

        if "whatsapp" in channels:
            phone = (contact.get("phone") or "").strip()
            if not phone:
                summary["whatsapp"]["skipped"] += 1
            else:
                try:
                    result = await communication_service.send_whatsapp(
                        to=phone,
                        body=chat_message,
                    )
                    if result.delivery_status == "sent":
                        summary["whatsapp"]["sent"] += 1
                    elif result.delivery_status == "queued":
                        summary["whatsapp"]["skipped"] += 1
                    else:
                        summary["whatsapp"]["failed"] += 1
                except Exception as error:  # noqa: BLE001
                    _logger.warning(
                        "broadcast_whatsapp_failed contact=%s error=%s",
                        contact_id,
                        error,
                    )
                    summary["whatsapp"]["failed"] += 1

        if "telegram" in channels:
            phone = (contact.get("phone") or "").strip()
            if not phone:
                summary["telegram"]["skipped"] += 1
            else:
                try:
                    result = await communication_service.send_telegram(
                        chat_id=phone,
                        body=chat_message,
                    )
                    if result.delivery_status == "sent":
                        summary["telegram"]["sent"] += 1
                    elif result.delivery_status == "queued":
                        summary["telegram"]["skipped"] += 1
                    else:
                        summary["telegram"]["failed"] += 1
                except Exception as error:  # noqa: BLE001
                    _logger.warning(
                        "broadcast_telegram_failed contact=%s error=%s",
                        contact_id,
                        error,
                    )
                    summary["telegram"]["failed"] += 1

    # Trim summary keys to the channels actually requested so the response
    # matches the operator's selection (other zero-counts would be noise).
    return {channel: summary[channel] for channel in channels}


async def tenant_broadcast_dispatch(
    request: Request,
    payload: BroadcastSendRequestPayload,
    authorization: str | None = Header(default=None),
):
    """Dispatch a tenant-initiated broadcast to the resolved audience."""

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
        audience = _audience_payload_from_dict(payload.audience.model_dump())
        channels = _channels_from_request(payload.channels)
        body = (payload.body or "").strip()
        if not body:
            raise ValidationAppError(
                "Broadcast body is required.",
                details={"body": ["required"]},
            )
        subject = (payload.subject or "").strip()
        locale = (payload.locale or "en").strip().lower()
        if locale not in _VALID_LOCALES:
            raise ValidationAppError(
                "Broadcast locale must be one of en|vi.",
                details={"locale": ["invalid"]},
            )

        async with get_session(request.app.state.session_factory) as session:
            now = datetime.now(UTC)
            last_broadcast_at = await _load_last_broadcast_at(
                session,
                tenant_id=tenant_id,
            )
            if last_broadcast_at is not None:
                if last_broadcast_at.tzinfo is None:
                    last_broadcast_at = last_broadcast_at.replace(tzinfo=UTC)
                elapsed = (now - last_broadcast_at).total_seconds()
                if elapsed < _BROADCAST_RATE_LIMIT_WINDOW_SECONDS:
                    retry_after = max(
                        1,
                        int(_BROADCAST_RATE_LIMIT_WINDOW_SECONDS - elapsed),
                    )
                    raise AppError(
                        code="tenant_broadcast_rate_limited",
                        message=(
                            "This tenant already sent a broadcast within the "
                            "past hour. Try again later."
                        ),
                        status_code=429,
                        details={
                            "retry_after_seconds": retry_after,
                            "last_broadcast_at": last_broadcast_at.isoformat(),
                        },
                    )

            audience_contacts = await _resolve_audience_contacts(
                session,
                tenant_id=tenant_id,
                audience=audience,
            )
            audience_count = len(audience_contacts)
            if audience_count == 0:
                raise ValidationAppError(
                    "No contacts matched the broadcast audience filter.",
                    details={"audience": ["no_recipients"]},
                )

            broadcast_id = str(uuid.uuid4())
            dispatch_summary = await _dispatch_broadcast(
                request,
                session=session,
                tenant_id=tenant_id,
                audience_contacts=audience_contacts,
                channels=channels,
                subject=subject,
                body=body,
                locale=locale,
            )

            await _stamp_last_broadcast_at(
                session,
                tenant_id=tenant_id,
                timestamp=now,
            )

            outbox_repository = OutboxRepository(
                RepositoryContext(session=session, tenant_id=tenant_id)
            )
            await outbox_repository.enqueue_event(
                event_type="tenant.broadcast.dispatched",
                aggregate_type="tenant_broadcast",
                aggregate_id=broadcast_id,
                payload={
                    "broadcast_id": broadcast_id,
                    "audience_type": audience["type"],
                    "audience_region": audience.get("region"),
                    "audience_student_contact_id": audience.get(
                        "student_contact_id"
                    ),
                    "audience_count": audience_count,
                    "channels": channels,
                    "subject": subject or None,
                    "body_preview": body[:_AUDIT_BODY_PREVIEW_CHARS],
                    "locale": locale,
                    "dispatch_summary": dispatch_summary,
                    "actor_email": str(
                        tenant_session.get("email") or ""
                    ).strip()
                    or None,
                    "dispatched_at": now.isoformat(),
                },
                status="processed",
                tenant_id=tenant_id,
            )

            await session.commit()

        return _success_response(
            {
                "broadcast_id": broadcast_id,
                "audience_count": audience_count,
                "dispatch_summary": dispatch_summary,
            },
            tenant_id=tenant_id,
            actor_context=ActorContextPayload(
                channel="tenant_app",
                tenant_id=tenant_id,
                role="tenant_admin",
                deployment_mode="standalone_app",
            ),
        )
    except AppError as error:
        return _error_response(error, tenant_id=tenant_id, actor_context=None)


async def tenant_broadcast_audience_preview(
    request: Request,
    authorization: str | None = Header(default=None),
    audience_type: str = "all",
    region: str | None = None,
    student_contact_id: str | None = None,
):
    """Return audience size + redacted sample for the workspace UI preview."""

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
        audience = _audience_payload_from_dict(
            {
                "type": audience_type,
                "region": region,
                "student_contact_id": student_contact_id,
            }
        )
        async with get_session(request.app.state.session_factory) as session:
            audience_contacts = await _resolve_audience_contacts(
                session,
                tenant_id=tenant_id,
                audience=audience,
            )
            regions = await _list_tenant_regions(session, tenant_id=tenant_id)

        sample_contacts: list[dict[str, Any]] = []
        for contact in audience_contacts[:5]:
            sample_contacts.append(
                {
                    "name": contact.get("full_name") or "Unnamed",
                    "region": contact.get("region") or _DEFAULT_REGION_LABEL,
                    "email_present": _redact_email(contact.get("email")),
                    "phone_present": _redact_phone(contact.get("phone")),
                    "whatsapp_present": _redact_phone(contact.get("phone")),
                    "telegram_present": _redact_phone(contact.get("phone")),
                }
            )

        return _success_response(
            {
                "audience_count": len(audience_contacts),
                "sample_contacts": sample_contacts,
                "available_regions": regions,
            },
            tenant_id=tenant_id,
            actor_context=ActorContextPayload(
                channel="tenant_app",
                tenant_id=tenant_id,
                role="tenant_admin",
                deployment_mode="standalone_app",
            ),
        )
    except AppError as error:
        return _error_response(error, tenant_id=tenant_id, actor_context=None)


__all__ = [
    "BroadcastAudiencePayload",
    "BroadcastSendRequestPayload",
    "tenant_broadcast_audience_preview",
    "tenant_broadcast_dispatch",
]
