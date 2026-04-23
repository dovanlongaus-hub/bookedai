# BookedAI real CI/CD process

- Timestamp: 2026-04-22T00:32:59.604693+00:00
- Source: telegram
- Category: change-summary
- Status: submitted

## Summary

As of 2026-04-21, BookedAI's real CI/CD is repo-driven and semi-manual, not a full GitHub Actions auto-promote pipeline. CI = local/repo validation via `./scripts/run_release_gate.sh`: frontend Playwright smoke, backend contract + lifecycle unittest suite, search eval pack, plus optional production-shaped search replay gate and migration-state verification when env access exists. For stronger rehearsal, the repo uses `./scripts/run_release_rehearsal.sh --beta-healthcheck --search-replay-gate`.

CD = deploy to `beta.bookedai.au` first with `bash scripts/deploy_beta.sh`, verify `https://beta.bookedai.au` and `/api/health`, then promote from the VPS host with `bash scripts/deploy_live_host.sh`, which forwards to `bash scripts/deploy_production.sh`. The production deploy syncs app env from Supabase, builds `web`, `backend`, `beta-web`, and `beta-backend`, checks or extends Let's Encrypt coverage, brings up the Supabase + production Docker stacks, restarts `proxy`, and provisions n8n workflows. A release is only considered complete after live verification plus docs/Notion/Discord closeout.

## Details

Discord-only operator summary of the actual BookedAI CI/CD path, based on docs/development/ci-cd-deployment-runbook.md and the checked-in release/deploy scripts.
