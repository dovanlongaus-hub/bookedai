# Homepage -> Pitch Realignment Plan

Date: `2026-04-23`

## Purpose

Lock the next public-surface content split so `bookedai.au` becomes a simpler, more modern, Google-like, product-first landing surface, while `pitch.bookedai.au` becomes the home for the deeper narrative and the current longer-form homepage content.

## Current repo truth

Confirmed from current runtime files:

- `bookedai.au` currently renders `frontend/src/apps/public/PublicApp.tsx`
- `pitch.bookedai.au` currently renders `frontend/src/apps/public/PitchDeckApp.tsx`
- routing is controlled by `frontend/src/app/AppRouter.tsx`
- `frontend/src/apps/pitch/PitchApp.tsx` does not exist
- homepage content and public copy are still heavily sourced from:
  - `frontend/src/components/landing/data.ts`
  - `frontend/src/apps/public/homepageContent.ts`

## Current surface assessment

### `bookedai.au`

The homepage is no longer a thin shell. It currently mixes:

- brand statement
- hero
- executive board framing
- product proof
- overview narrative
- embedded live search experience
- architecture section
- implementation section
- trust
- partners
- team
- pricing
- final CTA

This means the homepage is carrying both:

- the product-first acquisition job
- the deeper investor or narrative deck job

That is now too much for the requested direction.

### `pitch.bookedai.au`

The pitch surface already behaves like the better destination for:

- revenue-engine story
- investor framing
- flow map
- agent-surface explanation
- problem / solution narrative
- architecture
- proof boards
- trust / partners / team / pricing

So the right move is not to widen the homepage again. The right move is to move remaining narrative weight out of `bookedai.au` and consolidate it into `pitch.bookedai.au`.

## Locked direction

### Homepage role: `bookedai.au`

`bookedai.au` should become:

- simpler
- faster to scan
- more obviously product-first
- more obviously responsive-web-app-first
- closer to a modern Google-style landing rhythm

Meaning:

- one dominant headline
- one dominant search or product entry point
- one compact proof strip
- one short trust or clarity layer
- one clean CTA rail
- minimal scroll depth before product interaction

The homepage should stop carrying the full investor or architecture or company-story burden.

### Pitch role: `pitch.bookedai.au`

`pitch.bookedai.au` should become the canonical home for the deeper public narrative, including the content currently spread across the homepage such as:

- brand / revenue-engine framing
- executive-board or investor framing
- broader product proof story
- architecture explanation
- implementation or rollout explanation
- partner wall
- team story
- pricing context
- longer trust and narrative sections

## Ownership decision

- `bookedai.au` owns first-minute product entry and high-intent orientation
- `pitch.bookedai.au` owns deeper story, investor readability, and all expanded homepage narrative content
- `product.bookedai.au` remains the live product proof and deeper operational runtime

## Content split target

### Keep on `bookedai.au`

- top navigation with direct route utility
- concise hero
- product-first search or live entry
- compact proof that the web app works
- short pricing or offer cue only if it helps conversion
- short trust cue
- CTA into `Open Web App`
- supporting link into `pitch.bookedai.au`

### Move or expand on `pitch.bookedai.au`

- `HomepageBrandStatementSection`
- `HomepageExecutiveBoardSection`
- `HomepageOverviewSection`
- `ArchitectureInfographicSection`
- `ImplementationSection`
- full trust narrative where needed
- `PartnersSection`
- `TeamSection`
- broader pricing explanation
- any other homepage section whose primary job is explanation rather than immediate product entry

## Execution plan

1. Freeze the new public IA split in docs before UI changes.
2. Reduce `PublicApp.tsx` to a compact product-first composition.
3. Preserve the embedded live search or product-entry posture on homepage.
4. Expand `PitchDeckApp.tsx` so it absorbs the current homepage narrative inventory instead of losing content.
5. Refactor shared content ownership so homepage and pitch stop competing for the same long-form copy.
6. Verify route clarity and CTA continuity across:
   - `bookedai.au`
   - `pitch.bookedai.au`
   - `product.bookedai.au`

## Acceptance criteria

The realignment is only complete when:

- homepage reads as a simple product-first landing, not a mixed sales deck
- homepage reaches product interaction in the first screen or first short scroll
- pitch contains the deeper narrative currently living on homepage
- no important current homepage content is lost, only relocated
- CTA hierarchy is clear:
  - `bookedai.au` -> product-first
  - `pitch.bookedai.au` -> deeper story + proof + registration/product links
  - `product.bookedai.au` -> live runtime
- homepage search also feels alive and professional during slower matching, with visible progress and query-improvement prompts rather than a vague loading state
- homepage booking submit does not strand the user when the newer v1 write lane is degraded but legacy booking-session creation is still available

## Immediate next coding slice

- simplify `frontend/src/apps/public/PublicApp.tsx` composition
- map the moved homepage sections into `frontend/src/apps/public/PitchDeckApp.tsx`
- keep shared content sources explicit so homepage and pitch do not drift again
- keep homepage search-state UX and booking-submit resilience aligned with `docs/development/public-search-booking-resilience-ux-2026-04-23.md`

## Implementation results now landed on `2026-04-23`

The first realignment pass is now materially present in code:

- `frontend/src/apps/public/PublicApp.tsx` was simplified toward a shorter product-first composition
- homepage CTA language and surface split now push clearer role separation across `bookedai.au`, `pitch.bookedai.au`, and `product.bookedai.au`
- the homepage search experience now also carries staged progress messaging for slower matching conditions
- the homepage booking flow now includes a safer fallback posture when the v1 booking write lane is degraded

An additional refinement pass is now also locked for the parallel root Next.js homepage shell:

- the shell keeps the approved BookedAI logo and the existing top navigation
- the hero now follows a calmer search-led directory rhythm with one dominant search bar and lighter utility/supporting cues
- the rest of the homepage now prefers fewer cards, quieter copy, wider spacing, lighter typography weight, and a whiter Google-like visual baseline instead of a dark glass-heavy landing stack

This means the realignment now has both content-IA changes and search-flow quality changes attached to it.

## Additional landing on `2026-04-23`

The next refinement pass for this same plan is now also landed:

- homepage was redeployed first so the release order matched the operator request before pitch work resumed
- `PitchDeckApp.tsx` now starts with a more executive decision surface instead of a softer mixed intro, tightening the first-screen narrative around revenue workflow, rollout path, and conversion posture
- the pitch host now opts into static partner proof through `PartnersSection`, which removes the known production CORS chatter from the previous live `/api/partners` fetch attempt on `pitch.bookedai.au`
