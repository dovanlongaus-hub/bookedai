"""Static bank-account constants for chess.bookedai.au student payments.

These accounts power the three payment options offered by GM Mai Hung's chess
booking flow:

1. Stripe-hosted AUD card checkout (configured via environment + Stripe API).
2. Vietnamese VND domestic transfer with a VietQR-rendered QR image.
3. Australian AUD domestic transfer (Westpac) for parents already in AU.

The constants live in their own module so the payment-options handler, tests,
and any future tenant-admin "view static bank details" page all read from a
single source of truth instead of copying numbers around.
"""

from __future__ import annotations

from typing import Final


CHESS_VND_BANK: Final[dict[str, str]] = {
    "bank_name": "Techcombank",
    # NAPAS BIN for Techcombank (Vietnam Technological and Commercial Joint Stock Bank)
    # used by the VietQR.io public QR generator.
    "bank_bin": "970407",
    "account_holder": "NGUYEN THI MAI HUNG",
    "account_number": "949396959999",
}

CHESS_AUD_BANK: Final[dict[str, str]] = {
    "bank_name": "Westpac",
    "account_holder": "Van Long Do",
    "bsb": "732250",
    "account_number": "785932",
}


__all__ = ["CHESS_VND_BANK", "CHESS_AUD_BANK"]
