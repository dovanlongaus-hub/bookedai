-- 028_aimentor_partner_features.sql
--
-- AI Mentor partner-style subdomain (aimentor.bookedai.au) feature scope:
--   * Per-booking monthly reminder cadence on booking_intents.
--   * Dedicated booking_feedback ledger fed by /api/v1/booking/{ref}/feedback.
--
-- Both pieces are additive and idempotent so this migration can be replayed
-- safely against environments that already received earlier slices.

ALTER TABLE booking_intents
  ADD COLUMN IF NOT EXISTS reminder_cadence TEXT,
  ADD COLUMN IF NOT EXISTS reminder_next_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reminder_last_sent_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_booking_intents_reminder_due
  ON booking_intents (reminder_next_at)
  WHERE reminder_cadence IS NOT NULL AND reminder_next_at IS NOT NULL;

CREATE TABLE IF NOT EXISTS booking_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_reference TEXT NOT NULL,
  tenant_id UUID NOT NULL,
  rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  would_recommend BOOLEAN,
  channel TEXT,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_booking_feedback_tenant_submitted
  ON booking_feedback (tenant_id, submitted_at DESC);

CREATE INDEX IF NOT EXISTS idx_booking_feedback_booking_reference
  ON booking_feedback (booking_reference, submitted_at DESC);
