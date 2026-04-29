-- 044_chess_beginner_sydney_market_35aud.sql
--
-- Resets the Beginner Group online 60-min tier to AUD 35 per session
-- (Sydney market rate) per operator instruction 2026-04-29.
--
-- History of this row's amount_aud:
--   migration 030 (legacy): 35  (uniform "A$35/hour" public rate)
--   migration 041:          16  (initial chess marketing rate)
--   migration 042:          49  (mid-day adjustment)
--   migration 044 (this):   35  (Sydney market alignment)
--
-- VND companion price 580,000 ≈ 35 × 16,500 keeps cross-currency parity so
-- a Vietnamese parent paying via Techcombank QR pays the same effective
-- amount as a Sydney parent paying AUD via Stripe.
--
-- Tournament/Private/Elite tiers untouched — they remain on the
-- chess-academy ladder set by migration 041.
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
    raise notice 'chess tenant not found; skipping migration 044';
    return;
  end if;

  update service_merchant_profiles
  set
    amount_aud = 35,
    display_price = 'A$35 / student / session',
    summary = 'Confident first 12 moves. Tactical patterns. Disciplined thinking. Small groups, max 8 students. Ages 6-12. Online via Lichess + Zoom. AUD 35 per student per session (Sydney market rate). 🎁 Launch 20% off month 1 + sibling 15% off.',
    metadata = coalesce(metadata, '{}'::jsonb)
      || jsonb_build_object(
        'display_price_aud', 35,
        'pricing_market', 'sydney',
        'localized', coalesce(metadata->'localized', '{}'::jsonb)
          || jsonb_build_object(
            'vi', coalesce(metadata->'localized'->'vi', '{}'::jsonb)
              || jsonb_build_object(
                'summary', 'Tự tin 12 nước đi đầu. Mẫu chiến thuật. Tư duy kỷ luật. Nhóm nhỏ tối đa 8 học viên. Độ tuổi 6-12. Online qua Lichess + Zoom. 580,000 VND/học viên/buổi (theo giá thị trường Sydney). 🎁 Giảm 20% tháng đầu + giảm 15% cho con thứ 2.'
              )
          )
      ),
    updated_at = now()
  where tenant_id = chess_tenant_id_text
    and service_id = 'co-mai-hung-chess-online-group-60'
    and publish_state = 'published';

  raise notice 'beginner tier set to Sydney market rate: A$35 + 580,000 VND';
end $$;

commit;
