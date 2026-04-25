# Demo Grandmaster Chess Revenue Engine Blueprint

Date: `2026-04-24`

Status: `active architecture and implementation note`

## Purpose

Turn the current `demo.bookedai.au` and `chess.bookedai.au` runtime from a search-plus-booking proof into a full BookedAI revenue-engine proof for a recurring-revenue academy.

This document translates the operator requirement for `Grandmaster Chess Academy` into an implementation-ready blueprint across:

- enterprise architecture
- product scope
- frontend runtime
- backend and API seams
- data model
- tenant scalability
- UX and trust states

## Locked business framing

BookedAI is not only a booking assistant.

For this demo, it must prove the full loop:

`intent -> assessment -> placement -> booking -> payment -> class -> coach input -> AI report -> parent follow-up -> monthly billing -> retention action`

The chess academy use case is valuable because it forces BookedAI to handle:

- parent-led buying decisions
- recurring subscriptions
- level placement before purchase
- coach-entered post-class outcomes
- retention and downgrade / pause handling

## Current repo baseline

The current repo already provides strong foundations:

- `demo.bookedai.au` now uses the real public v1 flow rather than mock timing
- `chess.bookedai.au` already exists as a tenant-branded runtime for `co-mai-hung-chess-class`
- public APIs already support:
  - search and shortlist
  - lead capture
  - booking intent creation
  - payment intent preparation
  - portal follow-up
- the broader multi-tenant direction is already locked in `docs/development/widget-plugin-multi-tenant-booking-architecture-2026-04-23.md`

What is still missing is the recurring-academy layer:

- skill assessment as a first-class flow, not only free-text search
- class placement logic tied to academy schedule and capacity
- subscription-first billing posture
- coach / GM post-class input workflow
- AI progress report generation
- parent portal value loop
- retention automation and churn handling

## Product decision

`demo.bookedai.au` should become the canonical first-minute proof of the full BookedAI revenue engine.

Recommended role split:

- `demo.bookedai.au`
  - first-minute interactive proof
  - Grandmaster Chess Academy walkthrough
  - strongest end-to-end revenue story
- `chess.bookedai.au`
  - tenant-branded academy runtime
  - real tenant-scoped public surface
  - production-like academy experience
- `portal.bookedai.au`
  - parent and student durable control surface
- `admin.bookedai.au`
  - operator and tenant oversight

This keeps `demo` as the narrative-and-product proof while `chess` proves tenant-specific reuse.

## Connected-agent priority

Chess is now the first required connected-agent implementation for BookedAI.

The chess academy flow must be the first place where these agents are visibly connected end-to-end:

1. `Search and Conversation Agent`
   - captures parent or student intent
   - asks assessment and scheduling questions
   - hands off structured context into assessment and placement
2. `Revenue Operations Agent`
   - reacts to assessment, placement, booking, payment, subscription, report, and retention events
   - triggers reminders, CRM sync, webhook/API callbacks, billing actions, and operator tasks
3. `Customer Care and Status Agent`
   - answers parent questions using current booking, subscription, report, and retention state
   - supports reschedule, pause, cancel, payment-help, and current-status conversations

This chess implementation should be completed before attempting a wider generic connected-agent rollout for other tenants.

## Gap analysis by discipline

### Enterprise architecture

Needed next:

- separate the academy flow into bounded contexts instead of keeping it as one public-booking-only journey
- preserve tenant-safe identity on every request:
  - `tenant_ref`
  - `deployment_mode`
  - `widget_id`
  - `source`
  - `surface`
  - `campaign`
  - `source_page`
  - visitor session id
- add workflow state beyond lead and booking:
  - assessment
  - placement
  - attendance
  - report
  - subscription
  - retention case

### Product owner

The requirement is broader than one booking demo. The MVP should be reframed as five connected product slices:

1. `AI intake and skill assessment`
2. `class recommendation and booking`
3. `payment and subscription start`
4. `GM report and parent communication`
5. `retention and schedule-change lifecycle`

Success for the demo should no longer be only `booking_created`.

The correct demo KPI proof is:

- assessment completed
- recommended class accepted
- booking created
- payment path resolved
- report generated
- parent CTA surfaced
- next invoice / retention action visible

### Frontend

Current UI direction is strong for chat-first discovery, but still thin for academy operations.

Needed next:

- structured assessment cards inside the chat flow
- visible `student level` and `recommended pathway` state
- class timetable and capacity display
- subscription-plan selector
- parent portal preview after booking
- GM input screen or operator simulation state
- generated progress report card
- retention action card:
  - pay now
  - change schedule
  - pause
  - downgrade

### Backend

Current backend is good for public booking, but academy proof needs more lifecycle entities and orchestration.

Needed next:

- assessment scoring service
- placement and recommendation service
- recurring billing / subscription schedule service
- coach report ingestion service
- report-generation orchestration
- retention-decision orchestration

### Agent connection responsibilities

The chess implementation must make each agent boundary explicit:

- `Search and Conversation Agent`
  - owns intake, clarification, assessment kickoff, and placement handoff
- `Revenue Operations Agent`
  - owns post-assessment actioning, subscription reminders, billing follow-up, CRM sync, report scheduling, and retention actions
- `Customer Care and Status Agent`
  - owns returning-parent support using live current-state data from the revenue operations layer

### API layer

The current API set is enough for search, lead, booking, and payment preparation, but not enough for the academy lifecycle.

New v1 seams should be added instead of overloading one route:

- `POST /api/v1/assessments/sessions`
- `POST /api/v1/assessments/sessions/{id}/answers`
- `POST /api/v1/placements/recommend`
- `GET /api/v1/classes/availability`
- `POST /api/v1/subscriptions/intents`
- `POST /api/v1/class-reports`
- `POST /api/v1/reports/generate`
- `GET /api/v1/portal/student/{studentRef}`
- `POST /api/v1/portal/requests/schedule-change`
- `POST /api/v1/portal/requests/pause`
- `POST /api/v1/portal/requests/cancel`
- `POST /api/v1/retention/evaluate`

### UI / UX

The academy buyer is usually a parent, not the student.

So the UX should prove:

- BookedAI understands the child level quickly
- the recommendation feels expert, not generic
- the parent sees schedule and pricing clearly
- the payment model is trustworthy
- post-class value is measurable
- pause or schedule conflict does not immediately become churn

## Target end-to-end flow

### Stage 1. Entry and qualification

User enters from:

- ads
- QR
- tenant website
- direct demo host

BookedAI should ask for:

- student age
- experience band
- goal
- preferred format
- preferred time

Then the runtime should move into structured assessment.

### Stage 2. AI skill assessment

Assessment contract for MVP:

- experience band
- a few chess knowledge questions
- 2 to 4 simple puzzle checks
- optional parent goal selection

Output:

- `score`
- `level`
- `subscription_intent` now starts through `/api/v1/subscriptions/intents` after booking/report preview
- `agent_action_runs` now records the first queued revenue-operations actions for subscription confirmation, payment reminder, CRM sync, report generation, and retention evaluation
- report generation and retention evaluation can also be queued directly through `/api/v1/reports/generate` and `/api/v1/retention/evaluate`
- `confidence`
- `recommended_class_type`
- `why_this_level`

### Stage 3. Class placement and booking

Placement engine should combine:

- assessment result
- age or learner segment
- timetable
- capacity
- format preference
- budget posture

Output:

- recommended class
- fallback class
- available slots
- subscription plan recommendation

### Stage 4. Payment and subscription

For this academy use case, payment should default to subscription-aware behavior.

Preferred payment paths:

- `stripe_subscription`
- `stripe_checkout_one_off`
- `payment_link`
- `qr_payid`

The UI should explicitly tell the parent whether they are:

- reserving a trial
- starting a monthly plan
- paying an invoice

### Stage 5. Class and GM input

After class, the coach or GM should submit:

- attendance
- focus rating
- understanding rating
- progress level
- notes
- suggested next step

### Stage 6. AI report and parent engagement

BookedAI should generate a parent-readable report with:

- skills learned
- strengths
- weaknesses
- homework or puzzles
- recommended next class
- CTA for payment or plan continuation

### Stage 7. Monthly billing and retention

The recurring loop should support:

- invoice on day `25`
- reminder on day `28`
- final reminder on day `30`
- lock or manual review on day `1`

Retention actions should branch by reason:

- schedule conflict -> suggest other slots
- budget issue -> downgrade
- lost interest -> re-engagement offer
- busy -> pause plan

## Target bounded contexts

Recommended bounded contexts for this academy slice:

- `public_intake`
  - discovery, assessment start, lead capture
- `placement`
  - scoring, recommendation, class-fit decision
- `booking`
  - booking intent, slot hold, confirmation
- `billing`
  - payment intent, subscription, invoices, reminders
- `learning_ops`
  - class attendance, coach notes, progress ledger
- `parent_engagement`
  - reports, homework, notifications, support requests
- `retention`
  - churn signals, pause, downgrade, reactivation
- `tenant_analytics`
  - MRR, churn risk, paid/unpaid, retention posture

These contexts can still ship incrementally inside the existing codebase, but they should now be the explicit architecture target.

## Data model additions

The current mirror model should be extended with academy-specific tables or equivalents:

- `assessment_sessions`
  - tenant_id, contact_id, student_id, score_total, level, confidence, result_json
- `assessment_answers`
  - assessment_session_id, question_key, answer_value, score_delta
- `student_profiles`
  - tenant_id, parent_contact_id, full_name, age, current_level, goals_json
- `class_groups`
  - tenant_id, name, day_of_week, start_time, end_time, level_band, capacity
- `class_enrollments`
  - tenant_id, class_group_id, student_id, status, start_date, end_date
- `attendance_records`
  - tenant_id, class_group_id, student_id, class_date, attendance_status
- `coach_reports`
  - tenant_id, student_id, class_group_id, attendance_id, focus_rating, understanding_rating, progress_level, notes
- `ai_progress_reports`
  - tenant_id, student_id, coach_report_id, report_json, delivery_status
- `subscription_contracts`
  - tenant_id, student_id, billing_plan_key, amount, cadence, status, next_invoice_date
- `retention_cases`
  - tenant_id, student_id, reason, risk_level, recommended_action, status
- `portal_requests`
  - tenant_id, student_id, request_type, payload_json, status

## API contract shape

### Assessment

`POST /api/v1/assessments/sessions`

Request should accept:

- contact / parent details
- student brief
- actor context
- attribution

Response should return:

- assessment session id
- first questions
- current progress

`POST /api/v1/assessments/sessions/{id}/answers`

Response should return:

- next question or completion
- current score band
- partial confidence

### Placement

`POST /api/v1/placements/recommend`

Request should accept:

- assessment session id
- preferred schedule
- preferred format
- budget posture

Response should return:

- primary recommendation
- fallback options
- timetable availability
- recommended plan

### Learning ops and reports

`POST /api/v1/class-reports`

Request should accept:

- tenant-scoped coach identity
- attendance and ratings
- notes

`POST /api/v1/reports/generate`

Response should return:

- parent-facing narrative
- strengths
- weaknesses
- suggested homework
- follow-up CTA

## Demo host composition

Recommended `demo.bookedai.au` page sections:

1. chat-first intake
2. assessment stage rail
3. recommended class and slot panel
4. payment / subscription action
5. report preview
6. retention automation preview
7. tenant dashboard KPI strip

Important rule:

Do not present this as a generic chatbot.

Present it as an operating system with visible state transitions.

The UI should show:

- `Assessment complete`
- `Placed into Intermediate Wednesday 4 PM`
- `Subscription ready`
- `Coach report captured`
- `Parent follow-up scheduled`
- `Retention watch: low / medium / high`

## Multi-tenant strategy

This academy blueprint must remain reusable for many SME tenants later.

That means:

- no chess-specific logic should be hardcoded into platform APIs
- assessment templates should be tenant-configurable by vertical
- class types, rating scales, and report prompts should be driven by tenant settings or template ids
- tenant analytics must stay partitioned by `tenant_id`
- portal links and notifications must resolve through tenant-safe session context

Recommended template model:

- `assessment_template`
- `placement_rule_set`
- `report_prompt_template`
- `billing_policy`
- `retention_policy`

This turns the chess demo into the first vertical template, not a one-off branch.

## Delivery phases

### Phase A. Demo truth upgrade

Ship on `demo.bookedai.au`:

- assessment step UI
- placement result UI
- subscription-aware payment state
- parent report preview

Priority note:

- this phase is the first must-ship connected-agent seam for BookedAI overall

### Phase B. Backend academy seams

Ship:

- assessment session endpoints
- placement endpoint
- class availability endpoint
- report ingestion and generation endpoints

Priority note:

- this phase is the first must-ship revenue-operations-agent proof for subscriptions, reminders, and post-booking orchestration

### Phase C. Portal and retention loop

Ship:

- parent portal student view
- schedule change request
- pause / cancel request
- retention action cards

Priority note:

- this phase is the first must-ship customer-care/status-agent proof for BookedAI overall

### Phase D. Tenant and admin reporting

Ship:

- MRR
- paid / unpaid
- retention rate
- churn-risk summary
- student profile with learning and revenue history

## Acceptance criteria

This requirement is only complete when:

- `demo.bookedai.au` can demonstrate the full academy loop from intake to retention
- `chess.bookedai.au` can reuse the same system as a tenant runtime
- the flow uses real BookedAI API seams rather than only local animation
- the data model can support many tenants and later non-chess verticals
- parents, tenants, and operators each have a clear surface in the same lifecycle

## Immediate implementation priority

The next concrete programming slice should be:

1. connect `Search and Conversation Agent` to assessment and placement contracts
2. surface timetable and subscription recommendation in the demo UI
3. connect booking and subscription events into `Revenue Operations Agent` actions for reminders, CRM sync, billing, and reports
4. persist student, enrollment, and coach-report data
5. generate a parent-facing report preview
6. connect returning parent support into `Customer Care and Status Agent` using portal, booking, subscription, and report state
7. expose pause, reschedule, and downgrade flows through portal-safe APIs
8. only after the chess flow is stable, extract reusable connected-agent contracts for wider tenant reuse
