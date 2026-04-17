from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
import re


REPO_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_TOPIC = "all"


@dataclass(frozen=True)
class SummaryTopicConfig:
    key: str
    label: str
    path: Path
    anchor: str | None
    max_bullets: int


TOPIC_CONFIGS: dict[str, SummaryTopicConfig] = {
    "implementation": SummaryTopicConfig(
        key="implementation",
        label="Implementation progress",
        path=REPO_ROOT / "docs/development/implementation-progress.md",
        anchor="## Status Snapshot",
        max_bullets=6,
    ),
    "sprint14": SummaryTopicConfig(
        key="sprint14",
        label="Sprint 14",
        path=REPO_ROOT / "docs/development/sprint-14-owner-execution-checklist.md",
        anchor="## Mission",
        max_bullets=6,
    ),
    "roadmap": SummaryTopicConfig(
        key="roadmap",
        label="Roadmap register",
        path=REPO_ROOT / "docs/development/roadmap-sprint-document-register.md",
        anchor="### Sprint 14",
        max_bullets=5,
    ),
}


def _read_text(path: Path) -> str:
    try:
        return path.read_text(encoding="utf-8")
    except OSError:
        return ""


def _extract_bullets(text: str, *, anchor: str | None, max_bullets: int) -> list[str]:
    section = text
    if anchor and anchor in text:
        section = text.split(anchor, 1)[1]

    bullets: list[str] = []
    for line in section.splitlines():
        stripped = line.strip()
        if stripped.startswith("## ") and bullets:
            break
        if stripped.startswith("### ") and bullets:
            break
        if stripped.startswith("- "):
            normalized = re.sub(r"\s+", " ", stripped[2:]).strip()
            if normalized:
                bullets.append(normalized)
        if len(bullets) >= max_bullets:
            break
    return bullets


class DocumentSummaryService:
    def build_context_blocks(self) -> list[dict[str, str]]:
        blocks: list[dict[str, str]] = []
        for topic in TOPIC_CONFIGS.values():
            text = _read_text(topic.path)
            if not text:
                continue
            blocks.append(
                {
                    "topic": topic.key,
                    "label": topic.label,
                    "path": str(topic.path.relative_to(REPO_ROOT)),
                    "content": text[:12000],
                }
            )
        return blocks

    def build_summary(self, topic_key: str | None = None) -> str:
        normalized_key = (topic_key or DEFAULT_TOPIC).strip().lower()
        if normalized_key in {"all", "", DEFAULT_TOPIC}:
            return self._build_all_summary()

        topic = TOPIC_CONFIGS.get(normalized_key)
        if topic is None:
            supported = ", ".join(["all", *TOPIC_CONFIGS.keys()])
            return f"Unsupported summary topic. Available topics: {supported}."

        return self._build_topic_summary(topic)

    def build_fallback_answer(self, question: str) -> str:
        lowered = question.strip().lower()
        if "sprint 14" in lowered or "sprint14" in lowered:
            return self.build_summary("sprint14")
        if "roadmap" in lowered or "register" in lowered:
            return self.build_summary("roadmap")
        if "progress" in lowered or "implementation" in lowered or "status" in lowered:
            return self.build_summary("implementation")
        return self.build_summary("all")

    def _build_topic_summary(self, topic: SummaryTopicConfig) -> str:
        text = _read_text(topic.path)
        bullets = _extract_bullets(text, anchor=topic.anchor, max_bullets=topic.max_bullets)
        if not bullets:
            return f"{topic.label}: no summary bullets were found in `{topic.path.relative_to(REPO_ROOT)}`."

        lines = [f"{topic.label} summary:"]
        lines.extend(f"- {bullet}" for bullet in bullets)
        lines.append(f"Source: `{topic.path.relative_to(REPO_ROOT)}`")
        return "\n".join(lines)

    def _build_all_summary(self) -> str:
        sections = [
            self._build_topic_summary(TOPIC_CONFIGS["implementation"]),
            self._build_topic_summary(TOPIC_CONFIGS["sprint14"]),
            self._build_topic_summary(TOPIC_CONFIGS["roadmap"]),
        ]
        return "\n\n".join(sections)
