#!/usr/bin/env bash

set -euo pipefail

PROJECT_ID="${PROJECT_ID:-pelagic-tracker-490511-k7}"
ZONE="${ZONE:-australia-southeast1-a}"
INSTANCE_NAME="${INSTANCE_NAME:-instance-20260317-160016}"
RULE_HTTP="${RULE_HTTP:-bookedai-allow-http}"
RULE_HTTPS="${RULE_HTTPS:-bookedai-allow-https}"
EXPECTED_IP="${EXPECTED_IP:-34.40.192.68}"

echo "== Active Account =="
gcloud auth list --filter=status:ACTIVE
echo

echo "== Project =="
gcloud config get-value project
echo

echo "== Instance =="
gcloud compute instances describe "${INSTANCE_NAME}" \
  --project "${PROJECT_ID}" \
  --zone "${ZONE}" \
  --format='yaml(name,status,tags.items,networkInterfaces[].networkIP,networkInterfaces[].accessConfigs[].natIP)'
echo

echo "== Expected IP Check =="
ACTUAL_IP="$(gcloud compute instances describe "${INSTANCE_NAME}" \
  --project "${PROJECT_ID}" \
  --zone "${ZONE}" \
  --format='value(networkInterfaces[0].accessConfigs[0].natIP)')"
echo "EXPECTED_IP=${EXPECTED_IP}"
echo "ACTUAL_IP=${ACTUAL_IP}"
echo

echo "== Allow Rule: HTTP =="
gcloud compute firewall-rules describe "${RULE_HTTP}" \
  --project "${PROJECT_ID}" \
  --format='yaml(name,direction,priority,disabled,sourceRanges,allowed,targetTags)'
echo

echo "== Allow Rule: HTTPS =="
gcloud compute firewall-rules describe "${RULE_HTTPS}" \
  --project "${PROJECT_ID}" \
  --format='yaml(name,direction,priority,disabled,sourceRanges,allowed,targetTags)'
echo

echo "== All Ingress Rules Touching http-server / https-server =="
gcloud compute firewall-rules list \
  --project "${PROJECT_ID}" \
  --filter='direction=INGRESS AND (targetTags:http-server OR targetTags:https-server)' \
  --format='table(name,direction,priority,disabled,sourceRanges.list():label=SRC,allowed[].map().firewall_rule().list():label=ALLOW,denied[].map().firewall_rule().list():label=DENY,targetTags.list():label=TAGS)'
echo

echo "== All Deny Ingress Rules =="
gcloud compute firewall-rules list \
  --project "${PROJECT_ID}" \
  --filter='direction=INGRESS AND denied:*' \
  --format='table(name,priority,disabled,sourceRanges.list():label=SRC,denied[].map().firewall_rule().list():label=DENY,targetTags.list():label=TAGS,targetServiceAccounts.list():label=SAS)'
echo

cat <<'EOF'
Read this output in order:
1. Confirm instance status is RUNNING.
2. Confirm tags include both http-server and https-server.
3. Confirm natIP matches EXPECTED_IP.
4. Confirm bookedai-allow-http and bookedai-allow-https are enabled and allow tcp:80/tcp:443 from 0.0.0.0/0.
5. Look for any deny rule with lower priority number that could override the allow.
EOF
