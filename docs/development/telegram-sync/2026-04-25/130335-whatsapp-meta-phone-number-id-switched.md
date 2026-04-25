# WhatsApp Meta Phone Number ID Switched

- Timestamp: 2026-04-25T13:03:35.699795+00:00
- Source: telegram
- Category: change-summary
- Status: deployed

## Summary

Updated the live BookedAI WhatsApp customer-care Meta Phone Number ID to 61564750276601 and verified the backend runtime.

## Details

On 2026-04-25 the operator requested switching the WhatsApp Meta Phone Number ID to 61564750276601. Runtime config was updated while keeping Meta as primary and Twilio as backup for +61455301335. Graph id lookup for 61564750276601 succeeds with the current token. The full deploy session was interrupted after build output, so backend and beta-backend were force-recreated directly with docker compose production settings. Live backend verification now reports WHATSAPP_PROVIDER=meta, WHATSAPP_FALLBACK_PROVIDER=twilio, WHATSAPP_FROM_NUMBER=+61455301335, WHATSAPP_META_PHONE_NUMBER_ID=61564750276601, and the access token present. API health and the WhatsApp bot readiness check pass. A live test to +61481993178 returned status ok with provider whatsapp_twilio and delivery_status queued because direct Meta POST /messages still returns code 100/subcode 33, so fallback/manual-review handling remains active instead of breaking the customer-care flow.
