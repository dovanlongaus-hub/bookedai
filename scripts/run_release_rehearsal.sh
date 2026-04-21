#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TIMESTAMP="$(date -u +%Y%m%dT%H%M%SZ)"
REPORT_DIR="${ROOT_DIR}/artifacts/release-rehearsal"
REPORT_PATH="${REPORT_DIR}/release-rehearsal-${TIMESTAMP}.md"

RUN_STACK_HEALTHCHECK=true
RUN_BETA_HEALTHCHECK=false
RUN_SEARCH_REPLAY_GATE=false
BETA_BASE_URL="${BETA_BASE_URL:-https://beta.bookedai.au}"

usage() {
  cat <<'EOF'
Usage: ./scripts/run_release_rehearsal.sh [options]

Options:
  --skip-stack-healthcheck   Skip local stack healthcheck after release gate
  --beta-healthcheck         Run beta healthcheck against BETA_BASE_URL
  --search-replay-gate       Run the production-shaped search replay gate and include it in the report
  --beta-base-url URL        Override beta base URL (default: https://beta.bookedai.au)
  --help                     Show this help

This wrapper turns the release gate into a promote-or-hold rehearsal:
1. run the technical release gate
2. optionally run local or beta health checks
3. write a timestamped rehearsal report under artifacts/release-rehearsal/
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --skip-stack-healthcheck)
      RUN_STACK_HEALTHCHECK=false
      shift
      ;;
    --beta-healthcheck)
      RUN_BETA_HEALTHCHECK=true
      shift
      ;;
    --search-replay-gate)
      RUN_SEARCH_REPLAY_GATE=true
      shift
      ;;
    --beta-base-url)
      if [[ $# -lt 2 ]]; then
        echo "Missing value for --beta-base-url" >&2
        exit 1
      fi
      BETA_BASE_URL="$2"
      shift 2
      ;;
    --help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown option: $1" >&2
      usage >&2
      exit 1
      ;;
  esac
done

mkdir -p "${REPORT_DIR}"

release_gate_status="not_run"
stack_health_status="skipped"
beta_health_status="skipped"
search_replay_status="skipped"
decision="hold"
decision_note="Release rehearsal did not finish."

echo "[release-rehearsal] running root release gate"
if [[ "${RUN_SEARCH_REPLAY_GATE}" == "true" ]]; then
  export RUN_SEARCH_REPLAY_GATE=true
fi
if "${ROOT_DIR}/scripts/run_release_gate.sh"; then
  release_gate_status="passed"
else
  release_gate_status="failed"
fi

if [[ "${release_gate_status}" != "passed" ]]; then
  decision="hold"
  decision_note="Root release gate failed. Do not promote until the first-run failure is understood."
else
  if [[ "${RUN_STACK_HEALTHCHECK}" == "true" ]]; then
    echo "[release-rehearsal] running local stack healthcheck"
    if "${ROOT_DIR}/scripts/healthcheck_stack.sh"; then
      stack_health_status="passed"
    else
      stack_health_status="failed"
      decision="hold"
      decision_note="Release gate passed but local stack healthcheck failed. Hold promotion and inspect infra/runtime state."
    fi
  fi

  if [[ "${RUN_BETA_HEALTHCHECK}" == "true" ]]; then
    echo "[release-rehearsal] running beta healthcheck at ${BETA_BASE_URL}"
    if curl -fsS "${BETA_BASE_URL}" >/dev/null && curl -fsS "${BETA_BASE_URL}/api/health" >/dev/null; then
      beta_health_status="passed"
    else
      beta_health_status="failed"
      decision="hold"
      decision_note="Release gate passed but beta healthcheck failed. Hold promotion until the rehearsal surface is healthy."
    fi
  fi

  if [[ "${RUN_SEARCH_REPLAY_GATE}" == "true" ]]; then
    if [[ "${release_gate_status}" == "passed" ]]; then
      search_replay_status="passed"
    else
      search_replay_status="failed"
      decision="hold"
      decision_note="Root release gate failed while search replay gate was enabled. Do not promote until the search thresholds recover or the drift is explained."
    fi
  fi

  if [[ "${decision}" == "hold" && "${decision_note}" != "Release rehearsal did not finish." ]]; then
    :
  else
    decision="promote_ready"
    decision_note="Technical gate passed and the selected healthchecks passed. Review release checklist, then promote only if rollout wording remains additive."
  fi
fi

cat >"${REPORT_PATH}" <<EOF
# Release Rehearsal Report

Date: \`${TIMESTAMP}\`

## Command summary

- release gate: \`./scripts/run_release_gate.sh\`
- local stack healthcheck: \`${RUN_STACK_HEALTHCHECK}\`
- beta healthcheck: \`${RUN_BETA_HEALTHCHECK}\`
- search replay gate: \`${RUN_SEARCH_REPLAY_GATE}\`
- beta base url: \`${BETA_BASE_URL}\`

## Results

- release gate: \`${release_gate_status}\`
- local stack healthcheck: \`${stack_health_status}\`
- beta healthcheck: \`${beta_health_status}\`
- search replay gate: \`${search_replay_status}\`

## Decision

- decision: \`${decision}\`
- note: ${decision_note}

## Promote checklist reminder

Use \`docs/development/release-gate-checklist.md\` before promoting.

## Rollback reminder

Prefer the smallest rollback:

1. disable the newest additive flag or UI exposure first
2. keep v1 read paths and advisory operator surfaces intact where possible
3. do not revert legacy-authoritative write boundaries for a UI-only regression
EOF

echo "[release-rehearsal] report written to ${REPORT_PATH}"
echo "[release-rehearsal] decision: ${decision}"
echo "[release-rehearsal] note: ${decision_note}"

if [[ "${decision}" != "promote_ready" ]]; then
  exit 1
fi
