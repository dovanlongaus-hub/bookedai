# Multi-tenant frontend architecture — `<TenantPartnerApp>`

_Updated: 2026-04-28 · Owner: BookedAI frontend platform · Pairs with Wave 5-E-1 backend `multi-tenant-api-onboarding`._

The goal: onboard a new BookedAI tenant by configuring backend rows + DNS, **never** by adding a new React component file.

This document covers the generic `<TenantPartnerApp>` component, how the
`AppRouter` resolves a tenant slug from the URL, and the migration path for
the bespoke partner pages that pre-date this contract.

## 1. Files of record

| Concern | Path |
|---|---|
| Generic component | `frontend/src/apps/public/TenantPartnerApp.tsx` |
| Router host/path resolution | `frontend/src/app/AppRouter.tsx` |
| API client (typed contract + 60s cache) | `frontend/src/shared/api/v1.ts` (search for `getTenantPartnerConfig`) |
| Routing test (Playwright) | `frontend/tests/tenant-partner-app-routing.spec.ts` |

## 2. API contract consumed

The component consumes the Wave 5-E-1 endpoint:

```
GET /api/v1/public/tenants/{slug}/partner-config
```

The response is normalized by `apiV1.getTenantPartnerConfig(slug)` into the
exported `TenantPartnerConfig` type. The client:

- caches successful responses **and** 404s for `meta.cache_seconds` (default 60s)
- returns `null` for 404s so the component can render a friendly fallback
- throws `ApiClientError` for any other failure (5xx, network, schema)

`clearTenantPartnerConfigCache()` is exported for tests / dev tooling.

## 3. Router resolution

`AppRouter.tsx` resolves a tenant slug in this order:

1. **Bespoke host overrides** are checked FIRST (chess, futureswim, aimentor, aimentor-pro, etc.). Those continue to render their existing custom React components — they are not affected by this work.
2. **`/partner/{slug}` apex path** — used for local dev and shareable links from the apex domain. `/partner/ai-mentor-pro` is excluded (handled by the bespoke route).
3. **`*.bookedai.au` subdomain that is NOT in the known-host allowlist** — the leftmost label is treated as the tenant slug.

The known-host allowlist (`KNOWN_BOOKEDAI_HOSTS`) currently covers:
`bookedai.au`, `www.bookedai.au`, `pitch.bookedai.au`, `pitchdeck.bookedai.au`,
`product.bookedai.au`, `portal.bookedai.au`, `tenant.bookedai.au`,
`admin.bookedai.au`, `aimentor.bookedai.au`, `aimentor-pro.bookedai.au`,
`chess.bookedai.au`, `futureswim.bookedai.au`, `roadmap.bookedai.au`,
`architecture.bookedai.au`, `register.bookedai.au`, `demo.bookedai.au`.

So a brand-new tenant lives at `https://acme.bookedai.au/` and immediately
renders `<TenantPartnerApp tenantSlug="acme" />` once the backend
`partner-config` row exists.

## 4. Component behavior

`<TenantPartnerApp tenantSlug={slug} />` renders:

| Section | Source |
|---|---|
| Header lockup | `brand.name`, `brand.logo_url` (falls back to two-letter monogram) |
| Hero | `hero.kicker` / `hero.h1` / `hero.sub` |
| Hero CTAs | `hero.primary_cta` + optional `hero.secondary_cta` |
| Capability chips | `capabilities[]` mapped through a friendly-label table (e.g. `stripe` → "Stripe checkout"). Unknown tokens auto-humanize. |
| Search composer | `<BookingAssistantDialog>` scoped to `tenantSlug` (id `tenant-partner-search`). The hero `open_search` CTA scrolls + focuses. |
| Trust strip | `trust_signals[]` rendered with lucide-react icons resolved by name. Unknown icon names fall back to `CheckCircle2`. |
| Channels | Telegram + WhatsApp links only when `channels.{telegram,whatsapp}.enabled = true`. Email support link rendered if `channels.email_support` is set. |
| Footer | "Verified BookedAI tenant · powered by BookedAI" + optional `footer_html`. |

### CTA intent wiring

| Intent | Frontend action |
|---|---|
| `open_search` | smooth-scroll to `#tenant-partner-search` and focus the composer |
| `external` | navigate to `cta.href` (target `_blank`) |
| `run_demo` | `https://product.bookedai.au/` |
| `book_demo` | `mailto:info@bookedai.au?subject=Revenue%20demo` |
| `open_portal` | `https://portal.bookedai.au/` |

### Accent color

`brand.accent_color` is forwarded to a single CSS custom property,
`--tenant-accent`, set inline on the component root. The component uses
`var(--tenant-accent)` for accent dots, focus rings, and chip glyphs only.
The global `--apple-blue` token is never overridden. If the backend sends an
empty / non-token / non-hex value, the component falls back to
`var(--apple-blue)`.

### Loading and error states

- Loading renders an `aria-busy` skeleton with the same layout shell so the
  page does not jump when content arrives.
- 404 (or `active=false`) renders a friendly fallback with a `Try the live
  BookedAI demo` link to `product.bookedai.au`.
- Any other error renders the same shell with a slightly different headline
  ("We hit a snag…") so the user can retry.

## 5. Bespoke override pattern

Some partner pages (chess, futureswim, aimentor, aimentor-pro) ship as bespoke
React components because they encode marketing storytelling (custom hero copy,
program catalogs, assessment flows) that can't be expressed in the
partner-config contract.

**Keep a bespoke component when:**
- The page has assessment / quiz flows or other rich custom UI.
- Marketing wants an editorial layout that isn't a simple hero / search /
  trust grid.
- Per-page A/B variants need to ship without backend changes.

**Use the generic `<TenantPartnerApp>` when:**
- The tenant simply needs the BookedAI booking flow with their branding.
- Marketing copy and trust signals can be expressed as plain text.
- The page should be onboarded by ops / admins via API, not engineering.

## 6. Migration path for existing bespoke tenants

Any existing bespoke partner can move to the generic component without code
changes:

1. Backend ops creates the partner-config row for the tenant slug.
2. Set `features.layout_override = null`. (When the override is set to a
   string, the bespoke React component continues to render.)
3. Remove the bespoke runtime check from `AppRouter.tsx` (e.g. delete
   `isAIMentorBookedAIRuntime`) and let the host fall through to
   `isTenantPartnerRuntime`.
4. The bespoke component file can stay in `git history` for reference, but
   should be deleted from the bundle once the generic page is live.

## 7. Constraints enforced in this slice

- TypeScript strict — `TenantPartnerConfig` is fully typed, no `any`.
- Zero arbitrary hex colors in component styles. The only color injection is
  `--tenant-accent` from the API, gated through `safeAccent()`.
- Mobile-first: ≥44px tap targets on capability chips and CTAs, no horizontal
  scroll at 390px.
- The bespoke chess/futureswim/aimentor host overrides are unchanged.
- No backend code touched (Wave 5-E-1 owns the API).

## 8. Tests

`frontend/tests/tenant-partner-app-routing.spec.ts` covers two flows:

- `/partner/ai-mentor-doer` with a stubbed 200 response — asserts the hero,
  kicker, and Telegram CTA render from config.
- `/partner/unknown-tenant` with a stubbed 404 response — asserts the friendly
  fallback and the live-demo recovery link.
