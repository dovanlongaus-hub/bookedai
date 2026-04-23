# Tenant Google auth production wiring

- Timestamp: 2026-04-21T22:22:10.382516+00:00
- Source: docs/development/tenant-billing-auth-execution-package.md
- Category: implementation
- Status: done

## Summary

Wired tenant Google login through the real production deploy path by passing GOOGLE_OAUTH_CLIENT_ID into backend containers and VITE_GOOGLE_CLIENT_ID into frontend builds, while keeping the tenant page Google button and config-error guidance aligned.

## Details

Completed the production wiring needed for tenant Google login. frontend/Dockerfile now accepts VITE_GOOGLE_CLIENT_ID during the production build. docker-compose.prod.yml now injects GOOGLE_OAUTH_CLIENT_ID into backend and beta-backend, and passes VITE_GOOGLE_CLIENT_ID into web and beta-web with a fallback to the same backend Google client ID so one real OAuth client can drive both the tenant Google button and backend token verification. Added matching keys to .env.example and .env.production.example, and verified with backend py_compile plus frontend TypeScript typecheck and production build. Live tenant Google sign-in still requires filling GOOGLE_OAUTH_CLIENT_ID with the real Google OAuth web client ID in .env before redeploy.
