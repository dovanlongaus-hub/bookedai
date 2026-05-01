# BookedAI Revenue-First Enterprise Requirements Refinement

Date: `2026-05-01`

Status: `active requirement refinement`

## Purpose

This document sharpens the BookedAI requirement baseline before implementation begins on the next backlog slices.

It interprets the project in the spirit of:

- `Google-quality booking discovery`
- `AI Revenue Engine execution`
- `full lifecycle customer journey`
- `enterprise SaaS UX and operator control`

This is not a replacement for `project.md` or the master PRD.

It is a refinement layer that makes the next implementation decisions stricter and more revenue-first.

## 1. Primary product mandate

BookedAI should not behave like a beautiful demo that stops being useful after search.

BookedAI should behave like a revenue-producing operating system for service businesses.

That means every major design and engineering decision should be judged by its effect on:

- enquiry capture
- intent clarity
- compare confidence
- booking conversion
- payment completion
- post-booking support confidence
- follow-up and retention
- operator visibility into revenue won, pending, lost, and recoverable

## 2. Google-booking requirement interpretation

When we say `Google-quality booking discovery`, the requirement is not to copy Google's visuals.

The requirement is to inherit the strongest user-value patterns:

- query entry should be instant and cognitively light
- suggestion quality should reduce typing and uncertainty
- ranking should feel trustworthy, not arbitrary
- maps, places, distance, and location relevance should feel native where location matters
- filters should refine, not overwhelm
- the customer should compare before committing
- details should be inspectable without losing context
- the next step should always be obvious

For BookedAI, this means:

- the first viewport should get a user into search fast
- result cards must make decision factors visible immediately
- location-sensitive results must not show weak mismatches as if they are equal candidates
- result detail, compare state, and booking state should not collapse into one confusing panel
- explicit book intent must remain stronger than accidental momentum

## 3. Revenue-engine requirement interpretation

The product should operationalize the full commercial chain, not just search and form capture.

Each workflow should help at least one of these jobs:

- capture demand
- convert demand into a booking or qualified request
- collect payment or make payment posture transparent
- reduce customer confusion after booking
- trigger follow-up or recovery when momentum drops
- help operators see and act on revenue risk

A feature should be deprioritized when it does not materially improve one of those jobs.

## 4. Full lifecycle customer journey requirement

The whole project should now be evaluated against this required journey:

1. discover
2. refine
3. compare
4. choose
5. final confirm
6. book or request
7. pay or understand payment posture
8. receive confirmation and reference
9. reopen booking in portal
10. ask for help, reschedule, or cancel safely
11. receive reminders and follow-up
12. rebook, upgrade, continue, or enter recovery flow
13. contribute to revenue proof, action queue, and retention intelligence

This means lifecycle quality is not optional polish.

It is the product.

## 5. Frontend requirements, customer surfaces

All customer surfaces should now be judged by these standards:

### Clarity
- the page should explain itself in seconds
- active state should have one dominant next action
- supporting information should help the decision, not fight it

### Trust
- visible price, location, timing, availability, and trust posture
- no fake certainty when the system is actually pending or queued
- no raw provider or backend noise leaked to the customer

### Flow quality
- compare first, then book
- preserve context when opening detail or returning from detail
- preserve confirmation state after booking, do not drop the user into ambiguity
- preserve the portal as the returning-customer truth layer

### Mobile-first behavior
- customer-critical actions must feel comfortable on mobile first
- no clipped dialogs, hidden actions, or accidental horizontal overflow
- no giant instruction walls before the customer can act

## 6. Frontend requirements, operator surfaces

Tenant and admin surfaces should now be judged by these standards:

### Scan speed
- the operator should quickly see what matters now
- KPI cards must map to action, not vanity
- statuses should expose risk and next action clearly

### Control and safety
- mutation actions need confirmation, auditability, and result posture
- failure or pending states should always explain what happened and what can be done next
- evidence and sync state should be inspectable without hunting through logs

### Enterprise information design
- dense information is acceptable if hierarchy is strong
- actions should sit near the states they affect
- retry, escalate, review, and follow-up posture must be explicit

## 7. Backend requirements

Backend work should now optimize for product truth, not just endpoint coverage.

Requirements to emphasize:

- state transitions must be readable and auditable
- idempotency is mandatory where external providers or retries are involved
- lifecycle actions should produce evidence, not invisible side effects
- booking, payment, support, CRM, calendar, and messaging should keep one coherent truth model
- tenant isolation must be preserved across every workflow boundary
- recoverable-revenue states should be first-class, not inferred ad hoc in isolated screens

## 7A. Scale, API, widget, and tenant-ingestion requirements

The backend and platform model should now also be shaped for future distribution scale.

### Scale posture
- current implementation may stay modular-monolith-first
- architecture must still prepare for future scale toward `1,000+` and eventually `1,000,000+` tenants
- avoid tight coupling that would block later API segmentation, queue isolation, or tenant-level scaling

### API posture
- APIs must be explicit, versioned, documented, and partner-usable
- API families should be clearly separated by responsibility: discovery, ingestion, booking, portal, widget/install, webhook, admin, analytics
- tenant scoping and auth posture must be unambiguous in every family
- rate, retry, idempotency, and audit posture should be designed intentionally, not left implicit

### Widget posture
- widget install should be simple enough for a normal partner or operator to adopt quickly
- widget configuration should support tenant identity, theme/branding, API key/secret posture, allowed domains, and webhook callbacks
- widget failures should degrade safely without breaking the host site

### AI ingestion posture
- BookedAI should support extracting tenant-specific service or product data from text, forms, and uploaded files
- the ingestion path should help normalize raw input into a tenant-owned database/search corpus
- ingestion should be tenant-isolated and independently replayable or refreshable per tenant

### Shared portal strategy
- default customer portal should remain the shared `portal.bookedai.au`
- dedicated tenant portal should be an optional enterprise path, not the baseline requirement for all tenants
- shared and dedicated portal modes must preserve the same truth semantics for booking, payment, support, and auditability

### Monetization-management posture
- platform requirements must directly support `setup fee + subscription + commission on booked revenue`
- early tenant/admin management should stay simple, professional, and commercially useful rather than trying to become a full finance suite
- operators must be able to see what BookedAI should bill, what was collected, what bookings generated commission, and what revenue is pending or at risk
- roadmap priority should prefer features that help BookedAI run, charge, collect, and manage revenue effectively before deeper optional complexity

## 8. Style and interaction direction

The design direction should be described as:

- big-tech clarity
- Google-like search confidence
- enterprise SaaS control
- premium but not ornamental
- fast, calm, and trustworthy

This means:

- fewer decorative blocks that do not help action
- stronger spacing, hierarchy, and typography
- clear status colors with restrained usage
- polished but compact control patterns
- strong empty/loading/error/success states
- consistent action language across web, portal, tenant, admin, Telegram, WhatsApp, and email

## 9. Requirements to add more strongly into the project baseline

The overall project should now carry these stronger requirement statements:

1. `Revenue first`: prioritize features that win, protect, or recover revenue
2. `Lifecycle complete`: discovery without post-booking truth is incomplete
3. `Search trust first`: ranking quality, location relevance, and compare confidence are product-critical
4. `Portal truth first`: the customer must have a durable home for status, payment, and support
5. `Operator proof first`: tenant and admin should see evidence, queue state, and retry posture clearly
6. `Enterprise UX discipline`: design quality includes safety, speed, hierarchy, readability, and recoverability
7. `No fake completion`: queued, pending, request-received, failed, synced, and manual-review states must be used honestly
8. `Revenue proof`: the system should make won, pending, lost, and recoverable revenue visible

## 10. Immediate requirement consequences before BL-1

Before implementation starts on the next coding slices, the project should now assume:

- final-choice confirmation is a top-tier cross-surface contract
- canonical status vocabulary is a top-tier cross-surface contract
- portal truth is not a secondary follow-up, it is part of core conversion quality
- tenant/admin evidence visibility is product-critical, not only ops polish
- Future Swim should lead the strictest operational truth requirements
- recoverable revenue and revenue proof should be treated as real product requirements, not future analytics extras

## Executive summary

BookedAI should now be managed as:

- `Google-quality search and booking discovery`
- plus `AI Revenue Engine execution`
- plus `full lifecycle customer journey`
- plus `enterprise-grade UX and operational truth`

And all future design, backend, and roadmap decisions should be filtered through one question:

`Does this help BookedAI capture, convert, support, recover, or prove revenue better?`
