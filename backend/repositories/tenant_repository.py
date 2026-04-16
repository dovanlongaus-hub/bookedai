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
