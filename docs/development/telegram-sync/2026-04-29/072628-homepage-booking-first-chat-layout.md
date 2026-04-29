# Homepage booking-first chat layout

- Timestamp: 2026-04-29T07:26:28.644526+00:00
- Source: codex
- Category: development
- Status: completed

## Summary

bookedai.au homepage assistant now prioritizes the active selected match, booking form, or confirmation above progress/follow-up guidance, and the chat/results frame has a visible viewport-bounded scrollbar for long result lists.

## Details

Updated frontend/src/apps/public/HomepageSearchExperience.tsx so the public booking sidebar uses flex ordering: active booking context appears first, while workflow explanations and follow-up panels move below. The chat/results frame now uses overflow-y: scroll with visible scrollbar styling, stable gutter, contained overscroll, and viewport-relative height so long result sets can be reviewed inside the chat frame without expanding the screen. Updated focused Playwright coverage to assert scrollframe CSS and that the booking form appears above the progress panel after selecting a result. Verification passed: npm --prefix frontend run build; focused live-read Playwright result pagination/tenant relevance run (2 passed); focused live-read booking submit order run (1 passed).
