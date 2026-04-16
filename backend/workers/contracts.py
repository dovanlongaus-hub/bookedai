from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field


class JobContext(BaseModel):
    job_id: str
    job_name: str
    tenant_id: str | None = None
    request_id: str | None = None


class JobResult(BaseModel):
    status: str
    detail: str | None = None
    retryable: bool = False
    metadata: dict[str, Any] = Field(default_factory=dict)


class RetryPolicy(BaseModel):
    max_attempts: int = 3
    backoff_seconds: int = 30

