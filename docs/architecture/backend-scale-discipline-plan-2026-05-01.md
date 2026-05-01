# BookedAI Backend Scale Discipline Plan

Date: `2026-05-01`

Status: `active Phase A architecture artifact`

## Purpose

This document defines the backend discipline BookedAI should follow now so the system can scale later without premature microservice fragmentation or continued monolith drift.

It answers one practical question:

`How should the FastAPI backend be structured, governed, and evolved so BookedAI keeps one reliable business core while search, booking, portal, revenue, and integrations grow?`

It aligns with:

- `project.md`
- `docs/architecture/phase-a-technical-foundation-decision-package-2026-05-01.md`
- `docs/architecture/bookedai-whole-system-rearchitecture-baseline-2026-05-01.md`
- `docs/architecture/early-technical-foundation-and-scale-architecture-plan-2026-05-01.md`
- `docs/architecture/container-topology-and-service-boundary-spec-2026-05-01.md`
- `docs/development/backend-boundaries.md`

## 1. Core rule

BookedAI should keep one `FastAPI` modular monolith as the current backend target.

This is a scale-discipline decision, not a temporary compromise.

Short rule:

`one backend runtime, many explicit domain boundaries`

## 2. Why this is the right posture now

BookedAI still needs:

- shared booking and payment truth
- shared tenant and operator policy
- shared audit and idempotency behavior
- shared integration contracts
- faster product iteration than a microservice program would allow

The main risk is not that the backend is too unified.

The main risk is that the backend becomes structurally unclear.

So the answer is not early service sprawl.

The answer is stronger bounded-context discipline inside one backend core.

## 3. Approved backend scale target

The backend should scale through these five principles:

1. bounded contexts
2. thin API layer
3. backend-owned business truth
4. async side-effect discipline
5. evidence-based future split decisions

## 4. Approved bounded contexts

The current and near-term backend should continue converging toward these core bounded contexts:

- `search_matching`
- `booking`
- `portal`
- `tenant`
- `admin`
- `communications`
- `integrations`
- `payments_revenue`
- `identity_access`

Some of these already exist partially in code and router shape.

Some still remain mixed inside legacy `v1` handlers.

That is acceptable only as a transition state.

## 5. API layer rules

The API layer should own:

- route registration
- auth and permission checks
- request validation
- response envelopes
- DTO mapping
- versioned endpoint ownership
- webhook entrypoints

The API layer should avoid owning:

- long business-policy chains
- provider-specific execution logic
- raw persistence orchestration across many domains
- mixed unrelated domain responsibilities in one route file

Short rule:

`routes validate and delegate, they do not become the business core`

## 6. Service and domain orchestration rules

Backend business logic should live in explicit domain or service modules.

Those modules should own:

- lifecycle policy
- state transitions
- cross-repository orchestration
- tenant-safe business checks
- commercial and portal truth rules
- replay-safe integration triggering

They should avoid becoming a second unstructured monolith.

That means:

- organize by domain responsibility, not helper convenience
- keep function ownership explicit
- avoid dumping unrelated workflows into one large service module

## 7. Repository and query discipline

Repositories and query modules should own:

- persistence operations
- transaction-safe mutations
- tenant-aware lookup seams
- read-model query shaping when SQL complexity is real
- index-aware access paths for hot business tables

Required rules:

- route handlers should not handcraft large repeated query logic
- tenant filtering must be explicit, not assumed
- performance-sensitive reads should be named and reviewable
- core lifecycle and commercial tables should have intentional index ownership

## 8. Async and outbox discipline

BookedAI should treat async behavior as part of backend scale discipline, not as optional cleanup.

The worker and outbox model should own:

- outbound messaging dispatch
- CRM and calendar sync retries
- webhook continuation work
- revenue and payment follow-up jobs
- lifecycle reminders and evidence materialization
- ingestion and indexing continuations

Required rules:

- retryable side effects should move out of the request path where practical
- async jobs must be idempotent or replay-safe
- provider retries must not create duplicate business truth
- user-visible state should not depend on undocumented background assumptions

## 9. Data ownership discipline

Backend scale discipline depends on strict truth ownership.

Required rules:

- the backend owns lifecycle truth, not the frontend
- the backend owns tenant/commercial truth, not `n8n`
- provider metadata should support truth, not replace it
- status vocabularies must be canonicalized in backend-owned contracts
- schema changes should preserve migration safety and domain ownership clarity

## 10. Hot-path scale concerns that should be managed now

The backend should already be designed with these scale-sensitive paths in mind:

### Search and matching
- protect latency-sensitive search paths
- keep ranking and filtering contracts explicit
- isolate heavy enrichment or re-ranking work where async or staged handling is safer

### Booking and final confirmation
- protect final-choice confirmation and booking creation from race-prone side effects
- keep booking reference generation, payment posture, and portal truth backend-owned

### Portal and customer care
- keep read models optimized for booking lookup, status, payment posture, and allowed customer actions
- never expose bare-reference trust assumptions without policy checks

### Webhooks and provider callbacks
- maintain HMAC, idempotency, and tenant validation as baseline requirements
- protect webhook handlers from turning into hidden orchestration monoliths

### Revenue and commission
- keep payment, subscription, commission, and operator action queues in explicit backend-owned models
- do not bury commercial truth in spreadsheets, frontend logic, or automation diagrams

## 11. Refactor direction for current repo reality

Given the current repo state, the next backend cleanup direction should continue from `docs/development/backend-boundaries.md`.

Priority refactor direction:

1. continue shrinking `backend/api/v1_routes.py`
2. separate route ownership by bounded context
3. move mixed orchestration out of route files
4. strengthen repository seams for tenant-safe and performance-sensitive reads
5. keep provider mechanics inside integration modules
6. move retryable side effects into worker-friendly contracts

This is not a cosmetic split.

It is the scale-discipline path for safer future velocity.

## 12. What is allowed

Allowed:

- one FastAPI runtime for the business core
- bounded-context extraction inside the monolith
- additive router splits
- additive service-layer cleanup
- explicit repository/query modules
- worker and outbox strengthening
- versioned API family ownership
- focused performance/index reviews on hot paths

## 13. What is forbidden

Forbidden:

- premature microservice fragmentation without operational evidence
- long-term giant mixed route files owning many domains
- core business truth hidden inside providers or automation tools
- frontend-led lifecycle state as system-of-record
- undocumented status semantics scattered across endpoints
- coupling scale decisions to convenience instead of domain boundaries

## 14. Future split triggers

The backend should split beyond the modular monolith only when evidence shows clear pressure such as:

- materially different deploy cadence across domains
- unacceptable blast radius from releases
- worker load diverging strongly from request load
- search/indexing workloads needing materially separate runtime scaling
- partner/API traffic creating service-isolation pressure
- team ownership becoming blocked by the single-runtime boundary

Until then, prefer modular discipline over service multiplication.

## 15. Required architecture artifacts around this plan

This backend scale plan should be read together with:

- `docs/architecture/container-topology-and-service-boundary-spec-2026-05-01.md`
- `docs/architecture/frontend-consolidation-migration-plan-2026-05-01.md`
- the future `n8n-role-boundary-map` artifact
- `docs/development/backend-boundaries.md`

## 16. Acceptance criteria

This plan is acceptable when:

- the modular-monolith rule is explicit
- the main bounded contexts are named
- API, service, repository, worker, and truth-ownership rules are explicit
- current repo cleanup direction is aligned to this plan
- future split triggers are named so later decisions can be evidence-based

## 17. Short operator summary

BookedAI should not solve scale anxiety by breaking the backend apart too early.

It should solve scale correctly by:

- keeping one FastAPI business core
- extracting clearer domain boundaries
- shrinking mixed route ownership
- pushing retryable side effects into worker/outbox patterns
- keeping tenant, booking, portal, payment, and revenue truth backend-owned

Short rule:

`discipline the monolith first, split later only when evidence forces it`
