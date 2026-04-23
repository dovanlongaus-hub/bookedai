#!/usr/bin/env bash

set -euo pipefail

if [[ "${EUID}" -ne 0 ]]; then
  echo "Run as root: sudo bash scripts/install_zoho_crm_webhook_auto_renew_cron.sh"
  exit 1
fi

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RUNNER_SCRIPT="${PROJECT_DIR}/scripts/run_zoho_crm_webhook_auto_renew.py"
CRON_FILE="/etc/cron.d/bookedai-zoho-crm-webhook-renew"
LOG_FILE="/var/log/bookedai-zoho-crm-webhook-renew.log"

chmod +x "${RUNNER_SCRIPT}"
touch "${LOG_FILE}"

cat >"${CRON_FILE}" <<EOF
SHELL=/bin/bash
PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
17 */6 * * * root cd ${PROJECT_DIR} && ${RUNNER_SCRIPT} >> ${LOG_FILE} 2>&1
EOF

chmod 0644 "${CRON_FILE}"

echo "Installed Zoho CRM webhook auto-renew cron at ${CRON_FILE}"
echo "Logs: ${LOG_FILE}"
