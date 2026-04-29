# BookedAI Stripe return E2E and webhook replay runbook

- Timestamp: 2026-04-28T16:13:10.165745+00:00
- Source: docs/development/stripe-payment-flow-review-2026-04-28.md
- Category: development
- Status: local-complete

## Summary

Implemented the proposed Stripe follow-up: Playwright now verifies success redirects show payment verification first and only switch to paid after backend payment status is paid. Added a Stripe CLI webhook replay runbook/script; actual replay is blocked locally because Stripe CLI is not installed.

## Details

# Stripe Payment Flow Review

Date: `2026-04-28`

## Review Scope

Reviewed and tested the BookedAI payment flow after applying Stripe best practices:

- public booking payment intent to hosted Stripe Checkout
- Stripe redirect return handling
- backend payment status endpoint
- Stripe webhook reconciliation into booking payment lifecycle
- Telegram/chat booking Checkout creation
- chess student payment options
- tenant subscription billing routes
- pricing consultation subscription Checkout
- sandbox Checkout smoke path

## Findings

1. Backend Stripe Checkout creation now follows the selected best-practice posture:
   - one-time payments use Checkout Sessions
   - recurring tenant/pricing flows use Billing through Checkout Sessions
   - direct REST calls pin `Stripe-Version: 2026-02-25.clover`
   - Checkout creation does not force card-only `payment_method_types[]`

2. The main customer-facing gap was frontend return trust:
   - legacy `?booking=success` return handling could show a paid success card before backend payment truth was checked
   - this is now changed to show `Payment is being verified`
   - the homepage return surface calls `GET /api/v1/payments/status`
   - only backend `payment_status=paid` changes the UI to `Payment received`

3. Public copy still contained older “Stripe returns to homepage” wording.
   - updated booking-result copy now says BookedAI verifies Stripe backend status before showing paid state

4. Regression coverage now guards the Stripe integration posture:
   - public Checkout helper asserts pinned Stripe API version and Dynamic Payment Methods
   - chess payment Checkout asserts pinned Stripe API version and no card-only form field
   - Telegram/chat Checkout asserts pinned Stripe API version and no card-only form field

## Test Results

- Stripe sandbox dry-run: passed
- Stripe sandbox real test-mode Checkout Session: passed
  - created session id prefix: `cs_test_`
  - payment status returned by Stripe: `unpaid`
- Browser E2E Stripe return verification: passed
  - `homepage-stripe-return-portal-handoff.spec.ts` asserts `verifying` first
  - mocked backend `payment_status=paid` is required before paid/portal CTA appears
- Backend focused payment/Stripe/tenant regression: `143 passed`
- Frontend TypeScript check: passed
- Frontend production build: passed
- Python compile check for changed backend/script files: passed
- `git diff --check`: passed
- Stripe CLI webhook replay: blocked locally because Stripe CLI is not installed (`stripe: command not found`)

## Remaining Recommendations

- Run the Stripe CLI webhook replay smoke in test mode before live deploy using `docs/development/stripe-cli-webhook-replay-runbook.md`.
- Add a real bank-feed adapter for QR/bank transfer proof; QR scan should remain only a payment-start signal, not paid evidence.
- After live deploy, run a production-safe smoke using test mode only against the staging/local API base before switching any live keys.
