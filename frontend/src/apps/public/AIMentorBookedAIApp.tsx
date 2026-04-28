import { useEffect, useMemo, useState } from 'react';

import { BookingAssistantDialog } from '../../components/landing/assistant/BookingAssistantDialog';
import type { PublicBookingAssistantRuntimeConfig } from '../../components/landing/assistant/publicBookingAssistantV1';
import { bookingAssistantContent } from '../../components/landing/data';
import { AppleCTA } from '../../components/landing/ui/AppleCTA';
import { LogoMark } from '../../components/landing/ui/LogoMark';
import { createPublicAssistantRuntimeConfig } from '../../shared/runtime/publicAssistantRuntime';

// Canonical AI Mentor 1-1 Pro tenant slug (see backend/migrations/sql/013_ai_mentor_tenant_seed.sql).
const AI_MENTOR_TENANT_REF = 'ai-mentor-doer';

const aiMentorBookedAIRuntimeConfig: PublicBookingAssistantRuntimeConfig =
  createPublicAssistantRuntimeConfig({
    channel: 'public_web',
    tenantRef: AI_MENTOR_TENANT_REF,
    deploymentMode: 'standalone_app',
    widgetId: 'aimentor-bookedai-au-app',
    source: 'aimentor_bookedai_au',
    medium: 'partner_subdomain',
    campaign: 'aimentor_bookedai_au_partner_app',
    surface: 'aimentor_bookedai_au_partner_app',
  });

const quickPrompts = [
  'I want a 1-1 session to build my first AI app in one hour.',
  'Help me choose a package to automate real work with AI.',
  'I need a project-based mentoring package for my team.',
  'I want ongoing mentor and product operations support after launch.',
];

const programCatalog = [
  {
    title: 'Private 1-1 — Your First AI App in 60 Minutes',
    summary: 'One focused session, walk away with a working AI prototype.',
    price: 'USD $120',
    image: '/tenant-assets/ai-mentor/first-ai-app-60.svg',
    capabilities: ['1-1', 'Beginner-friendly', 'Stripe checkout'],
  },
  {
    title: 'Private 1-1 — AI That Executes for You',
    summary: '5 hours of mentoring focused on automating real work.',
    price: 'USD $600 / 5 hours',
    image: '/tenant-assets/ai-mentor/executes-for-you-5h.svg',
    capabilities: ['Automation', 'Hands-on', 'Calendar sync'],
  },
  {
    title: 'Private 1-1 — Turn Your AI Into a Real Product',
    summary: '10 hours focused on packaging your AI into a monetized product.',
    price: 'USD $1,200 / 10 hours',
    image: '/tenant-assets/ai-mentor/real-product-10h.svg',
    capabilities: ['Product ops', 'Monetization', 'Telegram follow-up'],
  },
  {
    title: 'Private 1-1 — Project-Based AI Builder Mentoring',
    summary: 'Custom package shaped around the build you have in flight.',
    price: 'Custom pricing',
    image: '/tenant-assets/ai-mentor/project-based-builder.svg',
    capabilities: ['Custom scope', 'Project shipping', 'Email check-ins'],
  },
  {
    title: 'Private 1-1 — Ongoing Mentor & Product Operations Support',
    summary: 'Continuous mentor and ops support after your AI product launches.',
    price: 'Pricing on request',
    image: '/tenant-assets/ai-mentor/ongoing-ops-support.svg',
    capabilities: ['Retainer', 'Ops support', 'Monthly check-in'],
  },
  {
    title: 'Group Mentoring — Your First AI App in 60 Minutes',
    summary: 'Same fast-start session, scoped for a small group.',
    price: 'USD $50 / hour / person',
    image: '/tenant-assets/ai-mentor/first-ai-app-60.svg',
    capabilities: ['Group', 'Beginner-friendly', 'Min 5 students'],
  },
];

const flowSteps = [
  {
    label: 'Search the live catalog',
    body: 'Use the BookedAI plugin to find the program that matches your goal — beginner, builder, or operator.',
  },
  {
    label: 'Book a session',
    body: 'Pick a slot, confirm contact details, and BookedAI captures the booking against the AI Mentor tenant.',
  },
  {
    label: 'Pay deposit',
    body: 'Stripe checkout opens scoped to AI Mentor. Receipts and portal access tokens are issued instantly.',
  },
  {
    label: 'Monthly check-in + feedback',
    body: 'You get an automated 30-day check-in email and a per-session feedback link so progress stays on track.',
  },
];

const trustProof = [
  'Live tenant: 10 published mentoring packages running on BookedAI today.',
  'Real Stripe charges, audit ledger, and portal access tokens — same surfaces every BookedAI tenant gets.',
  'Telegram + WhatsApp continuation channels are wired into the booking confirmation card.',
];

function parseQueryState() {
  if (typeof window === 'undefined') {
    return {
      initialQuery: null as string | null,
      isFeedback: false,
      feedbackBookingReference: null as string | null,
      feedbackToken: null as string | null,
    };
  }

  const params = new URLSearchParams(window.location.search);
  const initialQuery = params.get('q')?.trim() || null;
  const isFeedback =
    window.location.pathname === '/feedback' ||
    window.location.pathname === '/aimentor/feedback' ||
    window.location.pathname.startsWith('/aimentor/feedback');
  const feedbackBookingReference = params.get('booking_reference')?.trim() || null;
  const feedbackToken = params.get('token')?.trim() || null;

  return {
    initialQuery,
    isFeedback,
    feedbackBookingReference,
    feedbackToken,
  };
}

type FeedbackStatus = 'idle' | 'submitting' | 'sent' | 'error';

function AIMentorFeedbackPage(props: {
  bookingReference: string | null;
  token: string | null;
}) {
  const { bookingReference, token } = props;
  const [rating, setRating] = useState<number>(5);
  const [comment, setComment] = useState<string>('');
  const [wouldRecommend, setWouldRecommend] = useState<boolean>(true);
  const [status, setStatus] = useState<FeedbackStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const canSubmit = Boolean(bookingReference) && status !== 'submitting';

  async function handleSubmit() {
    if (!bookingReference) {
      setErrorMessage('Booking reference is required to send feedback.');
      return;
    }
    setStatus('submitting');
    setErrorMessage(null);
    try {
      const search = new URLSearchParams();
      if (token) {
        search.set('token', token);
      }
      const queryString = search.toString() ? `?${search.toString()}` : '';
      const response = await fetch(
        `/api/v1/booking/${encodeURIComponent(bookingReference)}/feedback${queryString}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'x-portal-token': token } : {}),
          },
          body: JSON.stringify({
            rating,
            comment: comment.trim() || null,
            would_recommend: wouldRecommend,
            channel: 'aimentor_bookedai_au_feedback_page',
          }),
        },
      );
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        const message =
          (payload && payload.error && payload.error.message) ||
          'Could not save your feedback. Please try again.';
        setErrorMessage(message);
        setStatus('error');
        return;
      }
      setStatus('sent');
    } catch (error) {
      setErrorMessage('Could not reach BookedAI. Please retry in a moment.');
      setStatus('error');
    }
  }

  return (
    <main className="min-h-screen bg-apple-light text-apple-near-black">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-5 py-10 sm:px-8">
        <header className="flex items-center gap-3">
          <LogoMark
            variant="icon"
            alt="AI Mentor on BookedAI"
            className="booked-brand-image booked-brand-image--soft h-11 w-11 rounded-[var(--apple-radius-comfortable)] ring-1 ring-black/5"
          />
          <div>
            <div className="template-kicker">
              AI Mentor 1-1 · Live BookedAI partner
            </div>
            <div className="text-xl font-semibold tracking-[-0.04em] text-apple-near-black">
              Send your feedback
            </div>
          </div>
        </header>

        {!bookingReference ? (
          <section className="template-card p-6 sm:p-8">
            <h1 className="text-2xl font-semibold tracking-[-0.04em] text-apple-near-black">
              Booking reference missing
            </h1>
            <p className="mt-3 text-sm leading-7 text-[color:var(--apple-text-secondary)]">
              Open the feedback link from your AI Mentor email so the right booking is loaded.
            </p>
          </section>
        ) : status === 'sent' ? (
          <section className="template-card p-6 sm:p-8">
            <h1 className="text-2xl font-semibold tracking-[-0.04em] text-apple-near-black">
              Thanks for your feedback.
            </h1>
            <p className="mt-3 text-sm leading-7 text-[color:var(--apple-text-secondary)]">
              We've recorded it against booking <strong>{bookingReference}</strong>. Your mentor will see it before the next session.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <AppleCTA
                label="Open my booking"
                intent="primary"
                href={`/portal/?ref=${encodeURIComponent(bookingReference)}${
                  token ? `&token=${encodeURIComponent(token)}` : ''
                }`}
              />
            </div>
          </section>
        ) : (
          <section className="template-card p-6 sm:p-8">
            <h1 className="text-2xl font-semibold tracking-[-0.04em] text-apple-near-black">
              How was your AI Mentor session?
            </h1>
            <p className="mt-2 text-sm leading-7 text-[color:var(--apple-text-secondary)]">
              Booking <strong>{bookingReference}</strong>
            </p>

            <fieldset className="mt-6">
              <legend className="text-sm font-semibold text-apple-near-black">
                Rating
              </legend>
              <div className="mt-3 flex flex-wrap gap-2">
                {[1, 2, 3, 4, 5].map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setRating(value)}
                    aria-label={`Rate ${value} out of 5`}
                    aria-pressed={rating === value}
                    className={`template-chip ${
                      rating === value
                        ? 'border-[color:var(--apple-blue)] text-[color:var(--apple-blue)]'
                        : ''
                    }`}
                    style={{ minHeight: '44px', minWidth: '44px' }}
                  >
                    {value}
                  </button>
                ))}
              </div>
            </fieldset>

            <label className="mt-6 block">
              <span className="text-sm font-semibold text-apple-near-black">
                Comment (optional)
              </span>
              <textarea
                value={comment}
                onChange={(event) => setComment(event.target.value)}
                rows={4}
                placeholder="What worked? What can your mentor improve next session?"
                className="mt-2 w-full rounded-[var(--apple-radius-comfortable)] border border-[var(--template-border)] bg-white px-3 py-3 text-sm text-apple-near-black"
                style={{ minHeight: '96px' }}
              />
            </label>

            <label className="mt-4 inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={wouldRecommend}
                onChange={(event) => setWouldRecommend(event.target.checked)}
                style={{ minHeight: '24px', minWidth: '24px' }}
              />
              <span className="text-sm text-apple-near-black">
                I'd recommend AI Mentor to a friend.
              </span>
            </label>

            {errorMessage ? (
              <p
                role="alert"
                className="mt-4 text-sm text-[color:var(--apple-red-token,red)]"
              >
                {errorMessage}
              </p>
            ) : null}

            <div className="mt-6 flex flex-wrap gap-3">
              <AppleCTA
                label={
                  status === 'submitting' ? 'Sending…' : 'Send my feedback'
                }
                intent="primary"
                disabled={!canSubmit}
                loading={status === 'submitting'}
                onClick={handleSubmit}
              />
            </div>
          </section>
        )}

        <footer className="flex flex-wrap items-center justify-between gap-3 text-xs text-[color:var(--apple-text-tertiary)]">
          <span>Verified BookedAI tenant · powered by BookedAI</span>
          <a
            href="https://bookedai.au/"
            className="text-[color:var(--apple-blue)] hover:underline"
            aria-label="Visit BookedAI homepage"
          >
            bookedai.au
          </a>
        </footer>
      </div>
    </main>
  );
}

export function AIMentorBookedAIApp() {
  const queryState = useMemo(() => parseQueryState(), []);
  const [initialQuery, setInitialQuery] = useState<string | null>(
    queryState.initialQuery,
  );
  const [initialQueryRequestId, setInitialQueryRequestId] = useState(
    queryState.initialQuery ? 1 : 0,
  );

  useEffect(() => {
    document.title = queryState.isFeedback
      ? 'AI Mentor feedback | BookedAI partner'
      : 'AI Mentor on BookedAI | Search, book, and stay on track';
  }, [queryState.isFeedback]);

  function triggerPrompt(prompt: string) {
    setInitialQuery(prompt);
    setInitialQueryRequestId((current) => current + 1);
  }

  if (queryState.isFeedback) {
    return (
      <AIMentorFeedbackPage
        bookingReference={queryState.feedbackBookingReference}
        token={queryState.feedbackToken}
      />
    );
  }

  return (
    <main className="min-h-screen bg-apple-light text-apple-near-black">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-5 py-6 sm:px-8 lg:py-10">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <LogoMark
              variant="icon"
              alt="AI Mentor on BookedAI"
              className="booked-brand-image booked-brand-image--soft h-11 w-11 rounded-[var(--apple-radius-comfortable)] ring-1 ring-black/5"
            />
            <div>
              <div className="template-kicker">
                AI Mentor 1-1 · Live BookedAI partner
              </div>
              <div className="mt-1 text-2xl font-semibold tracking-[-0.04em] text-apple-near-black">
                Real BookedAI plugin running on AI Mentor 1-1 Pro
              </div>
            </div>
          </div>

          <a
            href="https://bookedai.au/"
            className="booked-button-secondary"
            aria-label="Visit BookedAI homepage"
          >
            Powered by BookedAI
          </a>
        </header>

        <section className="grid gap-6 lg:grid-cols-[1.02fr_0.98fr] lg:items-start">
          <div className="template-card p-6 sm:p-8">
            <div className="inline-flex flex-wrap rounded-full border border-[var(--template-border)] bg-white px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[color:var(--apple-blue)]">
              Verified BookedAI tenant · Stripe · Telegram · WhatsApp · Calendar · Auto monthly reminder · Feedback after each session
            </div>
            <h1 className="mt-5 max-w-3xl text-4xl font-semibold tracking-[-0.05em] text-apple-near-black sm:text-5xl">
              Book your AI mentorship — search live programs, pay, and we'll keep you on track.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-8 text-[color:var(--apple-text-secondary)] sm:text-lg">
              Real BookedAI plugin running on AI Mentor 1-1 Pro: search the catalog, book a session, pay, and get monthly check-ins automatically.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <AppleCTA
                label="Save my spot →"
                intent="primary"
                href="#assistant"
              />
              <AppleCTA
                label="Run the live demo →"
                intent="secondary"
                href="#assistant"
              />
            </div>

            <div className="mt-7 flex flex-wrap gap-3">
              {quickPrompts.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => triggerPrompt(prompt)}
                  className="template-chip transition hover:bg-white"
                  aria-label={`Use prompt: ${prompt}`}
                  style={{ minHeight: '44px' }}
                >
                  {prompt}
                </button>
              ))}
            </div>

            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              {[
                'Search + tenant-scoped catalog',
                'Booking + Stripe checkout',
                'Email · Calendar · Telegram · WhatsApp',
              ].map((item) => (
                <div
                  key={item}
                  className="template-card-subtle px-4 py-4 text-sm font-semibold text-apple-near-black"
                >
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div id="assistant" className="flex min-h-0 w-full items-stretch">
            <BookingAssistantDialog
              content={bookingAssistantContent}
              isOpen
              standalone
              embedded
              hideCloseControl
              layoutMode="product_app"
              closeLabel="AI Mentor on BookedAI"
              entrySourcePath="/aimentor"
              initialQuery={initialQuery}
              initialQueryRequestId={initialQueryRequestId}
              runtimeConfig={aiMentorBookedAIRuntimeConfig}
              onClose={() => {}}
            />
          </div>
        </section>

        <section id="catalog" className="template-card p-6 sm:p-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="template-kicker">Live program catalog</div>
              <h2 className="mt-2 text-3xl font-semibold tracking-[-0.05em] text-apple-near-black">
                Search live programs scoped to AI Mentor.
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-7 text-[color:var(--apple-text-secondary)]">
                Same data the BookedAI search composer above ranks — every card here books straight into the AI Mentor tenant flow.
              </p>
            </div>
            <span className="template-chip">Group offers require minimum 5 students</span>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {programCatalog.map((item) => (
              <article
                key={item.title}
                className="template-card-subtle overflow-hidden"
              >
                <div className="aspect-[4/3] overflow-hidden bg-white">
                  <img
                    src={item.image}
                    alt={item.title}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="flex flex-col gap-3 p-5">
                  <div className="text-lg font-semibold tracking-[-0.03em] text-apple-near-black">
                    {item.title}
                  </div>
                  <p className="text-sm leading-6 text-[color:var(--apple-text-secondary)]">
                    {item.summary}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {item.capabilities.map((capability) => (
                      <span key={capability} className="template-chip">
                        {capability}
                      </span>
                    ))}
                  </div>
                  <div className="text-sm font-semibold text-[color:var(--apple-blue)]">
                    {item.price}
                  </div>
                  <AppleCTA
                    label="Save my spot →"
                    intent="primary"
                    href="#assistant"
                    onClick={() => triggerPrompt(`I want to book: ${item.title}`)}
                    ariaLabel={`Save my spot for ${item.title}`}
                  />
                </div>
              </article>
            ))}
          </div>
        </section>

        <section id="how-it-works" className="template-card p-6 sm:p-8">
          <div className="template-kicker">How the BookedAI flow works for AI Mentor</div>
          <h2 className="mt-2 text-3xl font-semibold tracking-[-0.05em] text-apple-near-black">
            Search → Book → Pay → Monthly check-in + Feedback.
          </h2>
          <ol className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {flowSteps.map((step, index) => (
              <li key={step.label} className="template-card-subtle p-5">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--apple-blue)]">
                  Step {index + 1}
                </div>
                <div className="mt-2 text-lg font-semibold tracking-[-0.03em] text-apple-near-black">
                  {step.label}
                </div>
                <p className="mt-2 text-sm leading-6 text-[color:var(--apple-text-secondary)]">
                  {step.body}
                </p>
              </li>
            ))}
          </ol>
        </section>

        <section className="template-card p-6 sm:p-8">
          <div className="template-kicker">Customer trust proof</div>
          <h2 className="mt-2 text-3xl font-semibold tracking-[-0.05em] text-apple-near-black">
            Real mentors. Real bookings. Same operator-grade BookedAI surfaces.
          </h2>
          <ul className="mt-6 grid gap-3 md:grid-cols-3">
            {trustProof.map((proof) => (
              <li
                key={proof}
                className="template-card-subtle p-5 text-sm leading-6 text-apple-near-black"
              >
                {proof}
              </li>
            ))}
          </ul>
          <div className="mt-6 flex flex-wrap gap-3">
            <AppleCTA
              label="Continue on Telegram"
              intent="secondary"
              href="https://t.me/BookedAI_Manager_Bot?start=svc.ai-mentor"
              target="_blank"
            />
            <AppleCTA
              label="Continue on WhatsApp"
              intent="secondary"
              href="https://wa.me/61455301335?text=Hi%20BookedAI%2C%20I%20want%20to%20book%20an%20AI%20Mentor%20session."
              target="_blank"
            />
          </div>
        </section>

        <footer className="flex flex-wrap items-center justify-between gap-3 text-xs text-[color:var(--apple-text-tertiary)]">
          <span>Verified BookedAI tenant · powered by BookedAI</span>
          <a
            href="https://bookedai.au/"
            className="text-[color:var(--apple-blue)] hover:underline"
            aria-label="Visit BookedAI homepage"
          >
            bookedai.au
          </a>
        </footer>
      </div>
    </main>
  );
}

export default AIMentorBookedAIApp;
