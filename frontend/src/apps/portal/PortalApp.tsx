import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  Clock3,
  CreditCard,
  HelpCircle,
  Home,
  Mail,
  MapPin,
  NotebookTabs,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  UserRound,
  XCircle,
} from 'lucide-react';

import { brandPreferredLogoPath } from '../../components/landing/data';
import { BrandLockup } from '../../components/landing/ui/BrandLockup';
import { apiV1 } from '../../shared/api/v1';
import type {
  PortalBookingAction,
  PortalBookingDetailResponse,
  PortalCustomerCareTurnResponse,
} from '../../shared/contracts';

type PortalLoadState =
  | { status: 'idle' }
  | { status: 'loading'; bookingReference: string }
  | { status: 'error'; bookingReference: string; message: string; recoverable?: boolean }
  | { status: 'ready'; bookingReference: string; detail: PortalBookingDetailResponse };

type PortalRequestMode = 'reschedule' | 'cancel' | 'pause' | 'downgrade' | null;

type PortalViewMode =
  | 'overview'
  | 'status'
  | 'pay'
  | 'edit'
  | 'reschedule'
  | 'cancel'
  | 'pause'
  | 'downgrade'
  | 'change_plan'
  | 'help';
type PortalExperimentVariant = 'control' | 'status_first';
type PortalEventWindow = Window & {
  dataLayer?: Array<Record<string, unknown>>;
  __bookedaiPortalEvents?: Array<Record<string, unknown>>;
};

const portalViewItems: Array<{
  id: PortalViewMode;
  label: string;
  shortLabel: string;
  body: string;
}> = [
  {
    id: 'status',
    label: 'Status',
    shortLabel: 'Status',
    body: 'Booking reference, schedule, payment posture, provider details, and timeline.',
  },
  {
    id: 'pay',
    label: 'Pay',
    shortLabel: 'Pay',
    body: 'Review the current payment state and complete checkout when a secure link is available.',
  },
  {
    id: 'reschedule',
    label: 'Reschedule',
    shortLabel: 'Reschedule',
    body: 'Request a new date or time and keep the original booking context.',
  },
  {
    id: 'help',
    label: 'Ask for help',
    shortLabel: 'Help',
    body: 'Ask the booking-care agent or contact support without losing this booking context.',
  },
  {
    id: 'change_plan',
    label: 'Change plan',
    shortLabel: 'Change plan',
    body: 'For academy or subscription bookings, request pause or a lighter plan for review.',
  },
  {
    id: 'cancel',
    label: 'Cancel',
    shortLabel: 'Cancel',
    body: 'Submit a cancellation request with support-visible context.',
  },
];

const controlPortalViewItems: Array<{
  id: PortalViewMode;
  label: string;
  shortLabel: string;
  body: string;
}> = [
  {
    id: 'overview',
    label: 'Overview',
    shortLabel: 'Overview',
    body: 'Booking reference, payment posture, provider details, and timeline.',
  },
  {
    id: 'edit',
    label: 'Edit request',
    shortLabel: 'Edit',
    body: 'Use one managed request path when details or preferences need to change.',
  },
  {
    id: 'reschedule',
    label: 'Reschedule',
    shortLabel: 'Reschedule',
    body: 'Request a new date or time and keep the original booking context.',
  },
  {
    id: 'pause',
    label: 'Pause plan',
    shortLabel: 'Pause',
    body: 'Ask for a temporary pause when a program should not be cancelled.',
  },
  {
    id: 'downgrade',
    label: 'Downgrade',
    shortLabel: 'Downgrade',
    body: 'Request a lighter plan or lower-frequency option for review.',
  },
  {
    id: 'cancel',
    label: 'Cancel',
    shortLabel: 'Cancel',
    body: 'Submit a cancellation request with support-visible context.',
  },
];
const portalViewTitleItems = [...portalViewItems, ...controlPortalViewItems];
const PORTAL_VARIANT_QUERY_PARAM = 'portal_variant';
const PORTAL_VARIANT_STORAGE_KEY = 'bookedai.portal.variant';
const BOOKEDAI_CUSTOMER_BOOKING_SUPPORT_EMAIL = 'info@bookedai.au';
const BOOKEDAI_CUSTOMER_BOOKING_SUPPORT_PHONE = '+61455301335';
const BOOKEDAI_CUSTOMER_BOOKING_SUPPORT_CHANNELS = 'Telegram, WhatsApp, or iMessage';

function isPortalExperimentVariant(value: string | null | undefined): value is PortalExperimentVariant {
  return value === 'control' || value === 'status_first';
}

function resolvePortalVariant(): PortalExperimentVariant {
  if (typeof window === 'undefined') {
    return 'status_first';
  }

  const url = new URL(window.location.href);
  const queryVariant = url.searchParams.get(PORTAL_VARIANT_QUERY_PARAM);
  if (isPortalExperimentVariant(queryVariant)) {
    window.localStorage.setItem(PORTAL_VARIANT_STORAGE_KEY, queryVariant);
    return queryVariant;
  }

  const storedVariant = window.localStorage.getItem(PORTAL_VARIANT_STORAGE_KEY);
  if (isPortalExperimentVariant(storedVariant)) {
    return storedVariant;
  }

  const defaultVariant: PortalExperimentVariant = 'status_first';
  window.localStorage.setItem(PORTAL_VARIANT_STORAGE_KEY, defaultVariant);
  return defaultVariant;
}

function trackPortalEvent(eventName: string, payload: Record<string, unknown> = {}) {
  if (typeof window === 'undefined') {
    return;
  }
  const eventWindow = window as PortalEventWindow;
  const eventPayload = {
    event: eventName,
    source: 'bookedai_portal',
    timestamp: new Date().toISOString(),
    ...payload,
  };
  eventWindow.__bookedaiPortalEvents = [...(eventWindow.__bookedaiPortalEvents ?? []), eventPayload];
  eventWindow.dataLayer = eventWindow.dataLayer ?? [];
  eventWindow.dataLayer.push(eventPayload);
  window.dispatchEvent(new CustomEvent('bookedai:portal-event', { detail: eventPayload }));
}

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
    return 'status';
  }

  const url = new URL(window.location.href);
  const action = (url.searchParams.get('action') || url.searchParams.get('view') || 'status').trim().toLowerCase();
  if (action === 'overview') return 'overview';
  if (action === 'status') return 'status';
  if (action === 'pay' || action === 'payment') return 'pay';
  if (action === 'edit') return 'edit';
  if (action === 'reschedule') return 'reschedule';
  if (action === 'cancel') return 'cancel';
  if (action === 'pause') return 'pause';
  if (action === 'downgrade') return 'downgrade';
  if (action === 'help' || action === 'support') return 'help';
  if (action === 'change_plan' || action === 'change-plan') return 'change_plan';
  return 'status';
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

  if (viewMode === 'overview' || viewMode === 'status') {
    url.searchParams.delete('action');
  } else {
    url.searchParams.set('action', viewMode);
  }

  window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
}

function normalizePortalLoadError(error: unknown) {
  const message = error instanceof Error ? error.message.trim() : '';
  const recoverableMessages = new Set([
    '',
    'Failed to fetch',
    'NetworkError when attempting to fetch resource.',
    'Load failed',
  ]);

  if (recoverableMessages.has(message)) {
    return {
      recoverable: true,
      message:
        'We could not refresh the latest details yet. Try again in a moment, or contact BookedAI support with this reference so we can continue the same request.',
    };
  }

  return {
    recoverable: false,
    message,
  };
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

function bookingStatusLabel(status: string) {
  if (status === 'captured') return 'Received';
  if (status === 'confirmed') return 'Confirmed';
  if (status === 'cancelled') return 'Cancelled';
  if (status === 'completed') return 'Completed';
  return status.replace(/_/g, ' ');
}

function paymentStatusLabel(status: string) {
  if (status === 'pending') return 'Payment pending';
  if (status === 'paid') return 'Paid';
  if (status === 'requires_action') return 'Payment required';
  if (status === 'refunded') return 'Refunded';
  return status.replace(/_/g, ' ');
}

function bookingPathLabel(bookingPath?: string | null) {
  if (bookingPath === 'instant_book') return 'Instant booking';
  if (bookingPath === 'book_on_partner_site') return 'Partner booking';
  if (bookingPath === 'request_callback') return 'Booking request';
  return 'Booking request';
}

function viewTitle(viewMode: PortalViewMode) {
  return portalViewTitleItems.find((item) => item.id === viewMode)?.label || 'Booking overview';
}

export function PortalApp() {
  const initialReference = useMemo(() => readPortalReferenceFromUrl(), []);
  const initialViewMode = useMemo(() => readPortalViewFromUrl(), []);
  const portalVariant = useMemo(() => resolvePortalVariant(), []);
  const activePortalViewItems = portalVariant === 'control' ? controlPortalViewItems : portalViewItems;
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
  const [careQuestion, setCareQuestion] = useState('');
  const [careTurn, setCareTurn] = useState<PortalCustomerCareTurnResponse | null>(null);
  const [careError, setCareError] = useState<string | null>(null);
  const [careLoading, setCareLoading] = useState(false);
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
        trackPortalEvent('portal_booking_loaded', {
          variant: portalVariant,
          booking_reference: initialReference,
          booking_status: envelope.data.booking.status,
          payment_status: envelope.data.payment.status,
          source: 'initial_reference',
        });
      } catch (error) {
        if (cancelled) {
          return;
        }
        const errorState = normalizePortalLoadError(error);
        setLoadState({
          status: 'error',
          bookingReference: initialReference,
          ...errorState,
        });
        trackPortalEvent('portal_lookup_failed', {
          variant: portalVariant,
          booking_reference: initialReference,
          recoverable: errorState.recoverable,
        });
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [initialReference, portalVariant]);

  async function handleLookup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedReference = lookupReference.trim();
    syncPortalRouteState(normalizedReference, viewMode);
    trackPortalEvent('portal_lookup_submitted', {
      variant: portalVariant,
      has_reference: Boolean(normalizedReference),
    });

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
      setCareTurn(null);
      setCareError(null);
      setLoadState({
        status: 'ready',
        bookingReference: normalizedReference,
        detail: envelope.data,
      });
      trackPortalEvent('portal_booking_loaded', {
        variant: portalVariant,
        booking_reference: normalizedReference,
        booking_status: envelope.data.booking.status,
        payment_status: envelope.data.payment.status,
        source: 'manual_lookup',
      });
    } catch (error) {
      const errorState = normalizePortalLoadError(error);
      setLoadState({
        status: 'error',
        bookingReference: normalizedReference,
        ...errorState,
      });
      trackPortalEvent('portal_lookup_failed', {
        variant: portalVariant,
        booking_reference: normalizedReference,
        recoverable: errorState.recoverable,
      });
    }
  }

  const detail = loadState.status === 'ready' ? loadState.detail : null;

  function openRequestComposer(mode: Exclude<PortalRequestMode, null>) {
    setRequestMode(mode);
    const routeViewMode = mode === 'pause' || mode === 'downgrade' ? 'change_plan' : mode;
    setViewMode(routeViewMode);
    if (detail?.booking.booking_reference) {
      syncPortalRouteState(detail.booking.booking_reference, routeViewMode);
    }
    trackPortalEvent('portal_request_composer_opened', { variant: portalVariant, mode });
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
      setViewMode('status');
      syncPortalRouteState(detail.booking.booking_reference, 'status');
      trackPortalEvent('portal_request_submitted', {
        variant: portalVariant,
        request_type: envelope.data.request_type,
        booking_reference: detail.booking.booking_reference,
      });
    } catch (error) {
      setRequestError(
        error instanceof Error ? error.message : 'We could not submit that portal request right now.',
      );
      trackPortalEvent('portal_request_failed', { variant: portalVariant, mode: requestMode });
    } finally {
      setSubmittingRequest(false);
    }
  }

  async function handleCustomerCareSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!detail || !careQuestion.trim()) {
      return;
    }

    setCareLoading(true);
    setCareError(null);
    try {
      const envelope = await apiV1.createPortalCustomerCareTurn(
        detail.booking.booking_reference,
        {
          message: careQuestion.trim(),
          customer_email: detail.customer.email ?? null,
          customer_phone: detail.customer.phone ?? null,
        },
      );
      if (envelope.status !== 'ok') {
        return;
      }
      setCareTurn(envelope.data);
      trackPortalEvent('portal_care_turn_completed', {
        variant: portalVariant,
        phase: envelope.data.phase,
        booking_reference: detail.booking.booking_reference,
        created_request: Boolean(envelope.data.created_request),
      });
    } catch (error) {
      setCareError(error instanceof Error ? error.message : 'The customer-care agent could not answer right now.');
      trackPortalEvent('portal_care_turn_failed', { variant: portalVariant });
    } finally {
      setCareLoading(false);
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

  function handlePortalViewSelect(nextView: PortalViewMode) {
    if (!detail) {
      return;
    }

    setViewMode(nextView);
    trackPortalEvent('portal_action_nav_clicked', {
      variant: portalVariant,
      view: nextView,
      booking_reference: detail.booking.booking_reference,
    });

    if (nextView === 'reschedule') {
      openRequestComposer('reschedule');
      return;
    }

    if (nextView === 'cancel') {
      openRequestComposer('cancel');
      return;
    }

    if (nextView === 'pause' || nextView === 'downgrade') {
      openRequestComposer(nextView);
      return;
    }

    setRequestMode(null);
    syncPortalRouteState(detail.booking.booking_reference, nextView);
  }

  return (
    <main className="min-h-screen bg-[#f4f7fb] text-[#172033]">
      <section className="px-4 pt-4 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-[1280px] items-center justify-between gap-3 rounded-[1.05rem] border border-slate-200 bg-white px-3 py-2 shadow-[0_16px_36px_rgba(15,23,42,0.08)]">
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
              { label: 'EN', href: '#portal-top' },
              { label: 'Home', href: '/' },
              { label: 'Pitch', href: 'https://pitch.bookedai.au' },
            ].map((item) => (
              <a
                key={item.label}
                href={item.href}
                className="hidden rounded-[0.8rem] border border-slate-200 bg-white px-3 py-2 text-[11px] font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-950 sm:inline-flex"
              >
                {item.label}
              </a>
            ))}
          </div>
        </div>
      </section>

      <section id="portal-top" className="px-4 py-4 sm:px-6 lg:px-8 lg:py-5">
        <div className="mx-auto grid max-w-[1280px] gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(24rem,0.55fr)]">
          <div className="rounded-[1.4rem] border border-slate-200 bg-white p-5 shadow-[0_18px_44px_rgba(15,23,42,0.08)] sm:p-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-800">
              <ShieldCheck className="h-3.5 w-3.5" />
              Customer portal
            </div>
            <h1 className="mt-4 max-w-3xl text-2xl font-semibold tracking-tight text-slate-950 sm:text-[2rem]">
              Review your booking and request changes in one place.
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
              Enter the reference from your confirmation email or QR code. We will show the latest
              booking status, payment step, provider details, and safe options to reschedule, change,
              cancel, or ask for help.
            </p>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              {[
                { label: 'Booking truth', value: detail ? bookingStatusLabel(detail.booking.status) : 'Reference-led' },
                { label: 'Payment posture', value: detail ? paymentStatusLabel(detail.payment.status) : 'Visible here' },
                { label: 'Support route', value: detail?.support.contact_label || 'Provider-aware' },
              ].map((item) => (
                <div key={item.label} className="rounded-[1rem] border border-slate-200 bg-slate-50 px-4 py-3">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">{item.label}</div>
                  <div className="mt-1 text-sm font-semibold text-slate-950">{item.value}</div>
                </div>
              ))}
            </div>
          </div>

          <form onSubmit={handleLookup} className="rounded-[1.4rem] border border-slate-200 bg-slate-950 p-4 text-white shadow-[0_18px_44px_rgba(15,23,42,0.16)] sm:p-5">
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/55">
              <NotebookTabs className="h-4 w-4" />
              Booking lookup
            </div>
            <label className="mt-4 block text-sm font-semibold text-white">
              Booking reference
            </label>
            <div className="mt-2 flex flex-col gap-2">
              <input
                type="text"
                value={lookupReference}
                onChange={(event) => setLookupReference(event.target.value)}
                placeholder="BR-2002"
                className="min-h-[3rem] w-full rounded-[0.9rem] border border-white/10 bg-white px-4 text-sm text-slate-950 outline-none ring-0 placeholder:text-slate-400 focus:border-sky-300"
              />
              <button
                type="submit"
                className="inline-flex min-h-[3rem] items-center justify-center gap-2 rounded-[0.9rem] bg-[#0f62fe] px-4 text-sm font-semibold text-white transition hover:bg-[#0b57e3]"
              >
                Review booking
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-4 text-xs leading-6 text-white/60">
              Use the booking reference from your confirmation email or QR code. Marketing links and
              internal release IDs cannot open customer booking records.
            </p>
          </form>
        </div>
      </section>

      <section className="px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <div className="mx-auto grid max-w-[1280px] gap-6 lg:grid-cols-[minmax(0,1.52fr)_minmax(21rem,0.88fr)]">
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
                  {loadState.recoverable ? 'Reference saved' : 'Booking not available'}
                </div>
                <h2 className="mt-3 text-xl font-semibold text-rose-950">
                  {loadState.recoverable
                    ? 'Your booking reference is saved'
                    : `We could not load ${loadState.bookingReference}`}
                </h2>
                <p className="mt-3 text-sm leading-7 text-rose-800/80">{loadState.message}</p>
                {loadState.recoverable ? (
                  <div className="mt-5 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setLookupReference(loadState.bookingReference);
                        setLoadState({ status: 'loading', bookingReference: loadState.bookingReference });
                        void apiV1
                          .getPortalBookingDetail(loadState.bookingReference)
                          .then((envelope) => {
                            if (envelope.status !== 'ok') {
                              return;
                            }
                            setLoadState({
                              status: 'ready',
                              bookingReference: loadState.bookingReference,
                              detail: envelope.data,
                            });
                          })
                          .catch((error) => {
                            setLoadState({
                              status: 'error',
                              bookingReference: loadState.bookingReference,
                              ...normalizePortalLoadError(error),
                            });
                          });
                      }}
                      className="inline-flex min-h-[2.75rem] items-center gap-2 rounded-[0.9rem] bg-rose-700 px-4 text-sm font-semibold text-white transition hover:bg-rose-800"
                    >
                      <RefreshCw className="h-4 w-4" />
                      Try again
                    </button>
                    <a
                      href={`mailto:${BOOKEDAI_CUSTOMER_BOOKING_SUPPORT_EMAIL}?subject=Booking%20support%20${encodeURIComponent(loadState.bookingReference)}`}
                      className="inline-flex min-h-[2.75rem] items-center gap-2 rounded-[0.9rem] border border-rose-200 bg-white px-4 text-sm font-semibold text-rose-900 transition hover:border-rose-300"
                    >
                      <Mail className="h-4 w-4" />
                      Contact support
                    </a>
                  </div>
                ) : null}
              </section>
            ) : null}

            {detail ? (
              <>
                <section className="rounded-[1.2rem] border border-slate-200 bg-white p-4 shadow-[0_16px_44px_rgba(15,23,42,0.05)]">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#172033]/45">
                        <Sparkles className="h-4 w-4" />
                        Manage booking
                      </div>
                      <div className="mt-1 text-sm font-semibold text-slate-900">
                        {viewTitle(viewMode)}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {activePortalViewItems.map((item) => {
                        const active = viewMode === item.id;
                        return (
                          <button
                            key={`${item.label}-${item.id}`}
                            type="button"
                            onClick={() => handlePortalViewSelect(item.id)}
                            className={`rounded-[0.8rem] px-3 py-2 text-[11px] font-semibold transition ${
                              active
                                ? 'bg-[#0f62fe] text-white'
                                : 'border border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-950'
                            }`}
                          >
                            {item.shortLabel}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </section>

                <section className="overflow-hidden rounded-[1.4rem] border border-slate-200 bg-white shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
                  <div className="border-b border-slate-200 bg-[linear-gradient(120deg,#ffffff_0%,#eef6ff_50%,#f8fbff_100%)] px-5 py-5 sm:px-6">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#172033]/45">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                        Booking summary
                      </div>
                      <h2 className="mt-3 text-[1.8rem] font-semibold tracking-tight text-slate-950">
                        {detail.booking.booking_reference}
                      </h2>
                      <p className="mt-2 text-sm leading-7 text-[#172033]/62">
                        {detail.service.service_name || 'Requested service'} with{' '}
                        {detail.service.business_name || 'the provider team'}.
                      </p>
                    </div>
                    <div className="grid gap-2 sm:min-w-[12rem]">
                      <span className="inline-flex items-center gap-2 rounded-[0.8rem] border border-emerald-200 bg-white px-3 py-2 text-xs font-semibold text-emerald-800">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        {bookingStatusLabel(detail.booking.status)}
                      </span>
                      <span className="inline-flex items-center gap-2 rounded-[0.8rem] border border-sky-200 bg-white px-3 py-2 text-xs font-semibold text-sky-800">
                        <CreditCard className="h-3.5 w-3.5" />
                        {paymentStatusLabel(detail.payment.status)}
                      </span>
                    </div>
                  </div>
                  </div>

                  <div className="grid gap-4 p-5 sm:p-6 md:grid-cols-2 xl:grid-cols-4">
                    <div className="rounded-[1rem] border border-slate-200 bg-slate-50 p-4">
                      <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#172033]/45">
                        <CalendarClock className="h-4 w-4" />
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
                    <div className="rounded-[1rem] border border-slate-200 bg-slate-50 p-4">
                      <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#172033]/45">
                        <CreditCard className="h-4 w-4" />
                        Payment
                      </div>
                      <div className="mt-2 text-sm font-semibold text-slate-900">
                        {formatMoney(detail.service, detail.payment)}
                      </div>
                    </div>
                    <div className="rounded-[1rem] border border-slate-200 bg-slate-50 p-4">
                      <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#172033]/45">
                        <Clock3 className="h-4 w-4" />
                        Created
                      </div>
                      <div className="mt-2 text-sm font-semibold text-slate-900">
                        {formatCreatedAt(detail.booking.created_at)}
                      </div>
                    </div>
                    <div className="rounded-[1rem] border border-slate-200 bg-slate-50 p-4">
                      <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#172033]/45">
                        <RefreshCw className="h-4 w-4" />
                        Booking type
                      </div>
                      <div className="mt-2 text-sm font-semibold text-slate-900">
                        {bookingPathLabel(detail.booking.booking_path)}
                      </div>
                    </div>
                  </div>

                  <div className={`mx-5 mb-5 rounded-[1rem] border px-4 py-4 sm:mx-6 sm:mb-6 ${statusSummaryClasses(detail.status_summary.tone)}`}>
                    <div className="text-sm font-semibold">{detail.status_summary.title}</div>
                    <div className="mt-1 text-sm leading-6 opacity-90">{detail.status_summary.body}</div>
                  </div>

                  <div className="mx-5 mb-5 rounded-[1.25rem] border border-sky-200 bg-[linear-gradient(180deg,#f8fbff_0%,#ffffff_100%)] p-4 sm:mx-6 sm:mb-6">
                    <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#0f62fe]">
                      <Sparkles className="h-4 w-4" />
                      Customer-care status agent
                    </div>
                    <form onSubmit={handleCustomerCareSubmit} className="mt-3 flex flex-col gap-2 sm:flex-row">
                      <input
                        value={careQuestion}
                        onChange={(event) => setCareQuestion(event.target.value)}
                        placeholder="Ask about payment, reschedule, class progress, pause, or support..."
                        className="min-h-11 flex-1 rounded-full border border-slate-200 bg-white px-4 text-sm text-slate-800 outline-none transition focus:border-[#0f62fe]"
                      />
                      <button
                        type="submit"
                        disabled={careLoading || !careQuestion.trim()}
                        className="inline-flex min-h-11 items-center justify-center rounded-full border border-[#0f62fe] bg-[#0f62fe] px-5 text-sm font-semibold text-white transition hover:bg-[#0b57e3] disabled:cursor-not-allowed disabled:opacity-55"
                      >
                        {careLoading ? 'Checking...' : 'Ask'}
                      </button>
                    </form>
                    {careError ? (
                      <div className="mt-3 rounded-[1rem] border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                        {careError}
                      </div>
                    ) : null}
                    {careTurn ? (
                      <div className="mt-3 rounded-[1rem] border border-slate-200 bg-slate-50 px-4 py-3">
                        <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold text-slate-500">
                          <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1">
                            {careTurn.phase.replace(/_/g, ' ')}
                          </span>
                          <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1">
                            {Number(careTurn.operations.summary.total ?? 0)} ops action(s)
                          </span>
                          {careTurn.academy?.report_available ? (
                            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-emerald-700">
                              report context
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-3 text-sm leading-6 text-slate-700">{careTurn.reply}</p>
                        {careTurn.created_request ? (
                          <div className="mt-3 rounded-[0.85rem] border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
                            {careTurn.created_request.message ?? 'A support request has been queued for manual review.'}
                          </div>
                        ) : null}
                        <div className="mt-3 flex flex-wrap gap-2">
                          {careTurn.next_actions.filter((action) => action.enabled).slice(0, 4).map((action) => (
                            <span key={action.id ?? action.label} className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600">
                              {action.label}
                            </span>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>

                  {viewMode === 'pay' ? (
                    <div className="mt-6 rounded-[1.4rem] border border-[#d2e3fc] bg-[linear-gradient(180deg,#f8fbff_0%,#ffffff_100%)] px-4 py-4">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#0f62fe]">
                        Payment status
                      </div>
                      <div className="mt-2 text-sm font-semibold text-slate-900">
                        {paymentStatusLabel(detail.payment.status)}
                      </div>
                      <div className="mt-2 text-sm leading-6 text-slate-600">
                        {detail.payment.payment_url
                          ? 'Use the secure payment action in the side rail to complete checkout for this booking.'
                          : 'No active payment link is available yet. The provider or BookedAI support can confirm the next payment step.'}
                      </div>
                    </div>
                  ) : null}

                  {viewMode === 'help' ? (
                    <div className="mt-6 rounded-[1.4rem] border border-sky-200 bg-[linear-gradient(180deg,#f8fbff_0%,#ffffff_100%)] px-4 py-4">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#0f62fe]">
                        Ask for help
                      </div>
                      <div className="mt-2 text-sm font-semibold text-slate-900">
                        Ask the customer-care agent above or contact {detail.support.contact_label}.
                      </div>
                      <div className="mt-2 text-sm leading-6 text-slate-600">
                        Support messages keep this booking reference attached, so staff can review the same status, payment, and request context.
                      </div>
                    </div>
                  ) : null}

                  {viewMode === 'change_plan' ? (
                    <div className="mt-6 rounded-[1.4rem] border border-[#d2e3fc] bg-[linear-gradient(180deg,#f8fbff_0%,#ffffff_100%)] px-4 py-4">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#0f62fe]">
                        Change plan
                      </div>
                      <div className="mt-2 text-sm font-semibold text-slate-900">
                        Use pause or downgrade only when this booking has an academy or subscription plan attached.
                      </div>
                      <div className="mt-2 text-sm leading-6 text-slate-600">
                        These actions stay request-safe: the portal queues a review instead of changing the provider record instantly.
                      </div>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => openRequestComposer('pause')}
                          className="rounded-[0.9rem] border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-slate-300"
                        >
                          Request pause
                        </button>
                        <button
                          type="button"
                          onClick={() => openRequestComposer('downgrade')}
                          className="rounded-[0.9rem] border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-slate-300"
                        >
                          Request lighter plan
                        </button>
                      </div>
                    </div>
                  ) : null}

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
                  <div className="rounded-[1.4rem] border border-slate-200 bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
                    <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#172033]/45">
                      <Home className="h-4 w-4" />
                      Provider and service
                    </div>
                    <h3 className="mt-3 text-xl font-semibold">{detail.service.service_name || 'Service details'}</h3>
                    <p className="mt-3 text-sm leading-7 text-[#172033]/62">
                      {detail.service.summary || 'The provider will confirm the final service details directly.'}
                    </p>
                    <dl className="mt-6 grid gap-4 sm:grid-cols-2">
                      <div className="rounded-[1rem] border border-slate-200 bg-slate-50 p-4">
                        <dt className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#172033]/45">
                          <Home className="h-4 w-4" />
                          Business
                        </dt>
                        <dd className="mt-2 text-sm font-medium text-slate-900">
                          {detail.service.business_name || 'BookedAI provider'}
                        </dd>
                      </div>
                      <div className="rounded-[1rem] border border-slate-200 bg-slate-50 p-4">
                        <dt className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#172033]/45">
                          <MapPin className="h-4 w-4" />
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
                      <div className="rounded-[1rem] border border-slate-200 bg-slate-50 p-4">
                        <dt className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#172033]/45">
                          Category
                        </dt>
                        <dd className="mt-2 text-sm font-medium text-slate-900">
                          {detail.service.category || 'Service'}
                        </dd>
                      </div>
                      <div className="rounded-[1rem] border border-slate-200 bg-slate-50 p-4">
                        <dt className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#172033]/45">
                          <Clock3 className="h-4 w-4" />
                          Duration
                        </dt>
                        <dd className="mt-2 text-sm font-medium text-slate-900">
                          {detail.service.duration_minutes ? `${detail.service.duration_minutes} minutes` : 'Duration confirmed during follow-up'}
                        </dd>
                      </div>
                    </dl>
                  </div>

                  <div className="rounded-[1.4rem] border border-slate-200 bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
                    <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#172033]/45">
                      <UserRound className="h-4 w-4" />
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

                <section className="rounded-[1.4rem] border border-slate-200 bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
                  <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#172033]/45">
                    <RefreshCw className="h-4 w-4" />
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

          <aside className="space-y-6 lg:sticky lg:top-4 lg:self-start">
            {detail ? (
              <>
                <section className="rounded-[1.4rem] border border-slate-200 bg-white p-5 shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
                  <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#172033]/45">
                    <HelpCircle className="h-4 w-4" />
                    What would you like to do?
                  </div>
                  <div className="mt-3 grid gap-3">
                    {activePortalViewItems.map((item) => {
                      const active = viewMode === item.id;
                      return (
                        <button
                          key={`${item.label}-${item.id}`}
                          type="button"
                          onClick={() => handlePortalViewSelect(item.id)}
                          className={`rounded-[1rem] border px-4 py-3 text-left transition ${
                            active
                              ? 'border-[#0f62fe] bg-[#eef4ff]'
                              : 'border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-white'
                          }`}
                        >
                          <div className="text-sm font-semibold text-slate-900">{item.label}</div>
                          <div className="mt-1 text-xs leading-5 text-slate-600">{item.body}</div>
                        </button>
                      );
                    })}
                  </div>
                </section>

                <section className="rounded-[1.4rem] border border-slate-200 bg-white p-5 shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
                  <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#172033]/45">
                    <ArrowRight className="h-4 w-4" />
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
                          onClick={() => {
                            setRequestMode(null);
                            setViewMode('status');
                            syncPortalRouteState(detail.booking.booking_reference, 'status');
                          }}
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

                <section className="rounded-[1.4rem] border border-slate-200 bg-white p-5 shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
                  <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#172033]/45">
                    <Mail className="h-4 w-4" />
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
                    <a href={`mailto:${detail.support.contact_email || BOOKEDAI_CUSTOMER_BOOKING_SUPPORT_EMAIL}`} className="font-medium text-[#0f62fe]">
                      {detail.support.contact_email || BOOKEDAI_CUSTOMER_BOOKING_SUPPORT_EMAIL}
                    </a>
                    <a
                      href={`sms:${(detail.support.contact_phone || BOOKEDAI_CUSTOMER_BOOKING_SUPPORT_PHONE).replace(/[^\d+]/g, '')}`}
                      className="font-medium text-[#0f62fe]"
                    >
                      {detail.support.contact_phone || BOOKEDAI_CUSTOMER_BOOKING_SUPPORT_PHONE}
                    </a>
                    <div className="text-xs text-slate-500">
                      Available for {BOOKEDAI_CUSTOMER_BOOKING_SUPPORT_CHANNELS}.
                    </div>
                  </div>
                </section>

                <section className="rounded-[1.4rem] border border-slate-200 bg-white p-5 shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
                  <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#172033]/45">
                    <Home className="h-4 w-4" />
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
                  <section className="rounded-[1.4rem] border border-slate-200 bg-white p-5 shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
                    <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#172033]/45">
                      <NotebookTabs className="h-4 w-4" />
                      Notes
                    </div>
                    <p className="mt-3 text-sm leading-7 text-[#172033]/62">{detail.booking.notes}</p>
                  </section>
                ) : null}
              </>
            ) : (
              <section className="rounded-[1.4rem] border border-slate-200 bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
                <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#172033]/45">
                  <XCircle className="h-4 w-4" />
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
