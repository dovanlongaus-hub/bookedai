# BookedAI doc sync - docs/development/future-swim-launch-runbook.md

- Timestamp: 2026-04-21T12:50:51.330001+00:00
- Source: repo-doc-sync
- Category: documentation
- Status: synced

## Summary

Synchronized `docs/development/future-swim-launch-runbook.md` from the BookedAI repository into the Notion workspace. Preview: # Future Swim Launch Runbook Date: `2026-04-20` Document status: `active tenant launch runbook` ## Purpose

## Details

Source path: docs/development/future-swim-launch-runbook.md
Synchronized at: 2026-04-21T12:50:51.165460+00:00

Repository document content:

# Future Swim Launch Runbook

Date: `2026-04-20`

Document status: `active tenant launch runbook`

## Purpose

This runbook moves Future Swim from code-ready implementation into production-ready launch preparation.

It is narrower than the general tenant onboarding checklist:

- it focuses on `future-swim`
- it assumes `futureswim.bookedai.au` is the target public host
- it assumes the new branded runtime already exists in code

Primary references:

- `docs/development/future-swim-tenant-use-case.md`
- `docs/development/future-swim-zoho-crm-rollout.md`
- `docs/development/tenant-onboarding-operations-checklist.md`
- `docs/development/release-gate-checklist.md`

## 1. Launch scope

This launch covers:

- Future Swim branded public runtime
- tenant-strict BookedAI receptionist flow
- tenant-only search and recommendation behavior
- lead capture
- booking intent capture
- lifecycle email seam
- host activation on `futureswim.bookedai.au`

This launch does not by itself guarantee:

- real-time class availability integration
- fully automated Zoho production sync
- fully approved content or imagery from Future Swim stakeholders

## 2. Current code-aligned baseline

Already present in repo:

- `frontend/src/apps/public/FutureSwimApp.tsx`
- app-router host recognition for `futureswim.bookedai.au`
- frontend hosted output generation for `futureswim.html`
- nginx mapping for `futureswim.bookedai.au`
- deploy script and DNS script support for the new host
- backend `tenant_ref` support for v1 flows
- public-web fallback disabled for tenant-scoped search in tenant-strict mode

## 3. Preconditions

Before launch work starts, confirm:

- `future-swim` tenant exists in the database
- Future Swim catalog rows are present and published
- target production server is the correct one
- DNS authority is available
- certificate issuance path is available
- SMTP or email provider owner is assigned
- Zoho CRM owner is assigned if CRM activation is in scope

Hold if:

- tenant data is missing
- the domain cannot be controlled
- no owner exists for email or CRM credentials

## 4. Content and business approval

Before production cutover, confirm:

- homepage copy is acceptable
- location naming is correct
- location addresses are correct
- booking language is truthful
- support or follow-up contact language is approved
- any Future Swim-specific imagery or brand assets have been approved

Recommended sign-off items:

- brand and homepage copy
- assistant tone
- assistant allowed scope
- contact and support details

## 5. Catalog verification

Run these checks before host activation:

- verify seeded Future Swim locations exist
- verify each location has correct publish state
- verify display price posture is acceptable
- verify booking URLs are correct
- verify no archived or draft-only rows are unintentionally exposed

Minimum expected location set:

- Caringbah
- Kirrawee
- Leichhardt
- Miranda
- Rouse Hill
- St Peters

## 6. Assistant verification

On a staging or local preview environment, verify:

- queries for child age and suburb return Future Swim results only
- no competitor or external service appears
- no public-web fallback appears
- selected results create Future Swim lead or booking records only

Suggested smoke prompts:

- `I need a gentle class for my 3-year-old near Miranda`
- `Which Future Swim centre suits a nervous 4-year-old?`
- `Find a weekend beginner lesson for my 5-year-old`
- `Book an assessment near Leichhardt`

Expected result:

- response stays inside Future Swim
- results are venue-relevant
- selected service is a Future Swim catalog row

## 7. Lead, booking, and email verification

Verify in staging or local production-like mode:

- lead capture succeeds
- booking intent succeeds
- booking note includes child age or parent note context
- lifecycle email seam is callable
- missing email provider config is truthfully surfaced if not yet configured

Minimum test payload:

- parent name
- email or phone
- child age
- selected Future Swim location
- optional note about confidence level

## 8. DNS and certificate activation

Create or verify DNS record for:

- `futureswim.bookedai.au`

Use the repo support path when applicable:

```bash
bash scripts/update_cloudflare_dns_records.sh
```

Or create the specific record if doing it manually.

After DNS points correctly:

- verify resolution from the target environment
- verify the certificate set includes `futureswim.bookedai.au`

Production deploy path:

```bash
sudo bash scripts/deploy_production.sh
```

Expected result:

- certificate covers the host
- nginx serves the new host
- `/api/` proxies correctly

## 9. Frontend and host verification

Before final cutover, verify:

- `npm run build` succeeds in `frontend/`
- `dist/futureswim.html` is generated
- nginx `spa_entry` maps the host correctly
- production host loads the Future Swim runtime instead of default public shell

Suggested checks:

- open `https://futureswim.bookedai.au/`
- confirm Future Swim hero and copy appear
- confirm receptionist CTA opens the tenant runtime behavior

## 10. CRM and communications activation

If Zoho is in launch scope, confirm:

- production credentials are available
- provider mapping is documented
- retry behavior is understood
- BookedAI remains the main operator-facing system of record
- the Future Swim pipeline stages are created in Zoho CRM
- Future Swim custom field API names are verified before enabling live write-back

If Zoho is not ready:

- mark CRM sync as pending
- keep BookedAI lead and booking truth authoritative

If email is in launch scope, confirm:

- provider credentials are configured
- sender domain or mailbox is verified
- reply-to behavior is correct
- one Future Swim enquiry email is successfully delivered

## 11. Launch-day smoke test

After deploy, run at minimum:

1. open `https://futureswim.bookedai.au/`
2. submit one assistant query
3. confirm results are Future Swim-only
4. submit one enquiry
5. confirm lead capture
6. confirm booking intent capture
7. confirm email behavior or truthful pending state
8. confirm no host or asset 404s

## 12. Hold conditions

Do not mark Future Swim live if any of these happen:

- host resolves to the wrong app shell
- certificate does not include the host
- assistant suggests non-Future Swim providers
- lead capture fails
- booking intent fails
- essential location content is wrong
- CRM or email is described as live when it is not actually configured

## 13. Rollback posture

Use the smallest rollback needed:

1. disable promotion or routing to the new host first
2. preserve backend tenant-scoping safety logic
3. keep tenant data and audit trail intact
4. revert only the host exposure or tenant runtime if necessary

Do not rollback in a way that re-enables external fallback inside the Future Swim tenant runtime.

## 14. Launch closure

After successful launch:

- update `docs/development/implementation-progress.md`
- record whether Zoho is live or pending
- record whether email is live or pending
- record any approved Future Swim-specific follow-up work
- treat this runbook as the reference pattern for later swim-school tenant launches
