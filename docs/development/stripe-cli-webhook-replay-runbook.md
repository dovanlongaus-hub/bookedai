# Stripe CLI Webhook Replay Runbook

Date: `2026-04-28`

## Status

Attempted during the Stripe follow-up pass, but the local workspace does not currently have Stripe CLI installed:

```text
stripe: command not found
```

The browser E2E return-verification path is covered locally, and backend webhook reconciliation has focused tests. A real Stripe CLI replay still needs a machine with Stripe CLI installed and a test-mode Stripe account session/key.

## Preconditions

- `STRIPE_SECRET_KEY=sk_test_...`
- local backend running on `http://localhost:8000`
- Stripe CLI installed
- webhook endpoint path: `http://localhost:8000/api/webhooks/stripe`

## Smoke Steps

1. Check local readiness:

   ```sh
   bash scripts/stripe_webhook_replay_smoke.sh
   ```

2. Start backend:

   ```sh
   uvicorn backend.app:app --reload --port 8000
   ```

3. Start Stripe listener in another terminal:

   ```sh
   stripe listen --api-key "$STRIPE_SECRET_KEY" --forward-to http://localhost:8000/api/webhooks/stripe
   ```

4. Copy the printed `whsec_...` value into `STRIPE_WEBHOOK_SECRET`, then restart the backend.

5. Trigger a test event:

   ```sh
   stripe trigger checkout.session.completed --api-key "$STRIPE_SECRET_KEY"
   ```

6. Expected result:

   - backend route returns HTTP `200`
   - Stripe listener shows the event was delivered
   - backend logs show Stripe event parsing/reconciliation
   - duplicate replay of the same provider event id should not double-apply side effects

## Notes

- Use test mode only.
- Do not run webhook replay against live production keys during local QA.
- If using a fresh listener secret, restart the backend after updating `STRIPE_WEBHOOK_SECRET`; otherwise signature verification will correctly reject the event.

