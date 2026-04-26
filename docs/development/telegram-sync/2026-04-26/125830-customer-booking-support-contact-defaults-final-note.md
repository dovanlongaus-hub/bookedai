# Customer booking support contact defaults final note

- Timestamp: 2026-04-26T12:58:30.822506+00:00
- Source: telegram
- Category: change-summary
- Status: submitted

## Summary

Updated the final support-contact closeout note to include the portal support-label rule: BookedAI-managed customer booking support stays under BookedAI support with info@bookedai.au and +61455301335 for Telegram, WhatsApp, or iMessage.

## Details

# Customer Booking Support Contact Defaults

Date: `2026-04-26`

## Summary

BookedAI-managed customer booking channels now default support/contact identity to `info@bookedai.au` and `+61455301335`, with the phone framed as available for Telegram, WhatsApp, or iMessage.

## Changes

- Added `backend/core/customer_booking_contact.py` as the shared backend contract for customer booking support email, phone, and channel labels.
- Added env defaults:
  - `BOOKEDAI_CUSTOMER_BOOKING_SUPPORT_EMAIL=info@bookedai.au`
  - `BOOKEDAI_CUSTOMER_BOOKING_SUPPORT_PHONE=+61455301335`
- Kept `BOOKING_BUSINESS_EMAIL` and `WHATSAPP_FROM_NUMBER` aligned with the same defaults.
- Updated portal booking snapshots, portal support labels, and portal care-turn replies so BookedAI-managed customer-booking support falls back to BookedAI contact details, not provider catalog emails or provider-branded support labels.
- Updated communication templates and Telegram/WhatsApp fallback copy to mention the BookedAI support email plus phone for Telegram, WhatsApp, or iMessage.
- Updated the portal UI fallback to show the BookedAI email, phone, and channel posture when support contact data is missing.

## Verification

- `python3 -m py_compile backend/core/customer_booking_contact.py backend/config.py backend/service_layer/communication_service.py backend/service_layer/messaging_automation_service.py backend/service_layer/tenant_app_service.py backend/api/route_handlers.py`
- `.venv/bin/python -m pytest backend/tests/test_config.py backend/tests/test_api_v1_portal_routes.py backend/tests/test_telegram_webhook_routes.py backend/tests/test_whatsapp_webhook_routes.py backend/tests/test_booking_assistant_service.py backend/tests/test_lifecycle_ops_service.py::CommunicationServiceDeliveryFallbackTestCase -q` (`51 passed`)
- `npm --prefix frontend exec tsc -- --noEmit`
