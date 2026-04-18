#!/usr/bin/env python3
from __future__ import annotations

import argparse
import importlib.util
import json
import os
from pathlib import Path
import sys
from urllib import error, request


DISCORD_API_BASE_URL = "https://discord.com/api/v10"
REPO_ROOT = Path(__file__).resolve().parents[1]
DISCORD_MESSAGE_LIMIT = 2000


def _clip_discord_content(value: str, *, suffix: str = "\n\n[truncated]") -> str:
    if len(value) <= DISCORD_MESSAGE_LIMIT:
        return value
    clipped_length = max(DISCORD_MESSAGE_LIMIT - len(suffix), 0)
    return f"{value[:clipped_length].rstrip()}{suffix}"


def load_document_summary_service():
    module_path = REPO_ROOT / "backend/service_layer/document_summary_service.py"
    spec = importlib.util.spec_from_file_location("document_summary_service", module_path)
    if spec is None or spec.loader is None:
        raise SystemExit("Could not load document_summary_service module.")
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module.DocumentSummaryService


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
        os.environ[key] = value.strip()


def require_env(name: str) -> str:
    value = os.getenv(name, "").strip()
    if not value:
        raise SystemExit(f"Missing required environment variable: {name}")
    return value


def discord_request(url: str, *, bot_token: str, method: str = "GET", payload: dict[str, object] | None = None) -> object:
    data = None
    headers = {
        "Authorization": f"Bot {bot_token}",
        "User-Agent": "BookedAI/1.0",
    }
    if payload is not None:
        data = json.dumps(payload).encode("utf-8")
        headers["Content-Type"] = "application/json"

    req = request.Request(url, data=data, headers=headers, method=method)
    with request.urlopen(req, timeout=20) as response:
        body = response.read().decode("utf-8")
    return json.loads(body)


def resolve_channel_id(*, bot_token: str, guild_id: str, preferred_channel_id: str, preferred_channel_name: str) -> tuple[str, str]:
    guild = discord_request(
        f"{DISCORD_API_BASE_URL}/guilds/{guild_id}",
        bot_token=bot_token,
    )
    if not isinstance(guild, dict):
        raise SystemExit("Unexpected Discord guild response.")

    channels = discord_request(
        f"{DISCORD_API_BASE_URL}/guilds/{guild_id}/channels",
        bot_token=bot_token,
    )
    if not isinstance(channels, list):
        raise SystemExit("Unexpected Discord channel list response.")

    text_channels = [channel for channel in channels if isinstance(channel, dict) and int(channel.get("type") or 0) == 0]
    if not text_channels:
        raise SystemExit("No text channels are visible to the Discord bot in this guild.")

    if preferred_channel_id:
        selected = next(
            (channel for channel in text_channels if str(channel.get("id") or "") == preferred_channel_id),
            None,
        )
        if selected:
            return str(selected["id"]), str(selected.get("name") or "unknown")

    if preferred_channel_name:
        lowered = preferred_channel_name.strip().lower()
        selected = next(
            (channel for channel in text_channels if str(channel.get("name") or "").strip().lower() == lowered),
            None,
        )
        if selected:
            return str(selected["id"]), str(selected.get("name") or "unknown")

    system_channel_id = str(guild.get("system_channel_id") or "").strip()
    if system_channel_id:
        selected = next(
            (channel for channel in text_channels if str(channel.get("id") or "") == system_channel_id),
            None,
        )
        if selected:
            return str(selected["id"]), str(selected.get("name") or "unknown")

    selected = next(
        (channel for channel in text_channels if str(channel.get("name") or "").strip().lower() == "general"),
        None,
    )
    if selected:
        return str(selected["id"]), str(selected.get("name") or "unknown")

    selected = min(text_channels, key=lambda channel: int(channel.get("position") or 0))
    return str(selected["id"]), str(selected.get("name") or "unknown")


def build_message(kind: str, identifier: str, summary_service) -> str:
    title = f"BookedAI {kind} completion update"
    summary = summary_service.build_completion_summary(kind, identifier)
    return _clip_discord_content(f"{title}: {identifier}\n\n{summary}".strip())


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Post a sprint or phase completion summary into Discord.",
    )
    parser.add_argument("kind", choices=["sprint", "phase"])
    parser.add_argument("identifier", help="Sprint number or phase key, for example `14` or `7-8`.")
    parser.add_argument("--guild-id", default=os.getenv("DISCORD_GUILD_ID", "").strip())
    parser.add_argument("--channel-id", default=os.getenv("DISCORD_ANNOUNCE_CHANNEL_ID", "").strip())
    parser.add_argument("--channel-name", default="general")
    parser.add_argument("--dry-run", action="store_true", help="Print the message without sending it.")
    return parser.parse_args()


def main() -> int:
    load_dotenv_file()
    args = parse_args()

    bot_token = require_env("DISCORD_BOT_TOKEN")
    guild_id = args.guild_id.strip()
    if not guild_id:
        raise SystemExit("Missing guild id. Set DISCORD_GUILD_ID or pass --guild-id.")

    document_summary_service = load_document_summary_service()
    summary_service = document_summary_service()
    content = build_message(args.kind, args.identifier, summary_service)

    if args.dry_run:
        print(content)
        return 0

    try:
        channel_id, channel_name = resolve_channel_id(
            bot_token=bot_token,
            guild_id=guild_id,
            preferred_channel_id=args.channel_id.strip(),
            preferred_channel_name=args.channel_name.strip(),
        )
        response = discord_request(
            f"{DISCORD_API_BASE_URL}/channels/{channel_id}/messages",
            bot_token=bot_token,
            method="POST",
            payload={
                "content": content,
                "allowed_mentions": {"parse": []},
            },
        )
    except error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")
        print(f"Discord post failed: HTTP {exc.code}", file=sys.stderr)
        print(detail, file=sys.stderr)
        return 1

    if not isinstance(response, dict):
        raise SystemExit("Unexpected Discord message response.")

    print(f"Posted to guild {guild_id} channel #{channel_name} ({channel_id}).")
    print(f"Message ID: {response.get('id')}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
