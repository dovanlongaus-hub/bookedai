/**
 * Investor-grade slide data for pitch.bookedai.au
 *
 * Investor narrative slide data used by the public pitch surface.
 * Audience: WSTI judges + VC unicorn-thesis investors.
 * Order in deck: inserted AFTER architecture slide and BEFORE the team / final-CTA slides.
 */

export const whyNowStats: Array<{ value: string; label: string; sub: string }> = [
  {
    value: '~10x',
    label: 'AI inference cost down',
    sub: 'Frontier model token cost dropped roughly 10x since 2023; agents are now profitable at SME ARPU.',
  },
  {
    value: '600k',
    label: 'AU service SMEs',
    sub: 'Salons, clinics, tradies, schools, academies — English-first, Stripe-ready, mobile-led demand.',
  },
  {
    value: '<30%',
    label: 'Service-SME software penetration',
    sub: 'No Booksy/GoHighLevel local dominance; messaging-first booking is still a wide-open category.',
  },
];

export const whyNowSignals: Array<{ title: string; body: string }> = [
  {
    title: 'LLM cost curve',
    body: 'Inference economics finally support always-on agents at A$249/mo SME pricing — what was demo-only in 2023 is profitable infra in 2026.',
  },
  {
    title: 'AU messaging shift',
    body: 'WhatsApp + Telegram are the default consumer reply surface. Service SMEs now lose more revenue to slow replies than to bad SEO.',
  },
  {
    title: 'Vertical SaaS gap',
    body: 'No local Booksy or GoHighLevel; Calendly is generic. The operating-layer slot for service SMEs in AU/NZ/SG is unclaimed.',
  },
];

export const marketSizeRows: Array<{
  label: string;
  market: string;
  value: string;
  detail: string;
}> = [
  {
    label: 'AU SAM (top-down)',
    market: 'AU service-SME software',
    value: 'A$2.9B',
    detail: '600k businesses x A$400/mo addressable ARR average across Starter/Growth/Enterprise mix.',
  },
  {
    label: 'AU SOM (bottom-up · 5yr)',
    market: 'AU paying tenants 2026-2031',
    value: 'A$120M',
    detail: '5,000 paying tenants x A$2,000/mo blended ARR (SaaS + commission attached).',
  },
  {
    label: 'Global SAM',
    market: 'Service SMEs worldwide',
    value: 'US$30B+',
    detail: '~30M service SMEs across UK, NZ, SG, US, EU; English-first export from AU base.',
  },
];

export const marketSizeBuildBlocks: Array<{ kicker: string; line: string }> = [
  { kicker: 'Bottom-up · year 1', line: '50 paying tenants x A$249/mo SaaS + 3% commission ~ A$420k ARR.' },
  { kicker: 'Bottom-up · year 3', line: '1,000 paying tenants x A$600 blended ARPU/mo ~ A$7.2M ARR.' },
  { kicker: 'Bottom-up · year 5', line: '5,000 tenants x A$2,000 blended ARPU/mo ~ A$120M ARR (AU SOM cap).' },
];

export type CompetitorPlot = {
  name: string;
  // 0 = low / 100 = high — used as percent positions inside a CSS grid
  vertical: number;
  aiNative: number;
  tag: string;
};

export const competitorPlots: CompetitorPlot[] = [
  { name: 'Calendly', vertical: 18, aiNative: 22, tag: 'Generic scheduler' },
  { name: 'Mindbody', vertical: 76, aiNative: 18, tag: 'Vertical, no-AI' },
  { name: 'Booksy', vertical: 78, aiNative: 28, tag: 'Vertical, low-AI' },
  { name: 'GoHighLevel', vertical: 32, aiNative: 58, tag: 'Broad, sales-AI' },
  { name: 'BookedAI', vertical: 84, aiNative: 88, tag: 'AI-native + omnichannel' },
];

export const defensibilityCards: Array<{ kicker: string; title: string; body: string }> = [
  {
    kicker: 'Moat 1',
    title: 'Data moat — booking follow-up history',
    body: 'Every customer turn becomes structured booking evidence: channel, intent, booking reference, payment posture, and retention next step. Across 1,000 businesses, this creates an AU dataset that links acquisition channel to qualified intent to revenue outcome. No general-purpose LLM has access to this.',
  },
  {
    kicker: 'Moat 2',
    title: 'Distribution moat — omnichannel agent layer',
    body: 'BookedAI Manager Bot already operates on Telegram, WhatsApp, web chat, email, and embed widget through one shared messaging_automation_service. Every channel added compounds the switching cost the SME does not want to re-wire — and locks customer identity to phone + booking reference, not a single app.',
  },
  {
    kicker: 'Moat 3',
    title: 'Workflow lock-in — operations truth',
    body: 'Tenants run their daily revenue-ops queue, billing reminders, and customer-care replies inside the BookedAI Ops surface. Replacing us means replacing the system of record, not a chat widget. Foundation models become commoditized inputs to our orchestration layer; the moat lives in the audited workflow customers operate inside every day.',
  },
];

export const defensibilityLede =
  'OpenAI sells general intelligence. Google sells distribution. BookedAI sells booked revenue truth for a vertical neither will own end-to-end. Three moats compound as we scale.';

export const unitEconomicsTiles: Array<{ value: string; label: string; sub: string }> = [
  {
    value: 'A$400',
    label: 'CAC target',
    sub: 'Setup fee on Growth + Enterprise tiers offsets human onboarding cost — true CAC trends to ~zero.',
  },
  {
    value: 'A$6,000',
    label: 'LTV target',
    sub: 'A$249/mo SaaS + 3% commission on ~A$30k/yr attributed bookings, ~24 month average tenure.',
  },
  {
    value: '75%',
    label: 'Gross margin',
    sub: 'LLM + infra cost ~A$60/tenant/mo at Growth tier; channel + Stripe pass-through priced separately.',
  },
  {
    value: '6 mo',
    label: 'Payback period',
    sub: 'Setup fee covers month-one CAC; SaaS + commission compound payback inside half a year.',
  },
];

export const unitEconomicsContext =
  'Setup fee covers CAC. SaaS keeps the lights on regardless of bookings. Commission aligns BookedAI economics to actual revenue won — the "Revenue Engine" name only stands up if we get paid more when the SME makes more.';

export const liveEvidenceFrames: Array<{
  step: string;
  surface: string;
  title: string;
  caption: string;
  conversation: Array<{ from: 'customer' | 'agent' | 'system'; text: string }>;
}> = [
  {
    step: '01',
    surface: 'Telegram · @BookedAI_Manager_Bot',
    title: 'Real customer turn — natural language to booking',
    caption: 'A parent types a chess class enquiry; the agent shortlists, confirms, captures contact, returns booking reference.',
    conversation: [
      { from: 'customer', text: 'Chess class for my 8 year old in Sydney, beginner level' },
      { from: 'agent', text: 'Top match: Co Mai Hung Chess Academy · Saturday 10:00 · A$45 trial. Tap Book 1 to confirm.' },
      { from: 'customer', text: '[Book 1]' },
      { from: 'agent', text: 'Booked. Reference CMHC-2026-0428-014. Portal link sent. Studio will confirm by 6pm.' },
    ],
  },
  {
    step: '02',
    surface: 'Admin · Pending Handoffs',
    title: 'Same booking surfaces in the admin Reliability lane',
    caption: 'Operator sees the fresh handoff queued under 30 seconds after the Telegram turn — full conversation + tenant context attached.',
    conversation: [
      { from: 'system', text: 'CMHC-2026-0428-014 · Co Mai Hung Chess · channel=telegram · status=PENDING_TENANT_CONFIRM' },
      { from: 'system', text: 'Customer: Linh P. · +61 4xx xxx xxx · child age 8 · prefers Saturday morning' },
      { from: 'system', text: 'Agent action_run: SHORTLIST -> BOOK -> CONFIRM_OUTBOUND queued · trace 9eb8...' },
    ],
  },
  {
    step: '03',
    surface: 'Business workspace · follow-up history',
    title: 'Booking evidence row inside the business workspace',
    caption: 'Every step (search, shortlist, book, confirm) lands in the business follow-up history for review and reporting.',
    conversation: [
      { from: 'system', text: 'run_id 8431 · search_intent · status=ok · 220ms · channel=telegram' },
      { from: 'system', text: 'run_id 8432 · shortlist_match · status=ok · matched=co-mai-hung-chess' },
      { from: 'system', text: 'run_id 8433 · booking_capture · status=ok · ref=CMHC-2026-0428-014' },
      { from: 'system', text: 'run_id 8434 · confirm_outbound · status=ok · channel=telegram · latency=412ms' },
    ],
  },
];

export type RevenuePhase = {
  phaseId: string;
  date: string;
  outcome: string;
  milestoneId: string;
  milestoneTitle: string;
  revenueLine: string;
};

export const revenuePhases: RevenuePhase[] = [
  {
    phaseId: 'Phase 17',
    date: '2026-04-30',
    outcome: 'Stabilize',
    milestoneId: 'M-02',
    milestoneTitle: 'GO-LIVE LOCK · first paying tenant onboard',
    revenueLine: 'First A$ booked through the production agent stack — 3 verified tenants live.',
  },
  {
    phaseId: 'Phase 18-19',
    date: '2026-05-24',
    outcome: 'Unlock retention revenue',
    milestoneId: 'M-05',
    milestoneTitle: 'Tenant revenue proof + billing truth · target first A$5k MRR',
    revenueLine: 'Wallet + Stripe continuity (M-04) plus billing truth proves repeatable monthly revenue.',
  },
  {
    phaseId: 'Phase 20',
    date: '2026-06-01',
    outcome: 'Unlock distribution (widget)',
    milestoneId: 'M-08',
    milestoneTitle: 'Multi-tenant template GA · self-serve widget on first SME',
    revenueLine: 'Widget runtime ships; channel mix expands beyond Telegram-primary; CAC compresses.',
  },
  {
    phaseId: 'Phase 21',
    date: '2026-06-07',
    outcome: 'Unlock commission revenue',
    milestoneId: 'M-11',
    milestoneTitle: 'SMS adapter + commission lane · target A$20k MRR run-rate',
    revenueLine: '3-5% commission on attributed bookings activates; ARPU lifts above A$600/mo blended.',
  },
  {
    phaseId: 'Phase 22+',
    date: '2026-Q3+',
    outcome: 'Multi-tenant scale',
    milestoneId: 'M-09 / M-10',
    milestoneTitle: 'WhatsApp + iMessage horizon · 50+ paying tenants',
    revenueLine: 'Vertical templates (chess, swim, mentor) replicate; export-ready playbook for UK/NZ/SG.',
  },
];
