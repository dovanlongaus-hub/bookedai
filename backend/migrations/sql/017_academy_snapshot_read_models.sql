-- BookedAI Phase 2
-- Migration 017: academy snapshot read models
-- Additive only. Do not drop or rename production tables.

create extension if not exists pgcrypto;

create table if not exists academy_students (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  contact_id uuid references contacts(id) on delete set null,
  student_ref text not null,
  identity_key text,
  source_booking_reference text,
  student_name text,
  student_age integer,
  guardian_name text,
  guardian_email text,
  guardian_phone text,
  current_level text,
  status text not null default 'active',
  profile_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, student_ref)
);

create unique index if not exists idx_academy_students_tenant_identity_key
  on academy_students(tenant_id, identity_key)
  where identity_key is not null and identity_key <> '';

create index if not exists idx_academy_students_tenant_status_created_at
  on academy_students(tenant_id, status, created_at desc);

create index if not exists idx_academy_students_tenant_source_booking_reference
  on academy_students(tenant_id, source_booking_reference);

create table if not exists academy_assessment_snapshots (
  id bigserial primary key,
  tenant_id uuid not null references tenants(id) on delete cascade,
  student_id uuid not null references academy_students(id) on delete cascade,
  booking_intent_id uuid references booking_intents(id) on delete set null,
  booking_reference text,
  template_version text not null,
  program_code text not null,
  source text not null default 'api_v1_assessment',
  answers_json jsonb not null default '{}'::jsonb,
  result_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_academy_assessment_snapshots_tenant_student_created_at
  on academy_assessment_snapshots(tenant_id, student_id, created_at desc);

create index if not exists idx_academy_assessment_snapshots_tenant_booking_reference
  on academy_assessment_snapshots(tenant_id, booking_reference);

create table if not exists academy_enrollment_snapshots (
  id bigserial primary key,
  tenant_id uuid not null references tenants(id) on delete cascade,
  student_id uuid not null references academy_students(id) on delete cascade,
  booking_intent_id uuid references booking_intents(id) on delete set null,
  booking_reference text,
  service_id text,
  service_name text,
  class_code text,
  class_label text,
  plan_code text,
  plan_label text,
  status text not null default 'active',
  snapshot_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_academy_enrollment_snapshots_tenant_student_created_at
  on academy_enrollment_snapshots(tenant_id, student_id, created_at desc);

create index if not exists idx_academy_enrollment_snapshots_tenant_booking_reference
  on academy_enrollment_snapshots(tenant_id, booking_reference);

create table if not exists academy_report_snapshots (
  id bigserial primary key,
  tenant_id uuid not null references tenants(id) on delete cascade,
  student_id uuid not null references academy_students(id) on delete cascade,
  booking_intent_id uuid references booking_intents(id) on delete set null,
  booking_reference text,
  report_kind text not null default 'progress_preview',
  report_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_academy_report_snapshots_tenant_student_created_at
  on academy_report_snapshots(tenant_id, student_id, created_at desc);

create index if not exists idx_academy_report_snapshots_tenant_booking_reference
  on academy_report_snapshots(tenant_id, booking_reference);

create table if not exists academy_portal_request_snapshots (
  id bigserial primary key,
  tenant_id uuid not null references tenants(id) on delete cascade,
  student_id uuid references academy_students(id) on delete set null,
  booking_intent_id uuid references booking_intents(id) on delete set null,
  booking_reference text,
  request_type text not null,
  reason_code text,
  status text not null default 'queued',
  request_payload_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_academy_portal_request_snapshots_tenant_student_created_at
  on academy_portal_request_snapshots(tenant_id, student_id, created_at desc);

create index if not exists idx_academy_portal_request_snapshots_tenant_request_type_created_at
  on academy_portal_request_snapshots(tenant_id, request_type, created_at desc);
