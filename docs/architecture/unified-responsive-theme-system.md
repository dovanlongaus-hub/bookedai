# BookedAI Unified Responsive Theme System

Date: `2026-04-18`

Status: `active canonical design direction`

Reference analyzed:

- `https://ui-ux-pro-max-skill.nextlevelbuilder.io/demo/ai-writing-assistant`

## 1. Goal

This document defines the shared theme/template direction that BookedAI should use for:

- public marketing web
- product runtime web app
- internal admin web app
- mobile-responsive web experiences
- future native-wrapper or mobile-web shells

The goal is not to clone the reference page literally.

The goal is to extract its strongest visual system decisions and adapt them into a reusable BookedAI design language that fits a revenue-engine product.

## 2. What we intentionally borrowed from the reference

The reference page contributes these high-value UI patterns:

- dark-first premium canvas
- strong display-vs-body typography contrast
- glass and layered-card surfaces instead of flat blocks
- restrained aurora/glow backgrounds that create atmosphere without hurting readability
- clear CTA hierarchy with one dominant primary action and one framed secondary action
- sticky floating navigation with a compact mobile sheet pattern
- section compositions that work equally well as desktop split layouts and stacked mobile cards
- product-demo framing that makes the UI feel like a tool, not a brochure

## 3. What we changed for BookedAI

BookedAI should not look like a generic AI-writing tool.

The shared theme is adapted in these ways:

- color system stays BookedAI-first: blue and green carry the commercial signal, purple remains secondary, amber is used only as a highlight glow
- copy rhythm is more operational and revenue-focused
- card system is designed to support dashboard, shortlist, booking, payment, and admin surfaces
- light cards still exist for admin clarity and mixed-content pages, even though the overall brand direction is dark-first
- mobile behavior prioritizes search, shortlist, booking actions, and operator handoff instead of content-heavy storytelling

## 4. Canonical visual DNA

### 4.1 Typography

- display font: `Space Grotesk`
- body font: `DM Sans`
- fallback stack still includes SF Pro and Inter for resilience

Rules:

- headings and hero numbers use the display family
- all paragraphs, labels, forms, and nav items use the body family
- uppercase eyebrow text should be short and highly intentional

### 4.2 Color roles

Primary tokens:

- background deep: `#070B16`
- background base: `#0B1020`
- surface base: `#182235`
- surface strong: `#1E2B44`
- text primary: `#F8FAFC`
- text secondary: `#94A3B8`
- primary blue: `#4F8CFF`
- accent green: `#22C55E`
- accent purple: `#8B5CF6`
- accent amber: `#F97316`

Usage rules:

- blue is the main conversion signal
- green is the positive outcome and revenue-confirmation signal
- purple is depth, sheen, and premium accent only
- amber is atmospheric, not primary CTA color

### 4.3 Surface model

We now standardize on 4 surface families:

1. `Light premium card`
   Use for admin content blocks, mixed-density content, docs-like panels, and safe readability zones.
2. `Light subtle card`
   Use for secondary modules, filters, helper panels, and grouped supporting info.
3. `Dark glass card`
   Use for hero product frames, runtime panels, spotlight modules, and pricing emphasis.
4. `Gradient border card`
   Use only for featured plans, priority CTA blocks, or single flagship proof modules.

### 4.4 Motion

Motion should be soft and directional:

- fade-up entry
- slow float on hero accents only
- hover lift of `1px` to `2px`
- shadow intensification on active CTA or highlighted card

Avoid:

- bouncy consumer-style motion
- constant looping movement in dense admin views
- many competing animated gradients

## 5. Shared layout system

### 5.1 Shells

All future surfaces must fit one of these shell types:

- `Marketing shell`
  Dark-first atmospheric canvas, storytelling sections, stronger brand glow.
- `Runtime shell`
  Dark glass plus focused booking/product frames.
- `Admin shell`
  Light premium cards on a dark base or soft neutral layer, optimized for dense information.
- `Mobile sheet shell`
  Rounded floating sheet, strong backdrop blur, single-primary-action bias.

### 5.2 Grid

- container max width: `1200px`
- reading width: `760px`
- desktop split sections: `1.05fr / 0.95fr`
- desktop gap: `32px`
- mobile gap: `20px`

### 5.3 Section rhythm

- mobile vertical section padding: `72px`
- tablet vertical section padding: `88px`
- desktop vertical section padding: `112px`

## 6. Shared component rules

### 6.1 Navigation

- nav is floating, glassy, rounded, and slightly separated from the page edge
- nav links are pills, not plain text rows
- mobile nav becomes a premium sheet, not a basic dropdown

### 6.2 Buttons

- primary buttons are full-energy gradients with strong depth and lift
- secondary buttons are framed glass pills
- destructive buttons should not inherit the premium gradient

### 6.3 Pills and badges

- chips are rounded and slightly elevated
- status pills use semantic color but keep the same structural shape
- eyebrow pills are uppercase and short

### 6.4 Cards

- cards should feel like instruments or control panels
- use borders plus soft shadow, not heavy borders alone
- when a card is interactive, hover changes should affect border, shadow, and translation together

### 6.5 Forms

- inputs should feel like command surfaces, not plain browser fields
- use softer corners than the old Apple-inspired theme
- placeholder text should remain readable on dark glass

## 7. Responsive rules for web and mobile

Mandatory rules:

- mobile-first stacking before desktop splitting
- hero actions must wrap cleanly on small widths
- sticky nav cannot consume too much vertical space on mobile
- modal and menu surfaces should use sheet behavior with strong radius and blur
- booking/search input blocks must stay usable with one-thumb interaction
- image or dashboard preview blocks must collapse below content, not force horizontal scroll

## 8. Token ownership after this update

Implementation source of truth:

- `frontend/src/theme/bookedai-brand-kit.css`
  Owns BookedAI-specific premium tokens and future-facing shell primitives.
- `frontend/src/theme/minimal-bento-template.css`
  Owns legacy-compatible shared classes consumed by current React surfaces.
- `frontend/src/styles.css`
  Owns the Tailwind bridge and app-wide background/motion glue.
- `app/globals.css`
  Mirrors the typography contract for the Next app surface.

## 9. New baseline classes added or strengthened

Primary future-facing classes:

- `.bookedai-brand-shell`
- `.bookedai-shell-nav`
- `.bookedai-stage-frame`
- `.bookedai-mobile-sheet`
- `.bookedai-signal-pill`
- `.bookedai-command-input`
- `.bookedai-brand-display`
- `.bookedai-brand-copy`
- `.bookedai-split-grid`

Legacy-compatible classes visually upgraded:

- `.template-nav`
- `.template-card`
- `.template-card-subtle`
- `.template-card-dark`
- `.booked-button`
- `.booked-button-secondary`
- `.booked-pill`
- `.booked-menu-button`

## 10. Do and do not

Do:

- reuse tokens before adding new hex values
- keep one dominant CTA per section
- use display typography mostly for hero, section headers, metrics, and proof
- keep gradients atmospheric and directional

Do not:

- introduce a second unrelated design language for admin vs public
- revert to flat white cards everywhere
- overuse purple as the main accent
- add new one-off shadows or radii without first mapping them into the token system

## 11. Final decision

BookedAI now standardizes on a `premium revenue-engine theme`:

- dark-first foundation
- light-card readability layer
- display/body font pairing
- glass nav and sheet patterns
- aurora atmosphere
- high-clarity responsive card system

This is the shared theme/template direction for the project going forward.
