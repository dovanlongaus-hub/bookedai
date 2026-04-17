# BookedAI Frontend Theme Design Token Map

Date: `2026-04-17`

Document status: `active sprint-2 implementation source`

## 1. Purpose

This document turns the Sprint 2 design-token requirement into an explicit implementation map for:

- `frontend/src/theme/apple-tokens.css`
- `frontend/src/theme/minimal-bento-template.css`
- `frontend/src/styles.css`

It exists so the frontend team can freeze where tokens live, what each file owns, and how future landing work should consume those tokens without creating another parallel styling system.

## 2. Source-of-truth rule

The token system must follow this ownership order:

1. `frontend/src/theme/minimal-bento-template.css`
   - canonical raw CSS variables
   - base component classes
   - shell, card, nav, form, badge, and button treatment
2. `frontend/src/styles.css`
   - Tailwind `@theme` bridge
   - app-level imports
   - animation utilities
   - any thin glue needed to expose token values to JSX utility usage
3. `frontend/src/theme/apple-tokens.css`
   - human-readable token reference and documentation layer
   - no competing visual truth beyond documenting what the system already exposes

## 3. File ownership

### `frontend/src/theme/minimal-bento-template.css`

Owns:

- root CSS variables
- legacy aliases
- app shell classes
- nav classes
- section classes
- card classes
- typography classes
- badge classes
- button classes
- form-field classes
- logo treatment classes
- admin login and shared shell classes

Must remain the single canonical CSS-token file.

### `frontend/src/styles.css`

Owns:

- `@import` wiring
- Tailwind `@theme` token exposure
- animation keyframes and utility classes
- thin compatibility helpers only when needed by the app shell

Must not become a second full design-system file.

### `frontend/src/theme/apple-tokens.css`

Owns:

- developer-facing token documentation
- allowed class-name and variable reference guide

Must not drift from the actual token values in `minimal-bento-template.css`.

## 4. Token map by category

## 4.1 Typography

Canonical variables:

- `--apple-font-display`
- `--apple-font-text`
- `--apple-font-mono`

Tailwind bridge in `styles.css`:

- `--font-display`
- `--font-body`
- `--font-mono`

Primary class consumers:

- `.template-title`
- `.template-body`
- `.template-kicker`
- `.booked-title`
- `.booked-body`

Decision:

- typography truth lives in `minimal-bento-template.css`
- Tailwind font utilities are a convenience layer, not the authoritative definition

## 4.2 Color roles

Canonical variables:

- brand accent:
  - `--apple-blue`
  - `--apple-blue-hover`
  - `--apple-blue-active`
- links:
  - `--apple-link-light`
  - `--apple-link-dark`
- neutrals:
  - `--apple-black`
  - `--apple-near-black`
  - `--apple-light`
  - `--apple-white`
- dark surfaces:
  - `--apple-dark-1`
  - `--apple-dark-2`
  - `--apple-dark-3`
  - `--apple-dark-4`
  - `--apple-dark-5`
- semantic:
  - `--apple-success`
  - `--apple-warning`
  - `--apple-danger`
- text:
  - `--apple-text-primary`
  - `--apple-text-secondary`
  - `--apple-text-tertiary`
  - `--apple-text-dark`
  - `--apple-text-dark-2`
  - `--apple-text-dark-3`

Tailwind bridge in `styles.css`:

- `--color-apple-*`

Decision:

- raw palette lives in `minimal-bento-template.css`
- JSX utility usage may consume bridged Tailwind names when helpful
- no new ad hoc hex colors should be introduced for shared landing primitives without first mapping them into this token layer

## 4.3 Radius

Canonical variables:

- `--apple-radius-micro`
- `--apple-radius-standard`
- `--apple-radius-comfortable`
- `--apple-radius-large`
- `--apple-radius-pill`

Tailwind bridge:

- `--radius-apple-micro`
- `--radius-apple-standard`
- `--radius-apple-comfortable`
- `--radius-apple-large`
- `--radius-apple-pill`

Primary class consumers:

- buttons
- pills
- cards
- fields
- nav chrome

Decision:

- all reusable component radii should map back to this scale
- one-off hardcoded radii are acceptable only for high-fidelity hero/device mockups, not for reusable primitives

## 4.4 Shadows

Canonical variables:

- `--apple-shadow`
- `--apple-shadow-sm`

Tailwind bridge:

- `--shadow-apple`
- `--shadow-apple-sm`

Primary class consumers:

- `.template-card`
- `.template-card-subtle`
- `.template-card-dark`
- `.booked-stat-card`
- `.booked-admin-login-card`

Decision:

- shared cards must use this shadow family
- avoid introducing many custom shadow recipes except in isolated hero/product-illusion surfaces

## 4.5 Navigation

Canonical variables:

- `--apple-nav-bg`
- `--apple-nav-height`

Primary class consumers:

- `.template-nav`
- `.apple-glass-nav`
- `.apple-product-band`

Decision:

- public and admin top chrome should inherit from this nav token family rather than defining separate nav baselines

## 4.6 Focus and form interaction

Canonical variables:

- `--apple-focus-ring`
- `--apple-btn-filter-bg`
- `--apple-btn-active-bg`
- `--apple-overlay`

Primary class consumers:

- `.booked-field`
- `.apple-btn-filter`
- media controls and overlay elements

Decision:

- focus treatment must stay consistent across landing, admin, and product shells

## 4.7 Legacy alias layer

Canonical alias group in `minimal-bento-template.css`:

- `--template-*`

Role:

- bridge old template naming to the current Apple-inspired token system

Decision:

- keep this alias layer during Sprint 2 and Sprint 3 to avoid risky mass rewrites
- new primitive work should prefer `--apple-*` variables and shared classes over adding more `--template-*` aliases

## 5. Shared class ownership map

## 5.1 Shell and layout classes

Owned by `minimal-bento-template.css`:

- `.booked-shell`
- `.booked-admin-shell`
- `.booked-product-shell`
- `.booked-runtime-shell`
- `.template-shell`
- `.template-section`

## 5.2 Typography classes

Owned by `minimal-bento-template.css`:

- `.template-title`
- `.template-body`
- `.template-kicker`
- `.booked-title`
- `.booked-body`

## 5.3 Card and surface classes

Owned by `minimal-bento-template.css`:

- `.template-card`
- `.template-card-subtle`
- `.template-card-dark`
- `.booked-stat-card`
- `.booked-note-surface`
- `.booked-workspace-card`

## 5.4 CTA and badge classes

Owned by `minimal-bento-template.css`:

- `.booked-button`
- `.booked-button-secondary`
- `.booked-pill`
- `.booked-pill--brand`
- `.template-chip`

## 5.5 Form and input classes

Owned by `minimal-bento-template.css`:

- `.booked-field`
- `.dropzone`

## 5.6 Brand and logo classes

Owned by `minimal-bento-template.css`:

- `.booked-brand-lockup`
- `.booked-brand-image`
- all `.booked-brand-image--*` variants

## 6. Sprint 2 action decisions

### Decision A

Do not split the core token system into more theme files during Sprint 2.

### Decision B

Treat `minimal-bento-template.css` as the implementation truth and `apple-tokens.css` as the documentation truth.

### Decision C

Use `styles.css` only as the Tailwind bridge and utility layer.

### Decision D

When Sprint 3 adds or reshapes landing primitives, the team should first look for reuse through:

- existing shared classes
- existing `--apple-*` variables
- existing `--template-*` aliases only where migration safety matters

before inventing new styling primitives.

## 7. Concrete Sprint 2 tasks

1. Audit all reusable landing primitives against the shared token families above.
2. Replace any new shared primitive color, radius, or shadow values that do not map cleanly to the token system.
3. Record the allowed hero-only exceptions where custom visual treatment is necessary.
4. Freeze the token categories and file ownership in this document before Sprint 3 starts.

## 8. Definition of done

The design-token map is complete when:

- token ownership across `theme/*` and `styles.css` is explicit
- reusable class ownership is explicit
- the team knows where to add future tokens
- the team knows what should not be duplicated

## 9. Related references

- [Landing Page System Requirements](./landing-page-system-requirements.md)
- [Sprint 2 Implementation Package](./sprint-2-implementation-package.md)
