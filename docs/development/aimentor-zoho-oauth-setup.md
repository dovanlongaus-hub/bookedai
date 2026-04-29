# Zoho OAuth setup — `aimentor.bookedai.au` tenant

> 🚀 **Fast path:** if you just want to wire it up, follow the in-app
> wizard at **<https://aimentor.bookedai.au/aimentor/zoho-oauth-callback>**
> — it walks you through Steps 1-6 with copy-paste-ready URLs, captures
> the auth code, and pre-fills the curl command. Read this doc only if
> you want the architecture + failure-mode context behind the wizard.

## TL;DR — streamlined flow (recommended)

After turning on the new auto-exchange endpoint
(`POST /api/v1/aimentor/integrations/zoho/exchange-code`), the operator
only ever does this:

1. **Register redirect URI** in the Zoho app (one-time):
   `https://aimentor.bookedai.au/aimentor/zoho-oauth-callback`
2. **Open the wizard**: <https://aimentor.bookedai.au/aimentor/zoho-oauth-callback>
3. **Paste client_id + client_secret** in Step 2
4. **Click "Authorize with Zoho"** → consent screen → Zoho redirects back
5. **Click "Exchange now (1-click)"** → wizard POSTs to backend → Zoho → returns `refresh_token`
6. **Copy refresh_token** → paste into admin form at
   <https://admin.bookedai.au/#ai-mentor-academy>
7. **Save credentials** + restart not needed (DB-backed override).

No terminal, no curl. The wizard handles the round-trip.

## Concrete redirect URI for the AI Mentor Zoho app

When you create the Zoho OAuth app under the `aimentor@bookedai.au` Zoho
account at <https://api-console.zoho.com.au>, register **exactly one**
Authorized Redirect URI:

```
https://aimentor.bookedai.au/aimentor/zoho-oauth-callback
```

That URL routes to a dedicated client-side helper page (`AIMentorZohoOAuthCallbackApp`)
that captures the `?code=...` Zoho redirects back with, displays it, and
generates the pre-filled curl command. No client_secret is sent over
the wire from the browser — the curl runs in your terminal.

**Local dev / staging environments:** if you need to test against a
non-production hostname (e.g. `localhost:3000`), register that URL too —
Zoho allows multiple redirect URIs per app. Production redirect must
remain `https://aimentor.bookedai.au/aimentor/zoho-oauth-callback`.



This guide walks the operator (`aimentor@bookedai.au`) through wiring up the
real Zoho Meeting + Zoho Calendar + (existing) Zoho CRM integration that
powers the AI Mentor 1-on-1 Pro flow:

- Calendar events for every booked slot, with the learner + mentor as
  attendees (Zoho auto-emails the calendar invite).
- Zoho Meeting sessions auto-scheduled at the slot start time, joinLink
  embedded in the welcome email.
- CRM lead/contact/deal upserts on every lead-form submission (already
  live, no changes needed).

> ⚠️ **Security note.** This guide deliberately never asks you to paste a
> Zoho password into any file or environment variable. Zoho OAuth uses a
> browser-based **consent flow**: you authenticate to Zoho once with your
> normal account credentials, Zoho hands the integration a **refresh
> token**, and the platform uses that refresh token (never your password)
> for all subsequent API calls. If you accidentally pasted your Zoho
> password into any file, rotate it immediately at
> https://accounts.zoho.com/home#change_password.

---

## Decision: shared OAuth client vs. dedicated AI Mentor client

You have two options. **For the AI Mentor 1-on-1 Pro launch, we recommend
Option A (shared client).** It's faster to ship, easier to audit, and
matches how multi-tenant SaaS partners typically share a single OAuth app.

### Option A — Reuse the existing BookedAI OAuth client *(recommended)*

The existing `ZohoCrmAdapter` in `backend/integrations/zoho_crm/adapter.py`
already runs against an OAuth client owned by the BookedAI tenant. To extend
that same client to cover Meeting + Calendar:

1. Sign in to the Zoho Developer Console with the **same account that owns
   the existing CRM integration** (the one whose `client_id` /
   `client_secret` are in `ZOHO_CRM_CLIENT_ID` / `ZOHO_CRM_CLIENT_SECRET`).
2. Open the existing app → **Edit** → ensure these are listed under
   "Authorized Redirect URIs":
   - `https://bookedai.au/api/v1/integrations/zoho/oauth/callback` (existing)
   - You do **not** need a new redirect URI for AI Mentor — the same
     callback handles the consent return for any scope set.
3. Re-run the consent flow with the **expanded scope set** (see
   "Authorize URL" below).
4. The new refresh token has access to CRM **and** Meeting **and** Calendar
   APIs simultaneously.

Pros: one OAuth app to manage, one consent flow, one refresh token.
Cons: if the BookedAI ops team rotates the CRM client, AI Mentor's
Meeting + Calendar break with it. Acceptable for early stage; revisit
when AI Mentor is decoupled from BookedAI's shared infra.

### Option B — Dedicated AI Mentor OAuth client

Create a separate Zoho app under the `aimentor@bookedai.au` Zoho account.
Use this when:

- You want totally independent rate limits / audit trails for AI Mentor.
- You're rotating the BookedAI CRM credentials and don't want collateral
  damage on AI Mentor.
- The aimentor tenant gets sold off / spun out as an independent business.

Steps (mirror Option A, but with new credentials):

1. Sign in to https://api-console.zoho.com.au (AU data centre — see "Data
   centre" note below).
2. **Add Client** → "Server-based Applications".
3. Name: `AI Mentor 1-on-1 Pro — server`. Description: `Calendar + Meeting
   + CRM sync for aimentor.bookedai.au`.
4. Authorized Redirect URI:
   `https://aimentor.bookedai.au/api/v1/integrations/zoho/oauth/callback`
   (you can register the bookedai.au callback URL too if you want to share
   the consent UI).
5. Create app → record `client_id` + `client_secret`.
6. Run the consent flow (next section) using these new credentials.
7. Set the AI Mentor-only env vars:

   ```bash
   ZOHO_MEETING_REFRESH_TOKEN=...      # from this app's consent flow
   ZOHO_MEETING_CLIENT_ID=...          # AI Mentor app
   ZOHO_MEETING_CLIENT_SECRET=...      # AI Mentor app
   ZOHO_CALENDAR_REFRESH_TOKEN=...
   ZOHO_CALENDAR_CLIENT_ID=...
   ZOHO_CALENDAR_CLIENT_SECRET=...
   ```

   The platform will use these in preference to the CRM equivalents
   (`backend/integrations/zoho_meeting/adapter.py::_setting()` checks the
   AI Mentor env vars first, then falls back to CRM).

---

## Data centre — Australia (`.com.au`)

The aimentor tenant is hosted in the Zoho **Australia** data centre (you
saw the consent prompt route to `accounts.zoho.com.au`). All API base
URLs **must use the `.com.au` TLD**, otherwise Zoho returns
`INVALID_TOKEN` even with a valid refresh token (the token is geo-locked
to the data centre that issued it).

Set these env vars exactly:

```bash
ZOHO_ACCOUNTS_BASE_URL=https://accounts.zoho.com.au
ZOHO_MEETING_API_BASE_URL=https://meeting.zoho.com.au/api/v2
ZOHO_CALENDAR_API_BASE_URL=https://calendar.zoho.com.au/api/v1
# CRM uses zoho_crm_api_base_url which is already wired:
ZOHO_CRM_API_BASE_URL=https://www.zohoapis.com.au/crm/v8
```

---

## Required scopes

The consent flow must request **all** of these so one refresh token covers
every integration the AI Mentor flow touches:

```
ZohoCRM.modules.ALL,ZohoCRM.notifications.ALL,ZohoMeeting.session.ALL,ZohoCalendar.event.ALL
```

You can append `ZohoCRM.users.READ` if you want the integrations admin
panel to display the connected user's name + email.

---

## Authorize URL — one-shot consent flow

Construct the authorize URL by URL-encoding your scope list and dropping
in your `client_id`. **Run this in a browser window where you're already
signed in as `aimentor@bookedai.au`** (so the consent screen attaches the
authorization to that account, not your personal Zoho account):

```
https://accounts.zoho.com.au/oauth/v2/auth
  ?response_type=code
  &client_id=<YOUR_CLIENT_ID>
  &scope=ZohoCRM.modules.ALL,ZohoCRM.notifications.ALL,ZohoMeeting.session.ALL,ZohoCalendar.event.ALL
  &redirect_uri=<YOUR_REDIRECT_URI>
  &access_type=offline
  &prompt=consent
```

Important params:

- `access_type=offline` — guarantees Zoho returns a `refresh_token`
  alongside the access token. Without this, you'd only get a 1-hour
  access token and would have to re-consent constantly.
- `prompt=consent` — forces the consent screen to show even if you've
  authorized this client before. Without it, Zoho silently re-uses the
  previous scope set, which won't include Meeting + Calendar if you only
  consented to CRM originally.

After clicking "Allow":

1. Zoho redirects to your `redirect_uri` with `?code=<auth_code>` in the
   query string.
2. The auth code lives for **60 seconds** — exchange it immediately for a
   refresh token:

   ```bash
   curl -X POST 'https://accounts.zoho.com.au/oauth/v2/token' \
     -d "grant_type=authorization_code" \
     -d "client_id=<YOUR_CLIENT_ID>" \
     -d "client_secret=<YOUR_CLIENT_SECRET>" \
     -d "redirect_uri=<YOUR_REDIRECT_URI>" \
     -d "code=<AUTH_CODE>"
   ```

3. Response includes `refresh_token` (long-lived, store this) and
   `access_token` (short-lived, the platform regenerates this on demand
   using the refresh token).

Save the `refresh_token` into `ZOHO_MEETING_REFRESH_TOKEN` /
`ZOHO_CALENDAR_REFRESH_TOKEN` (or rely on the CRM fallback for Option A).

---

## Required runtime env vars (after consent)

Beyond credentials, the platform needs to know **which user** hosts
meetings and **which calendar** events go into:

```bash
# Required for Zoho Meeting
ZOHO_MEETING_USER_ID=<the Zoho user id under whom sessions are scheduled>
# typically: aimentor@bookedai.au's Zoho user id

# Required for Zoho Calendar
ZOHO_CALENDAR_UID=<calendar UID where AI Mentor events live>
# Recommendation: create a dedicated calendar named "AI Mentor 1-on-1 Pro"
# inside the aimentor@bookedai.au Zoho Calendar account so events don't
# pollute the personal calendar. Right-click the calendar → Settings →
# look for "Calendar UID" or "Calendar key".

# Optional — extra calendar attendee on every event
AIMENTOR_MENTOR_EMAIL=aimentor@bookedai.au
```

---

## Verification

After setting env vars and restarting the backend:

```python
# From a Python REPL or a smoke endpoint
from service_layer.zoho_aimentor_orchestrator import safe_summary
from config import get_settings

print(safe_summary(get_settings()))
# Expected: {"zoho_meeting_configured": True, "zoho_calendar_configured": True}
```

End-to-end test (Sydney time):

1. Open `aimentor.bookedai.au`, expand any priced program → **Pick a time**.
2. Click a slot → fill name + email + phone → **Reserve & lock my seat**.
3. Within 5 seconds you should see:
   - Booking success card with `AIM-XXXXXXXXXX` reference + clickable
     **Open Zoho Meeting** button.
   - Email at the learner's inbox titled "Welcome to AI Mentor 1-on-1
     Pro — …" with the meeting URL embedded + a CC to
     `aimentor@bookedai.au`.
   - Calendar invite from Zoho Calendar (auto-sent by Zoho) at both the
     learner's and mentor's inbox.
4. Check `service_time_slots` row for the picked slot:
   `SELECT zoho_meeting_url, zoho_calendar_event_id, booked_count
   FROM service_time_slots WHERE id = '<slot_id>';` — should be populated.

If any of these miss, see "Failure modes" below.

---

## Failure modes & fallbacks

The platform is designed so that **a Zoho hiccup never breaks the
booking**. Each layer fails gracefully:

| If… | Then… |
|---|---|
| Zoho refresh token expired / revoked | `provision_slot_artifacts` returns `meeting_error="..."`, slot is still reserved, welcome email is still sent (with a "Mentor will share the Zoho Meeting link…" fallback line). Operator re-runs the consent flow + updates env vars. |
| `ZOHO_MEETING_USER_ID` missing | `meeting_error="zoho_meeting_not_configured"`. Same fallback path as above. |
| `ZOHO_CALENDAR_UID` missing | `calendar_error="zoho_calendar_not_configured"`. Welcome email still goes (it's not a blocker), but the learner doesn't get a calendar invite from Zoho. Operator can manually invite via the Zoho Calendar UI using the booking_reference. |
| Meeting created but Calendar fails | Welcome email embeds the real Meeting URL (so the learner can join), but no Zoho Calendar invite is sent. Operator can manually create the calendar event referencing the meeting URL. |
| Both succeed but welcome email fails | The Zoho Calendar invite **still arrives** (Zoho auto-sent), so the learner has the meeting on their calendar. Operator investigates the email pipeline (`audit_events.event_type = 'aimentor_welcome_email_send_failed'`). |

All failures log a structured warning under
`bookedai.api.v1_booking_handlers` or
`bookedai.service_layer.zoho_aimentor_orchestrator`, so monitoring can
pick them up.

---

## Operator quick commands

Re-grant scopes after rotating client_secret:

```bash
# Open in a browser logged in as aimentor@bookedai.au
open "https://accounts.zoho.com.au/oauth/v2/auth?response_type=code&client_id=<NEW_CLIENT_ID>&scope=ZohoCRM.modules.ALL,ZohoCRM.notifications.ALL,ZohoMeeting.session.ALL,ZohoCalendar.event.ALL&redirect_uri=<URI>&access_type=offline&prompt=consent"
```

Manually populate Zoho Meeting URL on a slot when auto-provisioning failed:

```sql
UPDATE service_time_slots
SET zoho_meeting_url = '<paste meeting URL>',
    zoho_calendar_event_id = '<paste event UID>',
    updated_at = now()
WHERE id = '<slot uuid>';
```

Disable the AI Mentor Zoho integration without breaking the booking flow
(useful during incident response):

```bash
unset ZOHO_MEETING_REFRESH_TOKEN ZOHO_MEETING_USER_ID
unset ZOHO_CALENDAR_REFRESH_TOKEN ZOHO_CALENDAR_UID
# Restart backend; the orchestrator returns
# meeting_error="zoho_meeting_not_configured" and the welcome email
# falls back to the template URL.
```

---

## File reference

- Adapter — Meeting: `backend/integrations/zoho_meeting/adapter.py`
- Adapter — Calendar: `backend/integrations/zoho_calendar/adapter.py`
- Orchestrator: `backend/service_layer/zoho_aimentor_orchestrator.py`
- Reserve endpoint: `backend/api/v1_ai_mentor_student_handlers.py::reserve_service_time_slot`
- Welcome email composer: `backend/api/v1_booking_handlers.py::_render_aimentor_welcome_email`
- Tenant CC constant: `backend/api/v1_booking_handlers.py::AIMENTOR_TENANT_CC_EMAIL`
- General runbook: `docs/development/aimentor-runbook.md`
