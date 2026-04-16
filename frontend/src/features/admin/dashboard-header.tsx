import { AdminMetricCard, formatDateTime, metricToneClass } from './types';

type AdminDashboardHeaderProps = {
  username: string;
  sessionExpiry: string;
  loadingDashboard: boolean;
  metrics: AdminMetricCard[];
  onRefresh: () => void;
  onLogout: () => void;
};

export function AdminDashboardHeader({
  username,
  sessionExpiry,
  loadingDashboard,
  metrics,
  onRefresh,
  onLogout,
}: AdminDashboardHeaderProps) {
  return (
    <section className="apple-card p-6">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="text-sm font-semibold text-[#0071e3]">
            admin.bookedai.au
          </div>
          <h1 className="apple-title mt-3 text-3xl font-semibold text-[#1d1d1f]">BookedAI admin dashboard</h1>
          <p className="apple-body mt-2 text-sm leading-7">
            Monitor bookings, payment readiness, workflow callbacks, inbox visibility, and
            live configuration from one dashboard.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="rounded-full bg-[#f5f5f7] px-4 py-2 text-xs font-semibold text-black/60">
            Signed in as {username}
            {sessionExpiry ? ` until ${formatDateTime(sessionExpiry)}` : ''}
          </div>
          <button
            type="button"
            onClick={onRefresh}
            disabled={loadingDashboard}
            className="apple-button-secondary px-4 py-2 text-sm font-semibold disabled:opacity-60"
          >
            {loadingDashboard ? 'Refreshing...' : 'Refresh'}
          </button>
          <button
            type="button"
            onClick={onLogout}
            className="apple-button px-4 py-2 text-sm font-semibold"
          >
            Log out
          </button>
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <article
            key={metric.label}
            className={`rounded-[1.5rem] p-5 ${metricToneClass(metric.tone)}`}
          >
            <div className="text-xs font-semibold uppercase tracking-[0.08em] text-black/48">
              {metric.label}
            </div>
            <div className="mt-3 text-3xl font-semibold tracking-[-0.03em] text-[#1d1d1f]">{metric.value}</div>
          </article>
        ))}
      </div>
    </section>
  );
}
