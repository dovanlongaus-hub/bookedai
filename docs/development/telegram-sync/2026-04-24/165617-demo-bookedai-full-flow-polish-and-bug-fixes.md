# Demo bookedai full-flow polish and bug fixes

- Timestamp: 2026-04-24T16:56:17.507368+00:00
- Source: telegram
- Category: change-summary
- Status: submitted

## Summary

Polished demo.bookedai.au layout and fixed partial API failure handling in the chess revenue-engine flow.

## Details

Updated the demo host after a local Playwright smoke pass. Fixed desktop results clipping by making the result rail scroll safely, made the booking modal viewport-safe on small screens with max-height scrolling and dialog semantics, added a branded chess fallback for result cards without images, and upgraded the booking panel so revenue-agent actions render as a clearer handoff timeline with status tones, icons, and reasons. Fixed a flow bug where assessment API failure could be reported as a global search failure after live-read returned; assessment creation is now isolated, partial search state remains truthful, and bundle suggestions no longer render when no real shortlist exists. Verification passed with npm --prefix frontend run build and Playwright CLI smoke screenshot output/playwright/demo-polish-2026-04-24.png. Local smoke still shows expected unauthorized API responses outside the authenticated production runtime.
