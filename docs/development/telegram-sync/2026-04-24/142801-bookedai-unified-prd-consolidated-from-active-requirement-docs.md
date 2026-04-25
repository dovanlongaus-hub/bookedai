# BookedAI unified PRD consolidated from active requirement docs

- Timestamp: 2026-04-24T14:28:01.797322+00:00
- Source: prd.md
- Category: documentation
- Status: completed

## Summary

Added a new root prd.md that consolidates the active BookedAI requirement baseline from project.md plus the current public, tenant, admin, search-truth, widget/plugin, pricing, portal, and chess revenue-engine requirement docs.

## Details

# BookedAI Unified Product Requirements Document

Date: `2026-04-24`

Status: `active consolidated baseline`

## 1. Purpose

This document consolidates the current BookedAI requirement set into one operator-friendly PRD.

It inherits authority from `project.md` and merges the active product requirements that were previously spread across:

- `docs/architecture/bookedai-master-prd.md`
- `docs/architecture/landing-page-system-requirements.md`
- `docs/architecture/admin-enterprise-workspace-requirements.md`
- `docs/architecture/public-growth-app-strategy.md`
- `docs/architecture/tenant-app-strategy.md`
- `docs/architecture/internal-admin-app-strategy.md`
- `docs/architecture/pricing-packaging-monetization-strategy.md`
- `docs/development/tenant-implementation-requirements-framework.md`
- `docs/development/intelligent-search-booking-engine-rd-spec.md`
- `docs/development/openai-official-search-engine-requirements-plan.md`
- `docs/architecture/demo-grandmaster-chess-revenue-engine-blueprint.md`

If a downstream document conflicts with this PRD, follow `project.md` first, then this file, then the specialized document after it is synchronized.

## 2. Product definition

### Product name

BookedAI

### Category

- AI revenue engine for service businesses
- booking, follow-up, and conversion automation platform
- multi-tenant search, booking, payment, and lifecycle system

### Core positioning

BookedAI helps service SMEs capture demand across web, search, chat, forms, calls, email, and follow-up moments, then convert that demand into bookings, payments, and measurable revenue.

BookedAI should not be positioned as only:

- a chatbot
- a booking widget
- a CRM sync utility
- a generic AI brochure site

### Brand promise

Never miss a paying customer again.

### Commercial promise

More bookings. Less admin. Clearer revenue visibility.

## 3. Product vision

BookedAI should become the operating layer that service businesses use to:

1. capture inbound demand
2. respond while intent is high
3. qualify the request safely
4. resolve the best booking path
5. collect or prepare payment
6. follow up automatically
7. make revenue won, pending, missed, and recoverable visible

## 4. Target customers and personas

### Primary customer profile

- local service SMEs
- appointment-based or enquiry-driven businesses
- operators who lose revenue because response, follow-up, and booking handling are fragmented

### Priority verticals

- clinics
- beauty and wellness
- trades and local services
- tutoring and education
- kids activity businesses
- professional local services

### Core personas

- business owner or general manager: wants revenue visibility and lower leakage
- front desk or operations manager: wants faster response and easier booking handling
- BookedAI internal operator: wants tenant health, support, billing, and workflow visibility
- end customer: wants fast, trustworthy, low-friction discovery and booking

## 5. Current product baseline

The current product must be planned as one connected SaaS system, not as separate disconnected surfaces.

### Canonical surface roles

- `bookedai.au`: public entry that redirects to `pitch.bookedai.au`
- `pitch.bookedai.au`: narrative and commercial pitch surface
- `demo.bookedai.au`: interactive product-proof surface
- `product.bookedai.au`: deeper live product runtime
- `portal.bookedai.au`: post-booking customer control surface
- `tenant.bookedai.au`: tenant sign-in, onboarding, billing, team, and workspace gateway
- `admin.bookedai.au`: internal admin and support workspace
- `api.bookedai.au`: backend API surface

### Product-surface rule

Public, portal, tenant, admin, payment, and follow-up flows must be reviewed and evolved as one coherent system. A stronger surface in one area must not be paired with clearly weaker trust, UX, or data truth in the adjacent area.

## 6. Public product requirements

### Public surface role

The public experience must convert demand into shortlist, booking, and payment momentum, not behave like a long generic marketing site.

### Locked public UX rules

- the live public direction is `responsive web app first`
- the homepage/search experience must be search-first and conversion-first
- active workflows should prioritize search, shortlist, booking, and confirmation over long narrative copy
- mobile-safe progression is mandatory for search, shortlist, booking, and payment flows
- the visual direction may be calm and Google-like, but the product must remain clearly branded as BookedAI
- the public product should feel like a premium search-and-booking application, not a generic widget

### Public search and booking requirements

- the user can enter a natural-language service request from the public surface
- the system must return a shortlist with decision-ready metadata
- the same session must support search, shortlist review, booking continuation, and confirmation
- the UX must show professional in-progress states during matching
- when confidence is low or context is missing, the product should ask short follow-up questions or suggest nearby query refinements
- booking confirmation should expose durable booking references and next-step visibility
- payment, email, SMS, WhatsApp, and CRM follow-up should run as best-effort post-booking automation without hiding customer-visible success

### Public trust rules

- the system must not pretend unsupported inventory, pricing, availability, or payment states
- partner checkout, native checkout, pending payment, and manual-review states must be visually distinct
- public-web fallback results must be clearly distinguishable from tenant-backed results
- no-result or low-confidence states must guide the user forward instead of dead-ending

## 7. Search truth requirements

BookedAI search must behave like a real booking engine, not a generic recommendation engine.

### Non-negotiable rules

1. tenant truth is primary
2. public web search is fallback only when tenant truth is insufficient
3. wrong-domain, wrong-location, stale-context, and over-broadened matches must be suppressed
4. display quality is more important than showing a longer shortlist
5. only display-safe results may proceed into booking resolution

### Search behavior requirements

- query understanding must separate service intent, location, timing, audience, and preference cues
- hard filters should run before softer semantic expansion
- weak tenant matches must not be shown only to avoid an empty state
- public internet fallback may use grounded web search only after tenant retrieval fails quality gates
- sourced public results must not be treated as tenant-trusted catalog truth
- search loading states should explain progress and invite missing context when useful

## 8. Booking, payment, and portal requirements

### Booking requirements

- BookedAI must support authoritative lead and booking-intent creation through the v1 flow
- booking resolution must preserve trust state from the actual result source
- the product must support direct booking, partner checkout, invoice-after-confirmation, and pending/manual-review variants

### Payment requirements

- payment handling must support `stripe_card`, `partner_checkout`, and deferred invoice-style flows where applicable
- the UI must accurately reflect payment dependency state
- payment readiness and payment outcome must be visible to customers and operators

### Portal requirements

`portal.bookedai.au` is the durable post-booking control surface.

The portal must support:

- booking review
- booking reference hydration
- edit or reschedule flows where supported
- cancel flows where supported
- payment follow-up visibility
- customer-safe continuation after the initial booking session

## 9. Tenant product requirements

### Tenant surface role

`tenant.bookedai.au` is the single tenant-facing gateway for sign-in, onboarding, account ownership, billing, and operational workspace access.

### Core tenant requirements

- one unified tenant identity model across onboarding, catalog, bookings, billing, team, plugin, and integrations
- premium SaaS-style tenant experience rather than an internal-dashboard feel
- tenant-safe role and permission controls by default
- visible billing, plan state, and value reporting inside the tenant product

### Required tenant workspace domains

- overview
- catalog and publishing
- bookings
- leads and customer activity
- billing and subscription
- team and roles
- integrations
- plugin/widget configuration
- experience or branding controls

### Tenant role rules

- `tenant_admin` controls core workspace, team, and billing posture
- `finance_manager` can access finance-oriented billing actions
- `operator` can manage day-to-day operational content and catalog actions where approved
- restricted roles must see explicit read-only posture instead of silent failure

## 10. Embedded widget and plugin requirements

BookedAI must support installation beyond BookedAI-owned hosts.

### Widget/plugin product rules

- the same search, booking, payment, portal, and follow-up lifecycle should be installable on customer-owned SME websites
- widget/plugin runtime identity must stay explicit through tenant, widget, deployment mode, source page, campaign, host origin, and session context
- embedded installs should still converge on the shared BookedAI booking and portal lifecycle
- plugin runtime configuration must be manageable from tenant and admin control surfaces

### Supported deployment modes

- BookedAI-hosted tenant website
- embedded assistant on an existing tenant website
- plugin or widget runtime
- backoffice or API-first tenant mode

## 11. Admin product requirements

### Admin surface role

`admin.bookedai.au` is the internal operator, oversight, and support control plane.

### Core admin requirements

- enterprise-style login and navigation
- menu-first information architecture
- tenant directory plus deeper tenant workspace
- tenant branding and HTML content editing
- tenant role and permission management
- full tenant catalog and service CRUD support
- billing support and payment investigation
- integrations health and reconciliation visibility
- messaging and reliability visibility
- audit and activity review
- platform settings and support-safe controls

### Admin support and safety rules

- cross-tenant support access must be audited
- read-only support mode must block mutation actions
- support context should remain visible when moving between investigation and linked tenant views
- the product should prefer investigation-first tooling over hidden impersonation

## 12. CRM, communications, and lifecycle requirements

BookedAI must connect revenue operations beyond the first booking.

### CRM and communications requirements

- local-first lead and booking records remain the operational ledger
- CRM sync should enrich the lifecycle when configured, not replace local truth
- email, SMS, and WhatsApp should operate through explicit provider-safe abstractions
- sync and communication states must support pending, retrying, manual review, failed, and synced-style visibility where relevant
- lifecycle automation should cover acquisition, booking, payment, reminder, confirmation, thank-you, and retention cases

## 13. Analytics and reporting requirements

BookedAI must show business outcome, not only workflow activity.

### Reporting requirements

- expose revenue won, pending, missed, and recoverable views
- preserve source attribution from acquisition through booking and payment
- support tenant and admin visibility into conversion, booking trust, payment, CRM, and communication outcomes
- make monthly value legible inside the tenant product
- provide dashboards for growth, product, operations, finance, and tenant views over time

## 14. Pricing and monetization requirements

### Official commercial model

- setup fee
- performance-aligned commission

### Pricing rules

- public positioning must present BookedAI as outcome-aligned rather than commodity SaaS
- pricing explanation should connect directly to bookings, revenue, and measurable value
- tenant and admin surfaces must support the operational realities of setup fee, revenue tracking, commission visibility, and billing follow-up

## 15. Demo and vertical-template requirements

The current demo direction is broader than a generic booking proof.

### Canonical demo rule

`demo.bookedai.au` should become the first-minute proof of the full BookedAI revenue engine, not only a search-and-booking chat demo.

### Current vertical template rule

The `Grandmaster Chess Academy` flow is the first reusable vertical template, not a one-off branch.

### Required academy-proof loop

The demo direction should prove:

`intent -> assessment -> placement -> booking -> payment -> class -> coach input -> AI report -> parent follow-up -> monthly billing -> retention action`

### Vertical-template requirements

- assessment, placement, report, billing, and retention logic should remain tenant-configurable
- tenant analytics must stay partitioned
- parent or customer portal flows must resolve through tenant-safe context
- the demo must prove reusable architecture for later verticals, not only chess

## 16. Non-functional requirements

### Product quality

- additive, migration-safe rollout
- no regressions that break live booking continuity
- cross-surface consistency across public, portal, tenant, and admin
- mobile-safe customer flows
- explicit loading, degraded, and fallback states

### Security and multi-tenant safety

- tenant isolation by default
- actor-aware session boundaries
- audited admin support access
- provider and webhook security controls
- no silent cross-tenant mutation paths

### Reliability

- health-checkable production runtime
- retry-aware integration posture
- traceable booking, payment, CRM, and communication states
- test and replay coverage for high-risk search and booking flows

## 17. Success metrics

### Commercial metrics

- lead-to-booking conversion
- booking-to-payment conversion
- attributable revenue generated
- missed or recoverable revenue identified

### Product metrics

- search relevance and trust rate
- tenant-hit rate before public web fallback
- booking completion rate
- payment-intent resolution rate
- portal continuation success

### Operational metrics

- CRM sync success rate
- communication delivery success rate
- admin support resolution speed
- tenant onboarding and publish readiness

## 18. Delivery priorities

### Priority 1

Preserve and improve the responsive public web-app UX, especially search-to-shortlist-to-booking flow quality.

### Priority 2

Keep tenant and admin workspaces productized, role-safe, and aligned with real billing, catalog, integrations, and support needs.

### Priority 3

Preserve search truth, tenant-first retrieval, and safe public-web fallback behavior.

### Priority 4

Expand the embeddable widget/plugin runtime so the same lifecycle can operate on customer-owned websites.

### Priority 5

Upgrade the demo and vertical-template path from booking proof into full revenue-engine proof, starting with the chess academy loop.

## 19. Documentation rule

When requirement-side meaning changes:

1. update `project.md` first if project scope or direction changed
2. update this `prd.md`
3. update the specialized requirement document
4. update `docs/development/implementation-progress.md`
5. update the matching roadmap or sprint artifact

## 20. Summary statement

BookedAI is a multi-tenant AI revenue engine for service SMEs. Its current requirement baseline is a search-first, booking-truthful, payment-aware, follow-up-capable product system spanning public acquisition, tenant operations, internal admin, embeddable widget/plugin installs, portal continuation, and reusable vertical revenue-engine templates.
