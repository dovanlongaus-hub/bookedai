-- BookedAI Wave 16 (Per-tenant Zoho + email auto-CC)
-- Migration 039: seed the chess academy tenant with the JSON shape the new
-- Zoho integration handlers + lifecycle email CC resolver expect, so the
-- backend has somewhere to write into without first running an interactive
-- onboarding flow. Specifically:
--
--   * tenant_settings.settings_json.cc_emails        ← ["chess@bookedai.au"]
--   * tenant_settings.settings_json.operator_email   ← "chess@bookedai.au"
--   * tenant_settings.settings_json.integrations     ← placeholder JSON with
--       zoho_calendar.connected=false + zoho_crm.connected=false so the
--       Integrations panel renders "Not connected" instead of crashing on a
--       missing `integrations` key.
--
-- Idempotent: every UPDATE merges into the existing JSON via the `||` operator
-- and only sets keys that are CURRENTLY null/missing. Running this multiple
-- times leaves the tenant's existing data unchanged.
--
-- Created 2026-04-29.

begin;

do $$
declare
  chess_tenant_id_uuid uuid;
  default_integrations jsonb := jsonb_build_object(
    'zoho_calendar', jsonb_build_object(
      'connected', false,
      'refresh_token', '',
      'client_id', '',
      'client_secret', '',
      'accounts_base_url', 'https://accounts.zoho.com.au',
      'api_base_url', 'https://calendar.zoho.com/api/v1',
      'calendar_uid', null,
      'connected_at', null,
      'connected_by_user_email', null,
      'client_mode', 'platform_app'
    ),
    'zoho_crm', jsonb_build_object(
      'connected', false,
      'refresh_token', '',
      'client_id', '',
      'client_secret', '',
      'accounts_base_url', 'https://accounts.zoho.com.au',
      'api_base_url', 'https://www.zohoapis.com.au/crm/v8',
      'default_lead_module', 'Leads',
      'default_contact_module', 'Contacts',
      'default_deal_module', 'Deals',
      'default_task_module', 'Tasks',
      'connected_at', null,
      'connected_by_user_email', null,
      'client_mode', 'platform_app'
    )
  );
begin
  select id into chess_tenant_id_uuid
  from tenants
  where slug = 'co-mai-hung-chess-class'
  limit 1;

  if chess_tenant_id_uuid is null then
    raise notice 'Skipping chess tenant integrations seed: slug co-mai-hung-chess-class not found.';
    return;
  end if;

  -- Make sure a tenant_settings row exists; the integrations panel reads it
  -- on every tenant_overview request so creating an empty placeholder is
  -- safe and idempotent (settings_json defaults to {}).
  insert into tenant_settings (tenant_id, settings_json)
  values (chess_tenant_id_uuid, '{}'::jsonb)
  on conflict (tenant_id) do nothing;

  -- Merge cc_emails / operator_email defaults ONLY when not already set.
  update tenant_settings
  set
    settings_json = coalesce(settings_json, '{}'::jsonb)
      || (case
            when settings_json ? 'cc_emails' then '{}'::jsonb
            else jsonb_build_object('cc_emails', jsonb_build_array('chess@bookedai.au'))
          end)
      || (case
            when settings_json ? 'operator_email' then '{}'::jsonb
            else jsonb_build_object('operator_email', 'chess@bookedai.au')
          end),
    version = version + 1,
    updated_at = now()
  where tenant_id = chess_tenant_id_uuid
    and (
      not (settings_json ? 'cc_emails')
      or not (settings_json ? 'operator_email')
    );

  -- Initialise the integrations sub-document with both Zoho service blocks
  -- only when the tenant has no `integrations` key yet. Existing data wins.
  update tenant_settings
  set
    settings_json = coalesce(settings_json, '{}'::jsonb)
      || jsonb_build_object('integrations', default_integrations),
    version = version + 1,
    updated_at = now()
  where tenant_id = chess_tenant_id_uuid
    and not (settings_json ? 'integrations');

  -- For tenants that already have an `integrations` key but are missing
  -- the per-Zoho service slots (e.g. AI Mentor seed), top up only the
  -- missing slots. We deliberately use `coalesce` + `||` so any existing
  -- `connected: true` entries are preserved.
  update tenant_settings
  set
    settings_json = jsonb_set(
      settings_json,
      '{integrations}',
      coalesce(settings_json->'integrations', '{}'::jsonb)
        || (case
              when (settings_json->'integrations') ? 'zoho_calendar' then '{}'::jsonb
              else jsonb_build_object('zoho_calendar', default_integrations->'zoho_calendar')
            end)
        || (case
              when (settings_json->'integrations') ? 'zoho_crm' then '{}'::jsonb
              else jsonb_build_object('zoho_crm', default_integrations->'zoho_crm')
            end),
      true
    ),
    version = version + 1,
    updated_at = now()
  where tenant_id = chess_tenant_id_uuid
    and (settings_json ? 'integrations')
    and (
      not ((settings_json->'integrations') ? 'zoho_calendar')
      or not ((settings_json->'integrations') ? 'zoho_crm')
    );
end $$;

commit;

-- =============================================================================
-- Verification queries (run manually after psql -f):
-- =============================================================================
--
-- 1) Inspect the chess tenant's CC + integrations placeholders.
--
-- select
--   ts.settings_json->'cc_emails'                                  as cc_emails,
--   ts.settings_json->>'operator_email'                            as operator_email,
--   ts.settings_json->'integrations'->'zoho_calendar'->>'connected' as cal_connected,
--   ts.settings_json->'integrations'->'zoho_crm'->>'connected'      as crm_connected
-- from tenant_settings ts
-- join tenants t on t.id = ts.tenant_id
-- where t.slug = 'co-mai-hung-chess-class';
--
-- Expected: cc_emails ["chess@bookedai.au"], operator_email "chess@bookedai.au",
-- cal_connected="false", crm_connected="false".
--
-- 2) Re-running this migration must not bump version repeatedly when the
--    keys are already populated — assert by re-applying and checking that
--    `version` does NOT increment past the post-first-run value.
