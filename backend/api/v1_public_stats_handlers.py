"""Public, unauthenticated booking statistics endpoint.

Surfaces a privacy-safe aggregate of bookings, revenue captured, and recent
anonymized booking activity for the public homepage "Live Revenue Captured
Today" ticker (P1-T5 — Wow Moment #2).

Privacy contract — these fields are NEVER returned:
  * customer_name / contact full_name
  * customer_email / phone
  * booking_reference (raw or partial)
  * raw amount values (rounded to nearest $5)
  * exact timestamps (snapped to nearest minute via ago_minutes)

Tenant identifiers are anonymized — either a generic locality alias derived
from the tenant name with PII heuristics, or a deterministic short hash.

The endpoint is intentionally NO-AUTH because it is a public marketing
surface. Results are cached in-memory for ~30 seconds to protect the DB.
"""
from __future__ import annotations

import asyncio
import hashlib
import re
import time
from datetime import datetime, timezone
from typing import Any

from fastapi import Request

from api.v1_routes import _success_response, get_session
from repositories.base import RepositoryContext
from repositories.reporting_repository import ReportingRepository


# ── Cache ──────────────────────────────────────────────────────────────────
PUBLIC_STATS_TTL_SECONDS = 30
MAX_RECENT_EVENTS = 5

_cache_lock: asyncio.Lock = asyncio.Lock()
_cache_state: dict[str, Any] = {
    "expires_at": 0.0,
    "payload": None,
    "db_query_count": 0,
}


def _public_stats_cache_state() -> dict[str, Any]:
    """Return a reference to the module-level cache (used in tests)."""
    return _cache_state


def reset_public_stats_cache() -> None:
    """Clear the public-stats cache. Test-only helper."""
    _cache_state["expires_at"] = 0.0
    _cache_state["payload"] = None
    _cache_state["db_query_count"] = 0


# ── Anonymization helpers ──────────────────────────────────────────────────
_PII_NAME_HINT_PATTERN = re.compile(
    r"\b(?:mr|mrs|ms|miss|dr)\.?\s+\w+|\bphd\b|\bccm\b",
    re.IGNORECASE,
)
_HUMAN_NAME_TOKEN_PATTERN = re.compile(r"\b[A-Z][a-z]+\s+[A-Z][a-z]+\b")


def _looks_like_personal_name(value: str) -> bool:
    """Heuristic: returns True when a tenant name looks like a personal name.

    We consider:
      * Common honorifics ("Dr Smith", "Mrs Lee").
      * Two consecutive Title-Case words with no business-y suffix.
    The check is intentionally conservative — false positives just fall back
    to a hashed alias, which is the safe outcome.
    """
    if not value:
        return False
    if _PII_NAME_HINT_PATTERN.search(value):
        return True
    business_suffixes = (
        " clinic",
        " academy",
        " school",
        " studio",
        " co",
        " co.",
        " inc",
        " ltd",
        " pty",
        " group",
        " centre",
        " center",
        " gym",
        " salon",
        " spa",
        " agency",
        " institute",
        " hub",
        " labs",
        " collective",
        " practice",
        " mentor",
        " mentors",
        " swim",
        " chess",
        " bookedai",
    )
    lowered = value.lower()
    if any(suffix in lowered for suffix in business_suffixes):
        return False
    match = _HUMAN_NAME_TOKEN_PATTERN.fullmatch(value.strip())
    return bool(match)


def _anonymized_tenant_alias(*, tenant_id: str, tenant_name: str | None) -> str:
    """Build a privacy-safe alias for a tenant.

    Order of preference:
      1. The tenant name, when it does NOT look like a personal name and is
         short enough to display ("Inner West clinic", "Future Swim").
      2. A deterministic hashed alias derived from the tenant id, e.g.
         ``tenant_a1b2c3``.
    """
    cleaned = (tenant_name or "").strip()
    if cleaned and not _looks_like_personal_name(cleaned):
        # Cap to a reasonable display width so the ticker stays single-line.
        return cleaned if len(cleaned) <= 48 else f"{cleaned[:45]}…"
    digest = hashlib.sha256((tenant_id or "anonymous").encode("utf-8")).hexdigest()
    return f"tenant_{digest[:6]}"


def _round_to_nearest_five(amount: float) -> int:
    """Round a dollar amount to the nearest $5 (privacy contract)."""
    if amount <= 0:
        return 0
    return int(round(amount / 5.0) * 5)


def _ago_minutes(created_at: datetime | None) -> int:
    """Return how many whole minutes ago a timestamp occurred (>=0)."""
    if created_at is None:
        return 0
    if created_at.tzinfo is None:
        created_at = created_at.replace(tzinfo=timezone.utc)
    delta = datetime.now(timezone.utc) - created_at
    return max(int(delta.total_seconds() // 60), 0)


# ── Aggregation ────────────────────────────────────────────────────────────
async def _build_public_stats_payload(request: Request) -> dict[str, Any]:
    session_factory = getattr(request.app.state, "session_factory", None)
    if session_factory is None:
        # Fail-soft empty payload — never raise on the public surface.
        return _empty_stats_payload()

    async with get_session(session_factory) as session:
        repo = ReportingRepository(RepositoryContext(session=session, tenant_id=None))
        # Three windows + recent list = up to 4 reads. We track query count so
        # tests can verify the cache short-circuits real DB hits.
        _cache_state["db_query_count"] += 1
        last_24h = await repo.get_public_booking_summary(window_hours=24)
        last_7d = await repo.get_public_booking_summary(window_hours=24 * 7)
        last_30d = await repo.get_public_booking_summary(window_hours=24 * 30)
        recent_rows = await repo.list_public_recent_bookings(limit=MAX_RECENT_EVENTS)

    recent: list[dict[str, Any]] = []
    for row in recent_rows[:MAX_RECENT_EVENTS]:
        amount = _round_to_nearest_five(float(row.get("amount_aud") or 0.0))
        if amount <= 0:
            # Skip noise — the ticker should never advertise a $0 booking.
            continue
        recent.append(
            {
                "tenant_alias": _anonymized_tenant_alias(
                    tenant_id=str(row.get("tenant_id") or ""),
                    tenant_name=row.get("tenant_name"),
                ),
                "amount_aud_rounded": amount,
                "ago_minutes": _ago_minutes(row.get("created_at")),
            }
        )

    payload = {
        "windows": {
            "last_24h": _shape_window(last_24h),
            "last_7d": _shape_window(last_7d),
            "last_30d": _shape_window(last_30d),
        },
        "recent": recent,
        "meta": {
            "version": "v1",
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "ttl_seconds": PUBLIC_STATS_TTL_SECONDS,
        },
    }
    return payload


def _shape_window(window: dict[str, Any]) -> dict[str, Any]:
    return {
        "bookings": int(window.get("bookings") or 0),
        "captured_aud_rounded": _round_to_nearest_five(float(window.get("captured_aud") or 0.0)),
        "tenants_active": int(window.get("tenants_active") or 0),
    }


def _empty_stats_payload() -> dict[str, Any]:
    empty_window = {"bookings": 0, "captured_aud_rounded": 0, "tenants_active": 0}
    return {
        "windows": {
            "last_24h": dict(empty_window),
            "last_7d": dict(empty_window),
            "last_30d": dict(empty_window),
        },
        "recent": [],
        "meta": {
            "version": "v1",
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "ttl_seconds": PUBLIC_STATS_TTL_SECONDS,
        },
    }


async def _get_cached_payload(request: Request) -> dict[str, Any]:
    now = time.monotonic()
    if _cache_state["payload"] is not None and now < _cache_state["expires_at"]:
        return _cache_state["payload"]

    async with _cache_lock:
        # Re-check under lock to avoid stampede.
        now = time.monotonic()
        if _cache_state["payload"] is not None and now < _cache_state["expires_at"]:
            return _cache_state["payload"]

        try:
            payload = await _build_public_stats_payload(request)
        except Exception:  # pragma: no cover — public surface must never 500.
            payload = _empty_stats_payload()

        _cache_state["payload"] = payload
        _cache_state["expires_at"] = time.monotonic() + PUBLIC_STATS_TTL_SECONDS
        return payload


# ── Handler ────────────────────────────────────────────────────────────────
async def get_public_booking_stats(request: Request):
    """GET /api/v1/public/stats/bookings — no auth required."""
    payload = await _get_cached_payload(request)
    return _success_response(payload)
