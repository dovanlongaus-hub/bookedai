from __future__ import annotations

import json

from sqlalchemy import text

from repositories.base import BaseRepository


class WebhookEventRepository(BaseRepository):
    """Repository seam for inbound webhook logging and processing state."""

    async def record_event(
        self,
        *,
        provider: str,
        external_event_id: str | None = None,
        payload: dict[str, object] | None = None,
        status: str = "received",
        tenant_id: str | None = None,
    ) -> int | None:
        tenant_ref = self.effective_tenant_ref(tenant_id)
        result = await self.session.execute(
            text(
                f"""
                insert into webhook_events (
                  tenant_id,
                  provider,
                  external_event_id,
                  payload,
                  status
                )
                values (
                  {self.tenant_lookup_sql()},
                  :provider,
                  :external_event_id,
                  cast(:payload as jsonb),
                  :status
                )
                returning id
                """
            ),
            {
                "tenant_ref": tenant_ref,
                "provider": provider.strip(),
                "external_event_id": (external_event_id or "").strip() or None,
                "payload": json.dumps(payload or {}),
                "status": status.strip() or "received",
            },
        )
        return result.scalar_one_or_none()

    async def mark_processed(
        self,
        event_id: int,
        *,
        status: str = "processed",
    ) -> None:
        await self.session.execute(
            text(
                """
                update webhook_events
                set
                  status = :status,
                  processed_at = case when :status = 'processed' then now() else processed_at end
                where id = :event_id
                """
            ),
            {
                "event_id": event_id,
                "status": status.strip() or "processed",
            },
        )

    async def list_pending_events(
        self,
        *,
        provider: str | None = None,
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
                  provider,
                  external_event_id,
                  payload,
                  status,
                  received_at,
                  processed_at
                from webhook_events
                where status <> 'processed'
                  and (:provider is null or provider = :provider)
                  and (
                    :tenant_ref is null
                    or tenant_id = {self.tenant_lookup_sql()}
                  )
                order by received_at asc, id asc
                limit :limit
                """
            ),
            {
                "tenant_ref": tenant_ref,
                "provider": (provider or "").strip() or None,
                "limit": limit,
            },
        )
        return [dict(row) for row in result.mappings().all()]
