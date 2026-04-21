-- BookedAI Phase 1.7
-- Migration 005: first official sample tenant from parsed chess-class PDF source
-- Additive only. This seeds a review-state tenant catalog from a non-website source document.

insert into tenants (slug, name, status, timezone, locale, industry)
values (
  'co-mai-hung-chess-class',
  'Lop Co Vua Co Mai Hung',
  'active',
  'Asia/Ho_Chi_Minh',
  'vi-VN',
  'Kids Services'
)
on conflict (slug) do nothing;

insert into tenant_settings (tenant_id, settings_json)
select
  id,
  jsonb_build_object(
    'default_currency_code', 'VND',
    'source_document_path', 'storage/uploads/documents/fe41/XesZr6pjpiOaMMduIhpspQ.pdf',
    'source_document_type', 'pricing_brochure_pdf',
    'sample_tenant_seed', true,
    'sample_tenant_theme', 'chess_class'
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
  'Lop Co Vua Co Mai Hung',
  tenant.id::text,
  null,
  null,
  seed.name,
  'Kids Services',
  seed.summary,
  null,
  seed.duration_minutes,
  'Co Mai Hung Chess Class',
  seed.location,
  null,
  null,
  'https://images.pexels.com/photos/411207/pexels-photo-411207.jpeg?auto=compress&cs=tinysrgb&w=1200',
  'storage/uploads/documents/fe41/XesZr6pjpiOaMMduIhpspQ.pdf',
  seed.tags_json,
  seed.featured,
  0,
  'review'
from tenants tenant
cross join (
  values
    (
      'co-mai-hung-chess-online-group-60',
      'Chess Class Online 60 Minutes',
      'Online group chess class. Source PDF lists pricing tiers in VND: under 10 students 260,000 per student, 3-5 students 520,000 per student, and 2 students 780,000 per student. Students are taught directly by Woman Grandmaster Mai Hung with tournament-oriented strategic coaching.',
      60,
      'Online',
      '["kids","children","chess","class","lesson","online","group","strategy","beginner","tournament"]'::jsonb,
      1
    ),
    (
      'co-mai-hung-chess-online-private-60',
      'Private Chess Coaching Online 60 Minutes',
      'Online private 1-1 chess coaching. Source PDF price: 1,040,000 VND per session. Designed for focused tactical improvement, confidence building, and accelerated progress with direct coaching from Woman Grandmaster Mai Hung.',
      60,
      'Online',
      '["kids","children","chess","private","1-1","online","coaching","strategy","tournament"]'::jsonb,
      1
    ),
    (
      'co-mai-hung-chess-online-group-90',
      'Chess Class Online 90 Minutes',
      'Online 90-minute group chess class. Source PDF lists pricing tiers in VND: under 10 students 390,000 per student, 3-5 students 650,000 per student, and 2 students 1,040,000 per student. Positioned for deeper tactical and strategic sessions.',
      90,
      'Online',
      '["kids","children","chess","class","lesson","online","group","strategy","advanced","tournament"]'::jsonb,
      1
    ),
    (
      'co-mai-hung-chess-online-private-90',
      'Private Chess Coaching Online 90 Minutes',
      'Online private 1-1 chess coaching for 90 minutes. Source PDF price: 1,300,000 VND per session. Suitable for stronger training blocks, preparation, and competition-focused improvement.',
      90,
      'Online',
      '["kids","children","chess","private","1-1","online","coaching","advanced","strategy","tournament"]'::jsonb,
      1
    ),
    (
      'co-mai-hung-chess-inperson-group-60',
      'Chess Class In Person 60 Minutes',
      'In-person group chess class. Source PDF lists pricing tiers in VND: under 10 students 390,000 per student, 3-5 students 650,000 per student, and 2 students 910,000 per student. Travel surcharge for teaching at the student home is 300,000 VND per session.',
      60,
      'Vietnam - student home or agreed venue',
      '["kids","children","chess","class","lesson","in-person","group","strategy","home-visit","tournament"]'::jsonb,
      1
    ),
    (
      'co-mai-hung-chess-inperson-private-60',
      'Private Chess Coaching In Person 60 Minutes',
      'In-person private 1-1 chess coaching. Source PDF price: 1,300,000 VND per session, plus 300,000 VND travel surcharge when teaching at the student home. Appropriate for personalized tactical and competition coaching.',
      60,
      'Vietnam - student home or agreed venue',
      '["kids","children","chess","private","1-1","in-person","coaching","home-visit","strategy","tournament"]'::jsonb,
      1
    ),
    (
      'co-mai-hung-chess-inperson-group-90',
      'Chess Class In Person 90 Minutes',
      'In-person 90-minute group chess class. Source PDF lists pricing tiers in VND: under 10 students 468,000 per student, 3-5 students 780,000 per student, and 2 students 1,170,000 per student. Travel surcharge for teaching at the student home is 300,000 VND per session.',
      90,
      'Vietnam - student home or agreed venue',
      '["kids","children","chess","class","lesson","in-person","group","advanced","home-visit","tournament"]'::jsonb,
      1
    ),
    (
      'co-mai-hung-chess-inperson-private-90',
      'Private Chess Coaching In Person 90 Minutes',
      'In-person private 1-1 chess coaching for 90 minutes. Source PDF price: 1,560,000 VND per session, plus 300,000 VND travel surcharge when teaching at the student home. Intended for deep preparation and competition-focused training.',
      90,
      'Vietnam - student home or agreed venue',
      '["kids","children","chess","private","1-1","in-person","advanced","coaching","home-visit","tournament"]'::jsonb,
      1
    )
) as seed(service_id, name, summary, duration_minutes, location, tags_json, featured)
where tenant.slug = 'co-mai-hung-chess-class'
on conflict (service_id) do nothing;
