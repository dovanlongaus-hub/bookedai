-- BookedAI Phase 19 / Sprint 19 P0-4
-- Additive evidence indexes for inbound webhook idempotency and operator ledger queries.

create index if not exists idx_webhook_events_status_received_at
  on webhook_events(status, received_at desc);

create index if not exists idx_webhook_events_tenant_provider_status_received_at
  on webhook_events(tenant_id, provider, status, received_at desc);

create index if not exists idx_idempotency_keys_scope_created_at
  on idempotency_keys(scope, created_at desc);

create index if not exists idx_idempotency_keys_tenant_scope_created_at
  on idempotency_keys(tenant_id, scope, created_at desc);
