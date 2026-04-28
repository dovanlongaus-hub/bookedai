"""AI cost circuit breaker.

Tracks LLM call counts + token usage in process memory and exposes a simple
``should_circuit_break`` / ``record_call`` API. Wired into the OpenAI service
wrapper so a runaway prompt-injection or bot-spam attack cannot turn into an
unbounded LLM bill.

Design constraints:
  - Fail-open: any internal error inside this module MUST NOT block calls.
    The breaker is defensive code; we never want it to be the failure point.
  - Stateless across processes (acceptable for now): single uvicorn worker
    pre-investor pitch. Redis-backed counter is a P3 follow-up.
  - Resets the daily counter at midnight UTC.

Public surface:
  - AICircuitBreakerOpen (exception)
  - get_breaker() -> AICostBreaker (process-wide singleton)
  - AICostBreaker.should_circuit_break() -> bool
  - AICostBreaker.record_call(*, tokens_in: int = 0, tokens_out: int = 0) -> None
  - AICostBreaker.snapshot() -> dict (for admin endpoint)
"""

from __future__ import annotations

import os
import threading
from collections import deque
from dataclasses import dataclass
from datetime import UTC, date, datetime
from typing import Any


DEFAULT_DAILY_CALL_BUDGET = 10_000
DEFAULT_DAILY_TOKEN_BUDGET = 5_000_000
DEFAULT_RATE_PER_MINUTE = 120


def _env_int(name: str, default: int) -> int:
    raw = os.getenv(name)
    if raw is None:
        return default
    try:
        value = int(str(raw).strip())
    except (TypeError, ValueError):
        return default
    return value if value > 0 else default


class AICircuitBreakerOpen(Exception):
    """Raised when the AI cost circuit breaker is open and the call is blocked."""

    def __init__(self, *, reason: str, snapshot: dict[str, Any] | None = None) -> None:
        super().__init__(reason)
        self.reason = reason
        self.snapshot = snapshot or {}


@dataclass
class _CounterState:
    day: date
    calls: int = 0
    tokens: int = 0


class AICostBreaker:
    """In-memory circuit breaker tracking LLM call volume and token cost.

    All public methods are wrapped in defensive ``try/except`` so the breaker
    never raises spurious errors back to its callers — if our own bookkeeping
    crashes we silently default to "allow the call".
    """

    def __init__(
        self,
        *,
        daily_call_budget: int | None = None,
        daily_token_budget: int | None = None,
        rate_per_minute: int | None = None,
        clock: Any = None,
    ) -> None:
        self._daily_call_budget = (
            daily_call_budget
            if daily_call_budget is not None
            else _env_int("BOOKEDAI_AI_DAILY_CALL_BUDGET", DEFAULT_DAILY_CALL_BUDGET)
        )
        self._daily_token_budget = (
            daily_token_budget
            if daily_token_budget is not None
            else _env_int("BOOKEDAI_AI_DAILY_TOKEN_BUDGET", DEFAULT_DAILY_TOKEN_BUDGET)
        )
        self._rate_per_minute = (
            rate_per_minute
            if rate_per_minute is not None
            else _env_int("BOOKEDAI_AI_RATE_PER_MINUTE", DEFAULT_RATE_PER_MINUTE)
        )
        self._clock = clock or (lambda: datetime.now(UTC))
        self._state = _CounterState(day=self._today())
        self._minute_window: deque[datetime] = deque()
        self._lock = threading.Lock()

    # -- internal helpers -----------------------------------------------------

    def _now(self) -> datetime:
        try:
            return self._clock()
        except Exception:
            return datetime.now(UTC)

    def _today(self) -> date:
        try:
            return self._now().date()
        except Exception:
            return datetime.now(UTC).date()

    def _maybe_roll_day(self) -> None:
        today = self._today()
        if today != self._state.day:
            self._state = _CounterState(day=today)

    def _trim_minute_window(self, now: datetime) -> None:
        cutoff = now.timestamp() - 60.0
        window = self._minute_window
        while window and window[0].timestamp() < cutoff:
            window.popleft()

    # -- public API -----------------------------------------------------------

    def should_circuit_break(self) -> bool:
        try:
            with self._lock:
                self._maybe_roll_day()
                now = self._now()
                self._trim_minute_window(now)
                if self._state.calls >= self._daily_call_budget:
                    return True
                if self._state.tokens >= self._daily_token_budget:
                    return True
                if len(self._minute_window) >= self._rate_per_minute:
                    return True
                return False
        except Exception:
            # Fail-open: never let breaker bookkeeping block a call.
            return False

    def assert_open(self) -> None:
        """Raise AICircuitBreakerOpen if the breaker is tripped.

        Convenience for callers that prefer exception-based flow.
        """

        if self.should_circuit_break():
            snapshot = self.snapshot()
            reason_parts: list[str] = []
            if snapshot.get("today_calls", 0) >= snapshot.get("daily_call_budget", 0):
                reason_parts.append("daily_call_budget")
            if snapshot.get("today_tokens", 0) >= snapshot.get("daily_token_budget", 0):
                reason_parts.append("daily_token_budget")
            if snapshot.get("last_minute_calls", 0) >= snapshot.get("rate_per_minute", 0):
                reason_parts.append("rate_per_minute")
            reason = ",".join(reason_parts) or "ai_cost_breaker_open"
            raise AICircuitBreakerOpen(reason=reason, snapshot=snapshot)

    def record_call(self, *, tokens_in: int = 0, tokens_out: int = 0) -> None:
        try:
            with self._lock:
                self._maybe_roll_day()
                now = self._now()
                self._trim_minute_window(now)
                self._state.calls += 1
                try:
                    self._state.tokens += max(0, int(tokens_in)) + max(0, int(tokens_out))
                except (TypeError, ValueError):
                    pass
                self._minute_window.append(now)
        except Exception:
            # Fail-open: bookkeeping must never crash callers.
            return

    def snapshot(self) -> dict[str, Any]:
        try:
            with self._lock:
                self._maybe_roll_day()
                now = self._now()
                self._trim_minute_window(now)
                return {
                    "today": self._state.day.isoformat(),
                    "today_calls": int(self._state.calls),
                    "today_tokens": int(self._state.tokens),
                    "last_minute_calls": int(len(self._minute_window)),
                    "daily_call_budget": int(self._daily_call_budget),
                    "daily_token_budget": int(self._daily_token_budget),
                    "rate_per_minute": int(self._rate_per_minute),
                    "breaker_open": (
                        self._state.calls >= self._daily_call_budget
                        or self._state.tokens >= self._daily_token_budget
                        or len(self._minute_window) >= self._rate_per_minute
                    ),
                }
        except Exception:
            return {
                "today": "",
                "today_calls": 0,
                "today_tokens": 0,
                "last_minute_calls": 0,
                "daily_call_budget": int(self._daily_call_budget),
                "daily_token_budget": int(self._daily_token_budget),
                "rate_per_minute": int(self._rate_per_minute),
                "breaker_open": False,
            }

    def reset(self) -> None:
        """Test hook: drop in-memory state."""

        with self._lock:
            self._state = _CounterState(day=self._today())
            self._minute_window.clear()


_singleton_lock = threading.Lock()
_singleton: AICostBreaker | None = None


def get_breaker() -> AICostBreaker:
    """Return the process-wide ``AICostBreaker`` singleton."""

    global _singleton
    if _singleton is not None:
        return _singleton
    with _singleton_lock:
        if _singleton is None:
            _singleton = AICostBreaker()
        return _singleton


def reset_breaker_for_tests() -> None:
    """Test hook: clear the singleton so a test can install its own instance."""

    global _singleton
    with _singleton_lock:
        _singleton = None
