#!/usr/bin/env python3
from __future__ import annotations

import argparse
import ast
import json
import os
import sys
from pathlib import Path
from urllib.parse import urlencode
from urllib.request import Request, urlopen


REPO_ROOT = Path(__file__).resolve().parents[1]

DEFAULT_SUCCESS_URL = "https://portal.bookedai.au/?stripe_sandbox=success&session_id={CHECKOUT_SESSION_ID}"
DEFAULT_CANCEL_URL = "https://portal.bookedai.au/?stripe_sandbox=cancelled"


def _read_stripe_api_version() -> str:
    constants_path = REPO_ROOT / "backend" / "integrations" / "stripe" / "constants.py"
    parsed = ast.parse(constants_path.read_text(encoding="utf-8"))
    for node in parsed.body:
        if (
            isinstance(node, ast.Assign)
            and any(isinstance(target, ast.Name) and target.id == "STRIPE_API_VERSION" for target in node.targets)
            and isinstance(node.value, ast.Constant)
            and isinstance(node.value.value, str)
        ):
            return node.value.value
    raise RuntimeError("Could not read STRIPE_API_VERSION from backend/integrations/stripe/constants.py")


STRIPE_API_VERSION = _read_stripe_api_version()


def _load_dotenv(path: Path) -> None:
    if not path.exists():
        return
    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        if key and key not in os.environ:
            os.environ[key] = value


def _checkout_form(args: argparse.Namespace) -> list[tuple[str, str]]:
    amount_cents = int(round(float(args.amount_aud) * 100))
    return [
        ("mode", "payment"),
        ("success_url", args.success_url),
        ("cancel_url", args.cancel_url),
        ("line_items[0][quantity]", "1"),
        ("line_items[0][price_data][currency]", args.currency.lower()),
        ("line_items[0][price_data][unit_amount]", str(amount_cents)),
        ("line_items[0][price_data][product_data][name]", "BookedAI Stripe Sandbox Smoke"),
        ("client_reference_id", "bookedai-stripe-sandbox-smoke"),
        ("metadata[source]", "stripe_sandbox_smoke"),
        ("metadata[environment]", "test"),
    ]


def _emit(payload: dict[str, object]) -> None:
    print(json.dumps(payload, indent=2, sort_keys=True))


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Create a safe Stripe test-mode Checkout Session for BookedAI smoke testing."
    )
    parser.add_argument("--env-file", default=str(REPO_ROOT / ".env"))
    parser.add_argument("--amount-aud", type=float, default=1.0)
    parser.add_argument("--currency", default=os.getenv("STRIPE_CURRENCY", "aud"))
    parser.add_argument("--customer-email", default="")
    parser.add_argument("--success-url", default=DEFAULT_SUCCESS_URL)
    parser.add_argument("--cancel-url", default=DEFAULT_CANCEL_URL)
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    _load_dotenv(Path(args.env_file))
    secret_key = os.getenv("STRIPE_SECRET_KEY", "").strip()
    form_data = _checkout_form(args)
    if args.customer_email.strip():
        form_data.append(("customer_email", args.customer_email.strip().lower()))

    if args.dry_run:
        _emit(
            {
                "configured": bool(secret_key),
                "dry_run": True,
                "api_version": STRIPE_API_VERSION,
                "currency": args.currency.lower(),
                "amount_cents": int(round(float(args.amount_aud) * 100)),
                "uses_dynamic_payment_methods": True,
                "would_create": "checkout.session",
            }
        )
        return 0

    if not secret_key:
        print("STRIPE_SECRET_KEY is not configured. Use --dry-run or set a Stripe test key.", file=sys.stderr)
        return 2
    if not secret_key.startswith("sk_test_"):
        print("Refusing to run with a non-test Stripe secret key. Expected sk_test_...", file=sys.stderr)
        return 2

    request = Request(
        "https://api.stripe.com/v1/checkout/sessions",
        data=urlencode(form_data).encode(),
        headers={
            "Authorization": f"Bearer {secret_key}",
            "Content-Type": "application/x-www-form-urlencoded",
            "Stripe-Version": STRIPE_API_VERSION,
        },
        method="POST",
    )
    with urlopen(request, timeout=20) as response:
        response_payload = json.loads(response.read().decode("utf-8"))

    _emit(
        {
            "configured": True,
            "dry_run": False,
            "api_version": STRIPE_API_VERSION,
            "checkout_session_id": response_payload.get("id"),
            "checkout_url": response_payload.get("url"),
            "payment_status": response_payload.get("payment_status"),
            "uses_dynamic_payment_methods": True,
        }
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
