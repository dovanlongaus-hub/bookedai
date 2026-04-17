import type { FormEvent } from 'react';

import { AdminBookingRecord, ShadowDriftExample, ShadowDriftReference } from './types';
import { AdminBookingsFiltersBar } from './bookings-filters-bar';
import { AdminBookingsSummary } from './bookings-summary';
import { AdminBookingsTable } from './bookings-table';
import { ShadowDiagnosticsPanel } from './shadow-diagnostics-panel';
import { ShadowReviewQueue } from './shadow-review-queue';

type AdminBookingsSectionProps = {
  bookings: AdminBookingRecord[];
  bookingsTotal: number;
  searchQuery: string;
  industryFilter: string;
  paymentFilter: string;
  emailFilter: string;
  workflowFilter: string;
  dateFrom: string;
  dateTo: string;
  onSearchQueryChange: (value: string) => void;
  onIndustryFilterChange: (value: string) => void;
  onPaymentFilterChange: (value: string) => void;
  onEmailFilterChange: (value: string) => void;
  onWorkflowFilterChange: (value: string) => void;
  onDateFromChange: (value: string) => void;
  onDateToChange: (value: string) => void;
  onSubmitSearch: (event: FormEvent<HTMLFormElement>) => void;
  onSelectBooking: (bookingReference: string) => void;
  selectedBookingReference?: string | null;
  enhancedViewEnabled: boolean;
  shadowStatus: string;
  shadowMatched: number;
  shadowMismatch: number;
  shadowMissing: number;
  shadowPaymentStatusMismatch: number;
  shadowAmountMismatch: number;
  shadowMeetingStatusMismatch: number;
  shadowWorkflowStatusMismatch: number;
  shadowEmailStatusMismatch: number;
  shadowFieldParityMismatch: number;
  shadowTopDriftReferences: ShadowDriftReference[];
  shadowRecentDriftExamples: ShadowDriftExample[];
  onSelectDriftBooking?: (bookingReference: string) => void;
};

export function AdminBookingsSection({
  bookings,
  bookingsTotal,
  searchQuery,
  industryFilter,
  paymentFilter,
  emailFilter,
  workflowFilter,
  dateFrom,
  dateTo,
  onSearchQueryChange,
  onIndustryFilterChange,
  onPaymentFilterChange,
  onEmailFilterChange,
  onWorkflowFilterChange,
  onDateFromChange,
  onDateToChange,
  onSubmitSearch,
  onSelectBooking,
  selectedBookingReference,
  enhancedViewEnabled,
  shadowStatus,
  shadowMatched,
  shadowMismatch,
  shadowMissing,
  shadowPaymentStatusMismatch,
  shadowAmountMismatch,
  shadowMeetingStatusMismatch,
  shadowWorkflowStatusMismatch,
  shadowEmailStatusMismatch,
  shadowFieldParityMismatch,
  shadowTopDriftReferences,
  shadowRecentDriftExamples,
  onSelectDriftBooking,
}: AdminBookingsSectionProps) {
  const recentDriftExamples =
    shadowRecentDriftExamples.length > 0 ? shadowRecentDriftExamples : shadowTopDriftReferences;

  return (
    <section className="template-card p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <AdminBookingsSummary
          bookingsTotal={bookingsTotal}
          enhancedViewEnabled={enhancedViewEnabled}
          shadowStatus={shadowStatus}
          shadowMatched={shadowMatched}
          shadowMismatch={shadowMismatch}
          shadowMissing={shadowMissing}
        />
        <AdminBookingsFiltersBar
          bookings={bookings}
          searchQuery={searchQuery}
          industryFilter={industryFilter}
          paymentFilter={paymentFilter}
          emailFilter={emailFilter}
          workflowFilter={workflowFilter}
          dateFrom={dateFrom}
          dateTo={dateTo}
          onSearchQueryChange={onSearchQueryChange}
          onIndustryFilterChange={onIndustryFilterChange}
          onPaymentFilterChange={onPaymentFilterChange}
          onEmailFilterChange={onEmailFilterChange}
          onWorkflowFilterChange={onWorkflowFilterChange}
          onDateFromChange={onDateFromChange}
          onDateToChange={onDateToChange}
          onSubmitSearch={onSubmitSearch}
        />
      </div>

      {shadowStatus !== 'disabled' ? (
        <>
          <ShadowReviewQueue
            recentDriftExamples={recentDriftExamples}
            onSelectBooking={onSelectDriftBooking}
          />
          <ShadowDiagnosticsPanel
            enhancedViewEnabled={enhancedViewEnabled}
            shadowStatus={shadowStatus}
            shadowMatched={shadowMatched}
            shadowMismatch={shadowMismatch}
            shadowMissing={shadowMissing}
            shadowPaymentStatusMismatch={shadowPaymentStatusMismatch}
            shadowAmountMismatch={shadowAmountMismatch}
            shadowMeetingStatusMismatch={shadowMeetingStatusMismatch}
            shadowWorkflowStatusMismatch={shadowWorkflowStatusMismatch}
            shadowEmailStatusMismatch={shadowEmailStatusMismatch}
            shadowFieldParityMismatch={shadowFieldParityMismatch}
            recentDriftExamples={recentDriftExamples}
            onSelectBooking={onSelectDriftBooking}
          />
        </>
      ) : null}

      <AdminBookingsTable
        bookings={bookings}
        selectedBookingReference={selectedBookingReference}
        enhancedViewEnabled={enhancedViewEnabled}
        onSelectBooking={onSelectBooking}
      />
    </section>
  );
}
