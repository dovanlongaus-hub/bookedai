# BookedAI Phase 0 Detailed Implementation Plan

Date: `2026-04-17`

Document status: `done historical baseline; superseded for active execution by docs/architecture/bookedai-master-roadmap-2026-04-26.md`

## 1. Purpose

This document defines the detailed execution plan for Phase 0 of the upgraded BookedAI program.

Phase 0 is not a generic discovery phase.

Phase 0 is the controlled reset that aligns the whole program around the new product definition:

BookedAI - The AI Revenue Engine for Service Businesses

This phase exists to make sure the next implementation waves do not drift across:

- product narrative
- architecture direction
- commercial vocabulary
- pricing model
- delivery sequencing
- ownership and release expectations

It should be read together with:

- `docs/architecture/bookedai-master-prd.md`
- `docs/architecture/target-platform-architecture.md`
- `docs/architecture/solution-architecture-master-execution-plan.md`
- `docs/architecture/implementation-phase-roadmap.md`
- `docs/architecture/mvp-sprint-execution-plan.md`
- `docs/architecture/pricing-packaging-monetization-strategy.md`
- `docs/architecture/landing-page-system-requirements.md`

## 2. Phase 0 objective

Align every core planning, architecture, and execution artifact to the revenue-engine model before the program moves deeper into landing implementation, commercial data modeling, and multi-channel delivery.

## 3. Phase 0 outcomes

At the end of Phase 0, the team should have:

- one official product definition
- one official architecture interpretation
- one official phase and sprint sequence
- one official pricing model direction
- one official public narrative direction
- one official commercial vocabulary for revenue, attribution, missed revenue, recovery, and commission

## 4. Phase 0 scope

### In scope

- product narrative reset
- architecture reset
- roadmap reset
- sprint-plan reset
- pricing-model reset
- landing-page requirements reset
- phase and sprint ownership alignment
- release-gate expectations for later phases

### Out of scope

- full backend commercial domain implementation
- full landing-page coding implementation
- full tenant revenue workspace implementation
- full admin commercial operations implementation
- production release of unsupported metrics

## 5. Phase 0 non-negotiable rules

- do not continue major build work on conflicting assumptions
- do not ship public wording that the product cannot support
- do not let pricing messaging diverge from product and admin planning
- do not split terminology between product, engineering, and GTM

## 6. Required artifacts at the end of Phase 0

The following artifacts must exist and must agree with one another:

- PRD
- target platform architecture
- master execution plan
- implementation roadmap
- MVP sprint plan
- pricing and monetization strategy
- sprint document register
- landing-page system requirements

## 7. Commercial vocabulary to lock in Phase 0

The team must use these terms consistently:

### Revenue generated

Value attributed to BookedAI-supported bookings or completed revenue events, subject to the tracking rules defined later in the commercial data model.

### Bookings generated

Bookings that BookedAI materially helped create or move to confirmation.

### Missed revenue

Estimated lost booking or revenue opportunity caused by unanswered calls, stalled enquiries, missing follow-up, or incomplete payments, based on explicit rules rather than vague inference.

### Recovered opportunity

A previously missed, stalled, or incomplete opportunity that re-entered the funnel and progressed because of a recovery workflow or intervention.

### Source attribution

The normalized source or channel context for demand, such as search, website, call, email, follow-up, referral, or re-engagement.

### Commission summary

The commercial summary showing what fee or payable amount is due under the performance-aligned pricing model.

## 8. Phase 0 workstreams

Phase 0 should run as six tightly coordinated workstreams.

### Workstream A - Product narrative and positioning

Objective:

- lock the new product definition and messaging hierarchy

Tasks:

- finalize brand name, master tagline, one-liner, and short pitch
- finalize positioning rules and voice system
- finalize messaging hierarchy
- finalize mandatory landing-page sections and hero proof model
- remove any remaining chat-first framing from core documentation

Deliverables:

- approved product narrative baseline
- approved landing-page messaging system

Owner:

- Product and Architecture

### Workstream B - Commercial model and pricing

Objective:

- lock the commercial model the rest of the product must support

Tasks:

- finalize setup fee plus performance-based commission model
- define acceptable commission bases
- define product requirements created by the pricing model
- define public explanation rules and trust constraints

Deliverables:

- approved pricing strategy
- approved public pricing framing

Owner:

- Product and Architecture

### Workstream C - Solution architecture reset

Objective:

- align the target architecture to the revenue-engine definition

Tasks:

- redefine core business domains
- elevate revenue, attribution, missed revenue, recovery, and commission to first-class domains
- confirm surface responsibilities across public, tenant, admin, and embedded flows
- define architecture-layer implications for the new positioning

Deliverables:

- updated target architecture
- updated master execution plan

Owner:

- Architecture

### Workstream D - Phase and sprint sequencing

Objective:

- translate the new product model into a clean delivery path

Tasks:

- redefine phases in the roadmap
- define sprint order for landing, data, attribution, payment, commission, recovery, tenant, and admin work
- define dependencies and release gates

Deliverables:

- updated implementation roadmap
- updated MVP sprint plan
- updated sprint register

Owner:

- Product and Architecture

### Workstream E - Public experience specification

Objective:

- create a build-ready design and content blueprint for the landing page

Tasks:

- define brand system
- define landing-page copy
- define design tokens
- define component tree
- define premium UI blocks and widget vocabulary

Deliverables:

- approved public growth experience blueprint

Owner:

- Product and Frontend

### Workstream F - Governance and acceptance control

Objective:

- stop future drift as implementation starts

Tasks:

- define Phase 0 acceptance criteria
- define document synchronization rules
- define narrative truth gate for future public releases
- define commercial truth gate for later reporting releases

Deliverables:

- approved program guardrails
- approved release-gate baseline

Owner:

- Product, Architecture, and QA

## 9. Detailed task breakdown

## 9.1 Product narrative checklist

- finalize the primary commercial message
- finalize the brand promise
- finalize the tone and voice rules
- finalize the approved headline and CTA patterns
- finalize the target audience and priority segments
- finalize the list of pains and outcomes
- finalize the FAQ framing

Definition of done:

- every public-facing artifact uses the same positioning language

## 9.2 Architecture checklist

- restate the target architecture in revenue-engine terms
- confirm core domains and read-model requirements
- confirm which metrics are conceptual today versus product-backed later
- confirm payment and commission implications
- confirm public, tenant, and admin surface responsibilities

Definition of done:

- architecture documents support the product narrative without overclaiming current implementation

## 9.3 Delivery-planning checklist

- define official phase names
- define official sprint names and outcomes
- define which phase owns landing, data, attribution, payment, recovery, tenant, and admin work
- define release dependencies
- define stop-conditions if commercial truth is not ready

Definition of done:

- roadmap and sprint documents show one coherent sequence

## 9.4 Pricing checklist

- confirm setup fee wording
- confirm commission wording
- confirm customization factors
- confirm the product requirements this model creates
- confirm which reporting views are mandatory before broad rollout

Definition of done:

- pricing strategy and product planning do not conflict

## 9.5 Public-experience checklist

- confirm header and CTA structure
- confirm hero messaging
- confirm required sections
- confirm design token system
- confirm mandatory hero and dashboard widgets
- confirm footer and FAQ system

Definition of done:

- the team can implement the landing page without content or structural ambiguity

## 10. Phase 0 timeline

The recommended duration for Phase 0 is 1 sprint.

### Week 1

Focus:

- narrative reset
- pricing reset
- architecture reset

Primary outputs:

- updated PRD
- updated pricing strategy
- updated target architecture

### Week 2

Focus:

- roadmap and sprint reset
- master plan completion
- public experience specification
- acceptance and release-gate alignment

Primary outputs:

- updated roadmap
- updated sprint plan
- master execution plan
- public landing-page system blueprint

## 11. Roles and ownership

### Product lead

Owns:

- positioning approval
- pricing approval
- scope and acceptance criteria

### Solution architect

Owns:

- target architecture
- domain map
- phase dependencies
- release-gate design

### Frontend lead

Owns:

- landing-page component plan
- design token adoption feasibility
- public-surface implementation readiness

### Backend lead

Owns:

- commercial domain readiness assumptions
- API and data implications review

### QA and release owner

Owns:

- truth-gate criteria
- documentation sync discipline
- later release gating requirements

## 12. Phase 0 deliverable table

| Deliverable | Description | Owner | Status at phase close |
|---|---|---|---|
| PRD | Official merged product definition | Product + Architecture | Approved |
| Target architecture | Revenue-engine architecture direction | Architecture | Approved |
| Master execution plan | Program-level execution map | Architecture | Approved |
| Roadmap | Phase sequence and dependencies | Product + Architecture | Approved |
| Sprint plan | Sprint-by-sprint delivery order | Product + Architecture | Approved |
| Pricing strategy | Setup + commission pricing definition | Product + Architecture | Approved |
| Sprint register | Doc-to-sprint mapping | Product + Architecture | Approved |
| Public experience blueprint | Landing page copy, design tokens, UI blocks, component tree | Product + Frontend | Approved |

## 13. Acceptance criteria

Phase 0 is complete only when all of the following are true:

- core docs are updated and mutually consistent
- BookedAI is framed as a multi-channel revenue engine in all core planning artifacts
- pricing is consistently framed as setup fee plus performance-based commission
- the roadmap and sprint sequence reflect the new product shape
- landing-page implementation can begin without strategic ambiguity
- no core doc still relies on an outdated chat-first framing

## 14. Phase 0 risks

### Risk 1 - Documentation drift

If product, pricing, and architecture documents are updated in different ways, later implementation will diverge immediately.

Mitigation:

- require same-sprint write-back across all core docs

### Risk 2 - Public narrative gets ahead of product truth

If the public site claims revenue visibility or commission alignment before product planning supports it, trust will erode.

Mitigation:

- use narrative truth gate and commercial truth gate

### Risk 3 - Team starts building on mixed assumptions

If frontend, backend, and GTM start Sprint 2 on different definitions, rework will multiply.

Mitigation:

- Phase 0 exit review is mandatory before deeper implementation

## 15. Phase 0 exit review

The phase should close with one review covering:

- product definition
- architecture direction
- phase and sprint sequence
- pricing model
- landing-page blueprint
- release gates

Approval should be explicit from:

- Product
- Solution Architecture
- Frontend lead
- Backend lead
- QA or release owner

Current review artifact:

- `docs/architecture/phase-0-exit-review.md`

## 16. Immediate handoff into Phase 1

Once Phase 0 is approved, Phase 1 starts with:

1. build the public brand system and design primitives
2. implement the premium landing page
3. keep commercial widget vocabulary aligned with the later data model
4. avoid inventing unsupported backend metrics in the UI
