from __future__ import annotations

from sqlalchemy import text

from repositories.base import BaseRepository


class LeadRepository(BaseRepository):
    """Repository seam for normalized lead lifecycle persistence."""

    async def upsert_lead(
        self,
        *,
        tenant_id: str | None = None,
        contact_id: str | None = None,
        source: str | None = None,
        status: str = "new",
        qualification_score: float | None = None,
    ) -> str | None:
        effective_tenant_id = tenant_id or self.tenant_id
        normalized_contact_id = (contact_id or "").strip() or None
        normalized_source = (source or "").strip() or None
        if not effective_tenant_id:
            return None

        if normalized_contact_id:
            existing = await self.session.execute(
                text(
                    """
                    select id::text
                    from leads
                    where tenant_id = :tenant_id
                      and contact_id = cast(:contact_id as uuid)
                      and coalesce(source, '') = coalesce(:source, '')
                    order by created_at desc
                    limit 1
                    """
                ),
                {
                    "tenant_id": effective_tenant_id,
                    "contact_id": normalized_contact_id,
                    "source": normalized_source,
                },
            )
            existing_id = existing.scalar_one_or_none()
            if existing_id:
                await self.session.execute(
                    text(
                        """
                        update leads
                        set
                          status = :status,
                          qualification_score = coalesce(:qualification_score, qualification_score),
                          updated_at = now()
                        where id = cast(:lead_id as uuid)
                        """
                    ),
                    {
                        "lead_id": existing_id,
                        "status": status,
                        "qualification_score": qualification_score,
                    },
                )
                return existing_id

        insert_result = await self.session.execute(
            text(
                """
                insert into leads (
                  tenant_id,
                  contact_id,
                  source,
                  status,
                  qualification_score
                )
                values (
                  :tenant_id,
                  cast(:contact_id as uuid),
                  :source,
                  :status,
                  :qualification_score
                )
                returning id::text
                """
            ),
            {
                "tenant_id": effective_tenant_id,
                "contact_id": normalized_contact_id,
                "source": normalized_source,
                "status": status,
                "qualification_score": qualification_score,
            },
        )
        return insert_result.scalar_one_or_none()

    async def update_lead_status(
        self,
        *,
        tenant_id: str | None = None,
        contact_id: str,
        source: str | None = None,
        status: str,
    ) -> str | None:
        effective_tenant_id = tenant_id or self.tenant_id
        normalized_contact_id = contact_id.strip()
        normalized_status = status.strip()
        normalized_source = (source or "").strip() or None
        if not effective_tenant_id or not normalized_contact_id or not normalized_status:
            return None

        result = await self.session.execute(
            text(
                """
                update leads
                set
                  status = :status,
                  updated_at = now()
                where id = (
                  select id
                  from leads
                  where tenant_id = :tenant_id
                    and contact_id = cast(:contact_id as uuid)
                    and (
                      :source is null
                      or coalesce(source, '') = coalesce(:source, '')
                    )
                  order by created_at desc
                  limit 1
                )
                returning id::text
                """
            ),
            {
                "tenant_id": effective_tenant_id,
                "contact_id": normalized_contact_id,
                "source": normalized_source,
                "status": normalized_status,
            },
        )
        return result.scalar_one_or_none()
