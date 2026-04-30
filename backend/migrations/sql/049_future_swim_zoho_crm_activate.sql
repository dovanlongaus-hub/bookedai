-- BookedAI Phase 19+ (Future Swim CRM activation)
-- Migration 049: flip the future-swim Zoho CRM integration_connections row
-- from ``paused`` (seeded by migration 011) to ``active`` so the lifecycle
-- orchestrator (``orchestrate_lead_capture``) actually writes leads, contacts,
-- and deals into the shared BookedAI Zoho org for every futureswim.bookedai.au
-- enquiry / booking request.
--
-- Verified on prod 2026-04-30 with a synthetic e2e enquiry:
--   POST /api/v1/public/leads/future-swim
--     -> lead_id = e6e7e43e-1f32-4f3b-9440-0a707e54b379
--     -> Zoho external lead id = 120818000000649083
--     -> crm_sync_records.sync_status = 'synced'
--
-- The OAuth tokens (client_id, refresh_token, access_token) live in the
-- backend env (.env on the VPS) under ZOHO_CRM_*, owned by the master
-- info@bookedai.au Zoho account. All tenants share the same Zoho org and
-- are disambiguated by the per-tenant ``Lead_Source_Detail`` field
-- ("futureswim.bookedai.au" for this tenant per migration 011 blueprint).
--
-- Idempotent: re-running this converges on status='active'.

begin;

update integration_connections
set
  status = 'active',
  updated_at = now()
where
  tenant_id = (select id from tenants where slug = 'future-swim')
  and provider = 'zoho_crm';

commit;
