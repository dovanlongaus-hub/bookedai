# Future Swim Sub-Project — Feature Requirements & Status (12)

Date: `2026-05-01`

Owner lane: `Product/PM` (sub-project: `futureswim.bookedai.au`)

Status: `active baseline`

Tenant slug: `future-swim` · Tenant id: `372a0ba4-e7ab-4de1-90a8-9e7787d50157`

## Purpose

Single canonical document for everything the user has asked us to build / has been delivered for the **futureswim.bookedai.au** sub-project across the 2026-04-30 + 2026-05-01 sessions. Each requirement is mapped to a delivery status, the PR / commit that shipped it, the live verification we ran, and any deferred work.

This doc supersedes ad-hoc notes in `memory/` for futureswim scope. When phase work is complete, update the **Status** column inline; do **not** delete rows.

Authority order when in conflict: this doc → [00-README.md](00-README.md) authority chain (`project.md` → `prd.md` → master roadmap).

## Sub-project overview

Future Swim is a Sydney-based learn-to-swim school (`Caringbah`, `Kirrawee`, `St Peters`, `Marrickville`, `Newtown`) onboarded as the **second sub-project** of BookedAI (after `chess.bookedai.au`). It runs on the shared `bookedai-backend` API but renders an isolated frontend with its own design tokens, parent portal, coach ops surface, and CRM sync.

| Layer | Implementation |
|---|---|
| Frontend tokens | `frontend/src/theme/future-swim-tokens.css` |
| Frontend components | `frontend/src/components/future-swim/*` |
| Frontend public app | `frontend/src/apps/public/futureswim/*` + `FutureSwimApp.tsx` + `FutureSwimParentPortalApp.tsx` |
| Backend API prefix | `/api/v1/futureswim/*` |
| Backend handlers | `backend/api/v1_futureswim_*.py` |
| Database tables | `futureswim_parent_users`, `futureswim_student_profiles`, `futureswim_student_progress`, `futureswim_teacher_evaluations`, `futureswim_levels`, `futureswim_timetable`, `futureswim_centres`, `futureswim_coach_users` |
| CRM sync | Zoho CRM via shared OAuth from `info@bookedai.au` master account, disambiguated by `Lead_Source_Detail = 'futureswim'` |
| Auth (parent) | Magic 6-digit email code via `tenant_email_login_codes` (migration 015), HMAC-signed Bearer session token (30-day TTL) |
| Auth (coach) | Bearer token from `futureswim_coach_users.login_token`, scoped by `assigned_centre_codes` JSONB |

## Requirements log — futureswim.bookedai.au (2026-04-30 → 2026-05-01)

Legend: `Live` shipped + verified on prod · `Partial` partially live, gap noted · `Deferred` planned, no code yet.

### Original ask (2026-04-30)

| # | Requirement (verbatim) | Status | PR / commit | Verification | Notes |
|---|---|---|---|---|---|
| 1 | Redesign futureswim.bookedai.au, improving on futureswim.com.au | Live | #22 `bc8aebd` | Live homepage at `https://futureswim.bookedai.au/` renders new tokenised design (4 colour ramps, hero + level grid + centre map) | New `future-swim-tokens.css`; full visual overhaul vs original site |
| 2 | Update courses, prices, schedules into futureswim DB | Live | #22 `bc8aebd`, migration 047 | `select count(*) from futureswim_levels` = 4; `futureswim_timetable` populated for 5 centres × 4 levels | 4 levels: Water Familiarisation, Learn-to-Swim, Stroke Correction, Pre-Squad. Centres: Caringbah, Kirrawee, St Peters, Marrickville, Newtown. Pricing A$30 (most centres) / A$32 (St Peters) per 30-min lesson |
| 3 | Friendly + professional course layout per the prescribed timetable | Live | #22 `bc8aebd` | Live `/courses` route renders timetable cards with day-of-week + time chips per centre | Cards reuse `fs-card` + `fs-chip` tokens; mobile-responsive; copy reviewed by user |
| 4 | Allow direct chat with WhatsApp/Telegram via BookedAI design | Live | #22 `bc8aebd` (homepage CTA), shared `CommunicationService.send_whatsapp` (memory: `+61455301335`) | Homepage "Chat now" CTA opens WhatsApp deeplink to `+61455301335`; Telegram bot wired (shared aimentor channel) | Reuses existing approved WhatsApp business number; no new infra |
| 5 | Separate Futureswim as a sub-project of BookedAI | Live | #22 `bc8aebd` | Independent routing block in `/etc/nginx/conf.d/futureswim.conf`; isolated frontend bundle `FutureSwimApp-*.js`; all DB tables prefixed `futureswim_*` | Pattern mirrors chess sub-project established in wave-15/16 |
| 6 | Design all BookedAI exchange/connection via API | Live | architectural baseline (since wave-15) | All cross-subdomain communication is via `/api/v1/*` REST; no shared frontend state between sub-projects | Shared services: bookings, contacts, CRM, telemetry, communications |
| 7 | New chat interface 'Future Swim Ask' integrated on the new site | Live | #22 `bc8aebd` | Homepage hero embeds `<FutureSwimAsk />` with text + suggested-prompt chips; backed by `/api/v1/futureswim/ask` with branded system prompt | Powered by shared OpenAI 5.4 LLM stack (memory: `project_aimentor_llm_stack`) |

### Added asks (2026-05-01 deeper-features turn)

| # | Requirement (verbatim) | Status | PR / commit | Verification | Notes |
|---|---|---|---|---|---|
| 8 | Voice chat + voice response interactive with chat | Partial | shared aimentor work `08bf553` (Whisper STT + browser TTS) | AIMentor voice mode live; not yet wired into Future Swim Ask UI | Backend Whisper endpoint reusable; need 1 frontend wiring task to add mic button to `<FutureSwimAsk />`. See Deferred → 3.3 |
| 9 | Summarize results + confirm changes | Live (chat) / Deferred (booking confirm) | #22 `bc8aebd` (chat summary), follow-up needed for booking confirm step | Future Swim Ask returns numbered summary turn; booking confirm modal not yet split into "summarise → confirm" | Booking confirm UX deferred to 3.3 |
| 10 | Check booking flow sync end-to-end | Partial | #23 `de0902c` (Zoho activated), #22 (booking_intents writes from chat) | Demo booking from Future Swim Ask creates `booking_intents` row + Zoho Lead with `Lead_Source_Detail='futureswim'`; SMS confirmation goes out | Need 1 manual end-to-end QA pass with real parent. See Deferred → 3.2C |
| 11 | Display classes attractively on chat + WhatsApp | Live (web) / Partial (WhatsApp) | #22 `bc8aebd` (web rich card), shared `CommunicationService` (text-only WhatsApp today) | Web chat renders branded class cards; WhatsApp falls back to plain text + booking link | WhatsApp rich card (image + structured) deferred to 3.3 |
| 12 | Audit full CRM sync into futureswim@bookedai.au Zoho account (later: use info@bookedai.au OAuth) | Live | #23 `de0902c`, migration 049 | `integration_connections` row for tenant `future-swim` with `provider='zoho_crm'` is `active=1`; Zoho leads land in `info@bookedai.au` workspace tagged `Lead_Source_Detail='futureswim'` | Architectural decision: shared OAuth credentials from `info@bookedai.au` master account, disambiguated per-tenant by `Lead_Source_Detail`. No separate Zoho login required |
| 13 | Calendar reminders | Deferred | — | — | Reuse existing `booking_intents.reminder_cadence` + `reminder_next_at` infra (already in schema). Need 1 task to set futureswim default cadence (T-24h + T-2h). See Deferred → 3.3 |
| 14 | Store conversation content for reference (web + WhatsApp) | Live | shared infra `conversation_events` table | All Future Swim Ask web turns + WhatsApp threads land in `conversation_events` with `tenant_id=future-swim` | Read-back UI for parent portal deferred to Phase 4 |
| 15 | Monthly notification | Deferred | — | — | Cron job to send monthly progress digest per parent. Reuse aimentor retention cadence engine (`status_update` lifecycle from `95659ae`). See Deferred → 3.3 |
| 16 | Mass notification to parents by area (general info) | Deferred | — | — | Need admin compose UI scoped by `centre_code` + delivery via `CommunicationService`. See Deferred → 4 |
| 17 | Individual notification per student | Deferred | — | — | Need teacher-initiated message UI in coach ops surface. See Deferred → 4 |
| 18 | Parent login on futureswim with student profile + progress + teacher evaluation + next-step roadmap | Live | #24 `39d446a` (Phase 3.1 portal), #25 `a9df432` (Phase 3.2A magic email-code login), #28 `799baf7` (Phase 3.2B coach write API), this PR (Phase 3.2C bookings in portal) | `/portal` renders parent greeting + student cards + lesson timeline + latest evaluation + next-step roadmap; signed-in parents now also see their last 20 booking_intents | Magic-link auth uses `tenant_email_login_codes` (migration 015) with `auth_intent='futureswim_portal_login'`; 30-day Bearer session |

## PRs shipped today

| PR | Title | One-liner |
|---|---|---|
| #22 | feat(future-swim): brand-led relaunch — 4 levels × 5 centres + Future Swim Ask | Full sub-project relaunch: tokens, homepage, courses page, levels DB, Future Swim Ask chat |
| #23 | feat(future-swim): activate Zoho CRM sync (Phase 1) | Flips `integration_connections.active=1` for futureswim → leads now flow into shared `info@bookedai.au` Zoho workspace tagged `Lead_Source_Detail='futureswim'` |
| #24 | feat(future-swim): parent portal — student profile, progress, evaluation (Phase 3.1) | Demo-mode preview portal at `/portal?key=<token>`; mirrors chess parent portal pattern with parent → many-students relationship |
| #25 | feat(future-swim): magic email-code login for parent portal (Phase 3.2A) | Real parents now sign in via 6-digit email code → HMAC-signed 30-day Bearer session token; preview key still works for marketing |
| #28 | feat(future-swim): coach ops API (Phase 3.2B) | Bearer-auth coach write endpoints for progress + evaluation, scoped by `assigned_centre_codes` JSONB on `futureswim_coach_users` |

## Migrations applied to prod

| Migration | Description |
|---|---|
| 047 | `future_swim_levels_timetable_and_partner_config.sql` — seeds 4 levels × 5 centres + per-centre weekly timetable + partner-config branding |
| 049 | `future_swim_zoho_crm_activate.sql` — sets `integration_connections.active=1` for tenant `future-swim` provider `zoho_crm` |
| 051 | `future_swim_parent_portal_schema_and_seed.sql` — `futureswim_parent_users` + `_student_profiles` + `_student_progress` + `_teacher_evaluations` tables + 1 demo parent + 2 demo students + 6 progress + 2 evaluations |
| 052 | `future_swim_coach_users_and_seed.sql` — `futureswim_coach_users` table with `assigned_centre_codes` JSONB + `login_token` for Bearer auth + 1 demo coach |

## Architecture decisions

- **Sub-project pattern.** Frontend uses `theme/future-swim-tokens.css` + `components/future-swim/` + `apps/public/futureswim/` mirroring the chess pattern from wave-15/16. No shared CSS bleeds across sub-projects.
- **DB isolation.** Tables prefixed `futureswim_*` independent of `chess_*` (per user's explicit ask 2026-04-30 to keep sub-project tables logically separate, even though they share the database).
- **Backend API.** All futureswim endpoints live on the shared `bookedai-backend` FastAPI app under `/api/v1/futureswim/*`. No separate process / container.
- **CRM credentials.** Zoho OAuth credentials are shared across all tenants from the `info@bookedai.au` master account, disambiguated by per-tenant `Lead_Source_Detail` field on the lead record. This avoids per-tenant Zoho approvals and keeps the leads pipeline in one workspace.
- **Parent auth.** Magic email-code login uses the existing `tenant_email_login_codes` infrastructure (migration 015) with `auth_intent='futureswim_portal_login'`. Session tokens are HMAC-signed (HS256) with `FUTURESWIM_PORTAL_AUTH_SECRET` env var (falls back to `session_signing_secret`), 30-day TTL.
- **Coach auth.** Coach Bearer token is sourced from `futureswim_coach_users.login_token`. Authorisation is centre-scoped via the `assigned_centre_codes` JSONB column — a coach can only write progress / evaluations for students at their assigned centres.
- **Bookings linkage (Phase 3.2C).** Parent portal joins `booking_intents` to `contacts` via `bi.contact_id = c.id`, filtered to `c.tenant_id = future-swim` and `lower(c.email) = lower(parent.email)`. No new FK between `futureswim_parent_users` and `contacts` — match is by email.

## Deferred → roadmap

| Item | Phase tag | Effort | Notes |
|---|---|---|---|
| Voice mode wired into Future Swim Ask UI (mic button + browser TTS) | 3.3 | 0.5d FE | Backend Whisper endpoint already shipped via aimentor `08bf553`; just needs FE wiring + voice picker |
| End-to-end booking-flow QA (real parent, real Zoho lead, real SMS) | 3.2C | 0.5d QA | Done in this PR's smoke section; promote to UAT in Phase 3.3 |
| WhatsApp rich-card class display (image + structured buttons) | 3.3 | 1d BE+FE | WhatsApp Cloud API supports interactive messages; needs payload builder + outbound webhook tweak |
| Calendar reminders (T-24h + T-2h) | 3.3 | 0.5d BE | Set futureswim default `reminder_cadence`; reuse existing `reminder_next_at` cron worker |
| Monthly progress digest per parent | 3.3 | 1d BE | Reuse aimentor retention engine (`status_update` lifecycle from `95659ae`); template pulls from `futureswim_student_progress` + `_teacher_evaluations` |
| Booking-confirm "summarise → confirm" UX split | 3.3 | 0.5d FE | Separate the chat-driven booking confirm into a 2-step modal so parents review before commit |
| Mass notification to parents by area | 4 | 2d FE+BE | Admin compose UI scoped by `centre_code`; delivery via shared `CommunicationService` (WhatsApp + email + SMS) |
| Individual notification per student (teacher-initiated) | 4 | 1d FE+BE | Compose surface in coach ops UI; delivers to parent via their preferred channel |
| Conversation read-back UI on parent portal | 4 | 1d FE | Show last N web + WhatsApp turns from `conversation_events` filtered by parent email/phone |
| Public coach ops UI (Phase 3.2B is API-only) | 2B | 1.5d FE | Write a small coach-facing app at `/coach` mirroring the parent portal pattern, gated by Bearer token |

## Changelog

- `2026-05-01` initial publication of `12-FUTURESWIM-FEATURE-REQUIREMENTS-AND-STATUS.md` consolidating 18 user requirements from the 2026-04-30 + 2026-05-01 sessions, mapped to delivery status, PR references, architecture decisions, and the deferred roadmap. Aligns with `00-README.md` index.
