"""Repository for ``chess_course_schedule_slots`` rows.

Each chess service can publish multiple bookable cohorts (open enrolment)
or one-on-one private slots. The :class:`ChessScheduleSlotRepository`
encapsulates the SQL surface so handlers and tests share one entry point.

Idempotency:
* :meth:`create_slot` upserts on ``(tenant_id, service_id, starts_at)`` so
  retries from operators (or an RRULE expansion that overlaps a previously
  seeded row) never duplicate.
* :meth:`reserve_capacity` increments ``enrolled_count`` only when capacity
  is still available; returns ``None`` when the slot is full so callers can
  reject the booking cleanly.
* :meth:`attach_meeting_metadata` is safe to call multiple times — group
  cohorts reuse the same Zoho meeting URL across all enrolled students.
"""

from __future__ import annotations

import json
from datetime import datetime
from typing import Any

from sqlalchemy import text

from repositories.base import BaseRepository


def _normalize_text(value: object | None) -> str | None:
    raw = str(value or "").strip()
    return raw or None


class ChessScheduleSlotRepository(BaseRepository):
    """Persistence seam for chess course schedule slots."""

    async def list_public_slots(
        self,
        *,
        tenant_id: str,
        service_id: str,
        starts_from: datetime,
        starts_to: datetime,
        limit: int = 12,
    ) -> list[dict[str, Any]]:
        """Return public timetable rows within the date window.

        Bookable rows are scoped to ``service_id`` and must still have
        capacity. Private 1-1 busy-teaching blocks are returned only when the
        visitor is choosing private coaching, so group classes remain focused
        on joinable cohorts.
        """
        result = await self.session.execute(
            text(
                """
                select
                  s.id::text as id,
                  s.service_id,
                  s.starts_at,
                  s.duration_minutes,
                  s.timezone,
                  s.capacity,
                  s.enrolled_count,
                  greatest(s.capacity - s.enrolled_count, 0) as available,
                  s.cohort_label,
                  s.cohort_recurrence_rule,
                  s.status,
                  s.zoho_meeting_url,
                  s.zoho_calendar_event_url,
                  s.metadata
                from chess_course_schedule_slots s
                where s.tenant_id = cast(:tenant_id as uuid)
                  and (
                    (
                      s.service_id = :service_id
                      and s.status = 'open'
                      and s.enrolled_count < s.capacity
                    )
                    or (
                      s.service_id = :service_id
                      and
                      coalesce(s.metadata->>'schedule_kind', '') = 'busy_teaching'
                      and s.status in ('full', 'completed')
                    )
                  )
                  and s.starts_at >= :starts_from
                  and s.starts_at < :starts_to
                order by s.starts_at asc
                limit :limit
                """
            ),
            {
                "tenant_id": tenant_id,
                "service_id": service_id,
                "starts_from": starts_from,
                "starts_to": starts_to,
                "limit": max(int(limit or 1), 1),
            },
        )
        return [dict(row._mapping) for row in result]

    async def list_admin_slots(
        self,
        *,
        tenant_id: str,
        service_id: str,
        limit: int = 200,
    ) -> list[dict[str, Any]]:
        """Tenant-admin view: include full / cancelled / completed rows."""
        result = await self.session.execute(
            text(
                """
                select
                  s.id::text as id,
                  s.service_id,
                  s.starts_at,
                  s.duration_minutes,
                  s.timezone,
                  s.capacity,
                  s.enrolled_count,
                  greatest(s.capacity - s.enrolled_count, 0) as available,
                  s.cohort_label,
                  s.cohort_recurrence_rule,
                  s.status,
                  s.zoho_event_id,
                  s.zoho_meeting_url,
                  s.zoho_calendar_event_url,
                  s.metadata,
                  s.created_at,
                  s.updated_at
                from chess_course_schedule_slots s
                where s.tenant_id = cast(:tenant_id as uuid)
                  and s.service_id = :service_id
                order by s.starts_at asc
                limit :limit
                """
            ),
            {
                "tenant_id": tenant_id,
                "service_id": service_id,
                "limit": max(int(limit or 1), 1),
            },
        )
        return [dict(row._mapping) for row in result]

    async def count_available_for_services(
        self,
        *,
        tenant_id: str,
        service_ids: list[str],
        starts_from: datetime,
    ) -> dict[str, int]:
        """Return ``{service_id: open_slot_count}`` for tenant catalog search."""
        if not service_ids:
            return {}
        result = await self.session.execute(
            text(
                """
                select s.service_id, count(*)::int as open_count
                from chess_course_schedule_slots s
                where s.tenant_id = cast(:tenant_id as uuid)
                  and s.service_id = any(:service_ids)
                  and s.status = 'open'
                  and s.enrolled_count < s.capacity
                  and s.starts_at >= :starts_from
                group by s.service_id
                """
            ),
            {
                "tenant_id": tenant_id,
                "service_ids": list(service_ids),
                "starts_from": starts_from,
            },
        )
        return {str(row.service_id): int(row.open_count) for row in result}

    async def create_slot(
        self,
        *,
        tenant_id: str,
        service_id: str,
        starts_at: datetime,
        duration_minutes: int,
        timezone: str = "Asia/Ho_Chi_Minh",
        capacity: int = 1,
        cohort_label: str | None = None,
        cohort_recurrence_rule: str | None = None,
        status: str = "open",
        metadata: dict[str, Any] | None = None,
    ) -> dict[str, Any] | None:
        """Insert a slot, idempotent on ``(tenant_id, service_id, starts_at)``."""
        result = await self.session.execute(
            text(
                """
                insert into chess_course_schedule_slots (
                  tenant_id, service_id, starts_at, duration_minutes,
                  timezone, capacity, cohort_label, cohort_recurrence_rule,
                  status, metadata
                ) values (
                  cast(:tenant_id as uuid), :service_id, :starts_at, :duration_minutes,
                  :timezone, :capacity, :cohort_label, :cohort_recurrence_rule,
                  :status, cast(:metadata as jsonb)
                )
                on conflict (tenant_id, service_id, starts_at) do update set
                  duration_minutes = excluded.duration_minutes,
                  timezone = excluded.timezone,
                  capacity = greatest(excluded.capacity, chess_course_schedule_slots.enrolled_count),
                  cohort_label = excluded.cohort_label,
                  cohort_recurrence_rule = excluded.cohort_recurrence_rule,
                  status = excluded.status,
                  metadata = excluded.metadata,
                  updated_at = now()
                returning
                  id::text as id,
                  service_id,
                  starts_at,
                  duration_minutes,
                  timezone,
                  capacity,
                  enrolled_count,
                  cohort_label,
                  cohort_recurrence_rule,
                  status,
                  zoho_event_id,
                  zoho_meeting_url,
                  zoho_calendar_event_url,
                  metadata
                """
            ),
            {
                "tenant_id": tenant_id,
                "service_id": service_id,
                "starts_at": starts_at,
                "duration_minutes": int(duration_minutes),
                "timezone": timezone or "Asia/Ho_Chi_Minh",
                "capacity": max(int(capacity or 1), 1),
                "cohort_label": _normalize_text(cohort_label),
                "cohort_recurrence_rule": _normalize_text(cohort_recurrence_rule),
                "status": (status or "open").strip().lower() or "open",
                "metadata": json.dumps(metadata or {}),
            },
        )
        row = result.mappings().first()
        return dict(row) if row else None

    async def update_slot(
        self,
        *,
        tenant_id: str,
        slot_id: str,
        capacity: int | None = None,
        cohort_label: str | None = None,
        status: str | None = None,
    ) -> dict[str, Any] | None:
        """Patch a slot's capacity / cohort_label / status fields."""
        result = await self.session.execute(
            text(
                """
                update chess_course_schedule_slots
                set
                  capacity = case
                    when :capacity::int is null then capacity
                    else greatest(:capacity::int, enrolled_count)
                  end,
                  cohort_label = coalesce(:cohort_label, cohort_label),
                  status = coalesce(:status, status),
                  updated_at = now()
                where tenant_id = cast(:tenant_id as uuid)
                  and id = cast(:slot_id as uuid)
                returning
                  id::text as id,
                  service_id,
                  starts_at,
                  duration_minutes,
                  timezone,
                  capacity,
                  enrolled_count,
                  cohort_label,
                  cohort_recurrence_rule,
                  status,
                  zoho_event_id,
                  zoho_meeting_url,
                  zoho_calendar_event_url,
                  metadata
                """
            ),
            {
                "tenant_id": tenant_id,
                "slot_id": slot_id,
                "capacity": int(capacity) if capacity is not None else None,
                "cohort_label": _normalize_text(cohort_label),
                "status": (status or "").strip().lower() or None,
            },
        )
        row = result.mappings().first()
        return dict(row) if row else None

    async def cancel_slot(
        self,
        *,
        tenant_id: str,
        slot_id: str,
    ) -> dict[str, Any] | None:
        """Soft-delete: status = 'cancelled'."""
        return await self.update_slot(
            tenant_id=tenant_id,
            slot_id=slot_id,
            status="cancelled",
        )

    async def get_slot_for_booking(
        self,
        *,
        tenant_id: str,
        slot_id: str,
    ) -> dict[str, Any] | None:
        """Lookup a single slot scoped to a tenant for booking flow validation."""
        result = await self.session.execute(
            text(
                """
                select
                  s.id::text as id,
                  s.tenant_id::text as tenant_id,
                  s.service_id,
                  s.starts_at,
                  s.duration_minutes,
                  s.timezone,
                  s.capacity,
                  s.enrolled_count,
                  s.cohort_label,
                  s.status,
                  s.zoho_event_id,
                  s.zoho_meeting_url,
                  s.zoho_calendar_event_url,
                  s.metadata
                from chess_course_schedule_slots s
                where s.id = cast(:slot_id as uuid)
                  and s.tenant_id = cast(:tenant_id as uuid)
                limit 1
                """
            ),
            {"tenant_id": tenant_id, "slot_id": slot_id},
        )
        row = result.mappings().first()
        return dict(row) if row else None

    async def reserve_capacity(
        self,
        *,
        tenant_id: str,
        slot_id: str,
    ) -> dict[str, Any] | None:
        """Atomically increment ``enrolled_count`` if there is still space.

        Returns the updated row or ``None`` when the slot is full / cancelled.
        Also auto-flips ``status='full'`` when the increment fills capacity.
        """
        result = await self.session.execute(
            text(
                """
                update chess_course_schedule_slots
                set
                  enrolled_count = enrolled_count + 1,
                  status = case
                    when enrolled_count + 1 >= capacity then 'full'
                    else status
                  end,
                  updated_at = now()
                where id = cast(:slot_id as uuid)
                  and tenant_id = cast(:tenant_id as uuid)
                  and status = 'open'
                  and enrolled_count < capacity
                returning
                  id::text as id,
                  tenant_id::text as tenant_id,
                  service_id,
                  starts_at,
                  duration_minutes,
                  timezone,
                  capacity,
                  enrolled_count,
                  cohort_label,
                  status,
                  zoho_meeting_url,
                  zoho_calendar_event_url
                """
            ),
            {"tenant_id": tenant_id, "slot_id": slot_id},
        )
        row = result.mappings().first()
        return dict(row) if row else None

    async def release_capacity(
        self,
        *,
        tenant_id: str,
        slot_id: str,
    ) -> dict[str, Any] | None:
        """Atomically decrement ``enrolled_count`` when a booking is released.

        Mirrors :meth:`reserve_capacity`: returns the updated row, or ``None``
        when the slot is cancelled (we never touch a cancelled row). Also
        auto-flips ``status='full'`` back to ``'open'`` when the decrement
        re-opens capacity.
        """
        result = await self.session.execute(
            text(
                """
                update chess_course_schedule_slots
                set
                  enrolled_count = GREATEST(enrolled_count - 1, 0),
                  status = case
                    when status = 'full'
                      and GREATEST(enrolled_count - 1, 0) < capacity
                      then 'open'
                    else status
                  end,
                  updated_at = now()
                where id = cast(:slot_id as uuid)
                  and tenant_id = cast(:tenant_id as uuid)
                  and status <> 'cancelled'
                returning
                  id::text as id,
                  tenant_id::text as tenant_id,
                  service_id,
                  starts_at,
                  duration_minutes,
                  timezone,
                  capacity,
                  enrolled_count,
                  cohort_label,
                  status,
                  zoho_meeting_url,
                  zoho_calendar_event_url
                """
            ),
            {"tenant_id": tenant_id, "slot_id": slot_id},
        )
        row = result.mappings().first()
        return dict(row) if row else None

    async def attach_meeting_metadata(
        self,
        *,
        tenant_id: str,
        slot_id: str,
        meeting_url: str | None,
        calendar_event_url: str | None = None,
        event_id: str | None = None,
    ) -> dict[str, Any] | None:
        """Persist Zoho meeting metadata on the slot row.

        Only writes columns that are currently NULL so an existing group cohort
        URL is preserved across re-bookings.
        """
        result = await self.session.execute(
            text(
                """
                update chess_course_schedule_slots
                set
                  zoho_meeting_url = coalesce(zoho_meeting_url, :meeting_url),
                  zoho_calendar_event_url = coalesce(zoho_calendar_event_url, :calendar_event_url),
                  zoho_event_id = coalesce(zoho_event_id, :event_id),
                  updated_at = now()
                where id = cast(:slot_id as uuid)
                  and tenant_id = cast(:tenant_id as uuid)
                returning
                  id::text as id,
                  zoho_meeting_url,
                  zoho_calendar_event_url,
                  zoho_event_id
                """
            ),
            {
                "tenant_id": tenant_id,
                "slot_id": slot_id,
                "meeting_url": _normalize_text(meeting_url),
                "calendar_event_url": _normalize_text(calendar_event_url),
                "event_id": _normalize_text(event_id),
            },
        )
        row = result.mappings().first()
        return dict(row) if row else None
