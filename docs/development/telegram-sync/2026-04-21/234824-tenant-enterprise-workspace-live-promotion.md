# Tenant enterprise workspace live promotion

- Timestamp: 2026-04-21T23:48:24.292050+00:00
- Source: telegram
- Category: change-summary
- Status: submitted

## Summary

Tenant enterprise workspace redesign slice is now live on tenant.bookedai.au with sidebar navigation and Experience Studio editing.

## Details

# Tenant Enterprise Workspace Live Promotion

Date: `2026-04-21`

## Summary

The first tenant enterprise workspace redesign slice is now live on `tenant.bookedai.au`.

## What was promoted

- tenant workspace sidebar-style navigation
- dedicated `Experience Studio` panel
- tenant-managed workspace settings carried through the tenant overview payload
- profile studio support for:
  - logo upload or URL
  - hero image upload or URL
  - HTML introduction content
  - per-panel operator guidance
- clearer enterprise shell hierarchy around:
  - overview
  - experience
  - catalog
  - plugin
  - bookings
  - integrations
  - billing
  - team

## Verification

- local frontend production build passed:
  - `npm --prefix frontend run build`
- host-level production deploy passed:
  - `bash scripts/deploy_live_host.sh`
- post-deploy checks passed:
  - `https://tenant.bookedai.au` -> `HTTP/2 200`
  - `https://api.bookedai.au/api/health` -> `{"status":"ok","service":"backend"}`
- live asset verification also confirmed the active tenant bundle contains the new `Experience Studio` marker from the promoted `TenantApp` chunk

## Documentation sync

This live promotion is now reflected in:

- `docs/development/implementation-progress.md`
- `memory/2026-04-21.md`
