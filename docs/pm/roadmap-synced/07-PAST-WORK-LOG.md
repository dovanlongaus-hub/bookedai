# BookedAI Past Work Log — 2026-04-11 → 2026-04-27

Date written: `2026-04-27` (Mon)
Window: Phase 0 start (`2026-04-11`) → today (`2026-04-27`)
Status: `Snapshot for go-live (2026-04-30) readiness review`

Authority: tài liệu này là snapshot lịch sử của 17 ngày intensive build từ Phase 0 đến hôm nay, giúp leadership + engineering đánh giá độ sẵn sàng cho M-01 (`2026-04-29`) và M-02 go-live (`2026-04-30`). Source-of-truth chain: git log `2026-04-11 → 2026-04-27` → [`implementation-progress.md`](../../development/implementation-progress.md) → [`01-MASTER-ROADMAP-SYNCED.md`](01-MASTER-ROADMAP-SYNCED.md) → per-phase detail in [`phases/`](phases/).

## TL;DR

Trong 17 ngày `2026-04-11 → 2026-04-27`, đội đã ship Phase 0-9 baselines + Phase 17 stabilization gần kín + Phase 18 ledger backend + Phase 19 MessagingAutomationService trên một code base mới khởi tạo từ commit `5d00edd 2026-04-13 Initial commit`. 6/8 P0 hardening items đã đóng live (P0-1, P0-3, P0-4 code/indexes, P0-5, P0-7, P0-8); P0-2 quyết định Twilio default + Evolution QR-bridge nhưng provider delivery vẫn carry; P0-6 GitHub Actions CI bị block vì token thiếu `workflow` scope. Mid-flight: FX-1 payment-state badge, FX-3 admin booking responsive ≤720px (partial), FX-4 destructive action confirmation modal, evidence drawer UI baseline, P1-2 WhatsApp inline action controls, chess academy parent status flow proof case. Top concerns hôm nay: (a) Sprint 19 chỉ còn 3 working days đến go-live, (b) chess + Future Swim end-to-end demo dress rehearsal chưa được lock, (c) WhatsApp outbound delivery vẫn bị block ở provider posture nên go-live demo phải primarily route Telegram.

## Week-by-week timeline

### Week 1: `2026-04-11 → 2026-04-17` (Phase 0)

- **Theme**: Reset và foundation — initial commit + Phase 0 closeout planning baseline
- **Phases active**: Phase 0 (Sprint 1)
- **Key commits** (top from git log):
  - `5d00edd 2026-04-13 Initial commit`
  - `7d66810 2026-04-13 Remove bookedai-video and local artifacts`
  - `9bcc64e 2026-04-13 Clarify production architecture in README`
  - `d98b641 2026-04-13 Decouple web startup from backend in production`
  - `aca2ea5 2026-04-14 release: 1.0.1-stable`
  - `f1c5843 2026-04-16 feat: advance search quality and roadmap delivery`
  - `eefff75 2026-04-16 fix: stabilize search reliability smoke lanes`
  - `63a352d 2026-04-16 feat: ship prompt 5-11 platform and search reliability upgrades`
  - `0a65421 2026-04-17 chore: sync latest bookedai source`
  - `2895e09 2026-04-17 docs: close out phase 0 planning baseline`
  - `ab38fd8 2026-04-17 docs: lock sprint 2 landing blueprint`
  - `f17c503 2026-04-17 docs: record current landing and export progress`
- **Deliverables shipped**:
  - Phase 0 reset baseline (PRD, target architecture, master execution plan, MVP sprint plan, pricing strategy, sprint register) — see [phase-00-detail.md](phases/phase-00-detail.md), [phase-0-exit-review.md](../../architecture/phase-0-exit-review.md)
  - Production architecture decoupled (web vs backend startup)
  - Search reliability smoke lanes stabilized (Phase 6 baseline)
  - Sprint 2 brand + landing blueprint locked
- **Decisions made**:
  - BookedAI framed as multi-channel revenue engine across all core planning docs (Phase 0 exit decision per [phase-0-exit-review.md](../../architecture/phase-0-exit-review.md))
  - Pricing model = setup fee + SaaS subscription + commission approved
  - Phase 0 closeout signed `2026-04-17` (commit `2895e09`)

### Week 2: `2026-04-18 → 2026-04-24` (Phases 1-2-3-4-5-6-7-8-9 + Phase 17/18 open)

- **Theme**: Intensive build of historical phase baselines + start active stabilization lanes
- **Phases active**: Phase 1 (Sprint 2-3), Phase 2 (Sprint 4 carry), Phase 3 (Sprint 4, 6), Phase 4 (Sprint 5, 9), Phase 5 (Sprint 7, 9), Phase 6 (Sprint 6, 10), Phase 7 (Sprint 8, 9, 11, 12), Phase 8 (Sprint 10, 13, 14), Phase 9 (Sprint 15, 16); Phase 17 + Phase 18 opening overlay
- **Key commits**:
  - `56f53d0 2026-04-18 docs: close out sprint 2 brand and rollout baseline`
  - `c287837 2026-04-18 sync sprint dependency planning docs`
  - `2300699 2026-04-18 feat: sync landing, search, and sprint planning updates`
  - `9c35480 2026-04-21 Sync homepage, tenant platform, backend route split, and production deploy updates`
  - `9867da8 2026-04-23 feat: sync admin platform, tenant surfaces, and deploy ops`
  - `7dc8a2b 2026-04-23 feat: checkpoint admin auth hardening and enterprise ia`
  - `3b2d660 2026-04-23 docs: record major upgrade branch baseline`
  - `b5842a2 2026-04-23 fix: restore admin auth and tenant html utilities`
  - `579f7dd 2026-04-23 feat: add root admin email code login flow`
  - `4581c4d 2026-04-23 docs: record live rollout for major upgrade branch`
  - `638bcff 2026-04-23 feat: promote admin handoff guards and messaging workspace`
  - `9f8c933 2026-04-23 docs: record main promotion and branch cleanup`
  - `c28c746 2026-04-23 docs: record sprint branch cleanup`
  - `8dec115 2026-04-23 feat: ship public search and tenant activation wave`
  - `19eb45d 2026-04-23 test: fix release smoke and lifecycle gate`
  - `9f0c2f9 2026-04-23 feat: redesign pitch executive surface`
  - `e6f1c86 2026-04-23 fix: harden public and tenant QA flows`
  - `762d3e5 2026-04-23 feat: polish homepage and future swim tenant UX`
  - `9bce200 2026-04-24 feat: ship search-first homepage runtime`
  - `cbce4b8 2026-04-24 feat: sync homepage booking fixes and delivery docs`
- **Deliverables shipped**:
  - Sprint 2 brand + landing rollout baseline (Phase 1)
  - Homepage search-first runtime + booking fixes (Phase 1, Phase 3)
  - Tenant platform shell + onboarding (Phase 7)
  - Admin platform shell + IA + auth hardening + email code login (Phase 8)
  - Future Swim tenant UX polish (Phase 7)
  - Pitch executive surface redesign (Phase 1)
  - Release smoke + lifecycle gate fixes (Phase 6, Phase 9)
  - Backend route split (P1-5 baseline preparation)
- **Decisions made**:
  - Major upgrade branch baseline recorded (`3b2d660`)
  - Admin handoff guards + messaging workspace promoted (`638bcff`)
  - Main promotion + branch cleanup discipline (`9f8c933`, `c28c746`)
  - Phase 7 + Phase 8 baselines marked Shipped per [phase-execution-operating-system-2026-04-26.md](../../development/phase-execution-operating-system-2026-04-26.md)

### Week 3 partial: `2026-04-25 → 2026-04-27` (Phases 17-18-19, start of Sprint 19)

- **Theme**: Sprint 19 compressed go-live execution + Manager Bot baseline + P0 hardening sweep + Phase 18/19 active build
- **Phases active**: Phase 17 (active stabilization), Phase 18 (partial), Phase 19 (active build), Phase 23 overlay (P0-7, P0-8)
- **Key commits**:
  - `1dda05c 2026-04-25 Stabilize full booking flow and next phase plan`
  - `c7156e7 2026-04-25 Merge pull request #2 from dovanlongaus-hub/codex/full-flow-next-phases`
  - `5724dcd 2026-04-25 Continue phase 18 revenue ops ledger visibility`
  - `b4ce1c0 2026-04-25 Polish Future Swim booking copy`
  - `02cf71a 2026-04-25 Redesign customer portal workspace`
  - `6b5919c 2026-04-25 Improve product booking UX flow`
  - `71436df 2026-04-25 Stabilize admin routing and workspace QA`
  - `1b88142 2026-04-25 Document admin deploy QA closeout`
  - `c00fa63 2026-04-25 Harden admin login same-origin flow`
  - `3d6cf20 2026-04-25 Harden admin runtime schema and session env`
  - `a8ad7d2 2026-04-25 Polish product search booking UX`
  - `43f74ef 2026-04-25 Upgrade admin enterprise workspace shell`
  - `188f1f1 2026-04-25 Document admin enterprise workspace shell baseline`
  - `fd7f0b8 2026-04-25 Ship product surfaces and agent updates`
  - `f02080f 2026-04-26 Polish public booking and pitch surfaces`
  - `836a7ed 2026-04-26 Polish admin investor workspace`
  - `c894251 2026-04-26 Ship customer messaging and live surface updates`
  - `5bad301 2026-04-26 Harden customer message rendering`
  - `b8c7529 2026-04-26 Record live deploy closeout`
  - `5fa174a 2026-04-26 Document confirmation email security review`
  - `b83f6e2 2026-04-26 Ship sprint 19 hardening and UI stabilization`
  - `085cbbf 2026-04-26 Close sprint 19 webhook and tenant hardening`
  - `c561fc1 2026-04-26 Record sprint 19 webhook closeout`
  - `0994982 2026-04-26 Add production env checksum guard`
  - `4dc9436 2026-04-26 Record review backlog and release gates`
  - `050efd3 2026-04-26 Record sprint 19 live redeploy closeout`
  - `e151a0a 2026-04-26 Refresh public pitch video`
  - `b3097f4 2026-04-27 Sync sprint 19 hardening and ops docs`
- **Deliverables shipped** (per [implementation-progress.md](../../development/implementation-progress.md)):
  - Customer portal workspace redesign (Phase 17)
  - Product booking UX flow + product search booking polish (Phase 17)
  - Admin enterprise workspace shell upgrade + same-origin login + runtime schema hardening (Phase 8)
  - Phase 18 revenue-ops ledger visibility continued (filters, summary counts, Tenant Ops panel, dispatch endpoint shipped)
  - `MessagingAutomationService` shared layer landed `2026-04-26` (Phase 19)
  - P0-3 Telegram secret-token + Evolution HMAC live `2026-04-26`
  - P0-4 webhook idempotency code + indexes (migration `022`) live `2026-04-26`
  - P0-5 `actor_context.tenant_id` validator live `2026-04-26`
  - P0-7 `.env.production.example` checksum guard wired into release gate `2026-04-26`
  - P0-8 OpenClaw rootless + host mount scope reduced + break-glass `BOOKEDAI_ENABLE_HOST_SHELL=1` live `2026-04-26`
  - P1-3 WhatsApp webhook test parity closed locally `2026-04-26`
  - P1-7 phone `aria-describedby` on product + homepage closed `2026-04-26`
  - P1-7 admin booking responsive ≤720px partial close (cards layout) `2026-04-26`
  - P1-8 PitchDeckApp Playwright coverage closed locally `2026-04-26`; live promote pending
  - P1-9 Future Swim Miranda URL hotfix migration `020` live `2026-04-26`
  - FX-2 shared API timeout (frontend client.ts `fetchWithTimeout()`) live `2026-04-26`
  - FX-5 focus restoration on dialog close closed `2026-04-26`
  - FX-7 portal `booking_reference` URL canonicalization closed live `2026-04-27`
  - QW-1..QW-8 inline copy upgrade closed `2026-04-26`
  - Public pitch video refresh (homepage + pitch) live `2026-04-26`
- **Decisions made**:
  - P0-2 WhatsApp provider posture: Twilio default + Evolution QR-bridge near-term; provider delivery carried (per [whatsapp-twilio-default-2026-04-26.md](../../development/whatsapp-twilio-default-2026-04-26.md), see [CR-005](05-CHANGE-REQUESTS.md))
  - P0-6 GitHub Actions CI deferred — workflow scope blocked on GitHub token (see [CR-006](05-CHANGE-REQUESTS.md))
  - Re-anchor `2026-04-27`: Phase 0 = `2026-04-11`, M-01 = `2026-04-29`, M-02 go-live = `2026-04-30` (per user; see [CR-001](05-CHANGE-REQUESTS.md))
  - Sprint 19 compressed to 4 working days (Mon-Thu) per [CR-002](05-CHANGE-REQUESTS.md)

## Phase-by-phase status snapshot (as of 2026-04-27)

| Phase | Status | Evidence | Owner |
|---|---|---|---|
| `0` Reset | Shipped `2026-04-17` | [phase-0-exit-review.md](../../architecture/phase-0-exit-review.md); git `2895e09` | Product/PM |
| `1` Public landing | Shipped (carry P1-7 closed `2026-04-26`; P1-8 closed locally `2026-04-26`) | git `56f53d0`, `f17c503`; [phase-01-detail.md](phases/phase-01-detail.md) | Frontend lead |
| `2` Commercial data foundation | Shipped baseline (carry → Phase 21) | migration `001-009`; [phase-02-detail.md](phases/phase-02-detail.md) | Backend + Data lead |
| `3` Multi-channel capture & conversion | In-Progress (channel parity carries to Phase 19) | git `f1c5843`, `eefff75`, `9bce200`; [phase-03-detail.md](phases/phase-03-detail.md) | Backend lead |
| `4` Revenue workspace & reporting | In-Progress (partial; Tenant Revenue Proof carries to Phase 21) | [phase-04-detail.md](phases/phase-04-detail.md) | Backend + Frontend |
| `5` Recovery, payments, commission ops | In-Progress (partial foundation; provider posture carries to Phase 19/21) | [phase-05-detail.md](phases/phase-05-detail.md); Stripe handoff working with manual fallback in chess + swim flows; real subscription checkout deferred to Phase 21 per [CR-011](05-CHANGE-REQUESTS.md); Stripe `success_url` swap + Wallet pass remain Phase 20.5 | Backend lead |
| `6` Optimization & scale hardening | In-Progress (CI gap carries to Phase 23) | git `eefff75`, `19eb45d`; [phase-06-detail.md](phases/phase-06-detail.md) | DevOps + QA |
| `7` Tenant revenue workspace | Shipped baseline (P1-1 + P1-4/P1-5 carry to Phase 22) | git `9867da8`, `638bcff`; [phase-07-detail.md](phases/phase-07-detail.md) | Backend + Frontend |
| `8` Admin platform | Shipped baseline (admin responsive partial closed `2026-04-26`) | git `7dc8a2b`, `43f74ef`, `c00fa63`; [phase-08-detail.md](phases/phase-08-detail.md) | Frontend + Backend |
| `9` QA / release base | In-Progress (CI/observability carries to Phase 23) | git `1b88142`, `4dc9436`, `0994982`; [phase-09-detail.md](phases/phase-09-detail.md) | DevOps + QA |
| `17` Full-flow stabilization | In-Progress (At-Risk; must close M-01 `2026-04-29`) | git `1dda05c`, `02cf71a`, `b83f6e2`; [phase-17-detail.md](phases/phase-17-detail.md) | Frontend + Backend leads |
| `18` Revenue-ops ledger control | In-Progress (partial; baseline shipped, evidence drawer UI carry possible) | git `5724dcd`, migration `022`; [phase-18-detail.md](phases/phase-18-detail.md); Zoho CRM adapter production-ready (refresh-token + AU region-aware, connection-test endpoint, operator helper script, migrations `011` + `014`), live activation pending tenant `ZOHO_CRM_*` credentials per [CR-012](05-CHANGE-REQUESTS.md) | Backend lead |
| `19` Customer-care & status agent | In-Progress (At-Risk; Manager Bot baseline shipped, P1-2/P1-10 carry) | git `c894251`, `5bad301`, `085cbbf`; [phase-19-detail.md](phases/phase-19-detail.md) | Backend + AI leads |
| `20` Widget & plugin runtime | Planned (Week 1 post-go-live `2026-05-04`) | [phase-20-detail.md](phases/phase-20-detail.md) | Frontend + Backend |
| `20.5` Wallet & Stripe continuity | Planned (Week 2 post-go-live `2026-05-11`) | [phase-20-5-detail.md](phases/phase-20-5-detail.md); blocker = Apple cert ([CR-007](05-CHANGE-REQUESTS.md)) | Backend + Frontend |
| `21` Billing truth | Planned (Week 3 post-go-live `2026-05-18`) | [phase-21-detail.md](phases/phase-21-detail.md) | Backend + Data |
| `22` Multi-tenant template generalization | Planned (Week 4 post-go-live `2026-05-25`) | [phase-22-detail.md](phases/phase-22-detail.md); SMS timing per OQ-010 ([CR-004](05-CHANGE-REQUESTS.md)) | Backend + Data |
| `23` Release governance | In-Progress (overlay; P0-7/P0-8 closed `2026-04-26`; P0-6 carried) | [phase-23-detail.md](phases/phase-23-detail.md) | DevOps + Security |

## What's actually working today (verified)

- Public homepage search-first runtime + booking fixes shipped live (git `9bce200`, `cbce4b8`, `f02080f`)
- Customer portal workspace redesign live (git `02cf71a`)
- Product booking UX + product search booking polish live (git `6b5919c`, `a8ad7d2`)
- Admin enterprise workspace shell + same-origin login + runtime schema hardening live (git `43f74ef`, `c00fa63`, `3d6cf20`, `c00fa63`)
- Future Swim Miranda URL hotfix live (P1-9, migration `020`)
- Manager Bot Telegram inbound webhook with HMAC + idempotency + tenant_id validator live (P0-3, P0-4, P0-5)
- `MessagingAutomationService` shared layer live (`2026-04-26`)
- Customer messaging + live surface updates live (git `c894251`, `5bad301`)
- Phase 18 ledger filters + Tenant Ops panel + dispatch endpoint shipped (Sprint 18 baseline)
- `.env.production.example` checksum guard wired into `scripts/run_release_gate.sh` (P0-7)
- OpenClaw rootless deployment + break-glass `BOOKEDAI_ENABLE_HOST_SHELL=1` live (P0-8)
- Pitch deck Playwright coverage at `1440px` desktop + `390px` mobile (P1-8) — local pass
- Public pitch video refreshed and live on bookedai.au + pitch.bookedai.au
- Production env checksum verification + release gate (`scripts/run_release_gate.sh`) functional manually
- **AI Mentor 1-1 tenant seeded `2026-04-21`** — slug `ai-mentor-doer`, tagline `Convert AI to your DOER`, 10 catalog packages (5 private 1-1 + 5 group mentoring), USD currency, runtime `https://ai.longcare.au/`, embed via `https://product.bookedai.au/partner/ai-mentor-pro/embed?embed=1&tenant_ref=ai-mentor-doer`, plugin loader `/partner-plugins/ai-mentor-pro-widget.js`, login `tenant3 / 123` (`tenant3@bookedai.local`); seed migration `013_ai_mentor_tenant_seed.sql`; plugin interface doc [`docs/development/ai-mentor-pro-plugin-interface.md`](../../development/ai-mentor-pro-plugin-interface.md); custom asset pack at [`frontend/public/tenant-assets/ai-mentor/`](../../../frontend/public/tenant-assets/ai-mentor/)
- **Stripe handoff with manual fallback** in `pricing-consultation`, chess + Future Swim flows: capability chips visible; manual fallback degradation working when Stripe call fails (degrades to manual follow-up); Stripe-ready checkout KPI live in admin dashboard
- **Zoho CRM adapter built**: refresh-token flow + region-aware (AU) at [`backend/integrations/zoho_crm/adapter.py`](../../../backend/integrations/zoho_crm/adapter.py); connection-test endpoint `/api/v1/integrations/providers/zoho-crm/connection-test`; operator helper [`scripts/zoho_crm_connect.py`](../../../scripts/zoho_crm_connect.py) (consent URL, exchange code, smoke test); migrations `011_future_swim_zoho_crm_connection_blueprint.sql` + `014_future_swim_crm_linked_flow_sample.sql`
- **Telegram customer bot LIVE** with 24+ webhook tests passing, deploy-live confirmed (per channel-scope decision in [CR-010](05-CHANGE-REQUESTS.md))

## What's mid-flight (in active build)

- FX-1 confirmation hero payment-state badge (Stripe ready / QR transfer / Manual review / Pending) — Phase 17, Open
- FX-3 admin booking responsive card layout `390-720px` — Phase 17, Partial close `2026-04-26`, full polish in flight
- FX-4 destructive action confirmation modal — Phase 17, Open
- Operator evidence drawer UI (outbox/audit/job-run/CRM/payment/webhook) — Phase 18, Open (carry candidate)
- Schema normalization wave (`bookings`, `payments`, `audit_outbox`, `tenants` dual-write) — Phase 18, Open → Sprint 20 carry
- P1-2 WhatsApp inline action controls + brand alignment — Phase 19, Open (provider unblock dependent)
- P1-10 channel-aware email templates with `info@bookedai.au` — Phase 19/21, Open
- `backend/security/permissions.py` central permission registry — Phase 19, Open → Sprint 21
- Chess academy parent status flow proof case — Phase 19, Open (target Sprint 20)
- `location_posture` schema delta on chat response — Phase 19, Open → Sprint 21
- WhatsApp webhook test parity live promote (closed locally `2026-04-26`)
- PitchDeckApp Playwright live promote (closed locally `2026-04-26`)
- **AI Mentor 1-1 production embed verification** — D-1 rehearsal slot per [CR-009](05-CHANGE-REQUESTS.md); embed channel (`product.bookedai.au/partner/ai-mentor-pro/embed`) needs production-verify (loader cached, CORS valid, `embed=1` query honored, catalog renders)
- **Stripe `success_url` swap (booking-aware return URL) + Apple/Google Wallet pass generation** — Phase 20.5 (`2026-05-11 → 2026-05-17`) per [CR-011](05-CHANGE-REQUESTS.md)
- **Telegram operator drawer + customer UAT chat ID config** — `BOOKEDAI_CUSTOMER_TELEGRAM_UAT_CHAT_ID` env var pending (Gate B `TG-UAT-CHATID` P0)

## What's blocked or open

- P0-2 WhatsApp provider posture: Twilio + Meta both block live outbound delivery (`Account not registered` / `401 Authenticate`); Evolution QR-bridge is near-term; see [CR-005](05-CHANGE-REQUESTS.md), [OQ-001](../09-OPEN-QUESTIONS.md)
- P0-6 GitHub Actions CI: blocked on GitHub token missing `workflow` scope; manual `scripts/run_release_gate.sh` is fallback gate; see [CR-006](05-CHANGE-REQUESTS.md), [OQ-002](../09-OPEN-QUESTIONS.md)
- P1-1 tenant authenticated UAT (catalog/billing/team) — Open, Sprint 20 target
- P1-4 split `tenant_app_service.py` — Open, Sprint 21
- P1-5 raw SQL out of `route_handlers.py` — Open, Sprint 20
- P1-6 beta DB separation + image registry — Open, Sprint 21; depends on [OQ-006](../09-OPEN-QUESTIONS.md)
- Apple Wallet certificate provisioning — Open, see [CR-007](05-CHANGE-REQUESTS.md)
- Hiring / capacity decision before Phase 22 — Open, see [CR-008](05-CHANGE-REQUESTS.md), [OQ-009](../09-OPEN-QUESTIONS.md)
- Tenant Revenue Proof metric set — Deferred until OQ-005 closes, see [CR-003](05-CHANGE-REQUESTS.md)
- SMS adapter timing — Deferred until OQ-010 closes, see [CR-004](05-CHANGE-REQUESTS.md)
- Telegram customer UAT chat-id — env var `BOOKEDAI_CUSTOMER_TELEGRAM_UAT_CHAT_ID` not provisioned
- **Zoho CRM live activation**: blocked on tenant `ZOHO_CRM_*` credentials (per [CR-012](05-CHANGE-REQUESTS.md)); adapter is production-ready, no go-live blocker, tracked as enablement work post-go-live
- **WhatsApp outbound production claim**: blocked, **deferred post-go-live to M-09** (`2026-05-04 → 2026-05-10`) per [CR-010](05-CHANGE-REQUESTS.md); Twilio `delivered` callback or Meta verification required

## Confidence assessment for go-live 2026-04-30

| Aspect | Confidence | Evidence |
|---|---|---|
| Chess demo runnable end-to-end (search → match → book → pay → portal → care reply) | MEDIUM | Most pieces shipped (search runtime, booking flow, portal redesign, MessagingAutomationService, Telegram inbound HMAC); chess parent status flow proof case still Open per [phase-19-detail.md](phases/phase-19-detail.md); needs M-01 dress rehearsal Wed `2026-04-29` to confirm |
| Future Swim demo runnable end-to-end | MEDIUM | Future Swim Miranda URL hotfix live; tenant UX polish complete; booking copy polished (git `b4ce1c0`); end-to-end through WhatsApp depends on Evolution QR-bridge stability; needs M-01 rehearsal |
| Payment flow (Stripe / QR transfer / Manual review) | LOW-MEDIUM | Stripe baseline live but FX-1 payment-state badge still Open; Apple Wallet not in scope for go-live (Phase 20.5); QR transfer manual flow has no automated reconciliation |
| Channel scope (Telegram-primary, embed for AI Mentor) | HIGH | Per [CR-010](05-CHANGE-REQUESTS.md), scope narrowed to Telegram-only P0 + embed widget for AI Mentor 1-1; Telegram primary outbound is solid (P0-3 HMAC live, 24+ webhook tests passing); WhatsApp inbound stays online but outbound moved to M-09 post-go-live; iMessage to M-10; SMS to M-11 / Phase 22; **scope reduction = fewer channels to verify pre-promote = higher M-02 confidence** |
| AI Mentor 1-1 demo runnable | MEDIUM | Tenant seeded `2026-04-21` via migration `013`; 10-package catalog live; runtime `https://ai.longcare.au/`; embed channel (`product.bookedai.au/partner/ai-mentor-pro/embed`) **not yet smoke-verified in production** — needs M-01 D-1 rehearsal `11:30` slot per [CR-009](05-CHANGE-REQUESTS.md) |
| Admin workspace | HIGH | Admin enterprise shell shipped (git `43f74ef`); same-origin login + runtime schema hardening (`c00fa63`, `3d6cf20`); admin responsive ≤720px partial close, full polish in flight |
| Observability | LOW | No Prometheus / structured JSON logs / error tracker live; `/metrics` endpoint not exported; Grafana / AlertManager not wired; release-gate script is the only operational gate; Phase 23 carries this work into post-go-live |
| Rollback path | MEDIUM | `scripts/run_release_gate.sh` + `bash scripts/healthcheck_stack.sh` + `python3 scripts/telegram_workspace_ops.py deploy-live` chain proven through multiple `2026-04-26` deploys; image registry with `git-sha` tags not yet (P1-6); rollback ≤5 min not yet drilled |
| Release gate (CI vs manual) | MEDIUM | `scripts/run_release_gate.sh` exists and proven (env checksum + frontend smoke + tenant smoke + backend `52 tests` + search eval `14/14`); GitHub Actions CI not live (P0-6 carried); manual gate is acceptable fallback per [CR-006](05-CHANGE-REQUESTS.md) |

Aggregate go-live confidence (M-02): **MEDIUM** — most blockers are tractable in 3 working days, but channel parity (WhatsApp outbound) and demo dress rehearsal are the highest-risk items.

## Sources

- [01-MASTER-ROADMAP-SYNCED.md](01-MASTER-ROADMAP-SYNCED.md) — phase + sprint canonical schedule
- [04-VISION-TARGET-MILESTONES.md](04-VISION-TARGET-MILESTONES.md) — milestone definitions
- [05-CHANGE-REQUESTS.md](05-CHANGE-REQUESTS.md) — CR-001 through CR-008
- [06-BIG-PICTURE.md](06-BIG-PICTURE.md) — visual + critical path
- [phases/phase-00-detail.md](phases/phase-00-detail.md) → [phase-23-detail.md](phases/phase-23-detail.md) — per-phase Status, evidence, deliverables
- [implementation-progress.md](../../development/implementation-progress.md) — daily implementation log
- [phase-0-exit-review.md](../../architecture/phase-0-exit-review.md) — Phase 0 closeout signed `2026-04-17`
- [phase-execution-operating-system-2026-04-26.md](../../development/phase-execution-operating-system-2026-04-26.md) — phase gate operating system
- [whatsapp-twilio-default-2026-04-26.md](../../development/whatsapp-twilio-default-2026-04-26.md) — WhatsApp provider posture decision
- [messaging-automation-telegram-first-2026-04-26.md](../../development/messaging-automation-telegram-first-2026-04-26.md) — MessagingAutomationService landing
- [09-OPEN-QUESTIONS.md](../09-OPEN-QUESTIONS.md) — leadership decision register
- git log `2026-04-11 → 2026-04-27` — `git log --since="2026-04-11" --until="2026-04-27" --pretty=format:"%h %ad %s" --date=short`

## Changelog

- `2026-04-27` (scope update) — Phase 5 row noted Stripe handoff working with manual fallback (real subscription deferred to Phase 21 per [CR-011](05-CHANGE-REQUESTS.md)). Phase 18 row noted Zoho CRM adapter production-ready, awaiting tenant credentials per [CR-012](05-CHANGE-REQUESTS.md). Added bullets to "What's actually working today" (AI Mentor 1-1 tenant seed, Stripe handoff, Zoho adapter, Telegram bot live). Added bullets to "What's mid-flight" (AI Mentor production verify, Stripe success_url + Wallet, Telegram operator drawer + UAT chat-id). Added blockers (Zoho live activation, WhatsApp outbound). Replaced "Channel parity" row with "Channel scope (Telegram-primary, embed for AI Mentor)" at HIGH confidence per [CR-010](05-CHANGE-REQUESTS.md); added AI Mentor 1-1 demo runnable row at MEDIUM.
- `2026-04-27` initial publication (snapshot for go-live readiness review).
