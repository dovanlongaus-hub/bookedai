# 01 - PRODUCT STRATEGY

```
═══════════════════════════════════════════════════════════
EXECUTIVE BRIEFING: Product Strategy & Vision
Date: 2026-04-26 | Prepared for: Chief Product Officer
═══════════════════════════════════════════════════════════
```

## BOTTOM LINE
BookedAI là `AI Revenue Engine for Service Businesses` — không còn là chatbot/booking widget. Sản phẩm phải express một omnichannel agent layer kết nối WhatsApp, SMS, Telegram, email, web chat thành booking → payment → care → retention loop có audit. Tập trung MVP→GA: hoàn thiện ba agent classes (Search, Revenue Ops, Customer Care) trên chess academy, sau đó generalize sang Future Swim, rồi mở widget runtime cho SME-owned websites.

## KEY FINDINGS
- **Brand promise locked**: `Never miss a paying customer again` (SME) + `AI Revenue Engine for service businesses` (investor). Source: [prd.md](../../prd.md) §2.
- **3 AI agent classes** là first-class product capabilities: Search/Conversation, Revenue Operations, Customer Care/Status. Handoff contract documented. Source: [prd.md](../../prd.md) §8.
- **Canonical journey**: `Ask → Match → Compare → Book → Confirm → Portal → Follow-up` — tất cả surfaces phải preserve. Source: [DESIGN.md](../../DESIGN.md) `2026-04-26 Override`.
- **Priority verticals** (Top 6): clinics, beauty/wellness, trades/local services, tutoring/education, kids activity, professional local services. Source: [bookedai-master-prd.md](../architecture/bookedai-master-prd.md) §7.
- **Vertical templates**: chess (Co Mai Hung Chess Class / Grandmaster Chess) là first reusable template; Future Swim là second proof. Chess academy loop yêu cầu `intent → assessment → placement → booking → payment → class → coach input → AI report → parent follow-up → monthly billing → retention action`. Source: [prd.md](../../prd.md) §16.
- **Surface roles** (8 subdomains): bookedai.au, pitch, demo, product, portal, tenant, admin, api. Source: [prd.md](../../prd.md) §5.

## IMPLICATIONS
What this means for BookedAI:
- **Product positioning đã unify**: mọi planning mới phải bám AI Revenue Engine framing — không cho phép drift về "chatbot" hay "booking widget".
- **Chess-first rule**: vertical template generalization (`Phase 22`) phụ thuộc chess loop chạy stable trước; nếu chess loop slip, multi-tenant template slip theo.
- **Verified-tenant pattern**: chess search results phải hiển thị verified BookedAI tenant chips (Book, Stripe, QR, calendar, email, WhatsApp Agent, portal edit) — đây là pattern reusable cho vertical sau.
- **Surface coherence rule**: không được upgrade một surface trong khi adjacent surface trông yếu hơn về trust/UX/data — review/closeout phải multi-surface.

## RECOMMENDED ACTIONS
1. **Lock product narrative review cadence** (north-star + DESIGN.md + prd.md đồng bộ mỗi sprint closeout) — CPO — Sprint 19 onward
2. **Sign chess academy MVP exit criteria** (parent retention + report + portal continuation evidence) — CPO + Engineering — `2026-05-10`
3. **Approve `BookedAI Manager Bot`** as canonical customer-facing agent name on Telegram/WhatsApp/SMS/email/web chat — CPO + CMO — `2026-04-30`
4. **Productize widget/plugin runtime spec** trước Sprint 20 (deployment identity: tenant, host origin, page source, campaign, install mode) — CPO + CTO — `2026-05-04`
5. **Define `Tenant Revenue Proof` dashboard requirements** (KPIs investor-grade) — CPO + CFO — `2026-05-17`

## RISKS & CONSIDERATIONS
- **Scope creep**: 23 phases planned; phải resist mở Phase 24+ trước khi Phase 17-23 close hoàn chỉnh.
- **Vertical generalization risk**: chess + Future Swim quá khác (assessment/subscription vs class/lesson) — template phải config-driven, không hardcode.
- **Demo vs production gap**: `demo.bookedai.au` cần express full revenue engine (không chỉ booking proof) — risk là demo vẫn nhìn như chatbot.
- **Mobile-first compliance**: yêu cầu no-overflow tại 390px là gate cứng — verify từng surface trong UAT.

```
═══════════════════════════════════════════════════════════
Sources: prd.md, project.md, DESIGN.md, bookedai-master-prd.md,
demo-grandmaster-chess-revenue-engine-blueprint.md,
public-growth-app-strategy.md, tenant-app-strategy.md
Confidence: HIGH (north-star docs aligned, recent rev locked 2026-04-25/26)
═══════════════════════════════════════════════════════════
```
