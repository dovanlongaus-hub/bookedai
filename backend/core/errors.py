from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


@dataclass
class AppError(Exception):
    code: str
    message: str
    status_code: int = 400
    details: dict[str, Any] = field(default_factory=dict)


class ValidationAppError(AppError):
    def __init__(self, message: str, *, details: dict[str, Any] | None = None) -> None:
        super().__init__(
            code="validation_error",
            message=message,
            status_code=422,
            details=details or {},
        )


class IntegrationAppError(AppError):
    def __init__(
        self,
        message: str,
        *,
        provider: str,
        details: dict[str, Any] | None = None,
        status_code: int = 502,
    ) -> None:
        payload = {"provider": provider}
        if details:
            payload.update(details)
        super().__init__(
            code="integration_error",
            message=message,
            status_code=status_code,
            details=payload,
        )


class PaymentAppError(AppError):
    def __init__(self, message: str, *, details: dict[str, Any] | None = None) -> None:
        super().__init__(
            code="payment_error",
            message=message,
            status_code=409,
            details=details or {},
        )


class BookingTrustAppError(AppError):
    def __init__(self, message: str, *, details: dict[str, Any] | None = None) -> None:
        super().__init__(
            code="booking_trust_error",
            message=message,
            status_code=409,
            details=details or {},
        )


class SyncAppError(AppError):
    def __init__(self, message: str, *, details: dict[str, Any] | None = None) -> None:
        super().__init__(
            code="sync_error",
            message=message,
            status_code=409,
            details=details or {},
        )


def serialize_error(error: AppError) -> dict[str, Any]:
    return {
        "error": {
            "code": error.code,
            "message": error.message,
            "details": error.details,
        }
    }

