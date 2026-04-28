# BookedAI Plugin Embed Widget — Wave 5-E-3

The BookedAI Plugin Embed Widget lets ANY external tenant drop the BookedAI
search + booking flow onto their own marketing site with a single
`<script>` tag, scoped to their tenant slug. It is the distribution moat for
multi-tenant scaling, complementing the API-driven partner pages
(Wave 5-E-1) and the generic React partner template (Wave 5-E-2).

## TL;DR — Embed snippet

```html
<script src="https://cdn.bookedai.au/widget/v1.js" defer></script>
<bookedai-search tenant="ai-mentor-doer" theme="auto"></bookedai-search>
```

That is it. The widget renders inside the host page with full Shadow DOM
style isolation (host CSS cannot bleed in; widget CSS cannot bleed out).

## How it ships

- Source: `frontend/src/widget/*` — framework-free TypeScript, no React.
- Build: `npm run build:widget` (uses `frontend/widget.config.ts`).
- Output: `frontend/dist-widget/v1.js` — single IIFE, ES2020, minified.
- Hosted at `https://cdn.bookedai.au/widget/v1.js` via the BookedAI CDN.

The bundle is intentionally a Web Component (Custom Element) rather than a
React mount. This keeps the embed independent of whatever framework the
tenant is using and keeps the bytes small.

## Attributes

| Attribute     | Required | Default    | Description                                                                                       |
| ------------- | -------- | ---------- | ------------------------------------------------------------------------------------------------- |
| `tenant`      | yes      | —          | Tenant slug (e.g. `ai-mentor-doer`). Resolved via `/api/v1/public/tenants/{slug}/partner-config`. |
| `theme`       | no       | `auto`     | `light`, `dark`, or `auto` (follows `prefers-color-scheme`).                                      |
| `accent`      | no       | from API   | Hex override (e.g. `#0071e3`). Sets the widget's `--bookedai-blue` token.                         |
| `embedded`    | no       | absent     | Boolean attribute. When present the widget renders compact (full-width).                          |
| `product-url` | no       | `https://product.bookedai.au/` | Override the iframe overlay product URL (used in non-prod / staging).         |
| `api-base`    | no       | `https://api.bookedai.au/api`  | Override the API base. Useful for self-hosted BookedAI deployments.            |

All attributes are reactive — changing `tenant` or `theme` post-mount
re-renders correctly via `attributeChangedCallback`.

## Theming via CSS custom properties

Inside the Shadow DOM the widget defines a tiny token set:

```css
:host {
  --bookedai-blue: #0071e3;
  --bookedai-light: #f5f5f7;
  --bookedai-near-black: #1d1d1f;
  --bookedai-radius-card: 12px;
  --bookedai-radius-button: 8px;
}
```

Host pages can override `--bookedai-blue` directly on the element (the
`accent` attribute is the recommended path):

```html
<bookedai-search tenant="my-clinic" accent="#1d4ed8"></bookedai-search>
```

The widget bundles its own font stack (SF Pro / Inter / system-ui) so it
looks correct even on hosts that do not load Apple's fonts.

## Booking flow — postMessage handshake

When a user clicks **Book** on a result, the widget opens an iframe
overlay (modal on desktop, full-screen on mobile) loaded from
`https://product.bookedai.au/?embed=widget&tenant={slug}&candidate={candidateId}&q={query}`.

The product app finishes the real booking (auth, payment, portal token) and
posts a message back to `window.parent`:

| Direction        | type                | Payload                                                         |
| ---------------- | ------------------- | --------------------------------------------------------------- |
| product → widget | `bookedai:close`    | `{}` — user cancelled / closed.                                 |
| product → widget | `bookedai:booking`  | `{ bookingReference: string, portalToken?: string }`            |

The widget re-emits these as `CustomEvent`s on the host element so the
tenant page can listen:

```html
<bookedai-search id="booker" tenant="ai-mentor-doer"></bookedai-search>
<script>
  document.getElementById('booker').addEventListener('bookedai:booking', (event) => {
    console.log('Booking complete', event.detail.bookingReference);
    // event.detail = { tenant, bookingReference, portalToken? }
  });
</script>
```

Other events:

- `bookedai:open` — fires when the booking overlay opens. Detail
  `{ tenant, candidateId? }`.

## Versioning

- `widget/v1.js` — stable contract. Attribute additions are non-breaking.
- Breaking changes (renamed attributes, removed events, changed message
  schema) ship as `widget/v2.js`. Tenants opt in by updating the `<script>`
  src.
- Patch fixes deploy to `widget/v1.js` directly.

The CDN sets `Cache-Control: public, max-age=600, s-maxage=86400` on
`v1.js`. Tenants do not pin minor versions — they get patches automatically.

## Backend CORS — production note (RESOLVED — Wave 5-E-3)

The widget runs on the tenant's domain (e.g. `aimentorpro.com`) and calls
`https://api.bookedai.au/api/v1/embed/...` directly.

The credentialed `/api/v1/*` surface continues to use the strict
allow-list (`allow_credentials=True` + explicit origins) defined in
`backend/app.py`. To unblock external embed origins WITHOUT loosening that
policy, BookedAI ships a separate sub-app mounted at `/api/v1/embed/`
with its own `CORSMiddleware`:

- `allow_origins=["*"]`
- `allow_credentials=False`
- `allow_methods=["GET","POST","OPTIONS"]`
- `allow_headers=["Content-Type","X-BookedAI-Embed-Origin"]`
- `max_age=600`

`allow_credentials=False` is the security invariant that makes wildcarding
`allow_origins` safe: the browser strips cookies and the `Authorization`
header on cross-origin requests, and the embed handlers do not consult
session credentials. **Never add an authenticated endpoint to this
prefix.** If you need an authenticated embed flow in the future, route it
through the existing credentialed `/api/v1/*` surface and add the
embedding origin to `CORS_ALLOW_ORIGINS`.

The widget's `api-base` attribute should point at `/api/v1/embed` in
production (the default prod build sets `api-base="https://api.bookedai.au/api/v1/embed"`).

### Embed route map

| Method | Path                                         | Mirrors                                   | Rate limit  | Auth |
| ------ | -------------------------------------------- | ----------------------------------------- | ----------- | ---- |
| GET    | `/api/v1/embed/tenants/{slug}/partner-config`| `/api/v1/public/tenants/{slug}/partner-config` | 30/min/IP | none |
| POST   | `/api/v1/embed/search/candidates`            | `/api/v1/matching/search`                 | 60/min/IP  | none |
| POST   | `/api/v1/embed/leads`                        | `/api/v1/public/leads/{slug}`             | 10/min/IP  | none |

`POST /api/v1/embed/search/candidates` requires `channel_context.tenant_ref`
in the body. The handler refuses to run without it — this prevents the
permissive CORS surface from being abused for cross-tenant fishing.

`POST /api/v1/embed/leads` requires `tenant_slug` in the body (rather
than the URL) so that ops dashboards do not see slugs leaked into log
paths or CDN cache keys.

### Origin telemetry

Every embed request emits a structured log event
(`logger=bookedai.embed`, `event_type=embed.request`) that records the
incoming `Origin` and `Referer` headers along with the optional
`X-BookedAI-Embed-Origin` self-attribution header. Ops uses this to
discover which external domains have started embedding the widget so we
can attribute partners and surface anomalies.

### Per-tenant origin allow-list (Wave 8-A follow-up — RESOLVED)

Wave 8-A's open question — *"How do we let ops restrict an individual
tenant's widget to specific external origins?"* — is RESOLVED. Each
tenant's `partner_config_jsonb.embed_origins` is a `string[]` of
fully-qualified origins. When the list is **empty or missing** the embed
surface stays open to any origin (the original Wave 8-A behaviour, kept
for backward compat with all currently-deployed tenants). When the list
is **non-empty**, requests from origins NOT on the list are rejected at
the middleware layer (`EmbedOriginAllowlistMiddleware` in
`backend/app.py`) with a structured envelope:

```json
{
  "status": "error",
  "error": {
    "code": "embed_origin_not_allowed",
    "message": "This widget is not permitted to embed BookedAI from this origin."
  },
  "meta": { "version": "v1" }
}
```

#### Configuring the allow-list (admin)

```http
POST /api/v1/admin/tenants/{slug}/partner-config
X-Admin-Token: <ops token>
Content-Type: application/json

{
  "brand": { "name": "AI Mentor 1-1 Pro", "accent_color": "#0071e3" },
  "hero":  { "h1": "Book your AI mentorship today." },
  "embed_origins": [
    "https://aimentorpro.com",
    "https://app.aimentor.au"
  ]
}
```

Validation rules (enforced by `PartnerConfigPayload` Pydantic model):

- Each entry must be a fully-qualified `https://<host>[:port]` URL, or
  `http://localhost`/`http://127.0.0.1`/`http://[::1]` (with optional
  port) for local development.
- Wildcards (`*`), the literal string `null`, bare hostnames, paths,
  query strings, fragments, userinfo, and non-`http(s)` schemes
  (`javascript:`, `data:`, etc.) are rejected with HTTP 422.
- Duplicate entries are collapsed.
- Maximum 32 entries per tenant.

#### Enforcement gate

Origin enforcement now runs on **all three** embed endpoints
(Wave 10-A — body-peek hardening):

| Method | Path                                          | Slug source                          |
| ------ | --------------------------------------------- | ------------------------------------ |
| GET    | `/api/v1/embed/tenants/{slug}/partner-config` | URL path                             |
| POST   | `/api/v1/embed/search/candidates`             | `body.channel_context.tenant_ref`    |
| POST   | `/api/v1/embed/leads`                         | `body.tenant_slug`                   |

Wave 9-A's open question — *"How do we enforce the allow-list on the
POST routes when the slug is carried in the body?"* — is RESOLVED. The
middleware reads the request body via the ASGI `receive` callable,
parses it once, then replays the buffered chunks to the downstream
handler. The handler reads the body normally; body-peek is invisible to
it.

The middleware:

- Reads the `Origin` header (or the `X-BookedAI-Embed-Origin` self-
  attribution fallback) and compares against the allow-list using exact
  string match on the canonicalized `scheme://host[:port]` form.
- Caches each tenant's allow-list in a process-local dict for **60s**.
  The cache fails OPEN on database errors — degraded availability is
  preferred over a hard outage of the embed surface.
- Skips OPTIONS preflight (the embed sub-app's CORSMiddleware handles
  preflight uniformly so browsers learn the policy before the gated
  follow-up request lands).
- Mirrors `Access-Control-Allow-Origin: *` on the rejection response so
  the widget can surface a useful error in DevTools instead of an opaque
  CORS failure.

#### POST endpoint origin enforcement (body-peek)

For the two POST routes the middleware uses an ASGI body-peek
primitive (`_peek_request_body` in `backend/app.py`). It drains the
request body through the inbound `receive` callable, parses the JSON
to extract the tenant slug, then returns a `replay_receive` that plays
the buffered chunks back to the downstream handler in order. The
FastAPI handler reads the body exactly as if no peek had happened, so
Pydantic validation, error envelopes, and rate limiting are unchanged.

- **Maximum body size:** 256KB. The cap bounds memory use against a
  malicious actor who tries to force the middleware to buffer an
  arbitrarily large body. Production search and lead bodies are well
  under 10KB, so the cap is never reached in normal flow.
- **Behaviour on parse failure:** the middleware fails OPEN — it
  passes through to the handler so FastAPI's standard 400/422 error
  envelope is returned. The same applies when JSON is well-formed but
  the slug field is missing, because we cannot identify which tenant's
  allow-list to apply.
- **Behaviour on oversize body:** same fail-open semantics. The full
  streaming body still reaches the handler via the replayed buffer
  plus a delegated `receive` for the unread tail.

**Security invariant:** origin enforcement now applies to all three
embed endpoints (`partner-config`, `search/candidates`, `leads`). A
misbehaving widget that skipped the partner-config fetch can no longer
cross-tenant fish via the open CORS prefix.

Rejected requests emit
`logger=bookedai.embed.origin_allowlist`, `event_type=embed.origin_allowlist.rejected`
with the slug, observed origin, and allow-list size for ops dashboards.

#### Onboarding a new tenant securely

1. Create the tenant row in `tenants` (existing
   `/api/admin/tenants` workflow).
2. **Before** sharing the widget snippet with the partner, set
   `embed_origins` on their partner-config to the partner's canonical
   domain(s) via the admin upsert endpoint. Include any staging /
   preview / www subdomains the partner intends to embed from.
3. Ship the partner the `<bookedai-search tenant="{slug}">` snippet.
4. After live traffic is observed, audit the
   `embed.origin_allowlist.rejected` log for unexpected origins —
   either an attacker probing the open prefix or the partner forgot to
   tell us about a subdomain.

### Endpoints intentionally NOT mounted

The embed prefix does NOT mount any of the following — they require auth
or carry data we do not want to expose anonymously:

- Tenant-authenticated endpoints (booking_intents, payment_intents, portal)
- Admin endpoints (`/api/v1/admin/...`)
- Agent activity endpoints (auth required)
- Public stats endpoints (deferred to Wave 9 — could be too revealing)

## Local development

```bash
cd frontend
npm install
npm run build:widget
ls -la dist-widget/
# v1.js  v1.js.map
```

Test embed page:

```html
<!doctype html>
<html>
  <head><meta charset="utf-8"><title>Widget test</title></head>
  <body>
    <h1>Tenant site</h1>
    <bookedai-search tenant="ai-mentor-doer" theme="auto"></bookedai-search>
    <script src="/dist-widget/v1.js" defer></script>
  </body>
</html>
```

Point `api-base` at your local backend if you are running one:

```html
<bookedai-search
  tenant="ai-mentor-doer"
  api-base="http://localhost:8000/api"
></bookedai-search>
```

## Security notes

- Shadow DOM isolates widget DOM from host page scripts (host can still
  read attributes via `querySelector`, but cannot mutate widget internals).
- All tenant-supplied strings (brand name, hero copy, candidate titles)
  are HTML-escaped via the widget's `escapeText` helper before insertion.
- The widget calls `fetch` with `credentials: 'omit'` — no cookies are
  sent cross-origin. Authoritative actions (payment, portal) happen
  inside the iframe overlay where the product app handles auth.
- The booking overlay uses a `postMessage` origin check against the
  configured `product-url`. Messages from any other origin are dropped.
- The widget never executes tenant-supplied HTML (no `innerHTML` of
  unescaped tenant strings; no `dangerouslySetInnerHTML`-style escape
  hatch).
