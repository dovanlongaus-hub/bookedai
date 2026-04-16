from __future__ import annotations

from sqlalchemy import text

from repositories.base import BaseRepository


class ContactRepository(BaseRepository):
    """Repository seam for normalized contact identity persistence."""

    async def upsert_contact(
        self,
        *,
        tenant_id: str | None = None,
        full_name: str | None = None,
        email: str | None = None,
        phone: str | None = None,
        primary_channel: str | None = None,
    ) -> str | None:
        effective_tenant_id = tenant_id or self.tenant_id
        normalized_email = (email or "").strip().lower() or None
        normalized_phone = (phone or "").strip() or None
        if not effective_tenant_id or (not normalized_email and not normalized_phone):
            return None

        lookup_result = await self.session.execute(
            text(
                """
                select id::text
                from contacts
                where tenant_id = :tenant_id
                  and (
                    (:email is not null and lower(coalesce(email, '')) = :email)
                    or (:phone is not null and phone = :phone)
                  )
                order by created_at asc
                limit 1
                """
            ),
            {
                "tenant_id": effective_tenant_id,
                "email": normalized_email,
                "phone": normalized_phone,
            },
        )
        existing_id = lookup_result.scalar_one_or_none()

        if existing_id:
            await self.session.execute(
                text(
                    """
                    update contacts
                    set
                      full_name = coalesce(:full_name, full_name),
                      email = coalesce(:email, email),
                      phone = coalesce(:phone, phone),
                      primary_channel = coalesce(:primary_channel, primary_channel),
                      updated_at = now()
                    where id = cast(:contact_id as uuid)
                    """
                ),
                {
                    "contact_id": existing_id,
                    "full_name": (full_name or "").strip() or None,
                    "email": normalized_email,
                    "phone": normalized_phone,
                    "primary_channel": (primary_channel or "").strip() or None,
                },
            )
            return existing_id

        insert_result = await self.session.execute(
            text(
                """
                insert into contacts (
                  tenant_id,
                  full_name,
                  email,
                  phone,
                  primary_channel
                )
                values (
                  :tenant_id,
                  :full_name,
                  :email,
                  :phone,
                  :primary_channel
                )
                returning id::text
                """
            ),
            {
                "tenant_id": effective_tenant_id,
                "full_name": (full_name or "").strip() or None,
                "email": normalized_email,
                "phone": normalized_phone,
                "primary_channel": (primary_channel or "").strip() or None,
            },
        )
        return insert_result.scalar_one_or_none()
