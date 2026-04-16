# BookedAI Coding Implementation Phases

## Purpose

This document defines the concrete coding implementation phases for BookedAI by inheriting and combining the phase logic already established across the architecture documents.

It is intended to answer one practical question:

"In what coding order should the team implement the platform so the codebase evolves safely from the current production state to the target architecture?"

This document is the implementation bridge between:

- `phase-0-1-execution-blueprint.md`
- `phase-1-5-data-implementation-package.md`
- `implementation-phase-roadmap.md`
- `mvp-sprint-execution-plan.md`
- the domain strategy documents in `docs/architecture/`

## Design rules for coding phases

- do not break current production routes first
- do not replace the current stack
- code changes should converge toward bounded modules
- data normalization must happen before read cutover
- integrations should move behind adapters before they expand
- AI must remain advisory and trust-gated
- rollout-sensitive changes must use flags, shadow mode, or dual-write
- documentation and code should move together

## Phase structure used here

Each coding phase contains:

- objective
- code focus
- files and modules to touch
- concrete implementation tasks
- dependency rules
- rollout posture
- definition of done

## Coding Phase 0 — Contract Lock and Refactor Map

### Objective

Freeze understanding of the current production contract so coding work does not accidentally break live behavior.

### Inherited from

- Phase 0 in `phase-0-1-execution-blueprint.md`
- Sprint 1 in `mvp-sprint-execution-plan.md`

### Code focus

- mostly low-risk code reading and instrumentation
- no major behavior change
- add only safe observability and audit support if needed

### Modules to inspect or touch

- `backend/api/public_routes.py`
- `backend/api/admin_routes.py`
- `backend/api/automation_routes.py`
- `backend/api/email_routes.py`
- `backend/api/route_handlers.py`
- `backend/services.py`
- `frontend/src/apps/public/`
- `frontend/src/apps/admin/`
- `frontend/src/shared/`
- `docker-compose.prod.yml`
- `deploy/nginx/`
- `scripts/`

### Concrete implementation tasks

1. Map every production route to its caller and payload contract.
2. Mark every handler path that writes to `conversation_events`, `partner_profiles`, or `service_merchant_profiles`.
3. Mark every frontend component that depends on current response shapes.
4. Add or verify health and smoke checks for public, admin, API, and webhook paths.
5. Create a hotspot map for:
   - `backend/services.py`
   - `backend/api/route_handlers.py`
   - `frontend/src/components/AdminPage.tsx`
   - booking assistant UI flows

### Dependency rules

- no later coding phase should start without route and contract visibility

### Rollout posture

- no external contract changes

### Definition of done

- the team knows exactly what must remain stable during the refactor

## Coding Phase 1 — Modular Seams in Backend and Frontend

### Objective

Create code seams so new logic can be written in bounded modules instead of growing the legacy concentration points.

### Inherited from

- Phase 1 in `phase-0-1-execution-blueprint.md`
- Phase 1 in `implementation-phase-roadmap.md`
- Sprint 2 in `mvp-sprint-execution-plan.md`

### Code focus

- module extraction
- thin router direction
- shared contracts
- provider adapter seams

### Modules to create or expand

#### Backend

- `backend/domain/growth/`
- `backend/domain/conversations/`
- `backend/domain/matching/`
- `backend/domain/booking_trust/`
- `backend/domain/booking_paths/`
- `backend/domain/payments/`
- `backend/domain/crm/`
- `backend/domain/email/`
- `backend/domain/billing/`
- `backend/domain/integration_hub/`
- `backend/domain/ai_router/`
- `backend/integrations/`
- future `backend/platform/`
- future `backend/persistence/`

#### Frontend

- `frontend/src/shared/contracts/`
- `frontend/src/shared/api/`
- future `frontend/src/features/public/`
- future `frontend/src/features/admin/`

### Concrete implementation tasks

1. Move new business policy out of `backend/api/route_handlers.py` into domain services.
2. Stop adding new logic directly to `backend/services.py` except for temporary bridge calls.
3. Introduce shared request and response DTOs in `frontend/src/shared/contracts/`.
4. Consolidate feature-level API calling patterns in `frontend/src/shared/api/client.ts` and related helpers.
5. Create adapter seams for:
   - Stripe
   - Zoho Mail
   - Zoho Calendar
   - Zoho CRM
   - Tawk
   - n8n
6. Introduce feature-flag read helpers and rollout hooks for future phases.

### Dependency rules

- Phase 2 and Phase 3 coding should build on these seams instead of bypassing them

### Rollout posture

- branch-by-abstraction
- no public route change

### Definition of done

- new code has a safe modular home
- legacy concentration files are no longer the default place for new work

## Coding Phase 2 — Persistence Foundation and Repository Layer

### Objective

Introduce the first persistence and platform-safety code foundations required for dual-write and reliable integrations.

### Inherited from

- Phase 0 and Phase 1 DB direction in `phase-0-1-execution-blueprint.md`
- Step 1 and Step 2 in `phase-1-5-data-implementation-package.md`
- Sprint 3 in `mvp-sprint-execution-plan.md`

### Code focus

- SQL migrations
- repository layer
- tenant anchor
- feature flags
- outbox and idempotency foundations

### Modules to create or expand

- `backend/migrations/sql/001_platform_safety_and_tenant_anchor.sql`
- `backend/repositories/`
- future `backend/persistence/models/`
- future `backend/persistence/repositories/`
- feature flag access layer
- audit and idempotency service helpers

### Concrete implementation tasks

1. Add migration `001_platform_safety_and_tenant_anchor.sql`.
2. Create or wire repository seams:
   - `TenantRepository`
   - `AuditLogRepository`
   - `OutboxRepository`
   - `IdempotencyRepository`
   - `WebhookEventRepository`
3. Introduce default tenant lookup in new repository code.
4. Add DB-backed feature flag support.
5. Add low-risk audit logging and webhook tracking entry points.

### Dependency rules

- Phase 3 dual-write should not start until this phase is complete

### Rollout posture

- additive only
- no read cutover

### Definition of done

- the codebase has a real persistence foundation for safe domain expansion

## Coding Phase 3 — Dual-Write for Core Business Flows

### Objective

Start writing normalized domain truth in parallel with the legacy event log.

### Inherited from

- Phase 1 persistence rule in `phase-0-1-execution-blueprint.md`
- Step 3 and Step 4 in `phase-1-5-data-implementation-package.md`
- Phase 1.5 in `implementation-phase-roadmap.md`
- Sprint 4 in `mvp-sprint-execution-plan.md`

### Code focus

- new normalized tables
- dual-write
- repository-backed writes
- reconciliation support

### Modules to create or expand

- `backend/migrations/sql/002_lead_contact_booking_payment_mirror.sql`
- `LeadRepository`
- `ContactRepository`
- `BookingIntentRepository`
- `PaymentIntentRepository`
- public flow write handlers
- event storage bridge logic

### Concrete implementation tasks

1. Add migration `002_lead_contact_booking_payment_mirror.sql`.
2. Add repository-backed writes for:
   - leads
   - contacts
   - booking intents
   - payment intents
3. Dual-write the following flows:
   - booking assistant session creation
   - pricing consultation creation
   - demo request creation
4. Continue writing unchanged `conversation_events`.
5. Add reconciliation queries or scripts to compare new normalized rows with legacy metadata.

### Dependency rules

- Phase 4 APIs should prefer writing through repositories built here
- admin read cutover must not happen yet

### Rollout posture

- use `new_booking_domain_dual_write`
- rollback by disabling the new write path, not by deleting new tables

### Definition of done

- core booking-like flows write both legacy and normalized truth safely

## Coding Phase 4 — API v1 and Domain Service Buildout

### Objective

Shift implementation from legacy route-centric behavior into domain-oriented APIs and business services.

### Inherited from

- target API direction in `api-architecture-contract-strategy.md`
- Phase 2 in `implementation-phase-roadmap.md`
- Sprint 5 in `mvp-sprint-execution-plan.md`

### Code focus

- domain APIs
- typed contracts
- actor-aware envelopes
- normalized service interfaces

### Modules to create or expand

- `backend/api/v1/` or equivalent route grouping
- domain routers for:
  - growth
  - leads
  - conversations
  - matching
  - booking trust
  - bookings
  - payments
  - billing
  - CRM
  - email
  - integrations
- `frontend/src/shared/contracts/`
- `frontend/src/shared/api/`

### Concrete implementation tasks

1. Add initial `/api/v1/*` route groups beside legacy routes.
2. Introduce standard success and error envelopes for all new endpoints.
3. Make new endpoints call domain services and repositories instead of metadata-heavy handler code.
4. Add tenant and actor hooks to new API entry points.
5. Update shared frontend contracts to consume the new domain-first DTOs.

### Dependency rules

- all new features from later phases should target API v1 where possible

### Rollout posture

- coexist old and new endpoints
- do not delete current endpoints yet

### Definition of done

- the repo has a credible domain-first API surface for future development

## Coding Phase 5 — Matching, AI Router, and Booking Trust

### Objective

Implement the trust-first intelligence core that the architecture treats as the platform differentiator.

### Inherited from

- `ai-router-matching-search-strategy.md`
- target domains in `target-platform-architecture.md`
- Sprint 6 in `mvp-sprint-execution-plan.md`

### Code focus

- AI router
- grounded matching
- trust scoring
- safe next-action logic

### Modules to create or expand

- `backend/domain/ai_router/service.py`
- `backend/domain/matching/service.py`
- `backend/domain/booking_trust/service.py`
- `backend/domain/booking_paths/service.py`
- booking assistant API handlers and contracts
- `frontend/src/components/landing/assistant/`
- future assistant feature modules

### Concrete implementation tasks

1. Define request classifier and extraction pipeline.
2. Define provider and model selection logic.
3. Add grounded retrieval orchestration and deterministic fallback behavior.
4. Define booking trust state:
   - freshness
   - verification
   - confidence
   - safe next action
5. Update assistant contracts to expose trust-aware outcomes instead of implied certainty.
6. Update frontend assistant UI to render:
   - book now
   - request booking
   - request callback
   - pay now
   - pay after confirmation

### Dependency rules

- payment routing should depend on trust state from this phase

### Rollout posture

- keep existing assistant UX working
- expose trust upgrades behind compatible response expansion or versioned APIs

### Definition of done

- the assistant behaves as a grounded, trust-first booking surface rather than a generic chatbot

## Coding Phase 6 — Public Growth and Attribution Coding

### Objective

Extend the public app into a scalable acquisition surface while staying aligned to trust-first product behavior.

### Inherited from

- `public-growth-app-strategy.md`
- Phase 3 in `implementation-phase-roadmap.md`
- Sprint 7 in `mvp-sprint-execution-plan.md`

### Code focus

- public frontend feature modules
- attribution capture
- SEO-oriented page families
- trust education

### Modules to create or expand

- `frontend/src/apps/public/`
- `frontend/src/components/landing/`
- future `frontend/src/features/public/marketing/`
- future `frontend/src/features/public/assistant/`
- future `frontend/src/features/public/pricing/`
- growth and attribution APIs

### Concrete implementation tasks

1. Refine homepage messaging toward matching, booking trust, and revenue lifecycle.
2. Add trust explanation content or routes.
3. Add first industry and comparison page families.
4. Add attribution propagation through public forms and assistant entry flows.
5. Persist attribution into lead creation and CRM-ready payloads.

### Dependency rules

- should build on API and trust semantics from Phase 4 and Phase 5

### Rollout posture

- preserve current homepage and SEO-safe URLs

### Definition of done

- public product growth coding can scale beyond a single landing page

## Coding Phase 7 — Admin Refactor and Internal Ops Console

### Objective

Turn the current admin implementation into extensible internal operations code rather than a single dense page.

### Inherited from

- `internal-admin-app-strategy.md`
- Phase 5 in `implementation-phase-roadmap.md`
- Sprint 8 in `mvp-sprint-execution-plan.md`

### Code focus

- admin UI modularization
- ops visibility
- booking trust and integration monitoring

### Modules to create or expand

- `frontend/src/apps/admin/`
- `frontend/src/components/AdminPage.tsx`
- future `frontend/src/features/admin/ops-home/`
- future `frontend/src/features/admin/bookings/`
- future `frontend/src/features/admin/integrations/`
- future `frontend/src/features/admin/trust-monitoring/`
- admin APIs and admin read models

### Concrete implementation tasks

1. Split `AdminPage` into modular sections or route-level features.
2. Add ops home and clearer bookings investigation structure.
3. Add booking-trust visibility and integration health visibility.
4. Add rollout and audit visibility for internal operators.
5. Keep current admin login and critical ops workflow stable during refactor.

### Dependency rules

- should reuse normalized data and domain APIs rather than legacy blobs where safe

### Rollout posture

- use `new_admin_bookings_view` where appropriate

### Definition of done

- admin coding structure supports platform operations growth without becoming another mega file

## Coding Phase 8 — Tenant Foundation and Permission-Aware Surfaces

### Objective

Create the first code foundations for a tenant-safe product surface.

### Inherited from

- `tenant-app-strategy.md`
- `auth-rbac-multi-tenant-security-strategy.md`
- Phase 4 in `implementation-phase-roadmap.md`
- Sprint 9 in `mvp-sprint-execution-plan.md`

### Code focus

- tenant shell
- permissions
- tenant-scoped APIs
- read-heavy tenant modules

### Modules to create or expand

- future `frontend/src/apps/tenant/`
- future `frontend/src/features/tenant/`
- `backend/domain/tenants/`
- permission and actor layer
- tenant-aware repositories and APIs

### Concrete implementation tasks

1. Add permission abstraction and actor classes.
2. Add tenant-aware checks for new APIs.
3. Add tenant app shell and navigation foundation.
4. Build first read-heavy tenant modules:
   - overview
   - leads/conversations
   - booking requests and trust
   - billing summary
   - integrations status
5. Hide internal-only controls from tenant experiences.

### Dependency rules

- requires tenant-aware persistence and permission hooks first

### Rollout posture

- use `tenant_mode_enabled`
- start read-heavy, not full control-heavy

### Definition of done

- the codebase can support a tenant-safe rollout without cloning the admin app

## Coding Phase 9 — CRM, Email, Billing, and Integration Lifecycles

### Objective

Implement the lifecycle and integration code that turns the platform into a real operations and revenue system.

### Inherited from

- `crm-email-revenue-lifecycle-strategy.md`
- `integration-hub-sync-architecture.md`
- Step 5 in `phase-1-5-data-implementation-package.md`
- Epic direction from later roadmap and sprint docs

### Code focus

- lifecycle services
- CRM sync
- email templates and message tracking
- billing callbacks
- outbox and retries

### Modules to create or expand

- `backend/migrations/sql/003_crm_email_integration_billing_seed.sql`
- `backend/domain/crm/`
- `backend/domain/email/`
- `backend/domain/billing/`
- `backend/domain/integration_hub/`
- `backend/integrations/*`
- worker and outbox processors

### Concrete implementation tasks

1. Apply migration `003_crm_email_integration_billing_seed.sql`.
2. Add CRM sync ledger and provider adapter skeleton.
3. Add email template engine foundation and delivery tracking.
4. Add invoice, reminder, thank-you, and monthly-report lifecycle hooks.
5. Add idempotent payment callback handling.
6. Add sync retries, failure tracking, and reconciliation visibility.

### Dependency rules

- should use outbox, idempotency, and repository layers from earlier phases

### Rollout posture

- use:
  - `crm_sync_v1_enabled`
  - `email_template_engine_v1`
  - `billing_webhook_shadow_mode`

### Definition of done

- lifecycle and integration code becomes domain-managed rather than scattered operational logic

## Coding Phase 10 — QA, Security, DevOps, and Read-Cutover Hardening

### Objective

Harden the implementation so the platform can evolve safely after the MVP foundation is in place.

### Inherited from

- `qa-testing-reliability-ai-evaluation-strategy.md`
- `devops-deployment-cicd-scaling-strategy.md`
- `auth-rbac-multi-tenant-security-strategy.md`
- Phase 6 in `implementation-phase-roadmap.md`

### Code focus

- tests
- security hardening
- environment discipline
- worker split planning
- read cutover readiness

### Modules to create or expand

- backend test suites
- frontend test suites
- AI eval suites
- CI scripts and release checks
- worker runtime skeletons
- read-model and cutover tooling

### Concrete implementation tasks

1. Add unit tests for trust logic, matching logic, permission checks, and template rendering.
2. Add integration tests for repositories, callbacks, dual-write, and retries.
3. Add E2E tests for booking, payment, public flows, admin flows, and tenant-safe access.
4. Add AI evals for extraction, matching, hallucination prevention, and degraded fallback.
5. Harden admin auth and webhook replay protection.
6. Formalize staging rehearsal, rollback, backup, and restore workflows.
7. Prepare admin and tenant read cutover only after reconciliation quality is proven.

### Dependency rules

- read cutover must be the last step, not the first

### Rollout posture

- testing and staging first
- cutover only when metrics and reconciliation say it is safe

### Definition of done

- the platform is safe enough for broader tenant rollout and deeper integration expansion

## Recommended implementation order

Use this exact coding sequence:

1. Coding Phase 0
2. Coding Phase 1
3. Coding Phase 2
4. Coding Phase 3
5. Coding Phase 4
6. Coding Phase 5
7. Coding Phase 6 and Coding Phase 7 in parallel where dependencies allow
8. Coding Phase 8
9. Coding Phase 9
10. Coding Phase 10 continuously, with read cutover last

## Practical coding rule of thumb

When implementing any new feature, prefer this order:

1. shared contract
2. repository or persistence seam
3. domain service
4. API route
5. frontend integration
6. feature flag or rollout hook
7. tests
8. docs update

## Success condition

This coding-phase model succeeds when BookedAI implementation becomes:

- modular in code, not only in architecture documents
- normalized in data, not only in metadata blobs
- trust-first in booking behavior, not only in copywriting
- rollout-safe in production, not only in planning
