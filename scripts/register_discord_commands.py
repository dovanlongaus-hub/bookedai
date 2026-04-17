#!/usr/bin/env python3
from __future__ import annotations

import json
import os
import sys
from urllib import error, request


DISCORD_API_BASE_URL = "https://discord.com/api/v10"
REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def load_dotenv_file() -> None:
    env_path = os.path.join(REPO_ROOT, ".env")
    if not os.path.exists(env_path):
        return

    with open(env_path, "r", encoding="utf-8") as handle:
        for raw_line in handle:
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


def build_command_payload() -> list[dict[str, object]]:
    return [
        {
            "name": "bookedai",
            "description": "BookedAI team assistant",
            "type": 1,
            "options": [
                {
                    "type": 1,
                    "name": "ask",
                    "description": "Ask BookedAI about project status or repo progress",
                    "options": [
                        {
                            "type": 3,
                            "name": "prompt",
                            "description": "Question for the team assistant",
                            "required": True,
                            "max_length": 600,
                        },
                        {
                            "type": 5,
                            "name": "private",
                            "description": "Show the answer only to you",
                            "required": False,
                        },
                    ],
                },
                {
                    "type": 1,
                    "name": "summary",
                    "description": "Post a repo-backed progress summary",
                    "options": [
                        {
                            "type": 3,
                            "name": "topic",
                            "description": "Which progress slice to summarize",
                            "required": False,
                            "choices": [
                                {"name": "All", "value": "all"},
                                {"name": "Implementation", "value": "implementation"},
                                {"name": "Sprint 14", "value": "sprint14"},
                                {"name": "Roadmap", "value": "roadmap"},
                            ],
                        },
                        {
                            "type": 5,
                            "name": "private",
                            "description": "Show the summary only to you",
                            "required": False,
                        },
                    ],
                },
            ],
        }
    ]


def main() -> int:
    load_dotenv_file()
    application_id = require_env("DISCORD_APPLICATION_ID")
    bot_token = require_env("DISCORD_BOT_TOKEN")
    guild_id = os.getenv("DISCORD_GUILD_ID", "").strip()

    if guild_id:
        url = f"{DISCORD_API_BASE_URL}/applications/{application_id}/guilds/{guild_id}/commands"
        scope = f"guild {guild_id}"
    else:
        url = f"{DISCORD_API_BASE_URL}/applications/{application_id}/commands"
        scope = "global"

    payload = json.dumps(build_command_payload()).encode("utf-8")
    req = request.Request(
        url,
        data=payload,
        method="PUT",
        headers={
            "Authorization": f"Bot {bot_token}",
            "Content-Type": "application/json",
        },
    )

    try:
        with request.urlopen(req) as response:
            body = response.read().decode("utf-8")
    except error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")
        print(f"Discord command registration failed for {scope}: HTTP {exc.code}", file=sys.stderr)
        print(detail, file=sys.stderr)
        return 1

    print(f"Discord commands registered for {scope}.")
    print(body)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
