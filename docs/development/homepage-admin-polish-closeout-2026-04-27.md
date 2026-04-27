# Homepage and Admin Copy Polish Closeout, 2026-04-27

## Scope completed in code

### Homepage
- repositioned homepage around business-owner value
- rewrote hero, CTA flow, trust blocks, proof section, pricing framing, FAQ, and final CTA
- routed hero submit into the real product flow at `product.bookedai.au`
- cleaned internal-sounding labels and prompt-like wording from homepage sections
- standardized visible homepage branding to `BookedAI.au`
- updated homepage metadata title/description/Open Graph/Twitter title to `Bookedai.au`

### Public-facing sections
- cleaned testimonial, pricing, dashboard preview, trust bar, and final CTA copy so they read like product copy instead of internal notes
- tightened microcopy and reduced copy density for faster scanning
- added more polished visual treatment to hero, cards, proof section, and CTA surfaces

### Admin surfaces
- cleaned a broad set of admin page descriptions and headings to reduce words like `control plane`, `operator`, and `investigation` where they were user-facing and unnecessary
- shifted many visible labels toward `workspace`, `review`, `team`, and clearer plain-English wording
- standardized visible brand references toward `BookedAI.au`

### Tests and alignment
- updated homepage responsive QA spec for the new homepage behavior
- updated wording-related tests to match `review-first` phrasing
- TypeScript sanity checks passed after edits

## Remaining deploy step
Because this runtime still cannot execute host deploy directly, the live deploy step must be run on the VPS host:

```bash
cd /home/dovanlong/BookedAI
bash scripts/deploy_live_host.sh
```

## Live verification checklist after deploy

### Homepage
- homepage returns HTTP 200
- title shows `Bookedai.au | The AI Revenue Engine for Service Businesses`
- hero headline and CTA reflect the new business-owner positioning
- hero submit goes to `product.bookedai.au`
- trust/proof/pricing/final CTA copy reflects the cleaned wording
- no internal-feeling labels like `control plane`, `operator`, `investigation`, `Final conversion prompt`, or `Proof From The Revenue Layer`

### Admin
- admin entry and key pages show `workspace` / `review` wording where updated
- no user-facing `BookedAI.au Operator` label remains on the edited surfaces
- support mode banners and review messaging read naturally

## Suggested final follow-up
- run live verify after deploy
- if all good, archive a short release note and optionally sync docs/Discord/Notion summary
