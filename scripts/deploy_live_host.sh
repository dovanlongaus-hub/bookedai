#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if ! command -v docker >/dev/null 2>&1; then
  cat <<'EOF' >&2
Live deploy requires the Docker host environment.
Run this from the VPS host, or from OpenClaw exec with host-level execution enabled.
EOF
  exit 1
fi

if command -v sudo >/dev/null 2>&1 && sudo -n true >/dev/null 2>&1; then
  exec sudo -n bash scripts/deploy_production.sh
fi

exec bash scripts/deploy_production.sh
