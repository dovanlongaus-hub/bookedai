# Pitch BookedAI SME Polish Follow-Up

- Timestamp: 2026-04-29T03:11:56.114983+00:00
- Source: telegram
- Category: change-summary
- Status: submitted

## Summary

Continued pitch.bookedai.au polish so the deck leads with the SME booking-ready setup, moves the launch offer earlier, and removes remaining customer-visible internal framing from /architecture.

## Details

# Pitch.bookedai.au SME Polish Follow-Up

## Summary

Continued the public pitch polish for `pitch.bookedai.au` and `/architecture`, making the deck more SME-first and removing remaining customer-visible internal framing.

## Changes

- Reframed the pitch hero around `Launch a booking-ready revenue engine for your service business.`
- Added an early `What SMEs get` section describing the launch page, dedicated inbox, CRM workspace, and booking engine.
- Moved the launch offer before the pitch video so the page sells the SME setup earlier.
- Reworked pitch navigation and CTAs around launch setup, live proof, plans, how it works, scale, rollout, and trust.
- Reworded the architecture diagram, roadmap, and final CTA into customer-safe business language.
- Re-polished `/architecture` to replace remaining tenant/audit/ledger phrasing with customer-safe governance, business workspace proof, customer/admin separation, proof labels, and reusable business templates.
- Changed the tenant partner capability label for audit-ledger style features to `Booking history`.

## Verification

- `npm --prefix frontend run build`
- `cd frontend && npx playwright test tests/pitch-deck-rendering.spec.ts tests/pitch-architecture-viz.spec.ts --project=legacy` (`4 passed`)
- `git diff --check`
- Scoped copy grep found no public-facing hits for removed pitch/internal phrases in the touched pitch and architecture files.
