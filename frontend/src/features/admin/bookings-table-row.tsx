import { AdminBookingRecord, formatCurrency, formatDateTime, statusTone } from './types';

type AdminBookingTableRowProps = {
  booking: AdminBookingRecord;
  selectedBookingReference?: string | null;
  enhancedViewEnabled: boolean;
  onSelectBooking: (bookingReference: string) => void;
};

export function AdminBookingTableRow({
  booking,
  selectedBookingReference,
  enhancedViewEnabled,
  onSelectBooking,
}: AdminBookingTableRowProps) {
  const isSelected = selectedBookingReference === booking.booking_reference;

  return (
    <button
      type="button"
      onClick={() => onSelectBooking(booking.booking_reference)}
      className={`grid w-full grid-cols-[160px_1fr_1.1fr_1fr_120px_150px] gap-3 border-t border-slate-200 px-4 py-4 text-left text-sm transition hover:bg-slate-50 ${
        enhancedViewEnabled && isSelected ? 'bg-sky-50/70' : ''
      }`}
    >
      <div>
        <div className="font-semibold text-slate-950">{booking.booking_reference}</div>
        <div className="mt-1 text-xs text-slate-500">{formatDateTime(booking.created_at)}</div>
      </div>
      <div>
        <span className="inline-flex rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold text-sky-700">
          {booking.industry || 'General'}
        </span>
      </div>
      <div>
        <div className="font-semibold text-slate-950">
          {booking.customer_name || 'Unknown customer'}
        </div>
        <div className="mt-1 text-xs text-slate-500">{booking.customer_email || 'No email'}</div>
      </div>
      <div>
        <div className="font-semibold text-slate-950">
          {booking.service_name || 'Unknown service'}
        </div>
        <div className="mt-1 text-xs text-slate-500">
          {[booking.requested_date, booking.requested_time].filter(Boolean).join(' ')}
        </div>
      </div>
      <div className="font-semibold text-slate-950">{formatCurrency(booking.amount_aud)}</div>
      <div>
        <span
          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${statusTone(booking.payment_status)}`}
        >
          {booking.payment_status || 'Unknown'}
        </span>
      </div>
    </button>
  );
}
