import type { PricingConsultationResponse } from '../../../shared/contracts';

export type PlanId = 'basic' | 'standard' | 'pro';
export type PlanSlug = 'starter' | 'growth' | 'enterprise';
export type ConsultationFlowMode = 'full' | 'guided';
export type ConsultationStep = 'contact' | 'calendar' | 'confirmed';
export type OnboardingMode = 'online' | 'onsite';

export type PlanCta = {
  label: string;
  href: string;
};

export type Plan = {
  id: PlanId;
  slug: PlanSlug;
  name: string;
  tagline: string;
  bestFor: string;
  outcome: string;
  setupFee: string;
  monthlyFee: string;
  commission: string;
  price: string;
  subtitle: string;
  badge: string;
  ctaLabel: string;
  cta: PlanCta;
  introLabel: string;
  microcopy: string;
  supportingText?: string;
  features: string[];
  featured?: boolean;
  mostPopular?: boolean;
};

export type Recommendation = {
  label: string;
  detail: string;
  featured?: boolean;
};

export type ConsultationFormState = {
  planId: PlanId;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  businessName: string;
  businessType: string;
  onboardingMode: OnboardingMode;
  startupReferralEligible: boolean;
  referralPartner: string;
  referralLocation: string;
  preferredSlot: string;
  notes: string;
};

export const highlightPoints = [
  'Pick by business stage, not by feature maze',
  'Every package includes search, booking request, portal, and follow-up visibility',
  'Commission only applies to bookings BookedAI captures or recovers',
];

export const topOffers = [
  {
    eyebrow: 'Simple entry',
    title: 'Start with the lightest package that can take a real booking',
    body: 'Launch gives one booking-ready page and one channel. Grow adds managed setup and the main customer channels. Scale is for teams that need locations, APIs, and service-level support.',
  },
  {
    eyebrow: 'Clear promise',
    title: 'Each package shows exactly what happens after a customer asks',
    body: 'Customer asks, BookedAI shortlists, the booking request is captured, and the customer gets a portal, confirmation, and follow-up path.',
  },
];

export const setupOptions = [
  {
    label: 'Launch setup',
    detail: 'One page, one catalog, one customer channel, portal links, and basic confirmation flow.',
  },
  {
    label: 'Grow setup',
    detail: 'Done-for-you catalog import, brand setup, Telegram/WhatsApp/widget wiring, CRM handoff, and booking activity review.',
  },
  {
    label: 'Scale setup',
    detail: 'Custom rollout for multi-location, franchise, or platform teams that need templates, SSO/API, SLA, and a named success owner.',
  },
];

const registerInterestHref = '/register-interest';

export const plans: Plan[] = [
  {
    id: 'basic',
    slug: 'starter',
    name: 'Launch',
    tagline: 'One booking-ready page',
    bestFor: 'Solo operators and micro teams that need a clean first booking path.',
    outcome: 'A customer can ask, choose the service, submit a request, and reopen the portal.',
    setupFee: 'A$0 self-serve',
    monthlyFee: 'A$79/mo',
    commission: '0% commission',
    price: 'A$79',
    subtitle: 'Solo coach, single tradie, or 1-room clinic that wants a simple live booking path.',
    badge: 'Lightest',
    ctaLabel: 'Start Launch',
    cta: {
      label: 'Start Launch',
      href: `${registerInterestHref}?plan=starter`,
    },
    introLabel: 'Start here',
    microcopy:
      'One service catalog, one channel, BookedAI Manager Bot, portal access, payment QR posture, and email confirmation.',
    supportingText:
      'Best for proving demand capture before adding more channels and managed follow-up.',
    features: [
      'Booking-ready landing page',
      '1 channel: Telegram or web widget',
      '1 service catalog',
      'Portal link and QR for every booking',
      'Email confirmation and payment posture',
      'Self-serve setup',
    ],
  },
  {
    id: 'standard',
    slug: 'growth',
    name: 'Grow',
    tagline: 'Managed SME booking flow',
    bestFor: 'Salons, clinics, schools, tutors, and local service teams with repeat enquiries.',
    outcome: 'BookedAI captures enquiries across channels and shows owners what was booked or needs action.',
    setupFee: 'A$499 onboarding',
    monthlyFee: 'A$249/mo',
    commission: '3% on net booked revenue',
    price: 'A$249',
    subtitle: 'Established SME ready for BookedAI across the main customer channels.',
    badge: 'Most popular',
    ctaLabel: 'Start a 30-day pilot',
    cta: {
      label: 'Start a 30-day pilot',
      href: `${registerInterestHref}?plan=growth`,
    },
    introLabel: 'Most SMEs',
    microcopy:
      'The practical default: managed setup, multi-channel capture, customer care, CRM sync, and revenue visibility.',
    supportingText:
      'Commission applies only when BookedAI captures or recovers a real booking.',
    features: [
      'Landing page plus embedded booking widget',
      'Telegram, WhatsApp, and web chat paths',
      'Customer-care handoff with booking reference',
      'CRM, email, calendar, and payment posture',
      'Booking activity and revenue summary',
      'A$499 onboarding plus 3% on captured revenue',
    ],
    featured: true,
    mostPopular: true,
  },
  {
    id: 'pro',
    slug: 'enterprise',
    name: 'Scale',
    tagline: 'Multi-location revenue ops',
    bestFor: 'Franchises, academies, and platform teams with multiple services, teams, or locations.',
    outcome: 'A reusable booking operating system with templates, API/webhooks, SLA, and review controls.',
    setupFee: 'A$2,500-A$10,000 custom',
    monthlyFee: 'A$999+/mo',
    commission: '5% on attributable revenue (floor + cap negotiated)',
    price: 'A$999+',
    subtitle: 'Multi-location, franchise, academy, or platform rollout with stronger controls.',
    badge: 'Custom',
    ctaLabel: 'Plan Scale',
    cta: {
      label: 'Talk to founder',
      href: `${registerInterestHref}?plan=enterprise`,
    },
    introLabel: 'Custom rollout',
    microcopy:
      'Custom rollout, vertical templates, SSO/API, white-label widget, retention automation, SLA, and named success owner.',
    supportingText:
      'Setup fee scoped per contract. 5% commission on attributable booked revenue with floor and cap negotiated up front.',
    features: [
      'Multi-location templates and dedicated onboarding',
      'Business workspace + booking activity history',
      'White-label widget + webhook + API access',
      'Retention / churn-rescue automation',
      'SLA + named CSM',
      'Custom setup plus attributable revenue model',
    ],
  },
];

export const recommendations: Recommendation[] = [
  {
    label: 'Launch',
    detail: 'One booking-ready page and one channel',
  },
  {
    label: 'Grow',
    detail: 'Managed multi-channel booking flow for SMEs',
    featured: true,
  },
  {
    label: 'Scale',
    detail: 'Multi-location templates, API, SLA, and success owner',
  },
];

export const pricingSignals = [
  {
    label: 'Launch',
    value: 'A$79/mo',
    detail: 'One booking-ready page and one customer channel.',
  },
  {
    label: 'Grow',
    value: 'A$249/mo',
    detail: 'Managed setup, three channels, CRM/email/calendar, and revenue summary.',
  },
  {
    label: 'Scale',
    value: 'A$999+/mo',
    detail: 'Custom rollout for multi-location and platform teams.',
  },
];

export const visiblePlans = plans;
export const advancedPlan = plans[2];

export const businessTypeSuggestions = [
  'Salon or beauty studio',
  'Restaurant, cafe, or catering',
  'Event or hospitality venue',
  'Healthcare or allied health clinic',
  'Kids services or tutoring',
  'Trades or home services',
  'Fitness, wellness, or memberships',
  'Pet grooming or boarding',
  'Professional services or consults',
];

function toDatetimeLocalValue(value: Date) {
  const year = value.getFullYear();
  const month = `${value.getMonth() + 1}`.padStart(2, '0');
  const day = `${value.getDate()}`.padStart(2, '0');
  const hours = `${value.getHours()}`.padStart(2, '0');
  const minutes = `${value.getMinutes()}`.padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function parseResultDate(payload: PricingConsultationResponse) {
  const parsed = new Date(`${payload.preferred_date}T${payload.preferred_time}:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function buildDefaultPreferredSlot() {
  const value = new Date();
  value.setDate(value.getDate() + 1);
  value.setHours(10, 0, 0, 0);
  return toDatetimeLocalValue(value);
}

export function parsePreferredSlot(preferredSlot: string) {
  const parsed = new Date(preferredSlot);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  const year = parsed.getFullYear();
  const month = `${parsed.getMonth() + 1}`.padStart(2, '0');
  const day = `${parsed.getDate()}`.padStart(2, '0');
  const hours = `${parsed.getHours()}`.padStart(2, '0');
  const minutes = `${parsed.getMinutes()}`.padStart(2, '0');

  return {
    preferredDate: `${year}-${month}-${day}`,
    preferredTime: `${hours}:${minutes}`,
  };
}

export function formatConsultationDateTime(payload: PricingConsultationResponse) {
  const parsed = new Date(`${payload.preferred_date}T${payload.preferred_time}:00`);
  if (Number.isNaN(parsed.getTime())) {
    return `${payload.preferred_date} ${payload.preferred_time} ${payload.timezone}`;
  }

  return new Intl.DateTimeFormat('en-AU', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(parsed);
}

export function buildGoogleCalendarUrl(payload: PricingConsultationResponse) {
  const start = parseResultDate(payload);
  if (!start) {
    return null;
  }

  const end = new Date(start.getTime() + 30 * 60 * 1000);
  const packageName = payload.package_name || payload.plan_name;
  const formatUtc = (value: Date) =>
    `${value.getUTCFullYear()}${`${value.getUTCMonth() + 1}`.padStart(2, '0')}${`${value.getUTCDate()}`.padStart(2, '0')}T${`${value.getUTCHours()}`.padStart(2, '0')}${`${value.getUTCMinutes()}`.padStart(2, '0')}${`${value.getUTCSeconds()}`.padStart(2, '0')}Z`;

  const details = [
    `BookedAI ${packageName} onboarding`,
    `Offer: ${payload.trial_summary}`,
    `Setup mode: ${payload.onboarding_mode === 'onsite' ? 'Onsite' : 'Online'}`,
    payload.meeting_join_url ? `Zoho meeting: ${payload.meeting_join_url}` : null,
    payload.meeting_event_url ? `Zoho event: ${payload.meeting_event_url}` : null,
    `Reference: ${payload.consultation_reference}`,
  ]
    .filter(Boolean)
    .join('\n');

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: `BookedAI ${packageName} consultation`,
    dates: `${formatUtc(start)}/${formatUtc(end)}`,
    details,
    location: payload.meeting_join_url || 'Online',
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function buildIcsDownloadUrl(payload: PricingConsultationResponse) {
  const start = parseResultDate(payload);
  if (!start) {
    return null;
  }

  const end = new Date(start.getTime() + 30 * 60 * 1000);
  const packageName = payload.package_name || payload.plan_name;
  const formatUtc = (value: Date) =>
    `${value.getUTCFullYear()}${`${value.getUTCMonth() + 1}`.padStart(2, '0')}${`${value.getUTCDate()}`.padStart(2, '0')}T${`${value.getUTCHours()}`.padStart(2, '0')}${`${value.getUTCMinutes()}`.padStart(2, '0')}${`${value.getUTCSeconds()}`.padStart(2, '0')}Z`;

  const description = [
    `BookedAI ${packageName} onboarding`,
    `Offer: ${payload.trial_summary}`,
    `Setup mode: ${payload.onboarding_mode === 'onsite' ? 'Onsite' : 'Online'}`,
    payload.meeting_join_url ? `Zoho meeting: ${payload.meeting_join_url}` : null,
    payload.meeting_event_url ? `Zoho event: ${payload.meeting_event_url}` : null,
    `Reference: ${payload.consultation_reference}`,
  ]
    .filter(Boolean)
    .join('\\n');

  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//BookedAI//Pricing Consultation//EN',
    'BEGIN:VEVENT',
    `UID:${payload.consultation_reference}@bookedai.au`,
    `DTSTAMP:${formatUtc(new Date())}`,
    `DTSTART:${formatUtc(start)}`,
    `DTEND:${formatUtc(end)}`,
    `SUMMARY:BookedAI ${packageName} consultation`,
    `DESCRIPTION:${description}`,
    `LOCATION:${payload.meeting_join_url || 'Online'}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');

  return `data:text/calendar;charset=utf-8,${encodeURIComponent(ics)}`;
}

export function buildInitialForm(planId: PlanId): ConsultationFormState {
  return {
    planId,
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    businessName: '',
    businessType: '',
    onboardingMode: 'online',
    startupReferralEligible: false,
    referralPartner: '',
    referralLocation: '',
    preferredSlot: buildDefaultPreferredSlot(),
    notes: '',
  };
}
