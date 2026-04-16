from __future__ import annotations

from core.contracts.booking_trust import BookingTrustContract
from core.contracts.payments import CheckoutIntentContract, PaymentOptionContract


class PaymentOrchestrationService:
    """Foundation seam for trust-aware payment path selection."""

    def list_options(self, trust: BookingTrustContract) -> list[PaymentOptionContract]:
        if trust.booking_confidence == "high":
            return [PaymentOptionContract(option="stripe_card", label="Pay by card now")]
        if trust.booking_confidence == "medium":
            return [
                PaymentOptionContract(
                    option="invoice_after_confirmation",
                    label="Pay after provider confirmation",
                )
            ]
        return [
            PaymentOptionContract(
                option="bank_transfer",
                label="Await confirmation before payment",
                available=False,
                reason="Booking confidence is not high enough for upfront payment.",
            )
        ]

    def build_checkout_intent(self, booking_reference: str) -> CheckoutIntentContract:
        return CheckoutIntentContract(
            booking_reference=booking_reference,
            payment_option="stripe_card",
            requires_booking_confirmation=False,
        )

