# BookedAI Repo And Module Strategy

## Purpose

This document records the production-safe repo and module structuring strategy for BookedAI.au.

It is based on the current repository reality and is intended to guide future refactors without forcing a rewrite.

This strategy exists to support the long-term product direction where BookedAI becomes:

- an AI matching engine
- a booking reliability engine
- a revenue lifecycle platform
- an embedded and standalone SME service platform

## Scope

This document focuses on:

- current repo structure audit
- current module boundary analysis
- reuse and decomposition guidance
- target repo and module structure
- coding boundaries
- naming conventions
- mobile-ready implications
- technical decisions
- migration-safe transition planning

This document is also the official place to capture the higher-detail repo and module strategy baseline for:

- app and surface boundaries
- domain-to-module mapping
- coding boundaries
- naming conventions
- mobile-ready structure implications
- technical decision timing
- module transition sequencing

This document does not authorize:

- a rewrite of the codebase
- immediate framework replacement
- premature microservice decomposition
- unsafe public route or deployment changes

## Current repo maturity

The current repository is a real production monolith-in-one-repo with partial structural separation already present.

Confirmed current high-level shape:

- primary deployed frontend: React + TypeScript + Vite under `frontend/`
- parallel frontend experiment: Next.js under `app/` and `components/`
- backend: FastAPI
- persistence and infra support: self-hosted Supabase stack
- automation: n8n
- edge/runtime: Nginx + Docker Compose

This is not a flat or chaotic repo, but it is also not yet fully domain-aligned.

The current maturity level is best described as:

- operationally mature enough to run production
- structurally hybrid
- partially modularized
- still concentrated in several oversized implementation files

## Documentation synchronization note

This document should be read together with:

- `target-platform-architecture.md`
- `saas-domain-foundation.md`
- `phase-0-1-execution-blueprint.md`

Together, these files define the current official architecture baseline for:

- growth and SEO evolution
- matching and recommendation quality
- availability and booking trust
- payment orchestration
- CRM and email lifecycle
- subscription and reporting evolution
- deployment modes
- integration hub direction
- repo and module boundaries
- phased migration sequencing

## Current repo structure assessment

### Root structure

Primary root folders currently present:

- `app/`
- `components/`
- `frontend/`
- `backend/`
- `supabase/`
- `deploy/`
- `scripts/`
- `docs/`

These top-level folders are already useful and should remain in place in the near term.

### App and surface structure

Current app and surface reality:

- the current production-facing multi-surface web runtime still lives under `frontend/src/`
- the root Next.js app under `app/` and `components/` is a parallel runtime lane, not yet the single production shell
- the repo therefore has a dual frontend reality that later migrations must handle explicitly rather than ignoring

Current public-facing clusters:

- marketing and landing sections
- assistant and chat entry
- pricing consultation flow
- demo request flow
- partner wall
- legal and static assets

Current admin-facing cluster:

- login
- booking overview
- booking detail
- service import
- partner management
- config visibility
- API inventory

### Backend structure

Current backend organization:

- startup and app factory are separated
- route registration is separated by route group
- business logic is still concentrated in large files

Current backend file clusters:

- app startup: `main.py`, `app.py`
- route registration:
  - `api/public_catalog_routes.py`
  - `api/upload_routes.py`
  - `api/webhook_routes.py`
  - `api/admin_routes.py`
  - `api/communication_routes.py`
  - `api/tenant_routes.py`
  - compatibility shims:
    - `api/routes.py`
    - `api/public_routes.py`
    - `api/automation_routes.py`
    - `api/email_routes.py`
- handler orchestration: `api/route_handlers.py`
- business and provider logic concentration: `services.py`
- partial service extraction: `service_layer/`
- data and models: `db.py`
- request and response contracts: `schemas.py`
- config: `config.py`

Current highest-priority backend module debt:

- `backend/api/v1_routes.py` still mixes search, booking, tenant, portal, communication, and integration surfaces

### Integrations structure

Current integrations present in code:

- OpenAI and fallback-capable provider logic
- Stripe checkout session creation
- Zoho Calendar scheduling
- Zoho Mail SMTP and IMAP support
- Tawk webhook intake
- n8n webhook triggering
- website import and search helpers

Current integration boundary quality:

- present
- useful
- not yet consistently isolated behind adapters

### Strengths

- good top-level runtime separation
- deployment and infra are versioned in repo
- frontend already distinguishes public and admin at the composition level
- backend already distinguishes route groups
- current repo proves real production value

### Weaknesses

- giant implementation files remain
- boundaries are still hybrid instead of domain-first
- growth and SEO logic do not yet have a dedicated structural home
- billing, CRM lifecycle, email lifecycle, booking trust, deployment modes, and integration hub do not yet exist as explicit modules

## Current module boundary analysis

### Real boundary style in the current repo

The current codebase is not organized by a single clean pattern.

It is a hybrid of:

- surface-centric organization in the frontend
- component-centric implementation in the frontend
- router-centric organization in the backend
- handler-centric orchestration in the backend
- giant-service-centric business logic in the backend

### UI and business logic coupling

Current situation:

- UI components contain meaningful flow logic for booking, pricing, and demo request handling
- frontend does not directly talk to external providers, which is good
- frontend does directly own too much API-call choreography and response-shape duplication

Recommendation:

- keep current user-visible behavior
- move API interaction into feature-level API modules
- move duplicated frontend DTOs into shared contracts

### Handler and orchestration coupling

Current situation:

- route handlers validate, orchestrate, persist, classify, and sometimes compose metadata-heavy business state
- business orchestration is not thin enough

Recommendation:

- route handlers should become orchestration shells
- domain services should take over business policy
- top-level route ownership should stay split by context
- the remaining `/api/v1/*` monolith should be extracted by bounded context, not only by file size

### Data and domain coupling

Current situation:

- data access is not coupled to UI, which is good
- data access is still coupled too closely to handler orchestration
- metadata blobs in event records currently carry too much business meaning

Recommendation:

- introduce repository boundaries
- preserve current event logs
- gradually dual-write domain truth into explicit tables

### Admin and public coupling

Current situation:

- public and admin are logically separated
- public and admin are still delivered from one frontend artifact

Recommendation:

- split logic boundaries now
- split deployable artifacts later

### SEO and growth coupling

Current situation:

- public growth content exists
- growth attribution and revenue linkage do not have an explicit structural home

Recommendation:

- create a dedicated growth and SEO module early

### Booking and payment coupling

Current situation:

- booking session creation, Stripe checkout creation, Zoho scheduling, email sending, and automation triggering are chained in current service logic

Recommendation:

- introduce payment orchestration and booking trust modules
- wrap providers before changing behavior

### Integration coupling

Current situation:

- provider logic is usable but still embedded inside giant service and handler paths

Recommendation:

- centralize provider mechanics into `integrations/*`
- centralize business decisions into `domain/*`

## Production risk zones

### Public routing and SEO

Current risk:

- high

Why:

- public SEO routes and current domain contracts are live production assets

Safe strategy:

- do not rename or reorganize public entrypoints aggressively
- change internals before changing routes

### Chat and booking flow

Current risk:

- high

Why:

- chat, matching, booking, scheduling, and automation are operationally linked

Safe strategy:

- extract behind stable interfaces
- preserve route contracts

### Payment flow

Current risk:

- high

Why:

- Stripe is already live in booking and pricing flows

Safe strategy:

- wrap Stripe first
- add webhook and billing truth later
- avoid replacing the live path in one cutover

### CRM and lifecycle integrations

Current risk:

- medium today, strategic long-term

Why:

- Zoho CRM is a target commercial truth but is not yet present as a clean module

Safe strategy:

- create CRM lifecycle and adapter boundaries before implementation depth increases

### Admin logic

Current risk:

- medium

Why:

- admin is valuable but concentrated in a giant component

Safe strategy:

- split by admin feature, not by visual redesign first

### Config and runtime coupling

Current risk:

- medium-high

Why:

- env surfaces span backend, frontend build, n8n, Supabase, uploads, proxy, and scripts

Safe strategy:

- catalog and group config before changing names

### Blob metadata dependence

Current risk:

- high

Why:

- metadata blobs are currently carrying domain truth that should later become explicit

Safe strategy:

- dual-write before domain truth cutover

## Reusability and decomposition classification

### Reusable as-is

- top-level repo structure
- deployment scripts and production compose setup
- route group files
- frontend app router split
- current backend config entrypoint

Future home:

- platform runtime
- route layer
- app composition layer

### Reusable with cleanup

- `frontend/src/apps/public/`
- `frontend/src/apps/admin/`
- `frontend/src/shared/config/api.ts`
- `backend/service_layer/email_service.py`
- `backend/service_layer/n8n_service.py`

Future home:

- app surfaces
- shared frontend contracts
- integration adapters

### Reusable only behind adapter

- Stripe logic
- Zoho Calendar logic
- Zoho Mail provider mechanics
- Tawk provider mechanics
- website import and provider search helpers

Future home:

- `backend/integrations/*`

### Should be gradually decomposed

- `backend/services.py`
- `backend/api/route_handlers.py`
- `frontend/src/components/AdminPage.tsx`
- public assistant and pricing feature components with large flow logic

Future home:

- `backend/domain/*`
- `backend/integrations/*`
- `frontend/src/features/*`

### Replace later

- local upload storage implementation
- metadata blobs as domain truth
- custom admin auth and session strategy
- single frontend artifact for public and admin

### Decommission later

- duplicated frontend API base URL logic
- temporary compatibility wrappers after migration

### Missing capability

- growth and SEO attribution domain
- matching domain boundary
- availability and booking trust domain
- booking path resolver
- payment orchestration domain
- CRM lifecycle domain
- email communications domain
- subscription and monthly reporting domain
- deployment modes domain
- integration hub
- worker and outbox layer
- tenant portal
- embedded widget boundary

## Target repo and module structure

## Recommended direction

Keep a single repo and evolve it into a structured modular monolith with:

- clearer app surfaces
- domain modules
- integration modules
- repositories
- shared contracts
- worker and outbox support

This is more appropriate than:

- a full monorepo rewrite
- immediate deploy-unit split
- early microservices

### Recommended target structure

```text
/
  frontend/
    src/
      app/
      apps/
        public/
        admin/
        tenant/
      features/
        public/
          growth/
          assistant/
          pricing/
          demo/
          partners/
        admin/
          auth/
          bookings/
          services/
          partners/
          config/
          api_inventory/
        tenant/
          dashboard/
          leads/
          conversations/
          bookings/
          billing/
          integrations/
          knowledge/
      widgets/
        embedded_chat/
      shared/
        api/
        config/
        types/
        utils/
        ui/
  backend/
    api/
      controllers/
      public_routes.py
      admin_routes.py
      automation_routes.py
      email_routes.py
      routes.py
    domain/
      growth/
      leads/
      contacts/
      conversations/
      matching/
      availability/
      bookings/
      booking_paths/
      payments/
      billing/
      crm/
      email/
      reporting/
      tenants/
      deployment_modes/
      knowledge/
    integrations/
      stripe/
      zoho_calendar/
      zoho_mail/
      zoho_crm/
      tawk/
      whatsapp/
      search/
      grounding/
      n8n/
      accounting/
      inventory/
      pos/
      booking_systems/
    persistence/
      models/
      repositories/
      unit_of_work/
      migrations/
    platform/
      auth/
      audit/
      config/
      feature_flags/
      idempotency/
      logging/
      outbox/
    workers/
      jobs/
      schedulers/
      dispatchers/
    schemas/
  deploy/
  docs/
  n8n/
  scripts/
  supabase/
```

### Why this structure fits the current system

- it preserves the existing repo topology
- it aligns with current public and admin split already present in code
- it allows future tenant and widget surfaces without forcing a new repo
- it gives current giant files somewhere to decompose into
- it supports growth, matching, booking trust, payment, CRM, email, billing, deployment modes, and integrations as first-class modules

## Domain-to-module mapping

### Growth and SEO

Primary homes:

- `frontend/src/features/public/growth/`
- `backend/domain/growth/`

Responsibilities:

- local and service discovery
- landing pages
- attribution
- conversion events
- UTM and source mapping
- page-to-lead-to-revenue linkage

### Matching

Primary home:

- `backend/domain/matching/`

Responsibilities:

- request understanding
- entity extraction
- candidate retrieval
- geo matching
- ranking and scoring
- recommendation synthesis orchestration

### Availability and booking trust

Primary home:

- `backend/domain/availability/`

Responsibilities:

- slot source adapters
- availability checks
- capacity rules
- slot state
- hold and lock logic
- booking confidence scoring
- fully booked, limited, unknown, partner-only states

### Booking path resolver

Primary home:

- `backend/domain/booking_paths/`

Responsibilities:

- book now
- request slot
- partner booking
- call provider
- waitlist
- callback

### Payment orchestration

Primary homes:

- `backend/domain/payments/`
- `backend/integrations/stripe/`

Responsibilities:

- Stripe orchestration
- bank transfer and QR instructions
- partner links
- booking-confidence-aware payment routing

### CRM lifecycle

Primary homes:

- `backend/domain/crm/`
- `backend/integrations/zoho_crm/`

Responsibilities:

- leads
- contacts
- deals
- tasks
- sync state
- follow-up ownership

### Email communications

Primary homes:

- `backend/domain/email/`
- `backend/integrations/zoho_mail/`

Responsibilities:

- templates
- variables
- message logs
- delivery events
- transactional and lifecycle emails

### Subscription and monthly reporting

Primary homes:

- `backend/domain/billing/`
- `backend/domain/reporting/`
- `backend/workers/jobs/`

Responsibilities:

- subscriptions
- billing periods
- invoices
- reminders
- monthly usage snapshots
- booking stats
- monthly customer reports

### Deployment modes

Primary home:

- `backend/domain/deployment_modes/`

Responsibilities:

- standalone SME app
- embedded widget
- plugin and integration mode
- headless API mode

### Integration hub

Primary home:

- `backend/integrations/`

Responsibilities:

- provider adapters
- sync engine inputs and outputs
- mapping layer
- conflict resolution
- reconciliation

### Channel adapters

Primary homes:

- `backend/domain/conversations/`
- `backend/integrations/tawk/`
- `backend/integrations/whatsapp/`
- `frontend/src/widgets/embedded_chat/`

Responsibilities:

- web chat
- WhatsApp
- email touchpoints later if needed
- future mobile or in-app chat reuse

### AI router, search, and grounding

Primary homes:

- `backend/domain/matching/ai_router/`
- `backend/integrations/search/`
- `backend/integrations/grounding/`

Responsibilities:

- provider abstractions
- multi-provider routing
- grounded search
- deterministic fallback mode
- confidence gating
- tool-use interfaces

## Surface strategy

### Public growth app

Current recommendation:

- keep it in the current frontend project
- optimize its code boundaries now
- preserve its routes and SEO continuity

Long-term:

- it should become the most SEO and performance-sensitive surface
- it should not stay structurally entangled with admin forever

### Customer and tenant app

Current recommendation:

- introduce a dedicated code boundary early
- do not require a separate deployable app immediately

Long-term:

- it should become mobile-usable and PWA-ready

### Internal admin app

Current recommendation:

- split logic immediately at the code-organization level
- keep delivery inside the current frontend runtime until safer to separate

Long-term:

- admin should be structurally separate from public growth logic

### Embedded widget and plugin surfaces

Current recommendation:

- create a module boundary early even before full implementation

Long-term:

- widget and plugin surfaces should not be buried inside public landing code

### Headless and API surfaces

Current recommendation:

- keep current backend as the delivery layer
- create domain and integration boundaries so API mode becomes natural later

## Coding boundaries

### Frontend and surface layer

Should contain:

- routes
- layouts
- presentation components
- feature components
- light UI state
- form state
- local interaction logic

Should not contain:

- provider calls
- matching rules
- booking trust rules
- payment policy decisions
- CRM lifecycle rules

### Backend route and API layer

Should contain:

- route handlers
- controllers
- validation
- auth and permission checks
- DTO mapping
- webhook entrypoints
- orchestration entrypoints

Should not contain:

- heavy provider logic
- deep business rules
- persistence details beyond coordination

### Domain services

Should contain:

- matching
- booking trust
- payment decisions
- CRM lifecycle
- email composition intent
- reporting and billing rules
- deployment mode behavior

### Repositories and persistence

Should contain:

- database access
- tenant-aware queries
- transaction boundaries
- persistence contracts

### Integration layer

Should contain:

- Zoho CRM
- Stripe
- email providers
- WhatsApp
- search and grounding providers
- external booking adapters
- POS and accounting adapters
- n8n callbacks and triggering clients

### Shared layer

Should contain:

- types
- schemas
- config
- constants
- logging interfaces
- error and result models
- domain enums
- cross-surface contracts

### Worker and event layer

Should contain:

- outbox records and dispatch logic
- retryable sync jobs
- billing and reminder jobs
- monthly reporting jobs
- reconciliation jobs

Should not contain:

- user-facing HTTP orchestration
- UI concerns
- ad hoc business policy that belongs in domain services

## Structural rules that future changes must follow

- do not call Stripe, Zoho, email providers, search providers, or external booking systems directly from UI code
- do not leave matching or ranking logic inside component files
- do not let availability truth live inside chat-only flow code
- do not let payment state logic remain scattered across page-specific handlers
- do not spread email template logic across unrelated flows
- do not hardcode integration mappings in UI components
- do not mix SEO attribution tracking with styling-only modules
- do not let channel-specific code override domain policy
- do not introduce new giant catch-all service files as a shortcut

## Naming conventions

### Folder conventions

- `domain/` for business capabilities
- `integrations/` for provider adapters and provider-specific mechanics
- `persistence/` for repositories and transaction boundaries
- `platform/` for shared runtime concerns
- `workers/` for async and scheduled execution
- `features/` for surface-specific feature modules
- `apps/` for top-level frontend surfaces
- `widgets/` for embeddable surface code

### File conventions

- `*.service.py` for domain services
- `*.repository.py` for persistence adapters
- `*.adapter.py` for third-party adapters
- `*.client.py` for low-level provider clients
- `*.controller.py` for route-facing orchestration helpers where needed
- `*.router.py` for grouped route files if introduced
- `*.job.py` for background jobs
- `*.mapper.py` for DTO and contract mapping
- `*.types.ts` for frontend shared or feature-local types
- `*.api.ts` for frontend API helpers

### Environment naming conventions

- `VITE_*` only for frontend-public runtime values
- provider-specific server-side values should stay provider-prefixed, such as `STRIPE_*`, `ZOHO_*`, `N8N_*`
- platform-level internal config should use stable project-level prefixes where introduced, such as `BOOKEDAI_*`
- future deployment-mode and tenant-wide internal envs should use grouped naming instead of one-off flags

## Technical decisions summary

### Repo strategy

- keep a single repo now
- do not force a new monorepo shape yet

### Frontend strategy

- keep the current frontend framework in the near term
- split code boundaries before splitting deployed artifacts

### Backend strategy

- keep FastAPI in the medium term
- extract domains and adapters before discussing framework replacement

### Integration strategy

- create explicit integration module boundaries early
- do not defer adapterization until more providers are added

### Worker and outbox timing

- introduce the structure early
- keep the first version small and production-safe

### Surface split timing

- separate public, tenant, admin, widget, and headless concerns in code organization early
- separate deploy units later when routing and operational risk are lower

### Worker and event layer

Should contain:

- outbox handling
- retries
- sync jobs
- reporting jobs
- monthly billing and monthly report tasks

### Boundary rules

Mandatory rules:

- do not call Zoho, Stripe, email, or search providers directly from UI
- do not keep matching logic inside component files
- do not let availability truth live in chat UI layers
- do not let payment state decisions stay ad hoc in page handlers
- do not scatter email templates across unrelated flows
- do not hardcode integration mappings in UI
- do not let channel-specific logic override shared domain logic

## Naming conventions

### Folder conventions

- `domain/` for business domains
- `integrations/` for providers and external systems
- `features/` for frontend product features
- `widgets/` for embeddable surfaces
- `platform/` for cross-cutting runtime concerns
- `persistence/` for repositories and models
- `workers/` for jobs and async execution
- `shared/` for cross-surface contracts and utilities

### File conventions

Python:

- `*.service.py`
- `*.repository.py`
- `*.adapter.py`
- `*.client.py`
- `*.controller.py`
- `*.router.py`
- `*.job.py`
- `*.mapper.py`

TypeScript:

- `*.api.ts`
- `*.types.ts`
- `*.hook.ts`
- `*.view.tsx` when useful

### DTO and interface naming

Recommended names:

- `MatchingResult`
- `MatchingCandidate`
- `BookingTrustAssessment`
- `PaymentInstruction`
- `ProviderSyncResult`
- `CrmSyncOutcome`
- `EmailTemplateRenderResult`

### Environment naming

Recommended approach:

- keep `VITE_*` for browser-exposed frontend variables
- use provider-specific groups like `STRIPE_*`, `ZOHO_*`, `N8N_*`
- introduce clearer grouping for server-only and deployment mode configuration over time

## Mobile-ready implications

The target structure must stay mobile-ready without overbuilding native mobile.

Implications:

- business logic must stay out of desktop-only UI assumptions
- conversation, booking, payment, CRM, and reporting flows should be reusable through shared contracts
- current web should remain the immediate primary surface
- PWA readiness should be a later surface concern, not a domain rewrite
- future native/mobile app adoption should remain possible because domain logic is backend-owned

## Technical decisions

### Keep current frontend framework in the near term

Recommendation:

- yes

Reasoning:

- production continuity and public SEO stability matter more than framework replacement

### Do not force public growth app migration immediately

Recommendation:

- yes

Reasoning:

- route and SEO continuity are more valuable than theoretical framework consistency

### Keep current backend framework in the medium term

Recommendation:

- yes

Reasoning:

- FastAPI is already the operational backbone and can be modularized safely

### Split code organization before splitting deployable artifacts

Recommendation:

- yes

Reasoning:

- safer migration sequence

### Introduce shared layers early

Recommendation:

- yes

Reasoning:

- types, schemas, API contracts, config boundaries, and result objects already need consolidation

### Introduce worker and outbox structure early

Recommendation:

- yes

Reasoning:

- billing lifecycle, CRM sync, reporting, retries, and reconciliation all depend on it

### Introduce an integration hub early

Recommendation:

- yes

Reasoning:

- integrations are strategic and should not continue to accumulate ad hoc

### Introduce CRM lifecycle, email, growth, and deployment mode modules early

Recommendation:

- yes

Reasoning:

- these are strategic long-term capabilities, not optional add-ons

## Transition plan

### Step 1 — standardize config and contract inventory

Goal:

- reduce hidden coupling

### Step 2 — centralize shared schemas and frontend API contracts

Goal:

- stop duplication and drift

### Step 3 — create target module skeletons

Goal:

- create stable homes before moving logic

### Step 4 — isolate integration boundaries

Goal:

- wrap provider-specific logic

### Step 5 — extract domain logic from giant handlers and service files

Goal:

- establish bounded business modules

### Step 6 — introduce repository boundaries

Goal:

- stop orchestration code from owning raw persistence

### Step 7 — introduce worker, outbox, and retry foundations

Goal:

- support lifecycle and sync safety

### Step 8 — split admin and public code by feature modules

Goal:

- improve maintainability without changing behavior

### Step 9 — create explicit homes for missing strategic capabilities

Goal:

- let growth, billing, CRM, trust, and deployment mode implementation land cleanly later

### Step 10 — evaluate artifact split only after code boundaries stabilize

Goal:

- avoid premature operational churn

## Anti-patterns to avoid

The following should not be recommended:

- full repo rewrite
- global framework replacement too early
- stuffing more domain logic into UI
- keeping giant handler and service files as the permanent structure
- mixing public, admin, growth, tenant, and widget logic indefinitely
- leaving SEO and growth without their own structural home
- continuing to mix matching, trust, payment, CRM, and email logic together
- hardcoding integrations into pages and components
- premature microservices
- premature native mobile structuring
- ignoring widget, plugin, headless, and standalone deployment modes

## Final structural recommendation

BookedAI should continue as a single production repo in the near term, but the code inside that repo should begin to evolve toward:

- explicit app surfaces
- explicit business domains
- explicit integration boundaries
- explicit worker and event support
- explicit shared contracts

This is the safest path that supports:

- SEO and growth scale
- matching quality
- booking trust
- CRM and email lifecycle
- billing evolution
- embedded and standalone product modes
- future surface separation
