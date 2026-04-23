import { endTenantSupportModeAction, startTenantSupportModeAction } from "@/app/admin/tenants/actions";
import { PageHeader } from "@/components/admin/shared/page-header";
import { InvestigationTimelineCard, type InvestigationTimelineCardItem } from "@/components/admin/tenants/investigation-timeline-card";
import { AdminBadge } from "@/components/ui/admin-badge";
import { AdminButton } from "@/components/ui/admin-button";
import { AdminCard } from "@/components/ui/admin-card";
import { getAdminRepository } from "@/lib/db/admin-repository";
import { requirePermission } from "@/lib/rbac/policies";
import { getAdminSession } from "@/lib/auth/session";
import { getTenantInvestigationSnapshot } from "@/server/admin/tenant-investigation";

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
      <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</div>
      <div className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">{value}</div>
      <div className="mt-2 text-sm leading-6 text-slate-600">{hint}</div>
    </AdminCard>
  );
}

function formatDateLabel(value?: string | null) {
  if (!value) {
    return "Not recorded";
  }
  try {
    return new Intl.DateTimeFormat("en-AU", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function getTenantWorkspaceBaseUrl() {
  const configured =
    process.env.ADMIN_TENANT_APP_BASE_URL?.trim() ||
    process.env.NEXT_PUBLIC_TENANT_APP_BASE_URL?.trim();

  if (configured) {
    return configured.replace(/\/$/, "");
  }

  return "https://tenant.bookedai.au";
}

function buildTenantWorkspaceLink(tenantSlug: string, panel: "overview" | "billing" | "team" | "integrations") {
  const baseUrl = getTenantWorkspaceBaseUrl();
  const hash = panel === "overview" ? "" : `#${panel}`;
  const params = new URLSearchParams({
    admin_return: "1",
    admin_scope: `/admin/tenants?tenant=${encodeURIComponent(tenantSlug)}`,
    admin_scope_label: "Tenant investigation",
  });
  return `${baseUrl}/${encodeURIComponent(tenantSlug)}?${params.toString()}${hash}`;
}

function buildInvestigationFeed(items: InvestigationTimelineCardItem[]) {
  return [...items].sort((left, right) => Date.parse(right.occurredAt) - Date.parse(left.occurredAt));
}

export default async function TenantsPage({
  searchParams,
}: {
  searchParams?: Promise<{ tenant?: string }>;
}) {
  await requirePermission("tenants:view");
  const session = await getAdminSession();
  const repository = getAdminRepository();
  const tenants = await repository.listTenantOptions(session.userId, session.role);
  const params = (await searchParams) ?? {};
  const selectedSlug =
    params.tenant?.trim() || session.impersonation?.tenantSlug || tenants[0]?.slug || "";
  const selectedTenant = tenants.find((tenant) => tenant.slug === selectedSlug) ?? tenants[0] ?? null;

  const investigation = selectedTenant
    ? await getTenantInvestigationSnapshot(selectedTenant.slug)
    : { team: null, billing: null, integrations: null, timeline: [] };
  const recentAuditLogs = selectedTenant ? await repository.listRecentAuditLogs(selectedTenant.id) : [];
  const supportAuditFeed: InvestigationTimelineCardItem[] = recentAuditLogs
    .filter((item) => item.entityType === "tenant_support_session")
    .map((item) => ({
      id: `audit-${item.id}`,
      occurredAt: item.createdAt,
      source: "support",
      title:
        item.action === "admin.auth.start_tenant_support_mode"
          ? "Support mode started"
          : item.action === "admin.auth.end_tenant_support_mode"
            ? "Support mode ended"
            : item.action,
      description: item.summary,
      tone:
        item.action === "admin.auth.start_tenant_support_mode"
          ? "warning"
          : item.action === "admin.auth.end_tenant_support_mode"
            ? "success"
            : "default",
    }));
  const investigationFeed = buildInvestigationFeed([
    ...(investigation.timeline ?? []),
    ...supportAuditFeed,
  ]).slice(0, 12);

  const canStartSupportMode =
    session.role === "PLATFORM_OWNER" || session.role === "SUPER_ADMIN";

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Phase 3 to 4"
        title="Tenant investigation"
        description="This lane keeps tenant support safer than direct session takeover: investigate tenant auth posture, billing readiness, and CRM retry state first, then open read-only support mode with an audit trail when deeper investigation is needed."
      />

      {session.impersonation ? (
        <AdminCard className="border-amber-200 bg-amber-50 p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-700">
                Read-only support mode
              </div>
              <div className="mt-2 text-lg font-semibold text-amber-950">
                Investigating {session.impersonation.tenantSlug}
              </div>
              <p className="mt-2 text-sm leading-6 text-amber-900">
                Started {formatDateLabel(session.impersonation.startedAt)}
                {session.impersonation.reason ? ` • ${session.impersonation.reason}` : ""}
              </p>
            </div>
            <form action={endTenantSupportModeAction}>
              <AdminButton type="submit" variant="secondary">
                End support mode
              </AdminButton>
            </form>
          </div>
        </AdminCard>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
        <AdminCard className="p-6">
          <h2 className="text-lg font-semibold text-slate-950">Tenant directory</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Choose the tenant you want to inspect. Support mode stays read-only and separate from normal admin mutation pages.
          </p>
          <div className="mt-5 space-y-3">
            {tenants.map((tenant) => {
              const isSelected = selectedTenant?.id === tenant.id;
              return (
                <a
                  key={tenant.id}
                  href={`/admin/tenants?tenant=${encodeURIComponent(tenant.slug)}`}
                  className={`block rounded-2xl border px-4 py-4 transition ${
                    isSelected
                      ? "border-slate-950 bg-slate-950 text-white"
                      : "border-slate-200 bg-slate-50 text-slate-900 hover:bg-white"
                  }`}
                >
                  <div className="font-semibold">{tenant.name}</div>
                  <div className={`mt-1 text-sm ${isSelected ? "text-slate-200" : "text-slate-600"}`}>
                    {tenant.slug}
                  </div>
                </a>
              );
            })}
          </div>
        </AdminCard>

        {selectedTenant ? (
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-4">
              <MetricCard
                label="Tenant auth"
                value={String(investigation.team?.summary.total_members ?? 0)}
                hint={`${investigation.team?.summary.invited_members ?? 0} invited • ${investigation.team?.summary.active_members ?? 0} active`}
              />
              <MetricCard
                label="Billing posture"
                value={investigation.billing?.collection.can_charge ? "Live" : "Review"}
                hint={investigation.billing?.collection.recommended_action ?? "Billing snapshot unavailable."}
              />
              <MetricCard
                label="CRM retry backlog"
                value={String(
                  (investigation.integrations?.crm_retry_backlog.summary.retrying_records ?? 0) +
                    (investigation.integrations?.crm_retry_backlog.summary.manual_review_records ?? 0) +
                    (investigation.integrations?.crm_retry_backlog.summary.failed_records ?? 0),
                )}
                hint={investigation.integrations?.crm_retry_backlog.summary.operator_note ?? "CRM snapshot unavailable."}
              />
              <MetricCard
                label="Connected providers"
                value={String(
                  investigation.integrations?.providers.filter((provider) => provider.status === "connected")
                    .length ?? 0,
                )}
                hint={`${investigation.integrations?.attention.length ?? 0} integration signal(s) need review.`}
              />
            </div>

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
              <AdminCard className="p-6">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-950">Tenant auth investigation</h2>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      Review tenant team posture, invite backlog, and whether the support case looks like an access problem or a workspace-governance issue.
                    </p>
                  </div>
                  <AdminBadge tone="default">{selectedTenant.slug}</AdminBadge>
                </div>
                <div className="mt-5 grid gap-3 md:grid-cols-3">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Admins</div>
                    <div className="mt-2 text-2xl font-semibold text-slate-950">
                      {investigation.team?.summary.admin_members ?? 0}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Finance</div>
                    <div className="mt-2 text-2xl font-semibold text-slate-950">
                      {investigation.team?.summary.finance_members ?? 0}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Invites pending</div>
                    <div className="mt-2 text-2xl font-semibold text-slate-950">
                      {investigation.team?.summary.invited_members ?? 0}
                    </div>
                  </div>
                </div>
                <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Latest auth-related activity</div>
                  <div className="mt-2 text-sm font-semibold text-slate-950">
                    {investigation.team?.activity?.summary ?? "Tenant team activity is not available."}
                  </div>
                  <div className="mt-2 text-xs text-slate-500">
                    Updated {formatDateLabel(investigation.team?.activity?.last_updated_at)} by{" "}
                    {investigation.team?.activity?.last_updated_by ?? "BookedAI"}
                  </div>
                </div>
                <div className="mt-5 space-y-3">
                  {(investigation.team?.invite_activity ?? []).slice(0, 4).map((item) => (
                    <div key={item.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                      <div className="flex flex-wrap gap-2 text-xs text-slate-500">
                        <span>{formatDateLabel(item.created_at)}</span>
                        {item.delivery_status ? <span>{item.delivery_status}</span> : null}
                      </div>
                      <div className="mt-2 text-sm font-semibold text-slate-950">
                        {item.recipient_email ?? "Team invite"}
                      </div>
                      <div className="mt-1 text-sm text-slate-600">{item.summary}</div>
                    </div>
                  ))}
                </div>
              </AdminCard>

              <AdminCard className="p-6">
                <h2 className="text-lg font-semibold text-slate-950">Read-only support mode</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Open tenant support mode only when investigation needs a tenant-scoped context. This mode stays read-only and writes an audit trail.
                </p>
                <form action={startTenantSupportModeAction} className="mt-5 space-y-4">
                  <input type="hidden" name="tenantId" value={selectedTenant.id} />
                  <label className="block">
                    <div className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                      Support reason
                    </div>
                    <textarea
                      name="reason"
                      rows={4}
                      placeholder="Example: investigate tenant billing claim, auth confusion, or CRM sync backlog."
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900"
                    />
                  </label>
                  <AdminButton type="submit" disabled={!canStartSupportMode}>
                    {session.impersonation?.tenantId === selectedTenant.id
                      ? "Refresh support mode"
                      : "Start read-only support mode"}
                  </AdminButton>
                  {!canStartSupportMode ? (
                    <p className="text-sm text-slate-500">
                      Only platform or super admins can start tenant support impersonation.
                    </p>
                  ) : null}
                </form>
                <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                    Tenant runtime deep links
                  </div>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    Use these links when support investigation needs the tenant-facing runtime view. They open the exact tenant section directly; support mode remains an admin-side read-only audit state.
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <a href={buildTenantWorkspaceLink(selectedTenant.slug, "overview")} target="_blank" rel="noreferrer">
                      <AdminButton variant="secondary">Open tenant overview</AdminButton>
                    </a>
                    <a href={buildTenantWorkspaceLink(selectedTenant.slug, "billing")} target="_blank" rel="noreferrer">
                      <AdminButton variant="secondary">Open tenant billing</AdminButton>
                    </a>
                    <a href={buildTenantWorkspaceLink(selectedTenant.slug, "team")} target="_blank" rel="noreferrer">
                      <AdminButton variant="secondary">Open tenant team</AdminButton>
                    </a>
                    <a href={buildTenantWorkspaceLink(selectedTenant.slug, "integrations")} target="_blank" rel="noreferrer">
                      <AdminButton variant="secondary">Open tenant integrations</AdminButton>
                    </a>
                  </div>
                </div>
              </AdminCard>
            </div>

            <div className="grid gap-6 xl:grid-cols-2">
              <InvestigationTimelineCard items={investigationFeed} formatDateLabel={formatDateLabel} />

              <AdminCard className="p-6">
                <h2 className="text-lg font-semibold text-slate-950">Billing investigation</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  This snapshot stays focused on commercial truth: billing account, subscription readiness, invoice posture, and gateway state.
                </p>
                <div className="mt-5 space-y-3">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="text-sm font-semibold text-slate-950">
                      {investigation.billing?.collection.recommended_action ?? "Billing snapshot unavailable."}
                    </div>
                    <div className="mt-2 text-sm text-slate-600">
                      {investigation.billing?.collection.operator_note ?? "No billing guidance returned from tenant runtime."}
                    </div>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="rounded-2xl border border-slate-200 bg-white p-4">
                      <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Subscription</div>
                      <div className="mt-2 text-lg font-semibold text-slate-950">
                        {investigation.billing?.subscription.status ?? "unknown"}
                      </div>
                      <div className="mt-1 text-sm text-slate-600">
                        Plan {investigation.billing?.subscription.plan_code ?? "not set"}
                      </div>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-white p-4">
                      <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Invoices</div>
                      <div className="mt-2 text-lg font-semibold text-slate-950">
                        {investigation.billing?.invoice_summary.open_invoices ?? 0} open
                      </div>
                      <div className="mt-1 text-sm text-slate-600">
                        {investigation.billing?.invoice_summary.paid_invoices ?? 0} paid •{" "}
                        {investigation.billing?.invoice_summary.total_invoices ?? 0} total
                      </div>
                    </div>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Gateway</div>
                    <div className="mt-2 text-sm font-semibold text-slate-950">
                      {investigation.billing?.gateway?.provider ?? "not attached"}
                    </div>
                    <div className="mt-2 text-sm text-slate-600">
                      {investigation.billing?.gateway?.note ?? "No payment gateway note available."}
                    </div>
                  </div>
                  <div className="text-xs text-slate-500">
                    Latest billing activity: {investigation.billing?.activity?.summary ?? "Not recorded"} •{" "}
                    {formatDateLabel(investigation.billing?.activity?.last_updated_at)}
                  </div>
                </div>
              </AdminCard>

              <AdminCard className="p-6">
                <h2 className="text-lg font-semibold text-slate-950">CRM and integrations investigation</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Use this to separate tenant complaints caused by provider posture from cases caused by CRM retry backlog or credential review.
                </p>
                <div className="mt-5 grid gap-3 md:grid-cols-3">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Retrying</div>
                    <div className="mt-2 text-2xl font-semibold text-slate-950">
                      {investigation.integrations?.crm_retry_backlog.summary.retrying_records ?? 0}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Manual review</div>
                    <div className="mt-2 text-2xl font-semibold text-slate-950">
                      {investigation.integrations?.crm_retry_backlog.summary.manual_review_records ?? 0}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Failed</div>
                    <div className="mt-2 text-2xl font-semibold text-slate-950">
                      {investigation.integrations?.crm_retry_backlog.summary.failed_records ?? 0}
                    </div>
                  </div>
                </div>
                <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="text-sm font-semibold text-slate-950">
                    {investigation.integrations?.crm_retry_backlog.summary.operator_note ??
                      "CRM backlog snapshot unavailable."}
                  </div>
                  <div className="mt-2 text-xs text-slate-500">
                    Latest integrations activity: {investigation.integrations?.activity?.summary ?? "Not recorded"} •{" "}
                    {formatDateLabel(investigation.integrations?.activity?.last_updated_at)}
                  </div>
                </div>
                <div className="mt-5 space-y-3">
                  {(investigation.integrations?.providers ?? []).slice(0, 4).map((provider) => (
                    <div key={provider.provider} className="rounded-2xl border border-slate-200 bg-white p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div className="font-semibold text-slate-950">{provider.provider}</div>
                        <AdminBadge tone={provider.status === "connected" ? "success" : "warning"}>
                          {provider.status}
                        </AdminBadge>
                      </div>
                      <div className="mt-2 text-sm text-slate-600">{provider.sync_mode}</div>
                    </div>
                  ))}
                </div>
              </AdminCard>
            </div>
          </div>
        ) : (
          <AdminCard className="p-6">
            <h2 className="text-lg font-semibold text-slate-950">No tenant available</h2>
            <p className="mt-2 text-sm text-slate-600">
              This admin session does not currently have any tenant context available for investigation.
            </p>
          </AdminCard>
        )}
      </div>
    </div>
  );
}
