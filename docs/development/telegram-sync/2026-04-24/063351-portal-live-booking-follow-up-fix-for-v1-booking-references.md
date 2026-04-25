# Portal live booking follow-up fix for v1 booking references

- Timestamp: 2026-04-24T06:33:51.862078+00:00
- Source: backend/service_layer/tenant_app_service.py, .env
- Category: backend
- Status: done

## Summary

A full live production booking succeeded on bookedai.au, then the follow-up portal failure for the resulting v1 booking reference was fixed in backend portal snapshot loading and runtime CORS config.

## Details

Ran a full live production booking smoke test on bookedai.au using a QA email-only payload, which created booking reference v1-98738517ed successfully through lead, booking intent, payment intent, email, and CRM handoff. The follow-up portal open on portal.bookedai.au then surfaced two backend regressions in backend/service_layer/tenant_app_service.py: UUID-only assumptions around payment/audit lookups for legacy-style booking intent ids, and a mixed-type join between booking_intents and service_merchant_profiles. Fixed both by guarding UUID-only queries and casting the mixed join keys to text. A final production runtime issue also surfaced: .env CORS_ALLOW_ORIGINS was missing https://portal.bookedai.au even though code defaults included it, so the API returned 200 without Access-Control-Allow-Origin for the portal host. Added the portal origin to runtime CORS config, redeployed live, reran healthcheck, confirmed the API now returns Access-Control-Allow-Origin: https://portal.bookedai.au, and verified the live portal opens booking v1-98738517ed successfully with no browser console errors.
