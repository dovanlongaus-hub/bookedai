#!/usr/bin/env bash

set -euo pipefail

PROJECT_ID="${PROJECT_ID:-pelagic-tracker-490511-k7}"
ZONE="${ZONE:-australia-southeast1-a}"
INSTANCE_NAME="${INSTANCE_NAME:-instance-20260317-160016}"
NETWORK_TAGS="${NETWORK_TAGS:-http-server,https-server}"

RULE_HTTP="${RULE_HTTP:-bookedai-allow-http}"
RULE_HTTPS="${RULE_HTTPS:-bookedai-allow-https}"
SOURCE_RANGES="${SOURCE_RANGES:-0.0.0.0/0}"
PRIORITY="${PRIORITY:-1000}"

echo "Project: ${PROJECT_ID}"
echo "Zone: ${ZONE}"
echo "Instance: ${INSTANCE_NAME}"
echo "Tags: ${NETWORK_TAGS}"
echo

active_account="$(gcloud auth list --filter=status:ACTIVE --format='value(account)' 2>/dev/null || true)"
if [[ -z "${active_account}" ]]; then
  echo "No active gcloud account found. Run 'gcloud auth login' first."
  exit 1
fi

echo "Active gcloud account: ${active_account}"
echo

create_or_update_rule() {
  local rule_name="$1"
  local allow_value="$2"
  local target_tag="$3"

  if gcloud compute firewall-rules describe "${rule_name}" --project "${PROJECT_ID}" >/dev/null 2>&1; then
    echo "Updating firewall rule ${rule_name}..."
    gcloud compute firewall-rules update "${rule_name}" \
      --project "${PROJECT_ID}" \
      --allow "${allow_value}" \
      --direction INGRESS \
      --priority "${PRIORITY}" \
      --source-ranges "${SOURCE_RANGES}" \
      --target-tags "${target_tag}" \
      --quiet
  else
    echo "Creating firewall rule ${rule_name}..."
    gcloud compute firewall-rules create "${rule_name}" \
      --project "${PROJECT_ID}" \
      --allow "${allow_value}" \
      --direction INGRESS \
      --priority "${PRIORITY}" \
      --source-ranges "${SOURCE_RANGES}" \
      --target-tags "${target_tag}" \
      --quiet
  fi
}

create_or_update_rule "${RULE_HTTP}" "tcp:80" "http-server"
create_or_update_rule "${RULE_HTTPS}" "tcp:443" "https-server"

echo
echo "Verifying instance tags..."
gcloud compute instances describe "${INSTANCE_NAME}" \
  --project "${PROJECT_ID}" \
  --zone "${ZONE}" \
  --format='yaml(name,networkInterfaces[].networkIP,networkInterfaces[].accessConfigs[].natIP,tags.items)'

echo
echo "Verifying firewall rules..."
gcloud compute firewall-rules describe "${RULE_HTTP}" --project "${PROJECT_ID}" \
  --format='yaml(name,direction,priority,sourceRanges,allowed,targetTags)'
echo
gcloud compute firewall-rules describe "${RULE_HTTPS}" --project "${PROJECT_ID}" \
  --format='yaml(name,direction,priority,sourceRanges,allowed,targetTags)'

cat <<'EOF'

If Cloudflare still returns 522 after these rules are in place, also verify:
1. The VM still has the external IP attached.
2. No higher-priority deny ingress rule overrides these allows.
3. The VPC/subnet has no organization policy blocking external ingress.
4. Cloudflare is proxying to the same public IP shown in the instance details.
EOF
