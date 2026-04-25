# WhatsApp Direct Primary With Twilio Backup

- Timestamp: 2026-04-25T06:48:42.480685+00:00
- Source: telegram
- Category: change-summary
- Status: deployed

## Summary

BookedAI WhatsApp customer-care now uses direct Meta/WhatsApp Cloud API as the primary transport for +61455301335, with Twilio retained as backup.

## Details

Implemented WHATSAPP_PROVIDER=meta plus WHATSAPP_FALLBACK_PROVIDER=twilio, added backend fallback behavior for Meta missing credentials or provider failure, updated OpenClaw agent manifest and docs, redeployed live, and verified provider status now reports whatsapp_meta connected with fallback_provider=whatsapp_twilio notes. Focused backend tests passed. Live test to +61481993178 recorded a queued backup-path message because Meta credentials are not yet set and the existing Twilio credentials still fail provider delivery/auth.
