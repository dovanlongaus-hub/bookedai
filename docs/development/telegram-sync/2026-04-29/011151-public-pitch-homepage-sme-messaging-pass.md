# Public Pitch Homepage SME Messaging Pass

- Timestamp: 2026-04-29T01:11:51.784309+00:00
- Source: telegram
- Category: change-summary
- Status: submitted

## Summary

Public pitch/homepage SME messaging pass completed locally: pitch.bookedai.au and bookedai.au now carry the launch offer for a custom booking-ready landing page, dedicated email, dedicated CRM, and configured booking/meeting flow; Chess and AI Mentor are positioned as live proof cases; internal public wording was reframed into booking activity, follow-up history, and business workspace language.

## Details

# Public Pitch Homepage SME Messaging Pass

## Summary

Completed a local public messaging and UI/UX pass for `pitch.bookedai.au`, `/architecture`, `bookedai.au`, `chess.bookedai.au`, and `aimentor.bookedai.au`.

## Details

- Added the SME launch offer to the pitch deck and homepage: custom booking-ready landing page, dedicated email, dedicated CRM, and preconfigured booking/calendar/meeting flow.
- Reframed public pitch and architecture wording away from internal implementation language such as `audit ledger`, `tenant Ops`, `action_runs`, raw lead ids, and public placeholder notes.
- Updated public surfaces to use buyer-facing language: booking activity, follow-up history, business workspace, review trail, and booking-ready setup.
- Updated `chess.bookedai.au` and `aimentor.bookedai.au` as live proof cases for dedicated pages, email identity, CRM/follow-up capture, payment posture, and meeting/class scheduling.
- Refreshed focused Playwright tests for the new copy and the current hosted pitch video source.

## Verification

- `npm --prefix frontend run build`
- `cd frontend && npx playwright test tests/pitch-deck-rendering.spec.ts tests/pitch-architecture-viz.spec.ts tests/public-homepage-responsive.spec.ts --project=legacy` (`8 passed`)
- `git diff --check`
- public-copy grep for removed internal phrases

## Status

Local implementation and verification are complete. Live deploy remains an operator decision.
