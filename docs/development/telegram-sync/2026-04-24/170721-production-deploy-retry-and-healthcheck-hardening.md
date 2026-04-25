# Production deploy retry and healthcheck hardening

- Timestamp: 2026-04-24T17:07:21.186387+00:00
- Source: scripts/deploy_production.sh scripts/healthcheck_stack.sh
- Category: deployment
- Status: implemented

## Summary

Hardened live deploy after product QA exposed a transient Docker Compose recreate/orphan failure around Hermes. Production deploy now retries compose up with orphan cleanup, and stack health now validates running Compose services plus HTTPS probes instead of relying only on fixed container names.

## Details

Changed scripts/deploy_production.sh so the full production docker compose up -d --build path retries with --remove-orphans after a failed recreate pass. Changed scripts/healthcheck_stack.sh so production services are checked via docker compose ps --services --status running for proxy, web, backend, n8n, hermes, beta-web, and beta-backend, while Supabase keeps explicit container checks. Updated README.md, project.md, docs/development/implementation-progress.md, docs/development/sprint-13-16-user-surface-delivery-package.md, docs/development/ci-cd-deployment-runbook.md, and memory/2026-04-24.md. Verification passed with bash syntax checks, live host compose service status, and bash scripts/healthcheck_stack.sh passing at 2026-04-24T17:05:26Z.
