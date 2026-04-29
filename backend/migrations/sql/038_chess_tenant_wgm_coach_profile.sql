-- BookedAI Phase 19+ (Chess Tenant Coach Identity Correction)
-- Migration 038: correct the Co Mai Hung chess academy coach identity to the
-- REAL Vietnamese Woman Grandmaster Nguyễn Thị Mai Hưng (female, WGM — NOT
-- full GM), add a structured `coach_profile` JSON block to tenant_settings
-- that the email template + frontend can read directly, and align the 5
-- published service_merchant_profile rows so EN summaries display AUD-only
-- pricing while VI keeps VND. Also strips any "GM " full-grandmaster or male-
-- pronoun phrasing left over from migrations 035/036.
-- Created 2026-04-28.
--
-- Source of truth (real-person facts):
--   https://en.wikipedia.org/wiki/Nguy%E1%BB%85n_Th%E1%BB%8B_Mai_H%C6%B0ng
--
-- Critical facts (verified against Wikipedia 2026-04-28):
--   * Real name:        Nguyễn Thị Mai Hưng (female, she/her)
--   * Born:             28 January 1994, Bắc Giang, Vietnam
--   * FIDE titles:      WIM (2010), WGM (2014) — Woman Grandmaster, NOT full GM
--   * Peak FIDE rating: 2357 (October 2016)
--   * Honours:          2013 Vietnamese Women's Chess Champion;
--                       2009 Asian Women's Team Championship — team gold +
--                       individual gold; 2011 World Women's Team Championship
--                       individual bronze; 5× Vietnam Women's Olympiad team
--                       (2010, 2012, 2014, 2016, 2018);
--                       Asian Youth Champion U12 (2005), U14 (2007),
--                       U16 (2010); Asian Junior U20 girls Champion (2013).
--
-- Currency display rule:
--   AUD is for EN-facing display only; the VND `display_price` column stays
--   the authoritative cash price. Conversion at indicative 1 AUD ≈ 16,500 VND:
--     260,000 VND   → AUD 16
--     1,040,000 VND → AUD 65
--     1,300,000 VND → AUD 80
--     1,500,000 VND → AUD 90
--   The `service_merchant_profiles` table does NOT have a
--   `display_price_aud` column (the existing schema is `amount_aud` numeric +
--   `currency_code` + `display_price` varchar; see migration 006). Therefore
--   the AUD-display price is stored under `metadata.display_price_aud` rather
--   than introducing a new column. This keeps the VND `display_price` field
--   authoritative and avoids a schema change for a display-only concern.
--
-- Idempotent: safe to run multiple times.
--   * All UPDATE statements scoped by chess tenant slug.
--   * JSON merges use `coalesce(metadata, '{}'::jsonb) || jsonb_build_object(...)`
--     so prior keys (launch_2026 promo from 035, delivery_mode + lesson_platform
--     + video_conference from 036, tier, archived_reason, etc.) are preserved.
--   * `tenant_settings.settings_json` merge uses `||` so 035 launch_promo,
--     036 online_only_pivot keys, and seed/theme keys are preserved.
--   * No service_id slug changes (FK safety).
--   * No price changes in VND.

begin;

do $$
declare
  chess_tenant_id_text text;
  chess_tenant_id_uuid uuid;
  coach_profile_json jsonb := jsonb_build_object(
    'full_name',         'Nguyễn Thị Mai Hưng',
    'display_name_en',   'WGM Mai Hưng',
    'display_name_vi',   'WGM Mai Hưng',
    'title_short',       'WGM',
    'title_long_en',     'Woman Grandmaster',
    'title_long_vi',     'Đại kiện tướng nữ',
    'gender',            'female',
    'pronouns_en',       'she/her',
    'pronouns_vi',       'cô / cô ấy',
    'born',              '1994-01-28',
    'birthplace',        'Bắc Giang, Vietnam',
    'wikipedia_url',     'https://en.wikipedia.org/wiki/Nguyễn_Thị_Mai_Hưng',
    'fide_titles',       jsonb_build_array(
      jsonb_build_object('title', 'WIM', 'year', 2010),
      jsonb_build_object('title', 'WGM', 'year', 2014)
    ),
    'peak_rating',       jsonb_build_object('value', 2357, 'as_of', '2016-10'),
    'achievements_en',   jsonb_build_array(
      jsonb_build_object('year', 2014,        'label', 'WGM title awarded (FIDE)'),
      jsonb_build_object('year', 2016,        'label', 'Peak FIDE rating 2357'),
      jsonb_build_object('year', 2013,        'label', 'Vietnamese Women''s Chess Champion'),
      jsonb_build_object('year', 2009,        'label', 'Asian Team Championship — team gold + individual gold'),
      jsonb_build_object('year', '2010-2018', 'label', '5× Vietnam Women''s Olympiad team'),
      jsonb_build_object('year', 2011,        'label', 'World Women''s Team Championship — individual bronze')
    ),
    'achievements_vi',   jsonb_build_array(
      jsonb_build_object('year', 2014,        'label', 'Đạt danh hiệu WGM (FIDE)'),
      jsonb_build_object('year', 2016,        'label', 'Đỉnh cao Elo FIDE 2357'),
      jsonb_build_object('year', 2013,        'label', 'Vô địch nữ Việt Nam'),
      jsonb_build_object('year', 2009,        'label', 'Giải Đồng đội Châu Á nữ — vàng đồng đội + cá nhân'),
      jsonb_build_object('year', '2010-2018', 'label', '5 lần dự Olympiad nữ Việt Nam'),
      jsonb_build_object('year', 2011,        'label', 'Giải Đồng đội Thế giới nữ — đồng cá nhân')
    ),
    'youth_titles',      jsonb_build_array(
      jsonb_build_object('year', 2005, 'label_en', 'Asian Youth Champion U12 (girls)'),
      jsonb_build_object('year', 2007, 'label_en', 'Asian Youth Champion U14 (girls)'),
      jsonb_build_object('year', 2010, 'label_en', 'Asian Youth Champion U16 (girls)'),
      jsonb_build_object('year', 2013, 'label_en', 'Asian Junior Champion U20 (girls)')
    ),
    'olympiad_appearances', jsonb_build_array(2010, 2012, 2014, 2016, 2018),
    'languages_taught',  jsonb_build_array('en', 'vi'),
    'bio_en',            'WGM Nguyễn Thị Mai Hưng is a Vietnamese Woman Grandmaster, born 28 January 1994 in Bắc Giang. She earned the WIM title in 2010 and the WGM title in 2014, with a peak FIDE rating of 2357 reached in October 2016. Her competitive record includes the 2013 Vietnamese Women''s Chess Championship, multiple Asian Youth Championship titles, team and individual gold at the 2009 Women''s Asian Team Championship, and individual bronze at the 2011 World Women''s Team Championship. She has represented Vietnam in five Women''s Chess Olympiads (2010, 2012, 2014, 2016, 2018).',
    'bio_vi',            'WGM Nguyễn Thị Mai Hưng là Đại kiện tướng cờ vua nữ của Việt Nam, sinh ngày 28/01/1994 tại Bắc Giang. Cô đạt danh hiệu WIM năm 2010 và WGM năm 2014, đỉnh cao Elo FIDE 2357 (tháng 10/2016). Thành tích thi đấu nổi bật gồm: vô địch nữ Việt Nam 2013, nhiều lần vô địch giải Trẻ Châu Á, huy chương vàng đồng đội + cá nhân tại Giải Đồng đội Châu Á nữ 2009, huy chương đồng cá nhân Giải Đồng đội Thế giới nữ 2011. Cô đại diện Việt Nam tham dự 5 kỳ Olympiad cờ vua nữ (2010, 2012, 2014, 2016, 2018).'
  );
  coach_blurb_en text := 'Taught by WGM Nguyễn Thị Mai Hưng — Vietnamese Woman Grandmaster, peak Elo 2357, 5× Olympiad team. Lessons in English or Vietnamese.';
  coach_blurb_vi text := 'Giảng dạy bởi WGM Nguyễn Thị Mai Hưng — Đại kiện tướng cờ vua nữ Việt Nam, Elo cao nhất 2357, 5 lần dự Olympiad. Có thể học Tiếng Anh hoặc Tiếng Việt.';
begin
  select id::text, id
    into chess_tenant_id_text, chess_tenant_id_uuid
  from tenants
  where slug = 'co-mai-hung-chess-class'
  limit 1;

  if chess_tenant_id_uuid is null then
    raise notice 'Skipping chess WGM coach profile correction: tenant slug co-mai-hung-chess-class not found.';
    return;
  end if;

  -----------------------------------------------------------------------------
  -- A. tenant_settings: full structured coach_profile + corrected taglines.
  --    Merge with || so prior keys (launch_promo, delivery_mode, lesson_platform,
  --    video_conference_provider, calendar_integration, sample_tenant_seed,
  --    sample_tenant_theme, etc.) are preserved.
  -----------------------------------------------------------------------------
  update tenant_settings
  set
    settings_json = coalesce(settings_json, '{}'::jsonb)
      || jsonb_build_object(
           'tagline_en',
           'Online chess training with WGM Nguyễn Thị Mai Hưng. Lichess + Zoom + Zoho Meeting.',
           'tagline_vi',
           'Đào tạo cờ vua online cùng WGM Nguyễn Thị Mai Hưng. Lichess + Zoom + Zoho Meeting.',
           'coach_profile', coach_profile_json,
           'coach_identity_corrected_at', '2026-04-28T00:00:00+07:00'
         ),
    version = version + 1,
    updated_at = now()
  where tenant_id = chess_tenant_id_uuid;

  -----------------------------------------------------------------------------
  -- B. Refresh the 5 published service_merchant_profile rows:
  --    EN summary → AUD-only display + WGM identity, no "GM " full-GM phrasing.
  --    VI summary → keep VND, swap "GM Mai Hùng" → "WGM Mai Hưng".
  --    metadata.coach_blurb_en + coach_blurb_vi added.
  --    metadata.display_price_aud added (no schema column for it; see header).
  --    metadata.coach_profile_ref pointing at tenant_settings (lightweight ref).
  -----------------------------------------------------------------------------

  -- Tier 1 / Online group 60 — 260,000 VND ≈ AUD 16
  update service_merchant_profiles
  set
    summary = 'Confident first 12 moves. Tactical patterns. Disciplined thinking. Small groups, max 8 students. Ages 6-12. Online via Lichess + Zoom. AUD 16 per student per session. 🎁 Launch 20% off month 1 + sibling 15% off.',
    metadata = coalesce(metadata, '{}'::jsonb)
      || jsonb_build_object(
           'display_price_aud', 16,
           'coach_blurb_en', coach_blurb_en,
           'coach_blurb_vi', coach_blurb_vi,
           'coach_profile_ref', 'tenant_settings.coach_profile'
         )
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
         ),
    updated_at = now()
  where service_id = 'co-mai-hung-chess-online-group-60'
    and tenant_id = chess_tenant_id_text;

  -- Tier 2 / Online private 60 — 1,040,000 VND ≈ AUD 65
  update service_merchant_profiles
  set
    summary = 'Direct 1-on-1 with WGM Mai Hưng. Personal opening repertoire. Game-by-game review. Custom training plan. Online private via Lichess + Zoom. AUD 65 per session. 🎁 Launch 20% off month 1 + annual prepay 10% off.',
    metadata = coalesce(metadata, '{}'::jsonb)
      || jsonb_build_object(
           'display_price_aud', 65,
           'coach_blurb_en', coach_blurb_en,
           'coach_blurb_vi', coach_blurb_vi,
           'coach_profile_ref', 'tenant_settings.coach_profile'
         )
      || jsonb_build_object(
           'localized',
           coalesce(metadata->'localized', '{}'::jsonb)
             || jsonb_build_object(
                  'vi',
                  coalesce(metadata->'localized'->'vi', '{}'::jsonb)
                    || jsonb_build_object(
                         'summary',
                         'Học 1-1 trực tiếp với WGM Mai Hưng. Kho khai cuộc cá nhân. Phân tích từng ván đấu. Lộ trình riêng. Học online qua Lichess + Zoom (Zoho Meeting). 1,040,000 VND/buổi. 🎁 Giảm 20% tháng đầu + đóng năm giảm thêm 10%.'
                       )
                )
         ),
    updated_at = now()
  where service_id = 'co-mai-hung-chess-online-private-60'
    and tenant_id = chess_tenant_id_text;

  -- Tier 3 / Online private 90 — 1,300,000 VND ≈ AUD 80
  update service_merchant_profiles
  set
    summary = '90-minute tournament-prep sessions with WGM Mai Hưng. Calculation depth, endgame mastery, pre-event simulation, mental preparation. Online private 1-on-1 via Lichess + Zoom. AUD 80 per session. 🎁 Annual prepay 10% off.',
    metadata = coalesce(metadata, '{}'::jsonb)
      || jsonb_build_object(
           'display_price_aud', 80,
           'coach_blurb_en', coach_blurb_en,
           'coach_blurb_vi', coach_blurb_vi,
           'coach_profile_ref', 'tenant_settings.coach_profile'
         )
      || jsonb_build_object(
           'localized',
           coalesce(metadata->'localized', '{}'::jsonb)
             || jsonb_build_object(
                  'vi',
                  coalesce(metadata->'localized'->'vi', '{}'::jsonb)
                    || jsonb_build_object(
                         'summary',
                         'Buổi luyện thi đấu 90 phút cùng WGM Mai Hưng. Tính toán sâu, thuần thục tàn cuộc, mô phỏng giải, huấn luyện tâm lý. Học online qua Lichess + Zoom (Zoho Meeting). 1,300,000 VND/buổi. 🎁 Đóng năm giảm thêm 10%.'
                       )
                )
         ),
    updated_at = now()
  where service_id = 'co-mai-hung-chess-online-private-90'
    and tenant_id = chess_tenant_id_text;

  -- Tier 4 (legacy 035 mapping) / Online group 90 — 1,040,000 VND ≈ AUD 65
  -- Per spec, group 90 aligned with tournament tier display (AUD 80) for parity
  -- with Tier 3 in marketing copy; metadata.display_price_aud=80 reflects that
  -- alignment while the underlying VND price stays 1,040,000.
  update service_merchant_profiles
  set
    summary = 'Online elite group cohort with WGM Mai Hưng. 90-minute deep-strategy session for stronger students. Max 8 students. Live online via Lichess + Zoom. AUD 80 per session. 🎁 Sibling 15% off second child.',
    metadata = coalesce(metadata, '{}'::jsonb)
      || jsonb_build_object(
           'display_price_aud', 80,
           'coach_blurb_en', coach_blurb_en,
           'coach_blurb_vi', coach_blurb_vi,
           'coach_profile_ref', 'tenant_settings.coach_profile'
         )
      || jsonb_build_object(
           'localized',
           coalesce(metadata->'localized', '{}'::jsonb)
             || jsonb_build_object(
                  'vi',
                  coalesce(metadata->'localized'->'vi', '{}'::jsonb)
                    || jsonb_build_object(
                         'summary',
                         'Nhóm tinh hoa online cùng WGM Mai Hưng. Buổi 90 phút chuyên sâu chiến lược cho học viên trình độ cao. Tối đa 8 học viên. Học online qua Lichess + Zoom (Zoho Meeting). 1,040,000 VND/buổi. 🎁 Giảm 15% cho con thứ 2.'
                       )
                )
         ),
    updated_at = now()
  where service_id = 'co-mai-hung-chess-online-group-90'
    and tenant_id = chess_tenant_id_text;

  -- Tier 4 (canonical) / Elite Online Plus 60 — 1,500,000 VND ≈ AUD 90
  update service_merchant_profiles
  set
    summary = 'Premium online tier with WGM Mai Hưng. Everything in Private 1-on-1, plus recorded sessions, direct WhatsApp/Telegram with the coach, and priority scheduling. AUD 90 per session.',
    metadata = coalesce(metadata, '{}'::jsonb)
      || jsonb_build_object(
           'display_price_aud', 90,
           'coach_blurb_en', coach_blurb_en,
           'coach_blurb_vi', coach_blurb_vi,
           'coach_profile_ref', 'tenant_settings.coach_profile'
         )
      || jsonb_build_object(
           'localized',
           coalesce(metadata->'localized', '{}'::jsonb)
             || jsonb_build_object(
                  'vi',
                  coalesce(metadata->'localized'->'vi', '{}'::jsonb)
                    || jsonb_build_object(
                         'summary',
                         'Gói online cao cấp cùng WGM Mai Hưng. Đầy đủ Kèm Riêng, kèm bản ghi buổi học, WhatsApp/Telegram trực tiếp với cô, ưu tiên đặt lịch. 1,500,000 VND/buổi.'
                       )
                )
         ),
    updated_at = now()
  where service_id = 'co-mai-hung-chess-elite-online-plus-60'
    and tenant_id = chess_tenant_id_text;
end $$;

commit;

-- =============================================================================
-- Verification queries (run manually after `psql -f`):
-- =============================================================================
--
-- 1) Show coach_profile from tenant_settings (full structured block).
--
-- select
--   t.slug,
--   ts.settings_json->'coach_profile'                 as coach_profile,
--   ts.settings_json->>'tagline_en'                   as tagline_en,
--   ts.settings_json->>'tagline_vi'                   as tagline_vi,
--   ts.settings_json->>'coach_identity_corrected_at'  as corrected_at,
--   ts.settings_json->'launch_promo'                  as launch_promo_preserved,
--   ts.settings_json->>'delivery_mode'                as delivery_mode_preserved
-- from tenant_settings ts
-- join tenants t on t.id = ts.tenant_id
-- where t.slug = 'co-mai-hung-chess-class';
--
-- Expected: 1 row. coach_profile.full_name='Nguyễn Thị Mai Hưng',
-- title_short='WGM', gender='female', peak_rating.value=2357, fide_titles
-- contains WIM(2010)+WGM(2014), bio_en starts with "WGM Nguyễn Thị Mai Hưng".
-- launch_promo_preserved + delivery_mode_preserved both non-null (i.e. prior
-- migrations 035 and 036 keys survived the merge).
--
-- -----------------------------------------------------------------------------
--
-- 2) Show all 5 published service profiles' EN summary + AUD price + coach blurbs.
--    Expected: 5 rows, summaries mention "AUD" and contain no raw "VND" string,
--    metadata.display_price_aud populated (16/65/80/80/90).
--
-- select
--   smp.service_id,
--   smp.metadata->>'tier'                                as tier,
--   smp.metadata->>'display_price_aud'                   as display_price_aud,
--   smp.summary                                          as summary_en,
--   smp.metadata->>'coach_blurb_en'                      as coach_blurb_en,
--   smp.metadata->>'coach_blurb_vi'                      as coach_blurb_vi
-- from service_merchant_profiles smp
-- join tenants t on t.id::text = smp.tenant_id
-- where t.slug = 'co-mai-hung-chess-class'
--   and smp.publish_state = 'published'
-- order by (smp.metadata->>'tier')::int, smp.service_id;
--
-- Expected: exactly 5 rows. display_price_aud values:
--   co-mai-hung-chess-online-group-60       → 16
--   co-mai-hung-chess-online-private-60     → 65
--   co-mai-hung-chess-online-private-90     → 80
--   co-mai-hung-chess-online-group-90       → 80
--   co-mai-hung-chess-elite-online-plus-60  → 90
-- All summary_en values reference "WGM" (or no coach name) and "AUD <n>".
--
-- -----------------------------------------------------------------------------
--
-- 3) Sanity check: confirm no published row contains the literal "GM " token
--    (whole-word, with trailing space) — this asserts no full-Grandmaster
--    phrasing remains in either EN summary, VI summary, or coach blurbs.
--    "WGM " is OK; we are matching " GM " or "^GM " as a separate word.
--
-- select
--   smp.service_id,
--   smp.summary                                                    as summary_en,
--   smp.metadata->'localized'->'vi'->>'summary'                    as summary_vi,
--   smp.metadata->>'coach_blurb_en'                                as coach_blurb_en,
--   smp.metadata->>'coach_blurb_vi'                                as coach_blurb_vi
-- from service_merchant_profiles smp
-- join tenants t on t.id::text = smp.tenant_id
-- where t.slug = 'co-mai-hung-chess-class'
--   and smp.publish_state = 'published'
--   and (
--        smp.summary                                  ~ '(^|[^A-Za-z])GM '
--     or smp.metadata->'localized'->'vi'->>'summary'  ~ '(^|[^A-Za-z])GM '
--     or coalesce(smp.metadata->>'coach_blurb_en','') ~ '(^|[^A-Za-z])GM '
--     or coalesce(smp.metadata->>'coach_blurb_vi','') ~ '(^|[^A-Za-z])GM '
--   );
--
-- Expected: 0 rows.
--
-- -----------------------------------------------------------------------------
--
-- 4) Show coach_blurb_en + coach_blurb_vi for each published service row.
--
-- select
--   smp.service_id,
--   smp.metadata->>'coach_blurb_en' as coach_blurb_en,
--   smp.metadata->>'coach_blurb_vi' as coach_blurb_vi
-- from service_merchant_profiles smp
-- join tenants t on t.id::text = smp.tenant_id
-- where t.slug = 'co-mai-hung-chess-class'
--   and smp.publish_state = 'published'
-- order by (smp.metadata->>'tier')::int, smp.service_id;
--
-- Expected: 5 rows, both blurbs non-null on every row, both reference
-- "WGM Nguyễn Thị Mai Hưng" / "Đại kiện tướng cờ vua nữ Việt Nam".
