# BookedAI Sprint 2 Implementation Package

Date: `2026-04-17`

Document status: `active sprint execution package`

## 1. Purpose

This document turns Sprint 2 into a concrete implementation package for the first execution sprint after the Phase 0 reset.

Sprint 2 is not a backend modularization sprint.

Sprint 2 is the blueprint-lock sprint for the public revenue-engine rebuild.

Historical interpretation note:

- this implementation package describes the original Sprint 2 blueprint-lock target state
- later implemented, deployed, and hotfix outcomes are tracked in `docs/development/sprint-2-code-ready-development-handoff.md`
- when reviewing current repo state or deciding whether Sprint 3+ should inherit an implemented pattern, the later code-ready handoff and closeout record take precedence over this earlier blueprint-only framing

It exists to make sure Sprint 3 can begin coding the premium landing experience without unresolved ambiguity around:

- brand system
- design tokens
- section hierarchy
- component tree
- widget vocabulary
- CTA hierarchy
- instrumentation assumptions

This package should be read together with:

- `docs/architecture/phase-0-exit-review.md`
- `docs/architecture/landing-page-system-requirements.md`
- `docs/architecture/frontend-theme-design-token-map.md`
- `docs/architecture/bookedai-brand-ui-kit.md`
- `docs/architecture/landing-component-tree-and-file-ownership.md`
- `docs/architecture/landing-page-execution-task-map.md`
- `docs/architecture/sprint-2-read-code.md`
- `docs/development/sprint-2-code-ready-development-handoff.md`
- `docs/architecture/phase-1-2-detailed-implementation-package.md`
- `docs/architecture/public-growth-app-strategy.md`
- `docs/architecture/pricing-packaging-monetization-strategy.md`
- `docs/development/sprint-2-owner-execution-checklist.md`

## 2. Sprint 2 mission

Finish the public blueprint so Sprint 3 can build the premium BookedAI landing page from one approved system instead of from scattered assumptions.

## 3. Target outcome

By the end of Sprint 2, the team should have:

- one locked landing-page narrative system
- one approved visual token baseline
- one approved public component tree
- one approved widget and proof-block vocabulary
- one approved file mapping into the current frontend repo
- one explicit list of open implementation risks for Sprint 3

## 4. Sprint 2 scope

### In scope

- public brand system
- public headline and CTA system
- landing-page section order
- public widget vocabulary
- design tokens and UI primitives
- component tree and file ownership plan
- CTA source and attribution instrumentation assumptions
- metadata and public copy alignment needed before the build sprint

### Out of scope

- full landing implementation
- full tenant or admin UI changes
- new backend reporting endpoints
- live attribution reporting logic
- broader SEO page-family rollout

Closeout clarification:

- these out-of-scope lines describe the original planning boundary for Sprint 2
- they should not be used to deny or erase implemented outcomes that were later completed, verified, and recorded in the Sprint 2 code-ready handoff

## 5. Source-of-truth outputs required in Sprint 2

Sprint 2 must produce or finalize:

- locked landing-page copy system
- locked CTA system
- locked public widget vocabulary
- locked design-token system
- locked BookedAI brand UI kit baseline with logo system, dark-mode token system, and reusable foundation components
- locked component tree
- locked file mapping into `frontend/src/components/landing/`
- one translation-ready App Router starter baseline for later Next.js adoption without reinterpreting the brand system from scratch
- Sprint 3 coding handoff with known risks

## 6. Frontend repo mapping baseline

Sprint 2 should assume implementation lands primarily in:

- `frontend/index.html`
- `frontend/src/components/landing/data.ts`
- `frontend/src/components/landing/`
- `frontend/src/components/landing/sections/`
- `frontend/src/components/landing/ui/`
- `frontend/src/styles.css`
- `frontend/src/theme/`
- `frontend/src/apps/public/PublicApp.tsx`

Sprint 2 may also create forward-compatible starter outputs in the repo root when they are explicitly positioned as:

- additive starter code
- brand-system translation outputs
- non-blocking to the current frontend runtime

Current additive root starter outputs now include:

- `app/`
- `components/`
- `package.json`
- `tsconfig.json`
- `next.config.mjs`
- `postcss.config.js`
- `tailwind.config.ts`

Sprint 2 should preserve the current repo shape and avoid rewrite-first architectural churn.

## 7. Work packages

## Work package A — Narrative and CTA lock

### Objective

Freeze the public content and conversion system before the build sprint begins.

### Tasks

- confirm approved hero headline, supporting line, and eyebrow
- confirm section-by-section narrative intent
- confirm CTA hierarchy across header, hero, pricing, floating actions, footer, and demo surfaces
- confirm pricing explanation wording
- confirm FAQ and trust-line wording
- confirm footer narrative and contact actions

### Primary source documents

- `docs/architecture/landing-page-system-requirements.md`
- `docs/architecture/pricing-packaging-monetization-strategy.md`
- `frontend/src/components/landing/data.ts`

### Deliverable

- locked public content system ready for Sprint 3 implementation

## Work package B — Visual token system

### Objective

Define the premium visual language in a form that can be implemented directly in the current frontend.

### Tasks

- define typography scale and role usage
- define brand and support color roles
- define spacing rhythm and section density rules
- define radius, border, and shadow rules
- define button hierarchy and badge styles
- define card, glass, and dashboard-widget treatment
- define mobile-safe usage rules

### Expected token categories

- type scale
- color roles
- spacing scale
- radii
- shadows
- borders
- motion rules
- widget and card variants

### Primary file targets

- `frontend/src/styles.css`
- `frontend/src/theme/apple-tokens.css`
- `frontend/src/theme/minimal-bento-template.css`

### Deliverable

- approved design-token baseline and usage rules
- approved BookedAI dark-mode-first brand token layer suitable for both the current frontend and later Next.js adoption

## Work package C — Component tree and primitive map

### Objective

Turn the landing-page requirements into a concrete component architecture that fits the current repo.

### Tasks

- define required section components
- define reusable UI primitives
- define widget-shell primitives
- define content/config boundaries versus presentational boundaries
- define which existing components are retained, reshaped, or removed
- confirm ownership boundaries between `data.ts`, section components, and UI primitives

### Required component groups

- page chrome
- section heading and narrative primitives
- buttons and CTA primitives
- chips, badges, and proof pills
- stat cards and dashboard cards
- pricing blocks
- FAQ and trust cards
- partner and proof-grid primitives

### Deliverable

- approved component tree and primitive inventory
- approved reusable brand primitives for logo, button, card, form, and status surfaces

## Work package D — Section-by-section implementation map

### Objective

Translate the approved section order into a coding-ready map for Sprint 3.

### Required section mapping

1. Header
2. Hero
3. Problem
4. Solution
5. Product proof or showcase
6. Booking assistant or live-flow preview
7. Trust or FAQ
8. Partners
9. Pricing
10. Final CTA
11. Footer

### Tasks

- define purpose of each section
- define required copy inputs for each section
- define required widget or proof blocks per section
- define responsive constraints per section
- define keep, reshape, or remove decisions for current sections

### Deliverable

- section-by-section implementation map ready for Sprint 3 coding

## Work package E — Widget vocabulary and truth boundary

### Objective

Keep the public commercial language aligned with later tenant and admin product surfaces without overclaiming backend reality.

### Tasks

- freeze widget naming for:
  - Revenue Generated
  - Missed Revenue
  - Search to Booking Conversion
  - Call to Booking Conversion
  - Email to Booking Conversion
  - Booking Confirmed
  - Stripe Payment Success
  - Channel Attribution
  - Commission Summary
- define which widgets are conceptual preview blocks versus later live operational widgets
- confirm wording that is safe before reporting truth is fully implemented

### Deliverable

- approved public widget vocabulary and truth boundary notes

## Work package F — Instrumentation assumptions

### Objective

Make sure Sprint 3 can wire public interaction tracking without reopening the product narrative.

### Tasks

- define CTA source naming convention
- define section-origin naming for major actions
- define expected propagation points for demo and pricing consultation flows
- confirm backend-safe placeholder assumptions for later attribution support
- confirm no public copy depends on already-live commercial reporting APIs

### Deliverable

- approved public instrumentation baseline for Sprint 3
- additive CTA/source attribution baseline landed in code without changing the live commercial contract

## 8. Recommended implementation sequence inside Sprint 2

1. freeze narrative system
2. freeze widget vocabulary
3. freeze design tokens
4. freeze component tree
5. freeze section mapping
6. freeze instrumentation assumptions
7. record open risks and Sprint 3 handoff

## 9. Open-risk categories Sprint 2 must explicitly record

Sprint 2 must call out any risk in:

- responsive behavior
- visual token complexity
- too many unique card variants
- oversized hero scope
- pricing language drift from the approved model
- unsupported public reporting claims
- component ownership confusion between content and presentation layers

## 10. Definition of done

Sprint 2 is complete when:

- content source of truth is frozen
- design tokens are frozen
- BookedAI brand UI kit source document and local SVG logo system exist
- component tree is frozen
- widget vocabulary is frozen
- section-by-section implementation map is frozen
- instrumentation assumptions are accepted
- root App Router starter baseline exists and has been built successfully as an additive forward-compatible output
- Sprint 3 coding can begin without strategic rework

Current closeout artifact:

- `docs/architecture/sprint-2-closeout-review.md`

## 11. Recommended owners

- Product:
  - narrative system
  - CTA hierarchy
  - pricing and trust wording
- Frontend:
  - design tokens
  - component tree
  - section mapping
  - repo file mapping
- Architecture:
  - widget vocabulary alignment
  - truth boundary review
- Backend:
  - instrumentation assumption review
  - unsupported-claim review
- QA or release owner:
  - Sprint 3 implementation guardrails
  - closeout measurability review

## 12. Sprint 3 handoff expectation

Sprint 3 should start from this package by implementing:

- shared public primitives
- hero and sticky CTA
- section-by-section landing build
- pricing and trust sections
- metadata and instrumentation wiring

Sprint 3 should not reopen:

- core positioning
- core pricing model
- section order
- widget naming

unless a truth-gate issue is discovered.

## 13. Related references

- [Sprint 2 Owner Execution Checklist](../development/sprint-2-owner-execution-checklist.md)
- [Sprint 2 Closeout Review](./sprint-2-closeout-review.md)
- [BookedAI Brand UI Kit](./bookedai-brand-ui-kit.md)
- [Landing Page System Requirements](./landing-page-system-requirements.md)
- [Frontend Theme Design Token Map](./frontend-theme-design-token-map.md)
- [Landing Component Tree And File Ownership](./landing-component-tree-and-file-ownership.md)
- [Landing Page Execution Task Map](./landing-page-execution-task-map.md)
- [Phase 1-2 Detailed Implementation Package](./phase-1-2-detailed-implementation-package.md)
- [Public Growth App Strategy](./public-growth-app-strategy.md)
