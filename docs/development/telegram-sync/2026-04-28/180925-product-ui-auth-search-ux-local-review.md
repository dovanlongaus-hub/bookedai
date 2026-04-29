# Product UI/auth/search UX local review

- Timestamp: 2026-04-28T18:09:25.504123+00:00
- Source: docs/development/telegram-sync/2026-04-28/180906-product-ui-auth-search-ux-local-review.md
- Category: development
- Status: local

## Summary

Local product.bookedai.au UX pass: compact header, Google/email account menu, saved customer profile prefill, mobile search-first layout, status-aware Chat/Search/Preview/Book/Pay/Care desktop journey, and faster perceived live-read progress. Verified with Vite build, product Playwright regression (7 passed), responsive no-overflow sweeps, and diff check. Not deployed live; full npm build is blocked by unrelated ChessGrandmaster TypeScript drift.

## Details

# Product UI/Auth/Search UX Local Review

Summary: reviewed and tightened the local `product.bookedai.au` experience for desktop, mobile, and Android-sized viewports. The product shell now keeps the chat/search workspace primary, removes redundant header text, adds a compact account menu, reuses saved customer booking details, and improves slow live-read search feedback.

Details:

- Removed the redundant `BookedAI` text beside the logo in the product top bar so mobile and desktop headers have more room for account and CTA actions.
- Added a compact account menu to the product shell. Google Identity Services can render when `VITE_GOOGLE_CLIENT_ID` is configured, while email/name fallback remains available without Google config.
- Added local saved-customer-profile reuse so returning customers can have name, email, and phone prefilled in later booking forms instead of being asked again by chat.
- Redesigned the product booking journey around `Chat`, `Search`, `Preview`, `Book`, `Pay`, and `Care`. The journey strip is hidden on mobile to preserve a cleaner search-first workspace and remains status-aware on larger screens.
- Improved slow live-read search perception by showing instant tenant/catalog matches first, adding tenant/service shortcut aliases for current themes such as chess, swim, mentor, WSTI, and events, bounding live-read waits with a fallback result, and refreshing the staged progress copy.
- Updated product regression coverage for the compact mobile shell, saved-profile booking prefill, desktop journey surface, and horizontal-overflow checks.

Verification:

- `cd frontend && npx vite build` passed.
- `cd frontend && PLAYWRIGHT_SKIP_BUILD=1 bash scripts/run_playwright_suite.sh legacy tests/product-app-regression.spec.ts --workers=1 --reporter=line` passed with `7 passed`.
- Responsive browser sweeps at `390x844`, `412x915`, and `1440x1000` returned `0` horizontal overflow and no console/request errors.
- `git diff --check` passed for touched product files and synced docs.

Caveats:

- The full `npm --prefix frontend run build` is currently blocked by unrelated TypeScript errors in `frontend/src/apps/public/ChessGrandmasterApp.tsx`.
- This pass was not deployed live. Server-side authenticated customer identity binding remains a follow-up; the current change stores and reuses a local product customer profile.
