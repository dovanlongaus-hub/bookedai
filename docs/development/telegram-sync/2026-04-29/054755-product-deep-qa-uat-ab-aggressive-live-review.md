# Product deep QA UAT AB aggressive live review

- Timestamp: 2026-04-29T05:47:55.377923+00:00
- Source: docs/development/telegram-sync/2026-04-29/054755-product-deep-qa-uat-ab-aggressive-live-review.md
- Category: product-qa
- Status: done

## Summary

product.bookedai.au passed focused backend regression, frontend build, product legacy and live-read Playwright lanes, and production multi-viewport A/B/source aggressive smoke; shared homepage live-read drift remains separate.

## Details

# Product Deep QA UAT AB Aggressive Live Review

## Summary

Reviewed `product.bookedai.au` after the Anthropic fallback live deploy with focused backend coverage, product Playwright regression, live-read product-only coverage, production multi-viewport smoke, and A/B/source/audience URL probes. Product UAT is green; shared homepage/public-assistant live-read contract drift remains separate from the product lane.

## Details

- Repo was already on `main`, so the merge path is to commit the deployed changes directly on `main`.
- Used the installed QA Playwright and visual-regression testing guidance: exact critical journeys, product lane separation from shared homepage drift, multi-viewport browser checks, console/request monitoring, and screenshot sanity captures.
- Confirmed `product.bookedai.au` production returns HTTP `200` and `api.bookedai.au/api/health` returns backend `ok`.
- Ran production product probes across:
  - `390x844` SME/control chess search
  - `412x915` product-first/judge swim search
  - `1440x1000` investor/source WSTI event search
  - `1366x900` aggressive public-web haircut search
- Each production probe had a visible result, no raw error copy, horizontal overflow `0`, console errors `0`, and failed requests `0`.
- Captured visual sanity screenshots under `output/playwright/product-deepqa-*.png`.
- The broader shared `public-booking-assistant-live-read` suite still has homepage/public-assistant contract drift: stale selectors/placeholders, copy/source-label expectation drift, and shared booking-form expectations. This is not blocking the product lane because product-only live-read passed.

## Verification

- `./.venv/bin/python -m pytest backend/tests/test_config.py backend/tests/test_booking_assistant_service.py backend/tests/test_api_v1_search_location_guardrails.py backend/tests/test_api_v1_search_routes.py backend/tests/test_chat_send_routes.py backend/tests/test_api_v1_booking_routes.py backend/tests/test_booking_assistant_runtime.py -q` (`64 passed`)
- `npm --prefix frontend run build`
- `cd frontend && PLAYWRIGHT_SKIP_BUILD=1 bash scripts/run_playwright_suite.sh legacy tests/product-app-regression.spec.ts tests/product-explicit-book-gate.spec.ts tests/product-popup-detail-no-noise.spec.ts --workers=1 --reporter=line` (`10 passed`, `1 skipped`)
- `cd frontend && PLAYWRIGHT_SKIP_BUILD=1 bash scripts/run_playwright_suite.sh live-read tests/product-app-regression.spec.ts tests/product-explicit-book-gate.spec.ts tests/product-popup-detail-no-noise.spec.ts --workers=1 --reporter=line` (`11 passed`)
- Production aggressive browser smoke (`4/4` scenarios passed)
- `git diff --check`

## Status

Product lane is green on local regression, live-read regression, production smoke, A/B/source/audience probes, and visual sanity. Remaining drift belongs to the shared homepage/public-assistant live-read suite and should be handled as a separate homepage contract refresh.
