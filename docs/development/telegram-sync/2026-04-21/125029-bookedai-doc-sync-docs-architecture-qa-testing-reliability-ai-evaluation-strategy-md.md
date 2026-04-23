# BookedAI doc sync - docs/architecture/qa-testing-reliability-ai-evaluation-strategy.md

- Timestamp: 2026-04-21T12:50:29.190915+00:00
- Source: repo-doc-sync
- Category: documentation
- Status: synced

## Summary

Synchronized `docs/architecture/qa-testing-reliability-ai-evaluation-strategy.md` from the BookedAI repository into the Notion workspace. Preview: # QA, Testing, Reliability, and AI Evaluation Strategy ## Purpose This document defines the official Prompt 14-level strategy for QA, testing, end-to-end validation, AI evaluation, and reliability assurance in `BookedAI.au`. It is written for a production system that is already running and handling real booking, payment, CRM, email, and integration workflows.

## Details

Source path: docs/architecture/qa-testing-reliability-ai-evaluation-strategy.md
Synchronized at: 2026-04-21T12:50:29.040537+00:00

Repository document content:

# QA, Testing, Reliability, and AI Evaluation Strategy

## Purpose

This document defines the official Prompt 14-level strategy for QA, testing, end-to-end validation, AI evaluation, and reliability assurance in `BookedAI.au`.

It is written for a production system that is already running and handling real booking, payment, CRM, email, and integration workflows.

The goal is not to add test files mechanically. The goal is to build a testing and reliability system that protects customer trust, prevents overbooking and payment errors, catches lifecycle regressions, and evaluates AI behavior against business truth rather than fluency alone.

This strategy inherits and aligns with:

- Prompt 1 product, trust, and revenue direction
- Prompt 2 module and boundary direction
- Prompt 3 domain, integration, and worker foundations
- Prompt 4 data architecture direction
- Prompt 5 API contract direction
- Prompt 6 public growth and attribution direction
- Prompt 7 tenant operational workflows
- Prompt 8 internal admin and support workflows
- Prompt 9 AI router and matching strategy
- Prompt 10 CRM, email, and revenue lifecycle strategy
- Prompt 11 integration and reconciliation strategy
- Prompt 12 auth, RBAC, and tenant isolation strategy
- Prompt 13 DevOps, CI/CD, and observability strategy

## Section 1 — Executive summary

- Current testing maturity:
  - current repo has healthcheck scripts and some upstream Supabase and Hermes tests, but it does not yet show a complete BookedAI-native testing pyramid across backend, frontend, integrations, AI, and end-to-end flows.
- Target direction:
  - layered QA
  - business-flow-first testing
  - AI evals tied to truth and trust gating
  - failure and recovery testing
  - production monitoring as part of the QA loop
- Biggest priorities:
  - test booking conflicts and availability trust
  - test payment idempotency and reminder lifecycle
  - test CRM and email delivery flows
  - test integration sync, retry, conflict, and reconciliation
  - test degraded AI and provider fallback behavior
- Biggest risks if done poorly:
  - passing happy-path tests while real booking and billing logic fail
  - AI sounding good while routing users into unsafe actions
  - integrations silently drifting
  - webhook duplication or retry behavior causing real-world damage

## Section 2 — Testing pyramid

### Unit tests

Use unit tests for:

- pure business rules
- matching score calculations
- booking trust gating rules
- payment path decision rules
- template rendering rules
- idempotency key generation
- permission and scope checks

Do not use unit tests for:

- full API workflows
- provider integrations
- multi-step lifecycle flows

### Integration tests

Use integration tests for:

- API handlers with database access
- repository and migration behavior
- worker and outbox processing
- sync and retry behavior
- webhook verification and dedupe
- payment and CRM adapter seams

Do not use integration tests for:

- high-volume UI interaction coverage
- qualitative AI response evaluation

### End-to-end tests

Use E2E tests for:

- real user booking flows
- payment flow validation in staging or test mode
- lead to CRM progression
- monthly billing and report flow
- tenant and admin critical workflows

Do not use E2E tests for:

- exhaustive edge-case permutations
- fine-grained algorithm scoring

### AI evaluation tests

Use AI evals for:

- extraction correctness
- matching relevance
- hallucination detection
- trust-language correctness
- payment and booking action safety

Do not use AI evals as the only validation layer for:

- booking truth
- payment success
- external provider health

### Scenario-based business tests

Use scenario suites for:

- multi-step business flows with meaningful state transitions
- degraded modes
- reconciliation and retry safety
- monthly lifecycle sequences

## Section 3 — Core business flows

The following flows should be treated as required regression suites:

- Flow 1 — SEO → Lead → CRM
- Flow 2 — Chat → Matching → Recommendation
- Flow 3 — Matching → Availability check
- Flow 4 — Booking → Slot validation
- Flow 5 — Booking → Payment routing
- Flow 6 — Payment → Invoice → Confirmation
- Flow 7 — Payment overdue → Reminder → Recovery
- Flow 8 — Monthly billing → report → email
- Flow 9 — Integration sync across CRM, POS, and accounting
- Flow 10 — External provider booking path
- Flow 11 — Fully booked and unavailable handling
- Flow 12 — Fallback AI and degraded mode

Each flow should have:

- happy path
- edge path
- failure path
- retry or recovery path
- observability expectation

## Section 4 — Matching tests

### What to test

- intent parsing
- entity extraction
- service matching
- location matching
- ranking logic
- recommendation output packaging

### Required coverage

- correct service category
- correct location or nearby relevance
- correct intent with ambiguous phrasing
- missing-information clarification behavior
- multi-service or multi-constraint requests
- language variation and shorthand phrasing where supported

### Scenario examples

- vague request with missing location
- specific service with broad location
- urgent request that should influence ranking
- cheapest versus best-fit versus nearest preference
- query containing irrelevant noise

### Current-repo note

Current repo already confirms service-ranking and location heuristics in [backend/services.py](../../backend/services.py), but does not yet confirm a dedicated automated matching test suite.

### Production replay threshold policy

For the active intelligent-search lane, matching quality should now also be evaluated through replay cohorts that mirror the live `tenant-first, public-web-second` design.

Required cohorts:

- `tenant-positive cohort`
  - verifies that known good catalog rows win when they satisfy service, location, and category constraints
- `public-web fallback cohort`
  - verifies that tenant miss cases use sourced public web results when safe enough, without leaking wrong-domain tenant rows

Current minimum thresholds for promote-or-hold review:

- tenant-positive cohort:
  - `100% tenant_hit`
  - `0 expectation mismatches`
- public-web fallback cohort:
  - `>= 4/7` sourced fallback outcomes in the current baseline
  - `0` wrong-domain tenant leaks
  - safe no-result is acceptable only when no display-safe fallback survives the gates

This threshold set is intentionally precision-first. It is acceptable for fallback recall to be incomplete while the engine is still being hardened, but it is not acceptable to reintroduce wrong-domain or wrong-location results just to raise the visible result count.

## Section 5 — Booking trust tests

### Critical behaviors to test

- available versus fully booked
- limited availability
- stale external data
- conflicting internal versus external state
- slot hold and release
- booking intent versus confirmed booking
- overbooking prevention

### Must-have conflict scenarios

- two users attempt the same slot
- tenant reduces capacity while a hold exists
- external booking system says full while local state says available
- slot held but payment incomplete
- provider confirmation delayed

### Assertions

- no unsafe `book now` action when confidence is too low
- trust state must downgrade correctly
- user-facing next action must remain safe
- admin and tenant visibility must reflect degraded trust

## Section 6 — Payment tests

### Payment and billing coverage

- Stripe checkout flow
- QR or bank transfer flow
- payment success
- payment failure
- retry behavior
- idempotency on callbacks and retries
- invoice generation
- reminder emails
- overdue handling
- manual confirmation path where relevant

### Must-test edge cases

- duplicate webhook event
- payment success arriving after UI timeout
- invoice generated but email fails
- overdue reminder duplication prevention
- payment confirmed but booking not yet fully confirmed

### Safety assertions

- no duplicate charge or duplicate invoice effects
- no false “paid” state from pending or manual flows
- no skipped reminders due to transient failures

## Section 7 — CRM and email tests

### CRM lifecycle coverage

- lead creation and sync
- contact mapping
- deal creation
- follow-up task creation
- sync failure and retry
- mapping conflict handling

### Email coverage

- template rendering
- variable validation
- send orchestration
- provider failure
- retry behavior
- delivery status updates
- monthly report email generation

### Must-test lifecycle chains

- lead confirmation
- demo or quote follow-up
- onboarding sequence
- invoice email
- due reminder
- overdue reminder
- payment thank-you
- monthly report

## Section 8 — Integration tests

### Integration targets

- Zoho CRM
- Stripe
- email provider
- WhatsApp
- POS and accounting systems
- external booking systems

### Required test types

- sync success
- sync failure
- retry
- conflict detection
- reconciliation
- credential failure
- stale-data handling

### Integration assertions

- mappings remain stable
- retries are idempotent
- conflict records are produced when needed
- tenant and admin visibility update correctly

## Section 9 — AI evals

### AI evaluation goals

- prompt correctness
- extraction accuracy
- matching quality
- hallucination detection
- availability claim safety
- booking path decision safety
- payment path explanation correctness

### Required eval assets

- labeled dataset of user requests
- expected structured extraction
- expected candidate sets or ranked preferences
- expected trust state
- allowed versus forbidden next actions

### Scoring dimensions

- parse accuracy
- candidate relevance
- location relevance
- trust-language correctness
- false availability claim rate
- false `book now` rate
- escalation appropriateness
- fallback usefulness

### Eval policy

- AI output quality should never be judged by fluency alone
- safety errors should score worse than incomplete-but-safe responses

## Section 10 — Failure tests

### Required failure scenarios

- AI provider down
- search or grounding failure
- CRM provider failure
- email provider failure
- payment provider failure
- duplicate webhook delivery
- integration lag
- database conflict
- network timeout
- stale slot snapshot
- worker backlog

### Required assertions

- system degrades safely
- retries do not duplicate effects
- trust messaging stays honest
- internal admin sees the failure clearly
- critical issues raise alerts

## Section 11 — E2E tests

### Required end-to-end suites

- user booking end-to-end
- payment end-to-end
- CRM lifecycle end-to-end
- monthly billing end-to-end
- integration sync end-to-end
- tenant operational flow end-to-end
- internal admin incident triage path for critical issues

### Environment guidance

- E2E should run in staging-like environments
- use test providers wherever available
- do not rely only on mocked providers for critical payment and webhook behavior

## Section 12 — Test data strategy

### Data requirements

- realistic SME service catalogs
- realistic provider and location data
- realistic slot and capacity scenarios
- realistic invoices and payment states
- realistic CRM and lifecycle records
- anonymized production-like edge-case datasets where allowed

### Dataset families

- swim schools
- clinics
- salons
- trades and service businesses
- tutoring and child activity providers

### Test data rules

- seeded data should model real business ambiguity
- data should include stale, conflicting, missing, and degraded states
- do not use production customer data directly without proper anonymization

## Section 13 — QA automation

### Automation layers

- CI test runs on every meaningful change
- critical-path smoke tests on deploy
- nightly regression suites
- scheduled AI eval runs
- integration sandbox checks

### Minimum CI path

- frontend build
- backend startup and import checks
- unit and integration tests
- migration smoke tests
- contract validation

### Nightly or scheduled path

- business-scenario suites
- AI eval benchmark runs
- reconciliation and retry simulations
- webhook duplication and backlog tests

## Section 14 — Monitoring and feedback

### Production QA loop

- production monitoring should feed QA priorities
- support tickets should feed regression scenarios
- anomaly detection should feed reliability tests
- incident postmortems should add permanent regression coverage

### Monitoring signals that should drive QA

- booking conflicts
- payment anomalies
- email failure spikes
- CRM sync failure spikes
- integration reconciliation drift
- AI fallback spikes
- false availability complaints
- fully booked complaints

### Feedback sources

- tenant support cases
- internal admin issue queues
- payment and billing incident reviews
- AI evaluation dashboards

## Section 15 — Final recommendations

- Build first:
  - core business-flow regression suites
  - booking trust and payment safety tests
  - CRM and email lifecycle tests
  - integration retry and reconciliation tests
  - AI eval dataset and scoring harness
- Keep simple early:
  - small but high-signal datasets
  - a compact set of critical-path E2E tests
  - CI smoke plus nightly deeper suites
- Do not delay:
  - overbooking prevention tests
  - idempotency tests
  - duplicate webhook tests
  - degraded-provider tests
- Anti-patterns to avoid:
  - testing only happy paths
  - skipping booking conflict cases
  - skipping payment edge cases
  - not testing hallucination and trust-language failures
  - not testing integration failure and reconciliation
  - not testing retry and idempotency

## Assumptions

- Current repo confirms deployment healthchecks and some infrastructure tests in `supabase/tests`, but not a mature BookedAI-native unit, integration, E2E, and AI-eval suite yet.
- Current frontend package only confirms build tooling, not a dedicated test runner.
- Current backend requirements do not confirm an installed pytest stack in the repo baseline, so this document is written as the official QA target strategy rather than a claim of existing full coverage.
