# Customer Telegram payment care false-escalation fix

- Timestamp: 2026-04-27T09:23:23.159386+00:00
- Source: docs/development/telegram-sync/2026-04-27/customer-telegram-payment-care-false-escalation-fix.md
- Category: customer-care
- Status: closed

## Summary

Fixed customer Telegram existing-booking payment/status care so prior assistant Support contact history cannot accidentally queue a support request; replies now include booking portal and QR controls. Verification: Telegram webhook suite 14 passed.

## Details

# Customer Telegram Payment Care False Escalation Fix

## Summary

Fixed a customer Telegram booking-care defect where prior assistant history containing `Support contact` could be included in the portal-care message and accidentally queue a support request when the latest customer message only asked for payment/status on an existing booking such as `v1-6dfc0946e4`.

## Details

- `MessagingAutomationService` now sends only the latest customer text into `build_portal_customer_care_turn` for existing-booking care classification.
- Existing-booking Telegram care replies now include inline controls for the booking portal and QR code, giving pending-payment/status replies a direct order reopen path.
- Added a regression test that simulates prior assistant support copy plus a neutral payment-status question and verifies no support request copy appears while portal controls are returned.
- Updated `README.md`, `project.md`, implementation progress, the current sprint plan, the Phase 19 operating-system notes, and daily memory.

## Verification

- `.venv/bin/python -m py_compile backend/service_layer/messaging_automation_service.py backend/tests/test_telegram_webhook_routes.py`
- `.venv/bin/python -m pytest backend/tests/test_telegram_webhook_routes.py -q` (`14 passed`)
