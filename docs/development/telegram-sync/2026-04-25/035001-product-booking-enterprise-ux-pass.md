# Product booking enterprise UX pass

- Timestamp: 2026-04-25T03:50:01.280318+00:00
- Source: codex
- Category: development
- Status: completed

## Summary

Progressive search, compact result actions, explicit book flow, portal-first QR confirmation, and 16s Thank You return are implemented and QA passed.

## Details

# Product Booking Enterprise UX Pass

## Summary

The shared public/product booking runtime now behaves more like a professional enterprise booking flow: slow searches show useful interim matches, result selection no longer jumps into a popup or form, explicit `Book` actions unlock customer details, and confirmation is portal-first with a 16-second thank-you grace period.

## Details

- Updated `frontend/src/apps/public/HomepageSearchExperience.tsx` so local/catalog matches can appear while live ranking continues, keeping the user oriented during slower search.
- Split result selection from booking commitment. Selecting a card only marks it active; detail opens from the detail icon; the customer form opens only from explicit `Book` actions.
- Added a compact one-row result action strip with provider link, detail, contact email, phone, SMS where available, and `Book`.
- Changed the QR fallback to point to `portal.bookedai.au` using the booking reference, instead of preferring a payment URL.
- Added compact confirmation actions for portal, payment when present, email, calendar when present, continue chat, and home.
- Extended the thank-you auto-return from `5s` to `16s`, and added an assistant chat message so the customer can continue searching or ask for more help before returning to the main screen.
- Updated PRD/design/project/sprint/roadmap/progress/memory docs to make the flow requirement explicit.

## QA

- `.venv/bin/python -m pytest backend/tests/test_api_v1_booking_routes.py backend/tests/test_api_v1_search_routes.py backend/tests/test_api_v1_communication_routes.py -q`
- `npm --prefix frontend run build`
- `PLAYWRIGHT_SKIP_BUILD=1 npm --prefix frontend run test:playwright:live-read`
