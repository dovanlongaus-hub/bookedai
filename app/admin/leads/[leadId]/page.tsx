import Link from "next/link";
import { notFound } from "next/navigation";

import {
  addLeadNoteAction,
  archiveLeadAction,
  convertLeadToBookingAction,
  convertLeadToCustomerAction,
  retryLeadCrmSyncAction,
  scheduleLeadFollowUpAction,
  updateLeadAction,
} from "@/app/admin/leads/actions";
import { LeadForm } from "@/components/admin/leads/lead-form";
import { LeadStageBadge } from "@/components/admin/leads/lead-stage-badge";
import { ActivityTimeline } from "@/components/admin/shared/activity-timeline";
import { CrmSyncStatusCard } from "@/components/admin/shared/crm-sync-status-card";
import { PageHeader } from "@/components/admin/shared/page-header";
import { SupportModePageBanner } from "@/components/admin/shared/support-mode-page-banner";
import { AdminButton } from "@/components/ui/admin-button";
import { AdminCard } from "@/components/ui/admin-card";
import { AdminInput, AdminTextarea } from "@/components/ui/admin-input";
import { getAdminSession } from "@/lib/auth/session";
import { getAdminRepository } from "@/lib/db/admin-repository";
import { getZohoCrmSyncStatus } from "@/lib/integrations/zoho-crm-sync";
import { requirePermission } from "@/lib/rbac/policies";
import { getTenantContext } from "@/lib/tenant/context";

function money(value: number) {
  return (value / 100).toLocaleString("en-AU", {
    style: "currency",
    currency: "AUD",
  });
}

export default async function LeadDetailPage({
  params,
}: {
  params: Promise<{ leadId: string }> | { leadId: string };
}) {
  await requirePermission("leads:view");
  const session = await getAdminSession();
  const { leadId } = await Promise.resolve(params);
  const tenant = await getTenantContext();
  const repository = getAdminRepository();
  const [lead, services, timeline] = await Promise.all([
    repository.getLeadById(tenant.tenantId, leadId),
    repository.listServices({ tenantId: tenant.tenantId, page: 1, pageSize: 100 }),
    repository.listLeadTimeline(tenant.tenantId, leadId),
  ]);

  if (!lead) {
    notFound();
  }

  const crmSync = await getZohoCrmSyncStatus({
    tenantId: tenant.tenantId,
    entityType: "lead",
    localEntityId: lead.id,
  });
  const supportModeActive = Boolean(session.impersonation);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Phase 4"
        title={lead.title}
        description="Lead detail now behaves like an operational follow-up workspace: edit qualification, owner, notes, and follow-up timing while keeping a single timeline of capture, contact, and conversion events."
        actions={
          <div className="flex flex-wrap gap-3">
            <Link href="/admin/leads">
              <AdminButton variant="secondary">Back to leads</AdminButton>
            </Link>
            <form action={convertLeadToCustomerAction.bind(null, lead.id)}>
              <AdminButton type="submit" variant="secondary" disabled={supportModeActive}>Convert to customer</AdminButton>
            </form>
            <form action={archiveLeadAction.bind(null, lead.id)}>
              <AdminButton type="submit" variant="danger" disabled={supportModeActive}>Archive lead</AdminButton>
            </form>
          </div>
        }
      />
      <SupportModePageBanner
        scopeLabel="Lead detail"
        tenantPanel="overview"
        adminPath={`/admin/leads/${lead.id}`}
      />

      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard label="Pipeline stage" value={lead.pipelineStage.replace(/_/g, " ")} hint={lead.status} />
        <MetricCard label="Owner" value={lead.ownerName || "Unassigned"} hint={lead.customerName || lead.source.replace(/_/g, " ")} />
        <MetricCard label="Follow-up" value={lead.nextFollowUpAt ? lead.nextFollowUpAt.slice(0, 10) : "Not set"} hint={lead.lastContactAt ? `Last contact ${lead.lastContactAt.slice(0, 10)}` : "No contact logged"} />
        <MetricCard label="Estimated value" value={money(lead.estimatedValueCents)} hint={`Score ${lead.score}`} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <AdminCard className="p-6">
          <h2 className="text-lg font-semibold text-slate-950">Lead workspace</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Update qualification, ownership, notes, and follow-up timing from the same surface used to trigger conversion into customer or booking.
          </p>
          <div className="mt-6">
            <LeadForm
              action={updateLeadAction.bind(null, lead.id)}
              lead={lead}
              submitLabel="Save lead"
              disabled={supportModeActive}
            />
          </div>

          <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <div className="text-sm font-semibold text-slate-950">Convert to booking</div>
            <div className="mt-2 text-sm text-slate-600">
              Push the lead into revenue by creating a booking from the currently selected service.
            </div>
            <form action={convertLeadToBookingAction.bind(null, lead.id)} className="mt-4 flex flex-col gap-3 md:flex-row">
              <fieldset disabled={supportModeActive} className="contents">
              <select
                name="serviceId"
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900"
                defaultValue=""
              >
                <option value="" disabled>
                  Select service
                </option>
                {services.items.map((service) => (
                  <option key={service.id} value={service.id}>
                    {service.name}
                  </option>
                ))}
              </select>
              <AdminButton type="submit">Convert to booking</AdminButton>
              </fieldset>
            </form>
          </div>
        </AdminCard>

        <div className="space-y-6">
          <CrmSyncStatusCard
            title="Zoho CRM lead sync"
            description="Lead sync status is visible here so operators can see whether a lifecycle-captured lead already exists in Zoho and replay the last write-back when the provider fails."
            enabled={crmSync.enabled}
            record={crmSync.record}
            emptyMessage="No Zoho CRM sync record exists for this lead yet. In the current admin lane, lead sync is usually created by lifecycle capture or after conversion into a customer contact."
            disabledMessage="PUBLIC_API_URL is not configured here yet, so the admin workspace cannot query Zoho CRM sync state from the backend bridge."
            actions={
              !crmSync.enabled || !crmSync.record ? null : (
                <form action={retryLeadCrmSyncAction.bind(null, lead.id, crmSync.record.id)}>
                  <AdminButton type="submit" variant="secondary" disabled={supportModeActive}>
                    Retry Zoho sync
                  </AdminButton>
                </form>
              )
            }
          />

          <AdminCard className="p-6">
            <h2 className="text-lg font-semibold text-slate-950">Lead posture</h2>
            <div className="mt-4 space-y-4 text-sm text-slate-700">
              <div>
                <div className="font-semibold text-slate-950">Customer link</div>
                <div className="mt-1">{lead.customerName || "No customer linked yet"}</div>
              </div>
              <div>
                <div className="font-semibold text-slate-950">Status</div>
                <div className="mt-2">
                  <LeadStageBadge status={lead.status} pipelineStage={lead.pipelineStage} />
                </div>
              </div>
              <div>
                <div className="font-semibold text-slate-950">Notes</div>
                <div className="mt-1">{lead.notes || "No notes recorded yet"}</div>
              </div>
            </div>
          </AdminCard>

          <AdminCard className="p-6">
            <h2 className="text-lg font-semibold text-slate-950">Quick actions</h2>
            <div className="mt-4 space-y-6">
              <form action={addLeadNoteAction.bind(null, lead.id)} className="space-y-3">
                <fieldset disabled={supportModeActive} className="space-y-3">
                <div className="text-sm font-semibold text-slate-950">Add note</div>
                <AdminTextarea name="note" rows={4} placeholder="Log the latest customer conversation, objection, or next-step detail." />
                <AdminInput name="contactAt" type="datetime-local" defaultValue={new Date().toISOString().slice(0, 16)} />
                <AdminButton type="submit" variant="secondary">Save note</AdminButton>
                </fieldset>
              </form>

              <form action={scheduleLeadFollowUpAction.bind(null, lead.id)} className="space-y-3">
                <fieldset disabled={supportModeActive} className="space-y-3">
                <div className="text-sm font-semibold text-slate-950">Schedule follow-up</div>
                <AdminInput
                  name="nextFollowUpAt"
                  type="datetime-local"
                  defaultValue={lead.nextFollowUpAt?.slice(0, 16)}
                />
                <AdminInput
                  name="ownerName"
                  placeholder="Owner"
                  defaultValue={lead.ownerName}
                />
                <AdminTextarea
                  name="note"
                  rows={3}
                  placeholder="Optional note for the follow-up handoff."
                />
                <AdminButton type="submit">Save follow-up</AdminButton>
                </fieldset>
              </form>
            </div>
          </AdminCard>

          <AdminCard className="p-6">
            <h2 className="text-lg font-semibold text-slate-950">Follow-up timeline</h2>
            <div className="mt-4">
              <ActivityTimeline
                items={timeline}
                emptyMessage="No lead timeline events recorded yet."
              />
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
      <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
        {label}
      </div>
      <div className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">{value}</div>
      <div className="mt-2 text-sm leading-6 text-slate-600">{hint}</div>
    </AdminCard>
  );
}
