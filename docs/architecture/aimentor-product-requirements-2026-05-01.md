# AIMentor Product Requirements Document

Date: `2026-05-01`

Document status: `active — phases 1, 2, 3 foundation, 4 shipped; phase 3 deeper in progress`

## 1. Document purpose

This document captures the full product + technical requirements for `aimentor.bookedai.au` — the AI Mentor Doer subdomain of BookedAI — as built out across phases 1 through 4 (PR #26) and Phase 3 deeper (PR #27). It exists as a single source of truth so future contributors do not have to reconstruct decisions from commit history.

Read together with:

- `docs/architecture/bookedai-master-prd.md` — top-level BookedAI PRD
- `docs/architecture/target-platform-architecture.md` — platform-wide architecture
- `docs/architecture/api-tenant-platform-architecture-spec-2026-05-01.md` — API platform spec
- `docs/development/implementation-progress.md` — chronological build log
- `~/.claude/projects/-home-dovanlong-BookedAI/memory/` — pinned project decisions (LLM stack, WhatsApp number, TTS voice)

## 2. Goals and personas

### 2.1 Primary goal

Convert visitors of `aimentor.bookedai.au` into paid AI Programming Mentorship sessions with as little friction as possible. Every information surface (chat, programs catalog, slot picker, account portal, Telegram bot, WhatsApp) must lead the user toward a confirmed booking and then keep them engaged through completion + repeat sessions.

### 2.2 Personas

- **First-time AI learner (mobile, Vietnamese or English)** — wants a clear program description, a fast slot pick, and confirmation. Voice mode preferred for hands-free interaction.
- **Returning student** — books recurring sessions, expects cancel/reschedule self-service.
- **Off-channel customer** — discovers BookedAI via Telegram or WhatsApp; should never need to leave the chat to book unless absolutely necessary.

### 2.3 Non-goals

- Multi-tenant marketplace listing for AIMentor (it is a single tenant under `ai-mentor-doer` slug).
- Synchronous group cohort scheduling beyond what `service_merchant_profiles` already models.

## 3. Functional requirements

### 3.1 Web chat — `aimentor.bookedai.au`

- Chat UI must surface programs visually (cards with image, price, duration, "Book this" CTA) rather than text-only descriptions. Replies must stay concise (≤ 2 sentences per assistant turn).
- Voice mode toggle in the chat header. When on, an inline mic button appears in the composer. The browser `SpeechRecognition` API drives STT; `speechSynthesis` drives TTS.
- TTS voice must be male, calm, teacher-like. Pin priority: `Daniel`, `Aaron`, `David`, `Microsoft David`, `Google * Male`. Do not silently fall back to a female voice — log a warning and use system default if no male voice is available on the device.
- TTS must speak the most recent assistant text message (not just the array tail), de-duplicated by message id via a `useRef`. This was an explicit cleanup fix in commit `f496e3b` after Phase 2.
- Slot picker must be mobile-first: 7-day horizontal date strip, 3-column time grid on viewports ≤ 640 px.
- All booking flow steps must be reachable on a 375×812 mobile viewport without overflow.

### 3.2 Telegram bot

- `/programs` (or the keyword `programs` / `khoá học`) returns an inline keyboard of the top 6 programs from `service_merchant_profiles`.
- Tap a program → inline keyboard of the next 5 open slots.
- Tap a slot → state machine: `collecting_name` → `collecting_email` → `collecting_phone` → `confirming` → booking creation. YES/NO confirmation. 30-minute TTL on stale flows.
- Voice notes are accepted: download via `getFile` → Whisper STT (`whisper-1`) → swap into the message text → continue normal flow. 25 MB cap to match Whisper API.
- Cancel / reschedule via `/cancel` / `/reschedule` or natural-language intent → 2-step YES/NO confirm → call orchestrators that release slot, cancel Zoho Meeting, sync CRM, send email.

### 3.3 WhatsApp bot

- Uses the single approved BookedAI Business number `+61455301335` via the existing `CommunicationService.send_whatsapp` helper. Do **not** register a separate Meta WABA per subdomain.
- WhatsApp interactive buttons cap at 3, so `/programs` on WhatsApp falls back to a deep link to the web. Full WhatsApp interactive list / template parity is deferred until Meta template approval.
- Outside the 24-hour customer-initiated window, retention and re-engagement messages must use approved template messages (HSM). Implementation note recorded; templates not yet submitted.

### 3.4 Booking lifecycle

The booking flow is shared across web, Telegram, and WhatsApp through the same backend repositories and orchestrators.

- **Create** — `booking_intents` row written; Zoho Meeting created via `calls_scheduling.create_zoho_meeting_for_booking`; lifecycle email + bot acknowledgement sent.
- **Cancel** — `POST /api/v1/booking/{ref}/cancel` → `lifecycle_ops_service.orchestrate_booking_cancelled` → release slot, revoke Zoho Meeting, sync CRM Deal stage = `Cancelled`, send `aimentor_cancellation` email + Telegram + WhatsApp touch, enqueue outbox event with idempotency key. Idempotent: a second call returns `status: 'already_cancelled'`.
- **Reschedule** — `PATCH /api/v1/booking/{ref}/reschedule` → `orchestrate_booking_rescheduled` → release old slot, reserve new, update Zoho Meeting time, sync Deal task `Rescheduled`, send `aimentor_reschedule_confirmation` email. Returns `status: 'not_reschedulable'` (HTTP 409) for `cancelled` / `completed` bookings; rejects `new_start_at` ≤ now + 2 h with HTTP 422.
- **Status** — `GET /api/v1/booking/{ref}/status` → returns payment + meeting + cancel + reschedule eligibility flags.
- **Status update** — admin-driven status transitions (`completed`, `no_show`, `refunded`, `in_progress`) call `orchestrate_status_update` → map to Zoho Deal stage (`Closed Won`, `Closed Lost+reason='no_show'`, `Closed Lost+reason='refund'`, `In Progress`); on `completed` send `aimentor_completion_thank_you` email.

### 3.5 Retention cadence

Daily worker (`backend/workers/retention_worker.py`) scans paid / confirmed / completed AIMentor bookings and dispatches messages at fixed days-since-session anchors. Days that are not anchors are skipped (worker is daily; the next anchor day catches the booking).

| Days since session | Cadence key | Purpose |
|---|---|---|
| 1 | `t1d_thank_you` | Thank-you + feedback link |
| 7 | `t7d_check_in` | "How is the project going?" |
| 30 | `t30d_progress` | Promo `MENTOR10` for next session |
| 90 | `t90d_winback` | Friendly nudge + free 15-min check-in offer |

Channel priority per booking: `metadata.last_engaged_channel` if set (Telegram > WhatsApp > Email), else email. Locale: `metadata.customer_locale` else `en`. Opt-out flag: `metadata.retention_opt_out` skips dispatch entirely. Idempotency via outbox key `retention:{cadence}:{booking_reference}`.

### 3.6 Account portal

- Google OAuth + email magic-code login (already shipped pre-Phase-1).
- "Bookings" tab shows the table with Cancel and Reschedule buttons gated on `cancel_eligibility` / `reschedule_eligibility` (defensive `!== false` default until 14-day soak proves the backend always returns the field).
- "Progress" tab (Phase 3 deeper) shows a 6-step booking timeline: Booked → Confirmed → In progress → Completed → Feedback → Next session. States: `done` / `current` / `pending` / `skipped`. Cancelled / refunded bookings show a notice and skip subsequent milestones.

## 4. Technical decisions

### 4.1 LLM stack

- **Primary:** OpenAI 5.4. Env: `OPENAI_API_KEY`, `OPENAI_MODEL` (default `gpt-5.4`), `OPENAI_BASE_URL`.
- **Fallback:** Claude Sonnet via the `taphoaapi` proxy (Vietnamese-friendly OpenAI-compatible gateway). Env: `TAPHOAAPI_API_KEY`, `TAPHOAAPI_MODEL` (default `claude-sonnet-4-6`), `TAPHOAAPI_BASE_URL`.
- Both providers use the official `openai` Python SDK with different `base_url` + `api_key`. Do **not** pull in `anthropic` SDK.
- Fallback triggers: `RateLimitError`, `InternalServerError`, `APIConnectionError`, `APITimeoutError`, empty completion text.
- Implementation: `backend/integrations/ai_models/llm_router.py` — `LLMRouter`, `LLMMessage`, `LLMResponse`, `LLMRouterError`.

### 4.2 Voice — STT and TTS

- **Web TTS:** Browser `speechSynthesis` (free, zero-infra) with male voice pinning. Upgrade path: self-hosted Piper TTS (`rhasspy/piper:latest`, `en_US-ryan-medium` voice) exposed via internal HTTP service when product validates the need for more natural voice.
- **Web STT:** Browser `SpeechRecognition` / `webkitSpeechRecognition`. Firefox falls back to disabled mic with title "Voice not supported".
- **Bot STT:** OpenAI Whisper `whisper-1` (env `WHISPER_MODEL`, `WHISPER_REQUEST_TIMEOUT_SECONDS=30`). Implementation: `backend/integrations/ai_models/whisper_adapter.py`.
- **Bot TTS (deferred):** Piper TTS Docker service (same upgrade as web).
- Privacy: never log the transcript text or message body content.

### 4.3 WhatsApp

- Single Meta-approved Business number `+61455301335`. Already wired in `.env.example` (`WHATSAPP_FROM_NUMBER`, `BOOKEDAI_CUSTOMER_BOOKING_SUPPORT_PHONE`), `backend/config.py`, `CommunicationService.send_whatsapp`.
- Reused across all subdomains. New subdomains do **not** register their own number.
- 24-hour session window: outside it, retention messages need approved template messages (HSM). Currently a TODO in `_RETENTION_BOT_COPY`.

### 4.4 Catalog

- AIMentor programs live in `service_merchant_profiles` (PK `service_id`, FK `tenant_id`). Tenant slug = `ai-mentor-doer`. Top 10 programs seeded via migration `050_aimentor_programs_seed.sql`. `sort_order` and `duration_minutes` stored in the `metadata` jsonb column (table has no dedicated column for either).
- Public read endpoint `GET /api/v1/aimentor/programs` orders by `featured DESC NULLS LAST, metadata->>'sort_order' ASC, name ASC`.
- Frontend AIMentorChat hard-codes a program list as a fallback; long-term it should fetch from the public API.

### 4.5 Authentication for booking lifecycle endpoints

`POST /api/v1/booking/{ref}/cancel`, `PATCH /api/v1/booking/{ref}/reschedule`, `GET /api/v1/booking/{ref}/status` accept three actor types in this resolution order:

1. AIMentor student session (Bearer token from `/api/v1/aimentor/students/...`).
2. Portal access token (query `?token=`, payload field, or `X-Portal-Token` header).
3. Tenant admin (Authorization Bearer via `_resolve_tenant_request_context`).

Anonymous calls return HTTP 401.

## 5. API surface

```
Public catalog
  GET    /api/v1/aimentor/programs

Booking lifecycle (any of the three actor types)
  POST   /api/v1/booking/{ref}/cancel
  PATCH  /api/v1/booking/{ref}/reschedule
  GET    /api/v1/booking/{ref}/status

Student portal
  POST   /api/v1/aimentor/students/google_auth
  GET    /api/v1/aimentor/students/me
  POST   /api/v1/aimentor/students/me/logout
  PATCH  /api/v1/aimentor/students/me/locale
  GET    /api/v1/aimentor/services/{service_id}/slots
  POST   /api/v1/aimentor/slots/{slot_id}/reserve
  POST   /api/v1/aimentor/integrations/zoho/exchange-code
  GET    /api/v1/aimentor/payment-info

Internal worker dispatchers
  (n8n cron drives daily run of retention_worker.run_retention_worker)

Webhooks
  POST   /webhooks/telegram     (handles voice + text)
  POST   /webhooks/whatsapp

Deferred
  POST   /api/v1/aimentor/chat/turn   (LLM-powered free-form replies — built once, wiped by parallel session, re-do pending)
```

## 6. Lifecycle orchestration

All multi-step business operations go through `lifecycle_ops_service` async functions. Each is idempotent via outbox key, defensive (every external call wrapped in try/except → partial-result warning), and emits a single `OutboxRepository.enqueue_event` for downstream consumers.

| Function | Trigger | Side effects |
|---|---|---|
| `orchestrate_booking_cancelled` | cancel API or bot YES | DB status → `cancelled`, slot release, Zoho Meeting cancel, Zoho CRM Deal stage `Cancelled`, email, multi-channel touch, outbox `booking.cancelled` |
| `orchestrate_booking_rescheduled` | reschedule API or bot picker | DB slot reassign, slot release+reserve, Zoho Meeting time update, Zoho CRM task `Rescheduled`, email, multi-channel touch, outbox `booking.rescheduled` |
| `orchestrate_status_update` | admin or completion event | DB status set, Zoho Deal stage map, completion email if `completed`, outbox `booking.status.updated` |
| `orchestrate_retention_touch` | daily retention worker | dispatch via channel-specific path, Zoho follow-up task, outbox `retention.touch.dispatched` |
| `orchestrate_lifecycle_email` (existing pre-Phase-1) | any | dispatch + log |
| `orchestrate_communication_touch` (existing pre-Phase-1) | any | dispatch + log per channel |

## 7. Implementation status

| Area | Status | Reference |
|---|---|---|
| Booking cancel + reschedule end-to-end | ✅ shipped | PR #26 commit `f9ab3a8` |
| Voice mode + 4 reusable components + programs API | ✅ shipped | PR #26 commit `535bab8` |
| LLMRouter + Telegram book direct (inline keyboard) | ✅ shipped | PR #26 commit `15e9671` |
| Retention cadence + status_update lifecycle | ✅ shipped | PR #26 commit `95659ae` |
| TTS bug fix + flag-audit-keep rationale + Phase 3 inventory | ✅ shipped | PR #26 commit `f496e3b` |
| Whisper STT for Telegram voice notes | ✅ shipped | PR #27 commit `08bf553` |
| Progress tab UI in account portal | ✅ shipped | PR #27 commit `08bf553` |
| `POST /api/v1/aimentor/chat/turn` (LLM-powered chat NLU) | ⏳ deferred | wiped by parallel session, re-do pending |
| `ConversationEngine` channel-agnostic refactor | ⏳ deferred | ~5 engineer-days, separate PR |
| Piper TTS Docker service for bot voice replies | ⏳ deferred | infra change |
| WhatsApp full interactive list / template parity | ⏳ blocked | needs Meta template approval |
| AIMentor email templates EN+VI (cancel, reschedule, T1, T7, T30, winback, completion) | ✅ shipped | PR #26 + PR #27 |
| Frontend assets — mentor avatar + 10 program SVG thumbnails | ✅ shipped | PR #26, placeholders only — swap with real photos when available |

## 8. Test coverage

| Test file | Count | Layer |
|---|---|---|
| `backend/tests/test_booking_lifecycle_routes.py` | 9 | Phase 1 routes |
| `backend/tests/test_calls_scheduling.py` | 4 | Phase 1 wrappers |
| `backend/tests/test_lifecycle_ops_service.py` (Phase 1+4 additions) | 8 | orchestrators |
| `backend/tests/test_aimentor_programs_route.py` | 3 | Phase 2 catalog |
| `backend/tests/test_retention_worker.py` | 6 | Phase 4 worker |
| `backend/tests/test_llm_router.py` | 5 | Phase 3 foundation |
| `backend/tests/test_telegram_book_flow.py` | 8 | Phase 3 foundation |
| `backend/tests/test_whisper_adapter.py` | 5 | Phase 3 deeper |
| `backend/tests/test_telegram_voice_handling.py` | 2 | Phase 3 deeper |
| `frontend/tests/aimentor-cancel-reschedule.spec.ts` | 3 | Phase 1 UI |
| `frontend/tests/aimentor-voice-mode.spec.ts` | 3 | Phase 2 UI |
| `frontend/tests/aimentor-progress-tab.spec.ts` | 3 | Phase 3 deeper UI |

Total: **59 tests** specifically for the AIMentor build-out, all passing on `feat/aimentor-phase3-deeper` branch as of 2026-05-01.

## 9. Open issues and risks

- **Parallel-session interference** on the working tree caused a chat/turn endpoint build to be wiped mid-session (files written by an agent disappeared before commit). Mitigation: run only one Claude Code session per repo at a time, or use `git worktree add` to give each session its own tree.
- **`tenant_broadcast_router` linter glitch** — a linter committed an import for `v1_tenant_broadcast_routes.py` that was never tracked. Fix landed in PR #27 by removing the dead import. Watch for recurrence on other branches.
- **AIMentor TTS effect** previously only spoke when `messages[length-1]` was text — fixed in commit `f496e3b` to scan backwards. Behavior is now correct, but watch for regression if message ordering ever changes.
- **`actual_session_end_at` column does not exist** on `booking_intents`. The retention worker computes the session reference time from `requested_date + requested_time` in the booking timezone. Adding the column would let us track the actual end (vs. scheduled) for more accurate retention timing.
- **Outbox idempotency** relies on a UNIQUE constraint on `outbox_events.idempotency_key`. Confirm the constraint exists in the live schema; without it, double-call protection is best-effort only.
- **OpenAI SDK pin** — currently `openai>=1.40` in `backend/requirements.txt`. Bump cautiously since both LLMRouter and WhisperAdapter rely on `AsyncOpenAI` and the audio transcription API shape.

## 10. Cross-references

- BookedAI master PRD: `docs/architecture/bookedai-master-prd.md`
- Implementation progress log: `docs/development/implementation-progress.md`
- Phase 1 PR: https://github.com/dovanlongaus-hub/bookedai/pull/26
- Phase 3 deeper PR: https://github.com/dovanlongaus-hub/bookedai/pull/27
- Memory files (Claude session context): `~/.claude/projects/-home-dovanlong-BookedAI/memory/`
  - `project_aimentor_llm_stack.md`
  - `project_whatsapp_active_number.md`
  - `project_aimentor_tts_voice.md`
- Email templates: `backend/integrations/email_templates/aimentor_*.html`
- LLM router env vars: `.env.example` lines tagged `# AI Mentor LLM router (Phase 3)`
