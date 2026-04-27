# 07 - CUSTOMER EXPERIENCE

```
═══════════════════════════════════════════════════════════
EXECUTIVE BRIEFING: UX/CX, Design System & User Journeys
Date: 2026-04-26 | Prepared for: Chief Customer Officer
═══════════════════════════════════════════════════════════
```

## BOTTOM LINE
Design baseline: Apple-inspired template (SF Pro typography, binary black/light-gray rhythm, single Apple Blue accent `#0071e3`, 980px pill CTA) — đã consolidated thành single source of truth tại `minimal-bento-template.css`. Canonical journey `Ask → Match → Compare → Book → Confirm → Portal → Follow-up` phải preserve trên mọi surface (public, demo, product, portal, tenant, admin, messaging). Mobile no-overflow tại 390px là gate cứng. 8 Tier-1 quick wins shipped `2026-04-26` (jargon strip, accessibility, hero copy, CTA upgrade). 7 Tier-2 fixes (FX-1 to FX-7) đang scheduled.

## KEY FINDINGS
- **Apple Design System**: SF Pro Display (≥20px) + SF Pro Text (<20px), negative letter-spacing universally, single accent `#0071e3`, 980px pill CTAs, glassy nav `rgba(0,0,0,0.8) + blur(20px)`. Source: [DESIGN.md](../../DESIGN.md).
- **Canonical journey** must preserve: `Ask → Match → Compare → Book → Confirm → Portal → Follow-up`. Compare-first results, explicit `Book` action (không auto-jump vào form), portal-first confirmation, persistent Thank You. Source: [DESIGN.md](../../DESIGN.md) `2026-04-26 Override`.
- **Verified-tenant pattern** (chess Co Mai Hung Chess): card kept in shortlist với verified badge + capability chips (Book, Stripe, QR, calendar, email, WhatsApp Agent, portal edit). Source: [DESIGN.md](../../DESIGN.md), [prd.md](../../prd.md) §6.
- **Search result card**: top-left thumbnail/preview, provider/title, category, price-or-`Price not listed`, duration, location, confidence, one-line reason, action row (Maps, provider link, phone, mail, select, book). Source: [DESIGN.md](../../DESIGN.md).
- **Messaging surfaces native to channel**: web chat richer cards, Telegram compact text + inline `View n` / `Book n` controls, WhatsApp/SMS/email concise. `BookedAI Manager Bot` agent name across channels. Source: same doc.
- **Portal command center**: lookup, booking truth, payment posture, support route, request-safe action rail (overview/edit/reschedule/pause/downgrade/cancel). Two-column desktop + sticky action rail. Source: [DESIGN.md](../../DESIGN.md) `Portal Workspace Override`.
- **8 Tier-1 quick wins** closed `2026-04-26`: QW-1 jargon strip, QW-2 aria-describedby, QW-3 44px touch targets, QW-6 hero `Never lose a service enquiry again`, QW-7 CTA `Try BookedAI Free` / `Schedule a Consultation`, QW-8 empty-state copy.
- **Brand assets**: `frontend/public/branding/` là single source — không route-local logo files.

## IMPLICATIONS
What this means for BookedAI:
- **Customer trust = visible state truth**: copy phải reflect actual backend state (`queued`, `manual review`, `request received`) — không claim instant payment/cancel.
- **Cross-surface coherence rule**: nếu nâng cấp public surface mà portal/tenant trông yếu hơn, customer trust drop → mỗi sprint review phải multi-surface.
- **Mobile = first-class citizen**: 390px no-overflow là gate cứng cho QA, không phải QA-later.
- **Design-token debt risk**: 619 raw hex, 22+153 distinct shadows, 16+518 arbitrary radii — UI inconsistency nếu không consolidate (RF-1/2/3 trong Phase 22).
- **Dialog autofocus + dismissable + focus-restoration** (FX-5) chưa ship — accessibility gap.

## RECOMMENDED ACTIONS
1. **Ship 7 Tier-2 fixes (FX-1 to FX-7)** trong Sprint 19-20 — Frontend Lead — `2026-05-10`
2. **Verify mobile no-overflow** trên 7 surfaces (public, pitch, demo, product, portal, tenant, admin) tại 390px — QA — Sprint 19
3. **Empty-state pattern library** (RF-8: illustration + headline + CTA) — Designer + Frontend — Sprint 22
4. **Consolidate `BookingConfirmationPanel`** thay 3 duplicate implementations (RF-7) — Frontend Lead — Sprint 22
5. **Code-split `BookingAssistantDialog.tsx` (6K LOC) + `TenantApp.tsx` (4.9K LOC)** — Frontend Lead — Sprint 22
6. **A/B test customer-safe copy variants** (CW-1/2/3 hero, CTA, empty-state — Wave 1 Sprint 20)

## RISKS & CONSIDERATIONS
- **Customer-facing copy drift**: dev-friendly labels (`actor_context`, `runtime`, `webhook`) vẫn lọt vào public copy nếu không có review checklist.
- **Channel-specific copy gap**: email templates chưa channel-aware (P1-10) — cùng copy cho mobile email và desktop email.
- **Demo experience drift**: `demo.bookedai.au` đang SaaS workspace direction; nếu drift back về marketing page, demo conversion drop.
- **Brand asset duplication**: nếu PR mới add logo URL bypass `frontend/public/branding/`, brand consistency break.
- **Translation/locale risk**: English default + Vietnamese as second locale — lỡ mix-language render bug làm customer mất trust.
- **Pitch deck visuals chưa Playwright covered** (P1-8 / RF-10) — pitch breakage không bắt được trong CI.

```
═══════════════════════════════════════════════════════════
Sources: DESIGN.md, prd.md, project.md, bookedai-brand-ui-kit.md,
frontend-theme-design-token-map.md,
unified-responsive-theme-system.md,
landing-page-system-requirements.md,
full-stack-review-2026-04-26.md,
bookedai-chatbot-landing-design-spec.md
Confidence: HIGH (design system consolidated, canonical journey explicit, recent overrides dated)
═══════════════════════════════════════════════════════════
```
