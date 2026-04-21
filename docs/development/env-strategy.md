# BookedAI Environment Strategy

Date: `2026-04-21`

## Purpose

This note explains how environment variables are organized in the current production-safe repo and which variables are now considered the approved runtime baseline.

## Current grouping

Root `.env.example` is now grouped into:

- app and public runtime
- database and persistence
- AI and search providers
- booking, rate limiting, and uploads
- automation and webhooks
- billing and payment
- CRM and calendar
- email communications
- SMS and WhatsApp communications
- admin runtime
- Hermes service
- deployment and DNS automation

## Current repo reality

The repo currently contains two frontend tracks:

- the active root Next.js application under `app/` and `components/`
- an older `frontend/` subtree that still uses `VITE_*` runtime configuration for that surface

So the environment rule is now:

- browser-exposed variables for the legacy Vite frontend must still use `VITE_*`
- server-only runtime for the active backend and deployment stack must stay in regular non-public env vars
- later Next.js public env variables should use `NEXT_PUBLIC_*` if they are introduced for the root app

Do not assume `VITE_*` means the whole repo is still Vite-first.

## Session-secret policy

The current approved session-signing variables are:

- `SESSION_SIGNING_SECRET`
- `TENANT_SESSION_SIGNING_SECRET`
- `ADMIN_SESSION_SIGNING_SECRET`

The current code uses them in this order:

- tenant sessions prefer `TENANT_SESSION_SIGNING_SECRET`
- admin sessions prefer `ADMIN_SESSION_SIGNING_SECRET`
- shared session fallback may use `SESSION_SIGNING_SECRET`

Compatibility fallback is still present through:

- `ADMIN_API_TOKEN`
- `ADMIN_PASSWORD`

That fallback exists to avoid breaking older environments during rollout.

It should be treated as transitional compatibility, not the preferred long-term secret model.

## Rules

- legacy Vite frontend-public variables must use `VITE_*`
- if the root Next.js app needs public runtime values later, use `NEXT_PUBLIC_*`
- backend and provider secrets must stay server-only
- provider variables should remain grouped by provider prefix where possible
- new rollout-sensitive runtime toggles should be added carefully and documented
- do not expose Stripe, Zoho, email, AI, session-signing, or admin secrets to the browser
- auth secrets should now be separated by actor boundary where practical instead of sharing one signing value for every surface

## Documentation sync rule

Whenever a new environment variable becomes required or preferred:

- add it to `.env.example`
- add it to `.env.production.example` when relevant
- update `README.md`
- update this strategy note
- update the affected operational or sprint document if the change alters rollout order or support expectations

## Migration-safe expectation

- prefer extending existing env names over renaming live variables
- if a variable must be replaced later, support compatibility during transition
- document new env variables in `.env.example`, relevant docs, and deployment notes together
- when a legacy variable remains as fallback, mark it explicitly as compatibility-only so later sprints do not mistake it for the target architecture
