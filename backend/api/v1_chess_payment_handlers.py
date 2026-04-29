"""Payment-options handler for chess.bookedai.au student bookings.

The chess subdomain offers three payment paths in parallel because parents are
based across both Vietnam and Australia and many of them prefer paying via
domestic bank transfer rather than card:

* ``stripe_aud``  -- Stripe-hosted card checkout (one-time, AUD).
* ``vnd_bank_qr`` -- Techcombank transfer with a VietQR-rendered QR image.
* ``aud_bank_transfer`` -- Westpac AU domestic transfer.

The handler returns all three so the frontend can render every option and let
the parent pick. Stripe gracefully degrades to ``configured: false`` when the
API key is missing/empty so the booking flow keeps working in environments
without Stripe credentials (CI, local, fresh deploys).
"""

from __future__ import annotations

from typing import Literal
from urllib.parse import quote, urlencode

import httpx
from fastapi import Request
from pydantic import BaseModel, Field

from core.errors import AppError, IntegrationAppError, PaymentAppError
from core.logging import get_logger
from integrations.chess_payment_accounts import CHESS_AUD_BANK, CHESS_VND_BANK
from integrations.stripe.constants import STRIPE_API_VERSION

from api.v1_routes import _error_response, _success_response


_logger = get_logger("bookedai.api.v1_chess_payment_handlers")


CHESS_STUDENT_PAYMENT_KIND = "chess_student_payment"


_DEFAULT_SUCCESS_URL = (
    "https://chess.bookedai.au/account?payment=success"
)
_DEFAULT_CANCEL_URL = (
    "https://chess.bookedai.au/?payment=cancelled"
)


_PROGRAM_LABELS: dict[str, str] = {
    "beginner": "Chess Beginner Program",
    "private": "Chess Private 1-on-1 Coaching",
    "tournament": "Chess Tournament Preparation",
    # `elite` superseded the legacy `home` (At-Home) tier when chess pivoted
    # to online-only delivery in migration 036. We keep `home` as an alias so
    # any cached frontend still passes through, but it now maps to the same
    # coach blurb as `elite`.
    "elite": "Chess Elite Online Plus",
    "home": "Chess Elite Online Plus",
    # 2026-04-29 grid (migration 045): Superkid + Advanced + Private 1-on-1.
    "superkid": "Chess Superkid Group (Tue/Fri)",
    "advanced_group": "Chess Advanced Group (Wed/Sun)",
    "private_1_1": "Chess Private 1-on-1 with WGM Mai Hưng",
}


class ChessPaymentOptionsRequest(BaseModel):
    """Inputs the public chess flow sends after a booking_intent is created."""

    lead_id: str = Field(..., description="Lead id returned by /api/v1/leads")
    booking_intent_id: str | None = Field(
        default=None,
        description="Booking-intent id returned by /api/v1/bookings/intents.",
    )
    program_key: Literal[
        "beginner",
        "private",
        "tournament",
        "elite",
        "home",  # legacy alias — kept so cached frontends keep working
        "superkid",
        "advanced_group",
        "private_1_1",
    ] = Field(
        ...,
        description="Which chess program the parent selected.",
    )
    amount_vnd: int = Field(..., ge=0, description="Vietnamese transfer amount.")
    amount_aud: float = Field(..., ge=0, description="Stripe + AU transfer amount.")
    parent_name: str = Field(..., description="Parent's full name.")
    parent_email: str = Field(..., description="Parent's email address.")
    locale: Literal["en", "vi"] = Field(default="en")


def _normalize_text(value: object | None) -> str:
    return str(value or "").strip()


def _transfer_reference(lead_id: str) -> str:
    """Build a short, human-friendly bank-transfer reference.

    Lead IDs are UUIDs in production but may be arbitrary strings in tests, so
    we normalise to the last 8 alphanumeric characters and fall back to the
    raw last-8 slice when no alphanumerics are present.
    """
    normalized = _normalize_text(lead_id)
    if not normalized:
        return "CHESS-NEWLEAD"
    alphanumeric = "".join(ch for ch in normalized if ch.isalnum())
    suffix = (alphanumeric or normalized)[-8:].upper()
    return f"CHESS-{suffix}"


def _resolve_program_label(program_key: str) -> str:
    return _PROGRAM_LABELS.get(
        program_key.strip().lower(),
        "Chess Coaching Booking",
    )


def _build_vietqr_image_url(
    *,
    bank_bin: str,
    account_number: str,
    amount_vnd: int,
    transfer_reference: str,
    account_holder: str,
) -> str:
    """Build the VietQR.io public QR image URL.

    https://img.vietqr.io/image/{bin}-{account}-compact2.png?
        amount=...&addInfo=...&accountName=...
    """
    base = (
        f"https://img.vietqr.io/image/{bank_bin}-{account_number}-compact2.png"
    )
    query = urlencode(
        {
            "amount": str(int(amount_vnd)),
            "addInfo": transfer_reference,
            "accountName": account_holder,
        },
        quote_via=quote,
    )
    return f"{base}?{query}"


async def _create_chess_stripe_checkout_session(
    *,
    stripe_secret_key: str,
    amount_aud: float,
    program_label: str,
    parent_email: str,
    parent_name: str,
    lead_id: str,
    booking_intent_id: str | None,
    transfer_reference: str,
    success_url: str,
    cancel_url: str,
) -> dict[str, str | None]:
    """Open a one-time AUD Stripe Checkout session for a chess student payment.

    Mirrors the public-booking helper in v1_booking_handlers but uses
    ``mode=payment`` (not subscription) and tags ``metadata.bookedai_kind``
    so the Stripe webhook can mark the booking_intent as paid (see
    ``service_layer.stripe_webhook_service``).
    """
    amount_cents = int(round(float(amount_aud) * 100))
    form_data: list[tuple[str, str]] = [
        ("mode", "payment"),
        ("success_url", success_url),
        ("cancel_url", cancel_url),
        ("line_items[0][quantity]", "1"),
        ("line_items[0][price_data][currency]", "aud"),
        ("line_items[0][price_data][unit_amount]", str(amount_cents)),
        ("line_items[0][price_data][product_data][name]", program_label),
        ("client_reference_id", transfer_reference),
        ("metadata[bookedai_kind]", CHESS_STUDENT_PAYMENT_KIND),
        ("metadata[lead_id]", lead_id),
        ("metadata[transfer_reference]", transfer_reference),
        ("metadata[program_label]", program_label),
    ]
    if booking_intent_id:
        form_data.append(("metadata[booking_intent_id]", booking_intent_id))
    normalized_email = _normalize_text(parent_email).lower()
    if normalized_email:
        form_data.append(("customer_email", normalized_email))
    normalized_name = _normalize_text(parent_name)
    if normalized_name:
        form_data.append(("metadata[parent_name]", normalized_name))

    async with httpx.AsyncClient(timeout=20) as client:
        response = await client.post(
            "https://api.stripe.com/v1/checkout/sessions",
            headers={
                "Authorization": f"Bearer {stripe_secret_key}",
                "Content-Type": "application/x-www-form-urlencoded",
                "Stripe-Version": STRIPE_API_VERSION,
            },
            content=urlencode(form_data).encode(),
        )
        response.raise_for_status()
        payload = response.json()

    checkout_url = _normalize_text(payload.get("url")) or None
    session_id = _normalize_text(payload.get("id")) or None
    if not checkout_url:
        raise PaymentAppError(
            "Stripe checkout did not return a checkout URL.",
            details={"lead_id": lead_id},
        )
    return {"checkout_url": checkout_url, "session_id": session_id}


def _resolve_payment_return_urls(request: Request) -> tuple[str, str]:
    settings = getattr(request.app.state, "settings", None)
    success_url = (
        _normalize_text(getattr(settings, "chess_payment_success_url", ""))
        or _DEFAULT_SUCCESS_URL
    )
    cancel_url = (
        _normalize_text(getattr(settings, "chess_payment_cancel_url", ""))
        or _DEFAULT_CANCEL_URL
    )
    return success_url, cancel_url


async def chess_payment_options(
    request: Request,
    payload: ChessPaymentOptionsRequest,
):
    """Return the three payment options for a chess student booking."""
    try:
        normalized_lead_id = _normalize_text(payload.lead_id)
        if not normalized_lead_id:
            raise PaymentAppError(
                "lead_id is required to build chess payment options.",
                details={"lead_id": payload.lead_id},
            )

        program_label = _resolve_program_label(payload.program_key)
        transfer_reference = _transfer_reference(normalized_lead_id)
        success_url, cancel_url = _resolve_payment_return_urls(request)

        stripe_secret_key = _normalize_text(
            getattr(getattr(request.app.state, "settings", None), "stripe_secret_key", "")
        )

        stripe_option: dict[str, object] = {
            "type": "stripe_aud",
            "currency": "AUD",
            "amount": float(payload.amount_aud),
            "configured": False,
        }
        if stripe_secret_key:
            try:
                stripe_session = await _create_chess_stripe_checkout_session(
                    stripe_secret_key=stripe_secret_key,
                    amount_aud=float(payload.amount_aud),
                    program_label=program_label,
                    parent_email=payload.parent_email,
                    parent_name=payload.parent_name,
                    lead_id=normalized_lead_id,
                    booking_intent_id=_normalize_text(payload.booking_intent_id) or None,
                    transfer_reference=transfer_reference,
                    success_url=success_url,
                    cancel_url=cancel_url,
                )
                stripe_option["configured"] = True
                stripe_option["stripe_checkout_url"] = stripe_session["checkout_url"]
                stripe_option["stripe_session_id"] = stripe_session["session_id"]
            except PaymentAppError:
                raise
            except Exception as exc:  # noqa: BLE001 - surface as integration error
                _logger.warning(
                    "chess_payment_stripe_session_failed",
                    extra={
                        "event_type": "chess_payment_stripe_session_failed",
                        "lead_id": normalized_lead_id,
                        "booking_intent_id": _normalize_text(payload.booking_intent_id),
                        "program_key": payload.program_key,
                    },
                    exc_info=exc,
                )
                # Soft-fail: keep the other two options even if Stripe is down.
                stripe_option["configured"] = False
                stripe_option["error"] = "stripe_unavailable"

        vnd_option: dict[str, object] = {
            "type": "vnd_bank_qr",
            "currency": "VND",
            "amount": int(payload.amount_vnd),
            "bank_name": CHESS_VND_BANK["bank_name"],
            "account_holder": CHESS_VND_BANK["account_holder"],
            "account_number": CHESS_VND_BANK["account_number"],
            "transfer_reference": transfer_reference,
            "qr_image_url": _build_vietqr_image_url(
                bank_bin=CHESS_VND_BANK["bank_bin"],
                account_number=CHESS_VND_BANK["account_number"],
                amount_vnd=int(payload.amount_vnd),
                transfer_reference=transfer_reference,
                account_holder=CHESS_VND_BANK["account_holder"],
            ),
        }

        aud_transfer_option: dict[str, object] = {
            "type": "aud_bank_transfer",
            "currency": "AUD",
            "amount": float(payload.amount_aud),
            "bank_name": CHESS_AUD_BANK["bank_name"],
            "account_holder": CHESS_AUD_BANK["account_holder"],
            "bsb": CHESS_AUD_BANK["bsb"],
            "account_number": CHESS_AUD_BANK["account_number"],
            "transfer_reference": transfer_reference,
        }

        return _success_response(
            {
                "lead_id": normalized_lead_id,
                "booking_intent_id": _normalize_text(payload.booking_intent_id) or None,
                "program_key": payload.program_key,
                "program_label": program_label,
                "transfer_reference": transfer_reference,
                "payment_options": [stripe_option, vnd_option, aud_transfer_option],
            },
            tenant_id=None,
            actor_context=None,
        )
    except AppError as error:
        return _error_response(error, tenant_id=None, actor_context=None)
    except IntegrationAppError as error:
        return _error_response(error, tenant_id=None, actor_context=None)
