-- 052_contacts_metadata_region.sql
--
-- Phase 4 §2 (mass notification by region) prerequisite:
-- adds an optional ``metadata_json`` jsonb column to ``contacts`` so the
-- tenant operator can stamp a region marker (e.g. "HCMC", "Hanoi", "Sydney",
-- "International") per parent. The tenant broadcast endpoint
-- ``POST /api/v1/tenants/me/broadcast`` filters on ``metadata_json->>'region'``
-- when ``audience.type == 'region'``. Contacts without a region default to
-- "Unknown" via coalesce in the audience-resolution query.
--
-- We deliberately add this as a nullable jsonb column rather than a flat
-- ``region`` text so future segmentation needs (timezone, subscription tier,
-- preferred-language) can extend the same metadata bag without a schema
-- migration churn loop.

ALTER TABLE contacts
  ADD COLUMN IF NOT EXISTS metadata_json JSONB;

CREATE INDEX IF NOT EXISTS idx_contacts_tenant_region
  ON contacts (tenant_id, (metadata_json ->> 'region'));

-- Grant CRUD on the augmented column to the runtime application role.
do $$ begin
  if exists (select 1 from pg_roles where rolname = 'bookedai_app') then
    execute 'grant select, insert, update on table contacts to bookedai_app';
  end if;
end $$;
