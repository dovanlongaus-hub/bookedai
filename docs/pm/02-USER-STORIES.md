# BookedAI User Stories (02) — Epic → Story → Task

Date: `2026-04-26`

Status: `active backlog baseline`

Hợp nhất từ:
- [`jira-epic-story-task-structure.md`](../architecture/jira-epic-story-task-structure.md) (Epic 1-10)
- [`notion-jira-import-ready.md`](../architecture/notion-jira-import-ready.md) (E-001..E-010, S/T tree)
- [`phase-3-6-epic-story-task-breakdown.md`](../architecture/phase-3-6-epic-story-task-breakdown.md), [`phase-7-8-epic-story-task-breakdown.md`](../architecture/phase-7-8-epic-story-task-breakdown.md), [`phase-9-epic-story-task-breakdown.md`](../architecture/phase-9-epic-story-task-breakdown.md)
- Sprint owner checklists (`sprint-1-..-sprint-22-owner-execution-checklist.md`)

ID format: `EP-NN` (epic), `US-NNN` (story), `TK-NNNN` (task). Effort = XS/S/M/L/XL. Priority P0/P1/P2/P3.

## Cách đọc

- Mỗi Epic gắn với 1 hoặc nhiều Phase trong [`03-EXECUTION-PLAN.md`](03-EXECUTION-PLAN.md).
- Mỗi Story format: `As <persona>, I want <action>, so that <outcome>` + Acceptance Criteria (Gherkin).
- Persona codes lấy từ [`01-MASTER-PRD.md` §3](01-MASTER-PRD.md).
- FR codes (FR-NNN) link tới [`01-MASTER-PRD.md` §5](01-MASTER-PRD.md).

---

## EP-01 — Production Baseline & Rollout Safety

Phase: `0`, `9`, `23`. Owner: Product + DevOps. Source: [Epic 1 in jira-epic-story-task-structure.md](../architecture/jira-epic-story-task-structure.md).

### US-001 Production contract inventory

`As P-BAI-OPERATOR, I want a complete inventory of routes/CTAs/webhooks/subdomains, so that no refactor breaks live behavior.`

- AC1: Given current production routes, When I open the inventory doc, Then I see public, admin, webhook, redirect/upload paths with caller and payload contracts.
- AC2: Given a frontend component depending on response shape X, When I search the inventory, Then I find its dependency annotated.
- Priority: P0. Effort: M. FR: NFR-020. Phase: 0.
- Tasks: TK-0001 inventory public routes & CTAs; TK-0002 inventory admin routes & auth paths; TK-0003 inventory webhook/callback endpoints; TK-0004 document subdomain matrix; TK-0005 document redirect/upload flows.

### US-002 Environment & secret audit

`As P-BAI-OPERATOR, I want a catalog of required/optional env vars and secret ownership, so that production secrets rotate safely and `.env.production.example` stays canonical.`

- AC1: Given service S, When I open env catalog, Then I see required vars, owners, rotation cadence.
- AC2: Given `.env.production.example` changes, When I run `scripts/verify_env_production_example_checksum.sh`, Then it must pass before release gate.
- Priority: P0. Effort: M. FR: NFR-071. Phase: 0, 19, 23.
- Tasks: TK-0006 catalog required env; TK-0007 catalog optional env; TK-0008 identify duplicates; TK-0009 secret rotation; TK-0010 expand `.env.production.example` + checksum guard.

### US-003 Release & rollback discipline

`As P-BAI-OPERATOR, I want documented smoke/release/rollback checklists with feature-flag discipline, so that promotion is deterministic and revertible.`

- AC1: Given release candidate, When operator runs release gate, Then frontend smoke + tenant smoke + backend unittest + search eval + healthcheck must all pass.
- AC2: Given a regression detected post-promote, When operator triggers rollback, Then tagged image rolls back ≤5 min on staging.
- Priority: P0. Effort: M. FR: NFR-020, NFR-023. Phase: 9, 23.
- Tasks: TK-0011 smoke checklist; TK-0012 release/rollback checklist; TK-0013 feature-flag rules; TK-0014 migration rehearsal; TK-0015 image registry với git-sha tags.

---

## EP-02 — Backend Modularization & API v1

Phase: `1`, `2`, `3`, `22`. Owner: Backend. Source: [Epic 2 jira](../architecture/jira-epic-story-task-structure.md).

### US-010 Domain service extraction

`As Backend lead, I want service seams extracted into bounded modules (growth, conversations, matching, booking_trust, payment, CRM, billing), so that new logic doesn't pile into route_handlers.py / services.py.`

- AC1: Given new feature X, When implementer adds logic, Then it lands in `backend/domain/<context>/` not in legacy concentration files.
- AC2: Given `tenant_app_service.py`, When refactor closes, Then it is split into `tenant_overview_service`, `tenant_billing_service`, `tenant_catalog_service`.
- Priority: P0. Effort: XL. FR: FR-040..FR-045. Phase: 22 (full-stack review P1-4).
- Tasks: TK-0020..TK-0027 (extract per domain).

### US-011 Thin router & handler cleanup

`As Backend lead, I want thin routers + repository read models, so that orchestration stops growing in route_handlers.py.`

- AC1: Given a handler, Then it delegates to a domain service, not raw SQL.
- AC2: Given `route_handlers.py`, When refactor closes, Then raw SQL moved to repository layer (P1-5).
- Priority: P1. Effort: L. FR: NFR-080. Phase: 21, 22.
- Tasks: TK-0028..TK-0031.

### US-012 API v1 structure

`As Frontend & integration lead, I want /api/v1/* bounded-context routes (leads, conversations, matching, booking-trust, bookings, payments, billing, crm, email, integrations), so that public clients have stable typed contracts.`

- AC1: Given `/api/v1/matching`, Then response shape includes `booking_fit` + `stage_counts`.
- AC2: Given typed envelope, Then success/error follow shared DTOs aligned with frontend.
- Priority: P0. Effort: XL. FR: FR-002, FR-020. Phase: 3, 5.
- Tasks: TK-0032..TK-0040 (per route family).

---

## EP-03 — Data Normalization & Dual-Write

Phase: `2`, `3`, `5`. Owner: Data + Backend. Feature flag: `new_booking_domain_dual_write`.

### US-020 Platform safety migration `001`

`As Data lead, I want feature_flags, audit_logs, idempotency_keys, outbox_events, webhook_events tables, so that dual-write is observable and safe.`

- AC1: Given migration 001 applied, Then 6 tables exist + default tenant seed inserted.
- Priority: P0. Effort: M. FR: NFR-012, NFR-022. Phase: 2.

### US-021 Core domain mirror migration `002`

`As Backend lead, I want leads/contacts/booking_intents/payment_intents tables + repositories, so that local-first truth has a normalized model.`

- AC1: Given booking lifecycle event, Then data persists to mirror tables alongside legacy `conversation_events`.
- Priority: P0. Effort: L. FR: FR-100. Phase: 2, 3.

### US-022 Dual-write rollout

`As Backend lead, I want booking-assistant + pricing-consultation + demo-request flows dual-writing to mirror tables, gated by feature flag.`

- AC1: Given flag on, Then both legacy + mirror writes succeed atomically; reconciliation drift = 0.
- Priority: P0. Effort: L. Phase: 3.

---

## EP-04 — Trust-First Assistant & Matching

Phase: `3`, `6`, `19`. Owner: Backend + AI + Frontend.

### US-030 AI router foundation

`As AI lead, I want classifier + extraction + provider/model selector + fallback, so that requests degrade safely when one provider fails.`

- AC1: Given primary provider down, When request arrives, Then fallback chain selected and metadata logged.
- Priority: P0. Effort: L. FR: FR-060, FR-067. Phase: 3, 19.

### US-031 Grounded matching pipeline

`As P-END-CUSTOMER, I want shortlist results that are tenant-truthful and locality-relevant, so that I don't get wrong-domain or stale matches.`

- AC1: Given query `chess class Sydney weekend`, Then `Kids Chess Class - Sydney Pilot` ranks #1.
- AC2: Given tenant miss, Then public-web fallback labeled `public_web_search`, never tagged tenant-trusted.
- Priority: P0. Effort: L. FR: FR-010..FR-014. Phase: 3, 6.

### US-032 Booking trust model

`As P-END-CUSTOMER, I want UI showing whether availability/pricing is verified, so that I trust the next action.`

- AC1: Given low confidence, Then UI shows `request booking` not `book now`.
- Priority: P0. Effort: M. FR: FR-020. Phase: 3.

### US-033 Booking path & payment path resolver

`As P-END-CUSTOMER, I want the system to choose between book-now / request-booking / request-callback / pay-now / pay-after-confirmation safely.`

- AC1: Given partner provider, Then payment path = `partner_checkout`.
- Priority: P0. Effort: M. FR: FR-021, FR-022. Phase: 3.

### US-034 Assistant UI alignment

`As Frontend lead, I want the assistant UI to render trust-aware outcomes + degraded mode, so that copy matches backend semantics.`

- AC1: Given degraded fallback, Then UI shows graceful retry and progress states.
- Priority: P1. Effort: M. FR: FR-009. Phase: 17.

---

## EP-05 — Public Acquisition & Search UX (Phase 1, 17)

Phase: `1`, `17`. Owner: Frontend + Product.

### US-040 Search-first homepage

`As P-END-CUSTOMER, I want a homepage where I can immediately type a service request and see results, so that I don't read marketing copy first.`

- AC1: Given homepage load, Then search input is above-the-fold and focused-able with 1 tab.
- AC2: Given mobile 390px viewport, Then no horizontal overflow.
- Priority: P0. Effort: M. FR: FR-001, FR-008. Phase: 1, 17.

### US-041 Progressive search loading

`As P-END-CUSTOMER, When live ranking is slow, I want early useful matches with staged status copy, so that the UI doesn't feel stalled.`

- AC1: Given slow backend, Then initial matches (catalog/local) appear in ≤2s with `Looking deeper...` copy.
- AC2: Given `Future Swim`/`Co Mai Hung Chess`/`WSTI AI Event` shortcut search, Then matching catalog rows render before live ranking returns.
- Priority: P0. Effort: M. FR: FR-003. Phase: 17.

### US-042 Result card design (thumbnail + Maps + actions)

`As P-END-CUSTOMER, I want thumbnail + Google Maps + provider link + Book on each card, so that I can inspect before committing.`

- AC1: Given physical-place result, Then thumbnail or branded initial fallback shows top-left.
- AC2: Given `map_url`, Then Google Maps action uses it; else fallback query.
- AC3: Given selecting a result, Then NO auto-jump into form; explicit `Book` required.
- Priority: P0. Effort: M. FR: FR-004, FR-005. Phase: 17.

### US-043 Verified-tenant treatment (Chess, Future Swim)

`As P-END-CUSTOMER, when search returns a reviewed BookedAI tenant, I want a Verified-tenant badge with capability chips (Stripe, QR, calendar, email, WhatsApp Agent, portal edit), but still enter through compare/Book flow.`

- AC1: Given chess tenant match, Then badge + chips render; Book still gated on explicit click.
- Priority: P0. Effort: M. FR: FR-006. Phase: 17.

### US-044 Locale switcher

`As P-END-CUSTOMER, I want English + Tiếng Việt locales with visible switcher, so that I can read in my preferred language.`

- AC1: Given locale switch, Then UI strings change and persist via storage/URL.
- Priority: P1. Effort: S. FR: FR-007. Phase: 1.

### US-045 Confirmation Thank You + actions

`As P-END-CUSTOMER, after booking I want a 16s persistent Thank You with email/calendar/portal/continue-chat actions, so that I have time to act.`

- AC1: Given confirmation, Then Thank You stays visible 16s; portal QR rendered (frontend fallback if backend none).
- Priority: P0. Effort: M. FR: FR-023, FR-024, FR-025. Phase: 17.

### US-046 Public copy upgrade (Marketing review QW-1..QW-8)

`As P-INVESTOR-JUDGE / P-END-CUSTOMER, I want hero/CTA/empty-state copy free of jargon (queued, manual review), so that the product feels customer-grade.`

- AC1: Hero = `Never lose a service enquiry again.`
- AC2: Primary CTA = `Try BookedAI Free`; secondary = `Schedule a Consultation`.
- AC3: Empty search = `Let's refine your request — tell us a suburb, preferred time, or service detail`.
- Priority: P1. Effort: S. FR: FR-001. Phase: 17 (delivered 2026-04-26).

---

## EP-06 — Tenant Workspace Foundation

Phase: `7`. Owner: Frontend + Backend + Product. Feature flag: `tenant_mode_enabled`.

### US-050 Tenant gateway sign-in/create

`As P-SME-OWNER, I want tenant.bookedai.au with explicit Sign-in vs Create-account intent (Google + email-first), so that I don't accidentally create a workspace.`

- AC1: Given Google sign-in, Then no workspace is created if email not yet member.
- AC2: Given email-first verification, Then code arrives within 30s.
- Priority: P0. Effort: M. FR: FR-040, FR-041, FR-042. Phase: 7.

### US-051 Tenant workspace shell + role-aware nav

`As P-SME-OWNER, I want overview/catalog/bookings/leads/billing/team/integrations/plugin/branding/Ops/retention/communications/receivables nav, so that I can run the business in one place.`

- AC1: Given role `tenant_admin`, Then full nav visible.
- AC2: Given `finance_manager`, Then only finance-relevant items active; others read-only or hidden.
- Priority: P0. Effort: L. FR: FR-043, FR-044. Phase: 7.

### US-052 Tenant catalog publish-safe workflow

`As P-SME-OWNER, I want to edit catalog & services, preview, publish, with audit log, so that bad publishes can be reverted.`

- AC1: Given edit, Then preview state distinct from live; explicit Publish action with confirm modal.
- Priority: P1. Effort: L. FR: FR-043. Phase: 7, 8.

### US-053 Tenant Ops panel (revenue-ops ledger)

`As P-SME-OWNER, I want to see queued/sent/failed/manual-review/completed actions with evidence drawer per booking/student/lifecycle event.`

- AC1: Given filter `tenant=X status=manual_review`, Then list shows actions awaiting approval with evidence.
- Priority: P0. Effort: L. FR: FR-045, FR-046. Phase: 18.

### US-054 Pricing & commission visibility

`As P-SME-OWNER, I want to see current plan, commission rate, billing history, so that I know what I owe and earn.`

- AC1: Given workspace billing tab, Then current plan + commission % + last 6 invoices visible.
- Priority: P1. Effort: M. FR: FR-047, FR-114. Phase: 21.

---

## EP-07 — Admin Workspace & Internal Ops

Phase: `8`. Owner: Frontend + Backend.

### US-060 Admin enterprise shell

`As P-BAI-OPERATOR, I want sidebar workspace menu with grouped operator lanes, so that the active workspace stays visible without a card-selector pushing it down.`

- AC1: Given admin login, Then sidebar nav with grouped lanes.
- AC2: Given `/api/*` request from `admin.bookedai.au`, Then proxied to backend before SPA fallback.
- Priority: P0. Effort: L. FR: FR-051, FR-052. Phase: 8.

### US-061 Tenant directory + drill-in

`As P-BAI-OPERATOR, I want to list tenants + drill into tenant workspace, branding, role/permission, catalog CRUD, billing investigation.`

- AC1: Given tenant row, Then click opens deep-linked tenant detail with tabs.
- Priority: P1. Effort: L. FR: FR-053, FR-054, FR-055. Phase: 8, 14.

### US-062 Action queue review + webhook investigation

`As P-BAI-OPERATOR, I want to inspect AI-triggered action runs filtered by tenant/booking/status/dependency, plus webhook backlog.`

- AC1: Given Reliability lane, Then filters by tenant/booking/lifecycle event/status/dependency.
- Priority: P0. Effort: L. FR: FR-057. Phase: 18.

### US-063 Admin booking responsive table

`As P-BAI-OPERATOR on mobile (390-720px), I want booking table to render as cards instead of horizontal scroll fallback.`

- AC1: Given viewport ≤720px, Then per-row card layout with hidden header + per-field labels.
- Priority: P1. Effort: M. FR: FR-058. Phase: 17 (P1-7 closed 2026-04-26 partial; product suite re-run pending).

### US-064 Tenant Revenue Proof dashboard

`As P-INVESTOR-JUDGE / P-BAI-OPERATOR, I want a tenant revenue proof dashboard with paid/outstanding/overdue/manual-review breakdown.`

- AC1: Given investor-only access, Then one tenant's real evidence renders end-to-end.
- Priority: P1. Effort: L. FR: FR-059, FR-110. Phase: 21.

---

## EP-08 — CRM, Email, Billing Lifecycle

Phase: `5`, `21`. Owner: Backend + Integrations.

### US-070 Zoho CRM adapter

`As Backend lead, I want Zoho lead/contact/deal/task sync with retry + manual-review, so that CRM remains enrichment, not source of truth.`

- AC1: Given lead, Then Zoho sync record created; failure → retry; permanent fail → manual_review state.
- Priority: P0. Effort: L. FR: FR-103. Phase: 5.

### US-071 Email lifecycle templates

`As P-SME-OWNER, I want confirmation/reminder/thank-you/monthly-report templates with delivery & failure tracking.`

- AC1: Given send, Then `email_message` + `email_event` rows created; HTML escape customer-controlled vars (NFR-013).
- Priority: P0. Effort: L. FR: FR-101, FR-102. Phase: 5.

### US-072 Channel-aware email templates with `info@bookedai.au`

`As P-END-CUSTOMER, I want emails to mention the correct chat channel (web, Telegram, WhatsApp) and reply-to info@bookedai.au.`

- Priority: P1. Effort: M. FR: FR-079. Phase: 21 (P1-10).

### US-073 Billing & receivables truth

`As P-SME-OWNER + P-BAI-OPERATOR, I want tenant billing summaries (paid/outstanding/overdue/manual-review) + admin reconciliation views.`

- AC1: Given Phase 21 close, Then tenant billing tab + admin reconciliation lane render real evidence.
- Priority: P0. Effort: XL. FR: FR-122, FR-123, FR-124, FR-125, FR-114. Phase: 21.

### US-074 Subscription + invoice linkage

`As P-PARENT-ACADEMY, I want chess subscription checkout + invoice linkage + retention rescue.`

- AC1: Given recurring student, Then Stripe subscription + invoice mirrored to BookedAI; failed payment triggers rescue.
- Priority: P0. Effort: XL. FR: FR-022, FR-102. Phase: 21.

---

## EP-09 — Messaging Automation Layer (Phase 19)

Phase: `19`. Owner: Backend + AI + Security.

### US-080 Shared MessagingAutomationService

`As Backend lead, I want one service handling web chat + Telegram + WhatsApp + (later SMS/email) inbound with shared booking-care policy.`

- AC1: Given any channel inbound, Then path: webhook → normalized Inbox event → policy → side effects → provider reply.
- Priority: P0. Effort: XL. FR: FR-070, FR-071, FR-072. Phase: 19.

### US-081 Telegram secret-token + Evolution HMAC verification

`As Security lead, I want Telegram `X-Telegram-Bot-Api-Secret-Token` + Evolution `X-BookedAI-Signature` HMAC-SHA256 verification.`

- AC1: Given missing/invalid signature, Then 401/403 returned; no policy run.
- Priority: P0. Effort: M. FR: NFR-011, FR-074. Phase: 19 (P0-3 closed live 2026-04-26).

### US-082 Webhook idempotency table + route gate

`As Reliability lead, I want inbound webhook idempotency for WhatsApp/Evolution/customer Telegram so duplicates don't double-process.`

- AC1: Given duplicate event, Then 200 returned + no-op.
- Priority: P0. Effort: M. FR: NFR-012, FR-077. Phase: 19 (P0-4 local; live deploy follow-up).

### US-083 actor_context.tenant_id validator on public assistant routes

`As Security lead, I want validator failing tenant-scoped queries missing tenant_id.`

- AC1: Given request without tenant_id, Then 400 + structured log.
- Priority: P0. Effort: S. FR: FR-078, NFR-010. Phase: 19 (P0-5).

### US-084 BookedAI Manager Bot identity alignment

`As P-END-CUSTOMER, I want consistent `BookedAI Manager Bot` identity across web chat / Telegram / WhatsApp.`

- AC1: Telegram = `@BookedAI_Manager_Bot`; WhatsApp = `+61455301335` + `info@bookedai.au`.
- Priority: P1. Effort: S. FR: FR-068. Phase: 19.

### US-085 Customer-care policy: 60-day window, 6 turns, ref-based identity

`As Customer-care AI, I want 60-day conversation window, last 6 turns context, ask for booking ref when identity ambiguous, and only queue safe audited cancel/reschedule.`

- AC1: Given ambiguous chat id, Then bot asks for booking ref before answering booking-specific questions.
- AC2: Given clear cancel ask, Then queued + audited; email + CRM mirror sent.
- Priority: P0. Effort: L. FR: FR-062, FR-076. Phase: 19.

### US-086 Telegram service-search shortlist + inline controls

`As P-END-CUSTOMER on Telegram, I want top services with `View n` / `Book n` callbacks + Internet expansion only before search has been widened.`

- AC1: Given service search, Then top N + inline buttons + chat-compatible payload `bookedai_chat_response` returned.
- Priority: P1. Effort: M. FR: FR-070..FR-072. Phase: 19.

### US-087 Telegram booking intent capture

`As P-END-CUSTOMER, I want to reply `Book 1` with name+email/phone+time and have a real booking_intent + portal link created.`

- AC1: Given valid reply, Then booking_intent + contact + lead + booking ref + portal link created; pending payment/follow-up state.
- Priority: P0. Effort: L. FR: FR-070, FR-023. Phase: 19.

### US-088 WhatsApp parity test suite + inline action controls

`As QA lead, I want WhatsApp webhook test parity with Telegram suite + inline action controls.`

- Priority: P1. Effort: M. FR: FR-073. Phase: 19, 20 (P1-2, P1-3).

---

## EP-10 — Portal Care & Continuity (Phase 17, 19)

Phase: `17`, `19`, `20.5`.

### US-090 Portal lookup + auto-login for v1-* refs

`As P-END-CUSTOMER, I want portal.bookedai.au to auto-recognize my booking ref from any of the 4 URL param sources.`

- AC1: Given `?booking_reference=v1-XXX`, Then auto-login + status renders.
- Priority: P0. Effort: M. FR: FR-026, FR-028, FX-7. Phase: 17 (P0-1 closed).

### US-091 Portal request-safe actions

`As P-END-CUSTOMER, I want reschedule/pause/downgrade/cancel as auditable requests, not silent mutations.`

- AC1: Given cancel request, Then request queued + tenant/admin notified; user told `request received`.
- AC2: Destructive actions show confirm modal (NFR-042).
- Priority: P0. Effort: L. FR: FR-027. Phase: 17, 22.

### US-092 Apple Wallet + Google Wallet pass

`As P-END-CUSTOMER, I want a wallet pass for confirmed booking, so I can save it outside the browser.`

- AC1: Given confirmed booking, Then `.pkpass` + Google Wallet link generated.
- Priority: P1. Effort: L. FR: FR-030. Phase: 20.5.

### US-093 Stripe success_url booking-aware return

`As P-END-CUSTOMER, after Stripe checkout I want to land on a booking-aware portal page.`

- AC1: Given Stripe success, Then `success_url` resolves to portal with booking ref + payment-state badge.
- Priority: P1. Effort: M. FR: FR-031. Phase: 20.5.

### US-094 Payment-state badge component

`As P-END-CUSTOMER, I want a clear badge (Stripe ready / QR transfer / Manual review / Pending) on confirmation.`

- Priority: P1. Effort: S. FX-1, FR-022. Phase: 17, 20.5.

### US-095 Tenant session expiry warning

`As P-SME-OWNER, I want a 5-min expiry warning + extend button.`

- Priority: P1. Effort: S. FX-6. Phase: 19.

---

## EP-11 — Widget & Plugin Runtime (Phase 20)

### US-100 Widget identity policy

`As Tenant integrator, I want widget runtime identity for tenant + host origin + page source + campaign + install mode.`

- AC1: Given embed page X, Then runtime extracts tenant, origin, source params.
- Priority: P0. Effort: L. FR: FR-090, FR-091, FR-092. Phase: 20.

### US-101 Tenant install + admin diagnostics

`As P-SME-OWNER, I want install instructions; as P-BAI-OPERATOR, I want validation diagnostics for embedded installs.`

- Priority: P1. Effort: M. FR: FR-093. Phase: 20.

### US-102 Webhook & API triggers

`As Tenant developer, I want webhook events for lead/booking/payment/subscription/invoice/CRM/communication/retention.`

- AC1: Given any lifecycle event, Then webhook delivered with retry + signature.
- Priority: P0. Effort: L. FR: FR-094. Phase: 20.

---

## EP-12 — Multi-Tenant Templates (Phase 22)

### US-110 Vertical template contracts

`As Product, I want contracts for intake/placement/booking/payment/report/retention extracted from chess + Future Swim.`

- Priority: P1. Effort: XL. FR: FR-133, FR-135. Phase: 22.

### US-111 Channel playbooks per template

`As Tenant onboarding, I want pre-configured channel playbook (web chat + Telegram + WhatsApp + email) per vertical.`

- Priority: P1. Effort: L. FR: FR-134. Phase: 22.

### US-112 BaseRepository tenant_id validator + chaos test

`As Security lead, I want every tenant-scoped query failing without tenant_id, with a chaos test asserting it.`

- AC1: Given query missing filter, Then exception raised + structured log.
- Priority: P0. Effort: M. NFR-010. Phase: 22.

### US-113 SMS adapter at /api/webhooks/sms

`As Multi-channel lead, I want SMS booking-care reachable from one tenant via /api/webhooks/sms.`

- Priority: P1. Effort: M. FR: FR-080. Phase: 22.

### US-114 Rate-limiting expansion

`As Security lead, I want rate-limiting on /api/leads, /api/pricing/consultation, /api/demo/*, all webhooks.`

- Priority: P1. Effort: M. NFR-031. Phase: 22.

---

## EP-13 — Demo & Vertical Proof (Chess, Future Swim)

### US-120 Chess academy connected-agent loop

`As P-PARENT-ACADEMY, I want intake→assessment→placement→booking→payment→class→coach input→AI report→follow-up→billing→retention as one continuous flow.`

- AC1: Given new chess parent, Then connected agents move through all stages with portal continuity.
- Priority: P0. Effort: XL. FR: FR-131. Phase: 19, 22.

### US-121 Future Swim Miranda URL hotfix migration `020`

`As Tenant operator, I want Miranda URL fixed via additive migration 020.`

- Priority: P1. Effort: S. FR: FR-132. Phase: 17, 20 (P1-9).

### US-122 Future Swim revenue loop end-to-end

`As Product, I want one Future Swim revenue loop documented end-to-end in Sprint 20.`

- Priority: P0. Effort: XL. FR: FR-132, FR-110. Phase: 20.

---

## EP-14 — QA, Release Discipline, Scale Hardening

Phase: `9`, `23`. Owner: QA + DevOps.

### US-130 Test pyramid implementation

`As QA lead, I want unit (trust, matching, permission, template) + integration (repos, callbacks, sync) + E2E (booking, payment, admin, tenant).`

- Priority: P0. Effort: XL. Source: [`qa-testing-reliability-ai-evaluation-strategy.md`](../architecture/qa-testing-reliability-ai-evaluation-strategy.md).

### US-131 AI evaluation suite

`As AI lead, I want extraction / matching / hallucination / trust-language / payment safety evals.`

- Priority: P0. Effort: L. Phase: 6.

### US-132 Search replay gate threshold

`As QA lead, I want tenant-positive cohort 100% hit, public-web ≥4/7, 0 wrong-domain leak, blocking promotion.`

- Priority: P0. Effort: M. FR: FR-014. Phase: 6, 9.

### US-133 GitHub Actions CI pipeline

`As DevOps lead, I want CI blocking lint/type/test failures.`

- Priority: P0. Effort: M. NFR-070. Phase: 19, 23 (P0-6).

### US-134 Observability stack (Prometheus, Grafana, AlertManager)

`As Reliability lead, I want metrics + dashboards + alerts routed to Discord + PagerDuty.`

- Priority: P0. Effort: L. NFR-060. Phase: 20, 23.

### US-135 Beta DB separation + image registry

`As DevOps lead, I want beta DB separation + git-sha tagged images for ≤5min rollback.`

- Priority: P0. Effort: M. NFR-024. Phase: 23 (P1-6).

### US-136 OpenClaw rootless + host mount scope reduction

`As Security lead, I want OpenClaw running rootless with reduced host mounts.`

- Priority: P0. Effort: M. NFR-014. Phase: 23 (P0-8).

---

## EP-15 — Design System & Frontend Refactor (Phase 22 polish)

### US-140 Design token migration (RF-1..RF-4)

`As Frontend lead, I want raw hex banished, shadows consolidated, radii tokenized, button styles unified.`

- AC1: 619 raw hex → tokens; 22+153 shadows → 4 slots; 16+518 radii → 5 tokens; 12 button styles → 4.
- Priority: P2. Effort: XL. NFR-072, NFR-082. Phase: 22.

### US-141 Code-split BookingAssistantDialog + TenantApp

`As Frontend lead, I want 6K LOC dialog + 4.9K LOC TenantApp split into lazy chunks per workspace nav.`

- Priority: P2. Effort: XL. NFR-073. Phase: 22.

### US-142 Reusable BookingConfirmationPanel + empty-state library

`As Frontend lead, I want one BookingConfirmationPanel replacing 3 duplicates; one empty-state pattern library.`

- Priority: P2. Effort: L. RF-7, RF-8. Phase: 22.

---

## EP-16 — Content & Launch (Phase 17+)

### US-150 Working-backwards release stories

`As Product, I want each major phase to have a desired external story before implementation.`

- AC1: Phase 19/20/21/22/23 each have a one-sentence release story documented.
- Priority: P1. Effort: S. Source: [`prd.md` §4A](../../prd.md). Phase: 17+.

### US-151 Content market-fit topics + lifecycle email segments

`As GTM lead, I want priority content (missed enquiries, slow replies, abandoned bookings, payment uncertainty) + 6 lifecycle email segments documented before any campaign automation.`

- Priority: P1. Effort: M. FR: FR-101. Phase: 21+.

### US-152 Experiment hypotheses with XYZ format

`As Product, I want every wording change to ship with `At least X% of Y will do Z within T`.`

- Priority: P1. Effort: S. Phase: 17+.

---

## Summary

- 16 Epics, ~120 user stories, ~150+ tasks linked to FR-/NFR-/Phase IDs.
- Chi tiết tasks per story: ánh xạ trực tiếp từ [`notion-jira-import-ready.md`](../architecture/notion-jira-import-ready.md) và sprint owner checklists; PM pack giữ task IDs có thể được mở rộng khi chuyển vào Jira/Notion thật.
- Story status, effort points, sprint assignment được track trong PM operating board ([`phase-execution-operating-system-2026-04-26.md`](../development/phase-execution-operating-system-2026-04-26.md)).

## Changelog

- `2026-04-26` initial publication, consolidating Epic/Story/Task hierarchy from jira-epic-story-task-structure, notion-jira-import-ready, phase-3-6/7-8/9 breakdowns, and full-stack review FX-/QW-/RF- items into 16 epics with ~120 stories.
