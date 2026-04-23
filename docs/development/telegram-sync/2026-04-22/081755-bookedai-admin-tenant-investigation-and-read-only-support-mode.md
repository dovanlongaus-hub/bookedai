# BookedAI admin tenant investigation and read-only support mode

- Timestamp: 2026-04-22T08:17:55.523028+00:00
- Source: telegram
- Category: change-summary
- Status: submitted

## Summary

Root admin now has a tenant investigation workspace plus audited read-only support mode for safer tenant auth, billing, and CRM investigation.

## Details

Extended the root Next.js admin Phase 3 control plane with a dedicated /admin/tenants workspace. The new tenant investigation surface reads tenant-auth posture, billing readiness, and CRM retry state from the production tenant runtime through read-only snapshots before deeper intervention is attempted. Admin session tokens now support audited read_only tenant support mode with reason capture, topbar bannering, and explicit start/end audit events, instead of turning normal admin tenant context switching into a write-capable impersonation flow. Verification passed with node node_modules/typescript/bin/tsc --noEmit and node node_modules/next/dist/bin/next build.
