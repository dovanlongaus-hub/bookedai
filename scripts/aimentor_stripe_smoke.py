#!/usr/bin/env python3
"""AI Mentor Stripe + booking smoke test (run-locally).

Exercises the live Founding-Cohort booking flow end-to-end against a running
backend (default ``http://localhost:8000``). Each run creates a real lead +
real booking intent + real Stripe payment intent (test-mode) so you can
verify the production wiring before flipping the promo live.

Prerequisites:
  * Backend is up: ``uvicorn main:app --reload --port 8000`` from
    /home/dovanlong/BookedAI/backend
  * Stripe test keys configured (``STRIPE_API_KEY=sk_test_...``)
  * SMTP test sink (e.g. mailhog or ``EMAIL_DRY_RUN=true``) so the welcome
    email doesn't spam real inboxes
  * Migration ``035_aimentor_copy_refresh_promo_2026_q2.sql`` applied

Usage:
  python3 scripts/aimentor_stripe_smoke.py [--base http://localhost:8000]
                                           [--email me+smoke@example.com]
                                           [--locale en|vi]
                                           [--service-id ai-mentor-private-first-ai-app-60]

Exit code 0 = all probes passed; non-zero = first failure surfaced.
"""

from __future__ import annotations

import argparse
import json
import sys
import urllib.error
import urllib.request
import uuid
from typing import Any


def _post(url: str, payload: dict[str, Any]) -> tuple[int, dict[str, Any] | None]:
    body = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=body,
        method="POST",
        headers={"Content-Type": "application/json", "Accept": "application/json"},
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as response:
            raw = response.read().decode("utf-8")
            try:
                return response.status, json.loads(raw)
            except json.JSONDecodeError:
                return response.status, None
    except urllib.error.HTTPError as exc:
        try:
            payload_err = json.loads(exc.read().decode("utf-8"))
        except Exception:  # noqa: BLE001
            payload_err = None
        return exc.code, payload_err
    except urllib.error.URLError as exc:
        print(f"  ✗ Connection error: {exc.reason}")
        return 0, None


def probe_lead(base: str, email: str, locale: str) -> bool:
    print("[1/3] POST /api/v1/leads — Founding Cohort lead capture")
    status, payload = _post(
        f"{base}/api/v1/leads",
        {
            "tenant_ref": "ai-mentor-doer",
            "locale": locale,
            "full_name": f"Smoke Tester {uuid.uuid4().hex[:6]}",
            "email": email,
            "phone": "+61400000000",
            "interest": "Private 1-on-1 — First AI App in 60 Minutes",
            "message": "smoke test — Founding Cohort enrol",
            "source": "aimentor_stripe_smoke",
            "medium": "smoke_script",
            "campaign": "aimentor_smoke",
            "surface": "stripe_smoke",
        },
    )
    if status >= 400:
        print(f"  ✗ HTTP {status}: {payload}")
        return False
    print(f"  ✓ HTTP {status} — lead recorded")
    return True


def probe_booking_intent(
    base: str, email: str, service_id: str, locale: str
) -> str | None:
    print("[2/3] POST /api/v1/bookings/intents — booking + Stripe checkout")
    status, payload = _post(
        f"{base}/api/v1/bookings/intents",
        {
            "channel": "public_web",
            "tenant_ref": "ai-mentor-doer",
            "service_id": service_id,
            "locale": locale,
            "contact": {
                "full_name": f"Smoke Tester {uuid.uuid4().hex[:6]}",
                "email": email,
                "phone": "+61400000000",
            },
            "desired_slot": {
                "date": "2026-05-15",
                "time": "19:00",
                "timezone": "Australia/Sydney",
            },
            "source": "aimentor_stripe_smoke",
        },
    )
    if status >= 400 or not payload:
        print(f"  ✗ HTTP {status}: {payload}")
        return None
    data = (payload or {}).get("data") or {}
    booking_reference = data.get("booking_reference")
    print(
        f"  ✓ HTTP {status} — booking_reference={booking_reference} "
        f"checkout_url={data.get('payment', {}).get('checkout_url') or '(none)'}"
    )
    return booking_reference


def probe_feedback_endpoint_exists(base: str, booking_reference: str) -> bool:
    print("[3/3] POST /api/v1/booking/{ref}/feedback — endpoint shape sanity")
    status, payload = _post(
        f"{base}/api/v1/booking/{booking_reference}/feedback",
        {
            "rating": 5,
            "comment": "smoke",
            "would_recommend": True,
            "channel": "stripe_smoke",
        },
    )
    # 401/403 means HMAC is enforced — that's expected from a smoke client
    # without the portal token. We just want to know the route exists.
    if status in {200, 401, 403, 422}:
        print(f"  ✓ HTTP {status} — feedback route reachable")
        return True
    print(f"  ✗ HTTP {status}: {payload}")
    return False


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--base",
        default="http://localhost:8000",
        help="Backend base URL (default: http://localhost:8000)",
    )
    parser.add_argument(
        "--email",
        default="aimentor+smoke@bookedai.au",
        help="Lead/booking email (default: aimentor+smoke@bookedai.au)",
    )
    parser.add_argument(
        "--locale",
        default="en",
        choices=["en", "vi"],
        help="Locale for lead + booking + welcome email (default: en)",
    )
    parser.add_argument(
        "--service-id",
        default="ai-mentor-private-first-ai-app-60",
        help="service_id of the program to book (default: 60-min first AI app)",
    )
    args = parser.parse_args()

    print(f"AI Mentor smoke test against {args.base}")
    print(f"  email={args.email}  locale={args.locale}  service_id={args.service_id}\n")

    if not probe_lead(args.base, args.email, args.locale):
        return 1

    booking_reference = probe_booking_intent(
        args.base, args.email, args.service_id, args.locale
    )
    if not booking_reference:
        return 1

    if not probe_feedback_endpoint_exists(args.base, booking_reference):
        return 1

    print("\nAll probes passed.")
    print("Manual verification checklist:")
    print(
        f"  1. Welcome email arrived at {args.email} (subject mentions "
        f"'{args.service_id}', includes Zoho Meeting + Google Calendar block)"
    )
    print(
        "  2. Stripe Dashboard test mode shows the new payment_intent "
        "(should reflect Founding Cohort discounted amount)"
    )
    print(
        f"  3. WhatsApp send attempted to +61400000000 (will fail since it's a "
        f"test number — log line ``whatsapp_booking_confirmation_failed`` "
        f"is expected and harmless)"
    )
    print(
        f"  4. booking_intents row {booking_reference} has "
        "reminder_cadence='monthly' and reminder_next_at set 30 days out"
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
