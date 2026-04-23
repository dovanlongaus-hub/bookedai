# BookedAI public assistant enterprise flow hardening

- Timestamp: 2026-04-22T09:56:01.912215+00:00
- Source: frontend/src/components/landing/assistant/BookingAssistantDialog.tsx
- Category: product
- Status: updated

## Summary

Public booking assistant now shows live matching state and a fuller enterprise booking journey across preview, booking, email, calendar, payment, CRM, thank-you, and SMS/WhatsApp follow-up.

## Details

# Public assistant enterprise flow hardening

- Added a clearer live `matching services` search state so the public assistant explicitly signals that it is finding the best-fit service for the current request.
- Upgraded the Prompt 5 booking journey so the runtime now shows an enterprise flow from search and preview into booking capture, email, calendar, payment, CRM, thank-you, and follow-up.
- Preserved additive `crm_sync` detail from the v1 booking-intent response into the frontend confirmation state so public flow can expose CRM linkage posture without changing backend route behavior.
- Added reusable communication drafts for confirmation email, SMS, and WhatsApp when the user provides matching contact details, making the customer handoff read like a revenue-ops workflow instead of a simple thank-you page.

Verification:
- Frontend `tsc` and `npm --prefix frontend run build` were re-run with timeout guards in this workspace.
- Neither command emitted compile errors before the local timeout window was reached, so verification is partial rather than fully confirmed.
