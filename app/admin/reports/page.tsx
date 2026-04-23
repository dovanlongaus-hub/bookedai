import { PageHeader } from "@/components/admin/shared/page-header";
import { SupportModePageBanner } from "@/components/admin/shared/support-mode-page-banner";
import { AdminBadge } from "@/components/ui/admin-badge";
import { AdminCard } from "@/components/ui/admin-card";
import { AdminButton } from "@/components/ui/admin-button";
import { AdminInput } from "@/components/ui/admin-input";
import { getAdminRepository } from "@/lib/db/admin-repository";
import { getZohoDealOutcomeSummary } from "@/lib/integrations/zoho-deal-feedback";
import { requirePermission } from "@/lib/rbac/policies";
import { getTenantContext } from "@/lib/tenant/context";

type SearchParams =
  | Promise<Record<string, string | string[] | undefined>>
  | Record<string, string | string[] | undefined>;

function formatMoney(cents: number) {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
  }).format(cents / 100);
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams?: SearchParams;
}) {
  await requirePermission("reports:view");
  const params = await Promise.resolve(searchParams ?? {});
  const tenant = await getTenantContext();
  const repository = getAdminRepository();
  const source = typeof params.source === "string" ? params.source : "all";
  const owner = typeof params.owner === "string" ? params.owner : "all";
  const dateFrom = typeof params.date_from === "string" ? params.date_from : "";
  const dateTo = typeof params.date_to === "string" ? params.date_to : "";
  const [snapshot, customers, leads, dealFeedback] = await Promise.all([
    repository.getReportsSnapshot(tenant.tenantId, {
      source,
      owner,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
    }),
    repository.listCustomers({ tenantId: tenant.tenantId, page: 1, pageSize: 1000 }),
    repository.listLeads({ tenantId: tenant.tenantId, page: 1, pageSize: 1000 }),
    getZohoDealOutcomeSummary(),
  ]);
  const sourceOptions = Array.from(
    new Set([
      ...customers.items.map((customer) => customer.sourceLabel),
      ...leads.items.map((lead) => lead.source),
    ]),
  ).sort((left, right) => left.localeCompare(right));
  const ownerOptions = Array.from(
    new Set(leads.items.map((lead) => lead.ownerName).filter((value): value is string => Boolean(value))),
  ).sort((left, right) => left.localeCompare(right));

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Phase 6"
        title="Reports workspace"
        description="This reporting lane separates finance and collections analysis from the day-to-day operator dashboard: paid versus unpaid trend, aging, recovered revenue, and collection priority all live in one read model."
      />
      <SupportModePageBanner
        scopeLabel="Reports workspace"
        tenantPanel="billing"
        adminPath="/admin/reports"
      />

      <AdminCard className="p-6">
        <div>
          <h2 className="text-lg font-semibold text-slate-950">Drill-down filters</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Narrow the reporting scope by source, owner, and date range so all charts and tables reflect the same slice.
          </p>
        </div>
        <form className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-5" action="/admin/reports">
          <select
            name="source"
            defaultValue={source}
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900"
          >
            <option value="all">All sources</option>
            {sourceOptions.map((option) => (
              <option key={option} value={option}>
                {option.replace(/_/g, " ")}
              </option>
            ))}
          </select>
          <select
            name="owner"
            defaultValue={owner}
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900"
          >
            <option value="all">All owners</option>
            {ownerOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          <AdminInput name="date_from" type="date" defaultValue={dateFrom} />
          <AdminInput name="date_to" type="date" defaultValue={dateTo} />
          <div className="flex gap-3">
            <AdminButton type="submit" variant="secondary">Apply filters</AdminButton>
            <a href="/admin/reports" className="inline-flex">
              <AdminButton type="button" variant="ghost">Reset</AdminButton>
            </a>
          </div>
        </form>
      </AdminCard>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Paid revenue"
          value={formatMoney(snapshot.summary.paidRevenueCents)}
          hint="Revenue already realized in the payment ledger."
        />
        <MetricCard
          label="Outstanding revenue"
          value={formatMoney(snapshot.summary.outstandingRevenueCents)}
          hint="Booked value still waiting for collection."
        />
        <MetricCard
          label="Recovered revenue"
          value={formatMoney(snapshot.summary.recoveredRevenueCents)}
          hint="Payments collected after the scheduled booking date."
        />
        <MetricCard
          label="Collection coverage"
          value={`${Math.round(snapshot.summary.collectionCoverageRate * 100)}%`}
          hint="Paid revenue compared with paid plus outstanding booked value."
        />
      </div>

      <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-3">
        <MetricCard
          label="Zoho deals won"
          value={String(dealFeedback.summary.won_count)}
          hint="Commercial wins fed back from Zoho CRM."
        />
        <MetricCard
          label="Zoho deals lost"
          value={String(dealFeedback.summary.lost_count)}
          hint="Closed lost outcomes now visible in BookedAI reporting."
        />
        <MetricCard
          label="Zoho won revenue"
          value={formatMoney(dealFeedback.summary.won_revenue_cents)}
          hint="Revenue attached to won deals reported back from Zoho."
        />
        <MetricCard
          label="Zoho win rate"
          value={`${Math.round(dealFeedback.summary.win_rate * 100)}%`}
          hint="Won share across all commercial close feedback rows."
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-2">
        <MetricCard
          label="Repeat revenue"
          value={formatMoney(snapshot.summary.repeatRevenueCents)}
          hint="Revenue contributed by customers with more than one booking."
        />
        <MetricCard
          label="Repeat customer rate"
          value={`${Math.round(snapshot.summary.repeatCustomerRate * 100)}%`}
          hint="Share of customers who have already booked more than once."
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
        <StackedTrendCard
          title="Paid vs unpaid trend"
          subtitle="Recent booking dates grouped into realized versus still-outstanding value."
          items={snapshot.paidUnpaidTrend}
        />
        <ChartCard
          title="Recovered revenue"
          subtitle="Revenue captured after the booking date, useful for tracking collection recovery."
          items={snapshot.recoveredRevenueSeries.map((item) => ({
            label: item.label,
            value: item.valueCents,
            display: formatMoney(item.valueCents),
          }))}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)]">
        <AdminCard className="p-6">
          <h2 className="text-lg font-semibold text-slate-950">Collections aging report</h2>
          <div className="mt-4 space-y-3">
            {snapshot.agingSeries.map((item) => (
              <div
                key={item.label}
                className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
              >
                <div>
                  <div className="font-semibold text-slate-950">{item.label}</div>
                  <div className="mt-1 text-sm text-slate-600">{item.count} bookings in this bucket</div>
                </div>
                <div className="text-sm font-semibold text-slate-950">{formatMoney(item.valueCents)}</div>
              </div>
            ))}
          </div>
        </AdminCard>

        <AdminCard className="p-6">
          <h2 className="text-lg font-semibold text-slate-950">Collection priority report</h2>
          <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                <tr>
                  <th className="px-4 py-3">Booking</th>
                  <th className="px-4 py-3">Aging</th>
                  <th className="px-4 py-3">Payment</th>
                  <th className="px-4 py-3">Outstanding</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {snapshot.collectionQueue.map((item) => (
                  <tr key={item.id}>
                    <td className="px-4 py-4">
                      <div className="font-semibold text-slate-950">
                        {item.customerName} • {item.serviceName}
                      </div>
                      <div className="mt-1 text-slate-600">
                        {item.startAt.slice(0, 16).replace("T", " ")}
                      </div>
                    </td>
                    <td className="px-4 py-4 text-slate-700">
                      <div>{item.overdueDays > 0 ? `${item.overdueDays} days` : "Current"}</div>
                      <div className="mt-1 text-xs text-slate-500">
                        {item.agingBucket.replace(/_/g, " ")}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <AdminBadge
                        tone={
                          item.paymentStatus === "paid"
                            ? "success"
                            : item.paymentStatus === "partially_paid" ||
                                item.paymentStatus === "pending"
                              ? "warning"
                              : item.paymentStatus === "failed"
                                ? "danger"
                                : "default"
                        }
                      >
                        {item.paymentStatus.replace(/_/g, " ")}
                      </AdminBadge>
                    </td>
                    <td className="px-4 py-4 text-slate-700">
                      <div>{formatMoney(item.outstandingValueCents)}</div>
                      <div className="mt-1 text-xs text-slate-500">
                        Paid {formatMoney(item.paidValueCents)}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </AdminCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <ChartCard
          title="Repeat revenue trend"
          subtitle="Recent revenue generated by repeat customers only."
          items={snapshot.repeatRevenueSeries.map((item) => ({
            label: item.label,
            value: item.valueCents,
            display: formatMoney(item.valueCents),
          }))}
        />

        <AdminCard className="p-6">
          <h2 className="text-lg font-semibold text-slate-950">Retention segments</h2>
          <div className="mt-4 space-y-3">
            {snapshot.retentionSegments.map((segment) => (
              <div
                key={segment.label}
                className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
              >
                <div>
                  <div className="font-semibold text-slate-950">{segment.label}</div>
                  <div className="mt-1 text-sm text-slate-600">
                    {segment.customerCount} customers
                  </div>
                </div>
                <div className="text-sm font-semibold text-slate-950">
                  {formatMoney(segment.revenueCents)}
                </div>
              </div>
            ))}
          </div>
        </AdminCard>
      </div>

      <AdminCard className="p-6">
        <h2 className="text-lg font-semibold text-slate-950">Source-to-revenue attribution</h2>
        <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
              <tr>
                <th className="px-4 py-3">Source</th>
                <th className="px-4 py-3">Customers</th>
                <th className="px-4 py-3">Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {snapshot.sourceAttribution.map((item) => (
                <tr key={item.label}>
                  <td className="px-4 py-4 font-semibold text-slate-950">{item.label}</td>
                  <td className="px-4 py-4 text-slate-700">{item.customerCount}</td>
                  <td className="px-4 py-4 text-slate-700">{formatMoney(item.revenueCents)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </AdminCard>

      <AdminCard className="p-6">
        <h2 className="text-lg font-semibold text-slate-950">
          Source {"->"} lead {"->"} booking {"->"} paid revenue funnel
        </h2>
        <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
              <tr>
                <th className="px-4 py-3">Source</th>
                <th className="px-4 py-3">Leads</th>
                <th className="px-4 py-3">Bookings</th>
                <th className="px-4 py-3">Conversion</th>
                <th className="px-4 py-3">Paid revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {snapshot.sourceFunnel.map((item) => (
                <tr key={item.label}>
                  <td className="px-4 py-4 font-semibold text-slate-950">{item.label}</td>
                  <td className="px-4 py-4 text-slate-700">{item.leadsCount}</td>
                  <td className="px-4 py-4 text-slate-700">{item.bookingsCount}</td>
                  <td className="px-4 py-4 text-slate-700">
                    {Math.round(item.bookingConversionRate * 100)}%
                  </td>
                  <td className="px-4 py-4 text-slate-700">{formatMoney(item.paidRevenueCents)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </AdminCard>

      <AdminCard className="p-6">
        <h2 className="text-lg font-semibold text-slate-950">Zoho deal outcome feedback</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          This is the first inbound CRM intelligence loop: won/lost commercial outcomes from Zoho are now visible in BookedAI reporting without replacing local booking or payment truth.
        </p>
        <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
              <tr>
                <th className="px-4 py-3">Outcome</th>
                <th className="px-4 py-3">Owner</th>
                <th className="px-4 py-3">Stage</th>
                <th className="px-4 py-3">Source</th>
                <th className="px-4 py-3">Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {dealFeedback.items.length ? (
                dealFeedback.items.map((item) => (
                  <tr key={item.id}>
                    <td className="px-4 py-4">
                      <AdminBadge tone={item.outcome === "won" ? "success" : item.outcome === "lost" ? "danger" : "default"}>
                        {(item.outcome || "unknown").replace(/_/g, " ")}
                      </AdminBadge>
                      <div className="mt-1 text-xs text-slate-500">
                        {item.closed_at ? item.closed_at.slice(0, 10) : "No close date"}
                      </div>
                      {item.task_completed ? (
                        <div className="mt-1 text-xs text-emerald-700">
                          Task completed{item.task_completed_at ? ` • ${item.task_completed_at.slice(0, 10)}` : ""}
                        </div>
                      ) : null}
                    </td>
                    <td className="px-4 py-4 text-slate-700">{item.owner_name || "Unassigned"}</td>
                    <td className="px-4 py-4 text-slate-700">{item.stage || "Unknown"}</td>
                    <td className="px-4 py-4 text-slate-700">{item.source_label || "Unknown"}</td>
                    <td className="px-4 py-4 text-slate-700">
                      {formatMoney(item.amount_cents || 0)}
                      {item.lost_reason ? (
                        <div className="mt-1 text-xs text-slate-500">{item.lost_reason}</div>
                      ) : null}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="px-4 py-6 text-sm text-slate-600" colSpan={5}>
                    No Zoho deal outcome feedback has been ingested yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </AdminCard>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <AdminCard className="p-6">
          <h2 className="text-lg font-semibold text-slate-950">Zoho owner performance</h2>
          <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                <tr>
                  <th className="px-4 py-3">Owner</th>
                  <th className="px-4 py-3">Won</th>
                  <th className="px-4 py-3">Lost</th>
                  <th className="px-4 py-3">Won revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {dealFeedback.owner_performance.length ? (
                  dealFeedback.owner_performance.map((item) => (
                    <tr key={item.owner_name}>
                      <td className="px-4 py-4 font-semibold text-slate-950">{item.owner_name}</td>
                      <td className="px-4 py-4 text-slate-700">{item.won_count}</td>
                      <td className="px-4 py-4 text-slate-700">{item.lost_count}</td>
                      <td className="px-4 py-4 text-slate-700">{formatMoney(item.won_revenue_cents)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="px-4 py-6 text-sm text-slate-600" colSpan={4}>
                      No Zoho owner performance data has been ingested yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </AdminCard>

        <AdminCard className="p-6">
          <h2 className="text-lg font-semibold text-slate-950">Zoho lost reasons</h2>
          <div className="mt-4 space-y-3">
            {dealFeedback.lost_reasons.length ? (
              dealFeedback.lost_reasons.map((item) => (
                <div
                  key={item.lost_reason}
                  className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                >
                  <div className="text-sm text-slate-700">{item.lost_reason}</div>
                  <div className="text-sm font-semibold text-slate-950">{item.lost_count}</div>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-600">No Zoho lost reasons have been ingested yet.</p>
            )}
          </div>
        </AdminCard>
      </div>

      <AdminCard className="p-6">
        <h2 className="text-lg font-semibold text-slate-950">Zoho stage and task completion signals</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <MetricCard
            label="Feedback rows"
            value={String(dealFeedback.summary.feedback_count)}
            hint="Total inbound commercial close rows now visible in BookedAI."
          />
          <MetricCard
            label="Stage signals"
            value={String(dealFeedback.summary.stage_signal_count)}
            hint="Rows carrying a concrete Zoho stage marker."
          />
          <MetricCard
            label="Completed tasks"
            value={String(dealFeedback.summary.completed_task_count)}
            hint="Rows reporting follow-up task completion back from Zoho."
          />
        </div>
        <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
              <tr>
                <th className="px-4 py-3">Stage</th>
                <th className="px-4 py-3">Count</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {dealFeedback.stage_breakdown.length ? (
                dealFeedback.stage_breakdown.map((item) => (
                  <tr key={item.stage}>
                    <td className="px-4 py-4 font-semibold text-slate-950">{item.stage}</td>
                    <td className="px-4 py-4 text-slate-700">{item.stage_count}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="px-4 py-6 text-sm text-slate-600" colSpan={2}>
                    No Zoho stage signals have been ingested yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </AdminCard>
    </div>
  );
}

function MetricCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <AdminCard className="p-5">
      <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
        {label}
      </div>
      <div className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">{value}</div>
      <div className="mt-2 text-sm leading-6 text-slate-600">{hint}</div>
    </AdminCard>
  );
}

function ChartCard({
  title,
  subtitle,
  items,
}: {
  title: string;
  subtitle: string;
  items: Array<{ label: string; value: number; display: string }>;
}) {
  const max = Math.max(...items.map((item) => item.value), 1);

  return (
    <AdminCard className="p-6">
      <h2 className="text-lg font-semibold text-slate-950">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-slate-600">{subtitle}</p>
      <div className="mt-6 space-y-4">
        {items.length ? (
          items.map((item) => (
            <div key={item.label} className="space-y-2">
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="text-slate-700">{item.label}</span>
                <span className="text-slate-950">{item.display}</span>
              </div>
              <div className="h-2 rounded-full bg-slate-100">
                <div
                  className="h-2 rounded-full bg-slate-950"
                  style={{ width: `${Math.max((item.value / max) * 100, 6)}%` }}
                />
              </div>
            </div>
          ))
        ) : (
          <p className="text-sm text-slate-600">No report data available yet.</p>
        )}
      </div>
    </AdminCard>
  );
}

function StackedTrendCard({
  title,
  subtitle,
  items,
}: {
  title: string;
  subtitle: string;
  items: Array<{ label: string; paidCents: number; unpaidCents: number }>;
}) {
  const max = Math.max(...items.map((item) => item.paidCents + item.unpaidCents), 1);

  return (
    <AdminCard className="p-6">
      <h2 className="text-lg font-semibold text-slate-950">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-slate-600">{subtitle}</p>
      <div className="mt-6 space-y-4">
        {items.length ? (
          items.map((item) => {
            const total = item.paidCents + item.unpaidCents;
            const paidWidth = total > 0 ? (item.paidCents / max) * 100 : 0;
            const unpaidWidth = total > 0 ? (item.unpaidCents / max) * 100 : 0;
            return (
              <div key={item.label} className="space-y-2">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-slate-700">{item.label}</span>
                  <span className="text-slate-950">
                    {formatMoney(item.paidCents)} paid • {formatMoney(item.unpaidCents)} unpaid
                  </span>
                </div>
                <div className="flex h-2 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-2 bg-emerald-500"
                    style={{ width: `${Math.max(paidWidth, item.paidCents > 0 ? 4 : 0)}%` }}
                  />
                  <div
                    className="h-2 bg-amber-400"
                    style={{ width: `${Math.max(unpaidWidth, item.unpaidCents > 0 ? 4 : 0)}%` }}
                  />
                </div>
              </div>
            );
          })
        ) : (
          <p className="text-sm text-slate-600">No trend data available yet.</p>
        )}
      </div>
    </AdminCard>
  );
}
