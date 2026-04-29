-- 035_aimentor_copy_refresh_promo_2026_q2.sql
--
-- AI Mentor Q2 2026 launch package:
--   1. Refresh tenant settings JSON with:
--      - Founding Cohort promotion (25% off, deadline 2026-05-31, 50 seats)
--      - Zoho Meeting + Google Calendar provider config (online-only delivery)
--      - Rich tenant_profile block (mentor bio, credentials, what's-included
--        in EN/VI) for the public profile section.
--   2. Refresh the 10 ai-mentor-doer service_merchant_profiles rows with
--      sharper outcome-driven copy + Founding Cohort discount applied to
--      `amount_aud` (Stripe charge amount) and "(was $X)" anchor in
--      `display_price`.
--
-- Read-side: existing /api/v1/matching/search + tenant config endpoints
-- already surface display_price + summary + tags so no backend code changes
-- are required for the new copy + promo to render. The tenant_profile block
-- is read by the new aimentor.bookedai.au profile section via the partner
-- config endpoint.
--
-- Idempotent: uses jsonb || merge semantics so re-running the migration
-- does not duplicate keys; service updates are scoped by service_id so they
-- only ever touch the seeded rows.

-- =========================================================================
-- 1. Tenant settings JSON merge: promotions + meeting_provider + tenant_profile
-- =========================================================================
UPDATE tenant_settings
SET settings_json = settings_json || jsonb_build_object(
  'promotions', jsonb_build_object(
    'founding_cohort_2026_q2', jsonb_build_object(
      'active', true,
      'code', 'FOUNDING-COHORT-2026',
      'label_en', 'Founding Cohort — 25% off',
      'label_vi', 'Cohort Khởi Tạo — giảm 25%',
      'tagline_en', 'First 50 students. 25% off all listed programs. Until 31 May 2026.',
      'tagline_vi', '50 học viên đầu tiên. Giảm 25% mọi gói niêm yết. Tới hết 31/05/2026.',
      'discount_percent', 25,
      'deadline_iso', '2026-05-31T23:59:59+10:00',
      'max_seats', 50,
      'reserve_within_hours_for_bonus', 48,
      'bonus_label_en', 'Reserve in 48h → free 30-min strategy call before your first session',
      'bonus_label_vi', 'Giữ chỗ trong 48 giờ → tặng buổi chiến lược 30 phút trước buổi học đầu',
      'risk_reversal_en', '7-day money-back guarantee. If your first session is not a fit, we refund.',
      'risk_reversal_vi', 'Hoàn tiền 7 ngày. Nếu buổi đầu không phù hợp, chúng tôi hoàn lại.'
    )
  ),
  'meeting_provider', jsonb_build_object(
    'delivery_mode', 'online_only',
    'video_provider', 'zoho_meeting',
    'video_label_en', 'Zoho Meeting — HD video, screen share, auto-recording',
    'video_label_vi', 'Zoho Meeting — HD, share màn hình, tự động ghi hình',
    'video_link_template', 'https://meet.zoho.com/aimentor/{booking_reference}',
    'calendar_invite_provider', 'google_calendar',
    'calendar_label_en', 'Google Calendar invite + .ics file in your booking email',
    'calendar_label_vi', 'Google Calendar invite + file .ics trong email xác nhận',
    'calendar_event_template', 'AI Mentor 1-on-1 · {service_name} · {booking_reference}',
    'fallback_channels', jsonb_build_array('telegram_video', 'whatsapp_video'),
    'host_timezone', 'Australia/Sydney',
    'session_buffer_minutes', 10
  ),
  'tenant_profile', jsonb_build_object(
    'hero_eyebrow_en', '1-on-1 AI Programming Mentorship — 100% online',
    'hero_eyebrow_vi', 'Mentor 1-1 lập trình AI — 100% online',
    'hero_promise_en', 'Build a working AI product with a senior mentor — Zoho Meeting + Google Calendar from day one.',
    'hero_promise_vi', 'Xây sản phẩm AI thật cùng mentor cấp cao — Zoho Meeting + Google Calendar ngay từ buổi đầu.',
    'mentor_name', 'Long Do Van',
    'mentor_title_en', 'Founder · Senior AI Engineer · BookedAI',
    'mentor_title_vi', 'Founder · Senior AI Engineer · BookedAI',
    'mentor_bio_en', 'Shipping AI products since 2018. Built BookedAI from scratch — full-stack, agent systems, RAG pipelines, Stripe + Zoho integrations, multi-tenant SaaS. 1,200+ hours mentored across solo founders, product teams, and weekend builders. Lead mentor for every AI Mentor 1-on-1 Pro session.',
    'mentor_bio_vi', 'Đã ship sản phẩm AI từ 2018. Xây BookedAI từ đầu — full-stack, hệ thống agent, RAG, Stripe + Zoho, multi-tenant SaaS. Hơn 1.200 giờ mentor cho solo founder, product team và weekend builder. Trực tiếp dẫn dắt mọi buổi AI Mentor 1-1 Pro.',
    'mentor_credentials_en', jsonb_build_array(
      'Founder · BookedAI (live multi-tenant SaaS in production)',
      '7+ years shipping production AI products',
      '1,200+ hours of 1-on-1 mentoring across founders + engineers',
      'Bilingual mentor — sessions in English or Vietnamese',
      'Stripe-secured payment, GDPR-aware data handling'
    ),
    'mentor_credentials_vi', jsonb_build_array(
      'Founder · BookedAI (multi-tenant SaaS đang chạy production)',
      '7+ năm ship sản phẩm AI production',
      '1.200+ giờ mentor 1-1 cho founder và engineer',
      'Mentor song ngữ — buổi học bằng EN hoặc VI',
      'Thanh toán Stripe an toàn, xử lý dữ liệu chuẩn GDPR'
    ),
    'whats_included_en', jsonb_build_array(
      '1-on-1 sessions on Zoho Meeting (HD video, screen share, auto-recording you keep)',
      'Google Calendar invite + .ics attachment in your booking email',
      'Working code + a 5-min demo at the end of every session',
      'Mentor follow-up on Telegram or WhatsApp — your pick of channel',
      'Monthly progress check-in email (auto-localised EN or VI)',
      'Per-session feedback link, mentor reviews before next session',
      'Student portal at aimentor.bookedai.au/account — Google login',
      'Stripe receipt + 7-day money-back guarantee'
    ),
    'whats_included_vi', jsonb_build_array(
      'Buổi 1-1 trên Zoho Meeting (HD, share màn hình, tự ghi hình bạn giữ)',
      'Google Calendar invite + file .ics đính kèm email xác nhận',
      'Code chạy được + 5 phút demo cuối mỗi buổi',
      'Mentor follow-up qua Telegram hoặc WhatsApp — bạn chọn kênh',
      'Email check-in tiến độ hàng tháng (tự động EN hoặc VI)',
      'Link feedback sau mỗi buổi, mentor review trước buổi tiếp theo',
      'Portal học viên tại aimentor.bookedai.au/account — đăng nhập Google',
      'Hoá đơn Stripe + bảo đảm hoàn tiền 7 ngày'
    ),
    'why_choose_en', jsonb_build_array(
      'Senior practitioner, not a course-watcher. You are coding with someone who ships.',
      '100% online — Zoho Meeting works on any laptop, no install gymnastics.',
      'Bilingual EN / VI — switch language any time, even mid-program.',
      'Outcome-first — every session ends with something demoable.',
      'Risk-free — 7-day money-back, no questions, no friction.'
    ),
    'why_choose_vi', jsonb_build_array(
      'Senior practitioner, không phải người xem khoá học. Bạn code cùng người đang ship.',
      '100% online — Zoho Meeting chạy trên mọi laptop, không cần cài đặt phức tạp.',
      'Song ngữ EN / VI — đổi ngôn ngữ bất cứ lúc nào, kể cả giữa khoá.',
      'Outcome-first — mỗi buổi kết thúc với một sản phẩm có thể demo.',
      'Không rủi ro — hoàn tiền 7 ngày, không hỏi, không phiền hà.'
    ),
    'cta_primary_en', 'Reserve my Founding Cohort seat →',
    'cta_primary_vi', 'Giữ chỗ Cohort Khởi Tạo →',
    'cta_secondary_en', 'Talk to mentor first',
    'cta_secondary_vi', 'Trao đổi với mentor trước'
  )
)
WHERE tenant_id = (SELECT id FROM tenants WHERE slug = 'ai-mentor-doer');

-- =========================================================================
-- 2. Service catalogue refresh — outcome-driven summaries + Founding Cohort
--    25% discount applied to amount_aud (Stripe charge) + display_price
--    showing the "(was $X)" anchor.
-- =========================================================================

-- 2a. Private 1-on-1 — First AI App in 60 Minutes :: $120 → $90
UPDATE service_merchant_profiles
SET
  name = 'Private 1-on-1 — Your First AI App in 60 Minutes',
  summary = 'One focused session on Zoho Meeting. Walk away with a working AI prototype you can demo today. Built on your real workflow, not a toy example. Beginner-friendly — no coding background required.',
  amount_aud = 90,
  display_price = 'USD $90 / session  •  was $120  •  Founding Cohort -25%',
  tags_json = '["ai", "mentor", "private", "1-on-1", "first-ai-app", "60-min", "online", "zoho-meeting", "founding-cohort", "beginner-friendly"]'::jsonb,
  featured = true,
  updated_at = now()
WHERE service_id = 'ai-mentor-private-first-ai-app-60';

-- 2b. Private 1-on-1 — Executes 5h :: $600 → $450 (FEATURED in landing)
UPDATE service_merchant_profiles
SET
  name = 'Private 1-on-1 — AI That Runs Your Work (5 hours)',
  summary = '5 hours focused on automating real work in your stack — email triage, ops, content, customer support, sales follow-up. Pick the workflow that costs you the most time. Most students save 5–10 hours a week after this program.',
  amount_aud = 450,
  display_price = 'USD $450 / 5h  •  was $600  •  Founding Cohort -25%',
  tags_json = '["ai", "mentor", "private", "1-on-1", "automation", "5-hours", "online", "zoho-meeting", "founding-cohort", "saves-time"]'::jsonb,
  featured = true,
  updated_at = now()
WHERE service_id = 'ai-mentor-private-executes-for-you-5h';

-- 2c. Private 1-on-1 — Real Product 10h :: $1200 → $900
UPDATE service_merchant_profiles
SET
  name = 'Private 1-on-1 — Turn Your AI Into a Paying Product (10 hours)',
  summary = '10 hours focused on packaging your AI prototype into a monetisable product — pricing, onboarding, Stripe checkout, and the ops to keep it running. Past students have launched side-products earning $400+/mo within 90 days.',
  amount_aud = 900,
  display_price = 'USD $900 / 10h  •  was $1,200  •  Founding Cohort -25%',
  tags_json = '["ai", "mentor", "private", "1-on-1", "product-launch", "10-hours", "online", "zoho-meeting", "founding-cohort", "monetisation"]'::jsonb,
  updated_at = now()
WHERE service_id = 'ai-mentor-private-real-product-10h';

-- 2d. Private 1-on-1 — Project-based :: Custom (Founding Cohort priority)
UPDATE service_merchant_profiles
SET
  name = 'Private 1-on-1 — Project-Based Mentorship',
  summary = 'Custom package shaped around the build you already have in flight. Mentor joins as a senior individual contributor, not a coach — sprint-by-sprint, code reviews, architecture decisions, ship dates. Founding Cohort: priority intake.',
  display_price = 'Custom pricing  •  Founding Cohort priority intake',
  tags_json = '["ai", "mentor", "private", "1-on-1", "custom-scope", "senior-ic", "online", "zoho-meeting", "founding-cohort-priority"]'::jsonb,
  updated_at = now()
WHERE service_id = 'ai-mentor-private-project-based-builder';

-- 2e. Private 1-on-1 — Ongoing retainer :: On request
UPDATE service_merchant_profiles
SET
  name = 'Private 1-on-1 — Ongoing Mentor & Product Ops Retainer',
  summary = 'Continuous mentor + ops support after your AI product launches. Keep shipping, keep iterating, keep momentum. Monthly check-ins, on-demand pairing, ops escalation. Founding Cohort: priority slot.',
  display_price = 'Pricing on request  •  Founding Cohort priority slot',
  tags_json = '["ai", "mentor", "private", "1-on-1", "retainer", "ops-support", "online", "zoho-meeting", "founding-cohort-priority"]'::jsonb,
  updated_at = now()
WHERE service_id = 'ai-mentor-private-ongoing-ops-support';

-- 2f. Group — First AI App :: $50/hr → $37.50/hr
UPDATE service_merchant_profiles
SET
  name = 'Group — Your First AI App in 60 Minutes',
  summary = 'Same fast-start session, scoped for a small group of peers. Cheaper per person, same outcome — a working AI prototype you can demo. Live on Zoho Meeting. Minimum 5 students per cohort.',
  amount_aud = 37.5,
  display_price = 'USD $37.50 / hour / person  •  was $50  •  Founding Cohort -25%  •  min 5 students',
  tags_json = '["ai", "mentor", "group", "cohort", "first-ai-app", "60-min", "online", "zoho-meeting", "founding-cohort", "min-5"]'::jsonb,
  updated_at = now()
WHERE service_id = 'ai-mentor-group-first-ai-app-60';

-- 2g. Group — Executes 5h :: $250 → $187.50
UPDATE service_merchant_profiles
SET
  name = 'Group — AI That Runs Your Work (5 hours cohort)',
  summary = '5-hour group cohort to automate real work across the team. Each member ships their own automation. Live on Zoho Meeting. Minimum 5 students per cohort.',
  amount_aud = 187.5,
  display_price = 'USD $187.50 / 5h / person  •  was $250  •  Founding Cohort -25%  •  min 5 students',
  tags_json = '["ai", "mentor", "group", "cohort", "automation", "5-hours", "online", "zoho-meeting", "founding-cohort", "min-5"]'::jsonb,
  updated_at = now()
WHERE service_id = 'ai-mentor-group-executes-for-you-5h';

-- 2h. Group — Real Product 10h :: $500 → $375
UPDATE service_merchant_profiles
SET
  name = 'Group — Turn Your AI Into a Paying Product (10 hours cohort)',
  summary = '10-hour group cohort focused on shipping a monetised AI product. Peer feedback + senior mentor. Live on Zoho Meeting. Minimum 5 students per cohort.',
  amount_aud = 375,
  display_price = 'USD $375 / 10h / person  •  was $500  •  Founding Cohort -25%  •  min 5 students',
  tags_json = '["ai", "mentor", "group", "cohort", "product-launch", "10-hours", "online", "zoho-meeting", "founding-cohort", "min-5"]'::jsonb,
  updated_at = now()
WHERE service_id = 'ai-mentor-group-real-product-10h';

-- 2i. Group — Project-based :: Custom
UPDATE service_merchant_profiles
SET
  name = 'Group — Project-Based AI Builder Cohort',
  summary = 'Group package shaped around a shared project the cohort ships together. Live on Zoho Meeting, peer review, senior mentor. Founding Cohort: priority cohort start.',
  display_price = 'Custom pricing  •  min 5 students  •  Founding Cohort priority',
  tags_json = '["ai", "mentor", "group", "cohort", "custom-scope", "online", "zoho-meeting", "founding-cohort-priority", "min-5"]'::jsonb,
  updated_at = now()
WHERE service_id = 'ai-mentor-group-project-based-builder';

-- 2j. Group — Ongoing :: On request
UPDATE service_merchant_profiles
SET
  name = 'Group — Ongoing Mentor & Ops Retainer',
  summary = 'Continuous group mentor + ops support after your team ships. Keep momentum without solo loneliness. Monthly Zoho Meeting cohort review + on-demand pairing.',
  display_price = 'Pricing on request  •  min 5 students  •  Founding Cohort priority',
  tags_json = '["ai", "mentor", "group", "cohort", "retainer", "ops-support", "online", "zoho-meeting", "founding-cohort-priority", "min-5"]'::jsonb,
  updated_at = now()
WHERE service_id = 'ai-mentor-group-ongoing-ops-support';
