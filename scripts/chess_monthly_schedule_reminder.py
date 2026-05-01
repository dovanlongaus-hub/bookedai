"""Send a per-parent monthly chess schedule reminder for an upcoming month.

Phase 4 §1 deliverable — redesigned 2026-05-01.

The reminder is now **default-off** + **per-contact opt-in**:

* The dispatch only runs when the tenant has flipped
  ``tenant_settings.settings_json.monthly_reminder.enabled`` to ``true``
  (unless ``--force`` is passed).
* The audience is filtered to contacts whose
  ``metadata_json->>'care_list_member' = 'true'`` (the operator's
  curated "care list"). Pass ``--no-care-list-only`` to fall back to
  the legacy "all enrolled parents" behaviour.

Cron is no longer wired up — the operator triggers the dispatch via
``POST /api/v1/tenants/me/monthly-reminder/dispatch`` (workspace UI) or
by running this script manually. The 24h idempotency window still
guards against accidental double-fires.

Operational notes:

* ``--dry-run`` computes + logs but does not dispatch any emails.
* ``--tenant-slug`` defaults to ``co-mai-hung-chess-class``.
* ``--month YYYY-MM`` overrides the target month. Defaults to the
  calendar month AFTER the current local date.
* ``--no-care-list-only`` (default: care list only) widens the audience
  to all enrolled parents — kept for one-off operator broadcasts; the
  HTTP endpoint never exposes this knob.
* ``--force`` ignores both the ``enabled`` tenant flag and the 24h
  idempotency window. Use with care.
"""

from __future__ import annotations

import argparse
import asyncio
import logging
import os
import sys
from datetime import datetime, timezone

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "backend"))

from config import get_settings  # type: ignore
from db import create_engine, create_session_factory, get_session  # type: ignore
from service_layer.email_service import EmailService  # type: ignore
from service_layer.monthly_reminder_service import (  # type: ignore
    MonthlyReminderSummary,
    run_monthly_reminder_dispatch,
)


_DEFAULT_TENANT_SLUG = "co-mai-hung-chess-class"


logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
log = logging.getLogger("chess_monthly_reminder")


async def run(
    *,
    tenant_slug: str,
    month_arg: str | None,
    dry_run: bool,
    care_list_only: bool,
    force: bool,
) -> int:
    settings = get_settings()
    engine = create_engine(settings.database_url)
    session_factory = create_session_factory(engine)
    email_service = EmailService(settings)

    log.info(
        "monthly reminder | tenant=%s month=%s dry_run=%s care_list_only=%s force=%s",
        tenant_slug,
        month_arg or "<next-month>",
        dry_run,
        care_list_only,
        force,
    )

    async with get_session(session_factory) as session:
        summary: MonthlyReminderSummary = await run_monthly_reminder_dispatch(
            session,
            tenant_slug=tenant_slug,
            email_service=email_service,
            month=month_arg,
            dry_run=dry_run,
            care_list_only=care_list_only,
            force=force,
            today=datetime.now(timezone.utc),
        )
        if not dry_run:
            await session.commit()

    log.info("summary: %s", summary.to_dict())

    if summary.skipped_disabled:
        log.info(
            "monthly reminder is disabled for this tenant — pass --force to override."
        )
    if summary.skipped_idempotent:
        log.info(
            "monthly reminder skipped because last run was within 24h."
        )
    return 0 if summary.failed == 0 else 1


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

    care_list_group = parser.add_mutually_exclusive_group()
    care_list_group.add_argument(
        "--care-list-only",
        dest="care_list_only",
        action="store_true",
        help=(
            "Restrict audience to contacts opted-in via "
            "metadata_json->>'care_list_member'='true' (default)."
        ),
    )
    care_list_group.add_argument(
        "--no-care-list-only",
        dest="care_list_only",
        action="store_false",
        help="Disable the care-list filter; reach all enrolled parents.",
    )
    parser.set_defaults(care_list_only=True)

    parser.add_argument(
        "--force",
        action="store_true",
        help=(
            "Bypass the per-tenant `enabled` flag and the 24h idempotency window. "
            "Use carefully — this WILL send emails to opted-in parents even if the "
            "tenant has not enabled monthly reminders in their settings."
        ),
    )
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(list(argv if argv is not None else sys.argv[1:]))
    return asyncio.run(
        run(
            tenant_slug=args.tenant_slug,
            month_arg=args.month,
            dry_run=args.dry_run,
            care_list_only=args.care_list_only,
            force=args.force,
        )
    )


if __name__ == "__main__":
    sys.exit(main())
