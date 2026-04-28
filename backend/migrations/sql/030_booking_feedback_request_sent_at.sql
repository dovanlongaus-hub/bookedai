-- 030_booking_feedback_request_sent_at.sql
--
-- Operational plumbing follow-up (Wave 5-D): adds the `feedback_request_sent_at`
-- column on booking_intents so the post-session feedback request worker can
-- flip the cursor once an email has been dispatched.
--
-- The 24h-after-session-end feedback prompt worker queries:
--   bookings WHERE session end (derived from requested_date + requested_time
--   + timezone) + interval '24 hours' < now()
--     AND feedback_request_sent_at IS NULL
--     AND status = 'confirmed'
--     AND tenant has post_booking_feedback feature enabled
--
-- The new index supports the `feedback_request_sent_at IS NULL` selection so
-- we don't full-scan the table every cron tick once volume grows.

ALTER TABLE booking_intents
  ADD COLUMN IF NOT EXISTS feedback_request_sent_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_booking_intents_feedback_request_pending
  ON booking_intents (status, requested_date, requested_time)
  WHERE feedback_request_sent_at IS NULL;
