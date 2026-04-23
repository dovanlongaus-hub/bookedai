# AI Mentor Pro Plugin Interface

Date: `2026-04-21`

## Purpose

This document defines the official partner-facing plugin interface for tenant `ai-mentor-doer`.

It lets `AI Mentor Pro` use the BookedAI engine as the real runtime for:

- chat
- tenant-scoped search
- booking intent capture
- payment handoff
- email follow-up
- CRM-ready lead writes
- WhatsApp-ready downstream operator flow

## Runtime surfaces

Primary tenant runtime:

- `https://ai.longcare.au/`

Embeddable partner runtime:

- `https://product.bookedai.au/partner/ai-mentor-pro/embed?embed=1&tenant_ref=ai-mentor-doer`

Hosted plugin loader asset:

- `/partner-plugins/ai-mentor-pro-widget.js`

## Implementation notes

- frontend host recognition now treats `ai.longcare.au` as an official tenant runtime
- `AIMentorProApp` wraps the existing BookedAI product assistant as a tenant-specific partner surface
- the runtime uses:
  - `channel = embedded_widget`
  - `deployment_mode = plugin_integrated`
  - `tenant_ref = ai-mentor-doer`
  - `widget_id = ai-mentor-pro-plugin`
- tenant plugin search is now strict to tenant catalog results for plugin-integrated flows instead of falling back to unrelated public-web matches
- legacy assistant catalog/chat/session endpoints now accept tenant scoping through `tenant_ref` query params, so the visible package list and legacy assistant context stay aligned with the tenant runtime

## Official embed snippet

Inline mount:

```html
<div id="ai-mentor-pro-widget"></div>
<script
  src="https://product.bookedai.au/partner-plugins/ai-mentor-pro-widget.js"
  data-bookedai-plugin="ai-mentor-pro"
  data-mode="inline"
  data-target="#ai-mentor-pro-widget"
  data-bookedai-host="https://product.bookedai.au"
  data-bookedai-path="/partner/ai-mentor-pro/embed"
  data-tenant-ref="ai-mentor-doer"
></script>
```

Floating launcher:

```html
<script
  src="https://product.bookedai.au/partner-plugins/ai-mentor-pro-widget.js"
  data-bookedai-plugin="ai-mentor-pro"
  data-mode="modal"
  data-launcher-label="Talk to AI Mentor Pro"
  data-bookedai-host="https://product.bookedai.au"
  data-bookedai-path="/partner/ai-mentor-pro/embed"
  data-tenant-ref="ai-mentor-doer"
></script>
```

Optional prompt preload:

- set `data-prompt="I want a 1-1 session to build my first AI app."`

## Delivered assets

- `frontend/src/apps/public/AIMentorProApp.tsx`
- `frontend/src/features/tenant-plugin/TenantPluginWorkspace.tsx`
- `frontend/public/partner-plugins/ai-mentor-pro-widget.js`
- `frontend/nginx/default.conf`
- `frontend/scripts/generate-hosted-html.mjs`
- `frontend/src/app/AppRouter.tsx`
- `frontend/src/apps/tenant/TenantApp.tsx`
- `frontend/src/shared/api/v1.ts`
- `frontend/src/shared/contracts/api.ts`
- `frontend/src/shared/config/api.ts`
- `frontend/src/components/landing/assistant/BookingAssistantDialog.tsx`
- `frontend/src/components/landing/assistant/publicBookingAssistantV1.ts`
- `backend/api/route_handlers.py`
- `backend/api/v1_tenant_routes.py`
- `backend/api/v1_tenant_handlers.py`
- `backend/api/v1_search_handlers.py`
- `backend/api/v1_routes.py`
- `backend/service_layer/tenant_app_service.py`
- `backend/repositories/tenant_repository.py`

## Tenant portal management

Tenant operators can now open:

- `https://tenant.bookedai.au/ai-mentor-doer#plugin`

This panel is now the official place to:

- review the partner runtime configuration stored in `tenant_settings`
- edit partner website URL, BookedAI host, embed path, widget id, accent color, prompt, and CTA copy
- copy official `inline widget`, `modal button`, and `iframe` snippets without touching repo code
- keep the tenant-side plugin interface aligned with the published 10-product AI Mentor catalog

## Verification

- frontend production build passed after the runtime and plugin changes
- backend syntax verification passed for the touched route handlers
- generated build output now includes:
  - `ai-mentor-pro.html`
  - `partner-plugins/ai-mentor-pro-widget.js`
