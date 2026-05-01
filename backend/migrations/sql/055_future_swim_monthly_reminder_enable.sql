-- Migration 055: enable monthly reminder for future-swim tenant.
-- Reads tenant_settings.settings_json.monthly_reminder.enabled (default false).
-- Idempotent.

begin;

update tenant_settings ts
set settings_json = coalesce(ts.settings_json, '{}'::jsonb)
                   || jsonb_build_object(
                     'monthly_reminder',
                     coalesce(ts.settings_json->'monthly_reminder', '{}'::jsonb)
                       || jsonb_build_object('enabled', true,
                                             'enabled_at', now()::text,
                                             'enabled_source', 'migration_055_future_swim')
                   ),
    updated_at = now()
from tenants t
where t.slug = 'future-swim'
  and ts.tenant_id = t.id;

-- If no tenant_settings row yet, create one
insert into tenant_settings (tenant_id, settings_json, updated_at)
select t.id, jsonb_build_object('monthly_reminder', jsonb_build_object('enabled', true,
                                                                       'enabled_at', now()::text,
                                                                       'enabled_source', 'migration_055_future_swim')),
       now()
from tenants t
where t.slug = 'future-swim'
  and not exists (select 1 from tenant_settings ts where ts.tenant_id = t.id);

commit;
