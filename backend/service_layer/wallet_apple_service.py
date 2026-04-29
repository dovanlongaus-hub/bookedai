"""Apple Wallet ``.pkpass`` generation for chess.bookedai.au orders.

Apple Wallet expects a strictly-shaped ZIP file containing:

* ``pass.json`` — pass description (``eventTicket`` structure)
* ``manifest.json`` — SHA-1 of every other file in the archive
* ``signature`` — PKCS#7 detached signature over ``manifest.json``
* ``icon.png`` / ``icon@2x.png`` / ``logo.png`` / ``logo@2x.png`` — PNG assets

Signing requires three secrets (all paths to PEM files) plus a passphrase:

* ``APPLE_WALLET_PASS_CERT_PATH`` — Pass Type ID certificate (PEM)
* ``APPLE_WALLET_PASS_KEY_PATH`` — RSA private key for the cert (PEM)
* ``APPLE_WALLET_WWDR_CERT_PATH`` — Apple WWDR intermediate certificate
* ``APPLE_WALLET_PASS_KEY_PASSPHRASE`` — passphrase for the .key (may be blank)

When any of those are missing OR the asset directory is missing the four
PNGs OR the ``openssl`` binary is not on $PATH, the helper raises
``AppleWalletNotConfiguredError`` so the route can return ``503``. We don't
ship secrets in the repo — operators load them via env + mount the cert
files at the configured paths at deploy time.

We deliberately avoid pulling in third-party signing libraries (e.g.
``M2Crypto``, ``cryptography.hazmat.primitives.serialization.pkcs7``) and
use a subprocess shell-out to ``openssl smime -sign`` instead. That keeps
the dependency surface unchanged AND makes signing observable in logs.
"""

from __future__ import annotations

import hashlib
import io
import json
import os
import shutil
import subprocess
import tempfile
import zipfile
from pathlib import Path
from typing import Any


_BACKEND_DIR = Path(__file__).resolve().parent.parent
_DEFAULT_ASSETS_DIR = _BACKEND_DIR / "assets" / "wallet" / "chess"


_ICON_FILENAMES = ("icon.png", "icon@2x.png", "logo.png", "logo@2x.png")
_BACKGROUND_HEX = "rgb(11, 29, 58)"   # #0b1d3a navy
_FOREGROUND_HEX = "rgb(255, 255, 255)"
_LABEL_HEX = "rgb(201, 162, 74)"      # #c9a24a gold


class AppleWalletNotConfiguredError(RuntimeError):
    """Raised when env / cert / asset preconditions are not met."""


def _env(key: str, default: str = "") -> str:
    return (os.getenv(key, default) or "").strip()


def _resolve_assets_dir() -> Path:
    raw = _env("APPLE_WALLET_ASSETS_DIR")
    if raw:
        candidate = Path(raw)
        if not candidate.is_absolute():
            candidate = _BACKEND_DIR.parent / candidate
        return candidate
    return _DEFAULT_ASSETS_DIR


def _check_configured() -> dict[str, str]:
    """Return resolved config or raise ``AppleWalletNotConfiguredError``."""
    pass_type_id = _env("APPLE_WALLET_PASS_TYPE_ID")
    team_id = _env("APPLE_WALLET_TEAM_ID")
    pass_cert_path = _env("APPLE_WALLET_PASS_CERT_PATH")
    pass_key_path = _env("APPLE_WALLET_PASS_KEY_PATH")
    wwdr_cert_path = _env("APPLE_WALLET_WWDR_CERT_PATH")
    passphrase = _env("APPLE_WALLET_PASS_KEY_PASSPHRASE")

    missing: list[str] = []
    if not pass_type_id:
        missing.append("APPLE_WALLET_PASS_TYPE_ID")
    if not team_id:
        missing.append("APPLE_WALLET_TEAM_ID")
    if not pass_cert_path:
        missing.append("APPLE_WALLET_PASS_CERT_PATH")
    if not pass_key_path:
        missing.append("APPLE_WALLET_PASS_KEY_PATH")
    if not wwdr_cert_path:
        missing.append("APPLE_WALLET_WWDR_CERT_PATH")
    if missing:
        raise AppleWalletNotConfiguredError(
            "Apple Wallet credentials not configured. Missing env: "
            + ", ".join(missing)
        )

    for label, path in (
        ("APPLE_WALLET_PASS_CERT_PATH", pass_cert_path),
        ("APPLE_WALLET_PASS_KEY_PATH", pass_key_path),
        ("APPLE_WALLET_WWDR_CERT_PATH", wwdr_cert_path),
    ):
        if not Path(path).exists():
            raise AppleWalletNotConfiguredError(
                f"Apple Wallet cert missing on disk: {label}={path}"
            )

    if shutil.which("openssl") is None:
        raise AppleWalletNotConfiguredError(
            "openssl binary is required to sign Apple Wallet passes."
        )

    assets_dir = _resolve_assets_dir()
    if not assets_dir.exists():
        raise AppleWalletNotConfiguredError(
            f"Apple Wallet asset directory not found: {assets_dir}. "
            "Place icon.png / icon@2x.png / logo.png / logo@2x.png there."
        )
    missing_assets = [
        name for name in _ICON_FILENAMES if not (assets_dir / name).exists()
    ]
    if missing_assets:
        raise AppleWalletNotConfiguredError(
            "Apple Wallet asset files missing: "
            + ", ".join(missing_assets)
            + f" (looked under {assets_dir})"
        )

    return {
        "pass_type_id": pass_type_id,
        "team_id": team_id,
        "pass_cert_path": pass_cert_path,
        "pass_key_path": pass_key_path,
        "wwdr_cert_path": wwdr_cert_path,
        "passphrase": passphrase,
        "assets_dir": str(assets_dir),
    }


def _format_session_human(envelope: dict[str, Any]) -> tuple[str, str, str]:
    """Return (date_label, time_label, program_name) strings for the pass."""
    sessions = envelope.get("sessions") or []
    session = sessions[0] if sessions else {}
    program_name = session.get("program_name") or "BookedAI Session"
    starts_at = (session.get("starts_at") or "").strip()
    date_label = starts_at[:10] if starts_at else "TBD"
    time_label = starts_at[11:16] if len(starts_at) >= 16 else "TBD"
    return date_label, time_label, program_name


def _build_pass_json(
    *,
    envelope: dict[str, Any],
    order_url: str,
    pass_type_id: str,
    team_id: str,
) -> dict[str, Any]:
    order_reference = str(envelope.get("order_reference") or "")
    customer = envelope.get("customer") or {}
    coach = envelope.get("coach") or {}
    sessions = envelope.get("sessions") or []
    session = sessions[0] if sessions else {}
    payment = envelope.get("payment") or {}

    date_label, time_label, program_name = _format_session_human(envelope)
    cohort_label = session.get("cohort_label") or ""
    coach_display = coach.get("display_name") or "BookedAI Coach"
    meeting_url = session.get("meeting_url") or order_url
    timezone_name = session.get("timezone") or "UTC"

    payment_summary = ""
    if payment.get("amount") is not None:
        currency = payment.get("currency") or ""
        payment_summary = f"{currency} {payment.get('amount')}".strip()

    pass_dict: dict[str, Any] = {
        "formatVersion": 1,
        "passTypeIdentifier": pass_type_id,
        "teamIdentifier": team_id,
        "serialNumber": order_reference,
        "organizationName": "BookedAI",
        "description": f"BookedAI session — {program_name}",
        "logoText": "BookedAI",
        "backgroundColor": _BACKGROUND_HEX,
        "foregroundColor": _FOREGROUND_HEX,
        "labelColor": _LABEL_HEX,
        "barcodes": [
            {
                "format": "PKBarcodeFormatQR",
                "message": order_url,
                "messageEncoding": "iso-8859-1",
                "altText": order_reference,
            }
        ],
        # Legacy single-barcode for older iOS clients.
        "barcode": {
            "format": "PKBarcodeFormatQR",
            "message": order_url,
            "messageEncoding": "iso-8859-1",
            "altText": order_reference,
        },
        "eventTicket": {
            "primaryFields": [
                {
                    "key": "session",
                    "label": f"{date_label} {time_label} {timezone_name}",
                    "value": program_name,
                }
            ],
            "secondaryFields": [
                {
                    "key": "program",
                    "label": "Program",
                    "value": program_name,
                },
                {
                    "key": "meeting",
                    "label": "Join",
                    "value": meeting_url,
                },
            ],
            "auxiliaryFields": [
                {
                    "key": "coach",
                    "label": "Coach",
                    "value": coach_display,
                },
                {
                    "key": "cohort",
                    "label": "Cohort",
                    "value": cohort_label or "Online",
                },
            ],
            "backFields": [
                {
                    "key": "order_reference",
                    "label": "Order reference",
                    "value": order_reference,
                },
                {
                    "key": "customer",
                    "label": "Booked for",
                    "value": str(customer.get("name") or "BookedAI Student"),
                },
                {
                    "key": "order_url",
                    "label": "View order",
                    "value": order_url,
                },
                {
                    "key": "payment",
                    "label": "Payment",
                    "value": payment_summary
                    or str(payment.get("status") or "—").title(),
                },
                {
                    "key": "support",
                    "label": "Support",
                    "value": str(
                        (envelope.get("support") or {}).get("email")
                        or "chess@bookedai.au"
                    ),
                },
            ],
        },
    }
    relevant_iso = (session.get("starts_at") or "").strip()
    if relevant_iso:
        pass_dict["relevantDate"] = relevant_iso
    return pass_dict


def _sha1_hex(data: bytes) -> str:
    return hashlib.sha1(data).hexdigest()


def _sign_manifest(
    *,
    manifest_bytes: bytes,
    pass_cert_path: str,
    pass_key_path: str,
    wwdr_cert_path: str,
    passphrase: str,
) -> bytes:
    """Run ``openssl smime -sign`` to produce a DER PKCS#7 signature."""
    with tempfile.TemporaryDirectory() as tmp:
        manifest_path = Path(tmp) / "manifest.json"
        signature_path = Path(tmp) / "signature"
        manifest_path.write_bytes(manifest_bytes)

        cmd = [
            "openssl",
            "smime",
            "-binary",
            "-sign",
            "-certfile",
            wwdr_cert_path,
            "-signer",
            pass_cert_path,
            "-inkey",
            pass_key_path,
            "-in",
            str(manifest_path),
            "-out",
            str(signature_path),
            "-outform",
            "DER",
            "-noattr",
        ]
        if passphrase:
            cmd.extend(["-passin", "stdin"])
            input_bytes: bytes | None = passphrase.encode()
        else:
            input_bytes = None

        proc = subprocess.run(
            cmd,
            input=input_bytes,
            capture_output=True,
            check=False,
            timeout=20,
        )
        if proc.returncode != 0 or not signature_path.exists():
            raise AppleWalletNotConfiguredError(
                "openssl smime -sign failed: "
                + (proc.stderr or b"").decode("utf-8", errors="replace")
            )
        return signature_path.read_bytes()


def build_apple_wallet_pkpass(
    *,
    envelope: dict[str, Any],
    order_url: str,
) -> bytes:
    """Build a signed ``.pkpass`` archive for the given order envelope.

    Raises
    ------
    AppleWalletNotConfiguredError
        When env vars / cert files / asset PNGs / openssl are not all set.
    """
    config = _check_configured()
    assets_dir = Path(config["assets_dir"])

    pass_dict = _build_pass_json(
        envelope=envelope,
        order_url=order_url,
        pass_type_id=config["pass_type_id"],
        team_id=config["team_id"],
    )
    pass_bytes = json.dumps(pass_dict, separators=(",", ":")).encode("utf-8")

    files: dict[str, bytes] = {"pass.json": pass_bytes}
    for asset_name in _ICON_FILENAMES:
        files[asset_name] = (assets_dir / asset_name).read_bytes()

    manifest = {name: _sha1_hex(data) for name, data in files.items()}
    manifest_bytes = json.dumps(manifest, separators=(",", ":")).encode("utf-8")

    signature_bytes = _sign_manifest(
        manifest_bytes=manifest_bytes,
        pass_cert_path=config["pass_cert_path"],
        pass_key_path=config["pass_key_path"],
        wwdr_cert_path=config["wwdr_cert_path"],
        passphrase=config["passphrase"],
    )

    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as archive:
        for name, data in files.items():
            archive.writestr(name, data)
        archive.writestr("manifest.json", manifest_bytes)
        archive.writestr("signature", signature_bytes)
    return buffer.getvalue()


__all__ = [
    "AppleWalletNotConfiguredError",
    "build_apple_wallet_pkpass",
]
