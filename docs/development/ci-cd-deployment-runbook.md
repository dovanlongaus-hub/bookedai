# BookedAI CI/CD And Deployment Runbook

Date: `2026-04-21`

## Purpose

This runbook documents the practical BookedAI release path from local validation through beta rehearsal, host-level production promotion, verification, rollback thinking, and documentation closeout.

It is intentionally based on the checked-in repo and deploy scripts rather than an aspirational platform design.

## Current delivery model

BookedAI currently operates with:

- local and repo-driven validation as the CI layer
- script-driven beta and production deploys as the CD layer
- `beta.bookedai.au` as the required rehearsal surface before production promotion
- host-level execution on the Docker VPS as the approved live deploy runtime
- repo docs, Notion, and Discord as part of release completion rather than optional follow-up

This means BookedAI does not yet run a full automated GitHub Actions promotion pipeline.

## Runtime and environment map

Primary live surfaces:

- `https://bookedai.au`
- `https://product.bookedai.au`
- `https://demo.bookedai.au`
- `https://tenant.bookedai.au`
- `https://portal.bookedai.au`
- `https://admin.bookedai.au`
- `https://api.bookedai.au`
- `https://n8n.bookedai.au`
- `https://supabase.bookedai.au`
- `https://hermes.bookedai.au`
- `https://upload.bookedai.au`
- `https://bot.bookedai.au`

Current promotion tiers:

- local:
  - developer validation and feature work
- beta:
  - `https://beta.bookedai.au`
  - isolated `beta-web` and `beta-backend` runtime containers
  - still shares some current database and provider dependencies with production
- production:
  - `web`, `backend`, `proxy`, `hermes`, `n8n`, Supabase stack, and companion hosts

## Source commands and ownership

Validation and release gate:

- `./scripts/run_release_gate.sh`
- `./scripts/run_release_rehearsal.sh --beta-healthcheck --search-replay-gate`
- `python3 scripts/run_search_replay_gate.py`

Build and operator wrappers:

- `python3 scripts/telegram_workspace_ops.py build-frontend`
- `python3 scripts/telegram_workspace_ops.py deploy-live`
- `python3 scripts/telegram_workspace_ops.py maintenance zoho-crm-webhook-auto-renew`
- `python3 scripts/telegram_workspace_ops.py test --command "./scripts/run_release_gate.sh"`
- `python3 scripts/telegram_workspace_ops.py workspace-command --command "..." --cwd .`
- `python3 scripts/telegram_workspace_ops.py host-command --command "apt-get update"`
- `python3 scripts/telegram_workspace_ops.py sync-doc ...`
- `python3 scripts/telegram_workspace_ops.py sync-repo-docs --skip-discord`

Telegram authorization baseline for those elevated wrappers:

- trusted actor ids come from `BOOKEDAI_TELEGRAM_TRUSTED_USER_IDS`
- allowed elevated actions come from `BOOKEDAI_TELEGRAM_ALLOWED_ACTIONS`
- the current operator baseline can explicitly grant `build_frontend`, `deploy_live`, `test`, `workspace_write`, `repo_structure`, `host_command`, `host_shell`, or `full_project`
- `host-command` is intentionally limited to a checked-in allowlist of host programs and runs through `sudo -n` without a general shell
- `host-shell` is the explicit full-server lane for trusted operators when OpenClaw needs unrestricted host execution outside the repo tree

Deploy entrypoints:

- beta rehearsal:
  - `bash scripts/deploy_beta.sh`
- preferred live deploy wrapper:
- `bash scripts/deploy_live_host.sh`
- `sudo bash scripts/install_zoho_crm_webhook_auto_renew_cron.sh`
- direct host production deploy:
  - `bash scripts/deploy_production.sh`

## Release flow

### 1. Prepare the change

Before asking for beta or production promotion:

- re-read `project.md`
- re-read the relevant requirement-facing or architecture-facing document
- keep the change focused enough that rollback scope is understandable
- identify whether the change affects:
  - public experience
  - booking or search truth
  - tenant or portal workflows
  - admin operations
  - deployment or environment behavior

### 2. Run local validation

Use the smallest meaningful validation first, then the release gate for release-facing work.

Minimum expected commands depend on the change, but the standard promotion gate is:

```sh
./scripts/run_release_gate.sh
```

Stronger rehearsal path:

```sh
./scripts/run_release_rehearsal.sh --beta-healthcheck --search-replay-gate
```

Current gate coverage includes:

- representative Playwright smoke suites
- backend v1 and lifecycle tests
- fixed-query search eval pack
- optional production-shaped search replay gate
- optional migration-state verification when database access is available

Hold the release when a pass only succeeds after unexplained retries.

### 3. Rehearse on beta

Deploy the preview runtime first:

```sh
bash scripts/deploy_beta.sh
```

Current beta deploy behavior from the script:

- requires root `.env`
- requires `supabase/.env`
- syncs app env from Supabase
- ensures the Docker network exists
- rebuilds `beta-web` and `beta-backend`
- starts only those beta services
- restarts `proxy`

Beta is currently the required rehearsal surface before production for user-facing or operationally risky changes.

### 4. Verify beta behavior

After beta deploy, confirm:

- `https://beta.bookedai.au`
- `https://beta.bookedai.au/api/health`
- the affected user flow or operator flow
- no obvious wording, routing, auth, or regression mismatch on the changed surface

Also remember the current limitation:

- beta runtime is container-isolated from production app services
- beta is not yet fully data-isolated from production-grade dependencies

So beta is a release rehearsal surface, not yet a perfect staging twin.

### 5. Promote from the VPS host

Preferred live promotion path:

```sh
bash scripts/deploy_live_host.sh
```

This wrapper:

- confirms Docker is available
- is intended for host-level execution
- uses passwordless `sudo` when available
- forwards to `bash scripts/deploy_production.sh`

Direct production path when already on the correct host:

```sh
bash scripts/deploy_production.sh
```

Current production deploy behavior from the script includes:

- checking or preparing `.env`
- checking or preparing `supabase/.env`
- syncing app env from Supabase
- ensuring Docker network presence
- building `web`, `backend`, `beta-web`, and `beta-backend`
- checking or extending the Let's Encrypt certificate domain set
- starting the Supabase compose stack
- bringing up the full production compose stack with build
- retrying the production compose bring-up with orphan cleanup if Docker Compose hits a transient recreate failure
- restarting `proxy`
- provisioning n8n workflows

Because the production script builds both production and beta images, the release owner should treat it as a wider infra touch than a single-container restart.

### 6. Verify production

Minimum post-deploy verification:

- `https://bookedai.au`
- `https://api.bookedai.au/api/health`
- the changed user or operator path
- production container status for:
  - `web`
  - `backend`
  - `beta-web`
  - `beta-backend`
  - `proxy`
  - `hermes`
  - `n8n`

Recommended live checks:

- homepage resolves and renders
- API health returns success
- the changed flow behaves as expected
- no obvious routing break on adjacent surfaces such as `portal`, `tenant`, or `admin` when touched by the release

### 7. Close the documentation loop

A change is not complete when it is only coded or only deployed.

Required write-back order:

1. update the requirement-facing or request-facing document
2. update `docs/development/implementation-progress.md`
3. update the matching sprint, roadmap, or phase document
4. publish the detailed change note to Notion
5. post the concise summary text to Discord

Preferred operator sync command:

```sh
python3 scripts/telegram_workspace_ops.py sync-doc \
  --title "..." \
  --summary "..." \
  --details-file path/to/change-note.md
```

For broader documentation refreshes:

```sh
python3 scripts/telegram_workspace_ops.py sync-repo-docs --skip-discord
```

## Promote-or-hold decision

Promote when:

- the release gate passes cleanly
- beta rehearsal is healthy for the affected surface
- the owner can explain rollback scope clearly
- production verification is ready to run immediately after deploy
- documentation closeout is part of the same completion pass

Hold when:

- a gate passes only after unexplained reruns
- beta is unhealthy or ambiguous
- the change touches search, booking, auth, or operator truth and beta has not been exercised
- deploy ownership or host runtime is unclear
- the repo docs are still stale

## Rollback guidance

Use the smallest rollback that restores user and operator confidence.

Default rollback thinking:

- roll back the newest additive UI, wording, or route touch first
- avoid reverting stable authoritative-write boundaries unless the incident clearly lives there
- prefer restoring the last known-good deploy path over doing broad unrelated reversions
- keep rollback scope understandable in one short paragraph before acting

Rollback must be discussed in terms of:

- affected surfaces
- whether the risk is UI-only, routing, auth, booking, or data-shaping
- whether production data or integrations may already have been touched

## Operator-friendly command ladder

Smallest build-only operation:

```sh
python3 scripts/telegram_workspace_ops.py build-frontend
```

Standard beta rehearsal:

```sh
./scripts/run_release_gate.sh
bash scripts/deploy_beta.sh
```

Standard live promotion:

```sh
./scripts/run_release_gate.sh
bash scripts/deploy_beta.sh
bash scripts/deploy_live_host.sh
```

Standard documentation closeout:

```sh
python3 scripts/telegram_workspace_ops.py sync-doc \
  --title "..." \
  --summary "..." \
  --details-file path/to/change-note.md
```

## Known current constraints

- no full automated push-to-prod CI pipeline is currently repo-confirmed
- beta is required, but still not fully isolated from production-grade data and integration dependencies
- live deploy authority for Telegram or OpenClaw depends on host-level execution, not the default container runtime
- production deploy currently rebuilds both production and beta app images in one pass

## Related references

- [README](../../README.md)
- [CI/CD Collaboration Guide](./ci-cd-collaboration-guide.md)
- [Release Gate Checklist](./release-gate-checklist.md)
- [Implementation Progress](./implementation-progress.md)
- [DevOps, Deployment, CI/CD, and Scaling Strategy](../architecture/devops-deployment-cicd-scaling-strategy.md)
