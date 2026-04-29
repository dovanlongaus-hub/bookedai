import { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  BarChart3,
  Bot,
  CalendarCheck2,
  CheckCircle2,
  CircleDollarSign,
  ClipboardCheck,
  Gauge,
  MessageSquareText,
  PlayCircle,
  Radar,
  ShieldCheck,
  Sparkles,
  Workflow,
} from 'lucide-react';

import { brandUploadedLogoPath } from '../../components/landing/data';
import { LogoMark } from '../../components/landing/ui/LogoMark';
import { CommandPalette } from '../../shared/components/CommandPalette';
import { LiveBookingStrip, LiveBookingToast } from '../../shared/components/LiveBookingTicker';
import { HomepageSearchExperience } from './HomepageSearchExperience';
import { getHomepageContent, pitchDeckHref } from './homepageContent';

const chessScreenImageUrl = '/branding/optimized/chess-screen-proof-1400.webp';
const chessScreenImageSrcSet =
  '/branding/optimized/chess-screen-proof-960.webp 960w, /branding/optimized/chess-screen-proof-1400.webp 1400w';
const tenantPreviewImageUrl = '/branding/optimized/tenant-login-hero-1400.webp';
const tenantPreviewImageSrcSet =
  '/branding/optimized/tenant-login-hero-960.webp 960w, /branding/optimized/tenant-login-hero-1400.webp 1400w';
const pitchVideoUrl = 'https://upload.bookedai.au/videos/9eb8/BhVuOlB2QXlBo-_nyOFCcA.mp4';
const productProofImageUrl = 'https://upload.bookedai.au/images/df6e/iarJydFRgp1aWGk5UF0d7g.png';
const homepageFinalProductHref = 'https://product.bookedai.au/?source=homepage-cta';
const metadataTitle = 'BookedAI.au | Booking-ready AI setup for service businesses';

type HomepageExperimentVariant = 'control' | 'product_first';

type HomepageAudience = 'sme' | 'judge' | 'vc';

type HomepageEventWindow = Window & {
  dataLayer?: Array<Record<string, unknown>>;
  __bookedaiHomepageEvents?: Array<Record<string, unknown>>;
};

const HOMEPAGE_VARIANT_STORAGE_KEY = 'bookedai.homepage.variant';
const HOMEPAGE_VARIANT_QUERY_PARAM = 'homepage_variant';
const HOMEPAGE_AUDIENCE_STORAGE_KEY = 'bookedai.audience';
const HOMEPAGE_AUDIENCE_QUERY_PARAMS = ['aud', 'audience'] as const;
const WSTI_DEMO_QUERY_PARAM = 'demo';
const wstiDemoSearch = 'Show WSTI AI events at Western Sydney Startup Hub this month';

const suggestedSearches = [
  'Book Co Mai Hung Chess Sydney pilot class this week',
  'Find Future Swim kids swimming lessons near Caringbah this weekend',
  wstiDemoSearch,
  'Book an AI Mentor 1-1 session for startup growth this week',
  'Find a premium haircut near Sydney CBD today',
];

const navLinks = [
  { label: 'How it works', href: '#why-bookedai' },
  { label: 'Product proof', href: '#homepage-product-proof-title' },
  { label: 'Product flow', href: '#live-product' },
  { label: 'Architecture', href: '/architecture' },
  { label: 'FAQ', href: '#homepage-faq' },
] as const;

const executiveStats = [
  { value: '3', label: 'live proof paths', detail: 'Chess, swim school, and AI Mentor flows customers can try' },
  { value: 'Done-for-you', label: 'SME launch setup', detail: 'sales page, inbox, CRM, calendar, and follow-up configured' },
  { value: '<30s', label: 'enquiry to action', detail: 'shortlist, booking request, portal, and customer follow-up' },
] as const;

const investorSignals = [
  { label: 'Win', value: 'reply while the customer is still ready to book' },
  { label: 'Convert', value: 'move first contact into a clear booking step' },
  { label: 'Follow up', value: 'keep email, CRM, payment, and customer care aligned' },
  { label: 'See', value: 'know what was booked and what needs action' },
] as const;

const heroFlow = ['Demand', 'Match', 'Book', 'Operate'] as const;

const launchSetupCards = [
  {
    title: 'Custom landing page',
    body: 'Your offer, prices, proof, service area, and booking CTA live on one customer-ready page.',
  },
  {
    title: 'Dedicated email',
    body: 'Enquiries and confirmations route through info@bookedai.au or your dedicated booking inbox.',
  },
  {
    title: 'Dedicated CRM',
    body: 'Leads, bookings, notes, payment status, and follow-up stay in one workspace.',
  },
  {
    title: 'Booking + meeting setup',
    body: 'Calendar slots, meeting links, reminders, payment next steps, and portal follow-up are configured before launch.',
  },
] as const;

const servicePackages = [
  {
    name: 'Launch',
    price: 'A$79/mo',
    setup: 'A$0 setup',
    fit: 'Solo operators and micro teams',
    promise: 'One booking-ready page, one customer channel, one service catalog.',
    flow: ['Customer asks', 'BookedAI captures details', 'Portal + email follow-up'],
    cta: 'Start Launch',
    featured: false,
  },
  {
    name: 'Grow',
    price: 'A$249/mo',
    setup: 'A$499 setup + 3% captured revenue',
    fit: 'Established service SMEs',
    promise: 'Managed setup across web, Telegram, WhatsApp, CRM, calendar, and follow-up.',
    flow: ['Customer asks', 'AI shortlists', 'Book + pay + care'],
    cta: 'Start Grow pilot',
    featured: true,
  },
  {
    name: 'Scale',
    price: 'A$999+/mo',
    setup: 'Custom setup',
    fit: 'Multi-location teams and platforms',
    promise: 'Templates, API/webhooks, SLA, reporting, and a named success owner.',
    flow: ['Multi-location intake', 'Team controls', 'Revenue ops review'],
    cta: 'Plan Scale',
    featured: false,
  },
] as const;

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
    body: 'The same flow carries booking intent into confirmation, portal, payment next step, and follow-up.',
  },
  {
    icon: BarChart3,
    title: 'Business visibility',
    body: 'Your team sees bookings, follow-up tasks, customer notes, and payment status without chasing separate tools.',
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
    body: 'AI-guided qualification, booking follow-up, and customer-care answers grounded in real booking data.',
    tag: 'Qualify',
  },
  {
    icon: CircleDollarSign,
    title: 'Revenue core',
    body: 'Booking requests, payment status, confirmations, portal return, email, calendar, and CRM sync.',
    tag: 'Convert',
  },
  {
    icon: ShieldCheck,
    title: 'Business visibility',
    body: 'Team workspaces, reliability review, booking history, and lifecycle requests with clear business oversight.',
    tag: 'Operate',
  },
] as const;

const customerPoints = [
  'Start from a customer sentence, not a rigid booking form.',
  'Keep lead capture, best option, confirmation, payment next step, and support in one journey.',
  'Give your team visibility into what happened, what is blocked, and what needs human review.',
] as const;

const proofRows = [
  ['Co Mai Hung Chess', 'Live class enquiry to booking flow', 'Live proof case'],
  ['Future Swim', 'Service page, booking path, and team follow-up', 'SME service proof'],
  ['AI Mentor 1-1 Pro', 'Dedicated page, booking email, CRM, and meeting setup', 'Coaching proof'],
] as const;

const channelTruthRows = [
  { label: 'Live', value: 'Web assistant, Product app, Telegram, Portal', tone: 'bg-[#eaf4f1] text-[#19684b]' },
  { label: 'In rollout', value: 'WhatsApp inbound, Email/CRM follow-up, business widget proof', tone: 'bg-[#fff7df] text-[#7b5c10]' },
  { label: 'Next', value: 'SMS expansion, more widgets, billing/receivables truth', tone: 'bg-[#eef2ff] text-[#354399]' },
] as const;

const agentActivityProofRows = [
  {
    step: '01',
    title: 'Enquiry captured',
    detail: 'Customer asks from web, Telegram, or the WSTI demo prompt.',
    evidence: 'message event',
  },
  {
    step: '02',
    title: 'AI ranks options',
    detail: 'Service/event shortlist keeps location, price posture, and next action visible.',
    evidence: 'match result',
  },
  {
    step: '03',
    title: 'Booking reference created',
    detail: 'BookedAI generates a durable portal path instead of ending at a chat answer.',
    evidence: 'booking ref',
  },
  {
    step: '04',
    title: 'Follow-up queued',
    detail: 'CRM, email, customer care, payment status, and team follow-up become easy to review.',
    evidence: 'follow-up trail',
  },
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

function normalizeHomepageAudience(value: string | null): HomepageAudience | null {
  if (!value) {
    return null;
  }
  const normalized = value.trim().toLowerCase();
  if (normalized === 'sme' || normalized === 'owner' || normalized === 'sme_owner' || normalized === 'a') {
    return 'sme';
  }
  if (normalized === 'judge' || normalized === 'wsti' || normalized === 'hackathon' || normalized === 'b') {
    return 'judge';
  }
  if (normalized === 'vc' || normalized === 'investor' || normalized === 'investors' || normalized === 'c') {
    return 'vc';
  }
  return null;
}

function readAudienceQueryParam(params: URLSearchParams): { rawValue: string | null; resolved: HomepageAudience | null } {
  for (const key of HOMEPAGE_AUDIENCE_QUERY_PARAMS) {
    const raw = params.get(key);
    if (raw !== null) {
      return { rawValue: raw, resolved: normalizeHomepageAudience(raw) };
    }
  }
  return { rawValue: null, resolved: null };
}

function resolveHomepageAudience(): HomepageAudience {
  if (typeof window === 'undefined') {
    return 'sme';
  }

  const params = new URLSearchParams(window.location.search);
  const { rawValue, resolved } = readAudienceQueryParam(params);

  // Allow `?aud=clear` (or empty) to reset persisted selection.
  if (rawValue !== null) {
    const trimmed = rawValue.trim().toLowerCase();
    if (trimmed === '' || trimmed === 'clear' || trimmed === 'reset') {
      try {
        window.sessionStorage.removeItem(HOMEPAGE_AUDIENCE_STORAGE_KEY);
      } catch {
        // sessionStorage may be unavailable (private mode); ignore.
      }
      return 'sme';
    }
    if (resolved) {
      try {
        window.sessionStorage.setItem(HOMEPAGE_AUDIENCE_STORAGE_KEY, resolved);
      } catch {
        // ignore
      }
      return resolved;
    }
  }

  // Hostname / path heuristics for shareable links without explicit ?aud=.
  const hostname = window.location.hostname.toLowerCase();
  const pathname = window.location.pathname.toLowerCase();
  if (hostname.startsWith('pitch.') || pathname.startsWith('/pitch') || pathname.startsWith('/demo')) {
    try {
      window.sessionStorage.setItem(HOMEPAGE_AUDIENCE_STORAGE_KEY, 'judge');
    } catch {
      // ignore
    }
    return 'judge';
  }
  if (pathname.startsWith('/investor')) {
    try {
      window.sessionStorage.setItem(HOMEPAGE_AUDIENCE_STORAGE_KEY, 'vc');
    } catch {
      // ignore
    }
    return 'vc';
  }

  // Persisted selection wins over the SME default so refreshes keep the variant.
  try {
    const stored = normalizeHomepageAudience(window.sessionStorage.getItem(HOMEPAGE_AUDIENCE_STORAGE_KEY));
    if (stored) {
      return stored;
    }
  } catch {
    // ignore
  }

  return 'sme';
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
  const homepageAudience = useMemo<HomepageAudience>(() => resolveHomepageAudience(), []);
  const isWstiDemoMode = useMemo(() => {
    if (typeof window === 'undefined') {
      return false;
    }
    return new URLSearchParams(window.location.search).get(WSTI_DEMO_QUERY_PARAM)?.trim().toLowerCase() === 'wsti';
  }, []);
  const [submittedQuery, setSubmittedQuery] = useState<string | null>(null);
  const [submittedRequestId, setSubmittedRequestId] = useState(0);
  const sourcePath =
    typeof window !== 'undefined'
      ? `${window.location.pathname}${window.location.search}`
      : '/';

  const heroCopy =
    homepageAudience === 'sme'
      ? {
          audienceBadge: 'For SME owners',
          eyebrow: 'Built for winning service SMEs',
          title: 'Win more bookings from the enquiries you already get.',
          body:
            'BookedAI sets up your sales page, booking email, CRM, calendar, meeting links, and AI follow-up so every customer has a clear path to search, choose, and book.',
          primaryCta: 'See a live booking flow',
          secondaryCta: 'Get my booking page set up',
        }
      : homepageAudience === 'judge'
        ? {
            audienceBadge: 'For hackathon judges',
            eyebrow: 'The AI revenue engine for service businesses',
          title: 'One AI booking layer. Every channel. Every booking. Visible.',
            body:
            'BookedAI runs a live AI booking stack across web, WhatsApp, Telegram, SMS, and email, with booking activity judges can inspect.',
            primaryCta: 'Run the live demo (60 sec)',
            secondaryCta: 'View booking activity',
          }
        : {
            audienceBadge: 'For investors',
            eyebrow: 'The AI revenue engine for service businesses',
            title: 'The revenue OS for the next 30M service businesses.',
            body:
              'BookedAI is an omnichannel agent layer that captures intent, books the customer, takes payment, and proves the revenue across one measurable operating system.',
            primaryCta: 'See live booking proof',
            secondaryCta: 'Read the investor pitch',
          };

  useEffect(() => {
    trackHomepageEvent('homepage_variant_assigned', { variant: homepageVariant });
  }, [homepageVariant]);

  useEffect(() => {
    trackHomepageEvent('homepage_audience_assigned', {
      variant: homepageVariant,
      audience: homepageAudience,
    });
  }, [homepageAudience, homepageVariant]);

  useEffect(() => {
    if (!isWstiDemoMode) {
      return;
    }

    trackHomepageEvent('homepage_wsti_demo_started', { variant: homepageVariant });
    setSubmittedQuery(wstiDemoSearch);
    setSubmittedRequestId((current) => current + 1);
    window.setTimeout(() => {
      document.getElementById('live-product')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 220);
  }, [homepageVariant, isWstiDemoMode]);

  function navigateTo(href: string, eventName?: string, payload: Record<string, unknown> = {}) {
    if (typeof window === 'undefined') {
      return;
    }

    if (eventName) {
      trackHomepageEvent(eventName, {
        variant: homepageVariant,
        audience: homepageAudience,
        href,
        ...payload,
      });
    }
    window.location.href = href;
  }

  function focusLiveProduct() {
    trackHomepageEvent('homepage_primary_cta_clicked', {
      variant: homepageVariant,
      audience: homepageAudience,
      action: 'focus_search',
      href: '#live-product',
    });
    document.getElementById('live-product')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    window.setTimeout(() => {
      document.querySelector<HTMLTextAreaElement>('#bookedai-search-assistant textarea[aria-label="Ask BookedAI"]')?.focus();
    }, 160);
  }

  function focusLiveTenantProof() {
    trackHomepageEvent('homepage_primary_cta_clicked', {
      variant: homepageVariant,
      audience: homepageAudience,
      action: 'focus_live_tenant_proof',
      href: '#top',
    });
    // The top hero card already shows the live chess tenant proof; for VC visitors
    // we keep them anchored at the live tenant proof tile.
    document.getElementById('top')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function focusBookingActivity() {
    trackHomepageEvent('homepage_secondary_cta_clicked', {
      variant: homepageVariant,
      audience: homepageAudience,
      action: 'focus_booking_activity',
      href: '#agent-activity-proof',
    });
    document
      .getElementById('agent-activity-proof')
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function handlePrimaryHeroAction() {
    if (homepageAudience === 'sme') {
      focusLiveProduct();
      return;
    }
    if (homepageAudience === 'judge') {
      runSearch(wstiDemoSearch);
      return;
    }
    // VC / investor — show them the live tenant proof tile.
    focusLiveTenantProof();
  }

  function handleSecondaryHeroAction() {
    if (homepageAudience === 'sme') {
      navigateTo('/register-interest?source_section=homepage_launch_offer', 'homepage_secondary_cta_clicked', {
        action: 'launch_setup',
        surface: 'hero',
      });
      return;
    }
    if (homepageAudience === 'judge') {
      focusBookingActivity();
      return;
    }
    // VC / investor — open the investor pitch (same canonical pitchDeckHref).
    navigateTo(pitchDeckHref, 'homepage_secondary_cta_clicked', {
      action: 'open_investor_pitch',
      surface: 'hero',
    });
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
      <span className="sr-only">{metadataTitle}</span>
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
              onClick={focusLiveProduct}
              className="inline-flex items-center gap-2 rounded-full bg-[#172033] px-4 py-2 text-sm font-semibold text-white shadow-[0_14px_32px_rgba(23,32,51,0.18)] transition hover:bg-[#263147]"
            >
              See a live booking
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      </header>

      {isWstiDemoMode ? (
        <div className="border-b border-[#d8d0c0] bg-[#172033] px-4 py-3 text-white sm:px-6 lg:px-8">
          <div className="mx-auto flex max-w-[1440px] flex-col gap-2 text-sm sm:flex-row sm:items-center sm:justify-between">
            <div className="font-semibold">WSTI judge mode is running the live AI Summit proof path.</div>
            <div className="text-slate-300">Prompt: {wstiDemoSearch}</div>
          </div>
        </div>
      ) : null}

      <section id="top" className="relative px-4 pb-10 pt-7 sm:px-6 sm:pb-14 sm:pt-10 lg:px-8">
        <div className="mx-auto grid max-w-[1440px] gap-6 lg:grid-cols-[minmax(0,0.92fr)_minmax(520px,1.08fr)] lg:items-stretch">
          <div className="flex min-h-[620px] flex-col justify-between rounded-[2rem] border border-[#d8d0c0] bg-[#fffdf8] p-5 shadow-[0_28px_80px_rgba(86,73,50,0.1)] sm:p-7 lg:p-9">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-[#d8d0c0] bg-[#f6f0e3] px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-[#6c5a2e]">
                <span className="h-2 w-2 rounded-full bg-[#2aa876]" />
                {heroCopy.eyebrow}
              </div>
              <div
                className="audience-badge mt-3"
                data-audience={homepageAudience}
                aria-label={`Audience variant: ${heroCopy.audienceBadge}`}
              >
                {heroCopy.audienceBadge}
              </div>
              <h1 className="mt-6 max-w-[18ch] text-[2.17rem] font-semibold leading-[0.98] tracking-[-0.055em] text-[#172033] sm:text-[3.325rem] lg:text-[3.885rem]">
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
                  onClick={handleSecondaryHeroAction}
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-[#cfc7b8] bg-white px-5 py-3 text-sm font-bold text-[#172033] transition hover:border-[#9fb0c5]"
                >
                  {heroCopy.secondaryCta}
                  <BarChart3 className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>

              <div className="mt-5 flex w-full">
                <LiveBookingStrip className="w-full sm:w-auto" />
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
                        Live customer proof
                      </div>
                      <h2 className="mt-3 max-w-xl text-2xl font-semibold leading-tight tracking-[-0.04em] text-white sm:text-3xl">
                        See demand become booked revenue.
                      </h2>
                    </div>
                    <div className="grid grid-cols-4 gap-1.5 rounded-2xl border border-white/10 bg-white/[0.06] p-2">
                      {heroFlow.map((item, index) => (
                        <div key={item} className="min-w-0 rounded-xl bg-white/[0.07] px-2 py-2 text-center">
                          <div className="text-xs font-bold text-[#8efce0]">0{index + 1}</div>
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

      <section id="sme-launch-offer" className="px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-[1440px] rounded-[2rem] border border-[#d8d0c0] bg-[#fffdf8] p-5 shadow-[0_24px_70px_rgba(86,73,50,0.08)] sm:p-7 lg:p-8">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[#c9ddd7] bg-[#eaf4f1] px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-[#19684b]">
              Service packages for SMEs
            </div>
            <h2 className="mt-5 max-w-3xl text-3xl font-semibold leading-tight tracking-[-0.045em] text-[#172033] sm:text-4xl">
              Three simple ways to get BookedAI live.
            </h2>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-[#586173] sm:text-base">
              Pick the level of help you need. Every package keeps the same customer path:
              search, shortlist, booking request, thank-you, portal, payment posture, email,
              SMS/WhatsApp, calendar, CRM, and care.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() =>
                  navigateTo('/register-interest?source_section=homepage_launch_offer', 'homepage_launch_offer_clicked', {
                    action: 'claim_launch_setup',
                  })
                }
                className="inline-flex items-center justify-center gap-2 rounded-full bg-[#172033] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#263147]"
              >
                Get my booking page set up
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={focusLiveProduct}
                className="inline-flex items-center justify-center rounded-full border border-[#cfc7b8] bg-white px-5 py-3 text-sm font-bold text-[#172033] transition hover:border-[#9fb0c5]"
              >
                See the live flow
              </button>
            </div>
          </div>

          <div className="mt-7 grid gap-3 lg:grid-cols-3">
            {servicePackages.map((pack) => (
              <article
                key={pack.name}
                className={`rounded-[1.25rem] border p-5 ${
                  pack.featured
                    ? 'border-[#172033] bg-[#172033] text-white shadow-[0_22px_54px_rgba(23,32,51,0.18)]'
                    : 'border-[#e4dccd] bg-white text-[#172033]'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className={`text-[11px] font-bold uppercase tracking-[0.16em] ${
                      pack.featured ? 'text-[#8efce0]' : 'text-[#19684b]'
                    }`}>
                      {pack.fit}
                    </div>
                    <h3 className="mt-2 text-2xl font-semibold tracking-[-0.04em]">{pack.name}</h3>
                  </div>
                  <div className={`rounded-full px-3 py-1 text-xs font-bold ${
                    pack.featured ? 'bg-white text-[#172033]' : 'bg-[#eaf4f1] text-[#19684b]'
                  }`}>
                    {pack.price}
                  </div>
                </div>
                <p className={`mt-3 text-sm leading-6 ${pack.featured ? 'text-slate-200' : 'text-[#586173]'}`}>
                  {pack.promise}
                </p>
                <div className={`mt-4 rounded-[1rem] px-3 py-3 ${
                  pack.featured ? 'bg-white/[0.08] ring-1 ring-white/10' : 'bg-[#f6f2ea] ring-1 ring-[#e4dccd]'
                }`}>
                  <div className={`text-[11px] font-bold uppercase tracking-[0.14em] ${
                    pack.featured ? 'text-[#8efce0]' : 'text-[#7b6b4c]'
                  }`}>
                    Full booking flow
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {pack.flow.map((item) => (
                      <span
                        key={item}
                        className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                          pack.featured ? 'bg-white/10 text-white' : 'bg-white text-[#586173] ring-1 ring-[#e4dccd]'
                        }`}
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
                <div className={`mt-4 text-sm font-semibold ${pack.featured ? 'text-white' : 'text-[#172033]'}`}>
                  {pack.setup}
                </div>
                <button
                  type="button"
                  onClick={() =>
                    navigateTo(
                      `/register-interest?source_section=homepage_service_packages&package=${pack.name.toLowerCase()}`,
                      'homepage_service_package_clicked',
                      { package: pack.name },
                    )
                  }
                  className={`mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full px-4 py-3 text-sm font-bold transition ${
                    pack.featured
                      ? 'bg-white text-[#172033] hover:bg-[#eef4f2]'
                      : 'bg-[#172033] text-white hover:bg-[#263147]'
                  }`}
                >
                  {pack.cta}
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </button>
              </article>
            ))}
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {launchSetupCards.map((card) => (
              <article key={card.title} className="rounded-[1.25rem] border border-[#e4dccd] bg-white p-5">
                <h3 className="text-base font-semibold tracking-[-0.03em] text-[#172033]">{card.title}</h3>
                <p className="mt-2 text-sm leading-6 text-[#586173]">{card.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="agent-activity-proof" aria-labelledby="agent-activity-proof-title" className="px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-[1440px] gap-5 rounded-[2rem] border border-[#172033] bg-[#101827] p-5 text-white shadow-[0_30px_90px_rgba(23,32,51,0.2)] sm:p-7 lg:grid-cols-[0.74fr_1.26fr] lg:p-8">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/10 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-[#8efce0]">
              <ClipboardCheck className="h-4 w-4" aria-hidden="true" />
              Agent activity proof
            </div>
            <h2 id="agent-activity-proof-title" className="mt-5 max-w-xl text-3xl font-semibold leading-tight tracking-[-0.04em] text-white sm:text-4xl">
              The owner can see each step from search to booking.
            </h2>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">
              This is the public proof stack: the customer asks, BookedAI ranks the next best step,
              the booking reference opens the portal, and follow-up becomes visible for the business without exposing private tenant data.
            </p>
            <div className="mt-6 grid gap-2">
              {channelTruthRows.map((item) => (
                <div key={item.label} className="rounded-[1rem] border border-white/10 bg-white/[0.06] p-3">
                  <div className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold uppercase tracking-[0.14em] ${item.tone}`}>
                    {item.label}
                  </div>
                  <div className="mt-2 text-sm leading-6 text-slate-200">{item.value}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-3">
            {agentActivityProofRows.map((item) => (
              <article key={item.step} className="grid gap-3 rounded-[1.25rem] border border-white/10 bg-white/[0.06] p-4 sm:grid-cols-[4.25rem_minmax(0,1fr)_auto] sm:items-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#8efce0] text-base font-bold text-[#0b1120]">
                  {item.step}
                </div>
                <div>
                  <h3 className="text-base font-semibold text-white">{item.title}</h3>
                  <p className="mt-1 text-sm leading-6 text-slate-300">{item.detail}</p>
                </div>
                <div className="w-fit rounded-full border border-white/12 bg-white/10 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.14em] text-[#8efce0] sm:justify-self-end">
                  {item.evidence}
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section aria-labelledby="homepage-product-proof-title" className="px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-[1440px] gap-5 rounded-[2rem] border border-[#d8d0c0] bg-[#fffdf8] p-4 shadow-[0_24px_70px_rgba(86,73,50,0.1)] sm:p-6 lg:grid-cols-[0.7fr_1.3fr] lg:items-center lg:p-8">
          <div className="p-1 sm:p-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#c9ddd7] bg-[#eaf4f1] px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-[#19684b]">
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
              Product proof
            </div>
            <h2 id="homepage-product-proof-title" className="mt-5 max-w-xl text-3xl font-semibold leading-tight tracking-[-0.04em] text-[#172033] sm:text-4xl">
              A real product surface that carries the customer journey forward.
            </h2>
            <p className="mt-4 max-w-xl text-sm leading-7 text-[#586173] sm:text-base">
              See the workspace behind the customer page: enquiries, booking details, payment status,
              follow-up, and team notes stay connected after the first conversation.
            </p>
          </div>

          <div className="overflow-hidden rounded-[1.6rem] border border-[#172033]/10 bg-[#101827] p-3 shadow-[0_24px_70px_rgba(23,32,51,0.16)]">
            <img
              src={productProofImageUrl}
              alt="BookedAI product proof workspace screenshot"
              className="aspect-[1693/929] w-full rounded-[1.15rem] bg-white object-contain object-center"
              loading="lazy"
              width={1693}
              height={929}
            />
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
              Watch the story, then try the live booking flow.
            </h2>
            <p className="mt-4 max-w-xl text-sm leading-7 text-slate-300 sm:text-base">
              The video gives business owners a quick overview before they try the live product and
              compare the setup offer below.
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
              it because intent arrives across search, chat, calls, forms, payment links, and staff
              follow-up. BookedAI joins those moments into one AI booking system.
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

      <section id="homepage-faq" className="px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-[1440px] rounded-[2rem] border border-[#d8d0c0] bg-white p-6 shadow-[0_20px_54px_rgba(86,73,50,0.08)] sm:p-8">
          <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#8a6b24]">Questions teams ask most</div>
          <div className="mt-6 grid gap-4 lg:grid-cols-3">
            {[
              ['Who is BookedAI.au for?', 'Service businesses that rely on enquiries, calls, bookings, and follow-up to grow revenue.'],
              ['What improves first?', 'BookedAI.au tightens enquiry capture, qualification, booking flow, and customer-care continuity.'],
              ['How do customers contact BookedAI?', 'Customers can book from the live assistant and receive follow-up from info@bookedai.au, with portal and Telegram care available after booking.'],
              ['Do we replace everything?', 'No. BookedAI.au strengthens the conversion path first, then connects CRM, email, care, and business visibility.'],
            ].map(([question, answer]) => (
              <article key={question} className="rounded-[1.4rem] border border-[#e4dccd] bg-[#fbf7ee] p-5">
                <h3 className="text-lg font-semibold tracking-[-0.03em] text-[#172033]">{question}</h3>
                <p className="mt-3 text-sm leading-7 text-[#586173]">{answer}</p>
              </article>
            ))}
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
                payment next step, confirmation, and follow-up in one commercial flow.
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
            <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#8efce0]">Business model</div>
            <h2 className="mt-4 max-w-xl text-4xl font-semibold leading-tight tracking-[-0.045em] sm:text-5xl">
              Customer surfaces to business visibility, without losing the lead.
            </h2>
            <p className="mt-5 max-w-2xl text-base leading-8 text-slate-300">
              The platform is designed as a revenue flow, not a chatbot wrapper. Every public
              interaction should create clearer next steps for the customer, the business, and the team.
            </p>

            <div className="mt-8 overflow-hidden rounded-[1.4rem] border border-white/10 bg-white/[0.06]">
              <img
                src={tenantPreviewImageUrl}
                srcSet={tenantPreviewImageSrcSet}
                sizes="(min-width: 1024px) 42vw, calc(100vw - 2rem)"
                alt="BookedAI business workspace preview"
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
            <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#8a6b24]">For business owners</div>
            <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-[#172033] sm:text-4xl">
              We set up the front door and the follow-up engine together.
            </h2>
            <div className="mt-6 space-y-3">
              {[
                'Your service offer, booking CTA, contact details, proof, and next steps live on a page customers can act on.',
                'Your team receives cleaner enquiries with booking context, contact details, preferred time, and payment next step.',
                'Your CRM, email, meeting links, and follow-up workflow are configured around the way your business sells.',
              ].map((point) => (
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
            <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#8efce0]">Ready to move faster?</div>
            <h2 className="mt-3 max-w-3xl text-3xl font-semibold leading-tight tracking-[-0.04em] sm:text-5xl">
              Get your booking page, inbox, CRM, and meeting flow set up.
            </h2>
            <p className="mt-4 max-w-2xl text-base leading-8 text-slate-300">
              Start with a focused launch setup for one service, offer, or location. BookedAI helps
              turn more enquiries into booked next steps without adding more admin.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row lg:shrink-0">
            <button
              type="button"
              onClick={() => navigateTo('/register-interest?source_section=homepage_footer_launch_setup', 'homepage_primary_cta_clicked', { surface: 'footer', action: 'claim_launch_setup' })}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-bold text-[#172033] transition hover:bg-[#eef4f2]"
            >
              Get my booking page set up
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => navigateTo(homepageFinalProductHref, 'homepage_primary_cta_clicked', { surface: 'footer', action: 'open_product' })}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-white/18 bg-white/[0.08] px-5 py-3 text-sm font-bold text-white transition hover:bg-white/[0.14]"
            >
              See live product
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      </section>

      <LiveBookingToast />
      <CommandPalette surface="public" />
    </main>
  );
}
