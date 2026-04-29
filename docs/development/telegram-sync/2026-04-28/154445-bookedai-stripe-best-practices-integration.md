# BookedAI Stripe best-practices integration

- Timestamp: 2026-04-28T15:44:45.918005+00:00
- Source: docs/development/stripe-best-practices-integration.md
- Category: development
- Status: local-complete

## Summary

Integrated Stripe best-practice posture locally: direct backend Checkout/Billing calls now pin Stripe API version 2026-02-25.clover, Checkout Session creation uses Dynamic Payment Methods instead of hardcoded card-only, and a safe sandbox smoke script was added.

## Details

# Stripe Best Practices Integration

Date: `2026-04-28`

## Scope

BookedAI now applies the Stripe best-practice posture to direct backend Stripe calls used by public bookings, chat/Telegram booking checkout, chess student payments, tenant billing subscriptions, and pricing consultation checkout.

## Implemented Posture

- Checkout Session is the default payment surface for customer payment collection.
- Tenant subscription checkout continues to use Stripe Billing through `mode=subscription`.
- Direct REST calls pin `Stripe-Version` to `2026-02-25.clover` through `backend/integrations/stripe/constants.py`.
- Checkout creation no longer hard-codes `payment_method_types[]=card`; Stripe Dashboard Dynamic Payment Methods can decide eligible payment methods by currency, customer location, and account settings.
- The backend still treats Stripe redirect return parameters as navigation hints only. Payment completion remains webhook/session/status driven.
- The sandbox smoke script refuses live secret keys and only runs a real Checkout Session request with `sk_test_...`.

## Runtime Configuration

Required backend environment values:

- `STRIPE_SECRET_KEY`: server-only Stripe secret key. Use `sk_test_...` for sandbox/dev and `sk_live_...` only in controlled production.
- `STRIPE_PUBLISHABLE_KEY`: frontend publishable key when a surface needs it.
- `STRIPE_CURRENCY`: default currency, currently `aud`.
- `STRIPE_WEBHOOK_SECRET`: endpoint signing secret for `/api/webhooks/stripe`.

Stripe Dashboard should enable the payment methods allowed for the business account. The app should not force a single card-only method unless a future compliance reason requires it.

## Sandbox Smoke Test

Dry-run, safe without a Stripe key:

```sh
python3 scripts/stripe_sandbox_smoke.py --dry-run
```

Create a real test-mode Checkout Session after setting `STRIPE_SECRET_KEY=sk_test_...`:

```sh
python3 scripts/stripe_sandbox_smoke.py --amount-aud 1 --customer-email test@example.com
```

The script prints the Checkout Session id and URL, never the secret key.

## Webhook Contract

Payment truth should continue through `/api/webhooks/stripe` and the shared payment lifecycle service:

- `checkout.session.completed` and paid payment events reconcile booking payment state.
- `customer.subscription.created`, `customer.subscription.updated`, and `customer.subscription.deleted` reconcile tenant billing subscription truth.
- Return URLs can include `session_id={CHECKOUT_SESSION_ID}`, but UI must query backend payment status before showing a final paid state.

## Follow-Up

- Wire portal/public return surfaces to `GET /api/v1/payments/status` before showing Thank You/Paid.
- Add a bank-feed reconciliation adapter for QR/bank transfer proof, separate from QR scan detection.
- Keep Stripe API version upgrades deliberate: update the constant, run the smoke script in test mode, then run booking, webhook, tenant billing, and pricing checkout tests.
