# Chess tenant search booking capability flow

- Timestamp: 2026-04-25T06:00:35.704799+00:00
- Source: telegram
- Category: product
- Status: completed

## Summary

Updated public/product search so reviewed chess tenant results show verified BookedAI tenant capabilities: booking, Stripe, QR payment/confirmation, calendar, email, WhatsApp Agent, and portal edit support.

## Details

# Chess Tenant Search Booking Capability Flow

Summary: Public/product search now treats reviewed BookedAI chess tenant results as richer tenant matches while preserving the results-first browsing flow.

Details:

- Added shared frontend detection for BookedAI chess tenant services, including the reviewed `Co Mai Hung Chess Class` / Grandmaster Chess search path.
- Homepage search and product assistant cards now keep chess tenant results in the normal shortlist, but add a compact verified-tenant badge and capability chips for Book, Stripe, QR payment, QR confirmation, calendar, email, WhatsApp Agent, and portal edit.
- Selected-booking panels now explain that the chess tenant flow can continue through BookedAI with payment, QR confirmation, calendar/email, WhatsApp Agent follow-up, and portal change support.
- Product confirmation QR now falls back to a generated `portal.bookedai.au` QR whenever the backend response does not include a QR URL, keeping QR confirmation visible for every captured booking.
- Confirmation copy now names Stripe/QR payment posture and WhatsApp Agent follow-up while keeping the portal as the durable place to review, edit, reschedule, or cancel.
- Verification: `npm --prefix frontend run build` passed.
