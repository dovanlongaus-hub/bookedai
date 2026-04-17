#!/usr/bin/env python3
from __future__ import annotations

import os
import ssl
import sys
from urllib import error, request


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


def env_value(name: str) -> str:
    return os.getenv(name, "").strip()


def masked(value: str) -> str:
    if not value:
        return "<missing>"
    if len(value) <= 8:
        return "***"
    return f"{value[:4]}***{value[-4:]}"


def build_invite_url(application_id: str) -> str:
    permissions = "274877906944"
    scopes = "bot applications.commands"
    return (
        "https://discord.com/oauth2/authorize"
        f"?client_id={application_id}"
        f"&permissions={permissions}"
        f"&scope={scopes.replace(' ', '%20')}"
    )


def build_interactions_url(public_api_url: str) -> str:
    normalized = public_api_url.rstrip("/")
    if normalized.endswith("/api"):
        return f"{normalized}/discord/interactions"
    return f"{normalized}/api/discord/interactions"


def probe_endpoint(url: str) -> tuple[str, str]:
    req = request.Request(url, method="GET")
    try:
        with request.urlopen(req, timeout=10, context=ssl.create_default_context()) as response:
            return str(response.status), "reachable"
    except error.HTTPError as exc:
        return str(exc.code), "reachable"
    except Exception as exc:  # noqa: BLE001
        return "error", str(exc)


def main() -> int:
    load_dotenv_file()

    application_id = env_value("DISCORD_APPLICATION_ID")
    bot_token = env_value("DISCORD_BOT_TOKEN")
    public_key = env_value("DISCORD_PUBLIC_KEY")
    guild_id = env_value("DISCORD_GUILD_ID")
    public_api_url = env_value("PUBLIC_API_URL") or "https://api.bookedai.au"

    interactions_url = build_interactions_url(public_api_url)
    status_code, status_detail = probe_endpoint(interactions_url)

    print("Discord setup snapshot")
    print(f"- DISCORD_APPLICATION_ID: {masked(application_id)}")
    print(f"- DISCORD_BOT_TOKEN: {masked(bot_token)}")
    print(f"- DISCORD_PUBLIC_KEY: {masked(public_key)}")
    print(f"- DISCORD_GUILD_ID: {masked(guild_id)}")
    print(f"- Interactions URL: {interactions_url}")
    print(f"- Interactions endpoint probe: {status_code} ({status_detail})")

    if application_id:
        print(f"- Invite URL: {build_invite_url(application_id)}")
    else:
        print("- Invite URL: unavailable until DISCORD_APPLICATION_ID is set")

    missing = [
        name
        for name, value in [
            ("DISCORD_APPLICATION_ID", application_id),
            ("DISCORD_BOT_TOKEN", bot_token),
            ("DISCORD_PUBLIC_KEY", public_key),
        ]
        if not value
    ]

    if missing:
        print("- Registration readiness: blocked")
        print(f"  Missing vars: {', '.join(missing)}")
        return 0

    print("- Registration readiness: ready")
    print("  Next step: python3 scripts/register_discord_commands.py")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
