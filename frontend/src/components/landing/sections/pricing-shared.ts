import type { PricingConsultationResponse } from '../../../shared/contracts';

export type PlanId = 'basic' | 'standard' | 'pro';
export type ConsultationFlowMode = 'full' | 'guided';
export type ConsultationStep = 'contact' | 'calendar' | 'confirmed';
export type OnboardingMode = 'online' | 'onsite';

export type Plan = {
  id: PlanId;
  name: string;
  price: string;
  subtitle: string;
  badge: string;
  ctaLabel: string;
  introLabel: string;
  microcopy: string;
  supportingText?: string;
  features: string[];
  featured?: boolean;
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
  'Plans start from 49$+ for a faster first adoption',
  'Entry package is designed for a clean, low-friction rollout',
  'Pro and Pro Max add deeper automation while commission stays tied to real booked revenue',
];

export const topOffers = [
  {
    eyebrow: 'Starter',
    title: 'Launch from 49$+ before moving into deeper automation',
    body: 'Use the starter path when you want BookedAI live quickly on a lightweight booking surface before moving into a deeper revenue workflow.',
  },
  {
    eyebrow: 'Simple pricing',
    title: 'Keep the first buying decision readable and low-friction',
    body: 'The public offer is designed so SMEs can understand starting price, rollout scope, and upgrade path without a pricing maze.',
  },
];

export const setupOptions = [
  {
    label: 'Online setup',
    detail: 'Fastest option for most SMEs. Starting plans can launch from 49$+, with setup quoted separately when a rollout needs more scope.',
  },
  {
    label: 'Onsite setup',
    detail: 'Available for more complex teams, multi-location rollouts, or in-person training. Quoted after scope confirmation.',
  },
];

export const plans: Plan[] = [
  {
    id: 'basic',
    name: 'Starter',
    price: '49$+',
    subtitle: 'Best for SMEs that want BookedAI live on a light customer-facing flow before committing to a deeper rollout.',
    badge: 'Entry plan',
    ctaLabel: 'Choose Starter',
    introLabel: 'Start here',
    microcopy:
      'Use the starter plan to validate demand capture and fit before adding more automation, routing, and revenue logic.',
    supportingText:
      'Best when you need a low-friction first step for website lead capture and a simple booking path at a clear starting price.',
    features: [
      'AI website chat',
      'basic enquiry capture',
      'simple booking handoff',
      'starter activation path',
      '1 lightweight service workflow',
      'best for proving demand before rollout',
    ],
  },
  {
    id: 'standard',
    name: 'Pro',
    price: 'A$149',
    subtitle: 'The default paid plan for SMEs that want stronger qualification, guided booking, and a clearer conversion engine.',
    badge: 'Most popular',
    ctaLabel: 'Choose Pro',
    introLabel: 'Growth plan',
    microcopy:
      '1 month free after go-live, then one predictable monthly plan for SMEs that need BookedAI to convert more enquiries into bookings.',
    supportingText:
      'Strong fit for salons, clinics, tutors, swim schools, and growing service operators that need better follow-up and conversion.',
    features: [
      'everything in Freemium',
      'missed call SMS auto-reply',
      'guided booking flow',
      'SMS follow-up',
      'calendar integration',
      'weekly performance reporting',
    ],
    featured: true,
  },
  {
    id: 'pro',
    name: 'Pro Max',
    price: 'A$349',
    subtitle: 'For higher-volume or more complex SMEs that need broader automation, deeper qualification, and multi-service or multi-location support.',
    badge: 'Advanced operations',
    ctaLabel: 'Choose Pro Max',
    introLabel: 'Scale plan',
    microcopy:
      '1 month free after go-live, then a higher-capability plan built for service businesses with more operational depth and revenue complexity.',
    supportingText:
      'Best for multi-location clinics, hospitality groups, education operators, and service teams that need deeper automation and operational visibility.',
    features: [
      'everything in Pro',
      'AI answers inbound calls',
      'advanced booking and reminder automation',
      'multi-service and multi-location support',
      'CRM or workflow integration',
      'operator visibility dashboard',
    ],
  },
];

export const recommendations: Recommendation[] = [
  {
    label: 'Freemium',
    detail: 'Start small',
  },
  {
    label: 'Pro',
    detail: 'Best value',
    featured: true,
  },
  {
    label: 'Pro Max',
    detail: 'Scale operations',
  },
];

export const pricingSignals = [
  {
    label: 'Start here',
    value: '49$+',
    detail: 'Low-friction starting price for SMEs that want BookedAI live quickly',
  },
  {
    label: 'Entry package',
    value: 'Starter to Pro',
    detail: 'Start from 49$+, then move into higher-capability plans as revenue operations deepen',
  },
  {
    label: 'Commercial model',
    value: 'Setup fee + monthly + commission',
    detail: 'Setup is quoted clearly, monthly plans stay predictable, and commission is only tied to real booked revenue',
  },
];

export const visiblePlans = plans.slice(0, 2);
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
