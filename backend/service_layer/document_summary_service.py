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
    anchors: tuple[str, ...]
    max_bullets: int


TOPIC_CONFIGS: dict[str, SummaryTopicConfig] = {
    "implementation": SummaryTopicConfig(
        key="implementation",
        label="Implementation progress",
        path=REPO_ROOT / "docs/development/implementation-progress.md",
        anchors=("## Status Snapshot",),
        max_bullets=6,
    ),
    "sprint14": SummaryTopicConfig(
        key="sprint14",
        label="Sprint 14",
        path=REPO_ROOT / "docs/development/sprint-14-owner-execution-checklist.md",
        anchors=("## Mission", "## Objective", "## Outcomes"),
        max_bullets=6,
    ),
    "roadmap": SummaryTopicConfig(
        key="roadmap",
        label="Roadmap register",
        path=REPO_ROOT / "docs/development/roadmap-sprint-document-register.md",
        anchors=("### Sprint 14",),
        max_bullets=5,
    ),
}

PHASE_CONFIGS: dict[str, SummaryTopicConfig] = {
    "0": SummaryTopicConfig(
        key="phase0",
        label="Phase 0",
        path=REPO_ROOT / "docs/architecture/phase-0-detailed-implementation-plan.md",
        anchors=("## 3. Phase 0 outcomes", "## 2. Phase 0 objective"),
        max_bullets=6,
    ),
    "1-2": SummaryTopicConfig(
        key="phase1-2",
        label="Phase 1-2",
        path=REPO_ROOT / "docs/architecture/phase-1-2-detailed-implementation-package.md",
        anchors=("## 3. Strategic outcome for Phase 1-2", "## 5. Success criteria"),
        max_bullets=6,
    ),
    "3-6": SummaryTopicConfig(
        key="phase3-6",
        label="Phase 3-6",
        path=REPO_ROOT / "docs/architecture/phase-3-6-detailed-implementation-package.md",
        anchors=("## 3. Strategic outcome for Phase 3-6", "## 5. Success criteria"),
        max_bullets=6,
    ),
    "7": SummaryTopicConfig(
        key="phase7",
        label="Phase 7",
        path=REPO_ROOT / "docs/architecture/phase-7-8-detailed-implementation-package.md",
        anchors=("## Phase 7 - Tenant revenue workspace", "### Core outputs"),
        max_bullets=6,
    ),
    "8": SummaryTopicConfig(
        key="phase8",
        label="Phase 8",
        path=REPO_ROOT / "docs/architecture/phase-7-8-detailed-implementation-package.md",
        anchors=("## Phase 8 - Internal admin optimization and support platform", "### Core outputs"),
        max_bullets=6,
    ),
    "7-8": SummaryTopicConfig(
        key="phase7-8",
        label="Phase 7-8",
        path=REPO_ROOT / "docs/architecture/phase-7-8-detailed-implementation-package.md",
        anchors=("## 3. Strategic outcome for Phase 7-8", "## 5. Success criteria"),
        max_bullets=6,
    ),
    "9": SummaryTopicConfig(
        key="phase9",
        label="Phase 9",
        path=REPO_ROOT / "docs/architecture/phase-9-detailed-implementation-package.md",
        anchors=("## 3. Strategic outcome for Phase 9", "### Core outputs"),
        max_bullets=6,
    ),
}

PHASE_ALIASES: dict[str, str] = {
    "phase0": "0",
    "phase1": "1-2",
    "phase2": "1-2",
    "phase3": "3-6",
    "phase4": "3-6",
    "phase5": "3-6",
    "phase6": "3-6",
    "phase7": "7",
    "phase8": "8",
    "phase9": "9",
}


def _read_text(path: Path) -> str:
    try:
        return path.read_text(encoding="utf-8")
    except OSError:
        return ""


def _extract_bullets(text: str, *, anchors: tuple[str, ...], max_bullets: int) -> list[str]:
    section = text
    for anchor in anchors:
        if anchor and anchor in text:
            section = text.split(anchor, 1)[1]
            break

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

    def build_sprint_summary(self, sprint_identifier: str | int) -> str:
        normalized = self._normalize_sprint_identifier(sprint_identifier)
        if not normalized:
            return "Unsupported sprint identifier. Example: `14` or `sprint-14`."

        path = REPO_ROOT / f"docs/development/sprint-{normalized}-owner-execution-checklist.md"
        topic = SummaryTopicConfig(
            key=f"sprint{normalized}",
            label=f"Sprint {normalized}",
            path=path,
            anchors=("## Mission", "## Objective", "## Outcomes", "## Focus"),
            max_bullets=6,
        )
        return self._build_topic_summary(topic)

    def build_phase_summary(self, phase_identifier: str | int) -> str:
        normalized = self._normalize_phase_identifier(phase_identifier)
        if not normalized:
            supported = ", ".join(["0", "1-2", "3-6", "7", "8", "7-8", "9"])
            return f"Unsupported phase identifier. Available phases: {supported}."

        topic = PHASE_CONFIGS.get(normalized)
        if topic is None:
            supported = ", ".join(["0", "1-2", "3-6", "7", "8", "7-8", "9"])
            return f"Unsupported phase identifier. Available phases: {supported}."
        return self._build_topic_summary(topic)

    def build_completion_summary(self, kind: str, identifier: str | int) -> str:
        normalized_kind = kind.strip().lower()
        if normalized_kind == "sprint":
            return self.build_sprint_summary(identifier)
        if normalized_kind == "phase":
            return self.build_phase_summary(identifier)
        return "Unsupported completion kind. Use `sprint` or `phase`."

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
        if not text:
            return f"{topic.label}: source document was not found at `{topic.path.relative_to(REPO_ROOT)}`."

        bullets = _extract_bullets(text, anchors=topic.anchors, max_bullets=topic.max_bullets)
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

    def _normalize_sprint_identifier(self, sprint_identifier: str | int) -> str:
        raw = re.sub(r"[^0-9]", "", str(sprint_identifier).strip().lower())
        return raw

    def _normalize_phase_identifier(self, phase_identifier: str | int) -> str:
        raw = str(phase_identifier).strip().lower()
        raw = raw.replace("phase", "")
        raw = raw.replace(" ", "")
        raw = raw.replace("_", "-")
        raw = raw.replace("–", "-")
        raw = raw.replace("—", "-")
        if raw in PHASE_CONFIGS:
            return raw
        return PHASE_ALIASES.get(f"phase{raw}", "")
