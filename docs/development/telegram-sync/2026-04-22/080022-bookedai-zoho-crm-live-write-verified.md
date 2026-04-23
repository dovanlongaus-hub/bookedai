# BookedAI Zoho CRM live write verified

- Timestamp: 2026-04-22T08:00:22.639783+00:00
- Source: docs/development/project-update-2026-04-22-zoho-crm-live-write-verified.md
- Category: development-update
- Status: active

## Summary

BookedAI Zoho CRM is now verified end-to-end in production. After passing the Zoho provider env family into the live backend containers and fixing the CRM sync repository timestamp write path, a real crm-sync/contact call successfully upserted a Zoho contact and persisted the sync ledger row as synced with external id 120818000000569001.

## Details

# Zoho CRM Live Write Verification Completed

Date: `2026-04-22`

## Summary

BookedAI Zoho CRM is now verified beyond metadata connectivity. Production runtime successfully performed a real `Contacts` upsert against the AU Zoho tenant, persisted the sync ledger row as `synced`, and returned a real Zoho external entity id.

## What changed

- Fixed a production runtime gap in `docker-compose.prod.yml`:
  - `backend` and `beta-backend` now receive the full Zoho provider env family:
    - `ZOHO_CRM_*`
    - `ZOHO_CALENDAR_*`
    - `ZOHO_BOOKINGS_*`
    - `ZOHO_ACCOUNTS_BASE_URL`
- Fixed a live DB write-back bug in `backend/repositories/crm_repository.py`:
  - `update_sync_record_status(...)` now uses asyncpg-safe `timestamptz` coercion
  - `last_synced_at` is now passed as a native `datetime` object instead of an ISO string

## Live verification

Live test contact payload:

- `contact_id`: `zoho-test-contact-20260422081230`
- `full_name`: `BookedAI Zoho Test Contact Success`
- `email`: `zoho-test+20260422081230@bookedai.au`
- `phone`: `+61400000072`

Live API result from `POST /api/v1/integrations/crm-sync/contact`:

- `sync_status`: `synced`
- `crm_sync_record_id`: `5`
- `external_entity_id`: `120818000000569001`

Follow-up live API result from `GET /api/v1/integrations/crm-sync/status?entity_type=contact&local_entity_id=zoho-test-contact-20260422081230`:

- returned the persisted sync row
- `sync_status`: `synced`
- `external_entity_id`: `120818000000569001`
- `last_synced_at`: `2026-04-22T07:58:52.870962Z`
- `latest_error_code`: `null`

Container log confirmation:

- backend log shows `POST https://www.zohoapis.com.au/crm/v8/Contacts/upsert "HTTP/1.1 200"`
- backend log shows `POST /api/v1/integrations/crm-sync/contact HTTP/1.1" 200 OK`

## Verification steps

- `python3 -m py_compile backend/repositories/crm_repository.py backend/tests/test_phase2_repositories.py`
- host-level deploy via `bash scripts/deploy_live_host.sh`
- live API probe for:
  - `POST /api/v1/integrations/crm-sync/contact`
  - `GET /api/v1/integrations/crm-sync/status`
- host-level backend log read via `sudo -n docker logs --tail ... bookedai-backend-1`

## Remaining note

- A repo-local unittest was added for the repository regression seam, but full unittest execution is still blocked in this workspace because the default Python runtime is missing `sqlalchemy`.
