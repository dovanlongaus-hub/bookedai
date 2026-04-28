import { useEffect, useMemo, useState } from 'react';

import { BookingAssistantDialog } from '../../components/landing/assistant/BookingAssistantDialog';
import type { PublicBookingAssistantRuntimeConfig } from '../../components/landing/assistant/publicBookingAssistantV1';
import { bookingAssistantContent } from '../../components/landing/data';
import { LogoMark } from '../../components/landing/ui/LogoMark';
import {
  createEmbeddedWidgetRuntimeConfig,
  createPublicAssistantRuntimeConfig,
} from '../../shared/runtime/publicAssistantRuntime';

const AI_MENTOR_PRO_TENANT_REF = 'ai-mentor-doer';

const aiMentorHostedRuntimeConfig: PublicBookingAssistantRuntimeConfig = createPublicAssistantRuntimeConfig({
  channel: 'public_web',
  tenantRef: AI_MENTOR_PRO_TENANT_REF,
  deploymentMode: 'standalone_app',
  widgetId: 'ai-mentor-pro-hosted-app',
  source: 'ai_mentor_pro_hosted_app',
  medium: 'hosted_product',
  campaign: 'ai_mentor_pro_hosted',
  surface: 'ai_mentor_pro_hosted_app',
});

const aiMentorEmbedRuntimeConfig: PublicBookingAssistantRuntimeConfig = createEmbeddedWidgetRuntimeConfig({
  tenantRef: AI_MENTOR_PRO_TENANT_REF,
  widgetId: 'ai-mentor-pro-plugin',
  source: 'ai_mentor_pro_plugin',
  medium: 'partner_website',
  campaign: 'ai_mentor_pro_embed',
  surface: 'ai_mentor_pro_partner_widget',
});

const quickPrompts = [
  'I want a 1-1 session to build my first AI app in one hour.',
  'Help me choose the right package to automate real work with AI.',
  'I want to turn my AI prototype into a real monetized product.',
  'I need a custom project-based mentoring package for my team.',
  'I want ongoing mentor and product operations support after launch.',
];

const packageCards = [
  {
    title: 'Private 1-1 - Your First AI App in 60 Minutes',
    price: 'USD $120',
    image: '/tenant-assets/ai-mentor/first-ai-app-60.svg',
  },
  {
    title: 'Private 1-1 - AI That Executes for You',
    price: 'USD $600 / 5 hours',
    image: '/tenant-assets/ai-mentor/executes-for-you-5h.svg',
  },
  {
    title: 'Private 1-1 - Turn Your AI Into a Real Product',
    price: 'USD $1,200 / 10 hours',
    image: '/tenant-assets/ai-mentor/real-product-10h.svg',
  },
  {
    title: 'Private 1-1 - Project-Based AI Builder Mentoring',
    price: 'Custom pricing',
    image: '/tenant-assets/ai-mentor/project-based-builder.svg',
  },
  {
    title: 'Private 1-1 - Ongoing Mentor & Product Operations Support',
    price: 'Pricing on request',
    image: '/tenant-assets/ai-mentor/ongoing-ops-support.svg',
  },
  {
    title: 'Group Mentoring - Your First AI App in 60 Minutes',
    price: 'USD $50 / hour / person',
    image: '/tenant-assets/ai-mentor/first-ai-app-60.svg',
  },
  {
    title: 'Group Mentoring - AI That Executes for You',
    price: 'USD $250 / 5 hours / person',
    image: '/tenant-assets/ai-mentor/executes-for-you-5h.svg',
  },
  {
    title: 'Group Mentoring - Turn Your AI Into a Real Product',
    price: 'USD $500 / 10 hours / person',
    image: '/tenant-assets/ai-mentor/real-product-10h.svg',
  },
  {
    title: 'Group Mentoring - Project-Based AI Builder Mentoring',
    price: 'Custom pricing',
    image: '/tenant-assets/ai-mentor/project-based-builder.svg',
  },
  {
    title: 'Group Mentoring - Ongoing Mentor & Product Operations Support',
    price: 'Pricing on request',
    image: '/tenant-assets/ai-mentor/ongoing-ops-support.svg',
  },
];

function parseQueryState() {
  if (typeof window === 'undefined') {
    return {
      embedMode: false,
      initialQuery: null as string | null,
    };
  }

  const params = new URLSearchParams(window.location.search);
  const embedMode =
    params.get('embed') === '1' ||
    params.get('embed') === 'true' ||
    params.get('mode') === 'embed' ||
    window.location.pathname.startsWith('/partner/ai-mentor-pro/embed');
  const initialQuery = params.get('q')?.trim() || null;

  return { embedMode, initialQuery };
}

export function AIMentorProApp() {
  const queryState = useMemo(() => parseQueryState(), []);
  const [initialQuery, setInitialQuery] = useState<string | null>(queryState.initialQuery);
  const [initialQueryRequestId, setInitialQueryRequestId] = useState(queryState.initialQuery ? 1 : 0);

  useEffect(() => {
    document.title = queryState.embedMode
      ? 'AI Mentor 1-1 Pro Widget | Live BookedAI tenant'
      : 'AI Mentor 1-1 Pro | Live BookedAI tenant — book, pay, follow up';
  }, [queryState.embedMode]);

  function triggerPrompt(prompt: string) {
    setInitialQuery(prompt);
    setInitialQueryRequestId((current) => current + 1);
  }

  if (queryState.embedMode) {
    return (
      <main className="min-h-screen bg-apple-black p-0 text-white">
        <div className="flex min-h-screen items-stretch justify-center">
          <div className="flex w-full max-w-[30rem] flex-1 items-stretch">
            <BookingAssistantDialog
              content={bookingAssistantContent}
              isOpen
              standalone
              embedded
              hideCloseControl
              layoutMode="product_app"
              closeLabel="AI Mentor 1-1 Pro"
              entrySourcePath="/partner/ai-mentor-pro/embed"
              initialQuery={initialQuery}
              initialQueryRequestId={initialQueryRequestId}
              runtimeConfig={aiMentorEmbedRuntimeConfig}
              onClose={() => {}}
            />
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-apple-light text-apple-near-black">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-5 py-6 sm:px-8 lg:py-10">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <LogoMark
              variant="icon"
              alt="AI Mentor 1-1 Pro"
              className="booked-brand-image booked-brand-image--soft h-11 w-11 rounded-[var(--apple-radius-comfortable)] ring-1 ring-black/5"
            />
            <div>
              <div className="template-kicker">AI Mentor 1-1 Pro · Verified BookedAI tenant</div>
              <div className="mt-1 text-2xl font-semibold tracking-[-0.04em] text-apple-near-black">
                Live mentorship business running on BookedAI
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
            <div className="inline-flex rounded-full border border-[var(--template-border)] bg-white px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[color:var(--apple-blue)]">
              Verified BookedAI tenant · Stripe · Calendar · Telegram · Email
            </div>
            <h1 className="mt-5 max-w-3xl text-4xl font-semibold tracking-[-0.05em] text-apple-near-black sm:text-5xl">
              Watch BookedAI run a live mentorship business — book, pay, follow up.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-8 text-[color:var(--apple-text-secondary)] sm:text-lg">
              Real bookings, real Stripe payments, real audit ledger. Search the 10 published mentoring packages, move into checkout, and mentor follow-up runs through the same BookedAI operator console every business uses.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <a
                href="#packages"
                className="booked-button"
                aria-label="Book a mentoring session"
              >
                Book a session
              </a>
              <a
                href="#assistant"
                className="booked-button-secondary"
                aria-label="Run the live mentor demo"
              >
                Run the live demo
              </a>
            </div>

            <div className="mt-7 flex flex-wrap gap-3">
              {quickPrompts.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => triggerPrompt(prompt)}
                  className="template-chip transition hover:bg-white"
                  aria-label={`Use prompt: ${prompt}`}
                >
                  {prompt}
                </button>
              ))}
            </div>

            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              {[
                'Chat + tenant-first search',
                'Booking + Stripe checkout',
                'Email / Calendar / Telegram',
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
              closeLabel="AI Mentor 1-1 Pro"
              entrySourcePath="/partner/ai-mentor-pro"
              initialQuery={initialQuery}
              initialQueryRequestId={initialQueryRequestId}
              runtimeConfig={aiMentorHostedRuntimeConfig}
              onClose={() => {}}
            />
          </div>
        </section>

        <section id="packages" className="template-card p-6 sm:p-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="template-kicker">Live operator catalogue</div>
              <h2 className="mt-2 text-3xl font-semibold tracking-[-0.05em] text-apple-near-black">
                Ten published mentoring packages, one live BookedAI business.
              </h2>
            </div>
            <span className="template-chip">Group offers require minimum 5 students</span>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {packageCards.map((item) => (
              <article
                key={item.title}
                className="template-card-subtle overflow-hidden"
              >
                <div className="aspect-[4/3] overflow-hidden bg-white">
                  <img src={item.image} alt={item.title} className="h-full w-full object-cover" />
                </div>
                <div className="p-5">
                  <div className="text-lg font-semibold tracking-[-0.03em] text-apple-near-black">{item.title}</div>
                  <div className="mt-2 text-sm font-semibold text-[color:var(--apple-blue)]">{item.price}</div>
                  <a
                    href="#assistant"
                    className="booked-button mt-4 inline-flex"
                    aria-label={`Save my spot for ${item.title}`}
                  >
                    Save my spot
                  </a>
                </div>
              </article>
            ))}
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
