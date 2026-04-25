import { FormEvent, useEffect, useMemo, useState } from 'react';

import { brandPreferredLogoPath } from '../../components/landing/data';
import { BrandLockup } from '../../components/landing/ui/BrandLockup';
import { apiV1 } from '../../shared/api/v1';
import type { PortalBookingAction, PortalBookingDetailResponse } from '../../shared/contracts';

type PortalLoadState =
  | { status: 'idle' }
  | { status: 'loading'; bookingReference: string }
  | { status: 'error'; bookingReference: string; message: string }
  | { status: 'ready'; bookingReference: string; detail: PortalBookingDetailResponse };

type PortalRequestMode = 'reschedule' | 'cancel' | 'pause' | 'downgrade' | null;

type PortalViewMode = 'overview' | 'edit' | 'reschedule' | 'cancel' | 'pause' | 'downgrade';

function readPortalReferenceFromUrl() {
  if (typeof window === 'undefined') {
    return '';
  }

  const url = new URL(window.location.href);
  return (
    url.searchParams.get('booking_reference') ||
    url.searchParams.get('bookingReference') ||
    ''
  ).trim();
}

function readPortalViewFromUrl(): PortalViewMode {
  if (typeof window === 'undefined') {
    return 'overview';
  }

  const url = new URL(window.location.href);
  const action = (url.searchParams.get('action') || url.searchParams.get('view') || 'overview').trim().toLowerCase();
  if (action === 'edit') return 'edit';
  if (action === 'reschedule') return 'reschedule';
  if (action === 'cancel') return 'cancel';
  if (action === 'pause') return 'pause';
  if (action === 'downgrade') return 'downgrade';
  return 'overview';
}

function syncPortalReferenceToUrl(bookingReference: string) {
  if (typeof window === 'undefined') {
    return;
  }

  const url = new URL(window.location.href);
  if (bookingReference.trim()) {
    url.searchParams.set('booking_reference', bookingReference.trim());
  } else {
    url.searchParams.delete('booking_reference');
  }
  window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
}

function syncPortalRouteState(bookingReference: string, viewMode: PortalViewMode) {
  if (typeof window === 'undefined') {
    return;
  }

  const url = new URL(window.location.href);
  if (bookingReference.trim()) {
    url.searchParams.set('booking_reference', bookingReference.trim());
  } else {
    url.searchParams.delete('booking_reference');
  }

  if (viewMode === 'overview') {
    url.searchParams.delete('action');
  } else {
    url.searchParams.set('action', viewMode);
  }

  window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
}

function formatDateTime(dateValue?: string | null, timeValue?: string | null, timezone?: string | null) {
  if (!dateValue && !timeValue) {
    return 'Awaiting schedule confirmation';
  }

  const parts = [dateValue, timeValue].filter(Boolean);
  return `${parts.join(' • ')}${timezone ? ` • ${timezone}` : ''}`;
}

function formatMoney(detail: PortalBookingDetailResponse['service'], payment: PortalBookingDetailResponse['payment']) {
  if (detail.display_price?.trim()) {
    return detail.display_price.trim();
  }

  const amount = typeof payment.amount_aud === 'number' ? payment.amount_aud : detail.amount_aud;
  if (typeof amount !== 'number' || Number.isNaN(amount) || amount <= 0) {
    return 'Price confirmed directly with the provider';
  }

  const currency = (payment.currency || detail.currency_code || 'AUD').toUpperCase();
  try {
    return new Intl.NumberFormat(currency === 'VND' ? 'vi-VN' : 'en-AU', {
      style: 'currency',
      currency,
      maximumFractionDigits: currency === 'VND' ? 0 : 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount}`;
  }
}

function toneClasses(action: PortalBookingAction) {
  if (!action.enabled) {
    return 'border-slate-200 bg-slate-100 text-slate-400';
  }
  if (action.style === 'primary') {
    return 'border-[#0f62fe] bg-[#0f62fe] text-white hover:bg-[#0b57e3]';
  }
  if (action.style === 'danger') {
    return 'border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100';
  }
  return 'border-slate-200 bg-white text-slate-800 hover:bg-slate-50';
}

function timelineToneClasses(tone: 'complete' | 'current' | 'upcoming') {
  if (tone === 'complete') {
    return 'bg-emerald-500';
  }
  if (tone === 'current') {
    return 'bg-[#0f62fe]';
  }
  return 'bg-slate-300';
}

function statusSummaryClasses(tone: 'healthy' | 'monitor' | 'attention') {
  if (tone === 'healthy') {
    return 'border-emerald-200 bg-emerald-50 text-emerald-900';
  }
  if (tone === 'attention') {
    return 'border-rose-200 bg-rose-50 text-rose-900';
  }
  return 'border-sky-200 bg-sky-50 text-sky-900';
}

function formatCreatedAt(value?: string | null) {
  if (!value) {
    return 'Recently created';
  }

  try {
    return new Intl.DateTimeFormat('en-AU', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(value));
  } catch {
    return value;
  }
}

export function PortalApp() {
  const initialReference = useMemo(() => readPortalReferenceFromUrl(), []);
  const initialViewMode = useMemo(() => readPortalViewFromUrl(), []);
  const [lookupReference, setLookupReference] = useState(initialReference);
  const [requestMode, setRequestMode] = useState<PortalRequestMode>(null);
  const [viewMode, setViewMode] = useState<PortalViewMode>(initialViewMode);
  const [requestNote, setRequestNote] = useState('');
  const [requestPreferredDate, setRequestPreferredDate] = useState('');
  const [requestPreferredTime, setRequestPreferredTime] = useState('');
  const [requestTimezone, setRequestTimezone] = useState('Australia/Sydney');
  const [requestMessage, setRequestMessage] = useState<string | null>(null);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [submittingRequest, setSubmittingRequest] = useState(false);
  const [loadState, setLoadState] = useState<PortalLoadState>(
    initialReference ? { status: 'loading', bookingReference: initialReference } : { status: 'idle' },
  );

  useEffect(() => {
    if (!initialReference) {
      return;
    }

    let cancelled = false;

    async function load() {
      try {
        const envelope = await apiV1.getPortalBookingDetail(initialReference);
        if (cancelled || envelope.status !== 'ok') {
          return;
        }

        setLoadState({
          status: 'ready',
          bookingReference: initialReference,
          detail: envelope.data,
        });
      } catch (error) {
        if (cancelled) {
          return;
        }
        const message =
          error instanceof Error ? error.message : 'We could not load that booking reference right now.';
        setLoadState({
          status: 'error',
          bookingReference: initialReference,
          message,
        });
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [initialReference]);

  async function handleLookup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedReference = lookupReference.trim();
    syncPortalRouteState(normalizedReference, viewMode);

    if (!normalizedReference) {
      setLoadState({ status: 'idle' });
      return;
    }

    setLoadState({ status: 'loading', bookingReference: normalizedReference });

    try {
      const envelope = await apiV1.getPortalBookingDetail(normalizedReference);
      if (envelope.status !== 'ok') {
        return;
      }
      setRequestMode(null);
      setRequestMessage(null);
      setRequestError(null);
      setLoadState({
        status: 'ready',
        bookingReference: normalizedReference,
        detail: envelope.data,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'We could not load that booking reference right now.';
      setLoadState({
        status: 'error',
        bookingReference: normalizedReference,
        message,
      });
    }
  }

  const detail = loadState.status === 'ready' ? loadState.detail : null;

  function openRequestComposer(mode: Exclude<PortalRequestMode, null>) {
    setRequestMode(mode);
    setViewMode(mode);
    if (detail?.booking.booking_reference) {
      syncPortalRouteState(detail.booking.booking_reference, mode);
    }
    setRequestMessage(null);
    setRequestError(null);
    setRequestNote('');
    setRequestPreferredDate('');
    setRequestPreferredTime('');
    setRequestTimezone('Australia/Sydney');
  }

  async function handlePortalRequestSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!detail) {
      return;
    }

    setSubmittingRequest(true);
    setRequestMessage(null);
    setRequestError(null);

    try {
        const requestPayload = {
          customer_note: requestNote.trim() || null,
          preferred_date: requestMode === 'reschedule' ? requestPreferredDate || null : null,
          preferred_time: requestMode === 'reschedule' ? requestPreferredTime || null : null,
          timezone: requestTimezone || null,
        };

      const envelope =
        requestMode === 'reschedule'
          ? await apiV1.requestPortalBookingReschedule(detail.booking.booking_reference, requestPayload)
          : requestMode === 'pause'
            ? await apiV1.requestPortalBookingPause(detail.booking.booking_reference, requestPayload)
            : requestMode === 'downgrade'
              ? await apiV1.requestPortalBookingDowngrade(detail.booking.booking_reference, requestPayload)
              : await apiV1.requestPortalBookingCancellation(detail.booking.booking_reference, requestPayload);

      if (envelope.status !== 'ok') {
        return;
      }

      setRequestMessage(envelope.data.message);
      setRequestMode(null);
      setViewMode('overview');
      syncPortalRouteState(detail.booking.booking_reference, 'overview');
    } catch (error) {
      setRequestError(
        error instanceof Error ? error.message : 'We could not submit that portal request right now.',
      );
    } finally {
      setSubmittingRequest(false);
    }
  }

  useEffect(() => {
    if (!detail) {
      return;
    }

    if (initialViewMode === 'reschedule') {
      openRequestComposer('reschedule');
      return;
    }

    if (initialViewMode === 'cancel') {
      openRequestComposer('cancel');
      return;
    }

    if (initialViewMode === 'pause') {
      openRequestComposer('pause');
      return;
    }

    if (initialViewMode === 'downgrade') {
      openRequestComposer('downgrade');
      return;
    }

    setViewMode(initialViewMode);
    syncPortalRouteState(detail.booking.booking_reference, initialViewMode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detail?.booking.booking_reference]);

  return (
    <main className="public-apple-shell min-h-screen text-[#172033]">
      <section className="px-4 pt-4 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-[1240px] items-center justify-between gap-3 rounded-[1.4rem] border border-white/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.96)_0%,rgba(244,248,253,0.96)_100%)] px-3 py-2 shadow-[0_18px_50px_rgba(15,23,42,0.10)] backdrop-blur">
          <a href="/" className="min-w-0 rounded-[1.1rem] border border-black/6 bg-white px-2.5 py-2 shadow-[0_10px_24px_rgba(15,23,42,0.05)]">
            <BrandLockup
              logoSrc={brandPreferredLogoPath}
              compact={false}
              surface="light"
              className="min-w-0"
              logoClassName="booked-brand-image h-[2.35rem] w-[8.35rem] sm:h-[2.55rem] sm:w-[9rem]"
              descriptorClassName="hidden"
              eyebrowClassName="hidden"
            />
          </a>

          <div className="flex items-center gap-2">
            {[
              { label: 'Language: EN', href: '#portal-top' },
              { label: 'Homepage', href: '/' },
              { label: 'Pitch', href: 'https://pitch.bookedai.au' },
            ].map((item) => (
              <a
                key={item.label}
                href={item.href}
                className="hidden rounded-full border border-slate-200 bg-white px-3 py-2 text-[11px] font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-950 sm:inline-flex"
              >
                {item.label}
              </a>
            ))}
          </div>
        </div>
      </section>

      <section id="portal-top" className="px-4 py-4 sm:px-6 lg:px-8 lg:py-5">
        <div className="mx-auto flex max-w-[1240px] flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#172033]/45">
              Booking portal
            </div>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-[2rem]">
              Review your booking, payment, and next steps in one place.
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-[#172033]/62">
              Enter your booking reference to see the latest status, payment details, and any follow-up from the provider. You can also reschedule, edit, or cancel from here.
            </p>
          </div>

          <form onSubmit={handleLookup} className="w-full max-w-[30rem] rounded-[1.75rem] border border-slate-200 bg-slate-50 p-3 shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
            <label className="block text-[11px] font-semibold uppercase tracking-[0.16em] text-[#172033]/45">
              Booking reference
            </label>
            <div className="mt-2 flex flex-col gap-2 sm:flex-row">
              <input
                type="text"
                value={lookupReference}
                onChange={(event) => setLookupReference(event.target.value)}
                placeholder="Enter booking reference"
                className="min-h-[2.75rem] flex-1 rounded-[0.95rem] border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none ring-0 placeholder:text-slate-400 focus:border-[#0f62fe]"
              />
              <button
                type="submit"
                className="booked-button"
              >
                Review booking
              </button>
            </div>
          </form>
        </div>
      </section>

      <section className="px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <div className="mx-auto grid max-w-[1180px] gap-6 lg:grid-cols-[minmax(0,1.55fr)_minmax(20rem,0.95fr)]">
          <div className="space-y-6">
            {loadState.status === 'idle' ? (
              <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
                <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#172033]/45">
                  Start here
                </div>
                <h2 className="mt-3 text-xl font-semibold">Look up an existing booking reference</h2>
                <p className="mt-3 max-w-2xl text-sm leading-7 text-[#172033]/62">
                  Enter the booking reference from your confirmation screen or email to review the
                  latest schedule, payment, and support details.
                </p>
              </section>
            ) : null}

            {loadState.status === 'loading' ? (
              <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
                <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#172033]/45">
                  Loading
                </div>
                <h2 className="mt-3 text-xl font-semibold">
                  Fetching booking {loadState.bookingReference}
                </h2>
                <p className="mt-3 text-sm leading-7 text-[#172033]/62">
                  We are loading the latest booking, payment, and support details for this reference.
                </p>
              </section>
            ) : null}

            {loadState.status === 'error' ? (
              <section className="rounded-[2rem] border border-rose-200 bg-rose-50 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.04)]">
                <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-rose-700">
                  Booking not available
                </div>
                <h2 className="mt-3 text-xl font-semibold text-rose-950">
                  We could not load {loadState.bookingReference}
                </h2>
                <p className="mt-3 text-sm leading-7 text-rose-800/80">{loadState.message}</p>
              </section>
            ) : null}

            {detail ? (
              <>
                <section className="rounded-[1.6rem] border border-slate-200 bg-white p-4 shadow-[0_16px_44px_rgba(15,23,42,0.05)]">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#172033]/45">
                        Manage booking
                      </div>
                      <div className="mt-1 text-sm font-semibold text-slate-900">
                        {viewMode === 'overview'
                          ? 'Booking overview'
                          : viewMode === 'edit'
                            ? 'Edit booking request'
                            : viewMode === 'reschedule'
                              ? 'Reschedule request'
                              : viewMode === 'pause'
                                ? 'Pause request'
                                : viewMode === 'downgrade'
                                  ? 'Downgrade request'
                                  : 'Cancellation request'}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {[
                        { id: 'overview', label: 'Overview' },
                        { id: 'edit', label: 'Edit' },
                        { id: 'reschedule', label: 'Reschedule' },
                        { id: 'pause', label: 'Pause' },
                        { id: 'downgrade', label: 'Downgrade' },
                        { id: 'cancel', label: 'Cancel' },
                      ].map((item) => {
                        const active = viewMode === item.id;
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => {
                              const nextView = item.id as PortalViewMode;
                              setViewMode(nextView);
                              if (nextView === 'reschedule') {
                                openRequestComposer('reschedule');
                                return;
                              }
                              if (nextView === 'cancel') {
                                openRequestComposer('cancel');
                                return;
                              }
                              if (nextView === 'pause') {
                                openRequestComposer('pause');
                                return;
                              }
                              if (nextView === 'downgrade') {
                                openRequestComposer('downgrade');
                                return;
                              }
                              setRequestMode(null);
                              syncPortalRouteState(detail.booking.booking_reference, nextView);
                            }}
                            className={`rounded-full px-3 py-2 text-[11px] font-semibold transition ${
                              active
                                ? 'bg-[#0f62fe] text-white'
                                : 'border border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-950'
                            }`}
                          >
                            {item.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </section>

                <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#172033]/45">
                        Booking summary
                      </div>
                      <h2 className="mt-3 text-[1.8rem] font-semibold tracking-tight">
                        {detail.booking.booking_reference}
                      </h2>
                      <p className="mt-2 text-sm leading-7 text-[#172033]/62">
                        {detail.service.service_name || 'Requested service'} with{' '}
                        {detail.service.business_name || 'the provider team'}.
                      </p>
                    </div>
                    <div className="grid gap-2">
                      <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">
                        {detail.booking.status === 'captured' ? 'Received'
                          : detail.booking.status === 'confirmed' ? 'Confirmed'
                          : detail.booking.status === 'cancelled' ? 'Cancelled'
                          : detail.booking.status === 'completed' ? 'Completed'
                          : detail.booking.status.replace(/_/g, ' ')}
                      </span>
                      <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">
                        {detail.payment.status === 'pending' ? 'Payment pending'
                          : detail.payment.status === 'paid' ? 'Paid'
                          : detail.payment.status === 'requires_action' ? 'Payment required'
                          : detail.payment.status === 'refunded' ? 'Refunded'
                          : detail.payment.status.replace(/_/g, ' ')}
                      </span>
                    </div>
                  </div>

                  <div className="mt-6 grid gap-4 md:grid-cols-3">
                    <div className="rounded-[1.4rem] border border-slate-200 bg-slate-50 p-4">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#172033]/45">
                        Schedule
                      </div>
                      <div className="mt-2 text-sm font-semibold text-slate-900">
                        {formatDateTime(
                          detail.booking.requested_date,
                          detail.booking.requested_time,
                          detail.booking.timezone,
                        )}
                      </div>
                    </div>
                    <div className="rounded-[1.4rem] border border-slate-200 bg-slate-50 p-4">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#172033]/45">
                        Payment
                      </div>
                      <div className="mt-2 text-sm font-semibold text-slate-900">
                        {formatMoney(detail.service, detail.payment)}
                      </div>
                    </div>
                    <div className="rounded-[1.4rem] border border-slate-200 bg-slate-50 p-4">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#172033]/45">
                        Created
                      </div>
                      <div className="mt-2 text-sm font-semibold text-slate-900">
                        {formatCreatedAt(detail.booking.created_at)}
                      </div>
                    </div>
                    <div className="rounded-[1.4rem] border border-slate-200 bg-slate-50 p-4">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#172033]/45">
                        Booking type
                      </div>
                      <div className="mt-2 text-sm font-semibold text-slate-900">
                        {detail.booking.booking_path === 'instant_book' ? 'Instant booking'
                          : detail.booking.booking_path === 'book_on_partner_site' ? 'Partner booking'
                          : detail.booking.booking_path === 'request_callback' ? 'Booking request'
                          : 'Booking request'}
                      </div>
                    </div>
                  </div>

                  <div className={`mt-6 rounded-[1.4rem] border px-4 py-4 ${statusSummaryClasses(detail.status_summary.tone)}`}>
                    <div className="text-sm font-semibold">{detail.status_summary.title}</div>
                    <div className="mt-1 text-sm leading-6 opacity-90">{detail.status_summary.body}</div>
                  </div>

                  {viewMode === 'edit' ? (
                    <div className="mt-6 rounded-[1.4rem] border border-[#d2e3fc] bg-[linear-gradient(180deg,#f8fbff_0%,#ffffff_100%)] px-4 py-4">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#0f62fe]">
                        Edit booking
                      </div>
                      <div className="mt-2 text-sm font-semibold text-slate-900">
                        Review your current booking details, then use the options below to reschedule or cancel.
                      </div>
                      <div className="mt-2 text-sm leading-6 text-slate-600">
                        Using the portal keeps your booking reference and support history in one place — no need to email or start over.
                      </div>
                    </div>
                  ) : null}

                  {detail.academy_report_preview ? (
                    <div className="mt-6 rounded-[1.5rem] border border-emerald-200 bg-[linear-gradient(180deg,#f4fbf7_0%,#ffffff_100%)] p-5">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-700">
                        Academy progress preview
                      </div>
                      <div className="mt-2 text-lg font-semibold text-slate-900">
                        {detail.academy_report_preview.headline}
                      </div>
                      <p className="mt-3 text-sm leading-6 text-slate-700">
                        {detail.academy_report_preview.summary}
                      </p>
                      <div className="mt-4 grid gap-4 md:grid-cols-2">
                        <div className="rounded-[1.1rem] border border-emerald-100 bg-white p-4">
                          <div className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700">
                            Strengths
                          </div>
                          <div className="mt-2 text-sm leading-6 text-slate-700">
                            {detail.academy_report_preview.strengths.join(' • ')}
                          </div>
                        </div>
                        <div className="rounded-[1.1rem] border border-amber-100 bg-white p-4">
                          <div className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-700">
                            Focus next
                          </div>
                          <div className="mt-2 text-sm leading-6 text-slate-700">
                            {detail.academy_report_preview.focus_areas.join(' • ')}
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </section>

                <section className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(18rem,0.9fr)]">
                  <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#172033]/45">
                      Provider and service
                    </div>
                    <h3 className="mt-3 text-xl font-semibold">{detail.service.service_name || 'Service details'}</h3>
                    <p className="mt-3 text-sm leading-7 text-[#172033]/62">
                      {detail.service.summary || 'The provider will confirm the final service details directly.'}
                    </p>
                    <dl className="mt-6 grid gap-4 sm:grid-cols-2">
                      <div>
                        <dt className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#172033]/45">
                          Business
                        </dt>
                        <dd className="mt-2 text-sm font-medium text-slate-900">
                          {detail.service.business_name || 'BookedAI provider'}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#172033]/45">
                          Location
                        </dt>
                        <dd className="mt-2 text-sm font-medium text-slate-900">
                          {detail.service.location || detail.service.venue_name || 'Location confirmed during follow-up'}
                        </dd>
                        {detail.service.map_url ? (
                          <a
                            href={detail.service.map_url}
                            className="mt-2 inline-flex text-sm font-medium text-[#0f62fe]"
                          >
                            Open map
                          </a>
                        ) : null}
                      </div>
                      <div>
                        <dt className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#172033]/45">
                          Category
                        </dt>
                        <dd className="mt-2 text-sm font-medium text-slate-900">
                          {detail.service.category || 'Service'}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#172033]/45">
                          Duration
                        </dt>
                        <dd className="mt-2 text-sm font-medium text-slate-900">
                          {detail.service.duration_minutes ? `${detail.service.duration_minutes} minutes` : 'Duration confirmed during follow-up'}
                        </dd>
                      </div>
                    </dl>
                  </div>

                  <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#172033]/45">
                      Customer details
                    </div>
                    <dl className="mt-4 grid gap-4">
                      <div>
                        <dt className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#172033]/45">
                          Name
                        </dt>
                        <dd className="mt-2 text-sm font-medium text-slate-900">
                          {detail.customer.full_name || 'Recorded during booking'}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#172033]/45">
                          Email
                        </dt>
                        <dd className="mt-2 text-sm font-medium text-slate-900">
                          {detail.customer.email || 'Email not available'}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#172033]/45">
                          Phone
                        </dt>
                        <dd className="mt-2 text-sm font-medium text-slate-900">
                          {detail.customer.phone || 'Phone not available'}
                        </dd>
                      </div>
                    </dl>
                  </div>
                </section>

                <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#172033]/45">
                    Booking timeline
                  </div>
                  <div className="mt-5 space-y-4">
                    {detail.status_timeline.map((item) => (
                      <div key={item.id} className="flex gap-4">
                        <div className={`mt-1 h-3 w-3 rounded-full ${timelineToneClasses(item.tone)}`} />
                        <div>
                          <div className="text-sm font-semibold text-slate-900">{item.label}</div>
                          <div className="mt-1 text-sm leading-6 text-[#172033]/62">{item.detail}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              </>
            ) : null}
          </div>

          <aside className="space-y-6">
            {detail ? (
              <>
                <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#172033]/45">
                    What would you like to do?
                  </div>
                  <div className="mt-3 grid gap-3">
                    {[
                      {
                        title: 'Overview',
                        body: 'Review booking reference, payment, provider details, and timeline.',
                        mode: 'overview' as const,
                      },
                      {
                        title: 'Edit booking',
                        body: 'Update your details or preferred time and resubmit directly from this portal.',
                        mode: 'edit' as const,
                      },
                      {
                        title: 'Reschedule',
                        body: 'Request a new time and the provider will confirm the updated slot with you.',
                        mode: 'reschedule' as const,
                      },
                      {
                        title: 'Pause',
                        body: 'Tell the academy when you need a temporary pause instead of dropping out.',
                        mode: 'pause' as const,
                      },
                      {
                        title: 'Downgrade',
                        body: 'Request a lighter plan when schedule or budget changes.',
                        mode: 'downgrade' as const,
                      },
                      {
                        title: 'Cancel',
                        body: 'Submit a cancellation request and the provider will confirm and process it.',
                        mode: 'cancel' as const,
                      },
                    ].map((item) => {
                      const active = viewMode === item.mode;
                      return (
                        <button
                          key={item.title}
                          type="button"
                          onClick={() => {
                            setViewMode(item.mode);
                            if (item.mode === 'reschedule') {
                              openRequestComposer('reschedule');
                              return;
                            }
                            if (item.mode === 'cancel') {
                              openRequestComposer('cancel');
                              return;
                            }
                            if (item.mode === 'pause') {
                              openRequestComposer('pause');
                              return;
                            }
                            if (item.mode === 'downgrade') {
                              openRequestComposer('downgrade');
                              return;
                            }
                            setRequestMode(null);
                            syncPortalRouteState(detail.booking.booking_reference, item.mode);
                          }}
                          className={`rounded-[1.2rem] border px-4 py-3 text-left transition ${
                            active
                              ? 'border-[#d2e3fc] bg-[#eef4ff]'
                              : 'border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-white'
                          }`}
                        >
                          <div className="text-sm font-semibold text-slate-900">{item.title}</div>
                          <div className="mt-1 text-xs leading-5 text-slate-600">{item.body}</div>
                        </button>
                      );
                    })}
                  </div>
                </section>

                <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#172033]/45">
                    Quick actions
                  </div>
                  <div className="mt-4 grid gap-3">
                    {detail.allowed_actions.map((action) => {
                      if (action.id === 'request_reschedule') {
                        return (
                          <button
                            key={action.id}
                            type="button"
                            disabled={!action.enabled}
                            onClick={() => openRequestComposer('reschedule')}
                            className={`rounded-[1.2rem] border px-4 py-3 text-left text-sm transition ${toneClasses(action)}`}
                          >
                            <div className="font-semibold">{action.label}</div>
                            <div className="mt-1 text-xs opacity-80">{action.note || action.description}</div>
                          </button>
                        );
                      }

                      if (action.id === 'request_cancel') {
                        return (
                          <button
                            key={action.id}
                            type="button"
                            disabled={!action.enabled}
                            onClick={() => openRequestComposer('cancel')}
                            className={`rounded-[1.2rem] border px-4 py-3 text-left text-sm transition ${toneClasses(action)}`}
                          >
                            <div className="font-semibold">{action.label}</div>
                            <div className="mt-1 text-xs opacity-80">{action.note || action.description}</div>
                          </button>
                        );
                      }

                      if (action.id === 'request_pause') {
                        return (
                          <button
                            key={action.id}
                            type="button"
                            disabled={!action.enabled}
                            onClick={() => openRequestComposer('pause')}
                            className={`rounded-[1.2rem] border px-4 py-3 text-left text-sm transition ${toneClasses(action)}`}
                          >
                            <div className="font-semibold">{action.label}</div>
                            <div className="mt-1 text-xs opacity-80">{action.note || action.description}</div>
                          </button>
                        );
                      }

                      if (action.id === 'request_downgrade') {
                        return (
                          <button
                            key={action.id}
                            type="button"
                            disabled={!action.enabled}
                            onClick={() => openRequestComposer('downgrade')}
                            className={`rounded-[1.2rem] border px-4 py-3 text-left text-sm transition ${toneClasses(action)}`}
                          >
                            <div className="font-semibold">{action.label}</div>
                            <div className="mt-1 text-xs opacity-80">{action.note || action.description}</div>
                          </button>
                        );
                      }

                      return action.href && action.enabled ? (
                        <a
                          key={action.id}
                          href={action.href}
                          className={`rounded-[1.2rem] border px-4 py-3 text-sm transition ${toneClasses(action)}`}
                        >
                          <div className="font-semibold">{action.label}</div>
                          <div className="mt-1 text-xs opacity-80">{action.description}</div>
                        </a>
                      ) : (
                        <div
                          key={action.id}
                          className={`rounded-[1.2rem] border px-4 py-3 text-sm ${toneClasses(action)}`}
                        >
                          <div className="font-semibold">{action.label}</div>
                          <div className="mt-1 text-xs opacity-80">{action.note || action.description}</div>
                        </div>
                      );
                    })}
                  </div>

                  {requestMessage ? (
                    <div className="mt-4 rounded-[1.2rem] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                      {requestMessage}
                    </div>
                  ) : null}

                  {requestError ? (
                    <div className="mt-4 rounded-[1.2rem] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                      {requestError}
                    </div>
                  ) : null}

                  {requestMode ? (
                    <form onSubmit={handlePortalRequestSubmit} className="mt-4 space-y-3 rounded-[1.4rem] border border-slate-200 bg-slate-50 p-4">
                      <div className="text-sm font-semibold text-slate-900">
                        {requestMode === 'reschedule'
                          ? 'Request a new time'
                          : requestMode === 'pause'
                            ? 'Request a learning pause'
                            : requestMode === 'downgrade'
                              ? 'Request a lighter plan'
                              : 'Request cancellation'}
                      </div>
                      {requestMode === 'reschedule' ? (
                        <div className="grid gap-3 sm:grid-cols-2">
                          <label className="text-sm">
                            <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.14em] text-[#172033]/45">
                              Preferred date
                            </span>
                            <input
                              type="date"
                              value={requestPreferredDate}
                              onChange={(event) => setRequestPreferredDate(event.target.value)}
                              className="min-h-[2.75rem] w-full rounded-[1rem] border border-slate-200 bg-white px-3 text-sm text-slate-900"
                            />
                          </label>
                          <label className="text-sm">
                            <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.14em] text-[#172033]/45">
                              Preferred time
                            </span>
                            <input
                              type="time"
                              value={requestPreferredTime}
                              onChange={(event) => setRequestPreferredTime(event.target.value)}
                              className="min-h-[2.75rem] w-full rounded-[1rem] border border-slate-200 bg-white px-3 text-sm text-slate-900"
                            />
                          </label>
                        </div>
                      ) : null}
                      <label className="text-sm">
                        <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.14em] text-[#172033]/45">
                          Note
                        </span>
                        <textarea
                          value={requestNote}
                          onChange={(event) => setRequestNote(event.target.value)}
                          rows={4}
                          placeholder={
                            requestMode === 'reschedule'
                              ? 'Share your preferred timing or anything the team should know.'
                              : requestMode === 'pause'
                                ? 'Tell the academy why you need to pause and for how long if known.'
                                : requestMode === 'downgrade'
                                  ? 'Tell the academy what should change, such as weekly frequency or budget.'
                                  : 'Tell the team why you need to cancel this booking.'
                          }
                          className="w-full rounded-[1rem] border border-slate-200 bg-white px-3 py-3 text-sm text-slate-900"
                        />
                      </label>
                      <div className="flex gap-3">
                        <button
                          type="submit"
                          disabled={submittingRequest}
                          className="booked-button disabled:opacity-60"
                        >
                          {submittingRequest ? 'Submitting...' : 'Submit request'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setRequestMode(null)}
                          className="booked-button-secondary"
                        >
                          Close
                        </button>
                      </div>
                    </form>
                  ) : null}
                </section>

                {detail.academy_report_preview ? (
                  <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#172033]/45">
                      Student progress and retention
                    </div>
                    <div className="mt-3 text-lg font-semibold text-slate-900">
                      {detail.academy_report_preview.student_name} with {detail.academy_report_preview.guardian_name}
                    </div>
                    <p className="mt-3 text-sm leading-7 text-[#172033]/62">
                      {detail.academy_report_preview.parent_cta}
                    </p>
                    <div className="mt-4 rounded-[1.2rem] border border-slate-200 bg-slate-50 p-4">
                      <div className="text-xs font-semibold uppercase tracking-[0.14em] text-[#172033]/45">
                        Next recommended class
                      </div>
                      <div className="mt-2 text-sm font-semibold text-slate-900">
                        {detail.academy_report_preview.next_class_suggestion.class_label}
                      </div>
                      <div className="mt-1 text-sm text-slate-600">
                        {detail.academy_report_preview.next_class_suggestion.slot_label}
                      </div>
                      <div className="mt-1 text-sm text-slate-600">
                        {detail.academy_report_preview.next_class_suggestion.plan_label}
                      </div>
                    </div>
                    <div className="mt-4 text-sm leading-6 text-slate-600">
                      {detail.academy_report_preview.retention_reasoning}
                    </div>
                  </section>
                ) : null}

                <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#172033]/45">
                    Support
                  </div>
                  <div className="mt-3 text-lg font-semibold text-slate-900">
                    {detail.support.contact_label || 'Support contact'}
                  </div>
                  <p className="mt-3 text-sm leading-7 text-[#172033]/62">
                    If you need to change something that is not available directly in the portal,
                    contact the support team using the details below.
                  </p>
                  <div className="mt-4 grid gap-2 text-sm text-slate-900">
                    <a href={`mailto:${detail.support.contact_email}`} className="font-medium text-[#0f62fe]">
                      {detail.support.contact_email || 'support@bookedai.au'}
                    </a>
                    <div>{detail.support.contact_phone || 'Phone support details will be confirmed directly if needed.'}</div>
                  </div>
                </section>

                <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#172033]/45">
                    Need another booking?
                  </div>
                  <div className="mt-3 text-lg font-semibold text-slate-900">
                    Go back to homepage search
                  </div>
                  <p className="mt-3 text-sm leading-7 text-[#172033]/62">
                    If you need to find another venue, provider, or service, return to the BookedAI homepage and start a new search without losing this booking reference.
                  </p>
                  <a href="/" className="booked-button mt-4 inline-flex">
                    Search again on homepage
                  </a>
                </section>

                {detail.booking.notes ? (
                  <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#172033]/45">
                      Notes
                    </div>
                    <p className="mt-3 text-sm leading-7 text-[#172033]/62">{detail.booking.notes}</p>
                  </section>
                ) : null}
              </>
            ) : (
              <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
                <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#172033]/45">
                  Portal actions
                </div>
                <p className="mt-3 text-sm leading-7 text-[#172033]/62">
                  Once a booking reference is loaded, this panel will show the professional review
                  and follow-up actions currently available for that booking.
                </p>
                <div className="mt-4 rounded-[1.2rem] border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-7 text-[#172033]/62">
                  The portal currently supports booking review plus request-safe follow-up actions. If
                  a booking reference is invalid or already closed, the portal will explain the status
                  and limit any actions that are no longer safe to submit.
                </div>
              </section>
            )}
          </aside>
        </div>
      </section>
    </main>
  );
}
