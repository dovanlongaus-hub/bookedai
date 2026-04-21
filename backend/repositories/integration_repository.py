from __future__ import annotations

import json

from sqlalchemy import text

from repositories.base import BaseRepository


class IntegrationRepository(BaseRepository):
    """Read-oriented seam for integration connection health and reconciliation status."""

    async def list_recent_runtime_activity(
        self,
        *,
        tenant_id: str,
        limit: int = 12,
    ) -> list[dict[str, object | None]]:
        per_source_limit = max(1, min(limit, 12))
        result = await self.session.execute(
            text(
                """
                with recent_jobs as (
                  select
                    'job_runs' as source,
                    id::text as item_id,
                    job_name as title,
                    status,
                    detail,
                    attempt_count,
                    created_at as occurred_at,
                    started_at,
                    finished_at,
                    null::text as external_ref
                  from job_runs
                  where tenant_id = cast(:tenant_id as uuid)
                  order by coalesce(finished_at, started_at, created_at) desc
                  limit :per_source_limit
                ),
                recent_webhooks as (
                  select
                    'webhook_events' as source,
                    id::text as item_id,
                    provider as title,
                    status,
                    null::text as detail,
                    null::int as attempt_count,
                    received_at as occurred_at,
                    received_at as started_at,
                    processed_at as finished_at,
                    external_event_id as external_ref
                  from webhook_events
                  where tenant_id = cast(:tenant_id as uuid)
                  order by received_at desc
                  limit :per_source_limit
                ),
                recent_outbox as (
                  select
                    'outbox_events' as source,
                    id::text as item_id,
                    event_type as title,
                    status,
                    coalesce(last_error, aggregate_type) as detail,
                    attempt_count,
                    created_at as occurred_at,
                    available_at as started_at,
                    processed_at as finished_at,
                    idempotency_key as external_ref
                  from outbox_events
                  where tenant_id = cast(:tenant_id as uuid)
                  order by created_at desc
                  limit :per_source_limit
                )
                select *
                from (
                  select * from recent_jobs
                  union all
                  select * from recent_webhooks
                  union all
                  select * from recent_outbox
                ) as runtime_activity
                order by occurred_at desc nulls last
                limit :limit
                """
            ),
            {
                "tenant_id": tenant_id,
                "per_source_limit": per_source_limit,
                "limit": limit,
            },
        )
        return [dict(row._mapping) for row in result]

    async def list_outbox_backlog(
        self,
        *,
        tenant_id: str,
        limit: int = 8,
    ) -> list[dict[str, object | None]]:
        result = await self.session.execute(
            text(
                """
                select
                  id,
                  event_type,
                  aggregate_type,
                  aggregate_id,
                  status,
                  attempt_count,
                  last_error,
                  last_error_at,
                  processed_at,
                  available_at,
                  idempotency_key,
                  created_at
                from outbox_events
                where tenant_id = cast(:tenant_id as uuid)
                  and status in ('failed', 'retrying', 'pending')
                order by
                  case status
                    when 'failed' then 0
                    when 'retrying' then 1
                    when 'pending' then 2
                    else 3
                  end,
                  coalesce(last_error_at, available_at, created_at) desc,
                  id desc
                limit :limit
                """
            ),
            {
                "tenant_id": tenant_id,
                "limit": limit,
            },
        )
        return [dict(row._mapping) for row in result]

    async def list_crm_retry_backlog(
        self,
        *,
        tenant_id: str,
        limit: int = 8,
    ) -> list[dict[str, object | None]]:
        result = await self.session.execute(
            text(
                """
                with latest_errors as (
                  select distinct on (crm_sync_record_id)
                    crm_sync_record_id,
                    error_code,
                    error_message,
                    retryable,
                    created_at
                  from crm_sync_errors
                  where tenant_id = cast(:tenant_id as uuid)
                  order by crm_sync_record_id, created_at desc
                ),
                retry_counts as (
                  select
                    crm_sync_record_id,
                    count(*) filter (where error_code = 'retry_queued')::int as retry_count
                  from crm_sync_errors
                  where tenant_id = cast(:tenant_id as uuid)
                  group by crm_sync_record_id
                )
                select
                  record.id,
                  record.provider,
                  record.entity_type,
                  record.local_entity_id,
                  record.external_entity_id,
                  record.sync_status,
                  record.last_synced_at,
                  record.created_at,
                  latest.error_code as latest_error_code,
                  latest.error_message as latest_error_message,
                  latest.retryable as latest_error_retryable,
                  latest.created_at as latest_error_at,
                  coalesce(retry_counts.retry_count, 0)::int as retry_count
                from crm_sync_records as record
                left join latest_errors as latest
                  on latest.crm_sync_record_id = record.id
                left join retry_counts
                  on retry_counts.crm_sync_record_id = record.id
                where record.tenant_id = cast(:tenant_id as uuid)
                  and record.sync_status in ('retrying', 'failed', 'manual_review_required', 'conflict')
                order by
                  case record.sync_status
                    when 'failed' then 0
                    when 'conflict' then 1
                    when 'manual_review_required' then 2
                    when 'retrying' then 3
                    else 4
                  end,
                  coalesce(latest.created_at, record.created_at) desc
                limit :limit
                """
            ),
            {
                "tenant_id": tenant_id,
                "limit": limit,
            },
        )
        return [dict(row._mapping) for row in result]

    async def list_connections(
        self,
        *,
        tenant_id: str,
    ) -> list[dict[str, object | None]]:
        result = await self.session.execute(
            text(
                """
                select
                  provider,
                  sync_mode,
                  status,
                  settings_json,
                  updated_at,
                  created_at
                from integration_connections
                where tenant_id = cast(:tenant_id as uuid)
                order by provider asc
                """
            ),
            {"tenant_id": tenant_id},
        )
        return [dict(row._mapping) for row in result]

    async def upsert_connection(
        self,
        *,
        tenant_id: str,
        provider: str,
        status: str,
        sync_mode: str,
        settings_json: dict[str, object] | None = None,
    ) -> dict[str, object | None]:
        normalized_provider = provider.strip().lower()
        existing_result = await self.session.execute(
            text(
                """
                select settings_json
                from integration_connections
                where tenant_id = cast(:tenant_id as uuid)
                  and provider = :provider
                limit 1
                """
            ),
            {
                "tenant_id": tenant_id,
                "provider": normalized_provider,
            },
        )
        existing_row = existing_result.mappings().first()
        effective_settings = settings_json
        if effective_settings is None:
            existing_settings = existing_row.get("settings_json") if existing_row else None
            effective_settings = dict(existing_settings) if isinstance(existing_settings, dict) else {}

        if existing_row:
            result = await self.session.execute(
                text(
                    """
                    update integration_connections
                    set
                      status = :status,
                      sync_mode = :sync_mode,
                      settings_json = cast(:settings_json as jsonb),
                      updated_at = now()
                    where tenant_id = cast(:tenant_id as uuid)
                      and provider = :provider
                    returning
                      provider,
                      sync_mode,
                      status,
                      settings_json,
                      updated_at,
                      created_at
                    """
                ),
                {
                    "tenant_id": tenant_id,
                    "provider": normalized_provider,
                    "status": status,
                    "sync_mode": sync_mode,
                    "settings_json": json.dumps(effective_settings),
                },
            )
        else:
            result = await self.session.execute(
                text(
                    """
                    insert into integration_connections (
                      tenant_id,
                      provider,
                      sync_mode,
                      status,
                      settings_json
                    )
                    values (
                      cast(:tenant_id as uuid),
                      :provider,
                      :sync_mode,
                      :status,
                      cast(:settings_json as jsonb)
                    )
                    returning
                      provider,
                      sync_mode,
                      status,
                      settings_json,
                      updated_at,
                      created_at
                    """
                ),
                {
                    "tenant_id": tenant_id,
                    "provider": normalized_provider,
                    "status": status,
                    "sync_mode": sync_mode,
                    "settings_json": json.dumps(effective_settings),
                },
            )
        row = result.mappings().first()
        return dict(row) if row else {}

    async def summarize_reconciliation(
        self,
        *,
        tenant_id: str,
    ) -> dict[str, object | None]:
        job_runs = await self.session.execute(
            text(
                """
                select
                  count(*)::int as total_jobs,
                  count(*) filter (where status = 'failed')::int as failed_jobs,
                  max(created_at) as last_job_created_at
                from job_runs
                where tenant_id = cast(:tenant_id as uuid)
                """
            ),
            {"tenant_id": tenant_id},
        )
        webhook_events = await self.session.execute(
            text(
                """
                select
                  count(*)::int as total_webhooks,
                  count(*) filter (where status <> 'processed')::int as pending_webhooks,
                  max(received_at) as last_webhook_received_at
                from webhook_events
                where tenant_id = cast(:tenant_id as uuid)
                """
            ),
            {"tenant_id": tenant_id},
        )
        outbox_events = await self.session.execute(
            text(
                """
                select
                  count(*)::int as total_outbox,
                  count(*) filter (where status <> 'processed')::int as pending_outbox,
                  max(created_at) as last_outbox_created_at
                from outbox_events
                where tenant_id = cast(:tenant_id as uuid)
                """
            ),
            {"tenant_id": tenant_id},
        )

        job_summary = job_runs.mappings().first() or {}
        webhook_summary = webhook_events.mappings().first() or {}
        outbox_summary = outbox_events.mappings().first() or {}

        return {
          "total_jobs": job_summary.get("total_jobs", 0),
          "failed_jobs": job_summary.get("failed_jobs", 0),
          "last_job_created_at": job_summary.get("last_job_created_at"),
          "total_webhooks": webhook_summary.get("total_webhooks", 0),
          "pending_webhooks": webhook_summary.get("pending_webhooks", 0),
          "last_webhook_received_at": webhook_summary.get("last_webhook_received_at"),
          "total_outbox": outbox_summary.get("total_outbox", 0),
          "pending_outbox": outbox_summary.get("pending_outbox", 0),
          "last_outbox_created_at": outbox_summary.get("last_outbox_created_at"),
        }

    async def list_attention_items(
        self,
        *,
        tenant_id: str,
    ) -> list[dict[str, object | None]]:
        crm_sync = await self.session.execute(
            text(
                """
                select
                  'crm_sync' as source,
                  sync_status as issue_type,
                  count(*)::int as item_count,
                  max(created_at) as latest_at
                from crm_sync_records
                where tenant_id = cast(:tenant_id as uuid)
                  and sync_status in ('failed', 'retrying', 'manual_review_required', 'conflict')
                group by sync_status
                """
            ),
            {"tenant_id": tenant_id},
        )
        email_attention = await self.session.execute(
            text(
                """
                select
                  'email_messages' as source,
                  status as issue_type,
                  count(*)::int as item_count,
                  max(created_at) as latest_at
                from email_messages
                where tenant_id = cast(:tenant_id as uuid)
                  and status in ('failed', 'manual_review_required')
                group by status
                """
            ),
            {"tenant_id": tenant_id},
        )
        failed_jobs = await self.session.execute(
            text(
                """
                select
                  'job_runs' as source,
                  'failed' as issue_type,
                  count(*)::int as item_count,
                  max(created_at) as latest_at
                from job_runs
                where tenant_id = cast(:tenant_id as uuid)
                  and status = 'failed'
                """
            ),
            {"tenant_id": tenant_id},
        )
        pending_webhooks = await self.session.execute(
            text(
                """
                select
                  'webhook_events' as source,
                  'pending' as issue_type,
                  count(*)::int as item_count,
                  max(received_at) as latest_at
                from webhook_events
                where tenant_id = cast(:tenant_id as uuid)
                  and status <> 'processed'
                """
            ),
            {"tenant_id": tenant_id},
        )
        pending_outbox = await self.session.execute(
            text(
                """
                select
                  'outbox_events' as source,
                  'pending' as issue_type,
                  count(*)::int as item_count,
                  max(created_at) as latest_at
                from outbox_events
                where tenant_id = cast(:tenant_id as uuid)
                  and status <> 'processed'
                """
            ),
            {"tenant_id": tenant_id},
        )

        items = [*crm_sync.mappings().all(), *email_attention.mappings().all()]
        job_row = failed_jobs.mappings().first()
        webhook_row = pending_webhooks.mappings().first()
        outbox_row = pending_outbox.mappings().first()
        if job_row and int(job_row.get("item_count") or 0) > 0:
            items.append(job_row)
        if webhook_row and int(webhook_row.get("item_count") or 0) > 0:
            items.append(webhook_row)
        if outbox_row and int(outbox_row.get("item_count") or 0) > 0:
            items.append(outbox_row)
        return [dict(item) for item in items if int(item.get("item_count") or 0) > 0]

    async def reconciliation_details(
        self,
        *,
        tenant_id: str,
    ) -> list[dict[str, object | None]]:
        crm_detail = await self.session.execute(
            text(
                """
                select
                  'crm_sync' as area,
                  count(*)::int as total_count,
                  count(*) filter (where sync_status in ('pending', 'retrying'))::int as pending_count,
                  count(*) filter (where sync_status = 'manual_review_required')::int as manual_review_count,
                  count(*) filter (where sync_status in ('failed', 'conflict'))::int as failed_count,
                  max(created_at) as latest_at
                from crm_sync_records
                where tenant_id = cast(:tenant_id as uuid)
                """
            ),
            {"tenant_id": tenant_id},
        )
        email_detail = await self.session.execute(
            text(
                """
                select
                  'email_lifecycle' as area,
                  count(*)::int as total_count,
                  count(*) filter (where status in ('queued', 'sent'))::int as pending_count,
                  count(*) filter (where status = 'manual_review_required')::int as manual_review_count,
                  count(*) filter (where status = 'failed')::int as failed_count,
                  max(created_at) as latest_at
                from email_messages
                where tenant_id = cast(:tenant_id as uuid)
                """
            ),
            {"tenant_id": tenant_id},
        )
        job_detail = await self.session.execute(
            text(
                """
                select
                  'background_jobs' as area,
                  count(*)::int as total_count,
                  count(*) filter (where status <> 'processed')::int as pending_count,
                  0::int as manual_review_count,
                  count(*) filter (where status = 'failed')::int as failed_count,
                  max(created_at) as latest_at
                from job_runs
                where tenant_id = cast(:tenant_id as uuid)
                """
            ),
            {"tenant_id": tenant_id},
        )
        webhook_detail = await self.session.execute(
            text(
                """
                select
                  'webhook_ingestion' as area,
                  count(*)::int as total_count,
                  count(*) filter (where status <> 'processed')::int as pending_count,
                  0::int as manual_review_count,
                  0::int as failed_count,
                  max(received_at) as latest_at
                from webhook_events
                where tenant_id = cast(:tenant_id as uuid)
                """
            ),
            {"tenant_id": tenant_id},
        )
        outbox_detail = await self.session.execute(
            text(
                """
                select
                  'outbox_delivery' as area,
                  count(*)::int as total_count,
                  count(*) filter (where status <> 'processed')::int as pending_count,
                  0::int as manual_review_count,
                  count(*) filter (where status = 'failed')::int as failed_count,
                  max(created_at) as latest_at
                from outbox_events
                where tenant_id = cast(:tenant_id as uuid)
                """
            ),
            {"tenant_id": tenant_id},
        )

        return [
            dict((crm_detail.mappings().first() or {})),
            dict((email_detail.mappings().first() or {})),
            dict((job_detail.mappings().first() or {})),
            dict((webhook_detail.mappings().first() or {})),
            dict((outbox_detail.mappings().first() or {})),
        ]
