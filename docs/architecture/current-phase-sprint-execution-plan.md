# BookedAI Current Phase and Sprint Execution Plan

Date: `2026-04-25`

Document status: `active execution baseline`

## Purpose

This document converts the current repository truth into one execution plan that is:

- phase-aware
- sprint-aware
- explicit about what is already implemented
- explicit about what remains incomplete
- explicit about what should happen next

This document should now be used as the shortest planning bridge between:

- requirement-side product and architecture documents
- implementation-side sprint execution documents
- the actual checked-in codebase

It exists because the project is no longer in a planning-only state.

BookedAI already has substantial public, backend, tenant, admin, deploy, migration, and release-gate implementation in code, so the next planning baseline must start from what already exists instead of re-planning from a greenfield assumption.

This execution baseline now also assumes a dual-agent product direction:

- a customer-facing `search and conversation agent`
- a BookedAI-side `revenue operations agent` that continues from lead through retention, billing, reminders, CRM sync, and action orchestration

## Content, Wording, And Layout Execution Overlay

All active Phase/Sprint `17-23` work should now inherit this content-planning overlay:

- open docs and user-facing plans with the customer problem, not the implementation module
- use the SME message `Never lose a service enquiry to slow replies again` for public/buyer first-view copy
- use the investor/judge message `an omnichannel agent layer that captures intent, creates booking references, tracks payment and follow-up posture, and records every revenue action in an auditable operating system` when explaining the big-tech/startup ambition
- use the plain-English message `turn missed service enquiries into booked revenue` before using `AI Revenue Engine`
- keep the layout order consistent: problem, promise, shipped proof, next workflow, owner phase/sprint, acceptance gate, launch/email/support follow-up
- turn every content change into a measurable hypothesis with audience, metric, threshold, and hold condition
- use proof verticals as launch assets only after soft-launch UAT has evidence; external hard-launch copy should reuse live screenshots, references, portal proof, and channel-care proof
- keep lifecycle email planning attached to booking truth: confirmation, portal revisit, abandoned booking recovery, tenant revenue proof, and support escalation
- use customer-safe wording for degraded providers: `queued`, `manual review`, `request received`, or `support follow-up`, not fake completion
- keep financial clarity explicit for judges and investors: setup fee, SaaS subscription, performance-aligned commission/revenue share where appropriate, and proof through booking references, payment posture, tenant Ops, portal reopen, and audit/action evidence

The current priority content hypotheses are:

- at least `12%` of homepage visitors who start a search open a result detail or select a result in the same session
- at least `25%` of customers who receive a booking reference reopen the portal within `7 days`
- at least `40%` of tenant admins seeing the `revenue_ops` variant open an operational panel before leaving
- at least `15%` of warm proof-vertical email recipients click through to a live booking or register-interest path

Latest next-phase update from `2026-04-25`:

- `2026-04-26` architecture/execution lock: BookedAI is now documented as one end-to-end AI Revenue Engine with customer acquisition surfaces, customer action channels, tenant surfaces, operator surfaces, FastAPI/backend contracts, revenue core, Messaging Automation Layer, data/integration rails, and governance/release gates. The active urgent execution order is UI/UX stabilization first, the standard booking flow second, and Messaging Automation Layer consolidation third.
- The standard booking flow is now the sprint-level journey to preserve across all channels: `Ask -> Match -> Compare -> Book -> Confirm -> Portal -> Follow-up`. No surface should skip explicit booking intent, hide the durable booking reference, bypass the QR/portal handoff, or pretend that request-safe lifecycle actions completed instantly.
- The active sprint map is now read as Sprint `17-23`: Sprint `17` stabilizes UI/UX and booking confirmation, Sprint `18` makes revenue-ops actions inspectable, Sprint `19` unifies customer-care messaging, Sprint `20` ships widget/plugin runtime, Sprint `20.5` adds wallet and Stripe return continuity, Sprint `21` closes billing/receivable truth, Sprint `22` extracts reusable tenant templates, and Sprint `23` enforces release governance and scale hardening.
- Product requirement message added on `2026-04-26`: `BookedAI connects every customer message - WhatsApp, SMS, Telegram, email and web chat - into one AI Revenue Engine that captures intent, creates booking paths, supports payment and receivable follow-up, and records customer-care actions with operator-visible revenue evidence.`
- The current Phase/Sprint plan now treats this as the cross-phase execution thread: Phase 19 normalizes omnichannel message intake and care policy, Phase 20 distributes web chat/widget entry, Phase 21 closes payment/receivable continuity, Phase 22 packages reusable retention templates, and Phase 23 release-gates the whole capture-to-retention loop.
- BookedAI-managed customer booking support/contact defaults are now `info@bookedai.au` and `+61455301335` for Telegram, WhatsApp, or iMessage; this is the fallback for customer-booking channels even when provider catalog rows include separate contact details.
- `2026-04-26` Messaging Automation Layer foundation has been added: a shared `MessagingAutomationService` now owns customer-message policy across channels, the customer-facing agent name is `BookedAI Manager Bot`, a separate customer-facing BookedAI Telegram bot is the first generalized webhook at `/api/webhooks/bookedai-telegram`, WhatsApp inbound processing now calls the same service instead of keeping channel-specific agent logic in the route handler, and Telegram now covers service search plus first chat booking-intent capture from `Book 1` style replies. Website chat now follows `Website Chat UI -> /api/chat/send -> BookedAI AI Engine -> web response` and is allowed to search all BookedAI catalog data plus public-web expansion, while Telegram follows `Telegram Bot -> /api/webhooks/telegram -> BookedAI AI Engine -> Telegram sendMessage` and is treated as a private customer thread whose booking-care answers require booking reference or safe phone/email identity. Telegram search replies now store the bookedai.au chat-compatible response shape and use native inline result controls: full results, per-option view, per-option book, and `Find more on Internet near me` expansion through the BookedAI service layer. This customer bot is not the OpenClaw/operator Telegram bot used for programming, deploy, or repo administration.
- Telegram customer booking continuity now treats active-order search as a confirm-first state: when a returning customer asks for another option, `BookedAI Manager Bot` shows the current `portal.bookedai.au` order and QR, asks what should happen with the existing booking, then offers BookedAI.au search, Internet expansion, current-booking change, and return-to-order controls.
- Telegram customer presentation now uses HTML-safe rich text and inline keyboard actions for the normal BookedAI Manager Bot flow, so service results and booking/order handoffs render as compact Telegram-native action cards instead of long plain-text blocks.
- `2026-04-26` public/pitch video replacement has been refreshed: `bookedai.au` and `pitch.bookedai.au` now point their native pitch video embeds and direct video links to `https://upload.bookedai.au/videos/2cc8/fxu3H6DZDcFOvpjc9UlOmQ.mp4`, with direct byte-range media verification returning `206 video/mp4`.
- `2026-04-26` tenant A/B acquisition telemetry has been implemented for the first tenant UAT experiment: `tenant.bookedai.au` supports `tenant_variant=control|revenue_ops`, persists the assignment, changes the gateway headline for the revenue-operations variant, and emits tenant acquisition events for variant assignment, auth mode, Google/email-code intent, panel navigation, and mobile detail expansion.
- `2026-04-26` product UAT polish has been applied to the product runtime: `product.bookedai.au` now carries semantic heading landmarks, accessible names for icon-only controls, a full-width mobile prompt layout instead of a cropped carousel, `Price TBC` posture for zero/unknown prices, customer-safe automation warning copy, and the `bookedai-au` tenant runtime context needed for downstream revenue-ops handoffs.
- `2026-04-26` homepage shortcut search speed has been improved for proof vertical discovery: Future Swim, Co Mai Hung Chess, and WSTI AI Event shortcuts now use exact search terms and the homepage runtime shows fast-preview results immediately from catalog/shortcut knowledge while live ranking and booking-path checks continue. Broad `near me` searches still require explicit location context before shortcut results can display.
- the latest product/public search refinement keeps search results as the active surface after ranking: no automatic jump into booking, compact result cards for scanning, detail popup for full context, and explicit `Book` before customer details open
- reviewed tenant matches must still live inside the same search-results surface; for chess tenant results, the card and selected-booking state show verified BookedAI tenant posture plus BookedAI booking, Stripe, QR payment/confirmation, calendar, email, WhatsApp Agent, and portal edit support
- follow-up questions and suggested next prompts belong inside the BookedAI chat conversation as interactive chips so clarification continues with the customer-facing agent instead of appearing as a disconnected panel
- the immediate execution plan after the full-flow QA pass is now documented in `docs/development/next-phase-implementation-plan-2026-04-25.md`
- current closeout is `Phase 17 - Full-flow stabilization`, covering pitch package registration, product booking, payment-intent preparation, communication best-effort work, and a persistent portal-first Thank You confirmation that does not auto-return to the main BookedAI screen
- the product/public booking runtime should now treat slow matching as a progressive-search problem: show first useful local/catalog matches while live ranking continues, keep refinement suggestions visible in chat, and keep the user informed with active status copy
- result selection and booking commitment are separate UX states: select marks a result active, detail opens from the detail icon, and the customer form opens only after an explicit `Book` action
- product assistant event selections are now part of the same stabilization baseline: choosing an event posts a real `/booking-assistant/session` request with synthetic `event:<url>` identity plus event metadata, and the backend must preserve that as an attendance-request confirmation path without pretending the flow is a normal Stripe-backed service booking
- confirmation must be portal-first: show booking reference, QR to `portal.bookedai.au`, compact email/calendar/chat/home actions, and a thank-you message that stays visible until the customer chooses another action
- `portal.bookedai.au` now inherits that portal-first confirmation baseline as a real customer command center: lookup, booking/payment/support status, provider/customer detail, academy progress, timeline, and request-safe action rail must remain cohesive across desktop and mobile
- the next implementation sequence is now `Phase 18` revenue-ops ledger control, `Phase 19` customer-care/status agent, `Phase 20` widget/plugin runtime, `Phase 21` billing and receivables truth, `Phase 22` reusable tenant templates, and `Phase 23` release governance
- the public brand/menu and live booking lane were re-checked after the uploaded logo rollout: demo/product/pitch/tenant now render without horizontal overflow on mobile and desktop, the customer-agent live-read path falls back to the v1 matching/search contract when needed, and the live stack health gate passed after deployment
- the pitch image layer now uses local optimized WebP assets for the uploaded logo, chess proof, final contact proof, and team imagery, keeping the visual redesign intact while avoiding multi-megabyte upload originals during production page load
- `admin.bookedai.au` login recovery is now part of the current stabilization baseline: the admin host must proxy `/api/` to backend before frontend SPA fallback, the dedicated admin hostname must resolve frontend API calls to same-origin `/api` even when a global `VITE_API_BASE_URL` exists, and the shipped shared-frontend admin shell now uses a compact sidebar workspace layout grouped by `Operate`, `Tenants`, `Revenue`, and `Platform`
- `admin.bookedai.au` has also received the follow-up investor/SME polish from the full UAT review: mobile header actions are calmer, booking search/table content stays contained, KPI cards explain revenue signals, and Reliability speaks in product-facing AI quality/automation language instead of prompt-internal labels
- `tenant.bookedai.au` login is now part of the same stabilization baseline: the shipped tenant gateway is Google-first with email-code fallback, create-account is explicit, and Google sign-in no longer silently creates a tenant workspace when no active membership exists
- the tenant live QA baseline now also includes `future-swim` workspace stability: audit-log nullable filters and revenue-metrics day windows are asyncpg-safe, the ready workspace no longer violates React hook ordering after loading/error states, and live API/browser checks pass for the shared gateway and tenant workspace
- the pitch and roadmap now carry the current architecture and phase plan as user-visible code, not just docs: pitch shows the simplified `customer surfaces -> AI agents -> booking core -> operations truth` map, and the roadmap dataset exposes Phase/Sprint `17-23` for stabilization, revenue ops, customer care, widget runtime, billing truth, templates, and release governance
- Phase 19 has now started through WhatsApp customer-care: configured inbound WhatsApp messages can resolve the correct booking, answer from portal booking/payment/support truth, and queue audited cancel or reschedule requests when the customer clearly asks to change an existing booking
- Phase 19 WhatsApp transport keeps Meta/WhatsApp Cloud API as the intended verified-business path for `+61455301335`, while the near-term live fallback is the Evolution API personal WhatsApp QR-session bridge until business verification is complete
- `2026-04-26` outbound provider follow-up confirmed backend payload handling is no longer the primary blocker: Evolution v2 expects `text`, the backend now has a guarded legacy retry, and live readiness is blocked by instance `bookedai61481993178` staying in `connecting` state rather than `open`
- the latest operator override temporarily removes Evolution from the outbound path, so the live transport order is Meta/WhatsApp Cloud first and Twilio second; current provider probes show Meta send blocked by `Account not registered` and Twilio blocked by `401 Authenticate`
- BookedAI email sender identity is now standardized on `info@bookedai.au`; the backend defaults `EMAIL_SMTP_USERNAME` and `EMAIL_SMTP_FROM` to that address, and bookedai.au portal/support fallbacks use the same address for customer-visible email continuity
- `2026-04-26` source review security hardening added HTML-safe confirmation email rendering and Phase 23 release-gate fixtures: customer/provider-controlled confirmation values are escaped before entering HTML, support `mailto:` links are encoded, confirmation CTA links must be `http` or `https`, provider URLs in Messaging Automation Telegram/chat responses are allowlisted to `http`/`https`, and the root gate now runs chat-send, Telegram, WhatsApp, and dedicated security fixtures before promotion.
- `2026-04-26` homepage service-booking email alignment closed a remaining provider-email leak in the legacy `/booking-assistant/session` path: public homepage/product service bookings now use `BOOKING_BUSINESS_EMAIL` / `info@bookedai.au` for confirmation copy, internal lead notification, follow-up mailto links, response `contact_email`, and workflow metadata. When the selected service is tenant-owned and stores a tenant email, BookedAI CCs that email on the internal lead notification and also creates a Messaging Automation Layer tenant notification with Telegram as the default tenant channel.
- Phase 19 now also has its first portal-native care turn: `portal.bookedai.au` can answer returning-customer payment, class/report, support, and lifecycle-action questions from booking-reference anchored portal truth, recent revenue-ops action runs, and request-safe next actions
- the next operational step is now in place: portal care-turns with clear human-support/escalation or broken payment-link intent create a `support_request` audit/outbox case that admin Billing Support can review or escalate
- OpenClaw runtime-admin repairs are now part of the operator reliability lane: `python3 scripts/telegram_workspace_ops.py fix-openclaw-approvals` restores durable exec approvals when `allow-always` fails because the effective policy is still `ask: always`
- The same OpenClaw operator reliability lane now includes `python3 scripts/telegram_workspace_ops.py enable-openclaw-full-access` for trusted webchat/Telegram full-control mode when the operator explicitly wants OpenClaw to run host exec without per-command approval prompts
- `2026-04-26` cross-stack review integration: the seven-lane review (architecture+UAT, frontend UI/UX, corporate/business, backend, API+integrations, DevOps, conversational chat) is now captured in `docs/development/full-stack-review-2026-04-26.md`. Findings have been mapped onto the existing `Phase 17-23` model without changing the phase boundaries; the new sprint sequencing for `2026-04-27 → 2026-05-24` (Sprint 19 `Stabilize and Sign`, Sprint 20 `First Real Revenue Loop`, Sprint 21 `Refactor and Coverage`, Sprint 22 `Multi-tenant and Multi-channel`) inherits the same phase model. The review also documents the canonical A/B testing matrix (acquisition, conversion, retention, conversational, tenant) using the existing `tenant_variant`/`portal_variant` telemetry pattern.
- `2026-04-26` cross-stack review P0 backlog now feeds the urgent execution lock: portal `v1-*` snapshot 500 fix, WhatsApp provider posture decision, Telegram secret-token plus Evolution HMAC webhook verification, inbound webhook idempotency, public-route `actor_context.tenant_id` validator, GitHub Actions CI pipeline, expanded `.env.production.example` with checksum guard, and OpenClaw root/Docker-socket scope reduction must close before `2026-05-03` and are tracked under `Phase 17`, `Phase 19`, and `Phase 23` respectively in `docs/development/full-stack-review-2026-04-26.md`.

## Source-of-truth inputs

This execution baseline inherits from:

- `docs/architecture/bookedai-master-prd.md`
- `docs/architecture/implementation-phase-roadmap.md`
- `docs/architecture/coding-implementation-phases.md`
- `docs/architecture/user-surface-saas-upgrade-plan.md`
- `docs/development/homepage-pitch-realignment-plan-2026-04-23.md`
- `docs/development/public-search-booking-resilience-ux-2026-04-23.md`
- `docs/architecture/phase-3-6-detailed-implementation-package.md`
- `docs/architecture/phase-7-8-detailed-implementation-package.md`
- `docs/architecture/phase-9-detailed-implementation-package.md`
- `docs/architecture/mvp-sprint-execution-plan.md`
- `docs/development/implementation-progress.md`
- `docs/development/project-plan-code-audit-2026-04-19.md`
- `docs/development/bookedai-chatbot-landing-implementation-plan.md`
- `docs/development/bookedai-sample-video-brief.md`
- `docs/development/full-stack-review-2026-04-26.md`

## Current implementation baseline

As of `2026-04-23`, the codebase already includes:

- a real public homepage plus pitch application pair, now being actively re-split into a lighter product-first homepage and a deeper narrative pitch surface
- an explicit public frontend runtime decision that the responsive web app is the current primary product surface, with native mobile deferred to a later phase
- a real public search-first application still available as deeper routed runtime inventory
- a public booking lane that now has to be treated as both a resilience lane and a UX lane: user-facing booking submit must survive degraded v1 writes, and slow search must still feel guided and legible instead of looking broken
- a real admin application
- a real tenant application
- a production multi-surface frontend runtime still served from `frontend/`
- a parallel root Next.js runtime lane that now builds successfully but does not yet replace the deployed Vite surface
- a large additive `/api/v1/*` backend contract surface
- a top-level backend router split across public catalog, uploads, webhooks, admin, communications, and bounded-context `v1` mounting
- `/api/v1/*` router decomposition through `backend/api/v1_router.py` and separate booking, search, tenant, communication, and integration route modules
- first-step tenant handler extraction through `backend/api/v1_tenant_handlers.py`
- tenant Google and password authentication foundations
- tenant `email-first` authentication with verification-code request and verify flows, with Google retained as the fast continuation path
- tenant catalog import, edit, publish, and archive workflows
- tenant overview, bookings, integrations, billing, and catalog panels
- matching, search quality, replay, and release-gate infrastructure
- a richer Phase 2 matching contract with normalized `booking_fit` summaries and `stage_counts` diagnostics across backend and frontend contract layers
- a reusable `016_cross_industry_full_flow_test_pack.sql` seed plus verifier coverage for 10 synthetic enterprise booking journeys
- a first explicit admin growth lane through `/admin/campaigns`, tied to source attribution and paid-revenue reporting
- additive SQL migrations for tenant and commercial foundations
- deploy wiring for public, API, admin, beta, demo, portal, and tenant hosts
- request-facing landing, pitch, storyboard, and promo-video working docs under `docs/development/` so Sprint 15-16 narrative assets inherit the same repo-truth baseline as code delivery

The main delivery problem is therefore no longer:

- "build the first working system"

The main delivery problem is now:

- finish incomplete commercial product loops
- close the tenant paid-SaaS gaps
- harden release discipline across more workflows
- keep requirement documents aligned with the already-shipped product baseline
- upgrade the major user surfaces so the whole system feels coherent, user-friendly, and SaaS-grade
- keep the full BookedAI search-to-booking flow confidence-building even under slow search or partial backend degradation
- finish the remaining bounded-context handler cleanup inside `backend/api/v1_routes.py` without breaking current public or operator paths

## User-layer upgrade overlay

In addition to the phase and sprint map below, all later execution should now inherit one cross-surface productization overlay:

- `docs/architecture/user-surface-saas-upgrade-plan.md`

This overlay is now mandatory context for:

- public frontend upgrades
- portal upgrades
- tenant login and tenant workspace upgrades
- admin login upgrades
- billing and subscription flow upgrades
- system-wide UI and UX harmonization

## Program summary snapshot

Date: `2026-04-22`

### Overall plan

The current BookedAI program should be read as one linked delivery chain rather than as isolated greenfield projects:

- Sprint 1 through Sprint 3:
  - reset narrative, architecture, branding, and the public acquisition spine
- Sprint 4 through Sprint 7:
  - harden search truth, reporting semantics, lifecycle workflows, and commercial foundations
- Sprint 8 through Sprint 10:
  - establish tenant onboarding, tenant workspace, and admin commercial operations as real code paths
- Sprint 11 through Sprint 16:
  - complete the user-surface SaaS upgrade across tenant, admin, portal, billing, release discipline, and cross-surface UX consistency

### Current phase status

- Phase 0:
  - `done baseline`
- Phase 1:
  - `implemented baseline`
- Phase 2:
  - `partial foundation complete`
- Phase 3:
  - `strongest active implementation lane`
- Phase 4:
  - `partial`
- Phase 5:
  - `partial foundation`
- Phase 6:
  - `partially active`
- Phase 7:
  - `real foundation implemented`
- Phase 8:
  - `real foundation implemented`
- Phase 9:
  - `partially active`

### Sprint status summary

Public execution note from `2026-04-23`:

- homepage realignment is now active, not speculative: `bookedai.au` is the simpler product-entry surface, while `pitch.bookedai.au` is the deeper story surface
- public search quality is now judged on interaction quality as well as correctness, which means slow matching states, result confidence, and booking-submit resilience are part of the sprint baseline

- Sprint 1:
  - `complete as a requirement baseline`
- Sprint 2:
  - `complete as an inherited baseline`
- Sprint 3:
  - `materially implemented in code`
- Sprint 4:
  - `partially implemented`
- Sprint 5:
  - `partially implemented`
- Sprint 6:
  - `substantially implemented`
- Sprint 7:
  - `partial foundation only`
- Sprint 8:
  - `materially implemented`
- Sprint 9:
  - `implemented foundation`
- Sprint 10:
  - `implemented foundation`
- Sprint 11:
  - `partly implemented`
- Sprint 12:
  - `overlapping implementation exists, completion still pending`
- Sprint 13:
  - `active`
- Sprint 14:
  - `active`
- Sprint 15:
  - `planned, with some implementation overlap already present`
- Sprint 16:
  - `planned release-hardening closeout`

### Admin workspace execution order

The admin workspace should now be executed in the following order from current repo reality, rather than replaying the whole blueprint as if the codebase were still greenfield:

- `Phase 0`:
  - runtime and production-ownership decision for the new root `Next.js` admin lane
- `Phase 1`:
  - production auth
  - signed session
  - tenant context
  - RBAC parity
  - immutable audit baseline
- `Phase 2`:
  - Prisma and repository parity so current admin modules stop depending on mock-only data truth
- `Phase 3`:
  - tenant
  - users
  - roles
  - settings
  - audit control-plane completion
- `Phase 4`:
  - customers
  - leads
  - services
  - bookings hardening on real tenant data
  - `Zoho CRM` seam continuation for customers and leads
- `Phase 5`:
  - payments and revenue-truth completion
- `Phase 6`:
  - dashboard
  - reporting
  - operator analytics expansion
- `Phase 7`:
  - campaigns
  - messaging
  - workflows
  - automation

Immediate next sequence after the current reporting baseline:

- keep `Campaigns` and the first `Messaging` workspace as already-opened growth-lane foundations, but do not let them become the main breadth-expansion lane for the current phase
- lock the next explicit execution package to `docs/development/golden-tenant-activation-revenue-proof-loop-2026-04-23.md`
- treat the shipped responsive web app as the phase truth and keep React Native or native-mobile work deferred
- use `Future Swim` as the primary vertical wedge for the first fully hardened commercial loop
- use `children's chess classes` and `AI Mentor 1-1` as secondary adaptation templates after the Future Swim loop is stable
- execute the next coding slices in this order:
  - tenant identity and activation completion
  - billing and commercial closure
  - lead-to-booking and lead-to-customer aftermath visibility
  - tenant revenue proof and monthly value reporting
- only after that loop is commercially credible should the next explicit growth slice move into broader `Workflow` definitions and then `Automation`

Immediate agent-specific execution overlay:

- `Slice A - Search and conversation agent hardening`
  - keep search/chat intake, clarification, shortlist, and booking handoff truthful and fast
- `Slice B - Revenue operations agent foundation`
  - create action queues for new leads, incomplete bookings, unpaid bookings, and follow-up due events
  - trigger email, SMS, WhatsApp, CRM sync, and webhook callbacks from auditable lifecycle policies
- `Slice C - Customer-state support agent`
  - allow returning customers to ask for booking, payment, invoice, or status help using verified email, phone, or booking reference
- `Slice D - Tenant billing and retention agent`
  - calculate fees, remind overdue tenants, send financial summaries, and flag churn-risk or rescue opportunities

Chess-first execution note:

- the next connected-agent implementation should use `Grandmaster Chess Academy` as the first required proof case
- do not start by designing the agent platform only as a generic abstraction without closing the chess end-to-end loop
- the required order is:
  - chess intake and assessment handoff
  - chess placement and booking handoff
  - chess subscription, reminder, and billing actions
  - chess parent support and retention handling
  - then reusable multi-tenant generalization
- the current checked-in step inside that order now includes:
  - parent-report preview persisted from booking success into portal continuation
  - portal-safe `reschedule`, `pause`, `downgrade`, and `cancel` request actions for academy follow-up
  - customer-care portal UX that reads the same academy lifecycle state instead of a disconnected booking-only receipt

### Next phase deadline

The immediate post-Sprint-16 working cadence is now locked to:

- freeze scope by Friday, April 24, 2026
- get AI end-to-end working before any UI polish pass
- post one one-line daily update in Discord
- submit the draft by Saturday, April 25, 2026
- record a rough video over the April 25-26, 2026 weekend
- deliver the final edit by Sunday, April 26, 2026
- use Monday, April 27, 2026 for final polish

### Next phase implementation order

The post-release implementation order is now:

1. finish `Phase 17` documentation and GitHub submission for the verified full-flow stabilization work
2. extend `Phase 18` so admin and tenant operators can inspect, filter, dispatch, transition, and audit revenue-ops action runs, including lifecycle-event, dependency, policy, evidence-summary posture, and tenant-scoped automation connection/run controls
3. implement `Phase 19` omnichannel customer-care/status replies using WhatsApp, SMS, Telegram, email, web chat, booking, payment, subscription, report, communication, and action-run state
4. implement `Phase 20` widget/plugin/web-chat install identity for SME-owned websites and prove one tenant-branded embed flow enters the same AI Revenue Engine end to end
5. implement `Phase 21` billing, receivable, subscription, reminder, collection, and commission truth after the ledger evidence model is stable
6. generalize `Phase 22` templates from chess and Future Swim only after both verticals remain green through the release gate, including retention playbooks and channel-specific copy rules
7. make `Phase 23` release governance the closeout requirement for every phase, including message-intake fixtures, booking/payment/follow-up traces, rollback notes, memory, Notion, and Discord sync
 

## Program status by phase

### Phase 0 - Narrative and architecture reset

Status: `done baseline`

Delivered baseline:

- PRD and roadmap are aligned around the AI revenue engine positioning
- pricing and architecture documents have already moved away from the old chatbot-first framing

Carry-forward work:

- requirement and pitch materials now need to describe the product as an AI agent system, not only a booking/search flow

- keep later sprint docs aligned with the current shipped product baseline instead of older historical assumptions
- keep homepage, popup assistant, and embedded booking assistant flows aligned so search-state wording, progress treatment, and booking-submit resilience do not drift apart again

### Phase 1 - Public growth and premium landing rebuild

Status: `implemented baseline`

Delivered baseline:

- public search-first shell is live in code
- multilingual locale switching exists
- homepage and pitch are now explicitly being separated by role, with the current code already moving toward a shorter product-first homepage and a deeper pitch narrative surface
- the public booking flow now has a first resilience patch for degraded v1 writes by falling back to the older booking-session lane when server or network failure would otherwise strand `Continue booking`
- the public search experience now has a first staged-progress treatment so slower matching can explain what BookedAI is doing and invite better query detail while results are still resolving
- BookedAI branding has a shared asset source under `frontend/public/branding/`
- public responsive and live-read browser suites exist
- the homepage sales-deck polish lane is now also active in code, with a cleaner CTA hierarchy, launch-offer strip, and stronger separation between homepage conversion, product demo, and deeper public runtime behavior
- `bookedai.au` is now live on the tighter sales-deck runtime, with trial CTA routing centered on `product.bookedai.au` and sales-contact continuity still flowing into `register-interest`
- `product.bookedai.au` is now the explicit live product-demo and booking-agent host in current execution, while `demo.bookedai.au` stays as the lighter narrative demo host rather than the main product-proof route
- homepage CTA routing and roadmap or registration fallbacks should no longer point to the older `/?demo=open` mixed-shell path where the product host now has a cleaner dedicated runtime
- the homepage now has a dedicated flow-map and CTA-rail layer, so the public acquisition story is more visual and more conversion-led than the earlier search-first baseline
- `product` now also exposes explicit `Start Free Trial` continuation so product proof and registration flow stay commercially linked
- the latest approved public package vocabulary is now `Freemium`, `Pro`, and `Pro Max`, while the registration-only custom lane may present `Advance Customize` above the standard paid tiers
- the latest homepage copy pass also tightened the message hierarchy for two audiences at once: quick-scan SME buyers and investor reviewers who need a clearer revenue-engine narrative

Carry-forward work:

- preserve one active public spine
- keep long-form public narrative subordinate to the sales-deck conversion path and the deeper `product/demo` runtime surfaces
- preserve the current compact homepage section order and avoid re-expanding duplicated proof or pricing copy into the main public shell unless a later approved sprint explicitly changes that baseline
- keep `bookedai.au` focused on first-minute product entry while `pitch.bookedai.au` absorbs the longer explanatory narrative
- treat slow-search progress treatment and safe booking-submit fallback as active public requirements, not optional polish

### Phase 2 - Commercial data foundation

Status: `partial foundation complete`

Delivered baseline:

- additive tenant and catalog schema support exists
- SQL migration package exists through `009`
- repository, domain, integration, and shared-contract seams exist

Carry-forward work:

- continue moving from additive foundations into a clearer normalized commercial truth model

### Phase 3 - Multi-channel capture and conversion engine

Status: `strongest active implementation lane`

Delivered baseline:

- matching and search routes are real
- booking-path and booking-intent routes are real
- semantic transparency and replay tooling are real
- browser and API checks exist for public search behavior
- the product-route public booking runtime now enforces a clearer search-to-booking sequence:
  - search results first
  - detail preview popup on result tap
  - explicit `Book` action before entering the booking form
  - confirmed or thank-you state after successful booking creation

Carry-forward work:

- keep search truth strong while broadening the same discipline to more non-search channels
- keep preview-state, booking-state, and confirmation-state boundaries explicit as more public and tenant booking flows inherit this runtime

### Phase 4 - Revenue workspace and reporting

Status: `partial`

Delivered baseline:

- tenant and admin reporting read surfaces exist
- revenue, bookings, integrations, billing, and catalog views exist at workspace level

Carry-forward work:

- finish monthly value, attribution clarity, and stronger shared commercial reporting semantics

### Phase 5 - Recovery, payments, and commission operations

Status: `partial foundation`

Delivered baseline:

- payments, reconciliation, outbox, retry, and reliability support seams exist
- admin support lanes already expose operator-facing reliability behavior
- top-level route ownership is now clearer for admin, webhook, upload, communication, and bounded-context v1 surfaces

Carry-forward work:

- complete self-serve billing and invoice/productized payment operations
- complete clearer commission operations
- eliminate undocumented critical-path ownership ambiguity inside the remaining mixed `/api/v1/*` surface

### Phase 6 - Optimization, evaluation, and scale hardening

Status: `partially active`

Delivered baseline:

- release-gate scripts exist
- replay gate exists
- beta and production deploy scripts exist
- browser smoke coverage exists
- route-level verification passed after the current router split
- backend validation now passes for public-web fallback and tenant session-signing after the latest compatibility cleanup

Carry-forward work:

- extend promote-or-hold discipline beyond the search lane
- keep the restored public-web fallback and tenant-session compatibility checks green while broader release gates expand to billing, publish, and support flows

### Phase 7 - Tenant revenue workspace

Status: `real foundation implemented`

Delivered baseline:

- tenant workspace shell exists
- tenant auth exists
- tenant catalog ownership and publish-safe workflow exists
- tenant billing and operational panels exist
- tenant session signing now prefers a tenant-specific secret instead of relying only on shared admin credentials

Carry-forward work:

- finish account creation, claim flow, team membership, and value-reporting maturity
- continue extracting the remaining tenant and portal handlers from `backend/api/v1_routes.py` into `backend/api/v1_tenant_handlers.py`, then move on to integrations, communications, search, and booking

### Phase 8 - Internal admin optimization and support platform

Status: `real foundation implemented`

Delivered baseline:

- admin workspace structure exists
- drift review, diagnostics, and support-safe preview tooling exist

Carry-forward work:

- deepen operational closure loops, role safety, and commercial support tooling

### Phase 9 - QA, release discipline, and scale hardening

Status: `partially active`

Delivered baseline:

- release checklist exists
- release rehearsal exists
- search replay gate exists

Carry-forward work:

- add release-grade thresholds for tenant auth, publish, billing, recovery, and admin support flows

## Sprint-by-sprint current execution map

## Sprint 1

Theme:

- product, roadmap, and architecture reset

Current assessment:

- complete as a requirement baseline

## Sprint 2

Theme:

- brand system and public implementation spine

Current assessment:

- complete as an inherited baseline

Notes:

- later work must inherit the shared branding source and the current public shell direction

## Sprint 3

Theme:

- public search-first homepage runtime

Current assessment:

- materially implemented in code, but no longer the live homepage baseline

Implemented evidence:

- `frontend/src/apps/public/PublicApp.tsx`
- `frontend/src/apps/public/HomepageSearchExperience.tsx`
- `frontend/tests/public-homepage-responsive.spec.ts`
- `frontend/tests/public-booking-assistant-live-read.spec.ts`

Remaining gaps:

- continue reducing drift from older public routes and historical public assumptions
- keep this sprint inherited as a still-valid deeper public runtime baseline, but not as the current homepage-host baseline

## Sprint 4

Theme:

- assistant truth and commercial contract foundations

Current assessment:

- partially implemented

Implemented evidence:

- `/api/v1/matching/search`
- `/api/v1/bookings/path/resolve`
- `/api/v1/bookings/intents`
- shared contract and v1 API layers

Remaining gaps:

- commercial truth still needs fuller normalization beyond the strongest active read models

## Sprint 5

Theme:

- reporting read models and widget vocabulary

Current assessment:

- partially implemented

Implemented evidence:

- tenant overview and billing panels
- admin insights and diagnostics

Remaining gaps:

- monthly value reporting and fully unified reporting semantics still need work

## Sprint 6

Theme:

- search quality, replay, thresholds, and attribution discipline

Current assessment:

- substantially implemented

Implemented evidence:

- `scripts/run_matching_search_replay.py`
- `scripts/run_search_replay_gate.py`
- search-focused backend tests
- browser search smoke coverage
- `frontend/src/components/landing/assistant/BookingAssistantDialog.tsx` now records the current product-route interaction truth:
  - shortlist before booking
  - preview popup with tenant or provider detail rendered as a `fixed inset-0` viewport-level modal with internal scroll
  - explicit booking commit from preview
  - confirmed state after submit, with no auto-homepage redirect; the QR + portal-auto-login hero stays in view until the customer leaves the page on their own
  - product-app surface (`product.bookedai.au`) flows as a single scrollable column with progressive disclosure so the chat panel, the booking form, and the workflow guide reveal in sequence rather than as overlapping panels
  - search resolving state is a multi-stage stepper with skeleton result placeholders, replacing the previous static spinner
  - confirmation QR is generated locally via `frontend/src/shared/utils/qrCode.ts` (the `qrcode` npm package) so the surface no longer hard-depends on `api.qrserver.com` at runtime; the third-party URL stays as a fallback only
  - confirmation hero exposes copy-to-clipboard for the booking reference and portal URL plus a QR PNG download, so the customer can hand the booking off through other channels without retyping anything

Remaining gaps:

- comparable threshold discipline still needs to spread to more workflows
- the next active implementation slice is now the canonical query-understanding contract, so backend and homepage search can share one intent and constraint interpretation before more ranking or fallback expansion is added
- deterministic backend ranking has also now started, so search output order is being pulled back toward one API truth instead of diverging across separate homepage heuristics
- the next documentation and QA pass should make this same preview-to-book-to-confirm pattern explicit in reusable browser tests so later public-flow changes cannot collapse the states back together

## Sprint 7

Theme:

- recovery workflows

Current assessment:

- partial foundation only

Implemented evidence:

- integration retry and reliability support exists
- lifecycle and reliability service lanes exist

Remaining gaps:

- missed-revenue recovery is not yet fully productized across tenant and admin

## Sprint 8

Theme:

- tenant onboarding and searchable supply

Current assessment:

- materially implemented

Implemented evidence:

- tenant auth
- tenant catalog import
- tenant catalog edit/review/publish/archive
- publish-state-aware schema and APIs

Remaining gaps:

- no finished create-account or claim-account journey
- onboarding state still needs stronger end-user completion

## Sprint 9

Theme:

- tenant revenue workspace

Current assessment:

- implemented foundation

Implemented evidence:

- `frontend/src/apps/tenant/TenantApp.tsx`
- `/api/v1/tenant/overview`
- `/api/v1/tenant/bookings`
- `/api/v1/tenant/integrations`
- `/api/v1/tenant/billing`

Remaining gaps:

- tenant value reporting and commercial clarity still need deepening

## Sprint 10

Theme:

- internal admin commercial operations

Current assessment:

- implemented foundation

Implemented evidence:

- `frontend/src/components/AdminPage.tsx`
- `frontend/src/features/admin/`
- reliability workspace and drill-in behavior

Remaining gaps:

- stronger role safety, workflow closure, and full commercial reconciliation maturity

## Sprint 11

Theme:

- tenant IA and canonical workspace ownership

Current assessment:

- partly implemented through the current tenant shell, but not complete relative to target

Next required work:

- canonical auth entry
- create-versus-claim flow
- onboarding status and progress model

## Sprint 12

Theme:

- tenant workspace completion and publish-safe product behavior

Current assessment:

- current code already overlaps this sprint, but completion is still pending

Next required work:

- stronger onboarding completion
- better tenant action queues
- clearer monthly commercial visibility

## Sprint 13

Theme:

- unified tenant identity and onboarding completion

Current assessment:

- still active, but public-surface productization work has already overlapped it on the public route

Must deliver next:

- create-account flow
- claim-account flow
- onboarding state model
- correct redirect and session continuity inside `tenant.bookedai.au`
- continue harmonizing tenant entry quality with the now-live public homepage and product-route conversion expectations

## Sprint 14

Theme:

- tenant billing workspace and admin support readiness

Current assessment:

- still active, with cross-surface UX productization already partially overlapping it

Must deliver next:

- invoice read model seam
- payment-method seam
- plan and billing action states
- admin support-safe drill-ins for tenant billing/auth investigation
- keep portal, tenant, admin, and billing UX quality aligned with the now-live homepage and product-route conversion standards

## Sprint 15

Theme:

- portal, tenant-value, and narrative asset production

Current assessment:

- planned, with execution overlap already present across portal-adjacent runtime work, homepage regression coverage, and the newly added landing/video/pitch documentation set

Must deliver next:

- first professional customer portal runtime and booking-review continuity
- tenant value reporting
- stronger billing and retention posture for paid-product expectations
- broader regression coverage across commercial workflows
- add explicit browser and release checks for homepage sales-deck CTA continuity, register-interest routing, and booking-form focus behavior
- turn the current landing and story assets into one coherent production package:
  - `docs/development/bookedai-chatbot-landing-implementation-plan.md`
  - `docs/development/bookedai-sample-video-brief.md`
  - `docs/development/bookedai-investor-pitch-deck.html`

## Sprint 16

Theme:

- release discipline, final polish, and publish-ready proof

Current assessment:

- planned release-hardening closeout, with the final April 24-27 delivery cadence now explicitly locked in the synced plan set

Must deliver next:

- cross-lane release thresholds
- rollback discipline for tenant and commercial lanes
- scale-readiness and operational confidence review
- final wording, visual, pitch-video placement, and proof-pack polish across homepage, pitch, and promo-video assets so the public narrative and shipped product evidence stay aligned

## Detailed next execution order

### Execution wave A

Primary target:

- finish the tenant identity spine and upgrade tenant entry UX

Included scope:

- create account
- claim workspace
- onboarding status
- first-run setup
- session continuity and capability model cleanup
- professional tenant login shell and clearer onboarding entry
- cross-surface UX inventory for public, tenant, admin, portal, and billing

Primary sprint ownership:

- Sprint 13

### Execution wave B

Primary target:

- finish the tenant billing and paid-SaaS posture while defining the portal and admin-entry upgrade baseline

Included scope:

- plan state clarity
- payment-method seam
- invoice seam
- subscription action seam
- admin support-safe billing visibility
- admin login and session-entry refinement
- portal runtime architecture and booking-review UX definition
- tenant workspace shell refinement so catalog, bookings, integrations, and billing read as one product

Primary sprint ownership:

- Sprint 14

### Execution wave C

Primary target:

- make portal, tenant value, and billing behavior release-grade

Included scope:

- monthly value cards
- value-to-plan narrative
- regression checks for tenant auth, tenant publish, and tenant billing
- admin smoke for support and retry paths
- first dedicated professional customer portal implementation
- billing UX implementation for self-serve SaaS expectations
- public and portal UI continuity verification

Primary sprint ownership:

- Sprint 15

### Execution wave D

Primary target:

- close phase 9 hardening

Included scope:

- promote or hold thresholds across search, tenant, billing, and admin workflows
- rollback guidance by lane
- final release-readiness baseline
- whole-system visual and interaction harmonization review across public, portal, tenant, and admin
- release-grade UX regression checks for the highest-value user flows

Primary sprint ownership:

- Sprint 16

## Documentation synchronization rule from this baseline

After `2026-04-19`, every later planning or implementation update should assume:

- the current codebase already contains real public, tenant, admin, backend, and release-gate foundations
- planning should not describe tenant, billing, admin, or public search as not-yet-started when code already exists
- future sprint docs should describe unfinished areas as `completion`, `hardening`, or `productization` work where that is the real state

## Definition of planning success

This plan should be considered correctly adopted when:

- requirement docs reflect the current code baseline
- sprint planning no longer resets already-shipped foundations back to zero
- the next execution wave is clearly focused on tenant identity, billing posture, and release-grade hardening

## Immediate next plan

Current lane owner: `Phase 17-19 urgent product loop`

Current priority order:

1. `UI/UX stabilization`
   - homepage, product, tenant, portal, and admin must remain mobile-safe, accessible, scannable, and customer-safe in wording
   - slow search must show progressive useful state, not blank or spinner-only waiting
   - result cards must preserve compare-first behavior with explicit `Book`
2. `Standard booking flow`
   - preserve `Ask -> Match -> Compare -> Book -> Confirm -> Portal -> Follow-up`
   - one fresh booking reference should prove confirmation, QR/portal, care-turn, tenant notification, and action/audit posture
   - lifecycle changes remain request-safe until source-of-record state confirms completion
3. `Messaging Automation Layer`
   - website chat, Telegram, WhatsApp, portal care, tenant notifications, and later SMS/email should share one booking-care policy
   - booking data loads only from explicit reference, signed portal context, or safe single email/phone match
   - provider delivery posture should be visible as sent, queued, failed, manual-review, or unconfigured

Next recommended sequence:

1. Finish the focused UI/UX smoke and polish pass.
2. Run a canonical booking-to-portal-to-follow-up trace with a new reference.
3. Expand the shared messaging fixtures so Telegram, WhatsApp, web chat, and portal care prove the same policy.
4. Backfill ledger evidence and release-gate checks before moving into widget/plugin distribution.

## Sprint 19-22 cross-stack execution overlay (2026-04-26 review)

The seven-lane review captured in `docs/development/full-stack-review-2026-04-26.md` overlays the `Phase 17-23` model with four practical sprints. This overlay is additive: it does not replace the phase plan, it tells operators which P0/P1 work to schedule first and where the A/B telemetry should activate.

### Sprint 19 — `2026-04-27 → 2026-05-03` — Stabilize and Sign

- target phases: `17`, `19`, `23`
- close P0-1 (`portal v1-* snapshot 500`), P0-2 (`WhatsApp provider posture`), P0-3 (`Telegram secret-token + Evolution HMAC`), P0-4 (`webhook idempotency`), P0-5 (`actor_context.tenant_id validator`), P0-6 (`GitHub Actions CI`), P0-7 (`.env.production.example`), P0-8 (`OpenClaw root drop`)
- ship P1-7 (`phone aria-describedby`, `admin booking responsive ≤720px`)
- exit gate: portal UAT for fresh `v1-*` references is green; CI blocks lint/type/test failures; OpenClaw can no longer run host shell as root

### Sprint 20 — `2026-05-04 → 2026-05-10` — First Real Revenue Loop

- target phases: `17`, `19`, `21`, `23`
- close P1-9 (`Future Swim Miranda URL hotfix`), P1-1 (`tenant authenticated UAT`), P1-2 (`WhatsApp inline controls + sender identity`), P1-5 (`route_handlers raw SQL → repos`)
- one Future Swim revenue loop is documented end-to-end (lead, booking, payment, follow-up, dashboard snapshot)
- bring up Prometheus/Grafana/AlertManager and route alerts through Discord
- activate A/B experiments `AC-1`, `RT-1`, `RT-3`, `CH-1` using the existing `tenant_variant`/`portal_variant` telemetry pattern
- publish first version of `Commercial and Compliance Checklist`
- exit gate: at least four A/B experiments have ≥500 impressions per variant with a recorded decision; observability dashboards expose `5xx` rate, DB latency, queue lag

### Sprint 21 — `2026-05-11 → 2026-05-17` — Refactor and Coverage

- target phases: `19`, `22`, `23`
- close P1-3 (`WhatsApp test parity with Telegram`), P1-4 (`tenant_app_service split`), P1-6 (`beta DB separation + image registry`), P1-8 (`pitch + 390px Playwright`), P1-10 (`channel-aware email templates`)
- add `location_posture` field to chat response shape and propagate web/Telegram/WhatsApp; this unlocks `BC-1`
- replace bare `except Exception` blocks in `service_layer/` with `IntegrationAppError`/`ValidationAppError` plus structured logging
- exit gate: tenant_app_service is gone or shrunk to a thin shim; tagged image rollback works in <5 minutes on staging

### Sprint 22 — `2026-05-18 → 2026-05-24` — Multi-tenant and Multi-channel

- target phases: `19`, `20`, `21`, `22`, `23`
- add `BaseRepository` validator that fails any tenant-scoped query missing a `tenant_id` filter
- ship SMS adapter at `/api/webhooks/sms` reusing the shared identity/mutation policy
- ship `Tenant Revenue Proof` dashboard (investor-only or limited tenant access) and tenant-workspace pricing/commission visibility
- run A/B wave 2 (`BC-2`, `CH-1`, `CH-3`)
- extend rate-limiting to `/api/leads`, `/api/pricing/consultation`, `/api/demo/*`, and webhooks
- ship public footer and tenant terms updates from the Sprint 20 compliance audit
- exit gate: one new vertical reuses the shared template path with no custom-only branch; SMS booking-care answer is reachable; tenant revenue proof dashboard renders one tenant's real evidence
