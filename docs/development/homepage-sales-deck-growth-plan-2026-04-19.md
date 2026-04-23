# BookedAI Homepage Sales Deck And SME Growth Plan

Date: `2026-04-19`

Status: `active planning baseline`

Implementation write-back:

- the homepage sales-deck polish pass is now reflected in the public frontend assembly
- homepage CTA hierarchy now prioritizes live trial entry into `product.bookedai.au`, while sales-contact and registration intent continue into `register-interest`
- homepage secondary conversion now points more clearly into the sales-deck lane
- an offer-strip layer now surfaces the launch offer, free-trial path, and commission model immediately under hero
- homepage utility navigation now exposes `See Pricing` and `Product Demo` more directly while keeping the registration CTA dominant
- section sequencing and deployment copy were tightened so the page reads more like a premium sales deck and less like a mixed runtime-plus-marketing surface
- homepage now also exposes a dedicated `agent surface` section so `product.bookedai.au` is positioned as the live AI booking flow and `demo.bookedai.au` as the lighter story-first demo host
- current approved public package vocabulary is now `Freemium`, `Pro`, and `Pro Max`, with `Advance Customize` reserved for the custom registration lane

## Objective

Lock the public homepage as a high-conviction sales deck first.

The homepage should sell the solution, the commercial model, and the launch offer.

The live application runtime should be positioned separately under `product/demo` so the homepage does not carry the burden of explaining and running the whole product at once.

## Strategic decision

### Homepage role

- `bookedai.au` should become the main sales and marketing surface
- the homepage should read like a premium sales deck for investors, SME owners, and operators
- the homepage should explain the whole solution with strong visuals, short high-value copy, proof, flows, and commercial CTA
- the homepage should drive one dominant action: register interest for the BookedAI SME setup offer

### Product and demo role

- live search, guided booking, product runtime, and workflow interaction should live under `product.bookedai.au` and `demo.bookedai.au`
- the homepage can preview product moments, but should not behave like the full runtime
- the public story should point buyers into:
  - `Product demo`
  - `Live booking flow`
  - `SME setup registration`

### Delivery implication

- `PublicApp` should be treated as a transition surface, not the final homepage direction
- the target direction is a dedicated homepage sales deck with clearer CTA architecture
- `ProductApp`, `DemoLandingApp`, and portal routes remain the place for deeper interaction

## Commercial offer to launch

### Launch CTA

Primary offer:

- `Free online setup for the first 10 SME customers`

What is included:

- BookedAI setup for one real service business
- standalone launch on the customer's website, or
- a dedicated customer app surface linked into BookedAI workflows
- booking capture
- payment-ready flow
- confirmation email
- portal revisit support
- basic operator handoff

### Subscription offer

- customers can subscribe today
- every public package should support an immediate `free trial` experience
- public commercial vocabulary should be `Freemium`, `Pro`, and `Pro Max`
- custom registration-only commercial language may use `Advance Customize`
- recommended default: `30-day free subscription on all paid packages`

### Setup fee recommendation

Recommended commercial model after the first 10 launch customers:

- `A$990` one-time online setup for single-location, one primary service flow, and standard hosted or standalone rollout
- `A$1,900` one-time growth setup for multi-service, 2-3 journeys, or deeper portal and automation configuration
- `Custom from A$3,500+` for multi-location, custom integrations, or more complex operational onboarding

Reasoning:

- this is high enough to signal real implementation value
- it is still materially easier for SMEs than enterprise-style implementation fees
- it fits a productized rollout rather than a custom agency project

### Commission recommendation

Recommended default:

- `6% commission` on successful completed bookings that are directly attributable to BookedAI

Recommended commercial rule:

- commission applies only after a booking is successful
- commission should be calculated on net booking value before GST and excluding payment-processor fees
- for larger customers or higher recurring volume, commission can move toward `4.5% to 5%`

Reasoning:

- this keeps the model meaningfully performance-based
- it stays lower than marketplace-style lead fees
- it is easier to defend because BookedAI will also have subscription and setup revenue

## Homepage information architecture

## 1. Hero

Goal:

- sell the commercial promise in under five seconds

Must show:

- strong premium brand
- one-line value proposition for service SMEs
- investor-legible market signal
- visual product proof
- dominant CTA to register now
- secondary CTA to open product demo

Recommended headline direction:

- `BookedAI turns website traffic, calls, email, and follow-up into more confirmed bookings for service SMEs.`

Recommended primary CTA:

- `Claim Free Setup`

Recommended secondary CTA:

- `Open Product Demo`

Recommended utility CTA:

- `See Pricing`

## 2. Offer strip

Low-copy, high-signal strip immediately under hero:

- `Free online setup for first 10 SME customers`
- `30-day free subscription on all plans`
- `Commission only when BookedAI helps produce a successful booking`

## 3. Problem to value infographic

Must communicate:

- SMEs lose leads in search, calls, forms, missed follow-up, and slow response
- BookedAI closes that gap with one connected booking and payment flow

Preferred style:

- flow diagram
- short metrics
- icon-led stages

## 4. Solution architecture section

Show the whole system at a glance:

- public acquisition
- qualification
- booking
- payment
- confirmation email
- QR revisit portal
- tenant and admin visibility

This section should sell the platform without forcing the user into technical detail.

## 5. Deployment modes section

This is important for SME conversion.

Must explain:

- `Standalone on your website`
- `Dedicated customer booking app`
- `Linked into the full BookedAI portal`

This should remove ambiguity about how quickly an SME can go live.

## 6. Product and demo preview

Homepage should preview:

- product screenshots
- live flow cards
- short demo rails

But all deeper interaction should route into:

- `/product`
- `/demo`

## 7. Pricing and commercial model

Must explain clearly:

- freemium entry path
- Top 10 SME launch offer
- Pro and Pro Max package path
- Advance Customize only for higher-touch rollout or custom scope
- launch offer
- setup fee after launch cohort
- monthly subscription
- commission on successful bookings only

Avoid pricing maze behavior.

## 8. QR registration block

One dedicated section should push the fastest conversion:

- large QR
- short headline
- email registration option
- direct form CTA

Recommended CTA text:

- `Scan to register your SME`
- `Join the first 10 free setup customers`

## 9. Interested registration flow

Homepage CTA should route into one BookedAI-owned flow:

- `register interested`
- collect name, business, email, phone, website, business type, deployment preference, and booking volume
- send confirmation email
- route lead into BookedAI pricing/setup workflow

Recommended deployment preference options:

- `Standalone website`
- `Dedicated booking app`
- `Linked full BookedAI portal`

## 10. Proof, trust, and team

Keep:

- founder credibility
- ecosystem partners
- customer-ready vertical proof
- operator trust signals

## Detailed CTA funnel

1. Homepage hero CTA
2. QR or button opens `register interested`
3. capture lead data
4. send confirmation email immediately
5. offer plan selection and free trial path
6. offer calendar booking for onboarding call
7. mark whether customer wants standalone, dedicated app, or full portal

## Implementation notes

The existing pricing consultation flow should be reused as the first practical implementation base where possible.

That means:

- keep current email capture and consultation submission infrastructure
- retune the copy and fields toward `SME setup registration`
- add deployment-mode selection explicitly
- make the launch-offer messaging visible in hero, pricing, and final CTA

## Phase and sprint alignment

## Phase 1 - Homepage sales deck and launch conversion

Primary goal:

- make the homepage the main sales and marketing machine

Must include:

- sales-deck hero
- visual solution explanation
- launch offer
- pricing model
- QR registration
- investor-ready polish
- product/demo separation

## Phase 2 - Core operational conversion journey

Primary goal:

- make the registered SME flow dependable end to end

Must include:

- accurate search
- booking path
- payment
- email confirmation
- QR portal revisit

## Phase 3 - Module refinement

Primary goal:

- improve tenant, admin, portal, reporting, onboarding, and lifecycle detail

## Phase 4 - Advanced, legal, and role-shaped data

Primary goal:

- add advanced orchestration, legal review, and per-user-group data depth only after the first three layers are working

## Recommended sprint sync

### Sprint A - Homepage message reset

- rewrite homepage as sales deck
- reduce runtime behavior on homepage
- move deeper interaction to product/demo

### Sprint B - Offer and CTA conversion

- add `first 10 SME free setup` offer
- add pricing section with setup fee, subscription, and commission logic
- add QR registration block
- add interested-registration form and confirmation email

### Sprint C - Deployment-mode selling

- explain standalone website mode
- explain dedicated customer app mode
- explain full BookedAI portal mode

### Sprint D - Conversion proof and investor polish

- infographic and visual proof pass
- case-study and partner proof pass
- stronger investor-readable commercial framing
- executive-board polish so the homepage opens with a stronger product-system narrative instead of feeling like separate marketing blocks

### Sprint E - SME onboarding hardening

- registration to onboarding path
- free trial to subscription path
- payment and email continuity

### Sprint F - Product/demo separation hardening

- make `/product` and `/demo` the canonical deeper interaction surfaces
- keep homepage focused on conversion and story

## Success criteria

- a first-time visitor can understand the solution in under 5 seconds
- an SME can understand exactly how to start
- an investor can understand the commercial model quickly
- the launch offer feels urgent and credible
- the homepage can convert interest into registration without needing a sales call first
