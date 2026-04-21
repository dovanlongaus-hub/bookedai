-- BookedAI Phase 1.11
-- Migration 009: curated published pilot row for the Co Mai Hung chess tenant
-- Additive only. This preserves the original brochure-derived review rows while
-- adding one publish-safe record that can exercise tenant-first public search.

insert into tenant_settings (tenant_id, settings_json)
select
  id,
  jsonb_build_object(
    'published_pilot_service_ids', jsonb_build_array('co-mai-hung-chess-sydney-pilot-group'),
    'published_pilot_market', 'Sydney',
    'published_pilot_notes', 'Curated public pilot row used to validate tenant-first chess search while brochure-derived source rows remain in review.'
  )
from tenants
where slug = 'co-mai-hung-chess-class'
on conflict (tenant_id) do update set
  settings_json = tenant_settings.settings_json || excluded.settings_json,
  updated_at = now();

insert into service_merchant_profiles (
  service_id,
  business_name,
  tenant_id,
  owner_email,
  business_email,
  name,
  category,
  summary,
  amount_aud,
  currency_code,
  display_price,
  duration_minutes,
  venue_name,
  location,
  map_url,
  booking_url,
  image_url,
  source_url,
  tags_json,
  featured,
  is_active,
  publish_state
)
select
  'co-mai-hung-chess-sydney-pilot-group',
  'Co Mai Hung Chess Class',
  tenant.id::text,
  'tenant1@bookedai.local',
  'tenant1@bookedai.local',
  'Kids Chess Class - Sydney Pilot',
  'Kids Services',
  'Curated pilot chess class listing for Sydney families seeking beginner-friendly and tournament-aware coaching with Woman Grandmaster Mai Hung. This public row is intentionally narrower than the brochure-derived source rows so BookedAI can validate tenant-first chess discovery before broader PDF-first publish rules are expanded.',
  null::double precision,
  'AUD',
  'Price confirmed during enquiry',
  60,
  'Co Mai Hung Chess Class',
  'Sydney NSW',
  'https://www.google.com/maps/search/?api=1&query=Sydney%20NSW',
  'https://bookedai.au/?assistant=open',
  'https://images.pexels.com/photos/411207/pexels-photo-411207.jpeg?auto=compress&cs=tinysrgb&w=1200',
  'storage/uploads/documents/fe41/XesZr6pjpiOaMMduIhpspQ.pdf',
  '["kids","children","chess","class","lesson","strategy","beginner","tournament","sydney"]'::jsonb,
  1,
  1,
  'published'
from tenants tenant
where tenant.slug = 'co-mai-hung-chess-class'
on conflict (service_id) do update set
  business_name = excluded.business_name,
  tenant_id = excluded.tenant_id,
  owner_email = excluded.owner_email,
  business_email = excluded.business_email,
  name = excluded.name,
  category = excluded.category,
  summary = excluded.summary,
  amount_aud = excluded.amount_aud,
  currency_code = excluded.currency_code,
  display_price = excluded.display_price,
  duration_minutes = excluded.duration_minutes,
  venue_name = excluded.venue_name,
  location = excluded.location,
  map_url = excluded.map_url,
  booking_url = excluded.booking_url,
  image_url = excluded.image_url,
  source_url = excluded.source_url,
  tags_json = excluded.tags_json,
  featured = excluded.featured,
  is_active = excluded.is_active,
  publish_state = excluded.publish_state,
  updated_at = now();
