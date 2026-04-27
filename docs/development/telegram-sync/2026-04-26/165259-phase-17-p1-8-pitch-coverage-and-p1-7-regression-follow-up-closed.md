# Phase 17 P1-8 pitch coverage and P1-7 regression follow-up closed

- Timestamp: 2026-04-26T16:52:59.780469+00:00
- Source: codex
- Category: change-summary
- Status: submitted

## Summary

Phase 17 P1-8 is closed locally with pitch-deck Playwright coverage for 1440px desktop and 390px mobile, refreshed video-source checks, and no-overflow assertions. The prior P1-7 product regression rerun follow-up is also green.

## Details

Added frontend/tests/pitch-deck-rendering.spec.ts for the investor pitch deck. The spec checks the pitch hero, GM Chess proof, pitch video section, architecture visual, final CTA, no horizontal overflow, and the refreshed MP4 source at desktop 1440px and mobile 390px. Repaired stale product regression selectors so they match current accessible-name behavior and runtime session URLs: phone helper checks use the current aria-describedby behavior, email fields use exact role selectors, booking submission clicks Confirm Booking Request, and the booking session stub matches runtime query strings. Verification passed with npm --prefix frontend exec tsc -- --noEmit, pitch-deck-rendering.spec.ts (3 passed), product-app-regression.spec.ts (4 passed), and git diff --check. P1-8 and the P1-7 product regression rerun are locally closed; live frontend promotion remains tied to the next release gate/deploy.
