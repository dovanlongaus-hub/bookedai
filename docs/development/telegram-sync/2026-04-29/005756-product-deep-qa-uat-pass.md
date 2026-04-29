# Product deep QA/UAT pass

- Timestamp: 2026-04-29T00:57:56.395211+00:00
- Source: docs/development/telegram-sync/2026-04-29/005756-product-deep-qa-uat-pass.md
- Category: qa
- Status: local

## Summary

Focused product.bookedai.au QA/UAT pass completed: frontend build passed, product local UAT/regression passed (10), after-booking responsive subset passed (3), product live-read popup tests passed (4), standard live-read smoke passed (2 with PLAYWRIGHT_SKIP_BUILD=1), backend booking/care/payment/messaging/calendar tests passed (125), and live product smoke passed on 390/412/1440 with no overflow, console errors, or failed requests. Fixed Playwright preview readiness timeout to reduce cold-build false failures. Broad homepage live-read contract drift remains a non-product follow-up.

## Details

# Product Deep QA/UAT Pass

Summary: ran a focused QA/UAT pass for `product.bookedai.au` across local product regression, after-booking responsive coverage, product live-read popup coverage, backend booking/care/payment/messaging routes, and live production smoke.

Verification:

- `npm --prefix frontend run build` passed.
- Legacy product UAT suite passed: `10 passed` across product app regression, explicit book gate, and popup detail/no-noise tests.
- After-booking responsive subset passed: `3 passed` across mobile, Android-sized, and desktop confirmation/order-detail flows.
- Product live-read popup suite passed: `4 passed`.
- Standard live-read smoke passed with `PLAYWRIGHT_SKIP_BUILD=1`: `2 passed`.
- Focused backend booking/chat/handoff/Stripe/Telegram/WhatsApp/Calendar suite passed: `125 passed`.
- Live production smoke passed against `https://product.bookedai.au/` at `390x844`, `412x915`, and `1440x1000`: assistant input visible, chess search returned matching text, horizontal overflow `0`, no console errors, no failed requests, stale long flow copy absent, and redundant logo-side `BookedAI` text absent.
- `https://product.bookedai.au/` returned `200`; `https://api.bookedai.au/api/health` returned backend `ok`.

Fix:

- `frontend/scripts/run_playwright_suite.sh` now uses configurable `PLAYWRIGHT_PREVIEW_READY_TIMEOUT_SECONDS` with a `180s` default instead of a hardcoded `60s`, reducing false preview-readiness failures during cold frontend builds.

Findings and suggestions:

- Product-specific local and live-smoke lanes are green.
- The broad all-in-one live-read regression command still exposes shared homepage/test-contract drift outside the product popup lane: missing homepage input selectors in several tests, source-label expectation drift (`Sourced from the public web` vs current `Live web read`), and in-progress copy expectation drift.
- Recommended next QA cleanup: split product and homepage live-read gates, add stable assistant input test ids for homepage/product surfaces, and refresh homepage source-label/progress-copy expectations before using the broad suite as a hard release gate.

Status:

- Local product QA/UAT is complete.
- Live production smoke is healthy.
- Live deploy was not run in this pass because the workspace contains broader unrelated changes; local after-booking UI remains pending a deliberate deployment gate.
