# chess.bookedai.au — Phase 4 §1 + §2 + §4 closeout

**Date**: 2026-04-30
**Branch**: `feat/future-swim-relaunch-2026-04-30`
**Status**: built, tested, deployed live

---

## What shipped

### §1 Monthly schedule reminder

- New script `scripts/chess_monthly_schedule_reminder.py` — emits one bilingual EN/VI email per parent with at least one upcoming `booking_intent` in the target month. Idempotent via `tenant_settings.settings_json.monthly_reminder_last_run_at` (24h skip).
- Flags: `--dry-run`, `--tenant-slug=<slug>`, `--month=YYYY-MM`.
- New email template `bookedai_monthly_schedule_reminder` in `backend/service_layer/communication_service.py` — text + HTML, EN + VI subjects: `"{tenant_brand_name} — your {month_label} schedule"` / `"{tenant_brand_name} — lịch học tháng {month_label}"`.
- Cron line (recommended; not yet installed):
  ```
  0 9 1 * * cd /home/dovanlong/BookedAI && /home/dovanlong/BookedAI/.venv-backend/bin/python -m scripts.chess_monthly_schedule_reminder >> /var/log/chess-monthly-reminder.log 2>&1
  ```

### §2 Mass notification by region

- New endpoints (tenant-admin auth, scoped to caller's tenant):
  - `POST /api/v1/tenants/me/broadcast` — body: `{ audience: { type: 'all'|'region'|'student', region?, student_contact_id? }, channel: 'email'|'whatsapp'|'telegram', subject, body, locale }`
  - `GET  /api/v1/tenants/me/broadcast/audience-preview?type=...&region=...` — returns audience size + first 25 contact previews.
- Rate-limit: 1 broadcast per tenant per hour (`tenant_settings.settings_json.last_broadcast_at`).
- Audit: every dispatch logs an `outbox_events` row with `event_type='tenant.broadcast.dispatched'`.
- Hard-cap 5,000 audience rows per broadcast.
- Audience filter `type='region'` matches `contacts.metadata_json->>'region'`.
- New migration `backend/migrations/sql/052_contacts_metadata_region.sql` — adds nullable `metadata_json` jsonb column + composite index `(tenant_id, metadata_json->>'region')`. Applied to live DB this run.
- New tenant UI: panel **Broadcast** between Students and Operations (`frontend/src/features/tenant-broadcast/TenantBroadcastWorkspace.tsx`). Audience cards (All / Region / Student), region datalist, student autocomplete, channel toggles, subject + markdown body composer, locale toggle, send-confirmation modal, recent-broadcasts list.

### §4 Cross-channel transcript inactivity flush

- Extends `backend/service_layer/zoho_crm_transcript_sync.py` with:
  - `IdleConversation` dataclass
  - `find_idle_conversations(session, *, web_idle_minutes=30, whatsapp_idle_minutes=240, lookback_hours=24)` — scans `conversation_events` for sessions whose latest event is past the channel-specific idle threshold and which haven't been flushed.
  - `flush_idle_session(session, settings, tenant_credentials, *, contact_id, channel, since)` — builds transcript, syncs to Zoho CRM as a Task, marks `tenant_settings.settings_json.last_transcript_flush_at[channel:contact_id]` to prevent duplicate flushes.
- New script `scripts/chess_transcript_inactivity_flush.py` — wraps the above. Flags: `--dry-run`, `--tenant-slug=<slug>`, `--web-idle=30`, `--whatsapp-idle=240`, `--lookback=24`.
- Cron line (recommended; not yet installed):
  ```
  */15 * * * * cd /home/dovanlong/BookedAI && /home/dovanlong/BookedAI/.venv-backend/bin/python -m scripts.chess_transcript_inactivity_flush --tenant-slug=chess >> /var/log/chess-inactivity-flush.log 2>&1
  ```

---

## Tests

| Suite | Tests | Status |
|---|---|---|
| `backend/tests/test_chess_monthly_reminder_dispatch.py` | 8 | pass |
| `backend/tests/test_chess_transcript_inactivity_flush.py` | 9 | pass |
| `backend/tests/test_tenant_broadcast_route.py` | 10 | pass |
| **Phase 4 total** | **27** | **pass** |

---

## Deploy verification

- Migration 052 applied to live DB (`contacts.metadata_json` jsonb + index).
- `POST /api/v1/tenants/me/broadcast` → 422 unauthenticated (Pydantic body required) — endpoint reachable.
- `GET /api/v1/tenants/me/broadcast/audience-preview` → 401 — auth wall in place.
- Tenant portal renders **Broadcast** panel between Students and Operations.
- Both new scripts present inside the backend container at `/app/scripts/` (mounted via `docker-compose.prod.yml` volume `./scripts:/app/scripts:ro`).
- Live dry-run verification (2026-05-01 inside `bookedai-backend-1`):
  - `python -m scripts.chess_monthly_schedule_reminder --dry-run --tenant-slug=co-mai-hung-chess-class --month=2026-05` → `{'sent': 0, 'skipped': 0, 'failed': 0, 'dry_run': 0, 'skipped_idempotent': False}` (no May 2026 booking_intents seeded yet — clean exit).
  - `python -m scripts.chess_transcript_inactivity_flush --dry-run --tenant-slug=co-mai-hung-chess-class` → 2 idle conversations detected (1 web pricing + 1 telegram session, 13 messages total) — would have synced to Zoho CRM in non-dry-run mode.

---

## Operator follow-ups

1. Backfill `contacts.metadata_json->>'region'` for existing chess parents (HCMC / Hanoi / Sydney / International). Until then, "All" works but "Region" returns empty audiences.
2. Install the two cron lines on the prod host once operator approves cadence.
3. Run a real monthly-reminder dispatch (without `--dry-run`) on the 1st of next month and confirm parents receive the schedule.
4. Watch `outbox_events` after the first live broadcast to confirm dispatch + audit row.

---

## Deferred (still on the Phase 4 design-spec backlog)

- §3 WhatsApp class display + booking — 3-4 days, depends on WhatsApp Business API readiness.
- §5 Voice chat polish (intent classification, multilingual switch) — 1 day frontend.
