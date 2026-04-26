import {
  Bell,
  Info,
  LogOut,
  RefreshCw,
  Settings,
  ShieldCheck,
  UserRound,
} from 'lucide-react';
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
  const primaryMetrics = metrics.slice(0, 4);
  const metricDetails: Record<string, string> = {
    'Bookings captured':
      'Total booking records visible in the admin feed. Use this as the top-line volume signal.',
    'AI capture rate (30d)':
      'Share of recent customer sessions that became a captured booking signal in the last 30 days.',
    'Missed revenue (30d)':
      'Estimated revenue at risk from sessions that did not convert into confirmed booking flow.',
    'Stripe-ready checkouts':
      'Bookings that have enough payment posture to move into checkout or payment follow-up.',
  };

  return (
    <header className="booked-admin-topbar">
      <div className="flex min-w-0 flex-1 items-center gap-4">
        <div className="shrink-0">
          <div className="rounded-2xl border border-slate-200 bg-white px-3 py-2 shadow-[0_10px_28px_rgba(15,23,42,0.06)]">
            <LogoMark
              variant="black"
              alt={`${brandName} logo`}
              className="booked-brand-image booked-brand-image--admin booked-brand-image--frameless"
            />
          </div>
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
            <span>admin.bookedai.au</span>
            <span className="hidden h-1 w-1 rounded-full bg-slate-300 sm:inline-block" />
            <span className="hidden text-sky-700 sm:inline">{brandDescriptor}</span>
          </div>
          <h1 className="mt-1 truncate text-xl font-semibold tracking-tight text-slate-950">
            {brandName} enterprise admin
          </h1>
          <p className="mt-1 hidden max-w-3xl text-sm leading-6 text-slate-500 lg:block">
            Revenue readiness, tenant operations, workflow callbacks, inbox visibility, and live
            configuration for {brandDomainLabel}.
          </p>
        </div>
      </div>

      <div className="booked-admin-topbar-actions">
        <div className="hidden items-center gap-2 rounded-2xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800 md:flex">
          <ShieldCheck className="h-4 w-4" aria-hidden="true" />
          Live secure
        </div>
        <a
          href="#platform-settings"
          className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 transition hover:border-slate-300 hover:text-slate-950"
          title="Open platform settings"
          aria-label="Open platform settings"
        >
          <Settings className="h-4 w-4" aria-hidden="true" />
        </a>
        <button
          type="button"
          className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 transition hover:border-slate-300 hover:text-slate-950"
          title="Notifications"
          aria-label="Notifications"
        >
          <Bell className="h-4 w-4" aria-hidden="true" />
        </button>
        <div className="booked-admin-session-card">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-slate-950 text-white">
            <UserRound className="h-3.5 w-3.5" aria-hidden="true" />
          </span>
          <span className="min-w-0">
            <span className="booked-admin-session-primary">
              Signed in as {username}
              {sessionExpiry ? ` until ${formatDateTime(sessionExpiry)}` : ''}
            </span>
            <span className="booked-admin-session-secondary">
              {sessionExpiry ? 'Protected admin session' : 'Session active'}
            </span>
          </span>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          disabled={loadingDashboard}
          className="inline-flex h-10 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
          aria-label="Refresh"
        >
          <RefreshCw className={`h-4 w-4 ${loadingDashboard ? 'animate-spin' : ''}`} aria-hidden="true" />
          <span className="hidden sm:inline">{loadingDashboard ? 'Refreshing' : 'Refresh'}</span>
        </button>
        <button
          type="button"
          onClick={onLogout}
          className="inline-flex h-10 items-center gap-2 rounded-2xl bg-slate-950 px-3 text-sm font-semibold text-white shadow-[0_12px_30px_rgba(15,23,42,0.2)] transition hover:bg-slate-800"
          aria-label="Log out"
        >
          <LogOut className="h-4 w-4" aria-hidden="true" />
          <span className="hidden sm:inline">Log out</span>
        </button>
      </div>

      {primaryMetrics.length > 0 ? (
        <div className="booked-admin-topbar-metrics">
          {primaryMetrics.map((metric) => (
            <article
              key={metric.label}
              className={`booked-admin-topbar-metric ${metricToneClass(metric.tone)}`}
              title={metricDetails[metric.label]}
            >
              <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-black/45">
                <span className="min-w-0 truncate">{metric.label}</span>
                {metricDetails[metric.label] ? (
                  <Info className="h-3 w-3 shrink-0 text-slate-400" aria-hidden="true" />
                ) : null}
              </div>
              <div className="mt-1 truncate text-lg font-semibold tracking-tight text-slate-950">
                {metric.value}
              </div>
            </article>
          ))}
        </div>
      ) : null}
    </header>
  );
}
