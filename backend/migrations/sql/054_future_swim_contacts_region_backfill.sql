-- Migration 054: backfill contacts.metadata_json.region from
-- futureswim_parent_users.centre_code for parents matched by lower(email).
-- Idempotent: re-runs are no-ops because we set the same value.
-- Only touches contacts whose email matches a futureswim parent AND
-- whose tenant_id matches the future-swim tenant.

begin;

with futureswim_tenant as (
  select id from tenants where slug = 'future-swim' limit 1
),
parent_emails as (
  select lower(email) as email_lower, centre_code
    from futureswim_parent_users
   where centre_code is not null
)
update contacts c
set metadata_json = coalesce(c.metadata_json, '{}'::jsonb)
                   || jsonb_build_object('region', pe.centre_code,
                                         'futureswim_parent_link', true),
    updated_at = now()
from parent_emails pe, futureswim_tenant ft
where lower(c.email) = pe.email_lower
  and c.tenant_id = ft.id;

commit;
