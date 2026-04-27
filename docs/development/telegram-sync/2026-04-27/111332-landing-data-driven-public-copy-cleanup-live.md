# Landing data-driven public copy cleanup live

- Timestamp: 2026-04-27T11:13:32.534218+00:00
- Source: frontend/src/components/landing/data.ts
- Category: public-copy
- Status: live-verified

## Summary

Landing data-driven public copy cleanup is live: frontend/src/components/landing/data.ts now uses public-facing team/account/support wording instead of internal operator/runtime/handoff language, with live homepage bundle /assets/index-B6w90ijm.js verified.

## Details

Completed the final scoped public copy pass on frontend/src/components/landing/data.ts. The change stayed data-only and structure-preserving: IDs, URLs, statuses, roadmap shape, and component contracts were left intact while public strings were softened from internal operator/runtime/handoff/admin/tenant language toward team, staff, account, support, product surface, booking next step, and revenue workflow wording. Deployed live with bash scripts/deploy_live_host.sh; backend, beta-backend, web, and beta-web rebuilt/recreated, proxy restarted, and the n8n booking intake workflow remained active. Verification passed with npm --prefix frontend run build, git diff --check, bash scripts/healthcheck_stack.sh at 2026-04-27T11:12:33Z, bash scripts/verify_homepage_admin_polish.sh, live homepage bundle /assets/index-B6w90ijm.js, and direct live data chunk /assets/data-BCQN71vM.js grep confirming operator/runtime/handoff/control plane/chat revenue platform cleanup terms are absent.
