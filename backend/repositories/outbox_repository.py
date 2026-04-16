from __future__ import annotations

from repositories.base import BaseRepository


class OutboxRepository(BaseRepository):
    """Repository seam for outbox event writes and retry-safe dispatch lookup."""

