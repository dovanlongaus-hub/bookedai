# Homepage booking load-failed hotfix and live verification

- Timestamp: 2026-04-24T01:16:53.761561+00:00
- Source: telegram
- Category: change-summary
- Status: submitted

## Summary

Fixed the production homepage booking 'Load failed' regression by hardening nullable contact/lead lookup binds in the backend, redeployed live, and verified end-to-end booking now completes on bookedai.au.

## Details

Traced the live failure to asyncpg raising AmbiguousParameterError inside backend/repositories/contact_repository.py when public-web booking flows executed the nullable email/phone lookup predicate. Hardened both contact and lead repository SQL to cast nullable text bind params explicitly, added repository regression coverage in backend/tests/test_phase2_repositories.py, reran backend contract tests, redeployed with python3 scripts/telegram_workspace_ops.py deploy-live, and confirmed healthcheck passed. Post-deploy verification included direct curl probes to https://api.bookedai.au/api/v1/leads and /api/v1/bookings/intents returning 200 with Access-Control-Allow-Origin for https://bookedai.au, plus a live Playwright smoke test on bookedai.au using 'kids swimming lessons sydney' that completed through the thank-you and portal state instead of failing at confirmation. Residual console noise remains from downstream /api/v1/sms/messages/send and /api/v1/whatsapp/messages/send returning 422 after the booking itself succeeds.
