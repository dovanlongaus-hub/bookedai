# product.bookedai.au QA flow and payment-intent fix

- Timestamp: 2026-04-24T17:02:39.656823+00:00
- Source: telegram
- Category: change-summary
- Status: submitted

## Summary

Live QA on product.bookedai.au now passes search-to-booking-to-payment-intent with no browser console errors; product shell mobile/desktop layout was polished and backend payment lookup now handles booking references plus mixed tenant/service key casts.

## Details

Ran a full production QA pass against https://product.bookedai.au with Playwright desktop and mobile screenshots. The first live booking smoke initially succeeded through lead and booking intent but failed at /api/v1/payments/intents with a browser CORS symptom. Direct preflight was healthy, and backend logs showed the real cause was a Postgres 500 from mixed uuid/varchar comparisons in payment lookup. Fixed backend/api/v1_booking_handlers.py so payment intent creation resolves booking intents by UUID text or v1-* booking_reference, casts service_id and tenant_id joins through text, resolves the booking row tenant, and writes the payment mirror under that tenant. Added regression coverage in backend/tests/test_api_v1_booking_routes.py. Polished frontend/src/apps/public/ProductApp.tsx and frontend/src/components/landing/assistant/BookingAssistantDialog.tsx so the product runtime is wider on desktop and mobile shows quick-search cards immediately instead of a mostly blank first screen. Verification passed with python3 -m py_compile backend/api/v1_booking_handlers.py, backend payment route tests, npm --prefix frontend run build, stack healthcheck, direct product-origin curl to /api/v1/payments/intents returning 200 with Access-Control-Allow-Origin, and final live Playwright booking v1-1ed89a5995 where catalog, conversation session, matching, lead, booking intent, payment intent, email, SMS, and WhatsApp all returned 200 with no console errors and no failed requests.
