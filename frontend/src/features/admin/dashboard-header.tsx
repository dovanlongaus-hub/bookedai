import { AdminMetricCard, formatDateTime, metricToneClass } from './types';
import { brandDescriptor, brandDomainLabel, brandName } from '../../components/landing/data';
import { LogoMark } from '../../components/landing/ui/LogoMark';

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
    <section className="template-card p-6">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex items-start gap-4">
          <div className="shrink-0 pt-1">
            <LogoMark
              alt={`${brandName} logo`}
              className="booked-brand-image booked-brand-image--admin booked-brand-image--frameless"
            />
          </div>
          <div>
            <div className="template-kicker text-sm tracking-[0.14em]">
              admin.bookedai.au
            </div>
            <h1 className="template-title mt-3 text-3xl font-semibold text-[#1d1d1f]">{brandName} admin dashboard</h1>
            <p className="template-body mt-2 text-sm leading-7">
              Monitor revenue readiness, bookings, workflow callbacks, inbox visibility, and
              live configuration for {brandDomainLabel}.
            </p>
            <div className="template-kicker mt-2 text-[11px]">
              {brandDescriptor}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="booked-note-surface px-4 py-2 text-xs font-semibold text-black/60">
            Signed in as {username}
            {sessionExpiry ? ` until ${formatDateTime(sessionExpiry)}` : ''}
          </div>
          <button
            type="button"
            onClick={onRefresh}
            disabled={loadingDashboard}
            className="booked-button-secondary px-4 py-2 text-sm font-semibold disabled:opacity-60"
          >
            {loadingDashboard ? 'Refreshing...' : 'Refresh'}
          </button>
          <button
            type="button"
            onClick={onLogout}
            className="booked-button px-4 py-2 text-sm font-semibold"
          >
            Log out
          </button>
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <article
            key={metric.label}
            className={`booked-stat-card p-5 ${metricToneClass(metric.tone)}`}
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
