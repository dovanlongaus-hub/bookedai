#!/usr/bin/env bash

set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WORKFLOW_FILE="${PROJECT_DIR}/n8n/workflows/bookedai-booking.json"
N8N_CONTAINER="${N8N_CONTAINER:-bookedai-n8n-1}"

if [[ ! -f "${WORKFLOW_FILE}" ]]; then
  echo "Workflow file not found: ${WORKFLOW_FILE}"
  exit 1
fi

for _ in $(seq 1 20); do
  if sudo docker ps --format '{{.Names}}' | grep -Fx "${N8N_CONTAINER}" >/dev/null; then
    break
  fi
  sleep 1
done

if ! sudo docker ps --format '{{.Names}}' | grep -Fx "${N8N_CONTAINER}" >/dev/null; then
  echo "n8n container ${N8N_CONTAINER} is not running."
  exit 1
fi

existing_id="$(
  sudo docker exec supabase-db psql -U postgres -d n8n -Atc \
    "select id from workflow_entity where name = 'BookedAI Booking Intake' order by id asc limit 1;"
)"

if [[ -z "${existing_id}" ]]; then
  temp_path="/tmp/bookedai-booking.json"
  sudo docker cp "${WORKFLOW_FILE}" "${N8N_CONTAINER}:${temp_path}"
  sudo docker exec "${N8N_CONTAINER}" n8n import:workflow --input="${temp_path}" >/dev/null
  existing_id="$(
    sudo docker exec supabase-db psql -U postgres -d n8n -Atc \
      "select id from workflow_entity where name = 'BookedAI Booking Intake' order by id asc limit 1;"
  )"
  echo "Imported n8n workflow: BookedAI Booking Intake"
else
  echo "n8n workflow already exists: BookedAI Booking Intake (${existing_id})"
fi

if [[ -z "${existing_id}" ]]; then
  echo "Unable to determine workflow ID for BookedAI Booking Intake"
  exit 1
fi

sudo docker exec "${N8N_CONTAINER}" n8n update:workflow --id="${existing_id}" --active=true >/dev/null
echo "Activated n8n workflow ${existing_id}"
