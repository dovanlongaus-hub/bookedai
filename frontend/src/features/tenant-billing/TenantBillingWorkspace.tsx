import type { Dispatch, FormEventHandler, SetStateAction } from 'react';

import type { TenantBillingResponse } from '../../shared/contracts';

export type TenantBillingAccountFormState = {
  billing_email: string;
  merchant_mode: string;
};

function formatDateLabel(value: string | null | undefined) {
  if (!value) {
    return 'Not scheduled';
  }
  try {
    return new Intl.DateTimeFormat('en-AU', {
      dateStyle: 'medium',
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function formatMoney(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount}`;
  }
}

export function TenantBillingWorkspace({
  billing,
  sessionReady,
  accountForm,
  setAccountForm,
  billingPending,
  billingError,
  billingMessage,
  subscriptionPendingPlanCode,
  invoiceActionPendingId,
  onSaveBillingAccount,
  onSelectPlan,
  onMarkInvoicePaid,
  onDownloadReceipt,
}: {
  billing: TenantBillingResponse;
  sessionReady: boolean;
  accountForm: TenantBillingAccountFormState;
  setAccountForm: Dispatch<SetStateAction<TenantBillingAccountFormState>>;
  billingPending: boolean;
  billingError: string | null;
  billingMessage: string | null;
  subscriptionPendingPlanCode: string | null;
  invoiceActionPendingId: string | null;
  onSaveBillingAccount: FormEventHandler<HTMLFormElement>;
  onSelectPlan: (planCode: string) => void;
  onMarkInvoicePaid: (invoiceId: string) => void;
  onDownloadReceipt: (invoiceId: string) => void;
}) {
  return (
    <section className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
      <div className="space-y-6">
        <article className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-[0_18px_44px_rgba(15,23,42,0.06)]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                Package and charging
              </div>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
                Billing workspace
              </h2>
            </div>
            <div
              className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                billing.collection.can_charge
                  ? 'border-emerald-300 bg-emerald-50 text-emerald-950'
                  : billing.collection.has_active_subscription
                    ? 'border-sky-300 bg-sky-50 text-sky-950'
                    : 'border-amber-300 bg-amber-50 text-amber-950'
              }`}
            >
              {billing.collection.can_charge
                ? 'Charge-ready'
                : billing.collection.has_active_subscription
                  ? 'Subscription active'
                  : 'Needs setup'}
            </div>
          </div>

          <p className="mt-3 text-sm leading-6 text-slate-600">
            The tenant portal now acts as the self-serve surface for package choice, trial activation,
            billing setup, and paid workspace readiness.
          </p>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-[1.2rem] border border-slate-200 bg-slate-50 px-4 py-4">
              <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                Package
              </div>
              <div className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
                {billing.plans.find((plan) => plan.is_current)?.label ?? 'Not assigned'}
              </div>
            </div>
            <div className="rounded-[1.2rem] border border-slate-200 bg-slate-50 px-4 py-4">
              <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                Status
              </div>
              <div className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
                {billing.subscription.status.replace(/_/g, ' ')}
              </div>
            </div>
            <div className="rounded-[1.2rem] border border-slate-200 bg-slate-50 px-4 py-4">
              <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                Payment posture
              </div>
              <div className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
                {billing.self_serve.payment_method_status.replace(/_/g, ' ')}
              </div>
            </div>
          </div>

          <div className="mt-5 rounded-[1.25rem] border border-slate-200 bg-[linear-gradient(180deg,#f8fbff_0%,#eef5ff_100%)] px-5 py-5">
            <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-sky-700">
              Recommended next action
            </div>
            <p className="mt-3 text-sm leading-6 text-slate-700">
              {billing.collection.recommended_action}
            </p>
            <p className="mt-3 text-sm leading-6 text-slate-600">{billing.collection.operator_note}</p>
          </div>
        </article>

        <article className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-[0_18px_44px_rgba(15,23,42,0.06)]">
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
            Billing identity
          </div>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
            Account setup
          </h2>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Set the billing contact and merchant posture that this tenant workspace should use
            while moving from trial into paid production.
          </p>

          <form className="mt-5 space-y-4" onSubmit={onSaveBillingAccount}>
            <label className="block">
              <div className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                Billing email
              </div>
              <input
                value={accountForm.billing_email}
                onChange={(event) =>
                  setAccountForm((current) => ({ ...current, billing_email: event.target.value }))
                }
                className="booked-form-input"
                placeholder="ops@example.com"
              />
            </label>
            <label className="block">
              <div className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                Merchant mode
              </div>
              <select
                value={accountForm.merchant_mode}
                onChange={(event) =>
                  setAccountForm((current) => ({ ...current, merchant_mode: event.target.value }))
                }
                className="booked-form-input"
              >
                <option value="test">Test</option>
                <option value="live">Live</option>
              </select>
            </label>

            {billingError ? (
              <div className="rounded-[1rem] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {billingError}
              </div>
            ) : null}
            {billingMessage ? (
              <div className="rounded-[1rem] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                {billingMessage}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={billingPending || !sessionReady || !accountForm.billing_email.trim()}
              className={`inline-flex h-11 items-center justify-center rounded-full px-5 text-sm font-semibold transition ${
                billingPending || !sessionReady || !accountForm.billing_email.trim()
                  ? 'cursor-not-allowed bg-slate-200 text-slate-500'
                  : 'bg-slate-950 text-white hover:bg-slate-800'
              }`}
            >
              {billingPending ? 'Saving billing setup...' : 'Save billing setup'}
            </button>
          </form>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="rounded-[1.2rem] border border-slate-200 bg-slate-50 px-4 py-4">
              <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                Billing email
              </div>
              <div className="mt-2 text-sm font-medium text-slate-950">
                {billing.account.billing_email ?? 'No billing email on file'}
              </div>
            </div>
            <div className="rounded-[1.2rem] border border-slate-200 bg-slate-50 px-4 py-4">
              <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                Trial window
              </div>
              <div className="mt-2 text-sm font-medium text-slate-950">
                {billing.self_serve.trial_end_at
                  ? formatDateLabel(billing.self_serve.trial_end_at)
                  : `${billing.self_serve.trial_days}-day package trial available`}
              </div>
            </div>
          </div>
        </article>

        <article className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-[0_18px_44px_rgba(15,23,42,0.06)]">
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
            Payment method
          </div>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
            Collection status
          </h2>
          <p className="mt-3 text-sm leading-6 text-slate-600">{billing.payment_method.note}</p>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="rounded-[1.2rem] border border-slate-200 bg-slate-50 px-4 py-4">
              <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                Provider
              </div>
              <div className="mt-2 text-sm font-medium text-slate-950">
                {billing.payment_method.provider_label ?? 'Not connected'}
              </div>
            </div>
            <div className="rounded-[1.2rem] border border-slate-200 bg-slate-50 px-4 py-4">
              <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                Status
              </div>
              <div className="mt-2 text-sm font-medium text-slate-950">
                {billing.payment_method.status.replace(/_/g, ' ')}
              </div>
            </div>
            <div className="rounded-[1.2rem] border border-slate-200 bg-slate-50 px-4 py-4">
              <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                Method
              </div>
              <div className="mt-2 text-sm font-medium text-slate-950">
                {billing.payment_method.brand && billing.payment_method.last4
                  ? `${billing.payment_method.brand} •••• ${billing.payment_method.last4}`
                  : 'No saved payment method yet'}
              </div>
            </div>
            <div className="rounded-[1.2rem] border border-slate-200 bg-slate-50 px-4 py-4">
              <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                Gateway note
              </div>
              <div className="mt-2 text-sm font-medium text-slate-950">
                {billing.payment_method.expires_label ?? 'Gateway tokenization will plug into this seam later.'}
              </div>
            </div>
          </div>
        </article>
      </div>

      <div className="space-y-6">
        <article className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-[0_18px_44px_rgba(15,23,42,0.06)]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                Packages
              </div>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
                Choose a tenant package
              </h2>
            </div>
            <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
              {billing.plans.length} package option(s)
            </div>
          </div>

          <div className="mt-5 grid gap-4 xl:grid-cols-3">
            {billing.plans.map((plan) => (
              <div
                key={plan.code}
                className={`rounded-[1.4rem] border px-4 py-5 ${
                  plan.recommended
                    ? 'border-sky-300 bg-[linear-gradient(180deg,#f8fbff_0%,#eef5ff_100%)]'
                    : 'border-slate-200 bg-slate-50'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-lg font-semibold text-slate-950">{plan.label}</div>
                    <div className="mt-1 text-sm text-slate-600">{plan.description}</div>
                  </div>
                  {plan.recommended ? (
                    <div className="rounded-full border border-sky-300 bg-white px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-sky-700">
                      Recommended
                    </div>
                  ) : null}
                </div>

                <div className="mt-4 text-3xl font-semibold tracking-tight text-slate-950">
                  {plan.price_label}
                </div>
                <div className="mt-1 text-xs uppercase tracking-[0.12em] text-slate-500">
                  {plan.billing_interval}
                </div>

                <div className="mt-4 space-y-2">
                  {plan.features.map((item) => (
                    <div key={item} className="rounded-[1rem] border border-white/80 bg-white px-3 py-2 text-sm text-slate-600">
                      {item}
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => onSelectPlan(plan.code)}
                  disabled={
                    !sessionReady
                    || !billing.self_serve.can_manage_billing
                    || !billing.collection.has_billing_account
                    || !!subscriptionPendingPlanCode
                    || plan.is_current
                  }
                  className={`mt-5 inline-flex h-11 w-full items-center justify-center rounded-full px-5 text-sm font-semibold transition ${
                    !sessionReady
                    || !billing.self_serve.can_manage_billing
                    || !billing.collection.has_billing_account
                    || !!subscriptionPendingPlanCode
                    || plan.is_current
                      ? 'cursor-not-allowed bg-slate-200 text-slate-500'
                      : 'bg-slate-950 text-white hover:bg-slate-800'
                  }`}
                >
                  {subscriptionPendingPlanCode === plan.code ? 'Applying package...' : plan.cta_label}
                </button>
              </div>
            ))}
          </div>

          {!billing.collection.has_billing_account ? (
            <div className="mt-5 rounded-[1.1rem] border border-amber-300 bg-amber-50 px-4 py-4 text-sm text-amber-900">
              Save billing setup first, then the tenant can start a trial or switch packages from this portal.
            </div>
          ) : null}
        </article>

        <article className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-[0_18px_44px_rgba(15,23,42,0.06)]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                Invoices
              </div>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
                Invoice history seam
              </h2>
            </div>
            <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
              {billing.invoice_summary.total_invoices} invoice(s)
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-[1.2rem] border border-slate-200 bg-slate-50 px-4 py-4">
              <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                Open
              </div>
              <div className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
                {billing.invoice_summary.open_invoices}
              </div>
            </div>
            <div className="rounded-[1.2rem] border border-slate-200 bg-slate-50 px-4 py-4">
              <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                Paid
              </div>
              <div className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
                {billing.invoice_summary.paid_invoices}
              </div>
            </div>
            <div className="rounded-[1.2rem] border border-slate-200 bg-slate-50 px-4 py-4">
              <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                Currency
              </div>
              <div className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
                {billing.invoice_summary.currency}
              </div>
            </div>
          </div>

          <div className="mt-5 space-y-3">
            {billing.invoices.length ? (
              billing.invoices.map((invoice) => (
                <div
                  key={invoice.id}
                  className="rounded-[1.2rem] border border-slate-200 bg-slate-50 px-4 py-4"
                >
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="text-sm font-semibold text-slate-950">{invoice.invoice_number}</div>
                      <div className="mt-1 text-sm text-slate-600">
                        {formatDateLabel(invoice.period_start)} to {formatDateLabel(invoice.period_end)}
                      </div>
                      <div className="mt-1 text-xs text-slate-500">
                        Issued {formatDateLabel(invoice.issued_at)} · Due {formatDateLabel(invoice.due_at)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold text-slate-950">
                        {formatMoney(invoice.amount_aud, invoice.currency)}
                      </div>
                      <div className="mt-1 text-xs text-slate-600">{invoice.status.replace(/_/g, ' ')}</div>
                      <div className="mt-1 text-xs text-slate-500">
                        {invoice.receipt_available ? 'Receipt available seam' : 'Receipt pending'}
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => onDownloadReceipt(invoice.id)}
                      disabled={!sessionReady || invoiceActionPendingId === invoice.id}
                      className={`inline-flex items-center justify-center rounded-full border px-4 py-2 text-sm font-semibold transition ${
                        !sessionReady || invoiceActionPendingId === invoice.id
                          ? 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400'
                          : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {invoiceActionPendingId === invoice.id ? 'Preparing receipt...' : 'Download receipt'}
                    </button>
                    <button
                      type="button"
                      onClick={() => onMarkInvoicePaid(invoice.id)}
                      disabled={
                        !sessionReady
                        || !billing.self_serve.can_manage_billing
                        || invoice.status === 'paid'
                        || invoiceActionPendingId === invoice.id
                      }
                      className={`inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-semibold transition ${
                        !sessionReady
                        || !billing.self_serve.can_manage_billing
                        || invoice.status === 'paid'
                        || invoiceActionPendingId === invoice.id
                          ? 'cursor-not-allowed bg-slate-200 text-slate-500'
                          : 'bg-slate-950 text-white hover:bg-slate-800'
                      }`}
                    >
                      {invoiceActionPendingId === invoice.id
                        ? 'Updating invoice...'
                        : invoice.status === 'paid'
                          ? 'Marked paid'
                          : 'Mark as paid'}
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-[1.2rem] border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-sm text-slate-600">
                No invoice rows exist yet. This seam will start surfacing real invoice records as billing cycles mature.
              </div>
            )}
          </div>
        </article>

        <article className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-[0_18px_44px_rgba(15,23,42,0.06)]">
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
            Billing settings
          </div>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
            Workspace policy
          </h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="rounded-[1.2rem] border border-slate-200 bg-slate-50 px-4 py-4">
              <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                Invoice delivery
              </div>
              <div className="mt-2 text-sm font-medium text-slate-950">
                {billing.settings.invoice_delivery}
              </div>
            </div>
            <div className="rounded-[1.2rem] border border-slate-200 bg-slate-50 px-4 py-4">
              <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                Auto renew
              </div>
              <div className="mt-2 text-sm font-medium text-slate-950">
                {billing.settings.auto_renew ? 'Enabled' : 'Not active'}
              </div>
            </div>
            <div className="rounded-[1.2rem] border border-slate-200 bg-slate-50 px-4 py-4">
              <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                Merchant mode
              </div>
              <div className="mt-2 text-sm font-medium text-slate-950">
                {billing.settings.merchant_mode ?? 'Not set'}
              </div>
            </div>
            <div className="rounded-[1.2rem] border border-slate-200 bg-slate-50 px-4 py-4">
              <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                Support tier
              </div>
              <div className="mt-2 text-sm font-medium text-slate-950">
                {billing.settings.support_tier}
              </div>
            </div>
          </div>
        </article>

        <article className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-[0_18px_44px_rgba(15,23,42,0.06)]">
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
            Audit trail
          </div>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
            Recent billing and tenant actions
          </h2>
          <div className="mt-5 space-y-3">
            {billing.audit_trail.length ? (
              billing.audit_trail.map((item) => (
                <div
                  key={item.id}
                  className="rounded-[1.2rem] border border-slate-200 bg-slate-50 px-4 py-4"
                >
                  <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="text-sm font-semibold text-slate-950">{item.summary}</div>
                      <div className="mt-1 text-xs text-slate-600">
                        {item.event_type} {item.entity_type ? `· ${item.entity_type}` : ''}
                      </div>
                      <div className="mt-1 text-xs text-slate-500">
                        {item.actor_type ?? 'system'} {item.actor_id ? `· ${item.actor_id}` : ''}
                      </div>
                    </div>
                    <div className="text-xs text-slate-500">{formatDateLabel(item.created_at)}</div>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-[1.2rem] border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-sm text-slate-600">
                No tenant billing audit entries exist yet. Actions taken from this portal will appear here.
              </div>
            )}
          </div>
        </article>

        <article className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-[0_18px_44px_rgba(15,23,42,0.06)]">
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
            Coming next
          </div>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
            Paid tenant operations roadmap
          </h2>
          <div className="mt-5 space-y-3">
            {billing.upcoming_capabilities.map((item) => (
              <div
                key={item}
                className="rounded-[1.2rem] border border-slate-200 bg-slate-50 px-4 py-4 text-sm leading-6 text-slate-600"
              >
                {item}
              </div>
            ))}
          </div>
        </article>
      </div>
    </section>
  );
}
