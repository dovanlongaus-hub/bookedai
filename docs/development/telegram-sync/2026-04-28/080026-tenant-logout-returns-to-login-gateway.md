# Tenant logout returns to login gateway

- Timestamp: 2026-04-28T08:00:26.399765+00:00
- Source: tenant.bookedai.au
- Category: tenant-auth
- Status: completed

## Summary

Fixed tenant logout so Sign out clears tenant and gateway sessions, then returns to tenant.bookedai.au for a clean next-account login.

## Details

On 2026-04-28, tenant logout was leaving operators in the tenant workspace/preview flow and could preserve the gateway default session, which made it awkward to sign in with a different tenant account. The frontend TenantApp logout handler now clears the current tenant slug session, the current route tenant session, and the default gateway session, clears transient password/auth state, and redirects to the shared tenant login gateway. Production returns to https://tenant.bookedai.au/; local tenant routes return to /tenant. Verification passed with npm --prefix frontend exec tsc -- --noEmit, npm --prefix frontend run build, live deploy through bash scripts/deploy_live_host.sh, stack health at 2026-04-28T07:58:00Z, and Playwright live smoke: AI Mentor login reached /ai-mentor-doer, Sign out returned to https://tenant.bookedai.au/, the sign-in card was visible, Connected as disappeared, and tenant session localStorage keys were empty. During deployment, Docker root disk pressure reached 100%; unused Docker builder cache/images were pruned and the deploy was rerun successfully.
