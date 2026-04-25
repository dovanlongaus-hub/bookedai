# WhatsApp Meta Replacement Token Deployed

- Timestamp: 2026-04-25T12:50:39.323110+00:00
- Source: telegram
- Category: change-summary
- Status: deployed

## Summary

Rotated the BookedAI WhatsApp customer-care Meta token, deployed live, and verified fallback-safe sending behavior.

## Details

On 2026-04-25 the operator provided a replacement Meta WhatsApp access token. The value was written only to runtime configuration and was not copied into docs, memory, or this sync note. Live deploy completed successfully. Backend verification confirms WHATSAPP_PROVIDER=meta, WHATSAPP_FALLBACK_PROVIDER=twilio, WHATSAPP_FROM_NUMBER=+61455301335, WHATSAPP_META_PHONE_NUMBER_ID=777199388798945, and the Meta access token is present. Graph id lookup for 777199388798945 succeeds with the replacement token. Direct Meta message POST still returns code 100/subcode 33, so production sending safely reports status ok and queues through whatsapp_twilio/manual-review fallback instead of failing the customer-care flow. A live send test to +61481993178 returned provider whatsapp_twilio, delivery_status queued, with warnings that the Meta primary was unavailable and the message was recorded for manual review.
