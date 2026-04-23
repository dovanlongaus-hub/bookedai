from __future__ import annotations

import json

from repositories.audit_repository import AuditLogRepository
from repositories.base import RepositoryContext
from repositories.email_repository import EmailRepository
from repositories.outbox_repository import OutboxRepository
from service_layer.lifecycle_ops_service import execute_crm_sync_retry
from sqlalchemy import text


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
