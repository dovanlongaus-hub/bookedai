# Lane 2 — UX/UI Design System Audit (2026-04-28)

> Audit chỉ-đọc 5 surface (`public/`, `tenant/`, `portal/`, `admin/`, `public/demo/`) + `components/landing/{sections,ui}/` so với Apple-inspired design system tại `frontend/src/theme/minimal-bento-template.css`, `apple-tokens.css`, `styles.css`. Audience: A = end-user (B2C khách book), B = SME owner/tenant, C = nhà đầu tư/internal admin.

---

## 0. Cảnh báo nguồn (source-of-truth đã drift)

Trước khi chấm các surface, lưu ý là **bản thân design system cũng drift**:

| File | Vấn đề | Bằng chứng |
|---|---|---|
| `frontend/src/theme/minimal-bento-template.css:13-14` | DM Sans + Space Grotesk vẫn nằm trong token font dù memory ghi "REMOVED" | `--apple-font-display: "Space Grotesk", "SF Pro Display"...` / `--apple-font-text: "DM Sans", "SF Pro Text"...` |
| `minimal-bento-template.css:18-22` | `--apple-blue` được redefine = `#4f8cff` (không phải `#0071e3`) | `--apple-blue: #4f8cff;` mâu thuẫn với `apple-tokens.css:11` (doc nói `#0071e3`) và `styles.css:12` (Tailwind `--color-apple-blue: #0071e3`) |
| `minimal-bento-template.css:127-130, 196-201` | Body và `.booked-shell` dùng radial+linear gradient (vi phạm "binary `#f5f5f7`/`#000`, NO gradients") | `radial-gradient(...rgba(79,140,255,0.10)...), linear-gradient(180deg,#fafbfe...)` |
| `styles.css:61-66, 124-128` | `--font-display`, `--font-body`, `--font-sans` vẫn là `"Space Grotesk"` / `"DM Sans"` và body `font-family: var(--font-body)` | Toàn bộ app thực tế render DM Sans, không phải SF Pro/Inter như rule yêu cầu |
| `styles.css:97, 157-162, 452-460` | `gradient-text`, `public-apple-primary-button`, `--background-image-brand-gradient` dùng gradient `#8B5CF6 → #4F8CFF` (purple accent) | Vi phạm "Primary accent #0071e3 ONLY, no other accents" |

**Implication**: Mọi điểm "compliance" bên dưới chỉ tính so với rule người dùng nêu, không phải so với CSS hiện tại — vì CSS hiện tại đang sai. P0 first fix là dọn 3 file token.

---

## 1. Compliance score (ước lượng, /100)

| Surface | Score | Lý do gọn |
|---|---|---|
| `public/` (PublicApp homepage + landing sections) | **38** | Dùng warm beige `#f6f4ef`, slate `#172033`/`#101827` thay cho `#f5f5f7`/`#000`; 833 chỗ Tailwind hex tùy biến trong toàn repo, riêng `public/` chiếm phần lớn; gradient + custom shadows dày đặc |
| `tenant/` (TenantApp) | **62** | Sạch hex inline (0 `bg-[#…]`) nhờ chuẩn CSS class, nhưng 49+ lần dùng tone semantic không-blue (`emerald/rose/amber/sky-50`); `slate-950` thay cho `var(--apple-near-black)`; gradient `from-emerald-50 via-white to-sky-50` |
| `portal/` (PortalApp) | **30** | Toàn surface dùng IBM blue `#0f62fe` thay vì Apple `#0071e3`; bg `#f4f7fb` thay vì `#f5f5f7`; text `#172033`; shell login `bg-slate-950` không phải Apple `--apple-near-black` |
| `admin/` (AdminApp wrapper + `components/AdminPage.tsx`) | **70** | Wrapper dùng đúng `booked-admin-shell` + `booked-runtime-card`; AdminPage chỉ còn vài chỗ `text-[#1d1d1f]` (đúng token nhưng nên dùng `text-apple-near-black`) |
| `public/demo/` (chess flow `DemoChatStage`, `DemoResultsPanel`, `DemoFlowRail`, `DemoFloatingCta`, `DemoBookingPanel`, `DemoBookingModal`, `DemoLandingApp`) | **15** | Toàn palette neon `#20F6B3` / `#00D1FF` / `#0B1324` / `#08111F`; chữ `#BFFFEF`/`#8EFCE0`; hoàn toàn lệch khỏi Apple system |
| `components/landing/sections/` | **45** | Có dùng `template-card`, `template-kicker` nhưng đan xen gradient `from-#8b5cf6 to-#4f8cff`, hex `#1459c7`, `#1d1d1f` inline; `PitchDeckApp` 30+ gradient bg |
| `components/landing/ui/` | **75** | `SectionCard`, `BrandLockup`, `SectionShell`, `SignalPill` dùng class hệ thống đúng, chỉ `FeatureCard.tsx:36-47` còn hex `#1d1d1f`, `#0071e3` |

**Trung bình trọng số (B2C public + tenant + demo nặng)**: ~**42/100**.

---

## 2. Top 15 violations (P0 = block; P1 = ship-blocker UX; P2 = tidy)

| # | File:line | Loại | Bằng chứng | Sev | Audience | Fix gợi ý |
|---|---|---|---|---|---|---|
| 1 | `frontend/src/theme/minimal-bento-template.css:13-14` | Font drift (token) | `--apple-font-display: "Space Grotesk"...` `--apple-font-text: "DM Sans"...` | P0 | A/B/C | Đổi sang `-apple-system, BlinkMacSystemFont, "Inter", "Helvetica Neue"` đúng rule |
| 2 | `frontend/src/styles.css:61-66, 127` | Font drift (Tailwind) | `--font-body: "DM Sans", Inter, sans-serif;` body `font-family: var(--font-body)` | P0 | A/B/C | Bỏ DM Sans/Space Grotesk khỏi `@theme`; body dùng `var(--apple-font-text)` |
| 3 | `frontend/src/theme/minimal-bento-template.css:18` | Token drift (primary blue) | `--apple-blue: #4f8cff;` | P0 | A/B/C | Đặt `#0071e3` đồng nhất 3 file token |
| 4 | `frontend/src/styles.css:452-456, 157-162` | Accent drift (purple gradient) | `.public-apple-primary-button { background: linear-gradient(135deg, #7c3aed 0%, #8b5cf6 50%, #4f8cff 100%); }` | P0 | A/C | Thay = solid `var(--apple-blue)` 8px radius, bỏ gradient |
| 5 | `frontend/src/apps/public/PublicApp.tsx:294` | Section bg drift | `<main className="min-h-screen overflow-hidden bg-[#f6f4ef] text-[#172033]">` | P0 | A/C | `className="booked-shell"` (xóa hex), text mặc định nhận từ shell |
| 6 | `frontend/src/apps/public/PublicApp.tsx:334, 379` | Button drift (slate not Apple-blue) | `bg-[#172033] ... hover:bg-[#263147]` cho CTA chính | P0 | A | Dùng `.booked-button` (solid `#0071e3`, 8px radius) |
| 7 | `frontend/src/apps/portal/PortalApp.tsx:356, 369, 933` | Token drift (IBM blue) | `bg-[#0f62fe] text-white hover:bg-[#0b57e3]` xuyên suốt portal | P0 | A | Replace all `#0f62fe→var(--apple-blue)`, `#0b57e3→var(--apple-blue-hover)` |
| 8 | `frontend/src/apps/portal/PortalApp.tsx:853` | Section bg drift | `<main className="min-h-screen bg-[#f4f7fb] text-[#172033]">` | P0 | A | `className="booked-shell"` |
| 9 | `frontend/src/apps/public/ChessGrandmasterApp.tsx:455-631` | Toàn bộ palette không Apple | `bg-[#f7f3eb] text-[#1f1a17]` + tan/brown `#9a6a2c`, `#dcb06e`, `font-serif` | P0 | A/B | Rebuild bằng `template-card`, `apple-button-dark`, `apple-kicker`; bỏ `font-serif` |
| 10 | `frontend/src/apps/public/demo/DemoChatStage.tsx:83-267` + `DemoResultsPanel.tsx:32-280` + `DemoFlowRail.tsx:84-86` + `DemoFloatingCta.tsx:63-68` | Demo neon palette | `border-[#20F6B3]/20 bg-[#20F6B3]/10 text-[#BFFFEF]` lặp lại 30+ lần | P0 | A/C | Demo phải dùng `apple-section-dark` + `apple-card-dark` (#272729) + `--apple-blue` highlight |
| 11 | `frontend/src/apps/public/PitchDeckApp.tsx:182, 317, 580, 595, 684, 702, 809, 858-925, 1084-1279` | Gradient drift (≥30 chỗ) | `bg-[linear-gradient(135deg,#101827_0%,#172033_52%,#123b3a_100%)]`, `bg-[linear-gradient(180deg,#fff1f2_0%,#ffffff_100%)]` | P0 | C | Thay bằng `apple-section-light/dark` + 1 lớp solid; gradient pitch deck nên là asset image |
| 12 | `frontend/src/components/landing/sections/CallToActionSection.tsx:112` | Gradient purple cho progress bar | `bg-[linear-gradient(90deg,#8b5cf6_0%,#4f8cff_100%)]` | P1 | A/C | Solid `bg-apple-blue` |
| 13 | `frontend/src/components/landing/sections/SolutionSection.tsx:71, 86, 92` | Hex inline + gradient | `bg-[#1d1d1f]`, `bg-[linear-gradient(90deg,#1d1d1f_0%,#0071e3_100%)]` | P1 | C | `bg-apple-near-black`, gradient → solid `bg-apple-blue` |
| 14 | `frontend/src/components/landing/Header.tsx:253, 290, 303, 498, 522, 538, 549` | Hex inline trong header dùng chung | `bg-[#eef4fb]`, `bg-[#1d1d1f]`, `bg-[#f8fbff]`, `bg-[#f3f7fb]`, `bg-[#f8fafc]`, `shadow-[0_18px_36px_rgba(15,23,42,0.18)]` | P1 | A/B/C | Header là shared → fix lan toả; dùng `bg-apple-light`, `bg-apple-near-black`, `shadow-apple` |
| 15 | `frontend/src/apps/tenant/TenantApp.tsx:3374, 3528, 3590, 3817, 4109, 4255, 4396, 4690, 4930, 5050, 5103` | Tenant tone drift (slate-950 + emerald gradients) | `bg-slate-950`, `bg-gradient-to-br from-emerald-50 via-white to-sky-50`, `from-emerald-50 to-white` | P1 | B | Status pills nên dùng `--apple-success/--apple-warning/--apple-danger` thay cho `emerald/amber/rose-50` đa sắc |

> **Số liệu kiểm tra**: `grep -rE "bg-\[#\|text-\[#\|border-\[#" frontend/src/apps frontend/src/components/landing | wc -l` = **833** lần, tập trung ở `ChessGrandmasterApp.tsx`, `PortalApp.tsx`, `PitchDeckApp.tsx`, `RegisterInterestApp.tsx`, `HomepageSearchExperience.tsx`, demo flow.

---

## 3. Component reuse map (đề xuất 5 consolidations)

| # | Tên đề xuất | Path | Lý do |
|---|---|---|---|
| 1 | `<AppleCTA />` | `frontend/src/components/landing/ui/AppleCTA.tsx` *(mới)* | Hiện CTA "Start in product / Book demo" được clone hex thủ công ở `PublicApp.tsx:324-338`, `PortalApp.tsx:931-937`, `ChessGrandmasterApp.tsx:464-465`, `Header.tsx:303, 549` — 1 component primary `.booked-button` + secondary `.booked-button-secondary` chia 2 surface (light/dark) |
| 2 | `<AppShell mode="public\|tenant\|portal\|admin\|demo" />` | `frontend/src/components/landing/ui/AppShell.tsx` *(mới)* | `<main className="min-h-screen ...">` lặp ở 5 file, mỗi nơi 1 màu nền khác. Centralise binary `#f5f5f7` / `#000` |
| 3 | `<NeutralStatusPill tone="success\|warning\|danger\|info" />` | `frontend/src/components/landing/ui/SignalPill.tsx` (mở rộng variant) | TenantApp + PortalApp + RoadmapApp tự code lại `bg-emerald-50/text-emerald-700`, `bg-amber-50/text-amber-700`, `bg-rose-50` ≥40 chỗ |
| 4 | Hợp nhất `DemoBookingDialog.tsx` ↔ `BookingAssistantDialog.tsx` ↔ `DemoBookingModal.tsx` | `frontend/src/components/landing/assistant/` | 3 dialog booking riêng cho public/demo/tenant; kiến trúc duplicate, chiếm 5000+ LOC, mỗi dialog tự style chat bubble khác (xem `DemoChatStage.tsx:15-19`) |
| 5 | `<KickerEyebrow tone="apple\|brand">` | `frontend/src/components/landing/ui/SectionHeading.tsx` (đã có nhưng bị bypass) | Các kicker `text-[10px] uppercase tracking-[0.16em] text-slate-500` xuất hiện 30+ lần ở RegisterInterestSection, PortalApp, TenantApp — luôn dùng `template-kicker` từ design system |

---

## 4. Mobile / responsive gaps (top 5)

| # | Surface | Vấn đề | Bằng chứng |
|---|---|---|---|
| 1 | `PublicApp.tsx:294-340` (header public) | Hardcoded `max-[1023px]:!hidden` cho nav + `max-[639px]:!hidden` cho "Investor pitch" CTA → trên màn 640-1023 chỉ còn 1 CTA, không có hamburger menu mở nav | `nav className="...max-[1023px]:!hidden"` không kèm `<button>` mở drawer |
| 2 | `PortalApp.tsx:855-1037` | Topbar `max-w-[1280px]` + `flex items-center` không có wrap cho mobile → trên <500px reference input + Submit button bị nén, chữ `tracking-[0.16em]` overflow | `flex items-center justify-between gap-3` không có `flex-wrap` |
| 3 | `ChessGrandmasterApp.tsx:455-631` | Hero + concierge không có breakpoint trung gian; `font-serif text-3xl tracking-[-0.03em]` quá lớn cho mobile, không có `clamp()` | Toàn file 0 lần `sm:text-` cho headline |
| 4 | `TenantApp.tsx:3132-3144` (error state) | Card `max-w-4xl` không co dưới 720px (chỉ relies on padding shell), `border-rose-200` mobile bị tràn nội dung dài | Không có `sm:` variant cho padding/text |
| 5 | `HomepageSearchExperience.tsx:3422-3508` (right rail "Message BookedAI") | Side-rail 280px sticky bị che màn nhỏ vì `public-search-results-shell { grid-template-columns: minmax(0,1.5fr) minmax(280px,0.78fr) }` chỉ collapse `<1024px` | Cần fallback `≤1280px` (laptop) → stack hoặc bottom-sheet |

---

## 5. A11y top 5 quick fixes

| # | Vấn đề | File:line | Fix |
|---|---|---|---|
| 1 | Icon-only `<button>` thiếu `aria-label` (PortalApp 16 button raw, AdminApp wrapper 0 label) | `frontend/src/apps/portal/PortalApp.tsx:931, 990, 1049, 1209-1225, 1303, 1390-1397, 1579-1651, 1765-1772` | Thêm `aria-label="Look up booking"`, `aria-label="Approve handoff"`, … cho mỗi nút icon |
| 2 | Contrast yếu — text muted `text-[#172033]/45` (≈ rgba(23,32,51,0.45)) trên nền `bg-[#f4f7fb]` cho label kicker | `PortalApp.tsx:952, 965, 1037, 1071, 1098, 1111, 1126` | Đẩy lên ≥ 0.62 opacity hoặc dùng `--apple-text-tertiary` (0.48 trên `#f5f5f7`) — tối thiểu 4.5:1 |
| 3 | Demo flow toàn chữ `text-[#BFFFEF]`, `text-[#8EFCE0]`, `text-[#C8FFF0]` size `text-xs uppercase tracking-[0.18em]` trên nền `#0B1324` — contrast OK nhưng tracking + size combo dưới WCAG AA cho body | `apps/public/demo/DemoChatStage.tsx:83, 100, 181`; `DemoResultsPanel.tsx:188, 210, 245`; `DemoFloatingCta.tsx:63-68` | Tăng size lên ≥ 13px hoặc bỏ `uppercase + tracking-[0.18em]` |
| 4 | `<img>` không có alt rõ ràng — `HomepageSearchExperience.tsx:644` dùng `alt=""` cho icon (OK vì decorative) **nhưng** brand logo trong `PortalApp.tsx:1158, 1185` và `TenantApp.tsx:3054, 3271, 3543, 4035, 4048` cần kiểm: nhiều `<img>` không có `alt` định danh tenant | `PortalApp.tsx:1158`, `TenantApp.tsx:4048` | Đặt `alt="{tenant.name} logo"`; nếu decorative thêm `alt="" aria-hidden="true"` |
| 5 | Focus-visible coverage thiếu — `PortalApp.tsx:929` input `outline-none ring-0 focus:border-sky-300` không có focus ring 2px như `--apple-focus-ring`; nhiều `<button className="rounded-full bg-[#1f1a17]">` ở ChessGrandmaster không có focus state | `PortalApp.tsx:929`, `ChessGrandmasterApp.tsx:464-465, 524, 560, 609` | Replace với `.booked-button*` để nhận `outline: var(--apple-focus-ring)` mặc định, hoặc thêm `focus-visible:outline focus-visible:outline-2 focus-visible:outline-apple-blue focus-visible:outline-offset-2` |

---

## 6. Appendix — chi tiết bằng chứng

### A. Token drift volume (grep counts)

| Pattern | Tổng | Top file |
|---|---|---|
| `bg-[#…]\|text-[#…]\|border-[#…]` | **833** | `ChessGrandmasterApp.tsx` (≈100), `PitchDeckApp.tsx` (≈80), `HomepageSearchExperience.tsx` (≈70), `PortalApp.tsx` (≈60), `RegisterInterestApp.tsx` (≈50) |
| `shadow-[…]` arbitrary | **70+** | `PortalApp.tsx` (≈25), `TenantApp.tsx` (≈20), `ChessGrandmasterApp.tsx` (≈12) |
| `linear-gradient(…)` inline class | **60+** | `PitchDeckApp.tsx` (≈30), `ChessGrandmasterApp.tsx` (≈8), `PortalApp.tsx` (≈8), `TenantApp.tsx` (≈6) |
| `from-purple/from-violet/from-fuchsia` | 1 + tokens trong CSS (`--background-image-brand-gradient`) | `ArchitectureApp.tsx:40` `from-violet-50`; styles.css:97, 158 gradient brand |
| `from-amber\|bg-amber\|text-amber` (warm accent ngoài blue) | **30+** | TenantApp (10), HomepageSearchExperience (6), demo (6), PartnersSection (1), PricingSection (1), RoadmapApp (3), PortalApp (1) |
| `bg-slate-950\|border-slate-9` | **20+** | TenantApp (10), ArchitectureApp (5), PortalApp (3), PitchDeckApp (1) |
| `rounded-[…]` arbitrary radius (không match 5/8/12/14/24/980) | **290** | toàn repo |

### B. Mâu thuẫn font/colour giữa 3 file token

```
minimal-bento-template.css:18  --apple-blue: #4f8cff;       <-- master nói 4f8cff
apple-tokens.css:11            var(--apple-blue) #0071e3   <-- doc nói 0071e3
styles.css:12                  --color-apple-blue: #0071e3 <-- Tailwind theme
```

→ Hệ quả thực tế: class `bg-apple-blue` (Tailwind) hiển thị `#0071e3`, nhưng `var(--apple-blue)` trong CSS module hiển thị `#4f8cff`. Cùng 1 trang sẽ có 2 sắc xanh.

### C. Các file đáng review trước (theo độ ưu tiên)

1. `frontend/src/theme/minimal-bento-template.css` — fix font + `--apple-blue` + bỏ gradient body/`booked-shell`
2. `frontend/src/styles.css` — fix `@theme` font + xoá brand gradient `purple→blue` cho primary button
3. `frontend/src/apps/public/PublicApp.tsx` — rebuild header + hero theo `booked-shell` + `booked-button*`
4. `frontend/src/apps/portal/PortalApp.tsx` — replace IBM blue `#0f62fe` toàn cục
5. `frontend/src/apps/public/demo/*` — rebuild palette demo về `apple-section-dark` + `--apple-blue`
6. `frontend/src/apps/public/ChessGrandmasterApp.tsx` — rebuild surface chess về Apple light/dark, bỏ `font-serif`
7. `frontend/src/apps/public/PitchDeckApp.tsx` — convert 30+ gradient → solid hoặc image asset
8. `frontend/src/components/landing/Header.tsx` — fix hex inline (lan toả vì shared)
9. `frontend/src/components/landing/ui/FeatureCard.tsx:36-47` — bỏ hex, dùng class
10. `frontend/src/apps/tenant/TenantApp.tsx` — chuẩn hoá status tone palette về `--apple-success/warning/danger`

### D. Wording inconsistency đáng chú ý (UX-not-content)

- CTA chính trên homepage: `PublicApp.tsx:336` "Start in product" / `Header.tsx` "Start free trial" / `PortalApp.tsx:935` "Review booking" / `ChessGrandmasterApp.tsx:609` "Capture academy enquiry" — chuẩn hoá pattern verb-noun, không trộn formal/casual.
- Eyebrow kicker dùng song song `template-kicker` (đúng) và 30+ chỗ tự code `text-[10px] uppercase tracking-[0.16em] text-slate-500` (sai pattern) — visual không nhất quán.
- "Investor pitch" (PublicApp), "Pitch deck" (Header), "Investor view" (PitchDeckApp) — 3 wording cho cùng surface.

---

**Kết luận**: design system Apple-inspired có nhưng không được force; 3 file token hiện đang **chính nó vi phạm rule người dùng** (DM Sans + Space Grotesk + `#4f8cff` + body gradient). Cho đến khi 3 file token được dọn (P0 #1-#4 ở §2), mọi nỗ lực sửa surface khác đều tạm thời. Sau khi token sạch, ưu tiên rebuild `public/`, `portal/`, `demo/` (3 surface compliance <40), chuẩn hoá `tenant/` status palette, consolidate 5 component trong §3, và pass A11y checklist §5 trước khi go-live đầu tư.
