# Portal QR payment channel handoff

- Timestamp: 2026-04-27T09:45:28.990548+00:00
- Source: docs/development/telegram-sync/2026-04-27/094528-portal-qr-payment-channel-handoff.md
- Category: frontend
- Status: local-complete

## Summary

portal.bookedai.au now shows booking QR, payment QR/posture, canonical booking-reference URL, Telegram/WhatsApp continuation links with the ID attached, and action-effect guidance for pay/change/cancel/help/add paths.

## Details

# Portal QR Payment Channel Handoff

## Summary

`portal.bookedai.au` now makes the returning-customer booking handoff clearer: loaded bookings show booking QR, payment QR/posture, canonical booking-reference URL, Telegram/WhatsApp continuation links with the ID attached, and visible next-effect guidance for the main booking actions.

## Details

- Added booking portal QR generation directly inside the portal booking detail surface so customers can reopen the same order with `booking_reference` already attached.
- Added payment QR/posture display: if `payment.payment_url` exists, the portal shows a scannable payment QR; otherwise it clearly says payment is still waiting for provider/checkout instructions.
- Added copy/save/download controls for the booking ID, portal link, payment context, Telegram deep link, and WhatsApp continuation message.
- Added Telegram handoff link using `https://t.me/BookedAI_Manager_Bot?start=bk.<booking_reference>`.
- Added WhatsApp handoff link with a prefilled message that keeps the booking ID attached.
- Added action-effect guidance for status, pay, reschedule/change, cancel, help, and add-new-booking paths so customers know whether the next step opens checkout, queues provider review, keeps the current booking, or starts a fresh search.
- Added request-form next-effect copy so cancellation, reschedule, pause, and downgrade requests are described as request-safe review actions, not instant destructive mutations.

## Verification

- `npm --prefix frontend exec tsc -- --noEmit`
- `cd frontend && npm exec playwright test tests/portal-enterprise-workspace.spec.ts` (`6 passed`)
- `git diff --check`

## Status

Local implementation and regression coverage are complete. Live deploy and live portal UAT are still pending.
