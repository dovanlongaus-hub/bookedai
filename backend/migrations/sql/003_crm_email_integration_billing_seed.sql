-- BookedAI Phase 1.5
-- Migration 003: CRM, email, integration, and billing seed tables
-- Additive only. This phase creates lifecycle and sync memory, not full feature cutover.

create extension if not exists pgcrypto;

create table if not exists crm_sync_records (
  id bigserial primary key,
  tenant_id uuid not null references tenants(id) on delete cascade,
  entity_type text not null,
  local_entity_id text not null,
  provider text not null default 'zoho_crm',
  external_entity_id text,
  sync_status text not null default 'pending',
  last_synced_at timestamptz,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_crm_sync_records_tenant_entity
  on crm_sync_records(tenant_id, entity_type, local_entity_id);

create table if not exists crm_sync_errors (
  id bigserial primary key,
  tenant_id uuid not null references tenants(id) on delete cascade,
  crm_sync_record_id bigint references crm_sync_records(id) on delete cascade,
  error_code text,
  error_message text not null,
  retryable boolean not null default false,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists email_templates (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references tenants(id) on delete cascade,
  template_key text not null,
  name text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (tenant_id, template_key)
);

create table if not exists email_template_versions (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references email_templates(id) on delete cascade,
  version_number integer not null,
  subject_template text not null,
  body_template text not null,
  html_template text,
  variables_schema jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (template_id, version_number)
);

create table if not exists email_messages (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  contact_id uuid references contacts(id) on delete set null,
  template_key text,
  subject text not null,
  provider text,
  status text not null default 'queued',
  created_at timestamptz not null default now()
);

create table if not exists email_events (
  id bigserial primary key,
  tenant_id uuid not null references tenants(id) on delete cascade,
  email_message_id uuid not null references email_messages(id) on delete cascade,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists integration_connections (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  provider text not null,
  sync_mode text not null default 'read_only',
  status text not null default 'pending',
  settings_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_integration_connections_tenant_provider
  on integration_connections(tenant_id, provider);

create table if not exists billing_accounts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  billing_email text,
  merchant_mode text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id)
);

create table if not exists subscriptions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  billing_account_id uuid references billing_accounts(id) on delete set null,
  status text not null default 'pending',
  plan_code text,
  started_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists subscription_periods (
  id uuid primary key default gen_random_uuid(),
  subscription_id uuid not null references subscriptions(id) on delete cascade,
  period_start timestamptz not null,
  period_end timestamptz not null,
  status text not null default 'open',
  created_at timestamptz not null default now()
);
