-- BookedAI Phase 1.11
-- Migration 011: seed a reusable Zoho CRM connection blueprint for the Future Swim tenant.
-- This keeps BookedAI as the operational system of action while Zoho CRM acts as the
-- commercial relationship system of record for sales and follow-up.

with tenant_blueprint as (
  select
    tenant.id as tenant_id,
    'zoho_crm'::text as provider,
    'write_back'::text as sync_mode,
    'paused'::text as status,
    jsonb_build_object(
    'tenant_slug', 'future-swim',
    'relationship_role', 'commercial_system_of_record',
    'bookedai_role', 'operational_system_of_action',
    'oauth_client_type', 'server_based',
    'oauth_flow', 'authorization_code_with_refresh_token',
    'api_domain_strategy', 'use_token_response_api_domain',
    'accounts_domain_strategy', 'regional_accounts_domain',
    'field_metadata_strategy', 'discover_from_modules_and_fields_api_before_go_live',
    'lead_module', 'Leads',
    'contact_module', 'Contacts',
    'deal_module', 'Deals',
    'task_module', 'Tasks',
    'lead_duplicate_check_fields', jsonb_build_array('Email', 'Phone'),
    'contact_duplicate_check_fields', jsonb_build_array('Email', 'Phone'),
    'deal_duplicate_check_fields', jsonb_build_array('Deal_Name'),
    'lead_source_label', 'BookedAI Future Swim Website',
    'lead_source_detail', 'futureswim.bookedai.au',
    'inbound_channel_mode', 'website_chat_email_booking_request',
    'booking_policy', 'enquiry_and_booking_request_only',
    'catalog_scope', 'future_swim_only',
    'search_scope', 'no_external_catalog_search',
    'webhook_strategy', 'zoho_to_bookedai_stage_and_owner_signal_only',
    'crm_write_policy', jsonb_build_object(
      'lead_capture', 'upsert_lead',
      'qualification', 'upsert_contact_and_create_or_update_deal',
      'booking_intent', 'update_deal_stage_and_notes',
      'email_touch', 'record_activity_and_link_message_context',
      'operator_retry', 'bookedai_reconciliation_queue'
    ),
    'deal_pipeline_name', 'Future Swim Enrolment',
    'deal_stage_order', jsonb_build_array(
      'New Enquiry',
      'Qualified',
      'Tour or Trial Requested',
      'Trial Confirmed',
      'Booking Follow-up',
      'Enrolled Won',
      'Lost'
    ),
    'owner_assignment_mode', 'zoho_workflow_or_round_robin_after_qualification',
    'follow_up_task_policy', 'create_task_when_needs_callback_or_manual_schedule_confirmation',
    'future_swim_payload_mapping', jsonb_build_object(
      'child_age_band', 'deal_or_lead_custom_field',
      'preferred_location', 'deal_or_lead_custom_field',
      'confidence_level', 'deal_or_lead_custom_field',
      'medical_or_special_support_note', 'lead_description_or_custom_field',
      'selected_service_id', 'deal_or_lead_custom_field',
      'booking_reference', 'deal_or_lead_custom_field',
      'latest_chat_summary', 'lead_description_or_note'
    ),
    'go_live_blockers', jsonb_build_array(
      'oauth_client_and_refresh_token_missing',
      'module_api_names_unverified',
      'future_swim_custom_fields_unverified',
      'webhook_secret_not_configured'
    )
    ) as settings_json
  from tenants tenant
  where tenant.slug = 'future-swim'
),
updated as (
  update integration_connections target
  set
    sync_mode = blueprint.sync_mode,
    status = blueprint.status,
    settings_json = coalesce(target.settings_json, '{}'::jsonb) || blueprint.settings_json,
    updated_at = now()
  from tenant_blueprint blueprint
  where target.tenant_id = blueprint.tenant_id
    and target.provider = blueprint.provider
  returning target.id
)
insert into integration_connections (
  tenant_id,
  provider,
  sync_mode,
  status,
  settings_json
)
select
  blueprint.tenant_id,
  blueprint.provider,
  blueprint.sync_mode,
  blueprint.status,
  blueprint.settings_json
from tenant_blueprint blueprint
where not exists (select 1 from updated);
