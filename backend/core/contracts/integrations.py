from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field

from core.contracts.common import ReconciliationResult, SafeProviderConfigSummary, SyncJobResult


SyncMode = Literal["read_only", "write_back", "bidirectional"]


class ExternalEntityMappingContract(BaseModel):
    provider: str
    local_entity_type: str
    local_entity_id: str
    external_entity_id: str
    local_entity_label: str | None = None
    external_entity_type: str | None = None
    sync_state: str = "pending"


class IntegrationConfigSummaryContract(BaseModel):
    provider: str
    sync_mode: SyncMode = "read_only"
    safe_config: SafeProviderConfigSummary
    enabled: bool = True
    label: str | None = None
    capabilities: list[str] = Field(default_factory=list)


class IntegrationSyncContract(BaseModel):
    job: SyncJobResult
    reconciliation: ReconciliationResult | None = None
    mappings: list[ExternalEntityMappingContract] = Field(default_factory=list)
    sync_mode: SyncMode = "read_only"
    completed_at: str | None = None
    provider_message: str | None = None
