# Apex domain now redirects to pitch host

- Timestamp: 2026-04-24T09:19:59.762082+00:00
- Source: codex
- Category: deploy
- Status: completed

## Summary

bookedai.au and www.bookedai.au now redirect to https://pitch.bookedai.au/ at the production proxy, and stack health checks were updated to verify the new apex-to-pitch entry flow.

## Details

Changed deploy/nginx/bookedai.au.conf so both HTTP and HTTPS apex traffic now return a 301 redirect to https://pitch.bookedai.au/, replacing the earlier demo-host redirect. Updated scripts/healthcheck_stack.sh to assert the bookedai.au redirect target and then probe pitch.bookedai.au as the canonical public web surface. Synchronized README.md, project.md, docs/architecture/system-overview.md, docs/development/implementation-progress.md, docs/development/sprint-13-16-user-surface-delivery-package.md, and memory/2026-04-24.md to reflect the new public-entry routing. Live verification completed successfully: direct origin and Cloudflare edge requests now return Location: https://pitch.bookedai.au/, and bash scripts/healthcheck_stack.sh passed at 2026-04-24T09:19:48Z.
