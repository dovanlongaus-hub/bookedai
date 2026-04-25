# Pitch final rewording live deployment

- Timestamp: 2026-04-25T13:38:59.549146+00:00
- Source: docs/development/telegram-sync/2026-04-25/pitch-final-rewording-live-deployment.md
- Category: Pitch UAT
- Status: deployed

## Summary

Deployed the UAT-driven pitch rewrite live: new outcome-led hero, pricing before architecture, compressed operating model, registration validation, and clean desktop/mobile production smoke.

## Details

# Pitch final rewording live deployment

## Summary

The latest UAT-driven pitch rewording and layout compression has been deployed live to `pitch.bookedai.au`.

## What changed

- Reframed the pitch hero to `Convert service enquiries into confirmed bookings, follow-up, and revenue visibility.`
- Kept live tenant/product proof near the top of the pitch so visitors see a working customer flow before deeper system explanation.
- Moved pricing immediately after product proof so commercial terms appear before architecture.
- Removed the long architecture-detail section from the runtime pitch.
- Replaced the repeated architecture narrative with one buyer-readable operating model: `Demand -> Qualification -> Booking -> Ops ledger`.
- Added native required/min-length validation to the SME registration form fields most likely to affect lead quality.

## Verification

- `npm --prefix frontend exec tsc -- --noEmit` passed.
- `npm --prefix frontend run build` passed.
- `python3 scripts/telegram_workspace_ops.py deploy-live` completed successfully.
- Production Playwright smoke passed on desktop `1440x1000` and mobile `390x844`.
- Live smoke confirmed:
  - target hero copy is live
  - one pricing section
  - pricing appears before architecture
  - old `architecture-detail` section is absent
  - `Demand -> Qualification -> Booking -> Ops ledger` flow is present
  - no horizontal overflow
  - no console errors, page errors, or request failures

## Evidence

- `output/playwright/pitch-live-final-desktop.png`
- `output/playwright/pitch-live-final-mobile.png`
