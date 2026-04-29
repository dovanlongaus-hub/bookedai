# Homepage just-in-time location search

- Timestamp: 2026-04-29T07:19:35.615258+00:00
- Source: codex
- Category: development
- Status: completed

## Summary

bookedai.au homepage search now asks for device location only when a near-me/location-sensitive query needs it, reruns with user_location after approval, keeps stale broad fallback cards hidden when location is unavailable, and tightens short-token intent matching.

## Details

# Homepage Just-In-Time Location Search

## Summary

`bookedai.au` homepage search now asks for device location only when the query needs it, keeps unrelated fallback results hidden for near-me searches without location, and tightens short-token intent matching.

## Details

- Changed homepage search so near-me and backend location-warning flows show a chat prompt instead of automatically invoking browser geolocation during the initial search.
- Added `Use current location` and `Type suburb instead` actions. Approving current location reruns the same query with `user_location`; typing a suburb keeps the flow focused on user-provided local context.
- Kept stale or broad fallback cards hidden when location is unavailable so the user is not shown Australia-wide or unrelated results for a local query.
- Tightened short intent terms to exact-word matching in homepage relevance filtering and ranking.
- Updated `project.md`, `docs/development/implementation-progress.md`, `docs/architecture/current-phase-sprint-execution-plan.md`, `MEMORY.md`, and `memory/2026-04-29.md`.

## Verification

- `npm --prefix frontend run build`
- `cd frontend && PLAYWRIGHT_SKIP_BUILD=1 bash scripts/run_playwright_suite.sh live-read tests/public-booking-assistant-live-read.spec.ts --grep "near me asks for location just in time|homepage runtime only shows tenant-backed results|renders homepage search results with top three" --workers=1 --reporter=line` (`2 passed`)
- `cd frontend && PLAYWRIGHT_SKIP_BUILD=1 bash scripts/run_playwright_suite.sh live-read tests/public-booking-assistant-live-read.spec.ts --grep "chat shows only the top 3 ranked matches" --workers=1 --reporter=line` (`1 passed`)
