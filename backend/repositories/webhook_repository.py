from __future__ import annotations

from repositories.base import BaseRepository


class WebhookEventRepository(BaseRepository):
    """Repository seam for inbound webhook logging and processing state."""

