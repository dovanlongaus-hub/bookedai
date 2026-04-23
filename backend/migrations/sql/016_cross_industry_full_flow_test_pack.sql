-- BookedAI Phase 1.16
-- Migration 016: seed 10 simulated cross-industry full-flow booking journeys.
-- This pack is intended for QA, demo, and operator walkthroughs across the
-- BookedAI search -> booking -> payment -> email -> messaging -> CRM lifecycle.

with seed_input (
  scenario_code,
  tenant_slug,
  industry,
  customer_name,
  customer_email,
  customer_phone,
  primary_channel,
  lead_source,
  lead_status,
  qualification_score,
  booking_reference,
  service_name,
  service_id,
  requested_date,
  requested_time,
  timezone,
  booking_path,
  confidence_level,
  booking_status,
  payment_dependency_state,
  payment_option,
  payment_status,
  amount_aud,
  currency,
  payment_url,
  email_status,
  sms_status,
  whatsapp_status,
  crm_sync_status,
  followup_note
) as (
  values
    (
      'swim-school',
      'future-swim',
      'swim_school',
      'Ava Thompson',
      'ava.thompson+test-pack@bookedai.au',
      '0400001001',
      'email',
      'bookedai_public_web',
      'qualified',
      88,
      'testpack-swim-001',
      'Kids Swim Assessment - Caringbah',
      'future-swim-caringbah-assessment',
      '2026-05-03',
      '09:30',
      'Australia/Sydney',
      'request_callback',
      'high',
      'captured',
      'payment_pending',
      'invoice_after_confirmation',
      'pending',
      35.00,
      'aud',
      'https://bookedai.au/pay/testpack-swim-001',
      'sent',
      'queued',
      'queued',
      'synced',
      'Parent asked for a weekend intro lesson and callback confirmation.'
    ),
    (
      'chess-coaching',
      'co-mai-hung-chess-class',
      'education',
      'Noah Tran',
      'noah.tran+test-pack@bookedai.au',
      '0400001002',
      'sms',
      'bookedai_public_web',
      'qualified',
      84,
      'testpack-chess-002',
      'Private Chess Coaching Session',
      'co-mai-hung-private-session',
      '2026-05-04',
      '16:00',
      'Australia/Sydney',
      'request_slot',
      'medium',
      'captured',
      'payment_pending',
      'invoice_after_confirmation',
      'paid',
      60.00,
      'aud',
      'https://bookedai.au/pay/testpack-chess-002',
      'sent',
      'sent',
      'queued',
      'synced',
      'Parent requested an after-school slot and progress review.'
    ),
    (
      'ai-mentor',
      'ai-mentor-doer',
      'professional_services',
      'Liam Patel',
      'liam.patel+test-pack@bookedai.au',
      '0400001003',
      'whatsapp',
      'bookedai_public_web',
      'qualified',
      91,
      'testpack-mentor-003',
      'AI Mentor 1:1 Growth Session',
      'ai-mentor-doer-1-1-growth',
      '2026-05-05',
      '11:00',
      'Australia/Sydney',
      'instant_book',
      'high',
      'captured',
      'payment_ready',
      'stripe_card',
      'paid',
      149.00,
      'aud',
      'https://bookedai.au/pay/testpack-mentor-003',
      'sent',
      'sent',
      'sent',
      'synced',
      'Founder wants startup growth mentoring this week and paid immediately.'
    ),
    (
      'salon',
      'default-production-tenant',
      'beauty',
      'Mia Carter',
      'mia.carter+test-pack@bookedai.au',
      '0400001004',
      'email',
      'bookedai_public_web',
      'qualified',
      79,
      'testpack-salon-004',
      'Haircut and Colour Consultation',
      'salon-cut-colour-consult',
      '2026-05-06',
      '13:30',
      'Australia/Sydney',
      'request_slot',
      'medium',
      'captured',
      'payment_ready',
      'stripe_card',
      'pending',
      120.00,
      'aud',
      'https://bookedai.au/pay/testpack-salon-004',
      'sent',
      'sent',
      'sent',
      'synced',
      'Customer wants event-ready styling and a same-week colour consultation.'
    ),
    (
      'physio',
      'default-production-tenant',
      'healthcare',
      'Ethan Brooks',
      'ethan.brooks+test-pack@bookedai.au',
      '0400001005',
      'sms',
      'bookedai_public_web',
      'qualified',
      82,
      'testpack-physio-005',
      'Physio Initial Consultation',
      'physio-initial-consult',
      '2026-05-07',
      '08:45',
      'Australia/Sydney',
      'request_callback',
      'medium',
      'captured',
      'payment_pending',
      'invoice_after_confirmation',
      'pending',
      95.00,
      'aud',
      'https://bookedai.au/pay/testpack-physio-005',
      'queued',
      'queued',
      'queued',
      'retrying',
      'Customer mentioned back pain and asked for provider confirmation before payment.'
    ),
    (
      'property',
      'default-production-tenant',
      'property',
      'Sophia Nguyen',
      'sophia.nguyen+test-pack@bookedai.au',
      '0400001006',
      'email',
      'bookedai_public_web',
      'qualified',
      85,
      'testpack-property-006',
      'Property Project Consultation',
      'property-project-consult',
      '2026-05-08',
      '10:15',
      'Australia/Sydney',
      'call_provider',
      'medium',
      'captured',
      'payment_pending',
      'invoice_after_confirmation',
      'pending',
      0.00,
      'aud',
      'https://bookedai.au/pay/testpack-property-006',
      'sent',
      'queued',
      'queued',
      'manual_review_required',
      'Buyer asked for suburb shortlist review and manual callback.'
    ),
    (
      'restaurant',
      'default-production-tenant',
      'hospitality',
      'Oliver James',
      'oliver.james+test-pack@bookedai.au',
      '0400001007',
      'whatsapp',
      'bookedai_public_web',
      'qualified',
      77,
      'testpack-restaurant-007',
      'Dinner Reservation for 6',
      'restaurant-table-booking',
      '2026-05-09',
      '19:00',
      'Australia/Sydney',
      'book_on_partner_site',
      'high',
      'captured',
      'payment_partner_checkout',
      'partner_checkout',
      'pending',
      0.00,
      'aud',
      'https://bookedai.au/pay/testpack-restaurant-007',
      'sent',
      'sent',
      'sent',
      'synced',
      'Group dinner booking redirected into partner booking flow with WhatsApp follow-up.'
    ),
    (
      'dental',
      'default-production-tenant',
      'healthcare',
      'Charlotte Evans',
      'charlotte.evans+test-pack@bookedai.au',
      '0400001008',
      'email',
      'bookedai_public_web',
      'qualified',
      80,
      'testpack-dental-008',
      'Dental Check-up and Clean',
      'dental-checkup-clean',
      '2026-05-10',
      '15:45',
      'Australia/Sydney',
      'request_slot',
      'high',
      'captured',
      'payment_ready',
      'stripe_card',
      'paid',
      180.00,
      'aud',
      'https://bookedai.au/pay/testpack-dental-008',
      'sent',
      'queued',
      'queued',
      'synced',
      'Customer accepted preventive care package and prepaid online.'
    ),
    (
      'legal',
      'default-production-tenant',
      'legal',
      'James Foster',
      'james.foster+test-pack@bookedai.au',
      '0400001009',
      'sms',
      'bookedai_public_web',
      'qualified',
      74,
      'testpack-legal-009',
      'Legal Discovery Call',
      'legal-discovery-call',
      '2026-05-12',
      '12:00',
      'Australia/Sydney',
      'request_callback',
      'medium',
      'captured',
      'payment_pending',
      'invoice_after_confirmation',
      'pending',
      220.00,
      'aud',
      'https://bookedai.au/pay/testpack-legal-009',
      'sent',
      'queued',
      'queued',
      'failed',
      'Client asked for NDA-safe callback and operator review before CRM push.'
    ),
    (
      'photography',
      'default-production-tenant',
      'creative_services',
      'Amelia Ross',
      'amelia.ross+test-pack@bookedai.au',
      '0400001010',
      'whatsapp',
      'bookedai_public_web',
      'qualified',
      76,
      'testpack-photo-010',
      'Brand Photography Planning Call',
      'photography-brand-planning',
      '2026-05-13',
      '14:30',
      'Australia/Sydney',
      'join_waitlist',
      'low',
      'captured',
      'payment_pending',
      'invoice_after_confirmation',
      'pending',
      300.00,
      'aud',
      'https://bookedai.au/pay/testpack-photo-010',
      'queued',
      'queued',
      'queued',
      'pending',
      'Customer wants first-available creative planning slot and waitlist priority.'
    )
),
tenant_rows as (
  select
    input.*,
    tenant.id as tenant_id
  from seed_input input
  join tenants tenant
    on tenant.slug = input.tenant_slug
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
    tenant_id,
    customer_name,
    customer_email,
    customer_phone,
    primary_channel
  from tenant_rows row
  where not exists (
    select 1
    from contacts existing
    where existing.tenant_id = row.tenant_id
      and lower(coalesce(existing.email, '')) = lower(row.customer_email)
  )
  returning tenant_id, id, lower(coalesce(email, '')) as email_key
),
contact_rows as (
  select
    row.*,
    coalesce(seed.id, existing.id) as contact_id
  from tenant_rows row
  left join contact_seed seed
    on seed.tenant_id = row.tenant_id
   and seed.email_key = lower(row.customer_email)
  left join contacts existing
    on existing.tenant_id = row.tenant_id
   and lower(coalesce(existing.email, '')) = lower(row.customer_email)
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
    tenant_id,
    contact_id,
    'bookedai_test_pack:' || scenario_code,
    lead_status,
    qualification_score
  from contact_rows row
  where not exists (
    select 1
    from leads existing
    where existing.tenant_id = row.tenant_id
      and existing.contact_id = row.contact_id
      and existing.source = 'bookedai_test_pack:' || row.scenario_code
  )
  returning tenant_id, contact_id, source, id
),
lead_rows as (
  select
    row.*,
    coalesce(seed.id, existing.id) as lead_id
  from contact_rows row
  left join lead_seed seed
    on seed.tenant_id = row.tenant_id
   and seed.contact_id = row.contact_id
   and seed.source = 'bookedai_test_pack:' || row.scenario_code
  left join leads existing
    on existing.tenant_id = row.tenant_id
   and existing.contact_id = row.contact_id
   and existing.source = 'bookedai_test_pack:' || row.scenario_code
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
    tenant_id,
    contact_id,
    'test-pack-conversation-' || scenario_code,
    booking_reference,
    'bookedai_test_pack',
    service_name,
    service_id,
    requested_date,
    requested_time,
    timezone,
    booking_path,
    confidence_level,
    booking_status,
    payment_dependency_state,
    jsonb_build_object(
      'simulation_pack', 'cross_industry_full_flow',
      'scenario_code', scenario_code,
      'industry', industry,
      'notes', followup_note,
      'source', lead_source
    )
  from lead_rows row
  where not exists (
    select 1
    from booking_intents existing
    where existing.tenant_id = row.tenant_id
      and existing.booking_reference = row.booking_reference
  )
  returning tenant_id, booking_reference, id
),
booking_rows as (
  select
    row.*,
    coalesce(seed.id, existing.id) as booking_intent_id
  from lead_rows row
  left join booking_seed seed
    on seed.tenant_id = row.tenant_id
   and seed.booking_reference = row.booking_reference
  left join booking_intents existing
    on existing.tenant_id = row.tenant_id
   and existing.booking_reference = row.booking_reference
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
    tenant_id,
    booking_intent_id,
    payment_option,
    payment_status,
    amount_aud,
    currency,
    'test-pack-payment-' || scenario_code,
    payment_url,
    jsonb_build_object(
      'simulation_pack', 'cross_industry_full_flow',
      'scenario_code', scenario_code,
      'booking_reference', booking_reference
    )
  from booking_rows row
  where not exists (
    select 1
    from payment_intents existing
    where existing.tenant_id = row.tenant_id
      and existing.external_session_id = 'test-pack-payment-' || row.scenario_code
  )
),
email_seed as (
  insert into email_messages (
    tenant_id,
    contact_id,
    template_key,
    subject,
    provider,
    status
  )
  select
    tenant_id,
    contact_id,
    'bookedai_booking_confirmation',
    'BookedAI test pack confirmation: ' || booking_reference,
    case
      when email_status = 'sent' then 'smtp'
      else 'unconfigured'
    end,
    email_status
  from booking_rows row
  where not exists (
    select 1
    from email_messages existing
    where existing.tenant_id = row.tenant_id
      and existing.subject = 'BookedAI test pack confirmation: ' || row.booking_reference
  )
  returning tenant_id, subject, id
),
email_rows as (
  select
    row.*,
    coalesce(seed.id, existing.id) as email_message_id
  from booking_rows row
  left join email_seed seed
    on seed.tenant_id = row.tenant_id
   and seed.subject = 'BookedAI test pack confirmation: ' || row.booking_reference
  left join email_messages existing
    on existing.tenant_id = row.tenant_id
   and existing.subject = 'BookedAI test pack confirmation: ' || row.booking_reference
),
email_event_seed as (
  insert into email_events (
    tenant_id,
    email_message_id,
    event_type,
    payload
  )
  select
    tenant_id,
    email_message_id,
    'booking_confirmation_recorded',
    jsonb_build_object(
      'simulation_pack', 'cross_industry_full_flow',
      'booking_reference', booking_reference,
      'email_status', email_status
    )
  from email_rows row
  where not exists (
    select 1
    from email_events existing
    where existing.tenant_id = row.tenant_id
      and existing.email_message_id = row.email_message_id
      and existing.event_type = 'booking_confirmation_recorded'
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
    records.tenant_id,
    records.entity_type,
    records.local_entity_id,
    'zoho_crm',
    records.external_entity_id,
    records.sync_status,
    now() - interval '45 minutes',
    records.payload
  from (
    select
      tenant_id,
      'lead'::text as entity_type,
      lead_id::text as local_entity_id,
      'testpack-' || scenario_code || '-lead' as external_entity_id,
      crm_sync_status as sync_status,
      jsonb_build_object(
        'scenario_code', scenario_code,
        'industry', industry,
        'booking_reference', booking_reference,
        'service_name', service_name
      ) as payload
    from booking_rows
    union all
    select
      tenant_id,
      'contact'::text,
      contact_id::text,
      'testpack-' || scenario_code || '-contact',
      crm_sync_status,
      jsonb_build_object(
        'scenario_code', scenario_code,
        'industry', industry,
        'contact_email', customer_email
      )
    from booking_rows
    union all
    select
      tenant_id,
      'deal'::text,
      booking_reference,
      'testpack-' || scenario_code || '-deal',
      crm_sync_status,
      jsonb_build_object(
        'scenario_code', scenario_code,
        'industry', industry,
        'booking_reference', booking_reference,
        'payment_status', payment_status
      )
    from booking_rows
    union all
    select
      tenant_id,
      'task'::text,
      booking_reference || ':task',
      'testpack-' || scenario_code || '-task',
      crm_sync_status,
      jsonb_build_object(
        'scenario_code', scenario_code,
        'industry', industry,
        'followup_note', followup_note
      )
    from booking_rows
  ) records
  where not exists (
    select 1
    from crm_sync_records existing
    where existing.tenant_id = records.tenant_id
      and existing.entity_type = records.entity_type
      and existing.local_entity_id = records.local_entity_id
  )
),
outbox_seed as (
  insert into outbox_events (
    tenant_id,
    event_type,
    aggregate_type,
    aggregate_id,
    payload,
    status,
    available_at,
    idempotency_key
  )
  select
    events.tenant_id,
    events.event_type,
    events.aggregate_type,
    events.aggregate_id,
    events.payload,
    events.status,
    events.available_at,
    events.idempotency_key
  from (
    select
      tenant_id,
      'booking_intent.capture.recorded'::text as event_type,
      'booking_intent'::text as aggregate_type,
      booking_intent_id::text as aggregate_id,
      jsonb_build_object('booking_reference', booking_reference, 'scenario_code', scenario_code) as payload,
      'processed'::text as status,
      now() - interval '30 minutes' as available_at,
      'testpack:' || scenario_code || ':booking' as idempotency_key
    from booking_rows
    union all
    select
      tenant_id,
      'payment_intent.created',
      'payment_intent',
      'test-pack-payment-' || scenario_code,
      jsonb_build_object('booking_reference', booking_reference, 'payment_status', payment_status, 'scenario_code', scenario_code),
      case when payment_status = 'paid' then 'processed' else 'pending' end,
      now() - interval '25 minutes',
      'testpack:' || scenario_code || ':payment'
    from booking_rows
    union all
    select
      tenant_id,
      'email.lifecycle.dispatch_recorded',
      'email_message',
      email_message_id::text,
      jsonb_build_object('booking_reference', booking_reference, 'email_status', email_status, 'scenario_code', scenario_code),
      case when email_status = 'sent' then 'processed' else 'pending' end,
      now() - interval '20 minutes',
      'testpack:' || scenario_code || ':email'
    from email_rows
    union all
    select
      tenant_id,
      'sms.message.dispatch_recorded',
      'communication_message',
      booking_reference || ':sms',
      jsonb_build_object('booking_reference', booking_reference, 'sms_status', sms_status, 'scenario_code', scenario_code),
      case when sms_status = 'sent' then 'processed' else 'pending' end,
      now() - interval '18 minutes',
      'testpack:' || scenario_code || ':sms'
    from booking_rows
    union all
    select
      tenant_id,
      'whatsapp.message.dispatch_recorded',
      'communication_message',
      booking_reference || ':whatsapp',
      jsonb_build_object('booking_reference', booking_reference, 'whatsapp_status', whatsapp_status, 'scenario_code', scenario_code),
      case when whatsapp_status = 'sent' then 'processed' else 'pending' end,
      now() - interval '16 minutes',
      'testpack:' || scenario_code || ':whatsapp'
    from booking_rows
  ) events
  where not exists (
    select 1
    from outbox_events existing
    where existing.idempotency_key = events.idempotency_key
  )
),
audit_seed as (
  insert into audit_logs (
    tenant_id,
    actor_type,
    actor_id,
    event_type,
    entity_type,
    entity_id,
    payload
  )
  select
    tenant_id,
    'system',
    'cross_industry_test_pack',
    'booking.flow.seeded',
    'booking_intent',
    booking_reference,
    jsonb_build_object(
      'scenario_code', scenario_code,
      'industry', industry,
      'service_name', service_name,
      'payment_status', payment_status,
      'email_status', email_status,
      'sms_status', sms_status,
      'whatsapp_status', whatsapp_status,
      'crm_sync_status', crm_sync_status
    )
  from booking_rows row
  where not exists (
    select 1
    from audit_logs existing
    where existing.tenant_id = row.tenant_id
      and existing.event_type = 'booking.flow.seeded'
      and existing.entity_type = 'booking_intent'
      and existing.entity_id = row.booking_reference
  )
)
select
  count(*) as seeded_scenarios
from booking_rows;
