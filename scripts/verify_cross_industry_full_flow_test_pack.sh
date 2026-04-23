#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="$ROOT_DIR/.env"
PSQL_MODE="host"
PSQL_BIN=""
PSQL_ARGS=()

load_env_file() {
  local file_path="$1"
  if [[ -f "$file_path" ]]; then
    set -a
    # shellcheck disable=SC1090
    source "$file_path"
    set +a
  fi
}

resolve_db_name() {
  if [[ -n "${APP_DB_NAME:-}" ]]; then
    printf '%s' "$APP_DB_NAME"
    return
  fi

  if [[ -n "${DATABASE_URL:-}" ]]; then
    python3 - <<'PY'
import os
from urllib.parse import urlparse

url = os.environ.get("DATABASE_URL", "")
parsed = urlparse(url)
path = (parsed.path or "").lstrip("/")
print(path or "bookedai")
PY
    return
  fi

  printf '%s' "bookedai"
}

prepare_psql() {
  load_env_file "$ENV_FILE"

  if command -v psql >/dev/null 2>&1; then
    if [[ -z "${DATABASE_URL:-}" ]]; then
      echo "DATABASE_URL must be set before verifying the test pack." >&2
      exit 1
    fi
    PSQL_MODE="host"
    PSQL_BIN="psql"
    PSQL_ARGS=("$DATABASE_URL" "-v" "ON_ERROR_STOP=1")
    return
  fi

  if command -v sudo >/dev/null 2>&1 && sudo docker ps --format '{{.Names}}' | grep -qx 'supabase-db'; then
    local db_name
    db_name="$(resolve_db_name)"
    PSQL_MODE="docker"
    PSQL_BIN="sudo"
    PSQL_ARGS=(
      docker exec
      -e "PGPASSWORD=${POSTGRES_PASSWORD:-}"
      supabase-db
      psql
      -h 127.0.0.1
      -U "${POSTGRES_USER:-supabase_admin}"
      -d "$db_name"
      -v ON_ERROR_STOP=1
    )
    return
  fi

  echo "psql is required but was not found on PATH, and no usable supabase-db docker fallback was available." >&2
  exit 1
}

run_psql() {
  "$PSQL_BIN" "${PSQL_ARGS[@]}" "$@"
}

prepare_psql

echo "[test-pack-verify] scenario coverage"
run_psql -Atc "
with scenario_refs as (
  select booking_reference
  from booking_intents
  where booking_reference like 'testpack-%'
)
select count(*)
from scenario_refs;
" | tee /tmp/bookedai_test_pack_scenario_count.txt

scenario_count="$(cat /tmp/bookedai_test_pack_scenario_count.txt)"
if [[ "$scenario_count" != "10" ]]; then
  echo "[test-pack-verify] expected 10 seeded booking scenarios, found $scenario_count" >&2
  exit 1
fi

echo "[test-pack-verify] per-scenario full-flow coverage"
run_psql -Atc "
with scenario_rows as (
  select
    bi.booking_reference,
    bi.tenant_id,
    bi.id as booking_intent_id,
    bi.contact_id,
    bi.metadata_json ->> 'scenario_code' as scenario_code
  from booking_intents bi
  where bi.booking_reference like 'testpack-%'
),
scenario_coverage as (
  select
    scenario_rows.booking_reference,
    count(distinct leads.id) as lead_count,
    count(distinct payment_intents.id) as payment_count,
    count(distinct email_messages.id) as email_count,
    count(distinct crm_sync_records.id) as crm_count,
    count(distinct outbox_events.id) as outbox_count,
    count(distinct audit_logs.id) as audit_count
  from scenario_rows
  left join leads
    on leads.tenant_id = scenario_rows.tenant_id
   and leads.contact_id = scenario_rows.contact_id
  left join payment_intents
    on payment_intents.tenant_id = scenario_rows.tenant_id
   and payment_intents.booking_intent_id = scenario_rows.booking_intent_id
  left join email_messages
    on email_messages.tenant_id = scenario_rows.tenant_id
   and email_messages.subject = 'BookedAI test pack confirmation: ' || scenario_rows.booking_reference
  left join crm_sync_records
    on crm_sync_records.tenant_id = scenario_rows.tenant_id
   and crm_sync_records.payload ->> 'scenario_code' = scenario_rows.scenario_code
  left join outbox_events
    on outbox_events.tenant_id = scenario_rows.tenant_id
   and outbox_events.idempotency_key like 'testpack:%'
   and outbox_events.payload ->> 'booking_reference' = scenario_rows.booking_reference
  left join audit_logs
    on audit_logs.tenant_id = scenario_rows.tenant_id
   and audit_logs.entity_type = 'booking_intent'
   and audit_logs.entity_id = scenario_rows.booking_reference
   and audit_logs.event_type = 'booking.flow.seeded'
  group by scenario_rows.booking_reference
)
select
  booking_reference || '|' ||
  lead_count || '|' ||
  payment_count || '|' ||
  email_count || '|' ||
  crm_count || '|' ||
  outbox_count || '|' ||
  audit_count
from scenario_coverage
order by booking_reference;
" | tee /tmp/bookedai_test_pack_coverage.txt

while IFS='|' read -r booking_reference lead_count payment_count email_count crm_count outbox_count audit_count; do
  if [[ -z "$booking_reference" ]]; then
    continue
  fi
  if (( lead_count < 1 || payment_count < 1 || email_count < 1 || crm_count < 4 || outbox_count < 5 || audit_count < 1 )); then
    echo "[test-pack-verify] incomplete coverage for $booking_reference: leads=$lead_count payments=$payment_count email=$email_count crm=$crm_count outbox=$outbox_count audit=$audit_count" >&2
    exit 1
  fi
done </tmp/bookedai_test_pack_coverage.txt

echo "[test-pack-verify] status distribution snapshot"
run_psql -P pager=off -c "
select
  payment_option,
  status,
  count(*) as payment_count
from payment_intents
where external_session_id like 'test-pack-payment-%'
group by payment_option, status
order by payment_option, status;
"

run_psql -P pager=off -c "
select
  sync_status,
  count(*) as crm_record_count
from crm_sync_records
where external_entity_id like 'testpack-%'
group by sync_status
order by sync_status;
"

run_psql -P pager=off -c "
select
  event_type,
  count(*) as event_count
from outbox_events
where idempotency_key like 'testpack:%'
group by event_type
order by event_type;
"

echo "[test-pack-verify] cross-industry full-flow test pack verification passed"
