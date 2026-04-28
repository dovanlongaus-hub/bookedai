from __future__ import annotations

from datetime import UTC, datetime, timedelta
from secrets import token_urlsafe
from typing import Any

from sqlalchemy import func, select

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

    async def summarize_since(
        self, *, since: datetime
    ) -> dict[str, Any]:
        """Aggregate counts since `since` for the admin metrics endpoint.

        Returns minted/consumed/expired-and-unconsumed totals plus a per-source
        breakdown so ops can see which surface drives handoff conversion. Single
        query — `created_at >= since` is the table's index path so this stays
        cheap even as the table grows.
        """
        now = datetime.now(UTC)
        result = await self.session.execute(
            select(
                CustomerHandoffSession.source,
                func.count(CustomerHandoffSession.id).label("minted"),
                func.count(CustomerHandoffSession.consumed_at).label("consumed"),
            )
            .where(CustomerHandoffSession.created_at >= since)
            .group_by(CustomerHandoffSession.source)
        )
        rows = result.all()
        by_source: dict[str, dict[str, int]] = {}
        minted_total = 0
        consumed_total = 0
        for source, minted, consumed in rows:
            label = (source or "").strip() or "unknown"
            minted_int = int(minted or 0)
            consumed_int = int(consumed or 0)
            by_source[label] = {"minted": minted_int, "consumed": consumed_int}
            minted_total += minted_int
            consumed_total += consumed_int
        # Expired-unconsumed count: rows past expires_at that were never consumed.
        # Customers who tapped the link but never opened Telegram, or whose
        # session expired before the bot picked it up.
        expired_result = await self.session.execute(
            select(func.count(CustomerHandoffSession.id))
            .where(CustomerHandoffSession.created_at >= since)
            .where(CustomerHandoffSession.consumed_at.is_(None))
            .where(CustomerHandoffSession.expires_at < now)
        )
        expired_unconsumed = int(expired_result.scalar() or 0)
        return {
            "minted": minted_total,
            "consumed": consumed_total,
            "expired_unconsumed": expired_unconsumed,
            "by_source": by_source,
        }
