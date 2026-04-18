# BookedAI Product Requirements Document

Date: `2026-04-18`

Document status: `active planning baseline`

## 1. Document purpose

This PRD defines the merged product requirements for BookedAI after the current positioning upgrade.

It replaces the older "booking automation plus chatbot" framing with the current product definition:

- BookedAI is the AI revenue engine for service businesses
- BookedAI captures demand across search, website, calls, email, follow-up, and payment moments
- BookedAI converts that demand into bookings and revenue
- BookedAI makes revenue won, revenue missed, and recovery opportunities visible
- BookedAI uses a setup fee plus performance-aligned commission model

This document should be read together with:

- `docs/architecture/target-platform-architecture.md`
- `docs/architecture/system-overview.md`
- `docs/architecture/implementation-phase-roadmap.md`
- `docs/architecture/mvp-sprint-execution-plan.md`
- `docs/architecture/pricing-packaging-monetization-strategy.md`
- `docs/architecture/public-growth-app-strategy.md`
- `docs/architecture/tenant-app-strategy.md`
- `docs/architecture/internal-admin-app-strategy.md`
- `docs/architecture/crm-email-revenue-lifecycle-strategy.md`
- `docs/architecture/analytics-metrics-revenue-bi-strategy.md`

## 2. Product definition

### Brand name

BookedAI

### Master tagline

BookedAI - The AI Revenue Engine for Service Businesses

### Core one-liner

Capture demand from search, website, calls, email, and follow-up - then convert it into bookings and revenue automatically.

### Short pitch

BookedAI helps service businesses answer faster, recover missed opportunities, and convert search traffic, calls, chats, emails, and website visitors into real bookings automatically.

### Positioning statement

BookedAI is a multi-channel AI revenue engine for appointment-based and enquiry-driven service businesses. It captures inbound demand, responds instantly, qualifies leads, books appointments, follows up automatically, connects to calendar, CRM, and payment systems, and helps operators see what revenue was generated, what was missed, and what can still be recovered.

### Current public experience baseline

The current live public growth surface should now be treated as:

- a search-first homepage
- an inline assistant-led booking surface
- an English-default public shell with visible locale switching
- a lightweight conversion surface where the main viewport is reserved for search, shortlist, booking, and confirmation rather than long landing copy

The current approved locale options for the public shell are:

- English
- Tiếng Việt

The current homepage should therefore not be described in later planning as a popup-first public assistant unless the requirement-side source documents are explicitly revised.

### Product operating principles now locked

All requirement-side and execution-side documents should now inherit these product rules unless a newer approved source document explicitly replaces them:

- BookedAI should always be presented and built as a revenue engine for service SMEs, not as a generic content site or AI brochure
- the public homepage should optimize for search intent, booking intent, and conversion momentum before narrative density
- the product should prefer lightweight, fast-scanning, mobile-safe interfaces over section-heavy storytelling when a workflow is active
- responsive behavior should be treated as mobile-first for every customer-facing surface that directly affects search, shortlist, booking, payment, or recovery
- when there is a tradeoff between explanatory content and live conversion space, the live conversion space should win by default
- `frontend/public/branding/` should be treated as the only approved source of BookedAI logo, short-mark, favicon, touch-icon, PWA icon, and mobile-responsive brand assets across every app, web, site, single-page, and adjacent shell
- all BookedAI surfaces should resolve brand assets through shared brand mappings rather than route-local logo files, remote logo URLs, or parallel logo systems

### Category

- AI revenue engine
- booking and conversion automation platform
- voice AI plus website conversion system

## 3. Product summary

BookedAI is no longer defined primarily as a booking assistant, booking widget, or CRM sync layer.

BookedAI should be treated as a multi-channel commercial operating layer with seven connected product jobs:

1. capture demand across channels
2. respond instantly while intent is high
3. qualify the lead and determine the right next action
4. move qualified demand into confirmed bookings
5. connect bookings to payment and revenue events
6. recover missed or incomplete opportunities
7. show operators the commercial outcome clearly

BookedAI is not just a chatbot.

BookedAI is the revenue system that sits between demand and booked revenue.

## 4. Vision and strategic promise

### Vision statement

BookedAI should become the operating layer that service businesses use to turn fragmented inbound demand into measurable booked revenue.

### Strategic promise

BookedAI should help service businesses:

- capture more inbound demand
- answer faster
- convert more enquiries into bookings
- reduce lost revenue from missed calls, slow replies, and failed follow-up
- connect booking activity to payment and commercial reporting
- buy with lower risk because pricing is aligned to performance

### Brand promise

Never miss a paying customer again.

### Commercial promise

More bookings. Less admin. Clearer revenue visibility.

## 5. Core business problem

Most service businesses do not lose revenue in one place.

They lose revenue across:

- search traffic that never converts
- website visitors who leave without enquiring
- inbound calls that go unanswered
- chats and forms that receive a slow reply
- emails that sit too long
- follow-up that never happens
- bookings that do not complete payment
- disconnected systems that hide what was won or lost

The demand is often already there.

The failure is that the demand is handled across separate tools, separate staff moments, and separate channels with no single revenue system connecting them.

## 6. Product goals

### Business goals

- increase revenue generated from existing inbound demand
- increase bookings generated across search, website, calls, email, and follow-up channels
- reduce missed revenue caused by delayed response, missed calls, abandoned enquiries, and incomplete payments
- create a pricing model that is easier to sell because it is aligned to commercial outcomes
- establish BookedAI as a premium revenue platform rather than a commodity chat product

### User goals

- help prospects get a fast response on the channel they already use
- help operators see what needs action now
- help teams trust the booking and recovery workflow
- help owners understand whether the system is generating real revenue

### Product delivery goals

- preserve current production continuity while repositioning the platform
- keep rollout additive and migration-safe
- use current runtime assets instead of pretending the system is greenfield
- sequence delivery by revenue impact and operational safety

## 7. Target audience

### Primary audience

- local service businesses
- SME owners and operators
- appointment-based businesses

### Priority segments

- clinics
- beauty and wellness businesses
- trades and home services
- tutoring and education providers
- kids activity businesses
- professional local services with high enquiry volume

### Best-fit operating pattern

BookedAI fits businesses that:

- rely on calls, website traffic, search discovery, email, or repeatable enquiries
- need appointment or consultation booking
- lose conversion when staff are busy
- want better follow-up without hiring more admin
- need clearer visibility into what revenue is being won or missed

## 8. Personas

### Persona A - Business owner or general manager

This user wants commercial clarity.

Needs:

- more booked revenue
- less manual follow-up
- lower lead leakage
- easy-to-understand reporting
- a pricing model that feels fair and aligned

### Persona B - Front desk or operations manager

This user wants operational relief.

Needs:

- instant response coverage
- cleaner handoff from enquiry to booking
- fewer repetitive questions
- simpler missed-call recovery
- calendar and CRM consistency

### Persona C - Internal BookedAI operator

This user wants support and optimization visibility.

Needs:

- tenant health visibility
- channel performance visibility
- commission and attribution visibility
- workflow and sync issue handling
- safe rollout controls and diagnostics

## 9. Positioning and messaging rules

### Mandatory positioning rules

- do not describe BookedAI as just a chatbot
- do not focus only on chat or calls
- position BookedAI as a multi-channel AI revenue engine
- emphasize revenue, bookings, conversion, follow-up, and recovery
- sound premium, commercial, modern, and credible
- avoid fake metrics, inflated claims, and startup buzzwords

### Messaging hierarchy

1. revenue generated
2. bookings generated
3. demand captured across channels
4. missed revenue recovered
5. automation and AI underneath

### Public-shell messaging baseline

- English is the default public-shell copy language
- additional locale options may be exposed through a visible top-level language selector
- multilingual support must not introduce mixed-language English shells by accident; each locale should render intentionally
- current follow-on sprint work should preserve the English-default plus language-selector baseline unless a later approved requirement update replaces it

### Voice and tone

- clear
- commercial
- premium
- modern
- confident
- helpful
- outcome-driven

## 10. Product principles

The following principles are mandatory:

- AI is the operating mechanism, not the headline claim
- revenue and bookings are the primary product outcomes
- production stability matters more than architectural purity
- Supabase Postgres remains the transaction and domain truth layer
- integrations and callbacks must be idempotent
- payment and revenue reporting must connect to booking state, not vanity events
- channel attribution must stay explainable
- recovery workflows must be operator-safe and auditable
- public growth, tenant, and admin surfaces must stay aligned on the same commercial model

## 11. Current product reality

### Confirmed current runtime

The current repository already runs as a live full-stack system with:

- React, TypeScript, and Vite frontend

Current public runtime interpretation:

- the public homepage is no longer only a narrative landing that launches a popup assistant
- the public homepage now includes a search-first hero that can drive an inline embedded assistant runtime on the same page
- the embedded assistant is already expected to surface shortlist, booking, and confirmation states directly in the homepage flow
- FastAPI backend
- self-hosted Supabase Postgres
- `n8n` automation layer
- Nginx subdomain routing
- Docker Compose deployment

### Confirmed current capabilities

Current runtime capabilities already include:

- public marketing website
- booking assistant experience
- customer booking portal host on `portal.bookedai.au` for post-booking detail, edit, cancel, and save flows
- demo request and pricing consultation flows
- admin interface
- Stripe checkout session creation
- Zoho Mail and Zoho Calendar integrations
- Tawk intake
- service import and partner profile management
- additive `/api/v1/*` contract surfaces

### Current gap to close

The next strategic gap is not "build a chatbot."

The real gap is to turn the current platform into a clear revenue engine by adding:

- multi-channel demand capture framing
- revenue dashboarding
- missed revenue tracking
- source attribution
- payment-linked reporting

Portal requirement now locked for customer booking flows:

- booking confirmation UX must expose a durable portal route on `portal.bookedai.au`
- the portal host must be treated as a first-class production subdomain, not an ad-hoc link target
- post-booking actions such as detail review, edit, cancel, save, and payment follow-up should converge on the portal host rather than fragmented one-off CTA destinations
- DNS, TLS, Nginx routing, frontend runtime handling, and documentation must stay in sync whenever the portal host changes
- recovery workflows
- pricing and packaging aligned to outcomes

## 12. Target product surfaces

### 12.1 Public growth surface

Responsibilities:

- premium landing pages
- industry and location pages
- demo booking surface
- SEO and campaign attribution
- revenue-engine product storytelling
- widget entry for live call, chat, or lead capture experiences

### 12.2 Tenant revenue workspace

Responsibilities:

- revenue dashboard
- booking and conversion visibility
- missed revenue tracker
- source attribution
- follow-up and recovery workflows
- payment status and commission visibility
- CRM and calendar integration status

### 12.3 Internal admin surface

Responsibilities:

- tenant operations
- lifecycle and sync investigation
- attribution and commission review
- workflow override and reconciliation
- optimization and rollout controls

### 12.4 Embedded and channel surfaces

Responsibilities:

- website widgets
- call and SMS hooks
- email and follow-up workflow entry
- API and webhook access

## 13. Core product capabilities

### 13.1 Multi-channel demand capture

BookedAI must capture demand from:

- search traffic
- website visits
- calls
- chats
- email enquiries
- follow-up and re-engagement
- referral sources where available

### 13.2 Instant response and lead handling

BookedAI must:

- respond instantly across supported channels
- ask qualification questions
- identify the correct next action
- keep the interaction commercially relevant

### 13.3 Booking automation

BookedAI must:

- guide qualified leads into the right booking flow
- connect to availability and booking logic
- support direct booking, callback, quote request, or request-booking paths

### 13.4 Revenue visibility

BookedAI must provide a revenue dashboard showing:

- revenue generated
- bookings generated
- average booking value
- top-performing channel
- performance over time

### 13.5 Missed revenue tracking

BookedAI must estimate and surface:

- missed calls not converted
- unanswered email opportunities
- abandoned or unbooked lead value
- incomplete payment value
- recovery opportunity value

### 13.6 Conversion analytics by channel

BookedAI must support:

- search visitor to enquiry conversion
- website chat to booking conversion
- call to booking conversion
- email enquiry to booking conversion
- follow-up recovery conversion

### 13.7 Payment integration

BookedAI must connect booking moments to real money moments, including:

- deposit paid
- booking confirmed
- payment status
- revenue recorded
- failed payment follow-up

### 13.8 Source attribution

BookedAI must track and report demand source where possible, including:

- search
- website
- call
- email
- follow-up
- referral
- re-engagement

### 13.9 Revenue recovery workflows

BookedAI must support recovery workflows such as:

- missed call auto callback
- unbooked lead follow-up
- email reminder sequence
- quote reminder
- payment completion reminder

### 13.10 Commercial reporting

BookedAI must turn operational activity into business metrics, including:

- bookings generated by channel
- revenue generated by channel
- cost per booked lead where possible
- commission due
- ROI summary

## 14. Mandatory product widgets and UI blocks

The public product storytelling and the tenant/admin product surfaces must be able to show these widgets credibly:

- Revenue Generated card
- Missed Revenue card
- Search to Booking Conversion card
- Call to Booking Conversion card
- Email to Booking Conversion card
- Stripe Payment Success widget
- Booking Confirmed activity card
- Channel Attribution widget
- Commission Summary widget

## 15. Pricing and monetization requirements

### Official pricing model

- one-time setup fee
- ongoing commission based on successful bookings or revenue generated

### Pricing positioning

We win when you win.

Setup once, then pay based on performance.

### Pricing requirements

The pricing system must:

- be easy to explain during sales
- feel lower-risk than flat software pricing
- align BookedAI incentives to business outcomes
- support different commission structures by business type and booking model
- expose commission and attributable revenue transparently in admin and reporting

### Setup fee scope

The setup fee covers:

- AI system setup
- channel workflow design
- booking and follow-up automation
- calendar, CRM, and payment integration
- revenue dashboard configuration
- testing and launch support

## 16. User experience requirements

### Public landing page requirements

The landing experience must:

- explain BookedAI in under five seconds
- make the revenue-engine concept obvious
- show BookedAI works across multiple channels
- explain setup fee plus commission pricing clearly
- feel premium, modern, and commercially credible
- drive demo bookings

### Tenant workspace requirements

The tenant product must:

- show revenue won, revenue missed, and recovery opportunity clearly
- make channel attribution understandable
- surface action-needed items quickly
- support mobile-usable workflows

### Internal admin requirements

The admin product must:

- support reconciliation and support workflows
- show tenant and workflow health
- show channel, payment, and commission issues
- support safe overrides and auditability

## 17. Landing page information architecture

The public landing page must contain these sections:

1. Header
2. Hero
3. Revenue loss problem
4. How it works
5. Revenue engine explanation
6. Industry use cases
7. Feature grid
8. Revenue dashboard preview
9. Pricing
10. Comparison
11. FAQ
12. Final CTA
13. Footer

## 18. Design system requirements

The public design system must follow these rules:

- dark mode first
- premium SaaS visual language
- black or charcoal base UI
- blue, green, and purple accents
- glassmorphism cards
- dashboard-style product visuals
- strong whitespace
- large typography
- mobile-first layout
- sticky transparent header
- subtle motion only for refined hover states

## 19. Success metrics

### Commercial metrics

- bookings generated through BookedAI
- attributable revenue generated through BookedAI
- missed revenue identified
- recovered revenue or recovered booking count
- payment completion rate
- commission due versus revenue generated

### Funnel metrics

- search visitor to enquiry conversion
- website visit to lead conversion
- call to qualified lead conversion
- email enquiry to booking conversion
- follow-up recovery conversion

### Product metrics

- time to first response
- qualification completion rate
- booking completion rate
- sync success rate
- reporting freshness

## 20. Non-goals

The current strategic scope does not require:

- native mobile apps in the immediate phase
- a microservices rewrite
- generic AI tooling without revenue linkage
- pricing anchored to token counts or raw message volume
- a landing page that oversells unsupported claims

## 21. Risks and constraints

### Product risks

- over-positioning BookedAI as chat-first instead of revenue-first
- shipping revenue claims without traceable attribution
- commission logic becoming too custom too early
- recovery workflows creating spam or unsafe follow-up

### Technical risks

- fragmented data truth between booking, CRM, payment, and reporting
- weak attribution fidelity
- inconsistent lifecycle state across integrations
- rollout drift between public, tenant, and admin views

### Go-to-market risks

- pricing model confusion if setup and commission logic is not explained clearly
- loss of credibility if the landing page feels hype-heavy
- adoption friction if setup feels too complex

## 22. Phased delivery priorities

### Phase 1 priority

Define and ship the public growth story for the revenue engine while preserving current runtime continuity.

### Phase 2 priority

Build the shared revenue data model and reporting foundation for bookings, channel attribution, payments, missed revenue, and commission.

### Phase 3 priority

Expand multi-channel demand capture and conversion workflows across search, website, calls, email, and follow-up.

### Phase 4 priority

Ship tenant-facing revenue workspace modules for reporting, recovery, and attribution.

### Phase 5 priority

Deepen payment, commission, and reconciliation operations in internal admin.

### Phase 6 priority

Harden optimization loops, evaluation, and performance reporting so BookedAI becomes a continuously improving revenue engine.

## 23. Acceptance criteria for the upgraded product narrative

The repositioning should be considered successfully adopted when:

- the public site clearly presents BookedAI as the AI revenue engine for service businesses
- the product surface can show revenue generated, revenue missed, and channel attribution
- pricing is documented as setup fee plus performance-based commission
- roadmap and sprint plans reflect the revenue-engine product shape
- architecture docs describe BookedAI as a multi-channel commercial system rather than a narrow booking assistant

## 24. Documentation synchronization requirement

Any future change to positioning, pricing, revenue metrics, or channel scope must update:

- this PRD
- `docs/architecture/target-platform-architecture.md`
- `docs/architecture/implementation-phase-roadmap.md`
- `docs/architecture/mvp-sprint-execution-plan.md`
- the relevant strategy document for pricing, analytics, tenant, admin, or public growth
