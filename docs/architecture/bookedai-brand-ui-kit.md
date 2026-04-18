# A. Brand System

Brand:

- `BookedAI.au`
- master positioning: `The AI Revenue Engine for Service Businesses`
- one-liner: `Capture demand from search, website, calls, email, and follow-up — then convert it into bookings and revenue automatically.`
- pricing message: `Setup once. Pay based on performance.`
- differentiator: `Most tools manage conversations. BookedAI.au manages revenue.`

Foundation files:

- `frontend/src/theme/bookedai-brand-kit.css`
- `frontend/src/styles.css`
- `frontend/src/components/brand-kit/*`
- `frontend/public/branding/*`
- `docs/architecture/unified-responsive-theme-system.md`

Brand rules:

- dark-mode first
- investor-grade contrast
- premium SaaS glass surfaces
- dashboard-forward visual hierarchy
- short commercial copy only
- revenue, conversion, follow-up, and visibility over generic AI wording

# B. Logo System

Single source of truth:

- the only approved logo and icon source for every BookedAI surface is now `frontend/public/branding/`
- this folder is the required asset source for all app, web, landing, single-page, admin, product, roadmap, pitch, favicon, PWA, iOS touch icon, and mobile-responsive brand usage
- teams must not introduce a second logo system via remote URLs, inline SVG forks, ad hoc screenshots, or route-local logo exports when an equivalent asset already exists in `frontend/public/branding/`
- when a new logo or icon is approved, it must be added into `frontend/public/branding/` first and then referenced from the shared brand config files, rather than linked directly from one page or one route
- `frontend/src/components/landing/data.ts`, `frontend/src/components/landing/ui/BrandLockup.tsx`, `frontend/src/components/landing/ui/LogoMark.tsx`, and `frontend/src/components/brand-kit/brand.tsx` are the shared code entry points that should resolve assets from this folder

Current approved checked-in assets:

- wordmark on light surfaces: `frontend/public/branding/bookedai-logo-light.png`
- wordmark on dark/gradient surfaces: `frontend/public/branding/bookedai-logo-dark-badge.png`
- black wordmark for light neutral documents/embeds: `frontend/public/branding/bookedai-logo-black.png`
- short mark / compact action icon: `frontend/public/branding/bookedai-mark-gradient.png`
- square app icon master: `frontend/public/branding/bookedai-app-icon-1024.png`
- favicon and responsive app sizes: `frontend/public/branding/bookedai-icon-16.png`, `32`, `48`, `64`, `96`, `180`, `192`, `256`, `512`
- touch/mobile outputs: `frontend/public/branding/bookedai-apple-touch-icon.png`, `frontend/public/branding/bookedai-mobile-icon-192.png`, `frontend/public/branding/bookedai-mobile-icon-512.png`

Legacy asset policy:

- older logo families such as `bookedai-revenue-engine-*`, `bookedai-logo*`, `bookedai-mark*`, `bookedai-unified-logo`, legacy root favicons, and route-local icon files have now been retired from the active asset set
- they should not exist as implementation dependencies in app code, HTML metadata, templates, or docs that describe the current production baseline
- if one of those names appears again in a future change, it should be treated as a regression and removed before release

Logo concept:

- stylized `RE` monogram for `Revenue Engine`
- upward arrow integrated into the mark
- geometric outer panel for product-grade SaaS feel
- wordmark lockup: `BookedAI.au`
- optional descriptor line: `REVENUE ENGINE`
- dark panel should read like a compact revenue dashboard tile rather than a generic badge
- the arrow should communicate booked demand turning into upward revenue movement, not abstract AI motion
- purple should stay secondary as a soft sheen or depth cue, while blue and green carry the main commercial signal
- the mark should remain readable at favicon and compact-nav sizes before decorative detail is added

Recommended usage:

- use `bookedai-logo-dark-badge.png` on dark shells and hero surfaces with full lockup
- use `bookedai-logo-light.png` on white or neutral surfaces
- use `bookedai-mark-gradient.png` for compact nav, button marks, avatar chips, and small action surfaces
- use `bookedai-icon-32.png`, `bookedai-mobile-icon-192.png`, and `bookedai-apple-touch-icon.png` for favicon, PWA, and touch-icon treatments
- use `bookedai-logo-black.png` only for one-color printing, watermarking, or constrained embeds
- use `bookedai-apple-touch-icon.png` for iOS touch-icon treatment rather than reusing older square-logo exports

Safe area rule:

- keep clear space equal to at least `0.5x` of the monogram panel width around the full lockup
- do not crop inside the rounded panel or arrow tip

Favicon guidance:

- use `bookedai-mark-gradient.png` as the compact mark source and ship checked-in raster outputs from `frontend/public/branding/`
- generate `32x32`, `64x64`, `180x180`, and larger responsive outputs from the same icon geometry
- keep the favicon geometry aligned to the live icon asset instead of maintaining a separate simplified symbol

Live implementation baseline:

- `frontend/public/branding/bookedai-icon-32.png`
- `frontend/public/branding/bookedai-mobile-icon-192.png`
- `frontend/public/branding/bookedai-app-icon-1024.png`
- `frontend/public/branding/bookedai-apple-touch-icon.png`
- `frontend/public/branding/bookedai-logo-light.png`
- `frontend/public/branding/bookedai-logo-dark-badge.png`
- `frontend/public/branding/bookedai-mark-gradient.png`

Production status:

- the redesigned revenue-engine logo system was deployed live on `2026-04-18`
- production HTML now points to the versioned checked-in raster icon assets in `frontend/public/branding/` to avoid long-lived cache drift from legacy favicon paths
- `components/brand/logo.tsx` and `frontend/src/components/brand-kit/brand.tsx` now both resolve to the same checked-in raster asset family instead of maintaining divergent inline mark logic
- on `2026-04-18`, the checked-in raster asset family in `frontend/public/branding/` also became the required single-source brand library for all current BookedAI apps and responsive surfaces, with shared route code resolving from that folder instead of mixing remote URLs and per-surface logo variants

# C. CSS Variables

Canonical variables live in:

- `frontend/src/theme/bookedai-brand-kit.css`

Exact tokens:

```css
:root {
  --bookedai-bg: #0B1020;
  --bookedai-bg-soft: #121A2B;
  --bookedai-surface: #182235;
  --bookedai-surface-alt: rgba(255, 255, 255, 0.04);
  --bookedai-border: rgba(255, 255, 255, 0.08);
  --bookedai-text-primary: #F8FAFC;
  --bookedai-text-secondary: #94A3B8;
  --bookedai-primary-blue: #4F8CFF;
  --bookedai-accent-green: #22C55E;
  --bookedai-accent-purple: #8B5CF6;
  --bookedai-warning-amber: #F59E0B;
  --bookedai-danger-red: #EF4444;
  --bookedai-brand-gradient: linear-gradient(135deg, #4F8CFF 0%, #8B5CF6 50%, #22C55E 100%);
  --bookedai-hero-glow: radial-gradient(circle at top left, rgba(79, 140, 255, 0.24), transparent 45%);
  --bookedai-green-glow: radial-gradient(circle at top right, rgba(34, 197, 94, 0.20), transparent 40%);
  --bookedai-font-sans: Inter, sans-serif;
  --bookedai-hero-display: clamp(3rem, 6vw, 5.5rem);
  --bookedai-h1: clamp(2.5rem, 5vw, 4.5rem);
  --bookedai-h2: clamp(2rem, 4vw, 3rem);
  --bookedai-h3: 1.5rem;
  --bookedai-body-lg: 1.125rem;
  --bookedai-body-md: 1rem;
  --bookedai-body-sm: 0.875rem;
  --bookedai-radius-sm: 12px;
  --bookedai-radius-md: 18px;
  --bookedai-radius-lg: 24px;
  --bookedai-radius-xl: 32px;
  --bookedai-radius-pill: 9999px;
  --bookedai-shadow-card: 0 10px 40px rgba(2, 6, 23, 0.38);
  --bookedai-shadow-glow: 0 0 0 1px rgba(255, 255, 255, 0.06), 0 18px 60px rgba(79, 140, 255, 0.14);
  --bookedai-container: 1200px;
  --bookedai-section-y-desktop: 112px;
  --bookedai-section-y-tablet: 88px;
  --bookedai-section-y-mobile: 72px;
}
```

# D. Tailwind Theme Extension

Tailwind bridge lives in:

- `frontend/src/styles.css`
- `tailwind.config.ts`

Exposed utilities:

- `bg-bookedai-bg`
- `bg-bookedai-surface`
- `text-bookedai-text-primary`
- `text-bookedai-text-secondary`
- `text-bookedai-hero-display`
- `rounded-bookedai-lg`
- `shadow-bookedai-card`
- `shadow-bookedai-glow`
- `font-bookedai-sans`

Canonical Tailwind extension:

```ts
import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          bg: "#0B1020",
          bgSoft: "#121A2B",
          surface: "#182235",
          text: "#F8FAFC",
          muted: "#94A3B8",
          blue: "#4F8CFF",
          green: "#22C55E",
          purple: "#8B5CF6",
          amber: "#F59E0B",
          red: "#EF4444",
          border: "rgba(255,255,255,0.08)",
        },
      },
      maxWidth: {
        container: "1200px",
      },
      borderRadius: {
        brand: "24px",
        brandxl: "32px",
      },
      boxShadow: {
        card: "0 10px 40px rgba(2,6,23,0.38)",
        glow: "0 0 0 1px rgba(255,255,255,0.06), 0 18px 60px rgba(79,140,255,0.14)",
      },
      backgroundImage: {
        "brand-gradient":
          "linear-gradient(135deg, #4F8CFF 0%, #8B5CF6 50%, #22C55E 100%)",
        "hero-glow":
          "radial-gradient(circle at top left, rgba(79,140,255,0.24), transparent 45%)",
        "green-glow":
          "radial-gradient(circle at top right, rgba(34,197,94,0.20), transparent 40%)",
      },
      fontFamily: {
        sans: ["Inter", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
```

Recommended Tailwind class usage:

- `bg-brand-bg`
- `bg-brand-surface`
- `text-brand-text`
- `text-brand-muted`
- `border-brand-border`
- `bg-brand-gradient`
- `bg-hero-glow`
- `bg-green-glow`
- `rounded-brand`
- `rounded-brandxl`
- `shadow-card`
- `shadow-glow`
- `max-w-container`

Required import order:

1. `tailwindcss`
2. `minimal-bento-template.css`
3. `bookedai-brand-kit.css`

# E. Component Inventory

Implemented foundation:

- `Container`
- `Section`
- `Grid`
- `Stack`
- `Surface`
- `GlassCard`
- `GradientBorderCard`
- `Logo`
- `LogoIcon`
- `BrandHeading`
- `Eyebrow`
- `GradientText`
- `PrimaryButton`
- `SecondaryButton`
- `GhostButton`
- `IconButton`
- `CTAButtonGroup`
- `Input`
- `Textarea`
- `Select`
- `Checkbox`
- `Toggle`
- `DemoBookingForm`
- `EmailCaptureForm`
- `StatusBadge`
- `ChannelBadge`
- `ProgressBar`
- `StatCard`
- `RevenueCard`
- `MissedRevenueCard`
- `ConversionCard`
- `KPIGrid`

Source:

- `frontend/src/components/brand-kit/index.ts`

Implementation note:

- this list is the actual exported inventory from `frontend/src/components/brand-kit/index.ts`
- Sprint 2 supporting landing primitives such as `SectionCard`, `FeatureCard`, `SectionHeading`, `SignalPill`, and `LogoMark` live under `frontend/src/components/landing/ui/` rather than the reusable brand-kit export surface
- do not treat conceptual examples from this document as already exported unless they exist in `brand-kit/index.ts`

# F. Component Specs

## Foundations

### `Container`

- width cap: `1200px`
- mobile gutter: `16px`
- use for all landing and dashboard frame alignment

### `Section`

- responsive vertical rhythm:
  - mobile: `72px`
  - tablet: `88px`
  - desktop: `112px`

### `GlassCard`

- use for dashboard tiles, pricing cards, attribution cards, and premium landing panels
- background: layered dark glass
- border: `rgba(255,255,255,0.08)`
- shadow: `card`

### `GradientBorderCard`

- use for highlighted revenue cards, active CTA blocks, and premium hero proof surfaces
- border draws from full brand gradient

## Brand

### `Logo`

- supports `dark`, `light`, `white`, `black`, `transparent`, `icon`
- exported source map: `brandLogoSources`
- exported variant type: `BrandLogoVariant`
- exported palette map: `brandColorTokens`

### `BrandHeading`

- use for section-level headlines
- not for hero display scale

### `Eyebrow`

- compact uppercase pill
- supports investor-grade UI labels such as:
  - `Revenue Engine`
  - `Conversion Visibility`
  - `Source Attribution`

## Buttons

### `PrimaryButton`

- use for:
  - `Schedule My Demo`
  - `Get Revenue Demo`
  - `See Revenue Dashboard`

### `SecondaryButton`

- use for:
  - secondary CTA
  - alternate booking actions
  - compare or explore states

### `GhostButton`

- use for table row actions, nav-level actions, and tertiary surfaces

## Forms

### `DemoBookingForm`

- use for sales CTA and consultation flows
- defaults to commercial capture fields instead of generic chat prompts

### `EmailCaptureForm`

- use for waitlist, lead magnet, and early commercial follow-up lanes

## Data and Status

### `RevenueCard`

- label: `Revenue generated`
- use for total revenue or attributed revenue by period

### `MissedRevenueCard`

- label: `Missed revenue`
- use for missed calls value, unanswered enquiry value, and recoverable loss

### `ConversionCard`

- label: `Conversion rate`
- use for:
  - search to enquiry
  - chat to booking
  - call to booking
  - email to booking
  - follow-up recovery

# G. Landing Page Block Specs

Required landing structure:

1. `HeroSection`
2. `TrustBar`
3. `ProblemSection`
4. `HowItWorksSection`
5. `RevenueEngineSection`
6. `IndustrySection`
7. `FeatureGridSection`
8. `DashboardPreviewSection`
9. `PricingSection`
10. `ComparisonSection`
11. `FAQSection`
12. `FinalCTASection`

Copy baseline:

- tagline: `The AI Revenue Engine for Service Businesses`
- hero headline: `Turn Search, Calls, Emails, and Enquiries Into Revenue`
- hero subhead: `BookedAI.au captures demand across search, website, calls, email, and follow-up — then converts it into confirmed bookings and revenue automatically.`
- pricing: `Setup once. Pay based on performance.`
- differentiator: `Most tools manage conversations. BookedAI.au manages revenue.`
- final CTA: `Stop losing revenue to missed calls, slow follow-up, and disconnected customer journeys.`

Hero visual guidance:

- dark investor-grade shell
- main left narrative block
- right-side dashboard stack with:
  - revenue generated
  - bookings generated
  - channel attribution
  - payment succeeded

# H. Dashboard Widget Specs

Required widget set:

- `Revenue Dashboard`
- `Missed Revenue Tracker`
- `Conversion Analytics`
- `Payment Status`
- `Source Attribution`
- `Revenue Recovery Workflows`
- `Commercial Reporting`

Recommended widget blocks:

- `ActivityFeedCard`
- `BookingConfirmedCard`
- `PaymentStatusCard`
- `CommissionSummaryCard`
- `ChannelAttributionCard`
- `ConversionFunnelCard`
- `RevenueTrendCard`
- `MissedOpportunityList`
- `CalendarSyncCard`
- `AIConversationPreviewCard`

Visual rules:

- show outcome first
- keep subcopy short
- use badges instead of paragraph labels
- reserve green only for real success states
- reserve amber for recoverable leakage
- reserve red for confirmed risk or lost value

# I. File / Folder Structure

```text
frontend/
  public/
    branding/
      bookedai-logo-light.png
      bookedai-logo-dark-badge.png
      bookedai-logo-black.png
      bookedai-mark-gradient.png
      bookedai-app-icon-1024.png
      bookedai-icon-32.png
      bookedai-mobile-icon-192.png
      bookedai-apple-touch-icon.png
  src/
    components/
      brand-kit/
        brand.tsx
        buttons.tsx
        foundations.tsx
        forms.tsx
        status.tsx
        utils.ts
        index.ts
    theme/
      bookedai-brand-kit.css
      minimal-bento-template.css
      apple-tokens.css
    styles.css
docs/
  architecture/
    bookedai-brand-ui-kit.md
```

# J. Implementation Notes

- this brand kit is additive and can be adopted section by section without breaking current landing flow
- `LogoMark.tsx` and landing data now point to the new SVG logo system
- do not introduce a second token source outside:
  - `bookedai-brand-kit.css`
  - `styles.css`
- for Next.js App Router adoption, move `brand-kit/*` directly into `app/(marketing)` or `components/brand-kit` and keep the same public SVG paths under `/public/branding`
- use `lucide-react` only for iconography around these primitives; do not replace the logo with icon font glyphs
- use motion only for:
  - fade-up section reveal
  - card hover lift
  - CTA emphasis
- do not use perpetual decorative motion on reporting widgets
