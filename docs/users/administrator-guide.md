# BookedAI Administrator Guide

## Audience

This guide is for administrators, operators, and internal maintainers who manage the business console, integrations, deployments, and operational health of the platform.

## Administrative Surfaces

Primary surfaces:

- `admin.bookedai.au`
- `api.bookedai.au`
- `tenant.bookedai.au`
- `portal.bookedai.au`
- `upload.bookedai.au`
- `n8n.bookedai.au`
- `supabase.bookedai.au`
- deployment scripts and host services

## Main Responsibilities

### Admin application operations

Administrators can:

- log into the admin interface
- review overview metrics
- navigate a menu-first admin workspace by operational module
- inspect bookings
- review portal support queue items
- inspect event timelines
- send manual confirmation emails
- search and manage tenants
- inspect tenant detail and workspace state
- update tenant business identity fields
- update tenant branding assets such as logo and hero image
- update tenant introduction and explanatory content, including HTML-backed introduction content
- review and change tenant team roles and statuses
- create, edit, save, archive, publish, and delete tenant-owned products or services
- manage partner profiles
- import and delete service records
- review service catalog quality exports
- inspect selected configuration values
- inspect API inventory

### Admin experience target

The inherited admin target is now a friendlier but enterprise-grade internal workspace.

That means administrators should expect the next admin surface to be organized by:

- clear left-menu navigation
- section-level guidance for operators
- tenant management as a first-class module
- direct-edit forms with explicit save behavior
- tenant-scoped catalog and permission controls

The admin console should not be interpreted as only a one-page diagnostics dashboard anymore.

### Integration operations

Administrators are responsible for:

- AI provider configuration
- n8n webhook configuration
- session-signing secret management for admin and tenant surfaces
- Stripe keys
- Zoho Mail credentials
- Zoho Calendar credentials
- Tawk webhook secret configuration
- Cloudflare DNS credentials

### Deployment operations

Administrators can run:

- VPS bootstrap
- production deployment
- Supabase env preparation
- env synchronization
- n8n workflow provisioning
- health checks
- DNS synchronization
- boot reconciliation

## Primary Operational Commands

### Initial bootstrap

```sh
DEPLOY_USER=ubuntu sudo bash scripts/bootstrap_vps.sh
```

### Production deployment

```sh
bash scripts/deploy_production.sh
```

### Beta staging deployment

```sh
bash scripts/deploy_beta.sh
```

Use this as the default preview rollout path before promoting changes to `bookedai.au`.

### Supabase environment preparation

```sh
bash scripts/prepare_supabase_env.sh
bash scripts/sync_app_env_from_supabase.sh
```

### n8n provisioning

```sh
bash scripts/provision_n8n_workflows.sh
```

### Health and DNS operations

```sh
bash scripts/healthcheck_stack.sh
bash scripts/update_cloudflare_dns_records.sh
sudo bash scripts/install_healthcheck_cron.sh
sudo bash scripts/install_cloudflare_dns_autoupdate.sh
```

The Cloudflare DNS installer now enables both a boot-time service and a recurring `systemd` timer, so the host keeps auto-detecting its current public IPv4 and reconciling the configured DNS records after reboots and during later IP changes. Public IP detection now prefers cloud instance metadata when available and falls back to external IPv4 echo services only when needed.

## Admin Change Discipline

Before upgrading any admin-facing or infrastructure-facing behavior, administrators must review:

- architecture impact
- user impact
- configuration impact
- deployment impact
- monitoring impact

## Failure Areas Administrators Must Watch

- env mismatch between root `.env` and `supabase/.env`
- missing or inconsistent `SESSION_SIGNING_SECRET`, `TENANT_SESSION_SIGNING_SECRET`, or `ADMIN_SESSION_SIGNING_SECRET`
- certificate coverage mismatch across subdomains
- broken webhook auth between backend and n8n
- email credentials drift
- stale service catalog after business changes
- undocumented config changes causing operator confusion
- tenant branding or HTML introduction drift between admin intent and tenant-facing presentation
- tenant-role mistakes causing the wrong people to own content, billing, or product changes

## Current backend route ownership

The active backend router registration now splits top-level `/api` ownership across:

- public catalog routes
- upload routes
- webhook routes
- admin routes
- communication routes
- tenant routes

Administrators should treat this as the current support and troubleshooting map when triaging route ownership or auth regressions.

The remaining large mixed-surface backend file is still `backend/api/v1_routes.py`.

That file is now an explicit carry-forward refactor target rather than an undocumented implementation detail.

## Documentation Maintenance Rule

If admin features, integrations, deployment scripts, or operational procedures change, this document must be reviewed and updated.
