from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Generic, Literal, TypeVar

from pydantic import BaseModel, Field


EnvelopeDataT = TypeVar("EnvelopeDataT")


class EnvelopeActorContract(BaseModel):
    actor_type: str | None = None
    actor_id: str | None = None


class EnvelopeMetaContract(BaseModel):
    version: str = "v1"
    request_id: str | None = None
    tenant_id: str | None = None
    actor: EnvelopeActorContract = Field(default_factory=EnvelopeActorContract)
    issued_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    trace_id: str | None = None


class PaginationMetaContract(BaseModel):
    limit: int | None = None
    offset: int | None = None
    total: int | None = None
    has_more: bool = False


class SuccessEnvelopeContract(BaseModel, Generic[EnvelopeDataT]):
    status: Literal["ok"] = "ok"
    data: EnvelopeDataT
    message: str | None = None
    meta: EnvelopeMetaContract = Field(default_factory=EnvelopeMetaContract)
    pagination: PaginationMetaContract | None = None


class ErrorDetailContract(BaseModel):
    code: str
    message: str
    details: dict[str, Any] = Field(default_factory=dict)


class ErrorEnvelopeContract(BaseModel):
    status: Literal["error"] = "error"
    error: ErrorDetailContract
    meta: EnvelopeMetaContract = Field(default_factory=EnvelopeMetaContract)
