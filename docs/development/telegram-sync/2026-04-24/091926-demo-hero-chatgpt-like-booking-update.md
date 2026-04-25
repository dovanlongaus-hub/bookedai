# demo hero ChatGPT-like booking update

- Timestamp: 2026-04-24T09:19:26.923858+00:00
- Source: project.md
- Category: product-surface
- Status: implemented

## Summary

Refined demo.bookedai.au into a more ChatGPT-like booking homepage with logo-only nav, centered large composer, quick-booking chips, subtle animated gradient, and browser voice input.

## Details

Updated frontend/src/apps/public/demo/DemoHeader.tsx to reduce the top bar to a minimal logo-only nav. Reworked frontend/src/apps/public/demo/DemoChatStage.tsx into a centered full-screen ChatGPT-like booking hero with the requested headline, subcopy, oversized rounded composer, focus-glow styling, approved suggestion chips, and instant chip-triggered search. Extended frontend/src/apps/public/demo/useDemoBookingExperience.ts with browser speech-recognition support so the main composer now supports voice plus text input. Updated frontend/src/apps/public/demo/constants.ts to use the approved booking chip copy. Kept the rest of the BookedAI result-card and booking/payment flow intact underneath the new entry experience. Synced project.md, docs/development/implementation-progress.md, docs/development/sprint-13-16-user-surface-delivery-package.md, and memory/2026-04-24.md. Verification passed with cd frontend && npm run build.
