# Prompt 5 API V1 Execution Package

## Purpose

This package turns the current Prompt 5 foundation into a delivery-ready execution layer for the next implementation pass.

It is intended for:

- PM and tech lead coordination
- backend contract stabilization
- frontend adoption planning
- QA and contract verification setup
- follow-on sequencing into Prompt 9, Prompt 10, and Prompt 11

## Current baseline

As of `2026-04-15`, Prompt 5 has an additive implementation path in repo form:

- backend v1 route shell under `backend/api/v1_routes.py`
- backend v1 envelope helpers under `backend/api/v1/_shared.py`
- backend shared contracts under `backend/core/contracts/`
- frontend shared Prompt 5 contracts under `frontend/src/shared/contracts/`
- frontend typed v1 client under `frontend/src/shared/api/v1.ts`
- app-level mounting of additive `/api/v1/*` endpoints in `backend/app.py`

The current Prompt 5 baseline is intentionally additive:

- no existing production endpoints are replaced
- no existing public or admin UI caller is forced to migrate immediately
- dual-write and normalized persistence continue to support safe rollout

## Workstream map

### Workstream A — Backend contract verification

Owner:

- backend API/test engineer

Primary goal:

- prove the new `/api/v1/*` endpoints return stable envelope semantics and basic validation behavior

Target areas:

- `backend/api/v1_routes.py`
- `backend/api/v1/_shared.py`
- `backend/core/contracts/`
- backend test scaffolding

Expected outputs:

- basic endpoint contract tests
- success envelope assertions
- validation/error path assertions
- test execution notes

### Workstream B — Public and admin UI adoption

Owner:

- frontend lead or product UI engineer

Primary goal:

- map where current public/admin callers should start consuming `apiV1` and shared Prompt 5 DTOs

Target areas:

- `frontend/src/shared/api/v1.ts`
- `frontend/src/shared/contracts/`
- landing booking assistant flow
- pricing flow
- demo booking flow
- admin operational surfaces

Expected outputs:

- call-site inventory
- migration order
- rollout gating plan
- verification criteria

### Workstream C — Prompt dependency and gap mapping

Owner:

- architect or staff engineer

Primary goal:

- translate Prompt 5 foundations into a precise dependency map for Prompt 9, Prompt 10, and Prompt 11

Target areas:

- AI router and trust flows
- CRM and lifecycle operations
- integration and reconciliation foundations
- worker/outbox handoff requirements

Expected outputs:

- missing module list
- integration seam list
- sequencing risks
- recommended implementation order

## Endpoint inventory now in scope

The current additive Prompt 5 v1 surface includes:

- `POST /api/v1/leads`
- `POST /api/v1/conversations/sessions`
- `POST /api/v1/matching/search`
- `POST /api/v1/booking-trust/checks`
- `POST /api/v1/bookings/path/resolve`
- `POST /api/v1/bookings/intents`
- `POST /api/v1/payments/intents`
- `POST /api/v1/email/messages/send`
- `POST /api/v1/sms/messages/send`
- `POST /api/v1/whatsapp/messages/send`

## Module linkage map

### Backend linkage

- `backend/app.py`
  - mounts the additive v1 router
- `backend/api/v1_routes.py`
  - owns Prompt 5 endpoint entrypoints
- `backend/api/v1/_shared.py`
  - builds standard success/error envelopes
- `backend/core/contracts/`
  - defines DTOs and envelope contracts
- `backend/repositories/tenant_repository.py`
  - resolves default tenant anchor
- `backend/repositories/contact_repository.py`
  - persists normalized contacts
- `backend/repositories/lead_repository.py`
  - persists normalized leads
- `backend/repositories/booking_intent_repository.py`
  - persists normalized booking intents
- `backend/repositories/payment_intent_repository.py`
  - persists normalized payment intents
- `backend/service_layer/email_service.py`
  - handles lifecycle email delivery when SMTP is configured
- `backend/service_layer/communication_service.py`
  - handles additive SMS and WhatsApp delivery with provider-aware fallback and safe config summaries

### Frontend linkage

- `frontend/src/shared/contracts/common.ts`
  - actor/channel/deployment-mode types
- `frontend/src/shared/contracts/api.ts`
  - v1 request and response DTOs
- `frontend/src/shared/contracts/index.ts`
  - shared contract export surface
- `frontend/src/shared/api/client.ts`
  - stable fetch and error handling
- `frontend/src/shared/api/v1.ts`
  - typed Prompt 5 client
- `frontend/src/shared/api/index.ts`
  - shared client export surface

## Delivery sequence recommendation

1. lock backend contract tests around the current v1 surface
2. migrate low-risk non-critical callers to shared Prompt 5 DTOs first
3. add feature-gated consumption in one public flow
4. add feature-gated consumption in one admin read-only surface
5. extend Prompt 5 routes with deeper domain behavior required by Prompt 9, Prompt 10, and Prompt 11
6. only then consider replacing existing production contract paths

## Phase 2 execution lanes

- `Persistence Foundation Agent`
  - keeps repository seams, tenant lookup, feature-flag lookup, and migration-safe DB behavior aligned
- `Runtime Adoption Agent`
  - wires additive audit, outbox, webhook, and idempotency behavior into live v1 or webhook paths without changing envelopes
- `Worker Execution Agent`
  - extends outbox dispatch and tracked job execution behind `backend/workers/` before provider-specific automation expands
- `Reliability Read-Model Agent`
  - keeps Prompt 11 read models authoritative for runtime activity, reconciliation, and operator attention instead of duplicating admin-only queries
- `Admin Reliability Agent`
  - surfaces those additive runtime signals in the existing admin reliability workspace and Prompt 5 preview lane
- `Verification Agent`
  - owns route, repository, worker, webhook, and frontend-build verification before rollout posture changes

## Risks to watch

- v1 contracts drifting from actual repository/service behavior
- duplicate DTO semantics across legacy schemas and Prompt 5 contracts
- UI adoption skipping feature gating and creating mixed-response assumptions
- lifecycle/email/payment endpoints appearing complete while still using additive placeholders
- Prompt 9, Prompt 10, and Prompt 11 teams building directly on route handlers instead of Prompt 5 seams

## Definition of done for the next Prompt 5 pass

- contract tests exist for the additive v1 endpoints
- public/admin adoption order is documented with concrete call sites
- Prompt 9/10/11 dependency gaps are documented with sequencing guidance
- all Prompt 5 changes remain additive and rollout-safe

## Related references

- [Implementation Progress](./implementation-progress.md)
- [Next Wave Prompt 10 11 Live Adoption Plan](./next-wave-prompt-10-11-live-adoption-plan.md)
- [Next Sprint Protected Reauth Retry Gate Plan](./next-sprint-protected-reauth-retry-gate-plan.md)
- [Prompt 5 UI Adoption Plan](./prompt-5-ui-adoption-plan.md)
- [MVP Sprint Execution Plan](../architecture/mvp-sprint-execution-plan.md)
- [Implementation Phase Roadmap](../architecture/implementation-phase-roadmap.md)
- [Prompt 5 To Prompt 11 Dependency Gap Map](../architecture/prompt-5-to-11-gap-map.md)
- [QA Testing Reliability AI Evaluation Strategy](../architecture/qa-testing-reliability-ai-evaluation-strategy.md)
