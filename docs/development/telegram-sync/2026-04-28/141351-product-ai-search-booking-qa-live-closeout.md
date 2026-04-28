# Product AI Search Booking QA live closeout

- Timestamp: 2026-04-28T14:13:51.933723+00:00
- Source: Codex implementation
- Category: product-qa
- Status: live-complete

## Summary

Completed the product.bookedai.au follow-up live: Stripe subscription webhook mirror, messaging identity gate, AI Mentor widget CORS preflight, API TrustedHost env sync, deploy-live, stack health, and live probes passed.

## Details

Implemented and deployed the proposed product follow-up slice on 2026-04-28. Stripe customer.subscription created/updated/deleted webhooks now reconcile tenant billing account, subscription state, Stripe period dates, tenant billing_gateway settings, and audit evidence. Messaging customer-care now blocks bare booking-reference lookup from a new no-identity conversation and asks for the booking email/phone or secure portal link before exposing booking details or queueing change/cancel work. The AI Mentor partner widget path now uses nginx ^~ /partner-plugins/ so GET stays cacheable and OPTIONS returns 204 with CORS preflight headers on product.bookedai.au. Deploy env sync now preserves https://api.bookedai.au inside CORS_ALLOW_ORIGINS so the backend TrustedHost health endpoint remains live after future deploys. Verification passed: focused backend product/messaging/Stripe suite 155 passed; backend release unittest lane 103 tests OK; search eval 14/14; frontend build; Playwright legacy, live-read, admin, and tenant smoke lanes; deploy-live; stack health at 2026-04-28T14:12:25Z; https://api.bookedai.au/api/health returned 200; widget GET returned 200; widget OPTIONS returned 204. Note: the single release-gate wrapper still reports a pre-existing .env.production.example checksum drift, so equivalent release lanes were run manually for this closeout.
