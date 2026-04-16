# Pricing, Packaging, and Monetization Strategy

## Purpose

This document defines the official Prompt 16-level strategy for pricing, packaging, and monetization in `BookedAI.au`.

It is written for a production system that is already running and targeting real Australian SMEs.

The goal is not to publish a generic SaaS pricing table. The goal is to design a pricing system that is easy to sell now, tied to real business value, compatible with BookedAI's matching and booking-reliability positioning, and able to expand as tenants add locations, bookings, lifecycle automation, and integrations.

This strategy inherits and aligns with:

- Prompt 1 product, trust, and revenue direction
- Prompt 2 module and boundary direction
- Prompt 3 billing, CRM, email, and reporting foundations
- Prompt 4 data and lifecycle direction
- Prompt 5 API and billing direction
- Prompt 6 public growth and pricing-page direction
- Prompt 7 tenant value visibility direction
- Prompt 8 internal admin and billing-ops direction
- Prompt 9 AI and matching value direction
- Prompt 10 CRM, email, and revenue lifecycle direction
- Prompt 11 integration and reconciliation direction
- Prompt 12 auth and multi-tenant direction
- Prompt 13 deployment and rollout direction
- Prompt 14 QA and reliability direction
- Prompt 15 analytics and revenue intelligence direction

## Section 1 — Executive summary

- Current pricing maturity:
  - current public site already has a real pricing surface with `Starter`, `Growth`, and `Pro` monthly plans, a free first month subscription, separate setup messaging, and strong consultation-led onboarding flow.
- Target pricing direction:
  - hybrid pricing with a monthly subscription base, a clearly separate setup fee, selective value-based expansion, and limited usage-sensitive triggers tied to business outcomes rather than raw technical consumption.
- Biggest priorities:
  - make entry easy for Australian SMEs
  - charge for value created, not feature clutter
  - align packaging with booking volume, lifecycle automation, and operational complexity
  - keep pricing simple enough to close deals quickly
- Biggest risks if done poorly:
  - underpricing a revenue-impacting system
  - overcomplicating plans for SMEs
  - charging for the wrong metric
  - creating custom pricing chaos too early

## Section 2 — Pricing principles

### Core value principle

BookedAI pricing should be anchored to:

- more qualified leads
- more confirmed bookings
- more paying customers
- fewer missed enquiries
- less front-desk and follow-up workload
- stronger lifecycle revenue capture

### What pricing should not be anchored to

- generic feature count alone
- raw API calls
- token counts
- dashboard vanity features

### Strategic framing

BookedAI should be sold as:

- cheaper than missing one customer
- cheaper than manual lead leakage
- more valuable than a generic chatbot because it affects booking and revenue outcomes

## Section 3 — Pricing model

### Recommended model

- monthly base subscription
- optional usage-sensitive expansion
- value-based plan progression

### Why hybrid pricing fits BookedAI

- SMEs need a simple predictable monthly price to buy quickly
- BookedAI also creates variable value as lead and booking volume grows
- a hybrid model avoids overcharging small operators while capturing more value from higher-volume teams

### Recommended pricing logic

- base subscription should cover:
  - platform access
  - core matching and booking flow
  - basic lifecycle automation
  - standard support and reporting
- value-based expansion should increase when:
  - booking volume grows
  - locations increase
  - integration load increases
  - automation and reporting depth increase

### Usage dimensions that are acceptable

- bookings per month
- qualified leads per month
- locations
- integrations
- active service journeys

### Usage dimensions to avoid as primary list-price metric

- chat message count alone
- API calls alone
- AI token usage alone

## Section 4 — Plan structure

### Recommended public plan ladder

#### Starter

- Target customer:
  - solo or very small service SMEs
  - owner-operator teams
  - businesses validating demand capture
- Recommended price range:
  - AUD `119-149` per month
- Recommended setup fee:
  - AUD `249` one-off for standard remote setup
- Key value:
  - stop missing inbound enquiries
- Usage guidance:
  - lower booking and lead volume
  - one location
  - minimal integrations
- Included features:
  - website chat
  - lead capture
  - simple booking assistance
  - basic follow-up
  - one calendar or core routing path
- Upgrade trigger:
  - lead flow becomes consistent and the business wants automation beyond basic capture
- Best-fit industries:
  - salons
  - beauty studios
  - tutors
  - smaller allied health operators
  - solo and small trades teams

#### Growth

- Target customer:
  - established local SMEs converting regular enquiries
- Recommended price range:
  - AUD `279-349` per month
- Recommended setup fee:
  - AUD `399` one-off for standard remote setup
- Key value:
  - convert more leads into bookings with clearer automation
- Usage guidance:
  - moderate booking volume
  - richer booking flows
  - more follow-up workload
- Included features:
  - guided booking journeys
  - stronger SMS or follow-up automation
  - better reporting
  - more than one service journey
- Upgrade trigger:
  - multiple locations, more staff workflows, or need for CRM/integration depth
- Best-fit industries:
  - clinics
  - swim schools
  - child activity centres
  - hospitality venues
  - established local service teams

#### Pro

- Target customer:
  - multi-service or multi-location operators
  - higher-volume teams
- Recommended price range:
  - AUD `599-799` per month
- Recommended setup fee:
  - from AUD `799` for standard remote rollout, higher when scope is custom
- Key value:
  - deeper automation and operational leverage
- Usage guidance:
  - higher booking volume
  - lifecycle automation
  - CRM and integration depth
- Included features:
  - multi-location support
  - CRM integration
  - reminder automation
  - richer monthly reporting
  - stronger admin and workflow controls
- Upgrade trigger:
  - custom rollout, enterprise procurement, or highly integration-heavy operation
- Best-fit industries:
  - multi-location clinics
  - larger trades operators
  - education groups
  - hospitality groups
  - more complex booking and handoff operations

#### Enterprise

- Target customer:
  - complex multi-location or franchise-style businesses
  - integration-heavy and custom-governance buyers
- Recommended price range:
  - custom pricing, usually above Pro
- Recommended setup fee:
  - custom implementation fee
- Key value:
  - complex rollout, support, controls, and custom integration needs
- Usage guidance:
  - larger teams
  - more locations
  - higher operational and support needs
- Included features:
  - dedicated onboarding
  - custom implementation support
  - advanced controls
  - tailored integrations and reporting
- Upgrade trigger:
  - contract or operational complexity beyond standard plans

### Confirmed current-repo pricing baseline

Current public pricing surface already shows:

- `Starter` at `AUD 119`
- `Growth` at `AUD 299`
- `Pro` at `AUD 649`
- free first month subscription messaging
- separate setup-fee messaging
- startup referral offer messaging
- performance references such as per-lead and per-booking ranges

This appears in [frontend/src/components/landing/sections/PricingSection.tsx](../../frontend/src/components/landing/sections/PricingSection.tsx) and related landing content.

### Feature-weighted pricing recommendation for the current product

Given the features already visible in the current public pricing surface, the most practical pricing recommendation is:

- Starter:
  - reposition as `Starter`
  - recommended default public price: `AUD 119/month`
  - standard remote setup fee: `AUD 249`
- Growth:
  - reposition as `Growth`
  - keep in the `AUD 279-329/month` band
  - recommended default public price: `AUD 299/month`
  - standard remote setup fee: `AUD 399`
- Pro:
  - keep in the `AUD 599-699/month` band
  - recommended default public price: `AUD 649/month`
  - standard remote setup fee: from `AUD 799`
- Enterprise:
  - custom from roughly `AUD 1,500+/month` depending on rollout scope
  - custom implementation fee based on rollout scope

### Why this range is commercially sensible

- Starter at `AUD 119` stays low enough for a local Australian SME to say yes quickly while still feeling more valuable than a cheap scheduler.
- Growth should be the commercial sweet spot because it already bundles stronger automation value:
  - AI call answering
  - guided booking flows
  - SMS follow-up
  - weekly reporting
- Pro should price materially above Growth because it introduces the first real operational leverage tier:
  - multi-location support
  - CRM integration
  - reminder automation
  - lead qualification dashboard

### Market anchors for Australia-aware pricing

The current recommendation is also supported by visible public market anchors:

- basic booking and appointment software in Australia can be very low-cost:
  - Square Appointments AU publicly shows `AUD 0`, `AUD 40`, and `AUD 90` per month per location for scheduling-focused plans
- clinic software can still remain relatively affordable at the base layer:
  - Cliniko publicly shows a free 30-day trial and prices starting at `USD 45/month` for one practitioner
- AI receptionist products price much higher when they own front-desk automation:
  - Smith.ai publicly shows AI receptionist pricing starting at `USD 95/month`, with higher tiers at `USD 270/month` and `USD 800/month`

This supports the commercial logic that:

- BookedAI Starter should not try to undercut simple booking tools all the way down to `AUD 0-40`
- BookedAI Growth can credibly sit above standard scheduler pricing because it adds lead conversion and booking automation value
- BookedAI Pro can credibly sit in the `AUD 649` zone because it starts overlapping with front-office automation and operational workflow value, not just scheduling value

### Practical feature-to-price weighting

The current public feature set implies this rough value weighting:

- Lead capture and website chat:
  - strong entry value
  - supports `AUD 119`
- Guided booking journeys and call-answering automation:
  - major conversion lift
  - supports the `AUD 299` middle tier
- Multi-location, CRM integration, and deeper automation:
  - real operational and revenue leverage
  - supports the `AUD 649+` upper SMB tier

### Recommended launch-facing decision

If BookedAI wants the most sellable low-friction structure immediately:

- use `Starter` at `AUD 119`
- use `Growth` at `AUD 299`
- use `Pro` at `AUD 649`
- waive standard online setup for the first `25` Australian SME customers

If BookedAI wants the most conservative, lowest-friction market entry:

- keep the new public `119 / 299 / 649` ladder
- keep `30 days free subscription` on all plans
- review close rate and onboarding capacity after the first `15-25` paid customers before changing list prices further

## Section 5 — Entry strategy

### Recommended entry motion

- free subscription for 30 days on every public plan
- standard setup fee quoted separately from subscription
- launch offer that waives standard remote setup for the first `25` Australian SME customers
- consultation-led onboarding to reduce buying anxiety

### Entry-price philosophy

- the first barrier should be low enough that an SME owner can say yes quickly
- the offer should sound cheaper than losing one customer or missing one busy day of enquiries

### Recommended landing-page framing

- “Subscription free for 30 days”
- “Cheaper than missing one booking”
- “Launch now, with setup waived for early customers”

### Startup and referral path

- keep the startup-referral offer as a selective accelerator or incubator channel incentive
- use `90 days free subscription` for approved startup-referral cases
- do not stack unlimited discounts on top of deep setup concessions unless the account is strategically valuable
- treat it as GTM leverage, not the default public price for everyone

### Setup fee strategy

- subscription and setup should always be explained separately
- this helps buyers understand that:
  - the recurring fee covers the ongoing revenue engine
  - the setup fee covers onboarding, configuration, and workflow mapping
- this also prevents the “first month free” message from sounding like full implementation is free forever

### Best launch offer for Australia

- all customers:
  - `30 days free subscription`
- first `25` Australian SME customers:
  - `free standard online setup`
- approved startup-referral accounts:
  - `90 days free subscription`
- onsite rollout:
  - quoted separately, never hidden inside the monthly price

## Section 6 — Value metrics

### Primary value metric recommendation

The strongest primary value metric is:

- bookings influenced or bookings handled per month

### Why this metric fits best

- it is closer to revenue than chat count
- it is easier for SMEs to understand than AI usage units
- it reflects real business value created by matching, booking trust, and lifecycle automation

### Secondary value metrics

- qualified leads
- locations
- active service journeys
- integrations

### Revenue-influenced metric note

- “revenue influenced” is powerful for enterprise or success stories, but too abstract to be the main list-price metric for SMB buying decisions

## Section 7 — Expansion model

### Natural expansion levers

- additional location
- additional booking volume
- additional integration
- deeper CRM or lifecycle automation
- advanced analytics and reporting
- additional service journeys
- more operational users where justified

### Expansion design rule

- expansion should feel like paying more because the business is getting more value, not like being punished for success

### Recommended upsell path

- Starter -> Growth:
  - when conversion and lead flow become consistent
- Growth -> Pro:
  - when operational complexity and booking volume increase
- Pro -> Enterprise:
  - when rollout, governance, or integration complexity increases materially

## Section 8 — Pricing psychology

### Principles to use

- anchoring:
  - show higher-value plans first or keep higher plans visible enough to make the middle tier feel rational
- contrast pricing:
  - make Growth the obvious “best value” tier
- risk reversal:
  - free subscription period
  - guided onboarding
- ROI messaging:
  - compare monthly fee to missed bookings and manual admin cost
- simplicity:
  - do not overload the buyer with too many plan variants

### Recommended page psychology

- highlight the middle plan as the most sensible fit
- keep copy outcome-led, not feature-led
- use “most popular” or “best for growing service teams” on the middle tier

## Section 9 — Landing pricing design

### Pricing section structure

- short section intro anchored in business value
- 3 main visible tiers plus enterprise contact path
- one highlighted plan
- ROI framing
- FAQ or clarifying note for usage and onboarding
- strong CTA per plan

### Messaging guidance

- show monthly pricing in AUD
- show `30 days free subscription` above the grid
- show setup fee as a distinct line item or note under each plan
- show launch setup-waiver offer clearly without implying setup is always free
- show what type of business each plan suits
- mention booking volume or workflow maturity rather than long feature matrices

### Recommended CTAs

- `Start free subscription period`
- `Book a consultation`
- `Talk to sales`
- `See what plan fits your business`

### Current pricing-page direction to preserve

- current page already uses:
  - a clear plan grid
  - a free-first-month message
  - consultation-led onboarding
  - strong CTA rhythm

These should be refined, not replaced casually.

## Section 10 — Billing logic

### Required billing capabilities

- monthly billing
- trial tracking
- invoice generation
- payment reminders
- upgrade and downgrade handling
- usage tracking for expansion triggers

### Billing rules

- keep plan billing monthly by default
- track usage internally even if some dimensions are not customer-visible at first
- allow upgrade mid-cycle with clear proration or next-cycle logic
- downgrade should avoid sudden operational breakage

### Lifecycle alignment

- billing must connect to:
  - CRM lifecycle
  - email reminders
  - monthly reporting
  - subscription state

## Section 11 — Metrics

### Pricing success metrics

- trial-to-paid conversion
- pricing page conversion rate
- consultation-to-close rate
- ARPU
- LTV
- churn rate
- expansion revenue
- revenue per source
- plan distribution across tenants

### Packaging success metrics

- Starter upgrade rate
- Growth retention
- Pro expansion and retention
- discount dependency rate
- startup offer conversion quality

## Section 12 — Final recommendations

- Implement first:
  - keep the current 3-tier public ladder
  - reposition tiers around maturity and industry fit:
    - Starter
    - Growth
    - Pro
  - keep free subscription front and center
  - make Growth the clear default
  - separate setup from subscription in all sales conversations and pricing UI
  - use a launch setup-waiver for the first `25` Australian customers to create urgency without cheapening the monthly price
  - track bookings influenced, qualified leads, locations, and integrations as expansion signals
- Keep simple:
  - 3 main public plans plus Enterprise
  - monthly billing
  - value-led copy
- Do not do:
  - over-complex usage pricing
  - technical pricing metrics that SMEs do not understand
  - too many plan variants
  - deep custom pricing too early
  - pricing so low it ignores support and infrastructure cost

## Assumptions

- Current repo confirms an existing live pricing surface, trial messaging, and consultation-led pricing flow.
- Current repo does not yet confirm a mature production billing and packaging engine across all future value metrics, so this document is written as the official monetization target strategy rather than a claim that every pricing and packaging rule is already automated.
