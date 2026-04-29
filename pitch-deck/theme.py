"""
BookedAI pitch deck theme — Apple-inspired palette and typography.

Mirrors the design system documented in docs/executive-briefing/07-customer-experience.md
and DESIGN.md: SF Pro typography, binary black/light-gray rhythm, single Apple Blue
accent, large negative letter-spacing on display, generous whitespace.
"""

from pptx.dml.color import RGBColor
from pptx.util import Inches, Pt


# ---------- 16:9 canvas ----------
SLIDE_WIDTH = Inches(13.333)
SLIDE_HEIGHT = Inches(7.5)
MARGIN_X = Inches(0.6)
MARGIN_Y = Inches(0.55)


# ---------- Palette ----------
# Apple-inspired: binary black/white + single brand accent
BG_DARK = RGBColor(0x05, 0x07, 0x0C)        # near-black for hero / cover
BG_DARK_2 = RGBColor(0x0F, 0x14, 0x1F)      # subtle deep slate
BG_LIGHT = RGBColor(0xFA, 0xFA, 0xFB)       # near-white content background
BG_PANEL = RGBColor(0xFF, 0xFF, 0xFF)       # card/panel background
BG_PANEL_DARK = RGBColor(0x14, 0x18, 0x22)  # card on dark
DIVIDER = RGBColor(0xE5, 0xE7, 0xEB)        # hairline rule
DIVIDER_DARK = RGBColor(0x23, 0x29, 0x35)

INK = RGBColor(0x0A, 0x0A, 0x0F)            # primary text
INK_2 = RGBColor(0x4B, 0x52, 0x60)          # secondary text
INK_3 = RGBColor(0x80, 0x88, 0x96)          # tertiary/caption
INK_INV = RGBColor(0xFF, 0xFF, 0xFF)        # inverse on dark
INK_INV_2 = RGBColor(0xC9, 0xCF, 0xDB)      # secondary on dark
INK_INV_3 = RGBColor(0x80, 0x88, 0x96)      # tertiary on dark

# Brand accent — Apple Blue locked in DESIGN.md
ACCENT = RGBColor(0x00, 0x71, 0xE3)
ACCENT_SOFT = RGBColor(0x4D, 0x9E, 0xEC)
ACCENT_DEEP = RGBColor(0x00, 0x4F, 0xA8)

# Status accents (sparingly used)
GREEN = RGBColor(0x12, 0xB7, 0x6C)          # live / shipped / revenue-positive
AMBER = RGBColor(0xE0, 0x8E, 0x10)          # in-progress / queued
RED = RGBColor(0xD9, 0x37, 0x37)            # blocker / risk
PURPLE = RGBColor(0x7B, 0x4D, 0xE0)         # AI / agent

# Tenant accents (subtle differentiation only)
TENANT_CHESS = RGBColor(0x1E, 0x3A, 0x8A)
TENANT_AIMENTOR = RGBColor(0x7B, 0x4D, 0xE0)
TENANT_FUTURESWIM = RGBColor(0x06, 0x91, 0xC9)


# ---------- Typography ----------
# python-pptx writes a font name string; SF Pro renders on Mac/Keynote, falls back
# to system sans on Windows. Use Inter or system fallbacks for Win compatibility.
FONT_DISPLAY = "SF Pro Display"
FONT_TEXT = "SF Pro Text"
FONT_MONO = "SF Mono"
FONT_FALLBACK = "Inter"  # writers can switch via FONT_DISPLAY = FONT_FALLBACK if needed

# Sizes (Pt)
SZ_HERO = Pt(64)        # cover title
SZ_DISPLAY = Pt(44)     # section title
SZ_TITLE = Pt(36)       # standard slide title
SZ_TITLE_S = Pt(28)
SZ_SUBTITLE = Pt(20)
SZ_BODY = Pt(16)
SZ_BODY_S = Pt(14)
SZ_CAPTION = Pt(11)
SZ_TINY = Pt(9)
SZ_METRIC = Pt(54)      # big stat numbers
SZ_METRIC_S = Pt(36)
SZ_KICKER = Pt(11)      # uppercase eyebrow above titles


# ---------- Rhythm ----------
GAP_S = Inches(0.12)
GAP_M = Inches(0.24)
GAP_L = Inches(0.48)
RADIUS = Inches(0.16)   # card corner radius (visual only — rounded rect shape)


# ---------- Helpers ----------
def apply_text_style(run, *, size, color, bold=False, font=FONT_DISPLAY, tracking=None):
    """Apply font/size/color to a run with one call."""
    run.font.name = font
    run.font.size = size
    run.font.bold = bold
    run.font.color.rgb = color
    if tracking is not None:
        # python-pptx exposes letter spacing through XML; small helper not always
        # needed — most readability wins come from size + weight here.
        from pptx.oxml.ns import qn
        rPr = run._r.get_or_add_rPr()
        rPr.set("spc", str(tracking))
