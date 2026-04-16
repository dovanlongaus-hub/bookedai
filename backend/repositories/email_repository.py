from __future__ import annotations

from sqlalchemy import text

from repositories.base import BaseRepository


class EmailRepository(BaseRepository):
    """Foundation seam for lifecycle email records and events."""

    async def create_message(
        self,
        *,
        tenant_id: str,
        message_id: str,
        contact_id: str | None = None,
        template_key: str | None = None,
        subject: str,
        provider: str | None = None,
        status: str = "queued",
    ) -> None:
        await self.session.execute(
            text(
                """
                insert into email_messages (
                  id,
                  tenant_id,
                  contact_id,
                  template_key,
                  subject,
                  provider,
                  status
                )
                values (
                  cast(:message_id as uuid),
                  cast(:tenant_id as uuid),
                  cast(:contact_id as uuid),
                  :template_key,
                  :subject,
                  :provider,
                  :status
                )
                """
            ),
            {
                "message_id": message_id,
                "tenant_id": tenant_id,
                "contact_id": contact_id,
                "template_key": template_key,
                "subject": subject,
                "provider": provider,
                "status": status,
            },
        )

    async def append_message_event(
        self,
        *,
        tenant_id: str,
        message_id: str,
        event_type: str,
        payload_json: str = "{}",
    ) -> None:
        await self.session.execute(
            text(
                """
                insert into email_events (
                  tenant_id,
                  email_message_id,
                  event_type,
                  payload
                )
                values (
                  cast(:tenant_id as uuid),
                  cast(:message_id as uuid),
                  :event_type,
                  cast(:payload_json as jsonb)
                )
                """
            ),
            {
                "tenant_id": tenant_id,
                "message_id": message_id,
                "event_type": event_type,
                "payload_json": payload_json,
            },
        )

    async def update_message_status(
        self,
        *,
        tenant_id: str,
        message_id: str,
        status: str,
    ) -> None:
        await self.session.execute(
            text(
                """
                update email_messages
                set status = :status
                where tenant_id = cast(:tenant_id as uuid)
                  and id = cast(:message_id as uuid)
                """
            ),
            {
                "tenant_id": tenant_id,
                "message_id": message_id,
                "status": status,
            },
        )
