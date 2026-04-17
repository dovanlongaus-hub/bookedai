# BookedAI Phase 0 Epic Story Task Breakdown

Date: `2026-04-17`

Document status: `active execution backlog`

## 1. Purpose

This document turns Phase 0 into a delivery-ready backlog using the standard execution structure:

Epic -> Story -> Task

It is intended to be copied into Jira, Notion, or another implementation tracker without reinterpreting the phase.

It aligns with:

- `docs/architecture/phase-0-detailed-implementation-plan.md`
- `docs/architecture/solution-architecture-master-execution-plan.md`
- `docs/architecture/implementation-phase-roadmap.md`
- `docs/architecture/mvp-sprint-execution-plan.md`

## 2. Phase 0 objective

Align every core planning, architecture, pricing, and delivery artifact to the BookedAI revenue-engine model before deeper implementation continues.

## 3. Standard execution formula

For Phase 0, the backlog must follow:

- each phase has one or more epics
- each epic has explicit stories
- each story has concrete tasks
- each phase must also have a sprint-level owner checklist for real execution

## 4. Epic breakdown

## Epic P0-E1 - Product narrative reset

### Objective

Lock the official product definition, messaging hierarchy, and positioning rules.

### Story P0-E1-S1 - Brand core and positioning

Goal:

- finalize the official BookedAI brand core

Tasks:

- confirm brand name, master tagline, and one-liner
- confirm short pitch and positioning statement
- confirm category language
- confirm brand promise and value proposition
- confirm brand pillars

Definition of done:

- brand core is documented consistently in the PRD and public messaging baseline

### Story P0-E1-S2 - Tone and voice system

Goal:

- finalize how BookedAI should sound

Tasks:

- confirm tone attributes
- confirm avoid-list for jargon and hype
- confirm voice rules
- confirm messaging hierarchy
- confirm approved copy style examples

Definition of done:

- tone system is documented and reusable for future landing and sales copy

### Story P0-E1-S3 - Landing-page narrative system

Goal:

- define the public content model before implementation

Tasks:

- confirm header and nav model
- confirm hero narrative and proof strip
- confirm mandatory section order
- confirm CTA hierarchy
- confirm footer narrative

Definition of done:

- public growth narrative is fully structured and ready for implementation planning

## Epic P0-E2 - Commercial model and pricing reset

### Objective

Lock the commercial model that the product and architecture must support.

### Story P0-E2-S1 - Pricing model definition

Goal:

- define the official pricing structure

Tasks:

- confirm one-time setup fee model
- confirm performance-based commission model
- confirm positioning line "We win when you win"
- confirm acceptable commission bases
- confirm commission customization factors

Definition of done:

- pricing model is locked and documented in the pricing strategy

### Story P0-E2-S2 - Product implications of pricing

Goal:

- define what the product must support because of the pricing model

Tasks:

- list reporting requirements
- list attribution requirements
- list payment-status requirements
- list commission-summary requirements
- list admin reconciliation implications

Definition of done:

- pricing no longer sits as marketing-only copy and is tied to product requirements

## Epic P0-E3 - Solution architecture reset

### Objective

Update the target architecture so it reflects the new product reality.

### Story P0-E3-S1 - Domain map reset

Goal:

- elevate commercial domains into first-class architecture

Tasks:

- redefine demand capture domain
- redefine qualification domain
- redefine booking conversion domain
- define revenue event domain
- define missed revenue domain
- define recovery workflow domain
- define attribution and commission domain

Definition of done:

- target architecture reflects the commercial product model

### Story P0-E3-S2 - Product surface alignment

Goal:

- clarify the responsibility of each product surface

Tasks:

- confirm public surface role
- confirm tenant workspace role
- confirm internal admin role
- confirm embedded and integration surface role
- confirm architecture-layer implications

Definition of done:

- public, tenant, admin, and integration surfaces no longer carry conflicting product assumptions

## Epic P0-E4 - Phase and sprint reset

### Objective

Rebuild the roadmap and sprint sequence so later work runs on a coherent plan.

### Story P0-E4-S1 - Roadmap redesign

Goal:

- define the new phase sequence

Tasks:

- confirm phase names
- confirm phase objective for each phase
- confirm phase dependencies
- confirm phase exit criteria
- confirm release gating implications

Definition of done:

- official roadmap reflects the revenue-engine implementation order

### Story P0-E4-S2 - Sprint sequencing

Goal:

- break the roadmap into executable sprint order

Tasks:

- define Sprint 1 focus
- define Sprint 2 and Sprint 3 handoff into public implementation
- define commercial data and reporting sprint sequence
- define tenant and admin sprint sequence
- update sprint document register

Definition of done:

- sprint order is documented and aligned with the roadmap

## Epic P0-E5 - Public experience specification

### Objective

Create a build-ready specification for the landing-page rebuild.

### Story P0-E5-S1 - Brand and design system specification

Goal:

- define the premium public design language

Tasks:

- confirm design tokens
- confirm dark-mode-first rules
- confirm glassmorphism card language
- confirm typography and spacing system
- confirm widget and dashboard visual rules

Definition of done:

- design system is ready for implementation

### Story P0-E5-S2 - Component and section architecture

Goal:

- define how the landing page will actually be built

Tasks:

- confirm section-by-section component map
- confirm UI primitive list
- confirm widget component list
- confirm implementation notes for the current frontend structure
- confirm CTA repeat strategy

Definition of done:

- frontend implementation can begin with minimal ambiguity

## Epic P0-E6 - Governance and execution control

### Objective

Make Phase 0 the standard model for how requirements and phases are executed going forward.

### Story P0-E6-S1 - Change and documentation governance update

Goal:

- codify the execution formula for future work

Tasks:

- define that every meaningful initiative must be captured as phase documents
- define that each phase must have an Epic -> Story -> Task breakdown
- define that each phase must have sprint-level owner checklists
- define that implementation, roadmap, and requirement docs must stay synchronized
- update governance documentation

Definition of done:

- the standard formula is written into project governance docs

### Story P0-E6-S2 - Phase acceptance and exit control

Goal:

- make phase completion explicit

Tasks:

- define phase acceptance criteria
- define phase exit review structure
- define required approvers
- define handoff rule into the next phase

Definition of done:

- future phases have a consistent closure model

## 5. Suggested tracker fields

Each item copied into Jira or Notion should include:

- ID
- phase
- epic
- story
- owner
- dependency
- status
- definition of done

