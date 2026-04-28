-- BookedAI Phase 1.11
-- Migration 024: BookedAI public web booking tenant fallback
-- Additive only. This tenant receives public/product bookings when no
-- service-owned tenant can be resolved from the booking/search path.

create extension if not exists pgcrypto;

insert into tenants (slug, name, status, timezone, locale, industry, service_area_summary)
values (
  'bookedai-au',
  'BookedAI.au Web Booking',
  'active',
  'Australia/Sydney',
  'en-AU',
  'BookedAI public web booking',
  '{"delivery_mode":"public_web","coverage":["bookedai.au","product.bookedai.au"],"primary_offer":"Fallback tenant for BookedAI-owned public search and booking flows"}'::jsonb
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
    'seed_notes', 'Fallback tenant for BookedAI-owned public/product booking flows when no provider tenant is available.',
    'default_currency_code', 'AUD',
    'main_message', 'BookedAI.au Web Booking',
    'business_model', 'bookedai_public_web_booking',
    'contact_email', 'info@bookedai.au',
    'contact_phone', '+61455301335',
    'support_email', 'info@bookedai.au',
    'support_phone', '+61455301335',
    'support_whatsapp', '+61455301335',
    'support_telegram', '+61455301335',
    'support_sms', '+61455301335',
    'support_imessage', '+61455301335',
    'tenant_notifications', jsonb_build_object(
      'email', 'info@bookedai.au',
      'phone', '+61455301335',
      'whatsapp', '+61455301335',
      'telegram', '+61455301335',
      'sms', '+61455301335',
      'imessage', '+61455301335'
    ),
    'partner_plugin_interface', jsonb_build_object(
      'partner_name', 'BookedAI.au Web Booking',
      'partner_website_url', 'https://bookedai.au',
      'bookedai_host', 'https://product.bookedai.au',
      'tenant_ref', 'bookedai-au',
      'widget_id', 'bookedai-public-web-booking',
      'support_email', 'info@bookedai.au',
      'support_phone', '+61455301335',
      'support_whatsapp', '+61455301335',
      'support_telegram', '+61455301335',
      'support_sms', '+61455301335',
      'features', jsonb_build_object(
        'chat', true,
        'search', true,
        'booking', true,
        'payment', true,
        'email', true,
        'crm', true,
        'telegram', true,
        'whatsapp', true,
        'sms', true
      )
    )
  )
from tenants
where slug = 'bookedai-au'
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
  'info@bookedai.au',
  'BookedAI.au Web Booking',
  'password',
  'info@bookedai.au',
  'tenant_admin',
  'active'
from tenants tenant
where tenant.slug = 'bookedai-au'
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
  'info@bookedai.au',
  'info@bookedai.au',
  'bookedai-web-booking-static-salt',
  '3c5393af61b8b636ac912896be4e0bc7d0a481806165c654f48d3d07e098eccc',
  'tenant_admin',
  'active'
from tenants tenant
where tenant.slug = 'bookedai-au'
on conflict (username) do update set
  tenant_id = excluded.tenant_id,
  tenant_slug = excluded.tenant_slug,
  email = excluded.email,
  password_salt = excluded.password_salt,
  password_hash = excluded.password_hash,
  role = excluded.role,
  status = excluded.status,
  updated_at = now();
