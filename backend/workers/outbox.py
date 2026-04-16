from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field


class OutboxEvent(BaseModel):
    event_type: str
    aggregate_id: str | None = None
    tenant_id: str | None = None
    payload: dict[str, Any] = Field(default_factory=dict)
    idempotency_key: str | None = None

