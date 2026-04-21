-- BookedAI Phase 1.12
-- Migration 010: set the Sydney pilot chess package to A$30
-- Additive only. Adds explicit AUD pricing for the curated Sydney pilot row.

update service_merchant_profiles
set
  amount_aud = 30,
  currency_code = 'AUD',
  display_price = 'A$30',
  updated_at = now()
where service_id = 'co-mai-hung-chess-sydney-pilot-group';
