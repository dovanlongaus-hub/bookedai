import type { ProofContent, ProofItem } from '../data';
import { SectionCard } from '../ui/SectionCard';
import { SectionHeading } from '../ui/SectionHeading';
import { SectionShell } from '../ui/SectionShell';
import { SignalPill } from '../ui/SignalPill';

type ProductProofSectionProps = {
  content: ProofContent;
  items: ProofItem[];
  onStartTrial?: () => void;
  onBookDemo?: () => void;
};

const investorSignals = [
  {
    label: 'What investors should see',
    title: 'A revenue system, not a single assistant surface',
    body: 'BookedAI connects demand capture, AI qualification, booking control, and follow-up into one operating layer.',
    tone: 'border-sky-200 bg-[linear-gradient(180deg,#eef6ff_0%,#ffffff_100%)]',
    accent: 'text-sky-700',
  },
  {
    label: 'What SMEs should see',
    title: 'A simple path from enquiry to booking',
    body: 'The buyer gets a fast, visible next step while the business gains control over timing, fit, and follow-up.',
    tone: 'border-emerald-200 bg-[linear-gradient(180deg,#effcf5_0%,#ffffff_100%)]',
    accent: 'text-emerald-700',
  },
];

const solutionJourney = [
  {
    step: '01',
    title: 'Demand enters one lane',
    body: 'Website, demo, search, and chat all start from the same customer intent instead of splitting into disconnected touchpoints.',
    chips: ['Homepage', 'Product trial', 'Search chat'],
    tone: 'from-[#eef6ff] to-white',
  },
  {
    step: '02',
    title: 'BookedAI structures the request',
    body: 'The platform qualifies the need, timing, and fit so the shortlist is visible and commercially useful.',
    chips: ['Intent', 'Qualification', 'Shortlist'],
    tone: 'from-[#eef4ff] to-white',
  },
  {
    step: '03',
    title: 'The best option moves forward',
    body: 'Tenant and service context stay attached so the booking handoff does not lose momentum or business meaning.',
    chips: ['Tenant context', 'Service match', 'Trust signals'],
    tone: 'from-[#f0fdf4] to-white',
  },
  {
    step: '04',
    title: 'Booking and follow-up stay connected',
    body: 'Payment, portal, notifications, and operator workflow continue in one path instead of turning into manual cleanup.',
    chips: ['Payment', 'Portal', 'Follow-up'],
    tone: 'from-[#fff7ed] to-white',
  },
];

const operatorOutcomes = [
  {
    title: 'For SMEs',
    body: 'Easy to explain, easy to launch, and easier to trust because the path from enquiry to booking is visible.',
    chips: ['Lower friction', 'Faster conversion', 'Less manual follow-up'],
  },
  {
    title: 'For operators',
    body: 'Teams can see what is happening, what is qualified, and what needs intervention without digging through fragmented tools.',
    chips: ['Visible state', 'Role-safe control', 'Operational clarity'],
  },
  {
    title: 'For investors',
    body: 'The platform reads as a scalable operating model with real surfaces, a real workflow plane, and a clear revenue narrative.',
    chips: ['System depth', 'Commercial logic', 'Scale posture'],
  },
];

const infographicBadges = [
  'Intent captured',
  'Match qualified',
  'Booking ready',
  'Ops tracked',
];

function SolutionJourneyCard({
  step,
  title,
  body,
  chips,
  tone,
}: {
  step: string;
  title: string;
  body: string;
  chips: string[];
  tone: string;
}) {
  return (
    <div
      className={`rounded-[1.6rem] border border-black/6 bg-gradient-to-br ${tone} p-5 shadow-[0_14px_34px_rgba(15,23,42,0.05)] transition duration-200 hover:-translate-y-0.5`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="rounded-full bg-slate-950 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white">
          Step {step}
        </div>
        <div className="h-2.5 w-2.5 rounded-full bg-[#1d4ed8]" />
      </div>
      <h3 className="mt-4 font-['Space_Grotesk'] text-[1.35rem] font-semibold tracking-[-0.04em] text-slate-950 sm:text-[1.45rem]">
        {title}
      </h3>
      <p className="mt-3 text-sm leading-6 text-slate-600 sm:leading-7">{body}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {chips.map((chip) => (
          <div
            key={chip}
            className="rounded-full border border-black/6 bg-white/92 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-600"
          >
            {chip}
          </div>
        ))}
      </div>
    </div>
  );
}

function SolutionInfographic() {
  return (
    <SectionCard className="overflow-hidden rounded-[2rem] border border-black/6 bg-[linear-gradient(180deg,#ffffff_0%,#f7fbff_100%)] p-5 shadow-[0_20px_56px_rgba(15,23,42,0.05)]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            Visual solution map
          </div>
          <h3 className="mt-2 font-['Space_Grotesk'] text-[2rem] font-semibold tracking-[-0.05em] text-slate-950">
            From customer intent to revenue workflow in one image
          </h3>
        </div>
        <SignalPill className="bg-slate-950 px-3 py-1 text-[10px] uppercase tracking-[0.16em] text-white">
          Investor + SME ready
        </SignalPill>
      </div>

      <div className="mt-5 rounded-[1.7rem] border border-black/6 bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.10),transparent_24%),linear-gradient(180deg,#fdfefe_0%,#f3f8ff_100%)] p-3 sm:p-4">
        <svg
          viewBox="0 0 1240 760"
          role="img"
          aria-label="BookedAI solution overview from demand capture through AI qualification, booking handoff, and operator workflow"
          className="h-auto w-full"
        >
          <defs>
            <linearGradient id="solution-bg" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="100%" stopColor="#eef6ff" />
            </linearGradient>
            <linearGradient id="solution-center" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#0f172a" />
              <stop offset="100%" stopColor="#1d4ed8" />
            </linearGradient>
            <linearGradient id="solution-acquire" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#eff6ff" />
              <stop offset="100%" stopColor="#ffffff" />
            </linearGradient>
            <linearGradient id="solution-operate" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ecfdf5" />
              <stop offset="100%" stopColor="#ffffff" />
            </linearGradient>
            <linearGradient id="solution-foundation" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fff7ed" />
              <stop offset="100%" stopColor="#ffffff" />
            </linearGradient>
            <marker id="arrow-sky" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto">
              <path d="M0,0 L10,5 L0,10" fill="none" stroke="#60a5fa" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </marker>
            <marker id="arrow-emerald" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto">
              <path d="M0,0 L10,5 L0,10" fill="none" stroke="#34d399" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </marker>
            <marker id="arrow-amber" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto">
              <path d="M0,0 L10,5 L0,10" fill="none" stroke="#fb923c" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </marker>
          </defs>

          <rect x="10" y="10" width="1220" height="740" rx="34" fill="url(#solution-bg)" stroke="rgba(15,23,42,0.08)" />

          <text x="68" y="68" fill="#64748b" fontSize="15" fontWeight="700" letterSpacing="2.8">FLOW 1 · ACQUIRE</text>
          <rect x="58" y="86" width="1124" height="184" rx="30" fill="url(#solution-acquire)" stroke="rgba(96,165,250,0.18)" />

          <rect x="88" y="124" width="220" height="108" rx="24" fill="#ffffff" stroke="#bfdbfe" />
          <circle cx="122" cy="158" r="18" fill="#e0f2fe" />
          <path d="M112 158h20M122 148v20" stroke="#0284c7" strokeWidth="2.4" strokeLinecap="round" />
          <text x="152" y="150" fill="#0f172a" fontSize="24" fontWeight="700">Demand capture</text>
          <text x="152" y="180" fill="#475569" fontSize="16">Homepage, demo, search,</text>
          <text x="152" y="202" fill="#475569" fontSize="16">chat, mobile entry</text>

          <rect x="364" y="108" width="512" height="140" rx="30" fill="url(#solution-center)" />
          <text x="400" y="146" fill="#bfdbfe" fontSize="15" fontWeight="700" letterSpacing="2.8">BOOKEDAI REVENUE ENGINE</text>
          <text x="400" y="186" fill="#ffffff" fontSize="31" fontWeight="700">Qualify, rank, and route the request</text>
          <rect x="400" y="204" width="104" height="30" rx="15" fill="rgba(255,255,255,0.12)" />
          <rect x="514" y="204" width="132" height="30" rx="15" fill="rgba(255,255,255,0.12)" />
          <rect x="656" y="204" width="118" height="30" rx="15" fill="rgba(255,255,255,0.12)" />
          <text x="428" y="224" fill="#ffffff" fontSize="13" fontWeight="700">Intent</text>
          <text x="545" y="224" fill="#ffffff" fontSize="13" fontWeight="700">Qualification</text>
          <text x="689" y="224" fill="#ffffff" fontSize="13" fontWeight="700">Trust + fit</text>

          <rect x="932" y="124" width="220" height="108" rx="24" fill="#ffffff" stroke="#a7f3d0" />
          <circle cx="966" cy="158" r="18" fill="#dcfce7" />
          <path d="M956 158h20M962 166l14-16" stroke="#059669" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
          <text x="996" y="150" fill="#0f172a" fontSize="24" fontWeight="700">Booking handoff</text>
          <text x="996" y="180" fill="#475569" fontSize="16">Tenant selected, payment,</text>
          <text x="996" y="202" fill="#475569" fontSize="16">portal, follow-up ready</text>

          <path d="M308 178H364" stroke="#60a5fa" strokeWidth="3.5" strokeLinecap="round" markerEnd="url(#arrow-sky)" />
          <path d="M876 178H932" stroke="#34d399" strokeWidth="3.5" strokeLinecap="round" markerEnd="url(#arrow-emerald)" />

          <text x="68" y="328" fill="#64748b" fontSize="15" fontWeight="700" letterSpacing="2.8">FLOW 2 · OPERATE</text>
          <rect x="58" y="346" width="1124" height="190" rx="30" fill="url(#solution-operate)" stroke="rgba(52,211,153,0.18)" />
          <rect x="88" y="384" width="300" height="116" rx="24" fill="#ffffff" stroke="rgba(15,23,42,0.08)" />
          <text x="118" y="422" fill="#047857" fontSize="14" fontWeight="700" letterSpacing="2.2">VISIBLE WORKSPACES</text>
          <text x="118" y="456" fill="#0f172a" fontSize="25" fontWeight="700">Tenant, admin, support</text>
          <text x="118" y="484" fill="#475569" fontSize="16">Every role works from the same</text>
          <text x="118" y="506" fill="#475569" fontSize="16">revenue state, not scattered tools.</text>

          <rect x="454" y="386" width="144" height="44" rx="22" fill="#ecfeff" stroke="#a5f3fc" />
          <rect x="620" y="386" width="144" height="44" rx="22" fill="#eef6ff" stroke="#bfdbfe" />
          <rect x="786" y="386" width="146" height="44" rx="22" fill="#f0fdf4" stroke="#bbf7d0" />
          <text x="489" y="414" fill="#0f172a" fontSize="14" fontWeight="700">Review queues</text>
          <text x="656" y="414" fill="#0f172a" fontSize="14" fontWeight="700">Booking state</text>
          <text x="819" y="414" fill="#0f172a" fontSize="14" fontWeight="700">Follow-up rules</text>

          <rect x="454" y="448" width="478" height="52" rx="18" fill="#ffffff" stroke="rgba(15,23,42,0.08)" />
          <text x="484" y="480" fill="#475569" fontSize="16">Operators see qualification, conversion risk, and next actions in one shared operating lane.</text>
          <path d="M388 442H442" stroke="#34d399" strokeWidth="3.2" strokeLinecap="round" markerEnd="url(#arrow-emerald)" />

          <text x="68" y="594" fill="#64748b" fontSize="15" fontWeight="700" letterSpacing="2.8">FLOW 3 · RUN THE SYSTEM</text>
          <rect x="58" y="612" width="1124" height="100" rx="30" fill="url(#solution-foundation)" stroke="rgba(251,146,60,0.22)" />
          <rect x="92" y="640" width="166" height="42" rx="21" fill="#ffffff" stroke="#fed7aa" />
          <rect x="276" y="640" width="168" height="42" rx="21" fill="#ffffff" stroke="#fed7aa" />
          <rect x="462" y="640" width="134" height="42" rx="21" fill="#ffffff" stroke="#fed7aa" />
          <rect x="614" y="640" width="150" height="42" rx="21" fill="#ffffff" stroke="#fed7aa" />
          <rect x="782" y="640" width="150" height="42" rx="21" fill="#ffffff" stroke="#fed7aa" />
          <rect x="950" y="640" width="198" height="42" rx="21" fill="#ffffff" stroke="#fed7aa" />
          <text x="130" y="667" fill="#9a3412" fontSize="14" fontWeight="700">FastAPI</text>
          <text x="328" y="667" fill="#9a3412" fontSize="14" fontWeight="700">Supabase</text>
          <text x="506" y="667" fill="#9a3412" fontSize="14" fontWeight="700">n8n</text>
          <text x="657" y="667" fill="#9a3412" fontSize="14" fontWeight="700">OpenAI</text>
          <text x="827" y="667" fill="#9a3412" fontSize="14" fontWeight="700">Messaging</text>
          <text x="997" y="667" fill="#9a3412" fontSize="14" fontWeight="700">Cloud delivery + telemetry</text>

          <path d="M620 536V612" stroke="#fb923c" strokeWidth="3.2" strokeLinecap="round" markerEnd="url(#arrow-amber)" />
        </svg>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {infographicBadges.map((badge) => (
          <div
            key={badge}
            className="rounded-full border border-black/6 bg-white px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-600"
          >
            {badge}
          </div>
        ))}
      </div>
    </SectionCard>
  );
}

export function ProductProofSection({
  content,
  items,
  onStartTrial,
  onBookDemo,
}: ProductProofSectionProps) {
  return (
    <SectionShell id="product-proof" className="py-10 lg:py-12">
      <SectionCard className="relative overflow-hidden border border-black/6 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_62%,#fbfdff_100%)] p-6 shadow-[0_28px_82px_rgba(15,23,42,0.06)] lg:p-8">
        <div className="absolute -left-10 top-16 h-44 w-44 rounded-full bg-sky-300/12 blur-3xl" />
        <div className="absolute right-0 top-0 h-52 w-52 rounded-full bg-emerald-300/10 blur-3xl" />

        <div className="relative">
          <div className="grid gap-6 xl:grid-cols-[0.78fr_1.22fr] xl:items-start">
            <div>
              <SectionHeading
                {...content.section}
                actions={
                  onStartTrial || onBookDemo ? (
                    <div className="flex flex-wrap gap-3">
                      {onStartTrial ? (
                        <button type="button" onClick={onStartTrial} className="booked-button">
                          Open Web App
                        </button>
                      ) : null}
                      {onBookDemo ? (
                        <button type="button" onClick={onBookDemo} className="booked-button-secondary">
                          Talk to Sales
                        </button>
                      ) : null}
                    </div>
                  ) : null
                }
              />

              <div className="mt-6 grid gap-3">
                {investorSignals.map((signal) => (
                  <SectionCard
                    key={signal.title}
                    className={`rounded-[1.6rem] border p-5 shadow-[0_14px_34px_rgba(15,23,42,0.04)] ${signal.tone}`}
                  >
                    <div className={`text-[11px] font-semibold uppercase tracking-[0.18em] ${signal.accent}`}>
                      {signal.label}
                    </div>
                    <h3 className="mt-3 font-['Space_Grotesk'] text-[1.45rem] font-semibold tracking-[-0.04em] text-slate-950">
                      {signal.title}
                    </h3>
                    <p className="mt-3 text-sm leading-7 text-slate-600">{signal.body}</p>
                  </SectionCard>
                ))}
              </div>

              <div className="mt-6 grid gap-3">
                {content.channels.map((channel) => (
                  <div
                    key={channel}
                    className="rounded-[1.15rem] border border-black/6 bg-white/92 px-4 py-3 text-sm font-semibold text-slate-700 shadow-[0_10px_24px_rgba(15,23,42,0.03)]"
                  >
                    {channel}
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-5">
              <SolutionInfographic />

              <SectionCard className="rounded-[2rem] border border-black/6 bg-white p-5 shadow-[0_18px_44px_rgba(15,23,42,0.05)]">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                      Solution journey
                    </div>
                    <h3 className="mt-2 font-['Space_Grotesk'] text-[1.9rem] font-semibold tracking-[-0.05em] text-slate-950">
                      A vertical flow that reads clearly in one pass
                    </h3>
                  </div>
                  <div className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-sky-700">
                    Easy to scan
                  </div>
                </div>

                <div className="mt-5 grid gap-4 xl:grid-cols-2">
                  {solutionJourney.map((item) => (
                    <SolutionJourneyCard key={item.step} {...item} />
                  ))}
                </div>
              </SectionCard>
            </div>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-3">
            {operatorOutcomes.map((item) => (
              <SectionCard
                key={item.title}
                className="rounded-[1.8rem] border border-black/6 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] p-5 shadow-[0_16px_38px_rgba(15,23,42,0.04)]"
              >
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                  {item.title}
                </div>
                <p className="mt-3 text-sm leading-7 text-slate-600">{item.body}</p>
                <div className="mt-4 grid gap-2">
                  {item.chips.map((chip) => (
                    <div
                      key={chip}
                      className="rounded-[1rem] border border-black/6 bg-white px-4 py-3 text-sm font-semibold text-slate-700"
                    >
                      {chip}
                    </div>
                  ))}
                </div>
              </SectionCard>
            ))}
          </div>

          <div className="mt-5 grid gap-5 md:grid-cols-3">
            {items.slice(0, 3).map((item, index) => (
              <SectionCard
                key={item.title}
                as="article"
                tone="subtle"
                className="relative flex h-full flex-col overflow-hidden rounded-[1.8rem] p-6"
              >
                <div className="absolute right-0 top-0 h-20 w-20 rounded-full bg-[radial-gradient(circle,rgba(15,23,42,0.06),transparent_70%)]" />
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-semibold text-slate-500">{item.eyebrow}</div>
                  <SignalPill className="bg-slate-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-600">
                    {String(index + 1).padStart(2, '0')}
                  </SignalPill>
                </div>
                <h3 className="mt-3 font-['Space_Grotesk'] text-[1.38rem] font-semibold tracking-[-0.04em] text-slate-950">
                  {item.title}
                </h3>
                <p className="mt-3 text-sm leading-7 text-slate-600">{item.body}</p>
              </SectionCard>
            ))}
          </div>
        </div>
      </SectionCard>
    </SectionShell>
  );
}
