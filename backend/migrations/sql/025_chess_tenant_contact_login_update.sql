-- BookedAI Phase 19
-- Migration 025: Co Mai Hung chess tenant login/contact update
-- Additive/idempotent only. Upgrades the older demo credential to the current
-- operator-facing tenant email and password baseline.

do $$
declare
  chess_tenant_id text;
begin
  select id::text
  into chess_tenant_id
  from tenants
  where slug = 'co-mai-hung-chess-class'
  limit 1;

  if chess_tenant_id is null then
    raise notice 'Skipping chess tenant credential update because tenant co-mai-hung-chess-class does not exist.';
    return;
  end if;

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
  values (
    chess_tenant_id,
    'co-mai-hung-chess-class',
    'chess@bookedai.au',
    'Chess Tenant',
    'password',
    'chess@bookedai.au',
    'tenant_admin',
    'active'
  )
  on conflict (tenant_id, email) do update set
    tenant_slug = excluded.tenant_slug,
    full_name = excluded.full_name,
    auth_provider = excluded.auth_provider,
    provider_subject = excluded.provider_subject,
    role = excluded.role,
    status = excluded.status,
    updated_at = now();

  update tenant_user_memberships
  set
    status = 'inactive',
    updated_at = now()
  where tenant_id = chess_tenant_id
    and email in ('tenant1@bookedai.local')
    and email <> 'chess@bookedai.au';

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
  values (
    chess_tenant_id,
    'co-mai-hung-chess-class',
    'chess@bookedai.au',
    'chess@bookedai.au',
    'chess@bookedai.au-static-salt',
    '5824f7a734de412e60ac3f25d3a4b9b11e39f7a0d639b622819df14fd41a2225',
    'tenant_admin',
    'active'
  )
  on conflict (username) do update set
    tenant_id = excluded.tenant_id,
    tenant_slug = excluded.tenant_slug,
    email = excluded.email,
    password_salt = excluded.password_salt,
    password_hash = excluded.password_hash,
    role = excluded.role,
    status = excluded.status,
    updated_at = now();

  update tenant_user_credentials
  set
    status = 'inactive',
    updated_at = now()
  where tenant_id = chess_tenant_id
    and (username in ('tenant1', 'chess') or (email = 'chess@bookedai.au' and username <> 'chess@bookedai.au'))
    and username <> 'chess@bookedai.au';

  update service_merchant_profiles
  set
    owner_email = 'chess@bookedai.au',
    business_email = 'chess@bookedai.au',
    updated_at = now()
  where tenant_id = chess_tenant_id;

  insert into tenant_settings (tenant_id, settings_json)
  values (
    cast(chess_tenant_id as uuid),
    jsonb_build_object(
      'contact_email', 'chess@bookedai.au',
      'tenant_login_email', 'chess@bookedai.au',
      'sample_tenant_theme', 'chess_class'
    )
  )
  on conflict (tenant_id) do update set
    settings_json = coalesce(tenant_settings.settings_json, '{}'::jsonb) || excluded.settings_json,
    version = tenant_settings.version + 1,
    updated_at = now();
end $$;
