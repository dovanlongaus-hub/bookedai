# Chess monthly schedule reminder runbook

Phase 4 §1 deliverable. The chess tenant emails every parent with active
upcoming enrolments a "next-30-days schedule" digest on the 1st of each
month at 09:00 UTC.

## What it sends

For each contact with at least one chess slot in the next 30 days:

* Subject EN: `Mai Hưng Chess Academy — your May 2026 schedule`
* Subject VI: `Mai Hưng Chess Academy — lịch học tháng 5/2026`
* Body: greeting + month label + bulleted session list (date, weekday,
  local time, cohort label) + meeting link + manage link + coach
  sign-off
* Locale: Vietnamese (`vi`) when the parent's `booking_intents.metadata_json.locale`
  starts with `vi`, otherwise English (default).
* Auto-CC: `chess@bookedai.au` (resolved from `tenant_settings.settings_json.cc_emails`
  per migration 039; the runbook below documents the fallback).

## Cron line

Production VPS:

```
0 9 1 * * cd /home/dovanlong/BookedAI && /home/dovanlong/BookedAI/.venv-backend/bin/python -m scripts.chess_monthly_schedule_reminder >> /var/log/chess-monthly-reminder.log 2>&1
```

The script is idempotent — it persists `monthly_reminder_last_run_at`
on `tenant_settings.settings_json` and exits early if the last run was
less than 24 hours ago. So an accidental cron double-fire never
double-sends.

## Log file rotation

`/var/log/chess-monthly-reminder.log` should be added to logrotate.
Suggested config (drop into `/etc/logrotate.d/chess-monthly-reminder`):

```
/var/log/chess-monthly-reminder.log {
    monthly
    rotate 12
    compress
    missingok
    notifempty
    copytruncate
}
```

12-month retention covers a full year of audit trails — useful when a
parent asks "did I receive April's reminder".

## Operator commands

Dry-run (compute + log; no emails sent):

```
cd /home/dovanlong/BookedAI
/home/dovanlong/BookedAI/.venv-backend/bin/python -m scripts.chess_monthly_schedule_reminder --dry-run
```

Override the target month (e.g. send June 2026 ahead of schedule):

```
/home/dovanlong/BookedAI/.venv-backend/bin/python -m scripts.chess_monthly_schedule_reminder --month 2026-06
```

Limit to a specific tenant (default is `co-mai-hung-chess-class`):

```
/home/dovanlong/BookedAI/.venv-backend/bin/python -m scripts.chess_monthly_schedule_reminder --tenant-slug another-chess-academy
```

## Idempotency surface

`tenant_settings.settings_json.monthly_reminder_last_run_at` carries an
ISO-8601 UTC timestamp. To force a re-send within the 24-hour guard
window (e.g. after a copy fix), clear that key:

```sql
update tenant_settings
set settings_json = settings_json - 'monthly_reminder_last_run_at'
where tenant_id = (
    select id from tenants where slug = 'co-mai-hung-chess-class'
);
```

`--dry-run` deliberately does not consume the idempotency window — you
can dry-run the same tenant repeatedly without disturbing the next
scheduled production send.

## Where the email is rendered

* `backend/service_layer/communication_service.py:render_bookedai_monthly_schedule_reminder_email`
  is the bilingual (EN+VI) renderer.
* `scripts/chess_monthly_schedule_reminder.py` orchestrates contact
  discovery + per-parent dispatch.
* The lifecycle email send goes through the same SMTP path used by the
  booking-confirmation flow (`EmailService.send_email`), and the
  `orchestrate_lifecycle_email` orchestrator records every dispatch in
  `email_messages` for downstream Zoho CRM sync.

## Failure modes

| Condition | Outcome |
| --- | --- |
| SMTP not configured | Each contact is recorded with `provider="unconfigured"` and `delivery_status="queued"`; no real send. |
| Email send raises | Per-contact error logged; the script continues to the next contact and exits with rc=1 if any failure occurred. |
| Tenant has zero enrolments in the window | Script logs `parents with at least 1 session: 0` and exits cleanly with rc=0 after stamping the idempotency timestamp. |
| Tenant slug not found | Script logs and exits with rc=2; cron will retry on the next month. |

## Ops verification

Confirm the last successful run:

```sql
select settings_json -> 'monthly_reminder_last_run_at' as last_run,
       updated_at
from tenant_settings ts
join tenants t on t.id = ts.tenant_id
where t.slug = 'co-mai-hung-chess-class';
```

Tail the log to confirm cron fired:

```
tail -n 50 /var/log/chess-monthly-reminder.log
```
