#!/usr/bin/env python3

from __future__ import annotations

import argparse
import json
import os
from pathlib import Path
from typing import Any
from urllib.error import HTTPError
from urllib.parse import urlencode, urlparse
from urllib.request import Request, urlopen


REPO_ROOT = Path(__file__).resolve().parent.parent
DEFAULT_SCOPE = "ZohoCRM.modules.ALL,ZohoCRM.settings.ALL,ZohoCRM.notifications.ALL"


def load_env_file(path: Path) -> None:
    if not path.exists():
        return
    for raw_line in path.read_text().splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        os.environ.setdefault(key, value)


def get_env(name: str, default: str = "") -> str:
    return os.getenv(name, default).strip()


def derive_zoho_accounts_base_url(*candidate_api_urls: str) -> str:
    host_to_accounts_url = {
        "www.zohoapis.com": "https://accounts.zoho.com",
        "www.zohoapis.com.au": "https://accounts.zoho.com.au",
        "www.zohoapis.eu": "https://accounts.zoho.eu",
        "www.zohoapis.in": "https://accounts.zoho.in",
        "www.zohoapis.com.cn": "https://accounts.zoho.com.cn",
        "www.zohoapis.jp": "https://accounts.zoho.jp",
        "www.zohocloud.ca": "https://accounts.zohocloud.ca",
    }
    for candidate in candidate_api_urls:
        value = (candidate or "").strip()
        if not value:
            continue
        hostname = (urlparse(value).hostname or "").lower()
        if hostname in host_to_accounts_url:
            return host_to_accounts_url[hostname]
    return "https://accounts.zoho.com"


def current_zoho_settings() -> dict[str, str]:
    load_env_file(REPO_ROOT / "backend" / ".env")
    load_env_file(REPO_ROOT / ".env")
    crm_api_base_url = get_env("ZOHO_CRM_API_BASE_URL", "https://www.zohoapis.com.au/crm/v8")
    bookings_api_base_url = get_env(
        "ZOHO_BOOKINGS_API_BASE_URL",
        "https://www.zohoapis.com.au/bookings/v1/json",
    )
    accounts_base_url = get_env("ZOHO_ACCOUNTS_BASE_URL", "")
    if not accounts_base_url:
        accounts_base_url = derive_zoho_accounts_base_url(crm_api_base_url, bookings_api_base_url)
    return {
        "crm_api_base_url": crm_api_base_url,
        "bookings_api_base_url": bookings_api_base_url,
        "accounts_base_url": accounts_base_url,
        "access_token": get_env("ZOHO_CRM_ACCESS_TOKEN", ""),
        "refresh_token": get_env("ZOHO_CRM_REFRESH_TOKEN", ""),
        "client_id": get_env("ZOHO_CRM_CLIENT_ID", ""),
        "client_secret": get_env("ZOHO_CRM_CLIENT_SECRET", ""),
        "default_lead_module": get_env("ZOHO_CRM_DEFAULT_LEAD_MODULE", "Leads"),
        "default_contact_module": get_env("ZOHO_CRM_DEFAULT_CONTACT_MODULE", "Contacts"),
        "default_deal_module": get_env("ZOHO_CRM_DEFAULT_DEAL_MODULE", "Deals"),
        "default_task_module": get_env("ZOHO_CRM_DEFAULT_TASK_MODULE", "Tasks"),
    }


def update_env_file(env_path: Path, updates: dict[str, str]) -> None:
    lines = env_path.read_text().splitlines() if env_path.exists() else []
    output: list[str] = []
    seen: set[str] = set()

    for line in lines:
        stripped = line.strip()
        if "=" in line and not stripped.startswith("#"):
            key = line.split("=", 1)[0]
            if key in updates:
                output.append(f"{key}={updates[key]}")
                seen.add(key)
                continue
        output.append(line)

    for key, value in updates.items():
        if key not in seen:
            output.append(f"{key}={value}")

    env_path.write_text("\n".join(output).rstrip() + "\n")


def request_json(
    *,
    method: str,
    url: str,
    headers: dict[str, str] | None = None,
    form_data: dict[str, str] | None = None,
    query_params: dict[str, str] | None = None,
) -> dict[str, Any]:
    request_url = url
    if query_params:
        request_url = f"{url}?{urlencode(query_params)}"

    body: bytes | None = None
    request_headers = dict(headers or {})
    if form_data is not None:
        body = urlencode(form_data).encode("utf-8")
        request_headers.setdefault("Content-Type", "application/x-www-form-urlencoded")

    request = Request(request_url, data=body, headers=request_headers, method=method)
    try:
        with urlopen(request, timeout=20) as response:
            payload = response.read().decode("utf-8")
    except HTTPError as error:
        detail = error.read().decode("utf-8", errors="replace")
        raise SystemExit(f"Zoho request failed with HTTP {error.code}: {detail[:500]}")

    data = json.loads(payload)
    if not isinstance(data, dict):
        raise SystemExit("Expected a JSON object from Zoho.")
    return data


def get_access_token(settings: dict[str, str]) -> tuple[str, str | None, str]:
    direct_token = settings["access_token"]
    if direct_token:
        return direct_token, None, "access_token"

    refresh_token = settings["refresh_token"]
    client_id = settings["client_id"]
    client_secret = settings["client_secret"]
    if not (refresh_token and client_id and client_secret):
        raise SystemExit(
            "Zoho CRM is not configured. Set ZOHO_CRM_ACCESS_TOKEN or the refresh-token trio."
        )

    payload = request_json(
        method="POST",
        url=f"{settings['accounts_base_url'].rstrip('/')}/oauth/v2/token",
        form_data={
            "grant_type": "refresh_token",
            "refresh_token": refresh_token,
            "client_id": client_id,
            "client_secret": client_secret,
        },
    )
    access_token = str(payload.get("access_token") or "").strip()
    if not access_token:
        raise SystemExit("Zoho token exchange did not return an access token.")
    api_domain = str(payload.get("api_domain") or "").strip() or None
    return access_token, api_domain, "refresh_token"


def resolve_api_base_url(settings: dict[str, str], api_domain: str | None) -> str:
    if api_domain:
        return f"{api_domain.rstrip('/')}/crm/v8"
    return settings["crm_api_base_url"].rstrip("/")


def fetch_modules(*, access_token: str, api_base_url: str) -> list[dict[str, Any]]:
    payload = request_json(
        method="GET",
        url=f"{api_base_url.rstrip('/')}/settings/modules",
        headers={"Authorization": f"Zoho-oauthtoken {access_token}"},
    )
    items = payload.get("modules") or payload.get("data") or []
    if not isinstance(items, list):
        return []
    modules: list[dict[str, Any]] = []
    for item in items:
        if not isinstance(item, dict):
            continue
        modules.append(
            {
                "api_name": item.get("api_name"),
                "module_name": item.get("module_name") or item.get("singular_label") or item.get("plural_label"),
                "singular_label": item.get("singular_label"),
                "plural_label": item.get("plural_label"),
                "generated_type": item.get("generated_type"),
                "visible": item.get("visible"),
                "creatable": item.get("creatable"),
                "editable": item.get("editable"),
                "deletable": item.get("deletable"),
            }
        )
    return modules


def fetch_fields(*, access_token: str, api_base_url: str, module_api_name: str) -> list[dict[str, Any]]:
    payload = request_json(
        method="GET",
        url=f"{api_base_url.rstrip('/')}/settings/fields",
        headers={"Authorization": f"Zoho-oauthtoken {access_token}"},
        query_params={"module": module_api_name},
    )
    items = payload.get("fields") or payload.get("data") or []
    if not isinstance(items, list):
        return []
    fields: list[dict[str, Any]] = []
    for item in items:
        if not isinstance(item, dict):
            continue
        fields.append(
            {
                "api_name": item.get("api_name"),
                "display_label": item.get("display_label"),
                "data_type": item.get("data_type"),
                "required": item.get("required"),
                "read_only": item.get("read_only"),
                "system_mandatory": item.get("system_mandatory"),
                "visible": item.get("visible"),
            }
        )
    return fields


def command_authorize_url(args: argparse.Namespace) -> int:
    settings = current_zoho_settings()
    client_id = (args.client_id or settings["client_id"]).strip()
    if not client_id:
        raise SystemExit("Missing client id. Set ZOHO_CRM_CLIENT_ID or pass --client-id.")
    accounts_base_url = (args.accounts_base_url or settings["accounts_base_url"]).strip()
    query = {
        "scope": args.scope,
        "client_id": client_id,
        "response_type": "code",
        "access_type": args.access_type,
        "redirect_uri": args.redirect_uri,
        "prompt": args.prompt,
    }
    if args.state:
        query["state"] = args.state
    print(f"{accounts_base_url.rstrip('/')}/oauth/v2/auth?{urlencode(query)}")
    return 0


def command_exchange_code(args: argparse.Namespace) -> int:
    settings = current_zoho_settings()
    client_id = (args.client_id or settings["client_id"]).strip()
    client_secret = (args.client_secret or settings["client_secret"]).strip()
    accounts_base_url = (args.accounts_base_url or settings["accounts_base_url"]).strip()
    if not client_id:
        raise SystemExit("Missing client id. Set ZOHO_CRM_CLIENT_ID or pass --client-id.")
    if not client_secret:
        raise SystemExit("Missing client secret. Set ZOHO_CRM_CLIENT_SECRET or pass --client-secret.")

    payload = request_json(
        method="POST",
        url=f"{accounts_base_url.rstrip('/')}/oauth/v2/token",
        form_data={
            "grant_type": "authorization_code",
            "client_id": client_id,
            "client_secret": client_secret,
            "redirect_uri": args.redirect_uri,
            "code": args.code,
        },
    )
    print(json.dumps(payload, indent=2, sort_keys=True))

    if args.write_env:
        updates = {
            "ZOHO_CRM_CLIENT_ID": client_id,
            "ZOHO_CRM_CLIENT_SECRET": client_secret,
            "ZOHO_ACCOUNTS_BASE_URL": accounts_base_url,
        }
        refresh_token = str(payload.get("refresh_token") or "").strip()
        access_token = str(payload.get("access_token") or "").strip()
        api_domain = str(payload.get("api_domain") or "").strip()
        if refresh_token:
            updates["ZOHO_CRM_REFRESH_TOKEN"] = refresh_token
        if access_token:
            updates["ZOHO_CRM_ACCESS_TOKEN"] = access_token
        if api_domain:
            updates["ZOHO_CRM_API_BASE_URL"] = f"{api_domain.rstrip('/')}/crm/v8"
        update_env_file(args.env_file, updates)
        print(f"Updated {args.env_file}")

    return 0


def command_test_connection(args: argparse.Namespace) -> int:
    settings = current_zoho_settings()
    access_token, api_domain, token_source = get_access_token(settings)
    api_base_url = resolve_api_base_url(settings, api_domain)
    requested_module = (args.module or settings["default_lead_module"]).strip() or "Leads"
    modules = fetch_modules(access_token=access_token, api_base_url=api_base_url)
    fields = fetch_fields(
        access_token=access_token,
        api_base_url=api_base_url,
        module_api_name=requested_module,
    )
    payload = {
        "provider": "zoho_crm",
        "status": "connected",
        "token_source": token_source,
        "accounts_base_url": settings["accounts_base_url"],
        "api_base_url": api_base_url,
        "api_domain": api_domain,
        "module_count": len(modules),
        "modules": modules[:20],
        "requested_module": requested_module,
        "requested_module_found": any(
            str(item.get("api_name") or "").strip().lower() == requested_module.lower()
            for item in modules
        ),
        "field_count": len(fields),
        "fields": fields[:25],
        "defaults": {
            "lead_module": settings["default_lead_module"],
            "contact_module": settings["default_contact_module"],
            "deal_module": settings["default_deal_module"],
            "task_module": settings["default_task_module"],
        },
    }
    print(json.dumps(payload, indent=2, sort_keys=True))
    return 0


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Helper for connecting BookedAI to Zoho CRM with OAuth and smoke tests."
    )
    subparsers = parser.add_subparsers(dest="command", required=True)

    authorize_parser = subparsers.add_parser(
        "authorize-url",
        help="Print the Zoho Accounts consent URL for generating an authorization code.",
    )
    authorize_parser.add_argument("--redirect-uri", required=True, help="Registered Zoho OAuth redirect URI.")
    authorize_parser.add_argument("--client-id", help="Override ZOHO_CRM_CLIENT_ID.")
    authorize_parser.add_argument("--accounts-base-url", help="Override ZOHO_ACCOUNTS_BASE_URL.")
    authorize_parser.add_argument("--scope", default=DEFAULT_SCOPE, help="OAuth scopes to request.")
    authorize_parser.add_argument("--access-type", default="offline", choices=["offline", "online"])
    authorize_parser.add_argument("--prompt", default="consent", help="Zoho OAuth prompt mode.")
    authorize_parser.add_argument("--state", help="Optional OAuth state value.")
    authorize_parser.set_defaults(func=command_authorize_url)

    exchange_parser = subparsers.add_parser(
        "exchange-code",
        help="Exchange a Zoho authorization code for access and refresh tokens.",
    )
    exchange_parser.add_argument("--code", required=True, help="Authorization code returned by Zoho.")
    exchange_parser.add_argument("--redirect-uri", required=True, help="Same redirect URI used in authorization.")
    exchange_parser.add_argument("--client-id", help="Override ZOHO_CRM_CLIENT_ID.")
    exchange_parser.add_argument("--client-secret", help="Override ZOHO_CRM_CLIENT_SECRET.")
    exchange_parser.add_argument("--accounts-base-url", help="Override ZOHO_ACCOUNTS_BASE_URL.")
    exchange_parser.add_argument(
        "--write-env",
        action="store_true",
        help="Persist returned OAuth values into the env file.",
    )
    exchange_parser.add_argument(
        "--env-file",
        type=Path,
        default=REPO_ROOT / ".env",
        help="Env file to update when --write-env is used.",
    )
    exchange_parser.set_defaults(func=command_exchange_code)

    test_parser = subparsers.add_parser(
        "test-connection",
        help="Run a direct Zoho CRM metadata smoke test from the current env configuration.",
    )
    test_parser.add_argument("--module", default="Leads", help="Zoho CRM module API name to inspect.")
    test_parser.set_defaults(func=command_test_connection)

    return parser


def main() -> int:
    parser = build_parser()
    args = parser.parse_args()
    return args.func(args)


if __name__ == "__main__":
    raise SystemExit(main())
