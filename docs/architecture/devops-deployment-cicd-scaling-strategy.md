# DevOps, Deployment, CI/CD, and Scaling Strategy

## Purpose

This document defines the official Prompt 13-level strategy for deployment, environments, CI/CD, observability, rollback safety, and scaling architecture in `BookedAI.au`.

It is written for a production system that is already running.

The goal is not to replace the current infrastructure with a fashionable platform rewrite. The goal is to evolve the existing Docker-based single-host deployment into a safer, more observable, more resilient platform that can scale in stages while preserving current production continuity.

This strategy inherits and aligns with:

- Prompt 1 product and production continuity direction
- Prompt 2 modular boundary and rollout direction
- Prompt 3 worker, outbox, and foundation scaffold direction
- Prompt 4 data and lifecycle persistence direction
- Prompt 5 API and contract rollout direction
- Prompt 6 public growth and SEO surface direction
- Prompt 7 tenant app direction
- Prompt 8 internal admin and ops direction
- Prompt 9 AI runtime and fallback direction
- Prompt 10 CRM and revenue lifecycle direction
- Prompt 11 integration and reconciliation direction
- Prompt 12 auth, RBAC, tenant isolation, and security direction

## Section 1 — Executive summary

- Current deployment maturity:
  - BookedAI already has a real Docker-based production deployment path with self-hosted Supabase, Nginx edge routing, n8n, Hermes, deploy scripts, and healthcheck scripts.
- Target deployment direction:
  - modular monolith for app runtime
  - separate worker runtimes as async load grows
  - stronger CI gates
  - explicit staging and release discipline
  - better observability, backup, and rollback safety
- Biggest priorities:
  - do not break the live Docker and Nginx deployment path
  - make `beta.bookedai.au` the required rehearsal surface before production promotion
  - add worker and queue discipline without over-splitting services
  - add CI, staging, backup, and restore practice
  - improve runtime isolation for webhook and async processing
- Biggest risks if done poorly:
  - bad deploys without rollback
  - schema or integration changes without staging validation
  - webhook and job backlog going unseen
  - missing backups or untested restores
  - premature infra complexity outpacing team size

## Section 2 — Current deployment reality assessment

### Confirmed facts

Current repo confirms:

- Docker Compose local development in [docker-compose.yml](../../docker-compose.yml)
- Docker Compose production in [docker-compose.prod.yml](../../docker-compose.prod.yml)
- self-hosted Supabase in `supabase/`
- Nginx reverse proxy config in [deploy/nginx/bookedai.au.conf](../../deploy/nginx/bookedai.au.conf)
- frontend Docker image in [frontend/Dockerfile](../../frontend/Dockerfile)
- backend Docker image in [backend/Dockerfile](../../backend/Dockerfile)
- VPS bootstrap and production deploy scripts in `scripts/`
- periodic healthcheck script in [scripts/healthcheck_stack.sh](../../scripts/healthcheck_stack.sh)
- boot-time support units in `deploy/systemd/`
- app, API, admin, uploads, n8n, Supabase, and Hermes routed by subdomain
- beta staging route at `beta.bookedai.au` with dedicated beta web and backend containers

### Confirmed production shape

Current production stack is described in repo docs as:

- `web`
- `backend`
- `beta-web`
- `beta-backend`
- `hermes`
- `n8n`
- `proxy`
- self-hosted Supabase stack on the same Docker host and shared network

### Strong assumptions

- production currently runs on a single VPS or small number of tightly coupled hosts
- rollout is script-driven rather than platform-managed
- n8n still handles some automation that may later move into workers

### Unknowns

- no confirmed automated CI pipeline for tests and deploy promotion
- no confirmed automated Postgres backup schedule in repo
- no confirmed restore-drill or disaster-recovery playbook in repo
- no confirmed centralized metrics stack or paging tool in repo

### Current biggest risks

- deployment is practical but still host-centric
- beta now exists as a runtime-isolated staging tier, but it still shares current database and most external integrations
- no repo-confirmed worker separation yet
- no repo-confirmed backup and restore automation
- healthchecks exist, but broader observability appears incomplete

### Things not to break early

- current Docker Compose production topology
- current subdomain routing
- self-hosted Supabase deployment
- current deploy scripts
- current frontend and backend containers
- current n8n availability

## Section 3 — Target deployment architecture

### Recommended near-term logical runtime units

- Public web surface:
  - static frontend bundle served by Nginx
- Core backend API:
  - FastAPI modular monolith
- Worker runtime:
  - background jobs for email, CRM sync, integration sync, monthly reports, reminders, reconciliation, and outbox processing
- Webhook ingestion:
  - same backend process near-term
  - fast-ingest, queue-after-ingest behavior
- Hermes:
  - separate runtime as already deployed
- n8n:
  - separate automation runtime as already deployed
- Supabase:
  - database, auth, storage, gateway stack
- Edge proxy:
  - Nginx TLS termination, routing, upload hosting
- Static and document storage:
  - current uploaded asset volume

### Recommended target architecture model

- near-term:
  - modular monolith plus workers
- mid-term:
  - app/API separated from async worker runtime
- later:
  - optional specialized AI or integration-heavy workers if load justifies it

### Units to split early

- worker runtime from API runtime
- scheduler or cron-trigger runtime from request-serving runtime if job load increases

### Units that can remain shared near-term

- public, tenant, and admin frontend bundles if the routing split remains logical
- core backend API and AI router logic inside the same backend deploy unit

### Units to split only later

- dedicated AI runtime
- dedicated integration-heavy workers
- separate webhook ingestion service

## Section 4 — Environment strategy

### Required environments

- `local`
- `development`
- `staging`
- `production`

### Optional environments

- preview environments for frontend or PR validation
- integration sandbox environment for provider testing

### Local

- Purpose:
  - daily developer work
- Data:
  - local/test data only
- Integrations:
  - sandbox or disabled
- Safety:
  - no production credentials

### Development

- Purpose:
  - shared internal development validation
- Data:
  - synthetic or scrubbed data
- Integrations:
  - test providers only
- Safety:
  - isolated secrets

### Staging

- Purpose:
  - release rehearsal
  - migration validation
  - integration smoke tests
- Data:
  - scrubbed or seeded representative data
- Integrations:
  - test mode whenever supported
  - real providers only in very limited non-destructive paths if unavoidable
- Safety:
  - production-like topology
  - no production customer traffic

Current BookedAI repo state:

- `beta.bookedai.au` is now the concrete staging entrypoint
- beta routes to `beta-web` and `beta-backend`, not to production `web` and `backend`
- beta still needs future data and provider isolation to become a full staging-grade environment
- release tooling can now also run a lightweight migration-state verification step through `scripts/verify_backend_migration_state.sh` when staging or shadow environments expose `DATABASE_URL` plus `psql`
- the tenant publish lane now also has a dedicated production-shadow rehearsal checklist in `docs/development/tenant-publish-production-shadow-rehearsal.md`, so beta and shadow validation can follow one repeatable sequence instead of ad hoc operator memory

### Production

- Purpose:
  - live customer traffic
- Data:
  - real data only
- Integrations:
  - real providers
- Safety:
  - strongest credentials
  - strongest audit and monitoring

### Environment rules

- production-only credentials must never appear in other environments
- staging should use test Stripe and provider sandboxes where available
- feature flags should vary by environment
- seeded demo data must never contaminate production metrics or CRM

## Section 5 — Container and runtime strategy

### Current inheritance path

BookedAI already uses Docker for:

- frontend
- backend
- proxy
- n8n
- Hermes
- Supabase stack

This should be preserved and hardened rather than replaced.

### Near-term runtime layout

- `web` container
- `backend` container
- `worker` container
- `scheduler` container if needed
- `proxy` container
- existing `n8n` and `hermes`

### What to containerize early

- worker runtime
- scheduler or cron-triggered job runtime
- any future standalone reconciliation job runner

### What can remain as-is

- frontend build and Nginx serving pattern
- backend API runtime
- Nginx edge proxy model

### Reverse proxy responsibilities

- TLS termination
- domain routing
- static and upload hosting
- admin and API route separation
- optional rate-limit and request-size guards

## Section 6 — Deploy unit strategy

### Phase-oriented deploy units

#### Unit 1 — web surfaces

- Responsibilities:
  - public app
  - admin surface
  - tenant surface later
- Why keep together now:
  - low operational overhead
  - frontend build pipeline is simple
- Split later only if:
  - frontend release cadence or auth boundary requires it

#### Unit 2 — core backend API

- Responsibilities:
  - domain APIs
  - booking trust
  - matching
  - auth and lifecycle APIs
  - webhook ingestion near-term
- Why keep together now:
  - modular monolith still fits repo reality
- Scale concern:
  - request concurrency, webhook spikes, and AI latency

#### Unit 3 — worker runtime

- Responsibilities:
  - outbox processing
  - CRM sync
  - email sending
  - reminders
  - reconciliation
  - monthly reporting
- Why split:
  - async load should not block API response path
- Migration timing:
  - early

#### Unit 4 — optional AI-heavy runtime

- Responsibilities:
  - high-throughput AI or search-heavy workloads
- Split timing:
  - only when AI traffic, cost control, or failure isolation demands it

#### Unit 5 — optional integration-heavy runtime

- Responsibilities:
  - provider-specific heavy sync or reconciliation loads
- Split timing:
  - later, only if integration volume justifies it

## Section 7 — CI/CD strategy

### Current reality

- repo does not clearly confirm a working GitHub Actions or equivalent CI pipeline yet

### Recommended CI baseline

- frontend:
  - install
  - lint
  - typecheck
  - build
- backend:
  - dependency install
  - lint or static checks
  - test suite
  - import and startup smoke test
- shared:
  - contract validation
  - docs consistency if desired
- migrations:
  - migration syntax and apply smoke test against ephemeral Postgres

### Recommended deployment flow

- trunk-based or short-lived branch flow
- preview validation for frontend where cheap
- staging deploy before production for significant changes
- manual approval gate for production

### Production safety gates

- tests passing
- build passing
- migration checks passing
- environment config present
- healthcheck after deploy
- rollback path documented per deploy

### Config and infra changes

- config changes should be versioned and reviewed
- deploy scripts should be part of review surface
- risky infra changes should not piggyback on unrelated product deploys

## Section 8 — Database, storage, and backup strategy

### Database strategy

- current direction:
  - self-hosted Supabase Postgres
- keep:
  - Postgres as primary operational data store
- add:
  - disciplined migration ordering
  - pre-deploy backup steps for risky releases
  - restore testing

### Safe migration rules

- additive schema changes first
- backfill second
- code cutover after compatibility window
- destructive cleanup only after validation

### Backup strategy

- daily automated Postgres backups minimum
- more frequent logical or physical backups for high-value production data where feasible
- backup before risky deploys or major schema changes

### Restore strategy

- regular restore drills
- validate both schema and data recovery
- document RPO and RTO targets

### Storage strategy

- current uploads live on mounted host storage
- near-term:
  - keep volume-backed uploads if operations are stable
- later:
  - migrate to S3-compatible storage if scale, redundancy, or CDN benefits justify it

### Retention

- define retention for:
  - uploads
  - logs
  - generated reports
  - backups

## Section 9 — Worker, queue, and scheduling strategy

### Async workload classes

- CRM sync jobs
- email send jobs
- invoice and reminder jobs
- monthly report generation
- integration sync jobs
- reconciliation jobs
- provider confirmation workflows
- retry jobs
- outbox processing

### Recommended near-term model

- keep application as source of truth
- use persistent outbox and job records in Postgres
- run a dedicated worker container
- run scheduler or cron-triggered process separately if needed

### Queue assumptions

- near-term:
  - Postgres-backed outbox and job tables are sufficient
- later:
  - introduce stronger queueing only if throughput or latency requires it

### Failure handling

- job idempotency required
- retry with bounded backoff
- dead-letter or terminal-failure state required
- worker metrics and backlog visibility required

### Independent scaling

- workers should scale separately from API once async load becomes material

## Section 10 — Webhook reliability strategy

### Requirements

- fast acknowledgement
- queue after ingest
- replay-safe processing
- provider-specific verification
- clear alerting on failure or backlog

### Recommended runtime pattern

- near-term:
  - webhook ingestion stays in backend API runtime
  - persist event and enqueue processing quickly
- later:
  - optional dedicated ingestion runtime only if volume or failure isolation requires it

### Operational dashboards

- failed webhook count
- unprocessed webhook backlog
- last successful ingest per provider
- duplicate event rate
- provider-specific error rate

## Section 11 — Observability, monitoring, and alerting

### Logging coverage

- app logs
- API logs
- worker logs
- webhook logs
- integration sync logs
- AI router logs
- payment and billing logs
- booking trust and availability logs
- security and auth logs

### Monitoring coverage

- uptime
- latency
- error rates
- queue backlog
- failed jobs
- sync failures
- email delivery failures
- payment anomalies
- booking conflict anomalies
- AI fallback rates
- webhook failure rates

### Alert priority model

- critical:
  - outage
  - payment processing failures
  - severe webhook ingestion failure
  - booking trust degradation
- high:
  - rising job backlog
  - CRM sync or email failure spikes
- medium:
  - repeated warnings
  - stale data thresholds
- informational:
  - trend summaries
  - non-urgent degradations

### Audience routing

- on-call or founder-level alert for critical production outages
- ops or support summaries for high and medium issues
- internal admin should surface live operational summaries
- monthly ops reports should capture recurring issues and trends

## Section 12 — Secrets, config, and security ops

### Requirements

- environment-separated secrets
- provider credential rotation
- webhook secret rotation
- DB credential protection
- integration credential isolation

### Rules

- no server secrets exposed to client bundles
- tenant-specific secrets must be stored server-side and referenced by connection records
- integration credentials should be isolated per tenant and provider
- rotate credentials with overlap windows where providers support it

### Current inheritance path

- current repo uses `.env`, `.env.production.example`, and `supabase/.env`
- near-term:
  - keep env-file-based ops if team size is small
- mid-term:
  - move production secrets toward a managed secret store if operational maturity increases

## Section 13 — Release, rollout, and rollback strategy

### Rollout principles

- additive first
- use feature flags for risky behavior changes
- preserve compatibility windows
- separate schema rollout from feature cutover

### API changes

- add new contracts before removing old ones
- keep old consumers alive during migration window

### Schema changes

- additive migration
- deploy compatible code
- backfill
- flip feature behavior
- remove old paths later

### UI changes

- can release independently when API compatibility is preserved
- use staged release for high-traffic public changes

### Integration and AI provider changes

- shadow mode or feature flag where feasible
- capture metrics before full cutover

### Rollback paths

- bad deploy:
  - redeploy last known good image or compose build
- bad migration:
  - rely on forward-fix plus compatibility where possible
  - do not assume instant destructive rollback is safe
- broken integration:
  - disable with feature flags or per-tenant config
- provider outage:
  - fallback providers, degraded modes, queue-and-retry behavior
- worker backlog:
  - throttle intake, scale worker, pause non-critical jobs

## Section 14 — Scaling strategy by phase

### Phase 1 — current simple production

- single-host Docker deployment remains acceptable while:
  - traffic is moderate
  - async load is manageable
  - ops team is small

### Phase 2 — moderate growth

- add dedicated workers
- formalize staging
- improve CI gates
- improve backups and restore drills
- improve observability

### Phase 3 — higher async and integration load

- scale worker containers independently
- consider dedicated AI-heavy or integration-heavy runtimes
- strengthen queue strategy if Postgres-backed jobs become limiting

### Phase 4 — larger scale

- optimize public delivery with CDN or edge caching
- isolate webhook or heavy sync ingestion if needed
- consider more formal metrics and tracing stack

### Scaling dimensions to watch

- more SEO traffic
- more chats
- more booking checks
- more webhooks
- more CRM and email events
- more monthly reports
- more tenants
- more integrations

## Section 15 — Deployment-mode infra implications

### Standalone tenants

- more backend operational load
- more booking, billing, lifecycle, and reporting responsibility

### Embedded widget tenants

- widget asset hosting and domain allowlisting matter more
- API request volume may rise sharply

### Plugin and integration tenants

- more sync jobs
- more webhook load
- more tenant-specific secrets

### Headless or API tenants

- stronger API rate limiting
- stronger machine credential management
- more explicit versioning and observability

### Cross-mode implications

- rate limits may differ by mode
- secret storage may differ by mode
- feature flags and deployment config must remain tenant-specific

## Section 16 — Migration path from current infra

### Keep now

- current Docker Compose production topology
- self-hosted Supabase
- current Nginx edge routing
- existing deploy and healthcheck scripts

### Standardize first

- staging environment
- CI checks
- backup and restore process
- worker runtime conventions
- observability conventions

### Separate first

- background worker runtime from API runtime
- scheduler from request-serving runtime if needed

### Do not touch yet

- full microservice split
- Kubernetes
- complete infra rehost

### Rehost later only if justified

- object storage
- managed secret store
- stronger queueing backbone
- specialized AI runtime

## Section 17 — Final recommendations

- Implement first:
  - staging environment
  - CI safety gates
  - dedicated worker runtime
  - backup and restore playbook
  - stronger observability around jobs, webhooks, billing, and integrations
- Keep simple:
  - Docker Compose
  - modular monolith backend
  - Nginx edge
  - Postgres-backed jobs initially
- Avoid:
  - infra rewrite first
  - too many deploy units too early
  - no staging
  - no rollback path
  - no worker split once async load increases
  - no alerting on critical failures

## Assumptions

- Repo strongly suggests a single-host or tightly coupled host deployment model today.
- Repo confirms Docker Compose, self-hosted Supabase, Nginx proxying, deploy scripts, and healthcheck scripts.
- Repo does not clearly confirm a mature CI pipeline, automated backup policy, or a dedicated queue platform yet, so those are treated as high-priority gaps rather than existing capabilities.
