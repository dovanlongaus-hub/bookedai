import {
  ArrowRight,
  Bot,
  CalendarCheck2,
  DatabaseZap,
  Gauge,
  Globe2,
  LockKeyhole,
  MessageSquareText,
  Network,
  ShieldCheck,
  Workflow,
} from 'lucide-react';
import { useEffect } from 'react';

import { brandUploadedLogoPath } from '../../components/landing/data';

const productUrl = 'https://product.bookedai.au/';
const pitchUrl = 'https://pitch.bookedai.au/';
const registerUrl =
  '/register-interest?source_section=architecture&source_cta=start_free_trial&source_detail=architecture_showcase&offer=launch10&deployment=standalone_website&setup=online';

const architectureStats = [
  ['5', 'live surfaces', 'home, product, pitch, tenant, portal'],
  ['3', 'agent loops', 'capture, operate, care'],
  ['1', 'ops ledger', 'auditable revenue workflow'],
] as const;

const lanes = [
  {
    title: 'Demand surfaces',
    label: 'Acquire',
    tone: 'from-sky-50 to-white',
    accent: 'bg-sky-500',
    items: ['Homepage', 'Product app', 'Widget', 'WhatsApp', 'Portal return'],
  },
  {
    title: 'AI orchestration',
    label: 'Qualify',
    tone: 'from-violet-50 to-white',
    accent: 'bg-violet-500',
    items: ['Intent capture', 'Best-fit matching', 'Care answers', 'Revenue prompts', 'Policy checks'],
  },
  {
    title: 'Revenue core',
    label: 'Convert',
    tone: 'from-emerald-50 to-white',
    accent: 'bg-emerald-500',
    items: ['Booking intent', 'Payment posture', 'QR portal', 'Email/calendar', 'CRM handoff'],
  },
  {
    title: 'Control plane',
    label: 'Operate',
    tone: 'from-amber-50 to-white',
    accent: 'bg-amber-500',
    items: ['Tenant Ops', 'Admin Reliability', 'Action ledger', 'Support queue', 'Audit trail'],
  },
] as const;

const capabilityCards = [
  {
    icon: Globe2,
    title: 'Customer-facing acquisition',
    body: 'Every public surface is designed to move a buyer from natural-language intent into an accountable next step.',
  },
  {
    icon: Bot,
    title: 'Agentic booking layer',
    body: 'The assistant does not stop at chat. It qualifies, shortlists, routes, confirms, and keeps context for care.',
  },
  {
    icon: DatabaseZap,
    title: 'Operational truth model',
    body: 'Bookings, payment posture, support state, CRM handoff, and agent actions remain visible to operators.',
  },
  {
    icon: ShieldCheck,
    title: 'Enterprise governance',
    body: 'Policy-gated automation, audit records, tenant boundaries, and manual-review fallbacks are first-class surfaces.',
  },
] as const;

const proofImages = [
  {
    src: '/branding/optimized/chess-screen-proof-1400.webp',
    srcSet:
      '/branding/optimized/chess-screen-proof-960.webp 960w, /branding/optimized/chess-screen-proof-1400.webp 1400w',
    title: 'Customer booking proof',
    body: 'Grandmaster Chess shows search, service fit, booking posture, portal follow-up, and visible revenue evidence.',
  },
  {
    src: '/branding/optimized/tenant-login-hero-1400.webp',
    srcSet:
      '/branding/optimized/tenant-login-hero-960.webp 960w, /branding/optimized/tenant-login-hero-1400.webp 1400w',
    title: 'Tenant operations proof',
    body: 'The tenant gateway and workspace demonstrate how operators inherit booking context instead of raw chat noise.',
  },
] as const;

const enterpriseRows = [
  ['Reliability', 'Health checks, route visibility, policy outcomes, and manual-review posture are visible in admin tools.'],
  ['Security boundary', 'Tenant, portal, and admin surfaces stay separated while sharing booking references and audit context.'],
  ['Integration posture', 'Email, calendar, CRM, payment posture, WhatsApp, and workflow automation are modeled as recoverable rails.'],
  ['Scale pattern', 'A single vertical proof can become a reusable tenant template without rewriting the customer journey.'],
] as const;

function TopNav() {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/86 px-4 py-3 backdrop-blur-xl sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
        <a href="/" className="flex min-w-0 items-center gap-3">
          <img
            src={brandUploadedLogoPath}
            alt="BookedAI"
            className="h-10 w-[10.5rem] max-w-[calc(100vw-13rem)] object-cover object-center sm:w-[12rem]"
          />
        </a>
        <nav className="hidden items-center gap-2 md:flex" aria-label="Architecture navigation">
          {[
            ['Pitch', pitchUrl],
            ['Product', productUrl],
            ['Roadmap', '/roadmap'],
          ].map(([label, href]) => (
            <a
              key={href}
              href={href}
              className="rounded-full px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-slate-950"
            >
              {label}
            </a>
          ))}
          <a
            href={registerUrl}
            className="rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:-translate-y-0.5"
          >
            Talk to Sales
          </a>
        </nav>
      </div>
    </header>
  );
}

function ArchitectureHeroDiagram() {
  return (
    <figure
      aria-label="BookedAI architecture image showing demand surfaces, AI orchestration, revenue core, and control plane"
      className="relative overflow-hidden rounded-[2rem] border border-white/80 bg-white p-4 shadow-[0_32px_90px_rgba(15,23,42,0.12)] sm:p-5"
    >
      <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(239,246,255,0.92),rgba(255,255,255,0.55)_42%,rgba(236,253,245,0.76))]" />
      <div className="relative">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">
              Architecture image
            </div>
            <figcaption className="mt-1 text-xl font-semibold tracking-[-0.04em] text-slate-950">
              Revenue engine control map
            </figcaption>
          </div>
          <div className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-600">
            Live system
          </div>
        </div>

        <div className="grid gap-3 lg:grid-cols-[1fr_1.08fr_1fr]">
          <div className="grid gap-3">
            {['Web', 'Product', 'WhatsApp', 'Portal'].map((item, index) => (
              <div key={item} className="rounded-[1.15rem] border border-sky-100 bg-sky-50 px-4 py-3">
                <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-sky-600">
                  Surface {index + 1}
                </div>
                <div className="mt-1 text-sm font-semibold text-slate-950">{item}</div>
              </div>
            ))}
          </div>

          <div className="relative flex min-h-[24rem] items-center justify-center rounded-[1.65rem] border border-slate-200 bg-slate-950 p-5 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]">
            <div className="absolute inset-x-5 top-5 flex items-center justify-between text-[10px] font-semibold uppercase tracking-[0.16em] text-white/48">
              <span>Intent</span>
              <span>Policy</span>
            </div>
            <div className="absolute inset-y-16 left-1/2 w-px -translate-x-1/2 bg-white/10" />
            <div className="absolute left-7 right-7 top-1/2 h-px -translate-y-1/2 bg-white/10" />
            <div className="relative grid h-52 w-52 place-items-center rounded-full border border-white/14 bg-[radial-gradient(circle_at_35%_30%,rgba(125,211,252,0.42),transparent_38%),radial-gradient(circle_at_70%_72%,rgba(52,211,153,0.34),transparent_42%),rgba(255,255,255,0.06)] p-6 text-center">
              <Network className="mx-auto h-8 w-8 text-cyan-200" strokeWidth={1.8} />
              <div className="mt-3 text-2xl font-semibold tracking-[-0.06em]">BookedAI</div>
              <div className="mt-2 text-xs leading-5 text-white/62">
                agent orchestration, booking state, and revenue operations
              </div>
            </div>
            {[
              ['AI', 'left-5 top-20'],
              ['Ops', 'right-5 top-20'],
              ['Care', 'left-5 bottom-20'],
              ['Ledger', 'right-5 bottom-20'],
            ].map(([label, cls]) => (
              <div
                key={label}
                className={`absolute ${cls} rounded-full border border-white/12 bg-white/8 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/70`}
              >
                {label}
              </div>
            ))}
          </div>

          <div className="grid gap-3">
            {['Booking intent', 'Payment posture', 'Tenant Ops', 'Audit ledger'].map((item, index) => (
              <div key={item} className="rounded-[1.15rem] border border-emerald-100 bg-emerald-50 px-4 py-3">
                <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-700">
                  System {index + 1}
                </div>
                <div className="mt-1 text-sm font-semibold text-slate-950">{item}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </figure>
  );
}

function LaneMap() {
  return (
    <section id="system-map" className="px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="max-w-3xl">
          <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-sky-700">
            System architecture
          </div>
          <h2 className="mt-4 text-3xl font-semibold tracking-[-0.055em] text-slate-950 sm:text-5xl">
            A board-level map that still exposes the real operating system.
          </h2>
        </div>

        <div className="mt-8 grid gap-4 lg:grid-cols-4">
          {lanes.map((lane) => (
            <article
              key={lane.title}
              className={`rounded-[1.65rem] border border-slate-200 bg-gradient-to-br ${lane.tone} p-5 shadow-[0_18px_45px_rgba(15,23,42,0.05)]`}
            >
              <div className="flex items-center justify-between gap-3">
                <div className={`h-3 w-3 rounded-full ${lane.accent}`} />
                <div className="rounded-full bg-white px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-600">
                  {lane.label}
                </div>
              </div>
              <h3 className="mt-5 text-xl font-semibold tracking-[-0.04em] text-slate-950">
                {lane.title}
              </h3>
              <div className="mt-5 grid gap-2">
                {lane.items.map((item) => (
                  <div
                    key={item}
                    className="rounded-full border border-slate-200/80 bg-white/86 px-3 py-2 text-xs font-semibold text-slate-650"
                  >
                    {item}
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export function ArchitectureApp() {
  useEffect(() => {
    document.title = 'BookedAI Architecture | Revenue Engine System Design';
  }, []);

  return (
    <main className="min-h-screen overflow-hidden bg-[#f7f9fc] text-slate-950">
      <TopNav />

      <section id="top" className="px-4 pb-10 pt-8 sm:px-6 lg:px-8 lg:pb-16 lg:pt-12">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.88fr_1.12fr] lg:items-center">
          <div>
            <div className="inline-flex rounded-full border border-slate-200 bg-white px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-600 shadow-sm">
              BookedAI architecture showcase
            </div>
            <h1 className="mt-6 max-w-3xl text-5xl font-semibold tracking-[-0.07em] text-slate-950 sm:text-6xl lg:text-7xl">
              Big-tech clarity for a revenue engine built around bookings.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
              This page shows the design capability behind BookedAI: customer acquisition surfaces,
              AI orchestration, booking contracts, operations truth, and enterprise control loops in
              one visual system.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href={productUrl}
                className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5"
              >
                Open live product <ArrowRight className="h-4 w-4" />
              </a>
              <a
                href={registerUrl}
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:-translate-y-0.5"
              >
                Talk to Sales
              </a>
            </div>

            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              {architectureStats.map(([value, label, detail]) => (
                <div key={label} className="rounded-[1.35rem] border border-slate-200 bg-white px-4 py-4">
                  <div className="text-3xl font-semibold tracking-[-0.05em] text-slate-950">{value}</div>
                  <div className="mt-1 text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-500">
                    {label}
                  </div>
                  <div className="mt-2 text-xs leading-5 text-slate-500">{detail}</div>
                </div>
              ))}
            </div>
          </div>

          <ArchitectureHeroDiagram />
        </div>
      </section>

      <LaneMap />

      <section id="capability" className="border-y border-slate-200 bg-white px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-700">
                Design capability
              </div>
              <h2 className="mt-4 text-3xl font-semibold tracking-[-0.055em] text-slate-950 sm:text-5xl">
                The interface shows the architecture instead of hiding it in a PDF.
              </h2>
              <p className="mt-5 text-base leading-8 text-slate-600">
                Every visual is designed to make a technical buyer feel the team understands product,
                operations, reliability, and commercial motion as one connected system.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {capabilityCards.map((card) => {
                const Icon = card.icon;
                return (
                  <article key={card.title} className="rounded-[1.55rem] border border-slate-200 bg-[#f8fafc] p-5">
                    <div className="flex h-11 w-11 items-center justify-center rounded-[1rem] bg-slate-950 text-white">
                      <Icon className="h-5 w-5" strokeWidth={1.9} />
                    </div>
                    <h3 className="mt-5 text-lg font-semibold tracking-[-0.035em] text-slate-950">
                      {card.title}
                    </h3>
                    <p className="mt-3 text-sm leading-6 text-slate-600">{card.body}</p>
                  </article>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <section id="proof" className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-violet-700">
                Visual proof
              </div>
              <h2 className="mt-4 max-w-3xl text-3xl font-semibold tracking-[-0.055em] text-slate-950 sm:text-5xl">
                Real product surfaces back the diagram.
              </h2>
            </div>
            <a
              href={pitchUrl}
              className="inline-flex w-fit items-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:-translate-y-0.5"
            >
              Return to pitch <ArrowRight className="h-4 w-4" />
            </a>
          </div>

          <div className="mt-8 grid gap-5 lg:grid-cols-2">
            {proofImages.map((image) => (
              <article key={image.title} className="overflow-hidden rounded-[1.8rem] border border-slate-200 bg-white shadow-[0_22px_60px_rgba(15,23,42,0.08)]">
                <img
                  src={image.src}
                  srcSet={image.srcSet}
                  sizes="(min-width: 1024px) 44vw, calc(100vw - 2rem)"
                  alt={image.title}
                  className="aspect-[16/10] w-full object-cover object-top"
                  loading="eager"
                />
                <div className="p-5">
                  <h3 className="text-xl font-semibold tracking-[-0.04em] text-slate-950">{image.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{image.body}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="enterprise" className="bg-slate-950 px-4 py-16 text-white sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
          <div>
            <div className="inline-flex rounded-full border border-white/12 bg-white/8 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-cyan-100">
              Enterprise posture
            </div>
            <h2 className="mt-5 text-3xl font-semibold tracking-[-0.055em] sm:text-5xl">
              Built to look calm when the workflow gets complex.
            </h2>
            <div className="mt-7 grid gap-3 sm:grid-cols-2">
              {[
                [MessageSquareText, 'Customer turn'],
                [CalendarCheck2, 'Booking contract'],
                [Workflow, 'Ops automation'],
                [LockKeyhole, 'Governance'],
                [Gauge, 'Reliability'],
                [DatabaseZap, 'Ledger truth'],
              ].map(([Icon, label]) => {
                const TypedIcon = Icon as typeof MessageSquareText;
                return (
                  <div key={label as string} className="rounded-[1.25rem] border border-white/10 bg-white/7 px-4 py-3">
                    <TypedIcon className="h-5 w-5 text-cyan-200" strokeWidth={1.8} />
                    <div className="mt-3 text-sm font-semibold">{label as string}</div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="grid gap-3">
            {enterpriseRows.map(([title, body]) => (
              <article key={title} className="rounded-[1.35rem] border border-white/10 bg-white/7 p-5">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-200">
                  {title}
                </div>
                <p className="mt-2 text-sm leading-7 text-slate-300">{body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-5 rounded-[1.8rem] border border-slate-200 bg-white p-6 shadow-[0_22px_60px_rgba(15,23,42,0.06)] md:flex-row md:items-center">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
              Next step
            </div>
            <h2 className="mt-2 text-2xl font-semibold tracking-[-0.045em] text-slate-950">
              Review the architecture, then test the product flow live.
            </h2>
          </div>
          <div className="flex flex-wrap gap-3">
            <a href={productUrl} className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white">
              Open live product
            </a>
            <a href={registerUrl} className="rounded-full border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-950">
              Talk to Sales
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
