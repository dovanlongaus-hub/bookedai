"""Stripe webhook reconciliation service.

This module mirrors the pattern used by other inbound webhooks (Tawk,
Evolution, Telegram) — signature verification + idempotent event handling
that updates payment state via the existing repository seams.

Stripe SDK is intentionally not required: signatures are verified by the
manual HMAC routine documented at https://stripe.com/docs/webhooks/signatures
so that this code keeps working without a new dependency.
"""

from __future__ import annotations

import hashlib
import hmac
import json
import time
from typing import Any

from sqlalchemy import text

from repositories.base import RepositoryContext
from repositories.idempotency_repository import IdempotencyRepository
from repositories.payment_intent_repository import PaymentIntentRepository
from repositories.tenant_repository import TenantRepository
from repositories.webhook_repository import WebhookEventRepository


SIGNATURE_TOLERANCE_SECONDS = 5 * 60  # Stripe default tolerance window.

SUPPORTED_EVENT_TYPES: frozenset[str] = frozenset(
    {
        "checkout.session.completed",
        "checkout.session.expired",
        "checkout.session.async_payment_succeeded",
        "checkout.session.async_payment_failed",
        "payment_intent.payment_failed",
    }
)


class StripeSignatureError(Exception):
    """Raised when the Stripe-Signature header cannot be verified."""


def _parse_signature_header(header_value: str) -> tuple[int | None, list[str]]:
    """Parse the Stripe-Signature header into a timestamp and v1 signatures."""
    timestamp: int | None = None
    v1_signatures: list[str] = []
    if not header_value:
        return timestamp, v1_signatures
    for chunk in header_value.split(","):
        if "=" not in chunk:
            continue
        key, _, value = chunk.partition("=")
        key = key.strip()
        value = value.strip()
        if key == "t":
            try:
                timestamp = int(value)
            except (TypeError, ValueError):
                timestamp = None
        elif key == "v1":
            v1_signatures.append(value)
    return timestamp, v1_signatures


def verify_stripe_signature(
    *,
    payload: bytes,
    signature_header: str,
    secret: str,
    tolerance_seconds: int = SIGNATURE_TOLERANCE_SECONDS,
    now: float | None = None,
) -> None:
    """Validate a Stripe webhook signature; raise StripeSignatureError on failure."""
    normalized_secret = (secret or "").strip()
    if not normalized_secret:
        raise StripeSignatureError("stripe_webhook_secret_unconfigured")

    timestamp, v1_signatures = _parse_signature_header(signature_header or "")
    if timestamp is None or not v1_signatures:
        raise StripeSignatureError("stripe_signature_header_invalid")

    current_time = float(now if now is not None else time.time())
    if tolerance_seconds > 0 and abs(current_time - float(timestamp)) > tolerance_seconds:
        raise StripeSignatureError("stripe_signature_timestamp_outside_tolerance")

    signed_payload = f"{timestamp}.".encode("utf-8") + payload
    expected = hmac.new(
        normalized_secret.encode("utf-8"),
        signed_payload,
        hashlib.sha256,
    ).hexdigest()

    for candidate in v1_signatures:
        if hmac.compare_digest(expected, candidate):
            return

    raise StripeSignatureError("stripe_signature_mismatch")


def parse_stripe_event(payload: bytes) -> dict[str, Any]:
    """Decode the Stripe webhook JSON payload safely."""
    try:
        decoded = json.loads(payload.decode("utf-8") or "{}")
    except (UnicodeDecodeError, json.JSONDecodeError) as exc:
        raise ValueError(f"stripe_payload_invalid_json:{exc}") from exc
    if not isinstance(decoded, dict):
        raise ValueError("stripe_payload_must_be_object")
    return decoded


def _normalized_text(value: object | None) -> str | None:
    text_value = str(value or "").strip() if value is not None else ""
    return text_value or None


def _amount_aud_from_cents(amount_cents: object | None, currency: str | None) -> float | None:
    if amount_cents is None:
        return None
    try:
        cents = int(amount_cents)
    except (TypeError, ValueError):
        return None
    normalized_currency = (currency or "").strip().lower()
    if normalized_currency and normalized_currency != "aud":
        return None
    return round(cents / 100.0, 2)


def _extract_event_handles(event: dict[str, Any]) -> dict[str, Any]:
    """Pull booking_reference + payment status from a Stripe event payload."""
    event_type = _normalized_text(event.get("type")) or ""
    data_object = (
        event.get("data", {}).get("object") if isinstance(event.get("data"), dict) else None
    )
    if not isinstance(data_object, dict):
        data_object = {}

    booking_reference = _normalized_text(data_object.get("client_reference_id"))
    if not booking_reference:
        metadata = data_object.get("metadata")
        if isinstance(metadata, dict):
            booking_reference = _normalized_text(metadata.get("booking_reference"))

    external_session_id = _normalized_text(data_object.get("id"))
    raw_currency = _normalized_text(data_object.get("currency"))
    currency = (raw_currency or "").lower() or None

    amount_cents = (
        data_object.get("amount_total")
        or data_object.get("amount")
        or data_object.get("amount_received")
    )
    amount_aud = _amount_aud_from_cents(amount_cents, currency)

    if event_type == "checkout.session.completed":
        payment_status = "paid"
    elif event_type == "checkout.session.async_payment_succeeded":
        payment_status = "paid"
    elif event_type == "checkout.session.expired":
        payment_status = "expired"
    elif event_type in {
        "checkout.session.async_payment_failed",
        "payment_intent.payment_failed",
    }:
        payment_status = "failed"
    else:
        payment_status = None

    return {
        "event_type": event_type,
        "booking_reference": booking_reference,
        "external_session_id": external_session_id,
        "currency": currency,
        "amount_aud": amount_aud,
        "payment_status": payment_status,
    }


async def _resolve_booking_reference_tenant_id(
    session,
    *,
    booking_reference: str | None,
) -> str | None:
    normalized = (booking_reference or "").strip()
    if not normalized:
        return None
    result = await session.execute(
        text(
            """
            select tenant_id::text
            from booking_intents
            where booking_reference = :booking_reference
            limit 1
            """
        ),
        {"booking_reference": normalized},
    )
    value = result.scalar_one_or_none()
    return str(value).strip() if value else None


async def reconcile_stripe_event(
    session,
    *,
    event: dict[str, Any],
) -> dict[str, Any]:
    """Apply a Stripe event to the payment_intents mirror.

    Returns a dict with ``status`` ∈ {"applied", "duplicate", "ignored"} and
    diagnostic fields for callers to log/return.
    """
    handles = _extract_event_handles(event)
    event_id = _normalized_text(event.get("id"))
    event_type = handles["event_type"]

    tenant_repository = TenantRepository(RepositoryContext(session=session))
    fallback_tenant_id = await tenant_repository.get_default_tenant_id()
    booking_tenant_id = await _resolve_booking_reference_tenant_id(
        session,
        booking_reference=handles["booking_reference"],
    )
    tenant_id = booking_tenant_id or fallback_tenant_id

    idempotency_repository = IdempotencyRepository(
        RepositoryContext(session=session, tenant_id=tenant_id)
    )
    webhook_repository = WebhookEventRepository(
        RepositoryContext(session=session, tenant_id=tenant_id)
    )

    if event_id:
        reservation = await idempotency_repository.reserve_key(
            tenant_id=tenant_id,
            scope="stripe_webhook",
            idempotency_key=event_id,
            response_json={"status": "received", "event_type": event_type},
        )
        if not reservation.get("created"):
            return {
                "status": "duplicate",
                "event_id": event_id,
                "event_type": event_type,
                "tenant_id": tenant_id,
            }

    await webhook_repository.record_event(
        tenant_id=tenant_id,
        provider="stripe",
        external_event_id=event_id,
        payload={"event_type": event_type, "object": event.get("data", {}).get("object")},
        status="received",
    )

    if event_type not in SUPPORTED_EVENT_TYPES or not handles["payment_status"]:
        return {
            "status": "ignored",
            "event_id": event_id,
            "event_type": event_type,
            "tenant_id": tenant_id,
            "reason": "unsupported_event_type",
        }

    if not handles["booking_reference"] or not booking_tenant_id:
        return {
            "status": "ignored",
            "event_id": event_id,
            "event_type": event_type,
            "tenant_id": tenant_id,
            "reason": "booking_reference_missing_or_unknown",
            "booking_reference": handles["booking_reference"],
        }

    payment_repository = PaymentIntentRepository(
        RepositoryContext(session=session, tenant_id=booking_tenant_id)
    )
    payment_intent_id = await payment_repository.sync_callback_status(
        tenant_id=booking_tenant_id,
        booking_reference=handles["booking_reference"],
        status=handles["payment_status"],
        amount_aud=handles["amount_aud"],
        currency=handles["currency"],
        external_session_id=handles["external_session_id"],
        metadata_updates={
            "stripe_event_id": event_id,
            "stripe_event_type": event_type,
            "stripe_payment_status": handles["payment_status"],
        },
    )

    return {
        "status": "applied",
        "event_id": event_id,
        "event_type": event_type,
        "tenant_id": booking_tenant_id,
        "booking_reference": handles["booking_reference"],
        "payment_status": handles["payment_status"],
        "payment_intent_id": payment_intent_id,
    }
