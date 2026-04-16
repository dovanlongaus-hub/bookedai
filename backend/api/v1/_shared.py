from __future__ import annotations

from typing import TypeVar

from core.contracts.v1 import (
    EnvelopeActorContract,
    EnvelopeMetaContract,
    ErrorDetailContract,
    ErrorEnvelopeContract,
    PaginationMetaContract,
    SuccessEnvelopeContract,
)
from core.errors import AppError
from core.observability import get_request_id


EnvelopeDataT = TypeVar("EnvelopeDataT")


def envelope_meta_from_request(
    *,
    request_id: str | None = None,
    tenant_id: str | None = None,
    actor_type: str | None = None,
    actor_id: str | None = None,
    trace_id: str | None = None,
) -> EnvelopeMetaContract:
    return EnvelopeMetaContract(
        request_id=request_id or get_request_id(),
        tenant_id=tenant_id,
        actor=EnvelopeActorContract(actor_type=actor_type, actor_id=actor_id),
        trace_id=trace_id,
    )


def build_success_envelope(
    data: EnvelopeDataT,
    *,
    message: str | None = None,
    request_id: str | None = None,
    tenant_id: str | None = None,
    actor_type: str | None = None,
    actor_id: str | None = None,
    trace_id: str | None = None,
    pagination: PaginationMetaContract | None = None,
) -> SuccessEnvelopeContract[EnvelopeDataT]:
    return SuccessEnvelopeContract(
        data=data,
        message=message,
        meta=envelope_meta_from_request(
            request_id=request_id,
            tenant_id=tenant_id,
            actor_type=actor_type,
            actor_id=actor_id,
            trace_id=trace_id,
        ),
        pagination=pagination,
    )


def build_error_envelope(
    error: AppError,
    *,
    request_id: str | None = None,
    tenant_id: str | None = None,
    actor_type: str | None = None,
    actor_id: str | None = None,
    trace_id: str | None = None,
) -> ErrorEnvelopeContract:
    return ErrorEnvelopeContract(
        error=ErrorDetailContract(
            code=error.code,
            message=error.message,
            details=error.details,
        ),
        meta=envelope_meta_from_request(
            request_id=request_id,
            tenant_id=tenant_id,
            actor_type=actor_type,
            actor_id=actor_id,
            trace_id=trace_id,
        ),
    )


__all__ = [
    "build_error_envelope",
    "build_success_envelope",
    "envelope_meta_from_request",
]
