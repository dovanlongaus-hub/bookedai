import {
  Activity,
  Building2,
  ChevronDown,
  ChevronsLeft,
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
import { useEffect, useMemo, useState } from 'react';

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
  const activeGroup = activeConfig?.group ?? 'Operate';
  const [collapsed, setCollapsed] = useState(false);
  const [openGroups, setOpenGroups] = useState<Record<WorkspaceConfig['group'], boolean>>({
    Operate: true,
    Tenants: true,
    Revenue: true,
    Platform: true,
  });

  useEffect(() => {
    setOpenGroups((current) => ({ ...current, [activeGroup]: true }));
  }, [activeGroup]);

  const groupedWorkspaces = useMemo(
    () =>
      workspaceGroups.map((group) => ({
        group,
        items: workspaceConfigs.filter((workspace) => workspace.group === group),
      })),
    [],
  );

  return (
    <aside
      className={`booked-admin-sidebar ${collapsed ? 'booked-admin-sidebar--collapsed' : ''}`}
      aria-label="Admin workspace shell"
    >
      <div className="flex items-center gap-3 rounded-2xl bg-slate-950 px-3 py-3 text-white">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/12">
          <Activity className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="booked-admin-sidebar-copy text-xs font-semibold uppercase tracking-[0.16em] text-sky-200">
            Admin control
          </div>
          <div className="booked-admin-sidebar-copy mt-1 truncate text-sm font-semibold">
            admin.bookedai.au
          </div>
        </div>
        <button
          type="button"
          onClick={() => setCollapsed((value) => !value)}
          className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/10 text-white/80 transition hover:bg-white/18 hover:text-white xl:inline-flex"
          aria-label={collapsed ? 'Expand admin menu' : 'Collapse admin menu'}
          title={collapsed ? 'Expand menu' : 'Collapse menu'}
        >
          <ChevronsLeft
            className={`h-4 w-4 transition ${collapsed ? 'rotate-180' : ''}`}
            aria-hidden="true"
          />
        </button>
      </div>

      <div className="booked-admin-sidebar-copy mt-3 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-xs text-slate-600">
        <div className="font-semibold uppercase tracking-[0.12em] text-slate-500">API base</div>
        <div className="mt-1 truncate font-semibold text-slate-950">{apiBaseUrl}</div>
      </div>

      <nav className="mt-4 space-y-2" aria-label="Admin workspaces">
        {groupedWorkspaces.map(({ group, items }) => {
          const isGroupOpen = collapsed ? true : openGroups[group];
          const groupHasActive = group === activeGroup;
          return (
            <section
              key={group}
              className={`booked-admin-nav-group ${groupHasActive ? 'booked-admin-nav-group--active' : ''}`}
            >
              <button
                type="button"
                onClick={() =>
                  setOpenGroups((current) => ({ ...current, [group]: !current[group] }))
                }
                className="booked-admin-nav-group-trigger"
                aria-expanded={isGroupOpen}
              >
                <span className="booked-admin-sidebar-copy">{group}</span>
                <span className="booked-admin-sidebar-copy ml-auto text-[11px] text-slate-400">
                  {items.length}
                </span>
                <ChevronDown
                  className={`booked-admin-sidebar-copy h-3.5 w-3.5 transition ${
                    isGroupOpen ? 'rotate-180' : ''
                  }`}
                  aria-hidden="true"
                />
              </button>

              <div className={`booked-admin-nav-items ${isGroupOpen ? 'is-open' : ''}`}>
                {items.map((workspace) => {
                const isActive = workspace.id === activeWorkspace;
                const Icon = workspace.icon;
                return (
                  <button
                    key={workspace.id}
                    type="button"
                    onClick={() => onWorkspaceChange(workspace.id)}
                    className={`booked-admin-nav-item ${isActive ? 'is-active' : ''}`}
                    title={workspace.label}
                  >
                    <span
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition ${
                        isActive ? 'bg-white text-slate-950' : 'bg-white text-slate-500'
                      }`}
                    >
                      <Icon className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <span className="booked-admin-sidebar-copy min-w-0">
                      <span className="block text-sm font-semibold">{workspace.label}</span>
                      <span className={`mt-1 line-clamp-2 block text-xs leading-5 ${
                        isActive ? 'text-white/70' : 'text-slate-500'
                      }`}>
                        {workspace.summary}
                      </span>
                    </span>
                  </button>
                );
              })}
              </div>
            </section>
          );
        })}
      </nav>

      {activeConfig ? (
        <div className="booked-admin-sidebar-copy mt-4 rounded-2xl border border-sky-100 bg-sky-50 px-4 py-3 text-xs leading-5 text-slate-600">
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
