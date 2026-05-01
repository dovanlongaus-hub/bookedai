# Chess Conversation Transcript Zoho Sync

## What it does

When a parent confirms a chess booking on `chess.bookedai.au` (or any
tenant that has Zoho CRM connected), BookedAI now snapshots every
web-chat / WhatsApp / Telegram message exchanged with that contact in
the past 24 hours and pushes the rendered transcript into Zoho CRM as a
single Task attached to the synced Contact. Operators get a one-click
"what did the parent ask, what did the bot reply" reference inside the
contact timeline without having to round-trip through the BookedAI admin
console.

## When transcripts are flushed

The trigger for this round is **booking-intent creation**. As soon as
`POST /api/v1/booking/intent` succeeds and the existing `lead`,
`contact`, and `deal` Zoho sync calls complete, the booking handler also
calls
`service_layer.zoho_crm_transcript_sync.push_transcript_to_zoho_task_with_overrides`.

Inactivity-based rolling flushes (30 minutes for web chat, 4 hours for
WhatsApp) are now wired via
`scripts/chess_transcript_inactivity_flush.py` (see "Inactivity-based
rolling flush" section below). The "operator marks session closed"
verb remains future work.

## Where the Task lands in Zoho

- **Module**: Zoho CRM Tasks (the tenant's configured
  `default_task_module`, falls back to `Tasks`).
- **Linked record**: the contact's `Who_Id` is set to the contact
  record id, so the Task appears in the Contact > Open Activities >
  Closed timeline.
- **Subject prefix**: `Chess booking transcript — {booking_reference}`
- **Status**: `Completed` (the row is a record-of-conversation, not an
  action item, so we don't want it cluttering the open-task pipeline).
- **Due_Date**: set to today.
- **Priority**: `Low`.
- **Description**: full rendered transcript, line per event with
  timestamp + actor + channel + content. Example:

```
Customer: Riley
Booking reference: BK-1001

[2026-04-29 12:34:56] parent (web): Hi, my child is 8 and beginner.
[2026-04-29 12:35:12] bot (web): Welcome! WGM Mai Hưng's beginner cohort runs Tue/Fri 17:30.
[2026-04-29 12:36:00] parent (whatsapp): Can we lock in Friday?
[2026-04-29 12:36:30] bot (whatsapp): Slot reserved. Confirm contact details.
[2026-04-29 12:37:10] bot (telegram): See you Friday at 17:30!
```

## Idempotency

`booking_intents.metadata_json.transcript_task_synced = true` is stamped
the moment Zoho confirms the Task. Re-runs of the same booking flow
short-circuit on that flag and skip the Zoho push, so retries (e.g.
duplicate webhook deliveries, network-error replays) cannot create
duplicate transcript Tasks on the contact.

The audit dictionary `metadata_json.transcript_task` carries the Zoho
task id, line count, and synced-at timestamp for downstream reconciliation.

## SQL for ops

List bookings whose transcript has been synced to Zoho:

```sql
select
  booking_reference,
  metadata_json -> 'transcript_task' as transcript_task,
  created_at
from booking_intents
where metadata_json ->> 'transcript_task_synced' = 'true'
order by created_at desc
limit 100;
```

Fetch the full transcript content from the local ledger for one contact:

```sql
select
  created_at,
  source,
  event_type,
  sender_email,
  conversation_id,
  message_text,
  ai_reply
from conversation_events
where (
  sender_email = 'parent@example.com'
  or conversation_id = '+61400111222'
)
  and created_at >= now() - interval '24 hours'
order by created_at asc;
```

Find bookings that were eligible but did NOT sync (so ops can chase
manual reviews):

```sql
select
  booking_reference,
  tenant_id,
  status,
  created_at
from booking_intents
where metadata_json ->> 'transcript_task_synced' is distinct from 'true'
  and status = 'captured'
  and created_at >= now() - interval '7 days'
order by created_at desc;
```

## Failure modes

The booking flow MUST keep working even when Zoho is unreachable. The
helper handles every failure mode by returning a structured
`TranscriptSyncResult` and never raising:

| Condition | `sync_status` | `warning_codes` |
| --- | --- | --- |
| No Zoho credentials configured (platform OR tenant) | `skipped` | `provider_unconfigured` |
| Contact not yet synced to Zoho (no external id) | `skipped` | `contact_not_synced` |
| Transcript empty (no `conversation_events` in window) | `skipped` | `empty_transcript` |
| Booking already had transcript synced | `skipped` | `already_synced` |
| Zoho returns HTTP 4xx/5xx or times out | `manual_review_required` | `provider_error` |
| Unexpected exception in the helper | `manual_review_required` | `unhandled_exception` |

The result is surfaced on the booking response under
`crm_sync.transcript_task.{sync_status, external_entity_id, line_count, warning_codes}`
so the frontend can render a "transcript synced" badge alongside the
existing lead/contact/deal/task badges.

## WhatsApp coverage gap (informational)

WhatsApp inbound + outbound messages are already persisted to
`conversation_events` via `service_layer.event_store.store_event`,
called from the WhatsApp webhook handlers in
`backend/api/route_handlers.py` (e.g. `event_type="whatsapp_inbound"`).
That means the transcript builder picks them up automatically — no
extra wiring needed for the booking-confirmation trigger.

What is **not** yet implemented (deferred to a separate work item):

1. **Operator "close session" verb** — no admin UI control yet to
   manually flush a session into Zoho.
2. **Channel-aware boundary detection** — the booking-confirmation
   flush lumps everything into a single 24h transcript per booking; the
   inactivity flush already groups per `(channel, contact_id)` to
   produce per-channel Tasks.

## Inactivity-based rolling flush (Phase 4 §4 — shipped)

The 30-min web / 4-hour WhatsApp inactivity flush is now wired up. A
cron-driven script (`scripts/chess_transcript_inactivity_flush.py`)
runs every 15 minutes and pushes a Zoho Task for every conversation
that has crossed its idle threshold without booking. This complements
the booking-confirmation trigger so prospects who chatted but didn't
book still land in the CRM for coach follow-up.

### Eligibility

`backend/service_layer/zoho_crm_transcript_sync.py:find_idle_conversations`
groups recent `conversation_events` by `(channel, contact_id)` and
returns the rows where `now() - max(created_at) >= idle_threshold`:

| Channel | Default threshold | Override flag |
| --- | --- | --- |
| Web (`public_web`, `embedded_widget`, `chess_chat`, `booking_assistant`) | 30 min | `--web-idle-minutes` |
| WhatsApp | 4 h | `--whatsapp-idle-minutes` |
| Telegram | 4 h (same as WhatsApp) | `--whatsapp-idle-minutes` |

Identity key: `sender_email` for web, normalized phone (`conversation_id`)
for WhatsApp / Telegram.

### Subject + payload shape

```
Subject: Chess inquiry transcript (web) — alpha
Status:  Completed
Priority: Low
Who_Id:  <Zoho Contact id>
Description:
    Channel: web
    Contact key: alpha@example.com
    Customer: Alpha Parent

    [2026-04-30 11:55:00] parent (web): hi
    [2026-04-30 11:56:00] bot (web): welcome
```

### Idempotency

Per-(channel, contact_id) flush timestamps live on
`tenant_settings.settings_json.last_transcript_flush_at["web:alpha@example.com"]`.
A subsequent cron run within the inactivity window
(`inactivity_window_minutes`, defaulting to the same threshold the
channel uses) sees the recent flush and short-circuits with
`already_flushed_recently`. This prevents the cron from re-flushing the
same idle session every 15 minutes for hours on end.

To force-replay a contact's flush after a manual fix, clear that key:

```sql
update tenant_settings
set settings_json =
      jsonb_set(
        settings_json,
        '{last_transcript_flush_at,web:alpha@example.com}',
        'null'::jsonb,
        false
      )
where tenant_id = (
    select id from tenants where slug = 'co-mai-hung-chess-class'
);
```

### Cron line

```
*/15 * * * * cd /home/dovanlong/BookedAI && /home/dovanlong/BookedAI/.venv-backend/bin/python -m scripts.chess_transcript_inactivity_flush >> /var/log/chess-inactivity-flush.log 2>&1
```

Dry-run (compute + log; no Zoho dispatch):

```
/home/dovanlong/BookedAI/.venv-backend/bin/python -m scripts.chess_transcript_inactivity_flush --dry-run
```

### Failure modes

The cron MUST keep running even when Zoho is unreachable. Per-contact
outcome shapes mirror the booking-confirmation flush:

| Condition | `sync_status` | `warning_codes` |
| --- | --- | --- |
| Already flushed within the inactivity window | `skipped` | `already_flushed_recently` |
| No `conversation_events` (transcript empty) | `skipped` | `empty_transcript` |
| Zoho not configured | `skipped` | `provider_unconfigured` |
| Contact has no Zoho external id | `manual_review_required` | `missing_contact_external_id` |
| Zoho HTTP 4xx/5xx or timeout | `manual_review_required` | `provider_error` |

## Files

- `backend/service_layer/zoho_crm_transcript_sync.py` — helper module
  (`build_transcript_summary`, `push_transcript_to_zoho_task`,
  `push_transcript_to_zoho_task_with_overrides`,
  `find_idle_conversations`, `flush_idle_session`).
- `backend/api/v1_booking_handlers.py` — wires the helper into the
  booking-intent confirmation flow after
  `orchestrate_booking_followup_sync`.
- `backend/repositories/booking_intent_repository.py` —
  `is_transcript_task_synced` + `mark_transcript_task_synced` for
  the idempotency flag.
- `backend/tests/test_zoho_crm_transcript_sync.py` — unit tests
  covering the transcript builder, the Zoho push, the empty-transcript
  short-circuit, and the failure-doesn't-raise contract.
