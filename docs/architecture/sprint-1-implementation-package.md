# BookedAI Sprint 1 Implementation Package

## Purpose

This document turns Sprint 1 into a concrete implementation package aligned with:

- `mvp-sprint-execution-plan.md`
- `coding-implementation-phases.md`
- `coding-phase-file-mapping.md`
- `coding-phase-1-2-3-technical-checklist.md`

Sprint 1 is the package for:

- contract lock
- production baseline understanding
- hotspot mapping
- low-risk modular preparation

## Sprint 1 target outcome

By the end of Sprint 1, the team should understand exactly:

- which live contracts must not break
- which files are the highest-risk hotspots
- which refactors are safe to start first
- which DTOs and domain seams should be normalized next

## Scope

### Backend scope

- `backend/api/public_routes.py`
- `backend/api/admin_routes.py`
- `backend/api/automation_routes.py`
- `backend/api/email_routes.py`
- `backend/api/route_handlers.py`
- `backend/services.py`
- `backend/schemas.py`
- `backend/service_layer/`

### Frontend scope

- `frontend/src/app/AppRouter.tsx`
- `frontend/src/apps/public/PublicApp.tsx`
- `frontend/src/apps/admin/AdminApp.tsx`
- `frontend/src/components/AdminPage.tsx`
- `frontend/src/components/landing/assistant/BookingAssistantDialog.tsx`
- `frontend/src/components/landing/sections/BookingAssistantSection.tsx`
- `frontend/src/components/landing/sections/PricingSection.tsx`
- `frontend/src/components/landing/DemoBookingDialog.tsx`
- `frontend/src/shared/api/client.ts`
- `frontend/src/shared/config/api.ts`

### Infra scope

- `docker-compose.prod.yml`
- `deploy/nginx/bookedai.au.conf`
- `scripts/deploy_production.sh`
- `scripts/healthcheck_stack.sh`
- `.env.example`

## Work package A — Route and contract inventory

### Tasks

- inventory every public API endpoint and current caller
- inventory every admin endpoint and current caller
- inventory every webhook and callback endpoint
- map response DTO dependencies from frontend to backend
- map event logging paths into `conversation_events`

### Deliverable

- route inventory matrix
- caller-to-endpoint map
- critical DTO dependency map

## Work package B — Hotspot decomposition map

### Tasks

- classify functions inside `backend/api/route_handlers.py`
- classify functions inside `backend/services.py`
- classify sections inside `frontend/src/components/AdminPage.tsx`
- classify booking assistant UI logic inside `BookingAssistantDialog.tsx`
- identify which helpers can be extracted without contract changes

### Deliverable

- hotspot map with:
  - keep in place
  - move to domain
  - move to repository
  - move to integration
  - move to service layer

## Work package C — Shared contract normalization prep

### Tasks

- compare current `backend/core/contracts/*` with `frontend/src/shared/contracts/*`
- identify missing contract parity
- identify duplicate response-shape logic in frontend UI files
- define first DTOs to normalize:
  - booking trust
  - payments
  - matching
  - common response envelope

### Deliverable

- contract gap list
- prioritized DTO normalization list

## Work package D — Safe extraction starters

### Tasks

- identify helper groups in `route_handlers.py` suitable for immediate extraction
- identify provider-specific logic in `services.py` suitable for adapter extraction
- identify UI-local API call helpers suitable for shared client extraction

### Recommended starter candidates

- upload/file handling helpers
- admin support helpers
- booking record projection helpers
- provider selection helpers

### Deliverable

- approved list of first refactors for Sprint 2

## Definition of done

- the team has a stable contract inventory
- hotspot files are decomposed conceptually
- the first safe refactors are identified and agreed
- DTO normalization priorities are defined

## Recommended owners

- Product/PM: route and audience contract inventory
- Backend: handler and service hotspot map
- Frontend: component and DTO dependency map
- DevOps/QA: deploy, healthcheck, and rollback baseline
