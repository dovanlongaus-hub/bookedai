from __future__ import annotations

from sqlalchemy import desc, func, select

from db import ConversationEvent
from repositories.base import BaseRepository


class ConversationRepository(BaseRepository):
    """Foundation seam for conversation and message persistence."""

    async def list_booking_feed_events(self) -> list[ConversationEvent]:
        result = await self.session.execute(
            select(ConversationEvent)
            .where(
                ConversationEvent.event_type.in_(
                    ["booking_session_created", "booking_callback"]
                )
            )
            .order_by(desc(ConversationEvent.created_at))
        )
        return list(result.scalars().all())

    async def list_recent_events(self, *, limit: int = 8) -> list[ConversationEvent]:
        normalized_limit = max(limit, 1)
        result = await self.session.execute(
            select(ConversationEvent)
            .order_by(desc(ConversationEvent.created_at))
            .limit(normalized_limit)
        )
        return list(result.scalars().all())

    async def count_events_by_type(self, event_type: str) -> int:
        normalized_event_type = event_type.strip()
        if not normalized_event_type:
            return 0

        result = await self.session.execute(
            select(func.count())
            .select_from(ConversationEvent)
            .where(ConversationEvent.event_type == normalized_event_type)
        )
        return int(result.scalar_one() or 0)

    async def list_events_by_conversation_id(
        self,
        conversation_id: str,
    ) -> list[ConversationEvent]:
        normalized_conversation_id = conversation_id.strip()
        if not normalized_conversation_id:
            return []

        result = await self.session.execute(
            select(ConversationEvent)
            .where(ConversationEvent.conversation_id == normalized_conversation_id)
            .order_by(desc(ConversationEvent.created_at))
        )
        return list(result.scalars().all())

    async def get_latest_demo_brief_event(
        self,
        brief_reference: str,
    ) -> ConversationEvent | None:
        normalized_reference = brief_reference.strip()
        if not normalized_reference:
            return None

        result = await self.session.execute(
            select(ConversationEvent)
            .where(
                ConversationEvent.event_type == "demo_brief_submitted",
                ConversationEvent.conversation_id == normalized_reference,
            )
            .order_by(desc(ConversationEvent.created_at))
            .limit(1)
        )
        return result.scalars().first()

    async def get_latest_synced_demo_booking_event(
        self,
        booking_id: str,
    ) -> ConversationEvent | None:
        normalized_booking_id = booking_id.strip()
        if not normalized_booking_id:
            return None

        result = await self.session.execute(
            select(ConversationEvent)
            .where(
                ConversationEvent.event_type == "demo_booking_synced",
                ConversationEvent.conversation_id == normalized_booking_id,
            )
            .order_by(desc(ConversationEvent.created_at))
            .limit(1)
        )
        return result.scalars().first()
