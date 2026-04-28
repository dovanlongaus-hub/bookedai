-- BookedAI Phase 19
-- Migration 026: AI Mentor 1-1 Pro tenant login/contact update
-- Additive/idempotent only. Moves the AI Mentor tenant from the previous
-- pilot password/contact baseline to the current operator-requested baseline.

do $$
declare
  ai_mentor_tenant_id text;
begin
  select id::text
  into ai_mentor_tenant_id
  from tenants
  where slug = 'ai-mentor-doer'
  limit 1;

  if ai_mentor_tenant_id is null then
    raise notice 'Skipping AI Mentor credential update because tenant ai-mentor-doer does not exist.';
    return;
  end if;

  update tenants
  set
    name = 'AI Mentor 1-1 Pro',
    updated_at = now()
  where id = cast(ai_mentor_tenant_id as uuid);

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
    ai_mentor_tenant_id,
    'ai-mentor-doer',
    'aimentor@bookedai.au',
    'AI Mentor 1-1 Pro',
    'password',
    'aimentor@bookedai.au',
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
    ai_mentor_tenant_id,
    'ai-mentor-doer',
    'aimentor@bookedai.au',
    'aimentor@bookedai.au',
    'aimentor@bookedai.au-static-salt',
    '3d2a23a72f72d2a55ebda79fad32528cc508166e21956d0f02f1c8904d7af2e7',
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
  where tenant_id = ai_mentor_tenant_id
    and username <> 'aimentor@bookedai.au'
    and (
      username in ('tenant3', 'tenant3@bookedai.local', 'hello@ai.longcare.au')
      or email in ('tenant3@bookedai.local', 'hello@ai.longcare.au')
    );

  update tenant_settings
  set
    settings_json =
      (
        coalesce(settings_json, '{}'::jsonb) || jsonb_build_object(
          'contact_email', 'aimentor@bookedai.au',
          'tenant_login_email', 'aimentor@bookedai.au',
          'contact_phone', '+61481993178',
          'support_email', 'aimentor@bookedai.au',
          'support_phone', '+61481993178',
          'support_whatsapp', '+61481993178',
          'support_telegram', '+61481993178',
          'support_imessage', '+61481993178',
          'tenant_notifications', jsonb_build_object(
            'email', 'aimentor@bookedai.au',
            'phone', '+61481993178',
            'whatsapp', '+61481993178',
            'telegram', '+61481993178',
            'imessage', '+61481993178'
          )
        )
      )
      || jsonb_build_object(
        'partner_plugin_interface',
        coalesce(settings_json -> 'partner_plugin_interface', '{}'::jsonb)
          || jsonb_build_object(
            'partner_name', 'AI Mentor 1-1 Pro',
            'support_email', 'aimentor@bookedai.au',
            'support_phone', '+61481993178',
            'support_whatsapp', '+61481993178',
            'support_telegram', '+61481993178',
            'support_imessage', '+61481993178'
          )
      ),
    updated_at = now()
  where tenant_id = cast(ai_mentor_tenant_id as uuid);

  update service_merchant_profiles
  set
    business_name = 'AI Mentor 1-1 Pro',
    owner_email = 'aimentor@bookedai.au',
    business_email = 'aimentor@bookedai.au',
    updated_at = now()
  where tenant_id = ai_mentor_tenant_id;
end $$;
