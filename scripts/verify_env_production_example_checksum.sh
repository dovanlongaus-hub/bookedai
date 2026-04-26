#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_EXAMPLE="$ROOT_DIR/.env.production.example"
CHECKSUM_FILE="$ROOT_DIR/checksums/env-production-example.sha256"

if [[ ! -f "$ENV_EXAMPLE" ]]; then
  echo "[env-checksum] missing $ENV_EXAMPLE" >&2
  exit 1
fi

if [[ "${1:-}" == "--update" ]]; then
  mkdir -p "$(dirname "$CHECKSUM_FILE")"
  (
    cd "$ROOT_DIR"
    sha256sum .env.production.example > "$CHECKSUM_FILE"
  )
  echo "[env-checksum] updated $CHECKSUM_FILE"
  exit 0
fi

if [[ ! -f "$CHECKSUM_FILE" ]]; then
  echo "[env-checksum] missing $CHECKSUM_FILE" >&2
  echo "[env-checksum] run: scripts/verify_env_production_example_checksum.sh --update" >&2
  exit 1
fi

(
  cd "$ROOT_DIR"
  sha256sum --check "$CHECKSUM_FILE"
)

