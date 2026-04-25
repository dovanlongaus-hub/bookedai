#!/usr/bin/env bash

set -euo pipefail

HOST="${HOST:-futureswim.bookedai.au}"
BASE_URL="https://${HOST}"
QUERY_SAFE="${QUERY_SAFE:-Which Future Swim centre is best for a nervous 4-year-old near Caringbah?}"
QUERY_UNSAFE="${QUERY_UNSAFE:-cleaner in sydney this weekend}"
TEST_NAME="${TEST_NAME:-BookedAI Future Swim QA}"
TEST_EMAIL="${TEST_EMAIL:-qa+futureswim@bookedai.au}"
TEST_PHONE="${TEST_PHONE:-0400000000}"
TEST_DATE="${TEST_DATE:-2026-04-30}"
TEST_TIME="${TEST_TIME:-10:00}"

export QUERY_SAFE QUERY_UNSAFE TEST_NAME TEST_EMAIL TEST_PHONE TEST_DATE TEST_TIME

need_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "ERROR: required command missing: $1" >&2
    exit 1
  fi
}

need_cmd curl
need_cmd python3

json_post() {
  local url="$1"
  local data="$2"
  curl -fsS "$url" \
    -H 'content-type: application/json' \
    -H 'accept: application/json' \
    --data "$data"
}

echo "[1/6] Host shell"
curl -fsSI "$BASE_URL" | sed -n '1,12p'

echo
echo "[2/6] Catalogue"
CATALOG_JSON="$(curl -fsS "$BASE_URL/api/booking-assistant/catalog")"
python3 - <<'PY' "$CATALOG_JSON"
import json, sys
payload=json.loads(sys.argv[1])
services=payload.get('services', [])
future=[s for s in services if (s.get('id') or '').startswith('future-swim-')]
print('catalog_status', payload.get('status'))
print('catalog_total', len(services))
print('future_swim_total', len(future))
for item in future[:6]:
    print('-', item.get('name'), '|', item.get('display_price'), '|', item.get('venue_name'))
if len(future) < 4:
    raise SystemExit('Expected at least 4 Future Swim services in catalogue.')
PY

echo
echo "[3/6] Safe tenant query"
SAFE_JSON="$(json_post "$BASE_URL/api/booking-assistant/chat" "$(python3 - <<'PY'
import json, os
print(json.dumps({"message": os.environ['QUERY_SAFE']}))
PY
)")"
python3 - <<'PY' "$SAFE_JSON"
import json, sys
payload=json.loads(sys.argv[1])
matches=payload.get('matched_services', [])
print('reply', payload.get('reply'))
print('match_count', len(matches))
if not matches:
    raise SystemExit('Expected Future Swim matches for safe query.')
for item in matches[:5]:
    sid=item.get('id') or ''
    name=item.get('name')
    print('-', sid, '|', name)
    if not sid.startswith('future-swim-'):
        raise SystemExit(f'Non Future Swim match returned: {sid}')
PY

echo
echo "[4/6] Wrong-domain guardrail query"
UNSAFE_JSON="$(json_post "$BASE_URL/api/booking-assistant/chat" "$(python3 - <<'PY'
import json, os
print(json.dumps({"message": os.environ['QUERY_UNSAFE']}))
PY
)")"
python3 - <<'PY' "$UNSAFE_JSON"
import json, sys
payload=json.loads(sys.argv[1])
matches=payload.get('matched_services', [])
print('reply', payload.get('reply'))
print('match_count', len(matches))
for item in matches:
    sid=item.get('id') or ''
    if not sid.startswith('future-swim-'):
        raise SystemExit(f'Wrong-domain match leaked: {sid}')
PY

echo
echo "[5/6] Capture lead + booking intent"
BOOKING_JSON="$(python3 - <<'PY' "$CATALOG_JSON"
import json, sys
payload=json.loads(sys.argv[1])
services=payload.get('services', [])
for item in services:
    sid=item.get('id') or ''
    if sid.startswith('future-swim-'):
        print(json.dumps(item))
        break
else:
    raise SystemExit('No Future Swim service found for booking test.')
PY
)"
SERVICE_ID="$(python3 - <<'PY' "$BOOKING_JSON"
import json, sys
print(json.loads(sys.argv[1]).get('id',''))
PY
)"
export SERVICE_ID
LEAD_PAYLOAD="$(python3 - <<'PY'
import json, os
print(json.dumps({
  "lead_type": "swim_school_enquiry",
  "contact": {
    "full_name": os.environ['TEST_NAME'],
    "email": os.environ['TEST_EMAIL'],
    "phone": os.environ['TEST_PHONE'],
    "preferred_contact_method": "email"
  },
  "business_context": {
    "business_name": "Future Swim",
    "industry": "Kids Services",
    "service_category": "Kids swim lessons"
  },
  "attribution": {
    "source": "futureswim.bookedai.au",
    "medium": "web",
    "landing_path": "/"
  },
  "intent_context": {
    "source_page": "future-swim-smoke",
    "intent_type": "booking_or_callback",
    "notes": "Automated Future Swim smoke lead",
    "requested_service_id": os.environ['SERVICE_ID']
  },
  "actor_context": {
    "channel": "public_web",
    "deployment_mode": "standalone_app",
    "tenant_ref": "future-swim"
  }
}))
PY
)"
LEAD_JSON="$(json_post "$BASE_URL/api/v1/leads" "$LEAD_PAYLOAD")"
python3 - <<'PY' "$LEAD_JSON"
import json, sys
payload=json.loads(sys.argv[1])
print('lead_status', payload.get('status'))
print('lead_id', payload.get('data', {}).get('lead_id'))
if payload.get('status') != 'ok':
    raise SystemExit('Lead capture failed.')
PY
BOOKING_PAYLOAD="$(python3 - <<'PY'
import json, os
print(json.dumps({
  "service_id": os.environ['SERVICE_ID'],
  "desired_slot": {
    "date": os.environ['TEST_DATE'],
    "time": os.environ['TEST_TIME'],
    "timezone": "Australia/Sydney"
  },
  "contact": {
    "full_name": os.environ['TEST_NAME'],
    "email": os.environ['TEST_EMAIL'],
    "phone": os.environ['TEST_PHONE'],
    "preferred_contact_method": "email"
  },
  "attribution": {
    "source": "futureswim.bookedai.au",
    "medium": "web",
    "landing_path": "/"
  },
  "channel": "public_web",
  "actor_context": {
    "channel": "public_web",
    "deployment_mode": "standalone_app",
    "tenant_ref": "future-swim"
  },
  "notes": "Automated Future Swim smoke booking intent"
}))
PY
)"
BOOKING_INTENT_JSON="$(json_post "$BASE_URL/api/v1/bookings/intents" "$BOOKING_PAYLOAD")"
python3 - <<'PY' "$BOOKING_INTENT_JSON"
import json, sys
payload=json.loads(sys.argv[1])
print('booking_status', payload.get('status'))
print('booking_intent_id', payload.get('data', {}).get('booking_intent_id'))
print('booking_reference', payload.get('data', {}).get('booking_reference'))
if payload.get('status') != 'ok':
    raise SystemExit('Booking intent capture failed.')
PY

echo
echo "[6/6] OK: Future Swim smoke passed"
