# BookedAI Next Phase Implementation Plan

Date: `2026-04-25`

Status: `active implementation plan`

## Purpose

This plan converts the completed full-flow QA and connected-agent work into the next executable delivery phases for BookedAI.

It should be read with:

- `project.md`
- `prd.md`
- `docs/architecture/implementation-phase-roadmap.md`
- `docs/architecture/current-phase-sprint-execution-plan.md`
- `docs/development/implementation-progress.md`
- `docs/development/sprint-13-16-user-surface-delivery-package.md`

## Current Release Baseline

The latest verified baseline is:

- pitch package registration completes from `pitch.bookedai.au` through `/register-interest`
- product booking completes from `product.bookedai.au` through search, match, booking intent, payment intent, and communication best-effort work
- booking success now shows a Thank You state and returns to the main BookedAI screen after `5s`
- the homepage customer-facing agent now keeps a visible chat thread and can spawn revenue-ops handoff actions after booking
- the revenue-ops action ledger has admin visibility, dispatch, transition, and evidence inspection seams
- production deploy and stack health checks passed after the full-flow release gate

## Phase 17 - Full-Flow Stabilization

Objective:

- keep pitch, product, demo, portal, tenant, admin, and API flows stable as one connected revenue engine

Deliverables:

- preserve the `search -> match -> book -> pay/prepare payment -> follow up -> Thank You -> return home` customer journey
- keep package registration resilient when calendar, Stripe, event-store, or dual-write side effects degrade
- keep public booking confirmation immediate while downstream automation runs best effort
- maintain compact mobile UI for package boxes, result cards, forms, and action controls

Acceptance gates:

- backend booking tests pass
- frontend production build passes
- live browser smoke reaches Thank You and auto-return
- no horizontal overflow on pitch, product, demo, or registration mobile views

## Phase 18 - Revenue-Ops Ledger Control

Objective:

- make post-booking revenue operations inspectable, dispatchable, and tenant/admin-safe

Deliverables:

- expand action-run filters by tenant, booking, student/customer, lifecycle event, status, and dependency state
- add tenant-facing visibility for queued, sent, failed, manual-review, and completed actions
- add operator evidence drawers for outbox, audit, job-run, CRM, payment, and webhook traces
- require policy metadata for auto-run versus approve-first actions

Acceptance gates:

- action queue tests cover dispatch, transition, idempotency, and degraded provider states
- admin Reliability can show the complete handoff chain for a booking
- tenant workspace can explain what BookedAI did after a lead or booking event

## Phase 19 - Customer-Care And Status Agent

Objective:

- let returning customers ask about bookings, payments, subscriptions, reports, and support state without losing lifecycle context

Deliverables:

- identity resolution by email, phone, booking reference, and signed portal session
- status answers backed by booking, payment, subscription, report, communication, and action-run truth
- safe request flows for reschedule, pause, downgrade, cancel, payment help, and human escalation
- chess academy parent status flow as the first complete proof case

Acceptance gates:

- portal and assistant can reopen the same booking/student lifecycle state
- unsupported actions escalate instead of pretending completion
- support answers cite current state and next step without exposing another tenant's data

## Phase 20 - Widget And Plugin Runtime

Objective:

- make the BookedAI customer-facing agent installable on SME-owned websites while preserving shared platform truth

Deliverables:

- widget deployment identity for tenant, host origin, page source, campaign, and install mode
- embed-safe assistant shell for receptionist, sales, and customer-service entry
- shared booking, payment, portal, and revenue-ops handoff contracts
- tenant install instructions and admin validation diagnostics

Acceptance gates:

- at least one tenant-branded widget can complete search, booking, Thank You, and portal continuation
- origin and tenant scoping are visible in logs and action runs
- cross-origin behavior is covered by CORS and browser smoke tests

## Phase 21 - Billing, Receivables, And Subscription Truth

Objective:

- connect customer payment state, tenant billing posture, commission, and subscription renewal into one auditable commercial layer

Deliverables:

- real subscription checkout and invoice linkage where supported
- payment reminder and receivable recovery actions
- tenant billing summaries for paid, outstanding, overdue, and manual-review revenue
- admin reconciliation views for payment dependency state and follow-up actions

Acceptance gates:

- payment and subscription states never overstate paid status
- receivable reminders are policy-gated and replay-safe
- tenant/admin revenue summaries reconcile to the same source records

## Phase 22 - Multi-Tenant Template Generalization

Objective:

- extract the chess and Future Swim proof paths into reusable tenant templates without weakening the first verticals.

Deliverables:

- vertical template contracts for intake, placement, booking, payment, report, and retention policy
- tenant-configurable copy and workflow settings for education, kids activities, wellness, trades, and professional services
- reusable smoke fixtures for each approved vertical
- migration notes for moving one-off demo logic into tenant-safe policy/config records

Acceptance gates:

- new verticals reuse the same lifecycle/action contracts rather than branching into custom-only code
- demo, product, and tenant flows can identify which template policy drove the visible behavior
- tests prove at least three vertical templates can reach booking and revenue-ops handoff

## Phase 23 - Release Governance And Scale Hardening

Objective:

- make deployment, QA, observability, rollback, and documentation sync boring and repeatable.

Deliverables:

- one release-gate suite covering pitch registration, product booking, demo academy flow, portal continuation, tenant workspace, admin ledger, and API health
- stronger trace ids from public session through booking, payment, action run, job run, and outbox
- documented rollback and hold criteria for public, backend, worker, and proxy changes
- Notion and Discord closeout automation for meaningful releases

Acceptance gates:

- release gate runs before production promotion
- failures identify the exact surface and lifecycle stage
- docs and memory are updated in the same closeout as code changes

## Immediate Execution Order

1. Finish Phase 17 release documentation and GitHub submission for the current full-flow stabilization work.
2. Implement Phase 18 tenant/admin action-ledger visibility and evidence completeness.
3. Implement Phase 19 customer-care status responses against academy and booking state.
4. Implement Phase 20 widget install identity and one tenant-branded full-flow proof.
5. Implement Phase 21 billing and receivable truth after action-ledger evidence is reliable.
6. Generalize into Phase 22 templates only after chess and Future Swim remain green through the release gate.
7. Fold every new phase into Phase 23 release governance before broadening scope again.

## Verification Plan

Each phase must include:

- focused backend tests for API/repository/service behavior
- frontend build or typecheck for touched UI surfaces
- Playwright browser smoke for customer-visible flows
- live or preview smoke only after local tests pass
- docs, memory, roadmap, and implementation-progress updates before GitHub submission
