-- 037_aimentor_slot_reservation_lifecycle.sql
--
-- AI Mentor reservation lifecycle:
--   The new `POST /api/v1/aimentor/slots/{slot_id}/reserve` endpoint holds
--   a seat + creates Zoho artefacts, but until now the slot row didn't
--   capture *who* reserved it or whether the session has run. The tenant
--   admin "Reservations" panel in the AdminPage needs:
--     * learner contact identity (name + email + phone) so mentor knows
--       who to follow up with
--     * a booking_reference column so the slot is the canonical record
--       (no need to round-trip via booking_intents.metadata_json)
--     * lifecycle timestamps + a free-text notes field so mentor can mark
--       a session "completed" / "cancelled" with context
--
-- Backwards-compatible: every column is nullable, indexes are conditional.
-- Existing slots seeded by migration 036 have no learner identity and
-- the reservations panel filters on `reserved_at IS NOT NULL`.

ALTER TABLE service_time_slots
    ADD COLUMN IF NOT EXISTS reserved_by_email TEXT,
    ADD COLUMN IF NOT EXISTS reserved_by_name TEXT,
    ADD COLUMN IF NOT EXISTS reserved_by_phone TEXT,
    ADD COLUMN IF NOT EXISTS reserved_by_locale TEXT,
    ADD COLUMN IF NOT EXISTS booking_reference TEXT,
    ADD COLUMN IF NOT EXISTS reserved_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS mentor_notes TEXT;

-- Reservations panel hot path: list a tenant's reserved slots ordered by
-- start time, partitioned by status. The partial index keeps it cheap
-- by skipping the 6-week-old empty grid that migration 036 seeded.
CREATE INDEX IF NOT EXISTS idx_service_time_slots_reservations
    ON service_time_slots(tenant_id, slot_start_at DESC)
    WHERE reserved_at IS NOT NULL;

-- Booking-reference lookup (welcome email composer + ops queries).
CREATE UNIQUE INDEX IF NOT EXISTS idx_service_time_slots_booking_reference
    ON service_time_slots(booking_reference)
    WHERE booking_reference IS NOT NULL;
