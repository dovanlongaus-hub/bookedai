import { AdminWorkspaceId, AdminWorkspacePanelId } from './types';

type AdminWorkspaceInsightsProps = {
  activeWorkspace: AdminWorkspaceId;
  activePanel: AdminWorkspacePanelId | null;
  bookingsTotal: number;
  shadowStatus: string;
  tenantsCount: number;
  selectedTenantName?: string | null;
  selectedTenantMembersCount: number;
  selectedTenantServicesCount: number;
  portalSupportQueueCount: number;
  importedServicesCount: number;
  partnersCount: number;
  configItemsCount: number;
  apiRoutesCount: number;
  messagingCount: number;
  messagingAttentionCount: number;
  selectedBookingReference?: string | null;
  selectedServiceId?: string | null;
  onPanelNavigate: (panel: AdminWorkspacePanelId) => void;
};

export function AdminWorkspaceInsights({
  activeWorkspace,
  activePanel,
  bookingsTotal,
  shadowStatus,
  tenantsCount,
  selectedTenantName,
  selectedTenantMembersCount,
  selectedTenantServicesCount,
  portalSupportQueueCount,
  importedServicesCount,
  partnersCount,
  configItemsCount,
  apiRoutesCount,
  messagingCount,
  messagingAttentionCount,
  selectedBookingReference,
  selectedServiceId,
  onPanelNavigate,
}: AdminWorkspaceInsightsProps) {
  if (activeWorkspace === 'overview') {
    return (
      <section
        id="overview-workspace"
        className="mt-6 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_24px_60px_rgba(15,23,42,0.06)]"
      >
        <div className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-700">
          Overview workspace
        </div>
        <h2 className="mt-3 text-2xl font-bold tracking-tight text-slate-950">
          Start from the ops home, then move operators into the next action
        </h2>
        <div className="mt-5 grid gap-4 md:grid-cols-4">
          <InsightCard label="Bookings workspace" value={`${bookingsTotal} visible`} detail="Current query and filter result set." />
          <InsightCard label="Shadow compare" value={shadowStatus} detail="Live-vs-shadow read posture for booking operations." />
          <InsightCard
            label="Support queue"
            value={`${portalSupportQueueCount} queued`}
            detail="Portal requests plus payment attention items visible to operators."
          />
          <InsightCard
            label="Booking focus"
            value={selectedBookingReference ?? 'No booking selected'}
            detail="Detail panel follows the current triage target."
          />
        </div>
        <div className="mt-5 flex flex-wrap gap-3">
          <PanelLink
            label="Open bookings panel"
            isActive={activePanel === 'bookings'}
            onClick={() => onPanelNavigate('bookings')}
          />
          <PanelLink
            label="Open selected booking panel"
            isActive={activePanel === 'selected-booking'}
            onClick={() => onPanelNavigate('selected-booking')}
          />
          <PanelLink
            label="Open support queue"
            isActive={activePanel === 'portal-support'}
            onClick={() => onPanelNavigate('portal-support')}
          />
          <PanelLink
            label="Open recent events panel"
            isActive={activePanel === 'recent-events'}
            onClick={() => onPanelNavigate('recent-events')}
          />
        </div>
      </section>
    );
  }

  if (activeWorkspace === 'tenants') {
    return (
      <section
        id="tenants-workspace"
        className="mt-6 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_24px_60px_rgba(15,23,42,0.06)]"
      >
        <div className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-700">
          Tenant directory
        </div>
        <h2 className="mt-3 text-2xl font-bold tracking-tight text-slate-950">
          Review tenant scope before opening a mutable workspace
        </h2>
        <div className="mt-5 grid gap-4 md:grid-cols-4">
          <InsightCard label="Tenant count" value={`${tenantsCount} tenants`} detail="The directory keeps every tenant available from one enterprise list." />
          <InsightCard label="Current tenant" value={selectedTenantName ?? 'No tenant selected'} detail="Selection persists so the detail workspace can pick up the same context." />
          <InsightCard label="Members" value={`${selectedTenantMembersCount}`} detail="Use this as a quick ownership and access signal before opening role controls." />
          <InsightCard label="Services" value={`${selectedTenantServicesCount}`} detail="Published and draft supply stays visible before entering the editable workspace." />
        </div>
        <div className="mt-5 rounded-[1.6rem] border border-amber-200 bg-amber-50 p-4">
          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-700">
            Directory guideline
          </div>
          <h3 className="mt-2 text-lg font-semibold text-slate-950">
            Confirm tenant identity, status, and health posture before editing
          </h3>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            This keeps search and selection lightweight while the deeper mutation flows remain
            inside the dedicated Tenant Workspace.
          </p>
        </div>
        <div className="mt-5 flex flex-wrap gap-3">
          <PanelLink
            label="Open tenant directory"
            isActive={activePanel === 'tenant-directory'}
            onClick={() => onPanelNavigate('tenant-directory')}
          />
        </div>
      </section>
    );
  }

  if (activeWorkspace === 'tenant-workspace') {
    return (
      <section
        id="tenant-detail-workspace"
        className="mt-6 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_24px_60px_rgba(15,23,42,0.06)]"
      >
        <div className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-700">
          Tenant workspace
        </div>
        <h2 className="mt-3 text-2xl font-bold tracking-tight text-slate-950">
          Manage each enterprise tenant as a clear operating surface
        </h2>
        <div className="mt-5 grid gap-4 md:grid-cols-4">
          <InsightCard label="Tenant directory" value={`${tenantsCount} tenants`} detail="Every tenant stays available from one internal control surface." />
          <InsightCard label="Current tenant" value={selectedTenantName ?? 'No tenant selected'} detail="Profile, branding, HTML content, and access changes follow this context." />
          <InsightCard label="Team access" value={`${selectedTenantMembersCount} members`} detail="Use role and status controls to move tenant ownership safely." />
          <InsightCard label="Tenant catalog" value={`${selectedTenantServicesCount} services`} detail="Products and services can be edited directly without leaving admin." />
        </div>
        <div className="mt-5 rounded-[1.6rem] border border-amber-200 bg-amber-50 p-4">
          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-700">
            Workspace guideline
          </div>
          <h3 className="mt-2 text-lg font-semibold text-slate-950">
            Update tenant identity first, then roles, then publishable catalog data
          </h3>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            This keeps branding, HTML introduction, and team permissions aligned before operators
            change customer-facing products or services.
          </p>
        </div>
        <div className="mt-5 flex flex-wrap gap-3">
          <PanelLink
            label="Open tenant directory"
            isActive={activePanel === 'tenant-directory'}
            onClick={() => onPanelNavigate('tenant-directory')}
          />
          <PanelLink
            label="Open tenant profile"
            isActive={activePanel === 'tenant-profile'}
            onClick={() => onPanelNavigate('tenant-profile')}
          />
          <PanelLink
            label="Open tenant team"
            isActive={activePanel === 'tenant-team'}
            onClick={() => onPanelNavigate('tenant-team')}
          />
          <PanelLink
            label="Open tenant services"
            isActive={activePanel === 'tenant-services'}
            onClick={() => onPanelNavigate('tenant-services')}
          />
        </div>
      </section>
    );
  }

  if (activeWorkspace === 'catalog') {
    return (
      <section
        id="catalog-workspace"
        className="mt-6 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_24px_60px_rgba(15,23,42,0.06)]"
      >
        <div className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-700">
          Catalog workspace
        </div>
        <h2 className="mt-3 text-2xl font-bold tracking-tight text-slate-950">
          Keep service supply and partner presentation linked to the admin source of truth
        </h2>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <InsightCard label="Imported services" value={`${importedServicesCount}`} detail="Service rows available from website import." />
          <InsightCard label="Partner profiles" value={`${partnersCount}`} detail="Profiles ready for public ecosystem presentation." />
          <InsightCard label="Catalog scope" value="Admin-managed" detail="Writes still flow through existing admin backend routes." />
        </div>
        <div className="mt-5 flex flex-wrap gap-3">
          <PanelLink
            label="Open service catalog panel"
            isActive={activePanel === 'service-catalog'}
            onClick={() => onPanelNavigate('service-catalog')}
          />
          <PanelLink
            label="Open partners panel"
            isActive={activePanel === 'partners'}
            onClick={() => onPanelNavigate('partners')}
          />
        </div>
      </section>
    );
  }

  if (activeWorkspace === 'billing-support') {
    return (
      <section
        id="billing-support-workspace"
        className="mt-6 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_24px_60px_rgba(15,23,42,0.06)]"
      >
        <div className="text-xs font-semibold uppercase tracking-[0.22em] text-rose-700">
          Billing support
        </div>
        <h2 className="mt-3 text-2xl font-bold tracking-tight text-slate-950">
          Keep payment attention and customer follow-up in one operator lane
        </h2>
        <div className="mt-5 grid gap-4 md:grid-cols-4">
          <InsightCard label="Support queue" value={`${portalSupportQueueCount} queued`} detail="Portal and payment attention items stay together for review." />
          <InsightCard label="Selected booking" value={selectedBookingReference ?? 'No booking selected'} detail="Booking detail follows the current support target." />
          <InsightCard label="Tenant scope" value={selectedTenantName ?? 'Cross-tenant queue'} detail="Switch into tenant context only when the issue needs deeper ownership work." />
          <InsightCard label="Action posture" value={shadowStatus} detail="Use live-vs-shadow posture before escalating or retrying support actions." />
        </div>
        <div className="mt-5 flex flex-wrap gap-3">
          <PanelLink
            label="Open support queue"
            isActive={activePanel === 'portal-support'}
            onClick={() => onPanelNavigate('portal-support')}
          />
          <PanelLink
            label="Open selected booking"
            isActive={activePanel === 'selected-booking'}
            onClick={() => onPanelNavigate('selected-booking')}
          />
        </div>
      </section>
    );
  }

  if (activeWorkspace === 'integrations') {
    return (
      <section
        id="integrations-workspace"
        className="mt-6 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_24px_60px_rgba(15,23,42,0.06)]"
      >
        <div className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-700">
          Integrations
        </div>
        <h2 className="mt-3 text-2xl font-bold tracking-tight text-slate-950">
          Review CRM, email, webhook, and provider posture before operators intervene
        </h2>
        <div className="mt-5 grid gap-4 md:grid-cols-4">
          <InsightCard label="Recent events" value={`${Math.min(4, portalSupportQueueCount + 4)} surfaced`} detail="Use communication and system events as the current integration pulse." />
          <InsightCard label="Tenant linkage" value={selectedTenantName ?? 'Platform-wide view'} detail="Tenant context stays visible when an integration issue is scoped to one workspace." />
          <InsightCard label="Config visibility" value={`${configItemsCount} config items`} detail="Provider setup remains one click away when the issue looks environmental." />
          <InsightCard label="Route visibility" value={`${apiRoutesCount} routes`} detail="Contract review remains available when an integration looks like an API mismatch." />
        </div>
        <div className="mt-5 rounded-[1.6rem] border border-emerald-200 bg-emerald-50 p-4">
          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">
            Operator guidance
          </div>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Treat this lane as the cross-system review surface for Zoho, email, webhook, and
            provider-driven exceptions before dropping into reliability or platform settings.
          </p>
        </div>
        <div className="mt-5 flex flex-wrap gap-3">
          <PanelLink
            label="Open integration health"
            isActive={activePanel === 'integrations-health'}
            onClick={() => onPanelNavigate('integrations-health')}
          />
          <PanelLink
            label="Open recent events"
            isActive={activePanel === 'recent-events'}
            onClick={() => onPanelNavigate('recent-events')}
          />
        </div>
      </section>
    );
  }

  if (activeWorkspace === 'reliability') {
    return (
      <section
        id="reliability-workspace"
        className="mt-6 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_24px_60px_rgba(15,23,42,0.06)]"
      >
        <div className="text-xs font-semibold uppercase tracking-[0.22em] text-violet-700">
          Reliability workspace
        </div>
        <h2 className="mt-3 text-2xl font-bold tracking-tight text-slate-950">
          Review Prompt 5 or Prompt 11 signals before they become rollout risk
        </h2>
        <div className="mt-5 grid gap-4 md:grid-cols-4">
          <InsightCard label="Retry attention" value={shadowStatus} detail="Use compare health plus Prompt 11 preview as the first triage frame." />
          <InsightCard label="Config coverage" value={`${configItemsCount} items`} detail="Current admin-visible configuration inventory." />
          <InsightCard label="API inventory" value={`${apiRoutesCount} routes`} detail="Backend surfaces exposed to the reliability workspace." />
          <InsightCard
            label="Selected service context"
            value={selectedServiceId ?? 'No selected service'}
            detail="Prompt 5 preview inherits this context when a booking is selected."
          />
        </div>
        <div className="mt-5 rounded-[1.6rem] border border-violet-200 bg-violet-50 p-4">
          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-violet-700">
            Reliability triage
          </div>
          <h3 className="mt-2 text-lg font-semibold text-slate-950">
            Start from the issue lane, then jump into the matching reliability panel
          </h3>
          <div className="mt-4 grid gap-3 lg:grid-cols-3">
            <TriageLaunchCard
              label="Operator action lane"
              value="Prompt 11 triage and retry posture"
              detail="Open Prompt 5 and Prompt 11 reliability reads when operators need to review retry posture or immediate action items."
              actionLabel="Review operator action lane"
              isActive={activePanel === 'prompt5-preview'}
              onClick={() => onPanelNavigate('prompt5-preview')}
            />
            <TriageLaunchCard
              label="Config risk review"
              value={`${configItemsCount} config items`}
              detail="Jump straight into live configuration when rollout risk looks like environment or provider setup drift."
              actionLabel="Review config risk"
              isActive={activePanel === 'live-configuration'}
              onClick={() => onPanelNavigate('live-configuration')}
            />
            <TriageLaunchCard
              label="Contract review"
              value={`${apiRoutesCount} visible routes`}
              detail="Open the API inventory when the issue looks like route coverage, panel contract drift, or backend surface mismatch."
              actionLabel="Review contract coverage"
              isActive={activePanel === 'api-inventory'}
              onClick={() => onPanelNavigate('api-inventory')}
            />
          </div>
        </div>
        <div className="mt-5 flex flex-wrap gap-3">
          <PanelLink
            label="Open Prompt 5 preview panel"
            isActive={activePanel === 'prompt5-preview'}
            onClick={() => onPanelNavigate('prompt5-preview')}
          />
          <PanelLink
            label="Open live configuration panel"
            isActive={activePanel === 'live-configuration'}
            onClick={() => onPanelNavigate('live-configuration')}
          />
          <PanelLink
            label="Open API inventory panel"
            isActive={activePanel === 'api-inventory'}
            onClick={() => onPanelNavigate('api-inventory')}
          />
        </div>
      </section>
    );
  }

  if (activeWorkspace === 'messaging') {
    return (
      <section
        id="messaging-workspace"
        className="mt-6 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_24px_60px_rgba(15,23,42,0.06)]"
      >
        <div className="text-xs font-semibold uppercase tracking-[0.22em] text-fuchsia-700">
          Messaging workspace
        </div>
        <h2 className="mt-3 text-2xl font-bold tracking-tight text-slate-950">
          Review communication posture before operators retry or escalate
        </h2>
        <div className="mt-5 grid gap-4 md:grid-cols-4">
          <InsightCard label="Visible messages" value={`${messagingCount}`} detail="Cross-channel items loaded into the current admin workspace." />
          <InsightCard label="Needs attention" value={`${messagingAttentionCount}`} detail="Failed, retrying, pending, or manual-review communication posture." />
          <InsightCard label="Tenant linkage" value={selectedTenantName ?? 'Platform-wide'} detail="Tenant selection can narrow operator review without hiding cross-tenant issues." />
          <InsightCard label="Action posture" value="Read-first" detail="Open detail first, then retry or mark manual follow-up when the record is eligible." />
        </div>
        <div className="mt-5 flex flex-wrap gap-3">
          <PanelLink
            label="Open messaging list"
            isActive={activePanel === 'messaging-list'}
            onClick={() => onPanelNavigate('messaging-list')}
          />
          <PanelLink
            label="Open message detail"
            isActive={activePanel === 'message-detail'}
            onClick={() => onPanelNavigate('message-detail')}
          />
        </div>
      </section>
    );
  }

  if (activeWorkspace === 'audit-activity') {
    return (
      <section
        id="audit-activity-workspace"
        className="mt-6 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_24px_60px_rgba(15,23,42,0.06)]"
      >
        <div className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-700">
          Audit and activity
        </div>
        <h2 className="mt-3 text-2xl font-bold tracking-tight text-slate-950">
          Keep operator chronology easy to review before handoff or escalation
        </h2>
        <div className="mt-5 grid gap-4 md:grid-cols-4">
          <InsightCard label="Recent events" value="Live activity feed" detail="Inbound, outbound, and system events stay available for operator replay." />
          <InsightCard label="Support queue linkage" value={`${portalSupportQueueCount} queue items`} detail="Use queue state to understand whether follow-up remains open or already resolved." />
          <InsightCard label="Current booking" value={selectedBookingReference ?? 'No booking selected'} detail="Audit review can still pivot straight into booking detail when needed." />
          <InsightCard label="Tenant scope" value={selectedTenantName ?? 'Platform-wide'} detail="The same audit lane can review cross-tenant or one-tenant operator activity." />
        </div>
        <div className="mt-5 flex flex-wrap gap-3">
          <PanelLink
            label="Open audit events"
            isActive={activePanel === 'audit-events' || activePanel === 'recent-events'}
            onClick={() => onPanelNavigate('audit-events')}
          />
        </div>
      </section>
    );
  }

  return (
    <section
      id="platform-settings-workspace"
      className="mt-6 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_24px_60px_rgba(15,23,42,0.06)]"
    >
      <div className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-700">
        Platform settings
      </div>
      <h2 className="mt-3 text-2xl font-bold tracking-tight text-slate-950">
        Review admin-visible configuration and contracts before rollout-safe changes
      </h2>
      <div className="mt-5 grid gap-4 md:grid-cols-4">
        <InsightCard label="Config items" value={`${configItemsCount}`} detail="Environment-backed provider and runtime visibility exposed to admin." />
        <InsightCard label="API routes" value={`${apiRoutesCount}`} detail="Use the route inventory when a rollout needs contract confirmation." />
        <InsightCard label="Selected service" value={selectedServiceId ?? 'No selected service'} detail="Service context remains available while checking platform posture." />
        <InsightCard label="Admin posture" value="Read-first" detail="Keep platform review safe and explicit before touching tenant-facing flows." />
      </div>
      <div className="mt-5 flex flex-wrap gap-3">
        <PanelLink
          label="Open live configuration"
          isActive={activePanel === 'live-configuration'}
          onClick={() => onPanelNavigate('live-configuration')}
        />
        <PanelLink
          label="Open API inventory"
          isActive={activePanel === 'api-inventory'}
          onClick={() => onPanelNavigate('api-inventory')}
        />
      </div>
    </section>
  );
}

type InsightCardProps = {
  label: string;
  value: string;
  detail: string;
};

function InsightCard({ label, value, detail }: InsightCardProps) {
  return (
    <article className="rounded-[1.4rem] border border-slate-200 bg-slate-50 p-4">
      <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
        {label}
      </div>
      <div className="mt-3 text-lg font-semibold text-slate-950">{value}</div>
      <p className="mt-2 text-sm leading-6 text-slate-600">{detail}</p>
    </article>
  );
}

type PanelLinkProps = {
  label: string;
  isActive: boolean;
  onClick: () => void;
};

function PanelLink({ label, isActive, onClick }: PanelLinkProps) {
  return (
    <button
      type="button"
      aria-pressed={isActive}
      onClick={onClick}
      className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
        isActive
          ? 'bg-slate-950 text-white shadow-[0_12px_30px_rgba(15,23,42,0.18)]'
          : 'border border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
      }`}
    >
      {label}
    </button>
  );
}

type TriageLaunchCardProps = {
  label: string;
  value: string;
  detail: string;
  actionLabel: string;
  isActive: boolean;
  onClick: () => void;
};

function TriageLaunchCard({
  label,
  value,
  detail,
  actionLabel,
  isActive,
  onClick,
}: TriageLaunchCardProps) {
  return (
    <article
      className={`rounded-[1.4rem] border p-4 ${
        isActive ? 'border-violet-300 bg-white' : 'border-violet-200/80 bg-white/80'
      }`}
    >
      <div className="text-xs font-semibold uppercase tracking-[0.16em] text-violet-700">
        {label}
      </div>
      <div className="mt-3 text-lg font-semibold text-slate-950">{value}</div>
      <p className="mt-2 text-sm leading-6 text-slate-600">{detail}</p>
      <button
        type="button"
        aria-pressed={isActive}
        onClick={onClick}
        className={`mt-4 rounded-full px-4 py-2 text-sm font-semibold transition ${
          isActive
            ? 'bg-slate-950 text-white shadow-[0_12px_30px_rgba(15,23,42,0.18)]'
            : 'border border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
        }`}
      >
        {actionLabel}
      </button>
    </article>
  );
}
