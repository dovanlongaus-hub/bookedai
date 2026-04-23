#!/usr/bin/env python3
from __future__ import annotations

import json
import os
import ssl
from pathlib import Path
from urllib import error, request


REPO_ROOT = Path(__file__).resolve().parents[1]


def load_repo_env() -> None:
    env_path = REPO_ROOT / ".env"
    if not env_path.exists():
        return
    for raw_line in env_path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        if key and key not in os.environ:
            os.environ[key] = value


def env_value(name: str, default: str = "") -> str:
    return (os.getenv(name) or default).strip()


def main() -> int:
    load_repo_env()
    public_api_url = env_value("PUBLIC_API_URL", "https://api.bookedai.au")
    target_api_url = env_value("ZOHO_CRM_NOTIFICATION_AUTO_RENEW_API_URL", public_api_url)
    target_host_header = env_value("ZOHO_CRM_NOTIFICATION_AUTO_RENEW_HOST_HEADER")
    skip_tls_verify = env_value("ZOHO_CRM_NOTIFICATION_AUTO_RENEW_SKIP_TLS_VERIFY", "false").lower() in {
        "1",
        "true",
        "yes",
        "on",
    }
    admin_api_token = env_value("ADMIN_API_TOKEN")
    threshold_hours = env_value("ZOHO_CRM_NOTIFICATION_AUTO_RENEW_THRESHOLD_HOURS", "24")
    request_timeout = float(env_value("ZOHO_CRM_NOTIFICATION_AUTO_RENEW_TIMEOUT_SECONDS", "15"))

    if not admin_api_token:
        print("ADMIN_API_TOKEN is required for Zoho CRM webhook auto-renew.")
        return 2

    url = f"{target_api_url.rstrip('/')}/api/v1/integrations/crm-feedback/zoho-webhook/auto-renew"
    payload = json.dumps({"threshold_hours": int(threshold_hours or "24")}).encode("utf-8")
    headers = {
        "Authorization": f"Bearer {admin_api_token}",
        "Content-Type": "application/json",
    }
    if target_host_header:
        headers["Host"] = target_host_header
    req = request.Request(
        url,
        data=payload,
        headers=headers,
        method="POST",
    )
    ssl_context = None
    if skip_tls_verify:
        ssl_context = ssl._create_unverified_context()

    try:
        with request.urlopen(req, timeout=request_timeout, context=ssl_context) as response:
            body = response.read().decode("utf-8")
    except error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")
        print(f"Zoho CRM webhook auto-renew failed with HTTP {exc.code}: {detail}")
        return 1
    except Exception as exc:  # pragma: no cover - CLI fallback
        print(f"Zoho CRM webhook auto-renew request failed: {exc}")
        return 1

    print(body)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
