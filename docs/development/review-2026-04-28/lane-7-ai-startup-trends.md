# Lane 7 — Benchmark BookedAI vs các AI startup hàng đầu 2025–2026

Audience tag:
- **A** = SME owner mua / dùng (chủ tiệm, manager)
- **B** = End-customer (khách đi đặt dịch vụ)
- **C** = Investor / judge / enterprise evaluator

> Note về reference URL: WebFetch bị deny trong session này. Mọi URL bên dưới là public marketing pages đã ổn định trong industry; nếu deploy team muốn ship copy cite-by-cite, cần re-verify lại bằng browser trước khi đưa vào public docs. Mọi BookedAI evidence đều có file:line thực tế trong repo.

---

## 1. Trend Gap Matrix

| # | Trend pattern (2025–2026) | Best-in-class reference | BookedAI hiện tại (score 0–10 + evidence) | Gap | Priority | Audience |
|---|---|---|---|---|---|---|
| 1 | First viewport = real product, không phải pitch deck | Cursor (cursor.com), Granola (granola.ai), v0 (v0.dev) | **5/10** — `frontend/src/components/landing/sections/HeroSection.tsx:73-173` đặt 3 metric blocks + “Frontend delivery priority” + 3 highlight cards trước khi tới live composer; phone mockup ở cột phải `:213-392` chỉ là static SVG-chat. Search composer thật nằm xa hero, ở `HomepageSearchExperience.tsx:4180-4250`. | Hero đang “tell” thay vì “show”; investor scroll qua 3 strip text mới thấy real input | **P0** | A, C |
| 2 | ChatGPT-style composer + slash commands + suggested prompts | OpenAI ChatGPT, Perplexity (perplexity.ai), v0.dev | **6/10** — composer có voice + attach (`HomepageSearchExperience.tsx:4180-4252`) và quick prompts (`SEARCH_PROGRESS_PROMPTS` `:212-217`), nhưng KHÔNG có slash commands, không saved prompts, suggested chips chỉ append theo từ khoá (`deriveIntentSuggestions :343-372`) | Thiếu “/book”, “/compare”, “/find near me”, “/portal” palette; thiếu prompt library cho SME | **P0** | A, B, C |
| 3 | Agent transparency (“watching agent think”) — show tool calls, plan, evidence | Lindy (lindy.ai), Replit Agent (replit.com/agent), Vercel AI SDK demos | **3/10** — chỉ có 4-stage progress text `SEARCH_PROGRESS_STAGES :193-210` + booking flow steps `:4298-4327`. Backend đã ghi `conversation_events` (`backend/db.py:20-37`) với `ai_intent / workflow_status / metadata_json` nhưng UI không stream / không hiển thị tool-call ledger | Mất “wow” lớn nhất 2026 | **P0** | C, A |
| 4 | Generative / streaming UI — components stream into view | v0.dev, Vercel AI SDK, ChatGPT Canvas | **4/10** — backend đã có SSE endpoint (`backend/services.py:1985-2081`, `backend/api/route_handlers.py:2370-2420`) nhưng frontend HomepageSearchExperience chỉ render full payload sau khi `runSearch` xong; result entry animation cosmetic `:402-407` | Cần card stream từng cái, citation chip hiện dần | **P1** | B, C |
| 5 | Citation-first UX (evidence next to answer) | Perplexity, Glean (glean.com), Granola | **4/10** — partner match có “why_this_matches”, “trust_signal”, `source_label` (HomepageSearchExperience type `:60-69`) nhưng UI chưa dùng inline citation chip [1][2] cạnh từng câu reply | Reply text thiếu inline source pill | **P1** | B, C |
| 6 | Trust signals = real numbers / real tenants / live audit | Stripe (stripe.com), Plaid (plaid.com), Linear customers page | **3/10** — `data.ts:579-583` chỉ có `+35% / 24/7 / 0` — vague, không có “2,148 bookings captured this week” live counter; trust quotes `:616-635` chưa attached photo + workspace link | Investor gãy ngay đoạn metric vì số không khả tín | **P0** | C |
| 7 | Onboarding = magic-moment trước setup wall | Granola (record first meeting), Cursor (clone repo + composer), Notion (template) | **5/10** — public composer cho phép “try free” nhưng tenant onboarding (`TenantApp.tsx`) yêu cầu sign-in / email code trước khi thấy workspace value; `tenant-onboarding/TenantActivationChecklistCard` là wall | Thiếu “sandbox tenant” pre-auth + “your first booking đã captured” reveal | **P0** | A, C |
| 8 | Mobile-first composer & portal | Granola mobile, Linear mobile (linear.app/mobile), Cursor mobile preview | **5/10** — composer collapse OK nhưng `bookingFlowSteps` + sidebar `:4257-4348` ẩn ở mobile (xl:block), không có sticky bottom-sheet composer; portal `PortalApp.tsx` view list `:61-103` dùng tab horizontal scroll | Mobile thiếu “thumb-zone” single-input + bottom-sheet results | **P1** | A, B |
| 9 | Density + taste (Linear school) | Linear (linear.app/method) | **6/10** — Apple template đẹp (per `MEMORY.md project_design_system`) nhưng homepage có quá nhiều big-padded section cards (`HeroSection.tsx :126-171` 3 grids cùng nhau) → loãng | Ép density: chuyển 3 metric blocks thành 1 dòng status bar | **P1** | C |
| 10 | Empty / loading / error polish | Linear, Stripe Dashboard | **5/10** — có `BOOKING_EMPTY_STEPS :218-222` và stage prompts, nhưng error path `resolveApiErrorMessage` chỉ show plain string trong toast | Empty state chưa “next-best-action”, error chưa retry-with-context | **P2** | A, B |
| 11 | Pricing page taste — usage-based, calculator, transparent | Stripe pricing, OpenAI pricing, Vercel pricing | **5/10** — `PricingSection.tsx + pricing-shared.ts` có 3 plans Starter/Pro/ProMax, có consultation modal, nhưng KHÔNG có usage calculator (số booking/tháng × giá), không có “estimated ROI” widget, “49$+” copy `data.ts:591` reads non-confident | **P1** | A, C |
| 12 | Open-source / docs / API trust signals | Stripe Docs, Vercel Docs, Linear API | **2/10** — không có `/docs`, `/api`, `/changelog` page, không có public Postman collection. PRD section 5 declares `api.bookedai.au` nhưng public users không thấy proof | Tạo `/docs`, `/changelog`, `/status` (`status.bookedai.au`) | **P1** | C |
| 13 | Animation = signal not noise | Linear releases, Vercel | **6/10** — entry animations `getResultEntryStyle :402-407` clean; nhưng hero không có “booking number ticker” + scroll-locked storytelling | **P2** | C |

---

## 2. Top 12 Concrete Upgrade Proposals

### P1. Strip the hero, lead with live composer + 8-second proof
- **Target**: `frontend/src/components/landing/sections/HeroSection.tsx`, `frontend/src/apps/public/HomepageSearchExperience.tsx`
- **Reference**: Cursor (cursor.com) — first viewport = composer + downloadable proof; Granola (granola.ai) — first frame = product
- **Effort**: M (3d)
- **Audience**: A, C
- **Sketch**: Xoá 3 priority cards `:140-156` + executiveMetrics block `:126-138`. Đẩy real `searchComposerRef` composer (đang ở `:4200`) lên thẳng hero. Bên cạnh composer là animated chip set: “🟢 142 enquiries answered today · 38 booked · A$12,840 captured” pulled from a public stats endpoint. Chuyển 3 highlight cards thành 1-line status bar dưới composer.

### P2. Slash commands inside the composer (`/book`, `/compare`, `/portal`, `/help`)
- **Target**: `HomepageSearchExperience.tsx :4200-4250`, new `frontend/src/shared/components/SlashCommandMenu.tsx`
- **Reference**: Linear command palette (linear.app/method), Notion AI, ChatGPT
- **Effort**: M (3d)
- **Audience**: A, B
- **Sketch**: When user types `/`, render floating menu anchored above textarea with 6 verbs: `/find`, `/compare`, `/book`, `/quote`, `/portal <ref>`, `/help`. Each command rewrites the prompt template and submits with a deterministic `intent_hint`. Same palette opens via `Cmd/Ctrl+K` everywhere (homepage, product, portal). Wire to existing `apiV1.publicBookingAssistantChat` — backend already has `ai_intent` slot.

### P3. “Agent Activity Drawer” — show your work pattern
- **Target**: new component `frontend/src/shared/components/AgentActivityDrawer.tsx`, mounted from `HomepageSearchExperience.tsx` & `ProductApp.tsx` & `PortalApp.tsx`
- **Reference**: Lindy (lindy.ai), Replit Agent, Vercel AI SDK “show steps” demos
- **Effort**: L (1w)
- **Audience**: C, A
- **Sketch**: Thin right-side drawer (toggle: “See how BookedAI is working”). Pull from a new `GET /api/v1/agent/activity?conversation_id=…` that flattens `conversation_events.metadata_json` into typed steps: `understanding`, `lookup_catalog`, `rank`, `clarify`, `propose_booking`, `notify_tenant`, `payment_intent`, `crm_sync`. Each step renders a 1-line title + collapsible JSON evidence + duration ms. (See section 5 below.)

### P4. Streaming result cards
- **Target**: `HomepageSearchExperience.tsx` results panel
- **Reference**: v0.dev (v0.dev), Vercel AI SDK
- **Effort**: M (3d)
- **Audience**: B, C
- **Sketch**: Switch the catalog endpoint to SSE-on-rank. Stream each ranked card the moment its trust check passes, with skeleton fill + “verifying provider…” chip that flips to green tick when `booking_confidence` lands. Already have SSE infra (`backend/services.py:1985`).

### P5. Inline citation chips on every AI reply
- **Target**: `HomepageSearchExperience.tsx` chat bubble renderer; `BookingAssistantDialog.tsx`
- **Reference**: Perplexity (perplexity.ai), Glean
- **Effort**: S (1d)
- **Audience**: B, C
- **Sketch**: When the assistant references a service, render `[1]` `[2]` chips after the sentence; clicking pulses the matching card and opens detail popup. Backend already returns `matched_services`, `source_label`, `source_url`.

### P6. Real-number trust strip + live tenant logo wall
- **Target**: `frontend/src/components/landing/sections/TrustSection.tsx`, `data.ts:579-583`
- **Reference**: Stripe (stripe.com), Linear customers (linear.app/customers), Plaid
- **Effort**: M (3d)
- **Audience**: C
- **Sketch**: Replace placeholder metrics with backend-derived counters (last 30 days bookings created, AOV captured, % auto-confirmed). Add 6 real tenant logos (chess, Auzland, etc.) with one-line outcome each. Pull from `tenant_overview` admin reporting.

### P7. Magic-moment onboarding sandbox (no-auth tenant)
- **Target**: `TenantApp.tsx`, new route `/sandbox`
- **Reference**: Granola (record first meeting), Notion templates
- **Effort**: L (1w)
- **Audience**: A, C
- **Sketch**: Before sign-in, give visitor a temp tenant with seeded catalog and let them paste their own service list; show a pre-rendered “first booking captured” dashboard card within 30s. After moment-of-magic, surface “save this workspace” → email code path. Reuses `tenant-onboarding/tenantActivation` state shape.

### P8. Mobile bottom-sheet composer + thumb-zone result browser
- **Target**: `HomepageSearchExperience.tsx`, `PortalApp.tsx :61-103`
- **Reference**: Granola mobile, Linear mobile
- **Effort**: M (3d)
- **Audience**: A, B
- **Sketch**: On `< sm`, pin composer to bottom safe-area, swipe-up reveals slash menu, results render as full-bleed cards in a vertical snap container. Portal view tabs become bottom tab bar (max 4) with overflow `…`.

### P9. Cmd-K command palette across surfaces
- **Target**: new `frontend/src/shared/components/CommandPalette.tsx`, mounted in `PublicApp`, `ProductApp`, `TenantApp`, `PortalApp`
- **Reference**: Linear command palette (linear.app/method)
- **Effort**: M (3d)
- **Audience**: A, C
- **Sketch**: Single fuzzy palette with grouped sections: Run agent action / Open booking by reference / Switch tenant / Jump to portal / Open docs. Logs each invocation as `conversation_events` for the agent ledger.

### P10. Pricing page upgrade — usage calculator + ROI estimator
- **Target**: `frontend/src/components/landing/sections/PricingSection.tsx`, `pricing-shared.ts`
- **Reference**: Stripe pricing, Vercel pricing, OpenAI pricing
- **Effort**: M (3d)
- **Audience**: A, C
- **Sketch**: Add a slider (“missed enquiries per week”) × (“average booking value”) → live monthly “revenue you’re leaking now” + “BookedAI break-even at X bookings/mo”. Replace `49$+` with “A$49 / month — see what you save below”. Add commission-only enterprise card for hospitality chains.

### P11. Public `/docs`, `/changelog`, `/status` developer-grade trust
- **Target**: new `apps/public/DocsApp.tsx`, `ChangelogApp.tsx`, `StatusApp.tsx`
- **Reference**: Stripe Docs (stripe.com/docs), Vercel changelog, Linear changelog
- **Effort**: L (1w)
- **Audience**: C, A
- **Sketch**: `/docs` = embedded Hermes (`hermes.bookedai.au`), with copy-as-cURL on every endpoint. `/changelog` = chronological release notes auto-generated from PR titles + screenshots. `/status` = uptime + “last booking processed Xs ago” signal.

### P12. Subtle motion language — booking ticker + result-stream timing
- **Target**: hero composer + result panel
- **Reference**: Linear releases motion, Vercel
- **Effort**: S (1d)
- **Audience**: C
- **Sketch**: Live counter in hero (“+1 booking · 7s ago · Inner West clinic”) using server-sent stream throttled at 1 update / 5s. Result cards stagger in at 60ms and never reflow once placed. Cap all transition < 220ms.

---

## 3. Three “Investor Wow Moments” to build

### Wow 1 — “Watch BookedAI close a booking in 8 seconds” (hero composer)
- **Where**: top of `bookedai.au`, replaces phone mockup `HeroSection.tsx :213-392`
- **Animation**: typed prompt auto-fills (“chess class for my 8yo near Chatswood, this Sunday”), composer submits, `AgentActivityDrawer` (Wow 3) slides open, ranked card streams in, `Book →` button pulses, then a faux Stripe checkout sheet appears with “booking_reference BKAI-AU-9182 confirmed”.
- **Data**: pre-seeded chess tenant (`co-mai-hung-chess-class`) — already verified live (README l. 166).
- **Length**: 8s loop, replays on hover or scroll-into-view.

### Wow 2 — “Live Revenue Captured Today” counter strip
- **Where**: hero subhead + footer of every public page
- **Animation**: counter ticks up softly each time a real booking event lands (`conversation_events` source = `tenant_booking_created`); micro toast bottom-right shows “+A$240 booked at <tenant_alias>” every ~30s.
- **Data**: anonymized aggregate from `reporting_repository.py`.

### Wow 3 — “Agent Ledger” opening like a black-box flight recorder
- **Where**: side drawer launched from any composer
- **Animation**: drawer slides in 220ms, steps render top-down with a leftside dotted timeline; each step has a duration badge that count-ups and a `View evidence` toggle exposing JSON. Final step `notify_tenant ✓` lands with a soft green flash.
- **Data**: typed projection of `conversation_events.metadata_json` (see section 5).

---

## 4. Composer UX Redesign Sketch (5 upgrades)

Target: `frontend/src/apps/public/HomepageSearchExperience.tsx` `:4180-4252` and `frontend/src/apps/public/demo/DemoChatStage.tsx` `:105-170`.

1. **Slash command menu** — `/find`, `/compare`, `/book <id>`, `/quote`, `/portal <ref>`, `/help`. Floating menu anchored above textarea, keyboard nav, ESC to close, sends a typed `intent_hint` to backend.
2. **Persistent suggested-prompts strip with rotation** — replace static `SEARCH_PROGRESS_PROMPTS :212` with 8 vertical-specific suggestions that rotate per detected vertical (clinic / salon / chess / trades). Click = fill, second click = send.
3. **Agent steps panel attached to composer** — small inline “🟢 understanding · finding · ranking · clarifying” progress chips that each open the full Agent Ledger (Wow 3). Replaces the current `SEARCH_PROGRESS_STAGES` block-text block.
4. **Citation chips on every assistant reply bubble** — `[1]` `[2]` next to claims, click pulses the matched card.
5. **Streaming results above composer** — convert results to SSE; show first card within 600ms, subsequent cards stream as ranking confirms; lock anti-reflow once a card is placed.

UI copy (English):
- placeholder: `Ask for a service, area, time, budget — or type / for shortcuts`
- helper: `Enter to send · Shift+Enter for new line · / for commands · ⌘K for everywhere`

---

## 5. Agent Transparency / “Show your work” component

**Component name**: `AgentActivityDrawer`
**Location**: `frontend/src/shared/components/AgentActivityDrawer.tsx`, mounted from public homepage, product, portal.

**Trigger**: tab on the right edge of viewport labeled `See how BookedAI works →`. Also auto-opens the first time a search resolves on a session.

**Inferred data shape from `backend/db.py:20-37` `conversation_events`**:

```ts
type AgentStep = {
  id: number;                      // ConversationEvent.id
  source: 'public_chat' | 'telegram' | 'whatsapp' | 'portal' | 'tenant_workflow';
  event_type: 'message_in' | 'intent_resolved' | 'catalog_lookup'
            | 'rank' | 'clarify_request' | 'booking_intent_created'
            | 'payment_intent' | 'tenant_notify' | 'crm_sync'
            | 'lifecycle_email' | 'workflow_status_change';
  ai_intent: string | null;        // typed verb
  ai_reply: string | null;         // assistant text snippet
  workflow_status: string | null;  // 'queued' | 'in_flight' | 'done' | 'attention'
  duration_ms?: number;            // metadata_json.duration_ms
  evidence?: Record<string, unknown>; // metadata_json minus PII
  created_at: string;              // ISO
};
```

**New API**: `GET /api/v1/agent/activity?conversation_id=…&limit=50` returning `{ steps: AgentStep[], stream_token?: string }`. SSE companion `/api/v1/agent/activity/stream`.

**UI**:
- Vertical timeline, leftside dotted rail, each step pill: `event_type` label · `duration_ms` · status dot.
- Expand → JSON evidence card (PII-stripped: phone/email masked).
- Footer pill: `Powered by conversation_events · auditable in admin.bookedai.au`.

**Audience impact**:
- **C**: First proof that BookedAI is an *operating system*, not a chatbot. Single biggest differentiator vs widget competitors.
- **A**: SME owner sees that every customer reply is logged + auditable — direct trust win for compliance-curious buyers (clinics, education).
- **B**: Optional surface; quietly available, builds confidence on retry/error states.

---

## 6. Mobile composer pattern

Pattern borrowed from Granola mobile + Linear mobile: thumb-zone bottom sheet that owns the bottom 40% of viewport.

**Target**: `HomepageSearchExperience.tsx`, `ProductApp.tsx`, `PortalApp.tsx`.

Spec:
- Bottom-pinned sheet with grab-handle. Collapsed = single-line input + send. Expanded (drag up or tap) = textarea + slash menu + suggested prompts + voice + attach.
- Results render full-bleed above, snap-scroll vertically, each card auto-collapses to one-line meta when not active.
- Sticky “🟢 BookedAI is working — 3 steps so far” chip top of viewport that opens the Agent Ledger as full-screen sheet.
- Portal `view` switcher (`PortalApp.tsx :61-103`) becomes 4-icon bottom tab bar + overflow `…`. Each tab is one-handed reachable.
- One-thumb test: every primary action ≤ 56dp from bottom edge.

---

## 7. Pricing page upgrade

Current state: `PricingSection.tsx + pricing-shared.ts` has 3 tiered plans (Starter A$49+, Pro A$149, Pro Max A$349) and a consultation modal — solid but reads like a 2022 SaaS plan card.

Modern AI-startup upgrades:

1. **Usage calculator hero** — interactive: “How many enquiries does your business get per week?” × “Average booking value?” → live: “BookedAI captures roughly N additional bookings = A$X / month” using same `+35%` benchmark from `data.ts:580`.
2. **Annotated plan cards** with real artefacts: each plan shows the *actual* features from the workspace (booking inbox, agent ledger, CRM sync) with a small product screenshot, not text bullets only.
3. **Commission-aligned enterprise card** — “Pay only on booked revenue” with a “Talk to founder” inline calendar (Cal.com-style embed) instead of just `/register-interest`.
4. **Live activation counter** — “7 SME tenants activated this quarter · 3 spots left in launch-offer cohort” to convert the README launch-offer (`first 10 SMEs`) into urgency.
5. **Compare table** below cards, Stripe-pricing style: feature × tier matrix with checkmarks. Keep dense, single screen.
6. **No “49$+”** — use confident, exact pricing per plan + an explicit “setup fee scoped after consult”.

Reference patterns: stripe.com/pricing, vercel.com/pricing, openai.com/pricing.

---

## 8. Anti-patterns to avoid (already creeping in)

1. **“AI-powered” / “Revenue Engine” buzzword density** — README l.5 + many landing strings. Modern AI startups (Cursor, Granola, Linear) say what the product *does* in concrete verbs, not category labels. Replace with “BookedAI replies in 6 seconds, books in 30, follows up forever.”
2. **3-deep nested gradient cards** in `HeroSection.tsx :80-171` — fatigue pattern. Linear/Cursor use one card max per viewport; BookedAI stacks gradient inside gradient inside gradient.
3. **Static phone mockup screenshot pretending to be product** (`HeroSection.tsx :213-392`). Investors recognise faux-screenshots instantly. Replace with real iframe of `product.bookedai.au` composer.
4. **Vague metrics without sources** (`data.ts:579-583` `+35% / 24/7 / 0`). Modern bar = exact number + tenant name + “last 30 days”. Anything else looks like seed-deck filler.
5. **Auth wall before value** (`TenantApp.tsx` requires email code before workspace). Magic moment must precede sign-in — see Granola, Notion AI, Linear `Get started` flows.
6. **Generic CTAs** — “Try BookedAI Free”, “Schedule a Consultation” (`data.ts:608-609`). Modern: action verbs tied to outcome — “Capture my next missed booking”, “Score my booking funnel”.
7. **Multiple competing nav links** inside hero + secondary tile + tertiary `See Pricing` (`HeroSection.tsx :98-122`). Pick one primary action.

---

## 9. Appendix

### A. Reference URLs (re-verify before public quoting)
- Cursor — https://www.cursor.com/
- Granola — https://www.granola.ai/
- Linear UX manifesto — https://linear.app/method
- Linear customers — https://linear.app/customers
- v0 — https://v0.dev/
- Vercel AI SDK — https://sdk.vercel.ai/
- Perplexity — https://www.perplexity.ai/
- Glean — https://www.glean.com/
- Lindy — https://www.lindy.ai/
- Relevance AI — https://relevanceai.com/
- Vapi — https://vapi.ai/
- Replit Agent — https://replit.com/agent
- Notion AI — https://www.notion.so/product/ai
- ChatGPT — https://chat.openai.com/
- Stripe pricing — https://stripe.com/pricing
- Stripe docs — https://stripe.com/docs
- Plaid — https://plaid.com/
- Vercel pricing — https://vercel.com/pricing
- OpenAI pricing — https://openai.com/api/pricing
- Atlassian system — https://atlassian.design/
- Canva storyteller pages — https://www.canva.com/
- SafetyCulture — https://safetyculture.com/

### B. BookedAI evidence cited
- Hero scaffolding: `frontend/src/components/landing/sections/HeroSection.tsx:73-396`
- Live composer: `frontend/src/apps/public/HomepageSearchExperience.tsx:4180-4252`
- Search progress stages + prompts: `HomepageSearchExperience.tsx:193-217`
- Booking flow chip strip: `HomepageSearchExperience.tsx:4298-4327`
- Catalog item shape (already includes `why_this_matches`, `trust_signal`, `source_label`): `HomepageSearchExperience.tsx:41-69`
- Demo chat composer: `frontend/src/apps/public/demo/DemoChatStage.tsx:105-170`
- Trust copy and metrics: `frontend/src/components/landing/sections/TrustSection.tsx:1-60`, `frontend/src/components/landing/data.ts:579-635`
- Pricing model: `frontend/src/components/landing/sections/PricingSection.tsx:1-110`, `pricing-shared.ts:1-175`
- Tenant workspace + auth wall: `frontend/src/apps/tenant/TenantApp.tsx:1-120`
- Portal view list: `frontend/src/apps/portal/PortalApp.tsx:61-103`
- Backend SSE infra: `backend/services.py:1985-2081`, `backend/api/route_handlers.py:2370-2420`
- `conversation_events` schema (data source for Agent Ledger): `backend/db.py:20-37`
- Reporting source for live counters: `backend/repositories/reporting_repository.py:80-110`

### C. Screenshot ideas to include in the design brief
1. Hero v2 wireframe — full-bleed composer + live counter + agent ledger tab.
2. Slash menu open above composer with 6 verbs.
3. Streaming result cards mid-stream (1 done, 2 skeletons).
4. Citation chips `[1][2]` inside an assistant bubble pulsing the matched card.
5. Agent Ledger drawer expanded — 8 typed steps with duration badges.
6. Mobile bottom-sheet composer with grab handle + slash open.
7. Pricing calculator showing leaking-revenue → break-even.
8. `/changelog` page Stripe-style with screenshots per release.
9. Live tenant logo wall under hero.
10. Magic-moment sandbox tenant — “Your first booking already captured” banner.

### D. Suggested rollout phasing (3 sprints)
- **Sprint A (1 week)** — P1 hero strip, P2 slash commands, P5 citation chips, P6 trust counters.
- **Sprint B (1.5 weeks)** — P3 Agent Activity Drawer, P4 streaming cards, P9 Cmd-K palette.
- **Sprint C (1.5 weeks)** — P7 magic-moment sandbox, P8 mobile composer, P10 pricing calculator, P11 docs/changelog/status.

— End of Lane 7 —
