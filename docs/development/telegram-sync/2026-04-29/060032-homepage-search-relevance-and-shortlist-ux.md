# Homepage search relevance and shortlist UX

- Timestamp: 2026-04-29T06:00:32.045136+00:00
- Source: docs/development/telegram-sync/2026-04-29/061500-homepage-search-relevance-shortlist-ux.md
- Category: development
- Status: local

## Summary

Local bookedai.au homepage search now filters explicit intent plus location results, shows the first 3 relevant cards, reveals more with Search more, and keeps long results scrollable inside the assistant pane.

## Details

# Homepage Search Relevance And Shortlist UX

Summary: Local `bookedai.au` homepage search now filters explicit intent plus location searches more strictly, shows only the first three relevant results, reveals more with `Search more`, and keeps long result sets scrollable inside the assistant pane.

## What Changed

- Tightened homepage result filtering so searches such as `chess classes in Sydney` must match the requested intent and area before rendering.
- Removed the old weak fallback behavior where out-of-intent matches could reappear when live-read/candidate data included broader city-only results.
- Kept the first result batch to three cards and changed the reveal action to `Search more`.
- Added clearer shortlist guidance so customers compare the first three, open details, then use the explicit `Book` action when one option fits.
- Added a tested scroll frame around the homepage chat/results area so long search results can scroll inside the assistant panel.

## QA

- `npm --prefix frontend run build` passed.
- `cd frontend && PLAYWRIGHT_SKIP_BUILD=1 bash scripts/run_playwright_suite.sh legacy tests/public-homepage-responsive.spec.ts --workers=1 --reporter=line` passed with `5` tests.
- `cd frontend && PLAYWRIGHT_SKIP_BUILD=1 bash scripts/run_playwright_suite.sh legacy tests/public-booking-assistant-live-read.spec.ts --grep "top 3 ranked matches|tenant-backed results" --workers=1 --reporter=line` passed with `2` tests.
- `git diff --check` passed.

## Status

This is a local implementation and QA pass. It has not been deployed live in this closeout.
