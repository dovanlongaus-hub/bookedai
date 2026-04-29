# Product live-read search recovery

- Timestamp: 2026-04-29T05:17:07.934236+00:00
- Source: codex
- Category: product-qa
- Status: local-fix

## Summary

Fixed product assistant warning-only live-read search so chat results stay visible instead of clearing after search.

## Details

# Product Live-Read Search Recovery

## Summary

Fixed the local product assistant search flow so a warning-only live-read response no longer clears the chat result shortlist on `product.bookedai.au`.

## Details

- Root cause: `BookingAssistantDialog.tsx` treated live-read warnings and semantic grounding as authoritative even when there were zero ranked candidates. That allowed the final assistant message to replace the optimistic search placeholder with an empty shortlist, which made the UI feel like the screen disappeared after search.
- Fix: live-read only clears/owns the shortlist when it has candidates. If live-read returns warning-only/no-candidate but instant catalog or legacy chat matches exist, the assistant keeps the closest catalog matches visible and explains that live ranking is still catching up.
- Extra resilience: when the user searches before catalog state has hydrated, the no-candidate/no-instant branch now makes a short legacy chat fallback call so matched service cards can still render.
- Added Playwright coverage for Android-sized mobile in live-read mode to assert fallback copy, visible result card, select/book CTA, and no horizontal overflow.

## Verification

- `npm --prefix frontend run build`
- `cd frontend && PLAYWRIGHT_SKIP_BUILD=1 bash scripts/run_playwright_suite.sh live-read tests/product-app-regression.spec.ts --workers=1 --reporter=line` (`9 passed`)
- `cd frontend && PLAYWRIGHT_SKIP_BUILD=1 bash scripts/run_playwright_suite.sh legacy tests/product-app-regression.spec.ts --workers=1 --reporter=line` (`8 passed`, `1 skipped`)
- `git diff --check`

## Status

Local fix is complete. Production `product.bookedai.au` still needs a live deploy to receive the corrected bundle.
