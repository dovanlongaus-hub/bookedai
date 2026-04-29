from __future__ import annotations

from dataclasses import dataclass, field
from datetime import UTC, datetime
import json
from typing import Any

from sqlalchemy import text

from repositories.audit_repository import AuditLogRepository
from repositories.base import RepositoryContext
from repositories.booking_intent_repository import BookingIntentRepository
from repositories.crm_repository import CrmSyncRepository
from repositories.idempotency_repository import IdempotencyRepository
from repositories.outbox_repository import OutboxRepository
from repositories.payment_intent_repository import PaymentIntentRepository
from service_layer.lifecycle_ops_service import orchestrate_lifecycle_email, orchestrate_payment_paid_sync


PAYMENT_PAID_EVENT_TYPE = "booking.payment_paid"


@dataclass
class PaymentLifecycleResult:
    status: str
    tenant_id: str | None
    booking_reference: str | None
    booking_intent_id: str | None = None
    payment_status: str | None = None
    payment_intent_id: str | None = None
    payment_source: str | None = None
    outbox_event_id: int | None = None
    audit_log_id: int | None = None
    crm_sync: dict[str, Any] = field(default_factory=dict)
    email: dict[str, Any] = field(default_factory=dict)
    reason: str | None = None
    warnings: list[str] = field(default_factory=list)

    def as_dict(self) -> dict[str, Any]:
        return {
            "status": self.status,
            "tenant_id": self.tenant_id,
            "booking_reference": self.booking_reference,
            "booking_intent_id": self.booking_intent_id,
            "payment_status": self.payment_status,
            "payment_intent_id": self.payment_intent_id,
            "payment_source": self.payment_source,
            "outbox_event_id": self.outbox_event_id,
            "audit_log_id": self.audit_log_id,
            "crm_sync": self.crm_sync,
            "email": self.email,
            "reason": self.reason,
            "warnings": self.warnings,
        }


def _clean_text(value: object | None) -> str | None:
    normalized = str(value or "").strip()
    return normalized or None


def _clean_currency(value: object | None) -> str:
    return (str(value or "aud").strip().lower() or "aud")


def _json_safe_datetime(value: datetime | None) -> str:
    return (value or datetime.now(UTC)).astimezone(UTC).isoformat()


def _amount_float(value: object | None) -> float | None:
    if value is None:
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _idempotency_key(
    *,
    booking_reference: str,
    payment_source: str,
    external_event_id: str | None,
    external_session_id: str | None,
    transfer_reference: str | None,
) -> str:
    for candidate in (external_event_id, external_session_id, transfer_reference):
        normalized = _clean_text(candidate)
        if normalized:
            return f"{payment_source}:{normalized}"
    return f"{payment_source}:{booking_reference}:paid"


async def _lookup_booking_payment_context(
    session,
    *,
    tenant_id: str | None,
    booking_reference: str | None,
    booking_intent_id: str | None,
) -> dict[str, Any] | None:
    normalized_reference = _clean_text(booking_reference)
    normalized_booking_intent_id = _clean_text(booking_intent_id)
    if not normalized_reference and not normalized_booking_intent_id:
        return None

    result = await session.execute(
        text(
            """
            select
              bi.id::text as booking_intent_id,
              bi.tenant_id::text as tenant_id,
              bi.booking_reference,
              bi.service_name,
              bi.requested_date,
              bi.requested_time,
              bi.timezone,
              bi.booking_path,
              bi.payment_dependency_state,
              bi.metadata_json as booking_metadata,
              bi.contact_id::text as contact_id,
              c.full_name as customer_name,
              c.email as customer_email,
              c.phone as customer_phone,
              pi.id::text as latest_payment_intent_id,
              pi.status as latest_payment_status,
              pi.payment_option as latest_payment_option,
              pi.external_session_id as latest_external_session_id,
              pi.amount_aud as latest_amount_aud,
              pi.currency as latest_currency,
              pi.metadata_json as latest_payment_metadata
            from booking_intents bi
            left join contacts c
              on c.id = bi.contact_id
            left join lateral (
              select *
              from payment_intents pi
              where pi.booking_intent_id = bi.id
              order by pi.updated_at desc, pi.created_at desc
              limit 1
            ) pi on true
            where (
                cast(:tenant_id as text) is null
                or bi.tenant_id::text = cast(:tenant_id as text)
              )
              and (
                bi.booking_reference = cast(:booking_reference as text)
                or bi.id::text = cast(:booking_intent_id as text)
              )
            limit 1
            """
        ),
        {
            "tenant_id": _clean_text(tenant_id),
            "booking_reference": normalized_reference,
            "booking_intent_id": normalized_booking_intent_id,
        },
    )
    row = result.mappings().first()
    return dict(row) if row else None


async def _record_payment_paid_crm_sync(
    session,
    *,
    tenant_id: str,
    local_entity_id: str,
    payload: dict[str, Any],
) -> dict[str, Any]:
    repository = CrmSyncRepository(RepositoryContext(session=session, tenant_id=tenant_id))
    result: dict[str, Any] = {}
    for entity_type in ("deal_payment", "task_payment", "note_payment"):
        record_id = await repository.create_sync_record(
            tenant_id=tenant_id,
            entity_type=entity_type,
            local_entity_id=local_entity_id,
            provider="zoho_crm",
            sync_status="pending",
            payload_json=json.dumps(
                {
                    **payload,
                    "crm_intent": entity_type,
                    "deal_stage": "Closed Won",
                    "task_subject": "Payment received - send thank-you/support follow-up",
                }
            ),
        )
        result[entity_type] = {
            "record_id": record_id,
            "sync_status": "pending" if record_id is not None else "skipped",
        }
    return result


async def _record_payment_paid_emails(
    session,
    *,
    tenant_id: str,
    contact_id: str | None,
    payload: dict[str, Any],
) -> dict[str, Any]:
    result: dict[str, Any] = {}
    templates = (
        ("payment_received", "bookedai_payment_received", "Payment received for your BookedAI booking"),
        ("thank_you", "bookedai_payment_thank_you", "Thank you - your booking is paid"),
    )
    for key, template_key, subject in templates:
        email_result = await orchestrate_lifecycle_email(
            session,
            tenant_id=tenant_id,
            template_key=template_key,
            subject=subject,
            provider="outbox",
            delivery_status="queued",
            contact_id=contact_id,
            event_payload=payload,
        )
        result[key] = {
            "message_id": email_result.message_id,
            "delivery_status": email_result.delivery_status,
            "record_status": email_result.record_status,
            "provider": email_result.provider,
            "warnings": email_result.warning_codes,
        }
    return result


async def mark_booking_paid(
    session,
    *,
    tenant_id: str | None,
    booking_reference: str | None,
    booking_intent_id: str | None = None,
    payment_source: str,
    external_event_id: str | None = None,
    external_session_id: str | None = None,
    transfer_reference: str | None = None,
    amount_aud: float | None = None,
    currency: str | None = "aud",
    paid_at: datetime | None = None,
    raw_provider_payload: dict[str, Any] | None = None,
    actor_type: str = "payment_reconciliation",
    actor_id: str | None = None,
    record_side_effects: bool = True,
    sync_payment_intent: bool = True,
) -> PaymentLifecycleResult:
    """Apply trusted payment evidence to a booking exactly once.

    This service is intentionally provider-neutral. Stripe webhooks,
    tenant/admin manual bank-transfer confirmation, and future bank-feed
    matchers should all enter the paid lifecycle through this function.
    """
    normalized_source = _clean_text(payment_source) or "unknown"
    context = await _lookup_booking_payment_context(
        session,
        tenant_id=tenant_id,
        booking_reference=booking_reference,
        booking_intent_id=booking_intent_id,
    )
    if not context:
        return PaymentLifecycleResult(
            status="ignored",
            tenant_id=_clean_text(tenant_id),
            booking_reference=_clean_text(booking_reference),
            booking_intent_id=_clean_text(booking_intent_id),
            payment_source=normalized_source,
            reason="booking_not_found",
        )

    resolved_tenant_id = _clean_text(context.get("tenant_id"))
    resolved_reference = _clean_text(context.get("booking_reference"))
    resolved_booking_intent_id = _clean_text(context.get("booking_intent_id"))
    if not resolved_tenant_id or not resolved_reference or not resolved_booking_intent_id:
        return PaymentLifecycleResult(
            status="ignored",
            tenant_id=resolved_tenant_id,
            booking_reference=resolved_reference,
            booking_intent_id=resolved_booking_intent_id,
            payment_source=normalized_source,
            reason="booking_context_incomplete",
        )

    key = _idempotency_key(
        booking_reference=resolved_reference,
        payment_source=normalized_source,
        external_event_id=external_event_id,
        external_session_id=external_session_id,
        transfer_reference=transfer_reference,
    )
    idempotency_repository = IdempotencyRepository(
        RepositoryContext(session=session, tenant_id=resolved_tenant_id)
    )
    reservation = await idempotency_repository.reserve_key(
        tenant_id=resolved_tenant_id,
        scope="booking_payment_paid",
        idempotency_key=key,
        response_json={
            "status": "received",
            "booking_reference": resolved_reference,
            "payment_source": normalized_source,
        },
    )
    if not reservation.get("created"):
        return PaymentLifecycleResult(
            status="duplicate",
            tenant_id=resolved_tenant_id,
            booking_reference=resolved_reference,
            booking_intent_id=resolved_booking_intent_id,
            payment_status="paid",
            payment_intent_id=_clean_text(context.get("latest_payment_intent_id")),
            payment_source=normalized_source,
            reason="payment_paid_already_recorded",
        )

    paid_at_value = paid_at or datetime.now(UTC)
    amount_value = amount_aud if amount_aud is not None else _amount_float(context.get("latest_amount_aud"))
    currency_value = _clean_currency(currency or context.get("latest_currency"))
    metadata_updates = {
        "payment_status": "paid",
        "payment_source": normalized_source,
        "payment_paid_at": _json_safe_datetime(paid_at_value),
        "payment_external_event_id": _clean_text(external_event_id),
        "payment_external_session_id": _clean_text(external_session_id),
        "payment_transfer_reference": _clean_text(transfer_reference),
    }

    payment_intent_id = _clean_text(context.get("latest_payment_intent_id"))
    if sync_payment_intent:
        payment_repository = PaymentIntentRepository(
            RepositoryContext(session=session, tenant_id=resolved_tenant_id)
        )
        payment_intent_id = await payment_repository.sync_callback_status(
            tenant_id=resolved_tenant_id,
            booking_reference=resolved_reference,
            status="paid",
            amount_aud=amount_value,
            currency=currency_value,
            external_session_id=external_session_id,
            metadata_updates=metadata_updates,
        )
        if not payment_intent_id:
            payment_intent_id = await payment_repository.upsert_payment_intent(
                tenant_id=resolved_tenant_id,
                booking_intent_id=resolved_booking_intent_id,
                payment_option=normalized_source,
                status="paid",
                amount_aud=amount_value,
                currency=currency_value,
                external_session_id=external_session_id,
                metadata_json=json.dumps(
                    {
                        **metadata_updates,
                        "booking_reference": resolved_reference,
                    }
                ),
            )

    booking_repository = BookingIntentRepository(
        RepositoryContext(session=session, tenant_id=resolved_tenant_id)
    )
    booking_update = await booking_repository.sync_callback_status(
        tenant_id=resolved_tenant_id,
        booking_reference=resolved_reference,
        payment_dependency_state="paid",
        metadata_updates=metadata_updates,
    )

    event_payload: dict[str, Any] = {
        "booking_reference": resolved_reference,
        "booking_intent_id": resolved_booking_intent_id,
        "payment_intent_id": payment_intent_id,
        "payment_status": "paid",
        "payment_source": normalized_source,
        "external_event_id": _clean_text(external_event_id),
        "external_session_id": _clean_text(external_session_id),
        "transfer_reference": _clean_text(transfer_reference),
        "amount_aud": amount_value,
        "currency": currency_value,
        "paid_at": _json_safe_datetime(paid_at_value),
        "service_name": _clean_text(context.get("service_name")),
        "customer_name": _clean_text(context.get("customer_name")),
        "customer_email": _clean_text(context.get("customer_email")),
        "customer_phone": _clean_text(context.get("customer_phone")),
        "raw_provider_payload": raw_provider_payload or {},
    }

    audit_repository = AuditLogRepository(
        RepositoryContext(session=session, tenant_id=resolved_tenant_id)
    )
    audit_log_id = await audit_repository.append_entry(
        tenant_id=resolved_tenant_id,
        event_type=PAYMENT_PAID_EVENT_TYPE,
        entity_type="booking_intent",
        entity_id=resolved_booking_intent_id,
        actor_type=actor_type,
        actor_id=actor_id or _clean_text(external_event_id) or _clean_text(external_session_id),
        payload=event_payload,
    )
    outbox_repository = OutboxRepository(
        RepositoryContext(session=session, tenant_id=resolved_tenant_id)
    )
    outbox_event_id = await outbox_repository.enqueue_event(
        tenant_id=resolved_tenant_id,
        event_type=PAYMENT_PAID_EVENT_TYPE,
        aggregate_type="booking_intent",
        aggregate_id=resolved_booking_intent_id,
        payload=event_payload,
        idempotency_key=key,
    )

    crm_sync: dict[str, Any] = {}
    email: dict[str, Any] = {}
    if record_side_effects:
        crm_sync = await orchestrate_payment_paid_sync(
            session,
            tenant_id=resolved_tenant_id,
            booking_reference=resolved_reference,
            booking_intent_id=resolved_booking_intent_id,
            customer_name=_clean_text(context.get("customer_name")),
            customer_email=_clean_text(context.get("customer_email")),
            customer_phone=_clean_text(context.get("customer_phone")),
            service_name=_clean_text(context.get("service_name")),
            requested_date=_clean_text(context.get("requested_date")),
            requested_time=_clean_text(context.get("requested_time")),
            timezone=_clean_text(context.get("timezone")),
            payment_source=normalized_source,
            amount_aud=amount_value,
            currency=currency_value,
            paid_at=_json_safe_datetime(paid_at_value),
        )
        email = await _record_payment_paid_emails(
            session,
            tenant_id=resolved_tenant_id,
            contact_id=_clean_text(booking_update.get("contact_id"))
            or _clean_text(context.get("contact_id")),
            payload=event_payload,
        )

    result = PaymentLifecycleResult(
        status="applied",
        tenant_id=resolved_tenant_id,
        booking_reference=resolved_reference,
        booking_intent_id=resolved_booking_intent_id,
        payment_status="paid",
        payment_intent_id=payment_intent_id,
        payment_source=normalized_source,
        outbox_event_id=outbox_event_id,
        audit_log_id=audit_log_id,
        crm_sync=crm_sync,
        email=email,
        warnings=[] if payment_intent_id else ["payment_intent_missing"],
    )
    await idempotency_repository.record_response(
        scope="booking_payment_paid",
        idempotency_key=key,
        response_json=result.as_dict(),
    )
    return result


async def get_booking_payment_status(
    session,
    *,
    tenant_id: str | None,
    booking_reference: str,
    session_id: str | None = None,
) -> dict[str, Any]:
    context = await _lookup_booking_payment_context(
        session,
        tenant_id=tenant_id,
        booking_reference=booking_reference,
        booking_intent_id=None,
    )
    if not context:
        return {
            "status": "not_found",
            "booking_reference": booking_reference,
            "payment_status": "unknown",
        }

    booking_state = _clean_text(context.get("payment_dependency_state"))
    payment_state = _clean_text(context.get("latest_payment_status"))
    latest_session_id = _clean_text(context.get("latest_external_session_id"))
    requested_session_id = _clean_text(session_id)
    if booking_state == "paid" or payment_state == "paid":
        status = "paid"
    elif payment_state in {"failed", "expired"}:
        status = payment_state
    elif requested_session_id and latest_session_id == requested_session_id:
        status = "verifying"
    else:
        status = booking_state or payment_state or "pending"

    return {
        "status": "ok",
        "tenant_id": _clean_text(context.get("tenant_id")),
        "booking_reference": _clean_text(context.get("booking_reference")),
        "booking_intent_id": _clean_text(context.get("booking_intent_id")),
        "payment_status": status,
        "booking_payment_state": booking_state,
        "latest_payment_status": payment_state,
        "latest_payment_option": _clean_text(context.get("latest_payment_option")),
        "latest_payment_intent_id": _clean_text(context.get("latest_payment_intent_id")),
        "latest_external_session_id": latest_session_id,
        "session_match": bool(requested_session_id and latest_session_id == requested_session_id),
        "amount_aud": _amount_float(context.get("latest_amount_aud")),
        "currency": _clean_currency(context.get("latest_currency")),
    }
