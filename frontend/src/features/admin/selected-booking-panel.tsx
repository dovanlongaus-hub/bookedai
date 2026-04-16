import { useEffect, useRef, useState } from 'react';

import { AdminBookingDetailResponse, formatCurrency, formatDateTime, statusTone } from './types';

type SelectedBookingPanelProps = {
  selectedBooking: AdminBookingDetailResponse | null;
  confirmNote: string;
  confirmationMessage: string;
  sendingConfirmation: boolean;
  onConfirmNoteChange: (value: string) => void;
  onSendConfirmation: () => void;
  reviewFocusKey?: string;
  reviewFocusSource?: string | null;
};

export function SelectedBookingPanel({
  selectedBooking,
  confirmNote,
  confirmationMessage,
  sendingConfirmation,
  onConfirmNoteChange,
  onSendConfirmation,
  reviewFocusKey,
  reviewFocusSource,
}: SelectedBookingPanelProps) {
  const containerRef = useRef<HTMLElement | null>(null);
  const [isFocusedFromReview, setIsFocusedFromReview] = useState(false);

  useEffect(() => {
    if (!reviewFocusKey || !selectedBooking) {
      return;
    }

    const node = containerRef.current;
    if (!node) {
      return;
    }

    node.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setIsFocusedFromReview(true);

    const timer = window.setTimeout(() => {
      setIsFocusedFromReview(false);
    }, 2200);

    return () => {
      window.clearTimeout(timer);
    };
  }, [reviewFocusKey, selectedBooking]);

  return (
    <section
      ref={containerRef}
      className={`rounded-[2rem] border bg-white p-6 shadow-[0_24px_60px_rgba(15,23,42,0.06)] transition ${
        isFocusedFromReview
          ? 'border-sky-300 ring-4 ring-sky-100'
          : 'border-slate-200'
      }`}
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <h2 className="text-xl font-bold">Selected booking</h2>
        {isFocusedFromReview && reviewFocusSource ? (
          <div className="rounded-full bg-sky-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-sky-700">
            Opened from {reviewFocusSource}
          </div>
        ) : null}
      </div>
      {selectedBooking ? (
        <>
          <div className="mt-5 rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Booking reference
                </div>
                <div className="mt-2 text-2xl font-bold text-slate-950">
                  {selectedBooking.booking.booking_reference}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${statusTone(selectedBooking.booking.payment_status)}`}
                >
                  {selectedBooking.booking.payment_status || 'No payment state'}
                </span>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${statusTone(selectedBooking.booking.email_status)}`}
                >
                  {selectedBooking.booking.email_status || 'No email state'}
                </span>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${statusTone(selectedBooking.booking.workflow_status)}`}
                >
                  {selectedBooking.booking.workflow_status || 'No workflow state'}
                </span>
              </div>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Customer
                </div>
                <div className="mt-2 text-sm text-slate-700">
                  <div className="font-semibold text-slate-950">
                    {selectedBooking.booking.customer_name || 'Unknown'}
                  </div>
                  <div>{selectedBooking.booking.customer_email || 'No email'}</div>
                  <div>{selectedBooking.booking.customer_phone || 'No phone'}</div>
                </div>
              </div>
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Booking
                </div>
                <div className="mt-2 text-sm text-slate-700">
                  <div className="font-semibold text-slate-950">
                    {selectedBooking.booking.service_name || 'Unknown service'}
                  </div>
                  <div>{selectedBooking.booking.industry || 'General'}</div>
                  <div>
                    {[
                      selectedBooking.booking.requested_date,
                      selectedBooking.booking.requested_time,
                    ]
                      .filter(Boolean)
                      .join(' ')}
                  </div>
                  <div>{selectedBooking.booking.timezone || 'No timezone'}</div>
                  <div>{formatCurrency(selectedBooking.booking.amount_aud)}</div>
                </div>
              </div>
            </div>

            {selectedBooking.booking.payment_url ? (
              <div className="mt-5 flex flex-wrap gap-3">
                <a
                  href={selectedBooking.booking.payment_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  Open Stripe checkout
                </a>
                <button
                  type="button"
                  onClick={onSendConfirmation}
                  disabled={sendingConfirmation}
                  className="inline-flex rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
                >
                  {sendingConfirmation ? 'Sending confirmation...' : 'Send confirmation email'}
                </button>
              </div>
            ) : null}

            <div className="mt-4">
              <label className="block text-sm">
                <span className="mb-2 block font-semibold text-slate-700">
                  Manual confirmation note
                </span>
                <textarea
                  value={confirmNote}
                  onChange={(event) => onConfirmNoteChange(event.target.value)}
                  rows={4}
                  placeholder="Optional extra note to include in the manual confirmation email."
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-sky-400"
                />
              </label>
              {confirmationMessage ? (
                <div className="mt-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                  {confirmationMessage}
                </div>
              ) : null}
            </div>
          </div>

          <div className="mt-5 space-y-3">
            {selectedBooking.events.map((event) => (
              <article key={event.id} className="rounded-[1.5rem] border border-slate-200 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="text-sm font-semibold text-slate-950">{event.event_type}</div>
                  <div className="text-xs text-slate-500">{formatDateTime(event.created_at)}</div>
                </div>
                <div className="mt-2 flex flex-wrap gap-2 text-xs">
                  <span className="rounded-full bg-slate-100 px-3 py-1 font-semibold text-slate-700">
                    {event.source}
                  </span>
                  {event.workflow_status ? (
                    <span
                      className={`rounded-full px-3 py-1 font-semibold ${statusTone(event.workflow_status)}`}
                    >
                      {event.workflow_status}
                    </span>
                  ) : null}
                </div>
                {event.message_text ? (
                  <p className="mt-3 text-sm leading-6 text-slate-600">{event.message_text}</p>
                ) : null}
                {event.ai_reply ? (
                  <p className="mt-3 rounded-2xl bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-600">
                    {event.ai_reply}
                  </p>
                ) : null}
              </article>
            ))}
          </div>
        </>
      ) : (
        <p className="mt-4 text-sm text-slate-600">Select a booking to inspect its full event timeline.</p>
      )}
    </section>
  );
}
