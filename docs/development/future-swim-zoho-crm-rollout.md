# Future Swim Zoho CRM Rollout

Date: `2026-04-21`

Document status: `active tenant-specific CRM rollout reference`

## Purpose

This document applies the shared Zoho CRM blueprint to the `future-swim` tenant.

It should be read together with:

- `docs/architecture/zoho-crm-tenant-integration-blueprint.md`
- `docs/development/future-swim-tenant-use-case.md`
- `docs/development/future-swim-launch-runbook.md`
- `docs/development/future-swim-production-activation-pack.md`

## 1. Business posture

Future Swim is a branded standalone tenant for a multi-location swim school serving parents of children aged `2-6`.

For this tenant:

- BookedAI runs the website, assistant, booking-request capture, lifecycle email context, and tenant-safe search
- Zoho CRM records and manages the commercial sales relationship
- Zoho must never widen the assistant beyond Future Swim catalog scope

## 2. Recommended Zoho module design

Use the following default modules:

- `Leads` for all new website enquiries
- `Contacts` for qualified parent records
- `Deals` for trial, callback, and enrolment opportunities
- `Tasks` for manual callbacks and schedule confirmation

Recommended `Lead Source`:

- `BookedAI Future Swim Website`

Recommended source detail:

- `futureswim.bookedai.au`

## 3. Future Swim pipeline design

Recommended deal pipeline:

- `Future Swim Enrolment`

Recommended stage order:

1. `New Enquiry`
2. `Qualified`
3. `Tour or Trial Requested`
4. `Trial Confirmed`
5. `Booking Follow-up`
6. `Enrolled Won`
7. `Lost`

These stages match the business reality better than generic SaaS sales stages.

## 4. Data mapping

### Lead fields

Store at minimum:

- parent full name
- email
- phone
- enquiry summary
- preferred contact method
- source and attribution
- Future Swim preferred location
- child age or age band

### Deal or custom fields

Attach or map:

- selected Future Swim location
- selected service or catalog row
- child confidence level
- special support or medical note if supplied
- booking reference or booking-intent reference
- latest assistant summary

## 5. Write rules

### Lead capture

- create local BookedAI lead first
- record local CRM sync row
- upsert Zoho `Lead`

### Qualification

- if the parent is qualified and reachable, create or update Zoho `Contact`
- create or update Zoho `Deal`
- assign owner by location or swim-school ops rule

### Booking request

- booking requests stay operationally inside BookedAI
- Zoho `Deal` is updated with stage and notes
- no Zoho object should be treated as booking confirmation

### Email

- BookedAI remains the sender and lifecycle context owner
- Zoho may receive an activity or note reference to the email touch
- email delivery truth remains in BookedAI email records

## 6. Recommended routing and ownership

Preferred owner assignment policy:

- route by preferred location first
- fallback to a central Future Swim enrolment owner

Preferred follow-up task creation:

- create a Zoho `Task` when a parent requests callback
- create a Zoho `Task` when assistant cannot confirm schedule certainty
- create a Zoho `Task` when medical or special support review is needed

## 7. Safety rules

Do not let Zoho:

- drive website search results
- override BookedAI tenant scope
- become the source of booking confirmation
- become the only place where lead retry state is visible

## 8. Current BookedAI application state

The repo now applies this design to Future Swim by seeding a `zoho_crm` connection blueprint in `integration_connections` for tenant `future-swim`.

Current provider posture:

- `provider`: `zoho_crm`
- `sync_mode`: `write_back`
- `status`: `paused`

This is intentional.

It means:

- the mapping and posture are now recorded in the platform
- the tenant dashboard can show the CRM provider as a real connection target
- live Zoho writes should remain paused until OAuth client, refresh token, module API names, and custom fields are confirmed

## 9. Go-live requirements for Future Swim Zoho

Before changing the provider from `paused` to `connected`, confirm:

- Zoho CRM org owner is assigned
- Zoho region and accounts domain are confirmed
- server-based client is created
- refresh token is obtained
- lead, contact, deal, and task module API names are verified
- Future Swim custom field API names are verified
- one end-to-end enquiry sync passes without manual field correction
- one callback task is created successfully
- one reconciliation drill is completed

## 10. Future Swim operator checklist

1. capture one lead from `futureswim.bookedai.au`
2. verify BookedAI lead, booking-intent, and audit rows
3. verify Zoho lead upsert result
4. qualify the lead and create the contact
5. verify a deal enters the `Future Swim Enrolment` pipeline
6. verify callback task creation for a manual follow-up scenario
7. verify BookedAI still remains authoritative for lifecycle email and booking state
