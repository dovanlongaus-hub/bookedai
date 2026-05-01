-- 050_aimentor_programs_seed.sql
--
-- Republish the canonical 10-program AI Mentor catalog into
-- ``service_merchant_profiles`` so the new public catalog endpoint
-- ``GET /api/v1/aimentor/programs`` has a stable, idempotent seed to
-- read from. Mirrors what ``AIMentorBookedAIApp`` currently hardcodes
-- in TSX so the chat picker and the API contract stay in lockstep.
--
-- Programs (5 private 1-on-1 + 5 small-group cohort):
--   1. ai-mentor-private-first-ai-app-60         (featured top 3)
--   2. ai-mentor-private-executes-for-you-5h     (featured top 3)
--   3. ai-mentor-private-real-product-10h        (featured top 3)
--   4. ai-mentor-private-project-based-builder
--   5. ai-mentor-private-ongoing-ops-support
--   6. ai-mentor-group-first-ai-app-60
--   7. ai-mentor-group-executes-for-you-5h
--   8. ai-mentor-group-real-product-10h
--   9. ai-mentor-group-project-based-builder
--   10. ai-mentor-group-ongoing-ops-support
--
-- Idempotency:
--   * ``ON CONFLICT (service_id) DO UPDATE`` so re-running the migration
--     refreshes the catalog without duplicating rows.
--   * Wrapped in a DO block that no-ops when the ``ai-mentor-doer``
--     tenant has not been seeded yet (e.g. fresh DB, migrations applied
--     out of order). The new public API simply returns ``programs: []``
--     in that state.
--   * The ``metadata`` column is JSONB and was added by migration 035; we
--     stash ``duration_minutes`` + ``sort_order`` there so the API can
--     order featured programs first then by curated rank.
--
-- Schema notes:
--   * ``service_merchant_profiles.tenant_id`` is varchar(64) — we cast
--     the resolved tenant UUID to text on insert.
--   * ``featured`` and ``is_active`` are smallint (0/1), not booleans.
--   * ``publish_state`` is varchar(32) — ``'published'`` opts a row into
--     the public catalog query.
--
-- Created 2026-04-30 for the AI Mentor lifecycle phase 1 work.

BEGIN;

DO $$
DECLARE
  v_tenant_id UUID;
BEGIN
  SELECT id INTO v_tenant_id FROM tenants WHERE slug = 'ai-mentor-doer' LIMIT 1;
  IF v_tenant_id IS NULL THEN
    RAISE NOTICE 'Skipping AI Mentor program seed because tenant ai-mentor-doer does not exist.';
    RETURN;
  END IF;

  INSERT INTO service_merchant_profiles (
    service_id,
    business_name,
    tenant_id,
    name,
    category,
    summary,
    amount_aud,
    currency_code,
    display_price,
    duration_minutes,
    booking_url,
    image_url,
    tags_json,
    metadata,
    featured,
    is_active,
    publish_state
  ) VALUES
    (
      'ai-mentor-private-first-ai-app-60',
      'AI Mentor Doer',
      v_tenant_id::text,
      'Your first AI app — built in 60 minutes',
      'AI Programming Mentorship',
      'One focused session on Zoho Meeting. Walk away with a working AI prototype you can demo today. Built on your real workflow, not a toy example.',
      140, 'AUD',
      'AUD $140 / session  •  was $180  •  Founding Cohort -25%',
      60,
      'https://aimentor.bookedai.au/?assistant=open',
      '/aimentor/programs/ai-mentor-private-first-ai-app-60.png',
      '["1-on-1","beginner","real-prototype","private"]'::jsonb,
      jsonb_build_object('duration_minutes', 60, 'sort_order', 1, 'tier', 'private'),
      1, 1, 'published'
    ),
    (
      'ai-mentor-private-executes-for-you-5h',
      'AI Mentor Doer',
      v_tenant_id::text,
      'AI that runs your work — 5 hours of automation',
      'AI Programming Mentorship',
      '5 hours focused on automating real work in your stack — email triage, ops, content, customer support. Saves 5–10 hours a week for most students.',
      700, 'AUD',
      'AUD $700 / 5h  •  was $930  •  Founding Cohort -25%',
      300,
      'https://aimentor.bookedai.au/?assistant=open',
      '/aimentor/programs/ai-mentor-private-executes-for-you-5h.png',
      '["automation","hands-on","saves-hours","private"]'::jsonb,
      jsonb_build_object('duration_minutes', 300, 'sort_order', 2, 'tier', 'private'),
      1, 1, 'published'
    ),
    (
      'ai-mentor-private-real-product-10h',
      'AI Mentor Doer',
      v_tenant_id::text,
      'Turn your AI into a paying product — 10 hours',
      'AI Programming Mentorship',
      '10 hours focused on packaging your AI into a monetisable product — pricing, Stripe checkout, onboarding, and the ops to keep it running.',
      1400, 'AUD',
      'AUD $1,400 / 10h  •  was $1,860  •  Founding Cohort -25%',
      600,
      'https://aimentor.bookedai.au/?assistant=open',
      '/aimentor/programs/ai-mentor-private-real-product-10h.png',
      '["product-launch","stripe","ops","private"]'::jsonb,
      jsonb_build_object('duration_minutes', 600, 'sort_order', 3, 'tier', 'private'),
      1, 1, 'published'
    ),
    (
      'ai-mentor-private-project-based-builder',
      'AI Mentor Doer',
      v_tenant_id::text,
      'Project-based mentorship — built around your roadmap',
      'AI Programming Mentorship',
      'Custom package shaped around the build you already have in flight. Mentor joins as a senior IC — sprint reviews, code reviews, ship dates.',
      NULL, 'AUD',
      'Custom pricing (AUD)  •  Founding Cohort priority intake',
      NULL,
      'https://aimentor.bookedai.au/?assistant=open',
      '/aimentor/programs/ai-mentor-private-project-based-builder.png',
      '["custom","senior-ic","sprint","private"]'::jsonb,
      jsonb_build_object('sort_order', 4, 'tier', 'private'),
      0, 1, 'published'
    ),
    (
      'ai-mentor-private-ongoing-ops-support',
      'AI Mentor Doer',
      v_tenant_id::text,
      'Ongoing mentor + ops retainer — keep shipping',
      'AI Programming Mentorship',
      'Continuous mentor + ops support after your AI product launches. Monthly check-ins, on-demand pairing, ops escalation. Keep momentum.',
      NULL, 'AUD',
      'Pricing on request (AUD)  •  Founding Cohort priority slot',
      NULL,
      'https://aimentor.bookedai.au/?assistant=open',
      '/aimentor/programs/ai-mentor-private-ongoing-ops-support.png',
      '["retainer","ops","monthly","private"]'::jsonb,
      jsonb_build_object('sort_order', 5, 'tier', 'private'),
      0, 1, 'published'
    ),
    (
      'ai-mentor-group-first-ai-app-60',
      'AI Mentor Doer',
      v_tenant_id::text,
      'Group — Your first AI app in 60 minutes',
      'AI Programming Mentorship',
      'Same fast-start session, scoped for a small group of peers. Cheaper per person, same outcome. Live on Zoho Meeting.',
      60, 'AUD',
      'AUD $60 / hour / person  •  was $80  •  Founding Cohort -25%  •  min 5 students',
      60,
      'https://aimentor.bookedai.au/?assistant=open',
      '/aimentor/programs/ai-mentor-group-first-ai-app-60.png',
      '["group","cohort","beginner","min-5"]'::jsonb,
      jsonb_build_object('duration_minutes', 60, 'sort_order', 6, 'tier', 'group'),
      0, 1, 'published'
    ),
    (
      'ai-mentor-group-executes-for-you-5h',
      'AI Mentor Doer',
      v_tenant_id::text,
      'Group — AI that runs your work',
      'AI Programming Mentorship',
      '5-hour group cohort to automate real work across the team. Each member ships their own automation. Live on Zoho Meeting.',
      290, 'AUD',
      'AUD $290 / 5h / person  •  was $390  •  Founding Cohort -25%  •  min 5 students',
      300,
      'https://aimentor.bookedai.au/?assistant=open',
      '/aimentor/programs/ai-mentor-group-executes-for-you-5h.png',
      '["group","cohort","automation","min-5"]'::jsonb,
      jsonb_build_object('duration_minutes', 300, 'sort_order', 7, 'tier', 'group'),
      0, 1, 'published'
    ),
    (
      'ai-mentor-group-real-product-10h',
      'AI Mentor Doer',
      v_tenant_id::text,
      'Group — Turn your AI into a paying product',
      'AI Programming Mentorship',
      '10-hour cohort focused on shipping a monetised AI product. Peer feedback + senior mentor. Live on Zoho Meeting.',
      580, 'AUD',
      'AUD $580 / 10h / person  •  was $780  •  Founding Cohort -25%  •  min 5 students',
      600,
      'https://aimentor.bookedai.au/?assistant=open',
      '/aimentor/programs/ai-mentor-group-real-product-10h.png',
      '["group","cohort","product","min-5"]'::jsonb,
      jsonb_build_object('duration_minutes', 600, 'sort_order', 8, 'tier', 'group'),
      0, 1, 'published'
    ),
    (
      'ai-mentor-group-project-based-builder',
      'AI Mentor Doer',
      v_tenant_id::text,
      'Group — Project-based AI builder cohort',
      'AI Programming Mentorship',
      'Group package shaped around a shared project the cohort ships together. Live on Zoho Meeting, peer review, senior mentor.',
      NULL, 'AUD',
      'Custom pricing (AUD)  •  min 5 students  •  Founding Cohort priority',
      NULL,
      'https://aimentor.bookedai.au/?assistant=open',
      '/aimentor/programs/ai-mentor-group-project-based-builder.png',
      '["group","custom","project","min-5"]'::jsonb,
      jsonb_build_object('sort_order', 9, 'tier', 'group'),
      0, 1, 'published'
    ),
    (
      'ai-mentor-group-ongoing-ops-support',
      'AI Mentor Doer',
      v_tenant_id::text,
      'Group — Ongoing mentor & ops retainer',
      'AI Programming Mentorship',
      'Continuous group mentor + ops support after your team ships. Monthly Zoho Meeting cohort review + on-demand pairing.',
      NULL, 'AUD',
      'Pricing on request (AUD)  •  min 5 students  •  Founding Cohort priority',
      NULL,
      'https://aimentor.bookedai.au/?assistant=open',
      '/aimentor/programs/ai-mentor-group-ongoing-ops-support.png',
      '["group","retainer","ops","min-5"]'::jsonb,
      jsonb_build_object('sort_order', 10, 'tier', 'group'),
      0, 1, 'published'
    )
  ON CONFLICT (service_id) DO UPDATE SET
    business_name = EXCLUDED.business_name,
    tenant_id = EXCLUDED.tenant_id,
    name = EXCLUDED.name,
    category = EXCLUDED.category,
    summary = EXCLUDED.summary,
    amount_aud = EXCLUDED.amount_aud,
    currency_code = EXCLUDED.currency_code,
    display_price = EXCLUDED.display_price,
    duration_minutes = EXCLUDED.duration_minutes,
    booking_url = EXCLUDED.booking_url,
    image_url = EXCLUDED.image_url,
    tags_json = EXCLUDED.tags_json,
    metadata = COALESCE(service_merchant_profiles.metadata, '{}'::jsonb) || EXCLUDED.metadata,
    featured = EXCLUDED.featured,
    is_active = EXCLUDED.is_active,
    publish_state = EXCLUDED.publish_state,
    updated_at = NOW();
END $$;

COMMIT;
