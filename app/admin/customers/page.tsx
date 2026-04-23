import Link from "next/link";

import { archiveCustomerAction, createCustomerAction } from "@/app/admin/customers/actions";
import { CrmSyncBadge } from "@/components/admin/shared/crm-sync-badge";
import { CustomerForm } from "@/components/admin/customers/customer-form";
import { CustomerStageBadge } from "@/components/admin/customers/customer-stage-badge";
import { PageHeader } from "@/components/admin/shared/page-header";
import { SupportModePageBanner } from "@/components/admin/shared/support-mode-page-banner";
import { AdminButton } from "@/components/ui/admin-button";
import { AdminCard } from "@/components/ui/admin-card";
import { AdminInput } from "@/components/ui/admin-input";
import { getAdminSession } from "@/lib/auth/session";
import { getAdminRepository } from "@/lib/db/admin-repository";
import { getZohoCrmSyncStatus } from "@/lib/integrations/zoho-crm-sync";
import { requirePermission } from "@/lib/rbac/policies";
import { getTenantContext } from "@/lib/tenant/context";

type SearchParams =
  | Promise<Record<string, string | string[] | undefined>>
  | Record<string, string | string[] | undefined>;

function money(value: number) {
  return (value / 100).toLocaleString("en-AU", {
    style: "currency",
    currency: "AUD",
  });
}

export default async function CustomersPage({
  searchParams,
}: {
  searchParams?: SearchParams;
}) {
  await requirePermission("customers:view");
  const session = await getAdminSession();
  const params = await Promise.resolve(searchParams ?? {});
  const tenant = await getTenantContext();
  const repository = getAdminRepository();
  const page = Number(params.page ?? "1");
  const query = typeof params.q === "string" ? params.q : "";
  const lifecycleStage = typeof params.stage === "string" ? params.stage : "all";
  const source = typeof params.source === "string" ? params.source : "all";
  const dateFrom = typeof params.date_from === "string" ? params.date_from : "";
  const dateTo = typeof params.date_to === "string" ? params.date_to : "";
  const sortBy =
    typeof params.sort_by === "string" ? params.sort_by : "updatedAt";
  const sortOrder =
    typeof params.sort_order === "string" ? params.sort_order : "desc";

  const customers = await repository.listCustomers({
    tenantId: tenant.tenantId,
    page,
    pageSize: 8,
    query,
    lifecycleStage,
    source,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
    sortBy:
      sortBy === "createdAt" ||
      sortBy === "totalRevenueCents" ||
      sortBy === "lastBookedAt"
        ? sortBy
        : "updatedAt",
    sortOrder: sortOrder === "asc" ? "asc" : "desc",
  });

  const totalRevenue = customers.items.reduce((sum, customer) => sum + customer.totalRevenueCents, 0);
  const vipCount = customers.items.filter((customer) => customer.lifecycleStage === "vip").length;
  const atRiskCount = customers.items.filter((customer) => customer.lifecycleStage === "at_risk").length;
  const crmStatuses = await Promise.all(
    customers.items.map(async (customer) => ({
      customerId: customer.id,
      result: await getZohoCrmSyncStatus({
        tenantId: tenant.tenantId,
        entityType: "contact",
        localEntityId: customer.id,
      }),
    })),
  );
  const crmStatusByCustomerId = new Map(
    crmStatuses.map(({ customerId, result }) => [customerId, result.record?.sync_status || null]),
  );
  const supportModeActive = Boolean(session.impersonation);
  const baseQuery = new URLSearchParams({
    q: query,
    stage: lifecycleStage,
    source,
    date_from: dateFrom,
    date_to: dateTo,
    sort_by: sortBy,
    sort_order: sortOrder,
  });

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Step 5"
        title="Customers module"
        description="This customer workspace is now closer to a real revenue-ops console: search, filter, source tracking, lifecycle status, row actions, and soft-delete-safe detail flows all sit in one tenant-scoped operating surface."
      />
      <SupportModePageBanner
        scopeLabel="Customers module"
        tenantPanel="overview"
        adminPath="/admin/customers"
      />

      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard label="Visible customers" value={String(customers.total)} hint="Soft-deleted records are excluded." />
        <MetricCard label="VIP customers" value={String(vipCount)} hint="High-retention and high-value relationships." />
        <MetricCard label="At-risk customers" value={String(atRiskCount)} hint="Needs follow-up or recovery action." />
        <MetricCard label="Revenue in view" value={money(totalRevenue)} hint="Based on the current filtered result set." />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.7fr)_440px]">
        <AdminCard className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-950">Customer list</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Use lifecycle, source, date, and sorting controls to isolate recovery opportunities and repeat-revenue customers quickly.
              </p>
            </div>
          </div>

          <form
            className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-6"
            action="/admin/customers"
          >
            <AdminInput
              name="q"
              defaultValue={query}
              placeholder="Search customer, company, email, tags"
              className="xl:col-span-2"
            />
            <select
              name="stage"
              defaultValue={lifecycleStage}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900"
            >
              <option value="all">All stages</option>
              <option value="new">New</option>
              <option value="active">Active</option>
              <option value="vip">VIP</option>
              <option value="at_risk">At risk</option>
            </select>
            <select
              name="source"
              defaultValue={source}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900"
            >
              <option value="all">All sources</option>
              <option value="manual_entry">Manual entry</option>
              <option value="website_chat">Website chat</option>
              <option value="missed_call_recovery">Missed call recovery</option>
              <option value="instagram_campaign">Instagram campaign</option>
              <option value="referral">Referral</option>
            </select>
            <AdminInput name="date_from" type="date" defaultValue={dateFrom} />
            <AdminInput name="date_to" type="date" defaultValue={dateTo} />
            <select
              name="sort_by"
              defaultValue={sortBy}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900"
            >
              <option value="updatedAt">Sort by updated</option>
              <option value="createdAt">Sort by created</option>
              <option value="totalRevenueCents">Sort by revenue</option>
              <option value="lastBookedAt">Sort by last booked</option>
            </select>
            <select
              name="sort_order"
              defaultValue={sortOrder}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900"
            >
              <option value="desc">Descending</option>
              <option value="asc">Ascending</option>
            </select>
            <div className="flex gap-3 xl:col-span-2">
              <AdminButton type="submit" variant="secondary">
                Apply filters
              </AdminButton>
              <Link href="/admin/customers" className="inline-flex">
                <AdminButton type="button" variant="ghost">
                  Reset
                </AdminButton>
              </Link>
            </div>
          </form>

          <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                <tr>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Lifecycle</th>
                  <th className="px-4 py-3">Source</th>
                  <th className="px-4 py-3">Bookings</th>
                  <th className="px-4 py-3">Revenue</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {customers.items.map((customer) => (
                  <tr key={customer.id} className="align-top hover:bg-slate-50">
                    <td className="px-4 py-4">
                      <Link
                        href={`/admin/customers/${customer.id}`}
                        className="font-semibold text-slate-950 hover:underline"
                      >
                        {customer.fullName}
                      </Link>
                      <div className="mt-1 text-slate-600">
                        {customer.company || customer.email || "No company or email"}
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <CrmSyncBadge status={crmStatusByCustomerId.get(customer.id)} />
                        {customer.tags.map((tag) => (
                          <span
                            key={tag}
                            className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-600"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <CustomerStageBadge stage={customer.lifecycleStage} />
                    </td>
                    <td className="px-4 py-4 text-slate-700">
                      {customer.sourceLabel.replace(/_/g, " ")}
                    </td>
                    <td className="px-4 py-4 text-slate-700">{customer.totalBookings}</td>
                    <td className="px-4 py-4 text-slate-700">{money(customer.totalRevenueCents)}</td>
                    <td className="px-4 py-4">
                      <div className="flex flex-col items-start gap-2">
                        <Link href={`/admin/customers/${customer.id}`}>
                          <AdminButton variant="secondary">View</AdminButton>
                        </Link>
                        <Link href={`/admin/customers/${customer.id}?tab=overview`}>
                          <AdminButton variant="ghost">Edit</AdminButton>
                        </Link>
                        <form action={archiveCustomerAction.bind(null, customer.id)}>
                          <AdminButton type="submit" variant="danger" disabled={supportModeActive}>
                            Archive
                          </AdminButton>
                        </form>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex items-center justify-between text-sm text-slate-600">
            <div>
              Page {customers.page} of {customers.totalPages} • {customers.total} customers
            </div>
            <div className="flex gap-2">
              <Link
                href={`/admin/customers?page=${Math.max(customers.page - 1, 1)}&${baseQuery.toString()}`}
              >
                <AdminButton variant="secondary" disabled={customers.page <= 1}>
                  Previous
                </AdminButton>
              </Link>
              <Link
                href={`/admin/customers?page=${Math.min(customers.page + 1, customers.totalPages)}&${baseQuery.toString()}`}
              >
                <AdminButton
                  variant="secondary"
                  disabled={customers.page >= customers.totalPages}
                >
                  Next
                </AdminButton>
              </Link>
            </div>
          </div>
        </AdminCard>

        <AdminCard className="p-6">
          <h2 className="text-lg font-semibold text-slate-950">Create customer</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            New customers are created inside the active tenant, tagged at entry, and ready to connect into leads, bookings, and payment history.
          </p>
          <div className="mt-6">
            <CustomerForm
              action={createCustomerAction}
              submitLabel="Create customer"
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
      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
        {label}
      </div>
      <div className="mt-3 text-2xl font-semibold text-slate-950">{value}</div>
      <div className="mt-2 text-sm leading-6 text-slate-600">{hint}</div>
    </AdminCard>
  );
}
