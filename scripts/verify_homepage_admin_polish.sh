#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${1:-https://bookedai.au}"
TMP_HTML="$(mktemp)"
trap 'rm -f "$TMP_HTML"' EXIT

printf '== HTTP check ==\n'
curl -I -L --max-time 20 "$BASE_URL" | sed -n '1,20p'

printf '\n== Download homepage shell ==\n'
curl -L --max-time 20 -s "$BASE_URL" > "$TMP_HTML"

printf '\n== Homepage shell checks ==\n'
if grep -q 'Bookedai.au | The AI Revenue Engine for Service Businesses' "$TMP_HTML"; then
  echo 'PASS title metadata'
else
  echo 'WARN title metadata not found in HTML shell'
fi

if grep -q 'Bookedai.au captures demand across search, website, calls, email, and follow-up' "$TMP_HTML"; then
  echo 'PASS description metadata'
else
  echo 'WARN description metadata not found in HTML shell'
fi

printf '\n== App bundle checks ==\n'
JS_PATH="$(sed -n 's/.*src="\([^"]*index-[^"]*\.js\)".*/\1/p' "$TMP_HTML" | head -n 1)"
if [[ -z "$JS_PATH" ]]; then
  echo 'FAIL could not find app bundle path'
  exit 1
fi

echo "Bundle: $JS_PATH"
INDEX_BUNDLE_CONTENT="$(curl -L --max-time 20 -s "${BASE_URL%/}$JS_PATH")"
ASSET_PATHS="$(
  {
    printf '%s\n' "$JS_PATH"
    grep -Eo 'assets/[A-Za-z0-9._-]+\.js' <<<"$INDEX_BUNDLE_CONTENT" | sed 's#^#/#'
  } | sort -u
)"

APP_BUNDLE_CONTENT=""
HOMEPAGE_BUNDLE_CONTENT=""
while IFS= read -r asset_path; do
  [[ -z "$asset_path" ]] && continue
  printf 'Scanning: %s\n' "$asset_path"
  asset_content="$(curl -L --max-time 20 -s "${BASE_URL%/}$asset_path")"
  APP_BUNDLE_CONTENT+=$'\n'
  APP_BUNDLE_CONTENT+="$asset_content"
  if [[ "$asset_path" == *"/PublicApp-"* || "$asset_path" == *"/homepageContent-"* || "$asset_path" == "$JS_PATH" ]]; then
    HOMEPAGE_BUNDLE_CONTENT+=$'\n'
    HOMEPAGE_BUNDLE_CONTENT+="$asset_content"
  fi
done <<<"$ASSET_PATHS"

check_contains() {
  local needle="$1"
  local label="$2"
  if grep -Fq "$needle" <<<"$APP_BUNDLE_CONTENT"; then
    echo "PASS $label"
  else
    echo "FAIL $label"
    return 1
  fi
}

check_absent() {
  local needle="$1"
  local label="$2"
  if grep -Fq "$needle" <<<"$HOMEPAGE_BUNDLE_CONTENT"; then
    echo "FAIL unexpected: $label"
    return 1
  else
    echo "PASS absent: $label"
  fi
}

FAILURES=0
for pair in \
  "Turn more website visitors, calls, and enquiries into confirmed bookings.:::hero headline" \
  "The AI revenue engine for service businesses:::hero eyebrow" \
  "Start in product:::primary hero CTA" \
  "Start with BookedAI:::final CTA" \
  "Product proof:::proof section label" \
  "Ready to move faster?:::final section eyebrow" \
  "What matters most:::top signal label" \
  "Questions teams ask most:::faq heading" \
  "https://product.bookedai.au/?source=homepage:::hero product flow link" \
  "https://product.bookedai.au/?source=homepage-cta:::final product flow link" \
  "Bookedai.au | The AI Revenue Engine for Service Businesses:::metadata title in bundle"
 do
  needle="${pair%%:::*}"
  label="${pair##*:::}"
  if ! check_contains "$needle" "$label"; then
    FAILURES=$((FAILURES + 1))
  fi
done

printf '\n== Internal wording cleanup checks ==\n'
for pair in \
  "Final conversion prompt:::old homepage internal CTA label" \
  "Proof From The Revenue Layer:::old testimonial eyebrow" \
  "Tenant investigation:::old tenant label" \
  "BookedAI.au Operator:::old owner label" \
  "investigation-first:::old support mode phrase" \
  "control plane:::old admin phrasing"
 do
  needle="${pair%%:::*}"
  label="${pair##*:::}"
  if ! check_absent "$needle" "$label"; then
    FAILURES=$((FAILURES + 1))
  fi
done

printf '\n== Result ==\n'
if [[ "$FAILURES" -eq 0 ]]; then
  echo 'PASS all homepage/admin polish checks'
else
  echo "FAIL $FAILURES check(s) failed"
  exit 1
fi
