# chess.bookedai.au — Phase 4 deferred design specs

**Date**: 2026-04-29.  
**Status**: design specs for items the user requested but not built this round. Each is scoped to ~1-3 days of build work and dependent on operator decisions / credentials.

---

## §1 Monthly schedule reminder broadcast

**Goal**: every month, send a "next month's class schedule" email to every parent with at least one active enrolment, summarising the dates/times their student is booked into.

### Architecture
- New scheduled job: `scripts/chess_monthly_schedule_reminder.py` (cron: `0 9 1 * *` — 9am UTC on the 1st of every month)
- Query: for each chess tenant contact with at least one upcoming `booking_intent` in the next 30 days, build a personalised summary
- Use existing `apiV1.sendLifecycleEmail` with new template `bookedai_monthly_schedule_reminder`
- Variables: `parent_name`, `student_name`, `month_label` ("May 2026"), `sessions_list` (8 lines max with date/time/cohort), `meeting_url`, `add_calendar_url`
- Auto-CC `chess@bookedai.au` (already wired)

### Template
EN body (text):
```
Hi {parent_name},

May 2026 chess schedule for {student_name}:

  • Tue 6 May, 17:30 ICT — Superkid cohort
  • Fri 9 May, 17:30 ICT — Superkid cohort
  • Tue 13 May, 17:30 ICT — Superkid cohort
  ...

Join link: {meeting_url}
Add to calendar: {add_calendar_url}

— Mai Hưng Chess Academy
```
VI version mirrors with Vietnamese weekday names.

### Implementation steps
1. Add SQL view `chess_active_enrolments_with_upcoming_sessions` joining contacts × booking_intents × chess_course_schedule_slots
2. New `backend/service_layer/communication_service.py` template `bookedai_monthly_schedule_reminder` (text + HTML)
3. New script `scripts/chess_monthly_schedule_reminder.py` (loops contacts, dispatches via apiV1.sendLifecycleEmail)
4. Add to crontab: `0 9 1 * * cd /home/dovanlong/BookedAI && bash scripts/run_monthly_reminders.sh`
5. Idempotency: track `monthly_reminder_sent_at` in `booking_intent.metadata` to avoid duplicate sends within 24h

### Estimated effort
1 day backend + 0.5 day docs/runbook.

---

## §2 Mass notification by region (general + per-student)

**Goal**: tenant operator can broadcast a notification (general info, schedule change, holiday closure) to ALL parents in a chosen region, AND have the option to send a per-student message to one parent.

### Architecture
- New tenant admin UI panel: `frontend/src/apps/tenant/TenantApp.tsx` add "Broadcast" panel
- Backend endpoint: `POST /api/v1/tenants/me/broadcast` (tenant admin auth)
- Body: `{ audience: { type: 'all' | 'region' | 'student', region?: string, student_contact_id?: string }, channel: 'email' | 'whatsapp' | 'telegram' | 'all', subject, body, locale }`
- Backend resolves audience → list of contact_ids → loops dispatch

### Region segmentation
Add `region` field to `contacts.metadata.region` (e.g. "HCMC", "Hanoi", "Sydney", "International"). Coach captures during booking or via a contact-update CSV import.

### Channels
- **Email**: existing `apiV1.sendLifecycleEmail` with template `bookedai_tenant_broadcast`
- **WhatsApp**: existing `services.send_whatsapp_message` with body
- **Telegram**: existing `services.send_telegram_message`
- **All**: parallel dispatch to all 3 if contact has each channel populated

### Per-student override
Same endpoint with `audience: { type: 'student', student_contact_id: 'uuid' }` → single dispatch, identical pipeline, used for "Hi {parent}, your child has new homework" type messages.

### Quota / abuse protection
- Rate limit: max 1 broadcast per tenant per hour (regression-cost guard)
- Confirmation modal: "Send to N recipients?" with preview
- Audit log: every broadcast logged to `outbox_events` for replay/QA

### Implementation steps
1. Backend: `backend/api/v1_tenant_broadcast_handlers.py` + route registration
2. Backend: `services.send_email/whatsapp/telegram` already exists; just orchestrate
3. Frontend: `frontend/src/features/tenant-broadcast/TenantBroadcastWorkspace.tsx`
4. Tenant nav: insert between Students and Operations panels
5. Tests: `backend/tests/test_tenant_broadcast_route.py` (audience resolution, multi-channel dispatch, rate limit)

### Estimated effort
2-3 days (backend + UI + tests).

---

## §3 WhatsApp-channel class display + booking

**Goal**: parent texts BookedAI WhatsApp number `+61455301335` → bot replies with class menu → parent picks via reply text → BookedAI creates booking_intent + sends Zoho meeting link via WhatsApp.

### Architecture
- WhatsApp inbound webhook already wired (per `messaging_automation_service.py`); routes inbound messages to `services.handle_whatsapp_inbound`
- Extend handler to recognise chess intents: "lớp cờ vua", "chess class", "đăng ký", etc.
- Route to a state machine similar to web chat:
  1. Greeting → list available classes (8 services with prices)
  2. Parent replies "1" / "Superkid" → bot fetches slots → list 5 nearest
  3. Parent replies "Tue 17:30" → bot creates booking_intent → returns meeting URL + payment options
- Same backend endpoints as web chat (apiV1.chessCatalogSearch / chessCourseSlots / bookings/intents)

### Class display in WhatsApp
WhatsApp templates use plain text + interactive buttons (max 3 buttons per message):
```
🎓 WGM Mai Hưng Chess Classes:

1. Superkid (Tue/Fri 17:30) — A$49/session
2. Advanced (Wed/Sun 20:00) — A$60/session
3. Private 1-on-1 — A$60/session

Reply with the number or class name.
```

### Booking confirmation via WhatsApp
After booking_intent creation:
```
✅ Confirmed: Superkid Tue 6 May 17:30 ICT
📋 Reference: CHESS-1234

🎥 Join: meeting.zoho.com.au/...
📅 Add to calendar: calendar.google.com/...
💳 Pay: portal.bookedai.au/order/CHESS-1234

Reply "MENU" anytime to book another class.
```

### Implementation steps
1. Extend `messaging_automation_service.handle_whatsapp_inbound` with chess intent classifier (regex first; LLM later)
2. Add WhatsApp-specific class menu template
3. Add WhatsApp booking confirmation template
4. Wire same Zoho CRM transcript sync (already pushes `whatsapp` channel events to conversation_events)
5. Tests: `backend/tests/test_whatsapp_chess_booking.py`

### Estimated effort
3-4 days (state machine + templates + tests + WhatsApp Business API account setup if not already complete).

---

## §4 Cross-channel transcript persistence (extend Phase 4B work)

The `zoho_crm_transcript_sync` module shipped this round flushes transcripts on **booking confirmation only**. Extend with:

### Inactivity-based rolling flush
- Background job scans `conversation_events` every 30 min (web) / 4h (WhatsApp) for sessions where last event > inactivity threshold
- Builds transcript + creates Zoho task even without a booking outcome
- Useful for prospects who chatted but didn't book — lets coach follow up

### Operator "close session" verb
- Coach can mark a session closed via tenant portal → triggers immediate flush
- Useful for short conversations that should be archived now, not on next sweep

### Channel-aware boundary detection
- Web chat: session = same `conversation_id` (already in conversation_events)
- WhatsApp: session = same phone number with messages within 4h of each other
- Telegram: same chat_id with 4h gap

### Estimated effort
2 days backend job + 0.5 day tenant UI verb.

---

## §5 Voice chat polish

The voice chat IS live (`SpeechRecognition` + `speechSynthesis`) per the `chess-voice-chat.spec.ts` Playwright test. Phase 4 polish:

### Voice intent classification
Currently voice transcript flows into chat as user message. Add:
- Recognise "yes", "no", "next", "back" as state machine actions
- Recognise "1", "2", "3" as numeric pick (course shortlist, slot list)
- Recognise "skip" (skip phone step)

### Voice TTS for course list
When bot replies with course shortlist, speak only the count + first course name + "and others" (avoid 30s monologue).

### Multilingual voice
Currently voice locale follows page locale. Add ability to switch ("speak Vietnamese" → switches recognition + synthesis to vi-VN).

### Estimated effort
1 day frontend (no backend changes).

---

## §6 Phase 4 build plan summary

| Item | Effort | Priority | Depends on |
|---|---|---|---|
| §1 Monthly schedule reminder | 1 day | High | Cron access on prod host |
| §2 Mass notification by region | 2-3 days | High | None |
| §3 WhatsApp class display + booking | 3-4 days | High | WhatsApp Business API working |
| §4 Cross-channel transcript polish | 2 days | Medium | Phase 4B (shipped) |
| §5 Voice chat polish | 1 day | Low | None |

Total: ~9-11 days for the full Phase 4 build.

---

## §7 What landed this round (recap)

✅ **Voice chat verified live** — `chess-voice-chat.spec.ts` + `chess-chat-qaqc.spec.ts` 3/3 tests pass against production. Speech input flows into chat as user message → searches → selects course.

✅ **Parent portal expansion** — `StudentPortalApp` now shows hero stats (sessions / level / next focus), latest evaluations, level progression timeline, full progress log (collapsed), bilingual EN+VI, mobile-responsive.

✅ **Zoho CRM transcript sync** — every booking confirmation pushes the parent's recent chat transcript (web + WhatsApp combined) to Zoho CRM as a Task on the contact, queryable via `metadata->'transcript_task'` on the booking_intent. WhatsApp coverage verified — inbound/outbound messages already populate `conversation_events`.

✅ **All endpoints live + healthy** — 6/6 surfaces HTTP 200, 47+/47 backend tests pass.

✅ **Deployment** — committed to main `f612d99`, pushed to origin, redeployed live.
