import { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  BarChart3,
  Bot,
  CalendarCheck2,
  CheckCircle2,
  CircleDollarSign,
  Gauge,
  MessageSquareText,
  PlayCircle,
  Radar,
  ShieldCheck,
  Sparkles,
  Workflow,
} from 'lucide-react';

import { brandUploadedLogoPath, productHref, roadmapHref } from '../../components/landing/data';
import { LogoMark } from '../../components/landing/ui/LogoMark';
import { HomepageSearchExperience } from './HomepageSearchExperience';
import { getHomepageContent, pitchDeckHref } from './homepageContent';

const chessScreenImageUrl = '/branding/optimized/chess-screen-proof-1400.webp';
const chessScreenImageSrcSet =
  '/branding/optimized/chess-screen-proof-960.webp 960w, /branding/optimized/chess-screen-proof-1400.webp 1400w';
const tenantPreviewImageUrl = '/branding/optimized/tenant-login-hero-1400.webp';
const tenantPreviewImageSrcSet =
  '/branding/optimized/tenant-login-hero-960.webp 960w, /branding/optimized/tenant-login-hero-1400.webp 1400w';
const pitchVideoUrl = 'https://upload.bookedai.au/videos/2cc8/fxu3H6DZDcFOvpjc9UlOmQ.mp4';

type HomepageExperimentVariant = 'control' | 'product_first';

type HomepageEventWindow = Window & {
  dataLayer?: Array<Record<string, unknown>>;
  __bookedaiHomepageEvents?: Array<Record<string, unknown>>;
};

const HOMEPAGE_VARIANT_STORAGE_KEY = 'bookedai.homepage.variant';
const HOMEPAGE_VARIANT_QUERY_PARAM = 'homepage_variant';

const suggestedSearches = [
  'Book Co Mai Hung Chess Sydney pilot class this week',
  'Find Future Swim kids swimming lessons near Caringbah this weekend',
  'Show WSTI AI events at Western Sydney Startup Hub this month',
  'Book an AI Mentor 1-1 session for startup growth this week',
  'Find a premium haircut near Sydney CBD today',
];

const navLinks = [
  { label: 'Live product', href: '#live-product' },
  { label: 'Pitch video', href: '#pitch-video' },
  { label: 'Why now', href: '#why-bookedai' },
  { label: 'Architecture', href: '/architecture' },
  { label: 'Roadmap', href: roadmapHref },
] as const;

const executiveStats = [
  { value: 'Live', label: 'vertical proof', detail: 'chess, swim, portal, tenant ops' },
  { value: '3', label: 'agent loops', detail: 'capture, operate, care' },
  { value: '1', label: 'revenue ledger', detail: 'every action visible' },
] as const;

const investorSignals = [
  { label: 'Wedge', value: 'service SMEs leak high-intent demand' },
  { label: 'Proof', value: 'real booking surfaces are live' },
  { label: 'Moat', value: 'workflow state, not chatbot copy' },
  { label: 'Scale', value: 'repeatable tenant templates' },
] as const;

const heroFlow = ['Demand', 'Match', 'Book', 'Operate'] as const;

const outcomeCards = [
  {
    icon: MessageSquareText,
    title: 'Demand capture',
    body: 'Customers ask naturally instead of hunting through static service pages.',
  },
  {
    icon: Radar,
    title: 'Best-fit matching',
    body: 'BookedAI ranks providers, services, locations, and missing context into a short decision set.',
  },
  {
    icon: CalendarCheck2,
    title: 'Booking continuity',
    body: 'The same flow carries booking intent into confirmation, portal, payment posture, and follow-up.',
  },
  {
    icon: BarChart3,
    title: 'Operations truth',
    body: 'Tenant and admin workspaces expose action runs, reliability posture, support queues, and evidence.',
  },
] as const;

const platformLayers = [
  {
    icon: Sparkles,
    title: 'Customer surfaces',
    body: 'Homepage, product assistant, embedded widget, portal, and WhatsApp entry points.',
    tag: 'Acquire',
  },
  {
    icon: Bot,
    title: 'AI agent layer',
    body: 'Customer-turn agent, revenue-ops handoffs, and booking-care answers grounded in system truth.',
    tag: 'Qualify',
  },
  {
    icon: CircleDollarSign,
    title: 'Revenue core',
    body: 'Booking intents, payment readiness, confirmations, QR portal return, email, calendar, and CRM sync.',
    tag: 'Convert',
  },
  {
    icon: ShieldCheck,
    title: 'Control plane',
    body: 'Tenant Ops, admin Reliability, audit history, lifecycle requests, and operator-visible governance.',
    tag: 'Operate',
  },
] as const;

const investorPoints = [
  'A wedge into local service commerce where missed intent still leaks into calls, DMs, forms, and manual follow-up.',
  'A reusable agentic booking layer that can move from one vertical proof into many tenant templates.',
  'A product architecture with commercial surfaces, operational ledger, and customer-care loop already connected.',
] as const;

const customerPoints = [
  'Start from a customer sentence, not a rigid booking form.',
  'Keep lead capture, best option, confirmation, payment posture, and support in one journey.',
  'Give operators visibility into what the agent did, what is blocked, and what needs human review.',
] as const;

const proofRows = [
  ['Co Mai Hung Chess', 'Verified tenant booking', 'Grandmaster proof'],
  ['Future Swim', 'Tenant ops visibility', 'Vertical proof'],
  ['WhatsApp Care', 'Booking status and changes', 'Care agent'],
] as const;

function normalizeHomepageVariant(value: string | null): HomepageExperimentVariant | null {
  if (!value) {
    return null;
  }

  const normalized = value.trim().toLowerCase().replace(/-/g, '_');
  if (normalized === 'b' || normalized === 'product' || normalized === 'product_first') {
    return 'product_first';
  }
  if (normalized === 'a' || normalized === 'control') {
    return 'control';
  }
  return null;
}

function chooseHomepageVariant(): HomepageExperimentVariant {
  if (typeof crypto !== 'undefined' && 'getRandomValues' in crypto) {
    const value = new Uint32Array(1);
    crypto.getRandomValues(value);
    return value[0] % 2 === 0 ? 'control' : 'product_first';
  }

  return Math.random() < 0.5 ? 'control' : 'product_first';
}

function resolveHomepageVariant(): HomepageExperimentVariant {
  if (typeof window === 'undefined') {
    return 'control';
  }

  const queryVariant = normalizeHomepageVariant(
    new URLSearchParams(window.location.search).get(HOMEPAGE_VARIANT_QUERY_PARAM),
  );
  if (queryVariant) {
    window.localStorage.setItem(HOMEPAGE_VARIANT_STORAGE_KEY, queryVariant);
    return queryVariant;
  }

  const storedVariant = normalizeHomepageVariant(window.localStorage.getItem(HOMEPAGE_VARIANT_STORAGE_KEY));
  if (storedVariant) {
    return storedVariant;
  }

  const assignedVariant = chooseHomepageVariant();
  window.localStorage.setItem(HOMEPAGE_VARIANT_STORAGE_KEY, assignedVariant);
  return assignedVariant;
}

function trackHomepageEvent(eventName: string, payload: Record<string, unknown> = {}) {
  if (typeof window === 'undefined') {
    return;
  }

  const eventPayload = {
    event: eventName,
    source: 'bookedai_homepage',
    timestamp: new Date().toISOString(),
    ...payload,
  };
  const eventWindow = window as HomepageEventWindow;
  eventWindow.__bookedaiHomepageEvents = [...(eventWindow.__bookedaiHomepageEvents ?? []), eventPayload];
  eventWindow.dataLayer?.push(eventPayload);
  window.dispatchEvent(new CustomEvent('bookedai:homepage-event', { detail: eventPayload }));
}

export function PublicApp() {
  const homepageSearchContent = useMemo(() => getHomepageContent('en'), []);
  const homepageVariant = useMemo(() => resolveHomepageVariant(), []);
  const isProductFirstVariant = homepageVariant === 'product_first';
  const [submittedQuery, setSubmittedQuery] = useState<string | null>(null);
  const [submittedRequestId, setSubmittedRequestId] = useState(0);
  const sourcePath =
    typeof window !== 'undefined'
      ? `${window.location.pathname}${window.location.search}`
      : '/';

  const heroCopy = isProductFirstVariant
    ? {
        eyebrow: 'Live booking assistant',
        title: 'Start with a request. BookedAI finds the path.',
        body:
          'Describe what you need. BookedAI turns that sentence into top research, a booking-ready shortlist, contact paths, and a follow-up trail the operator can trust.',
        primaryCta: 'Start with a request',
        secondaryCta: 'Investor story',
      }
    : {
        eyebrow: 'Live AI revenue platform',
        title: 'Turn demand into booked revenue.',
        body:
          'BookedAI is the customer-facing AI layer for service businesses: it captures natural language demand, ranks the best path, creates booking intent, and keeps payment, portal, care, and operations visible.',
        primaryCta: 'Try the product',
        secondaryCta: 'View investor story',
      };

  useEffect(() => {
    trackHomepageEvent('homepage_variant_assigned', { variant: homepageVariant });
  }, [homepageVariant]);

  function navigateTo(href: string, eventName?: string, payload: Record<string, unknown> = {}) {
    if (typeof window === 'undefined') {
      return;
    }

    if (eventName) {
      trackHomepageEvent(eventName, { variant: homepageVariant, href, ...payload });
    }
    window.location.href = href;
  }

  function focusLiveProduct() {
    trackHomepageEvent('homepage_primary_cta_clicked', {
      variant: homepageVariant,
      action: 'focus_search',
      href: '#live-product',
    });
    document.getElementById('live-product')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    window.setTimeout(() => {
      document.querySelector<HTMLTextAreaElement>('#bookedai-search-assistant textarea[aria-label="Ask BookedAI"]')?.focus();
    }, 160);
  }

  function handlePrimaryHeroAction() {
    if (isProductFirstVariant) {
      focusLiveProduct();
      return;
    }

    navigateTo(productHref, 'homepage_primary_cta_clicked', { action: 'open_product' });
  }

  function runSearch(query: string) {
    const trimmed = query.trim();
    if (!trimmed) {
      return;
    }

    trackHomepageEvent('homepage_suggested_search_clicked', {
      variant: homepageVariant,
      query: trimmed,
      query_length: trimmed.length,
    });
    setSubmittedQuery(trimmed);
    setSubmittedRequestId((current) => current + 1);

    window.setTimeout(() => {
      document.getElementById('live-product')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 40);
  }

  return (
    <main className="min-h-screen overflow-hidden bg-[#f6f4ef] text-[#172033]">
      <header className="sticky top-0 z-40 border-b border-[#d9d3c7]/80 bg-[#fbfaf7]/88 px-4 py-3 backdrop-blur-xl sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-4">
          <a href="#top" className="flex min-w-0 items-center gap-3 rounded-xl">
            <LogoMark
              src={brandUploadedLogoPath}
              alt="BookedAI"
              className="h-10 w-[9.5rem] max-w-[calc(100vw-12rem)] object-cover object-center sm:w-[10.75rem]"
            />
          </a>

          <nav className="flex items-center gap-1 max-[1023px]:!hidden">
            {navLinks.map((item) => (
              <a
                key={item.label}
                href={item.href}
                onClick={() => {
                  if (item.label === 'Architecture') {
                    trackHomepageEvent('homepage_architecture_clicked', { variant: homepageVariant, href: item.href });
                    return;
                  }
                  if (item.label === 'Roadmap') {
                    trackHomepageEvent('homepage_roadmap_clicked', { variant: homepageVariant, href: item.href });
                  }
                }}
                className="rounded-full px-3.5 py-2 text-sm font-semibold text-[#586173] transition hover:bg-white hover:text-[#172033]"
              >
                {item.label}
              </a>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={() => navigateTo(pitchDeckHref, 'homepage_pitch_clicked', { surface: 'header' })}
              className="inline-flex rounded-full border border-[#cfc7b8] bg-white px-4 py-2 text-sm font-semibold text-[#172033] shadow-[0_8px_24px_rgba(23,32,51,0.05)] transition hover:border-[#a6b6c9] max-[639px]:!hidden"
            >
              Investor pitch
            </button>
            <button
              type="button"
              onClick={() => navigateTo(productHref, 'homepage_primary_cta_clicked', { surface: 'header', action: 'open_product' })}
              className="inline-flex items-center gap-2 rounded-full bg-[#172033] px-4 py-2 text-sm font-semibold text-white shadow-[0_14px_32px_rgba(23,32,51,0.18)] transition hover:bg-[#263147]"
            >
              Open Web App
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      </header>

      <section id="top" className="relative px-4 pb-10 pt-7 sm:px-6 sm:pb-14 sm:pt-10 lg:px-8">
        <div className="mx-auto grid max-w-[1440px] gap-6 lg:grid-cols-[minmax(0,0.92fr)_minmax(520px,1.08fr)] lg:items-stretch">
          <div className="flex min-h-[620px] flex-col justify-between rounded-[2rem] border border-[#d8d0c0] bg-[#fffdf8] p-5 shadow-[0_28px_80px_rgba(86,73,50,0.1)] sm:p-7 lg:p-9">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-[#d8d0c0] bg-[#f6f0e3] px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-[#6c5a2e]">
                <span className="h-2 w-2 rounded-full bg-[#2aa876]" />
                {heroCopy.eyebrow}
              </div>
              <h1 className="mt-6 max-w-[10ch] text-[3.25rem] font-semibold leading-[0.92] tracking-[-0.055em] text-[#172033] sm:text-[5.3rem] lg:text-[6.1rem]">
                {heroCopy.title}
              </h1>
              <p className="mt-6 max-w-2xl text-[1.08rem] leading-8 text-[#586173] sm:text-xl sm:leading-9">
                {heroCopy.body}
              </p>
            </div>

            <div className="mt-8">
              <div className="grid gap-3 sm:grid-cols-3">
                {executiveStats.map((item) => (
                  <div
                    key={item.label}
                    className="rounded-2xl border border-[#e4dccd] bg-[#fbf7ee] px-4 py-4"
                  >
                    <div className="text-3xl font-semibold tracking-[-0.04em] text-[#172033]">{item.value}</div>
                    <div className="mt-1 text-[11px] font-bold uppercase tracking-[0.14em] text-[#7b6b4c]">
                      {item.label}
                    </div>
                    <div className="mt-2 text-sm leading-6 text-[#586173]">{item.detail}</div>
                  </div>
                ))}
              </div>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <button
                  type="button"
                  onClick={handlePrimaryHeroAction}
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-[#172033] px-5 py-3 text-sm font-bold text-white shadow-[0_16px_34px_rgba(23,32,51,0.18)] transition hover:bg-[#263147]"
                >
                  {heroCopy.primaryCta}
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => navigateTo(pitchDeckHref, 'homepage_pitch_clicked', { surface: 'hero' })}
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-[#cfc7b8] bg-white px-5 py-3 text-sm font-bold text-[#172033] transition hover:border-[#9fb0c5]"
                >
                  {heroCopy.secondaryCta}
                  <BarChart3 className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </div>
          </div>

          <div className="grid gap-4">
            <div className="overflow-hidden rounded-[2rem] border border-[#162036] bg-[#101827] shadow-[0_30px_90px_rgba(23,32,51,0.22)]">
              <div className="grid lg:grid-cols-[minmax(0,1fr)_260px]">
                <div className="bg-[#0b1120] p-3 sm:p-4">
                  <div className="rounded-[1.45rem] border border-white/10 bg-[#07101f] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] sm:p-4">
                  <img
                    src={chessScreenImageUrl}
                    srcSet={chessScreenImageSrcSet}
                    sizes="(min-width: 1024px) 48vw, calc(100vw - 2rem)"
                    alt="BookedAI chess academy booking proof"
                      className="aspect-[3/2] w-full rounded-[1.05rem] object-contain object-center"
                    loading="eager"
                    width={1400}
                    height={933}
                  />
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
                    <div>
                      <div className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/10 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-[#8efce0]">
                        <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                        Live tenant proof
                      </div>
                      <h2 className="mt-3 max-w-xl text-2xl font-semibold leading-tight tracking-[-0.04em] text-white sm:text-3xl">
                        See demand become a booked workflow.
                      </h2>
                    </div>
                    <div className="grid grid-cols-4 gap-1.5 rounded-2xl border border-white/10 bg-white/[0.06] p-2">
                      {heroFlow.map((item, index) => (
                        <div key={item} className="min-w-0 rounded-xl bg-white/[0.07] px-2 py-2 text-center">
                          <div className="text-[10px] font-bold text-[#8efce0]">0{index + 1}</div>
                          <div className="mt-1 text-[11px] font-semibold text-white">{item}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col justify-between gap-4 border-t border-white/10 bg-[#111b2e] p-5 text-white lg:border-l lg:border-t-0">
                  {proofRows.map(([name, body, status]) => (
                    <div key={name} className="rounded-2xl border border-white/10 bg-white/[0.06] p-4">
                      <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#8efce0]">{status}</div>
                      <div className="mt-2 text-base font-semibold text-white">{name}</div>
                      <div className="mt-2 text-sm leading-6 text-slate-300">{body}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {investorSignals.map((item, index) => (
                <div
                  key={item.label}
                  className={`rounded-[1.25rem] border p-4 shadow-[0_18px_42px_rgba(86,73,50,0.08)] ${
                    index % 2 === 0
                      ? 'border-[#d8d0c0] bg-white'
                      : 'border-[#c9ddd7] bg-[#eaf4f1]'
                  }`}
                >
                  <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.15em] text-[#7b6b4c]">
                    {index % 2 === 0 ? (
                      <Gauge className="h-4 w-4 text-[#2f7e99]" aria-hidden="true" />
                    ) : (
                      <Workflow className="h-4 w-4 text-[#2aa876]" aria-hidden="true" />
                    )}
                    {item.label}
                  </div>
                  <p className="mt-2 text-sm font-semibold leading-6 text-[#172033]">{item.value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="pitch-video" className="px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-[1440px] gap-5 rounded-[2rem] border border-[#172033] bg-[#101827] p-4 text-white shadow-[0_30px_90px_rgba(23,32,51,0.2)] sm:p-6 lg:grid-cols-[0.62fr_1.38fr] lg:items-center lg:p-8">
          <div className="p-1 sm:p-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/10 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-[#8efce0]">
              <PlayCircle className="h-4 w-4" aria-hidden="true" />
              Pitch video
            </div>
            <h2 className="mt-5 max-w-xl text-3xl font-semibold leading-tight tracking-[-0.04em] text-white sm:text-4xl">
              Watch the story, then try the live booking system.
            </h2>
            <p className="mt-4 max-w-xl text-sm leading-7 text-slate-300 sm:text-base">
              The video gives visitors a fast investor and buyer overview before they compare the
              live product, architecture, and operating proof below.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <a
                href={pitchVideoUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-bold text-[#172033] transition hover:bg-[#eef4f2]"
              >
                Open video
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </a>
              <button
                type="button"
                onClick={() => navigateTo(pitchDeckHref, 'homepage_pitch_clicked', { surface: 'pitch_video' })}
                className="inline-flex items-center justify-center gap-2 rounded-full border border-white/18 bg-white/[0.08] px-5 py-3 text-sm font-bold text-white transition hover:bg-white/[0.14]"
              >
                Full pitch
                <BarChart3 className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </div>

          <div className="overflow-hidden rounded-[1.6rem] border border-white/12 bg-black shadow-[0_24px_70px_rgba(0,0,0,0.28)]">
            <video
              className="aspect-video w-full bg-black object-contain"
              controls
              preload="metadata"
              playsInline
            >
              <source src={pitchVideoUrl} type="video/mp4" />
              <a href={pitchVideoUrl}>Open the BookedAI pitch video</a>
            </video>
          </div>
        </div>
      </section>

      <section id="why-bookedai" className="px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-[1440px]">
          <div className="grid gap-5 lg:grid-cols-[0.65fr_1.35fr] lg:items-end">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#8a6b24]">Why BookedAI</div>
              <h2 className="mt-3 max-w-xl text-4xl font-semibold leading-tight tracking-[-0.045em] text-[#172033] sm:text-5xl">
                The missing layer between customer intent and SME revenue.
              </h2>
            </div>
            <p className="max-w-3xl text-base leading-8 text-[#586173] sm:text-lg">
              Local service businesses do not lose revenue only because they lack traffic. They lose
              it because intent arrives fragmented across search, chat, calls, forms, payment links,
              and staff follow-up. BookedAI joins those moments into one agentic booking system.
            </p>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {outcomeCards.map((item) => {
              const Icon = item.icon;
              return (
                <article
                  key={item.title}
                  className="rounded-[1.5rem] border border-[#d8d0c0] bg-white p-5 shadow-[0_18px_44px_rgba(86,73,50,0.07)]"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#172033] text-white">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <h3 className="mt-5 text-xl font-semibold tracking-[-0.03em] text-[#172033]">{item.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-[#586173]">{item.body}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section id="live-product" className="px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-[1440px]">
          <div className="mb-5 flex flex-col gap-4 rounded-[1.75rem] border border-[#d8d0c0] bg-[#fffdf8] p-5 shadow-[0_18px_46px_rgba(86,73,50,0.08)] sm:p-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#8a6b24]">Live product</div>
              <h2 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-[#172033] sm:text-4xl">
                Ask, compare, book, and continue.
              </h2>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-[#586173] sm:text-base">
                Try the customer-facing agent below. It keeps search, shortlist, booking intent,
                payment posture, confirmation, and follow-up in one commercial flow.
              </p>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1 sm:flex-wrap sm:overflow-x-visible sm:pb-0">
              {suggestedSearches.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => runSearch(prompt)}
                  className="shrink-0 rounded-full border border-[#cfc7b8] bg-white px-4 py-2 text-left text-xs font-bold text-[#445166] transition hover:border-[#2f7e99] hover:text-[#172033]"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>

          <HomepageSearchExperience
            content={homepageSearchContent}
            sourcePath={sourcePath}
            initialQuery={submittedQuery}
            initialQueryRequestId={submittedRequestId}
            experimentVariant={homepageVariant}
            onHomepageEvent={trackHomepageEvent}
          />
        </div>
      </section>

      <section id="operating-model" className="px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-[1440px] gap-5 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-[2rem] border border-[#172033] bg-[#172033] p-6 text-white shadow-[0_28px_80px_rgba(23,32,51,0.2)] sm:p-8">
            <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#8efce0]">Operating model</div>
            <h2 className="mt-4 max-w-xl text-4xl font-semibold leading-tight tracking-[-0.045em] sm:text-5xl">
              Customer surfaces to operations truth, without losing the lead.
            </h2>
            <p className="mt-5 max-w-2xl text-base leading-8 text-slate-300">
              The platform is designed as a revenue workflow, not a chatbot wrapper. Every public
              interaction should create clearer state for the customer, the tenant, and the operator.
            </p>

            <div className="mt-8 overflow-hidden rounded-[1.4rem] border border-white/10 bg-white/[0.06]">
              <img
                src={tenantPreviewImageUrl}
                srcSet={tenantPreviewImageSrcSet}
                sizes="(min-width: 1024px) 42vw, calc(100vw - 2rem)"
                alt="BookedAI tenant operations workspace preview"
                className="aspect-[16/10] w-full object-cover object-top"
                loading="lazy"
                width={1400}
                height={875}
              />
            </div>
          </div>

          <div className="grid gap-4">
            {platformLayers.map((item, index) => {
              const Icon = item.icon;
              return (
                <article
                  key={item.title}
                  className="grid gap-4 rounded-[1.5rem] border border-[#d8d0c0] bg-white p-5 shadow-[0_18px_44px_rgba(86,73,50,0.07)] sm:grid-cols-[72px_minmax(0,1fr)_110px] sm:items-center"
                >
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#f0ebdf] text-[#172033]">
                    <Icon className="h-6 w-6" aria-hidden="true" />
                  </div>
                  <div>
                    <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#8a6b24]">
                      0{index + 1}
                    </div>
                    <h3 className="mt-1 text-xl font-semibold tracking-[-0.03em] text-[#172033]">{item.title}</h3>
                    <p className="mt-2 text-sm leading-7 text-[#586173]">{item.body}</p>
                  </div>
                  <div className="w-fit rounded-full bg-[#eaf4f1] px-3 py-1.5 text-xs font-bold uppercase tracking-[0.14em] text-[#19684b] sm:justify-self-end">
                    {item.tag}
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-[1440px] gap-5 lg:grid-cols-2">
          <div className="rounded-[2rem] border border-[#d8d0c0] bg-white p-6 shadow-[0_20px_54px_rgba(86,73,50,0.08)] sm:p-8">
            <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#8a6b24]">For investors</div>
            <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-[#172033] sm:text-4xl">
              A vertical AI commerce wedge with reusable infrastructure.
            </h2>
            <div className="mt-6 space-y-3">
              {investorPoints.map((point) => (
                <div key={point} className="flex gap-3 rounded-2xl bg-[#fbf7ee] p-4">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#2aa876]" aria-hidden="true" />
                  <p className="text-sm leading-7 text-[#586173]">{point}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[2rem] border border-[#d8d0c0] bg-[#eaf4f1] p-6 shadow-[0_20px_54px_rgba(86,73,50,0.08)] sm:p-8">
            <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#19684b]">For customers</div>
            <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-[#172033] sm:text-4xl">
              A booking experience that feels like help, not admin.
            </h2>
            <div className="mt-6 space-y-3">
              {customerPoints.map((point) => (
                <div key={point} className="flex gap-3 rounded-2xl bg-white/78 p-4">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#2f7e99]" aria-hidden="true" />
                  <p className="text-sm leading-7 text-[#445166]">{point}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 pb-14 pt-8 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-[1440px] flex-col gap-6 rounded-[2rem] border border-[#172033] bg-[#101827] p-6 text-white shadow-[0_30px_90px_rgba(23,32,51,0.22)] sm:p-8 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#8efce0]">Next step</div>
            <h2 className="mt-3 max-w-3xl text-3xl font-semibold leading-tight tracking-[-0.04em] sm:text-5xl">
              See the product, then inspect the company story.
            </h2>
            <p className="mt-4 max-w-2xl text-base leading-8 text-slate-300">
              Use the live app for customer proof, the pitch for investor context, and the roadmap
              for what is shipping next.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row lg:shrink-0">
            <button
              type="button"
              onClick={() => navigateTo(productHref, 'homepage_primary_cta_clicked', { surface: 'footer', action: 'open_product' })}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-bold text-[#172033] transition hover:bg-[#eef4f2]"
            >
              Open product
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => navigateTo(pitchDeckHref, 'homepage_pitch_clicked', { surface: 'footer' })}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-white/18 bg-white/[0.08] px-5 py-3 text-sm font-bold text-white transition hover:bg-white/[0.14]"
            >
              Pitch deck
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}
