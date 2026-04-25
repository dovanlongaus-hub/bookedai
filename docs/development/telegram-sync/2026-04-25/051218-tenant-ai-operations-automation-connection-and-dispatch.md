# Tenant AI operations automation connection and dispatch

- Timestamp: 2026-04-25T05:12:18.426501+00:00
- Source: main
- Category: implementation
- Status: completed

## Summary

Tenant AI operations advanced on main: integrations now expose an automation connection plan, and tenant admins/operators can run policy-gated queued revenue-ops actions through a tenant-scoped dispatch endpoint.

## Details

Implemented the next Phase 18 AI operations slice directly on main. Backend now adds an automation connection plan to GET /api/v1/tenant/integrations, covering platform messaging, CRM write-back, webhook/workflow automation, customer-care state, action routes, dispatch endpoints, readiness, and guardrails. Added POST /api/v1/tenant/operations/dispatch, scoped to the signed tenant and restricted to tenant admins/operators, so tenants can run the existing revenue-ops worker policy without using global admin dispatch. Frontend TenantApp now shows the automation connection plan in Integrations and adds a Run policy automation control in Ops with dispatch result feedback. The model stays conservative: supported queued actions run under worker policy, while missing contacts, unsupported actions, or degraded provider paths move to manual review. Verification passed with py_compile for tenant service/handlers/routes, focused tenant + worker tests, frontend typecheck, frontend production build, and git diff --check.
