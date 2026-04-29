-- 038_aimentor_zoho_meeting_id.sql
--
-- Adds ``zoho_meeting_id`` to ``service_time_slots`` so the cancel flow
-- can call Zoho's ``DELETE /api/v2/{user_id}/sessions/{meeting_id}``
-- endpoint (which takes the session key, not the join URL).
--
-- The orchestrator's ``provision_slot_artifacts`` already returns
-- ``meeting_id`` alongside ``meeting_url`` — migration 036/037 just
-- persisted the URL. This migration closes the gap so cancel can clean
-- up the live Zoho session, not only the calendar event.

ALTER TABLE service_time_slots
    ADD COLUMN IF NOT EXISTS zoho_meeting_id TEXT;
