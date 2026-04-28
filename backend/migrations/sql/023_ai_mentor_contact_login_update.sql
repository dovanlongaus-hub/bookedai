-- BookedAI Phase 19
-- Migration 023: update AI Mentor 1-1 tenant login and contact channels.
-- Idempotent follow-up for environments where migration 013 already seeded tenant3 / 123.

with target_tenant as (
  select id::text as tenant_id, slug
  from tenants
  where slug = 'ai-mentor-doer'
)
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
  tenant_id,
  slug,
  'aimentor@bookedai.au',
  'AI Mentor 1-1',
  'password',
  'aimentor@bookedai.au',
  'tenant_admin',
  'active'
from target_tenant
on conflict (tenant_id, email) do update set
  tenant_slug = excluded.tenant_slug,
  full_name = excluded.full_name,
  auth_provider = excluded.auth_provider,
  provider_subject = excluded.provider_subject,
  role = excluded.role,
  status = excluded.status,
  updated_at = now();

with target_tenant as (
  select id::text as tenant_id
  from tenants
  where slug = 'ai-mentor-doer'
)
delete from tenant_user_memberships
where tenant_id in (select tenant_id from target_tenant)
  and email in ('tenant3@bookedai.local', 'hello@ai.longcare.au');

with target_tenant as (
  select id::text as tenant_id, slug
  from tenants
  where slug = 'ai-mentor-doer'
)
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
  tenant_id,
  slug,
  'aimentor@bookedai.au',
  'aimentor@bookedai.au',
  'aimentor@bookedai.au-static-salt',
  'e07c37a4eadff96b5dc8d9b7a56173aff1dd0be1b6c6cae039d4cd3b2f29eecb',
  'tenant_admin',
  'active'
from target_tenant
on conflict (username) do update set
  tenant_id = excluded.tenant_id,
  tenant_slug = excluded.tenant_slug,
  email = excluded.email,
  password_salt = excluded.password_salt,
  password_hash = excluded.password_hash,
  role = excluded.role,
  status = excluded.status,
  updated_at = now();

with target_tenant as (
  select id::text as tenant_id
  from tenants
  where slug = 'ai-mentor-doer'
)
delete from tenant_user_credentials
where tenant_id in (select tenant_id from target_tenant)
  and username in ('tenant3', 'tenant3@bookedai.local', 'hello@ai.longcare.au');

update tenant_settings
set
  settings_json =
    (
      coalesce(settings_json, '{}'::jsonb) || jsonb_build_object(
        'contact_email', 'aimentor@bookedai.au',
        'contact_phone', '+84908444095',
        'support_email', 'aimentor@bookedai.au',
        'support_phone', '+84908444095',
        'support_whatsapp', '+84908444095',
        'support_telegram', '+84908444095',
        'support_imessage', '+84908444095',
        'tenant_notifications', jsonb_build_object(
          'email', 'aimentor@bookedai.au',
          'phone', '+84908444095',
          'whatsapp', '+84908444095',
          'telegram', '+84908444095',
          'imessage', '+84908444095'
        )
      )
    )
    || jsonb_build_object(
      'partner_plugin_interface',
      coalesce(settings_json -> 'partner_plugin_interface', '{}'::jsonb)
        || jsonb_build_object(
          'support_email', 'aimentor@bookedai.au',
          'support_phone', '+84908444095',
          'support_whatsapp', '+84908444095',
          'support_telegram', '+84908444095',
          'support_imessage', '+84908444095'
        )
    ),
  updated_at = now()
where tenant_id in (
  select id
  from tenants
  where slug = 'ai-mentor-doer'
);

update service_merchant_profiles
set
  owner_email = 'aimentor@bookedai.au',
  business_email = 'aimentor@bookedai.au',
  updated_at = now()
where tenant_id in (
  select id::text
  from tenants
  where slug = 'ai-mentor-doer'
);
