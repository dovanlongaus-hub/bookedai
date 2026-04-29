"""Google Wallet save-URL builder for chess.bookedai.au orders.

Google Wallet exposes an "add to wallet" deep link of the form

    https://pay.google.com/gp/v/save/<jwt>

where ``<jwt>`` is an RS256-signed JSON Web Token whose payload describes
the wallet object(s) the user should receive. The payload references a
pre-created class ID (``GOOGLE_WALLET_EVENT_CLASS_ID``) and includes a
single ``eventTicketObject`` with the order data.

We sign the JWT using the service account private key from
``GOOGLE_WALLET_SERVICE_ACCOUNT_JSON`` (raw inline JSON) or
``GOOGLE_WALLET_SERVICE_ACCOUNT_JSON_PATH`` (filesystem path). Signing
uses the project's existing ``cryptography`` install, which is already
available transitively via Stripe webhook signature verification.

When credentials are missing / malformed / cryptography is not installed
the helper raises ``GoogleWalletNotConfiguredError`` so the caller can
return ``503`` with a stable error code.
"""

from __future__ import annotations

import base64
import json
import os
import time
from pathlib import Path
from typing import Any


class GoogleWalletNotConfiguredError(RuntimeError):
    """Raised when env / service account / class ID preconditions are not met."""


def _b64url_encode(value: bytes) -> str:
    return base64.urlsafe_b64encode(value).rstrip(b"=").decode("ascii")


def _env(key: str, default: str = "") -> str:
    return (os.getenv(key, default) or "").strip()


def _load_service_account() -> dict[str, str]:
    """Load the service account JSON from inline env or a file path."""
    raw = _env("GOOGLE_WALLET_SERVICE_ACCOUNT_JSON")
    if raw:
        try:
            data = json.loads(raw)
        except json.JSONDecodeError as exc:
            raise GoogleWalletNotConfiguredError(
                f"GOOGLE_WALLET_SERVICE_ACCOUNT_JSON is not valid JSON: {exc}"
            ) from exc
    else:
        path = _env("GOOGLE_WALLET_SERVICE_ACCOUNT_JSON_PATH")
        if not path:
            raise GoogleWalletNotConfiguredError(
                "Google Wallet service account not configured. Set "
                "GOOGLE_WALLET_SERVICE_ACCOUNT_JSON or "
                "GOOGLE_WALLET_SERVICE_ACCOUNT_JSON_PATH."
            )
        candidate = Path(path)
        if not candidate.exists():
            raise GoogleWalletNotConfiguredError(
                f"GOOGLE_WALLET_SERVICE_ACCOUNT_JSON_PATH does not exist: {path}"
            )
        try:
            data = json.loads(candidate.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError) as exc:
            raise GoogleWalletNotConfiguredError(
                f"Could not read service account JSON from {path}: {exc}"
            ) from exc

    if not isinstance(data, dict):
        raise GoogleWalletNotConfiguredError(
            "Google Wallet service account JSON must be an object."
        )
    client_email = (data.get("client_email") or "").strip()
    private_key = data.get("private_key") or ""
    if not client_email or not private_key:
        raise GoogleWalletNotConfiguredError(
            "Service account JSON is missing client_email or private_key."
        )
    return {"client_email": client_email, "private_key": private_key}


def _check_configured() -> dict[str, str]:
    issuer_id = _env("GOOGLE_WALLET_ISSUER_ID")
    class_id = _env("GOOGLE_WALLET_EVENT_CLASS_ID")
    missing: list[str] = []
    if not issuer_id:
        missing.append("GOOGLE_WALLET_ISSUER_ID")
    if not class_id:
        missing.append("GOOGLE_WALLET_EVENT_CLASS_ID")
    if missing:
        raise GoogleWalletNotConfiguredError(
            "Google Wallet env not configured. Missing: " + ", ".join(missing)
        )
    service_account = _load_service_account()
    return {
        "issuer_id": issuer_id,
        "class_id": class_id,
        "client_email": service_account["client_email"],
        "private_key": service_account["private_key"],
    }


def _rs256_sign(*, signing_input: bytes, private_key_pem: str) -> bytes:
    """RS256-sign ``signing_input`` with the service account private key.

    Uses ``cryptography`` because it ships transitively in the project's
    install set and supports unencrypted PKCS#1 / PKCS#8 PEM keys, which
    is what Google service account JSON delivers.
    """
    try:
        from cryptography.hazmat.primitives import hashes, serialization
        from cryptography.hazmat.primitives.asymmetric import padding, rsa
    except ImportError as exc:  # pragma: no cover - import-time guard
        raise GoogleWalletNotConfiguredError(
            "The `cryptography` package is required to sign Google Wallet JWTs. "
            "Add it to backend/requirements.txt."
        ) from exc

    try:
        key = serialization.load_pem_private_key(
            private_key_pem.encode("utf-8"),
            password=None,
        )
    except Exception as exc:  # noqa: BLE001
        raise GoogleWalletNotConfiguredError(
            f"Could not load Google Wallet service account private key: {exc}"
        ) from exc

    if not isinstance(key, rsa.RSAPrivateKey):
        raise GoogleWalletNotConfiguredError(
            "Google Wallet service account key must be an RSA private key."
        )
    return key.sign(signing_input, padding.PKCS1v15(), hashes.SHA256())


def _build_event_ticket_object(
    *,
    envelope: dict[str, Any],
    order_url: str,
    issuer_id: str,
    class_id: str,
) -> dict[str, Any]:
    order_reference = str(envelope.get("order_reference") or "")
    sessions = envelope.get("sessions") or []
    session = sessions[0] if sessions else {}
    coach = envelope.get("coach") or {}
    customer = envelope.get("customer") or {}

    program_name = session.get("program_name") or "BookedAI Session"
    starts_at = (session.get("starts_at") or "").strip()
    timezone_name = session.get("timezone") or "UTC"
    coach_display = coach.get("display_name") or "BookedAI Coach"
    cohort_label = session.get("cohort_label") or "Online"
    meeting_url = session.get("meeting_url") or order_url

    object_id = f"{issuer_id}.{order_reference}".strip(".")

    text_modules = [
        {
            "id": "session",
            "header": "Session",
            "body": f"{starts_at} ({timezone_name})" if starts_at else "TBD",
        },
        {
            "id": "coach",
            "header": "Coach",
            "body": coach_display,
        },
        {
            "id": "cohort",
            "header": "Cohort",
            "body": cohort_label,
        },
        {
            "id": "meeting",
            "header": "Join",
            "body": meeting_url,
        },
        {
            "id": "customer",
            "header": "Booked for",
            "body": str(customer.get("name") or "BookedAI Student"),
        },
    ]

    obj: dict[str, Any] = {
        "id": object_id,
        "classId": class_id,
        "state": "ACTIVE",
        "ticketHolderName": str(customer.get("name") or ""),
        "ticketNumber": order_reference,
        "barcode": {
            "type": "QR_CODE",
            "value": order_url,
            "alternateText": order_reference,
        },
        "hexBackgroundColor": "#0b1d3a",
        "textModulesData": text_modules,
        "linksModuleData": {
            "uris": [
                {
                    "uri": order_url,
                    "description": "View order",
                    "id": "order_url",
                },
                {
                    "uri": meeting_url,
                    "description": "Join session",
                    "id": "meeting_url",
                },
            ]
        },
    }
    if starts_at:
        obj["dateTime"] = {"start": starts_at}
    return obj


def build_google_wallet_save_url(
    *,
    envelope: dict[str, Any],
    order_url: str,
) -> str:
    """Build a ``https://pay.google.com/gp/v/save/<jwt>`` URL for the order.

    Raises ``GoogleWalletNotConfiguredError`` when env / service account is
    missing or malformed so the caller can return 503.
    """
    config = _check_configured()
    event_object = _build_event_ticket_object(
        envelope=envelope,
        order_url=order_url,
        issuer_id=config["issuer_id"],
        class_id=config["class_id"],
    )

    payload = {
        "iss": config["client_email"],
        "aud": "google",
        "typ": "savetowallet",
        "iat": int(time.time()),
        "origins": ["https://chess.bookedai.au", "https://portal.bookedai.au"],
        "payload": {
            "eventTicketObjects": [event_object],
        },
    }
    header = {"alg": "RS256", "typ": "JWT"}

    header_segment = _b64url_encode(
        json.dumps(header, separators=(",", ":")).encode("utf-8")
    )
    payload_segment = _b64url_encode(
        json.dumps(payload, separators=(",", ":")).encode("utf-8")
    )
    signing_input = f"{header_segment}.{payload_segment}".encode("ascii")
    signature = _rs256_sign(
        signing_input=signing_input,
        private_key_pem=config["private_key"],
    )
    signature_segment = _b64url_encode(signature)

    jwt = f"{header_segment}.{payload_segment}.{signature_segment}"
    return f"https://pay.google.com/gp/v/save/{jwt}"


__all__ = [
    "GoogleWalletNotConfiguredError",
    "build_google_wallet_save_url",
]
