"""Send a per-parent monthly chess schedule reminder for an upcoming month.

Phase 4 §1 deliverable. On the first of each month at 09:00 UTC the
chess tenant's parents receive an email summarising every session their
student is enrolled in over the next 30 days. The script is idempotent —
it persists ``monthly_reminder_last_run_at`` on
``tenant_settings.settings_json`` and skips re-runs within the last 24
hours so an accidental cron double-fire never spams parents twice.

Cron line (production VPS):

    0 9 1 * * cd /home/dovanlong/BookedAI && \
        /home/dovanlong/BookedAI/.venv-backend/bin/python -m \
        scripts.chess_monthly_schedule_reminder >> \
        /var/log/chess-monthly-reminder.log 2>&1

Operational notes (full runbook in
``docs/qa/chess-monthly-reminder-runbook.md``):

* ``--dry-run`` computes + logs but does not dispatch any emails. Useful
  before each rollout to confirm contact + session counts look sane.
* ``--tenant-slug`` defaults to ``co-mai-hung-chess-class``. Other
  tenants can be added by passing the slug explicitly.
* ``--month YYYY-MM`` overrides the target month. Defaults to the
  calendar month AFTER the current local date (so a 2026-04-30 run with
  no flag emails May 2026).
* CC: ``chess@bookedai.au`` is auto-attached server-side via the chess
  tenant's ``cc_emails`` list (migration 039) — no per-call wiring
  needed here.
* Auto-CC happens through the lifecycle email orchestrator on the
  apiV1.sendLifecycleEmail path; this script delegates to the same
  ``email_service`` + ``orchestrate_lifecycle_email`` helpers used by
  ``backend/api/v1_communication_handlers.py`` to keep semantics
  identical.
"""

from __future__ import annotations

import argparse
import asyncio
import json
import logging
import os
import sys
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Any
from urllib.parse import quote
from zoneinfo import ZoneInfo

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "backend"))

from sqlalchemy import text  # type: ignore

# Backend imports
from config import get_settings  # type: ignore
from db import create_engine, create_session_factory, get_session  # type: ignore
from service_layer.communication_service import (  # type: ignore
    render_bookedai_monthly_schedule_reminder_email,
)
from service_layer.email_service import EmailService  # type: ignore
from service_layer.lifecycle_ops_service import orchestrate_lifecycle_email  # type: ignore


_DEFAULT_TENANT_SLUG = "co-mai-hung-chess-class"
_LAST_RUN_KEY = "monthly_reminder_last_run_at"
_RERUN_THRESHOLD_HOURS = 24
_DEFAULT_TENANT_BRAND_NAME = "Mai Hưng Chess Academy"
_DEFAULT_FALLBACK_MEETING_URL = ""
_PORTAL_BASE_URL = "https://portal.bookedai.au"


logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
log = logging.getLogger("chess_monthly_reminder")


_EN_WEEKDAYS = {0: "Mon", 1: "Tue", 2: "Wed", 3: "Thu", 4: "Fri", 5: "Sat", 6: "Sun"}
_VI_WEEKDAYS = {0: "Thứ 2", 1: "Thứ 3", 2: "Thứ 4", 3: "Thứ 5", 4: "Thứ 6", 5: "Thứ 7", 6: "CN"}
_EN_MONTHS = {
    1: "January", 2: "February", 3: "March", 4: "April", 5: "May", 6: "June",
    7: "July", 8: "August", 9: "September", 10: "October", 11: "November", 12: "December",
}


@dataclass
class _ParentSchedule:
    contact_id: str | None
    full_name: str | None
    email: str
    locale: str  # "en" or "vi"
    student_name: str
    sessions: list[dict[str, Any]]


def _resolve_locale(value: Any | None) -> str:
    raw = str(value or "").strip().lower()
    if raw.startswith("vi"):
        return "vi"
    return "en"


def _format_session_line(
    *, starts_at: datetime, tz_name: str, cohort_label: str | None, locale: str
) -> str:
    tz = ZoneInfo(tz_name) if tz_name else timezone.utc
    if isinstance(starts_at, datetime):
        local_dt = starts_at.astimezone(tz) if starts_at.tzinfo else starts_at.replace(tzinfo=timezone.utc).astimezone(tz)
    else:  # pragma: no cover — defensive guard
        return ""
    weekday_label = (_VI_WEEKDAYS if locale == "vi" else _EN_WEEKDAYS)[local_dt.weekday()]
    if locale == "vi":
        date_part = f"{weekday_label} {local_dt.day}/{local_dt.month}"
    else:
        date_part = f"{weekday_label} {local_dt.day} {_EN_MONTHS[local_dt.month][:3]}"
    time_part = local_dt.strftime("%H:%M")
    tz_short = "ICT" if tz_name == "Asia/Ho_Chi_Minh" else tz_name.split("/")[-1]
    suffix = f" — {cohort_label}" if cohort_label else ""
    return f"• {date_part}, {time_part} {tz_short}{suffix}"


def _resolve_target_month(month_arg: str | None, today: datetime | None = None) -> tuple[datetime, datetime, str, str]:
    """Return (window_start_utc, window_end_utc, en_label, vi_label).

    Default: current calendar month + 1. Window is the next 30 days from
    the start of the target month. We pick a 30-day rolling window rather
    than a strict month boundary because the spec defines the cadence as
    "next 30 days" — easier for parents to reason about than calendar
    months when the cron fires on the 1st.
    """
    today = today or datetime.now(timezone.utc)
    if month_arg:
        year_str, _, month_str = month_arg.strip().partition("-")
        try:
            year = int(year_str)
            month = int(month_str)
        except ValueError as exc:
            raise SystemExit(f"--month must be in YYYY-MM format: {exc}") from exc
    else:
        # Default to the month following 'today'.
        if today.month == 12:
            year, month = today.year + 1, 1
        else:
            year, month = today.year, today.month + 1
    window_start = datetime(year, month, 1, tzinfo=timezone.utc)
    window_end = window_start + timedelta(days=30)
    en_label = f"{_EN_MONTHS[month]} {year}"
    vi_label = f"{month}/{year}"
    return window_start, window_end, en_label, vi_label


async def _resolve_chess_tenant(session, tenant_slug: str) -> dict[str, Any] | None:
    result = await session.execute(
        text(
            """
            select
              t.id::text as id,
              t.slug,
              t.name,
              t.timezone,
              t.locale
            from tenants t
            where t.slug = :slug
            limit 1
            """
        ),
        {"slug": tenant_slug},
    )
    row = result.mappings().first()
    return dict(row) if row else None


async def _fetch_tenant_settings(session, tenant_id: str) -> dict[str, Any]:
    result = await session.execute(
        text(
            """
            select settings_json
            from tenant_settings
            where tenant_id = cast(:tenant_id as uuid)
            limit 1
            """
        ),
        {"tenant_id": tenant_id},
    )
    row = result.mappings().first()
    settings = (row or {}).get("settings_json") if row else None
    return dict(settings) if isinstance(settings, dict) else {}


async def _persist_last_run(session, tenant_id: str, *, ran_at: datetime) -> None:
    await session.execute(
        text(
            """
            insert into tenant_settings (tenant_id, settings_json)
            values (cast(:tenant_id as uuid),
                    cast(:settings_json as jsonb))
            on conflict (tenant_id) do update
            set settings_json = coalesce(tenant_settings.settings_json, '{}'::jsonb)
                                || cast(:settings_json as jsonb),
                version = tenant_settings.version + 1,
                updated_at = now()
            """
        ),
        {
            "tenant_id": tenant_id,
            "settings_json": json.dumps({_LAST_RUN_KEY: ran_at.isoformat()}),
        },
    )


async def _fetch_upcoming_sessions(
    session, *, tenant_id: str, window_start: datetime, window_end: datetime
) -> list[dict[str, Any]]:
    """Return one row per (parent → upcoming chess session) within the window.

    Parents are looked up by `booking_intents.contact_id → contacts`. We
    deliberately scope to ``status in ('captured','confirmed','paid','active')`` so
    cancelled / refunded bookings drop out. The slot row is joined via
    ``metadata_json->>'slot_id'`` (chess flow stores the slot UUID there).
    """
    result = await session.execute(
        text(
            """
            select
              c.id::text as contact_id,
              coalesce(c.full_name, '') as parent_name,
              lower(coalesce(c.email, '')) as parent_email,
              coalesce(bi.metadata_json->>'student_name', c.full_name, '') as student_name,
              coalesce(bi.metadata_json->>'locale', '') as locale,
              bi.booking_reference,
              bi.metadata_json,
              s.id::text as slot_id,
              s.starts_at,
              s.duration_minutes,
              s.timezone as slot_timezone,
              s.cohort_label,
              s.zoho_meeting_url
            from booking_intents bi
            join contacts c on c.id = bi.contact_id
            join chess_course_schedule_slots s
              on s.id = nullif(bi.metadata_json->>'slot_id', '')::uuid
            where bi.tenant_id = cast(:tenant_id as uuid)
              and s.starts_at >= :window_start
              and s.starts_at < :window_end
              and s.status in ('open', 'full')
              and bi.status in ('captured', 'confirmed', 'paid', 'active')
              and coalesce(c.email, '') <> ''
            order by lower(c.email), s.starts_at asc
            """
        ),
        {
            "tenant_id": tenant_id,
            "window_start": window_start,
            "window_end": window_end,
        },
    )
    return [dict(row) for row in result.mappings().all()]


def _group_by_parent(
    rows: list[dict[str, Any]], *, tenant_default_locale: str
) -> list[_ParentSchedule]:
    by_email: dict[str, _ParentSchedule] = {}
    for row in rows:
        email = (row.get("parent_email") or "").strip()
        if not email:
            continue
        locale = _resolve_locale(row.get("locale") or tenant_default_locale)
        parent = by_email.get(email)
        if parent is None:
            parent = _ParentSchedule(
                contact_id=row.get("contact_id"),
                full_name=(row.get("parent_name") or "").strip() or None,
                email=email,
                locale=locale,
                student_name=(row.get("student_name") or "").strip() or "your student",
                sessions=[],
            )
            by_email[email] = parent
        parent.sessions.append(
            {
                "starts_at": row.get("starts_at"),
                "tz_name": row.get("slot_timezone") or "Asia/Ho_Chi_Minh",
                "cohort_label": (row.get("cohort_label") or "").strip() or None,
                "zoho_meeting_url": (row.get("zoho_meeting_url") or "").strip() or None,
                "booking_reference": (row.get("booking_reference") or "").strip() or None,
            }
        )
    return list(by_email.values())


def _build_sessions_text(parent: _ParentSchedule) -> str:
    lines = []
    for session_info in parent.sessions:
        line = _format_session_line(
            starts_at=session_info["starts_at"],
            tz_name=session_info["tz_name"],
            cohort_label=session_info["cohort_label"],
            locale=parent.locale,
        )
        if line:
            lines.append(line)
    return "\n".join(lines)


def _resolve_meeting_url_general(parent: _ParentSchedule, fallback: str) -> str:
    for session_info in parent.sessions:
        url = session_info.get("zoho_meeting_url")
        if url:
            return url
    return fallback


def _resolve_manage_link(parent: _ParentSchedule) -> str:
    if not parent.email:
        return _PORTAL_BASE_URL
    return f"{_PORTAL_BASE_URL}/?email={quote(parent.email, safe='')}"


async def _dispatch_for_parent(
    *,
    session,
    settings,
    email_service: EmailService,
    tenant_id: str,
    parent: _ParentSchedule,
    month_label_en: str,
    month_label_vi: str,
    tenant_brand_name: str,
    fallback_meeting_url: str,
    coach_blurb: str,
    cc_emails: list[str],
    dry_run: bool,
) -> dict[str, Any]:
    sessions_text = _build_sessions_text(parent)
    if not sessions_text:
        return {"status": "skipped", "reason": "no_sessions", "email": parent.email}
    month_label = month_label_vi if parent.locale == "vi" else month_label_en
    rendered = render_bookedai_monthly_schedule_reminder_email(
        variables={
            "parent_name": (parent.full_name or "there").split(" ")[0],
            "student_name": parent.student_name,
            "month_label": month_label,
            "sessions_text": sessions_text,
            "meeting_url_general": _resolve_meeting_url_general(parent, fallback_meeting_url),
            "manage_link": _resolve_manage_link(parent),
            "tenant_brand_name": tenant_brand_name,
            "coach_blurb": coach_blurb,
            "locale": parent.locale,
        },
    )
    if dry_run:
        log.info(
            "dry-run | parent=%s locale=%s sessions=%d subject=%r",
            parent.email,
            parent.locale,
            len(parent.sessions),
            rendered.subject,
        )
        log.info("dry-run | sessions_text:\n%s", sessions_text)
        return {
            "status": "dry_run",
            "email": parent.email,
            "sessions_count": len(parent.sessions),
            "subject": rendered.subject,
        }

    delivery_status = "queued"
    provider = "unconfigured"
    warnings: list[str] = []
    smtp_ok = email_service.smtp_configured()
    if smtp_ok:
        try:
            await email_service.send_email(
                to=[parent.email],
                cc=cc_emails,
                subject=rendered.subject,
                text=rendered.text,
                html=rendered.html,
            )
            delivery_status = "sent"
            provider = "smtp"
        except Exception as exc:  # noqa: BLE001
            warnings.append(f"email_send_failed:{exc}")
            log.warning("email send failed for %s: %s", parent.email, exc)
    else:
        warnings.append("smtp_unconfigured")

    email_result = await orchestrate_lifecycle_email(
        session,
        tenant_id=tenant_id,
        template_key="bookedai_monthly_schedule_reminder",
        subject=rendered.subject,
        provider=provider,
        delivery_status=delivery_status,
        contact_id=parent.contact_id,
        event_payload={
            "channel": "email",
            "campaign": "monthly_schedule_reminder",
            "month_label": month_label,
            "sessions_count": len(parent.sessions),
            "auto_cc": cc_emails,
        },
    )
    return {
        "status": delivery_status,
        "email": parent.email,
        "sessions_count": len(parent.sessions),
        "warnings": warnings + (email_result.warning_codes or []),
        "message_id": email_result.message_id,
    }


def _resolve_cc_emails(settings_json: dict[str, Any]) -> list[str]:
    raw = settings_json.get("cc_emails") if isinstance(settings_json, dict) else None
    if isinstance(raw, list):
        return [str(item).strip() for item in raw if str(item or "").strip()]
    return ["chess@bookedai.au"]


def _resolve_tenant_brand_name(profile: dict[str, Any], settings_json: dict[str, Any]) -> str:
    candidate = (
        (settings_json or {}).get("tenant_brand_name")
        or (settings_json or {}).get("brand_name")
        or profile.get("name")
    )
    return str(candidate or _DEFAULT_TENANT_BRAND_NAME).strip() or _DEFAULT_TENANT_BRAND_NAME


def _resolve_coach_blurb(settings_json: dict[str, Any], locale: str) -> str:
    raw = (settings_json or {}).get("coach_blurb")
    if isinstance(raw, dict):
        return str(raw.get(locale) or raw.get("en") or "").strip()
    if isinstance(raw, str):
        return raw.strip()
    return ""


async def run(
    *,
    tenant_slug: str,
    month_arg: str | None,
    dry_run: bool,
) -> int:
    settings = get_settings()
    engine = create_engine(settings.database_url)
    session_factory = create_session_factory(engine)
    email_service = EmailService(settings)

    window_start, window_end, en_label, vi_label = _resolve_target_month(month_arg)
    log.info(
        "monthly reminder | tenant=%s window=[%s, %s) en_label=%s vi_label=%s dry_run=%s",
        tenant_slug,
        window_start.isoformat(),
        window_end.isoformat(),
        en_label,
        vi_label,
        dry_run,
    )

    summary = {"sent": 0, "skipped": 0, "failed": 0, "dry_run": 0, "skipped_idempotent": False}

    async with get_session(session_factory) as session:
        tenant_profile = await _resolve_chess_tenant(session, tenant_slug)
        if not tenant_profile:
            log.error("tenant slug %s not found — aborting", tenant_slug)
            return 2
        tenant_id = tenant_profile["id"]
        settings_json = await _fetch_tenant_settings(session, tenant_id)

        # Idempotency — skip if a non-dry run completed within the last 24h.
        last_run_raw = (settings_json or {}).get(_LAST_RUN_KEY)
        last_run_dt: datetime | None = None
        if last_run_raw:
            try:
                last_run_dt = datetime.fromisoformat(str(last_run_raw))
                if last_run_dt.tzinfo is None:
                    last_run_dt = last_run_dt.replace(tzinfo=timezone.utc)
            except ValueError:
                last_run_dt = None
        now_utc = datetime.now(timezone.utc)
        if not dry_run and last_run_dt and (now_utc - last_run_dt) < timedelta(hours=_RERUN_THRESHOLD_HOURS):
            log.info(
                "skipping — last run was %s (< %dh ago)",
                last_run_dt.isoformat(),
                _RERUN_THRESHOLD_HOURS,
            )
            summary["skipped_idempotent"] = True
            log.info("summary: %s", summary)
            return 0

        rows = await _fetch_upcoming_sessions(
            session,
            tenant_id=tenant_id,
            window_start=window_start,
            window_end=window_end,
        )
        log.info("upcoming session rows fetched: %d", len(rows))

        tenant_default_locale = _resolve_locale(tenant_profile.get("locale"))
        parents = _group_by_parent(rows, tenant_default_locale=tenant_default_locale)
        log.info("parents with at least 1 session: %d", len(parents))

        if not parents:
            log.info("no enrolled parents — exiting cleanly with empty summary")
            log.info("summary: %s", summary)
            if not dry_run:
                await _persist_last_run(session, tenant_id, ran_at=now_utc)
                await session.commit()
            return 0

        cc_emails = _resolve_cc_emails(settings_json)
        tenant_brand_name = _resolve_tenant_brand_name(tenant_profile, settings_json)
        fallback_meeting_url = str(
            (settings_json or {}).get("default_meeting_url") or _DEFAULT_FALLBACK_MEETING_URL
        ).strip()

        for parent in parents:
            coach_blurb = _resolve_coach_blurb(settings_json, parent.locale)
            outcome = await _dispatch_for_parent(
                session=session,
                settings=settings,
                email_service=email_service,
                tenant_id=tenant_id,
                parent=parent,
                month_label_en=en_label,
                month_label_vi=vi_label,
                tenant_brand_name=tenant_brand_name,
                fallback_meeting_url=fallback_meeting_url,
                coach_blurb=coach_blurb,
                cc_emails=cc_emails,
                dry_run=dry_run,
            )
            status = outcome.get("status")
            if status == "sent":
                summary["sent"] += 1
            elif status == "dry_run":
                summary["dry_run"] += 1
            elif status == "skipped":
                summary["skipped"] += 1
            else:
                summary["failed"] += 1
            log.info("dispatch | %s", outcome)

        if not dry_run:
            await _persist_last_run(session, tenant_id, ran_at=now_utc)
            await session.commit()

    log.info("summary: %s", summary)
    return 0 if summary["failed"] == 0 else 1


def parse_args(argv: list[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Chess monthly schedule reminder dispatcher.")
    parser.add_argument(
        "--tenant-slug",
        default=_DEFAULT_TENANT_SLUG,
        help="Tenant slug to scope the reminder to (default: co-mai-hung-chess-class)",
    )
    parser.add_argument(
        "--month",
        default=None,
        help="Override the target month in YYYY-MM (default: next calendar month).",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Compute + log the dispatch plan without sending any emails.",
    )
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(list(argv if argv is not None else sys.argv[1:]))
    return asyncio.run(
        run(
            tenant_slug=args.tenant_slug,
            month_arg=args.month,
            dry_run=args.dry_run,
        )
    )


if __name__ == "__main__":
    sys.exit(main())
