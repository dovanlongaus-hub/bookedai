# Pitch package booking deep QA closeout

## Summary

`pitch.bookedai.au` has been re-tested from pricing CTA through package registration confirmation after the earlier routing/CORS hotfix and mobile UI polish.

## What changed

- Removed the mobile register-page fixed bottom CTA that could overlay form content.
- Tightened package selector wrapping so long package titles stay readable on mobile.
- Adjusted the shared landing footer so brand copy, release badge, and compact icon-led CTA buttons no longer compress into narrow mobile columns.
- Preserved the package-registration backend resilience: calendar, Stripe, event-store, and dual-write side effects degrade to follow-up status instead of failing the customer-visible submit.

## Live QA

- `bash scripts/healthcheck_stack.sh` passed at `2026-04-24T17:08:34Z`.
- Pitch-origin CORS preflight to `https://api.bookedai.au/api/pricing/consultation` returned `Access-Control-Allow-Origin: https://pitch.bookedai.au`.
- Playwright desktop and tablet sweeps verified pricing and register routes with no horizontal overflow, no console errors, and no bad HTTP responses.
- Playwright mobile end-to-end submitted the live package registration and received confirmation `CONS-022CCEA9` from API `200`.
- Screenshots were captured under `output/playwright/`, including `pitch-finalqa-mobile-pricing.png`, `pitch-finalqa-mobile-register.png`, and `pitch-finalqa-mobile-confirmed.png`.

## Verification

- `./.venv/bin/python -m pytest backend/tests/test_pricing_consultation_resilience.py -q`
- `npm --prefix frontend run build`
- `python3 scripts/telegram_workspace_ops.py deploy-live`
- `bash scripts/healthcheck_stack.sh`
