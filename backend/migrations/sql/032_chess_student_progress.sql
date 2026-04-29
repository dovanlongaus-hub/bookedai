-- 032_chess_student_progress.sql
--
-- Chess.bookedai.au tenant-side progress journal (Wave 5-E):
-- creates the `chess_student_progress` table that GM Mai Hung's tenant
-- workspace writes into via `PATCH /api/v1/tenants/me/students/{contact_id}/progress`
-- and the parent / student account portal reads via `/api/v1/students/me`.
--
-- The table is tenant-scoped (`tenant_id` FK with cascade) so deleting a
-- tenant cleans up its progress notes. We deliberately leave `contact_id`
-- as a plain UUID (no FK) because the contacts table on this branch may be
-- recreated as part of CRM resync flows; the index below keeps lookups fast.
--
-- The index is a covering compound (tenant_id, contact_id, session_date desc)
-- which serves the two hot paths:
--   * tenant_chess_students_list: distinct on (contact_id) ordered by session_date desc
--   * student_me bookings/progress: per-contact most recent rows

CREATE TABLE IF NOT EXISTS chess_student_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    contact_id UUID NOT NULL,
    session_date DATE NOT NULL,
    level TEXT,
    attendance INTEGER,
    notes TEXT,
    next_focus TEXT,
    created_by_tenant_user_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chess_student_progress_tenant_contact
  ON chess_student_progress(tenant_id, contact_id, session_date DESC);

-- Grant CRUD on chess_student_progress to the runtime application role.
-- Idempotent: re-running has no effect when grants already exist.
do $$ begin
  if exists (select 1 from pg_roles where rolname = 'bookedai_app') then
    execute 'grant select, insert, update, delete on table chess_student_progress to bookedai_app';
  end if;
end $$;
