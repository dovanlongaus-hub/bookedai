# BookedAI email sender default info@bookedai.au

- Timestamp: 2026-04-26T05:48:47.336991+00:00
- Source: docs/development/telegram-sync/2026-04-26/054847-bookedai-email-sender-default-info-bookedai-au.md
- Category: configuration
- Status: done

## Summary

bookedai.au email sender/support defaults are now standardized on info@bookedai.au.

## Details

# BookedAI Email Sender Default Alignment

Summary: bookedai.au email sender/support defaults are now standardized on `info@bookedai.au`.

Details:

- Backend `get_settings()` now defaults `EMAIL_SMTP_USERNAME` and `EMAIL_SMTP_FROM` to `info@bookedai.au` when the environment does not provide explicit values.
- Portal/customer-care support fallbacks now use `info@bookedai.au` instead of `support@bookedai.au`.
- README, project state, implementation progress, current sprint plan, and memory were updated with the sender identity rule.
- Verification passed with `./.venv/bin/python -m pytest backend/tests/test_config.py backend/tests/test_api_v1_communication_routes.py backend/tests/test_api_v1_tenant_routes.py -q`.
