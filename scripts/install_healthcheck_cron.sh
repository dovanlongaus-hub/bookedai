#!/usr/bin/env bash

set -euo pipefail

if [[ "${EUID}" -ne 0 ]]; then
  echo "Run as root: sudo bash scripts/install_healthcheck_cron.sh"
  exit 1
fi

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
HEALTHCHECK_SCRIPT="${PROJECT_DIR}/scripts/healthcheck_stack.sh"
CRON_FILE="/etc/cron.d/bookedai-healthcheck"
LOG_FILE="/var/log/bookedai-healthcheck.log"

chmod +x "${HEALTHCHECK_SCRIPT}"
touch "${LOG_FILE}"

cat >"${CRON_FILE}" <<EOF
SHELL=/bin/bash
PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
*/5 * * * * root cd ${PROJECT_DIR} && ${HEALTHCHECK_SCRIPT} >> ${LOG_FILE} 2>&1
EOF

chmod 0644 "${CRON_FILE}"

echo "Installed cron healthcheck at ${CRON_FILE}"
echo "Logs: ${LOG_FILE}"
