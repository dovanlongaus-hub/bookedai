# BookedAI Master Roadmap — Whole-Project Plan from Phase 0

Date: `2026-04-26`

Document status: `active master roadmap`

## Purpose

This document is the single end-to-end roadmap for BookedAI from `Phase 0` through `Phase 23` and the post-Sprint-22 horizon. It does three things at once:

- summarizes what was delivered in each historical phase and sprint without resetting already-shipped code back to planning-only status
- applies the seven-lane review captured in `docs/development/full-stack-review-2026-04-26.md` retroactively, so every phase shows whether the review found a defect that originated there
- locks the forward plan for `Sprint 19` through `Sprint 22` and names the post-Sprint-22 horizon themes for `Sprint 23` and `Sprint 24`

It is the canonical reference that all of `docs/architecture/master-execution-index.md`, `docs/architecture/implementation-phase-roadmap.md`, `docs/architecture/solution-architecture-master-execution-plan.md`, `docs/architecture/current-phase-sprint-execution-plan.md`, `docs/development/next-phase-implementation-plan-2026-04-25.md`, `docs/development/roadmap-sprint-document-register.md`, `docs/development/release-gate-checklist.md`, and `docs/development/implementation-progress.md` should resolve to when there is any roadmap-level question.

The phase execution operating system lives at `docs/development/phase-execution-operating-system-2026-04-26.md`. It defines the PM-managed agent lanes, UAT gates, deploy-live gates, closeout template, and current Sprint 19 execution board. No phase should be marked complete without the operating-system gates being closed or explicitly waived with a carried risk.

## Source-of-truth rule

When this document and an older planning artifact disagree, this document wins for the period from `2026-04-26` onward, and the older artifact must be updated in the same closeout pass that triggered the disagreement.

When this document and the actual checked-in code disagree, the checked-in code wins, and this document must be updated in the same closeout.

## Market And Investor Narrative

BookedAI's external story should now lead with SME pain and then lift into the platform thesis:

`BookedAI turns missed service enquiries into booked revenue. It captures intent across chat, calls, email, web, and messaging apps, then helps book, follow up, track payment posture, and show operators what revenue was won or still needs action.`

For investors, judges, and big-tech/startup audiences:

`BookedAI is an AI Revenue Engine for service businesses: an omnichannel agent layer that captures intent, creates booking references, tracks payment and follow-up posture, and records every revenue action in an auditable operating system.`

The roadmap must keep three proof layers visible:

- SME appeal: fewer missed enquiries, faster replies, clearer booking handoff, less admin, and obvious revenue visibility
- AI innovation: tenant-aware search, channel identity policy, shared booking-care agent, auditable action ledger, and reusable vertical templates
- financial clarity: setup fee, SaaS subscription, performance-aligned commission or revenue share where appropriate, and measurable evidence through booking references, payment posture, portal reopen, tenant Ops, and release gates

## Whole-project arc at a glance

| Phase | Theme | Status | Sprint coverage |
|---|---|---|---|
| `0` | Narrative and architecture reset | `done baseline` | `Sprint 1` |
| `1` | Public growth and premium landing rebuild | `implemented baseline` | `Sprint 2`, `Sprint 3` |
| `2` | Commercial data foundation | `partial foundation complete` | `Sprint 4` carry |
| `3` | Multi-channel capture and conversion engine | `strongest active implementation lane` | `Sprint 4`, `Sprint 6` |
| `4` | Revenue workspace and reporting | `partial` | `Sprint 5`, `Sprint 9` |
| `5` | Recovery, payments, and commission operations | `partial foundation` | `Sprint 7`, `Sprint 9` |
| `6` | Optimization, evaluation, and scale hardening | `partially active` | `Sprint 6`, `Sprint 10` |
| `7` | Tenant revenue workspace | `real foundation implemented` | `Sprint 8`, `Sprint 9`, `Sprint 11`, `Sprint 12` |
| `8` | Internal admin optimization and support platform | `real foundation implemented` | `Sprint 10`, `Sprint 13`, `Sprint 14` |
| `9` | QA, release discipline, and scale hardening | `partially active` | `Sprint 15`, `Sprint 16` |
| `17` | Full-flow stabilization (Phase 17 lock) | `active stabilization` | `Sprint 17`, `Sprint 19` overlay |
| `18` | Revenue-ops ledger control | `partially active` | `Sprint 18`, `Sprint 19` overlay |
| `19` | Customer-care and status agent | `started, parity gaps remain` | `Sprint 19`, `Sprint 20`, `Sprint 21` overlay |
| `20` | Widget and plugin runtime | `planned` | `Sprint 20` |
| `20.5` | Wallet and Stripe return continuity | `planned` | `Sprint 20.5` |
| `21` | Billing, receivables, and subscription truth | `planned, scaffolds exist` | `Sprint 21` overlay |
| `22` | Multi-tenant template generalization | `planned` | `Sprint 22` overlay |
| `23` | Release governance and scale hardening | `partially active, hardening required` | `Sprint 22` overlay |

## Cross-cutting findings from the 2026-04-26 review applied to historical phases

The review surfaced four structural risks. Each is anchored to the phase in which it originated and the phase in which it gets resolved.

- `R1` portal continuity gap (`P0-1`): originated in `Phase 7-8` portal/tenant runtime work and `Phase 9` release-grade gating that did not yet require fresh `v1-*` references in the gate; resolved in `Phase 17` stabilization
- `R2` channel parity asymmetry (`P0-2`, `P0-3`, `P0-4`, `P1-2`, `P1-3`): originated in `Phase 3` and `Phase 7` when WhatsApp was added on top of channel-specific business logic before the `Phase 19` shared `MessagingAutomationService` existed; resolved in `Phase 19`
- `R3` service-layer monolith and tenant-scoping enforcement (`P0-5`, `P1-4`, `P1-5`): originated in `Phase 7` tenant workspace expansion that grew faster than the bounded-context split could keep up with; resolved in `Phase 22`
- `R4` operational hygiene and CI/CD gap (`P0-6`, `P0-7`, `P0-8`, `P1-6`): originated across `Phase 6` and `Phase 9` when release discipline was treated as a local script rather than a CI gate; resolved in `Phase 23`

This anchoring is documented in detail in `docs/development/full-stack-review-2026-04-26.md` and is what makes the forward Sprint 19-22 plan more than a punch list: each sprint is closing a gap that has a known origin sprint.

## Phase-by-phase summary

### Phase 0 — Narrative and architecture reset

Covered in `Sprint 1`.

Delivered baseline:

- PRD, roadmap, and architecture aligned around the `AI Revenue Engine` positioning
- pricing and architecture documents already moved away from the chatbot-first framing

Retrospective lens from the `2026-04-26` review:

- no direct review defect originated here
- carry-forward: keep later sprint docs aligned with the shipped product baseline rather than older historical assumptions

Source documents:

- `docs/architecture/phase-0-detailed-implementation-plan.md`
- `docs/architecture/phase-0-epic-story-task-breakdown.md`
- `docs/architecture/phase-0-exit-review.md`
- `docs/development/sprint-1-owner-execution-checklist.md`

### Phase 1 — Public growth and premium landing rebuild

Covered in `Sprint 2` and `Sprint 3`.

Delivered baseline:

- public search-first shell live in code
- multilingual locale switching
- homepage and pitch separated by role
- public booking lane has resilience and progressive search treatment
- shared branding source under `frontend/public/branding/`
- public Playwright suites (responsive, live-read)
- approved public package vocabulary `Freemium`, `Pro`, `Pro Max`, with `Advance Customize` reserved for the registration custom lane

Retrospective lens:

- `P1-7` (phone field accessibility, `aria-describedby`) and `P1-8` (pitch deck Playwright coverage) have origins here because the public surfaces shipped without the form-field accessibility contract and without coverage on `PitchDeckApp.tsx`
- both are scheduled to close in `Sprint 19` and `Sprint 21` respectively

Source documents:

- `docs/architecture/phase-1-2-detailed-implementation-package.md`
- `docs/architecture/sprint-2-implementation-package.md`
- `docs/architecture/sprint-3-implementation-package.md`
- `docs/development/sprint-2-owner-execution-checklist.md`
- `docs/development/sprint-3-owner-execution-checklist.md`

### Phase 2 — Commercial data foundation

Carry through `Sprint 4` and beyond.

Delivered baseline:

- additive tenant and catalog schema support
- SQL migration package through migration `009`
- repository, domain, integration, and shared-contract seams

Retrospective lens:

- no direct review defect originated here, but the migration discipline is what `P0-7` (expanded `.env.production.example` with checksum guard) and `P1-9` (Future Swim Miranda URL hotfix migration `020`) will lean on
- carry-forward: continue moving from additive foundations into a clearer normalized commercial truth model

Source documents:

- `docs/architecture/phase-1-2-detailed-implementation-package.md`
- `docs/architecture/coding-implementation-phases.md`

### Phase 3 — Multi-channel capture and conversion engine

Covered in `Sprint 4` and `Sprint 6`.

Delivered baseline:

- matching and search routes are real
- booking-path and booking-intent routes are real
- semantic transparency and replay tooling are real
- product-route public booking runtime enforces `search → detail preview → explicit Book → confirmation`
- richer Phase 2 matching contract with normalized `booking_fit` and `stage_counts`

Retrospective lens:

- `R2` (channel parity asymmetry) has origins here because the first multi-channel additions did not yet pass through a shared messaging policy
- resolved in `Phase 19` via `MessagingAutomationService`, with the remaining WhatsApp parity gaps tracked as `P0-2`, `P1-2`, `P1-3`

Source documents:

- `docs/architecture/phase-3-6-detailed-implementation-package.md`
- `docs/development/search-truth-remediation-spec.md`
- `docs/development/sprint-6-search-quality-execution-package.md`

### Phase 4 — Revenue workspace and reporting

Covered in `Sprint 5` and `Sprint 9`.

Delivered baseline:

- tenant and admin reporting read surfaces
- revenue, bookings, integrations, billing, and catalog views at workspace level

Retrospective lens:

- the missing `Tenant Revenue Proof` dashboard called out by Lane 3 of the review has its conceptual origin here; the dashboard belongs in `Phase 21` and is scheduled in `Sprint 22`
- carry-forward: finish monthly value, attribution clarity, and unified reporting semantics

Source documents:

- `docs/architecture/analytics-metrics-revenue-bi-strategy.md`
- `docs/architecture/phase-3-6-detailed-implementation-package.md`

### Phase 5 — Recovery, payments, and commission operations

Covered in `Sprint 7` and `Sprint 9`.

Delivered baseline:

- payments, reconciliation, outbox, retry, and reliability seams
- admin support lanes expose operator-facing reliability behavior
- top-level route ownership clarified for admin, webhook, upload, communication, and bounded-context v1 surfaces

Retrospective lens:

- `R2` channel parity asymmetry partially overlaps here because outbound delivery posture (`sent`, `queued`, `failed`, `manual-review`, `unconfigured`) was not strictly enforced in early integrations
- the WhatsApp `P0-2` provider posture decision and the `P1-10` channel-aware email templates are the closing actions, scheduled in `Sprint 19` and `Sprint 21`

Source documents:

- `docs/architecture/crm-email-revenue-lifecycle-strategy.md`
- `docs/architecture/integration-hub-sync-architecture.md`

### Phase 6 — Optimization, evaluation, and scale hardening

Covered in `Sprint 6` and `Sprint 10`.

Delivered baseline:

- release-gate scripts, replay gate, beta and production deploy scripts
- browser smoke coverage
- backend validation passes for public-web fallback and tenant session-signing

Retrospective lens:

- `R4` operational hygiene gap originated here because release discipline lived as local scripts rather than a CI gate
- resolved in `Phase 23` via `P0-6` GitHub Actions CI, scheduled in `Sprint 19`

Source documents:

- `docs/architecture/qa-testing-reliability-ai-evaluation-strategy.md`
- `docs/development/release-gate-checklist.md`

### Phase 7 — Tenant revenue workspace

Covered in `Sprint 8`, `Sprint 9`, `Sprint 11`, `Sprint 12`.

Delivered baseline:

- tenant workspace shell
- tenant auth (Google, password, email-first verification code)
- tenant catalog ownership and publish-safe workflow
- tenant billing and operational panels
- tenant session signing prefers tenant-specific secret

Retrospective lens:

- `R1` portal continuity gap (`P0-1`) and `R3` service-layer monolith (`P1-4`, `P1-5`) both originated here as tenant workspace scope grew faster than the bounded-context split
- both close in `Phase 17` (`Sprint 19`) and `Phase 22` (`Sprint 21`) respectively
- `P1-1` tenant authenticated UAT for catalog edit, billing activation, team is also anchored here and closes in `Sprint 20`

Source documents:

- `docs/architecture/phase-7-8-detailed-implementation-package.md`
- `docs/architecture/tenant-app-strategy.md`
- `docs/development/tenant-implementation-requirements-framework.md`

### Phase 8 — Internal admin optimization and support platform

Covered in `Sprint 10`, `Sprint 13`, `Sprint 14`.

Delivered baseline:

- admin workspace structure
- drift review, diagnostics, support-safe preview tooling

Retrospective lens:

- `P1-7` admin booking responsive-table breakpoint at `≤720px` originates here and closes in `Sprint 19`
- carry-forward: deepen operational closure loops, role safety, and commercial support tooling

Source documents:

- `docs/architecture/internal-admin-app-strategy.md`
- `docs/architecture/admin-enterprise-workspace-requirements.md`

### Phase 9 — QA, release discipline, and scale hardening

Covered in `Sprint 15` and `Sprint 16`.

Delivered baseline:

- release checklist, release rehearsal, search replay gate
- tenant-smoke Playwright lane part of root release gate

Retrospective lens:

- `R4` operational hygiene gap continues here because there is still no GitHub Actions CI, no production-grade `.env.production.example`, no image registry, and no observability stack
- closes in `Phase 23` via `P0-6`, `P0-7`, `P0-8`, `P1-6`, plus the Prometheus/Grafana/AlertManager bring-up, all scheduled `Sprint 19` and `Sprint 20`

Source documents:

- `docs/architecture/phase-9-detailed-implementation-package.md`
- `docs/development/release-gate-checklist.md`

### Phase 17 — Full-flow stabilization

Covered in `Sprint 17` and the `Sprint 19` overlay.

Active deliverables:

- preserve canonical journey `Ask -> Match -> Compare -> Book -> Confirm -> Portal -> Follow-up`
- portal-first Thank You that stays visible
- portal auto-login for valid `v1-*` references
- explicit `Book` gate before contact details open
- progressive search loading with skeleton and staged status
- mobile no-overflow at `390px`

Review-driven additions:

- `P0-1` portal `v1-*` snapshot 500 fix
- `P1-7` accessibility (phone `aria-describedby`) and admin booking responsive `≤720px`
- `P1-8` `PitchDeckApp.tsx` Playwright coverage
- `P1-9` Future Swim Miranda URL hotfix migration apply

A/B activation in this phase:

- `AC-1`, `AC-2`, `AC-3`, `BC-1`, `BC-3`, `BC-4`, `RT-1`, `RT-2`, `RT-3`

Source documents:

- `docs/architecture/current-phase-sprint-execution-plan.md`
- `docs/development/next-phase-implementation-plan-2026-04-25.md`
- `docs/development/full-stack-review-2026-04-26.md`

### Phase 18 — Revenue-ops ledger control

Covered in `Sprint 18` and the `Sprint 19` overlay.

Active deliverables:

- action-run filters by tenant, booking, student, lifecycle event, status, dependency state
- tenant-facing visibility for queued, sent, failed, manual-review, completed
- operator evidence drawers for outbox, audit, job-run, CRM, payment, webhook traces
- policy metadata for auto-run versus approve-first actions

Review-driven additions:

- ledger queries inherit the `BaseRepository` tenant_id validator from `Phase 22` once it ships
- evidence drawers can now build on the Sprint 19 P0-4 webhook/idempotency ledger indexes; UI surfacing remains a follow-up

Source documents:

- `docs/development/phase-18-revenue-ops-ledger-tenant-visibility-2026-04-25.md`

### Phase 19 — Customer-care and status agent

Covered in `Sprint 19` and the `Sprint 20`, `Sprint 21` overlays.

Active deliverables:

- one normalized message envelope across WhatsApp, SMS, Telegram, email, and web chat
- identity resolution by email, phone, booking reference, signed portal session
- intent capture for booking, payment help, reschedule, cancel, follow-up, support escalation, retention
- queued, request-safe mutations
- portal care-turn answering from booking-reference truth
- chess academy parent status flow as the first complete proof case

Review-driven additions:

- `P0-2` WhatsApp provider posture decision (Meta Cloud or Twilio default)
- `P0-3` Telegram secret-token verification plus Evolution HMAC verification (`closed live 2026-04-26`)
- `P0-4` inbound webhook idempotency table and route gate landed locally for WhatsApp, Evolution, and customer Telegram; live deploy/evidence surfacing remains the follow-up
- `P0-5` `actor_context.tenant_id` validator on public assistant routes
- `P1-2` WhatsApp inline action controls and `BookedAI Manager Bot` sender identity alignment
- `P1-3` WhatsApp webhook test parity with Telegram suite
- `P1-10` channel-aware email templates with `info@bookedai.au` and chat-channel mention

A/B activation in this phase:

- `CH-1`, `CH-2`, `CH-3`, `CH-4`, `CH-5`

Schema delta:

- add `location_posture` to chat response shape; propagate web, Telegram, WhatsApp; unlocks `BC-1`

Source documents:

- `docs/development/messaging-automation-telegram-first-2026-04-26.md`
- `docs/development/whatsapp-twilio-default-2026-04-26.md`
- `docs/development/whatsapp-direct-provider-override-2026-04-26.md`
- `docs/development/telegram-manager-bot-result-ux-2026-04-26.md`
- `docs/development/customer-booking-support-contact-defaults-2026-04-26.md`

### Phase 20 — Widget and plugin runtime

Planned in `Sprint 20`.

Deliverables:

- widget deployment identity for tenant, host origin, page source, campaign, install mode
- embed-safe assistant shell for receptionist, sales, customer-service entry
- shared booking, payment, portal, revenue-ops handoff contracts
- tenant install instructions and admin validation diagnostics

Review-driven preconditions:

- `P0-3`, `P0-4`, `P0-5`, `P1-2` must be live before the widget runtime extends the same shared messaging policy to embedded surfaces

Source documents:

- `docs/development/widget-plugin-multi-tenant-booking-architecture-2026-04-23.md`

### Phase 20.5 — Wallet and Stripe return continuity

Planned in `Sprint 20.5`.

Deliverables:

- Apple Wallet `.pkpass` and Google Wallet pass for confirmed bookings
- Stripe checkout `success_url` resolves to a booking-aware return URL
- portal auto-login self-test for `?booking_reference=...`

Review-driven pairing:

- ship together with `BC-2` confirmation hero payment-state badge so the customer can tell which payment state is active when the pass downloads or Stripe returns

### Phase 21 — Billing, receivables, and subscription truth

Planned in `Sprint 21` overlay.

Deliverables:

- real subscription checkout and invoice linkage where supported
- payment reminder and receivable recovery actions
- tenant billing summaries for paid, outstanding, overdue, manual-review revenue
- admin reconciliation views

Review-driven additions:

- ship the `Tenant Revenue Proof` dashboard for investor-only or limited tenant access
- ship pricing and commission visibility inside the tenant workspace (current plan, commission rate, billing history)

### Phase 22 — Multi-tenant template generalization

Planned in `Sprint 22` overlay.

Deliverables:

- vertical template contracts for intake, placement, booking, payment, report, retention policy
- channel playbooks per template
- reusable verified-tenant search-result contract
- migration notes for moving one-off demo logic into tenant-safe policy/config records

Review-driven additions:

- `P1-4` split `tenant_app_service.py` into `tenant_overview_service`, `tenant_billing_service`, `tenant_catalog_service`
- `P1-5` move raw SQL out of `route_handlers.py` into repository read models
- add `BaseRepository` validator that fails any tenant-scoped query missing a `tenant_id` filter; chaos test
- add SMS adapter at `/api/webhooks/sms` reusing the shared identity/mutation policy

A/B activation in this phase:

- `BC-2`, `CH-1`, `CH-3` as wave 2

### Phase 23 — Release governance and scale hardening

Spans `Sprint 19`, `Sprint 20`, `Sprint 21`, `Sprint 22` overlays.

Deliverables:

- one release-gate suite covering pitch registration, product booking, demo academy flow, portal continuation, tenant workspace, admin ledger, API health
- stronger trace ids
- documented rollback and hold criteria
- Notion and Discord closeout automation

Review-driven additions:

- `P0-6` GitHub Actions CI pipeline
- `P0-7` expanded `.env.production.example` with checksum guard
- `P0-8` OpenClaw root drop and host mount scope reduction
- `P1-6` beta database separation and image registry with `git-sha` tags
- bring up Prometheus, Grafana, AlertManager with Discord and PagerDuty routing
- record the new webhook signature, idempotency, and tenant_id validator gates in the release-gate checklist

## Sprint map (Sprint 1 through Sprint 22)

| Sprint | Phase target | Theme | Status |
|---|---|---|---|
| `1` | `0` | Reset and alignment | `complete` |
| `2` | `1` | Brand system and landing architecture | `complete` |
| `3` | `1` | Premium public implementation | `materially complete` |
| `4` | `3`, `2` | Commercial contracts and first contract-runner scaffold | `partial` |
| `5` | `4` | Reporting and widget APIs | `partial` |
| `6` | `3`, `6` | Attribution, conversion, search-quality runner | `substantial` |
| `7` | `5` | Recovery workflows | `partial foundation` |
| `8` | `7` | Tenant onboarding and searchable supply | `material` |
| `9` | `4`, `7` | Tenant revenue workspace foundation | `foundation` |
| `10` | `8`, `6` | Admin commercial operations | `foundation` |
| `11` | `7` | Tenant IA and API preparation | `partial` |
| `12` | `7` | Tenant workspace publish-safe completion | `overlapping, pending` |
| `13` | `8` | Admin IA and commercial drill-ins | `active` |
| `14` | `7`, `8` | Tenant billing, support readiness, route/auth hardening | `active` |
| `15` | `9` | Telemetry, regression coverage, tenant value, search carry-forward | `planned, overlap` |
| `16` | `9` | Release gates, rollout discipline, route/auth ownership closeout | `release-hardening closeout` |
| `17` | `17` | Full-flow stabilization (UI/UX, booking flow, messaging policy) | `active` |
| `18` | `18` | Revenue-ops ledger control | `partial` |
| `19` | `17`, `19`, `23` overlay | Stabilize and Sign — close all P0 from review | `2026-04-27 → 2026-05-03` |
| `20` | `17`, `19`, `21`, `23` overlay | First Real Revenue Loop — Future Swim trace + first A/B wave | `2026-05-04 → 2026-05-10` |
| `21` | `19`, `22`, `23` overlay | Refactor and Coverage | `2026-05-11 → 2026-05-17` |
| `22` | `19`, `20`, `21`, `22`, `23` overlay | Multi-tenant and Multi-channel | `2026-05-18 → 2026-05-24` |

## A/B testing matrix

The full sixteen-experiment matrix is defined in `docs/development/full-stack-review-2026-04-26.md` and is not duplicated here. The activation cadence is:

- Wave 1 in `Sprint 20`: `AC-1`, `RT-1`, `RT-3`, `CH-1`
- Wave 2 in `Sprint 22`: `BC-2`, `CH-1`, `CH-3`
- Continuing experiment: `TN-1` `tenant_variant=control|revenue_ops` keeps running until each variant has at least `500` impressions and the conversion delta is stable for two consecutive weeks
- Continuing experiment: `RT-2` `portal_variant=status_first|control` continues from the existing portal IA work

Each experiment must follow the shared telemetry contract documented in the review (query parameter assignment, `localStorage` persistence, browser custom event plus optional `dataLayer` push, no third-party JavaScript required).

## Sprint 19-22 forward plan (canonical)

This plan is the canonical forward execution path. The same content is reflected in `docs/architecture/current-phase-sprint-execution-plan.md`, `docs/development/next-phase-implementation-plan-2026-04-25.md`, and `docs/development/roadmap-sprint-document-register.md`, but this is the source-of-truth version.

### Sprint 19 — `2026-04-27 → 2026-05-03` — Stabilize and Sign

- target phases: `17`, `19`, `23`
- close all eight P0 items: `P0-1`, `P0-2`, `P0-3`, `P0-4`, `P0-5`, `P0-6`, `P0-7`, `P0-8`
- ship `P1-7` accessibility and admin responsive
- exit gate: portal `v1-*` UAT green; CI blocks lint/type/test failures; OpenClaw rootless

### Sprint 20 — `2026-05-04 → 2026-05-10` — First Real Revenue Loop

- target phases: `17`, `19`, `21`, `23`
- close `P1-1`, `P1-2`, `P1-5`, `P1-9`
- one Future Swim revenue loop documented end-to-end
- bring up Prometheus, Grafana, AlertManager
- activate A/B `AC-1`, `RT-1`, `RT-3`, `CH-1`
- publish v1 of `Commercial and Compliance Checklist`
- exit gate: ≥500 impressions per variant on at least four experiments; observability dashboards live

### Sprint 21 — `2026-05-11 → 2026-05-17` — Refactor and Coverage

- target phases: `19`, `22`, `23`
- close `P1-3`, `P1-4`, `P1-6`, `P1-8`, `P1-10`
- ship `location_posture` field unlocking `BC-1`
- replace bare `except Exception` blocks with `IntegrationAppError`/`ValidationAppError` plus structured logging
- exit gate: `tenant_app_service` shrunk to a thin shim; tagged image rollback under five minutes on staging

### Sprint 22 — `2026-05-18 → 2026-05-24` — Multi-tenant and Multi-channel

- target phases: `19`, `20`, `21`, `22`, `23`
- ship `BaseRepository` tenant_id validator with chaos test
- ship SMS adapter at `/api/webhooks/sms`
- ship `Tenant Revenue Proof` dashboard
- ship pricing and commission visibility in tenant workspace
- run A/B wave 2 (`BC-2`, `CH-1`, `CH-3`)
- extend rate-limiting to `/api/leads`, `/api/pricing/consultation`, `/api/demo/*`, webhooks
- exit gate: one new vertical reuses the shared template path; SMS booking-care reachable from one tenant; tenant revenue proof dashboard renders one tenant's real evidence

## Post-Sprint-22 horizon (Sprint 23 and Sprint 24, indicative)

The following themes are not yet committed but are the most likely next-quarter tracks once Sprint 22 closes. They fall under post-`Phase 23` work.

### Sprint 23 candidate theme — Vertical Expansion (`2026-05-25 → 2026-05-31`)

- second tenant on the Future Swim or chess template, end to end
- Apple Messages and email channel adapters reusing the shared messaging policy
- A/B wave 3 (`AC-2`, `AC-3`, `CH-2`, `CH-4`, `CH-5`)
- admin operator coverage of the revenue-ops ledger across two tenants concurrently

### Sprint 24 candidate theme — Investor and Compliance Closeout (`2026-06-01 → 2026-06-07`)

- second tenant published with revenue evidence in the dashboard
- Commercial and Compliance Checklist v2 with all remediation completed
- pitch deck refreshed against the live `Tenant Revenue Proof` dashboard
- pricing changes (if any) shipped end-to-end through tenant workspace and public surfaces
- runbook for paid customer onboarding and self-serve account creation

## Documentation map

The canonical documentation chain is:

- `prd.md` and `project.md` — top-level product and project description
- `docs/architecture/bookedai-master-prd.md` — master PRD with detailed product surface, search truth, AI agent, booking, tenant, widget, admin, CRM, analytics, pricing, demo, non-functional, success metrics, delivery priorities, and delivery phase requirements
- `docs/architecture/bookedai-master-roadmap-2026-04-26.md` (this document) — single end-to-end roadmap
- `docs/architecture/master-execution-index.md` — short top-level execution index that points here
- `docs/architecture/implementation-phase-roadmap.md` — phase deliverables and current status by sprint
- `docs/architecture/solution-architecture-master-execution-plan.md` — solution-architect view, workstream model, dependency map, release gating, top risks
- `docs/architecture/current-phase-sprint-execution-plan.md` — bridge between roadmap intent and checked-in code reality
- `docs/development/next-phase-implementation-plan-2026-04-25.md` — Phase 17-23 detailed implementation plan
- `docs/development/full-stack-review-2026-04-26.md` — seven-lane review canonical input
- `docs/development/roadmap-sprint-document-register.md` — sprint-to-document mapping
- `docs/development/release-gate-checklist.md` — promote, hold, rollback discipline
- `docs/development/implementation-progress.md` — dated change log

## Closeout responsibilities

Whenever a sprint closes, this document must be updated in the same closeout pass with:

- updated status in the whole-project arc table
- updated status in the sprint map
- a one-line change-log entry at the bottom of this document
- and a corresponding entry in `docs/development/implementation-progress.md`

Whenever a P0 or P1 from `docs/development/full-stack-review-2026-04-26.md` is delivered, this document must be updated in the same closeout pass with:

- the relevant phase section now showing the item as `closed`
- the corresponding `R1`/`R2`/`R3`/`R4` cross-cutting note marked as resolved
- a change-log entry at the bottom of this document

## Change log

- `2026-04-26` initial publication, integrating the seven-lane review across the whole project arc from Phase 0 through the post-Sprint-22 horizon
