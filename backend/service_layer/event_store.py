from __future__ import annotations

from datetime import UTC, datetime, timedelta
from typing import Any

from sqlalchemy import delete
from sqlalchemy.ext.asyncio import AsyncSession

from db import ConversationEvent
from schemas import TawkMessage


async def purge_expired_whatsapp_conversations(
    session: AsyncSession,
    *,
    retention_days: int = 60,
) -> int:
    cutoff = datetime.now(UTC) - timedelta(days=retention_days)
    result = await session.execute(
        delete(ConversationEvent)
        .where(ConversationEvent.source == "whatsapp")
        .where(ConversationEvent.created_at < cutoff)
    )
    await session.commit()
    return result.rowcount or 0


async def store_event(
    session: AsyncSession,
    *,
    source: str,
    event_type: str,
    message: TawkMessage,
    ai_intent: str | None,
    ai_reply: str | None,
    workflow_status: str | None,
    metadata: dict[str, Any],
) -> None:
    session.add(
        ConversationEvent(
            source=source,
            event_type=event_type,
            conversation_id=message.conversation_id,
            sender_name=message.sender_name,
            sender_email=message.sender_email,
            message_text=message.text,
            ai_intent=ai_intent,
            ai_reply=ai_reply,
            workflow_status=workflow_status,
            metadata_json=metadata,
        )
    )
    await session.commit()
