"""Retention cadence worker (T+1d / T+7d / T+30d / T+90d).

Daily worker that scans AI Mentor bookings and dispatches retention messages
through the Layer-1 lifecycle sibling agent
(``service_layer.lifecycle_ops_service.orchestrate_retention_touch``) for each
matching cadence anchor.

Idempotency:

* ``orchestrate_retention_touch`` is the source of truth for dedup — it returns
  ``status='already_sent'`` when a cadence has already fired for a booking.
* The worker also short-circuits cheaply: any row whose ``days_since`` does not
  match a cadence anchor (1, 7, 30, 90) is skipped without calling the
  orchestrator.

Cron wiring strategy: identical to ``feedback_request_worker`` — exposed as a
plain async coroutine so n8n can hit an internal HTTP endpoint, plus a
synchronous CLI entrypoint at the bottom of the file for ad-hoc / cron use.
"""

from __future__ import annotations

import traceback
from datetime import UTC, datetime, timedelta
from typing import Any

from sqlalchemy import text

from core.logging import get_logger

_logger = get_logger("bookedai.workers.retention_worker")


# Cadence anchors in days since session end. Keys must be integers so we can
# look up ``days_since`` in O(1); values are the cadence labels we hand to the
# orchestrator.
RETENTION_CADENCE_BY_DAYS: dict[int, str] = {
    1: "t1d_thank_you",
    7: "t7d_check_in",
    30: "t30d_progress",
    90: "t90d_winback",
}

# Channel preference: when ``last_engaged_channel`` is recorded on the booking
# metadata we honour it (priority telegram > whatsapp > email). Otherwise we
# default to email which is universally available.
_CHANNEL_PRIORITY = ("telegram", "whatsapp", "email")
_DEFAULT_CHANNEL = "email"
_DEFAULT_LOCALE = "en"

# 120-day query window — anything older than the longest cadence (T+90) plus a
# safety buffer can never trigger another touch.
_LOOKBACK_DAYS = 120


_SCAN_SQL = text(
    """
    select
      bi.booking_reference,
      bi.tenant_id::text as tenant_id,
      bi.status,
      (
        (bi.requested_date::date + coalesce(bi.requested_time, '00:00:00'::time))
          at time zone coalesce(nullif(bi.timezone, ''), 'UTC')
      ) as reference_at,
      coalesce(bi.metadata_json, '{}'::jsonb) as metadata_json,
      c.email as customer_email,
      c.full_name as customer_name
    from booking_intents bi
    left join contacts c on c.id = bi.contact_id
    where bi.tenant_id in (
        select id from tenants where slug = 'ai-mentor-doer'
      )
      and bi.status in ('paid', 'confirmed', 'completed')
      and bi.created_at > now() - (:lookback_days || ' days')::interval
      and (bi.metadata_json -> 'retention_opt_out') is null
    """
)


def _pick_channel(metadata: dict[str, Any] | None) -> str:
    """Return the preferred dispatch channel for this booking.

    Honours ``metadata_json.last_engaged_channel`` when present and recognised,
    otherwise falls back to email.
    """
    if not isinstance(metadata, dict):
        return _DEFAULT_CHANNEL
    raw = metadata.get("last_engaged_channel")
    if not isinstance(raw, str):
        return _DEFAULT_CHANNEL
    candidate = raw.strip().lower()
    if candidate in _CHANNEL_PRIORITY:
        return candidate
    return _DEFAULT_CHANNEL


def _pick_locale(metadata: dict[str, Any] | None) -> str:
    if not isinstance(metadata, dict):
        return _DEFAULT_LOCALE
    raw = metadata.get("customer_locale")
    if isinstance(raw, str) and raw.strip():
        return raw.strip()
    return _DEFAULT_LOCALE


def _is_opted_out(metadata: dict[str, Any] | None) -> bool:
    """Defence-in-depth opt-out check.

    The SQL filter already drops rows whose ``metadata_json.retention_opt_out``
    key exists. We re-check in Python because:

    * Tests stub the repository / SQL layer with fake rows that may include the
      key — the SQL filter is bypassed in unit tests.
    * Operators may flip the flag between SELECT and dispatch.
    """
    if not isinstance(metadata, dict):
        return False
    flag = metadata.get("retention_opt_out")
    if isinstance(flag, bool):
        return flag
    if isinstance(flag, str):
        return flag.strip().lower() in {"true", "1", "yes"}
    # Any non-null value (per the SQL ``is null`` check) counts as opted out.
    return flag is not None


def _coerce_reference_at(value: Any) -> datetime | None:
    if value is None:
        return None
    if isinstance(value, datetime):
        return value if value.tzinfo else value.replace(tzinfo=UTC)
    return None


async def _scan_due_bookings(session) -> list[dict[str, Any]]:
    """Run the scan query, returning normalized row dicts."""
    result = await session.execute(_SCAN_SQL, {"lookback_days": _LOOKBACK_DAYS})
    return [dict(row._mapping) for row in result]


async def run_retention_worker(
    session_factory,
    *,
    now: datetime | None = None,
) -> dict[str, Any]:
    """Scan AI Mentor bookings and dispatch retention messages.

    For each booking still inside the 120-day window, compute
    ``days_since = (now - reference_at).days`` and dispatch the matching cadence
    via ``orchestrate_retention_touch``. Anchors that don't match a cadence are
    skipped cheaply — we let the next daily run pick the booking up when the
    correct anchor lands.

    Returns:
        ``{"dispatched": [{"booking_reference", "cadence"}, ...],
            "skipped": int, "errors": [{"booking_reference", "error"}, ...]}``
    """
    # Imported lazily so the test suite can stub the symbol via
    # ``patch("workers.retention_worker.orchestrate_retention_touch", ...)``
    # without dragging the full lifecycle_ops_service surface into import-time.
    from service_layer.lifecycle_ops_service import (  # noqa: PLC0415
        orchestrate_retention_touch,
    )

    current = (now or datetime.now(tz=UTC)).astimezone(UTC)
    dispatched: list[dict[str, str]] = []
    skipped = 0
    errors: list[dict[str, str]] = []

    async with session_factory() as session:
        try:
            rows = await _scan_due_bookings(session)
        except Exception as exc:  # noqa: BLE001 — top-level scan failure is logged
            _logger.exception(
                "retention_worker_scan_failed",
                extra={
                    "event_type": "retention_worker_scan_failed",
                    "tenant_id": "",
                    "status": 0,
                    "route": "worker:retention",
                    "request_id": "",
                    "integration_name": "lifecycle_ops",
                    "conversation_id": "",
                    "booking_reference": "",
                    "job_name": "retention_worker",
                    "job_id": "",
                },
            )
            return {
                "dispatched": dispatched,
                "skipped": skipped,
                "errors": [{"booking_reference": "", "error": str(exc)}],
            }

        if not rows:
            _logger.info(
                "retention_worker_no_due_bookings",
                extra={
                    "event_type": "retention_worker_no_due_bookings",
                    "tenant_id": "",
                    "status": 0,
                    "route": "worker:retention",
                    "request_id": "",
                    "integration_name": "lifecycle_ops",
                    "conversation_id": "",
                    "booking_reference": "",
                    "job_name": "retention_worker",
                    "job_id": "",
                },
            )
            return {"dispatched": dispatched, "skipped": skipped, "errors": errors}

        for row in rows:
            booking_reference = str(row.get("booking_reference") or "").strip()
            tenant_id = str(row.get("tenant_id") or "").strip()
            customer_email = str(row.get("customer_email") or "").strip().lower()
            metadata = row.get("metadata_json") if isinstance(row.get("metadata_json"), dict) else {}

            if not booking_reference or not customer_email:
                skipped += 1
                continue

            if _is_opted_out(metadata):
                skipped += 1
                continue

            reference_at = _coerce_reference_at(row.get("reference_at"))
            if reference_at is None:
                skipped += 1
                continue

            days_since = (current - reference_at).days
            cadence = RETENTION_CADENCE_BY_DAYS.get(days_since)
            if cadence is None:
                # Not on an anchor today — wait for the next daily tick.
                skipped += 1
                continue

            channel = _pick_channel(metadata)
            locale = _pick_locale(metadata)
            customer_name = str(row.get("customer_name") or "").strip() or None

            try:
                result = await orchestrate_retention_touch(
                    session,
                    tenant_id=tenant_id,
                    booking_reference=booking_reference,
                    customer_email=customer_email,
                    customer_name=customer_name,
                    cadence=cadence,
                    preferred_channel=channel,
                    locale=locale,
                )
            except Exception as exc:  # noqa: BLE001 — per-row failure is contained
                _logger.warning(
                    "retention_worker_dispatch_failed",
                    extra={
                        "event_type": "retention_worker_dispatch_failed",
                        "tenant_id": tenant_id,
                        "status": 0,
                        "route": "worker:retention",
                        "request_id": "",
                        "integration_name": "lifecycle_ops",
                        "conversation_id": "",
                        "booking_reference": booking_reference,
                        "job_name": "retention_worker",
                        "job_id": "",
                    },
                    exc_info=exc,
                )
                errors.append(
                    {
                        "booking_reference": booking_reference,
                        "error": f"{exc.__class__.__name__}: {exc}",
                        "traceback": traceback.format_exc(),
                    }
                )
                continue

            status = ""
            if isinstance(result, dict):
                status = str(result.get("status") or "").strip().lower()

            if status == "sent":
                dispatched.append(
                    {"booking_reference": booking_reference, "cadence": cadence}
                )
            elif status == "already_sent":
                skipped += 1
            else:
                # Unknown / missing status — treat as skip so we don't double
                # count, but log so ops can investigate.
                _logger.warning(
                    "retention_worker_unknown_status",
                    extra={
                        "event_type": "retention_worker_unknown_status",
                        "tenant_id": tenant_id,
                        "status": 0,
                        "route": "worker:retention",
                        "request_id": "",
                        "integration_name": "lifecycle_ops",
                        "conversation_id": "",
                        "booking_reference": booking_reference,
                        "job_name": "retention_worker",
                        "job_id": "",
                    },
                )
                skipped += 1

        # Commit at the end so any UPDATEs the orchestrator queued (lifecycle
        # ledger rows, dedup markers) are flushed in a single transaction.
        try:
            await session.commit()
        except Exception:  # noqa: BLE001 — surface but don't blow up the loop
            await session.rollback()
            raise

    _logger.info(
        "retention_worker_completed",
        extra={
            "event_type": "retention_worker_completed",
            "tenant_id": "",
            "status": 0,
            "route": "worker:retention",
            "request_id": "",
            "integration_name": "lifecycle_ops",
            "conversation_id": "",
            "booking_reference": "",
            "job_name": "retention_worker",
            "job_id": "",
        },
    )

    return {"dispatched": dispatched, "skipped": skipped, "errors": errors}


def __main__() -> None:
    """CLI entrypoint for cron / scheduler.

    Resolves the async session factory at runtime so the import is only
    attempted when the script is actually invoked (keeps import-time light for
    unit tests that stub ``run_retention_worker`` directly).
    """
    import asyncio  # noqa: PLC0415

    from db import async_session_factory  # type: ignore[attr-defined]  # noqa: PLC0415

    asyncio.run(run_retention_worker(async_session_factory))


if __name__ == "__main__":
    __main__()


__all__ = [
    "RETENTION_CADENCE_BY_DAYS",
    "run_retention_worker",
]
