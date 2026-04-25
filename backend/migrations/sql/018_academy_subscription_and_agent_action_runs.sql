-- BookedAI Phase 2
-- Migration 018: academy subscription intents and revenue-ops action runs
-- Additive only. Do not drop or rename production tables.

create extension if not exists pgcrypto;

create table if not exists academy_subscription_intents (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  student_id uuid references academy_students(id) on delete set null,
  booking_intent_id uuid references booking_intents(id) on delete set null,
  booking_reference text,
  plan_code text not null,
  plan_label text,
  billing_interval text not null default 'month',
  amount_aud numeric(12, 2),
  status text not null default 'pending_checkout',
  checkout_url text,
  intent_payload_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_academy_subscription_intents_tenant_student_created_at
  on academy_subscription_intents(tenant_id, student_id, created_at desc);

create index if not exists idx_academy_subscription_intents_tenant_booking_reference
  on academy_subscription_intents(tenant_id, booking_reference);

create index if not exists idx_academy_subscription_intents_tenant_status_created_at
  on academy_subscription_intents(tenant_id, status, created_at desc);

create table if not exists agent_action_runs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references tenants(id) on delete cascade,
  agent_type text not null,
  action_type text not null,
  entity_type text not null,
  entity_id text,
  booking_reference text,
  student_ref text,
  status text not null default 'queued',
  priority text not null default 'normal',
  reason text,
  input_json jsonb not null default '{}'::jsonb,
  result_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_agent_action_runs_tenant_status_created_at
  on agent_action_runs(tenant_id, status, created_at desc);

create index if not exists idx_agent_action_runs_tenant_booking_reference
  on agent_action_runs(tenant_id, booking_reference);

create index if not exists idx_agent_action_runs_tenant_student_ref
  on agent_action_runs(tenant_id, student_ref);

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'bookedai_app') then
    grant select, insert, update, delete on academy_subscription_intents to bookedai_app;
    grant select, insert, update, delete on agent_action_runs to bookedai_app;
  end if;
end $$;
