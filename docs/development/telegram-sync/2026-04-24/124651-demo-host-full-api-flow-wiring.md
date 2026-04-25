# Demo host full API flow wiring

- Timestamp: 2026-04-24T12:46:51.008642+00:00
- Source: project.md
- Category: development
- Status: published

## Summary

demo.bookedai.au active route now uses the modular BookedAI API-backed flow end-to-end for session prime, live-read shortlist, booking intent, and payment intent; the demo no longer marks bookings paid when the current v1 payment contract only returns a pending intent or no checkout URL yet.

## Details

Updated the active frontend route so DemoLandingApp now renders the modular demo runtime under frontend/src/apps/public/demo instead of the previous local mock flow. The shipped demo host now calls the declared BookedAI public helpers and APIs for session prime, live-read shortlist generation, authoritative lead plus booking-intent creation, and payment-intent preparation. Also corrected the inline booking modal so payment state stays truthful to the current contract: checkout opens only when a real checkout_url exists, autoplay now uses a query that currently returns live candidates, and the UI falls back to awaiting confirmation rather than faking a paid booking.
