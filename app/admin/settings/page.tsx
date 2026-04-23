import {
  archiveBranchAction,
  createBranchAction,
  reactivateBranchAction,
  updateBillingGatewayControlsAction,
  updateBillingSettingsAction,
  updatePluginRuntimeControlsAction,
  updateBranchAction,
  updateWorkspaceSettingsAction,
  updateWorkspaceGuidesAction,
} from "@/app/admin/settings/actions";
import { WorkspaceSettingsForm } from "@/components/admin/settings/workspace-settings-form";
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
import { getAdminSettingsIntegrationsSnapshot } from "@/server/admin/settings-integrations";

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

function formatMoney(valueCents: number, currency: string) {
  return (valueCents / 100).toLocaleString("en-AU", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  });
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

function buildTenantWorkspaceLink(tenantSlug: string, panel: "integrations") {
  const baseUrl = getTenantWorkspaceBaseUrl();
  const params = new URLSearchParams({
    admin_return: "1",
    admin_scope: `/admin/settings`,
    admin_scope_label: "Workspace settings",
  });
  return `${baseUrl}/${encodeURIComponent(tenantSlug)}?${params.toString()}#${panel}`;
}

function badgeToneForStatus(status?: string | null): "default" | "success" | "warning" | "danger" | "info" {
  const normalized = String(status || "").toLowerCase();
  if (["connected", "healthy", "stable"].includes(normalized)) {
    return "success";
  }
  if (["attention_required", "operator_action_required", "failed", "conflict"].includes(normalized)) {
    return "danger";
  }
  if (["monitoring", "paused", "retrying", "manual_review_required", "unconfigured", "unavailable"].includes(normalized)) {
    return "warning";
  }
  if (["pending", "review"].includes(normalized)) {
    return "info";
  }
  return "default";
}

export default async function SettingsPage() {
  await requirePermission("settings:view");
  const session = await getAdminSession();
  const tenant = await getTenantContext();
  const repository = getAdminRepository();
  const [profile, settings, branches, billing, guides, billingGateway, pluginRuntime, integrations] = await Promise.all([
    repository.getTenantProfile(tenant.tenantId),
    repository.getTenantSettings(tenant.tenantId),
    repository.listBranches(tenant.tenantId),
    repository.getTenantBillingOverview(tenant.tenantId),
    repository.getWorkspaceGuides(tenant.tenantId),
    repository.getBillingGatewayControls(tenant.tenantId),
    repository.getPluginRuntimeControls(tenant.tenantId),
    getAdminSettingsIntegrationsSnapshot(tenant.tenantSlug),
  ]);

  if (!profile) {
    throw new Error("No tenant is available for this session.");
  }
  const supportModeActive = Boolean(session.impersonation);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Phase 3"
        title="Workspace settings"
        description="Settings now covers the tenant profile that operators actually use: workspace identity, locale defaults, and branding content including editable HTML introduction blocks."
      />
      <SupportModePageBanner
        scopeLabel="Workspace settings"
        tenantPanel="overview"
        adminPath="/admin/settings"
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,0.9fr)]">
        <AdminCard className="p-6">
          <h2 className="text-lg font-semibold text-slate-950">Workspace profile and branding</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            These values anchor the tenant context for admin views and provide the first real control surface for branding-aware enterprise configuration.
          </p>
          <div className="mt-6">
            <WorkspaceSettingsForm
              action={updateWorkspaceSettingsAction}
              profile={profile}
              settings={settings}
              disabled={supportModeActive}
            />
          </div>
        </AdminCard>

        <AdminCard className="p-6">
          <h2 className="text-lg font-semibold text-slate-950">Settings guidance</h2>
          <div className="mt-4 space-y-4 text-sm leading-6 text-slate-700">
            <p>
              Keep workspace name and locale values aligned with the tenant-facing product so cross-surface reporting does not drift.
            </p>
            <p>
              Use the HTML introduction field for controlled rich content that can later feed tenant landing sections, CRM sync notes, or onboarding previews.
            </p>
            <p>
              Phase 2 parity now also surfaces branch and billing baseline data here so workspace configuration can be reviewed against the same control-plane truth that powers support investigation.
            </p>
          </div>

          <div className="mt-6 space-y-6 border-t border-slate-200 pt-6">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                Branch footprint
              </div>
              <div className="mt-3 space-y-3">
                {branches.length ? (
                  branches.map((branch) => (
                    <div key={branch.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div className="font-semibold text-slate-950">{branch.name}</div>
                        <div className="text-xs uppercase tracking-[0.14em] text-slate-500">
                          {branch.isActive ? "Active" : "Archived"}
                        </div>
                      </div>
                      <form action={updateBranchAction} className="mt-4 grid gap-3 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_auto]">
                        <input type="hidden" name="branchId" value={branch.id} />
                        <AdminInput name="name" defaultValue={branch.name} disabled={supportModeActive} />
                        <AdminInput name="slug" defaultValue={branch.slug} disabled={supportModeActive} />
                        <AdminInput name="timezone" defaultValue={branch.timezone} disabled={supportModeActive} />
                        <div className="md:col-span-3 flex flex-wrap gap-3">
                          <AdminButton type="submit" variant="secondary" disabled={supportModeActive}>
                            Save branch
                          </AdminButton>
                        </div>
                      </form>
                      <div className="mt-3 flex flex-wrap gap-3">
                        {branch.isActive ? (
                          <form action={archiveBranchAction}>
                            <input type="hidden" name="branchId" value={branch.id} />
                            <AdminButton type="submit" variant="secondary" disabled={supportModeActive}>
                              Archive branch
                            </AdminButton>
                          </form>
                        ) : (
                          <form action={reactivateBranchAction}>
                            <input type="hidden" name="branchId" value={branch.id} />
                            <AdminButton type="submit" variant="secondary" disabled={supportModeActive}>
                              Reactivate branch
                            </AdminButton>
                          </form>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
                    No branches have been configured yet.
                  </div>
                )}
              </div>
              <form action={createBranchAction} className="mt-4 grid gap-3 rounded-2xl border border-dashed border-slate-300 bg-white p-4 md:grid-cols-3">
                <AdminInput name="name" placeholder="New branch name" disabled={supportModeActive} />
                <AdminInput name="slug" placeholder="new-branch-slug" disabled={supportModeActive} />
                <AdminInput name="timezone" placeholder="Australia/Sydney" disabled={supportModeActive} />
                <div className="md:col-span-3">
                  <AdminButton type="submit" variant="secondary" disabled={supportModeActive}>
                    Add branch
                  </AdminButton>
                </div>
              </form>
            </div>

            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                Billing baseline
              </div>
              <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-sm font-semibold text-slate-950">
                  {billing.subscription
                    ? `${billing.subscription.planCode.toUpperCase()} • ${billing.subscription.status}`
                    : "No active subscription record"}
                </div>
                <div className="mt-1 text-sm text-slate-600">
                  {billing.subscription
                    ? `${billing.subscription.provider} renewal ${formatDateLabel(billing.subscription.renewsAt)}`
                    : "Subscription parity has not been seeded for this tenant yet."}
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-white/70 bg-white p-4">
                    <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                      Outstanding invoices
                    </div>
                    <div className="mt-2 text-2xl font-semibold text-slate-950">
                      {billing.invoiceSummary.openInvoices}
                    </div>
                    <div className="mt-1 text-sm text-slate-600">
                      {billing.invoiceSummary.overdueInvoices} overdue
                    </div>
                  </div>
                  <div className="rounded-2xl border border-white/70 bg-white p-4">
                    <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                      Outstanding value
                    </div>
                    <div className="mt-2 text-2xl font-semibold text-slate-950">
                      {formatMoney(
                        billing.invoiceSummary.outstandingCents,
                        billing.invoiceSummary.currency,
                      )}
                    </div>
                    <div className="mt-1 text-sm text-slate-600">
                      {billing.invoiceSummary.paidInvoices} paid of {billing.invoiceSummary.totalInvoices} invoices
                    </div>
                  </div>
                </div>
                <form action={updateBillingSettingsAction} className="mt-4 grid gap-3 md:grid-cols-2">
                  <AdminInput
                    name="provider"
                    placeholder="stripe"
                    defaultValue={billing.subscription?.provider ?? ""}
                    disabled={supportModeActive}
                  />
                  <AdminInput
                    name="planCode"
                    placeholder="pro"
                    defaultValue={billing.subscription?.planCode ?? ""}
                    disabled={supportModeActive}
                  />
                  <AdminInput
                    name="status"
                    placeholder="active"
                    defaultValue={billing.subscription?.status ?? ""}
                    disabled={supportModeActive}
                  />
                  <AdminInput
                    name="externalId"
                    placeholder="sub_xxx"
                    defaultValue={billing.subscription?.externalId ?? ""}
                    disabled={supportModeActive}
                  />
                  <div className="md:col-span-2">
                    <AdminInput
                      name="renewsAt"
                      type="datetime-local"
                      defaultValue={
                        billing.subscription?.renewsAt
                          ? billing.subscription.renewsAt.slice(0, 16)
                          : ""
                      }
                      disabled={supportModeActive}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <AdminButton type="submit" variant="secondary" disabled={supportModeActive}>
                      Save billing baseline
                    </AdminButton>
                  </div>
                </form>
              </div>
            </div>

            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                Workspace operational guides
              </div>
              <form action={updateWorkspaceGuidesAction} className="mt-3 grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <AdminInput name="overview" defaultValue={guides.overview} disabled={supportModeActive} />
                <AdminInput name="experience" defaultValue={guides.experience} disabled={supportModeActive} />
                <AdminInput name="catalog" defaultValue={guides.catalog} disabled={supportModeActive} />
                <AdminInput name="plugin" defaultValue={guides.plugin} disabled={supportModeActive} />
                <AdminInput name="bookings" defaultValue={guides.bookings} disabled={supportModeActive} />
                <AdminInput name="integrations" defaultValue={guides.integrations} disabled={supportModeActive} />
                <AdminInput name="billing" defaultValue={guides.billing} disabled={supportModeActive} />
                <AdminInput name="team" defaultValue={guides.team} disabled={supportModeActive} />
                <div>
                  <AdminButton type="submit" variant="secondary" disabled={supportModeActive}>
                    Save workspace guides
                  </AdminButton>
                </div>
              </form>
            </div>

            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                Billing gateway controls
              </div>
              <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-sm text-slate-600">
                  This layer controls tenant runtime billing posture, including whether Stripe should behave as disabled, test, or live for the tenant shell.
                </div>
                <form action={updateBillingGatewayControlsAction} className="mt-4 grid gap-3 md:grid-cols-2">
                  <AdminInput
                    name="merchantModeOverride"
                    placeholder="live"
                    defaultValue={billingGateway.merchantModeOverride ?? ""}
                    disabled={supportModeActive}
                  />
                  <AdminInput
                    name="stripeCustomerId"
                    placeholder="cus_xxx"
                    defaultValue={billingGateway.stripeCustomerId ?? ""}
                    disabled={supportModeActive}
                  />
                  <div className="md:col-span-2">
                    <AdminInput
                      name="stripeCustomerEmail"
                      placeholder="billing@tenant.example"
                      defaultValue={billingGateway.stripeCustomerEmail ?? ""}
                      disabled={supportModeActive}
                    />
                  </div>
                  <div className="md:col-span-2 text-xs text-slate-500">
                    Last synced {formatDateLabel(billingGateway.lastSyncedAt)}
                  </div>
                  <div className="md:col-span-2">
                    <AdminButton type="submit" variant="secondary" disabled={supportModeActive}>
                      Save gateway controls
                    </AdminButton>
                  </div>
                </form>
              </div>
            </div>

            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                Plugin runtime controls
              </div>
              <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-sm text-slate-600">
                  This layer mirrors the tenant plugin workspace so admin can inspect and tune partner embed runtime without switching into the tenant surface.
                </div>
                <form action={updatePluginRuntimeControlsAction} className="mt-4 grid gap-3 md:grid-cols-2">
                  <AdminInput name="partnerName" placeholder="Partner name" defaultValue={pluginRuntime.partnerName ?? ""} disabled={supportModeActive} />
                  <AdminInput name="partnerWebsiteUrl" placeholder="https://partner.example" defaultValue={pluginRuntime.partnerWebsiteUrl ?? ""} disabled={supportModeActive} />
                  <AdminInput name="bookedaiHost" placeholder="https://product.bookedai.au" defaultValue={pluginRuntime.bookedaiHost ?? ""} disabled={supportModeActive} />
                  <AdminInput name="embedPath" placeholder="/partner/tenant/embed" defaultValue={pluginRuntime.embedPath ?? ""} disabled={supportModeActive} />
                  <AdminInput name="widgetScriptPath" placeholder="/partner-plugins/widget.js" defaultValue={pluginRuntime.widgetScriptPath ?? ""} disabled={supportModeActive} />
                  <AdminInput name="widgetId" placeholder="tenant-plugin" defaultValue={pluginRuntime.widgetId ?? ""} disabled={supportModeActive} />
                  <AdminInput name="headline" placeholder="Headline" defaultValue={pluginRuntime.headline ?? ""} disabled={supportModeActive} />
                  <AdminInput name="prompt" placeholder="Prompt" defaultValue={pluginRuntime.prompt ?? ""} disabled={supportModeActive} />
                  <AdminInput name="accentColor" placeholder="#1f7a6b" defaultValue={pluginRuntime.accentColor ?? ""} disabled={supportModeActive} />
                  <AdminInput name="buttonLabel" placeholder="Button label" defaultValue={pluginRuntime.buttonLabel ?? ""} disabled={supportModeActive} />
                  <AdminInput name="modalTitle" placeholder="Modal title" defaultValue={pluginRuntime.modalTitle ?? ""} disabled={supportModeActive} />
                  <AdminInput name="supportEmail" placeholder="support@partner.example" defaultValue={pluginRuntime.supportEmail ?? ""} disabled={supportModeActive} />
                  <AdminInput name="supportWhatsapp" placeholder="+614..." defaultValue={pluginRuntime.supportWhatsapp ?? ""} disabled={supportModeActive} />
                  <AdminInput name="logoUrl" placeholder="https://..." defaultValue={pluginRuntime.logoUrl ?? ""} disabled={supportModeActive} />
                  <div className="md:col-span-2">
                    <AdminButton type="submit" variant="secondary" disabled={supportModeActive}>
                      Save plugin runtime
                    </AdminButton>
                  </div>
                </form>
              </div>
            </div>

            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                Integration operator posture
              </div>
              <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex flex-wrap items-center gap-3">
                  <AdminBadge tone={badgeToneForStatus(integrations.attentionTriage.status)}>
                    {integrations.attentionTriage.status}
                  </AdminBadge>
                  <AdminBadge tone={integrations.crmRetryBacklog.summary.hold_recommended ? "danger" : "info"}>
                    {integrations.crmRetryBacklog.summary.hold_recommended ? "Hold rollout" : "Monitor only"}
                  </AdminBadge>
                </div>
                <div className="mt-3 text-sm text-slate-600">{integrations.writeAuthority.operatorNote}</div>
                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  <div className="rounded-2xl border border-white/70 bg-white p-4">
                    <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                      Retrying
                    </div>
                    <div className="mt-2 text-2xl font-semibold text-slate-950">
                      {integrations.crmRetryBacklog.summary.retrying_records}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-white/70 bg-white p-4">
                    <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                      Manual review
                    </div>
                    <div className="mt-2 text-2xl font-semibold text-slate-950">
                      {integrations.crmRetryBacklog.summary.manual_review_records}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-white/70 bg-white p-4">
                    <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                      Failed
                    </div>
                    <div className="mt-2 text-2xl font-semibold text-slate-950">
                      {integrations.crmRetryBacklog.summary.failed_records}
                    </div>
                  </div>
                </div>
                <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="text-sm font-semibold text-slate-950">
                    {integrations.attentionTriage.retry_posture.operator_note}
                  </div>
                  <div className="mt-2 text-xs text-slate-500">
                    Latest retry posture {formatDateLabel(integrations.attentionTriage.retry_posture.latest_retry_at)}
                  </div>
                </div>
                <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-slate-950">Zoho CRM credential posture</div>
                      <div className="mt-1 text-sm text-slate-600">{integrations.zohoConnection.message}</div>
                    </div>
                    <AdminBadge tone={badgeToneForStatus(integrations.zohoConnection.status)}>
                      {integrations.zohoConnection.status}
                    </AdminBadge>
                  </div>
                  <div className="mt-4 grid gap-3 md:grid-cols-3">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Token source</div>
                      <div className="mt-2 text-sm font-semibold text-slate-950">
                        {integrations.zohoConnection.tokenSource ?? "not resolved"}
                      </div>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Module count</div>
                      <div className="mt-2 text-sm font-semibold text-slate-950">
                        {integrations.zohoConnection.moduleCount}
                      </div>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Field count</div>
                      <div className="mt-2 text-sm font-semibold text-slate-950">
                        {integrations.zohoConnection.fieldCount}
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 text-xs text-slate-500">
                    Requested module {integrations.zohoConnection.requestedModule} • found{" "}
                    {integrations.zohoConnection.requestedModuleFound ? "yes" : "no"} • configured fields:{" "}
                    {(integrations.zohoConnection.safeConfig?.configured_fields ?? []).join(", ") || "not exposed"}
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    API base {integrations.zohoConnection.apiBaseUrl ?? "not returned"}
                  </div>
                </div>
                <div className="mt-4">
                  <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                    Provider credential overview
                  </div>
                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    {integrations.credentialOverview.length ? (
                      integrations.credentialOverview.map((item) => (
                        <div key={item.provider} className="rounded-2xl border border-slate-200 bg-white p-4">
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                              <div className="font-semibold text-slate-950">{item.label}</div>
                              <div className="mt-1 text-sm text-slate-600">{item.provider}</div>
                            </div>
                            <AdminBadge tone={badgeToneForStatus(item.status)}>{item.status}</AdminBadge>
                          </div>
                          <div className="mt-3 text-sm text-slate-600">{item.recommendedAction}</div>
                          <div className="mt-3 text-xs text-slate-500">
                            Enabled {item.enabled ? "yes" : "no"} • configured fields {item.configuredFieldCount}
                          </div>
                          <div className="mt-1 text-xs text-slate-500">
                            {(item.configuredFields ?? []).join(", ") || "No safe configured fields exposed"}
                          </div>
                          {item.notes.length ? (
                            <div className="mt-1 text-xs text-slate-500">{item.notes.join(" • ")}</div>
                          ) : null}
                        </div>
                      ))
                    ) : (
                      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-600 md:col-span-2">
                        No provider credential-safe overview is currently available.
                      </div>
                    )}
                  </div>
                </div>
                <div className="mt-4 space-y-3">
                  {integrations.providers.length ? (
                    integrations.providers.slice(0, 6).map((provider) => (
                      <div key={provider.provider} className="rounded-2xl border border-slate-200 bg-white p-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <div className="font-semibold text-slate-950">{provider.provider}</div>
                            <div className="mt-1 text-sm text-slate-600">{provider.sync_mode}</div>
                          </div>
                          <AdminBadge tone={badgeToneForStatus(provider.status)}>{provider.status}</AdminBadge>
                        </div>
                        <div className="mt-3 text-xs text-slate-500">
                          Configured fields: {(provider.safe_config?.configured_fields ?? []).join(", ") || "not exposed"}
                        </div>
                        <div className="mt-1 text-xs text-slate-500">
                          Updated {formatDateLabel(provider.updated_at)}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-600">
                      No integration provider posture is currently available from the backend runtime.
                    </div>
                  )}
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Outbox failed</div>
                    <div className="mt-2 text-2xl font-semibold text-slate-950">
                      {integrations.outboxBacklog.summary.failed_events}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Outbox retrying</div>
                    <div className="mt-2 text-2xl font-semibold text-slate-950">
                      {integrations.outboxBacklog.summary.retrying_events}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Outbox pending</div>
                    <div className="mt-2 text-2xl font-semibold text-slate-950">
                      {integrations.outboxBacklog.summary.pending_events}
                    </div>
                  </div>
                </div>
                <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="text-sm font-semibold text-slate-950">
                    {integrations.outboxBacklog.summary.operator_note}
                  </div>
                  <div className="mt-2 text-xs text-slate-500">
                    Latest outbox checkpoint {formatDateLabel(integrations.outboxBacklog.checked_at)}
                  </div>
                </div>
                <div className="mt-4 space-y-3">
                  {integrations.reconciliation.sections.slice(0, 4).map((section) => (
                    <div key={section.area} className="rounded-2xl border border-slate-200 bg-white p-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="font-semibold text-slate-950">{section.area.replaceAll("_", " ")}</div>
                        <AdminBadge tone={badgeToneForStatus(section.status)}>{section.status}</AdminBadge>
                      </div>
                      <div className="mt-2 text-sm text-slate-600">{section.recommended_action}</div>
                      <div className="mt-2 text-xs text-slate-500">
                        {section.failed_count} failed • {section.manual_review_count} manual review • {section.pending_count} pending
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4">
                  <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                    Recent runtime activity
                  </div>
                  <div className="mt-3 space-y-3">
                    {integrations.runtimeActivity.length ? (
                      integrations.runtimeActivity.slice(0, 5).map((item) => (
                        <div key={`${item.source}-${item.item_id}`} className="rounded-2xl border border-slate-200 bg-white p-4">
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                              <div className="font-semibold text-slate-950">{item.title}</div>
                              <div className="mt-1 text-sm text-slate-600">
                                {item.source.replaceAll("_", " ")} • {item.detail ?? item.external_ref ?? "No extra detail"}
                              </div>
                            </div>
                            <AdminBadge tone={badgeToneForStatus(item.status)}>{item.status}</AdminBadge>
                          </div>
                          <div className="mt-2 text-xs text-slate-500">
                            Occurred {formatDateLabel(item.occurred_at)}
                            {typeof item.attempt_count === "number" ? ` • attempts ${item.attempt_count}` : ""}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-600">
                        No recent integration runtime activity is currently available.
                      </div>
                    )}
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-3">
                  <a href={buildTenantWorkspaceLink(tenant.tenantSlug, "integrations")} target="_blank" rel="noreferrer">
                    <AdminButton variant="secondary">Open tenant integrations</AdminButton>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </AdminCard>
      </div>
    </div>
  );
}
