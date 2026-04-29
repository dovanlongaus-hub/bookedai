-- 045_fix_zoho_host_start_urls.sql
--
-- Repairs Zoho Meeting URLs that landed in chess_course_schedule_slots
-- and service_time_slots as the HOST start URL — only the host can use
-- those, so customers receiving them in welcome emails saw "you are not
-- the host" / 404 from Zoho.
--
-- Zoho returns:
--   meetinglink = https://meeting.zoho.com.au/meeting/meeting-start
--                  ?key=1428156531&x-meeting-org=7006570952
-- but the attendee landing page is:
--   https://meeting.zoho.com.au/meeting/{key}
-- which auto-redirects through the Zoho join lobby for both host and
-- attendees.
--
-- This migration transforms any persisted URL matching the host-start
-- pattern into the attendee landing form. Idempotent — re-running is a
-- no-op once the rows are normalised.
--
-- Going forward, calls_scheduling.create_zoho_meeting_for_booking +
-- create_zoho_calendar_event run the same transformation before
-- persisting, so new bookings can't repeat this regression.
--
-- Created 2026-04-29 during wave-17e Zoho URL audit.

BEGIN;

-- chess_course_schedule_slots
UPDATE chess_course_schedule_slots
SET zoho_meeting_url = regexp_replace(
      zoho_meeting_url,
      '^(https?://[^/]+)/meeting/meeting-start\?(?:.*&)?key=([0-9A-Za-z-]+).*$',
      '\1/meeting/\2'
    ),
    updated_at = now()
WHERE zoho_meeting_url ~ '/meeting/meeting-start\?.*key=';

-- service_time_slots (AI Mentor)
UPDATE service_time_slots
SET zoho_meeting_url = regexp_replace(
      zoho_meeting_url,
      '^(https?://[^/]+)/meeting/meeting-start\?(?:.*&)?key=([0-9A-Za-z-]+).*$',
      '\1/meeting/\2'
    ),
    updated_at = now()
WHERE zoho_meeting_url ~ '/meeting/meeting-start\?.*key=';

-- booking_intents may also carry a Zoho meeting link in some legacy paths.
-- Discover dynamically so the migration is safe whether the column exists
-- or not — different deploys have different versions of the schema.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'booking_intents' AND column_name = 'zoho_meeting_url'
  ) THEN
    EXECUTE $sql$
      UPDATE booking_intents
      SET zoho_meeting_url = regexp_replace(
            zoho_meeting_url,
            '^(https?://[^/]+)/meeting/meeting-start\?(?:.*&)?key=([0-9A-Za-z-]+).*$',
            '\1/meeting/\2'
          )
      WHERE zoho_meeting_url ~ '/meeting/meeting-start\?.*key='
    $sql$;
  END IF;
END $$;

COMMIT;
