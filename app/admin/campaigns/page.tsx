import Link from "next/link";

import {
  archiveCampaignAction,
  createCampaignAction,
  updateCampaignAction,
} from "@/app/admin/campaigns/actions";
import { CampaignForm } from "@/components/admin/campaigns/campaign-form";
import { PageHeader } from "@/components/admin/shared/page-header";
import { SupportModePageBanner } from "@/components/admin/shared/support-mode-page-banner";
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

function money(value: number) {
  return (value / 100).toLocaleString("en-AU", {
    style: "currency",
    currency: "AUD",
  });
}

export default async function CampaignsPage({
  searchParams,
}: {
  searchParams?: SearchParams;
}) {
  await requirePermission("campaigns:view");
  const session = await getAdminSession();
  const params = await Promise.resolve(searchParams ?? {});
  const tenant = await getTenantContext();
  const repository = getAdminRepository();
  const page = Number(params.page ?? "1");
  const query = typeof params.q === "string" ? params.q : "";
  const status = typeof params.status === "string" ? params.status : "all";
  const channel = typeof params.channel === "string" ? params.channel : "all";
  const sortBy =
    typeof params.sort_by === "string" ? params.sort_by : "updatedAt";
  const sortOrder =
    typeof params.sort_order === "string" ? params.sort_order : "desc";
  const editId = typeof params.edit === "string" ? params.edit : "";

  const campaigns = await repository.listCampaigns({
    tenantId: tenant.tenantId,
    page,
    pageSize: 8,
    query,
    status,
    channel,
    sortBy:
      sortBy === "startDate" || sortBy === "budgetCents" || sortBy === "paidRevenueCents"
        ? sortBy
        : "updatedAt",
    sortOrder: sortOrder === "asc" ? "asc" : "desc",
  });
  const editingCampaign = editId ? await repository.getCampaignById(tenant.tenantId, editId) : null;
  const supportModeActive = Boolean(session.impersonation);
  const baseQuery = new URLSearchParams({
    q: query,
    status,
    channel,
    sort_by: sortBy,
    sort_order: sortOrder,
  });

  const totals = campaigns.items.reduce(
    (summary, campaign) => {
      summary.budgetCents += campaign.budgetCents;
      summary.paidRevenueCents += campaign.paidRevenueCents;
      summary.sourcedLeads += campaign.sourcedLeads;
      return summary;
    },
    { budgetCents: 0, paidRevenueCents: 0, sourcedLeads: 0 },
  );

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Phase 7"
        title="Campaigns workspace"
        description="Phase 7 starts with campaigns because they connect acquisition effort straight into leads, bookings, and paid revenue. This slice keeps the workflow light but already ties campaigns to the source keys your reporting stack understands."
      />
      <SupportModePageBanner
        scopeLabel="Campaigns workspace"
        tenantPanel="integrations"
        adminPath="/admin/campaigns"
      />

      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard label="Campaigns in view" value={String(campaigns.total)} hint="Filtered campaign rows for the active tenant scope." />
        <MetricCard label="Active budget" value={money(totals.budgetCents)} hint="Budget for the current filtered set." />
        <MetricCard label="Attributed leads" value={String(totals.sourcedLeads)} hint="Lead count inferred from each campaign source key." />
        <MetricCard label="Paid revenue" value={money(totals.paidRevenueCents)} hint="Paid revenue from customers sourced by these campaigns." />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_440px]">
        <AdminCard className="p-6">
          <div>
            <h2 className="text-lg font-semibold text-slate-950">Campaign ledger</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Treat this as the acquisition control layer: define the campaign once, keep the source key clean, then let reports and revenue views stitch the commercial outcome back together.
            </p>
          </div>

          <form className="mt-6 grid gap-3 md:grid-cols-5" action="/admin/campaigns">
            <AdminInput
              name="q"
              defaultValue={query}
              placeholder="Search campaign or source key"
              className="md:col-span-2"
            />
            <select
              name="status"
              defaultValue={status}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900"
            >
              <option value="all">All statuses</option>
              <option value="DRAFT">Draft</option>
              <option value="ACTIVE">Active</option>
              <option value="PAUSED">Paused</option>
              <option value="COMPLETED">Completed</option>
              <option value="ARCHIVED">Archived</option>
            </select>
            <select
              name="channel"
              defaultValue={channel}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900"
            >
              <option value="all">All channels</option>
              <option value="paid_social">Paid social</option>
              <option value="ops_reactivation">Ops reactivation</option>
              <option value="email">Email</option>
              <option value="referral">Referral</option>
              <option value="organic">Organic</option>
            </select>
            <select
              name="sort_by"
              defaultValue={sortBy}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900"
            >
              <option value="updatedAt">Sort by updated</option>
              <option value="startDate">Sort by start date</option>
              <option value="budgetCents">Sort by budget</option>
              <option value="paidRevenueCents">Sort by paid revenue</option>
            </select>
            <select
              name="sort_order"
              defaultValue={sortOrder}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900"
            >
              <option value="desc">Descending</option>
              <option value="asc">Ascending</option>
            </select>
            <div className="flex gap-3 md:col-span-5">
              <AdminButton type="submit" variant="secondary">Apply</AdminButton>
              <Link href="/admin/campaigns" className="inline-flex">
                <AdminButton type="button" variant="ghost">Reset</AdminButton>
              </Link>
            </div>
          </form>

          <div className="mt-6 space-y-4">
            {campaigns.items.map((campaign) => (
              <div key={campaign.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="text-lg font-semibold text-slate-950">{campaign.name}</div>
                      <span className="rounded-full bg-slate-900 px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-white">
                        {campaign.status}
                      </span>
                    </div>
                    <div className="text-sm text-slate-600">
                      {campaign.channel} • {campaign.sourcePlatform} • source key <span className="font-medium text-slate-900">{campaign.sourceKey}</span>
                    </div>
                    <div className="grid gap-2 text-sm text-slate-700 md:grid-cols-4">
                      <div>Budget: <span className="font-semibold text-slate-950">{money(campaign.budgetCents)}</span></div>
                      <div>Leads: <span className="font-semibold text-slate-950">{campaign.sourcedLeads}</span></div>
                      <div>Bookings: <span className="font-semibold text-slate-950">{campaign.bookingsCount}</span></div>
                      <div>Paid revenue: <span className="font-semibold text-slate-950">{money(campaign.paidRevenueCents)}</span></div>
                    </div>
                    {campaign.notes ? (
                      <div className="text-sm leading-6 text-slate-600">{campaign.notes}</div>
                    ) : null}
                  </div>
                  <div className="flex gap-2">
                    <Link href={`/admin/campaigns?edit=${campaign.id}`}>
                      <AdminButton variant="secondary">Edit</AdminButton>
                    </Link>
                    <form action={archiveCampaignAction.bind(null, campaign.id)}>
                      <AdminButton type="submit" variant="danger" disabled={supportModeActive}>Archive</AdminButton>
                    </form>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 flex items-center justify-between text-sm text-slate-600">
            <div>
              Page {campaigns.page} of {campaigns.totalPages} • {campaigns.total} campaigns
            </div>
            <div className="flex gap-2">
              <Link href={`/admin/campaigns?page=${Math.max(campaigns.page - 1, 1)}&${baseQuery.toString()}`}>
                <AdminButton variant="secondary" disabled={campaigns.page <= 1}>Previous</AdminButton>
              </Link>
              <Link href={`/admin/campaigns?page=${Math.min(campaigns.page + 1, campaigns.totalPages)}&${baseQuery.toString()}`}>
                <AdminButton variant="secondary" disabled={campaigns.page >= campaigns.totalPages}>Next</AdminButton>
              </Link>
            </div>
          </div>
        </AdminCard>

        <AdminCard className="p-6">
          <h2 className="text-lg font-semibold text-slate-950">
            {editingCampaign ? "Edit campaign" : "Create campaign"}
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Keep the source key consistent with leads and customers so attribution can stay queryable across the workspace.
          </p>
          <div className="mt-6">
            <CampaignForm
              action={
                editingCampaign
                  ? updateCampaignAction.bind(null, editingCampaign.id)
                  : createCampaignAction
              }
              campaign={editingCampaign}
              submitLabel={editingCampaign ? "Save campaign" : "Create campaign"}
              disabled={supportModeActive}
            />
          </div>
          {editingCampaign ? (
            <div className="mt-4">
              <Link href="/admin/campaigns">
                <AdminButton variant="ghost">Clear selection</AdminButton>
              </Link>
            </div>
          ) : null}
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
