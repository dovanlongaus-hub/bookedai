from __future__ import annotations

from repositories.base import BaseRepository


class IdempotencyRepository(BaseRepository):
    """Repository seam for webhook and external-callback dedupe records."""

