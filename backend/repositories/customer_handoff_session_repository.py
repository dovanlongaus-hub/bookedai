from __future__ import annotations

from datetime import UTC, datetime, timedelta
from secrets import token_urlsafe
from typing import Any

from sqlalchemy import select

from db import CustomerHandoffSession
from repositories.base import BaseRepository


# Short TTL — a tap-to-Telegram handoff that hasn't been picked up after 1h
# almost certainly won't be (user moved on). Keeps the table small without
# needing a janitor job.
DEFAULT_HANDOFF_SESSION_TTL_SECONDS = 60 * 60


class CustomerHandoffSessionRepository(BaseRepository):
    async def create(
        self,
        *,
        source: str,
        payload: dict[str, Any],
        ttl_seconds: int = DEFAULT_HANDOFF_SESSION_TTL_SECONDS,
    ) -> CustomerHandoffSession:
        # 16 bytes URL-safe random ≈ 22 chars. Telegram /start payload is
        # capped at 64 chars after the `hsess_` prefix → plenty of room.
        session_id = token_urlsafe(16)
        normalized_source = (source or "").strip().lower() or "product_homepage"
        clean_payload = payload if isinstance(payload, dict) else {}
        bounded_ttl = max(60, min(int(ttl_seconds or 0) or DEFAULT_HANDOFF_SESSION_TTL_SECONDS, 60 * 60 * 24))
        row = CustomerHandoffSession(
            id=session_id,
            source=normalized_source,
            payload_json=clean_payload,
            expires_at=datetime.now(UTC) + timedelta(seconds=bounded_ttl),
        )
        self.session.add(row)
        await self.session.flush()
        return row

    async def get_active(self, session_id: str) -> CustomerHandoffSession | None:
        cleaned = (session_id or "").strip()
        if not cleaned:
            return None
        result = await self.session.execute(
            select(CustomerHandoffSession).where(CustomerHandoffSession.id == cleaned)
        )
        row = result.scalar_one_or_none()
        if row is None:
            return None
        if row.consumed_at is not None:
            return None
        expires_at = row.expires_at
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=UTC)
        if datetime.now(UTC) >= expires_at:
            return None
        return row

    async def mark_consumed(
        self,
        session_id: str,
        *,
        chat_id: str | None = None,
    ) -> CustomerHandoffSession | None:
        row = await self.get_active(session_id)
        if row is None:
            return None
        row.consumed_at = datetime.now(UTC)
        row.consumed_by_chat_id = (chat_id or "").strip() or None
        await self.session.flush()
        return row
