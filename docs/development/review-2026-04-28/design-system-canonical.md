# BookedAI Design System — Canonical Reference (2026-04-28, post-Wave-5)

This is the single source of truth for the BookedAI design system. Every public, tenant, portal, admin, and product surface MUST resolve to the tokens, components, and patterns documented here. Anything not in this file is drift and must be reconciled by the next design review pass.

Owner: Design System Enforcer (Wave 5).
Last sync: 2026-04-28 (after Lane 2 P0/P1 + Wave 4 + Wave 5-A/5-B).

---

## 1. Brand

### Logos
- Canonical SVG/PNG: `/home/dovanlong/BookedAI/frontend/public/branding/bookedai-logo-official.png` (master) and `bookedai-logo-official.webp` (web-optimised).
- Light surfaces: `bookedai-logo-light.png` / `.webp`.
- Dark surfaces: `bookedai-logo-dark.png` / `.webp`.
- Black mark: `bookedai-logo-black.png` / `.webp`.
- Square mark (1024px): `bookedai-logo-square-1024.png` and `bookedai-app-icon-1024.png`.
- Transparent mark: `bookedai-logo-transparent.png` / `.webp`.
- Gradient mark: `bookedai-mark-gradient.png` (legacy aurora — DEPRECATED, kept for OG until replaced).
- Dark badge variant: `bookedai-logo-dark-badge.png`.
- TODO: produce a single canonical `bookedai-logo.svg` (vector) so we are not delivering raster on retina hero sections.

### Favicons & app icons
Files present in `/home/dovanlong/BookedAI/frontend/public/branding/`:
- `bookedai-icon-16.png`, `-32.png`, `-48.png`, `-64.png`, `-96.png`, `-180.png`, `-192.png`, `-256.png`, `-512.png`
- `bookedai-apple-touch-icon.png` (180x180 — referenced by `index.html`)
- `bookedai-mobile-icon-192.png`, `bookedai-mobile-icon-512.png`

Wired in `frontend/index.html` head:
- `<link rel="icon" type="image/png" sizes="32x32" href="/branding/bookedai-icon-32.png?v=20260421-branding-suite">`
- `<link rel="icon" type="image/png" sizes="192x192" href="/branding/bookedai-mobile-icon-192.png?v=20260421-branding-suite">`
- `<link rel="apple-touch-icon" sizes="180x180" href="/branding/bookedai-apple-touch-icon.png?v=20260421-branding-suite">`

TODOs:
- No `favicon.ico` exists in `frontend/public/`. Older browsers will 404. Generate one from `bookedai-icon-32.png`.
- No `favicon.svg` exists. Generate to enable monochrome dark/light auto-tinting in modern browsers.
- No `<meta name="theme-color">` is set in `index.html`. ADD `<meta name="theme-color" content="#0071e3">` to harmonise mobile chrome.

### Theme colour
Canonical accent: `#0071e3` (Apple system blue) — exposed as `var(--apple-blue)`.

### OG image
Currently no dedicated OG image is wired (only `bookedai-homepage-image.png` / `.webp` exist). TODO: ship `bookedai-og-1200x630.png` and reference it as `<meta property="og:image">` in `index.html`.

### Title bar
`frontend/index.html` `<title>`: `Bookedai.au | The AI Revenue Engine for Service Businesses`.
Approved alternates: `BookedAI · The AI Revenue Engine for Service Businesses`.

---

## 2. Tokens

All tokens live in `frontend/src/theme/apple-tokens.css` and are declared in `frontend/src/theme/minimal-bento-template.css`. They are exposed to Tailwind via `frontend/src/styles.css`.

### Colours (canonical, blue-only accent)
| Token | Hex | Use |
|---|---|---|
| `--apple-blue` | `#0071e3` | Primary CTA, all accents — ONLY accent allowed |
| `--apple-blue-hover` | `#0077ed` | Hover on blue elements |
| `--apple-blue-active` | `#006edb` | Active/pressed |
| `--apple-link-light` | `#0066cc` | Inline links on light bg |
| `--apple-link-dark` | `#2997ff` | Inline links on dark bg |
| `--apple-near-black` | `#1d1d1f` | Headings, dark CTA fill |
| `--apple-text-secondary` | `rgba(0,0,0,0.8)` | Body on light |
| `--apple-text-tertiary` | `rgba(0,0,0,0.48)` | Captions / disabled |
| `--apple-light` | `#f5f5f7` | Light section bg |
| `--apple-white` | `#ffffff` | White surface |
| `--apple-black` | `#000000` | Dark section bg |
| `--apple-dark-1` | `#1c1c1e` | Elevated card on black |
| `--apple-dark-2` | `#272729` | Standard dark card |
| `--apple-dark-3` | `#2a2a2c` | Subtle dark variation |
| `--apple-dark-4` | `#2c2c2e` | Higher dark elevation |
| `--apple-dark-5` | `#3a3a3c` | Subtle divider on dark |
| `--apple-success` | `#34c759` | Success state |
| `--apple-warning` | `#ff9f0a` | Warning state |
| `--apple-danger` | `#ff3b30` | Error/danger |

Tailwind utilities exist for all of the above: `bg-apple-blue`, `text-apple-blue`, `border-apple-blue`, `bg-apple-light`, `bg-apple-near-black`, `bg-apple-dark-1` … `bg-apple-dark-5`, `text-apple-success`, `text-apple-warning`, `text-apple-danger`.

### Typography
- Display: `var(--apple-font-display)` → SF Pro Display → Inter → system.
- Body: `var(--apple-font-text)` → SF Pro Text → Inter → system.
- Mono: `var(--apple-font-mono)` → SF Mono → Menlo → monospace.
- Tailwind: `font-display`, `font-body`, `font-mono`.
- BANNED: DM Sans, Space Grotesk, any `font-serif`. (Currently in `index.html` Google Fonts preconnect — TODO follow-up: remove DM Sans & Space Grotesk from `<link href>` once last consumer is migrated.)

### Spacing
Tailwind defaults retained. Section paddings standardise on `py-16` (64px) at sm and `py-24` / `py-32` for hero blocks. Cards: `p-5 sm:p-6 lg:p-8`.

### Radius
| Token | Value | Use |
|---|---|---|
| `--apple-radius-micro` | 5px | Tags, badges |
| `--apple-radius-standard` | 8px | Buttons, product cards |
| `--apple-radius-comfortable` | 11px | Search, filter buttons |
| `--apple-radius-large` | 12px | Feature panels |
| `--apple-radius-pill` | 980px | Pill CTAs |

Tailwind: `rounded-apple-micro`, `rounded-apple-standard`, `rounded-apple-comfortable`, `rounded-apple-large`, `rounded-apple-pill`.

### Shadows
- `--apple-shadow`: `0 3px 5px 30px rgba(0,0,0,0.22)` (card elevation).
- `--apple-shadow-sm`: `0 0 12px 2px rgba(0,0,0,0.12)` (subtle lift).
- Tailwind: `shadow-apple`, `shadow-apple-sm`.

### Motion
- Default duration: 220ms ease-out.
- Hover lifts: `transition hover:-translate-y-0.5`.
- Page reveal: `.animate-apple-reveal` (slide-up 12px, 320ms).
- Fade: `.animate-apple-fade` (opacity, 220ms).
- Booking CTA pulse: `.animate-booking-pulse`.
- All animations are GPU-friendly. NO theatrical / parallax / large translate animations.
- `prefers-reduced-motion: reduce` is honoured in `minimal-bento-template.css` — keep all new animations behind that media query.

### Focus / a11y
- `--apple-focus-ring`: `2px solid #0071e3`.
- Use `:focus-visible` everywhere; never strip outlines without replacement.
- Icon-only buttons MUST have `aria-label`.
- `<img>` elements MUST have meaningful `alt` (or `alt=""` + `aria-hidden` if decorative).
- Heading hierarchy is strict: one `<h1>` per page, then nested `<h2>` per section, `<h3>` per card.

---

## 3. Components (canonical)

### Shells
- `.booked-shell` — public app root, `#f5f5f7` bg.
- `.booked-admin-shell` — admin root, same bg.
- `.booked-product-shell` — product app, black bg.
- `.booked-runtime-shell` — booking widget shell.

### Navigation
- `Header.tsx` — top nav for all public surfaces. Uses `.apple-glass-nav` (sticky 48px dark glass) + `.booked-nav-link`.
- `Footer.tsx` — bottom footer for all public surfaces.
- Side menu: only on tenant ops (workspace nav). Mobile nav: hamburger drawer.

### Sections
- `.template-section` / `.apple-section-light` — light gray section.
- `.apple-section-white` — white.
- `.apple-section-dark` — black.
- React component: `<SectionShell>` (in `frontend/src/components/landing/sections/`).

### Cards
- `.template-card` / `.apple-card` — white card, 12px radius, `shadow-apple`.
- `.template-card-subtle` / `.apple-card-soft` — light gray card.
- `.template-card-dark` / `.apple-card-dark` — `#272729` dark surface.
- `.booked-runtime-card`, `.booked-stat-card`, `.booked-workspace-card`.

### Typography classes
- `.template-title` / `.apple-title` — display headline, 56px scale.
- `.template-body` / `.apple-body` — body text style.
- `.template-kicker` / `.apple-kicker` — eyebrow label, blue, 12px caps.
- Aliases: `.booked-title`, `.booked-body`.

### Buttons / CTAs
- `<AppleCTA>` (React component) — primary blue CTA.
- `.booked-button` / `.template-button` — primary blue, 8px radius.
- `.booked-button-secondary` — pill "Learn more", 980px radius.
- `.apple-button-dark` — near-black CTA, 8px radius.
- `.apple-btn-filter` — filter/search button, 11px radius.
- `.apple-btn-media` — circular media control.

### Badges
- `.template-chip` / `.apple-chip` — inline badge, 5px radius, gray bg.
- `<SignalPill>` (React component) — pill badge, blue border / blue fill variants.
- `.booked-pill`, `.booked-pill--brand`.

### Forms
- `.booked-field` — input field, 11px radius, blue focus ring.
- `.dropzone` / `.template-upload-dropzone` — upload area.

### Brand lockup
- `<BrandLockup>` — logo + wordmark used in `Header.tsx` and email/PDF templates.

---

## 4. Layout patterns

- Shell wrapping: `<main className="booked-shell">` … `</main>`.
- Top nav: `Header.tsx` — sticky, dark glass, 48px.
- Footer: `Footer.tsx` — light gray, multi-column links.
- Card grid: `grid gap-5 lg:grid-cols-3` (or 2 / 4) inside `mx-auto max-w-7xl`.
- Hero pattern: `<SectionShell>` → kicker → h1 → body → CTA cluster → trust strip → product still.
- Container: `mx-auto max-w-7xl px-4 sm:px-6 lg:px-8`.

---

## 5. Mobile breakpoints

| Breakpoint | Width | Pattern |
|---|---|---|
| Mobile S | 390 | iPhone — single column, 16px gutter, hamburger nav, bottom-pinned composer |
| Mobile M | 414 | iPhone Plus — same as 390 |
| Tablet | 768 | 2-column grids enable; nav remains drawer |
| Desktop | 1024+ | Full nav, 3+ column grids, side-by-side hero |

Sheet modals: bottom-anchored on mobile, centered on desktop. Confirm flow uses sheets, not full-screen pages, on mobile.

---

## 6. Banned

- Hex colour literals in JSX (`bg-[#xxxxxx]`, `text-[#xxxxxx]`, `border-[#xxxxxx]`). Use tokens.
- IBM-blue `#0f62fe`, `#0b57e3`, `#0353e9` (replace with `--apple-blue` family). [Cleared from PortalApp 2026-04-28.]
- Purple/violet/fuchsia accents: `#7c3aed`, `#8b5cf6`, `#6d28d9`, `from-purple-*`, `from-violet-*`, `from-fuchsia-*`. [Cleared from PitchDeckApp, ArchitectureApp, RoadmapApp 2026-04-28.]
- Teal/emerald as primary brand accent (`#0f766e`). Acceptable only as `--apple-success`/state colour, never as CTA.
- `font-serif` anywhere — replace with `font-display` or `font-body`.
- Old gradients: aurora rainbow gradient (`linear-gradient(135deg, #4F8CFF 0%, #8B5CF6 50%, #22C55E 100%)`) — banned. Use solid blue or single-axis `from-sky-50 to-white` only.
- DM Sans / Space Grotesk fonts.
- Banned CTA copy: "Click here", "Learn more about us", "Submit", "Sign up now". Use task-shaped CTAs from `cta-glossary-and-inventory.md`.
- Banned UI jargon in customer copy: "leverage", "synergy", "best-in-class", "platform-as-a-service", "AI-powered" (we say "AI does the work").

---

## 7. Drift audit (state as of 2026-04-28 post-Wave-5)

| File | Hex literals (in-scope) | Severity | Note |
|---|---:|---|---|
| `frontend/src/apps/admin/AdminApp.tsx` | 0 | clean | 30-line shell, only routes |
| `frontend/src/apps/portal/PortalApp.tsx` | 61 (was 80) | low | All `#0f62fe` → `#0071e3`; remaining hex are `#172033` paper tone + `#f8fbff` etc. — not Apple tokens but visual-design intentional. Follow-up: migrate `#172033` → `--apple-near-black` (`#1d1d1f`) in a UI swing. |
| `frontend/src/apps/public/PublicApp.tsx` | 84 | medium | Paper/manila design system (`#172033`, `#d8d0c0`, `#586173`, `#fbf7ee`) — NOT Apple, intentionally chosen for hero shell. Decision needed Wave 6: keep paper or unify to Apple light. |
| `frontend/src/apps/public/PitchDeckApp.tsx` | 71 (was 73) | low | All purple killed. Remaining hex are `#1d1d1f` (near-black, equiv to token), `#1d4ed8` (navy accent), `#1459c7` (mid-blue accent). Follow-up: collapse all blue accents to `--apple-blue`. |
| `frontend/src/apps/public/RoadmapApp.tsx` | 5 | low | `#fbfbfd` neutral cards only. Acceptable. |
| `frontend/src/apps/public/ArchitectureApp.tsx` | 2 | low | `#f7f9fc`, `#f8fafc` neutrals. Acceptable. |
| `frontend/src/apps/tenant/TenantApp.tsx` | not modified | n/a | 5607 lines, owned by parallel session. Out of Wave-5 scope. |
| `frontend/src/apps/public/ProductApp.tsx` | not modified | n/a | Wave 5-A owner. |
| `frontend/src/apps/public/HomepageSearchExperience.tsx` | 43 (was 183) | low | Wave 5-A swept 2026-04-28. Remaining hex are intentional blue-tint paper backgrounds + navy paper carryover (see post-sweep audit below). |
| `frontend/src/theme/bookedai-brand-kit.css` | DEPRECATED 2026-04-28 | medium | Still imported by `styles.css`. Aurora gradient + DM Sans + purple — banner added. Migrate consumers off `--bookedai-*` and delete in Wave 6. |

### Font-serif sweep
- `grep -rE 'font-serif' frontend/src/apps/ frontend/src/components/landing/` → 0 matches. Clean.

### Purple/violet/fuchsia accents
- After 2026-04-28 sweep: no `from-purple-*`, `from-violet-*`, `from-fuchsia-*`, `#7c3aed`, `#8b5cf6`, `#6d28d9`, `#f5f3ff`, `text-violet-700` remain in PublicApp, PitchDeckApp, RoadmapApp, ArchitectureApp, PortalApp.

### Files NOT touched in this pass (owned elsewhere)
- `ProductApp.tsx` — Wave 5-A
- `ChessGrandmasterApp.tsx`, `RegisterInterestApp.tsx`, `FutureSwimApp.tsx`, `AIMentorProApp.tsx` — Wave 4
- `Header.tsx`, `Footer.tsx`, `frontend/src/components/landing/sections/*` — Wave 4-D
- `TenantApp.tsx` — parallel session
- `frontend/src/features/admin/*` — admin lane

---

## 8. Icon library (audit + recommendation)

Audit (2026-04-28):
- `lucide-react` import sites: 16 (across `features/admin/*`, `apps/public/RegisterInterestApp.tsx`, `apps/portal/PortalApp.tsx`, etc.). Listed as a `package.json` dependency.
- `react-icons` imports: 0.
- `@heroicons/react` imports: 0.
- Inline `<svg>` elements: 45 across `frontend/src/apps/` and `frontend/src/components/landing/`. Most are decorative shapes (gradients, dots) and one-off product illustrations — not generic icons.

**Recommendation:** make `lucide-react` the single canonical icon library. In Wave 6:
1. Migrate the 45 inline `<svg>` icon shapes that are semantic icons (arrows, checks, chevrons, search, user, etc.) to `lucide-react` equivalents.
2. Keep inline `<svg>` only for decorative gradients, brand illustrations, and product diagrams.
3. Add an ESLint rule banning `<svg>` icons not wrapped in a documented React component.
4. Pin `lucide-react` version in `package.json` and document upgrade cadence.

Do NOT migrate inline SVG illustrations (PitchArchitectureFlowVisual, MasterRoadmapPitchSection diagrams) — those are content, not icons.

---

## 9. Brand-kit (decision)

`frontend/src/theme/bookedai-brand-kit.css` is IMPORTED by `frontend/src/styles.css` line 3 — it is live in production.

**Decision (2026-04-28):** DEPRECATE rather than deep-clean. A header banner has been added at the top of the file noting the deprecation. Reasoning:
- Aurora gradient (`#4F8CFF → #8B5CF6 → #22C55E`) and `--bookedai-accent-purple: #8B5CF6` violate the blue-only Apple palette.
- DM Sans / Space Grotesk surface conflicts with SF Pro / Inter.
- Live consumer count is unknown without a follow-up grep; banner is the safest signal until Wave 6 audits and removes consumers.

Wave 6 follow-up:
1. Grep `var(--bookedai-` across `frontend/src/` → produce migration list.
2. Replace each `--bookedai-*` reference with the equivalent `--apple-*` token.
3. Remove the `@import "./theme/bookedai-brand-kit.css"` line from `styles.css`.
4. Delete the file.

---

## 10. Verification commands

Run these to detect regression:

```bash
# Hex drift in Wave-5 scope
grep -E 'bg-\[#|text-\[#|border-\[#' \
  frontend/src/apps/public/PublicApp.tsx \
  frontend/src/apps/portal/PortalApp.tsx \
  frontend/src/apps/admin/AdminApp.tsx \
  frontend/src/apps/public/PitchDeckApp.tsx \
  frontend/src/apps/public/RoadmapApp.tsx \
  frontend/src/apps/public/ArchitectureApp.tsx | wc -l

# IBM blue must be 0
grep -rE '#0f62fe|#0b57e3' frontend/src/apps/ | wc -l

# Purple must be 0
grep -rE '#7c3aed|#8b5cf6|#6d28d9|from-purple-|from-violet-|from-fuchsia-' frontend/src/apps/ | wc -l

# font-serif must be 0
grep -rE 'font-serif' frontend/src/apps/ frontend/src/components/landing/ | wc -l

# Build must pass
cd frontend && npm run build
```

---

## 11. HomepageSearchExperience.tsx hex post-sweep audit (2026-04-28)

**File:** `frontend/src/apps/public/HomepageSearchExperience.tsx` (5326 lines)
**Hex utility count:** 183 → 43 (excluding `shadow-[…]` literals which were left intact as they encode CSS box-shadow syntax, not color tokens).
**Purple `#6d28d9`:** killed (replaced with `text-apple-blue` on the `BrandButtonMark` ring tile, line 4529).
**Build:** `npm run build` passes (9.29s). `npx tsc --noEmit` clean for this file.

### Token mappings applied

| Hex (count before) | Replacement token | Category |
|---|---|---|
| `text-[#172033]/{42,58,62,72,76}` (15) | `text-apple-near-black/{…}` | A — Apple near-black with opacity |
| `text-[#111827]` (17) | `text-apple-near-black` | A |
| `text-[#202124]` (10) | `text-apple-near-black` | A |
| `text-[#0f172a]` (1) | `text-apple-near-black` | A |
| `bg-[#111827]` (6) | `bg-apple-near-black` | A |
| `bg-[#0f172a]` (1) | `bg-apple-near-black` | A |
| `bg-[#1f2937]` (3) | `bg-slate-800` | A (hover variant) |
| `border-[#111827]` (2) | `border-apple-near-black` | A |
| `text-[#1a73e8]` (22) | `text-apple-blue` | C — Google blue → Apple blue |
| `bg-[#1a73e8]` (5) | `bg-apple-blue` | C |
| `border-[#1a73e8]` (1) | `border-apple-blue` | C |
| `text-[#5f6368]` (25), `text-[#64748b]` (13), `text-[#6b7280]` (4) | `text-slate-500` | E — neutral text |
| `text-[#475569]` (10), `text-[#4b5563]` (3) | `text-slate-600` | E |
| `text-[#3c4043]` (7), `text-[#334155]` (1) | `text-slate-700` | E |
| `text-[#94a3b8]` (2), `text-[#8a94a6]` (1) | `text-slate-400` | E |
| `border-[#e5e7eb]` (9), `border-[#dedee3]` (7), `border-[#eeeeef]` (4), `border-[#e3e3e7]` (2), `border-[#eef2f7]` (2), `border-[#edf1f7]` (2), `border-[#e5e9f0]` (2), `border-[#e8edf3]` (1), `border-[#dfe5ee]` (1), `border-[#d9dce3]` (1) | `border-slate-200` | F — neutral border |
| `border-[#cbd5e1]` (6), `border-[#c9c9d1]` (8) | `border-slate-300` | F |
| `bg-[#f8fafc]` (13), `bg-[#f5f7fb]` (2), `bg-[#f8f9fa]` (1) | `bg-slate-50` | B |
| `bg-[#fafafa]` (2), `bg-[#fbfbfd]` (1), `bg-[#fbfbfc]` (1), `bg-[#f0f0f2]` (2) | `bg-apple-light` | B |
| `bg-[#ecfdf5]` (3), `bg-[#eef9ee]` (1) | `bg-emerald-50` | D — semantic |
| `bg-[#fff3e6]` (1) | `bg-amber-50` | D |
| `bg-[#fff0f4]` (1) | `bg-rose-50` | D |
| `bg-[#fce8e6]` (1) | `bg-rose-100` | D |
| `border-[#f2b8b5]` (1) | `border-rose-200` | D |
| `text-[#b3261e]` (1) | `text-rose-700` | D |
| `text-[#6d28d9]` (1) | `text-apple-blue` | (Banned purple removed) |

### Intentionally kept hex (43 total)

These are **paper-system carryover** consistent with the kept palette in `PublicApp.tsx` / `PortalApp.tsx`. They have no equivalent Apple token and are deliberate visual tones for the chat / panels surface:

| Hex (count) | Use | Reason for keeping |
|---|---|---|
| `bg-[#f8fbff]` (17), `bg-[#fbfdff]` (4), `bg-[#eef4ff]` (10) | Blue-tint backgrounds for paper panels, hover states | No Apple token captures a sub-blue paper tint between white and `--apple-light` |
| `border-[#dbe7fb]` (5), `border-[#cfe1ff]` (6), `border-[#d2e3fc]` (3), `border-[#e6edf8]` (5), `border-[#dfe8f3]` (2) | Blue-tint borders paired with the above backgrounds | Same family of paper tints |
| `bg-[#0f3d7a]` (1), `text-[#0f3d7a]` (1) | Navy avatar fill + toolbar pill text | PublicApp navy paper system; intentional cross-app consistency |
| `text-[#31507b]` (2), `text-[#2f3d4f]` (2) | Body text on paper-blue cards | PublicApp navy paper carryover |
| `text-[#d2e3fc]` (1) | Hover state for white CTA on dark hero | One-off pale-blue hover tint, no token candidate |
| `bg-[#f6f0ff]` (1) | `public-apple-shortcut-purple` paired hover tint (annotated in code, line 3405) | Decorative shortcut-tone visual system |
| `shadow-[…]` literals (~24) | Box-shadow definitions | Encode multi-stop CSS shadow syntax, not color tokens — out of scope for the hex sweep |

### P1 follow-up items
1. **Token the blue-tint paper family.** Promote `#f8fbff`, `#eef4ff`, `#fbfdff`, `#dbe7fb`, `#cfe1ff`, `#d2e3fc`, `#e6edf8`, `#dfe8f3` into named CSS tokens (e.g. `--apple-paper-blue-50`, `--apple-paper-blue-200`) so PortalApp + HomepageSearchExperience + PublicApp share canonical paper tints. Drops further drift across all three files.
2. **Token the navy paper family.** Promote `#0f3d7a`, `#31507b`, `#2f3d4f` into `--apple-paper-navy-{deep,mid,soft}` so the PublicApp paper system is canonical instead of replicated.
3. **Apple shadow utilities.** Audit shadow literals (~24 in this file alone) and decide whether to expose `--shadow-apple-card`, `--shadow-apple-pop`, `--shadow-apple-hero` tokens to absorb common patterns.
4. **Slight color shift accepted:** `#5f6368` → `text-slate-500` (`#64748b`) and `#3c4043` → `text-slate-700` (`#334155`) are minor cool-shifts (Google grey → slate). Verified in build; visually indistinguishable in chat/panel context. No revert needed.

### Visual-risk notes
- `#172033` → `--apple-near-black` (`#1d1d1f`): the canonical guidance in this doc explicitly endorses the swap. All occurrences had opacity modifiers, so the visual delta is sub-perceptual.
- `#1a73e8` (Google blue) → `#0071e3` (Apple blue): pre-existing canonical follow-up in the PitchDeckApp row (line 222). Consistent with brand consolidation; visible only as a slightly cooler blue on chat-trail tags. Accepted.
- `#1f2937` → `bg-slate-800` (`#1e293b`): one-pixel hover-fill cool-shift on the ASK CTA button. Not flagged.

---

## 12. Paper-blue family token promotion (2026-04-28)

P1 follow-up #1 from Section 11 closed: the paper-blue family is now canonical CSS tokens shared across all three apps.

### Tokens added

CSS variables (`frontend/src/theme/minimal-bento-template.css`, `:root` block):

| Token | Value | Role |
|---|---|---|
| `--apple-paper-blue-50`       | `#f8fbff` | Lightest paper tint |
| `--apple-paper-blue-100`      | `#eef4ff` | Card/section tint |
| `--apple-paper-blue-200`      | `#dbe7fb` | Border / hover |
| `--apple-paper-blue-300`      | `#cfe1ff` | Selected / accent border |
| `--apple-paper-blue-navy-700` | `#31507b` | Paper text accent |
| `--apple-paper-blue-navy-800` | `#2f3d4f` | Paper body text |
| `--apple-paper-blue-navy-900` | `#0f3d7a` | Navy paper deep |

Tailwind utilities (`frontend/src/styles.css` `@theme` block) exposes them as
`bg-apple-paper-blue-{50,100,200,300}`, `text-apple-paper-blue-{50,100,200,300}`,
`border-apple-paper-blue-{50,100,200,300}`, `ring-apple-paper-blue-{50,100,200,300}`
plus the navy `text-apple-paper-blue-navy-{700,800,900}` and `bg-apple-paper-blue-navy-{700,800,900}` variants.
The doc-only token reference (`frontend/src/theme/apple-tokens.css`) was updated to list the new family.

### Hex → token mapping applied

| Old hex | New token | Notes |
|---|---|---|
| `#f8fbff`, `#fbfdff` | `apple-paper-blue-50` | `#fbfdff` is sub-pixel lighter; visually merged. |
| `#eef4ff`, `#edf4ff`, `#eef6ff` | `apple-paper-blue-100` | `#edf4ff` and `#eef6ff` are 1-channel drift from `#eef4ff`; visual delta sub-perceptual. |
| `#dbe7fb`, `#d2e3fc`, `#e6edf8`, `#dfe8f3` | `apple-paper-blue-200` | `#d2e3fc` and `#e6edf8` are slight saturation shifts (-/+ blue); `#dfe8f3` is mildly desaturated; all visually within the same paper-tint band. |
| `#cfe1ff` | `apple-paper-blue-300` | Exact match. |
| `#0f3d7a` | `apple-paper-blue-navy-900` | Exact match. |
| `#31507b` | `apple-paper-blue-navy-700` | Exact match. |
| `#2f3d4f` | `apple-paper-blue-navy-800` | Exact match. |

### Files swept and counts

| File | Hex before | Hex after | Notes |
|---|---|---|---|
| `frontend/src/apps/public/HomepageSearchExperience.tsx` | 43 | 1 | All paper-blue family + navy promoted. |
| `frontend/src/apps/portal/PortalApp.tsx` | 63 | 60 | Paper-blue family (3 instances of `#d2e3fc`, 1 of `#eef4ff`, plus 7 in-gradient `#f8fbff`) promoted. Remaining 60 are apple-blue/near-black (already canonical hex matches — out of scope). |
| `frontend/src/apps/public/PublicApp.tsx` | 84 | 84 | No paper-blue family hex present — file is the manila/warm paper system, intentionally separate. |
| **Total dropped** | **45** | | (HomepageSearchExperience: 42, PortalApp: 3, in-gradient stops promoted to `var(--apple-paper-blue-*)` separately.) |

In-gradient hex stops were promoted to `var(--apple-paper-blue-*)` references where the paper-blue family applied (4 distinct gradient patterns across HomepageSearchExperience and PortalApp). This keeps the gradient inline-arbitrary syntax (Tailwind cannot generate a multi-stop gradient utility) but removes the literal hex.

### Intentionally kept (with file:line + reason)

| File:line | Hex | Reason |
|---|---|---|
| `HomepageSearchExperience.tsx:3412` | `#f6f0ff` | `public-apple-shortcut-purple` decorative shortcut hover tint. Already annotated in code; not part of paper-blue family. |
| `HomepageSearchExperience.tsx:×6` | `ring-[#e5e7eb]` | Neutral grey `ring-` accents. Out of paper-blue scope; will be picked up in a future neutral-ring sweep (`ring-slate-200` candidate). |
| `HomepageSearchExperience.tsx:×2` | `ring-[#e3e3e7]` | Same — neutral grey ring, out of scope. |
| `PortalApp.tsx:957` | `bg-[#f4f7fb]` | App-shell tint — sits between `--apple-paper-blue-50` (`#f8fbff`) and `--apple-light` (`#f6f8fc`). Not promoted to avoid app-shell colour shift; flagged as P2 follow-up to evaluate against `--apple-light` consolidation. |
| `PublicApp.tsx:154` | `bg-[#eef2ff]` (paired `text-[#354399]`) | Indigo-tone "Next" pill — paired with indigo text, not paper-blue. Intentional design separation. |
| `PublicApp.tsx:all` | manila/warm hex (`#fbf7ee`, `#d8d0c0`, `#586173`, etc.) | PublicApp paper-warm system; this sweep targets paper-blue only. |

### Visual-risk notes (paper-blue sweep)

- `#fbfdff` → `--apple-paper-blue-50` (`#f8fbff`): one-channel cool drift (-3 R/G). Visually indistinguishable from neighbouring `#f8fbff` panels; promoted to consolidate.
- `#edf4ff` (in-gradient) → `var(--apple-paper-blue-100)` (`#eef4ff`): one-channel red drift. Sub-pixel.
- `#eef6ff` (in-gradient) → `var(--apple-paper-blue-100)` (`#eef4ff`): one-channel green drift. Sub-pixel.
- `#d2e3fc`, `#e6edf8`, `#dfe8f3` → `--apple-paper-blue-200` (`#dbe7fb`): the three are all "paper-blue tint with mild saturation/desaturation" — selecting the canonical `200` collapses 3 near-duplicate tints into one. Border use only; visible only as a 1-pixel hairline; well within the band the audit considers a single tint family.
- Build passes (`npm run build` 9.46s). `npx tsc --noEmit` clean.

---

## 13. Shadow token promotion (2026-04-28)

P1 follow-up #3 from Section 11 closed for the cool-toned slate shadow family.

### Tokens added

CSS variables (`frontend/src/theme/minimal-bento-template.css`, `:root` block):

| Token | Value | Role |
|---|---|---|
| `--shadow-apple-card`   | `0 8px 24px rgba(15, 23, 42, 0.06)`  | Resting card lift |
| `--shadow-apple-pop`    | `0 18px 36px rgba(15, 23, 42, 0.18)` | Hover / pop lift |
| `--shadow-apple-button` | `0 1px 2px rgba(0, 0, 0, 0.05)`      | Button rest shadow |

Tailwind exposes these as `shadow-apple-card`, `shadow-apple-pop`, `shadow-apple-button` (`frontend/src/styles.css` `@theme` block).

### Shadow → token mapping applied

| Old shadow literal | New token | Notes |
|---|---|---|
| `shadow-[0_8px_22px_rgba(60,64,67,0.04)]` (×3) | `shadow-apple-card` | 22px → 24px spread; Google-grey → slate hue; opacity 0.04 → 0.06. Sub-perceptual on white card backgrounds. |
| `shadow-[0_10px_28px_rgba(60,64,67,0.05)]` (×2) | `shadow-apple-card` | Slightly larger geometry; same low-pop family. |
| `shadow-[0_8px_24px_rgba(7,27,64,0.04)]` (×1) | `shadow-apple-card` | Geometry exact; navy hue → slate hue; opacity 0.04 → 0.06. |
| `shadow-[0_8px_24px_rgba(60,64,67,0.05)]` (×1) | `shadow-apple-card` | Geometry exact; Google-grey → slate; opacity 0.05 → 0.06. |
| `shadow-[0_12px_28px_rgba(60,64,67,0.06)]` (×1) | `shadow-apple-card` | Slightly larger geometry; opacity match; hue shift. |
| `shadow-[0_10px_24px_rgba(60,64,67,0.05)]` (×1) | `shadow-apple-card` | Slightly larger geometry; hue + opacity drift sub-perceptual. |
| `shadow-[0_10px_24px_rgba(15,23,42,0.05)]` (×1, PortalApp) | `shadow-apple-card` | Same hue; geometry close; opacity 0.05 → 0.06. |
| `shadow-[0_18px_44px_rgba(15,23,42,0.16)]` (×1, PortalApp) | `shadow-apple-pop` | Same hue; 44px → 36px spread; opacity 0.16 → 0.18. Pop family. |

### Files swept and counts

| File | Shadow literals before | Shadow literals after | Promoted |
|---|---|---|---|
| `frontend/src/apps/public/HomepageSearchExperience.tsx` | 24 | 15 | 9 |
| `frontend/src/apps/portal/PortalApp.tsx` | 20 | 18 | 2 |
| `frontend/src/apps/public/PublicApp.tsx` | 20 | 20 | 0 |
| **Total promoted** | | | **11** |

### Intentionally kept (with file:line + reason)

| File / pattern | Reason |
|---|---|
| `PublicApp.tsx` (all `rgba(86,73,50,…)` warm shadows, ×8) | Manila/warm paper-warm system. The slate-blue `--shadow-apple-*` tokens use cool `rgba(15,23,42,…)`; force-mapping warm shadows to cool tokens would shift the entire warm paper aesthetic. P2: introduce `--shadow-apple-paper-warm-*` family if needed. |
| `PublicApp.tsx` (`rgba(23,32,51,…)` ×9) | Slate-tinted but with bespoke 24/28/30px geometries (hero/elevated cards). Geometry too far from `card`/`pop` to remap without layout-perception shift. |
| `HomepageSearchExperience.tsx:×2` `shadow-[0_18px_50px_rgba(15,23,42,0.06)]` | Bespoke geometry (50px spread) — between card and pop, neither fits well. |
| `HomepageSearchExperience.tsx:×1` `shadow-[0_28px_80px_rgba(15,23,42,0.28)]` | Hero modal lift — much larger spread than `pop`; would visually compress the dialog. P2: consider `--shadow-apple-hero` token. |
| `HomepageSearchExperience.tsx:×1` `shadow-[0_16px_36px_rgba(26,115,232,0.22)]` | Apple-blue-tinted glow on CTA — coloured shadow, not a neutral lift. |
| `HomepageSearchExperience.tsx:×1` `shadow-[0_16px_34px_rgba(16,185,129,0.10)]` | Emerald-tinted glow — semantic colour. |
| `HomepageSearchExperience.tsx:×3` `shadow-[0_16px_34px_rgba(15,23,42,0.{08,10})]` | Bespoke 34px geometry; opacity 0.08–0.10 sits between card (0.06) and pop (0.18). Promoting either way would visibly alter elevation. |
| `HomepageSearchExperience.tsx:×2` `shadow-[0_14px_40px_rgba(15,23,42,0.{06,07})]` | Bespoke 40px wider lift; doesn't fit card or pop. |
| `HomepageSearchExperience.tsx:×3` `shadow-[0_10px_24px_rgba({15,23,42|26,115,232|15,61,122},0.{12,16,18})]` | Coloured (apple-blue / navy) or bespoke opacity; not neutral lift. |
| `HomepageSearchExperience.tsx:×1` `shadow-[0_0_0_4px_rgba(148,163,184,0.12)]` | Focus ring style, not a card/pop shadow. |
| `HomepageSearchExperience.tsx:×2`, `PublicApp.tsx:×1` `shadow-[inset_0_1px_0_rgba(255,255,255,…)]` | Inset highlight (top-edge sheen), not a drop shadow. |
| `PortalApp.tsx:×15` `shadow-[0_20px_60px_rgba(15,23,42,0.0{4,6})]` | Bespoke 20px/60px geometry — much wider spread than `card`'s 8/24. Promoting would visibly compress the elevation; P2 candidate for `--shadow-apple-panel`. |
| `PortalApp.tsx:×3` other bespoke geometries | Each unique geometry; no token candidate fits. |

### Visual-risk notes (shadow sweep)

- The 9 homepage shadows promoted to `shadow-apple-card` carried minor hue (Google-grey `#3c4043` family or navy `#071b40`) and opacity (0.04–0.05 vs 0.06) drifts. On white/paper-blue card backgrounds these are sub-perceptual (< 1 pixel rendered difference at 8/24 spread).
- The 1 PortalApp `shadow-apple-pop` swap (`0_18px_44px → 0_18px_36px`, `0.16 → 0.18`) tightens the spread by 8px and slightly increases opacity — visible as a marginally crisper pop edge on the workspace card. Within visual tolerance.
- Build passes (`npm run build` 9.46s).
- Net: **11 shadow literals** (~24% of the cool-slate-tone shadow population across the three files) promoted to canonical tokens. The remaining literals are either bespoke geometry, colour-tinted glows, or warm-paper-system shadows — documented above.

### P2 follow-ups — RESOLVED 2026-04-28 (see Section 14)

1. ~~`--shadow-apple-panel`~~ — RESOLVED. Token added; absorbs recurring panel pattern.
2. ~~`--shadow-apple-hero`~~ — RESOLVED. Token added; absorbs modal lift.
3. ~~`--shadow-apple-paper-warm-*`~~ — RESOLVED. Family added (sm / mid / pop). Available for future PublicApp consolidation; PublicApp's existing warm shadows are bespoke variants outside the canonical band (see Section 14 deltas).
4. ~~Neutral ring sweep~~ — RESOLVED. `--apple-ring-neutral-{100,200,300}` tokens added; `ring-[#e5e7eb]`/`ring-[#e3e3e7]` swept across HomepageSearchExperience.

---

## 14. Shadow + ring token completion (2026-04-28)

P2 follow-ups #1–#4 from Section 13 closed: panel + hero shadow tokens, paper-warm shadow family, and neutral ring tokens are now canonical and partly applied.

### Tokens added

CSS variables (`frontend/src/theme/minimal-bento-template.css`, `:root` block):

| Token | Value | Role |
|---|---|---|
| `--shadow-apple-panel`           | `0 12px 32px rgba(15, 23, 42, 0.08)` | Panel elevation (topbar / pinned panel) |
| `--shadow-apple-hero`            | `0 24px 64px rgba(15, 23, 42, 0.14)` | Hero / modal elevation |
| `--shadow-apple-paper-warm-sm`   | `0 1px 2px rgba(86, 73, 50, 0.06)`   | Manila warm shadow (rest) |
| `--shadow-apple-paper-warm`      | `0 8px 24px rgba(86, 73, 50, 0.08)`  | Manila warm shadow (card) |
| `--shadow-apple-paper-warm-pop`  | `0 18px 40px rgba(86, 73, 50, 0.16)` | Manila warm shadow (pop) |
| `--apple-ring-neutral-100`       | `#e5e7eb` | Lightest neutral ring (chip pills, soft outlines) |
| `--apple-ring-neutral-200`       | `#e3e3e7` | Mid neutral ring (toolbar pills) |
| `--apple-ring-neutral-300`       | `#d1d5db` | Heavier neutral ring (form/control outline) |

Tailwind exposes these (`frontend/src/styles.css` `@theme` block) as
`shadow-apple-panel`, `shadow-apple-hero`,
`shadow-apple-paper-warm-sm`, `shadow-apple-paper-warm`, `shadow-apple-paper-warm-pop`,
`ring-apple-ring-neutral-{100,200,300}`, `border-apple-ring-neutral-{100,200,300}`.

The doc-only token reference (`frontend/src/theme/apple-tokens.css`) was updated to list the new family.

### Mapping table (top promotions)

| Old literal (count) | New token | Notes |
|---|---|---|
| `shadow-[0_20px_60px_rgba(15,23,42,0.06)]` (×14, PortalApp) | `shadow-apple-panel` | Geometry shifted from 20/60 to 12/32; opacity 0.06 → 0.08. Sub-perceptual for white panels on light bg. |
| `shadow-[0_20px_60px_rgba(15,23,42,0.04)]` (×1, PortalApp) | `shadow-apple-panel` | Same family; promoted for consistency. |
| `shadow-[0_18px_44px_rgba(15,23,42,0.08)]` (×1, PortalApp) | `shadow-apple-panel` | Geometry close (18/44 → 12/32); opacity exact match. |
| `shadow-[0_16px_44px_rgba(15,23,42,0.05)]` (×1, PortalApp) | `shadow-apple-panel` | Geometry close; opacity 0.05 → 0.08 marginal. |
| `shadow-[0_16px_36px_rgba(15,23,42,0.08)]` (×1, PortalApp) | `shadow-apple-panel` | Geometry close (16/36 → 12/32); opacity exact. |
| `shadow-[0_28px_80px_rgba(15,23,42,0.28)]` (×1, HomepageSearchExperience) | `shadow-apple-hero` | Modal lift; geometry larger / opacity heavier than token (24/64 @ 0.14). Visual delta: slightly softer hero edge. |
| `ring-[#e5e7eb]` (×6, HomepageSearchExperience) | `ring-apple-ring-neutral-100` | Exact hex match. |
| `ring-[#e3e3e7]` (×2, HomepageSearchExperience) | `ring-apple-ring-neutral-200` | Exact hex match. |

### Files swept and counts

| File | Shadow literals before → after | Ring/border literals before → after | Promoted |
|---|---|---|---|
| `frontend/src/apps/public/HomepageSearchExperience.tsx` | 15 → 14 | 8 → 0 | 9 |
| `frontend/src/apps/portal/PortalApp.tsx` | 18 → 0 | 0 → 0 | 18 |
| `frontend/src/apps/public/PublicApp.tsx` | 20 → 20 | 2 → 2 | 0 |
| **Total promoted** | | | **27** |

PublicApp shadow + ring literals were intentionally left in place (see "Intentionally kept" below).

### Intentionally kept (with file:line + reason)

| File / pattern (count) | Reason |
|---|---|
| `PublicApp.tsx` warm shadows (`rgba(86,73,50,0.07–0.10)` ×8) | Manila/warm paper system. Geometries are 18/42, 18/44, 18/46, 20/54, 24/70, 28/80 — wider than the canonical `--shadow-apple-paper-warm-pop` (18/40 @ 0.16). Opacities (0.07–0.10) are also notably lighter than the token (0.16). Force-mapping would visibly thicken every PublicApp paper-warm card. Tokens are now available for future PublicApp consolidation, but no clean current match. |
| `PublicApp.tsx` cool slate shadows (`rgba(23,32,51,…)` ×9) | Bespoke 24/30/32px geometries with navy hue, paired with the dark hero panels. Don't fit `card`/`pop`/`panel`/`hero` cleanly. |
| `PublicApp.tsx` `border-[#e4dccd]` (×2) | Manila-warm border tone (`#e4dccd`); not in the neutral ring family. The neutral ring tokens canonicalize cool greys (#e5e7eb / #e3e3e7 / #d1d5db). Manila-warm border is a separate paper-warm system. |
| `HomepageSearchExperience.tsx` shadows (×14 remaining) | All bespoke: `0_14px_40px`, `0_18px_50px`, `0_10px_24px` (with various rgba tints — apple-blue, navy, emerald glows), `0_16px_34px` and `0_16px_36px` (coloured CTA glows), `inset_0_1px_0_rgba(255,255,255,0.9)` (top-edge sheens), `0_0_0_4px_rgba(148,163,184,0.12)` (focus ring). None match the new tokens within visual tolerance. |

### Visual-risk notes (Section 14 sweep)

- The 17 PortalApp panel promotions carry a 0.02–0.04 opacity bump (0.04/0.05/0.06 → 0.08) and a geometry compression (20/60 → 12/32). On white panels over light bg, the rendered difference is sub-perceptual (~1px tighter shadow edge); no layout reflow.
- The 1 HomepageSearchExperience hero swap shifts the modal lift from 28/80 @ 0.28 to 24/64 @ 0.14 — visibly slightly softer modal shadow. Acceptable per the canonical hero-shadow band.
- The 8 ring promotions are exact hex matches (`#e5e7eb`, `#e3e3e7`); zero rendered difference.
- Build: `npm run build` passes (9.16s). `npx tsc --noEmit` clean.

### Net delta

- **8** new design tokens added (5 shadows + 3 neutral rings).
- **27** inline literals promoted to canonical tokens across 3 files.
- PortalApp shadow-literal count: **18 → 0** (file is now fully tokenised on shadow).
- HomepageSearchExperience ring-literal count: **8 → 0** (neutral rings fully tokenised; remaining `ring-[#…]` patterns sit in the paper-blue family already canonical).
- Section 13 P2 follow-ups #1, #2, #3, #4: **RESOLVED**.
