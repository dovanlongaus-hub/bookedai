# BookedAI doc sync - docs/development/future-swim-production-activation-pack.md

- Timestamp: 2026-04-21T12:50:53.042219+00:00
- Source: repo-doc-sync
- Category: documentation
- Status: synced

## Summary

Synchronized `docs/development/future-swim-production-activation-pack.md` from the BookedAI repository into the Notion workspace. Preview: # Future Swim Production Activation Pack Date: `2026-04-20` Document status: `active launch activation pack` ## Purpose

## Details

Source path: docs/development/future-swim-production-activation-pack.md
Synchronized at: 2026-04-21T12:50:52.813127+00:00

Repository document content:

# Future Swim Production Activation Pack

Date: `2026-04-20`

Document status: `active launch activation pack`

## Purpose

This document is the fill-in-ready activation pack for moving Future Swim from code-ready state to live production activation.

It groups the production details that usually get scattered across env files, DNS tasks, CRM setup notes, and launch-day smoke steps.

Use with:

- `docs/development/future-swim-launch-runbook.md`
- `docs/development/future-swim-content-copy-approval-checklist.md`

## 1. Launch owner matrix

Fill before production work starts:

| Area | Owner | Status | Notes |
|---|---|---|---|
| DNS | `TBD` | `pending` | controls `bookedai.au` zone |
| SSL and cert | `TBD` | `pending` | cert issuance and verification |
| Production deploy | `TBD` | `pending` | shell access to production host |
| Future Swim content approval | `TBD` | `pending` | homepage and location copy |
| SMTP and email | `TBD` | `pending` | sender identity and app password |
| Zoho CRM | `TBD` | `pending` | client credentials and sync validation |
| Launch smoke verification | `TBD` | `pending` | post-deploy checks |

## 2. Production host and route values

Required host values:

- public tenant host: `futureswim.bookedai.au`
- shared API host: `api.bookedai.au`
- tenant ref: `future-swim`

Current code-aligned routing expectation:

- frontend should serve `futureswim.html` for `futureswim.bookedai.au`
- nginx should proxy `/api/` requests on the tenant host to backend
- backend should scope assistant flows with `tenant_ref = future-swim`

## 3. Environment values to verify

### 3.1 Root app env

Verify these values in `.env` before deploy:

| Key | Expected or example value | Status |
|---|---|---|
| `PUBLIC_APP_URL` | `https://bookedai.au` | `verify` |
| `PUBLIC_API_URL` | `https://api.bookedai.au` | `verify` |
| `CORS_ALLOW_ORIGINS` | must include `https://futureswim.bookedai.au` | `verify` |
| `VITE_API_BASE_URL` | `https://api.bookedai.au/api` | `verify` |
| `BOOKING_BUSINESS_EMAIL` | operator-approved address | `fill` |

### 3.2 Email activation values

Fill or verify:

| Key | Needed for Future Swim live email | Status |
|---|---|---|
| `EMAIL_SMTP_HOST` | SMTP host | `fill` |
| `EMAIL_SMTP_PORT` | SMTP port | `fill` |
| `EMAIL_SMTP_USERNAME` | sender mailbox | `fill` |
| `EMAIL_SMTP_PASSWORD` | app password or secret | `fill` |
| `EMAIL_SMTP_FROM` | sender address | `fill` |
| `EMAIL_IMAP_HOST` | inbox host if used | `optional` |
| `EMAIL_IMAP_USERNAME` | mailbox user | `optional` |
| `EMAIL_IMAP_PASSWORD` | mailbox secret | `optional` |

### 3.3 Zoho activation values

Fill or verify if Zoho launch is in scope:

| Key | Needed for Future Swim live Zoho integration | Status |
|---|---|---|
| `ZOHO_ACCOUNTS_BASE_URL` | base auth URL | `verify` |
| `ZOHO_BOOKINGS_API_BASE_URL` | bookings API URL | `verify` |
| `ZOHO_BOOKINGS_CLIENT_ID` | client id | `fill` |
| `ZOHO_BOOKINGS_CLIENT_SECRET` | client secret | `fill` |
| `ZOHO_BOOKINGS_ACCESS_TOKEN` | access token | `fill` |
| `ZOHO_BOOKINGS_REFRESH_TOKEN` | refresh token | `fill` |

## 4. DNS activation checklist

Required DNS record:

- `futureswim.bookedai.au`

Checklist:

- record exists in Cloudflare
- record points to the production server
- proxy mode is intentional
- DNS propagation confirmed

Suggested command path:

```bash
bash scripts/update_cloudflare_dns_records.sh
```

Or create the single record manually if operating with tighter control.

## 5. Certificate activation checklist

Before marking the host live:

- confirm DNS resolves publicly
- confirm `scripts/deploy_production.sh` includes `DOMAIN_FUTURESWIM`
- confirm cert issuance includes `futureswim.bookedai.au`
- confirm nginx reload succeeds after deploy

Post-deploy verification:

```bash
openssl s_client -connect futureswim.bookedai.au:443 -servername futureswim.bookedai.au </dev/null 2>/dev/null | openssl x509 -noout -text | grep -E "DNS:futureswim.bookedai.au"
```

## 6. Deploy checklist

Before deploy:

- latest code is on the intended branch or server workspace
- `.env` is updated
- `supabase/.env` is consistent
- production server has the new code and scripts

Deploy command:

```bash
sudo bash scripts/deploy_production.sh
```

Expected result:

- cert check passes
- docker services rebuild or restart successfully
- proxy picks up the new host

## 7. Zoho mapping checklist

If enabling Zoho for Future Swim:

- map tenant `future-swim` to the intended Zoho account or pipeline
- define which events sync:
  - lead captured
  - booking intent captured
  - follow-up required
- define retry owner
- define failure visibility path inside BookedAI admin or reliability view

Required truth rule:

- BookedAI remains the primary workflow surface
- Zoho is additive and must not silently replace BookedAI record truth

## 8. Email activation checklist

Before enabling automated replies:

- sender address approved
- SMTP credentials tested
- one manual send succeeds
- from-address is correct
- reply-to posture is correct
- email copy has passed approval checklist

Suggested smoke:

- submit one Future Swim enquiry with a real test inbox
- trigger one lifecycle email
- confirm receipt
- confirm no misleading production language

## 9. Launch smoke checklist

Run after deploy:

### 9.1 Public host smoke

- open `https://futureswim.bookedai.au/`
- verify Future Swim hero loads
- verify section styling is the Future Swim theme
- verify no console-breaking 404s on core assets

### 9.2 Assistant smoke

- run one suburb and age query
- confirm results stay inside Future Swim
- confirm no external providers are shown

### 9.3 Lead and booking smoke

- submit one enquiry
- verify lead capture
- verify booking intent capture
- verify selected centre or service matches Future Swim data

### 9.4 Email and CRM smoke

- if email is live, verify one delivery
- if Zoho is live, verify one sync record or queued sync artifact
- if either is not live, verify the system surfaces a truthful pending state

## 10. Hold conditions

Do not mark Future Swim live if:

- CORS does not include the tenant host
- DNS is missing or wrong
- cert does not include the host
- assistant returns external providers
- email secrets are missing but the UI claims email automation is live
- Zoho secrets are missing but the project is described as fully integrated

## 11. Completion record

Fill after activation:

| Item | Result |
|---|---|
| DNS active | `2026-04-21: configured on Cloudflare for futureswim.bookedai.au -> 34.151.154.204 (proxied=true)` |
| cert active | `2026-04-21: host resolves with TLS and certificate SAN covers *.bookedai.au and bookedai.au` |
| deploy completed | `2026-04-21: production web and proxy were rebuilt against the active bookedai compose project; https://futureswim.bookedai.au/ now returns HTTP 200 and serves the Future Swim runtime` |
| assistant smoke passed | `pending deploy` |
| lead capture smoke passed | `pending deploy` |
| booking intent smoke passed | `pending deploy` |
| email smoke passed or pending truth confirmed | `2026-04-21: SMTP login verified successfully for futureswim@bookedai.au` |
| Zoho smoke passed or pending truth confirmed | `pending: Future Swim now has a seeded zoho_crm integration blueprint, but production OAuth client, refresh token, and verified custom field API names are still required before provider status should move from paused to connected` |
| implementation progress updated | `pending` |

## 12. Execution notes from `2026-04-21`

Observed during this activation pass:

- `.env` was updated to use `futureswim@bookedai.au` as `BOOKING_BUSINESS_EMAIL`, SMTP sender, and IMAP user
- local runtime env was updated to include `https://futureswim.bookedai.au` in `CORS_ALLOW_ORIGINS`
- local Cloudflare DNS defaults were updated to include the Future Swim host
- Cloudflare DNS record creation succeeded through `scripts/configure_cloudflare_dns.sh`
- post-DNS resolution succeeded and the host now resolves publicly
- TLS handshake succeeded and the wildcard certificate covers the host
- a clean deploy worktree was used to rebuild and promote the minimal Future Swim `web` and `proxy` changes into the active `bookedai` compose project without dragging unrelated dirty workspace changes into production
- post-deploy verification confirmed `https://futureswim.bookedai.au/` returns `HTTP 200`, the host serves the Future Swim HTML shell, and `https://futureswim.bookedai.au/api/health` returns `{"status":"ok","service":"backend"}`
