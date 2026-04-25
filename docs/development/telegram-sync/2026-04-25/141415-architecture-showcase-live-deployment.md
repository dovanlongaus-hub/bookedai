# Architecture showcase live deployment

- Timestamp: 2026-04-25T14:14:15.621766+00:00
- Source: docs/development/telegram-sync/2026-04-25/architecture-showcase-live-deployment.md
- Category: Architecture UAT
- Status: deployed

## Summary

Added and deployed a standalone /architecture showcase with a big-tech-style revenue-engine diagram, system lane map, product proof imagery, and enterprise posture; live desktop/mobile smoke passed on bookedai.au and pitch.bookedai.au.

## Details

# Architecture showcase live deployment

## Summary

BookedAI now has a standalone `/architecture` showcase page designed for technical buyers, investors, and enterprise reviewers.

## What changed

- Added `frontend/src/apps/public/ArchitectureApp.tsx`.
- Wired `/architecture`, `/architecture/`, and `architecture.bookedai.au` into the public app router.
- Added a big-tech-style architecture image with demand surfaces, AI orchestration, revenue core, and control-plane outputs.
- Added a system lane map for acquire, qualify, convert, and operate.
- Added design capability cards, real product proof imagery, and an enterprise posture section.
- Linked the architecture showcase from the pitch nav, pitch hero/pricing CTAs, and public homepage nav.

## Verification

- `npm --prefix frontend exec tsc -- --noEmit` passed.
- `npm --prefix frontend run build` passed.
- `python3 scripts/telegram_workspace_ops.py deploy-live` completed successfully.
- Production smoke passed for:
  - `https://bookedai.au/architecture`
  - `https://pitch.bookedai.au/architecture`
  - `https://pitch.bookedai.au/`
- Desktop and mobile checks confirmed:
  - target architecture H1 and title are live
  - architecture image and revenue-engine map are present
  - product proof images load
  - no horizontal overflow
  - no console errors, page errors, or request failures
  - pitch exposes `/architecture` links while keeping one pricing section

## Evidence

- `output/playwright/architecture-live-bookedai-au-desktop.png`
- `output/playwright/architecture-live-bookedai-au-mobile.png`
- `output/playwright/architecture-live-pitch-bookedai-au-desktop.png`
- `output/playwright/architecture-live-pitch-bookedai-au-mobile.png`
