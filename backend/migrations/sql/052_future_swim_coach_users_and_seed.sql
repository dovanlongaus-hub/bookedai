-- BookedAI Phase 19+ (Future Swim coach ops — Phase 3.2B)
-- Migration 052: futureswim_coach_users table + one demo coach seed.
--
-- Coaches authenticate against the /api/v1/futureswim/coach/* endpoints
-- using a Bearer login_token (Phase 3.2B placeholder; Phase 3.3 will swap
-- in a magic-email-code login analogous to the parent portal). Each coach
-- is scoped to a list of centre codes via assigned_centre_codes JSONB —
-- the special value "*" grants write access to all centres.
--
-- Idempotent: table + indexes use create-if-not-exists, the seed uses
-- on-conflict-do-update so re-applies converge on the same row state.

begin;

-- =============================================================================
-- 1. futureswim_coach_users
-- =============================================================================

create table if not exists futureswim_coach_users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  full_name text,
  coach_initials varchar(4),
  phone text,
  login_token text,
  login_token_expires_at timestamptz,
  assigned_centre_codes jsonb not null default '[]'::jsonb,
  google_sub text unique,
  is_active integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_login_at timestamptz
);

create index if not exists idx_futureswim_coach_users_email
  on futureswim_coach_users(email);

create index if not exists idx_futureswim_coach_users_login_token
  on futureswim_coach_users(login_token)
  where login_token is not null;

-- =============================================================================
-- Grant CRUD to bookedai_app (idempotent, mirrors migration 051)
-- =============================================================================

do $$ begin
  if exists (select 1 from pg_roles where rolname = 'bookedai_app') then
    execute 'grant select, insert, update, delete on table futureswim_coach_users to bookedai_app';
  end if;
end $$;

-- =============================================================================
-- Seed: one demo coach assigned to the Caringbah centre
-- =============================================================================

insert into futureswim_coach_users (
  email, full_name, coach_initials, phone,
  login_token, login_token_expires_at,
  assigned_centre_codes, is_active
)
values (
  'demo-coach@futureswim.bookedai.au',
  'Sam Coach (Demo)',
  'SC',
  '+61400000111',
  'futureswim-demo-coach-key',
  now() + interval '365 days',
  jsonb_build_array('caringbah'),
  1
)
on conflict (email) do update
  set full_name = excluded.full_name,
      coach_initials = excluded.coach_initials,
      phone = excluded.phone,
      login_token = excluded.login_token,
      login_token_expires_at = excluded.login_token_expires_at,
      assigned_centre_codes = excluded.assigned_centre_codes,
      is_active = excluded.is_active,
      updated_at = now();

commit;
