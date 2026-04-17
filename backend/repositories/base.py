from __future__ import annotations

from dataclasses import dataclass

from sqlalchemy.ext.asyncio import AsyncSession


@dataclass
class RepositoryContext:
    session: AsyncSession
    tenant_id: str | None = None


class BaseRepository:
    def __init__(self, context: RepositoryContext) -> None:
        self.context = context

    @property
    def session(self) -> AsyncSession:
        return self.context.session

    @property
    def tenant_id(self) -> str | None:
        return self.context.tenant_id

    @staticmethod
    def tenant_lookup_sql(param_name: str = "tenant_ref") -> str:
        return f"(select id from tenants where id::text = :{param_name} or slug = :{param_name} limit 1)"

    def effective_tenant_ref(self, tenant_id: str | None = None) -> str | None:
        return tenant_id or self.tenant_id
