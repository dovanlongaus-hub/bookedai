# Verified chess tenant design requirements and roadmap sync

- Timestamp: 2026-04-25T06:07:57.140485+00:00
- Source: telegram
- Category: product
- Status: completed

## Summary

Added reviewed chess tenant search behavior to the detailed BookedAI design requirements and synchronized it across PRD, phase, sprint, roadmap, and public roadmap dataset.

## Details

# Verified Chess Tenant Design Requirements And Roadmap Sync

Summary: The reviewed chess tenant search behavior is now documented as a detailed BookedAI design requirement and synchronized with the active roadmap, phase, and sprint planning stack.

Details:

- Added the verified-tenant search contract to the consolidated PRD: reviewed BookedAI tenant matches stay in the normal shortlist, show tenant capability signals, and require explicit `Book` before booking details open.
- Expanded the design requirements so chess tenant cards show `BookedAI tenant` / `Verified tenant` treatment plus Book, Stripe, QR payment, QR confirmation, calendar, email, WhatsApp Agent, and portal edit support.
- Locked confirmation requirements: booking reference, QR to `portal.bookedai.au`, Stripe/QR/manual payment posture, email/calendar actions, WhatsApp Agent follow-up, and portal review/edit/reschedule/cancel links.
- Synchronized the requirement through `DESIGN.md`, `prd.md`, `docs/architecture/bookedai-master-prd.md`, `docs/development/bookedai-chatbot-landing-design-spec.md`, `docs/development/sprint-13-16-user-surface-delivery-package.md`, `docs/development/next-phase-implementation-plan-2026-04-25.md`, `docs/development/roadmap-sprint-document-register.md`, `docs/development/project-wide-sprint-execution-checklist.md`, implementation progress, project memory, and the public roadmap dataset.
- Roadmap ownership is now explicit: Phase/Sprint 17 preserves the current results-first chess tenant proof, while Phase/Sprint 22 owns reusable verified-tenant template extraction beyond chess.
