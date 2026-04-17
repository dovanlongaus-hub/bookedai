# BookedAI Target Platform Architecture

## Purpose

This document captures the target architecture for BookedAI after the product has been redefined as a multi-channel AI revenue engine for service businesses.

The architecture must now support:

- demand capture across search, website, calls, email, follow-up, and payment moments
- booking conversion and revenue reporting
- missed revenue detection and recovery workflows
- source attribution and commission reporting
- public, tenant, admin, and embedded surfaces that all reflect one commercial truth

It remains intentionally:

- additive
- migration-safe
- production-first
- backward-compatible where practical

## Product architecture interpretation

BookedAI should now be treated as a platform with six business cores:

1. demand capture and attribution engine
2. lead qualification and booking engine
3. payment and revenue event engine
4. missed revenue and recovery engine
5. reporting and commission engine
6. tenant and admin operations platform

BookedAI is not only a chatbot, not only a booking widget, and not only a CRM sync layer.

## Current-state runtime baseline

Current confirmed runtime shape:

- frontend: React + TypeScript + Vite
- backend: FastAPI
- data runtime: Postgres on self-hosted Supabase
- orchestration: `n8n`
- edge: Nginx reverse proxy with subdomain routing
- current public and ops surfaces: public web, assistant, admin, pricing/demo flows

Current public and ops capabilities already present:

- public marketing website
- assistant-style booking and discovery flow
- demo request and pricing consultation flows
- admin interface
- Stripe checkout session creation
- calendar and mail integrations
- webhook intake and service import flows
- additive `/api/v1/*` contracts

## Architecture principles

The following rules are mandatory:

- revenue outcomes are a first-class domain, not a reporting afterthought
- AI is the mechanism, not the source of truth
- Supabase Postgres remains the transaction and domain truth layer
- `n8n` remains orchestration glue, not the core commercial brain
- every integration callback must be idempotent
- attribution and commission logic must be explainable and auditable
- payment events must reconcile against booking and lifecycle state
- missed revenue estimates must be derived from explicit rules, not vague AI claims
- public, tenant, and admin surfaces must read from shared domain models

## Strategic target direction

BookedAI should evolve toward a modular monolith with:

- domain-first backend modules
- adapter-based integrations
- shared revenue event models
- outbox and worker support
- tenant-aware persistence
- public growth surface optimized for premium conversion
- tenant revenue workspace
- internal admin and reconciliation tooling
- embedded channel surfaces

This should not become a full microservices estate unless scale or isolation later requires it.

## Target product surfaces

### 1. Public growth app

Responsibilities:

- premium landing pages
- SEO pages by industry, location, and campaign
- growth attribution capture
- demo booking
- revenue-engine storytelling
- embedded widget entry points

Target direction:

- current runtime remains Vite-based
- public growth surface should remain compatible with the existing repo while allowing a later move to a Next.js App Router public shell if SEO or authoring needs justify it

### 2. Tenant revenue workspace

Responsibilities:

- revenue dashboard
- bookings generated
- missed revenue tracker
- channel attribution
- payment status
- commission summary
- recovery workflow controls
- calendar and CRM visibility

### 3. Internal admin app

Responsibilities:

- tenant support and operations
- reconciliation
- workflow diagnostics
- attribution and commission issue handling
- rollout and feature-flag controls
- optimization tooling

### 4. Embedded and headless surfaces

Responsibilities:

- website widget
- call and SMS hooks
- email intake paths
- API and webhook access
- partner or headless integrations

## Core target domains

### 1. Demand capture domain

Should own:

- source capture
- campaign and entry metadata
- landing and widget attribution
- first-touch and latest-touch context
- demand-source normalization

Supported sources should include:

- search
- website
- call
- email
- chat
- follow-up
- referral
- re-engagement

### 2. Lead qualification domain

Should own:

- qualification questions
- captured intent
- service fit
- budget or booking fit where relevant
- readiness and next-step classification

### 3. Booking conversion domain

Should own:

- booking path selection
- appointment request or confirmation state
- availability and trust state
- booking lifecycle transitions

### 4. Revenue event domain

Should own:

- deposit paid
- booking confirmed
- payment status
- revenue recorded
- attributed revenue
- booking value
- average booking value calculations

### 5. Missed revenue domain

Should own:

- unanswered call events
- stalled enquiry rules
- abandoned lead rules
- incomplete payment rules
- lost-value estimate
- recovery-opportunity estimate

This domain must be rules-based and auditable.

### 6. Recovery workflow domain

Should own:

- missed call auto callback
- follow-up reminders
- quote reminders
- payment completion reminders
- re-engagement sequences

### 7. Attribution and commission domain

Should own:

- source attribution
- channel performance rollups
- commission basis rules
- commission due summaries
- payout or billing support views

### 8. Reporting and analytics domain

Should own:

- revenue dashboard aggregates
- conversion analytics by channel
- recovery performance
- ROI summary
- commercial reporting exports

## Key data architecture requirements

The target platform must support normalized entities for:

- tenant
- lead
- conversation
- enquiry
- booking intent
- booking
- payment event
- revenue event
- attribution touch
- missed revenue event
- recovery workflow run
- commission ledger entry

The architecture must support both:

- raw event capture
- normalized commercial read models

## Read models required

The platform should expose read models for:

- revenue generated this month
- total bookings
- average booking value
- top-performing channel
- search to booking conversion
- call to booking conversion
- email to booking conversion
- missed revenue estimate
- recovered opportunities
- payment completion status
- commission summary

## Integration requirements

### CRM and calendar integration

The platform must support:

- tenant-configured calendar integration
- CRM lifecycle sync
- appointment and follow-up propagation
- reconciliation-safe status tracking

### Payment integration

Stripe and related payment workflows must support:

- deposit payment events
- booking-linked payment state
- failed payment follow-up
- revenue recognition inputs
- commission calculation inputs

### Channel integration

The architecture must support ingestion or normalization for:

- website widget traffic
- call events
- chat or form events
- email enquiries
- follow-up automation triggers

## Public UX architecture requirements

The public product surface must be able to show:

- premium revenue-engine hero
- multi-channel demand capture story
- revenue visibility proof
- pricing model with setup fee plus commission
- dashboard-style widgets grounded in real product concepts

Mandatory public demo widgets:

- Revenue Generated card
- Missed Revenue card
- Search to Booking Conversion card
- Call to Booking Conversion card
- Email to Booking Conversion card
- Stripe Payment Success widget
- Booking Confirmed activity card
- Channel Attribution widget
- Commission Summary widget

## Tenant UX architecture requirements

The tenant product must prioritize:

- revenue visibility
- recovery visibility
- channel performance visibility
- booking and payment state clarity
- mobile-usable action flows

## Internal admin architecture requirements

The internal admin surface must support:

- tenant-level revenue issue investigation
- payment and booking reconciliation
- commission support views
- attribution support views
- workflow and integration diagnostics
- optimization controls

## Delivery implications

The new positioning creates these architecture implications:

1. revenue-generated and missed-revenue models must be elevated into first-class domains
2. payment events must be linked cleanly to booking and reporting read models
3. attribution must exist as a cross-channel layer, not one-off marketing metadata
4. pricing and commission support require auditable ledger-style summaries
5. public storytelling and tenant/admin product models must stay aligned on the same commercial truth

## Migration and rollout notes

The current live system should evolve incrementally:

- preserve public and admin continuity
- add revenue and attribution models additively
- dual-write before read cutover where needed
- ship public positioning upgrades without inventing unsupported backend claims
- promote revenue dashboard and commission surfaces only when upstream data truth is reliable enough
