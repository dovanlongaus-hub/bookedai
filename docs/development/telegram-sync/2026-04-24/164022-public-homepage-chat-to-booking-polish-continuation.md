# Public homepage chat-to-booking polish continuation

- Timestamp: 2026-04-24T16:40:22.341519+00:00
- Source: frontend/src/apps/public/PublicApp.tsx; frontend/src/apps/public/HomepageSearchExperience.tsx
- Category: public-homepage
- Status: completed

## Summary

Continued the ChatGPT-like homepage redesign by adding a compact chat-match-book flow rail and locking the booking form until a shortlist match is selected.

## Details

Updated frontend/src/apps/public/PublicApp.tsx with a concise chat -> match -> book flow rail under the bookedai.au hero prompt chips. Updated frontend/src/apps/public/HomepageSearchExperience.tsx so the booking side panel stays visible but guidance-first until a result is selected; the form now unlocks only after a shortlist match is chosen. Synced project.md, docs/development/implementation-progress.md, docs/development/sprint-13-16-user-surface-delivery-package.md, and memory/2026-04-24.md. Verification passed with npm --prefix frontend run build. Refreshed Playwright screenshots are output/playwright/publicapp-chatgpt-redesign-desktop-v2.png and output/playwright/publicapp-chatgpt-redesign-mobile-v2.png. Local prompt-click smoke transitions into search state, with expected unauthenticated local 401 responses because the static preview is not connected to an authenticated backend runtime.
