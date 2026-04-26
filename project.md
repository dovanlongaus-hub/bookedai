# BookedAI Master Index

## Purpose

`project.md` is the root-level control document for the `bookedai.au` project.

Current synchronized release baseline: `1.0.1-stable`.

Latest infrastructure update date: `2026-04-16`.

Latest product-surface update date: `2026-04-26`.

Latest public-search UX update date: `2026-04-25`.

Current top product-surface priority: `responsive homepage web-app UX`.

Current canonical roadmap reference: `docs/architecture/bookedai-master-roadmap-2026-04-26.md` is the single end-to-end roadmap from Phase 0 through Phase 23 plus the post-Sprint-22 horizon. It integrates the seven-lane review captured in `docs/development/full-stack-review-2026-04-26.md` (architecture+UAT, frontend UI/UX, corporate/business, backend, API+integrations, DevOps, conversational chat) and is the authoritative source when this document conflicts with detailed phase or sprint artifacts on roadmap-level questions.

Current PM execution control: `docs/development/phase-execution-operating-system-2026-04-26.md` defines the agent-lane operating model, phase closeout gates, UAT standard, deploy-live standard, and active Sprint 19 execution board. Phase `0-16` remain historical baselines; active execution starts from Phase/Sprint `17-23` and every phase must close UAT, deployment, documentation, Notion/Discord, and next-phase handoff before moving forward.

## Content, Wording, And Layout Baseline

This section is the current master baseline for requirement-side and execution-side content planning. It applies the active content, launch, startup-validation, email, and experiment planning lens to the existing BookedAI roadmap without changing the technical phase boundaries.

### Customer-facing message hierarchy

BookedAI should lead with the customer outcome before the system architecture:

1. `Capture every service enquiry before it goes cold.`
2. `Turn the enquiry into a booking, payment posture, and follow-up record.`
3. `Show owners what was won, what is at risk, and what needs human review.`

The approved plain-English product line for planning and public copy is:

`BookedAI turns missed service enquiries into booked revenue. It captures intent across chat, calls, email, web, and messaging apps, then helps book, follow up, track payment posture, and show operators what revenue was won or still needs action.`

Use this shorter SME-facing hero when the page or deck needs a sharper first line:

`Never lose a service enquiry to slow replies again. BookedAI turns chats, calls, emails, and website visits into confirmed booking paths, payment follow-up, and customer care.`

Use this investor and judge-facing version when the audience needs to understand the big-tech/unicorn ambition:

`BookedAI is an AI Revenue Engine for service businesses: an omnichannel agent layer that captures intent, creates booking references, tracks payment and follow-up posture, and records every revenue action in an auditable operating system.`

Use `AI Revenue Engine` as the category and strategy label, but explain it with concrete booking outcomes before using internal terms such as ledger, orchestration, policy, or runtime.

For investor and judging contexts, the pitch should make the financial logic explicit:

- wedge: service SMEs already receive demand, but lose revenue through slow replies, abandoned booking paths, unpaid follow-up, and disconnected customer care
- product: BookedAI turns those fragmented moments into one measurable booking and revenue workflow
- AI innovation: omnichannel agent policy, identity-safe customer care, tenant-aware search, auditable action ledger, and reusable vertical templates
- business model: setup fee, SaaS subscription, and performance-aligned commission or revenue share on booked revenue where appropriate
- proof: live verticals, booking references, portal reopen, tenant Ops, messaging channel continuity, release gates, and operator evidence packs

### Document layout rule

Requirement and execution documents should now use the same reader order:

1. customer problem and target segment
2. promise and measurable outcome
3. current shipped baseline
4. next customer journey or operator workflow
5. phase/sprint ownership
6. acceptance gate and experiment metric
7. release, content, email, and support follow-up

Avoid opening planning sections with implementation inventory unless the reader is explicitly an engineer. Technical detail should follow the customer journey it supports.

### Startup canvas and validation baseline

BookedAI's first beachhead remains service SMEs with appointment, class, consultation, or enquiry workflows. The current `why now` is the convergence of customer messaging channels, AI-assisted search/intake, cheaper automation, and owner demand for measurable revenue instead of more dashboards.

The active strategic trade-offs are:

- prioritize service businesses with repeatable bookings before broad marketplace discovery
- prioritize explicit booking consent over one-click automation
- prioritize portal-grounded customer care over unsupported instant lifecycle changes
- prioritize tenant-backed proof verticals before generic multi-industry templates
- prioritize owned email/customer identity and audited side effects before paid acquisition scale

The quarter-level North Star for planning is:

`qualified enquiries that become traceable booking references with follow-up posture`.

Supporting metrics:

- search-to-booking-start rate
- booking-start-to-reference-created rate
- reference-to-portal-reopen rate
- customer-care identity resolution rate
- tenant notification configured/sent/manual-review rate
- payment or receivable posture visibility rate

### Content and launch baseline

Content should be a painkiller, not a brochure. Every content plan must answer one operator anxiety: missed enquiries, slow replies, no-shows, unpaid bookings, disconnected follow-up, or not knowing whether marketing created revenue.

The public content spine should use this order:

- `Problem`: enquiries arrive across too many channels and go cold quickly
- `Proof`: live search, booking reference, portal, Telegram/WhatsApp/customer-care, tenant Ops
- `Offer`: first tenant/proof verticals, setup path, pricing posture, and operator support identity
- `Trust`: release gates, audit records, support routes, security and no-fake-completion posture
- `Next action`: search/book now, register interest, open portal, or talk to BookedAI Manager Bot

Launches should be sequenced as soft launch first, hard launch second:

- soft launch validates the live flow with proof verticals, screenshots, UAT, and operator closeout
- hard launch turns that proof into one focused external story, one short video/demo path, one email sequence, and one measurable conversion goal

### Email and lifecycle baseline

Email planning should stay tied to the booking lifecycle, not generic newsletters. The first owned-audience flows are:

- operator onboarding: welcome, catalog readiness, first booking proof, tenant notification setup
- booking customer: confirmation, portal revisit, payment/help status, review/change-request follow-up
- lead nurture: missed enquiry recovery, abandoned booking, proof vertical story, register-interest follow-up
- tenant retention: weekly revenue proof, unresolved action ledger, billing/payment posture, support escalation summary

Mailchimp-style campaign planning may be used later, but the current repo baseline should first define segments, tags, triggers, subject/preview copy, and revenue attribution fields in docs before any external campaign automation is considered live.

### Experiment baseline

New content or wording changes should include a behavior hypothesis in this format:

`At least X% of Y will do Z within T after seeing the change.`

Current priority hypotheses:

- At least `12%` of homepage visitors who start a search will select a result or open details in the same session.
- At least `25%` of customers who receive a booking reference will reopen the portal within `7 days`.
- At least `40%` of tenant admins who see the revenue-ops variant will open an operational panel before leaving.
- At least `15%` of warm leads receiving a proof-vertical email will click through to a live booking or register-interest path.

Experiment docs must state the audience, metric, threshold, and hold condition before implementation begins.

Latest Messaging Automation Layer update from `2026-04-26`:

- Product requirement message now reads: `BookedAI connects every customer message - WhatsApp, SMS, Telegram, email and web chat - into one AI Revenue Engine that captures intent, creates booking paths, supports payment and receivable follow-up, and records customer-care actions with operator-visible revenue evidence.`
- This message is the planning bridge for the next roadmap slice: Phase 19 owns channel intake and shared booking-care policy, Phase 20 exposes the same engine through web chat/widget install paths, Phase 21 connects collection and receivable truth, Phase 22 extracts reusable tenant retention templates, and Phase 23 makes the full omnichannel journey release-gated.
- BookedAI now has a shared backend `MessagingAutomationService` that centralizes customer-message handling for messaging channels instead of keeping the agent policy inside individual webhook handlers
- OpenClaw now has a dedicated always-on customer manifest `bookedai-booking-customer-agent` (`BookedAI Booking Customer Agent`) for handling BookedAI customer requests across website chat and Telegram; it uses OpenAI auth through `OPENAI_API_KEY`, supports internet/public-web search through the BookedAI AI Engine, and has no repo-write, deploy, host-shell, or operator authority
- the customer-facing agent is now named `BookedAI Manager Bot` across chat platforms; this name covers service search, direct booking, booking care, billing/payment reminders, follow-up, and retention without sounding like an internal operator bot
- Telegram should use display name `BookedAI Manager Bot` and preferred username `@BookedAI_Manager_Bot`; fallback usernames are `@BookedAIBookingBot`, `@BookedAIServiceBot`, and `@BookedAIHelpBot`
- default customer booking support/contact identity across BookedAI-managed customer channels is `info@bookedai.au` plus `+61455301335`, available for Telegram, WhatsApp, and iMessage; provider catalog contact details may remain catalog facts but should not become the BookedAI customer-booking support fallback
- the common customer path is now `Customer message -> channel webhook -> BookedAI Inbox/conversation_events -> AI booking-care policy -> workflow/audit/outbox side effects -> provider reply`
- web chat now uses the direct path `Website Chat UI -> /api/chat/send -> BookedAI AI Engine -> web response`; `/api/booking-assistant/chat` remains a backward-compatible alias
- web demo/product chat is treated as a public BookedAI web user surface and may search broadly across all BookedAI catalog data plus Internet/public-web expansion when enabled
- Telegram uses the provider path `Telegram Bot -> /api/webhooks/telegram or /api/webhooks/bookedai-telegram -> BookedAI AI Engine -> Telegram sendMessage reply`
- Telegram is treated as a private customer thread: it may chat/search like the website, but booking-specific answers are loaded only by booking reference or a safe phone/email identity match supplied by that customer, never by Telegram chat id alone
- the first priority channel for the shared layer is a separate customer-facing BookedAI Telegram bot: `/api/webhooks/bookedai-telegram` accepts Telegram Bot API updates, verifies `X-Telegram-Bot-Api-Secret-Token` when `BOOKEDAI_CUSTOMER_TELEGRAM_WEBHOOK_SECRET_TOKEN` is configured, runs the same booking-care/status policy as WhatsApp, and replies through `BOOKEDAI_CUSTOMER_TELEGRAM_BOT_TOKEN`; `/api/webhooks/telegram` remains only a compatibility alias
- the Evolution compatibility webhook is not the current outbound WhatsApp default, but inbound calls can be hardened with `WHATSAPP_EVOLUTION_WEBHOOK_SECRET`; when set, `/api/webhooks/evolution` requires an HMAC-SHA256 signature in `X-BookedAI-Signature` or `X-Hub-Signature-256`
- live Telegram activation is complete: `@BookedAI_Manager_Bot` webhook is configured to `https://api.bookedai.au/api/webhooks/bookedai-telegram`, production backend reads the customer Telegram token from the live secret environment, and a controlled webhook-to-OpenAI-to-Telegram reply loop returned `200`
- this Booking AI Agent is explicitly separate from OpenClaw and the operator Telegram path used to program, test, deploy, or administer the BookedAI repo; it must not share bot tokens, webhook routes, or elevated repo/host permissions with operator tooling
- Telegram now acts as a BookedAI representative for new service enquiries: when a customer asks to find/search/book a service, it searches active BookedAI catalog records, returns the top service options with provider/location/price posture, and includes a prefilled web assistant link for continuing on `bookedai.au`
- Telegram service-search replies now also publish a web-chat-compatible `bookedai_chat_response` payload for API consumers, including matched services, suggested service id, source tags, and location-request posture
- Telegram service-search replies now follow a more native Telegram result-selection structure: a compact BookedAI-style plain-text shortlist is paired with inline controls for full BookedAI results, per-option `View n`, per-option `Book n` callback actions, and Internet expansion only before the search has already been widened
- Telegram shortlist continuity is mirrored into `messaging_channel_sessions`, giving the customer bot a compact per-channel record of the latest query, options, reply controls, reply delivery status, and callback acknowledgement status
- protected customer-agent health is available at `/api/customer-agent/health` and `/api/admin/customer-agent/health`, and `scripts/customer_agent_uat.py` runs repeatable web-chat plus Telegram message/callback UAT probes when test credentials are present
- `BookedAI Manager Bot` can widen service discovery through the BookedAI service layer with a `Find more on Internet near me` reply button; sourced external results are labeled as `public_web_search` and still return through the BookedAI response flow rather than bypassing the platform
- Telegram customer booking copy must present the project as `BookedAI.au`, keep service discovery anchored to `https://bookedai.au`, and send returning customers to `https://portal.bookedai.au` with a QR link for the order. If a customer with an existing booking asks to search for another option, the bot first asks what should happen with the current booking, then offers controls to keep the booking and search BookedAI.au, widen to Internet options for another booking service, request a change to the current booking, or return to the existing order portal.
- Telegram customer replies should use Telegram-native presentation: HTML-safe rich text for headings, labels, links, and short sections, plus inline keyboard actions for the next step. Plain text fallback remains acceptable for provider/client failure cases, but normal `BookedAI Manager Bot` service search, existing-order confirmation, and booking handoff messages should render as compact rich Telegram cards with clear actions.
- customer-agent UAT on `2026-04-26` passed after fixes: Telegram callback taps are acknowledged, live web chat ranks `Kids Chess Class - Sydney Pilot` first for `Find a chess class in Sydney this weekend`, and live Telegram message/callback webhook probes returned `200` / `messages_processed=1`; details are tracked in `docs/development/customer-booking-agent-uat-2026-04-26.md`
- customer-agent UAT follow-ups on `2026-04-26` are now implemented and deployed: session state, protected health, UAT runner, and the live-safe chess search eval case all passed release-gate verification
- Telegram chat can now capture the first direct booking intent from the shortlist: after a service-search reply, the customer can answer `Book 1` with name plus email or phone and preferred time; BookedAI creates a real `booking_intents` record, contact, lead, booking reference, portal link, and pending payment/follow-up state
- WhatsApp/Twilio/Meta/Evolution inbound handling now calls the shared messaging agent service for booking reference resolution, conversation-window context, booking intake replies, request-safe cancellation/reschedule handling, and portal-grounded care responses
- the shared policy currently uses a 60-day conversation window, keeps the last six turns as context, asks for a booking reference when identity is ambiguous, resolves customer booking data only through explicit booking reference or a safe single phone/email identity match for that private channel, and only queues safe audited requests for cancellation/reschedule while unsupported mutations stay manual-review
- follow-up, bill/payment, confirmation, reschedule, cancel, support, and retention-style questions for existing bookings continue through the same portal-grounded customer-care path once the booking reference or safe identity match is available
- this is the foundation for the broader Messaging Automation Layer covering WhatsApp, Telegram, Apple Messages, SMS, and email, with Telegram as the first low-friction channel to configure and test before wider provider rollout

## 2026-04-26 Architecture And Execution Lock

This section is the current master requirement baseline for moving from a large implemented system into an ordered execution program.

### Whole-project architecture

BookedAI should be read as one connected AI Revenue Engine, not as separate demo apps:

- Customer acquisition surfaces: `bookedai.au`, `product.bookedai.au`, `pitch.bookedai.au`, `/architecture`, `/roadmap`, embedded widget surfaces, and future tenant-owned installs.
- Customer action surfaces: website chat, product assistant, Telegram customer bot, WhatsApp, SMS/email later, and `portal.bookedai.au` for returning-customer status and change requests.
- Tenant surfaces: `tenant.bookedai.au` gateway, tenant preview/workspace, catalog, bookings, leads, Ops, integrations, billing, and team/admin access.
- Operator surfaces: `admin.bookedai.au`, OpenClaw/operator Telegram, deployment scripts, release gates, Notion/Discord sync, and reliability/audit views.
- Backend application layer: FastAPI route modules, `/api/v1/*` contracts, `/api/chat/send`, channel webhooks, public catalog/search, booking, portal, tenant, admin, communication, integration, and lifecycle handlers.
- Revenue core: contacts, leads, booking intents, booking references, payment posture, portal snapshots, action ledger, audit/outbox records, CRM/email/calendar/payment side effects, and tenant revenue summaries.
- Messaging Automation Layer: channel webhook -> normalized Inbox/conversation event -> shared booking-care/search policy -> booking/payment/support/action side effects -> provider reply.
- Data and integration layer: Supabase/Postgres, additive SQL migrations, repository/service boundaries, Stripe/payment posture, Zoho CRM, email, Telegram Bot API, WhatsApp provider adapters, n8n, OpenClaw manifests, Docker/Nginx/Cloudflare deployment.
- Governance layer: docs-first requirement tracking, implementation-progress tracking, phase/sprint execution docs, release gates, Playwright/API tests, memory notes, Notion publication, and Discord operator summaries.

### Current phase sequence

- `Phase 17 - Full-flow stabilization`: lock UI/UX, search, booking, confirmation, QR/portal, pitch/product/public/tenant/admin stability, and live no-overflow behavior.
- `Phase 18 - Revenue-ops ledger control`: make every post-booking action inspectable, replay-safe, policy-gated, and visible to tenant/admin surfaces.
- `Phase 19 - Customer-care and status agent`: unify web chat, Telegram, WhatsApp, SMS/email later, and portal care under the shared Messaging Automation Layer.
- `Phase 20 - Widget and plugin runtime`: make the customer-facing BookedAI agent installable on SME-owned sites while preserving tenant, origin, booking, and revenue truth.
- `Phase 20.5 - Confirmation wallet and Stripe return continuity`: keep the customer in a booking-aware state after payment and let them save the booking outside the browser.
- `Phase 21 - Billing, receivables, and subscription truth`: connect payment, reminders, receivables, tenant billing, commission, subscription, and reconciliation.
- `Phase 22 - Multi-tenant template generalization`: turn chess, Future Swim, and event proof paths into reusable vertical templates for repeatable tenant rollout.
- `Phase 23 - Release governance and scale hardening`: make capture-to-retention verification mandatory before production promotion across all surfaces and channels.

### Sprint execution map

- `Sprint 1-3`: baseline lock for product narrative, architecture, brand, public acquisition spine, and first code-ready handoff.
- `Sprint 4-7`: search truth, matching quality, reporting semantics, CRM/email lifecycle, workflow foundations, and first revenue attribution loops.
- `Sprint 8-10`: tenant onboarding, catalog supply, tenant workspace, and admin commercial operations foundations.
- `Sprint 11-16`: SaaS-grade user surfaces, tenant/admin/portal polish, billing/subscription readiness, release discipline, and cross-surface consistency.
- `Sprint 17`: urgent stabilization of UI/UX, standard booking flow, portal-first confirmation, and live smoke coverage.
- `Sprint 18`: action ledger and revenue-ops visibility for tenant/admin/operator trust.
- `Sprint 19`: Messaging Automation Layer expansion, with `BookedAI Manager Bot`, website chat, WhatsApp, portal care, safe identity lookup, and audited requests.
- `Sprint 20`: widget/plugin install surface and web-chat channel normalization.
- `Sprint 20.5`: wallet/pass, Stripe return URL, and portal auto-login hardening.
- `Sprint 21`: receivable, subscription, reminder, and billing truth.
- `Sprint 22`: vertical template extraction and repeatable tenant playbooks.
- `Sprint 23`: release governance, scale, evidence packs, and promotion rules.

### Urgent execution priorities

The next implementation window must prioritize these in order:

1. UI/UX stabilization: remove confusing or clipped UI, keep public/product/tenant/portal/admin surfaces mobile-safe, keep result cards scannable, make loading progressive, and keep copy customer-safe instead of implementation-heavy.
2. Standard booking flow: preserve one canonical journey of `Ask -> Match -> Compare -> Book -> Confirm -> Portal -> Follow-up`, with explicit customer intent before booking, durable booking reference, QR portal link, email/calendar/chat handoff, and no fake instant lifecycle mutations.
3. Messaging Automation Layer: continue consolidating Telegram, WhatsApp, web chat, portal care, SMS/email later, tenant notification, and booking-care policy into shared service contracts, with explicit identity checks and auditable side effects.

### Immediate operating rule

Any new product behavior should update this requirement baseline first, then `docs/development/implementation-progress.md`, then the matching phase/sprint plan, then Notion/Discord when operator-visible.

Latest homepage shortcut search update from `2026-04-26`:

- homepage suggested searches now use exact high-signal terms for `Future Swim`, `Co Mai Hung Chess`, and `WSTI AI Event / Western Sydney Startup Hub` so customers and reviewers can find those proof verticals faster
- the homepage search runtime now has a fast-preview layer for swim, chess, and WSTI/AI-event intent: it can show matching BookedAI catalog rows or the WSTI shortcut event card immediately while live ranking, event discovery, and booking-path checks continue in the background
- the existing near-me guardrail remains in force: fast shortcut previews are suppressed for broad `near me` queries unless the user provides an explicit area such as Sydney, Caringbah, or Western Sydney Startup Hub

Latest tenant A/B telemetry update from `2026-04-26`:

- `tenant.bookedai.au` now has a lightweight tenant acquisition experiment matching the UAT recommendation: `tenant_variant=control` keeps the existing workspace promise, while `tenant_variant=revenue_ops` tests `Turn every enquiry into tracked revenue operations`
- the tenant variant is resolved from query string, then persisted in `localStorage` under `bookedai.tenant.variant`, with fallback random assignment and no external analytics dependency
- tenant funnel events now emit to `window.__bookedaiTenantEvents`, optional `dataLayer`, and the `bookedai:tenant-event` browser event, covering variant assignment, auth-mode changes, Google prompt attempts/blocks, email-code request/verify outcomes, panel opens, and mobile preview-detail toggles
- `frontend/tests/tenant-gateway.spec.ts` now verifies the revenue-ops variant headline and confirms tenant acquisition events are emitted for variant assignment and create-account mode switching
- verification passed with `npm --prefix frontend exec tsc -- --noEmit`, `npm --prefix frontend run build`, and `cd frontend && npx playwright test tests/tenant-gateway.spec.ts --workers=1 --reporter=line`
- live deployment completed through `python3 scripts/telegram_workspace_ops.py deploy-live`; stack health passed, production returned `200` for `https://tenant.bookedai.au/?tenant_variant=revenue_ops`, and live mobile Playwright confirmed the revenue-ops variant headline, persisted assignment, event emission, and no horizontal overflow at `390px`

Latest tenant login CTA fix from `2026-04-26`:

- `tenant.bookedai.au/2017-btc` now reopens the correct tenant auth workspace from both hero `Open tenant sign-in` and activation `Open sign-in` CTAs instead of staying on the overview panel
- tenant logout now resets auth mode to `sign-in` and clears the password field, leaving preview data visible while making another login attempt immediately available
- live verification passed after deploy: `Open tenant sign-in` changed the page to `#catalog`, showed `Access your tenant workspace`, and enabled `Sign in with password` after email/password input with no horizontal overflow

Latest portal valid-reference production fix from `2026-04-26`:

- `portal.bookedai.au` now reopens freshly created public `v1-*` booking references in production instead of failing the post-booking customer handoff with backend `500`, browser CORS noise, and `Failed to fetch`
- `build_portal_booking_snapshot` now rolls back best-effort after optional academy/action/audit enrichment failures so the core booking, customer, payment posture, support route, allowed actions, and timeline still render
- portal lookup and recovery copy has been softened for customers: the hero leads with `Review your booking and request changes in one place`, helper copy no longer exposes implementation-style `booking_reference` language, and recoverable network failures show retry/support actions
- production verification passed for `v1-2fd9f35965`: portal detail and care-turn APIs returned `200`, live browser smoke showed the booking workspace with no console errors, mobile `390px` overflow was `0`, and stack health passed after the deploy recovered from a transient Hermes container-name conflict

Latest product UAT enterprise polish from `2026-04-26`:

- `product.bookedai.au` now carries semantic `h1/h2` landmarks and accessible names for icon-only controls, improving enterprise accessibility and procurement-readiness without changing the visual product shell
- the product runtime now sends the `bookedai-au` tenant runtime context into the shared booking assistant, so downstream revenue-ops handoffs have tenant identity instead of depending on a blank public-web context
- mobile first-screen prompt cards no longer render as a cropped horizontal carousel; compact mobile now shows two full-width starter prompts plus concise guidance before the search composer
- public result pricing now avoids misleading zero-price presentation by showing a `Price TBC` posture unless the provider/catalog gives a meaningful price posture or positive amount
- no-result and confirmation copy now stays customer-safe: near-me failures ask for suburb/location, `Candidate not found` becomes provider-confirmation language, and transport/provider warnings are summarized as operations-review states while preserving booking reference and portal continuity
- verification passed with `npm --prefix frontend run build` and local Playwright desktop/mobile smoke against the generated product bundle; live deployment should continue through `python3 scripts/telegram_workspace_ops.py deploy-live`

Latest public homepage investor/customer redesign from `2026-04-25`:

- `frontend/src/apps/public/PublicApp.tsx` now presents `bookedai.au` as an executive acquisition homepage instead of a sidebar-first search shell
- the first viewport now states the commercial promise directly: `Turn demand into booked revenue`, backed by live proof cards for Grandmaster Chess, Future Swim, and the BookedAI WhatsApp booking-care agent
- the homepage keeps the real `HomepageSearchExperience` on-page, but surrounds it with concise buyer/investor framing: why BookedAI exists, customer intent leakage, the live ask/compare/book product, and the operating model from customer surfaces through AI agents, revenue core, and control-plane truth
- investor and customer sections now split the value proposition cleanly, while CTA paths point to product runtime, investor pitch, and roadmap without forcing visitors to infer the project story from the search UI alone
- verification passed with `npm --prefix frontend run build`, local Playwright desktop/mobile screenshots, desktop header visibility checks, and mobile no-horizontal-overflow measurement at `390px`; local preview still shows the expected unauthenticated conversation-session `401` when not connected to a signed backend session
- live deployment completed through `python3 scripts/telegram_workspace_ops.py deploy-live`; production `https://bookedai.au` now serves the new homepage directly with title/H1/nav verified by Playwright, mobile `390px` no-overflow, and no browser console errors
- `scripts/healthcheck_stack.sh` now matches the new routing truth: root `bookedai.au` should serve the homepage shell directly, while `pitch.bookedai.au` remains the deeper pitch surface
- follow-up polish on `2026-04-25` tightened the hero proof frame so the chess screenshot is contained instead of cropped, shortened the proof language into visual signal cards (`Wedge`, `Proof`, `Moat`, `Scale`), restored the regression-tested `Open Web App` CTA label, and fixed the backend `Settings` dataclass ordering that blocked backend release-gate imports
- final verification passed with frontend typecheck/build, legacy public homepage smoke, live-read booking smoke, admin-smoke, backend v1/lifecycle unittest, search eval pack, live deploy, stack healthcheck, public-surface smoke across root/product/pitch/roadmap/tenant/portal/admin, and hero-specific production Playwright evidence confirming `object-fit: contain` plus no desktop/mobile overflow
- post-deploy public-surface smoke passed across home, product, pitch, roadmap path, tenant, portal, and admin login shell with `200` responses, expected visible copy, clean console/request state, and no mobile horizontal overflow at `390px`
- homepage chat UX follow-up now treats the booking path as a tested customer journey, not only a search component: the live workspace shows a visual `Ask -> Match -> Book -> Confirm` rail, the booking brief explains contact/time/next-step requirements, form labels remain accessible, and the confirmation state highlights QR portal, edit, reschedule, cancellation request, and follow-up actions
- homepage chat results now stay inside the BookedAI conversation: assistant result bubbles render compact visual cards with option/category, price or explicit price-missing state, duration, location, confidence, fit/next-step copy, details/maps/provider/select/book actions, and suggestion chips inside the chat instead of splitting the user into a detached result board
- homepage chat composer now follows a Claude-style structure: a scrollable conversation/result pane above, then a bottom input bar with attachment on the left, natural-language textarea in the middle, and voice/send icon actions on the right
- top results are framed as `Top research` inside the assistant bubble, with the best three summarized in-chat and actions to open details, Google Maps, provider link, call, mail, select, or book without breaking the conversation flow
- live-read candidate data is enriched from the public catalog when possible, and missing booking-critical facts now remain explicit (`Price not listed`, `Duration TBD`, `Location TBD`) so customers and investors see a trustworthy search state rather than silent data loss
- the live-read Playwright booking smoke now verifies that full friendly flow from query through selected match, booking form, authoritative v1 booking intent, portal confirmation, follow-up copy, and no horizontal overflow before a homepage release can pass
- the latest pitch video at `https://upload.bookedai.au/videos/df25/8woKUebBF8HMMD_RMSA0LQ.mp4` is now embedded with native controls on both `bookedai.au` and `pitch.bookedai.au`, giving visitors an early watchable overview before they continue into live product proof or the deeper deck

Latest portal customer-care status-agent update from `2026-04-25`:

- `2026-04-26` production portal continuation recovery closed the live UAT gap where valid `v1-*` booking references could create bookings successfully but fail to hydrate in `portal.bookedai.au` with CORS/`Failed to fetch`
- `build_portal_booking_snapshot` now treats payment mirror, academy snapshot, and portal audit reads as optional enrichment; if one of those lookups fails, the session is rolled back best-effort and the core booking workspace still renders
- `frontend/scripts/run_portal_auto_login_smoke.mjs` now asserts the portal actually renders the booking workspace and actions, not merely that the reference appears somewhere in the DOM
- live verification after deploy passed for booking reference `v1-db55e991fd`: API returned `200` with portal CORS headers, browser smoke reported `booking_loaded=true`, `error_state=false`, and `console_errors=0`, and stack health passed
- `POST /api/v1/portal/bookings/{booking_reference}/care-turn` now gives `portal.bookedai.au` a booking-reference anchored customer-care turn contract for returning customer questions
- portal answers are grounded in the same booking snapshot as the customer workspace: booking status, payment posture, support contact, academy/report context, enabled portal actions, and recent revenue-ops action runs
- the portal workspace now includes a customer-care status agent card, so customers can ask about payment, reschedule, class/report status, pause/downgrade/cancel routes, or support escalation without leaving the booking context
- explicit support/escalation signals in the portal care turn now queue a `portal.support_request.requested` audit/outbox item with the booking context attached, and admin Billing Support can triage that request beside reschedule/cancel portal requests
- the agent keeps the system-of-record boundary explicit: it suggests enabled request-safe next actions and escalates unsupported or incomplete paths instead of claiming that lifecycle changes happened instantly

Latest public/product search-results flow refinement from `2026-04-25`:

- `2026-04-26` homepage proof alignment changed the public chess quick prompt to `Book Co Mai Hung Chess Sydney pilot class this week`, matching the verified tenant catalog row instead of sending visitors through a generic Sydney chess search that could fall back to public web options
- the homepage proof row now names `Co Mai Hung Chess` with `Verified tenant booking` and `Grandmaster proof`, keeping the investor/customer proof claim aligned with the live runtime result
- live verification after deploy confirmed the new prompt returns a Co Mai Hung tenant-backed result, preserves tenant signal visibility, avoids the `No strong tenant catalog candidates` fallback warning, and has no console/request failures or horizontal overflow
- the public search frame now behaves more like a professional ChatGPT-style workspace: a calm composer, clear chat status, lightweight prompt chips, and no visual competition with the result list
- product search now keeps the composer visible in the first desktop viewport by reducing the welcome hero and limiting quick prompts, matching the way users expect to start a search before reading deeper proof
- search result cards now group the scan layer around provider/title, category/top-match badge, price or price posture, duration, location/provider, confidence, and one short fit/next-step line
- product and homepage search results now stay in a results-first state after ranking, so users can stop, scroll, and compare matches without the screen jumping or focus moving into booking before they ask for it
- result cards are intentionally compact and show only decision-critical facts in-list; fuller provider context, summary, confidence notes, next step, map/provider links, and booking continuation live in the detail popup
- result cards now expose a top-left thumbnail or branded preview fallback and a Google Maps action for physical-place matches, using a direct `map_url` when available or a venue/location/service Google Maps query when needed
- the search progress experience now moves faster and can explain early matches while maps, booking paths, and fit checks continue, so slower searches feel active instead of stalled
- follow-up questions and suggested refinements now stay inside the BookedAI chat conversation as actionable chips, keeping clarification interactive with the customer-facing agent instead of splitting questions into a separate panel
- popup/product assistant search no longer auto-selects the first suggestion after search; customers explicitly choose `View details` or `Book`, preserving review mode until a booking commitment is made
- popup/product assistant event selections now use the same real `/booking-assistant/session` backend handoff as service bookings: the frontend sends synthetic `event:<url>` ids plus event metadata, and the backend creates an attendance-request session/confirmation path without forcing Stripe-style payment routing for events
- chess searches that return the reviewed `Co Mai Hung Chess Class` / Grandmaster Chess tenant now label that result as a verified BookedAI tenant in the shortlist and selected-booking panel, with compact chips for booking, Stripe, QR payment/confirmation, calendar, email, WhatsApp Agent, and portal edit support
- tenant-confirmed chess bookings keep the portal-first confirmation contract: QR opens `portal.bookedai.au`, the confirmation copy names Stripe/QR/payment posture, email and calendar actions stay visible, and WhatsApp Agent follow-up is framed as the same customer-care channel used by BookedAI
- the verified-tenant search requirement is now synchronized into the detailed BookedAI design/PRD stack and the active Phase/Sprint `17-23` roadmap: Phase 17 owns the current results-first proof, and Phase 22 owns template extraction so the same treatment can be reused beyond chess

Latest tenant AI operations automation update from `2026-04-25`:

- tenant integrations now return an `automation` connection plan that explains which provider links are ready for BookedAI revenue operations: platform messaging, CRM write-back, webhook/workflow automation, and customer-care lifecycle state
- `POST /api/v1/tenant/operations/dispatch` now lets signed tenant admins/operators run the same policy-gated revenue-ops worker against that tenant's queued actions without exposing global admin dispatch
- tenant `Ops` now includes a `Run policy automation` control and links back to the integration connection plan, so tenant operations can move from passive action visibility into scoped automation execution
- the tenant automation guardrail is explicit: supported queued actions can run under worker policy, while missing contact, unsupported action types, or degraded provider paths move to manual review

Latest WhatsApp customer-care update from `2026-04-26`:

- BookedAI's runtime email sender identity now defaults SMTP username and From headers to `info@bookedai.au` whenever `EMAIL_SMTP_USERNAME` or `EMAIL_SMTP_FROM` are omitted, and customer-facing portal/support fallbacks now use that same address instead of `support@bookedai.au`.
- Homepage/product service bookings through `/booking-assistant/session` now also route operational email through `BOOKING_BUSINESS_EMAIL` / `info@bookedai.au`; tenant-owned catalog emails such as Future Swim branch mailboxes stay in catalog data and are CC'd only on BookedAI's internal booking lead notification, while the customer-facing support/contact identity remains `info@bookedai.au`.
- Confirmation email HTML rendering is now security-hardened: dynamic customer, provider, booking, support, and note values are escaped before entering HTML, support email links are encoded, and confirmation action URLs must be `http` or `https` before rendering.
- Messaging Automation provider URLs are now release-gated: Telegram controls and web-chat-compatible service-search responses only carry `http` or `https` provider links, and the root gate includes dedicated confirmation-email, provider-URL, private-channel identity, chat-send, Telegram, and WhatsApp fixtures.
- Tenant-owned homepage/product booking sessions now also notify the tenant through the Messaging Automation Layer, defaulting to Telegram tenant notification targets from tenant settings and recording a queued warning when no tenant Telegram chat id is configured yet.
- `/api/webhooks/whatsapp` now does more than log configured Twilio/Meta inbound messages: when the runtime has a communication service, it resolves the returning customer by booking reference first, then by WhatsApp phone/email when unambiguous
- BookedAI's default WhatsApp support identity is now the main number `+61455301335`, paired with `info@bookedai.au`; outbound booking confirmations tell customers they can reply on WhatsApp to ask any service question about an existing booking, including status, payment, provider, academy/report, support, reschedule, or cancellation review
- the WhatsApp runtime now treats the Evolution API personal WhatsApp QR-session bridge as the near-term primary provider for `+61455301335`, because WhatsApp Business verification is still blocking the Meta path; Meta/WhatsApp Cloud API and Twilio remain the later verified business-provider path
- outbound WhatsApp delivery has been narrowed to a provider/session issue rather than a backend payload issue: Evolution API v2.3.6 expects the `text` sendText payload, the backend now records a legacy-payload fallback attempt only for compatible bridges, and live probes show the remaining blocker is the Evolution instance `bookedai61481993178` in `connecting` state rather than `open`
- `python3 scripts/telegram_workspace_ops.py whatsapp-bot-status` now treats an Evolution fallback as a personal WhatsApp bridge and can downgrade readiness when the bridge connection state is not open, preventing operator checks from reporting the bot as safe to send while the QR session is disconnected
- at the operator's request, Evolution has been temporarily removed from the live outbound send path and WhatsApp chat is now Twilio-only by default (`WHATSAPP_PROVIDER=twilio`, empty fallback), so outbound probes no longer fall through to Meta while the Cloud API number remains unregistered
- direct provider probes after disabling Evolution show Meta Graph can read the BookedAI phone identity but message send returns `(#133010) Account not registered`, while Twilio remains the active default transport and currently records outbound attempts as queued/manual-review until the configured Twilio WhatsApp credentials/sender are repaired
- Sprint 19 P0-2 provider posture is now documented in `docs/development/whatsapp-provider-posture-decision-2026-04-26.md`: WhatsApp inbound/policy remains active, outbound delivery is not production-ready until Twilio or Meta returns a verified send state, and customer/operator copy must show queued/manual-review honestly rather than claiming full WhatsApp delivery
- public BookedAI contact links should open the Booking Customer Care Agent at `https://wa.me/61455301335`, keeping the customer-visible WhatsApp entrypoint aligned with the live agent identity
- inbound WhatsApp replies are handled as a dedicated `BookedAI WhatsApp Booking Care Agent` for `bookedai.au`, grounded in the same portal booking snapshot used by `portal.bookedai.au`, including booking status, payment posture, support contact, service/provider context, academy/report context, and recent revenue-ops action state
- clear customer requests to cancel or reschedule an existing booking now queue the same audited portal request records as the portal UI, instead of pretending the booking was changed instantly
- WhatsApp cancel/reschedule requests now also run lifecycle side effects: email confirmation is sent or recorded, a CRM task mirror is created through the email lifecycle sync path, and tenant bookings expose a recent customer request queue so tenant dashboards show the change request posture
- the OpenClaw-owned agent manifest now lives at `deploy/openclaw/agents/bookedai-whatsapp-booking-care-agent.json`, points at the Evolution webhook while the personal WhatsApp bridge is active, and syncs into the live OpenClaw runtime `agents/` directory through `python3 scripts/telegram_workspace_ops.py sync-openclaw-bookedai-agent`
- OpenClaw/Telegram is only the safe operator surface for repo/deploy/admin work and read-only runtime checks such as `python3 scripts/telegram_workspace_ops.py whatsapp-bot-status`; the customer-facing Booking AI Agent itself is the FastAPI webhook plus provider adapter path, not an OpenClaw programming bot
- OpenClaw exec approval repair is now repo-owned through `python3 scripts/telegram_workspace_ops.py fix-openclaw-approvals`, which aligns `tools.exec.ask` and host `exec-approvals.json` to `on-miss` when the gateway rejects `allow-always` because the effective policy is `ask: always`
- trusted full-control OpenClaw access is now repo-owned through `python3 scripts/telegram_workspace_ops.py enable-openclaw-full-access`, which sets full exec/no-approval policy, enables elevated full mode for `bot.bookedai.au` webchat, and enables Telegram elevated full mode for trusted operator ids by default
- if BookedAI cannot safely identify exactly one booking, the WhatsApp assistant asks for the booking reference before answering details, preserving tenant/customer data boundaries
- Phase 19 is now actively in implementation with WhatsApp as the first customer-care channel connected to the booking truth layer

Latest roadmap and pitch architecture visualization update from `2026-04-25`:

- `pitch.bookedai.au` has been compressed into a sharper buyer/investor narrative: hero, live tenant proof, problem, solution, product proof, pricing, one operating-model architecture visual, surfaces, trust/team, and final CTA
- `/architecture` is now a standalone big-tech-style architecture showcase page with a board-level revenue-engine diagram, system lane map, design capability cards, real product proof imagery, and enterprise posture section for technical buyers and investors
- the pitch architecture visual is now a professional multi-layer infographic rather than only `demand -> qualification -> booking -> ops ledger`; it groups customer surfaces, AI orchestration, revenue transaction core, operations control, partner/integration rails, and infrastructure/technology stack directly inside the pitch
- the pitch infographic explicitly maps BookedAI surfaces, customer/revenue/care agents, booking/payment/portal/email-calendar modules, tenant/admin/action-ledger controls, Stripe, Meta WhatsApp, Twilio, n8n, CRM/webhook recovery, OpenClaw, Telegram, Notion, Discord, React/TypeScript/Vite/Tailwind, FastAPI, Supabase/Postgres, Docker Compose, Nginx, and Cloudflare DNS/TLS
- the pitch architecture block has been tightened again into a compact architecture image plus four readable support rails, and the bottom CTA/footer are lighter so the removed `AI Revenue Engine for Service Businesses` brand-copy block no longer appears on the pitch page
- live deployment for that pitch polish completed on `2026-04-25`; stack health passed, live pitch desktop/mobile smoke confirmed the architecture image is present, the removed footer text is absent, `390px` mobile has no horizontal overflow, and the uploaded pitch video still serves byte ranges as `video/mp4`
- pitch and homepage navigation now expose the architecture showcase so investors can inspect the team's system-design capability without forcing the main pitch page back into a long technical scroll
- live verification passes for both `https://bookedai.au/architecture` and `https://pitch.bookedai.au/architecture` on desktop/mobile, including loaded proof images, no console/page/request errors, and no horizontal overflow
- pricing now appears immediately after product proof, so buyers see commercial terms before deeper platform explanation
- local and live Playwright verification after the rework reduced mobile pitch height from the prior roughly `44.9kpx` live review issue to about `21.0kpx`, with no console errors, failed requests, horizontal overflow, or overflowing elements
- live `pitch.bookedai.au` now serves the final hero `Convert service enquiries into confirmed bookings, follow-up, and revenue visibility.` plus the pricing-before-architecture flow; the latest deploy-live pass refreshed production web/beta-web and post-deploy desktop/mobile smoke confirmed the compressed operating-model pitch with no console errors, failed requests, or horizontal overflow
- the visual architecture explicitly maps pitch, product, demo/widget, portal, customer-facing AI, revenue-ops agent, customer-care/status agent, FastAPI booking contracts, tenant Ops, admin Reliability, CRM/email, and audit ledger into one simplified flow
- the public roadmap dataset now carries the current post-Sprint-16 sequence directly in code: `Phase/Sprint 17` full-flow stabilization, `18` revenue-ops ledger control, `19` customer-care/status agent, `20` widget/plugin runtime, `21` billing and receivables truth, `22` reusable tenant templates, and `23` release governance
- the roadmap's technical architecture copy now reflects the current implementation baseline: shared customer-turn contract, revenue-ops action ledger, tenant Ops visibility, portal-first confirmation, academy/Future Swim vertical proofs, and release-gated operations

Latest customer portal enterprise workspace update from `2026-04-25`:

- `portal.bookedai.au` now presents booking continuation as an enterprise customer workspace instead of a receipt-like review page: lookup, booking truth, payment posture, support route, provider details, customer details, academy progress, and timeline are arranged in a denser command-center layout
- the portal action model is now clearer and more professional: overview/edit/reschedule/pause/downgrade/cancel share one navigation model, the right-side action rail stays visible on desktop, and closing a request composer returns the URL/action state to overview
- customer-safe request flows remain on the existing backend contract; the redesign keeps `reschedule`, `cancel`, `pause`, and `downgrade` as queued/auditable requests rather than pretending instant mutation
- added Playwright coverage for the portal workspace render, reschedule request submission, and mobile horizontal-overflow guard
- verification passed with frontend production build, backend portal route tests through `.venv`, and focused Playwright portal smoke using an external preview server

Latest customer portal UAT/A-B follow-up from `2026-04-26`:

- `portal.bookedai.au` now has a measurable status-first action IA experiment: the default `status_first` variant orders customer actions as `Status`, `Pay`, `Reschedule`, `Ask for help`, `Change plan`, and `Cancel`, while `portal_variant=control` preserves the prior overview/edit/reschedule/pause/downgrade/cancel model
- portal funnel telemetry now emits to `window.__bookedaiPortalEvents`, optional `dataLayer`, and `bookedai:portal-event` for lookup, booking-loaded/failure, action navigation, request composer, request submission, and care-turn outcomes
- the status-first variant adds dedicated customer-facing `Pay`, `Ask for help`, and `Change plan` states while keeping pause/downgrade/cancel/reschedule request-safe under the existing audited backend contract
- verification passed with frontend typecheck, production build, focused portal Playwright coverage for action ordering/telemetry/reschedule/mobile no-overflow, live deploy, stack healthcheck, and production browser smoke confirming the status-first labels, loaded/pay-click events, no console/request failures, and mobile overflow `0`

Latest public brand/menu and booking-flow QA note from `2026-04-25`:

- `product.bookedai.au` and the shared public homepage booking runtime now show first likely local/catalog matches while live ranking continues, keeping the search surface useful during slower matching instead of waiting on a blank results state
- shortlist result interaction is now explicit and enterprise-style: selecting a result only marks it active, detail opens only from the detail icon, and a compact one-row action strip exposes provider link, detail, contact, phone/SMS when available, and `Book`
- the customer detail form now opens only after the user chooses `Book` for a selected result, so review/compare behavior stays separate from booking commitment
- booking confirmation now uses the booking reference as the durable customer anchor, generates QR against `portal.bookedai.au` for that reference, shows compact portal/email/calendar/chat/home actions, and keeps the Thank You state visible until the customer chooses another action; the homepage booking flow no longer auto-returns to the main search screen or shows a countdown chip
- BookedAI public, product, demo, shared landing, and brand-kit logo paths now use the operator-provided uploaded logo asset, with cropped responsive logo frames so top-left branding stays visible without horizontal overflow
- the public homepage and pitch surface now include the operator-provided `Chess_screen` proof image before the hero prompt/overview, framed as a professional chess academy product proof band that stays ahead of the main search-to-booking narrative without creating horizontal overflow
- the top `pitch.bookedai.au` chess proof image now sits in a padded professional screen frame with `object-contain` 3:2 sizing, so the image fits inside the card instead of being enlarged and cropped
- `pitch.bookedai.au` now closes with the operator-provided uploaded visual proof image as a full-width 3:2 frame, with the old verbose footer positioning/release text hidden on the pitch page so the bottom of the page stays clean on mobile and desktop
- the uploaded logo, chess proof, final contact proof, and pitch team images now have local optimized WebP variants under `frontend/public/branding/optimized/`, with `srcSet`/`sizes` on large proof images so browsers can choose smaller assets instead of downloading multi-megabyte upload originals
- the shared landing header menu now exposes professional product paths by default: Product, Live Demo, Tenant Login, and Roadmap, using lucide iconography instead of hand-drawn menu glyphs
- the public search workspace restored stable accessibility names for `Open Web App`, `Send search`, `Ready to receive`, and `Continue booking`, preserving the regression-tested homepage and booking flow after the app-shell redesign
- homepage live-read search now falls back from the customer-agent turn endpoint to the established v1 matching/search path when the newer customer-agent turn is unavailable, so booking can continue through `lead + booking intent` instead of stalling
- QA passed with production build, public homepage responsive Playwright coverage, and the live-read booking smoke that submits through the v1 booking intent path

Latest tenant gateway update from `2026-04-25`:

- `tenant.bookedai.au` now uses a simplified enterprise login layout with Google as the primary action, email-code fallback, and a compact create-account path instead of the previous guidance-heavy auth workspace
- the tenant login hero now includes the operator-provided workspace screenshot as a locally optimized responsive WebP preview panel on desktop/tablet, while mobile keeps the auth form prioritized without horizontal overflow
- the frontend now sends the correct Google auth intent: gateway `Sign in` stays sign-in, gateway `Create account` creates a new tenant, and tenant-specific workspace URLs continue to sign in against that tenant scope
- backend Google tenant auth now refuses to create a new tenant or membership when the request is explicitly a sign-in with no active membership, while preserving the dedicated Google create-account path for new tenant workspaces
- live QA on `tenant.bookedai.au/future-swim` found and fixed two backend asyncpg typing failures in tenant audit/revenue reporting plus a React hook-order crash that blanked the workspace after data load
- focused backend tenant auth tests, full backend tests, frontend typecheck/build, stack health, and live Playwright desktop/mobile tenant gateway + Future Swim workspace QA passed with no console errors and no mobile horizontal overflow

Tenant enterprise polish follow-up from `2026-04-26`:

- the tenant email-code submit CTA now has one stable accessible name, preserving mobile `Send code` visual copy while exposing `Send login code` to assistive tech and regression tests
- `tenant.bookedai.au/future-swim` now presents first-scan metadata as buyer-facing access and trust posture instead of raw internal role/source labels, while release diagnostics remain available as support detail
- Future Swim mobile preview now compresses lower brand and AI-import explanation behind a disclosure so the first signed-out scan stays focused on revenue proof, activation, bookings, billing readiness, and sign-in intent
- tenant gateway Playwright coverage now matches the outcome-led gateway copy and guards against the duplicated email CTA accessible-name regression

Latest next-phase plan update from `2026-04-25`:

- `docs/development/next-phase-implementation-plan-2026-04-25.md` is now the active implementation bridge for the next BookedAI phases
- `Phase 17` closes the current full-flow stabilization baseline: pitch package registration, product booking, payment-intent preparation, follow-up automation, and a persistent portal-first Thank You confirmation that no longer auto-returns to the main BookedAI screen
- `Phase 18` through `Phase 23` are now ordered as revenue-ops ledger control, customer-care/status agent, widget/plugin runtime, billing and receivables truth, reusable multi-tenant templates, and release governance/scale hardening

Latest Phase 18 implementation note from `2026-04-25`:

- `GET /api/v1/agent-actions` now supports entity, agent-type, dependency-state, and lifecycle-event filters plus ledger summary counts
- action-run responses now carry derived lifecycle event, dependency state, policy mode, approval requirement, and evidence summary fields without requiring a schema migration
- admin Reliability can filter action runs by entity id, dependency state, and lifecycle event, then inspect policy/evidence summary beside input/result evidence
- tenant workspace now includes a read-only `Ops` panel so tenants can see queued, failed, manual-review, sent, and completed BookedAI revenue-ops actions, including what lifecycle event triggered them and whether the action is policy-gated or approval-required

Latest admin workspace recovery note from `2026-04-25`:

- live `admin.bookedai.au` login failure was traced to routing: the admin host served the Vite admin shell for `/api/admin/login`, causing `POST /api/admin/login` to return frontend nginx `405` before it could reach FastAPI
- `deploy/nginx/bookedai.au.conf` now gives the admin host an explicit `/api/` backend proxy, matching the other runtime hosts and restoring the path used by the shipped shared-frontend admin login
- `frontend/nginx/default.conf` also proxies `/api/` to the backend before SPA fallback, so container-level or direct frontend-host deployments cannot intercept admin API calls as static HTML
- the live proxy was restarted after container-level `nginx -t` passed; `admin.bookedai.au/api/health` now returns backend JSON and bad-password login probes return backend `401`, confirming the domain no longer swallows admin API requests into the frontend shell
- `frontend/src/components/AdminPage.tsx` and `frontend/src/features/admin/workspace-nav.tsx` now arrange the shipped admin runtime as a sidebar-led workspace shell, grouping `Operate`, `Tenants`, `Revenue`, and `Platform` lanes while keeping active workspace content visible beside the menu
- follow-up hardening now forces the dedicated admin host to resolve the frontend API base to same-origin `/api` before reading `VITE_API_BASE_URL`, preventing browser-specific cross-origin login failures such as raw `Load failed`; the admin login screen has also been rebuilt as a dark enterprise control-plane entry surface with clearer secure sign-in, API-route posture, and operator workspace context
- the production Compose runtime now passes `SESSION_SIGNING_SECRET`, `TENANT_SESSION_SIGNING_SECRET`, and `ADMIN_SESSION_SIGNING_SECRET` into both `backend` and `beta-backend`, closing the live gap where correct credentials could still hit `SessionTokenError: Missing admin session signing secret` after `/api/admin/login`
- live admin UAT on desktop `1440x950` and mobile `390x844` passed after redeploy: login, Overview, Billing Support, Messaging, Tenants, Tenant Workspace, Catalog, Integrations, Reliability, Audit & Activity, and Platform Settings all loaded with `200` API responses, no browser console/page/request failures, and no horizontal overflow
- follow-up admin investor/SME polish on `2026-04-26` tightened the enterprise shell without changing backend contracts: the mobile top bar now separates session state from action buttons, KPI cards expose board-facing definitions, admin booking search no longer pushes the mobile CTA outside its card, booking table cells wrap safely, and Reliability copy now presents `AI quality`, `automation triage`, and `Automation control ledger` instead of prompt-internal labels
- verification for that polish passed with frontend typecheck, Vite production build, hosted HTML generation, and local Playwright desktop/mobile layout evidence under `output/playwright/admin-polish-local-2026-04-26/`; desktop/mobile had no horizontal scroll, no console errors, and no visible `Prompt 5`/`Prompt 11` copy in the Reliability workspace

Latest homepage AI-agent continuation note from `2026-04-25`:

- `POST /api/v1/agents/customer-turn` now gives the public customer-facing AI agent a reusable backend turn contract: one chat message in, one grounded assistant reply out, plus search payload, phase, missing context, suggestions, and next-agent handoff metadata
- `frontend/src/apps/public/HomepageSearchExperience.tsx` now keeps a visible customer-agent chat thread: user turns, assistant replies, inline top-result mini cards, and quick suggestion chips stay in the conversation so the user can continue refining instead of jumping between disconnected panels
- the homepage live-read path now calls the customer-agent turn contract first, then renders the returned search payload and assistant reply inside the same chat-to-booking workspace
- `frontend/src/components/landing/assistant/BookingAssistantDialog.tsx` now also consumes the same customer-agent turn contract for popup/product assistant searches before falling back to legacy streaming, keeping homepage, product, and embedded assistant behavior aligned
- clarification chips now continue the same chat flow and rerun search with the added context, keeping the public agent closer to `ask -> refine -> show results -> book`
- `POST /api/v1/revenue-ops/handoffs` now queues SME revenue-operations actions after a booking lifecycle event, using `agent_action_runs` for lead follow-up, payment reminder, CRM sync, customer-care status monitoring, and webhook callbacks
- homepage and popup/product booking automation now call that handoff after payment and communication best-effort work, so the customer-facing search/conversation agent can spawn the revenue-operations agent for downstream SME operations; admin Reliability can filter those generic SME action types beside the chess academy actions

Latest product-runtime QA note from `2026-04-24`:

- `product.bookedai.au` was live-QA tested across desktop and mobile after the product-shell polish; the mobile first screen now exposes quick-search cards immediately, and the desktop shell has more room for the live product proof instead of a narrow phone-like frame
- `/api/v1/payments/intents` now resolves booking intents by UUID text or `booking_reference`, casts mixed service and tenant join keys safely, and writes payment mirror state under the booking's real tenant, preventing the previous browser-visible payment CORS/500 failure after booking confirmation
- final production Playwright smoke created booking `v1-1ed89a5995` through search, match, lead, booking intent, payment intent, email, SMS, and WhatsApp with all observed API calls returning `200`, no console errors, and no failed browser requests

Latest public marketplace visual update date: `2026-04-24`.

Latest widget/plugin architecture update date: `2026-04-23`.

Latest pitch registration stability update from `2026-04-24`:

- `pitch.bookedai.au` pricing CTAs now route into the real `RegisterInterestApp` on `/register-interest` instead of being shadowed by the pitch host route
- `https://pitch.bookedai.au` is now allowed by production CORS for the configured `api.bookedai.au` frontend API base, so BookedAI package registration can submit from the pitch host without `Failed to fetch`
- pricing consultation creation now degrades external calendar, Stripe, event-store, or dual-write side-effect failures into manual follow-up states instead of failing the customer-visible registration flow
- live browser verification completed from `pitch.bookedai.au` pricing through SME details submission to confirmation reference `CONS-391FA9D5`, with no app console errors and no horizontal overflow

From this point onward, it serves three purposes:

- act as the master index for all project documentation
- define the change discipline for future upgrades
- ensure every new request is synchronized across all affected modules

## Source Of Truth Rule

`project.md` is the single project-level source of truth for:

- current project scope
- active delivery baseline
- documentation hierarchy
- synchronization rules between product, architecture, and implementation docs

All other documents should be treated as supporting or specialized documents.

That means:

- `README.md` explains setup, repo usage, and operator-facing entry points
- `DESIGN.md` captures design-system or UX implementation intent
- `docs/architecture/*` contains domain, platform, and execution deep-dives
- `docs/development/*` contains working plans, rollout notes, and implementation packages
- `docs/users/*` contains audience-specific guides

If any supporting document conflicts with `project.md`, treat `project.md` as authoritative until the inconsistency is explicitly resolved.

Every meaningful implementation change that affects direction, architecture, roadmap, or delivery state should update `project.md` first, then sync the downstream document set.

## Memory Hygiene Rule

BookedAI working memory should preserve durable project context, not execution noise.

That means:

- store decisions, outcomes, blockers, follow-up risks, and next steps
- do not store routine shell history, raw command transcripts, git command sequences, or ordinary build and deploy logs in dated memory notes
- only preserve command-level detail when it reveals a durable failure mode, environment constraint, or operator requirement that will matter later
- prefer short outcome-oriented summaries over step-by-step execution diaries

## Latest Synced Delivery Note

As of `2026-04-21`, the synchronized repo baseline now includes both product-surface continuity work, a backend ownership cleanup pass, and a more explicit CI/CD deployment runbook.

The current inherited truth is:

- the production multi-surface frontend currently still runs from the React + TypeScript + Vite application under `frontend/`
- the public booking-search lane on `2026-04-23` now carries two explicit requirements together:
  - continue-booking must stay resilient even when the newer v1 write path is degraded, which means user-facing booking submit should fall back safely instead of leaving the UI in a loading-fail state
  - slow search and matching phases must feel guided and professional, with visible in-progress matching states, clearer explanation of what BookedAI is doing, and lightweight prompts that invite the user to add location, timing, audience, or preference detail while ranking is still running
- the root `app/` and `components/` Next.js subtree now exists as a parallel marketing/runtime experiment, but it is not yet the sole production web source
- as of `2026-04-23`, the public booking/search flow must also be treated as an embeddable multi-tenant runtime, not only a BookedAI-owned page experience:
  - the same assistant and booking lifecycle should be installable as a plugin/widget on customer-owned SME websites
  - the widget/plugin should operate as receptionist, sales, and customer-service surface while still flowing into the shared BookedAI booking, payment, portal, and follow-up lifecycle
  - runtime identity now needs to stay explicit through tenant, widget, deployment-mode, host-origin, source-page, and campaign context so many SME customers can share one BookedAI platform safely
  - the managed booking portal should be treated as the persistent post-booking control surface for widget installs too, including review, edit, reschedule, cancel, and resubmit behavior
  - the next chess-academy productization layer is now captured in `docs/architecture/demo-grandmaster-chess-revenue-engine-blueprint.md`, which upgrades the current demo direction from search-plus-booking proof into a full recurring-revenue academy loop covering assessment, placement, subscription, coach reporting, parent portal, and retention automation while keeping the architecture reusable for many tenants later
- the backend top-level router is now mounted in `backend/app.py` through explicit modules:
  - `public_catalog_routes`
  - `upload_routes`
  - `webhook_routes`
  - `admin_routes`
  - `communication_routes`
  - `tenant_routes`
- compatibility router shims remain in place for older imports, so the cleanup improves ownership without forcing an immediate breaking import change
- the main remaining backend monolith is now explicitly identified as `backend/api/v1_routes.py`
- the approved backend bounded-context target is now:
  - `booking`
  - `tenant`
  - `admin`
  - `search_matching`
  - `communications`
  - `integrations`
- session-signing is now split by actor boundary in code and docs through:
  - `SESSION_SIGNING_SECRET`
  - `TENANT_SESSION_SIGNING_SECRET`
  - `ADMIN_SESSION_SIGNING_SECRET`
- session signing no longer falls back to `ADMIN_API_TOKEN` or `ADMIN_PASSWORD`; actor-specific session secrets or `SESSION_SIGNING_SECRET` are now required
- the root `Next.js` admin auth lane now defaults to per-user email verification codes at `/admin-login`, while password bootstrap auth has been reduced to an explicitly enabled break-glass path
- until the Prisma admin schema is actually promoted into the live database, that root admin email-code lane now resolves identities from legacy tenant memberships and stores verification codes in legacy `tenant_email_login_codes`; Prisma-backed `admin_email_login_codes` remains the preferred path only when `BOOKEDAI_ENABLE_PRISMA=1`
- the next admin productization wave is now requirements-locked through `docs/architecture/admin-enterprise-workspace-requirements.md`
- the detailed implementation blueprint for that wave now lives in `docs/architecture/admin-workspace-blueprint.md`
- that admin wave should now be interpreted as:
  - enterprise login and menu-first information architecture
  - tenant management as a first-class admin lane
  - direct tenant branding and HTML content editing
  - tenant role and permission management from admin
  - full tenant product or service CRUD from admin
  - a phased revenue-engine workspace that expands from auth, tenant core, users, CRM, bookings, services, payments, dashboard, and audit into campaigns, workflows, messaging, automation, and reporting
  - current execution order for that workspace is now locked more explicitly:
    - `Phase 0`: runtime and ownership decision for the admin surface
    - `Phase 1`: production auth, signed session, tenant context, RBAC, and immutable audit baseline
    - `Phase 2`: Prisma and repository parity so current admin modules stop depending on mock-only data truth
    - `Phase 3`: tenant, users, roles, settings, and audit control-plane completion
    - `Phase 4`: revenue-operations module hardening across customers, leads, services, and bookings
    - `Phase 5`: payments and revenue-truth enrichment
    - `Phase 6`: dashboard, reporting, and operator analytics expansion
    - `Phase 7`: growth modules such as campaigns, workflows, messaging, and automation
- until the runtime decision changes explicitly, the deployed and operator-facing admin productization lane should be treated as the shared `frontend/src` admin shell, while the root `Next.js` admin tree remains the parallel foundation lane for auth, repository, and future ownership promotion work
  - the shared frontend admin runtime then moved one more practical step on `2026-04-23` into the first enterprise IA package:
    - `frontend/src/components/AdminPage.tsx`, `frontend/src/features/admin/workspace-nav.tsx`, and `frontend/src/features/admin/workspace-insights.tsx` now expose a menu-first shell aligned to the locked requirements baseline
    - the active admin shell now presents `Overview`, `Tenants`, `Tenant Workspace`, `Catalog`, `Billing Support`, `Integrations`, `Messaging`, `Reliability`, `Audit & Activity`, and `Platform Settings` as first-class workspaces instead of stopping at the earlier four-workspace split
    - the admin tenant lane is now intentionally separated into a lightweight tenant directory plus a deeper mutable tenant workspace, so operators can confirm scope before editing branding, roles, HTML content, or services
    - the same package also gives admin explicit section-guidance and route homes for billing/support review, integrations review, audit chronology, and platform settings without waiting for every deeper backend read model to land first
  - the public homepage and booking-assistant runtime also moved one more practical step on `2026-04-23`:
    - the broader architectural requirement for that flow is now captured in `docs/development/widget-plugin-multi-tenant-booking-architecture-2026-04-23.md`, which locks BookedAI's direction as a reusable embedded runtime for many SME websites rather than only a single homepage assistant
    - `frontend/src/apps/public/PublicApp.tsx` now uses the new marketplace strategy image as the opening-session visual backdrop, reframing the homepage hero around BookedAI's longer-term SME services marketplace direction rather than only a narrower search-assistant frame
    - that same homepage now reuses the same visual language more lightly in secondary sections so the category-expansion message feels intentional and productized instead of like one isolated hero image drop-in
    - the homepage opening layer now also adds subtle motion polish through a restrained hover-scale background treatment so the first-entry surface feels more premium without undermining readability or CTA focus
    - `frontend/src/apps/public/HomepageSearchExperience.tsx` now falls back to the legacy booking-session path when the live v1 booking write fails at server or network level, preventing the `Continue booking` path from stalling when `/api/v1/leads` or `/api/v1/bookings/intents` are unhealthy
    - as of `2026-04-24`, the homepage live-read happy path no longer tries to hydrate shortlist bookings back through the legacy catalog session flow, so non-catalog or live-read matches stay on the authoritative v1 booking-intent lane instead of surfacing `Selected service was not found`
    - the homepage search surface now also exposes a staged in-progress matching treatment, with clearer search-progress labels, richer loading explanation, and contextual prompts that ask for suburb, time window, audience, or preference detail while search is still resolving
    - `frontend/src/components/landing/assistant/BookingAssistantDialog.tsx` now mirrors that same more professional matching-state treatment so homepage, popup, and embedded assistant flows do not drift in tone
    - `frontend/src/components/landing/sections/BookingAssistantSection.tsx` now uses a richer loading message that explains intent, locality, and shortlist checks instead of only showing a generic searching bubble
    - the root Next.js homepage shell also moved into a calmer Google-like light-theme pass: the hero now keeps the existing logo and navigation but uses a cleaner search-led above-the-fold composition, while the rest of the page now uses fewer cards, wider whitespace, lighter typography, and quieter white/pale-blue sections instead of the earlier dark glass-heavy landing treatment
  - the live homepage baseline then changed again on `2026-04-24`:
    - `bookedai.au` now redirects to `pitch.bookedai.au` at the production proxy layer so public internet traffic lands on the pitch host instead of serving a separate apex-domain homepage runtime
    - the shipped homepage now keeps the current logo and navigation while presenting a blue search-led hero, quieter white/pale-blue support sections, lighter pricing and FAQ treatment, and the existing live `HomepageSearchExperience` lower on the page
    - production deployment completed through `python3 scripts/telegram_workspace_ops.py deploy-live`, host health passed via `bash scripts/healthcheck_stack.sh`, and a live proof screenshot now exists at `artifacts/screenshots/publicapp-live-2026-04-24.png`
  - the active homepage UX priority then shifted again later on `2026-04-24`:
    - the homepage should now be treated as a responsive web-app workspace first, not a marketing page with extra narrative sections
    - the desired interaction model is closer to current ChatGPT search UX than a stacked landing page: one primary search surface, same-page results, and one adjacent BookedAI booking rail on desktop
    - future homepage work should prefer calmer app-shell structure, tighter copy, stronger responsive behavior, and fewer decorative sections until the core search workspace feels premium enough to stand on its own
  - the public entry surface then moved one more practical step again on `2026-04-24`:
    - `frontend/src/apps/public/DemoLandingApp.tsx` is now a dark premium fullscreen chat-first runtime instead of the older story-led demo landing page
    - the demo host now treats `chat = input`, `booking = output`, and `revenue = outcome` as one connected workspace with a live conversation rail, real result cards, and an inline booking-plus-payment panel
    - the new demo runtime is wired directly to the BookedAI v1 public flow through `searchCandidates`, booking-path resolution, authoritative `lead + booking intent` creation, and `payment intent` preparation so `demo.bookedai.au` behaves like product proof rather than static marketing
    - the next required expansion for that host is now explicit: `demo.bookedai.au` should become the canonical first-minute proof of the full BookedAI revenue engine for the Grandmaster Chess Academy use case, which means the surface must next show assessment, placement, subscription-aware payment, coach input, report preview, and retention-loop state instead of stopping at booking intent
    - that academy-first expansion has now moved one more real step into the shared portal and customer-care lane on `2026-04-24`: the demo flow already persists a parent-facing `academy_report_preview` into booking metadata, and `portal.bookedai.au` must now treat that same booking as a continuing student account with progress context plus managed `reschedule`, `pause`, `downgrade`, and `cancel` request actions rather than a generic one-off booking receipt
    - that same backend slice has now moved again on `2026-04-24` from booking-metadata-only continuity into the first dedicated academy read model: `backend/migrations/sql/017_academy_snapshot_read_models.sql`, `backend/repositories/academy_repository.py`, and `backend/service_layer/academy_service.py` now persist tenant-scoped `academy_students`, assessment snapshots, enrollment snapshots, report snapshots, and portal-request snapshots so demo, portal, and later retention automation can reopen the same student truth safely
    - the current academy API contract now also includes dedicated read and retention seams through `/api/v1/academy/students/{student_ref}`, `/api/v1/academy/students/{student_ref}/report-preview`, `/api/v1/academy/students/{student_ref}/enrollment`, `/api/v1/portal/requests/pause`, and `/api/v1/portal/requests/downgrade`, while the existing `/api/v1/reports/preview` flow dual-writes into both booking metadata and the new academy read model for backward-compatible rollout
    - motion polish for that runtime now uses `framer-motion`, and the UI direction is intentionally closer to Stripe / Linear / OpenAI-grade SaaS product surfaces than to a generic chatbot demo
    - the hero layer on that same runtime now also follows a stronger ChatGPT-like booking homepage pattern: logo-only top nav, one dominant centered composer, approved quick-booking suggestion chips, instant chip-triggered search, subtler animated gradient atmosphere, and browser voice input for the main prompt
    - the chat interaction on that runtime is now explicitly optimized for fast booking: BookedAI should ask at most one short clarification first, or a second only when the user answers and one critical detail is still missing, while keeping results visible immediately instead of forcing a long multi-turn intake
    - the results workspace on that runtime now also behaves like a proper real-time booking panel: desktop uses a `40% chat / 60% results` split, mobile surfaces results in a slide-up bottom sheet, and each result card now shows image, rating, price, availability slots, and a direct `Book Now` action with skeleton loading and hover/fade polish
    - the primary booking path on the demo host is now inline-modal based: `Book Now` opens a modal, confirmation stays minimal, payment advances through an inline v1 `payment intent` stage, success resolves in-place with confirmation previews, and the old side-panel form no longer acts as the main booking surface
    - the active `DemoLandingApp` route now points at the modular API-backed demo runtime instead of the older local mock flow, so the shipped demo host uses the same public assistant session, shortlist, booking-intent, and payment-intent contracts that the rest of BookedAI exposes
    - `/api/v1/payments/intents` now also goes one step further than the earlier additive stub: `stripe_card` can create a real hosted Stripe Checkout session when service pricing is available, `partner_checkout` can hand back the service booking URL directly, and mirror records now persist the resulting `payment_url` plus dependency state for portal and admin follow-up
    - demo payment state is now truthful to the declared contract: if `/api/v1/payments/intents` returns a real checkout URL the UI opens that secure payment step, and if the API still only has a pending or confirmation-first posture the UI stays in `awaiting confirmation` rather than falsely marking the booking as `paid`
    - the homepage demo narrative is now also self-playing after `3s` of idle time: BookedAI automatically types a sample tutor query that currently returns live candidates, shows loading and results, opens booking, and advances through the inline booking plus payment-intent flow so a first-time visitor can understand the product in roughly `10s` without touching the UI
    - the demo host then received a full-flow professional workspace redesign on `2026-04-24`: header status, flow rail, intake composer, academy matches, revenue workflow, booking lock state, payment truth, and parent-report continuity now read as one connected `intent -> assessment -> placement -> booking -> report/retention` product proof across desktop and mobile
    - the chess connected-agent slice then advanced into subscription and revenue-ops handoff: `POST /api/v1/subscriptions/intents`, `academy_subscription_intents`, and `agent_action_runs` now let a booking-linked academy student create a subscription intent and queue visible revenue-operations actions for confirmation, reminder, CRM sync, report generation, and retention evaluation
    - the same revenue-ops foundation now also has direct queue seams for report generation and retention evaluation through `POST /api/v1/reports/generate` and `POST /api/v1/retention/evaluate`, both writing auditable action-run records instead of UI-only placeholders
    - the revenue-ops ledger now has first tenant/admin inspection and control seams through `GET /api/v1/agent-actions`, `GET /api/v1/agent-actions/{action_run_id}`, and `POST /api/v1/agent-actions/{action_run_id}/transition`, so action runs can move beyond `queued` with audit and outbox evidence
    - the same ledger now has a first tracked worker dispatch seam through `POST /api/v1/agent-actions/dispatch`, backed by `workers/academy_actions.py` and `job_runs`, so queued actions can be processed into `sent`, `completed`, `manual_review`, or `failed` based on current policy instead of relying only on manual transition calls
    - admin Reliability now surfaces that ledger through `frontend/src/features/admin/revenue-ops-action-ledger.tsx`, giving operators status/action filters, dispatch control, summary counts, and quick complete/manual-review transitions for the chess revenue-ops actions
    - the demo host then received a follow-up quality pass: desktop results no longer clip, the booking modal is viewport-safe on mobile, result media has a branded fallback, revenue-agent actions render as a clearer handoff timeline, and assessment API failures no longer masquerade as global search failures
    - the demo host now also has dedicated Playwright live-read regression coverage for that connected-agent proof. The suite locks partial assessment-failure behavior plus a mobile full flow from search through assessment, placement, booking, report preview, and revenue-agent handoff; the QA pass also hardened assessment/placement response normalization, placement slot conversion, fast-answer shortlist continuity, and no-checkout-url payment copy.
    - the `2026-04-24` go-live release gate then passed across backend booking/payment contracts, pricing/register resilience, portal, academy/revenue-ops routes, frontend build, demo Playwright regression, production deploy, stack healthcheck, CORS preflight, DNS, and browser smoke. The release fixed demo-origin CORS for `/api/v1/conversations/sessions` and corrected `chess.bookedai.au` into a proxied Cloudflare record on the active origin so all current public proof hosts respond through the expected edge path.
  - the same `Phase 7` growth lane then moved one step further on `2026-04-23` into the first messaging foundation:
    - FastAPI admin now exposes `/api/admin/messaging` plus source-specific detail and action routes for unified operator review
    - the first messaging workspace reads from `email_messages`, `outbox_events`, and `crm_sync_records` instead of inventing a disconnected communication-only store
    - the shared admin shell now gives operators one place to filter delivery posture by channel, status, tenant, or entity before opening payload and event detail
    - the first low-risk messaging actions now exist for outbox retry, CRM retry, and lifecycle email manual-follow-up marking
  - that same shared frontend admin runtime then moved one more practical step again on `2026-04-23` from route homes into usable read-model workspaces:
    - `Billing Support` now opens with queue-level summary cards for portal requests, payment-attention items, unresolved work, escalations, and reviewed cases before operators drop into the full support queue
    - `Integrations` now derives CRM, messaging, payment, and webhook attention panels from the current admin event feed plus support queue so cross-system review is useful without waiting for a dedicated backend dashboard
    - `Audit & Activity` now combines recent provider or communication events with queue posture into one chronology-oriented replay surface instead of staying a thinner generic event list
  - the first `Phase 1` code slice is now present in the root admin lane:
    - signed admin session verification now uses `ADMIN_SESSION_SIGNING_SECRET` preference with shared fallback compatibility
    - root admin auth now exposes `POST /api/admin/auth/login`, `POST /api/admin/auth/logout`, `GET /api/admin/auth/me`, and `POST /api/admin/auth/switch-tenant`
    - tenant context is now filtered against the signed session's allowed tenant ids
    - RBAC coverage now includes the broader enterprise modules required for later `tenants`, `users`, `roles`, `settings`, `payments`, and `reports` lanes
    - auth events such as login, logout, and tenant-switch now write audit entries through the root admin repository baseline
  - the first practical `Phase 2` data-parity slice is now also present in the root admin lane:
    - `prisma/schema.prisma` now includes the admin fields needed by the current root modules for customer full name, source, tags, notes summary, lead pipeline and follow-up state, and payment records
    - `prisma/seed.ts` now seeds those richer customer and lead fields so Prisma-backed admin reads stay closer to the current UI contract
    - `lib/db/admin-repository.ts` now prefers Prisma-backed reads and writes for dashboard, customers, leads, services, bookings, payments, and audit logs when `BOOKEDAI_ENABLE_PRISMA=1`
    - the remaining mock-store path is now a fallback instead of the only truth path for the new admin workspace
  - that `Phase 2` slice then moved one step further:
    - Prisma models now also exist for `permissions`, `role_permissions`, `branches`, `tenant_settings`, `subscriptions`, and `invoices`
    - the root admin repository now also exposes preparatory Prisma-backed seams for `listUsers`, `listRoles`, `getTenantSettings`, and paginated `listPayments`
    - a migration artifact now exists at `prisma/migrations/20260422034156_phase2_admin_prisma_parity/migration.sql`, covering both richer customer and lead columns plus the new payment and control-plane tables
  - that `Phase 2` parity lane then moved one step further again on `2026-04-22`:
    - the root admin repository now also exposes Prisma-backed `listBranches` and `getTenantBillingOverview` seams over the already-seeded `branches`, `subscriptions`, and `invoices` models
    - `/admin/settings` now surfaces tenant branch footprint plus subscription and invoice posture instead of stopping at branding-only fields, so the settings lane starts reading from the same tenant-control data already present in schema and seed coverage
    - the mock-store path now mirrors those same branch and billing records too, keeping the fallback behavior closer to the database-backed UI contract
  - that same `Phase 2` parity lane then moved one step further again on `2026-04-22` into mutation coverage:
    - the root admin repository now also supports `createBranch`, `updateBranch`, branch archive or reactivate state changes, and `updateTenantBillingSettings` for the current subscription baseline
    - `/admin/settings` now supports branch add/edit/archive/reactivate actions plus billing baseline edits for provider, plan code, status, external id, and renewal date instead of leaving those controls as read-only summary cards
    - the settings server-action layer and admin settings API now inherit the same branch and billing parity data so Phase 2 covers both read and write seams for the newly surfaced tenant-control entities
  - that same `Phase 2` parity lane then moved one step further again on `2026-04-22` into explicit admin API parity:
    - root admin now exposes `GET/POST /api/admin/settings/branches`, `GET/PATCH /api/admin/settings/branches/:branchId`, and `GET/PATCH /api/admin/settings/billing`
    - the branch detail API supports both metadata edits and active-state mutation, so integrations do not need to rely on server actions to manage branch lifecycle
    - this closes the main remaining gap between the new settings UI mutations and reusable admin API seams for the same tenant-control entities
  - the first practical `Phase 3` control-plane slice is now also in code:
    - root admin navigation now includes `Team`, `Payments`, and `Settings`
    - `/admin/team` now supports team-member creation plus status and primary-role assignment, backed by `/api/admin/users`, `/api/admin/users/:id`, and `/api/admin/roles`
    - `/admin/settings` now supports tenant profile and branding edits, including editable HTML introduction content, backed by `/api/admin/settings`
    - `/admin/payments` now supports filtered ledger reads, payment recording, and payment status updates, backed by `/api/admin/payments` and `/api/admin/payments/:id`
  - that same `Phase 3` settings lane then moved one step further again on `2026-04-22`:
    - `/admin/settings` now also surfaces editable workspace operational guides for `overview`, `experience`, `catalog`, `plugin`, `bookings`, `integrations`, `billing`, and `team`, instead of leaving those tenant-runtime instruction layers writable only from the tenant side
    - the same lane now also exposes billing-gateway controls for `merchantModeOverride`, `stripeCustomerId`, and `stripeCustomerEmail`, so admin can inspect and adjust tenant Stripe posture without leaving the control plane
    - root admin now also exposes `GET/PATCH /api/admin/settings/guides` and `GET/PATCH /api/admin/settings/gateway`, bringing those settings slices under the same reusable API posture as the rest of the admin control plane
  - that same `Phase 3` settings lane then moved one step further again on `2026-04-22` into plugin runtime control:
    - `/admin/settings` now also exposes the core `partner_plugin_interface` runtime fields used by the tenant plugin workspace, including partner site URL, BookedAI host, embed path, widget script path, widget id, headline, prompt, CTA labels, support contacts, and logo URL
    - root admin now also exposes `GET/PATCH /api/admin/settings/plugin`, so plugin runtime configuration can be managed through the same admin API posture instead of only through tenant-side controls
    - the aggregate admin settings response now also carries `pluginRuntime`, keeping the main settings read model aligned with the new control-plane section
  - that same `Phase 3` settings lane then moved one step further again on `2026-04-22` into integration operator posture:
    - `/admin/settings` now also mirrors backend integration health for the active tenant, including provider posture, CRM retry backlog, reconciliation sections, Zoho CRM connection posture, outbox backlog, and recent runtime activity, so operators can inspect integration runtime state without leaving the admin control plane
    - the same slice now also includes a provider credential-safe overview across the exposed connectors, so admin can compare configured-field coverage and readiness posture per provider without touching secrets
    - root admin now also exposes `GET /api/admin/settings/integrations`, and the aggregate admin settings response now also carries `integrations`
    - this slice intentionally keeps integration provider writes tenant-owned, with admin settings linking back into the tenant integrations workspace instead of bypassing the existing tenant membership boundary
  - that `Phase 3` slice has now been extended into a fuller control plane:
    - `/admin/roles` now exposes a permission editor so role posture can be adjusted without leaving the workspace
    - `/admin/audit` now exposes a dedicated audit investigation surface with search, entity-type filtering, and pagination
    - `/api/admin/roles` now supports both role catalog reads and permission-set updates, and `/api/admin/audit` now supports paginated audit log reads
  - that `Phase 3` lane now also includes safer tenant support investigation:
    - `/admin/tenants` now gives the root admin lane a dedicated tenant investigation workspace instead of forcing operators to infer tenant issues from unrelated pages
    - the investigation surface now reads tenant-auth, billing, and CRM retry posture from the production tenant runtime through read-only snapshots before deeper intervention is attempted
    - root admin session now supports audited `read_only` tenant support mode with explicit bannering, reason capture, and separate start/end audit events instead of turning normal admin tenant context switching into a write-capable impersonation flow
    - `/admin/tenants` now also provides direct deep links into tenant runtime `overview`, `billing`, `team`, and `integrations` sections so support investigation can bridge cleanly into tenant-facing context without abandoning the safer admin investigation lane
    - `/admin/tenants` now also merges tenant-auth, billing, CRM, integrations, and support-session audit signals into one unified investigation timeline so operators can read a tenant support case in sequence instead of stitching together separate cards by hand
    - the same support-mode context now also follows operators into the main admin workspaces through shared inline banners with quick return-to-investigation and tenant-runtime section links, so tenant context remains visible outside `/admin/tenants`
    - tenant runtime pages now also understand admin support-return context, so when a tenant section is opened from admin support mode the operator can jump back to the same admin investigation or admin workspace without losing the current tenant
    - read-only support mode now also enforces mutation blocking in the root admin lane: non-`view` permissions are denied while support mode is active, and the main mutation forms surface disabled controls plus clearer write-block messaging instead of behaving like writable pages
  - the first practical `Phase 4` hardening slice is now also in code:
    - `/admin/leads/[leadId]` now gives leads a dedicated operational detail view with edit controls, conversion actions, and follow-up timeline
    - customer detail now renders a unified timeline across notes, tags, bookings, payments, and customer audit events instead of separate passive blocks
    - `/api/admin/leads/[leadId]` and `/api/admin/customers/[customerId]` now expose timeline payloads for richer client consumption
  - that `Phase 4` lane has now moved one step further into bookings:
    - `/admin/bookings/[bookingId]` now gives bookings a dedicated detail workspace with controls, linked payments, and booking timeline
    - `/api/admin/bookings/[bookingId]` now exposes payments, derived payment status, and timeline payloads
    - the bookings list now links directly into the detail workspace so schedule operations and revenue posture are connected
  - that `Phase 4` lane now also includes the first lead-specific write seam:
    - lead detail now supports dedicated `add note` and `schedule follow-up` actions without routing everything through the full edit form
    - `/api/admin/leads/[leadId]/add-note` and `/api/admin/leads/[leadId]/schedule-follow-up` now expose those actions for client integrations and future React Query adoption
  - that `Phase 4` lane now also includes the first lead-specific write seam:
    - lead detail now supports dedicated `add note` and `schedule follow-up` actions without routing everything through the full edit form
    - `/api/admin/leads/[leadId]/add-note` and `/api/admin/leads/[leadId]/schedule-follow-up` now expose those actions for client integrations and future React Query adoption
  - the Zoho CRM integration lane also moved from blueprint-only to runtime foundation on `2026-04-22`:
    - backend settings now load the `ZOHO_CRM_*` environment family alongside the existing Zoho Calendar and Zoho Bookings configuration
    - `backend/integrations/zoho_crm/adapter.py` now implements access-token resolution through either a direct `ZOHO_CRM_ACCESS_TOKEN` or refresh-token exchange with `ZOHO_CRM_REFRESH_TOKEN`, `ZOHO_CRM_CLIENT_ID`, and `ZOHO_CRM_CLIENT_SECRET`
    - `/api/v1/integrations/providers/zoho-crm/connection-test` now performs a safe runtime smoke test that fetches Zoho CRM module and field metadata, respects the returned `api_domain` when present, and reports the currently requested module mapping surface without exposing secrets
    - local repo inspection at implementation time confirmed no `ZOHO_CRM_*` credentials are currently present in the checked-in `.env`, so the new runtime remains ready for activation but is not yet connected to a live Zoho CRM tenant
  - the Zoho CRM activation lane then moved one more operator step on `2026-04-22`:
    - backend config now auto-derives `ZOHO_ACCOUNTS_BASE_URL` from the configured Zoho API data center when the variable is left blank, preventing AU CRM setups from accidentally refreshing tokens against the default US accounts domain
    - `scripts/zoho_crm_connect.py` now gives the repo a closed-loop operator helper for consent URL generation, auth-code exchange, optional `.env` persistence, and direct connection smoke tests
  - the Zoho CRM lane then moved from `credentials-ready` to `connected` on `2026-04-22`:
    - repo-local `.env` now contains a real Zoho CRM client id, client secret, access token, and refresh token for the AU tenant
    - direct smoke testing through `python3 scripts/zoho_crm_connect.py test-connection --module Leads` returned `status: connected`
    - the live connection confirms BookedAI can see Zoho CRM module metadata for `Leads`, `Contacts`, `Accounts`, `Deals`, and related default modules, and can read the `Leads` field contract required for the current write-back slice
  - the Zoho CRM lane then moved from `connected` to `end-to-end write verified` on `2026-04-22`:
    - live production deploy now passes the `ZOHO_CRM_*`, `ZOHO_CALENDAR_*`, `ZOHO_BOOKINGS_*`, and `ZOHO_ACCOUNTS_BASE_URL` family into both `backend` and `beta-backend` through `docker-compose.prod.yml`, so container runtime no longer drops provider credentials that exist in host `.env`
    - a live `POST /api/v1/integrations/crm-sync/contact` test now succeeds against the AU Zoho tenant and returns `sync_status: synced` with external contact id `120818000000569001`
    - follow-up `GET /api/v1/integrations/crm-sync/status?entity_type=contact&local_entity_id=zoho-test-contact-20260422081230` now returns the persisted sync row with `sync_status: synced`, `external_entity_id`, payload echo, and `last_synced_at`
    - the live-contact verification surfaced and then resolved a repository write-back bug in `backend/repositories/crm_repository.py`, where `last_synced_at` updates used an asyncpg-incompatible parameter shape during sync completion
  - that Zoho CRM lane then moved into the first write-back slice:
    - BookedAI lead capture now preserves the local-first ledger posture but can also attempt a Zoho `Leads` upsert when CRM credentials are present
    - duplicate-check ordering is now anchored to `Email` and then `Phone`, while fallback payload shaping derives `Last_Name` from the captured full name and supplies a safe default `Company` when none exists yet
    - CRM sync rows now move more explicitly through `pending`, `manual_review_required`, `failed`, or `synced`, and successful Zoho record ids are now stored back into `external_entity_id`
  - the next Zoho CRM recovery slice is now also in place:
    - the adapter now includes `Contacts` upsert foundation for later customer-sync flows
    - CRM retry no longer only marks a row as `retrying`; it can now replay stored `lead` or `contact` payloads from `crm_sync_records.payload`
    - `/api/v1/integrations/crm-sync/retry` can now return a successful `external_entity_id` when replay succeeds instead of only echoing a queued retry state
  - the first admin customer bridge into that Zoho lane is now also present:
    - backend now exposes `POST /api/v1/integrations/crm-sync/contact`
    - root admin customer create and update actions now call that backend route in a best-effort pattern after local customer mutation succeeds
    - this keeps the root admin workspace as the user-facing mutation surface while Zoho CRM orchestration remains owned by the backend integration runtime
  - that Zoho-connected admin lane now also exposes visible sync posture inside the root workspace:
    - backend now exposes `GET /api/v1/integrations/crm-sync/status`, which returns the latest CRM sync row plus latest error context for a given `entity_type + local_entity_id`
    - root admin `Customer` detail now shows Zoho CRM sync status, latest error context, and direct `sync/retry` controls
    - root admin `Lead` detail now shows Zoho CRM sync status and retry control when a lead-side CRM sync record already exists
    - root admin `Customers` and `Leads` list pages now also surface compact CRM status badges so operators can spot sync posture without opening each detail screen
  - that Zoho CRM lane has now moved one step further on `2026-04-22` into booking follow-up orchestration:
    - booking-intent creation can now run the full local-first BookedAI -> Zoho chain for `lead`, `contact`, `deal`, and `task` sync posture instead of stopping at lead/contact only
    - both `/api/v1/bookings/intents` handlers now return a `crm_sync` summary block so callers can inspect the resulting CRM posture from one response
    - a reusable sample data package now exists at `backend/migrations/sql/014_future_swim_crm_linked_flow_sample.sql`, giving the Future Swim tenant one linked demo chain across local contact, lead, booking intent, payment intent, and CRM sync rows
    - the intended architecture split is now explicit across docs: `Zoho CRM` is the commercial system of record, while `BookedAI` remains the AI system of action plus operational and revenue truth
  - the Zoho CRM lane is now also defined by a concrete event map on `2026-04-22`:
    - `booking created -> Zoho deal/task`
    - `call scheduled -> Zoho task/activity`
    - `email sent -> Zoho task/note/activity mirror`
    - `lead qualified -> Zoho lead/contact/deal update`
    - `deal won/lost -> BookedAI dashboard/reporting feedback`
    - the active implementation entrypoint for this map lives in `docs/architecture/bookedai-zoho-crm-integration-map.md`
  - the next event in that map has now also started implementation on `2026-04-22`:
    - backend now exposes `POST /api/v1/integrations/crm-sync/lead-qualification`
    - admin lead updates now run a best-effort qualification sync into Zoho whenever a lead moves into `qualified` status or pipeline stage
    - the current runtime now covers two active outbound event lanes from the map:
      - `booking created`
      - `lead qualified`
  - the next event lane in that same map has now also started implementation on `2026-04-22`:
    - backend now exposes `POST /api/v1/integrations/crm-sync/call-scheduled`
    - admin lead follow-up scheduling now runs a best-effort Zoho task sync whenever an operator schedules a callback/setup call
    - the current runtime therefore now covers three active outbound event lanes from the CRM map:
      - `booking created`
      - `lead qualified`
      - `call scheduled`
  - the next outbound event lane in that same CRM map has now also started implementation on `2026-04-22`:
    - backend lifecycle email sends now best-effort mirror outreach into a Zoho task after local email ledger recording succeeds
    - lifecycle email responses now include `crm_sync.task` posture for the mirror result
    - the current runtime therefore now covers four active outbound event lanes from the CRM map:
      - `booking created`
      - `lead qualified`
      - `call scheduled`
      - `email sent`
  - the first inbound event lane in that same CRM map has now also started implementation on `2026-04-22`:
    - backend can now register a Zoho Notifications channel through `/api/v1/integrations/crm-feedback/zoho-webhook/register`, using BookedAI's own webhook endpoint as the notify target
    - backend can now also inspect, auto-renew, renew, and disable that channel through `/api/v1/integrations/crm-feedback/zoho-webhook`, `/auto-renew`, `/renew`, and `/disable`
    - repo automation now also includes a sparse cron-friendly runner for auto-renew so the notification lane can stay healthy without a resident worker loop
  - the live webhook-ops activation pass then hardened production runtime further on `2026-04-22`:
    - `backend/db.py` now serializes ORM bootstrap with a PostgreSQL advisory lock so `backend` and `beta-backend` can restart together without racing on `TenantEmailLoginCode` sequence creation
    - `backend/integrations/zoho_crm/adapter.py` now prefers refresh-token exchange over stale direct access tokens, restoring durable Zoho CRM API access for the AU tenant even when an old smoke-test access token is still present in env
    - `scripts/run_zoho_crm_webhook_auto_renew.py` now supports a host-local HTTPS target, host-header override, and optional local TLS skip so maintenance cron can bypass Cloudflare and hit local Nginx directly
    - a fresh Zoho consent flow was then completed with `ZohoCRM.notifications.ALL`, producing a new refresh token, a live `Deals` notification channel (`1000000068001`), and a verified maintenance renewal from `2026-04-22T11:59:41+00:00` to `2026-04-29T10:01:54+00:00`
    - `docker-compose.prod.yml` now passes `ZOHO_CRM_NOTIFICATION_TOKEN` and `ZOHO_CRM_NOTIFICATION_CHANNEL_ID` into both `backend` and `beta-backend`, closing the last runtime gap between host `.env` and live containers for the webhook lane
    - backend ingests additive Zoho commercial outcome feedback at `/api/v1/integrations/crm-feedback/deal-outcome`
    - backend serves BookedAI read-model summary at `/api/v1/integrations/crm-feedback/deal-outcome-summary`
    - backend can now also pull known terminal Zoho `Deals` through `/api/v1/integrations/crm-feedback/zoho-deals/poll`, giving the repo a first practical runtime bridge from real Zoho deal ids into BookedAI feedback rows
    - backend now also accepts Zoho CRM Notifications callbacks at `/api/v1/integrations/crm-feedback/zoho-webhook`, verifies configured token/channel values when present, logs raw webhook payloads, and reuses the same terminal feedback ingestion path
    - root admin dashboard and reports now surface won/lost counts, owner performance, lost reasons, stage-breakdown counts, task-completion signals, and recent commercial outcomes from Zoho without replacing local booking/payment truth
  - the first practical `Phase 5` revenue-truth slice is now also in code:
    - root admin dashboard revenue summary now prefers `paid payments` instead of using booking value as the only revenue proxy
    - revenue trend blocks now aggregate by payment dates when paid ledger records exist, so dashboard revenue moves closer to finance truth instead of schedule-only estimates
    - dashboard now also exposes `outstanding revenue`, `paid bookings`, and `unpaid bookings`, and recent bookings now carry payment posture plus paid-versus-outstanding breakdowns
    - dashboard now also includes receivables aging and a collection-priority queue so unpaid bookings can be triaged by overdue age and outstanding value
  - the first practical `Phase 6` reporting slice is now also in code:
    - root admin navigation now includes a dedicated `/admin/reports` workspace
    - reports now expose `paid vs unpaid trend`, `collections aging`, `recovered revenue`, and a `collection priority report` using a dedicated report snapshot instead of reusing the operator dashboard only
    - reporting cuts now also include `repeat revenue`, `repeat customer rate`, `retention segments`, and `source-to-revenue attribution`
    - reports now also include a `source -> lead -> booking -> paid revenue` funnel cut so acquisition-source conversion can be read in one table
    - reports now also support drill-down filters for `source`, `owner`, and `date range`, and the reporting read model now scopes all report cuts to the same selected filter set
  - the first practical `Phase 7` growth slice is now also in code on `2026-04-22`:
    - root admin navigation now includes `/admin/campaigns` as the first explicit growth-lane workspace after the revenue-core and reporting phases
    - `Campaigns` now has a real Prisma model, seed coverage, and a migration artifact for `campaigns` with source-key and UTM metadata instead of relying only on ad-hoc source labels
    - the root admin repository now exposes list, detail, create, update, and archive seams for campaigns, with derived attribution metrics for sourced leads, sourced customers, bookings, and paid revenue
    - root admin now also exposes `/api/admin/campaigns` and `/api/admin/campaigns/:id`, plus a create/edit/archive UI at `/admin/campaigns`
    - campaign reporting is intentionally tied to `sourceKey`, so the phase opens cleanly from the existing source-attribution and revenue-reporting cuts rather than creating a disconnected marketing CRUD lane
    - the next growth-lane slice then started on `2026-04-23` with `Messaging`, giving the active shared admin shell a first read-first communication and retry workspace before later workflow authoring begins
  - that `Phase 3` slice has now been extended into a fuller control plane:
    - `/admin/roles` now exposes a permission editor so role posture can be adjusted without leaving the workspace
    - `/admin/audit` now exposes a dedicated audit investigation surface with search, entity-type filtering, and pagination
    - `/api/admin/roles` now supports both role catalog reads and permission-set updates, and `/api/admin/audit` now supports paginated audit log reads
- route-related backend verification passed after the router split, and the previously failing `matching/search public-web fallback` and tenant session-signing regressions are now restored in the backend validation pass
- the tenant workspace hardening lane moved one step further on `2026-04-22`:
  - tenant overview, plugin, billing, team, and integrations now expose lightweight section-level activity metadata with `last updated`, `last edited by`, and audit-derived summary context
  - tenant-facing `Experience Studio`, plugin, billing, and team surfaces now show clearer read-only posture for restricted roles instead of only silently disabling final save buttons
  - billing and team invite fields now respect role-based disablement directly at input level, while integrations now show an explicit access-denied notice when the session can monitor but not edit provider posture
  - this pass verified cleanly with `python3 -m py_compile backend/service_layer/tenant_app_service.py backend/api/v1_tenant_handlers.py`, `node frontend/node_modules/typescript/bin/tsc -p frontend/tsconfig.json --noEmit`, and `npm --prefix frontend run build`

This baseline is now synchronized across:

- `README.md`
- `docs/architecture/admin-workspace-blueprint.md`
- `docs/development/ci-cd-collaboration-guide.md`
- `docs/development/ci-cd-deployment-runbook.md`
- `docs/development/backend-boundaries.md`
- `docs/development/env-strategy.md`
- `docs/development/implementation-progress.md`
- `docs/development/roadmap-sprint-document-register.md`
- `docs/architecture/implementation-phase-roadmap.md`
- `docs/development/sprint-13-16-user-surface-delivery-package.md`
- `docs/users/administrator-guide.md`

Broader tenant, portal, admin, billing, search-hardening, and bounded-context extraction work remains active and should still be treated as continuing delivery rather than closed scope.

## Current Project Truth

This section is the canonical project-level baseline for future upgrades.

When later work needs one short authoritative read before touching code, use this section first.

### Product definition

BookedAI is currently defined as:

- an AI revenue engine for service businesses
- a multi-surface product spanning public acquisition, product proof, booking capture, tenant operations, admin support, communications, integrations, and deployment/runtime operations
- a platform that must stay truthful about search quality, booking state, billing posture, support readiness, and rollout maturity

The platform should not be framed as:

- only a chatbot
- only a landing page
- only an internal admin console

### Active runtime surfaces

Current approved surface map:

- `bookedai.au`
  - compact product-first acquisition and orientation surface
- `pitch.bookedai.au`
  - deeper pitch, investor-readable narrative, and migrated homepage long-form story surface
- `product.bookedai.au`
  - deeper product demo and booking-agent proof surface
- `demo.bookedai.au`
  - lighter conversational or story-led demo surface
- `tenant.bookedai.au`
  - tenant sign-in, onboarding, catalog, billing, and team workspace gateway
- `portal.bookedai.au`
  - customer booking review and support-follow-up surface
- `admin.bookedai.au`
  - operator and internal support surface
- `api.bookedai.au`
  - FastAPI backend
- `upload.bookedai.au`
  - upload and hosted asset surface
- `n8n.bookedai.au`
  - automation editor and workflow runtime
- `supabase.bookedai.au`
  - data, auth, storage, and operator tooling through Supabase
- `hermes.bookedai.au`
  - knowledge or documentation service
- `bot.bookedai.au`
  - OpenClaw Control UI and operator-facing browser access to the gateway

### Current repo shape

Current checked-in repo truth:

- primary deployed frontend:
  - active React + TypeScript + Vite multi-surface app under `frontend/`
- parallel frontend experiment:
  - Next.js app under `app/` and `components/` for newer marketing/runtime exploration
- backend:
  - FastAPI app under `backend/`
- data and infra:
  - `supabase/`, `deploy/`, `scripts/`, `storage/`
- Telegram/OpenClaw live deploy authority is intentionally scoped to host-level elevated execution on the Docker VPS, with `scripts/deploy_live_host.sh` as the preferred entrypoint
- production deploy now builds backend images and frontend images in a sequential, memory-safe order by default (`COMPOSE_PARALLEL_LIMIT=1`) before bringing up the already-built stack, retries the full `docker-compose.prod.yml` bring-up with orphan cleanup if the first Compose recreate pass fails, and `scripts/healthcheck_stack.sh` validates running production Compose services plus HTTPS probes instead of assuming every service keeps a fixed container name
- Telegram/OpenClaw elevated repo and host control now flows through `scripts/telegram_workspace_ops.py`, with trusted actor ids and allowed actions sourced from `BOOKEDAI_TELEGRAM_TRUSTED_USER_IDS` plus `BOOKEDAI_TELEGRAM_ALLOWED_ACTIONS`
- OpenClaw runtime-admin repair actions use the `openclaw_runtime_admin` permission scope, including the exec approval policy fix that restores valid durable approvals without granting blanket host shell access
- `openclaw_runtime_admin` also gates the full-access OpenClaw runtime repair command, keeping the break-glass webchat/Telegram full-control posture explicit and operator-scoped

Future work must not assume the repo is greenfield or single-runtime.

### Current backend architecture baseline

Active backend entrypoint:

- `backend/app.py`

Current top-level router ownership:

- `backend/api/public_catalog_routes.py`
- `backend/api/upload_routes.py`
- `backend/api/webhook_routes.py`
- `backend/api/admin_routes.py`
- `backend/api/communication_routes.py`
- `backend/api/tenant_routes.py`

Compatibility router shims still exist:

- `backend/api/public_routes.py`
- `backend/api/automation_routes.py`
- `backend/api/email_routes.py`
- `backend/api/routes.py`

Current main backend debt item:

- `backend/api/v1_routes.py` is still a large mixed-surface route module

Approved bounded-context split target:

- `booking`
- `tenant`
- `admin`
- `search_matching`
- `communications`
- `integrations`
- `portal`

### Current auth and session baseline

Approved session-signing baseline:

- `SESSION_SIGNING_SECRET`
- `TENANT_SESSION_SIGNING_SECRET`
- `ADMIN_SESSION_SIGNING_SECRET`

Current compatibility baseline:

- admin and tenant signed sessions must use actor-specific session secrets or the shared `SESSION_SIGNING_SECRET`
- `ADMIN_API_TOKEN` and `ADMIN_PASSWORD` should not be treated as accepted session-signing fallbacks in current planning or future implementation work

Rule for future upgrades:

- actor-specific session signing is the target baseline
- legacy fallback is compatibility support only
- later work must not silently collapse tenant and admin signing back into one shared secret model

### Current implementation baseline by capability

Implemented or materially active:

- public homepage and product proof flow
- booking assistant and booking session flow
- matching and search infrastructure
- public-web fallback lane and replay tooling
- tenant auth foundations
- tenant catalog import, review, publish, archive, and workspace reads
- tenant billing and team foundations
- portal booking detail and request-safe support actions
- admin overview, bookings, support queue, partner management, and catalog quality flows
- communication surfaces through email and Discord
- Telegram or OpenClaw operator sync tooling for repo-side change summaries, Notion writeback, and Discord update mirroring
- provider and integration support seams
- outbox, scheduler, and release-gate foundations

Still active and incomplete:

- full bounded-context extraction of `/api/v1/*`
- tenant paid-SaaS completion
- billing self-serve completeness
- stronger value reporting
- release-grade auth, portal, and billing hardening
- remaining search fallback regression fixes
- the next search-core maturity slice should now build on the richer `backend/domain/matching/service.py` read model instead of adding more route-local shaping, because `/api/v1/matching/search` now carries normalized booking-fit summaries, stage-count diagnostics, and a fuller Phase 2 contract for query understanding, shortlist reasoning, and next-step guidance

### Current source-of-truth documents

Project-wide master:

- `project.md`

Operator and repo entry:

- `README.md`

Primary active planning and execution docs:

- `docs/architecture/current-phase-sprint-execution-plan.md`
- `docs/architecture/admin-enterprise-workspace-requirements.md`
- `docs/architecture/admin-workspace-blueprint.md`
- `docs/architecture/implementation-phase-roadmap.md`
- `docs/development/ci-cd-collaboration-guide.md`
- `docs/development/ci-cd-deployment-runbook.md`
- `docs/development/implementation-progress.md`
- `docs/development/backend-boundaries.md`
- `docs/development/env-strategy.md`
- `docs/development/roadmap-sprint-document-register.md`
- `docs/development/sprint-13-16-user-surface-delivery-package.md`

Operational and audience companion docs:

- `docs/users/administrator-guide.md`
- `docs/architecture/auth-rbac-multi-tenant-security-strategy.md`

If any narrower doc conflicts with this baseline, update the narrower doc or update `project.md` explicitly. Do not let the inconsistency drift.

## Active Upgrade Baseline

The currently approved upgrade direction is:

1. keep the live runtime stable
2. continue upgrading the user-facing surfaces into one coherent SaaS product system
3. continue reducing backend ownership ambiguity
4. continue moving hidden operational assumptions into explicit code and documentation
5. harden release discipline as real flows become tenant- and customer-facing

### Current required upgrade tracks

- public:
  - realign `bookedai.au` into a simpler modern product-first landing page with minimal narrative weight above the live product entry
  - move the current longer-form homepage narrative inventory into `pitch.bookedai.au` instead of keeping both jobs on one page
  - preserve direct continuation into product and registration paths
- tenant:
  - continue hardening onboarding, billing, team, and role-safe operations
- portal:
  - continue productizing booking review and customer request flows
- admin:
  - continue support, billing-investigation, and operational trust workflows
- backend:
  - continue bounded-context router extraction and service ownership cleanup
- auth:
  - preserve actor-specific signing-secret separation
- release discipline:
  - extend search-grade rigor into auth, billing, portal, and support flows

## Open Carry-Forward Items

These items are explicitly open and should not be treated as resolved:

- `backend/api/v1_routes.py` still needs bounded-context extraction
- the repo still has a dual frontend reality:
  - active Next.js root app
  - legacy Vite subtree
- tenant billing, invoice, payment-method, and value-reporting experience still need further productization
- release gates for tenant auth, billing, and portal flows are not yet complete enough to be treated as fully closed

## Decision Rules For Future Upgrades

When future work changes scope, architecture, delivery sequence, or core implementation assumptions:

- update `project.md` first
- then update the active planning and execution docs
- then update narrower requirement or audience docs

When future work is only local or tactical, still check whether it changes:

- active route ownership
- active product surface ownership
- auth or secret policy
- sprint carry-forward scope
- release criteria

If yes, sync it back into `project.md`.

## Documentation Map

### Core documentation

- [Project Documentation Root](./docs/README.md)
- [Release Note - 2026-04-20 Homepage Product Live](./docs/development/release-note-2026-04-20-homepage-product-live.md)
- [Investor Update - 2026-04-20](./docs/development/investor-update-2026-04-20.md)
- [System Overview](./docs/architecture/system-overview.md)
- [Module Hierarchy](./docs/architecture/module-hierarchy.md)
- [Target Platform Architecture](./docs/architecture/target-platform-architecture.md)
- [BookedAI Product Requirements Document](./docs/architecture/bookedai-master-prd.md)
- [SaaS Domain Foundation](./docs/architecture/saas-domain-foundation.md)
- [Phase 0-1 Execution Blueprint](./docs/architecture/phase-0-1-execution-blueprint.md)
- [BookedAI Master Roadmap (whole-project plan from Phase 0)](./docs/architecture/bookedai-master-roadmap-2026-04-26.md)
- [Full-Stack Review and Next-Phase Plan (2026-04-26 seven-lane review)](./docs/development/full-stack-review-2026-04-26.md)
- [Implementation Phase Roadmap](./docs/architecture/implementation-phase-roadmap.md)
- [Master Execution Index](./docs/architecture/master-execution-index.md)
- [MVP Sprint Execution Plan](./docs/architecture/mvp-sprint-execution-plan.md)
- [Team Task Breakdown](./docs/architecture/team-task-breakdown.md)
- [Jira Epic Story Task Structure](./docs/architecture/jira-epic-story-task-structure.md)
- [Notion Jira Import Ready Backlog](./docs/architecture/notion-jira-import-ready.md)
- [Coding Implementation Phases](./docs/architecture/coding-implementation-phases.md)
- [Coding Phase File Mapping](./docs/architecture/coding-phase-file-mapping.md)
- [Coding Phase 1 2 3 Technical Checklist](./docs/architecture/coding-phase-1-2-3-technical-checklist.md)
- [Sprint 1 Implementation Package](./docs/architecture/sprint-1-implementation-package.md)
- [Sprint 2 Implementation Package](./docs/architecture/sprint-2-implementation-package.md)
- [Phase 1.5 Data Implementation Package](./docs/architecture/phase-1-5-data-implementation-package.md)
- [Phase 2 6 Detailed Implementation Package](./docs/architecture/phase-2-6-detailed-implementation-package.md)
- [Repo And Module Strategy](./docs/architecture/repo-module-strategy.md)
- [Data Architecture And Migration Strategy](./docs/architecture/data-architecture-migration-strategy.md)
- [API Architecture And Contract Strategy](./docs/architecture/api-architecture-contract-strategy.md)
- [Public Growth App Strategy](./docs/architecture/public-growth-app-strategy.md)
- [Tenant App Strategy](./docs/architecture/tenant-app-strategy.md)
- [Internal Admin App Strategy](./docs/architecture/internal-admin-app-strategy.md)
- [AI Router Matching And Grounded Search Strategy](./docs/architecture/ai-router-matching-search-strategy.md)
- [CRM Email And Revenue Lifecycle Strategy](./docs/architecture/crm-email-revenue-lifecycle-strategy.md)
- [Integration Hub And Sync Architecture](./docs/architecture/integration-hub-sync-architecture.md)
- [Auth RBAC And Multi-tenant Security Strategy](./docs/architecture/auth-rbac-multi-tenant-security-strategy.md)
- [DevOps Deployment CI-CD And Scaling Strategy](./docs/architecture/devops-deployment-cicd-scaling-strategy.md)
- [QA Testing Reliability And AI Evaluation Strategy](./docs/architecture/qa-testing-reliability-ai-evaluation-strategy.md)
- [Analytics Metrics Revenue And BI Strategy](./docs/architecture/analytics-metrics-revenue-bi-strategy.md)
- [Pricing Packaging And Monetization Strategy](./docs/architecture/pricing-packaging-monetization-strategy.md)
- [Go-To-Market Sales And Event Strategy](./docs/architecture/go-to-market-sales-event-strategy.md)
- [Demo Script Storytelling And Video Strategy](./docs/architecture/demo-script-storytelling-video-strategy.md)
- [Change Governance](./docs/governance/change-governance.md)
- [Project-Wide Sprint Execution Checklist](./docs/development/project-wide-sprint-execution-checklist.md)
- [BookedAI Chatbot Landing Implementation Plan](./docs/development/bookedai-chatbot-landing-implementation-plan.md)
- [BookedAI Sample Video Brief](./docs/development/bookedai-sample-video-brief.md)
- [BookedAI Storyboard 8 Frame](./docs/development/bookedai-storyboard-8-frame.md)
- [BookedAI Video Script And Shot List](./docs/development/bookedai-video-script-and-shot-list.md)
- [BookedAI Investor Pitch Deck](./docs/development/bookedai-investor-pitch-deck.html)
- [BookedAI Fundraising Profit-First Strategy](./docs/development/bookedai-fundraising-profit-first-strategy.md)

### Audience-specific documentation

- [End User Guide](./docs/users/end-user-guide.md)
- [SME Customer Guide](./docs/users/sme-customer-guide.md)
- [Administrator Guide](./docs/users/administrator-guide.md)

## Current Documentation Standard

The project documentation is now organized according to a professional structure:

1. architecture documents describe the platform by system layers and boundaries
2. module documents describe responsibilities and integration points
3. audience guides describe the platform by user type
4. governance documents define how changes must be synchronized
5. a master execution index provides leadership-level navigation across the full program
6. phase-level execution packages define implementation detail
7. phase-level Epic -> Story -> Task documents define backlog structure
8. sprint-level owner execution checklists define practical delivery control
9. a Jira-ready delivery structure provides tracker translation guidance
10. a Notion import-ready execution backlog provides phase, epic, and sprint seed data for workspace import

## Mandatory Rules for Future Requests

### 1. Read old context first

Before modifying any feature, always review the existing relevant documentation first.

Minimum reading path:

- this file
- the relevant architecture document
- the relevant audience document

If the request is for an existing module or workflow, also read the prior description for that exact area first and use it as the baseline for any merge, correction, or upgrade.

When the request asks to edit or adjust an existing module, do not start from scratch:

- find the existing description document for that module first
- re-read the prior context and current documented scope
- merge or revise that existing source-of-truth document according to the new request instead of writing a disconnected replacement

### 2. Summarize every new request

Every new request must be summarized into:

- goal
- affected modules
- affected audiences
- affected integrations
- affected configuration or deployment surface

### 3. Do not patch one layer in isolation

If the change affects more than one layer, it must be handled as a synchronized change across:

- frontend
- backend
- data
- AI / assistant behavior
- automation
- infrastructure
- documentation

### 4. Update documentation as part of the change

No substantial change is complete unless related docs are updated in the correct place.

Documentation capture rule:

- when a prompt contains substantial architecture, product, system, repo, module, migration, workflow, or governance description, that description should be recorded into the appropriate `.md` files in `docs/` and reflected in `project.md`
- this rule should be treated as the default working expectation for future prompts unless the user explicitly asks not to update documentation
- when updating an existing area, do not write the new state in isolation; merge it into the existing source description for that area after re-reading the prior context
- each substantive update should be recorded in three places: the edited request-facing document, the implementation-tracking document, and the corresponding roadmap or sprint or plan or phase artifact

Three-place recording rule for module changes:

- update the requirement-facing document that was changed or reinterpreted
- update the implementation or execution tracking document that explains what is now being done
- update the corresponding roadmap or sprint or plan or phase document so scheduling and delivery context stay synchronized

Live-promotion closure rule:

- whenever an update has been implemented successfully through the final step and promoted to live, automatically write the delivered result back into implementation tracking before considering the work closed
- update the corresponding sprint, requirement, or module description document in the same completion pass
- update the matching roadmap or sprint or phase artifact in the same completion pass
- treat `implemented + live deployed + documented` as one completion standard
- when the operator workflow includes Telegram or bot-assisted delivery, also sync the detailed update into Notion and mirror the operator summary into Discord when the change is relevant for team visibility
- the Discord payload should be the concise summary text itself; Notion is the full-detail payload surface
- use the BookedAI operator entrypoints to keep this discipline consistent:
  - `python3 scripts/telegram_workspace_ops.py sync-doc ...` for per-change closeout notes
  - `python3 scripts/telegram_workspace_ops.py sync-repo-docs --skip-discord` for full documentation publish passes
  - `python3 scripts/telegram_workspace_ops.py test --command "..."` for repo-scoped validation from Telegram/OpenClaw
  - `python3 scripts/telegram_workspace_ops.py workspace-command --command "..."` for broader Telegram-authorized BookedAI refactors, file-structure changes, and whole-project rollout steps
  - `python3 scripts/telegram_workspace_ops.py host-command --command "..."` for allowlisted host-maintenance commands such as `apt-get`, `docker`, `systemctl`, or `journalctl` without exposing a blanket root shell
  - `python3 scripts/telegram_workspace_ops.py host-shell --cwd / --command "..."` for trusted full-server host execution when OpenClaw needs unrestricted `host/elevated` access outside the repo tree

### 5. Upgrade old features with full context

When enhancing an existing feature:

- read the old feature description first
- compare it with the current code state
- update all dependent areas together
- record the upgraded state in the proper document
- make sure the upgraded state is also reflected in implementation tracking and the relevant roadmap or sprint or phase plan

### 5A. Route later-sprint logic issues into the correct later sprint

If work in the current sprint exposes a bug, gap, or logic flaw that properly belongs to a later sprint or phase:

- do not leave it as an informal note or memory-only carryover
- add it to the correct sprint, phase, story, task, or checklist artifact where that work is supposed to happen
- record it in the current sprint artifact as a carry-forward issue with enough detail that the next sprint can act on it immediately

The current sprint must explicitly record:

- what the issue is
- why it was not fully solved in the current sprint
- which later sprint or phase now owns the fix
- what exact behavior, acceptance rule, or regression case the later sprint must handle

The later sprint artifact must explicitly record:

- the new or revised task that now owns the issue
- the expected implementation scope
- the acceptance or regression checks needed to close it

Do not treat cross-sprint logic defects as resolved just because they were discovered and discussed.

### 6. Apply the latest approved implementation baseline by default

When a later sprint builds on an already-approved direction:

- inherit the latest approved source-of-truth stack first
- do not reopen solved structure, scope, or ownership questions unless a truth issue is discovered
- treat the latest code-ready handoff for that area as the default execution baseline

### 7. Preserve the live runtime and repo shape unless migration is explicitly approved

Default project rule:

- upgrade the live implementation in place
- preserve the current repo shape where possible
- avoid rewrite-first moves unless a rewrite has been explicitly approved as scope

Do not assume that:

- a forward-compatible starter replaces the live runtime
- an additive architecture experiment is automatically the new production target

### 8. Keep one active implementation spine and demote deferred inventory

For any major user-facing flow:

- there must be one explicit active implementation spine
- files or sections outside that spine should be treated as additive, deferred, or separately approved inventory
- later sprints must not silently promote deferred inventory into mandatory scope

### 9. Keep one source of truth for content, composition, and tokens

For every active product surface, later sprints should preserve:

- one content source of truth
- one page or flow composition root
- one token ownership model
- one shared primitive layer for reusable UI

Do not allow later sprints to reintroduce:

- copy drift across JSX files
- competing page roots
- competing token systems
- parallel primitive layers for the same surface

### 10. Cleanup and migration are part of implementation, not optional polish

If an area contains old-path drift, later sprints should treat cleanup as part of delivery.

Examples:

- duplicate primitives
- text-heavy legacy layouts that conflict with the approved visual system
- stale assumptions about active scope
- build wiring that depends on the wrong runtime or config chain

### 10A. Carry-forward detail must be specific, not generic

When the current sprint hands an issue forward:

- do not write vague notes such as `follow up later` or `fix in next sprint`
- write the exact query, scenario, payload shape, or UI behavior that failed
- write the exact risk if it is left unresolved
- write the exact sprint or phase that owns the next fix

This rule is especially important for:

- search or assistant truth failures
- public conversion regressions
- contract drift
- release-gate gaps

### 11. Visual-first approved surfaces should not regress to older presentation patterns

When a surface has already been approved as visual-first:

- future changes should preserve that presentation model
- sections should not drift back into long-form text-first treatment
- pricing, trust, and closing conversion surfaces should remain aligned with the same approved visual system as the upper narrative sections

## Synchronization Checklist

### If frontend changes

- review backend API contracts
- review end-user experience documentation
- review admin impact if shared code paths exist

### If backend changes

- review frontend call sites
- review schemas and persistence assumptions
- review automation payload contracts
- review SME and admin guides

### If data changes

- review database setup
- review admin visibility
- review catalog consumers
- review migration and seed assumptions

### If AI behavior changes

- review assistant UX
- review business expectations
- review workflow trigger behavior

### If automation changes

- review backend trigger contracts
- review callback auth and status handling
- review admin operating procedures

### If infrastructure changes

- review deploy scripts
- review compose topology
- review routing
- review env handling
- review admin operational guidance

## Change Logging Policy

For every meaningful future upgrade, documentation should make clear:

- what existed before
- what changed
- which modules were updated together
- which user groups are affected

## Project Formation Reference

The current repository history still indicates this high-level creation sequence:

1. `5d00edd` - initial full-stack foundation
2. `7d66810` - removal of the old `bookedai-video` side module
3. `9bcc64e` - production architecture clarification
4. `d98b641` - production web startup decoupling

## Current Refactor Baseline

The latest structural refactor now establishes:

- frontend runtime separation through `src/app`, `src/apps/public`, `src/apps/admin`, and `src/shared`
- the public landing rebuild is now materially in its visual-first implementation stage, with the core hero, problem, solution, and product-proof sections redesigned toward infographic-led, graphic-heavy storytelling instead of text-heavy marketing blocks
- the active public design direction now targets roughly `80%` graphic, flow, chart, proof-state, and status-image treatment with the remaining `20%` reserved for high-value positioning copy, commercial keywords, and action-driving statements
- that visual-first treatment now also extends through pricing, trust, and final CTA surfaces, so the active landing path reads as one coherent premium narrative rather than mixing redesigned sections with older text-heavier sections
- pricing plan cards and the partner trust wall are now also polished to the same premium scan-first system, so mid-page decision blocks and lower-page credibility blocks no longer feel visually behind the upper narrative sections
- the booking assistant preview section now also uses the same visual-first framing with a proof-led intro panel and a stronger live-product shell, so the interactive demo block reads like core product storytelling rather than a standalone utility widget
- the public booking assistant flow now also exposes a more explicit enterprise journey across `matching -> preview -> booking capture -> email -> calendar -> payment -> CRM -> thank-you -> SMS/WhatsApp follow-up`, with live `matching services` loading state, operator-facing workflow visibility, reusable customer communication drafts, and best-effort post-booking automation that now actually calls the v1 payment-intent, lifecycle-email, SMS, and WhatsApp seams after booking capture
- the homepage runtime in `frontend/src/apps/public/HomepageSearchExperience.tsx` has now been tightened toward the same enterprise-grade booking result posture, so homepage booking confirmation no longer stops at a simple thank-you card and now includes CRM-aware result data, post-booking payment/email/SMS/WhatsApp automation, reusable communication drafts, and a delivery timeline similar to the richer assistant surface
- the homepage confirmation path has now been hardened further so the authoritative booking write reveals the booking reference immediately, while payment/email/SMS/WhatsApp automation continues asynchronously in the background instead of blocking customer-visible success state
- the homepage sidebar now also exposes an explicit enterprise journey rail across `search -> preview -> booking -> email -> calendar -> payment -> CRM -> messaging -> aftercare`, closing parity further with the richer dialog assistant instead of leaving homepage as a thinner branch
- that same public booking lane now also has a reusable simulated QA or demo data pack through `backend/migrations/sql/016_cross_industry_full_flow_test_pack.sql`, with 10 synthetic cross-industry booking journeys covering swim school, chess coaching, AI mentorship, salon, physio, property, restaurant, dental, legal, and photography full-flow posture across booking, payment, email, messaging, CRM, outbox, and audit trace
- the request-facing operator note for that seed pack now lives in `docs/development/bookedai-cross-industry-full-flow-test-pack.md`, and should be treated as the canonical quick-reference for applying and inspecting the synthetic full-lifecycle scenarios
- backend startup separation through `main.py`, `app.py`, and `api/routes.py`
- shared frontend API base URL logic in a single reusable utility
- backend route separation through domain-specific router modules
- backend handler preservation in `api/route_handlers.py`
- backend operational service extraction into `service_layer/` for `n8n`, `email`, and event persistence

This is the minimum baseline that future refactors should build on rather than collapse back into a single entrypoint file.

The current frontend slicing baseline now also includes:

- route-level lazy loading across `public`, `product`, `roadmap`, and `admin` runtime entrypoints
- an extracted `reliability-workspace` module inside the admin runtime
- issue-first reliability launchers that route operators into Prompt 5 or Prompt 11 preview, configuration review, or API contract review from the reliability workspace itself
- separate lazy drill-down modules for `config-risk` and `contract-review`, with read-only operator notes and export-ready cues for reliability follow-up
- direct hash-entry now also restores focus onto the active reliability panel shell, so the admin reliability lanes behave like stable views instead of pure scroll anchors
- local operator-note capture and export-ready handoff packaging now live inside the reliability drill-down layer, so admins can document follow-up without turning the preview surface into a backend workflow editor
- the reliability handoff tooling is now isolated as its own lazy frontend module, so local note and export packaging no longer sit on the critical path for every drill-down render
- that handoff tooling now also supports richer local Slack, ticket, and incident packaging formats, while still avoiding any new server-side note or workflow state

## Current Deployment Progress

As of `2026-04-15`, the deployment surface now has two different runtime tiers:

- production tier:
  - `bookedai.au`
  - `admin.bookedai.au`
  - `api.bookedai.au`
- beta staging tier:
  - `beta.bookedai.au`

The current beta rollout is now materially safer than the original single-route beta setup because:

- `beta.bookedai.au` now routes to dedicated `beta-web` and `beta-backend` containers
- TLS and Cloudflare DNS are explicitly provisioned for the beta subdomain
- beta traffic is isolated from the production web and backend runtime processes
- production now also reserves `portal.bookedai.au` as a first-class routed subdomain for the customer booking portal path rather than leaving post-booking continuation on an implicit host

The current beta tier still has important shared infrastructure constraints:

- it still shares the current database and most third-party integrations with production unless beta-specific secrets are later introduced
- it is a runtime-isolated staging layer, not yet a fully data-isolated staging environment

This means the solution has advanced from:

- no real staging entrypoint

to:

- production plus a dedicated beta runtime path

but has not yet reached:

- fully isolated staging data, billing, and provider sandbox separation

## Current Architecture Progress

The current solution-wide progress should now be understood as:

- experience architecture:
  - public landing, roadmap, admin, and demo surfaces are live
  - beta and production now have separate routed runtime entrypoints
- application architecture:
  - production API and beta API are now served by separate backend containers
  - major business logic is still concentrated in legacy service modules and remains a refactor target
  - the admin runtime is no longer treated as a single frontend bootstrap path because route-level splitting and workspace-level lazy loading now isolate the reliability surface more cleanly
  - reliability no longer boots every review lane at once, because config-risk and contract-review now lazy-load as narrower drill-down modules behind the existing hash-based admin IA
  - active reliability panel controls and focused panel shells now move together, which makes direct deep-links and browser verification more stable
  - local reliability notes now persist per lane and can be turned into export-ready summaries for Slack, ticket, or incident handoff without adding new server-side state
  - the note/export tooling for that handoff path now lazy-loads separately from the main drill-down shell, which keeps the reliability surface easier to scale incrementally
  - richer handoff formats now exist entirely on the client side, so operators can choose a packaging style without changing backend contracts or rollout safety
- platform architecture:
  - Cloudflare DNS, Nginx routing, Docker Compose deployment, and TLS provisioning now explicitly support production and beta tiers
  - `portal.bookedai.au` is now part of the production subdomain matrix and routes through the shared frontend plus backend proxy path
  - deploy automation is aware of beta domain issuance and rollout, and now also includes the customer portal host in DNS and certificate coverage
- environment architecture:
  - `beta.bookedai.au` is now the required rehearsal surface before promotion to `bookedai.au`
  - `scripts/deploy_beta.sh` is now the default rebuild and redeploy path for staging previews on `beta.bookedai.au`
  - full staging-grade isolation remains a next-step infrastructure milestone
  - `admin.bookedai.au` now benefits from separate reliability workspace loading and issue-first drill-down entry, which makes operational review flows easier to extend without regressing the initial admin shell
  - deep links such as `admin.bookedai.au#reliability:live-configuration` and `admin.bookedai.au#reliability:api-inventory` now resolve into narrower lazy reliability modules with operator-facing follow-up cues

## Current Refactor Status

Completed:

- frontend app composition refactor
- backend app factory refactor
- backend route aggregator plus domain router split
- backend service extraction for `N8NService`, `EmailService`, and `store_event`

Still pending in later phases:

- extract pricing logic from the large `services.py` module
- extract AI and booking logic into bounded backend modules
- introduce clearer shared API contracts between frontend and backend

## Architecture Baseline Added

The current architecture baseline now also includes a long-horizon platform direction for:

- SEO and growth attribution
- GTM and sales execution
- matching and recommendation quality
- booking trust and availability verification
- payment orchestration
- CRM lifecycle
- email lifecycle
- tenant-aware SaaS evolution
- mobile-ready product surfaces

Future platform work should review:

- `docs/architecture/target-platform-architecture.md`
- `docs/architecture/saas-domain-foundation.md`
- `docs/architecture/phase-0-1-execution-blueprint.md`
- `docs/architecture/repo-module-strategy.md`
- `docs/architecture/go-to-market-sales-event-strategy.md`
- `docs/architecture/demo-script-storytelling-video-strategy.md`

This baseline is intended to protect production continuity while guiding multi-phase evolution toward a more complete SME platform.

## Latest Synchronized Strategy Scope

The latest synchronized documentation set now explicitly records:

- current repo and module reality
- current coupling and risk zones
- reusable versus decomposable code areas
- target repo and module structure
- domain-to-module mapping for growth, matching, booking trust, payments, CRM, email, billing, deployment modes, and integrations
- frontend, backend, domain, repository, integration, shared, and worker coding boundaries
- naming conventions and structure conventions
- mobile-ready structure implications
- technical decision timing for framework, app split, deploy split, workers, and integration boundaries
- migration-safe module transition sequencing
- ICP and high-intent SME segmentation
- GTM channel priorities across SEO, direct outreach, events, referrals, and partnerships
- event-led selling motion and rapid demo conversion strategy
- founder-usable sales playbook, objection handling, and follow-up discipline
- 30-second pitch structure and 2 to 3 minute demo flow
- scenario-based storytelling for swim school, clinic, salon, tutor, and trade use cases
- video demo scripting and post-demo CTA discipline

This means future structural work should not start from scratch. It should inherit and follow the synchronized baseline captured in:

- `docs/architecture/target-platform-architecture.md`
- `docs/architecture/saas-domain-foundation.md`
- `docs/architecture/phase-0-1-execution-blueprint.md`
- `docs/architecture/repo-module-strategy.md`
- `docs/architecture/go-to-market-sales-event-strategy.md`
- `docs/architecture/demo-script-storytelling-video-strategy.md`

## Public Growth Surface Baseline

The synchronized documentation baseline now also includes a dedicated public growth strategy covering:

- current public-site structure and route reality
- homepage and landing architecture
- CTA taxonomy and lead-capture direction
- booking trust messaging on the public site
- SEO page family strategy
- industry page and deployment-mode page strategy
- attribution-aware public conversion design
- mobile-first public UX priorities
- safe rollout sequencing for public growth changes
- the `2026-04-23` homepage-to-pitch realignment plan that turns `bookedai.au` into the simpler product-first surface and treats `pitch.bookedai.au` as the canonical home for the current long-form homepage narrative

Additional active public execution note:

- `docs/development/homepage-pitch-realignment-plan-2026-04-23.md`

Future public-site work should inherit:

- `docs/architecture/public-growth-app-strategy.md`

This is intended to keep the current production site stable while evolving the public app into a stronger acquisition, SEO, conversion, and trust surface.

The current public runtime decision is now also explicit:

- `docs/architecture/frontend-runtime-decision-record.md`

That decision locks the current phase to a responsive web app primary strategy on `bookedai.au`, with native mobile deferred until a later phase.

The same runtime decision now also locks the next commercial execution wave to one web-first revenue loop:

- `docs/development/golden-tenant-activation-revenue-proof-loop-2026-04-23.md`
- `Future Swim` is the primary wedge to harden first
- `children's chess classes` and `AI Mentor 1-1` are the next adaptation templates after the Future Swim loop is stable
- this phase should prioritize tenant activation, billing clarity, lead-to-booking or customer closure, and tenant-facing revenue proof before broader workflow automation or React Native work

## Tenant Surface Baseline

The synchronized documentation baseline now also includes a dedicated tenant app strategy covering:

- tenant host and gateway role on `tenant.bookedai.au`
- unified tenant sign-up, sign-in, and account ownership model
- current tenant-facing reality versus internal admin reality
- tenant app product role and operational goals
- page families and information architecture
- dashboard, leads, conversations, matching, booking trust, billing, CRM, email, and integrations visibility
- deployment-mode-aware tenant UX
- mobile-usable tenant workflows
- reusable component families for tenant and admin evolution
- safe rollout sequencing from internal admin toward a real SME product surface

Future tenant-facing product work should inherit:

- `docs/architecture/tenant-app-strategy.md`

This is intended to help the team evolve from an internal admin console toward a true SME operational app without breaking the current production system.

Latest confirmed tenant baseline on `2026-04-18`:

- standalone `TenantApp` now exists as a real tenant route entry, not just a planning target
- `tenant.bookedai.au` is now the approved tenant-facing host and should be treated as the single tenant product gateway
- tenant workspace now includes `overview`, `catalog`, `bookings`, and `integrations` panels
- tenant catalog panel now uses the same search-result card language as the public search workspace
- tenant sign-in now exists as the first tenant-safe authenticated path for write-enabled catalog actions
- tenant website import now supports AI-guided extraction tuned toward booking-critical fields such as service name, duration, location, price, description, imagery, booking URL, and related booking metadata
- tenant catalog snapshot now exposes search-readiness counts and review warnings so catalog quality can be managed inside the tenant surface instead of only through admin flows
- the next required tenant upgrade is now locked in product scope: one canonical tenant account system should cover sign-up, sign-in, data input, reporting, subscription, invoice visibility, and billing actions rather than splitting those flows across multiple surfaces
- migration-ready rollout for tenant membership and catalog publish-state now includes a repo-local apply helper plus an operator checklist for staging and shadow environments
- migration-safe rollout now also includes a repo-local verification helper that can be used after apply or wired into the release gate when database access exists
- tenant publish rollout now also has a dedicated production-shadow rehearsal checklist so beta or shadow validation can be run as a repeatable operational sequence
- the first official sample tenant is now a chess-class onboarding sample derived from a real uploaded PDF source, giving the tenant-catalog lane one concrete non-website onboarding baseline to inherit from
- the current official seed set now also includes a third tenant, `ai-mentor-doer`, with published online private and group AI mentoring packages plus seeded username-password access for operator-led pilot use
- `ai.longcare.au` is now wired as the official tenant-facing host for the AI Mentor Pro partner runtime, with a BookedAI-powered plugin interface and embed loader path for tenant-scoped chat, search, booking, payment, and follow-up

Latest confirmed tenant baseline on `2026-04-19`:

- the tenant portal now behaves as one unified product gateway across `sign in`, `create account`, and `accept invite or claim workspace`
- tenant auth is now explicitly moving to an `email-first` posture:
  - email is the primary tenant identity instead of tenant username
  - tenant sign-in, invite acceptance, and email-led workspace creation can now run through one-time verification codes sent by email
  - Google continuation remains on the same login form as the fastest `sign in` and `create workspace` path
  - legacy username or password compatibility remains as a fallback seam, but it is no longer the primary tenant-login UX target
- tenant Google verification was hardened again on `2026-04-23`: malformed, expired, or rejected Google identity tokens now return a tenant-facing `google_identity_token_invalid` response with a clear re-verify prompt instead of leaking the raw Google `400` tokeninfo failure path.
- tenant sessions now survive reload and tenant switching safely
- onboarding now includes business profile capture plus a visible progress model inside the tenant workspace
- the tenant workspace now includes `billing` and `team` panels in addition to `overview`, `catalog`, `bookings`, and `integrations`
- the tenant workspace now also includes a `plugin` panel backed by `tenant_settings`, so partner tenants can persist BookedAI embed configuration and copy inline, modal, or iframe snippets directly from `tenant.bookedai.au`
- the next tenant experience requirement is now explicitly locked for follow-on delivery: the workspace should evolve into a clearer enterprise control surface with structured menu navigation, section-specific operator guidance, direct inline input or edit or save behavior, image-upload support, and a tenant introduction layer that can be edited in HTML and previewed safely from the tenant portal itself
- the billing workspace now includes self-serve billing setup, plan selection, trial-start or plan-switch actions, invoice-history seam, payment-method seam, billing settings, and billing audit trail
- the tenant team workspace now includes membership roster, invite flow, and tenant role or status updates
- the first tenant role model is now active:
  - `tenant_admin`
  - `finance_manager`
  - `operator`
- role-aware write rules are now part of the implemented product baseline:
  - only `tenant_admin` and `finance_manager` can change billing setup or plans
  - only `tenant_admin` can manage team membership and role changes
  - only `tenant_admin` and `operator` can import, edit, publish, or archive catalog records
- tenant workspace edit scope was hardened again on `2026-04-22`:
  - `Experience Studio` writes are now limited to `tenant_admin` and `operator`
  - billing setup save actions now respect the existing `tenant_admin` and `finance_manager` boundary in both UI and backend
  - plugin `tenant_ref` is now pinned to the signed-in tenant slug so a tenant session cannot repoint embeds toward another tenant workspace
  - authenticated tenant reads and writes in the Vite tenant shell now prefer the signed session's tenant slug over stale URL context once login is established
- invite acceptance is now handled through the tenant auth gateway with email-first verification, while the older claim-and-set-password seam remains as compatibility support during the transition
- billing, profile, subscription, and team mutations now append tenant audit events so later support drill-ins have real evidence to inherit from

## Internal Admin Baseline

The synchronized documentation baseline now also includes a dedicated internal admin strategy covering:

- current internal admin reality and limits
- internal admin role as ops, support, billing, trust, integration, audit, and rollout console
- admin information architecture and issue-first navigation
- tenant management and tenant detail support views
- booking reliability, billing ops, CRM ops, email ops, integration ops, webhook ops, and audit visibility
- role-aware internal workflows
- mobile-tolerant internal usage patterns
- safe coexistence between the current admin page and future internal admin expansion

Future internal admin work should inherit:

- `docs/architecture/internal-admin-app-strategy.md`

This is intended to preserve the current production admin utility while evolving it into a stronger internal platform console.

## AI And Matching Baseline

The synchronized documentation baseline now also includes a dedicated AI router and matching strategy covering:

- the exact role of AI in BookedAI
- what AI may do versus what AI must never do
- AI router architecture and task taxonomy
- provider and model positioning
- grounded search and local discovery policy
- matching pipeline design
- booking-trust-aware and payment-aware AI behavior
- structured outputs, confidence tiers, and trust gating
- multi-layer fallback strategy
- cost, latency, and quality strategy
- observability and evaluation requirements
- channel-agnostic AI behavior

Future AI, matching, and search work should inherit:

- `docs/architecture/ai-router-matching-search-strategy.md`

This is intended to evolve the current AI stack from a useful production booking assistant into a stronger, trust-first matching and routing engine without letting AI become the system of record.

## CRM And Revenue Lifecycle Baseline

The synchronized documentation baseline now also includes a dedicated CRM, email, and revenue lifecycle strategy covering:

- the full lifecycle from acquisition to retention
- system-of-record boundaries between Zoho CRM, BookedAI, billing state, and email providers
- CRM lifecycle architecture and sync model
- email communications architecture, template system, and delivery tracking
- lifecycle workflow design for onboarding, invoices, reminders, thank-you messages, monthly reports, and renewal paths
- attribution-to-revenue linkage
- idempotency, retry, and outbox-driven recovery
- tenant and internal admin visibility requirements

Future CRM, email, billing-reminder, and monthly-reporting work should inherit:

- `docs/architecture/crm-email-revenue-lifecycle-strategy.md`

This is intended to evolve the current production flows into a stronger lifecycle and revenue platform without collapsing operational truth into Zoho or into the email provider layer.

## Integration Hub Baseline

The synchronized documentation baseline now also includes a dedicated integration hub and sync architecture strategy covering:

- integration classification across CRM, payments, communications, business operations, and external data sources
- local-versus-external source-of-truth boundaries
- read-only, write-back, and bi-directional sync modes
- mapping strategy for contacts, leads, deals, bookings, payments, services, and slots
- sync engine direction with jobs, workers, retry, rate-limit handling, and reconciliation
- domain-specific idempotency strategy
- conflict detection and manual-versus-automatic resolution rules
- booking and slot sync safety
- revenue sync and accounting alignment
- internal admin and tenant visibility requirements

Future integration, sync, reconciliation, POS, accounting, inventory, and external booking work should inherit:

- `docs/architecture/integration-hub-sync-architecture.md`

This is intended to let BookedAI scale safely across external systems without turning integrations into a brittle tangle or letting stale and conflicting data damage booking or billing trust.

## Security And Tenant Isolation Baseline

The synchronized documentation baseline now also includes a dedicated auth, RBAC, and multi-tenant security strategy covering:

- authentication architecture for public, tenant, internal admin, integrations, and webhook providers
- tenant and internal role models
- permission abstraction and sensitive-action controls
- tenant isolation and tenant-scoped query discipline
- session, token, refresh, and storage direction
- API access control by actor type and endpoint class
- webhook verification and replay protection
- integration credential scoping
- audit logging and security-event recording
- migration-safe rollout from the current admin-only auth reality toward a real SaaS identity model

Future auth, RBAC, security, and tenant-isolation work should inherit:

- `docs/architecture/auth-rbac-multi-tenant-security-strategy.md`

This is intended to help BookedAI scale into a safer multi-tenant SaaS platform without breaking the current production admin flow or introducing a risky auth rewrite too early.

## DevOps And Deployment Baseline

The synchronized documentation baseline now also includes a dedicated DevOps, deployment, CI/CD, and scaling strategy covering:

- current deployment reality and confirmed infrastructure facts
- target deploy units and runtime separation by phase
- local, development, staging, and production environment strategy
- container and runtime direction
- CI safety gates and release discipline
- database, storage, backup, and restore strategy
- worker, queue, scheduler, and webhook runtime strategy
- observability, monitoring, and alerting expectations
- secrets and config handling
- rollout, rollback, and scaling-phase guidance

Future infrastructure, deployment, worker-hosting, backup, and release work should inherit:

- `docs/architecture/devops-deployment-cicd-scaling-strategy.md`

This is intended to help BookedAI scale operations safely without replacing the current Docker-based production deployment before the product and traffic justify a more complex platform.

## QA And Reliability Baseline

The synchronized documentation baseline now also includes a dedicated QA, testing, reliability, and AI evaluation strategy covering:

- testing pyramid guidance for unit, integration, E2E, AI eval, and business-scenario layers
- core business-flow regression priorities
- matching, booking trust, payment, CRM, email, and integration validation strategy
- failure, retry, idempotency, and degraded-mode testing
- realistic test data guidance
- QA automation and nightly regression direction
- production monitoring and support-feedback loops into QA

Future QA, testing, AI eval, reliability, and regression work should inherit:

- `docs/architecture/qa-testing-reliability-ai-evaluation-strategy.md`

This is intended to protect BookedAI trust as a live system handling real bookings, payments, lifecycle automation, and integrations, rather than treating testing as a final polish step.

## Analytics And Revenue Intelligence Baseline

The synchronized documentation baseline now also includes a dedicated analytics, metrics, revenue tracking, and BI strategy covering:

- analytics architecture from raw events to processed facts to aggregates
- event taxonomy for growth, matching, booking trust, payment, CRM, email, and subscriptions
- attribution models linking SEO and conversion to revenue and LTV
- product, revenue, CRM, email, and integration metrics
- dashboard strategy for growth, product, ops, finance, and tenant stakeholders
- data pipeline direction
- data quality, idempotency, and consistency rules for trustworthy metrics

Future analytics, BI, attribution, and revenue-intelligence work should inherit:

- `docs/architecture/analytics-metrics-revenue-bi-strategy.md`

This is intended to help BookedAI measure what actually drives growth, trust, bookings, and revenue, rather than reporting disconnected operational counts.

## Pricing And Monetization Baseline

The synchronized documentation baseline now also includes a dedicated pricing, packaging, and monetization strategy covering:

- value-based pricing principles for Australian SMEs
- hybrid pricing structure with subscription-led entry and controlled expansion levers
- plan ladder design for Starter, Growth, Pro, and Enterprise
- free-trial and low-friction entry strategy
- value metric selection tied to bookings, qualified leads, and operational complexity
- upsell and expansion paths
- pricing psychology and pricing-section guidance for the public site
- billing logic and monetization success metrics

Future pricing, packaging, monetization, and public pricing-page work should inherit:

- `docs/architecture/pricing-packaging-monetization-strategy.md`

This is intended to help BookedAI charge in a way that is easy for SMEs to buy, profitable to operate, and closely aligned with the real business value created by matching, booking trust, and lifecycle automation.

## Repository Structuring Baseline

The repo now also has an explicit structuring baseline for:

- current repo maturity
- current module boundaries
- reuse versus decomposition decisions
- target repo and module shape
- domain-aligned folder strategy
- integration boundary strategy
- worker and outbox direction
- app and surface separation strategy
- coding boundaries
- naming conventions

This baseline should be used before large refactors so the team does not accidentally:

- rewrite too much too early
- mix growth, matching, booking trust, payment, CRM, and email logic again
- keep public and admin coupled without a transition path
- block future tenant, widget, plugin, or headless modes

## Working Commitment Going Forward

From this point onward, all future BookedAI changes should follow this discipline:

- read existing documentation first
- summarize the new request
- identify every affected module
- upgrade the system in a synchronized way
- update the correct documentation before closing the task
- record substantial prompt-level descriptions into the corresponding documentation files and `project.md`

## Latest Foundation Scaffold Added

The repo now also includes a first additive scaffold for future implementation work, without replacing the current production flows.

This scaffold introduces:

- backend core foundations for config, logging, observability, feature flags, contracts, and error handling
- backend domain skeletons for growth, matching, booking trust, booking paths, payments, CRM, email, billing, deployment modes, AI routing, conversations, and integration hub
- backend repository seams for future tenant-aware persistence work
- backend provider adapter seams for Stripe, Zoho CRM, email, WhatsApp, AI/search, n8n, and external system integration
- worker and outbox skeletons for later async lifecycle work
- shared frontend contracts for API-first and channel-agnostic domain reuse

This scaffold should be treated as:

- additive
- migration-safe
- production-safe
- not yet a feature-complete implementation

Related reference:

- `docs/development/foundation-scaffold.md`

Additional development references for this scaffold:

- `docs/development/folder-conventions.md`
- `docs/development/env-strategy.md`
- `docs/development/implementation-progress.md`
- `docs/development/backend-boundaries.md`
- `docs/development/rollout-feature-flags.md`
- `docs/development/deployment-modes-notes.md`

## Data Architecture Baseline Added

The documentation baseline now also includes an explicit data architecture and schema migration strategy for:

- current confirmed database usage
- current blob-heavy operational truth risks
- target tenant-aware data domains
- booking trust and availability truth modeling
- payment and billing lifecycle modeling
- CRM and email lifecycle persistence
- growth and SEO attribution to revenue
- integration sync, reconciliation, outbox, and idempotency
- migration ordering and rollback-aware schema evolution

Future persistence and migration work should review:

- `docs/architecture/data-architecture-migration-strategy.md`
- `docs/architecture/phase-1-5-data-implementation-package.md`

## API Architecture Baseline Added

The documentation baseline now also includes an explicit API architecture and contract strategy for:

- current confirmed API routes and interaction points
- current production-critical public, admin, upload, webhook, automation, and email surfaces
- target domain-aligned API grouping
- request and response DTO conventions
- booking trust and payment gating semantics
- tenant scoping and actor-role assumptions
- webhook verification and idempotency rules
- widget, plugin, headless, and mobile-ready API direction
- phased rollout and backward compatibility planning

Future API evolution work should review:

- `docs/architecture/api-architecture-contract-strategy.md`

## 2026-04-23 QA And Go-Live Hardening

The current release-hardening baseline now also includes the latest public-surface fixes from the 2026-04-23 QA pass:

- `frontend/src/apps/public/HomepageSearchExperience.tsx` now submits homepage search on `Enter` while preserving `Shift+Enter` for multiline input, so the live search shell matches the browser contract used by the public assistant release tests instead of depending only on button submit
- the same homepage live-read runtime now prefers location-specific warning copy when `near me` searches cannot rank safely, avoiding duplicate exact warning text while keeping the shortlist empty and grounded
- homepage return handling now reads `?booking=success|cancelled&ref=...` and surfaces the corresponding payment-return banner on the public homepage, aligning the homepage runtime with the richer post-payment states already covered in pricing and assistant flows
- the broader 2026-04-23 hardening pass also preserved the earlier public/admin fixes from the same day: `/pitch-deck` pricing return banners, `/demo?demo=open` demo-brief dialog access, and Prompt 5 admin sidecar preview resilience

## 2026-04-23 Homepage Redeploy And Pitch Redesign

The public-surface realignment for `2026-04-23` now also includes a second release pass focused on sequence and clarity:

- homepage was redeployed first through the live operator workflow and revalidated with a passing host healthcheck before further public-surface changes continued
- `frontend/src/apps/public/PitchDeckApp.tsx` now opens with a more executive, decision-ready framing: clearer navigation labels, a sharper revenue-ops headline, buyer or operator or investor brief cards, a launch dashboard, and a compact decision rail instead of a softer mixed landing-page intro
- `frontend/src/components/landing/sections/PartnersSection.tsx` now supports an explicit static-data mode, and the pitch surface uses that mode so `pitch.bookedai.au` no longer attempts the cross-origin `/api/partners` fetch that previously produced production CORS noise
- this keeps the pitch host aligned with the public split already locked in docs: homepage stays lighter, pitch carries the longer-form commercial brief, and product remains the live runtime proof host

## 2026-04-24 Tenant Leads Panel (Slice 6 — Golden Tenant Activation Loop)

The Tenant Leads panel is now live in the tenant workspace as Slice 6 of the Golden Tenant Activation Loop:

- `GET /api/v1/tenant/leads` added to `backend/api/v1_routes.py` — resolves tenant, accepts optional `?status=` filter, returns lead list plus summary counts
- `build_tenant_leads_snapshot` added to `backend/service_layer/tenant_app_service.py` — derives `needs_follow_up`, `converted`, and `crm_attention` stat card data in addition to the raw lead list
- `list_tenant_leads` added to `backend/repositories/reporting_repository.py` — LEFT JOIN against `crm_sync_records` for live CRM sync posture per lead; scoped to tenant, filtered, ordered by recency
- `TenantLeadItem` and `TenantLeadsResponse` added to `frontend/src/shared/contracts/api.ts`
- `getTenantLeads` added to `frontend/src/shared/api/v1.ts` and registered on the `apiV1` export object
- Tenant workspace `TenantApp.tsx` extended with the full Leads panel: `'leads'` added to `TenantPanel` union; `leads: TenantLeadsResponse | null` added to `TenantLoadState` ready variant; lazy-load `useEffect` fires on-demand when the user navigates to the panel; filter-reset `useEffect` refetches when `leadsStatusFilter` changes
- Leads panel renders: summary stat cards, status filter tabs (All / New / Active / Converted), lead list rows with name, status badge, CRM sync badge, follow-up indicator, contact info, service name, formatted date; loading skeletons and empty state
- swim-aware throughout: Future Swim tenants (`isFutureSwimTenant()`) see "Enquiries" / "Parent enquiries" in all headings; generic tenants see "Leads"
- build and deploy passed; stack health verified

## Phase 1.5 Persistence Package Added

The repo now also includes a first persistence implementation package for the next safe migration step.

This package adds:

- migration-ready SQL files for platform safety, tenant anchor, lead/contact/booking/payment mirrors, and CRM/email/integration/billing seed tables
- repository seams for tenant, audit, outbox, idempotency, webhook, lead, contact, booking intent, and payment intent persistence
- an implementation package document describing migration order, dual-write order, and rollback posture

This package is intended to support:

- default tenant rollout
- first normalized mirror tables
- first outbox and idempotency infrastructure
- first CRM/email/billing lifecycle persistence
- later booking trust and availability truth work

## 2026-04-24 Pitch Package Booking QA Closeout

The pitch host has now been deep-tested through the package booking path:

- `pitch.bookedai.au` pricing CTAs route to the pitch-host registration flow instead of falling back to the pitch deck runtime
- package registration submits to the production pricing consultation API from the pitch origin with CORS allowed
- backend pricing consultation side effects degrade to manual follow-up instead of failing the customer-visible submit when calendar, Stripe, event-store, or dual-write dependencies are unavailable
- mobile UI polish removed the fixed bottom CTA overlay, tightened package selector wrapping, and adjusted the shared landing footer so brand copy, release badge, and compact icon-led CTA buttons stay readable without horizontal overflow
- live verification passed on desktop, tablet, and mobile, including a mobile end-to-end confirmation reference `CONS-022CCEA9`

## 2026-04-24 Admin Revenue-Ops Ledger Polish

The chess revenue-ops ledger now has a more operator-ready admin surface inside Reliability:

- tenant-wide summary counts stay visible even while status, action type, student, or booking filters are active
- operators can filter action runs by student reference and booking reference from the UI
- action cards expose input and result evidence payloads without leaving the Reliability workspace
- refresh, dispatch, complete, and manual-review controls use compact icon-led buttons suitable for dense admin workflows
- migration `018_academy_subscription_and_agent_action_runs.sql` now grants the live `bookedai_app` role access to `academy_subscription_intents` and `agent_action_runs`, fixing the production `permission denied for table agent_action_runs` failure found during live API probing
- production verification passed for `GET /api/v1/agent-actions` and `POST /api/v1/agent-actions/dispatch`

## 2026-04-24 Full Booking Thank-You Handoff

The customer-facing booking flow now has a consistent end state after a booking or qualified booking enquiry is captured:

- homepage search, product/embedded assistant, Future Swim tenant runtime, and Grandmaster Chess tenant runtime now show a prominent Thank You confirmation after the booking/enquiry result
- the Thank You state no longer includes a countdown or automatic return; the customer can keep the booking reference, QR, portal actions, and follow-up details visible as long as needed
- homepage search keeps the confirmation state in place after booking rather than resetting back to the main search state automatically
- earlier live product verification created booking `v1-ce0d20a95d` and observed `200` responses for the lead, booking intent, payment intent, email, SMS, and WhatsApp automation steps; the current UX contract keeps that confirmation visible until the customer leaves or starts another action
