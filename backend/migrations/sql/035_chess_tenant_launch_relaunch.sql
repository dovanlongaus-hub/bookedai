-- BookedAI Phase 19+ (Chess Launch Relaunch)
-- Migration 035: align Co Mai Hung chess academy DB rows with the launch wording
-- on chess.bookedai.au, expose the launch promo, and ensure all eight catalog
-- rows are publicly published. Created 2026-04-28.
--
-- Idempotent: safe to run multiple times. Only UPDATE statements scoped to the
-- chess tenant by slug; no inserts that would duplicate rows. JSON merges use
-- jsonb_set / `||` so existing keys are preserved.
--
-- This migration:
--   * Adds a service_merchant_profiles.metadata jsonb column (additive, IF NOT EXISTS)
--     to host bilingual summaries (EN canonical + VI translation) and the
--     launch_2026 promo block. The column did not previously exist on the table
--     (see backend/db.py ServiceMerchantProfile model).
--   * Updates all 8 chess service_merchant_profile rows:
--       - rewrites `summary` (EN canonical) to match ChessGrandmasterApp.tsx
--       - writes `metadata.localized.vi.summary` (VI canonical translation)
--       - sets `metadata.tier` (1..4) for downstream tier-aware presenters
--       - merges `metadata.promo.launch_2026` (20%/15%/10%/30-min trial)
--       - flips publish_state -> 'published' (Phase 1 audit found rows still
--         in 'review' on some environments; idempotent)
--   * Updates tenant_settings.settings_json for slug `co-mai-hung-chess-class`:
--       - launch_promo block (same as above)
--       - tagline_en / tagline_vi
--   * Preserves existing tags_json, prices, slugs, IDs, and credentials.
--
-- Profile -> Tier mapping (8 rows, 2-to-1 online/in-person per tier):
--   Tier 1 - Beginner Foundations (260,000 VND / student / session)
--     * co-mai-hung-chess-online-group-60      (Online via Lichess + Zoom)
--     * co-mai-hung-chess-inperson-group-60    (In-person at HCMC venue)
--   Tier 2 - Private Grandmaster Coaching (1,040,000 VND / session)
--     * co-mai-hung-chess-online-private-60    (Online private 1-1)
--     * co-mai-hung-chess-inperson-private-60  (In-person private 1-1)
--   Tier 3 - Tournament Preparation (1,300,000 VND / 90-min session)
--     * co-mai-hung-chess-online-private-90    (Online tournament prep)
--     * co-mai-hung-chess-inperson-private-90  (In-person tournament prep)
--   Tier 4 - At-Home Elite Training (1,040,000 VND base + 300,000 VND travel)
--     * co-mai-hung-chess-online-group-90      (Online elite group 90 min)
--     * co-mai-hung-chess-inperson-group-90    (In-person elite group 90 min)
--
-- TODO(localized-summary-schema): the ServiceMerchantProfile ORM model in
-- backend/db.py does not yet expose `metadata` as a Mapped column. A follow-up
-- code change should add `metadata_json: Mapped[dict] = mapped_column(JSON, default=dict)`
-- and an init_database ALTER mirror so presenters can read VI summary +
-- launch_promo without raw SQL. Until then, presenters still render `summary`
-- (English) — VI fallback is sourced from the JSON column via raw SELECT.

begin;

-- 1. Additive schema extension (idempotent). No-op if already present.
alter table service_merchant_profiles
  add column if not exists metadata jsonb not null default '{}'::jsonb;

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
begin
  select id::text, id
    into chess_tenant_id_text, chess_tenant_id_uuid
  from tenants
  where slug = 'co-mai-hung-chess-class'
  limit 1;

  if chess_tenant_id_uuid is null then
    raise notice 'Skipping chess launch relaunch: tenant slug co-mai-hung-chess-class not found.';
    return;
  end if;

  -----------------------------------------------------------------------------
  -- Tier 1 - Beginner Foundations (group, 60-min, 260,000 VND)
  -----------------------------------------------------------------------------

  -- Tier 1 / Online group 60
  update service_merchant_profiles
  set
    summary = 'Confident first 12 moves. Tactical patterns. Disciplined thinking. Small groups, max 8 students. Ages 6-12. Online via Lichess + Zoom. 260,000 VND per student per session. 🎁 Launch 20% off month 1 + sibling 15% off.',
    publish_state = 'published',
    metadata = coalesce(metadata, '{}'::jsonb)
      || jsonb_build_object('tier', 1)
      || jsonb_build_object(
           'localized',
           coalesce(metadata->'localized', '{}'::jsonb)
             || jsonb_build_object(
                  'vi',
                  coalesce(metadata->'localized'->'vi', '{}'::jsonb)
                    || jsonb_build_object(
                         'summary',
                         'Tự tin 12 nước đi đầu. Mẫu chiến thuật. Tư duy kỷ luật. Nhóm nhỏ tối đa 8 học viên. Độ tuổi 6-12. Trực tuyến qua Lichess + Zoom. 260,000 VND/học viên/buổi. 🎁 Giảm 20% tháng đầu + giảm 15% cho con thứ 2.'
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

  -- Tier 1 / In-person group 60
  update service_merchant_profiles
  set
    summary = 'Confident first 12 moves. Tactical patterns. Disciplined thinking. Small groups, max 8 students. Ages 6-12. In-person at HCMC venue. 260,000 VND per student per session. 🎁 Launch 20% off month 1 + sibling 15% off.',
    publish_state = 'published',
    metadata = coalesce(metadata, '{}'::jsonb)
      || jsonb_build_object('tier', 1)
      || jsonb_build_object(
           'localized',
           coalesce(metadata->'localized', '{}'::jsonb)
             || jsonb_build_object(
                  'vi',
                  coalesce(metadata->'localized'->'vi', '{}'::jsonb)
                    || jsonb_build_object(
                         'summary',
                         'Tự tin 12 nước đi đầu. Mẫu chiến thuật. Tư duy kỷ luật. Nhóm nhỏ tối đa 8 học viên. Độ tuổi 6-12. Học trực tiếp tại địa điểm TP.HCM. 260,000 VND/học viên/buổi. 🎁 Giảm 20% tháng đầu + giảm 15% cho con thứ 2.'
                       )
                )
         )
      || jsonb_build_object(
           'promo',
           coalesce(metadata->'promo', '{}'::jsonb)
             || jsonb_build_object('launch_2026', promo_json)
         ),
    updated_at = now()
  where service_id = 'co-mai-hung-chess-inperson-group-60'
    and tenant_id = chess_tenant_id_text;

  -----------------------------------------------------------------------------
  -- Tier 2 - Private Grandmaster Coaching (1,040,000 VND / session)
  -----------------------------------------------------------------------------

  -- Tier 2 / Online private 60
  update service_merchant_profiles
  set
    summary = 'Direct 1-on-1 with GM Mai Hung. Personal opening repertoire. Game-by-game review. Custom training plan. Online private 1-1. 1,040,000 VND per session. 🎁 Launch 20% off month 1 + annual prepay 10% off.',
    publish_state = 'published',
    metadata = coalesce(metadata, '{}'::jsonb)
      || jsonb_build_object('tier', 2)
      || jsonb_build_object(
           'localized',
           coalesce(metadata->'localized', '{}'::jsonb)
             || jsonb_build_object(
                  'vi',
                  coalesce(metadata->'localized'->'vi', '{}'::jsonb)
                    || jsonb_build_object(
                         'summary',
                         'Học 1-1 trực tiếp với GM Mai Hùng. Kho khai cuộc cá nhân. Phân tích từng ván đấu. Lộ trình riêng. Trực tuyến 1-1. 1,040,000 VND/buổi. 🎁 Giảm 20% tháng đầu + đóng năm giảm thêm 10%.'
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

  -- Tier 2 / In-person private 60
  update service_merchant_profiles
  set
    summary = 'Direct 1-on-1 with GM Mai Hung. Personal opening repertoire. Game-by-game review. Custom training plan. In-person private 1-1. 1,040,000 VND per session. 🎁 Launch 20% off month 1 + annual prepay 10% off.',
    publish_state = 'published',
    metadata = coalesce(metadata, '{}'::jsonb)
      || jsonb_build_object('tier', 2)
      || jsonb_build_object(
           'localized',
           coalesce(metadata->'localized', '{}'::jsonb)
             || jsonb_build_object(
                  'vi',
                  coalesce(metadata->'localized'->'vi', '{}'::jsonb)
                    || jsonb_build_object(
                         'summary',
                         'Học 1-1 trực tiếp với GM Mai Hùng. Kho khai cuộc cá nhân. Phân tích từng ván đấu. Lộ trình riêng. Học trực tiếp 1-1. 1,040,000 VND/buổi. 🎁 Giảm 20% tháng đầu + đóng năm giảm thêm 10%.'
                       )
                )
         )
      || jsonb_build_object(
           'promo',
           coalesce(metadata->'promo', '{}'::jsonb)
             || jsonb_build_object('launch_2026', promo_json)
         ),
    updated_at = now()
  where service_id = 'co-mai-hung-chess-inperson-private-60'
    and tenant_id = chess_tenant_id_text;

  -----------------------------------------------------------------------------
  -- Tier 3 - Tournament Preparation (1,300,000 VND / 90-min)
  -----------------------------------------------------------------------------

  -- Tier 3 / Online private 90
  update service_merchant_profiles
  set
    summary = '90-minute tournament-prep sessions. Calculation depth, endgame mastery, pre-event simulation, mental preparation. Online tournament prep. 1,300,000 VND per session. 🎁 Annual prepay 10% off.',
    publish_state = 'published',
    metadata = coalesce(metadata, '{}'::jsonb)
      || jsonb_build_object('tier', 3)
      || jsonb_build_object(
           'localized',
           coalesce(metadata->'localized', '{}'::jsonb)
             || jsonb_build_object(
                  'vi',
                  coalesce(metadata->'localized'->'vi', '{}'::jsonb)
                    || jsonb_build_object(
                         'summary',
                         'Buổi luyện thi đấu 90 phút. Tính toán sâu, thuần thục tàn cuộc, mô phỏng giải, huấn luyện tâm lý. Luyện thi đấu trực tuyến. 1,300,000 VND/buổi. 🎁 Đóng năm giảm thêm 10%.'
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

  -- Tier 3 / In-person private 90
  update service_merchant_profiles
  set
    summary = '90-minute tournament-prep sessions. Calculation depth, endgame mastery, pre-event simulation, mental preparation. In-person tournament prep. 1,300,000 VND per session. 🎁 Annual prepay 10% off.',
    publish_state = 'published',
    metadata = coalesce(metadata, '{}'::jsonb)
      || jsonb_build_object('tier', 3)
      || jsonb_build_object(
           'localized',
           coalesce(metadata->'localized', '{}'::jsonb)
             || jsonb_build_object(
                  'vi',
                  coalesce(metadata->'localized'->'vi', '{}'::jsonb)
                    || jsonb_build_object(
                         'summary',
                         'Buổi luyện thi đấu 90 phút. Tính toán sâu, thuần thục tàn cuộc, mô phỏng giải, huấn luyện tâm lý. Luyện thi đấu trực tiếp. 1,300,000 VND/buổi. 🎁 Đóng năm giảm thêm 10%.'
                       )
                )
         )
      || jsonb_build_object(
           'promo',
           coalesce(metadata->'promo', '{}'::jsonb)
             || jsonb_build_object('launch_2026', promo_json)
         ),
    updated_at = now()
  where service_id = 'co-mai-hung-chess-inperson-private-90'
    and tenant_id = chess_tenant_id_text;

  -----------------------------------------------------------------------------
  -- Tier 4 - At-Home Elite Training (1,040,000 VND base + 300,000 VND travel)
  -----------------------------------------------------------------------------

  -- Tier 4 / Online group 90 (online elite cohort variant)
  update service_merchant_profiles
  set
    summary = 'Coach travels to your home. Real over-the-board training in your living room. Family schedule flexibility. Online elite group 90 min. Base 1,040,000 VND/session + 300,000 VND travel surcharge. 🎁 Sibling 15% off second child.',
    publish_state = 'published',
    metadata = coalesce(metadata, '{}'::jsonb)
      || jsonb_build_object('tier', 4)
      || jsonb_build_object(
           'localized',
           coalesce(metadata->'localized', '{}'::jsonb)
             || jsonb_build_object(
                  'vi',
                  coalesce(metadata->'localized'->'vi', '{}'::jsonb)
                    || jsonb_build_object(
                         'summary',
                         'Giáo viên đến tận nhà bạn. Học trực tiếp trên bàn cờ thật ngay phòng khách. Linh hoạt theo lịch gia đình. Nhóm tinh hoa trực tuyến 90 phút. Phí 1,040,000 VND/buổi + phụ phí đi lại 300,000 VND. 🎁 Giảm 15% cho con thứ 2.'
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

  -- Tier 4 / In-person group 90 (canonical at-home elite)
  update service_merchant_profiles
  set
    summary = 'Coach travels to your home. Real over-the-board training in your living room. Family schedule flexibility. In-person at home (group of 8). Base 1,040,000 VND/session + 300,000 VND travel surcharge. 🎁 Sibling 15% off second child.',
    publish_state = 'published',
    metadata = coalesce(metadata, '{}'::jsonb)
      || jsonb_build_object('tier', 4)
      || jsonb_build_object(
           'localized',
           coalesce(metadata->'localized', '{}'::jsonb)
             || jsonb_build_object(
                  'vi',
                  coalesce(metadata->'localized'->'vi', '{}'::jsonb)
                    || jsonb_build_object(
                         'summary',
                         'Giáo viên đến tận nhà bạn. Học trực tiếp trên bàn cờ thật ngay phòng khách. Linh hoạt theo lịch gia đình. Học trực tiếp tại nhà (nhóm 8). Phí 1,040,000 VND/buổi + phụ phí đi lại 300,000 VND. 🎁 Giảm 15% cho con thứ 2.'
                       )
                )
         )
      || jsonb_build_object(
           'promo',
           coalesce(metadata->'promo', '{}'::jsonb)
             || jsonb_build_object('launch_2026', promo_json)
         ),
    updated_at = now()
  where service_id = 'co-mai-hung-chess-inperson-group-90'
    and tenant_id = chess_tenant_id_text;

  -----------------------------------------------------------------------------
  -- Tenant settings: launch_promo + bilingual taglines (merge, do not overwrite)
  -----------------------------------------------------------------------------
  update tenant_settings
  set
    settings_json = coalesce(settings_json, '{}'::jsonb)
      || jsonb_build_object('launch_promo', promo_json)
      || jsonb_build_object(
           'tagline_en',
           'Train chess with a Vietnamese grandmaster. First 30 minutes free.'
         )
      || jsonb_build_object(
           'tagline_vi',
           'Học cờ cùng Đại kiện tướng Việt Nam. 30 phút đầu tiên miễn phí.'
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
-- 1) Show all 8 chess profiles with their new summary, publish_state, tier,
--    promo block presence, and VI summary preview.
--
-- select
--   smp.service_id,
--   smp.publish_state,
--   smp.metadata->>'tier'                                      as tier,
--   smp.metadata->'promo'->'launch_2026'                       as promo_launch_2026,
--   left(smp.summary, 80)                                      as summary_en_preview,
--   left(smp.metadata->'localized'->'vi'->>'summary', 80)      as summary_vi_preview
-- from service_merchant_profiles smp
-- join tenants t on t.id::text = smp.tenant_id
-- where t.slug = 'co-mai-hung-chess-class'
-- order by smp.metadata->>'tier', smp.service_id;
--
-- Expected: 8 rows, all publish_state='published', tier in (1,2,3,4),
-- promo_launch_2026 not null, summaries start with the canonical sentences.
--
-- -----------------------------------------------------------------------------
--
-- 2) Show tenant settings_json launch_promo + tagline blocks.
--
-- select
--   t.slug,
--   ts.settings_json->'launch_promo'  as launch_promo,
--   ts.settings_json->>'tagline_en'   as tagline_en,
--   ts.settings_json->>'tagline_vi'   as tagline_vi
-- from tenant_settings ts
-- join tenants t on t.id = ts.tenant_id
-- where t.slug = 'co-mai-hung-chess-class';
--
-- Expected: 1 row, launch_promo with discount_first_month_pct=20,
-- sibling_discount_pct=15, annual_prepay_pct=10, free_trial_minutes=30,
-- ends_at='2026-05-12T23:59:59+07:00', tagline_en/vi populated.
--
-- -----------------------------------------------------------------------------
--
-- 3) Confirm exactly 8 rows updated for the chess tenant with the new
--    publish_state + tier + promo metadata.
--
-- select count(*) as published_chess_rows_with_promo
-- from service_merchant_profiles smp
-- join tenants t on t.id::text = smp.tenant_id
-- where t.slug = 'co-mai-hung-chess-class'
--   and smp.publish_state = 'published'
--   and smp.metadata ? 'tier'
--   and smp.metadata->'promo' ? 'launch_2026';
--
-- Expected: 8.
