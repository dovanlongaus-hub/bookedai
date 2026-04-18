#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

required_files=(
  "frontend/public/branding/bookedai-logo-light.png"
  "frontend/public/branding/bookedai-logo-dark-badge.png"
  "frontend/public/branding/bookedai-logo-black.png"
  "frontend/public/branding/bookedai-mark-gradient.png"
  "frontend/public/branding/bookedai-app-icon-1024.png"
  "frontend/public/branding/bookedai-icon-16.png"
  "frontend/public/branding/bookedai-icon-32.png"
  "frontend/public/branding/bookedai-icon-48.png"
  "frontend/public/branding/bookedai-icon-64.png"
  "frontend/public/branding/bookedai-icon-96.png"
  "frontend/public/branding/bookedai-icon-180.png"
  "frontend/public/branding/bookedai-icon-192.png"
  "frontend/public/branding/bookedai-icon-256.png"
  "frontend/public/branding/bookedai-icon-512.png"
  "frontend/public/branding/bookedai-apple-touch-icon.png"
  "frontend/public/branding/bookedai-mobile-icon-192.png"
  "frontend/public/branding/bookedai-mobile-icon-512.png"
)

legacy_files=(
  "frontend/public/branding/bookedai-homepage-logo.jpg"
  "frontend/public/branding/bookedai-logo-cropped.png"
  "frontend/public/branding/bookedai-logo-dark.png"
  "frontend/public/branding/bookedai-logo-square.png"
  "frontend/public/branding/bookedai-logo.png"
  "frontend/public/branding/bookedai-logo.svg"
  "frontend/public/branding/bookedai-mark-dark.png"
  "frontend/public/branding/bookedai-mark.png"
  "frontend/public/branding/bookedai-mark.svg"
  "frontend/public/branding/bookedai-revenue-engine-black.svg"
  "frontend/public/branding/bookedai-revenue-engine-dark.svg"
  "frontend/public/branding/bookedai-revenue-engine-icon.png"
  "frontend/public/branding/bookedai-revenue-engine-icon.svg"
  "frontend/public/branding/bookedai-revenue-engine-light.svg"
  "frontend/public/branding/bookedai-revenue-engine-transparent.svg"
  "frontend/public/branding/bookedai-revenue-engine-white.svg"
  "frontend/public/branding/bookedai-unified-logo.png"
  "frontend/public/branding/favicon-revenue-engine.png"
  "frontend/public/favicon-revenue-engine.ico"
  "frontend/public/favicon-revenue-engine.png"
  "frontend/public/favicon-revenue-engine.svg"
  "frontend/public/favicon.png"
  "frontend/public/favicon.svg"
  "app/icon.svg"
)

echo "Checking required brand assets..."
for file in "${required_files[@]}"; do
  if [[ ! -f "${ROOT_DIR}/${file}" ]]; then
    echo "Missing required brand asset: ${file}" >&2
    exit 1
  fi
done

echo "Checking that retired legacy brand files are absent..."
for file in "${legacy_files[@]}"; do
  if [[ -e "${ROOT_DIR}/${file}" ]]; then
    echo "Retired legacy brand file still exists: ${file}" >&2
    exit 1
  fi
done

echo "Checking for forbidden BookedAI logo sources in app code..."
forbidden_matches="$(rg -n "upload\.bookedai\.au/.+(bookedai|i1_STdSm_tw-k6loI5aIEA|Mn0OG2kSRJOhDKPhZp8YoA|iWj3uDzsFmdBzIsctnp5MQ).*\.(png|jpg|jpeg|svg)|logo-source\.png|icon-source\.png" \
  "${ROOT_DIR}/frontend/src" \
  "${ROOT_DIR}/app" \
  "${ROOT_DIR}/components" \
  -g '!**/dist/**' \
  -g '!**/node_modules/**' || true)"

if [[ -n "${forbidden_matches}" ]]; then
  echo "Forbidden remote or ad hoc BookedAI logo sources found:" >&2
  echo "${forbidden_matches}" >&2
  exit 1
fi

echo "Checking that public HTML uses checked-in brand icons..."
if ! rg -n "branding/bookedai-apple-touch-icon|branding/bookedai-icon-32|branding/bookedai-mobile-icon-192" "${ROOT_DIR}/frontend/index.html" >/dev/null; then
  echo "frontend/index.html does not reference the expected checked-in brand icons." >&2
  exit 1
fi

echo "Brand asset verification passed."
