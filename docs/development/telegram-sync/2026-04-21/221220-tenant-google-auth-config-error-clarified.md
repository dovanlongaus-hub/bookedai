# Tenant Google auth config error clarified

- Timestamp: 2026-04-21T22:12:20.987197+00:00
- Source: docs/development/tenant-billing-auth-execution-package.md
- Category: development
- Status: done

## Summary

Tenant Google login now returns one explicit setup message when Google OAuth env vars are missing, instead of generic loading or failure copy.

## Details

Adjusted tenant Google-auth error handling on both backend and frontend. Backend Google identity verification in backend/api/v1_routes.py now explicitly fails with the setup message to add VITE_GOOGLE_CLIENT_ID on the frontend and GOOGLE_OAUTH_CLIENT_ID on the backend when Google OAuth backend config is missing. Frontend TenantApp.tsx now also shows the same setup message immediately from handlePromptGoogle() when VITE_GOOGLE_CLIENT_ID is absent, rather than incorrectly saying Google sign-in is still loading. Verified with backend py_compile and frontend TypeScript typecheck.
