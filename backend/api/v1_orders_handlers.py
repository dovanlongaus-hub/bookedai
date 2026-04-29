"""Public order detail + wallet pass handlers for chess.bookedai.au.

These endpoints back the Humanitix-style order confirmation UI on
``chess.bookedai.au`` and the parent-facing wallet add-to-pass flow on the
portal subdomain. No tenant-admin auth is required: ``order_reference``
itself is the security token and must be treated as an opaque secret in
URLs / emails.

Three endpoints live here:

* ``GET /api/v1/orders/{order_reference}`` — return a structured order
  envelope: customer, sessions, payment, coach, promo, support.
* ``GET /api/v1/orders/{order_reference}/wallet/apple`` — return a
  ``application/vnd.apple.pkpass`` binary built from the current order data.
* ``GET /api/v1/orders/{order_reference}/wallet/google`` — return a
  Google Wallet save URL (JWT-signed) for the same order.

When wallet credentials are not configured, the wallet endpoints gracefully
degrade with HTTP 503 + a stable error code so the frontend can surface a
clear "wallet pass coming soon" message instead of crashing.
"""

from __future__ import annotations

from datetime import date as _date, datetime, time as _time, timezone as _tz
from typing import Any

from fastapi import Request
from fastapi.responses import JSONResponse, Response
from sqlalchemy import text

from api.v1_routes import _error_response, _success_response
from core.errors import AppError
from core.logging import get_logger
from db import get_session
from service_layer.wallet_apple_service import (
    AppleWalletNotConfiguredError,
    build_apple_wallet_pkpass,
)
from service_layer.wallet_google_service import (
    GoogleWalletNotConfiguredError,
    build_google_wallet_save_url,
)


_logger = get_logger("bookedai.api.v1_orders_handlers")


_DEFAULT_TIMEZONE = "Asia/Ho_Chi_Minh"
_DEFAULT_DURATION_MINUTES = 60
_DEFAULT_SUPPORT_EMAIL = "chess@bookedai.au"
_CHESS_ORDER_BASE_URL = "https://chess.bookedai.au/orders"


# ---------------------------------------------------------------------------
# Order detail
# ---------------------------------------------------------------------------


async def _fetch_order_row(session, *, order_reference: str) -> dict[str, Any] | None:
    """Single-round-trip lookup for the booking_intent + linked tenant rows.

    Joins:
      - contacts (customer info)
      - service_merchant_profiles (program name, tier, currency, amount)
      - tenant_settings (coach_profile + support contacts)
      - chess_course_schedule_slots (cohort_label + concrete starts_at)
    """
    normalized_reference = (order_reference or "").strip()
    if not normalized_reference:
        return None

    result = await session.execute(
        text(
            """
            select
              bi.id::text as booking_intent_id,
              bi.tenant_id::text as tenant_id,
              bi.booking_reference,
              bi.service_id,
              bi.service_name,
              bi.requested_date,
              bi.requested_time,
              bi.timezone,
              bi.status,
              bi.payment_dependency_state,
              bi.created_at,
              bi.metadata_json,
              c.full_name as customer_name,
              c.email as customer_email,
              c.phone as customer_phone,
              smp.name as program_name,
              smp.summary as program_summary,
              smp.amount_aud as program_amount_aud,
              smp.display_price as program_display_price_vnd,
              smp.currency_code as program_currency_code,
              smp.duration_minutes as program_duration_minutes,
              smp.metadata as program_metadata,
              ts.settings_json as tenant_settings_json
            from booking_intents bi
            left join contacts c on c.id = bi.contact_id
            left join service_merchant_profiles smp
              on smp.tenant_id::text = bi.tenant_id::text
             and smp.service_id = bi.service_id
            left join tenant_settings ts on ts.tenant_id = bi.tenant_id
            where bi.booking_reference = :booking_reference
            limit 1
            """
        ),
        {"booking_reference": normalized_reference},
    )
    row = result.mappings().first()
    if not row:
        return None
    return dict(row)


async def _fetch_schedule_slot(
    session,
    *,
    schedule_slot_id: str | None,
    tenant_id: str | None,
) -> dict[str, Any] | None:
    if not schedule_slot_id or not tenant_id:
        return None
    try:
        result = await session.execute(
            text(
                """
                select
                  id::text as id,
                  service_id,
                  starts_at,
                  duration_minutes,
                  timezone,
                  cohort_label,
                  status,
                  zoho_meeting_url,
                  zoho_calendar_event_url
                from chess_course_schedule_slots
                where id::text = :slot_id
                  and tenant_id::text = :tenant_id
                limit 1
                """
            ),
            {"slot_id": schedule_slot_id, "tenant_id": tenant_id},
        )
    except Exception:  # noqa: BLE001 - table may not exist in some envs
        return None
    row = result.mappings().first()
    return dict(row) if row else None


def _coerce_iso(value: Any) -> str | None:
    if value is None:
        return None
    if isinstance(value, datetime):
        return value.isoformat()
    if isinstance(value, _date):
        return value.isoformat()
    if isinstance(value, _time):
        return value.isoformat()
    raw = str(value).strip()
    return raw or None


def _combine_date_time_iso(
    *,
    requested_date: Any,
    requested_time: Any,
    timezone_name: str | None,
) -> str | None:
    """Combine YYYY-MM-DD + HH:MM[:SS] into a tz-aware ISO timestamp string."""
    if not requested_date:
        return None
    try:
        if hasattr(requested_date, "year"):
            d = requested_date
        else:
            d = datetime.strptime(str(requested_date)[:10], "%Y-%m-%d").date()
        if requested_time and hasattr(requested_time, "hour"):
            t = requested_time
        elif requested_time:
            time_str = str(requested_time)[:8]
            t = datetime.strptime(time_str[:5], "%H:%M").time()
        else:
            t = _time(0, 0)
        try:
            from zoneinfo import ZoneInfo

            tz = ZoneInfo(timezone_name or _DEFAULT_TIMEZONE)
        except Exception:  # noqa: BLE001
            tz = _tz.utc
        return datetime.combine(d, t, tzinfo=tz).isoformat()
    except Exception:  # noqa: BLE001
        return None


def _resolve_session_status(
    *,
    booking_status: str | None,
    starts_at_iso: str | None,
) -> str:
    status = (booking_status or "").strip().lower()
    if status in {"cancelled", "canceled"}:
        return "cancelled"
    # Best-effort upcoming/completed split using a UTC compare.
    if starts_at_iso:
        try:
            dt = datetime.fromisoformat(starts_at_iso.replace("Z", "+00:00"))
            now = datetime.now(tz=_tz.utc)
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=_tz.utc)
            if dt < now:
                return "completed"
        except Exception:  # noqa: BLE001
            pass
    return "upcoming"


def _resolve_payment(
    *,
    metadata: dict[str, Any],
    payment_dependency_state: str | None,
    program_amount_aud: Any,
    program_display_price_vnd: Any,
    program_currency_code: str | None,
) -> dict[str, Any]:
    """Combine booking metadata + Stripe webhook reconciliation fields."""
    md = metadata if isinstance(metadata, dict) else {}
    payment_status_raw = (
        str(md.get("payment_status") or "").strip().lower()
        or str(payment_dependency_state or "").strip().lower()
    )
    if payment_status_raw in {"paid", "succeeded", "complete", "completed"}:
        status = "paid"
    elif payment_status_raw in {"failed", "expired", "cancelled", "canceled"}:
        status = "unpaid"
    elif payment_status_raw in {"pending", "processing"}:
        status = "pending"
    elif payment_status_raw == "":
        status = "pending"
    else:
        status = payment_status_raw

    method_raw = str(md.get("payment_method") or md.get("bookedai_kind") or "").lower()
    if "stripe" in method_raw or md.get("stripe_session_id"):
        method = "stripe"
    elif "vnd" in method_raw:
        method = "vnd_bank"
    elif "aud" in method_raw or "westpac" in method_raw:
        method = "aud_bank"
    else:
        method = None

    currency = (program_currency_code or "").upper() or None
    amount: float | int | None = None
    try:
        if program_amount_aud is not None:
            amount = float(program_amount_aud)
            currency = currency or "AUD"
    except (TypeError, ValueError):
        amount = None
    if amount is None and program_display_price_vnd:
        # Best-effort: extract digits from "1,040,000 VND"
        digits = "".join(ch for ch in str(program_display_price_vnd) if ch.isdigit())
        if digits:
            try:
                amount = int(digits)
                currency = currency or "VND"
            except ValueError:
                amount = None

    paid_at = md.get("paid_at") or md.get("stripe_paid_at")
    receipt_url = md.get("receipt_url") or md.get("stripe_receipt_url")
    return {
        "method": method,
        "currency": currency,
        "amount": amount,
        "status": status,
        "paid_at": str(paid_at) if paid_at else None,
        "receipt_url": str(receipt_url) if receipt_url else None,
    }


def _resolve_coach(tenant_settings: Any) -> dict[str, Any]:
    settings = tenant_settings if isinstance(tenant_settings, dict) else {}
    profile = settings.get("coach_profile")
    if not isinstance(profile, dict):
        return {
            "display_name": None,
            "title_short": None,
            "bio_short": None,
        }
    full_name = (profile.get("display_name_en") or profile.get("full_name") or "").strip()
    bio = (profile.get("bio_en") or "").strip()
    if len(bio) > 240:
        bio = bio[:237].rstrip() + "..."
    return {
        "display_name": full_name or None,
        "title_short": (profile.get("title_short") or "").strip() or None,
        "bio_short": bio or None,
    }


def _resolve_support(tenant_settings: Any) -> dict[str, Any]:
    settings = tenant_settings if isinstance(tenant_settings, dict) else {}
    return {
        "email": (settings.get("support_email") or _DEFAULT_SUPPORT_EMAIL),
        "phone": settings.get("support_phone") or None,
        "telegram": settings.get("support_telegram") or None,
        "whatsapp": settings.get("support_whatsapp") or None,
    }


def _resolve_promo(metadata: Any, tenant_settings: Any) -> dict[str, Any]:
    md = metadata if isinstance(metadata, dict) else {}
    promo = md.get("promo")
    if isinstance(promo, dict) and promo.get("applied"):
        return {
            "applied": True,
            "code": promo.get("code"),
            "discount_pct": promo.get("discount_pct"),
            "label": promo.get("label"),
        }
    settings = tenant_settings if isinstance(tenant_settings, dict) else {}
    launch = settings.get("launch_promo") if isinstance(settings, dict) else None
    if isinstance(launch, dict) and md.get("launch_promo_applied"):
        return {
            "applied": True,
            "code": launch.get("code") or "LAUNCH",
            "discount_pct": launch.get("discount_first_month_pct"),
            "label": launch.get("label_en") or "Launch promo",
        }
    return {"applied": False, "code": None, "discount_pct": None, "label": None}


def _build_session_view(
    *,
    booking_row: dict[str, Any],
    metadata: dict[str, Any],
    schedule_slot: dict[str, Any] | None,
) -> dict[str, Any]:
    program_name = (
        booking_row.get("program_name")
        or booking_row.get("service_name")
        or "BookedAI Session"
    )
    timezone_name = (
        booking_row.get("timezone")
        or (schedule_slot.get("timezone") if schedule_slot else None)
        or _DEFAULT_TIMEZONE
    )
    if schedule_slot and schedule_slot.get("starts_at"):
        starts_at_iso = _coerce_iso(schedule_slot["starts_at"])
        duration_minutes = (
            schedule_slot.get("duration_minutes")
            or booking_row.get("program_duration_minutes")
            or _DEFAULT_DURATION_MINUTES
        )
    else:
        starts_at_iso = _combine_date_time_iso(
            requested_date=booking_row.get("requested_date"),
            requested_time=booking_row.get("requested_time"),
            timezone_name=timezone_name,
        )
        duration_minutes = (
            booking_row.get("program_duration_minutes")
            or _DEFAULT_DURATION_MINUTES
        )

    cohort_label = None
    if schedule_slot:
        cohort_label = schedule_slot.get("cohort_label")
    if not cohort_label and isinstance(metadata.get("schedule_slot"), dict):
        cohort_label = metadata["schedule_slot"].get("cohort_label")

    zoho_meeting = metadata.get("zoho_meeting") if isinstance(metadata, dict) else None
    meeting_url = None
    calendar_event_url = None
    if isinstance(zoho_meeting, dict):
        meeting_url = (zoho_meeting.get("meeting_url") or "").strip() or None
        calendar_event_url = (
            (zoho_meeting.get("calendar_event_url") or "").strip() or None
        )
    if not meeting_url and schedule_slot:
        meeting_url = (schedule_slot.get("zoho_meeting_url") or "").strip() or None
        calendar_event_url = calendar_event_url or (
            (schedule_slot.get("zoho_calendar_event_url") or "").strip() or None
        )

    program_metadata = booking_row.get("program_metadata") or {}
    if not isinstance(program_metadata, dict):
        program_metadata = {}
    tier_value = program_metadata.get("tier")

    return {
        "id": (
            schedule_slot.get("id")
            if schedule_slot
            else booking_row.get("booking_intent_id")
        ),
        "starts_at": starts_at_iso,
        "duration_minutes": int(duration_minutes or _DEFAULT_DURATION_MINUTES),
        "timezone": timezone_name,
        "program_name": program_name,
        "tier": str(tier_value) if tier_value is not None else None,
        "cohort_label": cohort_label,
        "meeting_url": meeting_url,
        "calendar_event_url": calendar_event_url,
        "session_status": _resolve_session_status(
            booking_status=booking_row.get("status"),
            starts_at_iso=starts_at_iso,
        ),
    }


def _build_order_envelope(
    *,
    booking_row: dict[str, Any],
    schedule_slot: dict[str, Any] | None,
) -> dict[str, Any]:
    metadata = booking_row.get("metadata_json") or {}
    if not isinstance(metadata, dict):
        metadata = {}
    tenant_settings = booking_row.get("tenant_settings_json") or {}

    booking_status = (booking_row.get("status") or "").strip().lower()
    payment_dependency_state = (
        booking_row.get("payment_dependency_state") or ""
    ).strip().lower()
    if booking_status in {"cancelled", "canceled"}:
        order_status = "cancelled"
    elif (
        metadata.get("payment_status") in {"paid", "succeeded"}
        or payment_dependency_state == "paid"
        or booking_status == "confirmed"
    ):
        order_status = "confirmed"
    else:
        order_status = "pending_payment"

    session_view = _build_session_view(
        booking_row=booking_row,
        metadata=metadata,
        schedule_slot=schedule_slot,
    )

    payment = _resolve_payment(
        metadata=metadata,
        payment_dependency_state=payment_dependency_state,
        program_amount_aud=booking_row.get("program_amount_aud"),
        program_display_price_vnd=booking_row.get("program_display_price_vnd"),
        program_currency_code=booking_row.get("program_currency_code"),
    )

    return {
        "order_reference": booking_row.get("booking_reference"),
        "status": order_status,
        "created_at": _coerce_iso(booking_row.get("created_at")),
        "customer": {
            "name": booking_row.get("customer_name"),
            "email": booking_row.get("customer_email"),
            "phone": booking_row.get("customer_phone"),
        },
        "sessions": [session_view],
        "payment": payment,
        "coach": _resolve_coach(tenant_settings),
        "promo": _resolve_promo(metadata, tenant_settings),
        "support": _resolve_support(tenant_settings),
    }


async def _load_order_envelope(
    session,
    *,
    order_reference: str,
) -> dict[str, Any] | None:
    booking_row = await _fetch_order_row(session, order_reference=order_reference)
    if not booking_row:
        return None
    metadata = booking_row.get("metadata_json") or {}
    if not isinstance(metadata, dict):
        metadata = {}
    schedule_slot_id = (
        str(metadata.get("schedule_slot_id") or "").strip() or None
    )
    schedule_slot = await _fetch_schedule_slot(
        session,
        schedule_slot_id=schedule_slot_id,
        tenant_id=booking_row.get("tenant_id"),
    )
    return _build_order_envelope(
        booking_row=booking_row,
        schedule_slot=schedule_slot,
    )


async def get_order(order_reference: str, request: Request):
    """Return the structured order envelope (or 404 on unknown reference)."""
    try:
        async with get_session(request.app.state.session_factory) as session:
            envelope = await _load_order_envelope(
                session,
                order_reference=order_reference,
            )
        if not envelope:
            return _error_response(
                AppError(
                    code="order_not_found",
                    message=(
                        "We couldn't find an order with that reference. "
                        "Double-check the link in your confirmation email."
                    ),
                    status_code=404,
                    details={"order_reference": order_reference},
                ),
                tenant_id=None,
                actor_context=None,
            )
        return _success_response(envelope, tenant_id=None, actor_context=None)
    except AppError as error:
        return _error_response(error, tenant_id=None, actor_context=None)


# ---------------------------------------------------------------------------
# Apple Wallet
# ---------------------------------------------------------------------------


async def get_order_apple_wallet(order_reference: str, request: Request):
    """Return a binary ``.pkpass`` for the order, or 503 when unconfigured."""
    try:
        async with get_session(request.app.state.session_factory) as session:
            envelope = await _load_order_envelope(
                session,
                order_reference=order_reference,
            )
        if not envelope:
            return _error_response(
                AppError(
                    code="order_not_found",
                    message="Order not found.",
                    status_code=404,
                    details={"order_reference": order_reference},
                ),
                tenant_id=None,
                actor_context=None,
            )

        order_url = f"{_CHESS_ORDER_BASE_URL}/{order_reference}"
        try:
            pkpass_bytes = build_apple_wallet_pkpass(
                envelope=envelope,
                order_url=order_url,
            )
        except AppleWalletNotConfiguredError as exc:
            return JSONResponse(
                status_code=503,
                content={
                    "error": "apple_wallet_not_configured",
                    "message": str(exc)
                    or (
                        "Apple Wallet credentials not configured. Add "
                        "APPLE_WALLET_* env vars + .p12/.pem files."
                    ),
                },
            )
        filename = f"bookedai-{order_reference}.pkpass"
        return Response(
            content=pkpass_bytes,
            media_type="application/vnd.apple.pkpass",
            headers={
                "Content-Disposition": f'attachment; filename="{filename}"',
                "Cache-Control": "no-store",
            },
        )
    except AppError as error:
        return _error_response(error, tenant_id=None, actor_context=None)


# ---------------------------------------------------------------------------
# Google Wallet
# ---------------------------------------------------------------------------


async def get_order_google_wallet(order_reference: str, request: Request):
    """Return ``{ data: { save_url } }`` or 503 when not configured."""
    try:
        async with get_session(request.app.state.session_factory) as session:
            envelope = await _load_order_envelope(
                session,
                order_reference=order_reference,
            )
        if not envelope:
            return _error_response(
                AppError(
                    code="order_not_found",
                    message="Order not found.",
                    status_code=404,
                    details={"order_reference": order_reference},
                ),
                tenant_id=None,
                actor_context=None,
            )

        order_url = f"{_CHESS_ORDER_BASE_URL}/{order_reference}"
        try:
            save_url = build_google_wallet_save_url(
                envelope=envelope,
                order_url=order_url,
            )
        except GoogleWalletNotConfiguredError as exc:
            return JSONResponse(
                status_code=503,
                content={
                    "error": "google_wallet_not_configured",
                    "message": str(exc)
                    or (
                        "Google Wallet credentials not configured. Add "
                        "GOOGLE_WALLET_* env vars + service account JSON."
                    ),
                },
            )
        return _success_response(
            {"save_url": save_url},
            tenant_id=None,
            actor_context=None,
        )
    except AppError as error:
        return _error_response(error, tenant_id=None, actor_context=None)


__all__ = [
    "get_order",
    "get_order_apple_wallet",
    "get_order_google_wallet",
]
