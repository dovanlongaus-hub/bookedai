"""Public + tenant-admin handlers for ``chess_course_schedule_slots``.

Three families of endpoints live here:

* Public ``GET /api/v1/chess/courses/{service_id}/slots`` — the chess
  enrolment landing page reads available open cohorts so parents can pick a
  start time before submitting their booking_intent.
* Tenant-admin ``GET/POST/PATCH/DELETE /api/v1/tenants/me/chess/courses/{service_id}/slots[/{slot_id}]``
  — GM Mai Hung's workspace publishes / manages cohorts directly. Auth via
  the existing tenant-session helper.
* Public ``POST /api/v1/chess/catalog/search`` — replaces the marketplace-wide
  search for chess.bookedai.au with a tenant-scoped catalog query that scores
  by query overlap and attaches per-service ``available_slots_count``.

All endpoints return a stable ``{status, data}`` envelope using the standard
``_success_response`` / ``_error_response`` helpers.
"""

from __future__ import annotations

from datetime import UTC, date, datetime, time, timedelta
from typing import Any
from zoneinfo import ZoneInfo

from fastapi import Header, Query, Request
from pydantic import BaseModel, Field

from api.v1_routes import (
    ActorContextPayload,
    _error_response,
    _resolve_tenant_request_context,
    _success_response,
)
from core.errors import AppError, ValidationAppError
from core.logging import get_logger
from db import get_session
from repositories.base import RepositoryContext
from repositories.chess_schedule_slot_repository import (
    ChessScheduleSlotRepository,
)
from repositories.tenant_repository import TenantRepository
from sqlalchemy import text


_logger = get_logger("bookedai.api.v1_chess_slot_handlers")


CHESS_TENANT_SLUG = "co-mai-hung-chess-class"

# RRULE parsing scope: BYDAY codes the chess tenant uses today. The handler
# only needs to expand a small finite set (Mon–Sun); we don't pull in
# python-dateutil to keep the deps surface unchanged.
_RRULE_BYDAY_MAP = {
    "MO": 0,
    "TU": 1,
    "WE": 2,
    "TH": 3,
    "FR": 4,
    "SA": 5,
    "SU": 6,
}


def _parse_rrule_byday(rule: str) -> list[int] | None:
    """Extract BYDAY weekday numbers from a minimal RRULE string."""
    if not rule:
        return None
    normalized = rule.replace(" ", "").upper()
    parts = {}
    for chunk in normalized.split(";"):
        if "=" in chunk:
            key, _, value = chunk.partition("=")
            parts[key.strip()] = value.strip()
    if parts.get("FREQ", "WEEKLY") != "WEEKLY":
        return None
    byday_raw = parts.get("BYDAY", "")
    if not byday_raw:
        return None
    weekdays: list[int] = []
    for token in byday_raw.split(","):
        token = token.strip()
        if token in _RRULE_BYDAY_MAP:
            weekdays.append(_RRULE_BYDAY_MAP[token])
    return weekdays or None


# ---------------------------------------------------------------------------
# Pydantic payloads
# ---------------------------------------------------------------------------


class CreateSlotPayload(BaseModel):
    starts_at: str | None = Field(
        default=None,
        description="ISO-8601 timestamp for a single slot. Either this or recurrence_rule.",
    )
    recurrence_rule: str | None = Field(
        default=None,
        description="RRULE string (e.g. FREQ=WEEKLY;BYDAY=MO,WE,FR). When set, expands to multiple slots.",
    )
    duration_minutes: int = Field(..., ge=15, le=480)
    capacity: int = Field(default=1, ge=1, le=200)
    timezone: str = Field(default="Asia/Ho_Chi_Minh")
    cohort_label: str | None = Field(default=None)
    occurrences: int = Field(
        default=4,
        ge=1,
        le=52,
        description="Number of weeks to expand when recurrence_rule is provided.",
    )
    start_time_local: str | None = Field(
        default=None,
        description="HH:MM local time for the recurrence expansion. Required when recurrence_rule is set.",
    )
    week_start: str | None = Field(
        default=None,
        description="YYYY-MM-DD anchor for the recurrence (defaults to next Monday).",
    )


class UpdateSlotPayload(BaseModel):
    capacity: int | None = Field(default=None, ge=1, le=200)
    cohort_label: str | None = Field(default=None)
    status: str | None = Field(
        default=None,
        description="open | full | cancelled | completed",
    )


class CatalogSearchFilters(BaseModel):
    age_band: str | None = Field(default=None, description="kids | adult")
    delivery: str | None = Field(default=None, description="online (only)")
    format: str | None = Field(
        default=None,
        description="group | private | tournament | elite",
    )
    max_price_aud: float | None = Field(default=None, ge=0)


class CatalogSearchPayload(BaseModel):
    query: str = Field(default="")
    filters: CatalogSearchFilters | None = Field(default=None)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _coerce_iso_starts_at(value: str, *, tz_name: str) -> datetime:
    raw = (value or "").strip()
    if not raw:
        raise ValueError("starts_at is required.")
    try:
        if "T" in raw or "+" in raw or "Z" in raw:
            dt = datetime.fromisoformat(raw.replace("Z", "+00:00"))
        else:
            dt = datetime.strptime(raw, "%Y-%m-%d %H:%M:%S")
    except ValueError as exc:
        raise ValueError(f"starts_at could not be parsed: {exc}") from exc
    if dt.tzinfo is None:
        try:
            zone = ZoneInfo(tz_name or "Asia/Ho_Chi_Minh")
        except Exception:  # noqa: BLE001
            zone = ZoneInfo("Asia/Ho_Chi_Minh")
        dt = dt.replace(tzinfo=zone)
    return dt


def _next_monday(today: date) -> date:
    days_ahead = (7 - today.weekday()) % 7
    if days_ahead == 0:
        days_ahead = 7
    return today + timedelta(days=days_ahead)


def _expand_recurrence(
    *,
    rrule: str,
    start_time_local: str,
    timezone_name: str,
    week_start: date,
    occurrences: int,
) -> list[datetime]:
    """Expand an RRULE into concrete ``starts_at`` datetimes (tz-aware)."""
    weekdays = _parse_rrule_byday(rrule)
    if not weekdays:
        raise ValueError(
            "recurrence_rule must include FREQ=WEEKLY;BYDAY=... e.g. FREQ=WEEKLY;BYDAY=MO,WE,FR"
        )
    try:
        hour_str, minute_str = start_time_local.split(":")[:2]
        local_time = time(int(hour_str), int(minute_str))
    except Exception as exc:  # noqa: BLE001
        raise ValueError(
            "start_time_local must be HH:MM (24h)"
        ) from exc
    try:
        zone = ZoneInfo(timezone_name or "Asia/Ho_Chi_Minh")
    except Exception:  # noqa: BLE001
        zone = ZoneInfo("Asia/Ho_Chi_Minh")
    base_monday = week_start - timedelta(days=week_start.weekday())
    expanded: list[datetime] = []
    weeks = max(1, occurrences)
    for week_index in range(weeks):
        week_anchor = base_monday + timedelta(days=7 * week_index)
        for wd in weekdays:
            day = week_anchor + timedelta(days=wd)
            expanded.append(datetime.combine(day, local_time, tzinfo=zone))
    expanded.sort()
    return expanded


def _slot_to_public_view(row: dict[str, Any]) -> dict[str, Any]:
    starts_at = row.get("starts_at")
    return {
        "id": row.get("id"),
        "service_id": row.get("service_id"),
        "starts_at": (
            starts_at.isoformat() if hasattr(starts_at, "isoformat") else starts_at
        ),
        "duration_minutes": row.get("duration_minutes"),
        "timezone": row.get("timezone"),
        "capacity": row.get("capacity"),
        "enrolled_count": row.get("enrolled_count"),
        "available": row.get("available")
        if row.get("available") is not None
        else max(int(row.get("capacity") or 0) - int(row.get("enrolled_count") or 0), 0),
        "cohort_label": row.get("cohort_label"),
        "cohort_recurrence_rule": row.get("cohort_recurrence_rule"),
        "status": row.get("status"),
    }


def _slot_to_admin_view(row: dict[str, Any]) -> dict[str, Any]:
    base = _slot_to_public_view(row)
    base["zoho_event_id"] = row.get("zoho_event_id")
    base["zoho_meeting_url"] = row.get("zoho_meeting_url")
    base["zoho_calendar_event_url"] = row.get("zoho_calendar_event_url")
    base["metadata"] = row.get("metadata") or {}
    if row.get("created_at"):
        base["created_at"] = (
            row["created_at"].isoformat()
            if hasattr(row["created_at"], "isoformat")
            else str(row["created_at"])
        )
    if row.get("updated_at"):
        base["updated_at"] = (
            row["updated_at"].isoformat()
            if hasattr(row["updated_at"], "isoformat")
            else str(row["updated_at"])
        )
    return base


async def _resolve_chess_tenant_id(session) -> str | None:
    repo = TenantRepository(RepositoryContext(session=session))
    return await repo.resolve_tenant_id(CHESS_TENANT_SLUG)


# ---------------------------------------------------------------------------
# Public — list slots for a course
# ---------------------------------------------------------------------------


async def list_chess_course_slots(
    service_id: str,
    request: Request,
    from_date: str | None = Query(default=None, alias="from"),
    to_date: str | None = Query(default=None, alias="to"),
    limit: int = Query(default=12, ge=1, le=100),
):
    normalized_service_id = (service_id or "").strip()
    if not normalized_service_id:
        return _error_response(
            ValidationAppError(
                "service_id is required.",
                details={"service_id": ["required"]},
            ),
            tenant_id=None,
            actor_context=None,
        )

    today = datetime.now(tz=UTC).date()
    try:
        starts_from_date = (
            datetime.strptime(from_date, "%Y-%m-%d").date()
            if from_date
            else today
        )
        starts_to_date = (
            datetime.strptime(to_date, "%Y-%m-%d").date()
            if to_date
            else today + timedelta(days=28)
        )
    except ValueError as exc:
        return _error_response(
            ValidationAppError(
                f"from/to must be YYYY-MM-DD: {exc}",
                details={"from": from_date, "to": to_date},
            ),
            tenant_id=None,
            actor_context=None,
        )
    if starts_to_date <= starts_from_date:
        starts_to_date = starts_from_date + timedelta(days=1)

    starts_from = datetime.combine(starts_from_date, time.min, tzinfo=UTC)
    starts_to = datetime.combine(starts_to_date, time.min, tzinfo=UTC)

    async with get_session(request.app.state.session_factory) as session:
        tenant_id = await _resolve_chess_tenant_id(session)
        if not tenant_id:
            return _success_response(
                {"slots": []},
                tenant_id=None,
                actor_context=None,
            )
        slot_repo = ChessScheduleSlotRepository(
            RepositoryContext(session=session, tenant_id=tenant_id)
        )
        rows = await slot_repo.list_public_slots(
            tenant_id=tenant_id,
            service_id=normalized_service_id,
            starts_from=starts_from,
            starts_to=starts_to,
            limit=limit,
        )

    return _success_response(
        {"slots": [_slot_to_public_view(row) for row in rows]},
        tenant_id=None,
        actor_context=None,
    )


# ---------------------------------------------------------------------------
# Tenant-admin CRUD
# ---------------------------------------------------------------------------


async def _ensure_tenant_admin_session(
    request: Request,
    *,
    authorization: str | None,
) -> tuple[str | None, str | None, dict | None, AppError | None]:
    tenant_ref, tenant_id, tenant_session, _membership = await _resolve_tenant_request_context(
        request,
        authorization=authorization,
    )
    if not tenant_session:
        return tenant_ref, tenant_id, None, AppError(
            code="tenant_auth_required",
            message="Sign in with an active tenant account to manage chess slots.",
            status_code=401,
            details={"tenant_ref": tenant_ref},
        )
    if not tenant_id:
        return tenant_ref, None, tenant_session, AppError(
            code="tenant_not_found",
            message="The requested tenant could not be resolved.",
            status_code=404,
            details={"tenant_ref": tenant_ref},
        )
    return tenant_ref, tenant_id, tenant_session, None


def _tenant_actor(tenant_id: str | None) -> ActorContextPayload:
    return ActorContextPayload(
        channel="tenant_app",
        tenant_id=tenant_id,
        role="tenant_admin",
        deployment_mode="standalone_app",
    )


async def list_tenant_chess_course_slots(
    service_id: str,
    request: Request,
    authorization: str | None = Header(default=None),
):
    tenant_ref, tenant_id, _session, error = await _ensure_tenant_admin_session(
        request,
        authorization=authorization,
    )
    if error is not None:
        return _error_response(error, tenant_id=tenant_id, actor_context=None)

    normalized_service_id = (service_id or "").strip()
    if not normalized_service_id:
        return _error_response(
            ValidationAppError(
                "service_id is required.",
                details={"service_id": ["required"]},
            ),
            tenant_id=tenant_id,
            actor_context=_tenant_actor(tenant_id),
        )

    async with get_session(request.app.state.session_factory) as session:
        slot_repo = ChessScheduleSlotRepository(
            RepositoryContext(session=session, tenant_id=tenant_id)
        )
        rows = await slot_repo.list_admin_slots(
            tenant_id=tenant_id,
            service_id=normalized_service_id,
            limit=500,
        )

    return _success_response(
        {"slots": [_slot_to_admin_view(row) for row in rows]},
        tenant_id=tenant_id,
        actor_context=_tenant_actor(tenant_id),
    )


async def create_tenant_chess_course_slots(
    service_id: str,
    request: Request,
    payload: CreateSlotPayload,
    authorization: str | None = Header(default=None),
):
    tenant_ref, tenant_id, _session, error = await _ensure_tenant_admin_session(
        request,
        authorization=authorization,
    )
    if error is not None:
        return _error_response(error, tenant_id=tenant_id, actor_context=None)

    normalized_service_id = (service_id or "").strip()
    if not normalized_service_id:
        return _error_response(
            ValidationAppError(
                "service_id is required.",
                details={"service_id": ["required"]},
            ),
            tenant_id=tenant_id,
            actor_context=_tenant_actor(tenant_id),
        )

    if not payload.starts_at and not payload.recurrence_rule:
        return _error_response(
            ValidationAppError(
                "Provide either starts_at or recurrence_rule.",
                details={"payload": ["starts_at_or_recurrence_required"]},
            ),
            tenant_id=tenant_id,
            actor_context=_tenant_actor(tenant_id),
        )

    starts_at_list: list[datetime] = []
    try:
        if payload.starts_at:
            starts_at_list.append(
                _coerce_iso_starts_at(payload.starts_at, tz_name=payload.timezone)
            )
        if payload.recurrence_rule:
            week_start = (
                datetime.strptime(payload.week_start, "%Y-%m-%d").date()
                if payload.week_start
                else _next_monday(datetime.now(tz=UTC).date())
            )
            starts_at_list.extend(
                _expand_recurrence(
                    rrule=payload.recurrence_rule,
                    start_time_local=payload.start_time_local or "18:00",
                    timezone_name=payload.timezone,
                    week_start=week_start,
                    occurrences=payload.occurrences,
                )
            )
    except ValueError as exc:
        return _error_response(
            ValidationAppError(
                str(exc),
                details={"payload": ["invalid_schedule"]},
            ),
            tenant_id=tenant_id,
            actor_context=_tenant_actor(tenant_id),
        )

    if not starts_at_list:
        return _error_response(
            ValidationAppError(
                "Could not derive any slot start times from payload.",
                details={"payload": ["empty_expansion"]},
            ),
            tenant_id=tenant_id,
            actor_context=_tenant_actor(tenant_id),
        )

    created_rows: list[dict[str, Any]] = []
    async with get_session(request.app.state.session_factory) as session:
        slot_repo = ChessScheduleSlotRepository(
            RepositoryContext(session=session, tenant_id=tenant_id)
        )
        for starts_at in starts_at_list:
            row = await slot_repo.create_slot(
                tenant_id=tenant_id,
                service_id=normalized_service_id,
                starts_at=starts_at,
                duration_minutes=payload.duration_minutes,
                timezone=payload.timezone,
                capacity=payload.capacity,
                cohort_label=payload.cohort_label,
                cohort_recurrence_rule=payload.recurrence_rule,
            )
            if row:
                created_rows.append(row)
        await session.commit()

    return _success_response(
        {"slots": [_slot_to_admin_view(row) for row in created_rows]},
        tenant_id=tenant_id,
        actor_context=_tenant_actor(tenant_id),
        message=f"{len(created_rows)} slot(s) saved.",
    )


async def update_tenant_chess_course_slot(
    service_id: str,
    slot_id: str,
    request: Request,
    payload: UpdateSlotPayload,
    authorization: str | None = Header(default=None),
):
    tenant_ref, tenant_id, _session, error = await _ensure_tenant_admin_session(
        request,
        authorization=authorization,
    )
    if error is not None:
        return _error_response(error, tenant_id=tenant_id, actor_context=None)

    normalized_status = (payload.status or "").strip().lower() or None
    if normalized_status and normalized_status not in {
        "open",
        "full",
        "cancelled",
        "completed",
    }:
        return _error_response(
            ValidationAppError(
                "status must be one of open|full|cancelled|completed.",
                details={"status": ["unsupported"]},
            ),
            tenant_id=tenant_id,
            actor_context=_tenant_actor(tenant_id),
        )

    async with get_session(request.app.state.session_factory) as session:
        slot_repo = ChessScheduleSlotRepository(
            RepositoryContext(session=session, tenant_id=tenant_id)
        )
        row = await slot_repo.update_slot(
            tenant_id=tenant_id,
            slot_id=slot_id,
            capacity=payload.capacity,
            cohort_label=payload.cohort_label,
            status=normalized_status,
        )
        if not row:
            return _error_response(
                AppError(
                    code="slot_not_found",
                    message="The requested chess slot does not belong to this tenant.",
                    status_code=404,
                    details={"slot_id": slot_id},
                ),
                tenant_id=tenant_id,
                actor_context=_tenant_actor(tenant_id),
            )
        await session.commit()

    return _success_response(
        {"slot": _slot_to_admin_view(row)},
        tenant_id=tenant_id,
        actor_context=_tenant_actor(tenant_id),
    )


async def delete_tenant_chess_course_slot(
    service_id: str,
    slot_id: str,
    request: Request,
    authorization: str | None = Header(default=None),
):
    tenant_ref, tenant_id, _session, error = await _ensure_tenant_admin_session(
        request,
        authorization=authorization,
    )
    if error is not None:
        return _error_response(error, tenant_id=tenant_id, actor_context=None)

    async with get_session(request.app.state.session_factory) as session:
        slot_repo = ChessScheduleSlotRepository(
            RepositoryContext(session=session, tenant_id=tenant_id)
        )
        row = await slot_repo.cancel_slot(
            tenant_id=tenant_id,
            slot_id=slot_id,
        )
        if not row:
            return _error_response(
                AppError(
                    code="slot_not_found",
                    message="The requested chess slot does not belong to this tenant.",
                    status_code=404,
                    details={"slot_id": slot_id},
                ),
                tenant_id=tenant_id,
                actor_context=_tenant_actor(tenant_id),
            )
        await session.commit()

    return _success_response(
        {"slot": _slot_to_admin_view(row)},
        tenant_id=tenant_id,
        actor_context=_tenant_actor(tenant_id),
        message="Slot cancelled.",
    )


# ---------------------------------------------------------------------------
# Public — tenant-scoped catalog search
# ---------------------------------------------------------------------------


_FORMAT_TAGS: dict[str, set[str]] = {
    "group": {"group", "class", "lesson"},
    "private": {"private", "1-1", "coaching"},
    "tournament": {"tournament", "advanced"},
    "elite": {"elite", "premium", "elite-cohort"},
}


def _service_tag_set(row: dict[str, Any]) -> set[str]:
    raw = row.get("tags_json") or []
    if isinstance(raw, list):
        return {str(t).strip().lower() for t in raw if t}
    if isinstance(raw, str):
        return {raw.strip().lower()}
    return set()


def _matches_format_filter(format_value: str, tags: set[str]) -> bool:
    target = _FORMAT_TAGS.get(format_value.strip().lower())
    if not target:
        return True
    return bool(target & tags)


def _query_relevance_score(
    query_terms: list[str],
    *,
    name: str,
    summary: str,
    tags: set[str],
) -> float:
    if not query_terms:
        return 0.0
    name_lower = (name or "").lower()
    summary_lower = (summary or "").lower()
    score = 0.0
    for term in query_terms:
        if not term:
            continue
        if term in name_lower:
            score += 3.0
        if term in summary_lower:
            score += 1.5
        if term in tags:
            score += 2.0
    return score


def _vnd_to_aud_estimate(amount_vnd: float) -> float:
    # Indicative rate used elsewhere in the chess catalog (16,667 VND ≈ 1 AUD).
    if amount_vnd <= 0:
        return 0.0
    return round(amount_vnd / 16667.0, 2)


async def chess_catalog_search(
    request: Request,
    payload: CatalogSearchPayload,
):
    """Tenant-scoped catalog search for chess.bookedai.au.

    Public — no auth. Reads ``service_merchant_profiles`` filtered to the chess
    tenant + ``publish_state='published'``, scores by query overlap with name,
    summary, and tags, optionally filters by ``filters`` (age_band, delivery,
    format, max_price_aud), and attaches per-service ``available_slots_count``.
    """
    raw_query = (payload.query or "").strip()
    query_terms = [
        token
        for token in (chunk.strip().lower() for chunk in raw_query.split())
        if token
    ]

    filters = payload.filters or CatalogSearchFilters()
    max_price = float(filters.max_price_aud) if filters.max_price_aud is not None else None

    async with get_session(request.app.state.session_factory) as session:
        tenant_id = await _resolve_chess_tenant_id(session)
        if not tenant_id:
            return _success_response(
                {"matches": []},
                tenant_id=None,
                actor_context=None,
            )

        result = await session.execute(
            text(
                """
                select
                  service_id,
                  name,
                  summary,
                  display_price,
                  amount_aud,
                  currency_code,
                  tags_json,
                  metadata,
                  duration_minutes
                from service_merchant_profiles
                where tenant_id = cast(:tenant_id as text)
                  and publish_state = 'published'
                  and is_active = 1
                """
            ),
            {"tenant_id": tenant_id},
        )
        services = [dict(row._mapping) for row in result]

        slot_repo = ChessScheduleSlotRepository(
            RepositoryContext(session=session, tenant_id=tenant_id)
        )
        service_ids = [str(s["service_id"]) for s in services]
        slot_counts = await slot_repo.count_available_for_services(
            tenant_id=tenant_id,
            service_ids=service_ids,
            starts_from=datetime.now(tz=UTC),
        )

    matches: list[dict[str, Any]] = []
    for svc in services:
        tags = _service_tag_set(svc)
        metadata = svc.get("metadata") or {}
        if not isinstance(metadata, dict):
            metadata = {}

        # filter: age_band — chess catalog only has kids today, but keep
        # the contract honest. tags include 'kids' / 'children' for kids,
        # and adult-friendly programs would carry 'adult' if introduced.
        if filters.age_band:
            age = filters.age_band.strip().lower()
            kids_match = bool({"kids", "children"} & tags)
            if age == "kids" and not kids_match:
                continue
            if age == "adult" and kids_match and "adult" not in tags:
                continue

        # filter: delivery — chess.bookedai.au is online-only post-036
        if filters.delivery:
            delivery_filter = filters.delivery.strip().lower()
            delivery_mode = str(metadata.get("delivery_mode") or "").lower()
            if delivery_filter == "online" and delivery_mode and delivery_mode != "online":
                continue

        # filter: format
        if filters.format and not _matches_format_filter(filters.format, tags):
            continue

        amount_aud_raw = svc.get("amount_aud")
        try:
            amount_aud = float(amount_aud_raw) if amount_aud_raw is not None else None
        except (TypeError, ValueError):
            amount_aud = None

        if max_price is not None and amount_aud is not None and amount_aud > max_price:
            continue

        score = _query_relevance_score(
            query_terms,
            name=str(svc.get("name") or ""),
            summary=str(svc.get("summary") or ""),
            tags=tags,
        )

        tier_raw = metadata.get("tier")
        try:
            tier_int = int(tier_raw) if tier_raw is not None else 99
        except (TypeError, ValueError):
            tier_int = 99

        matches.append(
            {
                "service_id": svc.get("service_id"),
                "name": svc.get("name"),
                "summary": svc.get("summary"),
                "display_price_aud": (
                    f"A${amount_aud:,.2f}" if amount_aud is not None else None
                ),
                "display_price_vnd": svc.get("display_price"),
                "tier": tier_int if tier_int < 99 else None,
                "format": (
                    "elite"
                    if "elite" in tags
                    else "private"
                    if "private" in tags or "1-1" in tags
                    else "tournament"
                    if "tournament" in tags
                    else "group"
                ),
                "available_slots_count": int(
                    slot_counts.get(str(svc.get("service_id")), 0)
                ),
                "_score": score,
                "_tier": tier_int,
            }
        )

    # Order by tier asc then relevance score desc, then by name.
    matches.sort(key=lambda m: (m["_tier"], -m["_score"], str(m.get("name") or "")))
    for m in matches:
        m.pop("_score", None)
        m.pop("_tier", None)

    return _success_response(
        {"matches": matches},
        tenant_id=None,
        actor_context=None,
    )


__all__ = [
    "CatalogSearchPayload",
    "CreateSlotPayload",
    "UpdateSlotPayload",
    "chess_catalog_search",
    "create_tenant_chess_course_slots",
    "delete_tenant_chess_course_slot",
    "list_chess_course_slots",
    "list_tenant_chess_course_slots",
    "update_tenant_chess_course_slot",
]
