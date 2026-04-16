# BookedAI Environment Strategy

## Purpose

This note explains how environment variables should be organized in the current production-safe repo.

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
- admin runtime
- Hermes service
- deployment and DNS automation

## Rules

- frontend-public variables must use `VITE_*`
- backend and provider secrets must stay server-only
- provider variables should remain grouped by provider prefix where possible
- new rollout-sensitive runtime toggles should be added carefully and documented
- do not expose Stripe, Zoho, email, or AI secrets to the browser

## Migration-safe expectation

- prefer extending existing env names over renaming live variables
- if a variable must be replaced later, support compatibility during transition
- document new env variables in `.env.example`, relevant docs, and deployment notes together
