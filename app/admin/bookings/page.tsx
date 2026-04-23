import Link from "next/link";

import {
  cancelBookingAction,
  confirmBookingAction,
  createBookingAction,
  rescheduleBookingAction,
} from "@/app/admin/bookings/actions";
import { PageHeader } from "@/components/admin/shared/page-header";
import { SupportModePageBanner } from "@/components/admin/shared/support-mode-page-banner";
import { AdminButton } from "@/components/ui/admin-button";
import { AdminCard } from "@/components/ui/admin-card";
import { AdminInput, AdminTextarea } from "@/components/ui/admin-input";
import { getAdminRepository, type BookingRecord } from "@/lib/db/admin-repository";
import { requirePermission } from "@/lib/rbac/policies";
import { getTenantContext } from "@/lib/tenant/context";

type SearchParams =
  | Promise<Record<string, string | string[] | undefined>>
  | Record<string, string | string[] | undefined>;

function money(value: number) {
  return (value / 100).toLocaleString("en-AU", {
    style: "currency",
    currency: "AUD",
  });
}

function groupBookingsByDate(bookings: BookingRecord[]) {
  const groups = new Map<string, BookingRecord[]>();

  for (const booking of bookings) {
    const key = booking.startAt.slice(0, 10);
    const current = groups.get(key) ?? [];
    current.push(booking);
    groups.set(key, current);
  }

  return [...groups.entries()];
}

export default async function BookingsPage({
  searchParams,
}: {
  searchParams?: SearchParams;
}) {
  await requirePermission("bookings:view");
  const params = await Promise.resolve(searchParams ?? {});
  const tenant = await getTenantContext();
  const repository = getAdminRepository();
  const page = Number(params.page ?? "1");
  const query = typeof params.q === "string" ? params.q : "";
  const status = typeof params.status === "string" ? params.status : "all";
  const view = typeof params.view === "string" ? params.view : "list";
  const sortBy = typeof params.sort_by === "string" ? params.sort_by : "startAt";
  const sortOrder = typeof params.sort_order === "string" ? params.sort_order : "asc";

  const [bookings, customers, services] = await Promise.all([
    repository.listBookings({
      tenantId: tenant.tenantId,
      page,
      pageSize: 8,
      query,
      status,
      sortBy:
        sortBy === "updatedAt" || sortBy === "revenueCents" ? sortBy : "startAt",
      sortOrder: sortOrder === "desc" ? "desc" : "asc",
    }),
    repository.listCustomers({ tenantId: tenant.tenantId, page: 1, pageSize: 100 }),
    repository.listServices({ tenantId: tenant.tenantId, page: 1, pageSize: 100 }),
  ]);

  const calendarGroups = groupBookingsByDate(bookings.items);
  const confirmedCount = bookings.items.filter((booking) => booking.status === "CONFIRMED").length;
  const cancelledCount = bookings.items.filter((booking) => booking.status === "CANCELLED").length;
  const pendingCount = bookings.items.filter((booking) => booking.status === "PENDING").length;
  const baseQuery = new URLSearchParams({
    q: query,
    status,
    view,
    sort_by: sortBy,
    sort_order: sortOrder,
  });

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Step 8"
        title="Bookings module"
        description="Bookings now operates as a real scheduling surface with list and calendar views, quick confirm/cancel/reschedule actions, and explicit customer-service linkage."
      />
      <SupportModePageBanner
        scopeLabel="Bookings module"
        tenantPanel="overview"
        adminPath="/admin/bookings"
      />

      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard label="Bookings in view" value={String(bookings.total)} hint="Filtered booking records for the active tenant." />
        <MetricCard label="Pending" value={String(pendingCount)} hint="Needs confirmation or further action." />
        <MetricCard label="Confirmed" value={String(confirmedCount)} hint="Ready to deliver." />
        <MetricCard label="Cancelled" value={String(cancelledCount)} hint="Removed from active service delivery." />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.7fr)_420px]">
        <AdminCard className="p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-950">Booking workspace</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Use the list for triage and actions, or switch to the date-grouped calendar view for schedule scanning.
              </p>
            </div>
            <div className="flex gap-2">
              <Link href={`/admin/bookings?${new URLSearchParams({ ...Object.fromEntries(baseQuery), view: "list" }).toString()}`}>
                <AdminButton variant={view === "calendar" ? "ghost" : "primary"}>List view</AdminButton>
              </Link>
              <Link href={`/admin/bookings?${new URLSearchParams({ ...Object.fromEntries(baseQuery), view: "calendar" }).toString()}`}>
                <AdminButton variant={view === "calendar" ? "primary" : "ghost"}>Calendar view</AdminButton>
              </Link>
            </div>
          </div>

          <form className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-5" action="/admin/bookings">
            <AdminInput
              name="q"
              defaultValue={query}
              placeholder="Search customer, service, channel"
              className="xl:col-span-2"
            />
            <select
              name="status"
              defaultValue={status}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900"
            >
              <option value="all">All statuses</option>
              <option value="PENDING">PENDING</option>
              <option value="CONFIRMED">CONFIRMED</option>
              <option value="COMPLETED">COMPLETED</option>
              <option value="CANCELLED">CANCELLED</option>
            </select>
            <select
              name="sort_by"
              defaultValue={sortBy}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900"
            >
              <option value="startAt">Sort by start</option>
              <option value="updatedAt">Sort by updated</option>
              <option value="revenueCents">Sort by revenue</option>
            </select>
            <select
              name="sort_order"
              defaultValue={sortOrder}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900"
            >
              <option value="asc">Ascending</option>
              <option value="desc">Descending</option>
            </select>
            <input type="hidden" name="view" value={view} />
            <div className="flex gap-3 xl:col-span-2">
              <AdminButton type="submit" variant="secondary">Apply</AdminButton>
              <Link href="/admin/bookings" className="inline-flex">
                <AdminButton type="button" variant="ghost">Reset</AdminButton>
              </Link>
            </div>
          </form>

          {view === "calendar" ? (
            <div className="mt-6 grid gap-4">
              {calendarGroups.map(([date, items]) => (
                <div key={date} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
                    {date}
                  </div>
                  <div className="mt-4 grid gap-3">
                    {items.map((booking) => (
                      <div key={booking.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <Link
                              href={`/admin/bookings/${booking.id}`}
                              className="font-semibold text-slate-950 hover:underline"
                            >
                              {booking.customerName}
                            </Link>
                            <div className="mt-1 text-sm text-slate-600">
                              {booking.serviceName} • {booking.startAt.slice(11, 16)} - {booking.endAt.slice(11, 16)}
                            </div>
                            <div className="mt-1 text-sm text-slate-600">{booking.status.toLowerCase()} • {booking.channel}</div>
                          </div>
                          <div className="text-right text-sm text-slate-700">{money(booking.revenueCents)}</div>
                        </div>
                        <div className="mt-4">
                          <BookingActions booking={booking} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Customer</th>
                    <th className="px-4 py-3">Service</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Start</th>
                    <th className="px-4 py-3">Revenue</th>
                    <th className="px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {bookings.items.map((booking) => (
                    <tr key={booking.id} className="align-top hover:bg-slate-50">
                      <td className="px-4 py-4">
                        <Link
                          href={`/admin/bookings/${booking.id}`}
                          className="font-semibold text-slate-950 hover:underline"
                        >
                          {booking.customerName}
                        </Link>
                        <div className="text-slate-600">{booking.channel}</div>
                      </td>
                      <td className="px-4 py-4 text-slate-700">{booking.serviceName}</td>
                      <td className="px-4 py-4 text-slate-700">{booking.status}</td>
                      <td className="px-4 py-4 text-slate-700">
                        {booking.startAt.slice(0, 16).replace("T", " ")}
                      </td>
                      <td className="px-4 py-4 text-slate-700">{money(booking.revenueCents)}</td>
                      <td className="px-4 py-4">
                        <BookingActions booking={booking} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="mt-4 flex items-center justify-between text-sm text-slate-600">
            <div>
              Page {bookings.page} of {bookings.totalPages} • {bookings.total} bookings
            </div>
            <div className="flex gap-2">
              <Link href={`/admin/bookings?page=${Math.max(bookings.page - 1, 1)}&${baseQuery.toString()}`}>
                <AdminButton variant="secondary" disabled={bookings.page <= 1}>Previous</AdminButton>
              </Link>
              <Link href={`/admin/bookings?page=${Math.min(bookings.page + 1, bookings.totalPages)}&${baseQuery.toString()}`}>
                <AdminButton variant="secondary" disabled={bookings.page >= bookings.totalPages}>Next</AdminButton>
              </Link>
            </div>
          </div>
        </AdminCard>

        <AdminCard className="p-6">
          <h2 className="text-lg font-semibold text-slate-950">Create booking</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Create a booking with an explicit customer-service link, schedule range, and revenue value.
          </p>
          <form action={createBookingAction} className="mt-6 space-y-4">
            <Field label="Customer">
              <select name="customerId" className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900">
                {customers.items.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.fullName}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Service">
              <select name="serviceId" className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900">
                {services.items.map((service) => (
                  <option key={service.id} value={service.id}>
                    {service.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Status">
              <select name="status" defaultValue="PENDING" className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900">
                <option value="PENDING">PENDING</option>
                <option value="CONFIRMED">CONFIRMED</option>
                <option value="COMPLETED">COMPLETED</option>
                <option value="CANCELLED">CANCELLED</option>
              </select>
            </Field>
            <Field label="Start at"><AdminInput name="startAt" type="datetime-local" required /></Field>
            <Field label="End at"><AdminInput name="endAt" type="datetime-local" required /></Field>
            <Field label="Revenue cents"><AdminInput name="revenueCents" type="number" min="0" defaultValue="0" /></Field>
            <Field label="Channel"><AdminInput name="channel" defaultValue="website" /></Field>
            <Field label="Notes"><AdminTextarea name="notes" rows={4} /></Field>
            <AdminButton type="submit">Create booking</AdminButton>
          </form>
        </AdminCard>
      </div>
    </div>
  );
}

function BookingActions({ booking }: { booking: BookingRecord }) {
  return (
    <div className="min-w-[240px] space-y-3">
      <div className="flex flex-wrap gap-2">
        <form action={confirmBookingAction.bind(null, booking.id)}>
          <AdminButton type="submit" variant="secondary">Confirm</AdminButton>
        </form>
        <form action={cancelBookingAction.bind(null, booking.id)}>
          <AdminButton type="submit" variant="danger">Cancel</AdminButton>
        </form>
      </div>
      <form action={rescheduleBookingAction.bind(null, booking.id)} className="space-y-2">
        <div className="grid gap-2 md:grid-cols-2">
          <AdminInput name="startAt" type="datetime-local" defaultValue={booking.startAt.slice(0, 16)} />
          <AdminInput name="endAt" type="datetime-local" defaultValue={booking.endAt.slice(0, 16)} />
        </div>
        <AdminButton type="submit" variant="ghost">Reschedule</AdminButton>
      </form>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-sm">
      <span className="mb-2 block font-semibold text-slate-700">{label}</span>
      {children}
    </label>
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
      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
        {label}
      </div>
      <div className="mt-3 text-2xl font-semibold text-slate-950">{value}</div>
      <div className="mt-2 text-sm leading-6 text-slate-600">{hint}</div>
    </AdminCard>
  );
}
