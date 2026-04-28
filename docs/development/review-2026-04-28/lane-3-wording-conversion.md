# Lane 3 — Wording, Messaging & Conversion Audit (2026-04-28)

Phạm vi: bookedai.au homepage, demo, tenant gateway, portal, pitch app. READ-ONLY.

---

## 1. Verdict per audience

| Audience | Score | Lý do (1 câu) |
|---|---|---|
| **A — SME owner** | **6.0/10** | CTA "Try BookedAI Free" và body hero còn nói "responsive web app" + "intent qualification" thay vì hứa $/booked, owner không thấy ngay tiền. |
| **B — WSTI judge** | **5.5/10** | Có signal "Live API-backed booking" và "audit ledger" rải rác, nhưng homepage không bật rõ multi-agent layer + audit ledger trong viewport đầu, judge phải scroll để hiểu. |
| **C — Big Tech / VC** | **4.5/10** | Hero nói "AI Revenue Engine" nhưng bằng chứng moat (omnichannel agent layer, action ledger, tenant template) bị đẩy xuống PitchDeckApp/ArchitectureApp; trang chính nghe vẫn như booking widget cao cấp, không có TAM/ARR/distribution wedge. |

---

## 2. Top 12 copy issues

| # | Surface | File:line | Current copy (≤60 chars) | Vấn đề | Aud | Đề xuất rewrite (≤80 chars) |
|---|---|---|---|---|---|---|
| 1 | Homepage hero CTA | `frontend/src/components/landing/data.ts:403` | `Try BookedAI Free` | Generic SaaS CTA, không revenue-focused | A,C | `See bookings BookedAI is winning live` |
| 2 | Homepage hero secondary | `frontend/src/components/landing/data.ts:404` | `Schedule a Consultation` | Cold sales tone, không SME-friendly | A | `Book a 10-min revenue demo` |
| 3 | Hero title (variant) | `frontend/src/apps/public/PublicApp.tsx:223,231` | `Turn more website visitors, calls, and...` | Cả 2 variant A/B giống hệt nhau, "Turn more" yếu hơn brand promise | A,C | `Never miss a paying enquiry again.` |
| 4 | Hero CTA | `frontend/src/apps/public/PublicApp.tsx:226,234` | `Start in product` | Không truyền đạt giá trị, nghe như "open app" | A | `Try the live revenue engine` |
| 5 | Hero body | `frontend/src/components/landing/data.ts:399-401` | `BookedAI turns every customer message ...` | Hai câu dài 60+ từ, nhồi WhatsApp/SMS/Telegram/email/web — pha loãng promise | A,C | `Capture every chat, call, and missed enquiry — and book it before the lead cools.` |
| 6 | Hero eyebrow VI vs EN | `frontend/src/apps/public/homepageContent.ts:121,191` | `Homepage hiện là landing page chính...` | Tiếng Việt code-switching ("revenue flow", "entry surface", "best-fit match") rất chợ-IT | C (nếu VC xem locale=vi) | Viết VI sạch hoặc bỏ menuSections.vi và tái dùng EN |
| 7 | Search button (VI) | `frontend/src/apps/public/homepageContent.ts:192` | `Try Now` | Bỏ tiếng Việt khi cả page đang VI — drift | A | `Tìm và đặt ngay` |
| 8 | Demo header subtitle | `frontend/src/apps/public/demo/DemoHeader.tsx:35` | `Grandmaster Chess live revenue engine` | Tốt nhưng sub-line không nói "real bookings, real Stripe" | B,C | `Real tenant • live Stripe • full AI flow` |
| 9 | Demo H1 | `frontend/src/apps/public/demo/DemoChatStage.tsx:88-89` | `Place the right student, then book the class.` | Quá hẹp về chess; judge nghĩ chỉ là 1 demo vertical | B,C | `Watch BookedAI place, book, pay, and follow up — live.` |
| 10 | Pricing headline | `frontend/src/components/landing/sections/PricingSection.tsx:397-399` | `Commercial packaging that feels easier...` | Meta-copy về copy ("packaging", "feels easier to approve"), không bán giá trị | A,C | `Pay only when BookedAI books real revenue.` |
| 11 | Tenant gateway H1 | `frontend/src/apps/tenant/TenantApp.tsx:2980,2985` | `Turn missed enquiries into bookings...` | Tốt nhưng dài; chips bên dưới không show số tenant active | A | `Run every booking and follow-up from one workspace.` |
| 12 | Portal lookup H1 | `frontend/src/apps/portal/PortalApp.tsx:893-895` | `Review your booking and request changes...` | Functional, không nhân-văn cho returning customer | A | `Your booking, in one place. Manage, pay, or reschedule.` |

Bonus issues (xem Appendix): "Open Product Demo" / "Claim Free Setup" header CTA (`Header.tsx:109-110`) lệch tone với hero CTA "Try BookedAI Free"; ProblemSection title `SMEs lose revenue in the first 60 seconds.` mạnh nhưng bị chôn dưới 3 sections trên homepage.

---

## 3. Hero rewrite proposals (3 variants A/B/C)

### Variant A — SME owner first ("money & sleep")
- **H1:** `Never miss a paying enquiry again.`
- **Sub:** `BookedAI answers every chat, call, SMS, and DM in seconds — books the customer, takes the deposit, and follows up so your team can actually close out the day.`
- **Primary CTA:** `See it book a real customer →`
- **Secondary CTA:** `Talk to a BookedAI human (10 min)`

### Variant B — WSTI judge ("live full-flow + show your work")
- **H1:** `One AI agent layer. Every channel. Every booking. Audited.`
- **Sub:** `BookedAI runs a live multi-agent stack — intake, ranking, booking, payment, care — across web, WhatsApp, Telegram, SMS, and email, with an action ledger you can inspect.`
- **Primary CTA:** `Run the live demo (60 sec)`
- **Secondary CTA:** `Open the audit ledger`

### Variant C — Big Tech / VC ("agent-layer thesis")
- **H1:** `The revenue OS for the next 30M service businesses.`
- **Sub:** `BookedAI is an omnichannel agent layer that captures intent, books the customer, takes payment, and proves the revenue — turning fragmented service commerce into one auditable operating system.`
- **Primary CTA:** `See live tenant proof →`
- **Secondary CTA:** `Read the investor pitch`

Đề xuất: mở A/B/C rotation thay vì variant A và B identical như hiện tại (`PublicApp.tsx:220-236`).

---

## 4. CTA inventory + rewrites

| Surface | Hiện tại (file) | Vấn đề | Đề xuất |
|---|---|---|---|
| Homepage hero primary | `Try BookedAI Free` (`data.ts:403`) | Generic | `See bookings BookedAI is winning live` |
| Homepage hero secondary | `Schedule a Consultation` (`data.ts:404`) | Cold-sale | `Book a 10-min revenue demo` |
| Homepage CTA section primary | `Try BookedAI Free` (`data.ts:608`) | Lặp y hệt hero | `Start capturing missed bookings →` |
| Homepage CTA section secondary | `Schedule a Consultation` (`data.ts:609`) | Lặp | `Talk to a BookedAI human` |
| Pricing primary | `Try BookedAI Free` (`data.ts:600`) | Lặp lần thứ 3 | `Start free — pay only on booked revenue` |
| OfferStrip primary | `Start Free Trial` (`OfferStripSection.tsx:47`) | Generic | `Start your 30-day revenue trial` |
| Header trial | `Claim Free Setup` (`Header.tsx:110`) | Tone giảm giá, không khớp brand premium | `Get free setup (limited)` |
| Header demo | `Open Product Demo` (`Header.tsx:109`) | Functional | `Watch live demo` |
| PublicApp variant primary | `Start in product` (`PublicApp.tsx:226`) | Mơ hồ | `Try the live revenue engine` |
| PublicApp variant secondary | `See how it works` (`PublicApp.tsx:227`) | Ổn nhưng yếu | `Show me a real booking` |
| Public header | `Investor pitch` (`PublicApp.tsx:329`) | Tốt cho C, không phù hợp A | Tách: `For investors` (small), `For owners` (big) |
| Portal lookup | `Review booking` (`PortalApp.tsx:935`) | Chuẩn | giữ |
| Pitch deck Freemium | `Get started free` (`PitchDeckApp.tsx:107`) | Generic | `Test BookedAI on 1 channel — free` |
| Demo composer | `Run flow` (`DemoChatStage.tsx:137`) | Quá lab-tone, không "book" | `Find & book →` |

---

## 5. Naming/identity hygiene checklist

| Item | Status | File evidence |
|---|---|---|
| Brand spelling unified `BookedAI` (one word, capital B/A/I) | OK across UI strings | `data.ts:351` |
| Domain label `bookedai.au` lowercase consistent | OK | `data.ts:352` |
| Customer chat agent name `BookedAI Manager Bot` | Used in Telegram links only, NOT exposed in homepage chat UI | `HomepageSearchExperience.tsx:1193,1203` vs no UI label |
| Avatar/badge in chat says only `AI` | Should say `BookedAI Manager Bot` or `BookedAI` | `HeroSection.tsx:268-270`, `HomepageSearchExperience.tsx:3535 ("BookedAI answer")` — inconsistent |
| Brand descriptor `AI Revenue Engine for Service Businesses` | Used as eyebrow/subtitle | `data.ts:353`, `PublicApp.tsx:33` |
| Support email `info@bookedai.au` | Consistent | `data.ts:371`, README |
| Support phone `+61455301335` | Consistent except portal whitespace | `TenantApp.tsx:3039` shows `+61 455 301 335` (with spaces) — unify formatting |
| Homepage variant copy A/B identical | **DRIFT** — both branches show same copy | `PublicApp.tsx:220-236` |
| EN/VI mixing in VI locale | **DRIFT** — VI strings keep `revenue flow`, `entry surface`, `Try Now` | `homepageContent.ts:121-150,192` |
| Demo subtitle says "Grandmaster Chess live revenue engine" but DemoLandingApp brand is `BookedAI` | OK | `DemoHeader.tsx:35` |
| Pitch deck `Pro Max` vs Pricing `Pro Max` | Consistent | `PitchDeckApp.tsx:124`, `PricingSection.tsx:611` |

---

## 6. Appendix — chi tiết findings

### 6.1 Hero (file: `data.ts:395-407`)
- Eyebrow `AI Revenue Engine for service businesses` — đúng thesis, giữ.
- Title `Never lose a service enquiry again.` — đây là dòng MẠNH NHẤT trong toàn bộ homepage; ironic là CTAs xung quanh nó lại pha loãng (Generic "Try BookedAI Free"). Khuyến nghị: giữ title, đổi CTA primary để khớp.
- Body lead nhồi WhatsApp/SMS/Telegram/email/web chat — gây "feature dump" trong viewport đầu. Kéo channels list xuống section "Channels" thay vì hero.

### 6.2 Tagline drift trong VI locale (`homepageContent.ts`)
Line 192 `searchButton: 'Try Now'` (English giữa block VI). Line 193 `revenueTagline: 'AI revenue engine for service businesses'` (English, không dịch). Decision: hoặc dịch hết, hoặc bỏ VI locale vì hiện chất lượng VI là code-switch không chuyên nghiệp; với judge VC xem trang VI đây là minus.

### 6.3 "Show your work" — đã có nhưng chưa đủ judge-grade
Đã có:
- `SEARCH_PROGRESS_STAGES` (`HomepageSearchExperience.tsx:193-210`) hiển thị 4 stage Reading → Finding → Showing → Checking — TỐT cho audience B (judge).
- Demo có flow rail `Search · assess · place · book` (`DemoChatStage.tsx:145`).
Thiếu cho B/C:
- Không có badge "Audit ledger entry created" sau mỗi action — judge muốn thấy ledger tick visually.
- Không có "Agent: matching | Agent: booking | Agent: care" labels chia rõ multi-agent layer (chỉ "BookedAI answer" — mono-agent feel).

### 6.4 Trust signals — yếu cho A và C
- Real tenant: Co Mai Hung Chess được mention trong `PublicApp.tsx:139,417`. Tốt.
- KHÔNG có booking count thực ("X bookings completed", "$Y revenue captured this week") — đây là metric quan trọng nhất cho cả A (đáng tin) và C (traction).
- `metrics` (`data.ts:579-583`): `+35% More Bookings`, `24/7 Reception`, `0 Cold Leads` — quá generic, có thể là mock; SME tinh ý sẽ nhận ra. Khuyến nghị thay bằng số thật từ tenant pilot.
- TrustSection (`TrustSection.tsx:13-18`): copy meta ("Give buyers and investors enough proof"), tone tự thuyết phục — đổi thành proof concrete (logo wall, screenshot booking, Stripe receipt thumbnail).

### 6.5 Empty / loading / error states
- Portal idle empty (`PortalApp.tsx:953-959`): "Look up an existing booking reference" — chuẩn.
- Portal error recoverable (`PortalApp.tsx:984`): `Your booking reference is saved` — friendly, OK.
- HomepageSearchExperience no-match (`homepageContent.ts:355-356`): `Let's refine your request` — TỐT.
- `BOOKING_EMPTY_STEPS` (`HomepageSearchExperience.tsx:218-222`): chuẩn cho UX.
- Loading state demo: `Finding...` (`DemoChatStage.tsx:137`) — generic, có thể nâng thành `Searching live tenants…` để show your work.

### 6.6 Audience mismatch
- PricingSection trộn "feels easier to approve" + "more serious to scale" + jargon "predictable monthly layer" — tone hỗn loạn giữa SME, sales, và VC trong cùng 1 section.
- Hero cards `Strategic framing / Decision-ready ranking / Enterprise-style booking continuity` (`HeroSection.tsx:198-202`) — language quá enterprise cho SME, và quá vague cho VC.
- `Startup-grade rollout` pill trong Header (`Header.tsx:401`) — meaningless cho mọi audience, xóa hoặc đổi `Live in production`.

### 6.7 Mismatched primary CTA repeated 4× across sections
`Try BookedAI Free` xuất hiện 3 lần trong `data.ts` (403, 600, 608) + `Start Free Trial` trong OfferStrip + `Start in product` trong PublicApp + `Claim Free Setup` trong Header. SME owner sẽ confused: trial nào? free setup nào? Khuyến nghị: 1 primary CTA verb thống nhất + section variant nhỏ ("Start free", "See live demo", "Talk to founder").

### 6.8 Bot/agent identity inconsistency
- Telegram start link gọi bot `@BookedAI_Manager_Bot` (`HomepageSearchExperience.tsx:1193`).
- Chat avatar trong hero hiển thị `AI` (`HeroSection.tsx:269`).
- Chat reply badge `BookedAI answer` (`HomepageSearchExperience.tsx:3535`).
- Demo chip `AI intake` (`DemoChatStage.tsx:86`).
→ Người dùng không biết agent tên gì. Đề xuất: dùng nhất quán `BookedAI Manager Bot` hoặc rút ngắn `Manager Bot` ở mọi UI surface để build nhân-vật.

### 6.9 Missing audit/ledger surfacing for judges
Audit ledger có trong backend (`docs/development/...action-ledger`), `ArchitectureApp.tsx` mention, nhưng homepage-level không cho judge xem live ledger entries. Đề xuất tile mới phía dưới hero (variant B/C): "Audit ledger — last 5 actions" với action_type, tenant, status — judge sẽ tin ngay.

### 6.10 Quick wins (nếu chỉ làm 5 thay đổi trong tuần)
1. Đổi 3 occurrence `Try BookedAI Free` → 3 verb riêng (`See live bookings`, `Start free trial`, `Pay only on booked revenue`).
2. Đổi avatar `AI` thành `BookedAI` lockup nhỏ trong mọi chat bubble.
3. Thêm Hero proof tile: `Last booking captured: 3 mins ago • Co Mai Hung Chess • A$45 paid via Stripe` (live data từ tenant ledger).
4. Sửa A/B variant identical bug trong `PublicApp.tsx:220-236` để A/B test thực sự khác.
5. Audit ledger micro-widget bên dưới fold → judge B/C hài lòng trong < 5 phút.

---

DONE: /home/dovanlong/BookedAI/docs/development/review-2026-04-28/lane-3-wording-conversion.md
