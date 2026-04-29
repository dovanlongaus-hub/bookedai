import { useEffect, useMemo, useState, type ReactNode } from 'react';

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
import {
  competitorPlots,
  defensibilityCards,
  defensibilityLede,
  liveEvidenceFrames,
  marketSizeBuildBlocks,
  marketSizeRows,
  revenuePhases,
  unitEconomicsContext,
  unitEconomicsTiles,
  whyNowSignals,
  whyNowStats,
} from './pitch-investor-slides';

const productUrl = 'https://product.bookedai.au/';
const demoLandingUrl = 'https://demo.bookedai.au/';
const architectureUrl = '/architecture';
const pitchVideoUrl = 'https://upload.bookedai.au/videos/9eb8/BhVuOlB2QXlBo-_nyOFCcA.mp4';
const chessScreenImageUrl = '/branding/optimized/chess-screen-proof-1400.webp';
const chessScreenImageSrcSet =
  '/branding/optimized/chess-screen-proof-960.webp 960w, /branding/optimized/chess-screen-proof-1400.webp 1400w';
const productProofImageUrl = 'https://upload.bookedai.au/images/df6e/iarJydFRgp1aWGk5UF0d7g.png';

const pitchNavItems = [
  { id: 'hero', label: 'Overview' },
  { id: 'problem', label: 'Problem' },
  { id: 'solution', label: 'Solution' },
  { id: 'proof', label: 'Live Proof' },
  { id: 'live-evidence', label: 'Evidence' },
  { id: 'pitch-video', label: 'Video' },
  { id: 'pricing', label: 'Plans' },
  { id: 'launch-offer', label: 'GTM Wedge' },
  { id: 'architecture', label: 'How It Works', href: architectureUrl },
  { id: 'why-now', label: 'Why Now' },
  { id: 'market-size', label: 'Scale' },
  { id: 'competitive-map', label: 'Alternatives' },
  { id: 'defensibility', label: 'Moat' },
  { id: 'unit-economics', label: 'Economics' },
  { id: 'live-evidence', label: 'Live Evidence' },
  { id: 'revenue-milestones', label: 'Rollout' },
  { id: 'roadmap-execution', label: 'Roadmap' },
  { id: 'surfaces', label: 'Live Links' },
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
    eyebrow: 'Live product',
    title: 'Live AI booking flow',
    body: 'product.bookedai.au runs the live search, shortlist, booking capture, and team follow-through in one session.',
    href: productUrl,
    cta: 'Open Web App',
    tone: 'from-[#eef6ff] to-white',
  },
  {
    eyebrow: 'Buyer preview',
    title: 'Story-led product preview',
    body: 'demo.bookedai.au stays available as the lighter, explanation-first entry for buyers reviewing the product.',
    href: demoLandingUrl,
    cta: 'Open Demo',
    tone: 'from-sky-50 to-white',
  },
  {
    eyebrow: 'Commercial homepage',
    title: 'Product-first landing',
    body: 'bookedai.au stays lean and fast. The pitch carries the deeper SME offer, live cases, rollout story, and commercial proof.',
    href: 'https://bookedai.au/',
    cta: 'View Homepage',
    tone: 'from-[#ecfdf5] to-white',
  },
];

const pricingPlans = [
  {
    tier: 'Starter Engine',
    price: 'A$79/mo',
    setup: 'A$0 self-serve',
    commission: '0% (pure SaaS)',
    caption: 'Solo / micro teams (1-3 staff)',
    features: [
      '1 channel (Telegram OR web widget)',
      '1 service catalog',
      'BookedAI Manager Bot + portal',
      'Payment QR + email confirmations',
      '50 booked/mo cap',
    ],
    highlight: false,
    cta: 'Start free',
  },
  {
    tier: 'Growth Engine',
    price: 'A$249/mo',
    setup: 'A$499 onboarding',
    commission: '3% on net booked revenue',
    caption: 'Established SME (4-25 staff)',
    features: [
      'All 3 channels (Telegram + WhatsApp + widget)',
      'Revenue-ops + customer-care agent queue',
      'Dedicated CRM follow-up workspace',
      'Dedicated booking email + monthly revenue summary',
      '3% commission on net booked revenue',
    ],
    highlight: true,
    cta: 'Start a 30-day pilot',
  },
  {
    tier: 'Enterprise Engine',
    price: 'A$999+/mo',
    setup: 'A$2,500-A$10,000 custom',
    commission: '5% on attributable revenue',
    caption: 'Multi-location / franchise / academy (25+ staff or 3+ locations)',
    features: [
      'Custom landing pages for every location or offer',
      'White-label widget + webhook + API access',
      'Retention / churn-rescue automation',
      'Dedicated CRM, email identity, SLA + named CSM',
      '5% commission with floor + cap negotiated',
    ],
    highlight: false,
    cta: 'Talk to founder',
  },
];

const architectureCapabilityCards = [
  ['Designed surface', 'A visual system buyers can inspect, not a hidden backend diagram.'],
  ['Connected workflow', 'Every customer turn can become booking state, care state, and clear business evidence.'],
  ['Enterprise posture', 'Customer data, staff handoff, payment follow-up, and manual review are visible by design.'],
];

const architectureImageNodes = [
  ['Capture', 'Web, product, widget, WhatsApp'],
  ['Orchestrate', 'Customer AI + matching policy'],
  ['Convert', 'Lead, booking, payment status'],
  ['Operate', 'Team workspace + follow-up history'],
];

const architectureSupportRails = [
  ['Customer surfaces', 'bookedai.au, product, demo, portal, widget'],
  ['Agent layer', 'customer enquiry, booking help, care/status'],
  ['Revenue core', 'lead, booking intent, payment, email/calendar'],
  ['Operations layer', 'team inbox, CRM follow-up, review history'],
];

const launchOfferCards = [
  {
    title: 'New landing page',
    body: 'BookedAI refreshes a dedicated landing page for the SME offer, service, or location so customers can understand and book faster.',
  },
  {
    title: 'Dedicated email',
    body: 'Each onboarded business can use a clear booking identity such as hello@yourbrand or a BookedAI-managed mailbox for confirmations and follow-up.',
  },
  {
    title: 'Dedicated CRM',
    body: 'Leads, bookings, payment status, and customer-care notes are organized in a CRM workspace configured around the business.',
  },
  {
    title: 'Booking + meeting setup',
    body: 'Calendar, booking slots, meeting links, payment next steps, and customer reminders are preconfigured before launch.',
  },
] as const;

const liveCaseCards = [
  {
    title: 'chess.bookedai.au',
    body: 'Grandmaster Chess shows a vertical landing page, bilingual booking flow, dedicated chess@bookedai.au email, class selection, payment options, and meeting follow-up.',
    href: 'https://chess.bookedai.au/',
  },
  {
    title: 'aimentor.bookedai.au',
    body: 'AI Mentor 1-1 Pro shows a service-specific page, dedicated aimentor@bookedai.au email, CRM-style enrolment capture, Stripe checkout, and Zoho Meeting scheduling.',
    href: 'https://aimentor.bookedai.au/',
  },
] as const;

const smeSetupSummaryCards = [
  {
    step: '01',
    title: 'Launch page',
    body: 'A service-specific landing page that explains the offer, captures demand, and gives customers a clear booking path.',
  },
  {
    step: '02',
    title: 'Dedicated inbox',
    body: 'A clean booking email identity for confirmations, reminders, customer handoff, and follow-up.',
  },
  {
    step: '03',
    title: 'CRM workspace',
    body: 'Leads, bookings, meeting notes, payment status, and next actions organized around the way the SME works.',
  },
  {
    step: '04',
    title: 'Booking engine',
    body: 'Calendar slots, meeting links, payment next steps, and reminders preconfigured before the first campaign goes live.',
  },
] as const;

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
                See the whole BookedAI solution in one guided walkthrough.
              </h2>
              <p className="mt-4 max-w-xl text-sm leading-7 text-slate-300 sm:text-base">
                A short visual walkthrough of the SME journey: capture demand, qualify the customer,
                book the right next step, and give the business a visible follow-up workflow.
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
            <stop offset="1" stopColor="#0071e3" />
          </linearGradient>
        </defs>

        <rect x="48" y="42" width="884" height="476" rx="42" fill="white" fillOpacity="0.08" stroke="white" strokeOpacity="0.16" />
        <text x="84" y="94" fill="#a7f3d0" fontSize="18" fontWeight="700" letterSpacing="4">
          BOOKEDAI REVENUE ENGINE
        </text>
        <text x="84" y="130" fill="white" fontSize="34" fontWeight="700">
          From enquiry to booked follow-up
        </text>

        <rect x="308" y="166" width="364" height="216" rx="34" fill="url(#pitchArchitectureCore)" fillOpacity="0.95" />
        <rect x="332" y="190" width="316" height="168" rx="26" fill="#061525" fillOpacity="0.72" stroke="white" strokeOpacity="0.2" />
        <text x="490" y="240" textAnchor="middle" fill="white" fontSize="30" fontWeight="800">
          Booking Revenue Core
        </text>
        <text x="490" y="277" textAnchor="middle" fill="#dbeafe" fontSize="18" fontWeight="600">
          {'qualify -> book -> follow up'}
        </text>
        <text x="490" y="316" textAnchor="middle" fill="#a7f3d0" fontSize="16" fontWeight="700" letterSpacing="2.4">
          VISIBLE · CUSTOMER-SAFE · CRM-READY
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
          Landing pages · Email · CRM · Calendar · Meetings · Payments · Portal
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
              The system behind the page is simple: capture, book, follow up, prove.
            </h2>
            <p className="mt-4 max-w-xl text-sm leading-7 text-slate-600 sm:text-base">
              BookedAI is not just a chatbot. It combines customer pages, AI intake, booking records,
              calendar and meeting setup, payment next steps, and a business workspace so every
              enquiry can move toward revenue.
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
              {architectureCapabilityCards.map(([title, body]) => (
                <div key={title} className="rounded-[1.2rem] border border-black/6 bg-white/82 px-4 py-3 shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
                  <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[#1459c7]">
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
                Open full system map
              </a>
              <a
                href={roadmapHref}
                className="rounded-full border border-black/8 bg-white/80 px-5 py-3 text-sm font-semibold text-[#1d1d1f] transition hover:-translate-y-0.5"
              >
                View rollout plan
              </a>
            </div>
          </div>

          <figure className="rounded-[1.85rem] border border-black/6 bg-white/78 p-3 shadow-[0_22px_58px_rgba(15,23,42,0.08)] sm:p-4">
            <ArchitectureSnapshotImage />
            <figcaption className="mt-4 grid gap-3 md:grid-cols-2">
              {architectureSupportRails.map(([title, body]) => (
                <div key={title} className="min-w-0 rounded-[1.1rem] border border-slate-200 bg-white px-4 py-3">
                  <div className="text-xs font-semibold uppercase tracking-[0.14em] text-[#1459c7]">
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

function MasterRoadmapPitchSection() {
  return (
    <section
      id="roadmap-execution"
      aria-labelledby="pitch-master-roadmap-title"
      className="mx-auto w-full max-w-7xl px-6 py-6 lg:px-8 lg:py-8"
    >
      <SectionCard className="overflow-hidden border border-black/6 bg-[linear-gradient(135deg,#ffffff_0%,#f7faff_46%,#f3f5fc_100%)] px-5 py-6 shadow-[0_28px_80px_rgba(15,23,42,0.10)] sm:px-7 lg:px-8 lg:py-8">
        <div className="grid gap-7 xl:grid-cols-[0.42fr_1.58fr] xl:items-start">
          <div>
            <SignalPill className="w-fit border border-black/6 bg-white/80 px-4 py-1.5 text-[11px] uppercase tracking-[0.16em] text-[#b91c1c]">
              Roadmap & execution plan
            </SignalPill>
            <h2
              id="pitch-master-roadmap-title"
              className="mt-5 max-w-xl text-3xl font-semibold tracking-[-0.05em] text-[#1d1d1f] sm:text-4xl lg:text-[2.6rem] lg:leading-[1.08]"
            >
              Rollout roadmap: proof cases first, repeatable SME setup next.
            </h2>
            <p className="mt-4 max-w-xl text-sm leading-7 text-slate-600 sm:text-base">
              The commercial rollout is organized around a simple promise: launch real SME booking
              verticals, prove the journey, then repeat the same configured revenue engine for the
              next business.
            </p>

            <div className="mt-5 flex flex-wrap gap-3">
              <a
                href={roadmapHref}
                className="rounded-full bg-[#1d1d1f] px-5 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5"
              >
                Open full roadmap
              </a>
              <a
                href="/roadmap/master-roadmap-2026-04-11-to-06-07.svg"
                className="rounded-full border border-black/8 bg-white/80 px-5 py-3 text-sm font-semibold text-[#1d1d1f] transition hover:-translate-y-0.5"
                target="_blank"
                rel="noreferrer"
              >
                View roadmap image
              </a>
            </div>
          </div>

          <figure className="rounded-[1.85rem] border border-black/6 bg-white/85 p-3 shadow-[0_22px_58px_rgba(15,23,42,0.08)] sm:p-4">
            <div className="overflow-hidden rounded-[1.45rem] border border-slate-200 bg-white">
              <img
                src="/roadmap/master-roadmap-2026-04-11-to-06-07.svg"
                alt="BookedAI Master Roadmap from 2026-04-11 Phase 0 reset through 2026-06-07 Phase 23 closeout, organized in five launch workstreams with milestones M-01 through M-11 and a hard go-live lock on 2026-04-30"
                className="block h-auto w-full"
                loading="lazy"
              />
            </div>
            <figcaption className="mt-4 grid gap-3 md:grid-cols-3">
              <div className="min-w-0 rounded-[1.1rem] border border-rose-200 bg-rose-50/60 px-4 py-3">
                <div className="text-xs font-semibold uppercase tracking-[0.14em] text-rose-700">
                  Launch proof
                </div>
                <div className="mt-1 text-sm leading-6 text-slate-700">
                  Three live customer paths show BookedAI across classes, coaching, and service discovery.
                </div>
              </div>
              <div className="min-w-0 rounded-[1.1rem] border border-blue-200 bg-blue-50/60 px-4 py-3">
                <div className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-700">
                  Post go-live cadence
                </div>
                <div className="mt-1 text-sm leading-6 text-slate-700">
                  Widget, wallet/Stripe, billing follow-up, business templates, and weekly release checks.
                </div>
              </div>
              <div className="min-w-0 rounded-[1.1rem] border border-sky-200 bg-sky-50/60 px-4 py-3">
                <div className="text-xs font-semibold uppercase tracking-[0.14em] text-apple-blue">
                  Communication overlay
                </div>
                <div className="mt-1 text-sm leading-6 text-slate-700">
                  M-09 WhatsApp outbound · M-10 iMessage feasibility research · M-11 SMS adapter.
                </div>
              </div>
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
              AI Revenue Engine pricing
            </SignalPill>
            <h2 className="mt-5 text-3xl font-semibold tracking-[-0.05em] text-[#1d1d1f] sm:text-4xl">
              Pay only when BookedAI books real revenue.
            </h2>
            <p className="mt-4 text-sm leading-7 text-black/58">
              We&apos;re free at the bottom, premium at the top, and aligned in the middle. {pricingContent.planCaption}
            </p>

            <div className="mt-6 rounded-[1.75rem] border border-black/6 bg-white/72 p-5 backdrop-blur">
              <div className="text-[11px] font-semibold uppercase tracking-[0.13em] text-black/42">
                Starts from
              </div>
              <div className="mt-2 text-5xl font-semibold tracking-[-0.07em] text-[#1d1d1f]">
                {pricingContent.planPrice}
              </div>
              <div className="mt-2 text-sm text-black/50">
                Setup fees scoped after a 10-min call. Commission applies only to bookings BookedAI captures or recovers.
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              <a
                href={architectureUrl}
                className="rounded-full border border-black/8 bg-white/80 px-5 py-3 text-sm font-semibold text-[#1d1d1f] transition hover:-translate-y-0.5"
              >
                View system map
              </a>
              <button
                type="button"
                onClick={() => openRegisterInterest('pricing', 'pitch_pricing_register')}
                className="rounded-full bg-[#1d1d1f] px-5 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5"
              >
                Register pilot
              </button>
              <a
                href={productUrl}
                className="rounded-full border border-black/8 bg-white/80 px-5 py-3 text-sm font-semibold text-[#1d1d1f] transition hover:-translate-y-0.5"
              >
                Open live product
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
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-[#1d4ed8] px-3 py-1 text-xs font-semibold uppercase tracking-[0.13em] text-white">
                    Most popular
                  </div>
                )}
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-black/40">
                  {plan.tier}
                </div>
                <div className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-[#1d1d1f]">
                  {plan.price}
                </div>
                <div className="mt-1 text-[11px] text-black/48">{plan.caption}</div>
                <div className="mt-2 text-[11px] text-black/55">{plan.setup}</div>
                <div className="mt-1 text-[11px] font-semibold text-[#1d4ed8]">{plan.commission}</div>
                <ul className="mt-4 flex-1 space-y-2">
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

function LaunchOfferSection({ openRegisterInterest }: PricingPitchSectionProps) {
  return (
    <section id="launch-offer" className="mx-auto w-full max-w-7xl px-6 py-6 lg:px-8 lg:py-8">
      <SectionCard className="overflow-hidden border border-black/6 bg-[linear-gradient(135deg,#102033_0%,#153b3b_56%,#f6fbff_180%)] px-6 py-7 text-white shadow-[0_28px_80px_rgba(15,23,42,0.14)] sm:px-7 lg:px-8">
        <div className="grid gap-8 xl:grid-cols-[0.75fr_1.25fr] xl:items-start">
          <div>
            <SignalPill className="w-fit border border-white/12 bg-white/10 px-4 py-1.5 text-[11px] uppercase tracking-[0.16em] text-[#8efce0]">
              Go-to-market wedge
            </SignalPill>
            <h2 className="mt-5 max-w-xl text-3xl font-semibold tracking-[-0.05em] text-white sm:text-4xl">
              Repeatable SME deployment package.
            </h2>
            <p className="mt-4 max-w-xl text-sm leading-7 text-slate-300 sm:text-base">
              The launch package is the repeatable wedge: every pilot gets a booking-ready page,
              dedicated email identity, CRM workspace, calendar, booking slots, and meeting or
              payment follow-up.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => openRegisterInterest('call_to_action', 'sme_launch_offer')}
                className="rounded-full bg-white px-5 py-3 text-sm font-semibold text-[#172033] transition hover:-translate-y-0.5 hover:bg-[#eef4f2]"
              >
                Join pilot cohort
              </button>
              <a
                href="https://chess.bookedai.au/"
                className="rounded-full border border-white/16 bg-white/[0.08] px-5 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-white/[0.14]"
              >
                See live case
              </a>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {launchOfferCards.map((card) => (
              <article key={card.title} className="rounded-[1.35rem] border border-white/10 bg-white/[0.08] p-5">
                <h3 className="text-lg font-semibold tracking-[-0.035em] text-white">{card.title}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-300">{card.body}</p>
              </article>
            ))}
          </div>
        </div>

        <div className="mt-7 grid gap-4 md:grid-cols-2">
          {liveCaseCards.map((card) => (
            <a
              key={card.title}
              href={card.href}
              className="rounded-[1.35rem] border border-white/10 bg-white/[0.08] p-5 text-white transition hover:-translate-y-0.5 hover:bg-white/[0.12]"
            >
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8efce0]">
                Live BookedAI case
              </div>
              <h3 className="mt-2 text-xl font-semibold tracking-[-0.04em]">{card.title}</h3>
              <p className="mt-3 text-sm leading-6 text-slate-300">{card.body}</p>
            </a>
          ))}
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
                A live SME booking case, not a slide mockup.
              </h2>
              <p className="mt-4 text-sm leading-7 text-slate-300 sm:text-[15px]">
                Grandmaster Chess Academy shows the product in context: search intent, assessment,
                placement, dedicated booking email, payment options, portal follow-up, and customer
                care in one journey.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
              {[
                ['Live case', 'GM Chess Academy'],
                ['Journey', 'Search to booking'],
                ['Setup', 'Page + email + CRM'],
              ].map(([label, value]) => (
                <div key={label} className="rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3">
                  <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">{label}</div>
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

function SMESetupOverviewSection({ openRegisterInterest }: PricingPitchSectionProps) {
  return (
    <section id="sme-setup" className="mx-auto w-full max-w-7xl px-6 py-6 lg:px-8 lg:py-8">
      <SectionCard className="overflow-hidden border border-black/6 bg-[linear-gradient(135deg,#ffffff_0%,#f7fbff_44%,#eef7f4_100%)] px-6 py-6 shadow-[0_24px_70px_rgba(15,23,42,0.08)] sm:px-7 lg:px-8">
        <div className="grid gap-7 xl:grid-cols-[0.68fr_1.32fr] xl:items-start">
          <div>
            <SignalPill className="w-fit border border-black/6 bg-white/72 px-4 py-1.5 text-[11px] uppercase tracking-[0.16em] text-[#0f766e]">
              Repeatable deployment
            </SignalPill>
            <h2 className="mt-5 max-w-xl text-3xl font-semibold tracking-[-0.05em] text-[#1d1d1f] sm:text-4xl">
              A packaged rollout motion, not one-off implementation work.
            </h2>
            <p className="mt-4 max-w-xl text-sm leading-7 text-slate-600 sm:text-base">
              BookedAI launches the customer-facing page and the business workflow together, then
              reuses that playbook across service categories, locations, and pilot customers.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => openRegisterInterest('call_to_action', 'sme_setup_overview')}
                className="rounded-full bg-[#1d1d1f] px-5 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5"
              >
                Register pilot interest
              </button>
              <a
                href="https://aimentor.bookedai.au/"
                className="rounded-full border border-black/8 bg-white/80 px-5 py-3 text-sm font-semibold text-[#1d1d1f] transition hover:-translate-y-0.5"
              >
                See AI Mentor case
              </a>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {smeSetupSummaryCards.map((card) => (
              <article key={card.title} className="rounded-[1.35rem] border border-black/6 bg-white/82 p-5 shadow-[0_12px_30px_rgba(15,23,42,0.04)]">
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[#0f766e]">
                  {card.step}
                </div>
                <h3 className="mt-3 text-lg font-semibold tracking-[-0.035em] text-[#1d1d1f]">
                  {card.title}
                </h3>
                <p className="mt-3 text-sm leading-6 text-slate-600">{card.body}</p>
              </article>
            ))}
          </div>
        </div>
      </SectionCard>
    </section>
  );
}

function InvestorSlideShell({
  id,
  kicker,
  title,
  subtitle,
  audienceBadge = 'Business case',
  children,
}: {
  id: string;
  kicker: string;
  title: string;
  subtitle?: string;
  audienceBadge?: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="mx-auto w-full max-w-7xl px-6 py-6 lg:px-8 lg:py-8">
      <SectionCard className="overflow-hidden border border-apple-light/60 bg-apple-white px-5 py-6 shadow-apple-sm sm:px-7 lg:px-8 lg:py-8">
        <div className="flex flex-wrap items-center gap-2">
          <SignalPill className="w-fit border border-apple-light/70 bg-apple-light/60 px-4 py-1.5 text-[11px] uppercase tracking-[0.16em] text-apple-blue">
            {kicker}
          </SignalPill>
          <span className="rounded-full border border-apple-light/70 bg-apple-light/40 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-apple-near-black/56">
            {audienceBadge}
          </span>
        </div>
        <h2 className="mt-5 max-w-3xl text-3xl font-semibold tracking-[-0.05em] text-apple-near-black sm:text-4xl lg:text-[2.6rem] lg:leading-[1.08]">
          {title}
        </h2>
        {subtitle && (
          <p className="mt-4 max-w-3xl text-sm leading-7 text-apple-near-black/64 sm:text-base">{subtitle}</p>
        )}
        <div className="mt-6">{children}</div>
      </SectionCard>
    </section>
  );
}

function WhyNowSlide() {
  return (
    <InvestorSlideShell
      id="why-now"
      kicker="Why now"
      title="The booking gap for AU service SMEs is open right now."
      subtitle="Customers expect fast replies, business owners want fewer admin steps, and AI can finally connect intake, booking, payment next steps, and follow-up in one practical workflow."
    >
      <div className="grid gap-3 md:grid-cols-3">
        {whyNowStats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-apple-large border border-apple-light/70 bg-apple-light/40 px-5 py-5"
          >
            <div className="text-3xl font-semibold tracking-[-0.05em] text-apple-near-black sm:text-4xl">
              {stat.value}
            </div>
            <div className="mt-2 text-[11px] font-semibold uppercase tracking-[0.13em] text-apple-blue">
              {stat.label}
            </div>
            <p className="mt-3 text-sm leading-6 text-apple-near-black/64">{stat.sub}</p>
          </div>
        ))}
      </div>
      <div className="mt-5 grid gap-3 md:grid-cols-3">
        {whyNowSignals.map((signal) => (
          <div
            key={signal.title}
            className="rounded-apple-large border border-apple-light/60 bg-apple-white px-5 py-5"
          >
            <div className="text-[11px] font-semibold uppercase tracking-[0.13em] text-apple-blue">
              {signal.title}
            </div>
            <p className="mt-2 text-sm leading-6 text-apple-near-black/68">{signal.body}</p>
          </div>
        ))}
      </div>
    </InvestorSlideShell>
  );
}

function MarketSizeSlide() {
  return (
    <InvestorSlideShell
      id="market-size"
      kicker="Scale case"
      title="AU SAM ~ A$2.9B today. Global SAM US$30B+. The wedge starts with missed local bookings."
      subtitle="Two views: top-down market math and bottom-up SME rollout. They point to the same opportunity: a repeatable revenue workflow for service businesses across Australia and English-speaking export markets."
    >
      <div className="grid gap-4 md:grid-cols-3">
        {marketSizeRows.map((row) => (
          <div
            key={row.label}
            className="rounded-apple-large border border-apple-light/70 bg-apple-light/40 px-5 py-5"
          >
            <div className="text-[11px] font-semibold uppercase tracking-[0.13em] text-apple-blue">
              {row.label}
            </div>
            <div className="mt-3 text-4xl font-semibold tracking-[-0.05em] text-apple-near-black">
              {row.value}
            </div>
            <div className="mt-1 text-sm font-semibold text-apple-near-black/72">{row.market}</div>
            <p className="mt-2 text-sm leading-6 text-apple-near-black/60">{row.detail}</p>
          </div>
        ))}
      </div>
      <div className="mt-5 rounded-apple-large border border-apple-light/60 bg-apple-white px-5 py-5">
        <div className="text-[11px] font-semibold uppercase tracking-[0.13em] text-apple-blue">
          Bottom-up build · year 1 → year 5
        </div>
        <ul className="mt-4 space-y-3">
          {marketSizeBuildBlocks.map((block) => (
            <li
              key={block.kicker}
              className="flex flex-col gap-1 rounded-apple-comfortable border border-apple-light/60 bg-apple-light/30 px-4 py-3 sm:flex-row sm:items-baseline sm:gap-4"
            >
              <div className="shrink-0 text-[11px] font-semibold uppercase tracking-[0.13em] text-apple-blue">
                {block.kicker}
              </div>
              <div className="text-sm leading-6 text-apple-near-black/70">{block.line}</div>
            </li>
          ))}
        </ul>
      </div>
    </InvestorSlideShell>
  );
}

function CompetitiveMapSlide() {
  return (
    <InvestorSlideShell
      id="competitive-map"
      kicker="Alternatives"
      title="BookedAI sits between booking software, CRM, and AI assistants."
      subtitle="Generic schedulers stop at the calendar. CRMs need manual work. Chatbots often lose the booking context. BookedAI connects the page, intake, CRM, calendar, and follow-up around one customer journey."
    >
      <div className="grid gap-5 lg:grid-cols-[1.3fr_0.7fr] lg:items-start">
        <div
          className="relative rounded-apple-large border border-apple-light/70 bg-apple-light/30"
          style={{ aspectRatio: '4 / 3' }}
          role="img"
          aria-label="2x2 competitive map: vertical depth on horizontal axis, AI-native plus omnichannel on vertical axis"
        >
          {/* Quadrant grid lines */}
          <div className="absolute inset-0">
            <div className="absolute left-1/2 top-0 h-full w-px bg-apple-near-black/12" />
            <div className="absolute left-0 top-1/2 h-px w-full bg-apple-near-black/12" />
          </div>
          {/* Axis labels */}
          <div className="absolute left-3 top-3 text-xs font-semibold uppercase tracking-[0.16em] text-apple-near-black/56">
            High AI + omnichannel
          </div>
          <div className="absolute bottom-3 left-3 text-xs font-semibold uppercase tracking-[0.16em] text-apple-near-black/56">
            Low AI · single channel
          </div>
          <div className="absolute bottom-3 right-3 text-xs font-semibold uppercase tracking-[0.16em] text-apple-near-black/56">
            Vertical depth →
          </div>
          {/* Plotted competitors */}
          {competitorPlots.map((c) => {
            const isUs = c.name === 'BookedAI';
            return (
              <div
                key={c.name}
                className="absolute -translate-x-1/2 translate-y-1/2"
                style={{ left: `${c.vertical}%`, bottom: `${c.aiNative}%` }}
              >
                <div
                  className={
                    isUs
                      ? 'rounded-apple-pill border border-apple-blue bg-apple-blue px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.13em] text-apple-white shadow-apple-sm'
                      : 'rounded-apple-pill border border-apple-near-black/12 bg-apple-white px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.13em] text-apple-near-black/72'
                  }
                >
                  {c.name}
                </div>
                <div
                  className={`mt-1 text-center text-xs ${
                    isUs ? 'font-semibold text-apple-blue' : 'text-apple-near-black/56'
                  }`}
                >
                  {c.tag}
                </div>
              </div>
            );
          })}
        </div>
        <div className="space-y-3">
          {competitorPlots.map((c) => (
            <div
              key={`legend-${c.name}`}
              className={`rounded-apple-comfortable border px-4 py-3 ${
                c.name === 'BookedAI'
                  ? 'border-apple-blue/40 bg-apple-light'
                  : 'border-apple-light/70 bg-apple-white'
              }`}
            >
              <div
                className={`text-sm font-semibold ${
                  c.name === 'BookedAI' ? 'text-apple-blue' : 'text-apple-near-black'
                }`}
              >
                {c.name}
              </div>
              <div className="mt-1 text-[12px] text-apple-near-black/60">{c.tag}</div>
            </div>
          ))}
        </div>
      </div>
    </InvestorSlideShell>
  );
}

function DefensibilitySlide() {
  return (
    <InvestorSlideShell
      id="defensibility"
      kicker="Defensibility"
      title="Why BookedAI is built for service businesses, not generic chat."
      subtitle={defensibilityLede}
    >
      <div className="grid gap-4 md:grid-cols-3">
        {defensibilityCards.map((card) => (
          <div
            key={card.title}
            className="flex h-full flex-col rounded-apple-large border border-apple-light/70 bg-apple-light/30 px-5 py-5"
          >
            <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-apple-blue">
              {card.kicker}
            </div>
            <h3 className="mt-3 text-xl font-semibold tracking-[-0.03em] text-apple-near-black">
              {card.title}
            </h3>
            <p className="mt-3 flex-1 text-sm leading-6 text-apple-near-black/68">{card.body}</p>
          </div>
        ))}
      </div>
      <div className="mt-5 rounded-apple-large border border-apple-light/60 bg-apple-white px-5 py-4 text-sm leading-6 text-apple-near-black/72">
        Foundation models become commoditized inputs to the workflow; the moat lives in the
        configured service journeys, CRM history, integrations, and repeatable rollout playbook customers use every day.
      </div>
    </InvestorSlideShell>
  );
}

function UnitEconomicsSlide() {
  return (
    <InvestorSlideShell
      id="unit-economics"
      kicker="Commercial model"
      title="A$400 CAC, A$6,000 LTV, 75% gross margin, 6-month payback."
      subtitle="The Revenue Engine pricing structure is designed so each SME setup can pay for itself quickly, then expand as BookedAI captures or recovers more attributable bookings."
    >
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {unitEconomicsTiles.map((tile) => (
          <div
            key={tile.label}
            className="flex h-full flex-col rounded-apple-large border border-apple-light/70 bg-apple-light/30 px-5 py-5"
          >
            <div className="text-[11px] font-semibold uppercase tracking-[0.13em] text-apple-blue">
              {tile.label}
            </div>
            <div className="mt-3 text-4xl font-semibold tracking-[-0.05em] text-apple-near-black">
              {tile.value}
            </div>
            <p className="mt-3 flex-1 text-sm leading-6 text-apple-near-black/64">{tile.sub}</p>
          </div>
        ))}
      </div>
      <div className="mt-5 rounded-apple-large border border-apple-light/60 bg-apple-white px-5 py-4 text-sm leading-6 text-apple-near-black/72">
        {unitEconomicsContext}
      </div>
    </InvestorSlideShell>
  );
}

function LiveEvidenceSlide() {
  return (
    <InvestorSlideShell
      id="live-evidence"
      kicker="Live evidence"
      title="Customer message -> booking reference -> team follow-up, in under 30 seconds."
      subtitle="Three synchronized surfaces show the same booking event in real time: customer chat, booking portal, and business follow-up history."
    >
      <div className="grid gap-4 md:grid-cols-3">
        {liveEvidenceFrames.map((frame) => (
          <div
            key={frame.step}
            className="flex h-full flex-col rounded-apple-large border border-apple-light/70 bg-apple-light/30 p-4"
          >
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-apple-pill bg-apple-near-black text-[11px] font-bold text-apple-white">
                {frame.step}
              </div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.13em] text-apple-blue">
                {frame.surface}
              </div>
            </div>
            <h3 className="mt-3 text-base font-semibold tracking-[-0.02em] text-apple-near-black">
              {frame.title}
            </h3>
            <div className="mt-3 flex-1 space-y-2 rounded-apple-comfortable border border-apple-light/70 bg-apple-white p-3">
              {frame.conversation.map((line, idx) => (
                <div
                  key={`${frame.step}-${idx}`}
                  className={
                    line.from === 'customer'
                      ? 'ml-auto max-w-[88%] rounded-apple-comfortable bg-apple-blue px-3 py-2 text-[12px] leading-5 text-apple-white'
                      : line.from === 'agent'
                        ? 'max-w-[88%] rounded-apple-comfortable bg-apple-light px-3 py-2 text-[12px] leading-5 text-apple-near-black'
                        : 'rounded-apple-standard border border-apple-light/70 bg-apple-light/40 px-3 py-2 font-mono text-[11px] leading-5 text-apple-near-black/72'
                  }
                >
                  {line.text}
                </div>
              ))}
            </div>
            <p className="mt-3 text-[12px] leading-5 text-apple-near-black/60">{frame.caption}</p>
          </div>
        ))}
      </div>
    </InvestorSlideShell>
  );
}

function RevenueMilestonesSlide() {
  return (
    <InvestorSlideShell
      id="revenue-milestones"
      kicker="Rollout milestones"
      title="Each phase unlocks a specific revenue lever, not just a feature."
      subtitle="The roadmap ties launch work to commercial outcomes: live cases, payment status, outbound follow-up, templates, and repeatable setup for the next SME customer."
    >
      <div className="space-y-3">
        {revenuePhases.map((phase, idx) => (
          <div
            key={phase.phaseId}
            className="grid gap-3 rounded-apple-large border border-apple-light/70 bg-apple-light/30 px-5 py-4 md:grid-cols-[0.9fr_1fr_1.6fr] md:items-center"
          >
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.13em] text-apple-blue">
                {phase.phaseId} · {phase.date}
              </div>
              <div className="mt-2 text-lg font-semibold tracking-[-0.02em] text-apple-near-black">
                {phase.outcome}
              </div>
            </div>
            <div className="rounded-apple-comfortable border border-apple-light/70 bg-apple-white px-3 py-2">
              <div className="text-xs font-semibold uppercase tracking-[0.13em] text-apple-near-black/52">
                Milestone
              </div>
              <div className="mt-1 text-sm font-semibold text-apple-near-black">
                {phase.milestoneId}
              </div>
              <div className="mt-1 text-[12px] leading-5 text-apple-near-black/64">
                {phase.milestoneTitle}
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div
                className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${
                  idx === 0 ? 'bg-apple-success' : idx === revenuePhases.length - 1 ? 'bg-apple-blue' : 'bg-apple-near-black/40'
                }`}
                aria-hidden
              />
              <p className="text-sm leading-6 text-apple-near-black/68">{phase.revenueLine}</p>
            </div>
          </div>
        ))}
      </div>
    </InvestorSlideShell>
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
        startTrialLabel="Book Investor Demo"
        bookDemoLabel="Open Live Product"
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
                Investor and judge pitch · pitch.bookedai.au
              </SignalPill>

              <BrandLockup
                surface="light"
                className="items-start"
                logoClassName="booked-brand-image max-w-[16rem] sm:max-w-[20rem]"
                descriptorClassName="hidden"
                eyebrowClassName="hidden"
              />

              <h1 className="max-w-2xl text-4xl font-semibold tracking-[-0.06em] text-[#1d1d1f] sm:text-5xl lg:text-[3.4rem] lg:leading-[1.09]">
                BookedAI is the AI Revenue Engine for service businesses.
              </h1>

              <p className="max-w-xl text-base leading-8 text-black/60 sm:text-lg">
                We capture fragmented service enquiries across web, chat, messaging, email, and
                calls, then turn them into booking references, payment and follow-up status, and
                business-visible revenue evidence.
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
                  See live booking proof
                </a>
                <a
                  href="#market-size"
                  className="rounded-full border border-black/12 bg-white/80 px-6 py-3 text-sm font-semibold text-[#1d1d1f] transition hover:-translate-y-0.5"
                >
                  View investor deck
                </a>
                <button
                  type="button"
                  onClick={() => openRegisterInterest('hero', 'pitch_hero_free_setup')}
                  className="rounded-full border border-black/8 px-6 py-3 text-sm font-semibold text-black/52 transition hover:-translate-y-0.5"
                >
                  Join SME pilot
                </button>
                <a
                  href={architectureUrl}
                  className="rounded-full border border-black/8 bg-white/70 px-6 py-3 text-sm font-semibold text-black/62 transition hover:-translate-y-0.5"
                >
                  Open system map
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
                    <div className="mt-1 text-xs font-semibold uppercase tracking-[0.13em] text-black/44">
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
              Customers are ready to book, but slow replies, unclear qualification, and disconnected next steps
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
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-black/38">
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
                Close the gap between enquiry, booking, payment status, and follow-up.
              </h2>
              <p className="mt-4 text-sm leading-7 text-black/58 sm:text-base">
                The product gives every enquiry a fast first response, enough context to qualify fit,
                and a clear next step your team can trust.
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
                <div className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-black/38">
                  Revenue flow
                </div>
                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                  {flowSteps.map((step, index) => (
                    <div key={step} className="rounded-[1.35rem] border border-black/6 bg-white p-4 shadow-sm">
                      <div className="text-xs font-semibold uppercase tracking-[0.14em] text-black/36">
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
                    <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[#1d4ed8]">
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
            <SignalPill className="w-fit bg-sky-50 px-4 py-1.5 text-[11px] uppercase tracking-[0.16em] text-apple-blue">
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
                    <div className="text-xs font-semibold uppercase tracking-[0.16em] text-black/38">
                      {image.eyebrow}
                    </div>
                    <div className="mt-2 text-sm font-semibold leading-5 text-[#1d1d1f]">
                      {image.title}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 overflow-hidden rounded-[1.6rem] border border-black/6 bg-[#0f172a] p-3 shadow-[0_20px_56px_rgba(15,23,42,0.12)]">
              <img
                src={productProofImageUrl}
                alt="BookedAI product proof workspace screenshot"
                className="aspect-[1693/929] w-full rounded-[1.1rem] bg-white object-contain object-center"
                loading="lazy"
                width={1693}
                height={929}
              />
              <div className="px-2 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/62">
                Product proof · uploaded evidence
              </div>
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
                          className="rounded-[0.9rem] border border-black/6 bg-[#f8fbff] px-2 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-[#1d1d1f]"
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

      <SMESetupOverviewSection openRegisterInterest={openRegisterInterest} />

      <LaunchOfferSection openRegisterInterest={openRegisterInterest} />

      {/* ── 6. ARCHITECTURE ─────────────────────────────────────────── */}
      <PitchArchitectureFlowVisual />

      {/* ── 6.1 WHY NOW ─────────────────────────────────────────────── */}
      <WhyNowSlide />

      {/* ── 6.2 MARKET SIZE ─────────────────────────────────────────── */}
      <MarketSizeSlide />

      {/* ── 6.3 COMPETITIVE MAP ─────────────────────────────────────── */}
      <CompetitiveMapSlide />

      {/* ── 6.4 DEFENSIBILITY ───────────────────────────────────────── */}
      <DefensibilitySlide />

      {/* ── 6.5 UNIT ECONOMICS ──────────────────────────────────────── */}
      <UnitEconomicsSlide />

      {/* ── 6.6 LIVE EVIDENCE ───────────────────────────────────────── */}
      <LiveEvidenceSlide />

      {/* ── 6.7 ROADMAP → REVENUE MILESTONES ────────────────────────── */}
      <RevenueMilestonesSlide />

      {/* ── 6.8 ROADMAP & EXECUTION PLAN ────────────────────────────── */}
      <MasterRoadmapPitchSection />

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
                assistant. The demo stays light and explanation-first. Each link has a clear buyer job.
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
                  <div className="text-xs font-semibold uppercase tracking-[0.16em] text-black/40">
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
          {/* Team voices */}
          <SectionCard className="overflow-hidden bg-[linear-gradient(135deg,#ffffff_0%,#f6fbff_50%,#f0fdf4_100%)] px-6 py-6 sm:px-7 lg:px-8">
            <SignalPill className="w-fit border border-black/6 bg-white/72 px-4 py-1.5 text-[11px] uppercase tracking-[0.16em] text-[#1459c7]">
              Team voices
            </SignalPill>
            <h2 className="mt-5 text-2xl font-semibold tracking-[-0.04em] text-[#1d1d1f] sm:text-3xl">
              Built for service teams, not generic chatbot theatre.
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
                Built by business operators, engineers, and execution-minded founders
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
                      <div className="text-xs font-semibold uppercase tracking-[0.14em] text-black/40">
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
                          className="rounded-full bg-[#f3f6fb] px-3 py-1 text-xs font-semibold uppercase tracking-[0.1em] text-[#314155]"
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
                Move from pitch proof to pilot traction.
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
                Open the live product, review the system map, or join the SME pilot cohort that turns
                the launch package into repeatable go-to-market proof.
              </p>
            </div>
            <div className="flex min-w-0 flex-col gap-3 sm:flex-row md:justify-end">
              <a
                href={productUrl}
                className="rounded-full bg-white px-5 py-3 text-center text-sm font-semibold text-[#172033] transition hover:-translate-y-0.5 hover:bg-[#eef4f2]"
              >
                Open live product
              </a>
              <button
                type="button"
                onClick={() => openRegisterInterest('call_to_action', 'pitch_final_cta_sales')}
                className="rounded-full border border-white/16 bg-white/[0.08] px-5 py-3 text-center text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-white/[0.14]"
              >
                Join SME pilot
              </button>
            </div>
          </div>
        </SectionCard>
      </section>

      <Footer
        onStartTrial={() => openRegisterInterest('footer', 'pitch_footer_register')}
        onBookDemo={openProductDemo}
        startTrialLabel="Join SME Pilot"
        bookDemoLabel="Open Live Product"
        showBrandCopy={false}
        compact
      />
    </main>
  );
}
