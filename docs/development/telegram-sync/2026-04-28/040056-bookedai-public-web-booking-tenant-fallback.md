# BookedAI public web booking tenant fallback

- Timestamp: 2026-04-28T04:00:56.895390+00:00
- Source: telegram
- Category: change-summary
- Status: submitted

## Summary

Fixed the product.bookedai.au booking failure by seeding the bookedai-au Web Booking tenant and falling public search bookings back to it when no provider tenant resolves.

## Details

Seeded migration 024_bookedai_web_booking_tenant.sql for slug bookedai-au / BookedAI.au Web Booking with login/contact info@bookedai.au, password FirstHundredM$, and support phone/Telegram/WhatsApp/SMS +61455301335. Backend v1 booking handlers now resolve public_web and embedded_widget booking calls to bookedai-au when the requested tenant/provider tenant is missing, while authenticated actor_context.tenant_id mismatch validation still returns 403. Applied migration 024 live, deployed through bash scripts/deploy_live_host.sh, stack health passed at 2026-04-28T04:00:02Z, path-resolve fallback returned 200, and booking-intent UAT created v1-e13e9d61f0 under tenant bookedai-au.
