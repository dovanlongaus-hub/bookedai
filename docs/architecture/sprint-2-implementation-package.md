# BookedAI Sprint 2 Implementation Package

## Purpose

This document turns Sprint 2 into a concrete implementation package aligned with:

- `mvp-sprint-execution-plan.md`
- `coding-implementation-phases.md`
- `coding-phase-file-mapping.md`
- `coding-phase-1-2-3-technical-checklist.md`

Sprint 2 is the package for:

- modular seam creation
- adapter seam cleanup
- shared contract alignment
- first low-risk refactors in real code

## Sprint 2 target outcome

By the end of Sprint 2, the team should have:

- safer modular seams in code
- less pressure on `route_handlers.py` and `services.py`
- clearer homes for new domain logic
- cleaner shared frontend/backend DTO direction

## Scope

### Backend scope

- `backend/domain/*`
- `backend/integrations/*`
- `backend/core/contracts/*`
- `backend/core/feature_flags.py`
- `backend/service_layer/*`
- `backend/api/route_handlers.py`
- `backend/services.py`

### Frontend scope

- `frontend/src/shared/contracts/*`
- `frontend/src/shared/api/client.ts`
- selected large UI components with embedded API choreography

## Work package A — Domain seam reinforcement

### Tasks

- define responsibility boundary for each existing domain service
- stop new policy logic from landing directly in `services.py`
- move low-risk helper logic into `backend/domain/*` or `backend/service_layer/*`
- keep route handlers thin for new edits

### Candidate files

- `backend/domain/growth/service.py`
- `backend/domain/conversations/service.py`
- `backend/domain/matching/service.py`
- `backend/domain/booking_trust/service.py`
- `backend/domain/payments/service.py`
- `backend/domain/crm/service.py`
- `backend/domain/email/service.py`

## Work package B — Integration seam reinforcement

### Tasks

- confirm provider-specific logic home in `backend/integrations/*`
- define or normalize adapter conventions
- move low-risk vendor-specific helpers out of shared service logic where possible

### Candidate files

- `backend/integrations/stripe/adapter.py`
- `backend/integrations/email/adapter.py`
- `backend/integrations/n8n/adapter.py`
- `backend/integrations/zoho_crm/adapter.py`
- `backend/integrations/ai_models/adapter.py`
- `backend/integrations/search/adapter.py`

## Work package C — Shared contract cleanup

### Tasks

- align frontend shared contracts to backend contract intent
- create missing shared DTO exports
- reduce UI-local duplicate typing
- prepare common success and error envelope direction

### Candidate files

- `frontend/src/shared/contracts/common.ts`
- `frontend/src/shared/contracts/matching.ts`
- `frontend/src/shared/contracts/booking-trust.ts`
- `frontend/src/shared/contracts/payments.ts`
- `frontend/src/shared/contracts/index.ts`

## Work package D — First code refactors

### Tasks

- extract low-risk helper group from `backend/api/route_handlers.py`
- extract low-risk provider/helper group from `backend/services.py`
- extract frontend API choreography out of one large UI component where safe

### Recommended first refactor order

1. upload/file helpers from `route_handlers.py`
2. admin support or projection helpers from `route_handlers.py`
3. provider-specific helpers from `services.py`
4. selected frontend API helpers from large UI files

## Definition of done

- the codebase has at least one real modular refactor landed safely
- engineers can add new logic into bounded modules without defaulting to hotspot files
- shared contract cleanup has started with visible repo structure improvement

## Recommended owners

- Backend: domain and service layer refactors
- Frontend: shared DTO and client cleanup
- Product/Architecture: approve boundary decisions
- QA: regression verification on touched flows
