# Demo BookedAI deep QA regression and fixes

- Timestamp: 2026-04-24T17:17:40.468491+00:00
- Source: docs/development/telegram-sync/2026-04-24/171740-demo-bookedai-deep-qa-regression-and-fixes.md
- Category: qa
- Status: completed

## Summary

Added Playwright live-read regression coverage for demo.bookedai.au and fixed QA findings across assessment/placement normalization, placement slot conversion, fast assessment-answer continuity, and no-checkout-url payment truth.

## Details

# Demo BookedAI Deep QA Regression And Fixes

## Summary

Completed a deeper QA pass for `demo.bookedai.au` and added Playwright live-read regression coverage for the connected-agent academy proof.

## Details

- Added `frontend/tests/demo-bookedai-full-flow.spec.ts`.
- Regression coverage now verifies that an assessment API failure is isolated from live search state and does not show bundle suggestions without a real shortlist.
- Regression coverage now verifies the mobile full flow from search to assessment, placement, booking, parent report preview, and revenue-agent handoff.
- Hardened assessment normalization so both `assessment` and `result` payload fields can produce a completed assessment result.
- Hardened placement normalization so both backend-shaped and direct contract-shaped placement recommendations render correctly.
- Converted placement slot day/time values into valid `datetime-local` values before using them as booking input.
- Fixed a fast-answer race where placement could miss the latest visible shortlist.
- Fixed payment success state so no-checkout-url responses stay in awaiting-confirmation posture instead of saying checkout opened.

## Verification

- `PLAYWRIGHT_PUBLIC_ASSISTANT_MODE=live-read npx playwright test tests/demo-bookedai-full-flow.spec.ts --project=live-read`
- `npm --prefix frontend run build`
