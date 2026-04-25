# Public/product search results flow refinement

- Timestamp: 2026-04-25T05:20:35.219361+00:00
- Source: codex-cli
- Category: product-ux
- Status: completed

## Summary

Search results now stay results-first after ranking: compact cards, detail popups, chat-based follow-up chips, and explicit Book actions before customer details open.

## Details

# Public/Product Search Results Flow Refinement

## Summary

The public homepage and product assistant now keep search results as the active surface after ranking. Users can pause, scroll, compare compact results, open full detail popups, and move into booking only after an explicit `Book` action.

## Details

- `frontend/src/apps/public/HomepageSearchExperience.tsx` no longer auto-scrolls or focuses the booking side panel when search results arrive.
- Homepage clarification and follow-up prompts now stay in the BookedAI chat thread as actionable suggestion chips, instead of rendering as a separate clarification panel outside the conversation.
- Homepage result cards were tightened to show essential comparison facts and compact actions in-list; fuller provider context, summary, confidence, next step, provider/map links, and booking continuation remain in the detail popup.
- `frontend/src/components/landing/assistant/BookingAssistantDialog.tsx` no longer auto-selects the first returned match after search.
- Product/popup results now expose clear `View details` and `Book` actions so review mode and booking commitment stay separate.

## Verification

- `npm --prefix frontend run build`

## Documentation Updated

- `project.md`
- `README.md`
- `DESIGN.md`
- `docs/development/implementation-progress.md`
- `docs/architecture/current-phase-sprint-execution-plan.md`
- `docs/architecture/implementation-phase-roadmap.md`
- `memory/2026-04-25.md`
