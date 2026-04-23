import Link from "next/link";
import { notFound } from "next/navigation";

import {
  cancelBookingAction,
  confirmBookingAction,
  rescheduleBookingAction,
} from "@/app/admin/bookings/actions";
import { ActivityTimeline } from "@/components/admin/shared/activity-timeline";
import { PageHeader } from "@/components/admin/shared/page-header";
import { SupportModePageBanner } from "@/components/admin/shared/support-mode-page-banner";
import { AdminBadge } from "@/components/ui/admin-badge";
import { AdminButton } from "@/components/ui/admin-button";
import { AdminCard } from "@/components/ui/admin-card";
import { AdminInput } from "@/components/ui/admin-input";
import { getAdminRepository } from "@/lib/db/admin-repository";
import { requirePermission } from "@/lib/rbac/policies";
import { getTenantContext } from "@/lib/tenant/context";

function money(value: number) {
  return (value / 100).toLocaleString("en-AU", {
    style: "currency",
    currency: "AUD",
  });
}

function derivePaymentStatus(statuses: string[]) {
  if (statuses.includes("paid")) {
    return "paid";
  }
  if (statuses.includes("pending")) {
    return "pending";
  }
  if (statuses.includes("refunded")) {
    return "refunded";
  }
  if (statuses.includes("failed")) {
    return "failed";
  }
  return "unlinked";
}

export default async function BookingDetailPage({
  params,
}: {
  params: Promise<{ bookingId: string }> | { bookingId: string };
}) {
  await requirePermission("bookings:view");
  const { bookingId } = await Promise.resolve(params);
  const tenant = await getTenantContext();
  const repository = getAdminRepository();
  const [booking, payments, timeline] = await Promise.all([
    repository.getBookingById(tenant.tenantId, bookingId),
    repository.listBookingPayments(tenant.tenantId, bookingId),
    repository.listBookingTimeline(tenant.tenantId, bookingId),
  ]);

  if (!booking) {
    notFound();
  }

  const paymentStatus = derivePaymentStatus(payments.map((payment) => payment.status));
  const paidValue = payments
    .filter((payment) => payment.status === "paid")
    .reduce((sum, payment) => sum + payment.amountCents, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Phase 4"
        title={`${booking.customerName} • ${booking.serviceName}`}
        description="Booking detail now behaves like a revenue-linked service record: schedule actions, payment posture, and operational timeline all live on one detail page."
        actions={
          <div className="flex flex-wrap gap-3">
            <Link href="/admin/bookings">
              <AdminButton variant="secondary">Back to bookings</AdminButton>
            </Link>
            <form action={confirmBookingAction.bind(null, booking.id)}>
              <AdminButton type="submit" variant="secondary">Confirm</AdminButton>
            </form>
            <form action={cancelBookingAction.bind(null, booking.id)}>
              <AdminButton type="submit" variant="danger">Cancel</AdminButton>
            </form>
          </div>
        }
      />
      <SupportModePageBanner
        scopeLabel="Booking detail"
        tenantPanel="overview"
        adminPath={`/admin/bookings/${booking.id}`}
      />

      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard label="Status" value={booking.status} hint={booking.channel} />
        <MetricCard label="Payment status" value={paymentStatus} hint={`${payments.length} linked payments`} />
        <MetricCard label="Booked revenue" value={money(booking.revenueCents)} hint={`Paid ${money(paidValue)}`} />
        <MetricCard label="Schedule" value={booking.startAt.slice(0, 10)} hint={`${booking.startAt.slice(11, 16)} - ${booking.endAt.slice(11, 16)}`} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <div className="space-y-6">
          <AdminCard className="p-6">
            <h2 className="text-lg font-semibold text-slate-950">Booking controls</h2>
            <div className="mt-4 space-y-4 text-sm text-slate-700">
              <div>
                <div className="font-semibold text-slate-950">Customer</div>
                <div className="mt-1">{booking.customerName}</div>
              </div>
              <div>
                <div className="font-semibold text-slate-950">Service</div>
                <div className="mt-1">{booking.serviceName}</div>
              </div>
              <div>
                <div className="font-semibold text-slate-950">Notes</div>
                <div className="mt-1">{booking.notes || "No booking notes recorded yet."}</div>
              </div>
            </div>

            <form action={rescheduleBookingAction.bind(null, booking.id)} className="mt-6 space-y-3">
              <div className="text-sm font-semibold text-slate-950">Reschedule</div>
              <div className="grid gap-3 md:grid-cols-2">
                <AdminInput name="startAt" type="datetime-local" defaultValue={booking.startAt.slice(0, 16)} />
                <AdminInput name="endAt" type="datetime-local" defaultValue={booking.endAt.slice(0, 16)} />
              </div>
              <AdminButton type="submit" variant="ghost">Save new schedule</AdminButton>
            </form>
          </AdminCard>

          <AdminCard className="p-6">
            <h2 className="text-lg font-semibold text-slate-950">Linked payments</h2>
            <div className="mt-4 space-y-3">
              {payments.length ? (
                payments.map((payment) => (
                  <div key={payment.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-semibold text-slate-950">
                          {payment.provider} • {payment.paymentMethod || "payment"}
                        </div>
                        <div className="mt-1 text-sm text-slate-600">
                          {payment.externalPaymentId || "No external payment ID"}
                        </div>
                      </div>
                      <AdminBadge tone={payment.status === "paid" ? "success" : payment.status === "pending" ? "warning" : "default"}>
                        {payment.status}
                      </AdminBadge>
                    </div>
                    <div className="mt-3 text-sm text-slate-700">
                      {money(payment.amountCents)} • {payment.paidAt ? payment.paidAt.slice(0, 16).replace("T", " ") : "Not paid yet"}
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-sm text-slate-500">
                  No payments are linked to this booking yet.
                </div>
              )}
            </div>
          </AdminCard>
        </div>

        <AdminCard className="p-6">
          <h2 className="text-lg font-semibold text-slate-950">Booking timeline</h2>
          <div className="mt-4">
            <ActivityTimeline
              items={timeline}
              emptyMessage="No booking timeline events recorded yet."
            />
          </div>
        </AdminCard>
      </div>
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
