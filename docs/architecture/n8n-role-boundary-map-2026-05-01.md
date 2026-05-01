# BookedAI n8n Role Boundary Map

Date: `2026-05-01`

Status: `active Phase A architecture artifact`

## Purpose

This document defines what `n8n` is allowed to do, what it must never own, and how it should interact with the BookedAI backend.

It answers one practical question:

`How should BookedAI use n8n for acceleration without letting automation become the hidden source of business truth?`

It aligns with:

- `project.md`
- `docs/architecture/phase-a-technical-foundation-decision-package-2026-05-01.md`
- `docs/architecture/early-technical-foundation-and-scale-architecture-plan-2026-05-01.md`
- `docs/architecture/container-topology-and-service-boundary-spec-2026-05-01.md`
- `docs/architecture/backend-scale-discipline-plan-2026-05-01.md`
- `docs/architecture/implementation-phase-roadmap.md`

## 1. Core rule

BookedAI should keep `n8n` as `automation glue`, not as a business-core runtime.

Short rule:

`n8n may assist, trigger, and route, but it must not own truth`

## 2. Why this rule exists

`n8n` is useful because it can accelerate:

- integration wiring
- operator workflows
- notifications
- lightweight orchestration
- low-risk automation experiments

But `n8n` becomes dangerous when it quietly turns into:

- the only place business policy exists
- the only place retries or compensations are understood
- the hidden source of booking, payment, tenant, or revenue truth
- the only readable definition of why something happened

BookedAI should use `n8n` for speed around the edges, not as the system brain.

## 3. Approved role for n8n

`n8n` is approved for these roles:

1. integration glue
2. operator convenience automation
3. low-risk assistive routing
4. notification and communication fan-out
5. non-authoritative workflow coordination

## 4. Allowed responsibilities

### 4.1 Integration glue
Allowed examples:

- receive a safe backend event and forward it to a downstream tool
- call backend-owned endpoints in response to approved triggers
- normalize light external payload differences before handing off to backend contracts
- connect low-risk third-party services that do not own BookedAI truth

### 4.2 Operator convenience flows
Allowed examples:

- summarize action queues for operators
- mirror approved events into Slack, Discord, email, or internal channels
- help with operational reminders, alerts, and triage routing
- trigger internal runbooks or admin conveniences using backend APIs

### 4.3 Notification fan-out
Allowed examples:

- send notifications after backend truth has already been committed
- distribute status-change alerts to internal or external channels
- fan out the same approved event to multiple destinations

### 4.4 Low-risk assistive orchestration
Allowed examples:

- orchestrate non-critical enrichments
- launch safe follow-up tasks after backend-owned state changes
- coordinate auxiliary tooling where failure does not corrupt business truth

### 4.5 Experimentation at the edge
Allowed examples:

- trial low-risk operator automations
- test new integrations before a stricter backend-native implementation is justified
- support temporary assistive workflows while preserving backend truth ownership

## 5. Forbidden responsibilities

`n8n` must not become the owner of any of these:

### 5.1 Booking truth
Forbidden examples:

- deciding the authoritative booking state
- generating the only persisted booking reference
- holding the only copy of booking lifecycle transitions
- deciding whether a booking was successfully created without backend confirmation

### 5.2 Payment and revenue truth
Forbidden examples:

- deciding whether a payment is paid, pending, failed, or reconciled
- holding subscription truth outside backend-owned models
- computing the only commission truth in automation nodes
- driving operator revenue queues from flow-local state only

### 5.3 Tenant and identity truth
Forbidden examples:

- deciding tenant membership or role authorization
- storing the only mapping between customer, tenant, or operator identity
- bypassing backend auth or tenant-safe checks

### 5.4 Core policy logic
Forbidden examples:

- the only implementation of cancellation policy
- the only implementation of refund or payment-help rules
- the only implementation of final-choice confirmation rules
- hidden branching logic that changes business outcomes without a backend-owned contract

### 5.5 Hidden reliability ownership
Forbidden examples:

- flow-only retries with no backend idempotency contract
- compensations that alter truth without auditability
- success/failure semantics visible only in n8n diagrams or node history

Short rule:

`if losing n8n would break business truth, n8n owns too much`

## 6. Required interaction pattern with backend

The correct interaction model is:

1. backend owns the truth
2. backend exposes the contract
3. `n8n` calls or reacts to that contract
4. backend remains valid even if `n8n` is down, delayed, or changed

Required rules:

- `n8n` should prefer backend APIs over direct truth mutations
- when `n8n` receives external events, it should hand them into backend-owned validation and truth paths unless the event is clearly low-risk and non-authoritative
- idempotency, audit, tenant validation, and canonical status logic should remain backend-owned
- `n8n` may decorate or relay, but not redefine core semantics

## 7. Data and state rules

`n8n` may hold temporary workflow state for execution convenience.

It must not hold the only durable meaning of:

- booking state
- payment state
- subscription state
- commission state
- tenant membership state
- portal truth
- customer-care truth

If workflow state exists in `n8n`, the authoritative outcome must still be recoverable from backend-owned systems.

## 8. Reliability rules

If `n8n` is used in a production flow, these rules should hold:

- failure should degrade gracefully when possible
- failure should not silently corrupt customer or operator truth
- replays should be safe or guarded by backend idempotency
- important automation outcomes should be observable outside `n8n` alone
- operator support should not require reading complex flow diagrams to understand business truth

## 9. Security and tenancy rules

`n8n` must not weaken BookedAI security or tenant isolation.

Required rules:

- tenant-aware operations should flow through backend authorization checks
- secrets should be managed as operational credentials, not embedded casually in scattered node configs
- `n8n` should not bypass tenant validation for convenience
- inbound webhook trust should be verified by backend contracts where the event affects business truth
- sensitive customer or payment data should follow the same least-privilege posture as the rest of the platform

## 10. Approved current usage posture for BookedAI

For BookedAI now, `n8n` should be viewed as:

- a useful automation sidecar
- a workflow accelerator
- an integration helper
- an operator productivity tool

It should not be viewed as:

- the lifecycle engine
- the booking engine
- the payment engine
- the tenant-control engine
- the revenue engine

Those remain backend responsibilities.

## 11. Decision test for future automation ideas

Before approving a new `n8n` flow, ask:

1. does this flow own business truth or only assist it?
2. if `n8n` is down, does the platform still preserve the right truth?
3. are retries and idempotency enforced by backend contracts where needed?
4. would an operator need to read the flow diagram to understand authoritative state?
5. is this flow accelerating the edge, or quietly becoming the core?

If the answers point toward truth ownership, the flow belongs in backend code, not `n8n`.

## 12. Relationship to the runtime topology

Inside the runtime topology, `n8n` belongs to the `automation-glue container group`.

That means:

- it is a real runtime boundary
- it may call backend APIs and support operators
- it should not redefine backend-owned contracts
- it should not be mistaken for the business-core container

## 13. Relationship to backend scale discipline

This boundary map supports the backend scale discipline plan by keeping:

- policy logic inside backend-owned modules
- commercial truth inside backend-owned models
- retries and side-effect guarantees aligned to backend/worker contracts
- future scale decisions free from hidden automation coupling

## 14. What is allowed vs forbidden in one list

Allowed:

- notifications
- light routing
- safe event fan-out
- operator reminders and convenience flows
- low-risk integrations
- non-authoritative orchestration

Forbidden:

- booking truth
- payment truth
- subscription truth
- commission truth
- tenant auth or membership truth
- core lifecycle policy logic
- hidden system-of-record behavior

## 15. Acceptance criteria

This boundary map is acceptable when:

- `n8n` is explicitly defined as glue, not core truth
- allowed and forbidden responsibilities are clear
- backend interaction rules are explicit
- reliability, tenancy, and security expectations are explicit
- future automation ideas can be evaluated against this rule set without ambiguity

## 16. Short operator summary

BookedAI should absolutely keep `n8n`, but in the right place.

Use it to move faster around the edges.

Do not let it become the hidden owner of booking, payment, tenant, or revenue truth.

Short rule:

`n8n should accelerate the platform, not secretly define it`
