from __future__ import annotations

import json
import os
from collections.abc import AsyncIterator
from typing import Any

import httpx
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse


def _env(name: str, default: str = "") -> str:
    return (os.getenv(name) or default).strip()


BOOKEDAI_INTERNAL_API_BASE_URL = _env(
    "BOOKEDAI_INTERNAL_API_BASE_URL",
    "http://backend:8000/api/internal/v1",
).rstrip("/")
BOOKEDAI_INTERNAL_TOKEN = _env("BOOKEDAI_INTERNAL_TOKEN", "bookedai-mvp-internal-dummy")
BOOKEDAI_PUBLIC_API_BASE_URL = _env(
    "BOOKEDAI_PUBLIC_API_BASE_URL",
    "http://backend:8000/api",
).rstrip("/")
BRIDGE_SHARED_TOKEN = _env("OPENCLAW_BRIDGE_SHARED_TOKEN", "bookedai-openclaw-bridge-dummy")
REQUEST_TIMEOUT_SECONDS = float(_env("OPENCLAW_BRIDGE_REQUEST_TIMEOUT_SECONDS", "25"))
STREAM_TIMEOUT_SECONDS = float(_env("OPENCLAW_BRIDGE_PUBLIC_STREAM_TIMEOUT_SECONDS", "300"))
ALLOWED_PREFIXES = tuple(
    segment.strip().strip("/")
    for segment in _env(
        "OPENCLAW_BRIDGE_ALLOWED_PREFIXES",
        "booking,search,communications,integrations",
    ).split(",")
    if segment.strip()
)

_DEFAULT_CORS = (
    "http://localhost:3000,http://127.0.0.1:3000,"
    "http://localhost:5173,http://127.0.0.1:5173"
)


def _cors_allow_origins() -> list[str]:
    raw = _env("OPENCLAW_BRIDGE_CORS_ORIGINS", _DEFAULT_CORS)
    if raw == "*":
        return ["*"]
    return [o.strip() for o in raw.split(",") if o.strip()]


app = FastAPI(title="BookedAI OpenClaw Internal API Bridge", version="0.1.0")
_cors_origins = _cors_allow_origins()
app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials="*" not in _cors_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _verify_bridge_token(request: Request) -> None:
    auth_header = request.headers.get("authorization", "")
    bearer = auth_header[7:].strip() if auth_header.startswith("Bearer ") else ""
    alt = (request.headers.get("x-openclaw-bridge-token") or "").strip()
    token = bearer or alt
    if token != BRIDGE_SHARED_TOKEN:
        raise HTTPException(status_code=401, detail={"error": "unauthorized"})


def _ensure_allowed_path(path: str) -> str:
    normalized = path.strip().lstrip("/")
    if not normalized:
        raise HTTPException(status_code=400, detail={"error": "path_required"})
    if ALLOWED_PREFIXES and not any(
        normalized == prefix or normalized.startswith(f"{prefix}/")
        for prefix in ALLOWED_PREFIXES
    ):
        raise HTTPException(
            status_code=403,
            detail={"error": "path_not_allowed", "path": normalized},
        )
    return normalized


def _ensure_public_booking_path(path: str) -> str:
    normalized = path.strip().lstrip("/")
    if not normalized.startswith("booking-assistant/"):
        raise HTTPException(status_code=404, detail={"error": "path_not_found"})
    return normalized


def _forward_headers(request: Request) -> dict[str, str]:
    out: dict[str, str] = {}
    accept = request.headers.get("accept")
    if accept:
        out["Accept"] = accept
    content_type = request.headers.get("content-type")
    if content_type:
        out["Content-Type"] = content_type
    return out


@app.get("/healthz")
async def healthz() -> dict[str, Any]:
    return {
        "status": "ok",
        "target": BOOKEDAI_INTERNAL_API_BASE_URL,
        "public_upstream": BOOKEDAI_PUBLIC_API_BASE_URL,
        "allowed_prefixes": list(ALLOWED_PREFIXES),
    }


@app.api_route("/bookedai/{path:path}", methods=["GET", "POST", "PUT", "PATCH", "DELETE"])
async def proxy_to_bookedai(path: str, request: Request):
    _verify_bridge_token(request)
    normalized_path = _ensure_allowed_path(path)
    upstream_url = f"{BOOKEDAI_INTERNAL_API_BASE_URL}/{normalized_path}"

    query_params = dict(request.query_params)
    request_body: Any | None = None
    if request.method in {"POST", "PUT", "PATCH", "DELETE"}:
        try:
            request_body = await request.json()
        except Exception:
            request_body = None

    headers = {
        "Authorization": f"Bearer {BOOKEDAI_INTERNAL_TOKEN}",
        "Content-Type": "application/json",
    }

    try:
        async with httpx.AsyncClient(timeout=REQUEST_TIMEOUT_SECONDS) as client:
            response = await client.request(
                request.method,
                upstream_url,
                params=query_params,
                json=request_body,
                headers=headers,
            )
    except httpx.HTTPError as exc:
        raise HTTPException(
            status_code=502,
            detail={"error": "upstream_unreachable", "message": str(exc)},
        ) from exc

    if not response.content:
        return JSONResponse(status_code=response.status_code, content={})

    try:
        payload = response.json()
    except ValueError:
        payload = {"raw": response.text}
    return JSONResponse(status_code=response.status_code, content=payload)


@app.api_route("/public/{path:path}", methods=["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE"])
async def public_booking_assistant_proxy(path: str, request: Request):
    """Browser-facing entry: main booking-assistant traffic through the OpenClaw bridge."""
    normalized_path = _ensure_public_booking_path(path)
    upstream_url = f"{BOOKEDAI_PUBLIC_API_BASE_URL}/{normalized_path}"
    query_params = dict(request.query_params)
    fwd = _forward_headers(request)

    is_stream = normalized_path == "booking-assistant/chat/stream" and request.method == "POST"

    if is_stream:
        body = await request.body()

        async def stream_body() -> AsyncIterator[bytes]:
            timeout = httpx.Timeout(STREAM_TIMEOUT_SECONDS, connect=30.0)
            try:
                async with httpx.AsyncClient(timeout=timeout) as client:
                    async with client.stream(
                        "POST",
                        upstream_url,
                        params=query_params,
                        content=body,
                        headers=fwd,
                    ) as upstream:
                        if upstream.status_code >= 400:
                            msg = json.dumps(
                                {"type": "token", "text": "Booking assistant stream upstream error."}
                            )
                            yield f"data: {msg}\n\n".encode()
                            return
                        async for chunk in upstream.aiter_bytes():
                            yield chunk
            except httpx.HTTPError:
                msg = json.dumps({"type": "token", "text": "Upstream chat stream unavailable."})
                yield f"data: {msg}\n\n".encode()

        return StreamingResponse(
            stream_body(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "X-Accel-Buffering": "no",
            },
        )

    raw_body: bytes | None = None
    if request.method in {"POST", "PUT", "PATCH", "DELETE"}:
        raw_body = await request.body()

    request_kwargs: dict[str, Any] = {}
    if raw_body:
        ct = (fwd.get("Content-Type") or "").lower()
        if "application/json" in ct:
            try:
                request_kwargs["json"] = json.loads(raw_body.decode())
            except (json.JSONDecodeError, UnicodeDecodeError):
                request_kwargs["content"] = raw_body
        else:
            request_kwargs["content"] = raw_body

    try:
        async with httpx.AsyncClient(timeout=REQUEST_TIMEOUT_SECONDS) as client:
            response = await client.request(
                request.method,
                upstream_url,
                params=query_params,
                headers=fwd,
                **request_kwargs,
            )
    except httpx.HTTPError as exc:
        raise HTTPException(
            status_code=502,
            detail={"error": "upstream_unreachable", "message": str(exc)},
        ) from exc

    if not response.content:
        return JSONResponse(status_code=response.status_code, content={})

    try:
        payload = response.json()
    except ValueError:
        payload = {"raw": response.text}
    return JSONResponse(status_code=response.status_code, content=payload)
