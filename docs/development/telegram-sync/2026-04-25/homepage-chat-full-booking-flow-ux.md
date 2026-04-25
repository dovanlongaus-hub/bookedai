# Homepage Chat Full Booking Flow UX

## Summary

Upgraded and deployed the `bookedai.au` homepage chat workspace so the customer can understand the full path from request to booking confirmation.

## Details

- Added a visible `Ask -> Match -> Book -> Confirm` rail inside `HomepageSearchExperience`.
- Added booking-brief helper cards for contact, preferred time, and next step before the form.
- Kept the form accessible by moving phone helper text outside the phone label, so `Email` and `Phone` remain distinct field names.
- Tightened confirmation copy around QR portal access, edit, reschedule, cancellation request, and follow-up.
- Expanded the live-read Playwright booking smoke so it verifies the friendly full flow from query, shortlist, selected match, booking form, authoritative v1 booking intent, confirmation, portal/follow-up copy, and no horizontal overflow.
- Fixed a Docker/Node 20 production-build blocker in `PitchDeckApp.tsx` by escaping JSX arrow text.
- Deployed the final build live through the host-level deployment workflow.

## Verification

- `npm --prefix frontend exec tsc -- --noEmit`
- `npm --prefix frontend run build`
- `npm --prefix frontend run test:playwright:live-read`
- `npm --prefix frontend run test:playwright:legacy`
- `python3 scripts/telegram_workspace_ops.py host-shell --cwd /home/dovanlong/BookedAI --command "bash scripts/deploy_live_host.sh"`
- `bash scripts/healthcheck_stack.sh`
- live public-surface smoke across `bookedai.au`, `product`, `pitch`, `/roadmap`, `tenant`, `portal`, and `admin`
- live homepage smoke confirmed chat-friendly copy, booking unlock copy, contained hero image, clean console/request state, and no mobile horizontal overflow
