# V1 payment intent checkout orchestration

- Timestamp: 2026-04-24T13:50:05.597434+00:00
- Source: project.md
- Category: development
- Status: published

## Summary

BookedAI v1 payment intents now return real checkout URLs when the booking path supports it: stripe_card can create hosted Stripe Checkout for priced services, partner_checkout can return the service booking URL, and demo payment UI now opens those real URLs instead of simulating paid state.

## Details

Completed the next backend payment slice in backend/api/v1_booking_handlers.py. The /api/v1/payments/intents route now loads booking-intent plus service context, creates a Stripe Checkout session for stripe_card when a numeric service amount exists, returns the service booking URL directly for partner_checkout, and keeps invoice_after_confirmation in a truthful pending state. The route also writes payment_url, external session metadata, and payment dependency state back into the booking and payment mirrors so portal/admin follow-up can see the same payment posture. Frontend demo modal behavior was already aligned to consume real checkout_url values and avoid fake paid transitions.
