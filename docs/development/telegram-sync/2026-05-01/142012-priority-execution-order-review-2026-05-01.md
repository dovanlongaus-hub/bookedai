# Priority execution order review 2026-05-01

- Timestamp: 2026-05-01T14:20:12.427463+00:00
- Source: docs/development/priority-execution-order-2026-05-01.md
- Category: planning
- Status: completed

## Summary

Reviewed the latest BookedAI plan stack and created the active execution priority overlay: automation safety, confirmation/status truth, portal truth, operator evidence, Future Swim UAT, commercial truth, backend hot paths, installability, reusable templates, then release governance.

## Details

# BookedAI Priority Execution Order

Date: `2026-05-01`

Status: `active priority overlay`

Purpose: review the new planning stack after the latest requirement-doc sync, PR merges, and live deploy, then define the practical execution order for the next work.

This document does not replace the PRD, roadmap, or backlog. It is the priority lens for choosing what to execute first.

## Inputs Reviewed

- `project.md`
- `docs/architecture/bookedai-master-prd.md`
- `docs/pm/01-MASTER-PRD.md`
- `docs/pm/03-EXECUTION-PLAN.md`
- `docs/development/final-consolidated-execution-plan-2026-05-01.md`
- `docs/development/pre-coding-implementation-backlog-2026-05-01.md`
- `docs/development/pre-coding-master-checklist-2026-05-01.md`
- `docs/pm/12-FUTURESWIM-FEATURE-REQUIREMENTS-AND-STATUS.md`
- `docs/architecture/phase-a-technical-foundation-decision-package-2026-05-01.md`
- `docs/architecture/backend-scale-discipline-plan-2026-05-01.md`
- `docs/architecture/frontend-consolidation-migration-plan-2026-05-01.md`
- `docs/architecture/container-topology-and-service-boundary-spec-2026-05-01.md`
- `docs/architecture/n8n-role-boundary-map-2026-05-01.md`
- `docs/development/implementation-progress.md`

## Review Findings

The plan is directionally correct, but execution needs a stricter priority filter.

Main findings:

- The project is no longer greenfield. Public search, product booking, portal, tenant, admin, messaging, CRM/Calendar, Stripe/payment posture, Future Swim, Chess, AI Mentor, and live deploy paths already exist.
- The biggest near-term risk is not lack of features; it is inconsistent truth across booking confirmation, payment state, portal state, messaging, tenant/admin evidence, and recurring communications.
- Phase A foundation decisions are mostly documented. The next engineering work should apply them through bounded, revenue-protecting slices rather than broad rewrites.
- Future Swim is now the freshest live proof lane and should be used as the next strict UAT/revenue loop, but only after safety and truth contracts are clear.
- Recurring or automated communication must stay default-off / explicit-opt-in / kill-switchable. No surprise automation is a hard P0 governance rule.
- BL-14A monetization is important, but it should not start as UI-only billing screens. It needs status vocabulary, evidence visibility, and booking/payment truth first.
- Widget/API/installability work should not outrun the shared portal, confirmation, tenant identity, and evidence contracts.
- Vertical depth should prove reuse of shared primitives. Future Swim, Chess, and AI Mentor must not become three isolated product stacks.

## Priority Principles

Use this decision order for all incoming work:

1. Protect live customer and operator truth.
2. Prevent accidental or surprise automation.
3. Close the shortest searchable-to-paid-to-supported loop.
4. Make operator evidence visible before adding new automation.
5. Make commercial truth clear before broad platform scale.
6. Standardize install/API/widget paths after the core loop is stable.
7. Deepen verticals only through shared primitives.
8. Use release governance as a continuous gate, not a final cleanup phase.

## Priority Stack

### P0. Safety And Governance Gate

Do first, before opening broad feature work.

Scope:

- enforce `NFR-054` no-surprise automation posture
- confirm recurring customer communications are default-off unless tenant flag and care-list membership are explicit
- ensure any scheduled/recurring send has owner, kill switch, audit, idempotency, and manual override rules
- keep Discord skipped unless explicitly requested

Why first:

- Recent Future Swim and Chess broadcast/monthly reminder work makes automation safety an immediate live concern.

Acceptance gate:

- one registry or checklist identifies active scheduled/recurring jobs, owner, cadence, enabled flag, opt-in/audience rule, and kill switch
- no recurring send can silently blast all contacts

### P1. Truth-Layer Contract

Execute as one package, not scattered tickets.

Backlog mapping:

- `BL-1 Final-choice confirmation matrix`
- `BL-2 Canonical status vocabulary rollout`

Scope:

- define final confirmation before booking, payment, reschedule/cancel, document submission, broadcast/send, and human handoff
- define canonical states for `request received`, `confirmed`, `payment pending`, `paid`, `synced`, `manual review`, `queued`, `failed`, `waitlist`, `recoverable`, and `cancel/change requested`
- map status wording across public/product, portal, messaging, tenant, admin, email/SMS/WhatsApp/Telegram

Why now:

- Every later item depends on not overclaiming booking, payment, sync, or automation completion.

Acceptance gate:

- shared matrix exists
- copy/state map exists
- first regression target is named

### P2. Portal Truth And Customer Care Loop

Backlog mapping:

- `BL-3 Portal truth completion pass`
- Phase `19` customer-care/status agent

Scope:

- booking detail, payment posture, QR, portal reopen, messages, request-safe cancel/reschedule/help
- identity checks through signed portal, explicit booking reference, or safe phone/email match
- portal/customer-care state must not diverge from messaging replies

Why before monetization:

- Billing and commission are only credible when booking/payment/customer-care truth is stable.

Acceptance gate:

- one fresh booking reference can be reopened in portal, asked about via care, and shown with truthful payment/support state

### P3. Tenant/Admin Evidence Visibility

Backlog mapping:

- `BL-4 Tenant/admin evidence visibility pass`
- Phase `18` revenue-ops ledger control

Scope:

- tenant/admin evidence drawer for booking, payment, CRM, Calendar, email, messaging, webhook, broadcast, and automation events
- visible states for sent, queued, retrying, failed, manual review, skipped-disabled, completed
- operator action queue for failures or required review

Why now:

- Operators need to see what happened before BookedAI adds more lifecycle automation or charges commission.

Acceptance gate:

- at least one tenant shows end-to-end evidence for search/booking/payment/message/provider sync

### P4. Future Swim Strict Revenue Loop UAT

Backlog mapping:

- `BL-9 Future Swim proof-lane closeout map`
- Future Swim Phase `3.2C`, `3.3`, `4.1`

Scope:

- real parent/coach/staff UAT
- Future Swim staff tenant-admin onboarding
- booking flow QA with real parent, Zoho lead, SMS/email/portal proof
- Future Swim Ask voice/chat wiring only after truth contract is clear
- automated calendar reminders only after no-surprise automation gate passes

Why Future Swim first:

- It is the freshest operations-heavy proof lane and will expose the hardest truth gaps: parent, student, coach, centre, booking, progress, message, and broadcast.

Acceptance gate:

- one Future Swim loop can be demonstrated: ask/search -> class option -> confirmation -> booking/request -> CRM/SMS/email -> portal -> coach/tenant evidence -> follow-up posture

### P5. Commercial Truth BL-14A

Backlog mapping:

- `BL-14A BookedAI monetization and commission operating baseline`
- Phase `21`

Execute sub-slices in this order:

1. tenant commercial profile
2. setup/subscription state machine
3. commission policy and event pipeline
4. revenue summary and operator action queue
5. audit, wording, and acceptance gate

Why after P1-P3:

- Monetization depends on truthful booking, payment, sync, and action evidence.

Acceptance gate:

- one tenant shows setup fee posture, subscription posture, booking-linked commission posture, tenant revenue, BookedAI revenue, and action-needed state without spreadsheet interpretation

### P6. Backend Scale Discipline In The Hot Paths

Backlog mapping:

- Phase `18`, `19`, `22`, `23`
- architecture top-5 recommendations

Scope:

- schema normalization wave for `bookings`, `payments`, `audit_outbox`, `tenants`
- permission registry in `backend/security/permissions.py`
- move hot raw SQL out of request handlers where it touches tenant/commercial truth
- outbox/worker discipline for provider side effects

Why here:

- Do not refactor the whole backend. Refactor the paths that block truthful revenue operation.

Acceptance gate:

- new writes/read models have tenant-safe query patterns, clear owner module, and parity tests

### P7. Widget/API/Installability Foundation

Backlog mapping:

- `BL-15 Scale-ready API family architecture map`
- `BL-16 Partner widget and installability baseline`
- `BL-17 Tenant-isolated AI ingestion pipeline map`
- `BL-18 Shared-portal plus enterprise-portal strategy`

Scope:

- versioned API families
- widget identity, domain allowlisting, diagnostics
- tenant ingestion into isolated tenant data/search boundaries
- shared portal default; dedicated portal only for enterprise exceptions

Why after commercial truth:

- Installability multiplies both good and bad behavior. It should wait until confirmation, portal, evidence, and commercial state are stable.

Acceptance gate:

- one new tenant/partner can be onboarded with repeatable install checklist, widget/API diagnostics, booking proof, and portal strategy

### P8. Vertical Depth Through Shared Templates

Backlog mapping:

- `BL-10 Chess proof-lane expansion map`
- `BL-11 AI Mentor proof-lane expansion map`
- `BL-20 Reusable vertical-template pack`

Priority:

1. Future Swim operations template
2. Chess class/program template
3. AI Mentor session/action-plan template

Scope:

- reuse shared search, booking, portal, payment posture, messaging, tenant/admin, and revenue proof
- avoid separate logic forks unless the vertical has a documented exception

Acceptance gate:

- one reusable vertical template can create a new tenant path without copying isolated app logic

### P9. Release Governance And Observability

Backlog mapping:

- `BL-21 Release-governance finalization`
- Phase `23`

Scope:

- CI/release gate
- split frontend artifacts and smoke lanes
- image registry / rollback
- structured logs, trace ids, metrics, error tracking
- canonical layer map

Why continuous:

- This should run alongside every P0-P8 slice, but it should not block small truth-layer fixes unless the change touches production risk.

Acceptance gate:

- each priority slice names test, deploy, smoke, rollback, and documentation requirements before coding starts

## Immediate Execution Queue

This is the recommended next queue:

1. Create the automation / recurring communications safety registry and kill-switch checklist.
2. Produce the BL-1 / BL-2 confirmation + status matrix.
3. Implement the first confirmation/status contract on the highest-risk mutation path: booking/payment/cancel-reschedule.
4. Complete portal truth UAT for one fresh booking reference.
5. Add tenant/admin evidence visibility for that same reference.
6. Run the Future Swim strict UAT loop and document gaps.
7. Onboard real Future Swim staff into tenant admin so Broadcasts can be used safely by an accountable operator.
8. Start BL-14A commercial profile and setup/subscription state machine.
9. Add commission event pipeline only after payment/booking evidence is visible.
10. Begin widget/API installability mapping only after the above loop is green.

## Deprioritize For Now

Hold these unless they directly unblock a P0/P1 item:

- broad Next.js migration beyond the approved foundation plan
- generic marketplace breadth
- deep vertical-only features without shared primitive reuse
- dedicated enterprise portal before shared portal truth is complete
- advanced billing variations before setup/subscription/commission truth is stable
- scheduled automation without explicit owner, opt-in, idempotency, and kill switch
- new n8n-owned business logic

## Go / No-Go Rule

Move a task into coding only when:

- it maps to one priority above
- it passes `docs/development/pre-coding-master-checklist-2026-05-01.md`
- final-choice/status implications are clear
- tenant isolation and evidence expectations are clear
- verification and live-smoke path are known
- Notion/archive closeout is planned if operator-visible
- Discord is skipped unless explicitly requested

## One-Line Rule

Next work should move in this order:

`automation safety -> confirmation/status truth -> portal truth -> operator evidence -> Future Swim UAT -> commercial truth -> hot-path backend discipline -> installability -> reusable vertical templates -> release governance`.
