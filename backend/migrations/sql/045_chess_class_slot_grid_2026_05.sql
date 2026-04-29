-- 045_chess_class_slot_grid_2026_05.sql
--
-- Adds 3 new chess services + 4-week slot grid per operator brief 2026-04-29.
--
-- New services (chess@bookedai.au tenant):
--   1. Superkid group       — Tue/Fri 17:30-18:30 ICT, 60 min, 800,000 VND/buổi (≈ AUD 49)
--   2. Advanced group       — Wed/Sun 20:00-21:30 ICT, 90 min, 1,000,000 VND/buổi (≈ AUD 60)
--   3. Private 1-on-1       — Mon/Wed/Thu/Fri 11:00-12:00; Wed 17:00-18:00; Tue/Thu 20:00-22:00;
--                             Fri 16:30-17:30; Sat 15:00-16:00 ICT — 1,000,000 VND/buổi (AUD 60)
--
-- All slots run 2026-05-04 (Mon) → 2026-05-31 (Sun) — 4 weekly recurrences each.
-- Each slot is bookable independently. Group classes seat 8; 1-1 is capacity 1.
--
-- Idempotent. Wrapped in BEGIN/COMMIT. Re-runs converge.

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
    raise notice 'chess tenant not found; skipping migration 045';
    return;
  end if;

  -- ============================================================
  -- 1. Insert / upsert 3 new services
  -- ============================================================

  insert into service_merchant_profiles (
    tenant_id, service_id, business_name, name, summary, amount_aud, display_price,
    currency_code, publish_state, tags_json, featured, is_active, metadata, created_at, updated_at
  ) values
    (
      chess_tenant_id_text,
      'co-mai-hung-chess-superkid-group-tue-fri',
      'Mai Hưng Chess Academy',
      'Superkid Chess Group — Tue/Fri Evening',
      'Online group class for Superkid learners (kids age 6-12). Tuesday + Friday 17:30-18:30 ICT, 60 minutes per session. Live coaching with WGM Mai Hưng via Lichess + Zoom + Zoho Meeting. 800,000 VND per session (AUD 49). 8-session cohort. Small groups, max 8 students. 🎁 Sibling 15% off second child.',
      49,
      'A$49 / student / session',
      'AUD',
      'published',
      '["online","group","superkid","kids","tue-fri","60min","2026-05"]'::jsonb,
      0,
      1,
      jsonb_build_object(
        'tier', 'superkid',
        'display_price_aud', 49,
        'display_price_vnd_per_session', 800000,
        'sessions_per_cohort', 8,
        'cohort_label', 'Superkid Tue/Fri 17:30 ICT',
        'duration_minutes', 60,
        'capacity_per_slot', 8,
        'pricing_market', 'sydney',
        'delivery_mode', 'online',
        'video_conference', 'zoho_meeting',
        'lesson_platform', 'lichess',
        'localized', jsonb_build_object(
          'vi', jsonb_build_object(
            'summary', 'Lớp tập thể trực tuyến cho Superkid (6-12 tuổi). Thứ 3 + Thứ 6, 17:30-18:30 ICT, 60 phút/buổi. Học cùng WGM Mai Hưng qua Lichess + Zoom + Zoho Meeting. 800,000 VND/buổi (AUD 49). Khóa 8 buổi. Nhóm nhỏ tối đa 8 học viên. 🎁 Giảm 15% cho con thứ 2.'
          )
        )
      ),
      now(), now()
    ),
    (
      chess_tenant_id_text,
      'co-mai-hung-chess-advanced-group-wed-sun',
      'Mai Hưng Chess Academy',
      'Advanced Chess Group — Wed/Sun Evening',
      'Online advanced group class. Wednesday + Sunday 20:00-21:30 ICT, 90 minutes per session. Tournament-mindset coaching with WGM Mai Hưng via Lichess + Zoom + Zoho Meeting. 1,000,000 VND per session (AUD 60). 8-session cohort. Max 8 students. Best for serious improvers.',
      60,
      'A$60 / student / session',
      'AUD',
      'published',
      '["online","group","advanced","wed-sun","90min","tournament-prep","2026-05"]'::jsonb,
      0,
      1,
      jsonb_build_object(
        'tier', 'advanced_group',
        'display_price_aud', 60,
        'display_price_vnd_per_session', 1000000,
        'sessions_per_cohort', 8,
        'cohort_label', 'Advanced Wed/Sun 20:00 ICT',
        'duration_minutes', 90,
        'capacity_per_slot', 8,
        'pricing_market', 'sydney',
        'delivery_mode', 'online',
        'video_conference', 'zoho_meeting',
        'lesson_platform', 'lichess',
        'localized', jsonb_build_object(
          'vi', jsonb_build_object(
            'summary', 'Lớp tập thể nâng cao trực tuyến. Thứ 4 + Chủ Nhật, 20:00-21:30 ICT, 90 phút/buổi. Học cùng WGM Mai Hưng qua Lichess + Zoom + Zoho Meeting. 1,000,000 VND/buổi (AUD 60). Khóa 8 buổi. Tối đa 8 học viên. Phù hợp cho học viên nghiêm túc cải thiện trình độ.'
          )
        )
      ),
      now(), now()
    ),
    (
      chess_tenant_id_text,
      'co-mai-hung-chess-private-1-on-1',
      'Mai Hưng Chess Academy',
      'Private 1-on-1 with WGM Mai Hưng',
      'Private 1-on-1 chess coaching with WGM Mai Hưng. Multiple weekly time windows: weekday mornings 11:00-12:00; Wed 17:00-18:00; Tue/Thu 20:00-22:00 (2-hour deep session); Fri 16:30-17:30; Sat 15:00-16:00 ICT. 1,000,000 VND per session (AUD 60). 8-session cohort. Online via Lichess + Zoom + Zoho Meeting. Pick the time that works for you.',
      60,
      'A$60 / session',
      'AUD',
      'published',
      '["online","private","1-1","kids-and-adults","60-or-120-min","2026-05"]'::jsonb,
      0,
      1,
      jsonb_build_object(
        'tier', 'private_1_1',
        'display_price_aud', 60,
        'display_price_vnd_per_session', 1000000,
        'sessions_per_cohort', 8,
        'cohort_label', '1-on-1 with GM',
        'duration_minutes_default', 60,
        'capacity_per_slot', 1,
        'pricing_market', 'sydney',
        'delivery_mode', 'online',
        'video_conference', 'zoho_meeting',
        'lesson_platform', 'lichess',
        'localized', jsonb_build_object(
          'vi', jsonb_build_object(
            'summary', 'Kèm riêng 1-1 cùng WGM Mai Hưng. Nhiều khung giờ trong tuần: T2-T6 sáng 11:00-12:00; T4 17:00-18:00; T3/T5 20:00-22:00 (buổi sâu 2 giờ); T6 16:30-17:30; T7 15:00-16:00 ICT. 1,000,000 VND/buổi (AUD 60). Khóa 8 buổi. Online qua Lichess + Zoom + Zoho Meeting. Bạn chọn giờ phù hợp.'
          )
        )
      ),
      now(), now()
    )
  on conflict (service_id) do update set
    name = excluded.name,
    summary = excluded.summary,
    amount_aud = excluded.amount_aud,
    display_price = excluded.display_price,
    publish_state = excluded.publish_state,
    tags_json = excluded.tags_json,
    metadata = coalesce(service_merchant_profiles.metadata, '{}'::jsonb) || excluded.metadata,
    updated_at = now();

  -- ============================================================
  -- 2. Slot grid — 4 weeks starting Mon 2026-05-04
  -- ============================================================
  -- Helper: build one slot row given service / date / hh:mm / duration / capacity / cohort.
  -- We use generate_series(0, 3) to get 4 weekly recurrences.

  -- Superkid Tuesday
  insert into chess_course_schedule_slots
    (tenant_id, service_id, starts_at, duration_minutes, timezone, capacity, cohort_label, cohort_recurrence_rule, status)
  select
    chess_tenant_id_text::uuid,
    'co-mai-hung-chess-superkid-group-tue-fri',
    ('2026-05-05 17:30:00+07'::timestamptz) + (n * interval '7 days'),
    60, 'Asia/Ho_Chi_Minh', 8,
    'Superkid Tue/Fri 17:30 ICT',
    'FREQ=WEEKLY;BYDAY=TU,FR',
    'open'
  from generate_series(0, 3) n
  on conflict (tenant_id, service_id, starts_at) do nothing;

  -- Superkid Friday
  insert into chess_course_schedule_slots
    (tenant_id, service_id, starts_at, duration_minutes, timezone, capacity, cohort_label, cohort_recurrence_rule, status)
  select
    chess_tenant_id_text::uuid,
    'co-mai-hung-chess-superkid-group-tue-fri',
    ('2026-05-08 17:30:00+07'::timestamptz) + (n * interval '7 days'),
    60, 'Asia/Ho_Chi_Minh', 8,
    'Superkid Tue/Fri 17:30 ICT',
    'FREQ=WEEKLY;BYDAY=TU,FR',
    'open'
  from generate_series(0, 3) n
  on conflict (tenant_id, service_id, starts_at) do nothing;

  -- Advanced Wednesday
  insert into chess_course_schedule_slots
    (tenant_id, service_id, starts_at, duration_minutes, timezone, capacity, cohort_label, cohort_recurrence_rule, status)
  select
    chess_tenant_id_text::uuid,
    'co-mai-hung-chess-advanced-group-wed-sun',
    ('2026-05-06 20:00:00+07'::timestamptz) + (n * interval '7 days'),
    90, 'Asia/Ho_Chi_Minh', 8,
    'Advanced Wed/Sun 20:00 ICT',
    'FREQ=WEEKLY;BYDAY=WE,SU',
    'open'
  from generate_series(0, 3) n
  on conflict (tenant_id, service_id, starts_at) do nothing;

  -- Advanced Sunday
  insert into chess_course_schedule_slots
    (tenant_id, service_id, starts_at, duration_minutes, timezone, capacity, cohort_label, cohort_recurrence_rule, status)
  select
    chess_tenant_id_text::uuid,
    'co-mai-hung-chess-advanced-group-wed-sun',
    ('2026-05-10 20:00:00+07'::timestamptz) + (n * interval '7 days'),
    90, 'Asia/Ho_Chi_Minh', 8,
    'Advanced Wed/Sun 20:00 ICT',
    'FREQ=WEEKLY;BYDAY=WE,SU',
    'open'
  from generate_series(0, 3) n
  on conflict (tenant_id, service_id, starts_at) do nothing;

  -- Private 1-1 grid: 10 weekday windows × 4 weeks
  -- Mon 11-12
  insert into chess_course_schedule_slots
    (tenant_id, service_id, starts_at, duration_minutes, timezone, capacity, cohort_label, cohort_recurrence_rule, status)
  select chess_tenant_id_text::uuid, 'co-mai-hung-chess-private-1-on-1',
    ('2026-05-04 11:00:00+07'::timestamptz) + (n * interval '7 days'),
    60, 'Asia/Ho_Chi_Minh', 1, 'Mon 11:00 ICT 1-1', 'FREQ=WEEKLY;BYDAY=MO', 'open'
  from generate_series(0, 3) n
  on conflict (tenant_id, service_id, starts_at) do nothing;

  -- Tue 11-12
  insert into chess_course_schedule_slots
    (tenant_id, service_id, starts_at, duration_minutes, timezone, capacity, cohort_label, cohort_recurrence_rule, status)
  select chess_tenant_id_text::uuid, 'co-mai-hung-chess-private-1-on-1',
    ('2026-05-05 11:00:00+07'::timestamptz) + (n * interval '7 days'),
    60, 'Asia/Ho_Chi_Minh', 1, 'Tue 11:00 ICT 1-1', 'FREQ=WEEKLY;BYDAY=TU', 'open'
  from generate_series(0, 3) n
  on conflict (tenant_id, service_id, starts_at) do nothing;

  -- Tue 20-22 (2h)
  insert into chess_course_schedule_slots
    (tenant_id, service_id, starts_at, duration_minutes, timezone, capacity, cohort_label, cohort_recurrence_rule, status)
  select chess_tenant_id_text::uuid, 'co-mai-hung-chess-private-1-on-1',
    ('2026-05-05 20:00:00+07'::timestamptz) + (n * interval '7 days'),
    120, 'Asia/Ho_Chi_Minh', 1, 'Tue 20:00 ICT 1-1 (2h deep)', 'FREQ=WEEKLY;BYDAY=TU', 'open'
  from generate_series(0, 3) n
  on conflict (tenant_id, service_id, starts_at) do nothing;

  -- Wed 11-12
  insert into chess_course_schedule_slots
    (tenant_id, service_id, starts_at, duration_minutes, timezone, capacity, cohort_label, cohort_recurrence_rule, status)
  select chess_tenant_id_text::uuid, 'co-mai-hung-chess-private-1-on-1',
    ('2026-05-06 11:00:00+07'::timestamptz) + (n * interval '7 days'),
    60, 'Asia/Ho_Chi_Minh', 1, 'Wed 11:00 ICT 1-1', 'FREQ=WEEKLY;BYDAY=WE', 'open'
  from generate_series(0, 3) n
  on conflict (tenant_id, service_id, starts_at) do nothing;

  -- Wed 17-18
  insert into chess_course_schedule_slots
    (tenant_id, service_id, starts_at, duration_minutes, timezone, capacity, cohort_label, cohort_recurrence_rule, status)
  select chess_tenant_id_text::uuid, 'co-mai-hung-chess-private-1-on-1',
    ('2026-05-06 17:00:00+07'::timestamptz) + (n * interval '7 days'),
    60, 'Asia/Ho_Chi_Minh', 1, 'Wed 17:00 ICT 1-1', 'FREQ=WEEKLY;BYDAY=WE', 'open'
  from generate_series(0, 3) n
  on conflict (tenant_id, service_id, starts_at) do nothing;

  -- Thu 11-12
  insert into chess_course_schedule_slots
    (tenant_id, service_id, starts_at, duration_minutes, timezone, capacity, cohort_label, cohort_recurrence_rule, status)
  select chess_tenant_id_text::uuid, 'co-mai-hung-chess-private-1-on-1',
    ('2026-05-07 11:00:00+07'::timestamptz) + (n * interval '7 days'),
    60, 'Asia/Ho_Chi_Minh', 1, 'Thu 11:00 ICT 1-1', 'FREQ=WEEKLY;BYDAY=TH', 'open'
  from generate_series(0, 3) n
  on conflict (tenant_id, service_id, starts_at) do nothing;

  -- Thu 20-22 (2h)
  insert into chess_course_schedule_slots
    (tenant_id, service_id, starts_at, duration_minutes, timezone, capacity, cohort_label, cohort_recurrence_rule, status)
  select chess_tenant_id_text::uuid, 'co-mai-hung-chess-private-1-on-1',
    ('2026-05-07 20:00:00+07'::timestamptz) + (n * interval '7 days'),
    120, 'Asia/Ho_Chi_Minh', 1, 'Thu 20:00 ICT 1-1 (2h deep)', 'FREQ=WEEKLY;BYDAY=TH', 'open'
  from generate_series(0, 3) n
  on conflict (tenant_id, service_id, starts_at) do nothing;

  -- Fri 11-12
  insert into chess_course_schedule_slots
    (tenant_id, service_id, starts_at, duration_minutes, timezone, capacity, cohort_label, cohort_recurrence_rule, status)
  select chess_tenant_id_text::uuid, 'co-mai-hung-chess-private-1-on-1',
    ('2026-05-08 11:00:00+07'::timestamptz) + (n * interval '7 days'),
    60, 'Asia/Ho_Chi_Minh', 1, 'Fri 11:00 ICT 1-1', 'FREQ=WEEKLY;BYDAY=FR', 'open'
  from generate_series(0, 3) n
  on conflict (tenant_id, service_id, starts_at) do nothing;

  -- Fri 16:30-17:30
  insert into chess_course_schedule_slots
    (tenant_id, service_id, starts_at, duration_minutes, timezone, capacity, cohort_label, cohort_recurrence_rule, status)
  select chess_tenant_id_text::uuid, 'co-mai-hung-chess-private-1-on-1',
    ('2026-05-08 16:30:00+07'::timestamptz) + (n * interval '7 days'),
    60, 'Asia/Ho_Chi_Minh', 1, 'Fri 16:30 ICT 1-1', 'FREQ=WEEKLY;BYDAY=FR', 'open'
  from generate_series(0, 3) n
  on conflict (tenant_id, service_id, starts_at) do nothing;

  -- Sat 15-16
  insert into chess_course_schedule_slots
    (tenant_id, service_id, starts_at, duration_minutes, timezone, capacity, cohort_label, cohort_recurrence_rule, status)
  select chess_tenant_id_text::uuid, 'co-mai-hung-chess-private-1-on-1',
    ('2026-05-09 15:00:00+07'::timestamptz) + (n * interval '7 days'),
    60, 'Asia/Ho_Chi_Minh', 1, 'Sat 15:00 ICT 1-1', 'FREQ=WEEKLY;BYDAY=SA', 'open'
  from generate_series(0, 3) n
  on conflict (tenant_id, service_id, starts_at) do nothing;

  raise notice 'migration 045 — chess class slot grid 2026-05 applied';
end $$;

commit;

-- ===========================================================================
-- Verification queries (run manually after applying):
--
-- 1) New service rows visible + published
-- select service_id, name, amount_aud, publish_state from service_merchant_profiles
-- where service_id like 'co-mai-hung-chess-superkid%' or service_id like 'co-mai-hung-chess-advanced%'
--   or service_id = 'co-mai-hung-chess-private-1-on-1' order by service_id;
--
-- 2) Slot count per new service (expect: superkid=8, advanced=8, private 1-1=40)
-- select service_id, count(*) as slot_count from chess_course_schedule_slots
-- where service_id in ('co-mai-hung-chess-superkid-group-tue-fri','co-mai-hung-chess-advanced-group-wed-sun','co-mai-hung-chess-private-1-on-1')
--   and starts_at >= '2026-05-04' group by service_id order by service_id;
-- ===========================================================================
