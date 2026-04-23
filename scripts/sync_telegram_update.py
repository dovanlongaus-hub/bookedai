#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import os
import re
from dataclasses import dataclass
from datetime import UTC, datetime
from pathlib import Path
from urllib import error, request


REPO_ROOT = Path(__file__).resolve().parents[1]
TELEGRAM_SYNC_ROOT = REPO_ROOT / "docs" / "development" / "telegram-sync"
FALLBACK_TELEGRAM_SYNC_ROOT = Path(os.getenv("TMPDIR", "/tmp")) / "bookedai-telegram-sync"
NOTION_API_BASE_URL = "https://api.notion.com/v1"
DISCORD_API_BASE_URL = "https://discord.com/api/v10"
DEFAULT_NOTION_VERSION = "2022-06-28"
DISCORD_MESSAGE_LIMIT = 2000


@dataclass(frozen=True)
class NotionSyncResult:
    status: str
    message: str
    page_url: str | None = None


@dataclass(frozen=True)
class DiscordSyncResult:
    status: str
    message: str
    channel_id: str | None = None


def load_dotenv_file() -> None:
    env_path = REPO_ROOT / ".env"
    if not env_path.exists():
        return

    for raw_line in env_path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        key = key.strip()
        if not key or key in os.environ:
            continue
        os.environ[key] = value.strip().strip('"').strip("'")


def clip_discord_content(value: str, *, suffix: str = "\n\n[truncated]") -> str:
    if len(value) <= DISCORD_MESSAGE_LIMIT:
        return value
    clipped_length = max(DISCORD_MESSAGE_LIMIT - len(suffix), 0)
    return f"{value[:clipped_length].rstrip()}{suffix}"


def slugify(value: str) -> str:
    normalized = re.sub(r"[^a-zA-Z0-9]+", "-", value.strip().lower()).strip("-")
    return normalized or "telegram-update"


def read_summary(args: argparse.Namespace) -> str:
    if args.summary_file:
        return Path(args.summary_file).read_text(encoding="utf-8").strip()
    if args.summary:
        return args.summary.strip()
    raise SystemExit("Provide --summary or --summary-file.")


def read_details(args: argparse.Namespace) -> str:
    if args.details_file:
        return Path(args.details_file).read_text(encoding="utf-8").strip()
    if args.details:
        return args.details.strip()
    return ""


def ensure_sync_archive(
    *,
    title: str,
    summary: str,
    details: str,
    source: str,
    category: str,
    status: str,
) -> Path:
    timestamp = datetime.now(UTC)
    filename = f"{timestamp.strftime('%H%M%S')}-{slugify(title)}.md"
    archive_body = "\n".join(
        [
            f"# {title}",
            "",
            f"- Timestamp: {timestamp.isoformat()}",
            f"- Source: {source}",
            f"- Category: {category}",
            f"- Status: {status}",
            "",
            "## Summary",
            "",
            summary,
            "",
            "## Details",
            "",
            details or "No additional detail supplied.",
            "",
        ]
    )

    archive_roots = [TELEGRAM_SYNC_ROOT, FALLBACK_TELEGRAM_SYNC_ROOT]
    last_error: OSError | None = None
    for archive_root in archive_roots:
        try:
            day_dir = archive_root / timestamp.strftime("%Y-%m-%d")
            day_dir.mkdir(parents=True, exist_ok=True)
            archive_path = day_dir / filename
            archive_path.write_text(archive_body, encoding="utf-8")
            return archive_path
        except OSError as exc:
            last_error = exc
            continue

    if last_error is not None:
        raise last_error
    raise OSError("Could not create Telegram sync archive.")


def notion_request(
    url: str,
    *,
    token: str,
    notion_version: str,
    method: str = "GET",
    payload: dict[str, object] | None = None,
) -> dict[str, object]:
    data = None
    headers = {
        "Authorization": f"Bearer {token}",
        "Notion-Version": notion_version,
        "User-Agent": "BookedAI Telegram Sync/1.0",
    }
    if payload is not None:
        data = json.dumps(payload).encode("utf-8")
        headers["Content-Type"] = "application/json"

    req = request.Request(url, data=data, headers=headers, method=method)
    with request.urlopen(req, timeout=20) as response:
        body = response.read().decode("utf-8")
    parsed = json.loads(body)
    if not isinstance(parsed, dict):
        raise SystemExit("Unexpected Notion API response.")
    return parsed


def resolve_notion_title_property(
    *,
    token: str,
    notion_version: str,
    database_id: str,
) -> str:
    database = notion_request(
        f"{NOTION_API_BASE_URL}/databases/{database_id}",
        token=token,
        notion_version=notion_version,
    )
    properties = database.get("properties")
    if not isinstance(properties, dict):
        raise SystemExit("Unexpected Notion database schema.")
    for name, value in properties.items():
        if isinstance(value, dict) and value.get("type") == "title":
            return str(name)
    raise SystemExit("Could not find a Notion title property in the configured database.")


def append_rich_paragraph_blocks(
    children: list[dict[str, object]],
    *,
    heading: str,
    content: str,
) -> None:
    if not content.strip():
        return

    children.append(
        {
            "object": "block",
            "type": "heading_2",
            "heading_2": {
                "rich_text": [{"type": "text", "text": {"content": heading[:180]}}],
            },
        }
    )

    normalized_paragraphs = [segment.strip() for segment in content.split("\n\n") if segment.strip()]
    paragraph_chunks: list[str] = []
    buffer = ""
    for paragraph in normalized_paragraphs:
        candidate = f"{buffer}\n\n{paragraph}".strip() if buffer else paragraph
        if len(candidate) <= 6000:
            buffer = candidate
            continue
        if buffer:
            paragraph_chunks.append(buffer)
        while len(paragraph) > 6000:
            paragraph_chunks.append(paragraph[:6000].strip())
            paragraph = paragraph[6000:].strip()
        buffer = paragraph
    if buffer:
        paragraph_chunks.append(buffer)

    for paragraph in paragraph_chunks:
        children.append(
            {
                "object": "block",
                "type": "paragraph",
                "paragraph": {
                    "rich_text": build_rich_text(paragraph),
                },
            }
        )


def build_rich_text(content: str) -> list[dict[str, object]]:
    chunks: list[dict[str, object]] = []
    remaining = content.strip()
    while remaining:
        chunks.append({"type": "text", "text": {"content": remaining[:1800]}})
        remaining = remaining[1800:]
    return chunks or [{"type": "text", "text": {"content": ""}}]


def build_notion_children(
    summary: str,
    details: str,
    archive_path: Path,
    metadata: dict[str, str],
) -> list[dict[str, object]]:
    try:
        archive_label = str(archive_path.relative_to(REPO_ROOT))
    except ValueError:
        archive_label = str(archive_path)

    children: list[dict[str, object]] = [
        {
            "object": "block",
            "type": "heading_2",
            "heading_2": {
                "rich_text": [{"type": "text", "text": {"content": "Change summary"}}],
            },
        }
    ]

    summary_chunks: list[str] = []
    raw_summary = summary.strip()
    while raw_summary:
        if len(raw_summary) <= 6000:
            summary_chunks.append(raw_summary)
            break
        split_at = raw_summary.rfind("\n\n", 0, 6000)
        if split_at <= 0:
            split_at = 6000
        summary_chunks.append(raw_summary[:split_at].strip())
        raw_summary = raw_summary[split_at:].strip()

    for paragraph in summary_chunks:
        children.append(
            {
                "object": "block",
                "type": "paragraph",
                "paragraph": {
                    "rich_text": build_rich_text(paragraph),
                },
            }
        )

    append_rich_paragraph_blocks(children, heading="Detailed document", content=details)

    metadata_lines = [f"{key}: {value}" for key, value in metadata.items()]
    metadata_lines.append(f"Archive: {archive_label}")
    children.append(
        {
            "object": "block",
            "type": "bulleted_list_item",
            "bulleted_list_item": {
                "rich_text": build_rich_text(metadata_lines[0]),
            },
        }
    )
    for line in metadata_lines[1:]:
        children.append(
            {
                "object": "block",
                "type": "bulleted_list_item",
                "bulleted_list_item": {
                    "rich_text": build_rich_text(line),
                },
            }
        )
    return children


def sync_to_notion(
    *,
    title: str,
    summary: str,
    details: str,
    archive_path: Path,
    source: str,
    category: str,
    status: str,
) -> NotionSyncResult:
    token = os.getenv("NOTION_API_TOKEN", "").strip()
    parent_page_id = os.getenv("NOTION_PARENT_PAGE_ID", "").strip()
    database_id = os.getenv("NOTION_DATABASE_ID", "").strip()
    notion_version = os.getenv("NOTION_VERSION", DEFAULT_NOTION_VERSION).strip() or DEFAULT_NOTION_VERSION

    if not token:
        return NotionSyncResult(status="not_configured", message="NOTION_API_TOKEN is not configured.")
    if not parent_page_id and not database_id:
        return NotionSyncResult(
            status="not_configured",
            message="Set NOTION_PARENT_PAGE_ID or NOTION_DATABASE_ID before syncing to Notion.",
        )

    metadata = {
        "Source": source,
        "Category": category,
        "Status": status,
        "Timestamp": datetime.now(UTC).isoformat(),
    }
    children = build_notion_children(summary, details, archive_path, metadata)

    try:
        if database_id:
            title_property = resolve_notion_title_property(
                token=token,
                notion_version=notion_version,
                database_id=database_id,
            )
            payload = {
                "parent": {"database_id": database_id},
                "properties": {
                    title_property: {
                        "title": [{"type": "text", "text": {"content": title[:180]}}],
                    }
                },
                "children": children,
            }
        else:
            payload = {
                "parent": {"page_id": parent_page_id},
                "properties": {
                    "title": {
                        "title": [{"type": "text", "text": {"content": title[:180]}}],
                    }
                },
                "children": children,
            }

        response = notion_request(
            f"{NOTION_API_BASE_URL}/pages",
            token=token,
            notion_version=notion_version,
            method="POST",
            payload=payload,
        )
    except error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")
        return NotionSyncResult(
            status=f"http_{exc.code}",
            message=f"Notion sync failed with HTTP {exc.code}: {detail[:240]}",
        )
    except (error.URLError, SystemExit) as exc:
        return NotionSyncResult(status="delivery_failed", message=f"Could not sync to Notion: {exc}")

    return NotionSyncResult(
        status="sent",
        message="Notion page created successfully.",
        page_url=str(response.get("url") or ""),
    )


def discord_request(
    url: str,
    *,
    bot_token: str,
    method: str = "GET",
    payload: dict[str, object] | None = None,
) -> object:
    data = None
    headers = {
        "Authorization": f"Bot {bot_token}",
        "User-Agent": "BookedAI Telegram Sync/1.0",
    }
    if payload is not None:
        data = json.dumps(payload).encode("utf-8")
        headers["Content-Type"] = "application/json"

    req = request.Request(url, data=data, headers=headers, method=method)
    with request.urlopen(req, timeout=20) as response:
        body = response.read().decode("utf-8")
    return json.loads(body)


def resolve_discord_channel_id(*, bot_token: str, guild_id: str, preferred_channel_id: str) -> str:
    if preferred_channel_id:
        return preferred_channel_id

    channels = discord_request(
        f"{DISCORD_API_BASE_URL}/guilds/{guild_id}/channels",
        bot_token=bot_token,
    )
    if not isinstance(channels, list):
        raise SystemExit("Unexpected Discord channel list response.")

    text_channels = [
        channel
        for channel in channels
        if isinstance(channel, dict) and int(channel.get("type") or 0) == 0
    ]
    if not text_channels:
        raise SystemExit("No visible Discord text channels were found for the configured guild.")

    selected = min(text_channels, key=lambda channel: int(channel.get("position") or 0))
    return str(selected.get("id") or "")


def sync_to_discord(
    *,
    title: str,
    summary: str,
    notion_result: NotionSyncResult,
    archive_path: Path,
    preferred_channel_id: str | None = None,
) -> DiscordSyncResult:
    bot_token = os.getenv("DISCORD_BOT_TOKEN", "").strip()
    guild_id = os.getenv("DISCORD_GUILD_ID", "").strip()
    channel_id = (preferred_channel_id or "").strip() or os.getenv("DISCORD_ANNOUNCE_CHANNEL_ID", "").strip()

    if not bot_token:
        return DiscordSyncResult(status="not_configured", message="DISCORD_BOT_TOKEN is not configured.")
    if not guild_id:
        return DiscordSyncResult(status="not_configured", message="DISCORD_GUILD_ID is not configured.")

    content_lines = [
      f"**BookedAI Telegram update**",
      f"Title: {title}",
      "",
      summary.strip(),
    ]
    content = clip_discord_content("\n".join(content_lines).strip())

    try:
        resolved_channel_id = resolve_discord_channel_id(
            bot_token=bot_token,
            guild_id=guild_id,
            preferred_channel_id=channel_id,
        )
        response = discord_request(
            f"{DISCORD_API_BASE_URL}/channels/{resolved_channel_id}/messages",
            bot_token=bot_token,
            method="POST",
            payload={
                "content": content,
                "allowed_mentions": {"parse": []},
            },
        )
    except error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")
        return DiscordSyncResult(
            status=f"http_{exc.code}",
            message=f"Discord post failed with HTTP {exc.code}: {detail[:240]}",
        )
    except (error.URLError, SystemExit) as exc:
        return DiscordSyncResult(
            status="delivery_failed",
            message=f"Could not post Telegram update to Discord: {exc}",
        )

    if not isinstance(response, dict):
        return DiscordSyncResult(status="unexpected_response", message="Unexpected Discord response.")
    return DiscordSyncResult(
        status="sent",
        message="Discord summary posted successfully.",
        channel_id=resolved_channel_id,
    )


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Archive a Telegram-driven BookedAI update, sync it to Notion, and post a summary to Discord.",
    )
    parser.add_argument("--title", required=True, help="Short title for the update.")
    parser.add_argument("--summary", help="Short summary text for the update.")
    parser.add_argument("--summary-file", help="Path to a file containing the update summary.")
    parser.add_argument("--details", help="Longer detailed document text for the update.")
    parser.add_argument("--details-file", help="Path to a file containing the detailed document.")
    parser.add_argument("--source", default="telegram", help="Origin label for the update.")
    parser.add_argument("--category", default="change-summary", help="Category label for the update.")
    parser.add_argument("--status", default="submitted", help="Status label for the update.")
    parser.add_argument("--skip-notion", action="store_true", help="Do not attempt Notion sync.")
    parser.add_argument("--skip-discord", action="store_true", help="Do not attempt Discord post.")
    parser.add_argument("--discord-channel-id", help="Override the Discord channel id used for this post.")
    parser.add_argument("--require-notion", action="store_true", help="Exit non-zero if Notion sync does not succeed.")
    parser.add_argument("--require-discord", action="store_true", help="Exit non-zero if Discord post does not succeed.")
    return parser.parse_args()


def main() -> int:
    load_dotenv_file()
    args = parse_args()
    summary = read_summary(args)
    details = read_details(args)
    archive_path = ensure_sync_archive(
        title=args.title,
        summary=summary,
        details=details,
        source=args.source,
        category=args.category,
        status=args.status,
    )

    notion_result = NotionSyncResult(status="skipped", message="Notion sync skipped.")
    if not args.skip_notion:
        notion_result = sync_to_notion(
            title=args.title,
            summary=summary,
            details=details,
            archive_path=archive_path,
            source=args.source,
            category=args.category,
            status=args.status,
        )

    discord_result = DiscordSyncResult(status="skipped", message="Discord sync skipped.")
    if not args.skip_discord:
        discord_result = sync_to_discord(
            title=args.title,
            summary=summary,
            notion_result=notion_result,
            archive_path=archive_path,
            preferred_channel_id=args.discord_channel_id,
        )

    output = {
        "archive_path": str(archive_path.relative_to(REPO_ROOT)) if archive_path.is_relative_to(REPO_ROOT) else str(archive_path),
        "notion": {
            "status": notion_result.status,
            "message": notion_result.message,
            "page_url": notion_result.page_url,
        },
        "discord": {
            "status": discord_result.status,
            "message": discord_result.message,
            "channel_id": discord_result.channel_id,
        },
    }
    print(json.dumps(output, indent=2))

    if args.require_notion and notion_result.status != "sent":
        return 1
    if args.require_discord and discord_result.status != "sent":
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
