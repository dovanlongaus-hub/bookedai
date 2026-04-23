# BookedAI CI/CD Collaboration Guide

Date: `2026-04-21`

## Purpose

This guide summarizes the actual BookedAI CI/CD process in a form that other collaborators can follow quickly.

Use this document for the short handoff view.
Use `docs/development/ci-cd-deployment-runbook.md` for the detailed step-by-step operator runbook.

It is intentionally practical and repo-truthful:

- BookedAI does not yet run a fully automated GitHub Actions promotion pipeline
- the current delivery path is script-driven on the Docker VPS
- `beta.bookedai.au` is the required rehearsal surface before production promotion
- documentation, Notion, and Discord updates are part of the release-closeout process, not optional follow-up work

## Current CI/CD reality

Current delivery flow is:

1. implement and validate changes locally
2. run the root release gate
3. rehearse on `beta.bookedai.au`
4. promote to production on the VPS host
5. confirm health and smoke behavior
6. write back the change into repo docs
7. sync the detailed update to Notion
8. post a concise operator summary to Discord

This means the current BookedAI CI/CD model is:

- CI:
  - repo-local validation through scripts and tests
- CD:
  - host-level scripted deploy on the Docker VPS
- release control:
  - promote-or-hold discipline using beta plus release gates

## Core commands

### Local validation

Use the root release gate before asking for promotion:

```sh
./scripts/run_release_gate.sh
```

Optional stronger rehearsal:

```sh
./scripts/run_release_rehearsal.sh --beta-healthcheck --search-replay-gate
```

Key gate inputs currently include:

- frontend Playwright smoke coverage
- backend v1 and lifecycle tests
- fixed-query search eval pack
- optional production-shaped search replay
- optional migration-state verification when database access exists

### Build

Frontend build path:

```sh
python3 scripts/telegram_workspace_ops.py build-frontend
```

### Beta deployment

Required preview deploy path:

```sh
bash scripts/deploy_beta.sh
```

This rebuilds and redeploys:

- `beta-web`
- `beta-backend`

without replacing the live production web or backend containers.

### Production deployment

Preferred host-level live deploy path:

```sh
bash scripts/deploy_live_host.sh
```

This is the approved production entrypoint for operators and Telegram/OpenClaw because Docker is available on the VPS host, not in the default container runtime.

Direct production script:

```sh
bash scripts/deploy_production.sh
```

Use it when already operating on the host with the right environment and permissions.

## Collaboration roles

### Feature owner

The person making the change should:

- update the code
- run the relevant local validation
- update the requirement-facing document
- update `docs/development/implementation-progress.md`
- update the matching sprint, roadmap, or phase document
- prepare the summary and detailed closeout note

### Reviewer or release partner

The second collaborator should:

- review the change and the stated rollout risk
- confirm the correct release gate or smoke path was used
- confirm whether beta rehearsal is sufficient or whether deeper manual review is needed
- sanity-check the user-facing wording, operator wording, and rollback surface

### Release owner

The person promoting live should:

- verify beta is healthy
- run or review release gate output
- deploy from the approved host-level path
- verify production health endpoints
- confirm docs, Notion, and Discord write-back are complete

For a small team, one person may wear all three hats, but the checklist should still be followed in the same order.

## Standard change flow for team collaboration

1. Read `project.md` and the relevant requirement or architecture doc before changing code.
2. Implement the code change in the correct module.
3. Run the smallest meaningful local validation first.
4. Run `./scripts/run_release_gate.sh` when the change affects release-facing behavior.
5. Deploy to `beta.bookedai.au` with `bash scripts/deploy_beta.sh` for rehearsal.
6. Verify beta or smoke behavior before production.
7. Promote using `bash scripts/deploy_live_host.sh`.
8. Verify live health:
   - `https://bookedai.au`
   - `https://api.bookedai.au/api/health`
   - production container status
9. Update repo docs:
   - requirement-facing doc
   - `docs/development/implementation-progress.md`
   - sprint or roadmap or phase doc
10. Publish the detailed note to Notion.
11. Post the short summary text to Discord.

## Team handoff rules

- Do not say a change is done if it is only coded but not documented.
- Do not say a release is done if it was deployed but not verified.
- Do not use Discord as the full-detail source of truth.
- Do not use Notion as a substitute for repo docs.
- Do not skip beta rehearsal for user-facing or operationally risky changes unless there is an explicit reason.
- Do not deploy live from the wrong runtime; use the VPS host path.

## Required documentation write-back

Every meaningful delivery should update:

- the changed requirement-facing or request-facing document
- `docs/development/implementation-progress.md`
- the matching sprint, roadmap, or phase artifact

Then publish through:

```sh
python3 scripts/telegram_workspace_ops.py sync-doc \
  --title "..." \
  --summary "..." \
  --details-file path/to/change-note.md
```

For wider documentation refreshes:

```sh
python3 scripts/telegram_workspace_ops.py sync-repo-docs --skip-discord
```

Channel split:

- Discord:
  - direct short summary text
- Notion:
  - full detailed document

## Promote-or-hold summary

Promote when:

- release gate passes cleanly
- beta rehearsal is healthy for the affected surface
- production verification is ready to run
- rollback path is clear
- docs closeout is part of the same completion pass

Hold when:

- a gate only passes after unexplained retries
- beta is unhealthy
- production wording or behavior is ambiguous
- documentation sync is still missing
- the owner cannot explain the rollback boundary

## Source references

- [README](../../README.md)
- [CI/CD And Deployment Runbook](./ci-cd-deployment-runbook.md)
- [Release Gate Checklist](./release-gate-checklist.md)
- [Implementation Progress](./implementation-progress.md)
- [DevOps, Deployment, CI/CD, and Scaling Strategy](../architecture/devops-deployment-cicd-scaling-strategy.md)
