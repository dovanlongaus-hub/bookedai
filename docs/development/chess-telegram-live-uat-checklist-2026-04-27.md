# Chess Telegram Live UAT Checklist

Date: `2026-04-27`
Tenant: `co-mai-hung-chess-class`
Customer/Tenant email: `chess@bookedai.au`
Tenant Telegram: `@Dvl_Aus`

## Run order

1. Telegram search
2. Telegram booking
3. Confirmation email
4. Portal open from link
5. Portal open from direct booking reference
6. Existing-order continuity in Telegram
7. CRM sync verification

## Steps

### 1) Telegram search
Send to `@BookedAI_Manager_Bot`:

`Find a chess class in Sydney this weekend`

Pass if:
- chess-first results appear
- inline actions include `View 1` and `Book 1`
- response is quick and not stuck

Evidence:
- screenshot of results
- screenshot of inline actions

### 2) Telegram booking
Tap `Book 1`, then provide:
- name
- `chess@bookedai.au`
- preferred time

Pass if:
- bot asks for missing details before creating booking
- final reply includes booking reference
- final reply includes portal/open-booking action

Evidence:
- screenshot of detail-capture prompt
- screenshot of booking confirmation
- copy the booking reference

### 3) Confirmation email
Open inbox for `chess@bookedai.au`.

Pass if:
- confirmation email arrives
- support identity is BookedAI
- `info@bookedai.au` is shown
- booking reference and portal details are present

Evidence:
- screenshot of inbox message
- screenshot of email body

### 4) Portal open from link
Open the portal link from Telegram or email.

Pass if:
- booking workspace loads
- no failed-fetch or empty error shell
- booking reference and status/actions are visible

Evidence:
- screenshot of portal workspace

### 5) Portal open from direct reference
Open:

`https://portal.bookedai.au/?booking_reference=<BOOKING_REFERENCE>`

Pass if:
- same booking loads correctly again

Evidence:
- screenshot of direct reopen

### 6) Existing-order continuity in Telegram
Using the same Telegram identity, send:

`Show me another chess class in Sydney`

Pass if:
- bot keeps current booking context
- continuity actions appear for current order/portal/QR/search/change

Then tap:
- `Keep current booking, search BookedAI.au`

Pass if:
- new results appear
- `Return to current order` is visible

Evidence:
- screenshot of continuity message
- screenshot of continued search

### 7) CRM sync verification
Check admin/API/log evidence and Zoho CRM for the same booking.

Pass if:
- CRM sync shows visible state for lead/contact/deal/task
- synced or clearly tracked failure, not silent loss
- no obvious duplicate explosion

Evidence:
- screenshot/log of `crm_sync`
- screenshot of Zoho contact/deal/task if available

## Final pass gate

Mark this run passed only if all are true:
- Telegram search returns chess-first results
- `Book 1` captures details before booking creation
- confirmation email arrives with BookedAI support identity
- portal reopens from both link and direct booking reference
- existing-order Telegram continuity works
- CRM sync is visible and not silently lost
