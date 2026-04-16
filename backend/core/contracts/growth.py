from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field


class LeadSourceContract(BaseModel):
    source: str
    medium: str | None = None
    campaign: str | None = None
    keyword: str | None = None
    content: str | None = None
    landing_path: str | None = None
    referrer: str | None = None


class AttributionContract(BaseModel):
    lead_source: LeadSourceContract
    utm: dict[str, str] = Field(default_factory=dict)
    referrer: str | None = None
    tenant_id: str | None = None
    capture_source: str | None = None


class LandingConversionContract(BaseModel):
    conversion_type: str
    landing_path: str
    attribution: AttributionContract
    occurred_at: str | None = None
    conversion_value_aud: float | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)
