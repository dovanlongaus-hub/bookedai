from __future__ import annotations

from sqlalchemy import text

from repositories.base import BaseRepository


class IntegrationRepository(BaseRepository):
    """Read-oriented seam for integration connection health and reconciliation status."""

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
