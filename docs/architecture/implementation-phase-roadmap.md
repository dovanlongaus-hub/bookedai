# BookedAI Implementation Phase Roadmap

## Purpose

This document converts the upgraded BookedAI product definition into a delivery roadmap.

The roadmap now assumes:

- BookedAI is the AI revenue engine for service businesses
- the product must work across search, website, calls, email, follow-up, and payments
- revenue visibility, missed revenue, attribution, and commission are first-class delivery targets
- pricing is setup fee plus performance-based commission

This roadmap aligns with:

- `docs/architecture/bookedai-master-prd.md`
- `docs/architecture/phase-0-detailed-implementation-plan.md`
- `docs/architecture/phase-1-2-detailed-implementation-package.md`
- `docs/architecture/target-platform-architecture.md`
- `docs/architecture/pricing-packaging-monetization-strategy.md`
- `docs/architecture/analytics-metrics-revenue-bi-strategy.md`
- `docs/architecture/crm-email-revenue-lifecycle-strategy.md`

## Planning principles

- keep current production continuity first
- ship the public revenue-engine narrative early
- promote only the revenue claims that the product can support truthfully
- build the data model for revenue, missed revenue, attribution, and commission before overbuilding UI
- keep rollout additive and feature-flagged
- preserve one shared commercial truth across public, tenant, and admin surfaces

## Execution layers

### 1. Public growth layer

Owns:

- premium landing page
- SEO pages
- campaign and demand capture instrumentation
- demo and strategy booking flows

### 2. Application layer

Owns:

- domain logic
- `/api/v1/*` contracts
- channel normalization
- booking, revenue, and recovery orchestration

### 3. Data layer

Owns:

- normalized commercial entities
- reporting-ready aggregates
- additive migration strategy

### 4. Integration and automation layer

Owns:

- CRM, calendar, payment, and communication integrations
- worker and outbox processing
- recovery workflow execution

### 5. Tenant and admin layer

Owns:

- revenue workspace
- missed revenue and recovery views
- commission and reconciliation views
- optimization and support controls

## Phase summary

| Phase | Name | Primary outcome |
|---|---|---|
| 0 | Narrative and architecture reset | one aligned revenue-engine definition across docs and product surfaces |
| 1 | Public growth and premium landing rebuild | premium public positioning, hero UI, multi-channel story, pricing explanation |
| 2 | Commercial data foundation | revenue, attribution, missed revenue, payment, and commission domain models |
| 3 | Multi-channel capture and conversion engine | search, website, calls, email, and follow-up normalized into one conversion flow |
| 4 | Revenue workspace and reporting | tenant-facing revenue dashboard, funnel metrics, missed revenue, commission visibility |
| 5 | Recovery, payments, and commission operations | recovery workflows, payment-linked reporting, commission support and reconciliation |
| 6 | Optimization, evaluation, and scale hardening | closed-loop tuning, release gating, reporting quality, and SaaS hardening |
| 7 | Tenant revenue workspace | tenant-facing operational revenue product with action queues and lifecycle visibility |
| 8 | Internal admin optimization and support platform | issue-first commercial support, reconciliation, and audit-ready admin operations |
| 9 | QA, release discipline, and scale hardening | regression protection, telemetry, release gates, rollback discipline, and scale readiness |

## Current implementation snapshot

Date: `2026-04-17`

The current repo already has valuable production foundations:

- public marketing and demo flows
- admin interface
- additive `/api/v1/*` contract seams
- search and matching quality work
- Stripe checkout initiation
- calendar and email integrations
- rollout and reliability foundations

The next roadmap change is not to discard that work.

The next roadmap change is to organize it under the revenue-engine model and fill the real gaps:

- public premium positioning
- revenue and missed-revenue domain models
- attribution and commission logic
- payment-linked reporting
- recovery workflow reporting
- tenant-facing commercial visibility

## Phase 0 - Narrative and architecture reset

### Objective

Make the upgraded product definition official across core documentation and planning.

### Outcomes

- PRD updated to the revenue-engine definition
- target architecture updated for multi-channel revenue, attribution, and commission
- roadmap and sprint docs updated to the new delivery sequence
- pricing strategy updated to setup fee plus commission

### Exit criteria

- all core planning documents describe the same product
- Phase 0 execution checklist and deliverable table are approved

## Phase 1 - Public growth and premium landing rebuild

### Objective

Ship a premium public growth surface that clearly explains BookedAI as the AI revenue engine for service businesses.

### Scope

- new hero and brand system
- multi-channel demand capture narrative
- revenue loss problem section
- how-it-works section
- revenue engine feature section
- industry use cases
- revenue dashboard preview
- pricing section with setup fee plus commission
- comparison section
- FAQ and final CTA

### Mandatory public UI blocks

- Revenue Generated card
- Missed Revenue card
- Search to Booking Conversion card
- Call to Booking Conversion card
- Email to Booking Conversion card
- Stripe Payment Success widget
- Booking Confirmed activity card
- Channel Attribution widget
- Commission Summary widget

### Exit criteria

- public site explains the product in under five seconds
- pricing model is clear
- BookedAI no longer reads as a chat-first product
- Phase 1-2 implementation package is approved and mapped to sprint execution

## Phase 2 - Commercial data foundation

### Objective

Build the normalized data and contract layer for commercial truth.

### Scope

- revenue event model
- attribution touch model
- missed revenue event model
- recovery workflow run model
- commission ledger summary model
- payment-linked revenue read models
- reporting contracts for tenant and admin

### Exit criteria

- revenue, missed revenue, attribution, and commission can be queried from shared contracts

## Phase 3 - Multi-channel capture and conversion engine

### Objective

Connect search, website, calls, email, and follow-up into one conversion flow.

### Scope

- channel normalization
- source attribution mapping
- lead qualification improvements
- booking automation and next-step routing
- missed-call recovery triggers
- follow-up workflow triggers
- incomplete-payment trigger support

### Exit criteria

- BookedAI can trace a meaningful part of the funnel from source to booking to payment state

## Phase 4 - Revenue workspace and reporting

### Objective

Ship the tenant-facing product modules that make the revenue-engine promise visible.

### Scope

- revenue dashboard
- bookings generated view
- average booking value
- top-performing channel
- search/call/email conversion cards
- missed revenue tracker
- recovered opportunities
- payment completion status
- commission summary

### Exit criteria

- operators can see what revenue was generated, what was missed, and what is recoverable

## Phase 5 - Recovery, payments, and commission operations

### Objective

Operationalize the money and recovery layer.

### Scope

- payment success and failure workflow linking
- recovery workflow execution and reporting
- admin reconciliation views
- commission support and billing views
- audit-ready commercial drill-downs

### Exit criteria

- internal operators can investigate booking, payment, recovery, and commission state safely

## Phase 6 - Optimization, evaluation, and scale hardening

### Objective

Make BookedAI a continuously improving revenue system with release discipline.

### Scope

- query and conversion telemetry
- replayable evaluation packs
- optimization feedback loops
- channel performance review loops
- CI and release gates for commercial reporting quality
- worker activation and scale hardening

### Exit criteria

- revenue reporting and conversion logic can evolve with clear promotion and rollback discipline

## Phase 7 - Tenant revenue workspace

### Objective

Ship the tenant-facing revenue workspace that exposes BookedAI's value and action model directly to customers.

### Scope

- tenant information architecture
- tenant dashboard
- missed revenue and recovered opportunity views
- payment and follow-up action panels
- commission summary visibility
- integration and lifecycle status summaries

### Exit criteria

- tenant users can understand value, risk, and next actions in one coherent workspace

## Phase 8 - Internal admin optimization and support platform

### Objective

Evolve internal admin into a commercial operations, investigation, and support console.

### Scope

- issue-first admin navigation
- tenant commercial drill-ins
- payment, attribution, and commission diagnostics
- support notes, retry boundaries, and audit visibility
- rollout readiness for tenant and admin surfaces

### Exit criteria

- internal operators can support commercial workflows and investigations without brittle ad hoc reconstruction

## Phase 9 - QA, release discipline, and scale hardening

### Objective

Harden the full commercial platform so releases are governed by explicit regression, telemetry, and rollback discipline.

### Scope

- reporting regression suites
- workflow regression suites
- telemetry and replay loops
- release gates
- rollback and recovery criteria
- worker and integration hardening
- scale-readiness review

### Exit criteria

- the commercial system can be promoted, held, or rolled back with explicit evidence and documented criteria

## Recommended sprint mapping

| Sprint | Theme | Primary outcome |
|---|---|---|
| Sprint 1 | PRD and architecture reset | core docs, scope, and product definition aligned |
| Sprint 2 | Brand system and landing architecture | premium public structure and design primitives approved |
| Sprint 3 | Hero, storytelling, and pricing surface | new landing page sections and setup-plus-commission pricing live |
| Sprint 4 | Commercial data contracts | revenue, attribution, missed revenue, payment, and commission contracts added |
| Sprint 5 | Dashboard and widget read models | commercial widgets backed by shared API responses |
| Sprint 6 | Multi-channel attribution and conversion tracking | source-to-booking metrics stitched across channels |
| Sprint 7 | Recovery workflows | missed-call, follow-up, quote, and payment recovery paths active |
| Sprint 8 | Tenant revenue workspace | tenant-facing dashboard and funnel views shipped |
| Sprint 9 | Admin commercial operations | admin reconciliation, commission, and support tooling expanded |
| Sprint 10 | Optimization and hardening | eval loops, release gates, rollout controls, and scale readiness |
| Sprint 11 | Tenant IA and API preparation | tenant shell, route boundaries, and tenant-safe contract usage aligned |
| Sprint 12 | Tenant workspace implementation | first tenant-facing revenue workspace implemented |
| Sprint 13 | Admin commercial IA and drill-ins | issue-first admin navigation and tenant commercial drill-ins shipped |
| Sprint 14 | Admin support tooling and rollout readiness | reconciliation polish, support tooling, and rollout controls completed |
| Sprint 15 | Telemetry and regression coverage | commercial telemetry, replay readiness, and regression scope established |
| Sprint 16 | Release gates and scale readiness | promote-or-hold discipline, rollback rules, and scale-readiness review completed |

## Current status by sprint

### Sprint 1 - In progress

Evidence already present:

- upgraded messaging and landing-page requirements now exist in working context
- architecture and PRD source docs are being rewritten to match the new narrative

Open gap:

- synchronize all linked architecture and roadmap documents

### Sprint 2 - Pending

Focus:

- formalize public brand system
- lock section-by-section component architecture
- align design tokens and UX rules with the existing frontend reality

### Sprint 3 - Pending

Focus:

- implement the premium landing page
- ship hero widgets, pricing explanation, comparison, FAQ, and CTA loops

### Sprint 4 - Pending

Focus:

- add revenue, missed revenue, attribution, and commission contracts
- define read models and migrations

### Sprint 5 - Pending

Focus:

- expose reporting-ready widget data through shared frontend contracts and APIs

### Sprint 6 - In progress

Evidence already present:

- search quality and booking-context work is materially underway

New interpretation under the upgraded roadmap:

- this work should now be tied to source attribution and conversion reporting rather than treated as isolated search quality only

### Sprint 7 - Pending

Focus:

- recovery workflow execution and reporting

### Sprint 8 - Pending

Focus:

- tenant revenue dashboard and commercial workspace

### Sprint 9 - In progress

Evidence already present:

- admin modularization and reliability views are already underway

New interpretation under the upgraded roadmap:

- these views should expand toward revenue, attribution, payment, and commission operations

### Sprint 10 - In progress

Evidence already present:

- rollout flags, QA scaffolding, and release-gate foundations exist

New interpretation under the upgraded roadmap:

- hardening should explicitly include commercial reporting truth and revenue-widget regression checks

### Sprint 11 - Pending

Focus:

- tenant workspace information architecture
- tenant shell and route boundaries
- tenant-safe API and contract alignment

### Sprint 12 - Pending

Focus:

- tenant revenue workspace implementation
- action queues
- payment, recovery, and commission visibility

### Sprint 13 - Pending

Focus:

- internal admin commercial IA
- tenant drill-ins
- issue-first operational workflows

### Sprint 14 - Pending

Focus:

- admin support tooling
- audit-ready intervention model
- rollout readiness for tenant and admin surfaces

### Sprint 15 - Pending

Focus:

- telemetry and replay readiness
- commercial regression coverage
- cross-surface consistency validation

### Sprint 16 - Pending

Focus:

- release gates
- rollback discipline
- scale-readiness review

## Cross-phase dependencies

Phase 1 depends on:

- finalized copy and design system

Phase 2 depends on:

- agreement on revenue, attribution, and commission semantics

Phase 3 depends on:

- Phase 2 domain models and event capture seams

Phase 4 depends on:

- Phase 2 read models and Phase 3 channel normalization

Phase 5 depends on:

- payment linkage, recovery orchestration, and admin drill-down seams

Phase 6 depends on:

- stable telemetry and reproducible reporting logic

## Roadmap guardrails

- do not publish revenue claims the backend cannot yet support
- do not let pricing messaging get ahead of commission logic readiness
- do not split public, tenant, and admin commercial definitions
- do not treat missed revenue as pure AI inference with no explicit rule basis
