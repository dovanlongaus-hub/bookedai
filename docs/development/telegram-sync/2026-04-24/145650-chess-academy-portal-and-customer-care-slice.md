# Chess academy portal and customer-care slice

- Timestamp: 2026-04-24T14:56:50.901513+00:00
- Source: docs/development/implementation-progress.md
- Category: change-summary
- Status: submitted

## Summary

Connected the chess revenue-engine flow into portal.bookedai.au with parent progress context and retention-safe request actions.

## Details

Portal booking detail now carries academy_report_preview, renders parent-facing progress and next-class context, and supports auditable pause_request plus downgrade_request alongside reschedule_request and cancel_request. Synced project.md, prd.md, current-phase execution plan, sprint package, and daily memory so the new customer-care/status-agent requirement matches the shipped code.
