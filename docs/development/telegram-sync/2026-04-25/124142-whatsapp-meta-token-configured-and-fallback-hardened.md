# WhatsApp Meta Token Configured And Fallback Hardened

- Timestamp: 2026-04-25T12:41:42.654381+00:00
- Source: telegram
- Category: change-summary
- Status: deployed

## Summary

Configured the BookedAI WhatsApp customer-care runtime to use Meta primary for +61455301335 with Twilio fallback, then deployed fallback hardening after Meta send attempts returned a phone-number permission/object error.

## Details

Runtime verification on 2026-04-25 confirmed the live backend has WHATSAPP_PROVIDER=meta, WHATSAPP_FALLBACK_PROVIDER=twilio, WHATSAPP_FROM_NUMBER=+61455301335, WHATSAPP_META_PHONE_NUMBER_ID=777199388798945, and a Meta access token present. Graph ID lookup for the configured phone number ID passed, but direct WhatsApp message POSTs still return Meta code 100/subcode 33, indicating the token/asset permission or phone-number object association is not yet valid for messaging. The backend communication layer was hardened and deployed so Meta send failures are downgraded into provider-unavailable warnings, then Twilio backup/manual-review handling takes over instead of returning 502. A live send test to +61481993178 returned status ok with provider whatsapp_twilio, delivery_status queued, and warnings that the Meta primary was unavailable and the message was recorded for manual review. No token value was written into docs, memory, or this sync note.
