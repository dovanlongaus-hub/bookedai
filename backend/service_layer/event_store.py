from __future__ import annotations

from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from db import ConversationEvent
from schemas import TawkMessage


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
