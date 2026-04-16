from __future__ import annotations

from repositories.base import BaseRepository


class AuditLogRepository(BaseRepository):
    """Repository seam for audit trail writes and later audit queries."""

