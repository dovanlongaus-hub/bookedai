import type { ReactNode } from 'react';

type AdminBookingsTableChromeProps = {
  children: ReactNode;
};

export function AdminBookingsTableChrome({ children }: AdminBookingsTableChromeProps) {
  return (
    <div
      className="mt-5 overflow-hidden rounded-[1.5rem] border border-slate-200"
      role="region"
      aria-label="Admin bookings table"
    >
      <div className="booked-admin-table-scroll overflow-x-auto">
        <div className="booked-admin-bookings-table booked-admin-bookings-header bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
          <div>Reference</div>
          <div>Industry</div>
          <div>Customer</div>
          <div>Service</div>
          <div>Amount</div>
          <div>Payment</div>
        </div>
        <div className="max-h-[620px] overflow-auto">{children}</div>
      </div>
    </div>
  );
}
