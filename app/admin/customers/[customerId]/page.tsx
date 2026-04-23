import Link from "next/link";
import { notFound } from "next/navigation";

import {
  archiveCustomerAction,
  retryCustomerCrmSyncAction,
  syncCustomerCrmContactAction,
  updateCustomerAction,
} from "@/app/admin/customers/actions";
import { ActivityTimeline } from "@/components/admin/shared/activity-timeline";
import { CrmSyncStatusCard } from "@/components/admin/shared/crm-sync-status-card";
import { CustomerForm } from "@/components/admin/customers/customer-form";
import { CustomerStageBadge } from "@/components/admin/customers/customer-stage-badge";
import { PageHeader } from "@/components/admin/shared/page-header";
import { SupportModePageBanner } from "@/components/admin/shared/support-mode-page-banner";
import { AdminButton } from "@/components/ui/admin-button";
import { AdminCard } from "@/components/ui/admin-card";
import { getAdminSession } from "@/lib/auth/session";
import type { BookingRecord, CustomerPaymentRecord } from "@/lib/db/admin-repository";
import { getAdminRepository } from "@/lib/db/admin-repository";
import { getZohoCrmSyncStatus } from "@/lib/integrations/zoho-crm-sync";
import { requirePermission } from "@/lib/rbac/policies";
import { getTenantContext } from "@/lib/tenant/context";

type TabKey = "overview" | "bookings" | "payments" | "notes";

function money(value: number) {
  return (value / 100).toLocaleString("en-AU", {
    style: "currency",
    currency: "AUD",
  });
}

export default async function CustomerDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ customerId: string }> | { customerId: string };
  searchParams?:
    | Promise<Record<string, string | string[] | undefined>>
    | Record<string, string | string[] | undefined>;
}) {
  await requirePermission("customers:view");
  const session = await getAdminSession();
  const { customerId } = await Promise.resolve(params);
  const resolvedSearchParams = await Promise.resolve(searchParams ?? {});
  const tab = typeof resolvedSearchParams.tab === "string" ? resolvedSearchParams.tab : "overview";
  const activeTab: TabKey =
    tab === "bookings" || tab === "payments" || tab === "notes" ? tab : "overview";

  const tenant = await getTenantContext();
  const repository = getAdminRepository();
  const customer = await repository.getCustomerById(tenant.tenantId, customerId);

  if (!customer) {
    notFound();
  }

  const [bookings, payments, timeline] = await Promise.all([
    repository.listCustomerBookings(tenant.tenantId, customer.id),
    repository.listCustomerPayments(tenant.tenantId, customer.id),
    repository.listCustomerTimeline(tenant.tenantId, customer.id),
  ]);
  const crmSync = await getZohoCrmSyncStatus({
    tenantId: tenant.tenantId,
    entityType: "contact",
    localEntityId: customer.id,
  });
  const supportModeActive = Boolean(session.impersonation);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Step 5"
        title={customer.fullName}
        description="Customer detail now behaves like an operating record instead of a flat profile: overview, booking history, payment visibility, notes, and audit posture stay in one tenant-safe detail surface."
        actions={
          <div className="flex gap-3">
            <Link href="/admin/customers">
              <AdminButton variant="secondary">Back to customers</AdminButton>
            </Link>
            <form action={archiveCustomerAction.bind(null, customer.id)}>
              <AdminButton type="submit" variant="danger" disabled={supportModeActive}>
                Archive customer
              </AdminButton>
            </form>
          </div>
        }
      />
      <SupportModePageBanner
        scopeLabel="Customer detail"
        tenantPanel="overview"
        adminPath={`/admin/customers/${customer.id}`}
      />

      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard label="Lifecycle" value={customer.lifecycleStage.replace(/_/g, " ")} hint={customer.sourceLabel.replace(/_/g, " ")} />
        <MetricCard label="Bookings" value={String(customer.totalBookings)} hint={customer.lastBookedAt ? `Last booked ${customer.lastBookedAt.slice(0, 10)}` : "No completed booking yet"} />
        <MetricCard label="Revenue" value={money(customer.totalRevenueCents)} hint="Customer lifetime revenue." />
        <MetricCard label="Consent" value={customer.marketingConsent ? "Granted" : "Not granted"} hint={customer.email || customer.phone || "Missing primary contact info"} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_340px]">
        <div className="space-y-6">
          <AdminCard className="p-2">
            <div className="flex flex-wrap gap-2">
              {([
                ["overview", "Overview"],
                ["bookings", "Bookings"],
                ["payments", "Payments"],
                ["notes", "Notes & audit"],
              ] as Array<[TabKey, string]>).map(([value, label]) => (
                <Link key={value} href={`/admin/customers/${customer.id}?tab=${value}`}>
                  <AdminButton variant={activeTab === value ? "primary" : "ghost"}>
                    {label}
                  </AdminButton>
                </Link>
              ))}
            </div>
          </AdminCard>

          {activeTab === "overview" ? (
            <AdminCard className="p-6">
              <h2 className="text-lg font-semibold text-slate-950">Customer profile</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Save contact, lifecycle, source, tags, and notes from the same workspace used to review revenue and follow-up posture.
              </p>
              <div className="mt-6">
                <CustomerForm
                  action={updateCustomerAction.bind(null, customer.id)}
                  customer={customer}
                  submitLabel="Save customer"
                  disabled={supportModeActive}
                />
              </div>
            </AdminCard>
          ) : null}

          {activeTab === "bookings" ? (
            <AdminCard className="p-6">
              <h2 className="text-lg font-semibold text-slate-950">Booking history</h2>
              <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Service</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Start</th>
                      <th className="px-4 py-3">Revenue</th>
                      <th className="px-4 py-3">Channel</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {bookings.map((booking: BookingRecord) => (
                      <tr key={booking.id}>
                        <td className="px-4 py-4 font-medium text-slate-900">{booking.serviceName}</td>
                        <td className="px-4 py-4 text-slate-700">{booking.status.toLowerCase()}</td>
                        <td className="px-4 py-4 text-slate-700">{booking.startAt.slice(0, 16).replace("T", " ")}</td>
                        <td className="px-4 py-4 text-slate-700">{money(booking.revenueCents)}</td>
                        <td className="px-4 py-4 text-slate-700">{booking.channel}</td>
                      </tr>
                    ))}
                    {bookings.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-6 text-center text-slate-500">
                          No bookings linked to this customer yet.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </AdminCard>
          ) : null}

          {activeTab === "payments" ? (
            <AdminCard className="p-6">
              <h2 className="text-lg font-semibold text-slate-950">Payments</h2>
              <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Provider</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Method</th>
                      <th className="px-4 py-3">Paid at</th>
                      <th className="px-4 py-3">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {payments.map((payment: CustomerPaymentRecord) => (
                      <tr key={payment.id}>
                        <td className="px-4 py-4 font-medium text-slate-900">{payment.provider}</td>
                        <td className="px-4 py-4 text-slate-700">{payment.status}</td>
                        <td className="px-4 py-4 text-slate-700">{payment.paymentMethod || "unknown"}</td>
                        <td className="px-4 py-4 text-slate-700">
                          {payment.paidAt ? payment.paidAt.slice(0, 16).replace("T", " ") : "Unpaid"}
                        </td>
                        <td className="px-4 py-4 text-slate-700">{money(payment.amountCents)}</td>
                      </tr>
                    ))}
                    {payments.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-6 text-center text-slate-500">
                          No payment records linked to this customer yet.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </AdminCard>
          ) : null}

          {activeTab === "notes" ? (
            <AdminCard className="p-6">
              <h2 className="text-lg font-semibold text-slate-950">Notes and audit</h2>
              <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Notes summary
                </div>
                <p className="mt-3 text-sm leading-7 text-slate-700">
                  {customer.notes || "No notes recorded yet."}
                </p>
              </div>

              <div className="mt-6">
                <ActivityTimeline
                  items={timeline}
                  emptyMessage="No customer timeline events recorded yet."
                />
              </div>
            </AdminCard>
          ) : null}
        </div>

        <div className="space-y-6">
          <CrmSyncStatusCard
            description="Customer detail now exposes the Zoho CRM write-back posture directly in the admin workspace so operators can retry contact sync without leaving the revenue workspace."
            enabled={crmSync.enabled}
            record={crmSync.record}
            emptyMessage="No Zoho CRM sync record exists for this customer yet. Run a contact sync once the customer profile is ready."
            disabledMessage="PUBLIC_API_URL is not configured here yet, so the admin workspace cannot query Zoho CRM sync state from the backend bridge."
            actions={
              !crmSync.enabled ? null : crmSync.record ? (
                <form action={retryCustomerCrmSyncAction.bind(null, customer.id, crmSync.record.id)}>
                  <AdminButton type="submit" variant="secondary">
                    Retry Zoho sync
                  </AdminButton>
                </form>
              ) : (
                <form action={syncCustomerCrmContactAction.bind(null, customer.id)}>
                  <AdminButton type="submit" variant="secondary">
                    Sync to Zoho contact
                  </AdminButton>
                </form>
              )
            }
          />

          <AdminCard className="p-6">
            <h2 className="text-lg font-semibold text-slate-950">Customer health</h2>
            <div className="mt-4 space-y-4 text-sm text-slate-700">
              <div>
                <div className="font-semibold text-slate-950">Contact</div>
                <div className="mt-1">{customer.email || "No email"}</div>
                <div>{customer.phone || "No phone"}</div>
              </div>
              <div>
                <div className="font-semibold text-slate-950">Company</div>
                <div className="mt-1">{customer.company || "No company recorded"}</div>
              </div>
              <div>
                <div className="font-semibold text-slate-950">Lifecycle</div>
                <div className="mt-2">
                  <CustomerStageBadge stage={customer.lifecycleStage} />
                </div>
              </div>
              <div>
                <div className="font-semibold text-slate-950">Tags</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {customer.tags.length > 0 ? customer.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-600"
                    >
                      {tag}
                    </span>
                  )) : <span className="text-slate-500">No tags</span>}
                </div>
              </div>
            </div>
          </AdminCard>

          <AdminCard className="p-6">
            <h2 className="text-lg font-semibold text-slate-950">Revenue posture</h2>
            <div className="mt-4 space-y-3 text-sm text-slate-700">
              <div>Total bookings: {customer.totalBookings}</div>
              <div>Total revenue: {money(customer.totalRevenueCents)}</div>
              <div>Last booked: {customer.lastBookedAt ? customer.lastBookedAt.slice(0, 10) : "Not booked"}</div>
              <div>Created: {customer.createdAt.slice(0, 10)}</div>
              <div>Updated: {customer.updatedAt.slice(0, 10)}</div>
            </div>
          </AdminCard>
        </div>
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
      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
        {label}
      </div>
      <div className="mt-3 text-2xl font-semibold text-slate-950">{value}</div>
      <div className="mt-2 text-sm leading-6 text-slate-600">{hint}</div>
    </AdminCard>
  );
}
