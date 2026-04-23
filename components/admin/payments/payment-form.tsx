import { ReactNode } from "react";

import { AdminButton } from "@/components/ui/admin-button";
import { AdminInput } from "@/components/ui/admin-input";
import {
  BookingRecord,
  CustomerPaymentRecord,
  CustomerRecord,
} from "@/lib/db/admin-repository";

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block text-sm">
      <span className="mb-2 block font-semibold text-slate-700">{label}</span>
      {children}
    </label>
  );
}

export function PaymentForm({
  action,
  customers,
  bookings,
  payment,
  submitLabel,
  disabled = false,
}: {
  action: (formData: FormData) => void | Promise<void>;
  customers: CustomerRecord[];
  bookings: BookingRecord[];
  payment?: CustomerPaymentRecord | null;
  submitLabel: string;
  disabled?: boolean;
}) {
  return (
    <form action={action} className="grid gap-4 md:grid-cols-2">
      <fieldset disabled={disabled} className="contents">
      <Field label="Customer">
        <select
          name="customerId"
          required
          defaultValue={payment?.customerId ?? ""}
          className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900"
        >
          <option value="">Select customer</option>
          {customers.map((customer) => (
            <option key={customer.id} value={customer.id}>
              {customer.fullName}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Booking link">
        <select
          name="bookingId"
          defaultValue={payment?.bookingId ?? ""}
          className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900"
        >
          <option value="">No booking linked</option>
          {bookings.map((booking) => (
            <option key={booking.id} value={booking.id}>
              {booking.customerName} • {booking.serviceName}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Provider">
        <AdminInput name="provider" required defaultValue={payment?.provider ?? "stripe"} />
      </Field>
      <Field label="Amount (cents)">
        <AdminInput
          name="amountCents"
          required
          type="number"
          min={1}
          defaultValue={payment?.amountCents}
        />
      </Field>
      <Field label="Currency">
        <AdminInput
          name="currency"
          required
          maxLength={3}
          defaultValue={payment?.currency ?? "AUD"}
        />
      </Field>
      <Field label="Status">
        <select
          name="status"
          defaultValue={payment?.status ?? "pending"}
          className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900"
        >
          <option value="pending">pending</option>
          <option value="paid">paid</option>
          <option value="failed">failed</option>
          <option value="refunded">refunded</option>
        </select>
      </Field>
      <Field label="Payment method">
        <AdminInput name="paymentMethod" defaultValue={payment?.paymentMethod} />
      </Field>
      <Field label="External payment ID">
        <AdminInput name="externalPaymentId" defaultValue={payment?.externalPaymentId} />
      </Field>
      <Field label="Paid at">
        <AdminInput
          name="paidAt"
          type="datetime-local"
          defaultValue={payment?.paidAt?.slice(0, 16)}
        />
      </Field>
      <div className="md:col-span-2 flex gap-3">
        <AdminButton type="submit">{submitLabel}</AdminButton>
      </div>
      </fieldset>
    </form>
  );
}
