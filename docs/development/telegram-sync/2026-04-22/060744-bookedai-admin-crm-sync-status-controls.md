# BookedAI admin CRM sync status controls

- Timestamp: 2026-04-22T06:07:44.022668+00:00
- Source: docs/development/implementation-progress.md
- Category: implementation
- Status: completed

## Summary

Root admin detail pages now surface Zoho CRM sync state directly. Customer detail can sync or retry Zoho contact writes, lead detail now shows CRM sync posture and retry state, and backend adds GET /api/v1/integrations/crm-sync/status for entity-level status reads.

## Details

Implemented the next Zoho-connected admin workspace slice across backend and root Next.js admin. Backend now exposes GET /api/v1/integrations/crm-sync/status, backed by CrmSyncRepository.get_latest_sync_record_for_entity(...), so the workspace can fetch the latest CRM sync row plus latest error and retry context for a given entity_type and local_entity_id. The root admin app now has a reusable components/admin/shared/crm-sync-status-card.tsx surface and a lib/integrations/zoho-crm-sync.ts helper for status reads and retry calls. Customer detail now shows Zoho contact sync status plus direct Sync to Zoho contact and Retry Zoho sync actions, while lead detail now shows Zoho lead sync status and retry controls when a lead-side sync row already exists. Verification passed with python3 -m py_compile backend/repositories/crm_repository.py backend/api/v1_integration_handlers.py backend/api/v1_integration_routes.py backend/tests/test_api_v1_integration_routes.py, node node_modules/typescript/bin/tsc --noEmit, and node node_modules/next/dist/bin/next build.
