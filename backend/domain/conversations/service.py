from __future__ import annotations

from core.contracts.common import DomainResult


class ConversationService:
    """Foundation seam for channel-agnostic conversation flows."""

    def acknowledge(self, conversation_id: str | None) -> DomainResult:
        if conversation_id:
            return DomainResult(message=f"conversation:{conversation_id}")
        return DomainResult(message="conversation:pending")

