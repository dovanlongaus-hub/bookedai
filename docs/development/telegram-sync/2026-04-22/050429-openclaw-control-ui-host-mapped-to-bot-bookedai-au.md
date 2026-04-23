# OpenClaw Control UI host mapped to bot.bookedai.au

- Timestamp: 2026-04-22T05:04:29.119447+00:00
- Source: telegram
- Category: change-summary
- Status: submitted

## Summary

Confirmed the current OpenClaw stack already includes the built-in Control UI on gateway port 18789, then wired bot.bookedai.au through production Nginx, DNS automation defaults, and TLS/deploy scripts so the gateway can be exposed as a first-class browser surface.

## Details

Verification and delivery note:\n- Checked the local OpenClaw compose and official OpenClaw docs, which confirm the Control UI is served by the gateway itself on port 18789.\n- Added bot.bookedai.au HTTP->HTTPS and HTTPS reverse-proxy records in deploy/nginx/bookedai.au.conf with WebSocket-friendly headers and long-lived proxy timeouts.\n- Updated scripts/deploy_production.sh so certificate issuance and SAN verification include bot.bookedai.au, and updated scripts/bootstrap_vps.sh plus scripts/update_cloudflare_dns_records.sh so host bootstrap and DNS automation stay aligned.\n- Synced README.md, project.md, deploy/openclaw/README.md, docs/development/ci-cd-deployment-runbook.md, docs/development/sprint-13-16-user-surface-delivery-package.md, docs/development/implementation-progress.md, and memory/2026-04-22.md to record the new operator-facing host.\n- Shell syntax verification passed for deploy_production.sh, bootstrap_vps.sh, update_cloudflare_dns_records.sh, and configure_cloudflare_dns.sh.\n- Live rollout from this workspace is still blocked because Docker host access is not available in the current shell, so the remaining production step is to run the host-level deploy wrapper on the VPS and then verify https://bot.bookedai.au.
