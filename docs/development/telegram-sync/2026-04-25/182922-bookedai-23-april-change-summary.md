# BookedAI 23 April change summary

- Timestamp: 2026-04-25T18:29:22.748147+00:00
- Source: telegram
- Category: operator-summary
- Status: completed

## Summary

BookedAI 23 April change summary for the Discord pin board:

1. Production infrastructure recovered after the host/IP move: Cloudflare origin handling, Supabase Kong startup, health checks, proxy, public surfaces, and backend health returned to green.
2. Auth and security posture hardened: admin/tenant sessions stopped falling back to admin token/password, root admin moved to email-code login, bootstrap login became break-glass only, and legacy tenant-membership compatibility was added.
3. OpenClaw/Telegram became a real host-control lane: trusted actor 8426853622 is allowlisted, host-shell/full_project are enabled, nsenter targets the VPS host, and deploy-live works from /workspace/bookedai.au.
4. Release flow was promoted back to main, missing files were restored, builds/tests were validated where available, completed branches were cleaned, and live deploys reactivated n8n workflow stwMomWRq2qJoaTy.
5. Admin productization advanced: enterprise admin lanes, Messaging foundation, read-model Billing/Integrations/Audit summaries, and controlled Settings/Leads handoff planning plus first slices landed.
6. The web-first Golden Tenant Activation + Revenue Proof Loop was locked, with Future Swim primary and tenant activation, billing truth, conversion aftermath, and revenue proof visibility moved forward.
7. Public surfaces were realigned: bookedai.au became the product-first homepage, pitch.bookedai.au became the deeper narrative surface, slow-search UX improved, and degraded booking submit gained safe fallback behavior.
8. The architecture direction was captured as an embeddable multi-tenant booking/runtime layer for SME-owned websites, not only a central marketplace.

## Details

# BookedAI Full-Day Operator Summary - 2026-04-23

## Short Discord Summary

BookedAI 2026-04-23 full-day summary:

1. Stabilized production infrastructure after the host/IP move: Cloudflare DNS automation now supports the new origin `34.40.192.68`, Supabase Kong recovered, health checks passed, and public/backend surfaces returned to healthy state.
2. Hardened auth/security posture: admin and tenant session signing no longer falls back to admin token/password, bootstrap admin login is break-glass only, root admin login now uses email verification codes, and the live legacy schema has a compatibility path through tenant memberships.
3. Reworked OpenClaw/Telegram operations into a real host-control lane: trusted actor `8426853622` is allowlisted, pairing blocker is removed, `host-shell` and `full_project` are enabled, `nsenter` now targets the VPS host, and the exact command `cd /workspace/bookedai.au && python3 scripts/telegram_workspace_ops.py deploy-live` was fixed and verified end-to-end.
4. Promoted the release flow back to `main`: restored missing files, validated builds/tests where available, pushed `main`, cleaned completed branches, and redeployed live with n8n workflow `stwMomWRq2qJoaTy` active.
5. Advanced admin productization: shared frontend admin IA expanded into enterprise lanes, Messaging foundation shipped, Billing/Integrations/Audit became read-model-backed, and Settings plus Leads promotion plans and guarded handoff slices landed.
6. Locked the next product wedge: web-first `Golden Tenant Activation + Revenue Proof Loop`, with Future Swim primary, tenant activation checklist, billing truth language, lead conversion aftermath visibility, and tenant revenue-proof board now implemented.
7. Realigned public surfaces: `bookedai.au` is now the simpler product-first homepage, `pitch.bookedai.au` carries the longer professional narrative, marketplace imagery is live, slow-search UX is clearer, and degraded booking submit now falls back safely.
8. Captured the next architecture direction: BookedAI is now documented as an embeddable multi-tenant booking/runtime layer for customer-owned SME websites, not only a central marketplace site.

Live deploys completed successfully, and today’s final OpenClaw/Telegram host-deploy fix has been verified from inside the OpenClaw CLI container.

## Detailed Notes

- Production infrastructure:
  - Cloudflare DNS automation was pinned and then returned to auto-detect mode with a safer host list and metadata-first IP discovery.
  - Supabase Kong startup was fixed by removing the executable-bit dependency and using `/bin/bash /home/kong/kong-entrypoint.sh`.
  - Health checks confirmed Supabase, backend, public surfaces, OpenClaw, and proxy recovery.
  - The production deploy path completed multiple times and reactivated n8n workflow `stwMomWRq2qJoaTy`.

- Admin/auth/security:
  - Admin and tenant session signing no longer use `ADMIN_API_TOKEN` or `ADMIN_PASSWORD` fallbacks.
  - Root admin shared-password login was replaced by email-code login, with bootstrap password login restricted behind `ADMIN_ENABLE_BOOTSTRAP_LOGIN=1`.
  - Because live Postgres still uses the legacy tenant schema rather than the full root Prisma `users` chain, a compatibility auth path now resolves admin identities from `tenant_user_memberships` and stores admin-intent codes in `tenant_email_login_codes`.
  - Tenant HTML preview handling was hardened with an allowlist sanitizer.

- Release/git operations:
  - The upgrade branch was promoted to `main`, missing restored files were committed, and completed branches were cleaned after containment checks.
  - Verification included frontend production builds, TypeScript/node test packs for Settings/Leads handoff guards, and targeted admin workspace verification.
  - Python backend test coverage remains limited in this shell where `pytest` is unavailable.

- Admin productization:
  - The shared admin shell now has broader enterprise IA: Overview, Tenants, Tenant Workspace, Catalog, Billing Support, Integrations, Messaging, Reliability, Audit & Activity, and Platform Settings.
  - Messaging foundation was added across backend/admin surfaces.
  - Billing Support, Integrations, and Audit & Activity now use read-model-backed summaries.
  - Settings promotion was planned and partially implemented through controlled handoff, return-path validation, support-mode protection, tenant mismatch handling, mutation guards, and tests.
  - Leads promotion was planned and started with handoff metadata, action guards, support-mode protection, tenant mismatch protection, unsafe return-path rejection, and post-conversion aftermath visibility.

- Golden tenant/revenue loop:
  - The next execution wave was locked to a web-first `Golden Tenant Activation + Revenue Proof Loop`.
  - Future Swim is the primary wedge; children’s chess classes and AI Mentor 1-1 remain adaptation templates.
  - Tenant runtime gained a derived activation state and activation checklist.
  - Billing copy now distinguishes manual, connected, and provider-backed commercial truth more clearly.
  - Tenant overview now frames leads, bookings, paid revenue, outstanding revenue, booking proof, source contribution, and CRM/follow-up attention as a single revenue-proof story.

- Public/product surfaces:
  - `bookedai.au` was simplified into a product-first homepage.
  - `pitch.bookedai.au` now carries the longer professional narrative.
  - A marketplace strategy image was added as the homepage hero backdrop.
  - Public search and booking flows were hardened so degraded v1 writes can fall back to the legacy booking-session lane.
  - Slow search now shows visible progress and prompts users for better suburb, timing, audience, and preference details.
  - The next architectural direction is documented as an embeddable multi-tenant runtime for SME-owned sites.

- OpenClaw/Telegram operations:
  - Telegram DM access is allowlist-based for trusted actor `8426853622`.
  - `host-shell`, `host-command`, and `full_project` are enabled for the trusted operator lane.
  - `openclaw-cli` now restarts reliably after gateway races.
  - Host execution now uses `nsenter --target 1` when running inside the privileged CLI container.
  - The remaining gap was fixed today: `deploy-live` now also enters the host namespace, so the exact Telegram/OpenClaw command `cd /workspace/bookedai.au && python3 scripts/telegram_workspace_ops.py deploy-live` works from the mounted repo path.
