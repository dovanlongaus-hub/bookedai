import { AdminBookingRecord } from './types';
import { AdminBookingsTableChrome } from './bookings-table-chrome';
import { AdminBookingTableRow } from './bookings-table-row';

type AdminBookingsTableProps = {
  bookings: AdminBookingRecord[];
  selectedBookingReference?: string | null;
  enhancedViewEnabled: boolean;
  onSelectBooking: (bookingReference: string) => void;
};

export function AdminBookingsTable({
  bookings,
  selectedBookingReference,
  enhancedViewEnabled,
  onSelectBooking,
}: AdminBookingsTableProps) {
  return (
    <AdminBookingsTableChrome>
      {bookings.map((booking) => (
        <AdminBookingTableRow
          key={booking.booking_reference}
          booking={booking}
          selectedBookingReference={selectedBookingReference}
          enhancedViewEnabled={enhancedViewEnabled}
          onSelectBooking={onSelectBooking}
        />
      ))}
    </AdminBookingsTableChrome>
  );
}
