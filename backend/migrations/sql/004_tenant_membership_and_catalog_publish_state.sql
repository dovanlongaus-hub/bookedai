-- BookedAI Phase 1.6
-- Migration 004: tenant membership and catalog publish-state foundation
-- Additive only. This phase hardens tenant-authenticated catalog ownership without removing legacy rows.

create extension if not exists pgcrypto;

alter table service_merchant_profiles
  add column if not exists tenant_id varchar(64);

alter table service_merchant_profiles
  add column if not exists owner_email varchar(255);

alter table service_merchant_profiles
  add column if not exists publish_state varchar(32) not null default 'draft';

create index if not exists idx_service_merchant_profiles_tenant_id
  on service_merchant_profiles(tenant_id);

create index if not exists idx_service_merchant_profiles_owner_email
  on service_merchant_profiles(owner_email);

create index if not exists idx_service_merchant_profiles_publish_state
  on service_merchant_profiles(publish_state);

update service_merchant_profiles
set owner_email = lower(nullif(trim(business_email), ''))
where owner_email is null
  and business_email is not null
  and trim(business_email) <> '';

update service_merchant_profiles
set publish_state = case
  when coalesce(is_active, 0) = 1 then 'published'
  else 'draft'
end
where publish_state is null
   or trim(publish_state) = '';

create table if not exists tenant_user_memberships (
  id bigserial primary key,
  tenant_id varchar(64) not null,
  tenant_slug varchar(255) not null,
  email varchar(255) not null,
  full_name varchar(255),
  auth_provider varchar(64) not null default 'google',
  provider_subject varchar(255),
  role varchar(64) not null default 'tenant_admin',
  status varchar(64) not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_tenant_user_memberships_tenant_email
  on tenant_user_memberships(tenant_id, email);

create index if not exists idx_tenant_user_memberships_email
  on tenant_user_memberships(email);

create index if not exists idx_tenant_user_memberships_tenant_slug
  on tenant_user_memberships(tenant_slug);
