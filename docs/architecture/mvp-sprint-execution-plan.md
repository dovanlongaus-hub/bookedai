# BookedAI MVP Sprint Execution Plan

## Purpose

This plan turns the upgraded BookedAI roadmap into a sprint-by-sprint execution package.

Implementation synchronization note as of `2026-04-19`:

- this document should now be read together with `docs/architecture/current-phase-sprint-execution-plan.md`
- the new execution baseline reflects the actual checked-in code and should be used whenever this MVP plan still reads as if a completed foundation lane were only planned
- in any conflict about present implementation status, the current execution baseline plus the checked-in code should win

The MVP is no longer "landing page plus chatbot."

The MVP is:

- a premium but lightweight public revenue-engine narrative
- a search-first and booking-first homepage that operates inline without popup dependence
- a multi-channel demand capture story grounded in real product capabilities
- shared commercial data foundations
- revenue and missed-revenue visibility
- setup-fee plus performance-based pricing support
- admin and tenant foundations that can explain outcomes credibly

## Planning assumptions

- sprint length: `2 weeks`
- planning horizon: `10 sprints`
- release style: additive and feature-flagged where needed
- current production stack remains in place during rollout

## Execution dependency note

This sprint plan should now be read together with:

- `docs/development/sprint-dependency-and-inheritance-map.md`

The sprint dependency map is the active reference for:

- hard gates between successive sprint waves
- required inheritance of approved baselines from earlier sprints
- controlled overlap between sprint tracks once shared contracts, vocabulary, and state names are stable

In practical terms:

- Sprint 1 through Sprint 3 are still the baseline-setting chain
- Sprint 5 and Sprint 6 may overlap after Sprint 4 freezes commercial contracts
- Sprint 8 and Sprint 9 may run in a controlled sequence once Sprint 4 through Sprint 7 have produced stable commercial truth and usable searchable supply
- Sprint 11 and Sprint 13 may run in parallel as tenant and admin planning or implementation tracks
- Sprint 15 and Sprint 16 should remain sequential

## MVP definition

The MVP target for this cycle is:

- public site clearly positions BookedAI as the AI revenue engine for service businesses
- public product visuals show revenue, conversion, attribution, payment, and commission concepts
- backend exposes the first shared data contracts for commercial reporting
- admin and tenant planning both pivot to revenue visibility, recovery, and commission
- pricing strategy is clearly documented as setup fee plus performance-aligned commission

## MVP scope included

- upgraded PRD and architecture docs
- premium landing page structure and copy
- revenue-engine design system tokens
- multi-channel product narrative
- commercial widget requirements
- revenue, attribution, missed-revenue, payment, and commission data contracts
- roadmap and sprint sequencing updates

## MVP scope excluded

- full tenant self-serve maturity across every module
- native mobile apps
- large-scale microservice separation
- unsupported public metrics or fabricated ROI claims

## Release milestones

| Milestone | Outcome | Expected sprint range |
|---|---|---|
| M0 | docs and architecture reset complete | Sprint 1 |
| M1 | lightweight search-first homepage and inline booking flow live | Sprint 2-3 |
| M2 | commercial data and assistant-truth contracts live | Sprint 4-5 |
| M3 | attribution, search quality, and recovery reporting active | Sprint 6-7 |
| M4 | tenant supply, onboarding, and commercial visibility usable | Sprint 8-10 |
| M5 | optimization and hardening baseline ready | Sprint 11-16 |

## Sprint-by-sprint plan

## Sprint 1 - Documentation and scope reset

### Objective

Make the revenue-engine definition official across all core planning documents.

### Scope

- PRD rewrite
- target architecture rewrite
- roadmap rewrite
- sprint plan rewrite
- pricing strategy rewrite
- sprint register update

### Exit criteria

- all core docs describe the same product, pricing model, and phase order

## Sprint 2 - Brand system and landing primitives

### Objective

Lock the public brand system and component architecture for the new landing page.

### Scope

- brand system
- design tokens
- section hierarchy
- React and Tailwind component tree
- sticky header, CTA, and hero layout rules
- mandatory dashboard widget definitions

### Exit criteria

- implementation can start without copy or structural ambiguity

## Sprint 3 - Public landing and inline conversion build

### Objective

Ship the lightweight search-first homepage and inline conversion experience that explains BookedAI in revenue terms without crowding the primary workflow.

### Scope

- hero with browser-framed dashboard mockup
- minimal homepage body with logo, short revenue-engine signal, and search box
- responsive inline shortlist, booking, and confirmation flow
- supporting content moved into menu, top-bar, bottom-bar, or secondary surfaces
- mobile-first CTA hierarchy and layout validation
- premium but lightweight visual framing

### Exit criteria

- public site no longer reads as chat-first or feature-first
- homepage body no longer competes with the inline search and booking flow

## Sprint 4 - Assistant truth and commercial domain contracts

### Objective

Add the backend and shared-contract foundations for commercial reporting.

### Scope

- revenue dashboard contract
- missed revenue tracker contract
- conversion metrics by channel
- payment event reporting
- source attribution contract
- commission summary contract
- assistant truth semantics for `domain_intent`, `location_truth`, `fallback_scope`, and `escalation_reason`

### Exit criteria

- widget data can be fetched from typed API responses

## Sprint 5 - Reporting read models and revenue UI wiring

### Objective

Turn commercial data into usable product widgets.

### Scope

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

- public preview, tenant planning, and admin planning all share the same widget vocabulary

## Sprint 6 - Search quality, telemetry, and multi-channel attribution

### Objective

Connect existing search and booking-quality work to a broader commercial funnel.

### Scope

- normalize source attribution across channels
- connect enquiries to bookings
- compute channel conversion metrics
- improve booking-context handoff into reporting
- replay production-like search cases
- define pass or fail thresholds for wrong-domain, wrong-location, stale-context, and mobile-flow regressions

### Exit criteria

- BookedAI can explain which channels are producing bookings most credibly

## Sprint 7 - Recovery workflows

### Objective

Add the first missed-revenue recovery workflows.

### Scope

- missed call auto callback flow
- unbooked lead follow-up flow
- quote reminder support
- payment completion reminder flow
- recovery workflow reporting

### Exit criteria

- recovery opportunities and recovered outcomes are visible

## Sprint 8 - Tenant onboarding and searchable supply

### Objective

Expose the first tenant-controlled supply and onboarding layer needed to make the revenue engine truthful at scale.

### Scope

- tenant claim or sign-in path
- website, file, or manual catalog import review
- publish-safe searchable catalog workflow
- tenant-safe supply quality checks
- onboarding path that feeds public matching truth

### Exit criteria

- tenant-controlled supply can be reviewed and published safely enough to support public matching truth

## Sprint 9 - Tenant revenue workspace

### Objective

Expose the revenue-engine promise inside the tenant product.

### Scope

- tenant dashboard
- revenue and booking summary
- channel performance
- missed revenue tracker
- recovered opportunity views
- commission summary

### Exit criteria

- operators can see what BookedAI generated and what still needs action

## Sprint 10 - Internal admin commercial operations

### Objective

Give internal teams the tools needed to support revenue, payment, and commission flows.

### Scope

- admin commercial drill-ins
- payment and revenue reconciliation
- attribution diagnostics
- commission support views
- workflow override controls

### Exit criteria

- internal operators can support commercial workflows without relying on ad hoc investigation

## Sprint 11 - Optimization and hardening

### Objective

Make reporting and conversion quality safe to evolve.

### Scope

- telemetry and eval loops
- reporting regression checks
- rollout gates
- worker and outbox hardening
- scale-readiness review

### Exit criteria

- commercial reporting and recovery logic can ship with release discipline

## Current execution reading

Date: `2026-04-17`

The current repo already gives us a strong base:

- public marketing flows exist
- admin exists
- search and matching quality work exists
- Stripe and integration seams exist
- rollout and QA scaffolding exists

The upgraded MVP reframes those assets around a commercial outcome model instead of starting over.

Execution update from `2026-04-19`:

- the public search-first homepage, tenant workspace foundation, admin workspace foundation, `/api/v1/*` commercial seams, tenant catalog publish workflow, release-gate scripts, and replay tooling are now all present in code
- because of that, Sprint 8 through Sprint 10 should no longer be read as untouched future concepts; they are better interpreted as partly implemented lanes that still need completion and hardening
- the most practical near-term sprint focus has shifted toward Sprint 13 through Sprint 16 completion work:
  - tenant create or claim account flow
  - onboarding state completion
  - billing and invoice seams
  - payment-method and subscription posture
  - tenant value reporting
  - broader release-grade regression gates
  - public frontend product-grade UX refinement
  - customer portal productization
  - tenant login and admin login professionalization
  - cross-surface SaaS UX harmonization

## Immediate execution order

1. complete the documentation reset
2. ship the lightweight homepage and inline booking rebuild
3. define assistant-truth and shared commercial contracts
4. wire the widget read models
5. expand search quality, recovery, attribution, and commission operations

## Guardrails

- do not present fabricated revenue claims
- do not ship commission messaging without admin support views planned
- do not build dashboard visuals with no corresponding data semantics
- do not let search-quality work remain disconnected from attribution and funnel reporting
- do not let homepage or public-shell work drift into section-heavy layouts that weaken search, shortlist, booking, or mobile usability
