import { AdminWorkspaceId, AdminWorkspacePanelId } from './types';

type AdminWorkspaceInsightsProps = {
  activeWorkspace: AdminWorkspaceId;
  activePanel: AdminWorkspacePanelId | null;
  bookingsTotal: number;
  shadowStatus: string;
  importedServicesCount: number;
  partnersCount: number;
  configItemsCount: number;
  apiRoutesCount: number;
  selectedBookingReference?: string | null;
  selectedServiceId?: string | null;
  onPanelNavigate: (panel: AdminWorkspacePanelId) => void;
};

export function AdminWorkspaceInsights({
  activeWorkspace,
  activePanel,
  bookingsTotal,
  shadowStatus,
  importedServicesCount,
  partnersCount,
  configItemsCount,
  apiRoutesCount,
  selectedBookingReference,
  selectedServiceId,
  onPanelNavigate,
}: AdminWorkspaceInsightsProps) {
  if (activeWorkspace === 'operations') {
    return (
      <section
        id="operations-workspace"
        className="mt-6 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_24px_60px_rgba(15,23,42,0.06)]"
      >
        <div className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-700">
          Operations workspace
        </div>
        <h2 className="mt-3 text-2xl font-bold tracking-tight text-slate-950">
          Triage bookings and move operators quickly into the next action
        </h2>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <InsightCard label="Bookings workspace" value={`${bookingsTotal} visible`} detail="Current query and filter result set." />
          <InsightCard label="Shadow compare" value={shadowStatus} detail="Live-vs-shadow read posture for booking operations." />
          <InsightCard
            label="Selected booking"
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
            label="Open recent events panel"
            isActive={activePanel === 'recent-events'}
            onClick={() => onPanelNavigate('recent-events')}
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
