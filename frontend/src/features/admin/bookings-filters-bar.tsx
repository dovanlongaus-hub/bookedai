import type { FormEvent } from 'react';

import type { AdminBookingRecord } from './types';

type AdminBookingsFiltersBarProps = {
  bookings: AdminBookingRecord[];
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
};

export function AdminBookingsFiltersBar({
  bookings,
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
}: AdminBookingsFiltersBarProps) {
  return (
    <div className="min-w-0 flex flex-col gap-4 lg:flex-1 lg:items-end">
      <form className="flex w-full min-w-0 flex-col gap-3 sm:flex-row lg:w-auto" onSubmit={onSubmitSearch}>
        <input
          type="search"
          value={searchQuery}
          onChange={(event) => onSearchQueryChange(event.target.value)}
          placeholder="Search by reference, customer, or email"
          className="w-full min-w-0 rounded-full border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-sky-400 sm:min-w-[260px]"
        />
        <button
          type="submit"
          className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          Search
        </button>
      </form>

      <div className="mt-4 grid w-full min-w-0 gap-3 md:grid-cols-6">
        <input
          type="date"
          value={dateFrom}
          onChange={(event) => onDateFromChange(event.target.value)}
          className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-sky-400"
        />
        <input
          type="date"
          value={dateTo}
          onChange={(event) => onDateToChange(event.target.value)}
          className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-sky-400"
        />
        <select
          value={industryFilter}
          onChange={(event) => onIndustryFilterChange(event.target.value)}
          className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-sky-400"
        >
          <option value="">All industries</option>
          {Array.from(new Set(bookings.map((booking) => booking.industry).filter(Boolean))).map(
            (industry) => (
              <option key={industry} value={industry ?? ''}>
                {industry}
              </option>
            ),
          )}
        </select>
        <select
          value={paymentFilter}
          onChange={(event) => onPaymentFilterChange(event.target.value)}
          className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-sky-400"
        >
          <option value="">All payment states</option>
          <option value="stripe_checkout_ready">Stripe ready</option>
          <option value="payment_follow_up_required">Payment follow-up</option>
        </select>
        <select
          value={emailFilter}
          onChange={(event) => onEmailFilterChange(event.target.value)}
          className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-sky-400"
        >
          <option value="">All email states</option>
          <option value="sent">Sent</option>
          <option value="pending_manual_followup">Pending follow-up</option>
        </select>
        <select
          value={workflowFilter}
          onChange={(event) => onWorkflowFilterChange(event.target.value)}
          className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-sky-400"
        >
          <option value="">All workflow states</option>
          <option value="triggered">Triggered</option>
          <option value="processed_by_n8n">Processed by n8n</option>
          <option value="unauthorized">Unauthorized</option>
        </select>
      </div>
    </div>
  );
}
