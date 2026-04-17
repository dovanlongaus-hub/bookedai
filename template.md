# BookedAI Template Source of Truth

## Source
- Reference gallery reviewed from `https://ui-ux-pro-max-skill.nextlevelbuilder.io/#styles`
- Selected direction: `Minimal + Bento Grid (MODERN STARTUP)`
- Date reviewed: `2026-04-16`

## Why this template
- It fits BookedAI better than the previous Apple-like direction because it feels product-led, modern, operational, and startup-ready without becoming noisy.
- It scales across landing, admin, tenant, roadmap, product, and standalone tools.
- It supports a single design language for both marketing pages and utility workflows.

## Core visual rules
- Layout: spacious, minimal, modular, bento-first blocks instead of long undifferentiated panels.
- Surfaces: soft off-white glass panels on a warm neutral background.
- Contrast: dark navy text, muted slate secondary text, bright blue primary accent, small warm orange secondary glow.
- Typography:
  - Headings: `Space Grotesk`
  - Body/UI: `DM Sans`
- Radius:
  - small controls: `18px`
  - cards: `24px`
  - hero/panel shells: `32px`
- Shadows: soft large ambient shadows, never harsh black.
- Buttons:
  - primary: blue gradient pill
  - secondary: translucent white pill with border
- Motion: subtle lift/hover only, no heavy animation by default.

## Shared tokens
- Source file: [frontend/src/theme/minimal-bento-template.css](/home/dovanlong/BookedAI/frontend/src/theme/minimal-bento-template.css)
- Entry import: [frontend/src/styles.css](/home/dovanlong/BookedAI/frontend/src/styles.css)
- Treat the theme file as the single implementation source for shared frontend template tokens and semantic classes.
- Main tokens:
  - `--booked-bg`, `--booked-surface`, `--booked-ink`
  - `--booked-accent`, `--booked-accent-warm`
  - `--booked-line`, `--booked-shadow-soft`, `--booked-shadow-strong`
  - `--booked-font-body`, `--booked-font-heading`

## Semantic classes to reuse
- Shells:
  - `booked-shell`
  - `booked-product-shell`
  - `booked-admin-shell`
  - `booked-runtime-shell`
- Panels:
  - `booked-panel`
  - `booked-panel-quiet`
  - `booked-panel-dark`
  - `booked-runtime-card`
- Content:
  - `booked-title`
  - `booked-body`
  - `booked-kicker`
  - `booked-pill`
- Actions:
  - `booked-button`
  - `booked-button-secondary`
  - `booked-field`
- Layout:
  - `booked-bento-grid`
  - `booked-bento-card`

## Branding assets
- Primary wordmark for light surfaces:
  - [frontend/public/branding/bookedai-logo-cropped.png](/home/dovanlong/BookedAI/frontend/public/branding/bookedai-logo-cropped.png)
- Dark/runtime-compatible wordmark:
  - [frontend/public/branding/bookedai-logo-dark.png](/home/dovanlong/BookedAI/frontend/public/branding/bookedai-logo-dark.png)
- Square icon for compact UI, app icon, and favicon:
  - [frontend/public/branding/bookedai-logo-square.png](/home/dovanlong/BookedAI/frontend/public/branding/bookedai-logo-square.png)
- Browser favicon:
  - [frontend/public/favicon.png](/home/dovanlong/BookedAI/frontend/public/favicon.png)

Use rules:
- `bookedai-logo-cropped.png`: default header/footer/product/admin wordmark.
- `bookedai-logo-dark.png`: only when a darker or isolated wordmark treatment is needed.
- `bookedai-logo-square.png`: favicon, app icon, tiny avatar/icon slots, compact admin shortcuts.
- Do not use legacy `bookedai-mark*.png` for new work.

## Compatibility rule
- Existing `apple-*` classes are temporarily mapped in the shared theme file so current components stay working during migration.
- New work should prefer `booked-*` classes only.
- When touching older UI files, migrate from `apple-*` or raw repeated utility patterns to `booked-*` classes where reasonable.

## Project-wide adoption rule
- Any new page, route, embedded shell, or standalone HTML page must follow this template.
- Do not create page-local color systems unless there is a documented exception.
- If a standalone page cannot import the shared frontend CSS, mirror the same token values from this document and note the exception in the PR/change summary.

## Files already aligned in this pass
- [frontend/index.html](/home/dovanlong/BookedAI/frontend/index.html)
- [frontend/src/styles.css](/home/dovanlong/BookedAI/frontend/src/styles.css)
- [frontend/src/theme/minimal-bento-template.css](/home/dovanlong/BookedAI/frontend/src/theme/minimal-bento-template.css)
- [frontend/src/app/AppRouter.tsx](/home/dovanlong/BookedAI/frontend/src/app/AppRouter.tsx)
- [frontend/src/apps/public/PublicApp.tsx](/home/dovanlong/BookedAI/frontend/src/apps/public/PublicApp.tsx)
- [frontend/src/apps/public/ProductApp.tsx](/home/dovanlong/BookedAI/frontend/src/apps/public/ProductApp.tsx)
- [frontend/src/apps/public/RoadmapApp.tsx](/home/dovanlong/BookedAI/frontend/src/apps/public/RoadmapApp.tsx)
- [frontend/src/apps/admin/AdminApp.tsx](/home/dovanlong/BookedAI/frontend/src/apps/admin/AdminApp.tsx)
- [frontend/src/components/AdminPage.tsx](/home/dovanlong/BookedAI/frontend/src/components/AdminPage.tsx)
- [frontend/src/apps/tenant/TenantApp.tsx](/home/dovanlong/BookedAI/frontend/src/apps/tenant/TenantApp.tsx)
- [frontend/src/features/admin/login-screen.tsx](/home/dovanlong/BookedAI/frontend/src/features/admin/login-screen.tsx)
- [storage/uploads/index.html](/home/dovanlong/BookedAI/storage/uploads/index.html)

## Rules for future refactors
- Prefer semantic classes over repeated raw utility combinations for shells, hero cards, runtime fallbacks, and admin utility surfaces.
- Keep background recipes and accent colors in one place only: `frontend/src/theme/minimal-bento-template.css`.
- If a component needs a new reusable variant, add it once to the shared template layer instead of duplicating utilities across pages.
