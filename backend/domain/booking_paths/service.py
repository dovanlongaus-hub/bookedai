from __future__ import annotations

from core.contracts.booking_trust import BookingPathOption, BookingTrustContract


class BookingPathResolverService:
    """Foundation seam for path selection after trust evaluation."""

    def resolve(self, trust: BookingTrustContract) -> BookingPathOption:
        return trust.recommended_path

