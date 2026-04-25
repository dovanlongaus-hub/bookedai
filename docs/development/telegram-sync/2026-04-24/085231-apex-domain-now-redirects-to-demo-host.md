# Apex domain now redirects to demo host

- Timestamp: 2026-04-24T08:52:31.082671+00:00
- Source: codex
- Category: deploy
- Status: completed

## Summary

bookedai.au and www.bookedai.au now redirect to https://demo.bookedai.au/ at the production proxy, and stack health checks were updated to verify the new public entry flow.

## Details

Changed deploy/nginx/bookedai.au.conf so both HTTP and HTTPS apex traffic now return a 301 redirect to https://demo.bookedai.au/, removing the old separate apex frontend-serving block. Updated scripts/healthcheck_stack.sh to assert the bookedai.au redirect target and then probe demo.bookedai.au as the canonical public web surface. Synchronized project.md, README.md, docs/architecture/system-overview.md, docs/development/implementation-progress.md, and docs/development/sprint-13-16-user-surface-delivery-package.md to reflect the new public routing. Live verification completed successfully: direct origin and Cloudflare edge requests now return Location: https://demo.bookedai.au/, and bash scripts/healthcheck_stack.sh passed at 2026-04-24T08:51:26Z.
