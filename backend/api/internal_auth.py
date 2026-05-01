from __future__ import annotations

import os

from fastapi import Header, HTTPException, status


MVP_INTERNAL_DUMMY_TOKEN = "bookedai-mvp-internal-dummy"


def resolve_internal_token() -> str:
    configured = (os.getenv("BOOKEDAI_INTERNAL_TOKEN") or "").strip()
    return configured or MVP_INTERNAL_DUMMY_TOKEN


def require_internal_token(
    authorization: str | None = Header(default=None),
    x_bookedai_token: str | None = Header(default=None),
    x_bookedai_internal_token: str | None = Header(default=None),
) -> None:
    expected = resolve_internal_token()
    bearer_token = ""
    if authorization and authorization.startswith("Bearer "):
        bearer_token = authorization[7:].strip()

    token = bearer_token or (x_bookedai_token or "").strip() or (x_bookedai_internal_token or "").strip()
    if token != expected:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"error": "unauthorized"},
        )
