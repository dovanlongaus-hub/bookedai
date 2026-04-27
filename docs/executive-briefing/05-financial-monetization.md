# 05 - FINANCIAL & MONETIZATION

```
═══════════════════════════════════════════════════════════
EXECUTIVE BRIEFING: Pricing, Unit Economics & Fundraising
Date: 2026-04-26 | Prepared for: CFO
═══════════════════════════════════════════════════════════
```

## BOTTOM LINE
Commercial model: **setup fee + performance-aligned commission** + (theo update mới) SaaS subscription tiers `Freemium / Pro / Pro Max / Advance Customize`. Pricing positioning: `We win when you win`. Hiện chưa có ARR baseline, CAC, hay LTV figures được track trong docs ([metric needed]). Fundraising story đã định hình: BookedAI là `revenue-operations company sử dụng AI conversation làm front door` — không phải generic AI assistant. Tier reframe (RF-9: Solo / Growing studio / Clinic / Enterprise) cần ship trước Sprint 21.

## KEY FINDINGS
- **Official pricing model**: 1) one-time setup fee (covers AI setup, channel workflow, integrations, dashboard, launch support); 2) ongoing commission (per booking, % attributable revenue, hoặc hybrid). Source: [pricing-packaging-monetization-strategy.md](../architecture/pricing-packaging-monetization-strategy.md).
- **Approved public copy**: Headline `We win when you win`. Supporting `BookedAI starts with a one-time setup fee... After launch, pricing is tied to the successful bookings or revenue the system helps generate.` Source: same doc.
- **Pricing tiers** mới (`2026-04-25` lock): `Freemium`, `Pro`, `Pro Max` cho public package vocabulary; `Advance Customize` cho custom registration lane. Source: [bookedai-master-roadmap-2026-04-26.md](../architecture/bookedai-master-roadmap-2026-04-26.md).
- **Investor framing**: BookedAI = `AI Revenue Engine for service businesses: an omnichannel agent layer that captures intent, creates booking references, tracks payment and follow-up posture, and records every revenue action in an auditable operating system`. Source: [bookedai-fundraising-profit-first-strategy.md](../development/bookedai-fundraising-profit-first-strategy.md).
- **Monetization moat thesis**: continuity + operator control plane + audit ledger + reusable vertical templates + release-gated evidence — chứ không phải "AI hot" alone. Source: same doc.
- **Required product capabilities to support pricing model**: revenue attribution visibility, booking-linked reporting, commission summary reporting, auditable commercial drill-downs, payment-state visibility. Source: [pricing-packaging-monetization-strategy.md](../architecture/pricing-packaging-monetization-strategy.md).
- **Phase 21 backlog**: tenant billing summaries (paid, outstanding, overdue, manual-review revenue), admin reconciliation views, `Tenant Revenue Proof` dashboard, pricing/commission visibility in tenant workspace. Source: [bookedai-master-roadmap-2026-04-26.md](../architecture/bookedai-master-roadmap-2026-04-26.md).

## IMPLICATIONS
What this means for BookedAI:
- **Pricing model = product requirement**: setup fee + commission cần real attribution data + commission summary widget + audit drill-downs để bán credibly. Phase 21 phải close.
- **Investor pitch**: deck cần update với live `Tenant Revenue Proof` screenshots sau Sprint 22 — không bán "AI hot", bán "auditable revenue continuity".
- **Profit-first principle**: "first goal là profitable repeatability, không phải vanity growth" — cần kỷ luật resist mở wide surface area trước khi 1 wedge khẳng định.
- **First reference customer (Future Swim)** = first revenue evidence cho deck.

## RECOMMENDED ACTIONS
1. **Establish ARR / MRR / CAC / LTV tracking baseline** (financial dashboard — current implementation gap) — CFO + Finance — `2026-05-31`
2. **Lock pricing tier persona reframe** (RF-9: Solo / Growing studio / Clinic / Enterprise) trên public + tenant workspace — CFO + CRO — Sprint 21 (`2026-05-17`)
3. **Approve commission base structures by vertical** (per-booking vs % revenue, hybrid criteria) — CFO + CRO — `2026-05-10`
4. **Sign `Tenant Revenue Proof` dashboard** investor-grade KPI list — CFO + Product — Sprint 22 (`2026-05-24`)
5. **Draft fundraising data room**: deck v2 với live evidence + commercial checklist v1 + use-of-funds tied to revenue milestones — CFO + CEO — `2026-06-07`

## RISKS & CONSIDERATIONS
- **No real numbers yet**: ARR, MRR, CAC, LTV, payback period đều [metric needed] trong docs. Investor due diligence sẽ blocked nếu không có baseline.
- **Commission attribution risk**: nếu attribution logic không explainable hoặc bị tenant challenge, commission collection collapse.
- **Pricing complexity vs SME comprehension**: setup fee + commission khó hơn flat SaaS — cần sales explanation script.
- **Tier reframe vs early customer pricing**: nếu first paying customer sign trước RF-9 ship, tier persona bị inconsistent.
- **WhatsApp/SMS delivery cost** (Twilio) khi scale: variable cost cần model trong commission unit economics — chưa documented.
- **Vietnam founder + AU SME market**: tax + regulatory implication cho international founder bán AU SaaS — chưa addressed.

```
═══════════════════════════════════════════════════════════
Sources: pricing-packaging-monetization-strategy.md,
bookedai-fundraising-profit-first-strategy.md,
bookedai-master-prd.md, prd.md, bookedai-master-roadmap-2026-04-26.md,
analytics-metrics-revenue-bi-strategy.md,
investor-update-2026-04-20.md
Confidence: MEDIUM (pricing model clear, financial baseline numbers chưa documented)
═══════════════════════════════════════════════════════════
```
