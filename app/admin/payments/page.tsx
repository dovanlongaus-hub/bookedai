import Link from "next/link";

import { createPaymentAction, updatePaymentStatusAction } from "@/app/admin/payments/actions";
import { PaymentForm } from "@/components/admin/payments/payment-form";
import { PageHeader } from "@/components/admin/shared/page-header";
import { SupportModePageBanner } from "@/components/admin/shared/support-mode-page-banner";
import { AdminBadge } from "@/components/ui/admin-badge";
import { AdminButton } from "@/components/ui/admin-button";
import { AdminCard } from "@/components/ui/admin-card";
import { AdminInput } from "@/components/ui/admin-input";
import { getAdminSession } from "@/lib/auth/session";
import { getAdminRepository } from "@/lib/db/admin-repository";
import { requirePermission } from "@/lib/rbac/policies";
import { getTenantContext } from "@/lib/tenant/context";

type SearchParams =
  | Promise<Record<string, string | string[] | undefined>>
  | Record<string, string | string[] | undefined>;

function money(value: number, currency = "AUD") {
  return (value / 100).toLocaleString("en-AU", {
    style: "currency",
    currency,
  });
}

export default async function PaymentsPage({
  searchParams,
}: {
  searchParams?: SearchParams;
}) {
  await requirePermission("payments:view");
  const session = await getAdminSession();
  const params = await Promise.resolve(searchParams ?? {});
  const tenant = await getTenantContext();
  const repository = getAdminRepository();
  const page = Number(params.page ?? "1");
  const query = typeof params.q === "string" ? params.q : "";
  const status = typeof params.status === "string" ? params.status : "all";

  const [payments, customers, bookings] = await Promise.all([
    repository.listPayments({
      tenantId: tenant.tenantId,
      page,
      pageSize: 8,
      query,
      status,
    }),
    repository.listCustomers({ tenantId: tenant.tenantId, page: 1, pageSize: 100 }),
    repository.listBookings({ tenantId: tenant.tenantId, page: 1, pageSize: 100 }),
  ]);

  const paidValue = payments.items
    .filter((payment) => payment.status === "paid")
    .reduce((sum, payment) => sum + payment.amountCents, 0);
  const pendingValue = payments.items
    .filter((payment) => payment.status === "pending")
    .reduce((sum, payment) => sum + payment.amountCents, 0);
  const supportModeActive = Boolean(session.impersonation);

  const baseQuery = new URLSearchParams({
    q: query,
    status,
  });

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Phase 3"
        title="Payments control plane"
        description="This is the first revenue-truth payment lane for the admin workspace: list, filter, record payments, and move status without leaving the tenant operating view."
      />
      <SupportModePageBanner
        scopeLabel="Payments control plane"
        tenantPanel="billing"
        adminPath="/admin/payments"
      />

      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard label="Payments in view" value={String(payments.total)} hint="Filtered payment records." />
        <MetricCard label="Paid value" value={money(paidValue)} hint="Cash recorded in the current result set." />
        <MetricCard label="Pending value" value={money(pendingValue)} hint="Revenue waiting for collection." />
        <MetricCard label="Customers linked" value={String(customers.total)} hint="Available customer ledger base." />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.7fr)_430px]">
        <AdminCard className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-950">Payment ledger</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Use filters to separate unpaid, paid, and refunded flows while keeping customer and booking linkage visible for revenue operations.
              </p>
            </div>
          </div>

          <form className="mt-6 grid gap-3 md:grid-cols-4" action="/admin/payments">
            <AdminInput name="q" defaultValue={query} placeholder="Search provider, method, external ID" className="md:col-span-2" />
            <select
              name="status"
              defaultValue={status}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900"
            >
              <option value="all">All statuses</option>
              <option value="pending">pending</option>
              <option value="paid">paid</option>
              <option value="failed">failed</option>
              <option value="refunded">refunded</option>
            </select>
            <AdminButton type="submit" variant="secondary">
              Apply filters
            </AdminButton>
          </form>

          <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                <tr>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Booking</th>
                  <th className="px-4 py-3">Provider</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {payments.items.map((payment) => (
                  <tr key={payment.id} className="align-top">
                    <td className="px-4 py-4">
                      <div className="font-semibold text-slate-950">{payment.customerName || payment.customerId}</div>
                      <div className="mt-1 text-slate-600">{payment.paymentMethod || "No method"}</div>
                    </td>
                    <td className="px-4 py-4 text-slate-700">{payment.bookingLabel || "Unlinked"}</td>
                    <td className="px-4 py-4 text-slate-700">
                      <div>{payment.provider}</div>
                      <div className="mt-1 text-xs text-slate-500">{payment.externalPaymentId || "No external ID"}</div>
                    </td>
                    <td className="px-4 py-4 text-slate-700">{money(payment.amountCents, payment.currency)}</td>
                    <td className="px-4 py-4">
                      <AdminBadge
                        tone={
                          payment.status === "paid"
                            ? "success"
                            : payment.status === "pending"
                              ? "warning"
                              : "default"
                        }
                      >
                        {payment.status}
                      </AdminBadge>
                    </td>
                    <td className="px-4 py-4">
                      <form
                        action={updatePaymentStatusAction.bind(null, payment.id)}
                        className="flex flex-col gap-2"
                      >
                        <fieldset disabled={supportModeActive} className="contents">
                        <select
                          name="status"
                          defaultValue={payment.status}
                          className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
                        >
                          <option value="pending">pending</option>
                          <option value="paid">paid</option>
                          <option value="failed">failed</option>
                          <option value="refunded">refunded</option>
                        </select>
                        <input type="hidden" name="paidAt" value={payment.paidAt?.slice(0, 16) ?? ""} />
                        <input type="hidden" name="refundedAt" value="" />
                        <AdminButton type="submit" variant="ghost">
                          Save status
                        </AdminButton>
                        </fieldset>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex items-center justify-between text-sm text-slate-600">
            <div>
              Page {payments.page} of {payments.totalPages} • {payments.total} payments
            </div>
            <div className="flex gap-2">
              <Link href={`/admin/payments?page=${Math.max(payments.page - 1, 1)}&${baseQuery.toString()}`}>
                <AdminButton variant="secondary" disabled={payments.page <= 1}>
                  Previous
                </AdminButton>
              </Link>
              <Link href={`/admin/payments?page=${Math.min(payments.page + 1, payments.totalPages)}&${baseQuery.toString()}`}>
                <AdminButton variant="secondary" disabled={payments.page >= payments.totalPages}>
                  Next
                </AdminButton>
              </Link>
            </div>
          </div>
        </AdminCard>

        <AdminCard className="p-6">
          <h2 className="text-lg font-semibold text-slate-950">Record payment</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Create payment entries directly from the workspace so dashboard revenue can move closer to true payment state instead of booking estimates only.
          </p>
          <div className="mt-6">
            <PaymentForm
              action={createPaymentAction}
              customers={customers.items}
              bookings={bookings.items}
              submitLabel="Record payment"
              disabled={supportModeActive}
            />
          </div>
        </AdminCard>
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <AdminCard className="p-5">
      <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
        {label}
      </div>
      <div className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">{value}</div>
      <div className="mt-2 text-sm leading-6 text-slate-600">{hint}</div>
    </AdminCard>
  );
}
