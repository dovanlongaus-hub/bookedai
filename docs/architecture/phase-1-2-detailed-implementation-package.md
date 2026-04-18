# BookedAI Phase 1-2 Detailed Implementation Package

Date: `2026-04-17`

Document status: `active execution package`

## 1. Purpose

This document defines the detailed implementation package for Phase 1 and Phase 2 of the upgraded BookedAI program.

Phase 1 and Phase 2 are the first real build phases after Phase 0 alignment.

Together, they should:

- turn the new revenue-engine positioning into a production-ready public experience
- create the premium growth surface that explains BookedAI clearly
- connect the public experience to attribution-aware conversion flows
- establish the implementation seams required for the later commercial data foundation

This package should be read together with:

- `docs/architecture/bookedai-master-prd.md`
- `docs/architecture/phase-0-detailed-implementation-plan.md`
- `docs/architecture/landing-page-system-requirements.md`
- `docs/architecture/target-platform-architecture.md`
- `docs/architecture/solution-architecture-master-execution-plan.md`
- `docs/architecture/implementation-phase-roadmap.md`
- `docs/architecture/mvp-sprint-execution-plan.md`
- `docs/architecture/public-growth-app-strategy.md`
- `docs/architecture/pricing-packaging-monetization-strategy.md`
- `docs/development/sprint-dependency-and-inheritance-map.md`

## 2. Phase definitions used here

### Phase 1

Premium public narrative and brand system

### Phase 2

Landing implementation and growth instrumentation

These phases should be treated as tightly linked. Phase 1 defines the system to build. Phase 2 implements it in the product.

These phases also define the baseline later commercial and reporting work must inherit rather than reinterpret.

## 3. Strategic outcome for Phase 1-2

At the end of Phase 1-2, the public BookedAI experience should:

- clearly position BookedAI as the AI revenue engine for service businesses
- explain the multi-channel demand-capture model
- explain the setup fee plus performance-based commission model
- use a premium SaaS visual system that feels credible and investor-grade
- include dashboard-style UI blocks that preview the commercial product story
- preserve or improve current conversion behavior
- capture attribution and CTA source context for later commercial reporting

## 4. Scope

### In scope

- public brand system
- landing-page information architecture
- landing-page content system
- design tokens and UI language
- React and Tailwind component architecture
- implementation of the premium landing page
- mobile sticky CTA
- hero dashboard mockup and premium UI blocks
- CTA and source instrumentation for public flows
- metadata and SEO alignment for the repositioned offer

### Out of scope

- full tenant revenue workspace
- full admin commercial operations
- full revenue data model rollout
- full commission ledger implementation
- broad SEO page-family rollout beyond the immediate landing scope

## 5. Success criteria

Phase 1-2 should be considered successful when:

- the public site no longer reads as chatbot-first or feature-first
- the hero explains BookedAI in under five seconds
- pricing clearly presents setup plus commission
- the new visual system is implemented consistently
- the public CTA flow captures source context for later reporting
- the page is mobile-strong and desktop-premium
- the mandatory revenue-engine widgets are represented in the UI

## 6. Program rules for Phase 1-2

- keep current public routes stable unless explicitly approved
- ship the new narrative without inventing unsupported backend claims
- use one shared copy source for landing content to avoid drift
- keep the premium visual system coherent across all sections
- implement dashboard-style widgets as reusable UI modules, not one-off fragments
- build attribution capture into CTA flows now, even if deeper reporting lands later

## 7. Required outputs

Phase 1-2 must produce:

- a production-ready landing-page copy system
- a production-ready design-token system
- a reusable landing component tree
- a premium dark-mode visual system
- implemented landing-page sections
- public CTA instrumentation baseline
- metadata and SEO updates aligned to the new positioning

## 8. Workstreams

## Workstream A - Brand and messaging system

### Objective

Lock the public-facing narrative so implementation stays commercially consistent.

### Tasks

- finalize master tagline, one-liner, and short pitch usage rules
- finalize headline hierarchy and section-level copy
- finalize CTA label rules
- finalize FAQ, trust lines, and pricing explanation language
- consolidate public content into a structured content module

### Deliverables

- landing content source of truth
- approved CTA system
- approved trust and pricing copy

### Owner

- Product

## Workstream B - Visual system and design tokens

### Objective

Create the premium visual language for the public revenue-engine narrative.

### Tasks

- formalize color, spacing, radius, shadow, and typography tokens
- define section background rhythm
- define glassmorphism rules
- define button hierarchy
- define iconography rules
- define dashboard-widget visual rules

### Deliverables

- design tokens
- visual usage rules
- reusable UI primitives

### Owner

- Frontend

## Workstream C - Landing component architecture

### Objective

Create a component model that can be implemented cleanly in the current frontend.

### Tasks

- define page assembly order
- define section components
- define UI primitives
- define widget components
- define shared content/config structure
- map current repo files to the new component plan

### Deliverables

- component tree
- file ownership plan
- reusable section and widget architecture

### Owner

- Frontend

## Workstream D - Hero and premium UI implementation

### Objective

Implement the strongest conversion and positioning block on the page.

### Tasks

- build sticky transparent header behavior
- build hero copy layout
- build premium browser frame
- build dashboard preview shell
- build floating stat cards
- build activity feed
- build integration strip
- build mobile sticky CTA

### Deliverables

- production-ready hero section
- production-ready header and mobile CTA

### Owner

- Frontend

## Workstream E - Core landing sections

### Objective

Implement the full section sequence that sells BookedAI as a revenue engine.

### Tasks

- build revenue-loss problem section
- build how-it-works section
- build revenue-engine explanation section
- build industry use-cases section
- build feature grid section
- build dashboard preview section
- build pricing section
- build comparison section
- build FAQ section
- build final CTA and footer

### Deliverables

- complete landing-page section set

### Owner

- Frontend + Product

## Workstream F - Growth instrumentation

### Objective

Make the public experience measurable and ready for later attribution and revenue reporting.

### Tasks

- define CTA source naming
- persist section or CTA origin through demo and consultation flows
- capture UTM and source context where available
- tag widget open events and key CTA events
- review API payloads for attribution support needs

### Deliverables

- public growth attribution baseline
- source-aware CTA handling

### Owner

- Frontend + Backend

## Workstream G - Metadata and SEO alignment

### Objective

Update public metadata to support the new positioning without breaking current routes.

### Tasks

- update title and description
- update social metadata where relevant
- confirm canonical behavior
- confirm sitemap implications if needed
- ensure public wording reflects the new offer consistently

### Deliverables

- updated public metadata baseline

### Owner

- Frontend + Product

## 9. Detailed implementation plan by phase

## Phase 1 - Premium public narrative and brand system

### Objective

Create the full public blueprint before major implementation starts.

### Phase 1 deliverables

- brand system
- landing-page copy system
- design tokens
- component tree
- public section hierarchy
- premium UI block specification
- CTA system

### Recommended sprint breakdown

#### Sprint P1-S1 - Narrative and structure

Tasks:

- finalize header, hero, footer, CTA system
- finalize mandatory sections and their order
- finalize copy for each section
- finalize widget vocabulary

Outputs:

- locked landing-page content model

#### Sprint P1-S2 - Design and component system

Tasks:

- finalize design tokens
- finalize visual rules
- finalize component architecture
- define file and module mapping in the current frontend

Outputs:

- locked implementation blueprint

### Phase 1 module map

Primary file targets:

- `frontend/index.html`
- `frontend/src/components/landing/`
- `frontend/src/components/landing/sections/`
- `frontend/src/components/landing/ui/`
- `frontend/src/components/landing/data.ts`
- `frontend/src/styles.css`

### Phase 1 definition of done

- no strategic ambiguity remains for the public rebuild
- copy, tokens, and component architecture are approved
- the implementation team can start coding without open narrative questions

## Phase 2 - Landing implementation and growth instrumentation

### Objective

Implement the new premium landing experience and establish the first growth instrumentation baseline.

### Phase 2 deliverables

- implemented landing page
- implemented premium hero
- implemented dashboard-style UI blocks
- implemented pricing and comparison sections
- implemented FAQ and final CTA
- CTA source instrumentation baseline
- updated metadata baseline

### Recommended sprint breakdown

#### Sprint P2-S1 - Shared primitives and hero implementation

Tasks:

- implement tokens in styles and component primitives
- implement header
- implement button, container, glass card, section heading, badge, widget shell
- implement hero section
- implement sticky mobile CTA

Outputs:

- reusable public UI foundation
- live premium hero

#### Sprint P2-S2 - Main section implementation

Tasks:

- implement problem section
- implement how-it-works section
- implement revenue-engine explanation section
- implement industry section
- implement feature grid section

Outputs:

- core middle-of-page narrative completed

#### Sprint P2-S3 - Proof, pricing, and conversion implementation

Tasks:

- implement revenue dashboard preview section
- implement pricing section
- implement comparison section
- implement FAQ section
- implement final CTA and footer

Outputs:

- complete landing page

#### Sprint P2-S4 - Instrumentation, QA, and polish

Tasks:

- wire CTA source tracking
- propagate attribution context through demo and consultation actions
- update metadata
- test mobile responsiveness
- test scroll behavior and anchors
- test visual consistency and hover states

Outputs:

- measurable and polished public release candidate

### Phase 2 module map

Primary file targets:

- `frontend/index.html`
- `frontend/src/components/landing/Header.tsx`
- `frontend/src/components/landing/Footer.tsx`
- `frontend/src/components/landing/data.ts`
- `frontend/src/components/landing/sections/*`
- `frontend/src/components/landing/ui/*`
- `frontend/src/App.tsx`
- `frontend/src/styles.css`
- `frontend/src/shared/contracts/*`
- `frontend/src/shared/api/*`

### Phase 2 definition of done

- premium landing page is implemented
- CTA and source instrumentation are in place
- the page is mobile-first, dark-mode-first, and conversion-ready
- the public product story is aligned to the revenue-engine positioning

## 10. Mandatory public UI blocks to implement

The public implementation must include visual modules for:

- Revenue Generated card
- Missed Revenue card
- Search to Booking Conversion card
- Call to Booking Conversion card
- Email to Booking Conversion card
- Stripe Payment Success widget
- Booking Confirmed activity card
- Channel Attribution widget
- Commission Summary widget

These may initially use realistic preview content, but their naming and structure should map cleanly to later product data models.

## 11. Recommended frontend architecture

### Section components

- `Header`
- `HeroSection`
- `RevenueLossSection`
- `HowItWorksSection`
- `RevenueEngineSection`
- `IndustrySection`
- `FeatureGridSection`
- `RevenueDashboardPreviewSection`
- `PricingSection`
- `ComparisonSection`
- `FAQSection`
- `FinalCTASection`
- `Footer`
- `StickyMobileCTA`

### UI primitives

- `Button`
- `Container`
- `SectionHeading`
- `GlassCard`
- `FeatureCard`
- `PricingCard`
- `Badge`
- `BrowserFrame`
- `WidgetShell`
- `DashboardStatCard`
- `ActivityItem`

### Content/config modules

- landing content module
- design token or theme module
- header nav config
- footer config

## 12. API and instrumentation requirements

Even though deeper commercial reporting lands later, Phase 1-2 should already prepare for it.

### Required public capture fields

- CTA label
- CTA source section
- page path
- referral or UTM context if available
- flow type such as demo, consultation, assistant open, or pricing action

### Required coordination

- frontend must define the source naming convention
- backend must confirm where to accept and store attribution context in existing flows

## 13. QA plan for Phase 1-2

### UX and design QA

- desktop hero layout
- mobile hero layout
- sticky header behavior
- mobile sticky CTA behavior
- section spacing and rhythm
- hover-state polish

### Conversion QA

- primary CTA works from hero
- pricing CTA works
- final CTA works
- source tags survive through the intended flow

### Content QA

- no section uses outdated chat-first framing
- pricing wording is consistent
- trust points are commercially credible

### Technical QA

- no broken anchors
- no responsive overflow
- no visual regressions in common viewport sizes
- no metadata regressions

## 14. Risks and mitigations

### Risk 1 - Premium visuals drift into decorative noise

Mitigation:

- enforce widget-driven design instead of abstract decoration

### Risk 2 - Public page overclaims unsupported reporting

Mitigation:

- keep widget copy outcome-led but realistic
- avoid fake metrics

### Risk 3 - Attribution instrumentation is deferred and forgotten

Mitigation:

- make source capture a Phase 2 deliverable, not a later nice-to-have

### Risk 4 - Implementation fights the existing frontend structure

Mitigation:

- map the new architecture onto `frontend/src/components/landing/` rather than forcing a rewrite-first move

## 15. Exit review for Phase 1-2

The phase closes only when the team can confirm:

- public positioning is fully updated
- the landing page is visually and commercially coherent
- the pricing model is explained clearly
- the widget vocabulary aligns with later product data models
- attribution capture is in place at the public conversion layer

## 16. Handoff into later phases

Phase 1-2 should hand off these ready inputs into later phases:

- stable public vocabulary for revenue, attribution, missed revenue, payment, and commission
- widget names and structures for later API contracts
- CTA and source tracking model for later reporting
- clear public explanation of the pricing model that the backend and admin roadmap must support
