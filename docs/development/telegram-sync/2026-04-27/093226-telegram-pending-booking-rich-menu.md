# Telegram pending booking rich menu

- Timestamp: 2026-04-27T09:32:26.343704+00:00
- Source: docs/development/telegram-pending-booking-rich-menu-2026-04-27.md
- Category: telegram
- Status: local verified

## Summary

BookedAI Manager Bot now returns a rich Telegram action menu for captured-but-unpaid bookings and existing-booking care replies: keep booking, view portal/QR, change time, cancel, start a new search, or open BookedAI.

## Details

# Telegram Pending Booking Rich Menu - 2026-04-27

## Summary

BookedAI Manager Bot now keeps customers in a clear Telegram decision flow after a booking is captured but payment is still pending.

## What Changed

- Pending-payment Telegram booking replies now state that the booking was captured and payment is pending.
- The Telegram booking-care menu now includes:
  - `Keep this booking`
  - `View booking`
  - `Open order QR`
  - `Change time`
  - `Cancel booking`
  - `New booking search`
  - `Open BookedAI`
- Existing-booking care replies reuse the same professional inline action menu instead of only returning portal and QR buttons.
- Telegram reply controls now declare `HTML` parse mode for normal booking-care cards so headings, labels, and links render professionally.

## Verification

- `python3 -m py_compile backend/service_layer/messaging_automation_service.py backend/tests/test_telegram_webhook_routes.py`
- `.venv-test/bin/python -m pytest backend/tests/test_telegram_webhook_routes.py -q` (`15 passed`)
- `git diff --check`

## Follow-Up

- Deploy live before claiming the menu is available in production.
- Run a real Telegram UAT from `@BookedAI_Manager_Bot` with a pending booking reference to confirm the customer sees the full button set.
