# BookedAI.au Chatbot Landing Page UI Section Plan

## Objective

Translate the new landing-page design direction into an implementation-ready plan that fits the current Next.js component structure.

## Current Baseline

Relevant files already in place:

- [app/page.tsx](/home/dovanlong/BookedAI/app/page.tsx)
- [app/globals.css](/home/dovanlong/BookedAI/app/globals.css)
- [components/sections/hero-section.tsx](/home/dovanlong/BookedAI/components/sections/hero-section.tsx)
- [components/sections/trust-bar.tsx](/home/dovanlong/BookedAI/components/sections/trust-bar.tsx)
- [components/sections/dashboard-preview-section.tsx](/home/dovanlong/BookedAI/components/sections/dashboard-preview-section.tsx)
- [components/sections/final-cta-section.tsx](/home/dovanlong/BookedAI/components/sections/final-cta-section.tsx)
- [components/ui/button.tsx](/home/dovanlong/BookedAI/components/ui/button.tsx)
- [components/ui/glass-card.tsx](/home/dovanlong/BookedAI/components/ui/glass-card.tsx)

There is also a second and more mature public landing system in the Vite app:

- [frontend/src/app/AppRouter.tsx](/home/dovanlong/BookedAI/frontend/src/app/AppRouter.tsx)
- [frontend/src/apps/public/PublicApp.tsx](/home/dovanlong/BookedAI/frontend/src/apps/public/PublicApp.tsx)
- [frontend/src/components/landing/sections/HeroSection.tsx](/home/dovanlong/BookedAI/frontend/src/components/landing/sections/HeroSection.tsx)
- [frontend/src/components/landing/sections/BookingAssistantSection.tsx](/home/dovanlong/BookedAI/frontend/src/components/landing/sections/BookingAssistantSection.tsx)
- [frontend/src/components/landing/sections/PartnersSection.tsx](/home/dovanlong/BookedAI/frontend/src/components/landing/sections/PartnersSection.tsx)

## Source Of Truth Decision

Before implementation starts, we should explicitly choose which public landing surface owns the redesign.

### Option A

Use the Next landing in `app/*` as the primary implementation target.

### Option B

Use the Vite public app in `frontend/src/apps/public/*` and `frontend/src/components/landing/*` as the primary implementation target.

### Recommendation

Prefer `frontend/src/components/landing/*` as the implementation source of truth if the user-facing production landing already routes through the Vite public app.

Why:

- it already contains a reusable landing section system
- it already has assistant/search-oriented product UI
- it is structurally closer to the requested conversational landing
- it reduces the chance of building a strong redesign on the wrong surface

If the redesign work starts before this is settled, the `app/*` version and the Vite version may diverge immediately.

## High-Level Direction

Keep:

- dark premium shell
- existing font pairing
- existing glass-card foundation
- section-by-section marketing page structure

Change:

- hero from revenue dashboard emphasis to conversational UI emphasis
- accent hierarchy from blue-first to purple-first
- trust/content language from broad platform language to chatbot-platform revenue language
- CTA hierarchy so `Try Now` becomes the dominant action

## Recommended Section Order

1. Hero with conversational UI preview and streaming reply
2. Conversational value strip
3. AI capability cards
4. Conversation-to-revenue demo section
5. Integration logos section
6. Revenue outcome framing section
7. FAQ or objection handling
8. Final CTA

## Component Mapping

## 1. Hero Section

### File

[components/sections/hero-section.tsx](/home/dovanlong/BookedAI/components/sections/hero-section.tsx)

### Current state

- Has sticky nav
- Strong headline area
- CTA pattern already exists
- Right column currently shows revenue cards and live activity

### Required change

Replace the right-column revenue dashboard cluster with a conversational UI preview.

### Hero content update

Use:

- Eyebrow: `BookedAI.au Chat Revenue Platform`
- Headline: `The AI Revenue Engine That Turns Conversations Into Revenue`
- Supporting copy about chat, calls, email, follow-up, bookings, and revenue
- Primary CTA: `Try Now`
- Secondary CTA: `See Live Demo`

### Hero preview structure

Add a reusable `chat preview` composition inside the hero:

- window chrome/header
- assistant identity row
- user bubble
- assistant bubble with streamed text
- typing indicator row
- outcome chips row
- optional mini rail for `Qualified`, `Booked`, `Recovered`

### Suggested implementation approach

- Keep the nav logic as-is
- Keep the left/right grid
- Remove `revenueCards`
- Replace with a small local data model for a fake conversation
- Add client-side streaming animation using `useEffect` + character slicing
- Keep the preview self-contained within hero first

### Alternate implementation target

If the Vite public app is the chosen source of truth, reuse and reshape:

- [frontend/src/components/landing/sections/HeroSection.tsx](/home/dovanlong/BookedAI/frontend/src/components/landing/sections/HeroSection.tsx)
- [frontend/src/components/landing/data.ts](/home/dovanlong/BookedAI/frontend/src/components/landing/data.ts)

That path is likely faster than rebuilding the same structure from the separate Next brochure page.

## 2. Conversational Value Strip

### File

[components/sections/trust-bar.tsx](/home/dovanlong/BookedAI/components/sections/trust-bar.tsx)

### Current state

- Already a pill-based strip
- Easy to repurpose

### Required change

Rewrite the content to reflect conversation channels and booking workflows instead of generic commercial visibility messaging.

### Suggested pill content

- Website Chat
- Missed Calls
- SMS Follow-Up
- Email Enquiries
- Booking Requests
- Lead Recovery

### Copy update

Current eyebrow should become something like:

`Conversations captured across the channels that usually leak revenue`

## 3. AI Capability Cards

### File

Likely still implemented in [app/page.tsx](/home/dovanlong/BookedAI/app/page.tsx) with card grids using `GlassCard`.

### Current state

- Several generic business-value grids already exist
- Good base for a capabilities section

### Required change

Refocus one grid into chatbot-platform capabilities.

### Recommended cards

- Instant AI Replies
- Lead Qualification
- Booking Guidance
- Follow-Up Recovery
- Calendar Handoff
- Revenue Visibility

### Implementation note

This can remain inline in `app/page.tsx` initially unless it grows too large.
If the section becomes more custom, split into a new file such as:

- `components/sections/capabilities-section.tsx`

## 4. Conversation Demo Section

### File

Best candidate to evolve:

[components/sections/dashboard-preview-section.tsx](/home/dovanlong/BookedAI/components/sections/dashboard-preview-section.tsx)

### Current state

- Already positioned as a major explanatory section
- Currently shows metrics and performance lists

### Required change

Convert this section into a `conversation-to-revenue demo`.

### Recommended structure

- Left column: section heading and explanation
- Right column: scenario card with conversation transcript
- Optional segmented controls for scenarios like `Salon`, `Clinic`, `Trades`, `Tutor`
- End state panel showing `Booked`, `Callback`, `Quote`, or `Recovery`

### Why this mapping works

This file already owns a mid-page “proof” section.
It is the cleanest place to shift from abstract metrics to realistic product behavior.

### Alternate implementation target

If the Vite public surface is selected, the better reuse path is:

- [frontend/src/apps/public/HomepageSearchExperience.tsx](/home/dovanlong/BookedAI/frontend/src/apps/public/HomepageSearchExperience.tsx)
- [frontend/src/components/landing/sections/BookingAssistantSection.tsx](/home/dovanlong/BookedAI/frontend/src/components/landing/sections/BookingAssistantSection.tsx)

Those files already carry assistant-driven interaction patterns and are closer to a production-grade conversational preview.

## 5. Integration Logos Section

### File

New section recommended.

### Proposed file

- `components/sections/integrations-section.tsx`

### Content

- Heading
- short supporting copy
- clean logo grid

### Implementation note

Start with text-based neutral logo tiles if final SVG assets are not ready.
That keeps layout work moving without blocking on branding assets.

### Alternate implementation target

If we build on the Vite landing system, adapt:

- [frontend/src/components/landing/sections/PartnersSection.tsx](/home/dovanlong/BookedAI/frontend/src/components/landing/sections/PartnersSection.tsx)

Keep its fallback behavior intact if it depends on live partner data.

## 6. Revenue Outcome Framing

### File

Could stay in [app/page.tsx](/home/dovanlong/BookedAI/app/page.tsx) or become:

- `components/sections/outcomes-section.tsx`

### Recommended panels

- More qualified conversations
- Faster booking conversion
- Fewer missed opportunities
- Better revenue visibility

### Note

This section should bridge the conversational demo to the broader revenue-engine story.

## 7. FAQ

### File

Currently handled inline in [app/page.tsx](/home/dovanlong/BookedAI/app/page.tsx)

### Required change

Update questions to support the chatbot-platform framing.

### Suggested questions

- Does BookedAI.au only work on website chat?
- Can it help recover missed calls and after-hours enquiries?
- How does it turn conversations into bookings?
- Can I see which conversations actually generate revenue?

## 8. Final CTA

### File

[components/sections/final-cta-section.tsx](/home/dovanlong/BookedAI/components/sections/final-cta-section.tsx)

### Required change

Make `Try Now` the primary CTA.
Optional secondary CTA can remain `Book a Demo`.

### Copy direction

- Headline: `Start Turning Conversations Into Revenue`
- Support line: `See how BookedAI.au captures demand, qualifies intent, and moves customers toward the right next step.`

## Token and Styling Changes

## Accent hierarchy

### File

[app/globals.css](/home/dovanlong/BookedAI/app/globals.css)

### Required change

Elevate purple as the main marketing accent.

Recommended updates:

- `--accent-purple` becomes primary marketing accent
- `--brandGradient` should shift to purple-led
- `--shadowGlow` should use purple glow instead of blue-led glow

### Example direction

- from: blue -> purple -> green
- to: purple -> violet -> blue with green used only as success state

## New utility opportunities

Consider adding utilities for:

- `chat bubble`
- `typing dots`
- `stream cursor`
- `logo tile`
- `outcome chip`

These can live in `@layer components` or `@layer utilities` inside [app/globals.css](/home/dovanlong/BookedAI/app/globals.css).

## Interaction Plan

## Streaming text demo

### Best placement

Hero section first

### Behavior

- Start with a short delay
- Reveal assistant text by character
- Show a blinking cursor at end
- Keep total stream short enough to avoid user frustration

### Technical recommendation

- Local state with `useEffect`
- Derive `displayedText` from a constant string
- Respect `prefers-reduced-motion` if motion system is expanded later

## Card motion

- Reuse existing motion language from `FadeIn`
- Add only small hover lift and border-brightening
- Keep movement subtle and premium

## Suggested Build Sequence

1. Choose landing source of truth: `app/*` or `frontend/src/components/landing/*`
2. Update tokens in the chosen visual system first
3. Rebuild hero section with conversational preview
4. Rewrite trust strip to channel-focused pills
5. Convert proof section into conversation demo
6. Add or adapt integrations section
7. Rewrite capability and FAQ copy
8. Update final CTA
9. Polish motion and responsive behavior

## Risks and Guardrails

### Risk

The page could drift into a generic AI chatbot template.

### Guardrail

Every section should tie back to booking, follow-up, qualification, or revenue.

### Risk

Purple accent could become visually loud.

### Guardrail

Use purple primarily for CTA, gradients, key chips, and highlight strokes.
Keep most surfaces neutral.

### Risk

The current page message could become fragmented between chatbot language and revenue-engine language.

### Guardrail

Use chatbot-platform interaction as the product proof, and revenue-engine language as the business payoff.

## Recommended Next Implementation Slice

If we move into code after this planning pass, the highest-value first slice is:

1. choose the public landing source of truth
2. update its main token file
3. rebuild hero around conversational preview
4. adapt the trust/channel strip
5. convert the proof section into a conversation-to-revenue demo

Those changes alone would reshape the landing direction materially before touching the lower sections.
