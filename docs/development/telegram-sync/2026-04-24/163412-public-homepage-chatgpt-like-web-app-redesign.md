# Public homepage ChatGPT-like web app redesign

- Timestamp: 2026-04-24T16:34:12.454285+00:00
- Source: frontend/src/apps/public/PublicApp.tsx; frontend/src/apps/public/HomepageSearchExperience.tsx
- Category: public-homepage
- Status: completed

## Summary

Redesigned the shipped public homepage into a simpler ChatGPT-like BookedAI web app shell with desktop sidebar, compact hero banner, prompt chips, and a calmer chat-to-booking workspace.

## Details

Updated frontend/src/apps/public/PublicApp.tsx so the public homepage now opens as an app-like BookedAI workspace rather than a multi-section landing page: desktop gets a compact sidebar, mobile keeps a simple top bar, the hero is a short bookedai.au banner, and suggestion chips launch the live assistant flow. Updated frontend/src/apps/public/HomepageSearchExperience.tsx to soften the main interaction surface so chat, assistant guidance, shortlist/results, and the booking panel feel like one connected workspace. Synced project.md, docs/development/implementation-progress.md, docs/development/sprint-13-16-user-surface-delivery-package.md, and memory/2026-04-24.md. Verification passed with npm --prefix frontend run build and Playwright desktop/mobile screenshots saved under output/playwright/. Local static preview still logs the inherited unauthenticated /api/v1/conversations/sessions 401 when not connected to an authenticated backend runtime.
