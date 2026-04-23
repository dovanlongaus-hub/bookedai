# Public Growth App Strategy

## Purpose

This document defines the official Prompt 6-level strategy for the public growth surface of `BookedAI.au`.

It is written for a production system that is already live.

The goal is not to redesign the website as a generic marketing site. The goal is to evolve the current public surface into a stronger:

- acquisition engine
- SEO engine
- conversion engine
- trust engine
- lead capture engine
- revenue attribution entrypoint

This strategy inherits and aligns with:

- Prompt 1 domain direction
- Prompt 2 repo and module strategy
- Prompt 3 additive foundations
- Prompt 4 data architecture direction
- Prompt 5 API and contract strategy
- the Phase 0 landing-page system requirements baseline in `docs/architecture/landing-page-system-requirements.md`
- `docs/architecture/frontend-runtime-decision-record.md`

## Section 1 — Executive summary

- Current public growth maturity:
  - BookedAI currently has a polished, mobile-aware, production-grade single-page landing experience plus a small set of static support pages.
  - The current public site already contains strong conversion primitives:
    - search-first homepage hero
    - standalone homepage search runtime on the homepage itself
    - lean top-bar and menu-driven conversion surfaces with supporting content moved off the main search viewport
    - pricing consultation flow
    - demo request flow
    - top-level language switching for the public shell
  - However, the site is still structurally thin as a long-term growth engine because it does not yet have scalable page families for SEO, segmentation, trust education, or industry capture.
- Target public growth direction:
  - Keep the current homepage and core routes stable.
  - Strengthen the public app into a proper growth surface with:
    - clearer positioning
    - layered CTAs
    - first-class attribution propagation
    - explicit booking trust messaging
    - industry and intent-based page families
    - deployment-mode pages
    - trust and commercial explanation pages
  - keep the current runtime decision explicit:
    - `bookedai.au` is the acquisition and orientation surface for the responsive web app
    - `product.bookedai.au` is the deeper live product web runtime
    - native mobile is deferred to a later phase
- Biggest public-site opportunities:
  - upgrade existing homepage messaging from "AI receptionist" toward "search + booking trust + revenue lifecycle"
  - create new SEO page families without breaking the current homepage
  - improve CTA segmentation for cold traffic versus high-intent traffic
  - connect chat, demo, consultation, and quote flows more clearly to attribution and CRM lifecycle
  - explain booking trust explicitly instead of leaving it implicit
- Biggest risks if changed poorly:
  - losing current SEO value by changing routes too early
  - replacing clear conversion entrypoints with generic brochure design
  - overselling direct booking even when availability is not verified
  - fragmenting copy into vague "AI for business" messaging
  - adding too many CTAs on mobile without hierarchy

## Section 2 — Current public site assessment

### Confirmed current public routes and pages

Confirmed from `frontend/public/`, `frontend/index.html`, and the public app structure:

- `/`
- `/video-demo.html`
- `/privacy-policy.html`
- `/terms.html`

Confirmed sitemap scope today:

- homepage only as main commercial URL
- privacy and terms
- video demo

See:

- [frontend/src/apps/public/PublicApp.tsx](../../frontend/src/apps/public/PublicApp.tsx)
- [frontend/public/sitemap.xml](../../frontend/public/sitemap.xml)
- [frontend/index.html](../../frontend/index.html)

### Confirmed homepage structure today

The homepage currently behaves as a responsive acquisition shell with live on-page product proof:

- sticky header
- top-of-page commercial framing and runtime direction
- embedded live search and booking runtime on the same page
- menu-driven supporting narrative sections
- bottom-bar and footer close

The current conversion interpretation should be treated as:

- user understands the BookedAI web runtime quickly from the homepage
- the homepage itself can still render shortlist, booking, and confirmation states through the embedded assistant
- deeper product interaction should continue cleanly into `product.bookedai.au` when that is the clearer runtime path
- the public shell remains English by default
- the header and menu expose locale switching for `English` and `Tiếng Việt`
- the homepage body should still protect practical space for the live assistant results and booking flow, while longer trust or education content is accessed through menu, top-bar, or bottom-bar surfaces

Current public content/data is mainly driven by:

- [frontend/src/components/landing/data.ts](../../frontend/src/components/landing/data.ts)

### Confirmed CTA flows today

Current public CTAs are concentrated around:

- `Open Web App`
- `Book a Demo`
- `Book Now` in pricing
- floating `AI Booking Agent`
- in-flow booking assistant prompts

Current interaction endpoints live behind:

- `/api/booking-assistant/catalog`
- `/api/booking-assistant/chat`
- `/api/booking-assistant/session`
- `/api/pricing/consultation`
- `/api/demo/request`
- `/api/partners`

### Current strengths

- Strong visual polish for a production landing page.
- Clear primary action around trying the product through search.
- Useful demo and consultation capture flows already exist.
- The site already hints at real product capability, not just marketing copy.
- The homepage can now show live search-to-booking behavior directly on-page instead of hiding the main product proof behind a popup.
- Mobile behavior appears intentionally designed:
  - mobile menu
  - large CTA buttons
  - visible locale switching path through the menu
  - responsive inline assistant flow
- Existing copy already leans toward practical SME operations rather than abstract AI hype.

### Current weaknesses

- Homepage is doing too much work alone.
- Navigation remains single-page-anchor based rather than page-family based.
- The public app does not yet expose a scalable growth IA.
- Current value proposition is still broader and more generic than the product strategy now requires.
- Booking trust is only implied, not clearly explained.
- There is no explicit "how booking reliability works" page or section with strong semantics.
- There is no industry page framework yet.
- There are no problem-solution, comparison, glossary, FAQ-cluster, or local-intent page families yet.
- Attribution is not visible as a public-surface design principle yet.
- Trust messaging is more operational than commercial:
  - it says the product is useful
  - it does not yet clearly teach buyers how BookedAI behaves when availability is verified versus not verified

### Current SEO / conversion issues

- Current sitemap is too small for long-term organic growth.
- Current page taxonomy does not yet support content scaling.
- Homepage title and description are serviceable, but still lean "AI receptionist" more than:
  - matching quality
  - booking trust
  - conversion into bookings and revenue
- Public routes are too shallow for:
  - industry capture
  - local service-intent capture
  - comparison intent capture
  - educational intent capture
- CTA hierarchy is still heavily weighted to generic trial/demo rather than visitor intent segments.

### Current mobile notes

- Mobile responsiveness is now a product-critical requirement, not just a landing-page quality note.
- CTA visibility should remain strong, but the main mobile goal is to keep the search field, shortlist, booking state, and next action visible without overload.
- Mobile users should not need to dig through long narrative sections before seeing the live BookedAI flow.
- Supporting narrative, SEO, trust, and education content should be reachable through menu and secondary surfaces rather than competing with the live search area on small screens.

## Section 2A — Governing public-product principles

The public growth app should now inherit these rules across homepage, landing experiments, SEO pages, and future surface extensions:

- the public homepage is a live revenue-capture surface first and a narrative surface second
- the public homepage is also the acquisition and orientation surface for the current responsive web app strategy
- high-intent visitors should reach search, shortlist, booking, and confirmation with as little friction and as few competing elements as possible
- supporting information should be distributed into menu layers, top-bar actions, bottom-bar support, and dedicated secondary pages when that preserves conversion focus
- mobile-first responsive behavior is mandatory for any route or component that can influence search, booking, payment, or lead recovery
- any redesign that adds weight to the homepage body must justify why that weight is better than giving the same space to search results, booking states, or conversion controls

### Confirmed assumptions

- No separate pricing route is currently confirmed in the public frontend runtime.
- No dedicated blog or resource route is currently confirmed in the repo.
- No dedicated industry pages are currently confirmed in the sitemap or public app.

## Section 3 — Public growth app strategy

### Role of the public app

The public growth app should be treated as:

- the top-of-funnel acquisition engine
- the SEO entry layer
- the lead capture layer
- the trust education layer
- the segmentation layer
- the attribution-preserving entrypoint into CRM and revenue lifecycle

It should not be treated as a brochure shell.

### Acquisition strategy

The acquisition layer should combine:

- high-conversion homepage
- industry landing pages
- problem-solution pages
- comparison pages
- long-tail FAQ and glossary content
- local-intent and service-intent pages where appropriate

### Conversion strategy

The public app should convert by matching visitor intent to the right CTA, not by forcing one action across the entire site.

Current homepage conversion rule:

- the search box and inline assistant are now the primary on-page conversion system for high-intent visitors
- public CTA language should stay consistent with the current runtime decision by pointing toward the live web app instead of implying a native-app-first product path
- future public-growth work must not regress the homepage back into a popup-first assistant assumption unless the requirement-side architecture docs are explicitly revised
- future public-growth work must not crowd the homepage body with secondary content that weakens the live search and booking area without an explicit source-of-truth update

Primary conversion flows should include:

- try the AI
- book a demo
- request a quote
- request consultation
- chat via website
- chat via WhatsApp
- explore vertical-specific fit

### Trust strategy

Trust should come from:

- explicit explanation of how BookedAI handles matching and booking certainty
- clear non-overpromising language
- deployment flexibility
- integration realism
- channel coverage
- lifecycle continuity from lead to follow-up

### Attribution strategy

The public app must preserve attribution across:

- page view
- CTA click
- form start
- form submit
- chat open
- chat lead capture
- demo request
- quote request
- future booking and payment linkage

Public design should visibly support this through:

- consistent CTA sources
- page family metadata
- conversion-point identification
- chat entry source tagging

## Section 4 — Information architecture

### Page map

The target IA should grow from the current single homepage into the following page families.

#### Core commercial pages

- Home
- Pricing
- Book Demo
- Contact / Consultation
- Industries
- Solutions / Use Cases
- Integrations
- Trust And Reliability
- How It Works
- FAQ
- Login / Get Started

#### Growth and SEO page families

- industry pages
- local pages
- service and booking-intent pages
- comparison pages
- problem-solution pages
- intent FAQ pages
- glossary and education pages
- resource or insights pages

#### Commercial trust pages

- How BookedAI Handles Booking Trust
- Billing and Payment Explained
- Privacy and Data Handling
- Integration and Deployment Modes

### Page family roles

- SEO pages:
  - industry
  - comparison
  - local
  - problem-solution
  - glossary
  - FAQ clusters
- Conversion pages:
  - home
  - pricing
  - book demo
  - contact / consultation
  - solution pages
- Trust pages:
  - trust and reliability
  - booking trust explanation
  - billing and payment explanation
  - integrations
  - privacy / data handling
- Nurture pages:
  - resources
  - blog / insights
  - educational FAQs
- Segmentation pages:
  - industries
  - use cases
  - deployment mode pages

### Internal linking direction

Internal links should evolve from a single homepage anchor model into a hub-spoke model:

- Home links to major commercial families
- Industry hub links to each vertical page
- Each industry page links to:
  - pricing
  - demo
  - trust page
  - relevant integrations
  - relevant problem-solution pages
- FAQ and glossary pages link upward to core commercial pages
- Trust pages link to booking-intent and deployment pages

## Section 5 — Homepage / landing architecture

### Recommended homepage architecture

#### 1. Hero

- Purpose:
  - communicate the real product in one screen
- Target user intent:
  - cold visitor, paid click, branded search, high-level SEO visitor
- CTA:
  - primary: `Try the AI`
  - secondary: `Book a demo`
  - tertiary text link: `How booking trust works`
- Trust role:
  - make clear this is not just a chatbot
- Conversion role:
  - immediate entry into chat or demo

#### 2. Problem / pain

- Purpose:
  - show the operational cost of missed leads, wrong matches, and uncertain booking
- Target intent:
  - visitors who feel pain but are not yet solution-aware
- CTA:
  - soft CTA to explore use cases
- Trust role:
  - empathy and operational realism
- Conversion role:
  - problem framing

#### 3. How it works

- Purpose:
  - explain the sequence:
    - understand request
    - match
    - check booking trust
    - route to next step
    - push lifecycle forward
- CTA:
  - `See booking trust in action`
- Trust role:
  - clarifies product mechanics without overloading detail
- Conversion role:
  - reduces ambiguity

#### 4. Core value pillars

- Pillars:
  - better matching
  - safer booking
  - faster conversion
  - lifecycle follow-up
  - flexible deployment
- CTA:
  - `Explore solutions`

#### 5. Booking trust section

- Purpose:
  - explicitly explain verified vs partner vs unknown
- CTA:
  - `See how booking trust works`
- Trust role:
  - critical
- Conversion role:
  - reduces skepticism and fear of overpromising

#### 6. Deployment modes

- Purpose:
  - show BookedAI can be:
    - standalone app
    - embedded website receptionist
    - plugin/integration mode
    - API/headless platform
- CTA:
  - `Find the right deployment mode`
- Conversion role:
  - lowers perceived implementation friction

#### 7. Industry use cases

- Purpose:
  - segment vertical demand quickly
- CTA:
  - `See your industry`
- SEO role:
  - supports future landing page families

#### 8. Integrations

- Purpose:
  - show operational fit
- CTA:
  - `See integrations`
- Trust role:
  - makes rollout feel real and practical

#### 9. Growth to revenue section

- Purpose:
  - explain traffic-to-lead-to-booking-to-revenue story
- CTA:
  - `See how BookedAI converts traffic`
- Conversion role:
  - especially strong for SME owners and operators

#### 10. Pricing teaser

- Purpose:
  - reduce hidden-cost anxiety
- CTA:
  - `See pricing`
  - `Request a quote`

#### 11. FAQ

- Purpose:
  - handle objections and support long-tail intent
- CTA:
  - soft CTA into demo/chat

#### 12. Final CTA

- Primary:
  - `Try the AI`
- Secondary:
  - `Book a demo`
- Tertiary:
  - `Talk to our team`

### Example homepage copy direction

- Headline direction:
  - `Match the right service. Guide the safest next step. Turn more enquiries into booked customers.`
- Subheadline direction:
  - `BookedAI helps service businesses capture demand, qualify real intent, explain booking options clearly, and route each customer to the right booking, callback, or payment path.`

## Section 6 — SEO architecture

### Page families

#### A. Industry pages

Examples:

- `/industries/swim-schools`
- `/industries/clinics`
- `/industries/salons`
- `/industries/trades`
- `/industries/tutoring`
- `/industries/child-activity-centres`

Search intent:

- vertical solution discovery
- commercial SaaS comparison
- operational pain plus solution

CTA strategy:

- book demo
- request consultation
- see how BookedAI works for this industry

Trust role:

- explains vertical-specific matching and booking-trust implications

#### B. Problem-solution pages

Examples:

- `/solutions/reduce-missed-bookings`
- `/solutions/prevent-overbooking`
- `/solutions/convert-website-visitors-into-bookings`

Search intent:

- pain-driven commercial research

CTA strategy:

- try AI
- book demo
- request quote

#### C. Comparison pages

Examples:

- `/compare/bookedai-vs-manual-reception`
- `/compare/bookedai-vs-generic-chatbot`
- `/compare/bookedai-vs-booking-form`

Search intent:

- bottom-funnel comparison

CTA strategy:

- book demo
- talk to team

#### D. FAQ and glossary pages

Examples:

- `/faq/how-does-booking-trust-work`
- `/faq/can-bookedai-book-directly`
- `/glossary/booking-confidence`

Search intent:

- informational with commercial support value

CTA strategy:

- trust-education pages should funnel to demo, chat, or trust explainer

#### E. Local-intent pages

Only where supported by real strategy and content quality.

Examples:

- `/locations/sydney`
- `/locations/perth`
- `/locations/melbourne`
- `/locations/brisbane`

These should be careful, useful, and not spammy.

### Technical SEO direction

- keep current homepage route stable
- expand page families incrementally
- define consistent titles:
  - industry pages: `AI Booking and Reception for [Industry] | BookedAI`
  - comparison pages: `BookedAI vs [Alternative] | Matching, Booking Trust, And Conversion`
  - problem pages: `How To [Outcome] | BookedAI`
- define consistent meta descriptions around:
  - matching quality
  - booking trust
  - conversion improvement
  - operational fit
- canonical logic:
  - every new page self-canonical by default
  - avoid duplicate near-me and location variants without unique value
- structured data direction:
  - `SoftwareApplication`
  - `FAQPage`
  - `BreadcrumbList`
  - `Article` for insights pages
  - `Product` or `Service` only where semantically correct
- local SEO:
  - location pages should be controlled and content-rich, not mass-generated thin pages

### Content scaling direction

Scale by page families, not by random pages.

Recommended order:

1. industry pages
2. trust / reliability page
3. problem-solution pages
4. comparison pages
5. FAQ cluster
6. insights / resources

## Section 7 — CTA / lead capture / chat entry strategy

### CTA taxonomy

- `Try the AI`
  - best for cold and curious visitors
- `Book a demo`
  - best for high-intent SME buyers
- `Request a quote`
  - best for custom-fit or multi-location operators
- `Talk to our team`
  - best for complex deployments
- `Chat on WhatsApp`
  - best for mobile-first immediate contact
- `See how booking trust works`
  - best for skeptical visitors and trust pages
- `Explore your industry`
  - best for segmentation pages

### CTA by visitor type

- Cold visitor:
  - `Try the AI`
  - `Explore your industry`
- High-intent visitor:
  - `Book a demo`
  - `Request a quote`
- SEO landing visitor:
  - industry CTA + trust CTA + consultation CTA
- Trust page visitor:
  - `See booking options`
  - `Talk to our team`
- Complex SME visitor:
  - `Request a quote`
  - `Book a demo`
- Mobile visitor:
  - `Try the AI`
  - `Chat on WhatsApp`

### Form strategy

Use forms when:

- visitor already has commercial intent
- enough value exists to justify higher-friction capture
- data needs CRM-ready structure

Preferred form types:

- demo request
- consultation request
- quote request
- industry-specific inquiry form

### Chat strategy

Chat should not be framed as generic support chat.

Preferred entry framing:

- `Describe what you need`
- `Find the right service or next step`
- `Check booking options`
- `Get a faster answer`

### WhatsApp strategy

WhatsApp should be a secondary but clear CTA for:

- mobile visitors
- visitors who prefer direct conversational contact
- service businesses already used to messaging-led conversion

### Attribution retention

Every CTA family should preserve:

- source
- medium
- campaign
- page slug
- content family
- CTA type
- CTA placement
- session / anonymous ID where available

## Section 8 — Booking trust messaging strategy

### Verified vs unverified

The public site should explain:

- verified availability means BookedAI has a stronger operational signal
- unverified availability means BookedAI should not overpromise a slot

### Partner booking

The site should say clearly:

- some providers are best booked through partner-controlled flows
- in those cases BookedAI routes users safely instead of pretending direct control

### Fully booked

The site should explain that when capacity is genuinely full:

- Book now may not appear
- alternatives may include:
  - request callback
  - join waitlist
  - try another time
  - use partner path

### Trust explanation approach

Create either:

- a homepage trust section plus
- a dedicated page: `How BookedAI Handles Booking Trust`

Suggested message pattern:

- `BookedAI is designed to guide customers to the safest next step, not to overpromise unavailable slots.`
- `When availability is verified, users can see stronger booking actions. When it is not, BookedAI can route to callback, partner booking, or confirmation-first flows.`

This is a conversion asset, not just a compliance note.

## Section 9 — Deployment mode page strategy

### Standalone

- Role:
  - for SMEs that want BookedAI as their main booking and lead-handling surface
- Messaging:
  - strongest operational control
  - best path when BookedAI is slot or workflow truth
- CTA:
  - `Book a demo`

### Embedded

- Role:
  - website chat and receptionist layer
- Messaging:
  - fast lead capture without replacing the full site
- CTA:
  - `See widget mode`

### Plugin / integrated

- Role:
  - for businesses with existing tools that need orchestration and capture
- Messaging:
  - integrate rather than rebuild
- CTA:
  - `See integrations`

### Headless / API

- Role:
  - advanced platform and partner use
- Messaging:
  - use BookedAI logic without forcing the default UI
- CTA:
  - `Talk to our team`

## Section 10 — Industry page strategy

### Vertical page framework

Each industry page should include:

- industry-specific pain points
- how matching works in that vertical
- booking trust implications
- lifecycle implications:
  - CRM
  - email
  - billing
  - reminders
- recommended deployment mode
- relevant integrations
- CTA tailored to industry maturity

### Segmentation approach

Priority verticals:

- swim schools
- clinics
- salons
- trades and field services
- tutoring and education
- child activity centres

Reason:

- these verticals have stronger booking, scheduling, follow-up, and lifecycle value

## Section 11 — Mobile-first public UX strategy

### Mobile conversion priorities

- clear headline in first viewport
- one dominant CTA plus one secondary CTA
- persistent chat or WhatsApp access
- short form sequences
- pricing blocks that collapse cleanly
- fast trust explanation above the fold or soon after

### Mobile trust priorities

- do not hide booking trust explanations only on desktop
- do not make partner booking logic feel like a dead end
- do not overload with too many equal CTAs
- make callback, waitlist, and booking-path explanations readable and tappable

## Section 12 — Public component / section system

### Reusable section families

- Hero section
  - role: primary positioning
  - SEO suitability: medium
  - mobile behavior: stack with one primary CTA
  - conversion role: highest
- Problem / pain block
  - role: pain framing
  - SEO suitability: medium
  - conversion role: warm-up
- How-it-works block
  - role: explanation
  - trust role: high
- Booking trust cards
  - role: explain verified / unverified / partner / callback logic
  - SEO suitability: high on trust pages
- Industry cards
  - role: segmentation
  - SEO suitability: high as link hub
- Integration grid
  - role: operational fit
  - trust role: high
- Pricing teaser
  - role: commercial qualification
- FAQ accordion or FAQ card grid
  - role: objection handling and long-tail coverage
- CTA strip
  - role: repeated conversion
- Comparison table
  - role: bottom-funnel decision support
- Local discovery cards
  - role: location page navigation
- Deployment mode cards
  - role: product fit framing

## Section 13 — Rollout strategy

### What to change first

1. upgrade homepage messaging in place
2. add explicit booking trust section
3. add CTA hierarchy refinements
4. add attribution-aware CTA taxonomy in docs and implementation plan
5. create first new page families:
   - industry pages
   - trust and reliability page
   - integrations page

### What not to break

- current homepage route
- current demo request flow
- current pricing consultation flow
- current AI booking assistant flow
- current floating assistant CTA
- current sitemap entries

### Safe migration approach

- keep `/` as primary commercial home
- add new routes incrementally
- update navigation gradually from anchor-only toward mixed navigation
- keep existing CTA triggers working while introducing clearer variants
- avoid changing endpoint behavior in this phase
- add internal links from homepage to new pages before doing heavier SEO scaling

### Pages to avoid changing too early

- current demo modal behavior
- current pricing capture behavior
- current booking assistant core frontend behavior

### Best early additions

- `/industries`
- `/industries/[vertical]`
- `/trust-and-reliability`
- `/integrations`
- `/solutions/[problem-solution]`

## Section 14 — Final recommendations

### Top priorities

- sharpen homepage positioning around:
  - matching quality
  - booking trust
  - revenue lifecycle
- add explicit booking trust messaging early
- build industry page family first
- build trust page and integrations page next
- make CTA taxonomy more intentional and attribution-aware

### Anti-patterns to avoid

- turning the site into a generic AI brochure
- removing current production conversion flows
- overbuilding visual system work before conversion work
- adding thin SEO pages with weak intent coverage
- hiding booking reliability nuance
- keeping every visitor on one generic CTA path

### What to implement next

- first safe public-site iteration:
  - homepage copy refinement
  - trust section addition
  - CTA label refinement
  - better nav strategy
- second iteration:
  - industries hub
  - 2 to 4 priority industry pages
  - trust and reliability page
  - integrations page
- third iteration:
  - comparison pages
  - problem-solution pages
  - FAQ / glossary clusters

## Confirmed current-repo references

- [frontend/src/apps/public/PublicApp.tsx](../../frontend/src/apps/public/PublicApp.tsx)
- [frontend/src/components/landing/data.ts](../../frontend/src/components/landing/data.ts)
- [frontend/src/components/landing/Header.tsx](../../frontend/src/components/landing/Header.tsx)
- [frontend/src/components/landing/Footer.tsx](../../frontend/src/components/landing/Footer.tsx)
- [frontend/src/components/landing/sections/HeroSection.tsx](../../frontend/src/components/landing/sections/HeroSection.tsx)
- [frontend/src/components/landing/sections/BookingAssistantSection.tsx](../../frontend/src/components/landing/sections/BookingAssistantSection.tsx)
- [frontend/src/components/landing/sections/PricingSection.tsx](../../frontend/src/components/landing/sections/PricingSection.tsx)
- [frontend/src/components/landing/DemoBookingDialog.tsx](../../frontend/src/components/landing/DemoBookingDialog.tsx)
- [frontend/index.html](../../frontend/index.html)
- [frontend/public/sitemap.xml](../../frontend/public/sitemap.xml)

## Assumptions

- No additional public page router beyond the current Vite SPA runtime is confirmed in the repo.
- No current blog, CMS, or content pipeline is confirmed in the repo.
- No existing attribution persistence on the frontend surface is explicitly confirmed from the public code read in this step.
- Current public SEO value is concentrated primarily on the homepage and a very small set of static pages.
