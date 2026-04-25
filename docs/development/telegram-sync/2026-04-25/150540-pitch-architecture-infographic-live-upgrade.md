# Pitch architecture infographic live upgrade

- Timestamp: 2026-04-25T15:05:40.116817+00:00
- Source: docs/development/telegram-sync/2026-04-25/pitch-architecture-infographic-live-upgrade.md
- Category: Pitch Architecture
- Status: deployed

## Summary

Upgraded the architecture block inside pitch.bookedai.au into a professional multi-layer infographic showing surfaces, AI agents, revenue modules, ops controls, partner integrations, and infrastructure stack; live desktop/mobile smoke passed.

## Details

# Pitch architecture infographic live upgrade

## Summary

The architecture block inside `pitch.bookedai.au` has been upgraded from a simple operating loop into a professional multi-layer architecture infographic.

## What changed

- Rebuilt the pitch architecture section as an in-page architecture image/infographic.
- Grouped the architecture into clear layers:
  - customer demand surfaces
  - AI orchestration layer
  - revenue transaction core
  - operations control plane
  - partner and integration rails
  - infrastructure and technology stack
- Explicitly surfaced the real project components and integrations:
  - BookedAI public/product/demo/widget/portal/WhatsApp surfaces
  - customer-turn agent, search and match, qualification policy, revenue-ops agent, care/status agent
  - lead capture, booking intent, payment intent, QR portal return, email/calendar
  - tenant Ops, admin Reliability, action ledger, support queue, manual review
  - Stripe, Meta WhatsApp, Twilio, n8n, CRM/webhook recovery
  - OpenClaw, Telegram commands, Notion, Discord
  - React, TypeScript, Vite, Tailwind, FastAPI, Supabase, Postgres, Docker Compose, Nginx, Cloudflare DNS/TLS

## Verification

- `npm --prefix frontend exec tsc -- --noEmit` passed.
- `npm --prefix frontend run build` passed.
- Local Playwright smoke passed for `/pitch-deck` desktop and mobile.
- `python3 scripts/telegram_workspace_ops.py deploy-live` completed successfully.
- Production Playwright smoke passed on `https://pitch.bookedai.au/` desktop and mobile:
  - architecture image is present
  - all architecture layers are present
  - partner/integration labels are present
  - technology stack labels are present
  - pricing remains a single section
  - no horizontal overflow
  - no console errors, page errors, or request failures

## Evidence

- `output/playwright/pitch-live-architecture-infographic-desktop.png`
- `output/playwright/pitch-live-architecture-infographic-mobile.png`
