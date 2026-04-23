# Tenant billing linked to live Stripe flow

- Timestamp: 2026-04-21T18:29:08.682477+00:00
- Source: docs/development/tenant-billing-auth-execution-package.md
- Category: development
- Status: done

## Summary

Tenant billing now uses BookedAI's real Stripe Checkout and Billing Portal flows instead of local-only package/payment seams.

## Details

Implemented a tenant Stripe linkage pass across backend and frontend. Backend now creates hosted Stripe Checkout sessions for tenant package selection, opens hosted Stripe Billing Portal sessions for payment-method management, persists tenant Stripe customer/session linkage in tenant_settings.billing_gateway, and enriches the tenant billing snapshot with live Stripe subscription, invoice, and default payment-method details when available. Frontend tenant billing now redirects package CTAs into Stripe Checkout, opens the Stripe Billing Portal from the payment-method card, and prefers hosted Stripe invoice or receipt URLs when the invoice source is Stripe. Guardrail remains intentional: live Stripe redirects stay blocked until the tenant billing account is switched to live merchant mode.
