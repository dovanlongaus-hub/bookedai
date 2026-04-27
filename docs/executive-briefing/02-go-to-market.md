# 02 - GO-TO-MARKET

```
═══════════════════════════════════════════════════════════
EXECUTIVE BRIEFING: Go-To-Market & Sales Motion
Date: 2026-04-26 | Prepared for: Chief Revenue Officer
═══════════════════════════════════════════════════════════
```

## BOTTOM LINE
GTM motion ở giai đoạn early-to-growth: founder-led demos, direct outreach, và events là ba kênh ưu tiên cho pipeline gần. SEO compounding chậm hơn nhưng cần khởi động ngay. Pitch không bán "AI", bán `Don't miss customers anymore`. Phải close ít nhất một paid SME (Future Swim đang là first revenue loop trong Sprint 20) trước khi mở rộng GTM. Pricing model: setup fee + performance commission, lower-risk hơn flat SaaS.

## KEY FINDINGS
- **ICP**: Australian service SMEs có lead leakage rõ ràng (clinics, salons, swim schools, tutors, trades, child activity, allied health). Source: [go-to-market-sales-event-strategy.md](../architecture/go-to-market-sales-event-strategy.md) §2.
- **Channel priority**: 1) Direct outreach 2) Events 3) SEO 4) Referrals 5) Partnerships. Source: same doc §4.
- **Standard funnel**: `Traffic → Lead → Demo → Trial → Paid → Retention → Referral` — founder response time target <24h, lead-to-demo <3 days. Source: same doc §5.
- **Demo strategy**: 2-3 phút product-led, end với commercial next step (`Start a free trial` / `Let's set this up for your business`). Slides bị cấm. Source: same doc §8.
- **Public copy mới đã ship** (QW-6/7/8 closed `2026-04-26`): hero `Never lose a service enquiry again`, primary CTA `Try BookedAI Free` thay cho `Open Web App`, empty-state `Let's refine your request — tell us a suburb, preferred time, or service detail`. Source: [bookedai-master-roadmap-2026-04-26.md](../architecture/bookedai-master-roadmap-2026-04-26.md).
- **A/B matrix**: 24 experiments (đã expand từ 16 lên 24 với 8 conversion-copy + designer-system waves). Wave 1 ở Sprint 20: `AC-1`, `RT-1`, `RT-3`, `CH-1`, `CW-1/2/3`. Source: same doc.
- **Lifecycle email segments**: new SME leads, tenant admins, booking customers, warm register-interest, at-risk bookings, operator/support stakeholders. Source: [bookedai-master-prd.md](../architecture/bookedai-master-prd.md) §4A.

## IMPLICATIONS
What this means for BookedAI:
- **First reference customer cần đóng trước Sprint 21**: Future Swim revenue loop là proof story để chuyển từ "founder-led" sang "case-study-led" outreach.
- **Pitch deck phải refresh** sau Sprint 22 với live `Tenant Revenue Proof` dashboard screenshots — trước đó deck vẫn dùng demo screenshots, có rủi ro inflate claims.
- **Channel parity là sales blocker**: nếu WhatsApp outbound vẫn block khi prospect hỏi "Có nhận WhatsApp không?", sales motion bị undermine.
- **Pricing hiển thị tier persona** (RF-9: Solo / Growing studio / Clinic / Enterprise) là cần thiết trước Sprint 21 billing — khách hỏi giá phải có câu trả lời rõ ràng.

## RECOMMENDED ACTIONS
1. **Approve Future Swim case-study production** (revenue evidence, screenshots, parent testimonials) — CRO + CPO — `2026-05-10`
2. **Run A/B Wave 1 hợp lệ** (≥500 impressions/variant trên 4 experiments tối thiểu) — Growth Lead — `2026-05-10` (Sprint 20 exit gate)
3. **Pricing reframe public** (tier persona thay vì commodity SaaS table) — CRO + Marketing — `2026-05-17`
4. **Schedule 4 founder-led events** (AI meetups, vertical industry — clinic/swim/tuition) Q2-2026 — Founder + CRO — `2026-05-31`
5. **Publish Commercial & Compliance Checklist v1** trong Sprint 20 (nói rõ legal, T&C, refund, commission terms) — CRO + Legal — `2026-05-10`

## RISKS & CONSIDERATIONS
- **Generic AI commoditization**: nếu pitch drift về "AI tool", SME khó phân biệt với chatbot competitors — DON'T list trong [pricing-packaging-monetization-strategy.md](../architecture/pricing-packaging-monetization-strategy.md).
- **Pricing complexity**: setup fee + commission requires explanation; nếu prospect không hiểu commission base (per booking vs % revenue), close rate giảm.
- **Founder-bandwidth**: founder-led demos không scale > ~10/tuần; phải build sales playbook đào tạo first BDR trước Q3-2026.
- **CAC chưa đo**: GTM doc liệt kê CAC, payback, LTV như metrics nhưng [metric needed] vẫn chưa có baseline số liệu thực.
- **Event ROI risk**: events tốn time founder; nếu attendee không phải decision-maker (vendor-heavy events), waste.

```
═══════════════════════════════════════════════════════════
Sources: go-to-market-sales-event-strategy.md,
pricing-packaging-monetization-strategy.md, bookedai-master-prd.md,
bookedai-fundraising-profit-first-strategy.md,
bookedai-master-roadmap-2026-04-26.md
Confidence: MEDIUM (strategy clear, baseline conversion metrics chưa có dữ liệu thực tế)
═══════════════════════════════════════════════════════════
```
