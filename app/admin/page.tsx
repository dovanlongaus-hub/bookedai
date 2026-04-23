import { PageHeader } from "@/components/admin/shared/page-header";
import { SupportModePageBanner } from "@/components/admin/shared/support-mode-page-banner";
import { AdminBadge } from "@/components/ui/admin-badge";
import { AdminCard } from "@/components/ui/admin-card";
import { getZohoDealOutcomeSummary } from "@/lib/integrations/zoho-deal-feedback";
import { requirePermission } from "@/lib/rbac/policies";
import { getTenantContext } from "@/lib/tenant/context";
import { getAdminRepository } from "@/lib/db/admin-repository";

function formatMoney(cents: number) {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
  }).format(cents / 100);
}

export default async function AdminDashboardPage() {
  await requirePermission("dashboard:view");
  const tenant = await getTenantContext();
  const repository = getAdminRepository();
  const [snapshot, dealFeedback] = await Promise.all([
    repository.getDashboardSnapshot(tenant.tenantId),
    getZohoDealOutcomeSummary(),
  ]);
  const auditLogs = await repository.listRecentAuditLogs(tenant.tenantId);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Step 9"
        title="Revenue dashboard"
        description="This dashboard now acts more like a real operating board: KPI cards for revenue and conversion, chart blocks for trend and distribution, and live operational panels for follow-ups and recent bookings."
      />
      <SupportModePageBanner
        scopeLabel="Revenue dashboard"
        tenantPanel="overview"
        adminPath="/admin"
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Revenue this month"
          value={formatMoney(snapshot.summary.monthRevenueCents)}
          hint="Paid payment value currently in view, not just scheduled booking value."
        />
        <MetricCard
          label="Outstanding revenue"
          value={formatMoney(snapshot.summary.outstandingRevenueCents)}
          hint="Booked value still not covered by paid payments."
        />
        <MetricCard
          label="Paid bookings"
          value={String(snapshot.summary.paidBookings)}
          hint="Bookings already fully covered by paid ledger value."
        />
        <MetricCard
          label="Conversion"
          value={`${Math.round(snapshot.summary.bookingConversionRate * 100)}%`}
          hint="Lead-to-booking conversion from the current tenant data."
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <MetricCard
          label="Pipeline value"
          value={formatMoney(snapshot.summary.pipelineValueCents)}
          hint="Lead-side revenue opportunity still open in the funnel."
        />
        <MetricCard
          label="Unpaid bookings"
          value={String(snapshot.summary.unpaidBookings)}
          hint="Bookings that still have outstanding revenue to collect."
        />
        <MetricCard
          label="Upcoming bookings"
          value={String(snapshot.summary.upcomingBookings)}
          hint="Upcoming bookings that are not cancelled."
        />
        <MetricCard
          label="Zoho deals won"
          value={String(dealFeedback.summary.won_count)}
          hint="Commercial wins fed back from Zoho CRM."
        />
        <MetricCard
          label="Zoho win rate"
          value={`${Math.round(dealFeedback.summary.win_rate * 100)}%`}
          hint="Share of CRM close feedback currently landing as won."
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
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
                      No Zoho owner feedback available yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </AdminCard>

        <AdminCard className="p-6">
          <h2 className="text-lg font-semibold text-slate-950">Zoho close signals</h2>
          <div className="mt-4 space-y-3">
            <SignalRow
              label="Feedback rows"
              value={String(dealFeedback.summary.feedback_count)}
            />
            <SignalRow
              label="Stage changes seen"
              value={String(dealFeedback.summary.stage_signal_count)}
            />
            <SignalRow
              label="Tasks completed"
              value={String(dealFeedback.summary.completed_task_count)}
            />
          </div>
        </AdminCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <ChartCard
          title="Revenue trend"
          subtitle="Recent revenue movement across paid payment dates."
          items={snapshot.revenueSeries.map((item) => ({
            label: item.label,
            value: item.valueCents,
            display: formatMoney(item.valueCents),
          }))}
          tone="dark"
        />
        <div className="grid gap-6">
          <ChartCard
            title="Receivables aging"
            subtitle="Outstanding booked revenue grouped by overdue age."
            items={snapshot.agingSeries.map((item) => ({
              label: item.label,
              value: item.valueCents,
              display: `${formatMoney(item.valueCents)} • ${item.count}`,
            }))}
          />
          <ChartCard
            title="Booking status"
            subtitle="Operational booking posture by current status."
            items={snapshot.bookingStatusSeries.map((item) => ({
              label: item.label,
              value: item.count,
              display: String(item.count),
            }))}
          />
          <ChartCard
            title="Lead stages"
            subtitle="Pipeline stage distribution across live leads."
            items={snapshot.leadStageSeries.map((item) => ({
              label: item.label.replace(/_/g, " "),
              value: item.count,
              display: String(item.count),
            }))}
          />
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1.2fr)]">
        <AdminCard className="p-6">
          <h2 className="text-lg font-semibold text-slate-950">Collection priority queue</h2>
          <div className="mt-4 space-y-3">
            {snapshot.collectionQueue.length ? (
              snapshot.collectionQueue.map((booking) => (
                <div
                  key={booking.id}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-semibold text-slate-950">
                        {booking.customerName} • {booking.serviceName}
                      </div>
                      <div className="mt-1 text-sm text-slate-600">
                        {booking.startAt.slice(0, 16).replace("T", " ")} • {booking.paymentStatus.replace(/_/g, " ")}
                      </div>
                    </div>
                    <AdminBadge tone="warning">
                      {booking.overdueDays > 0 ? `${booking.overdueDays}d overdue` : "Current"}
                    </AdminBadge>
                  </div>
                  <div className="mt-3 text-sm text-slate-700">
                    Outstanding {formatMoney(booking.outstandingValueCents)} • Paid{" "}
                    {formatMoney(booking.paidValueCents)}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-600">
                No outstanding bookings in the current tenant view.
              </p>
            )}
          </div>
        </AdminCard>

        <AdminCard className="p-6">
          <h2 className="text-lg font-semibold text-slate-950">Recent bookings</h2>
          <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                <tr>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Service</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Payment</th>
                  <th className="px-4 py-3">Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {snapshot.recentBookings.map((booking) => (
                  <tr key={booking.id}>
                    <td className="px-4 py-4">
                      <div className="font-semibold text-slate-950">{booking.customerName}</div>
                      <div className="text-slate-600">{booking.startAt.slice(0, 16).replace("T", " ")}</div>
                    </td>
                    <td className="px-4 py-4 text-slate-700">{booking.serviceName}</td>
                    <td className="px-4 py-4 text-slate-700">{booking.status}</td>
                    <td className="px-4 py-4">
                      <AdminBadge
                        tone={
                          booking.paymentStatus === "paid"
                            ? "success"
                            : booking.paymentStatus === "partially_paid" ||
                                booking.paymentStatus === "pending"
                              ? "warning"
                              : booking.paymentStatus === "failed"
                                ? "danger"
                                : "default"
                        }
                      >
                        {booking.paymentStatus.replace(/_/g, " ")}
                      </AdminBadge>
                    </td>
                    <td className="px-4 py-4 text-slate-700">
                      {formatMoney(booking.revenueCents)}
                      <div className="mt-1 text-xs text-slate-500">
                        Paid {formatMoney(booking.paidValueCents)} • Outstanding{" "}
                        {formatMoney(booking.outstandingValueCents)}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </AdminCard>
      </div>

      <AdminCard className="p-6">
        <h2 className="text-lg font-semibold text-slate-950">Overdue follow-ups</h2>
        <div className="mt-4 space-y-3">
          {snapshot.overdueFollowUps.length ? (
            snapshot.overdueFollowUps.map((lead) => (
              <div
                key={lead.id}
                className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-semibold text-slate-950">{lead.title}</div>
                    <div className="mt-1 text-sm text-slate-600">
                      {lead.ownerName || "Unassigned"} • {lead.pipelineStage.replace(/_/g, " ")}
                    </div>
                  </div>
                  <AdminBadge tone="warning">
                    {lead.nextFollowUpAt?.slice(0, 16).replace("T", " ") ?? "No date"}
                  </AdminBadge>
                </div>
                <div className="mt-3 text-sm text-slate-700">
                  {lead.customerName || lead.source.replace(/_/g, " ")} • {formatMoney(lead.estimatedValueCents)}
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-slate-600">
              No overdue follow-ups in the current tenant view.
            </p>
          )}
        </div>
      </AdminCard>

      <AdminCard className="p-6">
        <h2 className="text-lg font-semibold text-slate-950">Audit highlights</h2>
        <div className="mt-4 space-y-3">
          {auditLogs.length ? (
            auditLogs.map((item) => (
              <div
                key={String(item.id)}
                className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 md:flex-row md:items-center md:justify-between"
              >
                <div>
                  <div className="font-semibold text-slate-950">
                    {String(item.entityType)} • {String(item.action)}
                  </div>
                  <div className="text-slate-600">
                    {String(item.summary ?? item.entityId)}
                  </div>
                </div>
                <AdminBadge>{String(item.createdAt).slice(0, 19)}</AdminBadge>
              </div>
            ))
          ) : (
            <p className="text-sm text-slate-600">
              Audit logs will appear here as operators create, update, archive, and recover records.
            </p>
          )}
        </div>
      </AdminCard>
    </div>
  );
}

function SignalRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
      <div className="text-sm text-slate-600">{label}</div>
      <div className="text-sm font-semibold text-slate-950">{value}</div>
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
  tone = "default",
}: {
  title: string;
  subtitle: string;
  items: Array<{ label: string; value: number; display: string }>;
  tone?: "default" | "dark";
}) {
  const max = Math.max(...items.map((item) => item.value), 1);

  return (
    <AdminCard className={tone === "dark" ? "bg-slate-950 p-6 text-white" : "p-6"}>
      <h2 className={`text-lg font-semibold ${tone === "dark" ? "text-white" : "text-slate-950"}`}>
        {title}
      </h2>
      <p className={`mt-2 text-sm leading-6 ${tone === "dark" ? "text-slate-300" : "text-slate-600"}`}>
        {subtitle}
      </p>
      <div className="mt-6 space-y-4">
        {items.length ? (
          items.map((item) => (
            <div key={item.label} className="space-y-2">
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className={tone === "dark" ? "text-slate-200" : "text-slate-700"}>
                  {item.label}
                </span>
                <span className={tone === "dark" ? "text-white" : "text-slate-950"}>
                  {item.display}
                </span>
              </div>
              <div className={`h-2 rounded-full ${tone === "dark" ? "bg-slate-800" : "bg-slate-100"}`}>
                <div
                  className={`h-2 rounded-full ${tone === "dark" ? "bg-sky-400" : "bg-slate-950"}`}
                  style={{ width: `${Math.max((item.value / max) * 100, 6)}%` }}
                />
              </div>
            </div>
          ))
        ) : (
          <p className={`text-sm ${tone === "dark" ? "text-slate-300" : "text-slate-600"}`}>
            No chart data available yet.
          </p>
        )}
      </div>
    </AdminCard>
  );
}
