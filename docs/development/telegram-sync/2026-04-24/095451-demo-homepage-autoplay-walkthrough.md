# demo homepage autoplay walkthrough

- Timestamp: 2026-04-24T09:54:51.189029+00:00
- Source: project.md
- Category: product-surface
- Status: implemented

## Summary

Added a 3-second idle autoplay demo on demo.bookedai.au that types a booking query, shows results, opens booking, and reaches inline success so new visitors understand the product in about 10 seconds.

## Details

Updated frontend/src/apps/public/demo/useDemoBookingExperience.ts to add autoplay state and timing logic that starts after 3 seconds of idle time, auto-types a sample query, runs the live search flow, answers the first clarification, opens the inline booking modal, autofills demo user data, and simulates the payment-success path. Updated frontend/src/apps/public/demo/DemoChatStage.tsx to show autoplay status in the hero while the scripted walkthrough is running. The autoplay cancels if the user interacts before it begins, so manual use still takes priority. Synced project.md, docs/development/implementation-progress.md, and memory/2026-04-24.md. Verification passed with cd frontend && npm run build.
