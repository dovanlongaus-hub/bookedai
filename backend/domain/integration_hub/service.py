from __future__ import annotations

from core.contracts.common import SyncJobResult


class IntegrationHubService:
    """Foundation seam for provider mapping, sync strategy, and reconciliation orchestration."""

    def build_sync_result(self, *, status: str, detail: str | None = None) -> SyncJobResult:
        return SyncJobResult(status=status, detail=detail)

