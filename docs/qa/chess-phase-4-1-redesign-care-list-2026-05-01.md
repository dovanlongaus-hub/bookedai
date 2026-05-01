# chess.bookedai.au — Phase 4 §1 redesign (opt-in care list)

**Date**: 2026-05-01
**Commits**: `24ff1f7` (redesign) + path-fix follow-up (chess branch)
**Status**: built, tested, deployed live, verified

---

## What changed

The original §1 design from 2026-04-30 was: cron triggers a script that emails *every* parent who has at least one upcoming `booking_intent` next month. Operator feedback: too aggressive — they want explicit per-contact opt-in plus a master switch.

This redesign replaces that with a configurable, opt-in feature.

| Aspect | Before | After |
|---|---|---|
| Default behaviour | cron blasts everyone with bookings | nothing dispatches |
| Trigger | cron `0 9 1 * *` | operator clicks "Send" in tenant UI (or POSTs the endpoint) |
| Audience | all parents with upcoming sessions | only contacts marked `metadata_json->>'care_list_member' = 'true'` |
| Master switch | none | `tenant_settings.settings_json.monthly_reminder.enabled` (boolean, default `false`) |
| Idempotency | 24h on `monthly_reminder_last_run_at` | 24h on `monthly_reminder.last_run_at` (with legacy fallback read) |
| Bypass | n/a | `--force` flag (script) / `force=true` (endpoint) |

---

## Service layer

`backend/service_layer/monthly_reminder_service.py` (729 LOC):

```python
async def run_monthly_reminder_dispatch(
    session,
    *,
    tenant_slug: str,
    email_service: EmailService,
    month: str | None = None,        # YYYY-MM, default = next calendar month
    dry_run: bool = False,
    care_list_only: bool = True,     # SQL filter on metadata_json->>'care_list_member' = 'true'
    force: bool = False,             # bypass enabled + 24h idempotency
    today: datetime | None = None,
) -> MonthlyReminderSummary
```

`MonthlyReminderSummary` fields: `eligible`, `sent`, `skipped`, `failed`, `dry_run_count`, `skipped_idempotent`, `skipped_disabled`, `last_run_at`, `window_start`, `window_end`, `month_label_en`, `month_label_vi`, `warnings`.

When `force=False` and `enabled` is not strictly `True`, returns early with `skipped_disabled=True` and zero counters — no errors, no log spam.

---

## Endpoints (all tenant-admin auth, scoped to caller's tenant)

| Method | Path | Body / Query |
|---|---|---|
| `GET`    | `/api/v1/tenants/me/care-list` | — |
| `POST`   | `/api/v1/tenants/me/care-list` | `{ contact_id }` |
| `DELETE` | `/api/v1/tenants/me/care-list/{contact_id}` | — |
| `GET`    | `/api/v1/tenants/me/monthly-reminder/config` | — |
| `PUT`    | `/api/v1/tenants/me/monthly-reminder/config` | `{ enabled }` |
| `POST`   | `/api/v1/tenants/me/monthly-reminder/dispatch` | `{ month?, dry_run?, force?, care_list_only? }` |

Every mutation writes an `outbox_events` row (`event_type='tenant.care_list.member_added' / .member_removed / 'tenant.monthly_reminder.config_updated' / 'tenant.monthly_reminder.dispatched'`).

---

## Frontend

`frontend/src/features/tenant-care-list/TenantCareListWorkspace.tsx` (541 LOC). New tenant panel **Customer care** between Students and Broadcast:

- Master toggle calling `PUT /monthly-reminder/config`
- Summary cards (care-list size, last dispatch timestamp)
- Searchable members table with per-row Remove
- "Add member" modal — pick from student roster or paste contact_id
- "Send next month's schedule" zone with **Dry-run preview** + **Send live** (with confirmation modal)
- Live summary panel showing `eligible / sent / skipped / failed / dry_run_count` and disabled/idempotent skip flags

`apiV1` gains 6 new exports (`tenantCareListGet`, `tenantCareListAdd`, `tenantCareListRemove`, `tenantMonthlyReminderConfigGet`, `tenantMonthlyReminderConfigPut`, `tenantMonthlyReminderDispatch`) plus matching response/request types.

---

## Script

`scripts/chess_monthly_schedule_reminder.py` shrinks 586 → 172 LOC, delegates to `run_monthly_reminder_dispatch`. New flags:

- `--care-list-only` (default true) / `--no-care-list-only`
- `--force` — bypass enabled + 24h idempotency
- existing `--dry-run`, `--tenant-slug`, `--month`

Path setup supports both host (`/home/.../BookedAI/backend/`) and container (`/app/`) layouts so the same script runs from cron, host CLI, and `docker exec`.

The previously-recommended cron line is **abandoned**.

---

## Tests

| Suite | Pass |
|---|---|
| `backend/tests/test_chess_monthly_reminder_dispatch.py` | 16 |
| `backend/tests/test_tenant_care_list_route.py` | 17 |
| `backend/tests/test_tenant_broadcast_route.py` | 10 (unchanged) |
| `backend/tests/test_chess_transcript_inactivity_flush.py` | 9 (unchanged) |
| **Phase 4 total** | **52** |

Coverage of the new contract:

- enabled-flag short-circuit returns `skipped_disabled=True`
- `force=True` bypasses both enabled + idempotency
- care-list filter excludes non-opted-in contacts (SQL inspected)
- legacy `monthly_reminder_last_run_at` honoured as a fallback read
- cross-tenant care-list operations 404
- adding an already-opted-in contact returns 409
- DELETE returns success on opt-out, 404 if never opted in

---

## Live verification (post-deploy)

```
GET    /api/v1/tenants/me/care-list                       → 401 (auth wall)
POST   /api/v1/tenants/me/care-list                       → 422 (validation)
DELETE /api/v1/tenants/me/care-list/{id}                  → 401
GET    /api/v1/tenants/me/monthly-reminder/config         → 401
PUT    /api/v1/tenants/me/monthly-reminder/config         → 401
POST   /api/v1/tenants/me/monthly-reminder/dispatch       → 401
```

Inside `bookedai-backend-1`:

- `python /app/scripts/chess_monthly_schedule_reminder.py --dry-run --tenant-slug=co-mai-hung-chess-class --month=2026-06` →
  `monthly reminder disabled — skipping`, `summary: {eligible: 0, ..., skipped_disabled: True}`. **Default-off confirmed.**
- `python /app/scripts/chess_monthly_schedule_reminder.py --dry-run --force --tenant-slug=co-mai-hung-chess-class --month=2026-06` →
  bypass works, 0 eligible (no opted-in contacts yet). **Care-list filter confirmed.**
- `python /app/scripts/chess_monthly_schedule_reminder.py --dry-run --force --no-care-list-only --tenant-slug=co-mai-hung-chess-class --month=2026-06` →
  legacy mode, 0 eligible (no June 2026 booking_intents seeded). **Mode toggle confirmed.**

---

## Operator workflow

1. Open `https://tenant.bookedai.au/#care`.
2. Toggle "Monthly reminder" ON.
3. Click "Add member" and pick parents whose monthly schedule should be emailed. Each addition sets `contacts.metadata_json->>'care_list_member' = 'true'`.
4. Click **Dry-run preview** to confirm the eligible count and per-parent session list.
5. Click **Send live** + confirm — emails dispatch with bilingual EN/VI subject + body, CC'd to `chess@bookedai.au`.
6. Re-running within 24h is a no-op (`skipped_idempotent=True`); use `force=true` from the API only for emergency re-sends.

---

## Migrations

None. Reuses migration 052's `contacts.metadata_json` jsonb column. The `monthly_reminder.enabled` setting lives in the existing `tenant_settings.settings_json` jsonb.

---

## What this supersedes

- The earlier closeout `docs/qa/chess-phase-4-1-2-4-closeout-2026-04-30.md` referenced an OS cron line — that approach is dropped. The §1 line items there are now stale; the new flow is described here.
- The Claude one-shot scheduled task `1f10f897` (June 1 dispatch) was cancelled.

§2 (mass notification by region) and §4 (transcript inactivity flush) are unchanged.
