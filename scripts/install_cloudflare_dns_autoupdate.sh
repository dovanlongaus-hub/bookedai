#!/usr/bin/env bash

set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SERVICE_SRC="${PROJECT_DIR}/deploy/systemd/bookedai-cloudflare-dns.service"
SERVICE_DST="/etc/systemd/system/bookedai-cloudflare-dns.service"
TIMER_SRC="${PROJECT_DIR}/deploy/systemd/bookedai-cloudflare-dns.timer"
TIMER_DST="/etc/systemd/system/bookedai-cloudflare-dns.timer"

if [[ "${EUID}" -ne 0 ]]; then
  echo "Run this script as root: sudo bash scripts/install_cloudflare_dns_autoupdate.sh"
  exit 1
fi

install -m 0644 "${SERVICE_SRC}" "${SERVICE_DST}"
install -m 0644 "${TIMER_SRC}" "${TIMER_DST}"
systemctl daemon-reload
systemctl enable bookedai-cloudflare-dns.service
systemctl enable bookedai-cloudflare-dns.timer
systemctl restart bookedai-cloudflare-dns.service
systemctl restart bookedai-cloudflare-dns.timer

echo "Installed and started bookedai-cloudflare-dns.service and bookedai-cloudflare-dns.timer"
