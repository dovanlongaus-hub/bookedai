-- 031_chess_student_users.sql
--
-- Chess.bookedai.au student-portal seed (Wave 5-E):
-- creates the `chess_student_users` table that backs the parent / student
-- Google sign-in flow added to `/api/v1/students/google_auth` and
-- `/api/v1/students/me`.
--
-- Each row represents one Google identity (one google_sub). The booking
-- intent rows are joined back to this account by matching contacts.email
-- against chess_student_users.email so existing booking_intents do not need
-- a foreign key to be visible in the student account portal.
--
-- The unique google_sub guarantees the upsert in
-- `_upsert_chess_student_user` is idempotent: repeated logins update
-- last_login_at / display fields without ever creating a duplicate row.

CREATE TABLE IF NOT EXISTS chess_student_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    google_sub TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_login_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_chess_student_users_email
  ON chess_student_users(email);
