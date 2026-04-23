# AI Mentor Pro partner plugin interface added

- Timestamp: 2026-04-21T16:36:17.381269+00:00
- Source: codex
- Category: tenant-plugin
- Status: completed

## Summary

Added a tenant-scoped BookedAI plugin interface for AI Mentor Pro with embed loader support, strict tenant search, and runtime wiring for ai.longcare.au.

## Details

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
- `frontend/public/partner-plugins/ai-mentor-pro-widget.js`
- `frontend/nginx/default.conf`
- `frontend/scripts/generate-hosted-html.mjs`
- `frontend/src/app/AppRouter.tsx`
- `frontend/src/shared/config/api.ts`
- `frontend/src/components/landing/assistant/BookingAssistantDialog.tsx`
- `frontend/src/components/landing/assistant/publicBookingAssistantV1.ts`
- `backend/api/route_handlers.py`
- `backend/api/v1_search_handlers.py`
- `backend/api/v1_routes.py`

## Verification

- frontend production build passed after the runtime and plugin changes
- backend syntax verification passed for the touched route handlers
- generated build output now includes:
  - `ai-mentor-pro.html`
  - `partner-plugins/ai-mentor-pro-widget.js`
