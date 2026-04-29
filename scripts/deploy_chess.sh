#!/usr/bin/env bash
#
# deploy_chess.sh — chess.bookedai.au standalone redeploy.
#
# Use this script when you want to ship a chess-only iteration (copy, CTAs,
# launch promo, pricing) WITHOUT triggering a full monorepo redeploy via
# scripts/deploy_production.sh.
#
# What it does:
#   1. Typecheck the frontend (whole monorepo — chess shares source).
#   2. Build ONLY the chess sub-app (frontend/dist-chess/).
#   3. Rsync dist-chess/ to the nginx static root for chess.bookedai.au.
#   4. Reload nginx (no proxy / docker restart).
#
# Pre-requisites (one-time):
#   - nginx server block for chess.bookedai.au points its `root` at
#     ${NGINX_CHESS_ROOT} with `try_files $uri /index.html;`.
#     See docs/architecture/chess-subproject.md for the recommended nginx
#     snippet (Option B).
#   - The directory ${NGINX_CHESS_ROOT} exists and is writable by the user
#     running this script.
#
# Override the deploy target:
#   NGINX_CHESS_ROOT=/srv/www/chess.bookedai.au bash scripts/deploy_chess.sh

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR/frontend"

echo "[deploy-chess] typecheck"
npx tsc --noEmit -p .

echo "[deploy-chess] build chess subapp"
npm run build:chess

NGINX_CHESS_ROOT="${NGINX_CHESS_ROOT:-/var/www/chess.bookedai.au}"

echo "[deploy-chess] sync dist-chess/ -> $NGINX_CHESS_ROOT"

if [[ ! -d "$NGINX_CHESS_ROOT" ]]; then
  echo "[deploy-chess] target dir $NGINX_CHESS_ROOT does not exist." >&2
  echo "[deploy-chess] Create it first (mkdir -p) or set NGINX_CHESS_ROOT to your nginx static root." >&2
  exit 1
fi

rsync -av --delete dist-chess/ "$NGINX_CHESS_ROOT/"

echo "[deploy-chess] reload nginx (no full proxy restart)"
if command -v sudo >/dev/null 2>&1 && sudo -n true >/dev/null 2>&1; then
  sudo -n nginx -s reload || true
else
  nginx -s reload || true
fi

echo "[deploy-chess] done — chess.bookedai.au now serves $NGINX_CHESS_ROOT"
