# BookedAI doc sync - docs/architecture/sprint-2-read-code.md

- Timestamp: 2026-04-21T12:50:34.797991+00:00
- Source: repo-doc-sync
- Category: documentation
- Status: synced

## Summary

Synchronized `docs/architecture/sprint-2-read-code.md` from the BookedAI repository into the Notion workspace. Preview: # BookedAI Sprint 2 Read Code Date: `2026-04-18` Document status: `active sprint-2 repo-truth walkthrough` ## 1. Purpose

## Details

Source path: docs/architecture/sprint-2-read-code.md
Synchronized at: 2026-04-21T12:50:34.628154+00:00

Repository document content:

# BookedAI Sprint 2 Read Code

Date: `2026-04-18`

Document status: `active sprint-2 repo-truth walkthrough`

## 1. Purpose

This document is the read-code companion for Sprint 2.

It exists to answer a practical question:

- where does each Sprint 2 requirement actually live in the repo today?

It should be used together with:

- `docs/architecture/sprint-2-implementation-package.md`
- `docs/architecture/sprint-2-closeout-review.md`
- `docs/architecture/landing-page-system-requirements.md`
- `docs/architecture/frontend-theme-design-token-map.md`
- `docs/architecture/bookedai-brand-ui-kit.md`
- `docs/architecture/landing-component-tree-and-file-ownership.md`

## 2. Fast reading order

If you need the shortest path through Sprint 2 code, read in this order:

1. `frontend/src/apps/public/PublicApp.tsx`
2. `frontend/src/components/landing/data.ts`
3. `frontend/src/components/landing/attribution.ts`
4. `frontend/src/components/landing/sections/*`
5. `frontend/src/components/landing/ui/*`
6. `frontend/src/theme/minimal-bento-template.css`
7. `frontend/src/theme/bookedai-brand-kit.css`
8. `frontend/src/styles.css`
9. `frontend/src/components/brand-kit/*`
10. `app/*` and `components/*` at repo root for the additive Next.js starter

## 3. Sprint 2 requirement-to-code matrix

| Sprint 2 requirement | Primary repo files | Current repo truth |
|---|---|---|
| Narrative and CTA lock | `frontend/src/components/landing/data.ts`, `frontend/src/apps/public/PublicApp.tsx`, `frontend/src/components/landing/Header.tsx`, `frontend/src/components/landing/Footer.tsx`, `frontend/src/components/landing/sections/HeroSection.tsx`, `CallToActionSection.tsx`, `PricingSection.tsx` | Implemented and actively consumed by the landing assembly |
| Stable section order | `frontend/src/apps/public/PublicApp.tsx` | Active order is `Header -> Hero -> Problem -> ProductProof -> Solution -> BookingAssistant -> Trust -> Partners -> Pricing -> Final CTA -> Footer` with two dialogs mounted at the end |
| CTA source naming and propagation | `frontend/src/components/landing/attribution.ts`, `frontend/src/components/landing/sections/PricingSection.tsx`, `frontend/src/components/landing/DemoBookingDialog.tsx`, `frontend/src/components/landing/assistant/BookingAssistantDialog.tsx` | Implemented across public CTA dispatch, pricing consultation submission, demo brief submission, and assistant entry path propagation |
| Widget vocabulary and proof framing | `frontend/src/components/landing/data.ts`, `frontend/src/components/landing/sections/HeroSection.tsx`, `ProblemSection.tsx`, `ProductProofSection.tsx`, `SolutionSection.tsx`, `TrustSection.tsx` | Implemented as visual proof surfaces and compact cards, not as audited live reporting claims |
| Landing primitive layer | `frontend/src/components/landing/ui/SectionCard.tsx`, `SectionHeading.tsx`, `FeatureCard.tsx`, `SignalPill.tsx`, `LogoMark.tsx` | Implemented and reused across the live landing sections |
| Theme and token baseline | `frontend/src/theme/minimal-bento-template.css`, `frontend/src/theme/bookedai-brand-kit.css`, `frontend/src/styles.css` | Implemented and imported by the live frontend runtime |
| Reusable brand-kit baseline | `frontend/src/components/brand-kit/index.ts` plus `brand.tsx`, `buttons.tsx`, `foundations.tsx`, `forms.tsx`, `status.tsx` | Implemented as a smaller real export surface than some earlier docs implied |
| Additive App Router starter | `app/layout.tsx`, `app/page.tsx`, `app/globals.css`, `components/*`, root `package.json` | Implemented as a separate forward-compatible starter, not the live landing runtime |
| Sprint 2 build verification | `frontend/postcss.config.js`, `frontend/package.json`, root `package.json` | `npm run build` now passes in both `frontend/` and repo root |

## 4. Actual public assembly

The current Sprint 2 landing spine lives in:

- `frontend/src/apps/public/PublicApp.tsx`

That file currently owns:

- page section sequencing
- booking and pricing return banners
- assistant modal open state
- demo modal open state
- CTA attribution entry points

It currently composes these live sections:

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

It also mounts:

- `BookingAssistantDialog`
- `DemoBookingDialog`

Important repo-truth note:

- the repo contains more landing section files than the current page assembly uses
- those files should be read as additive inventory or deferred options, not as part of the active Sprint 2 locked conversion path unless `PublicApp.tsx` imports them

## 5. Content ownership

The main Sprint 2 content source is:

- `frontend/src/components/landing/data.ts`

This file is where Sprint 2 currently freezes:

- hero framing
- CTA labels
- narrative copy blocks
- proof items
- FAQ items
- trust items
- partner content
- roadmap and supporting data that may be used by additive sections

The main rule is:

- if the landing page copy changes, check `data.ts` first before rewriting section code

## 6. CTA attribution path

The CTA attribution baseline starts in:

- `frontend/src/components/landing/attribution.ts`

Key responsibilities:

- build the shared public attribution payload
- read UTM values from the current URL
- persist the last CTA payload to `sessionStorage`
- dispatch the browser event `bookedai:public-cta`
- optionally mirror the same data into `window.dataLayer`
- build assistant entry URLs that preserve `source_section`, `source_cta`, and optional `source_detail`

That payload is then consumed by:

- `frontend/src/apps/public/PublicApp.tsx`
- `frontend/src/components/landing/sections/PricingSection.tsx`
- `frontend/src/components/landing/DemoBookingDialog.tsx`

Backend-side receiving surfaces now include:

- `backend/api/route_handlers.py`
- `backend/services.py`
- `backend/service_layer/demo_workflow_service.py`
- `backend/service_layer/booking_mirror_service.py`
- `backend/schemas.py`

## 7. Theme and design-token path

Sprint 2 styling truth is split across three live frontend files:

### `frontend/src/theme/minimal-bento-template.css`

Owns:

- the main Apple-inspired token layer
- shared shell classes
- card, nav, button, field, and layout classes
- the legacy alias layer used by existing landing sections

### `frontend/src/theme/bookedai-brand-kit.css`

Owns:

- the darker BookedAI revenue-engine token layer
- gradient, glow, glass-card, and brand-surface classes
- reusable classes that support the additive brand-kit and root starter

### `frontend/src/styles.css`

Owns:

- global CSS imports
- Tailwind v4 `@theme` bridge values
- animation utilities

Implementation note:

- the frontend build now depends on `frontend/postcss.config.js` so the Vite app does not accidentally inherit the root starter PostCSS chain

## 8. Reusable UI surfaces

There are two different reusable layers in Sprint 2:

### Landing UI primitives

Files:

- `frontend/src/components/landing/ui/SectionCard.tsx`
- `frontend/src/components/landing/ui/SectionHeading.tsx`
- `frontend/src/components/landing/ui/FeatureCard.tsx`
- `frontend/src/components/landing/ui/SignalPill.tsx`
- `frontend/src/components/landing/ui/LogoMark.tsx`

These are the real shared primitives used by the current landing assembly.

### Brand-kit exports

Files:

- `frontend/src/components/brand-kit/index.ts`
- `frontend/src/components/brand-kit/brand.tsx`
- `frontend/src/components/brand-kit/buttons.tsx`
- `frontend/src/components/brand-kit/foundations.tsx`
- `frontend/src/components/brand-kit/forms.tsx`
- `frontend/src/components/brand-kit/status.tsx`

These are the reusable Sprint 2 brand-system exports that can be lifted into other surfaces.

Important repo-truth note:

- the brand-kit export surface is real but intentionally smaller than some earlier conceptual inventory lists
- landing UI primitives and brand-kit primitives are related, but they are not the same layer

## 9. Additive Next.js starter

The forward-compatible Sprint 2 starter lives at repo root:

- `app/layout.tsx`
- `app/page.tsx`
- `app/globals.css`
- `components/brand/logo.tsx`
- `components/ui/*`
- `components/sections/*`

This starter currently proves:

- the BookedAI token system can be translated into a Next.js App Router shape
- the root starter is buildable

It does not mean:

- the live landing already runs on Next.js
- the current Vite public app has been replaced

## 10. Verification performed in this review

The following checks were rerun during this Sprint 2 review:

- `npm run build` in `frontend/`
- `npm run build` at repo root

Current result:

- both builds pass

## 11. Review corrections captured by this document

This review reconciled several Sprint 2 artifacts back to repo truth:

- the component-tree document now reflects the actual `PublicApp.tsx` assembly
- additive section files are now clearly separated from the active landing spine
- the brand UI kit doc now states the real exported `brand-kit` inventory
- Sprint 2 closeout now references this read-code walkthrough

## 12. Related references

- [Sprint 2 Implementation Package](./sprint-2-implementation-package.md)
- [Sprint 2 Closeout Review](./sprint-2-closeout-review.md)
- [Landing Page System Requirements](./landing-page-system-requirements.md)
- [Frontend Theme Design Token Map](./frontend-theme-design-token-map.md)
- [BookedAI Brand UI Kit](./bookedai-brand-ui-kit.md)
- [Landing Component Tree And File Ownership](./landing-component-tree-and-file-ownership.md)
