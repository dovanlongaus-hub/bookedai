# BookedAI Sprint 13 Owner Execution Checklist

Date: `2026-04-17`

Document status: `active sprint checklist`

## Mission

Define and implement the tenant unified-auth foundation plus the first admin support views required to safely onboard and support tenant accounts.

## Technical backlog

Sprint 13 should now be treated as the `tenant auth and onboarding foundation` sprint.

Inherited public-surface truth from `2026-04-20` that Sprint 13 must preserve while touching tenant-entry or cross-surface messaging:

- `bookedai.au` is the compact acquisition and sales-deck surface, not the deeper live runtime
- homepage primary trial intent routes into `product.bookedai.au`
- user-facing package vocabulary is now `Freemium`, `Pro`, and `Pro Max`
- registration-only custom commercial language may use `Advance Customize`
- later Sprint 13 entry or support UX should not reintroduce `GPI Pro` or `Upgrade 1-3` wording on any public or tenant-facing surface

Must deliver:

- one canonical tenant sign-in entry on `tenant.bookedai.au`
- clear `create account` versus `sign in` UX and API contract direction
- first create-or-claim tenant flow contract
- onboarding status read model
- tenant session summary and capability model
- first-run business profile bootstrap fields

Should also deliver:

- signed-in redirect into the correct tenant slug workspace
- explicit tenant scope and session-state messaging
- audit trail for login, claim, and account-creation attempts
- admin drill-in visibility for tenant-auth support issues
- first-pass invite acceptance through the tenant claim flow
- first membership roster read model so later team controls have a stable base

## Owner checklist

## Product lead

- approve admin operational priorities
- approve issue taxonomy and drill-in priorities
- approve one-account tenant product rules across onboarding, data input, reporting, and billing

## Solution architect

- confirm admin IA aligns with domain and audit boundaries
- confirm support actions remain safe and controlled
- confirm auth, onboarding, and tenant-claim boundaries are safe before write expansion

## PM or product ops

- coordinate admin workflow scope and dependencies with support teams
- coordinate Sprint 13 dependency order across tenant auth, onboarding, and support drill-ins

## Frontend lead

- define the canonical tenant auth shell
- define create-account and sign-in flows
- define onboarding-progress and tenant-session UI states
- define admin drill-in workspace for tenant-auth support

## Backend lead

- expose onboarding and tenant-auth read models
- define create-or-claim API contracts
- support admin investigation and auth diagnostics needs

## QA or release owner

- define sign-in, create-account, tenant-claim, and admin-investigation QA scope
- define tenant-host routing and expired-session smoke checks
