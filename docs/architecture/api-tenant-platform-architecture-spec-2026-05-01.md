# BookedAI API And Tenant Platform Architecture Spec

Date: `2026-05-01`

Status: `active pre-coding architecture spec`

## Purpose

This document turns the new scale and partner-platform requirement into a managed architecture baseline.

It exists to make sure BookedAI can:

- scale toward `1,000+` and later `1,000,000+` tenants
- onboard tenants and partners quickly
- keep tenant data, APIs, widgets, and webhooks isolated
- use AI to ingest tenant data from web/text/files into tenant-owned datasets
- monetize clearly through setup fee, subscription, and commission on booked revenue
- stay simple at the start while still being professional and scalable

## 1. Product and business-model rule

BookedAI should not optimize for architectural elegance ahead of revenue.

The architecture should first help BookedAI:

- onboard paying tenants quickly
- charge setup fees reliably
- charge subscription fees reliably
- measure bookings that generate commission
- calculate BookedAI revenue clearly
- help operators manage booked revenue and BookedAI revenue with low friction

The first platform-management layer should therefore be:

- simple
- professional
- easy to operate
- revenue-aware
- tenant-safe
- expandable later without rewriting the commercial model

## 2. Guiding architecture principles

1. `Revenue before complexity`
2. `Simple to complex rollout`
3. `Tenant isolation before partner scale`
4. `Versioned APIs before broad distribution`
5. `Installability before customization`
6. `Shared portal before dedicated portal sprawl`
7. `Simple operator workflow before advanced admin complexity`
8. `BookedAI revenue tracking before secondary analytics depth`

## 3. Required commercial model support

Every tenant should be manageable through three primary commercial lanes:

- setup fee
- recurring subscription
- per-booking commission

The system should support:

- tenant commercial profile
- plan/package assignment
- setup fee status
- subscription status
- commission policy
- booking-linked commission events
- receivable posture for BookedAI charges
- payout and reconciliation visibility where relevant later

The first release of this management layer does not need deep enterprise finance complexity.

It must still be strong enough to answer:

- which tenants have paid setup
- which tenants are active on subscription
- which bookings generated commission
- how much revenue BookedAI earned
- what revenue is pending, due, unpaid, disputed, or recoverable

## 4. Architecture scope

The platform baseline should now include these major capability zones:

- tenant identity and tenant commercial profile
- API auth and tenant scoping
- widget installation and partner onboarding
- tenant ingestion and catalog creation
- booking and lifecycle orchestration
- customer portal truth
- tenant/admin revenue management
- webhook isolation and event delivery
- audit, evidence, and reporting

## 5. Required API families

### 5.1 Public discovery APIs
Purpose:
- search, suggestions, ranking, shortlist, result detail

Requirements:
- safe public access posture
- rate-aware behavior
- tenant-aware result eligibility
- audit/event emission for important search actions

### 5.2 Tenant ingestion and catalog APIs
Purpose:
- create and update tenant-specific services, products, locations, rules, and metadata

Requirements:
- strong tenant scoping
- AI-assisted ingestion from web/text/files/forms
- replayable ingestion jobs
- evidence and review posture for extracted data

### 5.3 Booking and lifecycle APIs
Purpose:
- booking draft, final confirm, create request, create booking, payment posture, support mutation, follow-up signals

Requirements:
- final-confirmation contract
- idempotent mutation handling
- booking evidence trail
- truthful status vocabulary

### 5.4 Portal APIs
Purpose:
- booking truth, documents, payment posture, support actions, reopen flows

Requirements:
- customer-safe verification
- shared portal default
- consistent truth semantics across shared and dedicated portal modes

### 5.5 Partner install and widget APIs
Purpose:
- issue install credentials, widget configs, allowed domains, themes, tenant binding, callbacks

Requirements:
- minimal setup steps
- clear install verification flow
- safe fallback/degraded behavior
- tenant-specific secrets and revocation model

### 5.6 Webhook APIs
Purpose:
- inbound provider callbacks and outbound tenant/partner event subscriptions

Requirements:
- per-tenant secret/signature model
- idempotency and replay protection
- retry queueing and event logs
- per-tenant delivery history

### 5.7 Tenant/admin commercial control APIs
Purpose:
- tenant commercial profile, package status, setup fee, subscription, commission policy, revenue summaries, receivables

Requirements:
- simple but strong operator workflows
- commercial truth visible without finance-system complexity
- auditability for manual corrections and overrides

### 5.8 Analytics and revenue-proof APIs
Purpose:
- booked revenue, BookedAI revenue, commission events, funnel posture, recovery posture

Requirements:
- tenant-safe aggregation
- clear distinction between tenant revenue and BookedAI platform revenue
- operator-readable definitions

## 6. Tenant model

Every tenant should have a platform record that includes:

- tenant identity
- business profile
- commercial plan
- setup fee status
- subscription status
- commission policy
- widget/install settings
- API credentials
- webhook subscriptions/secrets
- ingestion sources
- portal mode: shared default or dedicated exception
- lifecycle/revenue reporting posture

Tenant isolation should apply to:

- data storage boundaries
- API auth resolution
- widget configuration
- search eligibility
- booking records
- commission calculations
- webhook delivery
- audit logs and evidence

## 7. AI-assisted ingestion model

BookedAI should support a simple but scalable ingestion path:

1. connect source
2. fetch or receive input
3. extract candidate entities with AI
4. normalize into structured tenant data
5. review where confidence is weak
6. publish into tenant catalog/search corpus
7. connect published data to booking and portal flows

### Supported source classes
- website pages
- pasted text
- structured operator input
- uploaded files and documents
- future feed/API imports

### Output goals
- tenant-owned service database
- tenant-owned product or offering database where relevant
- tenant-specific locations, pricing, descriptions, FAQs, rules, and booking metadata
- clean search corpus for ranking and compare flows

## 8. Widget and installability model

The first installability layer should support:

- one script/drop-in widget
- embeddable search widget
- embeddable booking entry widget
- simple tenant branding options
- domain allowlist
- secret/key issuance
- install verification
- basic callback and webhook setup

Install steps should be intentionally short.

A normal partner should be able to:

1. create tenant or connect existing tenant
2. receive keys/config
3. embed widget or call API
4. verify domain/install
5. test live search/booking flow
6. receive webhook events independently

## 9. Portal strategy

### Default mode
- shared `portal.bookedai.au`

Why:
- faster rollout
- lower complexity
- consistent truth layer
- easier support and lifecycle continuity

### Enterprise exception mode
- dedicated tenant portal only when justified by business size, branding, procurement, or operational requirements

Constraint:
- shared and dedicated modes must use the same truth contracts for booking, payment, documents, support, and auditability

## 10. Revenue-management baseline

The first management layer should be simple but professionally useful.

It should show:

- tenant count and active paid tenants
- setup fee outstanding vs paid
- subscription active vs overdue vs cancelled
- bookings that triggered commission
- commission pending vs recognized
- tenant revenue vs BookedAI revenue
- top at-risk payment or commission items

The system should avoid overbuilding finance workflows early.

It should instead focus on the minimum professional operating truth needed to:

- bill correctly
- collect correctly
- track correctly
- explain revenue clearly
- scale sales and onboarding with confidence

## 10A. Delivery-order rule

Implementation should move in this order:

1. tenant onboarding and commercial activation
2. setup fee and subscription truth
3. booking-linked commission truth
4. BookedAI revenue and cashflow visibility
5. basic operator action queues for due, overdue, pending, unpaid, and recoverable items
6. partner install and repeatable external adoption
7. broader automation, deeper vertical depth, and enterprise exceptions later

This spec explicitly rejects the pattern of building sophisticated complexity before the platform can run and collect money well.

## 11. First operator-management scope

The initial management system should prioritize:

- tenant commercial setup
- setup fee tracking
- subscription tracking
- booking-linked commission visibility
- revenue summary by tenant
- overdue or action-needed queue
- basic manual adjustment and audit note support

It does not need at first:

- full ERP depth
- advanced accounting suite behavior
- complex multi-ledger finance abstractions
- highly customized enterprise billing engines

## 12. Go-forward roadmap meaning

This architecture spec changes roadmap interpretation:

- early work should prioritize running and collecting money, not broad surface complexity
- tenant management should be simple but commercially complete enough to operate the business professionally
- revenue management for BookedAI itself is a product requirement, not only an internal spreadsheet concern
- scale-readiness should come from strong boundaries and contracts, not from premature system fragmentation
- delivery sequencing should explicitly move from simple high-effect business controls toward more complex platform breadth over time

## 13. Immediate pre-coding consequences

Before broad platform implementation, the next management/design slices should explicitly define:

- API family contracts
- tenant resolution and auth model
- widget install contract
- ingestion job and review contract
- shared versus dedicated portal contract
- tenant commercial model contract
- commission event model
- operator revenue dashboard minimum viable truth

## Executive summary

BookedAI should now be built as:

- a revenue-first AI booking and lifecycle platform
- with partner-ready APIs and widgets
- with tenant-isolated AI ingestion
- with shared portal by default
- with simple but professional revenue management for setup fee, subscription, and commission

The short rule is:

`Run, collect money, manage booked revenue and BookedAI revenue clearly first. Keep it simple, professional, and scalable.`
