import { FormEvent, useEffect, useId, useState } from 'react';

import { brandDescriptor, brandName } from './data';
import { ApiClientError, apiFetch } from '../../shared/api/client';

type DemoBookingDialogProps = {
  isOpen: boolean;
  onClose: () => void;
};

function resolveApiErrorMessage(error: unknown, fallback: string) {
  if (error instanceof ApiClientError && error.body && typeof error.body === 'object' && 'detail' in error.body) {
    const detail = (error.body as { detail?: unknown }).detail;
    if (typeof detail === 'string' && detail.trim()) {
      return detail;
    }
  }

  return error instanceof Error ? error.message : fallback;
}

type BookingsEmbedApi = {
  inlineEmbed: (config: {
    url: string;
    parent: string;
    height?: string;
  }) => void;
};

type DemoBriefResponse = {
  status: string;
  brief_reference: string;
  email_status: 'sent' | 'pending_manual_followup';
  confirmation_message: string;
};

type DemoBookingSyncResponse = {
  status: 'pending' | 'synced';
  brief_reference: string;
  sync_status: 'pending' | 'synced' | 'already_synced';
  booking_reference: string | null;
  customer_name: string | null;
  customer_email: string | null;
  business_name: string | null;
  business_type: string | null;
  preferred_date: string | null;
  preferred_time: string | null;
  timezone: string | null;
  meeting_event_url: string | null;
  email_status: 'sent' | 'pending_manual_followup' | null;
  confirmation_message: string;
};

declare global {
  interface Window {
    Bookings?: BookingsEmbedApi;
  }
}

const EMBED_SCRIPT_SRC = 'https://bookings.nimbuspop.com/assets/embed.js';
const EMBED_URL = 'https://bookedai.zohobookings.com.au/portal-embed#/34890000000027049';
const EMBED_HEIGHT = '720px';
const DEMO_SYNC_POLL_INTERVAL_MS =
  typeof navigator !== 'undefined' && navigator.webdriver ? 100 : 15000;
const DEMO_SYNC_PROLONGED_WAIT_THRESHOLD = 3;

function ensureEmbedScript() {
  return new Promise<void>((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('Window is not available.'));
      return;
    }

    if (window.Bookings) {
      resolve();
      return;
    }

    const existingScript = document.querySelector<HTMLScriptElement>(
      `script[src="${EMBED_SCRIPT_SRC}"]`,
    );

    if (existingScript) {
      const handleLoad = () => resolve();
      const handleError = () => reject(new Error('Unable to load booking calendar.'));

      existingScript.addEventListener('load', handleLoad, { once: true });
      existingScript.addEventListener('error', handleError, { once: true });
      return;
    }

    const script = document.createElement('script');
    script.src = EMBED_SCRIPT_SRC;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Unable to load booking calendar.'));
    document.body.appendChild(script);
  });
}

export function DemoBookingDialog({ isOpen, onClose }: DemoBookingDialogProps) {
  const inlineContainerId = useId().replace(/:/g, '');
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [businessType, setBusinessType] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmittingBrief, setIsSubmittingBrief] = useState(false);
  const [briefError, setBriefError] = useState('');
  const [briefResult, setBriefResult] = useState<DemoBriefResponse | null>(null);
  const [syncResult, setSyncResult] = useState<DemoBookingSyncResponse | null>(null);
  const [syncError, setSyncError] = useState('');
  const [isSyncingBooking, setIsSyncingBooking] = useState(false);
  const [embedError, setEmbedError] = useState('');
  const [isEmbedReady, setIsEmbedReady] = useState(false);
  const [syncPollAttempts, setSyncPollAttempts] = useState(0);

  useEffect(() => {
    if (!isOpen || typeof window === 'undefined') {
      return;
    }

    const containerSelector = `#${inlineContainerId}`;
    const container = document.querySelector<HTMLElement>(containerSelector);
    if (container) {
      container.innerHTML = '';
    }

    let cancelled = false;
    setEmbedError('');
    setIsEmbedReady(false);

    ensureEmbedScript()
      .then(() => {
        if (cancelled || !window.Bookings) {
          return;
        }

        window.Bookings.inlineEmbed({
          url: EMBED_URL,
          parent: containerSelector,
          height: EMBED_HEIGHT,
        });
        setIsEmbedReady(true);
      })
      .catch((error: unknown) => {
        if (cancelled) {
          return;
        }

        setEmbedError(
          error instanceof Error ? error.message : 'Unable to load booking calendar.',
        );
      });

    return () => {
      cancelled = true;
      const currentContainer = document.querySelector<HTMLElement>(containerSelector);
      if (currentContainer) {
        currentContainer.innerHTML = '';
      }
    };
  }, [inlineContainerId, isOpen]);

  useEffect(() => {
    const briefReference = briefResult?.brief_reference;

    if (!isOpen || !briefReference) {
      return;
    }

    if (syncResult?.sync_status === 'synced' || syncResult?.sync_status === 'already_synced') {
      return;
    }

    let cancelled = false;
    let attempts = 0;

    async function runSync() {
      if (cancelled) {
        return;
      }

      attempts += 1;
      setIsSyncingBooking(true);
      setSyncError('');

      try {
        const payload = await apiFetch<DemoBookingSyncResponse>(
          `/demo/brief/${briefReference}/sync`,
        );
        if (cancelled) {
          return;
        }

        setSyncResult(payload);
        setSyncPollAttempts(attempts);
        if (payload.sync_status === 'pending' && attempts < 40) {
          window.setTimeout(runSync, DEMO_SYNC_POLL_INTERVAL_MS);
          return;
        }
      } catch (error) {
        if (cancelled) {
          return;
        }

        setSyncPollAttempts(attempts);
        setSyncError(
          resolveApiErrorMessage(
            error,
            `Unable to sync your Zoho booking with ${brandName} right now.`,
          ),
        );
      } finally {
        if (!cancelled) {
          setIsSyncingBooking(false);
        }
      }
    }

    void runSync();

    return () => {
      cancelled = true;
    };
  }, [briefResult?.brief_reference, isOpen, syncResult?.sync_status]);

  if (!isOpen) {
    return null;
  }

  async function handleBriefSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBriefError('');
    setBriefResult(null);
    setSyncResult(null);
    setSyncError('');
    setSyncPollAttempts(0);

    if (customerName.trim().length < 2) {
      setBriefError('Enter your name so we know who the demo is for.');
      return;
    }

    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(customerEmail.trim())) {
      setBriefError('Enter a valid work email address.');
      return;
    }

    if (businessName.trim().length < 2) {
      setBriefError('Enter your business name.');
      return;
    }

    if (businessType.trim().length < 2) {
      setBriefError('Enter the type of business you run.');
      return;
    }

    setIsSubmittingBrief(true);
    try {
      const payload = await apiFetch<DemoBriefResponse>('/demo/brief', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_name: customerName.trim(),
          customer_email: customerEmail.trim(),
          customer_phone: customerPhone.trim() || null,
          business_name: businessName.trim(),
          business_type: businessType.trim(),
          notes: notes.trim() || null,
        }),
      });
      setBriefResult(payload);
    } catch (error) {
      setBriefError(resolveApiErrorMessage(error, 'Unable to save your demo brief right now.'));
    } finally {
      setIsSubmittingBrief(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 px-4 py-6 backdrop-blur-sm">
      <div className="template-card relative max-h-[92vh] w-full max-w-7xl overflow-auto p-6 text-slate-700 sm:p-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-5 pr-16">
          <div>
            <div className="template-kicker text-xs">
              Tutor demo
            </div>
            <div className="mt-2 text-lg font-semibold text-slate-950">
              Close this demo to return to the main landing page
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="booked-button-secondary px-4 py-2 text-sm font-semibold"
          >
            Back to landing page
          </button>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="booked-button-secondary absolute right-4 top-4 px-3 py-1 text-sm"
        >
          Close
        </button>

        <div className="max-w-3xl pr-10">
          <div className="booked-pill booked-pill--brand px-4 py-2 text-[11px]">
            {brandName} demo
          </div>
          <div className="template-kicker mt-3 text-xs opacity-80">
            {brandDescriptor}
          </div>
          <h3 className="template-title mt-5 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
            Share your context, then choose the best time
          </h3>
          <p className="template-body mt-4 text-base leading-7">
            Leave your demo brief on the left so our team has background before the call, then
            lock in the most suitable consultation slot from the live calendar.
          </p>
        </div>

        <div className="mt-8 grid gap-6 xl:grid-cols-[0.95fr_1.45fr]">
          <section className="template-card-subtle p-5 sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="template-kicker text-sm">
                  Demo brief
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-600">
                  This helps us tailor the consultation to your booking flow, channels, and
                  current bottlenecks.
                </p>
              </div>
              <div className="booked-pill px-3 py-1 text-[11px] text-slate-500">
                Optional but useful
              </div>
            </div>

            {briefResult ? (
              <div className="mt-5 rounded-[1.25rem] border border-emerald-300/20 bg-emerald-300/10 p-4">
                <div className="text-sm font-semibold text-emerald-100">Brief saved</div>
                <p className="mt-2 text-sm leading-6 text-emerald-50/90">
                  {briefResult.confirmation_message}
                </p>
                <p className="mt-2 text-xs uppercase tracking-[0.16em] text-emerald-100/80">
                  Reference {briefResult.brief_reference}
                </p>
              </div>
            ) : null}

            {syncResult ? (
              <div
                className={`mt-4 rounded-[1.25rem] p-4 ${
                  syncResult.sync_status === 'pending'
                    ? 'border border-sky-300/20 bg-sky-300/10'
                    : 'border border-cyan-300/20 bg-cyan-300/10'
                }`}
              >
                <div
                  className={`text-sm font-semibold ${
                    syncResult.sync_status === 'pending' ? 'text-sky-100' : 'text-cyan-100'
                  }`}
                >
                  {syncResult.sync_status === 'pending'
                    ? 'Waiting for Zoho booking'
                    : 'Zoho booking linked'}
                </div>
                <p
                  className={`mt-2 text-sm leading-6 ${
                    syncResult.sync_status === 'pending' ? 'text-sky-50/90' : 'text-cyan-50/90'
                  }`}
                >
                  {syncResult.confirmation_message}
                </p>
                {syncResult.sync_status === 'pending' &&
                syncPollAttempts >= DEMO_SYNC_PROLONGED_WAIT_THRESHOLD ? (
                  <div className="mt-3 rounded-[1rem] border border-sky-200/15 bg-slate-950/25 px-4 py-3 text-sm leading-6 text-sky-50/90">
                    <div className="font-semibold text-sky-100">Still waiting for Zoho booking</div>
                    <p className="mt-2">
                      Your demo brief is safely saved. If the Zoho calendar sync is taking longer
                      than expected, keep the reference handy and continue from the hosted booking
                      page while {brandName} keeps matching the consultation in the background.
                    </p>
                  </div>
                ) : null}
                {syncResult.booking_reference ? (
                  <p
                    className={`mt-2 text-xs uppercase tracking-[0.16em] ${
                      syncResult.sync_status === 'pending'
                        ? 'text-sky-100/80'
                        : 'text-cyan-100/80'
                    }`}
                  >
                    Booking {syncResult.booking_reference}
                  </p>
                ) : null}
              </div>
            ) : null}

            {syncError ? (
              <div className="mt-4 rounded-2xl border border-amber-300/25 bg-amber-300/10 px-4 py-3 text-sm text-amber-100">
                <div className="font-semibold">Zoho sync still needs follow-up</div>
                <p className="mt-2">{syncError}</p>
                {briefResult ? (
                  <p className="mt-2 text-xs uppercase tracking-[0.16em] text-amber-100/80">
                    Reference {briefResult.brief_reference}
                  </p>
                ) : null}
              </div>
            ) : null}

            <form className="mt-5 grid gap-4" onSubmit={handleBriefSubmit}>
              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium text-slate-200">Your name</span>
                <input
                  type="text"
                  value={customerName}
                  onChange={(event) => setCustomerName(event.target.value)}
                  placeholder="How should we address you?"
                  className="booked-field rounded-2xl px-4 py-3 text-sm"
                />
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium text-slate-200">Work email</span>
                <input
                  type="email"
                  value={customerEmail}
                  onChange={(event) => setCustomerEmail(event.target.value)}
                  placeholder="you@business.com.au"
                  className="booked-field rounded-2xl px-4 py-3 text-sm"
                />
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium text-slate-200">Phone number</span>
                <input
                  type="tel"
                  value={customerPhone}
                  onChange={(event) => setCustomerPhone(event.target.value)}
                  placeholder="Optional"
                  className="booked-field rounded-2xl px-4 py-3 text-sm"
                />
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium text-slate-200">Business name</span>
                <input
                  type="text"
                  value={businessName}
                  onChange={(event) => setBusinessName(event.target.value)}
                  placeholder="Your company or venue"
                  className="booked-field rounded-2xl px-4 py-3 text-sm"
                />
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium text-slate-200">Business type</span>
                <input
                  type="text"
                  value={businessType}
                  onChange={(event) => setBusinessType(event.target.value)}
                  placeholder="Salon, clinic, cafe, events, trades, healthcare..."
                  className="booked-field rounded-2xl px-4 py-3 text-sm"
                />
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium text-slate-200">Notes for the team</span>
                <textarea
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  rows={5}
                  placeholder="Share your booking channels, monthly volume, current tools, or what you want the consultation to focus on."
                  className="booked-field rounded-[1.5rem] px-4 py-3 text-sm"
                />
              </label>

              {briefError ? (
                <div className="rounded-2xl border border-rose-400/25 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
                  {briefError}
                </div>
              ) : null}

              <div className="flex flex-col gap-3">
                <button
                  type="submit"
                  disabled={isSubmittingBrief}
                  className="booked-button inline-flex items-center justify-center px-5 py-4 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isSubmittingBrief ? 'Saving demo brief...' : 'Save demo brief'}
                </button>
                <p className="template-body text-sm leading-6">
                  After saving, continue in the calendar to choose the exact consultation time.
                </p>
              </div>
            </form>
          </section>

          <section className="template-card-dark p-3 sm:p-4">
            <div className="flex flex-col gap-2 border-b border-white/10 px-3 pb-4 pt-1 sm:px-4">
              <div className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-200">
                Live calendar
              </div>
              <p className="text-sm leading-6 text-slate-300">
                Choose the time that best suits your team. Once the booking is created in Zoho,
                {brandName} will sync it back into the system using the email and demo brief you
                submitted here.
              </p>
              {briefResult ? (
                <div className="rounded-[1rem] border border-white/10 bg-white/[0.03] px-4 py-3 text-xs leading-6 text-slate-300">
                  Sync reference: <span className="font-semibold text-white">{briefResult.brief_reference}</span>
                  <span className="mx-2 text-white/20">|</span>
                  Tracking email: <span className="font-semibold text-white">{customerEmail}</span>
                  {isSyncingBooking && !syncResult ? (
                    <>
                      <span className="mx-2 text-white/20">|</span>
                      <span className="text-cyan-200">Watching for a new Zoho booking...</span>
                    </>
                  ) : null}
                </div>
              ) : null}
            </div>

            <div className="mt-4">
              {!isEmbedReady && !embedError ? (
                <div className="flex min-h-[720px] items-center justify-center rounded-[1.25rem] border border-dashed border-white/10 bg-slate-950/50 px-6 text-center text-sm text-slate-400">
                  Loading the live booking calendar...
                </div>
              ) : null}

              <div
                id={inlineContainerId}
                className={isEmbedReady ? 'min-h-[720px]' : 'hidden'}
              />

              {embedError ? (
                <div className="flex min-h-[720px] flex-col items-center justify-center rounded-[1.25rem] border border-amber-300/20 bg-amber-300/10 px-6 text-center">
                  <p className="text-sm font-medium text-amber-100">{embedError}</p>
                  <p className="mt-3 max-w-lg text-sm leading-6 text-amber-50/80">
                    You can still open the booking page directly and choose a time there.
                  </p>
                </div>
              ) : null}
            </div>

            <div className="mt-5 flex flex-col gap-3 border-t border-white/10 px-3 pt-4 sm:flex-row sm:items-center sm:justify-between sm:px-4">
              <p className="text-sm leading-6 text-slate-400">
                If the inline calendar does not appear, open the hosted booking page in a new tab.
              </p>
              <a
                href={EMBED_URL}
                target="_blank"
                rel="noreferrer"
                className="booked-button-secondary inline-flex items-center justify-center border-cyan-300/30 bg-cyan-300/10 px-5 py-3 text-sm font-semibold text-cyan-100 hover:border-cyan-200/50 hover:bg-cyan-300/15 hover:text-white"
              >
                Open full booking page
              </a>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
