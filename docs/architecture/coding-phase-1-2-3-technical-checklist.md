# BookedAI Coding Phase 1 2 3 Technical Checklist

## Purpose

This document breaks down Coding Phase 1, 2, and 3 into an implementation-level checklist that engineers can execute directly against the current repository.

It focuses on the near-term technical work that should happen before deeper product-surface expansion.

## Coverage

- Coding Phase 1 — Modular seams in backend and frontend
- Coding Phase 2 — Persistence foundation and repository layer
- Coding Phase 3 — Dual-write for core business flows

## Delivery rules

- preserve current public and admin behavior
- use additive changes only
- do not delete current event logging
- do not cut reads to normalized tables yet
- use feature flags for rollout-sensitive changes

## Phase 1 Technical Checklist — Modular Seams in Backend and Frontend

### 1. Backend domain seam checklist

#### `backend/domain/*`

- review and confirm current service responsibilities in:
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
- document which business logic is still trapped in `backend/services.py`
- document which orchestration is still trapped in `backend/api/route_handlers.py`
- choose one responsibility boundary per domain service:
  - input DTO
  - business rules
  - output DTO

### 2. Legacy bridge cleanup checklist

#### `backend/api/route_handlers.py`

- identify public booking assistant handlers
- identify pricing consultation handlers
- identify demo request handlers
- identify admin booking handlers
- identify email and workflow callback helpers
- mark each function with target destination:
  - keep in route shell
  - move to domain service
  - move to repository
  - move to integration adapter

#### `backend/services.py`

- identify AI provider logic
- identify matching logic
- identify pricing logic
- identify booking logic
- identify external search and grounding logic
- identify payment orchestration logic
- identify functions to migrate first into domain or integration layers

### 3. Integration seam checklist

#### `backend/integrations/*`

- confirm base adapter contract in `backend/integrations/base.py`
- define common adapter method naming conventions
- confirm Stripe logic home in `backend/integrations/stripe/adapter.py`
- confirm email provider logic home in `backend/integrations/email/adapter.py`
- confirm n8n callback/orchestration home in `backend/integrations/n8n/adapter.py`
- confirm Zoho CRM provider mechanics home in `backend/integrations/zoho_crm/adapter.py`
- confirm AI provider logic home in `backend/integrations/ai_models/adapter.py`
- confirm search provider logic home in `backend/integrations/search/adapter.py`
- create missing adapter placeholders if needed for:
  - Tawk
  - Zoho Calendar

### 4. Shared contracts checklist

#### Backend contracts

- review `backend/core/contracts/common.py`
- review `backend/core/contracts/growth.py`
- review `backend/core/contracts/matching.py`
- review `backend/core/contracts/booking_trust.py`
- review `backend/core/contracts/ai_router.py`
- review `backend/core/contracts/payments.py`
- review `backend/core/contracts/crm.py`
- review `backend/core/contracts/email.py`
- review `backend/core/contracts/integrations.py`

#### Frontend contracts

- align `frontend/src/shared/contracts/common.ts`
- align `frontend/src/shared/contracts/growth.ts`
- align `frontend/src/shared/contracts/matching.ts`
- align `frontend/src/shared/contracts/booking-trust.ts`
- align `frontend/src/shared/contracts/ai-router.ts`
- align `frontend/src/shared/contracts/payments.ts`
- align `frontend/src/shared/contracts/crm.ts`
- align `frontend/src/shared/contracts/email.ts`
- align `frontend/src/shared/contracts/integrations.ts`

### 5. Frontend structure checklist

#### Current files to normalize first

- `frontend/src/shared/api/client.ts`
- `frontend/src/shared/config/api.ts`
- `frontend/src/components/landing/assistant/BookingAssistantDialog.tsx`
- `frontend/src/components/landing/sections/BookingAssistantSection.tsx`
- `frontend/src/components/landing/sections/PricingSection.tsx`
- `frontend/src/components/landing/DemoBookingDialog.tsx`
- `frontend/src/components/AdminPage.tsx`

#### Actions

- remove duplicated API request shape handling where possible
- isolate feature-level fetch logic from large UI components
- prepare future `frontend/src/features/` extraction without breaking current runtime

### Phase 1 definition of done

- every new behavior has a clear home in domain, repository, integration, or shared contract layers
- giant files are no longer the only extension point

## Phase 2 Technical Checklist — Persistence Foundation and Repository Layer

### 1. Migration `001` checklist

#### File

- `backend/migrations/sql/001_platform_safety_and_tenant_anchor.sql`

#### Must include

- tenant anchor table
- audit log table
- outbox events table
- webhook events table
- idempotency keys table
- DB-backed feature flags support

### 2. Repository checklist

#### Files

- `backend/repositories/tenant_repository.py`
- `backend/repositories/audit_repository.py`
- `backend/repositories/outbox_repository.py`
- `backend/repositories/idempotency_repository.py`
- `backend/repositories/webhook_repository.py`

#### Actions

- standardize repository constructor shape
- standardize session/transaction usage
- standardize tenant-aware method signatures
- standardize return model conventions
- standardize error propagation and logging behavior

### 3. DB integration checklist

#### Files

- `backend/db.py`
- `backend/repositories/base.py`

#### Actions

- verify session management works for new repositories
- verify migration and schema boot behavior are not conflicting
- decide which paths continue to use `Base.metadata.create_all()` versus migrations

### 4. Feature flag and audit checklist

#### Files

- `backend/core/feature_flags.py`
- `backend/core/observability.py`
- `backend/core/logging.py`

#### Actions

- wire DB-backed flag lookup
- define fallback behavior when flags table is unavailable
- add audit logging helpers for new write paths
- add observability hooks around webhook and dual-write operations

### 5. Default tenant checklist

#### Actions

- define default tenant seed behavior
- define repository helper for default tenant resolution
- ensure old single-tenant behavior still works functionally

### Phase 2 definition of done

- platform-safety schema exists
- repositories are usable by application code
- default tenant support is technically present

## Phase 3 Technical Checklist — Dual-Write for Core Business Flows

### 1. Migration `002` checklist

#### File

- `backend/migrations/sql/002_lead_contact_booking_payment_mirror.sql`

#### Must include

- `leads`
- `contacts`
- `booking_intents`
- `payment_intents`

### 2. Repository checklist

#### Files

- `backend/repositories/lead_repository.py`
- `backend/repositories/contact_repository.py`
- `backend/repositories/booking_intent_repository.py`
- `backend/repositories/payment_intent_repository.py`
- `backend/repositories/lead_contact_repository.py`

#### Actions

- define create and upsert patterns
- define tenant-aware query signatures
- define reconciliation helper queries

### 3. Booking assistant dual-write checklist

#### Primary files

- `backend/api/route_handlers.py`
- `backend/domain/conversations/service.py`
- `backend/domain/payments/service.py`
- `backend/service_layer/event_store.py`

#### Actions

- mirror booking assistant session creation into normalized tables
- persist booking reference
- persist contact identity
- persist service id and service name
- persist requested date and time
- persist payment status and payment URL
- preserve existing event log behavior

### 4. Pricing consultation dual-write checklist

#### Primary files

- `backend/api/route_handlers.py`
- `backend/domain/growth/service.py`
- `backend/domain/payments/service.py`
- `backend/service_layer/event_store.py`

#### Actions

- mirror pricing consultation creation into normalized tables
- persist customer and business identity
- persist plan and payment-related fields
- preserve existing event log behavior

### 5. Demo request dual-write checklist

#### Primary files

- `backend/api/route_handlers.py`
- `backend/domain/growth/service.py`
- `backend/service_layer/event_store.py`

#### Actions

- mirror demo request creation into normalized tables
- persist contact identity and source fields
- preserve existing event log behavior

### 6. Feature-flag rollout checklist

#### Files

- `backend/core/feature_flags.py`
- public write path entrypoints in `backend/api/route_handlers.py`

#### Actions

- gate normalized writes behind `new_booking_domain_dual_write`
- keep legacy write path as fallback
- log dual-write success and failure separately

### 7. Reconciliation checklist

#### Actions

- compare `conversation_events.metadata_json` against normalized rows
- validate booking reference completeness
- validate contact completeness
- validate payment field completeness
- report drift or missing rows

### 8. Regression checklist

#### Frontend files to verify against

- `frontend/src/components/landing/assistant/BookingAssistantDialog.tsx`
- `frontend/src/components/landing/sections/PricingSection.tsx`
- `frontend/src/components/landing/DemoBookingDialog.tsx`
- `frontend/src/components/AdminPage.tsx`

#### Actions

- verify no response contract regression
- verify admin booking list still reconstructs data correctly
- verify pricing and demo flows still complete

### Phase 3 definition of done

- public booking-like flows dual-write safely
- legacy reads remain stable
- the team has measurable confidence in normalized data quality

## Recommended execution order for dev team

1. finish Phase 1 domain and contract cleanup notes first
2. implement migration `001` and repository skeletons
3. wire default tenant and feature flags
4. implement migration `002`
5. dual-write booking assistant flow
6. dual-write pricing consultation flow
7. dual-write demo flow
8. run reconciliation and regression validation

## Engineering handoff note

If the team needs to start coding immediately, the best first work package is:

1. `backend/repositories/*` stabilization
2. `backend/core/feature_flags.py` wiring
3. dual-write entrypoint changes inside `backend/api/route_handlers.py`
4. contract verification against current frontend flows
