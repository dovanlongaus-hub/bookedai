-- BookedAI Phase 19+ (Chess Online-Only Pivot)
-- Migration 036: pivot Co Mai Hung chess academy to ONLINE-ONLY delivery and
-- repurpose tier 4 from "At-Home Elite Training" (in-person travel) to
-- "Elite Online Plus" (premium online, 1,500,000 VND / session).
-- Created 2026-04-28.
--
-- Idempotent: safe to run multiple times. All UPDATEs are slug-scoped to the
-- chess tenant. The single INSERT for the new Elite Online Plus row uses
-- ON CONFLICT (service_id) DO UPDATE so re-runs converge to the same state.
-- JSON merges use `||` so existing keys (the 035 launch_2026 promo, etc.) are
-- preserved.
--
-- Strategy chosen: OPTION A — keep all 8 historic service_merchant_profile rows
-- but ARCHIVE the 4 in-person rows (publish_state='archived'), keep the 4
-- online rows published with refreshed online-only summaries/tags, and INSERT
-- a new 9th row for the Elite Online Plus tier-4 offering. We picked Option A
-- (over Option C "repurpose in-person rows as new online cohorts") because:
--   * FK safety: any historical bookings, telemetry, or reporting rows that
--     reference an `inperson-*` service_id keep semantically accurate names
--     and tags. Repurposing a "Chess Class In Person 60 Minutes" row into an
--     online evening cohort would lie to historical data.
--   * Audit clarity: `metadata.archived_reason = 'online_only_pivot_2026_04_28'`
--     is an obvious, queryable trail for anyone looking at why a row is
--     hidden from public catalog.
--   * Tier 4 is a brand-new product (Elite Online Plus, 1,500,000 VND with
--     session recording / WhatsApp / priority scheduling) that has no
--     conceptual overlap with the previous "At-Home Elite Training" travel
--     model — a fresh row with a clean slug is more honest than overloading
--     an existing in-person row.
--
-- This migration:
--   * Updates the 4 ONLINE service_merchant_profile rows:
--       - Refreshes `summary` (EN) and `metadata.localized.vi.summary` (VI)
--         to remove any "in-person fallback" framing and emphasize live-video
--         delivery.
--       - Replaces `tags_json` to drop "in-person" / "home-visit" tags and
--         add "online", "live-video", "lichess", "zoom", "zoho-meeting".
--       - Sets `metadata.delivery_mode = 'online'`,
--         `metadata.video_conference = 'zoho_meeting'` (with Zoom fallback),
--         `metadata.lesson_platform = 'lichess'`.
--       - Preserves existing `metadata.tier`, `metadata.promo.launch_2026`.
--   * Archives the 4 IN-PERSON service_merchant_profile rows:
--       - publish_state -> 'archived'
--       - is_active -> 0
--       - metadata.archived_reason = 'online_only_pivot_2026_04_28'
--       - metadata.delivery_mode = 'in_person' (history preserved)
--       - tags_json + summary left as-is for historical fidelity.
--   * INSERTS a new row `co-mai-hung-chess-elite-online-plus-60` for tier 4:
--       - 60-min premium online tier
--       - 1,500,000 VND / session (display_price), AUD ~ 90.00
--       - publish_state='published', tier=4, delivery_mode='online'
--       - metadata.elite_features = ['session_recording','whatsapp_direct',
--                                    'priority_scheduling']
--       - inherits launch_2026 promo
--   * Updates tenant_settings.settings_json for slug 'co-mai-hung-chess-class':
--       - delivery_mode='online_only', video_conference_provider='zoho_meeting',
--         lesson_platform='lichess', calendar_integration='zoho_calendar'
--       - new bilingual taglines mentioning Lichess + Zoom + Zoho Meeting
--       - existing keys (launch_promo from 035, sample_tenant_seed, etc.)
--         preserved via `||` JSON merge.
--
-- FK risks identified:
--   * `service_merchant_profiles.service_id` is referenced from various
--     bookings/intent/telemetry tables by string. We do NOT change any
--     existing slugs in this migration (no UPDATE ... SET service_id), so
--     no FK churn occurs. The 4 in-person rows remain in the DB; they just
--     drop out of the public published catalog via publish_state='archived'.
--   * The new Elite Online Plus row is inserted with a fresh slug
--     `co-mai-hung-chess-elite-online-plus-60` that has no prior history,
--     so no FK conflicts.

begin;

do $$
declare
  chess_tenant_id_text text;
  chess_tenant_id_uuid uuid;
  promo_json jsonb := jsonb_build_object(
    'discount_first_month_pct', 20,
    'sibling_discount_pct', 15,
    'annual_prepay_pct', 10,
    'free_trial_minutes', 30,
    'ends_at', '2026-05-12T23:59:59+07:00'
  );
  online_delivery_meta jsonb := jsonb_build_object(
    'delivery_mode', 'online',
    'video_conference', 'zoho_meeting',
    'video_conference_fallback', 'zoom',
    'lesson_platform', 'lichess'
  );
begin
  select id::text, id
    into chess_tenant_id_text, chess_tenant_id_uuid
  from tenants
  where slug = 'co-mai-hung-chess-class'
  limit 1;

  if chess_tenant_id_uuid is null then
    raise notice 'Skipping chess online-only pivot: tenant slug co-mai-hung-chess-class not found.';
    return;
  end if;

  -----------------------------------------------------------------------------
  -- A. Refresh the 4 ONLINE rows: online-only language + tags + delivery meta
  -----------------------------------------------------------------------------

  -- Tier 1 / Online group 60
  update service_merchant_profiles
  set
    summary = 'Confident first 12 moves. Tactical patterns. Disciplined thinking. Small groups, max 8 students. Ages 6-12. Live online via Lichess + Zoom (Zoho Meeting). 260,000 VND per student per session. 🎁 Launch 20% off month 1 + sibling 15% off.',
    tags_json = '["kids","children","chess","class","lesson","online","live-video","lichess","zoom","zoho-meeting","group","strategy","beginner","tournament"]'::jsonb,
    publish_state = 'published',
    is_active = 1,
    metadata = coalesce(metadata, '{}'::jsonb)
      || online_delivery_meta
      || jsonb_build_object('tier', 1)
      || jsonb_build_object(
           'localized',
           coalesce(metadata->'localized', '{}'::jsonb)
             || jsonb_build_object(
                  'vi',
                  coalesce(metadata->'localized'->'vi', '{}'::jsonb)
                    || jsonb_build_object(
                         'summary',
                         'Tự tin 12 nước đi đầu. Mẫu chiến thuật. Tư duy kỷ luật. Nhóm nhỏ tối đa 8 học viên. Độ tuổi 6-12. Học online trực tiếp qua Lichess + Zoom (Zoho Meeting). 260,000 VND/học viên/buổi. 🎁 Giảm 20% tháng đầu + giảm 15% cho con thứ 2.'
                       )
                )
         )
      || jsonb_build_object(
           'promo',
           coalesce(metadata->'promo', '{}'::jsonb)
             || jsonb_build_object('launch_2026', promo_json)
         ),
    updated_at = now()
  where service_id = 'co-mai-hung-chess-online-group-60'
    and tenant_id = chess_tenant_id_text;

  -- Tier 2 / Online private 60
  update service_merchant_profiles
  set
    summary = 'Direct 1-on-1 with GM Mai Hung. Personal opening repertoire. Game-by-game review. Custom training plan. Live online via Lichess + Zoom (Zoho Meeting). 1,040,000 VND per session. 🎁 Launch 20% off month 1 + annual prepay 10% off.',
    tags_json = '["kids","children","chess","private","1-1","online","live-video","lichess","zoom","zoho-meeting","coaching","strategy","tournament"]'::jsonb,
    publish_state = 'published',
    is_active = 1,
    metadata = coalesce(metadata, '{}'::jsonb)
      || online_delivery_meta
      || jsonb_build_object('tier', 2)
      || jsonb_build_object(
           'localized',
           coalesce(metadata->'localized', '{}'::jsonb)
             || jsonb_build_object(
                  'vi',
                  coalesce(metadata->'localized'->'vi', '{}'::jsonb)
                    || jsonb_build_object(
                         'summary',
                         'Học 1-1 trực tiếp với GM Mai Hùng. Kho khai cuộc cá nhân. Phân tích từng ván đấu. Lộ trình riêng. Học online qua Lichess + Zoom (Zoho Meeting). 1,040,000 VND/buổi. 🎁 Giảm 20% tháng đầu + đóng năm giảm thêm 10%.'
                       )
                )
         )
      || jsonb_build_object(
           'promo',
           coalesce(metadata->'promo', '{}'::jsonb)
             || jsonb_build_object('launch_2026', promo_json)
         ),
    updated_at = now()
  where service_id = 'co-mai-hung-chess-online-private-60'
    and tenant_id = chess_tenant_id_text;

  -- Tier 3 / Online private 90
  update service_merchant_profiles
  set
    summary = '90-minute tournament-prep sessions. Calculation depth, endgame mastery, pre-event simulation, mental preparation. Live online via Lichess + Zoom (Zoho Meeting). 1,300,000 VND per session. 🎁 Annual prepay 10% off.',
    tags_json = '["kids","children","chess","private","1-1","online","live-video","lichess","zoom","zoho-meeting","coaching","advanced","strategy","tournament"]'::jsonb,
    publish_state = 'published',
    is_active = 1,
    metadata = coalesce(metadata, '{}'::jsonb)
      || online_delivery_meta
      || jsonb_build_object('tier', 3)
      || jsonb_build_object(
           'localized',
           coalesce(metadata->'localized', '{}'::jsonb)
             || jsonb_build_object(
                  'vi',
                  coalesce(metadata->'localized'->'vi', '{}'::jsonb)
                    || jsonb_build_object(
                         'summary',
                         'Buổi luyện thi đấu 90 phút. Tính toán sâu, thuần thục tàn cuộc, mô phỏng giải, huấn luyện tâm lý. Học online qua Lichess + Zoom (Zoho Meeting). 1,300,000 VND/buổi. 🎁 Đóng năm giảm thêm 10%.'
                       )
                )
         )
      || jsonb_build_object(
           'promo',
           coalesce(metadata->'promo', '{}'::jsonb)
             || jsonb_build_object('launch_2026', promo_json)
         ),
    updated_at = now()
  where service_id = 'co-mai-hung-chess-online-private-90'
    and tenant_id = chess_tenant_id_text;

  -- Tier 4 (legacy 035 mapping) / Online group 90
  -- Demoted from "At-Home Elite" to a vanilla online elite group (90-min,
  -- group of 8). The new canonical Tier 4 product is the Elite Online Plus
  -- row inserted further down. We keep tier metadata=4 here so the launch
  -- promo and existing metadata stay coherent, but downgrade the summary
  -- to remove travel/in-person wording.
  update service_merchant_profiles
  set
    summary = 'Online elite group cohort. 90-minute deep-strategy session for stronger students. Max 8 students. Live online via Lichess + Zoom (Zoho Meeting). 1,040,000 VND per session. 🎁 Sibling 15% off second child.',
    tags_json = '["kids","children","chess","class","lesson","online","live-video","lichess","zoom","zoho-meeting","group","advanced","strategy","tournament","elite-cohort"]'::jsonb,
    publish_state = 'published',
    is_active = 1,
    metadata = coalesce(metadata, '{}'::jsonb)
      || online_delivery_meta
      || jsonb_build_object('tier', 4)
      || jsonb_build_object(
           'localized',
           coalesce(metadata->'localized', '{}'::jsonb)
             || jsonb_build_object(
                  'vi',
                  coalesce(metadata->'localized'->'vi', '{}'::jsonb)
                    || jsonb_build_object(
                         'summary',
                         'Nhóm tinh hoa online. Buổi 90 phút chuyên sâu chiến lược cho học viên trình độ cao. Tối đa 8 học viên. Học online qua Lichess + Zoom (Zoho Meeting). 1,040,000 VND/buổi. 🎁 Giảm 15% cho con thứ 2.'
                       )
                )
         )
      || jsonb_build_object(
           'promo',
           coalesce(metadata->'promo', '{}'::jsonb)
             || jsonb_build_object('launch_2026', promo_json)
         ),
    updated_at = now()
  where service_id = 'co-mai-hung-chess-online-group-90'
    and tenant_id = chess_tenant_id_text;

  -----------------------------------------------------------------------------
  -- B. Archive the 4 IN-PERSON rows. publish_state='archived', is_active=0,
  --    metadata.archived_reason set. tags_json + summary preserved.
  -----------------------------------------------------------------------------
  update service_merchant_profiles
  set
    publish_state = 'archived',
    is_active = 0,
    metadata = coalesce(metadata, '{}'::jsonb)
      || jsonb_build_object(
           'archived_reason', 'online_only_pivot_2026_04_28',
           'archived_at', '2026-04-28T00:00:00+07:00',
           'delivery_mode', 'in_person'
         ),
    updated_at = now()
  where tenant_id = chess_tenant_id_text
    and service_id in (
      'co-mai-hung-chess-inperson-group-60',
      'co-mai-hung-chess-inperson-private-60',
      'co-mai-hung-chess-inperson-group-90',
      'co-mai-hung-chess-inperson-private-90'
    );

  -----------------------------------------------------------------------------
  -- C. Insert (or upsert on re-run) the new Elite Online Plus row (Tier 4).
  --    1,500,000 VND / session (~ AUD 90.00 at indicative 16,667 VND/AUD).
  -----------------------------------------------------------------------------
  insert into service_merchant_profiles (
    service_id,
    business_name,
    tenant_id,
    owner_email,
    business_email,
    name,
    category,
    summary,
    amount_aud,
    currency_code,
    display_price,
    duration_minutes,
    venue_name,
    location,
    map_url,
    booking_url,
    image_url,
    source_url,
    tags_json,
    featured,
    is_active,
    publish_state,
    metadata
  )
  values (
    'co-mai-hung-chess-elite-online-plus-60',
    'Lop Co Vua Co Mai Hung',
    chess_tenant_id_text,
    null,
    null,
    'Elite Online Plus',
    'Kids Services',
    'Premium online tier. Everything in Private 1-on-1, plus recorded sessions, direct WhatsApp/Telegram with GM Mai Hung, and priority scheduling. 1,500,000 VND per session.',
    90.00,
    'VND',
    '1,500,000 VND / session',
    60,
    'Co Mai Hung Chess Class',
    'Online',
    null,
    null,
    'https://images.pexels.com/photos/411207/pexels-photo-411207.jpeg?auto=compress&cs=tinysrgb&w=1200',
    'storage/uploads/documents/fe41/XesZr6pjpiOaMMduIhpspQ.pdf',
    '["online","elite","premium","recorded","whatsapp","priority","chess","private","1-1","live-video","lichess","zoom","zoho-meeting","tournament","advanced"]'::jsonb,
    1,
    1,
    'published',
    online_delivery_meta
      || jsonb_build_object(
           'tier', 4,
           'elite_features', jsonb_build_array(
             'session_recording',
             'whatsapp_direct',
             'priority_scheduling'
           ),
           'localized', jsonb_build_object(
             'vi', jsonb_build_object(
               'summary',
               'Gói online cao cấp. Đầy đủ Kèm Riêng, kèm bản ghi buổi học, WhatsApp/Telegram trực tiếp với GM Mai Hùng, ưu tiên đặt lịch. 1,500,000 VND/buổi.'
             )
           ),
           'promo', jsonb_build_object('launch_2026', promo_json)
         )
  )
  on conflict (service_id) do update set
    business_name = excluded.business_name,
    tenant_id = excluded.tenant_id,
    name = excluded.name,
    category = excluded.category,
    summary = excluded.summary,
    amount_aud = excluded.amount_aud,
    currency_code = excluded.currency_code,
    display_price = excluded.display_price,
    duration_minutes = excluded.duration_minutes,
    venue_name = excluded.venue_name,
    location = excluded.location,
    image_url = excluded.image_url,
    source_url = excluded.source_url,
    tags_json = excluded.tags_json,
    featured = excluded.featured,
    is_active = excluded.is_active,
    publish_state = excluded.publish_state,
    -- Merge metadata so any keys added by future migrations are preserved.
    metadata = coalesce(service_merchant_profiles.metadata, '{}'::jsonb)
      || excluded.metadata,
    updated_at = now();

  -----------------------------------------------------------------------------
  -- D. Tenant settings: online-only delivery mode + Zoho Meeting integration
  --    + bilingual taglines. Merge so existing keys (launch_promo from 035,
  --    sample_tenant_seed/theme, default_currency_code, etc.) are preserved.
  -----------------------------------------------------------------------------
  update tenant_settings
  set
    settings_json = coalesce(settings_json, '{}'::jsonb)
      || jsonb_build_object(
           'delivery_mode', 'online_only',
           'video_conference_provider', 'zoho_meeting',
           'video_conference_fallback', 'zoom',
           'lesson_platform', 'lichess',
           'calendar_integration', 'zoho_calendar',
           'tagline_en', 'Online chess training with a Vietnamese grandmaster. Lichess + Zoom + Zoho Meeting.',
           'tagline_vi', 'Đào tạo cờ vua online cùng Đại kiện tướng Việt Nam. Lichess + Zoom + Zoho Meeting.',
           'online_only_pivot_at', '2026-04-28T00:00:00+07:00'
         ),
    version = version + 1,
    updated_at = now()
  where tenant_id = chess_tenant_id_uuid;
end $$;

commit;

-- =============================================================================
-- Verification queries (run manually after `psql -f`):
-- =============================================================================
--
-- 1) List ALL chess profiles with publish_state, tier, delivery_mode, and a
--    short summary preview. Expected: 9 rows total — 5 published (4 online
--    refreshed + 1 new Elite Online Plus) and 4 archived (in-person).
--
-- select
--   smp.service_id,
--   smp.publish_state,
--   smp.is_active,
--   smp.metadata->>'tier'                                    as tier,
--   smp.metadata->>'delivery_mode'                           as delivery_mode,
--   smp.metadata->>'video_conference'                        as video_conf,
--   smp.metadata->>'archived_reason'                         as archived_reason,
--   smp.display_price,
--   left(smp.summary, 80)                                    as summary_en_preview,
--   left(smp.metadata->'localized'->'vi'->>'summary', 80)    as summary_vi_preview
-- from service_merchant_profiles smp
-- join tenants t on t.id::text = smp.tenant_id
-- where t.slug = 'co-mai-hung-chess-class'
-- order by smp.publish_state, smp.metadata->>'tier', smp.service_id;
--
-- Expected: 9 rows. publish_state='published' for the 4 online + Elite Online
-- Plus rows; publish_state='archived' for the 4 inperson-* rows with
-- archived_reason='online_only_pivot_2026_04_28'.
--
-- -----------------------------------------------------------------------------
--
-- 2) Show the new Elite Online Plus row in detail.
--
-- select
--   smp.service_id,
--   smp.name,
--   smp.summary,
--   smp.display_price,
--   smp.amount_aud,
--   smp.currency_code,
--   smp.duration_minutes,
--   smp.publish_state,
--   smp.tags_json,
--   smp.metadata->>'tier'                                    as tier,
--   smp.metadata->>'delivery_mode'                           as delivery_mode,
--   smp.metadata->'elite_features'                           as elite_features,
--   smp.metadata->'localized'->'vi'->>'summary'              as summary_vi,
--   smp.metadata->'promo'->'launch_2026'                     as promo_launch_2026
-- from service_merchant_profiles smp
-- join tenants t on t.id::text = smp.tenant_id
-- where t.slug = 'co-mai-hung-chess-class'
--   and smp.service_id = 'co-mai-hung-chess-elite-online-plus-60';
--
-- Expected: 1 row, name='Elite Online Plus',
-- display_price='1,500,000 VND / session', tier='4',
-- delivery_mode='online', elite_features=
--   ["session_recording","whatsapp_direct","priority_scheduling"],
-- promo_launch_2026 not null, summary mentions "Premium online tier".
--
-- -----------------------------------------------------------------------------
--
-- 3) Confirm tenant_settings has delivery_mode='online_only' and Zoho Meeting
--    integration set, with launch_promo from 035 still present (merge worked).
--
-- select
--   t.slug,
--   ts.settings_json->>'delivery_mode'             as delivery_mode,
--   ts.settings_json->>'video_conference_provider' as video_conf_provider,
--   ts.settings_json->>'lesson_platform'           as lesson_platform,
--   ts.settings_json->>'calendar_integration'      as calendar_integration,
--   ts.settings_json->>'tagline_en'                as tagline_en,
--   ts.settings_json->>'tagline_vi'                as tagline_vi,
--   ts.settings_json->'launch_promo'               as launch_promo_preserved,
--   ts.settings_json->>'sample_tenant_theme'       as sample_theme_preserved
-- from tenant_settings ts
-- join tenants t on t.id = ts.tenant_id
-- where t.slug = 'co-mai-hung-chess-class';
--
-- Expected: 1 row,
--   delivery_mode='online_only',
--   video_conference_provider='zoho_meeting',
--   lesson_platform='lichess',
--   calendar_integration='zoho_calendar',
--   tagline_en/vi populated with the new "Lichess + Zoom + Zoho Meeting" copy,
--   launch_promo_preserved not null (still has discount_first_month_pct=20 etc.),
--   sample_tenant_theme='chess_class' still present.
--
-- -----------------------------------------------------------------------------
--
-- 4) Quick counts: 5 published, 4 archived for the chess tenant.
--
-- select publish_state, count(*)
-- from service_merchant_profiles smp
-- join tenants t on t.id::text = smp.tenant_id
-- where t.slug = 'co-mai-hung-chess-class'
-- group by publish_state
-- order by publish_state;
--
-- Expected:
--   archived  | 4
--   published | 5
