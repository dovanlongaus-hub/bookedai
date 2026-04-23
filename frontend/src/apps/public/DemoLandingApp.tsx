import { useEffect, useState } from 'react';

import { DemoBookingDialog } from '../../components/landing/DemoBookingDialog';
import {
  brandDescriptor,
  brandHomeUrl,
  brandLogoBlackPath,
  brandName,
  brandShortIconPath,
} from '../../components/landing/data';

const streamedMessage =
  'BookedAI is qualifying this enquiry, checking the best-fit slot, and moving the customer toward a confirmed booking without waiting for your team to reply.';

const proofPoints = [
  { value: '24/7', label: 'conversational capture' },
  { value: '<60s', label: 'first-response energy' },
  { value: '1 view', label: 'revenue visibility' },
];

const revenueSteps = [
  {
    title: 'Capture',
    body: 'Website chat, missed calls, email enquiries, and follow-ups land in one conversational funnel.',
  },
  {
    title: 'Qualify',
    body: 'The AI collects timing, service intent, budget, and urgency before a human ever needs to jump in.',
  },
  {
    title: 'Convert',
    body: 'BookedAI recommends the next best action, recovers missed demand, and keeps bookings moving.',
  },
];

const featureCards = [
  {
    title: 'Streaming AI replies',
    body: 'Answer high-intent questions in a natural, live-feeling chat flow instead of a cold form.',
  },
  {
    title: 'Revenue-first routing',
    body: 'Guide conversations toward the best-fit booking, callback, or payment-ready next step.',
  },
  {
    title: 'Lead qualification',
    body: 'Collect service details, budget, urgency, and availability without slowing the customer down.',
  },
  {
    title: 'Missed-demand recovery',
    body: 'After-hours messages and missed calls automatically stay in motion instead of going cold.',
  },
  {
    title: 'Cross-channel memory',
    body: 'Keep chat, phone, email, and workflow handoffs tied to one commercial customer journey.',
  },
  {
    title: 'Operator visibility',
    body: 'See which conversations became bookings, recovered revenue, and sales-ready opportunities.',
  },
];

const integrationLogos = [
  { name: 'Stripe', src: '/partners/stripe.svg' },
  { name: 'n8n', src: '/partners/n8n.svg' },
  { name: 'Supabase', src: '/partners/supabase.svg' },
  { name: 'OpenAI Startups', src: '/partners/openai-startups.svg' },
  { name: 'Google Startups', src: '/partners/google-startups.svg' },
  { name: 'Zoho', src: '/partners/zoho-startups.svg' },
];

const conversationalSignals = [
  'Website chat',
  'Missed calls',
  'Email triage',
  'SMS follow-up',
  'Booking recovery',
  'Payment nudges',
];

export function DemoLandingApp() {
  const [streamedCharacters, setStreamedCharacters] = useState(0);
  const [isDemoDialogOpen, setIsDemoDialogOpen] = useState(false);

  useEffect(() => {
    let timeoutId: number | undefined;

    if (streamedCharacters >= streamedMessage.length) {
      timeoutId = window.setTimeout(() => {
        setStreamedCharacters(0);
      }, 1800);

      return () => window.clearTimeout(timeoutId);
    }

    timeoutId = window.setTimeout(() => {
      setStreamedCharacters((current) => current + 1);
    }, streamedCharacters === 0 ? 600 : 18);

    return () => window.clearTimeout(timeoutId);
  }, [streamedCharacters]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const search = new URLSearchParams(window.location.search);
    if ((search.get('demo') ?? '').trim().toLowerCase() === 'open') {
      setIsDemoDialogOpen(true);
    }
  }, []);

  const renderedMessage = streamedMessage.slice(0, streamedCharacters);

  return (
    <main className="min-h-screen bg-[#f5f2ee] text-slate-900">
      <div className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[34rem] bg-[radial-gradient(circle_at_top,rgba(124,58,237,0.16),transparent_48%)]" />
        <div className="pointer-events-none absolute left-[-8rem] top-[22rem] h-72 w-72 rounded-full bg-[radial-gradient(circle,rgba(167,139,250,0.16),transparent_70%)]" />
        <div className="pointer-events-none absolute right-[-4rem] top-[10rem] h-80 w-80 rounded-full bg-[radial-gradient(circle,rgba(139,92,246,0.14),transparent_68%)]" />

        <header className="relative z-10">
          <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-5 py-5 lg:px-8">
            <a
              href={brandHomeUrl}
              className="inline-flex items-center gap-3 rounded-full border border-white/70 bg-white/85 px-4 py-2 shadow-[0_18px_50px_rgba(15,23,42,0.06)] backdrop-blur"
            >
              <img src={brandShortIconPath} alt="" aria-hidden="true" className="h-9 w-9 rounded-2xl object-contain" />
              <div className="min-w-0">
                <img src={brandLogoBlackPath} alt={brandName} className="h-5 w-auto object-contain" />
                <div className="text-[11px] font-medium tracking-[0.12em] text-slate-500 uppercase">
                  demo.bookedai.au
                </div>
              </div>
            </a>

            <nav className="hidden items-center gap-8 text-sm font-medium text-slate-600 md:flex">
              <a href="#preview" className="transition hover:text-slate-950">
                Conversational UI
              </a>
              <a href="#features" className="transition hover:text-slate-950">
                Capabilities
              </a>
              <a href="#integrations" className="transition hover:text-slate-950">
                Integrations
              </a>
            </nav>

            <a
              href="https://product.bookedai.au/"
              className="inline-flex items-center justify-center rounded-full bg-[linear-gradient(135deg,#6d4aff_0%,#8b5cf6_62%,#9f7aea_100%)] px-5 py-3 text-sm font-semibold text-white shadow-[0_20px_50px_rgba(109,74,255,0.28)] transition hover:scale-[1.01]"
            >
              Try Now
            </a>
          </div>
        </header>

        <section className="relative z-10 mx-auto grid w-full max-w-7xl gap-10 px-5 pb-18 pt-8 lg:grid-cols-[1.05fr_0.95fr] lg:px-8 lg:pb-24 lg:pt-14">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#d8ccff] bg-white/90 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#6d4aff] shadow-[0_10px_30px_rgba(109,74,255,0.08)]">
              <span className="h-2 w-2 rounded-full bg-[#8b5cf6]" />
              Selected theme: conversational UI
            </div>

            <h1 className="mt-6 max-w-4xl text-5xl font-semibold tracking-[-0.05em] text-slate-950 sm:text-6xl lg:text-7xl">
              The conversational
              <span className="bg-[linear-gradient(135deg,#6d4aff_0%,#8b5cf6_58%,#4338ca_100%)] bg-clip-text text-transparent">
                {' '}
                revenue engine
              </span>
              {' '}for BookedAI.
            </h1>

            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600 sm:text-xl">
              A minimal AI chatbot platform landing page built around revenue capture, live conversational preview,
              and booking-first automation for service businesses.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => setIsDemoDialogOpen(true)}
                className="booked-button"
              >
                Book a Demo
              </button>
              <a
                href="https://product.bookedai.au/"
                className="booked-button-secondary"
              >
                Try Now
              </a>
              <a
                href={brandHomeUrl}
                className="booked-button-secondary"
              >
                Back to bookedai.au
              </a>
            </div>

            <div className="mt-10 grid gap-3 sm:grid-cols-3">
              {proofPoints.map((point) => (
                <div
                  key={point.label}
                  className="rounded-[1.75rem] border border-white/70 bg-white/82 px-5 py-4 shadow-[0_18px_60px_rgba(15,23,42,0.06)] backdrop-blur"
                >
                  <div className="text-2xl font-semibold tracking-[-0.04em] text-slate-950">{point.value}</div>
                  <div className="mt-1 text-sm text-slate-500">{point.label}</div>
                </div>
              ))}
            </div>

            <div className="mt-8 flex flex-wrap gap-2">
              {conversationalSignals.map((signal) => (
                <span
                  key={signal}
                  className="rounded-full border border-[#ddd6fe] bg-[#f4efff] px-3 py-2 text-xs font-medium text-[#5b34d6]"
                >
                  {signal}
                </span>
              ))}
            </div>
          </div>

          <div id="preview" className="relative">
            <div className="absolute inset-x-[8%] top-6 h-32 rounded-full bg-[radial-gradient(circle,rgba(139,92,246,0.18),transparent_72%)] blur-3xl" />
            <div className="relative overflow-hidden rounded-[2rem] border border-white/80 bg-white/88 p-4 shadow-[0_30px_90px_rgba(15,23,42,0.12)] backdrop-blur sm:p-5">
              <div className="flex items-center justify-between border-b border-slate-100 px-2 pb-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#6d4aff_0%,#8b5cf6_100%)] text-white shadow-[0_14px_32px_rgba(109,74,255,0.24)]">
                    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current">
                      <path d="M7 9h10M7 13h6" strokeWidth="1.8" strokeLinecap="round" />
                      <path d="M6 5h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-5l-3.5 3V17H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z" strokeWidth="1.8" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <div>
                    <div className="font-semibold text-slate-950">BookedAI Revenue Engine</div>
                    <div className="mt-0.5 text-sm text-slate-500">{brandDescriptor}</div>
                  </div>
                </div>

                <div className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                  Live preview
                </div>
              </div>

              <div className="space-y-4 px-2 py-5">
                <div className="flex justify-end">
                  <div className="max-w-[84%] rounded-[1.5rem] rounded-tr-md bg-[linear-gradient(135deg,#7c3aed_0%,#8b5cf6_100%)] px-4 py-3 text-sm font-medium text-white shadow-[0_18px_40px_rgba(124,58,237,0.18)]">
                    We just missed two calls for tomorrow. Can the AI qualify them and keep the bookings moving?
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-[#f4efff] text-[#6d4aff]">
                    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current">
                      <path d="M7 9h10M7 13h6" strokeWidth="1.8" strokeLinecap="round" />
                      <path d="M6 5h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-5l-3.5 3V17H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z" strokeWidth="1.8" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <div className="min-h-28 flex-1 rounded-[1.5rem] rounded-tl-md border border-slate-100 bg-[#fbfafc] px-4 py-3 text-sm leading-7 text-slate-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
                    {renderedMessage}
                    <span className="ml-1 inline-block h-4 w-[2px] translate-y-0.5 animate-pulse rounded-full bg-[#7c3aed]" />
                  </div>
                </div>
              </div>

              <div className="grid gap-3 border-t border-slate-100 px-2 pt-4 sm:grid-cols-3">
                {revenueSteps.map((step) => (
                  <div key={step.title} className="rounded-[1.35rem] bg-[#f8f6fb] px-4 py-4">
                    <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[#6d4aff]">{step.title}</div>
                    <div className="mt-2 text-sm leading-6 text-slate-600">{step.body}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>

      <section id="features" className="mx-auto w-full max-w-7xl px-5 py-18 lg:px-8 lg:py-24">
        <div className="max-w-2xl">
          <div className="text-sm font-semibold uppercase tracking-[0.22em] text-[#6d4aff]">AI capabilities</div>
          <h2 className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-slate-950 sm:text-4xl">
            Minimal on the surface, commercial at the core.
          </h2>
          <p className="mt-4 text-lg leading-8 text-slate-600">
            This landing page centers the conversational UI while making BookedAI’s revenue-engine value obvious in a few seconds.
          </p>
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {featureCards.map((card) => (
            <article
              key={card.title}
              className="rounded-[1.8rem] border border-white/75 bg-white/88 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.07)]"
            >
              <div className="inline-flex rounded-full border border-[#ddd6fe] bg-[#f4efff] px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-[#6d4aff]">
                BookedAI
              </div>
              <h3 className="mt-4 text-xl font-semibold tracking-[-0.03em] text-slate-950">{card.title}</h3>
              <p className="mt-3 text-sm leading-7 text-slate-600">{card.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="integrations" className="border-y border-black/5 bg-white/50">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-5 py-16 lg:px-8">
          <div className="max-w-2xl">
            <div className="text-sm font-semibold uppercase tracking-[0.22em] text-[#6d4aff]">Integrations</div>
            <h2 className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-slate-950 sm:text-4xl">
              Connect the conversational layer to the rest of the revenue stack.
            </h2>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
            {integrationLogos.map((logo) => (
              <div
                key={logo.name}
                className="flex min-h-28 items-center justify-center rounded-[1.6rem] border border-white/85 bg-white/92 px-5 py-6 shadow-[0_20px_50px_rgba(15,23,42,0.06)]"
              >
                <img src={logo.src} alt={logo.name} className="max-h-9 w-auto opacity-70 grayscale transition hover:opacity-100 hover:grayscale-0" />
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-5 py-18 lg:px-8 lg:py-24">
        <div className="overflow-hidden rounded-[2rem] bg-[linear-gradient(135deg,#18122b_0%,#26184a_44%,#6d4aff_100%)] px-6 py-8 text-white shadow-[0_36px_100px_rgba(76,29,149,0.28)] sm:px-8 sm:py-10 lg:flex lg:items-end lg:justify-between lg:gap-8">
          <div className="max-w-2xl">
            <div className="text-sm font-semibold uppercase tracking-[0.22em] text-violet-200">Launch-ready CTA</div>
            <h2 className="mt-4 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
              Put the conversational revenue engine in front of real demand.
            </h2>
            <p className="mt-4 text-base leading-8 text-white/78 sm:text-lg">
              Use this demo surface for `demo.bookedai.au`, then send traffic straight into the live BookedAI experience.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => setIsDemoDialogOpen(true)}
                className="booked-button bg-white text-slate-950"
              >
                Open demo brief
              </button>
              <a
                href="https://product.bookedai.au/"
                className="booked-button-secondary border-white/30 text-white hover:bg-white/10"
              >
                Open live product
              </a>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3 lg:mt-0 lg:justify-end">
            <a
              href="https://product.bookedai.au/"
              className="booked-button-secondary bg-white text-[#4c1d95] hover:bg-violet-50"
            >
              Try Now
            </a>
            <a
              href={brandHomeUrl}
              className="booked-button-secondary border-white/18 bg-white/8 text-white hover:bg-white/12"
            >
              View main site
            </a>
          </div>
        </div>
      </section>

      <DemoBookingDialog
        isOpen={isDemoDialogOpen}
        onClose={() => setIsDemoDialogOpen(false)}
      />
    </main>
  );
}
