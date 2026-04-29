-- 042_chess_beginner_repricing_49aud.sql
--
-- Reprices the Beginner Group online 60-min tier from AUD 16 → AUD 49
-- (and the matched VND display from 260,000 → 800,000) per operator
-- request 2026-04-29. Tournament/Private/Elite tiers unchanged.
--
-- Rationale: VND 260,000 ≈ AUD 15.75 at 16,500 VND/AUD which created a
-- cross-currency arbitrage between Stripe AUD and Vietcombank VND. Bumping
-- AUD to 49 + VND to 800,000 (49 × 16,326) closes that gap while
-- repositioning Beginner closer to the per-hour rate of the rest of the ladder.
--
-- Idempotent. Wrapped in BEGIN/COMMIT.

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
    raise notice 'chess tenant not found; skipping migration 042';
    return;
  end if;

  update service_merchant_profiles
  set
    amount_aud = 49,
    display_price = 'A$49 / student / session',
    summary = 'Confident first 12 moves. Tactical patterns. Disciplined thinking. Small groups, max 8 students. Ages 6-12. Online via Lichess + Zoom. AUD 49 per student per session. 🎁 Launch 20% off month 1 + sibling 15% off.',
    metadata = coalesce(metadata, '{}'::jsonb)
      || jsonb_build_object(
        'display_price_aud', 49,
        'localized', coalesce(metadata->'localized', '{}'::jsonb)
          || jsonb_build_object(
            'vi', coalesce(metadata->'localized'->'vi', '{}'::jsonb)
              || jsonb_build_object(
                'summary', 'Tự tin 12 nước đi đầu. Mẫu chiến thuật. Tư duy kỷ luật. Nhóm nhỏ tối đa 8 học viên. Độ tuổi 6-12. Online qua Lichess + Zoom. 800,000 VND/học viên/buổi. 🎁 Giảm 20% tháng đầu + giảm 15% cho con thứ 2.'
              )
          )
      ),
    updated_at = now()
  where tenant_id = chess_tenant_id_text
    and service_id = 'co-mai-hung-chess-online-group-60'
    and publish_state = 'published';

  raise notice 'beginner tier repriced: 16 AUD → 49 AUD, 260K VND → 800K VND';
end $$;

commit;

-- Verification:
--   select service_id, amount_aud, display_price,
--          metadata->>'display_price_aud' as meta_aud,
--          metadata->'localized'->'vi'->>'summary' as vi_summary
--   from service_merchant_profiles
--   where service_id = 'co-mai-hung-chess-online-group-60';
--   Expected: amount_aud=49, display_price='A$49 / student / session', meta_aud=49,
--   vi_summary contains '800,000 VND'.
