# Product after-booking order detail UX

- Timestamp: 2026-04-29T00:13:20.559783+00:00
- Source: docs/development/telegram-sync/2026-04-29/001320-product-after-booking-order-detail-ux.md
- Category: development
- Status: local

## Summary

Local product.bookedai.au after-booking UX now has a professional order screen: confirmed-order hero, order summary, View details, portal/QR access, payment, Apple Wallet and Google Wallet entry links, share/email/print, and responsive order details. Verified with frontend build, product Playwright regression (8 passed), and diff check. Not deployed live; actual wallet pass generation remains portal/backend follow-up.

## Details

# Product After-Booking Order Detail UX

Summary: redesigned the local `product.bookedai.au` after-booking confirmation state into a professional order detail screen with a clear summary, detail view, wallet pass entry points, portal/QR access, payment, and customer-care actions.

Details:

- Reworked the confirmation state as an order-style surface: confirmed-order hero, booking reference copy, order summary, order-detail panel, and post-booking action groups.
- Added a `View details` action that jumps to the order-detail panel.
- Added Apple Wallet and Google Wallet entry links that preserve the booking reference and pass provider in the portal URL. Actual pass generation remains a portal/backend follow-up.
- Kept one QR code only, so the screen stays clean and avoids duplicated scannable targets.
- Added mobile-friendly action groups for portal, payment, wallet, calendar, share, email, print, edit, reschedule, cancel, and Telegram care.
- Added responsive order detail content for service, venue, customer/contact, requested date/time, price, and payment posture.
- Updated product regression tests to assert order summary, view details, Apple Wallet, Google Wallet, single QR, and no horizontal overflow on mobile, Android-sized, and desktop flows.

Verification:

- `npm --prefix frontend run build` passed.
- `cd frontend && PLAYWRIGHT_SKIP_BUILD=1 bash scripts/run_playwright_suite.sh legacy tests/product-app-regression.spec.ts --workers=1 --reporter=line` passed with `8 passed`.
- `git diff --check` passed for touched product files and synced docs.

Status:

- Local implementation and regression coverage are complete.
- Live deploy was not run in this pass.
- Real Apple Wallet / Google Wallet pass generation remains a follow-up behind the portal/backend action URLs.
