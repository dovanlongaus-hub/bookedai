# Public and pitch product-proof image placement

- Timestamp: 2026-04-27T03:01:28.853158+00:00
- Source: docs/development/public-pitch-proof-image-placement-2026-04-27.md
- Category: frontend
- Status: implemented

## Summary

Placed the uploaded product-proof screenshot after the chess proof on bookedai.au and inside the Product proof section on pitch.bookedai.au; frontend typecheck, build, and diff check passed. Live deploy was not run.

## Details

# Public And Pitch Product Proof Image Placement

Date: `2026-04-27`

Status: `implemented locally`

## Summary

The uploaded product-proof screenshot is now placed on both primary storytelling surfaces:

- `bookedai.au`: immediately after the chess proof block, so the homepage moves from the vertical chess proof into the broader BookedAI workspace evidence.
- `pitch.bookedai.au`: inside the `Product proof` section, below the existing proof cards and before the product/demo CTAs.

Image source:

`https://upload.bookedai.au/images/df6e/iarJydFRgp1aWGk5UF0d7g.png`

## Implementation

- `frontend/src/apps/public/PublicApp.tsx` defines the uploaded image URL and renders a compact product-proof section after the top chess proof area.
- `frontend/src/apps/public/PitchDeckApp.tsx` defines the same uploaded image URL and renders it as an evidence screenshot inside the pitch Product proof section.
- Both images declare `width="1693"` and `height="929"` with an explicit aspect ratio to keep layout stable.
- Supporting docs now track the placement in `docs/architecture/landing-page-system-requirements.md`, `docs/architecture/bookedai-master-roadmap-2026-04-26.md`, and `docs/development/implementation-progress.md`.

## Verification

- `npm --prefix frontend exec tsc -- --noEmit`
- `npm --prefix frontend run build`
- `git diff --check`

Live deployment was not run in this turn.
