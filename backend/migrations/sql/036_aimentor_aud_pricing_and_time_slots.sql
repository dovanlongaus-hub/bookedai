-- 036_aimentor_aud_pricing_and_time_slots.sql
--
-- AI Mentor pricing + scheduling refresh:
--   1. Convert all 6 priced programs to **AUD** (rounded to nice numbers
--      using ~1.55 USD/AUD anchor) and update display_price to anchor +
--      Founding Cohort discount in AUD. Both EN and VI render in AUD now —
--      the platform is AU-based and `amount_aud` was already the canonical
--      Stripe-charge currency, the previous "USD $" labels were a
--      misalignment.
--   2. Create the `service_time_slots` table — every program is 100% online
--      with multiple slot options. Tenant ops + students pick from the
--      same DB-backed time grid; Zoho Meeting URL + Zoho calendar event
--      ID are stored per-slot so confirmation emails embed the real
--      meeting link.
--   3. Seed 6 slots × 6 priced programs = 36 slots over the next 4 weeks
--      in Australia/Sydney evenings + weekend mornings.
--
-- Read-side: the new `/api/v1/aimentor/services/{service_id}/slots`
-- endpoint reads from this table; existing `/api/v1/matching/search`
-- already exposes display_price so the AUD copy renders without code
-- changes.

-- =========================================================================
-- 1. Service catalogue: convert to AUD-rounded prices
-- =========================================================================

-- Private 1-on-1 — First AI App :: was AUD $180 -> Founding Cohort AUD $140
UPDATE service_merchant_profiles SET
  amount_aud = 140,
  currency_code = 'AUD',
  display_price = 'AUD $140 / session  •  was $180  •  Founding Cohort -25%',
  updated_at = now()
WHERE service_id = 'ai-mentor-private-first-ai-app-60';

-- Private 1-on-1 — Executes 5h :: was AUD $930 -> Founding Cohort AUD $700
UPDATE service_merchant_profiles SET
  amount_aud = 700,
  currency_code = 'AUD',
  display_price = 'AUD $700 / 5h  •  was $930  •  Founding Cohort -25%',
  updated_at = now()
WHERE service_id = 'ai-mentor-private-executes-for-you-5h';

-- Private 1-on-1 — Real Product 10h :: was AUD $1,860 -> Founding Cohort AUD $1,400
UPDATE service_merchant_profiles SET
  amount_aud = 1400,
  currency_code = 'AUD',
  display_price = 'AUD $1,400 / 10h  •  was $1,860  •  Founding Cohort -25%',
  updated_at = now()
WHERE service_id = 'ai-mentor-private-real-product-10h';

-- Private 1-on-1 — Project-based + Ongoing :: keep custom labels, currency AUD
UPDATE service_merchant_profiles SET
  currency_code = 'AUD',
  display_price = 'Custom pricing (AUD)  •  Founding Cohort priority intake',
  updated_at = now()
WHERE service_id = 'ai-mentor-private-project-based-builder';

UPDATE service_merchant_profiles SET
  currency_code = 'AUD',
  display_price = 'Pricing on request (AUD)  •  Founding Cohort priority slot',
  updated_at = now()
WHERE service_id = 'ai-mentor-private-ongoing-ops-support';

-- Group — First AI App :: was AUD $80 -> Founding Cohort AUD $60 / hour / person
UPDATE service_merchant_profiles SET
  amount_aud = 60,
  currency_code = 'AUD',
  display_price = 'AUD $60 / hour / person  •  was $80  •  Founding Cohort -25%  •  min 5 students',
  updated_at = now()
WHERE service_id = 'ai-mentor-group-first-ai-app-60';

-- Group — Executes 5h :: was AUD $390 -> Founding Cohort AUD $290
UPDATE service_merchant_profiles SET
  amount_aud = 290,
  currency_code = 'AUD',
  display_price = 'AUD $290 / 5h / person  •  was $390  •  Founding Cohort -25%  •  min 5 students',
  updated_at = now()
WHERE service_id = 'ai-mentor-group-executes-for-you-5h';

-- Group — Real Product 10h :: was AUD $780 -> Founding Cohort AUD $580
UPDATE service_merchant_profiles SET
  amount_aud = 580,
  currency_code = 'AUD',
  display_price = 'AUD $580 / 10h / person  •  was $780  •  Founding Cohort -25%  •  min 5 students',
  updated_at = now()
WHERE service_id = 'ai-mentor-group-real-product-10h';

-- Group — Project-based + Ongoing :: keep custom labels, currency AUD
UPDATE service_merchant_profiles SET
  currency_code = 'AUD',
  display_price = 'Custom pricing (AUD)  •  min 5 students  •  Founding Cohort priority',
  updated_at = now()
WHERE service_id = 'ai-mentor-group-project-based-builder';

UPDATE service_merchant_profiles SET
  currency_code = 'AUD',
  display_price = 'Pricing on request (AUD)  •  min 5 students  •  Founding Cohort priority',
  updated_at = now()
WHERE service_id = 'ai-mentor-group-ongoing-ops-support';

-- Default tenant currency to AUD in settings JSON
UPDATE tenant_settings
SET settings_json = settings_json || jsonb_build_object('default_currency_code', 'AUD')
WHERE tenant_id = (SELECT id FROM tenants WHERE slug = 'ai-mentor-doer');

-- =========================================================================
-- 2. service_time_slots table
-- =========================================================================
CREATE TABLE IF NOT EXISTS service_time_slots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    service_id TEXT NOT NULL,
    slot_start_at TIMESTAMPTZ NOT NULL,
    slot_end_at TIMESTAMPTZ NOT NULL,
    timezone TEXT NOT NULL DEFAULT 'Australia/Sydney',
    capacity INT NOT NULL DEFAULT 1,
    booked_count INT NOT NULL DEFAULT 0,
    zoho_meeting_url TEXT,
    zoho_calendar_event_id TEXT,
    label TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_service_time_slots_open
  ON service_time_slots(tenant_id, service_id, slot_start_at)
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_service_time_slots_zoho_event
  ON service_time_slots(zoho_calendar_event_id)
  WHERE zoho_calendar_event_id IS NOT NULL;

-- =========================================================================
-- 3. Seed 6 slots per priced program over the next 4 weeks
--    Sydney evenings (19:00 AEST) + weekend mornings (10:00 AEST)
--    `now()` baseline so the seed stays evergreen on re-applies — slots in
--    the past simply get filtered out by the open-slot index lookup.
--
--    NOTE: zoho_meeting_url is left NULL — the Zoho integration will
--    populate it when a slot is booked. The welcome email composer
--    falls back to the template URL if NULL (see settings.meeting_provider
--    .video_link_template in migration 035).
-- =========================================================================

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
  v_durations INT[] := ARRAY[60, 300, 600, 60, 300, 600];  -- minutes per service
  v_capacities INT[] := ARRAY[1, 1, 1, 8, 8, 8];           -- 1 for private, 8 for group
  v_offsets INT[] := ARRAY[2, 4, 6, 9, 11, 14];            -- days from today
  v_hours INT[] := ARRAY[19, 19, 10, 19, 10, 19];          -- AEST hour (19=evening, 10=morning)
  i INT;
  j INT;
BEGIN
  SELECT id INTO v_tenant_id FROM tenants WHERE slug = 'ai-mentor-doer';
  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'ai-mentor-doer tenant not found — run earlier seed migrations first';
  END IF;

  -- Skip if seed already exists (idempotency on re-runs)
  IF EXISTS (
    SELECT 1 FROM service_time_slots
    WHERE tenant_id = v_tenant_id
      AND service_id = v_service_ids[1]
  ) THEN
    RAISE NOTICE 'service_time_slots already seeded for ai-mentor-doer; skipping';
    RETURN;
  END IF;

  FOR i IN 1..array_length(v_service_ids, 1) LOOP
    FOR j IN 1..array_length(v_offsets, 1) LOOP
      INSERT INTO service_time_slots (
        tenant_id,
        service_id,
        slot_start_at,
        slot_end_at,
        timezone,
        capacity,
        booked_count,
        label,
        is_active
      )
      VALUES (
        v_tenant_id,
        v_service_ids[i],
        (date_trunc('day', now() AT TIME ZONE 'Australia/Sydney') + (v_offsets[j] || ' days')::interval + (v_hours[j] || ' hours')::interval) AT TIME ZONE 'Australia/Sydney',
        (date_trunc('day', now() AT TIME ZONE 'Australia/Sydney') + (v_offsets[j] || ' days')::interval + (v_hours[j] || ' hours')::interval + (v_durations[i] || ' minutes')::interval) AT TIME ZONE 'Australia/Sydney',
        'Australia/Sydney',
        v_capacities[i],
        0,
        CASE
          WHEN v_hours[j] = 10 THEN 'Weekend morning · Sydney 10:00 AEST'
          ELSE 'Weekday evening · Sydney 19:00 AEST'
        END,
        true
      );
    END LOOP;
  END LOOP;

  RAISE NOTICE 'Seeded % slots for ai-mentor-doer', array_length(v_service_ids, 1) * array_length(v_offsets, 1);
END $$;
