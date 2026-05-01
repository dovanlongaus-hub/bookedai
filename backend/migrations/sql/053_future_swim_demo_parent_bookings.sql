-- BookedAI Phase 19+ (Future Swim parent portal — Phase 3.2C)
-- Migration 053: seed a contacts row for the demo parent
-- (demo-parent@futureswim.bookedai.au) and two demo booking_intents so the
-- live parent portal demo at /portal?demo=1 has booking history to render.
--
-- The portal joins booking_intents → contacts via contact_id, and filters
-- by tenant_id = future-swim and lower(contacts.email) = parent.email. We
-- therefore need:
--   1. one contacts row in tenant 'future-swim' with the demo parent's email
--   2. two booking_intents linked to that contact: one upcoming/confirmed,
--      one historical/completed, both pointing at the seeded service
--      merchant profiles from migration 047.
--
-- Idempotent — uses ON CONFLICT on booking_reference (UNIQUE) and an
-- upsert pattern on contacts (email is not UNIQUE per-tenant in the schema,
-- so we delete-and-reinsert by email + tenant guarded by NOT EXISTS).

begin;

-- =============================================================================
-- 1. contacts: ensure a row for the demo parent in tenant 'future-swim'
-- =============================================================================

with fs_tenant as (
  select id from tenants where slug = 'future-swim' limit 1
)
insert into contacts (tenant_id, full_name, email, phone, primary_channel, metadata_json)
select fs_tenant.id,
       'Sample Parent (Demo)',
       'demo-parent@futureswim.bookedai.au',
       '+61400000000',
       'web',
       jsonb_build_object('source', 'futureswim_demo_seed', 'centre_code', 'caringbah')
  from fs_tenant
 where not exists (
   select 1 from contacts c
    where c.tenant_id = fs_tenant.id
      and lower(coalesce(c.email, '')) = 'demo-parent@futureswim.bookedai.au'
 );

-- =============================================================================
-- 2. booking_intents: seed two demo bookings for the demo parent
-- =============================================================================

with fs_tenant as (
  select id from tenants where slug = 'future-swim' limit 1
),
fs_contact as (
  select c.id, c.tenant_id
    from contacts c, fs_tenant
   where c.tenant_id = fs_tenant.id
     and lower(coalesce(c.email, '')) = 'demo-parent@futureswim.bookedai.au'
   limit 1
)
insert into booking_intents (
  tenant_id, contact_id, booking_reference, source, service_name,
  service_id, requested_date, requested_time, timezone,
  booking_path, confidence_level, status, metadata_json
)
select fs_contact.tenant_id, fs_contact.id, d.booking_reference, d.source, d.service_name,
       d.service_id, d.requested_date, d.requested_time, d.timezone,
       d.booking_path, d.confidence_level, d.status, d.metadata_json
  from fs_contact, (values
    (
      'FS-DEMO-LTS-001'::text,
      'futureswim_demo_seed'::text,
      'Learn to Swim — Caringbah'::text,
      'future-swim-caringbah-learn-to-swim'::text,
      '2026-05-08'::text,
      '16:00'::text,
      'Australia/Sydney'::text,
      'self_service'::text,
      'verified'::text,
      'confirmed'::text,
      jsonb_build_object('seed', true, 'demo', true, 'centre_code', 'caringbah')
    ),
    (
      'FS-DEMO-SC-001'::text,
      'futureswim_demo_seed'::text,
      'Stroke Correction — Caringbah'::text,
      'future-swim-caringbah-stroke-correction'::text,
      '2026-04-24'::text,
      '17:00'::text,
      'Australia/Sydney'::text,
      'self_service'::text,
      'verified'::text,
      'completed'::text,
      jsonb_build_object('seed', true, 'demo', true, 'centre_code', 'caringbah')
    )
  ) as d(booking_reference, source, service_name, service_id, requested_date,
         requested_time, timezone, booking_path, confidence_level, status, metadata_json)
on conflict (booking_reference) do nothing;

commit;
