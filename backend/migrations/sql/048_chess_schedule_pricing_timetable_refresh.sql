-- 048_chess_schedule_pricing_timetable_refresh.sql
--
-- Refreshes chess.bookedai.au course pricing and timetable semantics per the
-- 2026-04-30 operator brief:
--   * Superkid Tue/Fri 17:30-18:30 — 2,800,000 VND / 8-lesson course
--   * Advanced Wed/Sun 20:00-21:30 — 4,000,000 VND / 8-lesson course
--   * Private 1-1 — 1,000,000 VND / 60 min, 1,600,000 VND / 120 min
--   * Existing private 1-1 teaching windows are busy/booked blocks, visible in
--     the timetable and not selectable by the public booking chat.

begin;

do $$
declare
  chess_tenant_id uuid;
begin
  select id into chess_tenant_id
  from tenants
  where slug = 'co-mai-hung-chess-class'
  limit 1;

  if chess_tenant_id is null then
    raise notice 'chess tenant not found; skipping migration 048';
    return;
  end if;

  update service_merchant_profiles
  set
    summary = 'Online Superkid group class for young learners. Tuesday + Friday 17:30-18:30 ICT, 60 minutes per lesson, 8 lessons per course. Course tuition: 2,800,000 VND. Small group coaching with WGM Mai Hưng via Lichess + Zoom + Zoho Meeting.',
    amount_aud = 170,
    display_price = '2,800,000 VND / course / 8 lessons',
    currency_code = 'VND',
    metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
      'tier', 'superkid',
      'display_price_aud', 170,
      'display_price_vnd_per_course', 2800000,
      'sessions_per_cohort', 8,
      'course_schedule_label', 'Tue + Fri 17:30-18:30 ICT',
      'price_label', '2,800,000 VND / 8 buổi',
      'duration_minutes', 60,
      'capacity_per_slot', 8,
      'pricing_unit', 'course',
      'localized', jsonb_build_object(
        'vi', jsonb_build_object(
          'summary', 'Lớp Superkid trực tuyến. Thứ 3 + Thứ 6, 17:30-18:30 ICT, 60 phút/buổi, khóa 8 buổi. Học phí 2,800,000 VND/khóa. Nhóm nhỏ cùng WGM Mai Hưng qua Lichess + Zoom + Zoho Meeting.'
        )
      )
    ),
    updated_at = now()
  where tenant_id = chess_tenant_id::text
    and service_id = 'co-mai-hung-chess-superkid-group-tue-fri';

  update service_merchant_profiles
  set
    summary = 'Online advanced group class. Wednesday + Sunday 20:00-21:30 ICT, 90 minutes per lesson, 8 lessons per course. Course tuition: 4,000,000 VND. Tournament-minded coaching with WGM Mai Hưng via Lichess + Zoom + Zoho Meeting.',
    amount_aud = 242,
    display_price = '4,000,000 VND / course / 8 lessons',
    currency_code = 'VND',
    metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
      'tier', 'advanced_group',
      'display_price_aud', 242,
      'display_price_vnd_per_course', 4000000,
      'sessions_per_cohort', 8,
      'course_schedule_label', 'Wed + Sun 20:00-21:30 ICT',
      'price_label', '4,000,000 VND / 8 buổi',
      'duration_minutes', 90,
      'capacity_per_slot', 8,
      'pricing_unit', 'course',
      'localized', jsonb_build_object(
        'vi', jsonb_build_object(
          'summary', 'Lớp nâng cao trực tuyến. Thứ 4 + Chủ Nhật, 20:00-21:30 ICT, 90 phút/buổi, khóa 8 buổi. Học phí 4,000,000 VND/khóa. Huấn luyện tư duy thi đấu cùng WGM Mai Hưng.'
        )
      )
    ),
    updated_at = now()
  where tenant_id = chess_tenant_id::text
    and service_id = 'co-mai-hung-chess-advanced-group-wed-sun';

  update service_merchant_profiles
  set
    summary = 'Private 1-1 chess coaching with WGM Mai Hưng. 60-minute lesson: 1,000,000 VND. 120-minute deep session: 1,600,000 VND. The timetable shows existing teaching blocks as unavailable; all other coach-confirmed windows can be requested through chat.',
    amount_aud = 60,
    display_price = '1,000,000 VND / 60 min; 1,600,000 VND / 120 min',
    currency_code = 'VND',
    metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
      'tier', 'private_1_1',
      'display_price_aud_60_min', 60,
      'display_price_aud_120_min', 97,
      'display_price_vnd_60_min', 1000000,
      'display_price_vnd_120_min', 1600000,
      'price_label', '1-1: 1,000,000 VND / 60 phút; 1,600,000 VND / 120 phút',
      'duration_minutes_default', 60,
      'pricing_unit', 'lesson_duration',
      'localized', jsonb_build_object(
        'vi', jsonb_build_object(
          'summary', 'Kèm riêng 1-1 cùng WGM Mai Hưng. Buổi 60 phút: 1,000,000 VND. Buổi 120 phút: 1,600,000 VND. Lịch chat hiển thị các khung đã có lớp là không khả dụng; khung còn lại có thể gửi yêu cầu đặt.'
        )
      )
    ),
    updated_at = now()
  where tenant_id = chess_tenant_id::text
    and service_id = 'co-mai-hung-chess-private-1-on-1';

  update chess_course_schedule_slots
  set
    metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
      'price_label', '2,800,000 VND / khóa / 8 buổi',
      'course_schedule_label', 'Thứ 3 + Thứ 6, 17:30-18:30',
      'schedule_kind', 'bookable_course',
      'availability_label', 'Đăng ký thêm'
    ),
    cohort_label = 'Superkid Tue/Fri 17:30-18:30',
    duration_minutes = 60,
    capacity = greatest(capacity, 8),
    status = case when status in ('cancelled', 'completed') then status else 'open' end,
    updated_at = now()
  where tenant_id = chess_tenant_id
    and service_id = 'co-mai-hung-chess-superkid-group-tue-fri';

  update chess_course_schedule_slots
  set
    metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
      'price_label', '4,000,000 VND / khóa / 8 buổi',
      'course_schedule_label', 'Thứ 4 + Chủ Nhật, 20:00-21:30',
      'schedule_kind', 'bookable_course',
      'availability_label', 'Đăng ký thêm'
    ),
    cohort_label = 'Advanced Wed/Sun 20:00-21:30',
    duration_minutes = 90,
    capacity = greatest(capacity, 8),
    status = case when status in ('cancelled', 'completed') then status else 'open' end,
    updated_at = now()
  where tenant_id = chess_tenant_id
    and service_id = 'co-mai-hung-chess-advanced-group-wed-sun';

  update chess_course_schedule_slots
  set
    status = 'full',
    enrolled_count = greatest(enrolled_count, capacity),
    metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
      'schedule_kind', 'busy_teaching',
      'availability_label', 'Đã booked',
      'course_schedule_label', 'Khung giờ 1-1 đã booked',
      'price_label', null
    ),
    cohort_label = coalesce(cohort_label, 'Đã booked'),
    updated_at = now()
  where tenant_id = chess_tenant_id
    and service_id = 'co-mai-hung-chess-private-1-on-1'
    and (
      (extract(isodow from starts_at at time zone timezone) in (1, 5) and to_char(starts_at at time zone timezone, 'HH24:MI') = '11:00' and duration_minutes = 60)
      or (extract(isodow from starts_at at time zone timezone) = 3 and to_char(starts_at at time zone timezone, 'HH24:MI') = '17:00' and duration_minutes = 60)
      or (extract(isodow from starts_at at time zone timezone) in (2, 4) and to_char(starts_at at time zone timezone, 'HH24:MI') = '20:00' and duration_minutes = 120)
      or (extract(isodow from starts_at at time zone timezone) = 5 and to_char(starts_at at time zone timezone, 'HH24:MI') = '16:30' and duration_minutes = 60)
      or (extract(isodow from starts_at at time zone timezone) = 6 and to_char(starts_at at time zone timezone, 'HH24:MI') = '15:00' and duration_minutes = 60)
    );

  raise notice 'migration 048 — chess schedule pricing and timetable refresh applied';
end $$;

commit;
