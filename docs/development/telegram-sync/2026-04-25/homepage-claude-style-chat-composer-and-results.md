# Homepage Claude-Style Chat Composer And Results

## Summary

The `bookedai.au` homepage chat now behaves more like a compact Claude-style work surface: conversation and results scroll above, while the bottom composer keeps attach, text input, voice, and send actions in one row. Top search outputs are framed as `Top research` inside the assistant bubble, with contact and booking actions attached to each result.

## What Changed

- Reframed the homepage search workspace as one chat card with a header/status area, a scrollable conversation/results pane, and a bottom composer.
- Added a left-side attachment button that uses the existing image/text/file extraction path for image, text, markdown, and PDF references.
- Kept the text input centered and moved voice/send into icon actions on the right.
- Added attachment chips below the composer so selected files can be removed before search.
- Added `Top research` framing inside assistant result bubbles so the top summarized options feel like a reviewable research list, not a detached result board.
- Expanded in-chat result actions with Mail and Call paths beside Details, Maps, Provider, Select, and Book.
- Updated regression tests to assert attach visibility, `Top research`, Mail, and Book actions in the homepage flow.

## Verification

- `cd frontend && npx tsc --noEmit --pretty false`
- `npm --prefix frontend run build`
- `npm --prefix frontend run test:playwright:legacy`
- `npm --prefix frontend run test:playwright:live-read`
- live deploy through `python3 scripts/telegram_workspace_ops.py host-shell --cwd /home/dovanlong/BookedAI --command "bash scripts/deploy_live_host.sh"`
- `bash scripts/healthcheck_stack.sh`
- production public-surface smoke for home/product/pitch/roadmap/tenant/portal/admin with no console errors, failed requests, or mobile overflow
- non-mutating live homepage composer/search/status smoke confirmed attach and send controls, scroll hint, status, and suggestion/top-research content without creating a booking

## Operator Note

The full booking mutation path remains covered by mocked Playwright live-read regression. Production checks only submit a harmless search and do not create a live booking.
