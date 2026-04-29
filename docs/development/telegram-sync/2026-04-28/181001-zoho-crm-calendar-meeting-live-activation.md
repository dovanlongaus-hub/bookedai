# Zoho CRM Calendar Meeting Live Activation

- Timestamp: 2026-04-28T18:10:01.619970+00:00
- Source: docs/development/telegram-sync/2026-04-28/zoho-crm-calendar-meeting-live-activation.md
- Category: integration
- Status: live-closeout

## Summary

Activated and deployed BookedAI Zoho CRM/Calendar/Meeting for the AU tenant: refreshed OAuth scopes, AU Calendar base URL, selected info calendar UID, fixed Zoho eventdata event creation, verified live meeting/event URL smoke, repaired the chess frontend build blocker, deployed live, and passed stack/API/chess smokes.

## Details

# Zoho CRM Calendar Meeting Live Activation

## Summary

BookedAI Zoho CRM, Calendar, and Zoho Meeting activation is now live-deployed for the AU tenant.

## Details

- Exchanged the operator-provided Zoho OAuth code for a new refresh-token family with CRM, Notifications, Calendar, and Meeting scopes.
- Set BookedAI to the AU Calendar API base URL: `https://calendar.zoho.com.au/api/v1`.
- Selected the AU `info` calendar UID for `ZOHO_CALENDAR_UID`.
- Fixed Calendar event creation to send Zoho `eventdata` form payloads and UTC timestamp strings accepted by the live Calendar API.
- Verified a live setup smoke that returned both a Zoho Meeting URL and Zoho Calendar event URL.
- Paid-booking lifecycle remains wired to attempt Zoho CRM Closed Won Deal sync plus payment follow-up Task sync.
- Repaired a frontend deployment blocker in `ChessGrandmasterApp.tsx` by adding the missing `selectedSlotId` initial state, importing `ChessPieceIllustration`, and rendering localized price text.

## Verification

- Zoho CRM `Leads`/`Deals` metadata smokes connected through refresh-token auth.
- Zoho Calendar list smoke connected against the AU Calendar API and returned the `info` calendar.
- Live Zoho Calendar/Meeting event smoke returned both meeting and event URLs.
- `python3 -m py_compile` passed for touched backend/script modules.
- Focused backend tests passed: `backend/tests/test_stripe_webhook_routes.py` and `backend/tests/test_chess_meeting_regenerate_route.py` (`21 passed`).
- `npm --prefix frontend run build` passed after the frontend build-blocker fix.
- `bash scripts/deploy_live_host.sh` completed.
- `bash scripts/healthcheck_stack.sh` passed at `2026-04-28T18:07:28Z`.
- Live `https://api.bookedai.au/api/health` returned `ok`.
- Live `https://chess.bookedai.au` returned `200`.

## Next Proof

Run a real booking UAT through a tenant that supplies desired date/time/email and verify the booking response includes `meeting.meeting_url`, then verify the resulting CRM records and paid-booking sync posture after payment confirmation.
