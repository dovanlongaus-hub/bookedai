from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


PaymentOption = Literal[
    "stripe_card",
    "bank_transfer",
    "bank_transfer_qr",
    "partner_checkout",
    "invoice_after_confirmation",
]
PaymentStatus = Literal["pending", "requires_action", "paid", "failed", "cancelled", "unknown"]


class CheckoutIntentContract(BaseModel):
    booking_reference: str | None = None
    amount_aud: float | None = None
    payment_option: PaymentOption
    requires_booking_confirmation: bool = False
    currency: str = "AUD"
    checkout_url: str | None = None
    payment_reference: str | None = None
    expires_at: str | None = None


class BankTransferInstructionContract(BaseModel):
    account_name: str | None = None
    bsb: str | None = None
    account_number_masked: str | None = None
    reference: str | None = None
    qr_payload: str | None = None
    amount_aud: float | None = None
    currency: str = "AUD"
    due_date: str | None = None


class InvoiceSummaryContract(BaseModel):
    invoice_number: str | None = None
    period_label: str | None = None
    amount_due_aud: float | None = None
    status: PaymentStatus = "unknown"
    booking_reference: str | None = None
    currency: str = "AUD"
    payment_option: PaymentOption | None = None
    due_date: str | None = None


class PaymentOptionContract(BaseModel):
    option: PaymentOption
    label: str
    available: bool = True
    reason: str | None = None
    description: str | None = None
    action_label: str | None = None
    requires_manual_followup: bool = False
