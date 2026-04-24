# Homepage messaging follow-up resilience and live verification

- Timestamp: 2026-04-24T01:45:29.457950+00:00
- Source: telegram
- Category: change-summary
- Status: submitted

## Summary

Cleaned up the remaining homepage post-booking SMS/WhatsApp errors by normalizing AU phone inputs to E.164 on the frontend and degrading provider auth failures to queued manual-review status on the backend, then redeployed and verified live.

## Details

The remaining homepage booking console noise was no longer the booking write path itself; it came from downstream SMS and WhatsApp follow-up calls. Frontend automation in HomepageSearchExperience and BookingAssistantDialog now normalizes local AU mobile numbers like 0400... to +61400... via frontend/src/shared/utils/phone.ts before calling /api/v1/sms/messages/send and /api/v1/whatsapp/messages/send, which removes the old 422 validation failures. Backend messaging was then hardened in backend/service_layer/communication_service.py so Twilio/WhatsApp auth failures and upstream 5xx responses degrade to delivery_status queued with manual-review warnings instead of bubbling into 502 transport failures after the booking is already confirmed. Verification covered backend tests for lifecycle and communication routes, frontend typecheck and build, a fresh live deploy, direct curl probes showing both messaging endpoints now return 200 queued with warnings, and a live Playwright homepage booking smoke test on bookedai.au using kids swimming lessons sydney that completed with zero browser console errors while showing queued SMS/WhatsApp follow-up state in the UI.
