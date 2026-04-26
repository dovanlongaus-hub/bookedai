# Tenant Booking Email CC and Telegram Notification

Date: `2026-04-26`

## Summary

Tenant-owned homepage/product booking sessions now keep BookedAI as the operational email identity while notifying the saved tenant contact by CC and through the Messaging Automation Layer.

## Details

- BookedAI remains the booking sender/support identity through `BOOKING_BUSINESS_EMAIL`, defaulting to `info@bookedai.au`.
- Tenant-owned catalog services now carry `tenant_id` and `owner_email` in the public catalog response, so booking session logic can distinguish tenant-owned services from generic catalog entries.
- If a tenant-owned service has `business_email`, BookedAI sends the internal booking lead notification to `info@bookedai.au` and CCs the tenant email.
- Customer confirmation copy still points customers to `info@bookedai.au` and does not expose provider-specific support identity as the primary contact.
- Booking session events now record tenant notification delivery metadata for operator audit.
- `MessagingAutomationService` now includes a tenant booking notification helper that defaults to Telegram and reads tenant settings such as `messaging_automation.tenant_notifications.telegram_chat_id(s)`.
- If no tenant Telegram chat id is configured, the notification is recorded as queued with `tenant_telegram_chat_id_not_configured`, preserving a manual-review trail until the tenant connects a channel.

## Verification

- `python3 -m py_compile backend/services.py backend/schemas.py backend/service_layer/messaging_automation_service.py backend/service_layer/admin_presenters.py backend/api/route_handlers.py`
- `.venv/bin/python -m pytest backend/tests/test_booking_assistant_service.py -q` (`14 passed`)
