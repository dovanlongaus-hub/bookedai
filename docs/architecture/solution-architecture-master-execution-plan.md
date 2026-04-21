# BookedAI Solution Architecture Master Execution Plan

Date: `2026-04-17`

Document status: `active master delivery plan`

## 1. Purpose

This document is the top-level implementation plan for BookedAI after the product upgrade to:

BookedAI - The AI Revenue Engine for Service Businesses

It is designed to give leadership, product, architecture, engineering, operations, and QA one shared execution view from:

- solution architecture direction
- domain and system responsibilities
- phase sequencing
- sprint sequencing
- team ownership
- dependency and release gates

This document should be treated as the coordination layer above the more specialized architecture and sprint documents.

It aligns with:

- `docs/architecture/bookedai-master-prd.md`
- `docs/architecture/phase-0-detailed-implementation-plan.md`
- `docs/architecture/phase-1-2-detailed-implementation-package.md`
- `docs/architecture/target-platform-architecture.md`
- `docs/architecture/implementation-phase-roadmap.md`
- `docs/architecture/mvp-sprint-execution-plan.md`
- `docs/architecture/pricing-packaging-monetization-strategy.md`
- `docs/architecture/analytics-metrics-revenue-bi-strategy.md`

## 2. Strategic outcome

The program goal is not to ship a better chatbot.

The program goal is to turn BookedAI into a premium multi-channel revenue engine that:

- captures demand across search, website, calls, email, follow-up, and payments
- converts that demand into bookings
- connects bookings to revenue events
- identifies missed revenue and recovery opportunities
- reports commercial impact credibly
- supports setup-fee plus performance-based commission pricing

## 3. Solution architect view

## 3.1 Business capability map

BookedAI should be implemented as seven connected business capability layers:

1. demand capture
2. lead qualification
3. booking conversion
4. payment and revenue events
5. missed revenue detection
6. recovery automation
7. reporting, attribution, and commission

## 3.2 Product surface map

### Public growth surface

Owns:

- brand, positioning, and conversion narrative
- premium landing page
- SEO, campaign, and channel attribution capture
- widget entry and demo conversion

### Tenant revenue workspace

Owns:

- revenue dashboard
- bookings generated
- conversion by channel
- missed revenue tracker
- recovery visibility
- payment status
- commission summary

### Internal admin surface

Owns:

- tenant support
- reconciliation
- attribution diagnostics
- payment and commission operations
- rollout and optimization controls

### Integration and embedded surfaces

Owns:

- website widget
- calls and messaging hooks
- email intake and follow-up triggers
- external APIs and webhooks

## 3.3 Architecture layers

### Experience layer

Frontend surfaces, landing pages, product dashboards, admin operations views, embedded widgets.

### Application layer

FastAPI routes, domain services, workflow orchestration, shared contracts, API v1 read and write models.

### Domain layer

Demand capture, attribution, qualification, booking, payment, revenue, missed revenue, recovery, commission.

### Data layer

Supabase Postgres, normalized commercial entities, event capture, read models, audit logs, outbox, idempotency.

### Integration layer

Stripe, CRM, calendar, email, telephony, chat, webhook, and n8n orchestration adapters.

### Platform layer

Deployment, Nginx, feature flags, CI/CD, observability, release gates, QA automation.

## 4. Program design rules

- preserve current production continuity
- ship additive changes first
- do not publish commercial claims that cannot be backed by data
- treat revenue and attribution as first-class domains
- use feature flags, dual-write, and read shadowing for risky transitions
- keep one shared commercial vocabulary across public, tenant, and admin
- make payment and commission logic auditable
- keep AI underneath the value story, not in front of it

## 5. Workstream model

The program should run across nine coordinated workstreams.

### Workstream 1 - Product and narrative

Owns:

- brand system
- landing page copy
- positioning guardrails
- sales narrative
- phase acceptance criteria

### Workstream 2 - Public growth experience

Owns:

- premium landing page
- CTA flows
- hero and dashboard visuals
- industry pages
- attribution capture on public touchpoints

### Workstream 3 - Commercial domain and APIs

Owns:

- revenue, attribution, missed revenue, and commission models
- API v1 contracts
- shared read models
- booking and payment commercial semantics

### Workstream 4 - Multi-channel ingestion and conversion

Owns:

- search, website, calls, email, and follow-up normalization
- qualification and booking handoff
- source attribution stitching

### Workstream 5 - Payments and revenue lifecycle

Owns:

- Stripe and payment event linkage
- revenue event creation
- failed payment follow-up
- payment-linked reporting

### Workstream 6 - Recovery workflows

Owns:

- missed call recovery
- unbooked lead follow-up
- quote reminders
- payment completion reminders
- recovery reporting

### Workstream 7 - Tenant revenue workspace

Owns:

- revenue dashboard
- conversion funnel views
- missed revenue views
- commission summary
- operator action queues

### Workstream 8 - Internal admin and support operations

Owns:

- admin IA
- reconciliation
- tenant support tools
- attribution and commission support flows
- optimization controls

### Workstream 9 - QA, DevOps, and release discipline

Owns:

- release gates
- dashboard and reporting regression checks
- rollout flags
- worker activation discipline
- reliability and observability

## 6. Phase plan

## Phase 0 - Program reset and alignment

### Objective

Align every core planning artifact to the new revenue-engine model before major implementation continues.

### In scope

- PRD reset
- target architecture reset
- roadmap and sprint reset
- pricing and packaging reset
- landing-page requirements reset

### Key deliverables

- updated core docs
- synchronized terminology
- agreed commercial vocabulary

### Exit criteria

- no core document still frames BookedAI as a chat-first product
- Phase 0 execution package is approved and used as the handoff into Phase 1

## Phase 1 - Homepage sales deck, premium public narrative, and brand system

### Objective

Make the homepage the primary sales deck so the public story is immediately clear, commercially credible, and ready to convert real SME interest.

### In scope

- brand system
- design tokens
- header, hero, section hierarchy, CTA system
- premium dark-mode visual language
- pricing explanation with setup fee plus commission
- launch offer for first 10 SME customers
- QR and registration-led conversion path
- clear separation between homepage selling layer and deeper `product/demo` runtime

### Key deliverables

- production-ready landing-page copy
- component tree
- premium hero and widget design spec
- homepage CTA architecture for free setup, trial, and product demo

### Exit criteria

- public narrative explains BookedAI in under five seconds
- pricing feels aligned and lower-risk
- the homepage can sell the launch offer without requiring the full live runtime to explain itself
- Phase 1-2 execution package is approved and used as the implementation baseline

## Phase 2 - Landing implementation, registration conversion, and growth instrumentation

### Objective

Ship the homepage sales deck and connect it to measurable registration and growth inputs.

### In scope

- landing page implementation
- sticky header and mobile CTA
- browser-framed hero dashboard
- integration strip and activity feed
- attribution capture for public CTA flows
- interested-registration flow
- launch-offer email confirmation path
- standalone versus full-portal deployment-mode selling

### Key deliverables

- deployed premium landing page
- conversion tracking for demo and strategy flows
- SME registration path for setup, trial, and onboarding intent

### Exit criteria

- public experience is live and aligned to the new positioning
- homepage can convert real SME interest into a BookedAI-owned registration flow

## Phase 3 - Commercial data foundation

### Objective

Create the shared truth for revenue, missed revenue, attribution, payment, and commission.

### In scope

- normalized data model additions
- API v1 commercial contracts
- reporting read models
- domain ownership definitions

### Key deliverables

- revenue dashboard contract
- missed revenue contract
- attribution contract
- payment status contract
- commission summary contract

### Exit criteria

- core widgets can be backed by actual shared data structures

## Phase 4 - Multi-channel capture and conversion orchestration

### Objective

Connect demand channels into one measurable conversion engine.

### In scope

- channel ingestion normalization
- qualification logic
- booking handoff
- source stitching
- channel-level conversion tracking

### Key deliverables

- source-to-booking funnel coverage
- per-channel conversion metrics

### Exit criteria

- BookedAI can show where demand came from and how it converted

## Phase 5 - Payments, revenue events, and commission operations

### Objective

Tie bookings to money moments and commission logic credibly.

### In scope

- payment success and failure events
- revenue recorded events
- commission basis logic
- admin commercial drill-in

### Key deliverables

- Stripe-linked revenue widgets
- commission summary logic
- payment completion reporting

### Exit criteria

- booking, payment, and commission reporting is operationally usable

## Phase 6 - Recovery workflows and missed revenue operations

### Objective

Move from passive reporting to active revenue recovery.

### In scope

- missed call auto callback
- unbooked lead follow-up
- email reminder sequences
- quote reminders
- payment completion reminders

### Key deliverables

- recovery workflow engine slices
- recovery visibility in product

### Exit criteria

- BookedAI can report both missed revenue and recovery outcomes

## Phase 7 - Tenant revenue workspace

### Objective

Expose the full revenue-engine promise inside the tenant product.

### In scope

- tenant dashboard
- channel performance views
- missed revenue tracker
- recovered opportunity tracking
- commission summary
- payment and follow-up action panels

### Key deliverables

- first tenant revenue workspace

### Exit criteria

- operators can see what BookedAI produced and what still needs action

## Phase 8 - Internal admin optimization and support platform

### Objective

Give internal teams the controls to support, optimize, and reconcile the system.

### In scope

- commercial ops IA
- tenant drill-ins
- attribution diagnostics
- commission support tools
- optimization feedback capture

### Key deliverables

- issue-first admin workspaces
- commercial reconciliation views

### Exit criteria

- internal teams can support revenue operations without ad hoc investigation

## Phase 9 - QA, release discipline, and scale hardening

### Objective

Make commercial reporting and optimization safe to evolve.

### In scope

- reporting regression suites
- release gates
- telemetry and eval loops
- observability and rollback discipline
- worker activation and scale review

### Key deliverables

- release gates for revenue reporting
- scale-readiness checklist

### Exit criteria

- changes to conversion, reporting, and recovery can ship with confidence

## 7. Sprint plan

The recommended initial execution horizon is 16 sprints.

## Sprint 1 - Core plan reset

Focus:

- update PRD, target architecture, roadmap, sprint plan
- finalize vocabulary for revenue, attribution, missed revenue, recovery, commission

Outputs:

- synchronized strategy documents

## Sprint 2 - Brand system and IA

Focus:

- brand system
- landing section map
- design tokens
- CTA system
- hero and widget architecture

Outputs:

- approved public design and copy architecture

## Sprint 3 - Landing page implementation foundation

Focus:

- shared UI primitives
- section scaffolds
- sticky header
- hero shell
- mobile CTA

Outputs:

- reusable landing system ready for content integration

## Sprint 4 - Landing page completion

Focus:

- problem, how-it-works, feature, dashboard preview, pricing, comparison, FAQ, footer
- integration strip and activity feed

Outputs:

- complete premium landing page

## Sprint 5 - Growth attribution instrumentation

Focus:

- CTA event capture
- UTM and source context persistence
- demo and strategy booking attribution

Outputs:

- public growth attribution baseline

## Sprint 6 - Commercial schema and contracts

Focus:

- normalized revenue, attribution, missed-revenue, payment, commission entities
- API v1 contracts

Outputs:

- backend commercial contract baseline

## Sprint 7 - Revenue dashboard read models

Focus:

- revenue generated
- bookings generated
- average booking value
- top-performing channel

Outputs:

- core revenue dashboard widgets backed by data

## Sprint 8 - Conversion metrics by channel

Focus:

- search to booking
- call to booking
- email to booking
- follow-up recovery

Outputs:

- conversion cards and reporting slices

## Sprint 9 - Payment and revenue event linkage

Focus:

- Stripe payment success and failure states
- booking-linked payment events
- revenue recorded logic

Outputs:

- payment and revenue widget support

## Sprint 10 - Commission logic and admin support views

Focus:

- commission basis configuration
- commission summary reporting
- admin drill-downs

Outputs:

- performance-aligned pricing support baseline

## Sprint 11 - Missed revenue model

Focus:

- unanswered call rules
- stalled enquiry rules
- incomplete payment rules
- lost-value estimate logic

Outputs:

- missed revenue tracking baseline

## Sprint 12 - Recovery workflows

Focus:

- missed call auto callback
- unbooked lead follow-up
- quote reminder
- payment completion reminder

Outputs:

- first active recovery automations

## Sprint 13 - Tenant revenue workspace foundation

Focus:

- `tenant.bookedai.au` as the canonical tenant host
- unified tenant sign-up and sign-in
- tenant dashboard shell
- revenue summary
- conversion and recovery modules
- business and catalog data input foundation
- create account, claim, and invite-acceptance auth flow
- onboarding progress and business-profile capture
- first team and role model

Outputs:

- first unified tenant workspace with one account system, one operator gateway, onboarding status, and first-pass team access model

## Sprint 14 - Tenant billing and role-safe operations

Focus:

- tenant billing workspace
- self-serve billing setup, plan selection, and trial posture
- invoice and payment-method seams
- tenant team workspace and role-safe actions
- role-aware billing and catalog write enforcement

Outputs:

- tenant billing and access-control surface that behaves more like a paid SaaS workspace than a read-only dashboard

## Sprint 15 - Optimization loop and feedback capture

Focus:

- operator feedback on bad attribution, missed-revenue rules, and recovery outcomes
- optimization queues
- paid-tenant retention inputs and monthly value reporting refinements
- invite email and first-login onboarding polish
- role-aware integrations and remaining tenant write gates
- tenant-facing renewal, trial-expiry, and payment-attention messaging

Outputs:

- closed-loop optimization baseline plus stronger tenant retention and role-aware workspace behavior

## Sprint 16 - Hardening and release gate

Focus:

- regression coverage
- release and rollback gates
- telemetry and reporting quality controls
- billing, auth, and tenant-host hardening for a paid SaaS rollout
- tenant invite, auth, team, billing, and catalog release discipline
- rollback-safe rollout for role and permission changes

Outputs:

- first scale-safe release baseline

## 8. Team ownership model

### Product and architecture

Owns:

- business scope
- acceptance criteria
- narrative consistency
- cross-workstream decisions

### Frontend

Owns:

- public growth UI
- tenant UI
- admin UI
- shared design system and API clients

### Backend and domain

Owns:

- contracts
- orchestration
- booking, revenue, attribution, recovery, commission logic

### Data and persistence

Owns:

- schema
- read models
- migration safety
- reporting aggregates

### Integrations and automation

Owns:

- Stripe
- CRM
- calendar
- email
- call or messaging event adapters
- n8n flows

### QA, DevOps, and reliability

Owns:

- rollout flags
- browser and API regression suites
- observability
- release gates
- rollback safety

## 9. Dependency map

### Must complete before tenant workspace depth

- commercial schema and contracts
- payment and revenue event linkage
- attribution baseline

### Must complete before strong commission support

- revenue event truth
- payment-state truth
- attribution logic

### Must complete before recovery reporting can be trusted

- missed-revenue rule model
- workflow-run tracking
- booking and payment lifecycle linkage

## 10. Release gating

The program should use the following release gates:

### Gate A - Narrative truth gate

- public copy matches actual supported product

### Gate B - Commercial data truth gate

- revenue and attribution fields have traceable upstream data

### Gate C - Payment and commission gate

- booking, payment, and commission states reconcile correctly

### Gate D - Recovery safety gate

- automated follow-up has explicit guardrails and auditability

### Gate E - Product readiness gate

- tenant and admin views are consistent with shared read models

## 11. Top risks

### Product risk

- public positioning gets ahead of real reporting support

### Architecture risk

- revenue logic is split across ad hoc workflows instead of shared domains

### Data risk

- attribution quality is too weak to support commission claims

### Operational risk

- admin teams cannot reconcile payment, recovery, and commission issues quickly

### Delivery risk

- landing-page work ships without the follow-on commercial model backlog clearly scheduled

## 12. Recommended delivery cadence

- weekly architecture and product sync
- weekly cross-workstream dependency review
- sprint demo every two weeks
- release readiness review at the end of each phase
- documentation write-back in the same sprint as any material scope change

## 13. Definition of program success

The plan should be considered successful when:

- BookedAI is clearly understood as a revenue engine, not a chatbot
- the public site converts around that story
- the product can show bookings generated, revenue generated, and missed revenue in a credible way
- the pricing model is supported by commission and reporting logic
- tenant and admin teams share one commercial truth
