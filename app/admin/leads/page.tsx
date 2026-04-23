import Link from "next/link";

import {
  archiveLeadAction,
  convertLeadToBookingAction,
  convertLeadToCustomerAction,
  createLeadAction,
  updateLeadAction,
} from "@/app/admin/leads/actions";
import { CrmSyncBadge } from "@/components/admin/shared/crm-sync-badge";
import { LeadForm } from "@/components/admin/leads/lead-form";
import { LeadStageBadge } from "@/components/admin/leads/lead-stage-badge";
import { PageHeader } from "@/components/admin/shared/page-header";
import { SupportModePageBanner } from "@/components/admin/shared/support-mode-page-banner";
import { AdminButton } from "@/components/ui/admin-button";
import { AdminCard } from "@/components/ui/admin-card";
import { AdminInput } from "@/components/ui/admin-input";
import { getAdminSession } from "@/lib/auth/session";
import {
  getAdminRepository,
  type LeadRecord,
  type ServiceRecord,
} from "@/lib/db/admin-repository";
import { getZohoCrmSyncStatus } from "@/lib/integrations/zoho-crm-sync";
import { requirePermission } from "@/lib/rbac/policies";
import { getTenantContext } from "@/lib/tenant/context";

type SearchParams =
  | Promise<Record<string, string | string[] | undefined>>
  | Record<string, string | string[] | undefined>;

const pipelineColumns = [
  { key: "captured", label: "Captured" },
  { key: "qualified", label: "Qualified" },
  { key: "follow_up", label: "Follow up" },
  { key: "proposal", label: "Proposal" },
  { key: "booked", label: "Booked" },
] as const;

function money(value: number) {
  return (value / 100).toLocaleString("en-AU", {
    style: "currency",
    currency: "AUD",
  });
}

export default async function LeadsPage({
  searchParams,
}: {
  searchParams?: SearchParams;
}) {
  await requirePermission("leads:view");
  const session = await getAdminSession();
  const params = await Promise.resolve(searchParams ?? {});
  const tenant = await getTenantContext();
  const repository = getAdminRepository();
  const page = Number(params.page ?? "1");
  const query = typeof params.q === "string" ? params.q : "";
  const status = typeof params.status === "string" ? params.status : "all";
  const pipelineStage =
    typeof params.pipeline_stage === "string" ? params.pipeline_stage : "all";
  const owner = typeof params.owner === "string" ? params.owner : "all";
  const view = typeof params.view === "string" ? params.view : "list";
  const sortBy =
    typeof params.sort_by === "string" ? params.sort_by : "updatedAt";
  const sortOrder =
    typeof params.sort_order === "string" ? params.sort_order : "desc";

  const [leads, services] = await Promise.all([
    repository.listLeads({
      tenantId: tenant.tenantId,
      page,
      pageSize: 8,
      query,
      status,
      pipelineStage,
      owner,
      sortBy:
        sortBy === "createdAt" ||
        sortBy === "estimatedValueCents" ||
        sortBy === "nextFollowUpAt"
          ? sortBy
          : "updatedAt",
      sortOrder: sortOrder === "asc" ? "asc" : "desc",
    }),
    repository.listServices({
      tenantId: tenant.tenantId,
      page: 1,
      pageSize: 100,
    }),
  ]);

  const totalPipeline = leads.items.reduce((sum, lead) => sum + lead.estimatedValueCents, 0);
  const overdueFollowUps = leads.items.filter(
    (lead) => lead.nextFollowUpAt && lead.nextFollowUpAt < new Date().toISOString(),
  ).length;
  const crmStatuses = await Promise.all(
    leads.items.map(async (lead) => ({
      leadId: lead.id,
      result: await getZohoCrmSyncStatus({
        tenantId: tenant.tenantId,
        entityType: "lead",
        localEntityId: lead.id,
      }),
    })),
  );
  const crmStatusByLeadId = new Map(
    crmStatuses.map(({ leadId, result }) => [leadId, result.record?.sync_status || null]),
  );
  const supportModeActive = Boolean(session.impersonation);
  const baseQuery = new URLSearchParams({
    q: query,
    status,
    pipeline_stage: pipelineStage,
    owner,
    view,
    sort_by: sortBy,
    sort_order: sortOrder,
  });

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Step 6"
        title="Leads module"
        description="Leads now works as the revenue-capture workspace: pipeline stages, owner assignment, follow-up scheduling, and conversion into customers or bookings all sit in one tenant-scoped surface."
      />
      <SupportModePageBanner
        scopeLabel="Leads module"
        tenantPanel="overview"
        adminPath="/admin/leads"
      />

      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard label="Leads in view" value={String(leads.total)} hint="Filtered and paginated lead set." />
        <MetricCard label="Pipeline value" value={money(totalPipeline)} hint="Visible revenue opportunity in the current result set." />
        <MetricCard label="Overdue follow-ups" value={String(overdueFollowUps)} hint="Follow-up date is behind current UTC time." />
        <MetricCard
          label="Booked stage"
          value={String(leads.items.filter((lead) => lead.pipelineStage === "booked").length)}
          hint="Leads already pushed into booking-ready posture."
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.75fr)_420px]">
        <AdminCard className="p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-950">Pipeline workspace</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Switch between tabular triage and kanban movement. Each lead card can be reassigned, rescheduled, and converted without leaving the workspace.
              </p>
            </div>
            <div className="flex gap-2">
              <Link href={`/admin/leads?${new URLSearchParams({ ...Object.fromEntries(baseQuery), view: "list" }).toString()}`}>
                <AdminButton variant={view === "kanban" ? "ghost" : "primary"}>List view</AdminButton>
              </Link>
              <Link href={`/admin/leads?${new URLSearchParams({ ...Object.fromEntries(baseQuery), view: "kanban" }).toString()}`}>
                <AdminButton variant={view === "kanban" ? "primary" : "ghost"}>Kanban board</AdminButton>
              </Link>
            </div>
          </div>

          <form className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-6" action="/admin/leads">
            <AdminInput
              name="q"
              defaultValue={query}
              placeholder="Search title, source, owner, customer"
              className="xl:col-span-2"
            />
            <select
              name="status"
              defaultValue={status}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900"
            >
              <option value="all">All statuses</option>
              <option value="NEW">NEW</option>
              <option value="QUALIFIED">QUALIFIED</option>
              <option value="CONTACTED">CONTACTED</option>
              <option value="PROPOSAL_SENT">PROPOSAL_SENT</option>
              <option value="WON">WON</option>
              <option value="LOST">LOST</option>
            </select>
            <select
              name="pipeline_stage"
              defaultValue={pipelineStage}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900"
            >
              <option value="all">All stages</option>
              {pipelineColumns.map((column) => (
                <option key={column.key} value={column.key}>
                  {column.label}
                </option>
              ))}
            </select>
            <select
              name="owner"
              defaultValue={owner}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900"
            >
              <option value="all">All owners</option>
              <option value="BookedAI SDR">BookedAI SDR</option>
              <option value="Amy Tran">Amy Tran</option>
              <option value="BookedAI Operator">BookedAI Operator</option>
            </select>
            <select
              name="sort_by"
              defaultValue={sortBy}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900"
            >
              <option value="updatedAt">Sort by updated</option>
              <option value="createdAt">Sort by created</option>
              <option value="estimatedValueCents">Sort by value</option>
              <option value="nextFollowUpAt">Sort by follow-up</option>
            </select>
            <select
              name="sort_order"
              defaultValue={sortOrder}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900"
            >
              <option value="desc">Descending</option>
              <option value="asc">Ascending</option>
            </select>
            <input type="hidden" name="view" value={view} />
            <div className="flex gap-3 xl:col-span-2">
              <AdminButton type="submit" variant="secondary">Apply filters</AdminButton>
              <Link href="/admin/leads" className="inline-flex">
                <AdminButton type="button" variant="ghost">Reset</AdminButton>
              </Link>
            </div>
          </form>

          {view === "kanban" ? (
            <div className="mt-6 grid gap-4 xl:grid-cols-5">
              {pipelineColumns.map((column) => {
                const columnLeads = leads.items.filter((lead) => lead.pipelineStage === column.key);
                return (
                  <div key={column.key} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
                        {column.label}
                      </h3>
                      <span className="rounded-full bg-white px-2 py-1 text-xs font-semibold text-slate-600">
                        {columnLeads.length}
                      </span>
                    </div>
                    <div className="mt-4 space-y-4">
                      {columnLeads.map((lead) => (
                        <LeadCard
                          key={lead.id}
                          lead={lead}
                          services={services.items}
                          crmStatus={crmStatusByLeadId.get(lead.id)}
                        />
                      ))}
                      {columnLeads.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-500">
                          No leads in this stage.
                        </div>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Lead</th>
                    <th className="px-4 py-3">Pipeline</th>
                    <th className="px-4 py-3">Owner</th>
                    <th className="px-4 py-3">Follow-up</th>
                    <th className="px-4 py-3">Value</th>
                    <th className="px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {leads.items.map((lead) => (
                    <tr key={lead.id} className="align-top hover:bg-slate-50">
                      <td className="px-4 py-4">
                        <Link
                          href={`/admin/leads/${lead.id}`}
                          className="font-semibold text-slate-950 hover:underline"
                        >
                          {lead.title}
                        </Link>
                        <div className="mt-1 text-slate-600">
                          {lead.customerName || lead.source.replace(/_/g, " ")}
                        </div>
                        <div className="mt-2">
                          <CrmSyncBadge status={crmStatusByLeadId.get(lead.id)} />
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <LeadStageBadge status={lead.status} pipelineStage={lead.pipelineStage} />
                      </td>
                      <td className="px-4 py-4 text-slate-700">{lead.ownerName || "Unassigned"}</td>
                      <td className="px-4 py-4 text-slate-700">
                        {lead.nextFollowUpAt ? lead.nextFollowUpAt.slice(0, 16).replace("T", " ") : "Not set"}
                      </td>
                      <td className="px-4 py-4 text-slate-700">{money(lead.estimatedValueCents)}</td>
                      <td className="px-4 py-4">
                        <LeadRowActions lead={lead} services={services.items} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="mt-4 flex items-center justify-between text-sm text-slate-600">
            <div>
              Page {leads.page} of {leads.totalPages} • {leads.total} leads
            </div>
            <div className="flex gap-2">
              <Link href={`/admin/leads?page=${Math.max(leads.page - 1, 1)}&${baseQuery.toString()}`}>
                <AdminButton variant="secondary" disabled={leads.page <= 1}>Previous</AdminButton>
              </Link>
              <Link href={`/admin/leads?page=${Math.min(leads.page + 1, leads.totalPages)}&${baseQuery.toString()}`}>
                <AdminButton variant="secondary" disabled={leads.page >= leads.totalPages}>Next</AdminButton>
              </Link>
            </div>
          </div>
        </AdminCard>

        <AdminCard className="p-6">
          <h2 className="text-lg font-semibold text-slate-950">Create lead</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            New leads enter the pipeline with owner, stage, score, and follow-up timing so operators can push demand quickly into customer or booking conversion.
          </p>
          <div className="mt-6">
            <LeadForm
              action={createLeadAction}
              submitLabel="Create lead"
              disabled={supportModeActive}
            />
          </div>
        </AdminCard>
      </div>
    </div>
  );
}

function LeadCard({
  lead,
  services,
  crmStatus,
}: {
  lead: LeadRecord;
  services: ServiceRecord[];
  crmStatus?: string | null;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <Link
        href={`/admin/leads/${lead.id}`}
        className="text-sm font-semibold text-slate-950 hover:underline"
      >
        {lead.title}
      </Link>
      <div className="mt-2 text-xs text-slate-500">
        {lead.customerName || lead.source.replace(/_/g, " ")}
      </div>
      <div className="mt-3">
        <CrmSyncBadge status={crmStatus} />
      </div>
      <div className="mt-3">
        <LeadStageBadge status={lead.status} pipelineStage={lead.pipelineStage} />
      </div>
      <div className="mt-3 text-sm text-slate-700">
        Owner: {lead.ownerName || "Unassigned"}
      </div>
      <div className="mt-1 text-sm text-slate-700">
        Follow-up: {lead.nextFollowUpAt ? lead.nextFollowUpAt.slice(0, 16).replace("T", " ") : "Not set"}
      </div>
      <div className="mt-1 text-sm text-slate-700">Value: {money(lead.estimatedValueCents)}</div>
      <div className="mt-4">
        <LeadRowActions lead={lead} services={services} compact />
      </div>
    </div>
  );
}

function LeadRowActions({
  lead,
  services,
  compact = false,
}: {
  lead: {
    id: string;
    title: string;
    source: string;
    status: string;
    pipelineStage: string;
    score: number;
    estimatedValueCents: number;
    ownerName?: string;
    nextFollowUpAt?: string;
    lastContactAt?: string;
    notes?: string;
  };
  services: Array<{ id: string; name: string }>;
  compact?: boolean;
}) {
  return (
    <div className={compact ? "space-y-3" : "min-w-[280px] space-y-3"}>
      <form action={updateLeadAction.bind(null, lead.id)} className="space-y-3">
        <input type="hidden" name="title" value={lead.title} />
        <input type="hidden" name="source" value={lead.source} />
        <input type="hidden" name="score" value={String(lead.score)} />
        <input type="hidden" name="estimatedValueCents" value={String(lead.estimatedValueCents)} />
        <input type="hidden" name="notes" value={lead.notes ?? ""} />
        <input type="hidden" name="lastContactAt" value={lead.lastContactAt?.slice(0, 16) ?? ""} />
        <div className="grid gap-2 md:grid-cols-2">
          <select
            name="pipelineStage"
            defaultValue={lead.pipelineStage}
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900"
          >
            {pipelineColumns.map((column) => (
              <option key={column.key} value={column.key}>
                {column.label}
              </option>
            ))}
          </select>
          <select
            name="status"
            defaultValue={lead.status}
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900"
          >
            <option value="NEW">NEW</option>
            <option value="QUALIFIED">QUALIFIED</option>
            <option value="CONTACTED">CONTACTED</option>
            <option value="PROPOSAL_SENT">PROPOSAL_SENT</option>
            <option value="WON">WON</option>
            <option value="LOST">LOST</option>
          </select>
        </div>
        <AdminInput name="ownerName" defaultValue={lead.ownerName} placeholder="Assign owner" />
        <AdminInput name="nextFollowUpAt" type="datetime-local" defaultValue={lead.nextFollowUpAt?.slice(0, 16)} />
        <AdminButton type="submit" variant="secondary">Update lead</AdminButton>
      </form>

      <div className="flex flex-wrap gap-2">
        <form action={convertLeadToCustomerAction.bind(null, lead.id)}>
          <AdminButton type="submit" variant="ghost">Convert to customer</AdminButton>
        </form>
        <form action={archiveLeadAction.bind(null, lead.id)}>
          <AdminButton type="submit" variant="danger">Archive</AdminButton>
        </form>
      </div>

      <form action={convertLeadToBookingAction.bind(null, lead.id)} className="space-y-2">
        <select
          name="serviceId"
          defaultValue={services[0]?.id}
          className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900"
        >
          {services.map((service) => (
            <option key={service.id} value={service.id}>
              {service.name}
            </option>
          ))}
        </select>
        <AdminButton type="submit">Convert to booking</AdminButton>
      </form>
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
