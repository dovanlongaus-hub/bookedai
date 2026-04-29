#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WEBHOOK_URL="${STRIPE_WEBHOOK_FORWARD_URL:-http://localhost:8000/api/webhooks/stripe}"

if ! command -v stripe >/dev/null 2>&1; then
  cat >&2 <<'EOF'
Stripe CLI is not installed.

Install it first, then rerun this script:
  macOS: brew install stripe/stripe-cli/stripe
  Linux/manual: https://docs.stripe.com/stripe-cli

This script intentionally does not install global system tools automatically.
EOF
  exit 127
fi

if [[ -f "$ROOT_DIR/.env" ]]; then
  set -a
  # shellcheck disable=SC1091
  source "$ROOT_DIR/.env"
  set +a
fi

if [[ -z "${STRIPE_SECRET_KEY:-}" || "${STRIPE_SECRET_KEY}" != sk_test_* ]]; then
  echo "STRIPE_SECRET_KEY must be set to a Stripe test-mode key (sk_test_...)." >&2
  exit 2
fi

cat <<EOF
Stripe CLI is available.

Run the listener in a separate terminal:
  stripe listen --api-key "$STRIPE_SECRET_KEY" --forward-to "$WEBHOOK_URL"

Copy the printed whsec_... value into STRIPE_WEBHOOK_SECRET, restart the backend,
then trigger a test event from another terminal:
  stripe trigger checkout.session.completed --api-key "$STRIPE_SECRET_KEY"

Expected backend route:
  POST $WEBHOOK_URL -> HTTP 200
EOF

