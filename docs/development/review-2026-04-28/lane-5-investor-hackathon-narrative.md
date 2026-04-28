# Lane 5 - Investor + Hackathon Narrative Audit

Ngày: `2026-04-28`
Phạm vi: read-only audit pitch + hackathon narrative cho audience B (WSTI judges) và C (VC unicorn-thesis).
Cơ sở chứng cứ: `README.md`, `prd.md`, `frontend/src/apps/public/PitchDeckApp.tsx`, `frontend/src/apps/public/RoadmapApp.tsx`, `frontend/src/components/landing/data.ts`, `backend/api/*`, `docs/development/tenant-bookedai-uat-ab-investor-review-2026-04-26.md`.

---

## 1. Narrative Scorecard (0-10)

| # | Chiều đánh giá | Score | Lý do (1 dòng, ground vào repo) |
|---|---|---|---|
| 1 | Clarity of thesis | 7.5 | `README.md:9` + `prd.md:73-95` đã chốt "AI Revenue Engine for Service Businesses" + dual-agent, nhưng `PitchDeckApp.tsx:718-726` hero vẫn nói "convert enquiries into bookings" → vẫn nghe ra "booking widget cao cấp". |
| 2 | Defensibility / Moat | 5.0 | `data.ts:580-583` chỉ có 3 metric vanity (`+35%`, `24/7`, `0`); pitch không nói data-moat (booking truth + ledger), distribution-moat (multi-channel agent), workflow lock-in. |
| 3 | Real-flow demo readiness | 8.0 | Telegram `@BookedAI_Manager_Bot` live (`README.md:165`), Chess tenant `co-mai-hung-chess-class` đã active (`README.md:166`), portal + admin handoffs route hoạt động (`backend/api/v1_academy_routes.py:28`, `frontend/src/features/admin/pending-handoffs-section.tsx`). |
| 4 | Market sizing | 2.0 | Không tìm thấy TAM/SAM/SOM con số cụ thể trên `pitch.bookedai.au`; PRD nêu vertical list (`prd.md:132-138`) nhưng không định lượng. |
| 5 | GTM path | 4.5 | `PitchDeckApp.tsx:60-66` chỉ có problem funnel; có `RegisterInterestApp` + "Talk to Sales" CTA, nhưng không có wedge/beachhead/channel sales detail. |
| 6 | Monetization clarity | 5.5 | `PitchDeckApp.tsx:95-137` ba tier (Free / $49+ / Custom); `prd.md:599-603` nêu setup + commission, nhưng pitch không show commission %, không show $ASP, không show LTV/CAC. |
| 7 | Agent-layer story | 6.5 | `prd.md:272-345` định nghĩa 3 agent classes + handoff contract rõ; nhưng pitch deck chỉ có 1 architecture SVG static (`PitchDeckApp.tsx:233-312`) — không show agent boundaries trực quan. |
| 8 | Audit / Evidence story | 6.0 | Backend có `job_run_repository.py`, `agent-actions` ledger, `messaging_channel_sessions`; tenant Ops UI tồn tại (`TenantApp.tsx:1303` `action_runs`), nhưng pitch không click-through cho judge thấy ledger entry như "wow proof". |

Trung bình: **`5.6/10`** — sản phẩm sẵn sàng demo thật nhưng narrative còn ở mức "premium booking SaaS" chứ chưa ở mức "operating layer unicorn".

---

## 2. WSTI 5-Min Demo Script (phút-by-phút)

| Time | Surface (URL) | Voiceover (EN) | Click cụ thể (file:line) | Backup nếu lỗi |
|---|---|---|---|---|
| 0:00-0:30 | `https://pitch.bookedai.au/#hero` | "BookedAI is the AI Revenue Engine for service SMEs. Not a chatbot. An omnichannel agent layer that turns missed enquiries into tracked, audited revenue." | Hero `PitchDeckApp.tsx:701-799` (BrandLockup + 3 metrics). | Local Vite preview: `frontend/scripts/serve_dist_spa.mjs`. |
| 0:30-1:15 | `https://product.bookedai.au/` (open in new tab from header `PitchDeckApp.tsx:686-698`) | "Customer types a real natural-language query. Watch staged ranking, capability chips, Book action — all inside one chat thread." | Type `chess class for my 8 year old in Sydney` in `HomepageSearchExperience.tsx` composer; click result for `co-mai-hung-chess-class` (verified-tenant chips per `README.md:166`). | Pre-load tab; if API slow, use cached `demoContent.results[0]` (`PitchDeckApp.tsx:679`). |
| 1:15-2:15 | Telegram → `@BookedAI_Manager_Bot` (live, `README.md:160-165`) | "Same query on Telegram — same agent, different surface. Inline pickers, Book 1, name/phone capture, instant booking reference." | Send `chess class Sydney` → tap `Book 1` inline button (Telegram inline picker shipped PR #10). | Pre-recorded 30s screen-cap mp4 in `storage/uploads/videos/` as fallback. |
| 2:15-3:00 | `https://portal.bookedai.au/?ref=<booking_ref>` | "Customer comes back. QR + portal grounded in real booking truth — payment posture, reschedule, cancel — all auditable." | Show booking QR → click `Reschedule` (queues audited request per `README.md:148-150`). | Pre-staged booking ref from chess tenant. |
| 3:00-4:00 | `https://admin.bookedai.au/` (Pending Handoffs section) | "Operator side: same booking lands in admin Reliability + Pending Handoffs queue. Every agent action is in the action_runs ledger." | Open `frontend/src/features/admin/pending-handoffs-section.tsx`; show fresh handoff item from minute 2:15. **WOW**: real Telegram booking visible in admin <30s. | Use prior session's pending handoff if live one delays. |
| 4:00-4:30 | `https://tenant.bookedai.au/` → Future Swim → Ops tab | "Tenant sees revenue follow-up ready, action_runs ledger entries, billing readiness — not a dashboard mockup, real records." | `TenantApp.tsx:1303` action_runs panel; `data.ts:1618-1635` 3-tenant proof. | Static screenshot from `docs/development/tenant-bookedai-uat-ab-investor-review-2026-04-26.md`. |
| 4:30-5:00 | `https://pitch.bookedai.au/#roadmap-execution` | "Phase 17-23 → go-live April 30, multi-tenant template June 7. Three live tenants. Telegram primary today, WhatsApp/SMS adapter shipping per CR-010." | Master roadmap SVG `PitchDeckApp.tsx:421-457`. | `RoadmapApp.tsx:117-186` deeper page if SVG fails. |

WOW moment đề xuất: tại phút 3:00, để judge nhìn thấy real booking từ Telegram (phút 2:15) xuất hiện trong admin Pending Handoffs queue — chứng minh end-to-end ledger trong dưới 1 phút.

---

## 3. Investor Pitch Gap List (B/C tag)

1. **[C] Thiếu TAM/SAM/SOM slide** — `PitchDeckApp.tsx` không có market sizing. Đề xuất: AU service-SME ≈ 600k businesses × $400/mo ARR potential = $2.9B SAM; global service-SME ≈ 30M.
2. **[C] Thiếu defensibility slide** — không có data-moat / network-effect / lock-in argument. Phải viết riêng (xem mục 4).
3. **[C] Thiếu unit economics** — không show CAC, LTV, payback, gross margin. PRD `prd.md:710-727` chỉ liệt kê metric tên, không có target number.
4. **[C] Vanity metrics yếu** — `data.ts:580-583` (`+35%`, `24/7`, `0`) là claim không có nguồn. Thay bằng real numbers từ chess tenant pilot.
5. **[B+C] Agent architecture image quá generic** — `PitchDeckApp.tsx:233-312` SVG hiện tại chỉ là 4 box (Capture/Orchestrate/Convert/Operate). Phải show 3 agent classes (Search, Revenue Ops, Care/Status) + handoff contract như `prd.md:325-345`.
6. **[B] Thiếu "live evidence ticker"** — judge cần thấy real booking count, real Telegram msg count tăng live trong demo. Có thể đọc từ `conversation_events` table.
7. **[C] Thiếu comparable/competitor slide** — chưa reference Calendly ($3B), Booksy ($1B raise 2024), Trafft, GoHighLevel ($XB ARR), ManyChat. Vị thế "Calendly + Intercom + Stripe Billing for service SMEs".
8. **[C] Thiếu "why now"** — không nói tại sao 2026 (LLM cost giảm, WhatsApp Business adoption, Telegram bot maturity, AU consumer messaging shift).
9. **[B] Demo có 1 vertical (chess) nhưng pitch claim "service SMEs"** — cần chứng minh template-able. `prd.md:642-668` nói chess = first vertical template, Future Swim coming; cần show preview của 2nd template.
10. **[C] Monetization tier không rõ commission %** — `PitchDeckApp.tsx:122-137` Pro Max = "Custom"; cần concrete % (xem mục 5).
11. **[B] Audit ledger không được pitch** — backend có `job_runs`, `action_runs`, `messaging_channel_sessions` nhưng pitch không mention compliance/enterprise readiness story.
12. **[C] Team slide không có moat-aligned credentials** — `PitchDeckApp.tsx:1207-1275` show team nhưng không tie tới "why us specifically can build operating layer for AU service SMEs".

---

## 4. Defensibility Narrative (200 từ — paste-ready cho slide)

> **Why BookedAI is not roadkill for OpenAI or Google.**
>
> OpenAI sells general intelligence. Google sells distribution. BookedAI sells **booked revenue truth** for a vertical neither of them will own end-to-end. Three moats compound as we scale: **(1) Data moat — the booking ledger.** Every customer turn becomes a structured event in our tenant-scoped `conversation_events`, `action_runs`, and `job_runs` tables. After 12 months of operation across 1,000 tenants, this is the only dataset in Australia that links acquisition channel → qualified intent → booking reference → payment posture → retention action with provider-grade audit trail. No general-purpose LLM has access to this. **(2) Distribution moat — the omnichannel agent layer.** BookedAI Manager Bot already operates on Telegram, WhatsApp, web chat, email, and embed widget through one shared `messaging_automation_service`. Each channel adds a switching cost the SME does not want to re-wire. **(3) Workflow lock-in — operations truth.** Tenants run their daily revenue-ops queue, billing reminders, and customer-care replies inside the BookedAI Ops surface. Replacing us means replacing the system of record, not a chat widget. Foundation models become commoditized inputs to our orchestration layer; the moat lives in the audited, multi-tenant, channel-multiplied workflow our customers operate inside every day.

---

## 5. Monetization Clarity Rewrite — 3 tiers tied to "AI Revenue Engine"

| Tier | Target SME | Setup fee (one-time) | SaaS (monthly) | Commission on BookedAI-attributed booked revenue | What "Revenue Engine" means here |
|---|---|---|---|---|---|
| **Starter Engine** | Solo / micro (1-3 staff: solo coach, single tradie, 1-room clinic) | $0 (self-serve) | $79/mo | 0% (pure SaaS at this tier) | 1 channel (Telegram OR web widget), 1 service catalog, BookedAI Manager Bot, portal, payment QR, email confirmations, 50 booked/mo cap. |
| **Growth Engine** ⭐ Most popular | Established SME (4-25 staff: salon, clinic, swim school, tutoring center) | $499 onboarding (catalog import + brand + channel wiring) | $249/mo | **3% commission** on net booked revenue captured/recovered through BookedAI | All 3 channels (Telegram + WhatsApp + embed widget), revenue-ops agent queue, customer-care agent, audit ledger, Stripe billing, CRM sync, monthly tenant revenue summary email. |
| **Enterprise Engine** | Multi-location / franchise / academy / vertical platform (25+ staff or 3+ locations) | $2,500-$10,000 (custom rollout, vertical template config, SSO) | $999+/mo | **5% commission** on attributable booked revenue, with floor + cap negotiated per contract | Multi-tenant template, dedicated onboarding, admin reliability lane, white-label widget, webhook + API access, retention/churn-rescue automation, SLA, named CSM. |

Logic: setup fee covers human rollout (CAC offset). SaaS keeps the lights on regardless of bookings (predictable ARR). Commission aligns BookedAI economics to actual revenue won — the "Revenue Engine" name only stands up if we get paid more when the SME makes more.

Pitch one-liner: *"We're free at the bottom, premium at the top, and aligned in the middle."*

---

## 6. Roadmap Visualization Gaps

Hiện trạng `https://bookedai.au/roadmap` (RoadmapApp `frontend/src/apps/public/RoadmapApp.tsx:107-136`):

- **Show gì**: 2 SVG (`pre-golive-2026-04-11-to-04-30.svg`, `master-roadmap-2026-04-11-to-06-07.svg`), tenant case roster (chess/swim/AI Mentor), milestone calendar M-01..M-11, channel scope CR-010, deeper Phase/Sprint detail pages.
- **Phase 17-23 mapping**: Có đủ trong `data.ts:1333-1430` (7 phases). Mỗi phase có name, focusLabel, milestoneLabel, summary, tasks.

Đánh giá investor-readability: **6/10**.

Gap cụ thể:

1. **Quá engineering-flavored** — H1 "Sprint to Go-Live", "Phase 0 to GO-LIVE LOCK in 20 days" → đọc như Jira board, không như product narrative. Investor muốn thấy "Q2 2026: 3 verticals live → Q3: 50 tenants → Q4: $XXk MRR".
2. **SVG static khó scan** — không có legend gắn vào revenue outcome. Cần overlay "Phase 17 = stabilize", "Phase 18-19 = unlock retention revenue", "Phase 20 = unlock distribution (widget)", "Phase 21 = unlock commission revenue", "Phase 22 = unlock multi-tenant scale".
3. **Không có revenue/customer count milestone** — chỉ là feature milestone. Thêm M-XX "First $10k MRR", M-XX "First 10 paying tenants".
4. **CR-010 channel scope nằm dưới fold** (`RoadmapApp.tsx:293`) — đáng ra phải gần top vì đó là moat story (omnichannel agent layer).
5. **Không có "after Phase 23"** — investor hỏi "what's next?" Cần horizon slide: native mobile (currently deferred per `README.md:37`), iMessage M-10, vertical expansion roadmap.
6. **Phase detail pages** (`/roadmap/phase/<slug>`) tồn tại nhưng không link rõ từ pitch deck — nên thêm anchor từ `PitchDeckApp.tsx` master roadmap section.

Đề xuất: chia roadmap thành 2 view — `/roadmap?view=engineering` (current) và `/roadmap?view=investor` (revenue/customer milestones overlay).

---

## 7. Top 5 Investor Risk Questions + Draft Answers (EN)

1. **Q: "Why won't OpenAI or Google build this in 6 months?"**
   A: They sell horizontal intelligence; we sell vertical operating truth. Our `conversation_events` + `action_runs` + `job_runs` ledger across multi-tenant booking + payment + care, with channel-multiplied distribution (Telegram, WhatsApp, embed) is a workflow moat — not a model moat. Foundation models commoditize as inputs to our system, not replacements.

2. **Q: "What's your actual ARR / pipeline today?"**
   A: We are pre-revenue, currently in **3-tenant proof phase** (Co Mai Hung Chess Academy, Future Swim, AI Mentor 1-1) with go-live LOCK on 2026-04-30 (M-02 in `data.ts:1638`). Target: 10 paying tenants by M-05 (2026-05-24, "Tenant revenue proof + billing truth"), $10k MRR by Q3 2026.

3. **Q: "Why service SMEs and why Australia first?"**
   A: AU has ~600k service SMEs, English-first, high WhatsApp/Telegram adoption, mature Stripe + Zoho ecosystem, and a fragmented incumbent landscape (no Booksy / GoHighLevel dominant local player). We can prove the operating layer here, then export to UK/SG/NZ on the same English-language playbook before US scale.

4. **Q: "What stops a tenant from churning to a cheaper booking widget?"**
   A: Switching cost compounds across 4 layers: (1) historical conversation/booking ledger, (2) customer-care continuity on phone-number + booking-reference identity, (3) connected revenue-ops automation (Stripe, CRM, email), (4) staff trained on the Ops queue. A booking widget replaces step 1 of 7 in our flow (`prd.md:107-114`).

5. **Q: "How do you compete with vertical SaaS like Booksy ($1B), Mindbody, Vagaro?"**
   A: Those are appointment-management tools that bolted on messaging. We start as the AI agent layer with appointment management as one workflow output. The wedge is *missed-enquiry recovery* — leakage they don't measure or own. We can integrate with their booking core where we encounter them, then convert from inside.

---

## 8. Appendix

### A1. Key file paths referenced

- Hero / pitch: `/home/dovanlong/BookedAI/frontend/src/apps/public/PitchDeckApp.tsx`
- Roadmap surface: `/home/dovanlong/BookedAI/frontend/src/apps/public/RoadmapApp.tsx`
- Roadmap data (Phase 17-23, milestones, tenant cases): `/home/dovanlong/BookedAI/frontend/src/components/landing/data.ts:1333-1648`
- Pricing data current: `/home/dovanlong/BookedAI/frontend/src/components/landing/data.ts:585-602`
- Metrics array (vanity): `/home/dovanlong/BookedAI/frontend/src/components/landing/data.ts:579-583`
- Architecture SVG (in-pitch): `/home/dovanlong/BookedAI/frontend/src/apps/public/PitchDeckApp.tsx:233-312`
- Master roadmap SVG: `/home/dovanlong/BookedAI/frontend/public/roadmap/master-roadmap-2026-04-11-to-06-07.svg`
- Pre-golive SVG: `/home/dovanlong/BookedAI/frontend/public/roadmap/pre-golive-2026-04-11-to-04-30.svg`
- Admin pending handoffs UI: `/home/dovanlong/BookedAI/frontend/src/features/admin/pending-handoffs-section.tsx`
- Admin handoff types/api: `/home/dovanlong/BookedAI/frontend/src/features/admin/api.ts:209-231`, `types.ts:180-198`
- Tenant Ops action_runs: `/home/dovanlong/BookedAI/frontend/src/apps/tenant/TenantApp.tsx:1303,2776`
- Backend handoff route: `/home/dovanlong/BookedAI/backend/api/v1_academy_routes.py:28`
- Messaging Automation Service: `/home/dovanlong/BookedAI/backend/service_layer/messaging_automation_service.py`
- Job runs repo: `/home/dovanlong/BookedAI/backend/repositories/job_run_repository.py`
- PRD agent system definition: `/home/dovanlong/BookedAI/prd.md:272-345`
- README live tenant proof: `/home/dovanlong/BookedAI/README.md:165-181`

### A2. Suggested headline rewrites (paste-ready EN)

Current pitch H1 (`PitchDeckApp.tsx:718-720`):
> "Convert service enquiries into confirmed bookings, follow-up, and revenue visibility."

Investor variant (C):
> "The AI Revenue Engine for service businesses. Every enquiry tracked. Every booking auditable. Every channel — Telegram, WhatsApp, web, widget — routed by one agent layer."

Hackathon variant (B):
> "A multi-agent revenue operating system for service SMEs — live on Telegram, web, and embed widget, with auditable booking, payment, and customer-care ledger."

Sub-line (both):
> "Built on a 3-agent architecture: Search & Conversation, Revenue Operations, and Customer Care & Status. Backed by tenant-scoped conversation, action, and job-run ledgers."

### A3. New "wow metrics" to put in `data.ts:579-583` (replace vanity)

Replace `+35% / 24/7 / 0` with grounded numbers (after first 2 weeks live):

```ts
export const metrics: Metric[] = [
  { value: '3', label: 'Live Tenants' },         // chess + swim + AI mentor (data.ts:1618)
  { value: '5', label: 'Channels Wired' },       // telegram, whatsapp, web, embed, email
  { value: '<30s', label: 'Booking → Ledger' }, // e2e from telegram book to admin handoff visible
];
```

After 30+ paying tenants, swap to `MRR / Tenants / Bookings/mo` triplet.

### A4. Minimum slide additions to ship pre-WSTI (Phase 23 closeout)

1. Slide: "Why now" (LLM cost curve + AU messaging adoption + service SME software gap).
2. Slide: "Market size" (AU SAM $2.9B → global $30B+).
3. Slide: "Competitive map" (axis: vertical depth × AI-native × multi-channel; place us upper-right).
4. Slide: "Defensibility" (use mục 4 narrative).
5. Slide: "Unit economics" (CAC target $400, LTV target $6k, gross margin 75%, payback 6mo).
6. Slide: "Live evidence" (screenshot stack: Telegram → admin handoff → tenant Ops ledger).
7. Slide: "Roadmap → revenue milestones" (M-04 first paying tenant, M-05 first $5k MRR, M-08 multi-tenant template GA).

### A5. Demo failure-mode checklist (run T-30 min before pitch)

- [ ] `https://api.bookedai.au/api/health` → `{"status":"ok"}`
- [ ] `https://product.bookedai.au/` loads + chess search returns verified-tenant card
- [ ] `@BookedAI_Manager_Bot` responds to `/start` from demo Telegram account within 5s
- [ ] `https://admin.bookedai.au/` Pending Handoffs section reachable (AdminApp Reliability lane)
- [ ] `https://tenant.bookedai.au/future-swim` Ops tab loads action_runs without console error
- [ ] `https://pitch.bookedai.au/#roadmap-execution` master SVG renders
- [ ] `frontend/scripts/serve_dist_spa.mjs` ready as offline backup
- [ ] Pre-recorded 60-sec video of full flow staged in browser tab as ultimate fallback
