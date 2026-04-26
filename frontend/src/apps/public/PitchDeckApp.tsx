import { useEffect, useMemo, useState } from 'react';

import { Footer } from '../../components/landing/Footer';
import { Header } from '../../components/landing/Header';
import {
  buildPublicCtaAttribution,
  dispatchPublicCtaAttribution,
} from '../../components/landing/attribution';
import {
  ctaContent,
  demoContent,
  flowSteps,
  metrics,
  partnersSectionContent,
  pricingContent,
  problemCards,
  problemContent,
  proofItems,
  showcaseImages,
  solutionCards,
  solutionContent,
  teamMembers,
  teamSectionContent,
  trustItems,
  faqItems,
} from '../../components/landing/data';
import { BrandLockup } from '../../components/landing/ui/BrandLockup';
import { SectionCard } from '../../components/landing/ui/SectionCard';
import { SignalPill } from '../../components/landing/ui/SignalPill';
import {
  getHomepageContent,
  roadmapHref,
  type HomepageLocale,
} from './homepageContent';

const productUrl = 'https://product.bookedai.au/';
const demoLandingUrl = 'https://demo.bookedai.au/';
const architectureUrl = '/architecture';
const pitchVideoUrl = 'https://upload.bookedai.au/videos/2cc8/fxu3H6DZDcFOvpjc9UlOmQ.mp4';
const chessScreenImageUrl = '/branding/optimized/chess-screen-proof-1400.webp';
const chessScreenImageSrcSet =
  '/branding/optimized/chess-screen-proof-960.webp 960w, /branding/optimized/chess-screen-proof-1400.webp 1400w';

const pitchNavItems = [
  { id: 'hero', label: 'Overview' },
  { id: 'pitch-video', label: 'Pitch Video' },
  { id: 'proof', label: 'Product' },
  { id: 'problem', label: 'Problem' },
  { id: 'solution', label: 'Solution' },
  { id: 'pricing', label: 'Pricing' },
  { id: 'architecture', label: 'Architecture', href: architectureUrl },
  { id: 'surfaces', label: 'Surfaces' },
  { id: 'trust', label: 'Trust' },
];

const industryTypes = ['Salon', 'Tradie', 'Swim School', 'Trades', 'Healthcare'];

const problemFunnel = [
  { step: '01', label: 'Enquiry arrives', sub: 'Customer reaches out via web, phone, or social', alert: false },
  { step: '02', label: 'Slow reply', sub: 'No immediate response — lead begins to cool', alert: false },
  { step: '03', label: 'Weak qualification', sub: 'Back-and-forth without capturing real intent', alert: false },
  { step: '04', label: 'No clear next step', sub: 'Interest stalls — no booking offer surfaced', alert: false },
  { step: '05', label: 'Lead lost', sub: 'Revenue disappears before staff even see it', alert: true },
];

const agentSurfaceCards = [
  {
    eyebrow: 'Product agent',
    title: 'Live AI booking flow',
    body: 'product.bookedai.au runs the live search, shortlist, booking capture, and operator handoff in one session.',
    href: productUrl,
    cta: 'Open Web App',
    tone: 'from-[#eef6ff] to-white',
  },
  {
    eyebrow: 'Demo preview',
    title: 'Story-led product preview',
    body: 'demo.bookedai.au stays available as the lighter, explanation-first entry for buyers reviewing the product.',
    href: demoLandingUrl,
    cta: 'Open Demo',
    tone: 'from-[#f5f3ff] to-white',
  },
  {
    eyebrow: 'Commercial homepage',
    title: 'Product-first landing',
    body: 'bookedai.au stays lean and fast. The pitch carries the deeper commercial and investor narrative.',
    href: 'https://bookedai.au/',
    cta: 'View Homepage',
    tone: 'from-[#ecfdf5] to-white',
  },
];

const pricingPlans = [
  {
    tier: 'Freemium',
    price: 'Free',
    caption: 'Validate demand capture at zero cost',
    features: [
      'AI booking assistant',
      '1 booking channel',
      'Basic conversation flow',
      'Community support',
    ],
    highlight: false,
    cta: 'Get started free',
  },
  {
    tier: 'Pro',
    price: '$49+/mo',
    caption: 'Full booking workflow for growing SMEs',
    features: [
      'Smart qualification engine',
      'Multi-channel capture',
      'Booking conversion analytics',
      '1 month free at launch',
      'Priority support',
    ],
    highlight: true,
    cta: 'Start Pro trial',
  },
  {
    tier: 'Pro Max',
    price: 'Custom',
    caption: 'Enterprise revenue operations suite',
    features: [
      'Full tenant admin workspace',
      'API integrations',
      'Performance commission model',
      'Admin oversight layer',
      'Dedicated onboarding',
    ],
    highlight: false,
    cta: 'Talk to Sales',
  },
];

const architectureCapabilityCards = [
  ['Designed surface', 'A visual system buyers can inspect, not a hidden backend diagram.'],
  ['Connected workflow', 'Every customer turn can become booking state, care state, and operator evidence.'],
  ['Enterprise posture', 'Tenant boundaries, policy gates, audit trails, and fallback rails are visible by design.'],
];

const architectureImageNodes = [
  ['Capture', 'Web, product, widget, WhatsApp'],
  ['Orchestrate', 'Customer AI + matching policy'],
  ['Convert', 'Lead, booking, payment posture'],
  ['Operate', 'Tenant Ops + admin action ledger'],
];

const architectureSupportRails = [
  ['Customer surfaces', 'bookedai.au, product, demo, portal, widget'],
  ['Agent layer', 'customer turn, revenue ops, care/status'],
  ['Revenue core', 'lead, booking intent, payment, email/calendar'],
  ['Control plane', 'tenant ops, admin reliability, audit ledger'],
];

function VisualChip({
  children,
  tone = 'light',
}: {
  children: string;
  tone?: 'light' | 'dark' | 'brand';
}) {
  const cls =
    tone === 'dark'
      ? 'bg-[#1d1d1f] text-white'
      : tone === 'brand'
        ? 'bg-[#e7f4ff] text-[#1459c7]'
        : 'bg-white text-[#3c4043]';
  return (
    <div className={`rounded-full px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] ${cls}`}>
      {children}
    </div>
  );
}

function PitchVideoSection() {
  return (
    <section id="pitch-video" className="mx-auto w-full max-w-7xl px-6 py-6 lg:px-8 lg:py-8">
      <SectionCard className="overflow-hidden border border-black/6 bg-[linear-gradient(135deg,#101827_0%,#172033_52%,#123b3a_100%)] p-0 text-white shadow-[0_32px_90px_rgba(15,23,42,0.16)]">
        <div className="grid gap-0 xl:grid-cols-[0.82fr_1.18fr] xl:items-stretch">
          <div className="flex flex-col justify-between gap-6 p-6 sm:p-8 lg:p-10">
            <div>
              <SignalPill className="w-fit border border-white/12 bg-white/10 px-4 py-1.5 text-[11px] uppercase tracking-[0.16em] text-[#8efce0]">
                Pitch video
              </SignalPill>
              <h2 className="mt-5 max-w-xl text-3xl font-semibold tracking-[-0.05em] text-white sm:text-4xl">
                Watch the BookedAI story before diving into the deck.
              </h2>
              <p className="mt-4 max-w-xl text-sm leading-7 text-slate-300 sm:text-base">
                A short visual walkthrough for the commercial narrative: customer demand, AI booking,
                operator visibility, and why the platform is built around revenue truth.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <a
                href={pitchVideoUrl}
                target="_blank"
                rel="noreferrer"
                className="rounded-full bg-white px-5 py-3 text-sm font-semibold text-[#172033] transition hover:-translate-y-0.5 hover:bg-[#eef4f2]"
              >
                Open video
              </a>
              <a
                href={productUrl}
                className="rounded-full border border-white/16 bg-white/[0.08] px-5 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-white/[0.14]"
              >
                Try product
              </a>
            </div>
          </div>
          <div className="bg-black/24 p-3 sm:p-4 lg:p-5">
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
        </div>
      </SectionCard>
    </section>
  );
}

function ArchitectureSnapshotImage() {
  return (
    <div
      role="img"
      aria-label="BookedAI architecture image showing capture, AI orchestration, booking conversion, and operations control"
      className="overflow-hidden rounded-[1.45rem] border border-slate-900 bg-slate-950 shadow-[0_24px_64px_rgba(15,23,42,0.18)]"
    >
      <svg
        viewBox="0 0 980 560"
        className="block h-auto w-full"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect width="980" height="560" fill="#07111f" />
        <path d="M0 0H980V560H0V0Z" fill="url(#pitchArchitectureBg)" />
        <defs>
          <linearGradient id="pitchArchitectureBg" x1="74" y1="28" x2="902" y2="546" gradientUnits="userSpaceOnUse">
            <stop stopColor="#0f766e" stopOpacity="0.42" />
            <stop offset="0.48" stopColor="#172554" stopOpacity="0.84" />
            <stop offset="1" stopColor="#312e81" stopOpacity="0.54" />
          </linearGradient>
          <linearGradient id="pitchArchitectureCore" x1="305" y1="150" x2="674" y2="430" gradientUnits="userSpaceOnUse">
            <stop stopColor="#22d3ee" />
            <stop offset="0.5" stopColor="#60a5fa" />
            <stop offset="1" stopColor="#8b5cf6" />
          </linearGradient>
        </defs>

        <rect x="48" y="42" width="884" height="476" rx="42" fill="white" fillOpacity="0.08" stroke="white" strokeOpacity="0.16" />
        <text x="84" y="94" fill="#a7f3d0" fontSize="18" fontWeight="700" letterSpacing="4">
          BOOKEDAI ARCHITECTURE
        </text>
        <text x="84" y="130" fill="white" fontSize="34" fontWeight="700">
          Revenue engine from demand to operator truth
        </text>

        <rect x="308" y="166" width="364" height="216" rx="34" fill="url(#pitchArchitectureCore)" fillOpacity="0.95" />
        <rect x="332" y="190" width="316" height="168" rx="26" fill="#061525" fillOpacity="0.72" stroke="white" strokeOpacity="0.2" />
        <text x="490" y="240" textAnchor="middle" fill="white" fontSize="30" fontWeight="800">
          AI Revenue Core
        </text>
        <text x="490" y="277" textAnchor="middle" fill="#dbeafe" fontSize="18" fontWeight="600">
          {'qualify -> book -> follow up'}
        </text>
        <text x="490" y="316" textAnchor="middle" fill="#a7f3d0" fontSize="16" fontWeight="700" letterSpacing="2.4">
          AUDITABLE · TENANT-SAFE · API-BACKED
        </text>

        {architectureImageNodes.map(([title, body], index) => {
          const positions = [
            { x: 84, y: 200 },
            { x: 84, y: 350 },
            { x: 722, y: 200 },
            { x: 722, y: 350 },
          ] as const;
          const { x, y } = positions[index];
          const lineStart = index < 2 ? x + 218 : 672;
          const lineEnd = index < 2 ? 308 : x - 18;
          return (
            <g key={title}>
              <path d={`M${lineStart} ${y + 50}H${lineEnd}`} stroke="#93c5fd" strokeOpacity="0.58" strokeWidth="3" strokeLinecap="round" />
              <rect x={x} y={y} width="218" height="102" rx="22" fill="white" fillOpacity="0.1" stroke="white" strokeOpacity="0.18" />
              <text x={x + 24} y={y + 42} fill="white" fontSize="22" fontWeight="800">
                {title}
              </text>
              <text x={x + 24} y={y + 73} fill="#cbd5e1" fontSize="14" fontWeight="600">
                {body}
              </text>
            </g>
          );
        })}

        <rect x="84" y="440" width="812" height="46" rx="23" fill="white" fillOpacity="0.1" stroke="white" strokeOpacity="0.16" />
        <text x="490" y="470" textAnchor="middle" fill="#e0f2fe" fontSize="16" fontWeight="700">
          Stripe · WhatsApp · n8n · CRM · FastAPI · Supabase · Docker · Cloudflare
        </text>
      </svg>
    </div>
  );
}

function PitchArchitectureFlowVisual() {
  return (
    <section id="architecture" className="mx-auto w-full max-w-7xl px-6 py-6 lg:px-8 lg:py-8">
      <SectionCard className="overflow-hidden border border-black/6 bg-[linear-gradient(135deg,#ffffff_0%,#f8fbff_44%,#eef6ff_70%,#f7f4ff_100%)] px-5 py-6 shadow-[0_28px_80px_rgba(15,23,42,0.10)] sm:px-7 lg:px-8 lg:py-8">
        <div className="grid gap-8 xl:grid-cols-[0.58fr_1.42fr] xl:items-start">
          <div>
            <SignalPill className="w-fit border border-black/6 bg-white/72 px-4 py-1.5 text-[11px] uppercase tracking-[0.16em] text-[#1459c7]">
              Architecture image
            </SignalPill>
            <h2 className="mt-5 max-w-xl text-3xl font-semibold tracking-[-0.05em] text-[#1d1d1f] sm:text-4xl lg:text-5xl">
              A multi-layer revenue engine, visualized like a technical buyer expects.
            </h2>
            <p className="mt-4 max-w-xl text-sm leading-7 text-slate-600 sm:text-base">
              BookedAI is not a single chatbot screen. It is a connected system of acquisition
              surfaces, AI orchestration, booking contracts, integrations, tenant operations, and
              infrastructure controls built to turn service demand into visible revenue workflow.
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
              {architectureCapabilityCards.map(([title, body]) => (
                <div key={title} className="rounded-[1.2rem] border border-black/6 bg-white/82 px-4 py-3 shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#1459c7]">
                    {title}
                  </div>
                  <div className="mt-1 text-sm leading-6 text-slate-700">{body}</div>
                </div>
              ))}
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              <a
                href={architectureUrl}
                className="rounded-full bg-[#1d1d1f] px-5 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5"
              >
                Open full architecture
              </a>
              <a
                href={roadmapHref}
                className="rounded-full border border-black/8 bg-white/80 px-5 py-3 text-sm font-semibold text-[#1d1d1f] transition hover:-translate-y-0.5"
              >
                View roadmap
              </a>
            </div>
          </div>

          <figure className="rounded-[1.85rem] border border-black/6 bg-white/78 p-3 shadow-[0_22px_58px_rgba(15,23,42,0.08)] sm:p-4">
            <ArchitectureSnapshotImage />
            <figcaption className="mt-4 grid gap-3 md:grid-cols-2">
              {architectureSupportRails.map(([title, body]) => (
                <div key={title} className="min-w-0 rounded-[1.1rem] border border-slate-200 bg-white px-4 py-3">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#1459c7]">
                    {title}
                  </div>
                  <div className="mt-1 text-sm leading-6 text-slate-700">{body}</div>
                </div>
              ))}
            </figcaption>
          </figure>
        </div>
      </SectionCard>
    </section>
  );
}

type PitchRegisterSource = 'header' | 'hero' | 'pricing' | 'call_to_action' | 'footer';

type PricingPitchSectionProps = {
  openRegisterInterest: (sourceSection: PitchRegisterSource, sourceDetail: string) => void;
};

function PricingPitchSection({ openRegisterInterest }: PricingPitchSectionProps) {
  return (
    <section id="pricing" className="mx-auto w-full max-w-7xl px-6 py-6 lg:px-8 lg:py-8">
      <SectionCard className="overflow-hidden border border-black/6 bg-[linear-gradient(135deg,#ffffff_0%,#f7f9ff_42%,#eef6ff_100%)] px-6 py-6 shadow-[0_28px_80px_rgba(15,23,42,0.08)] sm:px-7 lg:px-8">
        <div className="grid gap-8 xl:grid-cols-[0.75fr_1.25fr] xl:items-start">
          <div>
            <SignalPill className="w-fit border border-black/6 bg-white/72 px-4 py-1.5 text-[11px] uppercase tracking-[0.16em] text-[#1459c7]">
              Commercial terms
            </SignalPill>
            <h2 className="mt-5 text-3xl font-semibold tracking-[-0.05em] text-[#1d1d1f] sm:text-4xl">
              Start small, prove captured revenue, then expand the operating layer.
            </h2>
            <p className="mt-4 text-sm leading-7 text-black/58">
              The first buying step should feel easy for an SME: launch the assistant, capture enquiries,
              and review booked outcomes before committing to heavier workflow automation.
            </p>

            <div className="mt-6 rounded-[1.75rem] border border-black/6 bg-white/72 p-5 backdrop-blur">
              <div className="text-[11px] font-semibold uppercase tracking-[0.13em] text-black/42">
                Starting from
              </div>
              <div className="mt-2 text-5xl font-semibold tracking-[-0.07em] text-[#1d1d1f]">
                {pricingContent.planPrice}
              </div>
              <div className="mt-2 text-sm text-black/50">{pricingContent.planCaption}</div>
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              <a
                href={architectureUrl}
                className="rounded-full border border-black/8 bg-white/80 px-5 py-3 text-sm font-semibold text-[#1d1d1f] transition hover:-translate-y-0.5"
              >
                View Architecture
              </a>
              <button
                type="button"
                onClick={() => openRegisterInterest('pricing', 'pitch_pricing_register')}
                className="rounded-full bg-[#1d1d1f] px-5 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5"
              >
                Open SME Registration
              </button>
              <a
                href={productUrl}
                className="rounded-full border border-black/8 bg-white/80 px-5 py-3 text-sm font-semibold text-[#1d1d1f] transition hover:-translate-y-0.5"
              >
                Open Web App
              </a>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {pricingPlans.map((plan) => (
              <div
                key={plan.tier}
                className={`relative flex flex-col rounded-[1.75rem] border px-5 py-6 ${
                  plan.highlight
                    ? 'border-[#1d4ed8]/28 bg-[linear-gradient(180deg,#eff6ff_0%,#ffffff_100%)] shadow-[0_20px_50px_rgba(29,78,216,0.10)]'
                    : 'border-black/6 bg-white'
                }`}
              >
                {plan.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-[#1d4ed8] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.13em] text-white">
                    Most popular
                  </div>
                )}
                <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-black/40">
                  {plan.tier}
                </div>
                <div className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-[#1d1d1f]">
                  {plan.price}
                </div>
                <div className="mt-1 text-[11px] text-black/48">{plan.caption}</div>
                <ul className="mt-5 flex-1 space-y-2">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm leading-6 text-black/62">
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#1d4ed8]" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  onClick={() =>
                    openRegisterInterest(
                      'pricing',
                      `pitch_pricing_${plan.tier.toLowerCase().replace(' ', '_')}`,
                    )
                  }
                  className={`mt-6 rounded-full px-4 py-2.5 text-sm font-semibold transition hover:-translate-y-0.5 ${
                    plan.highlight
                      ? 'bg-[#1d4ed8] text-white hover:bg-[#1e40af]'
                      : 'border border-black/10 bg-white text-[#1d1d1f]'
                  }`}
                >
                  {plan.cta}
                </button>
              </div>
            ))}
          </div>
        </div>
      </SectionCard>
    </section>
  );
}

function ChessProofSection() {
  return (
    <section aria-labelledby="pitch-chess-screen-title" className="relative mx-auto w-full max-w-7xl px-6 py-6 lg:px-8 lg:py-8">
      <div className="overflow-hidden rounded-[1.75rem] border border-black/6 bg-[#0f172a] shadow-[0_32px_90px_rgba(15,23,42,0.16)]">
        <div className="grid items-stretch xl:grid-cols-[minmax(0,1fr)_minmax(360px,0.42fr)]">
          <div className="relative flex items-center bg-[linear-gradient(135deg,#111827_0%,#182235_52%,#0f172a_100%)] p-3 sm:p-4 lg:p-5">
            <div className="w-full overflow-hidden rounded-[1.35rem] border border-white/10 bg-[#e8edf5] shadow-[0_24px_64px_rgba(2,6,23,0.28)]">
              <img
                src={chessScreenImageUrl}
                srcSet={chessScreenImageSrcSet}
                sizes="(min-width: 1280px) 58vw, calc(100vw - 3rem)"
                alt="Grandmaster Chess Academy booking flow in BookedAI"
                className="block aspect-[3/2] h-auto w-full object-contain object-center"
                loading="eager"
                width={1400}
                height={933}
              />
            </div>
          </div>

          <div className="flex flex-col justify-between gap-6 bg-[linear-gradient(180deg,#111827_0%,#0f172a_100%)] p-5 text-white sm:p-6 lg:p-8">
            <div>
              <SignalPill className="w-fit border border-white/10 bg-white/[0.08] px-4 py-1.5 text-[11px] uppercase tracking-[0.16em] text-[#8EFCE0]">
                Live proof
              </SignalPill>
              <h2 id="pitch-chess-screen-title" className="mt-4 text-2xl font-semibold leading-tight tracking-[-0.045em] text-white sm:text-3xl lg:text-4xl">
                A real tenant flow before the architecture story.
              </h2>
              <p className="mt-4 text-sm leading-7 text-slate-300 sm:text-[15px]">
                Grandmaster Chess Academy shows the product in context: search intent, assessment,
                placement, booking posture, portal follow-up, and revenue-ops evidence in one journey.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
              {[
                ['Tenant', 'GM Chess Academy'],
                ['Journey', 'Search to booking'],
                ['Runtime', 'API-backed demo'],
              ].map(([label, value]) => (
                <div key={label} className="rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">{label}</div>
                  <div className="mt-1 text-sm font-semibold leading-6 text-white">{value}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function PitchDeckApp() {
  const [locale, setLocale] = useState<HomepageLocale>('en');
  const content = useMemo(() => getHomepageContent(locale), [locale]);

  function openRegisterInterest(
    sourceSection: 'header' | 'hero' | 'pricing' | 'call_to_action' | 'footer',
    sourceDetail: string,
  ) {
    if (typeof window === 'undefined') return;
    const attribution = buildPublicCtaAttribution({
      source_section: sourceSection,
      source_cta: 'start_free_trial',
      source_detail: sourceDetail,
      source_plan_id: 'standard',
      source_flow_mode: 'guided',
    });
    const target = new URL('/register-interest', window.location.origin);
    target.searchParams.set('source_section', attribution.source_section);
    target.searchParams.set('source_cta', attribution.source_cta);
    target.searchParams.set('offer', 'launch10');
    target.searchParams.set('deployment', 'standalone_website');
    target.searchParams.set('setup', 'online');
    if (attribution.source_detail) {
      target.searchParams.set('source_detail', attribution.source_detail);
    }
    dispatchPublicCtaAttribution(attribution);
    window.location.href = `${target.pathname}${target.search}`;
  }

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const storedLocale = window.localStorage.getItem('bookedai.homepage.locale');
    if (storedLocale === 'en' || storedLocale === 'vi') {
      setLocale(storedLocale);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem('bookedai.homepage.locale', locale);
    document.documentElement.lang = locale;
  }, [locale]);

  function openProductDemo() {
    window.location.href = productUrl;
  }

  function openDemoLanding() {
    window.location.href = demoLandingUrl;
  }

  const featuredDemo = demoContent.results[0];
  const proofStoryboard = [featuredDemo, demoContent.nearbyDiningSearch.result];

  return (
    <main className="relative overflow-hidden bg-[#f3f5f8] text-[#1d1d1f]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(34,197,94,0.12),transparent_24%),radial-gradient(circle_at_top_right,rgba(59,130,246,0.18),transparent_36%),linear-gradient(180deg,#f8fbff_0%,#eef2f7_50%,#f8fafc_100%)]" />

      <Header
        navItems={pitchNavItems}
        onStartTrial={() => openRegisterInterest('header', 'pitch_header_register')}
        onBookDemo={openProductDemo}
        startTrialLabel="Talk to Sales"
        bookDemoLabel="Open Web App"
        utilityLinks={[
          { label: 'Product', href: productUrl },
          { label: 'Architecture', href: architectureUrl },
          { label: 'Video Demo', href: demoLandingUrl },
          { label: 'Roadmap', href: roadmapHref },
        ]}
      />

      {/* ── 1. HERO ─────────────────────────────────────────────────── */}
      <section id="hero" className="relative mx-auto w-full max-w-7xl px-6 pt-6 lg:px-8 lg:pt-8">
        <SectionCard className="relative overflow-hidden border border-black/6 bg-[linear-gradient(135deg,#fbfdff_0%,#f6faff_42%,#eef4ff_72%,#f8f5ff_100%)] px-6 py-8 shadow-[0_32px_90px_rgba(15,23,42,0.10)] sm:px-8 lg:px-10 lg:py-10">
          <div className="relative grid items-start gap-8 xl:grid-cols-[1.1fr_0.9fr]">
            {/* Left: brand narrative + CTAs */}
            <div className="flex flex-col gap-5">
              <SignalPill className="w-fit border border-black/6 bg-white/72 px-4 py-1.5 text-[11px] uppercase tracking-[0.16em] text-[#1459c7]">
                Executive pitch · pitch.bookedai.au
              </SignalPill>

              <BrandLockup
                surface="light"
                className="items-start"
                logoClassName="booked-brand-image max-w-[16rem] sm:max-w-[20rem]"
                descriptorClassName="hidden"
                eyebrowClassName="hidden"
              />

              <h1 className="max-w-2xl text-4xl font-semibold tracking-[-0.06em] text-[#1d1d1f] sm:text-5xl lg:text-[3.4rem] lg:leading-[1.09]">
                Convert service enquiries into confirmed bookings, follow-up, and revenue visibility.
              </h1>

              <p className="max-w-xl text-base leading-8 text-black/60 sm:text-lg">
                BookedAI responds instantly, qualifies customer intent, recommends the right service,
                and hands every booking into a visible operator workflow. Built first for Australian
                service businesses.
              </p>

              {/* Industry type chips */}
              <div className="flex flex-wrap gap-2">
                {industryTypes.map((type) => (
                  <span
                    key={type}
                    className="rounded-full border border-black/8 bg-white/80 px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.13em] text-black/58 backdrop-blur"
                  >
                    {type}
                  </span>
                ))}
              </div>

              {/* Primary CTAs */}
              <div className="flex flex-wrap gap-3">
                <a
                  href={productUrl}
                  className="rounded-full bg-[#1d1d1f] px-6 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-[#111]"
                >
                  Open Web App
                </a>
                <button
                  type="button"
                  onClick={() => openRegisterInterest('hero', 'pitch_hero_sales')}
                  className="rounded-full border border-black/12 bg-white/80 px-6 py-3 text-sm font-semibold text-[#1d1d1f] transition hover:-translate-y-0.5"
                >
                  Talk to Sales
                </button>
                <button
                  type="button"
                  onClick={() => openRegisterInterest('hero', 'pitch_hero_free_setup')}
                  className="rounded-full border border-black/8 px-6 py-3 text-sm font-semibold text-black/52 transition hover:-translate-y-0.5"
                >
                  Claim Free Setup
                </button>
                <a
                  href={architectureUrl}
                  className="rounded-full border border-black/8 bg-white/70 px-6 py-3 text-sm font-semibold text-black/62 transition hover:-translate-y-0.5"
                >
                  View Architecture
                </a>
              </div>
            </div>

            {/* Right: Scene image + key metrics */}
            <div className="flex flex-col gap-4">
              <div className="overflow-hidden rounded-[1.75rem] border border-black/6 shadow-[0_20px_50px_rgba(15,23,42,0.12)]">
                <img
                  src="/branding/bookedai-scene3-local-impact.png"
                  alt="Local SMEs losing revenue daily — BookedAI closes the gap"
                  className="w-full object-cover"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                {metrics.map((metric) => (
                  <div
                    key={metric.label}
                    className="rounded-[1.35rem] border border-black/6 bg-white/80 px-4 py-4 text-center backdrop-blur"
                  >
                    <div className="text-2xl font-semibold tracking-[-0.05em] text-[#1d1d1f] sm:text-3xl">
                      {metric.value}
                    </div>
                    <div className="mt-1 text-[10px] font-semibold uppercase tracking-[0.13em] text-black/44">
                      {metric.label}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </SectionCard>
      </section>

      <ChessProofSection />

      <PitchVideoSection />

      {/* ── 2. PROBLEM ──────────────────────────────────────────────── */}
      <section id="problem" className="mx-auto w-full max-w-7xl px-6 py-6 lg:px-8 lg:py-8">
        <div className="grid gap-5 xl:grid-cols-[0.88fr_1.12fr] xl:items-start">
          {/* Left: headline + funnel */}
          <SectionCard className="overflow-hidden bg-[linear-gradient(180deg,#fff8f5_0%,#ffffff_100%)] px-6 py-6 sm:px-7 lg:px-8">
            <SignalPill className="w-fit bg-[#fff0eb] px-4 py-1.5 text-[11px] uppercase tracking-[0.16em] text-[#b44a1f]">
              {problemContent.kicker}
            </SignalPill>
            <h2 className="mt-5 text-3xl font-semibold tracking-[-0.05em] text-[#1d1d1f] sm:text-4xl">
              Warm leads leak when staff are busy.
            </h2>
            <p className="mt-4 text-sm leading-7 text-black/58 sm:text-base">
              Customers are ready to book, but slow replies, unclear qualification, and messy handoffs
              turn demand into missed revenue before the team can act.
            </p>

            <div className="mt-6 space-y-2">
              {problemFunnel.map(({ step, label, sub, alert }) => (
                <div
                  key={step}
                  className={`flex items-center gap-4 rounded-[1.1rem] border px-4 py-3 ${
                    alert
                      ? 'border-red-200 bg-[linear-gradient(90deg,#fff1f2_0%,#ffffff_100%)]'
                      : 'border-black/6 bg-white'
                  }`}
                >
                  <div
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
                      alert ? 'bg-red-500 text-white' : 'bg-[#1d1d1f] text-white'
                    }`}
                  >
                    {step}
                  </div>
                  <div>
                    <div
                      className={`text-sm font-semibold ${alert ? 'text-red-600' : 'text-[#1d1d1f]'}`}
                    >
                      {label}
                    </div>
                    <div className="text-[11px] text-black/46">{sub}</div>
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>

          {/* Right: 3 leak point cards */}
          <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-1">
            {problemCards.map((card, index) => (
              <SectionCard
                key={card.title}
                className={`overflow-hidden px-5 py-5 ${
                  index === 0
                    ? 'bg-[linear-gradient(180deg,#fff1f2_0%,#ffffff_100%)]'
                    : index === 1
                      ? 'bg-[linear-gradient(180deg,#fff7ed_0%,#ffffff_100%)]'
                      : 'bg-[linear-gradient(180deg,#fefce8_0%,#ffffff_100%)]'
                }`}
              >
                <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-black/38">
                  Revenue leak
                </div>
                <div className="mt-4 h-24 rounded-[1.2rem] border border-black/6 bg-white/80 p-4">
                  <div className="flex h-full items-end gap-2">
                    {[36, 56, 80].map((height, i) => (
                      <div
                        key={i}
                        className={`flex-1 rounded-t-[0.8rem] ${i === 2 ? 'bg-red-400' : 'bg-black/10'}`}
                        style={{ height }}
                      />
                    ))}
                  </div>
                </div>
                <h3 className="mt-5 text-xl font-semibold tracking-[-0.03em] text-[#1d1d1f]">
                  {card.title}
                </h3>
                <p className="mt-3 text-sm leading-6 text-black/58">{card.body}</p>
              </SectionCard>
            ))}
          </div>
        </div>
      </section>

      {/* ── 3. SOLUTION ─────────────────────────────────────────────── */}
      <section id="solution" className="mx-auto w-full max-w-7xl px-6 py-6 lg:px-8 lg:py-8">
        <SectionCard className="overflow-hidden bg-[linear-gradient(135deg,#f0fdf4_0%,#ffffff_45%,#f0f9ff_100%)] px-6 py-6 sm:px-7 lg:px-8">
          <div className="grid gap-8 xl:grid-cols-[0.9fr_1.1fr] xl:items-start">
            {/* Left: narrative + cards */}
            <div>
              <SignalPill className="w-fit bg-[#dcfce7] px-4 py-1.5 text-[11px] uppercase tracking-[0.16em] text-[#15803d]">
                {solutionContent.kicker}
              </SignalPill>
              <h2 className="mt-5 text-3xl font-semibold tracking-[-0.05em] text-[#1d1d1f] sm:text-4xl">
                Close the gap between enquiry, booking, payment posture, and follow-up.
              </h2>
              <p className="mt-4 text-sm leading-7 text-black/58 sm:text-base">
                The product gives every enquiry a fast first response, enough context to qualify fit,
                and a clear next step operators can trust.
              </p>

              <div className="mt-6 space-y-3">
                {solutionCards.map((card, index) => (
                  <div
                    key={card.title}
                    className="flex items-start gap-4 rounded-[1.35rem] border border-black/6 bg-white/72 px-4 py-4 backdrop-blur"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[0.9rem] bg-[#1d1d1f] text-[11px] font-bold text-white">
                      0{index + 1}
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-[#1d1d1f]">{card.title}</div>
                      <div className="mt-1 text-sm leading-6 text-black/56">{card.body}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: flow rail + proof items */}
            <div className="space-y-4">
              <div className="rounded-[1.75rem] bg-[linear-gradient(135deg,#eff6ff_0%,#ffffff_52%,#f0fdf4_100%)] p-5">
                <div className="mb-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-black/38">
                  Revenue flow
                </div>
                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                  {flowSteps.map((step, index) => (
                    <div key={step} className="rounded-[1.35rem] border border-black/6 bg-white p-4 shadow-sm">
                      <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-black/36">
                        Step {index + 1}
                      </div>
                      <div className="mt-3 text-sm font-semibold tracking-[-0.02em] text-[#1d1d1f]">
                        {step}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-1">
                {proofItems.map((item) => (
                  <div
                    key={item.title}
                    className="rounded-[1.35rem] border border-black/6 bg-white/72 px-4 py-4 backdrop-blur"
                  >
                    <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#1d4ed8]">
                      {item.eyebrow}
                    </div>
                    <h3 className="mt-3 text-base font-semibold tracking-[-0.02em] text-[#1d1d1f]">
                      {item.title}
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-black/56">{item.body}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </SectionCard>
      </section>

      {/* ── 4. PRODUCT PROOF ────────────────────────────────────────── */}
      <section id="proof" className="mx-auto w-full max-w-7xl px-6 py-6 lg:px-8 lg:py-8">
        <div className="grid gap-5 xl:grid-cols-2">
          {/* Left: UI screenshots */}
          <SectionCard className="overflow-hidden px-6 py-6 sm:px-7 lg:px-8">
            <SignalPill className="w-fit bg-[#f5f3ff] px-4 py-1.5 text-[11px] uppercase tracking-[0.16em] text-[#6d28d9]">
              Product proof
            </SignalPill>
            <h2 className="mt-5 text-3xl font-semibold tracking-[-0.05em] text-[#1d1d1f] sm:text-4xl">
              Search, shortlist, book, and continue in one visible customer flow.
            </h2>

            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              {showcaseImages.map((image) => (
                <div
                  key={image.src}
                  className="overflow-hidden rounded-[1.5rem] border border-black/6 bg-white"
                >
                  <div className="aspect-[4/4.8] overflow-hidden">
                    <img
                      src={image.src}
                      alt={image.alt}
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                  </div>
                  <div className="p-4">
                    <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-black/38">
                      {image.eyebrow}
                    </div>
                    <div className="mt-2 text-sm font-semibold leading-5 text-[#1d1d1f]">
                      {image.title}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 flex gap-3">
              <a href={productUrl} className="booked-button">
                Open Web App
              </a>
              <button type="button" onClick={openDemoLanding} className="booked-button-secondary">
                Open Demo
              </button>
            </div>
          </SectionCard>

          {/* Right: proof storyboard */}
          <div className="flex flex-col gap-5">
            {proofStoryboard.map((result, index) => (
              <SectionCard key={`${result.name}-${index}`} className="flex-1 overflow-hidden p-0">
                <div className="grid md:grid-cols-[0.95fr_1.05fr]">
                  <div className="aspect-[4/3] overflow-hidden bg-slate-100">
                    <img
                      src={result.imageUrl}
                      alt={result.name}
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                  </div>
                  <div className="p-5 lg:p-6">
                    <div className="flex flex-wrap items-center gap-2">
                      <VisualChip tone="brand">
                        {index === 0
                          ? demoContent.topPickLabel
                          : demoContent.nearbyDiningSearch.label}
                      </VisualChip>
                      <VisualChip>{result.category}</VisualChip>
                    </div>
                    <h3 className="mt-4 text-xl font-semibold tracking-[-0.04em] text-[#1d1d1f]">
                      {result.name}
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-black/58">{result.summary}</p>
                    <div className="mt-4 grid grid-cols-3 gap-2">
                      {[result.priceLabel, result.timingLabel, result.locationLabel].map((item) => (
                        <div
                          key={item}
                          className="rounded-[0.9rem] border border-black/6 bg-[#f8fbff] px-2 py-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#1d1d1f]"
                        >
                          {item}
                        </div>
                      ))}
                    </div>
                    <div className="mt-4 rounded-[1.1rem] bg-[#1d1d1f] px-4 py-3 text-sm leading-6 text-white/80">
                      {result.bestFor}
                    </div>
                  </div>
                </div>
              </SectionCard>
            ))}
          </div>
        </div>
      </section>

      {/* ── 5. PRICING ──────────────────────────────────────────────── */}
      <PricingPitchSection openRegisterInterest={openRegisterInterest} />

      {/* ── 6. ARCHITECTURE ─────────────────────────────────────────── */}
      <PitchArchitectureFlowVisual />

      {/* ── 7. SURFACES ─────────────────────────────────────────────── */}
      <section id="surfaces" className="mx-auto w-full max-w-7xl px-6 py-6 lg:px-8 lg:py-8">
        <SectionCard className="overflow-hidden bg-[linear-gradient(135deg,#ffffff_0%,#f8fbff_52%,#f6fffb_100%)] px-6 py-6 sm:px-7 lg:px-8">
          <div className="grid gap-8 xl:grid-cols-[0.82fr_1.18fr] xl:items-center">
            <div>
              <SignalPill className="w-fit bg-[#e0f2fe] px-4 py-1.5 text-[11px] uppercase tracking-[0.16em] text-[#0369a1]">
                Product surfaces
              </SignalPill>
              <h2 className="mt-5 text-3xl font-semibold tracking-[-0.05em] text-[#1d1d1f] sm:text-4xl">
                Separate surfaces. Each one does a single job.
              </h2>
              <p className="mt-4 text-sm leading-7 text-black/58 sm:text-base">
                The pitch keeps the commercial narrative. The product host runs the live booking
                agent. The demo stays light and explanation-first. No mixed runtime, no context loss.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <a href={productUrl} className="booked-button">
                  Open Web App
                </a>
                <button
                  type="button"
                  onClick={() => openRegisterInterest('hero', 'surfaces_register')}
                  className="booked-button-secondary"
                >
                  SME Registration
                </button>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {agentSurfaceCards.map((card) => (
                <div
                  key={card.title}
                  className={`flex flex-col rounded-[1.6rem] border border-black/6 bg-gradient-to-br ${card.tone} px-5 py-5 shadow-sm`}
                >
                  <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-black/40">
                    {card.eyebrow}
                  </div>
                  <div className="mt-3 text-base font-semibold tracking-[-0.02em] text-[#1d1d1f]">
                    {card.title}
                  </div>
                  <p className="mt-2 flex-1 text-sm leading-6 text-black/58">{card.body}</p>
                  <a
                    href={card.href}
                    className="mt-4 self-start rounded-full border border-black/8 bg-white/80 px-4 py-2 text-xs font-semibold text-[#1d1d1f] transition hover:-translate-y-0.5"
                  >
                    {card.cta}
                  </a>
                </div>
              ))}
            </div>
          </div>
        </SectionCard>
      </section>

      {/* ── 8. TRUST + PARTNERS ─────────────────────────────────────── */}
      <section id="trust" className="mx-auto w-full max-w-7xl px-6 py-6 lg:px-8 lg:py-8">
        <div className="grid gap-5 xl:grid-cols-2">
          {/* Operator voices */}
          <SectionCard className="overflow-hidden bg-[linear-gradient(135deg,#ffffff_0%,#f6fbff_50%,#f0fdf4_100%)] px-6 py-6 sm:px-7 lg:px-8">
            <SignalPill className="w-fit border border-black/6 bg-white/72 px-4 py-1.5 text-[11px] uppercase tracking-[0.16em] text-[#1459c7]">
              Operator voices
            </SignalPill>
            <h2 className="mt-5 text-2xl font-semibold tracking-[-0.04em] text-[#1d1d1f] sm:text-3xl">
              Built for service operators, not generic chatbot theatre.
            </h2>
            <div className="mt-6 space-y-3">
              {trustItems.map((item) => (
                <div
                  key={item.name}
                  className="rounded-[1.35rem] border border-black/6 bg-white/72 p-4 backdrop-blur"
                >
                  <p className="text-sm leading-7 text-black/68">"{item.quote}"</p>
                  <div className="mt-3 text-[11px] font-semibold uppercase tracking-[0.13em] text-black/42">
                    {item.name} · {item.business}
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>

          {/* Partners + FAQ */}
          <SectionCard className="overflow-hidden px-6 py-6 sm:px-7 lg:px-8">
            <SignalPill className="w-fit bg-[#f0fdf4] px-4 py-1.5 text-[11px] uppercase tracking-[0.16em] text-[#15803d]">
              {partnersSectionContent.kicker}
            </SignalPill>
            <h2 className="mt-5 text-2xl font-semibold tracking-[-0.04em] text-[#1d1d1f] sm:text-3xl">
              {partnersSectionContent.title}
            </h2>

            <div className="mt-5 grid gap-3 md:grid-cols-3 xl:grid-cols-1">
              {partnersSectionContent.stats.map((stat, index) => (
                <div
                  key={stat}
                  className={`rounded-[1.25rem] p-4 ${
                    index === 0
                      ? 'bg-[linear-gradient(180deg,#eef2ff_0%,#ffffff_100%)]'
                      : index === 1
                        ? 'bg-[linear-gradient(180deg,#ecfeff_0%,#ffffff_100%)]'
                        : 'bg-[linear-gradient(180deg,#f0fdf4_0%,#ffffff_100%)]'
                  }`}
                >
                  <p className="text-sm leading-6 text-black/62">{stat}</p>
                </div>
              ))}
            </div>

            <div className="mt-5 space-y-2">
              {faqItems.map((item) => (
                <details
                  key={item.question}
                  className="rounded-[1.2rem] border border-black/6 bg-white/72 px-4 py-3 backdrop-blur"
                >
                  <summary className="cursor-pointer list-none text-sm font-semibold text-[#1d1d1f] marker:hidden">
                    {item.question}
                  </summary>
                  <p className="mt-3 text-sm leading-6 text-black/58">{item.answer}</p>
                </details>
              ))}
            </div>
          </SectionCard>
        </div>
      </section>

      {/* ── 8. TEAM ─────────────────────────────────────────────────── */}
      <section id="team" className="mx-auto w-full max-w-7xl px-6 py-6 lg:px-8 lg:py-8">
        <SectionCard className="overflow-hidden px-6 py-6 sm:px-7 lg:px-8">
          <div className="grid gap-8 xl:grid-cols-[0.72fr_1.28fr] xl:items-start">
            <div>
              <SignalPill className="w-fit bg-[#eef2ff] px-4 py-1.5 text-[11px] uppercase tracking-[0.16em] text-[#4338ca]">
                {teamSectionContent.kicker}
              </SignalPill>
              <h2 className="mt-5 text-3xl font-semibold tracking-[-0.05em] text-[#1d1d1f] sm:text-4xl">
                Built by operators, engineers, and execution-minded founders
              </h2>
              <p className="mt-4 text-sm leading-7 text-black/58 sm:text-base">
                {teamSectionContent.body}
              </p>

              <div className="mt-6 space-y-2">
                {[
                  'Technical depth across backend, systems, AI, and product delivery.',
                  'Commercial, quality, and operational perspective from real service environments.',
                  'Founder-led execution focused on rollout, not demo-only AI theatre.',
                ].map((point) => (
                  <div
                    key={point}
                    className="rounded-[1.1rem] border border-black/6 bg-[linear-gradient(180deg,#f8fbff_0%,#ffffff_100%)] px-4 py-3 text-sm leading-6 text-black/64"
                  >
                    {point}
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {teamMembers.map((member) => (
                <SectionCard key={member.name} className="overflow-hidden p-0">
                  <div className="aspect-[4/4.2] overflow-hidden bg-slate-100">
                    <img
                      src={member.imageSrc}
                      alt={member.imageAlt}
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                  </div>
                  <div className="p-5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-black/40">
                        {member.role}
                      </div>
                      <VisualChip tone="brand">Core team</VisualChip>
                    </div>
                    <h3 className="mt-3 text-xl font-semibold tracking-[-0.03em] text-[#1d1d1f]">
                      {member.name}
                    </h3>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {member.badges?.map((badge) => (
                        <span
                          key={badge}
                          className="rounded-full bg-[#f3f6fb] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-[#314155]"
                        >
                          {badge}
                        </span>
                      ))}
                    </div>
                    <p className="mt-3 text-sm leading-6 text-black/58">{member.bio}</p>
                  </div>
                </SectionCard>
              ))}
            </div>
          </div>
        </SectionCard>
      </section>

      {/* ── 10. FINAL CTA ───────────────────────────────────────────── */}
      <section className="mx-auto w-full max-w-7xl px-6 py-5 lg:px-8">
        <SectionCard className="overflow-hidden border border-black/6 bg-[linear-gradient(135deg,#101827_0%,#172033_54%,#0f766e_140%)] px-5 py-6 text-white shadow-[0_24px_70px_rgba(15,23,42,0.14)] sm:px-7 lg:px-8">
          <div className="grid min-w-0 gap-5 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
            <div className="min-w-0">
              <SignalPill className="w-fit border border-white/12 bg-white/10 px-4 py-1.5 text-[11px] uppercase tracking-[0.16em] text-[#8efce0]">
                {ctaContent.kicker}
              </SignalPill>
              <h2 className="mt-4 max-w-2xl break-words text-2xl font-semibold tracking-[-0.04em] text-white sm:text-3xl">
                Move from pitch to live revenue flow.
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
                Open the product, review the architecture, or register the business for launch setup.
              </p>
            </div>
            <div className="flex min-w-0 flex-col gap-3 sm:flex-row md:justify-end">
              <a
                href={productUrl}
                className="rounded-full bg-white px-5 py-3 text-center text-sm font-semibold text-[#172033] transition hover:-translate-y-0.5 hover:bg-[#eef4f2]"
              >
                Open Web App
              </a>
              <button
                type="button"
                onClick={() => openRegisterInterest('call_to_action', 'pitch_final_cta_sales')}
                className="rounded-full border border-white/16 bg-white/[0.08] px-5 py-3 text-center text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-white/[0.14]"
              >
                Talk to Sales
              </button>
            </div>
          </div>
        </SectionCard>
      </section>

      <Footer
        onStartTrial={() => openRegisterInterest('footer', 'pitch_footer_register')}
        onBookDemo={openProductDemo}
        startTrialLabel="Open SME Registration"
        bookDemoLabel="Open Web App"
        showBrandCopy={false}
        compact
      />
    </main>
  );
}
