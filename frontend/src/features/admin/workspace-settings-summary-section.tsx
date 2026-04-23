import type { AdminTenantDetailResponse } from './types';
import { buildWorkspaceSettingsHandoffUrl } from './settings-handoff';

type WorkspaceSettingsSummarySectionProps = {
  selectedTenantDetail: AdminTenantDetailResponse | null;
};

function SummaryCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <article className="rounded-[1.4rem] border border-slate-200 bg-slate-50/80 p-4 shadow-[0_18px_40px_rgba(15,23,42,0.05)]">
      <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">{label}</div>
      <div className="mt-2 text-lg font-semibold text-slate-950">{value}</div>
      <div className="mt-2 text-sm leading-6 text-slate-600">{detail}</div>
    </article>
  );
}

export function WorkspaceSettingsSummarySection({
  selectedTenantDetail,
}: WorkspaceSettingsSummarySectionProps) {
  const tenant = selectedTenantDetail?.tenant ?? null;
  const workspace = selectedTenantDetail?.workspace ?? null;
  const settingsUrl = tenant
    ? buildWorkspaceSettingsHandoffUrl({ tenant })
    : null;
  const branchesValue = tenant ? `${tenant.active_memberships} active memberships` : 'Select a tenant';
  const billingGuide = workspace?.guides.billing?.trim() || null;
  const integrationsGuide = workspace?.guides.integrations?.trim() || null;
  const pluginGuide = workspace?.guides.plugin?.trim() || null;

  return (
    <section className="rounded-[2rem] border border-slate-200 bg-[linear-gradient(180deg,rgba(255,255,255,0.98)_0%,rgba(248,250,252,0.96)_100%)] p-6 shadow-[0_24px_60px_rgba(15,23,42,0.08)]">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-3xl">
          <div className="text-xs font-semibold uppercase tracking-[0.22em] text-violet-700">
            Workspace settings
          </div>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">
            Keep tenant-facing configuration in one trusted workspace
          </h2>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            Use the shipped shell to review posture and diagnostics, then open the root settings workspace for tenant-scoped edits like branding, branches, billing baseline, and plugin runtime controls.
          </p>
        </div>

        <div className="rounded-[1.6rem] border border-violet-200 bg-violet-50/80 p-4 lg:max-w-sm">
          <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-violet-700">
            Promotion posture
          </div>
          <div className="mt-2 text-sm leading-6 text-slate-700">
            Live configuration and API inventory stay here. Tenant-scoped settings edits move into the trusted root admin workspace.
          </div>
          <div className="mt-4">
            {settingsUrl ? (
              <a
                href={settingsUrl}
                className="inline-flex items-center rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Open workspace settings
              </a>
            ) : (
              <span className="inline-flex rounded-full border border-dashed border-slate-300 px-4 py-2 text-sm font-medium text-slate-500">
                Select a tenant to open workspace settings
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          label="Workspace identity"
          value={tenant?.name ?? 'No tenant selected'}
          detail={tenant ? `${tenant.slug} • ${tenant.locale || 'Locale not set'} • ${tenant.timezone || 'Timezone not set'}` : 'Choose a tenant from the directory or workspace first.'}
        />
        <SummaryCard
          label="Branch footprint"
          value={branchesValue}
          detail={tenant ? `${tenant.total_services} services, ${tenant.published_services} published. Branch lifecycle edits route through root settings.` : 'Branch and service footprint appears after tenant selection.'}
        />
        <SummaryCard
          label="Billing posture"
          value={billingGuide ? 'Guide configured' : 'Needs review'}
          detail={billingGuide || 'Use root settings to confirm subscription, invoice, and gateway baseline for this tenant.'}
        />
        <SummaryCard
          label="Plugin runtime"
          value={pluginGuide ? 'Configured' : 'Needs review'}
          detail={pluginGuide || integrationsGuide || 'Review tenant-facing plugin controls and integrations attention from the promoted settings path.'}
        />
      </div>
    </section>
  );
}
