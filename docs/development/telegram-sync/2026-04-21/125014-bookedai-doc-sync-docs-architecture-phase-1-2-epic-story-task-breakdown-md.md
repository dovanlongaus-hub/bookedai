# BookedAI doc sync - docs/architecture/phase-1-2-epic-story-task-breakdown.md

- Timestamp: 2026-04-21T12:50:14.539222+00:00
- Source: repo-doc-sync
- Category: documentation
- Status: synced

## Summary

Synchronized `docs/architecture/phase-1-2-epic-story-task-breakdown.md` from the BookedAI repository into the Notion workspace. Preview: # BookedAI Phase 1-2 Epic Story Task Breakdown Date: `2026-04-17` Document status: `active execution backlog` ## 1. Purpose

## Details

Source path: docs/architecture/phase-1-2-epic-story-task-breakdown.md
Synchronized at: 2026-04-21T12:50:14.237741+00:00

Repository document content:

# BookedAI Phase 1-2 Epic Story Task Breakdown

Date: `2026-04-17`

Document status: `active execution backlog`

## 1. Purpose

This document turns Phase 1 and Phase 2 into a delivery-ready backlog using the standard execution structure:

Epic -> Story -> Task

It is the detailed execution backlog companion to:

- `docs/architecture/phase-1-2-detailed-implementation-package.md`
- `docs/architecture/implementation-phase-roadmap.md`
- `docs/architecture/mvp-sprint-execution-plan.md`

## 2. Phase objective

Turn the upgraded BookedAI revenue-engine positioning into a production-ready public growth experience with premium design, clear pricing, reusable UI architecture, and attribution-aware CTA flows.

## 3. Standard execution formula

For Phase 1-2:

- each phase must be expressed through epics
- each epic must have explicit stories
- each story must have concrete tasks
- active sprints must also have owner-based execution checklists

## 4. Epic breakdown

## Epic P1-2-E1 - Public narrative and messaging system

### Objective

Lock the public narrative so implementation stays commercially consistent.

### Story P1-2-E1-S1 - Brand core usage rules

Goal:

- define how the new BookedAI brand system is used in public surfaces

Tasks:

- confirm master tagline usage
- confirm one-liner usage
- confirm short pitch usage
- confirm category language
- confirm trust-line usage rules

Definition of done:

- core brand language is consistent across hero, pricing, FAQ, CTA, and footer

### Story P1-2-E1-S2 - Hero and CTA messaging

Goal:

- define the public conversion language

Tasks:

- finalize eyebrow, headline, subhead, and microcopy
- finalize primary and secondary CTA labels
- finalize hero trust points
- finalize ROI callout
- finalize activity-feed text

Definition of done:

- hero copy and CTA hierarchy are approved and implementation-ready

### Story P1-2-E1-S3 - Section narrative system

Goal:

- define the narrative flow across the full landing page

Tasks:

- finalize problem section copy
- finalize how-it-works section copy
- finalize revenue-engine explanation copy
- finalize industry section copy
- finalize pricing, comparison, FAQ, final CTA, and footer copy

Definition of done:

- the full landing page can be assembled from one approved narrative system

## Epic P1-2-E2 - Design system and premium UI language

### Objective

Create the premium public visual language for the revenue-engine brand.

### Story P1-2-E2-S1 - Design token system

Goal:

- define the reusable visual foundation

Tasks:

- confirm colors
- confirm gradients
- confirm shadows
- confirm border radius
- confirm spacing scale
- confirm typography scale

Definition of done:

- token system is documented and ready to implement

### Story P1-2-E2-S2 - Visual rules and interaction language

Goal:

- define how the page should feel in use

Tasks:

- confirm dark-mode-first styling
- confirm glass-card rules
- confirm hover-state motion rules
- confirm section background rhythm
- confirm icon usage rules
- confirm mobile-first behavior

Definition of done:

- design system rules are explicit enough to prevent inconsistent implementation

### Story P1-2-E2-S3 - Widget design language

Goal:

- define the dashboard-preview vocabulary

Tasks:

- confirm revenue widget labels
- confirm payment widget labels
- confirm attribution widget labels
- confirm activity card patterns
- confirm browser-frame and mockup composition rules

Definition of done:

- widget visuals align with later product data models

## Epic P1-2-E3 - Landing component architecture

### Objective

Define how the premium landing page is built inside the current frontend.

### Story P1-2-E3-S1 - Page structure and section map

Goal:

- define the exact section order and assembly model

Tasks:

- confirm page component order
- confirm section anchor IDs
- confirm repeated CTA placements
- confirm sticky header behavior rules
- confirm mobile sticky CTA rule

Definition of done:

- public page architecture is fixed and implementation-ready

### Story P1-2-E3-S2 - Reusable primitive inventory

Goal:

- define the shared UI building blocks

Tasks:

- define `Button`
- define `Container`
- define `SectionHeading`
- define `GlassCard`
- define `Badge`
- define `WidgetShell`
- define `BrowserFrame`
- define `ActivityItem`

Definition of done:

- reusable primitives are explicitly listed with clear ownership

### Story P1-2-E3-S3 - Repo file-mapping and ownership

Goal:

- map the new architecture onto the current repo

Tasks:

- confirm section files under `frontend/src/components/landing/sections/`
- confirm UI primitive files under `frontend/src/components/landing/ui/`
- confirm content source file
- confirm style ownership in `frontend/src/styles.css`
- confirm metadata updates in `frontend/index.html`

Definition of done:

- implementation team knows where each concern should live

## Epic P1-2-E4 - Hero and premium experience implementation

### Objective

Implement the premium hero and navigation experience.

### Story P1-2-E4-S1 - Header and navigation implementation

Goal:

- build the sticky header and CTA system

Tasks:

- implement sticky transparent header
- implement scroll-state opacity change
- implement desktop CTA placement
- implement mobile menu or compact nav behavior
- wire anchor navigation

Definition of done:

- header behavior is production-ready across desktop and mobile

### Story P1-2-E4-S2 - Hero implementation

Goal:

- build the main hero section

Tasks:

- implement hero layout
- implement hero copy block
- implement proof strip
- implement browser-frame shell
- implement gradient mesh background

Definition of done:

- hero is visually strong, premium, and aligned with the positioning

### Story P1-2-E4-S3 - Hero widgets and motion polish

Goal:

- implement the premium dashboard-like visual language in the hero

Tasks:

- implement floating revenue cards
- implement activity feed
- implement ROI callout
- implement integration strip
- implement mobile sticky CTA
- add refined hover states only

Definition of done:

- hero includes the required premium UI blocks without flashy motion

## Epic P1-2-E5 - Core landing sections implementation

### Objective

Implement the full section stack that sells BookedAI as a revenue engine.

### Story P1-2-E5-S1 - Problem and explanation sections

Goal:

- implement the narrative middle of the page

Tasks:

- build revenue-loss problem section
- build how-it-works section
- build revenue-engine explanation section

Definition of done:

- the page explains the problem and solution clearly

### Story P1-2-E5-S2 - Market fit and product capability sections

Goal:

- implement use-case and feature coverage

Tasks:

- build industry use-case section
- build feature grid section
- build dashboard preview section

Definition of done:

- the page shows where BookedAI fits and what makes it a revenue engine

### Story P1-2-E5-S3 - Conversion sections

Goal:

- implement conversion-driving bottom-of-page sections

Tasks:

- build pricing section
- build comparison section
- build FAQ section
- build final CTA section
- build footer

Definition of done:

- the landing page is complete and conversion-ready

## Epic P1-2-E6 - Growth instrumentation and metadata alignment

### Objective

Make the public experience measurable and ready for later attribution.

### Story P1-2-E6-S1 - CTA source instrumentation

Goal:

- ensure public conversion entrypoints capture source context

Tasks:

- define CTA source names
- capture section origin
- capture flow type
- pass source context through demo and consultation flows
- review API payload compatibility

Definition of done:

- CTA source context is consistently captured

### Story P1-2-E6-S2 - Metadata and SEO alignment

Goal:

- align metadata to the new offer

Tasks:

- update page title
- update description
- update social metadata if needed
- review canonical tags
- review sitemap implications

Definition of done:

- public metadata no longer reflects the outdated positioning

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
