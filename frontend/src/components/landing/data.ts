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
  messages: string[];
  slots: string[];
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

export type ImageUploadContent = SectionContent & {
  acceptedFormats: string[];
  helperText: string;
  uploadLabel: string;
  copyLabel: string;
};

export const primaryCtaHref =
  'mailto:ceo@bookedai.au?subject=Start%20Free%20Trial%20with%20BookedAI';

export const demoCtaHref =
  'mailto:ceo@bookedai.au?subject=BookedAI%20Demo%20Request';

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
  eyebrow: 'AI receptionist for Sydney service businesses',
  title: 'Turn Conversations Into Customers',
  bodyLead: 'From enquiry to booked job, automatically.',
  bodyRest:
    'BookedAI replies instantly, qualifies leads, and fills your calendar for salons, clinics, trades, and local service businesses across Sydney.',
  note: 'Built for Australian operators who need more bookings, not more admin.',
  primaryCta: 'Start Free Trial',
  secondaryCta: 'View Product',
  primaryHref: primaryCtaHref,
  secondaryHref: '#product',
};

export const demoContent: DemoContent = {
  title: 'Live Chat Demo',
  subtitle: 'BookedAI converts chat into confirmed bookings',
  status: 'Online',
  messages: [
    'Do you have any appointments tomorrow in Surry Hills?',
    'Yes. We have two available spots tomorrow and I can lock one in now.',
    'Which time works better for you?',
  ],
  slots: ['10:00 AM', '11:30 AM'],
};

export const problemContent: SectionContent = {
  kicker: 'Problem',
  kickerClassName: 'text-indigo-400',
  title: 'You’re Losing Customers Every Day',
  body: 'Local businesses in Sydney do not lose sales because demand is low. They lose sales because response time is slow. Customers expect an answer now, not after the lunch rush or at the end of the day.',
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
    title: 'Built to handle real front-desk pressure, not just answer a chat bubble',
    body: 'BookedAI is built for busy operators who need fast replies, clean booking logic, and a workflow their team can trust.',
  },
};

export const proofItems: ProofItem[] = [
  {
    eyebrow: 'Coverage',
    title: 'Always on when your team is fully booked',
    body: 'Late-night enquiries, lunch-hour rushes, and after-hours messages still get an immediate reply that keeps the customer engaged.',
  },
  {
    eyebrow: 'Qualification',
    title: 'Lead screening happens before the booking hits your calendar',
    body: 'BookedAI collects the right details up front so your staff spend less time chasing context and more time serving real customers.',
  },
  {
    eyebrow: 'Routing',
    title: 'Escalate the right conversations to a human',
    body: 'Urgent, high-value, or unusual enquiries can be handed off quickly instead of getting trapped in a generic automation flow.',
  },
  {
    eyebrow: 'Follow-up',
    title: 'Reminders and admin steps stay connected to the booking',
    body: 'Calendar updates, reminders, and workflow automations can continue after the conversation so fewer leads fall through the cracks.',
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
    body: 'Sydney customers move on fast when a business replies too late.',
  },
  {
    title: 'Missed Leads',
    body: 'Busy front desks and small teams cannot answer every inquiry in time.',
  },
  {
    title: 'Lost Revenue',
    body: 'Every unanswered message is a missed booking and lost weekly revenue.',
  },
];

export const solutionContent: SectionContent = {
  kicker: 'Solution',
  kickerClassName: 'text-emerald-400',
  title: 'Meet BookedAI',
  body: 'BookedAI acts like an always-on front desk that answers questions, qualifies demand, and books appointments automatically.',
};

export const solutionCards: InfoCard[] = [
  {
    title: 'Instant Replies',
    body: 'Reply to web chat, WhatsApp, and inbound enquiries in seconds, 24/7.',
  },
  {
    title: 'Smart Qualification',
    body: 'Understand customer intent and move serious leads to the right next step.',
  },
  {
    title: 'Auto Booking',
    body: 'Turn conversations into confirmed appointments without manual follow-up.',
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
  title: 'Start free, then scale with clear commercial terms',
  body: 'Start with a free trial, then move to a simple pay-per-qualified-booking model once BookedAI is live.',
  planLabel: 'Starter plan',
  planPrice: 'Free trial',
  planCaption: 'then pay per qualified booking after launch',
  planFeatures: [
    'Instant AI replies',
    'Smart lead qualification',
    'Google Calendar booking',
    'n8n automation for follow-up and reminders',
    'Setup review for your service workflow',
  ],
  primaryCta: 'Start Free Trial',
  primaryHref: primaryCtaHref,
};

export const ctaContent: CallToActionContent = {
  kicker: 'Call to action',
  title: 'Start your free trial today',
  body: 'Launch BookedAI on bookedai.au and start converting more Sydney conversations into revenue this week.',
  primaryCta: 'Start Free Trial',
  secondaryCta: 'Book a Demo',
  primaryHref: primaryCtaHref,
  secondaryHref: demoCtaHref,
  supportingText:
    'Prefer email? Reach us directly at ceo@bookedai.au and we will help map your booking flow.',
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
    imageSrc: 'https://upload.bookedai.au/images/eb09/0mp56c4pt42V3X1ni5Elhw.png',
    imageAlt: 'Portrait of Do Van Long',
    bio: 'Do Van Long is a builder at heart: founder, technologist, and innovator in AI, blockchain, and digital business. He is passionate about turning emerging technology into real-world products that scale across markets.',
  },
];

export const videoDemoContent: VideoDemoContent = {
  kicker: 'Video Demo',
  title: 'Watch the salon booking flow before you book a call',
  body: 'This 30-second walkthrough follows a customer who needs a wedding haircut tomorrow. It shows how BookedAI presents available options, helps the customer choose a slot, and confirms the booking in a clear front-desk style flow.',
  highlights: [
    'Salon enquiry for a haircut booking needed tomorrow',
    'BookedAI offers appointment options in a simple guided flow',
    'Customer selects a time and receives booking confirmation',
  ],
  primaryCta: 'Watch Video Demo',
  primaryHref: videoDemoHref,
  secondaryCta: 'Request Full Demo',
  secondaryHref: demoCtaHref,
};

export const bookingAssistantContent: BookingAssistantContent = {
  kicker: '',
  kickerClassName: 'text-rose-400',
  title: 'One product demo, one clear next step',
  body: 'One live assistant for bookings, service discovery, and WSTI-priority AI event search.',
  searchPlaceholder:
    'Ask for a booking, service match, membership help, or AI events at WSTI...',
  formIntro: '',
  submitLabel: 'Create Booking Request',
};

export const partnersSectionContent: PartnersSectionContent = {
  kicker: 'Partners & Clients',
  kickerClassName: 'text-emerald-500',
  title: 'The businesses we support and the ecosystem partners we build with',
  body: 'From local operators to AI ecosystem partners, BookedAI is built for organisations that need faster replies and cleaner booking flow.',
  stats: [
    'Live partner logos managed from the admin dashboard',
    'Featured customers with links and short business summaries',
    'Includes launch partners and ecosystem collaborators like WSTI',
  ],
  emptyTitle: 'Your partner wall is ready',
  emptyBody:
    'Upload logos and images from admin.bookedai.au to start showcasing customers, strategic partners, and launch collaborators here.',
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
];

export const imageUploadContent: ImageUploadContent = {
  kicker: 'Image Upload',
  kickerClassName: 'text-amber-500',
  title: 'Upload business images and get a hosted link instantly',
  body: 'Drop in salon photos, service images, or customer assets and BookedAI will return a live URL on upload.bookedai.au that you can use right away in content, automations, and booking flows.',
  acceptedFormats: ['JPEG', 'PNG', 'GIF', 'WebP'],
  helperText: 'Max 10MB per image. Files are published immediately after upload.',
  uploadLabel: 'Upload image',
  copyLabel: 'Copy image URL',
};

export const customerShowcaseContent: CustomerShowcaseContent = {
  kicker: 'Customer Spotlight',
  kickerClassName: 'text-amber-300',
  title: 'Novoprints.com.au is the kind of local business BookedAI can support',
  body: 'BookedAI is made for service-led operators with urgent enquiries and customers who expect quick answers.',
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
