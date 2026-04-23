# 2026-04-23 public homepage live-read hardening and go-live prep

- Timestamp: 2026-04-23T19:31:24.412290+00:00
- Source: repo
- Category: release
- Status: completed

## Summary

Locked the final public homepage QA hardening slice: homepage search now submits on Enter, live-read denied-location summaries stay grounded without duplicate warning text, homepage Stripe return banners are restored, and the public assistant release checks are green in the correct legacy/live-read modes.

## Details

Updated project and execution docs to capture the 2026-04-23 public homepage hardening slice. In frontend/src/apps/public/HomepageSearchExperience.tsx, homepage search now submits on Enter while Shift+Enter keeps multiline input, live-read no-result summaries prefer location-specific guidance without duplicating the exact location-warning string already rendered elsewhere in the UI, and the homepage now reads ?booking=success|cancelled&ref=... to show a payment return banner after Stripe. Revalidated the browser release split in the correct modes: the legacy homepage return-banner assertion passes again, legacy admin/public/pricing/tenant slices remain green, and the full live-read public assistant plus location-guardrails batch passes (19 passed, 2 skipped). This closes the remaining homepage/public assistant QA gap before live deployment.
