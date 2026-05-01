-- BookedAI Phase 19+ (Future Swim parent portal — Phase 3.1)
-- Migration 051: parent + student + progress + evaluation tables for the
-- futureswim.bookedai.au parent portal, mirroring the chess pattern from
-- migrations 031/032 but with an explicit parent → many-students relationship
-- (a swim-school customer is the parent; lessons attach to the child).
--
-- Four tables (all idempotent + grant CRUD to bookedai_app):
--
--   1. futureswim_parent_users
--        One row per parent identity. The portal looks parents up by email
--        (Google sign-in flow comes later in Phase 3.2). The login_token
--        column is a one-shot magic-link key so the welcome email can deep-
--        link a parent into the portal without password entry.
--
--   2. futureswim_student_profiles
--        Each row is one child. parent_id FK chains to a parent row;
--        deleting the parent cascades to remove the children. centre_code
--        and current_level_code mirror the level/centre vocabulary from
--        migration 047 so the portal can render level chips consistently.
--
--   3. futureswim_student_progress
--        Per-lesson journal entry written by Future Swim instructors via
--        their tenant ops dashboard. Mirrors chess_student_progress: keyed
--        by (student_id, session_date desc) for the portal's "latest first"
--        timeline. attendance: 0 = absent, 1 = present, 2 = present-late;
--        focus_skill is a free-text "what we worked on" line; coach_initials
--        is the short signature on the deck card.
--
--   4. futureswim_teacher_evaluations
--        Per-period (typically end-of-month or end-of-cohort) summary the
--        coach prepares for parents: level_outcome ('progressed', 'hold',
--        'review_in_4_weeks'), strengths_md + areas_to_work_on_md (markdown
--        bullets), and a recommended next_step pointing at a level_code so
--        the portal can render a "ready for X" call-to-action.
--
-- Phase 3.1 also seeds one demo parent + two demo students so the portal
-- has something to render before real parents are imported. The demo
-- parent email "demo-parent@futureswim.bookedai.au" is reserved and
-- non-deliverable.

begin;

-- =============================================================================
-- 1. futureswim_parent_users
-- =============================================================================

create table if not exists futureswim_parent_users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  full_name text,
  phone text,
  centre_code text,
  preferred_locale text default 'en-AU',
  login_token text,
  login_token_expires_at timestamptz,
  google_sub text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_login_at timestamptz
);

create index if not exists idx_futureswim_parent_users_email
  on futureswim_parent_users(email);

create index if not exists idx_futureswim_parent_users_login_token
  on futureswim_parent_users(login_token)
  where login_token is not null;

-- =============================================================================
-- 2. futureswim_student_profiles
-- =============================================================================

create table if not exists futureswim_student_profiles (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid not null references futureswim_parent_users(id) on delete cascade,
  full_name text not null,
  date_of_birth date,
  centre_code text,
  current_level_code text,
  enrolled_since date,
  notes_for_coach text,
  is_active integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_futureswim_student_profiles_parent
  on futureswim_student_profiles(parent_id, is_active);

-- =============================================================================
-- 3. futureswim_student_progress
-- =============================================================================

create table if not exists futureswim_student_progress (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references futureswim_student_profiles(id) on delete cascade,
  session_date date not null,
  centre_code text,
  level_code text,
  attendance integer,
  focus_skill text,
  notes_md text,
  coach_initials text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_futureswim_student_progress_student_date
  on futureswim_student_progress(student_id, session_date desc);

-- =============================================================================
-- 4. futureswim_teacher_evaluations
-- =============================================================================

create table if not exists futureswim_teacher_evaluations (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references futureswim_student_profiles(id) on delete cascade,
  evaluated_at date not null,
  level_code text,
  level_outcome text,
  strengths_md text,
  areas_to_work_on_md text,
  next_step_level_code text,
  next_step_summary text,
  coach_initials text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_futureswim_teacher_evaluations_student_date
  on futureswim_teacher_evaluations(student_id, evaluated_at desc);

-- =============================================================================
-- Grant CRUD to bookedai_app (idempotent)
-- =============================================================================

do $$ begin
  if exists (select 1 from pg_roles where rolname = 'bookedai_app') then
    execute 'grant select, insert, update, delete on table futureswim_parent_users to bookedai_app';
    execute 'grant select, insert, update, delete on table futureswim_student_profiles to bookedai_app';
    execute 'grant select, insert, update, delete on table futureswim_student_progress to bookedai_app';
    execute 'grant select, insert, update, delete on table futureswim_teacher_evaluations to bookedai_app';
  end if;
end $$;

-- =============================================================================
-- Seed: one demo parent + two demo students + 6 progress rows + 2 evaluations
-- =============================================================================

with demo_parent as (
  insert into futureswim_parent_users (
    email, full_name, phone, centre_code, preferred_locale,
    login_token, login_token_expires_at
  )
  values (
    'demo-parent@futureswim.bookedai.au',
    'Sample Parent (Demo)',
    '+61400000000',
    'caringbah',
    'en-AU',
    'futureswim-demo-portal-key',
    now() + interval '365 days'
  )
  on conflict (email) do update
    set full_name = excluded.full_name,
        phone = excluded.phone,
        centre_code = excluded.centre_code,
        login_token = excluded.login_token,
        login_token_expires_at = excluded.login_token_expires_at,
        updated_at = now()
  returning id
),
demo_student_a as (
  insert into futureswim_student_profiles (
    parent_id, full_name, date_of_birth, centre_code,
    current_level_code, enrolled_since, notes_for_coach
  )
  select
    id, 'Aria (Demo Student)', '2022-04-15', 'caringbah',
    'learn-to-swim', '2026-02-01',
    'Loves jellyfish stickers; prefers Coach Sam if available.'
  from demo_parent
  on conflict do nothing
  returning id
),
demo_student_b as (
  insert into futureswim_student_profiles (
    parent_id, full_name, date_of_birth, centre_code,
    current_level_code, enrolled_since, notes_for_coach
  )
  select
    id, 'Leo (Demo Student)', '2018-09-22', 'caringbah',
    'stroke-correction', '2025-09-01',
    'Asthmatic; bring inhaler poolside. Strong on backstroke; needs work on freestyle breathing.'
  from demo_parent
  on conflict do nothing
  returning id
),
progress_a as (
  insert into futureswim_student_progress (
    student_id, session_date, centre_code, level_code,
    attendance, focus_skill, notes_md, coach_initials
  )
  select id, d.session_date, 'caringbah', 'learn-to-swim',
         d.attendance, d.focus_skill, d.notes_md, d.coach_initials
  from demo_student_a, (values
    ('2026-04-26'::date, 1, 'Front floats with kick', 'Held a 3-second front float unaided. Confident with face in.', 'SC'),
    ('2026-04-19'::date, 1, 'Submerging + bubbles', 'Blew bubbles for 4 seconds before lifting. Less hesitation than last week.', 'SC'),
    ('2026-04-12'::date, 1, 'Pool entry + holding rail', 'Confident jump-in and rail hold. Ready to introduce front floats next session.', 'EM')
  ) as d(session_date, attendance, focus_skill, notes_md, coach_initials)
  on conflict do nothing
  returning student_id
),
progress_b as (
  insert into futureswim_student_progress (
    student_id, session_date, centre_code, level_code,
    attendance, focus_skill, notes_md, coach_initials
  )
  select id, d.session_date, 'caringbah', 'stroke-correction',
         d.attendance, d.focus_skill, d.notes_md, d.coach_initials
  from demo_student_b, (values
    ('2026-04-28'::date, 1, 'Freestyle bilateral breathing', 'Got 4 strokes per breath on the third lap. Eyes still down — good progress.', 'JT'),
    ('2026-04-21'::date, 2, 'Tumble turns (intro)', 'Late arrival but caught the wall-touch drill. Tumble in shallow end coming next week.', 'JT'),
    ('2026-04-14'::date, 1, 'Backstroke arm recovery', 'Long thumb-up entries — much smoother. Ready to layer kicking pace next.', 'JT')
  ) as d(session_date, attendance, focus_skill, notes_md, coach_initials)
  on conflict do nothing
  returning student_id
),
eval_a as (
  insert into futureswim_teacher_evaluations (
    student_id, evaluated_at, level_code, level_outcome,
    strengths_md, areas_to_work_on_md,
    next_step_level_code, next_step_summary, coach_initials
  )
  select id, '2026-04-26'::date, 'learn-to-swim', 'progressed',
    E'- Confident pool entries (rail + jump-in)\n- Holds 3-sec front float unaided\n- Comfortable with face submersion',
    E'- Build to 5-sec float\n- Add kick while floating\n- Try first independent push-and-glide',
    'learn-to-swim', 'Continue Learn-to-Swim with focus on push-and-glide for 4 more weeks before discussing Stroke Correction readiness.',
    'SC'
  from demo_student_a
  on conflict do nothing
),
eval_b as (
  insert into futureswim_teacher_evaluations (
    student_id, evaluated_at, level_code, level_outcome,
    strengths_md, areas_to_work_on_md,
    next_step_level_code, next_step_summary, coach_initials
  )
  select id, '2026-04-28'::date, 'stroke-correction', 'progressed',
    E'- Strong long-axis backstroke recovery\n- Steady freestyle bilateral breathing emerging (4 SPB)\n- Excellent listening + asks great questions',
    E'- Tighten freestyle catch (high-elbow)\n- Build endurance to 4×50m freestyle without rest\n- Introduce tumble turns at full-pool depth',
    'pre-squad', 'Ready to trial Pre-Squad in 4–6 weeks once tumble turns are confident at full depth and 200m continuous freestyle is comfortable.',
    'JT'
  from demo_student_b
  on conflict do nothing
)
select 1;

commit;
