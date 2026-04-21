-- BookedAI Phase 1.10
-- Migration 008: tenant username-password credentials for official pilot tenants
-- Additive only. This creates a lightweight credential table for password-based tenant login.

create table if not exists tenant_user_credentials (
  id bigserial primary key,
  tenant_id varchar(64) not null,
  tenant_slug varchar(255) not null,
  email varchar(255) not null,
  username varchar(255) not null unique,
  password_salt varchar(255) not null,
  password_hash varchar(255) not null,
  role varchar(64) not null default 'tenant_admin',
  status varchar(64) not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_tenant_user_credentials_tenant_id
  on tenant_user_credentials(tenant_id);

create index if not exists idx_tenant_user_credentials_tenant_slug
  on tenant_user_credentials(tenant_slug);

create index if not exists idx_tenant_user_credentials_email
  on tenant_user_credentials(email);

insert into tenant_user_memberships (
  tenant_id,
  tenant_slug,
  email,
  full_name,
  auth_provider,
  provider_subject,
  role,
  status
)
select
  tenant.id::text,
  tenant.slug,
  seed.email,
  seed.full_name,
  'password',
  seed.username,
  'tenant_admin',
  'active'
from tenants tenant
cross join (
  values
    ('co-mai-hung-chess-class', 'tenant1', 'tenant1@bookedai.local', 'Tenant 1'),
    ('future-swim', 'tenant2', 'tenant2@bookedai.local', 'Tenant 2')
) as seed(tenant_slug, username, email, full_name)
where tenant.slug = seed.tenant_slug
on conflict (tenant_id, email) do update set
  tenant_slug = excluded.tenant_slug,
  full_name = excluded.full_name,
  auth_provider = excluded.auth_provider,
  provider_subject = excluded.provider_subject,
  role = excluded.role,
  status = excluded.status,
  updated_at = now();

insert into tenant_user_credentials (
  tenant_id,
  tenant_slug,
  email,
  username,
  password_salt,
  password_hash,
  role,
  status
)
select
  tenant.id::text,
  tenant.slug,
  seed.email,
  seed.username,
  seed.password_salt,
  seed.password_hash,
  'tenant_admin',
  'active'
from tenants tenant
cross join (
  values
    (
      'co-mai-hung-chess-class',
      'tenant1',
      'tenant1@bookedai.local',
      'tenant1-static-salt',
      '66d7909de9a57d0d2390d8f6a5bb29f5bae1584a846a8190e851cfc3e5148853'
    ),
    (
      'future-swim',
      'tenant2',
      'tenant2@bookedai.local',
      'tenant2-static-salt',
      '065f970a2649ccee472514714d8fa54fa5099235f2c5785b4109c94de867dfe9'
    )
) as seed(tenant_slug, username, email, password_salt, password_hash)
where tenant.slug = seed.tenant_slug
on conflict (username) do update set
  tenant_id = excluded.tenant_id,
  tenant_slug = excluded.tenant_slug,
  email = excluded.email,
  password_salt = excluded.password_salt,
  password_hash = excluded.password_hash,
  role = excluded.role,
  status = excluded.status,
  updated_at = now();
