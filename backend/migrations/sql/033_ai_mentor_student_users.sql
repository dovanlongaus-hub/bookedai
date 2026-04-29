-- 033_ai_mentor_student_users.sql
--
-- aimentor.bookedai.au student-portal seed:
-- creates the `ai_mentor_student_users` table that backs the parent / student
-- Google sign-in flow added to `/api/v1/aimentor/students/google_auth` and
-- `/api/v1/aimentor/students/me`.
--
-- Mirrors `chess_student_users` (see 031_chess_student_users.sql) — kept as a
-- separate table per tenant identity so scope, retention, and progress notes
-- never leak across academies. Generalisation to a multi-tenant
-- `tenant_student_users` is a deliberate follow-up.
--
-- Each row represents one Google identity (one google_sub). Booking intents
-- are joined back to this account by matching contacts.email against
-- ai_mentor_student_users.email — existing booking_intents do not need a
-- foreign key to be visible in the student account portal.
--
-- The unique google_sub guarantees the upsert in
-- `_upsert_ai_mentor_student_user` is idempotent: repeated logins update
-- last_login_at / display fields without ever creating a duplicate row.

CREATE TABLE IF NOT EXISTS ai_mentor_student_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    google_sub TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    preferred_locale TEXT NOT NULL DEFAULT 'en',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_login_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_ai_mentor_student_users_email
  ON ai_mentor_student_users(email);
