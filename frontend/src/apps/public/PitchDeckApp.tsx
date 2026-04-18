import { useEffect, useMemo, useState } from 'react';

import { Footer } from '../../components/landing/Footer';
import { Header } from '../../components/landing/Header';
import {
  ctaContent,
  demoContent,
  flowSteps,
  heroContent,
  metrics,
  partnersSectionContent,
  pricingContent,
  problemCards,
  problemContent,
  proofContent,
  proofItems,
  showcaseImages,
  solutionCards,
  solutionContent,
  teamMembers,
  teamSectionContent,
  trustItems,
} from '../../components/landing/data';
import { BrandLockup } from '../../components/landing/ui/BrandLockup';
import { SectionCard } from '../../components/landing/ui/SectionCard';
import { SignalPill } from '../../components/landing/ui/SignalPill';
import {
  getHomepageContent,
  roadmapHref,
  type HomepageLocale,
} from './homepageContent';

const homeUrl = 'https://bookedai.au/';
const assistantUrl = 'https://bookedai.au/?assistant=open';
const demoUrl = 'https://bookedai.au/?demo=open';

const pitchNavItems = [
  { id: 'overview', label: 'Overview' },
  { id: 'problem', label: 'Problem' },
  { id: 'engine', label: 'Engine' },
  { id: 'proof', label: 'Proof' },
  { id: 'team-members', label: 'Team' },
  { id: 'pricing', label: 'Pricing' },
];

function VisualChip({ children, tone = 'light' }: { children: string; tone?: 'light' | 'dark' | 'brand' }) {
  const className =
    tone === 'dark'
      ? 'bg-[#1d1d1f] text-white'
      : tone === 'brand'
        ? 'bg-[#e7f4ff] text-[#1459c7]'
        : 'bg-white text-[#3c4043]';

  return (
    <div className={`rounded-full px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] ${className}`}>
      {children}
    </div>
  );
}

export function PitchDeckApp() {
  const [locale, setLocale] = useState<HomepageLocale>('en');
  const content = useMemo(() => getHomepageContent(locale), [locale]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const storedLocale = window.localStorage.getItem('bookedai.homepage.locale');
    if (storedLocale === 'en' || storedLocale === 'vi') {
      setLocale(storedLocale);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    window.localStorage.setItem('bookedai.homepage.locale', locale);
    document.documentElement.lang = locale;
  }, [locale]);

  function goToAssistant() {
    window.location.href = assistantUrl;
  }

  function goToDemo() {
    window.location.href = demoUrl;
  }

  const featuredDemo = demoContent.results[0];
  const proofStoryboard = [featuredDemo, demoContent.nearbyDiningSearch.result];

  return (
    <main className="relative overflow-hidden bg-[#f3f5f8] text-[#1d1d1f]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(34,197,94,0.12),transparent_24%),radial-gradient(circle_at_top_right,rgba(59,130,246,0.18),transparent_36%),linear-gradient(180deg,#f8fbff_0%,#eef2f7_50%,#f8fafc_100%)]" />

      <Header navItems={pitchNavItems} onStartTrial={goToAssistant} onBookDemo={goToDemo} />

      <section id="overview" className="relative mx-auto w-full max-w-7xl px-6 pt-6 lg:px-8 lg:pt-8">
        <SectionCard className="relative overflow-hidden border-0 bg-[linear-gradient(135deg,#0f172a_0%,#111827_38%,#163a72_100%)] px-6 py-6 text-white shadow-[0_40px_120px_rgba(15,23,42,0.26)] sm:px-8 sm:py-8 lg:px-10 lg:py-10">
          <div className="absolute -left-20 top-8 h-48 w-48 rounded-full bg-cyan-400/20 blur-3xl" />
          <div className="absolute right-0 top-0 h-full w-[44%] bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.22),transparent_42%)]" />
          <div className="absolute bottom-0 right-10 h-40 w-40 rounded-full bg-emerald-400/10 blur-3xl" />

          <div className="relative grid gap-6 xl:grid-cols-[1.15fr_0.85fr] xl:items-stretch">
            <div className="min-w-0">
              <SignalPill className="w-fit border border-white/15 bg-white/10 px-4 py-1.5 text-[11px] uppercase tracking-[0.16em] text-white">
                pitch.bookedai.au
              </SignalPill>

              <div className="mt-6 rounded-[2rem] border border-white/12 bg-white/8 p-5 backdrop-blur">
                <BrandLockup
                  surface="dark"
                  className="items-start"
                  logoClassName="booked-brand-image max-w-[17rem] sm:max-w-[22rem] lg:max-w-[28rem]"
                  descriptorClassName="hidden"
                  eyebrowClassName="hidden"
                />

                <h1 className="mt-8 max-w-4xl text-4xl font-semibold tracking-[-0.06em] text-white sm:text-5xl lg:text-7xl">
                  Capture demand. Rank intent. Convert it into booked revenue.
                </h1>
                <p className="mt-5 max-w-2xl text-base leading-8 text-white/72 sm:text-lg">
                  {heroContent.bodyLead}
                </p>

                <div className="mt-6 flex flex-wrap gap-2">
                  <VisualChip tone="brand">AI Revenue Engine</VisualChip>
                  <VisualChip tone="light">24/7 response</VisualChip>
                  <VisualChip tone="light">Booking-ready handoff</VisualChip>
                  <VisualChip tone="light">Service SME fit</VisualChip>
                </div>

                <div className="mt-8 flex flex-wrap gap-3">
                  <a
                    href={demoUrl}
                    className="rounded-full bg-white px-5 py-3 text-sm font-semibold text-[#101828] transition hover:-translate-y-0.5"
                  >
                    {ctaContent.secondaryCta}
                  </a>
                  <a
                    href={assistantUrl}
                    className="rounded-full border border-white/15 bg-white/8 px-5 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5"
                  >
                    {ctaContent.primaryCta}
                  </a>
                  <a
                    href={homeUrl}
                    className="rounded-full border border-white/12 px-5 py-3 text-sm font-semibold text-white/82 transition hover:-translate-y-0.5"
                  >
                    New home
                  </a>
                </div>
              </div>
            </div>

            <div className="grid gap-4">
              <SectionCard className="border border-white/10 bg-white/8 p-5 text-white backdrop-blur">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/56">
                    Revenue snapshot
                  </div>
                  <div className="rounded-full bg-emerald-400/18 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-100">
                    Visual-first
                  </div>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
                  {metrics.map((metric) => (
                    <div
                      key={metric.label}
                      className="rounded-[1.5rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.12)_0%,rgba(255,255,255,0.04)_100%)] px-4 py-4"
                    >
                      <div className="text-3xl font-semibold tracking-[-0.05em] text-white">{metric.value}</div>
                      <div className="mt-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/58">
                        {metric.label}
                      </div>
                    </div>
                  ))}
                </div>
              </SectionCard>

              <SectionCard className="border border-white/10 bg-white/8 p-5 text-white backdrop-blur">
                <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/56">
                  Revenue flow
                </div>
                <div className="mt-4 grid gap-3">
                  {flowSteps.map((step, index) => (
                    <div key={step} className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-[1.1rem] bg-white text-sm font-semibold text-[#0f172a]">
                        0{index + 1}
                      </div>
                      <div className="flex-1 rounded-[1.1rem] border border-white/10 bg-white/6 px-4 py-3 text-sm font-semibold text-white/88">
                        {step}
                      </div>
                    </div>
                  ))}
                </div>
              </SectionCard>

              <div className="grid gap-4 sm:grid-cols-2">
                {proofContent.channels.map((channel) => (
                  <div
                    key={channel}
                    className="rounded-[1.35rem] border border-white/10 bg-white/8 px-4 py-4 text-center text-[12px] font-semibold uppercase tracking-[0.16em] text-white/78 backdrop-blur"
                  >
                    {channel}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </SectionCard>
      </section>

      <section id="problem" className="mx-auto w-full max-w-7xl px-6 py-6 lg:px-8 lg:py-8">
        <div className="grid gap-5 xl:grid-cols-[0.82fr_1.18fr]">
          <SectionCard className="overflow-hidden px-6 py-6 sm:px-7 lg:px-8">
            <SignalPill className="w-fit bg-[#eef2ff] px-4 py-1.5 text-[11px] uppercase tracking-[0.16em] text-[#3248a8]">
              {problemContent.kicker}
            </SignalPill>
            <h2 className="mt-4 text-3xl font-semibold tracking-[-0.05em] text-[#1d1d1f] sm:text-4xl">
              {problemContent.title}
            </h2>
            <p className="mt-4 max-w-xl text-sm leading-7 text-black/60 sm:text-base">{problemContent.body}</p>

            <div className="mt-6 rounded-[1.7rem] bg-[linear-gradient(180deg,#fff6f1_0%,#ffffff_100%)] p-5">
              <div className="grid gap-3">
                {[
                  'Enquiry arrives',
                  'Slow reply',
                  'Weak qualification',
                  'No next step',
                  'Lead lost',
                ].map((item, index) => (
                  <div key={item} className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#1d1d1f] text-[11px] font-semibold text-white">
                      {index + 1}
                    </div>
                    <div className="flex-1 rounded-[1rem] border border-black/6 bg-white px-4 py-3 text-sm font-semibold text-[#1d1d1f]">
                      {item}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </SectionCard>

          <div className="grid gap-4 md:grid-cols-3">
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
                <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-black/40">Leak point</div>
                <div className="mt-6 h-28 rounded-[1.4rem] border border-black/6 bg-white/80 p-4">
                  <div className="flex h-full items-end gap-2">
                    {[40, 62, 86].map((height, barIndex) => (
                      <div
                        key={`${card.title}-${height}`}
                        className={`flex-1 rounded-t-[1rem] ${
                          barIndex === 2 ? 'bg-[#1d4ed8]' : 'bg-black/10'
                        }`}
                        style={{ height }}
                      />
                    ))}
                  </div>
                </div>
                <h3 className="mt-5 text-xl font-semibold tracking-[-0.03em] text-[#1d1d1f]">{card.title}</h3>
                <p className="mt-3 text-sm leading-6 text-black/62">{card.body}</p>
              </SectionCard>
            ))}
          </div>
        </div>
      </section>

      <section id="engine" className="mx-auto w-full max-w-7xl px-6 py-6 lg:px-8 lg:py-8">
        <SectionCard className="overflow-hidden px-6 py-6 sm:px-7 lg:px-8">
          <div className="grid gap-6 xl:grid-cols-[0.88fr_1.12fr]">
            <div>
              <SignalPill className="w-fit bg-[#ecfeff] px-4 py-1.5 text-[11px] uppercase tracking-[0.16em] text-[#0f766e]">
                {solutionContent.kicker}
              </SignalPill>
              <h2 className="mt-4 text-3xl font-semibold tracking-[-0.05em] text-[#1d1d1f] sm:text-4xl">
                {solutionContent.title}
              </h2>
              <p className="mt-4 max-w-xl text-sm leading-7 text-black/60 sm:text-base">{solutionContent.body}</p>

              <div className="mt-6 grid gap-3">
                {solutionCards.map((card, index) => (
                  <div
                    key={card.title}
                    className="rounded-[1.35rem] border border-black/6 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] px-4 py-4"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-[1rem] bg-[#1d1d1f] text-[11px] font-semibold text-white">
                        0{index + 1}
                      </div>
                      <div>
                        <div className="text-base font-semibold text-[#1d1d1f]">{card.title}</div>
                        <div className="mt-1 text-sm leading-6 text-black/60">{card.body}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-4">
              <div className="rounded-[2rem] bg-[linear-gradient(135deg,#eff6ff_0%,#ffffff_52%,#f0fdf4_100%)] p-5">
                <div className="grid gap-4 md:grid-cols-4">
                  {flowSteps.map((step, index) => (
                    <div key={step} className="relative">
                      <div className="rounded-[1.5rem] border border-black/6 bg-white p-4 shadow-[0_12px_30px_rgba(15,23,42,0.04)]">
                        <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-black/38">
                          Stage {index + 1}
                        </div>
                        <div className="mt-5 text-base font-semibold tracking-[-0.03em] text-[#1d1d1f]">{step}</div>
                      </div>
                      {index < flowSteps.length - 1 ? (
                        <div className="hidden md:block">
                          <div className="absolute right-[-12px] top-1/2 h-[2px] w-6 -translate-y-1/2 bg-[#1d4ed8]" />
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {proofItems.map((item) => (
                  <SectionCard key={item.title} className="h-full bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] p-5">
                    <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#1d4ed8]">
                      {item.eyebrow}
                    </div>
                    <h3 className="mt-4 text-xl font-semibold tracking-[-0.03em] text-[#1d1d1f]">{item.title}</h3>
                    <p className="mt-3 text-sm leading-6 text-black/60">{item.body}</p>
                  </SectionCard>
                ))}
              </div>
            </div>
          </div>
        </SectionCard>
      </section>

      <section id="proof" className="mx-auto w-full max-w-7xl px-6 py-6 lg:px-8 lg:py-8">
        <div className="grid gap-5 xl:grid-cols-[1.02fr_0.98fr]">
          <SectionCard className="overflow-hidden px-6 py-6 sm:px-7 lg:px-8">
            <SignalPill className="w-fit bg-[#f5f3ff] px-4 py-1.5 text-[11px] uppercase tracking-[0.16em] text-[#6d28d9]">
              Product proof
            </SignalPill>
            <h2 className="mt-4 text-3xl font-semibold tracking-[-0.05em] text-[#1d1d1f] sm:text-4xl">
              Search, shortlist, decision, booking. One premium visual flow.
            </h2>

            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              {showcaseImages.map((image) => (
                <div key={image.src} className="overflow-hidden rounded-[1.7rem] border border-black/6 bg-white">
                  <div className="aspect-[4/4.8] overflow-hidden">
                    <img src={image.src} alt={image.alt} className="h-full w-full object-cover" loading="lazy" />
                  </div>
                  <div className="p-4">
                    <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-black/40">
                      {image.eyebrow}
                    </div>
                    <div className="mt-2 text-sm font-semibold leading-6 text-[#1d1d1f]">{image.title}</div>
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>

          <div className="grid gap-4">
            {proofStoryboard.map((result, index) => (
              <SectionCard key={`${result.name}-${index}`} className="overflow-hidden p-0">
                <div className="grid gap-0 md:grid-cols-[0.95fr_1.05fr]">
                  <div className="aspect-[4/3] overflow-hidden bg-slate-100">
                    <img src={result.imageUrl} alt={result.name} className="h-full w-full object-cover" loading="lazy" />
                  </div>
                  <div className="p-5 lg:p-6">
                    <div className="flex flex-wrap items-center gap-2">
                      <VisualChip tone="brand">{index === 0 ? demoContent.topPickLabel : demoContent.nearbyDiningSearch.label}</VisualChip>
                      <VisualChip>{result.category}</VisualChip>
                    </div>
                    <h3 className="mt-4 text-2xl font-semibold tracking-[-0.04em] text-[#1d1d1f]">{result.name}</h3>
                    <p className="mt-3 text-sm leading-6 text-black/62">{result.summary}</p>

                    <div className="mt-5 grid gap-3 sm:grid-cols-3">
                      {[result.priceLabel, result.timingLabel, result.locationLabel].map((item) => (
                        <div
                          key={item}
                          className="rounded-[1rem] border border-black/6 bg-[linear-gradient(180deg,#f8fbff_0%,#ffffff_100%)] px-3 py-3 text-xs font-semibold uppercase tracking-[0.08em] text-[#1d1d1f]"
                        >
                          {item}
                        </div>
                      ))}
                    </div>

                    <div className="mt-5 rounded-[1.25rem] bg-[#1d1d1f] px-4 py-4 text-sm leading-6 text-white/82">
                      {result.bestFor}
                    </div>
                  </div>
                </div>
              </SectionCard>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-6 py-6 lg:px-8 lg:py-8">
        <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
          <SectionCard className="overflow-hidden bg-[linear-gradient(135deg,#0f172a_0%,#1e293b_50%,#0f766e_100%)] px-6 py-6 text-white sm:px-7 lg:px-8">
            <SignalPill className="w-fit border border-white/12 bg-white/10 px-4 py-1.5 text-[11px] uppercase tracking-[0.16em] text-white">
              Trust + fit
            </SignalPill>
            <h2 className="mt-4 text-3xl font-semibold tracking-[-0.05em] text-white sm:text-4xl">
              Built for service operators, not generic chatbot theatre.
            </h2>

            <div className="mt-6 grid gap-4">
              {trustItems.map((item) => (
                <div key={item.name} className="rounded-[1.5rem] border border-white/10 bg-white/8 p-4 backdrop-blur">
                  <div className="text-sm leading-7 text-white/84">“{item.quote}”</div>
                  <div className="mt-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/56">
                    {item.name} • {item.business}
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard className="px-6 py-6 sm:px-7 lg:px-8">
            <SignalPill className="w-fit bg-[#f0fdf4] px-4 py-1.5 text-[11px] uppercase tracking-[0.16em] text-[#15803d]">
              Partners story
            </SignalPill>
            <h2 className="mt-4 text-3xl font-semibold tracking-[-0.05em] text-[#1d1d1f] sm:text-4xl">
              {partnersSectionContent.title}
            </h2>

            <div className="mt-6 grid gap-4 md:grid-cols-3">
              {partnersSectionContent.stats.map((stat, index) => (
                <div
                  key={stat}
                  className={`rounded-[1.5rem] p-5 ${
                    index === 0
                      ? 'bg-[linear-gradient(180deg,#eef2ff_0%,#ffffff_100%)]'
                      : index === 1
                        ? 'bg-[linear-gradient(180deg,#ecfeff_0%,#ffffff_100%)]'
                        : 'bg-[linear-gradient(180deg,#f0fdf4_0%,#ffffff_100%)]'
                  }`}
                >
                  <div className="flex h-16 items-center justify-center rounded-[1.2rem] border border-black/6 bg-white text-[10px] font-semibold uppercase tracking-[0.16em] text-black/45">
                    Signal {index + 1}
                  </div>
                  <p className="mt-4 text-sm leading-6 text-black/68">{stat}</p>
                </div>
              ))}
            </div>
          </SectionCard>
        </div>
      </section>

      <section id="team-members" className="mx-auto w-full max-w-7xl px-6 py-6 lg:px-8 lg:py-8">
        <SectionCard className="overflow-hidden px-6 py-6 sm:px-7 lg:px-8">
          <div className="grid gap-6 xl:grid-cols-[0.72fr_1.28fr]">
            <div>
              <SignalPill className="w-fit bg-[#eef2ff] px-4 py-1.5 text-[11px] uppercase tracking-[0.16em] text-[#4338ca]">
                {teamSectionContent.kicker}
              </SignalPill>
              <h2 className="mt-4 text-3xl font-semibold tracking-[-0.05em] text-[#1d1d1f] sm:text-4xl">
                Built by operators, engineers, and execution-minded founders
              </h2>
              <p className="mt-4 max-w-xl text-sm leading-7 text-black/60 sm:text-base">{teamSectionContent.body}</p>

              <div className="mt-6 grid gap-3">
                {[
                  'Technical depth across backend, systems, AI, and product delivery.',
                  'Commercial, quality, and operational perspective from real service environments.',
                  'Founder-led execution focused on rollout, not demo-only AI theatre.',
                ].map((point) => (
                  <div key={point} className="rounded-[1.2rem] border border-black/6 bg-[linear-gradient(180deg,#f8fbff_0%,#ffffff_100%)] px-4 py-4 text-sm leading-6 text-black/70">
                    {point}
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {teamMembers.map((member) => (
                <SectionCard key={member.name} className="overflow-hidden p-0">
                  <div className="aspect-[4/4.2] overflow-hidden bg-slate-100">
                    <img src={member.imageSrc} alt={member.imageAlt} className="h-full w-full object-cover" loading="lazy" />
                  </div>
                  <div className="p-5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-black/42">{member.role}</div>
                      <VisualChip tone="brand">Core team</VisualChip>
                    </div>
                    <h3 className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-[#1d1d1f]">{member.name}</h3>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {member.badges?.map((badge) => (
                        <div
                          key={badge}
                          className="rounded-full bg-[#f3f6fb] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#314155]"
                        >
                          {badge}
                        </div>
                      ))}
                    </div>
                    <p className="mt-4 text-sm leading-6 text-black/62">{member.bio}</p>
                  </div>
                </SectionCard>
              ))}
            </div>
          </div>
        </SectionCard>
      </section>

      <section id="pricing" className="mx-auto w-full max-w-7xl px-6 py-6 lg:px-8 lg:py-8">
        <SectionCard className="overflow-hidden border-0 bg-[linear-gradient(135deg,#111827_0%,#0f172a_42%,#1d4ed8_100%)] px-6 py-6 text-white shadow-[0_32px_100px_rgba(15,23,42,0.22)] sm:px-7 lg:px-8">
          <div className="grid gap-6 xl:grid-cols-[0.84fr_1.16fr] xl:items-center">
            <div>
              <SignalPill className="w-fit border border-white/12 bg-white/10 px-4 py-1.5 text-[11px] uppercase tracking-[0.16em] text-white">
                {pricingContent.kicker}
              </SignalPill>
              <h2 className="mt-4 text-3xl font-semibold tracking-[-0.05em] text-white sm:text-4xl">
                {pricingContent.title}
              </h2>
              <div className="mt-8 rounded-[2rem] border border-white/12 bg-white/8 p-5 backdrop-blur">
                <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/58">
                  {pricingContent.planLabel}
                </div>
                <div className="mt-3 text-5xl font-semibold tracking-[-0.06em] text-white">{pricingContent.planPrice}</div>
                <div className="mt-2 text-sm text-white/62">{pricingContent.planCaption}</div>
              </div>
            </div>

            <div>
              <div className="grid gap-3 sm:grid-cols-2">
                {pricingContent.planFeatures.map((feature) => (
                  <div
                    key={feature}
                    className="rounded-[1.35rem] border border-white/12 bg-white/8 px-4 py-4 text-sm font-medium leading-6 text-white/84 backdrop-blur"
                  >
                    {feature}
                  </div>
                ))}
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <a
                  href={pricingContent.primaryHref}
                  className="rounded-full bg-white px-5 py-3 text-sm font-semibold text-[#111827] transition hover:-translate-y-0.5"
                >
                  {pricingContent.primaryCta}
                </a>
                <a
                  href={demoUrl}
                  className="rounded-full border border-white/15 bg-white/8 px-5 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5"
                >
                  {ctaContent.secondaryCta}
                </a>
              </div>
            </div>
          </div>
        </SectionCard>
      </section>

      <section className="mx-auto w-full max-w-7xl px-6 py-6 pb-10 lg:px-8 lg:pb-12">
        <SectionCard className="overflow-hidden px-6 py-6 sm:px-7 lg:px-8">
          <div className="grid gap-5 xl:grid-cols-[1.02fr_0.98fr] xl:items-center">
            <div>
              <SignalPill className="w-fit bg-[#eff6ff] px-4 py-1.5 text-[11px] uppercase tracking-[0.16em] text-[#1d4ed8]">
                {ctaContent.kicker}
              </SignalPill>
              <h2 className="mt-4 text-3xl font-semibold tracking-[-0.05em] text-[#1d1d1f] sm:text-4xl">
                Move from pitch to live revenue flow.
              </h2>
              <p className="mt-4 max-w-xl text-sm leading-7 text-black/60 sm:text-base">
                Proof, workflow, team, and rollout path are already visible. The next step is trial or demo.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              {[
                { label: 'Demo', href: demoUrl },
                { label: 'Trial', href: assistantUrl },
                { label: content.ui.roadmap, href: roadmapHref },
              ].map((item, index) => (
                <a
                  key={item.label}
                  href={item.href}
                  className={`rounded-[1.6rem] px-5 py-6 text-center text-sm font-semibold transition hover:-translate-y-0.5 ${
                    index === 0
                      ? 'bg-[#1d1d1f] text-white'
                      : index === 1
                        ? 'bg-[linear-gradient(180deg,#e7f4ff_0%,#ffffff_100%)] text-[#1459c7]'
                        : 'bg-[linear-gradient(180deg,#f3f4f6_0%,#ffffff_100%)] text-[#1d1d1f]'
                  }`}
                >
                  {item.label}
                </a>
              ))}
            </div>
          </div>
        </SectionCard>
      </section>

      <Footer onStartTrial={goToAssistant} onBookDemo={goToDemo} />
    </main>
  );
}
