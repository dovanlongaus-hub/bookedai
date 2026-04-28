# BookedAI — Master Review Report (2026-04-28)

> Tổng hợp đồng bộ từ 7 lane review song song. Đầu mỗi finding có gắn audience tag:
> **A** = SME service-business owner · **B** = WSTI hackathon judge · **C** = Big Tech / VC investor.
>
> Mọi reference path là tuyệt đối từ repo root. Chi tiết bằng chứng nằm trong file lane tương ứng — master này chỉ là decision layer.

| Lane | Báo cáo chi tiết |
|---|---|
| 1 | [lane-1-code-architecture.md](lane-1-code-architecture.md) |
| 2 | [lane-2-ux-ui-design-system.md](lane-2-ux-ui-design-system.md) |
| 3 | [lane-3-wording-conversion.md](lane-3-wording-conversion.md) |
| 4 | [lane-4-qa-test-plan.md](lane-4-qa-test-plan.md) |
| 5 | [lane-5-investor-hackathon-narrative.md](lane-5-investor-hackathon-narrative.md) |
| 6 | [lane-6-security-reliability.md](lane-6-security-reliability.md) |
| 7 | [lane-7-ai-startup-trends.md](lane-7-ai-startup-trends.md) |

---

## 1. Executive scorecard (per audience)

| Audience | Pitch readiness | Lý do (1 dòng) | Điểm chặn lớn nhất |
|---|---|---|---|
| **A — SME owner** | **6.0/10** | Promise tốt ("Never miss a paying enquiry") nhưng auth wall trước magic moment + CTA generic + thiếu live booking proof | Thiếu sandbox + CTA "Try Free" lặp 3 lần |
| **B — WSTI judge** | **5.5/10** | Full-flow chess + Telegram thật chạy được, nhưng audit ledger không xuất hiện live trên homepage để judge "wow" trong 5 phút | Agent Activity Drawer + admin handoff WOW chưa wired vào homepage |
| **C — VC unicorn** | **4.5/10** | Vẫn nghe như "premium booking widget" cao cấp — thiếu TAM, defensibility, unit economics, agent-layer story trực quan | 3 vanity metrics + token drift Apple system + Stripe webhook missing |

**Trung bình**: 5.3/10 — sản phẩm đã có core thật (Telegram bot live, chess tenant active, admin handoffs UI, ledger schema), nhưng narrative + UX + security chưa tới ngưỡng "operating-layer unicorn".

---

## 2. P0 backlog — phải fix tuần này (block hackathon + investor)

> Mỗi P0 = nếu để nguyên sẽ break demo hoặc fail due-dilly. Đã sắp xếp theo dependency.

| # | Vấn đề | Lane | File:line gốc | Audience | Effort |
|---|---|---|---|---|---|
| **P0-1** | **Stripe webhook không tồn tại** — checkout session tạo nhưng không có endpoint reconcile `checkout.session.completed`; payment status stuck "pending" mãi mãi. Sẽ lộ ngay khi judge/investor click qua portal. | 6 | `backend/api/route_handlers.py:1763-1837` (no `/webhooks/stripe` route) | A,B,C | M |
| **P0-2** | **Tenant cross-write qua empty `actor_context`** — `/api/v1/leads`, `/api/v1/bookings/intents`, `/api/v1/payments/intents` fallback `get_default_tenant_id()` khi không auth → unauth caller bơm dữ liệu giả vào tenant mặc định. Investor sẽ flag ngay trong code review. | 6 | `backend/api/v1_routes.py:1213-1241` | A,B,C | S |
| **P0-3** | **Portal `booking_reference` chỉ 32-40 bit entropy + endpoint mở public** — brute-force ~16M-1T combos để view PII / cancel booking khách khác. | 6 | `backend/services.py:2712`, `backend/api/v1_tenant_routes.py:42-47` | A,B,C | M |
| **P0-4** | **Design system 3 file token tự mâu thuẫn** — `--apple-blue` vừa `#4f8cff` vừa `#0071e3`; DM Sans + Space Grotesk vẫn nằm trong `@theme` dù memory ghi REMOVED; body có gradient. Mọi nỗ lực sửa surface khác đều tạm thời cho đến khi 3 file token sạch. | 2 | `frontend/src/theme/minimal-bento-template.css:13-22, 127-130`, `frontend/src/styles.css:61-66, 124-128, 452-460` | A,B,C | S |
| **P0-5** | **A/B variant homepage hero giống hệt nhau** — A/B test bị hỏng silently, hero copy yếu hơn brand promise. | 3 | `frontend/src/apps/public/PublicApp.tsx:220-236` | A,C | XS |
| **P0-6** | **CTA "Try BookedAI Free" lặp 3 lần** + "Schedule a Consultation" cold-tone — pha loãng "AI Revenue Engine" thesis ngay viewport đầu. | 3 | `frontend/src/components/landing/data.ts:403-404, 600, 608-609` | A,C | XS |
| **P0-7** | **3 vanity metrics `+35% / 24/7 / 0`** — investor recognise filler ngay; SME tinh ý cũng ngờ. | 3,5 | `frontend/src/components/landing/data.ts:579-583` | A,C | S |
| **P0-8** | **50 `@router.<method>` dead decorations** trong v1_routes.py không bao giờ mount — contributor sửa nhầm route mà prod không chạy. | 1 | `backend/api/v1_routes.py:1992-5682` | A,B | S |
| **P0-9** | **Demo flow không surface audit ledger live trên homepage** — judge B/C cần thấy real `conversation_events` tick visually trong < 5 phút (đây là key differentiator vs booking widget). | 3,5,7 | `frontend/src/components/landing/sections/TrustSection.tsx`, `frontend/src/apps/public/HomepageSearchExperience.tsx` | B,C | M |

**Tổng effort P0**: ~10–12 ngày dev nếu 2 người chạy song song.

---

## 3. P1 backlog — ship trước WSTI (2 tuần)

### 3a. Content & wording (Lane 3, 5)
| # | Việc | File | Audience |
|---|---|---|---|
| P1-C1 | 3 hero rewrite per audience (A/B/C variants thực sự khác — copy ready trong [Lane 3 §3](lane-3-wording-conversion.md)) | `PublicApp.tsx:220-236` | A,B,C |
| P1-C2 | Đổi avatar `AI` → `BookedAI` lockup nhỏ trong mọi chat bubble | `HeroSection.tsx:268-270`, `HomepageSearchExperience.tsx:3535` | A,B |
| P1-C3 | Hero proof tile live: `Last booking 3 mins ago • Co Mai Hung Chess • A$45 paid via Stripe` | new section cạnh hero | A,C |
| P1-C4 | VI locale dọn EN code-switching (`Try Now`, `revenue flow`, `entry surface`) hoặc bỏ VI nếu không có translator | `frontend/src/apps/public/homepageContent.ts:121-192` | C |
| P1-C5 | Pitch deck 7 slide bổ sung: Why now, TAM, Competitive map, Defensibility (200-từ paragraph có sẵn [Lane 5 §4](lane-5-investor-hackathon-narrative.md)), Unit economics, Live evidence stack, Revenue milestones | `frontend/src/apps/public/PitchDeckApp.tsx` | C |
| P1-C6 | Monetization 3-tier rewrite (Starter $79 / Growth $249 + 3% / Enterprise custom + 5%) — paste-ready trong [Lane 5 §5](lane-5-investor-hackathon-narrative.md) | `PitchDeckApp.tsx:95-137`, `pricing-shared.ts` | A,C |

### 3b. UI / Design system (Lane 2, 7)
| # | Việc | File | Audience |
|---|---|---|---|
| P1-U1 | 5 component consolidation: `<AppleCTA>`, `<AppShell>`, `<NeutralStatusPill>`, hợp nhất 3 booking dialog, `<KickerEyebrow>` (xem [Lane 2 §3](lane-2-ux-ui-design-system.md)) | `frontend/src/components/landing/ui/` | A,B,C |
| P1-U2 | Replace IBM blue `#0f62fe` toàn cục → `var(--apple-blue)` ở portal | `frontend/src/apps/portal/PortalApp.tsx:356, 369, 933` | A |
| P1-U3 | Demo neon palette `#20F6B3 / #00D1FF / #0B1324` → Apple dark mode + `--apple-blue` highlight | `frontend/src/apps/public/demo/Demo*.tsx` | A,C |
| P1-U4 | ChessGrandmasterApp rebuild khỏi tan/brown `font-serif` → Apple light/dark | `frontend/src/apps/public/ChessGrandmasterApp.tsx:455-631` | A,B |
| P1-U5 | A11y top 5: aria-label icon button portal (16 nút), focus-ring chuẩn, contrast `text-[#172033]/45` lên ≥0.62 | xem [Lane 2 §5](lane-2-ux-ui-design-system.md) | A,B,C |

### 3c. Trend / "show your work" (Lane 7)
| # | Việc | Component | Audience |
|---|---|---|---|
| P1-T1 | **Agent Activity Drawer** (Wow #3 — đọc từ `conversation_events`, mount homepage + product + portal) | new `frontend/src/shared/components/AgentActivityDrawer.tsx` + new `GET /api/v1/agent/activity` | C,A |
| P1-T2 | Slash commands trong composer: `/find /compare /book /quote /portal /help` | new `SlashCommandMenu.tsx`, wire vào `HomepageSearchExperience.tsx:4180-4250` | A,B |
| P1-T3 | Streaming result cards (SSE infra đã có, chỉ cần wire FE) | `HomepageSearchExperience.tsx` results panel + `backend/services.py:1985` | B,C |
| P1-T4 | Citation chips `[1][2]` trên reply bubble (data đã có: `source_label`, `source_url`) | chat bubble renderer | B,C |
| P1-T5 | Live revenue counter strip ("+1 booking · 7s ago · Inner West clinic") footer mọi public page | new `LiveBookingTicker.tsx` + `reporting_repository.py:80-110` | C |

### 3d. Security / reliability (Lane 6)
| # | Việc | File | Audience |
|---|---|---|---|
| P1-S1 | WhatsApp Meta `x-hub-signature-256` HMAC verify + thêm env `WHATSAPP_META_APP_SECRET` | `backend/api/route_handlers.py:2926-2945` | A,C |
| P1-S2 | Admin login: hash password (argon2/pbkdf2) + `hmac.compare_digest` + 2FA TOTP + rotate `ADMIN_PASSWORD` | `backend/api/route_handlers.py:3471` | A,C |
| P1-S3 | CORS tighten: bỏ localhost khỏi default prod, restrict methods/headers cụ thể | `backend/app.py:27-33`, `backend/core/config.py:253` | A,B |
| P1-S4 | Telegram operator host-shell default OFF | `.env.example:91`, `scripts/telegram_workspace_ops.py:84-86` | C |
| P1-S5 | Webhook tenant scope: resolve tenant per-message qua phone-number → tenant mapping, không dùng `get_default_tenant_id()` | `backend/api/route_handlers.py:946-1001` | A,C |

### 3e. QA test plan (Lane 4)
> Bộ Playwright + Pytest đầy đủ trong [Lane 4 §4-5](lane-4-qa-test-plan.md). Ưu tiên trước WSTI:
| # | Spec | Audience |
|---|---|---|
| P1-Q1 | `product-explicit-book-gate.spec.ts` — popup không auto-mở booking form trước Book | B |
| P1-Q2 | `portal-messaging-continuation.spec.ts` — Telegram + WhatsApp deep-link chứa booking ref | A,B |
| P1-Q3 | `homepage-stripe-return-portal-handoff.spec.ts` — phụ thuộc P0-1 | A,C |
| P1-Q4 | `admin-pending-handoffs-ui.spec.ts` — verify PR #14 | A |
| P1-Q5 | `pitch-architecture-viz.spec.ts` — investor demo readiness | C |
| P1-Q6 | Backend `test_messaging_automation_cross_channel_parity.py` | A |
| P1-Q7 | Backend `test_stripe_return_idempotent.py` (phụ thuộc P0-1) | A |
| P1-Q8 | Manual UAT 30-min script (xem [Lane 4 §6](lane-4-qa-test-plan.md)) — chạy 1 lần trước WSTI | B,C |

---

## 4. P2 backlog — sau WSTI, trước investor pitch chuyên sâu

| # | Việc | Lane | Audience |
|---|---|---|---|
| P2-1 | Mega-file refactor: `v1_routes.py` (5706 LOC), `route_handlers.py` (4761 LOC), `services.py` (3871 LOC), `messaging_automation_service.py` god-class 76 method | 1 | A,B |
| P2-2 | Tách `BookingAssistantDialog.tsx` (319 KB) thành step components + state machine | 1 | A,C |
| P2-3 | Magic-moment onboarding sandbox (`/sandbox` no-auth tenant) | 7 | A,C |
| P2-4 | Mobile bottom-sheet composer pattern (Granola/Linear style) | 7 | A,B |
| P2-5 | Pricing calculator + ROI estimator (slider × AOV → revenue leak) | 7 | A,C |
| P2-6 | Public `/docs`, `/changelog`, `/status` developer-grade trust signals | 7 | C |
| P2-7 | Cmd-K command palette across surfaces | 7 | A,C |
| P2-8 | `/roadmap?view=investor` — overlay revenue/customer milestones lên Phase 17-23 SVG | 5 | C |
| P2-9 | SSRF guard + PII purge job + Redis-backed rate limiter | 6 | A,C |
| P2-10 | AI guardrails: catalog summary sanitize, rate-limit inbound chat per chat_id, AI cost circuit breaker | 6 | C |
| P2-11 | Next.js stack ở root: rename `package.json:name` → `bookedai-next-experiment` + `EXPERIMENT.md` marker (giảm confusion cho judge đọc repo) | 1 | B |
| P2-12 | Frontend tenant test gap: catalog publish, billing checkout, team invite, plugin interface, integration toggle (mới chỉ có gateway test) | 1,4 | A |

---

## 5. Synchronized execution plan — 3 sprint, gắn Phase 17-23

| Sprint | Tuần | Mục tiêu (gắn phase) | Backlog items |
|---|---|---|---|
| **Sprint A — "Stop the bleed"** | tuần 1 (2026-04-28 → 05-04) | Phase 17 stabilization + security gate trước demo | P0-1, P0-2, P0-3, P0-4, P0-5, P0-6, P0-7, P0-8, P0-9 |
| **Sprint B — "Show your work"** | tuần 2-3 (2026-05-05 → 05-18) | Phase 19 customer-care agent + investor narrative ready | P1-C1..C6, P1-T1, P1-T2, P1-U1, P1-U5, P1-S1..S5, P1-Q1..Q8 |
| **Sprint C — "Modernize"** | tuần 4-6 (2026-05-19 → 06-07) | Phase 20-21 widget + billing truth + AI-startup polish | P1-T3, P1-T4, P1-T5, P1-U2, P1-U3, P1-U4, P2-3, P2-4, P2-5, P2-6, P2-7, P2-8 |

Sau Sprint C: P2-1, P2-2, P2-9..P2-12 ăn vào Phase 22-23 (template + release governance) — chuẩn investor pitch sâu (series A).

---

## 6. Quick wins làm ngay tuần này (effort ≤ 1 ngày mỗi cái)

> Có thể chạy song song với P0 chính, low-risk, high-signal.

1. **Xoá 50 dead `@router` trong v1_routes.py** (P0-8) — mechanical, có test cover.
2. **Xoá A/B variant identical bug** (P0-5) — 1 dòng JSX swap.
3. **Đổi 3 occurrence "Try BookedAI Free" → 3 verb riêng** (P0-6) — text-only.
4. **Đổi 3 vanity metrics → `3 Live Tenants / 5 Channels Wired / <30s Booking → Ledger`** (P0-7) — text-only, có data thật ([Lane 5 A3](lane-5-investor-hackathon-narrative.md)).
5. **Avatar `AI` → `BookedAI` lockup** (P1-C2) — 5 file replace.
6. **Telegram host-shell default off** (P1-S4) — 1 env line + 1 default const.
7. **Xoá `backend/tests/test_api_v1_routes.py` placeholder + `frontend/tmp-product-qa-check.js`** — 2 file deletion.
8. **Đổi `package.json:name` root → `bookedai-next-experiment` + `EXPERIMENT.md`** (P2-11) — 2 file change.
9. **Sửa wording demo H1**: `Place the right student, then book the class.` → `Watch BookedAI place, book, pay, and follow up — live.` ([Lane 3 #9](lane-3-wording-conversion.md)) — 1 file.
10. **Citation chips MVP**: render `[1][2]` cạnh result reference (data có sẵn) — 1 component.

→ 10 quick wins này = ~3-4 ngày dev cho 1 người, lift score audience B+C ngay khoảng +1.0 mỗi audience.

---

## 7. WSTI demo readiness checklist (T-30 min trước WSTI)

| ✓ | Item | File / nơi check |
|---|---|---|
| ☐ | `https://api.bookedai.au/api/health` → `{"status":"ok"}` | curl |
| ☐ | `https://product.bookedai.au/` chess search trả `Co Mai Hung Chess Class` verified-tenant | browser |
| ☐ | `@BookedAI_Manager_Bot` reply `/start` < 5s | Telegram |
| ☐ | `https://admin.bookedai.au/` Pending Handoffs section visible | browser |
| ☐ | `https://tenant.bookedai.au/future-swim` Ops tab loads action_runs | browser |
| ☐ | `https://pitch.bookedai.au/#roadmap-execution` master SVG renders | browser |
| ☐ | Pre-recorded 60-sec backup video staged in browser tab | tab |
| ☐ | `frontend/scripts/serve_dist_spa.mjs` ready as offline backup | local |
| ☐ | 5-min demo script ([Lane 5 §2](lane-5-investor-hackathon-narrative.md)) đã run dry 1 lần | manual |
| ☐ | Manual UAT 30-min ([Lane 4 §6](lane-4-qa-test-plan.md)) đã pass ≥ 13/15 step | operator |
| ☐ | Stripe test mode → portal handoff (P0-1 done) | manual |

---

## 8. Investor pitch readiness checklist (chạy trước mỗi VC meeting)

| ✓ | Item | Ghi chú |
|---|---|---|
| ☐ | Hero copy + CTA đã match audience C variant ([Lane 3 §3 Variant C](lane-3-wording-conversion.md)) | A/B router phân theo `?aud=vc` |
| ☐ | Defensibility 200-từ paragraph có trên slide ([Lane 5 §4](lane-5-investor-hackathon-narrative.md)) | paste-ready |
| ☐ | TAM / SAM / SOM slide có ($2.9B AU SAM → $30B global) | new slide |
| ☐ | Competitive map slide (Booksy / Calendly / GoHighLevel positioning) | new slide |
| ☐ | Unit economics slide (CAC $400, LTV $6k, 75% GM, 6mo payback) | new slide |
| ☐ | Live evidence stack screenshot: Telegram → admin handoff → tenant Ops ledger | new slide |
| ☐ | Roadmap revenue overlay (`/roadmap?view=investor`) | P2-8 |
| ☐ | Agent Activity Drawer (P1-T1) live trên homepage để VC mở thấy `conversation_events` thật | new component |
| ☐ | Vanity metrics đã thay bằng số thật (P0-7 done) | `data.ts:579-583` |
| ☐ | Stripe webhook (P0-1) + tenant isolation (P0-2) + portal token (P0-3) đã merge | code review |
| ☐ | 5 risk Q&A đã thuộc lòng ([Lane 5 §7](lane-5-investor-hackathon-narrative.md)) | rehearse |

---

## 9. Cross-lane convergences đáng chú ý

> Đây là chỗ 2+ lane nói cùng 1 vấn đề từ góc khác → high-signal, đáng fix sớm.

1. **`v1_routes.py` 5706 LOC** — Lane 1 nói là refactor debt; Lane 6 phát hiện chính file này chứa lỗ hổng tenant cross-write (`_resolve_tenant_id`). → Refactor + security fix làm cùng PR.
2. **Audit ledger** — Lane 3 nói missing trên homepage cho judge; Lane 5 nói missing trong pitch slide; Lane 7 nói missing là gap "show your work" lớn nhất. → P1-T1 (Agent Activity Drawer) trả lời cả 3 lane.
3. **Vanity metrics `+35% / 24/7 / 0`** — Lane 3 + Lane 5 + Lane 7 đều flag riêng. → P0-7 fix 1 lần thay 3 chỗ.
4. **Hero hiện tại** — Lane 2 nói gradient/font drift; Lane 3 nói copy yếu + A/B identical; Lane 7 nói hero nên show real composer thay vì static phone mockup. → Sprint A rewrite hero một lần ăn cả 3.
5. **Stripe webhook missing** — Lane 4 phát hiện qua test gap matrix (Confirm → Portal step ❌); Lane 6 phát hiện qua security audit. → P0-1 unblock Lane 4 spec P1-Q3 + Q7.
6. **Apple design system token drift** — Lane 2 phát hiện 3 file token tự mâu thuẫn. Đây là root cause của 833 hex inline + tone drift trên 5 surface. P0-4 fix gốc trước khi sửa surface.
7. **Frontend duplication Vite vs Next.js** — Lane 1 + Lane 5 (judge đọc repo confused) đều flag. → Quick win #8 giải tỏa.

---

## 10. Caveats / những gì review này KHÔNG cover

- **Không penetest** — Lane 6 chỉ inspect code, không gửi payload thực. P0-2/P0-3 cần verify trên staging với poc tool trước khi disclosure.
- **WebFetch bị deny trong Lane 7** — các URL reference là well-known public pages (Cursor, Granola, Linear, v0, Stripe...) nhưng chưa live-verify trong session này. Trước khi quote công khai cần re-verify bằng browser.
- **Memory file `project_design_system.md` đã 10 ngày tuổi** — đã verify lại bằng Lane 2 (DM Sans + Space Grotesk vẫn còn trong CSS), thực tế design system chưa "REMOVED" như memory ghi.
- **Live data flows (Stripe staging, WhatsApp Evolution session, real Telegram messages) chưa được test e2e** — chỉ design test plan ([Lane 4](lane-4-qa-test-plan.md)) chưa chạy.
- **Backend code coverage số thực chưa đo** — chỉ map file-level coverage.
- **Performance / load testing không trong scope** — investor sẽ hỏi "what about 1000 concurrent users" — chưa có dữ liệu.
- **Pricing/legal/compliance review không trong scope** — đặc biệt Privacy Act / GDPR cho PII raw payload (Lane 6 #10) cần lawyer.

---

## 11. Đề xuất bước tiếp theo

**Hôm nay** (2026-04-28):
- User chọn 3-5 P0 ưu tiên fix trước (đề xuất: P0-1, P0-2, P0-4, P0-5, P0-6).
- Ai cần coding spawn agent loại implement (không phải review-only) cho từng P0.

**Tuần này**:
- Quick wins #1-#10 — 1 người dev có thể chạy hết.
- Sprint A kicker meeting với scope rõ.

**Trước WSTI** (assume tuần WSTI = tuần 2026-05-05):
- Sprint B đi tới P1-T1 (Agent Activity Drawer) + P1-C5 (7 slide bổ sung pitch).
- WSTI demo dry-run 2 lần với checklist §7.

**Sau WSTI, trước investor**:
- Sprint C + 7 slide đầu tư section.
- Pitch deck rehearsal với 5 risk Q&A.

---

> **Master report ends.** Tổng cộng 7 lane × ~600-2600 từ chi tiết (file riêng), master này gắn ưu tiên + audience tag cho từng item để team chia việc song song không trùng. Sửa file lane gốc nếu phát hiện chi tiết sai; đồng bộ lại master nếu đổi priority.
