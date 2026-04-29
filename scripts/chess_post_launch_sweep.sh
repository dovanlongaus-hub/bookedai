#!/usr/bin/env bash
#
# chess_post_launch_sweep.sh — comprehensive post-launch QA sweep for
# chess.bookedai.au, runnable on the VPS host where supabase docker compose
# + bookedai backend logs are reachable.
#
# Usage:
#   bash scripts/chess_post_launch_sweep.sh
#
# Cron suggestion (run once on 2026-05-06 09:00 UTC):
#   0 9 6 5 * cd /home/dovanlong/BookedAI && bash scripts/chess_post_launch_sweep.sh >> /var/log/chess-sweep.log 2>&1
#
# Output: docs/qa/chess-post-launch-sweep-$(date +%Y-%m-%d).md
#
# Tasks covered (matches the post-launch review brief):
#   1. curl smoke chess + api endpoints (HTTP 200)
#   2. price alignment: amount_aud == metadata.display_price_aud for 5 chess rows
#   3. slot inventory: open slots >= NOW()+7 days, flag if Week-5+ unsetled
#   4. outbox emails past 7 days + CC chess@bookedai.au
#   5. tenant Zoho calendar connected check
#   6. grep ChessGrandmasterApp.tsx for unreplaced {/* TODO */} placeholders
#   7. Stripe webhook delivery rate from backend logs
#   8. write report to docs/qa/chess-post-launch-sweep-DATE.md

set -uo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

DATE_ISO="$(date -u +%Y-%m-%d)"
REPORT="docs/qa/chess-post-launch-sweep-${DATE_ISO}.md"
SECTIONS=()

API_BASE="${API_BASE:-https://api.bookedai.au/api/v1}"
SAMPLE_ORDER_REF="${SAMPLE_ORDER_REF:-v1-d1bbe81a2a}"
CHESS_TENANT_SLUG="${CHESS_TENANT_SLUG:-co-mai-hung-chess-class}"

PSQL="sudo -n docker compose -f supabase/docker-compose.yml -f supabase/docker-compose.bookedai.yml --env-file supabase/.env exec -T db psql -U postgres -d bookedai -At -c"
LOGS="sudo -n docker compose -f docker-compose.prod.yml --env-file .env logs"

mkdir -p docs/qa

echo "## 1. Curl smoke" | tee -a /tmp/sweep-$$.tmp
{
  url1_code=$(curl -s -o /dev/null -w "%{http_code}" "https://chess.bookedai.au/" --max-time 15)
  url2_code=$(curl -s -o /dev/null -w "%{http_code}" -X POST -H "Content-Type: application/json" -d '{"query":""}' "$API_BASE/chess/catalog/search" --max-time 15)
  url3_code=$(curl -s -o /dev/null -w "%{http_code}" "$API_BASE/orders/$SAMPLE_ORDER_REF" --max-time 15)
  url4_code=$(curl -s -o /dev/null -w "%{http_code}" "$API_BASE/chess/courses/co-mai-hung-chess-online-group-60/slots?limit=1" --max-time 15)
  echo "- chess.bookedai.au/                          → HTTP $url1_code"
  echo "- /api/v1/chess/catalog/search                → HTTP $url2_code"
  echo "- /api/v1/orders/$SAMPLE_ORDER_REF            → HTTP $url3_code"
  echo "- /api/v1/chess/courses/.../slots             → HTTP $url4_code"
  if [[ "$url1_code" != 200 ]] || [[ "$url2_code" != 200 ]] || [[ "$url3_code" != 200 ]] || [[ "$url4_code" != 200 ]]; then
    echo ""
    echo "**🔴 FLAG**: at least one endpoint not 200."
  else
    echo ""
    echo "✅ All 4 public endpoints HTTP 200."
  fi
} > /tmp/sweep-section-1.txt
SECTIONS+=("/tmp/sweep-section-1.txt")

echo "## 2. Price alignment" > /tmp/sweep-section-2.txt
{
  rows_misaligned=$($PSQL "select count(*) from service_merchant_profiles where tenant_id=(select id::text from tenants where slug='$CHESS_TENANT_SLUG') and publish_state='published' and (metadata->>'display_price_aud')::numeric is distinct from amount_aud;" 2>/dev/null | tail -1)
  echo "- Misaligned rows (amount_aud != metadata.display_price_aud): \`$rows_misaligned\`"
  echo ""
  if [[ "$rows_misaligned" == "0" ]]; then
    echo "✅ Migration 041 alignment intact — all 5 chess rows have amount_aud == metadata.display_price_aud."
  else
    echo "**🔴 FLAG**: pricing drift detected. Re-run migration 041 or investigate which row drifted."
    echo ""
    $PSQL "select service_id, amount_aud, metadata->>'display_price_aud' as meta_aud from service_merchant_profiles where tenant_id=(select id::text from tenants where slug='$CHESS_TENANT_SLUG') and publish_state='published' and (metadata->>'display_price_aud')::numeric is distinct from amount_aud;" 2>/dev/null | sed 's/^/    /'
  fi
} >> /tmp/sweep-section-2.txt
SECTIONS+=("/tmp/sweep-section-2.txt")

echo "## 3. Slot inventory" > /tmp/sweep-section-3.txt
{
  total_open=$($PSQL "select count(*) from chess_course_schedule_slots where status='open' and enrolled_count<capacity and starts_at >= now();" 2>/dev/null | tail -1)
  beyond_7d=$($PSQL "select count(*) from chess_course_schedule_slots where status='open' and enrolled_count<capacity and starts_at >= now() + interval '7 days';" 2>/dev/null | tail -1)
  furthest=$($PSQL "select max(starts_at)::date from chess_course_schedule_slots where status='open' and enrolled_count<capacity;" 2>/dev/null | tail -1)
  echo "- Total open slots (now or future): \`$total_open\`"
  echo "- Open slots starting ≥ NOW + 7 days: \`$beyond_7d\`"
  echo "- Furthest open slot date: \`$furthest\`"
  echo ""
  if [[ "${beyond_7d:-0}" -lt 5 ]]; then
    echo "**🟡 FLAG**: less than 5 slots beyond 7 days from now — Week-5+ inventory needs to be seeded. Use the RRULE pattern from migration 037 to generate the next 4 weeks."
  else
    echo "✅ Slot inventory healthy ($beyond_7d slots beyond 7 days)."
  fi
} >> /tmp/sweep-section-3.txt
SECTIONS+=("/tmp/sweep-section-3.txt")

echo "## 4. Email outbox + CC tenant" > /tmp/sweep-section-4.txt
{
  emails_7d=$($PSQL "select count(*) from outbox_events where event_type='email.lifecycle.dispatch_recorded' and created_at >= now() - interval '7 days';" 2>/dev/null | tail -1)
  with_chess_cc=$($PSQL "select count(*) from outbox_events where event_type='email.lifecycle.dispatch_recorded' and created_at >= now() - interval '7 days' and (payload::text like '%chess@bookedai.au%' or payload::text like '%co-mai-hung-chess-class%');" 2>/dev/null | tail -1)
  echo "- email.lifecycle.dispatch_recorded events past 7 days: \`$emails_7d\`"
  echo "- of which mention chess@bookedai.au OR chess tenant slug in payload: \`$with_chess_cc\`"
  echo ""
  if [[ "${emails_7d:-0}" -gt 0 ]] && [[ "${with_chess_cc:-0}" -lt 1 ]]; then
    echo "**🔴 FLAG**: emails sent but none reference chess CC — CC auto-add may have regressed. Check communication_service._resolve_lifecycle_cc_list."
  elif [[ "${emails_7d:-0}" -eq 0 ]]; then
    echo "ℹ️  No lifecycle emails in the past 7 days — either no bookings happened or emails weren't dispatched."
  else
    echo "✅ Chess emails being CC'd correctly."
  fi
} >> /tmp/sweep-section-4.txt
SECTIONS+=("/tmp/sweep-section-4.txt")

echo "## 5. Tenant Zoho connection" > /tmp/sweep-section-5.txt
{
  zoho_cal=$($PSQL "select coalesce(settings_json->'integrations'->'zoho_calendar'->>'connected','false') from tenant_settings where tenant_id=(select id::text from tenants where slug='$CHESS_TENANT_SLUG');" 2>/dev/null | tail -1)
  zoho_crm=$($PSQL "select coalesce(settings_json->'integrations'->'zoho_crm'->>'connected','false') from tenant_settings where tenant_id=(select id::text from tenants where slug='$CHESS_TENANT_SLUG');" 2>/dev/null | tail -1)
  echo "- zoho_calendar connected: \`$zoho_cal\`"
  echo "- zoho_crm connected: \`$zoho_crm\`"
  echo ""
  if [[ "$zoho_cal" != "true" ]] || [[ "$zoho_crm" != "true" ]]; then
    echo "**🟡 RECOMMEND**: chess tenant operator should log into tenant.bookedai.au with chess@bookedai.au, open Integrations panel, and click 'Connect Zoho Calendar' + 'Connect Zoho CRM' so bookings/CRM sync use the academy's own Zoho org instead of platform-wide fallback."
  else
    echo "✅ Per-tenant Zoho fully connected."
  fi
} >> /tmp/sweep-section-5.txt
SECTIONS+=("/tmp/sweep-section-5.txt")

echo "## 6. Placeholder TODO markers" > /tmp/sweep-section-6.txt
{
  todo_count=$(grep -c "{/\* TODO\|TODO: replace\|coming soon\|Coming soon" frontend/src/apps/public/ChessGrandmasterApp.tsx 2>/dev/null || echo 0)
  echo "- {/* TODO */} or 'Coming soon' markers in ChessGrandmasterApp.tsx: \`$todo_count\`"
  echo ""
  if [[ "${todo_count:-0}" -gt 0 ]]; then
    echo "Lines:"
    grep -n "{/\* TODO\|TODO: replace\|coming soon\|Coming soon" frontend/src/apps/public/ChessGrandmasterApp.tsx 2>/dev/null | head -10 | sed 's/^/    /'
    echo ""
    echo "**🟡 RECOMMEND**: replace placeholders with real testimonials, real coach photo (currently CDN bb99/B7_i8BfBTN8NMxJO_B7X3Q.png), and real 2-min sample lesson video before public marketing push."
  else
    echo "✅ No placeholder markers remaining."
  fi
} >> /tmp/sweep-section-6.txt
SECTIONS+=("/tmp/sweep-section-6.txt")

echo "## 7. Stripe webhook delivery (past 7 days)" > /tmp/sweep-section-7.txt
{
  webhook_received=$({ $LOGS backend --since=168h 2>/dev/null | grep -c "stripe_event_received\|stripe.webhook.received\|checkout.session.completed"; } | head -1 | tr -dc '0-9')
  webhook_sig_fail=$({ $LOGS backend --since=168h 2>/dev/null | grep -c "stripe_signature_mismatch\|stripe_signature_timestamp_outside_tolerance\|StripeSignatureError"; } | head -1 | tr -dc '0-9')
  webhook_received="${webhook_received:-0}"
  webhook_sig_fail="${webhook_sig_fail:-0}"
  echo "- Stripe webhook events received: \`$webhook_received\`"
  echo "- Signature verification failures: \`$webhook_sig_fail\`"
  echo ""
  if [[ "${webhook_sig_fail:-0}" -gt 0 ]]; then
    echo "**🔴 FLAG**: signature failures detected — STRIPE_WEBHOOK_SECRET in .env may not match Stripe Dashboard webhook signing secret. Rotate or sync."
  elif [[ "${webhook_received:-0}" -eq 0 ]]; then
    echo "ℹ️  No webhook events in past 7 days — either no Stripe payments completed, or backend log retention < 7 days."
  else
    echo "✅ All $webhook_received webhook events verified successfully."
  fi
} >> /tmp/sweep-section-7.txt
SECTIONS+=("/tmp/sweep-section-7.txt")

# Compose final report
{
  echo "# chess.bookedai.au Post-Launch Sweep — $DATE_ISO"
  echo ""
  echo "Automated sweep generated by \`scripts/chess_post_launch_sweep.sh\`."
  echo "Run on host: \`$(hostname)\` at \`$(date -u +%Y-%m-%dT%H:%M:%SZ)\`."
  echo ""
  for f in "${SECTIONS[@]}"; do
    cat "$f"
    echo ""
  done
  echo "## Summary"
  echo ""
  echo "Re-run any time: \`bash scripts/chess_post_launch_sweep.sh\`"
  echo ""
  echo "Source brief: [docs/qa/chess-launch-postdeploy-review-2026-04-29.md](chess-launch-postdeploy-review-2026-04-29.md)"
} > "$REPORT"

# Cleanup temp section files
rm -f /tmp/sweep-section-*.txt /tmp/sweep-$$.tmp 2>/dev/null

echo ""
echo "[chess-post-launch-sweep] report written to $REPORT"
echo "[chess-post-launch-sweep] open it with:  cat $REPORT"
