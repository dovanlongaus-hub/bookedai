"""Pre-create Zoho Meeting + Calendar event for every open chess slot.

Why: by default, the booking flow creates the Zoho meeting/calendar event on
the FIRST student booking — subsequent students in the same group slot reuse
the existing URL. This script backfills the meeting URL for slots that have
not yet received any booking, so every open slot is "Zoho ready" before any
student enrols.

Idempotent: skips slots that already have a `zoho_meeting_url`. Safe to re-run
nightly (cron) to pick up newly-seeded slots.

Run on the VPS:
    cd /home/dovanlong/BookedAI
    .venv-backend/bin/python -m scripts.chess_pre_create_zoho_slot_meetings

Or with `python scripts/chess_pre_create_zoho_slot_meetings.py` from the
repo root with PYTHONPATH=backend.

Environment: needs the same `.env` the backend uses (DATABASE_URL +
ZOHO_CALENDAR_*). Loaded via the backend's ``Settings``.
"""

from __future__ import annotations

import asyncio
import logging
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "backend"))

from datetime import timedelta
from zoneinfo import ZoneInfo

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

# Backend imports
from config import get_settings  # type: ignore
from db import init_engine, session_scope  # type: ignore
from repositories.chess_schedule_slot_repository import (  # type: ignore
    ChessScheduleSlotRepository,
)
from service_layer.calls_scheduling import (  # type: ignore
    create_zoho_meeting_for_booking,
    zoho_calendar_configured,
)


logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
log = logging.getLogger("chess_pre_zoho")


async def fetch_open_slots_without_zoho(session: AsyncSession) -> list[dict]:
    """Return open chess slots that haven't yet had a Zoho meeting attached."""
    result = await session.execute(
        text(
            """
            select
              s.id::text as id,
              s.tenant_id::text as tenant_id,
              s.service_id,
              s.starts_at,
              s.duration_minutes,
              s.timezone,
              s.cohort_label,
              t.slug as tenant_slug,
              t.business_name as tenant_name
            from chess_course_schedule_slots s
            join tenants t on t.id = s.tenant_id
            where s.status = 'open'
              and s.starts_at >= now()
              and s.zoho_meeting_url is null
            order by s.starts_at asc
            """
        ),
    )
    return [dict(row) for row in result.mappings().all()]


async def backfill_slot(session: AsyncSession, slot: dict, settings) -> str:
    """Create the Zoho meeting + calendar event for one slot and persist."""
    starts_at = slot["starts_at"]
    duration_minutes = slot["duration_minutes"] or 60
    tz = ZoneInfo(slot["timezone"] or "Asia/Ho_Chi_Minh")
    if hasattr(starts_at, "astimezone"):
        local_dt = starts_at.astimezone(tz)
    else:
        local_dt = starts_at
    end_dt = local_dt + timedelta(minutes=duration_minutes)

    title = (
        f"{slot.get('cohort_label') or slot.get('service_id')} "
        f"({slot.get('tenant_name') or slot.get('tenant_slug')})"
    )

    try:
        meeting = await create_zoho_meeting_for_booking(
            settings=settings,
            tenant_credentials=None,  # falls back to platform-wide creds
            title=title,
            description=f"Open slot — pre-created for {slot.get('service_id')}.",
            starts_at=local_dt,
            ends_at=end_dt,
            timezone=str(tz),
            attendees=[],  # no attendees yet — students attach on booking
        )
    except Exception as exc:  # noqa: BLE001
        log.warning("zoho meeting creation failed for slot %s: %s", slot["id"], exc)
        return "zoho_failed"

    if not meeting or not meeting.get("meeting_url"):
        log.info("slot %s — Zoho returned empty meeting_url; skipping", slot["id"])
        return "no_url"

    repo = ChessScheduleSlotRepository(session)
    await repo.attach_meeting_metadata(
        tenant_id=slot["tenant_id"],
        slot_id=slot["id"],
        zoho_event_id=meeting.get("event_id"),
        zoho_meeting_url=meeting["meeting_url"],
        zoho_calendar_event_url=meeting.get("calendar_event_url"),
    )
    return "ok"


async def main() -> int:
    settings = get_settings()
    if not zoho_calendar_configured(settings):
        log.error("Zoho calendar not configured (env ZOHO_CALENDAR_* missing). Aborting.")
        return 2

    init_engine(settings)

    async with session_scope() as session:
        slots = await fetch_open_slots_without_zoho(session)
        log.info("found %d open chess slots without zoho meeting URL", len(slots))
        if not slots:
            return 0

        ok = 0
        skipped = 0
        failed = 0
        for slot in slots:
            outcome = await backfill_slot(session, slot, settings)
            if outcome == "ok":
                ok += 1
                log.info("✓ slot %s pre-Zoho'd (%s)", slot["id"][:8], slot["starts_at"])
            elif outcome == "no_url":
                skipped += 1
            else:
                failed += 1
            # Commit every 5 to avoid one transaction holding all rows
            if (ok + skipped + failed) % 5 == 0:
                await session.commit()
        await session.commit()

        log.info("done — ok=%d skipped=%d failed=%d", ok, skipped, failed)

    return 0 if failed == 0 else 1


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
