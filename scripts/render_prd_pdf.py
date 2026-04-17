#!/usr/bin/env python3
from __future__ import annotations

import argparse
import html
import os
import re
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer


def build_styles():
    styles = getSampleStyleSheet()
    return {
        "title": ParagraphStyle(
            "PRDTitle",
            parent=styles["Title"],
            fontName="Helvetica-Bold",
            fontSize=24,
            leading=30,
            textColor=colors.HexColor("#0f172a"),
            alignment=TA_CENTER,
            spaceAfter=12,
        ),
        "meta": ParagraphStyle(
            "PRDMeta",
            parent=styles["Normal"],
            fontName="Helvetica",
            fontSize=10,
            leading=14,
            textColor=colors.HexColor("#475569"),
            alignment=TA_CENTER,
            spaceAfter=6,
        ),
        "h1": ParagraphStyle(
            "PRDH1",
            parent=styles["Heading1"],
            fontName="Helvetica-Bold",
            fontSize=18,
            leading=24,
            textColor=colors.HexColor("#0f172a"),
            spaceBefore=16,
            spaceAfter=8,
        ),
        "h2": ParagraphStyle(
            "PRDH2",
            parent=styles["Heading2"],
            fontName="Helvetica-Bold",
            fontSize=14,
            leading=19,
            textColor=colors.HexColor("#0f172a"),
            spaceBefore=12,
            spaceAfter=6,
        ),
        "h3": ParagraphStyle(
            "PRDH3",
            parent=styles["Heading3"],
            fontName="Helvetica-Bold",
            fontSize=12,
            leading=16,
            textColor=colors.HexColor("#1e293b"),
            spaceBefore=10,
            spaceAfter=4,
        ),
        "body": ParagraphStyle(
            "PRDBody",
            parent=styles["BodyText"],
            fontName="Helvetica",
            fontSize=10.5,
            leading=15,
            textColor=colors.HexColor("#1e293b"),
            spaceAfter=5,
        ),
        "bullet": ParagraphStyle(
            "PRDBullet",
            parent=styles["BodyText"],
            fontName="Helvetica",
            fontSize=10.5,
            leading=15,
            leftIndent=12,
            firstLineIndent=-8,
            bulletIndent=0,
            textColor=colors.HexColor("#1e293b"),
            spaceAfter=3,
        ),
        "number": ParagraphStyle(
            "PRDNumber",
            parent=styles["BodyText"],
            fontName="Helvetica",
            fontSize=10.5,
            leading=15,
            leftIndent=16,
            firstLineIndent=-12,
            textColor=colors.HexColor("#1e293b"),
            spaceAfter=3,
        ),
    }


INLINE_CODE_RE = re.compile(r"`([^`]+)`")


def format_inline(text: str) -> str:
    escaped = html.escape(text.strip())
    return INLINE_CODE_RE.sub(r"<font name='Helvetica-Bold'>\1</font>", escaped)


def footer(canvas, doc):
    page = canvas.getPageNumber()
    canvas.saveState()
    canvas.setFont("Helvetica", 9)
    canvas.setFillColor(colors.HexColor("#64748b"))
    canvas.drawRightString(doc.pagesize[0] - 18 * mm, 12 * mm, f"Page {page}")
    canvas.drawString(18 * mm, 12 * mm, "BookedAI Product Requirements Document")
    canvas.restoreState()


def parse_markdown(markdown_path: Path, styles):
    text = markdown_path.read_text(encoding="utf-8")
    lines = text.splitlines()

    story = []
    title = None
    meta_lines = []

    for i, line in enumerate(lines):
        stripped = line.strip()
        if i == 0 and stripped.startswith("# "):
            title = stripped[2:].strip()
            continue
        if title and i < 6 and stripped:
            if not stripped.startswith("## "):
                meta_lines.append(stripped)
                continue
        break

    if title:
        story.append(Spacer(1, 28))
        story.append(Paragraph(format_inline(title), styles["title"]))
        for meta in meta_lines:
            story.append(Paragraph(format_inline(meta), styles["meta"]))
        story.append(Spacer(1, 14))

    body_started = False
    for line in lines:
        stripped = line.rstrip()
        compact = stripped.strip()
        if not body_started and compact.startswith("# "):
            body_started = True
            continue
        if not body_started:
            continue
        if not compact:
            story.append(Spacer(1, 4))
            continue
        if compact.startswith("## "):
            story.append(Paragraph(format_inline(compact[3:]), styles["h1"]))
            continue
        if compact.startswith("### "):
            story.append(Paragraph(format_inline(compact[4:]), styles["h2"]))
            continue
        if compact.startswith("#### "):
            story.append(Paragraph(format_inline(compact[5:]), styles["h3"]))
            continue
        if compact.startswith("- "):
            story.append(Paragraph(format_inline(compact[2:]), styles["bullet"], bulletText="-"))
            continue
        if re.match(r"^\d+\.\s+", compact):
            number, rest = compact.split(".", 1)
            story.append(Paragraph(format_inline(rest.strip()), styles["number"], bulletText=f"{number}."))
            continue
        story.append(Paragraph(format_inline(compact), styles["body"]))

    return story


def main():
    parser = argparse.ArgumentParser(description="Render a Markdown PRD into a PDF.")
    parser.add_argument("input", help="Path to the Markdown source")
    parser.add_argument("output", help="Path to the output PDF")
    args = parser.parse_args()

    input_path = Path(args.input)
    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    styles = build_styles()
    story = parse_markdown(input_path, styles)

    doc = SimpleDocTemplate(
        str(output_path),
        pagesize=A4,
        leftMargin=18 * mm,
        rightMargin=18 * mm,
        topMargin=18 * mm,
        bottomMargin=18 * mm,
        title="BookedAI Product Requirements Document",
        author="OpenAI Codex",
    )
    doc.build(story, onFirstPage=footer, onLaterPages=footer)

    size_kb = os.path.getsize(output_path) / 1024
    print(f"Rendered {output_path} ({size_kb:.1f} KB)")


if __name__ == "__main__":
    main()
