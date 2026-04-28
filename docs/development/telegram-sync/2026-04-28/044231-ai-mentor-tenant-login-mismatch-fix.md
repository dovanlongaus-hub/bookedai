# AI Mentor tenant login mismatch fix

- Timestamp: 2026-04-28T04:42:31.567126+00:00
- Source: tenant.bookedai.au
- Category: tenant-auth
- Status: completed

## Summary

Fixed AI Mentor password login mismatch on tenant.bookedai.au; valid AI Mentor credentials now route to ai-mentor-doer and reload with session-backed tenant reads.

## Details

On 2026-04-28, tenant.bookedai.au could reject aimentor@bookedai.au with 'This tenant account does not belong to the requested tenant' when the login form carried another tenant_ref, such as the chess tenant path or a stale gateway state. The backend password-auth handler now authenticates the credential first and returns the credential-owned tenant session, ai-mentor-doer, instead of rejecting on the requested tenant mismatch. The tenant frontend already redirects to the authenticated tenant slug, and it now passes the session token into initial overview and booking reads after redirect/reload so the AI Mentor workspace stays authenticated. Verification passed with backend py_compile, backend tenant route tests (42 passed), frontend typecheck, frontend build, live deploy, stack health at 2026-04-28T04:39:48Z, live API mismatch smoke returning tenant ai-mentor-doer, and Playwright browser smoke from https://tenant.bookedai.au/ redirecting to /ai-mentor-doer connected as aimentor@bookedai.au.
