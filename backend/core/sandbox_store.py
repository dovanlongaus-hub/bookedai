"""In-memory sandbox session store for the magic-moment onboarding flow.

The `/sandbox` route gives a visitor a temporary BookedAI workspace that lives
ONLY in memory. No database writes happen until the visitor opts to "Save my
workspace" via email-code login. This module is the single source of truth for
sandbox session state.

Design notes
------------
* TTL eviction is *lazy* — every accessor sweeps expired sessions before doing
  any other work. This keeps the implementation tiny (no background thread, no
  asyncio task) while bounding memory growth in practice.
* The store is module-level (process-local). For a multi-worker deployment a
  Redis-backed swap is straightforward — keep the API surface tight here so a
  later swap is mechanical.
* Booking entries are appended in-place; we keep a max bound so a noisy client
  cannot blow up RSS.

Privacy
-------
No PII is persisted beyond what the visitor types into the in-memory session.
On expiration / eviction the entire dict is dropped — there is no tenant DB
row, no audit trail, no Stripe / Telegram / WhatsApp side-effect. The only
moment any of this becomes durable is when `save_session()` is invoked.
"""

from __future__ import annotations

import threading
from dataclasses import dataclass, field
from datetime import UTC, datetime, timedelta
from typing import Any
from uuid import uuid4

DEFAULT_SESSION_TTL_SECONDS = 24 * 60 * 60  # 24h
MAX_BOOKINGS_PER_SESSION = 25
MAX_ACTIVE_SESSIONS = 5_000


@dataclass
class SandboxService:
    service_id: str
    name: str
    summary: str
    duration_minutes: int
    price_aud: float
    capabilities: list[str] = field(default_factory=list)
    thumbnail_gradient: str = "ocean"

    def to_dict(self) -> dict[str, Any]:
        return {
            "service_id": self.service_id,
            "name": self.name,
            "summary": self.summary,
            "duration_minutes": self.duration_minutes,
            "price_aud": self.price_aud,
            "capabilities": list(self.capabilities),
            "thumbnail_gradient": self.thumbnail_gradient,
        }


@dataclass
class SandboxBooking:
    booking_reference: str
    service_id: str
    service_name: str
    customer_name: str
    customer_email: str | None
    customer_phone: str | None
    preferred_time: str | None
    revenue_captured_aud: float
    captured_at: datetime
    status: str = "confirmed"
    channels_engaged: list[str] = field(default_factory=lambda: ["web"])

    def to_dict(self) -> dict[str, Any]:
        return {
            "booking_reference": self.booking_reference,
            "service_id": self.service_id,
            "service_name": self.service_name,
            "customer_name": self.customer_name,
            "customer_email": self.customer_email,
            "customer_phone": self.customer_phone,
            "preferred_time": self.preferred_time,
            "revenue_captured_aud": self.revenue_captured_aud,
            "captured_at": self.captured_at.isoformat(),
            "status": self.status,
            "channels_engaged": list(self.channels_engaged),
        }


@dataclass
class SandboxSession:
    session_id: str
    business_name: str
    vertical: str
    services: list[SandboxService]
    created_at: datetime
    expires_at: datetime
    bookings: list[SandboxBooking] = field(default_factory=list)
    saved_tenant_slug: str | None = None
    saved_at: datetime | None = None

    def is_expired(self, now: datetime | None = None) -> bool:
        return (now or datetime.now(UTC)) >= self.expires_at

    def to_dict(self) -> dict[str, Any]:
        return {
            "session_id": self.session_id,
            "business": {"name": self.business_name, "vertical": self.vertical},
            "services": [service.to_dict() for service in self.services],
            "bookings": [booking.to_dict() for booking in self.bookings],
            "created_at": self.created_at.isoformat(),
            "expires_at": self.expires_at.isoformat(),
            "saved_tenant_slug": self.saved_tenant_slug,
            "saved_at": self.saved_at.isoformat() if self.saved_at else None,
        }


class SandboxSessionStore:
    """Process-local TTL cache. Thread-safe via a single `threading.Lock`."""

    def __init__(
        self,
        *,
        ttl_seconds: int = DEFAULT_SESSION_TTL_SECONDS,
        max_sessions: int = MAX_ACTIVE_SESSIONS,
    ) -> None:
        self._sessions: dict[str, SandboxSession] = {}
        self._ttl = max(60, int(ttl_seconds))
        self._max_sessions = max(10, int(max_sessions))
        self._lock = threading.Lock()

    # ── Internal helpers ───────────────────────────────────────────────
    def _evict_expired(self, *, now: datetime | None = None) -> None:
        current = now or datetime.now(UTC)
        expired = [sid for sid, sess in self._sessions.items() if sess.is_expired(current)]
        for sid in expired:
            self._sessions.pop(sid, None)
        # Hard cap fallback: drop oldest by created_at if we are over capacity.
        if len(self._sessions) > self._max_sessions:
            sorted_ids = sorted(
                self._sessions.items(), key=lambda item: item[1].created_at
            )
            overflow = len(self._sessions) - self._max_sessions
            for sid, _ in sorted_ids[:overflow]:
                self._sessions.pop(sid, None)

    # ── Public API ─────────────────────────────────────────────────────
    def create_session(
        self,
        *,
        business_name: str,
        vertical: str,
        services: list[SandboxService],
        ttl_seconds: int | None = None,
    ) -> SandboxSession:
        now = datetime.now(UTC)
        expires_at = now + timedelta(seconds=ttl_seconds or self._ttl)
        session = SandboxSession(
            session_id=str(uuid4()),
            business_name=business_name,
            vertical=vertical,
            services=list(services),
            created_at=now,
            expires_at=expires_at,
        )
        with self._lock:
            self._evict_expired(now=now)
            self._sessions[session.session_id] = session
        return session

    def get_session(self, session_id: str) -> SandboxSession | None:
        if not session_id:
            return None
        with self._lock:
            self._evict_expired()
            session = self._sessions.get(session_id)
            if session is None:
                return None
            if session.is_expired():
                self._sessions.pop(session_id, None)
                return None
            return session

    def add_booking(
        self,
        session_id: str,
        booking: SandboxBooking,
    ) -> SandboxSession | None:
        with self._lock:
            self._evict_expired()
            session = self._sessions.get(session_id)
            if session is None or session.is_expired():
                self._sessions.pop(session_id, None)
                return None
            session.bookings.append(booking)
            if len(session.bookings) > MAX_BOOKINGS_PER_SESSION:
                # Drop oldest entries past the cap so the dict stays bounded.
                session.bookings = session.bookings[-MAX_BOOKINGS_PER_SESSION:]
            return session

    def mark_saved(
        self,
        session_id: str,
        *,
        tenant_slug: str,
    ) -> SandboxSession | None:
        with self._lock:
            self._evict_expired()
            session = self._sessions.get(session_id)
            if session is None or session.is_expired():
                self._sessions.pop(session_id, None)
                return None
            session.saved_tenant_slug = tenant_slug
            session.saved_at = datetime.now(UTC)
            return session

    def expire_session(self, session_id: str) -> None:
        with self._lock:
            self._sessions.pop(session_id, None)

    def session_exists(self, session_id: str) -> bool:
        return self.get_session(session_id) is not None

    # ── Test / introspection helpers ───────────────────────────────────
    def reset_for_tests(self) -> None:
        with self._lock:
            self._sessions.clear()

    def session_count(self) -> int:
        with self._lock:
            self._evict_expired()
            return len(self._sessions)


# Module-level singleton — the API handlers and tests import this.
sandbox_session_store = SandboxSessionStore()


__all__ = [
    "DEFAULT_SESSION_TTL_SECONDS",
    "MAX_BOOKINGS_PER_SESSION",
    "SandboxBooking",
    "SandboxService",
    "SandboxSession",
    "SandboxSessionStore",
    "sandbox_session_store",
]
