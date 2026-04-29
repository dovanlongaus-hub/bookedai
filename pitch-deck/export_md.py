#!/usr/bin/env python3
"""
Export the 5-minute pitch content as Canva-importable markdown.

Mirrors the 12 slides of build_5min.py exactly — same structure, same content —
so the markdown stays in sync with the .pptx. Each slide is separated by `---`
(universal slide-break in Marp / Slidev / Reveal-md / most Canva paste flows).

Usage:
    cd pitch-deck
    ../.venv-pdf/bin/python export_md.py

Output:
    output/BookedAI_5min_Pitch_<DATE>.md
"""

from __future__ import annotations

from pathlib import Path

import content_5min as C


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "output"

SEP = "\n\n---\n\n"


# ---------- Front matter ----------
def front_matter() -> str:
    return (
        "---\n"
        f"title: BookedAI · 5-minute Investor Pitch\n"
        f"subtitle: {C.TAGLINE}\n"
        f"date: {C.DECK_DATE.isoformat()}\n"
        f"audience: {C.AUDIENCE}\n"
        f"presenter: {C.PRESENTER}\n"
        f"slides: 12\n"
        f"format: 16:9\n"
        f"theme: Apple-inspired · binary black/white + Apple Blue accent (#0071e3)\n"
        f"---\n"
    )


# ---------- Header note for Canva users ----------
HEADER_NOTE = """
> ## Canva import notes
>
> - Each slide is separated by a horizontal rule (`---`).
> - **Title** is the first `#` heading. Subtitle is `##`. Body is bullets / paragraphs.
> - Image references appear as `🖼️ <path>` blocks under each slide. Upload the
>   matching files from `pitch-deck/assets/` into Canva and place per the layout note.
> - Assets list is at the end of the document for batch upload.
> - Tone is professional / Apple-clean. Use **SF Pro Display** (or Inter) at 64-72pt
>   for hero, 36pt for slide titles, 16-18pt for body.
> - Accent colour (Apple Blue): `#0071E3`. Background light: `#FAFAFB`. Background
>   dark: `#05070C`.
"""


# ---------- Per-slide builders ----------

def s01_cover() -> str:
    return f"""# {C.COMPANY}

## {C.TAGLINE}

*{C.SUBTAGLINE}*

→ **Live demo:** `{C.DEMO_URL}`

{C.AUDIENCE}
{C.PRESENTER}
{C.DECK_DATE.isoformat()}

🖼️ **Visuals**
- `assets/mark-gradient.png` — gradient hero mark, right half of slide
- `assets/logo-light.png` — BookedAI logo, top-left
- Background: dark navy `#05070C`
- Accent hairline + demo chip in Apple Blue `#0071E3`
"""


def s02_problem() -> str:
    pains_md = "\n".join(
        f"- **{head}** — {body}" for head, body in C.PROBLEM["pains"]
    )
    return f"""# The Problem

## Service SMEs lose more revenue to slow replies than to bad SEO.

# {C.PROBLEM["big_stat"]}

**{C.PROBLEM["big_stat_label"]}**

> {C.PROBLEM["narrative"]}

### Where the revenue leaks

{pains_md}

🖼️ **Visuals**
- Mega red `38%` (Pt 180, color `#D93737`) on the left half
- 3 pain cards on the right, each with red accent strip
- Light background `#FAFAFB`
"""


def s03_solution() -> str:
    channels = "  ·  ".join(C.SOLUTION["channels"])
    agents_md = "\n".join(
        f"- **{title}** — {desc}" for title, desc in C.SOLUTION["agents"]
    )
    outputs_md = "\n".join(
        f"- **{head}** — {sub}" for head, sub in C.SOLUTION["outputs"]
    )
    return f"""# The Solution

## {C.SOLUTION["title"]}

*{C.SOLUTION["subtitle"]}*

### Channels (top of flow)

{channels}

### BookedAI AI Agent Layer (shared messaging_automation_service)

{agents_md}

### Outputs (bottom — auditable)

{outputs_md}

🖼️ **Visuals — flow diagram**
- Top row: 6 channel chips in light cards
- Middle: dark wide bar with 3 sub-cells (the agent core), labelled
  `BOOKEDAI AI AGENT LAYER · shared messaging_automation_service`
- Down-arrows ▼ between rows in Apple Blue
- Bottom row: 3 output panels with Apple-blue borders
"""


def s04_live_proof() -> str:
    chat = "\n".join(
        f"  - **[{role.upper()}]** {txt.replace(chr(10), ' / ')}"
        for role, txt in C.LIVE_PROOF["phone_lines"]
    )
    stats = "\n".join(f"- **{val}** — {lbl}" for val, lbl in C.LIVE_PROOF["stats"])
    return f"""# Live · production today

## {C.LIVE_PROOF["title"]}

### Real product screenshot

🖼️ `assets/product-after-search.png` — embed in browser-chrome frame.
Caption: *{C.LIVE_PROOF["screenshot_caption"]}*

### Telegram conversation (real)

> **{C.LIVE_PROOF["phone_header"]}**

{chat}

### Stats strip

{stats}

🖼️ **Layout**
- Left 60%: browser-frame product screenshot
- Right 40%: phone-shaped mockup with chat bubbles
  (customer = light bubble left, agent = Apple-blue bubble right)
- Bottom strip across left half: 3 GREEN stats
"""


def s05_tenant_cases() -> str:
    cards = []
    for case in C.TENANT_CASES:
        img = f"`assets/{case['image']}`" if case["image"] else "_(custom-rendered swim panel — no image)_"
        cards.append(
            f"""### {case["title"]}

`{case["subdomain"]}` · **{case["status"]}**

*{case["tagline"]}*

**Loop:** {case["loop_short"]}

**Evidence:** {case["evidence"]}

🖼️ Hero image: {img}
"""
        )
    return "# Tenant proof cases\n\n## Three live verticals. One reusable template.\n\n" + "\n\n".join(cards)


def s06_market() -> str:
    tiles_md = "\n\n".join(
        f"### {label}\n\n# {val}\n\n{det}" for label, val, det in C.MARKET["tiles"]
    )
    bb_md = "\n".join(
        f"- **{kicker}** — {line}" for kicker, line in C.MARKET["build_blocks"]
    )
    return f"""# Market

## {C.MARKET["title"]}

{tiles_md}

### Bottom-up build

{bb_md}

🖼️ **Visuals**
- 3 large size-tiles top row, value rendered Pt 48 in Apple Blue
- Bottom-up bullets below with mono-font kickers (`Year 1`, `Year 3`, `Year 5`)
"""


def s07_why_win() -> str:
    quad_md = "\n".join(
        f"- **{name}** — vertical depth `{vert}/100`, AI-native `{ai}/100`"
        for name, vert, ai in C.WHY_WIN["competitors"]
    )
    moats_md = "\n\n".join(
        f"### Moat {i+1} · {name}\n\n{body}"
        for i, (name, body) in enumerate(C.WHY_WIN["moats"])
    )
    return f"""# Why we win

## {C.WHY_WIN["title"]}

### Competitive landscape (vertical depth × AI-native)

{quad_md}

### Three moats compound

{moats_md}

🖼️ **Visuals**
- Left: 2D scatter quadrant (X = vertical depth, Y = AI-native).
  BookedAI dot enlarged + ringed in Apple Blue, top-right.
  Other competitors as grey dots labelled.
- Right: 3 moat cards, accent strip Apple Blue
"""


def s08_traction() -> str:
    shipped_md = "\n".join(f"- ✓ {line}" for line in C.TRACTION["shipped"])
    phases_md = "\n".join(
        f"- **{phase}** · `{dt}` — {descr}"
        for phase, dt, descr in C.TRACTION["phases"]
    )
    return f"""# Traction · Roadmap

## {C.TRACTION["title"]}

### Shipped — production today

{shipped_md}

### Next — Phase 17 → Phase 22+

{phases_md}

🖼️ **Visuals**
- Left card: green accent top, ✓ checks, labelled `SHIPPED · production today`
- Right card: vertical timeline rail with Apple-blue dots, phase rows
"""


def s09_money() -> str:
    comp_md = "\n".join(
        f"- **{name}** ({freq}) — {desc}"
        for name, freq, desc in C.MONEY["components"]
    )
    ue_md = "\n".join(
        f"- **{val}** {label} — {sub}"
        for val, label, sub in C.MONEY["unit_econ"]
    )
    return f"""# Business model · Unit economics

## {C.MONEY["title"]}

### Revenue model components

{comp_md}

### Unit economics

{ue_md}

🖼️ **Visuals**
- Top row: 3 model components as cards with Apple Blue accent strip
- Bottom row: 4 unit-econ tiles (Pt 36 metric value in Apple Blue)
"""


def s10_team() -> str:
    cards = []
    for m in C.TEAM_MEMBERS:
        badges = " · ".join(m["badges"])
        cards.append(
            f"""### {m["name"]} · {m["role"]}

🖼️ Portrait: `assets/{m["image"]}`

*{badges}*

{m["bio"]}
"""
        )
    return f"""# {C.TEAM_KICKER}

## {C.TEAM_TITLE}

> {C.TEAM_BODY}

{chr(10).join(cards)}

🖼️ **Layout**
- 4-column grid; each column = portrait (16:9 banner crop) + name bold + Apple-blue role pill + badges (mono caption) + bio caption
- Light background `#FAFAFB`, cards white with hairline divider
"""


def s11_ask() -> str:
    uof_md = "\n".join(
        f"- **{pct}** **{label}** — {descr}"
        for pct, label, descr in C.ASK["use_of_funds"]
    )
    ms_md = "\n".join(f"- → {line}" for line in C.ASK["milestones"])
    return f"""# {C.ASK["kicker"]}

# {C.ASK["headline"]}

*{C.ASK["structure"]}*

### Use of funds

{uof_md}

### Milestones this round funds

{ms_md}

🖼️ **Visuals**
- DARK background `#05070C`
- Hero `Raising A$1.5M pre-seed.` Pt 58, white, tight tracking
- 4 dark cards with Apple-blue-soft (#4D9EEC) percentage at Pt 40
- Milestones as → bullets in white
"""


def s12_thank_you() -> str:
    cta_md = "\n".join(f"- **{lbl}** — `{val}`" for lbl, val in C.THANK_YOU["ctas"])
    return f"""# {C.THANK_YOU["headline"]}

## {C.THANK_YOU["subhead"]}

🖼️ **Hero image:** `assets/{C.THANK_YOU["image"]}`
*Caption: Live customer-care continuity proof on bookedai.au*

### Take action

{cta_md}

> {C.THANK_YOU["closer"]}

🖼️ **Layout**
- Split: LEFT half = `Thank you.` (Pt 80, white) + subhead Apple-Blue-soft + 4 vertical CTA chips
- RIGHT half = hero image in dark panel with caption overlay band at bottom
- DARK background `#05070C`
"""


# ---------- Asset table ----------
def asset_table() -> str:
    rows = [
        ("logo-light.png",            "BookedAI logo on dark — slides 1, 12"),
        ("logo-dark.png",             "BookedAI logo on light — slides 2-11 corner"),
        ("mark-gradient.png",         "Gradient hero mark — slide 1 right"),
        ("product-after-search.png",  "Real product screenshot — slide 4 browser frame"),
        ("chess-screen-proof.png",    "Chess product screenshot — slide 5 chess card"),
        ("aimentor-hero.png",         "AI Mentor hero — slide 5 AI Mentor card"),
        ("team-long.png",             "Do Van Long portrait — slide 10"),
        ("team-angus.png",            "Angus Hoy portrait — slide 10"),
        ("team-yogesh.png",           "Yogesh Kumar portrait — slide 10"),
        ("team-tommy.png",            "Tommy Dam portrait — slide 10"),
        ("final-contact-proof.png",   "Final contact / customer-care hero — slide 12"),
    ]
    body = "\n".join(f"| `{f}` | {d} |" for f, d in rows)
    return (
        "# Asset checklist (upload to Canva)\n\n"
        "All paths relative to `pitch-deck/assets/`. Drag & drop into Canva's "
        "Uploads panel; then place per the slide layout notes above.\n\n"
        "| File | Where it goes |\n"
        "|---|---|\n"
        + body
    )


# ---------- Compose ----------
SLIDE_BUILDERS = [
    s01_cover, s02_problem, s03_solution, s04_live_proof,
    s05_tenant_cases, s06_market, s07_why_win, s08_traction,
    s09_money, s10_team, s11_ask, s12_thank_you,
]


def build_md() -> str:
    parts = [
        front_matter(),
        HEADER_NOTE.strip(),
    ]
    for fn in SLIDE_BUILDERS:
        parts.append(fn().rstrip())
    parts.append(asset_table())
    return SEP.join(parts) + "\n"


def main() -> Path:
    OUTPUT.mkdir(parents=True, exist_ok=True)
    out_path = OUTPUT / f"BookedAI_5min_Pitch_{C.DECK_DATE.isoformat()}.md"
    out_path.write_text(build_md(), encoding="utf-8")
    size_kb = out_path.stat().st_size / 1024
    n_slides = len(SLIDE_BUILDERS)
    print(f"✓ Exported {out_path.name}  ·  {n_slides} slides  ·  {size_kb:,.1f} KB")
    print(f"  → {out_path}")
    return out_path


if __name__ == "__main__":
    main()
