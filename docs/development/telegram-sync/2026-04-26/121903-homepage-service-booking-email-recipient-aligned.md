# Homepage service booking email recipient aligned

- Timestamp: 2026-04-26T12:19:03.449698+00:00
- Source: codex
- Category: implementation
- Status: completed

## Summary

Fixed homepage service bookings so Future Swim/provider catalog emails are not used for public booking notifications; operational email now routes to info@bookedai.au.

## Details

# Homepage Service Booking Email Recipient Fix - 2026-04-26

## Summary

Homepage service bookings now route operational email through `info@bookedai.au` instead of using provider catalog email addresses such as Future Swim branch mailboxes.

## Details

- Fixed the legacy `/booking-assistant/session` booking path in `BookingAssistantService.create_session()`.
- The selected service can still keep its provider `business_email` in catalog/admin data, but homepage booking delivery no longer treats that provider email as the operational recipient.
- Customer confirmation copy now CCs `BOOKING_BUSINESS_EMAIL`, defaulting to `info@bookedai.au`.
- Internal booking-lead notifications now go to `BOOKING_BUSINESS_EMAIL`, defaulting to `info@bookedai.au`.
- Manual follow-up `mailto:` payment links, response `contact_email`, and workflow metadata now use the BookedAI mailbox for public homepage service bookings.
- Added a regression test using a Future Swim service row with `caringbah@futureswim.com.au` to verify the customer email text, internal notification, and response no longer expose or send to `futureswim.com.au`.

## Verification

- `.venv/bin/python -m pytest backend/tests/test_booking_assistant_service.py -q`
- Result: `13 passed`
