from __future__ import annotations

from dataclasses import dataclass

from core.contracts.common import SafeProviderConfigSummary, SyncJobResult


@dataclass
class ProviderAdapter:
    provider_name: str

    def safe_summary(self, configured_fields: list[str] | None = None) -> SafeProviderConfigSummary:
        return SafeProviderConfigSummary(
            provider=self.provider_name,
            enabled=bool(configured_fields),
            configured_fields=configured_fields or [],
        )

    def pending_result(self, detail: str | None = None) -> SyncJobResult:
        return SyncJobResult(status="pending", detail=detail)

