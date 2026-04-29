# AI Mentor branded host live on aimentor.bookedai.au

- Timestamp: 2026-04-28T16:50:31.920109+00:00
- Source: codex
- Category: deployment
- Status: live

## Summary

aimentor.bookedai.au is live as the tenant-branded AI Mentor 1-1 Pro runtime for ai-mentor-doer, with Cloudflare DNS, certbot SAN renewal, Nginx routing, CORS/TrustedHost, frontend API routing, and live smoke verification complete.

## Details

Implemented and deployed the AI Mentor branded-host infrastructure on 2026-04-28. Added aimentor.bookedai.au to deploy/nginx/bookedai.au.conf with HTTP-to-HTTPS redirect and HTTPS reverse proxy routing: /api/ goes to the backend service and all other paths go to the shared frontend. Added DOMAIN_AIMENTOR to scripts/deploy_production.sh so certbot includes the host in the BookedAI certificate SAN list, and added the same host to bootstrap guidance. Added aimentor.bookedai.au to Cloudflare DNS auto-sync defaults and runtime .env host lists, then ran the Cloudflare sync so the proxied A record points to the current production origin. Added https://aimentor.bookedai.au to backend production CORS/TrustedHost defaults and scripts/sync_app_env_from_supabase.sh so future deploy env sync preserves the origin. Updated frontend API-base resolution so the AI Mentor host uses same-origin /api. Updated README.md, project.md, docs/development/implementation-progress.md, docs/architecture/current-phase-sprint-execution-plan.md, docs/architecture/bookedai-master-roadmap-2026-04-26.md, and memory/2026-04-28.md. Verification passed: shell syntax checks, backend CORS security test 10 passed, frontend TypeScript noEmit, git diff --check, Cloudflare DNS sync, deploy_live_host, certbot SAN renewal including aimentor.bookedai.au, stack health at 2026-04-28T16:49:28Z, nginx -t, https://aimentor.bookedai.au/ returned 200, https://aimentor.bookedai.au/api/health returned backend JSON, https://aimentor.bookedai.au/account returned 200, and the live frontend bundle routes the host to AIMentorBookedAIApp.
