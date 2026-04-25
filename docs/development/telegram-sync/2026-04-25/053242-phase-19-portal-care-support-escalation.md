# Phase 19 portal care support escalation

- Timestamp: 2026-04-25T05:32:42.737244+00:00
- Source: main
- Category: implementation
- Status: completed

## Summary

Phase 19 intelligent AI advanced again: portal customer-care turns can now queue support_request cases for human escalation or broken payment-link issues.

## Details

Continued the intelligent AI plan on main by making the portal customer-care/status agent operational, not only conversational. The care-turn service now detects explicit human-support, escalation, urgent, or broken payment-link intent and queues a support_request through the existing portal booking request path. That creates portal.support_request.requested audit/outbox work with the booking context and original customer note attached. Admin Billing Support now includes portal.support_request.requested in the same review/escalation queue as reschedule and cancel portal requests, so AI-created care cases flow into operator triage. The portal care-turn response now includes created_request, and PortalApp surfaces the queued support case message in the customer-care card. Reschedule/cancel/pause/downgrade remain explicit customer action flows; the AI turn only auto-queues general support or escalation cases. Updated project.md, implementation progress, next-phase plan, current sprint execution plan, implementation roadmap, and memory. Verification passed with py_compile for changed backend modules, portal route tests, tenant/worker regression, frontend typecheck, frontend production build, and git diff whitespace checks.
