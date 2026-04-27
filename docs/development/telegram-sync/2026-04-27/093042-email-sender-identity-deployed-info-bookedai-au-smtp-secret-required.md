# Email sender identity deployed; info@bookedai.au SMTP secret required

- Timestamp: 2026-04-27T09:30:42.294255+00:00
- Source: docs/development/telegram-sync/2026-04-27/092805-email-sender-info-bookedai-au-live.md
- Category: operations
- Status: credential-action-required

## Summary

BookedAI sender identity is live on info@bookedai.au across env, compose, backend defaults, Supabase settings, and backend/beta-backend containers. Stack health passed, but SMTP auth now fails until EMAIL_SMTP_PASSWORD/EMAIL_IMAP_PASSWORD are replaced with valid Zoho app-password secrets for info@bookedai.au.

## Details

# BookedAI email sender identity aligned live

## Summary

BookedAI-managed outgoing email configuration is now aligned on `info@bookedai.au` across local runtime env, Docker compose fallbacks, backend blank-env handling, Supabase email settings, and the live backend containers.

## Details

- Updated root `.env` so `BOOKING_BUSINESS_EMAIL`, `EMAIL_SMTP_USERNAME`, `EMAIL_SMTP_FROM`, and `EMAIL_IMAP_USERNAME` use `info@bookedai.au`.
- Updated `supabase/.env` and `supabase/.env.example` so Supabase email admin/certbot contact settings use `info@bookedai.au`.
- Hardened `backend/config.py` so blank email env values fall back to `info@bookedai.au` for booking business email, customer support email, SMTP username, SMTP From, and IMAP username.
- Updated `docker-compose.yml` and `docker-compose.prod.yml` so backend and beta-backend receive `info@bookedai.au` for SMTP username, SMTP From, and IMAP username when explicit env overrides are omitted.
- Updated remaining public/admin webapp contact placeholders that still pointed at older BookedAI mailboxes.
- Updated `project.md`, `docs/development/implementation-progress.md`, `docs/architecture/current-phase-sprint-execution-plan.md`, `docs/development/next-phase-implementation-plan-2026-04-25.md`, `MEMORY.md`, and `memory/2026-04-27.md`.

## Verification

- `python3 -m py_compile backend/config.py`
- `.venv/bin/python -m pytest backend/tests/test_config.py backend/tests/test_booking_assistant_service.py -q` passed with `18 passed`
- Direct backend settings probes confirmed both root `.env` and omitted-env fallback resolve to `info@bookedai.au`
- `docker compose -f docker-compose.prod.yml --env-file .env config` resolves backend and beta-backend email identity variables to `info@bookedai.au`
- `bash scripts/deploy_live_host.sh` completed production deployment
- `bash scripts/healthcheck_stack.sh` passed at `2026-04-27T09:28:05Z`
- Live `https://api.bookedai.au/api/health` returned `{"status":"ok","service":"backend"}` and `https://bookedai.au/` returned `HTTP/2 200`
- Live backend and beta-backend container env probes confirmed:
  - `BOOKING_BUSINESS_EMAIL=info@bookedai.au`
  - `EMAIL_SMTP_USERNAME=info@bookedai.au`
  - `EMAIL_SMTP_FROM=info@bookedai.au`
  - `EMAIL_IMAP_USERNAME=info@bookedai.au`
- SMTP auth check without sending mail currently returns `SMTPAuthenticationError`; the deployed sender identity is correct, but real outbound delivery still needs valid Zoho app passwords for `info@bookedai.au` in `EMAIL_SMTP_PASSWORD` and `EMAIL_IMAP_PASSWORD`.

## Status

Sender identity configuration is complete and deployed live. Real SMTP delivery is blocked until the `info@bookedai.au` mailbox app-password secret is updated.
