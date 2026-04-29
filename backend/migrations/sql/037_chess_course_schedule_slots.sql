-- BookedAI Phase 19+ (Chess Online Schedule Slots)
-- Migration 037: introduce per-course bookable timeslots so chess.bookedai.au
-- can publish multiple cohorts/sessions per service_merchant_profile and link
-- each booking to a specific Zoho Calendar event + Zoho Meeting URL.
-- Created 2026-04-28.
--
-- Idempotent: safe to run multiple times. The seed INSERTs use
-- ``ON CONFLICT (tenant_id, service_id, starts_at) DO NOTHING`` so re-running
-- this migration converges to the same state without duplicating slots.
--
-- Schema:
--   chess_course_schedule_slots  -- one row per published cohort instance
--     id                       UUID PK
--     tenant_id                UUID -- references tenants.id
--     service_id               TEXT -- references service_merchant_profiles.service_id
--     starts_at                TIMESTAMPTZ -- absolute event start
--     duration_minutes         INTEGER     -- session length
--     timezone                 TEXT        -- IANA tz, default Asia/Ho_Chi_Minh
--     capacity                 INTEGER     -- max enrolments
--     enrolled_count           INTEGER     -- how many bookings already linked
--     cohort_label             TEXT        -- e.g. "Mon/Wed/Fri evening"
--     cohort_recurrence_rule   TEXT        -- RRULE for repeating slot
--     status                   TEXT        -- open | full | cancelled | completed
--     zoho_event_id            TEXT        -- Zoho Calendar event id
--     zoho_meeting_url         TEXT        -- shared meeting URL (group cohort reuses)
--     zoho_calendar_event_url  TEXT        -- Zoho viewEventURL
--     metadata                 JSONB       -- extension surface
--     created_at / updated_at  TIMESTAMPTZ
--
-- Seed (Asia/Ho_Chi_Minh = UTC+7) covers Mon 2026-05-04 through Sun 2026-05-31.
--   Beginner Group (co-mai-hung-chess-online-group-60):
--     Mon + Wed + Fri 18:00-19:00, capacity 8 each. (12 slots / 4 weeks)
--   Private GM Coaching (co-mai-hung-chess-online-private-60):
--     Tue 19:00 + Thu 19:00 + Sat 09:00 + Sat 10:30, capacity 1 each. (16 / 4 weeks)
--   Tournament Prep (co-mai-hung-chess-online-private-90):
--     Sat 14:00-15:30 + Sun 09:00-10:30, capacity 2 each. (8 / 4 weeks)
--   Group 90 (co-mai-hung-chess-online-group-90):
--     Sat 15:30-17:00, capacity 6. (4 / 4 weeks)
--   Elite Online Plus (co-mai-hung-chess-elite-online-plus-60):
--     Tue 20:00 + Thu 20:00 + Sun 19:00, capacity 1 each. (12 / 4 weeks)
--
-- Total seeded slots: 52 across 5 services.

begin;

create table if not exists chess_course_schedule_slots (
    id uuid primary key default gen_random_uuid(),
    tenant_id uuid not null,
    service_id text not null,
    starts_at timestamptz not null,
    duration_minutes integer not null,
    timezone text not null default 'Asia/Ho_Chi_Minh',
    capacity integer not null default 1,
    enrolled_count integer not null default 0,
    cohort_label text,
    cohort_recurrence_rule text,
    status text not null default 'open',
    zoho_event_id text,
    zoho_meeting_url text,
    zoho_calendar_event_url text,
    metadata jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create unique index if not exists ux_chess_slots_tenant_service_starts
  on chess_course_schedule_slots (tenant_id, service_id, starts_at);

create index if not exists idx_chess_slots_tenant_service_starts
  on chess_course_schedule_slots (tenant_id, service_id, starts_at);

create index if not exists idx_chess_slots_status_starts
  on chess_course_schedule_slots (status, starts_at);

-- Seed slot data for the chess tenant. Wrapped in a DO block so we can resolve
-- the tenant UUID from the slug and skip seeding cleanly when the tenant row
-- has not yet been provisioned (CI / fresh local DB).
do $$
declare
  chess_tenant_id_uuid uuid;
  -- The 4 weeks we seed: Mon 2026-05-04 through Sun 2026-05-31.
  seed_week_starts date[] := array[
    date '2026-05-04',
    date '2026-05-11',
    date '2026-05-18',
    date '2026-05-25'
  ];
  week_start date;
begin
  select id into chess_tenant_id_uuid
  from tenants
  where slug = 'co-mai-hung-chess-class'
  limit 1;

  if chess_tenant_id_uuid is null then
    raise notice 'Skipping chess slot seed: tenant slug co-mai-hung-chess-class not found.';
    return;
  end if;

  foreach week_start in array seed_week_starts loop
    -- Beginner Group 60 — Mon/Wed/Fri 18:00 capacity 8.
    insert into chess_course_schedule_slots (
      tenant_id, service_id, starts_at, duration_minutes, timezone,
      capacity, cohort_label, cohort_recurrence_rule, status, metadata
    )
    values
      (chess_tenant_id_uuid, 'co-mai-hung-chess-online-group-60',
       ((week_start + 0) || ' 18:00:00')::timestamp at time zone 'Asia/Ho_Chi_Minh',
       60, 'Asia/Ho_Chi_Minh', 8,
       'Mon/Wed/Fri evening cohort (18:00 ICT)',
       'FREQ=WEEKLY;BYDAY=MO,WE,FR',
       'open',
       jsonb_build_object('seed_batch', '037_chess_course_schedule_slots', 'tier', 1)),
      (chess_tenant_id_uuid, 'co-mai-hung-chess-online-group-60',
       ((week_start + 2) || ' 18:00:00')::timestamp at time zone 'Asia/Ho_Chi_Minh',
       60, 'Asia/Ho_Chi_Minh', 8,
       'Mon/Wed/Fri evening cohort (18:00 ICT)',
       'FREQ=WEEKLY;BYDAY=MO,WE,FR',
       'open',
       jsonb_build_object('seed_batch', '037_chess_course_schedule_slots', 'tier', 1)),
      (chess_tenant_id_uuid, 'co-mai-hung-chess-online-group-60',
       ((week_start + 4) || ' 18:00:00')::timestamp at time zone 'Asia/Ho_Chi_Minh',
       60, 'Asia/Ho_Chi_Minh', 8,
       'Mon/Wed/Fri evening cohort (18:00 ICT)',
       'FREQ=WEEKLY;BYDAY=MO,WE,FR',
       'open',
       jsonb_build_object('seed_batch', '037_chess_course_schedule_slots', 'tier', 1))
    on conflict (tenant_id, service_id, starts_at) do nothing;

    -- Private GM Coaching 60 — Tue 19:00 + Thu 19:00 + Sat 09:00 + Sat 10:30, capacity 1.
    insert into chess_course_schedule_slots (
      tenant_id, service_id, starts_at, duration_minutes, timezone,
      capacity, cohort_label, cohort_recurrence_rule, status, metadata
    )
    values
      (chess_tenant_id_uuid, 'co-mai-hung-chess-online-private-60',
       ((week_start + 1) || ' 19:00:00')::timestamp at time zone 'Asia/Ho_Chi_Minh',
       60, 'Asia/Ho_Chi_Minh', 1,
       'Private 1-on-1 — Tue evening',
       'FREQ=WEEKLY;BYDAY=TU',
       'open',
       jsonb_build_object('seed_batch', '037_chess_course_schedule_slots', 'tier', 2)),
      (chess_tenant_id_uuid, 'co-mai-hung-chess-online-private-60',
       ((week_start + 3) || ' 19:00:00')::timestamp at time zone 'Asia/Ho_Chi_Minh',
       60, 'Asia/Ho_Chi_Minh', 1,
       'Private 1-on-1 — Thu evening',
       'FREQ=WEEKLY;BYDAY=TH',
       'open',
       jsonb_build_object('seed_batch', '037_chess_course_schedule_slots', 'tier', 2)),
      (chess_tenant_id_uuid, 'co-mai-hung-chess-online-private-60',
       ((week_start + 5) || ' 09:00:00')::timestamp at time zone 'Asia/Ho_Chi_Minh',
       60, 'Asia/Ho_Chi_Minh', 1,
       'Private 1-on-1 — Sat morning A',
       'FREQ=WEEKLY;BYDAY=SA',
       'open',
       jsonb_build_object('seed_batch', '037_chess_course_schedule_slots', 'tier', 2)),
      (chess_tenant_id_uuid, 'co-mai-hung-chess-online-private-60',
       ((week_start + 5) || ' 10:30:00')::timestamp at time zone 'Asia/Ho_Chi_Minh',
       60, 'Asia/Ho_Chi_Minh', 1,
       'Private 1-on-1 — Sat morning B',
       'FREQ=WEEKLY;BYDAY=SA',
       'open',
       jsonb_build_object('seed_batch', '037_chess_course_schedule_slots', 'tier', 2))
    on conflict (tenant_id, service_id, starts_at) do nothing;

    -- Tournament Prep 90 — Sat 14:00 + Sun 09:00, capacity 2 (1-on-1 or pairs).
    insert into chess_course_schedule_slots (
      tenant_id, service_id, starts_at, duration_minutes, timezone,
      capacity, cohort_label, cohort_recurrence_rule, status, metadata
    )
    values
      (chess_tenant_id_uuid, 'co-mai-hung-chess-online-private-90',
       ((week_start + 5) || ' 14:00:00')::timestamp at time zone 'Asia/Ho_Chi_Minh',
       90, 'Asia/Ho_Chi_Minh', 2,
       'Tournament prep — Sat afternoon',
       'FREQ=WEEKLY;BYDAY=SA',
       'open',
       jsonb_build_object('seed_batch', '037_chess_course_schedule_slots', 'tier', 3)),
      (chess_tenant_id_uuid, 'co-mai-hung-chess-online-private-90',
       ((week_start + 6) || ' 09:00:00')::timestamp at time zone 'Asia/Ho_Chi_Minh',
       90, 'Asia/Ho_Chi_Minh', 2,
       'Tournament prep — Sun morning',
       'FREQ=WEEKLY;BYDAY=SU',
       'open',
       jsonb_build_object('seed_batch', '037_chess_course_schedule_slots', 'tier', 3))
    on conflict (tenant_id, service_id, starts_at) do nothing;

    -- Group 90 — Sat 15:30, capacity 6.
    insert into chess_course_schedule_slots (
      tenant_id, service_id, starts_at, duration_minutes, timezone,
      capacity, cohort_label, cohort_recurrence_rule, status, metadata
    )
    values
      (chess_tenant_id_uuid, 'co-mai-hung-chess-online-group-90',
       ((week_start + 5) || ' 15:30:00')::timestamp at time zone 'Asia/Ho_Chi_Minh',
       90, 'Asia/Ho_Chi_Minh', 6,
       'Elite group cohort — Sat afternoon',
       'FREQ=WEEKLY;BYDAY=SA',
       'open',
       jsonb_build_object('seed_batch', '037_chess_course_schedule_slots', 'tier', 4))
    on conflict (tenant_id, service_id, starts_at) do nothing;

    -- Elite Online Plus 60 — Tue 20:00 + Thu 20:00 + Sun 19:00, capacity 1.
    insert into chess_course_schedule_slots (
      tenant_id, service_id, starts_at, duration_minutes, timezone,
      capacity, cohort_label, cohort_recurrence_rule, status, metadata
    )
    values
      (chess_tenant_id_uuid, 'co-mai-hung-chess-elite-online-plus-60',
       ((week_start + 1) || ' 20:00:00')::timestamp at time zone 'Asia/Ho_Chi_Minh',
       60, 'Asia/Ho_Chi_Minh', 1,
       'Elite Plus — Tue late evening',
       'FREQ=WEEKLY;BYDAY=TU',
       'open',
       jsonb_build_object('seed_batch', '037_chess_course_schedule_slots', 'tier', 4)),
      (chess_tenant_id_uuid, 'co-mai-hung-chess-elite-online-plus-60',
       ((week_start + 3) || ' 20:00:00')::timestamp at time zone 'Asia/Ho_Chi_Minh',
       60, 'Asia/Ho_Chi_Minh', 1,
       'Elite Plus — Thu late evening',
       'FREQ=WEEKLY;BYDAY=TH',
       'open',
       jsonb_build_object('seed_batch', '037_chess_course_schedule_slots', 'tier', 4)),
      (chess_tenant_id_uuid, 'co-mai-hung-chess-elite-online-plus-60',
       ((week_start + 6) || ' 19:00:00')::timestamp at time zone 'Asia/Ho_Chi_Minh',
       60, 'Asia/Ho_Chi_Minh', 1,
       'Elite Plus — Sun evening',
       'FREQ=WEEKLY;BYDAY=SU',
       'open',
       jsonb_build_object('seed_batch', '037_chess_course_schedule_slots', 'tier', 4))
    on conflict (tenant_id, service_id, starts_at) do nothing;
  end loop;
end $$;

commit;

-- =============================================================================
-- Verification queries (run manually after `psql -f`):
-- =============================================================================
--
-- 1) Per-service slot counts. Expected (4-week seed window):
--      co-mai-hung-chess-online-group-60        | 12
--      co-mai-hung-chess-online-private-60      | 16
--      co-mai-hung-chess-online-private-90      |  8
--      co-mai-hung-chess-online-group-90        |  4
--      co-mai-hung-chess-elite-online-plus-60   | 12
--      total                                    | 52
--
-- select s.service_id, count(*) as slots
-- from chess_course_schedule_slots s
-- join tenants t on t.id = s.tenant_id
-- where t.slug = 'co-mai-hung-chess-class'
-- group by s.service_id
-- order by s.service_id;
--
-- 2) Capacity vs enrolled sanity:
--
-- select status, count(*), sum(capacity) as cap, sum(enrolled_count) as taken
-- from chess_course_schedule_slots s
-- join tenants t on t.id = s.tenant_id
-- where t.slug = 'co-mai-hung-chess-class'
-- group by status;
-- Grant CRUD on chess_course_schedule_slots to the runtime application role.
-- Idempotent: re-running has no effect when grants already exist.
do $$ begin
  if exists (select 1 from pg_roles where rolname = 'bookedai_app') then
    execute 'grant select, insert, update, delete on table chess_course_schedule_slots to bookedai_app';
  end if;
end $$;
