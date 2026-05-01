"""Monthly chess schedule reminder dispatch — operator-triggered, opt-in.

Phase 4 §1 (redesigned 2026-05-01).

Originally the monthly reminder fired from a cron and blasted *every*
parent with an upcoming ``booking_intent`` in the next 30 days. Operator
feedback (2026-05-01) flipped the model: the reminder is now **default-off**
and dispatches only to a curated **care list** of parents that the operator
explicitly opts in via the tenant portal.

The dispatch is no longer cron-driven. It runs when:

* the operator clicks "Send now" in the workspace, which hits
  ``POST /api/v1/tenants/me/monthly-reminder/dispatch``;
* an operator runs ``scripts/chess_monthly_schedule_reminder.py``
  (which now delegates here).

Both paths flow through :func:`run_monthly_reminder_dispatch`, which:

1. Aborts unless the tenant has flipped
   ``tenant_settings.settings_json.monthly_reminder.enabled`` to ``true``
   (unless ``force=True``).
2. Aborts if the same tenant has dispatched within the last
   :data:`_RERUN_THRESHOLD_HOURS` hours (unless ``force=True``).
3. Resolves the audience by joining ``booking_intents`` to opted-in
   ``contacts`` (``metadata_json->>'care_list_member' = 'true'``) when
   ``care_list_only=True``. ``care_list_only=False`` falls back to the
   legacy "all parents with bookings" behaviour for compatibility, but is
   not exposed via any HTTP endpoint.
4. Renders + sends the bilingual EN/VI schedule email per parent using
   the same SMTP + lifecycle-email orchestrator the chess flow uses
   elsewhere.
5. Persists ``monthly_reminder.last_run_at`` under the new namespaced
   key. Reads fall back to the legacy top-level
   ``monthly_reminder_last_run_at`` so existing data survives the rename.
"""

from __future__ import annotations

import json
import logging
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from typing import Any
from urllib.parse import quote
from zoneinfo import ZoneInfo

from sqlalchemy import text  # type: ignore

try:  # pragma: no cover — chess branch ships the proper renderer.
    from service_layer.communication_service import (  # type: ignore
        render_bookedai_monthly_schedule_reminder_email,
    )
except ImportError:  # pragma: no cover — defensive fallback when the chess
    # branch's bilingual renderer is not present on this branch yet. The
    # fallback returns a plain-text + minimal HTML version so dispatch
    # orchestration can be exercised end-to-end in tests + smoke runs even
    # before the chess branch's renderer lands.
    from service_layer.communication_service import RenderedEmailTemplate  # type: ignore

    def render_bookedai_monthly_schedule_reminder_email(  # type: ignore[no-redef]
        *,
        variables: dict[str, str] | None,
        public_app_url: str | None = None,
    ) -> "RenderedEmailTemplate":
        v = dict(variables or {})
        brand = str(v.get("tenant_brand_name") or "BookedAI").strip() or "BookedAI"
        month = str(v.get("month_label") or "this month").strip() or "this month"
        sessions = str(v.get("sessions_text") or "").strip()
        parent = str(v.get("parent_name") or "there").strip() or "there"
        student = str(v.get("student_name") or "your student").strip() or "your student"
        subject = f"{brand} — your {month} schedule"
        text_body = (
            f"Hi {parent},\n\nHere is the {month} schedule for {student}:\n\n"
            f"{sessions or '(no sessions on the calendar)'}\n\n— {brand}"
        )
        html_body = (
            f"<p>Hi {parent},</p><p>Here is the {month} schedule for {student}:</p>"
            f"<pre style=\"font-family:inherit;white-space:pre-wrap;\">{sessions}</pre>"
            f"<p>— {brand}</p>"
        )
        return RenderedEmailTemplate(subject=subject, text=text_body, html=html_body)

from service_layer.email_service import EmailService  # type: ignore
from service_layer.lifecycle_ops_service import orchestrate_lifecycle_email  # type: ignore


_LAST_RUN_KEY_LEGACY = "monthly_reminder_last_run_at"
_NESTED_KEY = "monthly_reminder"
_NESTED_LAST_RUN_KEY = "last_run_at"
_NESTED_ENABLED_KEY = "enabled"
_RERUN_THRESHOLD_HOURS = 24
_DEFAULT_TENANT_BRAND_NAME = "Mai Hưng Chess Academy"
_DEFAULT_FALLBACK_MEETING_URL = ""
_PORTAL_BASE_URL = "https://portal.bookedai.au"


_log = logging.getLogger("bookedai.monthly_reminder")

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


@dataclass
class MonthlyReminderSummary:
    """Summary of one dispatch run, returned to callers (script + HTTP)."""

    eligible: int = 0
    sent: int = 0
    skipped: int = 0
    failed: int = 0
    dry_run_count: int = 0
    skipped_idempotent: bool = False
    skipped_disabled: bool = False
    last_run_at: datetime | None = None
    window_start: datetime | None = None
    window_end: datetime | None = None
    month_label_en: str = ""
    month_label_vi: str = ""
    warnings: list[str] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        return {
            "eligible": self.eligible,
            "sent": self.sent,
            "skipped": self.skipped,
            "failed": self.failed,
            "dry_run_count": self.dry_run_count,
            "skipped_idempotent": self.skipped_idempotent,
            "skipped_disabled": self.skipped_disabled,
            "last_run_at": (
                self.last_run_at.isoformat() if isinstance(self.last_run_at, datetime) else None
            ),
            "window_start": (
                self.window_start.isoformat() if isinstance(self.window_start, datetime) else None
            ),
            "window_end": (
                self.window_end.isoformat() if isinstance(self.window_end, datetime) else None
            ),
            "month_label_en": self.month_label_en,
            "month_label_vi": self.month_label_vi,
            "warnings": list(self.warnings),
        }


# ---------------------------------------------------------------------------
# Helpers: locale, month resolution, formatting
# ---------------------------------------------------------------------------


def _resolve_locale(value: Any | None) -> str:
    raw = str(value or "").strip().lower()
    if raw.startswith("vi"):
        return "vi"
    return "en"


def resolve_target_month(
    month_arg: str | None,
    today: datetime | None = None,
) -> tuple[datetime, datetime, str, str]:
    """Return (window_start_utc, window_end_utc, en_label, vi_label).

    Default: current calendar month + 1. Window is the next 30 days from
    the start of the target month. We pick a 30-day rolling window rather
    than a strict month boundary because the spec defines the cadence as
    "next 30 days" — easier for parents to reason about than calendar
    months when the operator triggers a send.
    """

    today = today or datetime.now(timezone.utc)
    if month_arg:
        year_str, _, month_str = month_arg.strip().partition("-")
        try:
            year = int(year_str)
            month = int(month_str)
        except ValueError as exc:
            raise ValueError(f"month must be in YYYY-MM format: {exc}") from exc
    else:
        if today.month == 12:
            year, month = today.year + 1, 1
        else:
            year, month = today.year, today.month + 1
    window_start = datetime(year, month, 1, tzinfo=timezone.utc)
    window_end = window_start + timedelta(days=30)
    en_label = f"{_EN_MONTHS[month]} {year}"
    vi_label = f"{month}/{year}"
    return window_start, window_end, en_label, vi_label


def _format_session_line(
    *, starts_at: datetime, tz_name: str, cohort_label: str | None, locale: str
) -> str:
    tz = ZoneInfo(tz_name) if tz_name else timezone.utc
    if isinstance(starts_at, datetime):
        local_dt = (
            starts_at.astimezone(tz)
            if starts_at.tzinfo
            else starts_at.replace(tzinfo=timezone.utc).astimezone(tz)
        )
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


# ---------------------------------------------------------------------------
# DB helpers
# ---------------------------------------------------------------------------


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


def _read_last_run_dt(settings_json: dict[str, Any]) -> datetime | None:
    """Read last_run timestamp from the new nested key with legacy fallback."""

    raw: Any = None
    nested = settings_json.get(_NESTED_KEY) if isinstance(settings_json, dict) else None
    if isinstance(nested, dict):
        raw = nested.get(_NESTED_LAST_RUN_KEY)
    if not raw:
        # Legacy top-level key — read once so existing tenants are not
        # bumped back below the 24h floor on the first new-style run.
        raw = settings_json.get(_LAST_RUN_KEY_LEGACY) if isinstance(settings_json, dict) else None
    if not raw:
        return None
    try:
        parsed = datetime.fromisoformat(str(raw).replace("Z", "+00:00"))
    except ValueError:
        return None
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    return parsed


def _read_enabled_flag(settings_json: dict[str, Any]) -> bool:
    nested = settings_json.get(_NESTED_KEY) if isinstance(settings_json, dict) else None
    if isinstance(nested, dict):
        return nested.get(_NESTED_ENABLED_KEY) is True
    return False


async def _persist_last_run(session, tenant_id: str, *, ran_at: datetime) -> None:
    """Persist the last-run timestamp into the nested key.

    We deep-merge the nested ``monthly_reminder`` object so the
    ``enabled`` flag (and any future siblings) are preserved.
    """

    payload = {_NESTED_KEY: {_NESTED_LAST_RUN_KEY: ran_at.isoformat()}}
    await session.execute(
        text(
            """
            insert into tenant_settings (tenant_id, settings_json)
            values (cast(:tenant_id as uuid),
                    cast(:settings_json as jsonb))
            on conflict (tenant_id) do update
            set settings_json = coalesce(tenant_settings.settings_json, '{}'::jsonb)
                                || jsonb_build_object(
                                    :nested_key,
                                    coalesce(
                                        tenant_settings.settings_json -> :nested_key,
                                        '{}'::jsonb
                                    ) || cast(:nested_payload as jsonb)
                                ),
                version = tenant_settings.version + 1,
                updated_at = now()
            """
        ),
        {
            "tenant_id": tenant_id,
            "settings_json": json.dumps(payload),
            "nested_key": _NESTED_KEY,
            "nested_payload": json.dumps({_NESTED_LAST_RUN_KEY: ran_at.isoformat()}),
        },
    )


async def _fetch_upcoming_sessions(
    session,
    *,
    tenant_id: str,
    window_start: datetime,
    window_end: datetime,
    care_list_only: bool,
) -> list[dict[str, Any]]:
    """Return one row per (parent → upcoming chess session) within the window.

    Parents are looked up by ``booking_intents.contact_id → contacts``.
    When ``care_list_only=True`` (the default), we additionally require
    ``contacts.metadata_json->>'care_list_member' = 'true'`` so only
    opted-in parents receive the email.
    """

    care_list_clause = (
        " and (c.metadata_json->>'care_list_member') = 'true'"
        if care_list_only
        else ""
    )
    sql = f"""
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
          {care_list_clause}
        order by lower(c.email), s.starts_at asc
    """
    result = await session.execute(
        text(sql),
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
    lines: list[str] = []
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


# ---------------------------------------------------------------------------
# Per-parent dispatch
# ---------------------------------------------------------------------------


async def _dispatch_for_parent(
    *,
    session,
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
        _log.info(
            "dry-run | parent=%s locale=%s sessions=%d subject=%r",
            parent.email,
            parent.locale,
            len(parent.sessions),
            rendered.subject,
        )
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
            _log.warning("email send failed for %s: %s", parent.email, exc)
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


# ---------------------------------------------------------------------------
# Public entry point
# ---------------------------------------------------------------------------


async def run_monthly_reminder_dispatch(
    session,
    *,
    tenant_slug: str,
    email_service: EmailService,
    month: str | None = None,
    dry_run: bool = False,
    care_list_only: bool = True,
    force: bool = False,
    today: datetime | None = None,
) -> MonthlyReminderSummary:
    """Run a monthly reminder dispatch for ``tenant_slug``.

    Args:
        session: An open async SQLAlchemy session bound to the request /
            CLI lifecycle. Caller commits.
        tenant_slug: Tenant slug to scope the reminder to.
        email_service: An :class:`EmailService` instance — passed in so
            both the HTTP path (``request.app.state.email_service``) and
            the script path (newly constructed) can share the same code.
        month: Optional ``YYYY-MM`` month override. Defaults to the
            calendar month after ``today``.
        dry_run: If True, render + log but never call SMTP / lifecycle.
        care_list_only: If True (default), audience is restricted to
            contacts with ``metadata_json->>'care_list_member' = 'true'``.
            If False, falls back to the legacy "all enrolled parents"
            behaviour — kept for back-compat but not exposed via HTTP.
        force: If True, the per-tenant ``enabled`` flag and the 24h
            idempotency window are both bypassed. Used by the script's
            ``--force`` flag and by the operator's "Force send" button.
        today: Inject for tests; defaults to ``datetime.now(timezone.utc)``.

    Returns:
        A :class:`MonthlyReminderSummary` describing the run outcome.
        Never raises for an "off / throttled" condition — instead returns
        a summary with the appropriate ``skipped_*`` flag set.
    """

    summary = MonthlyReminderSummary()

    window_start, window_end, en_label, vi_label = resolve_target_month(month, today=today)
    summary.window_start = window_start
    summary.window_end = window_end
    summary.month_label_en = en_label
    summary.month_label_vi = vi_label

    tenant_profile = await _resolve_chess_tenant(session, tenant_slug)
    if not tenant_profile:
        summary.warnings.append(f"tenant_not_found:{tenant_slug}")
        _log.error("tenant slug %s not found — aborting", tenant_slug)
        return summary
    tenant_id = tenant_profile["id"]
    settings_json = await _fetch_tenant_settings(session, tenant_id)

    last_run_dt = _read_last_run_dt(settings_json)
    summary.last_run_at = last_run_dt

    enabled = _read_enabled_flag(settings_json)
    if not force and not enabled:
        _log.info(
            "monthly reminder disabled — skipping (tenant=%s force=%s enabled=%s)",
            tenant_slug,
            force,
            enabled,
        )
        summary.skipped_disabled = True
        return summary

    now_utc = (today or datetime.now(timezone.utc))
    if not force and not dry_run and last_run_dt:
        if (now_utc - last_run_dt) < timedelta(hours=_RERUN_THRESHOLD_HOURS):
            _log.info(
                "skipping monthly reminder — last run was %s (< %dh ago)",
                last_run_dt.isoformat(),
                _RERUN_THRESHOLD_HOURS,
            )
            summary.skipped_idempotent = True
            return summary

    rows = await _fetch_upcoming_sessions(
        session,
        tenant_id=tenant_id,
        window_start=window_start,
        window_end=window_end,
        care_list_only=care_list_only,
    )
    tenant_default_locale = _resolve_locale(tenant_profile.get("locale"))
    parents = _group_by_parent(rows, tenant_default_locale=tenant_default_locale)
    summary.eligible = len(parents)

    if not parents:
        _log.info(
            "monthly reminder: 0 eligible parents (tenant=%s window=[%s, %s) care_list_only=%s)",
            tenant_slug,
            window_start.isoformat(),
            window_end.isoformat(),
            care_list_only,
        )
        if not dry_run:
            await _persist_last_run(session, tenant_id, ran_at=now_utc)
            summary.last_run_at = now_utc
        return summary

    cc_emails = _resolve_cc_emails(settings_json)
    tenant_brand_name = _resolve_tenant_brand_name(tenant_profile, settings_json)
    fallback_meeting_url = str(
        (settings_json or {}).get("default_meeting_url") or _DEFAULT_FALLBACK_MEETING_URL
    ).strip()

    for parent in parents:
        coach_blurb = _resolve_coach_blurb(settings_json, parent.locale)
        outcome = await _dispatch_for_parent(
            session=session,
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
            summary.sent += 1
        elif status == "dry_run":
            summary.dry_run_count += 1
        elif status == "skipped":
            summary.skipped += 1
        else:
            summary.failed += 1
        _log.info("monthly reminder dispatch | %s", outcome)

    if not dry_run:
        await _persist_last_run(session, tenant_id, ran_at=now_utc)
        summary.last_run_at = now_utc

    return summary


__all__ = [
    "MonthlyReminderSummary",
    "run_monthly_reminder_dispatch",
    "resolve_target_month",
]
