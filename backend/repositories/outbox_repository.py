from __future__ import annotations

import json
from datetime import datetime

from sqlalchemy import text

from repositories.base import BaseRepository


class OutboxRepository(BaseRepository):
    """Repository seam for outbox event writes and retry-safe dispatch lookup."""

    async def enqueue_event(
        self,
        *,
        event_type: str,
        aggregate_type: str | None = None,
        aggregate_id: str | None = None,
        payload: dict[str, object] | None = None,
        status: str = "pending",
        available_at: datetime | None = None,
        idempotency_key: str | None = None,
        tenant_id: str | None = None,
    ) -> int | None:
        tenant_ref = self.effective_tenant_ref(tenant_id)
        result = await self.session.execute(
            text(
                f"""
                insert into outbox_events (
                  tenant_id,
                  event_type,
                  aggregate_type,
                  aggregate_id,
                  payload,
                  status,
                  available_at,
                  idempotency_key
                )
                values (
                  {self.tenant_lookup_sql()},
                  :event_type,
                  :aggregate_type,
                  :aggregate_id,
                  cast(:payload as jsonb),
                  :status,
                  coalesce(:available_at, now()),
                  :idempotency_key
                )
                returning id
                """
            ),
            {
                "tenant_ref": tenant_ref,
                "event_type": event_type.strip(),
                "aggregate_type": (aggregate_type or "").strip() or None,
                "aggregate_id": (aggregate_id or "").strip() or None,
                "payload": json.dumps(payload or {}),
                "status": status.strip() or "pending",
                "available_at": available_at,
                "idempotency_key": (idempotency_key or "").strip() or None,
            },
        )
        return result.scalar_one_or_none()

    async def list_pending_events(
        self,
        *,
        tenant_id: str | None = None,
        limit: int = 50,
    ) -> list[dict[str, object | None]]:
        tenant_ref = self.effective_tenant_ref(tenant_id)
        result = await self.session.execute(
            text(
                f"""
                select
                  id,
                  tenant_id::text as tenant_id,
                  event_type,
                  aggregate_type,
                  aggregate_id,
                  payload,
                  status,
                  attempt_count,
                  last_error,
                  last_error_at,
                  processed_at,
                  available_at,
                  idempotency_key,
                  created_at
                from outbox_events
                where status in ('pending', 'retrying')
                  and available_at <= now()
                  and (
                    cast(:tenant_ref as text) is null
                    or tenant_id = {self.tenant_lookup_sql()}
                  )
                order by available_at asc, id asc
                limit :limit
                """
            ),
            {
                "tenant_ref": tenant_ref,
                "limit": limit,
            },
        )
        return [dict(row) for row in result.mappings().all()]

    async def update_event_status(
        self,
        event_id: int,
        *,
        status: str,
        error_detail: str | None = None,
        increment_attempt_count: bool = False,
    ) -> None:
        await self.session.execute(
            text(
                """
                update outbox_events
                set
                  status = :status,
                  attempt_count = case
                    when :increment_attempt_count then coalesce(attempt_count, 0) + 1
                    else attempt_count
                  end,
                  last_error = case
                    when :status = 'failed' then :last_error
                    when :status in ('processed', 'retrying') then null
                    else last_error
                  end,
                  last_error_at = case
                    when :status = 'failed' then now()
                    when :status in ('processed', 'retrying') then null
                    else last_error_at
                  end,
                  processed_at = case
                    when :status = 'processed' then now()
                    else processed_at
                  end
                where id = :event_id
                """
            ),
            {
                "event_id": event_id,
                "status": status.strip(),
                "last_error": (error_detail or "").strip() or None,
                "increment_attempt_count": increment_attempt_count,
            },
        )

    async def requeue_event(
        self,
        event_id: int,
        *,
        tenant_id: str | None = None,
    ) -> dict[str, object | None] | None:
        tenant_ref = self.effective_tenant_ref(tenant_id)
        result = await self.session.execute(
            text(
                f"""
                update outbox_events
                set
                  status = 'retrying',
                  available_at = now()
                where id = :event_id
                  and (
                    cast(:tenant_ref as text) is null
                    or tenant_id = {self.tenant_lookup_sql()}
                  )
                  and status in ('failed', 'retrying', 'pending')
                returning
                  id,
                  tenant_id::text as tenant_id,
                  event_type,
                  aggregate_type,
                  aggregate_id,
                  payload,
                  status,
                  attempt_count,
                  last_error,
                  last_error_at,
                  processed_at,
                  available_at,
                  idempotency_key,
                  created_at
                """
            ),
            {
                "event_id": event_id,
                "tenant_ref": tenant_ref,
            },
        )
        row = result.mappings().first()
        return dict(row) if row else None
