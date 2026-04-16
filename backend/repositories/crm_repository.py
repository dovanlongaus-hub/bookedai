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
                  provider,
                  sync_status,
                  local_entity_id,
                  external_entity_id,
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
                    last_synced_at = case
                      when :last_synced_at is null then last_synced_at
                      else cast(:last_synced_at as timestamptz)
                    end
                where tenant_id = cast(:tenant_id as uuid)
                  and id = :crm_sync_record_id
                """
            ),
            {
                "tenant_id": tenant_id,
                "crm_sync_record_id": crm_sync_record_id,
                "sync_status": sync_status,
                "external_entity_id": external_entity_id,
                "last_synced_at": datetime.now(timezone.utc).isoformat() if mark_synced else None,
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
