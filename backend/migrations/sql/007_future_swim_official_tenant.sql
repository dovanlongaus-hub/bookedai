-- BookedAI Phase 1.9
-- Migration 007: second official tenant seeded from the live Future Swim website
-- Additive only. This seed adds published swim-school catalog coverage from a real website source.

insert into tenants (slug, name, status, timezone, locale, industry)
values (
  'future-swim',
  'Future Swim',
  'active',
  'Australia/Sydney',
  'en-AU',
  'Kids Services'
)
on conflict (slug) do update set
  name = excluded.name,
  status = excluded.status,
  timezone = excluded.timezone,
  locale = excluded.locale,
  industry = excluded.industry,
  updated_at = now();

insert into tenant_settings (tenant_id, settings_json)
select
  id,
  jsonb_build_object(
    'official_tenant_seed', true,
    'seed_source_type', 'website',
    'seed_source_domain', 'futureswim.com.au',
    'seed_notes', 'Second official tenant curated from verified Future Swim website pages for swim-school search coverage.',
    'seeded_locations', jsonb_build_array(
      'Caringbah',
      'Kirrawee',
      'Leichhardt',
      'Miranda',
      'Rouse Hill',
      'St Peters'
    )
  )
from tenants
where slug = 'future-swim'
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
  seed.service_id,
  'Future Swim',
  tenant.id::text,
  null,
  seed.business_email,
  seed.name,
  'Kids Services',
  seed.summary,
  seed.amount_aud,
  'AUD',
  seed.display_price,
  null::integer,
  seed.venue_name,
  seed.location,
  seed.map_url,
  seed.booking_url,
  'https://images.pexels.com/photos/863988/pexels-photo-863988.jpeg?auto=compress&cs=tinysrgb&w=1200',
  seed.source_url,
  seed.tags_json,
  seed.featured,
  1,
  'published'
from tenants tenant
cross join (
  values
    (
      'future-swim-caringbah-kids-swimming-lessons',
      'caringbah@futureswim.com.au',
      'Kids Swimming Lessons - Caringbah',
      'Future Swim Caringbah',
      'Small-class kids swimming lessons in Caringbah covering water familiarisation, learn-to-swim, stroke correction, and pre-squad progression in a warm ozone-treated pool.',
      30::double precision,
      'A$30 per lesson',
      '85 Cawarra Road, Caringbah, Sydney NSW 2229',
      'https://www.google.com/maps/search/?api=1&query=85%20Cawarra%20Road%2C%20Caringbah%20NSW%202229',
      'https://futureswim.com.au/locations/caringbah/',
      'https://futureswim.com.au/locations/caringbah/',
      '["kids","children","swimming","swim","lessons","water","family","beginner","sydney","caringbah","water familiarisation","learn to swim","stroke correction","pre-squad"]'::jsonb,
      1
    ),
    (
      'future-swim-kirrawee-kids-swimming-lessons',
      'kirrawee@futureswim.com.au',
      'Kids Swimming Lessons - Kirrawee',
      'Future Swim Kirrawee',
      'Kids swimming lessons in Kirrawee with small classes across water familiarisation, learn-to-swim, stroke correction, and pre-squad pathways in an ozone-treated pool.',
      null::double precision,
      'Please enquire for price',
      '62 Waratah Street, Kirrawee, Sydney NSW 2232',
      'https://www.google.com/maps/search/?api=1&query=62%20Waratah%20Street%2C%20Kirrawee%20NSW%202232',
      'https://futureswim.com.au/locations/kirrawee/',
      'https://futureswim.com.au/locations/kirrawee/',
      '["kids","children","swimming","swim","lessons","water","family","beginner","sydney","kirrawee","water familiarisation","learn to swim","stroke correction","pre-squad"]'::jsonb,
      0
    ),
    (
      'future-swim-leichhardt-kids-swimming-lessons',
      'leichhardt@futureswim.com.au',
      'Kids Swimming Lessons - Leichhardt',
      'Future Swim Leichhardt',
      'Leichhardt swim-school lessons for babies and children with small classes, ozone-treated water, and level-based progression from water familiarisation through pre-squad.',
      null::double precision,
      'A$33-A$35 per lesson',
      '124 Marion Street, Leichhardt, Sydney NSW 2040',
      'https://www.google.com/maps/search/?api=1&query=124%20Marion%20Street%2C%20Leichhardt%20NSW%202040',
      'https://futureswim.com.au/locations/leichhardt/',
      'https://futureswim.com.au/locations/leichhardt/',
      '["kids","children","swimming","swim","lessons","water","family","beginner","sydney","leichhardt","water familiarisation","learn to swim","stroke correction","pre-squad"]'::jsonb,
      1
    ),
    (
      'future-swim-miranda-kids-swimming-lessons',
      'miranda@futureswim.com.au',
      'Kids Swimming Lessons - Miranda',
      'Future Swim Miranda',
      'Miranda kids swimming lessons with small classes, ozone-treated water, and progression from water familiarisation to pre-squad for babies and children.',
      30::double precision,
      'A$30 per lesson',
      'Shop 13-14 Kiora Centre, 29 Kiora Road, Miranda, Sydney NSW 2228',
      'https://www.google.com/maps/search/?api=1&query=Shop%2013-14%20Kiora%20Centre%2C%2029%20Kiora%20Road%2C%20Miranda%20NSW%202228',
      'https://futureswim.com.au/locations/miranda/',
      'https://futureswim.com.au/locations/miranda/',
      '["kids","children","swimming","swim","lessons","water","family","beginner","sydney","miranda","water familiarisation","learn to swim","stroke correction","pre-squad"]'::jsonb,
      1
    ),
    (
      'future-swim-rouse-hill-kids-swimming-lessons',
      'rousehill@futureswim.com.au',
      'Kids Swimming Lessons - Rouse Hill',
      'Future Swim Rouse Hill',
      'Rouse Hill kids swimming lessons with small classes, warm ozone-treated water, make-up lessons, and level coverage from water familiarisation to pre-squad.',
      null::double precision,
      'Please enquire for price',
      'Unit 5, 2-4 Resolution Place, Rouse Hill, Sydney NSW',
      'https://www.google.com/maps/search/?api=1&query=Unit%205%2C%202-4%20Resolution%20Place%2C%20Rouse%20Hill%20NSW',
      'https://futureswim.com.au/locations/rouse-hill/',
      'https://futureswim.com.au/locations/rouse-hill/',
      '["kids","children","swimming","swim","lessons","water","family","beginner","sydney","rouse hill","water familiarisation","learn to swim","stroke correction","pre-squad"]'::jsonb,
      0
    ),
    (
      'future-swim-st-peters-kids-swimming-lessons',
      'stpeters@futureswim.com.au',
      'Kids Swimming Lessons - St Peters',
      'Future Swim St Peters',
      'St Peters kids swimming lessons in a boutique warm-water pool with small classes, make-up lessons, free-trial positioning, and level progression from water familiarisation to pre-squad.',
      null::double precision,
      'Please enquire',
      'Unit 3B, 1-7 Unwins Bridge Road, St Peters, Sydney NSW 2044',
      'https://www.google.com/maps/search/?api=1&query=Unit%203B%2C%201-7%20Unwins%20Bridge%20Road%2C%20St%20Peters%20NSW%202044',
      'https://futureswim.com.au/locations/st-peters/',
      'https://futureswim.com.au/locations/st-peters/',
      '["kids","children","swimming","swim","lessons","water","family","beginner","sydney","st peters","water familiarisation","learn to swim","stroke correction","pre-squad","free trial"]'::jsonb,
      1
    )
) as seed(
  service_id,
  business_email,
  name,
  venue_name,
  summary,
  amount_aud,
  display_price,
  location,
  map_url,
  booking_url,
  source_url,
  tags_json,
  featured
)
where tenant.slug = 'future-swim'
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
