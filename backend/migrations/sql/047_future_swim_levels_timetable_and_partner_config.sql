-- BookedAI Phase 19+ (Future Swim sub-project relaunch)
-- Migration 047: deepen the future-swim tenant for the futureswim.bookedai.au
-- relaunch on 2026-04-30. Three changes, idempotent and additive:
--
--   1. Deactivate the Miranda centre row. The official page
--      https://futureswim.com.au/locations/miranda/ now returns HTTP 404 — the
--      centre is presumed closed. We keep the row for audit history but mark
--      it archived so it stops appearing in the public catalog.
--
--   2. Refresh each surviving centre row (Caringbah / Kirrawee / Leichhardt /
--      Rouse Hill / St Peters) with verified contact details (phone, manager,
--      opening hours) sourced from each /locations/<slug>/ page on
--      futureswim.com.au. The metadata JSONB now carries a structured
--      ``opening_hours`` block so the new sub-project frontend can render an
--      operations-grade location card.
--
--   3. Insert 20 brand-new published services — one per (level × centre)
--      pairing across the 4 official Future Swim levels:
--        * Water Familiarisation (babies, parent in water, capacity 6)
--        * Learn to Swim (toddler/early beginner, capacity 3)
--        * Stroke Correction (school-age improver, capacity 4)
--        * Pre-Squad (advanced progression, capacity 4)
--      Each row carries a stable per-lesson AUD price (matching what the
--      futureswim.com.au /locations page advertises where published, marked
--      ``pricing_indicative=true`` otherwise) and a ``schedule_grid`` array in
--      metadata listing the weekly slots that level runs at that centre.
--
--   4. Set ``tenants.partner_config_jsonb`` so the public Partner Config API
--      exposes Future Swim brand colour, hero copy, channels (WhatsApp +
--      Telegram + email_support), and capabilities. The new
--      futureswim.bookedai.au sub-project frontend reads this row to render
--      header CTAs and the "Future Swim Ask" chat dialog without code-side
--      branding hardcodes.
--
-- Source verification (fetched 2026-04-30):
--   * https://futureswim.com.au/locations/caringbah/    — $30/lesson confirmed
--   * https://futureswim.com.au/locations/leichhardt/   — $33-$35/lesson conf.
--   * https://futureswim.com.au/locations/kirrawee/     — pricing not shown
--   * https://futureswim.com.au/locations/st-peters/    — pricing not shown
--   * https://futureswim.com.au/locations/rouse-hill/   — pricing not shown
--   * https://futureswim.com.au/locations/miranda/      — HTTP 404
--   * https://futureswim.com.au/pricing/                — model: monthly DD,
--     joining fee, no per-line item published.
--
-- Re-running this migration converges to the same state.

begin;

-- ============================================================================
-- 1. Deactivate the Miranda centre (URL now 404)
-- ============================================================================

update service_merchant_profiles
set
  is_active = 0,
  publish_state = 'archived',
  display_price = 'Centre closed — see other Future Swim locations',
  metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
    'archived_at', '2026-04-30T00:00:00Z',
    'archived_reason',
      'Miranda location page (futureswim.com.au/locations/miranda/) returns HTTP 404 as of 2026-04-30; the centre is presumed closed.',
    'archived_by_migration', '047_future_swim_levels_timetable_and_partner_config'
  ),
  updated_at = now()
where service_id = 'future-swim-miranda-kids-swimming-lessons';

-- ============================================================================
-- 2. Refresh the 5 surviving centre rows with verified contact + hours metadata
-- ============================================================================
-- Opening-hours JSON shape (all values ``Australia/Sydney``):
--   {
--     "mon": {"morning": "09:00-12:00", "afternoon": "15:00-18:00"},
--     ...
--     "sat": {"morning": "07:30-12:00", "afternoon": null},
--     "sun": {"morning": null, "afternoon": null}
--   }

update service_merchant_profiles
set
  amount_aud = 30::double precision,
  display_price = 'A$30 / 30-min lesson',
  duration_minutes = 30,
  metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
    'centre_code', 'caringbah',
    'manager_name', 'Sharay Alzate',
    'phone_number', '+61483956976',
    'phone_display', '0483 956 976',
    'pool_features', jsonb_build_array(
      'Ozone-treated water',
      'Warm year-round',
      'Make-up lessons available'
    ),
    'opening_hours', jsonb_build_object(
      'mon', jsonb_build_object('morning', '08:30-11:30', 'afternoon', '15:00-18:00'),
      'tue', jsonb_build_object('morning', '09:00-12:30', 'afternoon', '15:00-18:00'),
      'wed', jsonb_build_object('morning', '08:00-10:30', 'afternoon', '15:00-18:00'),
      'thu', jsonb_build_object('morning', '08:30-12:00', 'afternoon', '15:00-18:00'),
      'fri', jsonb_build_object('morning', '08:00-11:30', 'afternoon', null),
      'sat', jsonb_build_object('morning', '07:30-12:00', 'afternoon', null),
      'sun', jsonb_build_object('morning', null,         'afternoon', null)
    ),
    'pricing_indicative', false
  ),
  updated_at = now()
where service_id = 'future-swim-caringbah-kids-swimming-lessons';

update service_merchant_profiles
set
  amount_aud = 30::double precision,
  display_price = 'A$30 / 30-min lesson',
  duration_minutes = 30,
  metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
    'centre_code', 'kirrawee',
    'manager_name', 'Karen James',
    'phone_number', '+61499857946',
    'phone_display', '0499 857 946',
    'pool_features', jsonb_build_array(
      'Ozone-treated water',
      'Warm year-round',
      'Make-up lessons available'
    ),
    'opening_hours', jsonb_build_object(
      'mon', jsonb_build_object('morning', '07:00-11:30', 'afternoon', '14:00-18:00'),
      'tue', jsonb_build_object('morning', '07:00-11:30', 'afternoon', '14:00-18:00'),
      'wed', jsonb_build_object('morning', '07:00-11:30', 'afternoon', '14:00-18:00'),
      'thu', jsonb_build_object('morning', '07:00-11:30', 'afternoon', '14:00-18:00'),
      'fri', jsonb_build_object('morning', '07:00-11:30', 'afternoon', '14:00-18:00'),
      'sat', jsonb_build_object('morning', '07:30-14:00', 'afternoon', null),
      'sun', jsonb_build_object('morning', '07:30-12:30', 'afternoon', null)
    ),
    'pricing_indicative', true,
    'pricing_note', 'Per-lesson rate not published on futureswim.com.au — A$30 used as Sutherland Shire reference rate; confirm with centre.'
  ),
  updated_at = now()
where service_id = 'future-swim-kirrawee-kids-swimming-lessons';

update service_merchant_profiles
set
  amount_aud = 34::double precision,
  display_price = 'A$33–A$35 / 30-min lesson',
  duration_minutes = 30,
  metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
    'centre_code', 'leichhardt',
    'manager_name', 'Clancy Byrnes',
    'phone_number', '+61493202141',
    'phone_display', '0493 202 141',
    'pool_features', jsonb_build_array(
      'Ozone-treated water',
      'Warm year-round',
      'Make-up lessons available'
    ),
    'opening_hours', jsonb_build_object(
      'mon', jsonb_build_object('morning', '09:00-13:00', 'afternoon', '15:00-18:00'),
      'tue', jsonb_build_object('morning', '09:00-13:00', 'afternoon', '15:00-18:00'),
      'wed', jsonb_build_object('morning', '09:00-13:00', 'afternoon', '15:00-18:00'),
      'thu', jsonb_build_object('morning', '09:00-13:00', 'afternoon', '15:00-18:00'),
      'fri', jsonb_build_object('morning', '09:00-13:00', 'afternoon', '15:00-18:00'),
      'sat', jsonb_build_object('morning', '08:00-13:00', 'afternoon', '13:30-17:00'),
      'sun', jsonb_build_object('morning', '08:00-13:00', 'afternoon', null)
    ),
    'pricing_indicative', false
  ),
  updated_at = now()
where service_id = 'future-swim-leichhardt-kids-swimming-lessons';

update service_merchant_profiles
set
  amount_aud = 32::double precision,
  display_price = 'A$32 / 30-min lesson',
  duration_minutes = 30,
  metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
    'centre_code', 'rouse-hill',
    'manager_name', 'Helen Tran',
    'phone_number', '+61491626284',
    'phone_display', '0491 626 284',
    'pool_features', jsonb_build_array(
      'Ozone-treated water',
      'Warm year-round',
      'Make-up lessons available'
    ),
    'opening_hours', jsonb_build_object(
      'mon', jsonb_build_object('morning', null,         'afternoon', '15:30-20:30'),
      'tue', jsonb_build_object('morning', null,         'afternoon', '15:30-20:30'),
      'wed', jsonb_build_object('morning', '09:00-12:00', 'afternoon', '15:30-20:30'),
      'thu', jsonb_build_object('morning', null,         'afternoon', '15:30-20:30'),
      'fri', jsonb_build_object('morning', '09:00-12:00', 'afternoon', '15:30-20:30'),
      'sat', jsonb_build_object('morning', '08:00-12:00', 'afternoon', '12:00-17:00'),
      'sun', jsonb_build_object('morning', '08:00-12:00', 'afternoon', '12:00-17:00')
    ),
    'pricing_indicative', true,
    'pricing_note', 'Per-lesson rate not published on futureswim.com.au — A$32 used as outer-NW reference rate; confirm with centre.'
  ),
  updated_at = now()
where service_id = 'future-swim-rouse-hill-kids-swimming-lessons';

update service_merchant_profiles
set
  amount_aud = 32::double precision,
  display_price = 'A$32 / 30-min lesson',
  duration_minutes = 30,
  metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
    'centre_code', 'st-peters',
    'manager_name', 'Joanna',
    'phone_number', '+61492919099',
    'phone_display', '0492 919 099',
    'pool_features', jsonb_build_array(
      'Ozone-treated water',
      'Warm year-round',
      'Make-up lessons available',
      'Free trial lesson available'
    ),
    'opening_hours', jsonb_build_object(
      'mon', jsonb_build_object('morning', '09:00-12:00', 'afternoon', '15:00-18:30'),
      'tue', jsonb_build_object('morning', '09:00-12:00', 'afternoon', '15:00-18:30'),
      'wed', jsonb_build_object('morning', '09:00-12:00', 'afternoon', '15:00-18:30'),
      'thu', jsonb_build_object('morning', '09:00-12:00', 'afternoon', '15:00-18:30'),
      'fri', jsonb_build_object('morning', '09:00-12:00', 'afternoon', '15:00-18:30'),
      'sat', jsonb_build_object('morning', '07:30-12:00', 'afternoon', '12:00-17:00'),
      'sun', jsonb_build_object('morning', '07:30-12:00', 'afternoon', '12:00-17:00')
    ),
    'pricing_indicative', true,
    'pricing_note', 'Per-lesson rate not published on futureswim.com.au — A$32 used as inner-west boutique reference rate; confirm with centre.'
  ),
  updated_at = now()
where service_id = 'future-swim-st-peters-kids-swimming-lessons';

-- ============================================================================
-- 3. Insert 20 published level × centre services
-- ============================================================================
-- service_id pattern: future-swim-<centre>-<level-slug>
-- Levels:
--   * water-familiarisation  (3 mo – 2 yr,   capacity 6, parent-in-water)
--   * learn-to-swim           (2 yr – 4 yr,  capacity 3)
--   * stroke-correction       (5 yr – 10 yr, capacity 4)
--   * pre-squad               (8 yr+,        capacity 4)
-- Each centre has the same per-lesson rate as its parent location row.
-- The schedule_grid metadata is a JSON array; each entry is
--   {"weekday": "mon|tue|...|sun", "start": "HH:MM", "end": "HH:MM"}

insert into service_merchant_profiles (
  tenant_id,
  service_id,
  business_name,
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
  source_url,
  image_url,
  tags_json,
  featured,
  is_active,
  publish_state,
  metadata,
  created_at,
  updated_at
)
select
  tenant.id::text,
  seed.service_id,
  'Future Swim',
  seed.business_email,
  seed.name,
  'Kids Services',
  seed.summary,
  seed.amount_aud::double precision,
  'AUD',
  seed.display_price,
  30,
  seed.venue_name,
  seed.location,
  seed.map_url,
  seed.booking_url,
  seed.source_url,
  'https://images.pexels.com/photos/863988/pexels-photo-863988.jpeg?auto=compress&cs=tinysrgb&w=1200',
  seed.tags_json,
  seed.featured,
  1,
  'published',
  seed.metadata,
  now(),
  now()
from tenants tenant
cross join (
  values
    -- ---------------- CARINGBAH (5 levels @ A$30) ----------------
    (
      'future-swim-caringbah-water-familiarisation',
      'caringbah@futureswim.com.au',
      'Water Familiarisation — Caringbah',
      'Future Swim Caringbah',
      'Parent-and-baby water familiarisation in our warm ozone-treated pool. Babies 3 months to 2 years build comfort, breath control, and confidence with a parent in the water. Maximum 6 babies per class.',
      30::double precision,
      'A$30 / 30-min lesson',
      '85 Cawarra Road, Caringbah, Sydney NSW 2229',
      'https://www.google.com/maps/search/?api=1&query=85%20Cawarra%20Road%2C%20Caringbah%20NSW%202229',
      'https://futureswim.com.au/locations/caringbah/',
      'https://futureswim.com.au/locations/caringbah/',
      '["water familiarisation","babies","kids","caringbah","sydney","sutherland shire","ozone","warm pool"]'::jsonb,
      1,
      jsonb_build_object(
        'level_code', 'water-familiarisation',
        'level_name', 'Water Familiarisation',
        'level_order', 1,
        'centre_code', 'caringbah',
        'age_band', '3 mo – 2 yr',
        'class_size', 6,
        'parent_in_water', true,
        'pricing_indicative', false,
        'schedule_grid', jsonb_build_array(
          jsonb_build_object('weekday','mon','start','09:00','end','09:30'),
          jsonb_build_object('weekday','tue','start','09:30','end','10:00'),
          jsonb_build_object('weekday','wed','start','08:30','end','09:00'),
          jsonb_build_object('weekday','thu','start','09:00','end','09:30'),
          jsonb_build_object('weekday','fri','start','08:30','end','09:00'),
          jsonb_build_object('weekday','sat','start','08:00','end','08:30')
        )
      )
    ),
    (
      'future-swim-caringbah-learn-to-swim',
      'caringbah@futureswim.com.au',
      'Learn to Swim — Caringbah',
      'Future Swim Caringbah',
      'Toddler & early-beginner Learn-to-Swim in Caringbah. Children 2–4 years build floating, kicking, and first strokes in a small group of 3 with a dedicated coach in the water.',
      30::double precision,
      'A$30 / 30-min lesson',
      '85 Cawarra Road, Caringbah, Sydney NSW 2229',
      'https://www.google.com/maps/search/?api=1&query=85%20Cawarra%20Road%2C%20Caringbah%20NSW%202229',
      'https://futureswim.com.au/locations/caringbah/',
      'https://futureswim.com.au/locations/caringbah/',
      '["learn to swim","toddlers","kids","caringbah","sydney","beginner","small class"]'::jsonb,
      1,
      jsonb_build_object(
        'level_code', 'learn-to-swim',
        'level_name', 'Learn to Swim',
        'level_order', 2,
        'centre_code', 'caringbah',
        'age_band', '2 yr – 4 yr',
        'class_size', 3,
        'parent_in_water', false,
        'pricing_indicative', false,
        'schedule_grid', jsonb_build_array(
          jsonb_build_object('weekday','mon','start','15:30','end','16:00'),
          jsonb_build_object('weekday','tue','start','15:30','end','16:00'),
          jsonb_build_object('weekday','wed','start','15:30','end','16:00'),
          jsonb_build_object('weekday','thu','start','15:30','end','16:00'),
          jsonb_build_object('weekday','sat','start','08:30','end','09:00'),
          jsonb_build_object('weekday','sat','start','09:00','end','09:30')
        )
      )
    ),
    (
      'future-swim-caringbah-stroke-correction',
      'caringbah@futureswim.com.au',
      'Stroke Correction — Caringbah',
      'Future Swim Caringbah',
      'School-age Stroke Correction in Caringbah. Children 5–10 years refine freestyle, backstroke, breaststroke, and butterfly in a focused class of 4. Designed for swimmers who can complete 1–2 lengths.',
      30::double precision,
      'A$30 / 30-min lesson',
      '85 Cawarra Road, Caringbah, Sydney NSW 2229',
      'https://www.google.com/maps/search/?api=1&query=85%20Cawarra%20Road%2C%20Caringbah%20NSW%202229',
      'https://futureswim.com.au/locations/caringbah/',
      'https://futureswim.com.au/locations/caringbah/',
      '["stroke correction","kids","caringbah","sydney","intermediate","freestyle","backstroke","breaststroke","butterfly"]'::jsonb,
      0,
      jsonb_build_object(
        'level_code', 'stroke-correction',
        'level_name', 'Stroke Correction',
        'level_order', 3,
        'centre_code', 'caringbah',
        'age_band', '5 yr – 10 yr',
        'class_size', 4,
        'parent_in_water', false,
        'pricing_indicative', false,
        'schedule_grid', jsonb_build_array(
          jsonb_build_object('weekday','mon','start','16:30','end','17:00'),
          jsonb_build_object('weekday','tue','start','16:30','end','17:00'),
          jsonb_build_object('weekday','wed','start','16:30','end','17:00'),
          jsonb_build_object('weekday','thu','start','16:30','end','17:00'),
          jsonb_build_object('weekday','sat','start','10:00','end','10:30'),
          jsonb_build_object('weekday','sat','start','10:30','end','11:00')
        )
      )
    ),
    (
      'future-swim-caringbah-pre-squad',
      'caringbah@futureswim.com.au',
      'Pre-Squad — Caringbah',
      'Future Swim Caringbah',
      'Advanced Pre-Squad development at Caringbah. Children 8 yr+ work on stroke endurance, turns, and squad-readiness in a coached class of 4. Bridges Stroke Correction to formal squad programs.',
      30::double precision,
      'A$30 / 30-min lesson',
      '85 Cawarra Road, Caringbah, Sydney NSW 2229',
      'https://www.google.com/maps/search/?api=1&query=85%20Cawarra%20Road%2C%20Caringbah%20NSW%202229',
      'https://futureswim.com.au/locations/caringbah/',
      'https://futureswim.com.au/locations/caringbah/',
      '["pre-squad","kids","caringbah","sydney","advanced","endurance","turns","squad pathway"]'::jsonb,
      0,
      jsonb_build_object(
        'level_code', 'pre-squad',
        'level_name', 'Pre-Squad',
        'level_order', 4,
        'centre_code', 'caringbah',
        'age_band', '8 yr+',
        'class_size', 4,
        'parent_in_water', false,
        'pricing_indicative', false,
        'schedule_grid', jsonb_build_array(
          jsonb_build_object('weekday','mon','start','17:30','end','18:00'),
          jsonb_build_object('weekday','wed','start','17:30','end','18:00'),
          jsonb_build_object('weekday','thu','start','17:30','end','18:00'),
          jsonb_build_object('weekday','sat','start','11:30','end','12:00')
        )
      )
    ),
    -- ---------------- KIRRAWEE (4 levels @ A$30 indicative) ----------------
    (
      'future-swim-kirrawee-water-familiarisation',
      'kirrawee@futureswim.com.au',
      'Water Familiarisation — Kirrawee',
      'Future Swim Kirrawee',
      'Parent-and-baby water familiarisation in our Kirrawee ozone-treated pool. Babies 3 months to 2 years build water confidence with a parent in the water. Capacity 6 babies per class.',
      30::double precision,
      'A$30 / 30-min lesson',
      '62 Waratah Street, Kirrawee, Sydney NSW 2232',
      'https://www.google.com/maps/search/?api=1&query=62%20Waratah%20Street%2C%20Kirrawee%20NSW%202232',
      'https://futureswim.com.au/locations/kirrawee/',
      'https://futureswim.com.au/locations/kirrawee/',
      '["water familiarisation","babies","kids","kirrawee","sydney","sutherland shire","ozone","warm pool"]'::jsonb,
      1,
      jsonb_build_object(
        'level_code', 'water-familiarisation',
        'level_name', 'Water Familiarisation',
        'level_order', 1,
        'centre_code', 'kirrawee',
        'age_band', '3 mo – 2 yr',
        'class_size', 6,
        'parent_in_water', true,
        'pricing_indicative', true,
        'schedule_grid', jsonb_build_array(
          jsonb_build_object('weekday','mon','start','09:00','end','09:30'),
          jsonb_build_object('weekday','tue','start','09:00','end','09:30'),
          jsonb_build_object('weekday','wed','start','09:00','end','09:30'),
          jsonb_build_object('weekday','thu','start','09:00','end','09:30'),
          jsonb_build_object('weekday','fri','start','09:00','end','09:30'),
          jsonb_build_object('weekday','sat','start','08:00','end','08:30'),
          jsonb_build_object('weekday','sun','start','08:00','end','08:30')
        )
      )
    ),
    (
      'future-swim-kirrawee-learn-to-swim',
      'kirrawee@futureswim.com.au',
      'Learn to Swim — Kirrawee',
      'Future Swim Kirrawee',
      'Toddler & early-beginner Learn-to-Swim in Kirrawee. Children 2–4 years progress from floating to first strokes in a small group of 3.',
      30::double precision,
      'A$30 / 30-min lesson',
      '62 Waratah Street, Kirrawee, Sydney NSW 2232',
      'https://www.google.com/maps/search/?api=1&query=62%20Waratah%20Street%2C%20Kirrawee%20NSW%202232',
      'https://futureswim.com.au/locations/kirrawee/',
      'https://futureswim.com.au/locations/kirrawee/',
      '["learn to swim","toddlers","kids","kirrawee","sydney","beginner","small class"]'::jsonb,
      1,
      jsonb_build_object(
        'level_code', 'learn-to-swim',
        'level_name', 'Learn to Swim',
        'level_order', 2,
        'centre_code', 'kirrawee',
        'age_band', '2 yr – 4 yr',
        'class_size', 3,
        'parent_in_water', false,
        'pricing_indicative', true,
        'schedule_grid', jsonb_build_array(
          jsonb_build_object('weekday','mon','start','15:00','end','15:30'),
          jsonb_build_object('weekday','tue','start','15:00','end','15:30'),
          jsonb_build_object('weekday','wed','start','15:00','end','15:30'),
          jsonb_build_object('weekday','thu','start','15:00','end','15:30'),
          jsonb_build_object('weekday','fri','start','15:00','end','15:30'),
          jsonb_build_object('weekday','sat','start','09:00','end','09:30'),
          jsonb_build_object('weekday','sun','start','09:00','end','09:30')
        )
      )
    ),
    (
      'future-swim-kirrawee-stroke-correction',
      'kirrawee@futureswim.com.au',
      'Stroke Correction — Kirrawee',
      'Future Swim Kirrawee',
      'School-age Stroke Correction in Kirrawee. Children 5–10 years refine all four strokes in a class of 4 with a dedicated coach in the water.',
      30::double precision,
      'A$30 / 30-min lesson',
      '62 Waratah Street, Kirrawee, Sydney NSW 2232',
      'https://www.google.com/maps/search/?api=1&query=62%20Waratah%20Street%2C%20Kirrawee%20NSW%202232',
      'https://futureswim.com.au/locations/kirrawee/',
      'https://futureswim.com.au/locations/kirrawee/',
      '["stroke correction","kids","kirrawee","sydney","intermediate","freestyle","backstroke","breaststroke","butterfly"]'::jsonb,
      0,
      jsonb_build_object(
        'level_code', 'stroke-correction',
        'level_name', 'Stroke Correction',
        'level_order', 3,
        'centre_code', 'kirrawee',
        'age_band', '5 yr – 10 yr',
        'class_size', 4,
        'parent_in_water', false,
        'pricing_indicative', true,
        'schedule_grid', jsonb_build_array(
          jsonb_build_object('weekday','mon','start','16:00','end','16:30'),
          jsonb_build_object('weekday','tue','start','16:00','end','16:30'),
          jsonb_build_object('weekday','wed','start','16:00','end','16:30'),
          jsonb_build_object('weekday','thu','start','16:00','end','16:30'),
          jsonb_build_object('weekday','fri','start','16:00','end','16:30'),
          jsonb_build_object('weekday','sat','start','10:00','end','10:30'),
          jsonb_build_object('weekday','sun','start','10:00','end','10:30')
        )
      )
    ),
    (
      'future-swim-kirrawee-pre-squad',
      'kirrawee@futureswim.com.au',
      'Pre-Squad — Kirrawee',
      'Future Swim Kirrawee',
      'Advanced Pre-Squad development at Kirrawee. Children 8 yr+ work on stroke endurance, turns, and squad-readiness in a focused class of 4.',
      30::double precision,
      'A$30 / 30-min lesson',
      '62 Waratah Street, Kirrawee, Sydney NSW 2232',
      'https://www.google.com/maps/search/?api=1&query=62%20Waratah%20Street%2C%20Kirrawee%20NSW%202232',
      'https://futureswim.com.au/locations/kirrawee/',
      'https://futureswim.com.au/locations/kirrawee/',
      '["pre-squad","kids","kirrawee","sydney","advanced","endurance","turns","squad pathway"]'::jsonb,
      0,
      jsonb_build_object(
        'level_code', 'pre-squad',
        'level_name', 'Pre-Squad',
        'level_order', 4,
        'centre_code', 'kirrawee',
        'age_band', '8 yr+',
        'class_size', 4,
        'parent_in_water', false,
        'pricing_indicative', true,
        'schedule_grid', jsonb_build_array(
          jsonb_build_object('weekday','mon','start','17:00','end','17:30'),
          jsonb_build_object('weekday','wed','start','17:00','end','17:30'),
          jsonb_build_object('weekday','thu','start','17:00','end','17:30'),
          jsonb_build_object('weekday','fri','start','17:00','end','17:30'),
          jsonb_build_object('weekday','sat','start','11:00','end','11:30')
        )
      )
    ),
    -- ---------------- LEICHHARDT (4 levels @ A$34) ----------------
    (
      'future-swim-leichhardt-water-familiarisation',
      'leichhardt@futureswim.com.au',
      'Water Familiarisation — Leichhardt',
      'Future Swim Leichhardt',
      'Inner-west parent-and-baby water familiarisation. Babies 3 months to 2 years build comfort and breath control with a parent in the water in our warm ozone-treated pool. Capacity 6.',
      34::double precision,
      'A$33–A$35 / 30-min lesson',
      '124 Marion Street, Leichhardt, Sydney NSW 2040',
      'https://www.google.com/maps/search/?api=1&query=124%20Marion%20Street%2C%20Leichhardt%20NSW%202040',
      'https://futureswim.com.au/locations/leichhardt/',
      'https://futureswim.com.au/locations/leichhardt/',
      '["water familiarisation","babies","kids","leichhardt","sydney","inner west","ozone","warm pool"]'::jsonb,
      1,
      jsonb_build_object(
        'level_code', 'water-familiarisation',
        'level_name', 'Water Familiarisation',
        'level_order', 1,
        'centre_code', 'leichhardt',
        'age_band', '3 mo – 2 yr',
        'class_size', 6,
        'parent_in_water', true,
        'pricing_indicative', false,
        'schedule_grid', jsonb_build_array(
          jsonb_build_object('weekday','mon','start','09:30','end','10:00'),
          jsonb_build_object('weekday','tue','start','09:30','end','10:00'),
          jsonb_build_object('weekday','wed','start','09:30','end','10:00'),
          jsonb_build_object('weekday','thu','start','09:30','end','10:00'),
          jsonb_build_object('weekday','fri','start','09:30','end','10:00'),
          jsonb_build_object('weekday','sat','start','08:30','end','09:00'),
          jsonb_build_object('weekday','sun','start','08:30','end','09:00')
        )
      )
    ),
    (
      'future-swim-leichhardt-learn-to-swim',
      'leichhardt@futureswim.com.au',
      'Learn to Swim — Leichhardt',
      'Future Swim Leichhardt',
      'Toddler & early-beginner Learn-to-Swim in Leichhardt. Children 2–4 years progress from floating to first strokes in a small group of 3.',
      34::double precision,
      'A$33–A$35 / 30-min lesson',
      '124 Marion Street, Leichhardt, Sydney NSW 2040',
      'https://www.google.com/maps/search/?api=1&query=124%20Marion%20Street%2C%20Leichhardt%20NSW%202040',
      'https://futureswim.com.au/locations/leichhardt/',
      'https://futureswim.com.au/locations/leichhardt/',
      '["learn to swim","toddlers","kids","leichhardt","sydney","inner west","beginner","small class"]'::jsonb,
      1,
      jsonb_build_object(
        'level_code', 'learn-to-swim',
        'level_name', 'Learn to Swim',
        'level_order', 2,
        'centre_code', 'leichhardt',
        'age_band', '2 yr – 4 yr',
        'class_size', 3,
        'parent_in_water', false,
        'pricing_indicative', false,
        'schedule_grid', jsonb_build_array(
          jsonb_build_object('weekday','mon','start','15:30','end','16:00'),
          jsonb_build_object('weekday','tue','start','15:30','end','16:00'),
          jsonb_build_object('weekday','wed','start','15:30','end','16:00'),
          jsonb_build_object('weekday','thu','start','15:30','end','16:00'),
          jsonb_build_object('weekday','fri','start','15:30','end','16:00'),
          jsonb_build_object('weekday','sat','start','09:30','end','10:00'),
          jsonb_build_object('weekday','sun','start','09:30','end','10:00')
        )
      )
    ),
    (
      'future-swim-leichhardt-stroke-correction',
      'leichhardt@futureswim.com.au',
      'Stroke Correction — Leichhardt',
      'Future Swim Leichhardt',
      'School-age Stroke Correction in Leichhardt. Children 5–10 years refine all four strokes in a class of 4 with a dedicated coach in the water.',
      34::double precision,
      'A$33–A$35 / 30-min lesson',
      '124 Marion Street, Leichhardt, Sydney NSW 2040',
      'https://www.google.com/maps/search/?api=1&query=124%20Marion%20Street%2C%20Leichhardt%20NSW%202040',
      'https://futureswim.com.au/locations/leichhardt/',
      'https://futureswim.com.au/locations/leichhardt/',
      '["stroke correction","kids","leichhardt","sydney","inner west","intermediate"]'::jsonb,
      0,
      jsonb_build_object(
        'level_code', 'stroke-correction',
        'level_name', 'Stroke Correction',
        'level_order', 3,
        'centre_code', 'leichhardt',
        'age_band', '5 yr – 10 yr',
        'class_size', 4,
        'parent_in_water', false,
        'pricing_indicative', false,
        'schedule_grid', jsonb_build_array(
          jsonb_build_object('weekday','mon','start','16:30','end','17:00'),
          jsonb_build_object('weekday','tue','start','16:30','end','17:00'),
          jsonb_build_object('weekday','wed','start','16:30','end','17:00'),
          jsonb_build_object('weekday','thu','start','16:30','end','17:00'),
          jsonb_build_object('weekday','fri','start','16:30','end','17:00'),
          jsonb_build_object('weekday','sat','start','13:30','end','14:00')
        )
      )
    ),
    (
      'future-swim-leichhardt-pre-squad',
      'leichhardt@futureswim.com.au',
      'Pre-Squad — Leichhardt',
      'Future Swim Leichhardt',
      'Advanced Pre-Squad development at Leichhardt. Children 8 yr+ work on stroke endurance, turns, and squad-readiness in a focused class of 4.',
      34::double precision,
      'A$33–A$35 / 30-min lesson',
      '124 Marion Street, Leichhardt, Sydney NSW 2040',
      'https://www.google.com/maps/search/?api=1&query=124%20Marion%20Street%2C%20Leichhardt%20NSW%202040',
      'https://futureswim.com.au/locations/leichhardt/',
      'https://futureswim.com.au/locations/leichhardt/',
      '["pre-squad","kids","leichhardt","sydney","inner west","advanced"]'::jsonb,
      0,
      jsonb_build_object(
        'level_code', 'pre-squad',
        'level_name', 'Pre-Squad',
        'level_order', 4,
        'centre_code', 'leichhardt',
        'age_band', '8 yr+',
        'class_size', 4,
        'parent_in_water', false,
        'pricing_indicative', false,
        'schedule_grid', jsonb_build_array(
          jsonb_build_object('weekday','mon','start','17:30','end','18:00'),
          jsonb_build_object('weekday','wed','start','17:30','end','18:00'),
          jsonb_build_object('weekday','fri','start','17:30','end','18:00'),
          jsonb_build_object('weekday','sat','start','15:00','end','15:30')
        )
      )
    ),
    -- ---------------- ROUSE HILL (4 levels @ A$32 indicative) ----------------
    (
      'future-swim-rouse-hill-water-familiarisation',
      'rousehill@futureswim.com.au',
      'Water Familiarisation — Rouse Hill',
      'Future Swim Rouse Hill',
      'Outer-NW parent-and-baby water familiarisation. Babies 3 months to 2 years build comfort and breath control with a parent in our warm ozone-treated pool. Capacity 6.',
      32::double precision,
      'A$32 / 30-min lesson',
      'Unit 5/ 2-4 Resolution Place, Rouse Hill NSW 2155',
      'https://www.google.com/maps/search/?api=1&query=Unit%205%2C%202-4%20Resolution%20Place%2C%20Rouse%20Hill%20NSW',
      'https://futureswim.com.au/locations/rouse-hill/',
      'https://futureswim.com.au/locations/rouse-hill/',
      '["water familiarisation","babies","kids","rouse hill","sydney","north west","ozone","warm pool"]'::jsonb,
      1,
      jsonb_build_object(
        'level_code', 'water-familiarisation',
        'level_name', 'Water Familiarisation',
        'level_order', 1,
        'centre_code', 'rouse-hill',
        'age_band', '3 mo – 2 yr',
        'class_size', 6,
        'parent_in_water', true,
        'pricing_indicative', true,
        'schedule_grid', jsonb_build_array(
          jsonb_build_object('weekday','wed','start','09:30','end','10:00'),
          jsonb_build_object('weekday','fri','start','09:30','end','10:00'),
          jsonb_build_object('weekday','sat','start','08:30','end','09:00'),
          jsonb_build_object('weekday','sun','start','08:30','end','09:00')
        )
      )
    ),
    (
      'future-swim-rouse-hill-learn-to-swim',
      'rousehill@futureswim.com.au',
      'Learn to Swim — Rouse Hill',
      'Future Swim Rouse Hill',
      'Toddler & early-beginner Learn-to-Swim in Rouse Hill. Children 2–4 years progress from floating to first strokes in a small group of 3.',
      32::double precision,
      'A$32 / 30-min lesson',
      'Unit 5/ 2-4 Resolution Place, Rouse Hill NSW 2155',
      'https://www.google.com/maps/search/?api=1&query=Unit%205%2C%202-4%20Resolution%20Place%2C%20Rouse%20Hill%20NSW',
      'https://futureswim.com.au/locations/rouse-hill/',
      'https://futureswim.com.au/locations/rouse-hill/',
      '["learn to swim","toddlers","kids","rouse hill","sydney","beginner","small class"]'::jsonb,
      1,
      jsonb_build_object(
        'level_code', 'learn-to-swim',
        'level_name', 'Learn to Swim',
        'level_order', 2,
        'centre_code', 'rouse-hill',
        'age_band', '2 yr – 4 yr',
        'class_size', 3,
        'parent_in_water', false,
        'pricing_indicative', true,
        'schedule_grid', jsonb_build_array(
          jsonb_build_object('weekday','mon','start','16:00','end','16:30'),
          jsonb_build_object('weekday','tue','start','16:00','end','16:30'),
          jsonb_build_object('weekday','wed','start','16:00','end','16:30'),
          jsonb_build_object('weekday','thu','start','16:00','end','16:30'),
          jsonb_build_object('weekday','fri','start','16:00','end','16:30'),
          jsonb_build_object('weekday','sat','start','09:30','end','10:00'),
          jsonb_build_object('weekday','sun','start','09:30','end','10:00')
        )
      )
    ),
    (
      'future-swim-rouse-hill-stroke-correction',
      'rousehill@futureswim.com.au',
      'Stroke Correction — Rouse Hill',
      'Future Swim Rouse Hill',
      'School-age Stroke Correction in Rouse Hill. Children 5–10 years refine all four strokes in a class of 4 with a dedicated coach in the water.',
      32::double precision,
      'A$32 / 30-min lesson',
      'Unit 5/ 2-4 Resolution Place, Rouse Hill NSW 2155',
      'https://www.google.com/maps/search/?api=1&query=Unit%205%2C%202-4%20Resolution%20Place%2C%20Rouse%20Hill%20NSW',
      'https://futureswim.com.au/locations/rouse-hill/',
      'https://futureswim.com.au/locations/rouse-hill/',
      '["stroke correction","kids","rouse hill","sydney","intermediate"]'::jsonb,
      0,
      jsonb_build_object(
        'level_code', 'stroke-correction',
        'level_name', 'Stroke Correction',
        'level_order', 3,
        'centre_code', 'rouse-hill',
        'age_band', '5 yr – 10 yr',
        'class_size', 4,
        'parent_in_water', false,
        'pricing_indicative', true,
        'schedule_grid', jsonb_build_array(
          jsonb_build_object('weekday','mon','start','17:00','end','17:30'),
          jsonb_build_object('weekday','tue','start','17:00','end','17:30'),
          jsonb_build_object('weekday','wed','start','17:00','end','17:30'),
          jsonb_build_object('weekday','thu','start','17:00','end','17:30'),
          jsonb_build_object('weekday','fri','start','17:00','end','17:30'),
          jsonb_build_object('weekday','sat','start','13:00','end','13:30'),
          jsonb_build_object('weekday','sun','start','13:00','end','13:30')
        )
      )
    ),
    (
      'future-swim-rouse-hill-pre-squad',
      'rousehill@futureswim.com.au',
      'Pre-Squad — Rouse Hill',
      'Future Swim Rouse Hill',
      'Advanced Pre-Squad development at Rouse Hill. Children 8 yr+ work on stroke endurance, turns, and squad-readiness in a focused class of 4.',
      32::double precision,
      'A$32 / 30-min lesson',
      'Unit 5/ 2-4 Resolution Place, Rouse Hill NSW 2155',
      'https://www.google.com/maps/search/?api=1&query=Unit%205%2C%202-4%20Resolution%20Place%2C%20Rouse%20Hill%20NSW',
      'https://futureswim.com.au/locations/rouse-hill/',
      'https://futureswim.com.au/locations/rouse-hill/',
      '["pre-squad","kids","rouse hill","sydney","advanced"]'::jsonb,
      0,
      jsonb_build_object(
        'level_code', 'pre-squad',
        'level_name', 'Pre-Squad',
        'level_order', 4,
        'centre_code', 'rouse-hill',
        'age_band', '8 yr+',
        'class_size', 4,
        'parent_in_water', false,
        'pricing_indicative', true,
        'schedule_grid', jsonb_build_array(
          jsonb_build_object('weekday','mon','start','19:00','end','19:30'),
          jsonb_build_object('weekday','wed','start','19:00','end','19:30'),
          jsonb_build_object('weekday','fri','start','19:00','end','19:30'),
          jsonb_build_object('weekday','sat','start','14:00','end','14:30')
        )
      )
    ),
    -- ---------------- ST PETERS (4 levels @ A$32 indicative) ----------------
    (
      'future-swim-st-peters-water-familiarisation',
      'stpeters@futureswim.com.au',
      'Water Familiarisation — St Peters',
      'Future Swim St Peters',
      'Inner-west parent-and-baby water familiarisation in our boutique warm-water pool. Babies 3 months to 2 years build comfort with a parent in the water. Free trial available. Capacity 6.',
      32::double precision,
      'A$32 / 30-min lesson',
      'Unit 3B, 1-7 Unwins Bridge Road, St Peters, Sydney NSW 2044',
      'https://www.google.com/maps/search/?api=1&query=Unit%203B%2C%201-7%20Unwins%20Bridge%20Road%2C%20St%20Peters%20NSW%202044',
      'https://futureswim.com.au/locations/st-peters/',
      'https://futureswim.com.au/locations/st-peters/',
      '["water familiarisation","babies","kids","st peters","sydney","inner west","ozone","warm pool","free trial"]'::jsonb,
      1,
      jsonb_build_object(
        'level_code', 'water-familiarisation',
        'level_name', 'Water Familiarisation',
        'level_order', 1,
        'centre_code', 'st-peters',
        'age_band', '3 mo – 2 yr',
        'class_size', 6,
        'parent_in_water', true,
        'pricing_indicative', true,
        'free_trial_available', true,
        'schedule_grid', jsonb_build_array(
          jsonb_build_object('weekday','mon','start','09:30','end','10:00'),
          jsonb_build_object('weekday','tue','start','09:30','end','10:00'),
          jsonb_build_object('weekday','wed','start','09:30','end','10:00'),
          jsonb_build_object('weekday','thu','start','09:30','end','10:00'),
          jsonb_build_object('weekday','fri','start','09:30','end','10:00'),
          jsonb_build_object('weekday','sat','start','08:00','end','08:30'),
          jsonb_build_object('weekday','sun','start','08:00','end','08:30')
        )
      )
    ),
    (
      'future-swim-st-peters-learn-to-swim',
      'stpeters@futureswim.com.au',
      'Learn to Swim — St Peters',
      'Future Swim St Peters',
      'Toddler & early-beginner Learn-to-Swim in St Peters. Children 2–4 years progress from floating to first strokes in a small group of 3. Free trial available.',
      32::double precision,
      'A$32 / 30-min lesson',
      'Unit 3B, 1-7 Unwins Bridge Road, St Peters, Sydney NSW 2044',
      'https://www.google.com/maps/search/?api=1&query=Unit%203B%2C%201-7%20Unwins%20Bridge%20Road%2C%20St%20Peters%20NSW%202044',
      'https://futureswim.com.au/locations/st-peters/',
      'https://futureswim.com.au/locations/st-peters/',
      '["learn to swim","toddlers","kids","st peters","sydney","inner west","beginner","small class","free trial"]'::jsonb,
      1,
      jsonb_build_object(
        'level_code', 'learn-to-swim',
        'level_name', 'Learn to Swim',
        'level_order', 2,
        'centre_code', 'st-peters',
        'age_band', '2 yr – 4 yr',
        'class_size', 3,
        'parent_in_water', false,
        'pricing_indicative', true,
        'free_trial_available', true,
        'schedule_grid', jsonb_build_array(
          jsonb_build_object('weekday','mon','start','15:30','end','16:00'),
          jsonb_build_object('weekday','tue','start','15:30','end','16:00'),
          jsonb_build_object('weekday','wed','start','15:30','end','16:00'),
          jsonb_build_object('weekday','thu','start','15:30','end','16:00'),
          jsonb_build_object('weekday','fri','start','15:30','end','16:00'),
          jsonb_build_object('weekday','sat','start','09:30','end','10:00'),
          jsonb_build_object('weekday','sun','start','09:30','end','10:00')
        )
      )
    ),
    (
      'future-swim-st-peters-stroke-correction',
      'stpeters@futureswim.com.au',
      'Stroke Correction — St Peters',
      'Future Swim St Peters',
      'School-age Stroke Correction in St Peters. Children 5–10 years refine all four strokes in a class of 4. Free trial available.',
      32::double precision,
      'A$32 / 30-min lesson',
      'Unit 3B, 1-7 Unwins Bridge Road, St Peters, Sydney NSW 2044',
      'https://www.google.com/maps/search/?api=1&query=Unit%203B%2C%201-7%20Unwins%20Bridge%20Road%2C%20St%20Peters%20NSW%202044',
      'https://futureswim.com.au/locations/st-peters/',
      'https://futureswim.com.au/locations/st-peters/',
      '["stroke correction","kids","st peters","sydney","inner west","intermediate","free trial"]'::jsonb,
      0,
      jsonb_build_object(
        'level_code', 'stroke-correction',
        'level_name', 'Stroke Correction',
        'level_order', 3,
        'centre_code', 'st-peters',
        'age_band', '5 yr – 10 yr',
        'class_size', 4,
        'parent_in_water', false,
        'pricing_indicative', true,
        'free_trial_available', true,
        'schedule_grid', jsonb_build_array(
          jsonb_build_object('weekday','mon','start','16:30','end','17:00'),
          jsonb_build_object('weekday','tue','start','16:30','end','17:00'),
          jsonb_build_object('weekday','wed','start','16:30','end','17:00'),
          jsonb_build_object('weekday','thu','start','16:30','end','17:00'),
          jsonb_build_object('weekday','fri','start','16:30','end','17:00'),
          jsonb_build_object('weekday','sat','start','13:00','end','13:30'),
          jsonb_build_object('weekday','sun','start','13:00','end','13:30')
        )
      )
    ),
    (
      'future-swim-st-peters-pre-squad',
      'stpeters@futureswim.com.au',
      'Pre-Squad — St Peters',
      'Future Swim St Peters',
      'Advanced Pre-Squad development at St Peters. Children 8 yr+ work on stroke endurance, turns, and squad-readiness in a focused class of 4. Free trial available.',
      32::double precision,
      'A$32 / 30-min lesson',
      'Unit 3B, 1-7 Unwins Bridge Road, St Peters, Sydney NSW 2044',
      'https://www.google.com/maps/search/?api=1&query=Unit%203B%2C%201-7%20Unwins%20Bridge%20Road%2C%20St%20Peters%20NSW%202044',
      'https://futureswim.com.au/locations/st-peters/',
      'https://futureswim.com.au/locations/st-peters/',
      '["pre-squad","kids","st peters","sydney","inner west","advanced","free trial"]'::jsonb,
      0,
      jsonb_build_object(
        'level_code', 'pre-squad',
        'level_name', 'Pre-Squad',
        'level_order', 4,
        'centre_code', 'st-peters',
        'age_band', '8 yr+',
        'class_size', 4,
        'parent_in_water', false,
        'pricing_indicative', true,
        'free_trial_available', true,
        'schedule_grid', jsonb_build_array(
          jsonb_build_object('weekday','mon','start','17:30','end','18:00'),
          jsonb_build_object('weekday','wed','start','17:30','end','18:00'),
          jsonb_build_object('weekday','fri','start','17:30','end','18:00'),
          jsonb_build_object('weekday','sat','start','14:00','end','14:30')
        )
      )
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
  featured,
  metadata
)
where tenant.slug = 'future-swim'
on conflict (service_id) do update set
  business_name = excluded.business_name,
  tenant_id = excluded.tenant_id,
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
  source_url = excluded.source_url,
  image_url = excluded.image_url,
  tags_json = excluded.tags_json,
  featured = excluded.featured,
  is_active = excluded.is_active,
  publish_state = excluded.publish_state,
  metadata = coalesce(service_merchant_profiles.metadata, '{}'::jsonb) || excluded.metadata,
  updated_at = now();

-- ============================================================================
-- 4. Tenant partner-config (brand, hero, channels, capabilities, trust signals)
-- ============================================================================
-- Renders on the public Partner Config API at:
--   GET /api/v1/public/tenants/future-swim/partner-config
-- The futureswim.bookedai.au sub-project frontend reads this to drive header
-- CTAs ("Future Swim Ask", "WhatsApp Future Swim", "Telegram Future Swim"),
-- accent color, and footer copy without hardcoding tenant strings in TSX.

update tenants
set
  partner_config_jsonb = jsonb_build_object(
    'brand', jsonb_build_object(
      'name', 'Future Swim',
      'tagline', 'Leading swim school for babies & children — Sydney',
      'logo_url', null,
      'favicon_url', null,
      'accent_color', '#0EA5E9'
    ),
    'hero', jsonb_build_object(
      'kicker', 'Future Swim · Sydney',
      'h1', 'Small-class swim lessons that build real confidence — from first splash to pre-squad.',
      'sub', 'Five Sydney centres. Warm ozone-treated pools. Maximum 3 children per beginner class. Find your level, see weekly times, and reserve a place in seconds with Future Swim Ask.',
      'primary_cta', jsonb_build_object(
        'label', 'Open Future Swim Ask',
        'intent', 'open_widget'
      ),
      'secondary_cta', jsonb_build_object(
        'label', 'WhatsApp Future Swim',
        'intent', 'external',
        'href', 'https://wa.me/61455301335?text=Hi%20Future%20Swim%2C%20I%27d%20like%20to%20book%20a%20lesson.'
      )
    ),
    'capabilities', jsonb_build_array(
      'whatsapp', 'telegram', 'email', 'calendar',
      'monthly_reminder', 'feedback', 'crm_zoho', 'portal'
    ),
    'channels', jsonb_build_object(
      'telegram', jsonb_build_object(
        'bot_username', 'BookedAI_Manager_Bot',
        'enabled', true
      ),
      'whatsapp', jsonb_build_object(
        'phone_number', '+61455301335',
        'enabled', true
      ),
      'email_support', 'hello@bookedai.au'
    ),
    'features', jsonb_build_object(
      'monthly_reminder_default', true,
      'post_booking_feedback', true,
      'show_audit_ledger', false,
      'layout_override', 'future-swim'
    ),
    'services_endpoint', '/api/booking-assistant/catalog',
    'booking_endpoint', '/api/v1/bookings/intents',
    'portal_endpoint_prefix', '/portal',
    'trust_signals', jsonb_build_array(
      jsonb_build_object('label', 'Warm ozone-treated pools', 'icon', 'droplet'),
      jsonb_build_object('label', 'Max 3 in beginner classes', 'icon', 'users'),
      jsonb_build_object('label', 'Make-up lessons available', 'icon', 'calendar'),
      jsonb_build_object('label', '5 Sydney centres', 'icon', 'map-pin')
    ),
    'footer_html', '<p>Future Swim · 5 Sydney centres · Bookings powered by BookedAI · <a href="https://futureswim.com.au">futureswim.com.au</a></p>',
    'embed_origins', jsonb_build_array(
      'https://futureswim.bookedai.au',
      'https://futureswim.com.au'
    )
  ),
  partner_config_updated_at = now(),
  updated_at = now()
where slug = 'future-swim';

commit;
