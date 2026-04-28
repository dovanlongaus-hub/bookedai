# BookedAI Implement & Fix Plan — to Go-Live 2026-04-30

Date: `2026-04-27` (Mon) | Days remaining to Go-Live: **3 working days**
Hard milestone: **M-02 GO-LIVE LOCK @ `2026-04-30` (Thu)**
Pre-milestone: **M-01 Chess + Swim Full Demo @ `2026-04-29` (Wed)**

Authority: tài liệu này là action plan cấp Sprint 19 compressed window để hit go-live `2026-04-30`. Mọi fix item đều trace ngược về source doc + có owner + deadline đếm lùi từ `2026-04-30`. Source-of-truth chain: [`04-VISION-TARGET-MILESTONES.md`](04-VISION-TARGET-MILESTONES.md) (M-01/M-02) → [`phases/phase-17-detail.md`](phases/phase-17-detail.md), [`phase-18-detail.md`](phases/phase-18-detail.md), [`phase-19-detail.md`](phases/phase-19-detail.md) → [`05-CHANGE-REQUESTS.md`](05-CHANGE-REQUESTS.md) (CR-002 compression, CR-005 WhatsApp, CR-006 CI).

## 1. Working day countdown

| Day | Date | Window | Focus |
|---|---|---|---|
| `D-3` | `2026-04-27` (Mon) | TODAY | Lock decisions, close fixes, OQ-002 P0 freeze scope decision. **Lock [CR-009](05-CHANGE-REQUESTS.md) / [CR-010](05-CHANGE-REQUESTS.md) / [CR-011](05-CHANGE-REQUESTS.md) / [CR-012](05-CHANGE-REQUESTS.md) today by EOD.** |
| `D-2` | `2026-04-28` (Tue) | full day | Finish all FX items, freeze code at end-of-day |
| `D-1` | `2026-04-29` (Wed) | M-01 | Chess + Swim + AI Mentor 1-1 demo dress rehearsal (3 tenants per [CR-009](05-CHANGE-REQUESTS.md)); record demo video (≤7 min); bundle Playwright artefacts (3 suites) |
| `D-0` | `2026-04-30` (Thu) | M-02 | Release gate run, image promote, production smoke covering all 3 tenants on their primary channel (Telegram for chess + swim, embed for AI Mentor 1-1); closeout post; 4h rollback hold |

## 2. Fix backlog (organized by gate)

### Gate A — Chess + Swim Demo Runnable (must pass by `2026-04-29` EOD)

Source: [phase-17-detail.md](phases/phase-17-detail.md) Deliverables; [phase-18-detail.md](phases/phase-18-detail.md); [phase-19-detail.md](phases/phase-19-detail.md); M-01 success criteria in [04-VISION-TARGET-MILESTONES.md](04-VISION-TARGET-MILESTONES.md).

| ID | Item | Type | Priority | Owner | Deadline | Status | Evidence required |
|---|---|---|---|---|---|---|---|
| `FX-1` | Confirmation hero payment-state badge (Stripe ready / QR transfer / Manual review / Pending) | Bug fix | P0 | TBD — assign before D-2 (Frontend lead candidate) | `2026-04-28` EOD | Open | Screenshot of all 4 badge states + Playwright assertion in confirmation hero |
| `FX-3` | Admin booking responsive card layout `390-720px` (full polish) | Bug fix | P0 | TBD — assign before D-2 (Frontend lead candidate) | `2026-04-28` EOD | Partial close `2026-04-26` (cards layout); needs final polish | Mobile screenshots `390/480/720px` + Playwright admin-bookings-mobile spec |
| `FX-4` | Destructive action confirmation modal (cancel/refund/reschedule) | Bug fix | P0 | TBD — assign before D-2 (Frontend lead candidate) | `2026-04-28` EOD | Open | E2E Playwright test pass + screenshot |
| `P1-2-MIN` | WhatsApp inline action controls minimum brand alignment for go-live demo | Feature | P0 | TBD — assign before D-2 (Backend + Frontend) | `2026-04-29` EOD | Open (full P1-2 scope carries to Sprint 20 per CR-005) | Telegram inline controls work; WhatsApp at minimum text-mode confirm/cancel |
| `CHESS-PROOF` | Chess academy parent status flow proof case end-to-end (search → match → book → pay → portal → care reply) | Feature | P0 | TBD — assign before D-2 (AI + Backend lead) | `2026-04-29` EOD (M-01) | Open (target Sprint 20 originally; pulled forward for M-01) | Live demo recording from Telegram inbound → Confirmed booking → portal reopen → care reply |
| `SWIM-PROOF` | Future Swim booking flow end-to-end (search → match → book → pay → portal → care reply) via WhatsApp Evolution QR-bridge | Feature | P0 | TBD — assign before D-2 (Backend + AI lead) | `2026-04-29` EOD (M-01) | Open | Live demo recording reaching Confirmed + portal + care reply |
| `EVIDENCE-DRAWER` | Operator evidence drawer UI baseline (outbox/audit/job-run/CRM/payment/webhook) — minimum viable for go-live | Feature | P1 | TBD — assign before D-2 (Frontend) | `2026-04-29` EOD (carry to Sprint 20 acceptable per [phase-18-detail.md](phases/phase-18-detail.md)) | Open | Drawer renders for at least one event class; evidence link from ledger row works |
| `PORTAL-SMOKE` | Portal `v1-*` UAT live smoke green (post-deploy) | QA | P0 | TBD — assign before D-2 (QA + Backend) | `2026-04-30` 09:30 (after promote) | P0-1 closed live, needs go-live smoke | Live booking-to-portal reopen smoke pass |
| `AI-MENTOR-PROOF` | AI Mentor 1-1 end-to-end via embed + tenant runtime (`https://ai.longcare.au/`) — embed widget loads, package selection from 10 catalog rows (5 private 1-1 + 5 group mentoring, USD), booking intent capture, payment posture, confirmation copy. Per [CR-009](05-CHANGE-REQUESTS.md). | Feature | P0 | TBD — assign before D-2 (Frontend + Backend lead candidates) | `2026-04-29` EOD (M-01) | Open (tenant seeded `2026-04-21` per migration `013_ai_mentor_tenant_seed.sql`) | Live demo recording from embed (`product.bookedai.au/partner/ai-mentor-pro/embed?embed=1&tenant_ref=ai-mentor-doer`) → Confirmed booking; confirmation copy screenshot |

### Gate B — Channel Readiness — Telegram-Primary (must pass by `2026-04-30` morning)

Per [CR-010](05-CHANGE-REQUESTS.md): **Telegram is the ONLY P0 channel for go-live**. WhatsApp inbound stays online; outbound + iMessage + SMS shift post-go-live to M-09 / M-10 / M-11 in [04-VISION-TARGET-MILESTONES.md](04-VISION-TARGET-MILESTONES.md). Embed channel is P0 for AI Mentor 1-1 per [CR-009](05-CHANGE-REQUESTS.md).

Source: [phase-19-detail.md](phases/phase-19-detail.md); [whatsapp-twilio-default-2026-04-26.md](../../development/whatsapp-twilio-default-2026-04-26.md); [CR-005](05-CHANGE-REQUESTS.md); [CR-009](05-CHANGE-REQUESTS.md); [CR-010](05-CHANGE-REQUESTS.md); [OQ-001](../09-OPEN-QUESTIONS.md).

| ID | Item | Type | Priority | Owner | Deadline | Status | Evidence required |
|---|---|---|---|---|---|---|---|
| `TG-UAT-CHATID` | Provision `BOOKEDAI_CUSTOMER_TELEGRAM_UAT_CHAT_ID` env var for UAT lane | Configuration | P0 | TBD — assign before D-2 (DevOps + Product/PM) | `2026-04-29` 12:00 | Open | Env var set in production; Telegram bot replies in UAT chat |
| `P0-3-VERIFY` | Telegram secret-token + Evolution HMAC verification still live after final deploys | Verification | P0 | TBD — assign before D-2 (Security + Backend) | `2026-04-30` 09:30 | Closed live `2026-04-26`; needs re-verification post-promote | HMAC verification log from production + Playwright webhook signature test |
| `P0-4-VERIFY` | Inbound webhook idempotency (code + indexes migration `022`) verified post-promote | Verification | P0 | TBD — assign before D-2 (Backend + Data) | `2026-04-30` 09:30 | Code/indexes live `2026-04-26`; Telegram UAT chat-id + evidence drawer carried | Idempotency replay test (duplicate webhook dropped) on production |
| `P0-5-VERIFY` | `actor_context.tenant_id` validator returns `403` on cross-tenant request post-promote | Verification | P0 | TBD — assign before D-2 (Security + Backend) | `2026-04-30` 09:30 | Closed live `2026-04-26`; needs re-verification | Live `403` response with `actor_context.tenant_id does not match` |
| `EMBED-CHANNEL-VERIFY` | AI Mentor 1-1 plugin embed channel verified production: loader asset (`/partner-plugins/ai-mentor-pro-widget.js`) cached, CORS valid, `embed=1` query honored on `https://product.bookedai.au/partner/ai-mentor-pro/embed?embed=1&tenant_ref=ai-mentor-doer`. Per [CR-009](05-CHANGE-REQUESTS.md). | Verification | P0 | TBD — assign before D-2 (Frontend + Backend) | `2026-04-30` 09:00 | Partial live verify `2026-04-28`: embed URL `200`, loader `200` with immutable cache, release gate and deploy green; browser catalog/booking proof and target CORS `OPTIONS 204` still open (`OPTIONS` currently returns `405`) | Embed widget loads in headless browser test; loader asset 200; CORS preflight 204; AI Mentor catalog renders |
| `WA-EVOLUTION-LIVE` | Evolution QR-bridge WhatsApp outbound delivery confirmed for at least one tenant | Verification | P1-CARRY | TBD — assign post-go-live (Backend + DevOps) | M-09 (`2026-05-10`) | Provider delivery still blocked; **post-go-live carry per [CR-010](05-CHANGE-REQUESTS.md)** — inbound stays online, outbound research moves to M-09 week of `2026-05-04` | Sent → delivered roundtrip log from Twilio (default) or Meta when verification clears |
| `P1-3-PROMOTE` | WhatsApp webhook test parity live promote (closed locally `2026-04-26`) | Test | P1-CARRY | TBD — assign post-go-live (QA) | M-09 (`2026-05-10`) | Closed locally; live promote **post-go-live carry per [CR-010](05-CHANGE-REQUESTS.md)** | Test runs in `scripts/run_release_gate.sh` lane post-promote of M-09 |

### Gate C — Release Gate (must pass by `2026-04-30` promote)

Source: [phase-23-detail.md](phases/phase-23-detail.md); [CR-006](05-CHANGE-REQUESTS.md); [phase-execution-operating-system-2026-04-26.md](../../development/phase-execution-operating-system-2026-04-26.md).

| ID | Item | Type | Priority | Owner | Deadline | Status | Evidence required |
|---|---|---|---|---|---|---|---|
| `P0-6` | GitHub Actions CI workflow OR manual fallback documented as authoritative for `2026-04-30` | Process | P0 | TBD — assign before D-2 (DevOps + Repo owner) | `2026-04-30` 09:00 | Open (carry per [CR-006](05-CHANGE-REQUESTS.md)); manual `scripts/run_release_gate.sh` is fallback | Documented manual gate procedure + sign-off in closeout post |
| `P0-7-VERIFY` | `.env.production.example` checksum guard runs in release gate | Verification | P0 | TBD — assign before D-2 (DevOps) | `2026-04-30` 09:00 | Closed `2026-04-26` | Checksum verification line in release-gate output |
| `P0-8-VERIFY` | OpenClaw rootless + reduced mounts + break-glass `BOOKEDAI_ENABLE_HOST_SHELL=1` still live | Verification | P0 | TBD — assign before D-2 (DevOps + Security) | `2026-04-30` 09:00 | Closed live `2026-04-26` | `docker exec openclaw-cli id` shows uid `1000`; no `/hostfs` mount; host-shell blocked without break-glass |
| `P1-8-PROMOTE` | PitchDeckApp Playwright coverage live promote | Test | P1 | TBD — assign before D-2 (QA + Frontend) | `2026-04-30` 09:00 | Closed locally `2026-04-26`; live promote pending | Playwright run included in release-gate lane |
| `RELEASE-GATE-FULL` | `RUN_SEARCH_REPLAY_GATE=true bash scripts/run_release_gate.sh` runs end-to-end green | Process | P0 | TBD — assign before D-2 (DevOps + QA) | `2026-04-30` 08:30 | Manual gate proven `2026-04-26` (`52 tests`, `14/14 search eval`); needs final pre-promote run | Full gate output stored in `artifacts/` with timestamp |
| `OQ-002-DECIDE` | P0 feature freeze scope (which P0/P1 are explicitly carried vs must-close) | Decision | P0 | TBD — assign before D-2 (Product/PM + CEO) | `2026-04-28` 18:00 | Open per [OQ-002](../09-OPEN-QUESTIONS.md) | Decision recorded in OQ-002 + mirrored into CR or implementation-progress.md |

### Gate D — Demo Rehearsal (Wed `2026-04-29`)

Source: M-01 success criteria in [04-VISION-TARGET-MILESTONES.md](04-VISION-TARGET-MILESTONES.md) §M-01; [CR-009](05-CHANGE-REQUESTS.md) (3-tenant scope); [CR-010](05-CHANGE-REQUESTS.md) (Telegram-primary).

| Time | Action | Owner | Pass criteria |
|---|---|---|---|
| `09:00` | Chess academy parent end-to-end smoke (Telegram inbound → search → match → book → pay → portal → care reply) | TBD — assign before D-2 (AI + Backend lead) | Reach Confirmed booking + portal reopen + care reply with HMAC verified |
| `11:00` | Future Swim end-to-end smoke via **Telegram (primary per [CR-010](05-CHANGE-REQUESTS.md))**; WhatsApp Evolution QR-bridge optional bonus only if outbound verifies in time | TBD — assign before D-2 (Backend + AI lead) | Reach Confirmed + portal + care reply on Telegram; WhatsApp result logged but not gating |
| `11:30` | **AI Mentor 1-1 end-to-end smoke (NEW per [CR-009](05-CHANGE-REQUESTS.md))** via embed (`product.bookedai.au/partner/ai-mentor-pro/embed?embed=1&tenant_ref=ai-mentor-doer`) + tenant runtime (`https://ai.longcare.au/`) | TBD — assign before D-2 (Frontend + Backend lead) | Embed widget loads; package selection from 10 catalog rows; booking intent capture; payment posture (USD); confirmation copy shown; care follow-up touchpoint queued |
| `13:00` | Admin operator workflow check (booking confirm/cancel/reschedule + ledger filter + Tenant Ops dispatch) | TBD — assign before D-2 (Frontend + Backend) | All actions complete with audit trail visible in ledger |
| `13:30` | Update `roadmap.bookedai.au` + `pitch.bookedai.au` with synced roadmap visuals — verify both SVGs render in production preview, RoadmapApp + PitchDeckApp build clean | TBD — assign before D-2 (Frontend + Product/PM) | Both `/roadmap/pre-golive-2026-04-11-to-04-30.svg` and `/roadmap/master-roadmap-2026-04-11-to-06-07.svg` load HTTP 200; `RoadmapApp` shows synced phases; `PitchDeckApp` shows master roadmap image; build green |
| `14:00` | Demo video recording (**chess + swim + AI Mentor back-to-back, ≤7 min total** per [CR-009](05-CHANGE-REQUESTS.md)) | TBD — assign before D-2 (Product/PM + GTM) | All 3 tenant flows captured; uploaded to shared drive; link in M-01 closeout |
| `16:00` | Playwright artefact bundle (**all 3 tenant suites** per [CR-009](05-CHANGE-REQUESTS.md)) | TBD — assign before D-2 (QA) | Stored in `artifacts/2026-04-29-m01-rehearsal/` with timestamps; chess + swim + ai-mentor suites included |
| `17:00` | M-01 sign-off (go/no-go for M-02 promote) | Product/PM + Engineering lead | Signed in [implementation-progress.md](../../development/implementation-progress.md) |

### Gate E — Promote (Thu `2026-04-30`)

Source: M-02 success criteria in [04-VISION-TARGET-MILESTONES.md](04-VISION-TARGET-MILESTONES.md) §M-02; [phase-execution-operating-system-2026-04-26.md](../../development/phase-execution-operating-system-2026-04-26.md) §Closeout gates.

| Time | Action | Owner | Pass criteria |
|---|---|---|---|
| `08:00` | Final release-gate run (`scripts/run_release_gate.sh` full suite + manual P0-6 fallback note) | TBD — assign before D-2 (DevOps + QA) | All gates green; output stored in `artifacts/2026-04-30-promote/` |
| `08:30` | Pre-promote leadership go/no-go review | Product/PM + CEO + Engineering lead | Decision recorded; if no-go, trigger fallback plan §3 |
| `09:00` | Image promote via `python3 scripts/telegram_workspace_ops.py deploy-live` | TBD — assign before D-2 (DevOps) | Deploy completes; `bash scripts/healthcheck_stack.sh` passes |
| `09:30` | Production smoke per [CR-010](05-CHANGE-REQUESTS.md): **P0** Manager Bot Telegram inbound (chess + swim) + portal reopen + admin login + **embed widget for AI Mentor 1-1** ([CR-009](05-CHANGE-REQUESTS.md)). **P1** WhatsApp inbound smoke (acceptable if it passes; not a gate per [CR-010](05-CHANGE-REQUESTS.md)). Smoke covers all 3 tenants on their primary channel. | TBD — assign before D-2 (QA + Backend) | All 3 tenant booking confirmable; HMAC valid on Telegram; portal reopens with `v1-*` reference; admin same-origin login works; AI Mentor embed loads + completes booking |
| `10:30` | Roadmap site + pitch site final smoke — verify `roadmap.bookedai.au` shows synced phases + `pitch.bookedai.au` shows master roadmap image | TBD — assign before D-2 (Frontend + Product/PM) | `roadmap.bookedai.au` lists Phase 0/5/6/7/8/9/17/18/19/20/20.5/21/22/23 + tenant cases; `pitch.bookedai.au#roadmap-execution` renders master SVG; both pages 200 OK |
| `10:00` | Closeout post (Notion + Discord) via `python3 scripts/telegram_workspace_ops.py sync-doc` | Product/PM | Sign-off recorded; archive entry in `docs/development/telegram-sync/2026-04-30/` |
| `10:00 → 14:00` | Rollback hold (4h post-promote, no scope changes) | DevOps + on-call | No P0 incidents; if incident, trigger rollback per §3 |
| `14:00` | M-02 closeout sign-off | Product/PM + CEO + Engineering lead | Signed in [implementation-progress.md](../../development/implementation-progress.md); CR-001 marked Implemented end-state; Phase 17/18/19 status cards updated |

## 3. Fallback / rollback plan

### If M-01 fails (Wed `2026-04-29` EOD)

- **Trigger**: chess OR swim end-to-end demo cannot reach Confirmed + portal + care reply
- **Action**: open new CR (`CR-DEFER-M02`) to defer M-02 by 1 week to `2026-05-07` (Thu); notify stakeholders by `2026-04-29` 18:00; absorb defer into Sprint 20 weekly slot
- **Owner**: Product/PM + CEO

### If M-02 release gate fails (Thu `2026-04-30` morning, before 09:00)

- **Trigger**: `scripts/run_release_gate.sh` red OR manual P0-6 fallback gate red
- **Action**: hold promote; open 4h remediation window; decide promote-vs-defer by `2026-04-30` 14:00; if defer, trigger same `CR-DEFER-M02` path

### If M-02 promote succeeds but post-promote smoke fails (`2026-04-30` 09:30 → 10:00)

- **Trigger**: production smoke red on portal reopen, HMAC verification, or booking confirm
- **Action**: rollback via `python3 scripts/telegram_workspace_ops.py deploy-live` with previous image tag (manual tag-swap until P1-6 image registry lands); open incident report; post-mortem within 24h

### Rollback procedure

1. Identify previous green image tag (currently manual; see [CR-006](05-CHANGE-REQUESTS.md) carry note for image registry P1-6)
2. Run `python3 scripts/telegram_workspace_ops.py deploy-live --image-tag <prev>`
3. Run `bash scripts/healthcheck_stack.sh` to confirm rollback healthy
4. Run production smoke (Manager Bot Telegram inbound → confirm booking → portal reopen)
5. Document incident in `docs/development/telegram-sync/2026-04-30/incident-<timestamp>.md`
6. Notify stakeholders via `python3 scripts/telegram_workspace_ops.py sync-doc`

Per [docs/pm/03-EXECUTION-PLAN.md §1 Phase Gate](../03-EXECUTION-PLAN.md): closeout requires items 5 (live deploy), 6 (live smoke), and 9 (Notion/Discord). Rollback must restore items 5 + 6 to green before declaring incident contained.

## 4. Owner assignment placeholders

All `Owner` cells above use `TBD — assign before D-2` because the synced docs do not name individual owners for these specific FX/P0 items. RACI lanes are defined at phase level in [docs/pm/04-RACI-MATRIX.md](../04-RACI-MATRIX.md) and [phase-execution-operating-system-2026-04-26.md](../../development/phase-execution-operating-system-2026-04-26.md):

- **Frontend lead** owns FX-1, FX-3, FX-4, FX-5 (closed), FX-7 (closed)
- **Backend lead** owns P0-1 (closed), P0-3 (closed), P0-4 (closed), P0-5 (closed), P1-2, P1-10
- **AI lead** owns chess + swim proof flows + MessagingAutomationService policy
- **DevOps + Security** owns P0-6, P0-7, P0-8, P1-6, release gate, image promote
- **QA** owns Playwright suite, release-gate run, demo rehearsal smoke
- **Product/PM** owns OQ-002 P0 freeze decision, M-01 + M-02 sign-off, closeout posts

Action: by D-2 (`2026-04-28`) Tue 09:00, Product/PM must publish a named-owner table in `implementation-progress.md` mapping each TBD slot above to a real human; this is itself a P0 item for Sprint 19.

## 5. Sources

All FX-* / P0-* / P1-* items in this plan trace to:

- [phase-17-detail.md](phases/phase-17-detail.md) — FX-1, FX-3, FX-4, FX-5, FX-7, P1-7, P1-8, P1-9
- [phase-18-detail.md](phases/phase-18-detail.md) — evidence drawer, schema normalization, tenant_id validator carry
- [phase-19-detail.md](phases/phase-19-detail.md) — P0-2..P0-5, P1-2, P1-3, P1-10, MessagingAutomationService, chess proof flow
- [phase-23-detail.md](phases/phase-23-detail.md) — P0-6, P0-7, P0-8, P1-6
- [05-CHANGE-REQUESTS.md](05-CHANGE-REQUESTS.md):
  - CR-001 re-anchor (date authority)
  - CR-002 Sprint 19 compression to 4 working days
  - CR-005 WhatsApp Twilio default + Evolution QR-bridge (delivery carry)
  - CR-006 P0-6 GitHub Actions CI deferred (manual fallback authoritative)
  - CR-007 Apple Wallet certificate (Phase 20.5; not in scope for go-live)
- [09-OPEN-QUESTIONS.md](../09-OPEN-QUESTIONS.md):
  - OQ-001 WhatsApp provider posture (M-02 affected)
  - OQ-002 P0 feature freeze scope (must close by D-2 EOD)
- [implementation-progress.md](../../development/implementation-progress.md) — daily implementation log + closeout evidence
- [phase-execution-operating-system-2026-04-26.md](../../development/phase-execution-operating-system-2026-04-26.md) — phase gate operating system + closeout requirements
- [whatsapp-twilio-default-2026-04-26.md](../../development/whatsapp-twilio-default-2026-04-26.md) — WhatsApp provider posture decision
- [07-PAST-WORK-LOG.md](07-PAST-WORK-LOG.md) — current confidence assessment for go-live aspects

## Changelog

- `2026-04-27` (scope update) — Gate A: added `AI-MENTOR-PROOF` per [CR-009](05-CHANGE-REQUESTS.md). Gate B: renamed to **Channel Readiness — Telegram-Primary**, demoted `WA-EVOLUTION-LIVE` + `P1-3-PROMOTE` to **P1-CARRY** (M-09 post-go-live), added `EMBED-CHANNEL-VERIFY` P0 per [CR-009](05-CHANGE-REQUESTS.md), promoted `TG-UAT-CHATID` to P0. Gate D: added `11:30` AI Mentor 1-1 rehearsal slot, switched `11:00` Future Swim to Telegram primary, demo video extended to ≤7 min covering all 3 tenants, Playwright bundle covers all 3 suites. Gate E: `09:30` smoke now Manager Bot Telegram (P0) + AI Mentor embed (P0); WhatsApp inbound demoted to P1 (not a gate). Day-by-day countdown: D-3 includes "Lock CR-009/010/011/012 today by EOD"; D-1 covers 3 tenants; D-0 smoke covers all 3 tenants on their primary channel.
- `2026-04-27` initial publication (compressed Sprint 19 fix backlog organized by Gate A/B/C/D/E with countdown D-3 → D-0).
