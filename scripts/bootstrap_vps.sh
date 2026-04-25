#!/usr/bin/env bash

set -euo pipefail

if [[ "${EUID}" -ne 0 ]]; then
  echo "Run this script as root: sudo bash scripts/bootstrap_vps.sh"
  exit 1
fi

DOMAIN_ROOT="${DOMAIN_ROOT:-bookedai.au}"
DOMAIN_WWW="${DOMAIN_WWW:-www.bookedai.au}"
DOMAIN_API="${DOMAIN_API:-api.bookedai.au}"
DOMAIN_PRODUCT="${DOMAIN_PRODUCT:-product.bookedai.au}"
DOMAIN_DEMO="${DOMAIN_DEMO:-demo.bookedai.au}"
DOMAIN_FUTURESWIM="${DOMAIN_FUTURESWIM:-futureswim.bookedai.au}"
DOMAIN_CHESS="${DOMAIN_CHESS:-chess.bookedai.au}"
DOMAIN_PORTAL="${DOMAIN_PORTAL:-portal.bookedai.au}"
DOMAIN_TENANT="${DOMAIN_TENANT:-tenant.bookedai.au}"
DOMAIN_PITCH="${DOMAIN_PITCH:-pitch.bookedai.au}"
DOMAIN_N8N="${DOMAIN_N8N:-n8n.bookedai.au}"
DOMAIN_SUPABASE="${DOMAIN_SUPABASE:-supabase.bookedai.au}"
DOMAIN_UPLOAD="${DOMAIN_UPLOAD:-upload.bookedai.au}"
DOMAIN_CALENDAR="${DOMAIN_CALENDAR:-calendar.bookedai.au}"
DOMAIN_BOT="${DOMAIN_BOT:-bot.bookedai.au}"
DEPLOY_USER="${DEPLOY_USER:-$SUDO_USER}"

if [[ -z "${DEPLOY_USER}" ]]; then
  echo "DEPLOY_USER is not set. Example: DEPLOY_USER=ubuntu sudo bash scripts/bootstrap_vps.sh"
  exit 1
fi

apt-get update
apt-get install -y ca-certificates curl git certbot openssl python3

install -m 0755 -d /etc/apt/keyrings
if [[ ! -f /etc/apt/keyrings/docker.asc ]]; then
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
  chmod a+r /etc/apt/keyrings/docker.asc
fi

ARCH="$(dpkg --print-architecture)"
CODENAME="$(. /etc/os-release && echo "$VERSION_CODENAME")"
cat >/etc/apt/sources.list.d/docker.list <<EOF
deb [arch=${ARCH} signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu ${CODENAME} stable
EOF

apt-get update
apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

systemctl enable docker
systemctl restart docker

usermod -aG docker "${DEPLOY_USER}" || true

ufw allow OpenSSH || true
ufw allow 80/tcp || true
ufw allow 443/tcp || true
ufw --force enable || true

echo "Bootstrap completed."
echo "DNS must already point ${DOMAIN_ROOT}, ${DOMAIN_WWW}, ${DOMAIN_API}, ${DOMAIN_PRODUCT}, ${DOMAIN_DEMO}, ${DOMAIN_FUTURESWIM}, ${DOMAIN_CHESS}, ${DOMAIN_PORTAL}, ${DOMAIN_TENANT}, ${DOMAIN_PITCH}, ${DOMAIN_N8N}, ${DOMAIN_SUPABASE}, ${DOMAIN_UPLOAD}, ${DOMAIN_CALENDAR}, ${DOMAIN_BOT} to this server."
echo "Next step:"
echo "  sudo -u ${DEPLOY_USER} bash scripts/deploy_production.sh"
