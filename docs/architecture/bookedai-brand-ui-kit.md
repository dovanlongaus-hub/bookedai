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
- `frontend/public/branding/bookedai-revenue-engine-*.svg`

Brand rules:

- dark-mode first
- investor-grade contrast
- premium SaaS glass surfaces
- dashboard-forward visual hierarchy
- short commercial copy only
- revenue, conversion, follow-up, and visibility over generic AI wording

# B. Logo System

SVG assets:

- primary on dark: `frontend/public/branding/bookedai-revenue-engine-dark.svg`
- primary on light: `frontend/public/branding/bookedai-revenue-engine-light.svg`
- icon-only: `frontend/public/branding/bookedai-revenue-engine-icon.svg`
- white monochrome: `frontend/public/branding/bookedai-revenue-engine-white.svg`
- black monochrome: `frontend/public/branding/bookedai-revenue-engine-black.svg`
- transparent-ready: `frontend/public/branding/bookedai-revenue-engine-transparent.svg`

Logo concept:

- stylized `RE` monogram for `Revenue Engine`
- upward arrow integrated into the mark
- geometric outer panel for product-grade SaaS feel
- wordmark lockup: `BookedAI.au`
- optional descriptor line: `REVENUE ENGINE`

Recommended usage:

- use `dark.svg` on dark shells and hero surfaces with full lockup
- use `light.svg` on white or sand surfaces
- use `icon.svg` for favicon, app icon, avatar chips, and compact nav
- use monochrome variants only for one-color printing, watermarking, or constrained embeds

Safe area rule:

- keep clear space equal to at least `0.5x` of the monogram panel width around the full lockup
- do not crop inside the rounded panel or arrow tip

Favicon guidance:

- use `bookedai-revenue-engine-icon.svg`
- generate `32x32`, `64x64`, `180x180`, and pinned-tab exports from the same icon geometry

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
      bookedai-revenue-engine-dark.svg
      bookedai-revenue-engine-light.svg
      bookedai-revenue-engine-icon.svg
      bookedai-revenue-engine-white.svg
      bookedai-revenue-engine-black.svg
      bookedai-revenue-engine-transparent.svg
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
