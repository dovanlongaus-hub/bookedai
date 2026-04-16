import type { ReactNode } from 'react';

type AdminBookingsTableChromeProps = {
  children: ReactNode;
};

export function AdminBookingsTableChrome({ children }: AdminBookingsTableChromeProps) {
  return (
    <div className="mt-5 overflow-hidden rounded-[1.5rem] border border-slate-200">
      <div className="grid grid-cols-[160px_1fr_1.1fr_1fr_120px_150px] bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
        <div>Reference</div>
        <div>Industry</div>
        <div>Customer</div>
        <div>Service</div>
        <div>Amount</div>
        <div>Payment</div>
      </div>
      <div className="max-h-[620px] overflow-auto">{children}</div>
    </div>
  );
}
