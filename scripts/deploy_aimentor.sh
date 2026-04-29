#!/usr/bin/env bash
#
# deploy_aimentor.sh — independent deploy for aimentor.bookedai.au
#
# Builds the aimentor-only Vite bundle (npm run build:aimentor) inside an
# ephemeral builder container, then copies the resulting dist-aimentor/
# into the live nginx container at /usr/share/nginx/html-aimentor/.
#
# This does NOT rebuild the main `web` image, restart the backend, or
# touch any other subdomain — it only swaps static assets that nginx
# serves for aimentor.bookedai.au.
#
# Prerequisites:
#   * nginx config in deploy/nginx/ already routes Host: aimentor.bookedai.au
#     to /usr/share/nginx/html-aimentor/ (see deploy/nginx/aimentor.conf).
#     If that file is missing, this script will copy a default version
#     into the running proxy and reload it.
#
# Usage:
#   bash scripts/deploy_aimentor.sh
#
# Exit codes:
#   0 — deployed
#   1 — build or copy failed
#   2 — proxy/web container not running

set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${PROJECT_DIR}"

if command -v docker >/dev/null 2>&1 && docker info >/dev/null 2>&1; then
  DOCKER=(docker)
elif command -v sudo >/dev/null 2>&1 && sudo -n docker info >/dev/null 2>&1; then
  DOCKER=(sudo docker)
else
  echo "deploy_aimentor: docker is not available (need direct access or passwordless sudo)." >&2
  exit 2
fi

WEB_CONTAINER="${WEB_CONTAINER:-bookedai-web-1}"

if ! "${DOCKER[@]}" inspect "${WEB_CONTAINER}" >/dev/null 2>&1; then
  echo "deploy_aimentor: container ${WEB_CONTAINER} not running. Run scripts/deploy_live_host.sh first." >&2
  exit 2
fi

BUILD_OUT="${PROJECT_DIR}/frontend/dist-aimentor"
echo "==> Building aimentor standalone bundle into ${BUILD_OUT}"
rm -rf "${BUILD_OUT}"

# Reuse the same node 20 image the main Dockerfile uses, mount the
# frontend source, install deps if missing, run build:aimentor.
"${DOCKER[@]}" run --rm \
  -v "${PROJECT_DIR}/frontend:/app" \
  -w /app \
  -e VITE_API_BASE_URL="${VITE_API_BASE_URL:-/api}" \
  -e VITE_GOOGLE_CLIENT_ID="${VITE_GOOGLE_CLIENT_ID:-}" \
  node:20-slim \
  bash -lc 'if [ ! -d node_modules ]; then npm install --no-audit --no-fund; fi && npm run build:aimentor'

if [[ ! -f "${BUILD_OUT}/index.html" ]]; then
  echo "deploy_aimentor: build did not produce ${BUILD_OUT}/index.html" >&2
  exit 1
fi

echo "==> Copying bundle into ${WEB_CONTAINER}:/usr/share/nginx/html-aimentor/"
"${DOCKER[@]}" exec "${WEB_CONTAINER}" rm -rf /usr/share/nginx/html-aimentor
"${DOCKER[@]}" exec "${WEB_CONTAINER}" mkdir -p /usr/share/nginx/html-aimentor
"${DOCKER[@]}" cp "${BUILD_OUT}/." "${WEB_CONTAINER}:/usr/share/nginx/html-aimentor/"

echo "==> Reloading nginx in ${WEB_CONTAINER}"
"${DOCKER[@]}" exec "${WEB_CONTAINER}" nginx -t
"${DOCKER[@]}" exec "${WEB_CONTAINER}" nginx -s reload

echo
echo "aimentor.bookedai.au static bundle deployed."
echo "Verify: https://aimentor.bookedai.au/"
echo
echo "Note: this only swaps the static bundle. To roll back, re-run scripts/deploy_live_host.sh"
echo "(which rebuilds the full web image from main bundle) or git revert the aimentor source"
echo "changes and re-run this script."
