# BookedAI Unified Product Requirements Document

Date: `2026-04-24`

Status: `active consolidated baseline`

Latest phase-plan update: `2026-04-25`.

Latest roadmap and pitch architecture update: `2026-04-25`.

Latest public/product design requirement update: reviewed BookedAI tenant matches, starting with the `Co Mai Hung Chess Class` / Grandmaster Chess tenant, must remain inside the normal search-results list while exposing richer tenant capability signals. Search cards and selected-booking states must label the result as a verified BookedAI tenant and show compact capability chips for BookedAI booking, Stripe, QR payment, QR booking confirmation, calendar, email, WhatsApp Agent follow-up, and portal edit/revisit. The flow must not auto-focus booking just because a tenant match exists; booking starts only after an explicit `Book` action. Tenant-confirmed bookings must keep QR confirmation and the `portal.bookedai.au` link visible so customers can check, change, reschedule, or cancel safely after booking.

Latest search-card usability update: public/product results must include a visible thumbnail or branded preview in the top-left scan position, expose a Google Maps action for each physical place, and feel progressive under slower search by showing early matches and faster staged status copy while deeper maps, booking-path, and fit checks continue. Clarification and suggested next questions remain inside the BookedAI chat thread.

Latest WhatsApp customer-care update: configured WhatsApp inbound messages now run through a dedicated `BookedAI WhatsApp Booking Care Agent` for `bookedai.au`. The agent resolves returning customers against booking truth, answers all service questions related to already-booked records from the portal snapshot, and queues audited cancel or reschedule requests when the customer clearly asks to change an existing booking. Because WhatsApp Business verification is still a rollout blocker, the near-term customer channel is a personal WhatsApp QR-session bridge through Evolution API at `/api/webhooks/evolution`, supervised by the OpenClaw agent. The BookedAI WhatsApp identity is `+61455301335` with `info@bookedai.au`; cancel/reschedule requests must also confirm by email, mirror into CRM task state, and show in tenant booking dashboards. OpenClaw is the safe gateway/operator surface for this agent; the repo-owned agent manifest lives at `deploy/openclaw/agents/bookedai-whatsapp-booking-care-agent.json`, syncs into the OpenClaw runtime with `sync-openclaw-bookedai-agent`, and has a read-only `whatsapp-bot-status` check for gateway health, API health, active provider connectivity, and webhook reachability without sending customer messages. Meta/Twilio Business messaging remains the later verified provider path.

The active next-phase implementation plan now lives in
`docs/development/next-phase-implementation-plan-2026-04-25.md`.

Latest tenant access update: `tenant.bookedai.au` is now the Google-first tenant gateway, with explicit sign-in versus create-account intent, email-code fallback, and backend protection against accidental workspace creation during Google sign-in.

The next delivery wave should be read as:

- `Phase 17`: full-flow stabilization across pitch registration, product booking, Thank You return, and downstream automation
- `Phase 18`: tenant/admin revenue-ops action-ledger control and evidence visibility
- `Phase 19`: customer-care and status agent for returning booking, payment, subscription, and support questions
- `Phase 20`: widget/plugin runtime for SME-owned websites
- `Phase 21`: billing, receivables, subscription, and commission truth
- `Phase 22`: reusable multi-tenant templates after chess and Future Swim remain stable
- `Phase 23`: release governance, observability, rollback, and documentation sync hardening

The public roadmap and pitch must present that sequence visually, not only as internal planning text. The current pitch architecture visual should explain the system as:

1. customer surfaces: pitch, product, demo/widget, and portal
2. AI agent layer: search/conversation, revenue operations, customer-care/status, and policy gates
3. booking core: leads, matches, bookings, payments, and lifecycle action runs
4. operations truth: tenant Ops, admin Reliability, CRM/email/webhooks, audit ledger, and release gates

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

For the end-to-end execution plan covering Phase 0 through Phase 23 plus the post-Sprint-22 horizon, refer to `docs/architecture/bookedai-master-roadmap-2026-04-26.md`. The seven-lane review captured in `docs/development/full-stack-review-2026-04-26.md` is the canonical input for `Sprint 19 - 22`.

## 2. Product definition

### Product name

BookedAI

### Category

- AI revenue engine for service businesses
- booking, follow-up, and conversion automation platform
- multi-tenant search, booking, payment, and lifecycle system

### Core positioning

BookedAI turns missed service enquiries into booked revenue for service SMEs. It captures intent across web, search, chat, forms, calls, email, and messaging moments, then creates booking references, payment/follow-up posture, customer-care continuity, and measurable revenue evidence.

For investor and judging contexts, BookedAI should be framed as an AI Revenue Engine rather than a booking widget: an omnichannel agent layer that captures intent, creates booking references, tracks payment and follow-up posture, and records every revenue action in an auditable operating system.

The financial thesis is:

- existing SME demand leaks through slow replies, fragmented channels, abandoned bookings, unpaid follow-up, and unclear ownership
- BookedAI converts that leakage into traceable booking references, portal continuity, customer-care actions, tenant notifications, and revenue evidence
- monetization can combine setup fee, SaaS subscription, and performance-aligned commission or revenue share on booked revenue where appropriate

BookedAI should be built as a coordinated AI agent system with:

- a customer-facing `search and conversation agent` that captures intent, asks for missing context, ranks options, and moves the customer into booking or the correct next step
- a BookedAI-side `revenue operations agent` that monitors leads, bookings, payments, communications, CRM state, billing posture, retention risk, and service obligations across the full lifecycle

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

The product vision now explicitly includes:

- AI-led demand capture before booking
- AI-led revenue operations after lead capture
- AI-led retention and customer-care assistance after booking or subscription start

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

### Operating personas created by the platform

- customer-facing search/conversation agent: handles discovery, intake, clarification, shortlist, and booking progression
- revenue operations agent: handles follow-up, payment reminders, CRM sync, billing events, retention checks, and cross-system orchestration
- customer-care support agent: answers returning customer questions from chat, email, or phone-linked identity using the customer's current booking, payment, and lifecycle state

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

### AI system rule

The product should no longer be planned as one isolated booking assistant.

Requirement-side planning must now assume at least two coordinated AI layers:

1. a public and tenant-facing agent that captures and qualifies demand
2. a BookedAI operations agent that continues running after the first lead or booking event and can trigger follow-up, reminders, reporting, escalation, retention, and billing actions

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
- the system must return a shortlist with decision-ready metadata; when live ranking is slow, the UI should show first likely matches from available local/catalog context while authoritative live checks continue
- the same session must support search, shortlist review, booking continuation, and confirmation
- the UX must show professional in-progress states during matching
- when confidence is low or context is missing, the product should ask short follow-up questions or suggest nearby query refinements
- follow-up questions, secondary clarifications, and suggested next questions must stay inside the BookedAI chat conversation as interactive agent chips rather than appearing in a separate results-side questionnaire
- physical-place result cards must expose a Google Maps link. If the backend supplies a specific `map_url`, use it; otherwise build a Google Maps search URL from venue name, location, and service name so the customer can inspect the found place directly.
- every result card should reserve the top-left scan position for an image thumbnail when available, or a compact branded initials/preview fallback when no image exists
- result cards should be able to appear in useful batches while ranking continues; progress labels should advance fast enough that slow search feels active rather than stalled
- selecting a result should not force a detail popup or immediately jump the customer into a form; compact result actions should support provider link, detail popup, contact, phone/SMS where available, and an explicit `book this` action on one responsive row
- the customer detail form should appear only after the customer explicitly commits to book a selected result
- when a search returns a reviewed BookedAI tenant match, such as the chess tenant, the result must stay in the shortlist but add verified-tenant treatment: a compact `BookedAI tenant` or `Verified tenant` badge, a concise capability summary, and chips for Book, Stripe, QR payment, QR confirmation, calendar, email, WhatsApp Agent, and portal edit
- tenant-backed results must be visually distinct from public-web fallback results, but they must not bypass the compare/review step or force focus into booking before the user asks
- booking confirmation should expose durable booking references, a scan-ready QR code that opens `portal.bookedai.au` with the booking reference, and next-step visibility
- tenant-confirmed bookings must show the portal QR even if the backend does not provide a QR image URL, using a generated QR to the portal link as a fallback
- tenant confirmation copy must name payment posture clearly: Stripe checkout when ready, QR transfer/payment or manual follow-up when required, and no claim that payment is complete until the payment state says so
- the Thank You state should remain visible long enough for the customer to act, currently `16s`, while offering compact email, calendar, portal, and continue-chat actions before returning to the main search screen
- payment, email, SMS, WhatsApp, and CRM follow-up should run as best-effort post-booking automation without hiding customer-visible success
- WhatsApp follow-up for tenant-confirmed bookings should be framed as a continuation of the BookedAI booking-care agent, so the customer can ask questions or request changes by replying from the phone number used during booking

### Customer-facing agent requirements

The customer-facing AI agent must:

- capture user need through search-like input or multi-turn chat
- ask only the minimum useful follow-up questions required to improve booking quality
- understand whether the user wants discovery, quote, booking, reschedule, payment help, or status help
- transition smoothly between search UI and chat UI without losing context
- preserve identity, intent, and selected service context into the booking flow
- support customer re-entry through phone number, email, booking reference, or secure session context where appropriate
- support WhatsApp as a returning-customer channel when configured, using booking reference as the strongest identity anchor and phone/email only when they resolve to one safe booking
- answer WhatsApp booking, payment, support, academy/progress, cancellation, and reschedule questions from current booking/portal truth rather than from generic chat memory
- queue cancellation or reschedule requests as auditable portal/customer-care requests when the WhatsApp message is clear, while telling the customer that the provider/team must still review the change
- send or record an email confirmation and CRM task mirror after WhatsApp-driven cancellation or reschedule requests, then expose the request posture to tenant dashboards

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
- search loading states should explain progress, invite missing context when useful, and keep useful interim results visible instead of leaving the customer waiting on a blank search state
- search result presentation must prioritize direct inspection: thumbnail/preview, Google Maps, provider/source, detail popup, and booking action should be reachable without losing the chat context

### Search agent scope

The search and conversation agent must be able to:

- run query understanding
- collect missing detail through chat
- choose between tenant truth, provider truth, and public-web fallback
- hand off into booking, quote, callback, or support flow
- record structured lead context for downstream revenue operations

## 8. AI agent system requirements

### Required AI agent classes

BookedAI must support these agent classes as first-class product capabilities:

1. `Search and Conversation Agent`
2. `Revenue Operations Agent`
3. `Customer Care and Status Agent`

### Search and Conversation Agent

Responsibilities:

- search intake
- requirement clarification
- shortlist generation
- quote or booking-path recommendation
- booking handoff
- pre-booking trust explanation

### Revenue Operations Agent

Responsibilities:

- detect new leads and incomplete bookings
- decide next best action by tenant policy and lifecycle state
- trigger lifecycle email, SMS, WhatsApp, CRM sync, webhook callbacks, and operator tasks
- monitor unpaid bookings, overdue invoices, subscription renewals, and churn-risk signals
- summarize financial posture, pending receivables, and action queues for tenants and admins
- prepare or trigger tenant billing, commission calculation, invoice reminders, and monthly summary emails
- escalate to human operators when confidence, trust, compliance, or payment risk requires manual review

### Customer Care and Status Agent

Responsibilities:

- identify returning customers by verified phone number, email, booking reference, or authenticated session
- answer status questions using current booking, payment, communication, CRM, and lifecycle state
- support reschedule, cancel, payment follow-up, and support-case guidance
- avoid fabricating unsupported status and instead show queued, pending, awaiting confirmation, or manual-review states truthfully

### Agent orchestration rules

- every agent action must be grounded in tenant-scoped data and current lifecycle state
- agent actions should produce auditable event records
- revenue-operations actions should be inspectable as a ledger and move through truthful states such as `queued`, `in_progress`, `sent`, `completed`, `failed`, `manual_review`, or `skipped`
- queued revenue-operations actions should have a tracked runner path that records `job_runs` evidence and escalates unsupported or unsafe actions to manual review rather than pretending provider delivery happened
- high-risk actions must support approval, manual-review, or policy gating
- cross-channel actions must remain idempotent and replay-safe
- the system must preserve event lineage from search intent through retention action

### Agent-to-agent handoff contract

The AI agents in BookedAI must be designed as a connected system, not as isolated assistants.

Required handoff order:

1. `Search and Conversation Agent`
   - captures intent
   - asks for missing context
   - creates structured lead or assessment context
   - hands off `intent + identity + selected option + confidence + next step`
2. `Revenue Operations Agent`
   - receives structured lead or booking context
   - decides the next operational action
   - triggers communication, CRM, payment, billing, or retention workflows
   - hands off verified current-state context when the customer comes back later
3. `Customer Care and Status Agent`
   - receives the current lifecycle state from revenue operations records
   - answers status questions
   - resolves support, payment-help, reschedule, or retention conversations
   - can hand back into revenue operations when a new action must be executed

### Shared agent context requirements

All agents must share or exchange:

- tenant identity
- customer identity
- source and channel
- active lifecycle state
- confidence and trust state
- action history
- pending tasks
- escalation state

## 9. Booking, payment, and portal requirements

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
- pause and downgrade flows where subscription or recurring-program logic applies
- cancel flows where supported
- payment follow-up visibility
- progress-report and next-class visibility where the tenant sells recurring learning or membership programs
- customer-safe continuation after the initial booking session

### Returning-customer support requirements

The portal and customer-support layer must support:

- lookup by verified email, phone, secure magic-link, or booking reference
- current-status responses for bookings, payments, reminders, subscriptions, invoices, and support requests
- AI-assisted chat that uses the real current customer state rather than a generic FAQ-only model
- safe escalation into operator review when identity, payment, or schedule state is uncertain

## 10. Tenant product requirements

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
- revenue operations and action queue
- retention and churn-risk view
- customer communications timeline
- receivables and auto-reminder posture

### Tenant role rules

- `tenant_admin` controls core workspace, team, and billing posture
- `finance_manager` can access finance-oriented billing actions
- `operator` can manage day-to-day operational content and catalog actions where approved
- restricted roles must see explicit read-only posture instead of silent failure

### Tenant revenue-ops requirements

Tenants must be able to see and control:

- new leads requiring action
- leads stuck before booking
- bookings awaiting payment
- subscriptions approaching renewal
- overdue invoices and failed collection attempts
- churn-risk or retention-action recommendations
- outbound communication history across email, SMS, WhatsApp, and CRM-linked activity
- AI-generated action suggestions with tenant-safe approve, reject, or auto-run policy controls

## 11. Embedded widget and plugin requirements

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

### Webhook and API trigger requirements

Embedded, tenant, and admin deployments must support webhook and API-driven automation for:

- lead created
- booking created
- booking updated
- payment intent created
- payment paid
- payment overdue
- subscription renewal upcoming
- subscription renewal failed
- invoice issued
- invoice overdue
- CRM sync requested
- CRM sync failed
- communication delivered or failed
- retention-risk detected

## 12. Admin product requirements

### Admin surface role

`admin.bookedai.au` is the internal operator, oversight, and support control plane.

### Core admin requirements

- enterprise-style login and navigation
- menu-first information architecture
- `admin.bookedai.au` must proxy `/api/*` to the backend before SPA fallback so login and admin reads cannot be intercepted by the static Vite shell
- the shipped admin shell should use a compact sidebar workspace menu with grouped operator lanes, keeping the active workspace content visible without a large card selector pushing it down the page
- tenant directory plus deeper tenant workspace
- tenant branding and HTML content editing
- tenant role and permission management
- full tenant catalog and service CRUD support
- billing support and payment investigation
- integrations health and reconciliation visibility
- messaging and reliability visibility
- audit and activity review
- platform settings and support-safe controls
- cross-tenant revenue-ops oversight
- tenant billing and commission oversight
- action queue review for AI-triggered automations
- webhook and integration-trigger investigation

### Admin support and safety rules

- cross-tenant support access must be audited
- read-only support mode must block mutation actions
- support context should remain visible when moving between investigation and linked tenant views
- the product should prefer investigation-first tooling over hidden impersonation

### Admin revenue-ops requirements

Admin must be able to inspect:

- which AI-triggered actions were run, skipped, failed, or escalated
- tenant receivables, reminders, renewal posture, and collection-risk states
- CRM sync backlog and webhook-trigger backlog
- lifecycle communication performance by channel
- tenant-level revenue summaries, commission posture, and billing events

## 13. CRM, communications, and lifecycle requirements

BookedAI must connect revenue operations beyond the first booking.

### CRM and communications requirements

- local-first lead and booking records remain the operational ledger
- CRM sync should enrich the lifecycle when configured, not replace local truth
- email, SMS, and WhatsApp should operate through explicit provider-safe abstractions
- sync and communication states must support pending, retrying, manual review, failed, and synced-style visibility where relevant
- lifecycle automation should cover acquisition, booking, payment, reminder, confirmation, thank-you, and retention cases

### Revenue-operations lifecycle requirements

The revenue operations layer must support:

- lead qualification follow-up
- quote and callback reminders
- booking confirmation and pre-appointment reminders
- post-booking payment capture or payment reminder flows
- invoice issuance and overdue reminder flows
- subscription renewal and failed-payment rescue flows
- retention signals such as inactivity, missed sessions, downgrade requests, churn-risk, and win-back outreach
- automated tenant summaries and operator summaries by configured cadence

### Trigger and orchestration requirements

BookedAI must support trigger execution from:

- internal lifecycle events
- external webhook callbacks
- admin or tenant manual actions
- scheduled jobs
- CRM feedback events
- payment-provider events
- communication delivery events

### Customer-state response requirements

When a customer contacts BookedAI through chat, email, or a phone-linked channel, the system should:

- identify the customer safely
- load current lead, booking, invoice, subscription, and communication context
- answer based on the real current state
- propose the correct next action, such as pay now, confirm, reschedule, wait for approval, or contact support
- append the interaction back into the lifecycle record

## 14. Analytics and reporting requirements

BookedAI must show business outcome, not only workflow activity.

### Reporting requirements

- expose revenue won, pending, missed, and recoverable views
- preserve source attribution from acquisition through booking and payment
- support tenant and admin visibility into conversion, booking trust, payment, CRM, and communication outcomes
- make monthly value legible inside the tenant product
- provide dashboards for growth, product, operations, finance, and tenant views over time

### Agent-performance reporting requirements

The reporting layer must also expose:

- search-agent conversion and fallback quality
- revenue-ops agent action counts and success rates
- communication-trigger performance by channel
- overdue recovery and retention recovery outcomes
- tenant billing summaries, commission summaries, and summary-email delivery posture

## 15. Pricing and monetization requirements

### Official commercial model

- setup fee
- performance-aligned commission

### Pricing rules

- public positioning must present BookedAI as outcome-aligned rather than commodity SaaS
- pricing explanation should connect directly to bookings, revenue, and measurable value
- tenant and admin surfaces must support the operational realities of setup fee, revenue tracking, commission visibility, and billing follow-up

### Billing automation requirements

The product must support:

- tenant fee calculation and commission calculation from agreed billing rules
- tenant invoice generation and reminder cadence
- automated summary email dispatch to tenants
- revenue and receivable summaries visible to tenants and admins
- policy-based auto-reminder and escalation for unpaid tenant fees

## 16. Demo and vertical-template requirements

The current demo direction is broader than a generic booking proof.

### Canonical demo rule

`demo.bookedai.au` should become the first-minute proof of the full BookedAI revenue engine, not only a search-and-booking chat demo.

The demo must now make the dual-agent architecture obvious:

- one agent captures customer need and gets the booking or recommendation started
- another agent keeps revenue operations moving through payment, CRM sync, reminder, report, retention, and billing follow-up

### Chess-first implementation rule

The first full connected-agent implementation should be the chess academy flow.

Chess is now the required priority case for:

- agent-to-agent orchestration
- assessment-led intake
- placement and subscription logic
- parent-facing customer-care status handling
- retention and billing follow-through

### Current vertical template rule

The `Grandmaster Chess Academy` flow is the first reusable vertical template, not a one-off branch.

### Required academy-proof loop

The demo direction should prove:

`intent -> assessment -> placement -> booking -> payment -> class -> coach input -> AI report -> parent follow-up -> monthly billing -> retention action`

The same implementation pass must also prove:

- `portal.bookedai.au` can reopen that academy booking with truthful progress status
- parent-facing report preview survives from demo booking into portal continuation
- parent support actions include `reschedule`, `pause`, `downgrade`, and `cancel` through auditable request-safe flows
- customer-care status handling uses the same live academy state instead of a disconnected FAQ surface
- academy student, report, enrollment, and retention state survive in tenant-scoped snapshot read models instead of existing only inside one booking record

### Vertical-template requirements

- assessment, placement, report, billing, and retention logic should remain tenant-configurable
- tenant analytics must stay partitioned
- parent or customer portal flows must resolve through tenant-safe context
- the demo must prove reusable architecture for later verticals, not only chess
- academy persistence may start snapshot-first with jsonb-heavy read models, but the platform must expose stable student and portal-request read seams that later tenants can reuse

### Pitching-video proof requirements

Pitch, demo, and promo-video materials should now explicitly show:

- customer search/chat intake
- AI understanding and shortlist or booking handoff
- automated lead follow-up and reminder flow
- CRM sync and webhook-trigger orchestration
- payment or overdue reminder flow
- tenant financial summary and billing visibility
- retention or customer-care response using live customer status

## 17. Non-functional requirements

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
- replay and audit coverage for agent-triggered lifecycle actions
- safe scheduling and idempotency for reminder, billing, and retention jobs

## 18. Success metrics

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
- lead-to-action latency
- automated reminder success rate
- retention save rate
- customer-support deflection rate with truthful status handling

### Operational metrics

- CRM sync success rate
- communication delivery success rate
- admin support resolution speed
- tenant onboarding and publish readiness
- tenant billing collection rate
- webhook trigger success rate
- AI action escalation rate versus auto-resolution rate

## 19. Delivery priorities

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

### Priority 6

Implement the revenue operations agent as a first-class product layer for lead follow-up, payment reminders, CRM/webhook orchestration, tenant billing, financial summaries, and retention handling.

### Priority 7

Implement the first fully connected agent system on the chess academy case before generalizing the pattern to other tenants.

## 20. Delivery phases

### Phase A - Customer-facing AI search and booking agent

- harden search/chat intake
- structured need capture
- shortlist and booking handoff
- quote, callback, and booking-path branching
- chess case is the first required implementation target for this phase

### Phase B - Lead-to-booking revenue operations agent

- action queue for new leads and incomplete bookings
- follow-up orchestration across email, SMS, WhatsApp, and CRM
- webhook and event-trigger execution
- tenant and admin action visibility
- chess case is the first required connected handoff target from Phase A

### Phase C - Payment, billing, and receivable automation

- payment follow-up states
- invoice and receivable reminders
- tenant billing and commission calculation
- tenant financial summary emails
- chess subscriptions and parent billing are the first required implementation case

### Phase D - Customer care and retention agent

- returning-customer identity and status chat
- reschedule, cancel, and payment-help flows
- churn-risk detection and retention actions
- subscription and renewal rescue automation
- chess parent support, class change, pause, and renewal rescue are the first required implementation case

### Phase E - Admin and reporting hardening

- cross-tenant action oversight
- audit, replay, and escalation controls
- financial and lifecycle reporting
- pitch/demo proof aligned to real system behavior

### Next-phase execution priority

The next implementation wave should execute in this order:

1. connect the three agents end-to-end for chess
2. prove chess assessment -> placement -> booking -> subscription -> report -> retention loop
3. harden operator visibility, billing, and customer-care support for chess
4. only then extract the same connected-agent pattern into reusable multi-tenant templates

## 21. Documentation rule

When requirement-side meaning changes:

1. update `project.md` first if project scope or direction changed
2. update this `prd.md`
3. update `docs/architecture/bookedai-master-roadmap-2026-04-26.md` if the change affects phase scope, sprint sequencing, or the seven-lane review backlog
4. update the specialized requirement document
5. update `docs/development/implementation-progress.md`
6. update the matching roadmap or sprint artifact

## 22. Summary statement

BookedAI is a multi-tenant AI revenue engine for service SMEs. Its current requirement baseline is a search-first, booking-truthful, payment-aware, follow-up-capable product system spanning public acquisition, tenant operations, internal admin, embeddable widget/plugin installs, portal continuation, and reusable vertical revenue-engine templates.
