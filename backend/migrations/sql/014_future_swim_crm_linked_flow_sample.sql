-- BookedAI Phase 1.14
-- Migration 014: seed a fully linked Future Swim CRM lifecycle sample.
-- This creates one realistic lead/contact/booking/payment chain plus synced CRM
-- records so operators can inspect the end-to-end BookedAI -> Zoho posture.

with tenant_scope as (
  select id as tenant_id
  from tenants
  where slug = 'future-swim'
),
contact_seed as (
  insert into contacts (
    tenant_id,
    full_name,
    email,
    phone,
    primary_channel
  )
  select
    tenant_scope.tenant_id,
    'Olivia Parker',
    'olivia.parker+crm-demo@bookedai.au',
    '0400123456',
    'email'
  from tenant_scope
  where not exists (
    select 1
    from contacts existing
    where existing.tenant_id = tenant_scope.tenant_id
      and lower(coalesce(existing.email, '')) = 'olivia.parker+crm-demo@bookedai.au'
  )
  returning id, tenant_id
),
contact_row as (
  select id, tenant_id from contact_seed
  union all
  select existing.id, existing.tenant_id
  from contacts existing
  join tenant_scope on tenant_scope.tenant_id = existing.tenant_id
  where lower(coalesce(existing.email, '')) = 'olivia.parker+crm-demo@bookedai.au'
),
lead_seed as (
  insert into leads (
    tenant_id,
    contact_id,
    source,
    status,
    qualification_score
  )
  select
    contact_row.tenant_id,
    contact_row.id,
    'bookedai_widget',
    'qualified',
    86
  from contact_row
  where not exists (
    select 1
    from leads existing
    where existing.tenant_id = contact_row.tenant_id
      and existing.contact_id = contact_row.id
      and existing.source = 'bookedai_widget'
      and existing.status = 'qualified'
  )
  returning id, tenant_id, contact_id
),
lead_row as (
  select id, tenant_id, contact_id from lead_seed
  union all
  select existing.id, existing.tenant_id, existing.contact_id
  from leads existing
  join contact_row on contact_row.id = existing.contact_id
  where existing.source = 'bookedai_widget'
    and existing.status = 'qualified'
  order by id
  limit 1
),
booking_seed as (
  insert into booking_intents (
    tenant_id,
    contact_id,
    conversation_id,
    booking_reference,
    source,
    service_name,
    service_id,
    requested_date,
    requested_time,
    timezone,
    booking_path,
    confidence_level,
    status,
    payment_dependency_state,
    metadata_json
  )
  select
    lead_row.tenant_id,
    lead_row.contact_id,
    'demo-crm-linked-flow-olivia',
    'crm-demo-fs-001',
    'bookedai_widget',
    'Kids Swimming Lessons - Caringbah',
    'future-swim-caringbah-kids-swimming-lessons',
    '2026-05-06',
    '10:30',
    'Australia/Sydney',
    'request_callback',
    'high',
    'captured',
    'payment_pending',
    jsonb_build_object(
      'channel', 'widget',
      'notes', 'Parent asked for a Saturday trial and requested a follow-up call.',
      'attribution', jsonb_build_object(
        'source', 'bookedai_widget',
        'campaign', 'future-swim-autumn-intake',
        'landing_path', '/services/future-swim-caringbah-kids-swimming-lessons'
      ),
      'crm_demo_seed', true
    )
  from lead_row
  where not exists (
    select 1
    from booking_intents existing
    where existing.tenant_id = lead_row.tenant_id
      and existing.booking_reference = 'crm-demo-fs-001'
  )
  returning id, tenant_id, contact_id
),
booking_row as (
  select id, tenant_id, contact_id from booking_seed
  union all
  select existing.id, existing.tenant_id, existing.contact_id
  from booking_intents existing
  join tenant_scope on tenant_scope.tenant_id = existing.tenant_id
  where existing.booking_reference = 'crm-demo-fs-001'
),
payment_seed as (
  insert into payment_intents (
    tenant_id,
    booking_intent_id,
    payment_option,
    status,
    amount_aud,
    currency,
    external_session_id,
    payment_url,
    metadata_json
  )
  select
    booking_row.tenant_id,
    booking_row.id,
    'invoice_link',
    'pending',
    30.00,
    'aud',
    'demo-crm-payment-session-001',
    'https://bookedai.au/pay/crm-demo-fs-001',
    jsonb_build_object(
      'crm_demo_seed', true,
      'stage_hint', 'awaiting_parent_confirmation'
    )
  from booking_row
  where not exists (
    select 1
    from payment_intents existing
    where existing.tenant_id = booking_row.tenant_id
      and existing.external_session_id = 'demo-crm-payment-session-001'
  )
),
crm_seed as (
  insert into crm_sync_records (
    tenant_id,
    entity_type,
    local_entity_id,
    provider,
    external_entity_id,
    sync_status,
    last_synced_at,
    payload
  )
  select
    seeded.tenant_id,
    seeded.entity_type,
    seeded.local_entity_id,
    'zoho_crm',
    seeded.external_entity_id,
    'synced',
    now() - interval '2 hours',
    seeded.payload
  from (
    select
      tenant_scope.tenant_id,
      'lead'::text as entity_type,
      lead_row.id::text as local_entity_id,
      '120818000000580001'::text as external_entity_id,
      jsonb_build_object(
        'lead_id', lead_row.id::text,
        'full_name', 'Olivia Parker',
        'email', 'olivia.parker+crm-demo@bookedai.au',
        'phone', '0400123456',
        'source', 'bookedai_widget',
        'company_name', 'Kids Swimming Lessons - Caringbah',
        'tenant_id', tenant_scope.tenant_id::text,
        'lead_status', 'qualified',
        'metadata', jsonb_build_object(
          'campaign', 'future-swim-autumn-intake',
          'booking_reference', 'crm-demo-fs-001'
        )
      ) as payload
    from tenant_scope
    join lead_row on lead_row.tenant_id = tenant_scope.tenant_id
    union all
    select
      tenant_scope.tenant_id,
      'contact'::text,
      contact_row.id::text,
      '120818000000580101'::text,
      jsonb_build_object(
        'lead_id', contact_row.id::text,
        'full_name', 'Olivia Parker',
        'email', 'olivia.parker+crm-demo@bookedai.au',
        'phone', '0400123456',
        'tenant_id', tenant_scope.tenant_id::text,
        'metadata', jsonb_build_object(
          'customer_type', 'parent',
          'linked_lead_status', 'qualified'
        )
      )
    from tenant_scope
    join contact_row on contact_row.tenant_id = tenant_scope.tenant_id
    union all
    select
      tenant_scope.tenant_id,
      'deal'::text,
      'crm-demo-fs-001'::text,
      '120818000000580201'::text,
      jsonb_build_object(
        'lead_id', booking_row.id::text,
        'full_name', 'Olivia Parker',
        'email', 'olivia.parker+crm-demo@bookedai.au',
        'phone', '0400123456',
        'source', 'bookedai_widget',
        'company_name', 'Kids Swimming Lessons - Caringbah',
        'tenant_id', tenant_scope.tenant_id::text,
        'lead_status', 'booking_requested',
        'metadata', jsonb_build_object(
          'booking_intent_id', booking_row.id::text,
          'booking_reference', 'crm-demo-fs-001',
          'service_name', 'Kids Swimming Lessons - Caringbah',
          'requested_date', '2026-05-06',
          'requested_time', '10:30',
          'timezone', 'Australia/Sydney',
          'booking_path', 'request_callback',
          'notes', 'Parent asked for a Saturday trial and requested a follow-up call.',
          'external_lead_id', '120818000000580001',
          'external_contact_id', '120818000000580101',
          'deal_stage', 'Qualification',
          'task_subject', 'Booking follow-up: Kids Swimming Lessons - Caringbah'
        )
      )
    from tenant_scope
    join booking_row on booking_row.tenant_id = tenant_scope.tenant_id
    union all
    select
      tenant_scope.tenant_id,
      'task'::text,
      'crm-demo-fs-001'::text,
      '120818000000580301'::text,
      jsonb_build_object(
        'lead_id', booking_row.id::text,
        'full_name', 'Olivia Parker',
        'email', 'olivia.parker+crm-demo@bookedai.au',
        'phone', '0400123456',
        'source', 'bookedai_widget',
        'company_name', 'Kids Swimming Lessons - Caringbah',
        'tenant_id', tenant_scope.tenant_id::text,
        'lead_status', 'booking_requested',
        'metadata', jsonb_build_object(
          'booking_intent_id', booking_row.id::text,
          'booking_reference', 'crm-demo-fs-001',
          'service_name', 'Kids Swimming Lessons - Caringbah',
          'requested_date', '2026-05-06',
          'requested_time', '10:30',
          'timezone', 'Australia/Sydney',
          'booking_path', 'request_callback',
          'notes', 'Parent asked for a Saturday trial and requested a follow-up call.',
          'external_lead_id', '120818000000580001',
          'external_contact_id', '120818000000580101',
          'external_deal_id', '120818000000580201',
          'deal_stage', 'Qualification',
          'task_subject', 'Booking follow-up: Kids Swimming Lessons - Caringbah'
        )
      )
    from tenant_scope
    join booking_row on booking_row.tenant_id = tenant_scope.tenant_id
    union all
    select
      tenant_scope.tenant_id,
      'deal_feedback'::text,
      '120818000000580201'::text,
      '120818000000580201'::text,
      jsonb_build_object(
        'outcome', 'won',
        'stage', 'Closed Won',
        'owner_name', 'Jamie Revenue',
        'source_label', 'bookedai_widget',
        'amount_aud', 180.00,
        'closed_at', '2026-05-07T02:15:00Z',
        'lost_reason', null,
        'task_completed', true,
        'task_completed_at', '2026-05-06T23:40:00Z',
        'stage_changed_at', '2026-05-07T02:00:00Z',
        'external_deal_id', '120818000000580201',
        'crm_demo_seed', true,
        'booking_reference', 'crm-demo-fs-001',
        'service_name', 'Kids Swimming Lessons - Caringbah'
      )
    from tenant_scope
    union all
    select
      tenant_scope.tenant_id,
      'deal_feedback'::text,
      '120818000000580202'::text,
      '120818000000580202'::text,
      jsonb_build_object(
        'outcome', 'lost',
        'stage', 'Closed Lost',
        'owner_name', 'Casey Follow-up',
        'source_label', 'bookedai_widget',
        'amount_aud', 95.00,
        'closed_at', '2026-05-09T05:20:00Z',
        'lost_reason', 'No callback response',
        'task_completed', false,
        'task_completed_at', null,
        'stage_changed_at', '2026-05-09T05:10:00Z',
        'external_deal_id', '120818000000580202',
        'crm_demo_seed', true,
        'booking_reference', 'crm-demo-fs-002',
        'service_name', 'Kids Swimming Lessons - Caringbah'
      )
    from tenant_scope
  ) seeded
  where not exists (
    select 1
    from crm_sync_records existing
    where existing.tenant_id = seeded.tenant_id
      and existing.entity_type = seeded.entity_type
      and existing.local_entity_id = seeded.local_entity_id
  )
)
select 1;
