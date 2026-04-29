# Product professional review and location guardrail

- Timestamp: 2026-04-29T02:11:54.800082+00:00
- Source: docs/development/telegram-sync/2026-04-29/021154-product-professional-review-and-location-guardrail.md
- Category: development
- Status: local

## Summary

Professional user review of live product.bookedai.au found the product shell technically stable but search trust is now the main UX risk: location-specific prompts can still surface mismatched fallback services. Implemented a local frontend instant-search guardrail that penalizes services not matching explicit Sydney/Miranda/Caringbah/Brisbane/Carlton/Western Sydney style location intent. Verified frontend build, product UAT suite (10 passed), and diff check. Next: move location mismatch blocking into backend/live-read ranking and add result-quality telemetry.

## Details

# Product Professional Review And Location Guardrail

Summary: reviewed live `product.bookedai.au` from a professional user perspective and implemented a local search relevance guardrail so clear location queries do not elevate mismatched fallback services as top instant matches.

Review findings:

- The production product shell is technically stable on mobile review: no horizontal overflow, no console errors, no failed requests, and the assistant is visible.
- The UX has improved enough that the primary risk is now trust, not layout.
- Search relevance still needs stronger grounding: prompts such as Sydney or Miranda can surface other-state fallback catalog results, which feels demo-like to a professional user.
- The booking flow should continue to prioritize explicit preview/select/book states and avoid sending users into forms until the result is clearly relevant.

Implemented locally:

- Added location alias detection for Sydney, Miranda, Caringbah, Brisbane, Carlton, and Western Sydney style queries.
- Penalized services that do not match the requested location text before they can appear as top instant matches.
- Kept the change scoped to the frontend instant shortlist, leaving backend ranking/location extraction as a deeper follow-up.

Verification:

- `cd frontend && PLAYWRIGHT_SKIP_BUILD=1 bash scripts/run_playwright_suite.sh legacy tests/product-app-regression.spec.ts tests/product-explicit-book-gate.spec.ts tests/product-popup-detail-no-noise.spec.ts --workers=1 --reporter=line` passed with `10 passed`.
- `npm --prefix frontend run build` passed.
- `git diff --check` passed for touched files.

Recommended next implementation:

- Promote location extraction and mismatch blocking into the backend/live-read contract so production API truth and frontend instant shortlist behave the same way.
- Add stable result-quality telemetry: query location, result location, mismatch suppressed count, selected result id, and booking conversion.
- Split product vs homepage live-read gates so product releases are not blocked by unrelated homepage selector/copy drift.
- Build the real Apple Wallet / Google Wallet pass generation behind the portal action URLs already added locally.
