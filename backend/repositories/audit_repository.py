from __future__ import annotations

import json

from sqlalchemy import text

from repositories.base import BaseRepository


class AuditLogRepository(BaseRepository):
    """Repository seam for audit trail writes and later audit queries."""

    async def append_entry(
        self,
        *,
        event_type: str,
        entity_type: str | None = None,
        entity_id: str | None = None,
        actor_type: str | None = None,
        actor_id: str | None = None,
        payload: dict[str, object] | None = None,
        tenant_id: str | None = None,
    ) -> int | None:
        tenant_ref = self.effective_tenant_ref(tenant_id)
        result = await self.session.execute(
            text(
                f"""
                insert into audit_logs (
                  tenant_id,
                  actor_type,
                  actor_id,
                  event_type,
                  entity_type,
                  entity_id,
                  payload
                )
                values (
                  {self.tenant_lookup_sql()} ,
                  :actor_type,
                  :actor_id,
                  :event_type,
                  :entity_type,
                  :entity_id,
                  cast(:payload as jsonb)
                )
                returning id
                """
            ),
            {
                "tenant_ref": tenant_ref,
                "actor_type": (actor_type or "").strip() or None,
                "actor_id": (actor_id or "").strip() or None,
                "event_type": event_type.strip(),
                "entity_type": (entity_type or "").strip() or None,
                "entity_id": (entity_id or "").strip() or None,
                "payload": json.dumps(payload or {}),
            },
        )
        return result.scalar_one_or_none()

    async def list_recent_entries(
        self,
        *,
        tenant_id: str | None = None,
        limit: int = 50,
        event_type: str | None = None,
    ) -> list[dict[str, object | None]]:
        tenant_ref = self.effective_tenant_ref(tenant_id)
        result = await self.session.execute(
            text(
                f"""
                select
                  id,
                  tenant_id::text as tenant_id,
                  actor_type,
                  actor_id,
                  event_type,
                  entity_type,
                  entity_id,
                  payload,
                  created_at
                from audit_logs
                where (
                  cast(:tenant_ref as text) is null
                  or tenant_id = {self.tenant_lookup_sql()}
                )
                  and (
                    cast(:event_type as text) is null
                    or event_type = :event_type
                  )
                order by created_at desc, id desc
                limit :limit
                """
            ),
            {
                "tenant_ref": tenant_ref,
                "limit": limit,
                "event_type": (event_type or "").strip() or None,
            },
        )
        return [dict(row) for row in result.mappings().all()]
