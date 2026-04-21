# BookedAI Release Note - 2026-04-20

Document status: `live release note`

## Release summary

This release tightens the public acquisition surface on `bookedai.au`, aligns package language across the live public stack, and keeps homepage trial intent pointed into the real product runtime on `product.bookedai.au`.

The result is a cleaner homepage for SME buyers, a more investor-readable revenue-engine story, and a clearer commercial path from homepage into the live product.

## What changed

- homepage messaging was compressed into a shorter, clearer sales-deck flow for SMEs and investor review
- homepage primary trial CTA now continues into `https://product.bookedai.au/`
- public package vocabulary is now locked as `Freemium`, `Pro`, and `Pro Max`
- registration-only custom commercial language now uses `Advance Customize`
- older upgrade query aliases remain accepted behind the scenes for compatibility
- proof, pricing, trust, and CTA sections were tightened to reduce repeated copy and make the commercial story easier to scan
- project, roadmap, current-phase execution, sprint-package, sprint-checklist, and implementation-progress documents were synchronized to the same baseline

## User-facing outcome

For SME buyers:

- faster scan of what BookedAI does
- clearer package and launch-offer language
- cleaner path into the live product

For investors and strategic reviewers:

- clearer homepage framing of BookedAI as an AI revenue engine
- less repeated marketing copy
- more direct connection between public narrative and live product runtime

## Live state

The updated production stack was rebuilt and redeployed successfully on `2026-04-20`.

Confirmed live hosts:

- `https://bookedai.au`
- `https://product.bookedai.au`
- `https://tenant.bookedai.au`
- `https://admin.bookedai.au`

## Verification

- `npm run build` in `frontend/`
- `sudo bash scripts/deploy_production.sh`

## Source files most directly affected

- `frontend/src/apps/public/PublicApp.tsx`
- `frontend/src/components/landing/data.ts`
- `frontend/src/components/landing/sections/pricing-shared.ts`
- `frontend/src/components/landing/sections/PricingSection.tsx`
- `frontend/src/components/landing/sections/PricingRecommendationPanel.tsx`
- `frontend/src/components/landing/sections/ProductProofSection.tsx`
- `frontend/src/components/landing/sections/TrustSection.tsx`
- `frontend/src/apps/public/RegisterInterestApp.tsx`

