-- 043_aimentor_payment_settings.sql
--
-- Seeds the ai-mentor-doer tenant with payment surface metadata so the
-- AIMentorChat success card can render a "Pay by Credit" + "Pay by QR"
-- payment panel after a slot reservation succeeds.
--
-- Shape merged into tenant_settings.settings_json:
--
--   {
--     "payment": {
--       "currency": "AUD",
--       "stripe_checkout_url": "https://buy.stripe.com/...",
--       "bank_account": {
--         "account_name": "BookedAI Pty Ltd — AI Mentor",
--         "bsb": "923-100",
--         "account_number": "00012345",
--         "bank_name": "Wise Australia",
--         "swift": "TRWIAUS1XXX",
--         "reference_prefix": "AIM-"
--       },
--       "qr_payload_template":
--         "BPAY|BSB:{bsb}|ACC:{account_number}|REF:{booking_reference}|AMT:{amount_aud}",
--       "instructions_en":
--         "Use your booking reference as the payment description so we can match it.",
--       "instructions_vi":
--         "Vui lòng nhập mã booking ở mục nội dung chuyển khoản để hệ thống đối soát."
--     }
--   }
--
-- Idempotent: uses jsonb_set so re-running merges into any keys already
-- present rather than overwriting unrelated tenant_settings JSON.

BEGIN;

DO $$
DECLARE
  v_tenant_id UUID;
  v_payment JSONB := jsonb_build_object(
    'currency', 'AUD',
    'stripe_checkout_url', 'https://buy.stripe.com/aimentor-private-checkout',
    'bank_account', jsonb_build_object(
      'account_name',     'BookedAI Pty Ltd — AI Mentor',
      'bsb',              '923-100',
      'account_number',   '00012345',
      'bank_name',        'Wise Australia',
      'swift',            'TRWIAUS1XXX',
      'reference_prefix', 'AIM-'
    ),
    'qr_payload_template',
      'PAY|AUD|{amount_aud}|BSB:{bsb}|ACC:{account_number}|REF:{booking_reference}',
    'instructions_en',
      'Use your booking reference (AIM-XXXXX) as the payment description so we can match it within 24h.',
    'instructions_vi',
      'Vui lòng nhập mã booking (AIM-XXXXX) ở mục nội dung chuyển khoản để hệ thống đối soát trong 24 giờ.'
  );
BEGIN
  SELECT id INTO v_tenant_id FROM tenants WHERE slug = 'ai-mentor-doer';
  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'ai-mentor-doer tenant not found';
  END IF;

  -- Upsert the tenant_settings row, then merge `payment` into settings_json.
  INSERT INTO tenant_settings (tenant_id, settings_json, updated_at)
  VALUES (v_tenant_id, jsonb_build_object('payment', v_payment), now())
  ON CONFLICT (tenant_id) DO UPDATE
  SET
    settings_json = COALESCE(tenant_settings.settings_json, '{}'::jsonb)
                    || jsonb_build_object('payment', v_payment),
    updated_at    = now();

  RAISE NOTICE 'aimentor payment settings seeded';
END $$;

COMMIT;
