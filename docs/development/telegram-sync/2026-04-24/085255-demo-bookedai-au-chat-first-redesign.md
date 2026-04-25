# demo.bookedai.au chat-first redesign

- Timestamp: 2026-04-24T08:52:55.153224+00:00
- Source: project.md
- Category: product-surface
- Status: implemented

## Summary

Redesigned demo.bookedai.au into a dark premium chat-first booking workspace wired to the real BookedAI v1 search, booking-intent, and payment-intent flow.

## Details

Updated frontend/src/apps/public/DemoLandingApp.tsx to replace the older story-led landing page with a fullscreen SaaS-style workspace. Added modular demo runtime files under frontend/src/apps/public/demo/ for the header, chat rail, live booking-result cards, booking/payment panel, shared types, helpers, and flow state. Wired the surface into the real BookedAI public flow by priming a public assistant session, using live-read search plus booking-path insight for shortlist generation, creating authoritative lead and booking-intent records through the existing public assistant helper, and preparing payment through apiV1.createPaymentIntent. Added framer-motion to the frontend package for staged premium motion. Synced project.md, docs/development/implementation-progress.md, docs/development/sprint-13-16-user-surface-delivery-package.md, and memory/2026-04-24.md to reflect the new demo-host role.
