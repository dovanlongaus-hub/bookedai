-- 041_chess_amount_aud_align_with_marketing.sql
--
-- Aligns the legacy `service_merchant_profiles.amount_aud` column for the
-- 5 published chess tenant rows with the marketing AUD prices stored in
-- `metadata.display_price_aud` (added by migration 038).
--
-- Why: prior to this migration there was a data inconsistency:
--   - amount_aud column held the public uniform rate (A$35/hour or A$52.50/90min)
--     from migration 030's pricing standardisation.
--   - metadata.display_price_aud held the chess-specific marketing prices
--     (16 / 65 / 80 / 90 AUD per tier from migration 038).
--   - Frontend chat-driven booking sent amount_aud=16/65/80/90 to Stripe so the
--     customer was actually charged the marketing price.
--   - GET /api/v1/orders/{ref} returned the legacy 35/52.50 from amount_aud,
--     so the order receipt showed a different number than what Stripe charged.
--
-- This migration makes the marketing AUD price the source of truth for the
-- 5 chess rows. The Sydney pilot listing keeps the public uniform rate.
--
-- Also rewrites `display_price` to remove the misleading "A$35 / hour" wording
-- and replaces it with the per-session marketing rate that matches what the
-- chat charges. VI summaries already keep the VND price under
-- metadata.localized.vi.summary so no change there.
--
-- Idempotent: re-running converges to the same state (UPDATE with explicit
-- target values).
--
-- Created 2026-04-29 during chess.bookedai.au post-deploy review.

begin;

do $$
declare
  chess_tenant_id_text text;
begin
  select id::text into chess_tenant_id_text
  from tenants
  where slug = 'co-mai-hung-chess-class'
  limit 1;

  if chess_tenant_id_text is null then
    raise notice 'chess tenant not found; skipping migration 041';
    return;
  end if;

  -- Tier 1 — Beginner Group online 60 min: AUD 16 per student/session
  update service_merchant_profiles
  set
    amount_aud = 16,
    display_price = 'A$16 / student / session',
    updated_at = now()
  where tenant_id = chess_tenant_id_text
    and service_id = 'co-mai-hung-chess-online-group-60'
    and publish_state = 'published';

  -- Tier 2 — Private 1-on-1 online 60 min: AUD 65 per session
  update service_merchant_profiles
  set
    amount_aud = 65,
    display_price = 'A$65 / session',
    updated_at = now()
  where tenant_id = chess_tenant_id_text
    and service_id = 'co-mai-hung-chess-online-private-60'
    and publish_state = 'published';

  -- Tier 3 — Tournament prep online private 90 min: AUD 80 per session
  update service_merchant_profiles
  set
    amount_aud = 80,
    display_price = 'A$80 / 90-min session',
    updated_at = now()
  where tenant_id = chess_tenant_id_text
    and service_id = 'co-mai-hung-chess-online-private-90'
    and publish_state = 'published';

  -- Tier 4 cohort variant — Online elite group 90 min: AUD 80 per session
  update service_merchant_profiles
  set
    amount_aud = 80,
    display_price = 'A$80 / 90-min session',
    updated_at = now()
  where tenant_id = chess_tenant_id_text
    and service_id = 'co-mai-hung-chess-online-group-90'
    and publish_state = 'published';

  -- Tier 4 — Elite Online Plus 60 min: AUD 90 per session (already correct;
  -- this UPDATE is idempotent and only refreshes display_price wording).
  update service_merchant_profiles
  set
    amount_aud = 90,
    display_price = 'A$90 / session',
    updated_at = now()
  where tenant_id = chess_tenant_id_text
    and service_id = 'co-mai-hung-chess-elite-online-plus-60'
    and publish_state = 'published';

  raise notice 'chess service rows price-aligned';
end $$;

commit;

-- ---------------------------------------------------------------------------
-- Verification queries (run manually after applying):
--
--   select service_id, amount_aud, display_price, metadata->>'display_price_aud' as meta_aud
--   from service_merchant_profiles
--   where tenant_id = (select id::text from tenants where slug = 'co-mai-hung-chess-class')
--     and publish_state = 'published'
--   order by service_id;
--
--   Expected:
--   co-mai-hung-chess-elite-online-plus-60 | 90 | A$90 / session            | 90
--   co-mai-hung-chess-online-group-60      | 16 | A$16 / student / session  | 16
--   co-mai-hung-chess-online-group-90      | 80 | A$80 / 90-min session     | 80
--   co-mai-hung-chess-online-private-60    | 65 | A$65 / session            | 65
--   co-mai-hung-chess-online-private-90    | 80 | A$80 / 90-min session     | 80
--
--   amount_aud must equal metadata.display_price_aud for all five rows.
-- ---------------------------------------------------------------------------
