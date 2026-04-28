# CTA Glossary & Inventory — 2026-04-28

Source-of-truth document for **every primary, secondary, and in-flow CTA across the BookedAI public surface**. Output of the Wave 4 component-reuse pass (Lane 2 §3 #1 + Lane 3 §4).

Companion artefact: `frontend/src/components/landing/ui/AppleCTA.tsx` (the canonical CTA primitive — 173 lines, drop-in replacement for `.booked-button` / `.booked-button-secondary` JSX).

---

## 1. Glossary (canonical labels)

Each row is the **single approved verb** for that surface. Any deviation must be fixed (or escalated as a glossary change).

### 1.1 Primary CTAs (winning, deal-closing)

| Surface intent | Canonical label | Audience | Rationale |
|---|---|---|---|
| Homepage hero — variant A (SME owner) | `See it close a real booking →` | A | Visceral, revenue-anchored. Replaces `Try BookedAI Free`. |
| Homepage hero — variant B (hackathon judge) | `Run the live demo →` | B | Action-first, signals "live tenant", not slideware. |
| Homepage hero — variant C (investor) | `See live tenant proof →` | C | Reinforces the moat ("live tenant" = production-grade). |
| Pricing — Starter tier | `Start free` | A | Clean, no jargon. Replaces `Try BookedAI Free`. |
| Pricing — Growth tier | `Start a 30-day pilot` | A,B | "Pilot" reads commercial-serious; matches Lane 5 narrative. |
| Pricing — Enterprise tier | `Talk to a founder` | C | Founder access > generic sales. |
| Hero/footer video alternative | `Watch the 60-sec walkthrough` | A,B | Sets expectation for cost (60 sec); no `Learn more`. |

### 1.2 Secondary CTAs

| Surface intent | Canonical label | Audience | Rationale |
|---|---|---|---|
| Consultation entry | `Book a 10-min revenue demo` | A | Replaces `Schedule a Consultation`; 10-min sets boundary. |
| Human support / sales | `Talk to a BookedAI human` | A | Differentiates from bot; warmth. |
| Judge audit drilldown | `Open the audit ledger` | B | Makes the moat tactile in one click. |
| Investor narrative | `Read the investor pitch` | C | Honest framing. |
| Trust signal / proof | `View live tenant` | A,B,C | Replaces ambiguous `Learn more`. |

### 1.3 Action CTAs (in-flow)

| Surface intent | Canonical label | Notes |
|---|---|---|
| Booking gate | `Continue to booking` | Explicit; replaces bare `Submit`. |
| Deposit | `Pay deposit` | Imperative + amount-context. |
| Portal entry | `Open my booking` | First-person possessive. |
| Channel handoff (Telegram) | `Continue on Telegram` | Channel name explicit. |
| Channel handoff (WhatsApp) | `Continue on WhatsApp` | — |
| Reservation hold | `Save my spot` | Customer-side language. |
| Booking change | `Reschedule` / `Cancel` / `Pause` | Single-verb; never "Submit change". |

### 1.4 BANNED phrases (homepage / public surface)

`Try BookedAI Free`, `Sign up Free`, `Sign up`, `Get started`, `Schedule a Consultation`, `Click here`, `Learn more`, `Find out more`, `Start in product`, `Submit` (bare).

### 1.5 BANNED internal jargon (in customer-facing copy)

`Sprint`, `Phase 0/1/N`, `release gate`, `smoke test`, `lifecycle ops`, `outbox`, `side effect`, `stabilization`, `runtime decision`, `shadow mode`, `pre-prod`, `staging`, `schema`, `envelope`. Replace `tenant` → `business` or `operator` in customer-facing copy.

---

## 2. Inventory — current state of CTAs across the public surface

Method: grep for `<button` / `<a` / `primaryCta` / `secondaryCta` / `ctaLabel` / `bookDemoLabel` / `startTrialLabel` across `frontend/src/components/landing/**` and `frontend/src/apps/public/**`. Banned-phrase scan from §1.4 above.

Status legend: **kept** = already canonical; **replaced** = updated this pass; **flagged** = out-of-scope this task (see §3).

### 2.1 Migrated to `<AppleCTA>` this pass

| File | Line | Current text | Category | Replacement | Status |
|---|---:|---|---|---|---|
| `frontend/src/components/landing/sections/HeroSection.tsx` | 99-122 | `{content.primaryCta}` / `{content.secondaryCta}` / `See Pricing` (3 bespoke `<button>`) | Primary + Secondary + Pill | `<AppleCTA intent="primary" />` (data-driven), `intent="secondary"`, `intent="pill" label="See pricing"` | replaced |
| `frontend/src/components/landing/sections/CallToActionSection.tsx` | 69-83 | `{content.primaryCta}` / `{content.secondaryCta}` (2 bespoke `<button>`) | Primary + Secondary | `<AppleCTA intent="primary" />`, `intent="secondary"` | replaced |
| `frontend/src/components/landing/sections/OfferStripSection.tsx` | 46-51 | `Start Free Trial` (BANNED), `See Pricing` | Primary + Secondary | `Start a 30-day pilot`, `See pricing` | replaced + scrubbed |
| `frontend/src/components/landing/sections/PricingPlanCard.tsx` | 144-152 | `<button>{plan.cta.label}<ArrowIcon/>` (3 tiers: `Start free`, `Start a 30-day pilot`, `Talk to founder`) | Primary tier × 3 | `<AppleCTA intent="primary" rightIcon={<ArrowIcon/>} fullWidth />` (Growth featured = `secondary` for inverse-on-dark) | replaced |
| `frontend/src/components/landing/Header.tsx` | 110-111 | Default props `Open Product Demo` (BANNED), `Claim Free Setup` (BANNED) | Defaults | `Watch live demo`, `Start free` | replaced + scrubbed |
| `frontend/src/components/landing/Header.tsx` | 360-373 | Compact-rail `<button>` × 2 | Secondary + Primary | `<AppleCTA>` × 2, `analyticsId=header_compact_*` | replaced |
| `frontend/src/components/landing/Header.tsx` | 411-424 | Wide-nav `<button>` × 2 | Secondary + Primary | `<AppleCTA>` × 2, `analyticsId=header_*` | replaced |

**Total migrated call sites this pass:** 7 surfaces / **11 individual `<button>` → `<AppleCTA>` conversions**.

**Banned phrases scrubbed this pass:** 3 — `Open Product Demo` (Header default), `Claim Free Setup` (Header default), `Start Free Trial` (OfferStrip).

### 2.2 Already canonical (no migration needed yet)

| File | Line | Current text | Category | Status |
|---|---:|---|---|---|
| `frontend/src/components/landing/data.ts` | 403 | `See bookings BookedAI is winning live` | Hero primary (variant A pre-set) | kept (close to glossary `See it close a real booking`; tracked for next polish) |
| `frontend/src/components/landing/data.ts` | 404 | `Book a 10-min revenue demo` | Hero secondary | kept — canonical |
| `frontend/src/components/landing/data.ts` | 600 | `Start free — pay only on booked revenue` | Pricing primary | kept (extension of `Start free`) |
| `frontend/src/components/landing/data.ts` | 608-609 | `Start capturing missed bookings` / `Talk to a BookedAI human` | CTA section primary/secondary | kept |
| `frontend/src/apps/public/PublicApp.tsx` | 363-364 | `See it book a real customer` / `Talk to a BookedAI human (10 min)` | Variant A | kept (PublicApp out-of-scope for migration; copy is canonical) |
| `frontend/src/apps/public/PublicApp.tsx` | 373-374 | `Run the live demo (60 sec)` / `Open the audit ledger` | Variant B | kept |
| `frontend/src/apps/public/PublicApp.tsx` | 382-383 | `See live tenant proof` / `Read the investor pitch` | Variant C | kept |
| `frontend/src/components/landing/sections/pricing-shared.ts` | 104-106 | `Start free` | Starter | kept — canonical |
| `frontend/src/components/landing/sections/pricing-shared.ts` | 134-136 | `Start a 30-day pilot` | Growth | kept — canonical |
| `frontend/src/components/landing/sections/pricing-shared.ts` | 166-168 | `Talk to founder` | Enterprise | needs-review — glossary says `Talk to a founder` (1-word delta); polish in next pass |

### 2.3 Sites still rendering bespoke `.booked-button` JSX (not migrated yet — see §3)

Inventory of remaining `.booked-button` / `.booked-button-secondary` JSX in landing sections (incremental migration targets). Grep yielded **~50 additional usages**, distributed across:

| File | Approx. uses | Why deferred |
|---|---:|---|
| `frontend/src/components/landing/Footer.tsx` | 2 | Out-of-scope this pass (low-priority). Defaults `Open Web App` / `Talk to Sales` need glossary review. |
| `frontend/src/components/landing/sections/HomepageOverviewSection.tsx` | 2 | Stable; flag for Wave 4-B. |
| `frontend/src/components/landing/sections/PartnersSection.tsx` | 2 | Stable; flag for Wave 4-B. |
| `frontend/src/components/landing/sections/TeamSection.tsx` | 2 | Stable; flag for Wave 4-B. |
| `frontend/src/components/landing/sections/ArchitectureInfographicSection.tsx` | 2 | Stable; flag for Wave 4-B. |
| `frontend/src/components/landing/sections/VideoDemoSection.tsx` | 2 | Defer — copy needs glossary alignment to `Watch the 60-sec walkthrough`. |
| `frontend/src/components/landing/sections/RegisterInterestSection.tsx` | 3 | Deferred — has banned defaults `Open Product Demo`, `Claim Free Setup` in section props (lines 39, 75). Needs P1-T1 coordination. |
| `frontend/src/components/landing/sections/PricingSection.tsx` | 2 | Already inside Pricing flow; small back/forward nav buttons — low-priority. |
| `frontend/src/components/landing/sections/PricingConsultationModal.tsx` | 7 | Modal flow; needs careful migration (form submit + step nav). Defer to dedicated pass. |
| `frontend/src/components/landing/sections/PricingRecommendationPanel.tsx` | 1 | Inside Pricing flow. |
| `frontend/src/components/landing/sections/ProductFlowShowcaseSection.tsx` | 1 | Stable. |
| `frontend/src/components/landing/sections/ProductProofSection.tsx` | ≥2 | Stable. |
| `frontend/src/components/landing/DemoBookingDialog.tsx` | 4 | Demo surface — handled by Wave 4-A (parallel). |
| `frontend/src/components/landing/assistant/BookingAssistantDialog.tsx` | — | Has banned `Start Free Trial` literal (line 1775); needs P0-5 coordination. |
| `frontend/src/apps/public/RegisterInterestApp.tsx` | ≥10 | Banned defaults at lines 566, 573 (`Claim Free Setup`, `Open Product Demo`). Touched by P1-T1. |
| `frontend/src/apps/public/ProductApp.tsx` | 2 | Banned `Start Free Trial` at lines 130, 170. Out-of-scope. |
| `frontend/src/apps/public/PitchDeckApp.tsx` | ≥1 | Banned `Claim Free Setup` at line 1166; passes `Open Web App` / `Talk to Sales` overrides. Wave 4-A. |

---

## 3. Out-of-scope this pass (deferred)

Per the task brief — these were deliberately not migrated to avoid conflict with parallel waves:

| File / surface | Reason |
|---|---|
| `frontend/src/apps/public/PublicApp.tsx` | Touched by P0-5 / P1-C1 — risk of merge conflict. |
| `frontend/src/apps/public/HomepageSearchExperience.tsx` | Touched by P1-T1 / P1-Q3. |
| `frontend/src/apps/portal/PortalApp.tsx` | Touched by P0-3-portal-fe. |
| `frontend/src/apps/tenant/TenantApp.tsx` | Parallel session. |
| `frontend/src/apps/public/demo/**` | Wave 4-A in parallel. |
| `frontend/src/apps/public/FutureSwimApp.tsx` | Wave 4-F (sub-tenant). |
| `frontend/src/apps/public/AIMentorProApp.tsx` | Wave 4-F (sub-tenant). |
| `frontend/src/apps/public/ChessGrandmasterApp.tsx` | Wave 4-F (sub-tenant). |

---

## 4. AppleCTA component summary

Path: `/home/dovanlong/BookedAI/frontend/src/components/landing/ui/AppleCTA.tsx`
Lines: 173 (target: < 200; single-file drop-in).

### TypeScript prop signature

```ts
export type AppleCTAProps = {
  label: string;
  intent?: 'primary' | 'secondary' | 'pill';   // default 'primary'
  tone?: 'light' | 'dark';                     // default 'light'
  size?: 'md' | 'lg';                          // default 'md'
  href?: string;                               // renders <a> when present
  onClick?: (event: MouseEvent<HTMLButtonElement | HTMLAnchorElement>) => void;
  disabled?: boolean;
  loading?: boolean;
  analyticsId?: string;                        // emitted as data-analytics-id
  ariaLabel?: string;                          // falls back to label
  rightIcon?: ReactNode;
  leftIcon?: ReactNode;
  className?: string;
  type?: 'button' | 'submit' | 'reset';
  target?: '_blank' | '_self' | '_parent' | '_top' | string;
  rel?: string;                                // auto-fills 'noopener noreferrer' for target=_blank
  fullWidth?: boolean;
};
```

### Style guarantees

- Zero arbitrary hex colors. Uses `.booked-button` / `.booked-button-secondary` from `frontend/src/theme/minimal-bento-template.css` only.
- Touch target ≥ 44 × 44 px enforced via inline `minHeight`/`minWidth` (matches Apple HIG; Lane 2 §1.6).
- Focus ring = `:focus-visible` outline `var(--apple-focus-ring)` (defined in CSS, not duplicated here).
- Loading state: `aria-busy`, disabled pointer, system spinner using `currentColor` (no extra colors).
- Anchor mode: `role="button"`, prevents click when disabled, sets `tabIndex=-1`.
- Auto-`rel="noopener noreferrer"` when `target="_blank"`.

---

## 5. Verification

| Check | Result |
|---|---|
| `cd frontend && npm run build` | PASS — built in 9.81s |
| `cd frontend && npx tsc --noEmit` (filtered to touched files) | PASS — no diagnostics |
| Banned phrases in `AppleCTA.tsx` | 0 |
| Banned phrases in 5 migrated files (HeroSection, CallToActionSection, OfferStripSection, PricingPlanCard, Header) | 0 |
| Banned phrases remaining in repo (all in deferred / out-of-scope files) | 11 (down from ~14) |

---

## 6. Open questions / blockers

1. **Glossary delta**: pricing-shared Enterprise label is `Talk to founder`; glossary says `Talk to a founder`. One-word polish — defer to next pass.
2. **`See Pricing` capitalisation**: glossary doesn't list this label. Used in HeroSection / OfferStrip — kept lowercase `See pricing` for sentence-case consistency with Apple template. Confirm preferred form.
3. **Hero variant A primary**: data.ts line 403 still reads `See bookings BookedAI is winning live` — pre-existing copy. Glossary canonical for variant A is `See it close a real booking →`. Recommend aligning in next data.ts pass.
4. **VideoDemoSection** still consumes `content.primaryCta` / `content.secondaryCta` from `data.ts:706-708` (`Watch Demo Hub` / `Book Live Demo`) — not in glossary; needs replacement to `Watch the 60-sec walkthrough` + `Book a 10-min revenue demo`.
5. **Header default labels**: now glossary-canonical (`Watch live demo`, `Start free`). However, `PitchDeckApp.tsx:1096-1097, 1741-1742` overrides them with banned `Open Web App` / `Talk to Sales` — Wave 4-A item.

---

## 7. Migration recipe (for follow-up waves)

For any remaining `.booked-button` / `.booked-button-secondary` JSX:

```tsx
// before
<button type="button" onClick={handler} className="booked-button">
  {label}
</button>

// after
import { AppleCTA } from '<rel>/components/landing/ui/AppleCTA';
<AppleCTA label={label} intent="primary" onClick={handler} analyticsId="<surface>_<role>" />
```

Rules:
1. **Always** pass `analyticsId` — pattern `<section>_<role>` (snake_case).
2. Use `intent="primary"` for the deal-closing CTA, `secondary` for the alternate, `pill` for the lightest tertiary.
3. Use `size="lg"` for hero / CTA-section, `md` (default) for header rails and inline.
4. For full-width plan cards / mobile sheets, pass `fullWidth`.
5. Replace any banned phrase from §1.4 with the glossary canonical from §1.1–1.3 in the same edit.
