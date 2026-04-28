/**
 * <SandboxApp /> — magic-moment onboarding flow at /sandbox.
 *
 * Flow stages:
 *   1. Vertical chooser (8s):    pick a vertical card OR type a one-liner
 *   2. Sandbox dashboard:        live business + 3 services + booking ledger
 *   3. Magic-moment reveal:      "first booking captured" celebration card
 *   4. Save the workspace:       email-code login → real tenant provisioned
 *
 * Manual smoke (frontend Playwright deferred while sandbox-blocked):
 *   - Visit /sandbox; click "Spin up yoga sandbox"; expect 3 services rendered
 *   - Fill the booking form for one service; expect SANDBOX-... reference
 *     and the celebration card to slide in within ~220ms
 *   - Click "Save my workspace"; type an email; click "Send my code"; type
 *     the 6-digit code shown in dev mail logs; expect a session_token + a
 *     redirect to https://tenant.bookedai.au/
 *
 * Visual rules (per design system memo):
 *   - Zero arbitrary hex colors. Only design tokens + AppleCTA + template-*
 *     classes from minimal-bento-template.css.
 *   - Mobile-first; ≥44px tap targets; composer always reachable.
 *   - Each stage transition is a 220ms fade.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { LogoMark } from '../../components/landing/ui/LogoMark';
import { AppleCTA } from '../../components/landing/ui/AppleCTA';
import { apiRequest, ApiClientError } from '../../shared/api/client';
import { SlashCommandMenu } from '../../shared/components/SlashCommandMenu';

const TENANT_HOST = 'https://tenant.bookedai.au/';
const BOOKEDAI_HOME = 'https://bookedai.au/';

type Vertical = 'yoga' | 'salon' | 'clinic' | 'tutoring' | 'swim' | 'generic';

type VerticalCard = {
  vertical: Vertical;
  label: string;
  blurb: string;
  gradient: string;
};

const VERTICAL_CARDS: VerticalCard[] = [
  {
    vertical: 'yoga',
    label: 'Yoga',
    blurb: 'Studio classes, private 1-on-1, sound bath.',
    gradient: 'sage',
  },
  {
    vertical: 'salon',
    label: 'Salon',
    blurb: 'Cut + style, balayage, blow-dry.',
    gradient: 'rose',
  },
  {
    vertical: 'clinic',
    label: 'Clinic',
    blurb: 'GP, skin check, annual review.',
    gradient: 'ocean',
  },
  {
    vertical: 'tutoring',
    label: 'Tutoring',
    blurb: 'Year 12 prep, primary booster, workshops.',
    gradient: 'honey',
  },
  {
    vertical: 'swim',
    label: 'Swim',
    blurb: 'Learn-to-swim, stroke correction, squad.',
    gradient: 'twilight',
  },
  {
    vertical: 'generic',
    label: 'Other',
    blurb: 'Discovery call, standard, premium package.',
    gradient: 'ocean',
  },
];

const GRADIENT_TOKENS: Record<string, string> = {
  sage: 'linear-gradient(135deg, var(--apple-paper-blue-50, #eef6ff) 0%, var(--apple-paper-blue-100, #dceeff) 100%)',
  ocean: 'linear-gradient(135deg, var(--apple-paper-blue-100, #dceeff) 0%, var(--apple-paper-blue-200, #b9defc) 100%)',
  twilight: 'linear-gradient(135deg, var(--apple-paper-blue-200, #b9defc) 0%, var(--apple-paper-blue-300, #8ec7fa) 100%)',
  rose: 'linear-gradient(135deg, var(--apple-paper-blue-50, #eef6ff) 0%, var(--apple-paper-blue-200, #b9defc) 100%)',
  honey: 'linear-gradient(135deg, var(--apple-paper-blue-100, #dceeff) 0%, var(--apple-paper-blue-300, #8ec7fa) 100%)',
  blush: 'linear-gradient(135deg, var(--apple-paper-blue-50, #eef6ff) 0%, var(--apple-paper-blue-100, #dceeff) 100%)',
};

function gradientStyle(name: string | undefined) {
  const key = (name || 'ocean').toLowerCase();
  return GRADIENT_TOKENS[key] ?? GRADIENT_TOKENS.ocean;
}

// ── API contract types (kept local — these are sandbox-only and do not
// belong in the global v1 contracts module yet). ──────────────────────────

type SandboxService = {
  service_id: string;
  name: string;
  summary: string;
  duration_minutes: number;
  price_aud: number;
  capabilities: string[];
  thumbnail_gradient: string;
};

type SandboxBooking = {
  booking_reference: string;
  service_id: string;
  service_name: string;
  customer_name: string;
  customer_email: string | null;
  customer_phone: string | null;
  preferred_time: string | null;
  revenue_captured_aud: number;
  status: string;
  channels_engaged: string[];
  captured_at?: string;
};

type SandboxSessionData = {
  session_id: string;
  business: { name: string; vertical: string };
  services: SandboxService[];
  bookings: SandboxBooking[];
  expires_at: string;
  saved_tenant_slug: string | null;
  seed_mode?: string;
};

type ApiSuccess<T> = { status: 'ok'; data: T };

function isSuccess<T>(value: unknown): value is ApiSuccess<T> {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as { status?: unknown }).status === 'ok' &&
    'data' in (value as Record<string, unknown>)
  );
}

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const envelope = await apiRequest<unknown>(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!isSuccess<T>(envelope)) {
    throw new ApiClientError('Sandbox API response missing success envelope', 200, envelope);
  }
  return envelope.data;
}

// ── Stage components ─────────────────────────────────────────────────────

type Stage = 'vertical' | 'dashboard';

function VerticalChooserStage(props: {
  onPick: (args: { vertical: Vertical | null; hint: string | null; intentHint?: string | null }) => void;
  isLoading: boolean;
  errorMessage: string | null;
}) {
  const { onPick, isLoading, errorMessage } = props;
  const [hint, setHint] = useState('');
  // Lane 7 P2 — slash-command intent verb buffered between menu pick and
  // submit. Forwarded into the sandbox spin-up payload so backend can
  // record `ai_intent` on the seed conversation event.
  const slashIntentHintRef = useRef<string | null>(null);
  const hintInputRef = useRef<HTMLInputElement | null>(null);

  return (
    <main className="min-h-screen bg-apple-light text-apple-near-black">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-5 py-8 sm:px-8 lg:py-12">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <LogoMark
              variant="icon"
              alt="BookedAI"
              className="booked-brand-image booked-brand-image--soft h-11 w-11 rounded-[var(--apple-radius-comfortable)] ring-1 ring-black/5"
            />
            <div>
              <div className="template-kicker">BookedAI · Sandbox</div>
              <div className="mt-1 text-xl font-semibold tracking-[-0.04em] text-apple-near-black">
                Try it before you sign in
              </div>
            </div>
          </div>
          <a href={BOOKEDAI_HOME} className="booked-button-secondary" aria-label="Visit BookedAI homepage">
            Powered by BookedAI
          </a>
        </header>

        <section className="template-card p-6 sm:p-8">
          <div className="template-kicker text-[color:var(--apple-blue)]">8-second magic moment</div>
          <h1 className="mt-3 text-4xl font-semibold tracking-[-0.05em] text-apple-near-black sm:text-5xl">
            Spin up a BookedAI workspace in 8 seconds.
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-[color:var(--apple-text-secondary)]">
            Pick a vertical and we&apos;ll seed three realistic services so you can run the booking flow live —
            no email, no card. Your workspace stays in memory until you decide to save it.
          </p>

          <ul
            aria-label="Pick a vertical"
            className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
          >
            {VERTICAL_CARDS.map((card) => (
              <li key={card.vertical}>
                <button
                  type="button"
                  role="button"
                  aria-label={`Spin up ${card.label.toLowerCase()} sandbox`}
                  disabled={isLoading}
                  onClick={() => onPick({ vertical: card.vertical, hint: null })}
                  className="template-card-subtle flex w-full flex-col gap-2 p-5 text-left text-apple-near-black transition hover:translate-y-[-1px]"
                  style={{ minHeight: '124px' }}
                >
                  <span
                    aria-hidden="true"
                    className="h-9 w-9 rounded-full ring-1 ring-black/5"
                    style={{ background: gradientStyle(card.gradient) }}
                  />
                  <span className="mt-2 text-lg font-semibold tracking-[-0.03em]">{card.label}</span>
                  <span className="text-sm leading-6 text-[color:var(--apple-text-secondary)]">{card.blurb}</span>
                  <span
                    className="mt-1 text-[12px] font-semibold uppercase tracking-[0.16em]"
                    style={{ color: 'var(--apple-blue)' }}
                  >
                    Spin up {card.label.toLowerCase()} sandbox →
                  </span>
                </button>
              </li>
            ))}
          </ul>

          <form
            className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center"
            onSubmit={(event) => {
              event.preventDefault();
              const trimmed = hint.trim();
              if (!trimmed) return;
              onPick({
                vertical: null,
                hint: trimmed,
                intentHint: slashIntentHintRef.current,
              });
            }}
          >
            <label className="sr-only" htmlFor="sandbox-hint">
              Or describe your business in one line
            </label>
            <input
              id="sandbox-hint"
              ref={hintInputRef}
              type="text"
              value={hint}
              onChange={(event) => {
                const next = event.target.value;
                if (!next.startsWith('/')) {
                  slashIntentHintRef.current = null;
                }
                setHint(next);
              }}
              placeholder="Or describe your business in one line — type / for shortcuts"
              maxLength={240}
              disabled={isLoading}
              className="w-full rounded-[var(--apple-radius-comfortable)] border border-[var(--template-border)] bg-white px-4 py-3 text-base text-apple-near-black"
              style={{ minHeight: '48px' }}
              data-testid="sandbox-vertical-hint"
            />
            <SlashCommandMenu
              anchorEl={hintInputRef.current}
              inputValue={hint}
              onValueChange={setHint}
              onSubmit={(_template, intentHint) => {
                slashIntentHintRef.current = intentHint;
              }}
              position="below"
            />
            <AppleCTA
              type="submit"
              label={isLoading ? 'Spinning up…' : 'See it work →'}
              intent="primary"
              disabled={isLoading || !hint.trim()}
              loading={isLoading}
            />
          </form>

          {errorMessage ? (
            <p role="alert" className="mt-4 text-sm text-[color:var(--apple-red-token,red)]">
              {errorMessage}
            </p>
          ) : null}
        </section>
      </div>
    </main>
  );
}

type BookingFormState = {
  serviceId: string | null;
  customerName: string;
  customerEmail: string;
  preferredTime: string;
};

function CelebrationCard(props: { booking: SandboxBooking; onSave: () => void }) {
  const { booking, onSave } = props;
  return (
    <section
      role="status"
      aria-live="polite"
      className="template-card p-6 sm:p-8"
      style={{
        background:
          'linear-gradient(135deg, var(--apple-paper-blue-50, #eef6ff) 0%, var(--apple-paper-blue-100, #dceeff) 100%)',
        animation: 'sandbox-fade-in 220ms ease-out',
      }}
    >
      <div className="template-kicker text-[color:var(--apple-blue)]">First booking captured</div>
      <h2 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-apple-near-black">
        Your first booking is captured.
      </h2>
      <p className="mt-3 max-w-2xl text-sm leading-7 text-[color:var(--apple-text-secondary)]">
        BookedAI just recorded a confirmed booking against your sandbox tenant. Save the workspace
        to keep this catalog and start taking real bookings.
      </p>
      <ul className="mt-5 grid gap-2 text-sm text-apple-near-black">
        <li>
          <span className="text-[color:var(--apple-text-tertiary)]">Reference</span>{' '}
          <strong>{booking.booking_reference}</strong>
        </li>
        <li>
          <span className="text-[color:var(--apple-text-tertiary)]">Customer</span>{' '}
          <strong>{booking.customer_name}</strong>
        </li>
        <li>
          <span className="text-[color:var(--apple-text-tertiary)]">Service</span>{' '}
          <strong>{booking.service_name}</strong>
        </li>
        <li>
          <span className="text-[color:var(--apple-text-tertiary)]">Revenue</span>{' '}
          <strong>A${booking.revenue_captured_aud.toFixed(2)}</strong>
        </li>
      </ul>
      <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ring-1 ring-black/5" style={{ color: 'var(--apple-blue)' }}>
        <span aria-hidden="true">●</span> Ledger entry created
      </div>
      <div className="mt-6 flex flex-wrap gap-3">
        <AppleCTA label="Save my workspace" intent="primary" onClick={onSave} />
      </div>
    </section>
  );
}

type SaveModalProps = {
  open: boolean;
  onClose: () => void;
  sessionId: string;
  defaultBusinessName: string;
  onSaved: (tenantSlug: string) => void;
};

function SaveWorkspaceModal(props: SaveModalProps) {
  const { open, onClose, sessionId, defaultBusinessName, onSaved } = props;
  const [step, setStep] = useState<'email' | 'code' | 'done'>('email');
  const [email, setEmail] = useState('');
  const [businessName, setBusinessName] = useState(defaultBusinessName);
  const [code, setCode] = useState('');
  const [isBusy, setIsBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const firstFieldRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (open) {
      setStep('email');
      setCode('');
      setErrorMessage(null);
      setBusinessName(defaultBusinessName);
      window.setTimeout(() => firstFieldRef.current?.focus(), 60);
    }
  }, [open, defaultBusinessName]);

  // Focus trap + Escape
  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== 'Tab') return;
      const root = dialogRef.current;
      if (!root) return;
      const focusables = Array.from(
        root.querySelectorAll<HTMLElement>(
          'input,button,select,textarea,[tabindex]:not([tabindex="-1"])',
        ),
      ).filter((el) => !el.hasAttribute('disabled'));
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  async function handleSendCode() {
    setIsBusy(true);
    setErrorMessage(null);
    try {
      await postJson(`/v1/sandbox/sessions/${encodeURIComponent(sessionId)}/save/request-code`, {
        email: email.trim(),
        code: '0000', // placeholder — required by payload, ignored on this endpoint
        business_name: businessName.trim() || defaultBusinessName,
      });
      setStep('code');
    } catch (error) {
      const message =
        error instanceof ApiClientError
          ? error.message
          : 'Could not send the code. Please retry in a moment.';
      setErrorMessage(message);
    } finally {
      setIsBusy(false);
    }
  }

  async function handleVerify() {
    setIsBusy(true);
    setErrorMessage(null);
    try {
      const data = await postJson<{ tenant_slug?: string }>(
        `/v1/sandbox/sessions/${encodeURIComponent(sessionId)}/save`,
        {
          email: email.trim(),
          code: code.trim(),
          business_name: businessName.trim() || defaultBusinessName,
        },
      );
      const slug = (data?.tenant_slug || '').trim();
      setStep('done');
      onSaved(slug);
    } catch (error) {
      const message =
        error instanceof ApiClientError
          ? error.message
          : 'That code did not work. Request a new one and try again.';
      setErrorMessage(message);
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <div
      role="presentation"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.4)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        zIndex: 80,
        animation: 'sandbox-fade-in 220ms ease-out',
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="sandbox-save-modal-heading"
        onClick={(event) => event.stopPropagation()}
        className="template-card w-full max-w-md p-6 sm:p-8"
        style={{ background: 'white' }}
      >
        <div className="template-kicker text-[color:var(--apple-blue)]">Save workspace</div>
        <h2
          id="sandbox-save-modal-heading"
          className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-apple-near-black"
        >
          {step === 'done'
            ? 'Workspace saved.'
            : step === 'code'
              ? 'Enter the 6-digit code.'
              : 'Save your workspace?'}
        </h2>
        {step === 'email' ? (
          <>
            <p className="mt-2 text-sm leading-6 text-[color:var(--apple-text-secondary)]">
              Enter your email, we&apos;ll send a code to lock in.
            </p>
            <label className="mt-4 block text-sm font-semibold text-apple-near-black">
              Workspace name
              <input
                type="text"
                value={businessName}
                onChange={(event) => setBusinessName(event.target.value)}
                className="mt-1 w-full rounded-[var(--apple-radius-comfortable)] border border-[var(--template-border)] bg-white px-3 py-3 text-sm text-apple-near-black"
                style={{ minHeight: '44px' }}
                maxLength={120}
              />
            </label>
            <label className="mt-4 block text-sm font-semibold text-apple-near-black">
              Email
              <input
                ref={firstFieldRef}
                type="email"
                inputMode="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="mt-1 w-full rounded-[var(--apple-radius-comfortable)] border border-[var(--template-border)] bg-white px-3 py-3 text-sm text-apple-near-black"
                style={{ minHeight: '44px' }}
                required
              />
            </label>
            {errorMessage ? (
              <p role="alert" className="mt-3 text-sm text-[color:var(--apple-red-token,red)]">
                {errorMessage}
              </p>
            ) : null}
            <div className="mt-5 flex flex-wrap gap-3">
              <AppleCTA
                label={isBusy ? 'Sending…' : 'Send my code'}
                intent="primary"
                onClick={handleSendCode}
                disabled={isBusy || !email.trim().includes('@')}
                loading={isBusy}
              />
              <AppleCTA label="Skip for now" intent="secondary" onClick={onClose} />
            </div>
          </>
        ) : null}

        {step === 'code' ? (
          <>
            <p className="mt-2 text-sm leading-6 text-[color:var(--apple-text-secondary)]">
              We sent a 6-digit code to <strong>{email}</strong>.
            </p>
            <label className="mt-4 block text-sm font-semibold text-apple-near-black">
              Verification code
              <input
                ref={firstFieldRef}
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                value={code}
                onChange={(event) => setCode(event.target.value.replace(/[^0-9]/g, ''))}
                className="mt-1 w-full rounded-[var(--apple-radius-comfortable)] border border-[var(--template-border)] bg-white px-3 py-3 text-base text-apple-near-black tracking-[0.4em]"
                style={{ minHeight: '48px' }}
                maxLength={8}
              />
            </label>
            {errorMessage ? (
              <p role="alert" className="mt-3 text-sm text-[color:var(--apple-red-token,red)]">
                {errorMessage}
              </p>
            ) : null}
            <div className="mt-5 flex flex-wrap gap-3">
              <AppleCTA
                label={isBusy ? 'Verifying…' : 'Save my workspace'}
                intent="primary"
                onClick={handleVerify}
                disabled={isBusy || code.length < 4}
                loading={isBusy}
              />
              <AppleCTA label="Skip for now" intent="secondary" onClick={onClose} />
            </div>
          </>
        ) : null}

        {step === 'done' ? (
          <>
            <p className="mt-2 text-sm leading-6 text-[color:var(--apple-text-secondary)]">
              Welcome to BookedAI. We&apos;re sending you to your tenant workspace now.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <AppleCTA label="Open my workspace" intent="primary" href={TENANT_HOST} />
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}

type DashboardStageProps = {
  session: SandboxSessionData;
  onBookingCaptured: (booking: SandboxBooking) => void;
  bookings: SandboxBooking[];
  celebrationVisible: boolean;
  onSaveOpen: () => void;
};

function SandboxDashboardStage(props: DashboardStageProps) {
  const { session, onBookingCaptured, bookings, celebrationVisible, onSaveOpen } = props;
  const [form, setForm] = useState<BookingFormState>({
    serviceId: session.services[0]?.service_id ?? null,
    customerName: '',
    customerEmail: '',
    preferredTime: '',
  });
  const [isBusy, setIsBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const selectedService = useMemo(
    () => session.services.find((svc) => svc.service_id === form.serviceId) ?? null,
    [session.services, form.serviceId],
  );

  async function handleBook(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.serviceId || !form.customerName.trim()) {
      setErrorMessage('Add a customer name and pick a service to book.');
      return;
    }
    setIsBusy(true);
    setErrorMessage(null);
    try {
      const booking = await postJson<SandboxBooking>(
        `/v1/sandbox/sessions/${encodeURIComponent(session.session_id)}/bookings`,
        {
          service_id: form.serviceId,
          customer: {
            name: form.customerName.trim(),
            email: form.customerEmail.trim() || null,
            preferred_time: form.preferredTime.trim() || null,
          },
        },
      );
      onBookingCaptured(booking);
      setForm({
        serviceId: form.serviceId,
        customerName: '',
        customerEmail: '',
        preferredTime: '',
      });
    } catch (error) {
      const message =
        error instanceof ApiClientError
          ? error.message
          : 'Could not record the booking. Please retry.';
      setErrorMessage(message);
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-apple-light text-apple-near-black">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-5 py-6 sm:px-8 lg:py-10">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <LogoMark
              variant="icon"
              alt="BookedAI"
              className="booked-brand-image booked-brand-image--soft h-11 w-11 rounded-[var(--apple-radius-comfortable)] ring-1 ring-black/5"
            />
            <div>
              <div className="template-kicker">Your sandbox · {session.business.vertical}</div>
              <div className="mt-1 text-2xl font-semibold tracking-[-0.04em] text-apple-near-black">
                {session.business.name}
              </div>
            </div>
          </div>
          <AppleCTA label="Save my workspace" intent="primary" onClick={onSaveOpen} />
        </header>

        <p
          className="rounded-[var(--apple-radius-comfortable)] border border-[var(--template-border)] bg-white px-4 py-3 text-sm text-[color:var(--apple-text-secondary)]"
          role="note"
        >
          This is your live sandbox. Try booking a customer below.
        </p>

        {celebrationVisible && bookings.length > 0 ? (
          <CelebrationCard booking={bookings[bookings.length - 1]} onSave={onSaveOpen} />
        ) : null}

        <section className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="template-card p-5 sm:p-6">
            <div className="template-kicker">Catalog</div>
            <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-apple-near-black">
              Services seeded for you
            </h2>
            <ul className="mt-5 grid gap-3" aria-label="Sandbox services">
              {session.services.map((svc) => {
                const isPicked = svc.service_id === form.serviceId;
                return (
                  <li key={svc.service_id}>
                    <button
                      type="button"
                      role="button"
                      aria-pressed={isPicked}
                      aria-label={`Select ${svc.name}`}
                      onClick={() =>
                        setForm((prev) => ({ ...prev, serviceId: svc.service_id }))
                      }
                      className="template-card-subtle flex w-full items-center gap-4 p-4 text-left text-apple-near-black"
                      style={{
                        minHeight: '88px',
                        outline: isPicked ? '2px solid var(--apple-blue)' : 'none',
                      }}
                    >
                      <span
                        aria-hidden="true"
                        className="h-12 w-12 flex-none rounded-[var(--apple-radius-comfortable)] ring-1 ring-black/5"
                        style={{ background: gradientStyle(svc.thumbnail_gradient) }}
                      />
                      <span className="flex flex-1 flex-col">
                        <span className="text-base font-semibold tracking-[-0.02em]">{svc.name}</span>
                        <span className="text-[13px] leading-5 text-[color:var(--apple-text-secondary)]">
                          {svc.summary}
                        </span>
                        <span className="mt-1 text-xs text-[color:var(--apple-text-tertiary)]">
                          {svc.duration_minutes} min · A${svc.price_aud.toFixed(2)}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          <form className="template-card p-5 sm:p-6" onSubmit={handleBook}>
            <div className="template-kicker">Book a customer</div>
            <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-apple-near-black">
              {selectedService?.name ?? 'Pick a service'}
            </h2>
            <label className="mt-4 block text-sm font-semibold text-apple-near-black">
              Customer name
              <input
                type="text"
                value={form.customerName}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, customerName: event.target.value }))
                }
                className="mt-1 w-full rounded-[var(--apple-radius-comfortable)] border border-[var(--template-border)] bg-white px-3 py-3 text-sm text-apple-near-black"
                style={{ minHeight: '44px' }}
                maxLength={120}
                required
              />
            </label>
            <label className="mt-3 block text-sm font-semibold text-apple-near-black">
              Email (optional)
              <input
                type="email"
                inputMode="email"
                value={form.customerEmail}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, customerEmail: event.target.value }))
                }
                className="mt-1 w-full rounded-[var(--apple-radius-comfortable)] border border-[var(--template-border)] bg-white px-3 py-3 text-sm text-apple-near-black"
                style={{ minHeight: '44px' }}
                maxLength={240}
              />
            </label>
            <label className="mt-3 block text-sm font-semibold text-apple-near-black">
              Preferred time
              <input
                type="text"
                value={form.preferredTime}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, preferredTime: event.target.value }))
                }
                placeholder="e.g. Tomorrow 10am"
                className="mt-1 w-full rounded-[var(--apple-radius-comfortable)] border border-[var(--template-border)] bg-white px-3 py-3 text-sm text-apple-near-black"
                style={{ minHeight: '44px' }}
                maxLength={120}
              />
            </label>
            {errorMessage ? (
              <p role="alert" className="mt-3 text-sm text-[color:var(--apple-red-token,red)]">
                {errorMessage}
              </p>
            ) : null}
            <div className="mt-5 flex flex-wrap gap-3">
              <AppleCTA
                type="submit"
                label={isBusy ? 'Booking…' : 'Capture booking'}
                intent="primary"
                disabled={isBusy || !form.serviceId || !form.customerName.trim()}
                loading={isBusy}
              />
            </div>
          </form>
        </section>

        {bookings.length > 0 ? (
          <section className="template-card p-5 sm:p-6">
            <div className="template-kicker">Sandbox ledger</div>
            <h2 className="mt-2 text-xl font-semibold tracking-[-0.04em] text-apple-near-black">
              {bookings.length} booking{bookings.length === 1 ? '' : 's'} captured
            </h2>
            <ul className="mt-4 grid gap-2 text-sm">
              {bookings.map((booking) => (
                <li
                  key={booking.booking_reference}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-[var(--apple-radius-comfortable)] border border-[var(--template-border)] bg-white px-3 py-2"
                >
                  <span>
                    <strong>{booking.booking_reference}</strong> · {booking.customer_name} ·{' '}
                    {booking.service_name}
                  </span>
                  <span className="text-[color:var(--apple-text-tertiary)]">
                    A${booking.revenue_captured_aud.toFixed(2)}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <footer className="flex flex-wrap items-center justify-between gap-3 text-xs text-[color:var(--apple-text-tertiary)]">
          <span>Sandbox is in-memory only. Save the workspace to make it real.</span>
          <a href={BOOKEDAI_HOME} className="hover:underline" style={{ color: 'var(--apple-blue)' }}>
            bookedai.au
          </a>
        </footer>
      </div>

      <style>{`
        @keyframes sandbox-fade-in {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </main>
  );
}

// ── Top-level component ──────────────────────────────────────────────────

export function SandboxApp() {
  const [stage, setStage] = useState<Stage>('vertical');
  const [session, setSession] = useState<SandboxSessionData | null>(null);
  const [bookings, setBookings] = useState<SandboxBooking[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [celebrationVisible, setCelebrationVisible] = useState(false);
  const [saveOpen, setSaveOpen] = useState(false);
  const nudgeTimerRef = useRef<number | null>(null);

  useEffect(() => {
    document.title = 'BookedAI Sandbox · Try before you sign in';
  }, []);

  // Auto-nudge: open the save modal if visitor lingered after a booking but
  // didn't click. Only fires AFTER at least one booking is captured.
  useEffect(() => {
    if (!celebrationVisible || bookings.length === 0) return;
    if (nudgeTimerRef.current !== null) {
      window.clearTimeout(nudgeTimerRef.current);
    }
    nudgeTimerRef.current = window.setTimeout(() => {
      // Only auto-open if the visitor has captured a booking AND hasn't
      // already opened the modal manually. The OR short-circuit keeps the
      // current state if it's already true.
      setSaveOpen((current) => current || true);
    }, 3000);
    return () => {
      if (nudgeTimerRef.current !== null) {
        window.clearTimeout(nudgeTimerRef.current);
        nudgeTimerRef.current = null;
      }
    };
  }, [celebrationVisible, bookings.length]);

  const handlePickVertical = useCallback(
    async (args: {
      vertical: Vertical | null;
      hint: string | null;
      intentHint?: string | null;
    }) => {
      setIsLoading(true);
      setErrorMessage(null);
      try {
        const data = await postJson<SandboxSessionData>('/v1/sandbox/sessions', {
          vertical_hint: args.hint ?? args.vertical ?? null,
          // Lane 7 P2 — typed verb from slash command picked in the chooser.
          // Backend can store this on the seed conversation event for analytics.
          ...(args.intentHint ? { intent_hint: args.intentHint } : {}),
        });
        setSession(data);
        setBookings(data.bookings ?? []);
        setStage('dashboard');
      } catch (error) {
        const message =
          error instanceof ApiClientError
            ? error.message
            : 'Could not spin up the sandbox. Please retry.';
        setErrorMessage(message);
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  const handleBookingCaptured = useCallback((booking: SandboxBooking) => {
    setBookings((prev) => [...prev, booking]);
    // Slide in the celebration card with a short delay so the form clear
    // animation completes first.
    window.setTimeout(() => setCelebrationVisible(true), 220);
  }, []);

  const handleSaved = useCallback((tenantSlug: string) => {
    // Soft redirect to tenant.bookedai.au. We keep the modal `done` state on
    // for ~600ms so the success copy is visible before navigation.
    window.setTimeout(() => {
      const target = tenantSlug
        ? `${TENANT_HOST}?tenant=${encodeURIComponent(tenantSlug)}`
        : TENANT_HOST;
      window.location.href = target;
    }, 600);
  }, []);

  if (stage === 'vertical') {
    return (
      <VerticalChooserStage
        onPick={handlePickVertical}
        isLoading={isLoading}
        errorMessage={errorMessage}
      />
    );
  }

  if (!session) {
    // Should not happen — defensive guard.
    return (
      <VerticalChooserStage
        onPick={handlePickVertical}
        isLoading={isLoading}
        errorMessage={errorMessage}
      />
    );
  }

  return (
    <>
      <SandboxDashboardStage
        session={session}
        bookings={bookings}
        celebrationVisible={celebrationVisible}
        onBookingCaptured={handleBookingCaptured}
        onSaveOpen={() => setSaveOpen(true)}
      />
      <SaveWorkspaceModal
        open={saveOpen}
        onClose={() => setSaveOpen(false)}
        sessionId={session.session_id}
        defaultBusinessName={session.business.name}
        onSaved={handleSaved}
      />
    </>
  );
}

export default SandboxApp;
