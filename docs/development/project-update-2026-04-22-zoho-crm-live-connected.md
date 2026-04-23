# Zoho CRM Live Connection Activated

Date: `2026-04-22`

## Summary

BookedAI Zoho CRM integration is now live-connected for the AU tenant instead of only code-ready. The repo-local runtime now has real client credentials plus refresh-token posture, and direct CRM metadata smoke testing confirms the BookedAI backend can authenticate and read the required module and field contract.

## What changed

- Root `.env` now contains:
  - `ZOHO_CRM_CLIENT_ID`
  - `ZOHO_CRM_CLIENT_SECRET`
  - `ZOHO_CRM_ACCESS_TOKEN`
  - `ZOHO_CRM_REFRESH_TOKEN`
- `ZOHO_ACCOUNTS_BASE_URL` is now pinned to `https://accounts.zoho.com.au`
- `ZOHO_CRM_API_BASE_URL` remains `https://www.zohoapis.com.au/crm/v8`
- The auth code returned by Zoho Accounts was exchanged successfully through:

```sh
python3 scripts/zoho_crm_connect.py exchange-code \
  --code '<zoho-auth-code>' \
  --redirect-uri https://api.bookedai.au/zoho/oauth/callback \
  --write-env
```

## Verification

- `python3 scripts/zoho_crm_connect.py test-connection --module Leads`
- Result:
  - `status: connected`
  - `token_source: access_token`
  - `module_count: 51`
  - `requested_module_found: true`
  - `field_count: 55`

## Confirmed CRM surface

The live metadata read confirmed visibility for default modules including:

- `Leads`
- `Contacts`
- `Accounts`
- `Deals`
- `Tasks`

The `Leads` smoke test also confirmed the core BookedAI write-back field contract is present, including:

- `Last_Name`
- `Company`
- `Email`
- `Phone`
- `Lead_Source`
- `Lead_Status`

## Outcome

- BookedAI is no longer blocked on missing Zoho CRM credentials
- The current lead and contact sync lane now has a real external CRM target
- The next operator step, if desired, is to exercise an actual lead/contact write and confirm sync status moves to `synced` instead of only validating metadata connectivity
