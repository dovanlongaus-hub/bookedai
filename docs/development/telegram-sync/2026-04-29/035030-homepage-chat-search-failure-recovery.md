# Homepage Chat Search Failure Recovery

- Timestamp: 2026-04-29T03:50:30.840909+00:00
- Source: Codex local workspace
- Category: frontend-ux
- Status: implemented

## Summary

Fixed the homepage chat box search failure state so failed live search/matching calls recover with customer-safe guidance and fallback booking options instead of showing raw loading/backend errors.

## Details

Scope: frontend/src/apps/public/HomepageSearchExperience.tsx now catches homepage search failures, keeps the booking flow open, shows fast-preview or catalog fallback results, clears the red Search needs attention state, and adds assistant recovery copy asking for suburb, preferred time, or service detail. Coverage: frontend/tests/public-homepage-responsive.spec.ts now forces the customer-turn, matching/search, booking-assistant/chat, and legacy chat/send endpoints to return 500 and verifies the homepage shows customer-safe recovery copy without leaking simulated backend errors. Verification passed locally: npm --prefix frontend run build; cd frontend && npx playwright test tests/public-homepage-responsive.spec.ts --project=legacy (5 passed); git diff --check.
