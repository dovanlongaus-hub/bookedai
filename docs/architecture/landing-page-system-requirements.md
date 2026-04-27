# BookedAI Landing Page System Requirements

Date: `2026-04-18`

Document status: `active phase-0 source of truth`

## 1. Purpose

This document defines the official landing-page system requirements for BookedAI after the Phase 0 repositioning reset.

It exists to turn the Phase 0 public-experience workstream into a concrete build baseline that Product, Frontend, Architecture, Backend, and QA can all use without ambiguity.

This document should be read together with:

- `docs/architecture/bookedai-master-prd.md`
- `docs/architecture/frontend-runtime-decision-record.md`
- `docs/architecture/phase-0-detailed-implementation-plan.md`
- `docs/architecture/public-growth-app-strategy.md`
- `docs/architecture/pricing-packaging-monetization-strategy.md`
- `docs/architecture/phase-1-2-detailed-implementation-package.md`
- `docs/architecture/frontend-theme-design-token-map.md`
- `docs/architecture/bookedai-brand-ui-kit.md`
- `docs/architecture/landing-component-tree-and-file-ownership.md`
- `docs/architecture/landing-page-execution-task-map.md`

## 2. System role

The landing page is not a generic brochure.

The landing page is the first production surface of the BookedAI revenue-engine story.

It must do five jobs at the same time:

- explain the product in under five seconds
- convert high-intent visitors into a demo, trial, or assisted next step
- teach booking trust and commercial realism without overclaiming
- establish the visual and vocabulary baseline for later tenant and admin product surfaces
- preserve attribution and CTA-source context for later commercial reporting

Current inherited public-shell baseline:

- the live homepage is now a responsive acquisition surface first, not a generic brochure
- the live homepage still uses a standalone homepage search runtime for on-page product proof and conversion instead of relying on a popup-first or embedded-assistant handoff
- the current runtime decision is `responsive web app first`, with homepage guiding buyers into the live web runtime and native mobile deferred to a later phase
- the public-shell copy baseline is now `English by default`
- the top navigation must allow visible language switching, with the current approved options `English` and `Tiếng Việt`
- the homepage should keep only the essential top-level commercial signals in the main body: approved logo, short revenue-engine positioning for service SMEs, and the primary search box
- supporting explanation, product education, and secondary narrative should be pushed into the menu layer, top bar, or bottom bar so the main viewport stays focused on search results and the BookedAI flow
- all later landing or homepage changes must treat mobile-safe search and booking progression as a higher priority than adding more section copy into the body
- the homepage visual direction may be Google-inspired in its calm search-first shell, but it should remain clearly branded as BookedAI through the approved logo, color accents, and booking-specific results experience
- the homepage should prefer a dedicated on-page search-results frame over assistant-popup styling, even when the underlying booking flow logic is shared
- the homepage search-results experience should be implemented as its own UI layer rather than as a visually re-skinned popup dialog mounted inline
- the approved runtime shell now uses a clearer `workspace` pattern: compact top navigation, one dominant search bar, suggestion chips directly attached to the search lane, a summary strip above results, and a dedicated booking rail
- the shortlist UI should feel like a professional booking-search application rather than a generic marketing widget, with visible result ranking, decision-ready metadata, and direct action links such as booking, map, and next-step affordances
- responsive behavior should preserve that workspace hierarchy on mobile by stacking search surface, shortlist, and booking rail cleanly without nested-scroll confusion

## 2A. Governing design and product priorities

When requirement or implementation tradeoffs appear, the landing system should resolve them in this order:

1. preserve truthful revenue-engine positioning for service SMEs
2. preserve the fastest path from search intent to shortlist and booking intent
3. preserve responsive and mobile-safe execution of that path
4. preserve clear menu, top-bar, and bottom-bar access to supporting information
5. preserve aesthetic or narrative expansion only after the conversion path remains clean

Interpretation rule:

- if a proposed homepage change reduces the space or clarity available to the search-and-booking flow, it should be treated as a regression unless an updated requirement-side document explicitly approves that tradeoff

## 3. Product framing that the page must use

The page must consistently frame BookedAI as:

- the AI revenue engine for service businesses
- a responsive web product surface in the current phase
- a multi-channel system across website, chat, calls, email, follow-up, and payment moments
- a product that helps capture demand, convert it into bookings, and reduce missed revenue
- a system sold through setup fee plus performance-aligned commission

The page must not frame BookedAI as:

- just a chatbot
- just an AI receptionist
- just a booking widget
- generic automation software
- a product with unsupported reporting certainty

## 3.1 Visual storytelling requirements

The landing page must now follow a visual-first presentation model for the active rebuild phase.

Core section design rule:

- each major landing section should target roughly `80%` visual communication and `20%` text communication

Visual communication includes:

- product-like dashboard blocks
- infographic rails
- flow diagrams
- status cards
- proof cards
- compact charts or funnel bars
- showcase imagery and structured visual grouping

Text communication should be limited to:

- essential positioning statements
- commercial keywords
- proof labels
- decision-critical explanations
- CTA language

The public page should therefore read as:

- graphic-led
- premium and professional
- fast to scan
- commercially legible in under a minute

The public page must not drift back into:

- long paragraph-first storytelling
- blog-like section bodies
- dense explanatory copy blocks that overpower the proof visuals

This rule now applies end to end across:

- hero
- problem
- solution
- product proof
- booking assistant or live-flow preview
- trust
- partner and infrastructure trust wall
- pricing
- pricing plan cards
- final CTA

## 4. Primary audience

The landing page is primarily for:

- service-business owners
- general managers
- front-desk or operations leads
- commercial evaluators comparing alternatives

Priority vertical examples:

- clinics
- beauty and wellness
- trades and home services
- tutoring and education
- kids activities
- other enquiry-led local service operators

## 5. Page success criteria

The landing page is successful when:

- the hero makes the positioning clear in under five seconds
- the page no longer reads as chat-first or feature-first
- pricing is clearly framed as setup fee plus performance-aligned commission
- the CTA hierarchy matches visitor intent instead of forcing one action
- the commercial widgets preview the product story without pretending unsupported live metrics
- the page feels premium on desktop and decisive on mobile
- every section supports one coherent revenue-engine narrative
- pricing, trust, and closing CTA surfaces follow the same visual-first system as the narrative sections above them instead of reverting to text-heavier legacy layouts
- pricing plan cards and partner trust surfaces feel like scan-friendly proof systems rather than legacy list or logo blocks
- the booking assistant preview behaves as a product-proof surface with visual framing and scan-friendly state signals, not as an isolated raw demo widget
- the booking assistant preview shows a clear live-read waiting state with reassuring copy and visible search motion while the best-fit shortlist is still being prepared

## 6. Information architecture requirements

The landing page must keep a stable single-page assembly for the current phase.

Required section order:

1. sticky header
2. hero
3. problem
4. solution and product logic
5. product proof or showcase
6. booking assistant or live-flow preview
7. trust or FAQ
8. partners and infrastructure trust wall
9. pricing
10. final CTA
11. footer

Homepage interaction rule:

- the opening hero should still read as a calm search-first homepage
- the primary search box should feed the standalone homepage search runtime directly on the same page
- the standalone homepage search runtime should render shortlist, booking, and confirmation states on-page through the live assistant APIs
- the homepage body should dedicate maximum practical space to the search results and booking flow rather than to explanatory cards or long supporting sections
- the homepage should treat the search bar and its immediate suggestion or action cluster as one cohesive command surface, not as disconnected hero decoration plus later utility controls
- the shortlist should expose compact result state above the cards so the user can see active query, result count, and summary context without inspecting each card first
- the booking rail should remain visually separate from the shortlist and should read as the selected-result workspace for booking details, booking form inputs, and confirmation states
- later redesign work must not silently revert the public experience back to a popup-first or embedded-assistant assumption unless the requirement-side documents are explicitly updated first
- supporting marketing, trust, SEO, comparison, and education content should be reachable through menu, top-bar, bottom-bar, or secondary routes before it is added back into the main homepage body

Optional sections allowed during Phase 1-2 if they stay additive:

- team
- roadmap
- implementation explanation
- video demo block
- technical architecture preview

## 7. Header requirements

The header must:

- show the approved BookedAI logo
- preserve fast access to primary sections
- include direct actions for `Book a Demo` and `Start Free Trial`
- remain usable on mobile without hiding the primary action logic
- avoid clutter from low-priority links
- use the approved revenue-engine lockup or compact icon treatment without introducing a second visual identity
- expose a visible language selector in the top navigation for the approved homepage locales
- remain compact enough that the search-first body still feels dominant on mobile and desktop

The header must not:

- behave like a docs navbar
- overload mobile with too many equal-priority actions
- introduce route sprawl before the broader public IA is approved
- hide locale switching so deeply that the multilingual shell baseline is effectively lost

## 8. Hero requirements

The hero must communicate:

- what BookedAI is
- who it is for
- what outcome it creates
- what next action the visitor should take

The hero must include:

- the official tagline or eyebrow framing the product as an AI revenue engine
- a primary headline focused on demand, bookings, and revenue
- a supporting line that explains multi-channel capture and conversion
- one primary CTA
- one secondary CTA
- one visual proof system that feels product-real rather than decorative
- a graphic-led composition where charts, status signals, product surfaces, or funnel visuals occupy more attention than body copy
- one primary search action that clearly signals the user can type the service they want to book immediately
- no more than the essential commercial framing needed to support that search action

The hero must not:

- lead with vague AI language
- over-index on conversational novelty
- imply unsupported live financial certainty
- imply that the user must leave the homepage or open a popup before seeing assistant results
- compete with the live search area by introducing multiple dense proof panels, long-form section copy, or equal-priority secondary narratives above the fold

## 9. Required public widgets and proof blocks

The landing page must establish the widget vocabulary that later product surfaces will operationalize.

Mandatory visual proof blocks:

- Revenue Generated card
- Missed Revenue card
- Search to Booking Conversion card
- Call to Booking Conversion card
- Email to Booking Conversion card
- Booking Confirmed activity card
- Stripe Payment Success widget
- Channel Attribution widget
- Commission Summary widget

These blocks may be represented as:

- hero dashboard mockup cards
- solution-section proof cards
- showcase cards
- pricing-adjacent explanation widgets

These blocks must be framed as product vocabulary, not fake audited numbers, unless the data is genuinely backed by the product.

Visual proof presentation requirements:

- proof blocks should be arranged as compact, scan-friendly visual systems rather than long explanatory text cards
- charts, funnel bars, activity states, and grouped proof cards should carry the main explanatory load where possible
- supporting text should only clarify the commercial meaning of the visuals instead of duplicating them
- `bookedai.au` may place uploaded product-evidence screenshots immediately after the chess tenant proof when the image strengthens the transition from vertical proof into the broader BookedAI product workspace, provided the block stays compact and does not push the live search runtime out of the main page flow
- `pitch.bookedai.au` should carry the same evidence screenshot inside the `Product proof` section when it helps investors connect the chess tenant story to the wider product surface

Booking assistant live-read waiting-state requirements:

- when the public assistant is waiting on visible live-read search results, the UI must show an explicit in-progress state instead of a blank, frozen, or ambiguous panel
- the in-progress state must include short reassurance copy equivalent to `we are finding the best service match for your request`
- the in-progress state must include visible motion such as a spinner, search pulse, or equivalent loading indicator that makes active search obvious
- the waiting-state treatment must stay consistent with the premium product-proof system used by the landing rather than falling back to a generic browser-looking loader
- the waiting state must disappear as soon as the shortlist, no-result state, or location-required state is ready
- while the waiting state is active, stale shortlist rows from the previous query must not remain visible
- the waiting-state copy must promise best-fit effort and relevance, not unsupported certainty

Inline assistant baseline requirements:

- the live public assistant logic should be able to power a standalone homepage search runtime instead of only a modal dialog
- the standalone homepage runtime must preserve the same API-backed search, shortlist, booking, and confirmation flow as the older popup shell
- when the homepage search box is used, the user should see the dedicated search-results runtime update on-page rather than being forced into an overlay handoff
- any later sprint that changes assistant IA must preserve this standalone homepage path unless the requirement-side docs are updated first

## 10. CTA system requirements

The page must support a layered CTA hierarchy.

Primary CTA options allowed:

- `Start Free Trial`
- `Book a Demo`

Secondary or supporting CTA options allowed:

- open live assistant
- view demo
- see pricing
- contact via email or WhatsApp

CTA system requirements:

- one dominant CTA per section
- source-aware tracking hooks for later attribution work
- consistent labels across header, hero, pricing, footer, and floating actions
- mobile-safe button hierarchy with clear visual priority

## 11. Pricing requirements

The landing page must explain:

- one-time setup fee
- performance-aligned commission after launch
- why the model is aligned with business outcomes
- that commission structure depends on business model and workflow shape
- that strategy or demo conversation is the correct next step for pricing clarification

The landing page must not:

- present a generic SaaS tier ladder that conflicts with the official model
- imply a flat monthly-only model as the long-term pricing truth
- make fabricated ROI promises

## 12. Trust requirements

The page must teach trust through:

- realistic claims
- concrete use-case language
- explanation of what happens when the path is clear versus when human follow-up is needed
- partner and infrastructure credibility
- FAQ answers grounded in the real workflow

The page must not:

- imply guaranteed direct booking in every case
- hide escalation or handoff realities
- sound like a generic “AI for business” template
- leave the user with no visible feedback while live-read search is still resolving a new assistant query

## 13. Visual system requirements

The page must feel:

- premium
- commercial
- modern
- product-real
- mobile-strong

The visual system must define:

- typography hierarchy
- color roles
- spacing rhythm
- radius and shadow rules
- section background rhythm
- button hierarchy
- card and widget treatment
- logo usage rules

Logo implementation requirements:

- the live public site must use the approved `RE` revenue-engine monogram and lockup from `docs/architecture/bookedai-brand-ui-kit.md`
- favicon, app icon, touch icon, and compact-nav logo treatments must all derive from the same live icon geometry
- public HTML should prefer versioned favicon paths when an icon refresh is deployed so browser or CDN cache does not preserve retired branding assets
- logo behavior must stay consistent across `landing`, `product`, `admin`, and adjacent public-growth shells

The public surface should visually bridge into later tenant and admin product surfaces without copying operational UI too literally.

## 14. Mobile requirements

Mobile behavior is mandatory, not secondary.

The page must:

- keep the hero readable without horizontal compromise
- keep primary CTA visibility high
- preserve product proof readability in compact cards
- keep sticky or floating actions useful rather than intrusive
- maintain fast-scroll comprehension with clear section separation

## 15. Metadata and SEO requirements

The public metadata must:

- use the revenue-engine positioning
- avoid legacy receptionist-first framing
- keep canonical and domain references correct
- align title, description, and OG copy with the current product definition
- point icon and touch-icon links at the current approved brand assets rather than legacy logo exports

Phase 0 and Phase 1-2 do not require full SEO page-family rollout yet, but the homepage metadata must already reflect the repositioned offer.

## 16. Truth-gate requirements

The landing page is governed by two truth gates.

### Narrative truth gate

The page must not publish messaging that conflicts with:

- PRD
- pricing strategy
- roadmap phase ownership
- architecture responsibilities

### Commercial truth gate

The page must not claim:

- unsupported revenue visibility
- unsupported commission logic
- unsupported attribution certainty
- unsupported payment or recovery outcomes
- unsupported search certainty while the assistant is still loading a live-read answer

## 17. Build and content ownership

Primary source-of-truth ownership:

- Product:
  - headline system
  - section copy
  - CTA language
  - pricing explanation
  - trust and FAQ language
- Frontend:
  - design tokens
  - component tree
  - responsive behavior
  - reusable widgets
  - logo implementation
- Architecture:
  - truth boundary review
  - supported product-shape review
- Backend:
  - claim-safety review for pricing, attribution, payment, and reporting wording
- QA or release owner:
  - narrative and commercial truth-gate verification

## 18. Definition of done

The landing-page system requirements are complete when:

- the page can be implemented without structural ambiguity
- the approved logo system can be deployed to live public surfaces without reopening branding interpretation
- required sections and widget vocabulary are explicit
- CTA hierarchy is explicit
- pricing and trust rules are explicit
- narrative and commercial truth gates are explicit
- the document is referenced by Sprint 1, Phase 0, and the public-growth planning stack

## 19. Related references

- [Phase 0 Detailed Implementation Plan](./phase-0-detailed-implementation-plan.md)
- [Public Growth App Strategy](./public-growth-app-strategy.md)
- [Pricing, Packaging, and Monetization Strategy](./pricing-packaging-monetization-strategy.md)
- [Phase 1-2 Detailed Implementation Package](./phase-1-2-detailed-implementation-package.md)
- [Frontend Theme Design Token Map](./frontend-theme-design-token-map.md)
- [Landing Component Tree And File Ownership](./landing-component-tree-and-file-ownership.md)
- [Landing Page Execution Task Map](./landing-page-execution-task-map.md)
- [Sprint 1 Owner Execution Checklist](../development/sprint-1-owner-execution-checklist.md)
