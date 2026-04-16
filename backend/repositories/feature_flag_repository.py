from __future__ import annotations

from sqlalchemy import text

from repositories.base import BaseRepository


class FeatureFlagRepository(BaseRepository):
    """Repository seam for tenant-aware feature flag lookup."""

    @staticmethod
    def _tenant_filter_sql() -> str:
        return "tenant_id in (select id from tenants where id::text = :tenant_ref or slug = :tenant_ref)"

    async def get_flag(self, flag_key: str, *, tenant_id: str | None = None) -> bool | None:
        effective_tenant_id = tenant_id or self.tenant_id
        if not effective_tenant_id:
            return None

        result = await self.session.execute(
            text(
                f"""
                select enabled
                from feature_flags
                where ({self._tenant_filter_sql()}) and flag_key = :flag_key
                limit 1
                """
            ),
            {"tenant_ref": effective_tenant_id, "flag_key": flag_key},
        )
        value = result.scalar_one_or_none()
        return bool(value) if value is not None else None

    async def upsert_flag(
        self,
        flag_key: str,
        *,
        enabled: bool,
        tenant_id: str | None = None,
    ) -> None:
        effective_tenant_id = tenant_id or self.tenant_id
        if not effective_tenant_id:
            raise ValueError("tenant_id is required for feature flag writes")

        await self.session.execute(
            text(
                """
                insert into feature_flags (tenant_id, flag_key, enabled)
                values (
                    (select id from tenants where id::text = :tenant_ref or slug = :tenant_ref limit 1),
                    :flag_key,
                    :enabled
                )
                on conflict (tenant_id, flag_key)
                do update set enabled = excluded.enabled, updated_at = now()
                """
            ),
            {
                "tenant_ref": effective_tenant_id,
                "flag_key": flag_key,
                "enabled": enabled,
            },
        )
