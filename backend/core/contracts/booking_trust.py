from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


AvailabilityState = Literal[
    "verified_available",
    "limited",
    "fully_booked",
    "unknown",
    "partner_only",
]
BookingConfidenceLevel = Literal["high", "medium", "low", "unverified"]
BookingPathOption = Literal[
    "book_now",
    "request_slot",
    "call_provider",
    "book_on_partner_site",
    "join_waitlist",
    "request_callback",
]
SlotStatus = Literal["open", "held", "closed", "limited", "fully_booked", "unknown"]


class VerificationResultContract(BaseModel):
    source_type: str
    state: AvailabilityState
    verified: bool = False
    last_checked_at: str | None = None
    source_label: str | None = None
    source_url: str | None = None
    notes: list[str] = Field(default_factory=list)


class BookingTrustContract(BaseModel):
    availability_state: AvailabilityState
    booking_confidence: BookingConfidenceLevel
    slot_status: SlotStatus
    recommended_path: BookingPathOption
    verification: VerificationResultContract
    next_safe_action: str | None = None
    trust_notes: list[str] = Field(default_factory=list)
