# Grandmaster Chess Connected Agent Implementation Backlog

Date: `2026-04-24`

Document status: `active execution backlog`

## Purpose

This backlog turns the new `chess-first connected-agent priority` into a concrete implementation sequence the team can execute without reinterpreting the PRD every time.

It exists to answer five questions clearly:

1. which API contracts must land first
2. which data model additions are required
3. which jobs, triggers, and automation runners must exist
4. which UI surfaces must be upgraded across public, portal, tenant, and admin
5. which tests prove the agent handoffs are real and safe

This document should be read together with:

- `prd.md`
- `docs/architecture/implementation-phase-roadmap.md`
- `docs/architecture/current-phase-sprint-execution-plan.md`
- `docs/architecture/demo-grandmaster-chess-revenue-engine-blueprint.md`
- `docs/development/sprint-13-16-user-surface-delivery-package.md`

## Scope lock

This backlog is for the first full connected-agent implementation of BookedAI.

The first target is:

- `Grandmaster Chess Academy`

Do not start by building a generic multi-tenant agent platform detached from a real vertical.

The required sequence is:

1. `Search and Conversation Agent` for chess intake and assessment
2. `Revenue Operations Agent` for chess booking, subscription, reminder, CRM, and billing actions
3. `Customer Care and Status Agent` for returning parent support
4. tenant/admin visibility for the same loop
5. only then reusable extraction for broader tenants

## Agent handoff contract

### Handoff 1: Search -> Revenue Operations

Trigger:

- assessment completed
- placement accepted
- booking or subscription intent created

Required payload:

- `tenant_ref`
- `customer_ref` or provisional identity
- `student_ref` when created
- `assessment_session_id`
- `placement_result`
- `selected_class_group_id`
- `selected_plan_key`
- `booking_reference` when created
- `confidence`
- `source`
- `surface`

### Handoff 2: Revenue Operations -> Customer Care

Trigger:

- returning parent asks for status help
- payment reminder response arrives
- portal reopen happens
- pause, cancel, or reschedule request starts

Required payload:

- current booking state
- current subscription state
- current invoice or receivable state
- latest communication timeline
- report-delivery state
- active retention case state
- allowed next actions

## Execution slices

### Slice 1 - Assessment and placement contracts

Priority: `P0`

Goal:

- make the chess search/conversation agent capable of turning a parent enquiry into a structured skill and placement result

Backend/API:

- `POST /api/v1/assessments/sessions`
- `POST /api/v1/assessments/sessions/{session_id}/answers`
- `GET /api/v1/assessments/sessions/{session_id}`
- `POST /api/v1/placements/recommend`
- `GET /api/v1/classes/availability`

Frontend:

- demo chat assessment questions
- assessment progress state
- placement result card
- recommended class and fallback class cards
- subscription recommendation state

Data:

- `assessment_sessions`
- `assessment_answers`
- `placement_recommendations`
- `class_groups` or equivalent class availability model

Definition of done:

- a user can move from query to completed assessment
- the system returns a deterministic placement recommendation
- placement result is persisted and reusable by downstream agents

### Slice 2 - Booking and subscription handoff

Priority: `P0`

Goal:

- connect chess placement output to booking and subscription-aware payment flow

Backend/API:

- reuse `lead` and `booking intent` seams
- add `POST /api/v1/subscriptions/intents`
- extend payment intent flow for `stripe_subscription` and related academy cases

Frontend:

- class selection confirmation
- subscription plan selector
- payment posture state:
  - pending
  - checkout opened
  - awaiting confirmation
  - manual follow-up

Data:

- `students`
- `enrollments`
- `subscription_intents`
- `subscription_plans`

Definition of done:

- placement result can become a booking intent and subscription intent
- the booking reference, student identity, and plan choice survive handoff into revenue ops

Implementation status on `2026-04-24`:

- `POST /api/v1/subscriptions/intents` now exists as the first subscription handoff seam for the chess academy loop
- `academy_subscription_intents` stores student, booking, plan, billing interval, amount, status, checkout URL, and payload context
- `agent_action_runs` stores the first revenue-operations ledger records for subscription confirmation, payment reminder, CRM sync, report generation, and retention evaluation
- `demo.bookedai.au` now calls the subscription intent endpoint after booking and report-preview creation, then surfaces the queued revenue-agent actions in the booking panel
- tenant/admin-readable ledger seams now exist through `GET /api/v1/agent-actions`, `GET /api/v1/agent-actions/{action_run_id}`, and `POST /api/v1/agent-actions/{action_run_id}/transition`
- remaining work: real Stripe subscription checkout, invoice/receivable linkage, and dedicated tenant/admin UI workspaces for the ledger

### Slice 3 - Revenue operations agent foundation for chess

Priority: `P0`

Goal:

- make the revenue operations agent react to chess lifecycle events instead of leaving the flow as booking-only

Required action types:

- booking confirmation email
- payment reminder
- subscription start confirmation
- overdue follow-up
- CRM sync
- webhook callback
- operator attention task
- report generation trigger
- retention evaluation trigger

Backend/API:

- `POST /api/v1/reports/generate`
- `POST /api/v1/retention/evaluate`
- internal action queue or lifecycle orchestration seam
- action execution ledger read APIs for tenant/admin

Jobs and automation:

- queued communication runner
- scheduled payment-reminder runner
- scheduled subscription-reminder runner
- report-generation runner
- retention-evaluation runner
- webhook delivery and retry runner

Data:

- `agent_action_runs`
- `subscription_reminders`
- `invoice_reminders`
- `report_jobs`
- `retention_cases`
- `webhook_deliveries`

Definition of done:

- chess booking or subscription events create visible downstream actions
- action state moves through `queued`, `sent`, `failed`, `manual_review`, or similar truth states
- tenant and admin can inspect what the revenue operations agent did

Implementation status on `2026-04-24`:

- the first durable action run ledger exists through `agent_action_runs`
- subscription intent creation now queues revenue-operations actions with `queued` status and audit/outbox backing
- `POST /api/v1/reports/generate` and `POST /api/v1/retention/evaluate` now queue explicit report-generation and retention-evaluation action runs against a student or booking reference
- academy student snapshots now include recent agent actions so portal/customer-care reads can reopen the same state
- revenue operations action status can now move through `queued`, `in_progress`, `sent`, `completed`, `failed`, `manual_review`, or `skipped` with audit and outbox evidence
- the first tenant/admin ledger read APIs now support student, booking, status, action-type, and limit filters
- a first tracked worker now exists through `POST /api/v1/agent-actions/dispatch`, backed by `workers/academy_actions.py` and `job_runs`
- the worker moves queued actions through `in_progress` into `sent`, `completed`, `manual_review`, or `failed` based on current action policy and available parent contact context
- admin Reliability now includes a first operator UI for the revenue-ops ledger through `RevenueOpsActionLedger`, with status/action filters, summary counts, dispatch control, and manual-review/complete transitions
- remaining work: scheduled reminder cron wiring, provider-specific delivery workers, webhook delivery workers, and a tenant-facing version of the same queue

### Slice 4 - Customer care and status agent for parents

Priority: `P0`

Goal:

- let a returning parent ask about current status and receive truthful answers backed by current system state

Supported parent intents:

- booking status
- payment status
- invoice status
- subscription status
- class placement explanation
- reschedule request
- pause request
- cancel request
- report status

Backend/API:

- `GET /api/v1/portal/student/{student_ref}`
- `POST /api/v1/portal/requests/schedule-change`
- `POST /api/v1/portal/requests/pause`
- `POST /api/v1/portal/requests/cancel`
- customer-status lookup seam by verified email, phone, booking reference, or secure session

Frontend:

- parent portal student view
- support/status chat panel
- action cards for pause, reschedule, cancel, pay now, view report

Data:

- `portal_requests`
- `customer_status_views` or read model
- `support_conversation_events`

Definition of done:

- a parent can return and ask for the current state
- the response uses live data, not a generic FAQ flow
- any requested action is routed back into revenue operations or operator review safely

### Slice 5 - Coach report and parent report loop

Priority: `P1`

Goal:

- prove the post-class value loop that makes chess more than a booking demo

Backend/API:

- `POST /api/v1/class-reports`
- `POST /api/v1/reports/generate`
- `GET /api/v1/reports/preview/{booking_reference}` or student-level equivalent

Frontend:

- GM or operator report input state
- parent report preview card
- report delivery timeline

Data:

- `coach_reports`
- `report_previews`
- `report_deliveries`

Definition of done:

- a class outcome can be recorded
- an AI-generated parent-facing progress report can be previewed and delivered
- the delivered report becomes part of the customer-care context

### Slice 6 - Tenant and admin visibility

Priority: `P1`

Goal:

- make the chess connected-agent loop visible to operators and tenants

Tenant UI:

- action queue
- student lifecycle summary
- payment and receivable posture
- subscription and renewal posture
- retention-risk summary
- communication timeline

Admin UI:

- cross-tenant chess action queue
- CRM sync posture
- reminder backlog
- billing and receivable posture
- retention case overview
- customer-state support context

Definition of done:

- tenant and admin can explain what the agents did and what still needs action

## API contract backlog

### New public or tenant-safe routes

- `POST /api/v1/assessments/sessions`
- `POST /api/v1/assessments/sessions/{session_id}/answers`
- `GET /api/v1/assessments/sessions/{session_id}`
- `POST /api/v1/placements/recommend`
- `GET /api/v1/classes/availability`
- `POST /api/v1/subscriptions/intents`
- `POST /api/v1/class-reports`
- `POST /api/v1/reports/generate`
- `GET /api/v1/reports/preview/{booking_reference}`
- `GET /api/v1/portal/student/{student_ref}`
- `POST /api/v1/portal/requests/schedule-change`
- `POST /api/v1/portal/requests/pause`
- `POST /api/v1/portal/requests/cancel`
- `POST /api/v1/retention/evaluate`

### Supporting internal or admin seams

- agent action queue read API
- lifecycle execution detail API
- receivable and renewal queue API
- customer-state support lookup API
- retry and escalation APIs for failed actions

## Data model backlog

### Core tables or equivalents

- `assessment_sessions`
- `assessment_answers`
- `placement_recommendations`
- `students`
- `class_groups`
- `student_enrollments`
- `subscription_plans`
- `subscription_intents`
- `coach_reports`
- `report_previews`
- `report_deliveries`
- `retention_cases`
- `agent_action_runs`
- `portal_requests`
- `webhook_deliveries`

### Required common fields

Every new table should support where relevant:

- `tenant_id`
- stable public-safe reference
- lifecycle status
- `metadata_json`
- `created_at`
- `updated_at`
- audit-friendly actor or source attribution

## Jobs, triggers, and runners backlog

### Required job families

- assessment follow-up timeout
- payment reminder schedule
- subscription renewal reminder
- report generation queue
- report delivery queue
- retention evaluation schedule
- webhook delivery and retry
- CRM sync retry
- monthly tenant summary email

### Trigger sources

- booking created
- payment pending too long
- payment failed
- subscription started
- renewal upcoming
- renewal failed
- class completed
- report submitted
- parent asked for support
- pause or reschedule requested

## UI backlog

### Public and demo

- assessment-driven chess intake
- placement result with recommendation reasoning
- class and subscription selection
- booking and payment state continuity
- parent report preview at the end of the flow

### Portal

- student summary card
- current class and subscription card
- payment and invoice state card
- report history
- support/status chat
- pause, cancel, and reschedule requests

### Tenant

- chess student lifecycle board
- action queue
- communication timeline
- receivables and renewals panel
- retention-risk panel

### Admin

- connected-agent action oversight
- tenant-by-tenant chess health view
- failed action investigation
- support lookup by phone or email
- receivable and billing intervention tools

## Acceptance test backlog

### Agent handoff tests

1. `query -> assessment -> placement` persists structured context correctly
2. `placement -> booking/subscription intent` preserves student, class, and plan context
3. `booking/subscription -> revenue operations action queue` creates the expected downstream actions
4. `returning parent support lookup` resolves the correct current state
5. `pause/reschedule/cancel request` creates the correct portal request and operator visibility

### API tests

- assessment route contract tests
- placement contract tests
- subscription intent tests
- report generation tests
- retention evaluation tests
- portal request tests
- customer-status lookup tests

### Integration and job tests

- reminder jobs are idempotent
- webhook deliveries retry safely
- CRM sync retries do not duplicate state incorrectly
- failed actions escalate instead of disappearing

### UI and end-to-end tests

- demo chess flow from intake to subscription recommendation
- parent portal open and status view
- parent pause or reschedule request
- tenant action queue visibility
- admin intervention visibility

## Dependencies and sequencing

### Hard dependencies

- assessment and placement contracts before subscription recommendation UI
- booking and subscription identities before revenue-ops actions
- action queue model before tenant/admin oversight
- customer-state read model before customer-care/status chat

### Recommended coding order

1. backend assessment and placement contracts
2. demo chess assessment and placement UI
3. subscription intent and payment-state extension
4. revenue-ops action queue and runners
5. parent portal and customer-status support
6. coach report and parent report loop
7. tenant/admin visibility
8. reusable extraction after the chess loop is stable

## Definition of done

This backlog is complete only when:

- chess is the first real connected-agent proof in production-like repo truth
- the three agents hand off through persisted and inspectable state
- tenant and admin can inspect agent actions and pending work
- parents can ask for truthful current status and trigger supported next actions
- the same pattern is ready to be extracted safely for later non-chess tenants
