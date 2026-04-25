import {
  Activity,
  Building2,
  CreditCard,
  FileClock,
  Gauge,
  LayoutDashboard,
  MessageSquareText,
  PackageSearch,
  PlugZap,
  Settings2,
  UsersRound,
  type LucideIcon,
} from 'lucide-react';

import { AdminWorkspaceId } from './types';

type WorkspaceConfig = {
  id: AdminWorkspaceId;
  label: string;
  summary: string;
  backendSurface: string;
  group: 'Operate' | 'Tenants' | 'Revenue' | 'Platform';
  icon: LucideIcon;
};

const workspaceConfigs: WorkspaceConfig[] = [
  {
    id: 'overview',
    label: 'Overview',
    summary: 'Ops home, booking triage, support queues, and operator entry points.',
    backendSurface: '/api/admin/overview, /api/admin/bookings',
    group: 'Operate',
    icon: LayoutDashboard,
  },
  {
    id: 'billing-support',
    label: 'Billing Support',
    summary: 'Portal requests, payment attention, and booking follow-up context.',
    backendSurface: '/api/admin/overview portal queue',
    group: 'Operate',
    icon: CreditCard,
  },
  {
    id: 'messaging',
    label: 'Messaging',
    summary: 'Delivery posture, retry review, and manual follow-up.',
    backendSurface: '/api/admin/messaging',
    group: 'Operate',
    icon: MessageSquareText,
  },
  {
    id: 'tenants',
    label: 'Tenants',
    summary: 'Tenant directory, health posture, and handoff into editing.',
    backendSurface: '/api/admin/tenants',
    group: 'Tenants',
    icon: Building2,
  },
  {
    id: 'tenant-workspace',
    label: 'Tenant Workspace',
    summary: 'Tenant identity, permissions, branding, HTML intro, and catalog editing.',
    backendSurface: '/api/admin/tenants/{tenant}',
    group: 'Tenants',
    icon: UsersRound,
  },
  {
    id: 'catalog',
    label: 'Catalog',
    summary: 'Service import, partner publishing, and content activation.',
    backendSurface: '/api/admin/services, /api/admin/partners',
    group: 'Revenue',
    icon: PackageSearch,
  },
  {
    id: 'integrations',
    label: 'Integrations',
    summary: 'CRM, email, webhook, and provider visibility.',
    backendSurface: 'Admin events plus reliability surfaces',
    group: 'Revenue',
    icon: PlugZap,
  },
  {
    id: 'reliability',
    label: 'Reliability',
    summary: 'Prompt previews, config visibility, route inventory, and action ledger.',
    backendSurface: '/api/admin/config, /api/admin/apis',
    group: 'Platform',
    icon: Gauge,
  },
  {
    id: 'audit-activity',
    label: 'Audit & Activity',
    summary: 'Recent communications, handoff context, and chronology.',
    backendSurface: '/api/admin/overview recent_events',
    group: 'Platform',
    icon: FileClock,
  },
  {
    id: 'platform-settings',
    label: 'Platform Settings',
    summary: 'Configuration and backend inventory for rollout review.',
    backendSurface: '/api/admin/config and /api/admin/apis',
    group: 'Platform',
    icon: Settings2,
  },
];

const workspaceGroups: WorkspaceConfig['group'][] = ['Operate', 'Tenants', 'Revenue', 'Platform'];

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
  const activeConfig = workspaceConfigs.find((workspace) => workspace.id === activeWorkspace);

  return (
    <aside className="sticky top-4 h-fit rounded-3xl border border-white/70 bg-white/90 p-4 shadow-[0_22px_60px_rgba(15,23,42,0.08)] backdrop-blur">
      <div className="flex items-center gap-3 rounded-2xl bg-slate-950 px-4 py-4 text-white">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/12">
          <Activity className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-sky-200">
            Admin control
          </div>
          <div className="mt-1 truncate text-sm font-semibold">admin.bookedai.au</div>
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-xs text-slate-600">
        <div className="font-semibold uppercase tracking-[0.12em] text-slate-500">API base</div>
        <div className="mt-1 truncate font-semibold text-slate-950">{apiBaseUrl}</div>
      </div>

      <nav className="mt-5 space-y-5" aria-label="Admin workspaces">
        {workspaceGroups.map((group) => (
          <div key={group}>
            <div className="px-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
              {group}
            </div>
            <div className="mt-2 space-y-1">
              {workspaceConfigs
                .filter((workspace) => workspace.group === group)
                .map((workspace) => {
                  const isActive = workspace.id === activeWorkspace;
                  const Icon = workspace.icon;
                  return (
                    <button
                      key={workspace.id}
                      type="button"
                      onClick={() => onWorkspaceChange(workspace.id)}
                      className={`group flex w-full items-start gap-3 rounded-2xl px-3 py-3 text-left transition ${
                        isActive
                          ? 'bg-slate-950 text-white shadow-[0_14px_34px_rgba(15,23,42,0.22)]'
                          : 'text-slate-700 hover:bg-slate-100 hover:text-slate-950'
                      }`}
                    >
                      <span
                        className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                          isActive ? 'bg-white text-slate-950' : 'bg-white text-slate-500'
                        }`}
                      >
                        <Icon className="h-4 w-4" aria-hidden="true" />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold">{workspace.label}</span>
                        <span
                          className={`mt-1 line-clamp-2 block text-xs leading-5 ${
                            isActive ? 'text-white/70' : 'text-slate-500'
                          }`}
                        >
                          {workspace.summary}
                        </span>
                      </span>
                    </button>
                  );
                })}
            </div>
          </div>
        ))}
      </nav>

      {activeConfig ? (
        <div className="mt-5 rounded-2xl border border-sky-100 bg-sky-50 px-4 py-3 text-xs leading-5 text-slate-600">
          <div className="font-semibold uppercase tracking-[0.12em] text-sky-700">
            Active surface
          </div>
          <div className="mt-1 font-semibold text-slate-950">{activeConfig.label}</div>
          <div className="mt-1">{activeConfig.backendSurface}</div>
        </div>
      ) : null}
    </aside>
  );
}
