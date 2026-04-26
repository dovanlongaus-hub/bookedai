# Portal status-first A/B telemetry live

- Timestamp: 2026-04-26T02:14:19.651686+00:00
- Source: telegram
- Category: change-summary
- Status: submitted

## Summary

Portal status-first A/B action IA is live: default order is Status, Pay, Reschedule, Ask for help, Change plan, Cancel; telemetry emits to local portal events, dataLayer, and bookedai:portal-event; production smoke passed with no console/request failures and mobile overflow 0.

## Details

Implemented the next portal UAT recommendation from the investor/SME review. portal_variant=control preserves the previous overview/edit/reschedule/pause/downgrade/cancel IA, while status_first is now the default customer-first portal action order. Added lightweight funnel telemetry for lookup submission, booking loaded/failure, action navigation, request composer open, request submit/failure, and care-turn outcomes without adding an analytics vendor. Added dedicated Pay, Ask for help, and Change plan states while pause/downgrade/cancel/reschedule remain request-safe audited backend flows. Verification: frontend typecheck passed, focused Playwright portal spec passed 3/3, frontend production build passed, deploy-live completed, stack healthcheck passed, and live browser smoke on portal.bookedai.au for v1-2fd9f35965 confirmed labels, loaded/pay-click events, no console/request failures, and 390px mobile overflow 0.
