from __future__ import annotations

from core.contracts.booking_trust import BookingTrustContract, VerificationResultContract


class BookingTrustService:
    """Foundation seam for availability verification and booking confidence evaluation."""

    def build_unknown_state(self) -> BookingTrustContract:
        verification = VerificationResultContract(
            source_type="unverified",
            state="unknown",
            verified=False,
            notes=["Availability has not been verified yet."],
        )
        return BookingTrustContract(
            availability_state="unknown",
            booking_confidence="unverified",
            slot_status="unknown",
            recommended_path="request_callback",
            verification=verification,
        )

