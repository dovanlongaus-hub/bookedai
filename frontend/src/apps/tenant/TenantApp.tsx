import { useEffect, useMemo, useState } from 'react';

import { ApiClientError } from '../../shared/api/client';
import { apiV1 } from '../../shared/api/v1';
import type {
  TenantBookingsResponse,
  TenantIntegrationsResponse,
  TenantOverviewPriority,
  TenantOverviewResponse,
} from '../../shared/contracts';
import { releaseLabel, releaseVersion } from '../../shared/config/release';

type TenantPanel = 'overview' | 'bookings' | 'integrations';

type TenantLoadState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | {
      status: 'ready';
      overview: TenantOverviewResponse;
      bookings: TenantBookingsResponse;
      integrations: TenantIntegrationsResponse;
    };

function resolveTenantRef() {
  if (typeof window === 'undefined') {
    return null;
  }

  const url = new URL(window.location.href);
  const explicitTenant = url.searchParams.get('tenant');
  if (explicitTenant) {
    return explicitTenant;
  }

  const match = window.location.pathname.match(/^\/tenant\/([^/]+)/);
  return match?.[1] ?? null;
}

function resolveInitialPanel(): TenantPanel {
  if (typeof window === 'undefined') {
    return 'overview';
  }

  const hash = window.location.hash.replace('#', '');
  if (hash === 'bookings' || hash === 'integrations') {
    return hash;
  }

  return 'overview';
}

function metricCards(overview: TenantOverviewResponse) {
  return [
    {
      label: 'Leads tracked',
      value: overview.summary.total_leads,
      caption: `${overview.summary.active_leads} active in pipeline`,
    },
    {
      label: 'Booking requests',
      value: overview.summary.booking_requests,
      caption: `${overview.summary.open_booking_requests} still open`,
    },
    {
      label: 'Connected providers',
      value: overview.integration_snapshot.connected_count,
      caption: `${overview.integration_snapshot.attention_count} attention signal(s)`,
    },
  ];
}

function priorityToneClasses(priority: TenantOverviewPriority) {
  switch (priority.tone) {
    case 'attention':
      return 'border-amber-300 bg-amber-50 text-amber-950';
    case 'monitor':
      return 'border-sky-300 bg-sky-50 text-sky-950';
    default:
      return 'border-emerald-300 bg-emerald-50 text-emerald-950';
  }
}

function syncPanelHash(panel: TenantPanel) {
  if (typeof window === 'undefined') {
    return;
  }

  const url = new URL(window.location.href);
  url.hash = panel === 'overview' ? '' : panel;
  window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
}

export function TenantApp() {
  const [panel, setPanel] = useState<TenantPanel>(resolveInitialPanel);
  const [state, setState] = useState<TenantLoadState>({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;

    async function loadTenantShell() {
      try {
        const tenantRef = resolveTenantRef();
        const [overviewEnvelope, bookingsEnvelope, integrationsEnvelope] = await Promise.all([
          apiV1.getTenantOverview(tenantRef),
          apiV1.getTenantBookings(tenantRef),
          apiV1.getTenantIntegrations(tenantRef),
        ]);

        if (cancelled) {
          return;
        }

        if (
          overviewEnvelope.status !== 'ok' ||
          bookingsEnvelope.status !== 'ok' ||
          integrationsEnvelope.status !== 'ok'
        ) {
          setState({ status: 'error', message: 'Tenant read models are not ready yet.' });
          return;
        }

        setState({
          status: 'ready',
          overview: overviewEnvelope.data,
          bookings: bookingsEnvelope.data,
          integrations: integrationsEnvelope.data,
        });
      } catch (error) {
        if (cancelled) {
          return;
        }

        const fallbackMessage =
          error instanceof Error ? error.message : 'Tenant runtime could not be loaded.';
        const apiError = error as ApiClientError | undefined;
        const bodyMessage =
          typeof apiError?.body === 'object' &&
          apiError?.body &&
          'error' in apiError.body &&
          typeof (apiError.body as { error?: { message?: unknown } }).error?.message === 'string'
            ? ((apiError.body as { error?: { message?: string } }).error?.message as string)
            : null;

        setState({
          status: 'error',
          message: bodyMessage ?? fallbackMessage,
        });
      }
    }

    void loadTenantShell();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    syncPanelHash(panel);
  }, [panel]);

  const metrics = useMemo(() => {
    if (state.status !== 'ready') {
      return [];
    }

    return metricCards(state.overview);
  }, [state]);

  if (state.status === 'loading') {
    return (
      <main className="booked-runtime-shell lg:px-8">
        <div className="booked-runtime-card booked-runtime-card--narrow">
          <div className="booked-runtime-eyebrow">Tenant runtime</div>
          <h1 className="booked-title mt-3 text-3xl font-semibold text-slate-950">
            Loading tenant workspace
          </h1>
          <p className="booked-body mt-3 max-w-2xl text-sm leading-6">
            Bookings, integrations, and rollout-safe read models are being prepared for this
            tenant.
          </p>
        </div>
      </main>
    );
  }

  if (state.status === 'error') {
    return (
      <main className="booked-runtime-shell lg:px-8">
        <div className="booked-runtime-card booked-runtime-card--compact max-w-4xl border-rose-200">
          <div className="booked-runtime-eyebrow text-rose-700">Tenant runtime</div>
          <h1 className="booked-title mt-3 text-3xl font-semibold text-slate-950">
            Tenant shell needs attention
          </h1>
          <p className="booked-body mt-3 text-sm leading-6">{state.message}</p>
        </div>
      </main>
    );
  }

  const { overview, bookings, integrations } = state;

  return (
    <main className="booked-shell px-4 py-8 text-slate-950 lg:px-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <section className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-[0_24px_60px_rgba(15,23,42,0.08)]">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-700">
                Tenant shell
              </div>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 lg:text-4xl">
                {overview.tenant.name}
              </h1>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                Role-aware read-only workspace for Sprint 9. Summary stays compact, while detailed
                bookings and integrations are opened panel-by-panel instead of flooding one screen.
              </p>
            </div>

            <div className="grid gap-3 text-sm text-slate-600 sm:grid-cols-2">
              <div className="rounded-[1.25rem] border border-slate-200 bg-slate-50 px-4 py-3">
                <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                  Runtime mode
                </div>
                <div className="mt-1 font-semibold text-slate-900">{overview.shell.current_role}</div>
                <div className="mt-1 text-xs">
                  {overview.shell.read_only ? 'Read-only' : 'Live'} • {overview.shell.deployment_mode}
                </div>
              </div>
              <div className="rounded-[1.25rem] border border-slate-200 bg-slate-50 px-4 py-3">
                <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                  Release
                </div>
                <div className="mt-1 font-semibold text-slate-900">{releaseLabel}</div>
                <div className="mt-1 text-xs">Source {releaseVersion}</div>
              </div>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3 text-xs text-slate-600">
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5">
              Tenant: {overview.tenant.slug}
            </span>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5">
              Status: {overview.tenant.status ?? 'unknown'}
            </span>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5">
              Timezone: {overview.tenant.timezone ?? 'n/a'}
            </span>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5">
              Tenant mode: {overview.shell.tenant_mode_enabled ? 'enabled' : 'gated'}
            </span>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            {([
              { key: 'overview', label: 'Overview' },
              { key: 'bookings', label: 'Bookings' },
              { key: 'integrations', label: 'Integrations' },
            ] as const).map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setPanel(item.key)}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  panel === item.key
                    ? 'bg-slate-950 text-white'
                    : 'border border-slate-200 bg-white text-slate-600'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          {metrics.map((item) => (
            <article
              key={item.label}
              className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-[0_18px_40px_rgba(15,23,42,0.06)]"
            >
              <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                {item.label}
              </div>
              <div className="mt-3 text-4xl font-semibold tracking-tight text-slate-950">
                {item.value}
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-600">{item.caption}</p>
            </article>
          ))}
        </section>

        {panel === 'overview' ? (
          <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <article className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-[0_18px_40px_rgba(15,23,42,0.06)]">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                    Read-heavy slice
                  </div>
                  <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
                    Recent bookings
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setPanel('bookings')}
                  className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600"
                >
                  Open bookings panel
                </button>
              </div>

              <div className="mt-6 space-y-3">
                {overview.recent_bookings.slice(0, 5).map((booking) => (
                  <div
                    key={`${booking.booking_reference ?? 'booking'}-${booking.created_at ?? booking.requested_time ?? ''}`}
                    className="rounded-[1.25rem] border border-slate-200 bg-slate-50 px-4 py-4"
                  >
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div className="text-sm font-semibold text-slate-950">
                          {booking.service_name ?? 'Service request'}
                        </div>
                        <div className="mt-1 text-xs text-slate-600">
                          Ref {booking.booking_reference ?? 'pending'} • {booking.status ?? 'unknown'}
                        </div>
                      </div>
                      <div className="text-xs text-slate-600">
                        {booking.requested_date ?? 'Date tbc'} {booking.requested_time ?? ''}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </article>

            <div className="space-y-6">
              <article className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-[0_18px_40px_rgba(15,23,42,0.06)]">
                <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                  Priorities
                </div>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
                  Operator focus
                </h2>
                <div className="mt-5 space-y-3">
                  {overview.priorities.map((priority) => (
                    <div
                      key={priority.title}
                      className={`rounded-[1.25rem] border px-4 py-4 ${priorityToneClasses(priority)}`}
                    >
                      <div className="text-sm font-semibold">{priority.title}</div>
                      <p className="mt-2 text-sm leading-6 opacity-80">{priority.body}</p>
                    </div>
                  ))}
                </div>
              </article>

              <article className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-[0_18px_40px_rgba(15,23,42,0.06)]">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                      Integration snapshot
                    </div>
                    <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
                      Provider posture
                    </h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPanel('integrations')}
                    className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600"
                  >
                    Open integrations panel
                  </button>
                </div>
                <div className="mt-5 space-y-3">
                  {overview.integration_snapshot.providers.slice(0, 4).map((provider) => (
                    <div
                      key={provider.provider}
                      className="rounded-[1.25rem] border border-slate-200 bg-slate-50 px-4 py-4"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-sm font-semibold text-slate-950">{provider.provider}</div>
                        <div className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-600">
                          {provider.status}
                        </div>
                      </div>
                      <div className="mt-2 text-xs text-slate-600">
                        {provider.sync_mode} • {provider.safe_config.enabled ? 'enabled' : 'not enabled'}
                      </div>
                    </div>
                  ))}
                </div>
              </article>
            </div>
          </section>
        ) : null}

        {panel === 'bookings' ? (
          <section className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
            <article className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-[0_18px_40px_rgba(15,23,42,0.06)]">
              <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                Status mix
              </div>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
                Booking posture
              </h2>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {Object.entries(bookings.status_summary).map(([key, value]) => (
                  <div key={key} className="rounded-[1.25rem] border border-slate-200 bg-slate-50 px-4 py-4">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                      {key.replace(/_/g, ' ')}
                    </div>
                    <div className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">{value}</div>
                  </div>
                ))}
              </div>
            </article>

            <article className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-[0_18px_40px_rgba(15,23,42,0.06)]">
              <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                Recent records
              </div>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
                Booking list
              </h2>
              <div className="mt-5 space-y-3">
                {bookings.items.map((booking) => (
                  <div
                    key={`${booking.booking_reference ?? 'booking'}-${booking.created_at ?? booking.requested_time ?? ''}`}
                    className="rounded-[1.25rem] border border-slate-200 bg-slate-50 px-4 py-4"
                  >
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <div className="text-sm font-semibold text-slate-950">
                          {booking.service_name ?? 'Service request'}
                        </div>
                        <div className="mt-1 text-xs text-slate-600">
                          Ref {booking.booking_reference ?? 'pending'} • {booking.status ?? 'unknown'}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2 text-xs text-slate-600">
                        <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1">
                          {booking.requested_date ?? 'Date tbc'} {booking.requested_time ?? ''}
                        </span>
                        <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1">
                          Confidence {booking.confidence_level ?? 'n/a'}
                        </span>
                        <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1">
                          Payment {booking.payment_dependency_state ?? 'n/a'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </article>
          </section>
        ) : null}

        {panel === 'integrations' ? (
          <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="space-y-6">
              <article className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-[0_18px_40px_rgba(15,23,42,0.06)]">
                <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                  Attention queue
                </div>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
                  Current signals
                </h2>
                <div className="mt-5 space-y-3">
                  {integrations.attention.length ? (
                    integrations.attention.map((item) => (
                      <div
                        key={`${item.source}-${item.issue_type}`}
                        className="rounded-[1.25rem] border border-slate-200 bg-slate-50 px-4 py-4"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="text-sm font-semibold text-slate-950">
                            {item.source.replace(/_/g, ' ')}
                          </div>
                          <div className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-600">
                            {item.severity}
                          </div>
                        </div>
                        <div className="mt-2 text-xs text-slate-600">
                          {item.item_count} item(s) • {item.issue_type}
                        </div>
                        <p className="mt-2 text-sm leading-6 text-slate-600">{item.recommended_action}</p>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-[1.25rem] border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-sm text-slate-600">
                      No elevated attention items in this tenant slice.
                    </div>
                  )}
                </div>
              </article>

              <article className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-[0_18px_40px_rgba(15,23,42,0.06)]">
                <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                  CRM retry backlog
                </div>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
                  Retry posture
                </h2>
                <p className="mt-3 text-sm leading-6 text-slate-600">
                  {integrations.crm_retry_backlog.summary.operator_note}
                </p>
                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-[1.25rem] border border-slate-200 bg-slate-50 px-4 py-4">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                      Retrying
                    </div>
                    <div className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
                      {integrations.crm_retry_backlog.summary.retrying_records}
                    </div>
                  </div>
                  <div className="rounded-[1.25rem] border border-slate-200 bg-slate-50 px-4 py-4">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                      Manual review
                    </div>
                    <div className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
                      {integrations.crm_retry_backlog.summary.manual_review_records}
                    </div>
                  </div>
                  <div className="rounded-[1.25rem] border border-slate-200 bg-slate-50 px-4 py-4">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                      Failed
                    </div>
                    <div className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
                      {integrations.crm_retry_backlog.summary.failed_records}
                    </div>
                  </div>
                </div>
              </article>
            </div>

            <div className="space-y-6">
              <article className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-[0_18px_40px_rgba(15,23,42,0.06)]">
                <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                  Providers
                </div>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
                  Connections
                </h2>
                <div className="mt-5 space-y-3">
                  {integrations.providers.map((provider) => (
                    <div
                      key={provider.provider}
                      className="rounded-[1.25rem] border border-slate-200 bg-slate-50 px-4 py-4"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-sm font-semibold text-slate-950">{provider.provider}</div>
                        <div className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-600">
                          {provider.status}
                        </div>
                      </div>
                      <div className="mt-2 text-xs text-slate-600">
                        {provider.sync_mode} • {provider.safe_config.configured_fields.join(', ') || 'no configured fields'}
                      </div>
                    </div>
                  ))}
                </div>
              </article>

              <article className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-[0_18px_40px_rgba(15,23,42,0.06)]">
                <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                  Reconciliation
                </div>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
                  Section detail
                </h2>
                <div className="mt-5 space-y-3">
                  {integrations.reconciliation.sections.map((section) => (
                    <div
                      key={section.area}
                      className="rounded-[1.25rem] border border-slate-200 bg-slate-50 px-4 py-4"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-sm font-semibold text-slate-950">
                          {section.area.replace(/_/g, ' ')}
                        </div>
                        <div className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-600">
                          {section.status}
                        </div>
                      </div>
                      <div className="mt-2 text-xs text-slate-600">
                        total {section.total_count} • pending {section.pending_count} • failed {section.failed_count}
                      </div>
                      <p className="mt-2 text-sm leading-6 text-slate-600">{section.recommended_action}</p>
                    </div>
                  ))}
                </div>
              </article>
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}
