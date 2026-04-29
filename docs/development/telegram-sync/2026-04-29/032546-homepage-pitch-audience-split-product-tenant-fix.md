# Homepage Pitch Audience Split Product Tenant Fix

- Timestamp: 2026-04-29T03:25:46.026426+00:00
- Source: telegram
- Category: change-summary
- Status: submitted

## Summary

Split bookedai.au into the SME sales surface, reframed pitch.bookedai.au as the investor/judge pitchdeck, and fixed product.bookedai.au public booking communication automation so public-web actors resolve the bookedai-au tenant fallback instead of requiring a tenant bearer token.

## Details

# Homepage/Pitch Audience Split + Product Public Tenant Fix

## Summary

Split the public surfaces by audience and fixed the public product booking follow-up path so it no longer requires a tenant bearer token for BookedAI-owned public bookings.

## Changes

- `bookedai.au` now defaults to SME sales positioning:
  - hero: `Get a booking-ready sales page for your service business.`
  - CTA: `See a live booking flow` and `Get my booking page set up`
  - focus: landing page, dedicated booking inbox, CRM, calendar, meeting links, payment next step, and follow-up
- Cleaned default homepage copy away from customer-visible internal wording:
  - removed/reframed `payment posture`, `tenant proof`, `action runs`, `judge and owner`, and investor-first proof language
  - changed footer CTA to direct SME buying language
- `pitch.bookedai.au` now leads as an investor/judge pitchdeck:
  - hero: `BookedAI is the AI Revenue Engine for service businesses.`
  - CTAs: live booking proof, investor deck, SME pilot, system map
  - SME setup language is reframed as a repeatable deployment/GTM wedge
- `product.bookedai.au` booking follow-up fix:
  - added public-safe tenant fallback resolution in `backend/api/v1_communication_handlers.py`
  - public-web and embedded-widget communication automation can resolve the `bookedai-au` tenant when the strict tenant-session resolver returns the public endpoint guidance
  - added backend test coverage for the public-web lifecycle email fallback

## Verification

- `python3 -m py_compile backend/api/v1_communication_handlers.py`
- `.venv/bin/python -m pytest backend/tests/test_api_v1_communication_routes.py -q` (`6 passed`)
- `npm --prefix frontend run build`
- `cd frontend && npx playwright test tests/public-homepage-responsive.spec.ts tests/pitch-deck-rendering.spec.ts tests/pitch-architecture-viz.spec.ts --project=legacy` (`8 passed`)
- `git diff --check`
