from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class DomainResult(BaseModel):
    status: str = "ok"
    message: str | None = None
    code: str | None = None
    data: dict[str, Any] = Field(default_factory=dict)


class SafeProviderConfigSummary(BaseModel):
    provider: str
    enabled: bool = False
    label: str | None = None
    configured_fields: list[str] = Field(default_factory=list)
    notes: list[str] = Field(default_factory=list)


class SyncJobResult(BaseModel):
    status: str
    external_id: str | None = None
    detail: str | None = None
    provider: str | None = None
    synced_at: datetime | None = None
    error_code: str | None = None
    retryable: bool = False


class ReconciliationResult(BaseModel):
    status: str
    checked_at: datetime | None = None
    reconciled_at: datetime | None = None
    conflict_count: int = 0
    resolved_count: int = 0
    conflicts: list[str] = Field(default_factory=list)
    metadata: dict[str, Any] = Field(default_factory=dict)
