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
from datetime import UTC, datetime
from typing import Any

from sqlalchemy import text

from repositories.audit_repository import AuditLogRepository
from repositories.base import RepositoryContext
from repositories.idempotency_repository import IdempotencyRepository
from repositories.payment_intent_repository import PaymentIntentRepository
from repositories.tenant_repository import TenantRepository
from repositories.webhook_repository import WebhookEventRepository
from service_layer.payment_lifecycle_service import mark_booking_paid


SIGNATURE_TOLERANCE_SECONDS = 5 * 60  # Stripe default tolerance window.

SUPPORTED_EVENT_TYPES: frozenset[str] = frozenset(
    {
        "checkout.session.completed",
        "checkout.session.expired",
        "checkout.session.async_payment_succeeded",
        "checkout.session.async_payment_failed",
        "customer.subscription.created",
        "customer.subscription.updated",
        "customer.subscription.deleted",
        "payment_intent.payment_failed",
    }
)

STRIPE_SUBSCRIPTION_EVENT_TYPES: frozenset[str] = frozenset(
    {
        "checkout.session.completed",
        "customer.subscription.created",
        "customer.subscription.updated",
        "customer.subscription.deleted",
    }
)


# Stripe checkout sessions opened by the chess.bookedai.au student-payment flow
# tag themselves with this metadata key. We branch on it inside
# ``reconcile_stripe_event`` so the webhook can mark the linked booking_intent
# as paid even when ``client_reference_id`` is the chess transfer reference
# (CHESS-XXXX) rather than a booking_reference.
CHESS_STUDENT_PAYMENT_METADATA_KIND = "chess_student_payment"


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


def _metadata_dict(value: object | None) -> dict[str, object]:
    return dict(value) if isinstance(value, dict) else {}


def _datetime_from_stripe_epoch(value: object | None) -> datetime | None:
    if value is None:
        return None
    try:
        timestamp = int(value)
    except (TypeError, ValueError):
        return None
    if timestamp <= 0:
        return None
    return datetime.fromtimestamp(timestamp, tz=UTC)


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


def _extract_subscription_handles(event: dict[str, Any]) -> dict[str, Any]:
    event_type = _normalized_text(event.get("type")) or ""
    data_object = (
        event.get("data", {}).get("object") if isinstance(event.get("data"), dict) else None
    )
    if not isinstance(data_object, dict):
        data_object = {}

    metadata = _metadata_dict(data_object.get("metadata"))
    event_is_checkout = event_type == "checkout.session.completed"
    checkout_mode = _normalized_text(data_object.get("mode"))
    subscription_id = _normalized_text(
        data_object.get("subscription") if event_is_checkout else data_object.get("id")
    )
    customer_id = _normalized_text(data_object.get("customer"))
    tenant_id = _normalized_text(metadata.get("tenant_id"))
    tenant_slug = _normalized_text(metadata.get("tenant_slug"))
    if event_is_checkout and not tenant_id and checkout_mode == "subscription":
        tenant_id = _normalized_text(data_object.get("client_reference_id"))

    plan_code = _normalized_text(metadata.get("plan_code"))
    status = _normalized_text(data_object.get("status"))
    if event_is_checkout and checkout_mode == "subscription":
        status = "active"
    if event_type == "customer.subscription.deleted":
        status = status or "canceled"

    customer_email = _normalized_text(data_object.get("customer_email"))
    if not customer_email:
        customer_details = data_object.get("customer_details")
        if isinstance(customer_details, dict):
            customer_email = _normalized_text(customer_details.get("email"))

    current_period_start = _datetime_from_stripe_epoch(data_object.get("current_period_start"))
    current_period_end = _datetime_from_stripe_epoch(data_object.get("current_period_end"))

    source = _normalized_text(metadata.get("source"))
    is_tenant_billing = bool(
        event_type in STRIPE_SUBSCRIPTION_EVENT_TYPES
        and (
            checkout_mode == "subscription"
            or source == "tenant_billing_workspace"
            or tenant_id
            or tenant_slug
            or (subscription_id and event_type.startswith("customer.subscription."))
        )
    )

    return {
        "is_tenant_billing": is_tenant_billing,
        "event_type": event_type,
        "tenant_id": tenant_id,
        "tenant_slug": tenant_slug,
        "plan_code": plan_code,
        "status": status,
        "subscription_id": subscription_id,
        "customer_id": customer_id,
        "customer_email": customer_email,
        "current_period_start": current_period_start,
        "current_period_end": current_period_end,
    }


def _extract_chess_student_handles(event: dict[str, Any]) -> dict[str, Any]:
    """Pull chess student-payment markers off a Stripe event payload.

    The chess.bookedai.au flow tags every checkout session it opens with
    ``metadata.bookedai_kind == "chess_student_payment"`` plus the linked
    ``booking_intent_id`` and ``lead_id`` so the webhook can flip the booking
    intent to ``paid`` without depending on ``client_reference_id`` being a
    booking reference.
    """
    event_type = _normalized_text(event.get("type")) or ""
    data_object = (
        event.get("data", {}).get("object") if isinstance(event.get("data"), dict) else None
    )
    if not isinstance(data_object, dict):
        data_object = {}

    metadata = _metadata_dict(data_object.get("metadata"))
    bookedai_kind = _normalized_text(metadata.get("bookedai_kind"))
    is_chess_student_payment = (
        bookedai_kind == CHESS_STUDENT_PAYMENT_METADATA_KIND
        and event_type
        in {
            "checkout.session.completed",
            "checkout.session.async_payment_succeeded",
            "checkout.session.async_payment_failed",
            "checkout.session.expired",
        }
    )

    if event_type in {
        "checkout.session.completed",
        "checkout.session.async_payment_succeeded",
    }:
        payment_status = "paid"
    elif event_type == "checkout.session.expired":
        payment_status = "expired"
    elif event_type == "checkout.session.async_payment_failed":
        payment_status = "failed"
    else:
        payment_status = None

    return {
        "is_chess_student_payment": is_chess_student_payment,
        "event_type": event_type,
        "booking_intent_id": _normalized_text(metadata.get("booking_intent_id")),
        "lead_id": _normalized_text(metadata.get("lead_id")),
        "transfer_reference": _normalized_text(metadata.get("transfer_reference")),
        "external_session_id": _normalized_text(data_object.get("id")),
        "payment_status": payment_status,
    }


async def _mark_chess_booking_intent_paid(
    session,
    *,
    booking_intent_id: str,
    payment_status: str,
    metadata_updates: dict[str, Any] | None = None,
) -> str | None:
    """Update the booking intent the chess student-payment is linked to.

    Returns the booking_intent_id that was updated (so callers can log it),
    or ``None`` if the booking_intent could not be located.
    """
    normalized_id = (booking_intent_id or "").strip()
    if not normalized_id:
        return None

    lookup = await session.execute(
        text(
            """
            select id::text as booking_intent_id, metadata_json
            from booking_intents
            where id::text = cast(:booking_intent_id as text)
               or booking_reference = cast(:booking_intent_id as text)
            limit 1
            """
        ),
        {"booking_intent_id": normalized_id},
    )
    row = lookup.mappings().first()
    if not row:
        return None

    existing_metadata = dict(row.get("metadata_json") or {})
    if metadata_updates:
        for key, value in metadata_updates.items():
            if value is None:
                continue
            text_value = str(value).strip()
            if not text_value:
                continue
            existing_metadata[key] = value
    existing_metadata["payment_status"] = payment_status

    await session.execute(
        text(
            """
            update booking_intents
            set
              payment_dependency_state = :payment_status,
              metadata_json = cast(:metadata_json as jsonb),
              updated_at = now()
            where id = cast(:booking_intent_id as uuid)
            """
        ),
        {
            "booking_intent_id": row["booking_intent_id"],
            "payment_status": payment_status,
            "metadata_json": json.dumps(existing_metadata),
        },
    )
    return row["booking_intent_id"]


async def _resolve_chess_tenant_id(
    session,
    *,
    booking_intent_id: str | None,
) -> str | None:
    normalized_id = (booking_intent_id or "").strip()
    if not normalized_id:
        return None
    result = await session.execute(
        text(
            """
            select tenant_id::text
            from booking_intents
            where id::text = cast(:booking_intent_id as text)
               or booking_reference = cast(:booking_intent_id as text)
            limit 1
            """
        ),
        {"booking_intent_id": normalized_id},
    )
    value = result.scalar_one_or_none()
    return str(value).strip() if value else None


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


async def _resolve_tenant_id_by_stripe_customer_id(session, *, customer_id: str | None) -> str | None:
    normalized = (customer_id or "").strip()
    if not normalized:
        return None
    result = await session.execute(
        text(
            """
            select tenant_id::text
            from tenant_settings
            where settings_json->'billing_gateway'->>'stripe_customer_id' = :customer_id
            limit 1
            """
        ),
        {"customer_id": normalized},
    )
    value = result.scalar_one_or_none()
    return str(value).strip() if value else None


async def _resolve_subscription_tenant_id(
    session,
    *,
    tenant_repository: TenantRepository,
    handles: dict[str, Any],
) -> str | None:
    for candidate in (handles.get("tenant_id"), handles.get("tenant_slug")):
        normalized_candidate = _normalized_text(candidate)
        if not normalized_candidate:
            continue
        resolved = await tenant_repository.resolve_tenant_id(normalized_candidate)
        if resolved:
            return str(resolved).strip()
    return await _resolve_tenant_id_by_stripe_customer_id(
        session,
        customer_id=_normalized_text(handles.get("customer_id")),
    )


def _subscription_period_days(handles: dict[str, Any]) -> int:
    start = handles.get("current_period_start")
    end = handles.get("current_period_end")
    if isinstance(start, datetime) and isinstance(end, datetime) and end > start:
        return max(1, (end - start).days or 1)
    return 30


async def _reconcile_tenant_subscription_event(
    session,
    *,
    event_id: str | None,
    tenant_repository: TenantRepository,
    handles: dict[str, Any],
    resolved_tenant_id: str | None = None,
) -> dict[str, Any]:
    tenant_id = resolved_tenant_id or await _resolve_subscription_tenant_id(
        session,
        tenant_repository=tenant_repository,
        handles=handles,
    )
    if not tenant_id:
        return {
            "status": "ignored",
            "event_id": event_id,
            "event_type": handles["event_type"],
            "reason": "tenant_subscription_context_missing",
        }

    settings = await tenant_repository.get_tenant_settings(tenant_id)
    billing_gateway = dict(settings.get("billing_gateway") or {}) if isinstance(settings, dict) else {}
    customer_id = _normalized_text(handles.get("customer_id")) or _normalized_text(
        billing_gateway.get("stripe_customer_id")
    )
    plan_code = _normalized_text(handles.get("plan_code")) or _normalized_text(
        billing_gateway.get("stripe_checkout_plan_code")
    ) or "starter"
    subscription_status = _normalized_text(handles.get("status")) or "active"

    billing_account = await tenant_repository.upsert_billing_account(
        tenant_id=tenant_id,
        billing_email=_normalized_text(handles.get("customer_email")),
        merchant_mode=None,
    )
    subscription = await tenant_repository.upsert_subscription(
        tenant_id=tenant_id,
        billing_account_id=billing_account.get("id"),
        plan_code=plan_code,
        status=subscription_status,
        started_at=handles.get("current_period_start") if isinstance(handles.get("current_period_start"), datetime) else datetime.now(UTC),
        ended_at=(
            handles.get("current_period_end")
            if subscription_status in {"canceled", "incomplete_expired", "unpaid"}
            and isinstance(handles.get("current_period_end"), datetime)
            else None
        ),
    )
    if subscription_status in {"active", "trialing", "past_due"}:
        period_status = "trial_open" if subscription_status == "trialing" else "open"
        if isinstance(handles.get("current_period_start"), datetime) and isinstance(
            handles.get("current_period_end"), datetime
        ):
            await tenant_repository.replace_subscription_period_from_stripe(
                subscription_id=str(subscription.get("id") or ""),
                period_start=handles["current_period_start"],
                period_end=handles["current_period_end"],
                status=period_status,
            )
        else:
            await tenant_repository.replace_subscription_period(
                subscription_id=str(subscription.get("id") or ""),
                period_days=_subscription_period_days(handles),
                status=period_status,
            )

    next_gateway = {
        **billing_gateway,
        "stripe_customer_id": customer_id,
        "stripe_subscription_id": _normalized_text(handles.get("subscription_id")),
        "stripe_subscription_status": subscription_status,
        "stripe_subscription_plan_code": plan_code,
        "stripe_subscription_current_period_start": (
            handles["current_period_start"].isoformat()
            if isinstance(handles.get("current_period_start"), datetime)
            else None
        ),
        "stripe_subscription_current_period_end": (
            handles["current_period_end"].isoformat()
            if isinstance(handles.get("current_period_end"), datetime)
            else None
        ),
        "stripe_last_event_id": event_id,
        "stripe_last_event_type": handles["event_type"],
        "last_synced_at": datetime.now(UTC).isoformat(),
    }
    await tenant_repository.upsert_tenant_settings(
        tenant_id=tenant_id,
        settings_json={"billing_gateway": next_gateway},
    )
    await AuditLogRepository(
        RepositoryContext(session=session, tenant_id=tenant_id)
    ).append_entry(
        event_type="tenant.billing.stripe_subscription_reconciled",
        entity_type="subscription",
        entity_id=str(subscription.get("id") or ""),
        actor_type="stripe_webhook",
        actor_id=event_id,
        tenant_id=tenant_id,
        payload={
            "stripe_event_id": event_id,
            "stripe_event_type": handles["event_type"],
            "stripe_customer_id": customer_id,
            "stripe_subscription_id": _normalized_text(handles.get("subscription_id")),
            "subscription_status": subscription_status,
            "plan_code": plan_code,
        },
    )
    return {
        "status": "applied",
        "event_id": event_id,
        "event_type": handles["event_type"],
        "tenant_id": tenant_id,
        "subscription_status": subscription_status,
        "subscription_id": _normalized_text(handles.get("subscription_id")),
        "plan_code": plan_code,
    }


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
    subscription_handles = _extract_subscription_handles(event)
    chess_handles = _extract_chess_student_handles(event)
    event_id = _normalized_text(event.get("id"))
    event_type = handles["event_type"]

    tenant_repository = TenantRepository(RepositoryContext(session=session))
    fallback_tenant_id = await tenant_repository.get_default_tenant_id()
    booking_tenant_id = await _resolve_booking_reference_tenant_id(
        session,
        booking_reference=handles["booking_reference"],
    )
    subscription_tenant_id = (
        await _resolve_subscription_tenant_id(
            session,
            tenant_repository=tenant_repository,
            handles=subscription_handles,
        )
        if subscription_handles["is_tenant_billing"]
        else None
    )
    chess_tenant_id = (
        await _resolve_chess_tenant_id(
            session,
            booking_intent_id=chess_handles.get("booking_intent_id"),
        )
        if chess_handles["is_chess_student_payment"]
        else None
    )
    tenant_id = (
        chess_tenant_id
        or booking_tenant_id
        or subscription_tenant_id
        or fallback_tenant_id
    )

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

    if chess_handles["is_chess_student_payment"]:
        chess_payment_status = chess_handles.get("payment_status")
        booking_intent_id = chess_handles.get("booking_intent_id") or ""
        if not booking_intent_id:
            return {
                "status": "ignored",
                "event_id": event_id,
                "event_type": event_type,
                "tenant_id": tenant_id,
                "reason": "chess_student_booking_intent_missing",
            }
        if not chess_payment_status:
            return {
                "status": "ignored",
                "event_id": event_id,
                "event_type": event_type,
                "tenant_id": tenant_id,
                "reason": "chess_student_payment_status_unmapped",
            }
        updated_id = await _mark_chess_booking_intent_paid(
            session,
            booking_intent_id=booking_intent_id,
            payment_status=chess_payment_status,
            metadata_updates={
                "stripe_event_id": event_id,
                "stripe_event_type": event_type,
                "stripe_session_id": chess_handles.get("external_session_id"),
                "chess_transfer_reference": chess_handles.get("transfer_reference"),
                "chess_lead_id": chess_handles.get("lead_id"),
                "bookedai_kind": CHESS_STUDENT_PAYMENT_METADATA_KIND,
            },
        )
        if not updated_id:
            return {
                "status": "ignored",
                "event_id": event_id,
                "event_type": event_type,
                "tenant_id": tenant_id,
                "reason": "chess_student_booking_intent_not_found",
                "booking_intent_id": booking_intent_id,
            }
        return {
            "status": "applied",
            "event_id": event_id,
            "event_type": event_type,
            "tenant_id": chess_tenant_id or tenant_id,
            "booking_intent_id": updated_id,
            "payment_status": chess_payment_status,
            "reason": "chess_student_payment",
        }

    if subscription_handles["is_tenant_billing"]:
        return await _reconcile_tenant_subscription_event(
            session,
            event_id=event_id,
            tenant_repository=tenant_repository,
            handles=subscription_handles,
            resolved_tenant_id=subscription_tenant_id,
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
    lifecycle_result = None
    if handles["payment_status"] == "paid":
        lifecycle_result = await mark_booking_paid(
            session,
            tenant_id=booking_tenant_id,
            booking_reference=handles["booking_reference"],
            payment_source="stripe_checkout",
            external_event_id=event_id,
            external_session_id=handles["external_session_id"],
            amount_aud=handles["amount_aud"],
            currency=handles["currency"],
            raw_provider_payload={"event_type": event_type},
            actor_type="stripe_webhook",
            actor_id=event_id,
            sync_payment_intent=False,
        )

    return {
        "status": "applied",
        "event_id": event_id,
        "event_type": event_type,
        "tenant_id": booking_tenant_id,
        "booking_reference": handles["booking_reference"],
        "payment_status": handles["payment_status"],
        "payment_intent_id": payment_intent_id,
        "booking_lifecycle": lifecycle_result.as_dict() if lifecycle_result else None,
    }
