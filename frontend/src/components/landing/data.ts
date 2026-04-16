export type NavItem = string;

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
};

export type RoadmapPhase = {
  name: string;
  timing: string;
  summary: string;
  tasks: RoadmapTask[];
};

export type RoadmapRole = {
  name: string;
  track: string;
  body: string;
  status: RoadmapStatus;
};

export type RoadmapRoleGroup = {
  name: string;
  summary: string;
  roles: RoadmapRole[];
};

export type RoadmapContent = SectionContent & {
  lead: string;
  architectures: RoadmapArchitecture[];
  roleGroups: RoadmapRoleGroup[];
  phases: RoadmapPhase[];
};

export type ImageUploadContent = SectionContent & {
  acceptedFormats: string[];
  helperText: string;
  uploadLabel: string;
  copyLabel: string;
};

export const primaryCtaHref =
  '/?assistant=open';

export const demoCtaHref =
  '/?demo=open';

export const roadmapHref = '/roadmap';
export const productHref = 'https://product.bookedai.au';

export const videoDemoHref = '/video-demo.html';

export const privacyHref = '/privacy-policy.html';

export const termsHref = '/terms.html';

export const navItems: NavItem[] = [
  'Product',
  'Problem',
  'How it Works',
  'Booking Assistant',
  'Partners',
  'Team Members',
  'Pricing',
];

export const heroContent: HeroContent = {
  eyebrow: 'AI receptionist for Australian SMEs',
  title: 'From Conversation to Revenue',
  bodyLead: 'Turn every enquiry into a booking-ready recommendation.',
  bodyRest:
    'BookedAI turns messy enquiries into polished search results, confident recommendations, and booking-ready next steps for swim schools, restaurants, clinics, salons, family services, and other Australian SMEs.',
  note: 'Designed to feel premium in front of customers and operationally reliable for founders, operators, and investors reviewing the product story.',
  primaryCta: 'Start Free Trial',
  secondaryCta: 'View Product',
  primaryHref: primaryCtaHref,
  secondaryHref: productHref,
};

export const demoContent: DemoContent = {
  title: 'BookedAI search preview',
  subtitle: 'Live search, ranking, and booking handoff in a mobile-first UI',
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
  title: 'You’re Losing Customers Every Day',
  body: 'Australian customers move quickly when they are booking a treatment, table, consultation, event slot, haircut, or service call. If your team replies late, that booking often goes to another provider.',
};

export const proofContent: ProofContent = {
  channels: [
    'Website Chat',
    'Phone Calls',
    'WhatsApp',
    'Calendar',
    'n8n Workflows',
  ],
  section: {
    kicker: 'Why teams trust it',
    kickerClassName: 'text-sky-400',
    title: 'Built for busy booking teams, not just a generic chat bubble',
    body: 'BookedAI is built for operators who need fast replies, clean booking logic, and a workflow customers can trust across hospitality, beauty, health, events, trades, family services, and more.',
  },
};

export const proofItems: ProofItem[] = [
  {
    eyebrow: 'Coverage',
    title: 'Always on when your team is fully booked',
    body: 'After-hours enquiries, peak-weekend demand, and busy reception periods still get an immediate reply that keeps leads engaged.',
  },
  {
    eyebrow: 'Qualification',
    title: 'Lead screening happens before the booking hits your calendar',
    body: 'BookedAI collects service type, timing, contact details, and booking context up front so your team spends less time chasing basics and more time closing real work.',
  },
  {
    eyebrow: 'Routing',
    title: 'Escalate the right conversations to a human',
    body: 'Urgent service questions, fit concerns, VIP leads, or higher-value enquiries can be handed off quickly instead of getting trapped in a generic automation flow.',
  },
  {
    eyebrow: 'Follow-up',
    title: 'Reminders and admin steps stay connected to the booking',
    body: 'Calendar updates, reminders, and workflow automations can continue after the conversation so fewer restaurant, salon, clinic, event, trade, or kids-service leads fall through the cracks.',
  },
];

export const showcaseContent: SectionContent = {
  kicker: 'Product Screens',
  kickerClassName: 'text-fuchsia-300',
  title: 'A closer look at the BookedAI experience',
  body: 'Real interface moments from the live demo help buyers picture how BookedAI can guide enquiries, offer appointment options, and confirm bookings without extra admin.',
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
    title: 'Slow Replies',
    body: 'Australian customers move on fast when a booking enquiry sits unanswered.',
  },
  {
    title: 'Missed Leads',
    body: 'Busy teams cannot answer every call, chat, DM, and web form in time.',
  },
  {
    title: 'Lost Revenue',
    body: 'Every unanswered enquiry can mean one less table, appointment, consultation, class, event, or callout.',
  },
];

export const solutionContent: SectionContent = {
  kicker: 'Solution',
  kickerClassName: 'text-emerald-400',
  title: 'Meet BookedAI',
  body: 'BookedAI acts like an always-on front desk that answers questions, qualifies demand, and books services automatically.',
};

export const solutionCards: InfoCard[] = [
  {
    title: 'Instant Replies',
    body: 'Reply to web chat, calls, and inbound enquiries in seconds, 24/7.',
  },
  {
    title: 'Smart Qualification',
    body: 'Understand whether the customer needs a table, treatment, consult, quote, event slot, or family service and move them to the right next step.',
  },
  {
    title: 'Auto Booking',
    body: 'Turn customer conversations into confirmed bookings and qualified sales conversations without manual follow-up.',
  },
];

export const flowSteps = [
  'Customer sends a message',
  'BookedAI replies instantly',
  'BookedAI qualifies the lead',
  'BookedAI confirms the booking',
];

export const metrics: Metric[] = [
  { value: '+35%', label: 'More Bookings' },
  { value: '24/7', label: 'Reception Coverage' },
  { value: '0', label: 'Cold Leads' },
];

export const pricingContent: PricingContent = {
  kicker: 'Pricing',
  kickerClassName: 'text-indigo-400',
  title: 'Simple monthly pricing built for Australian SMEs',
  body: 'Start with 30 days free, then move onto a clear monthly plan with a lower entry price and a simpler setup path that is easier to approve quickly.',
  planLabel: 'Starter plan',
  planPrice: 'A$79/mo',
  planCaption: 'after your 30-day free subscription period',
  planFeatures: [
    'Instant AI replies',
    'Smart lead qualification',
    'Google Calendar booking',
    'n8n automation for follow-up and reminders',
    'Online setup review for your service workflow',
  ],
  primaryCta: 'Start Free Trial',
  primaryHref: primaryCtaHref,
};

export const ctaContent: CallToActionContent = {
  kicker: 'Call to action',
  title: 'Start your 30-day free subscription today',
  body: 'Launch BookedAI on bookedai.au and start converting more Australian enquiries into booked revenue this week across food, events, salons, healthcare, kids services, wellness, and local service businesses.',
  primaryCta: 'Start Free Trial',
  secondaryCta: 'Book a Demo',
  primaryHref: primaryCtaHref,
  secondaryHref: demoCtaHref,
  supportingText:
    'Prefer email? Reach us directly at info@bookedai.au and we will help map your booking flow for hospitality, beauty, health, events, trades, education, or other service-led SMEs.',
};

export const trustItems: TrustItem[] = [
  {
    name: 'Ava',
    business: 'Clinic manager, Inner West',
    quote:
      'BookedAI helped us respond after hours without making the experience feel robotic. The biggest win was fewer missed booking requests by the next morning.',
  },
  {
    name: 'Marcus',
    business: 'Salon owner, Surry Hills',
    quote:
      'The handoff felt practical. Straightforward bookings stayed automated, and edge cases still came through to the team with the details we needed.',
  },
  {
    name: 'Priya',
    business: 'Operations lead, mobile trades team',
    quote:
      'What mattered to us was speed and consistency. The workflow was clearer than a generic chatbot and closer to how a real receptionist would qualify jobs.',
  },
];

export const faqItems: FAQItem[] = [
  {
    question: 'What counts as a qualified booking?',
    answer:
      'A qualified booking is an enquiry that matches your service criteria and reaches the agreed booking-ready stage in your workflow.',
  },
  {
    question: 'Can BookedAI hand conversations to my team?',
    answer:
      'Yes. When an enquiry needs a person, BookedAI can route it to your team with the captured context so follow-up is faster.',
  },
  {
    question: 'Do I need to change my calendar or tools?',
    answer:
      'No full stack change is required. BookedAI is positioned to work with your existing calendar and workflow setup, including follow-up automations.',
  },
];

export const teamSectionContent: SectionContent = {
  kicker: 'Team Members',
  kickerClassName: 'text-indigo-400',
  title: 'Built by operators, engineers, and product-minded problem solvers',
  body: 'BookedAI brings together technical depth, operational quality experience, and practical business thinking to build AI tools that work in the real world.',
};

export const teamMembers: TeamMember[] = [
  {
    name: 'Angus Hoy',
    role: 'CTO',
    imageSrc: 'https://upload.bookedai.au/images/da31/Wlht-j7K3zXyML3hYqnn8A.png',
    imageAlt: 'Portrait of Angus Hoy',
    bio: 'Studied computer science and mathematics at the University of Melbourne. Worked as a freelancer for a few years, then in embedded systems developing motor drive PCBs. Currently works at a fraud detection scale-up doing backend Python development.',
  },
  {
    name: 'Yogesh Kumar',
    role: 'COO',
    imageSrc: 'https://upload.bookedai.au/images/3cd9/gOd4m5mT7aQilr_RySfoTQ.png',
    imageAlt: 'Portrait of Yogesh Kumar',
    bio: 'Master of IT from Queensland University of Technology with 6 years of experience in financial markets. Currently works as an IT Engineer at ASX and is also an AI enthusiast.',
  },
  {
    name: 'Tommy Dam',
    role: 'CMO',
    imageSrc: 'https://upload.bookedai.au/images/5a63/bISqviktp9_R_jFQwcTBew.jpg',
    imageAlt: 'Portrait of Tommy Dam',
    bio: 'Bachelor of Science with a major in Chemistry. Worked in manufacturing of medical devices as a QA chemist, quality assurance for laboratory services in clinical trials, and quality assurance for NDIS and aged care service providers. Currently works in the NDIS and aged care industry.',
  },
  {
    name: 'Do Van Long',
    role: 'CEO',
    imageSrc: 'https://upload.bookedai.au/images/e40f/k262gljWOBBiDXdMf6hfCA.png',
    imageAlt: 'Portrait of Do Van Long',
    bio: 'Do Van Long is a builder at heart: founder, technologist, and innovator in AI, blockchain, and digital business. He is passionate about turning emerging technology into real-world products that scale across markets.',
  },
];

export const videoDemoContent: VideoDemoContent = {
  kicker: 'Video Demo',
  title: 'Watch the revenue story before you book a live walkthrough',
  body: 'This short demo follows a salon enquiry from customer request to match, booking trust, and confirmed outcome. It is built to help buyers understand how BookedAI converts demand into revenue, not just chat replies.',
  highlights: [
    'Customer request, AI understanding, and matched next step in one clean flow',
    'Booking trust shown clearly: real options, not vague chatbot answers',
    'Ends on confirmed outcome and the next commercial step',
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
  searchPlaceholder:
    'Ask for a salon booking, table reservation, clinic consult, event enquiry, kids service, membership help, or AI event...',
  formIntro: '',
  submitLabel: 'Create Booking Request',
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
  title: 'A delivery plan that connects product polish, architecture depth, and operational readiness',
  body: 'The roadmap is organized around the architectures already defined, then expanded into phased execution so each release moves both the customer experience and the backend platform forward together.',
  lead:
    'Every task is visible with a status marker so the plan reads like an execution board, not just a pitch deck timeline, and the active specialist agent roster is shown directly inside the roadmap.',
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
      timing: 'Foundation',
      summary: 'Establish the baseline product story, core booking flow, and operator visibility.',
      tasks: [
        { title: 'Redesign the homepage with premium whitespace, stronger typography, and investor-facing narrative', status: 'In Progress' },
        { title: 'Ship mobile-style search previews for swim-school and restaurant discovery flows', status: 'In Progress' },
        { title: 'Stabilize booking assistant entry points across the site', status: 'Completed' },
        { title: 'Unify public and admin contracts for booking state visibility', status: 'In Progress' },
        { title: 'Expose admin metrics, recent events, and route inventory', status: 'Completed' },
        { title: 'Move architecture depth and delivery tracking into a dedicated roadmap page', status: 'Completed' },
      ],
    },
    {
      name: 'Phase 2',
      timing: 'Booking Intelligence',
      summary: 'Deepen qualification, routing, and trust so conversations become cleaner booking outcomes.',
      tasks: [
        { title: 'Expand structured lead qualification fields per service type', status: 'In Progress' },
        { title: 'Add richer search result ranking and trust diagnostics', status: 'In Progress' },
        { title: 'Improve human escalation paths for high-value enquiries', status: 'Planned' },
        { title: 'Refine prompt routing by industry and booking intent', status: 'Planned' },
        { title: 'Normalize downstream booking payloads before workflow handoff', status: 'In Progress' },
        { title: 'Introduce review feedback loops for quality tuning', status: 'Planned' },
      ],
    },
    {
      name: 'Phase 3',
      timing: 'Commercial Expansion',
      summary: 'Connect more revenue-critical systems so BookedAI can support a broader go-to-market motion.',
      tasks: [
        { title: 'Broaden pricing and plan conversion flows', status: 'In Progress' },
        { title: 'Protect pricing consultation, plan-return, and demo sync flows with browser smoke coverage', status: 'Completed' },
        { title: 'Cover pricing cancelled-state messaging and retry-ready public banner behavior', status: 'Completed' },
        { title: 'Deepen payment state recovery for interrupted checkouts', status: 'In Progress' },
        { title: 'Add category-specific packages for vertical onboarding', status: 'Planned' },
        { title: 'Expand partner proof with tighter responsive cards and case-study depth', status: 'In Progress' },
        { title: 'Link CRM and lifecycle automation into booking milestones', status: 'Planned' },
        { title: 'Create onboarding templates for swim schools, restaurants, clinics, and salons', status: 'Planned' },
      ],
    },
    {
      name: 'Phase 4',
      timing: 'Scale and Reliability',
      summary: 'Strengthen observability, operational safety, and production readiness for larger rollout volumes.',
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
    websiteUrl: 'https://bookedai.au',
    description:
      'Swim school example used on the landing page to demonstrate a real enquiry-to-booking flow for parents searching nearby lessons.',
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
  title: 'BookedAI fits service-led SMEs across Australia',
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
