-- 044_aimentor_slots_uniform_60min.sql
--
-- Normalises every AI Mentor slot to a 60-minute calendar block so the
-- aimentor.bookedai.au booking surface has a uniform layout regardless
-- of which program the slot belongs to.
--
-- Why: prior seeds (036, 042) used the program's total duration for
-- slot_end_at — so a 5h or 10h program produced slots that visually
-- spanned half a day. The product decision is that calendar slots are
-- always 60-minute kickoff blocks; longer programs are delivered as
-- multiple sessions scheduled by the mentor after the first booking.
--
-- Idempotent: running this multiple times is safe — slot_end_at always
-- ends up at slot_start_at + 60 minutes.
--
-- Skips slots that have already been reserved (booked_count > 0) to
-- avoid changing the meeting end time on a live booking that the
-- learner has already received calendar invites for.
--
-- Created 2026-04-29 during wave-17b post-deploy fixes.

BEGIN;

UPDATE service_time_slots
SET slot_end_at = slot_start_at + interval '60 minutes',
    updated_at = now()
WHERE service_id LIKE 'ai-mentor-%'
  AND tenant_id = (SELECT id FROM tenants WHERE slug = 'ai-mentor-doer')
  AND slot_end_at <> slot_start_at + interval '60 minutes'
  AND COALESCE(booked_count, 0) = 0;

COMMIT;
