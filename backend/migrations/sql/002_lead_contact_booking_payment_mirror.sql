-- BookedAI Phase 1.5
-- Migration 002: lead/contact/booking/payment mirror tables
-- Additive only. Intended for dual-write before read cutover.

create extension if not exists pgcrypto;

create table if not exists contacts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  full_name text,
  email text,
  phone text,
  primary_channel text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_contacts_tenant_email
  on contacts(tenant_id, lower(coalesce(email, '')));

create index if not exists idx_contacts_tenant_phone
  on contacts(tenant_id, phone);

create table if not exists leads (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  contact_id uuid references contacts(id) on delete set null,
  source text,
  status text not null default 'new',
  qualification_score numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_leads_tenant_status_created_at
  on leads(tenant_id, status, created_at desc);

create table if not exists booking_intents (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  contact_id uuid references contacts(id) on delete set null,
  conversation_id text,
  legacy_event_id bigint references conversation_events(id) on delete set null,
  booking_reference text unique,
  source text,
  service_name text,
  service_id text,
  requested_date text,
  requested_time text,
  timezone text,
  booking_path text not null default 'request_callback',
  confidence_level text not null default 'unverified',
  status text not null default 'draft',
  payment_dependency_state text,
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_booking_intents_tenant_booking_reference
  on booking_intents(tenant_id, booking_reference);

create index if not exists idx_booking_intents_tenant_status_created_at
  on booking_intents(tenant_id, status, created_at desc);

create table if not exists payment_intents (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  booking_intent_id uuid references booking_intents(id) on delete set null,
  legacy_event_id bigint references conversation_events(id) on delete set null,
  payment_option text not null,
  status text not null default 'pending',
  amount_aud numeric,
  currency text not null default 'aud',
  external_session_id text,
  payment_url text,
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_payment_intents_tenant_status_created_at
  on payment_intents(tenant_id, status, created_at desc);
