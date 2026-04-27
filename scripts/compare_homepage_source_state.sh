#!/usr/bin/env bash
set -euo pipefail

REPO_DIR="${1:-$(pwd)}"
cd "$REPO_DIR"

printf '== Repo state ==\n'
pwd
git rev-parse --short HEAD 2>/dev/null || true
git status --short || true

printf '\n== Key source checks ==\n'
check_file_contains() {
  local file="$1"
  local needle="$2"
  local label="$3"
  if grep -Fqn "$needle" "$file"; then
    echo "PASS $label"
    grep -Fqn "$needle" "$file" | head -n 1
  else
    echo "FAIL $label"
  fi
}

check_file_contains frontend/src/apps/public/PublicApp.tsx 'Bookedai.au | The AI Revenue Engine for Service Businesses' 'deployed frontend metadata title marker'
check_file_contains frontend/src/apps/public/PublicApp.tsx 'The AI revenue engine for service businesses' 'deployed frontend hero eyebrow'
check_file_contains frontend/src/apps/public/PublicApp.tsx 'Turn more website visitors, calls, and enquiries into confirmed bookings.' 'deployed frontend hero headline'
check_file_contains frontend/src/apps/public/PublicApp.tsx 'Start in product' 'deployed frontend hero CTA label'
check_file_contains frontend/src/apps/public/PublicApp.tsx 'https://product.bookedai.au/?source=homepage' 'deployed frontend hero product link'
check_file_contains frontend/src/apps/public/PublicApp.tsx 'What matters most' 'deployed frontend top signal label'
check_file_contains frontend/src/apps/public/PublicApp.tsx 'Product proof' 'deployed frontend proof section label'
check_file_contains frontend/src/apps/public/PublicApp.tsx 'Questions teams ask most' 'deployed frontend FAQ heading'
check_file_contains frontend/src/apps/public/PublicApp.tsx 'Ready to move faster?' 'deployed frontend final section eyebrow'
check_file_contains frontend/src/apps/public/PublicApp.tsx 'Start with BookedAI' 'deployed frontend final CTA label'
check_file_contains frontend/src/apps/public/PublicApp.tsx 'https://product.bookedai.au/?source=homepage-cta' 'deployed frontend final CTA product link'

printf '\n== Live frontend source checks ==\n'
check_file_contains frontend/index.html 'Bookedai.au | The AI Revenue Engine for Service Businesses' 'Vite HTML metadata title'
check_file_contains frontend/index.html 'Bookedai.au captures demand across search, website, calls, email, and follow-up' 'Vite HTML metadata description'
check_file_contains frontend/src/apps/public/PublicApp.tsx 'Turn more website visitors, calls, and enquiries into confirmed bookings.' 'Vite hero headline'
check_file_contains frontend/src/apps/public/PublicApp.tsx 'The AI revenue engine for service businesses' 'Vite hero eyebrow'
check_file_contains frontend/src/apps/public/PublicApp.tsx 'Start in product' 'Vite hero CTA label'
check_file_contains frontend/src/apps/public/PublicApp.tsx 'Product proof' 'Vite proof section label'
check_file_contains frontend/src/apps/public/PublicApp.tsx 'What matters most' 'Vite top signal label'
check_file_contains frontend/src/apps/public/PublicApp.tsx 'Questions teams ask most' 'Vite FAQ heading'
check_file_contains frontend/src/apps/public/PublicApp.tsx 'Ready to move faster?' 'Vite final section eyebrow'
check_file_contains frontend/src/apps/public/PublicApp.tsx 'Start with BookedAI' 'Vite final CTA label'
check_file_contains frontend/src/apps/public/PublicApp.tsx 'https://product.bookedai.au/?source=homepage' 'Vite hero product link'
check_file_contains frontend/src/apps/public/PublicApp.tsx 'https://product.bookedai.au/?source=homepage-cta' 'Vite final product link'

printf '\n== Old wording should be absent ==\n'
check_absent() {
  local file="$1"
  local needle="$2"
  local label="$3"
  if grep -Fq "$needle" "$file"; then
    echo "FAIL unexpected: $label"
    grep -Fn "$needle" "$file" | head -n 3
  else
    echo "PASS absent: $label"
  fi
}

check_absent frontend/src/apps/public/PublicApp.tsx 'Final conversion prompt' 'old final CTA eyebrow in deployed frontend source'
check_absent frontend/src/apps/public/PublicApp.tsx 'Proof From The Revenue Layer' 'old testimonial wording in deployed frontend source'
check_absent frontend/src/apps/public/PublicApp.tsx 'Tenant investigation' 'old tenant label in deployed frontend source'
check_absent frontend/src/apps/public/PublicApp.tsx 'BookedAI.au Operator' 'old owner wording in deployed frontend source'
check_absent frontend/src/apps/public/PublicApp.tsx 'Final conversion prompt' 'old final CTA eyebrow in Vite source'
check_absent frontend/src/apps/public/PublicApp.tsx 'Proof From The Revenue Layer' 'old testimonial wording in Vite source'
check_absent frontend/src/apps/public/PublicApp.tsx 'Tenant investigation' 'old tenant label in Vite source'
check_absent frontend/src/apps/public/PublicApp.tsx 'BookedAI.au Operator' 'old owner wording in Vite source'

printf '\n== Suggested next step ==\n'
echo 'If any FAIL appears here on the VPS host repo, the host worktree is not carrying the latest homepage/admin polish changes.'
echo 'If all PASS here but live verify still fails, the deploy/build pipeline is publishing a different source tree or stale frontend artifact.'
