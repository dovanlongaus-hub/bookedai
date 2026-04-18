# BookedAI Sprint 3 Visual Review Rubric

Date: `2026-04-18`

Document status: `active visual review rubric`

## 1. Purpose

This document is the shared visual review standard for Sprint 3.

It exists so Product, Frontend, QA, and PM review the landing against one consistent bar instead of subjective opinions.

It is intended for:

- section review
- merged-lane review
- pre-closeout QA
- final Sprint 3 acceptance

Primary references:

- `docs/architecture/landing-page-system-requirements.md`
- `docs/architecture/bookedai-brand-ui-kit.md`
- `docs/architecture/sprint-3-implementation-package.md`
- `docs/development/sprint-3-code-ready-development-handoff.md`
- `docs/development/sprint-3-code-ready-implementation-slices.md`

## 2. Review scale

Use this score for each rubric line:

- `0` = not acceptable
- `1` = weak or inconsistent
- `2` = acceptable but needs polish
- `3` = strong and ready

Suggested decision guide:

- `0-1` on any critical line blocks closeout
- mostly `2` means usable but needs polish backlog
- mostly `3` means Sprint 3 quality bar is met

## 3. Critical gates

These gates are mandatory.

If any gate fails, the section is not ready.

### Gate A - Startup-grade impression

The section must feel like a professional tech-startup product surface, not generic AI marketing.

### Gate B - Branding consistency

The section must match the approved BookedAI brand system in type, color, surface treatment, and CTA language.

### Gate C - Logo consistency

Where logo appears, it must be readable, correctly scaled, and consistent with the approved logo system.

### Gate D - Visual-first rule

The section must read roughly as `80%` visual communication and `20%` text communication.

### Gate E - Text quality

The text must be concise, commercially sharp, and limited to high-value phrases.

## 4. Whole-page rubric

Use this for page-level review after lanes are merged.

| Review area | What to check | Score 0-3 |
|---|---|---|
| First impression | the page feels premium, startup-grade, and product-real within seconds | `__` |
| Structural clarity | section order is clear and the page has a strong scan path | `__` |
| Brand consistency | type, color, surfaces, badges, and CTAs feel like one system | `__` |
| Logo consistency | logo treatment is consistent across header, hero, and footer | `__` |
| Visual ratio | the page remains graphic-led instead of paragraph-led | `__` |
| Commercial clarity | the value proposition, pricing model, and CTA hierarchy are obvious | `__` |
| Product realism | proof blocks and flows feel like credible product surfaces | `__` |
| Mobile quality | the page remains premium and decisive on mobile | `__` |

## 5. Section-level rubric

Use this for every section in the primary landing spine.

### 5.1 Header

Check:

- logo is readable and appropriately scaled
- nav is clean and not cluttered
- CTA hierarchy is obvious
- mobile behavior preserves action priority
- the header feels premium rather than utility-only

Score: `__`

### 5.2 Hero

Check:

- BookedAI positioning is clear in under five seconds
- the visual proof system dominates attention
- the section feels investor-grade and product-real
- the headline is concise and high-value
- the CTA pair is obvious and well-prioritized
- the logo presence is strong and not visually lost

Score: `__`

### 5.3 Problem

Check:

- the section shows pain visually, not through heavy paragraphs
- the structure is easy to scan
- visuals explain urgency and missed-demand risk quickly
- copy is brief and commercially sharp

Score: `__`

### 5.4 Solution

Check:

- the solution is shown as a clear flow, not a generic feature list
- the section feels like a system, not disconnected cards
- graphics and rails carry most of the explanation
- text is short and useful

Score: `__`

### 5.5 Product Proof

Check:

- widgets and proof blocks feel product-real
- approved widget vocabulary is used consistently
- no fake audited metric feeling is introduced
- cards are scan-friendly and premium

Score: `__`

### 5.6 Booking Assistant Preview

Check:

- the assistant preview feels like product proof, not a raw widget
- the layout has strong framing and signal cues
- the section is still visually led
- the demo does not overpower the landing narrative
- while live-read search is running, the user sees reassuring progress copy instead of an empty or frozen-looking state
- the waiting state includes visible motion such as a spinner or search pulse
- stale results do not remain on screen while a new query is still being resolved

Score: `__`

### 5.7 Trust and FAQ

Check:

- trust feels concrete and realistic
- FAQ looks like a premium proof surface, not plain text dumping
- escalation and handoff realism are visible
- the section remains concise

Score: `__`

### 5.8 Partners and Infrastructure Proof

Check:

- partner wall feels curated and premium
- logos support credibility without becoming clutter
- layout does not look like a generic sponsor strip
- branding remains consistent with the rest of the page

Score: `__`

### 5.9 Pricing

Check:

- pricing clearly reads as setup plus performance-based commission
- pricing cards are scan-friendly and decision-oriented
- the section feels commercially mature
- the section stays inside the same visual system as hero and proof sections
- no generic SaaS-tier drift appears

Score: `__`

### 5.10 Final CTA

Check:

- the final close feels decisive and premium
- one dominant action is obvious
- the visual system remains strong, not text-heavy
- the section earns the conversion moment

Score: `__`

### 5.11 Footer

Check:

- footer supports the product brand rather than acting as an afterthought
- logo treatment stays consistent
- final supporting actions remain clear
- the footer does not visually collapse compared with the rest of the page

Score: `__`

## 6. 80/20 review test

Use these quick questions for each major section:

- does the visual system explain more than the text?
- if half the paragraph copy were removed, would the section still work?
- are charts, cards, rails, imagery, shells, or flow visuals doing the main job?
- is any text block longer than the visual system actually needs?

If the answer pattern trends negative, the section is too text-heavy.

## 7. Copy quality review test

Use this test for every section headline and body block.

Keep copy only if it does one of these jobs:

- positions the product
- clarifies commercial meaning
- labels proof
- drives CTA choice
- explains a critical decision point

Cut or rewrite copy if it is:

- generic
- repetitive
- decorative
- obvious from the visuals
- too long for the scan path

## 8. Logo review test

Check all visible logo placements.

Pass only if:

- the correct logo variant is used
- the mark has enough contrast
- the scale is readable
- spacing around the mark is clean
- the logo treatment matches the rest of the page

Fail if:

- the logo feels tiny
- the logo is cropped badly
- the logo style changes between key sections
- the logo disappears into background noise

## 9. Review workflow

Use this order:

1. FE owner self-review against this rubric
2. FE lead review for system consistency
3. Product review for message quality
4. QA review for responsive and merged-lane quality
5. PM review for closeout readiness

## 10. Closeout bar

Sprint 3 visual closeout should only happen when:

- no critical gate fails
- all primary sections score at least `2`
- hero, pricing, and final CTA score at least `3` or have explicit approved carryover notes
- branding and logo consistency pass across the spine
- the page still feels visual-first after merged-lane integration

## 11. Related references

- [Sprint 3 Code-Ready Development Handoff](./sprint-3-code-ready-development-handoff.md)
- [Sprint 3 Code-Ready Implementation Slices](./sprint-3-code-ready-implementation-slices.md)
- [Sprint 3 Owner Execution Checklist](./sprint-3-owner-execution-checklist.md)
- [Sprint 3 Kickoff Checklist](./sprint-3-kickoff-checklist.md)
