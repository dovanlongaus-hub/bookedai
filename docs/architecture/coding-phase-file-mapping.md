# BookedAI Coding Phase File Mapping

## Purpose

This document maps the coding implementation phases directly onto the current repository files and folders so engineering teams can see exactly where each phase should be implemented.

It should be read together with:

- `coding-implementation-phases.md`
- `phase-0-1-execution-blueprint.md`
- `phase-1-5-data-implementation-package.md`
- `backend-boundaries.md`
- `folder-conventions.md`

## Mapping principles

- prefer existing scaffolded folders before creating new ones
- keep live routes stable while moving logic behind new seams
- map new code to bounded modules, not giant shared files
- use repositories and adapters before adding new domain behavior

## Phase-to-repo overview

| Coding Phase | Primary backend areas | Primary frontend areas | Infra/data areas |
|---|---|---|---|
| 0 | `backend/api/`, `backend/services.py`, `backend/service_layer/` | `frontend/src/apps/`, `frontend/src/components/` | `docker-compose.prod.yml`, `deploy/nginx/`, `scripts/` |
| 1 | `backend/domain/`, `backend/integrations/`, `backend/core/` | `frontend/src/shared/`, future `frontend/src/features/` | feature flag config paths |
| 2 | `backend/migrations/`, `backend/repositories/`, `backend/core/feature_flags.py` | none or minimal | SQL migrations |
| 3 | `backend/repositories/`, `backend/service_layer/event_store.py`, `backend/api/route_handlers.py` | regression touchpoints only | normalized tables |
| 4 | `backend/api/`, `backend/core/contracts/`, `backend/domain/` | `frontend/src/shared/contracts/`, `frontend/src/shared/api/` | none |
| 5 | `backend/domain/ai_router/`, `backend/domain/matching/`, `backend/domain/booking_trust/`, `backend/domain/booking_paths/` | `frontend/src/components/landing/assistant/`, booking UI sections | AI config |
| 6 | growth APIs and lead persistence | `frontend/src/apps/public/`, landing sections, static pages | sitemap and analytics propagation |
| 7 | admin APIs, read models | `frontend/src/apps/admin/`, `frontend/src/components/AdminPage.tsx` | admin rollout flags |
| 8 | `backend/domain/tenants/` future, permission layer, tenant-aware repositories | future `frontend/src/apps/tenant/` | tenant flags |
| 9 | `backend/domain/crm/`, `email/`, `billing/`, `integration_hub/`, `backend/integrations/`, `backend/workers/` | tenant/admin lifecycle views | migration `003`, worker jobs |
| 10 | tests, security hooks, worker runtime, CI scripts | tests and validation flows | staging, rollout, backup, restore |

## Detailed file mapping by phase

## Coding Phase 0 — Contract Lock and Refactor Map

### Backend files to inspect first

- `backend/api/public_routes.py`
- `backend/api/admin_routes.py`
- `backend/api/automation_routes.py`
- `backend/api/email_routes.py`
- `backend/api/routes.py`
- `backend/api/route_handlers.py`
- `backend/services.py`
- `backend/schemas.py`
- `backend/config.py`
- `backend/db.py`
- `backend/service_layer/event_store.py`
- `backend/service_layer/email_service.py`
- `backend/service_layer/n8n_service.py`

### Frontend files to inspect first

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

### Infra/runtime files to inspect first

- `docker-compose.yml`
- `docker-compose.prod.yml`
- `deploy/nginx/bookedai.au.conf`
- `scripts/deploy_production.sh`
- `scripts/healthcheck_stack.sh`
- `.env.example`

### Expected output

- route inventory
- DTO dependency map
- refactor hotspot map

## Coding Phase 1 — Modular Seams in Backend and Frontend

### Backend files to create or expand

#### Domain layer

- `backend/domain/growth/service.py`
- `backend/domain/conversations/service.py`
- `backend/domain/matching/service.py`
- `backend/domain/booking_trust/service.py`
- `backend/domain/booking_paths/service.py`
- `backend/domain/payments/service.py`
- `backend/domain/crm/service.py`
- `backend/domain/email/service.py`
- `backend/domain/billing/service.py`
- `backend/domain/integration_hub/service.py`
- `backend/domain/ai_router/service.py`

#### Integration layer

- `backend/integrations/base.py`
- `backend/integrations/stripe/adapter.py`
- `backend/integrations/email/adapter.py`
- `backend/integrations/n8n/adapter.py`
- `backend/integrations/zoho_crm/adapter.py`
- `backend/integrations/search/adapter.py`
- `backend/integrations/ai_models/adapter.py`
- `backend/integrations/external_systems/adapter.py`
- future:
  - `backend/integrations/zoho_calendar/adapter.py`
  - `backend/integrations/tawk/adapter.py`

#### Core layer

- `backend/core/contracts/*.py`
- `backend/core/feature_flags.py`
- `backend/core/logging.py`
- `backend/core/observability.py`
- `backend/core/errors.py`

#### Legacy bridge files to shrink over time

- `backend/api/route_handlers.py`
- `backend/services.py`

### Frontend files to create or expand

- `frontend/src/shared/contracts/ai-router.ts`
- `frontend/src/shared/contracts/booking-trust.ts`
- `frontend/src/shared/contracts/common.ts`
- `frontend/src/shared/contracts/crm.ts`
- `frontend/src/shared/contracts/email.ts`
- `frontend/src/shared/contracts/growth.ts`
- `frontend/src/shared/contracts/integrations.ts`
- `frontend/src/shared/contracts/matching.ts`
- `frontend/src/shared/contracts/payments.ts`
- `frontend/src/shared/contracts/index.ts`
- `frontend/src/shared/api/client.ts`

### Recommended future folders to introduce incrementally

- `frontend/src/features/public/assistant/`
- `frontend/src/features/public/pricing/`
- `frontend/src/features/public/demo/`
- `frontend/src/features/admin/bookings/`
- `frontend/src/features/admin/partners/`
- `frontend/src/features/admin/catalog/`

## Coding Phase 2 — Persistence Foundation and Repository Layer

### Files to create or expand

#### Migrations

- `backend/migrations/sql/001_platform_safety_and_tenant_anchor.sql`

#### Repositories

- `backend/repositories/base.py`
- `backend/repositories/tenant_repository.py`
- `backend/repositories/audit_repository.py`
- `backend/repositories/idempotency_repository.py`
- `backend/repositories/outbox_repository.py`
- `backend/repositories/webhook_repository.py`

#### Core/platform helpers

- `backend/core/feature_flags.py`
- future repository wiring helpers in `backend/repositories/__init__.py`

#### Existing DB access boundary to stabilize

- `backend/db.py`

### Files likely to call the new repositories first

- `backend/api/route_handlers.py`
- `backend/service_layer/event_store.py`
- `backend/service_layer/n8n_service.py`

## Coding Phase 3 — Dual-Write for Core Business Flows

### Files to create or expand

#### Migrations

- `backend/migrations/sql/002_lead_contact_booking_payment_mirror.sql`

#### Repositories

- `backend/repositories/lead_repository.py`
- `backend/repositories/contact_repository.py`
- `backend/repositories/booking_intent_repository.py`
- `backend/repositories/payment_intent_repository.py`
- `backend/repositories/lead_contact_repository.py`

#### Write-path bridge files

- `backend/api/route_handlers.py`
- `backend/service_layer/event_store.py`
- `backend/domain/conversations/service.py`
- `backend/domain/payments/service.py`
- `backend/domain/growth/service.py`

### Frontend files impacted indirectly for regression validation

- `frontend/src/components/landing/assistant/BookingAssistantDialog.tsx`
- `frontend/src/components/landing/sections/PricingSection.tsx`
- `frontend/src/components/landing/DemoBookingDialog.tsx`
- `frontend/src/components/AdminPage.tsx`

## Coding Phase 4 — API v1 and Domain Buildout

### Backend files to create or expand

- `backend/api/routes.py`
- `backend/api/public_routes.py`
- `backend/api/admin_routes.py`
- future:
  - `backend/api/v1/growth_routes.py`
  - `backend/api/v1/lead_routes.py`
  - `backend/api/v1/conversation_routes.py`
  - `backend/api/v1/matching_routes.py`
  - `backend/api/v1/booking_trust_routes.py`
  - `backend/api/v1/booking_routes.py`
  - `backend/api/v1/payment_routes.py`
  - `backend/api/v1/billing_routes.py`
  - `backend/api/v1/crm_routes.py`
  - `backend/api/v1/email_routes.py`
  - `backend/api/v1/integration_routes.py`

#### Contract files to expand

- `backend/core/contracts/ai_router.py`
- `backend/core/contracts/booking_trust.py`
- `backend/core/contracts/common.py`
- `backend/core/contracts/crm.py`
- `backend/core/contracts/deployment_modes.py`
- `backend/core/contracts/email.py`
- `backend/core/contracts/growth.py`
- `backend/core/contracts/integrations.py`
- `backend/core/contracts/matching.py`
- `backend/core/contracts/payments.py`

### Frontend files to align

- `frontend/src/shared/contracts/*`
- `frontend/src/shared/api/client.ts`

## Coding Phase 5 — Matching, AI Router, and Booking Trust

### Backend files to expand

- `backend/domain/ai_router/service.py`
- `backend/domain/matching/service.py`
- `backend/domain/booking_trust/service.py`
- `backend/domain/booking_paths/service.py`
- `backend/core/contracts/ai_router.py`
- `backend/core/contracts/booking_trust.py`
- `backend/core/contracts/matching.py`
- `backend/integrations/ai_models/adapter.py`
- `backend/integrations/search/adapter.py`

### Legacy files to progressively stop growing

- `backend/services.py`
- `backend/schemas.py`

### Frontend files to expand

- `frontend/src/components/landing/assistant/BookingAssistantDialog.tsx`
- `frontend/src/components/landing/sections/BookingAssistantSection.tsx`
- `frontend/src/shared/contracts/ai-router.ts`
- `frontend/src/shared/contracts/booking-trust.ts`
- `frontend/src/shared/contracts/matching.ts`

## Coding Phase 6 — Public Growth and Attribution Coding

### Frontend files to expand

- `frontend/src/apps/public/PublicApp.tsx`
- `frontend/src/components/landing/data.ts`
- `frontend/src/components/landing/Header.tsx`
- `frontend/src/components/landing/Footer.tsx`
- `frontend/src/components/landing/sections/HeroSection.tsx`
- `frontend/src/components/landing/sections/ProblemSection.tsx`
- `frontend/src/components/landing/sections/SolutionSection.tsx`
- `frontend/src/components/landing/sections/ProductProofSection.tsx`
- `frontend/src/components/landing/sections/TrustSection.tsx`
- `frontend/src/components/landing/sections/PricingSection.tsx`
- `frontend/public/sitemap.xml`
- `frontend/index.html`

### Backend files to expand

- `backend/domain/growth/service.py`
- `backend/core/contracts/growth.py`
- future growth APIs

## Coding Phase 7 — Admin Refactor and Internal Ops Console

### Frontend files to expand or split

- `frontend/src/apps/admin/AdminApp.tsx`
- `frontend/src/components/AdminPage.tsx`
- future:
  - `frontend/src/features/admin/ops-home/`
  - `frontend/src/features/admin/bookings/`
  - `frontend/src/features/admin/integrations/`
  - `frontend/src/features/admin/trust-monitoring/`

### Backend files to support

- `backend/api/admin_routes.py`
- `backend/domain/conversations/service.py`
- `backend/domain/booking_trust/service.py`
- `backend/domain/integration_hub/service.py`
- reporting repositories and admin read models

## Coding Phase 8 — Tenant Foundation and Permission-Aware Surfaces

### Backend files to create or expand

- future `backend/domain/tenants/`
- `backend/repositories/tenant_repository.py`
- `backend/core/contracts/common.py`
- auth and permission layer near API entrypoints
- tenant-aware query seams across repositories

### Frontend files to create

- future `frontend/src/apps/tenant/`
- future `frontend/src/features/tenant/overview/`
- future `frontend/src/features/tenant/leads/`
- future `frontend/src/features/tenant/bookings/`
- future `frontend/src/features/tenant/billing/`
- future `frontend/src/features/tenant/integrations/`

## Coding Phase 9 — CRM, Email, Billing, and Integration Lifecycles

### Backend files to create or expand

- `backend/migrations/sql/003_crm_email_integration_billing_seed.sql`
- `backend/domain/crm/service.py`
- `backend/domain/email/service.py`
- `backend/domain/billing/service.py`
- `backend/domain/integration_hub/service.py`
- `backend/repositories/crm_repository.py`
- `backend/repositories/email_repository.py`
- `backend/repositories/payment_repository.py`
- `backend/repositories/reporting_repository.py`
- `backend/repositories/integration_repository.py`
- `backend/integrations/zoho_crm/adapter.py`
- `backend/integrations/email/adapter.py`
- `backend/integrations/stripe/adapter.py`
- `backend/workers/outbox.py`
- `backend/workers/scheduler.py`
- `backend/workers/contracts.py`

### Frontend files to support later

- `frontend/src/shared/contracts/crm.ts`
- `frontend/src/shared/contracts/email.ts`
- `frontend/src/shared/contracts/payments.ts`
- `frontend/src/shared/contracts/integrations.ts`

## Coding Phase 10 — QA, Security, DevOps, and Read-Cutover Hardening

### Backend areas to expand

- permission hooks across `backend/api/*`
- idempotency and audit hooks across callback paths
- worker runtime files under `backend/workers/`

### Frontend areas to validate

- public flows
- admin flows
- future tenant flows

### Infra/runtime areas to expand

- `docker-compose.prod.yml`
- `scripts/deploy_production.sh`
- `scripts/healthcheck_stack.sh`
- staging, rollback, backup, and restore scripts or docs

## Highest-priority file-level sequence

1. `backend/api/route_handlers.py`
2. `backend/services.py`
3. `backend/domain/*/service.py`
4. `backend/repositories/*.py`
5. `backend/migrations/sql/001-003`
6. `frontend/src/shared/contracts/*`
7. `frontend/src/shared/api/client.ts`
8. `frontend/src/components/landing/assistant/*`
9. `frontend/src/components/AdminPage.tsx`
10. future `frontend/src/features/*`

## Practical engineering rule

When a team asks "Where should this code go?", use this order:

1. `backend/core/contracts/` or `frontend/src/shared/contracts/` for DTOs
2. `backend/repositories/` for persistence
3. `backend/domain/` for policy
4. `backend/integrations/` for vendor specifics
5. `backend/api/` for route shell wiring
6. `frontend/src/shared/api/` for API client usage
7. feature-level frontend folders for UI behavior
