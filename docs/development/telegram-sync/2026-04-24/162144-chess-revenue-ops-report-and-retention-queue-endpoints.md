# Chess revenue-ops report and retention queue endpoints

- Timestamp: 2026-04-24T16:21:44.366349+00:00
- Source: codex
- Category: connected-agent
- Status: done

## Summary

Added direct revenue-ops queue endpoints for the chess academy flow: /api/v1/reports/generate and /api/v1/retention/evaluate now create auditable agent_action_runs.

## Details

Extended the Slice 3 foundation beyond subscription handoff. Added POST /api/v1/reports/generate and POST /api/v1/retention/evaluate to queue report-generation and retention-evaluation revenue-operations actions for an academy student or booking reference. Both endpoints use the shared academy service queue path, write agent_action_runs, append audit entries, and enqueue outbox events. Updated the chess backlog, sprint package, blueprint, project memory, and implementation progress. Verification passed with python3 -m py_compile for touched backend modules and cd backend && ../.venv/bin/python -m pytest -q tests/test_api_v1_academy_routes.py tests/test_api_v1_assessment_routes.py tests/test_api_v1_contract.py.
