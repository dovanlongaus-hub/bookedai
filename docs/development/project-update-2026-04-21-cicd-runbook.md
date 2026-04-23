# BookedAI CI/CD Runbook Documentation Update

Date: `2026-04-21`

## Summary

The BookedAI documentation set now includes a dedicated CI/CD and deployment runbook that turns the existing release summary into a concrete operator procedure.

## What changed

- added `docs/development/ci-cd-deployment-runbook.md`
- kept `docs/development/ci-cd-collaboration-guide.md` as the short team handoff layer
- documented the real current release path:
  - local validation
  - root release gate
  - beta rehearsal on `beta.bookedai.au`
  - host-level production promotion through `bash scripts/deploy_live_host.sh`
  - live verification
  - repo docs, Notion, and Discord closeout
- captured current script behavior from:
  - `scripts/deploy_beta.sh`
  - `scripts/deploy_live_host.sh`
  - `scripts/deploy_production.sh`
  - `scripts/telegram_workspace_ops.py`
- clarified current operational constraints:
  - no fully automated push-to-prod GitHub Actions promotion pipeline yet
  - beta is runtime-isolated but not fully data-isolated
  - live deploy authority for Telegram/OpenClaw must run on the Docker VPS host
  - production deploy rebuilds both production and beta app images in one pass

## Documentation synchronization

The new runbook has been wired into the current source-of-truth chain:

- `README.md`
- `project.md`
- `docs/development/implementation-progress.md`
- `docs/development/roadmap-sprint-document-register.md`
- `docs/development/ci-cd-collaboration-guide.md`
- `docs/development/release-gate-checklist.md`
- `docs/architecture/devops-deployment-cicd-scaling-strategy.md`

## Why this matters

Before this update, the repo already had a truthful CI/CD summary, but operators still had to infer concrete deployment behavior from multiple scripts and scattered docs.

The new runbook reduces that gap by giving collaborators one place to answer:

- which command to run for beta
- which command to run for live deploy
- what the scripts actually do
- what to verify after deploy
- when to promote versus hold
- how documentation closeout fits into release completion

## Follow-up considerations

- if BookedAI later adds GitHub Actions or another automated pipeline, the runbook should be updated rather than replaced so it remains truthful about both automated and manual promotion paths
- when beta gets stronger secret, data, and provider isolation, the current limitations section should be updated explicitly
