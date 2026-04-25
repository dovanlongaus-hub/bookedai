# Pitch package registration full-flow fix

- Timestamp: 2026-04-24T16:47:07.521495+00:00
- Source: telegram
- Category: change-summary
- Status: completed

## Summary

Fixed pitch.bookedai.au package registration from pricing CTA through SME details submission to confirmation, including route precedence, CORS, backend resilience, and compact package-selector UI.

## Details

Live issue: pricing/package CTAs on pitch.bookedai.au could route to /register-interest while the pitch host runtime still shadowed the registration route, and browser submission failed with CORS when the frontend called api.bookedai.au from https://pitch.bookedai.au. Fix: AppRouter now lets /register-interest and /roadmap win before host-specific pitch/product runtimes; production CORS now allows https://pitch.bookedai.au; PricingService now degrades Zoho Calendar and Stripe checkout failures into manual follow-up; the pricing route now logs and ignores event-store or dual-write side-effect failures after the customer-visible consultation is created. UI: RegisterInterestApp package choices were compacted into icon-led, line-clamped option boxes so Freemium, Free Setup, Pro, Pro Max, and Advance Customize remain scannable on mobile without horizontal overflow. Verification: python3 -m py_compile backend/api/route_handlers.py backend/services.py passed; ./.venv/bin/python -m pytest backend/tests/test_pricing_consultation_resilience.py -q passed; npm --prefix frontend run build passed; python3 scripts/telegram_workspace_ops.py deploy-live completed; bash scripts/healthcheck_stack.sh passed at 2026-04-24T16:45:20Z; CORS preflight from https://pitch.bookedai.au to api.bookedai.au returned Access-Control-Allow-Origin; live Playwright browser flow from pitch pricing to form submit completed with confirmation reference CONS-391FA9D5 and no app console errors or horizontal overflow.
