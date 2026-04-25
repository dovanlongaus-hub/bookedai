# BookedAI doc sync - docs/development/public-search-booking-resilience-ux-2026-04-23.md

- Timestamp: 2026-04-24T03:57:54.849348+00:00
- Source: repo-doc-sync
- Category: documentation
- Status: synced

## Summary

Synchronized `docs/development/public-search-booking-resilience-ux-2026-04-23.md` from the BookedAI repository into the Notion workspace. Preview: # Public Search + Booking Resilience and UX Update Date: `2026-04-23` Document status: `active execution note` ## Purpose

## Details

Source path: docs/development/public-search-booking-resilience-ux-2026-04-23.md
Synchronized at: 2026-04-24T03:57:54.637513+00:00

Repository document content:

# Public Search + Booking Resilience and UX Update

Date: `2026-04-23`

Document status: `active execution note`

## Purpose

Record the newly locked requirements and the implementation results for the public BookedAI search and booking flow across homepage, popup assistant, and embedded assistant surfaces.

This note exists because the latest public-surface wave is no longer only a homepage visual realignment.

It now also includes:

- degraded-write resilience for `Continue booking`
- clearer slow-search and matching states
- more professional explanation of what BookedAI is doing during ranking and trust checks
- better prompts for users to add missing detail before or during result resolution

## Trigger for this update

Operator request on `2026-04-23` tightened the public-flow bar in two directions at once:

1. the public homepage and assistant flow should feel smoother and more professional end to end
2. slow search should not feel stalled or broken, and the UI should help the user improve the query while matching is in progress

## Locked requirements

### 1. `Continue booking` must fail safely

If live v1 write paths are degraded, the user-facing booking flow must not remain in a loading-fail posture.

Required behavior:

- user can still continue through the booking flow
- degraded v1 write behavior should fall back safely to the legacy booking-session path where possible
- that fallback should stay recovery-only: when the authoritative live-read booking-intent write succeeds, the homepage should not bounce the user back through the legacy catalog session flow just to hydrate a richer result
- the UI should not strand the user in an indefinite `Continue booking` failure state

### 2. Slow search must stay legible

When matching takes time, the UI must expose meaningful in-progress states rather than one generic loading label.

Required behavior:

- show that BookedAI is actively working
- explain which stage the system is in
- avoid the impression that the UI is frozen

### 3. BookedAI should coach better input during search

While search is resolving, the system should guide the user toward stronger search input.

Required prompts should encourage details such as:

- suburb or area
- preferred day or time window
- person, age, or audience context
- budget or preference posture

### 4. Public assistant surfaces should not drift

Homepage, popup assistant, and embedded assistant should share the same product-quality standard for:

- progress-state wording
- matching-state explanation
- booking-submit resilience

## Runtime findings that drove the change

Live investigation on `2026-04-23` confirmed the current split:

- `POST /api/v1/leads` returned `500`
- `POST /api/v1/bookings/intents` returned `500`
- `POST /api/booking-assistant/session` returned `200`

This means the public `Continue booking` issue was a real degraded-write problem in the newer v1 path, not only a CTA wiring or client-state issue.

## Implemented results

### Booking-submit resilience

Implemented a shared fallback decision helper in:

- `frontend/src/components/landing/assistant/publicBookingAssistantV1.ts`

Applied the fallback behavior in:

- `frontend/src/apps/public/HomepageSearchExperience.tsx`
- `frontend/src/components/landing/assistant/BookingAssistantDialog.tsx`
- `frontend/src/components/landing/sections/BookingAssistantSection.tsx`

Result:

- `Continue booking` no longer depends only on a healthy v1 write lane to keep the user moving

### Search-progress UX on homepage

Updated:

- `frontend/src/apps/public/HomepageSearchExperience.tsx`

Added:

- staged progress labels during search
- clearer explanation of matching work in progress
- prompts for better query detail while search is resolving

### Search-progress UX in popup assistant

Updated:

- `frontend/src/components/landing/assistant/BookingAssistantDialog.tsx`

Added:

- the same staged progress treatment
- stronger loading copy that explains active matching behavior
- prompts for query improvement while results are still resolving

### Search-progress UX in embedded assistant demo

Updated:

- `frontend/src/components/landing/sections/BookingAssistantSection.tsx`

Added:

- richer loading copy that explains intent, locality, and shortlist-quality checks instead of a thin generic loading bubble

## Verification

Verified in current worktree:

- `cd frontend && npx tsc --noEmit` passed
- `npm --prefix frontend run build` passed

Browser Playwright verification remained environment-blocked in this shell because the runtime lacks required host browser libraries for the downloaded Playwright bundle.

## Acceptance criteria going forward

This public-flow update should now be treated as complete only when:

- homepage search feels active and explanatory during slower matching
- popup assistant uses the same quality bar for progress and guidance states
- embedded assistant does not regress to thin generic loading language
- `Continue booking` remains usable when the v1 write lane is degraded but legacy session creation is still available
- the normal live-read success path should remain authoritative end to end, so shortlist matches returned from live-read do not fail later with catalog-only errors such as `Selected service was not found`
- future public-surface work does not reintroduce drift between homepage and assistant matching-state behavior

## Follow-up recommendations

1. add browser-level smoke coverage for staged loading states once host browser dependencies are available
2. add delayed-state prompts after a few seconds if the user still has not supplied enough location or timing detail
3. keep the public homepage realignment and the search-flow UX work synchronized so the homepage remains product-first without becoming too thin to explain active search behavior
