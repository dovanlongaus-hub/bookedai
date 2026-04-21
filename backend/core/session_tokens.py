from __future__ import annotations

import base64
import hashlib
import hmac
import json
from datetime import UTC, datetime, timedelta
from typing import Any

from config import Settings


class SessionTokenError(ValueError):
    pass


def _config_value(cfg: Settings, name: str) -> str:
    value = getattr(cfg, name, "")
    return str(value or "")


def _sign_payload(secret: str, encoded_payload: str) -> str:
    return hmac.new(secret.encode(), encoded_payload.encode(), hashlib.sha256).hexdigest()


def create_signed_token(
    *,
    payload: dict[str, Any],
    secret: str,
    ttl_hours: int,
) -> tuple[str, datetime]:
    expires_at = datetime.now(UTC) + timedelta(hours=max(ttl_hours, 1))
    token_payload = dict(payload)
    token_payload["exp"] = int(expires_at.timestamp())
    encoded = base64.urlsafe_b64encode(
        json.dumps(token_payload, separators=(",", ":")).encode()
    ).decode()
    signature = _sign_payload(secret, encoded)
    return f"{encoded}.{signature}", expires_at


def verify_signed_token(token: str, *, secret: str, label: str) -> dict[str, Any]:
    if not token or "." not in token:
        raise SessionTokenError(f"Invalid {label}")

    encoded, provided_signature = token.rsplit(".", 1)
    expected_signature = _sign_payload(secret, encoded)
    if not hmac.compare_digest(provided_signature, expected_signature):
        raise SessionTokenError(f"Invalid {label}")

    padded = encoded + "=" * (-len(encoded) % 4)
    payload = json.loads(base64.urlsafe_b64decode(padded.encode()).decode())
    expires_at = int(payload.get("exp", 0))
    if expires_at <= int(datetime.now(UTC).timestamp()):
        raise SessionTokenError(f"{label.capitalize()} expired")
    return payload


def get_admin_session_secret(cfg: Settings) -> str:
    return (
        _config_value(cfg, "admin_session_signing_secret")
        or _config_value(cfg, "session_signing_secret")
        or _config_value(cfg, "admin_api_token")
        or _config_value(cfg, "admin_password")
    )


def get_tenant_session_secret(cfg: Settings) -> str:
    return (
        _config_value(cfg, "tenant_session_signing_secret")
        or _config_value(cfg, "session_signing_secret")
        or _config_value(cfg, "admin_session_signing_secret")
        or _config_value(cfg, "admin_api_token")
        or _config_value(cfg, "admin_password")
    )


def create_admin_session_token(cfg: Settings, username: str) -> tuple[str, datetime]:
    return create_signed_token(
        payload={"sub": username},
        secret=get_admin_session_secret(cfg),
        ttl_hours=cfg.admin_session_ttl_hours,
    )


def verify_admin_session_token(cfg: Settings, token: str) -> str:
    payload = verify_signed_token(
        token,
        secret=get_admin_session_secret(cfg),
        label="admin session",
    )
    username = str(payload.get("sub", "")).strip()
    if not username:
        raise SessionTokenError("Invalid admin session")
    return username


def create_tenant_session_token(
    cfg: Settings,
    *,
    email: str,
    tenant_ref: str,
    name: str | None,
    picture_url: str | None,
    google_sub: str | None,
) -> tuple[str, datetime]:
    return create_signed_token(
        payload={
            "sub": email,
            "tenant_ref": tenant_ref,
            "name": name,
            "picture_url": picture_url,
            "google_sub": google_sub,
        },
        secret=get_tenant_session_secret(cfg),
        ttl_hours=cfg.admin_session_ttl_hours,
    )


def verify_tenant_session_token(cfg: Settings, token: str) -> dict[str, str | None]:
    payload = verify_signed_token(
        token,
        secret=get_tenant_session_secret(cfg),
        label="tenant session",
    )
    email = str(payload.get("sub", "")).strip().lower()
    tenant_ref = str(payload.get("tenant_ref", "")).strip()
    if not email or not tenant_ref:
        raise SessionTokenError("Invalid tenant session")

    return {
        "email": email,
        "tenant_ref": tenant_ref,
        "name": str(payload.get("name") or "").strip() or None,
        "picture_url": str(payload.get("picture_url") or "").strip() or None,
        "google_sub": str(payload.get("google_sub") or "").strip() or None,
    }
