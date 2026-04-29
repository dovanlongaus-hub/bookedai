-- 042_aimentor_full_slot_calendar.sql
--
-- Expands the AI Mentor slot inventory from 36 fixed slots over 2 weeks
-- to a full 12-week calendar of bookable slots so users can pick ANY
-- weekday + time (not just the 6 hand-seeded slots that often filled up
-- on the first reservation, triggering "Couldn't lock that slot" errors
-- in the chat).
--
-- New inventory (per service, idempotent re-runs):
--   * Mon–Fri only (skip weekends; mentor is offshore on weekends)
--   * 4 slot starts per day in Sydney time:
--       09:00, 12:00, 15:00, 18:00 AEST
--     covering APAC morning, lunch, afternoon, and evening windows
--   * 12 weeks ahead from the migration run date
--   * Each slot is exactly 60 minutes (uniform calendar block — longer
--     programs like 5h / 10h are delivered as multiple 60-min sessions
--     scheduled by the mentor after the initial booking)
--   * Capacity:
--       private 1-on-1 services → 1 (no double-booking the mentor;
--                                   booked slots stay visible as
--                                   "Booked" so the calendar still
--                                   shows that 1-on-1 sessions exist)
--       group cohort services    → 8 (group slots stay bookable until
--                                   capacity is hit)
--
-- Total per service ≈ 5 days/week × 4 slots/day × 12 weeks = 240 slots.
-- Across 6 services that's ~1,440 future-bookable slots, replacing the
-- prior 36.
--
-- Idempotency: a slot is INSERTed only if no slot already exists at the
-- same (tenant_id, service_id, slot_start_at). Re-running this migration
-- is safe — it tops up missing slots without disturbing existing
-- reservations.
--
-- Created 2026-04-29 during wave-17b post-deploy fixes.

BEGIN;

DO $$
DECLARE
  v_tenant_id UUID;
  v_service_ids TEXT[] := ARRAY[
    'ai-mentor-private-first-ai-app-60',
    'ai-mentor-private-executes-for-you-5h',
    'ai-mentor-private-real-product-10h',
    'ai-mentor-group-first-ai-app-60',
    'ai-mentor-group-executes-for-you-5h',
    'ai-mentor-group-real-product-10h'
  ];
  -- All slots are 60-minute calendar blocks regardless of total program
  -- length. The mentor schedules follow-on sessions for 5h / 10h
  -- programs after the initial 60-min kickoff is reserved.
  v_slot_minutes INT := 60;
  v_capacities INT[] := ARRAY[1, 1, 1, 8, 8, 8];
  v_hours INT[] := ARRAY[9, 12, 15, 18];
  v_seeded INT := 0;
  v_service_idx INT;
  v_day_offset INT;
  v_hour_idx INT;
  v_slot_date DATE;
  v_slot_start TIMESTAMPTZ;
  v_slot_end TIMESTAMPTZ;
  v_label TEXT;
BEGIN
  SELECT id INTO v_tenant_id FROM tenants WHERE slug = 'ai-mentor-doer';
  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'ai-mentor-doer tenant not found';
  END IF;

  FOR v_service_idx IN 1..array_length(v_service_ids, 1) LOOP
    -- 12 weeks * 7 days = 84 days; we filter weekends
    FOR v_day_offset IN 1..84 LOOP
      v_slot_date := (date_trunc('day', now() AT TIME ZONE 'Australia/Sydney')::date)
                     + (v_day_offset || ' days')::interval;

      -- Skip Sat (6) and Sun (0)
      IF EXTRACT(DOW FROM v_slot_date) IN (0, 6) THEN
        CONTINUE;
      END IF;

      FOR v_hour_idx IN 1..array_length(v_hours, 1) LOOP
        v_slot_start := (v_slot_date::timestamp + (v_hours[v_hour_idx] || ' hours')::interval)
                        AT TIME ZONE 'Australia/Sydney';
        v_slot_end := v_slot_start + (v_slot_minutes || ' minutes')::interval;

        v_label := CASE v_hours[v_hour_idx]
          WHEN 9  THEN 'Sydney morning · 09:00 AEST'
          WHEN 12 THEN 'Sydney lunch · 12:00 AEST'
          WHEN 15 THEN 'Sydney afternoon · 15:00 AEST'
          ELSE        'Sydney evening · 18:00 AEST'
        END;

        -- Idempotent: only insert when this slot doesn't already exist.
        INSERT INTO service_time_slots (
          tenant_id, service_id, slot_start_at, slot_end_at,
          timezone, capacity, booked_count, label, is_active
        )
        SELECT
          v_tenant_id, v_service_ids[v_service_idx], v_slot_start, v_slot_end,
          'Australia/Sydney', v_capacities[v_service_idx], 0, v_label, true
        WHERE NOT EXISTS (
          SELECT 1 FROM service_time_slots
          WHERE tenant_id = v_tenant_id
            AND service_id = v_service_ids[v_service_idx]
            AND slot_start_at = v_slot_start
        );

        v_seeded := v_seeded + 1;
      END LOOP;
    END LOOP;
  END LOOP;

  RAISE NOTICE 'aimentor full-calendar seed visited % slot positions', v_seeded;
END $$;

COMMIT;
