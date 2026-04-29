# BookedAI Investor Pitch Deck Generator

Two pitch decks for the BookedAI program, generated from the live source-of-truth
content (executive briefing, pitch-investor-slides.ts, branding, screenshots).

## Decks

### v1 — Long-form investor deck (28 slides)

`output/BookedAI_Investor_Pitch_<YYYY-MM-DD>.pptx` — full board-room narrative.
Cover → Vision → Problem → Why Now → Solution → Surfaces → Journey → 3 Agents →
Live Evidence → 3 Tenant Cases (Chess · AI Mentor · Future Swim) → Architecture →
Tech Stack → Messaging Layer → Channel Coverage → Market → Competitive →
Defensibility → Business Model → Unit Economics → Traction → Roadmap →
Team → Partners → Financial → Ask → CTA.

Build:
```sh
../.venv-pdf/bin/python build_pitch_deck.py
```

### v2 — 5-minute pitch (12 slides, visual-heavy)

`output/BookedAI_5min_Pitch_<YYYY-MM-DD>.pptx` — for WSTI judges / 5-min stages.
Embeds real production screenshots, chess product screenshot, AI Mentor hero
artwork, 4 real team-member portraits (pulled from pitch.bookedai.au), and a
phone-style Telegram conversation drawn natively in shapes. Closes on a
dedicated Thank You slide with the live customer-care hero image.

Slides (~25s each):
1. Cover — bold tagline + demo URL chip
2. Problem — massive 38% stat hook + 3 pain bullets
3. Solution — flow diagram (channels → agent layer → ledger) drawn in shapes
4. Live Proof — real product screenshot in browser frame + Telegram phone mockup
5. Tenant Cases — Chess · AI Mentor · Future Swim, 3-up with real screenshots
6. Market — TAM/SAM/SOM + bottom-up build
7. Why We Win — 2D quadrant scatter (BookedAI alone top-right) + 3 moats
8. Traction & Roadmap — shipped left, vertical timeline right
9. Money — business model + unit economics combined
10. **Team** — 4 portraits + roles + bios (Do Van Long · Angus Hoy · Yogesh Kumar · Tommy Dam)
11. The Ask — A$1.5M, use of funds, milestones
12. **Thank You + CTA image** — split layout w/ hero image and 4 CTA chips

Build:
```sh
../.venv-pdf/bin/python build_5min.py
```

### Markdown export — for Canva import / visual editing

`output/BookedAI_5min_Pitch_<YYYY-MM-DD>.md` mirrors the 12-slide structure as
clean Markdown. Each slide separated by `---` (universal Marp/Slidev/Canva
paste convention). Includes:
- Front matter (title, audience, format, theme tokens)
- Canva-specific import notes at the top
- Per-slide visual / layout hints under each slide (`🖼️` blocks)
- Asset checklist table at the end for batch upload to Canva

Export:
```sh
../.venv-pdf/bin/python export_md.py
```

To use in Canva:
1. Open Canva → create blank presentation
2. Paste the markdown body, or use Canva's "Magic Write / Magic Switch" import
3. Drag & drop files from `pitch-deck/assets/` into Canva Uploads
4. Place each image per the per-slide layout hint

## Files

| File | Vai trò |
|---|---|
| `theme.py` | Apple-design tokens (palette, typography, rhythm) — shared by both decks |
| `content.py` | v1 content (28 slides) — single source of truth, edit to update |
| `content_5min.py` | v2 content (10 slides) — tight 5-min narrative |
| `build_pitch_deck.py` | v1 PPTX assembler |
| `build_5min.py` | v2 PPTX assembler with rich visualizations |
| `export_md.py` | Markdown exporter (Canva-importable) — same 12 slides as v2 |
| `assets/` | Logos + tenant heroes (PNG, converted from SVG) + real screenshots + team portraits |
| `output/` | Generated `.pptx` and `.md` files (gitignored) |

## Source content provenance

- `docs/executive-briefing/00-08` — board-ready briefings (10 markdown files)
- `frontend/src/apps/public/pitch-investor-slides.ts` — live pitch surface data
- `README.md` / `DESIGN.md` / `prd.md` — product baseline
- `public/branding/` — BookedAI logos (PNG)
- `public/tenant-assets/chess/`, `public/tenant-assets/ai-mentor/` — tenant heroes (SVG → PNG via cairosvg)
- `artifacts/screenshots/`, `output/playwright/` — real production screenshots

## Re-build after editing content

Both generators are idempotent — sửa `content.py` / `content_5min.py` rồi chạy lại
script tương ứng. Output is overwritten in place.

## Setup (first time)

```sh
sudo ../.venv-pdf/bin/pip install -r requirements.txt
```

Requires `python-pptx`, `Pillow`, and `cairosvg` (for SVG → PNG asset prep).
