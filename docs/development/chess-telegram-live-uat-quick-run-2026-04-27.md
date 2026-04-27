# Chess Telegram Live UAT Quick Run

Date: `2026-04-27`
Tenant: `co-mai-hung-chess-class`
Email: `chess@bookedai.au`
Telegram: `@Dvl_Aus`

1. Send `Find a chess class in Sydney this weekend` to `@BookedAI_Manager_Bot`.
   - Pass: chess-first results, `View 1`, `Book 1`.

2. Tap `Book 1` and provide booking details.
   - Pass: bot asks for missing details first, then returns booking reference + portal action.

3. Check inbox `chess@bookedai.au`.
   - Pass: confirmation email arrives from BookedAI posture, shows `info@bookedai.au`, booking reference, portal details.

4. Open portal from Telegram/email link.
   - Pass: booking workspace loads, no fetch/error shell.

5. Open direct portal link:
   - `https://portal.bookedai.au/?booking_reference=<BOOKING_REFERENCE>`
   - Pass: same booking reloads correctly.

6. In the same Telegram thread, send `Show me another chess class in Sydney`.
   - Pass: current-booking continuity actions appear.

7. Tap `Keep current booking, search BookedAI.au`.
   - Pass: new results appear and `Return to current order` is visible.

8. Check CRM/admin/log evidence for the same booking.
   - Pass: visible `crm_sync` state for lead/contact/deal/task, no silent loss.
