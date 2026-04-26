# BookedAI Customer Booking Agent UAT

- Timestamp: 2026-04-26T13:14:25.683530+00:00
- Source: telegram
- Category: change-summary
- Status: submitted

## Summary

Customer booking agent UAT passed after fixes for Telegram callback acknowledgement and web chat chess-intent ranking; live deploy and production probes passed.

## Details

Reviewed and tested the BookedAI customer booking agent end-to-end across website chat, Telegram message webhook, Telegram callback webhook, service discovery, booking-intent guardrails, identity policy, release gate, and live production probes. Fixes completed: Telegram inline callbacks now call answerCallbackQuery before sending the normal BookedAI reply, preventing stuck button UX; web chat ranking now treats discriminating service intent terms such as chess as stronger than generic class/kids/location overlap; lifecycle Settings test constructors now include the customer booking support contact fields. Verification passed: focused regression with 33 tests passed, backend contract/lifecycle unittest passed, full release gate passed, production deploy completed through python3 scripts/telegram_workspace_ops.py deploy-live, stack health passed at 2026-04-26T13:12:27Z, live /api/chat/send ranked Kids Chess Class - Sydney Pilot first for a chess class query, and internal live Telegram message plus callback webhook probes both returned HTTP 200 with messages_processed=1. Recommendations recorded in docs/development/customer-booking-agent-uat-2026-04-26.md: add a bundled UAT probe script, persist Telegram shortlist state in a channel-session table, add per-option detail deep links when service-card deep-linking is stable, add a live-safe chess search replay case, and expose customer-agent health in admin.
