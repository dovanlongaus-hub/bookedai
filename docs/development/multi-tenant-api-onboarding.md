# Multi-Tenant Partner Config API — Onboarding Guide

This document describes how a new BookedAI tenant (chess academy, swim school,
mentor program, salon, clinic, etc.) gets a working partner page **purely
through the API + DNS** — no bespoke React component, no frontend deploy.

The contract is owned jointly by the backend handler module
`backend/api/v1_public_tenant_config_handlers.py` and the frontend generic
partner template (Wave 5-E-2). Both must agree on the JSON shape below.

## Why this exists

Historically each tenant (chess, swim, AI Mentor) shipped as a hardcoded
React component. That made onboarding a code change every time. The Partner
Config API replaces that with a 3-step flow:

1. Admin creates the tenant row (existing `/api/admin/tenants` workflow).
2. Admin POSTs partner-config JSON to the new admin endpoint, OR skips this
   step entirely and lets the safe fallback handle the new tenant.
3. Ops adds a `<slug>.bookedai.au` DNS record pointing at the BookedAI edge
   proxy. The frontend resolves the tenant via the public API on first load
   and renders the generic partner template.

A brand-new tenant gets a working partner page **before any custom branding
is uploaded**, because the public endpoint always falls back to a safe
default config built from `tenants.name` + BookedAI defaults.

## API surface

All endpoints are mounted under the existing `/api/v1` v1 router and use the
standard BookedAI envelope (`{ "status": "ok"|"error", "data"|"error",
"meta": { "version": "v1", ... } }`).

### `GET /api/v1/public/tenants/{slug}/partner-config`

Public. No auth. Rate-limited 30 requests / minute / IP via the existing
in-memory rate limiter.

Returns the resolved partner config for the slug. Missing or `status !=
'active'` tenants return a 404 with the `tenant_not_found` error code.

Example success response:

```json
{
  "status": "ok",
  "data": {
    "slug": "ai-mentor-doer",
    "active": true,
    "brand": {
      "name": "AI Mentor 1-1 Pro",
      "tagline": "Live BookedAI partner",
      "logo_url": "https://cdn.bookedai.au/tenants/ai-mentor-doer/logo.svg",
      "favicon_url": null,
      "accent_color": "#0071e3"
    },
    "hero": {
      "kicker": "AI Mentor 1-1 · Live BookedAI partner",
      "h1": "Book your AI mentorship — search live programs, pay, and we'll keep you on track.",
      "sub": "Real BookedAI plugin running on AI Mentor 1-1 Pro.",
      "primary_cta": { "label": "Save my spot", "intent": "open_search", "href": null },
      "secondary_cta": {
        "label": "Run the live demo",
        "intent": "external",
        "href": "https://product.bookedai.au/"
      }
    },
    "capabilities": ["stripe", "telegram", "whatsapp", "calendar", "monthly_reminder", "feedback"],
    "channels": {
      "telegram": { "bot_username": "BookedAI_Manager_Bot", "enabled": true },
      "whatsapp": { "phone_number": "+61455301335", "enabled": true },
      "email_support": "info@bookedai.au"
    },
    "features": {
      "monthly_reminder_default": true,
      "post_booking_feedback": true,
      "show_audit_ledger": false,
      "layout_override": null
    },
    "services_endpoint": "/api/v1/search/candidates?tenant_ref=ai-mentor-doer",
    "booking_endpoint": "/api/v1/leads",
    "portal_endpoint_prefix": "/api/v1/portal/bookings",
    "trust_signals": [
      { "label": "Verified BookedAI tenant", "icon": "shield-check" },
      { "label": "Real Stripe payments", "icon": "credit-card" },
      { "label": "Auditable action ledger", "icon": "list-checks" }
    ],
    "footer_html": null
  },
  "meta": { "version": "v1", "cache_seconds": 60 }
}
```

The HTTP response also sets `Cache-Control: public, max-age=60` so edge
caches and the frontend can short-cache the resolution.

Error response (unknown slug, inactive tenant, or rate-limit):

```json
{
  "status": "error",
  "error": {
    "code": "tenant_not_found",
    "message": "No active BookedAI tenant matches this slug. Confirm the subdomain DNS record and that the tenant has been provisioned.",
    "details": { "slug": "does-not-exist" }
  },
  "meta": { "version": "v1" }
}
```

### `POST /api/v1/admin/tenants/{slug}/partner-config`

Admin-authenticated (existing admin session bearer or `X-Admin-Token`
header). Body matches the same `data` shape returned by the public
endpoint. Upserts the config into `tenants.partner_config_jsonb`.

Validation rules enforced by `PartnerConfigPayload`:

- `slug` must already exist in the `tenants` table — admins create the
  tenant via `/api/admin/tenants` first, then attach a partner-config.
- `brand.accent_color` must be a 3- or 6-digit hex color (e.g. `#0071e3`).
- `capabilities` must be a subset of:
  `stripe, telegram, whatsapp, sms, email, calendar, monthly_reminder,
  feedback, crm_zoho, portal, widget`.
- All copy fields are capped at 2000 characters.
- `cta.intent` must be one of:
  `open_search, open_booking, open_portal, open_widget, external`.
  When `intent == "external"`, `href` is required.

Returns 200 with the persisted config on success, 422 on validation error,
404 when the slug is unknown.

### `GET /api/v1/admin/tenants/with-partner-config`

Admin-authenticated. Lists every tenant with a `has_partner_config` flag
plus the `partner_config_updated_at` timestamp so admins can see at a
glance which tenants are still running on the safe fallback.

## Default fallback behaviour

When `tenants.partner_config_jsonb` is NULL the public endpoint synthesizes
a complete partner-config payload from:

- `brand.name` ← `tenants.name` (or the slug if name is empty).
- `brand.accent_color` ← `#0071e3` (BookedAI default).
- `hero.kicker` ← `"{tenant.name} · Live BookedAI partner"`.
- `hero.h1` ← `"Book with {tenant.name} — powered by BookedAI."`.
- `capabilities` ← `["stripe", "telegram", "whatsapp", "calendar"]`.
- `channels.telegram.bot_username` ← `BookedAI_Manager_Bot` (enabled).
- `channels.whatsapp.phone_number` ← BookedAI customer support phone.
- `channels.email_support` ← BookedAI customer support email.
- `services_endpoint` ← `/api/v1/search/candidates?tenant_ref={slug}`.
- `booking_endpoint` ← `/api/v1/leads`.
- `portal_endpoint_prefix` ← `/api/v1/portal/bookings`.
- `trust_signals` ← BookedAI default (verified tenant / Stripe / audit).

When a stored config exists, it is overlaid on top of the fallback so a
tenant that customizes only `brand` still gets the default channels,
endpoints, and trust signals for free.

## DNS setup

For a new tenant slug (`<slug>`):

1. Add a DNS record `<slug>.bookedai.au` pointing at the BookedAI edge
   proxy public IP. Use a CNAME to `bookedai.au` when the apex itself
   resolves to the proxy, or an A record matching the apex IP otherwise.
2. The Cloudflare auto-DNS sync script
   (`scripts/update_cloudflare_dns_records.sh`) can be extended to keep the
   subdomain proxied. See `CLOUDFLARE_AUTO_DNS_RECORDS` in root `.env` for
   the canonical list.
3. The edge proxy already terminates TLS for `*.bookedai.au` via the
   wildcard certificate provisioned by Certbot. No per-tenant cert work is
   required.

Once DNS resolves, the frontend reads the slug from the inbound host,
calls `GET /api/v1/public/tenants/{slug}/partner-config`, and renders the
generic partner template.

## Migration notes

Migration `029_tenant_partner_config.sql` adds two columns:

- `tenants.partner_config_jsonb JSONB`
- `tenants.partner_config_updated_at TIMESTAMPTZ`

Plus a partial index on `slug` for tenants that have stored a config.

Existing tenants — `ai-mentor-doer`, `co-mai-hung-chess`,
`bookedai-au`, `future-swim`, etc. — will continue to render correctly
because the public endpoint synthesizes the safe fallback when
`partner_config_jsonb IS NULL`. Admins can override the fallback at any
point via the admin endpoint without disturbing the live page; the next
read will return the merged payload.

## Future roadmap (out of scope for this PR)

- **Wave 5-E-2 (frontend)**: replace the bespoke chess/swim/AI Mentor
  React components with one generic partner template that consumes this
  API contract.
- **Wave 5-E-3 (widget embed)**: ship a JS snippet that any third-party
  marketing site can embed to render the BookedAI booking widget using
  the same partner-config resolution path.
- **Per-tenant CDN assets**: today logo URLs are stored as plain strings.
  A future iteration can upload through `/api/uploads` and write back a
  signed CDN URL automatically.
- **Versioning**: the response already exposes `meta.version = "v1"`.
  Breaking changes (if ever needed) should ship as `v2` alongside `v1`
  rather than mutating the v1 shape.

---

## Operational plumbing 2026-04-28

Wave 5-D shipped the Python workers that drive monthly reminders, the 24h
post-session feedback prompt, and the Zoho CRM activity sync — but left
the cron wiring + outbox consumer registration as a follow-up. This
section documents the wiring choices and the env vars that gate each.

### Scheduling strategy: n8n (Strategy B)

n8n is already the canonical scheduler in this repo (see
`n8n/workflows/bookedai-booking.json`). The new
`n8n/workflows/bookedai-operational-cron.json` adds a Schedule trigger
that fires hourly and POSTs to two internal HTTP endpoints:

- `POST /api/internal/workers/dispatch-monthly-reminders`
- `POST /api/internal/workers/dispatch-feedback-requests`

Both endpoints require `Authorization: Bearer <N8N_WEBHOOK_BEARER_TOKEN>`
matching the existing `/api/automation/booking-callback` pattern. They
live under `/api/internal/workers/` (intentionally outside the public
`/api/v1/` surface) and the route module is wired into `app.py` via
`internal_worker_router`.

Why n8n over a lifespan asyncio task or systemd timer:

- n8n is already in use (and has the auth scaffold).
- A lifespan task would re-run on every process restart and tie cron
  cadence to deploy cadence, which is brittle.
- A systemd timer would split scheduling across two systems and require
  ops to copy `N8N_WEBHOOK_BEARER_TOKEN` into a unit file.

### 24h post-session feedback request flow

1. Customer submits feedback via `POST /api/v1/booking/{ref}/feedback`
   (Wave 5-D). The handler enqueues an outbox event
   `booking_feedback.recorded` (see step 3 below).
2. Independently, the n8n hourly cron fires
   `POST /api/internal/workers/dispatch-feedback-requests`.
3. `workers/feedback_request_worker.py:dispatch_due_feedback_requests`
   selects bookings where:
     - `status = 'confirmed'`,
     - `feedback_request_sent_at IS NULL`,
     - session end (derived from `requested_date + requested_time` in
       the booking timezone) was at least 24 hours ago, and
     - the tenant has `partner_config_jsonb.features.post_booking_feedback
       = "true"` OR the tenant slug is the launch partner
       `ai-mentor-doer`.
4. For each row, the worker renders the email body inline (mirrors
   `backend/integrations/email_templates/feedback_request.html`), calls
   `EmailService.send_email`, then flips `feedback_request_sent_at = now()`.
   The flip is idempotent: a re-trigger inside the same window is a
   no-op because the row is no longer selected.

The new column comes from migration
`backend/migrations/sql/030_booking_feedback_request_sent_at.sql`.

### Zoho CRM activity sync flow

1. Wave 5-D's feedback handler also enqueues
   `booking_feedback.recorded` to `outbox_events`.
2. The phase-2 outbox dispatcher
   (`workers/outbox.py:dispatch_phase2_outbox_event`) now routes events
   with `event_type == "booking_feedback.recorded"` to
   `workers/zoho_crm_feedback_consumer.py:handle_booking_feedback_recorded`
   in addition to writing the audit-log entry.
3. The consumer:
     - Returns early with `skipped:provider_unconfigured` when Zoho
       creds are absent (so the outbox marks the event processed and
       moves on — we don't retry forever in unconfigured tenants).
     - Looks up the booking + linked contact via
       `BookingIntentRepository.fetch_booking_with_contact`.
     - Calls `ZohoCrmAdapter.find_contact_by_email` (new helper) to
       locate the matching CRM contact.
     - Calls `ZohoCrmAdapter.create_note` (new helper) to attach a Note
       with subject `BookedAI feedback (rating {rating}/5) for booking
       {ref}` and a structured body (rating, would-recommend, comment,
       channel, submitted-at).
4. On `httpx.HTTPStatusError` the consumer re-raises so the outbox
   dispatcher records a failure and exponential back-off kicks in via
   `OutboxRepository.update_event_status` (existing pattern).

### Env vars

| Variable | Purpose | Required |
| --- | --- | --- |
| `N8N_WEBHOOK_BEARER_TOKEN` | Auth for both internal worker endpoints (and the existing booking-callback). | yes (set both on the API server and in n8n's environment) |
| `ZOHO_CRM_REFRESH_TOKEN` + `ZOHO_CRM_CLIENT_ID` + `ZOHO_CRM_CLIENT_SECRET` | Refresh-token OAuth flow for the Zoho CRM consumer. Without these the consumer skips with `skipped:provider_unconfigured`. | optional (gates Zoho push) |
| `ZOHO_CRM_ACCESS_TOKEN` | Smoke-test path for short-lived direct tokens. | optional |
| `ZOHO_CRM_DEFAULT_CONTACT_MODULE` | Module name used for the contact lookup + note `se_module`. Defaults to `Contacts`. | optional |
| `EMAIL_SMTP_HOST` / `_PORT` / `_USERNAME` / `_PASSWORD` / `_FROM` | Required for the feedback request email. Worker logs `feedback_request_send_failed` and skips when SMTP is unconfigured. | required to actually send |

There is no top-level `BOOKEDAI_MONTHLY_REMINDER_ENABLED` or
`ZOHO_CRM_ENABLED` env var: enablement is via
`partner_config_jsonb.features` per tenant (or the legacy slug
fallback) for the feedback worker, and via Zoho credentials presence
for the CRM consumer. This keeps single-tenant rollouts cheap (toggle
in DB, no env-var rotation needed).
