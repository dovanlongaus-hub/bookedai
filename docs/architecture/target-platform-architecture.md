# BookedAI Target Platform Architecture

## Purpose

This document captures the long-term architecture direction for BookedAI.au based on the current production repository state.

It is intentionally:

- additive
- backward-compatible
- migration-safe
- production-first
- mobile-ready without overbuilding native mobile too early

## Current-state summary

The current production repository is not a greenfield Next.js system.

Current confirmed runtime shape:

- frontend: React + TypeScript + Vite
- backend: FastAPI
- data runtime: Postgres on the self-hosted Supabase stack
- automation: n8n
- edge: Nginx reverse proxy with bookedai.au subdomain routing
- current production services: web, backend, n8n, Supabase, Hermes, upload host

Current public and ops capabilities already present:

- public marketing website
- assistant-style booking and discovery flow
- pricing consultation flow
- demo request flow
- admin interface
- Stripe checkout session creation
- Zoho Calendar event creation
- Zoho Mail SMTP and IMAP support
- Tawk webhook intake
- service catalog import from websites
- partner profile management

## Core business interpretation

BookedAI should be treated as a platform with four business cores:

1. AI matching engine
2. booking reliability engine
3. revenue lifecycle platform
4. embedded and standalone SME operations platform

BookedAI is not only a chatbot, not only a CRM sync layer, and not only a booking form.

## Design principles

The following rules are mandatory:

- AI is never the source of truth
- production stability is more important than architectural purity
- public SEO routes should not be broken during migration
- n8n is orchestration glue, not the core backend
- Supabase Postgres is the transaction and data layer
- integrations and webhooks must be idempotent
- payment flow must depend on booking confidence and verification state
- mobile-ready is mandatory
- native mobile should not be overbuilt until real usage justifies it

## Current-state constraints to preserve

The following current production assets should be preserved in the near term:

- bookedai.au public route and SEO surface
- admin.bookedai.au access pattern
- api.bookedai.au API entrypoint
- existing Tawk webhook path
- existing Stripe checkout initiation path
- existing Zoho Calendar and email automations
- Docker Compose deployment pathway
- Nginx routing contract

## Strategic target direction

BookedAI should evolve toward a modular monolith with:

- clear domain modules
- adapter-based integrations
- API-first business logic
- worker and outbox support
- tenant-aware data boundaries
- mobile-usable product surfaces
- phased separation of public growth, tenant, admin, and embedded surfaces

This should not become a full microservices estate unless scale, ownership, or runtime isolation later requires it.

## Target product surfaces

### 1. Public Growth App

Responsibilities:

- SEO pages
- local and service discovery pages
- comparison pages
- FAQ and glossary pages
- landing pages by industry and location
- chat entry
- lead capture
- attribution and conversion tracking
- page-to-lead-to-revenue tracking

### 2. Tenant App

Responsibilities:

- leads
- conversations
- bookings
- availability and capacity
- knowledge base
- billing and subscriptions
- integrations
- team and roles
- monthly stats and reports

This surface must become mobile-usable and later PWA-ready.

### 3. Internal Admin App

Responsibilities:

- tenant operations
- support tools
- payment and sync issue handling
- override tools
- content and catalog curation
- integration monitoring

This surface may be mobile-tolerant rather than mobile-perfect in earlier phases.

### 4. Embedded and Headless Surfaces

Responsibilities:

- web widget
- channel integrations
- plugin surfaces
- API and webhook consumption

## Core target domains

### Growth and SEO domain

Should track:

- landing page source
- keyword or campaign attribution
- lead creation
- CRM progression
- revenue outcome

### Matching domain

Should own:

- requirement parsing
- location and budget parsing
- candidate retrieval
- geo prioritization
- ranking
- recommendation explanation

### Availability and booking trust domain

Should own:

- availability source type
- freshness
- verification state
- slot or capacity truth where BookedAI is the system of record
- provider confirmation path where BookedAI is not the system of record
- confidence scoring
- waitlist and limited availability states

### Booking path resolver

Should decide which next action is correct:

- book now
- request booking
- request callback
- book on partner site
- call provider
- join waitlist

### Payment orchestration domain

Should support:

- Stripe card checkout
- bank transfer or QR flows
- partner payment links
- pay-after-confirmation
- deposit handling

Payment flow must not assume confirmed availability when trust is low.

### CRM lifecycle domain

Zoho CRM should become the commercial relationship truth for:

- leads
- contacts
- accounts
- deals
- tasks
- owners
- sales stages

BookedAI should remain the operational truth for:

- conversations
- matching outcomes
- booking intents
- availability checks
- billing events
- usage metrics

### Email communications domain

Email must be treated as first-class and support:

- templates
- send logs
- delivery state
- communication history
- follow-up
- billing reminders
- monthly updates

### Subscription and billing domain

Should support:

- subscriptions
- billing periods
- invoices
- reminders
- overdue logic
- thank-you messaging
- monthly booking stats
- monthly performance summaries

### Integration hub

Should support:

- adapter pattern
- mapping layer
- sync jobs
- retries
- idempotency
- reconciliation
- conflict visibility

### Channel adapter domain

Should keep a channel-agnostic conversation model across:

- web chat
- WhatsApp
- Tawk
- future mobile app
- future email-assisted flows

## AI and model strategy direction

BookedAI should support multi-provider routing with distinct layers:

- low-cost parsing and extraction
- grounded retrieval and search
- recommendation synthesis
- provider fallback
- deterministic fallback
- human confirmation fallback

High-level role guidance:

- OpenAI: strong default for structured extraction, tool use, synthesis, and production continuity
- Gemini: useful secondary option where multimodal or Google ecosystem alignment matters
- Claude: strong synthesis and policy-sensitive writing, but should not be the only customer-facing dependency
- DeepSeek: cost-attractive secondary or experimental extraction and synthesis option when quality is validated
- Qwen or Alibaba Model Studio: strong candidate for lower-cost fallback and regional resilience if structured outputs are reliable enough in practice
- Grok or xAI: not recommended as the primary customer-facing engine for this product at this stage
- GitHub Copilot related options: useful for engineering productivity, not for production customer-facing matching or booking logic

Mandatory AI rule:

- AI may parse, classify, summarize, rank, and synthesize
- AI may not be the source of truth for availability, payment confirmation, booking confirmation, or policy when no verified source exists

## Trust and data accuracy direction

Each provider, service offer, or booking candidate should eventually carry:

- source type
- source freshness
- verification state
- confirmation owner
- confidence score
- conflict flags
- last checked time

Priority order for trust:

1. tenant-confirmed BookedAI data
2. native BookedAI availability or booking truth
3. structured integrations
4. verified public data
5. AI inference from web content

## Deployment mode strategy

BookedAI must support more than one tenant operating mode:

- standalone SME app
- embedded website engine
- plugin and integration mode
- headless API mode

This matters because availability truth, payment routing, and integration depth will differ by mode.

## Data model direction

Future schema groups should include at minimum:

- growth and attribution tables
- tenants and deployment tables
- provider and service catalog tables
- matching request and score tables
- availability and booking trust tables
- billing and subscription tables
- CRM sync tables
- email communication tables
- integration connection and sync tables
- conversations and messages
- outbox, audit, and feature flag tables

## Migration direction

### Keep as-is first

- public routing
- current production deployment path
- live lead and booking entrypoints
- current admin access pattern

### Improve in place

- large backend service modules
- large route handler module
- current admin usability
- current frontend API boundary consistency

### Wrap with adapters

- Stripe
- Zoho Calendar
- Zoho Mail
- n8n
- Tawk
- future WhatsApp and Zoho CRM integrations

### Add new modules

- tenants
- leads
- conversations
- booking trust
- billing
- CRM sync
- knowledge base
- integration hub
- observability
- outbox and idempotency support

### Replace later

- current single-artifact frontend delivery
- local upload storage
- custom admin auth once tenant and role architecture is ready
- single-host deploy assumptions if cloud portability becomes a priority

## Surface separation direction

Current public and admin experiences are still delivered from one frontend artifact.

That is acceptable in the short term but should not remain the long-term state.

Recommended evolution:

1. keep current artifact while stabilizing backend domains
2. separate public growth and tenant or admin surface boundaries in routing and deployment
3. optimize the public growth app for SEO and performance
4. make the tenant app mobile-usable
5. keep the admin app operationally focused

## Mobile-ready direction

BookedAI should be explicitly designed for mobile:

- public growth journeys should be mobile-first
- chat and booking flows should be smooth on phones
- tenant workflows should be mobile-usable
- admin can be mobile-tolerant first
- business logic should remain channel-agnostic
- PWA should come before native mobile unless usage data proves otherwise

## Anti-patterns to avoid

The following should not be proposed as the default path:

- full rewrite
- careless routing or SEO structure replacement
- AI-controlled booking or payment truth
- internet search results treated as booking truth
- payment before booking confidence is established
- n8n as the core backend
- long-term dependence on metadata blobs as domain truth
- keeping admin and public coupled forever
- premature microservices
- premature native mobile

## Implementation sequence baseline

Recommended high-level sequence:

1. audit and stabilize production contracts
2. modularize backend without changing public endpoints
3. add billing and booking truth hardening
4. add matching, trust, CRM, and email lifecycle modules
5. add tenant app, embedded widget, and integration hub
6. separate surfaces and mature revenue operations
7. harden portability, PWA readiness, and scale concerns
