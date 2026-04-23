# BookedAI doc sync - docs/architecture/landing-component-tree-and-file-ownership.md

- Timestamp: 2026-04-21T12:50:03.367356+00:00
- Source: repo-doc-sync
- Category: documentation
- Status: synced

## Summary

Synchronized `docs/architecture/landing-component-tree-and-file-ownership.md` from the BookedAI repository into the Notion workspace. Preview: # BookedAI Landing Component Tree And File Ownership Date: `2026-04-17` Document status: `active sprint-2 implementation source` ## 1. Purpose

## Details

Source path: docs/architecture/landing-component-tree-and-file-ownership.md
Synchronized at: 2026-04-21T12:50:03.194242+00:00

Repository document content:

# BookedAI Landing Component Tree And File Ownership

Date: `2026-04-17`

Document status: `active sprint-2 implementation source`

## 1. Purpose

This document freezes the component tree and file ownership plan for:

- `frontend/src/components/landing/*`
- `frontend/src/apps/public/PublicApp.tsx`

It exists so Sprint 3 can implement the landing rebuild without reopening ownership questions on every section.

## 2. Current assembly root

Current public landing assembly starts in:

- `frontend/src/apps/public/PublicApp.tsx`

This file should remain the page composition root.

It should own:

- page assembly order
- modal open/close state
- top-level banner state
- section sequencing

It should not own:

- section-local layout logic
- repeated card internals
- content constants
- design-token definitions

## 3. Content and config ownership

### `frontend/src/components/landing/data.ts`

Owns:

- section content objects
- public brand constants
- CTA labels and URLs
- proof and partner content
- FAQ, team, and showcase data
- widget vocabulary labels where the page needs static content

Must remain the single structured content source for the landing page.

It should not absorb:

- section-local rendering logic
- API orchestration
- heavy transformation logic that belongs in presenters or services

## 4. Landing component tree

## 4.1 Page composition layer

Owned by:

- `frontend/src/apps/public/PublicApp.tsx`

Primary children:

1. `Header`
2. `HeroSection`
3. `ProblemSection`
4. `ProductProofSection`
5. `SolutionSection`
6. `BookingAssistantSection`
7. `TrustSection`
8. `PartnersSection`
9. `PricingSection`
10. `CallToActionSection`
11. `Footer`
12. `BookingAssistantDialog`
13. `DemoBookingDialog`

Current implementation note:

- this list reflects the actual landing assembly in `frontend/src/apps/public/PublicApp.tsx`
- additional section files exist in the repo, but they are additive inventory rather than part of the current locked primary conversion path

## 4.2 Page chrome layer

### `Header.tsx`

Owns:

- top nav
- roadmap/demo links
- `Book a Demo` and `Start Free Trial` CTA chrome
- mobile menu state

Dependencies:

- `LogoMark`
- `data.ts`

### `Footer.tsx`

Owns:

- footer brand narrative
- footer CTA repetition
- social/contact links
- release badge and version display

Dependencies:

- `LogoMark`
- `data.ts`
- `shared/config/release`

## 4.3 Modal and interaction layer

### `DemoBookingDialog.tsx`

Owns:

- demo booking flow UI
- consultation-like modal state
- demo-submit UX

### `assistant/BookingAssistantDialog.tsx`

Owns:

- live assistant modal or product-shell dialog
- shortlist rendering flow
- booking-ready interaction steps
- assistant-mode UI states

### `assistant/publicBookingAssistantV1.ts`

Owns:

- helper logic or config specifically for the public assistant v1 flow

## 4.4 Section layer

### Core narrative sections

- `HeroSection.tsx`
  - owns hero copy layout, top proof system, and primary conversion framing
- `ProblemSection.tsx`
  - owns lost-demand and pain framing
- `SolutionSection.tsx`
  - owns conversion-flow narrative and core solution cards
- `ProductProofSection.tsx`
  - owns top-level proof or capability explanation cards
- `PricingSection.tsx`
  - owns pricing explanation, consultation CTA flow, and pricing booking handoff
- `CallToActionSection.tsx`
  - owns final conversion push

### Active trust and assistant sections

- `BookingAssistantSection.tsx`
  - owns in-page assistant preview and direct assistant-entry CTA
- `TrustSection.tsx`
  - owns trust framing, testimonial wall, and FAQ surface
- `PartnersSection.tsx`
  - owns partner and infrastructure trust proof

### Additive or deferred section files present in repo

- `VideoDemoSection.tsx`
- `TeamSection.tsx`
- `ProductFlowShowcaseSection.tsx`
- `ImplementationSection.tsx`
- `ShowcaseSection.tsx`
- `CustomerShowcaseSection.tsx`
- `TechnicalArchitectureSection.tsx`
- `RoadmapSection.tsx`
- `ImageUploadSection.tsx`

These files should be treated as available implementation inventory, not as automatically in scope for the primary landing assembly.

## 4.5 UI primitive layer

### `ui/SectionHeading.tsx`

Owns:

- shared section-heading pattern
- kicker, title, and body wrapper semantics

### `ui/LogoMark.tsx`

Owns:

- shared logo rendering
- preferred-logo fallback logic

## 5. Ownership decisions by directory

## 5.1 `frontend/src/components/landing/ui/`

Should contain only shared primitives reused by multiple landing sections.

Allowed examples:

- section heading
- logo
- button wrappers
- card shell primitives
- proof-chip primitives

Sprint 2 note:

- this directory is currently underused and should become the home for any primitive extracted during Sprint 3

## 5.2 `frontend/src/components/landing/sections/`

Should contain only section-level components.

Each file should own:

- section layout
- section-local card arrangement
- section-local use of shared primitives

Each file should not own:

- global page sequencing
- brand constants
- unrelated modal state

## 5.3 `frontend/src/components/landing/assistant/`

Should contain:

- assistant-specific rendering
- assistant-specific interaction flow
- assistant-specific helper logic

It should not become the generic home for all landing interaction code.

## 5.4 `frontend/src/components/landing/`

Root-level landing components should be limited to:

- page chrome
- modal shells
- `data.ts`

## 6. Keep, reshape, or defer map

## Keep as current section files

- `Header.tsx`
- `Footer.tsx`
- `HeroSection.tsx`
- `ProblemSection.tsx`
- `SolutionSection.tsx`
- `ProductProofSection.tsx`
- `TrustSection.tsx`
- `PricingSection.tsx`
- `CallToActionSection.tsx`
- `BookingAssistantSection.tsx`
- `PartnersSection.tsx`

## Keep as additive interaction files

- `DemoBookingDialog.tsx`
- `assistant/BookingAssistantDialog.tsx`
- `assistant/publicBookingAssistantV1.ts`

## Defer from the current mandatory landing assembly unless explicitly promoted

- `ProductFlowShowcaseSection.tsx`
- `VideoDemoSection.tsx`
- `ImplementationSection.tsx`
- `TeamSection.tsx`
- `ShowcaseSection.tsx`
- `CustomerShowcaseSection.tsx`
- `TechnicalArchitectureSection.tsx`
- `RoadmapSection.tsx`
- `ImageUploadSection.tsx`

Reason:

- these files are useful supporting inventory, but they are not part of the current primary conversion spine defined by `PublicApp.tsx`

## 7. Sprint 2 concrete file ownership tasks

1. Confirm `PublicApp.tsx` as the only page composition root.
2. Keep `data.ts` as the single structured content source.
3. Expand `ui/` only with truly shared primitives.
4. Keep section files responsible for section layout, not page-wide orchestration.
5. Treat `assistant/` as a bounded interaction area, not a catch-all for unrelated landing logic.
6. Record any section to remove, merge, or demote before Sprint 3 starts.

## 8. Definition of done

The component tree and ownership map are complete when:

- page composition ownership is explicit
- content ownership is explicit
- section ownership is explicit
- primitive ownership is explicit
- the team can assign Sprint 3 implementation without file-boundary confusion

## 9. Related references

- [Landing Page System Requirements](./landing-page-system-requirements.md)
- [Sprint 2 Implementation Package](./sprint-2-implementation-package.md)
