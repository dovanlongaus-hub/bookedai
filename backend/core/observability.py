from __future__ import annotations

from contextvars import ContextVar
from time import perf_counter
from uuid import uuid4

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

from core.errors import AppError, serialize_error
from core.logging import get_logger

request_id_context: ContextVar[str | None] = ContextVar("request_id", default=None)
tenant_id_context: ContextVar[str | None] = ContextVar("tenant_id", default=None)

logger = get_logger("bookedai.observability")


class CorrelationIdMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        request_id = request.headers.get("X-Request-Id") or str(uuid4())
        token = request_id_context.set(request_id)
        request.state.request_id = request_id

        start = perf_counter()
        response = None
        try:
            response = await call_next(request)
        finally:
            request_id_context.reset(token)

        if response is None:
            raise RuntimeError("Request pipeline returned no response")

        duration_ms = round((perf_counter() - start) * 1000, 2)
        response.headers["X-Request-Id"] = request_id
        logger.info(
            "request_completed",
            extra={
                "request_id": request_id,
                "route": request.url.path,
                "status": getattr(response, "status_code", 500),
                "event_type": "request_completed",
                "integration_name": "",
                "tenant_id": getattr(request.state, "tenant_id", None),
                "conversation_id": "",
                "booking_reference": "",
                "job_name": "",
                "job_id": "",
            },
        )
        response.headers["X-Response-Time-Ms"] = str(duration_ms)
        return response


def get_request_id() -> str | None:
    return request_id_context.get()


def set_tenant_id(tenant_id: str | None) -> None:
    tenant_id_context.set(tenant_id)


def register_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(AppError)
    async def handle_app_error(request: Request, error: AppError) -> JSONResponse:
        logger.warning(
            "application_error",
            extra={
                "request_id": getattr(request.state, "request_id", None),
                "route": request.url.path,
                "status": error.status_code,
                "event_type": error.code,
                "integration_name": error.details.get("provider", ""),
                "tenant_id": getattr(request.state, "tenant_id", None),
                "conversation_id": error.details.get("conversation_id", ""),
                "booking_reference": error.details.get("booking_reference", ""),
                "job_name": "",
                "job_id": "",
            },
        )
        return JSONResponse(status_code=error.status_code, content=serialize_error(error))
