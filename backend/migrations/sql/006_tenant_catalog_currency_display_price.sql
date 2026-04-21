-- BookedAI Phase 1.8
-- Migration 006: truthful catalog pricing for multi-currency tenant onboarding
-- Additive only. Preserves existing amount_aud search logic while adding display-first price fields.

alter table service_merchant_profiles
  add column if not exists currency_code varchar(8) not null default 'AUD';

alter table service_merchant_profiles
  add column if not exists display_price varchar(255);

update service_merchant_profiles
set currency_code = 'AUD'
where currency_code is null or btrim(currency_code) = '';

update service_merchant_profiles
set display_price = 'A$' || regexp_replace(to_char(amount_aud, 'FM999999990D00'), '\.?0+$', '')
where display_price is null
  and amount_aud is not null
  and coalesce(nullif(btrim(currency_code), ''), 'AUD') = 'AUD';

update service_merchant_profiles
set
  currency_code = 'VND',
  display_price = case service_id
    when 'co-mai-hung-chess-online-group-60' then '260,000-780,000 VND / student / session'
    when 'co-mai-hung-chess-online-private-60' then '1,040,000 VND / session'
    when 'co-mai-hung-chess-online-group-90' then '390,000-1,040,000 VND / student / session'
    when 'co-mai-hung-chess-online-private-90' then '1,300,000 VND / session'
    when 'co-mai-hung-chess-inperson-group-60' then '390,000-910,000 VND / student / session'
    when 'co-mai-hung-chess-inperson-private-60' then '1,300,000 VND / session + 300,000 VND travel'
    when 'co-mai-hung-chess-inperson-group-90' then '468,000-1,170,000 VND / student / session'
    when 'co-mai-hung-chess-inperson-private-90' then '1,560,000 VND / session + 300,000 VND travel'
    else display_price
  end
where tenant_id in (
  select id::text
  from tenants
  where slug = 'co-mai-hung-chess-class'
);
