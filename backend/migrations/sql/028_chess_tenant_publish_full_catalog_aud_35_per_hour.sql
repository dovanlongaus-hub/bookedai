-- BookedAI Phase 19
-- Migration 028: publish the full Co Mai Hung chess tenant catalog for public search at A$35/hour.
-- Additive/idempotent only. This migration:
--   * lifts the eight brochure-derived chess services from review/inactive to published/active
--   * sets a uniform A$35/hour AUD pricing across all packages (60-minute = A$35, 90-minute = A$52.50)
--   * fills location, venue, booking_url, map_url, and image_url fields so the public search
--     catalog quality gate is satisfied and the rows render with a full Sydney-positioned card
--   * widens topic and location tags so chess intent searches in Sydney return the full lineup
--   * keeps the Sydney pilot row in sync at A$35 so all public chess products price consistently
--   * persists Sydney market positioning in tenant_settings for downstream presenters
--
-- The brochure-derived VND tier guidance is preserved in summary text so operators retain
-- traceability back to the original PDF source while the catalog publishes a single AUD rate.

do $$
declare
  chess_tenant_id uuid;
begin
  select id
  into chess_tenant_id
  from tenants
  where slug = 'co-mai-hung-chess-class'
  limit 1;

  if chess_tenant_id is null then
    raise notice 'Skipping chess catalog publish because tenant co-mai-hung-chess-class does not exist.';
    return;
  end if;

  insert into tenant_settings (tenant_id, settings_json)
  values (
    chess_tenant_id,
    jsonb_build_object(
      'public_catalog_published', true,
      'public_catalog_currency_code', 'AUD',
      'public_catalog_hourly_rate_aud', 35,
      'public_catalog_market', 'Sydney',
      'public_catalog_secondary_markets', jsonb_build_array('Australia', 'Online global'),
      'public_catalog_publish_notes', 'Full chess catalog published for tenant-first public search at A$35/hour with brochure-source VND tiers preserved in summary text.'
    )
  )
  on conflict (tenant_id) do update set
    settings_json = coalesce(tenant_settings.settings_json, '{}'::jsonb) || excluded.settings_json,
    version = tenant_settings.version + 1,
    updated_at = now();

  -- 60-minute online group
  update service_merchant_profiles
  set
    business_name = 'Co Mai Hung Chess Class',
    name = 'Online Group Chess Class - 60 Minutes',
    category = 'Kids Services',
    summary = 'Online group chess class led by Woman Grandmaster Mai Hung. Public AUD pricing is A$35 per hour per student. Brochure-source VND tiers (under 10 students 260,000 VND, 3-5 students 520,000 VND, 2 students 780,000 VND) are kept for operator traceability.',
    amount_aud = 35.00,
    currency_code = 'AUD',
    display_price = 'A$35 / hour / student',
    duration_minutes = 60,
    venue_name = 'Co Mai Hung Chess Class - Online Studio',
    location = 'Online (live with Woman Grandmaster Mai Hung) - Sydney AEST/AEDT',
    map_url = null,
    booking_url = 'https://bookedai.au/?assistant=open',
    image_url = 'https://images.pexels.com/photos/411207/pexels-photo-411207.jpeg?auto=compress&cs=tinysrgb&w=1200',
    tags_json = '["kids","children","chess","class","lesson","online","group","strategy","beginner","tournament","sydney","australia"]'::jsonb,
    featured = 1,
    is_active = 1,
    publish_state = 'published',
    updated_at = now()
  where service_id = 'co-mai-hung-chess-online-group-60';

  -- 60-minute online private
  update service_merchant_profiles
  set
    business_name = 'Co Mai Hung Chess Class',
    name = 'Online Private 1-1 Chess Coaching - 60 Minutes',
    category = 'Kids Services',
    summary = 'Private 1-1 online chess coaching with Woman Grandmaster Mai Hung. Public AUD pricing is A$35 per hour. Brochure-source VND price was 1,040,000 VND per session and is preserved here for operator traceability.',
    amount_aud = 35.00,
    currency_code = 'AUD',
    display_price = 'A$35 / hour',
    duration_minutes = 60,
    venue_name = 'Co Mai Hung Chess Class - Online Studio',
    location = 'Online (live with Woman Grandmaster Mai Hung) - Sydney AEST/AEDT',
    map_url = null,
    booking_url = 'https://bookedai.au/?assistant=open',
    image_url = 'https://images.pexels.com/photos/411207/pexels-photo-411207.jpeg?auto=compress&cs=tinysrgb&w=1200',
    tags_json = '["kids","children","chess","private","1-1","online","coaching","strategy","tournament","sydney","australia"]'::jsonb,
    featured = 1,
    is_active = 1,
    publish_state = 'published',
    updated_at = now()
  where service_id = 'co-mai-hung-chess-online-private-60';

  -- 90-minute online group
  update service_merchant_profiles
  set
    business_name = 'Co Mai Hung Chess Class',
    name = 'Online Group Chess Class - 90 Minutes',
    category = 'Kids Services',
    summary = 'Online 90-minute group chess class for deeper tactical and strategic study. Public AUD pricing is A$52.50 per session (A$35/hour). Brochure-source VND tiers (under 10 students 390,000 VND, 3-5 students 650,000 VND, 2 students 1,040,000 VND) are preserved for operator traceability.',
    amount_aud = 52.50,
    currency_code = 'AUD',
    display_price = 'A$52.50 / 90 minutes (A$35/hour)',
    duration_minutes = 90,
    venue_name = 'Co Mai Hung Chess Class - Online Studio',
    location = 'Online (live with Woman Grandmaster Mai Hung) - Sydney AEST/AEDT',
    map_url = null,
    booking_url = 'https://bookedai.au/?assistant=open',
    image_url = 'https://images.pexels.com/photos/411207/pexels-photo-411207.jpeg?auto=compress&cs=tinysrgb&w=1200',
    tags_json = '["kids","children","chess","class","lesson","online","group","strategy","advanced","tournament","sydney","australia"]'::jsonb,
    featured = 1,
    is_active = 1,
    publish_state = 'published',
    updated_at = now()
  where service_id = 'co-mai-hung-chess-online-group-90';

  -- 90-minute online private
  update service_merchant_profiles
  set
    business_name = 'Co Mai Hung Chess Class',
    name = 'Online Private 1-1 Chess Coaching - 90 Minutes',
    category = 'Kids Services',
    summary = 'Private 1-1 online chess coaching for stronger 90-minute training blocks and competition preparation. Public AUD pricing is A$52.50 per session (A$35/hour). Brochure-source VND price was 1,300,000 VND per session.',
    amount_aud = 52.50,
    currency_code = 'AUD',
    display_price = 'A$52.50 / 90 minutes (A$35/hour)',
    duration_minutes = 90,
    venue_name = 'Co Mai Hung Chess Class - Online Studio',
    location = 'Online (live with Woman Grandmaster Mai Hung) - Sydney AEST/AEDT',
    map_url = null,
    booking_url = 'https://bookedai.au/?assistant=open',
    image_url = 'https://images.pexels.com/photos/411207/pexels-photo-411207.jpeg?auto=compress&cs=tinysrgb&w=1200',
    tags_json = '["kids","children","chess","private","1-1","online","coaching","advanced","strategy","tournament","sydney","australia"]'::jsonb,
    featured = 1,
    is_active = 1,
    publish_state = 'published',
    updated_at = now()
  where service_id = 'co-mai-hung-chess-online-private-90';

  -- 60-minute in-person group
  update service_merchant_profiles
  set
    business_name = 'Co Mai Hung Chess Class',
    name = 'In-Person Group Chess Class - 60 Minutes',
    category = 'Kids Services',
    summary = 'In-person group chess class delivered at the student home or an agreed Sydney venue. Public AUD pricing is A$35 per hour per student. Brochure-source VND tiers (under 10 students 390,000 VND, 3-5 students 650,000 VND, 2 students 910,000 VND) are preserved here for operator traceability. A travel surcharge may apply for at-home delivery.',
    amount_aud = 35.00,
    currency_code = 'AUD',
    display_price = 'A$35 / hour / student',
    duration_minutes = 60,
    venue_name = 'Co Mai Hung Chess Class - Sydney',
    location = 'Sydney NSW (student home or agreed venue)',
    map_url = 'https://www.google.com/maps/search/?api=1&query=Sydney%20NSW',
    booking_url = 'https://bookedai.au/?assistant=open',
    image_url = 'https://images.pexels.com/photos/411207/pexels-photo-411207.jpeg?auto=compress&cs=tinysrgb&w=1200',
    tags_json = '["kids","children","chess","class","lesson","in-person","group","strategy","home-visit","tournament","sydney","australia"]'::jsonb,
    featured = 1,
    is_active = 1,
    publish_state = 'published',
    updated_at = now()
  where service_id = 'co-mai-hung-chess-inperson-group-60';

  -- 60-minute in-person private
  update service_merchant_profiles
  set
    business_name = 'Co Mai Hung Chess Class',
    name = 'In-Person Private 1-1 Chess Coaching - 60 Minutes',
    category = 'Kids Services',
    summary = 'In-person private 1-1 chess coaching at the student home or an agreed Sydney venue. Public AUD pricing is A$35 per hour. Brochure-source VND price was 1,300,000 VND per session plus 300,000 VND travel surcharge when teaching at the student home.',
    amount_aud = 35.00,
    currency_code = 'AUD',
    display_price = 'A$35 / hour',
    duration_minutes = 60,
    venue_name = 'Co Mai Hung Chess Class - Sydney',
    location = 'Sydney NSW (student home or agreed venue)',
    map_url = 'https://www.google.com/maps/search/?api=1&query=Sydney%20NSW',
    booking_url = 'https://bookedai.au/?assistant=open',
    image_url = 'https://images.pexels.com/photos/411207/pexels-photo-411207.jpeg?auto=compress&cs=tinysrgb&w=1200',
    tags_json = '["kids","children","chess","private","1-1","in-person","coaching","home-visit","strategy","tournament","sydney","australia"]'::jsonb,
    featured = 1,
    is_active = 1,
    publish_state = 'published',
    updated_at = now()
  where service_id = 'co-mai-hung-chess-inperson-private-60';

  -- 90-minute in-person group
  update service_merchant_profiles
  set
    business_name = 'Co Mai Hung Chess Class',
    name = 'In-Person Group Chess Class - 90 Minutes',
    category = 'Kids Services',
    summary = 'In-person 90-minute group chess class for advanced tactical and strategic study, delivered at the student home or an agreed Sydney venue. Public AUD pricing is A$52.50 per session (A$35/hour). Brochure-source VND tiers (under 10 students 468,000 VND, 3-5 students 780,000 VND, 2 students 1,170,000 VND) are preserved here for operator traceability.',
    amount_aud = 52.50,
    currency_code = 'AUD',
    display_price = 'A$52.50 / 90 minutes (A$35/hour) / student',
    duration_minutes = 90,
    venue_name = 'Co Mai Hung Chess Class - Sydney',
    location = 'Sydney NSW (student home or agreed venue)',
    map_url = 'https://www.google.com/maps/search/?api=1&query=Sydney%20NSW',
    booking_url = 'https://bookedai.au/?assistant=open',
    image_url = 'https://images.pexels.com/photos/411207/pexels-photo-411207.jpeg?auto=compress&cs=tinysrgb&w=1200',
    tags_json = '["kids","children","chess","class","lesson","in-person","group","advanced","home-visit","tournament","sydney","australia"]'::jsonb,
    featured = 1,
    is_active = 1,
    publish_state = 'published',
    updated_at = now()
  where service_id = 'co-mai-hung-chess-inperson-group-90';

  -- 90-minute in-person private
  update service_merchant_profiles
  set
    business_name = 'Co Mai Hung Chess Class',
    name = 'In-Person Private 1-1 Chess Coaching - 90 Minutes',
    category = 'Kids Services',
    summary = 'In-person private 1-1 chess coaching for 90-minute deep preparation and competition-focused training, delivered at the student home or an agreed Sydney venue. Public AUD pricing is A$52.50 per session (A$35/hour). Brochure-source VND price was 1,560,000 VND per session plus 300,000 VND travel surcharge when teaching at the student home.',
    amount_aud = 52.50,
    currency_code = 'AUD',
    display_price = 'A$52.50 / 90 minutes (A$35/hour)',
    duration_minutes = 90,
    venue_name = 'Co Mai Hung Chess Class - Sydney',
    location = 'Sydney NSW (student home or agreed venue)',
    map_url = 'https://www.google.com/maps/search/?api=1&query=Sydney%20NSW',
    booking_url = 'https://bookedai.au/?assistant=open',
    image_url = 'https://images.pexels.com/photos/411207/pexels-photo-411207.jpeg?auto=compress&cs=tinysrgb&w=1200',
    tags_json = '["kids","children","chess","private","1-1","in-person","advanced","coaching","home-visit","strategy","tournament","sydney","australia"]'::jsonb,
    featured = 1,
    is_active = 1,
    publish_state = 'published',
    updated_at = now()
  where service_id = 'co-mai-hung-chess-inperson-private-90';

  -- Keep the existing curated Sydney pilot row in sync at A$35 so all chess products price consistently.
  update service_merchant_profiles
  set
    amount_aud = 35.00,
    currency_code = 'AUD',
    display_price = 'A$35 / hour / student',
    duration_minutes = 60,
    summary = 'Curated public Sydney pilot listing for the Co Mai Hung chess tenant. Beginner-friendly and tournament-aware coaching with Woman Grandmaster Mai Hung at a uniform A$35/hour public rate, available online or in person across Sydney.',
    venue_name = 'Co Mai Hung Chess Class - Sydney',
    location = 'Sydney NSW',
    map_url = 'https://www.google.com/maps/search/?api=1&query=Sydney%20NSW',
    booking_url = 'https://bookedai.au/?assistant=open',
    image_url = 'https://images.pexels.com/photos/411207/pexels-photo-411207.jpeg?auto=compress&cs=tinysrgb&w=1200',
    tags_json = '["kids","children","chess","class","lesson","strategy","beginner","tournament","sydney","australia"]'::jsonb,
    is_active = 1,
    publish_state = 'published',
    updated_at = now()
  where service_id = 'co-mai-hung-chess-sydney-pilot-group';
end $$;
