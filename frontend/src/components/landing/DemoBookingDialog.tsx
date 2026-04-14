import { FormEvent, useState } from 'react';

type DemoBookingDialogProps = {
  isOpen: boolean;
  onClose: () => void;
};

type DemoBookingResponse = {
  status: string;
  demo_reference: string;
  preferred_date: string;
  preferred_time: string;
  timezone: string;
  meeting_status: 'scheduled' | 'configuration_required';
  meeting_join_url: string | null;
  meeting_event_url: string | null;
  email_status: 'sent' | 'pending_manual_followup';
  confirmation_message: string;
};

function getApiBaseUrl() {
  const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim().replace(/^['"]|['"]$/g, '');
  if (configuredBaseUrl) {
    try {
      const normalizedBaseUrl = configuredBaseUrl.replace(/\/$/, '');
      const candidate = normalizedBaseUrl.endsWith('/api')
        ? normalizedBaseUrl
        : `${normalizedBaseUrl}/api`;
      return new URL(candidate).toString().replace(/\/$/, '');
    } catch {
      return '/api';
    }
  }

  if (typeof window === 'undefined') {
    return '/api';
  }

  const { hostname } = window.location;
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'http://localhost:8000/api';
  }

  return '/api';
}

function toDatetimeLocalValue(value: Date) {
  const year = value.getFullYear();
  const month = `${value.getMonth() + 1}`.padStart(2, '0');
  const day = `${value.getDate()}`.padStart(2, '0');
  const hours = `${value.getHours()}`.padStart(2, '0');
  const minutes = `${value.getMinutes()}`.padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function buildDefaultPreferredSlot() {
  const value = new Date();
  value.setDate(value.getDate() + 1);
  value.setHours(11, 0, 0, 0);
  return toDatetimeLocalValue(value);
}

function parsePreferredSlot(preferredSlot: string) {
  const parsed = new Date(preferredSlot);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  const year = parsed.getFullYear();
  const month = `${parsed.getMonth() + 1}`.padStart(2, '0');
  const day = `${parsed.getDate()}`.padStart(2, '0');
  const hours = `${parsed.getHours()}`.padStart(2, '0');
  const minutes = `${parsed.getMinutes()}`.padStart(2, '0');

  return {
    preferredDate: `${year}-${month}-${day}`,
    preferredTime: `${hours}:${minutes}`,
  };
}

function formatDemoDateTime(payload: DemoBookingResponse) {
  const parsed = new Date(`${payload.preferred_date}T${payload.preferred_time}:00`);
  if (Number.isNaN(parsed.getTime())) {
    return `${payload.preferred_date} ${payload.preferred_time} ${payload.timezone}`;
  }

  return new Intl.DateTimeFormat('en-AU', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(parsed);
}

export function DemoBookingDialog({ isOpen, onClose }: DemoBookingDialogProps) {
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [businessType, setBusinessType] = useState('');
  const [preferredSlot, setPreferredSlot] = useState(buildDefaultPreferredSlot());
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [result, setResult] = useState<DemoBookingResponse | null>(null);

  if (!isOpen) {
    return null;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitError('');
    setResult(null);

    if (customerName.trim().length < 2) {
      setSubmitError('Enter your name so we can confirm the demo.');
      return;
    }

    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(customerEmail.trim())) {
      setSubmitError('Enter a valid email address.');
      return;
    }

    if (businessName.trim().length < 2) {
      setSubmitError('Enter your business name.');
      return;
    }

    if (businessType.trim().length < 2) {
      setSubmitError('Enter the type of business you run.');
      return;
    }

    const parsedSlot = parsePreferredSlot(preferredSlot);
    if (!parsedSlot) {
      setSubmitError('Choose a valid demo time.');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`${getApiBaseUrl()}/demo/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_name: customerName.trim(),
          customer_email: customerEmail.trim(),
          customer_phone: customerPhone.trim() || null,
          business_name: businessName.trim(),
          business_type: businessType.trim(),
          preferred_date: parsedSlot.preferredDate,
          preferred_time: parsedSlot.preferredTime,
          timezone: 'Australia/Sydney',
          notes: notes.trim() || null,
        }),
      });
      const payload = (await response.json()) as DemoBookingResponse | { detail?: string };
      if (!response.ok || !('status' in payload)) {
        throw new Error(
          'detail' in payload && payload.detail
            ? payload.detail
            : 'Unable to book your demo right now.',
        );
      }
      setResult(payload);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Unable to book your demo right now.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 px-4 py-6 backdrop-blur-sm">
      <div className="relative max-h-[90vh] w-full max-w-3xl overflow-auto rounded-[2rem] border border-white/10 bg-[#08111f] p-6 text-white shadow-[0_30px_100px_rgba(2,6,23,0.55)] sm:p-8">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full border border-white/10 px-3 py-1 text-sm text-slate-300 transition hover:border-white/20 hover:text-white"
        >
          Close
        </button>

        <div className="max-w-2xl">
          <div className="inline-flex rounded-full border border-cyan-300/25 bg-cyan-300/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-100">
            BookedAI demo
          </div>
          <h3 className="mt-5 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            Book a live walkthrough with our team
          </h3>
          <p className="mt-4 text-base leading-7 text-slate-300">
            Tell us a bit about your business, choose a suitable time, and we will create a
            Zoho calendar booking for `info@bookedai.au` and email the invite to you
            automatically.
          </p>
        </div>

        <form className="mt-8 grid gap-5 sm:grid-cols-2" onSubmit={handleSubmit}>
          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-slate-200">Your name</span>
            <input
              type="text"
              value={customerName}
              onChange={(event) => setCustomerName(event.target.value)}
              placeholder="How should we address you?"
              className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-300/60"
            />
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-slate-200">Work email</span>
            <input
              type="email"
              value={customerEmail}
              onChange={(event) => setCustomerEmail(event.target.value)}
              placeholder="you@business.com.au"
              className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-300/60"
            />
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-slate-200">Phone number</span>
            <input
              type="tel"
              value={customerPhone}
              onChange={(event) => setCustomerPhone(event.target.value)}
              placeholder="Optional"
              className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-300/60"
            />
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-slate-200">Business name</span>
            <input
              type="text"
              value={businessName}
              onChange={(event) => setBusinessName(event.target.value)}
              placeholder="Your company or venue"
              className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-300/60"
            />
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-slate-200">Business type</span>
            <input
              type="text"
              value={businessType}
              onChange={(event) => setBusinessType(event.target.value)}
              placeholder="Salon, clinic, cafe, events, trades, healthcare..."
              className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-300/60"
            />
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-slate-200">Preferred time</span>
            <input
              type="datetime-local"
              value={preferredSlot}
              onChange={(event) => setPreferredSlot(event.target.value)}
              className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-300/60"
            />
          </label>

          <label className="flex flex-col gap-2 sm:col-span-2">
            <span className="text-sm font-medium text-slate-200">Notes</span>
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={4}
              placeholder="Anything useful before the demo, like channels, booking volume, or the main workflow you want to improve."
              className="rounded-[1.5rem] border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-300/60"
            />
          </label>

          {submitError ? (
            <div className="sm:col-span-2 rounded-2xl border border-rose-400/25 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
              {submitError}
            </div>
          ) : null}

          <div className="sm:col-span-2 flex flex-col gap-3 sm:flex-row sm:items-center">
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center justify-center gap-2 rounded-[1.5rem] bg-cyan-400 px-5 py-4 text-sm font-semibold text-slate-950 transition hover:-translate-y-0.5 hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSubmitting ? 'Booking demo...' : 'Book demo'}
            </button>
            <p className="text-sm leading-6 text-slate-400">
              The invite is emailed to the customer and also added to the calendar for `info@bookedai.au`.
            </p>
          </div>
        </form>

        {result ? (
          <div className="mt-8 rounded-[1.75rem] border border-cyan-300/20 bg-white/[0.04] p-5 sm:p-6">
            <div className="text-sm font-medium uppercase tracking-[0.18em] text-cyan-200">
              Demo confirmed
            </div>
            <div className="mt-3 text-2xl font-semibold tracking-tight text-white">
              {result.demo_reference}
            </div>
            <p className="mt-3 text-sm leading-6 text-slate-300">{result.confirmation_message}</p>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              Time: {formatDemoDateTime(result)} {result.timezone}
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              Email status: {result.email_status === 'sent' ? 'Sent' : 'Pending manual follow-up'}
            </p>

            <div className="mt-5 flex flex-wrap gap-3">
              {result.meeting_join_url ? (
                <a
                  href={result.meeting_join_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-50"
                >
                  Open Zoho meeting
                </a>
              ) : null}

              {result.meeting_event_url ? (
                <a
                  href={result.meeting_event_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-full border border-white/15 px-4 py-2 text-sm font-semibold text-white transition hover:border-cyan-300/40 hover:text-cyan-100"
                >
                  View calendar event
                </a>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
