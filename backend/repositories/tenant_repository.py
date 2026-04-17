from __future__ import annotations

from dataclasses import dataclass

from sqlalchemy import text

from repositories.base import BaseRepository


@dataclass
class TenantSeedRecord:
    slug: str
    name: str
    timezone: str = "Australia/Sydney"
    locale: str = "en-AU"
    status: str = "active"


class TenantRepository(BaseRepository):
    """Repository seam for tenant anchor records and tenant settings."""

    @staticmethod
    def _tenant_filter_sql() -> str:
        return "id::text = :tenant_ref or slug = :tenant_ref"

    async def get_default_tenant_id(self) -> str | None:
        result = await self.session.execute(
            text(
                """
                select id::text
                from tenants
                where slug = 'default-production-tenant'
                limit 1
                """
            )
        )
        return result.scalar_one_or_none()

    async def resolve_tenant_id(self, tenant_ref: str | None) -> str | None:
        if not tenant_ref:
            return await self.get_default_tenant_id()

        result = await self.session.execute(
            text(
                f"""
                select id::text
                from tenants
                where {self._tenant_filter_sql()}
                limit 1
                """
            ),
            {"tenant_ref": tenant_ref},
        )
        return result.scalar_one_or_none()

    async def get_tenant_profile(self, tenant_ref: str | None) -> dict[str, str | None] | None:
        effective_tenant_id = await self.resolve_tenant_id(tenant_ref)
        if not effective_tenant_id:
            return None

        result = await self.session.execute(
            text(
                """
                select
                  id::text as id,
                  slug,
                  name,
                  status,
                  timezone,
                  locale,
                  industry
                from tenants
                where id = cast(:tenant_id as uuid)
                limit 1
                """
            ),
            {"tenant_id": effective_tenant_id},
        )
        row = result.mappings().first()
        if not row:
            return None

        return {
            "id": row["id"],
            "slug": row["slug"],
            "name": row["name"],
            "status": row["status"],
            "timezone": row["timezone"],
            "locale": row["locale"],
            "industry": row["industry"],
        }
