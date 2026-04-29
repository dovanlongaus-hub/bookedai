# AI Mentor 1-on-1 Pro — operations runbook

Edge cases and known limitations the operator should be aware of when
running the `aimentor.bookedai.au` flow.

## Email mismatch on student portal

**Symptom:** Learner books with email `A@example.com`, later signs in to
`aimentor.bookedai.au/account` with Google email `B@example.com` (different
address), and their booking does not appear in "My bookings".

**Cause:** `backend/api/v1_ai_mentor_student_handlers.py::_list_student_bookings`
joins `booking_intents` to `contacts` on lowercase email. If the Google
sign-in email differs from the booking email, the LEFT JOIN finds no match.

**Workarounds (any one):**
1. Tell the learner to book again using their Google email so future bookings
   appear automatically.
2. Manually update `contacts.email` on the matching row to the Google
   address (one-line UPDATE in the operator console).
3. Long-term fix: add a `contact_aliases` table that maps multiple emails
   to one contact, and update the join. Out of scope for the Founding
   Cohort launch — the workaround is fast enough.

**Detection:** Watch for student support tickets reading "I booked but my
account is empty" — those are the cohort hit by this edge case.

## Founding Cohort 2026 promo deadlines

- Hard cap: 50 seats. Track via
  `SELECT count(*) FROM ai_mentor_student_users` (proxy for active learners)
  + `SELECT count(distinct contact_id) FROM booking_intents WHERE tenant_id = ...`.
- Soft deadline: 2026-05-31 23:59 AEST. Frontend banner reads
  `PROMO_DEADLINE_ISO` from `frontend/src/apps/public/AIMentorBookedAIApp.tsx`.
- DB authoritative state: `tenant_settings.settings_json -> 'promotions'
  -> 'founding_cohort_2026_q2' -> 'active'` (true/false) and `'deadline_iso'`.
  When capping, set `'active' = false` AND update the frontend constant
  AND deploy the frontend.

## Zoho Meeting + Calendar — operator setup

**Reuse the existing Zoho CRM OAuth app.** The CRM refresh token already
configured for lead/contact/deal sync can also mint access tokens for
Meeting + Calendar — but the operator must re-run the consent flow with
the additional scopes:

```
ZohoCRM.modules.ALL,ZohoCRM.notifications.ALL,ZohoMeeting.session.ALL,ZohoCalendar.event.ALL
```

Then set these env vars (all optional; absent ones fall back to
`ZOHO_CRM_*` equivalents):

```bash
ZOHO_MEETING_REFRESH_TOKEN=...   # falls back to ZOHO_CRM_REFRESH_TOKEN
ZOHO_MEETING_USER_ID=...         # REQUIRED — Zoho user that hosts sessions
ZOHO_MEETING_API_BASE_URL=https://meeting.zoho.com.au/api/v2  # AU data centre

ZOHO_CALENDAR_REFRESH_TOKEN=...  # falls back to ZOHO_CRM_REFRESH_TOKEN
ZOHO_CALENDAR_UID=...            # REQUIRED — calendar UID where events go
ZOHO_CALENDAR_API_BASE_URL=https://calendar.zoho.com.au/api/v1

AIMENTOR_MENTOR_EMAIL=aimentor@bookedai.au  # extra calendar attendee
```

Verify:

```python
from service_layer.zoho_aimentor_orchestrator import safe_summary
safe_summary(settings)
# {"zoho_meeting_configured": True, "zoho_calendar_configured": True}
```

**Failure mode is graceful:** if Zoho is misconfigured or the API is down,
`POST /api/v1/aimentor/slots/{slot_id}/reserve` still succeeds — the slot
is held, the booking_reference is issued, the welcome email is sent with
the template URL, and the operator can manually populate
`service_time_slots.zoho_meeting_url` later.

## Time slot booking → Stripe → calendar invite chain

When a learner picks a slot via `<TimeSlotPicker>` then submits the
registration form:

1. `POST /api/v1/leads` records the lead with the slot info embedded in
   the `message` field (format: `[Picked slot] Sat 10 May 19:00 (Sydney) ·
   slot_id=...`). The backend currently does NOT auto-increment
   `service_time_slots.booked_count` from a lead capture — only a confirmed
   booking intent decrements seats.
2. Mentor reaches out within 24h. When the mentor confirms the slot, they
   should manually run:
   ```sql
   UPDATE service_time_slots
   SET booked_count = booked_count + 1, updated_at = now()
   WHERE id = '<slot_id>';
   ```
3. The Zoho Meeting URL field on the slot row is currently NULL by default.
   The welcome email composer falls back to the
   `settings.meeting_provider.video_link_template` URL pattern. To embed a
   real meeting link in the email, populate `service_time_slots.zoho_meeting_url`
   AND `zoho_calendar_event_id` after creating the Zoho Meeting / Calendar
   event server-side. Real Zoho OAuth integration is a Q3 follow-up.

## Currency

All prices are AUD as of migration `036_aimentor_aud_pricing_and_time_slots.sql`.
`service_merchant_profiles.amount_aud` is the canonical Stripe charge
amount. `display_price` is the human-readable string. They must stay in
sync — update both columns together.

Founding Cohort -25% prices are applied directly to `amount_aud` so Stripe
charges the discounted amount. The "was $X" anchor lives only in
`display_price` and is purely for marketing.

## Production observations from migration 035 + 036

- HTML-escape: applied in `_render_aimentor_welcome_email` (Apr 2026).
  Operator-controlled service names + customer names cannot inject markup
  into the welcome email body.
- Locale lookup logging: applied in `_resolve_aimentor_welcome_locale`.
  Genuine DB errors now produce `aimentor_welcome_locale_lookup_failed`
  warnings; "no row" cases stay silent.
- `_list_student_bookings` email join: see "Email mismatch" above.

## Operator quick commands

Cap the promo when 50 seats reached:
```sql
UPDATE tenant_settings
SET settings_json = jsonb_set(settings_json,
  '{promotions,founding_cohort_2026_q2,active}', 'false'::jsonb)
WHERE tenant_id = (SELECT id FROM tenants WHERE slug = 'ai-mentor-doer');
```

Then update `frontend/src/apps/public/AIMentorBookedAIApp.tsx::PROMO_DEADLINE_ISO`
to a past date and redeploy the frontend so the banner hides.

Add a new time slot manually:
```sql
INSERT INTO service_time_slots
  (tenant_id, service_id, slot_start_at, slot_end_at, timezone, capacity, label)
VALUES (
  (SELECT id FROM tenants WHERE slug = 'ai-mentor-doer'),
  'ai-mentor-private-first-ai-app-60',
  '2026-05-12 19:00 Australia/Sydney',
  '2026-05-12 20:00 Australia/Sydney',
  'Australia/Sydney', 1,
  'Weekday evening · Sydney 19:00 AEST'
);
```
