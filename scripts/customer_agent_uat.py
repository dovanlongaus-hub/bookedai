#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import os
import sys
from datetime import datetime, timezone
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


def _api_base(value: str) -> str:
    return value.rstrip("/")


def _probe_result(name: str, *, status: str, details: dict[str, Any]) -> dict[str, Any]:
    return {"name": name, "status": status, "details": details}


def _post_json(
    url: str,
    *,
    payload: dict[str, Any],
    headers: dict[str, str] | None = None,
    timeout: float,
) -> tuple[int, dict[str, Any]]:
    body_bytes = json.dumps(payload).encode("utf-8")
    request = Request(
        url,
        data=body_bytes,
        method="POST",
        headers={
            "Content-Type": "application/json",
            "User-Agent": "BookedAI-Customer-Agent-UAT/1.0",
            **(headers or {}),
        },
    )
    try:
        with urlopen(request, timeout=timeout) as response:
            response_body = response.read().decode("utf-8", errors="replace")
            return response.status, json.loads(response_body or "{}")
    except HTTPError as exc:
        response_body = exc.read().decode("utf-8", errors="replace")
        try:
            body = json.loads(response_body or "{}")
        except ValueError:
            body = {"raw": response_body[:500]}
        return exc.code, body
    except (URLError, TimeoutError) as exc:
        return 0, {"error": str(exc)}


def run_uat(
    *,
    api_base: str,
    telegram_secret: str | None,
    telegram_chat_id: str | None,
    timeout: float,
) -> dict[str, Any]:
    results: list[dict[str, Any]] = []
    query = "Find a chess class in Sydney this weekend"

    status_code, body = _post_json(
        f"{api_base}/api/chat/send",
        payload={
            "message": query,
            "session_id": "customer-agent-uat-web",
            "source": "uat",
        },
        timeout=timeout,
    )
    matched = body.get("matched_services") or body.get("services") or []
    first_name = ""
    if isinstance(matched, list) and matched:
        first = matched[0] if isinstance(matched[0], dict) else {}
        first_name = str(first.get("name") or first.get("service_name") or "")
    web_ok = status_code == 200 and ("chess" in json.dumps(body).lower())
    results.append(
        _probe_result(
            "web_chat_search",
            status="passed" if web_ok else "failed",
            details={
                "http_status": status_code,
                "query": query,
                "top_result": first_name,
                "body_keys": sorted(body.keys()) if isinstance(body, dict) else [],
            },
        )
    )

    headers = {"X-Telegram-Bot-Api-Secret-Token": telegram_secret or ""}
    if telegram_secret and telegram_chat_id:
        message_payload = {
            "update_id": 940000001,
            "message": {
                "message_id": 9401,
                "from": {"id": int(telegram_chat_id), "first_name": "BookedAI UAT"},
                "chat": {"id": int(telegram_chat_id), "type": "private"},
                "text": query,
            },
        }
        status_code, body = _post_json(
            f"{api_base}/api/webhooks/bookedai-telegram",
            payload=message_payload,
            headers=headers,
            timeout=timeout,
        )
        telegram_ok = status_code == 200 and body.get("messages_processed") == 1
        results.append(
            _probe_result(
                "telegram_message_webhook",
                status="passed" if telegram_ok else "failed",
                details={
                    "http_status": status_code,
                    "messages_processed": body.get("messages_processed"),
                },
            )
        )

        callback_payload = {
            "update_id": 940000002,
            "callback_query": {
                "id": "customer-agent-uat-callback",
                "from": {"id": int(telegram_chat_id), "first_name": "BookedAI UAT"},
                "message": {
                    "message_id": 9402,
                    "chat": {"id": int(telegram_chat_id), "type": "private"},
                    "text": "BookedAI result shortlist",
                },
                "data": "Book 1",
            },
        }
        status_code, body = _post_json(
            f"{api_base}/api/webhooks/bookedai-telegram",
            payload=callback_payload,
            headers=headers,
            timeout=timeout,
        )
        callback_ok = status_code == 200 and body.get("messages_processed") == 1
        results.append(
            _probe_result(
                "telegram_callback_webhook",
                status="passed" if callback_ok else "failed",
                details={
                    "http_status": status_code,
                    "messages_processed": body.get("messages_processed"),
                },
            )
        )
    else:
        reason = "missing BOOKEDAI_CUSTOMER_TELEGRAM_WEBHOOK_SECRET_TOKEN or BOOKEDAI_CUSTOMER_TELEGRAM_UAT_CHAT_ID"
        results.append(_probe_result("telegram_message_webhook", status="skipped", details={"reason": reason}))
        results.append(_probe_result("telegram_callback_webhook", status="skipped", details={"reason": reason}))

    failed = [item for item in results if item["status"] == "failed"]
    return {
        "status": "failed" if failed else "passed",
        "api_base": api_base,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "results": results,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Run BookedAI Customer Booking Agent UAT probes.")
    parser.add_argument("--api-base", default=os.environ.get("BOOKEDAI_UAT_API_BASE", "https://api.bookedai.au"))
    parser.add_argument(
        "--telegram-secret",
        default=os.environ.get("BOOKEDAI_CUSTOMER_TELEGRAM_WEBHOOK_SECRET_TOKEN"),
        help="Telegram webhook secret. It is only sent as a header and is never printed.",
    )
    parser.add_argument(
        "--telegram-chat-id",
        default=os.environ.get("BOOKEDAI_CUSTOMER_TELEGRAM_UAT_CHAT_ID"),
        help="Private Telegram chat id that can receive UAT replies.",
    )
    parser.add_argument("--timeout", type=float, default=30.0)
    args = parser.parse_args()

    summary = run_uat(
        api_base=_api_base(args.api_base),
        telegram_secret=args.telegram_secret,
        telegram_chat_id=args.telegram_chat_id,
        timeout=args.timeout,
    )
    print(json.dumps(summary, indent=2))
    if summary["status"] != "passed":
        sys.exit(1)


if __name__ == "__main__":
    main()
