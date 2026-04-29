-- 034_ai_mentor_student_progress.sql
--
-- aimentor.bookedai.au tenant-side progress journal:
-- creates the `ai_mentor_student_progress` table that the AI Mentor tenant
-- workspace writes into via
-- `PATCH /api/v1/tenants/me/aimentor-students/{contact_id}/progress`
-- and the student account portal reads via
-- `/api/v1/aimentor/students/me`.
--
-- Mirrors `chess_student_progress` (see 032_chess_student_progress.sql).
--
-- The table is tenant-scoped (`tenant_id` FK with cascade) so deleting a
-- tenant cleans up its progress notes. We deliberately leave `contact_id`
-- as a plain UUID (no FK) because the contacts table on this branch may be
-- recreated as part of CRM resync flows; the index below keeps lookups fast.
--
-- The covering compound index (tenant_id, contact_id, session_date desc)
-- serves the two hot paths:
--   * tenant_aimentor_students_list: distinct on (contact_id) ordered by
--     session_date desc
--   * student_me bookings/progress: per-contact most recent rows

CREATE TABLE IF NOT EXISTS ai_mentor_student_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    contact_id UUID NOT NULL,
    session_date DATE NOT NULL,
    program_track TEXT,
    skill_level TEXT,
    attendance INTEGER,
    notes TEXT,
    next_focus TEXT,
    artifact_url TEXT,
    created_by_tenant_user_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_mentor_student_progress_tenant_contact
  ON ai_mentor_student_progress(tenant_id, contact_id, session_date DESC);
-- Grant CRUD on ai_mentor_student_progress to the runtime application role.
-- Idempotent: re-running has no effect when grants already exist.
do $$ begin
  if exists (select 1 from pg_roles where rolname = 'bookedai_app') then
    execute 'grant select, insert, update, delete on table ai_mentor_student_progress to bookedai_app';
  end if;
end $$;
