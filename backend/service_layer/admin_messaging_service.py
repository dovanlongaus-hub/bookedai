from __future__ import annotations

import json
from datetime import UTC, datetime, timedelta

from db import ConversationEvent, MessagingChannelSession
from repositories.audit_repository import AuditLogRepository
from repositories.base import RepositoryContext
from repositories.email_repository import EmailRepository
from repositories.outbox_repository import OutboxRepository
from service_layer.lifecycle_ops_service import execute_crm_sync_retry
from sqlalchemy import desc, select, text


def _coerce_json_object(value) -> dict[str, object]:
    if isinstance(value, dict):
        return value
    if isinstance(value, str):
        try:
            parsed = json.loads(value)
        except json.JSONDecodeError:
            return {}
        return parsed if isinstance(parsed, dict) else {}
    return {}


def _normalize_channel(value: object | None) -> str:
    channel = str(value or "").strip().lower()
    if not channel:
        return "ops"
    return channel


def _build_message_item(row: dict[str, object | None]) -> dict[str, object | None]:
    payload = _coerce_json_object(row.get("latest_payload"))
    return {
        "message_key": f"{row.get('source_kind')}:{row.get('item_id')}",
        "source_kind": str(row.get("source_kind") or ""),
        "item_id": str(row.get("item_id") or ""),
        "channel": _normalize_channel(row.get("channel")),
        "delivery_status": str(row.get("delivery_status") or "unknown"),
        "title": str(row.get("title") or "Message event"),
        "provider": str(row.get("provider") or "").strip() or None,
        "template_key": str(row.get("template_key") or "").strip() or None,
        "tenant_id": str(row.get("tenant_id") or "").strip() or None,
        "tenant_ref": str(row.get("tenant_ref") or "").strip() or None,
        "tenant_name": str(row.get("tenant_name") or "").strip() or None,
        "entity_type": str(row.get("entity_type") or "").strip() or None,
        "entity_id": str(row.get("entity_id") or "").strip() or None,
        "entity_label": str(row.get("entity_label") or "").strip() or None,
        "occurred_at": str(row.get("occurred_at") or ""),
        "latest_event_type": str(row.get("latest_event_type") or "").strip() or None,
        "latest_event_at": str(row.get("latest_event_at") or "").strip() or None,
        "retry_eligible": bool(row.get("retry_eligible")),
        "manual_follow_up": bool(row.get("manual_follow_up")),
        "needs_attention": bool(row.get("needs_attention")),
        "last_error": str(row.get("last_error") or "").strip() or None,
        "attempt_count": int(row.get("attempt_count") or 0),
        "summary": (
            str(payload.get("summary") or "").strip()
            or str(payload.get("error_message") or "").strip()
            or str(payload.get("operator_note") or "").strip()
            or None
        ),
    }


async def build_admin_messaging_payload(
    session,
    *,
    limit: int = 60,
) -> dict[str, object]:
    limit = max(1, min(limit, 120))
    per_source_limit = max(6, min(limit, 40))

    email_result = await session.execute(
        text(
            """
            select
              'email_messages' as source_kind,
              message.id::text as item_id,
              'email' as channel,
              message.status as delivery_status,
              coalesce(message.subject, message.template_key, 'Lifecycle email') as title,
              message.provider,
              message.template_key,
              message.tenant_id::text as tenant_id,
              coalesce(tenant.slug, message.tenant_id::text) as tenant_ref,
              coalesce(tenant.name, tenant.slug, message.tenant_id::text) as tenant_name,
              'contact' as entity_type,
              message.contact_id::text as entity_id,
              coalesce(contact.full_name, contact.email, message.contact_id::text) as entity_label,
              message.created_at::text as occurred_at,
              latest.event_type as latest_event_type,
              latest.created_at::text as latest_event_at,
              latest.payload as latest_payload,
              false as retry_eligible,
              message.status = 'manual_review_required' as manual_follow_up,
              message.status in ('failed', 'manual_review_required') as needs_attention,
              null::text as last_error,
              0::int as attempt_count
            from email_messages message
            left join tenants tenant
              on tenant.id = message.tenant_id
            left join contacts contact
              on contact.id = message.contact_id
            left join lateral (
              select
                event_type,
                payload,
                created_at
              from email_events
              where email_message_id = message.id
              order by created_at desc, id desc
              limit 1
            ) latest on true
            order by message.created_at desc
            limit :per_source_limit
            """
        ),
        {"per_source_limit": per_source_limit},
    )
    outbox_result = await session.execute(
        text(
            """
            select
              'outbox_events' as source_kind,
              outbox.id::text as item_id,
              case
                when outbox.event_type like 'sms.%' then 'sms'
                when outbox.event_type like 'whatsapp.%' then 'whatsapp'
                when outbox.event_type like 'email.%' then 'email'
                else 'ops'
              end as channel,
              outbox.status as delivery_status,
              outbox.event_type as title,
              null::text as provider,
              null::text as template_key,
              outbox.tenant_id::text as tenant_id,
              coalesce(tenant.slug, outbox.tenant_id::text) as tenant_ref,
              coalesce(tenant.name, tenant.slug, outbox.tenant_id::text) as tenant_name,
              coalesce(outbox.aggregate_type, outbox.payload->>'entity_type', outbox.payload->>'record_type') as entity_type,
              coalesce(outbox.aggregate_id, outbox.payload->>'booking_reference', outbox.payload->>'local_entity_id') as entity_id,
              coalesce(outbox.payload->>'booking_reference', outbox.payload->>'customer_name', outbox.payload->>'service_name', outbox.aggregate_id, outbox.event_type) as entity_label,
              outbox.created_at::text as occurred_at,
              null::text as latest_event_type,
              coalesce(outbox.last_error_at, outbox.processed_at, outbox.available_at, outbox.created_at)::text as latest_event_at,
              outbox.payload as latest_payload,
              outbox.status in ('failed', 'retrying', 'pending') as retry_eligible,
              false as manual_follow_up,
              outbox.status in ('failed', 'retrying', 'pending') as needs_attention,
              outbox.last_error,
              coalesce(outbox.attempt_count, 0)::int as attempt_count
            from outbox_events outbox
            left join tenants tenant
              on tenant.id = outbox.tenant_id
            order by outbox.created_at desc
            limit :per_source_limit
            """
        ),
        {"per_source_limit": per_source_limit},
    )
    crm_result = await session.execute(
        text(
            """
            with latest_errors as (
              select distinct on (crm_sync_record_id)
                crm_sync_record_id,
                error_code,
                error_message,
                payload,
                created_at
              from crm_sync_errors
              order by crm_sync_record_id, created_at desc, id desc
            )
            select
              'crm_sync_records' as source_kind,
              record.id::text as item_id,
              case
                when lower(record.entity_type) = 'task' then 'crm_task'
                else 'crm'
              end as channel,
              record.sync_status as delivery_status,
              coalesce(record.payload->>'task_subject', record.payload->>'subject', record.entity_type || ' sync') as title,
              record.provider,
              null::text as template_key,
              record.tenant_id::text as tenant_id,
              coalesce(tenant.slug, record.tenant_id::text) as tenant_ref,
              coalesce(tenant.name, tenant.slug, record.tenant_id::text) as tenant_name,
              record.entity_type,
              record.local_entity_id as entity_id,
              coalesce(record.external_entity_id, record.local_entity_id) as entity_label,
              coalesce(record.last_synced_at, record.created_at)::text as occurred_at,
              latest.error_code as latest_event_type,
              coalesce(latest.payload, record.payload) as latest_payload,
              coalesce(latest.created_at, record.last_synced_at, record.created_at)::text as latest_event_at,
              record.sync_status in ('failed', 'manual_review_required', 'conflict', 'retrying') as retry_eligible,
              record.sync_status = 'manual_review_required' as manual_follow_up,
              record.sync_status in ('failed', 'manual_review_required', 'conflict', 'retrying') as needs_attention,
              latest.error_message as last_error,
              0::int as attempt_count
            from crm_sync_records record
            left join tenants tenant
              on tenant.id = record.tenant_id
            left join latest_errors latest
              on latest.crm_sync_record_id = record.id
            order by coalesce(latest.created_at, record.last_synced_at, record.created_at) desc
            limit :per_source_limit
            """
        ),
        {"per_source_limit": per_source_limit},
    )

    items = [
        *[_build_message_item(dict(row)) for row in email_result.mappings().all()],
        *[_build_message_item(dict(row)) for row in outbox_result.mappings().all()],
        *[_build_message_item(dict(row)) for row in crm_result.mappings().all()],
    ]
    items.sort(key=lambda item: str(item.get("latest_event_at") or item.get("occurred_at") or ""), reverse=True)
    return {
        "status": "ok",
        "items": items[:limit],
    }


async def build_admin_message_detail_payload(
    session,
    *,
    source_kind: str,
    item_id: str,
) -> dict[str, object]:
    normalized_source = source_kind.strip().lower()

    if normalized_source == "email_messages":
        detail_result = await session.execute(
            text(
                """
                select
                  'email_messages' as source_kind,
                  message.id::text as item_id,
                  'email' as channel,
                  message.status as delivery_status,
                  coalesce(message.subject, message.template_key, 'Lifecycle email') as title,
                  message.provider,
                  message.template_key,
                  message.tenant_id::text as tenant_id,
                  coalesce(tenant.slug, message.tenant_id::text) as tenant_ref,
                  coalesce(tenant.name, tenant.slug, message.tenant_id::text) as tenant_name,
                  'contact' as entity_type,
                  message.contact_id::text as entity_id,
                  coalesce(contact.full_name, contact.email, message.contact_id::text) as entity_label,
                  message.created_at::text as occurred_at,
                  latest.event_type as latest_event_type,
                  latest.created_at::text as latest_event_at,
                  latest.payload as latest_payload,
                  false as retry_eligible,
                  message.status = 'manual_review_required' as manual_follow_up,
                  message.status in ('failed', 'manual_review_required') as needs_attention,
                  null::text as last_error,
                  0::int as attempt_count
                from email_messages message
                left join tenants tenant
                  on tenant.id = message.tenant_id
                left join contacts contact
                  on contact.id = message.contact_id
                left join lateral (
                  select
                    event_type,
                    payload,
                    created_at
                  from email_events
                  where email_message_id = message.id
                  order by created_at desc, id desc
                  limit 1
                ) latest on true
                where message.id::text = :item_id
                limit 1
                """
            ),
            {"item_id": item_id},
        )
        detail_row = detail_result.mappings().first()
        if not detail_row:
            raise LookupError("Message was not found")
        events_result = await session.execute(
            text(
                """
                select
                  id::text as event_id,
                  event_type,
                  created_at::text as occurred_at,
                  payload
                from email_events
                where email_message_id::text = :item_id
                order by created_at desc, id desc
                limit 12
                """
            ),
            {"item_id": item_id},
        )
        events = [
            {
                "event_id": str(row.get("event_id") or ""),
                "event_type": str(row.get("event_type") or ""),
                "occurred_at": str(row.get("occurred_at") or ""),
                "detail": str(_coerce_json_object(row.get("payload")).get("message") or "").strip() or None,
                "payload": _coerce_json_object(row.get("payload")),
            }
            for row in events_result.mappings().all()
        ]
        return {"status": "ok", "item": _build_message_item(dict(detail_row)), "events": events}

    if normalized_source == "outbox_events":
        detail_result = await session.execute(
            text(
                """
                select
                  'outbox_events' as source_kind,
                  outbox.id::text as item_id,
                  case
                    when outbox.event_type like 'sms.%' then 'sms'
                    when outbox.event_type like 'whatsapp.%' then 'whatsapp'
                    when outbox.event_type like 'email.%' then 'email'
                    else 'ops'
                  end as channel,
                  outbox.status as delivery_status,
                  outbox.event_type as title,
                  null::text as provider,
                  null::text as template_key,
                  outbox.tenant_id::text as tenant_id,
                  coalesce(tenant.slug, outbox.tenant_id::text) as tenant_ref,
                  coalesce(tenant.name, tenant.slug, outbox.tenant_id::text) as tenant_name,
                  coalesce(outbox.aggregate_type, outbox.payload->>'entity_type', outbox.payload->>'record_type') as entity_type,
                  coalesce(outbox.aggregate_id, outbox.payload->>'booking_reference', outbox.payload->>'local_entity_id') as entity_id,
                  coalesce(outbox.payload->>'booking_reference', outbox.payload->>'customer_name', outbox.payload->>'service_name', outbox.aggregate_id, outbox.event_type) as entity_label,
                  outbox.created_at::text as occurred_at,
                  null::text as latest_event_type,
                  coalesce(outbox.last_error_at, outbox.processed_at, outbox.available_at, outbox.created_at)::text as latest_event_at,
                  outbox.payload as latest_payload,
                  outbox.status in ('failed', 'retrying', 'pending') as retry_eligible,
                  false as manual_follow_up,
                  outbox.status in ('failed', 'retrying', 'pending') as needs_attention,
                  outbox.last_error,
                  coalesce(outbox.attempt_count, 0)::int as attempt_count
                from outbox_events outbox
                left join tenants tenant
                  on tenant.id = outbox.tenant_id
                where outbox.id::text = :item_id
                limit 1
                """
            ),
            {"item_id": item_id},
        )
        detail_row = detail_result.mappings().first()
        if not detail_row:
            raise LookupError("Message was not found")
        detail_payload = _coerce_json_object(detail_row.get("latest_payload"))
        events = [
            {
                "event_id": f"outbox:{item_id}",
                "event_type": str(detail_row.get("delivery_status") or ""),
                "occurred_at": str(detail_row.get("latest_event_at") or detail_row.get("occurred_at") or ""),
                "detail": str(detail_row.get("last_error") or "").strip() or None,
                "payload": detail_payload,
            }
        ]
        return {"status": "ok", "item": _build_message_item(dict(detail_row)), "events": events}

    if normalized_source == "crm_sync_records":
        detail_result = await session.execute(
            text(
                """
                with latest_errors as (
                  select distinct on (crm_sync_record_id)
                    crm_sync_record_id,
                    error_code,
                    error_message,
                    payload,
                    created_at
                  from crm_sync_errors
                  order by crm_sync_record_id, created_at desc, id desc
                )
                select
                  'crm_sync_records' as source_kind,
                  record.id::text as item_id,
                  case
                    when lower(record.entity_type) = 'task' then 'crm_task'
                    else 'crm'
                  end as channel,
                  record.sync_status as delivery_status,
                  coalesce(record.payload->>'task_subject', record.payload->>'subject', record.entity_type || ' sync') as title,
                  record.provider,
                  null::text as template_key,
                  record.tenant_id::text as tenant_id,
                  coalesce(tenant.slug, record.tenant_id::text) as tenant_ref,
                  coalesce(tenant.name, tenant.slug, record.tenant_id::text) as tenant_name,
                  record.entity_type,
                  record.local_entity_id as entity_id,
                  coalesce(record.external_entity_id, record.local_entity_id) as entity_label,
                  coalesce(record.last_synced_at, record.created_at)::text as occurred_at,
                  latest.error_code as latest_event_type,
                  coalesce(latest.payload, record.payload) as latest_payload,
                  coalesce(latest.created_at, record.last_synced_at, record.created_at)::text as latest_event_at,
                  record.sync_status in ('failed', 'manual_review_required', 'conflict', 'retrying') as retry_eligible,
                  record.sync_status = 'manual_review_required' as manual_follow_up,
                  record.sync_status in ('failed', 'manual_review_required', 'conflict', 'retrying') as needs_attention,
                  latest.error_message as last_error,
                  0::int as attempt_count
                from crm_sync_records record
                left join tenants tenant
                  on tenant.id = record.tenant_id
                left join latest_errors latest
                  on latest.crm_sync_record_id = record.id
                where record.id::text = :item_id
                limit 1
                """
            ),
            {"item_id": item_id},
        )
        detail_row = detail_result.mappings().first()
        if not detail_row:
            raise LookupError("Message was not found")
        events_result = await session.execute(
            text(
                """
                select
                  id::text as event_id,
                  coalesce(error_code, 'crm_sync_event') as event_type,
                  created_at::text as occurred_at,
                  error_message as detail,
                  payload
                from crm_sync_errors
                where crm_sync_record_id::text = :item_id
                order by created_at desc, id desc
                limit 12
                """
            ),
            {"item_id": item_id},
        )
        events = [
            {
                "event_id": str(row.get("event_id") or ""),
                "event_type": str(row.get("event_type") or ""),
                "occurred_at": str(row.get("occurred_at") or ""),
                "detail": str(row.get("detail") or "").strip() or None,
                "payload": _coerce_json_object(row.get("payload")),
            }
            for row in events_result.mappings().all()
        ]
        return {"status": "ok", "item": _build_message_item(dict(detail_row)), "events": events}

    raise LookupError("Message source was not found")


async def apply_admin_message_action(
    session,
    *,
    source_kind: str,
    item_id: str,
    action: str,
    actor_id: str,
    note: str | None = None,
) -> dict[str, object]:
    normalized_source = source_kind.strip().lower()
    normalized_action = action.strip().lower()
    note_value = (note or "").strip() or None

    if normalized_source == "outbox_events" and normalized_action == "retry":
        detail_result = await session.execute(
            text(
                """
                select tenant_id::text as tenant_id
                from outbox_events
                where id::text = :item_id
                limit 1
                """
            ),
            {"item_id": item_id},
        )
        detail_row = detail_result.mappings().first()
        if not detail_row:
            raise LookupError("Message was not found")
        tenant_id = str(detail_row.get("tenant_id") or "").strip() or None
        repository = OutboxRepository(RepositoryContext(session=session, tenant_id=tenant_id))
        updated = await repository.requeue_event(int(item_id), tenant_id=tenant_id)
        if not updated:
            raise ValueError("Message could not be queued for retry.")
        await AuditLogRepository(RepositoryContext(session=session, tenant_id=tenant_id)).append_entry(
            tenant_id=tenant_id,
            event_type="admin.messaging.retry_queued",
            entity_type="outbox_event",
            entity_id=str(item_id),
            actor_type="admin_operator",
            actor_id=actor_id,
            payload={"note": note_value, "source_kind": normalized_source},
        )
        return {"status": "ok", "message": "Message was queued for retry.", "action": normalized_action}

    if normalized_source == "crm_sync_records" and normalized_action == "retry":
        detail_result = await session.execute(
            text(
                """
                select tenant_id::text as tenant_id
                from crm_sync_records
                where id::text = :item_id
                limit 1
                """
            ),
            {"item_id": item_id},
        )
        detail_row = detail_result.mappings().first()
        if not detail_row:
            raise LookupError("Message was not found")
        tenant_id = str(detail_row.get("tenant_id") or "").strip()
        result = await execute_crm_sync_retry(
            session,
            tenant_id=tenant_id,
            crm_sync_record_id=int(item_id),
            reason="admin_messaging_retry",
        )
        await AuditLogRepository(RepositoryContext(session=session, tenant_id=tenant_id)).append_entry(
            tenant_id=tenant_id,
            event_type="admin.messaging.retry_queued",
            entity_type="crm_sync_record",
            entity_id=str(item_id),
            actor_type="admin_operator",
            actor_id=actor_id,
            payload={
                "note": note_value,
                "source_kind": normalized_source,
                "sync_status": result.sync_status,
            },
        )
        return {
            "status": "ok",
            "message": f"CRM sync retry posture is now {result.sync_status}.",
            "action": normalized_action,
        }

    if normalized_source == "email_messages" and normalized_action == "mark_manual_follow_up":
        detail_result = await session.execute(
            text(
                """
                select tenant_id::text as tenant_id
                from email_messages
                where id::text = :item_id
                limit 1
                """
            ),
            {"item_id": item_id},
        )
        detail_row = detail_result.mappings().first()
        if not detail_row:
            raise LookupError("Message was not found")
        tenant_id = str(detail_row.get("tenant_id") or "").strip() or None
        repository = EmailRepository(RepositoryContext(session=session, tenant_id=tenant_id))
        await repository.update_message_status(
            tenant_id=tenant_id or "",
            message_id=item_id,
            status="manual_review_required",
        )
        await repository.append_message_event(
            tenant_id=tenant_id or "",
            message_id=item_id,
            event_type="manual_review_marked",
            payload_json=json.dumps({"note": note_value, "actor_id": actor_id}),
        )
        await AuditLogRepository(RepositoryContext(session=session, tenant_id=tenant_id)).append_entry(
            tenant_id=tenant_id,
            event_type="admin.messaging.manual_follow_up_marked",
            entity_type="email_message",
            entity_id=str(item_id),
            actor_type="admin_operator",
            actor_id=actor_id,
            payload={"note": note_value, "source_kind": normalized_source},
        )
        return {
            "status": "ok",
            "message": "Message was marked for manual follow-up.",
            "action": normalized_action,
        }

    raise ValueError("Unsupported messaging action")


HANDOFF_LOOKBACK_HOURS_DEFAULT = 72
HANDOFF_LOOKBACK_HOURS_MAX = 24 * 14  # 2 weeks


def _handoff_metadata_payload(metadata: object | None) -> dict[str, object]:
    payload = _coerce_json_object(metadata)
    return payload


def _is_handoff_event(metadata: dict[str, object], ai_intent: str | None) -> bool:
    intent = str(ai_intent or "").strip()
    if intent in {"support_handoff", "support_handoff_failed"}:
        return True
    care_status = str(metadata.get("customer_care_status") or "").strip()
    if care_status in {"support_handoff", "support_handoff_failed"}:
        return True
    if bool(metadata.get("human_handoff_requested")):
        return True
    return False


HANDOFF_CLAIM_TTL_SECONDS = 4 * 60 * 60  # 4-hour suppression window


def _build_pending_handoff_item(
    row: ConversationEvent,
    *,
    session_metadata: dict[str, object] | None = None,
) -> dict[str, object]:
    metadata = _handoff_metadata_payload(row.metadata_json)
    care_status = str(metadata.get("customer_care_status") or "").strip()
    if not care_status:
        care_status = (
            "support_handoff_failed"
            if bool(metadata.get("support_handoff_failed"))
            else "support_handoff"
        )
    handoff = metadata.get("lifecycle_updates", {})
    if isinstance(handoff, dict):
        handoff_block = handoff.get("support_handoff") or {}
    else:
        handoff_block = {}
    if not isinstance(handoff_block, dict):
        handoff_block = {}
    last_message = str(row.message_text or "").strip() or None
    if last_message and len(last_message) > 280:
        last_message = last_message[:280].rstrip() + "…"
    claim_meta = session_metadata if isinstance(session_metadata, dict) else {}
    claimed_at = str(claim_meta.get("handoff_claimed_at") or "").strip() or None
    claimed_by = str(claim_meta.get("handoff_claimed_by") or "").strip() or None
    return {
        "event_id": str(row.id),
        "conversation_id": str(row.conversation_id or "").strip() or None,
        "channel": str(row.source or "").strip().lower() or "telegram",
        "customer_care_status": care_status,
        "sender_name": str(row.sender_name or "").strip() or None,
        "last_message": last_message,
        "created_at": (
            row.created_at.isoformat() if row.created_at is not None else ""
        ),
        "telegram_chat_id": str(metadata.get("telegram_chat_id") or "").strip() or None,
        "telegram_username": str(metadata.get("telegram_username") or "").strip() or None,
        "booking_reference": str(metadata.get("booking_reference") or "").strip() or None,
        "support_handoff_failed": bool(
            metadata.get("support_handoff_failed") or care_status == "support_handoff_failed"
        ),
        "support_handoff_targets": int(handoff_block.get("targets") or 0),
        "support_handoff_delivered": int(handoff_block.get("delivered_count") or 0),
        "claimed_at": claimed_at,
        "claimed_by": claimed_by,
        "claim_active": _is_handoff_claim_active(claim_meta),
    }


def _is_handoff_claim_active(
    session_metadata: dict[str, object] | None,
    *,
    ttl_seconds: int = HANDOFF_CLAIM_TTL_SECONDS,
) -> bool:
    if not isinstance(session_metadata, dict):
        return False
    raw = str(session_metadata.get("handoff_claimed_at") or "").strip()
    if not raw:
        return False
    try:
        recorded_at = datetime.fromisoformat(raw)
    except ValueError:
        return False
    if recorded_at.tzinfo is None:
        recorded_at = recorded_at.replace(tzinfo=UTC)
    return datetime.now(UTC) - recorded_at <= timedelta(seconds=ttl_seconds)


class HandoffAlreadyClaimedError(Exception):
    """Raised when an admin tries to claim a conversation already actively claimed
    by a different admin within the TTL window. Carries the existing claim metadata
    so the route layer can return 409 with a useful body."""

    def __init__(
        self,
        *,
        claimed_by: str,
        claimed_at: str,
    ) -> None:
        super().__init__(f"Conversation already claimed by {claimed_by} at {claimed_at}")
        self.claimed_by = claimed_by
        self.claimed_at = claimed_at


async def claim_pending_handoff(
    session,
    *,
    conversation_id: str,
    channel: str = "telegram",
    claimed_by: str,
) -> dict[str, object] | None:
    """Persist `handoff_claimed_at` + `handoff_claimed_by` on the
    MessagingChannelSession metadata so the bot's `_is_handoff_claimed`
    suppression branch fires for follow-up customer messages.

    Returns None when no MessagingChannelSession row exists for the
    (channel, conversation_id) pair — the route turns this into 404.

    Raises HandoffAlreadyClaimedError when the conversation is already
    actively claimed by a different admin within the TTL window. Re-claiming
    the same conversation under the SAME username is a no-op refresh.
    """
    normalized_conversation_id = str(conversation_id or "").strip()
    if not normalized_conversation_id:
        return None
    result = await session.execute(
        select(MessagingChannelSession)
        .where(MessagingChannelSession.channel == channel)
        .where(MessagingChannelSession.conversation_id == normalized_conversation_id)
    )
    rows = result.scalars().all()
    row = rows[0] if rows else None
    if row is None:
        return None
    existing = row.metadata_json if isinstance(row.metadata_json, dict) else {}
    normalized_claimed_by = str(claimed_by or "").strip() or "admin"
    if _is_handoff_claim_active(existing):
        existing_claimed_by = str(existing.get("handoff_claimed_by") or "").strip()
        existing_claimed_at = str(existing.get("handoff_claimed_at") or "").strip()
        if existing_claimed_by and existing_claimed_by != normalized_claimed_by:
            raise HandoffAlreadyClaimedError(
                claimed_by=existing_claimed_by,
                claimed_at=existing_claimed_at,
            )
    claimed_at = datetime.now(UTC).isoformat()
    merged = {
        **existing,
        "handoff_claimed_at": claimed_at,
        "handoff_claimed_by": normalized_claimed_by,
    }
    row.metadata_json = merged
    row.last_ai_intent = "handoff_claimed"
    row.last_workflow_status = "answered"
    await session.flush()
    await session.commit()
    return {
        "conversation_id": normalized_conversation_id,
        "channel": channel,
        "claimed_at": claimed_at,
        "claimed_by": normalized_claimed_by,
        "ttl_seconds": HANDOFF_CLAIM_TTL_SECONDS,
    }


async def release_pending_handoff(
    session,
    *,
    conversation_id: str,
    channel: str = "telegram",
    released_by: str,
) -> dict[str, object] | None:
    """Clear `handoff_claimed_at` + `handoff_claimed_by` from the
    MessagingChannelSession metadata so the bot resumes auto-reply on the
    next customer message. Records `handoff_released_at` + `_by` for audit.

    Returns None when no MessagingChannelSession row exists for the
    (channel, conversation_id) pair — the route turns this into 404.
    """
    normalized_conversation_id = str(conversation_id or "").strip()
    if not normalized_conversation_id:
        return None
    result = await session.execute(
        select(MessagingChannelSession)
        .where(MessagingChannelSession.channel == channel)
        .where(MessagingChannelSession.conversation_id == normalized_conversation_id)
    )
    rows = result.scalars().all()
    row = rows[0] if rows else None
    if row is None:
        return None
    existing = row.metadata_json if isinstance(row.metadata_json, dict) else {}
    released_at = datetime.now(UTC).isoformat()
    normalized_released_by = str(released_by or "").strip() or "admin"
    merged = {
        key: value
        for key, value in existing.items()
        if key not in {"handoff_claimed_at", "handoff_claimed_by"}
    }
    merged["handoff_released_at"] = released_at
    merged["handoff_released_by"] = normalized_released_by
    row.metadata_json = merged
    row.last_ai_intent = "handoff_released"
    row.last_workflow_status = "answered"
    await session.flush()
    await session.commit()
    return {
        "conversation_id": normalized_conversation_id,
        "channel": channel,
        "released_at": released_at,
        "released_by": normalized_released_by,
    }


async def build_admin_pending_handoffs_payload(
    session,
    *,
    limit: int = 60,
    hours: int = HANDOFF_LOOKBACK_HOURS_DEFAULT,
    include_claimed: bool = False,
) -> dict[str, object]:
    limit = max(1, min(int(limit), 200))
    hours = max(1, min(int(hours), HANDOFF_LOOKBACK_HOURS_MAX))
    cutoff = datetime.now(UTC) - timedelta(hours=hours)

    statement = (
        select(ConversationEvent)
        .where(ConversationEvent.created_at >= cutoff)
        .where(
            ConversationEvent.ai_intent.in_(
                ["support_handoff", "support_handoff_failed"]
            )
        )
        .order_by(desc(ConversationEvent.created_at))
        .limit(limit * 4)  # over-fetch to filter out non-handoff rows in Python
    )
    result = await session.execute(statement)
    rows = result.scalars().all()

    candidate_rows: list[ConversationEvent] = []
    seen_keys: set[str] = set()
    for row in rows:
        metadata = _handoff_metadata_payload(row.metadata_json)
        if not _is_handoff_event(metadata, row.ai_intent):
            continue
        # De-dupe by conversation_id — show the newest handoff per conversation only.
        key = str(row.conversation_id or row.id)
        if key in seen_keys:
            continue
        seen_keys.add(key)
        candidate_rows.append(row)
        if len(candidate_rows) >= limit:
            break

    # Bulk-load MessagingChannelSession rows so we can surface claim metadata + suppress
    # claimed conversations from the queue without an N+1.
    conversation_keys = {
        str(row.conversation_id or "").strip()
        for row in candidate_rows
        if str(row.conversation_id or "").strip()
    }
    session_metadata_by_key: dict[tuple[str, str], dict[str, object]] = {}
    if conversation_keys:
        sessions_result = await session.execute(
            select(MessagingChannelSession)
            .where(MessagingChannelSession.conversation_id.in_(conversation_keys))
        )
        for session_row in sessions_result.scalars().all():
            channel_key = str(session_row.channel or "").strip().lower()
            conv_key = str(session_row.conversation_id or "").strip()
            if not conv_key:
                continue
            session_metadata_by_key[(channel_key, conv_key)] = (
                session_row.metadata_json
                if isinstance(session_row.metadata_json, dict)
                else {}
            )

    items: list[dict[str, object]] = []
    claimed_count = 0
    for row in candidate_rows:
        channel_key = str(row.source or "").strip().lower() or "telegram"
        conv_key = str(row.conversation_id or "").strip()
        session_metadata = session_metadata_by_key.get((channel_key, conv_key)) or {}
        if _is_handoff_claim_active(session_metadata):
            claimed_count += 1
            if not include_claimed:
                # Default behavior — only surface unclaimed work so two admins
                # don't double-claim. Frontend can opt in to see claimed rows
                # by passing include_claimed=1.
                continue
        items.append(_build_pending_handoff_item(row, session_metadata=session_metadata))

    failed_count = sum(
        1
        for item in items
        if item.get("support_handoff_failed") and not item.get("claim_active")
    )
    pending_count = sum(
        1 for item in items if not item.get("claim_active") and not item.get("support_handoff_failed")
    )
    return {
        "status": "ok",
        "items": items,
        "total": len(items),
        "pending_count": pending_count,
        "failed_count": failed_count,
        "claimed_count": claimed_count,
    }
