# BookedAI doc sync - docs/development/tenant-onboarding-operations-checklist.md

- Timestamp: 2026-04-21T12:51:44.744139+00:00
- Source: repo-doc-sync
- Category: documentation
- Status: synced

## Summary

Synchronized `docs/development/tenant-onboarding-operations-checklist.md` from the BookedAI repository into the Notion workspace. Preview: # BookedAI Tenant Onboarding Operations Checklist Date: `2026-04-20` Document status: `active reusable onboarding checklist` ## Purpose

## Details

Source path: docs/development/tenant-onboarding-operations-checklist.md
Synchronized at: 2026-04-21T12:51:44.592677+00:00

Repository document content:

# BookedAI Tenant Onboarding Operations Checklist

Date: `2026-04-20`

Document status: `active reusable onboarding checklist`

## Purpose

This checklist is the operator-facing companion to the tenant requirements framework.

It converts tenant planning into a repeatable onboarding flow for future tenants that inherit the same BookedAI platform patterns.

Use this document when:

- onboarding a new tenant into BookedAI
- preparing a branded tenant runtime
- enabling tenant-scoped assistant behavior
- preparing CRM, email, and deploy activation
- validating go-live readiness

Primary requirement reference:

- `docs/development/tenant-implementation-requirements-framework.md`

Use-case companion rule:

- every tenant onboarding pass should also have one tenant-specific use case document

## 1. Intake and qualification

Before any build work starts, confirm:

- tenant legal or trading name
- preferred public brand name
- tenant slug
- industry and business model
- target geography
- primary service categories
- primary audience
- approved public domain or subdomain
- preferred launch date
- decision-makers and approvers

Required outputs:

- tenant use case document created
- target host agreed
- archetype identified:
  - standalone branded website tenant
  - embedded-assistant tenant
  - backoffice or CRM-first tenant

Hold if:

- the tenant does not yet have a clear service scope
- domain ownership is unclear
- the assistant booking boundary is not agreed

## 2. Public experience definition

Confirm:

- whether BookedAI is replacing the public site or augmenting it
- required homepage sections
- brand and copy direction
- trust signals required for the vertical
- mobile-first expectations
- primary CTA and secondary CTA
- whether multi-location routing is required

Required artifacts:

- tenant design or copy direction recorded
- assistant entry point defined
- shortlist or enquiry path defined

## 3. Tenant-scoped assistant rules

Define and record:

- assistant role
- assistant tone
- approved service sources
- whether external fallback is allowed
- disallowed recommendations
- escalation paths
- lead and booking capture rules

Default operational rule:

- tenant-branded runtimes should be treated as tenant-strict unless approved otherwise

Verify:

- `tenant_ref` or equivalent scope is planned
- search policy is documented
- fallback policy is documented

## 4. Catalog onboarding

Confirm catalog source of truth:

- website import
- manual upload
- PDF or brochure extraction
- spreadsheet import
- existing seeded tenant data

Before publish:

- required booking-critical fields exist
- venue names and locations are usable
- booking URL posture is truthful
- price truth is preserved
- featured records are identified
- publish-state workflow is clear

Minimum checks:

- imported rows land in `review` unless explicitly approved otherwise
- only search-ready and published rows are surfaced in public tenant flows
- archived rows are excluded

## 5. Tenant identity and workspace setup

Confirm:

- tenant row exists
- tenant settings exist
- initial operator account exists
- login mode is agreed:
  - Google
  - password
  - both
- ownership and role model are defined

Recommended initial outputs:

- one admin or operator account
- one billing contact
- one support contact

## 6. Lead, booking, and lifecycle setup

Confirm:

- what counts as a lead
- what counts as a booking intent
- required contact fields
- preferred communication channel
- confirmation or callback language
- manual-review vs automated-flow boundaries

Verify:

- lead capture works
- booking intent creation works
- audit and outbox behavior is visible
- lifecycle email seam is configured or clearly marked pending

## 7. CRM and communications setup

If CRM is required, confirm:

- provider name
- credentials owner
- sync direction
- failure handling
- retry ownership
- BookedAI vs CRM source-of-truth boundary

If email is required, confirm:

- SMTP or provider config
- sender identity
- reply-to rules
- automated response policy
- template approval path

Hold if:

- CRM sync is expected but no credentials owner is assigned
- email automation is expected but no sender configuration exists

## 8. Host, DNS, and deploy preparation

Confirm:

- target host
- nginx mapping
- frontend host artifact mapping
- API proxy behavior
- DNS record creation plan
- certificate coverage plan
- environment variable requirements

Required checks:

- deploy script updated when needed
- DNS script updated when needed
- cert domain list updated when needed

## 9. Pre-launch verification

Run and record:

- frontend build
- backend syntax or test verification where available
- tenant-scoped assistant smoke test
- lead capture smoke test
- booking intent smoke test
- email smoke test if configured
- host-routing check
- mobile visual check

For tenant-strict runtimes, specifically confirm:

- no public-web fallback appears
- no wrong-domain recommendations appear
- no external booking suggestions appear

## 10. Go-live decision

Promote when all are true:

- tenant use case document is complete
- catalog is ready
- assistant scope is correct
- host routing is correct
- lead and booking flows are working
- integrations are either live or truthfully marked pending
- documentation write-back is complete

Hold when any are true:

- public branding is incomplete
- catalog quality is not safe
- assistant leaks outside tenant scope
- lead capture is not recorded
- domain or cert setup is incomplete
- live dependencies are still unowned

## 11. Post-launch closure

After launch:

- update `docs/development/implementation-progress.md`
- update tenant-specific use case if reality changed
- record environment-specific dependencies that remain pending
- record any reusable lessons for later tenants

## 12. Reuse note

This checklist should be reused for later tenants in:

- swim schools
- tutoring businesses
- clinics
- salons
- local multi-location service brands

Only the tenant-specific use case, brand direction, and integration details should change. The BookedAI platform spine should remain consistent.
