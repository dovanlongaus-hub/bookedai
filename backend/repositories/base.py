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
