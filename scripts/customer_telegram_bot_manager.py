#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import os
import sys
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path
from typing import Any


REPO_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_WEBHOOK_URL = "https://api.bookedai.au/api/webhooks/bookedai-telegram"
DEFAULT_TEST_MESSAGE = (
    "BookedAI Manager Bot is active. Send me a service you want to find or book."
)
SECRET_ENV_KEYS = {
    "BOOKEDAI_CUSTOMER_TELEGRAM_BOT_TOKEN",
    "BOOKEDAI_CUSTOMER_TELEGRAM_WEBHOOK_SECRET_TOKEN",
}


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
        if key and key not in os.environ:
            os.environ[key] = value.strip().strip('"').strip("'")


def update_env_file(path: Path, updates: dict[str, str]) -> None:
    existing_lines = path.read_text(encoding="utf-8").splitlines() if path.exists() else []
    seen: set[str] = set()
    next_lines: list[str] = []
    for raw_line in existing_lines:
        stripped = raw_line.strip()
        if not stripped or stripped.startswith("#") or "=" not in stripped:
            next_lines.append(raw_line)
            continue
        key, _value = stripped.split("=", 1)
        key = key.strip()
        if key in updates:
            next_lines.append(f"{key}={updates[key]}")
            seen.add(key)
        else:
            next_lines.append(raw_line)
    for key, value in updates.items():
        if key not in seen:
            next_lines.append(f"{key}={value}")
    path.write_text("\n".join(next_lines).rstrip() + "\n", encoding="utf-8")
    try:
        path.chmod(0o600)
    except OSError:
        pass


def read_secret_from_stdin(prompt: str) -> str:
    if sys.stdin.isatty():
        import getpass

        value = getpass.getpass(prompt)
    else:
        value = sys.stdin.readline()
    value = value.strip()
    if not value:
        raise SystemExit("No secret value was provided.")
    return value


def telegram_token() -> str:
    token = (
        os.getenv("BOOKEDAI_CUSTOMER_TELEGRAM_BOT_TOKEN", "").strip()
        or os.getenv("TELEGRAM_BOT_TOKEN", "").strip()
    )
    if not token:
        raise SystemExit(
            "BOOKEDAI_CUSTOMER_TELEGRAM_BOT_TOKEN is missing. "
            "Set it in the live secret environment before activating the customer bot."
        )
    return token


def webhook_secret() -> str:
    return (
        os.getenv("BOOKEDAI_CUSTOMER_TELEGRAM_WEBHOOK_SECRET_TOKEN", "").strip()
        or os.getenv("TELEGRAM_WEBHOOK_SECRET_TOKEN", "").strip()
    )


def api_call(token: str, method: str, payload: dict[str, Any] | None = None) -> dict[str, Any]:
    url = f"https://api.telegram.org/bot{token}/{method}"
    data = None
    headers = {"User-Agent": "BookedAI Customer Telegram Bot Manager/1.0"}
    if payload is not None:
        data = json.dumps(payload).encode("utf-8")
        headers["Content-Type"] = "application/json"
    request = urllib.request.Request(url, data=data, headers=headers, method="POST")
    try:
        with urllib.request.urlopen(request, timeout=20) as response:
            body = response.read().decode("utf-8")
    except urllib.error.HTTPError as exc:
        details = exc.read().decode("utf-8", errors="replace")
        raise SystemExit(f"Telegram API {method} failed with HTTP {exc.code}: {details}") from exc
    parsed = json.loads(body) if body else {}
    if not isinstance(parsed, dict):
        raise SystemExit(f"Telegram API {method} returned an unexpected response.")
    if not parsed.get("ok"):
        raise SystemExit(f"Telegram API {method} returned ok=false: {parsed}")
    return parsed


def summarize_bot(payload: dict[str, Any]) -> dict[str, Any]:
    result = payload.get("result") if isinstance(payload.get("result"), dict) else {}
    return {
        "id": result.get("id"),
        "is_bot": result.get("is_bot"),
        "first_name": result.get("first_name"),
        "username": result.get("username"),
    }


def summarize_webhook(payload: dict[str, Any]) -> dict[str, Any]:
    result = payload.get("result") if isinstance(payload.get("result"), dict) else {}
    return {
        "url": result.get("url"),
        "has_custom_certificate": result.get("has_custom_certificate"),
        "pending_update_count": result.get("pending_update_count"),
        "last_error_date": result.get("last_error_date"),
        "last_error_message": result.get("last_error_message"),
        "max_connections": result.get("max_connections"),
        "allowed_updates": result.get("allowed_updates"),
    }


def summarize_recent_chats(payload: dict[str, Any]) -> list[dict[str, Any]]:
    updates = payload.get("result") if isinstance(payload.get("result"), list) else []
    chats: dict[str, dict[str, Any]] = {}
    for update in updates:
        if not isinstance(update, dict):
            continue
        message = update.get("message") or update.get("edited_message")
        if not isinstance(message, dict):
            callback_query = update.get("callback_query")
            if isinstance(callback_query, dict):
                message = callback_query.get("message")
        if not isinstance(message, dict):
            continue
        chat = message.get("chat")
        if not isinstance(chat, dict):
            continue
        chat_id = str(chat.get("id") or "").strip()
        if not chat_id:
            continue
        chats[chat_id] = {
            "chat_id": chat_id,
            "type": chat.get("type"),
            "username": chat.get("username"),
            "first_name": chat.get("first_name"),
            "last_name": chat.get("last_name"),
            "last_message_id": message.get("message_id"),
        }
    return list(chats.values())


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Manage the customer-facing BookedAI Manager Bot without printing secrets."
    )
    parser.add_argument("--webhook-url", default=DEFAULT_WEBHOOK_URL)
    parser.add_argument("--activate-webhook", action="store_true")
    parser.add_argument("--webhook-info", action="store_true")
    parser.add_argument("--get-me", action="store_true")
    parser.add_argument("--recent-chats", action="store_true")
    parser.add_argument("--send-test-chat-id")
    parser.add_argument("--message", default=DEFAULT_TEST_MESSAGE)
    parser.add_argument(
        "--set-env-token-stdin",
        action="store_true",
        help="Read BOOKEDAI_CUSTOMER_TELEGRAM_BOT_TOKEN from stdin and write it to an env file without printing it.",
    )
    parser.add_argument("--env-file", default=str(REPO_ROOT / ".env"))
    args = parser.parse_args()

    load_dotenv_file()
    did_work = False
    if args.set_env_token_stdin:
        did_work = True
        token_value = read_secret_from_stdin("BOOKEDAI_CUSTOMER_TELEGRAM_BOT_TOKEN: ")
        update_env_file(
            Path(args.env_file).expanduser(),
            {"BOOKEDAI_CUSTOMER_TELEGRAM_BOT_TOKEN": token_value},
        )
        os.environ["BOOKEDAI_CUSTOMER_TELEGRAM_BOT_TOKEN"] = token_value
        print(json.dumps({"env_file": args.env_file, "updated": ["BOOKEDAI_CUSTOMER_TELEGRAM_BOT_TOKEN"]}, indent=2))

    token = telegram_token()

    if args.get_me:
        did_work = True
        print(json.dumps({"bot": summarize_bot(api_call(token, "getMe"))}, indent=2))

    if args.activate_webhook:
        did_work = True
        payload: dict[str, Any] = {
            "url": args.webhook_url,
            "allowed_updates": ["message", "edited_message", "callback_query"],
            "drop_pending_updates": False,
        }
        secret = webhook_secret()
        if secret:
            payload["secret_token"] = secret
        api_call(token, "setWebhook", payload)
        print(json.dumps({"webhook": "activated", "url": args.webhook_url}, indent=2))

    if args.webhook_info:
        did_work = True
        print(json.dumps({"webhook_info": summarize_webhook(api_call(token, "getWebhookInfo"))}, indent=2))

    if args.recent_chats:
        did_work = True
        print(json.dumps({"recent_chats": summarize_recent_chats(api_call(token, "getUpdates"))}, indent=2))

    if args.send_test_chat_id:
        did_work = True
        response = api_call(
            token,
            "sendMessage",
            {
                "chat_id": args.send_test_chat_id,
                "text": args.message,
                "disable_web_page_preview": True,
            },
        )
        result = response.get("result") if isinstance(response.get("result"), dict) else {}
        print(json.dumps({"test_message": "sent", "message_id": result.get("message_id")}, indent=2))

    if not did_work:
        parser.print_help()
        return 2
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
