# Homepage/Admin Polish Live Verification Repair

- Timestamp: 2026-04-27T10:37:56.724674+00:00
- Source: docs/development/homepage-admin-polish-closeout-2026-04-27.md
- Category: release
- Status: closed

## Summary

Homepage/admin polish is live and verified. Source compare now checks deployed Vite frontend source, live verify scans Vite lazy chunks, healthcheck matches the new Bookedai.au title, production containers were rebuilt/recreated, stack health passed, and homepage/admin polish verification passed.

## Details

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
- added `scripts/compare_homepage_source_state.sh` to verify the deployed Vite homepage source and old-wording cleanup from the host worktree
- hardened `scripts/verify_homepage_admin_polish.sh` so live verification scans the Vite index bundle plus lazy chunks such as `PublicApp-*.js`, while limiting old-wording cleanup checks to homepage chunks to avoid false positives from unrelated architecture/admin chunks
- updated `scripts/healthcheck_stack.sh` to accept the current `Bookedai.au | The AI Revenue Engine for Service Businesses` homepage shell title

## Live deployment

```bash
cd /home/dovanlong/BookedAI
bash scripts/compare_homepage_source_state.sh
bash scripts/deploy_live_host.sh
bash scripts/healthcheck_stack.sh
bash scripts/verify_homepage_admin_polish.sh
```

The first deploy attempt proved the source/pipeline split: the original compare script checked the root Next.js shell while production builds from `frontend/`, and the first live verifier only scanned `index-*.js` even though the homepage copy is code-split into `PublicApp-*.js`.

The corrected verification pass rebuilt the production Vite app, recreated backend/web/beta containers, restarted proxy, reactivated the n8n intake workflow, and passed stack health at `2026-04-27T10:35:48Z`.

## Live verification result

### Homepage
- homepage returns HTTP 200
- title shows `Bookedai.au | The AI Revenue Engine for Service Businesses`
- description metadata shows the cleaned demand-capture/revenue conversion copy
- live chunks include the hero headline, hero eyebrow, `Start in product`, `Start with BookedAI.au`, `Product proof`, `What matters most`, `Questions teams ask most`, `Ready to move faster?`, and both product-flow URLs
- homepage chunks no longer include old labels such as `Final conversion prompt`, `Proof From The Revenue Layer`, `Tenant investigation`, or `BookedAI.au Operator`

### Admin
- admin entry and key pages show `workspace` / `review` wording where updated
- no user-facing `BookedAI.au Operator` label remains on the edited surfaces
- support mode banners and review messaging read naturally

## Status

Closed live. The remaining repo note is operational, not product-facing: `.github/workflows/release-gate.yml` is still local-only until the GitHub token has `workflow` scope.
