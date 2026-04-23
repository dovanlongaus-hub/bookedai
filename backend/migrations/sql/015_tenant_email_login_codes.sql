-- Migration 015: tenant email-first login codes
-- Adds a lightweight verification-code table so tenant auth can use
-- email as the primary identifier for sign-in, invite acceptance, and
-- email-led workspace creation.

create table if not exists tenant_email_login_codes (
  id bigserial primary key,
  tenant_id varchar(64),
  tenant_slug varchar(255),
  email varchar(255) not null,
  auth_intent varchar(64) not null,
  code_hash varchar(255) not null,
  code_last4 varchar(4) not null,
  metadata_json jsonb not null default '{}'::jsonb,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_tenant_email_login_codes_email
  on tenant_email_login_codes (email);

create index if not exists idx_tenant_email_login_codes_tenant
  on tenant_email_login_codes (tenant_id, tenant_slug);

create index if not exists idx_tenant_email_login_codes_active
  on tenant_email_login_codes (email, auth_intent, consumed_at, expires_at);
