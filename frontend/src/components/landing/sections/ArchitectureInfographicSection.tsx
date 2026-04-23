import { SectionCard } from '../ui/SectionCard';
import { SectionHeading } from '../ui/SectionHeading';
import { SectionShell } from '../ui/SectionShell';
import { SignalPill } from '../ui/SignalPill';

const operatingSignals = [
  'One commercial system from acquisition to booking and follow-up',
  'Clear role separation so buyers, operators, and partners each get the right experience',
  'A visible operating model that turns conversations into auditable revenue workflow',
];

const salesDeckStages = [
  {
    label: '01',
    title: 'Capture demand',
    body: 'Homepage, product demo, mobile flow, and assistant entry points pull in real customer intent.',
  },
  {
    label: '02',
    title: 'Qualify and route',
    body: 'BookedAI understands requests, structures context, and routes each enquiry toward the right booking lane.',
  },
  {
    label: '03',
    title: 'Convert to booking',
    body: 'Tenant and operator surfaces turn guided conversations into booking-ready action and visible lifecycle state.',
  },
  {
    label: '04',
    title: 'Run the business',
    body: 'CRM, messaging, workflow, and cloud infrastructure keep follow-up, reporting, and reliability moving underneath.',
  },
];

const deckTheses = [
  {
    title: 'Why now',
    body: 'Service businesses already have demand coming from web, chat, mobile, and follow-up, but most teams still lose momentum between first contact and booking action.',
    tone:
      'border-rose-200 bg-[linear-gradient(180deg,#fff1f2_0%,#ffffff_100%)]',
    accent: 'text-rose-600',
  },
  {
    title: 'Why this wins',
    body: 'BookedAI does not stop at conversation. It connects acquisition, qualification, operator review, booking state, and business follow-through in one commercial system.',
    tone:
      'border-sky-200 bg-[linear-gradient(180deg,#eef6ff_0%,#ffffff_100%)]',
    accent: 'text-sky-700',
  },
  {
    title: 'Why it scales',
    body: 'Role boundaries, workflow automation, tenant-safe control, and cloud-backed infrastructure let the product expand without turning into an opaque black box.',
    tone:
      'border-emerald-200 bg-[linear-gradient(180deg,#effcf5_0%,#ffffff_100%)]',
    accent: 'text-emerald-700',
  },
];

const roleCards = [
  {
    eyebrow: 'External user',
    title: 'Customer / Buyer',
    body: 'Arrives from public surfaces and expects a fast path from intent to booking-ready action.',
    chips: ['Homepage', 'Product demo', 'Booking assistant'],
    tone: 'from-[#eef6ff] via-white to-[#f8fbff]',
    accent: 'text-sky-700',
  },
  {
    eyebrow: 'Business workspace',
    title: 'Tenant Team',
    body: 'Runs catalog, bookings, staff context, and day-to-day revenue operations inside the tenant workspace.',
    chips: ['Tenant', 'Catalog', 'Operations'],
    tone: 'from-[#effcf5] via-white to-[#f8fffb]',
    accent: 'text-emerald-700',
  },
  {
    eyebrow: 'Internal control',
    title: 'Admin / Support',
    body: 'Sees platform health, support queues, rollout posture, and sensitive recovery actions.',
    chips: ['Admin', 'Support queue', 'Diagnostics'],
    tone: 'from-[#fff7ed] via-white to-[#fffaf3]',
    accent: 'text-amber-700',
  },
  {
    eyebrow: 'Shared visibility',
    title: 'Portal / Partner',
    body: 'Gets controlled access to proof, bookings, and account actions without full admin exposure.',
    chips: ['Portal', 'Proof views', 'Account actions'],
    tone: 'from-[#fefce8] via-white to-[#fffef7]',
    accent: 'text-yellow-700',
  },
  {
    eyebrow: 'Automation owner',
    title: 'AI + Workflow Runtime',
    body: 'Handles reasoning, routing, follow-up, and workflow execution across the revenue journey.',
    chips: ['OpenAI', 'n8n', 'Workflow rules'],
    tone: 'from-[#eef2ff] via-white to-[#f8faff]',
    accent: 'text-indigo-700',
  },
  {
    eyebrow: 'Platform foundation',
    title: 'Data + Cloud',
    body: 'Holds together data, session boundaries, storage, observability, deployment, and API reliability.',
    chips: ['FastAPI', 'Supabase', 'GCP'],
    tone: 'from-[#f8fafc] via-white to-[#f3f7fb]',
    accent: 'text-slate-700',
  },
];

const architectureLayers = [
  {
    id: 'L1',
    name: 'Acquisition and Experience Surfaces',
    ownership: 'Customer-facing and role-specific interfaces',
    summary:
      'The entry layer includes bookedai.au, product.bookedai.au, demo.bookedai.au, mobile booking flows, tenant workspace, portal, and admin surfaces.',
    capabilities: ['Homepage', 'Product demo', 'Mobile booking UX', 'Tenant workspace', 'Portal', 'Admin console'],
    roleFocus: 'Customer, Tenant Team, Admin, Portal User',
    shellClassName:
      'border-sky-200 bg-[linear-gradient(180deg,#eef6ff_0%,#ffffff_100%)]',
    badgeClassName: 'bg-sky-600 text-white',
    subframes: [
      {
        title: 'Public acquisition',
        items: ['bookedai.au', 'product.bookedai.au', 'demo.bookedai.au'],
      },
      {
        title: 'Booking experiences',
        items: ['WebApp search', 'Mobile flow', 'Assistant entry points'],
      },
      {
        title: 'Role surfaces',
        items: ['Tenant workspace', 'Portal', 'Admin console'],
      },
    ],
  },
  {
    id: 'L2',
    name: 'Identity, Tenant, and Access Control',
    ownership: 'Boundary enforcement and actor isolation',
    summary:
      'Tenant routing, actor-aware sessions, RBAC, portal limits, and admin-safe access rules make each workspace explicit and govern what each role can see or change.',
    capabilities: ['Multi-tenant routing', 'Actor-specific sessions', 'RBAC', 'Portal boundaries', 'Audit posture'],
    roleFocus: 'Tenant Admin, Operator, Finance, Internal Support',
    shellClassName:
      'border-emerald-200 bg-[linear-gradient(180deg,#effcf5_0%,#ffffff_100%)]',
    badgeClassName: 'bg-emerald-600 text-white',
    subframes: [
      {
        title: 'Tenant boundary',
        items: ['Multi-tenant routing', 'Workspace isolation', 'Portal-safe scope'],
      },
      {
        title: 'Session boundary',
        items: ['Actor-specific secrets', 'Signed sessions', 'Access validation'],
      },
      {
        title: 'Role model',
        items: ['Tenant admin', 'Operator', 'Finance manager', 'Internal admin'],
      },
    ],
  },
  {
    id: 'L3',
    name: 'BookedAI Revenue Orchestration Core',
    ownership: 'Capture, qualify, match, book, recover',
    summary:
      'This is the system brain that turns enquiry signals into structured booking state, next-best actions, and visible revenue workflow for operators.',
    capabilities: ['Intent capture', 'Qualification', 'Service matching', 'Booking lifecycle', 'Revenue recovery', 'Operator review'],
    roleFocus: 'AI Runtime, Tenant Team, Admin Support',
    shellClassName:
      'border-slate-900 bg-[linear-gradient(135deg,#0f172a_0%,#111827_58%,#172554_100%)] text-white',
    badgeClassName: 'bg-white text-slate-950',
    subframes: [
      {
        title: 'Demand capture',
        items: ['Intent detection', 'Qualification', 'Customer context'],
      },
      {
        title: 'Booking control',
        items: ['Service matching', 'Booking lifecycle', 'Recovery rules'],
      },
      {
        title: 'Operator visibility',
        items: ['Review queue', 'Revenue state', 'Audit-ready events'],
      },
    ],
  },
  {
    id: 'L4',
    name: 'Workflow, Communication, and Integrations',
    ownership: 'System-to-system execution',
    summary:
      'n8n, Zoho CRM, email, webhook connectors, uploads, and downstream service actions extend the core engine into real operational follow-through.',
    capabilities: ['n8n automation', 'Zoho CRM sync', 'Email delivery', 'Webhook actions', 'Upload surface', 'Provider connectors'],
    roleFocus: 'Automation Runtime, CRM, Messaging, Partners',
    shellClassName:
      'border-amber-200 bg-[linear-gradient(180deg,#fff7ed_0%,#ffffff_100%)]',
    badgeClassName: 'bg-amber-500 text-white',
    subframes: [
      {
        title: 'Workflow execution',
        items: ['n8n jobs', 'Webhook actions', 'Async follow-up'],
      },
      {
        title: 'Business systems',
        items: ['Zoho CRM', 'Email sync', 'Provider connectors'],
      },
      {
        title: 'Operational outputs',
        items: ['Notifications', 'Reminders', 'Upload and document flows'],
      },
    ],
  },
  {
    id: 'L5',
    name: 'Data, API, Observability, and Cloud Foundation',
    ownership: 'Persistence, runtime, security, and scale',
    summary:
      'FastAPI, Supabase/Postgres, storage, GCP, environment controls, and model infrastructure hold the state model together and keep the platform production-safe.',
    capabilities: ['FastAPI API', 'Supabase + Postgres', 'Storage', 'GCP hosting', 'Telemetry', 'OpenAI model services'],
    roleFocus: 'Platform Engineering, Security, Reliability',
    shellClassName:
      'border-slate-200 bg-[linear-gradient(180deg,#f8fafc_0%,#ffffff_100%)]',
    badgeClassName: 'bg-slate-900 text-white',
    subframes: [
      {
        title: 'Application runtime',
        items: ['FastAPI backend', 'API routing', 'Hosted app services'],
      },
      {
        title: 'Data and storage',
        items: ['Supabase', 'Postgres', 'File storage', 'Audit data'],
      },
      {
        title: 'Platform operations',
        items: ['GCP hosting', 'Telemetry', 'Environment controls', 'OpenAI services'],
      },
    ],
  },
];

const governanceCards = [
  {
    title: 'Commercial clarity',
    body: 'Buyers can immediately see how BookedAI moves from enquiry capture to booked revenue without getting lost in backend detail.',
  },
  {
    title: 'Operator confidence',
    body: 'Tenant and admin roles work from visible operational state instead of disconnected chat fragments or hidden automation.',
  },
  {
    title: 'Scalable foundation',
    body: 'AI, workflows, and integrations scale underneath clear boundaries so growth does not turn the product into a black box.',
  },
];

const foundationCards = [
  {
    title: 'Frontend and channel layer',
    body: 'React + TypeScript + Tailwind render the homepage, product proof, mobile-friendly booking flows, admin console, tenant workspace, and portal surface.',
  },
  {
    title: 'Backend application runtime',
    body: 'FastAPI route modules provide public, tenant, admin, communication, upload, and webhook entrypoints behind one API boundary.',
  },
  {
    title: 'Workflow and integration plane',
    body: 'n8n executes asynchronous CRM sync, notifications, reminders, follow-up, and partner-facing operational sequences.',
  },
  {
    title: 'Data and persistence layer',
    body: 'Supabase, Postgres, booking records, catalog state, and audit trails preserve the system state across every surface.',
  },
  {
    title: 'Cloud and delivery foundation',
    body: 'GCP hosting, storage, networking, deployment lanes, and runtime configuration hold the platform together in production.',
  },
  {
    title: 'AI reasoning and automation',
    body: 'OpenAI services support intent understanding, structured extraction, reasoning, and workflow-safe handoff logic.',
  },
];

const platformBadges = [
  { name: 'OpenAI', src: '/partners/openai-startups.svg', tone: 'bg-[#eef6ff]' },
  { name: 'Google Cloud', src: '/partners/google-startups.svg', tone: 'bg-[#f8fafc]' },
  { name: 'Supabase', src: '/partners/supabase.svg', tone: 'bg-[#f0fdf4]' },
  { name: 'n8n', src: '/partners/n8n.svg', tone: 'bg-[#fff7ed]' },
  { name: 'Zoho CRM', src: '/partners/zoho-startups.svg', tone: 'bg-[#fff1f2]' },
];

const closingPanelPoints = [
  'Captures demand from the surfaces customers already use',
  'Converts conversations into structured booking operations',
  'Gives operators, partners, and admins role-safe control',
  'Runs on recognizable AI, cloud, data, and workflow infrastructure',
];

const investorArchitectureLegend = [
  { label: 'Demand surfaces', tone: 'bg-sky-100 text-sky-700' },
  { label: 'Revenue engine', tone: 'bg-indigo-100 text-indigo-700' },
  { label: 'Business operations', tone: 'bg-emerald-100 text-emerald-700' },
  { label: 'Workflow + AI + Data', tone: 'bg-amber-100 text-amber-700' },
];

function RoleCard({
  eyebrow,
  title,
  body,
  chips,
  tone,
  accent,
}: {
  eyebrow: string;
  title: string;
  body: string;
  chips: string[];
  tone: string;
  accent: string;
}) {
  return (
    <div className={`rounded-[1.7rem] border border-black/6 bg-gradient-to-br ${tone} p-5 shadow-[0_14px_32px_rgba(15,23,42,0.05)]`}>
      <div className={`text-[10px] font-semibold uppercase tracking-[0.18em] ${accent}`}>{eyebrow}</div>
      <h3 className="mt-3 font-['Space_Grotesk'] text-[1.32rem] font-semibold tracking-[-0.05em] text-slate-950">{title}</h3>
      <p className="mt-3 text-sm leading-6 text-slate-600">{body}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {chips.map((chip) => (
          <div
            key={chip}
            className="rounded-full border border-black/6 bg-white/88 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-600"
          >
            {chip}
          </div>
        ))}
      </div>
    </div>
  );
}

function InvestorArchitectureImage() {
  return (
    <div className="overflow-hidden rounded-[1.8rem] border border-black/6 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] p-4 shadow-[0_18px_44px_rgba(15,23,42,0.05)] sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            Investor System Snapshot
          </div>
          <h3 className="mt-2 font-['Space_Grotesk'] text-[1.85rem] font-semibold tracking-[-0.05em] text-slate-950">
            One image that shows how the whole platform works together
          </h3>
        </div>
        <div className="rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-indigo-700">
          Investor-friendly visual
        </div>
      </div>

      <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
        This image is designed for a quick investor read: customer demand enters through visible
        surfaces, the BookedAI revenue engine structures and routes it, operator workflows keep it
        controlled, and AI plus cloud infrastructure keep the entire system reliable underneath.
      </p>

      <div className="mt-4 rounded-[1.6rem] border border-black/6 bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.10),transparent_24%),linear-gradient(180deg,#fdfefe_0%,#f3f8ff_100%)] p-3 sm:p-4">
        <svg
          viewBox="0 0 1240 720"
          role="img"
          aria-label="BookedAI architecture overview from demand surfaces through revenue engine, business operations, and cloud infrastructure"
          className="h-auto w-full"
        >
          <defs>
            <linearGradient id="investor-bg" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="100%" stopColor="#eef6ff" />
            </linearGradient>
            <linearGradient id="surfaces" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#eff6ff" />
              <stop offset="100%" stopColor="#ffffff" />
            </linearGradient>
            <linearGradient id="engine" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1e1b4b" />
              <stop offset="100%" stopColor="#1d4ed8" />
            </linearGradient>
            <linearGradient id="ops" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ecfdf5" />
              <stop offset="100%" stopColor="#ffffff" />
            </linearGradient>
            <linearGradient id="infra" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fff7ed" />
              <stop offset="100%" stopColor="#ffffff" />
            </linearGradient>
          </defs>

          <rect x="8" y="8" width="1224" height="704" rx="36" fill="url(#investor-bg)" stroke="rgba(15,23,42,0.08)" />

          <g opacity="0.9">
            <rect x="48" y="58" width="250" height="198" rx="28" fill="url(#surfaces)" stroke="#bfdbfe" />
            <text x="78" y="100" fill="#0369a1" fontSize="18" fontWeight="700" letterSpacing="2.8">ENTRY SURFACES</text>
            <text x="78" y="138" fill="#0f172a" fontSize="32" fontWeight="700">Demand capture</text>
            <text x="78" y="176" fill="#475569" fontSize="20">bookedai.au, product demo, search chat,</text>
            <text x="78" y="206" fill="#475569" fontSize="20">mobile booking, portal entry</text>
            <rect x="78" y="224" width="74" height="30" rx="15" fill="#e0f2fe" />
            <text x="95" y="244" fill="#0369a1" fontSize="14" fontWeight="700">Web</text>
            <rect x="162" y="224" width="92" height="30" rx="15" fill="#e0f2fe" />
            <text x="180" y="244" fill="#0369a1" fontSize="14" fontWeight="700">Product</text>
          </g>

          <g>
            <rect x="344" y="40" width="552" height="238" rx="34" fill="url(#engine)" />
            <text x="382" y="86" fill="#bfdbfe" fontSize="18" fontWeight="700" letterSpacing="3">BOOKEDAI REVENUE ENGINE</text>
            <text x="382" y="128" fill="#ffffff" fontSize="36" fontWeight="700">AI qualification to booking control</text>
            <text x="382" y="166" fill="rgba(255,255,255,0.78)" fontSize="20">Intent capture, shortlist ranking, booking handoff, follow-up state, and audit-ready events.</text>

            <rect x="382" y="194" width="148" height="54" rx="20" fill="rgba(255,255,255,0.12)" stroke="rgba(255,255,255,0.16)" />
            <text x="410" y="227" fill="#ffffff" fontSize="18" fontWeight="700">Intent + fit</text>

            <rect x="548" y="194" width="148" height="54" rx="20" fill="rgba(255,255,255,0.12)" stroke="rgba(255,255,255,0.16)" />
            <text x="578" y="227" fill="#ffffff" fontSize="18" fontWeight="700">Match + rank</text>

            <rect x="714" y="194" width="144" height="54" rx="20" fill="rgba(255,255,255,0.12)" stroke="rgba(255,255,255,0.16)" />
            <text x="741" y="227" fill="#ffffff" fontSize="18" fontWeight="700">Book + recover</text>
          </g>

          <g opacity="0.94">
            <rect x="942" y="58" width="250" height="198" rx="28" fill="url(#ops)" stroke="#a7f3d0" />
            <text x="972" y="100" fill="#047857" fontSize="18" fontWeight="700" letterSpacing="2.8">ROLE-SAFE OPERATIONS</text>
            <text x="972" y="138" fill="#0f172a" fontSize="32" fontWeight="700">Business control</text>
            <text x="972" y="176" fill="#475569" fontSize="20">Tenant workspace, admin, support queue,</text>
            <text x="972" y="206" fill="#475569" fontSize="20">portal actions, reporting posture</text>
            <rect x="972" y="224" width="78" height="30" rx="15" fill="#dcfce7" />
            <text x="989" y="244" fill="#047857" fontSize="14" fontWeight="700">Tenant</text>
            <rect x="1060" y="224" width="70" height="30" rx="15" fill="#dcfce7" />
            <text x="1078" y="244" fill="#047857" fontSize="14" fontWeight="700">Admin</text>
          </g>

          <g>
            <path d="M298 156H344" stroke="#60a5fa" strokeWidth="8" strokeLinecap="round" />
            <path d="m328 138 28 18-28 18" fill="none" stroke="#60a5fa" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M896 156H942" stroke="#34d399" strokeWidth="8" strokeLinecap="round" />
            <path d="m926 138 28 18-28 18" fill="none" stroke="#34d399" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
          </g>

          <g>
            <rect x="116" y="338" width="1008" height="128" rx="28" fill="#ffffff" stroke="rgba(15,23,42,0.08)" />
            <text x="156" y="382" fill="#475569" fontSize="18" fontWeight="700" letterSpacing="2.8">WORKFLOW AND COMMUNICATION PLANE</text>
            <text x="156" y="422" fill="#0f172a" fontSize="28" fontWeight="700">n8n, CRM sync, notifications, reminders, provider and webhook execution</text>

            <rect x="760" y="370" width="94" height="34" rx="17" fill="#fff7ed" />
            <text x="790" y="392" fill="#c2410c" fontSize="15" fontWeight="700">n8n</text>
            <rect x="866" y="370" width="110" height="34" rx="17" fill="#fff7ed" />
            <text x="892" y="392" fill="#c2410c" fontSize="15" fontWeight="700">Zoho CRM</text>
            <rect x="988" y="370" width="90" height="34" rx="17" fill="#fff7ed" />
            <text x="1014" y="392" fill="#c2410c" fontSize="15" fontWeight="700">Email</text>
          </g>

          <g>
            <rect x="86" y="516" width="1068" height="146" rx="30" fill="url(#infra)" stroke="#fed7aa" />
            <text x="126" y="560" fill="#c2410c" fontSize="18" fontWeight="700" letterSpacing="2.8">FOUNDATION LAYER</text>
            <text x="126" y="602" fill="#0f172a" fontSize="34" fontWeight="700">FastAPI API + Supabase data + OpenAI reasoning + GCP hosting</text>

            <rect x="742" y="536" width="88" height="34" rx="17" fill="#ffffff" />
            <text x="764" y="558" fill="#334155" fontSize="15" fontWeight="700">FastAPI</text>
            <rect x="842" y="536" width="104" height="34" rx="17" fill="#ffffff" />
            <text x="865" y="558" fill="#334155" fontSize="15" fontWeight="700">Supabase</text>
            <rect x="958" y="536" width="82" height="34" rx="17" fill="#ffffff" />
            <text x="981" y="558" fill="#334155" fontSize="15" fontWeight="700">OpenAI</text>
            <rect x="1052" y="536" width="64" height="34" rx="17" fill="#ffffff" />
            <text x="1073" y="558" fill="#334155" fontSize="15" fontWeight="700">GCP</text>

            <path d="M620 278V338" stroke="#94a3b8" strokeWidth="6" strokeLinecap="round" />
            <path d="m604 324 16 16 16-16" fill="none" stroke="#94a3b8" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M620 466V516" stroke="#94a3b8" strokeWidth="6" strokeLinecap="round" />
            <path d="m604 500 16 16 16-16" fill="none" stroke="#94a3b8" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
          </g>
        </svg>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {investorArchitectureLegend.map((item) => (
          <div
            key={item.label}
            className={`rounded-full px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] ${item.tone}`}
          >
            {item.label}
          </div>
        ))}
      </div>
    </div>
  );
}

type ArchitectureInfographicSectionProps = {
  onStartTrial?: () => void;
  onBookDemo?: () => void;
};

export function ArchitectureInfographicSection({
  onStartTrial,
  onBookDemo,
}: ArchitectureInfographicSectionProps) {
  return (
    <SectionShell id="architecture" className="py-10 lg:py-12">
      <SectionCard className="relative overflow-hidden border border-black/6 bg-[linear-gradient(155deg,#fcfdff_0%,#f3f8ff_30%,#f7fbff_65%,#ffffff_100%)] p-7 shadow-[0_34px_110px_rgba(15,23,42,0.08)] lg:p-9">
        <div className="absolute -right-20 top-0 h-56 w-56 rounded-full bg-sky-400/10 blur-3xl" />
        <div className="absolute left-0 top-20 h-48 w-48 rounded-full bg-emerald-400/10 blur-3xl" />
        <div className="absolute inset-x-0 top-0 h-24 bg-[linear-gradient(180deg,rgba(255,255,255,0.72),rgba(255,255,255,0))]" />

        <div className="relative">
          <div className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr] xl:items-end">
            <SectionHeading
              kicker="Architecture"
              kickerClassName="text-sky-700"
              title="BookedAI turns scattered demand into a visible revenue operating system for service businesses."
              body="Read this section like a pitch deck: market need first, operating advantage second, and technical credibility underneath."
              titleClassName="max-w-5xl font-['Space_Grotesk'] text-[2.35rem] sm:text-[3rem] lg:text-[3.7rem]"
              bodyClassName="max-w-[40rem] text-[1rem] leading-7 text-black/64"
              actions={
                onStartTrial || onBookDemo ? (
                  <div className="flex flex-wrap gap-3">
                    {onStartTrial ? (
                      <button type="button" onClick={onStartTrial} className="booked-button">
                        Open Product Trial
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

            <SectionCard
              tone="dark"
              className="rounded-[2rem] border border-white/10 bg-[linear-gradient(145deg,#0f172a_0%,#0b1020_58%,#13213d_100%)] p-6 text-white shadow-[0_26px_80px_rgba(2,6,23,0.34)]"
            >
              <div className="flex flex-wrap items-center gap-2">
                <SignalPill variant="inverse" className="px-3 py-1 text-[10px] uppercase tracking-[0.16em]">
                  Sales-deck architecture
                </SignalPill>
                <SignalPill variant="inverse" className="bg-white/10 px-3 py-1 text-[10px] uppercase tracking-[0.16em] text-white/84">
                  Multi-surface SaaS
                </SignalPill>
              </div>

              <h3 className="mt-5 font-['Space_Grotesk'] text-[1.9rem] font-semibold tracking-[-0.06em] text-white sm:text-[2.35rem]">
                BookedAI connects marketing, AI qualification, booking operations, and follow-up in one operating model.
              </h3>

              <div className="mt-5 grid gap-3">
                {operatingSignals.map((signal, index) => (
                  <div key={signal} className="rounded-[1.3rem] border border-white/10 bg-white/7 px-4 py-4 backdrop-blur">
                    <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-cyan-200">
                      Signal 0{index + 1}
                    </div>
                    <p className="mt-2 text-sm leading-6 text-white/82">{signal}</p>
                  </div>
                ))}
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {salesDeckStages.map((stage) => (
                  <div key={stage.label} className="rounded-[1.35rem] border border-white/10 bg-white/8 px-4 py-4">
                    <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-cyan-200">
                      Stage {stage.label}
                    </div>
                    <div className="mt-2 text-base font-semibold text-white">{stage.title}</div>
                    <p className="mt-2 text-sm leading-6 text-white/78">{stage.body}</p>
                  </div>
                ))}
              </div>
            </SectionCard>
          </div>

          <SectionCard className="mt-4 rounded-[2rem] border border-black/6 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] p-5 shadow-[0_18px_44px_rgba(15,23,42,0.05)]">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Architecture sketch
                </div>
                <h3 className="mt-2 font-['Space_Grotesk'] text-[1.9rem] font-semibold tracking-[-0.05em] text-slate-950">
                  A summarized platform drawing before the deeper breakdown
                </h3>
              </div>
              <div className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-sky-700">
                Visual summary
              </div>
            </div>

            <div className="mt-5">
              <InvestorArchitectureImage />
            </div>

            <div className="mt-5 grid gap-3 xl:grid-cols-[0.24fr_0.26fr_0.26fr_0.24fr]">
              {[
                {
                  title: 'Demand surfaces',
                  body: 'Homepage, product demo, search entry, and assistant start the journey.',
                  items: ['Homepage', 'Product demo', 'Search', 'Chat'],
                },
                {
                  title: 'Revenue engine',
                  body: 'BookedAI captures intent, qualifies fit, ranks options, and prepares the booking path.',
                  items: ['Intent', 'Qualification', 'Ranking', 'Booking logic'],
                },
                {
                  title: 'Business operations',
                  body: 'Tenant and admin flows keep catalog, booking, follow-up, and support visible.',
                  items: ['Tenant', 'Admin', 'Portal', 'Support'],
                },
                {
                  title: 'Infrastructure',
                  body: 'APIs, data, workflow, and AI services keep the runtime reliable underneath.',
                  items: ['FastAPI', 'Supabase', 'n8n', 'OpenAI'],
                },
              ].map((item, index) => (
                <div key={item.title} className="relative rounded-[1.55rem] border border-black/6 bg-white px-4 py-4 shadow-[0_12px_28px_rgba(15,23,42,0.04)]">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-sky-700">
                    Layer 0{index + 1}
                  </div>
                  <div className="mt-2 text-lg font-semibold tracking-[-0.03em] text-slate-950">{item.title}</div>
                  <div className="mt-2 text-sm leading-6 text-slate-600">{item.body}</div>
                  <div className="mt-4 grid gap-2">
                    {item.items.map((subItem) => (
                      <div key={subItem} className="rounded-[1rem] border border-black/6 bg-[#f8fbff] px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-600">
                        {subItem}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>

          <div className="mt-4 grid gap-4 xl:grid-cols-3">
            {deckTheses.map((thesis) => (
              <SectionCard
                key={thesis.title}
                className={`rounded-[2rem] border p-6 shadow-[0_18px_44px_rgba(15,23,42,0.05)] ${thesis.tone}`}
              >
                <div className={`text-[11px] font-semibold uppercase tracking-[0.18em] ${thesis.accent}`}>
                  {thesis.title}
                </div>
                <h3 className="mt-3 font-['Space_Grotesk'] text-[1.86rem] font-semibold tracking-[-0.06em] text-slate-950">
                  {thesis.title === 'Why now'
                    ? 'Demand is already there'
                    : thesis.title === 'Why this wins'
                      ? 'The product closes the gap'
                      : 'The model can expand cleanly'}
                </h3>
                <p className="mt-4 text-[1rem] leading-7 text-slate-600">{thesis.body}</p>
              </SectionCard>
            ))}
          </div>

          <div className="mt-8 rounded-[2.15rem] border border-black/6 bg-white/88 p-5 shadow-[0_24px_70px_rgba(15,23,42,0.06)] backdrop-blur">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Surface Story
                </div>
                <h3 className="mt-2 font-['Space_Grotesk'] text-[2.05rem] font-semibold tracking-[-0.06em] text-slate-950">
                  The visible surfaces buyers can understand in one glance
                </h3>
              </div>
              <div className="rounded-full bg-sky-600 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white">
                Buyer-friendly platform map
              </div>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {roleCards.map((role) => (
                <RoleCard key={role.title} {...role} />
              ))}
            </div>
          </div>

          <div className="mt-4 grid gap-4 xl:grid-cols-[1.18fr_0.82fr]">
            <SectionCard className="overflow-hidden rounded-[2.15rem] border border-black/6 bg-[linear-gradient(180deg,#ffffff_0%,#f7fbff_100%)] p-5 shadow-[0_20px_56px_rgba(15,23,42,0.05)]">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Operating Model
                  </div>
                  <h3 className="mt-2 font-['Space_Grotesk'] text-[2.1rem] font-semibold tracking-[-0.05em] text-slate-950">
                    The flow from demand capture to reliable delivery
                  </h3>
                </div>
                <div className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-sky-700">
                  Easy to pitch, deep enough to trust
                </div>
              </div>

              <div className="mt-5 rounded-[1.85rem] border border-black/6 bg-[linear-gradient(180deg,#fbfdff_0%,#ffffff_100%)] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.65)]">
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {roleCards.map((role) => (
                    <div
                      key={`mini-${role.title}`}
                      className={`rounded-[1.35rem] border border-black/6 bg-gradient-to-br ${role.tone} px-4 py-4 shadow-[0_10px_24px_rgba(15,23,42,0.04)]`}
                    >
                      <div className={`text-xs font-semibold uppercase tracking-[0.16em] ${role.accent}`}>{role.eyebrow}</div>
                      <div className="mt-2 text-base font-semibold text-slate-950">{role.title}</div>
                    </div>
                  ))}
                </div>

                <div className="my-4 flex justify-center">
                  <div className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Each layer explains how value moves through the business
                  </div>
                </div>

                <div className="grid gap-4">
                  {architectureLayers.map((layer) => (
                    <div
                      key={`frame-${layer.id}`}
                      className={`rounded-[1.9rem] border p-5 shadow-[0_16px_38px_rgba(15,23,42,0.05)] ${layer.shellClassName}`}
                    >
                      <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr] xl:items-start">
                        <div>
                          <div className="flex flex-wrap items-center gap-3">
                            <div className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${layer.badgeClassName}`}>
                              {layer.id}
                            </div>
                            <div className={`text-xs font-semibold uppercase tracking-[0.16em] ${layer.id === 'L3' ? 'text-white/70' : 'text-slate-500'}`}>
                              {layer.ownership}
                            </div>
                          </div>
                          <h4 className={`mt-4 font-['Space_Grotesk'] text-[1.5rem] font-semibold tracking-[-0.05em] ${layer.id === 'L3' ? 'text-white' : 'text-slate-950'}`}>
                            {layer.name}
                          </h4>
                          <p className={`mt-3 text-[0.98rem] leading-7 ${layer.id === 'L3' ? 'text-white/80' : 'text-slate-600'}`}>
                            {layer.summary}
                          </p>
                          <div className={`mt-4 rounded-[1.2rem] border px-4 py-3 text-sm leading-6 ${
                            layer.id === 'L3'
                              ? 'border-white/12 bg-white/10 text-white/84'
                              : 'border-black/6 bg-white/82 text-slate-600'
                          }`}>
                            <span className="font-semibold">Primary roles:</span> {layer.roleFocus}
                          </div>
                        </div>

                        <div className="grid gap-3 md:grid-cols-3">
                          {layer.subframes.map((frame) => (
                            <div
                              key={`${layer.id}-${frame.title}`}
                              className={`rounded-[1.4rem] border px-4 py-4 ${
                                layer.id === 'L3'
                                  ? 'border-white/12 bg-white/8'
                                  : 'border-black/6 bg-white/88'
                              }`}
                            >
                              <div className={`text-sm font-semibold ${layer.id === 'L3' ? 'text-white' : 'text-slate-950'}`}>
                                {frame.title}
                              </div>
                              <div className="mt-3 grid gap-2">
                                {frame.items.map((item) => (
                                  <div
                                    key={item}
                                    className={`rounded-[0.95rem] border px-3 py-2 text-sm font-medium leading-5 ${
                                      layer.id === 'L3'
                                        ? 'border-white/10 bg-[#14213d] text-white/86'
                                        : 'border-black/6 bg-[#f8fafc] text-slate-600'
                                    }`}
                                  >
                                    {item}
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </SectionCard>

            <div className="grid gap-4">
              <SectionCard className="rounded-[2.15rem] border border-black/6 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] p-5 shadow-[0_16px_40px_rgba(15,23,42,0.04)]">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Why This Architecture Sells
                </div>
                <h3 className="mt-3 font-['Space_Grotesk'] text-[1.62rem] font-semibold tracking-[-0.05em] text-slate-950">
                  Clear layers make the product easier to buy and easier to operate
                </h3>
                <div className="mt-4 grid gap-3">
                  {architectureLayers.map((layer) => (
                    <div key={layer.id} className={`rounded-[1.5rem] border p-4 shadow-[0_12px_28px_rgba(15,23,42,0.04)] ${layer.shellClassName}`}>
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className={`rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${layer.badgeClassName}`}>
                          {layer.id}
                        </div>
                        <div className={`text-[10px] font-semibold uppercase tracking-[0.16em] ${layer.id === 'L3' ? 'text-white/70' : 'text-slate-500'}`}>
                          {layer.ownership}
                        </div>
                      </div>
                      <h3 className={`mt-3 font-['Space_Grotesk'] text-[1.22rem] font-semibold tracking-[-0.05em] ${layer.id === 'L3' ? 'text-white' : 'text-slate-950'}`}>
                        {layer.name}
                      </h3>
                      <p className={`mt-3 text-sm leading-6 ${layer.id === 'L3' ? 'text-white/78' : 'text-slate-600'}`}>
                        {layer.summary}
                      </p>
                      <div className="mt-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-current/60">
                        Primary roles: {layer.roleFocus}
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {layer.capabilities.map((item) => (
                          <div
                            key={item}
                            className={`rounded-full border px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] ${
                              layer.id === 'L3'
                                ? 'border-white/12 bg-white/10 text-white/88'
                                : 'border-black/6 bg-white/88 text-slate-600'
                            }`}
                          >
                            {item}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </SectionCard>

              <SectionCard
                tone="dark"
                className="rounded-[2.15rem] border border-white/10 bg-[linear-gradient(145deg,#0f172a_0%,#111827_60%,#172554_100%)] p-5 text-white shadow-[0_18px_48px_rgba(2,6,23,0.3)]"
              >
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-200">
                  Deck Takeaways
                </div>
                <h3 className="mt-3 font-['Space_Grotesk'] text-[1.55rem] font-semibold tracking-[-0.05em] text-white">
                  Three messages a buyer or investor should leave with
                </h3>
                <div className="mt-4 grid gap-3">
                  {governanceCards.map((card, index) => (
                    <div key={card.title} className="rounded-[1.4rem] border border-white/10 bg-white/8 px-4 py-4">
                      <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-cyan-200">
                        Principle 0{index + 1}
                      </div>
                      <div className="mt-2 text-base font-semibold text-white">{card.title}</div>
                      <p className="mt-2 text-sm leading-6 text-white/78">{card.body}</p>
                    </div>
                  ))}
                </div>
              </SectionCard>
            </div>
          </div>

          <div className="mt-4 grid gap-4 xl:grid-cols-[0.94fr_1.06fr]">
            <SectionCard className="rounded-[2.15rem] border border-black/6 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] p-6 shadow-[0_18px_50px_rgba(15,23,42,0.05)]">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                Infrastructure Credibility
              </div>
              <h3 className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-slate-950">
                The foundations that make the story believable in production
              </h3>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {foundationCards.map((card) => (
                  <div key={card.title} className="rounded-[1.5rem] border border-black/6 bg-white p-5 shadow-[0_12px_28px_rgba(15,23,42,0.04)]">
                    <div className="text-sm font-semibold text-slate-950">{card.title}</div>
                    <p className="mt-3 text-sm leading-6 text-slate-600">{card.body}</p>
                  </div>
                ))}
              </div>
            </SectionCard>

            <SectionCard className="rounded-[2.15rem] border border-black/6 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] p-6 shadow-[0_18px_50px_rgba(15,23,42,0.05)]">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Ecosystem Proof
                  </div>
                  <h3 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-slate-950">
                    Recognizable platforms behind the operating stack
                  </h3>
                </div>
                <div className="rounded-full border border-black/6 bg-white px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-600">
                  Production-aligned stack
                </div>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                {platformBadges.map((badge) => (
                  <div
                    key={badge.name}
                    className={`rounded-[1.45rem] border border-black/6 ${badge.tone} px-4 py-4 shadow-[0_14px_30px_rgba(15,23,42,0.05)]`}
                  >
                    <div className="flex min-h-[3.75rem] items-center justify-center rounded-[1rem] bg-white px-4 py-3">
                      <img src={badge.src} alt={badge.name} className="max-h-8 w-auto object-contain" loading="lazy" />
                    </div>
                    <div className="mt-3 text-center text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-600">
                      {badge.name}
                    </div>
                  </div>
                ))}
              </div>
            </SectionCard>
          </div>

          <SectionCard
            tone="dark"
            className="mt-4 rounded-[2.35rem] border border-white/10 bg-[linear-gradient(145deg,#081120_0%,#0f172a_38%,#172554_100%)] p-7 text-white shadow-[0_24px_72px_rgba(2,6,23,0.34)] lg:p-8"
          >
            <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr] xl:items-end">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-cyan-200">
                  Closing Thesis
                </div>
                <h3 className="mt-3 max-w-4xl font-['Space_Grotesk'] text-[2.2rem] font-semibold tracking-[-0.06em] text-white sm:text-[2.7rem] lg:text-[3.15rem] lg:leading-[0.95]">
                  BookedAI is not just an assistant layer. It becomes the operating layer for service revenue.
                </h3>
                <p className="mt-4 max-w-[44rem] text-[1.02rem] leading-8 text-white/76">
                  The pitch is simple: bring demand in, qualify it fast, convert it into booking-ready action, keep operators in control, and run the entire motion on infrastructure that buyers and partners can trust.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {closingPanelPoints.map((point, index) => (
                  <div
                    key={point}
                    className="rounded-[1.45rem] border border-white/10 bg-white/8 px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
                  >
                    <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-cyan-200">
                      Proof 0{index + 1}
                    </div>
                    <p className="mt-2 text-sm leading-6 text-white/82">{point}</p>
                  </div>
                ))}
              </div>
            </div>
          </SectionCard>
        </div>
      </SectionCard>
    </SectionShell>
  );
}
