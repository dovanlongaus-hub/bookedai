# BookedAI Foundation Scaffold

## Purpose

This document explains the additive foundation scaffold introduced to make future BookedAI work safer without rewriting the current production system.

## What this scaffold is

The scaffold adds:

- backend core foundations for config grouping, logging, observability, errors, and feature flags
- backend domain service seams for growth, matching, booking trust, booking paths, payments, CRM, email, billing, deployment modes, AI routing, conversations, and integration hub
- backend repository seams for future tenant-aware persistence
- backend integration seams for Stripe, Zoho CRM, email, WhatsApp, search, AI providers, external systems, and n8n
- backend worker and outbox skeletons
- shared frontend contracts for the same strategic domains

## What this scaffold is not

This scaffold does not:

- replace the current booking flow
- replace live provider integrations
- replace current admin auth
- rewrite the frontend or backend framework
- change public routes, admin routes, or payment entry behavior

## How to use it

- new domain logic should prefer moving into `backend/domain/*`
- new provider mechanics should prefer `backend/integrations/*`
- future persistence work should prefer `backend/repositories/*`
- new shared frontend-to-backend DTOs should start in `frontend/src/shared/contracts/*`
- rollout-sensitive work should use the feature flag foundations instead of hard switches

## First follow-on work this enables

- Stripe webhook-first billing hardening
- Zoho CRM lifecycle integration
- tenant-aware schema introduction
- booking trust and availability modeling
- AI router and grounding expansion
- monthly reporting and outbox jobs
- tenant app and embedded widget foundations
