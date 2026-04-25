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
- booking success now shows a portal-first Thank You state and returns to the main BookedAI screen after `16s`
- reviewed chess tenant search now has an explicit design contract: tenant-backed results stay in the normal shortlist, show verified BookedAI tenant capability chips, and continue into booking/payment/QR/calendar/email/WhatsApp/portal only after an explicit `Book` action
- public/product search cards now require top-left thumbnail/preview treatment, Google Maps actions for physical places, faster staged progress copy, and early-match visibility while deeper checks continue
- the homepage customer-facing agent now keeps a visible chat thread and can spawn revenue-ops handoff actions after booking
- the revenue-ops action ledger has admin visibility, dispatch, transition, and evidence inspection seams
- the pitch and roadmap now visualize the implementation sequence and system architecture directly: `customer surfaces -> AI agents -> booking core -> operations truth`, plus Phase/Sprint `17-23` in the public roadmap dataset
- production deploy and stack health checks passed after the full-flow release gate

## Phase 17 - Full-Flow Stabilization

Objective:

- keep pitch, product, demo, portal, tenant, admin, and API flows stable as one connected revenue engine

Deliverables:

- preserve the `search -> match -> book -> pay/prepare payment -> follow up -> Thank You -> return home` customer journey
- preserve results-first search behavior, including reviewed tenant matches; tenant matches may show richer verified capability chips but must not auto-jump to booking
- preserve result-card inspection basics: thumbnail/preview, direct or fallback Google Maps, provider/detail actions, early-match rendering, and chat-based refinement prompts
- preserve portal-first tenant confirmation: booking reference, QR to `portal.bookedai.au`, Stripe/QR/manual payment posture, email/calendar actions, WhatsApp Agent follow-up, and portal review/edit/reschedule/cancel links
- keep package registration resilient when calendar, Stripe, event-store, or dual-write side effects degrade
- keep public booking confirmation immediate while downstream automation runs best effort
- maintain compact mobile UI for package boxes, result cards, forms, and action controls
- keep the pitch architecture visual current whenever the agent, booking, tenant/admin, or integration boundaries change

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

Implementation status from `2026-04-25`:

- `GET /api/v1/agent-actions` now supports deeper ledger filters for entity type, entity id, agent type, dependency state, and lifecycle event
- ledger responses now include summary counts for the current tenant/filter scope
- `GET /api/v1/tenant/integrations` now includes a tenant automation connection plan for platform messaging, CRM write-back, webhook/workflow automation, customer-care state, action routes, dispatch endpoints, and guardrails
- `POST /api/v1/tenant/operations/dispatch` now gives signed tenant admins/operators a tenant-scoped way to run policy-gated queued revenue-ops actions
- ledger responses now expose derived lifecycle event, dependency state, policy mode, approval requirement, and evidence summary fields so surfaces do not need to parse raw JSON first
- admin Reliability exposes entity, dependency, and lifecycle filters plus policy/evidence summary on action cards
- tenant workspace now has an `Ops` panel for read-only tenant visibility into follow-up, reminder, CRM, customer-care, and webhook actions, including event/policy/evidence posture

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

Implementation status from `2026-04-25`:

- `POST /api/v1/portal/bookings/{booking_reference}/care-turn` now gives the portal a first booking-reference anchored customer-care status turn
- portal care replies use booking status, payment posture, support contact, academy/report context, recent revenue-ops action runs, and enabled portal actions as the response basis
- `portal.bookedai.au` now includes a customer-care status agent card so returning customers can continue asking about payment, reschedule, class/report status, pause/downgrade/cancel, or support escalation in the same booking workspace
- explicit human-support, escalation, urgent, or broken payment-link messages in the portal care turn now queue a `support_request` through the existing portal audit/outbox path
- admin Billing Support now includes `portal.support_request.requested` in the same review/escalation queue as reschedule and cancel portal requests
- the care-turn response includes `created_request`, allowing the portal UI to show customers when their AI-assisted support case has actually been queued
- unsupported or incomplete lifecycle changes remain request-safe next actions or escalation paths rather than simulated instant mutations
- WhatsApp is now the first live channel attached to Phase 19 customer-care behavior
- WhatsApp should be treated as the dedicated `BookedAI WhatsApp Booking Care Agent` for `bookedai.au`: it answers all service questions tied to an already-booked record and uses OpenClaw as the safe gateway/operator supervision surface, not as customer-visible chat copy
- the OpenClaw agent contract is repo-owned at `deploy/openclaw/agents/bookedai-whatsapp-booking-care-agent.json` and syncs into the live OpenClaw runtime `agents/` directory with `python3 scripts/telegram_workspace_ops.py sync-openclaw-bookedai-agent`
- the configured BookedAI WhatsApp identity is the main support number `+61455301335`, paired with `info@bookedai.au` for email confirmation and support continuity
- `/api/webhooks/whatsapp` still accepts the configured Twilio form payload and Meta JSON payload, but now also runs a customer-care response when the backend communication service is available
- booking identity resolution prefers a booking reference in the WhatsApp message, then falls back to the sender phone or email only when exactly one booking is found
- the response is generated from `build_portal_customer_care_turn`, so the answer uses portal booking, payment, support, academy/report, and action-run truth
- clear WhatsApp cancellation and reschedule messages queue the same portal request records as `portal.bookedai.au`, preserving audit/outbox behavior and manual-review guardrails
- WhatsApp-driven cancel/reschedule requests now run lifecycle follow-through: customer email confirmation is sent or recorded, CRM gets a task mirror through lifecycle email sync, and tenant bookings expose a recent request queue for dashboard visibility
- ambiguous or unresolved identity asks the customer for a booking reference instead of exposing booking detail
- OpenClaw/Telegram operators can now run `python3 scripts/telegram_workspace_ops.py whatsapp-bot-status` to verify the customer WhatsApp bot surface without sending a message: OpenClaw gateway, backend API health, WhatsApp provider status, and webhook verify-route reachability are checked in one read-only command

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
- reusable verified-tenant search-result contract covering shortlist badge/chips, explicit booking consent, Stripe/QR payment posture, QR confirmation, WhatsApp Agent continuation, and portal change actions
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
