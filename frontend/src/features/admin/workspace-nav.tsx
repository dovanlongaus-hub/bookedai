import { AdminWorkspaceId } from './types';

type WorkspaceConfig = {
  id: AdminWorkspaceId;
  label: string;
  summary: string;
  backendSurface: string;
};

const workspaceConfigs: WorkspaceConfig[] = [
  {
    id: 'overview',
    label: 'Overview',
    summary: 'Ops home, booking triage, support queues, and operator entry points.',
    backendSurface: '/api/admin/overview, /api/admin/bookings, /api/admin/bookings/{id}',
  },
  {
    id: 'tenants',
    label: 'Tenants',
    summary: 'Tenant directory, health posture, and handoff into the editing workspace.',
    backendSurface: '/api/admin/tenants and tenant selection state',
  },
  {
    id: 'tenant-workspace',
    label: 'Tenant Workspace',
    summary: 'Tenant identity, permissions, branding, HTML intro, and tenant catalog editing.',
    backendSurface:
      '/api/admin/tenants, /api/admin/tenants/{tenant}, members, services, media upload',
  },
  {
    id: 'catalog',
    label: 'Catalog',
    summary: 'Service import, partner publishing, and content activation.',
    backendSurface: '/api/admin/services, /api/admin/partners, /api/admin/upload',
  },
  {
    id: 'billing-support',
    label: 'Billing Support',
    summary: 'Portal requests, payment attention, and booking follow-up context.',
    backendSurface:
      '/api/admin/overview portal queue plus /api/admin/bookings/{id} detail review',
  },
  {
    id: 'integrations',
    label: 'Integrations',
    summary: 'CRM, email, webhook, and provider visibility with operator guidance.',
    backendSurface: 'Current admin overview events plus tenant and reliability surfaces',
  },
  {
    id: 'messaging',
    label: 'Messaging',
    summary: 'Delivery posture, retry review, and manual follow-up across email, CRM, and outbox.',
    backendSurface: '/api/admin/messaging plus source-specific detail and action routes',
  },
  {
    id: 'reliability',
    label: 'Reliability',
    summary: 'Prompt 5 or Prompt 11 preview, config visibility, and route inventory.',
    backendSurface: '/api/v1/* preview routes plus /api/admin/config and /api/admin/apis',
  },
  {
    id: 'audit-activity',
    label: 'Audit & Activity',
    summary: 'Recent communications, handoff context, and operator review chronology.',
    backendSurface: '/api/admin/overview recent_events and support action state',
  },
  {
    id: 'platform-settings',
    label: 'Platform Settings',
    summary: 'Admin-visible configuration and backend surface inventory for safe rollout review.',
    backendSurface: '/api/admin/config and /api/admin/apis',
  },
];

type AdminWorkspaceNavProps = {
  activeWorkspace: AdminWorkspaceId;
  apiBaseUrl: string;
  onWorkspaceChange: (workspace: AdminWorkspaceId) => void;
};

export function AdminWorkspaceNav({
  activeWorkspace,
  apiBaseUrl,
  onWorkspaceChange,
}: AdminWorkspaceNavProps) {
  return (
    <section className="template-card mt-6 p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="template-kicker text-sm tracking-[0.14em]">
            Admin workspaces
          </div>
          <h2 className="template-title mt-3 text-2xl font-semibold text-[#1d1d1f]">
            Enterprise admin IA is now organized by business function
          </h2>
          <p className="template-body mt-2 max-w-3xl text-sm leading-7">
            The shell now follows the requested menu-first control-surface model so operators can
            move from overview, tenants, billing, integrations, reliability, audit, and platform
            settings without treating admin like one long mixed page.
          </p>
        </div>
        <div className="booked-note-surface px-4 py-3 text-sm text-black/70">
          <div className="text-xs font-semibold uppercase tracking-[0.08em] text-black/48">
            Runtime linkage
          </div>
          <div className="mt-2 font-semibold text-[#1d1d1f]">admin.bookedai.au</div>
          <div className="mt-1">API base: {apiBaseUrl}</div>
        </div>
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-3">
        {workspaceConfigs.map((workspace) => {
          const isActive = workspace.id === activeWorkspace;
          return (
            <button
              key={workspace.id}
              type="button"
              onClick={() => onWorkspaceChange(workspace.id)}
              className={`booked-workspace-card p-5 text-left ${isActive ? 'booked-workspace-card--active' : ''}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className={`text-lg font-semibold ${isActive ? 'text-white' : 'text-[#1d1d1f]'}`}>{workspace.label}</div>
                  <div className={`mt-2 text-sm leading-6 ${isActive ? 'text-white/75' : 'text-black/70'}`}>{workspace.summary}</div>
                </div>
                <span
                  className={`booked-pill px-3 py-1 ${
                    isActive ? 'bg-white text-[#2563eb]' : 'bg-white text-black/60'
                  }`}
                >
                  {isActive ? 'Active workspace' : 'Open workspace'}
                </span>
              </div>
              <div className={`mt-4 text-[11px] font-semibold uppercase tracking-[0.08em] ${isActive ? 'text-white/45' : 'text-black/48'}`}>
                Backend surfaces
              </div>
              <div className={`mt-2 text-sm leading-6 ${isActive ? 'text-white/72' : 'text-black/70'}`}>{workspace.backendSurface}</div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
