# Pitch rewording and live UAT closeout

- Timestamp: 2026-04-25T12:58:51.442418+00:00
- Source: codex
- Category: uat
- Status: completed

## Summary

Reworked pitch.bookedai.au around a sharper buyer/investor narrative, moved live tenant proof and pricing earlier, removed the oversized architecture section, deployed the refreshed web image, and verified live desktop/mobile UAT with no browser errors or overflow.

## Details

# Pitch Rewording And Live UAT Closeout

## Summary

Implemented the pitch rewording and layout compression proposed after the live UAT/content review. The pitch now opens with a clearer buyer promise, shows live Grandmaster Chess tenant proof immediately after the hero, moves pricing ahead of architecture, and replaces the oversized architecture-detail section with one concise operating-model visual.

## Production Verification

- `https://pitch.bookedai.au` serves the new hero: `AI receptionist and revenue ops for service businesses.`
- Final live Playwright UAT covered desktop `1440x1100` and mobile `390x844`.
- Desktop height: `9661px`; mobile height: `21004px`, down from the prior roughly `44.9kpx` issue.
- No console errors, page errors, failed requests, horizontal overflow, or overflowing elements were detected in the final live pass.
- Artifacts are saved under `output/playwright/pitch-live-reword-uat-2026-04-25/`, especially `report-pass.json`, `desktop-pass-full.png`, and `mobile-pass-full.png`.

## Content And UX Changes

- Reworded the pitch around `AI receptionist and revenue ops for service businesses`.
- Moved live tenant proof before the architecture story so buyers see product reality first.
- Moved pricing immediately after product proof so commercial terms are visible earlier.
- Removed the large architecture-detail infographic from pitch runtime.
- Kept one architecture flow: `Demand -> Qualification -> Booking -> Ops ledger`.
- Updated pitch nav order to `Overview`, `Product`, `Problem`, `Solution`, `Pricing`, `Architecture`, `Surfaces`, `Trust`.
- Removed hero decorative blur layers that caused a mobile overflow false-positive.

## Verification Commands

- `npm --prefix frontend run build`
- Live stack health via `docker compose -f docker-compose.prod.yml ps --services --status running`
- `curl -sS https://api.bookedai.au/api/health`
- Playwright live desktop/mobile smoke against `https://pitch.bookedai.au`

## Deployment Note

The running production web image was refreshed and verified live. The standard `deploy-live` command later hit a Docker-only full-stack `compose up --build` retry error where TypeScript could not resolve `../apps/public/PublicApp` inside the container. The live stack remained healthy and pitch production is verified, but this Docker build-context/module-resolution mismatch should be cleaned up before the next full release gate.
