# Homepage Shortcut Fast Preview - 2026-04-26

## Summary

Homepage shortcut searches now make the proof verticals easier to find and faster to display: Future Swim, Co Mai Hung Chess, and WSTI AI Event searches show useful results immediately while live ranking continues.

## Details

- Updated homepage suggested-search copy to include exact high-signal terms:
  - `Future Swim kids swimming lessons near Caringbah`
  - `Co Mai Hung Chess Sydney pilot class`
  - `WSTI AI events at Western Sydney Startup Hub`
- Added fast-preview intent detection inside `HomepageSearchExperience` for swim, chess, and WSTI/AI-event searches.
- For swim/chess, the runtime pulls matching catalog rows immediately, then keeps live ranking and booking-path checks running.
- For WSTI/AI-event queries, the runtime can show a WSTI shortcut event result immediately, with the Meetup page and Western Sydney Startup Hub context attached.
- Preserved the broad `near me` location guardrail: fast previews do not display for ambiguous near-me searches unless the query includes an explicit area.

## Verification

- `npm --prefix frontend exec tsc -- --noEmit`
- `npm --prefix frontend run build`
- `cd frontend && PLAYWRIGHT_PUBLIC_ASSISTANT_MODE=live-read npx playwright test tests/public-booking-assistant-live-read.spec.ts --grep "homepage shortcut searches" --workers=1 --reporter=line`
- Result: focused shortcut regression passed.

## Note

An additional broad Playwright grep for the existing chess near-me and tenant-intent guardrail cases was attempted, but the worker was terminated with exit `143` before completion in this environment.
