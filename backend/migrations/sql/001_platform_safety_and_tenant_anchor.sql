-- BookedAI Phase 1.5
-- Migration 001: platform safety and tenant anchor
-- Additive only. Do not drop or rename production tables.

create extension if not exists pgcrypto;

create table if not exists tenants (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  status text not null default 'active',
  timezone text not null default 'Australia/Sydney',
  locale text not null default 'en-AU',
  industry text,
  service_area_summary jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists tenant_settings (
  tenant_id uuid primary key references tenants(id) on delete cascade,
  settings_json jsonb not null default '{}'::jsonb,
  version integer not null default 1,
  updated_at timestamptz not null default now()
);

create table if not exists audit_logs (
  id bigserial primary key,
  tenant_id uuid references tenants(id) on delete set null,
  actor_type text,
  actor_id text,
  event_type text not null,
  entity_type text,
  entity_id text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_audit_logs_tenant_created_at
  on audit_logs(tenant_id, created_at desc);

create table if not exists outbox_events (
  id bigserial primary key,
  tenant_id uuid references tenants(id) on delete set null,
  event_type text not null,
  aggregate_type text,
  aggregate_id text,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending',
  available_at timestamptz not null default now(),
  idempotency_key text,
  created_at timestamptz not null default now()
);

create index if not exists idx_outbox_events_status_available_at
  on outbox_events(status, available_at);

create table if not exists job_runs (
  id bigserial primary key,
  tenant_id uuid references tenants(id) on delete set null,
  job_name text not null,
  status text not null default 'pending',
  attempt_count integer not null default 0,
  detail text,
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists webhook_events (
  id bigserial primary key,
  tenant_id uuid references tenants(id) on delete set null,
  provider text not null,
  external_event_id text,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'received',
  received_at timestamptz not null default now(),
  processed_at timestamptz
);

create index if not exists idx_webhook_events_provider_external_event_id
  on webhook_events(provider, external_event_id);

create table if not exists idempotency_keys (
  id bigserial primary key,
  tenant_id uuid references tenants(id) on delete set null,
  scope text not null,
  idempotency_key text not null,
  request_hash text,
  response_json jsonb,
  created_at timestamptz not null default now(),
  unique (scope, idempotency_key)
);

create table if not exists feature_flags (
  id bigserial primary key,
  tenant_id uuid references tenants(id) on delete cascade,
  flag_key text not null,
  enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, flag_key)
);

insert into tenants (slug, name, status, timezone, locale)
values ('default-production-tenant', 'BookedAI Default Production Tenant', 'active', 'Australia/Sydney', 'en-AU')
on conflict (slug) do nothing;

insert into tenant_settings (tenant_id, settings_json)
select id, '{}'::jsonb
from tenants
where slug = 'default-production-tenant'
on conflict (tenant_id) do nothing;
