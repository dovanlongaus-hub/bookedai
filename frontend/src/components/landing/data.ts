export type NavItem = {
  id: string;
  label: string;
  href?: string;
};

export type LandingSpineItem = {
  id: string;
  label: string;
  includeInNav?: boolean;
};

export type InfoCard = {
  title: string;
  body: string;
};

export type Metric = {
  value: string;
  label: string;
};

export type SectionContent = {
  kicker: string;
  title: string;
  body: string;
  kickerClassName: string;
};

export type HeroContent = {
  eyebrow: string;
  title: string;
  bodyLead: string;
  bodyRest: string;
  note: string;
  primaryCta: string;
  secondaryCta: string;
  primaryHref: string;
  secondaryHref: string;
};

export type DemoContent = {
  title: string;
  subtitle: string;
  status: string;
  query: string;
  messages: string[];
  decisionSummary: string;
  topPickLabel: string;
  quickFilters: string[];
  results: Array<{
    name: string;
    category: string;
    imageUrl: string;
    summary: string;
    priceLabel: string;
    timingLabel: string;
    locationLabel: string;
    bestFor: string;
    badge: string;
    actionLabel: string;
  }>;
  nearbyDiningSearch: {
    label: string;
    query: string;
    filters: string[];
    result: {
      name: string;
      category: string;
      imageUrl: string;
      summary: string;
      priceLabel: string;
      timingLabel: string;
      locationLabel: string;
      bestFor: string;
      badge: string;
      actionLabel: string;
    };
  };
};

export type PricingContent = SectionContent & {
  planLabel: string;
  planPrice: string;
  planCaption: string;
  planFeatures: string[];
  primaryCta: string;
  primaryHref: string;
};

export type CallToActionContent = {
  kicker: string;
  title: string;
  body: string;
  primaryCta: string;
  secondaryCta: string;
  primaryHref: string;
  secondaryHref: string;
  supportingText: string;
};

export type ProofItem = {
  eyebrow: string;
  title: string;
  body: string;
};

export type ProofContent = {
  channels: string[];
  section: SectionContent;
};

export type TrustItem = {
  name: string;
  business: string;
  quote: string;
};

export type FAQItem = {
  question: string;
  answer: string;
};

export type TeamMember = {
  name: string;
  role: string;
  bio: string;
  imageSrc: string;
  imageAlt: string;
  badges?: string[];
};

export type VideoDemoContent = {
  kicker: string;
  title: string;
  body: string;
  highlights: string[];
  primaryCta: string;
  primaryHref: string;
  secondaryCta: string;
  secondaryHref: string;
};

export type BookingAssistantContent = SectionContent & {
  searchPlaceholder: string;
  formIntro: string;
  submitLabel: string;
};

export type ShowcaseImage = {
  src: string;
  alt: string;
  eyebrow: string;
  title: string;
};

export type CustomerShowcaseContent = SectionContent & {
  customerName: string;
  customerUrl: string;
  customerSummary: string;
};

export type CustomerProduct = {
  name: string;
  description: string;
  href: string;
};

export type PartnersSectionContent = SectionContent & {
  stats: string[];
  emptyTitle: string;
  emptyBody: string;
};

export type FeaturedPartner = {
  id: string;
  name: string;
  category: string;
  websiteUrl: string | null;
  description: string;
  logoUrl: string;
  imageUrl: string;
  featured: boolean;
};

export type RoadmapStatus = 'Completed' | 'In Progress' | 'Planned';

export type ArchitectureLayerItem = {
  name: string;
  description: string;
  status: RoadmapStatus;
};

export type ArchitectureLayer = {
  name: string;
  summary: string;
  items: ArchitectureLayerItem[];
};

export type ArchitecturePrinciple = {
  title: string;
  body: string;
};

export type TechStackItem = {
  name: string;
  detail: string;
  status: RoadmapStatus;
};

export type TechStackCategory = {
  name: string;
  items: TechStackItem[];
};

export type TechnicalArchitectureContent = SectionContent & {
  lead: string;
  principles: ArchitecturePrinciple[];
  layers: ArchitectureLayer[];
  techStackCategories: TechStackCategory[];
};

export type RoadmapArchitecture = {
  title: string;
  body: string;
};

export type RoadmapTask = {
  title: string;
  status: RoadmapStatus;
  note?: string;
};

export type RoadmapPhase = {
  name: string;
  timing: string;
  summary: string;
  windowLabel?: string;
  focusLabel?: string;
  milestoneLabel?: string;
  tasks: RoadmapTask[];
};

export type RoadmapRole = {
  name: string;
  track: string;
  body: string;
  status: RoadmapStatus;
  windowLabel?: string;
  focusLabel?: string;
};

export type RoadmapRoleGroup = {
  name: string;
  summary: string;
  clusterLabel?: string;
  windowLabel?: string;
  roles: RoadmapRole[];
};

export type RoadmapSprintLink = {
  label: string;
  href: string;
};

export type RoadmapSprintReference = {
  title: string;
  path: string;
  summary: string;
};

export type RoadmapSprint = {
  name: string;
  phaseName: string;
  timing: string;
  status: RoadmapStatus;
  windowLabel?: string;
  focusLabel?: string;
  milestoneLabel?: string;
  summary: string;
  evidence: string;
  mainGap: string;
  nextPrompt: string;
  ownerGroup: string;
  agents: string[];
  tasks: RoadmapTask[];
  riskNotes?: string[];
  links?: RoadmapSprintLink[];
  references?: RoadmapSprintReference[];
};

export type RoadmapContent = SectionContent & {
  lead: string;
  architectures: RoadmapArchitecture[];
  roleGroups: RoadmapRoleGroup[];
  phases: RoadmapPhase[];
  sprints: RoadmapSprint[];
};

export type ImageUploadContent = SectionContent & {
  acceptedFormats: string[];
  helperText: string;
  uploadLabel: string;
  copyLabel: string;
};

export const primaryCtaHref =
  '/register-interest?source_section=hero&source_cta=start_free_trial&source_detail=homepage_sales_deck&offer=launch10&deployment=standalone_website&setup=online';

export const productAppHref = 'https://product.bookedai.au/';

export const demoAppHref = 'https://demo.bookedai.au/';

export const demoCtaHref = demoAppHref;

export const pitchDeckHref = '/pitch-deck';

export const roadmapHref = '/roadmap';
export const productHref = productAppHref;
export const tenantHref = 'https://tenant.bookedai.au/';
export const adminHref = 'https://admin.bookedai.au/';
export const googleRegisterHref = `${tenantHref}?auth=create`;
export const googleLoginHref = `${tenantHref}?auth=sign-in`;

export const videoDemoHref = '/video-demo.html';

export const privacyHref = '/privacy-policy.html';

export const termsHref = '/terms.html';

export const brandName = 'BookedAI';
export const brandDomainLabel = 'bookedai.au';
export const brandDescriptor = 'Enterprise-Ready AI Revenue Operating Layer for Service Businesses';
export const brandPositioning =
  'BookedAI turns fragmented enquiries into one visible operating flow for capture, qualification, booking conversion, and follow-up so growth teams, operators, and investors can all understand the revenue path quickly.';
export const brandHomeUrl = 'https://bookedai.au/';
export const brandAssetVersion = '20260421-branding-suite';
export const brandUploadedLogoPath =
  'https://upload.bookedai.au/images/0a14/VAEjorVtB4CBewa8CmRmRQ.png';
export const brandUnifiedLogoPath = brandUploadedLogoPath;
export const brandPreferredLogoPath = brandUnifiedLogoPath;
export const brandLogoPath = brandUploadedLogoPath;
export const brandLogoOnDarkPath = brandUploadedLogoPath;
export const brandLogoBlackPath = brandUploadedLogoPath;
export const brandLogoTransparentPath = brandUploadedLogoPath;
export const brandLogoSquarePath = `/branding/bookedai-logo-square-1024.png?v=${brandAssetVersion}`;
export const brandShortIconPath = `/branding/bookedai-mark-gradient.png?v=${brandAssetVersion}`;
export const brandFaviconPath = `/branding/bookedai-icon-32.png?v=${brandAssetVersion}`;
export const brandLandingDarkSurfaceLogoPath = brandUploadedLogoPath;
export const brandLandingLightSurfaceLogoPath = brandUploadedLogoPath;
export const brandContactEmail = 'info@bookedai.au';
export const brandWhatsAppHref =
  'https://wa.me/14155238886?text=Hi%20BookedAI%2C%20I%20want%20to%20see%20how%20the%20AI%20Revenue%20Engine%20works.';
export const brandLinkedInHref = 'https://www.linkedin.com/company/booked-ai-aus/';
export const brandXHref = 'https://twitter.com/BookedAIAU';

export const publicLandingSpine: LandingSpineItem[] = [
  { id: 'hero', label: 'Hero' },
  { id: 'problem', label: 'Problem', includeInNav: true },
  { id: 'solution', label: 'Solution', includeInNav: true },
  { id: 'product-proof', label: 'Product Demo', includeInNav: true },
  { id: 'booking-assistant', label: 'Live Product', includeInNav: true },
  { id: 'trust', label: 'Trust', includeInNav: true },
  { id: 'partners', label: 'Partners', includeInNav: true },
  { id: 'team-members', label: 'Team Members', includeInNav: true },
  { id: 'pricing', label: 'Pricing', includeInNav: true },
  { id: 'call-to-action', label: 'Call to action' },
  { id: 'footer', label: 'Footer' },
];

export const navItems: NavItem[] = publicLandingSpine
  .filter((item) => item.includeInNav)
  .map((item) => ({ id: item.id, label: item.label }));

export const heroContent: HeroContent = {
  eyebrow: 'Responsive web revenue operations for service businesses',
  title: 'Turn enquiries into booked revenue with one modern operating system.',
  bodyLead:
    'BookedAI helps service businesses capture demand, qualify intent, and move buyers into booking-ready action through one visible workflow.',
  bodyRest:
    'Instead of stitching together chat, triage, scheduling, CRM, and follow-up manually, teams get one responsive web app path that stays credible on desktop, tablet, and mobile while remaining legible to buyers and investors in the first minute.',
  note: 'Responsive web app first on bookedai.au. Native mobile can follow later once the core web conversion and operations loop is fully hardened.',
  primaryCta: 'Open Web App',
  secondaryCta: 'Talk to Sales',
  primaryHref: productHref,
  secondaryHref: '/register-interest',
};

export const demoContent: DemoContent = {
  title: 'BookedAI revenue-engine preview',
  subtitle: 'Live capture, ranking, and booking handoff in one responsive web app',
  status: 'Online',
  query: 'Swimming lessons for a 7-year-old near Caringbah',
  messages: [
    'Swimming lessons for a 7-year-old near Caringbah.',
    'I found the best family-friendly swim option nearby and ranked it highest because it matches the child age, venue preference, and Sunday 11:00 AM schedule.',
    'The result below is ready to book now, with the key details already surfaced for a parent to decide quickly.',
  ],
  decisionSummary:
    'Future Swim is the strongest fit because it is close to Caringbah, suited for a 7-year-old beginner, and has the requested Sunday 11:00 AM lesson available.',
  topPickLabel: 'Top picked for your child',
  quickFilters: ['Age 7', 'Near Caringbah', 'Sunday 11:00 AM', 'Beginner friendly'],
  results: [
    {
      name: 'Future Swim Caringbah',
      category: 'Kids Swim School',
      imageUrl:
        'https://images.pexels.com/photos/1263348/pexels-photo-1263348.jpeg?auto=compress&cs=tinysrgb&w=1200',
      summary:
        'Warm indoor learn-to-swim environment with beginner coaching, child-safe progression, and a Sunday slot that works for family routines.',
      priceLabel: 'A$30 / lesson',
      timingLabel: 'Sun 11:00 AM',
      locationLabel: 'Caringbah area • 6 mins away',
      bestFor: 'Best for parents wanting a nearby weekend lesson with a trusted beginner program',
      badge: 'Best fit',
      actionLabel: 'Book swim lesson',
    },
  ],
  nearbyDiningSearch: {
    label: 'Default search records',
    query: 'AI events in Sydney this week',
    filters: ['Sydney', 'This week', 'AI events'],
    result: {
      name: 'AI Sydney Summit',
      category: 'AI Event',
      imageUrl:
        'https://images.pexels.com/photos/3183150/pexels-photo-3183150.jpeg?auto=compress&cs=tinysrgb&w=1200',
      summary:
        'Flagship Sydney AI event featuring startup demos, product showcases, and operator-led sessions on real-world deployment.',
      priceLabel: 'A$45 ticket',
      timingLabel: 'Thu 6:00 PM',
      locationLabel: 'Sydney CBD',
      bestFor: 'Best for founders and operators wanting current AI market signals',
      badge: 'Featured',
      actionLabel: 'View event',
    },
  },
};

export const problemContent: SectionContent = {
  kicker: 'Problem',
  kickerClassName: 'text-indigo-400',
  title: 'SMEs lose revenue in the first 60 seconds.',
  body: 'Slow replies, weak qualification, and no clear next step let warm leads disappear before they book.',
};

export const proofContent: ProofContent = {
  channels: [
    'Demand capture',
    'Intent qualification',
    'Booking conversion',
    'Operator control',
  ],
  section: {
    kicker: 'Product proof',
    kickerClassName: 'text-sky-400',
    title: 'One product surface that explains the business in seconds',
    body: 'BookedAI is easiest to trust when the product story is simple: demand enters, intent is structured, the right next action becomes obvious, and the workflow remains commercially accountable after the conversation.',
  },
};

export const proofItems: ProofItem[] = [
  {
    eyebrow: 'Demand control',
    title: 'Capture high-intent enquiries before they cool down',
    body: 'Every enquiry enters one visible lane so the business can respond faster without losing signal across channels or staff handoffs.',
  },
  {
    eyebrow: 'Decision quality',
    title: 'Make fit, urgency, and next action legible early',
    body: 'BookedAI structures the request early so buyers and operators can see the strongest next move without extra back-and-forth.',
  },
  {
    eyebrow: 'Revenue continuity',
    title: 'Keep booking, payment, and follow-up attached to one system',
    body: 'The workflow remains connected after the conversation, which is what makes the product feel enterprise-ready instead of demo-only.',
  },
];

export const showcaseContent: SectionContent = {
  kicker: 'Product Screens',
  kickerClassName: 'text-fuchsia-300',
  title: 'A closer look at the BookedAI experience',
  body: 'Real interface moments from the live demo help buyers picture how BookedAI captures enquiries, offers decision-ready options, and confirms the next commercial step without extra admin.',
};

export const showcaseImages: ShowcaseImage[] = [
  {
    src: '/bookedai-ui-shot-1.jpg',
    alt: 'BookedAI conversation interface showing a live salon enquiry',
    eyebrow: 'Enquiry',
    title: 'Customer asks for a wedding haircut booking',
  },
  {
    src: '/bookedai-ui-shot-2.jpg',
    alt: 'BookedAI interface presenting appointment choices for the customer',
    eyebrow: 'Options',
    title: 'BookedAI returns available times in a guided flow',
  },
  {
    src: '/bookedai-ui-shot-3.jpg',
    alt: 'BookedAI booking screen showing the booking confirmation state',
    eyebrow: 'Confirmation',
    title: 'The chosen slot is locked in with a clear confirmed state',
  },
];

export const problemCards: InfoCard[] = [
  {
    title: 'Slow response',
    body: 'The lead cools before anyone responds.',
  },
  {
    title: 'Weak qualification',
    body: 'Teams spend too long on back-and-forth before they know the fit.',
  },
  {
    title: 'No next step',
    body: 'Interest stalls when there is no obvious booking action.',
  },
];

export const solutionContent: SectionContent = {
  kicker: 'Solution',
  kickerClassName: 'text-emerald-400',
  title: 'One revenue flow from first message to booked outcome',
  body: 'Capture, qualify, recommend, book, and hand off in one visible commercial flow.',
};

export const implementationContent: SectionContent = {
  kicker: 'Implementation',
  kickerClassName: 'text-cyan-500',
  title: 'Launch with one clear commercial wedge, then expand into deeper enterprise operations',
  body: 'Start with a visible customer-facing booking flow, then extend into tenant workspaces, admin oversight, integrations, and automation without rebuilding the core revenue path.',
};

export const solutionCards: InfoCard[] = [
  {
    title: 'Instant response',
    body: 'Every channel gets a fast first reply with the same tone and service flow.',
  },
  {
    title: 'Smart qualification',
    body: 'The AI captures need, timing, and fit before staff need to step in.',
  },
  {
    title: 'Booking-ready handoff',
    body: 'The strongest option appears with the next step already clear.',
  },
];

export const flowSteps = [
  'Capture intent',
  'Qualify fit',
  'Rank the best option',
  'Book and follow up',
];

export const metrics: Metric[] = [
  { value: '+35%', label: 'More Bookings' },
  { value: '24/7', label: 'Reception Coverage' },
  { value: '0', label: 'Cold Leads' },
];

export const pricingContent: PricingContent = {
  kicker: 'Pricing',
  kickerClassName: 'text-indigo-400',
  title: 'Simple enough for SMEs to buy, structured enough for enterprise growth.',
  body: 'The commercial model is designed to stay easy to approve, easy to understand, and credible as the workflow deepens from demand capture into full revenue operations.',
  planLabel: 'Starting plan',
  planPrice: '49$+',
  planCaption: 'entry pricing for SMEs launching BookedAI on a clean customer flow',
  planFeatures: [
    'Plans start from 49$+',
    'Lightweight entry path for low-friction activation',
    '1 month free on Pro and Pro Max',
    'Setup fee quoted clearly when rollout scope needs it',
    'Commission charged only on successful BookedAI-attributed bookings',
  ],
  primaryCta: 'Open Web App',
  primaryHref: productHref,
};

export const ctaContent: CallToActionContent = {
  kicker: 'Call to action',
  title: 'Ready to replace fragmented enquiry handling with a cleaner revenue system?',
  body: 'Open the live responsive web app or talk to us about the rollout path that best fits your operating maturity, customer volume, and growth ambition.',
  primaryCta: 'Open Web App',
  secondaryCta: 'Talk to Sales',
  primaryHref: productHref,
  secondaryHref: '/register-interest',
  supportingText:
    'Prefer to start with access and workspace setup? Use the tenant gateway to continue with Google or password, or go straight to roadmap and operator surfaces from the homepage menu.',
};

export const trustItems: TrustItem[] = [
  {
    name: 'Ava',
    business: 'Clinic manager, Inner West',
    quote:
      'BookedAI made after-hours enquiries feel covered instead of lost. We stopped waking up to a messy callback queue and started seeing clearer booking intent by morning.',
  },
  {
    name: 'Marcus',
    business: 'Salon owner, Surry Hills',
    quote:
      'The value was not just the chat. It moved real customers toward the right service and left the team only the exceptions worth handling.',
  },
  {
    name: 'Priya',
    business: 'Operations lead, mobile trades team',
    quote:
      'It felt closer to a revenue workflow than a generic AI widget. We could see what was qualified, what needed follow-up, and where the commercial handoff should happen.',
  },
];

export const faqItems: FAQItem[] = [
  {
    question: 'How does the Starter entry layer work?',
    answer:
      'Starter is the low-friction entry layer for teams that want to validate demand capture, response quality, and booking flow fit quickly. When the operating case is proven, the path into Pro or Pro Max is already visible.',
  },
  {
    question: 'What does the commercial model look like after the launch offer?',
    answer:
      'After the first 10-SME free setup cohort, BookedAI charges a clearly scoped setup fee, then a monthly operating plan, and only adds commission when BookedAI is helping generate real booked outcomes through the installed flow.',
  },
  {
    question: 'Does this expand into a real operator and tenant workflow, or stay as a front-end widget?',
    answer:
      'It expands into a real workflow. SMEs can use the tenant gateway for account creation and Google login, while operators and internal teams can continue into tenant and admin workflows as the rollout matures.',
  },
];

export const teamSectionContent: SectionContent = {
  kicker: 'Team Members',
  kickerClassName: 'text-indigo-400',
  title: 'Built by operators, engineers, and founders who care about real operating systems',
  body: 'BookedAI combines technical depth, workflow thinking, and commercial pragmatism to build AI products that can move beyond demo novelty and survive real rollout conditions.',
};

export const teamMembers: TeamMember[] = [
  {
    name: 'Do Van Long',
    role: 'CEO',
    imageSrc: 'https://upload.bookedai.au/images/e40f/k262gljWOBBiDXdMf6hfCA.png',
    imageAlt: 'Portrait of Do Van Long',
    badges: ['CEO', 'AI Builder', 'Former CTO', 'Tech Founder'],
    bio: 'Do Van Long is the CEO of BookedAI, a former CTO, and a tech founder with 26 years of experience building digital products, platforms, and technology ventures. He focuses on turning emerging technology into practical products that can scale in real operating environments.',
  },
  {
    name: 'Angus Hoy',
    role: 'CTO',
    imageSrc: 'https://upload.bookedai.au/images/da31/Wlht-j7K3zXyML3hYqnn8A.png',
    imageAlt: 'Portrait of Angus Hoy',
    badges: ['CTO', 'Systems Engineering', 'Backend & AI'],
    bio: 'Studied computer science and mathematics at the University of Melbourne. Worked as a freelancer for a few years, then in embedded systems developing motor drive PCBs. Currently works at a fraud detection scale-up doing backend Python development.',
  },
  {
    name: 'Yogesh Kumar',
    role: 'COO',
    imageSrc: 'https://upload.bookedai.au/images/3cd9/gOd4m5mT7aQilr_RySfoTQ.png',
    imageAlt: 'Portrait of Yogesh Kumar',
    badges: ['COO', 'Operations', 'IT & Markets'],
    bio: 'Master of IT from Queensland University of Technology with 6 years of experience in financial markets. Currently works as an IT Engineer at ASX and is also an AI enthusiast.',
  },
  {
    name: 'Tommy Dam',
    role: 'CMO',
    imageSrc: 'https://upload.bookedai.au/images/5a63/bISqviktp9_R_jFQwcTBew.jpg',
    imageAlt: 'Portrait of Tommy Dam',
    badges: ['CMO', 'Quality Systems', 'Service Growth'],
    bio: 'Bachelor of Science with a major in Chemistry. Worked in manufacturing of medical devices as a QA chemist, quality assurance for laboratory services in clinical trials, and quality assurance for NDIS and aged care service providers. Currently works in the NDIS and aged care industry.',
  },
];

export const videoDemoContent: VideoDemoContent = {
  kicker: 'Demo',
  title: 'See the booking flow in one short pass',
  body: 'A compact demo of enquiry, recommendation, and booking-ready handoff before you decide how to deploy it.',
  highlights: [
    'Natural request in, clear match out',
    'Real options instead of vague replies',
    'A confirmed next step at the end',
  ],
  primaryCta: 'Watch Demo Hub',
  primaryHref: videoDemoHref,
  secondaryCta: 'Book Live Demo',
  secondaryHref: demoCtaHref,
};

export const bookingAssistantContent: BookingAssistantContent = {
  kicker: '',
  kickerClassName: 'text-rose-400',
  title: '',
  body: '',
  searchPlaceholder: 'What are you looking to book? e.g. salon, clinic, restaurant, swim class...',
  formIntro: '',
  submitLabel: 'Confirm Booking Request',
};

export const partnersSectionContent: PartnersSectionContent = {
  kicker: 'Partners & Clients',
  kickerClassName: 'text-emerald-500',
  title: 'Trusted partners across ecosystem, customers, and infrastructure',
  body: 'BookedAI is supported by launch collaborators, active customer partners, and infrastructure platforms that power CRM, email, AI, payments, workflow automation, and backend operations.',
  stats: [
    'Each partner appears once with one logo and one concise trust description',
    'Infrastructure support includes CRM, email, cloud, AI, payment, workflow, and backend foundations',
    'Responsive trust wall tuned for buyers, investors, and SME operators reviewing the product story',
  ],
  emptyTitle: 'Your partner wall is ready',
  emptyBody:
    'Upload logos and images from admin.bookedai.au to start showcasing customers, strategic partners, and launch collaborators here.',
};

export const technicalArchitectureContent: TechnicalArchitectureContent = {
  kicker: 'Technical Architecture',
  kickerClassName: 'text-slate-500',
  title: 'A layered booking platform designed to stay calm under real operational load',
  body: 'The BookedAI architecture is designed as a clean operating system for enquiry capture, AI reasoning, booking fulfilment, and operational visibility.',
  lead:
    'Each layer has a single job, clear handoff boundaries, and traceable ownership so the product can scale without turning the booking flow into a black box.',
  principles: [
    {
      title: 'Composable by default',
      body: 'Every capability is split into focused services so channel, AI, booking, and reporting can evolve without creating coupling debt.',
    },
    {
      title: 'Operator-visible state',
      body: 'Critical booking transitions are observable from the admin surface so staff can review, correct, and trust what the system is doing.',
    },
    {
      title: 'Workflow-safe handoffs',
      body: 'Conversation output is normalized before it reaches payment, calendar, CRM, and follow-up systems to reduce booking drift.',
    },
  ],
  layers: [
    {
      name: 'Experience Layer',
      summary: 'Customer-facing touchpoints and internal operator surfaces.',
      items: [
        {
          name: 'Public landing and demo flows',
          description: 'Hero, product proof, pricing, and conversion sections that explain and trigger the booking journey.',
          status: 'In Progress',
        },
        {
          name: 'AI booking assistant',
          description: 'Guided chat entry point for service discovery, qualification, and booking capture.',
          status: 'Completed',
        },
        {
          name: 'Embedded booking widgets',
          description: 'Floating and inline entry points that keep the assistant accessible across the site.',
          status: 'Completed',
        },
        {
          name: 'Admin dashboard',
          description: 'Operational interface for bookings, partner content, imported services, and live diagnostics.',
          status: 'Completed',
        },
        {
          name: 'Demo and video storytelling',
          description: 'Pre-sales product education that bridges marketing into product interaction.',
          status: 'In Progress',
        },
      ],
    },
    {
      name: 'Application Layer',
      summary: 'Domain logic that turns raw conversations into booking-ready outcomes.',
      items: [
        {
          name: 'Lead qualification engine',
          description: 'Collects intent, timing, contact details, and service fit before a booking is committed.',
          status: 'In Progress',
        },
        {
          name: 'Booking orchestration',
          description: 'Coordinates booking creation, payment state, confirmation, and workflow progression.',
          status: 'Completed',
        },
        {
          name: 'Partner and service catalog management',
          description: 'Stores offer metadata, imported service information, and featured partner presentation logic.',
          status: 'In Progress',
        },
        {
          name: 'Review and drift analysis',
          description: 'Compares expected booking fields with downstream state to surface mismatches early.',
          status: 'Planned',
        },
        {
          name: 'Notification and confirmation services',
          description: 'Handles outbound updates, confirmation notes, and customer-facing follow-up events.',
          status: 'Completed',
        },
      ],
    },
    {
      name: 'AI and Automation Layer',
      summary: 'Reasoning, routing, and workflow execution that keep the funnel responsive.',
      items: [
        {
          name: 'Intent understanding',
          description: 'Interprets customer requests and maps them into service and scheduling signals.',
          status: 'In Progress',
        },
        {
          name: 'Conversation state management',
          description: 'Maintains the active booking context across messages, forms, and assisted flows.',
          status: 'In Progress',
        },
        {
          name: 'Workflow routing rules',
          description: 'Directs simple paths to automation and sends high-risk conversations to human review.',
          status: 'Planned',
        },
        {
          name: 'Automation triggers',
          description: 'Starts reminder, onboarding, CRM, and operational sequences after key booking milestones.',
          status: 'Completed',
        },
        {
          name: 'Quality feedback loops',
          description: 'Feeds admin review outcomes back into prompt, logic, and workflow tuning.',
          status: 'Planned',
        },
      ],
    },
    {
      name: 'Data and Integration Layer',
      summary: 'Persistence, third-party systems, and observability required for production reliability.',
      items: [
        {
          name: 'Booking records and audit trails',
          description: 'Stores booking references, lifecycle events, review notes, and status history.',
          status: 'Completed',
        },
        {
          name: 'Payments integration',
          description: 'Links paid flows to booking state so commercial conversion is visible and recoverable.',
          status: 'In Progress',
        },
        {
          name: 'Calendar and scheduling connectors',
          description: 'Keeps confirmed bookings aligned with availability and follow-up timing.',
          status: 'In Progress',
        },
        {
          name: 'Growth and partner content APIs',
          description: 'Supports the landing page, featured partner wall, and promotional content management.',
          status: 'Completed',
        },
        {
          name: 'Operational telemetry',
          description: 'Captures metrics, recent events, API inventory, and configuration visibility for support.',
          status: 'Planned',
        },
      ],
    },
  ],
  techStackCategories: [
    {
      name: 'Frontend Experience',
      items: [
        { name: 'React', detail: 'Component architecture for both public and admin applications.', status: 'Completed' },
        { name: 'TypeScript', detail: 'Strong typing across UI state, contracts, and rendering logic.', status: 'Completed' },
        { name: 'Tailwind CSS', detail: 'Utility-first styling for fast, consistent visual composition.', status: 'Completed' },
        { name: 'Vite', detail: 'Fast local iteration and lean production builds.', status: 'Completed' },
        { name: 'Responsive design system', detail: 'Shared visual language across landing, demo, and dashboard surfaces.', status: 'In Progress' },
      ],
    },
    {
      name: 'AI and Workflow Orchestration',
      items: [
        { name: 'LLM-driven intent handling', detail: 'Transforms natural-language requests into booking-ready structure.', status: 'In Progress' },
        { name: 'n8n workflows', detail: 'Automates follow-up, reminders, and downstream business processes.', status: 'Completed' },
        { name: 'Prompt and routing layer', detail: 'Controls when the assistant answers, escalates, or requests more context.', status: 'In Progress' },
        { name: 'State transition guards', detail: 'Keeps automation steps aligned with booking lifecycle rules.', status: 'Planned' },
        { name: 'Human review feedback loop', detail: 'Lets operations teams improve workflow quality from real cases.', status: 'Planned' },
      ],
    },
    {
      name: 'Backend and API Platform',
      items: [
        { name: 'Typed API contracts', detail: 'Shared interfaces for bookings, growth, CRM, email, and integrations.', status: 'In Progress' },
        { name: 'Booking management services', detail: 'Handles booking reads, details, and confirmation actions.', status: 'Completed' },
        { name: 'Partner asset upload pipeline', detail: 'Supports logo and image management from the admin dashboard.', status: 'Completed' },
        { name: 'Authentication session flow', detail: 'Protects operator actions and dashboard access.', status: 'Completed' },
        { name: 'Route inventory and config endpoints', detail: 'Exposes system topology for operational review.', status: 'Completed' },
      ],
    },
    {
      name: 'Infrastructure and Operations',
      items: [
        { name: 'Payment infrastructure', detail: 'Commercial checkout and payment status tracking.', status: 'In Progress' },
        { name: 'Email delivery', detail: 'Confirmation and lifecycle communication pipeline.', status: 'Completed' },
        { name: 'Cloud asset hosting', detail: 'Serves uploaded media and static product assets.', status: 'Completed' },
        { name: 'Observability dashboard', detail: 'Surfaces recent events, drift metrics, and runtime signals.', status: 'In Progress' },
        { name: 'Deployment workflow', detail: 'Supports iterative releases across public and admin surfaces.', status: 'Completed' },
      ],
    },
  ],
};

export const roadmapContent: RoadmapContent = {
  kicker: 'Roadmap',
  kickerClassName: 'text-slate-500',
  title: 'A delivery plan that keeps core journeys stable while turning the homepage into a sharper SME acquisition surface',
  body: 'The roadmap now puts dependable user, tenant, admin, search, payment, email-confirmation, and portal-revisit flows first, while also keeping the public homepage clear enough to convert SMEs, reassure investors, and route traffic into the right runtime.',
  lead:
    'The roadmap now reads in priority order: lock the core journey first, keep the homepage concise and commercially clear, route live product intent into product.bookedai.au, bring real SMEs in through standalone or full-portal paths, refine each module second, review advanced, legal, and role-shaped data third, then keep release hardening running underneath every step.',
  architectures: [
    {
      title: 'Customer experience architecture',
      body: 'Landing, demo, assistant, and conversion flows designed to move users from curiosity to confirmed booking with minimal friction.',
    },
    {
      title: 'Booking operations architecture',
      body: 'Admin review, service import, partner management, and confirmation workflows designed for real operator control.',
    },
    {
      title: 'AI orchestration architecture',
      body: 'Intent understanding, qualification logic, routing, and automation handoff structured as reusable services.',
    },
    {
      title: 'Data and integration architecture',
      body: 'Payments, calendar, CRM, notifications, and telemetry connected through typed contracts and auditable state.',
    },
  ],
  roleGroups: [
    {
      name: 'Leadership and Planning',
      clusterLabel: 'Strategic layer',
      windowLabel: 'Foundation -> Scale',
      summary:
        'The delivery model starts with strategic roles that set architecture direction, product priorities, and business framing before execution fans out into specialist agents.',
      roles: [
        {
          name: 'Principal Architect',
          track: 'System direction',
          body: 'Owns the platform blueprint, module boundaries, execution sequencing, and long-range technical trade-offs across the product.',
          status: 'Completed',
        },
        {
          name: 'Product Manager',
          track: 'Scope and outcomes',
          body: 'Shapes feature priorities, roadmap phases, and release outcomes so landing, assistant, and booking flows stay commercially aligned.',
          status: 'In Progress',
        },
        {
          name: 'Business Analyst',
          track: 'Process mapping',
          body: 'Maps SME booking scenarios, service edge cases, funnel requirements, and operational dependencies into build-ready workflows.',
          status: 'In Progress',
        },
      ],
    },
    {
      name: 'Experience and Product Delivery',
      clusterLabel: 'Customer surfaces',
      windowLabel: 'Phase 1 -> Phase 3',
      summary:
        'These roles convert product intent into a usable buying journey, a confident mobile booking flow, and operator-friendly interfaces.',
      roles: [
        {
          name: 'UI/UX Designer',
          track: 'Interaction design',
          body: 'Designs premium landing pages, mobile-first chat experiences, product storytelling, and clearer booking trust signals.',
          status: 'In Progress',
        },
        {
          name: 'Frontend Engineer',
          track: 'Customer surfaces',
          body: 'Builds the landing page, public assistant, roadmap presentation, and responsive interfaces that stay polished on mobile and desktop.',
          status: 'In Progress',
        },
        {
          name: 'Sales and Marketing',
          track: 'Go-to-market narrative',
          body: 'Turns product capability into conversion messaging, proof assets, ecosystem positioning, and demo-led acquisition flows.',
          status: 'Planned',
        },
      ],
    },
    {
      name: 'Platform and Intelligence',
      clusterLabel: 'Core platform',
      windowLabel: 'Phase 1 -> Phase 4',
      summary:
        'Core engineering roles power the booking engine, AI reasoning, integrations, and infrastructure that move a conversation into an operationally valid booking.',
      roles: [
        {
          name: 'Backend Engineer',
          track: 'Service orchestration',
          body: 'Implements booking APIs, workflow state, admin data services, contracts, and downstream handoff logic.',
          status: 'Completed',
        },
        {
          name: 'AI Engineer',
          track: 'Reasoning and prompts',
          body: 'Builds intent understanding, routing logic, assisted matching, and prompt iteration for vertical booking scenarios.',
          status: 'In Progress',
        },
        {
          name: 'Data Matching Engineer',
          track: 'Ranking and fit',
          body: 'Improves service search, ranking confidence, fallback logic, and match quality for high-intent customer requests.',
          status: 'In Progress',
        },
        {
          name: 'Cloud Engineer',
          track: 'Hosting and assets',
          body: 'Maintains hosting topology, delivery environments, storage, and production-grade operational pathways.',
          status: 'In Progress',
        },
        {
          name: 'DevOps Engineer',
          track: 'Release reliability',
          body: 'Owns CI/CD, deployment scripts, runtime health checks, configuration safety, and release discipline.',
          status: 'In Progress',
        },
      ],
    },
    {
      name: 'Quality and Validation',
      clusterLabel: 'Release safety',
      windowLabel: 'Phase 2 -> Phase 4',
      summary:
        'Quality roles make sure automation is trustworthy, regressions are visible, and production behavior remains safe as the system expands.',
      roles: [
        {
          name: 'QA Engineer',
          track: 'Scenario coverage',
          body: 'Validates end-to-end booking flows, feature acceptance, regression coverage, and user-facing reliability.',
          status: 'In Progress',
        },
        {
          name: 'QC Specialist',
          track: 'Output quality',
          body: 'Reviews content polish, booking result quality, operational consistency, and presentation standards before release.',
          status: 'Planned',
        },
        {
          name: 'Test Engineer',
          track: 'Automation and verification',
          body: 'Builds repeatable test suites for route contracts, booking orchestration, UI flows, and release confidence.',
          status: 'In Progress',
        },
      ],
    },
    {
      name: 'Active Agent Coordination',
      clusterLabel: 'Sprint control',
      windowLabel: 'Current execution wave',
      summary:
        'This coordination cluster keeps the sprint plan coherent, sequences specialist work, and ties roadmap language back to implementation reality without letting the execution board sprawl.',
      roles: [
        {
          name: 'PM Integrator',
          track: 'Sprint coordination',
          body: 'Coordinates sprint slicing, integrates specialist outputs, resolves cross-module conflicts, and keeps roadmap and progress artifacts synchronized with the codebase.',
          status: 'In Progress',
        },
        {
          name: 'Member D',
          track: 'Release readiness',
          body: 'Owned release-readiness framing and rollout contract alignment for the selective live-read and Prompt 10/11 wave.',
          status: 'Completed',
        },
        {
          name: 'Member D1',
          track: 'Docs and rollout wording',
          body: 'Owned release-readiness wording and rollout documentation cleanup.',
          status: 'Completed',
        },
        {
          name: 'Member I',
          track: 'CI release gate planning',
          body: 'Owns planning for the CI-ready build, smoke, and backend verification gate before wider rollout promotion.',
          status: 'Completed',
        },
        {
          name: 'Member I2',
          track: 'Root release gate script',
          body: 'Owns the root-level release gate script and command-order standardization so frontend smoke and backend lifecycle checks run as one promote-or-hold command.',
          status: 'Completed',
        },
        {
          name: 'Member I3',
          track: 'Release gate checklist',
          body: 'Owns the promote, hold, and rollback checklist framing around the root release gate so the script becomes an operational decision contract, not just a command.',
          status: 'Completed',
        },
      ],
    },
    {
      name: 'Active Backend and Integration Agents',
      clusterLabel: 'Backend execution',
      windowLabel: 'Prompt 5 -> Prompt 11 wave',
      summary:
        'These agent lanes carry the typed v1 backend, lifecycle orchestration, and integration reconciliation work that sits behind the public and admin surfaces.',
      roles: [
        {
          name: 'Worker A',
          track: 'Prompt 5 backend contracts',
          body: 'Owned backend Prompt 5 contract foundations and additive API groundwork for the v1 path.',
          status: 'Completed',
        },
        {
          name: 'Worker B',
          track: 'Prompt 5 route lane',
          body: 'Owned the backend v1 route implementation lane before final route integration was consolidated in the main execution path.',
          status: 'Completed',
        },
        {
          name: 'Worker C',
          track: 'Prompt 5 frontend contracts',
          body: 'Owned shared frontend Prompt 5 contracts and the typed API v1 client layer used by later public/admin adoption work.',
          status: 'Completed',
        },
        {
          name: 'Member A',
          track: 'Prompt 10 lifecycle writes',
          body: 'Owned lifecycle orchestration and write-side CRM or email foundations for Prompt 10 execution.',
          status: 'Completed',
        },
        {
          name: 'Member B',
          track: 'Prompt 11 read models',
          body: 'Owned Prompt 11 attention queue and reconciliation read-model implementation.',
          status: 'Completed',
        },
        {
          name: 'Member H',
          track: 'Prompt 10 CRM retry ledger',
          body: 'Owns additive CRM retry truth and the first operator-visible Prompt 11 surfacing for queued `retrying` state.',
          status: 'In Progress',
        },
        {
          name: 'Member H2',
          track: 'CRM retry preview control',
          body: 'Owns the additive admin preview control for queueing CRM retry work against a known record ID without widening live admin flows.',
          status: 'Completed',
        },
        {
          name: 'Member H3',
          track: 'CRM retry drill-in',
          body: 'Owns the operator retry drill-in card that summarizes queued retry load, latest signal, and backlog interpretation inside the admin preview.',
          status: 'Completed',
        },
        {
          name: 'Member H4',
          track: 'CRM retry summary pills',
          body: 'Owns the retry-state summary pills and quick operator cues that make CRM retry posture scannable before deeper drill-in.',
          status: 'Completed',
        },
        {
          name: 'Member J',
          track: 'Admin workspace split',
          body: 'Owns the Prompt 8 admin workspace split so operations, catalog, and reliability become separate views instead of one long dashboard.',
          status: 'Completed',
        },
        {
          name: 'Member J2',
          track: 'Admin runtime linkage',
          body: 'Owns explicit frontend runtime linkage for admin.bookedai.au so the dedicated admin host resolves its API base cleanly.',
          status: 'Completed',
        },
        {
          name: 'Member K',
          track: 'Reliability workspace summaries',
          body: 'Owns reliability workspace triage summaries built from existing Prompt 5, Prompt 11, config, and route signals.',
          status: 'Completed',
        },
        {
          name: 'Member L',
          track: 'Workspace insight cards',
          body: 'Owns issue-first workspace insight cards and hash deep-link behavior so each admin workspace is easier to enter directly.',
          status: 'Completed',
        },
        {
          name: 'Member M',
          track: 'Workspace deep-link QA',
          body: 'Owns smoke coverage for workspace navigation and direct reliability deep-link entry.',
          status: 'Completed',
        },
        {
          name: 'Member N',
          track: 'Reliability panel deep-links',
          body: 'Owns deep-link framing for reliability panels such as prompt preview, config, and route inventory without introducing a heavy router rewrite.',
          status: 'Completed',
        },
        {
          name: 'Member O',
          track: 'Issue-first panel IA',
          body: 'Owns issue-first panel naming and deep-link posture for the Prompt 8 admin information architecture.',
          status: 'Completed',
        },
        {
          name: 'Member P',
          track: 'Panel deep-link QA',
          body: 'Owns smoke coverage for panel-level deep-link behavior inside the admin runtime.',
          status: 'Completed',
        },
      ],
    },
    {
      name: 'Active Frontend and Rollout Agents',
      clusterLabel: 'Frontend rollout',
      windowLabel: 'Prompt 5 adoption wave',
      summary:
        'These lanes focus on operator visibility, public rollout sequencing, and the UX surfaces that make the additive v1 path understandable during staged adoption.',
      roles: [
        {
          name: 'Member D2',
          track: 'Admin rollout visibility',
          body: 'Owned the operator-facing rollout-mode strip and admin support visibility recommendations.',
          status: 'Completed',
        },
        {
          name: 'Member D3',
          track: 'Smoke gap verification',
          body: 'Owned browser smoke-gap verification and follow-up harness recommendations.',
          status: 'Completed',
        },
        {
          name: 'Member C',
          track: 'Selective live-read adoption',
          body: 'Owned public assistant live-read rollout while preserving legacy-authoritative write behavior.',
          status: 'Completed',
        },
        {
          name: 'Member G',
          track: 'Protected-action re-auth planning',
          body: 'Owns planning for admin protected-action re-auth recovery on mutation failures.',
          status: 'In Progress',
        },
        {
          name: 'Member G2',
          track: 'Booking confirm re-auth slice',
          body: 'Owns the first protected mutation slice using manual confirmation email as the representative re-auth path.',
          status: 'Completed',
        },
        {
          name: 'Member G3',
          track: 'Second mutation re-auth slice',
          body: 'Owns the second representative protected mutation path using partner create/save re-auth coverage after the booking confirmation slice.',
          status: 'Completed',
        },
        {
          name: 'Raman',
          track: 'Demo sync fallback QA reconnaissance',
          body: 'Mapped the smallest useful demo sync fallback and prolonged-wait hardening slice before the next QA sprint was implemented.',
          status: 'Completed',
        },
        {
          name: 'Hegel',
          track: 'Admin expiry QA reconnaissance',
          body: 'Mapped the smallest useful admin session-expiry and re-auth hardening slice before the next auth sprint was implemented.',
          status: 'Completed',
        },
      ],
    },
    {
      name: 'Active QA and Recon Agents',
      clusterLabel: 'Verification',
      windowLabel: 'Release-gate wave',
      summary:
        'These reconnaissance and QA agents compress the selector audit, smoke-gap discovery, and route-stub planning work so each sprint can ship with targeted verification instead of broad, slow exploration.',
      roles: [
        {
          name: 'Halley',
          track: 'Admin bookings QA reconnaissance',
          body: 'Mapped stable selectors and review-path risks for admin booking triage, drift review, confirmation follow-up, and the partner-create re-auth slice.',
          status: 'Completed',
        },
        {
          name: 'Meitner',
          track: 'Payment and confirmation QA reconnaissance',
          body: 'Mapped stable selectors and success-state expectations for public assistant payment and confirmation coverage.',
          status: 'Completed',
        },
        {
          name: 'Locke',
          track: 'Pricing and demo QA reconnaissance',
          body: 'Mapped the pricing consultation flow, post-payment banner states, demo brief flow, and browser-test route stubs for public conversion QA.',
          status: 'Completed',
        },
        {
          name: 'Socrates',
          track: 'Admin filter/search QA reconnaissance',
          body: 'Mapped admin search, filters, date slicing, query propagation, and selected-booking refresh behavior for regression smoke coverage.',
          status: 'Completed',
        },
        {
          name: 'Mencius',
          track: 'Retry and reconciliation reconnaissance',
          body: 'Mapped the smallest useful provider-side retry and reconciliation slice around Prompt 10 CRM retry truth and the first admin preview surfacing for queued retries.',
          status: 'Completed',
        },
        {
          name: 'Nash',
          track: 'Release-gate smoke stabilization',
          body: 'Mapped early smoke flake risk around pricing-flow timing so the local release gate could be stabilized without widening test scope.',
          status: 'Completed',
        },
      ],
    },
  ],
  phases: [
    {
      name: 'Phase 1',
      timing: 'Core Stability',
      windowLabel: 'Priority 1',
      focusLabel: 'Simple but stable public, tenant, admin, search, payment, email, portal revisit, and public brand pull',
      milestoneLabel: 'The repo already has the main surfaces; the priority is making the end-to-end flow dependable while keeping the public layer attractive to investors, users, and real SME customers',
      summary: 'Lock the simplest user-visible journeys first so public users, tenants, and admins can all complete the core flow reliably, while the public-facing brand still feels premium and commercially convincing.',
      tasks: [
        { title: 'Turn homepage into the main public acquisition surface and route deeper app interaction into product and demo surfaces', status: 'Completed' },
        { title: 'Add launch-offer CTA for free online setup for the first 10 SME customers', status: 'Completed' },
        { title: 'Rename public package vocabulary to Freemium, Pro, and Pro Max with clearer SME benefits', status: 'Completed' },
        { title: 'Expose direct public entry links for roadmap, tenant, admin login, and tenant Google auth entry', status: 'Completed' },
        { title: 'Add QR-led and email-led interested-registration flow that feeds the BookedAI setup and pricing path', status: 'Planned' },
        { title: 'Keep public, tenant, and admin entry flows simple and stable before adding more surface area', status: 'In Progress' },
        { title: 'Make search accurate enough to show the correct results and render them consistently', status: 'In Progress' },
        { title: 'Protect the booking handoff, payment flow, and confirmation email as one dependable chain', status: 'In Progress' },
        { title: 'Keep the customer portal revisit flow reachable through QR and resilient after confirmation', status: 'Planned' },
        { title: 'Preserve premium branding and investor-facing clarity on the public surface while hardening the core flow', status: 'In Progress' },
        { title: 'Bring real SME customers live first through standalone mode or linked full-portal paths for validation', status: 'Planned' },
        { title: 'Stabilize shared contracts so public, tenant, and admin all read the same booking truth', status: 'In Progress' },
        { title: 'Preserve operator visibility for recent events, route inventory, and reliability checks', status: 'Completed' },
      ],
    },
    {
      name: 'Phase 2',
      timing: 'Module Refinement',
      windowLabel: 'Priority 2',
      focusLabel: 'Refine each module in detail after the core journey is stable',
      milestoneLabel: 'Search, portal, payment, tenant, and admin foundations exist; the next step is sharper module-level quality',
      summary: 'Upgrade each module one by one so the product becomes clearer, deeper, and more operationally complete without destabilizing the core flow.',
      tasks: [
        { title: 'Deepen search ranking, trust diagnostics, and operator feedback loops without changing the stable core path', status: 'In Progress' },
        { title: 'Refine tenant workspace details, onboarding templates, and catalog publishing workflows', status: 'Planned' },
        { title: 'Refine admin workspaces, diagnostics, retry drill-ins, and issue-first tooling by module', status: 'In Progress' },
        { title: 'Improve payment recovery, lifecycle messaging, and portal detail UX in focused slices', status: 'In Progress' },
        { title: 'Broaden pricing, package, and CRM milestone modules only after the main flow stays dependable', status: 'Planned' },
        { title: 'Expand reporting, attribution, and visibility cards where operators need clearer detail', status: 'Planned' },
      ],
    },
    {
      name: 'Phase 3',
      timing: 'Advanced and Legal',
      windowLabel: 'Priority 3',
      focusLabel: 'Review advanced features, legal readiness, and per-user-group data detail after the platform is dependable',
      milestoneLabel: 'Advanced orchestration should wait until the stable flow and module detail layers are already working well',
      summary: 'Only after the product is stable and refined should advanced workflows, legal review, and detailed data shaping per user group become the main focus.',
      tasks: [
        { title: 'Review advanced routing, recovery, and automation features only after simpler flows are stable', status: 'Planned' },
        { title: 'Audit legal, consent, privacy, and policy requirements across booking, payment, email, and portal surfaces', status: 'Planned' },
        { title: 'Define more detailed field sets and visibility rules for each user group', status: 'In Progress' },
        { title: 'Refine role matrix, permission boundaries, and tenant-scoped data behavior', status: 'In Progress' },
        { title: 'Harden auditability for advanced workflows before broadening automation power', status: 'Planned' },
      ],
    },
    {
      name: 'Phase 4',
      timing: 'Release and Scale',
      windowLabel: 'Cross-cutting support',
      focusLabel: 'Release gates, retry truth, observability, and scale guardrails that support all three priority phases',
      milestoneLabel: 'Admin reliability workspace and release-gate foundations are already active and should stay underneath every phase',
      summary: 'Keep release discipline, operational safety, and production readiness running continuously while the phased priorities advance.',
      tasks: [
        { title: 'Add deployment health and release-readiness checklists', status: 'In Progress' },
        { title: 'Track conversion, fulfilment, and drift metrics end to end', status: 'In Progress' },
        { title: 'Automate configuration audits for integrations and live flows', status: 'In Progress' },
        { title: 'Improve asset, content, and partner publishing workflow', status: 'In Progress' },
        { title: 'Formalize failure recovery paths for email, payment, and booking sync', status: 'In Progress' },
        { title: 'Prepare multi-tenant operational guardrails for broader market expansion', status: 'In Progress' },
        { title: 'Extend QA coverage into admin filter/search, pricing, and demo regression slices', status: 'Completed' },
        { title: 'Cover demo pending-sync and admin session/logout regression paths', status: 'Completed' },
        { title: 'Cover explicit session-expiry, re-auth, and demo fallback/prolonged-wait regression paths', status: 'Completed' },
        { title: 'Extend protected-action re-auth and provider-side retry/reconciliation coverage next', status: 'In Progress' },
        { title: 'Package build, smoke, and backend lifecycle checks into a CI-ready release gate', status: 'Completed' },
        { title: 'Expose additive CRM retry preview controls for operator verification without widening live admin flows', status: 'Completed' },
        { title: 'Add operator retry drill-in and promote-or-hold release checklist around the gate', status: 'Completed' },
        { title: 'Add retry-state summary pills so CRM retry posture is scannable in the admin preview', status: 'Completed' },
        { title: 'Split admin into operations, catalog, and reliability workspaces with explicit admin host linkage', status: 'Completed' },
        { title: 'Add issue-first workspace insights and direct reliability deep-link entry for admin.bookedai.au', status: 'Completed' },
        { title: 'Deepen Prompt 8 toward panel-level admin entry without replacing backend seams or adding a heavyweight router', status: 'Completed' },
        { title: 'Deepen Prompt 11 reliability triage with additive operator-action lanes, retry posture, and source slices', status: 'Completed' },
        { title: 'Split Reliability into a more standalone admin module or view', status: 'Completed' },
        { title: 'Run a dedicated bundle-size reduction pass for the admin runtime', status: 'Completed' },
        { title: 'Add issue-first reliability triage launchers for operator action, config risk, and contract review', status: 'Completed' },
        { title: 'Push reliability deeper into issue-first drill-down views and continue admin chunk reduction', status: 'Completed' },
        { title: 'Split config-risk and contract-review panels into their own lazy drill-down modules and add operator notes or export cues', status: 'Completed' },
        { title: 'Stabilize direct hash-entry and panel-focus behavior for deeper lazy reliability modules', status: 'Completed' },
        { title: 'Deepen operator-note capture or export packaging for reliability triage follow-up', status: 'Completed' },
        { title: 'Continue admin chunk reduction or drill-down isolation if reliability outgrows the current three-lane split', status: 'Completed' },
        { title: 'Consider richer handoff packaging only if the current local note and export summary pattern proves too thin', status: 'Completed' },
        { title: 'Revisit handoff tooling only if operators need shared or server-backed note state', status: 'Planned' },
      ],
    },
  ],
  sprints: [
    {
      name: 'Sprint 1',
      phaseName: 'Phase 1',
      timing: 'Production baseline',
      status: 'Completed',
      windowLabel: 'M0 • Sprint 1-2',
      focusLabel: 'Lock production contracts, inventory flows, and release discipline',
      milestoneLabel: 'Baseline architecture and release framing are already in repo',
      summary: 'Production baseline and architectural inventory were locked first so the homepage can now be repositioned cleanly as a sales deck while deeper product behavior stays in dedicated runtimes.',
      evidence:
        'Architecture docs, roadmap page, deploy scripts, route inventory work, and release notes are already reflected in repo structure and documentation.',
      mainGap:
        'Keep contract inventory current and convert checklist-heavy release work into more automated gates.',
      nextPrompt: 'Prompt 13',
      ownerGroup: 'Coordination and release',
      agents: ['PM Integrator', 'Worker A', 'Worker C'],
      tasks: [
        { title: 'Complete route, webhook, env, and integration inventory', status: 'Completed' },
        { title: 'Document smoke and rollback checklist', status: 'Completed' },
        { title: 'Maintain production contract inventory as code evolves', status: 'In Progress' },
      ],
      links: [
        { label: 'MVP Sprint Execution Plan', href: '/roadmap#sprint-sequence' },
        { label: 'Implementation Progress', href: '/roadmap#sprint-sequence' },
      ],
      references: [
        {
          title: 'MVP Sprint Execution Plan',
          path: 'docs/architecture/mvp-sprint-execution-plan.md',
          summary: 'Canonical sprint-by-sprint baseline and gap list for the original MVP delivery rail.',
        },
        {
          title: 'Implementation Phase Roadmap',
          path: 'docs/architecture/implementation-phase-roadmap.md',
          summary: 'Phase-level operating picture that keeps sprint work aligned with the broader roadmap.',
        },
      ],
    },
    {
      name: 'Sprint 2',
      phaseName: 'Phase 1',
      timing: 'Internal modular foundation',
      status: 'In Progress',
      windowLabel: 'M0 • Sprint 2',
      focusLabel: 'Bound service seams, shared contracts, and adapter boundaries',
      milestoneLabel: 'Public/admin and backend modules are already split into safer seams',
      summary: 'This sprint establishes modular foundations so the homepage, product demo, registration path, and operational surfaces can evolve without collapsing back into one mixed shell.',
      evidence:
        '`frontend/src/features/admin/*`, `frontend/src/shared/contracts/*`, `backend/service_layer/*`, `backend/repositories/*`, and `backend/core/*` are already active.',
      mainGap:
        'Finish moving the remaining hotspot logic into stable seams and reduce duplicate contract ownership.',
      nextPrompt: 'Prompt 2, Prompt 5, Prompt 8',
      ownerGroup: 'Backend execution',
      agents: ['Worker A', 'Worker B', 'Worker C', 'PM Integrator'],
      tasks: [
        { title: 'Expand domain and repository seams across backend modules', status: 'In Progress' },
        { title: 'Reduce duplicated DTO handling in public and admin flows', status: 'In Progress' },
        { title: 'Keep new features landing in bounded modules instead of giant files', status: 'Completed' },
      ],
      riskNotes: ['Residual hotspot logic still exists in legacy handlers and a few shell-level integrations.'],
      references: [
        {
          title: 'Repo Module Strategy',
          path: 'docs/architecture/repo-module-strategy.md',
          summary: 'Module-boundary strategy behind the repository, service-layer, and route-shell split.',
        },
        {
          title: 'Prompt 5 API V1 Execution Package',
          path: 'docs/development/prompt-5-api-v1-execution-package.md',
          summary: 'Execution package that ties shared contracts and additive v1 seams into concrete rollout work.',
        },
      ],
    },
    {
      name: 'Sprint 3',
      phaseName: 'Phase 1',
      timing: 'Platform safety tables',
      status: 'In Progress',
      windowLabel: 'M1 • Sprint 3',
      focusLabel: 'Tenant-safe runtime foundations, auditability, and worker-safe write seams',
      milestoneLabel: 'Schema foundations are live and runtime adoption has started, but coverage is still uneven',
      summary: 'This sprint lays down platform-safety tables and starts moving them into real write and reliability paths so later domain work can stay rollout-safe.',
      evidence:
        'Migration `001`, tenant repository, feature-flag repository, audit or outbox repositories, webhook or idempotency seams, and first runtime adoption in v1 write or reliability paths are already live.',
      mainGap:
        'Standardize audit, idempotency, webhook, and outbox adoption across more callbacks, mutation paths, and worker producers instead of leaving coverage uneven.',
      nextPrompt: 'Prompt 4, Prompt 12, Prompt 13',
      ownerGroup: 'Backend execution',
      agents: ['PM Integrator', 'Worker A'],
      tasks: [
        { title: 'Apply and validate migration 001 safely', status: 'Completed' },
        { title: 'Expose default tenant anchor and feature-flag repository access', status: 'Completed' },
        { title: 'Integrate audit, idempotency, webhook, and outbox hooks into more runtime paths', status: 'In Progress' },
      ],
      riskNotes: [
        'Platform-safety tables exist, but uneven runtime adoption can still create blind spots when new write paths are added quickly.',
      ],
      references: [
        {
          title: 'Data Architecture Migration Strategy',
          path: 'docs/architecture/data-architecture-migration-strategy.md',
          summary: 'Tenant anchor, safety tables, and lifecycle-safe schema direction for audit and idempotency work.',
        },
        {
          title: 'Auth RBAC Multi-Tenant Security Strategy',
          path: 'docs/architecture/auth-rbac-multi-tenant-security-strategy.md',
          summary: 'Security and role framing for tenant-safe runtime evolution.',
        },
      ],
    },
    {
      name: 'Sprint 4',
      phaseName: 'Phase 1',
      timing: 'Dual-write mirrors',
      status: 'In Progress',
      windowLabel: 'M1 • Sprint 4',
      focusLabel: 'Mirror truth, drift visibility, and reconciliation-safe lifecycle normalization',
      milestoneLabel: 'Dual-write and drift visibility are real, but parity is not complete enough for read cutover',
      summary: 'Normalized mirrors are being written in parallel and surfaced through shadow diagnostics so future read-side cutovers can happen against comparable truth instead of assumptions.',
      evidence:
        '`backend/service_layer/booking_mirror_service.py`, dual-write coverage for booking or pricing or demo, admin shadow compare support, runtime activity, retry, replay, and backlog visibility are already present.',
      mainGap:
        'Finish callback-driven mirror updates and reconciliation coverage for payment, email, workflow, and meeting lifecycle state, then prove stronger parity.',
      nextPrompt: 'Prompt 3, Prompt 4, Prompt 10, Prompt 11',
      ownerGroup: 'Backend execution',
      agents: ['Member A', 'Member B', 'PM Integrator'],
      tasks: [
        { title: 'Dual-write booking assistant, pricing, and demo flows', status: 'Completed' },
        { title: 'Support reconciliation and shadow compare for normalized mirrors', status: 'Completed' },
        { title: 'Complete callback-driven lifecycle mirror normalization', status: 'In Progress' },
      ],
      riskNotes: [
        'Mirror depth is ahead of parity proof, so cutover decisions would still be premature without stronger lifecycle acceptance thresholds.',
      ],
      references: [
        {
          title: 'Phase 2-6 Detailed Implementation Package',
          path: 'docs/architecture/phase-2-6-detailed-implementation-package.md',
          summary: 'Detailed package for mirror writes, reconciliation, and lifecycle-safe additive rollout.',
        },
        {
          title: 'Prompt 5 To Prompt 11 Dependency Gap Map',
          path: 'docs/architecture/prompt-5-to-11-gap-map.md',
          summary: 'Crosswalk that explains why mirror truth and lifecycle normalization must land before richer sync behavior.',
        },
      ],
    },
    {
      name: 'Sprint 5',
      phaseName: 'Phase 1',
      timing: 'Domain API v1 foundation',
      status: 'Completed',
      windowLabel: 'M2 • Sprint 5',
      focusLabel: 'Additive `/api/v1/*`, shared contracts, and domain-first delivery seams',
      milestoneLabel: 'Prompt 5 v1 routes and typed clients are already live and now act as the base for Phase 2 search or trust work',
      summary: 'The repo already has additive v1 routes, shared contracts, and selective public or admin adoption, so Sprint 5 is effectively complete enough to serve as the contract base for later matching work.',
      evidence:
        '`backend/api/v1_routes.py`, shared contracts, typed client normalization, admin preview wiring, and selective live-read assistant behavior are already implemented.',
      mainGap:
        'Round out remaining domain shells, tighten contract coverage, and keep v1 as the center of future logic rather than a side path.',
      nextPrompt: 'Prompt 9, Prompt 10',
      ownerGroup: 'Backend execution',
      agents: ['Worker A', 'Worker B', 'Worker C', 'Member A'],
      tasks: [
        { title: 'Ship additive `/api/v1/*` endpoint families', status: 'Completed' },
        { title: 'Provide shared envelopes and typed public/admin client support', status: 'Completed' },
        { title: 'Expand contract coverage and remaining domain shells', status: 'In Progress' },
      ],
      riskNotes: [
        'The v1 path is real, but overlapping contract layers can still create drift if new matching or lifecycle payloads bypass the richer shared API layer.',
      ],
      references: [
        {
          title: 'Prompt 5 API V1 Execution Package',
          path: 'docs/development/prompt-5-api-v1-execution-package.md',
          summary: 'Primary implementation package for additive v1 routes, typed contracts, and safe rollout rules.',
        },
        {
          title: 'Prompt 5 UI Adoption Plan',
          path: 'docs/development/prompt-5-ui-adoption-plan.md',
          summary: 'Public/admin adoption order for moving surfaces onto the shared v1 seam.',
        },
      ],
    },
    {
      name: 'Sprint 6',
      phaseName: 'Phase 1',
      timing: 'Matching and trust',
      status: 'In Progress',
      windowLabel: 'M2 • Sprint 6',
      focusLabel: 'Search quality maturity, booking-context extraction, and trust-first routing',
      milestoneLabel: 'Search rerank and relevance gating are live; eval-driven tuning and escalation policy are next',
      summary: 'This sprint moves the assistant away from generic chat and toward measurable, booking-safe search and routing behavior.',
      evidence:
        'Semantic rerank, strict relevance gating, booking-context extraction, shared shortlist UI, catalog-quality operator tooling, and fixed-query eval coverage now exist.',
      mainGap:
        'Complete production-query eval loops, stronger industry-aware escalation policy, richer downstream booking contracts, and explicit human handoff logic.',
      nextPrompt: 'Prompt 9, Prompt 14',
      ownerGroup: 'Platform and intelligence',
      agents: ['Member B', 'Member C', 'PM Integrator'],
      tasks: [
        { title: 'Improve search ranking, semantic assist, and trust diagnostics', status: 'In Progress' },
        { title: 'Normalize booking-context hints inside matching responses', status: 'Completed' },
        { title: 'Expose catalog-quality remediation to keep live search clean', status: 'Completed' },
        { title: 'Add search evaluation discipline and release-safe regression coverage', status: 'In Progress' },
        { title: 'Expose booking-path policy and safer next-action logic', status: 'Completed' },
        { title: 'Deepen human escalation and industry-aware routing', status: 'In Progress' },
        { title: 'Add operator feedback loops for wrong-match and no-match-good review', status: 'Planned' },
      ],
      riskNotes: [
        'Search quality is improving faster than the feedback loop around it; without production query replay the team can still overfit to static eval cases.',
      ],
      references: [
        {
          title: 'AI Router Matching Search Strategy',
          path: 'docs/architecture/ai-router-matching-search-strategy.md',
          summary: 'Search relevance, rerank, and routing strategy behind Prompt 9 behavior.',
        },
        {
          title: 'Sprint 6 Search Quality Execution Package',
          path: 'docs/development/sprint-6-search-quality-execution-package.md',
          summary: 'Execution-ready package for telemetry, replayable eval loops, operator feedback capture, and richer search-to-booking contracts.',
        },
        {
          title: 'Prompt 5 To Prompt 11 Dependency Gap Map',
          path: 'docs/architecture/prompt-5-to-11-gap-map.md',
          summary: 'Dependency map showing how Prompt 9 trust logic fits into later lifecycle and sync work.',
        },
      ],
    },
    {
      name: 'Sprint 7',
      phaseName: 'Phase 2',
      timing: 'Public growth uplift',
      status: 'In Progress',
      windowLabel: 'M3 • Sprint 7',
      focusLabel: 'Homepage sales-deck uplift, pricing clarity, and SME acquisition surfaces',
      milestoneLabel: 'Public roadmap, demo, pricing, and proof surfaces are already stronger; now they need tighter module-level completion and clearer live SME onboarding paths',
      summary: 'This sprint focuses on making the homepage sell more clearly: launch offer, product-demo separation, product-host trial routing, pricing clarity, Google-auth tenant entry, and clearer paths for SMEs to launch standalone first or connect into the wider BookedAI portal experience.',
      evidence:
        'Public landing/demo work, standalone roadmap page, direct product-host trial routing, tenant Google-auth entry links, and pricing/demo smoke coverage are all present in repo.',
      mainGap:
        'Connect attribution, conversion instrumentation, QR/email lead capture, and cancelled-state loops into more measurable growth outcomes.',
      nextPrompt: 'Prompt 6, Prompt 16, Prompt 17',
      ownerGroup: 'Frontend rollout',
      agents: ['Locke', 'Raman', 'Meitner', 'PM Integrator'],
      tasks: [
        { title: 'Strengthen pricing/demo conversion and banner states', status: 'Completed' },
        { title: 'Improve partner proof and public storytelling surfaces', status: 'In Progress' },
        { title: 'Reframe homepage as the main public acquisition surface and move deeper runtime behavior into product/demo surfaces', status: 'Completed' },
        { title: 'Add first-10-SME free-setup CTA and Freemium or Pro or Pro Max package framing', status: 'Completed' },
        { title: 'Route primary homepage trial intent into product.bookedai.au and expose direct roadmap or tenant or admin entry links', status: 'Completed' },
        { title: 'Clarify standalone SME launch path versus linked full-portal path on public-facing conversion surfaces', status: 'In Progress' },
        { title: 'Add QR registration and interested-lead email flow', status: 'Planned' },
        { title: 'Connect attribution and GTM loops into measurable growth metrics', status: 'Planned' },
      ],
      references: [
        {
          title: 'Pricing Packaging Monetization Strategy',
          path: 'docs/architecture/pricing-packaging-monetization-strategy.md',
          summary: 'Commercial conversion direction for pricing, packaging, and growth surfaces.',
        },
        {
          title: 'Demo Script Storytelling Video Strategy',
          path: 'docs/architecture/demo-script-storytelling-video-strategy.md',
          summary: 'Narrative and GTM framing for public proof, demo, and storytelling surfaces.',
        },
      ],
    },
    {
      name: 'Sprint 8',
      phaseName: 'Phase 2',
      timing: 'Admin ops modularization',
      status: 'In Progress',
      windowLabel: 'M3 • Sprint 8',
      focusLabel: 'Admin module refinement, issue-first IA, and deeper operator tooling',
      milestoneLabel: 'Admin is already a workspace shell; the next step is deeper module detail and better diagnostics',
      summary: 'Admin continues to move from broad shell work into sharper module-level tooling so operators can work faster without adding clutter.',
      evidence:
        '`AdminPage` is now a composition shell, with feature-local modules, reliability workspace split, panel deep-links, and lazy drill-down modules.',
      mainGap:
        'Finish pushing deeper ops, catalog, tenant, and integration experiences into clearer workspaces instead of one shared screen.',
      nextPrompt: 'Prompt 8',
      ownerGroup: 'Backend and integration lanes',
      agents: ['Member J', 'Member J2', 'Member K', 'Member L', 'Member O', 'Member P'],
      tasks: [
        { title: 'Split admin into operations, catalog, and reliability workspaces', status: 'Completed' },
        { title: 'Add issue-first insights, panel deep-links, and lazy drill-down modules', status: 'Completed' },
        { title: 'Continue deeper admin IA split for tenant and integration surfaces', status: 'In Progress' },
      ],
      references: [
        {
          title: 'Internal Admin App Strategy',
          path: 'docs/architecture/internal-admin-app-strategy.md',
          summary: 'Issue-first admin IA strategy behind workspace split, drill-down panels, and operator lanes.',
        },
        {
          title: 'Next Sprint Protected Reauth Retry Gate Plan',
          path: 'docs/development/next-sprint-protected-reauth-retry-gate-plan.md',
          summary: 'Operational hardening plan that led into deeper reliability and protected-action work.',
        },
      ],
    },
    {
      name: 'Sprint 9',
      phaseName: 'Phase 3',
      timing: 'Tenant foundation',
      status: 'In Progress',
      windowLabel: 'M4 • Sprint 9',
      focusLabel: 'Role model, permission abstraction, and user-group-shaped tenant data',
      milestoneLabel: 'Tenant-aware data seams exist; the next layer is cleaner role, permission, and per-user-group detail',
      summary: 'This sprint shifts toward the more advanced layer where tenant permissions, scoped data, and group-specific behavior are made explicit.',
      evidence:
        'Tenant-aware repository context, `tenant_mode_enabled`, default tenant seed, and tenant-aware mirror writes are already present.',
      mainGap:
        'Build tenant shell, role model, scoped APIs, and the first read-heavy tenant overview before broad tenant-facing expansion.',
      nextPrompt: 'Prompt 7, Prompt 12',
      ownerGroup: 'Strategic layer',
      agents: ['PM Integrator'],
      tasks: [
        { title: 'Prepare tenant-aware repositories and runtime flags', status: 'Completed' },
        { title: 'Define role model, permission abstraction, and tenant-scoped APIs', status: 'In Progress' },
        { title: 'Ship the first tenant read-heavy shell and overview surfaces', status: 'Planned' },
      ],
      references: [
        {
          title: 'Tenant App Strategy',
          path: 'docs/architecture/tenant-app-strategy.md',
          summary: 'Tenant-facing shell and scoped operational overview strategy for the first tenant product surface.',
        },
        {
          title: 'Auth RBAC Multi-Tenant Security Strategy',
          path: 'docs/architecture/auth-rbac-multi-tenant-security-strategy.md',
          summary: 'Role model, permission abstraction, and tenant-safe access boundaries for this sprint.',
        },
      ],
    },
    {
      name: 'Sprint 10',
      phaseName: 'Phase 4',
      timing: 'Hardening release',
      status: 'In Progress',
      windowLabel: 'M4 • Sprint 10',
      focusLabel: 'Protected re-auth, CRM retry truth, release gate, and broader reliability hardening',
      milestoneLabel: 'Release gate, admin reliability workspace, and CRM retry preview are already active',
      summary: 'This sprint consolidates the MVP into a stronger release baseline, with more reliable admin recovery, retry truth, and release discipline.',
      evidence:
        'Rollout flags, observability/logging foundations, smoke coverage, protected re-auth slices, CRM retry lane, admin retry preview, and release-gate command all exist.',
      mainGap:
        'Complete CI/CD rehearsal, rollback drills, broader retry/reconciliation truth, and richer operator drill-in beyond the current additive baseline.',
      nextPrompt: 'Prompt 10, Prompt 11, Prompt 13, Prompt 14',
      ownerGroup: 'Coordination and release',
      agents: ['Member H', 'Member H2', 'Member H3', 'Member H4', 'Member I2', 'Member I3', 'Mencius', 'PM Integrator'],
      tasks: [
        { title: 'Standardize release gate, rollback framing, and protected re-auth slices', status: 'Completed' },
        { title: 'Surface CRM retry preview and retry posture inside admin reliability', status: 'Completed' },
        { title: 'Deepen provider-side retry/reconciliation truth and CI rehearsal', status: 'In Progress' },
      ],
      riskNotes: [
        'Broader admin Playwright stability still needs its own pass before claiming a fully green reliability suite.',
      ],
      references: [
        {
          title: 'Next Sprint Protected Reauth Retry Gate Plan',
          path: 'docs/development/next-sprint-protected-reauth-retry-gate-plan.md',
          summary: 'Current hardening sprint plan for protected re-auth, CRM retry truth, and release gate discipline.',
        },
        {
          title: 'Release Gate Checklist',
          path: 'docs/development/release-gate-checklist.md',
          summary: 'Promote, hold, and rollback checklist used to operationalize the current release gate.',
        },
        {
          title: 'QA Testing Reliability AI Evaluation Strategy',
          path: 'docs/architecture/qa-testing-reliability-ai-evaluation-strategy.md',
          summary: 'Reliability test strategy that frames retry, reconciliation, and rollout verification work.',
        },
      ],
    },
  ],
};

export const fallbackPartners: FeaturedPartner[] = [
  {
    id: 'wsti-western-sydney-tech-innovators',
    name: 'Western Sydney Tech Innovators',
    category: 'AI Ecosystem Partner',
    websiteUrl: 'https://www.meetup.com/western-sydney-tech-innovators/',
    description:
      'WSTI is a Western Sydney grassroots AI community running practical meetups, project hubs, and startup-friendly events at Western Sydney Startup Hub.',
    logoUrl: '/wsti-logo.webp',
    imageUrl: '/wsti-logo.webp',
    featured: true,
  },
  {
    id: 'carelogix',
    name: 'Carelogix',
    category: 'Health AI Partner',
    websiteUrl: null,
    description:
      'Carelogix is presented as a healthcare-oriented AI partner on the BookedAI ecosystem wall.',
    logoUrl: 'https://upload.bookedai.au/images/e26b/bxVyyqW-QH4J9AplLIpe0Q.png',
    imageUrl: 'https://upload.bookedai.au/images/e26b/bxVyyqW-QH4J9AplLIpe0Q.png',
    featured: true,
  },
  {
    id: 'clearpath',
    name: 'ClearPath',
    category: 'AI Partner',
    websiteUrl: null,
    description:
      'ClearPath appears on the BookedAI partner wall as part of the current AI and startup partner lineup.',
    logoUrl: 'https://upload.bookedai.au/images/8429/c31vEhemWqkAEE5_LWukOg.png',
    imageUrl: 'https://upload.bookedai.au/images/8429/c31vEhemWqkAEE5_LWukOg.png',
    featured: true,
  },
  {
    id: 'metalmind-ai',
    name: 'METALMIND AI',
    category: 'AI Partner',
    websiteUrl: null,
    description:
      'MetalMind AI is featured on the BookedAI partner wall as an AI-focused collaborator with cross-border trade positioning.',
    logoUrl: 'https://upload.bookedai.au/images/2766/0cbr3ibd6HU7ziF5_J-tEQ.jpg',
    imageUrl: 'https://upload.bookedai.au/images/2766/0cbr3ibd6HU7ziF5_J-tEQ.jpg',
    featured: true,
  },
  {
    id: 'novo-print',
    name: 'NOVO PRINT',
    category: 'Customer Partner',
    websiteUrl: 'https://novoprints.com.au/',
    description:
      'NOVO PRINT is a print and signage business serving Australian operators with custom print, branding, and promotional production.',
    logoUrl: 'https://upload.bookedai.au/images/a7ec/V0HPc7AinO_gYx7TtFj-qw.jpg',
    imageUrl: 'https://upload.bookedai.au/images/a7ec/V0HPc7AinO_gYx7TtFj-qw.jpg',
    featured: true,
  },
  {
    id: 'future-swim-caringbah',
    name: 'Future Swim Caringbah',
    category: 'Client Example',
    websiteUrl: 'https://futureswim.com.au/locations/caringbah/',
    description:
      'Official swim-school tenant example used to demonstrate nearby kids lesson discovery and enquiry-to-booking flows for parents.',
    logoUrl:
      'https://images.pexels.com/photos/1263348/pexels-photo-1263348.jpeg?auto=compress&cs=tinysrgb&w=1200',
    imageUrl:
      'https://images.pexels.com/photos/1263348/pexels-photo-1263348.jpeg?auto=compress&cs=tinysrgb&w=1200',
    featured: true,
  },
  {
    id: 'zoho-for-startups',
    name: 'Zoho for Startups',
    category: 'CRM and Email Partner',
    websiteUrl: 'https://www.zoho.com/startups/',
    description:
      'Zoho supports CRM and email operations that help BookedAI manage follow-up, customer records, and lifecycle communication.',
    logoUrl: '/partners/zoho-startups.svg',
    imageUrl: '/partners/zoho-startups.svg',
    featured: true,
  },
  {
    id: 'google-for-startups',
    name: 'Google for Startups',
    category: 'Cloud and AI Partner',
    websiteUrl: 'https://startup.google.com/',
    description:
      'Google for Startups supports the project with cloud infrastructure pathways and Gemini AI experimentation across product and delivery workflows.',
    logoUrl: '/partners/google-startups.svg',
    imageUrl: '/partners/google-startups.svg',
    featured: true,
  },
  {
    id: 'openai-for-startups',
    name: 'OpenAI for Startups',
    category: 'AI Model Partner',
    websiteUrl: 'https://openai.com/',
    description:
      'OpenAI supports BookedAI with ChatGPT and API model capabilities that power conversational booking intelligence and assistant orchestration.',
    logoUrl: '/partners/openai-startups.svg',
    imageUrl: '/partners/openai-startups.svg',
    featured: true,
  },
  {
    id: 'stripe',
    name: 'Stripe',
    category: 'Payments Partner',
    websiteUrl: 'https://stripe.com/au',
    description:
      'Stripe powers checkout, payment state, and commercial handoff so customer conversations can move into paid booking outcomes.',
    logoUrl: '/partners/stripe.svg',
    imageUrl: '/partners/stripe.svg',
    featured: true,
  },
  {
    id: 'n8n',
    name: 'n8n',
    category: 'Workflow Partner',
    websiteUrl: 'https://n8n.io/',
    description:
      'n8n runs automation across reminders, CRM updates, booking follow-up, and downstream operational workflows.',
    logoUrl: '/partners/n8n.svg',
    imageUrl: '/partners/n8n.svg',
    featured: true,
  },
  {
    id: 'supabase',
    name: 'Supabase',
    category: 'Backend Platform Partner',
    websiteUrl: 'https://supabase.com/',
    description:
      'Supabase supports authentication, data, storage, and backend service foundations used across the BookedAI platform.',
    logoUrl: '/partners/supabase.svg',
    imageUrl: '/partners/supabase.svg',
    featured: true,
  },
  {
    id: 'codex-property',
    name: 'Codex Property',
    category: 'Housing Partner',
    websiteUrl: 'https://codexproperty.com.au',
    description:
      'Codex Property helps BookedAI extend the partner network into housing discovery and project consultation journeys.',
    logoUrl: '/partners/codex-property.svg',
    imageUrl: '/partners/codex-property.svg',
    featured: true,
  },
  {
    id: 'auzland',
    name: 'Auzland',
    category: 'Housing Partner',
    websiteUrl: 'https://auzland.au/',
    description:
      'Auzland supports housing consultations where customers want to discuss suitable projects, locations, and purchase timing.',
    logoUrl: '/partners/auzland.svg',
    imageUrl: '/partners/auzland.svg',
    featured: true,
  },
];

export const imageUploadContent: ImageUploadContent = {
  kicker: 'Image Upload',
  kickerClassName: 'text-amber-500',
  title: 'Upload business images and get a hosted link instantly',
  body: 'Drop in venue photos, menu shots, treatment images, service assets, or customer creatives and BookedAI will return a live URL on upload.bookedai.au that you can use right away in content, automations, and booking flows.',
  acceptedFormats: ['JPEG', 'PNG', 'GIF', 'WebP'],
  helperText: 'Max 10MB per image. Files are published immediately after upload.',
  uploadLabel: 'Upload image',
  copyLabel: 'Copy image URL',
};

export const customerShowcaseContent: CustomerShowcaseContent = {
  kicker: 'Customer Spotlight',
  kickerClassName: 'text-amber-300',
  title: 'BookedAI fits service-led businesses across Australia',
  body: 'BookedAI is made for operators with urgent enquiries and customers who expect quick answers, from hospitality and health to beauty, events, trades, tutoring, and print.',
  customerName: 'NOVO PRINT AND SIGNS',
  customerUrl: 'https://novoprints.com.au/',
  customerSummary:
    'NOVO PRINT AND SIGNS offers custom signage, print materials, promotional products, and outdoor branding solutions for Australian businesses.',
};

export const customerProducts: CustomerProduct[] = [
  {
    name: 'A4 Brochures',
    description:
      'Folded brochure printing for promotions, menus, handouts, and brand collateral.',
    href: 'https://novoprints.com.au/product/a4-brochures-folded-150gsm-gloss/',
  },
  {
    name: 'Mesh Banner',
    description:
      'Weather-ready banner signage suited to outdoor promotions, fences, and events.',
    href: 'https://novoprints.com.au/product/mesh-banner/',
  },
  {
    name: 'A-Frame Sign',
    description:
      'Double-sided pavement signage for storefront visibility and walk-in traffic.',
    href: 'https://novoprints.com.au/product/a-frame-sign-double-sided/',
  },
  {
    name: 'LED Backlit Sign',
    description:
      'Illuminated signage that helps businesses stand out after dark and in high-traffic areas.',
    href: 'https://novoprints.com.au/product/led-backlit-sign/',
  },
];
