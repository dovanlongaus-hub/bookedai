"""Customer-portal access token helpers.

The customer portal mounts under `/api/v1/portal/bookings/{booking_reference}/...`
and is reachable from any link the booking confirmation email or messaging
template surfaces. The booking reference itself is a short UUID-derived string
(8-10 hex characters), so it is brute-forceable on its own. To gate portal
read/write traffic we issue a per-booking access token at confirmation time and
require callers to present it on every portal request.

Design (Option B - stateful):

    plaintext  = secrets.token_urlsafe(32)            # 256-bit nonce
    storage    = sha256(plaintext).hexdigest()        # never store the plaintext
    expires_at = now + max_age_days
    revoked_at = NULL until ops or the customer rotates the token

The plaintext token is delivered exactly once via the booking confirmation
email (and any continuation links pushed through Telegram or WhatsApp). The
backend stores only the SHA-256 digest in `booking_intents`. Verification
hashes the inbound token and compares to the stored digest with
``hmac.compare_digest`` to keep timing leaks closed.

Backwards-compatibility note (legacy bookings):
- bookings created before migration 027 will not have a stored hash yet
- the verification helper supports a ``strict`` mode controlled by
  ``BOOKEDAI_PORTAL_TOKEN_STRICT`` (default false). When strict is false and
  the booking has no stored hash, callers may proceed without a token and a
  ``WARNING`` log line is emitted by the API layer. This is the temporary
  grace window that lets existing customers continue to access their portal
  while the new token plumbing rolls out
- once legacy bookings have aged out, ops will flip the flag default to true
  in a follow-up PR which will reject any portal call without a stored hash
"""

from __future__ import annotations

import hashlib
import hmac
import secrets
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta


class PortalTokenError(ValueError):
    """Raised when a portal access token is invalid, expired, or revoked."""


@dataclass(frozen=True)
class PortalAccessTokenIssue:
    """Result of issuing a brand-new portal access token."""

    plaintext: str
    """Random URL-safe token shipped to the customer (never stored)."""

    token_hash: str
    """SHA-256 hex digest of the plaintext token; stored in booking_intents."""

    expires_at: datetime
    """UTC expiry timestamp; stored in booking_intents.portal_access_token_expires_at."""


def _hash_plaintext(plaintext: str) -> str:
    return hashlib.sha256(plaintext.encode("utf-8")).hexdigest()


def generate_portal_access_token(
    booking_reference: str,
    *,
    max_age_days: int = 365,
) -> PortalAccessTokenIssue:
    """Mint a fresh portal access token bound to the given booking reference.

    The booking reference is not included in the token payload itself (the
    token is opaque), but it is required so callers can record an audit
    breadcrumb tying the issuance back to a specific booking.
    """
    normalized_reference = str(booking_reference or "").strip()
    if not normalized_reference:
        raise PortalTokenError("booking_reference is required to issue a portal token")

    if max_age_days <= 0:
        raise PortalTokenError("max_age_days must be positive")

    plaintext = secrets.token_urlsafe(32)
    token_hash = _hash_plaintext(plaintext)
    expires_at = datetime.now(UTC) + timedelta(days=max_age_days)
    return PortalAccessTokenIssue(
        plaintext=plaintext,
        token_hash=token_hash,
        expires_at=expires_at,
    )


def hash_portal_access_token(plaintext: str) -> str:
    """Return the SHA-256 hex digest used to compare against stored hashes."""
    normalized = str(plaintext or "").strip()
    if not normalized:
        raise PortalTokenError("Portal access token is empty")
    return _hash_plaintext(normalized)


def verify_portal_access_token(
    *,
    plaintext: str,
    stored_hash: str | None,
    expires_at: datetime | None,
    revoked_at: datetime | None,
    now: datetime | None = None,
) -> bool:
    """Verify a presented portal access token against the stored hash.

    Returns True when the token is valid, hash matches, not expired, and not
    revoked. Returns False on any mismatch. Raises ``PortalTokenError`` if the
    plaintext is empty (callers should treat this as a 401, not a 403).
    """
    candidate = str(plaintext or "").strip()
    if not candidate:
        raise PortalTokenError("Portal access token is empty")

    expected = str(stored_hash or "").strip()
    if not expected:
        return False

    candidate_hash = _hash_plaintext(candidate)
    if not hmac.compare_digest(candidate_hash, expected):
        return False

    reference_now = now or datetime.now(UTC)
    if reference_now.tzinfo is None:
        reference_now = reference_now.replace(tzinfo=UTC)

    if expires_at is not None:
        normalized_expiry = expires_at
        if normalized_expiry.tzinfo is None:
            normalized_expiry = normalized_expiry.replace(tzinfo=UTC)
        if normalized_expiry <= reference_now:
            return False

    if revoked_at is not None:
        return False

    return True
