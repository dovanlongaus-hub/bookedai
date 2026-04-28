-- BookedAI Phase 1.11
-- Migration 013: third official tenant seed for AI Mentor 1-1 services
-- Additive only. This seeds a published online mentoring catalog plus password credentials.

insert into tenants (slug, name, status, timezone, locale, industry, service_area_summary)
values (
  'ai-mentor-doer',
  'AI Mentor 1-1',
  'active',
  'UTC',
  'en-US',
  'Education',
  '{"delivery_mode":"online","coverage":["global","remote"],"primary_offer":"AI mentor 1-1 and group mentoring"}'::jsonb
)
on conflict (slug) do update set
  name = excluded.name,
  status = excluded.status,
  timezone = excluded.timezone,
  locale = excluded.locale,
  industry = excluded.industry,
  service_area_summary = excluded.service_area_summary,
  updated_at = now();

insert into tenant_settings (tenant_id, settings_json)
select
  id,
  jsonb_build_object(
    'official_tenant_seed', true,
    'seed_source_type', 'operator_curated',
    'seed_notes', 'Third official tenant curated from operator-provided AI mentor mentoring packages.',
    'default_currency_code', 'USD',
    'main_message', 'Convert AI to your DOER',
    'business_model', 'online_ai_mentoring',
    'delivery_modes', jsonb_build_array('private_1_1', 'group_1_n'),
    'group_minimum_students', 5,
    'partner_plugin_interface', jsonb_build_object(
      'partner_name', 'AI Mentor Pro',
      'partner_website_url', 'https://ai.longcare.au',
      'bookedai_host', 'https://product.bookedai.au',
      'embed_path', '/partner/ai-mentor-pro/embed',
      'widget_script_path', '/partner-plugins/ai-mentor-pro-widget.js',
      'tenant_ref', 'ai-mentor-doer',
      'widget_id', 'ai-mentor-pro-plugin',
      'accent_color', '#1f7a6b',
      'button_label', 'Book AI Mentor',
      'modal_title', 'AI Mentor Pro',
      'headline', 'Convert AI to your DOER',
      'prompt', 'Convert AI to your DOER',
      'inline_target_selector', '#ai-mentor-pro-bookedai',
      'support_email', 'aimentor@bookedai.au',
      'support_phone', '+84908444095',
      'support_whatsapp', '+84908444095',
      'support_telegram', '+84908444095',
      'support_imessage', '+84908444095',
      'features', jsonb_build_object(
        'chat', true,
        'search', true,
        'booking', true,
        'payment', true,
        'email', true,
        'crm', true,
        'whatsapp', true
      )
    ),
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
from tenants
where slug = 'ai-mentor-doer'
on conflict (tenant_id) do update set
  settings_json = tenant_settings.settings_json || excluded.settings_json,
  updated_at = now();

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
  tenant.id::text,
  tenant.slug,
  'aimentor@bookedai.au',
  'AI Mentor 1-1',
  'password',
  'aimentor@bookedai.au',
  'tenant_admin',
  'active'
from tenants tenant
where tenant.slug = 'ai-mentor-doer'
on conflict (tenant_id, email) do update set
  tenant_slug = excluded.tenant_slug,
  full_name = excluded.full_name,
  auth_provider = excluded.auth_provider,
  provider_subject = excluded.provider_subject,
  role = excluded.role,
  status = excluded.status,
  updated_at = now();

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
  tenant.id::text,
  tenant.slug,
  'aimentor@bookedai.au',
  'aimentor@bookedai.au',
  'aimentor@bookedai.au-static-salt',
  'e07c37a4eadff96b5dc8d9b7a56173aff1dd0be1b6c6cae039d4cd3b2f29eecb',
  'tenant_admin',
  'active'
from tenants tenant
where tenant.slug = 'ai-mentor-doer'
on conflict (username) do update set
  tenant_id = excluded.tenant_id,
  tenant_slug = excluded.tenant_slug,
  email = excluded.email,
  password_salt = excluded.password_salt,
  password_hash = excluded.password_hash,
  role = excluded.role,
  status = excluded.status,
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
  'AI Mentor 1-1',
  tenant.id::text,
  'aimentor@bookedai.au',
  'aimentor@bookedai.au',
  seed.name,
  'Education',
  seed.summary,
  seed.amount_value,
  'USD',
  seed.display_price,
  seed.duration_minutes,
  'AI Mentor Remote Studio',
  'Online / Remote',
  null,
  seed.source_url,
  seed.image_url,
  seed.source_url,
  seed.tags_json,
  seed.featured,
  1,
  'published'
from tenants tenant
cross join (
  values
    (
      'ai-mentor-private-first-ai-app-60',
      'Private 1-1 Mentoring - Your First AI App in 60 Minutes',
      'Private 1-1 mentoring to build a working AI app around the student''s own idea in one focused hour. Main message: Convert AI to your DOER.',
      120::double precision,
      'USD $120',
      60,
      'https://ai.longcare.au/tenant-assets/ai-mentor/first-ai-app-60.svg',
      'https://ai.longcare.au',
      '["ai","mentor","private","1-1","app build","ai app","prototype","rapid build","productivity","doer"]'::jsonb,
      1
    ),
    (
      'ai-mentor-private-executes-for-you-5h',
      'Private 1-1 Mentoring - AI That Executes for You',
      'Private 1-1 mentoring package to build an AI system that executes real work with workflows, infrastructure, and automation across five guided hours.',
      600::double precision,
      'USD $600 / 5 hours',
      300,
      'https://ai.longcare.au/tenant-assets/ai-mentor/executes-for-you-5h.svg',
      'https://ai.longcare.au',
      '["ai","mentor","private","1-1","automation","workflow","infrastructure","execution","operations","doer"]'::jsonb,
      1
    ),
    (
      'ai-mentor-private-real-product-10h',
      'Private 1-1 Mentoring - Turn Your AI Into a Real Product',
      'Private 1-1 mentoring package to refactor, structure, monetize, maintain, and scale an AI app into a real product across ten guided hours.',
      1200::double precision,
      'USD $1,200 / 10 hours',
      600,
      'https://ai.longcare.au/tenant-assets/ai-mentor/real-product-10h.svg',
      'https://ai.longcare.au',
      '["ai","mentor","private","1-1","product","refactor","monetize","maintain","scale","saas"]'::jsonb,
      1
    ),
    (
      'ai-mentor-private-project-based-builder',
      'Private 1-1 Mentoring - Project-Based AI Builder Mentoring',
      'Private 1-1 project-based mentoring for custom AI build outcomes when the scope, stack, or rollout needs a tailored engagement.',
      null::double precision,
      'Custom pricing',
      null::integer,
      'https://ai.longcare.au/tenant-assets/ai-mentor/project-based-builder.svg',
      'https://ai.longcare.au',
      '["ai","mentor","private","1-1","custom","project based","builder","implementation","delivery"]'::jsonb,
      0
    ),
    (
      'ai-mentor-private-ongoing-ops-support',
      'Private 1-1 Mentoring - Ongoing Mentor & Product Operations Support',
      'Private 1-1 ongoing support for product operations, maintenance, iteration, and mentor follow-through after the initial AI build or launch.',
      null::double precision,
      'Pricing on request',
      null::integer,
      'https://ai.longcare.au/tenant-assets/ai-mentor/ongoing-ops-support.svg',
      'https://ai.longcare.au',
      '["ai","mentor","private","1-1","ongoing support","product ops","maintenance","advisory","operations"]'::jsonb,
      0
    ),
    (
      'ai-mentor-group-first-ai-app-60',
      'Group Mentoring - Your First AI App in 60 Minutes',
      'Group mentoring version of the first AI app session, delivered to a cohort with the same core content as the private package. Minimum 5 students required.',
      50::double precision,
      'USD $50 / hour / person (minimum 5 students)',
      60,
      'https://ai.longcare.au/tenant-assets/ai-mentor/first-ai-app-60.svg',
      'https://ai.longcare.au',
      '["ai","mentor","group","cohort","app build","ai app","students","training","workshop","doer"]'::jsonb,
      1
    ),
    (
      'ai-mentor-group-executes-for-you-5h',
      'Group Mentoring - AI That Executes for You',
      'Group mentoring package covering AI systems, workflows, infrastructure, and automation in the same core sequence as the private 5-hour package. Minimum 5 students required.',
      250::double precision,
      'USD $250 / 5 hours / person (minimum 5 students)',
      300,
      'https://ai.longcare.au/tenant-assets/ai-mentor/executes-for-you-5h.svg',
      'https://ai.longcare.au',
      '["ai","mentor","group","cohort","automation","workflow","infrastructure","execution","students"]'::jsonb,
      1
    ),
    (
      'ai-mentor-group-real-product-10h',
      'Group Mentoring - Turn Your AI Into a Real Product',
      'Group mentoring package for turning an AI app into a real product with refactor, structure, monetization, maintenance, and scale content. Minimum 5 students required.',
      500::double precision,
      'USD $500 / 10 hours / person (minimum 5 students)',
      600,
      'https://ai.longcare.au/tenant-assets/ai-mentor/real-product-10h.svg',
      'https://ai.longcare.au',
      '["ai","mentor","group","cohort","product","refactor","monetize","maintain","scale","students"]'::jsonb,
      1
    ),
    (
      'ai-mentor-group-project-based-builder',
      'Group Mentoring - Project-Based AI Builder Mentoring',
      'Group mentoring variant of the project-based AI builder engagement for teams or classes that need a tailored scope. Minimum 5 students required.',
      null::double precision,
      'Custom pricing',
      null::integer,
      'https://ai.longcare.au/tenant-assets/ai-mentor/project-based-builder.svg',
      'https://ai.longcare.au',
      '["ai","mentor","group","cohort","custom","project based","builder","team","students"]'::jsonb,
      0
    ),
    (
      'ai-mentor-group-ongoing-ops-support',
      'Group Mentoring - Ongoing Mentor & Product Operations Support',
      'Group mentoring support for continued product operations, iteration, and mentor support with the same core content framework as the private package. Minimum 5 students required.',
      null::double precision,
      'Pricing on request',
      null::integer,
      'https://ai.longcare.au/tenant-assets/ai-mentor/ongoing-ops-support.svg',
      'https://ai.longcare.au',
      '["ai","mentor","group","cohort","ongoing support","product ops","operations","team","students"]'::jsonb,
      0
    )
) as seed(
  service_id,
  name,
  summary,
  amount_value,
  display_price,
  duration_minutes,
  image_url,
  source_url,
  tags_json,
  featured
)
where tenant.slug = 'ai-mentor-doer'
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
