#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import subprocess
import tempfile
from dataclasses import asdict, dataclass
from datetime import UTC, datetime
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[1]
SYNC_SCRIPT = REPO_ROOT / "scripts" / "telegram_workspace_ops.py"
EXCLUDED_DIR_PREFIXES = (
    Path("docs/development/telegram-sync"),
)
ROOT_DOCS = (
    Path("project.md"),
    Path("README.md"),
    Path("DESIGN.md"),
    Path("AGENTS.md"),
    Path("MEMORY.md"),
    Path("HEARTBEAT.md"),
    Path("IDENTITY.md"),
    Path("SOUL.md"),
    Path("TOOLS.md"),
    Path("USER.md"),
)
DOC_DIRS = (
    Path("docs"),
    Path("memory"),
)


@dataclass
class SyncRecord:
    path: str
    title: str
    notion_page_url: str | None
    status: str
    message: str


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Batch sync the BookedAI documentation set to the configured Notion workspace.",
    )
    parser.add_argument(
        "--path",
        action="append",
        dest="paths",
        help="Relative markdown path to sync. Repeat to sync only a selected subset instead of the full documentation set.",
    )
    parser.add_argument(
        "--skip-discord",
        action="store_true",
        help="Skip Discord mirroring while syncing the document set.",
    )
    parser.add_argument(
        "--require-notion",
        action="store_true",
        default=True,
        help="Exit non-zero if any page fails to sync to Notion.",
    )
    parser.add_argument(
        "--limit",
        type=int,
        help="Optional limit for testing a subset of documents.",
    )
    parser.add_argument(
        "--output-json",
        help="Optional path to write the full sync summary JSON for later review or retry.",
    )
    return parser.parse_args()


def should_exclude(path: Path) -> bool:
    return any(path.is_relative_to(prefix) for prefix in EXCLUDED_DIR_PREFIXES)


def iter_doc_paths() -> list[Path]:
    collected: list[Path] = []
    for root_doc in ROOT_DOCS:
        if root_doc.exists():
            collected.append(root_doc)

    for doc_dir in DOC_DIRS:
        if not doc_dir.exists():
            continue
        for path in sorted(doc_dir.rglob("*.md")):
            rel_path = path if not path.is_absolute() else path.relative_to(REPO_ROOT)
            if should_exclude(rel_path):
                continue
            collected.append(rel_path)

    deduped: list[Path] = []
    seen: set[Path] = set()
    for path in collected:
        if path in seen:
            continue
        deduped.append(path)
        seen.add(path)
    return deduped


def build_summary(path: Path, content: str) -> str:
    non_empty_lines = [line.strip() for line in content.splitlines() if line.strip()]
    preview_lines = non_empty_lines[:4]
    preview = " ".join(preview_lines)
    preview = preview[:700].strip()
    if not preview:
        preview = "Documentation page synced from the BookedAI repository."
    return (
        f"Synchronized `{path.as_posix()}` from the BookedAI repository into the Notion workspace. "
        f"Preview: {preview}"
    )


def build_details(path: Path, content: str) -> str:
    synced_at = datetime.now(UTC).isoformat()
    return "\n".join(
        [
            f"Source path: {path.as_posix()}",
            f"Synchronized at: {synced_at}",
            "",
            "Repository document content:",
            "",
            content.strip(),
        ]
    ).strip()


def sync_one_document(path: Path, *, skip_discord: bool, require_notion: bool) -> SyncRecord:
    abs_path = REPO_ROOT / path
    content = abs_path.read_text(encoding="utf-8")
    title = f"BookedAI doc sync - {path.as_posix()}"
    summary = build_summary(path, content)
    details = build_details(path, content)

    with tempfile.NamedTemporaryFile("w", encoding="utf-8", delete=False, suffix=".md") as summary_file:
        summary_file.write(summary)
        summary_path = Path(summary_file.name)
    with tempfile.NamedTemporaryFile("w", encoding="utf-8", delete=False, suffix=".md") as details_file:
        details_file.write(details)
        details_path = Path(details_file.name)

    command = [
        "python3",
        str(SYNC_SCRIPT),
        "sync-doc",
        "--title",
        title,
        "--summary-file",
        str(summary_path),
        "--details-file",
        str(details_path),
        "--source",
        "repo-doc-sync",
        "--category",
        "documentation",
        "--status",
        "synced",
    ]
    if skip_discord:
        command.append("--skip-discord")
    if require_notion:
        command.append("--require-notion")

    try:
        completed = subprocess.run(
            command,
            cwd=REPO_ROOT,
            capture_output=True,
            text=True,
            check=False,
        )
        stdout = completed.stdout.strip()
        parsed = json.loads(stdout) if stdout else {}
        notion_payload = parsed.get("notion") if isinstance(parsed, dict) else {}
        status = str((notion_payload or {}).get("status") or f"exit_{completed.returncode}")
        message = str((notion_payload or {}).get("message") or completed.stderr.strip() or "No output returned.")
        notion_page_url = (notion_payload or {}).get("page_url") if isinstance(notion_payload, dict) else None
        if completed.returncode != 0 and status == "sent":
            status = f"exit_{completed.returncode}"
        return SyncRecord(
            path=path.as_posix(),
            title=title,
            notion_page_url=str(notion_page_url) if notion_page_url else None,
            status=status,
            message=message,
        )
    finally:
        summary_path.unlink(missing_ok=True)
        details_path.unlink(missing_ok=True)


def main() -> int:
    args = parse_args()
    doc_paths = [Path(path) for path in args.paths] if args.paths else iter_doc_paths()
    if args.limit is not None:
        doc_paths = doc_paths[: max(args.limit, 0)]

    records: list[SyncRecord] = []
    for path in doc_paths:
        records.append(
            sync_one_document(
                path,
                skip_discord=args.skip_discord,
                require_notion=args.require_notion,
            )
        )

    failed = [record for record in records if record.status != "sent"]
    summary = {
        "synced_count": len(records) - len(failed),
        "failed_count": len(failed),
        "records": [asdict(record) for record in records],
    }
    if args.output_json:
        output_path = Path(args.output_json)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        output_path.write_text(json.dumps(summary, indent=2), encoding="utf-8")
    print(json.dumps(summary, indent=2))
    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
