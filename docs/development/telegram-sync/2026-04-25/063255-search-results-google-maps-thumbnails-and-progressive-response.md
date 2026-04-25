# Search results Google Maps thumbnails and progressive response

- Timestamp: 2026-04-25T06:32:55.409224+00:00
- Source: telegram
- Category: product
- Status: completed

## Summary

Public/product search results now include Google Maps actions, top-left thumbnails or preview fallbacks, faster staged progress, early-match copy, and chat-contained refinements.

## Details

# Search Results Google Maps, Thumbnails, And Progressive Response

Summary:

- Public/product search results now expose Google Maps actions for physical-place matches.
- Result cards now place an image thumbnail or branded preview fallback in the top-left scan position.
- Search progress now advances faster and explains early matches while maps, booking paths, and fit checks continue.
- Clarification questions and suggested next prompts remain inside the BookedAI chat conversation.

Implementation:

- Added `buildGoogleMapsSearchUrl` in the shared partner-match presenter. It uses a backend `map_url` when available, and otherwise builds a Google Maps search URL from venue name, location, and service name.
- Updated `HomepageSearchExperience.tsx` result cards and preview modal with Google Maps actions, thumbnail/preview treatment, faster staged progress timing, and early-match copy.
- Updated `BookingAssistantDialog.tsx` inline chat results, suggested-services cards, and detail popup with the same Google Maps and thumbnail/preview behavior.
- Kept the existing results-first rule: search results stay browsable, detail opens from an explicit action, and booking begins only from an explicit book action.

Documentation sync:

- Updated `prd.md`, `DESIGN.md`, `project.md`, master PRD, implementation roadmap, sprint package, next-phase plan, roadmap register, chatbot landing design spec, implementation progress, and memory.

Verification:

- `npm --prefix frontend run build`
- `git diff --check` on the touched search/product/docs files
