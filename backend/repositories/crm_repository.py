from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import text

from repositories.base import BaseRepository


class CrmSyncRepository(BaseRepository):
    """Foundation seam for CRM sync records and reconciliation state."""

    async def get_sync_record(
        self,
        *,
        tenant_id: str,
        crm_sync_record_id: int,
    ) -> dict[str, object | None] | None:
        result = await self.session.execute(
            text(
                """
                select
                  id,
                  entity_type,
                  provider,
                  sync_status,
                  local_entity_id,
                  external_entity_id,
                  payload,
                  last_synced_at,
                  created_at
                from crm_sync_records
                where tenant_id = cast(:tenant_id as uuid)
                  and id = :crm_sync_record_id
                """
            ),
            {
                "tenant_id": tenant_id,
                "crm_sync_record_id": crm_sync_record_id,
            },
        )
        row = result.mappings().first()
        return dict(row) if row else None

    async def get_latest_sync_record_for_entity(
        self,
        *,
        tenant_id: str,
        entity_type: str,
        local_entity_id: str,
        provider: str = "zoho_crm",
    ) -> dict[str, object | None] | None:
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
                  record.entity_type,
                  record.provider,
                  record.sync_status,
                  record.local_entity_id,
                  record.external_entity_id,
                  record.payload,
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
                  and record.provider = :provider
                  and record.entity_type = :entity_type
                  and record.local_entity_id = :local_entity_id
                order by coalesce(record.last_synced_at, record.created_at) desc, record.id desc
                limit 1
                """
            ),
            {
                "tenant_id": tenant_id,
                "entity_type": entity_type,
                "local_entity_id": local_entity_id,
                "provider": provider,
            },
        )
        row = result.mappings().first()
        return dict(row) if row else None

    async def create_sync_record(
        self,
        *,
        tenant_id: str,
        entity_type: str,
        local_entity_id: str,
        provider: str = "zoho_crm",
        sync_status: str = "pending",
        payload_json: str = "{}",
    ) -> int | None:
        result = await self.session.execute(
            text(
                """
                insert into crm_sync_records (
                  tenant_id,
                  entity_type,
                  local_entity_id,
                  provider,
                  sync_status,
                  payload
                )
                values (
                  cast(:tenant_id as uuid),
                  :entity_type,
                  :local_entity_id,
                  :provider,
                  :sync_status,
                  cast(:payload_json as jsonb)
                )
                returning id
                """
            ),
            {
                "tenant_id": tenant_id,
                "entity_type": entity_type,
                "local_entity_id": local_entity_id,
                "provider": provider,
                "sync_status": sync_status,
                "payload_json": payload_json,
            },
        )
        return result.scalar_one_or_none()

    async def record_sync_error(
        self,
        *,
        tenant_id: str,
        crm_sync_record_id: int,
        error_code: str | None,
        error_message: str,
        retryable: bool = False,
        payload_json: str = "{}",
    ) -> None:
        await self.session.execute(
            text(
                """
                insert into crm_sync_errors (
                  tenant_id,
                  crm_sync_record_id,
                  error_code,
                  error_message,
                  retryable,
                  payload
                )
                values (
                  cast(:tenant_id as uuid),
                  :crm_sync_record_id,
                  :error_code,
                  :error_message,
                  :retryable,
                  cast(:payload_json as jsonb)
                )
                """
            ),
            {
                "tenant_id": tenant_id,
                "crm_sync_record_id": crm_sync_record_id,
                "error_code": error_code,
                "error_message": error_message,
                "retryable": retryable,
                "payload_json": payload_json,
            },
        )

    async def update_sync_record_status(
        self,
        *,
        tenant_id: str,
        crm_sync_record_id: int,
        sync_status: str,
        external_entity_id: str | None = None,
        mark_synced: bool = False,
    ) -> None:
        await self.session.execute(
            text(
                """
                update crm_sync_records
                set sync_status = :sync_status,
                    external_entity_id = coalesce(:external_entity_id, external_entity_id),
                    last_synced_at = coalesce(cast(:last_synced_at as timestamptz), last_synced_at)
                where tenant_id = cast(:tenant_id as uuid)
                  and id = :crm_sync_record_id
                """
            ),
            {
                "tenant_id": tenant_id,
                "crm_sync_record_id": crm_sync_record_id,
                "sync_status": sync_status,
                "external_entity_id": external_entity_id,
                "last_synced_at": datetime.now(timezone.utc) if mark_synced else None,
            },
        )

    async def mark_retrying(
        self,
        *,
        tenant_id: str,
        crm_sync_record_id: int,
    ) -> None:
        await self.update_sync_record_status(
            tenant_id=tenant_id,
            crm_sync_record_id=crm_sync_record_id,
            sync_status="retrying",
        )

    async def get_deal_feedback_summary(
        self,
        *,
        tenant_id: str,
        provider: str = "zoho_crm",
        limit: int = 8,
    ) -> dict[str, object]:
        summary_result = await self.session.execute(
            text(
                """
                select
                  count(*) filter (where lower(coalesce(payload->>'outcome', '')) = 'won')::int as won_count,
                  count(*) filter (where lower(coalesce(payload->>'outcome', '')) = 'lost')::int as lost_count,
                  count(*) filter (where coalesce(payload->>'stage', '') <> '')::int as stage_signal_count,
                  count(*) filter (
                    where lower(coalesce(payload->>'task_completed', 'false')) in ('true', '1', 'yes')
                  )::int as completed_task_count,
                  coalesce(
                    sum(
                      case
                        when lower(coalesce(payload->>'outcome', '')) = 'won'
                        then round(coalesce((payload->>'amount_aud')::numeric, 0) * 100)
                        else 0
                      end
                    ),
                    0
                  )::bigint as won_revenue_cents
                from crm_sync_records
                where tenant_id = cast(:tenant_id as uuid)
                  and provider = :provider
                  and entity_type = 'deal_feedback'
                """
            ),
            {
                "tenant_id": tenant_id,
                "provider": provider,
            },
        )
        summary_row = summary_result.mappings().first() or {}

        owner_result = await self.session.execute(
            text(
                """
                select
                  coalesce(nullif(payload->>'owner_name', ''), 'Unassigned') as owner_name,
                  count(*)::int as total_count,
                  count(*) filter (where lower(coalesce(payload->>'outcome', '')) = 'won')::int as won_count,
                  count(*) filter (where lower(coalesce(payload->>'outcome', '')) = 'lost')::int as lost_count,
                  coalesce(
                    sum(
                      case
                        when lower(coalesce(payload->>'outcome', '')) = 'won'
                        then round(coalesce((payload->>'amount_aud')::numeric, 0) * 100)
                        else 0
                      end
                    ),
                    0
                  )::bigint as won_revenue_cents
                from crm_sync_records
                where tenant_id = cast(:tenant_id as uuid)
                  and provider = :provider
                  and entity_type = 'deal_feedback'
                group by coalesce(nullif(payload->>'owner_name', ''), 'Unassigned')
                order by won_revenue_cents desc, won_count desc, total_count desc, owner_name asc
                limit 6
                """
            ),
            {
                "tenant_id": tenant_id,
                "provider": provider,
            },
        )
        owner_items = [dict(row) for row in owner_result.mappings().all()]

        lost_reason_result = await self.session.execute(
            text(
                """
                select
                  coalesce(nullif(payload->>'lost_reason', ''), 'Unspecified') as lost_reason,
                  count(*)::int as lost_count
                from crm_sync_records
                where tenant_id = cast(:tenant_id as uuid)
                  and provider = :provider
                  and entity_type = 'deal_feedback'
                  and lower(coalesce(payload->>'outcome', '')) = 'lost'
                group by coalesce(nullif(payload->>'lost_reason', ''), 'Unspecified')
                order by lost_count desc, lost_reason asc
                limit 6
                """
            ),
            {
                "tenant_id": tenant_id,
                "provider": provider,
            },
        )
        lost_reason_items = [dict(row) for row in lost_reason_result.mappings().all()]

        stage_result = await self.session.execute(
            text(
                """
                select
                  coalesce(nullif(payload->>'stage', ''), 'Unknown') as stage,
                  count(*)::int as stage_count
                from crm_sync_records
                where tenant_id = cast(:tenant_id as uuid)
                  and provider = :provider
                  and entity_type = 'deal_feedback'
                group by coalesce(nullif(payload->>'stage', ''), 'Unknown')
                order by stage_count desc, stage asc
                limit 8
                """
            ),
            {
                "tenant_id": tenant_id,
                "provider": provider,
            },
        )
        stage_items = [dict(row) for row in stage_result.mappings().all()]

        recent_result = await self.session.execute(
            text(
                """
                select
                  id,
                  local_entity_id,
                  external_entity_id,
                  sync_status,
                  payload->>'outcome' as outcome,
                  payload->>'stage' as stage,
                  payload->>'owner_name' as owner_name,
                  payload->>'source_label' as source_label,
                  payload->>'closed_at' as closed_at,
                  payload->>'lost_reason' as lost_reason,
                  lower(coalesce(payload->>'task_completed', 'false')) in ('true', '1', 'yes') as task_completed,
                  payload->>'task_completed_at' as task_completed_at,
                  payload->>'stage_changed_at' as stage_changed_at,
                  round(coalesce((payload->>'amount_aud')::numeric, 0) * 100)::bigint as amount_cents,
                  coalesce(last_synced_at, created_at) as occurred_at
                from crm_sync_records
                where tenant_id = cast(:tenant_id as uuid)
                  and provider = :provider
                  and entity_type = 'deal_feedback'
                order by coalesce(last_synced_at, created_at) desc, id desc
                limit :limit
                """
            ),
            {
                "tenant_id": tenant_id,
                "provider": provider,
                "limit": limit,
            },
        )
        recent_items = [dict(row) for row in recent_result.mappings().all()]
        won_count = int(summary_row.get("won_count") or 0)
        lost_count = int(summary_row.get("lost_count") or 0)
        total_count = won_count + lost_count
        return {
            "summary": {
                "won_count": won_count,
                "lost_count": lost_count,
                "won_revenue_cents": int(summary_row.get("won_revenue_cents") or 0),
                "feedback_count": total_count,
                "win_rate": (won_count / total_count) if total_count else 0,
                "stage_signal_count": int(summary_row.get("stage_signal_count") or 0),
                "completed_task_count": int(summary_row.get("completed_task_count") or 0),
            },
            "owner_performance": owner_items,
            "lost_reasons": lost_reason_items,
            "stage_breakdown": stage_items,
            "items": recent_items,
        }
