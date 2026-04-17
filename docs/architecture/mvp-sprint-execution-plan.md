# BookedAI MVP Sprint Execution Plan

## Purpose

This plan turns the upgraded BookedAI roadmap into a sprint-by-sprint execution package.

The MVP is no longer "landing page plus chatbot."

The MVP is:

- a premium public revenue-engine narrative
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
| M1 | premium landing implementation ready | Sprint 2-3 |
| M2 | commercial data contracts live | Sprint 4-5 |
| M3 | attribution and recovery reporting active | Sprint 6-7 |
| M4 | tenant and admin commercial visibility usable | Sprint 8-9 |
| M5 | optimization and hardening baseline ready | Sprint 10 |

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

## Sprint 3 - Public landing build

### Objective

Ship the premium landing page that explains BookedAI in revenue terms.

### Scope

- hero with browser-framed dashboard mockup
- problem, solution, pricing, comparison, FAQ, and final CTA sections
- mobile sticky CTA
- integration strip and activity feed
- premium glass-card visuals

### Exit criteria

- public site no longer reads as chat-first or feature-first

## Sprint 4 - Commercial domain contracts

### Objective

Add the backend and shared-contract foundations for commercial reporting.

### Scope

- revenue dashboard contract
- missed revenue tracker contract
- conversion metrics by channel
- payment event reporting
- source attribution contract
- commission summary contract

### Exit criteria

- widget data can be fetched from typed API responses

## Sprint 5 - Reporting read models and UI wiring

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

## Sprint 6 - Multi-channel attribution and conversion

### Objective

Connect existing search and booking-quality work to a broader commercial funnel.

### Scope

- normalize source attribution across channels
- connect enquiries to bookings
- compute channel conversion metrics
- improve booking-context handoff into reporting

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

## Sprint 8 - Tenant revenue workspace

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

## Sprint 9 - Internal admin commercial operations

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

## Sprint 10 - Optimization and hardening

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

## Immediate execution order

1. complete the documentation reset
2. ship the landing page rebuild
3. define shared commercial contracts
4. wire the widget read models
5. expand recovery, attribution, and commission operations

## Guardrails

- do not present fabricated revenue claims
- do not ship commission messaging without admin support views planned
- do not build dashboard visuals with no corresponding data semantics
- do not let search-quality work remain disconnected from attribution and funnel reporting
