# BookedAI doc sync - docs/development/tenant-implementation-requirements-framework.md

- Timestamp: 2026-04-21T12:51:43.979934+00:00
- Source: repo-doc-sync
- Category: documentation
- Status: synced

## Summary

Synchronized `docs/development/tenant-implementation-requirements-framework.md` from the BookedAI repository into the Notion workspace. Preview: # BookedAI Tenant Implementation Requirements Framework Date: `2026-04-20` Document status: `active reusable tenant delivery baseline` ## 1. Purpose

## Details

Source path: docs/development/tenant-implementation-requirements-framework.md
Synchronized at: 2026-04-21T12:51:43.826306+00:00

Repository document content:

# BookedAI Tenant Implementation Requirements Framework

Date: `2026-04-20`

Document status: `active reusable tenant delivery baseline`

## 1. Purpose

This document records the standard implementation requirements for turning a tenant brief into a BookedAI-powered tenant runtime.

It is intended to be reused for:

- new tenant onboarding
- tenant-specific public website refactors
- BookedAI receptionist or sales-assistant rollouts
- tenant-scoped search and booking policy
- CRM and lifecycle integration planning
- deploy, DNS, and host activation planning

This document should be inherited by every future tenant implementation unless a tenant-specific exception is explicitly approved.

## 2. Inheritance rule

Every tenant implementation should inherit the same BookedAI platform spine:

1. tenant identity
2. tenant-scoped catalog
3. tenant-safe search and recommendation
4. lead capture
5. booking intent capture
6. lifecycle messaging
7. CRM sync and retry posture
8. tenant workspace visibility
9. portal and support-safe follow-up
10. deployable host and routing activation

Tenant work should customize the presentation and business rules, but it should not fork the platform model without a documented reason.

## 3. Core implementation principle

BookedAI should treat every tenant as:

- a branded customer-facing experience
- a tenant-scoped service catalog
- a tenant-scoped assistant runtime
- a tenant-scoped lead and booking workflow
- a tenant-scoped lifecycle and CRM synchronization flow
- a tenant-scoped reporting and operator support surface

The public website may look different by tenant, but the underlying platform contracts should stay consistent wherever possible.

## 4. Required requirement groups

### 4.1 Tenant business definition

Every tenant brief must define:

- tenant name
- tenant slug
- industry
- geography
- target customer segment
- primary service categories
- approved channels
- approved booking boundaries
- approved escalation boundaries

### 4.2 Brand and website surface

Every tenant implementation must define:

- target domain or subdomain
- homepage purpose
- visual direction
- copy direction
- target trust signals
- mobile behavior
- conversion goals
- required sections

Minimum public-surface outputs:

- branded landing page or multi-section homepage
- clear CTA hierarchy
- tenant-approved assistant entry point
- tenant-approved shortlist or service-discovery flow
- tenant-approved enquiry or booking capture flow

### 4.3 Tenant-scoped assistant behavior

Every tenant assistant spec must define:

- assistant role
- tone
- allowed topics
- disallowed topics
- allowed service sources
- search policy
- booking policy
- escalation policy
- follow-up policy

Default platform rule:

- when a tenant runtime is explicitly tenant-scoped, the assistant must not recommend or book services outside that tenant unless the tenant brief explicitly opts into a broader marketplace mode

### 4.4 Catalog and recommendation rules

Every tenant must define:

- catalog source of truth
- search-ready service records
- featured records
- publish-state rules
- price-truth posture
- venue and location truth
- booking path truth

Mandatory rule:

- do not use public-web fallback in tenant-strict runtimes unless the tenant contract explicitly permits mixed-supply discovery

### 4.5 Lead, booking, and lifecycle requirements

Every tenant must define:

- what counts as a lead
- what counts as a booking intent
- what contact methods are acceptable
- what fields are mandatory
- what booking status language is safe
- what follow-up messages should be sent
- what human-handoff paths exist

BookedAI baseline outputs:

- lead capture
- booking intent capture
- lifecycle email seam
- audit and outbox recording
- support-safe follow-up path

### 4.6 CRM and integration requirements

Every tenant integration plan must define:

- CRM provider
- sync ownership
- source of truth
- retry posture
- operator visibility
- failure-state messaging
- data ownership boundary between BookedAI and external systems

Default platform rule:

- BookedAI remains the orchestration and product-runtime layer
- external CRM sync is additive and should not replace BookedAI workflow truth unless explicitly approved

### 4.7 Communications requirements

Every tenant communication plan must define:

- outbound email provider
- inbound email handling expectations
- automated reply policy
- approved templates
- reply-to behavior
- SMS or WhatsApp use if applicable

Default rule:

- assistant-derived communication drafts may be generated, but provider configuration, delivery truth, and auditability must remain explicit

### 4.8 Deployment and host activation

Every tenant rollout must define:

- target host
- API host behavior
- frontend host mapping
- nginx mapping
- DNS record plan
- certificate plan
- environment variable requirements
- post-deploy validation checklist

## 5. Required delivery artifacts

Every production-grade tenant implementation should produce:

- tenant requirement document
- tenant use case or case-study document
- frontend runtime or routed surface
- backend tenant-scope policy if needed
- deploy and host configuration updates
- verification evidence

Optional but recommended:

- tenant copy deck
- tenant content inventory
- tenant onboarding checklist
- tenant support runbook

## 6. Tenant archetype model

BookedAI should classify tenants into one of these patterns before implementation:

### 6.1 Standalone branded website tenant

Use when:

- BookedAI hosts the public-facing tenant website
- BookedAI assistant is visible to end customers
- BookedAI owns most lead and booking orchestration

Typical examples:

- swim school
- tutoring centre
- salon
- clinic
- local membership business

### 6.2 Embedded-assistant tenant

Use when:

- the tenant keeps an existing website
- BookedAI is mainly a widget or workflow layer
- public design changes are limited

### 6.3 Backoffice or CRM-first tenant

Use when:

- public runtime is minimal
- the main value is lead qualification, CRM sync, or lifecycle automation

## 7. Standard capability map

| Capability | Required for all tenants | Optional by tenant |
|---|---|---|
| tenant-scoped catalog | yes | no |
| tenant-scoped assistant | yes | no |
| public web redesign | no | yes |
| lead capture | yes | no |
| booking intent capture | yes | no |
| lifecycle email | yes | no |
| CRM sync | no | yes |
| payments | no | yes |
| portal follow-up | recommended | yes |
| multi-location routing | no | yes |
| multi-language support | no | yes |

## 8. Acceptance criteria template

Every tenant implementation should define acceptance criteria across these layers:

### 8.1 Public experience

- host resolves correctly
- brand and visual system match tenant direction
- mobile layout is usable
- CTA flow is clear

### 8.2 Assistant safety

- assistant uses only approved tenant data sources
- assistant does not recommend disallowed external services
- assistant uses tenant-safe response framing

### 8.3 Workflow capture

- leads are recorded
- booking intents are recorded
- email follow-up can be triggered
- audit and outbox events are created where expected

### 8.4 Integration truth

- CRM sync status is visible when configured
- failures do not silently disappear
- BookedAI remains the operational source of truth unless otherwise approved

### 8.5 Deploy readiness

- DNS is configured
- nginx host is mapped
- certificate covers the host
- frontend build includes the tenant host artifact

## 9. Reuse rule for future tenants

Future tenant work should reuse the following first:

- tenant-scoping contracts
- v1 lead and booking contracts
- lifecycle email seam
- integration and outbox model
- host-routing pattern
- frontend app-router pattern
- shared verification checklist

Future tenant work should customize these second:

- brand system
- homepage structure
- copy
- trust signals
- conversion choreography
- vertical-specific assistant wording

## 10. Open implementation dependencies checklist

Before go-live, confirm:

- tenant seed or tenant profile exists
- catalog records are published or review-ready
- tenant assistant policy is documented
- CRM secrets are configured if needed
- SMTP or email provider config is configured if needed
- DNS points to the production server
- certificate includes the tenant host
- release verification has been run

## 11. Recommended companion document

This framework should always be paired with one tenant-specific use case document that:

- captures the actual tenant brief
- maps the tenant to this framework
- records tenant-specific exceptions
- records tenant-specific acceptance criteria
- explains what should be inherited by later tenant launches
