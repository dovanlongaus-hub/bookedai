from __future__ import annotations

import json
from urllib.parse import quote

from repositories.base import RepositoryContext
from repositories.booking_intent_repository import BookingIntentRepository
from repositories.payment_intent_repository import PaymentIntentRepository


def _normalized_text(value: object | None) -> str:
    return str(value or "").strip()


def _normalized_amount(value: object | None) -> str:
    try:
        return f"{float(str(value).strip()):.2f}"
    except (TypeError, ValueError):
        return _normalized_text(value).lower()


def _canonical_payment_status(value: object | None) -> str:
    normalized = _normalized_text(value).lower()
    aliases = {
        "ready": "stripe_checkout_ready",
        "checkout_ready": "stripe_checkout_ready",
        "stripe_ready": "stripe_checkout_ready",
        "stripe_checkout_ready": "stripe_checkout_ready",
        "pending": "payment_follow_up_required",
        "manual_follow_up": "payment_follow_up_required",
        "follow_up_required": "payment_follow_up_required",
        "payment_follow_up_required": "payment_follow_up_required",
        "paid": "paid",
        "succeeded": "paid",
        "payment_succeeded": "paid",
        "completed": "paid",
        "failed": "failed",
        "payment_failed": "failed",
        "cancelled": "cancelled",
        "canceled": "cancelled",
        "expired": "expired",
        "refunded": "refunded",
    }
    return aliases.get(normalized, normalized)


def _normalized_value(value: object | None) -> str:
    return str(value or "").strip().lower()


def _build_normalized_shadow_index(
    booking_rows: list[dict[str, object | None]],
    payment_rows: list[dict[str, object | None]],
) -> dict[str, dict[str, object | None]]:
    payments_by_booking_intent = {
        _normalized_text(item.get("booking_intent_id")): item for item in payment_rows
    }
    normalized_index: dict[str, dict[str, object | None]] = {}

    for booking_row in booking_rows:
        booking_reference = _normalized_text(booking_row.get("booking_reference"))
        if not booking_reference:
            continue

        payment_row = payments_by_booking_intent.get(
            _normalized_text(booking_row.get("booking_intent_id"))
        )
        normalized_index[booking_reference] = {
            "booking_reference": booking_reference,
            "service_name": booking_row.get("service_name"),
            "service_id": booking_row.get("service_id"),
            "requested_date": booking_row.get("requested_date"),
            "requested_time": booking_row.get("requested_time"),
            "timezone": booking_row.get("timezone"),
            "amount_aud": payment_row.get("amount_aud") if payment_row else None,
            "payment_status": payment_row.get("payment_status") if payment_row else None,
            "payment_url": payment_row.get("payment_url") if payment_row else None,
            "created_at": booking_row.get("created_at"),
            "email_status": (booking_row.get("metadata_json") or {}).get("email_status")
            if isinstance(booking_row.get("metadata_json"), dict)
            else None,
            "meeting_status": (booking_row.get("metadata_json") or {}).get("meeting_status")
            if isinstance(booking_row.get("metadata_json"), dict)
            else None,
            "workflow_status": (booking_row.get("metadata_json") or {}).get("workflow_status")
            if isinstance(booking_row.get("metadata_json"), dict)
            else None,
        }

    return normalized_index


def _compare_booking_summary(
    legacy_item: dict[str, object | None],
    normalized_item: dict[str, object | None],
) -> bool:
    scalar_keys = (
        "booking_reference",
        "service_name",
        "service_id",
        "requested_date",
        "requested_time",
        "timezone",
        "payment_url",
        "email_status",
        "meeting_status",
        "workflow_status",
    )
    scalar_match = all(
        _normalized_value(legacy_item.get(key)) == _normalized_value(normalized_item.get(key))
        for key in scalar_keys
    )
    amount_match = _normalized_amount(legacy_item.get("amount_aud")) == _normalized_amount(
        normalized_item.get("amount_aud")
    )
    payment_match = _canonical_payment_status(legacy_item.get("payment_status")) == _canonical_payment_status(
        normalized_item.get("payment_status")
    )
    return scalar_match and amount_match and payment_match


def _classify_shadow_mismatch(
    legacy_item: dict[str, object | None],
    normalized_item: dict[str, object | None],
) -> str:
    if _canonical_payment_status(legacy_item.get("payment_status")) != _canonical_payment_status(
        normalized_item.get("payment_status")
    ):
        return "payment_status"

    if _normalized_amount(legacy_item.get("amount_aud")) != _normalized_amount(
        normalized_item.get("amount_aud")
    ):
        return "amount"

    if _normalized_value(legacy_item.get("workflow_status")) != _normalized_value(
        normalized_item.get("workflow_status")
    ):
        return "workflow_status"

    if _normalized_value(legacy_item.get("email_status")) != _normalized_value(
        normalized_item.get("email_status")
    ):
        return "email_status"

    if _normalized_value(legacy_item.get("meeting_status")) != _normalized_value(
        normalized_item.get("meeting_status")
    ):
        return "meeting_status"

    return "field_parity"


def _build_drift_example(*, booking_reference: str, category: str) -> dict[str, str]:
    return {
        "booking_reference": booking_reference,
        "category": category,
    }


def _format_drift_value(value: object | None) -> str | None:
    if value is None:
        return None
    normalized = str(value).strip()
    if not normalized:
        return None
    return normalized[:120]


def _observed_at(
    legacy_item: dict[str, object | None],
    normalized_item: dict[str, object | None] | None = None,
) -> str | None:
    legacy_created_at = _format_drift_value(legacy_item.get("created_at"))
    if legacy_created_at:
        return legacy_created_at

    if normalized_item:
        return _format_drift_value(normalized_item.get("created_at"))
    return None


def _mismatch_values(
    category: str,
    legacy_item: dict[str, object | None],
    normalized_item: dict[str, object | None] | None,
) -> tuple[str | None, str | None]:
    if category == "payment_status":
        return (
            _canonical_payment_status(legacy_item.get("payment_status")) or None,
            _canonical_payment_status((normalized_item or {}).get("payment_status")) or None,
        )
    if category == "amount":
        return (
            _format_drift_value(legacy_item.get("amount_aud")),
            _format_drift_value((normalized_item or {}).get("amount_aud")),
        )
    if category == "workflow_status":
        return (
            _format_drift_value(legacy_item.get("workflow_status")),
            _format_drift_value((normalized_item or {}).get("workflow_status")),
        )
    if category == "email_status":
        return (
            _format_drift_value(legacy_item.get("email_status")),
            _format_drift_value((normalized_item or {}).get("email_status")),
        )
    if category == "meeting_status":
        return (
            _format_drift_value(legacy_item.get("meeting_status")),
            _format_drift_value((normalized_item or {}).get("meeting_status")),
        )

    return (
        _format_drift_value(legacy_item.get("service_name"))
        or _format_drift_value(legacy_item.get("requested_time"))
        or _format_drift_value(legacy_item.get("payment_url")),
        _format_drift_value((normalized_item or {}).get("service_name"))
        or _format_drift_value((normalized_item or {}).get("requested_time"))
        or _format_drift_value((normalized_item or {}).get("payment_url")),
    )


def _build_recent_drift_example(
    *,
    booking_reference: str,
    category: str,
    legacy_item: dict[str, object | None],
    normalized_item: dict[str, object | None] | None = None,
) -> dict[str, str]:
    legacy_value, shadow_value = _mismatch_values(category, legacy_item, normalized_item)
    note = {
        "missing_mirror": "Legacy booking exists, but no normalized mirror row was found yet.",
        "payment_status": "Payment lifecycle drifted between legacy and normalized mirrors.",
        "amount": "Captured amount differs between the legacy booking and normalized payment mirror.",
        "workflow_status": "Workflow lifecycle differs between the live admin view and shadow projection.",
        "email_status": "Email delivery lifecycle differs between legacy and normalized mirrors.",
        "meeting_status": "Meeting lifecycle differs between the live admin view and shadow projection.",
        "field_parity": "A non-primary booking field differs between the legacy and normalized views.",
    }.get(category, "Shadow drift was detected for this booking reference.")

    payload = {
        "booking_reference": booking_reference,
        "category": category,
        "observed_at": _observed_at(legacy_item, normalized_item) or "",
        "note": note,
        "legacy_value": legacy_value or "",
        "shadow_value": shadow_value or "",
    }
    return payload


def _serialize_drift_examples(examples: list[dict[str, str]]) -> str:
    return ",".join(
        f'{item["booking_reference"]}:{item["category"]}'
        for item in examples
        if item.get("booking_reference") and item.get("category")
    )


def _serialize_recent_drift_examples(examples: list[dict[str, str]]) -> str:
    if not examples:
        return ""
    return quote(json.dumps(examples, separators=(",", ":"), ensure_ascii=True), safe="")


async def build_admin_booking_shadow_summary(
    session,
    *,
    tenant_id: str | None,
    legacy_records: list[dict[str, object | None]],
    limit: int = 100,
) -> dict[str, int | str]:
    if not tenant_id:
        return {
            "status": "unavailable",
            "matched_count": 0,
            "mismatch_count": 0,
            "missing_count": 0,
            "payment_status_mismatch_count": 0,
            "amount_mismatch_count": 0,
            "meeting_status_mismatch_count": 0,
            "workflow_status_mismatch_count": 0,
            "email_status_mismatch_count": 0,
            "field_parity_mismatch_count": 0,
            "top_drift_references": "",
            "recent_drift_examples": "",
        }

    booking_repository = BookingIntentRepository(RepositoryContext(session=session, tenant_id=tenant_id))
    payment_repository = PaymentIntentRepository(RepositoryContext(session=session, tenant_id=tenant_id))

    try:
        booking_rows = await booking_repository.list_shadow_booking_rows(
            tenant_id=tenant_id,
            limit=limit,
        )
        payment_rows = await payment_repository.list_latest_shadow_payment_rows(
            tenant_id=tenant_id,
            limit=limit,
        )
    except Exception:
        return {
            "status": "unavailable",
            "matched_count": 0,
            "mismatch_count": 0,
            "missing_count": 0,
            "payment_status_mismatch_count": 0,
            "amount_mismatch_count": 0,
            "meeting_status_mismatch_count": 0,
            "workflow_status_mismatch_count": 0,
            "email_status_mismatch_count": 0,
            "field_parity_mismatch_count": 0,
            "top_drift_references": "",
            "recent_drift_examples": "",
        }

    normalized_index = _build_normalized_shadow_index(booking_rows, payment_rows)
    if not normalized_index:
        return {
            "status": "empty",
            "matched_count": 0,
            "mismatch_count": 0,
            "missing_count": 0,
            "payment_status_mismatch_count": 0,
            "amount_mismatch_count": 0,
            "meeting_status_mismatch_count": 0,
            "workflow_status_mismatch_count": 0,
            "email_status_mismatch_count": 0,
            "field_parity_mismatch_count": 0,
            "top_drift_references": "",
            "recent_drift_examples": "",
        }

    matched_count = 0
    mismatch_count = 0
    missing_count = 0
    payment_status_mismatch_count = 0
    amount_mismatch_count = 0
    meeting_status_mismatch_count = 0
    workflow_status_mismatch_count = 0
    email_status_mismatch_count = 0
    field_parity_mismatch_count = 0
    drift_examples: list[dict[str, str]] = []
    recent_drift_examples: list[dict[str, str]] = []

    for legacy_item in legacy_records[:limit]:
        booking_reference = _normalized_text(legacy_item.get("booking_reference"))
        normalized_item = normalized_index.get(booking_reference)
        if not normalized_item:
            missing_count += 1
            if booking_reference and len(drift_examples) < 5:
                drift_examples.append(
                    _build_drift_example(
                        booking_reference=booking_reference,
                        category="missing_mirror",
                    )
                )
            if booking_reference and len(recent_drift_examples) < 5:
                recent_drift_examples.append(
                    _build_recent_drift_example(
                        booking_reference=booking_reference,
                        category="missing_mirror",
                        legacy_item=legacy_item,
                    )
                )
            continue
        if _compare_booking_summary(legacy_item, normalized_item):
            matched_count += 1
        else:
            mismatch_count += 1
            mismatch_reason = _classify_shadow_mismatch(legacy_item, normalized_item)
            if booking_reference and len(drift_examples) < 5:
                drift_examples.append(
                    _build_drift_example(
                        booking_reference=booking_reference,
                        category=mismatch_reason,
                    )
                )
            if booking_reference and len(recent_drift_examples) < 5:
                recent_drift_examples.append(
                    _build_recent_drift_example(
                        booking_reference=booking_reference,
                        category=mismatch_reason,
                        legacy_item=legacy_item,
                        normalized_item=normalized_item,
                    )
                )
            if mismatch_reason == "payment_status":
                payment_status_mismatch_count += 1
            elif mismatch_reason == "amount":
                amount_mismatch_count += 1
            elif mismatch_reason == "meeting_status":
                meeting_status_mismatch_count += 1
            elif mismatch_reason == "workflow_status":
                workflow_status_mismatch_count += 1
            elif mismatch_reason == "email_status":
                email_status_mismatch_count += 1
            else:
                field_parity_mismatch_count += 1

    status = "matched" if mismatch_count == 0 and missing_count == 0 else "mismatch"
    return {
        "status": status,
        "matched_count": matched_count,
        "mismatch_count": mismatch_count,
        "missing_count": missing_count,
        "payment_status_mismatch_count": payment_status_mismatch_count,
        "amount_mismatch_count": amount_mismatch_count,
        "meeting_status_mismatch_count": meeting_status_mismatch_count,
        "workflow_status_mismatch_count": workflow_status_mismatch_count,
        "email_status_mismatch_count": email_status_mismatch_count,
        "field_parity_mismatch_count": field_parity_mismatch_count,
        "top_drift_references": _serialize_drift_examples(drift_examples),
        "recent_drift_examples": _serialize_recent_drift_examples(recent_drift_examples),
    }
