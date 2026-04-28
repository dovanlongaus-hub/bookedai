-- Tenant partner configuration columns for the multi-tenant Partner Config API.
--
-- Background: BookedAI partner pages (chess, swim, AI Mentor) are currently
-- driven by bespoke React components. The Partner Config API lets new tenants
-- onboard purely through API + DNS: admins provision branding/hero/channel
-- copy via /api/v1/admin/tenants/{slug}/partner-config and the public
-- /api/v1/public/tenants/{slug}/partner-config endpoint serves it to the
-- generic frontend partner template.
--
-- Rollout: this migration only adds columns. Tenants without a custom config
-- automatically receive a SAFE FALLBACK config generated from the tenants
-- table, so the public endpoint is never broken by a missing row. Admins can
-- override the fallback by POSTing a custom partner-config payload at any
-- point.

alter table tenants
  add column if not exists partner_config_jsonb jsonb,
  add column if not exists partner_config_updated_at timestamptz;

create index if not exists idx_tenants_active_partner_config
  on tenants (slug)
  where partner_config_jsonb is not null;
