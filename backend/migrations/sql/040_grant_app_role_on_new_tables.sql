-- 040_grant_app_role_on_new_tables.sql
--
-- Grants the bookedai_app role read/write access on tables created
-- by migrations 031-037. Without this, the FastAPI backend (which
-- connects as bookedai_app, not supabase_admin) gets:
--
--   asyncpg.exceptions.InsufficientPrivilegeError: permission denied
--
-- on first read of service_time_slots / ai_mentor_* / chess_*. The
-- earlier migrations created tables but didn't grant; this catches
-- up. Idempotent — GRANT is no-op if already held.
--
-- Created 2026-04-29 during wave-16 deploy.

DO $$
DECLARE
  tbl text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'service_time_slots',
    'ai_mentor_student_users',
    'ai_mentor_student_progress',
    'chess_student_users',
    'chess_student_progress',
    'chess_course_schedule_slots'
  ]
  LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = tbl) THEN
      EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON %I TO bookedai_app', tbl);
    END IF;
  END LOOP;
END $$;

GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO bookedai_app;
